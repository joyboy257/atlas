import { describe, expect, it, vi } from 'vitest';
import {
  ATLAS_MODEL_REFERENCE_VERSION,
  AtlasCallbackModelProvider,
  AtlasLocalFixtureModelProvider,
  AtlasModelReferenceRegistry,
  AtlasModelRouter,
  type AtlasInferenceMode,
  type AtlasModelProviderMetadata,
  type AtlasModelRequest,
} from '../src/model-routing.js';

function request(mode: AtlasInferenceMode, overrides: Partial<AtlasModelRequest> = {}): AtlasModelRequest {
  const defaults: Record<AtlasInferenceMode, Pick<AtlasModelRequest, 'providerId' | 'model'>> = {
    'local-fixture': { providerId: 'local-fixture', model: 'atlas-local-fixture' },
    managed: { providerId: 'managed-provider', model: 'managed-text' },
    byok: { providerId: 'customer-provider', model: 'customer-text' },
    gateway: { providerId: 'customer-gateway', model: 'gateway-text' },
  };
  return {
    requestId: `request_${mode}`,
    traceId: `trace_${mode}`,
    tenantId: 'tenant_001',
    environment: 'development',
    mode,
    ...defaults[mode],
    messages: [{ role: 'customer', content: 'Can I move BK-100 to Friday?' }],
    requiredCapabilities: ['text', 'tool-calling'],
    maxOutputTokens: 256,
    budgetMinor: 20,
    ...(mode === 'byok' ? { credentialRef: 'atlas://model-references/customer-primary' } : {}),
    ...(mode === 'gateway'
      ? {
          credentialRef: 'atlas://model-references/gateway-primary',
          gatewayBaseUrl: 'https://gateway.example.test/v1',
        }
      : {}),
    ...overrides,
  };
}

function provider(
  metadata: AtlasModelProviderMetadata,
  model: string,
  options: Readonly<{ cost?: number; unavailable?: boolean; capabilities?: readonly ('text' | 'tool-calling' | 'structured-output')[] }> = {},
) {
  const complete = vi.fn(async () => ({
    text: `response from ${metadata.id}`,
    finishReason: 'stop' as const,
    inputTokens: 12,
    outputTokens: 5,
    actualCostMinor: options.cost ?? 3,
    providerRequestId: `provider_${metadata.id}`,
  }));
  return {
    provider: new AtlasCallbackModelProvider({
      metadata,
      models: {
        [model]: {
          model,
          capabilities: options.capabilities ?? ['text', 'tool-calling'],
          maxContextTokens: 32_000,
          retention: metadata.kind === 'gateway' ? 'configured' : 'provider-default',
        },
      },
      complete,
      estimate: async () => ({ estimatedCostMinor: options.cost ?? 3, currency: 'GBP' }),
      health: async () => ({
        status: options.unavailable ? 'unavailable' as const : 'healthy' as const,
        checkedAt: '2026-07-26T01:00:00.000Z',
      }),
    }),
    complete,
  };
}

function references(): AtlasModelReferenceRegistry {
  const registry = new AtlasModelReferenceRegistry();
  registry.register({
    kind: ATLAS_MODEL_REFERENCE_VERSION,
    ref: 'atlas://model-references/customer-primary',
    tenantId: 'tenant_001',
    environment: 'development',
    providerId: 'customer-provider',
    allowedModels: ['customer-text'],
    fingerprint: 'fp_customer_primary',
    status: 'active',
    createdAt: '2026-07-26T01:00:00.000Z',
  });
  registry.register({
    kind: ATLAS_MODEL_REFERENCE_VERSION,
    ref: 'atlas://model-references/gateway-primary',
    tenantId: 'tenant_001',
    environment: 'development',
    providerId: 'customer-gateway',
    allowedModels: ['gateway-text'],
    fingerprint: 'fp_gateway_primary',
    status: 'active',
    createdAt: '2026-07-26T01:00:00.000Z',
  });
  registry.register({
    kind: ATLAS_MODEL_REFERENCE_VERSION,
    ref: 'atlas://model-references/customer-secondary',
    tenantId: 'tenant_001',
    environment: 'development',
    providerId: 'customer-secondary',
    allowedModels: ['customer-secondary-text'],
    fingerprint: 'fp_customer_secondary',
    status: 'active',
    createdAt: '2026-07-26T01:00:00.000Z',
  });
  return registry;
}

