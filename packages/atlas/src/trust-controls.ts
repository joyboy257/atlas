import path from 'node:path';
import { atomicWrite, ensurePrivateDirectory, readUtf8Safe, sha256 } from './fs-safety.js';
import { OperationLock } from './operation-journal.js';

export const ATLAS_AUDIT_SCHEMA = 'atlas.audit-ledger/v1' as const;
export const ATLAS_AUDIT_FILE = '.atlas/audit-ledger.json' as const;
export type AtlasDataClass = 'public' | 'business' | 'message' | 'knowledge' | 'credential' | 'audit' | 'billing' | 'telemetry' | 'evidence';
export type AtlasAuditScope = Readonly<{ tenantId: string; organisationId: string; projectId: string; environmentId: string }>;
export type AtlasAuditEvent = Readonly<{
  schemaVersion: typeof ATLAS_AUDIT_SCHEMA;
  eventId: string;
  scope: AtlasAuditScope;
  actor: Readonly<{ type: 'system' | 'human' | 'machine' | 'agent'; id: string }>;
  action: string;
  target: Readonly<{ type: string; id: string }>;
  policyVersion: string;
  dataClass: AtlasDataClass;
  beforeDigest?: string;
  afterDigest?: string;
  correlationId: string;
  occurredAt: string;
  previousDigest: string | null;
  digest: string;
}>;
export type AtlasAuditLedgerState = Readonly<{ schemaVersion: typeof ATLAS_AUDIT_SCHEMA; events: readonly AtlasAuditEvent[] }>;
export type AtlasAuditExport = Readonly<{ schemaVersion: typeof ATLAS_AUDIT_SCHEMA; scope: AtlasAuditScope; events: readonly AtlasAuditEvent[]; chainValid: boolean; exportedAt: string }>;

export class AtlasTrustControlError extends Error {
  readonly code: 'INVALID_EVENT' | 'IDEMPOTENCY_CONFLICT' | 'SCOPE_MISMATCH' | 'INVALID_STATE';
  constructor(code: AtlasTrustControlError['code'], message: string) { super(message); this.name = 'AtlasTrustControlError'; this.code = code; }
}

const EMPTY_STATE: AtlasAuditLedgerState = Object.freeze({ schemaVersion: ATLAS_AUDIT_SCHEMA, events: Object.freeze([]) });
const SECRET_KEY = /(?:secret|token|password|credential|api[_-]?key|authorization|private[_-]?key)/i;

export class LocalAuditLedger {
  readonly filePath: string;
  private readonly lock: OperationLock;
  private transactionTail: Promise<void> = Promise.resolve();
  private constructor(root: string) { this.filePath = path.resolve(root, ATLAS_AUDIT_FILE); this.lock = new OperationLock(root, { filePath: path.resolve(root, '.atlas', 'audit-ledger.lock') }); }
  static async open(root: string): Promise<LocalAuditLedger> { const ledger = new LocalAuditLedger(root); await ledger.transaction(async (state) => ({ state, value: undefined })); return ledger; }
  async readState(): Promise<AtlasAuditLedgerState> { return this.load(); }
  async append(input: Omit<AtlasAuditEvent, 'schemaVersion' | 'previousDigest' | 'digest'>): Promise<Readonly<{ event: AtlasAuditEvent; replayed: boolean }>> {
    const base = redactSecrets(input) as Omit<AtlasAuditEvent, 'schemaVersion' | 'previousDigest' | 'digest'>;
    if (base.beforeDigest !== undefined && typeof base.beforeDigest !== 'string') throw new AtlasTrustControlError('INVALID_EVENT', 'beforeDigest must be a string digest');
    if (base.afterDigest !== undefined && typeof base.afterDigest !== 'string') throw new AtlasTrustControlError('INVALID_EVENT', 'afterDigest must be a string digest');
    validateEvent({ ...base, schemaVersion: ATLAS_AUDIT_SCHEMA, previousDigest: null, digest: 'pending' });
    return this.transaction(async (state) => {
      const existing = state.events.find((candidate) => candidate.eventId === base.eventId);
      if (existing) { if (stableJson(auditPayload(existing)) !== stableJson(base)) throw new AtlasTrustControlError('IDEMPOTENCY_CONFLICT', `Audit event ${base.eventId} was reused with different content`); return { state, value: { event: existing, replayed: true as boolean } }; }
      const previousDigest = [...state.events].reverse().find((candidate) => sameScope(candidate.scope, base.scope))?.digest ?? null;
      const unsigned = { ...base, schemaVersion: ATLAS_AUDIT_SCHEMA, previousDigest, digest: '' };
      const event = freezeClone({ ...unsigned, digest: sha256(stableJson(unsigned, true)) });
      return { state: freezeState({ schemaVersion: ATLAS_AUDIT_SCHEMA, events: [...state.events, event] }), value: { event, replayed: false as boolean } };
    });
  }
  async export(scope: AtlasAuditScope, exportedAt = new Date().toISOString()): Promise<AtlasAuditExport> {
    validateScope(scope);
    const allEvents = (await this.load()).events;
    const events = allEvents.filter((event) => sameScope(event.scope, scope));
    let previous: string | null = null;
    let chainValid = true;
    for (const event of events) {
      const unsigned = { ...event, digest: '' };
      chainValid = chainValid && event.previousDigest === previous && event.digest === sha256(stableJson(unsigned, true));
      previous = event.digest;
    }
    return freezeClone({ schemaVersion: ATLAS_AUDIT_SCHEMA, scope, events, chainValid, exportedAt });
  }
  private async transaction<T>(operation: (state: AtlasAuditLedgerState) => Promise<{ state: AtlasAuditLedgerState; value: T }>): Promise<T> {
    const previous = this.transactionTail; let release!: () => void; this.transactionTail = new Promise<void>((resolve) => { release = resolve; }); await previous;
    try { await this.lock.acquire(); try { const state = await this.load(); const outcome = await operation(state); if (stableJson(state, true) !== stableJson(outcome.state, true)) await this.save(outcome.state); return outcome.value; } finally { await this.lock.release(); } } finally { release(); }
  }
  private async load(): Promise<AtlasAuditLedgerState> { const raw = await readUtf8Safe(this.filePath); if (raw === null) return EMPTY_STATE; try { return validateState(JSON.parse(raw)); } catch (error) { if (error instanceof AtlasTrustControlError) throw error; throw new AtlasTrustControlError('INVALID_STATE', `Invalid audit ledger state: ${String(error)}`); } }
  private async save(state: AtlasAuditLedgerState): Promise<void> { await ensurePrivateDirectory(path.dirname(this.filePath)); await atomicWrite(this.filePath, `${JSON.stringify(state, null, 2)}\n`); }
}

