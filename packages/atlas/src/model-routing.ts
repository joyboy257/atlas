import { createHash } from 'node:crypto';

export const ATLAS_MODEL_ROUTER_VERSION = 'atlas.model-router/v1' as const;
export const ATLAS_MODEL_REFERENCE_VERSION = 'atlas.model-reference/v1' as const;

export type AtlasInferenceMode = 'local-fixture' | 'managed' | 'byok' | 'gateway';
export type AtlasInferencePayer = 'none' | 'atlas' | 'customer';
export type AtlasModelCapability = 'text' | 'structured-output' | 'tool-calling' | 'vision' | 'audio' | 'streaming';

export type AtlasModelReference = Readonly<{
  kind: typeof ATLAS_MODEL_REFERENCE_VERSION;
  ref: string;
  tenantId: string;
  environment: string;
  providerId: string;
  allowedModels: readonly string[];
  fingerprint: string;
  status: 'active' | 'revoked';
  createdAt: string;
  rotatedAt?: string;
}>;

export type AtlasModelProviderMetadata = Readonly<{
  id: string;
  name: string;
  kind: 'fixture' | 'managed' | 'external' | 'gateway';
  version: string;
}>;

export type AtlasModelCapabilities = Readonly<{
  model: string;
  capabilities: readonly AtlasModelCapability[];
  maxContextTokens: number;
  retention: 'none' | 'provider-default' | 'configured';
}>;

export type AtlasModelRequest = Readonly<{
  requestId: string;
  traceId: string;
  tenantId: string;
  environment: string;
  mode: AtlasInferenceMode;
  providerId: string;
  model: string;
  messages: readonly Readonly<{ role: 'system' | 'customer' | 'operator' | 'agent'; content: string }>[];
  requiredCapabilities: readonly AtlasModelCapability[];
  maxOutputTokens: number;
  budgetMinor: number;
  credentialRef?: string;
  gatewayBaseUrl?: string;
  fallback?: Readonly<{
    enabled: boolean;
    providerId: string;
    model: string;
    mode: AtlasInferenceMode;
    credentialRef?: string;
  }>;
}>;

export type AtlasModelResponse = Readonly<{
  text?: string;
  structured?: unknown;
  finishReason: 'stop' | 'length' | 'tool' | 'content-policy';
  inputTokens: number;
  outputTokens: number;
  actualCostMinor: number;
  providerRequestId?: string;
}>;

export type AtlasCostEstimate = Readonly<{
  estimatedCostMinor: number;
  currency: string;
}>;

export type AtlasModelProviderHealth = Readonly<{
  status: 'healthy' | 'degraded' | 'unavailable';
  checkedAt: string;
  detail?: string;
}>;

export interface AtlasModelProvider {
  metadata(): AtlasModelProviderMetadata;
  capabilities(model: string): Promise<AtlasModelCapabilities>;
  complete(request: AtlasModelRequest, signal: AbortSignal): Promise<AtlasModelResponse>;
  stream(request: AtlasModelRequest, signal: AbortSignal): AsyncIterable<Readonly<{ type: 'text-delta' | 'completed'; text?: string }>>;
  estimate(request: AtlasModelRequest): Promise<AtlasCostEstimate>;
  health(): Promise<AtlasModelProviderHealth>;
}

export type AtlasModelRouteReceipt = Readonly<{
  schemaVersion: typeof ATLAS_MODEL_ROUTER_VERSION;
  receiptId: string;
  requestId: string;
  traceId: string;
  tenantId: string;
  environment: string;
  provider: string;
  model: string;
  credentialMode: AtlasInferenceMode;
  credentialFingerprint: string | null;
  payer: AtlasInferencePayer;
  routeReason: string;
  fallbackUsed: boolean;
  estimatedCostMinor: number;
  actualCostMinor: number;
  currency: string;
  inputTokens: number;
  outputTokens: number;
  retention: AtlasModelCapabilities['retention'];
  createdAt: string;
}>;

export type AtlasModelRouteResult = Readonly<{
  response: AtlasModelResponse;
  receipt: AtlasModelRouteReceipt;
}>;

