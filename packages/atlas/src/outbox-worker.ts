import { randomUUID } from 'node:crypto';
import path from 'node:path';
import {
  ACTION_API_VERSION,
  RECEIPT_KIND,
  digestContract,
  validateReceipt,
  verifyReceiptIntegrity,
  type ActionScope,
  type Receipt,
} from './action-contract.js';
import { atomicWrite, ensurePrivateDirectory, readUtf8Safe } from './fs-safety.js';
import { OperationLock } from './operation-journal.js';

export const OUTBOX_WORKER_SCHEMA = 'atlas.outbox-worker/v1' as const;
export const OUTBOX_WORKER_FILE = '.atlas/outbox-worker.json' as const;
export const DEFAULT_OUTBOX_LEASE_TTL_MS = 30_000;

export type OutboxWorkerItemStatus = 'QUEUED' | 'CLAIMED' | 'RETRY_SCHEDULED' | 'SUCCEEDED' | 'FAILED';
export type OutboxFaultPoint = 'before_effect' | 'after_effect';
export type OutboxEffectStatus = 'SUCCEEDED' | 'FAILED';
export type OutboxEffectResult = Readonly<{
  status: 'succeeded' | 'retryable_failure' | 'failed';
  result?: unknown;
  providerReference?: string;
  providerCode?: string;
}>;
export type OutboxEffectReconciler = (request: Readonly<{ item: OutboxWorkerItem; effectKey: string; attempt: number }>) => Promise<OutboxEffectResult | null> | OutboxEffectResult | null;

export type OutboxWorkerItem = Readonly<{
  id: string;
  actionId: string;
  idempotencyKey: string;
  scope: ActionScope;
  payload: unknown;
  effectKey: string;
  payloadDigest: string;
  status: OutboxWorkerItemStatus;
  attempts: number;
  ownerId: string | null;
  leaseId: string | null;
  leaseExpiresAt: string | null;
  nextAttemptAt: string | null;
  resultDigest: string | null;
  providerReference: string | null;
  providerCode: string | null;
  createdAt: string;
  updatedAt: string;
}>;

export type OutboxWorkerEffect = Readonly<{
  effectKey: string;
  outboxId: string;
  actionId: string;
  status: OutboxEffectStatus;
  result: unknown;
  resultDigest: string;
  providerReference: string | null;
  providerCode: string | null;
  appliedAt: string;
}>;

export type OutboxWorkerAmbiguity = Readonly<{
  effectKey: string;
  outboxId: string;
  actionId: string;
  startedAt: string;
}>;

export type OutboxWorkerOptions = Readonly<{
  root: string;
  clock?: () => string;
}>;

export type EnqueueOutboxInput = Readonly<{
  id: string;
  actionId: string;
  idempotencyKey: string;
  scope: ActionScope;
  payload: unknown;
  createdAt?: string;
}>;

export type OutboxClaim = Readonly<{
  item: OutboxWorkerItem;
  leaseId: string;
}>;

export type OutboxProcessOptions = Readonly<{
  now?: string;
  leaseTtlMs?: number;
  leaseId?: string;
  fault?: OutboxFaultPoint;
  reconcileEffect?: OutboxEffectReconciler;
}>;

export type OutboxProcessResult = Readonly<{
  item: OutboxWorkerItem;
  receipt: Receipt;
  effect: OutboxWorkerEffect;
  replayed: boolean;
}>;

export type OutboxWorkerState = Readonly<{
  schemaVersion: typeof OUTBOX_WORKER_SCHEMA;
  items: readonly OutboxWorkerItem[];
  effects: readonly OutboxWorkerEffect[];
  ambiguities: readonly OutboxWorkerAmbiguity[];
  receipts: readonly Receipt[];
}>;

export type OutboxWorkerErrorCode =
  | 'OUTBOX_NOT_FOUND'
  | 'OUTBOX_CONFLICT'
  | 'OUTBOX_IDEMPOTENCY_MISMATCH'
  | 'OUTBOX_RETRY_NOT_READY'
  | 'OUTBOX_LEASE_LOST'
  | 'OUTBOX_FAULT_INJECTED'
  | 'OUTBOX_INVALID_STATE';

