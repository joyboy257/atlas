import { createHash } from 'node:crypto';
import {
  AtlasChannelFabricError,
  type AtlasChannelAdapter,
  type AtlasChannelCapabilities,
  type AtlasChannelHealth,
  type AtlasChannelMetadata,
  type AtlasInboundAttachment,
  type AtlasInboundEvent,
  type AtlasOutboundMessage,
  type AtlasOutboundValidation,
  type AtlasProviderEvent,
  type AtlasProviderSubmission,
  type AtlasRawIngress,
  type AtlasVerifiedIngress,
} from './channel-fabric.js';

export type AtlasChannelProfile = Readonly<{
  metadata: AtlasChannelMetadata;
  capabilities: AtlasChannelCapabilities;
}>;

const commonLimits = { textBytes: 16_000, mediaBytes: 20_000_000, attachments: 10 } as const;

export const ATLAS_V1_CHANNEL_PROFILES: readonly AtlasChannelProfile[] = [
  profile('CH-WEB', 'Web Chat', 'open', 'atlas-web-chat', 'PUBLIC_ALPHA', ['dm'], ['image/png', 'image/jpeg'], ['button'], { typing: true, readReceipts: true, edits: true, deletes: true, proactive: true }),
  profile('CH-EMAIL', 'Email', 'open', 'email-reference', 'PUBLIC_BETA', ['thread'], ['image/png', 'image/jpeg', 'application/pdf', 'text/plain'], [], { edits: false, deletes: false, proactive: true, templatePolicy: 'consent-and-unsubscribe' }),
  profile('CH-SMS', 'SMS', 'open', 'sms-reference', 'PUBLIC_BETA', ['dm'], [], [], { typing: false, readReceipts: false, proactive: true, windowPolicy: 'opt-in-opt-out' }, { textBytes: 1600, mediaBytes: 0, attachments: 0 }),
  profile('CH-VOICE', 'Voice', 'open', 'voice-reference', 'LABS', ['dm'], ['audio/mpeg', 'audio/wav'], ['dtmf'], { typing: false, readReceipts: false, proactive: true, windowPolicy: 'call-consent' }),
  profile('CH-X', 'X', 'open', 'x-reference', 'LABS', ['dm', 'public-post'], ['image/png', 'image/jpeg'], [], { reactions: true, typing: false, readReceipts: false, edits: true, deletes: true, proactive: false }, { textBytes: 4000, mediaBytes: 5_000_000, attachments: 4 }),
  profile('CH-WA', 'WhatsApp Business Cloud', 'customer', 'meta-whatsapp', 'PUBLIC_BETA', ['dm'], ['image/png', 'image/jpeg', 'application/pdf', 'audio/mpeg', 'video/mp4'], ['button', 'list'], { reactions: true, typing: true, readReceipts: true, proactive: true, templatePolicy: 'approved-template', windowPolicy: '24-hour-window' }),
  profile('CH-MSG', 'Facebook Messenger', 'customer', 'meta-messenger', 'PUBLIC_BETA', ['dm'], ['image/png', 'image/jpeg', 'video/mp4'], ['button'], { reactions: true, typing: true, readReceipts: true, proactive: true, windowPolicy: 'messaging-window' }),
  profile('CH-IG', 'Instagram Messaging', 'customer', 'meta-instagram', 'PUBLIC_BETA', ['dm'], ['image/png', 'image/jpeg', 'video/mp4'], ['quick-reply'], { reactions: true, typing: true, readReceipts: true, proactive: true, windowPolicy: 'messaging-window' }),
  profile('CH-TT', 'TikTok Business Messaging', 'customer', 'tiktok-business', 'PROVIDER_GATED', ['dm'], ['image/png', 'image/jpeg', 'video/mp4'], [], { reactions: true, typing: true, readReceipts: true, proactive: false }, commonLimits, 'Live provider access requires eligible business account, region, and provider authorisation.'),
  profile('CH-TG', 'Telegram', 'customer', 'telegram-bot-api', 'PUBLIC_BETA', ['dm', 'group', 'channel'], ['image/png', 'image/jpeg', 'application/pdf', 'video/mp4', 'audio/mpeg'], ['button'], { reactions: true, typing: true, readReceipts: false, edits: true, deletes: true, proactive: true }),
  profile('CH-SLACK', 'Slack', 'workplace', 'slack-platform', 'PUBLIC_BETA', ['dm', 'channel', 'thread'], ['image/png', 'image/jpeg', 'application/pdf', 'text/plain'], ['button', 'modal'], { reactions: true, typing: false, readReceipts: false, edits: true, deletes: true, proactive: true }),
  profile('CH-TEAMS', 'Microsoft Teams', 'workplace', 'microsoft-graph-bot', 'PUBLIC_BETA', ['dm', 'channel', 'thread'], ['image/png', 'image/jpeg', 'application/pdf'], ['adaptive-card'], { reactions: true, typing: true, readReceipts: true, edits: true, deletes: true, proactive: true }),
  profile('CH-GCHAT', 'Google Chat', 'workplace', 'google-chat-api', 'PUBLIC_BETA', ['dm', 'group', 'thread'], ['image/png', 'image/jpeg'], ['card'], { reactions: true, typing: false, readReceipts: false, edits: true, deletes: true, proactive: true }),
  profile('CH-DISCORD', 'Discord', 'workplace', 'discord-api', 'PUBLIC_BETA', ['dm', 'channel', 'thread'], ['image/png', 'image/jpeg', 'video/mp4', 'audio/mpeg'], ['button', 'select'], { reactions: true, typing: true, readReceipts: false, edits: true, deletes: true, proactive: true }),
  profile('CH-GH', 'GitHub', 'work-object', 'github-app', 'PUBLIC_BETA', ['work-object', 'thread'], ['image/png', 'image/jpeg', 'text/plain'], ['check'], { reactions: true, typing: false, readReceipts: false, edits: true, deletes: true, proactive: true }),
  profile('CH-LINEAR', 'Linear', 'work-object', 'linear-api', 'PUBLIC_BETA', ['work-object', 'thread'], ['image/png', 'image/jpeg'], [], { reactions: true, typing: false, readReceipts: false, edits: true, deletes: true, proactive: true }),
] as const;

