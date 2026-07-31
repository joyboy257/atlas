import path from 'node:path';
import { AtlasCliError } from './errors.js';
import { atomicWrite, ensurePrivateDirectory, readUtf8Safe } from './fs-safety.js';
import { OperationLock } from './operation-journal.js';
import {
  appendMissionLifecycleEvent,
  createMissionLifecycleLedger,
  validateMission,
  validateMissionLifecycleEvent,
  type Mission,
  type MissionLifecycleEvent,
  type MissionLifecycleLedger,
  type MissionScope,
} from './mission-contract.js';
import {
  validateAction,
  validateDecision,
  validateReceipt,
  type Action,
  type Decision,
  type Receipt,
} from './action-contract.js';

export const MISSION_PERSISTENCE_SCHEMA = 'atlas.mission-store/v1' as const;
export const MISSION_PERSISTENCE_MIGRATION_VERSION = 1 as const;
export const MISSION_PERSISTENCE_FILE = '.atlas/mission-store.json' as const;
export const MISSION_PERSISTENCE_MIGRATION_FILE = 'migrations/001_mission_persistence_v1.sql' as const;

export type MissionStepRecord = Readonly<{
  stepId: string;
  missionId: string;
  scope: MissionScope;
  status: 'PENDING' | 'RUNNING' | 'WAITING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  payload?: unknown;
  updatedAt: string;
}>;

export type MissionWaitRecord = Readonly<{
  waitId: string;
  missionId: string;
  scope: MissionScope;
  kind: 'event' | 'schedule' | 'approval' | 'handoff';
  status: 'ACTIVE' | 'RELEASED' | 'EXPIRED' | 'CANCELLED';
  expiresAt?: string;
  payload?: unknown;
  updatedAt: string;
}>;

export type MissionReceiptLink = Readonly<{
  linkId: string;
  missionId: string;
  scope: MissionScope;
  receiptId: string;
  actionId?: string;
  createdAt: string;
}>;

export type MissionTriggerRecord = Readonly<{
  triggerId: string;
  scope: MissionScope;
  type: string;
  occurredAt: string;
  payloadDigest: string;
  payload?: unknown;
  status: 'RECEIVED' | 'APPLIED' | 'REJECTED';
  missionId?: string;
  eventType?: string;
  eventKey?: string;
  result?: Readonly<{ status: string; missionId?: string; waitId?: string }>;
  createdAt: string;
  updatedAt: string;
}>;

export function hasIncompleteTriggerEventRoute(
  value: Pick<MissionTriggerRecord, 'missionId' | 'eventType' | 'eventKey'>,
): boolean {
  const hasAnyEventRouteField =
    value.eventType !== undefined || value.eventKey !== undefined;
  const hasBlankMissionId =
    value.missionId !== undefined &&
    (typeof value.missionId !== 'string' || !value.missionId.trim());
  return hasBlankMissionId || (hasAnyEventRouteField && (
    typeof value.missionId !== 'string' ||
    !value.missionId.trim() ||
    typeof value.eventType !== 'string' ||
    !value.eventType.trim() ||
    typeof value.eventKey !== 'string' ||
    !value.eventKey.trim()
  ));
}

export type MissionPersistenceState = Readonly<{
  schemaVersion: typeof MISSION_PERSISTENCE_SCHEMA;
  migrationVersion: typeof MISSION_PERSISTENCE_MIGRATION_VERSION;
  missions: readonly Mission[];
  lifecycleEvents: readonly MissionLifecycleEvent[];
  steps: readonly MissionStepRecord[];
  waits: readonly MissionWaitRecord[];
  decisions: readonly Decision[];
  actions: readonly Action[];
  receipts: readonly Receipt[];
  receiptLinks: readonly MissionReceiptLink[];
  triggers: readonly MissionTriggerRecord[];
}>;

export type PersistenceStatus =
  | 'CREATED'
  | 'UPDATED'
  | 'APPENDED'
  | 'DUPLICATE_REPLAY'
  | 'REJECTED';

export type PersistenceDiagnosticCode =
  | 'INVALID_CONTRACT'
  | 'INVALID_STATE'
  | 'NOT_FOUND'
  | 'SCOPE_MISMATCH'
  | 'IDEMPOTENCY_CONFLICT'
  | 'UNSUPPORTED_VERSION';

export type PersistenceDiagnostic = Readonly<{
  code: PersistenceDiagnosticCode;
  path: string;
  message: string;
  next_action: string;
}>;

export type PersistenceResult<T = undefined> = Readonly<{
  status: PersistenceStatus;
  diagnostics: readonly PersistenceDiagnostic[];
  value?: T;
}>;

const EMPTY_STATE: MissionPersistenceState = Object.freeze({
  schemaVersion: MISSION_PERSISTENCE_SCHEMA,
  migrationVersion: MISSION_PERSISTENCE_MIGRATION_VERSION,
  missions: Object.freeze([]),
  lifecycleEvents: Object.freeze([]),
  steps: Object.freeze([]),
  waits: Object.freeze([]),
  decisions: Object.freeze([]),
  actions: Object.freeze([]),
  receipts: Object.freeze([]),
  receiptLinks: Object.freeze([]),
  triggers: Object.freeze([]),
});

export class MissionStore {
  readonly filePath: string;
  readonly migrationPath: string;
  private readonly lock: OperationLock;
  private readonly serverScope: MissionScope;
  private transactionTail: Promise<void> = Promise.resolve();
  private readonly commitGuards = new Set<(operation: () => Promise<void>) => Promise<void>>();

  constructor(root: string, serverScope: MissionScope) {
    this.filePath = path.resolve(root, MISSION_PERSISTENCE_FILE);
    this.migrationPath = path.resolve(root, MISSION_PERSISTENCE_MIGRATION_FILE);
    this.lock = new OperationLock(root, { filePath: path.resolve(root, '.atlas', 'mission-store.lock') });
    this.serverScope = freezeClone(serverScope);
  }

