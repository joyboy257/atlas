import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
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
  });

  it('rejects an action idempotency key reused with different governed input', async () => {
    const { runtime } = await runtimeFixture();
    const pending = await runtime.receiveMessage(inbound());

    const first = await runtime.commitProposal(pending.proposal.id, {
      idempotency_key: 'idem_booking_001',
      operator_id: 'operator_001',
      input: pending.proposal.input,
    });
    const replay = await runtime.commitProposal(pending.proposal.id, {
      idempotency_key: 'idem_booking_001',
      operator_id: 'operator_001',
      input: pending.proposal.input,
    });

    expect(replay.replayed).toBe(true);
    expect(replay.action_receipt.receipt_id).toBe(first.action_receipt.receipt_id);
    await expect(runtime.commitProposal(pending.proposal.id, {
      idempotency_key: 'idem_booking_001',
      operator_id: 'operator_001',
      input: { ...pending.proposal.input, requestedDate: 'Monday' },
    })).rejects.toMatchObject({ code: 'IDEMPOTENCY_MISMATCH' });
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
