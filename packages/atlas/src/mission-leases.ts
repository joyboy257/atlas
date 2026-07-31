import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { AtlasCliError } from './errors.js';
import { atomicWrite, ensurePrivateDirectory, readUtf8Safe } from './fs-safety.js';
import { OperationLock } from './operation-journal.js';

export const MISSION_LEASE_SCHEMA = 'atlas.mission-lease-store/v1' as const;
export const MISSION_LEASE_FILE = '.atlas/mission-leases.json' as const;
export const DEFAULT_MISSION_LEASE_TTL_MS = 30_000;

export type MissionLeaseScope = Readonly<{
  tenantId: string;
  organisationId: string;
  projectId: string;
  environmentId: string;
}>;

export type MissionLeaseStatus = 'ACTIVE' | 'EXPIRED' | 'RELEASED';

export type MissionLease = Readonly<{
  leaseId: string;
  missionId: string;
  scope: MissionLeaseScope;
  ownerId: string;
  acquiredAt: string;
  heartbeatAt: string;
  expiresAt: string;
  status: MissionLeaseStatus;
}>;

type MissionLeaseState = Readonly<{
  schemaVersion: typeof MISSION_LEASE_SCHEMA;
  leases: readonly MissionLease[];
}>;

type LeaseOptions = Readonly<{
  scope: MissionLeaseScope;
  missionId: string;
  ownerId: string;
  now: string;
  ttlMs?: number;
}>;

const EMPTY_STATE: MissionLeaseState = Object.freeze({
  schemaVersion: MISSION_LEASE_SCHEMA,
  leases: Object.freeze([]),
});

export class MissionLeaseStore {
  readonly filePath: string;
  private readonly lock: OperationLock;
  private transactionTail: Promise<void> = Promise.resolve();
  private commitFenceDepth = 0;

  constructor(root: string) {
    this.filePath = path.resolve(root, MISSION_LEASE_FILE);
    this.lock = new OperationLock(root, {
      filePath: path.resolve(root, '.atlas', 'mission-leases.lock'),
    });
  }

  async migrate(): Promise<MissionLeaseState> {
    return this.transaction(async (state) => ({ state, value: state }));
  }

  async read(scope: MissionLeaseScope): Promise<readonly MissionLease[]> {
    const state = await this.load();
    return freezeClone(state.leases.filter((lease) => sameScope(lease.scope, scope)));
  }

  async acquire(options: LeaseOptions): Promise<MissionLease> {
    validateLeaseOptions(options);
    return this.transaction(async (state) => {
      const nowMs = parseTimestamp(options.now);
      const leases = expireLeases(state.leases, nowMs, options.scope);
      const active = leases.find(
        (lease) =>
          lease.status === 'ACTIVE' &&
          lease.missionId === options.missionId &&
          sameScope(lease.scope, options.scope),
      );
      if (active) {
        if (active.ownerId !== options.ownerId) {
          throw leaseConflict(
            `Mission ${options.missionId} is leased by another coordinator`,
            'Wait for the lease to expire or heartbeat the current owner',
          );
        }
        const renewed = renew(active, options.now, ttl(options.ttlMs));
        return { state: withLeases(leases, renewed), value: renewed };
      }
      const lease: MissionLease = {
        leaseId: randomUUID(),
        missionId: options.missionId,
        scope: freezeClone(options.scope),
        ownerId: options.ownerId,
        acquiredAt: options.now,
        heartbeatAt: options.now,
        expiresAt: timestampAfter(options.now, ttl(options.ttlMs)),
        status: 'ACTIVE',
      };
      return { state: withLeases(leases, lease), value: lease };
    });
  }

  async heartbeat(options: LeaseOptions & { leaseId: string }): Promise<MissionLease> {
    validateLeaseOptions(options);
    return this.transaction(async (state) => {
      const leases = expireLeases(state.leases, parseTimestamp(options.now), options.scope);
      const current = findOwned(leases, options);
      const renewed = renew(current, options.now, ttl(options.ttlMs));
      return { state: withLeases(leases, renewed), value: renewed };
    });
  }