  async migrate(): Promise<MissionPersistenceState> {
    await acquireWithRetry(this.lock);
    try {
      const state = await this.load();
      await this.save(state);
      return state;
    } finally {
      await this.lock.release();
    }
  }

  addCommitGuard(guard: (operation: () => Promise<void>) => Promise<void>): () => void {
    this.commitGuards.add(guard);
    return () => this.commitGuards.delete(guard);
  }

  async readState(): Promise<MissionPersistenceState> {
    const state = await this.load();
    return filterStateToScope(state, this.serverScope);
  }

  async readMission(scope: MissionScope, missionId: string): Promise<PersistenceResult<Mission | null>> {
    this.assertScope(scope);
    const state = await this.load();
    const mission = state.missions.find((candidate) => candidate.metadata.missionId === missionId) ?? null;
    if (mission && !sameScope(mission.spec.scope, scope)) return reject('SCOPE_MISMATCH', '$.missionId', 'Mission is outside the requested tenant scope', 'Use the server-derived Mission scope');
    return { status: 'UPDATED', diagnostics: [], value: mission };
  }

  async readLedger(scope: MissionScope, missionId: string): Promise<PersistenceResult<MissionLifecycleLedger | null>> {
    this.assertScope(scope);
    const state = await this.load();
    const mission = state.missions.find((candidate) => candidate.metadata.missionId === missionId) ?? null;
    if (!mission) return { status: 'UPDATED', diagnostics: [], value: null };
    if (!sameScope(mission.spec.scope, scope)) return reject('SCOPE_MISMATCH', '$.missionId', 'Mission is outside the requested tenant scope', 'Use the server-derived Mission scope');
    const events = state.lifecycleEvents.filter((event) => event.spec.missionId === missionId);
    return { status: 'UPDATED', diagnostics: [], value: freezeClone({ mission, events }) };
  }

  async createMission(scope: MissionScope, mission: Mission, initialEvent?: MissionLifecycleEvent): Promise<PersistenceResult<Mission>> {
    this.assertScope(scope);
    return this.transaction(async (state) => {
      const validation = validateMission(mission);
      if (!validation.valid || !validation.value) return { state, result: reject('INVALID_CONTRACT', '$.mission', 'Mission failed contract validation', 'Persist a validated Mission') };
      if (!sameScope(validation.value.spec.scope, scope)) return { state, result: reject('SCOPE_MISMATCH', '$.mission.spec.scope', 'Mission scope does not match the server-derived scope', 'Use the server-derived Mission scope') };
      const existing = state.missions.find((candidate) => candidate.metadata.missionId === mission.metadata.missionId);
      if (existing) {
        if (stableJson(existing) === stableJson(validation.value)) return { state, result: { status: 'DUPLICATE_REPLAY', diagnostics: [], value: existing } };
        return { state, result: reject('IDEMPOTENCY_CONFLICT', '$.mission.metadata.missionId', 'missionId was already used for different Mission state', 'Use a new Mission ID or replay the original') };
      }
      const event = initialEvent;
      if (!event) return { state, result: reject('INVALID_CONTRACT', '$.initialEvent', 'A Mission must be persisted with its initial lifecycle event', 'Supply the CREATED lifecycle event') };
      const eventValidation = validateMissionLifecycleEvent(event);
      if (!eventValidation.valid || !eventValidation.event || event.spec.missionId !== mission.metadata.missionId || !sameScope(event.spec.scope, scope) || event.spec.stateVersion !== 1 || event.spec.resultingState !== 'CREATED') return { state, result: reject('INVALID_CONTRACT', '$.initialEvent', 'Initial event must be the Mission CREATED event in the same scope', 'Persist the exact event returned by createMission()') };
      const next = freezeState({ ...state, missions: [...state.missions, validation.value], lifecycleEvents: [...state.lifecycleEvents, eventValidation.event] });
      return { state: next, result: { status: 'CREATED', diagnostics: [], value: validation.value } };
    });
  }

  async appendLifecycleEvent(scope: MissionScope, event: MissionLifecycleEvent): Promise<PersistenceResult<Mission>> {
    this.assertScope(scope);
    return this.transaction(async (state) => {
      const mission = state.missions.find((candidate) => candidate.metadata.missionId === event.spec.missionId);
      if (!mission) return { state, result: reject('NOT_FOUND', '$.event.spec.missionId', 'Mission does not exist', 'Create the Mission before appending lifecycle events') };
      if (!sameScope(mission.spec.scope, scope) || !sameScope(event.spec.scope, scope)) return { state, result: reject('SCOPE_MISMATCH', '$.event.spec.scope', 'Lifecycle event is outside the server-derived scope', 'Use the current Mission scope') };
      const ledger = freezeClone({ mission, events: state.lifecycleEvents.filter((candidate) => candidate.spec.missionId === mission.metadata.missionId) });
      const appended = appendMissionLifecycleEvent(ledger, event);
      if (appended.status === 'DUPLICATE_REPLAY') return { state, result: { status: 'DUPLICATE_REPLAY', diagnostics: [], value: mission } };
      if (appended.status !== 'APPENDED') return { state, result: { status: 'REJECTED', diagnostics: appended.diagnostics.map(toPersistenceDiagnostic), value: undefined } };
      const next = freezeState({ ...state, missions: state.missions.map((candidate) => candidate.metadata.missionId === mission.metadata.missionId ? appended.ledger.mission : candidate), lifecycleEvents: [...state.lifecycleEvents, event] });
      return { state: next, result: { status: 'APPENDED', diagnostics: [], value: appended.ledger.mission } };
    });
  }

