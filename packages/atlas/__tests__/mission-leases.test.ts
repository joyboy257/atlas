import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_MISSION_LEASE_TTL_MS,
  MISSION_LEASE_SCHEMA,
  createMissionLeaseStore,
} from '../src/mission-leases.js';

const scope = {
  tenantId: 'tenant-a',
  organisationId: 'organisation-a',
  projectId: 'project-a',
  environmentId: 'local',
};
const otherScope = { ...scope, tenantId: 'tenant-b' };
const roots: string[] = [];
const t0 = '2026-07-29T12:00:00.000Z';

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'atlas-mission-leases-'));
  roots.push(root);
  const store = createMissionLeaseStore(root);
  await store.migrate();
  return { root, store };
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

function spawnWorker(
  root: string,
  mode: string,
  ownerId: string,
  now: string,
  ttlMs: number,
): { child: ReturnType<typeof spawn>; output: () => string } {
  const workerPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'mission-worker.mjs');
  const child = spawn(process.execPath, [workerPath, mode, root, ownerId, now, String(ttlMs)], {
    cwd: path.dirname(workerPath),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk: string) => { output += chunk; });
  return { child, output: () => output };
}

async function waitForOutput(
  output: () => string,
  marker: string,
  timeoutMs = 5_000,
): Promise<void> {
  const startedAt = Date.now();
  while (!output().includes(marker)) {
    if (Date.now() - startedAt >= timeoutMs) throw new Error(`Timed out waiting for worker output: ${marker}`);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

async function waitForWorker(child: ReturnType<typeof spawn>): Promise<number | null> {
  const [code] = await once(child, 'exit') as [number | null, string | null];
  return code;
}

describe('MissionLeaseStore', () => {
  it('persists a tenant-scoped lease and renews the same owner atomically', async () => {
    const { root, store } = await fixture();
    const first = await store.acquire({ scope, missionId: 'mission-1', ownerId: 'worker-a', now: t0, ttlMs: 1_000 });
    const renewed = await store.acquire({ scope, missionId: 'mission-1', ownerId: 'worker-a', now: '2026-07-29T12:00:00.500Z', ttlMs: 1_000 });

    expect(renewed.leaseId).toBe(first.leaseId);
    expect(renewed.heartbeatAt).toBe('2026-07-29T12:00:00.500Z');
    expect(renewed.expiresAt).toBe('2026-07-29T12:00:01.500Z');
    expect(await store.read(scope)).toEqual([renewed]);
    expect(JSON.parse(await readFile(path.join(root, '.atlas', 'mission-leases.json'), 'utf8'))).toMatchObject({
      schemaVersion: MISSION_LEASE_SCHEMA,
      leases: [{ leaseId: first.leaseId, status: 'ACTIVE' }],
    });
  });

  it('rejects a competing owner but permits a different tenant scope', async () => {
    const { store } = await fixture();
    await store.acquire({ scope, missionId: 'mission-1', ownerId: 'worker-a', now: t0 });

    await expect(store.acquire({ scope, missionId: 'mission-1', ownerId: 'worker-b', now: t0 })).rejects.toMatchObject({ code: 'CONFLICT' });
    await expect(store.acquire({ scope: otherScope, missionId: 'mission-1', ownerId: 'worker-b', now: t0 })).resolves.toMatchObject({ ownerId: 'worker-b' });
  });

  it('expires abandoned work and allows a new owner to recover it', async () => {
    const { store } = await fixture();
    const first = await store.acquire({ scope, missionId: 'mission-1', ownerId: 'worker-a', now: t0, ttlMs: 1_000 });
    const recovered = await store.recoverExpired(scope, '2026-07-29T12:00:01.001Z');

    expect(recovered).toEqual([expect.objectContaining({ leaseId: first.leaseId, status: 'EXPIRED' })]);
    await expect(store.acquire({ scope, missionId: 'mission-1', ownerId: 'worker-b', now: '2026-07-29T12:00:01.001Z', ttlMs: 1_000 })).resolves.toMatchObject({ ownerId: 'worker-b', status: 'ACTIVE' });
  });

  it('rejects an older heartbeat without rewinding lease expiry', async () => {
    const { store } = await fixture();
    const lease = await store.acquire({ scope, missionId: 'mission-1', ownerId: 'worker-a', now: t0, ttlMs: 1_000 });

    await expect(store.heartbeat({ scope, missionId: 'mission-1', ownerId: 'worker-a', leaseId: lease.leaseId, now: '2026-07-29T11:59:59.000Z', ttlMs: 1_000 })).rejects.toMatchObject({ code: 'CONFLICT' });
    expect(await store.read(scope)).toEqual([lease]);
  });

  it('rejects a release timestamp that rewinds the lease state', async () => {
    const { store } = await fixture();
    const lease = await store.acquire({ scope, missionId: 'mission-1', ownerId: 'worker-a', now: t0, ttlMs: 1_000 });

    await expect(store.release({
      scope,
      missionId: 'mission-1',
      ownerId: 'worker-a',
      leaseId: lease.leaseId,
      now: '2026-07-29T11:59:59.000Z',
    })).rejects.toMatchObject({ code: 'CONFLICT' });
    expect(await store.read(scope)).toEqual([lease]);
  });

  it('rejects lease scopes with unexpected properties before persistence', async () => {
    const { store } = await fixture();
    await expect(store.acquire({
      scope: { ...scope, unexpected: 'value' } as typeof scope,
      missionId: 'mission-extra-scope',
      ownerId: 'worker-a',
      now: t0,
    })).rejects.toMatchObject({ code: 'AUTHORIZATION_FAILED' });
  });

  it('rejects contradictory persisted lease ownership as local state corruption', async () => {
    const { root, store } = await fixture();
    const lease = await store.acquire({ scope, missionId: 'mission-1', ownerId: 'worker-a', now: t0, ttlMs: 1_000 });
    const statePath = path.join(root, '.atlas', 'mission-leases.json');
    const state = JSON.parse(await readFile(statePath, 'utf8')) as { leases: unknown[] };
    state.leases.push({ ...lease, leaseId: 'lease-conflict', ownerId: 'worker-b' });
    await writeFile(statePath, `${JSON.stringify(state)}\n`);

    await expect(store.read(scope)).rejects.toMatchObject({ code: 'LOCAL_STATE_ERROR' });
  });

  it('requires the lease owner and identity for heartbeat and release', async () => {
    const { store } = await fixture();
    const lease = await store.acquire({ scope, missionId: 'mission-1', ownerId: 'worker-a', now: t0, ttlMs: DEFAULT_MISSION_LEASE_TTL_MS });

    await expect(store.heartbeat({ scope, missionId: 'mission-1', ownerId: 'worker-b', leaseId: lease.leaseId, now: t0 })).rejects.toMatchObject({ code: 'CONFLICT' });
    await expect(store.release({ scope, missionId: 'mission-1', ownerId: 'worker-a', leaseId: lease.leaseId, now: '2026-07-29T12:00:00.100Z' })).resolves.toMatchObject({ status: 'RELEASED' });
    await expect(store.heartbeat({ scope, missionId: 'mission-1', ownerId: 'worker-a', leaseId: lease.leaseId, now: '2026-07-29T12:00:00.200Z' })).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('expires only leases in the requested scope', async () => {
    const { store } = await fixture();
    const local = await store.acquire({ scope, missionId: 'mission-local', ownerId: 'worker-a', now: t0, ttlMs: 1_000 });
    const foreign = await store.acquire({ scope: otherScope, missionId: 'mission-foreign', ownerId: 'worker-b', now: t0, ttlMs: 1_000 });

    await store.recoverExpired(scope, '2026-07-29T12:00:02.000Z');

    expect(await store.read(scope)).toEqual([expect.objectContaining({ leaseId: local.leaseId, status: 'EXPIRED' })]);
    expect(await store.read(otherScope)).toEqual([expect.objectContaining({ leaseId: foreign.leaseId, status: 'ACTIVE' })]);
  });

  it('recovers a lease after its worker process is killed', async () => {
    const { root, store } = await fixture();
    const worker = spawnWorker(root, 'hold', 'worker-killed', t0, 1_000);
    await waitForOutput(worker.output, '"status":"ACTIVE"');
    worker.child.kill('SIGKILL');
    await waitForWorker(worker.child);

    const recovered = await store.recoverExpired(scope, '2026-07-29T12:00:01.001Z');
    expect(recovered).toEqual([expect.objectContaining({ ownerId: 'worker-killed', status: 'EXPIRED' })]);
    await expect(store.acquire({ scope, missionId: 'mission-worker-1', ownerId: 'worker-recovered', now: '2026-07-29T12:00:01.001Z', ttlMs: 1_000 })).resolves.toMatchObject({ ownerId: 'worker-recovered', status: 'ACTIVE' });
  });

  it('allows exactly one of two worker processes to own a Mission', async () => {
    const { root, store } = await fixture();
    const first = spawnWorker(root, 'once', 'worker-process-a', t0, 1_000);
    const second = spawnWorker(root, 'once', 'worker-process-b', t0, 1_000);
    const [firstCode, secondCode] = await Promise.all([waitForWorker(first.child), waitForWorker(second.child)]);
    const outputs = [first.output(), second.output()];
    expect(outputs.filter((output) => output.includes('"status":"ACTIVE"'))).toHaveLength(1);
    expect([firstCode, secondCode].filter((code) => code === 0)).toHaveLength(1);
    expect((await store.read(scope)).filter((lease) => lease.status === 'ACTIVE')).toHaveLength(1);
  });

  it('serializes concurrent acquisition across store instances', async () => {
    const { store } = await fixture();
    const second = createMissionLeaseStore(path.dirname(path.dirname(store.filePath)));
    const results = await Promise.allSettled([
      store.acquire({ scope, missionId: 'mission-1', ownerId: 'worker-a', now: t0 }),
      second.acquire({ scope, missionId: 'mission-1', ownerId: 'worker-b', now: t0 }),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect((await store.read(scope)).filter((lease) => lease.status === 'ACTIVE')).toHaveLength(1);
  });
});
