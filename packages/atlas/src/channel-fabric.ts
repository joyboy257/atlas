import { createHash } from 'node:crypto';

export const ATLAS_CHANNEL_FABRIC_VERSION = 'atlas.channel-fabric/v1' as const;
export const ATLAS_CHANNEL_RECEIPT_VERSION = 'atlas.channel-receipt/v1' as const;

export type AtlasChannelFamily = 'open' | 'customer' | 'workplace' | 'work-object';
export type AtlasChannelReadiness =
  | 'PLANNED'
  | 'IMPLEMENTING'
  | 'LOCAL_CONFORMANCE'
  | 'SANDBOX_PROVEN'
  | 'PROVIDER_CONNECTED'
  | 'PUBLIC_ALPHA'
  | 'PUBLIC_BETA'
  | 'GA'
  | 'PROVIDER_BLOCKED'
  | 'REGRESSED';

export type AtlasDeliveryState = 'queued' | 'retry_scheduled' | 'sent' | 'delivered' | 'read' | 'rejected' | 'failed';

export type AtlasChannelMetadata = Readonly<{
  id: string;
  name: string;
  family: AtlasChannelFamily;
  provider: string;
  version: string;
  targetPosture: string;
  readiness: AtlasChannelReadiness;
  liveProviderProven: boolean;
  providerBlockedReason?: string;
}>;

export type AtlasChannelCapabilities = Readonly<{
  surfaces: readonly ('dm' | 'group' | 'channel' | 'thread' | 'public-post' | 'work-object')[];
  text: boolean;
  media: readonly string[];
  interactive: readonly string[];
  reactions: boolean;
  typing: boolean;
  readReceipts: boolean;
  edits: boolean;
  deletes: boolean;
  proactive: Readonly<{
    supported: boolean;
    consentRequired: boolean;
    templatePolicy?: string;
    windowPolicy?: string;
  }>;
  providerLimits: Readonly<{
    rateModel: string;
    payloadLimits: Readonly<Record<string, number>>;
  }>;
}>;

export type AtlasRawIngress = Readonly<{
  accountId: string;
  headers: Readonly<Record<string, string>>;
  body: unknown;
  receivedAt: string;
}>;

export type AtlasVerifiedIngress = Readonly<{
  accountId: string;
  providerEventId: string;
  payload: unknown;
  receivedAt: string;
}>;

export type AtlasInboundAttachment = Readonly<{
  id: string;
  mediaType: string;
  sizeBytes: number;
  name?: string;
}>;

export type AtlasInboundEvent = Readonly<{
  eventId: string;
  messageId: string;
  accountId: string;
  channelId: string;
  senderId: string;
  conversationId: string;
  threadId?: string;
  sequence: number;
  occurredAt: string;
  surface: AtlasChannelCapabilities['surfaces'][number];
  text?: string;
  structured?: unknown;
  attachments: readonly AtlasInboundAttachment[];
  consent: boolean;
  withinMessagingWindow: boolean;
}>;

export type AtlasOutboundMessage = Readonly<{
  id: string;
  idempotencyKey: string;
  tenantId: string;
  accountId: string;
  channelId: string;
  conversationId: string;
  threadId?: string;
  surface: AtlasChannelCapabilities['surfaces'][number];
  text?: string;
  structured?: unknown;
  attachments?: readonly AtlasInboundAttachment[];
  proactive: boolean;
  consent: boolean;
  withinMessagingWindow: boolean;
  templateId?: string;
}>;

export type AtlasOutboundValidation = Readonly<{
  valid: boolean;
  code: string;
  message: string;
  retryable: boolean;
}>;

export type AtlasProviderSubmission = Readonly<{
  providerMessageId: string | null;
  state: 'sent' | 'retry_scheduled' | 'rejected' | 'failed';
  providerCode: string;
  retryAfterMs: number | null;
  acceptedAt: string;
}>;

export type AtlasProviderEvent = Readonly<{
  callbackId: string;
  providerMessageId: string;
  state: Exclude<AtlasDeliveryState, 'queued' | 'retry_scheduled'>;
  occurredAt: string;
  providerCode?: string;
}>;

export type AtlasChannelHealth = Readonly<{
  status: 'healthy' | 'degraded' | 'unavailable';
  checkedAt: string;
  detail?: string;
}>;

