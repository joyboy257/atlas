import { describe, expect, it } from 'vitest';
import { AtlasChannelFabric } from '../src/channel-fabric.js';
import { AtlasDeclarativeChannelAdapter, atlasChannelProfile } from '../src/channel-adapters.js';

function setup() {
  const adapter = new AtlasDeclarativeChannelAdapter(atlasChannelProfile('CH-WEB'), {
    clock: () => '2026-07-26T02:00:00.000Z',
  });
  const fabric = new AtlasChannelFabric({ clock: () => '2026-07-26T02:00:00.000Z' })
    .registerAdapter(adapter)
    .registerAccount({ tenantId: 'tenant_001', accountId: 'account_web', channelId: 'CH-WEB', enabled: true, displayName: 'Web' });
  return { adapter, fabric };
}

function ingress(suffix: string, sequence: number, overrides: Record<string, unknown> = {}) {
  return {
    accountId: 'account_web',
    headers: { 'x-atlas-signature': 'fixture:CH-WEB' },
    receivedAt: '2026-07-26T02:00:00.000Z',
    body: {
      eventId: `event_${suffix}`,
      messageId: `message_${suffix}`,
      senderId: 'customer_001',
      conversationId: 'conversation_001',
      sequence,
      text: 'Hello',
      consent: true,
      withinMessagingWindow: true,
      ...overrides,
    },
  };
}

function outbound(overrides: Record<string, unknown> = {}) {
  return {
    id: 'outbound_001',
    idempotencyKey: 'outbound-key_001',
    tenantId: 'tenant_001',
    accountId: 'account_web',
    channelId: 'CH-WEB',
    conversationId: 'conversation_001',
    surface: 'dm' as const,
    text: 'Confirmed.',
    proactive: false,
    consent: true,
    withinMessagingWindow: true,
    ...overrides,
  };
}

describe('Atlas shared channel fabric', () => {
  it('verifies, normalizes, resolves tenant authority, and deduplicates ingress', async () => {
    const { fabric } = setup();
    const first = await fabric.ingest('CH-WEB', ingress('001', 1));
    const duplicate = await fabric.ingest('CH-WEB', ingress('001', 1));

    expect(first).toMatchObject({ status: 'accepted', tenantId: 'tenant_001' });
    expect(first.event.channelId).toBe('CH-WEB');
    expect(first.receipt).toMatchObject({ kind: 'ingress', outcome: 'accepted', tenantId: 'tenant_001' });
    expect(duplicate.status).toBe('duplicate');
  });

  it('holds and drains out-of-order messages deterministically', async () => {
    const { fabric } = setup();
    const held = await fabric.ingest('CH-WEB', ingress('002', 2));
    const accepted = await fabric.ingest('CH-WEB', ingress('001', 1));

    expect(held).toMatchObject({ status: 'held_out_of_order', expectedSequence: 1 });
    expect(accepted.drainedEventIds).toEqual(['event_002']);
  });

  it('binds outbound idempotency, provider submission, callbacks, and receipts', async () => {
    const { fabric } = setup();
    const sent = await fabric.send(outbound());
    const replay = await fabric.send(outbound());
    const providerMessageId = sent.submission.providerMessageId!;
    const delivered = await fabric.reconcile('CH-WEB', {
      callbackId: 'callback_001',
      providerMessageId,
      state: 'delivered',
      occurredAt: '2026-07-26T02:00:01.000Z',
    });

    expect(sent).toMatchObject({ replayed: false, deliveryState: 'sent' });
    expect(sent.receipts.map((receipt) => receipt.kind)).toEqual(['outbox', 'submission']);
    expect(replay.replayed).toBe(true);
    expect(delivered).toMatchObject({ state: 'delivered', replayed: false });
    expect(delivered.receipt.kind).toBe('delivery');
    expect(fabric.isRecordedOutbound(outbound(), sent)).toBe(true);
    expect(fabric.isRecordedOutbound(outbound(), replay)).toBe(true);
    expect(fabric.isRecordedDelivery(delivered)).toBe(true);
  });

  it('treats its ledgers, not deterministic receipt fields, as provenance', async () => {
    const { fabric } = setup();
    const sent = await fabric.send(outbound());
    const providerMessageId = sent.submission.providerMessageId!;
    const delivered = await fabric.reconcile('CH-WEB', {
      callbackId: 'callback_provenance',
      providerMessageId,
      state: 'delivered',
      occurredAt: '2026-07-26T02:00:01.000Z',
    });
    const forgedOutbound = structuredClone(sent);
    const forgedDelivery = structuredClone(delivered);
    const { fabric: otherFabric } = setup();

    expect(fabric.isRecordedOutbound(outbound(), forgedOutbound)).toBe(true);
    expect(fabric.isRecordedDelivery(forgedDelivery)).toBe(true);
    expect(otherFabric.isRecordedOutbound(outbound(), sent)).toBe(false);
    expect(otherFabric.isRecordedDelivery(delivered)).toBe(false);
    expect(fabric.isRecordedOutbound({ ...outbound(), idempotencyKey: 'forged-key' }, {
      ...sent,
      receipts: sent.receipts.map((receipt) => ({ ...receipt, receiptId: receipt.receiptId })),
    })).toBe(false);
    expect(fabric.isRecordedDelivery({
      ...delivered,
      callback: { ...delivered.callback, callbackId: 'forged-callback' },
    })).toBe(false);
  });

  it('fails closed on authenticity, tenant crossing, idempotency mismatch, and callback regression', async () => {
    const { fabric } = setup();
    await expect(fabric.ingest('CH-WEB', { ...ingress('bad', 1), headers: { 'x-atlas-signature': 'invalid' } })).rejects.toMatchObject({
      code: 'CHANNEL_INGRESS_UNAUTHENTICATED',
    });
    await expect(fabric.send(outbound({ tenantId: 'tenant_other' }))).rejects.toMatchObject({ code: 'CHANNEL_ACCOUNT_TENANT_MISMATCH' });

    const sent = await fabric.send(outbound());
    await expect(fabric.send(outbound({ text: 'Changed behind the key' }))).rejects.toMatchObject({ code: 'CHANNEL_IDEMPOTENCY_MISMATCH' });
    const providerMessageId = sent.submission.providerMessageId!;
    await fabric.reconcile('CH-WEB', {
      callbackId: 'callback_delivered',
      providerMessageId,
      state: 'delivered',
      occurredAt: '2026-07-26T02:00:01.000Z',
    });
    await expect(fabric.reconcile('CH-WEB', {
      callbackId: 'callback_stale',
      providerMessageId,
      state: 'sent',
      occurredAt: '2026-07-26T02:00:02.000Z',
    })).rejects.toMatchObject({ code: 'CHANNEL_CALLBACK_REGRESSION' });
  });
});