  async release(options: Readonly<{
    scope: MissionLeaseScope;
    missionId: string;
    ownerId: string;
    leaseId: string;
    now: string;
  }>): Promise<MissionLease> {
    validateLeaseOptions(options);
    return this.transaction(async (state) => {
      const leases = expireLeases(state.leases, parseTimestamp(options.now), options.scope);
      const current = findOwned(leases, options);
      if (parseTimestamp(options.now) < parseTimestamp(current.heartbeatAt)) {
        throw leaseConflict(
          'Mission lease release timestamp is older than the current lease heartbeat',
          'Use a monotonic coordinator clock before releasing the lease',
        );
      }
      const released: MissionLease = { ...current, heartbeatAt: options.now, expiresAt: options.now, status: 'RELEASED' };
      return { state: withLeases(leases, released), value: released };
    });
  }

  async withCommitFence<T>(
    options: Readonly<{
      scope: MissionLeaseScope;
      missionId: string;
      ownerId: string;
      leaseId: string;
      now: string;
    }>,
    operation: () => Promise<T>,
  ): Promise<T> {
    validateLeaseOptions(options);
    if (this.commitFenceDepth > 0) {
      const state = await this.load();
      findOwned(state.leases, options);
      this.commitFenceDepth += 1;
      try {
        return await operation();
      } finally {
        this.commitFenceDepth -= 1;
      }
    }
    await acquireWithRetry(this.lock);
    this.commitFenceDepth = 1;
    try {
      const state = await this.load();
      findOwned(state.leases, options);
      return await operation();
    } finally {
      this.commitFenceDepth = 0;
      await this.lock.release();
    }
  }

  async recoverExpired(scope: MissionLeaseScope, now: string): Promise<readonly MissionLease[]> {
    parseTimestamp(now);
    return this.transaction(async (state) => {
      const expired = expireLeases(state.leases, parseTimestamp(now), scope);
      const recovered = expired.filter(
        (lease, index) =>
          sameScope(lease.scope, scope) &&
          lease.status === 'EXPIRED' &&
          state.leases[index]?.status === 'ACTIVE',
      );
      return {
        state: { ...state, leases: expired },
        value: recovered,
      };
    });
  }