export class OutboxWorkerError extends Error {
  readonly code: OutboxWorkerErrorCode;
  readonly retryable: boolean;

  constructor(code: OutboxWorkerErrorCode, message: string, options: { retryable?: boolean } = {}) {
    super(message);
    this.name = 'OutboxWorkerError';
    this.code = code;
    this.retryable = options.retryable ?? false;
  }
}

const EMPTY_STATE: OutboxWorkerState = Object.freeze({
  schemaVersion: OUTBOX_WORKER_SCHEMA,
  items: Object.freeze([]),
  effects: Object.freeze([]),
  ambiguities: Object.freeze([]),
  receipts: Object.freeze([]),
});

export function deterministicOutboxEffectKey(input: Readonly<Pick<EnqueueOutboxInput, 'actionId' | 'idempotencyKey' | 'scope' | 'payload'>>): string {
  return `effect_${digestContract({
    actionId: input.actionId,
    idempotencyKey: input.idempotencyKey,
    scope: input.scope,
  }).slice(7, 23)}`;
}

export class LocalOutboxWorker {
  readonly root: string;
  readonly filePath: string;
  readonly clock: () => string;
  private readonly lock: OperationLock;
  private transactionTail: Promise<void> = Promise.resolve();

  private constructor(root: string, clock: () => string) {
    this.root = path.resolve(root);
    this.filePath = path.resolve(root, OUTBOX_WORKER_FILE);
    this.clock = clock;
    this.lock = new OperationLock(root, { filePath: path.resolve(root, '.atlas', 'outbox-worker.lock') });
  }

  static async open(options: OutboxWorkerOptions): Promise<LocalOutboxWorker> {
    const worker = new LocalOutboxWorker(path.resolve(options.root), options.clock ?? (() => new Date().toISOString()));
    await worker.migrate();
    return worker;
  }

  async migrate(): Promise<OutboxWorkerState> {
    return this.transaction(async (state) => ({ state, value: state }));
  }

  async readState(): Promise<OutboxWorkerState> {
    return this.load();
  }

  async readItem(id: string): Promise<OutboxWorkerItem | null> {
    return (await this.load()).items.find((item) => item.id === id) ?? null;
  }

  async readEffects(): Promise<readonly OutboxWorkerEffect[]> {
    return (await this.load()).effects;
  }

  async readReceipts(): Promise<readonly Receipt[]> {
    return (await this.load()).receipts;
  }

  async enqueue(input: EnqueueOutboxInput): Promise<Readonly<{ item: OutboxWorkerItem; replayed: boolean }>> {
    validateEnqueueInput(input);
    const createdAt = input.createdAt ?? this.clock();
    parseTimestamp(createdAt);
    const effectKey = deterministicOutboxEffectKey(input);
    const payloadDigest = digestContract(input.payload);
    return this.transaction(async (state) => {
      const existing = state.items.find((item) => item.id === input.id);
      if (existing) {
        if (!sameOutboxIdentity(existing, input, effectKey, payloadDigest)) {
          throw new OutboxWorkerError('OUTBOX_IDEMPOTENCY_MISMATCH', `Outbox identity ${input.id} was reused with different content`);
        }
        return { state, value: { item: existing, replayed: true as boolean } };
      }
      const businessReplay = state.items.find((item) => sameBusinessIdentity(item, input));
      if (businessReplay) {
        if (businessReplay.payloadDigest !== payloadDigest) {
          throw new OutboxWorkerError('OUTBOX_IDEMPOTENCY_MISMATCH', `Idempotency key ${input.idempotencyKey} was reused with different content`);
        }
        return { state, value: { item: businessReplay, replayed: true as boolean } };
      }
      const item: OutboxWorkerItem = freezeClone({
        id: input.id,
        actionId: input.actionId,
        idempotencyKey: input.idempotencyKey,
        scope: input.scope,
        payload: input.payload,
        effectKey,
        payloadDigest,
        status: 'QUEUED',
        attempts: 0,
        ownerId: null,
        leaseId: null,
        leaseExpiresAt: null,
        nextAttemptAt: null,
        resultDigest: null,
        providerReference: null,
        providerCode: null,
        createdAt,
        updatedAt: createdAt,
      });
      return { state: freezeState({ ...state, items: [...state.items, item] }), value: { item, replayed: false as boolean } };
    });
  }