  async appendLifecycleEventAndResolveWait(
    scope: MissionScope,
    event: MissionLifecycleEvent,
    waitId: string,
    waitStatus: MissionWaitRecord['status'],
    resolution?: Readonly<{ triggerId?: string }>,
  ): Promise<PersistenceResult<Mission>> {
    this.assertScope(scope);
    return this.transaction(async (state) => {
      const mission = state.missions.find((candidate) => candidate.metadata.missionId === event.spec.missionId);
      if (!mission) return { state, result: reject('NOT_FOUND', '$.event.spec.missionId', 'Mission does not exist', 'Create the Mission before appending lifecycle events') };
      if (!sameScope(mission.spec.scope, scope) || !sameScope(event.spec.scope, scope)) return { state, result: reject('SCOPE_MISMATCH', '$.event.spec.scope', 'Lifecycle event is outside the server-derived scope', 'Use the current Mission scope') };
      const wait = state.waits.find((candidate) => candidate.waitId === waitId);
      if (!wait || wait.missionId !== event.spec.missionId || !sameScope(wait.scope, scope)) return { state, result: reject('NOT_FOUND', '$.waitId', 'Mission wait does not exist in the current scope', 'Resolve an active wait owned by the Mission') };
      if (!['RELEASED', 'EXPIRED', 'CANCELLED'].includes(waitStatus)) return { state, result: reject('INVALID_STATE', '$.waitStatus', 'Resolved wait status must be terminal', 'Use RELEASED, EXPIRED or CANCELLED') };
      const ledger = freezeClone({ mission, events: state.lifecycleEvents.filter((candidate) => candidate.spec.missionId === mission.metadata.missionId) });
      const appended = appendMissionLifecycleEvent(ledger, event);
      if (appended.status !== 'APPENDED' && appended.status !== 'DUPLICATE_REPLAY') return { state, result: { status: 'REJECTED', diagnostics: appended.diagnostics.map(toPersistenceDiagnostic), value: undefined } };
      const projected = validateMission({ ...appended.ledger.mission, spec: { ...appended.ledger.mission.spec, activeWait: undefined } });
      if (!projected.valid || !projected.value) return { state, result: reject('INVALID_CONTRACT', '$.mission.spec.activeWait', 'Mission wait projection failed contract validation', 'Persist a valid Mission lifecycle projection') };
      const waits = state.waits.map((candidate) => candidate.waitId === waitId && candidate.status === 'ACTIVE'
        ? {
            ...candidate,
            status: waitStatus,
            updatedAt: event.spec.occurredAt,
            ...(resolution?.triggerId
              ? { payload: { ...(isRecord(candidate.payload) ? candidate.payload : {}), resolvedTriggerId: resolution.triggerId } }
              : {}),
          }
        : candidate);
      const missions = state.missions.map((candidate) => candidate.metadata.missionId === mission.metadata.missionId ? projected.value! : candidate);
      const lifecycleEvents = appended.status === 'APPENDED' ? [...state.lifecycleEvents, event] : state.lifecycleEvents;
      const next = freezeState({ ...state, missions, lifecycleEvents, waits });
      return { state: next, result: { status: appended.status === 'APPENDED' ? 'APPENDED' : 'DUPLICATE_REPLAY', diagnostics: [], value: projected.value } };
    });
  }

  async appendLifecycleEventAndCloseWaits(
    scope: MissionScope,
    event: MissionLifecycleEvent,
    waitStatus: MissionWaitRecord['status'],
  ): Promise<PersistenceResult<Mission>> {
    this.assertScope(scope);
    return this.transaction(async (state) => {
      const mission = state.missions.find((candidate) => candidate.metadata.missionId === event.spec.missionId);
      if (!mission) return { state, result: reject('NOT_FOUND', '$.event.spec.missionId', 'Mission does not exist', 'Create the Mission before appending lifecycle events') };
      if (!sameScope(mission.spec.scope, scope) || !sameScope(event.spec.scope, scope)) return { state, result: reject('SCOPE_MISMATCH', '$.event.spec.scope', 'Lifecycle event is outside the server-derived scope', 'Use the current Mission scope') };
      const ledger = freezeClone({ mission, events: state.lifecycleEvents.filter((candidate) => candidate.spec.missionId === mission.metadata.missionId) });
      const appended = appendMissionLifecycleEvent(ledger, event);
      if (appended.status === 'DUPLICATE_REPLAY') {
        const normalized = validateMission({ ...mission, spec: { ...mission.spec, activeWait: undefined } });
        if (!normalized.valid || !normalized.value) return { state, result: reject('INVALID_CONTRACT', '$.mission.spec.activeWait', 'Mission wait projection failed contract validation', 'Persist a valid Mission lifecycle projection') };
        const waits = state.waits.map((wait) => wait.missionId === event.spec.missionId && wait.status === 'ACTIVE' ? { ...wait, status: waitStatus, updatedAt: event.spec.occurredAt } : wait);
        const normalizedMission = normalized.value;
        const next = freezeState({ ...state, missions: state.missions.map((candidate) => candidate.metadata.missionId === mission.metadata.missionId ? normalizedMission : candidate), waits });
        return { state: next, result: { status: 'DUPLICATE_REPLAY', diagnostics: [], value: normalizedMission } };
      }
      if (appended.status !== 'APPENDED') return { state, result: { status: 'REJECTED', diagnostics: appended.diagnostics.map(toPersistenceDiagnostic), value: undefined } };
      const projected = validateMission({ ...appended.ledger.mission, spec: { ...appended.ledger.mission.spec, activeWait: undefined } });
      if (!projected.valid || !projected.value) return { state, result: reject('INVALID_CONTRACT', '$.mission.spec.activeWait', 'Mission wait projection failed contract validation', 'Persist a valid Mission lifecycle projection') };
      const waits = state.waits.map((wait) => wait.missionId === event.spec.missionId && wait.status === 'ACTIVE' ? { ...wait, status: waitStatus, updatedAt: event.spec.occurredAt } : wait);
      const next = freezeState({
        ...state,
        missions: state.missions.map((candidate) => candidate.metadata.missionId === mission.metadata.missionId ? projected.value! : candidate),
        lifecycleEvents: [...state.lifecycleEvents, event],
        waits,
      });
      return { state: next, result: { status: 'APPENDED', diagnostics: [], value: projected.value } };
    });
  }