export class AtlasDeclarativeChannelAdapter implements AtlasChannelAdapter {
  private readonly profile: AtlasChannelProfile;
  private readonly clock: () => string;

  constructor(profile: AtlasChannelProfile, options: Readonly<{ clock?: () => string }> = {}) {
    this.profile = freeze(clone(profile));
    this.clock = options.clock ?? (() => new Date().toISOString());
  }

  metadata(): AtlasChannelMetadata { return clone(this.profile.metadata); }
  async capabilities(): Promise<AtlasChannelCapabilities> { return clone(this.profile.capabilities); }

  async verifyIngress(request: AtlasRawIngress): Promise<AtlasVerifiedIngress> {
    const expected = `fixture:${this.profile.metadata.id}`;
    if (request.headers['x-atlas-signature'] !== expected) {
      throw new AtlasChannelFabricError('CHANNEL_INGRESS_UNAUTHENTICATED', `Ingress authenticity failed for ${this.profile.metadata.id}`, {
        nextAction: 'Verify the provider signature against the account-scoped signing configuration.',
      });
    }
    const body = record(request.body, 'ingress body');
    return {
      accountId: request.accountId,
      providerEventId: requiredString(body.eventId, 'eventId'),
      payload: clone(body),
      receivedAt: request.receivedAt,
    };
  }

  async normalizeInbound(input: AtlasVerifiedIngress): Promise<AtlasInboundEvent> {
    const body = record(input.payload, 'verified ingress payload');
    const attachments = Array.isArray(body.attachments)
      ? body.attachments.map((attachment, index) => normalizeAttachment(attachment, index))
      : [];
    const surface = requiredString(body.surface ?? this.profile.capabilities.surfaces[0], 'surface');
    if (!this.profile.capabilities.surfaces.includes(surface as AtlasInboundEvent['surface'])) {
      throw new AtlasChannelFabricError('CHANNEL_INVALID_EVENT', `Surface ${surface} is unsupported by ${this.profile.metadata.id}`);
    }
    return freeze({
      eventId: requiredString(body.eventId, 'eventId'),
      messageId: requiredString(body.messageId, 'messageId'),
      accountId: input.accountId,
      channelId: this.profile.metadata.id,
      senderId: requiredString(body.senderId, 'senderId'),
      conversationId: requiredString(body.conversationId, 'conversationId'),
      ...(body.threadId === undefined ? {} : { threadId: requiredString(body.threadId, 'threadId') }),
      sequence: positiveInteger(body.sequence, 'sequence'),
      occurredAt: timestamp(body.occurredAt ?? input.receivedAt, 'occurredAt'),
      surface: surface as AtlasInboundEvent['surface'],
      ...(body.text === undefined ? {} : { text: requiredString(body.text, 'text') }),
      ...(body.structured === undefined ? {} : { structured: clone(body.structured) }),
      attachments,
      consent: booleanValue(body.consent ?? true, 'consent'),
      withinMessagingWindow: booleanValue(body.withinMessagingWindow ?? true, 'withinMessagingWindow'),
    });
  }