  async claim(itemId: string, ownerId: string, options: Readonly<{ now?: string; leaseTtlMs?: number; leaseId?: string }> = {}): Promise<OutboxClaim> {
    validateIdentity(itemId, 'outbox item ID');
    validateIdentity(ownerId, 'worker owner ID');
    const now = options.now ?? this.clock();
    parseTimestamp(now);
    const leaseTtlMs = ttl(options.leaseTtlMs);
    return this.transaction(async (state) => {
      const index = state.items.findIndex((item) => item.id === itemId);
      if (index < 0) throw new OutboxWorkerError('OUTBOX_NOT_FOUND', `Outbox item not found: ${itemId}`);
      const current = state.items[index]!;
      if (current.status === 'SUCCEEDED' || current.status === 'FAILED') {
        throw new OutboxWorkerError('OUTBOX_CONFLICT', `Outbox item ${itemId} is terminal in state ${current.status}`);
      }
      if (current.status === 'RETRY_SCHEDULED' && current.nextAttemptAt && parseTimestamp(current.nextAttemptAt) > parseTimestamp(now)) {
        throw new OutboxWorkerError('OUTBOX_RETRY_NOT_READY', `Outbox item ${itemId} is not ready for retry`, { retryable: true });
      }
      if (current.status === 'CLAIMED' && current.leaseExpiresAt && parseTimestamp(current.leaseExpiresAt) > parseTimestamp(now)) {
        if (current.ownerId !== ownerId || !current.leaseId || options.leaseId !== current.leaseId) {
          throw new OutboxWorkerError('OUTBOX_CONFLICT', `Outbox item ${itemId} is leased by another worker or requires its lease token`, { retryable: true });
        }
        const leaseId = current.leaseId;
        const renewed = freezeClone({ ...current, leaseExpiresAt: timestampAfter(now, leaseTtlMs), updatedAt: now });
        return { state: replaceItem(state, index, renewed), value: { item: renewed, leaseId } };
      }
      const claimed = freezeClone({
        ...current,
        status: 'CLAIMED' as const,
        attempts: current.attempts + 1,
        ownerId,
        leaseId: randomUUID(),
        leaseExpiresAt: timestampAfter(now, leaseTtlMs),
        nextAttemptAt: null,
        updatedAt: now,
      });
      return { state: replaceItem(state, index, claimed), value: { item: claimed, leaseId: claimed.leaseId } };
    });
  }

  async recoverExpired(options: Readonly<{ now?: string }> = {}): Promise<readonly OutboxWorkerItem[]> {
    const now = options.now ?? this.clock();
    parseTimestamp(now);
    return this.transaction(async (state) => {
      const recovered: OutboxWorkerItem[] = [];
      const items = state.items.map((item) => {
        if (item.status !== 'CLAIMED' || !item.leaseExpiresAt || parseTimestamp(item.leaseExpiresAt) > parseTimestamp(now)) return item;
        const updated = freezeClone({ ...item, status: 'RETRY_SCHEDULED' as const, ownerId: null, leaseId: null, leaseExpiresAt: null, nextAttemptAt: null, updatedAt: now });
        recovered.push(updated);
        return updated;
      });
      return { state: recovered.length ? freezeState({ ...state, items }) : state, value: recovered };
    });
  }