export type AtlasModelRoutingErrorCode =
  | 'INVALID_MODEL_REQUEST'
  | 'MODEL_REFERENCE_NOT_FOUND'
  | 'MODEL_REFERENCE_REVOKED'
  | 'MODEL_REFERENCE_SCOPE_MISMATCH'
  | 'MODEL_NOT_ALLOWED'
  | 'MODEL_CAPABILITY_UNSUPPORTED'
  | 'MODEL_PROVIDER_UNAVAILABLE'
  | 'MODEL_BUDGET_EXHAUSTED'
  | 'MODEL_FALLBACK_NOT_AUTHORISED'
  | 'MODEL_GATEWAY_INCOMPATIBLE'
  | 'MODEL_COST_MISMATCH';

export class AtlasModelRoutingError extends Error {
  readonly code: AtlasModelRoutingErrorCode;
  readonly retryable: boolean;
  readonly nextAction: string;

  constructor(
    code: AtlasModelRoutingErrorCode,
    message: string,
    options: Readonly<{ retryable?: boolean; nextAction?: string }> = {},
  ) {
    super(message);
    this.name = 'AtlasModelRoutingError';
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.nextAction = options.nextAction ?? 'Inspect the model route receipt and correct the provider, model, reference, or budget.';
  }
}

export class AtlasModelReferenceRegistry {
  private readonly references = new Map<string, AtlasModelReference>();

  register(value: AtlasModelReference): AtlasModelReference {
    const reference = validateModelReference(value);
    const existing = this.references.get(reference.ref);
    if (existing && existing.tenantId !== reference.tenantId) {
      throw new AtlasModelRoutingError('MODEL_REFERENCE_SCOPE_MISMATCH', `Reference ${reference.ref} already belongs to another tenant`);
    }
    this.references.set(reference.ref, reference);
    return clone(reference);
  }

  resolve(ref: string, scope: Readonly<{ tenantId: string; environment: string; providerId: string; model: string }>): AtlasModelReference {
    const reference = this.references.get(ref);
    if (!reference) throw new AtlasModelRoutingError('MODEL_REFERENCE_NOT_FOUND', `Model reference ${ref} was not found`);
    if (reference.status === 'revoked') throw new AtlasModelRoutingError('MODEL_REFERENCE_REVOKED', `Model reference ${ref} is revoked`);
    if (reference.tenantId !== scope.tenantId || reference.environment !== scope.environment || reference.providerId !== scope.providerId) {
      throw new AtlasModelRoutingError('MODEL_REFERENCE_SCOPE_MISMATCH', `Model reference ${ref} does not match the requested tenant, environment, or provider`);
    }
    if (!reference.allowedModels.includes(scope.model)) {
      throw new AtlasModelRoutingError('MODEL_NOT_ALLOWED', `Model ${scope.model} is not allowed by ${ref}`);
    }
    return clone(reference);
  }

  revoke(ref: string, tenantId: string): AtlasModelReference {
    const reference = this.references.get(ref);
    if (!reference) throw new AtlasModelRoutingError('MODEL_REFERENCE_NOT_FOUND', `Model reference ${ref} was not found`);
    if (reference.tenantId !== tenantId) throw new AtlasModelRoutingError('MODEL_REFERENCE_SCOPE_MISMATCH', `Reference ${ref} belongs to another tenant`);
    const revoked = { ...reference, status: 'revoked' as const };
    this.references.set(ref, revoked);
    return clone(revoked);
  }

  rotate(ref: string, tenantId: string, fingerprint: string, rotatedAt: string): AtlasModelReference {
    const reference = this.references.get(ref);
    if (!reference) throw new AtlasModelRoutingError('MODEL_REFERENCE_NOT_FOUND', `Model reference ${ref} was not found`);
    if (reference.tenantId !== tenantId) throw new AtlasModelRoutingError('MODEL_REFERENCE_SCOPE_MISMATCH', `Reference ${ref} belongs to another tenant`);
    const rotated = validateModelReference({ ...reference, fingerprint, rotatedAt, status: 'active' });
    this.references.set(ref, rotated);
    return clone(rotated);
  }

  list(tenantId: string, environment?: string): readonly AtlasModelReference[] {
    return [...this.references.values()]
      .filter((reference) => reference.tenantId === tenantId && (!environment || reference.environment === environment))
      .map(clone);
  }
}

export class AtlasModelRouter {
  private readonly providers = new Map<string, AtlasModelProvider>();
  private readonly references: AtlasModelReferenceRegistry;
  private readonly clock: () => string;

