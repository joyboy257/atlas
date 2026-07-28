import {
  ATLAS_TURN_PROTOCOL_VERSION,
  AtlasRuntimeProtocolError,
  type AtlasRuntimeAdapter,
  type AtlasRuntimeCapabilities,
  type AtlasRuntimeHealth,
  type AtlasRuntimeMetadata,
  type AtlasRuntimeType,
  type AtlasTurnProposalV1,
  type AtlasTurnRequestV1,
} from './runtime-protocol.js';

export type AtlasRuntimeBridge = Readonly<{
  propose(request: AtlasTurnRequestV1, signal: AbortSignal): Promise<AtlasTurnProposalV1>;
  cancel?(requestId: string): Promise<void>;
  health?(): Promise<AtlasRuntimeHealth>;
  capabilities?(): Promise<Partial<AtlasRuntimeCapabilities>>;
}>;

export type AtlasBridgeRuntimeAdapterOptions = Readonly<{
  id: string;
  type: Exclude<AtlasRuntimeType, 'atlas-native' | 'custom'>;
  name: string;
  version: string;
  bridge: AtlasRuntimeBridge;
}>;

export class AtlasBridgeRuntimeAdapter implements AtlasRuntimeAdapter {
  private readonly options: AtlasBridgeRuntimeAdapterOptions;
  private readonly active = new Map<string, AbortController>();

  constructor(options: AtlasBridgeRuntimeAdapterOptions) {
    this.options = options;
  }

  metadata(): AtlasRuntimeMetadata {
    return {
      id: this.options.id,
      type: this.options.type,
      name: this.options.name,
      version: this.options.version,
      protocolVersions: [ATLAS_TURN_PROTOCOL_VERSION],
      external: true,
    };
  }

  async capabilities(): Promise<AtlasRuntimeCapabilities> {
    const supplied = await this.options.bridge.capabilities?.();
    return {
      text: supplied?.text ?? true,
      structuredOutput: supplied?.structuredOutput ?? true,
      toolProposals: supplied?.toolProposals ?? true,
      streaming: supplied?.streaming ?? false,
      cancellation: supplied?.cancellation ?? true,
      ...(supplied?.maxContextMessages === undefined ? {} : { maxContextMessages: supplied.maxContextMessages }),
    };
  }

  async propose(request: AtlasTurnRequestV1): Promise<AtlasTurnProposalV1> {
    const controller = new AbortController();
    this.active.set(request.requestId, controller);
    try {
      return await this.options.bridge.propose(request, controller.signal);
    } catch (error) {
      if (controller.signal.aborted) {
        throw new AtlasRuntimeProtocolError('RUNTIME_TIMEOUT', `Runtime ${this.options.id} was cancelled`, {
          retryable: true,
          nextAction: 'Retry unchanged input or use an explicitly configured fallback runtime.',
        });
      }
      throw error;
    } finally {
      this.active.delete(request.requestId);
    }
  }

  async cancel(requestId: string): Promise<void> {
    this.active.get(requestId)?.abort();
    await this.options.bridge.cancel?.(requestId);
    this.active.delete(requestId);
  }

  async health(): Promise<AtlasRuntimeHealth> {
    return this.options.bridge.health?.() ?? {
      status: 'healthy',
      checkedAt: new Date().toISOString(),
      detail: 'Bridge health is assumed healthy because no explicit probe was configured.',
    };
  }
}

export class AtlasOpenAIAgentsRuntimeAdapter extends AtlasBridgeRuntimeAdapter {
  constructor(options: Readonly<{ id?: string; version: string; bridge: AtlasRuntimeBridge }>) {
    super({
      id: options.id ?? 'openai-agents',
      type: 'openai-agents',
      name: 'OpenAI Agents SDK',
      version: options.version,
      bridge: options.bridge,
    });
  }
}

export class AtlasEveRuntimeAdapter extends AtlasBridgeRuntimeAdapter {
  constructor(options: Readonly<{ id?: string; version: string; bridge: AtlasRuntimeBridge }>) {
    super({
      id: options.id ?? 'eve',
      type: 'eve',
      name: 'Eve',
      version: options.version,
      bridge: options.bridge,
    });
  }
}

export class AtlasNativeRuntimeAdapter implements AtlasRuntimeAdapter {
  private readonly id: string;
  private readonly clock: () => string;
  private readonly cancelled = new Set<string>();