  async process(
    itemId: string,
    ownerId: string,
    simulateEffect: (request: Readonly<{ item: OutboxWorkerItem; effectKey: string; attempt: number }>) => Promise<OutboxEffectResult> | OutboxEffectResult,
    options: OutboxProcessOptions = {},
  ): Promise<OutboxProcessResult> {
    const now = options.now ?? this.clock();
    const claim = await this.claim(itemId, ownerId, { now, leaseTtlMs: options.leaseTtlMs, leaseId: options.leaseId });
    if (options.fault === 'before_effect') throw new OutboxWorkerError('OUTBOX_FAULT_INJECTED', `Injected fault before effect ${claim.item.effectKey}`, { retryable: true });

    const state = await this.load();
    const existingEffect = state.effects.find((candidate) => candidate.effectKey === claim.item.effectKey);
    const ambiguity = state.ambiguities.find((candidate) => candidate.effectKey === claim.item.effectKey);
    let effect: OutboxWorkerEffect;
    let replayed = false;
    if (existingEffect) {
      if (existingEffect.outboxId !== claim.item.id || existingEffect.actionId !== claim.item.actionId) {
        throw new OutboxWorkerError('OUTBOX_IDEMPOTENCY_MISMATCH', `Effect key ${claim.item.effectKey} is bound to different outbox identity`);
      }
      effect = existingEffect;
      replayed = true;
    } else {
      if (ambiguity && (ambiguity.outboxId !== claim.item.id || ambiguity.actionId !== claim.item.actionId)) {
        throw new OutboxWorkerError('OUTBOX_IDEMPOTENCY_MISMATCH', `Effect key ${claim.item.effectKey} is bound to different outbox identity`);
      }
      const simulated = ambiguity
        ? await options.reconcileEffect?.({ item: claim.item, effectKey: claim.item.effectKey, attempt: claim.item.attempts }) ?? null
        : await this.startEffect(claim.item, ownerId, claim.leaseId, now, simulateEffect);
      if (!simulated) {
        await this.transaction(async (next) => {
          const current = ownedClaim(next, claim.item.id, ownerId, claim.leaseId, now);
          const released = freezeClone({ ...current, status: 'RETRY_SCHEDULED' as const, ownerId: null, leaseId: null, leaseExpiresAt: null, nextAttemptAt: null, updatedAt: now });
          return { state: replaceItem(next, next.items.findIndex((candidate) => candidate.id === claim.item.id), released), value: released };
        });
        throw new OutboxWorkerError('OUTBOX_CONFLICT', `Effect ${claim.item.effectKey} has an ambiguous outcome and requires reconciliation`, { retryable: true });
      }
      validateEffectResult(simulated);
      if (simulated.status === 'retryable_failure') {
        const retryEffect = makeEffect(claim.item, simulated, now);
        return this.scheduleRetry(claim.item.id, ownerId, claim.leaseId, retryEffect, now);
      }
      effect = makeEffect(claim.item, simulated, now);
      await this.transaction(async (next) => {
        const current = ownedClaim(next, claim.item.id, ownerId, claim.leaseId, now);
        const prior = next.effects.find((candidate) => candidate.effectKey === effect.effectKey);
        if (prior && stableJson(prior) !== stableJson(effect)) throw new OutboxWorkerError('OUTBOX_IDEMPOTENCY_MISMATCH', `Effect key ${effect.effectKey} was reused with different result`);
        const effects = prior ? next.effects : [...next.effects, effect];
        const ambiguities = next.ambiguities.filter((candidate) => candidate.effectKey !== effect.effectKey);
        return { state: prior && ambiguities.length === next.ambiguities.length ? next : freezeState({ ...next, effects, ambiguities }), value: current };
      });
      if (options.fault === 'after_effect') throw new OutboxWorkerError('OUTBOX_FAULT_INJECTED', `Injected fault after effect ${claim.item.effectKey}`, { retryable: true });
    }

    return this.finalize(claim.item.id, ownerId, claim.leaseId, effect, now, replayed);
  }