  private async transaction<T>(operation: (state: MissionLeaseState) => Promise<{ state: MissionLeaseState; value: T }>): Promise<T> {
    const previous = this.transactionTail;
    let release!: () => void;
    this.transactionTail = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try {
      await acquireWithRetry(this.lock);
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

  private async load(): Promise<MissionLeaseState> {
    const raw = await readUtf8Safe(this.filePath);
    if (raw === null) return EMPTY_STATE;
    try {
      const parsed = JSON.parse(raw) as unknown;
      return freezeClone(validateLeaseState(parsed));
    } catch (error) {
      if (error instanceof AtlasCliError) throw error;
      throw new AtlasCliError('LOCAL_STATE_ERROR', `Invalid Atlas Mission lease state: ${String(error)}`, {
        nextAction: 'Repair or remove the verified local Mission lease state before retrying',
      });
    }
  }

  private async save(state: MissionLeaseState): Promise<void> {
    await ensurePrivateDirectory(path.dirname(this.filePath));
    await atomicWrite(this.filePath, `${JSON.stringify(state, null, 2)}\n`);
  }
}

export function createMissionLeaseStore(root: string): MissionLeaseStore {
  return new MissionLeaseStore(root);
}

function validateLeaseState(value: unknown): MissionLeaseState {
  if (!isRecord(value) || value.schemaVersion !== MISSION_LEASE_SCHEMA || !Array.isArray(value.leases)) {
    throw new Error('invalid lease schema');
  }
  const leases = value.leases;
  if (leases.some((lease) => !validLease(lease))) throw new Error('invalid lease record');
  const leaseIds = new Set<string>();
  const activeMissions = new Set<string>();
  for (const lease of leases as MissionLease[]) {
    if (leaseIds.has(lease.leaseId)) throw new Error(`duplicate lease ID: ${lease.leaseId}`);
    leaseIds.add(lease.leaseId);
    if (!validScope(lease.scope)) throw new Error(`invalid lease scope for ${lease.leaseId}`);
    const acquiredAt = parsePersistedTimestamp(lease.acquiredAt);
    const heartbeatAt = parsePersistedTimestamp(lease.heartbeatAt);
    const expiresAt = parsePersistedTimestamp(lease.expiresAt);
    if (heartbeatAt < acquiredAt || (lease.status === 'ACTIVE' && expiresAt <= heartbeatAt)) {
      throw new Error(`invalid lease timestamps for ${lease.leaseId}`);
    }
    if (lease.status === 'ACTIVE') {
      const missionKey = `${scopeKey(lease.scope)}:${lease.missionId}`;
      if (activeMissions.has(missionKey)) throw new Error(`multiple active leases for ${missionKey}`);
      activeMissions.add(missionKey);
    }
  }
  return { schemaVersion: MISSION_LEASE_SCHEMA, leases: leases as MissionLease[] };
}

function findOwned(leases: readonly MissionLease[], options: LeaseOptions & { leaseId: string }): MissionLease {
  const current = leases.find((lease) => lease.leaseId === options.leaseId);
  if (!current || current.missionId !== options.missionId || !sameScope(current.scope, options.scope) || current.ownerId !== options.ownerId) {
    throw leaseConflict('Mission lease ownership does not match the current coordinator', 'Use the current lease identity and server-derived Mission scope');
  }
  if (current.status !== 'ACTIVE') throw leaseConflict(`Mission lease is ${current.status.toLowerCase()}`, 'Acquire a new lease before continuing');
  throwIfExpired(current, options.now);
  return current;
}

function expireLeases(
  leases: readonly MissionLease[],
  nowMs: number,
  scope: MissionLeaseScope,
): readonly MissionLease[] {
  return leases.map((lease) => sameScope(lease.scope, scope) && lease.status === 'ACTIVE' && parseTimestamp(lease.expiresAt) <= nowMs
    ? { ...lease, status: 'EXPIRED' as const }
    : lease);
}

function renew(lease: MissionLease, now: string, ttlMs: number): MissionLease {
  const nowMs = parseTimestamp(now);
  if (nowMs < parseTimestamp(lease.heartbeatAt)) {
    throw leaseConflict('Mission lease heartbeat is older than the current lease heartbeat', 'Use a monotonic coordinator clock before renewing the lease');
  }
  return { ...lease, heartbeatAt: now, expiresAt: timestampAfter(now, ttlMs), status: 'ACTIVE' };
}

function withLeases(leases: readonly MissionLease[], replacement: MissionLease): MissionLeaseState {
  return { schemaVersion: MISSION_LEASE_SCHEMA, leases: leases.map((lease) => lease.leaseId === replacement.leaseId ? replacement : lease).concat(leases.some((lease) => lease.leaseId === replacement.leaseId) ? [] : [replacement]) };
}

function validScope(scope: unknown): scope is MissionLeaseScope {
  if (!isRecord(scope)) return false;
  const keys = ['tenantId', 'organisationId', 'projectId', 'environmentId'] as const;
  return Object.keys(scope).length === keys.length && keys.every((key) => typeof scope[key] === 'string' && scope[key].trim().length > 0);
}

function scopeKey(scope: MissionLeaseScope): string {
  return [scope.tenantId, scope.organisationId, scope.projectId, scope.environmentId].join('');
}

function parsePersistedTimestamp(value: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error(`invalid timestamp: ${value}`);
  return parsed;
}

function validateLeaseOptions(options: Readonly<{ scope: MissionLeaseScope; missionId: string; ownerId: string; now: string; ttlMs?: number }>): void {
  const scopeKeys = ['tenantId', 'organisationId', 'projectId', 'environmentId'] as const;
  if (!isRecord(options.scope) || Object.keys(options.scope).length !== scopeKeys.length || scopeKeys.some((key) => typeof options.scope[key] !== 'string' || !options.scope[key].trim())) throw new AtlasCliError('AUTHORIZATION_FAILED', 'Mission lease scope must be a complete non-empty server-derived scope');
  if (!options.missionId.trim() || !options.ownerId.trim()) throw new AtlasCliError('USAGE_ERROR', 'Mission lease requires a Mission ID and coordinator owner ID');
  parseTimestamp(options.now);
  ttl(options.ttlMs);
}

function throwIfExpired(lease: MissionLease, now: string): void {
  if (parseTimestamp(lease.expiresAt) <= parseTimestamp(now)) throw leaseConflict('Mission lease has expired', 'Recover the expired lease and acquire a new owner lease');
}

function ttl(value: number | undefined): number {
  const resolved = value ?? DEFAULT_MISSION_LEASE_TTL_MS;
  if (!Number.isInteger(resolved) || resolved < 100 || resolved > 86_400_000) throw new AtlasCliError('USAGE_ERROR', 'Mission lease TTL must be an integer between 100ms and 24 hours');
  return resolved;
}

function timestampAfter(now: string, durationMs: number): string { return new Date(parseTimestamp(now) + durationMs).toISOString(); }
function parseTimestamp(value: string): number { const parsed = Date.parse(value); if (!Number.isFinite(parsed)) throw new AtlasCliError('USAGE_ERROR', `Invalid Mission lease timestamp: ${value}`); return parsed; }
function sameScope(left: MissionLeaseScope, right: MissionLeaseScope): boolean { return left.tenantId === right.tenantId && left.organisationId === right.organisationId && left.projectId === right.projectId && left.environmentId === right.environmentId; }
function leaseConflict(message: string, nextAction: string): AtlasCliError { return new AtlasCliError('CONFLICT', message, { retryable: true, nextAction }); }
function validLease(value: unknown): value is MissionLease {
  return isRecord(value) &&
    typeof value.leaseId === 'string' && value.leaseId.trim().length > 0 &&
    typeof value.missionId === 'string' && value.missionId.trim().length > 0 &&
    typeof value.ownerId === 'string' && value.ownerId.trim().length > 0 &&
    validScope(value.scope) &&
    ['ACTIVE', 'EXPIRED', 'RELEASED'].includes(String(value.status)) &&
    typeof value.acquiredAt === 'string' &&
    typeof value.heartbeatAt === 'string' &&
    typeof value.expiresAt === 'string';
}
function isRecord(value: unknown): value is Record<string, any> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function stableJson(value: unknown): string { if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`; if (isRecord(value)) return `{${Object.entries(value).filter(([, nested]) => nested !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([key, nested]) => `${JSON.stringify(key)}:${stableJson(nested)}`).join(',')}}`; return JSON.stringify(value); }
function freezeClone<T>(value: T): T { return deepFreeze(JSON.parse(JSON.stringify(value)) as T); }
function deepFreeze<T>(value: T): T { if (value && typeof value === 'object') { Object.freeze(value); for (const nested of Object.values(value as Record<string, unknown>)) deepFreeze(nested); } return value; }
async function acquireWithRetry(lock: OperationLock): Promise<void> { for (let attempt = 0; ; attempt += 1) { try { await lock.acquire(); return; } catch (error) { if (!(error instanceof AtlasCliError) || error.code !== 'LOCAL_STATE_ERROR' || attempt >= 50) throw error; await new Promise((resolve) => setTimeout(resolve, Math.min(10, attempt + 1))); } } }
