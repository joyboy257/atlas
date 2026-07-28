import { describe, expect, it, vi } from 'vitest';
import {
  AtlasRuntimeGateway,
  AtlasRuntimeProtocolError,
  validateAtlasTurnProposal,
  validateAtlasTurnRequest,
  type AtlasRuntimeAdapter,
  type AtlasRuntimeCapabilities,
  type AtlasRuntimeHealth,
  type AtlasRuntimeMetadata,
  type AtlasTurnProposalV1,
  type AtlasTurnRequestV1,
} from '../src/runtime-protocol.js';

function turnRequest(overrides: Record<string, unknown> = {}): AtlasTurnRequestV1 {
  return {
    protocolVersion: '1',
    requestId: 'req_001',
    traceId: 'trace_001',
    packageVersion: '0.1.0-preview.0',
    tenant: { id: 'tenant_001', scopes: ['messages:read', 'tools:propose'] },
    actor: { runtimeId: 'runtime_native', runtimeType: 'atlas-native' },
    customer: { id: 'customer_001', attributes: { tier: 'standard' } },
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
      proactive: { supported: true, consentRequired: true, windowPolicy: 'local-window' },
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
      { id: 'evidence_001', source: 'knowledge/booking-policy.md', digest: 'sha256:evidence', excerpt: 'Changes require approval.' },
    ],
    tools: [
      {
        name: 'front-desk.bookings.reschedule',
        version: '1',
        description: 'Propose a booking reschedule.',
        risk: 'high',
        execution: 'commit',
        approval: 'required',
        idempotency: 'required',
      },
    ],
    policyConstraints: [
      {
        id: 'approval-required',
        effect: 'require_approval',
        description: 'Booking changes require operator approval.',
        appliesToTools: ['front-desk.bookings.reschedule'],
      },
    ],
    limits: { deadlineMs: 1000, maxOutputTokens: 500, maxProposedActions: 1 },
    ...overrides,
  } as AtlasTurnRequestV1;
}

function proposal(overrides: Record<string, unknown> = {}): AtlasTurnProposalV1 {
  return {
    protocolVersion: '1',
    requestId: 'req_001',
    response: { text: 'I can propose that change.', replyTo: 'message_001' },
    proposedActions: [
      {
        toolName: 'front-desk.bookings.reschedule',
        arguments: { bookingId: 'BK-100', requestedDate: 'Friday' },
        idempotencyKey: 'booking:BK-100:Friday',
        explanation: 'Customer requested a new date.',
      },
    ],
    citations: ['evidence_001'],
    safeMetadata: { input_tokens: 120, output_tokens: 30, cost_minor: 2 },
    ...overrides,
  } as AtlasTurnProposalV1;
}

class StubRuntime implements AtlasRuntimeAdapter {
  readonly proposeFn = vi.fn<(request: AtlasTurnRequestV1) => Promise<AtlasTurnProposalV1>>();
  readonly cancelFn = vi.fn<(requestId: string) => Promise<void>>().mockResolvedValue(undefined);
  healthState: AtlasRuntimeHealth = { status: 'healthy', checkedAt: '2026-07-26T01:00:00.000Z' };
  metadataValue: AtlasRuntimeMetadata = {
    id: 'runtime_native',
    type: 'atlas-native',
    name: 'Atlas Native',
    version: '1.0.0',
    protocolVersions: ['1'],
    external: false,
  };
  capabilitiesValue: AtlasRuntimeCapabilities = {
    text: true,
    structuredOutput: true,
    toolProposals: true,
    streaming: false,
    cancellation: true,
  };

  constructor(result: AtlasTurnProposalV1 = proposal()) {
    this.proposeFn.mockResolvedValue(result);
  }

  metadata() { return this.metadataValue; }
  async capabilities() { return this.capabilitiesValue; }
  async propose(request: AtlasTurnRequestV1) { return this.proposeFn(request); }
  async cancel(requestId: string) { return this.cancelFn(requestId); }
  async health() { return this.healthState; }
}

function expectProtocolCode(run: () => unknown, code: string): void {
  try {
    run();
    throw new Error(`Expected ${code}`);
  } catch (error) {
    expect(error).toBeInstanceOf(AtlasRuntimeProtocolError);
    expect((error as AtlasRuntimeProtocolError).code).toBe(code);
  }
}

