import { AtlasCliError } from './errors.js';

export const CAPACITY_MODEL_SCHEMA = 'atlas.capacity-model/v1';

export type CapacityProfileName = 'steady' | 'peak' | 'burst' | 'abuse';
export type CapacityProvider = Readonly<{ provider: string; quotaPerMinute: number; share: number }>;
export type CapacityTenantDistribution = Readonly<{ tier: string; tenants: number; missionsPerMinute: number; share: number }>;
export type CapacityCostDrivers = Readonly<{
  inferenceInputTokens: number;
  inferenceOutputTokens: number;
  toolCalls: number;
  providerEvents: number;
  mediaBytes: number;
  receipts: number;
}>;
export type CapacityProfile = Readonly<{
  name: CapacityProfileName;
  missionsPerMinute: number;
  stepsPerMission: number;
  conversationsPerMission: number;
  cost: CapacityCostDrivers;
}>;
export type CapacityFault = Readonly<{
  id: string;
  domain: 'ingress' | 'coordination' | 'inference' | 'action' | 'provider' | 'reconciliation';
  expected: string;
  containment: string;
}>;
export type CapacityModel = Readonly<{
  schemaVersion: typeof CAPACITY_MODEL_SCHEMA;
  modelId: string;
  confidence: Readonly<{ low: number; high: number; unit: string }>;
  providers: readonly CapacityProvider[];
  tenants: readonly CapacityTenantDistribution[];
  profiles: readonly CapacityProfile[];
  faults: readonly CapacityFault[];
}>;

export type CapacityCostSummary = Readonly<{
  missions: number;
  actions: number;
  providerEvents: number;
  mediaBytes: number;
  receipts: number;
  inputTokens: number;
  outputTokens: number;
}>;

export const DEFAULT_CAPACITY_MODEL: CapacityModel = {
  schemaVersion: CAPACITY_MODEL_SCHEMA,
  modelId: 'atlas-local-reference-2026-07',
  confidence: { low: 0.5, high: 0.8, unit: 'planning confidence, not observed SLO' },
  providers: [
    { provider: 'local-fixture', quotaPerMinute: 10_000, share: 1 },
  ],
  tenants: [
    { tier: 'small', tenants: 90, missionsPerMinute: 1, share: 0.9 },
    { tier: 'enterprise', tenants: 10, missionsPerMinute: 6, share: 0.1 },
  ],
  profiles: [
    { name: 'steady', missionsPerMinute: 15, stepsPerMission: 4, conversationsPerMission: 1, cost: { inferenceInputTokens: 900, inferenceOutputTokens: 300, toolCalls: 2, providerEvents: 1, mediaBytes: 0, receipts: 3 } },
    { name: 'peak', missionsPerMinute: 45, stepsPerMission: 6, conversationsPerMission: 1, cost: { inferenceInputTokens: 1_500, inferenceOutputTokens: 500, toolCalls: 3, providerEvents: 2, mediaBytes: 0, receipts: 4 } },
    { name: 'burst', missionsPerMinute: 120, stepsPerMission: 8, conversationsPerMission: 1, cost: { inferenceInputTokens: 2_000, inferenceOutputTokens: 700, toolCalls: 5, providerEvents: 3, mediaBytes: 8_192, receipts: 5 } },
    { name: 'abuse', missionsPerMinute: 300, stepsPerMission: 12, conversationsPerMission: 2, cost: { inferenceInputTokens: 3_000, inferenceOutputTokens: 1_000, toolCalls: 10, providerEvents: 5, mediaBytes: 65_536, receipts: 8 } },
  ],
  faults: [
    { id: 'ingress-timeout', domain: 'ingress', expected: 'bounded retry or rejection', containment: 'ingress timeout budget' },
    { id: 'coordination-store-unavailable', domain: 'coordination', expected: 'no committed effect', containment: 'durable store circuit breaker' },
    { id: 'inference-timeout', domain: 'inference', expected: 'Mission waits or fails explicitly', containment: 'step deadline and retry budget' },
    { id: 'action-conflict', domain: 'action', expected: 'idempotent conflict result', containment: 'action idempotency key' },
    { id: 'provider-rate-limit', domain: 'provider', expected: 'queued retry with quota reservation', containment: 'provider quota gate' },
    { id: 'callback-loss', domain: 'reconciliation', expected: 'outbox remains unresolved', containment: 'reconciliation replay' },
  ],
};

