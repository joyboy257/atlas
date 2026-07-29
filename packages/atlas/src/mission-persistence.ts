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
});

export class MissionStore {
  readonly filePath: string;
  readonly migrationPath: string;
  private readonly lock: OperationLock;
  private readonly serverScope: MissionScope;

  constructor(root: string, serverScope: MissionScope) {
    this.filePath = path.resolve(root, MISSION_PERSISTENCE_FILE);
    this.migrationPath = path.resolve(root, MISSION_PERSISTENCE_MIGRATION_FILE);
    this.lock = new OperationLock(path.resolve(root, '.atlas', 'mission-store.lock'));
    this.serverScope = freezeClone(serverScope);
  }

  async migrate(): Promise<MissionPersistenceState> {
    await this.lock.acquire();
    try {
      const state = await this.load();
      await this.save(state);
      return state;
    } finally {
      await this.lock.release();
    }
  }

  async readState(): Promise<MissionPersistenceState> {
    return this.load();
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

  async putStep(scope: MissionScope, step: MissionStepRecord): Promise<PersistenceResult<MissionStepRecord>> {
    this.assertScope(scope);
    return this.putScopedRecord('steps', scope, step, step.stepId);
  }

  async putWait(scope: MissionScope, wait: MissionWaitRecord): Promise<PersistenceResult<MissionWaitRecord>> {
    this.assertScope(scope);
    return this.putScopedRecord('waits', scope, wait, wait.waitId);
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
    await acquireWithRetry(this.lock);
    try {
      const current = await this.load();
      const outcome = await operation(current);
      if (stableJson(current) !== stableJson(outcome.state)) await this.save(outcome.state);
      return outcome.result;
    } finally {
      await this.lock.release();
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

function validateState(value: unknown): MissionPersistenceState {
  if (!isRecord(value) || value.schemaVersion !== MISSION_PERSISTENCE_SCHEMA || value.migrationVersion !== MISSION_PERSISTENCE_MIGRATION_VERSION) throw new AtlasCliError('LOCAL_STATE_ERROR', 'Unsupported Atlas Mission persistence state version');
  const keys = ['missions', 'lifecycleEvents', 'steps', 'waits', 'decisions', 'actions', 'receipts', 'receiptLinks'] as const;
  if (keys.some((key) => !Array.isArray(value[key]))) throw new AtlasCliError('LOCAL_STATE_ERROR', 'Atlas Mission persistence state has invalid collections');
  for (const mission of value.missions) if (!validateMission(mission).valid) throw new AtlasCliError('LOCAL_STATE_ERROR', 'Atlas Mission persistence state contains an invalid Mission');
  for (const event of value.lifecycleEvents) if (!validateMissionLifecycleEvent(event).valid) throw new AtlasCliError('LOCAL_STATE_ERROR', 'Atlas Mission persistence state contains an invalid lifecycle event');
  for (const decision of value.decisions) if (!validateDecision(decision).valid) throw new AtlasCliError('LOCAL_STATE_ERROR', 'Atlas Mission persistence state contains an invalid Decision');
  for (const action of value.actions as readonly Action[]) {
    const decision = (value.decisions as readonly Decision[]).find((candidate) => candidate.metadata.id === action.spec.decisionId);
    if (!validateAction(action, decision).valid) throw new AtlasCliError('LOCAL_STATE_ERROR', 'Atlas Mission persistence state contains an invalid Action');
  }
  for (const receipt of value.receipts) if (!validateReceipt(receipt).valid) throw new AtlasCliError('LOCAL_STATE_ERROR', 'Atlas Mission persistence state contains an invalid Receipt');
  return freezeState(value as MissionPersistenceState);
}

function freezeState(value: MissionPersistenceState): MissionPersistenceState { return freezeClone(value); }
function freezeClone<T>(value: T): T { return deepFreeze(JSON.parse(JSON.stringify(value)) as T); }
function stableJson(value: unknown): string { if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`; if (isRecord(value)) return `{${Object.entries(value).filter(([, nested]) => nested !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([key, nested]) => `${JSON.stringify(key)}:${stableJson(nested)}`).join(',')}}`; return JSON.stringify(value); }
function sameScope(left: MissionScope, right: MissionScope): boolean { return left.tenantId === right.tenantId && left.organisationId === right.organisationId && left.projectId === right.projectId && left.environmentId === right.environmentId; }
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
