import { AtlasCliError } from './errors.js';
import { sha256 } from './fs-safety.js';
import { AtlasLocalRuntime, type AtlasLocalInboundMessage } from './local-runtime.js';
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
  }

  static async open(
    options: MissionCoordinatorOptions,
  ): Promise<AtlasLocalMissionCoordinator> {
    const clock = options.clock ?? (() => new Date().toISOString());
    const runtime = await AtlasLocalRuntime.open({ root: options.root, clock });
    const store = createMissionStore(options.root, options.scope);
    await store.migrate();
    return new AtlasLocalMissionCoordinator({ ...options, clock }, runtime, store);
  }

  async receive(
    message: AtlasLocalInboundMessage,
  ): Promise<MissionCoordinatorResult> {
    const missionId = missionIdFor(message, this.scope);
    const existing = await this.store.readMission(this.scope, missionId);
    const runtimeResult = await this.runtime.receiveMessage(message);

    if (existing.value) {
      return this.result(missionId, runtimeResult, true);
    }

    const missionResult = createMission(
      missionInput(
        message,
        missionId,
        this.runtime.snapshot().identity.project_hash,
      ),
      this.scope,
      this.clock(),
    );
    if (!missionResult.valid || !missionResult.mission || !missionResult.initialEvent) {
      throw new Error(
        `Unable to create local Mission: ${missionResult.diagnostics
          .map((item) => item.message)
          .join('; ')}`,
      );
    }

    const created = await this.store.createMission(
      this.scope,
      missionResult.mission,
      missionResult.initialEvent,
    );
    if (created.status !== 'CREATED' && created.status !== 'DUPLICATE_REPLAY') {
      throw new Error(
        `Unable to persist local Mission: ${created.diagnostics
          .map((item) => item.message)
          .join('; ')}`,
      );
    }

    await this.advance(missionId, 'READY', 'local.coordinator.ready');
    await this.advance(missionId, 'ACTIVE', 'local.coordinator.active');
    if (runtimeResult.status === 'approval_pending') {
      await this.advance(
        missionId,
        'WAITING_APPROVAL',
        'local.coordinator.approval-required',
      );
      await this.store.putWait(this.scope, {
        waitId: deterministicId('wait-approval', missionId),
        missionId,
        scope: this.scope,
        kind: 'approval',
        status: 'ACTIVE',
        payload: { approvalId: runtimeResult.approval.id },
        updatedAt: this.clock(),
      });
    } else if (runtimeResult.status === 'handoff_required') {
      await this.advance(missionId, 'HANDED_OFF', 'local.coordinator.handoff');
    } else if (runtimeResult.outbox) {
      await this.advance(missionId, 'WAITING_EVENT', 'local.coordinator.await-delivery');
      await this.store.putWait(this.scope, {
        waitId: deterministicId('wait-delivery', missionId),
        missionId,
        scope: this.scope,
        kind: 'event',
        status: 'ACTIVE',
        payload: { outboxId: runtimeResult.outbox.id },
        updatedAt: this.clock(),
      });
    } else {
      await this.advance(missionId, 'COMPLETING', 'local.coordinator.outcome-recorded');
      await this.advance(missionId, 'COMPLETED', 'local.coordinator.completed');
    }
    return this.result(missionId, runtimeResult, false);
  }

  async approve(
    approvalId: string,
    operatorId: string,
    reason?: string,
  ): Promise<MissionCoordinatorResult> {
    const approvalWait = await this.activeApprovalWait(approvalId);
    if (!approvalWait) {
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
    const released = await this.store.updateWaitStatus(
      this.scope,
      approvalWait.waitId,
      'RELEASED',
      this.clock(),
    );
    if (released.status !== 'UPDATED' && released.status !== 'DUPLICATE_REPLAY') {
      throw new AtlasCliError('LOCAL_STATE_ERROR', `Unable to release approval wait ${approvalWait.waitId}`);
    }
    await this.advance(missionId, 'ACTIVE', 'local.coordinator.approval-granted');
    await this.advance(missionId, 'WAITING_EVENT', 'local.coordinator.await-delivery');
    await this.store.putWait(this.scope, {
      waitId: deterministicId('wait-delivery', missionId),
      missionId,
      scope: this.scope,
      kind: 'event',
      status: 'ACTIVE',
      payload: { outboxId: runtimeResult.outbox.id },
      updatedAt: this.clock(),
    });
    return this.result(missionId, runtimeResult, Boolean(runtimeResult.replayed));
  }

  async reject(
    approvalId: string,
    operatorId: string,
    reason?: string,
  ): Promise<MissionCoordinatorResult> {
    const approvalWait = await this.activeApprovalWait(approvalId);
    if (!approvalWait) {
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
    const released = await this.store.updateWaitStatus(
      this.scope,
      approvalWait.waitId,
      'RELEASED',
      this.clock(),
    );
    if (released.status !== 'UPDATED' && released.status !== 'DUPLICATE_REPLAY') {
      throw new AtlasCliError('LOCAL_STATE_ERROR', `Unable to release approval wait ${approvalWait.waitId}`);
    }
    await this.advance(missionId, 'HANDED_OFF', 'local.coordinator.approval-rejected');
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
    const runtimeResult = await this.runtime.attemptDelivery(outboxId, attempt);
    const missionId = missionIdForRuntimeResult(
      runtimeResult,
      this.scope,
      this.runtime,
    );
    if (runtimeResult.delivery?.state === 'delivered') {
      await this.advance(missionId, 'ACTIVE', 'local.coordinator.delivery-confirmed');
      await this.advance(missionId, 'COMPLETING', 'local.coordinator.delivery-confirmed');
      await this.advance(missionId, 'COMPLETED', 'local.coordinator.completed');
    } else if (
      runtimeResult.delivery?.state === 'rejected' ||
      runtimeResult.delivery?.state === 'failed'
    ) {
      await this.advance(missionId, 'FAILED', 'local.coordinator.delivery-failed');
    }
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

  private async closeActiveWaits(missionId: string): Promise<void> {
    const state = await this.store.readState();
    for (const wait of state.waits.filter((item) => item.missionId === missionId && item.status === 'ACTIVE')) {
      const result = await this.store.updateWaitStatus(this.scope, wait.waitId, 'CANCELLED', this.clock());
      if (!['UPDATED', 'DUPLICATE_REPLAY'].includes(result.status)) {
        throw new AtlasCliError('LOCAL_STATE_ERROR', `Unable to close Mission wait ${wait.waitId}`);
      }
    }
  }

  private async activeApprovalWait(approvalId: string): Promise<MissionPersistenceState['waits'][number] | null> {
    const state = await this.store.readState();
    return state.waits.find((wait) =>
      wait.kind === 'approval' &&
      wait.status === 'ACTIVE' &&
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
      throw new Error(
        `Illegal local Mission transition: ${event.diagnostics
          .map((item) => item.message)
          .join('; ')}`,
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