  async putStep(scope: MissionScope, step: MissionStepRecord): Promise<PersistenceResult<MissionStepRecord>> {
    this.assertScope(scope);
    return this.putScopedRecord('steps', scope, step, step.stepId);
  }

  async putWait(scope: MissionScope, wait: MissionWaitRecord): Promise<PersistenceResult<MissionWaitRecord>> {
    this.assertScope(scope);
    if (wait.status === 'ACTIVE') {
      const mission = (await this.readMission(scope, wait.missionId)).value;
      if (!mission) return reject('NOT_FOUND', '$.wait.missionId', 'Mission wait references a Mission that does not exist in this scope', 'Persist the Mission before its active wait');
      if (!missionStateAllowsWait(mission.spec.state, wait.kind)) {
        return reject('INVALID_STATE', '$.wait.status', `Mission in state ${mission.spec.state} cannot create an active ${wait.kind} wait`, 'Advance the Mission through its governed lifecycle before creating the wait');
      }
    }
    return this.putScopedRecord('waits', scope, wait, wait.waitId);
  }

  async putWaitAndProjectActiveWait(
    scope: MissionScope,
    wait: MissionWaitRecord,
    activeWait: Mission['spec']['activeWait'],
  ): Promise<PersistenceResult<Mission>> {
    this.assertScope(scope);
    if (!sameScope(wait.scope, scope)) return reject('SCOPE_MISMATCH', '$.wait.scope', 'Record is outside the server-derived scope', 'Use the server-derived scope');
    return this.transaction(async (state) => {
      const index = state.missions.findIndex((mission) => mission.metadata.missionId === wait.missionId);
      if (index < 0) return { state, result: reject('NOT_FOUND', '$.wait.missionId', 'Mission does not exist', 'Create the Mission before its active wait') };
      const mission = state.missions[index]!;
      if (!sameScope(mission.spec.scope, scope)) return { state, result: reject('SCOPE_MISMATCH', '$.mission.spec.scope', 'Mission is outside the server-derived scope', 'Use the server-derived Mission scope') };
      if (wait.status !== 'ACTIVE' || !activeWait || activeWait.waitId !== wait.waitId || activeWait.kind !== wait.kind) return { state, result: reject('INVALID_STATE', '$.mission.spec.activeWait', 'Active wait projection must reference the active wait', 'Persist an active wait with matching identity') };
      if (mission.spec.activeWait && stableJson(mission.spec.activeWait) !== stableJson(activeWait)) return { state, result: reject('INVALID_STATE', '$.mission.spec.activeWait', 'Mission already has a different active wait', 'Resolve the current wait before creating another active wait') };
      if (!missionStateAllowsWait(mission.spec.state, wait.kind)) return { state, result: reject('INVALID_STATE', '$.wait.status', `Mission in state ${mission.spec.state} cannot create an active ${wait.kind} wait`, 'Advance the Mission through its governed lifecycle before creating the wait') };
      const existing = state.waits.find((candidate) => candidate.waitId === wait.waitId);
      if (existing) {
        if (stableJson(existing) !== stableJson(wait)) return { state, result: reject('IDEMPOTENCY_CONFLICT', '$.wait', 'Mission wait identity was already used for different content', 'Replay the original wait content') };
        if (mission.spec.activeWait && stableJson(mission.spec.activeWait) === stableJson(activeWait)) return { state, result: { status: 'DUPLICATE_REPLAY', diagnostics: [], value: mission } };
        return { state, result: reject('IDEMPOTENCY_CONFLICT', '$.mission.spec.activeWait', 'Mission active wait projection conflicts with the persisted wait', 'Replay the original active wait projection') };
      }
      const updated = validateMission({ ...mission, spec: { ...mission.spec, activeWait } });
      if (!updated.valid || !updated.value) return { state, result: reject('INVALID_CONTRACT', '$.mission.spec.activeWait', 'Mission active wait failed contract validation', 'Persist a valid active wait projection') };
      const next = freezeState({ ...state, missions: state.missions.map((candidate, candidateIndex) => candidateIndex === index ? updated.value! : candidate), waits: [...state.waits, wait] });
      return { state: next, result: { status: 'CREATED', diagnostics: [], value: updated.value } };
    });
  }

  async reactivateWaitAndProjectActiveWait(
    scope: MissionScope,
    waitId: string,
    activeWait: Mission['spec']['activeWait'],
    updatedAt: string,
  ): Promise<PersistenceResult<Mission>> {
    this.assertScope(scope);
    return this.transaction(async (state) => {
      const waitIndex = state.waits.findIndex((wait) => wait.waitId === waitId);
      if (waitIndex < 0) return { state, result: reject('NOT_FOUND', '$.waitId', 'Mission wait does not exist', 'Inspect the Mission before restoring its wait') };
      const currentWait = state.waits[waitIndex]!;
      if (!sameScope(currentWait.scope, scope)) return { state, result: reject('SCOPE_MISMATCH', '$.wait.scope', 'Mission wait is outside the server-derived scope', 'Use a wait from the current Mission scope') };
      const missionIndex = state.missions.findIndex((mission) => mission.metadata.missionId === currentWait.missionId);
      if (missionIndex < 0) return { state, result: reject('NOT_FOUND', '$.wait.missionId', 'Mission wait references a missing Mission', 'Inspect the Mission persistence state') };
      const mission = state.missions[missionIndex]!;
      if (!sameScope(mission.spec.scope, scope)) return { state, result: reject('SCOPE_MISMATCH', '$.mission.spec.scope', 'Mission is outside the server-derived scope', 'Use the server-derived Mission scope') };
      if (!activeWait || activeWait.waitId !== waitId || activeWait.kind !== currentWait.kind) return { state, result: reject('INVALID_STATE', '$.mission.spec.activeWait', 'Restored active wait must match the durable wait', 'Restore the original wait identity and kind') };
      if (currentWait.status === 'ACTIVE' && stableJson(mission.spec.activeWait) === stableJson(activeWait)) return { state, result: { status: 'DUPLICATE_REPLAY', diagnostics: [], value: mission } };
      if (!['CANCELLED', 'RELEASED'].includes(currentWait.status)) return { state, result: reject('INVALID_STATE', '$.wait.status', `Mission wait cannot transition from ${currentWait.status} to ACTIVE`, 'Restore only a released or cancelled wait during governed resume') };
      if (mission.spec.activeWait) return { state, result: reject('INVALID_STATE', '$.mission.spec.activeWait', 'Mission already has an active wait', 'Resolve the current wait before restoring another') };
      if (!missionStateAllowsWait(mission.spec.state, currentWait.kind)) return { state, result: reject('INVALID_STATE', '$.wait.status', `Mission in state ${mission.spec.state} cannot restore an active ${currentWait.kind} wait`, 'Advance the Mission through its governed lifecycle before restoring the wait') };
      const updated = validateMission({ ...mission, spec: { ...mission.spec, activeWait } });
      if (!updated.valid || !updated.value) return { state, result: reject('INVALID_CONTRACT', '$.mission.spec.activeWait', 'Restored Mission active wait failed contract validation', 'Persist a valid active wait projection') };
      const waits = [...state.waits];
      waits[waitIndex] = freezeClone({ ...currentWait, status: 'ACTIVE', updatedAt });
      const missions = [...state.missions];
      missions[missionIndex] = updated.value;
      return { state: freezeState({ ...state, missions, waits }), result: { status: 'UPDATED', diagnostics: [], value: updated.value } };
    });
  }