export function classifyData(value: unknown): AtlasDataClass { if (isRecord(value)) { const raw = String(value.dataClass ?? value.classification ?? 'business'); if (['public', 'business', 'message', 'knowledge', 'credential', 'audit', 'billing', 'telemetry', 'evidence'].includes(raw)) return raw as AtlasDataClass; } return 'business'; }
export function redactSecrets<T>(value: T): T { if (Array.isArray(value)) return value.map((item) => redactSecrets(item)) as T; if (isRecord(value)) { const result: Record<string, unknown> = {}; for (const [key, item] of Object.entries(value)) result[key] = SECRET_KEY.test(key) ? '[REDACTED]' : redactSecrets(item); return result as T; } return value; }
function validateEvent(event: AtlasAuditEvent): void { if (event.schemaVersion !== ATLAS_AUDIT_SCHEMA || !nonEmpty(event.eventId) || !isScope(event.scope) || !['system', 'human', 'machine', 'agent'].includes(event.actor.type) || !nonEmpty(event.actor.id) || !nonEmpty(event.action) || !nonEmpty(event.target.type) || !nonEmpty(event.target.id) || !nonEmpty(event.policyVersion) || !['public', 'business', 'message', 'knowledge', 'credential', 'audit', 'billing', 'telemetry', 'evidence'].includes(event.dataClass) || !nonEmpty(event.correlationId) || !validTimestamp(event.occurredAt) || (event.beforeDigest !== undefined && typeof event.beforeDigest !== 'string') || (event.afterDigest !== undefined && typeof event.afterDigest !== 'string') || (event.previousDigest !== null && !nonEmpty(event.previousDigest)) || !nonEmpty(event.digest)) throw new AtlasTrustControlError('INVALID_EVENT', 'Audit event is incomplete or invalid'); }
function validateState(value: unknown): AtlasAuditLedgerState { if (!isRecord(value) || value.schemaVersion !== ATLAS_AUDIT_SCHEMA || !Array.isArray(value.events)) throw new AtlasTrustControlError('INVALID_STATE', 'Audit ledger schema is invalid'); for (const event of value.events) validateEvent(event as AtlasAuditEvent); if (new Set(value.events.map((event) => event.eventId)).size !== value.events.length) throw new AtlasTrustControlError('INVALID_STATE', 'Audit ledger contains duplicate event identity'); return freezeState({ schemaVersion: ATLAS_AUDIT_SCHEMA, events: value.events as AtlasAuditEvent[] }); }
function auditPayload(event: AtlasAuditEvent): Omit<AtlasAuditEvent, 'schemaVersion' | 'previousDigest' | 'digest'> { const { schemaVersion: _schemaVersion, previousDigest: _previousDigest, digest: _digest, ...payload } = event; return payload; }
function validateScope(scope: AtlasAuditScope): void { if (!isScope(scope)) throw new AtlasTrustControlError('SCOPE_MISMATCH', 'Audit scope is incomplete'); }
function isScope(value: unknown): value is AtlasAuditScope { return isRecord(value) && ['tenantId', 'organisationId', 'projectId', 'environmentId'].every((key) => nonEmpty(value[key])); }
function sameScope(a: AtlasAuditScope, b: AtlasAuditScope): boolean { return a.tenantId === b.tenantId && a.organisationId === b.organisationId && a.projectId === b.projectId && a.environmentId === b.environmentId; }
function nonEmpty(value: unknown): value is string { return typeof value === 'string' && value.trim().length > 0; }
function validTimestamp(value: unknown): value is string { return typeof value === 'string' && Number.isFinite(Date.parse(value)); }
function isRecord(value: unknown): value is Record<string, any> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function freezeState(value: AtlasAuditLedgerState): AtlasAuditLedgerState { return freezeClone(value); }
function freezeClone<T>(value: T): T { return deepFreeze(JSON.parse(JSON.stringify(value)) as T); }
function deepFreeze<T>(value: T): T { if (value && typeof value === 'object') { Object.freeze(value); for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child); } return value; }
function stableJson(value: unknown, omitDigest = false): string { if (Array.isArray(value)) return `[${value.map((item) => stableJson(item, omitDigest)).join(',')}]`; if (isRecord(value)) return `{${Object.entries(value).filter(([key, item]) => item !== undefined && !(omitDigest && key === 'digest')).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item, omitDigest)}`).join(',')}}`; return JSON.stringify(value); }
