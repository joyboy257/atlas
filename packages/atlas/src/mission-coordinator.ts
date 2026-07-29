import path from 'node:path';
import { AtlasCliError } from './errors.js';
import { atomicWrite, readUtf8Safe, sha256 } from './fs-safety.js';
import { OperationLock } from './operation-journal.js';
import {
  AtlasLocalRuntime,
  AtlasLocalRuntimeError,
  type AtlasLocalInboundMessage,
} from './local-runtime.js';
import {
  createMission,
  createMissionLifecycleEvent,
  type Mission,
  type MissionLifecycleEvent,
  type MissionScope,
  type MissionState,
} from './mission-contract.js';
import {
  createMissionStore,
  type MissionPersistenceState,
  type MissionStore,
  type MissionWaitRecord,
} from './mission-persistence.js';

export const ATLAS_LOCAL_MISSION_COORDINATOR_VERSION =
  'atlas.local-mission-coordinator/v1' as const;

type RuntimeResult = Record<string, any>;

export type MissionCoordinatorOptions = Readonly<{
  root: string;
  scope: MissionScope;
  clock?: () => string;
}>;

export type MissionCoordinatorLedger = Readonly<{
  mission: Mission;
  events: readonly MissionLifecycleEvent[];
}>;

export type MissionCoordinatorResult = Readonly<{
  missionId: string;
  status: string;
  replayed: boolean;
  runtime: Readonly<RuntimeResult>;
  mission: Mission;
  ledger: MissionCoordinatorLedger;
  receipts: readonly unknown[];
}>;

export type MissionCoordinatorSnapshot = Readonly<{
  version: typeof ATLAS_LOCAL_MISSION_COORDINATOR_VERSION;
  missionState: MissionPersistenceState;
  runtime: ReturnType<AtlasLocalRuntime['snapshot']>;
}>;

export type MissionControlResult = Readonly<{
  command: 'inspect' | 'pause' | 'resume' | 'cancel';
  missionId: string;
  mission: Mission;
  ledger: MissionCoordinatorLedger;
  waits: readonly MissionWaitRecord[];
  correlationId: string;
  runtime: ReturnType<AtlasLocalRuntime['snapshot']>;
}>;

export class AtlasLocalMissionCoordinator {
  readonly root: string;
  readonly scope: MissionScope;
  readonly store: MissionStore;
  readonly runtime: AtlasLocalRuntime;
  readonly clock: () => string;
  private readonly coordinatorLock: OperationLock;
  private readonly controlLock: OperationLock;
  private controlQueue: Promise<void> = Promise.resolve();

  private constructor(
    options: MissionCoordinatorOptions,
    runtime: AtlasLocalRuntime,
    store: MissionStore,
  ) {
    this.root = options.root;
    this.scope = Object.freeze({ ...options.scope });
    this.clock = options.clock ?? (() => new Date().toISOString());
    this.runtime = runtime;
    this.store = store;
    this.coordinatorLock = new OperationLock(path.resolve(options.root, '.atlas', 'mission-coordinator'));
    this.controlLock = new OperationLock(path.resolve(options.root, '.atlas', 'mission-control'));
  }

  static async open(
    options: MissionCoordinatorOptions,
  ): Promise<AtlasLocalMissionCoordinator> {
    const root = path.resolve(options.root);
    const clock = options.clock ?? (() => new Date().toISOString());
    const runtime = await AtlasLocalRuntime.open({ root, clock });
    const boundScope = await bindLocalScope(root, options.scope, runtime.snapshot().identity.project_hash);
    const store = createMissionStore(root, boundScope);
    await store.migrate();
    return new AtlasLocalMissionCoordinator({ ...options, root, scope: boundScope, clock }, runtime, store);
  }

  async receive(
    message: AtlasLocalInboundMessage,
  ): Promise<MissionCoordinatorResult> {
    return this.withCoordinatorLock(() => this.receiveUnlocked(message), true);
  }