export interface AtlasChannelAdapter {
  metadata(): AtlasChannelMetadata;
  capabilities(): Promise<AtlasChannelCapabilities>;
  verifyIngress(request: AtlasRawIngress): Promise<AtlasVerifiedIngress>;
  normalizeInbound(input: AtlasVerifiedIngress): Promise<AtlasInboundEvent>;
  validateOutbound(message: AtlasOutboundMessage): Promise<AtlasOutboundValidation>;
  sendOutbound(message: AtlasOutboundMessage): Promise<AtlasProviderSubmission>;
  handleProviderEvent(event: unknown): Promise<AtlasProviderEvent>;
  health(): Promise<AtlasChannelHealth>;
}

export type AtlasChannelAccount = Readonly<{
  tenantId: string;
  accountId: string;
  channelId: string;
  enabled: boolean;
  displayName: string;
}>;

export type AtlasChannelReceipt = Readonly<{
  schemaVersion: typeof ATLAS_CHANNEL_RECEIPT_VERSION;
  receiptId: string;
  kind: 'ingress' | 'outbox' | 'submission' | 'delivery';
  tenantId: string;
  accountId: string;
  channelId: string;
  subjectId: string;
  outcome: string;
  digest: string;
  createdAt: string;
  safeData: Readonly<Record<string, string | number | boolean | null>>;
}>;

export type AtlasIngressResult = Readonly<{
  status: 'accepted' | 'duplicate' | 'held_out_of_order';
  tenantId: string;
  event: AtlasInboundEvent;
  expectedSequence: number | null;
  drainedEventIds: readonly string[];
  receipt: AtlasChannelReceipt;
}>;

export type AtlasOutboundResult = Readonly<{
  replayed: boolean;
  validation: AtlasOutboundValidation;
  submission: AtlasProviderSubmission;
  deliveryState: AtlasDeliveryState;
  receipts: readonly AtlasChannelReceipt[];
}>;

export type AtlasDeliveryResult = Readonly<{
  replayed: boolean;
  state: AtlasDeliveryState;
  callback: AtlasProviderEvent;
  receipt: AtlasChannelReceipt;
}>;

export type AtlasChannelFabricErrorCode =
  | 'CHANNEL_NOT_REGISTERED'
  | 'CHANNEL_ACCOUNT_NOT_FOUND'
  | 'CHANNEL_ACCOUNT_DISABLED'
  | 'CHANNEL_ACCOUNT_TENANT_MISMATCH'
  | 'CHANNEL_INGRESS_UNAUTHENTICATED'
  | 'CHANNEL_INVALID_EVENT'
  | 'CHANNEL_DUPLICATE_MISMATCH'
  | 'CHANNEL_OUT_OF_ORDER'
  | 'CHANNEL_OUTBOUND_INVALID'
  | 'CHANNEL_RATE_LIMITED'
  | 'CHANNEL_PROVIDER_TRANSIENT'
  | 'CHANNEL_PROVIDER_REJECTED'
  | 'CHANNEL_CALLBACK_REGRESSION'
  | 'CHANNEL_IDEMPOTENCY_MISMATCH';

export class AtlasChannelFabricError extends Error {
  readonly code: AtlasChannelFabricErrorCode;
  readonly retryable: boolean;
  readonly nextAction: string;

  constructor(
    code: AtlasChannelFabricErrorCode,
    message: string,
    options: Readonly<{ retryable?: boolean; nextAction?: string }> = {},
  ) {
    super(message);
    this.name = 'AtlasChannelFabricError';
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.nextAction = options.nextAction ?? 'Inspect the channel receipt and adapter health before retrying.';
  }
}

type IngressLedger = Readonly<{ digest: string; result: AtlasIngressResult }>;
type OutboundLedger = Readonly<{ digest: string; result: AtlasOutboundResult }>;
type CallbackLedger = Readonly<{ digest: string; result: AtlasDeliveryResult }>;

type ConversationOrder = {
  lastSequence: number;
  pending: Map<number, AtlasInboundEvent>;
};

type DeliveryRecord = {
  tenantId: string;
  accountId: string;
  channelId: string;
  messageId: string;
  providerMessageId: string | null;
  state: AtlasDeliveryState;
};

export class AtlasChannelFabric {
  private readonly adapters = new Map<string, AtlasChannelAdapter>();
  private readonly accounts = new Map<string, AtlasChannelAccount>();
  private readonly ingressLedger = new Map<string, IngressLedger>();
  private readonly outboundLedger = new Map<string, OutboundLedger>();
  private readonly callbackLedger = new Map<string, CallbackLedger>();
  private readonly order = new Map<string, ConversationOrder>();
  private readonly deliveries = new Map<string, DeliveryRecord>();
  private readonly clock: () => string;

  constructor(options: Readonly<{ clock?: () => string }> = {}) {
    this.clock = options.clock ?? (() => new Date().toISOString());
  }