describe('Atlas model routing', () => {
  it('runs the zero-cost local fixture with payer none', async () => {
    const router = new AtlasModelRouter({ clock: () => '2026-07-26T01:00:00.000Z' })
      .registerProvider(new AtlasLocalFixtureModelProvider());
    const result = await router.complete(request('local-fixture'));

    expect(result.receipt).toMatchObject({
      provider: 'local-fixture',
      model: 'atlas-local-fixture',
      credentialMode: 'local-fixture',
      payer: 'none',
      estimatedCostMinor: 0,
      actualCostMinor: 0,
      fallbackUsed: false,
    });
    expect(result.response.text).toContain('deterministic');
  });

  it('routes managed inference with Atlas payer attribution', async () => {
    const managed = provider({ id: 'managed-provider', name: 'Managed', kind: 'managed', version: '1' }, 'managed-text');
    const router = new AtlasModelRouter().registerProvider(managed.provider);
    const result = await router.complete(request('managed'));

    expect(result.receipt.payer).toBe('atlas');
    expect(result.receipt.credentialFingerprint).toBeNull();
    expect(result.receipt.estimatedCostMinor).toBe(3);
    expect(managed.complete).toHaveBeenCalledTimes(1);
  });

  it('binds BYOK to tenant, environment, provider, model, payer, and fingerprint', async () => {
    const customer = provider({ id: 'customer-provider', name: 'Customer Provider', kind: 'external', version: '1' }, 'customer-text');
    const router = new AtlasModelRouter({ references: references() }).registerProvider(customer.provider);
    const result = await router.complete(request('byok'));

    expect(result.receipt).toMatchObject({
      credentialMode: 'byok',
      payer: 'customer',
      credentialFingerprint: 'fp_customer_primary',
      tenantId: 'tenant_001',
      environment: 'development',
    });
  });

  it('routes a customer gateway only through a gateway provider', async () => {
    const gateway = provider({ id: 'customer-gateway', name: 'Customer Gateway', kind: 'gateway', version: '1' }, 'gateway-text');
    const router = new AtlasModelRouter({ references: references() }).registerProvider(gateway.provider);
    const result = await router.complete(request('gateway'));

    expect(result.receipt).toMatchObject({ credentialMode: 'gateway', payer: 'customer', retention: 'configured' });
    expect(result.response.text).toContain('customer-gateway');
  });

  it('rejects cross-tenant, disallowed-model, and revoked references', async () => {
    const registry = references();
    const customer = provider({ id: 'customer-provider', name: 'Customer Provider', kind: 'external', version: '1' }, 'customer-text');
    const router = new AtlasModelRouter({ references: registry }).registerProvider(customer.provider);

    await expect(router.complete(request('byok', { tenantId: 'tenant_other' }))).rejects.toMatchObject({
      code: 'MODEL_REFERENCE_SCOPE_MISMATCH',
    });
    await expect(router.complete(request('byok', { model: 'not-allowed' }))).rejects.toMatchObject({
      code: 'MODEL_NOT_ALLOWED',
    });
    registry.revoke('atlas://model-references/customer-primary', 'tenant_001');
    await expect(router.complete(request('byok'))).rejects.toMatchObject({ code: 'MODEL_REFERENCE_REVOKED' });
  });

  it('fails before inference when capabilities or budget do not pass', async () => {
    const managed = provider(
      { id: 'managed-provider', name: 'Managed', kind: 'managed', version: '1' },
      'managed-text',
      { cost: 8, capabilities: ['text'] },
    );
    const router = new AtlasModelRouter().registerProvider(managed.provider);

    await expect(router.complete(request('managed'))).rejects.toMatchObject({ code: 'MODEL_CAPABILITY_UNSUPPORTED' });
    await expect(router.complete(request('managed', { requiredCapabilities: ['text'], budgetMinor: 2 }))).rejects.toMatchObject({
      code: 'MODEL_BUDGET_EXHAUSTED',
    });
    expect(managed.complete).not.toHaveBeenCalled();
  });

  it('does not silently convert BYOK provider outage into managed inference', async () => {
    const unavailable = provider(
      { id: 'customer-provider', name: 'Customer Provider', kind: 'external', version: '1' },
      'customer-text',
      { unavailable: true },
    );
    const managed = provider({ id: 'managed-provider', name: 'Managed', kind: 'managed', version: '1' }, 'managed-text');
    const router = new AtlasModelRouter({ references: references() })
      .registerProvider(unavailable.provider)
      .registerProvider(managed.provider);

    await expect(
      router.complete(request('byok', {
        fallback: { enabled: true, providerId: 'managed-provider', model: 'managed-text', mode: 'managed' },
      })),
    ).rejects.toMatchObject({ code: 'MODEL_FALLBACK_NOT_AUTHORISED' });
    expect(managed.complete).not.toHaveBeenCalled();
  });

  it('uses an explicitly configured customer-owned fallback and records it', async () => {
    const unavailable = provider(
      { id: 'customer-provider', name: 'Customer Provider', kind: 'external', version: '1' },
      'customer-text',
      { unavailable: true },
    );
    const secondary = provider(
      { id: 'customer-secondary', name: 'Customer Secondary', kind: 'external', version: '1' },
      'customer-secondary-text',
    );
    const router = new AtlasModelRouter({ references: references() })
      .registerProvider(unavailable.provider)
      .registerProvider(secondary.provider);
    const result = await router.complete(request('byok', {
      fallback: {
        enabled: true,
        providerId: 'customer-secondary',
        model: 'customer-secondary-text',
        mode: 'byok',
        credentialRef: 'atlas://model-references/customer-secondary',
      },
    }));

    expect(result.receipt).toMatchObject({
      provider: 'customer-secondary',
      fallbackUsed: true,
      payer: 'customer',
      credentialFingerprint: 'fp_customer_secondary',
    });
    expect(result.receipt.routeReason).toContain('provider_unavailable');
  });

  it('rotates and revokes references without exposing material', () => {
    const registry = references();
    const rotated = registry.rotate(
      'atlas://model-references/customer-primary',
      'tenant_001',
      'fp_customer_rotated',
      '2026-07-26T02:00:00.000Z',
    );
    expect(rotated).toMatchObject({ fingerprint: 'fp_customer_rotated', status: 'active' });
    expect(JSON.stringify(rotated)).not.toContain('material');
    expect(registry.revoke(rotated.ref, 'tenant_001').status).toBe('revoked');
  });
});