  private async receiveUnlocked(
    message: AtlasLocalInboundMessage,
  ): Promise<MissionCoordinatorResult> {
    await this.runtime.reload();
    const missionId = missionIdFor(message, this.scope);
    const existing = await this.store.readMission(this.scope, missionId);
    const runtimeResult = await this.runtime.receiveMessage(message);

    let replayed = Boolean(runtimeResult.replayed || existing.value);
    if (!existing.value) await this.ensureMission(message, missionId);
    await this.reconcileRuntimeResult(missionId, runtimeResult);
    for (const drainedMessageId of drainedMessageIds(runtimeResult)) {
      const drainedMessage = this.runtime.snapshot().messages.find((item) => item.message_id === drainedMessageId);
      if (!drainedMessage) continue;
      const drainedMissionId = missionIdFor(drainedMessage, this.scope);
      const drainedMission = await this.store.readMission(this.scope, drainedMissionId);
      if (!drainedMission.value) await this.ensureMission(drainedMessage, drainedMissionId);
      const drainedRuntimeResult = this.runtimeResultForMessage(drainedMessage);
      if (drainedRuntimeResult) await this.reconcileRuntimeResult(drainedMissionId, drainedRuntimeResult);
    }
    return this.result(missionId, runtimeResult, replayed);
  }

  async approve(
    approvalId: string,
    operatorId: string,
    reason?: string,
  ): Promise<MissionCoordinatorResult> {
    return this.withCoordinatorLock(() => this.approveUnlocked(approvalId, operatorId, reason));
  }

  private async approveUnlocked(
    approvalId: string,
    operatorId: string,
    reason?: string,
  ): Promise<MissionCoordinatorResult> {
    await this.runtime.reload();
    const approvalWait = await this.approvalWait(approvalId);
    if (!approvalWait || approvalWait.status === 'CANCELLED') {
      throw new AtlasCliError('CONFLICT', `Approval is not active: ${approvalId}`, {
        nextAction: 'Inspect the Mission and use an active approval ID',
      });
    }
    const runtimeResult = await this.runtime.decideApproval(approvalId, {
      decision: 'approved',
      operator_id: operatorId,
      ...(reason ? { reason } : {}),
    });
    const missionId = approvalWait.missionId;
    if (approvalWait.status === 'ACTIVE') await this.releaseWait(approvalWait.waitId, 'approval');
    await this.reconcileRuntimeResult(missionId, runtimeResult);
    return this.result(missionId, runtimeResult, Boolean(runtimeResult.replayed));
  }

  async reject(
    approvalId: string,
    operatorId: string,
    reason?: string,
  ): Promise<MissionCoordinatorResult> {
    return this.withCoordinatorLock(() => this.rejectUnlocked(approvalId, operatorId, reason));
  }

  private async rejectUnlocked(
    approvalId: string,
    operatorId: string,
    reason?: string,
  ): Promise<MissionCoordinatorResult> {
    await this.runtime.reload();
    const approvalWait = await this.approvalWait(approvalId);
    if (!approvalWait || approvalWait.status === 'CANCELLED') {
      throw new AtlasCliError('CONFLICT', `Approval is not active: ${approvalId}`, {
        nextAction: 'Inspect the Mission and use an active approval ID',
      });
    }
    const runtimeResult = await this.runtime.decideApproval(approvalId, {
      decision: 'rejected',
      operator_id: operatorId,
      ...(reason ? { reason } : {}),
    });
    const missionId = approvalWait.missionId;
    if (approvalWait.status === 'ACTIVE') await this.releaseWait(approvalWait.waitId, 'approval');
    await this.reconcileRuntimeResult(missionId, runtimeResult);
    return this.result(missionId, runtimeResult, Boolean(runtimeResult.replayed));
  }

  async deliver(
    outboxId: string,
    attempt: Readonly<{
      outcome:
        | 'transient_failure'
        | 'permanent_rejection'
        | 'accepted'
        | 'delivered';
      provider_code?: string;
      provider_message_id?: string;
    }>,
  ): Promise<MissionCoordinatorResult> {
    return this.withCoordinatorLock(() => this.deliverUnlocked(outboxId, attempt));
  }