  async updateMissionActiveWait(
    scope: MissionScope,
    missionId: string,
    activeWait?: Mission['spec']['activeWait'],
  ): Promise<PersistenceResult<Mission>> {
    this.assertScope(scope);
    return this.transaction(async (state) => {
      const index = state.missions.findIndex((mission) => mission.metadata.missionId === missionId);
      if (index < 0) return { state, result: reject('NOT_FOUND', '$.missionId', 'Mission does not exist', 'Create the Mission before updating its active wait') };
      const current = state.missions[index]!;
      if (!sameScope(current.spec.scope, scope)) return { state, result: reject('SCOPE_MISMATCH', '$.mission.spec.scope', 'Mission is outside the server-derived scope', 'Use the current Mission scope') };
      if (stableJson(current.spec.activeWait) === stableJson(activeWait)) return { state, result: { status: 'DUPLICATE_REPLAY', diagnostics: [], value: current } };
      if (activeWait !== undefined) {
        const wait = state.waits.find((candidate) => candidate.waitId === activeWait.waitId);
        if (!wait || wait.missionId !== missionId || !sameScope(wait.scope, scope)) return { state, result: reject('NOT_FOUND', '$.mission.spec.activeWait.waitId', 'Mission active wait must reference a wait in the same scope and Mission', 'Persist the wait before projecting it as active') };
        if (wait.status !== 'ACTIVE' || wait.kind !== activeWait.kind) return { state, result: reject('INVALID_STATE', '$.mission.spec.activeWait', 'Mission active wait must reference an active wait of the same kind', 'Activate the matching wait before projecting it') };
        if (!missionStateAllowsWait(current.spec.state, activeWait.kind)) return { state, result: reject('INVALID_STATE', '$.mission.spec.activeWait', `Mission in state ${current.spec.state} cannot acquire an active ${activeWait.kind} wait`, 'Advance the Mission through its governed lifecycle before projecting a wait') };
      }
      const updated = validateMission({ ...current, spec: { ...current.spec, ...(activeWait === undefined ? { activeWait: undefined } : { activeWait }) } });
      if (!updated.valid || !updated.value) return { state, result: reject('INVALID_CONTRACT', '$.mission.spec.activeWait', 'Mission active wait failed contract validation', 'Persist a valid active wait projection') };
      const missions = [...state.missions];
      missions[index] = updated.value;
      const next = freezeState({ ...state, missions });
      return { state: next, result: { status: 'UPDATED', diagnostics: [], value: updated.value } };
    });
  }

  async updateWaitStatus(
    scope: MissionScope,
    waitId: string,
    status: MissionWaitRecord['status'],
    updatedAt: string,
  ): Promise<PersistenceResult<MissionWaitRecord>> {
    this.assertScope(scope);
    return this.transaction(async (state) => {
      const index = state.waits.findIndex((wait) => wait.waitId === waitId);
      if (index < 0) return { state, result: reject('NOT_FOUND', '$.waitId', 'Mission wait does not exist', 'Inspect the Mission and retry with an active wait ID') };
      const current = state.waits[index]!;
      if (!sameScope(current.scope, scope)) return { state, result: reject('SCOPE_MISMATCH', '$.wait.scope', 'Mission wait is outside the server-derived scope', 'Use a wait from the current Mission scope') };
      if (current.status === status) return { state, result: { status: 'DUPLICATE_REPLAY', diagnostics: [], value: current } };
      const mission = state.missions.find((candidate) => candidate.metadata.missionId === current.missionId);
      if (!mission || !sameScope(mission.spec.scope, scope)) return { state, result: reject('NOT_FOUND', '$.wait.missionId', 'Mission wait references a Mission outside the server-derived scope', 'Use a wait owned by the current Mission scope') };
      const allowed = current.status === 'ACTIVE'
        ? ['RELEASED', 'EXPIRED', 'CANCELLED']
        : current.status === 'CANCELLED' && missionStateAllowsWait(mission.spec.state, current.kind)
          ? ['ACTIVE']
          : [];
      if (!allowed.includes(status)) return { state, result: reject('INVALID_STATE', '$.wait.status', `Mission wait cannot transition from ${current.status} to ${status}`, 'Use the coordinator lifecycle controls for wait transitions') };
      const updated = freezeClone({ ...current, status, updatedAt });
      const waits = [...state.waits];
      waits[index] = updated;
      return { state: freezeState({ ...state, waits }), result: { status: 'UPDATED', diagnostics: [], value: updated } };
    });
  }

