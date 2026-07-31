import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  LocalOutboxWorker,
  OutboxWorkerError,
  deterministicOutboxEffectKey,
} from '../src/outbox-worker.js';
import { verifyReceiptIntegrity } from '../src/action-contract.js';

const scope = {
  tenantId: 'tenant-local',
  organisationId: 'organisation-local',
  projectId: 'project-local',
  environmentId: 'local',
  missionId: 'mission-outbox-001',
} as const;
const t0 = '2026-07-31T12:00:00.000Z';
const t1 = '2026-07-31T12:00:01.001Z';
const t2 = '2026-07-31T12:00:02.001Z';
const roots: string[] = [];

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'atlas-outbox-worker-'));
  roots.push(root);
  const clock = () => t0;
  const worker = await LocalOutboxWorker.open({ root, clock });
  return { root, worker };
}

async function enqueue(worker: LocalOutboxWorker, id = 'outbox-001') {
  return worker.enqueue({
    id,
    actionId: `action-${id}`,
    idempotencyKey: `effect-${id}`,
    scope,
    payload: { message: 'booking confirmed', nested: { b: 2, a: 1 } },
    createdAt: t0,
  });
}

const success = (calls: string[]) => ({ effectKey, attempt }: { effectKey: string; attempt: number }) => {
  calls.push(`${effectKey}:${attempt}`);
  return { status: 'succeeded' as const, result: { accepted: true }, providerReference: `provider-${effectKey}` };
};

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('LocalOutboxWorker', () => {
  it('derives a stable effect key and rejects conflicting enqueue replay', async () => {
    const { worker } = await fixture();
    const first = await enqueue(worker);
    const replay = await enqueue(worker);

    expect(deterministicOutboxEffectKey({ actionId: 'a', idempotencyKey: 'k', scope, payload: { b: 2, a: 1 } }))
      .toBe(deterministicOutboxEffectKey({ actionId: 'a', idempotencyKey: 'k', scope, payload: { a: 1, b: 2 } }));
    expect(deterministicOutboxEffectKey({ actionId: 'a', idempotencyKey: 'k', scope, payload: { changed: true } }))
      .toBe(deterministicOutboxEffectKey({ actionId: 'a', idempotencyKey: 'k', scope, payload: { changed: false } }));
    expect(replay).toMatchObject({ replayed: true, item: { effectKey: first.item.effectKey } });
    await expect(worker.enqueue({
      id: 'outbox-002',
      actionId: 'action-outbox-001',
      idempotencyKey: 'effect-outbox-001',
      scope,
      payload: { message: 'changed content' },
      createdAt: t0,
    })).rejects.toMatchObject({ code: 'OUTBOX_IDEMPOTENCY_MISMATCH' });
  });

  it('fences competing workers and recovers an expired claim', async () => {
    const { root, worker } = await fixture();
    await enqueue(worker);
    const second = await LocalOutboxWorker.open({ root, clock: () => t0 });
    const firstClaim = await worker.claim('outbox-001', 'worker-a', { now: t0, leaseTtlMs: 1_000 });

    await expect(second.claim('outbox-001', 'worker-b', { now: t0, leaseTtlMs: 1_000 })).rejects.toMatchObject({ code: 'OUTBOX_CONFLICT' });
    const recovered = await second.recoverExpired({ now: t1 });
    expect(recovered).toMatchObject([{ id: 'outbox-001', status: 'RETRY_SCHEDULED', ownerId: null, leaseId: null }]);
    const replacement = await second.claim('outbox-001', 'worker-b', { now: t1, leaseTtlMs: 1_000 });

    expect(replacement.leaseId).not.toBe(firstClaim.leaseId);
    expect(replacement.item.attempts).toBe(2);
  });

  it('reconciles a crash after the simulated effect without repeating the effect', async () => {
    const { worker } = await fixture();
    await enqueue(worker);
    const calls: string[] = [];
    const simulate = success(calls);

    await expect(worker.process('outbox-001', 'worker-a', simulate, { now: t0, leaseTtlMs: 1_000, fault: 'after_effect' }))
      .rejects.toMatchObject({ code: 'OUTBOX_FAULT_INJECTED' });
    expect(calls).toHaveLength(1);
    expect((await worker.readState()).effects).toHaveLength(1);
    expect((await worker.readItem('outbox-001'))?.status).toBe('CLAIMED');

    const replay = await worker.retry('outbox-001', 'worker-b', async () => {
      throw new Error('effect must not run again');
    }, { now: t1, leaseTtlMs: 1_000 });

    expect(replay.replayed).toBe(true);
    expect(replay.item.status).toBe('SUCCEEDED');
    expect(calls).toHaveLength(1);
    expect(await worker.readReceipts()).toHaveLength(1);
    expect(verifyReceiptIntegrity(replay.receipt)).toBe(true);
  });

  it('requires reconciliation after the provider effect occurs before the callback throws', async () => {
    const { worker } = await fixture();
    await enqueue(worker);
    let providerCalls = 0;
    await expect(worker.process('outbox-001', 'worker-a', async () => {
      providerCalls += 1;
      throw new Error('provider response lost after effect');
    }, { now: t0, leaseTtlMs: 1_000 })).rejects.toThrow('provider response lost after effect');
    expect(providerCalls).toBe(1);

    await expect(worker.retry('outbox-001', 'worker-b', async () => {
      providerCalls += 1;
      throw new Error('must not resend ambiguous effect');
    }, { now: t1, leaseTtlMs: 1_000 })).rejects.toMatchObject({ code: 'OUTBOX_CONFLICT' });
    expect(providerCalls).toBe(1);

    const reconciled = await worker.retry('outbox-001', 'worker-b', async () => {
      providerCalls += 1;
      throw new Error('simulateEffect must remain unused during reconciliation');
    }, {
      now: t1,
      leaseTtlMs: 1_000,
      reconcileEffect: () => ({ status: 'succeeded' as const, result: { accepted: true }, providerReference: 'provider-reconciled' }),
    });
    expect(reconciled.item.status).toBe('SUCCEEDED');
    expect(reconciled.replayed).toBe(false);
    expect(providerCalls).toBe(1);
  });

  it('leaves no effect behind when a crash occurs before simulation and retries after lease expiry', async () => {
    const { worker } = await fixture();
    await enqueue(worker);
    let calls = 0;

    await expect(worker.process('outbox-001', 'worker-a', async () => {
      calls += 1;
      return { status: 'succeeded' as const, result: { accepted: true } };
    }, { now: t0, leaseTtlMs: 1_000, fault: 'before_effect' })).rejects.toMatchObject({ code: 'OUTBOX_FAULT_INJECTED' });
    expect(calls).toBe(0);
    expect((await worker.readState()).effects).toHaveLength(0);

    const result = await worker.retry('outbox-001', 'worker-b', async () => {
      calls += 1;
      return { status: 'succeeded' as const, result: { accepted: true } };
    }, { now: t1, leaseTtlMs: 1_000 });

    expect(result.item.status).toBe('SUCCEEDED');
    expect(calls).toBe(1);
  });

  it('schedules transient failures, blocks early retry, and records a canonical success on retry', async () => {
    const { worker } = await fixture();
    await enqueue(worker);
    let calls = 0;
    const first = await worker.process('outbox-001', 'worker-a', async () => {
      calls += 1;
      return { status: 'retryable_failure' as const, providerCode: 'TEMPORARY_UNAVAILABLE' };
    }, { now: t0, leaseTtlMs: 1_000 });

    expect(first.item).toMatchObject({ status: 'RETRY_SCHEDULED', attempts: 1, providerCode: 'TEMPORARY_UNAVAILABLE' });
    expect(first.receipt.spec.status).toBe('FAILED');
    await expect(worker.retry('outbox-001', 'worker-a', async () => ({ status: 'succeeded' as const }), { now: t0, leaseTtlMs: 1_000 }))
      .rejects.toMatchObject({ code: 'OUTBOX_RETRY_NOT_READY' });

    const second = await worker.retry('outbox-001', 'worker-a', async () => {
      calls += 1;
      return { status: 'succeeded' as const, result: { accepted: true }, providerReference: 'provider-final' };
    }, { now: t2, leaseTtlMs: 1_000 });

    expect(second.item.status).toBe('SUCCEEDED');
    expect(calls).toBe(2);
    expect(await worker.readReceipts()).toHaveLength(2);
    expect((await worker.readEffects())[0]?.status).toBe('SUCCEEDED');
  });

  it('permits same-owner lease renewal and reclaims the item after expiry', async () => {
    const { worker } = await fixture();
    await enqueue(worker);
    const first = await worker.claim('outbox-001', 'worker-a', { now: t0, leaseTtlMs: 1_000 });
    await expect(worker.claim('outbox-001', 'worker-a', { now: '2026-07-31T12:00:00.500Z', leaseTtlMs: 1_000 }))
      .rejects.toMatchObject({ code: 'OUTBOX_CONFLICT' });
    const renewed = await worker.claim('outbox-001', 'worker-a', { now: '2026-07-31T12:00:00.500Z', leaseTtlMs: 1_000, leaseId: first.leaseId });
    expect(renewed.leaseId).toBe(first.leaseId);
    const processed = await worker.process('outbox-001', 'worker-a', success([]), { now: t2, leaseTtlMs: 1_000, leaseId: renewed.leaseId });
    expect(processed.item.status).toBe('SUCCEEDED');
    expect(processed.item.attempts).toBe(2);
  });
});