  private async deliverUnlocked(
    outboxId: string,
    attempt: Readonly<{
      outcome:
        | 'transient_failure'
        | 'permanent_rejection'
        | 'accepted'
        | 'delivered';
      provider_code?: string;
      provider_message_id?: string;
    }>,
  ): Promise<MissionCoordinatorResult> {
    await this.runtime.reload();
    let runtimeResult: RuntimeResult;
    try {
      runtimeResult = await this.runtime.attemptDelivery(outboxId, attempt);
    } catch (error) {
      if (!(error instanceof AtlasLocalRuntimeError) || error.code !== 'CONFLICT') throw error;
      const outbox = this.runtime.snapshot().outbox.find((item) => item.id === outboxId);
      if (!outbox || !['delivered', 'read', 'rejected', 'failed'].includes(outbox.state)) throw error;
      runtimeResult = { delivery: outbox, replayed: true };
    }
    const missionId = missionIdForRuntimeResult(runtimeResult, this.scope, this.runtime);
    await this.reconcileRuntimeResult(missionId, runtimeResult);
    return this.result(missionId, runtimeResult, Boolean(runtimeResult.replayed));
  }

  async replay(
    message: AtlasLocalInboundMessage,
  ): Promise<MissionCoordinatorResult> {
    return this.receive(message);
  }

  async inspect(missionId: string): Promise<Readonly<{
    mission: Mission | null;
    ledger: MissionCoordinatorLedger | null;
    receipts: readonly unknown[];
  }>> {
    const missionResult = await this.store.readMission(this.scope, missionId);
    const ledgerResult = await this.store.readLedger(this.scope, missionId);
    return {
      mission: missionResult.value ?? null,
      ledger: ledgerResult.value ?? null,
      receipts: this.receiptsForMission(ledgerResult.value?.mission ?? null),
    };
  }

  async control(
    missionId: string,
    command: 'inspect' | 'pause' | 'resume' | 'cancel',
    actorIdentity: string,
    reason: string,
  ): Promise<MissionControlResult> {
    const operation = this.controlQueue.then(() => this.controlUnlocked(missionId, command, actorIdentity, reason));
    this.controlQueue = operation.then(() => undefined, () => undefined);
    return operation;
  }

  private async controlUnlocked(
    missionId: string,
    command: 'inspect' | 'pause' | 'resume' | 'cancel',
    actorIdentity: string,
    reason: string,
  ): Promise<MissionControlResult> {
    try {
      await this.controlLock.acquire();
    } catch (error) {
      if (error instanceof AtlasCliError && error.code === 'LOCAL_STATE_ERROR') {
        throw new AtlasCliError('CONFLICT', `Mission control is already running for ${missionId}`, {
          nextAction: 'Wait for the current Mission control command to finish and retry',
        });
      }
      throw error;
    }
    try {
      return await this.withCoordinatorLock(() => this.controlUnlockedUnsafe(missionId, command, actorIdentity, reason));
    } finally {
      await this.controlLock.release();
    }
  }

  private async controlUnlockedUnsafe(
    missionId: string,
    command: 'inspect' | 'pause' | 'resume' | 'cancel',
    actorIdentity: string,
    reason: string,
  ): Promise<MissionControlResult> {
    if (command !== 'inspect' && (!actorIdentity.trim() || !reason.trim())) {
      throw new AtlasCliError('USAGE_ERROR', 'Mission control requires actor identity and reason', {
        nextAction: 'Provide a non-empty operator identity and reason',
      });
    }
    const ledgerResult = await this.store.readLedger(this.scope, missionId);
    const ledger = ledgerResult.value;
    if (!ledger) {
      throw new AtlasCliError('LOCAL_STATE_ERROR', `Mission not found: ${missionId}`, {
        nextAction: 'Inspect an existing Mission ID',
      });
    }
    if (command === 'pause') {
      if (ledger.mission.spec.state === 'PAUSED') {
        throw new AtlasCliError('CONFLICT', `Mission ${missionId} is already paused`, {
          nextAction: 'Resume the Mission or inspect its current state',
        });
      }
      if (['COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED'].includes(ledger.mission.spec.state)) {
        throw new AtlasCliError('CONFLICT', `Mission ${missionId} is terminal in state ${ledger.mission.spec.state}`, {
          nextAction: 'Inspect the terminal Mission instead of mutating it',
        });
      }
      await this.advance(missionId, 'PAUSED', `local.control.pause:${actorIdentity}:${reason}`);
      await this.closeActiveWaits(missionId);
    } else if (command === 'resume') {
      if (ledger.mission.spec.state !== 'PAUSED') {
        throw new AtlasCliError('CONFLICT', `Mission ${missionId} is not paused`, {
          nextAction: 'Resume only a Mission currently in PAUSED state',
        });
      }
      await this.advance(missionId, 'ACTIVE', `local.control.resume:${actorIdentity}:${reason}`);
    } else if (command === 'cancel') {
      if (['COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED'].includes(ledger.mission.spec.state)) {
        throw new AtlasCliError('CONFLICT', `Mission ${missionId} is terminal in state ${ledger.mission.spec.state}`, {
          nextAction: 'Inspect the terminal Mission instead of mutating it',
        });
      }
      await this.advance(missionId, 'CANCELLED', `local.control.cancel:${actorIdentity}:${reason}`);
      await this.closeActiveWaits(missionId);
    }
    return this.controlResult(missionId, command);
  }