  private async startEffect(
    item: OutboxWorkerItem,
    ownerId: string,
    leaseId: string,
    now: string,
    simulateEffect: (request: Readonly<{ item: OutboxWorkerItem; effectKey: string; attempt: number }>) => Promise<OutboxEffectResult> | OutboxEffectResult,
  ): Promise<OutboxEffectResult> {
    await this.transaction(async (state) => {
      const current = ownedClaim(state, item.id, ownerId, leaseId, now);
      const existing = state.ambiguities.find((candidate) => candidate.effectKey === item.effectKey);
      if (existing) return { state, value: current };
      const ambiguity: OutboxWorkerAmbiguity = freezeClone({ effectKey: item.effectKey, outboxId: item.id, actionId: item.actionId, startedAt: now });
      return { state: freezeState({ ...state, ambiguities: [...state.ambiguities, ambiguity] }), value: current };
    });
    return simulateEffect({ item, effectKey: item.effectKey, attempt: item.attempts });
  }

  private async scheduleRetry(itemId: string, ownerId: string, leaseId: string, effect: OutboxWorkerEffect, now: string): Promise<OutboxProcessResult> {
    return this.transaction(async (state) => {
      const index = state.items.findIndex((item) => item.id === itemId);
      if (index < 0) throw new OutboxWorkerError('OUTBOX_NOT_FOUND', `Outbox item not found: ${itemId}`);
      const current = ownedClaim(state, itemId, ownerId, leaseId, now);
      const receipt = canonicalReceipt(current, effect, 'FAILED', now, `retry:${current.attempts}`);
      const retryAfterMs = Math.min(60_000, 1_000 * 2 ** Math.max(0, current.attempts - 1));
      const item = freezeClone({
        ...current,
        status: 'RETRY_SCHEDULED' as const,
        ownerId: null,
        leaseId: null,
        leaseExpiresAt: null,
        nextAttemptAt: timestampAfter(now, retryAfterMs),
        providerReference: effect.providerReference,
        providerCode: effect.providerCode,
        updatedAt: now,
      });
      const existingReceipt = state.receipts.find((candidate) => candidate.metadata.id === receipt.metadata.id);
      if (existingReceipt && stableJson(existingReceipt) !== stableJson(receipt)) throw new OutboxWorkerError('OUTBOX_IDEMPOTENCY_MISMATCH', `Receipt identity ${receipt.metadata.id} was reused with different content`);
      const receipts = existingReceipt ? state.receipts : [...state.receipts, receipt];
      const next = freezeState({
        ...state,
        items: state.items.map((candidate, candidateIndex) => candidateIndex === index ? item : candidate),
        ambiguities: state.ambiguities.filter((candidate) => candidate.effectKey !== effect.effectKey),
        receipts,
      });
      return { state: next, value: { item, receipt: existingReceipt ?? receipt, effect, replayed: Boolean(existingReceipt) } };
    });
  }

  private async finalize(itemId: string, ownerId: string, leaseId: string, effect: OutboxWorkerEffect, now: string, replayed: boolean): Promise<OutboxProcessResult> {
    return this.transaction(async (state) => {
      const index = state.items.findIndex((item) => item.id === itemId);
      if (index < 0) throw new OutboxWorkerError('OUTBOX_NOT_FOUND', `Outbox item not found: ${itemId}`);
      const current = ownedClaim(state, itemId, ownerId, leaseId, now);
      const receiptStatus = effect.status === 'SUCCEEDED' ? 'SUCCEEDED' as const : 'FAILED' as const;
      const receipt = canonicalReceipt(current, effect, receiptStatus, now);
      const existingReceipt = state.receipts.find((candidate) => candidate.metadata.id === receipt.metadata.id);
      if (existingReceipt && stableJson(existingReceipt) !== stableJson(receipt)) throw new OutboxWorkerError('OUTBOX_IDEMPOTENCY_MISMATCH', `Receipt identity ${receipt.metadata.id} was reused with different content`);
      const receipts = existingReceipt ? state.receipts : [...state.receipts, receipt];
      const item = freezeClone({
        ...current,
        status: effect.status === 'SUCCEEDED' ? 'SUCCEEDED' as const : 'FAILED' as const,
        ownerId: null,
        leaseId: null,
        leaseExpiresAt: null,
        nextAttemptAt: null,
        resultDigest: effect.resultDigest,
        providerReference: effect.providerReference,
        providerCode: effect.providerCode,
        updatedAt: now,
      });
      const next = freezeState({
        ...state,
        items: state.items.map((candidate, candidateIndex) => candidateIndex === index ? item : candidate),
        ambiguities: state.ambiguities.filter((candidate) => candidate.effectKey !== effect.effectKey),
        receipts,
      });
      return { state: next, value: { item, receipt: existingReceipt ?? receipt, effect, replayed: replayed || Boolean(existingReceipt) } };
    });
  }

