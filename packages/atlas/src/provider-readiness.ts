export const ATLAS_PROVIDER_READINESS_SCHEMA = 'atlas.provider-readiness/v1' as const;

export const ATLAS_PROVIDER_READINESS_STATES = [
  'DECLARED',
  'LOCAL_CONFORMANCE',
  'PROVIDER_SANDBOX_PROVEN',
  'LIMITED_PRODUCTION',
  'PRODUCTION_PROVEN',
  'BLOCKED_PROVIDER',
  'DEPRECATED',
] as const;

export type AtlasProviderReadinessState = typeof ATLAS_PROVIDER_READINESS_STATES[number];
export type AtlasProviderReadinessEnvironment = 'local' | 'sandbox' | 'staging' | 'limited-production' | 'production';
export type AtlasProviderReadinessEvidenceKind =
  | 'declaration'
  | 'local-conformance'
  | 'provider-sandbox'
  | 'limited-production'
  | 'production'
  | 'blocker'
  | 'deprecation';
export type AtlasProviderReadinessEvidenceSource = 'local' | 'provider' | 'operator';

export type AtlasProviderReadinessScope = Readonly<{
  channelId: string;
  provider: string;
  adapterVersion: string;
  contractVersion: string;
  accountId?: string;
  businessId?: string;
  appId?: string;
  environment: AtlasProviderReadinessEnvironment;
  region: string;
  capability: string;
  consentConstraints: readonly string[];
}>;

export type AtlasProviderReadinessEvidence = Readonly<{
  evidenceId: string;
  kind: AtlasProviderReadinessEvidenceKind;
  source: AtlasProviderReadinessEvidenceSource;
  environment: AtlasProviderReadinessEnvironment;
  scopeKey: string;
  observedAt: string;
  expiresAt?: string;
  summary: string;
  redacted: boolean;
  checksum: string;
  rawResultReference?: string;
}>;

export type AtlasProviderReadinessDeprecation = Readonly<{
  stopAdmissionAt: string;
  migrationPath: string;
  activeMissionHandling: string;
  customerCommunication: string;
}>;

export type AtlasProviderReadinessRecord = Readonly<{
  schemaVersion: typeof ATLAS_PROVIDER_READINESS_SCHEMA;
  readinessId: string;
  state: AtlasProviderReadinessState;
  scope: AtlasProviderReadinessScope;
  evidence: readonly AtlasProviderReadinessEvidence[];
  supportOwner: string;
  limitations: readonly string[];
  updatedAt: string;
  deprecation?: AtlasProviderReadinessDeprecation;
}>;

export type AtlasProviderReadinessValidation = Readonly<{
  valid: boolean;
  errors: readonly string[];
  record?: AtlasProviderReadinessRecord;
}>;

export type AtlasProviderEvidenceVerifier = (
  evidence: AtlasProviderReadinessEvidence,
  scope: AtlasProviderReadinessScope,
) => boolean;

export type AtlasProviderReadinessRegistryOptions = Readonly<{
  now?: string;
  verifyProviderEvidence?: AtlasProviderEvidenceVerifier;
}>;

export type AtlasProviderCertificationCheck =
  | 'auth'
  | 'eligibility'
  | 'webhooks'
  | 'retry'
  | 'rate'
  | 'spend'
  | 'media'
  | 'templates'
  | 'reconciliation';

export const ATLAS_PROVIDER_CERTIFICATION_CHECKS: readonly AtlasProviderCertificationCheck[] = [
  'auth',
  'eligibility',
  'webhooks',
  'retry',
  'rate',
  'spend',
  'media',
  'templates',
  'reconciliation',
];

