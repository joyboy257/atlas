import { describe, expect, it } from 'vitest';
import {
  ATLAS_PROVIDER_CERTIFICATION_CHECKS,
  ATLAS_PROVIDER_READINESS_SCHEMA,
  ATLAS_PROVIDER_READINESS_STATES,
  AtlasProviderReadinessError,
  type AtlasProviderReadinessEvidence,
  type AtlasProviderReadinessRecord,
  type AtlasProviderReadinessScope,
  createAtlasProviderReadinessRegistry,
  runAtlasProviderReadinessCertification,
  validateAtlasProviderReadiness,
} from '../src/provider-readiness.js';

const NOW = '2026-07-31T12:00:00.000Z';

function scope(overrides: Partial<AtlasProviderReadinessScope> = {}): AtlasProviderReadinessScope {
  return {
    channelId: 'CH-SMS',
    provider: 'twilio',
    adapterVersion: 'twilio-sms/v1',
    contractVersion: 'atlas.channel/v1',
    accountId: 'account_test',
    environment: 'sandbox',
    region: 'us1',
    capability: 'outbound-text',
    consentConstraints: ['recipient opted in', 'respect provider messaging window'],
    ...overrides,
  };
}

function evidence(
  kind: AtlasProviderReadinessEvidence['kind'],
  source: AtlasProviderReadinessEvidence['source'],
  environment: AtlasProviderReadinessEvidence['environment'] = 'sandbox',
): AtlasProviderReadinessEvidence {
  const evidenceScope = scope({ environment });
  return {
    evidenceId: `evidence-${kind}`,
    kind,
    source,
    environment,
    scopeKey: JSON.stringify({
      channelId: evidenceScope.channelId,
      provider: evidenceScope.provider,
      adapterVersion: evidenceScope.adapterVersion,
      contractVersion: evidenceScope.contractVersion,
      accountId: evidenceScope.accountId ?? null,
      businessId: evidenceScope.businessId ?? null,
      appId: evidenceScope.appId ?? null,
      environment,
      region: evidenceScope.region,
      capability: evidenceScope.capability,
      consentConstraints: [...evidenceScope.consentConstraints].sort(),
    }),
    observedAt: NOW,
    expiresAt: '2026-08-31T12:00:00.000Z',
    summary: `${kind} local fixture; no external provider call was made`,
    redacted: true,
    checksum: `sha256:${kind}`,
  };
}

function declaredRecord(readinessScope = scope()): AtlasProviderReadinessRecord {
  return {
    schemaVersion: ATLAS_PROVIDER_READINESS_SCHEMA,
    readinessId: 'readiness-sms-twilio-test',
    state: 'DECLARED',
    scope: readinessScope,
    evidence: [evidence('declaration', 'local', readinessScope.environment)],
    supportOwner: 'messaging-platform',
    limitations: ['No provider credentials or external service access in local certification.'],
    updatedAt: NOW,
  };
}

const passingChecks = Object.fromEntries(ATLAS_PROVIDER_CERTIFICATION_CHECKS.map((name) => [name, true]));