  async pause(missionId: string, actorIdentity: string, reason: string): Promise<MissionControlResult> {
    return this.control(missionId, 'pause', actorIdentity, reason);
  }

  async resume(missionId: string, actorIdentity: string, reason: string): Promise<MissionControlResult> {
    return this.control(missionId, 'resume', actorIdentity, reason);
  }

  async cancel(missionId: string, actorIdentity: string, reason: string): Promise<MissionControlResult> {
    return this.control(missionId, 'cancel', actorIdentity, reason);
  }

  async snapshot(): Promise<MissionCoordinatorSnapshot> {
    return {
      version: ATLAS_LOCAL_MISSION_COORDINATOR_VERSION,
      missionState: await this.store.readState(),
      runtime: this.runtime.snapshot(),
    };
  }

  private async controlResult(
    missionId: string,
    command: MissionControlResult['command'],
  ): Promise<MissionControlResult> {
    const state = await this.store.readState();
    const mission = state.missions.find((item) => item.metadata.missionId === missionId);
    const ledgerResult = await this.store.readLedger(this.scope, missionId);
    if (!mission || !ledgerResult.value) throw new AtlasCliError('LOCAL_STATE_ERROR', `Mission disappeared during ${command}`);
    return {
      command,
      missionId,
      mission,
      ledger: ledgerResult.value,
      waits: state.waits.filter((wait) => wait.missionId === missionId),
      correlationId: mission.spec.correlation.correlationId,
      runtime: this.runtime.snapshot(),
    };
  }