  async validateOutbound(message: AtlasOutboundMessage): Promise<AtlasOutboundValidation> {
    const capabilities = this.profile.capabilities;
    if (!capabilities.surfaces.includes(message.surface)) return invalid('UNSUPPORTED_SURFACE', `${message.surface} is unsupported`);
    if (message.text !== undefined && !capabilities.text) return invalid('TEXT_UNSUPPORTED', 'Text is unsupported');
    if (message.text !== undefined && byteLength(message.text) > (capabilities.providerLimits.payloadLimits.textBytes ?? Number.MAX_SAFE_INTEGER)) {
      return invalid('PAYLOAD_TOO_LARGE', 'Text exceeds provider limit');
    }
    const attachments = message.attachments ?? [];
    if (attachments.length > (capabilities.providerLimits.payloadLimits.attachments ?? Number.MAX_SAFE_INTEGER)) {
      return invalid('TOO_MANY_ATTACHMENTS', 'Attachment count exceeds provider limit');
    }
    for (const attachment of attachments) {
      if (!capabilities.media.includes(attachment.mediaType)) return invalid('UNSUPPORTED_MEDIA', `${attachment.mediaType} is unsupported`);
      if (attachment.sizeBytes > (capabilities.providerLimits.payloadLimits.mediaBytes ?? Number.MAX_SAFE_INTEGER)) {
        return invalid('MEDIA_TOO_LARGE', `${attachment.mediaType} exceeds provider limit`);
      }
    }
    if (message.proactive) {
      if (!capabilities.proactive.supported) return invalid('PROACTIVE_UNSUPPORTED', 'Proactive messaging is unsupported');
      if (capabilities.proactive.consentRequired && !message.consent) return invalid('CONSENT_REQUIRED', 'Proactive messaging requires consent');
      if (capabilities.proactive.windowPolicy && !message.withinMessagingWindow && !message.templateId) {
        return invalid('WINDOW_OR_TEMPLATE_REQUIRED', 'The proactive window is closed and no approved template was supplied');
      }
      if (capabilities.proactive.templatePolicy && !message.withinMessagingWindow && !message.templateId) {
        return invalid('TEMPLATE_REQUIRED', 'An approved template is required outside the normal messaging window');
      }
    }
    return { valid: true, code: 'VALID', message: 'Outbound message satisfies channel capabilities and policy.', retryable: false };
  }

  async sendOutbound(message: AtlasOutboundMessage): Promise<AtlasProviderSubmission> {
    const fixture = message.text ?? '';
    if (fixture.includes('[[rate-limit]]')) {
      throw new AtlasChannelFabricError('CHANNEL_RATE_LIMITED', `${this.profile.metadata.id} fixture rate limit`, {
        retryable: true,
        nextAction: 'Retry the outbox item after the provider retry interval.',
      });
    }
    if (fixture.includes('[[transient]]')) {
      return { providerMessageId: null, state: 'retry_scheduled', providerCode: 'TEMPORARY_UNAVAILABLE', retryAfterMs: 1000, acceptedAt: this.clock() };
    }
    if (fixture.includes('[[reject]]')) {
      return { providerMessageId: null, state: 'rejected', providerCode: 'PROVIDER_REJECTED', retryAfterMs: null, acceptedAt: this.clock() };
    }
    if (fixture.includes('[[failure]]')) {
      return { providerMessageId: null, state: 'failed', providerCode: 'PERMANENT_FAILURE', retryAfterMs: null, acceptedAt: this.clock() };
    }
    return {
      providerMessageId: deterministicId('provider-message', this.profile.metadata.id, message.id, message.idempotencyKey),
      state: 'sent',
      providerCode: 'ACCEPTED',
      retryAfterMs: null,
      acceptedAt: this.clock(),
    };
  }

  async handleProviderEvent(value: unknown): Promise<AtlasProviderEvent> {
    const input = record(value, 'provider event');
    const state = requiredString(input.state, 'provider event.state');
    if (!['sent', 'delivered', 'read', 'rejected', 'failed'].includes(state)) {
      throw new AtlasChannelFabricError('CHANNEL_INVALID_EVENT', `Unsupported provider state ${state}`);
    }
    return freeze({
      callbackId: requiredString(input.callbackId, 'provider event.callbackId'),
      providerMessageId: requiredString(input.providerMessageId, 'provider event.providerMessageId'),
      state: state as AtlasProviderEvent['state'],
      occurredAt: timestamp(input.occurredAt, 'provider event.occurredAt'),
      ...(input.providerCode === undefined ? {} : { providerCode: requiredString(input.providerCode, 'provider event.providerCode') }),
    });
  }

  async health(): Promise<AtlasChannelHealth> {
    return {
      status: 'healthy',
      checkedAt: this.clock(),
      detail: `${this.profile.metadata.id} local conformance adapter is available; live provider proof is not claimed.`,
    };
  }
}