  constructor(options: Readonly<{ references?: AtlasModelReferenceRegistry; clock?: () => string }> = {}) {
    this.references = options.references ?? new AtlasModelReferenceRegistry();
    this.clock = options.clock ?? (() => new Date().toISOString());
  }

  registerProvider(provider: AtlasModelProvider): this {
    const metadata = provider.metadata();
    if (!metadata.id.trim()) throw new AtlasModelRoutingError('INVALID_MODEL_REQUEST', 'Provider id must not be empty');
    this.providers.set(metadata.id, provider);
    return this;
  }

  referenceRegistry(): AtlasModelReferenceRegistry {
    return this.references;
  }

  async complete(value: AtlasModelRequest): Promise<AtlasModelRouteResult> {
    const request = validateModelRequest(value);
    try {
      return await this.attempt(request, false, 'requested_mode');
    } catch (error) {
      if (!(error instanceof AtlasModelRoutingError) || !error.retryable || !request.fallback?.enabled) throw error;
      const fallback = request.fallback;
      if (request.mode === 'byok' && fallback.mode === 'managed') {
        throw new AtlasModelRoutingError(
          'MODEL_FALLBACK_NOT_AUTHORISED',
          'BYOK cannot fall back to Atlas-managed inference without a separately authorised route',
          { nextAction: 'Choose another customer-owned reference or submit a new explicitly managed request.' },
        );
      }
      const fallbackRequest = validateModelRequest({
        ...request,
        providerId: fallback.providerId,
        model: fallback.model,
        mode: fallback.mode,
        ...(fallback.credentialRef ? { credentialRef: fallback.credentialRef } : { credentialRef: undefined }),
        fallback: undefined,
      });
      return this.attempt(fallbackRequest, true, `${error.code.toLowerCase()}_fallback`);
    }
  }

  private async attempt(request: AtlasModelRequest, fallbackUsed: boolean, routeReason: string): Promise<AtlasModelRouteResult> {
    const provider = this.providers.get(request.providerId);
    if (!provider) throw new AtlasModelRoutingError('MODEL_PROVIDER_UNAVAILABLE', `Provider ${request.providerId} is not registered`);
    const metadata = provider.metadata();
    const health = await provider.health();
    if (health.status === 'unavailable') {
      throw new AtlasModelRoutingError('MODEL_PROVIDER_UNAVAILABLE', `Provider ${metadata.id} is unavailable`, {
        retryable: true,
        nextAction: 'Retry after provider recovery or use an explicitly authorised fallback.',
      });
    }
    if (request.mode === 'gateway' && metadata.kind !== 'gateway') {
      throw new AtlasModelRoutingError('MODEL_GATEWAY_INCOMPATIBLE', `Provider ${metadata.id} is not a gateway provider`);
    }
    if (request.mode === 'managed' && !['managed', 'fixture'].includes(metadata.kind)) {
      throw new AtlasModelRoutingError('INVALID_MODEL_REQUEST', `Provider ${metadata.id} is not configured for managed inference`);
    }

    const reference = request.mode === 'byok' || request.mode === 'gateway'
      ? this.references.resolve(requiredReference(request), {
          tenantId: request.tenantId,
          environment: request.environment,
          providerId: request.providerId,
          model: request.model,
        })
      : null;
    const capabilities = await provider.capabilities(request.model);
    for (const required of request.requiredCapabilities) {
      if (!capabilities.capabilities.includes(required)) {
        throw new AtlasModelRoutingError('MODEL_CAPABILITY_UNSUPPORTED', `Model ${request.model} does not support ${required}`);
      }
    }
    const estimate = await provider.estimate(request);
    if (!Number.isInteger(estimate.estimatedCostMinor) || estimate.estimatedCostMinor < 0) {
      throw new AtlasModelRoutingError('MODEL_COST_MISMATCH', 'Provider returned an invalid cost estimate');
    }
    if (estimate.estimatedCostMinor > request.budgetMinor) {
      throw new AtlasModelRoutingError('MODEL_BUDGET_EXHAUSTED', `Estimated cost ${estimate.estimatedCostMinor} exceeds budget ${request.budgetMinor}`);
    }

    const controller = new AbortController();
    const response = validateModelResponse(await provider.complete(request, controller.signal));
    if (response.actualCostMinor > request.budgetMinor) {
      throw new AtlasModelRoutingError('MODEL_COST_MISMATCH', `Actual cost ${response.actualCostMinor} exceeds the authorised budget ${request.budgetMinor}`);
    }
    const payer = payerForMode(request.mode);
    const receipt: AtlasModelRouteReceipt = {
      schemaVersion: ATLAS_MODEL_ROUTER_VERSION,
      receiptId: deterministicId('model-route', request.traceId, request.requestId, metadata.id, request.model),
      requestId: request.requestId,
      traceId: request.traceId,
      tenantId: request.tenantId,
      environment: request.environment,
      provider: metadata.id,
      model: request.model,
      credentialMode: request.mode,
      credentialFingerprint: reference?.fingerprint ?? null,
      payer,
      routeReason,
      fallbackUsed,
      estimatedCostMinor: estimate.estimatedCostMinor,
      actualCostMinor: response.actualCostMinor,
      currency: estimate.currency,
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
      retention: capabilities.retention,
      createdAt: this.clock(),
    };
    return { response, receipt };
  }
}

