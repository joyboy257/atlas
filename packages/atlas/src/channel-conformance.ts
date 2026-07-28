import {
  AtlasChannelFabric,
  AtlasChannelFabricError,
  type AtlasChannelAdapter,
  type AtlasChannelCapabilities,
  type AtlasChannelMetadata,
  type AtlasOutboundMessage,
  type AtlasRawIngress,
} from './channel-fabric.js';

export const ATLAS_CHANNEL_CONFORMANCE_VERSION = 'atlas.channel-conformance/v1' as const;

export type AtlasChannelConformanceResult = Readonly<{
  schemaVersion: typeof ATLAS_CHANNEL_CONFORMANCE_VERSION;
  channelId: string;
  name: string;
  readiness: AtlasChannelMetadata['readiness'];
  liveProviderProven: boolean;
  checks: Readonly<Record<string, boolean>>;
  passed: number;
  total: number;
  verdict: 'PASS' | 'FAIL';
  claims: Readonly<{
    localConformance: boolean;
    sandboxProven: boolean;
    providerConnected: boolean;
    liveProviderProven: boolean;
  }>;
}>;

export async function runAtlasChannelConformance(adapter: AtlasChannelAdapter): Promise<AtlasChannelConformanceResult> {
  const metadata = adapter.metadata();
  const capabilities = await adapter.capabilities();
  const accountId = `account_${metadata.id.toLowerCase()}`;
  const fabric = new AtlasChannelFabric({ clock: () => '2026-07-26T02:00:00.000Z' })
    .registerAdapter(adapter)
    .registerAccount({ tenantId: 'tenant_conformance', accountId, channelId: metadata.id, enabled: true, displayName: `${metadata.name} fixture` });
  const checks: Record<string, boolean> = {};

  checks.metadata_and_capabilities = metadata.id.trim().length > 0
    && capabilities.surfaces.length > 0
    && Object.isFrozen(metadata) === false;
  checks.readiness_honesty = metadata.readiness === 'LOCAL_CONFORMANCE' && metadata.liveProviderProven === false;
  checks.health = (await adapter.health()).status !== 'unavailable';

  checks.invalid_signature_rejected = await rejectsCode(
    () => fabric.ingest(metadata.id, rawIngress(metadata.id, accountId, 'invalid', inboundBody(metadata.id, 'bad', 1))),
    'CHANNEL_INGRESS_UNAUTHENTICATED',
  );

  const valid = await fabric.ingest(metadata.id, rawIngress(metadata.id, accountId, `fixture:${metadata.id}`, inboundBody(metadata.id, 'valid', 1)));
  checks.valid_inbound = valid.status === 'accepted' && valid.tenantId === 'tenant_conformance' && valid.receipt.kind === 'ingress';
  const duplicate = await fabric.ingest(metadata.id, rawIngress(metadata.id, accountId, `fixture:${metadata.id}`, inboundBody(metadata.id, 'valid', 1)));
  checks.duplicate_replay = duplicate.status === 'duplicate' && duplicate.event.eventId === valid.event.eventId;

  const held = await fabric.ingest(metadata.id, rawIngress(metadata.id, accountId, `fixture:${metadata.id}`, inboundBody(metadata.id, 'ordered-2', 2, 'conversation_order')));
  const first = await fabric.ingest(metadata.id, rawIngress(metadata.id, accountId, `fixture:${metadata.id}`, inboundBody(metadata.id, 'ordered-1', 1, 'conversation_order')));
  checks.out_of_order_hold_and_drain = held.status === 'held_out_of_order'
    && held.expectedSequence === 1
    && first.drainedEventIds.includes(`event_${metadata.id}_ordered-2`);

  const base = outbound(metadata, capabilities, accountId, 'valid');
  const oversizeLimit = capabilities.providerLimits.payloadLimits.textBytes ?? 16_000;
  checks.oversize_rejected = !(await adapter.validateOutbound({ ...base, id: `${base.id}_large`, idempotencyKey: `${base.idempotencyKey}_large`, text: 'x'.repeat(oversizeLimit + 1) })).valid;
  checks.unsupported_media_rejected = !(await adapter.validateOutbound({
    ...base,
    id: `${base.id}_media`,
    idempotencyKey: `${base.idempotencyKey}_media`,
    attachments: [{ id: 'attachment_unsupported', mediaType: 'application/x-atlas-unsupported', sizeBytes: 1 }],
  })).valid;

  const policyMessage: AtlasOutboundMessage = {
    ...base,
    id: `${base.id}_policy`,
    idempotencyKey: `${base.idempotencyKey}_policy`,
    proactive: true,
    consent: false,
    withinMessagingWindow: false,
  };
  checks.consent_window_policy = !(await adapter.validateOutbound(policyMessage)).valid;

  const sent = await fabric.send(base);
  const sentReplay = await fabric.send(base);
  checks.outbox_and_idempotency = sent.deliveryState === 'sent' && sent.receipts.length === 2 && sentReplay.replayed;
  checks.idempotency_mismatch_rejected = await rejectsCode(
    () => fabric.send({ ...base, text: 'different body' }),
    'CHANNEL_IDEMPOTENCY_MISMATCH',
  );

  const transient = await fabric.send({
    ...base,
    id: `${base.id}_transient`,
    idempotencyKey: `${base.idempotencyKey}_transient`,
    text: '[[transient]]',
  });
  checks.transient_failure = transient.deliveryState === 'retry_scheduled' && transient.submission.retryAfterMs === 1000;

  checks.rate_limit = await rejectsCode(
    () => fabric.send({ ...base, id: `${base.id}_rate`, idempotencyKey: `${base.idempotencyKey}_rate`, text: '[[rate-limit]]' }),
    'CHANNEL_RATE_LIMITED',
  );
  const rejected = await fabric.send({
    ...base,
    id: `${base.id}_reject`,
    idempotencyKey: `${base.idempotencyKey}_reject`,
    text: '[[reject]]',
  });
  checks.permanent_rejection = rejected.deliveryState === 'rejected' && rejected.submission.providerMessageId === null;

  const providerMessageId = sent.submission.providerMessageId;
  if (providerMessageId) {
    const delivered = await fabric.reconcile(metadata.id, {
      callbackId: `callback_${metadata.id}_delivered`,
      providerMessageId,
      state: 'delivered',
      occurredAt: '2026-07-26T02:00:01.000Z',
    });
    const callbackReplay = await fabric.reconcile(metadata.id, {
      callbackId: `callback_${metadata.id}_delivered`,
      providerMessageId,
      state: 'delivered',
      occurredAt: '2026-07-26T02:00:01.000Z',
    });
    checks.callback_reconciliation = delivered.state === 'delivered' && delivered.receipt.kind === 'delivery' && callbackReplay.replayed;
    checks.callback_regression_rejected = await rejectsCode(
      () => fabric.reconcile(metadata.id, {
        callbackId: `callback_${metadata.id}_stale`,
        providerMessageId,
        state: 'sent',
        occurredAt: '2026-07-26T02:00:02.000Z',
      }),
      'CHANNEL_CALLBACK_REGRESSION',
    );
  } else {
    checks.callback_reconciliation = false;
    checks.callback_regression_rejected = false;
  }

  checks.tenant_crossing_rejected = await rejectsCode(
    () => fabric.send({ ...base, id: `${base.id}_tenant`, idempotencyKey: `${base.idempotencyKey}_tenant`, tenantId: 'tenant_other' }),
    'CHANNEL_ACCOUNT_TENANT_MISMATCH',
  );

  const passed = Object.values(checks).filter(Boolean).length;
  const total = Object.keys(checks).length;
  return {
    schemaVersion: ATLAS_CHANNEL_CONFORMANCE_VERSION,
    channelId: metadata.id,
    name: metadata.name,
    readiness: metadata.readiness,
    liveProviderProven: metadata.liveProviderProven,
    checks,
    passed,
    total,
    verdict: passed === total ? 'PASS' : 'FAIL',
    claims: {
      localConformance: passed === total,
      sandboxProven: false,
      providerConnected: false,
      liveProviderProven: false,
    },
  };
}