export function createAtlasV1ChannelAdapters(options: Readonly<{ clock?: () => string }> = {}): readonly AtlasDeclarativeChannelAdapter[] {
  return ATLAS_V1_CHANNEL_PROFILES.map((item) => new AtlasDeclarativeChannelAdapter(item, options));
}

export function atlasChannelProfile(channelId: string): AtlasChannelProfile {
  const found = ATLAS_V1_CHANNEL_PROFILES.find((item) => item.metadata.id === channelId);
  if (!found) throw new AtlasChannelFabricError('CHANNEL_NOT_REGISTERED', `Unknown Atlas v1 channel ${channelId}`);
  return clone(found);
}

function profile(
  id: string,
  name: string,
  family: AtlasChannelMetadata['family'],
  provider: string,
  targetPosture: string,
  surfaces: AtlasChannelCapabilities['surfaces'],
  media: readonly string[],
  interactive: readonly string[],
  features: Readonly<{
    reactions?: boolean;
    typing?: boolean;
    readReceipts?: boolean;
    edits?: boolean;
    deletes?: boolean;
    proactive?: boolean;
    templatePolicy?: string;
    windowPolicy?: string;
  }>,
  limits: Readonly<{ textBytes: number; mediaBytes: number; attachments: number }> = commonLimits,
  providerBlockedReason?: string,
): AtlasChannelProfile {
  return freeze({
    metadata: {
      id,
      name,
      family,
      provider,
      version: '1',
      targetPosture,
      readiness: 'LOCAL_CONFORMANCE',
      liveProviderProven: false,
      ...(providerBlockedReason ? { providerBlockedReason } : {}),
    },
    capabilities: {
      surfaces,
      text: true,
      media,
      interactive,
      reactions: features.reactions ?? false,
      typing: features.typing ?? false,
      readReceipts: features.readReceipts ?? false,
      edits: features.edits ?? false,
      deletes: features.deletes ?? false,
      proactive: {
        supported: features.proactive ?? false,
        consentRequired: features.proactive ?? false,
        ...(features.templatePolicy ? { templatePolicy: features.templatePolicy } : {}),
        ...(features.windowPolicy ? { windowPolicy: features.windowPolicy } : {}),
      },
      providerLimits: {
        rateModel: `${provider}-local-fixture`,
        payloadLimits: { ...limits },
      },
    },
  });
}

function normalizeAttachment(value: unknown, index: number): AtlasInboundAttachment {
  const input = record(value, `attachments[${index}]`);
  return freeze({
    id: requiredString(input.id, `attachments[${index}].id`),
    mediaType: requiredString(input.mediaType, `attachments[${index}].mediaType`),
    sizeBytes: nonNegativeInteger(input.sizeBytes, `attachments[${index}].sizeBytes`),
    ...(input.name === undefined ? {} : { name: requiredString(input.name, `attachments[${index}].name`) }),
  });
}

function invalid(code: string, message: string): AtlasOutboundValidation {
  return { valid: false, code, message, retryable: false };
}
function byteLength(value: string): number { return Buffer.byteLength(value, 'utf8'); }
function requiredString(value: unknown, location: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new AtlasChannelFabricError('CHANNEL_INVALID_EVENT', `${location} is required`);
  return value;
}
function booleanValue(value: unknown, location: string): boolean {
  if (typeof value !== 'boolean') throw new AtlasChannelFabricError('CHANNEL_INVALID_EVENT', `${location} must be boolean`);
  return value;
}
function positiveInteger(value: unknown, location: string): number {
  if (!Number.isInteger(value) || Number(value) < 1) throw new AtlasChannelFabricError('CHANNEL_INVALID_EVENT', `${location} must be a positive integer`);
  return Number(value);
}
function nonNegativeInteger(value: unknown, location: string): number {
  if (!Number.isInteger(value) || Number(value) < 0) throw new AtlasChannelFabricError('CHANNEL_INVALID_EVENT', `${location} must be non-negative`);
  return Number(value);
}
function timestamp(value: unknown, location: string): string {
  const text = requiredString(value, location);
  if (!Number.isFinite(Date.parse(text))) throw new AtlasChannelFabricError('CHANNEL_INVALID_EVENT', `${location} must be an ISO timestamp`);
  return text;
}
function record(value: unknown, location: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new AtlasChannelFabricError('CHANNEL_INVALID_EVENT', `${location} must be an object`);
  return value as Record<string, unknown>;
}
function deterministicId(prefix: string, ...parts: string[]): string {
  return `${prefix}_${createHash('sha256').update(parts.join('\u0000')).digest('hex').slice(0, 24)}`;
}
function clone<T>(value: T): T { return structuredClone(value); }
function freeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const item of Object.values(value as Record<string, unknown>)) freeze(item);
  }
  return value;
}
