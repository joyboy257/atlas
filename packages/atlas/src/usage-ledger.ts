import path from 'node:path';
import { atomicWrite, ensurePrivateDirectory, readUtf8Safe, sha256 } from './fs-safety.js';
import { OperationLock } from './operation-journal.js';

export const ATLAS_USAGE_LEDGER_SCHEMA = 'atlas.usage-ledger/v1' as const;
export const ATLAS_USAGE_LEDGER_FILE = '.atlas/usage-ledger.json' as const;

export type AtlasUsageKind = 'model' | 'runtime' | 'tool' | 'provider' | 'media' | 'storage' | 'observability';
export type AtlasUsageAttribution = Readonly<{
  tenantId: string;
  organisationId: string;
  projectId: string;
  environmentId: string;
  agentVersionId?: string;
  missionId?: string;
  actionId?: string;
}>;
export type AtlasUsageCost = Readonly<{
  amountMinor: number;
  currency: string;
  estimate: boolean;
  source: string;
}>;
export type AtlasUsageEvent = Readonly<{
  schemaVersion: typeof ATLAS_USAGE_LEDGER_SCHEMA;
  eventId: string;
  attribution: AtlasUsageAttribution;
  kind: AtlasUsageKind;
  unit: string;
  quantity: number;
  usage?: Readonly<{ inputTokens?: number; outputTokens?: number; bytes?: number; calls?: number }>;
  cost: AtlasUsageCost;
  providerReference?: string;
  occurredAt: string;
  recordedAt: string;
}>;
export type AtlasUsageSettlement = Readonly<{
  settlementId: string;
  eventId: string;
  providerReference: string;
  amountMinor: number;
  currency: string;
  invoiceReference: string;
  settledAt: string;
}>;
export type AtlasUsageLedgerState = Readonly<{
  schemaVersion: typeof ATLAS_USAGE_LEDGER_SCHEMA;
  events: readonly AtlasUsageEvent[];
  settlements: readonly AtlasUsageSettlement[];
}>;
export type AtlasUsageSummaryGroup = Readonly<{
  kind: AtlasUsageKind;
  unit: string;
  currency: string;
  eventCount: number;
  quantity: number;
  estimatedCostMinor: number;
  settledCostMinor: number;
  unsettledCostMinor: number;
}>;
export type AtlasUsageSummary = Readonly<{
  eventCount: number;
  quantity: number | null;
  estimatedCostMinor: number | null;
  settledCostMinor: number | null;
  unsettledCostMinor: number | null;
  currency: string | null;
  groups: readonly AtlasUsageSummaryGroup[];
}>;

export class AtlasUsageLedgerError extends Error {
  readonly code: 'INVALID_EVENT' | 'IDEMPOTENCY_CONFLICT' | 'NOT_FOUND' | 'INVALID_SETTLEMENT' | 'SCOPE_MISMATCH' | 'INVALID_STATE';
  constructor(code: AtlasUsageLedgerError['code'], message: string) {
    super(message);
    this.name = 'AtlasUsageLedgerError';
    this.code = code;
  }
}

const EMPTY_STATE: AtlasUsageLedgerState = Object.freeze({ schemaVersion: ATLAS_USAGE_LEDGER_SCHEMA, events: Object.freeze([]), settlements: Object.freeze([]) });
const USAGE_KINDS = new Set<AtlasUsageKind>(['model', 'runtime', 'tool', 'provider', 'media', 'storage', 'observability']);
const REQUIRED_ATTRIBUTION_FIELDS = ['tenantId', 'organisationId', 'projectId', 'environmentId'] as const;
const OPTIONAL_ATTRIBUTION_FIELDS = ['agentVersionId', 'missionId', 'actionId'] as const;
const ATTRIBUTION_FIELDS = new Set<string>([...REQUIRED_ATTRIBUTION_FIELDS, ...OPTIONAL_ATTRIBUTION_FIELDS]);
const USAGE_FIELDS = new Set(['inputTokens', 'outputTokens', 'bytes', 'calls']);