export type AtlasProviderCertificationResult = Readonly<{
  schemaVersion: typeof ATLAS_PROVIDER_READINESS_SCHEMA;
  readinessId: string;
  scope: AtlasProviderReadinessScope;
  checks: Readonly<Record<AtlasProviderCertificationCheck, boolean>>;
  passed: number;
  total: number;
  verdict: 'PASS' | 'FAIL';
  eligibleState: AtlasProviderReadinessState | null;
  claims: Readonly<{
    localConformance: boolean;
    providerSandboxProven: boolean;
    limitedProduction: boolean;
    productionProven: boolean;
  }>;
  limitations: readonly string[];
}>;

export class AtlasProviderReadinessError extends Error {
  readonly code: 'INVALID_RECORD' | 'DUPLICATE_SCOPE' | 'INVALID_TRANSITION' | 'EVIDENCE_REQUIRED' | 'EVIDENCE_EXPIRED';

  constructor(
    code: AtlasProviderReadinessError['code'],
    message: string,
  ) {
    super(message);
    this.name = 'AtlasProviderReadinessError';
    this.code = code;
  }
}

const RANK: Readonly<Record<AtlasProviderReadinessState, number>> = {
  DECLARED: 0,
  LOCAL_CONFORMANCE: 1,
  PROVIDER_SANDBOX_PROVEN: 2,
  LIMITED_PRODUCTION: 3,
  PRODUCTION_PROVEN: 4,
  BLOCKED_PROVIDER: -1,
  DEPRECATED: -2,
};

const EVIDENCE_FOR_STATE: Readonly<Record<AtlasProviderReadinessState, AtlasProviderReadinessEvidenceKind | undefined>> = {
  DECLARED: 'declaration',
  LOCAL_CONFORMANCE: 'local-conformance',
  PROVIDER_SANDBOX_PROVEN: 'provider-sandbox',
  LIMITED_PRODUCTION: 'limited-production',
  PRODUCTION_PROVEN: 'production',
  BLOCKED_PROVIDER: 'blocker',
  DEPRECATED: 'deprecation',
};

export function validateAtlasProviderReadiness(value: unknown, now = new Date().toISOString()): AtlasProviderReadinessValidation {
  const errors: string[] = [];
  if (!isRecord(value)) return { valid: false, errors: ['readiness record must be an object'] };
  if (value.schemaVersion !== ATLAS_PROVIDER_READINESS_SCHEMA) errors.push(`schemaVersion must be ${ATLAS_PROVIDER_READINESS_SCHEMA}`);
  requiredString(value.readinessId, 'readinessId', errors);
  if (!isState(value.state)) errors.push(`state must be one of ${ATLAS_PROVIDER_READINESS_STATES.join(', ')}`);
  requiredString(value.supportOwner, 'supportOwner', errors);
  validateTimestamp(value.updatedAt, 'updatedAt', errors);
  const scope = validateScope(value.scope, errors);
  const evidence = validateEvidence(value.evidence, value.scope, now, errors);
  if (!Array.isArray(value.limitations) || value.limitations.some((item) => typeof item !== 'string' || !item.trim())) {
    errors.push('limitations must be an array of non-empty strings');
  }
  if (errors.length > 0 || !scope || !evidence || !isState(value.state)) return { valid: false, errors };
  return { valid: true, errors, record: freeze(clone(value as AtlasProviderReadinessRecord)) };
}

export function providerReadinessKey(scope: AtlasProviderReadinessScope): string {
  return JSON.stringify({
    channelId: scope.channelId,
    provider: scope.provider,
    adapterVersion: scope.adapterVersion,
    contractVersion: scope.contractVersion,
    accountId: scope.accountId ?? null,
    businessId: scope.businessId ?? null,
    appId: scope.appId ?? null,
    environment: scope.environment,
    region: scope.region,
    capability: scope.capability,
    consentConstraints: [...scope.consentConstraints].map((value) => value.trim()).sort(),
  });
}

function evidenceScopeKey(scope: AtlasProviderReadinessScope, environment = scope.environment): string {
  return providerReadinessKey({ ...scope, environment });
}

function providerReadinessIdentityKey(scope: AtlasProviderReadinessScope): string {
  const { environment: _environment, ...identity } = scope;
  return JSON.stringify({ ...identity, consentConstraints: [...scope.consentConstraints].map((value) => value.trim()).sort() });
}