  constructor(options: Readonly<{ id?: string; clock?: () => string }> = {}) {
    this.id = options.id ?? 'atlas-native';
    this.clock = options.clock ?? (() => new Date().toISOString());
  }

  metadata(): AtlasRuntimeMetadata {
    return {
      id: this.id,
      type: 'atlas-native',
      name: 'Atlas Native Runtime',
      version: '1',
      protocolVersions: [ATLAS_TURN_PROTOCOL_VERSION],
      external: false,
    };
  }

  async capabilities(): Promise<AtlasRuntimeCapabilities> {
    return {
      text: true,
      structuredOutput: true,
      toolProposals: true,
      streaming: false,
      cancellation: true,
      maxContextMessages: 100,
    };
  }

  async propose(request: AtlasTurnRequestV1): Promise<AtlasTurnProposalV1> {
    if (this.cancelled.delete(request.requestId)) {
      throw new AtlasRuntimeProtocolError('RUNTIME_TIMEOUT', `Native runtime request ${request.requestId} was cancelled`, {
        retryable: true,
      });
    }
    const latest = [...request.messages].reverse().find((message) => message.direction === 'inbound');
    const text = latest?.text ?? '';
    const booking = /\b(BK-[A-Za-z0-9-]+)\b/i.exec(text)?.[1]?.toUpperCase();
    const requestedDate = extractRequestedDate(text);
    const tool = request.tools.find((candidate) => candidate.name === 'front-desk.bookings.reschedule');
    const evidence = request.knowledgeEvidence[0];

    if (booking && requestedDate && tool) {
      return {
        protocolVersion: ATLAS_TURN_PROTOCOL_VERSION,
        requestId: request.requestId,
        response: {
          text: `I can propose moving booking ${booking} to ${requestedDate}. An operator must approve the change.`,
          ...(latest ? { replyTo: latest.id } : {}),
        },
        proposedActions: [
          {
            toolName: tool.name,
            arguments: { bookingId: booking, requestedDate },
            idempotencyKey: `proposal:${request.tenant.id}:${request.conversation.id}:${booking}:${requestedDate.toLowerCase()}`,
            explanation: 'The customer requested a booking reschedule covered by approved evidence.',
          },
        ],
        ...(evidence ? { citations: [evidence.id] } : {}),
        safeMetadata: {
          runtime_mode: 'native',
          deterministic: true,
          generated_at_epoch: Date.parse(this.clock()),
          input_tokens: estimateTokens(request.messages.map((message) => message.text ?? '').join(' ')),
          output_tokens: 32,
          cost_minor: 0,
        },
      };
    }

    return {
      protocolVersion: ATLAS_TURN_PROTOCOL_VERSION,
      requestId: request.requestId,
      response: {
        text: evidence?.excerpt ?? 'I need more approved context before proposing an action.',
        ...(latest ? { replyTo: latest.id } : {}),
      },
      ...(evidence ? { citations: [evidence.id] } : {}),
      safeMetadata: {
        runtime_mode: 'native',
        deterministic: true,
        generated_at_epoch: Date.parse(this.clock()),
        input_tokens: estimateTokens(text),
        output_tokens: 16,
        cost_minor: 0,
      },
    };
  }

  async cancel(requestId: string): Promise<void> {
    this.cancelled.add(requestId);
  }

  async health(): Promise<AtlasRuntimeHealth> {
    return { status: 'healthy', checkedAt: this.clock(), detail: 'Deterministic Atlas-native runtime is available.' };
  }
}

export type AtlasHttpRuntimeAdapterOptions = Readonly<{
  id: string;
  endpoint: string;
  version: string;
  fetchImpl?: typeof fetch;
  headers?: () => Promise<Readonly<Record<string, string>>> | Readonly<Record<string, string>>;
  healthEndpoint?: string;
}>;

export class AtlasHttpRuntimeAdapter implements AtlasRuntimeAdapter {
  private readonly options: AtlasHttpRuntimeAdapterOptions;
  private readonly fetchImpl: typeof fetch;
  private readonly active = new Map<string, AbortController>();