export class LocalUsageLedger {
  readonly root: string;
  readonly filePath: string;
  private readonly lock: OperationLock;
  private transactionTail: Promise<void> = Promise.resolve();

  private constructor(root: string) {
    this.root = path.resolve(root);
    this.filePath = path.resolve(root, ATLAS_USAGE_LEDGER_FILE);
    this.lock = new OperationLock(root, { filePath: path.resolve(root, '.atlas', 'usage-ledger.lock') });
  }

  static async open(root: string): Promise<LocalUsageLedger> {
    const ledger = new LocalUsageLedger(root);
    await ledger.transaction(async (state) => ({ state, value: undefined }));
    return ledger;
  }

  async readState(): Promise<AtlasUsageLedgerState> { return this.load(); }

  async record(event: Omit<AtlasUsageEvent, 'schemaVersion'>): Promise<Readonly<{ event: AtlasUsageEvent; replayed: boolean }>> {
    const candidate = { ...event, schemaVersion: ATLAS_USAGE_LEDGER_SCHEMA } as AtlasUsageEvent;
    validateEvent(candidate);
    const normalized = freezeClone(candidate);
    return this.transaction(async (state) => {
      const existing = state.events.find((candidate) => candidate.eventId === normalized.eventId);
      if (existing) {
        if (stableJson(existing) !== stableJson(normalized)) throw new AtlasUsageLedgerError('IDEMPOTENCY_CONFLICT', `Usage event ${normalized.eventId} was reused with different content`);
        return { state, value: { event: existing, replayed: true as boolean } };
      }
      return { state: freezeState({ ...state, events: [...state.events, normalized] }), value: { event: normalized, replayed: false as boolean } };
    });
  }

  async settle(input: Omit<AtlasUsageSettlement, 'settlementId'> & { settlementId?: string }): Promise<Readonly<{ settlement: AtlasUsageSettlement; replayed: boolean }>> {
    const candidate = { ...input, settlementId: input.settlementId ?? `settlement_${sha256(stableJson(input)).slice(7, 23)}` } as AtlasUsageSettlement;
    validateSettlement(candidate);
    const settlement = freezeClone(candidate);
    return this.transaction(async (state) => {
      const event = state.events.find((candidate) => candidate.eventId === settlement.eventId);
      if (!event) throw new AtlasUsageLedgerError('NOT_FOUND', `Usage event ${settlement.eventId} was not found`);
      if (event.providerReference !== settlement.providerReference) throw new AtlasUsageLedgerError('INVALID_SETTLEMENT', 'Settlement provider reference does not match the usage event');
      if (event.cost.estimate || event.cost.currency !== settlement.currency || event.cost.amountMinor !== settlement.amountMinor) throw new AtlasUsageLedgerError('INVALID_SETTLEMENT', 'Settlement must exactly reconcile the non-estimated usage event cost');
      const existingForEvent = state.settlements.find((candidate) => candidate.eventId === settlement.eventId);
      if (existingForEvent && existingForEvent.settlementId !== settlement.settlementId) throw new AtlasUsageLedgerError('INVALID_SETTLEMENT', `Usage event ${settlement.eventId} already has a settlement`);
      const existing = state.settlements.find((candidate) => candidate.settlementId === settlement.settlementId);
      if (existing) {
        if (stableJson(existing) !== stableJson(settlement)) throw new AtlasUsageLedgerError('IDEMPOTENCY_CONFLICT', `Settlement ${settlement.settlementId} was reused with different content`);
        return { state, value: { settlement: existing, replayed: true as boolean } };
      }
      return { state: freezeState({ ...state, settlements: [...state.settlements, settlement] }), value: { settlement, replayed: false as boolean } };
    });
  }