  registerAdapter(adapter: AtlasChannelAdapter): this {
    const metadata = adapter.metadata();
    if (!metadata.id.trim()) throw new AtlasChannelFabricError('CHANNEL_NOT_REGISTERED', 'Channel adapter id must not be empty');
    this.adapters.set(metadata.id, adapter);
    return this;
  }

  registerAccount(account: AtlasChannelAccount): this {
    if (!account.tenantId.trim() || !account.accountId.trim() || !account.channelId.trim()) {
      throw new AtlasChannelFabricError('CHANNEL_ACCOUNT_NOT_FOUND', 'Channel account requires tenant, account, and channel ids');
    }
    this.accounts.set(accountKey(account.channelId, account.accountId), clone(account));
    return this;
  }

  async ingest(channelId: string, request: AtlasRawIngress): Promise<AtlasIngressResult> {
    const adapter = this.adapter(channelId);
    const verified = await adapter.verifyIngress(request);
    const event = validateInboundEvent(await adapter.normalizeInbound(verified), channelId);
    const account = this.account(channelId, event.accountId);
    const digest = hash(event);
    const previous = this.ingressLedger.get(event.eventId);
    if (previous) {
      if (previous.digest !== digest) {
        throw new AtlasChannelFabricError('CHANNEL_DUPLICATE_MISMATCH', `Ingress event ${event.eventId} was replayed with different content`);
      }
      return { ...clone(previous.result), status: 'duplicate' };
    }

    const orderKey = `${account.tenantId}\u0000${channelId}\u0000${event.conversationId}`;
    const ordering = this.order.get(orderKey) ?? { lastSequence: 0, pending: new Map<number, AtlasInboundEvent>() };
    if (event.sequence > ordering.lastSequence + 1) {
      ordering.pending.set(event.sequence, event);
      this.order.set(orderKey, ordering);
      const receipt = this.receipt('ingress', account, event.eventId, 'held_out_of_order', {
        sequence: event.sequence,
        expected_sequence: ordering.lastSequence + 1,
      });
      const result: AtlasIngressResult = {
        status: 'held_out_of_order',
        tenantId: account.tenantId,
        event,
        expectedSequence: ordering.lastSequence + 1,
        drainedEventIds: [],
        receipt,
      };
      this.ingressLedger.set(event.eventId, { digest, result: clone(result) });
      return result;
    }
    if (event.sequence <= ordering.lastSequence) {
      throw new AtlasChannelFabricError('CHANNEL_OUT_OF_ORDER', `Sequence ${event.sequence} is older than ${ordering.lastSequence}`);
    }

    ordering.lastSequence = event.sequence;
    const drained: string[] = [];
    while (ordering.pending.has(ordering.lastSequence + 1)) {
      const next = ordering.pending.get(ordering.lastSequence + 1)!;
      ordering.pending.delete(ordering.lastSequence + 1);
      ordering.lastSequence = next.sequence;
      drained.push(next.eventId);
    }
    this.order.set(orderKey, ordering);
    const receipt = this.receipt('ingress', account, event.eventId, 'accepted', {
      sequence: event.sequence,
      drained: drained.length,
    });
    const result: AtlasIngressResult = {
      status: 'accepted',
      tenantId: account.tenantId,
      event,
      expectedSequence: null,
      drainedEventIds: drained,
      receipt,
    };
    this.ingressLedger.set(event.eventId, { digest, result: clone(result) });
    return result;
  }

