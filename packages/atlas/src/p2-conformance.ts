import {
  ATLAS_MODEL_REFERENCE_VERSION,
  AtlasCallbackModelProvider,
  AtlasLocalFixtureModelProvider,
  AtlasModelReferenceRegistry,
  AtlasModelRouter,
  type AtlasInferenceMode,
  type AtlasModelRequest,
} from './model-routing.js';
import {
  AtlasEveRuntimeAdapter,
  AtlasHttpRuntimeAdapter,
  AtlasNativeRuntimeAdapter,
  AtlasOpenAIAgentsRuntimeAdapter,
  inspectRuntimeAdapter,
  type AtlasRuntimeBridge,
} from './runtime-adapters.js';
import { AtlasRuntimeGateway, type AtlasRuntimeAdapter, type AtlasTurnProposalV1, type AtlasTurnRequestV1 } from './runtime-protocol.js';
import { createAtlasV1ChannelAdapters } from './channel-adapters.js';
import { runAtlasChannelProgramme } from './channel-conformance.js';

export const ATLAS_P2_LOCAL_CERTIFICATION_VERSION = 'atlas.p2-local-certification/v1' as const;

export type AtlasP2LocalCertification = Readonly<{
  schemaVersion: typeof ATLAS_P2_LOCAL_CERTIFICATION_VERSION;
  runtime: Readonly<{
    adapters: readonly Readonly<{ id: string; type: string; conformance: string; proposal: boolean; receipt: boolean }>[];
    passed: number;
    total: number;
    verdict: 'PASS' | 'FAIL';
  }>;
  inference: Readonly<{
    modes: readonly Readonly<{ mode: AtlasInferenceMode; provider: string; payer: string; fallbackUsed: boolean; verdict: 'PASS' | 'FAIL' }>[];
    passed: number;
    total: number;
    verdict: 'PASS' | 'FAIL';
  }>;
  channels: Awaited<ReturnType<typeof runAtlasChannelProgramme>>;
  claims: Readonly<{
    localProtocolProven: boolean;
    runtimeAdaptersLocalProven: boolean;
    inferenceModesLocalProven: boolean;
    channelsLocalConformance: number;
    providerConnectedChannels: number;
    liveProviderProvenChannels: number;
    hostedStagingProven: boolean;
    productionProven: boolean;
  }>;
  verdict: 'PASS' | 'FAIL';
}>;

export async function certifyAtlasP2Local(): Promise<AtlasP2LocalCertification> {
  const runtimeAdapters = runtimeFixtureAdapters();
  const runtimeResults = [];
  for (const adapter of runtimeAdapters) {
    const metadata = adapter.metadata();
    const conformance = await inspectRuntimeAdapter(adapter);
    const result = await new AtlasRuntimeGateway({ clock: () => new Date('2026-07-26T03:00:00.000Z') })
      .propose(adapter, turnRequest(metadata.id, metadata.type));
    runtimeResults.push({
      id: metadata.id,
      type: metadata.type,
      conformance: conformance.verdict,
      proposal: (result.proposal.proposedActions?.length ?? 0) === 1,
      receipt: result.receipt.runtimeId === metadata.id && result.receipt.traceId.startsWith('trace_'),
    });
  }
  const runtimePassed = runtimeResults.filter((result) => result.conformance === 'PASS' && result.proposal && result.receipt).length;

  const inferenceResults = await inferenceFixtureResults();
  const inferencePassed = inferenceResults.filter((result) => result.verdict === 'PASS').length;
  const channels = await runAtlasChannelProgramme(createAtlasV1ChannelAdapters({ clock: () => '2026-07-26T03:00:00.000Z' }));
  const runtimeVerdict = runtimePassed === runtimeResults.length ? 'PASS' : 'FAIL';
  const inferenceVerdict = inferencePassed === inferenceResults.length ? 'PASS' : 'FAIL';
  const verdict = runtimeVerdict === 'PASS' && inferenceVerdict === 'PASS' && channels.verdict === 'PASS' ? 'PASS' : 'FAIL';

  return {
    schemaVersion: ATLAS_P2_LOCAL_CERTIFICATION_VERSION,
    runtime: {
      adapters: runtimeResults,
      passed: runtimePassed,
      total: runtimeResults.length,
      verdict: runtimeVerdict,
    },
    inference: {
      modes: inferenceResults,
      passed: inferencePassed,
      total: inferenceResults.length,
      verdict: inferenceVerdict,
    },
    channels,
    claims: {
      localProtocolProven: runtimeVerdict === 'PASS',
      runtimeAdaptersLocalProven: runtimeVerdict === 'PASS',
      inferenceModesLocalProven: inferenceVerdict === 'PASS',
      channelsLocalConformance: channels.summary.localConformance,
      providerConnectedChannels: channels.summary.providerConnected,
      liveProviderProvenChannels: channels.summary.liveProviderProven,
      hostedStagingProven: false,
      productionProven: false,
    },
    verdict,
  };
}