  constructor(options: AtlasHttpRuntimeAdapterOptions) {
    const endpoint = new URL(options.endpoint);
    if (!['http:', 'https:'].includes(endpoint.protocol)) {
      throw new AtlasRuntimeProtocolError('INVALID_TURN_REQUEST', 'HTTP runtime endpoint must use http or https');
    }
    this.options = { ...options, endpoint: endpoint.toString() };
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  metadata(): AtlasRuntimeMetadata {
    return {
      id: this.options.id,
      type: 'custom',
      name: 'Generic HTTP Runtime',
      version: this.options.version,
      protocolVersions: [ATLAS_TURN_PROTOCOL_VERSION],
      external: true,
    };
  }

  async capabilities(): Promise<AtlasRuntimeCapabilities> {
    return {
      text: true,
      structuredOutput: true,
      toolProposals: true,
      streaming: false,
      cancellation: true,
    };
  }

  async propose(request: AtlasTurnRequestV1): Promise<AtlasTurnProposalV1> {
    const controller = new AbortController();
    this.active.set(request.requestId, controller);
    try {
      const headers = await this.options.headers?.();
      const response = await this.fetchImpl(this.options.endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(headers ?? {}) },
        body: JSON.stringify(request),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new AtlasRuntimeProtocolError('RUNTIME_UNAVAILABLE', `HTTP runtime returned ${response.status}`, {
          retryable: response.status === 429 || response.status >= 500,
          nextAction: 'Inspect the external runtime health and retry only when safe.',
        });
      }
      const body = await response.json().catch(() => null);
      if (!body || typeof body !== 'object') {
        throw new AtlasRuntimeProtocolError('INVALID_TURN_PROPOSAL', 'HTTP runtime did not return a JSON proposal');
      }
      const envelope = body as Record<string, unknown>;
      return (envelope.proposal ?? body) as AtlasTurnProposalV1;
    } catch (error) {
      if (controller.signal.aborted) {
        throw new AtlasRuntimeProtocolError('RUNTIME_TIMEOUT', `HTTP runtime ${this.options.id} was cancelled`, {
          retryable: true,
        });
      }
      throw error;
    } finally {
      this.active.delete(request.requestId);
    }
  }

  async cancel(requestId: string): Promise<void> {
    this.active.get(requestId)?.abort();
    this.active.delete(requestId);
  }

  async health(): Promise<AtlasRuntimeHealth> {
    if (!this.options.healthEndpoint) {
      return { status: 'degraded', checkedAt: new Date().toISOString(), detail: 'No explicit health endpoint configured.' };
    }
    try {
      const response = await this.fetchImpl(this.options.healthEndpoint, { method: 'GET' });
      return {
        status: response.ok ? 'healthy' : response.status >= 500 ? 'unavailable' : 'degraded',
        checkedAt: new Date().toISOString(),
        detail: `Health endpoint returned ${response.status}.`,
      };
    } catch (error) {
      return {
        status: 'unavailable',
        checkedAt: new Date().toISOString(),
        detail: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

export type AtlasRuntimeConformanceResult = Readonly<{
  runtimeId: string;
  runtimeType: AtlasRuntimeType;
  checks: Readonly<Record<string, boolean>>;
  passed: number;
  total: number;
  verdict: 'PASS' | 'FAIL';
}>;

export async function inspectRuntimeAdapter(adapter: AtlasRuntimeAdapter): Promise<AtlasRuntimeConformanceResult> {
  const metadata = adapter.metadata();
  const capabilities = await adapter.capabilities();
  const health = await adapter.health();
  const checks = {
    stable_identity: metadata.id.trim().length > 0,
    supported_runtime_type: ['atlas-native', 'openai-agents', 'eve', 'langgraph', 'n8n', 'custom'].includes(metadata.type),
    version_negotiation: metadata.protocolVersions.includes(ATLAS_TURN_PROTOCOL_VERSION),
    proposal_only_boundary: typeof adapter.propose === 'function' && !('sendOutbound' in (adapter as object)) && !('commit' in (adapter as object)),
    text_capability_declared: typeof capabilities.text === 'boolean',
    tool_proposal_capability_declared: typeof capabilities.toolProposals === 'boolean',
    cancellation_declared: capabilities.cancellation && typeof adapter.cancel === 'function',
    health_declared: ['healthy', 'degraded', 'unavailable'].includes(health.status),
  };
  const passed = Object.values(checks).filter(Boolean).length;
  return {
    runtimeId: metadata.id,
    runtimeType: metadata.type,
    checks,
    passed,
    total: Object.keys(checks).length,
    verdict: passed === Object.keys(checks).length ? 'PASS' : 'FAIL',
  };
}

function extractRequestedDate(text: string): string | null {
  const match = /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|today|tomorrow)\b/i.exec(text);
  if (!match?.[1]) return null;
  return match[1][0]!.toUpperCase() + match[1].slice(1).toLowerCase();
}

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.trim().length / 4));
}
