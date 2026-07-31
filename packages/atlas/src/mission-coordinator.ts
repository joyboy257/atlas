import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { AtlasCliError } from './errors.js';
import { atomicWrite, readUtf8Safe, sha256 } from './fs-safety.js';
import { OperationLock } from './operation-journal.js';
import {
  AtlasLocalRuntime,
  AtlasLocalRuntimeError,
  type AtlasLocalAuthorityScope,
  type AtlasLocalInboundMessage,
} from './local-runtime.js';
import {
  createMission,
  createMissionLifecycleEvent,
  type Mission,
  type MissionActiveWait,
  type MissionCreationInput,
  type MissionLifecycleEvent,
  type MissionScope,
  type MissionState,
} from './mission-contract.js';
import {
  createMissionStore,
  hasIncompleteTriggerEventRoute,
  type MissionPersistenceState,
  type MissionStore,
  type MissionTriggerRecord,
  type MissionWaitRecord,
} from './mission-persistence.js';
import {
  createMissionLeaseStore,
  DEFAULT_MISSION_LEASE_TTL_MS,
  type MissionLease,
  type MissionLeaseStore,
} from './mission-leases.js';

export const ATLAS_LOCAL_MISSION_COORDINATOR_VERSION =
  'atlas.local-mission-coordinator/v1' as const;
export const COORDINATOR_LOCK_WAIT_MS = 2_000;

type RuntimeResult = Record<string, any>;

type MissionLeaseContext = Readonly<{
  lease: MissionLease;
  lost: { error?: unknown };
}>;

export type MissionCoordinatorOptions = Readonly<{
  root: string;
  scope: MissionScope;
  clock?: () => string;
  ownerId?: string;
  leaseTtlMs?: number;
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
  command: 'inspect' | 'pause' | 'resume' | 'cancel' | 'return_to_agent';
  missionId: string;
  mission: Mission;
  ledger: MissionCoordinatorLedger;
  waits: readonly MissionWaitRecord[];
  correlationId: string;
  runtime: ReturnType<AtlasLocalRuntime['snapshot']>;
}>;

export type MissionSchedulerItem = Readonly<{
  missionId: string;
  waitId?: string;
  action: 'SCHEDULED' | 'ACTIVATED' | 'EXPIRED' | 'DUPLICATE_REPLAY';
}>;

export type MissionSchedulerResult = Readonly<{
  now: string;
  items: readonly MissionSchedulerItem[];
}>;

export type MissionEventWaitRequest = Readonly<{
  eventType: string;
  eventKey: string;
  expiresAt?: string;
}>;

export type MissionTriggerEnvelope = Readonly<{
  triggerId: string;
  type: string;
  occurredAt: string;
  payload: unknown;
  missionId?: string;
  eventType?: string;
  eventKey?: string;
}>;

export type MissionTriggerResult = Readonly<{
  triggerId: string;
  type: string;
  status: MissionTriggerRecord['status'];
  replayed: boolean;
  missionId?: string;
  waitId?: string;
  result?: Readonly<{ status: string; missionId?: string; waitId?: string }>;
  coordinator?: MissionCoordinatorResult;
}>;