export function createAtlasProviderReadinessRegistry(
  initial: readonly AtlasProviderReadinessRecord[] = [],
  options: AtlasProviderReadinessRegistryOptions = {},
): AtlasProviderReadinessRegistry {
  return new AtlasProviderReadinessRegistry(initial, options);
}

export class AtlasProviderReadinessRegistry {
  private readonly records = new Map<string, AtlasProviderReadinessRecord>();
  private readonly options: AtlasProviderReadinessRegistryOptions;

  constructor(
    initial: readonly AtlasProviderReadinessRecord[] = [],
    options: AtlasProviderReadinessRegistryOptions = {},
  ) {
    this.options = options;
    for (const record of initial) this.register(record);
  }

  register(value: AtlasProviderReadinessRecord): AtlasProviderReadinessRecord {
    const record = this.assertRecord(value);
    const key = providerReadinessKey(record.scope);
    if (this.records.has(key)) throw new AtlasProviderReadinessError('DUPLICATE_SCOPE', `Readiness scope is already registered: ${key}`);
    this.records.set(key, record);
    return clone(record);
  }

  get(scope: AtlasProviderReadinessScope): AtlasProviderReadinessRecord | undefined {
    const record = this.records.get(providerReadinessKey(scope));
    return record ? clone(record) : undefined;
  }

  list(): readonly AtlasProviderReadinessRecord[] {
    return [...this.records.values()].map(clone);
  }

  promote(
    scope: AtlasProviderReadinessScope,
    state: Exclude<AtlasProviderReadinessState, 'BLOCKED_PROVIDER' | 'DEPRECATED' | 'DECLARED'>,
    evidence: AtlasProviderReadinessEvidence,
    now = new Date().toISOString(),
  ): AtlasProviderReadinessRecord {
    return this.transition(scope, state, evidence, now);
  }

  demote(
    scope: AtlasProviderReadinessScope,
    state: Extract<AtlasProviderReadinessState, 'LOCAL_CONFORMANCE' | 'DECLARED' | 'BLOCKED_PROVIDER' | 'DEPRECATED'>,
    evidence: AtlasProviderReadinessEvidence,
    now = new Date().toISOString(),
  ): AtlasProviderReadinessRecord {
    return this.transition(scope, state, evidence, now);
  }

  private transition(
    scope: AtlasProviderReadinessScope,
    state: AtlasProviderReadinessState,
    evidence: AtlasProviderReadinessEvidence,
    now: string,
  ): AtlasProviderReadinessRecord {
    const key = providerReadinessKey(scope);
    const current = this.records.get(key) ?? [...this.records.values()].find(
      (record) => providerReadinessIdentityKey(record.scope) === providerReadinessIdentityKey(scope),
    );
    if (!current) throw new AtlasProviderReadinessError('INVALID_TRANSITION', `Readiness scope is not registered: ${key}`);
    if (current.state === 'DEPRECATED') throw new AtlasProviderReadinessError('INVALID_TRANSITION', 'Deprecated readiness cannot be promoted or demoted');
    if (!isAllowedTransition(current.state, state)) {
      throw new AtlasProviderReadinessError('INVALID_TRANSITION', `Cannot transition readiness from ${current.state} to ${state}`);
    }
    assertEvidenceForState(state, evidence, now, scope.environment);
    if (['PROVIDER_SANDBOX_PROVEN', 'LIMITED_PRODUCTION', 'PRODUCTION_PROVEN'].includes(state)) {
      if (!this.options.verifyProviderEvidence) {
        throw new AtlasProviderReadinessError('EVIDENCE_REQUIRED', 'Provider readiness requires an injected provider evidence verifier');
      }
      if (!this.options.verifyProviderEvidence(evidence, scope)) {
        throw new AtlasProviderReadinessError('EVIDENCE_REQUIRED', 'Provider evidence verifier rejected the evidence');
      }
    }
    const candidate = {
      ...current,
      state,
      scope: { ...scope },
      evidence: [...current.evidence, evidence],
      updatedAt: now,
      ...(state === 'DEPRECATED' && !current.deprecation ? {
        deprecation: {
          stopAdmissionAt: now,
          migrationPath: 'Provide an explicitly approved replacement provider scope before stopAdmissionAt.',
          activeMissionHandling: 'Keep active Missions on their current authorised route or hand off; do not admit new work.',
          customerCommunication: 'Notify affected customers through an authorised channel before admission stops.',
        },
      } : {}),
    } satisfies AtlasProviderReadinessRecord;
    const validated = validateAtlasProviderReadiness(candidate, now);
    if (!validated.valid || !validated.record) throw new AtlasProviderReadinessError('INVALID_RECORD', validated.errors.join('; '));
    this.records.delete(providerReadinessKey(current.scope));
    this.records.set(providerReadinessKey(validated.record.scope), validated.record);
    return clone(validated.record);
  }