describe('Atlas runtime-neutral turn protocol', () => {
  it('normalizes and freezes a scoped v1 request', () => {
    const result = validateAtlasTurnRequest(turnRequest());
    expect(result.protocolVersion).toBe('1');
    expect(result.tenant.id).toBe('tenant_001');
    expect(result.tools).toHaveLength(1);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.tenant)).toBe(true);
  });

  it('validates a proposal without granting approval, commit, or direct-send authority', () => {
    const result = validateAtlasTurnProposal(turnRequest(), proposal());
    expect(result.proposedActions?.[0]?.toolName).toBe('front-desk.bookings.reschedule');
    expect(result).not.toHaveProperty('approved');
    expect(result).not.toHaveProperty('sendOutbound');
  });

  it('rejects unknown tools, approval bypass, direct send, and cross-tenant output', () => {
    expectProtocolCode(
      () => validateAtlasTurnProposal(turnRequest(), proposal({ proposedActions: [{ toolName: 'unknown.tool', arguments: {} }] })),
      'UNKNOWN_TOOL',
    );
    expectProtocolCode(
      () => validateAtlasTurnProposal(turnRequest(), proposal({ proposedActions: [{ toolName: 'front-desk.bookings.reschedule', arguments: {}, idempotencyKey: 'x', approved: true }] })),
      'APPROVAL_BYPASS_ATTEMPT',
    );
    expectProtocolCode(
      () => validateAtlasTurnProposal(turnRequest(), { ...proposal(), sendOutbound: true }),
      'DIRECT_SEND_BYPASS_ATTEMPT',
    );
    expectProtocolCode(
      () => validateAtlasTurnProposal(turnRequest(), proposal({ safeMetadata: { tenantId: 'tenant_other' } })),
      'TENANT_CROSSING_ATTEMPT',
    );
  });

  it('rejects unsupported versions, mismatched request ids, unknown citations, and action limits', () => {
    expectProtocolCode(
      () => validateAtlasTurnRequest({ ...turnRequest(), protocolVersion: '2' }),
      'UNSUPPORTED_PROTOCOL_VERSION',
    );
    expectProtocolCode(
      () => validateAtlasTurnProposal(turnRequest(), { ...proposal(), requestId: 'req_other' }),
      'INVALID_TURN_PROPOSAL',
    );
    expectProtocolCode(
      () => validateAtlasTurnProposal(turnRequest(), proposal({ citations: ['missing'] })),
      'INVALID_TURN_PROPOSAL',
    );
    expectProtocolCode(
      () => validateAtlasTurnProposal(turnRequest(), proposal({ proposedActions: [proposal().proposedActions![0], proposal().proposedActions![0]] })),
      'LIMIT_EXCEEDED',
    );
  });

  it('correlates runtime, trace, usage, cost, and deterministic replay receipts', async () => {
    const runtime = new StubRuntime();
    const gateway = new AtlasRuntimeGateway({ clock: () => new Date('2026-07-26T01:00:00.000Z') });
    const first = await gateway.propose(runtime, turnRequest());
    const second = await gateway.propose(runtime, turnRequest());

    expect(first.receipt.runtimeId).toBe('runtime_native');
    expect(first.receipt.traceId).toBe('trace_001');
    expect(first.receipt.safeUsage).toEqual({ inputTokens: 120, outputTokens: 30, costMinor: 2 });
    expect(first.receipt.replayed).toBe(false);
    expect(second.receipt.replayed).toBe(true);
    expect(runtime.proposeFn).toHaveBeenCalledTimes(1);
    expect(gateway.inspect('req_001')?.receipt.requestDigest).toBe(first.receipt.requestDigest);
  });

  it('rejects request-id reuse with different scoped input', async () => {
    const gateway = new AtlasRuntimeGateway();
    const runtime = new StubRuntime();
    await gateway.propose(runtime, turnRequest());
    await expect(
      gateway.propose(runtime, turnRequest({ messages: [{ ...turnRequest().messages[0], text: 'Different input' }] })),
    ).rejects.toMatchObject({ code: 'REQUEST_IDEMPOTENCY_MISMATCH' });
  });

  it('fails closed when runtime identity or health does not match', async () => {
    const gateway = new AtlasRuntimeGateway();
    const mismatched = new StubRuntime();
    mismatched.metadataValue = { ...mismatched.metadataValue, id: 'runtime_other' };
    await expect(gateway.propose(mismatched, turnRequest())).rejects.toMatchObject({ code: 'RUNTIME_IDENTITY_MISMATCH' });

    const unavailable = new StubRuntime();
    unavailable.healthState = { status: 'unavailable', checkedAt: '2026-07-26T01:00:00.000Z' };
    await expect(gateway.propose(unavailable, turnRequest())).rejects.toMatchObject({ code: 'RUNTIME_UNAVAILABLE', retryable: true });
  });

  it('cancels an adapter when its bounded deadline expires', async () => {
    const runtime = new StubRuntime();
    runtime.proposeFn.mockImplementation(() => new Promise(() => undefined));
    const gateway = new AtlasRuntimeGateway();
    await expect(gateway.propose(runtime, turnRequest({ limits: { deadlineMs: 10, maxProposedActions: 1 } }))).rejects.toMatchObject({
      code: 'RUNTIME_TIMEOUT',
      retryable: true,
    });
    expect(runtime.cancelFn).toHaveBeenCalledWith('req_001');
  });
});