export class AtlasLocalMissionCoordinator {
  readonly root: string;
  readonly scope: MissionScope;
  private readonly store: MissionStore;
  private readonly runtime: AtlasLocalRuntime;
  readonly clock: () => string;
  private readonly coordinatorLock: OperationLock;
  private readonly leaseStore: MissionLeaseStore;
  private readonly ownerId: string;
  private readonly leaseTtlMs: number;
  private readonly activeLeaseContexts = new Map<string, MissionLeaseContext>();
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
    this.coordinatorLock = new OperationLock(options.root, {
      filePath: path.resolve(options.root, '.atlas', 'mission-coordinator.lock'),
    });
    this.leaseStore = createMissionLeaseStore(options.root);
    this.ownerId = options.ownerId ?? `local-coordinator:${process.pid}:${randomUUID()}`;
    this.leaseTtlMs = options.leaseTtlMs ?? DEFAULT_MISSION_LEASE_TTL_MS;
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
    const leaseStore = createMissionLeaseStore(root);
    await leaseStore.migrate();
    return new AtlasLocalMissionCoordinator({ ...options, root, scope: boundScope, clock }, runtime, store);
  }

  async receive(
    message: AtlasLocalInboundMessage,
  ): Promise<MissionCoordinatorResult> {
    const missionId = missionIdFor(message, this.scope);
    return this.withCoordinatorLock(
      () => this.withMissionLease(missionId, () => this.receiveUnlocked(message)),
      true,
    );
  }

  async acquireMissionLease(missionId: string): Promise<MissionLease> {
    return this.leaseStore.acquire({
      scope: this.scope,
      missionId,
      ownerId: this.ownerId,
      now: this.clock(),
      ttlMs: this.leaseTtlMs,
    });
  }

  async heartbeatMissionLease(leaseId: string, missionId: string): Promise<MissionLease> {
    return this.leaseStore.heartbeat({
      scope: this.scope,
      missionId,
      ownerId: this.ownerId,
      leaseId,
      now: this.clock(),
      ttlMs: this.leaseTtlMs,
    });
  }

  async releaseMissionLease(leaseId: string, missionId: string): Promise<MissionLease> {
    return this.leaseStore.release({
      scope: this.scope,
      missionId,
      ownerId: this.ownerId,
      leaseId,
      now: this.clock(),
    });
  }

  private async scheduleUnlocked(
    missionId: string,
    scheduledAt: string,
  ): Promise<MissionSchedulerResult> {
    const ledger = (await this.store.readLedger(this.scope, missionId)).value;
    if (!ledger) {
      throw new AtlasCliError('LOCAL_STATE_ERROR', `Mission not found: ${missionId}`, {
        nextAction: 'Schedule an existing Mission in the current scope',
      });
    }
    if (isTerminalState(ledger.mission.spec.state)) {
      throw new AtlasCliError('CONFLICT', `Mission ${missionId} is ${ledger.mission.spec.state}; schedule is cancelled`, {
        nextAction: 'Schedule only a non-terminal Mission',
      });
    }
    const waitId = deterministicId('wait-schedule', missionId, scheduledAt);
    const state = await this.store.readState();
    const currentWait = state.waits.find((wait) => wait.waitId === waitId);
    if (currentWait) {
      if (currentWait.kind !== 'schedule' || currentWait.missionId !== missionId || currentWait.expiresAt !== scheduledAt) {
        throw new AtlasCliError('CONFLICT', `Mission schedule ${waitId} conflicts with existing durable wait`, {
          nextAction: 'Preserve the original schedule identity or use a new schedule time',
        });
      }
      if (currentWait.status === 'ACTIVE' || currentWait.status === 'RELEASED') {
        return { now: this.clock(), items: [{ missionId, waitId, action: 'DUPLICATE_REPLAY' }] };
      }
      throw new AtlasCliError('CONFLICT', `Mission schedule ${waitId} is already ${currentWait.status}`, {
        nextAction: 'Inspect the Mission and create a new schedule identity',
      });
    }
    const conflictingActiveSchedule = state.waits.find((wait) => wait.missionId === missionId && wait.kind === 'schedule' && wait.status === 'ACTIVE' && wait.waitId !== waitId);
    if (conflictingActiveSchedule) {
      throw new AtlasCliError('CONFLICT', `Mission ${missionId} already has an active schedule wait`, {
        nextAction: 'Resolve the existing schedule before creating another one',
      });
    }
    if (ledger.mission.spec.state === 'ACTIVE') await this.advance(missionId, 'WAITING_SCHEDULE', `local.scheduler.schedule:${scheduledAt}`);
    const wait: MissionWaitRecord = {
      waitId,
      missionId,
      scope: this.scope,
      kind: 'schedule',
      status: 'ACTIVE',
      expiresAt: scheduledAt,
      payload: { scheduledAt, environmentId: this.scope.environmentId },
      updatedAt: this.clock(),
    };
    const activeWait: MissionActiveWait = { kind: 'schedule', waitId, expiresAt: scheduledAt };
    const persisted = await this.store.putWaitAndProjectActiveWait(this.scope, wait, activeWait);
    if (persisted.status !== 'CREATED' && persisted.status !== 'DUPLICATE_REPLAY') {
      throw new AtlasCliError('CONFLICT', `Unable to persist schedule wait ${waitId}`, {
        nextAction: 'Inspect the Mission wait state before retrying the schedule',
      });
    }
    return { now: this.clock(), items: [{ missionId, waitId, action: 'SCHEDULED' }] };
  }

  private async receiveUnlocked(
    message: AtlasLocalInboundMessage,
  ): Promise<MissionCoordinatorResult> {
    await this.runtime.reload();
    const missionId = missionIdFor(message, this.scope);
    const pendingMissionIds = this.runtime
      .pendingMessages(message.conversation_id)
      .map((pending) => missionIdFor(pending, this.scope))
      .filter((pendingMissionId) => pendingMissionId !== missionId);
    return this.withMissionLeases(pendingMissionIds, () => this.receiveUnlockedWithLeases(message, missionId));
  }

  private async receiveUnlockedWithLeases(
    message: AtlasLocalInboundMessage,
    missionId: string,
  ): Promise<MissionCoordinatorResult> {
    const existing = await this.store.readMission(this.scope, missionId);
    const runtimeResult = await this.runtime.receiveMessage(message);
    const fencedConversationMission = runtimeResult.status === 'human_takeover'
      ? (await this.store.readState()).missions
        .filter((candidate) => candidate.spec.conversation?.conversationId === message.conversation_id)
        .sort((left, right) => {
          const leftHandedOff = left.spec.state === 'HANDED_OFF' ? 0 : 1;
          const rightHandedOff = right.spec.state === 'HANDED_OFF' ? 0 : 1;
          return leftHandedOff - rightHandedOff || left.metadata.missionId.localeCompare(right.metadata.missionId);
        })[0]
      : undefined;
    const effectiveMissionId = fencedConversationMission?.metadata.missionId ?? missionId;

    let replayed = Boolean(runtimeResult.replayed || existing.value);
    if (!existing.value && !fencedConversationMission) {
      await this.ensureMission(message, effectiveMissionId);
      if (runtimeResult.status === 'human_takeover') {
        await this.advance(effectiveMissionId, 'HANDED_OFF', 'local.coordinator.handoff');
      }
    } else if (existing.value && ['CREATED', 'READY'].includes(existing.value.spec.state)) {
      await this.recoverMissionStart(message, effectiveMissionId, existing.value.spec.state);
    }
    const currentRuntimeResult = this.refreshRuntimeResult(runtimeResult);
    await this.reconcileRuntimeResult(effectiveMissionId, currentRuntimeResult);
    for (const drainedMessageId of drainedMessageIds(runtimeResult)) {
      const drainedMessage = this.runtime.snapshot().messages.find((item) => item.message_id === drainedMessageId);
      if (!drainedMessage) continue;
      const drainedMissionId = missionIdFor(drainedMessage, this.scope);
      await this.withMissionLease(drainedMissionId, async () => {
        const drainedMission = await this.store.readMission(this.scope, drainedMissionId);
        if (!drainedMission.value) await this.ensureMission(drainedMessage, drainedMissionId);
        const drainedRuntimeResult = this.runtimeResultForMessage(drainedMessage);
        if (drainedRuntimeResult) await this.reconcileRuntimeResult(drainedMissionId, this.refreshRuntimeResult(drainedRuntimeResult));
      });
    }
    return this.result(effectiveMissionId, currentRuntimeResult, replayed);
  }

  async approve(
    approvalId: string,
    operatorId: string,
    reason?: string,
  ): Promise<MissionCoordinatorResult> {
    return this.withCoordinatorLock(async () => {
      const wait = await this.approvalWait(approvalId);
      return wait
        ? this.withMissionLease(wait.missionId, () => this.approveUnlocked(approvalId, operatorId, reason))
        : this.approveUnlocked(approvalId, operatorId, reason);
    });
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
    const missionId = approvalWait.missionId;
    await this.assertApprovalMissionActive(missionId, approvalWait, 'approved');
    const runtimeResult = await this.runtime.decideApproval(approvalId, {
      decision: 'approved',
      operator_id: operatorId,
      scope: localAuthorityScope(this.runtime.snapshot().identity),
      ...(reason ? { reason } : {}),
    });
    if (approvalWait.status === 'ACTIVE') await this.releaseWait(approvalWait.waitId, 'approval');
    await this.reconcileRuntimeResult(missionId, runtimeResult);
    return this.result(missionId, runtimeResult, Boolean(runtimeResult.replayed));
  }

  async reject(
    approvalId: string,
    operatorId: string,
    reason?: string,
  ): Promise<MissionCoordinatorResult> {
    return this.withCoordinatorLock(async () => {
      const wait = await this.approvalWait(approvalId);
      return wait
        ? this.withMissionLease(wait.missionId, () => this.rejectUnlocked(approvalId, operatorId, reason))
        : this.rejectUnlocked(approvalId, operatorId, reason);
    });
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
    const missionId = approvalWait.missionId;
    await this.assertApprovalMissionActive(missionId, approvalWait, 'rejected');
    const runtimeResult = await this.runtime.decideApproval(approvalId, {
      decision: 'rejected',
      operator_id: operatorId,
      scope: localAuthorityScope(this.runtime.snapshot().identity),
      ...(reason ? { reason } : {}),
    });
    if (approvalWait.status === 'ACTIVE') await this.releaseWait(approvalWait.waitId, 'approval');
    await this.reconcileRuntimeResult(missionId, runtimeResult);
    return this.result(missionId, runtimeResult, Boolean(runtimeResult.replayed));
  }

  async returnToAgent(
    missionId: string,
    operatorId: string,
    reason: string,
  ): Promise<MissionControlResult> {
    const operation = this.controlQueue.then(async () => this.withCoordinatorLock(async () => {
      await this.runtime.reload();
      const selected = (await this.store.readLedger(this.scope, missionId)).value;
      if (!selected) throw new AtlasCliError('LOCAL_STATE_ERROR', `Mission not found: ${missionId}`);
      const conversationId = selected.mission.spec.conversation?.conversationId;
      if (!conversationId) throw new AtlasCliError('CONFLICT', `Mission ${missionId} has no conversation takeover scope`);
      const runtimeConversation = this.runtime.snapshot().conversations[conversationId];
      if (selected.mission.spec.state !== 'HANDED_OFF' && !runtimeConversation?.takeover) {
        throw new AtlasCliError('CONFLICT', `Mission ${missionId} is ${selected.mission.spec.state}; return-to-Agent requires an active human takeover`, {
          nextAction: 'Return control only for a Mission explicitly handed to a human',
        });
      }
      const missions = (await this.store.readState()).missions
        .filter((candidate) => candidate.spec.conversation?.conversationId === conversationId && !isTerminalState(candidate.spec.state))
        .sort((left, right) => left.metadata.missionId.localeCompare(right.metadata.missionId));
      const missionIds = missions.map((mission) => mission.metadata.missionId);
      return this.withMissionLeases(missionIds, async () => {
        const receipts = missions.map((mission) => ({
          mission_id: mission.metadata.missionId,
          ...(traceIdForMission(mission, this.runtime) ? { trace_id: traceIdForMission(mission, this.runtime) } : {}),
        }));
        for (const mission of missions) {
          if (mission.spec.state === 'HANDED_OFF') await this.restoreReturnedMission(mission.metadata.missionId);
        }
        const runtime = await this.runtime.returnToAgent(conversationId, {
          operator_id: operatorId,
          reason,
          scope: localAuthorityScope(this.runtime.snapshot().identity),
          mission_receipts: receipts,
        });
        return this.controlResult(missionId, 'return_to_agent');
      });
    }));
    this.controlQueue = operation.then(() => undefined, () => undefined);
    return operation;
  }

  async takeover(
    conversationId: string,
    operatorId: string,
    reason: string,
  ): Promise<MissionCoordinatorResult> {
    return this.withCoordinatorLock(async () => {
      await this.runtime.reload();
      const missions = (await this.store.readState()).missions
        .filter((candidate) => candidate.spec.conversation?.conversationId === conversationId &&
          !['COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED'].includes(candidate.spec.state))
        .sort((left, right) => left.metadata.missionId.localeCompare(right.metadata.missionId));
      const primary = missions[0];
      if (!primary) throw new AtlasCliError('LOCAL_STATE_ERROR', `Mission not found for conversation: ${conversationId}`);
      return this.withMissionLeases(missions.map((mission) => mission.metadata.missionId), async () => {
        const runtimeConversation = this.runtime.snapshot().conversations[conversationId];
        const runtime = await this.runtime.takeHumanControl(conversationId, {
          operator_id: operatorId,
          reason,
          scope: localAuthorityScope(this.runtime.snapshot().identity),
          ...(runtimeConversation?.channel_id
            ? { channel_id: runtimeConversation.channel_id }
            : primary.spec.conversation?.channel
              ? { channel_id: primary.spec.conversation.channel }
              : {}),
        });
        for (const mission of missions) {
          await this.closeActiveWaits(mission.metadata.missionId, 'RELEASED');
          const current = (await this.store.readLedger(this.scope, mission.metadata.missionId)).value?.mission.spec.state;
          if (current && !['COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED', 'HANDED_OFF'].includes(current)) {
            await this.advance(mission.metadata.missionId, 'HANDED_OFF', `local.coordinator.takeover:${operatorId}:${reason}`);
          }
        }
        return this.result(primary.metadata.missionId, { ...runtime, status: 'handoff_required' }, Boolean(runtime.replayed));
      });
    });
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
    return this.withCoordinatorLock(async () => {
      await this.runtime.reload();
      const outbox = this.runtime.snapshot().outbox.find((item) => item.id === outboxId);
      if (!outbox) return this.deliverUnlocked(outboxId, attempt);
      const missionId = missionIdForRuntimeResult({ delivery: outbox }, this.scope, this.runtime);
      return this.withMissionLease(missionId, () => this.deliverUnlocked(outboxId, attempt));
    });
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
    const state = await this.store.readState();
    const outbox = this.runtime.snapshot().outbox.find((item) => item.id === outboxId);
    if (!outbox) throw new AtlasLocalRuntimeError('NOT_FOUND', `Outbox message not found: ${outboxId}`);
    const missionId = missionIdForRuntimeResult({ delivery: outbox }, this.scope, this.runtime);
    const mission = state.missions.find((candidate) => candidate.metadata.missionId === missionId);
    if (!mission) throw new AtlasCliError('AUTHORIZATION_FAILED', `Outbox ${outboxId} is not owned by the current Mission scope`);
    if (['FAILED', 'CANCELLED', 'EXPIRED', 'HANDED_OFF'].includes(mission.spec.state)) {
      if (['delivered', 'read', 'rejected', 'failed'].includes(outbox.state)) {
        validateTerminalDeliveryReplay(outbox, attempt);
        const replayedResult = { delivery: outbox, replayed: true };
        return this.result(missionId, replayedResult, true);
      }
      throw new AtlasCliError('CONFLICT', `Mission ${missionId} is ${mission.spec.state}; delivery is fenced`, {
        nextAction: 'Inspect the terminal Mission instead of attempting delivery',
      });
    }
    if (mission.spec.state === 'PAUSED') {
      throw new AtlasCliError('CONFLICT', `Mission ${missionId} is PAUSED; delivery is fenced`, {
        nextAction: 'Resume the Mission before attempting delivery',
      });
    }
    if (mission.spec.state === 'COMPLETED') {
      validateTerminalDeliveryReplay(outbox, attempt);
      const replayedResult = { delivery: outbox, replayed: true };
      return this.result(missionId, replayedResult, true);
    }
    if (outbox.provider_message_id && attempt.provider_message_id && outbox.provider_message_id !== attempt.provider_message_id) {
      throw new AtlasCliError('CONFLICT', `Outbox ${outboxId} provider identity does not match the recorded provider message`, {
        nextAction: 'Replay the original provider identity or use a new outbox message',
      });
    }
    let runtimeResult: RuntimeResult;
    try {
      runtimeResult = await this.runtime.attemptDelivery(outboxId, attempt);
    } catch (error) {
      if (!(error instanceof AtlasLocalRuntimeError) || error.code !== 'CONFLICT') throw error;
      const terminalOutbox = this.runtime.snapshot().outbox.find((item) => item.id === outboxId);
      if (!terminalOutbox || !['delivered', 'read', 'rejected', 'failed'].includes(terminalOutbox.state)) throw error;
      validateTerminalDeliveryReplay(terminalOutbox, attempt);
      runtimeResult = { delivery: terminalOutbox, replayed: true };
    }
    await this.reconcileRuntimeResult(missionId, runtimeResult);
    return this.result(missionId, runtimeResult, Boolean(runtimeResult.replayed));
  }

  private assertScheduleRequest(scheduledAt: string, environmentId: string): void {
    if (environmentId !== this.scope.environmentId) {
      throw new AtlasCliError('AUTHORIZATION_FAILED', 'Schedule environment does not match the server-derived Mission environment', {
        nextAction: 'Use the environment bound to this local Mission project',
      });
    }
    if (!isIsoTimestamp(scheduledAt)) {
      throw new AtlasCliError('USAGE_ERROR', 'Mission schedule time must be an ISO-8601 timestamp', {
        nextAction: 'Provide a valid UTC schedule time',
      });
    }
  }

  async scheduleMission(
    input: MissionCreationInput,
    scheduledAt: string,
    environmentId = this.scope.environmentId,
  ): Promise<MissionSchedulerResult> {
    this.assertScheduleRequest(scheduledAt, environmentId);
    return this.withCoordinatorLock(async () => {
      const scheduledInput = { ...input, provenance: { ...input.provenance, source: 'schedule' as const } };
      const created = createMission(scheduledInput, this.scope, this.clock());
      if (!created.valid || !created.mission || !created.initialEvent) {
        throw new AtlasCliError('CONFLICT', `Unable to create scheduled Mission: ${created.diagnostics.map((item) => item.message).join('; ')}`, {
          nextAction: 'Provide a valid schedule Mission creation input',
        });
      }
      const missionId = created.mission.metadata.missionId;
      const existing = (await this.store.readMission(this.scope, missionId)).value;
      if (existing && !missionMatchesCreation(existing, created.mission)) {
        throw new AtlasCliError('CONFLICT', `Scheduled Mission ${missionId} already exists with different content`, {
          nextAction: 'Replay the original schedule input or use a new Mission ID',
        });
      }
      return this.withMissionLease(missionId, async () => {
        if (!existing) {
          const persisted = await this.store.createMission(this.scope, created.mission!, created.initialEvent!);
          if (persisted.status !== 'CREATED') {
            throw new AtlasCliError('CONFLICT', `Unable to persist scheduled Mission ${missionId}`, {
              nextAction: 'Retry the schedule trigger with the original Mission identity',
            });
          }
        }
        const current = (await this.store.readLedger(this.scope, missionId)).value?.mission;
        if (!current) throw new AtlasCliError('LOCAL_STATE_ERROR', `Scheduled Mission disappeared: ${missionId}`);
        if (current.spec.state === 'CREATED') await this.advance(missionId, 'READY', 'local.scheduler.ready');
        const ready = (await this.store.readLedger(this.scope, missionId)).value?.mission;
        if (ready?.spec.state === 'READY') await this.advance(missionId, 'ACTIVE', 'local.scheduler.active');
        return this.scheduleUnlocked(missionId, scheduledAt);
      });
    });
  }

  async schedule(
    missionId: string,
    scheduledAt: string,
    environmentId = this.scope.environmentId,
  ): Promise<MissionSchedulerResult> {
    this.assertScheduleRequest(scheduledAt, environmentId);
    return this.withCoordinatorLock(
      () => this.withMissionLease(missionId, () => this.scheduleUnlocked(missionId, scheduledAt)),
    );
  }

  async waitForEvent(
    missionId: string,
    request: MissionEventWaitRequest,
  ): Promise<MissionCoordinatorResult> {
    if (!request.eventType.trim() || !request.eventKey.trim()) {
      throw new AtlasCliError('USAGE_ERROR', 'Event waits require eventType and eventKey', {
        nextAction: 'Provide stable non-empty event identity fields',
      });
    }
    if (request.expiresAt !== undefined && !isIsoTimestamp(request.expiresAt)) {
      throw new AtlasCliError('USAGE_ERROR', 'Event wait expiry must be an ISO-8601 timestamp', {
        nextAction: 'Provide a valid UTC expiry time',
      });
    }
    return this.withCoordinatorLock(() => this.withMissionLease(missionId, async () => {
      const ledger = (await this.store.readLedger(this.scope, missionId)).value;
      if (!ledger) throw new AtlasCliError('LOCAL_STATE_ERROR', `Mission not found: ${missionId}`);
      if (isTerminalState(ledger.mission.spec.state)) {
        throw new AtlasCliError('CONFLICT', `Mission ${missionId} is ${ledger.mission.spec.state}; event wait is unavailable`, {
          nextAction: 'Create a new Mission for a new event wait',
        });
      }
      const waitId = deterministicId('wait-business-event', missionId, request.eventType, request.eventKey);
      const existing = (await this.store.readState()).waits.find((wait) => wait.waitId === waitId);
      if (existing) {
        if (existing.kind !== 'event' || existing.missionId !== missionId || existing.expiresAt !== request.expiresAt || stableJson(existing.payload) !== stableJson({ eventType: request.eventType, eventKey: request.eventKey })) {
          throw new AtlasCliError('CONFLICT', `Event wait ${waitId} conflicts with existing durable wait`, {
            nextAction: 'Preserve the original event identity or use a new event key',
          });
        }
        if (existing.status === 'ACTIVE') return this.result(missionId, { status: 'waiting_event', wait_id: waitId }, true);
        if (existing.status === 'RELEASED') return this.result(missionId, { status: 'event_replayed', wait_id: waitId }, true);
        throw new AtlasCliError('CONFLICT', `Event wait ${waitId} is already ${existing.status}`, {
          nextAction: 'Inspect the Mission before replaying the event wait',
        });
      }
      const currentState = ledger.mission.spec.state;
      if (currentState === 'ACTIVE') await this.advance(missionId, 'WAITING_EVENT', `local.trigger.event.wait:${request.eventType}:${request.eventKey}`);
      const wait: MissionWaitRecord = {
        waitId,
        missionId,
        scope: this.scope,
        kind: 'event',
        status: 'ACTIVE',
        ...(request.expiresAt ? { expiresAt: request.expiresAt } : {}),
        payload: { eventType: request.eventType, eventKey: request.eventKey },
        updatedAt: this.clock(),
      };
      const activeWait: MissionActiveWait = { kind: 'event', waitId, ...(request.expiresAt ? { expiresAt: request.expiresAt } : {}) };
      const persisted = await this.store.putWaitAndProjectActiveWait(this.scope, wait, activeWait);
      if (persisted.status !== 'CREATED' && persisted.status !== 'DUPLICATE_REPLAY') {
        throw new AtlasCliError('CONFLICT', `Unable to persist event wait ${waitId}`, {
          nextAction: 'Inspect the Mission wait state before retrying',
        });
      }
      return this.result(missionId, { status: 'waiting_event', wait_id: waitId }, false);
    }));
  }

  async signalEvent(
    missionId: string,
    eventType: string,
    eventKey: string,
    occurredAt = this.clock(),
  ): Promise<MissionCoordinatorResult> {
    return this.withCoordinatorLock(() => this.withMissionLease(missionId, () => this.signalEventUnlocked(missionId, eventType, eventKey, occurredAt)));
  }

  private async signalEventUnlocked(
    missionId: string,
    eventType: string,
    eventKey: string,
    occurredAt: string,
    triggerId?: string,
  ): Promise<MissionCoordinatorResult> {
    if (!eventType.trim() || !eventKey.trim() || !isIsoTimestamp(occurredAt)) {
      throw new AtlasCliError('USAGE_ERROR', 'Event signals require eventType, eventKey and a valid UTC occurredAt', {
        nextAction: 'Provide stable event identity fields and an ISO-8601 timestamp',
      });
    }
    const ledger = (await this.store.readLedger(this.scope, missionId)).value;
    if (!ledger) throw new AtlasCliError('LOCAL_STATE_ERROR', `Mission not found: ${missionId}`);
    if (isTerminalState(ledger.mission.spec.state)) {
      throw new AtlasCliError('CONFLICT', `Mission ${missionId} is ${ledger.mission.spec.state}; late event is fenced`, {
        nextAction: 'Inspect the terminal Mission instead of replaying the event',
      });
    }
    const wait = (await this.store.readState()).waits.find((candidate) => candidate.missionId === missionId && candidate.kind === 'event' && candidate.status === 'ACTIVE' && isRecord(candidate.payload) && candidate.payload.eventType === eventType && candidate.payload.eventKey === eventKey);
    if (!wait) throw new AtlasCliError('CONFLICT', `No active event wait matches ${eventType}:${eventKey}`, {
      nextAction: 'Register the event wait before delivering the business signal',
    });
    if (wait.expiresAt && Date.parse(occurredAt) >= Date.parse(wait.expiresAt)) {
      throw new AtlasCliError('CONFLICT', `Event ${eventType}:${eventKey} arrived after its Mission wait expired`, {
        nextAction: 'Run the scheduler to expire the wait and inspect the Mission',
      });
    }
    await this.advanceAndResolveWait(missionId, 'ACTIVE', `local.trigger.event.signal:${eventType}:${eventKey}`, wait.waitId, 'RELEASED', triggerId);
    return this.result(missionId, { status: 'event_received', eventType, eventKey, occurredAt }, false);
  }

  async trigger(envelope: MissionTriggerEnvelope): Promise<MissionTriggerResult> {
    if (!envelope.triggerId.trim() || !envelope.type.trim() || !isIsoTimestamp(envelope.occurredAt)) {
      throw new AtlasCliError('USAGE_ERROR', 'Trigger envelopes require triggerId, type and a valid UTC occurredAt', {
        nextAction: 'Provide a stable trigger identity, type and ISO-8601 occurrence time',
      });
    }
    if (hasIncompleteTriggerEventRoute(envelope)) {
      throw new AtlasCliError('USAGE_ERROR', 'Trigger event routing requires missionId, eventType and eventKey', {
        nextAction: 'Provide the complete governed business-event identity and its owning Mission',
      });
    }
    return this.withCoordinatorLock(async () => {
      const createdAt = this.clock();
      const trigger: MissionTriggerRecord = {
        triggerId: envelope.triggerId,
        scope: this.scope,
        type: envelope.type,
        occurredAt: envelope.occurredAt,
        payloadDigest: sha256(stableJson(envelope.payload)),
        payload: envelope.payload,
        status: 'RECEIVED',
        ...(envelope.missionId ? { missionId: envelope.missionId } : {}),
        ...(envelope.eventType ? { eventType: envelope.eventType } : {}),
        ...(envelope.eventKey ? { eventKey: envelope.eventKey } : {}),
        createdAt,
        updatedAt: createdAt,
      };
      const persisted = await this.store.putTrigger(this.scope, trigger);
      if (persisted.status === 'REJECTED') {
        const diagnostic = persisted.diagnostics[0];
        throw new AtlasCliError('CONFLICT', diagnostic?.message ?? `Unable to persist trigger ${envelope.triggerId}`, { nextAction: diagnostic?.next_action });
      }
      const existing = persisted.value!;
      if (persisted.status === 'DUPLICATE_REPLAY' && existing.status === 'APPLIED') {
        return {
          triggerId: existing.triggerId,
          type: existing.type,
          status: existing.status,
          replayed: true,
          ...(existing.missionId ? { missionId: existing.missionId } : {}),
          ...(existing.result?.waitId ? { waitId: existing.result.waitId } : {}),
          ...(existing.result ? { result: existing.result } : {}),
        };
      }
      const effective = existing;
      const updateTriggerStatus = async (status: MissionTriggerRecord['status'], update: Readonly<Partial<Pick<MissionTriggerRecord, 'missionId' | 'result'>>> = {}): Promise<void> => {
        const updated = await this.store.updateTrigger(this.scope, effective.triggerId, { status, ...update, updatedAt: this.clock() });
        if (updated.status !== 'UPDATED' && updated.status !== 'DUPLICATE_REPLAY') {
          throw new AtlasCliError('LOCAL_STATE_ERROR', `Unable to persist trigger ${effective.triggerId} as ${status}`, {
            nextAction: 'Retry the trigger and inspect the durable trigger record',
          });
        }
      };
      try {
        if (effective.missionId) {
          const owned = (await this.store.readLedger(this.scope, effective.missionId)).value;
          if (!owned) throw new AtlasCliError('AUTHORIZATION_FAILED', `Trigger ${effective.triggerId} references Mission ${effective.missionId} outside the current scope`, { nextAction: 'Use a Mission ID owned by the server-derived scope' });
        }
        if (effective.missionId && effective.eventType && effective.eventKey) {
          let coordinator: MissionCoordinatorResult;
          try {
            coordinator = await this.withMissionLease(effective.missionId, () => this.signalEventUnlocked(effective.missionId!, effective.eventType!, effective.eventKey!, effective.occurredAt, effective.triggerId));
          } catch (error) {
            const ledger = (await this.store.readLedger(this.scope, effective.missionId)).value;
            const released = (await this.store.readState()).waits.find((wait) => wait.missionId === effective.missionId && wait.kind === 'event' && wait.status === 'RELEASED' && isRecord(wait.payload) && wait.payload.eventType === effective.eventType && wait.payload.eventKey === effective.eventKey);
            if (!(error instanceof AtlasCliError) || error.code !== 'CONFLICT' || !ledger || !released) throw error;
            if (isRecord(released.payload) && released.payload.resolvedTriggerId !== effective.triggerId) throw error;
            coordinator = await this.result(effective.missionId, { status: 'event_received', eventType: effective.eventType, eventKey: effective.eventKey, occurredAt: effective.occurredAt }, true);
          }
          const result = { status: coordinator.status, missionId: coordinator.missionId, ...(coordinator.mission.spec.activeWait?.waitId ? { waitId: coordinator.mission.spec.activeWait.waitId } : {}) };
          await updateTriggerStatus('APPLIED', { missionId: coordinator.missionId, result });
          return { triggerId: effective.triggerId, type: effective.type, status: 'APPLIED', replayed: persisted.status === 'DUPLICATE_REPLAY', missionId: coordinator.missionId, ...(result.waitId ? { waitId: result.waitId } : {}), result, coordinator };
        }
        const result = { status: 'accepted' };
        await updateTriggerStatus('APPLIED', { result });
        return { triggerId: effective.triggerId, type: effective.type, status: 'APPLIED', replayed: persisted.status === 'DUPLICATE_REPLAY', ...(effective.missionId ? { missionId: effective.missionId } : {}), result };
      } catch (error) {
        try {
          await updateTriggerStatus('REJECTED', effective.missionId ? { missionId: effective.missionId } : {});
        } catch (bookkeepingError) {
          if (error instanceof Error && bookkeepingError instanceof Error) {
            error.message = `${error.message}; trigger rejection bookkeeping failed: ${bookkeepingError.message}`;
          }
        }
        throw error;
      }
    });
  }

  async runSchedulerTick(now = this.clock()): Promise<MissionSchedulerResult> {
    if (!isIsoTimestamp(now)) {
      throw new AtlasCliError('USAGE_ERROR', 'Scheduler time must be an ISO-8601 timestamp', {
        nextAction: 'Provide a valid UTC scheduler time',
      });
    }
    return this.withCoordinatorLock(async () => {
      const items: MissionSchedulerItem[] = [];
      const state = await this.store.readState();
      const dueDeadlines = state.missions
        .filter((mission) => mission.spec.deadline && !isTerminalState(mission.spec.state) && mission.spec.state !== 'COMPLETING' && Date.parse(mission.spec.deadline) <= Date.parse(now))
        .sort((left, right) => left.metadata.missionId.localeCompare(right.metadata.missionId));
      for (const mission of dueDeadlines) {
        await this.withMissionLease(mission.metadata.missionId, async () => {
          const current = (await this.store.readLedger(this.scope, mission.metadata.missionId)).value?.mission;
          if (!current || isTerminalState(current.spec.state) || !current.spec.deadline || Date.parse(current.spec.deadline) > Date.parse(now)) return;
          await this.advance(current.metadata.missionId, 'EXPIRED', `local.scheduler.deadline:${current.spec.deadline}`, 'EXPIRED');
          items.push({ missionId: current.metadata.missionId, action: 'EXPIRED' });
        });
      }

      const dueWaits = (await this.store.readState()).waits
        .filter((wait) => wait.status === 'ACTIVE' && wait.expiresAt && Date.parse(wait.expiresAt) <= Date.parse(now))
        .sort((left, right) => left.waitId.localeCompare(right.waitId));
      for (const wait of dueWaits) {
        await this.withMissionLease(wait.missionId, async () => {
          const current = (await this.store.readLedger(this.scope, wait.missionId)).value?.mission;
          if (!current || isTerminalState(current.spec.state)) return;
          const currentWait = (await this.store.readState()).waits.find((candidate) => candidate.waitId === wait.waitId);
          if (!currentWait || currentWait.status !== 'ACTIVE') {
            items.push({ missionId: wait.missionId, waitId: wait.waitId, action: 'DUPLICATE_REPLAY' });
            return;
          }
          if (wait.kind === 'schedule') {
            if (current.spec.state !== 'WAITING_SCHEDULE') return;
            const scheduledEnvironment = isRecord(wait.payload) && typeof wait.payload.environmentId === 'string'
              ? wait.payload.environmentId
              : this.scope.environmentId;
            if (scheduledEnvironment !== this.scope.environmentId) {
              throw new AtlasCliError('AUTHORIZATION_FAILED', `Mission schedule ${wait.waitId} belongs to another environment`, {
                nextAction: 'Run the scheduler in the environment that owns the durable wait',
              });
            }
            await this.advanceAndResolveWait(wait.missionId, 'ACTIVE', `local.scheduler.schedule:${wait.waitId}`, wait.waitId, 'RELEASED');
            items.push({ missionId: wait.missionId, waitId: wait.waitId, action: 'ACTIVATED' });
            return;
          }
          await this.advanceAndResolveWait(wait.missionId, 'EXPIRED', `local.scheduler.wait-timeout:${wait.waitId}`, wait.waitId, 'EXPIRED');
          items.push({ missionId: wait.missionId, waitId: wait.waitId, action: 'EXPIRED' });
        });
      }
      return { now, items };
    });
  }

  async replay(
    message: AtlasLocalInboundMessage,
  ): Promise<MissionCoordinatorResult> {
    return this.receive(message);
  }

  async applyDeliveryCallback(callback: Readonly<{
    callback_id: string;
    provider_message_id: string;
    state: 'sent' | 'delivered' | 'read' | 'failed';
    occurred_at: string;
  }>): Promise<MissionCoordinatorResult> {
    return this.withCoordinatorLock(async () => {
      await this.runtime.reload();
      const runtimeSnapshot = this.runtime.snapshot();
      const callbackOutbox = runtimeSnapshot.outbox.find((item) => item.provider_message_id === callback.provider_message_id);
      if (!callbackOutbox) throw new AtlasLocalRuntimeError('NOT_FOUND', `Provider delivery not found: ${callback.provider_message_id}`);
      const missionId = missionIdForRuntimeResult({ delivery: callbackOutbox }, this.scope, this.runtime);
      const mission = (await this.store.readLedger(this.scope, missionId)).value?.mission;
      if (!mission) throw new AtlasCliError('AUTHORIZATION_FAILED', `Provider delivery is not owned by Mission ${missionId}`);
      const terminalReplay = this.runtime.deliveryCallbackReplay(callback);
      if (['FAILED', 'CANCELLED', 'EXPIRED'].includes(mission.spec.state)) {
        if (terminalReplay) return this.result(missionId, terminalReplay, true);
        throw new AtlasCliError('CONFLICT', `Mission ${missionId} is ${mission.spec.state}; delivery callback is fenced`, {
          nextAction: 'Replay the original callback identity or inspect the terminal Mission',
        });
      }
      if (mission.spec.state === 'HANDED_OFF') {
        return this.withMissionLease(missionId, async () => {
          const runtimeResult = await this.runtime.applyDeliveryCallback(callback);
          await this.reconcileRuntimeResult(missionId, this.refreshRuntimeResult(runtimeResult));
          return this.result(missionId, runtimeResult, Boolean(runtimeResult.replayed));
        });
      }
      if (mission.spec.state === 'PAUSED') {
        throw new AtlasCliError('CONFLICT', `Mission ${missionId} is PAUSED; delivery callback is fenced`, {
          nextAction: 'Resume the Mission before applying delivery callbacks',
        });
      }
      if (mission.spec.state === 'COMPLETED') {
        if (!terminalReplay) {
          throw new AtlasCliError('CONFLICT', `Mission ${missionId} is COMPLETED; delivery callback is fenced`, {
            nextAction: 'Replay the original callback identity or inspect the completed Mission',
          });
        }
        return this.result(missionId, terminalReplay, true);
      }
      return this.withMissionLease(missionId, async () => {
        const runtimeResult = await this.runtime.applyDeliveryCallback(callback);
        await this.reconcileRuntimeResult(missionId, this.refreshRuntimeResult(runtimeResult));
        return this.result(missionId, runtimeResult, Boolean(runtimeResult.replayed));
      });
    });
  }

  async inspect(missionId: string): Promise<Readonly<{
    mission: Mission | null;
    ledger: MissionCoordinatorLedger | null;
    receipts: readonly unknown[];
  }>> {
    await this.runtime.reload();
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
    return this.withCoordinatorLock(
      () => this.withMissionLease(missionId, () => this.controlUnlockedUnsafe(missionId, command, actorIdentity, reason)),
      command === 'inspect',
    );
  }

  private async controlUnlockedUnsafe(
    missionId: string,
    command: 'inspect' | 'pause' | 'resume' | 'cancel',
    actorIdentity: string,
    reason: string,
  ): Promise<MissionControlResult> {
    await this.runtime.reload();
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
      await this.advance(missionId, 'PAUSED', `local.control.pause:${actorIdentity}:${reason}`, 'CANCELLED');
    } else if (command === 'resume') {
      if (ledger.mission.spec.state !== 'PAUSED') {
        throw new AtlasCliError('CONFLICT', `Mission ${missionId} is not paused`, {
          nextAction: 'Resume only a Mission currently in PAUSED state',
        });
      }
      const runtimeConversation = ledger.mission.spec.conversation?.conversationId
        ? this.runtime.snapshot().conversations[ledger.mission.spec.conversation.conversationId]
        : undefined;
      if (runtimeConversation?.takeover || runtimeConversation?.state === 'human_takeover') {
        throw new AtlasCliError('CONFLICT', `Mission ${missionId} is under human control`, {
          nextAction: 'Use an explicit governed return-to-agent command instead of ordinary resume',
        });
      }
      await this.advance(missionId, 'ACTIVE', `local.control.resume:${actorIdentity}:${reason}`);
      await this.restorePausedWaits(missionId);
    } else if (command === 'cancel') {
      if (['COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED'].includes(ledger.mission.spec.state)) {
        throw new AtlasCliError('CONFLICT', `Mission ${missionId} is terminal in state ${ledger.mission.spec.state}`, {
          nextAction: 'Inspect the terminal Mission instead of mutating it',
        });
      }
      await this.advance(missionId, 'CANCELLED', `local.control.cancel:${actorIdentity}:${reason}`, 'CANCELLED');
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
    await this.runtime.reload();
    return {
      version: ATLAS_LOCAL_MISSION_COORDINATOR_VERSION,
      missionState: await this.store.readState(),
      runtime: this.runtime.snapshot(),
    };
  }

  private async restoreReturnedMission(missionId: string): Promise<void> {
    const ledger = (await this.store.readLedger(this.scope, missionId)).value;
    if (!ledger || ledger.mission.spec.state !== 'HANDED_OFF') return;
    const handoff = [...ledger.events].reverse().find((event) => event.spec.resultingState === 'HANDED_OFF');
    const priorState = handoff?.spec.priorState;
    if (!priorState || priorState === 'HANDED_OFF' || isTerminalState(priorState) || priorState === 'CREATED' || priorState === 'READY') {
      throw new AtlasCliError('CONFLICT', `Mission ${missionId} has no legally restorable pre-handoff state`, {
        nextAction: 'Inspect the Mission lifecycle ledger before returning control',
      });
    }

    const waits = (await this.store.readState()).waits
      .filter((wait) => wait.missionId === missionId && wait.status === 'RELEASED')
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    if (priorState === 'ACTIVE') {
      await this.advance(missionId, 'ACTIVE', 'local.control.return-to-agent');
      return;
    }
    if (priorState === 'PAUSED') {
      await this.advance(missionId, 'ACTIVE', 'local.control.return-to-agent');
      await this.advance(missionId, 'PAUSED', 'local.control.return-to-agent.restore-paused');
      return;
    }
    if (priorState === 'COMPLETING') {
      await this.advance(missionId, 'ACTIVE', 'local.control.return-to-agent');
      await this.advance(missionId, 'COMPLETING', 'local.control.return-to-agent.restore-completing');
      return;
    }
    const waitKind = priorState === 'WAITING_APPROVAL'
      ? 'approval'
      : priorState === 'WAITING_SCHEDULE'
        ? 'schedule'
        : priorState === 'WAITING_EVENT'
          ? 'event'
          : undefined;
    if (!waitKind) {
      await this.advance(missionId, 'ACTIVE', 'local.control.return-to-agent');
      return;
    }
    const wait = waits.find((candidate) => candidate.kind === waitKind);
    if (!wait) {
      throw new AtlasCliError('CONFLICT', `Mission ${missionId} lost its pre-handoff ${waitKind} wait`, {
        nextAction: 'Inspect the Mission wait ledger before returning control',
      });
    }
    await this.advance(missionId, 'ACTIVE', 'local.control.return-to-agent');
    await this.advance(missionId, priorState, `local.control.return-to-agent.restore-${waitKind}`);
    const restored = await this.store.reactivateWaitAndProjectActiveWait(this.scope, wait.waitId, {
      kind: wait.kind,
      waitId: wait.waitId,
      ...(wait.expiresAt ? { expiresAt: wait.expiresAt } : {}),
    }, this.clock());
    if (restored.status !== 'UPDATED' && restored.status !== 'DUPLICATE_REPLAY') {
      throw new AtlasCliError('CONFLICT', `Unable to restore Mission wait ${wait.waitId}`, {
        nextAction: 'Inspect the Mission wait ledger before retrying return-to-Agent',
      });
    }
  }

  private async controlResult(
    missionId: string,
    command: MissionControlResult['command'],
  ): Promise<MissionControlResult> {
    await this.runtime.reload();
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

  private async withMissionLeases<T>(missionIds: readonly string[], operation: () => Promise<T>): Promise<T> {
    if (missionIds.length === 0) return operation();
    const [missionId, ...remaining] = missionIds;
    return this.withMissionLease(missionId!, () => this.withMissionLeases(remaining, operation));
  }

  private async withMissionLease<T>(missionId: string, operation: () => Promise<T>): Promise<T> {
    const existing = this.activeLeaseContexts.get(missionId);
    if (existing) {
      await this.assertMissionLease(existing);
      return operation();
    }

    const lease = await this.acquireMissionLease(missionId);
    const context: MissionLeaseContext = { lease, lost: {} };
    this.activeLeaseContexts.set(missionId, context);
    const heartbeatEveryMs = Math.max(50, Math.floor(this.leaseTtlMs / 3));
    let heartbeatInFlight: Promise<void> | undefined;
    const runHeartbeat = (): void => {
      if (heartbeatInFlight) return;
      heartbeatInFlight = this.heartbeatMissionLease(lease.leaseId, missionId)
        .then(() => undefined)
        .catch((error: unknown) => {
          context.lost.error ??= error;
        })
        .finally(() => {
          heartbeatInFlight = undefined;
        });
    };
    const heartbeat = setInterval(runHeartbeat, heartbeatEveryMs);
    const assertLease = () => this.assertMissionLease(context);
    const commitFence = <T>(operation: () => Promise<T>): Promise<T> =>
      this.leaseStore.withCommitFence(
        {
          scope: this.scope,
          missionId,
          ownerId: context.lease.ownerId,
          leaseId: context.lease.leaseId,
          now: this.clock(),
        },
        operation,
      );
    const removeRuntimeGuard = this.runtime.addCommitGuard(commitFence);
    const removeStoreGuard = this.store.addCommitGuard(commitFence);
    let operationError: unknown;
    try {
      const result = await operation();
      clearInterval(heartbeat);
      await heartbeatInFlight;
      await assertLease();
      return result;
    } catch (error) {
      operationError = error;
      throw error;
    } finally {
      clearInterval(heartbeat);
      await heartbeatInFlight;
      removeRuntimeGuard();
      removeStoreGuard();
      this.activeLeaseContexts.delete(missionId);
      try {
        await this.releaseMissionLease(lease.leaseId, missionId);
      } catch (error) {
        if (!operationError && !context.lost.error) throw error;
      }
    }
  }

  private async assertMissionLease(context: MissionLeaseContext): Promise<void> {
    if (context.lost.error) throw context.lost.error;
    try {
      await this.leaseStore.heartbeat({
        scope: this.scope,
        missionId: context.lease.missionId,
        ownerId: context.lease.ownerId,
        leaseId: context.lease.leaseId,
        now: this.clock(),
        ttlMs: this.leaseTtlMs,
      });
    } catch (error) {
      context.lost.error ??= error;
      throw error;
    }
  }

  private async withCoordinatorLock<T>(operation: () => Promise<T>, waitForLock = false): Promise<T> {
    if (waitForLock) {
      const deadline = Date.now() + COORDINATOR_LOCK_WAIT_MS;
      while (true) {
        try {
          await this.coordinatorLock.acquire();
          break;
        } catch (error) {
          if (!(error instanceof AtlasCliError) || error.code !== 'LOCAL_STATE_ERROR') throw error;
          if (Date.now() >= deadline) {
            throw new AtlasCliError('CONFLICT', 'Another Mission coordinator operation remains active', {
              retryable: true,
              nextAction: 'Retry after the current Mission operation finishes',
            });
          }
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

  private async recoverMissionStart(message: AtlasLocalInboundMessage, missionId: string, state: MissionState): Promise<void> {
    if (state === 'CREATED') await this.advance(missionId, 'READY', 'local.coordinator.recover-ready');
    const current = (await this.store.readLedger(this.scope, missionId)).value?.mission.spec.state;
    if (current === 'READY') await this.advance(missionId, 'ACTIVE', 'local.coordinator.recover-active');
  }

  private refreshRuntimeResult(runtimeResult: RuntimeResult): RuntimeResult {
    const snapshot = this.runtime.snapshot();
    const traceId = runtimeResult.trace_id ?? runtimeResult.trace?.id ?? runtimeResult.approval?.trace_id ?? runtimeResult.delivery?.trace_id;
    const trace = typeof traceId === 'string' ? snapshot.traces.find((item) => item.id === traceId) : undefined;
    const approval = typeof traceId === 'string' ? Object.values(snapshot.approvals).find((item) => item.trace_id === traceId) : undefined;
    const outbox = typeof traceId === 'string' ? snapshot.outbox.find((item) => item.trace_id === traceId) : undefined;
    const terminalDelivery = outbox && ['delivered', 'read', 'rejected', 'failed'].includes(outbox.state) ? outbox : undefined;
    const derivedStatus = terminalDelivery
      ? terminalDelivery.state === 'rejected' || terminalDelivery.state === 'failed'
        ? 'rejected'
        : terminalDelivery.state === 'read'
          ? 'delivered'
          : terminalDelivery.state
      : outbox
        ? 'queued'
        : approval?.status === 'approved'
          ? 'committed'
          : approval?.status === 'rejected' || approval?.status === 'cancelled'
            ? 'rejected'
            : approval?.status === 'pending'
              ? 'approval_pending'
              : undefined;
    const currentStatus = runtimeResult.replayed ? derivedStatus : undefined;
    return {
      ...runtimeResult,
      ...(trace ? { trace } : {}),
      ...(approval ? { approval } : {}),
      ...(outbox ? { outbox } : {}),
      ...(currentStatus ? { status: currentStatus } : {}),
      ...(terminalDelivery ? { delivery: terminalDelivery } : {}),
    };
  }

  private async assertApprovalMissionActive(missionId: string, wait: MissionWaitRecord, decision: 'approved' | 'rejected'): Promise<void> {
    if (!sameScope(wait.scope, this.scope)) throw new AtlasCliError('AUTHORIZATION_FAILED', `Approval wait is outside the current Mission scope`);
    const runtimeApproval = Object.values(this.runtime.snapshot().approvals).find((approval) => approval.id === (isRecord(wait.payload) ? wait.payload.approvalId : undefined));
    if (wait.status !== 'ACTIVE' && runtimeApproval && runtimeApproval.status !== 'pending') {
      if (runtimeApproval.status === decision || (runtimeApproval.status === 'approved' && decision === 'approved') || (runtimeApproval.status === 'rejected' && decision === 'rejected')) return;
    }
    if (runtimeApproval?.status === decision) return;
    if (runtimeApproval?.status !== 'pending' && runtimeApproval?.status !== 'approved') {
      if (runtimeApproval?.status === 'rejected' && decision === 'rejected') return;
      throw new AtlasCliError('CONFLICT', `Approval is not active: ${String(isRecord(wait.payload) ? wait.payload.approvalId : '')}`, { nextAction: 'Inspect the Mission and use an active approval ID' });
    }
    if (wait.status !== 'ACTIVE' || wait.kind !== 'approval' || !isRecord(wait.payload) || typeof wait.payload.approvalId !== 'string') {
      throw new AtlasCliError('CONFLICT', `Approval is not active: ${String(isRecord(wait.payload) ? wait.payload.approvalId : '')}`, { nextAction: 'Inspect the Mission and use an active approval ID' });
    }
    const ledger = (await this.store.readLedger(this.scope, missionId)).value;
    if (!ledger || !sameScope(ledger.mission.spec.scope, this.scope) || ledger.mission.spec.state !== 'WAITING_APPROVAL') {
      throw new AtlasCliError('CONFLICT', `Mission ${missionId} is not awaiting approval`, { nextAction: 'Inspect the Mission before deciding the approval' });
    }
  }

  private async restorePausedWaits(missionId: string): Promise<void> {
    const snapshot = this.runtime.snapshot();
    const ledger = (await this.store.readLedger(this.scope, missionId)).value;
    if (!ledger) throw new AtlasCliError('LOCAL_STATE_ERROR', `Mission not found: ${missionId}`);
    const waits = (await this.store.readState()).waits
      .filter((wait) => wait.missionId === missionId && wait.status === 'CANCELLED')
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    const scheduleWait = waits.find((wait) => wait.kind === 'schedule' && typeof wait.expiresAt === 'string');
    if (scheduleWait) {
      const restoredAt = scheduleWait.expiresAt && Date.parse(scheduleWait.expiresAt) <= Date.parse(this.clock())
        ? 'WAITING_SCHEDULE'
        : 'WAITING_SCHEDULE';
      await this.advance(missionId, restoredAt, 'local.control.resume.restore-schedule');
      const restored = await this.store.reactivateWaitAndProjectActiveWait(this.scope, scheduleWait.waitId, {
        kind: 'schedule',
        waitId: scheduleWait.waitId,
        expiresAt: scheduleWait.expiresAt,
      }, this.clock());
      if (restored.status !== 'UPDATED' && restored.status !== 'DUPLICATE_REPLAY') throw new AtlasCliError('CONFLICT', `Unable to restore schedule wait ${scheduleWait.waitId}`);
      return;
    }
    const approvalWait = waits.find((wait) => wait.kind === 'approval' && isRecord(wait.payload) && typeof wait.payload.approvalId === 'string');
    const approval = approvalWait
      ? snapshot.approvals[String((approvalWait.payload as Record<string, unknown>).approvalId)]
      : undefined;
    if (approval?.status === 'pending') {
      await this.advance(missionId, 'WAITING_APPROVAL', 'local.control.resume.restore-approval');
      const waitId = approvalWait!.waitId;
      await this.ensureWait({ ...approvalWait!, status: 'ACTIVE', updatedAt: this.clock() });
      await this.projectActiveWait(missionId, waitId, 'approval');
      return;
    }
    const deliveryWait = waits.find((wait) => wait.kind === 'event' && isRecord(wait.payload) && typeof wait.payload.outboxId === 'string');
    const outbox = deliveryWait
      ? snapshot.outbox.find((item) => item.id === String((deliveryWait.payload as Record<string, unknown>).outboxId))
      : undefined;
    if (outbox && !['delivered', 'read', 'rejected', 'failed'].includes(outbox.state)) {
      await this.advance(missionId, 'WAITING_EVENT', 'local.control.resume.restore-delivery');
      await this.ensureWait({ ...deliveryWait!, status: 'ACTIVE', updatedAt: this.clock() });
      await this.projectActiveWait(missionId, deliveryWait!.waitId, 'event');
      return;
    }
    const businessEventWait = waits.find((wait) => wait.kind === 'event' && isRecord(wait.payload) && typeof wait.payload.eventType === 'string' && typeof wait.payload.eventKey === 'string');
    if (businessEventWait) {
      await this.advance(missionId, 'WAITING_EVENT', 'local.control.resume.restore-business-event');
      await this.ensureWait({ ...businessEventWait, status: 'ACTIVE', updatedAt: this.clock() });
      await this.projectActiveWait(missionId, businessEventWait.waitId, 'event', businessEventWait.expiresAt);
      return;
    }
    const inboundWait = waits.find((wait) => wait.kind === 'event' && isRecord(wait.payload) && typeof wait.payload.messageId === 'string' && typeof wait.payload.expectedSequence === 'number');
    if (inboundWait) {
      await this.advance(missionId, 'WAITING_EVENT', 'local.control.resume.restore-inbound');
      await this.ensureWait({ ...inboundWait, status: 'ACTIVE', updatedAt: this.clock() });
      await this.projectActiveWait(missionId, inboundWait.waitId, 'event');
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

    if (runtimeResult.status === 'human_takeover') {
      if (['COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED', 'HANDED_OFF'].includes(state)) return;
      await this.closeActiveWaits(missionId, 'RELEASED');
      const current = (await this.store.readLedger(this.scope, missionId)).value?.mission.spec.state;
      if (current && !['COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED', 'HANDED_OFF'].includes(current)) {
        await this.advance(missionId, 'HANDED_OFF', 'local.coordinator.handoff');
      }
      return;
    }

    if (['PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED', 'HANDED_OFF'].includes(state)) return;

    if (runtimeResult.status === 'held_out_of_order') {
      if (state === 'ACTIVE') await this.advance(missionId, 'WAITING_EVENT', 'local.coordinator.await-inbound');
      const waitId = deterministicId('wait-inbound', missionId);
      await this.ensureWait({
        waitId,
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
      await this.projectActiveWait(missionId, waitId, 'event');
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
      const waitId = deterministicId('wait-approval', missionId);
      await this.ensureWait({
        waitId,
        missionId,
        scope: this.scope,
        kind: 'approval',
        status: 'ACTIVE',
        payload: { approvalId: runtimeResult.approval.id },
        updatedAt: this.clock(),
      });
      await this.projectActiveWait(missionId, waitId, 'approval');
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
      const waitId = deterministicId('wait-delivery', missionId);
      await this.ensureWait({
        waitId,
        missionId,
        scope: this.scope,
        kind: 'event',
        status: 'ACTIVE',
        payload: { outboxId: runtimeResult.outbox.id },
        updatedAt: this.clock(),
      });
      await this.projectActiveWait(missionId, waitId, 'event');
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
    if (existing) {
      if (stableJson(existing.scope) !== stableJson(wait.scope) || existing.missionId !== wait.missionId || existing.kind !== wait.kind || stableJson(existing.payload) !== stableJson(wait.payload)) {
        throw new AtlasCliError('CONFLICT', `Mission wait ${wait.waitId} does not match the deterministic wait identity`, {
          nextAction: 'Inspect the Mission wait and preserve the original wait payload',
        });
      }
      if (existing.status === 'ACTIVE') return;
      if (existing.status === 'CANCELLED') {
        const mission = (await this.store.readMission(this.scope, wait.missionId)).value;
        if (!mission || ['PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED'].includes(mission.spec.state)) {
          throw new AtlasCliError('CONFLICT', `Mission wait ${wait.waitId} cannot be reactivated for Mission state ${mission?.spec.state ?? 'unknown'}`, {
            nextAction: 'Inspect the Mission before replaying its runtime result',
          });
        }
        const reactivated = await this.store.updateWaitStatus(this.scope, wait.waitId, 'ACTIVE', this.clock());
        if (!['UPDATED', 'DUPLICATE_REPLAY'].includes(reactivated.status)) throw new AtlasCliError('LOCAL_STATE_ERROR', `Unable to reactivate Mission wait ${wait.waitId}`);
        return;
      }
      throw new AtlasCliError('CONFLICT', `Mission wait ${wait.waitId} is already ${existing.status}`, {
        nextAction: 'Inspect the Mission and create a new governed wait if work remains pending',
      });
    }
    const result = await this.store.putWait(this.scope, wait);
    if (!['CREATED', 'DUPLICATE_REPLAY'].includes(result.status)) {
      throw new AtlasCliError('LOCAL_STATE_ERROR', `Unable to persist Mission wait ${wait.waitId}: ${result.diagnostics.map((item) => item.message).join('; ')}`);
    }
  }

  private async projectActiveWait(missionId: string, waitId: string, kind: MissionActiveWait['kind'], expiresAt?: string): Promise<void> {
    const result = await this.store.updateMissionActiveWait(this.scope, missionId, { kind, waitId, ...(expiresAt ? { expiresAt } : {}) });
    if (!['UPDATED', 'DUPLICATE_REPLAY'].includes(result.status)) throw new AtlasCliError('LOCAL_STATE_ERROR', `Unable to project Mission active wait ${waitId}`);
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
    const mission = (await this.store.readMission(this.scope, current.missionId)).value;
    if (mission?.spec.activeWait?.waitId === waitId) await this.store.updateMissionActiveWait(this.scope, current.missionId);
  }

  private async closeActiveWaits(missionId: string, status: MissionWaitRecord['status'] = 'CANCELLED'): Promise<void> {
    const state = await this.store.readState();
    for (const wait of state.waits.filter((item) => item.missionId === missionId && item.status === 'ACTIVE')) {
      const result = await this.store.updateWaitStatus(this.scope, wait.waitId, status, this.clock());
      if (!['UPDATED', 'DUPLICATE_REPLAY'].includes(result.status)) {
        throw new AtlasCliError('LOCAL_STATE_ERROR', `Unable to close Mission wait ${wait.waitId}`);
      }
    }
    const mission = (await this.store.readMission(this.scope, missionId)).value;
    if (mission?.spec.activeWait) await this.store.updateMissionActiveWait(this.scope, missionId);
  }

  private async approvalWait(approvalId: string): Promise<MissionPersistenceState['waits'][number] | null> {
    const state = await this.store.readState();
    const wait = state.waits.find((candidate) =>
      candidate.kind === 'approval' &&
      sameScope(candidate.scope, this.scope) &&
      isRecord(candidate.payload) &&
      candidate.payload.approvalId === approvalId,
    ) ?? null;
    if (!wait) return null;
    const mission = state.missions.find((candidate) => candidate.metadata.missionId === wait.missionId);
    if (!mission || !sameScope(mission.spec.scope, this.scope)) return null;
    return wait;
  }

  private async advanceAndResolveWait(
    missionId: string,
    resultingState: MissionState,
    sourceRef: string,
    waitId: string,
    waitStatus: MissionWaitRecord['status'],
    triggerId?: string,
  ): Promise<void> {
    const ledgerResult = await this.store.readLedger(this.scope, missionId);
    const ledger = ledgerResult.value;
    if (!ledger) throw new Error(`Mission ledger not found: ${missionId}`);
    if (ledger.mission.spec.state === resultingState) return;
    const event = createMissionLifecycleEvent(
      ledger.mission,
      {
        eventId: deterministicId('mission-event', missionId, String(ledger.mission.spec.stateVersion + 1), resultingState),
        resultingState,
        actor: { type: 'system', identity: ATLAS_LOCAL_MISSION_COORDINATOR_VERSION },
        causationId: sourceRef,
        correlationId: ledger.mission.spec.correlation.correlationId,
        source: { kind: 'system', ref: sourceRef },
        idempotencyKey: deterministicId('mission-event-idempotency', missionId, String(ledger.mission.spec.stateVersion + 1), resultingState),
      },
      this.clock(),
    );
    if (!event.valid || !event.event) throw new AtlasCliError('CONFLICT', `Illegal local Mission transition: ${event.diagnostics.map((item) => item.message).join('; ')}`, { nextAction: 'Inspect the current Mission state before retrying the command' });
    const result = await this.store.appendLifecycleEventAndResolveWait(this.scope, event.event, waitId, waitStatus, triggerId ? { triggerId } : undefined);
    if (result.status !== 'APPENDED' && result.status !== 'DUPLICATE_REPLAY') throw new AtlasCliError('CONFLICT', `Unable to resolve local Mission wait: ${result.diagnostics.map((item) => item.message).join('; ')}`, { nextAction: 'Inspect the current Mission state before retrying the scheduler' });
  }

  private async advance(
    missionId: string,
    resultingState: MissionState,
    sourceRef: string,
    closeWaitStatus?: MissionWaitRecord['status'],
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
    const result = closeWaitStatus
      ? await this.store.appendLifecycleEventAndCloseWaits(this.scope, event.event, closeWaitStatus)
      : await this.store.appendLifecycleEvent(this.scope, event.event);
    if (result.status !== 'APPENDED' && result.status !== 'DUPLICATE_REPLAY') {
      throw new AtlasCliError(
        'CONFLICT',
        `Unable to append local Mission event: ${result.diagnostics
          .map((item) => item.message)
          .join('; ')}`,
        { nextAction: 'Inspect the current Mission state before retrying the command' },
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
    const terminalMissionState = inspected.mission.spec.state;
    const status = ['COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED'].includes(terminalMissionState)
      ? terminalMissionState.toLowerCase()
      : String(runtimeResult.status ?? runtimeResult.delivery?.state ?? 'unknown');
    return {
      missionId,
      status,
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
  const bindingLock = new OperationLock(root, { filePath: path.resolve(root, '.atlas', 'mission-scope.lock') });
  await acquireWithRetry(bindingLock);
  try {
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
  } finally {
    await bindingLock.release();
  }
}

function drainedMessageIds(result: RuntimeResult): readonly string[] {
  return Array.isArray(result.drained_message_ids)
    ? result.drained_message_ids.filter((item: unknown): item is string => typeof item === 'string')
    : [];
}

function missionMatchesCreation(existing: Mission, created: Mission): boolean {
  return stableJson({
    missionId: existing.metadata.missionId,
    scope: existing.spec.scope,
    agent: existing.spec.agent,
    missionType: existing.spec.missionType,
    goal: existing.spec.goal,
    successCriteria: existing.spec.successCriteria,
    failureCriteria: existing.spec.failureCriteria,
    subject: existing.spec.subject,
    conversation: existing.spec.conversation,
    constraints: existing.spec.constraints,
    risk: existing.spec.risk,
    budget: existing.spec.budget,
    deadline: existing.spec.deadline,
    correlation: existing.spec.correlation,
    provenance: existing.spec.provenance,
  }) === stableJson({
    missionId: created.metadata.missionId,
    scope: created.spec.scope,
    agent: created.spec.agent,
    missionType: created.spec.missionType,
    goal: created.spec.goal,
    successCriteria: created.spec.successCriteria,
    failureCriteria: created.spec.failureCriteria,
    subject: created.spec.subject,
    conversation: created.spec.conversation,
    constraints: created.spec.constraints,
    risk: created.spec.risk,
    budget: created.spec.budget,
    deadline: created.spec.deadline,
    correlation: created.spec.correlation,
    provenance: created.spec.provenance,
  });
}

function sameScope(left: MissionScope, right: MissionScope): boolean {
  return left.tenantId === right.tenantId &&
    left.organisationId === right.organisationId &&
    left.projectId === right.projectId &&
    left.environmentId === right.environmentId;
}

function isIsoTimestamp(value: string): boolean {
  return !Number.isNaN(Date.parse(value)) && value.endsWith('Z');
}

function isTerminalState(state: MissionState): boolean {
  return ['COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED'].includes(state);
}

async function acquireWithRetry(lock: OperationLock): Promise<void> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      await lock.acquire();
      return;
    } catch (error) {
      if (!(error instanceof AtlasCliError) || error.code !== 'LOCAL_STATE_ERROR' || attempt >= 50) throw error;
      await new Promise((resolve) => setTimeout(resolve, Math.min(10, attempt + 1)));
    }
  }
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

function localAuthorityScope(identity: Readonly<{
  tenant_id: string;
  project_hash: string;
}>): AtlasLocalAuthorityScope {
  return {
    tenant_id: identity.tenant_id,
    organisation_id: `local-org-${identity.project_hash.slice(0, 16)}`,
    project_id: identity.project_hash,
    environment_id: 'local',
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

function traceIdForMission(mission: Mission, runtime: AtlasLocalRuntime): string | undefined {
  const messageId = mission.spec.correlation.causationId;
  if (!messageId) return undefined;
  return runtime.snapshot().traces.find((trace) => trace.message_id === messageId && trace.conversation_id === mission.spec.conversation?.conversationId)?.id;
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

function validateTerminalDeliveryReplay(
  outbox: Readonly<{ state: string; provider_message_id: string | null; provider_code: string | null }>,
  attempt: Readonly<{ outcome: 'transient_failure' | 'permanent_rejection' | 'accepted' | 'delivered'; provider_code?: string; provider_message_id?: string }>,
): void {
  const terminalOutcome = outbox.state === 'rejected' || outbox.state === 'failed' ? 'permanent_rejection' : 'delivered';
  if (attempt.outcome !== terminalOutcome) {
    throw new AtlasLocalRuntimeError('CONFLICT', `Delivery replay contradicts terminal outbox state ${outbox.state}`, {
      nextAction: 'Replay the original delivery outcome or inspect the delivery receipt',
    });
  }
  if (attempt.provider_message_id !== undefined && attempt.provider_message_id !== outbox.provider_message_id) {
    throw new AtlasLocalRuntimeError('IDEMPOTENCY_MISMATCH', 'Delivery replay provider message identity does not match the recorded delivery', {
      nextAction: 'Replay the original provider message identity',
    });
  }
  if (attempt.provider_code !== undefined && outbox.provider_code !== null && attempt.provider_code !== outbox.provider_code) {
    throw new AtlasLocalRuntimeError('IDEMPOTENCY_MISMATCH', 'Delivery replay provider code does not match the recorded delivery', {
      nextAction: 'Replay the original provider delivery payload',
    });
  }
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