  async putDecision(scope: MissionScope, decision: Decision): Promise<PersistenceResult<Decision>> {
    this.assertScope(scope);
    const validation = validateDecision(decision);
    if (!validation.valid || !validation.value) return reject('INVALID_CONTRACT', '$.decision', 'Decision failed contract validation', 'Persist a validated Decision');
    if (!sameScope(validation.value.spec.scope, withMission(scope, validation.value.spec.scope.missionId))) return reject('SCOPE_MISMATCH', '$.decision.spec.scope', 'Decision is outside the server-derived scope', 'Use the server-derived Decision scope');
    return this.putContract('decisions', scope, validation.value, validation.value.metadata.id);
  }

  async putAction(scope: MissionScope, action: Action, decision?: Decision): Promise<PersistenceResult<Action>> {
    this.assertScope(scope);
    const validation = validateAction(action, decision);
    if (!validation.valid || !validation.value) return reject('INVALID_CONTRACT', '$.action', 'Action failed contract or authorization validation', 'Persist an Action with its matching Decision');
    if (!sameScope(validation.value.spec.scope, withMission(scope, validation.value.spec.scope.missionId))) return reject('SCOPE_MISMATCH', '$.action.spec.scope', 'Action is outside the server-derived scope', 'Use the server-derived Action scope');
    return this.putContract('actions', scope, validation.value, validation.value.metadata.id);
  }

  async putReceipt(scope: MissionScope, receipt: Receipt): Promise<PersistenceResult<Receipt>> {
    this.assertScope(scope);
    const validation = validateReceipt(receipt);
    if (!validation.valid || !validation.value) return reject('INVALID_CONTRACT', '$.receipt', 'Receipt failed contract validation', 'Persist a validated Receipt');
    if (!sameScope(validation.value.spec.scope, withMission(scope, validation.value.spec.missionId))) return reject('SCOPE_MISMATCH', '$.receipt.spec.scope', 'Receipt is outside the server-derived scope', 'Use the server-derived Receipt scope');
    return this.putContract('receipts', scope, validation.value, validation.value.metadata.id);
  }

  async linkReceipt(scope: MissionScope, link: MissionReceiptLink): Promise<PersistenceResult<MissionReceiptLink>> {
    this.assertScope(scope);
    return this.putScopedRecord('receiptLinks', scope, link, link.linkId);
  }

  async putTrigger(scope: MissionScope, trigger: MissionTriggerRecord): Promise<PersistenceResult<MissionTriggerRecord>> {
    this.assertScope(scope);
    if (!sameScope(trigger.scope, scope)) return reject('SCOPE_MISMATCH', '$.trigger.scope', 'Trigger is outside the server-derived scope', 'Use the server-derived trigger scope');
    if (!trigger.triggerId || !trigger.type || !trigger.occurredAt || !trigger.payloadDigest || !trigger.createdAt || !trigger.updatedAt) return reject('INVALID_CONTRACT', '$.trigger', 'Trigger record is incomplete', 'Persist a complete durable trigger record');
    if (hasIncompleteTriggerEventRoute(trigger)) return reject('INVALID_CONTRACT', '$.trigger', 'Trigger event routing requires missionId, eventType and eventKey', 'Persist the complete governed business-event identity and its owning Mission');
    return this.transaction(async (state) => {
      const existing = state.triggers.find((candidate) => candidate.triggerId === trigger.triggerId && sameScope(candidate.scope, scope));
      if (existing) {
        const sameIdentity = existing.triggerId === trigger.triggerId && sameScope(existing.scope, trigger.scope) && existing.type === trigger.type && existing.occurredAt === trigger.occurredAt && existing.payloadDigest === trigger.payloadDigest && existing.missionId === trigger.missionId && existing.eventType === trigger.eventType && existing.eventKey === trigger.eventKey;
        if (sameIdentity) return { state, result: { status: 'DUPLICATE_REPLAY', diagnostics: [], value: existing } };
        return { state, result: reject('IDEMPOTENCY_CONFLICT', '$.trigger.triggerId', 'Trigger identity was already used for different content', 'Replay the original trigger payload or use a new trigger ID') };
      }
      const next = freezeState({ ...state, triggers: [...state.triggers, trigger] });
      return { state: next, result: { status: 'CREATED', diagnostics: [], value: trigger } };
    });
  }

  async updateTrigger(scope: MissionScope, triggerId: string, update: Readonly<Pick<MissionTriggerRecord, 'status' | 'updatedAt'> & Partial<Pick<MissionTriggerRecord, 'missionId' | 'result'>>>): Promise<PersistenceResult<MissionTriggerRecord>> {
    this.assertScope(scope);
    return this.transaction(async (state) => {
      const index = state.triggers.findIndex((candidate) => candidate.triggerId === triggerId && sameScope(candidate.scope, scope));
      if (index < 0) return { state, result: reject('NOT_FOUND', '$.triggerId', 'Trigger does not exist', 'Persist the trigger before updating it') };
      const current = state.triggers[index]!;
      if (!sameScope(current.scope, scope)) return { state, result: reject('SCOPE_MISMATCH', '$.trigger.scope', 'Trigger is outside the server-derived scope', 'Use a trigger from the current scope') };
      const nextTrigger = freezeClone({ ...current, ...update });
      if (Object.prototype.hasOwnProperty.call(update, 'missionId') && update.missionId !== current.missionId) return { state, result: reject('IDEMPOTENCY_CONFLICT', '$.trigger.missionId', 'Trigger route identity cannot be changed after persistence', 'Replay the original Mission route or create a new trigger ID') };
      if (hasIncompleteTriggerEventRoute(nextTrigger)) return { state, result: reject('INVALID_CONTRACT', '$.trigger', 'Trigger event routing requires missionId, eventType and eventKey', 'Persist the complete governed business-event identity and its owning Mission') };
      if (stableJson(nextTrigger) === stableJson(current)) return { state, result: { status: 'DUPLICATE_REPLAY', diagnostics: [], value: current } };
      const triggers = [...state.triggers];
      triggers[index] = nextTrigger;
      return { state: freezeState({ ...state, triggers }), result: { status: 'UPDATED', diagnostics: [], value: nextTrigger } };
    });
  }