  private assertRecord(value: AtlasProviderReadinessRecord): AtlasProviderReadinessRecord {
    const validated = validateAtlasProviderReadiness(value, this.options.now ?? new Date().toISOString());
    if (!validated.valid || !validated.record) throw new AtlasProviderReadinessError('INVALID_RECORD', validated.errors.join('; '));
    const latest = validated.record.evidence.at(-1);
    if (!latest) throw new AtlasProviderReadinessError('EVIDENCE_REQUIRED', 'Readiness records require evidence');
    assertEvidenceForState(validated.record.state, latest, validated.record.updatedAt, validated.record.scope.environment);
    return validated.record;
  }
}

export function runAtlasProviderReadinessCertification(
  record: AtlasProviderReadinessRecord,
  checks: Readonly<Partial<Record<AtlasProviderCertificationCheck, boolean>>>,
  now = new Date().toISOString(),
): AtlasProviderCertificationResult {
  const validation = validateAtlasProviderReadiness(record, now);
  if (!validation.valid || !validation.record) throw new AtlasProviderReadinessError('INVALID_RECORD', validation.errors.join('; '));
  const normalized = Object.fromEntries(ATLAS_PROVIDER_CERTIFICATION_CHECKS.map((name) => [name, checks[name] === true])) as Record<AtlasProviderCertificationCheck, boolean>;
  const passed = Object.values(normalized).filter(Boolean).length;
  const total = ATLAS_PROVIDER_CERTIFICATION_CHECKS.length;
  const allPassed = passed === total;
  const localEvidence = record.state === 'LOCAL_CONFORMANCE' && hasEvidence(record, 'local-conformance', now);
  const sandboxEvidence = record.state === 'PROVIDER_SANDBOX_PROVEN' && hasEvidence(record, 'provider-sandbox', now);
  const limitedEvidence = record.state === 'LIMITED_PRODUCTION' && hasEvidence(record, 'limited-production', now);
  const productionEvidence = record.state === 'PRODUCTION_PROVEN' && hasEvidence(record, 'production', now);
  const eligibleState = allPassed && !['BLOCKED_PROVIDER', 'DEPRECATED', 'DECLARED'].includes(record.state)
    ? record.state
    : null;
  const limitations = allPassed ? [...record.limitations] : [...record.limitations, 'Certification checks are incomplete; no readiness promotion is permitted.'];
  return {
    schemaVersion: ATLAS_PROVIDER_READINESS_SCHEMA,
    readinessId: record.readinessId,
    scope: clone(record.scope),
    checks: normalized,
    passed,
    total,
    verdict: allPassed ? 'PASS' : 'FAIL',
    eligibleState,
    claims: {
      localConformance: allPassed && localEvidence,
      providerSandboxProven: allPassed && sandboxEvidence,
      limitedProduction: allPassed && limitedEvidence,
      productionProven: allPassed && productionEvidence,
    },
    limitations,
  };
}

