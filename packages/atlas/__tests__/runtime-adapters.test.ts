import { describe, expect, it, vi } from 'vitest';
import {
  AtlasEveRuntimeAdapter,
  AtlasHttpRuntimeAdapter,
  AtlasNativeRuntimeAdapter,
  AtlasOpenAIAgentsRuntimeAdapter,
  inspectRuntimeAdapter,
} from '../src/runtime-adapters.js';
import { AtlasRuntimeGateway, type AtlasTurnProposalV1, type AtlasTurnRequestV1 } from '../src/runtime-protocol.js';

function request(runtimeId: string, runtimeType: AtlasTurnRequestV1['actor']['runtimeType']): AtlasTurnRequestV1 {
  return {
    protocolVersion: '1',
    requestId: `req_${runtimeId}`,
    traceId: `trace_${runtimeId}`,
    packageVersion: '0.1.0-preview.0',
    tenant: { id: 'tenant_001', scopes: ['messages:read', 'tools:propose'] },
    actor: { runtimeId, runtimeType },
    customer: { id: 'customer_001' },
    conversation: { id: 'conversation_001', state: 'automated' },
    channel: {
      channelId: 'CH-WEB',
      surfaces: ['dm'],
      text: true,
      media: [],
      interactive: [],
      reactions: false,
      typing: true,
      readReceipts: true,
      edits: false,
      deletes: false,
      proactive: { supported: true, consentRequired: true },
    },
    messages: [
      {
        id: 'message_001',
        direction: 'inbound',
        role: 'customer',
        text: 'Can I move booking BK-100 to Friday?',
        occurredAt: '2026-07-26T01:00:00.000Z',
      },
    ],
    knowledgeEvidence: [
      { id: 'evidence_001', source: 'booking-policy', digest: 'sha256:evidence', excerpt: 'Booking changes require approval.' },
    ],
    tools: [
      {
        name: 'front-desk.bookings.reschedule',
        version: '1',
        description: 'Reschedule a booking.',
        risk: 'high',
        execution: 'commit',
        approval: 'required',
        idempotency: 'required',
      },
    ],
    policyConstraints: [
      { id: 'approval', effect: 'require_approval', description: 'Operator approval required.' },
    ],
    limits: { deadlineMs: 1000, maxProposedActions: 1 },
  };
}

function bridgeProposal(requestId: string): AtlasTurnProposalV1 {
  return {
    protocolVersion: '1',
    requestId,
    response: { text: 'A governed proposal is ready.', replyTo: 'message_001' },
    proposedActions: [
      {
        toolName: 'front-desk.bookings.reschedule',
        arguments: { bookingId: 'BK-100', requestedDate: 'Friday' },
        idempotencyKey: `proposal:${requestId}`,
      },
    ],
    citations: ['evidence_001'],
  };
}

describe('Atlas runtime adapters', () => {
  it('uses Atlas-native as the deterministic reference adapter', async () => {
    const adapter = new AtlasNativeRuntimeAdapter({
      id: 'runtime_native',
      clock: () => '2026-07-26T01:00:00.000Z',
    });
    const gateway = new AtlasRuntimeGateway();
    const result = await gateway.propose(adapter, request('runtime_native', 'atlas-native'));

    expect(result.proposal.proposedActions?.[0]).toMatchObject({
      toolName: 'front-desk.bookings.reschedule',
      arguments: { bookingId: 'BK-100', requestedDate: 'Friday' },
    });
    expect(result.proposal.response?.text).toContain('operator must approve');
    expect(result.receipt.safeUsage.costMinor).toBe(0);
    expect(adapter.metadata()).toMatchObject({ external: false, type: 'atlas-native' });
  });

  it('constrains OpenAI Agents SDK behind an injected proposal bridge', async () => {
    const bridge = vi.fn(async (turn: AtlasTurnRequestV1) => bridgeProposal(turn.requestId));
    const adapter = new AtlasOpenAIAgentsRuntimeAdapter({
      id: 'runtime_openai',
      version: 'sdk-test',
      bridge: { propose: bridge },
    });
    const gateway = new AtlasRuntimeGateway();
    const result = await gateway.propose(adapter, request('runtime_openai', 'openai-agents'));

    expect(bridge).toHaveBeenCalledTimes(1);
    expect(bridge.mock.calls[0]?.[0].tenant.id).toBe('tenant_001');
    expect(adapter).not.toHaveProperty('sendOutbound');
    expect(result.receipt.runtimeType).toBe('openai-agents');
    expect(result.proposal.proposedActions).toHaveLength(1);
  });

  it('constrains Eve behind the same proposal-only bridge contract', async () => {
    const adapter = new AtlasEveRuntimeAdapter({
      id: 'runtime_eve',
      version: '0.27.3',
      bridge: { propose: async (turn) => bridgeProposal(turn.requestId) },
    });
    const result = await new AtlasRuntimeGateway().propose(adapter, request('runtime_eve', 'eve'));

    expect(adapter.metadata()).toMatchObject({ type: 'eve', external: true });
    expect(result.proposal.requestId).toBe('req_runtime_eve');
    expect(result.receipt.tenantId).toBe('tenant_001');
  });

  it('posts the vendor-neutral request through the generic HTTP adapter', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ proposal: bridgeProposal('req_runtime_http') }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const adapter = new AtlasHttpRuntimeAdapter({
      id: 'runtime_http',
      endpoint: 'https://runtime.example.test/atlas/turns',
      version: '1.0.0',
      fetchImpl,
    });
    const result = await new AtlasRuntimeGateway().propose(adapter, request('runtime_http', 'custom'));

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe('https://runtime.example.test/atlas/turns');
    expect(init?.method).toBe('POST');
    const body = JSON.parse(String(init?.body));
    expect(body.actor).toEqual({ runtimeId: 'runtime_http', runtimeType: 'custom' });
    expect(body).not.toHaveProperty('providerCredentials');
    expect(result.receipt.runtimeType).toBe('custom');
  });

  it('maps HTTP outage status to a stable retryable runtime failure', async () => {
    const adapter = new AtlasHttpRuntimeAdapter({
      id: 'runtime_http',
      endpoint: 'https://runtime.example.test/atlas/turns',
      version: '1.0.0',
      fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 503 })),
    });
    await expect(new AtlasRuntimeGateway().propose(adapter, request('runtime_http', 'custom'))).rejects.toMatchObject({
      code: 'RUNTIME_UNAVAILABLE',
      retryable: true,
    });
  });

  it('declares the same core conformance boundary for all four required adapters', async () => {
    const adapters = [
      new AtlasNativeRuntimeAdapter({ id: 'native' }),
      new AtlasOpenAIAgentsRuntimeAdapter({ version: 'test', bridge: { propose: async (turn) => bridgeProposal(turn.requestId) } }),
      new AtlasEveRuntimeAdapter({ version: 'test', bridge: { propose: async (turn) => bridgeProposal(turn.requestId) } }),
      new AtlasHttpRuntimeAdapter({ id: 'http', endpoint: 'https://runtime.example.test/turns', version: 'test', fetchImpl: vi.fn<typeof fetch>() }),
    ];
    const results = await Promise.all(adapters.map((adapter) => inspectRuntimeAdapter(adapter)));

    expect(results).toHaveLength(4);
    expect(results.every((result) => result.verdict === 'PASS')).toBe(true);
    expect(results.every((result) => result.passed === result.total)).toBe(true);
  });
});