  private async putContract<K extends 'decisions' | 'actions' | 'receipts', T extends Decision | Action | Receipt>(key: K, scope: MissionScope, value: T, id: string): Promise<PersistenceResult<T>> {
    return this.transaction(async (state) => {
      const records = state[key] as readonly T[];
      const missionId = value.spec.scope.missionId;
      if (!state.missions.some((mission) => mission.metadata.missionId === missionId && sameScope(mission.spec.scope, scope))) return { state, result: reject('NOT_FOUND', `$.${key}`, 'Record references a Mission that does not exist in this scope', 'Persist the Mission before its governed records') };
      const existing = records.find((candidate) => candidate.metadata.id === id);
      if (existing) {
        if (stableJson(existing) === stableJson(value)) return { state, result: { status: 'DUPLICATE_REPLAY', diagnostics: [], value: existing } };
        return { state, result: reject('IDEMPOTENCY_CONFLICT', `$.${key}`, `${key} identity was already used for different content`, 'Replay the original content or use a new identity') };
      }
      const next = freezeState({ ...state, [key]: [...records, value] } as MissionPersistenceState);
      return { state: next, result: { status: 'CREATED', diagnostics: [], value } };
    });
  }

  private async putScopedRecord<K extends 'steps' | 'waits' | 'receiptLinks', T extends MissionStepRecord | MissionWaitRecord | MissionReceiptLink>(key: K, scope: MissionScope, value: T, id: string): Promise<PersistenceResult<T>> {
    if (!sameScope(value.scope, scope)) return reject('SCOPE_MISMATCH', `$.${key}.scope`, 'Record is outside the server-derived scope', 'Use the server-derived scope');
    return this.transaction(async (state) => {
      if (!state.missions.some((mission) => mission.metadata.missionId === value.missionId && sameScope(mission.spec.scope, scope))) return { state, result: reject('NOT_FOUND', `$.${key}`, 'Record references a Mission that does not exist in this scope', 'Persist the Mission before its dependent record') };
      const records = state[key] as readonly T[];
      const existing = records.find((candidate) => ('stepId' in candidate ? candidate.stepId : 'waitId' in candidate ? candidate.waitId : candidate.linkId) === id);
      if (existing) {
        if (stableJson(existing) === stableJson(value)) return { state, result: { status: 'DUPLICATE_REPLAY', diagnostics: [], value: existing } };
        return { state, result: reject('IDEMPOTENCY_CONFLICT', `$.${key}`, `${key} identity was already used for different content`, 'Replay the original content or use a new identity') };
      }
      const next = freezeState({ ...state, [key]: [...records, value] } as MissionPersistenceState);
      return { state: next, result: { status: 'CREATED', diagnostics: [], value } };
    });
  }

  private async transaction<T>(operation: (state: MissionPersistenceState) => Promise<{ state: MissionPersistenceState; result: T }>): Promise<T> {
    const previous = this.transactionTail;
    let release!: () => void;
    this.transactionTail = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try {
      await acquireWithRetry(this.lock);
      try {
        const current = await this.load();
        const outcome = await operation(current);
        if (stableJson(current) !== stableJson(outcome.state)) {
          let commit = async (): Promise<void> => {
            await this.save(outcome.state);
          };
          for (const guard of [...this.commitGuards].reverse()) {
            const next = commit;
            commit = () => guard(next);
          }
          await commit();
        }
        return outcome.result;
      } finally {
        await this.lock.release();
      }
    } finally {
      release();
    }
  }

  private async load(): Promise<MissionPersistenceState> {
    const raw = await readUtf8Safe(this.filePath);
    if (raw === null) return EMPTY_STATE;
    try {
      const parsed = JSON.parse(raw) as unknown;
      return validateState(parsed);
    } catch (error) {
      if (error instanceof AtlasCliError) throw error;
      throw new AtlasCliError('LOCAL_STATE_ERROR', `Invalid Atlas Mission persistence state: ${String(error)}`);
    }
  }

  private async save(state: MissionPersistenceState): Promise<void> {
    await ensurePrivateDirectory(path.dirname(this.filePath));
    await atomicWrite(this.filePath, `${JSON.stringify(state, null, 2)}\n`);
  }

  private assertScope(scope: MissionScope): void {
    if (!sameScope(scope, this.serverScope)) throw new AtlasCliError('AUTHORIZATION_FAILED', 'Mission persistence scope does not match the server-derived scope');
  }
}

export function createMissionStore(root: string, serverScope: MissionScope): MissionStore {
  return new MissionStore(root, serverScope);
}

function filterStateToScope(state: MissionPersistenceState, scope: MissionScope): MissionPersistenceState {
  const missions = state.missions.filter((mission) => sameScope(mission.spec.scope, scope));
  const missionIds = new Set(missions.map((mission) => mission.metadata.missionId));
  const lifecycleEvents = state.lifecycleEvents.filter((event) => missionIds.has(event.spec.missionId) && sameScope(event.spec.scope, scope));
  const steps = state.steps.filter((step) => missionIds.has(step.missionId) && sameScope(step.scope, scope));
  const waits = state.waits.filter((wait) => missionIds.has(wait.missionId) && sameScope(wait.scope, scope));
  const decisions = state.decisions.filter((decision) => missionIds.has(decision.spec.scope.missionId) && sameScope(decision.spec.scope, withMission(scope, decision.spec.scope.missionId)));
  const actions = state.actions.filter((action) => missionIds.has(action.spec.scope.missionId) && sameScope(action.spec.scope, withMission(scope, action.spec.scope.missionId)));
  const receipts = state.receipts.filter((receipt) => missionIds.has(receipt.spec.scope.missionId) && sameScope(receipt.spec.scope, withMission(scope, receipt.spec.scope.missionId)));
  const receiptLinks = state.receiptLinks.filter((link) => missionIds.has(link.missionId) && sameScope(link.scope, scope));
  const triggers = state.triggers.filter((trigger) => sameScope(trigger.scope, scope));
  return freezeState({ ...state, missions, lifecycleEvents, steps, waits, decisions, actions, receipts, receiptLinks, triggers });
}