  async retry(
    itemId: string,
    ownerId: string,
    simulateEffect: (request: Readonly<{ item: OutboxWorkerItem; effectKey: string; attempt: number }>) => Promise<OutboxEffectResult> | OutboxEffectResult,
    options: OutboxProcessOptions = {},
  ): Promise<OutboxProcessResult> {
    const now = options.now ?? this.clock();
    const item = await this.readItem(itemId);
    if (!item) throw new OutboxWorkerError('OUTBOX_NOT_FOUND', `Outbox item not found: ${itemId}`);
    if (item.status === 'CLAIMED' && item.leaseExpiresAt && parseTimestamp(item.leaseExpiresAt) <= parseTimestamp(now)) await this.recoverExpired({ now });
    return this.process(itemId, ownerId, simulateEffect, options);
  }

  private async transaction<T>(operation: (state: OutboxWorkerState) => Promise<{ state: OutboxWorkerState; value: T }>): Promise<T> {
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
      } finally {
        await this.lock.release();
      }
    } finally {
      release();
    }
  }

  private async load(): Promise<OutboxWorkerState> {
    const raw = await readUtf8Safe(this.filePath);
    if (raw === null) return EMPTY_STATE;
    try {
      const parsed = JSON.parse(raw) as unknown;
      return validateState(parsed);
    } catch (error) {
      if (error instanceof OutboxWorkerError) throw error;
      throw new OutboxWorkerError('OUTBOX_INVALID_STATE', `Invalid local outbox worker state: ${String(error)}`);
    }
  }

  private async save(state: OutboxWorkerState): Promise<void> {
    await ensurePrivateDirectory(path.dirname(this.filePath));
    await atomicWrite(this.filePath, `${JSON.stringify(state, null, 2)}\n`);
  }
}

function validateEnqueueInput(input: EnqueueOutboxInput): void {
  validateIdentity(input.id, 'outbox item ID');
  validateIdentity(input.actionId, 'action ID');
  validateIdentity(input.idempotencyKey, 'idempotency key');
  if (!isScope(input.scope)) throw new OutboxWorkerError('OUTBOX_INVALID_STATE', 'Outbox scope must be complete and non-empty');
}

function validateIdentity(value: string, label: string): void {
  if (typeof value !== 'string' || !value.trim() || value.length > 2048) throw new OutboxWorkerError('OUTBOX_INVALID_STATE', `${label} must be a bounded non-empty string`);
}

function validateEffectResult(value: OutboxEffectResult): void {
  if (!value || !['succeeded', 'retryable_failure', 'failed'].includes(value.status)) throw new OutboxWorkerError('OUTBOX_INVALID_STATE', 'Effect simulator returned an unsupported status');
  if (value.providerReference !== undefined) validateIdentity(value.providerReference, 'provider reference');
  if (value.providerCode !== undefined) validateIdentity(value.providerCode, 'provider code');
}

function sameBusinessIdentity(existing: OutboxWorkerItem, input: EnqueueOutboxInput): boolean {
  return existing.actionId === input.actionId && existing.idempotencyKey === input.idempotencyKey && sameScope(existing.scope, input.scope);
}

function sameOutboxIdentity(existing: OutboxWorkerItem, input: EnqueueOutboxInput, effectKey: string, payloadDigest: string): boolean {
  return sameBusinessIdentity(existing, input) && existing.effectKey === effectKey && existing.payloadDigest === payloadDigest;
}

