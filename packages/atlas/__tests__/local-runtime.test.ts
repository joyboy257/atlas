import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { AtlasLocalRuntime } from '../src/local-runtime.js';
import { scaffoldAtlasProject, type AtlasScaffoldDependencies } from '../src/scaffold.js';

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));

function dependencies(): AtlasScaffoldDependencies {
  return {
    runCommand: vi.fn().mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' }),
    inspectGit: vi.fn().mockResolvedValue({ available: true, repository: false, dirty: false, root: null }),
  };
}

async function runtimeFixture() {
  const base = await mkdtemp(path.join(os.tmpdir(), 'atlas-local-runtime-'));
  roots.push(base);
  await scaffoldAtlasProject({ cwd: base, target: 'front-desk', install: false, initializeGit: false, nodeVersion: 'v22.12.0' }, dependencies());
  let milliseconds = Date.parse('2026-07-24T08:00:00.000Z');
  const clock = () => new Date(milliseconds).toISOString();
  const advance = (value: number) => { milliseconds += value; };
  const root = path.join(base, 'front-desk');
  const runtime = await AtlasLocalRuntime.open({ root, clock });
  return { root, runtime, advance, clock };
}

function inbound(overrides: Record<string, unknown> = {}) {
  return {
    message_id: 'msg_001',
    conversation_id: 'conv_001',
    customer_id: 'cust_001',
    channel_id: 'local-web-chat',
    sequence: 1,
    occurred_at: '2026-07-24T08:00:00.000Z',
    text: 'Can I move booking BK-100 to Friday?',
    consent: true,
    within_messaging_window: true,
    ...overrides,
  };
}