function runtimeFixtureAdapters(): readonly AtlasRuntimeAdapter[] {
  const bridge: AtlasRuntimeBridge = { propose: async (request) => proposal(request.requestId) };
  const fetchImpl: typeof fetch = async (_input, init) => {
    const request = JSON.parse(String(init?.body)) as AtlasTurnRequestV1;
    return new Response(JSON.stringify({ proposal: proposal(request.requestId) }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  return [
    new AtlasNativeRuntimeAdapter({ id: 'atlas-native', clock: () => '2026-07-26T03:00:00.000Z' }),
    new AtlasOpenAIAgentsRuntimeAdapter({ id: 'openai-agents', version: 'fixture', bridge }),
    new AtlasEveRuntimeAdapter({ id: 'eve', version: 'fixture', bridge }),
    new AtlasHttpRuntimeAdapter({ id: 'custom-http', endpoint: 'https://runtime.example.test/turns', version: 'fixture', fetchImpl }),
  ];
}

async function inferenceFixtureResults() {
  const references = new AtlasModelReferenceRegistry();
  for (const reference of [
    {
      ref: 'atlas://model-references/byok-primary',
      providerId: 'byok-provider',
      allowedModels: ['byok-text'],
      fingerprint: 'fp_byok',
    },
    {
      ref: 'atlas://model-references/gateway-primary',
      providerId: 'gateway-provider',
      allowedModels: ['gateway-text'],
      fingerprint: 'fp_gateway',
    },
  ]) {
    references.register({
      kind: ATLAS_MODEL_REFERENCE_VERSION,
      ...reference,
      tenantId: 'tenant_p2',
      environment: 'local',
      status: 'active',
      createdAt: '2026-07-26T03:00:00.000Z',
    });
  }
  const router = new AtlasModelRouter({ references, clock: () => '2026-07-26T03:00:00.000Z' })
    .registerProvider(new AtlasLocalFixtureModelProvider())
    .registerProvider(modelProvider('managed-provider', 'managed', 'managed-text', 2))
    .registerProvider(modelProvider('byok-provider', 'external', 'byok-text', 3))
    .registerProvider(modelProvider('gateway-provider', 'gateway', 'gateway-text', 4));

  const requests: AtlasModelRequest[] = [
    modelRequest('local-fixture', 'local-fixture', 'atlas-local-fixture'),
    modelRequest('managed', 'managed-provider', 'managed-text'),
    modelRequest('byok', 'byok-provider', 'byok-text', {
      credentialRef: 'atlas://model-references/byok-primary',
    }),
    modelRequest('gateway', 'gateway-provider', 'gateway-text', {
      credentialRef: 'atlas://model-references/gateway-primary',
      gatewayBaseUrl: 'https://gateway.example.test/v1',
    }),
  ];
  const results = [];
  for (const request of requests) {
    const result = await router.complete(request);
    results.push({
      mode: request.mode,
      provider: result.receipt.provider,
      payer: result.receipt.payer,
      fallbackUsed: result.receipt.fallbackUsed,
      verdict: result.response.text && result.receipt.requestId === request.requestId ? 'PASS' as const : 'FAIL' as const,
    });
  }
  return results;
}

function modelProvider(id: string, kind: 'managed' | 'external' | 'gateway', model: string, cost: number) {
  return new AtlasCallbackModelProvider({
    metadata: { id, name: id, kind, version: 'fixture' },
    models: {
      [model]: {
        model,
        capabilities: ['text', 'tool-calling'],
        maxContextTokens: 32_000,
        retention: kind === 'gateway' ? 'configured' : 'provider-default',
      },
    },
    complete: async () => ({
      text: `fixture response from ${id}`,
      finishReason: 'stop',
      inputTokens: 10,
      outputTokens: 5,
      actualCostMinor: cost,
    }),
    estimate: async () => ({ estimatedCostMinor: cost, currency: 'GBP' }),
  });
}

function modelRequest(
  mode: AtlasInferenceMode,
  providerId: string,
  model: string,
  overrides: Partial<AtlasModelRequest> = {},
): AtlasModelRequest {
  return {
    requestId: `model_${mode}`,
    traceId: `trace_model_${mode}`,
    tenantId: 'tenant_p2',
    environment: 'local',
    mode,
    providerId,
    model,
    messages: [{ role: 'customer', content: 'Can I move BK-100 to Friday?' }],
    requiredCapabilities: ['text', 'tool-calling'],
    maxOutputTokens: 256,
    budgetMinor: 20,
    ...overrides,
  };
}

function turnRequest(runtimeId: string, runtimeType: AtlasTurnRequestV1['actor']['runtimeType']): AtlasTurnRequestV1 {
  return {
    protocolVersion: '1',
    requestId: `request_${runtimeId}`,
    traceId: `trace_${runtimeId}`,
    packageVersion: '0.1.0-alpha.0',
    tenant: { id: 'tenant_p2', scopes: ['messages:read', 'tools:propose'] },
    actor: { runtimeId, runtimeType },
    customer: { id: 'customer_p2' },
    conversation: { id: 'conversation_p2', state: 'automated' },
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
    messages: [{ id: 'message_p2', direction: 'inbound', role: 'customer', text: 'Move BK-100 to Friday', occurredAt: '2026-07-26T03:00:00.000Z' }],
    knowledgeEvidence: [{ id: 'evidence_p2', source: 'booking-policy', digest: 'sha256:evidence', excerpt: 'Approval required.' }],
    tools: [{ name: 'front-desk.bookings.reschedule', version: '1', description: 'Reschedule booking', risk: 'high', execution: 'commit', approval: 'required', idempotency: 'required' }],
    policyConstraints: [{ id: 'approval', effect: 'require_approval', description: 'Approval required.' }],
    limits: { deadlineMs: 1000, maxProposedActions: 1 },
  };
}

function proposal(requestId: string): AtlasTurnProposalV1 {
  return {
    protocolVersion: '1',
    requestId,
    response: { text: 'Proposal ready.', replyTo: 'message_p2' },
    proposedActions: [{
      toolName: 'front-desk.bookings.reschedule',
      arguments: { bookingId: 'BK-100', requestedDate: 'Friday' },
      idempotencyKey: `proposal:${requestId}`,
    }],
    citations: ['evidence_p2'],
  };
}