  private async withCoordinatorLock<T>(operation: () => Promise<T>, waitForLock = false): Promise<T> {
    if (waitForLock) {
      while (true) {
        try {
          await this.coordinatorLock.acquire();
          break;
        } catch (error) {
          if (!(error instanceof AtlasCliError) || error.code !== 'LOCAL_STATE_ERROR') throw error;
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }
    } else {
      try {
        await this.coordinatorLock.acquire();
      } catch (error) {
        if (error instanceof AtlasCliError && error.code === 'LOCAL_STATE_ERROR') {
          throw new AtlasCliError('CONFLICT', 'Another Mission coordinator operation is already running', {
            retryable: true,
            nextAction: 'Wait for the current Mission operation to finish and retry',
          });
        }
        throw error;
      }
    }
    try {
      return await operation();
    } finally {
      await this.coordinatorLock.release();
    }
  }

  private async ensureMission(message: AtlasLocalInboundMessage, missionId: string): Promise<void> {
    const missionResult = createMission(
      missionInput(message, missionId, this.runtime.snapshot().identity.project_hash),
      this.scope,
      this.clock(),
    );
    if (!missionResult.valid || !missionResult.mission || !missionResult.initialEvent) {
      throw new Error(`Unable to create local Mission: ${missionResult.diagnostics.map((item) => item.message).join('; ')}`);
    }
    const created = await this.store.createMission(this.scope, missionResult.mission, missionResult.initialEvent);
    if (created.status !== 'CREATED' && created.status !== 'DUPLICATE_REPLAY') {
      throw new Error(`Unable to persist local Mission: ${created.diagnostics.map((item) => item.message).join('; ')}`);
    }
    await this.advance(missionId, 'READY', 'local.coordinator.ready');
    await this.advance(missionId, 'ACTIVE', 'local.coordinator.active');
  }

  private runtimeResultForMessage(message: AtlasLocalInboundMessage): RuntimeResult | null {
    const snapshot = this.runtime.snapshot();
    const trace = snapshot.traces.find((item) => item.message_id === message.message_id);
    if (!trace) return null;
    const approval = Object.values(snapshot.approvals).find((item) => item.trace_id === trace.id);
    if (approval?.status === 'pending') {
      const proposal = snapshot.proposals[approval.proposal_id];
      return { status: 'approval_pending', trace_id: trace.id, approval, proposal };
    }
    const outbox = snapshot.outbox.find((item) => item.trace_id === trace.id);
    if (outbox) return { status: outbox.state === 'delivered' ? 'delivered' : 'queued', trace_id: trace.id, outbox, delivery: outbox.state === 'delivered' ? outbox : undefined };
    if (trace.status === 'handoff_required') return { status: 'handoff_required', trace_id: trace.id };
    if (trace.status === 'completed') return { status: 'completed', trace_id: trace.id };
    return null;
  }

  private async reconcileRuntimeResult(missionId: string, runtimeResult: RuntimeResult): Promise<void> {
    const ledgerResult = await this.store.readLedger(this.scope, missionId);
    const ledger = ledgerResult.value;
    if (!ledger) throw new AtlasCliError('LOCAL_STATE_ERROR', `Mission ledger not found: ${missionId}`);
    const state = ledger.mission.spec.state;

    if (runtimeResult.status === 'held_out_of_order') {
      if (state === 'ACTIVE') await this.advance(missionId, 'WAITING_EVENT', 'local.coordinator.await-inbound');
      await this.ensureWait({
        waitId: deterministicId('wait-inbound', missionId),
        missionId,
        scope: this.scope,
        kind: 'event',
        status: 'ACTIVE',
        payload: {
          messageId: runtimeResult.message_id,
          conversationId: runtimeResult.conversation_id,
          expectedSequence: runtimeResult.expected_sequence,
          receivedSequence: runtimeResult.received_sequence,
        },
        updatedAt: this.clock(),
      });
      return;
    }

    if (runtimeResult.status === 'approval_pending') {
      let current = state;
      if (current === 'WAITING_EVENT') {
        await this.releaseWait(deterministicId('wait-inbound', missionId), 'inbound event');
        await this.advance(missionId, 'ACTIVE', 'local.coordinator.inbound-reconciled');
        current = 'ACTIVE';
      }
      if (current === 'ACTIVE') await this.advance(missionId, 'WAITING_APPROVAL', 'local.coordinator.approval-required');
      await this.ensureWait({
        waitId: deterministicId('wait-approval', missionId),
        missionId,
        scope: this.scope,
        kind: 'approval',
        status: 'ACTIVE',
        payload: { approvalId: runtimeResult.approval.id },
        updatedAt: this.clock(),
      });
      return;
    }

    if (runtimeResult.status === 'handoff_required' || runtimeResult.status === 'rejected') {
      await this.closeActiveWaits(missionId, 'RELEASED');
      const current = (await this.store.readLedger(this.scope, missionId)).value?.mission.spec.state;
      if (current === 'WAITING_APPROVAL' || current === 'ACTIVE') {
        await this.advance(missionId, 'HANDED_OFF', 'local.coordinator.handoff');
      }
      return;
    }

    const delivery = runtimeResult.delivery;
    if (delivery?.state === 'delivered' || delivery?.state === 'read') {
      await this.releaseWaitForOutbox(missionId, delivery.id);
      let current = (await this.store.readLedger(this.scope, missionId)).value?.mission.spec.state;
      if (current === 'WAITING_EVENT') {
        await this.advance(missionId, 'ACTIVE', 'local.coordinator.delivery-confirmed');
        current = 'ACTIVE';
      }
      if (current === 'ACTIVE') await this.advance(missionId, 'COMPLETING', 'local.coordinator.delivery-confirmed');
      current = (await this.store.readLedger(this.scope, missionId)).value?.mission.spec.state;
      if (current === 'COMPLETING') await this.advance(missionId, 'COMPLETED', 'local.coordinator.completed');
      return;
    }

    if (delivery?.state === 'rejected' || delivery?.state === 'failed') {
      await this.releaseWaitForOutbox(missionId, delivery.id);
      let current = (await this.store.readLedger(this.scope, missionId)).value?.mission.spec.state;
      if (current === 'WAITING_EVENT') {
        await this.advance(missionId, 'ACTIVE', 'local.coordinator.delivery-failed');
        current = 'ACTIVE';
      }
      if (current === 'ACTIVE') await this.advance(missionId, 'COMPLETING', 'local.coordinator.delivery-failed');
      current = (await this.store.readLedger(this.scope, missionId)).value?.mission.spec.state;
      if (current === 'COMPLETING') await this.advance(missionId, 'FAILED', 'local.coordinator.delivery-failed');
      return;
    }

    if (runtimeResult.outbox) {
      await this.releaseApprovalWaits(missionId);
      let current = (await this.store.readLedger(this.scope, missionId)).value?.mission.spec.state;
      if (current === 'WAITING_APPROVAL') {
        await this.advance(missionId, 'ACTIVE', 'local.coordinator.approval-granted');
        current = 'ACTIVE';
      }
      if (current === 'ACTIVE') await this.advance(missionId, 'WAITING_EVENT', 'local.coordinator.await-delivery');
      await this.ensureWait({
        waitId: deterministicId('wait-delivery', missionId),
        missionId,
        scope: this.scope,
        kind: 'event',
        status: 'ACTIVE',
        payload: { outboxId: runtimeResult.outbox.id },
        updatedAt: this.clock(),
      });
      return;
    }

    if (runtimeResult.status === 'completed' || runtimeResult.status === 'outcome_recorded') {
      let current = (await this.store.readLedger(this.scope, missionId)).value?.mission.spec.state;
      if (current === 'ACTIVE') await this.advance(missionId, 'COMPLETING', 'local.coordinator.outcome-recorded');
      current = (await this.store.readLedger(this.scope, missionId)).value?.mission.spec.state;
      if (current === 'COMPLETING') await this.advance(missionId, 'COMPLETED', 'local.coordinator.completed');
    }
  }

  private async ensureWait(wait: MissionWaitRecord): Promise<void> {
    const existing = (await this.store.readState()).waits.find((item) => item.waitId === wait.waitId);
    if (existing) return;
    const result = await this.store.putWait(this.scope, wait);
    if (!['CREATED', 'DUPLICATE_REPLAY'].includes(result.status)) {
      throw new AtlasCliError('LOCAL_STATE_ERROR', `Unable to persist Mission wait ${wait.waitId}`);
    }
  }

  private async releaseApprovalWaits(missionId: string): Promise<void> {
    const waits = (await this.store.readState()).waits.filter((wait) => wait.missionId === missionId && wait.kind === 'approval' && wait.status === 'ACTIVE');
    for (const wait of waits) await this.releaseWait(wait.waitId, 'approval');
  }

  private async releaseWaitForOutbox(missionId: string, outboxId: string): Promise<void> {
    const wait = (await this.store.readState()).waits.find((item) => item.missionId === missionId && item.kind === 'event' && item.status === 'ACTIVE' && isRecord(item.payload) && item.payload.outboxId === outboxId);
    if (wait) await this.releaseWait(wait.waitId, 'delivery');
  }

  private async releaseWait(waitId: string, label: string): Promise<void> {
    const current = (await this.store.readState()).waits.find((wait) => wait.waitId === waitId);
    if (!current || current.status !== 'ACTIVE') return;
    const result = await this.store.updateWaitStatus(this.scope, waitId, 'RELEASED', this.clock());
    if (!['UPDATED', 'DUPLICATE_REPLAY'].includes(result.status)) {
      throw new AtlasCliError('LOCAL_STATE_ERROR', `Unable to release ${label} wait ${waitId}`);
    }
  }

  private async closeActiveWaits(missionId: string, status: MissionWaitRecord['status'] = 'CANCELLED'): Promise<void> {
    const state = await this.store.readState();
    for (const wait of state.waits.filter((item) => item.missionId === missionId && item.status === 'ACTIVE')) {
      const result = await this.store.updateWaitStatus(this.scope, wait.waitId, status, this.clock());
      if (!['UPDATED', 'DUPLICATE_REPLAY'].includes(result.status)) {
        throw new AtlasCliError('LOCAL_STATE_ERROR', `Unable to close Mission wait ${wait.waitId}`);
      }
    }
  }

  private async approvalWait(approvalId: string): Promise<MissionPersistenceState['waits'][number] | null> {
    const state = await this.store.readState();
    return state.waits.find((wait) =>
      wait.kind === 'approval' &&
      isRecord(wait.payload) &&
      wait.payload.approvalId === approvalId,
    ) ?? null;
  }

  private async advance(
    missionId: string,
    resultingState: MissionState,
    sourceRef: string,
  ): Promise<void> {
    const ledgerResult = await this.store.readLedger(this.scope, missionId);
    const ledger = ledgerResult.value;
    if (!ledger) throw new Error(`Mission ledger not found: ${missionId}`);
    if (ledger.mission.spec.state === resultingState) return;

    const event = createMissionLifecycleEvent(
      ledger.mission,
      {
        eventId: deterministicId(
          'mission-event',
          missionId,
          String(ledger.mission.spec.stateVersion + 1),
          resultingState,
        ),
        resultingState,
        actor: { type: 'system', identity: ATLAS_LOCAL_MISSION_COORDINATOR_VERSION },
        causationId: sourceRef,
        correlationId: ledger.mission.spec.correlation.correlationId,
        source: { kind: 'system', ref: sourceRef },
        idempotencyKey: deterministicId(
          'mission-event-idempotency',
          missionId,
          String(ledger.mission.spec.stateVersion + 1),
          resultingState,
        ),
      },
      this.clock(),
    );
    if (!event.valid || !event.event) {
      throw new AtlasCliError(
        'CONFLICT',
        `Illegal local Mission transition: ${event.diagnostics
          .map((item) => item.message)
          .join('; ')}`,
        { nextAction: 'Inspect the current Mission state before retrying the command' },
      );
    }
    const result = await this.store.appendLifecycleEvent(this.scope, event.event);
    if (result.status !== 'APPENDED' && result.status !== 'DUPLICATE_REPLAY') {
      throw new Error(
        `Unable to append local Mission event: ${result.diagnostics
          .map((item) => item.message)
          .join('; ')}`,
      );
    }
  }

  private async result(
    missionId: string,
    runtimeResult: RuntimeResult,
    replayed: boolean,
  ): Promise<MissionCoordinatorResult> {
    const inspected = await this.inspect(missionId);
    if (!inspected.mission || !inspected.ledger) {
      throw new Error(`Mission inspection failed: ${missionId}`);
    }
    return {
      missionId,
      status: String(runtimeResult.status ?? runtimeResult.delivery?.state ?? 'unknown'),
      replayed,
      runtime: runtimeResult,
      mission: inspected.mission,
      ledger: inspected.ledger,
      receipts: inspected.receipts,
    };
  }

  private receiptsForMission(mission: Mission | null): readonly unknown[] {
    if (!mission?.spec.correlation.causationId) return [];
    const messageId = mission.spec.correlation.causationId;
    const traceIds = new Set(
      this.runtime
        .snapshot()
        .traces.filter((trace) => trace.message_id === messageId)
        .map((trace) => trace.id),
    );
    return this.runtime
      .receipts()
      .filter((receipt) => traceIds.has(receipt.trace_id));
  }
}

export async function snapshotMissionCoordinator(
  coordinator: AtlasLocalMissionCoordinator,
): Promise<MissionCoordinatorSnapshot> {
  return coordinator.snapshot();
}

async function bindLocalScope(root: string, scope: MissionScope, projectHash: string): Promise<MissionScope> {
  const bindingPath = path.resolve(root, '.atlas', 'mission-scope.json');
  const existing = await readUtf8Safe(bindingPath);
  if (existing !== null) {
    let binding: { projectHash?: string; scope?: MissionScope };
    try {
      binding = JSON.parse(existing) as { projectHash?: string; scope?: MissionScope };
    } catch (error) {
      throw new AtlasCliError('LOCAL_STATE_ERROR', `Invalid local Mission scope binding: ${String(error)}`, {
        nextAction: 'Inspect or remove the verified local Mission scope binding after preserving evidence',
      });
    }
    if (binding.projectHash !== projectHash || !binding.scope || !sameScope(binding.scope, scope)) {
      throw new AtlasCliError('AUTHORIZATION_FAILED', 'Mission scope does not match the project-bound local Mission ledger', {
        nextAction: 'Reopen the project with its original tenant, organisation, project and environment scope',
      });
    }
    return Object.freeze({ ...binding.scope });
  }
  await atomicWrite(bindingPath, `${JSON.stringify({ schemaVersion: 'atlas.local-mission-scope/v1', projectHash, scope }, null, 2)}\n`);
  return Object.freeze({ ...scope });
}

function drainedMessageIds(result: RuntimeResult): readonly string[] {
  return Array.isArray(result.drained_message_ids)
    ? result.drained_message_ids.filter((item: unknown): item is string => typeof item === 'string')
    : [];
}

function sameScope(left: MissionScope, right: MissionScope): boolean {
  return left.tenantId === right.tenantId &&
    left.organisationId === right.organisationId &&
    left.projectId === right.projectId &&
    left.environmentId === right.environmentId;
}

function missionInput(
  message: AtlasLocalInboundMessage,
  missionId: string,
  agentVersionId: string,
) {
  return {
    missionId,
    agent: {
      agentId: 'front-desk',
      agentVersionId,
      deploymentId: deterministicId('deployment', agentVersionId),
      runtime: { mode: 'local', adapter: 'atlas-local-fixture' },
    },
    missionType: 'business-message',
    goal: message.text,
    successCriteria:
      'The governed local business message journey reaches an inspectable terminal or controlled wait state.',
    subject: { subjectId: message.customer_id, kind: 'customer' },
    conversation: {
      conversationId: message.conversation_id,
      channel: message.channel_id,
    },
    constraints: {
      allowedTools: ['front-desk.bookings.reschedule'],
      allowedChannels: [message.channel_id],
      maxSteps: 8,
      requiredApprovalFor: ['front-desk.bookings.reschedule'],
    },
    risk: {
      policyRef: 'atlas.local.fixture-policy/v1',
      riskClass: 'high' as const,
      autonomyLevel: 'L2' as const,
      approvalRequired: true,
      handoffAllowed: true,
    },
    budget: { maxSteps: 8, maxCost: 0, currency: 'USD' },
    correlation: {
      correlationId: deterministicId('correlation', message.conversation_id, message.message_id),
      causationId: message.message_id,
    },
    provenance: {
      source: 'channel' as const,
      inputDigest: sha256(stableJson(message)),
      knowledgeRefs: ['knowledge/booking-policy.md'],
    },
  };
}

function missionIdFor(message: AtlasLocalInboundMessage, scope: MissionScope): string {
  return deterministicId(
    'mission',
    scope.tenantId,
    scope.organisationId,
    scope.projectId,
    scope.environmentId,
    message.message_id,
  );
}

function missionIdForRuntimeResult(
  result: RuntimeResult,
  scope: MissionScope,
  runtime: AtlasLocalRuntime,
): string {
  const traceId =
    result.trace_id ??
    result.trace?.id ??
    result.approval?.trace_id ??
    result.delivery?.trace_id;
  const trace = typeof traceId === 'string' ? runtime.trace(traceId) : undefined;
  if (trace) {
    return missionIdFor(
      {
        message_id: trace.message_id,
        conversation_id: trace.conversation_id,
        customer_id: '',
        channel_id: '',
        sequence: 1,
        occurred_at: trace.started_at,
        text: '',
        consent: true,
        within_messaging_window: true,
      },
      scope,
    );
  }
  const outbox = result.delivery?.id
    ? runtime.snapshot().outbox.find((item) => item.id === result.delivery.id)
    : undefined;
  if (!outbox) throw new Error('Coordinator runtime result has no trace identity');
  const outboxTrace = runtime.trace(outbox.trace_id);
  return missionIdFor(
    {
      message_id: outboxTrace.message_id,
      conversation_id: outboxTrace.conversation_id,
      customer_id: outbox.customer_id,
      channel_id: outbox.channel_id,
      sequence: 1,
      occurred_at: outboxTrace.started_at,
      text: '',
      consent: true,
      within_messaging_window: true,
    },
    scope,
  );
}

function deterministicId(prefix: string, ...parts: string[]): string {
  return `${prefix}_${sha256(stableJson(parts)).slice(7, 23)}`;
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, nested]) => nested !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, nested]) => `${JSON.stringify(key)}:${stableJson(nested)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}