describe('Atlas zero-credential local runtime', () => {
  it('creates a real evidence, proposal, policy, and approval chain without committing early', async () => {
    const { runtime } = await runtimeFixture();

    const result = await runtime.receiveMessage(inbound());
    const snapshot = runtime.snapshot();

    expect(result.status).toBe('approval_pending');
    expect(result.fixture_model).toBe('atlas.local-fixture/v1');
    expect(result.evidence).toMatchObject({ source: 'knowledge/booking-policy.md' });
    expect(result.proposal).toMatchObject({ tool_id: 'front-desk.bookings.reschedule', risk: 'high', execution: 'commit' });
    expect(result.policy).toMatchObject({ decision: 'approval_required' });
    expect(result.approval.status).toBe('pending');
    expect(snapshot.actions).toHaveLength(0);
    expect(snapshot.outbox).toHaveLength(0);
    expect(snapshot.traces[0]?.events.map((event) => event.type)).toEqual(expect.arrayContaining([
      'message.accepted',
      'knowledge.retrieved',
      'tool.proposed',
      'policy.decided',
      'approval.requested',
    ]));
  });

  it('approves, commits exactly once, creates an outbox delivery, and binds receipts', async () => {
    const { runtime } = await runtimeFixture();
    const pending = await runtime.receiveMessage(inbound());

    const approved = await runtime.decideApproval(pending.approval.id, { decision: 'approved', operator_id: 'operator_001' });
    const replayed = await runtime.decideApproval(pending.approval.id, { decision: 'approved', operator_id: 'operator_001' });
    const snapshot = runtime.snapshot();

    expect(approved.status).toBe('committed');
    expect(replayed.replayed).toBe(true);
    expect(replayed.action_receipt.receipt_id).toBe(approved.action_receipt.receipt_id);
    expect(snapshot.actions).toHaveLength(1);
    expect(snapshot.bookings['BK-100']?.scheduled_for).toBe('Friday');
    expect(snapshot.outbox).toHaveLength(1);
    expect(snapshot.outbox[0]).toMatchObject({ state: 'queued', conversation_id: 'conv_001' });
    expect(approved.trace.events.map((event) => event.type)).toEqual(expect.arrayContaining([
      'approval.approved',
      'action.committed',
      'outbox.enqueued',
      'outcome.recorded',
    ]));
    expect(approved.receipts.map((receipt) => receipt.kind)).toEqual(expect.arrayContaining([
      'approval', 'action', 'outcome', 'outbox',
    ]));
  });

  it('replays an identical inbound message and rejects an idempotency mismatch', async () => {
    const { runtime } = await runtimeFixture();
    const first = await runtime.receiveMessage(inbound());
    const duplicate = await runtime.receiveMessage(inbound());

    expect(duplicate.replayed).toBe(true);
    expect(duplicate.trace_id).toBe(first.trace_id);
    expect(runtime.snapshot().messages).toHaveLength(1);

    await expect(runtime.receiveMessage(inbound({ text: 'Different payload for the same message id' }))).rejects.toMatchObject({
      code: 'IDEMPOTENCY_MISMATCH',
    });
  });

  it('holds out-of-order messages and drains them when the missing sequence arrives', async () => {
    const { runtime } = await runtimeFixture();

    const held = await runtime.receiveMessage(inbound({ message_id: 'msg_002', sequence: 2, text: 'What is the booking policy?' }));
    const first = await runtime.receiveMessage(inbound());
    const conversation = runtime.snapshot().conversations['conv_001'];

    expect(held.status).toBe('held_out_of_order');
    expect(first.drained_message_ids).toEqual(['msg_002']);
    expect(conversation?.last_sequence).toBe(2);
    expect(runtime.snapshot().messages.map((message) => message.message_id)).toEqual(['msg_001', 'msg_002']);
  });

  it.each([
    [{ consent: false }, 'consent_required'],
    [{ within_messaging_window: false }, 'messaging_window_closed'],
  ])('fails closed on provider policy violation %j', async (override, reason) => {
    const { runtime } = await runtimeFixture();

    const result = await runtime.receiveMessage(inbound(override));
    const snapshot = runtime.snapshot();

    expect(result.status).toBe('handoff_required');
    expect(result.policy).toMatchObject({ decision: 'blocked', reason });
    expect(snapshot.actions).toHaveLength(0);
    expect(snapshot.outbox).toHaveLength(0);
    expect(snapshot.conversations['conv_001']?.state).toBe('human_handoff');
  });

  it('supports human takeover while approval is pending', async () => {
    const { runtime } = await runtimeFixture();
    const pending = await runtime.receiveMessage(inbound());

    const takeover = await runtime.takeHumanControl('conv_001', { operator_id: 'operator_002', reason: 'Customer requested a person' });
    const snapshot = runtime.snapshot();

    expect(takeover.state).toBe('human_takeover');
    expect(snapshot.approvals[pending.approval.id]?.status).toBe('cancelled');
    await expect(runtime.decideApproval(pending.approval.id, { decision: 'approved', operator_id: 'operator_002' })).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('fences queued and future inbound messages after human takeover', async () => {
    const { runtime } = await runtimeFixture();
    await runtime.receiveMessage(inbound({ message_id: 'msg_takeover_001', conversation_id: 'conv_takeover_001' }));
    const queued = await runtime.receiveMessage(inbound({
      message_id: 'msg_takeover_002',
      conversation_id: 'conv_takeover_001',
      sequence: 3,
      text: 'Can I move booking BK-100 to Monday?',
    }));
    expect(queued.status).toBe('held_out_of_order');

    const takeover = await runtime.takeHumanControl('conv_takeover_001', {
      operator_id: 'operator-human',
      reason: 'Customer requested a person',
    });
    expect(takeover.scope).toMatchObject({ environment_id: 'local' });
    expect(runtime.snapshot().conversations['conv_takeover_001']?.takeover).toMatchObject({
      operator_id: 'operator-human',
      reason: 'Customer requested a person',
    });
    expect(runtime.pendingMessages('conv_takeover_001')).toHaveLength(0);

    const future = await runtime.receiveMessage(inbound({
      message_id: 'msg_takeover_003',
      conversation_id: 'conv_takeover_001',
      sequence: 4,
      text: 'Can I move booking BK-100 to Tuesday?',
    }));
    expect(future.status).toBe('human_takeover');
    expect(Object.values(runtime.snapshot().proposals)).toEqual([
      expect.objectContaining({ status: 'cancelled' }),
    ]);
    expect(runtime.snapshot().outbox).toEqual([]);
  });

  it('rejects direct commits after approval expiry without mutating runtime state', async () => {
    const { root, runtime, advance } = await runtimeFixture();
    const pending = await runtime.receiveMessage(inbound());
    advance(15 * 60_000 + 1);

    await expect(runtime.commitProposal(pending.proposal.id, {
      idempotency_key: 'direct-expired-commit',
      operator_id: 'operator-expired',
      input: pending.proposal.input,
    })).rejects.toMatchObject({ code: 'CONFLICT' });

    const snapshot = runtime.snapshot();
    expect(snapshot.approvals[pending.approval.id]?.status).toBe('pending');
    expect(snapshot.actions).toHaveLength(0);
    expect(snapshot.outbox).toHaveLength(0);
    expect(snapshot.bookings['BK-100']?.scheduled_for).toBe('Thursday');
    expect(JSON.parse(await readFile(path.join(root, '.atlas/runtime-state.json'), 'utf8')).actions).toEqual([]);
  });

  it('persists an unbound takeover and hydrates its first inbound identity', async () => {
    const { runtime } = await runtimeFixture();
    const takeover = await runtime.takeHumanControl('conv-unbound-takeover', {
      operator_id: 'operator-human',
      reason: 'Scheduled work was handed to a person',
    });
    expect(takeover.state).toBe('human_takeover');

    const fenced = await runtime.receiveMessage(inbound({
      conversation_id: 'conv-unbound-takeover',
      customer_id: 'cust-bound-on-first-inbound',
      channel_id: 'local-web-chat',
    }));
    expect(fenced.status).toBe('human_takeover');
    expect(runtime.snapshot().conversations['conv-unbound-takeover']).toMatchObject({
      customer_id: 'cust-bound-on-first-inbound',
      channel_id: 'local-web-chat',
      state: 'human_takeover',
      takeover: expect.objectContaining({ operator_id: 'operator-human' }),
    });
    expect(runtime.snapshot().actions).toHaveLength(0);
    expect(runtime.snapshot().outbox).toHaveLength(0);
  });

  it('migrates legacy takeover state without allowing operator replacement', async () => {
    const { root, runtime } = await runtimeFixture();
    await runtime.receiveMessage(inbound({ conversation_id: 'conv-legacy-takeover' }));
    await runtime.takeHumanControl('conv-legacy-takeover', {
      operator_id: 'operator-original',
      reason: 'Original customer handoff',
    });

    const statePath = path.join(root, '.atlas/runtime-state.json');
    const persisted = JSON.parse(await readFile(statePath, 'utf8')) as { conversations: Record<string, Record<string, unknown>> };
    delete persisted.conversations['conv-legacy-takeover']!.takeover;
    await writeFile(statePath, `${JSON.stringify(persisted, null, 2)}\n`);

    const restarted = await AtlasLocalRuntime.open({ root, clock: () => '2026-07-24T08:01:00.000Z' });
    expect(restarted.snapshot().conversations['conv-legacy-takeover']?.takeover).toMatchObject({
      operator_id: 'operator-original',
      reason: 'Original customer handoff',
    });
    await expect(restarted.takeHumanControl('conv-legacy-takeover', {
      operator_id: 'operator-replacement',
      reason: 'Replacement handoff',
    })).rejects.toMatchObject({ code: 'AUTHORIZATION_FAILED' });
    expect(restarted.snapshot().conversations['conv-legacy-takeover']?.takeover).toMatchObject({
      operator_id: 'operator-original',
      reason: 'Original customer handoff',
    });
  });

  it('binds approval decisions to the local authority scope and policy record', async () => {
    const { runtime } = await runtimeFixture();
    const pending = await runtime.receiveMessage(inbound());
    expect(pending.approval).toMatchObject({
      policy_ref: 'atlas.local.fixture/high-risk-booking-change/v1',
      scope: { environment_id: 'local' },
    });
    expect(typeof pending.approval.expires_at).toBe('string');

    await expect(runtime.decideApproval(pending.approval.id, {
      decision: 'approved',
      operator_id: 'operator-001',
      scope: { tenant_id: 'wrong', organisation_id: 'wrong', project_id: 'wrong', environment_id: 'local' },
    })).rejects.toMatchObject({ code: 'AUTHORIZATION_FAILED' });
  });

  it('reconciles authoritative delivery callbacks after human takeover without reopening agent control', async () => {
    const { runtime } = await runtimeFixture();
    const pending = await runtime.receiveMessage(inbound());
    const approved = await runtime.decideApproval(pending.approval.id, { decision: 'approved', operator_id: 'operator_001' });
    await runtime.attemptDelivery(approved.outbox.id, { outcome: 'accepted', provider_message_id: 'provider_takeover_callback' });
    await runtime.takeHumanControl('conv_001', { operator_id: 'operator_002', reason: 'Customer requested a person' });

    const callback = await runtime.applyDeliveryCallback({
      callback_id: 'callback_takeover_001',
      provider_message_id: 'provider_takeover_callback',
      state: 'delivered',
      occurred_at: '2026-07-24T08:00:01.000Z',
    });

    expect(callback.delivery).toMatchObject({ state: 'delivered', provider_message_id: 'provider_takeover_callback' });
    expect(callback.receipt).toMatchObject({ kind: 'delivery', outcome: 'delivered' });
    expect(runtime.snapshot().conversations.conv_001).toMatchObject({ state: 'human_takeover' });
  });

  it('rejects a mismatched takeover scope without mutating runtime state', async () => {
    const { runtime } = await runtimeFixture();
    await runtime.receiveMessage(inbound());
    const before = runtime.snapshot();

    await expect(runtime.takeHumanControl('conv_001', {
      operator_id: 'operator_002',
      reason: 'Customer requested a person',
      scope: { tenant_id: 'forged-tenant', organisation_id: 'forged-org', project_id: 'forged-project', environment_id: 'local' },
    })).rejects.toMatchObject({ code: 'AUTHORIZATION_FAILED' });

    expect(runtime.snapshot()).toEqual(before);
  });

  it('retries transient provider failures with deterministic backoff then records delivery', async () => {
    const { runtime, advance } = await runtimeFixture();
    const pending = await runtime.receiveMessage(inbound());
    const approved = await runtime.decideApproval(pending.approval.id, { decision: 'approved', operator_id: 'operator_001' });
    const outboxId = approved.outbox.id;

    const failed = await runtime.attemptDelivery(outboxId, { outcome: 'transient_failure', provider_code: 'TEMPORARY_UNAVAILABLE' });
    expect(failed.delivery.state).toBe('retry_scheduled');
    expect(failed.delivery.retry_after_ms).toBe(1000);
    await expect(runtime.attemptDelivery(outboxId, { outcome: 'delivered' })).rejects.toMatchObject({ code: 'RETRY_NOT_READY' });

    advance(1000);
    const delivered = await runtime.attemptDelivery(outboxId, { outcome: 'delivered', provider_message_id: 'provider_001' });
    expect(delivered.delivery.state).toBe('delivered');
    expect(delivered.delivery.attempts).toBe(2);
    expect(delivered.receipt.kind).toBe('delivery');
    expect(runtime.snapshot().outbox[0]?.state).toBe('delivered');
  });

  it('records permanent provider rejection as a terminal delivery outcome', async () => {
    const { runtime } = await runtimeFixture();
    const pending = await runtime.receiveMessage(inbound());
    const approved = await runtime.decideApproval(pending.approval.id, { decision: 'approved', operator_id: 'operator_001' });

    const rejected = await runtime.attemptDelivery(approved.outbox.id, { outcome: 'permanent_rejection', provider_code: 'RECIPIENT_BLOCKED' });

    expect(rejected.delivery.state).toBe('rejected');
    expect(rejected.receipt.outcome).toBe('rejected');
    await expect(runtime.attemptDelivery(approved.outbox.id, { outcome: 'delivered' })).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('rejects delivered attempts without provider identity', async () => {
    const { runtime } = await runtimeFixture();
    const pending = await runtime.receiveMessage(inbound());
    const approved = await runtime.decideApproval(pending.approval.id, { decision: 'approved', operator_id: 'operator_001' });

    await expect(runtime.attemptDelivery(approved.outbox.id, { outcome: 'delivered' })).rejects.toMatchObject({ code: 'INVALID_MESSAGE' });
    expect(runtime.snapshot().outbox[0]).toMatchObject({ state: 'queued', provider_message_id: null });
  });

  it('applies provider delivery callbacks without allowing state regression', async () => {
    const { runtime } = await runtimeFixture();
    const pending = await runtime.receiveMessage(inbound());
    const approved = await runtime.decideApproval(pending.approval.id, { decision: 'approved', operator_id: 'operator_001' });
    await runtime.attemptDelivery(approved.outbox.id, { outcome: 'accepted', provider_message_id: 'provider_001' });

    const delivered = await runtime.applyDeliveryCallback({
      callback_id: 'cb_001',
      provider_message_id: 'provider_001',
      state: 'delivered',
      occurred_at: '2026-07-24T08:00:01.000Z',
    });
    const duplicate = await runtime.applyDeliveryCallback({
      callback_id: 'cb_001',
      provider_message_id: 'provider_001',
      state: 'delivered',
      occurred_at: '2026-07-24T08:00:01.000Z',
    });

    expect(delivered.delivery.state).toBe('delivered');
    expect(duplicate.replayed).toBe(true);
    await expect(runtime.applyDeliveryCallback({
      callback_id: 'cb_002',
      provider_message_id: 'provider_001',
      state: 'sent',
      occurred_at: '2026-07-24T08:00:02.000Z',
    })).rejects.toMatchObject({ code: 'DELIVERY_STATE_REGRESSION' });
    await expect(runtime.applyDeliveryCallback({
      callback_id: 'cb_003',
      provider_message_id: 'provider_001',
      state: 'failed',
      occurred_at: '2026-07-24T08:00:03.000Z',
    })).rejects.toMatchObject({ code: 'DELIVERY_STATE_REGRESSION' });
    await expect(runtime.applyDeliveryCallback({
      callback_id: 'cb_004',
      provider_message_id: 'provider_001',
      state: 'read',
      occurred_at: '2026-07-24T07:59:59.000Z',
    })).rejects.toMatchObject({ code: 'DELIVERY_STATE_REGRESSION' });
  });

  it('rejects duplicate accepted delivery with a different provider identity', async () => {
    const { runtime } = await runtimeFixture();
    const pending = await runtime.receiveMessage(inbound());
    const approved = await runtime.decideApproval(pending.approval.id, { decision: 'approved', operator_id: 'operator_001' });

    await runtime.attemptDelivery(approved.outbox.id, {
      outcome: 'accepted',
      provider_message_id: 'provider_a',
    });

    await expect(runtime.attemptDelivery(approved.outbox.id, {
      outcome: 'accepted',
      provider_message_id: 'provider_b',
    })).rejects.toMatchObject({ code: 'IDEMPOTENCY_MISMATCH' });

    expect(runtime.snapshot().outbox[0]).toMatchObject({
      state: 'sent',
      provider_message_id: 'provider_a',
    });
  });

  it('rejects provider identity reuse across different outbox messages', async () => {
    const { runtime } = await runtimeFixture();
    const first = await runtime.receiveMessage(inbound({ message_id: 'msg_provider_collision_1', conversation_id: 'conv_provider_collision_1', text: 'What is the booking policy?' }));
    const second = await runtime.receiveMessage(inbound({ message_id: 'msg_provider_collision_2', conversation_id: 'conv_provider_collision_2', text: 'What is the booking policy?' }));

    await runtime.attemptDelivery(first.outbox.id, { outcome: 'accepted', provider_message_id: 'provider_shared' });
    await expect(runtime.attemptDelivery(second.outbox.id, { outcome: 'accepted', provider_message_id: 'provider_shared' }))
      .rejects.toMatchObject({ code: 'IDEMPOTENCY_MISMATCH' });
  });

  it('rejects delivered provider identity reuse across different outbox messages', async () => {
    const { runtime } = await runtimeFixture();
    const first = await runtime.receiveMessage(inbound({ message_id: 'msg_delivered_collision_1', conversation_id: 'conv_delivered_collision_1' }));
    const second = await runtime.receiveMessage(inbound({ message_id: 'msg_delivered_collision_2', conversation_id: 'conv_delivered_collision_2' }));
    const firstApproved = await runtime.decideApproval(first.approval.id, { decision: 'approved', operator_id: 'operator_001' });
    const secondApproved = await runtime.decideApproval(second.approval.id, { decision: 'approved', operator_id: 'operator_001' });

    await runtime.attemptDelivery(firstApproved.outbox.id, { outcome: 'delivered', provider_message_id: 'provider_delivered_shared' });
    await expect(runtime.attemptDelivery(secondApproved.outbox.id, { outcome: 'delivered', provider_message_id: 'provider_delivered_shared' }))
      .rejects.toMatchObject({ code: 'IDEMPOTENCY_MISMATCH' });
  });

  it('replays duplicate accepted delivery with the original provider identity', async () => {
    const { runtime } = await runtimeFixture();
    const pending = await runtime.receiveMessage(inbound());
    const approved = await runtime.decideApproval(pending.approval.id, { decision: 'approved', operator_id: 'operator_001' });

    const first = await runtime.attemptDelivery(approved.outbox.id, {
      outcome: 'accepted',
      provider_message_id: 'provider_a',
    });
    const replay = await runtime.attemptDelivery(approved.outbox.id, {
      outcome: 'accepted',
      provider_message_id: 'provider_a',
    });

    expect(first.delivery.provider_message_id).toBe('provider_a');
    expect(replay).toMatchObject({ replayed: true, delivery: { provider_message_id: 'provider_a', state: 'sent' } });
  });

  it('rejects a stale callback after accepted delivery and preserves provider chronology', async () => {
    const { runtime } = await runtimeFixture();
    const pending = await runtime.receiveMessage(inbound());
    const approved = await runtime.decideApproval(pending.approval.id, { decision: 'approved', operator_id: 'operator_001' });
    await runtime.attemptDelivery(approved.outbox.id, { outcome: 'accepted', provider_message_id: 'provider_accepted' });

    await expect(runtime.applyDeliveryCallback({
      callback_id: 'cb_stale_after_accept',
      provider_message_id: 'provider_accepted',
      state: 'delivered',
      occurred_at: '2026-07-24T07:59:59.000Z',
    })).rejects.toMatchObject({ code: 'DELIVERY_STATE_REGRESSION' });

    expect(runtime.snapshot().outbox[0]).toMatchObject({
      state: 'sent',
      provider_message_id: 'provider_accepted',
      provider_occurred_at: '2026-07-24T08:00:00.000Z',
    });
  });

  it('preserves provider identity when delivery advances after acceptance', async () => {
    const { runtime } = await runtimeFixture();
    const pending = await runtime.receiveMessage(inbound());
    const approved = await runtime.decideApproval(pending.approval.id, { decision: 'approved', operator_id: 'operator_001' });
    await runtime.attemptDelivery(approved.outbox.id, { outcome: 'accepted', provider_message_id: 'provider_stable' });

    await expect(runtime.attemptDelivery(approved.outbox.id, {
      outcome: 'delivered',
      provider_message_id: 'provider_changed',
    })).rejects.toMatchObject({ code: 'IDEMPOTENCY_MISMATCH' });
    expect(runtime.snapshot().outbox[0]?.provider_message_id).toBe('provider_stable');
  });

  it('retries approval replay persistence after the first commit write fails', async () => {
    const { root, runtime, clock } = await runtimeFixture();
    const pending = await runtime.receiveMessage(inbound({ message_id: 'msg-approval-persist-retry' }));
    let fail = true;
    const removeGuard = runtime.addCommitGuard(async (operation) => {
      if (fail) {
        fail = false;
        throw new Error('injected approval persistence failure');
      }
      return operation();
    });
    await expect(runtime.decideApproval(pending.approval.id, { decision: 'approved', operator_id: 'operator_001' })).rejects.toThrow('injected approval persistence failure');
    const recovered = await runtime.decideApproval(pending.approval.id, { decision: 'approved', operator_id: 'operator_001' });
    const replay = await runtime.decideApproval(pending.approval.id, { decision: 'approved', operator_id: 'operator_001' });
    removeGuard();
    expect(recovered).toMatchObject({ status: 'committed', replayed: false });
    expect(replay).toMatchObject({ status: 'committed', replayed: true });
    expect((await AtlasLocalRuntime.open({ root, clock })).snapshot().outbox).toHaveLength(1);
  });

  it('rolls back a failed commit before a later unrelated write can resurrect it', async () => {
    const { root, runtime, clock } = await runtimeFixture();
    const pending = await runtime.receiveMessage(inbound({ message_id: 'msg-commit-rollback' }));
    let fail = true;
    const removeGuard = runtime.addCommitGuard(async (operation) => {
      if (fail) {
        fail = false;
        throw new Error('injected commit persistence failure');
      }
      return operation();
    });

    await expect(runtime.decideApproval(pending.approval.id, { decision: 'approved', operator_id: 'operator_001' })).rejects.toThrow('injected commit persistence failure');
    expect(runtime.snapshot().actions).toHaveLength(0);
    expect(runtime.snapshot().outbox).toHaveLength(0);
    expect(runtime.snapshot().bookings['BK-100']?.scheduled_for).toBe('Thursday');

    await runtime.receiveMessage(inbound({
      message_id: 'msg-unrelated-after-rollback',
      conversation_id: 'conv-unrelated-after-rollback',
      customer_id: 'cust-unrelated-after-rollback',
      text: 'What is the booking policy?',
    }));
    removeGuard();

    const reopened = await AtlasLocalRuntime.open({ root, clock });
    const snapshot = reopened.snapshot();
    expect(snapshot.actions).toHaveLength(0);
    expect(snapshot.bookings['BK-100']?.scheduled_for).toBe('Thursday');
    expect(snapshot.outbox).toHaveLength(1);
    expect(snapshot.outbox[0]?.conversation_id).toBe('conv-unrelated-after-rollback');
    expect(snapshot.proposals).toEqual(expect.objectContaining({
      [pending.proposal.id]: expect.objectContaining({ status: 'proposed' }),
    }));
    expect(snapshot.approvals).toEqual(expect.objectContaining({
      [pending.approval.id]: expect.objectContaining({ status: 'pending' }),
    }));
  });

  it('retries callback replay persistence after the first callback write fails', async () => {
    const { root, runtime, clock } = await runtimeFixture();
    const pending = await runtime.receiveMessage(inbound({ message_id: 'msg-callback-persist-retry' }));
    const approved = await runtime.decideApproval(pending.approval.id, { decision: 'approved', operator_id: 'operator_001' });
    await runtime.attemptDelivery(approved.outbox.id, { outcome: 'accepted', provider_message_id: 'provider-callback-persist-retry' });
    let fail = true;
    const removeGuard = runtime.addCommitGuard(async (operation) => {
      if (fail) {
        fail = false;
        throw new Error('injected callback persistence failure');
      }
      return operation();
    });
    const callback = { callback_id: 'callback-persist-retry', provider_message_id: 'provider-callback-persist-retry', state: 'delivered' as const, occurred_at: '2026-07-24T08:00:01.000Z' };
    await expect(runtime.applyDeliveryCallback(callback)).rejects.toThrow('injected callback persistence failure');
    const replay = await runtime.applyDeliveryCallback(callback);
    removeGuard();
    expect(replay).toMatchObject({ replayed: true, delivery: { state: 'delivered' } });
    expect((await AtlasLocalRuntime.open({ root, clock })).snapshot().outbox[0]).toMatchObject({ state: 'delivered', provider_message_id: 'provider-callback-persist-retry' });
  });

  it('serializes concurrent persistence without losing burst ingress state', async () => {
    const { root, runtime, clock } = await runtimeFixture();
    const messages = Array.from({ length: 40 }, (_, index) => ({
      message_id: `msg_burst_${index}`,
      conversation_id: `conv_burst_${index}`,
      customer_id: `cust_burst_${index}`,
      channel_id: 'local-web-chat',
      sequence: 1,
      occurred_at: '2026-07-24T08:00:00.000Z',
      text: 'What is the booking policy?',
      consent: true,
      within_messaging_window: true,
    }));

    await Promise.all(messages.map((message) => runtime.receiveMessage(message)));
    const reopened = await AtlasLocalRuntime.open({ root, clock });
    const snapshot = reopened.snapshot();

    expect(snapshot.messages).toHaveLength(40);
    expect(snapshot.outbox).toHaveLength(40);
    expect(snapshot.traces).toHaveLength(40);
    expect(Object.keys(snapshot.conversations)).toHaveLength(40);
  });

  it('persists and reloads local identity, conversations, receipts, and committed state', async () => {
    const { root, runtime, clock } = await runtimeFixture();
    const pending = await runtime.receiveMessage(inbound());
    await runtime.decideApproval(pending.approval.id, { decision: 'approved', operator_id: 'operator_001' });

    const reopened = await AtlasLocalRuntime.open({ root, clock });
    const snapshot = reopened.snapshot();

    expect(snapshot.identity.mode).toBe('local');
    expect(snapshot.identity.project_hash).toMatch(/^sha256:/);
    expect(snapshot.conversations['conv_001']).toBeDefined();
    expect(snapshot.actions).toHaveLength(1);
    expect(snapshot.receipts.length).toBeGreaterThanOrEqual(4);
    expect(snapshot.bookings['BK-100']?.scheduled_for).toBe('Friday');
  });
});