function validateScope(value: unknown, errors: string[]): AtlasProviderReadinessScope | undefined {
  if (!isRecord(value)) {
    errors.push('scope must be an object');
    return undefined;
  }
  for (const field of ['channelId', 'provider', 'adapterVersion', 'contractVersion', 'environment', 'region', 'capability'] as const) requiredString(value[field], `scope.${field}`, errors);
  if (!isEnvironment(value.environment)) errors.push('scope.environment must be local, sandbox, staging, limited-production, or production');
  if (![value.accountId, value.businessId, value.appId].some((item) => typeof item === 'string' && item.trim())) errors.push('scope requires accountId, businessId, or appId');
  if (!Array.isArray(value.consentConstraints) || value.consentConstraints.length === 0 || value.consentConstraints.some((item) => typeof item !== 'string' || !item.trim())) {
    errors.push('scope.consentConstraints must contain at least one non-empty constraint');
  }
  return errors.length === 0 ? value as AtlasProviderReadinessScope : undefined;
}

function validateEvidence(
  value: unknown,
  scopeValue: unknown,
  now: string,
  errors: string[],
): readonly AtlasProviderReadinessEvidence[] | undefined {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push('evidence must contain at least one item');
    return undefined;
  }
  for (const [index, item] of value.entries()) {
    if (!isRecord(item)) {
      errors.push(`evidence[${index}] must be an object`);
      continue;
    }
    requiredString(item.evidenceId, `evidence[${index}].evidenceId`, errors);
    requiredString(item.summary, `evidence[${index}].summary`, errors);
    requiredString(item.scopeKey, `evidence[${index}].scopeKey`, errors);
    requiredString(item.checksum, `evidence[${index}].checksum`, errors);
    if (item.redacted !== true) errors.push(`evidence[${index}].redacted must be true`);
    if (!isEnvironment(item.environment)) errors.push(`evidence[${index}].environment is invalid`);
    validateTimestamp(item.observedAt, `evidence[${index}].observedAt`, errors);
    if (typeof item.observedAt === 'string' && Number.isFinite(Date.parse(item.observedAt)) && Date.parse(item.observedAt) > Date.parse(now)) {
      errors.push(`evidence[${index}].observedAt cannot be in the future`);
    }
    if (item.expiresAt !== undefined) validateTimestamp(item.expiresAt, `evidence[${index}].expiresAt`, errors);
    if (!isEvidenceKind(item.kind)) errors.push(`evidence[${index}].kind is invalid`);
    if (!isEvidenceSource(item.source)) errors.push(`evidence[${index}].source is invalid`);
    if (typeof item.expiresAt === 'string' && Date.parse(item.expiresAt) <= Date.parse(item.observedAt as string)) errors.push(`evidence[${index}].expiresAt must be after observedAt`);
    if (typeof item.expiresAt === 'string' && Date.parse(item.expiresAt) <= Date.parse(now)) errors.push(`evidence[${index}] is expired`);
    if (isRecord(scopeValue) && typeof item.scopeKey === 'string' && typeof item.environment === 'string') {
      const expectedScopeKey = evidenceScopeKey(scopeValue as AtlasProviderReadinessScope, item.environment as AtlasProviderReadinessEnvironment);
      if (item.scopeKey !== expectedScopeKey) errors.push(`evidence[${index}].scopeKey does not match readiness scope`);
    }
  }
  return value as readonly AtlasProviderReadinessEvidence[];
}