function ownedClaim(state: OutboxWorkerState, itemId: string, ownerId: string, leaseId: string, now: string): OutboxWorkerItem {
  const current = state.items.find((item) => item.id === itemId);
  if (!current) throw new OutboxWorkerError('OUTBOX_NOT_FOUND', `Outbox item not found: ${itemId}`);
  if (current.status !== 'CLAIMED' || current.ownerId !== ownerId || current.leaseId !== leaseId || !current.leaseExpiresAt || parseTimestamp(current.leaseExpiresAt) <= parseTimestamp(now)) {
    throw new OutboxWorkerError('OUTBOX_LEASE_LOST', `Worker ${ownerId} no longer owns outbox item ${itemId}`, { retryable: true });
  }
  return current;
}

function makeEffect(item: OutboxWorkerItem, simulated: OutboxEffectResult, now: string): OutboxWorkerEffect {
  return freezeClone({
    effectKey: item.effectKey,
    outboxId: item.id,
    actionId: item.actionId,
    status: simulated.status === 'succeeded' ? 'SUCCEEDED' : 'FAILED',
    result: simulated.result ?? null,
    resultDigest: digestContract(simulated.result ?? null),
    providerReference: simulated.providerReference ?? null,
    providerCode: simulated.providerCode ?? null,
    appliedAt: now,
  });
}

function canonicalReceipt(item: OutboxWorkerItem, effect: OutboxWorkerEffect, status: 'SUCCEEDED' | 'FAILED', recordedAt: string, identitySuffix: string = status): Receipt {
  const receiptId = `receipt_${digestContract([effect.effectKey, identitySuffix]).slice(7, 23)}`;
  const unsigned = {
    apiVersion: ACTION_API_VERSION,
    kind: RECEIPT_KIND,
    metadata: { id: receiptId, schemaVersion: '1' as const, missionId: item.scope.missionId },
    spec: {
      scope: item.scope,
      receiptType: 'provider' as const,
      actionId: item.actionId,
      missionId: item.scope.missionId,
      status,
      provider: 'atlas-simulator',
      providerReference: effect.providerReference ?? effect.effectKey,
      resultDigest: effect.resultDigest,
      occurredAt: effect.appliedAt,
      recordedAt,
      integrity: undefined,
    },
  };
  const receipt = { ...unsigned, spec: { ...unsigned.spec, integrity: { digest: digestContract(unsigned), issuer: 'atlas.local.outbox-worker' } } } as Receipt;
  const validation = validateReceipt(receipt);
  if (!validation.valid || !validation.value || !verifyReceiptIntegrity(validation.value)) throw new OutboxWorkerError('OUTBOX_INVALID_STATE', `Canonical receipt ${receiptId} failed integrity validation`);
  return validation.value;
}

function validateState(value: unknown): OutboxWorkerState {
  if (!isRecord(value) || value.schemaVersion !== OUTBOX_WORKER_SCHEMA || !Array.isArray(value.items) || !Array.isArray(value.effects) || !Array.isArray(value.receipts)) throw new Error('invalid schema');
  const items = value.items as OutboxWorkerItem[];
  const effects = value.effects as OutboxWorkerEffect[];
  const ambiguities = (Array.isArray(value.ambiguities) ? value.ambiguities : []) as OutboxWorkerAmbiguity[];
  const receipts = value.receipts as Receipt[];
  if (items.some((item) => !validItem(item)) || effects.some((effect) => !validEffect(effect)) || ambiguities.some((ambiguity) => !validAmbiguity(ambiguity)) || receipts.some((receipt) => !validReceipt(receipt))) throw new Error('invalid outbox worker record');
  if (new Set(items.map((item) => item.id)).size !== items.length) throw new Error('duplicate outbox item identity');
  if (new Set(effects.map((effect) => effect.effectKey)).size !== effects.length) throw new Error('duplicate effect identity');
  if (new Set(ambiguities.map((ambiguity) => ambiguity.effectKey)).size !== ambiguities.length) throw new Error('duplicate ambiguity identity');
  if (new Set(receipts.map((receipt) => receipt.metadata.id)).size !== receipts.length) throw new Error('duplicate receipt identity');
  return freezeState({ schemaVersion: OUTBOX_WORKER_SCHEMA, items, effects, ambiguities, receipts });
}