export type AtlasCallbackModelProviderOptions = Readonly<{
  metadata: AtlasModelProviderMetadata;
  models: Readonly<Record<string, AtlasModelCapabilities>>;
  complete: (request: AtlasModelRequest, signal: AbortSignal) => Promise<AtlasModelResponse>;
  estimate: (request: AtlasModelRequest) => Promise<AtlasCostEstimate> | AtlasCostEstimate;
  health?: () => Promise<AtlasModelProviderHealth>;
}>;

export class AtlasCallbackModelProvider implements AtlasModelProvider {
  private readonly options: AtlasCallbackModelProviderOptions;

  constructor(options: AtlasCallbackModelProviderOptions) {
    this.options = options;
  }

  metadata(): AtlasModelProviderMetadata { return clone(this.options.metadata); }

  async capabilities(model: string): Promise<AtlasModelCapabilities> {
    const capabilities = this.options.models[model];
    if (!capabilities) throw new AtlasModelRoutingError('MODEL_NOT_ALLOWED', `Provider ${this.options.metadata.id} does not expose model ${model}`);
    return clone(capabilities);
  }

  async complete(request: AtlasModelRequest, signal: AbortSignal): Promise<AtlasModelResponse> {
    return this.options.complete(request, signal);
  }

  async *stream(request: AtlasModelRequest, signal: AbortSignal): AsyncIterable<Readonly<{ type: 'text-delta' | 'completed'; text?: string }>> {
    const response = await this.complete(request, signal);
    if (response.text) yield { type: 'text-delta', text: response.text };
    yield { type: 'completed' };
  }

  async estimate(request: AtlasModelRequest): Promise<AtlasCostEstimate> { return this.options.estimate(request); }

  async health(): Promise<AtlasModelProviderHealth> {
    return this.options.health?.() ?? { status: 'healthy', checkedAt: new Date().toISOString() };
  }
}

export class AtlasLocalFixtureModelProvider implements AtlasModelProvider {
  metadata(): AtlasModelProviderMetadata {
    return { id: 'local-fixture', name: 'Atlas Local Fixture', kind: 'fixture', version: '1' };
  }

  async capabilities(model: string): Promise<AtlasModelCapabilities> {
    if (model !== 'atlas-local-fixture') throw new AtlasModelRoutingError('MODEL_NOT_ALLOWED', `Unknown fixture model ${model}`);
    return {
      model,
      capabilities: ['text', 'structured-output', 'tool-calling', 'streaming'],
      maxContextTokens: 32_000,
      retention: 'none',
    };
  }

  async complete(request: AtlasModelRequest): Promise<AtlasModelResponse> {
    const content = request.messages.at(-1)?.content ?? '';
    return {
      text: content.includes('BK-') ? 'A deterministic booking-change proposal is ready for Atlas policy.' : 'Deterministic local response.',
      finishReason: 'stop',
      inputTokens: estimateTokens(request.messages.map((message) => message.content).join(' ')),
      outputTokens: 12,
      actualCostMinor: 0,
      providerRequestId: deterministicId('fixture', request.requestId),
    };
  }

  async *stream(request: AtlasModelRequest): AsyncIterable<Readonly<{ type: 'text-delta' | 'completed'; text?: string }>> {
    const response = await this.complete(request);
    yield { type: 'text-delta', text: response.text };
    yield { type: 'completed' };
  }