describe('Atlas provider readiness registry', () => {
  it('keeps the progressive vocabulary explicit and separate from channel readiness', () => {
    expect(ATLAS_PROVIDER_READINESS_STATES).toEqual([
      'DECLARED',
      'LOCAL_CONFORMANCE',
      'PROVIDER_SANDBOX_PROVEN',
      'LIMITED_PRODUCTION',
      'PRODUCTION_PROVEN',
      'BLOCKED_PROVIDER',
      'DEPRECATED',
    ]);
  });

  it('validates complete account/provider scope and evidence freshness', () => {
    const valid = validateAtlasProviderReadiness(declaredRecord(), NOW);
    expect(valid).toMatchObject({ valid: true, errors: [] });

    const invalid = validateAtlasProviderReadiness({
      ...declaredRecord(),
      scope: { ...scope(), accountId: undefined, businessId: undefined, appId: undefined, consentConstraints: [] },
      evidence: [{ ...evidence('declaration', 'local'), expiresAt: '2026-07-30T12:00:00.000Z' }],
    }, NOW);
    expect(invalid.valid).toBe(false);
    expect(invalid.errors).toEqual(expect.arrayContaining([
      'scope requires accountId, businessId, or appId',
      'scope.consentConstraints must contain at least one non-empty constraint',
      'evidence[0] is expired',
    ]));
  });

  it('requires evidence-gated adjacent promotion and rejects provider claims from local evidence', () => {
    const readinessScope = scope();
    const registry = createAtlasProviderReadinessRegistry([declaredRecord(readinessScope)], {
      now: NOW,
      verifyProviderEvidence: (candidate) => candidate.source === 'provider' && candidate.redacted,
    });
    const local = registry.promote(readinessScope, 'LOCAL_CONFORMANCE', evidence('local-conformance', 'local'), NOW);
    expect(local.state).toBe('LOCAL_CONFORMANCE');

    expect(() => registry.promote(readinessScope, 'PROVIDER_SANDBOX_PROVEN', evidence('provider-sandbox', 'local'), NOW)).toThrowError(
      expect.objectContaining({ code: 'EVIDENCE_REQUIRED' }),
    );
    const sandbox = registry.promote(readinessScope, 'PROVIDER_SANDBOX_PROVEN', evidence('provider-sandbox', 'provider'), NOW);
    expect(sandbox.state).toBe('PROVIDER_SANDBOX_PROVEN');
    const unverifiableRegistry = createAtlasProviderReadinessRegistry([declaredRecord(readinessScope)], { now: NOW });
    unverifiableRegistry.promote(readinessScope, 'LOCAL_CONFORMANCE', evidence('local-conformance', 'local'), NOW);
    expect(() => unverifiableRegistry.promote(readinessScope, 'PROVIDER_SANDBOX_PROVEN', evidence('provider-sandbox', 'provider'), NOW))
      .toThrowError(expect.objectContaining({ code: 'EVIDENCE_REQUIRED' }));

    expect(runAtlasProviderReadinessCertification(sandbox, passingChecks, NOW)).toMatchObject({
      verdict: 'PASS',
      eligibleState: 'PROVIDER_SANDBOX_PROVEN',
      claims: { localConformance: false, providerSandboxProven: true, limitedProduction: false, productionProven: false },
    });

    const blocked = registry.demote(readinessScope, 'BLOCKED_PROVIDER', evidence('blocker', 'operator'), NOW);
    expect(runAtlasProviderReadinessCertification(blocked, passingChecks, NOW)).toMatchObject({
      verdict: 'PASS',
      eligibleState: null,
      claims: { localConformance: false, providerSandboxProven: false, limitedProduction: false, productionProven: false },
    });
  });

  it('fails certification when any required provider-plane check is absent', () => {
    const result = runAtlasProviderReadinessCertification(declaredRecord(), { auth: true, eligibility: true }, NOW);
    expect(result).toMatchObject({ verdict: 'FAIL', eligibleState: null, passed: 2, total: 9 });
    expect(result.limitations).toContain('Certification checks are incomplete; no readiness promotion is permitted.');
  });

  it('supports visible provider blockers and terminal deprecation without silent recovery', () => {
    const readinessScope = scope();
    const registry = createAtlasProviderReadinessRegistry([declaredRecord(readinessScope)], {
      now: NOW,
      verifyProviderEvidence: (candidate) => candidate.source === 'provider' && candidate.redacted,
    });
    registry.promote(readinessScope, 'LOCAL_CONFORMANCE', evidence('local-conformance', 'local'), NOW);
    const blocked = registry.demote(readinessScope, 'BLOCKED_PROVIDER', evidence('blocker', 'operator'), NOW);
    expect(blocked.state).toBe('BLOCKED_PROVIDER');

    const recovered = registry.promote(readinessScope, 'LOCAL_CONFORMANCE', evidence('local-conformance', 'local'), NOW);
    expect(recovered.state).toBe('LOCAL_CONFORMANCE');
    const deprecated = registry.demote(readinessScope, 'DEPRECATED', evidence('deprecation', 'operator'), NOW);
    expect(deprecated.state).toBe('DEPRECATED');
    expect(() => registry.promote(readinessScope, 'LOCAL_CONFORMANCE', evidence('local-conformance', 'local'), NOW)).toThrowError(
      expect.objectContaining({ code: 'INVALID_TRANSITION' }),
    );
  });

  it('rejects invalid transitions and duplicate scopes with typed errors', () => {
    const readinessScope = scope();
    const registry = createAtlasProviderReadinessRegistry([declaredRecord(readinessScope)], {
      now: NOW,
      verifyProviderEvidence: (candidate) => candidate.source === 'provider' && candidate.redacted,
    });
    expect(() => registry.register(declaredRecord(readinessScope))).toThrowError(
      expect.objectContaining({ code: 'DUPLICATE_SCOPE' }),
    );
    expect(() => registry.promote(readinessScope, 'PRODUCTION_PROVEN', evidence('production', 'provider', 'production'), NOW)).toThrowError(
      expect.objectContaining({ code: 'INVALID_TRANSITION' }),
    );
    expect(AtlasProviderReadinessError).toBeDefined();
  });
});