export async function runAtlasChannelProgramme(adapters: readonly AtlasChannelAdapter[]): Promise<Readonly<{
  schemaVersion: 'atlas.channel-programme/v1';
  channels: readonly AtlasChannelConformanceResult[];
  summary: Readonly<{
    total: number;
    passed: number;
    failed: number;
    localConformance: number;
    providerConnected: number;
    liveProviderProven: number;
  }>;
  verdict: 'PASS' | 'FAIL';
}>> {
  const channels = await Promise.all(adapters.map(runAtlasChannelConformance));
  const passed = channels.filter((result) => result.verdict === 'PASS').length;
  return {
    schemaVersion: 'atlas.channel-programme/v1',
    channels,
    summary: {
      total: channels.length,
      passed,
      failed: channels.length - passed,
      localConformance: channels.filter((result) => result.claims.localConformance).length,
      providerConnected: channels.filter((result) => result.claims.providerConnected).length,
      liveProviderProven: channels.filter((result) => result.claims.liveProviderProven).length,
    },
    verdict: passed === channels.length ? 'PASS' : 'FAIL',
  };
}

function rawIngress(channelId: string, accountId: string, signature: string, body: unknown): AtlasRawIngress {
  return {
    accountId,
    headers: { 'x-atlas-signature': signature },
    body,
    receivedAt: '2026-07-26T02:00:00.000Z',
  };
}

function inboundBody(channelId: string, suffix: string, sequence: number, conversationId = 'conversation_conformance'): Readonly<Record<string, unknown>> {
  return {
    eventId: `event_${channelId}_${suffix}`,
    messageId: `message_${channelId}_${suffix}`,
    senderId: 'sender_conformance',
    conversationId,
    sequence,
    occurredAt: `2026-07-26T02:00:0${Math.min(sequence, 9)}.000Z`,
    text: 'Conformance inbound message',
    consent: true,
    withinMessagingWindow: true,
  };
}

function outbound(
  metadata: AtlasChannelMetadata,
  capabilities: AtlasChannelCapabilities,
  accountId: string,
  suffix: string,
): AtlasOutboundMessage {
  return {
    id: `outbound_${metadata.id}_${suffix}`,
    idempotencyKey: `outbound-key_${metadata.id}_${suffix}`,
    tenantId: 'tenant_conformance',
    accountId,
    channelId: metadata.id,
    conversationId: 'conversation_conformance',
    surface: capabilities.surfaces[0]!,
    text: 'Conformance outbound message',
    proactive: false,
    consent: true,
    withinMessagingWindow: true,
  };
}

async function rejectsCode(run: () => Promise<unknown>, code: string): Promise<boolean> {
  try {
    await run();
    return false;
  } catch (error) {
    return error instanceof AtlasChannelFabricError && error.code === code;
  }
}