function validItem(value: unknown): value is OutboxWorkerItem {
  return isRecord(value) && typeof value.id === 'string' && typeof value.actionId === 'string' && typeof value.idempotencyKey === 'string' && isScope(value.scope) && typeof value.effectKey === 'string' && typeof value.payloadDigest === 'string' && ['QUEUED', 'CLAIMED', 'RETRY_SCHEDULED', 'SUCCEEDED', 'FAILED'].includes(String(value.status)) && Number.isSafeInteger(value.attempts) && Number(value.attempts) >= 0 && (value.ownerId === null || typeof value.ownerId === 'string') && (value.leaseId === null || typeof value.leaseId === 'string') && (value.leaseExpiresAt === null || typeof value.leaseExpiresAt === 'string') && (value.nextAttemptAt === null || typeof value.nextAttemptAt === 'string') && (value.resultDigest === null || typeof value.resultDigest === 'string') && (value.providerReference === null || typeof value.providerReference === 'string') && (value.providerCode === null || typeof value.providerCode === 'string') && typeof value.createdAt === 'string' && typeof value.updatedAt === 'string';
}

function validEffect(value: unknown): value is OutboxWorkerEffect {
  return isRecord(value) && typeof value.effectKey === 'string' && typeof value.outboxId === 'string' && typeof value.actionId === 'string' && ['SUCCEEDED', 'FAILED'].includes(String(value.status)) && typeof value.resultDigest === 'string' && (value.providerReference === null || typeof value.providerReference === 'string') && (value.providerCode === null || typeof value.providerCode === 'string') && typeof value.appliedAt === 'string';
}

function validAmbiguity(value: unknown): value is OutboxWorkerAmbiguity {
  return isRecord(value) && typeof value.effectKey === 'string' && typeof value.outboxId === 'string' && typeof value.actionId === 'string' && typeof value.startedAt === 'string';
}

function validReceipt(value: unknown): value is Receipt {
  const result = validateReceipt(value);
  if (!result.valid || !result.value) return false;
  return verifyReceiptIntegrity(result.value);
}

function replaceItem(state: OutboxWorkerState, index: number, item: OutboxWorkerItem): OutboxWorkerState {
  const items = [...state.items];
  items[index] = item;
  return freezeState({ ...state, items });
}

function isScope(value: unknown): value is ActionScope {
  if (!isRecord(value)) return false;
  const keys = ['tenantId', 'organisationId', 'projectId', 'environmentId', 'missionId'] as const;
  return Object.keys(value).length === keys.length && keys.every((key) => typeof value[key] === 'string' && Boolean(value[key].trim()));
}

function sameScope(left: ActionScope, right: ActionScope): boolean {
  return left.tenantId === right.tenantId && left.organisationId === right.organisationId && left.projectId === right.projectId && left.environmentId === right.environmentId && left.missionId === right.missionId;
}

function ttl(value: number | undefined): number {
  const resolved = value ?? DEFAULT_OUTBOX_LEASE_TTL_MS;
  if (!Number.isInteger(resolved) || resolved < 100 || resolved > 86_400_000) throw new OutboxWorkerError('OUTBOX_INVALID_STATE', 'Outbox lease TTL must be an integer between 100ms and 24 hours');
  return resolved;
}

function parseTimestamp(value: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new OutboxWorkerError('OUTBOX_INVALID_STATE', `Invalid outbox timestamp: ${value}`);
  return parsed;
}

function timestampAfter(now: string, durationMs: number): string {
  return new Date(parseTimestamp(now) + durationMs).toISOString();
}

function freezeState(value: OutboxWorkerState): OutboxWorkerState {
  return freezeClone(value);
}

function freezeClone<T>(value: T): T {
  return deepFreeze(JSON.parse(JSON.stringify(value)) as T);
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) deepFreeze(nested);
  }
  return value;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (isRecord(value)) return `{${Object.entries(value).filter(([, nested]) => nested !== undefined).sort(([left], [right]) => left.localeCompare(right)).map(([key, nested]) => `${JSON.stringify(key)}:${stableJson(nested)}`).join(',')}}`;
  return JSON.stringify(value);
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