function assertEvidenceForState(
  state: AtlasProviderReadinessState,
  evidence: AtlasProviderReadinessEvidence,
  now: string,
  scopeEnvironment: AtlasProviderReadinessEnvironment,
): void {
  if (evidence.kind !== EVIDENCE_FOR_STATE[state]) throw new AtlasProviderReadinessError('EVIDENCE_REQUIRED', `State ${state} requires ${EVIDENCE_FOR_STATE[state]} evidence`);
  if (evidence.expiresAt && Date.parse(evidence.expiresAt) <= Date.parse(now)) throw new AtlasProviderReadinessError('EVIDENCE_EXPIRED', `Evidence ${evidence.evidenceId} is expired`);
  if (state === 'LOCAL_CONFORMANCE' && evidence.source !== 'local') throw new AtlasProviderReadinessError('EVIDENCE_REQUIRED', 'LOCAL_CONFORMANCE requires local evidence');
  if (['PROVIDER_SANDBOX_PROVEN', 'LIMITED_PRODUCTION', 'PRODUCTION_PROVEN'].includes(state) && evidence.source !== 'provider') {
    throw new AtlasProviderReadinessError('EVIDENCE_REQUIRED', `${state} requires provider evidence`);
  }
  if (evidence.environment !== scopeEnvironment) throw new AtlasProviderReadinessError('EVIDENCE_REQUIRED', `Evidence environment ${evidence.environment} does not match scope environment ${scopeEnvironment}`);
  if (state === 'PROVIDER_SANDBOX_PROVEN' && evidence.environment !== 'sandbox') throw new AtlasProviderReadinessError('EVIDENCE_REQUIRED', 'PROVIDER_SANDBOX_PROVEN requires sandbox-scoped evidence');
  if (state === 'LIMITED_PRODUCTION' && evidence.environment !== 'limited-production') throw new AtlasProviderReadinessError('EVIDENCE_REQUIRED', 'LIMITED_PRODUCTION requires limited-production-scoped evidence');
  if (state === 'PRODUCTION_PROVEN' && evidence.environment !== 'production') throw new AtlasProviderReadinessError('EVIDENCE_REQUIRED', 'PRODUCTION_PROVEN requires production-scoped evidence');
}

function hasEvidence(record: AtlasProviderReadinessRecord, kind: AtlasProviderReadinessEvidenceKind, now: string): boolean {
  return record.evidence.some((item) => item.kind === kind
    && item.environment === record.scope.environment
    && (!item.expiresAt || Date.parse(item.expiresAt) > Date.parse(now)));
}

function isAllowedTransition(from: AtlasProviderReadinessState, to: AtlasProviderReadinessState): boolean {
  if (to === 'BLOCKED_PROVIDER' || to === 'DEPRECATED') return from !== 'DEPRECATED';
  if (from === 'BLOCKED_PROVIDER') return to === 'DECLARED' || to === 'LOCAL_CONFORMANCE';
  if (from === 'DEPRECATED') return false;
  return RANK[to] === RANK[from] + 1;
}

function isState(value: unknown): value is AtlasProviderReadinessState { return typeof value === 'string' && (ATLAS_PROVIDER_READINESS_STATES as readonly string[]).includes(value); }
function isEnvironment(value: unknown): value is AtlasProviderReadinessEnvironment { return typeof value === 'string' && ['local', 'sandbox', 'staging', 'limited-production', 'production'].includes(value); }
function isEvidenceKind(value: unknown): value is AtlasProviderReadinessEvidenceKind { return typeof value === 'string' && ['declaration', 'local-conformance', 'provider-sandbox', 'limited-production', 'production', 'blocker', 'deprecation'].includes(value); }
function isEvidenceSource(value: unknown): value is AtlasProviderReadinessEvidenceSource { return value === 'local' || value === 'provider' || value === 'operator'; }
function requiredString(value: unknown, name: string, errors: string[]): void { if (typeof value !== 'string' || !value.trim()) errors.push(`${name} is required`); }
function validateTimestamp(value: unknown, name: string, errors: string[]): void { if (typeof value !== 'string' || !value.trim() || !Number.isFinite(Date.parse(value))) errors.push(`${name} must be an ISO timestamp`); }
function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function clone<T>(value: T): T { return structuredClone(value); }
function freeze<T>(value: T): T { if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.freeze(value); for (const item of Object.values(value as Record<string, unknown>)) freeze(item); } return value; }