  async send(messageValue: AtlasOutboundMessage): Promise<AtlasOutboundResult> {
    const message = validateOutboundMessage(messageValue);
    const adapter = this.adapter(message.channelId);
    const account = this.account(message.channelId, message.accountId);
    if (account.tenantId !== message.tenantId) {
      throw new AtlasChannelFabricError('CHANNEL_ACCOUNT_TENANT_MISMATCH', `Account ${message.accountId} does not belong to ${message.tenantId}`);
    }
    const digest = hash(message);
    const previous = this.outboundLedger.get(message.idempotencyKey);
    if (previous) {
      if (previous.digest !== digest) {
        throw new AtlasChannelFabricError('CHANNEL_IDEMPOTENCY_MISMATCH', `Outbound idempotency key ${message.idempotencyKey} was reused with different content`);
      }
      return { ...clone(previous.result), replayed: true };
    }

    const validation = await adapter.validateOutbound(message);
    if (!validation.valid) {
      throw new AtlasChannelFabricError('CHANNEL_OUTBOUND_INVALID', validation.message, {
        retryable: validation.retryable,
        nextAction: `Correct the outbound message for ${message.channelId}: ${validation.code}`,
      });
    }
    const queuedReceipt = this.receipt('outbox', account, message.id, 'queued', {
      proactive: message.proactive,
      surface: message.surface,
    });
    const submission = await adapter.sendOutbound(message);
    const state = submission.state;
    const delivery: DeliveryRecord = {
      tenantId: account.tenantId,
      accountId: account.accountId,
      channelId: account.channelId,
      messageId: message.id,
      providerMessageId: submission.providerMessageId,
      state,
    };
    this.deliveries.set(message.id, delivery);
    if (submission.providerMessageId) this.deliveries.set(`provider:${submission.providerMessageId}`, delivery);
    const submissionReceipt = this.receipt('submission', account, message.id, state, {
      provider_code: submission.providerCode,
      retry_after_ms: submission.retryAfterMs,
    });
    const result: AtlasOutboundResult = {
      replayed: false,
      validation,
      submission,
      deliveryState: state,
      receipts: [queuedReceipt, submissionReceipt],
    };
    this.outboundLedger.set(message.idempotencyKey, { digest, result: clone(result) });
    return result;
  }

  isRecordedOutbound(message: AtlasOutboundMessage, result: AtlasOutboundResult): boolean {
    const stored = this.outboundLedger.get(message.idempotencyKey);
    return Boolean(
      stored &&
      stored.digest === hash(message) &&
      hash(outboundEvidence(stored.result)) === hash(outboundEvidence(result)),
    );
  }

  isRecordedDelivery(result: AtlasDeliveryResult): boolean {
    const stored = this.callbackLedger.get(result.callback.callbackId);
    return Boolean(
      stored &&
      stored.digest === hash(result.callback) &&
      hash(deliveryEvidence(stored.result)) === hash(deliveryEvidence(result)),
    );
  }

  async reconcile(channelId: string, eventValue: unknown): Promise<AtlasDeliveryResult> {
    const adapter = this.adapter(channelId);
    const callback = await adapter.handleProviderEvent(eventValue);
    const digest = hash(callback);
    const previous = this.callbackLedger.get(callback.callbackId);
    if (previous) {
      if (previous.digest !== digest) {
        throw new AtlasChannelFabricError('CHANNEL_IDEMPOTENCY_MISMATCH', `Callback ${callback.callbackId} was reused with different content`);
      }
      return { ...clone(previous.result), replayed: true };
    }
    const delivery = this.deliveries.get(`provider:${callback.providerMessageId}`);
    if (!delivery) throw new AtlasChannelFabricError('CHANNEL_INVALID_EVENT', `Unknown provider message ${callback.providerMessageId}`);
    if (delivery.channelId !== channelId) throw new AtlasChannelFabricError('CHANNEL_ACCOUNT_TENANT_MISMATCH', 'Provider callback crossed a channel boundary');
    if (deliveryRank(callback.state) < deliveryRank(delivery.state)) {
      throw new AtlasChannelFabricError('CHANNEL_CALLBACK_REGRESSION', `Callback would regress ${delivery.state} to ${callback.state}`);
    }
    delivery.state = callback.state;
    const account = this.account(channelId, delivery.accountId);
    const receipt = this.receipt('delivery', account, delivery.messageId, callback.state, {
      provider_message_id: callback.providerMessageId,
      provider_code: callback.providerCode ?? null,
    });
    const result: AtlasDeliveryResult = { replayed: false, state: callback.state, callback, receipt };
    this.callbackLedger.set(callback.callbackId, { digest, result: clone(result) });
    return result;
  }

  adapterMatrix(): readonly Readonly<{
    id: string;
    name: string;
    family: AtlasChannelFamily;
    readiness: AtlasChannelReadiness;
    liveProviderProven: boolean;
    providerBlockedReason: string | null;
  }>[] {
    return [...this.adapters.values()].map((adapter) => {
      const metadata = adapter.metadata();
      return {
        id: metadata.id,
        name: metadata.name,
        family: metadata.family,
        readiness: metadata.readiness,
        liveProviderProven: metadata.liveProviderProven,
        providerBlockedReason: metadata.providerBlockedReason ?? null,
      };
    }).sort((a, b) => a.id.localeCompare(b.id));
  }

  private adapter(channelId: string): AtlasChannelAdapter {
    const adapter = this.adapters.get(channelId);
    if (!adapter) throw new AtlasChannelFabricError('CHANNEL_NOT_REGISTERED', `Channel ${channelId} is not registered`);
    return adapter;
  }