  async estimate(): Promise<AtlasCostEstimate> { return { estimatedCostMinor: 0, currency: 'GBP' }; }
  async health(): Promise<AtlasModelProviderHealth> { return { status: 'healthy', checkedAt: new Date().toISOString() }; }
}

function validateModelReference(value: AtlasModelReference): AtlasModelReference {
  if (value.kind !== ATLAS_MODEL_REFERENCE_VERSION) invalid('Model reference kind is invalid');
  if (!/^atlas:\/\/model-references\/[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$/.test(value.ref)) invalid('Model reference path is invalid');
  for (const [label, item] of Object.entries({ tenantId: value.tenantId, environment: value.environment, providerId: value.providerId, fingerprint: value.fingerprint, createdAt: value.createdAt })) {
    if (typeof item !== 'string' || !item.trim()) invalid(`Model reference ${label} is required`);
  }
  if (!Array.isArray(value.allowedModels) || value.allowedModels.length === 0 || new Set(value.allowedModels).size !== value.allowedModels.length) invalid('Model reference needs unique allowed models');
  if (!['active', 'revoked'].includes(value.status)) invalid('Model reference status is invalid');
  return freeze(clone(value));
}

function validateModelRequest(value: AtlasModelRequest): AtlasModelRequest {
  for (const [label, item] of Object.entries({ requestId: value.requestId, traceId: value.traceId, tenantId: value.tenantId, environment: value.environment, providerId: value.providerId, model: value.model })) {
    if (typeof item !== 'string' || !item.trim()) invalid(`${label} is required`);
  }
  if (!['local-fixture', 'managed', 'byok', 'gateway'].includes(value.mode)) invalid('Inference mode is invalid');
  if (!Array.isArray(value.messages) || value.messages.length === 0) invalid('At least one model message is required');
  if (!Number.isInteger(value.maxOutputTokens) || value.maxOutputTokens <= 0) invalid('maxOutputTokens must be positive');
  if (!Number.isInteger(value.budgetMinor) || value.budgetMinor < 0) invalid('budgetMinor must be non-negative');
  if ((value.mode === 'byok' || value.mode === 'gateway') && !value.credentialRef) invalid(`${value.mode} requires a model reference`);
  if (value.mode === 'gateway' && (!value.gatewayBaseUrl || !['http:', 'https:'].includes(new URL(value.gatewayBaseUrl).protocol))) {
    throw new AtlasModelRoutingError('MODEL_GATEWAY_INCOMPATIBLE', 'Gateway mode requires a valid http(s) base URL');
  }
  return freeze(clone(value));
}

function validateModelResponse(value: AtlasModelResponse): AtlasModelResponse {
  if (!value || typeof value !== 'object') invalid('Model response must be an object');
  if (value.text === undefined && value.structured === undefined) invalid('Model response requires text or structured output');
  if (!['stop', 'length', 'tool', 'content-policy'].includes(value.finishReason)) invalid('Model finish reason is invalid');
  for (const [label, item] of Object.entries({ inputTokens: value.inputTokens, outputTokens: value.outputTokens, actualCostMinor: value.actualCostMinor })) {
    if (!Number.isInteger(item) || item < 0) invalid(`${label} must be a non-negative integer`);
  }
  return freeze(clone(value));
}

function requiredReference(request: AtlasModelRequest): string {
  if (!request.credentialRef) invalid(`${request.mode} requires a model reference`);
  return request.credentialRef;
}

function payerForMode(mode: AtlasInferenceMode): AtlasInferencePayer {
  if (mode === 'local-fixture') return 'none';
  if (mode === 'managed') return 'atlas';
  return 'customer';
}

function invalid(message: string): never {
  throw new AtlasModelRoutingError('INVALID_MODEL_REQUEST', message);
}

function deterministicId(prefix: string, ...parts: string[]): string {
  return `${prefix}_${createHash('sha256').update(parts.join('\u0000')).digest('hex').slice(0, 24)}`;
}

function estimateTokens(text: string): number { return Math.max(1, Math.ceil(text.length / 4)); }
function clone<T>(value: T): T { return structuredClone(value); }
function freeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const item of Object.values(value as Record<string, unknown>)) freeze(item);
  }
  return value;
}