function validateState(value: unknown): MissionPersistenceState {
  if (!isRecord(value) || value.schemaVersion !== MISSION_PERSISTENCE_SCHEMA || value.migrationVersion !== MISSION_PERSISTENCE_MIGRATION_VERSION) throw new AtlasCliError('LOCAL_STATE_ERROR', 'Unsupported Atlas Mission persistence state version');
  const normalized: Record<string, any> = { ...(value as Record<string, any>), triggers: (value as Record<string, any>).triggers ?? [] };
  const keys = ['missions', 'lifecycleEvents', 'steps', 'waits', 'decisions', 'actions', 'receipts', 'receiptLinks', 'triggers'] as const;
  if (keys.some((key) => !Array.isArray(normalized[key]))) throw new AtlasCliError('LOCAL_STATE_ERROR', 'Atlas Mission persistence state has invalid collections');
  for (const mission of normalized.missions) if (!validateMission(mission).valid) throw new AtlasCliError('LOCAL_STATE_ERROR', 'Atlas Mission persistence state contains an invalid Mission');
  for (const event of normalized.lifecycleEvents) if (!validateMissionLifecycleEvent(event).valid) throw new AtlasCliError('LOCAL_STATE_ERROR', 'Atlas Mission persistence state contains an invalid lifecycle event');
  for (const decision of normalized.decisions) if (!validateDecision(decision).valid) throw new AtlasCliError('LOCAL_STATE_ERROR', 'Atlas Mission persistence state contains an invalid Decision');
  for (const action of normalized.actions as readonly Action[]) {
    const decision = (normalized.decisions as readonly Decision[]).find((candidate) => candidate.metadata.id === action.spec.decisionId);
    if (!validateAction(action, decision).valid) throw new AtlasCliError('LOCAL_STATE_ERROR', 'Atlas Mission persistence state contains an invalid Action');
  }
  for (const receipt of normalized.receipts) if (!validateReceipt(receipt).valid) throw new AtlasCliError('LOCAL_STATE_ERROR', 'Atlas Mission persistence state contains an invalid Receipt');
  for (const trigger of normalized.triggers) {
    if (!isRecord(trigger) || typeof trigger.triggerId !== 'string' || typeof trigger.type !== 'string' || !isRecord(trigger.scope) || typeof trigger.occurredAt !== 'string' || typeof trigger.payloadDigest !== 'string' || !['RECEIVED', 'APPLIED', 'REJECTED'].includes(String(trigger.status)) || (trigger.missionId !== undefined && typeof trigger.missionId !== 'string') || (trigger.eventType !== undefined && typeof trigger.eventType !== 'string') || (trigger.eventKey !== undefined && typeof trigger.eventKey !== 'string') || typeof trigger.createdAt !== 'string' || typeof trigger.updatedAt !== 'string') throw new AtlasCliError('LOCAL_STATE_ERROR', 'Atlas Mission persistence state contains an invalid trigger');
    if (hasIncompleteTriggerEventRoute(trigger)) throw new AtlasCliError('LOCAL_STATE_ERROR', 'Atlas Mission persistence state contains an incomplete trigger event route');
  }
  return freezeState(normalized as MissionPersistenceState);
}

function freezeState(value: MissionPersistenceState): MissionPersistenceState { return freezeClone(value); }
function freezeClone<T>(value: T): T { return deepFreeze(JSON.parse(JSON.stringify(value)) as T); }
function stableJson(value: unknown): string { if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`; if (isRecord(value)) return `{${Object.entries(value).filter(([, nested]) => nested !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([key, nested]) => `${JSON.stringify(key)}:${stableJson(nested)}`).join(',')}}`; return JSON.stringify(value); }
function sameScope(left: MissionScope, right: MissionScope): boolean { return left.tenantId === right.tenantId && left.organisationId === right.organisationId && left.projectId === right.projectId && left.environmentId === right.environmentId; }
function missionStateAllowsWait(state: Mission['spec']['state'], kind: MissionWaitRecord['kind']): boolean {
  if (['CREATED', 'READY', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED'].includes(state)) return false;
  if (kind === 'approval') return state === 'ACTIVE' || state === 'WAITING_APPROVAL';
  if (kind === 'schedule') return state === 'ACTIVE' || state === 'WAITING_SCHEDULE';
  if (kind === 'handoff') return state === 'ACTIVE' || state === 'WAITING_APPROVAL' || state === 'WAITING_EVENT' || state === 'HANDED_OFF';
  return state === 'ACTIVE' || state === 'WAITING_EVENT';
}
function withMission(scope: MissionScope, missionId: string): MissionScope & { missionId: string } { return { ...scope, missionId }; }
function isRecord(value: unknown): value is Record<string, any> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function ok<T>(status: PersistenceStatus, value: T): PersistenceResult<T> { return { status, diagnostics: [], value }; }
function reject<T = undefined>(code: PersistenceDiagnosticCode, pathName: string, message: string, next_action: string): PersistenceResult<T> { return { status: 'REJECTED', diagnostics: [{ code, path: pathName, message, next_action }] }; }
function toPersistenceDiagnostic(diagnostic: { code: string; path: string; message: string; next_action: string }): PersistenceDiagnostic { const code = ['SCOPE_MISMATCH', 'IDEMPOTENCY_CONFLICT', 'NOT_FOUND', 'UNSUPPORTED_VERSION'].includes(diagnostic.code) ? diagnostic.code as PersistenceDiagnosticCode : 'INVALID_CONTRACT'; return { code, path: diagnostic.path, message: diagnostic.message, next_action: diagnostic.next_action }; }
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
function deepFreeze<T>(value: T): T { if (value && typeof value === 'object') { Object.freeze(value); for (const nested of Object.values(value as Record<string, unknown>)) deepFreeze(nested); } return value; }