  private account(channelId: string, accountId: string): AtlasChannelAccount {
    const account = this.accounts.get(accountKey(channelId, accountId));
    if (!account) throw new AtlasChannelFabricError('CHANNEL_ACCOUNT_NOT_FOUND', `Channel account ${channelId}/${accountId} was not found`);
    if (!account.enabled) throw new AtlasChannelFabricError('CHANNEL_ACCOUNT_DISABLED', `Channel account ${channelId}/${accountId} is disabled`);
    return account;
  }

  private receipt(
    kind: AtlasChannelReceipt['kind'],
    account: AtlasChannelAccount,
    subjectId: string,
    outcome: string,
    safeData: AtlasChannelReceipt['safeData'],
  ): AtlasChannelReceipt {
    const createdAt = this.clock();
    return {
      schemaVersion: ATLAS_CHANNEL_RECEIPT_VERSION,
      receiptId: deterministicId('channel-receipt', kind, account.tenantId, account.channelId, subjectId, outcome),
      kind,
      tenantId: account.tenantId,
      accountId: account.accountId,
      channelId: account.channelId,
      subjectId,
      outcome,
      digest: hash({ kind, subjectId, outcome, safeData }),
      createdAt,
      safeData: clone(safeData),
    };
  }
}

function validateInboundEvent(value: AtlasInboundEvent, channelId: string): AtlasInboundEvent {
  if (!value || typeof value !== 'object') invalidEvent('Inbound event must be an object');
  for (const [key, item] of Object.entries({ eventId: value.eventId, messageId: value.messageId, accountId: value.accountId, channelId: value.channelId, senderId: value.senderId, conversationId: value.conversationId, occurredAt: value.occurredAt })) {
    if (typeof item !== 'string' || !item.trim()) invalidEvent(`Inbound ${key} is required`);
  }
  if (value.channelId !== channelId) invalidEvent(`Inbound event channel ${value.channelId} does not match adapter ${channelId}`);
  if (!Number.isInteger(value.sequence) || value.sequence < 1) invalidEvent('Inbound sequence must be a positive integer');
  if (!Number.isFinite(Date.parse(value.occurredAt))) invalidEvent('Inbound occurredAt must be an ISO timestamp');
  if (value.text === undefined && value.structured === undefined && value.attachments.length === 0) invalidEvent('Inbound event has no content');
  return freeze(clone(value));
}

function validateOutboundMessage(value: AtlasOutboundMessage): AtlasOutboundMessage {
  for (const [key, item] of Object.entries({ id: value.id, idempotencyKey: value.idempotencyKey, tenantId: value.tenantId, accountId: value.accountId, channelId: value.channelId, conversationId: value.conversationId })) {
    if (typeof item !== 'string' || !item.trim()) throw new AtlasChannelFabricError('CHANNEL_OUTBOUND_INVALID', `Outbound ${key} is required`);
  }
  if (value.text === undefined && value.structured === undefined && !(value.attachments?.length)) {
    throw new AtlasChannelFabricError('CHANNEL_OUTBOUND_INVALID', 'Outbound message has no content');
  }
  return freeze(clone(value));
}

function invalidEvent(message: string): never {
  throw new AtlasChannelFabricError('CHANNEL_INVALID_EVENT', message);
}

function accountKey(channelId: string, accountId: string): string { return `${channelId}\u0000${accountId}`; }
function deliveryRank(state: AtlasDeliveryState): number {
  const ranks: Record<AtlasDeliveryState, number> = {
    queued: 0,
    retry_scheduled: 1,
    sent: 2,
    delivered: 3,
    read: 4,
    rejected: 5,
    failed: 5,
  };
  return ranks[state];
}
function deterministicId(prefix: string, ...parts: string[]): string {
  return `${prefix}_${createHash('sha256').update(parts.join('\u0000')).digest('hex').slice(0, 24)}`;
}
function hash(value: unknown): string { return `sha256:${createHash('sha256').update(stableJson(value)).digest('hex')}`; }
function outboundEvidence(result: AtlasOutboundResult): Omit<AtlasOutboundResult, 'replayed'> {
  const { replayed: _replayed, ...evidence } = result;
  return evidence;
}
function deliveryEvidence(result: AtlasDeliveryResult): Omit<AtlasDeliveryResult, 'replayed'> {
  const { replayed: _replayed, ...evidence } = result;
  return evidence;
}
function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
function clone<T>(value: T): T { return structuredClone(value); }
function freeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const item of Object.values(value as Record<string, unknown>)) freeze(item);
  }
  return value;
}