export function validateCapacityModel(value: unknown): { valid: boolean; errors: string[]; model?: CapacityModel } {
  const errors: string[] = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { valid: false, errors: ['capacity model must be an object'] };
  const model = value as Record<string, unknown>;
  if (model.schemaVersion !== CAPACITY_MODEL_SCHEMA) errors.push(`schemaVersion must be ${CAPACITY_MODEL_SCHEMA}`);
  if (typeof model.modelId !== 'string' || !model.modelId.trim()) errors.push('modelId is required');
  validateShareCollection(model.providers, 'providers', errors);
  validateProviderFields(model.providers, errors);
  validateShareCollection(model.tenants, 'tenants', errors);
  validateTenantFields(model.tenants, errors);
  const profiles = model.profiles as unknown[] | undefined;
  const profileNames = profiles?.map((profile) => (profile as Record<string, unknown>)?.name);
  if (!profiles || profiles.length !== 4 || new Set(profileNames).size !== 4 || !(['steady', 'peak', 'burst', 'abuse'] as const).every((name) => profileNames?.includes(name))) {
    errors.push('profiles must contain steady, peak, burst and abuse exactly once');
  } else {
    profiles.forEach((profile) => validateProfile(profile, errors));
  }
  if (!Array.isArray(model.faults) || model.faults.length === 0) errors.push('faults must not be empty');
  const confidence = model.confidence as Record<string, unknown> | undefined;
  if (typeof confidence?.low !== 'number' || typeof confidence.high !== 'number' || confidence.low < 0 || confidence.high > 1 || confidence.low > confidence.high) errors.push('confidence must be an ordered range between 0 and 1');
  return errors.length === 0 ? { valid: true, errors, model: value as CapacityModel } : { valid: false, errors };
}

export function estimateCapacity(model: CapacityModel, profileName: CapacityProfileName, minutes: number): CapacityCostSummary {
  if (!Number.isFinite(minutes) || minutes < 0) throw new AtlasCliError('USAGE_ERROR', 'minutes must be a non-negative finite number');
  const profile = model.profiles.find((item) => item.name === profileName);
  if (!profile) throw new AtlasCliError('USAGE_ERROR', `Unknown capacity profile: ${profileName}`);
  const missions = profile.missionsPerMinute * minutes;
  return {
    missions,
    actions: missions * profile.stepsPerMission,
    providerEvents: missions * profile.cost.providerEvents,
    mediaBytes: missions * profile.cost.mediaBytes,
    receipts: missions * profile.cost.receipts,
    inputTokens: missions * profile.cost.inferenceInputTokens,
    outputTokens: missions * profile.cost.inferenceOutputTokens,
  };
}

function validateProviderFields(value: unknown, errors: string[]): void {
  for (const item of Array.isArray(value) ? value : []) {
    const provider = item as Record<string, unknown>;
    if (typeof provider.provider !== 'string' || !provider.provider.trim()) errors.push('providers require provider names');
    if (typeof provider.quotaPerMinute !== 'number' || provider.quotaPerMinute < 0) errors.push('provider quotas must be non-negative numbers');
  }
}

function validateTenantFields(value: unknown, errors: string[]): void {
  for (const item of Array.isArray(value) ? value : []) {
    const tenant = item as Record<string, unknown>;
    if (typeof tenant.tier !== 'string' || !tenant.tier.trim()) errors.push('tenants require tiers');
    if (typeof tenant.tenants !== 'number' || tenant.tenants < 0 || typeof tenant.missionsPerMinute !== 'number' || tenant.missionsPerMinute < 0) errors.push('tenant counts and mission rates must be non-negative numbers');
  }
}

function validateProfile(value: unknown, errors: string[]): void {
  const profile = value as Record<string, unknown>;
  for (const field of ['missionsPerMinute', 'stepsPerMission', 'conversationsPerMission']) {
    if (typeof profile[field] !== 'number' || profile[field] < 0) errors.push(`profile ${String(profile.name)} requires non-negative ${field}`);
  }
  const cost = profile.cost as Record<string, unknown> | undefined;
  if (!cost || typeof cost !== 'object' || Array.isArray(cost)) {
    errors.push(`profile ${String(profile.name)} requires cost drivers`);
    return;
  }
  for (const field of ['inferenceInputTokens', 'inferenceOutputTokens', 'toolCalls', 'providerEvents', 'mediaBytes', 'receipts']) {
    if (typeof cost[field] !== 'number' || cost[field] < 0) errors.push(`profile ${String(profile.name)} requires non-negative cost ${field}`);
  }
}

function validateShareCollection(value: unknown, name: string, errors: string[]): void {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(`${name} must not be empty`);
    return;
  }
  const shares = value.map((item) => Number((item as Record<string, unknown>)?.share));
  if (shares.some((share) => !Number.isFinite(share) || share < 0 || share > 1)) errors.push(`${name} shares must be between 0 and 1`);
  if (Math.abs(shares.reduce((sum, share) => sum + share, 0) - 1) > 0.000001) errors.push(`${name} shares must sum to 1`);
}