  async summarize(attribution: Partial<AtlasUsageAttribution>): Promise<AtlasUsageSummary> {
    const state = await this.load();
    const events = state.events.filter((event) => matchesAttribution(event.attribution, attribution));
    const settlementByEvent = new Map<string, number>();
    for (const settlement of state.settlements) settlementByEvent.set(settlement.eventId, (settlementByEvent.get(settlement.eventId) ?? 0) + settlement.amountMinor);
    const grouped = new Map<string, AtlasUsageSummaryGroup>();
    for (const event of events) {
      const key = `${event.kind}:${event.unit}:${event.cost.currency}`;
      const existing = grouped.get(key);
      const settledCostMinor = settlementByEvent.get(event.eventId) ?? 0;
      const next: AtlasUsageSummaryGroup = {
        kind: event.kind,
        unit: event.unit,
        currency: event.cost.currency,
        eventCount: (existing?.eventCount ?? 0) + 1,
        quantity: (existing?.quantity ?? 0) + event.quantity,
        estimatedCostMinor: (existing?.estimatedCostMinor ?? 0) + (event.cost.estimate ? event.cost.amountMinor : 0),
        settledCostMinor: (existing?.settledCostMinor ?? 0) + settledCostMinor,
        unsettledCostMinor: (existing?.unsettledCostMinor ?? 0) + (!event.cost.estimate ? Math.max(0, event.cost.amountMinor - settledCostMinor) : 0),
      };
      grouped.set(key, next);
    }
    const groups = [...grouped.values()];
    const single = groups.length === 1 ? groups[0] : undefined;
    return {
      eventCount: events.length,
      quantity: single?.quantity ?? null,
      estimatedCostMinor: single?.estimatedCostMinor ?? null,
      settledCostMinor: single?.settledCostMinor ?? null,
      unsettledCostMinor: single?.unsettledCostMinor ?? null,
      currency: single?.currency ?? null,
      groups,
    };
  }

  private async transaction<T>(operation: (state: AtlasUsageLedgerState) => Promise<{ state: AtlasUsageLedgerState; value: T }>): Promise<T> {
    const previous = this.transactionTail;
    let release!: () => void;
    this.transactionTail = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try {
      await this.lock.acquire();
      try {
        const state = await this.load();
        const outcome = await operation(state);
        if (stableJson(state) !== stableJson(outcome.state)) await this.save(outcome.state);
        return outcome.value;
      } finally { await this.lock.release(); }
    } finally { release(); }
  }

  private async load(): Promise<AtlasUsageLedgerState> {
    const raw = await readUtf8Safe(this.filePath);
    if (raw === null) return EMPTY_STATE;
    try { return validateState(JSON.parse(raw)); }
    catch (error) { if (error instanceof AtlasUsageLedgerError) throw error; throw new AtlasUsageLedgerError('INVALID_STATE', `Invalid usage ledger state: ${String(error)}`); }
  }

  private async save(state: AtlasUsageLedgerState): Promise<void> {
    await ensurePrivateDirectory(path.dirname(this.filePath));
    await atomicWrite(this.filePath, `${JSON.stringify(state, null, 2)}\n`);
  }
}

function validateEvent(event: AtlasUsageEvent): void {
  const valid = event.schemaVersion === ATLAS_USAGE_LEDGER_SCHEMA
    && nonEmpty(event.eventId)
    && USAGE_KINDS.has(event.kind)
    && nonEmpty(event.unit)
    && Number.isFinite(event.quantity)
    && event.quantity >= 0
    && isScope(event.attribution)
    && isRecord(event.cost)
    && Number.isSafeInteger(event.cost.amountMinor)
    && event.cost.amountMinor >= 0
    && nonEmpty(event.cost.currency)
    && typeof event.cost.estimate === 'boolean'
    && nonEmpty(event.cost.source)
    && validTimestamp(event.occurredAt)
    && validTimestamp(event.recordedAt)
    && optionalNonEmpty(event.providerReference)
    && validateUsage(event.usage);
  if (!valid) throw new AtlasUsageLedgerError('INVALID_EVENT', 'Usage event is incomplete or invalid');
}
function validateUsage(value: unknown): boolean {
  if (value === undefined) return true;
  if (!isRecord(value)) return false;
  return Object.entries(value).every(([key, item]) => USAGE_FIELDS.has(key) && typeof item === 'number' && Number.isFinite(item) && item >= 0);
}
function validateSettlement(settlement: AtlasUsageSettlement): void {
  if (!nonEmpty(settlement.settlementId) || !nonEmpty(settlement.eventId) || !nonEmpty(settlement.providerReference) || !Number.isSafeInteger(settlement.amountMinor) || settlement.amountMinor < 0 || !nonEmpty(settlement.currency) || !nonEmpty(settlement.invoiceReference) || !validTimestamp(settlement.settledAt)) throw new AtlasUsageLedgerError('INVALID_SETTLEMENT', 'Usage settlement is incomplete or invalid');
}
function validateState(value: unknown): AtlasUsageLedgerState {
  if (!isRecord(value) || value.schemaVersion !== ATLAS_USAGE_LEDGER_SCHEMA || !Array.isArray(value.events) || !Array.isArray(value.settlements)) throw new AtlasUsageLedgerError('INVALID_STATE', 'Usage ledger schema is invalid');
  for (const event of value.events) validateEvent(event as AtlasUsageEvent);
  for (const settlement of value.settlements) validateSettlement(settlement as AtlasUsageSettlement);
  const events = value.events as AtlasUsageEvent[];
  const settlements = value.settlements as AtlasUsageSettlement[];
  if (new Set(events.map((event) => event.eventId)).size !== events.length) throw new AtlasUsageLedgerError('INVALID_STATE', 'Usage ledger contains duplicate event identity');
  if (new Set(settlements.map((settlement) => settlement.settlementId)).size !== settlements.length) throw new AtlasUsageLedgerError('INVALID_STATE', 'Usage ledger contains duplicate settlement identity');
  const eventById = new Map(events.map((event) => [event.eventId, event]));
  const settledEvents = new Set<string>();
  for (const settlement of settlements) {
    const event = eventById.get(settlement.eventId);
    if (!event || event.cost.estimate || !event.providerReference || event.providerReference !== settlement.providerReference || event.cost.currency !== settlement.currency || event.cost.amountMinor !== settlement.amountMinor || settledEvents.has(settlement.eventId)) {
      throw new AtlasUsageLedgerError('INVALID_STATE', `Usage settlement ${settlement.settlementId} does not reconcile to a unique usage event`);
    }
    settledEvents.add(settlement.eventId);
  }
  return freezeState({ schemaVersion: ATLAS_USAGE_LEDGER_SCHEMA, events, settlements });
}
function isScope(value: unknown): value is AtlasUsageAttribution {
  if (!isRecord(value)) return false;
  return REQUIRED_ATTRIBUTION_FIELDS.every((key) => nonEmpty(value[key]))
    && OPTIONAL_ATTRIBUTION_FIELDS.every((key) => optionalNonEmpty(value[key]))
    && Object.keys(value).every((key) => ATTRIBUTION_FIELDS.has(key));
}
function matchesAttribution(value: AtlasUsageAttribution, filter: Partial<AtlasUsageAttribution>): boolean { return Object.entries(filter).every(([key, expected]) => expected === undefined || value[key as keyof AtlasUsageAttribution] === expected); }
function optionalNonEmpty(value: unknown): boolean { return value === undefined || nonEmpty(value); }
function nonEmpty(value: unknown): value is string { return typeof value === 'string' && value.trim().length > 0; }
function validTimestamp(value: unknown): value is string { return typeof value === 'string' && Number.isFinite(Date.parse(value)); }
function isRecord(value: unknown): value is Record<string, any> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function freezeState(value: AtlasUsageLedgerState): AtlasUsageLedgerState { return freezeClone(value); }
function freezeClone<T>(value: T): T { return deepFreeze(JSON.parse(JSON.stringify(value)) as T); }
function deepFreeze<T>(value: T): T { if (value && typeof value === 'object') { Object.freeze(value); for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child); } return value; }
function stableJson(value: unknown): string { if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`; if (isRecord(value)) return `{${Object.entries(value).filter(([, item]) => item !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`; return JSON.stringify(value); }
