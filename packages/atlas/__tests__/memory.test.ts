import { describe, expect, it } from 'vitest';
import {
  ATLAS_MEMORY_SCHEMA,
  AtlasMemoryError,
  AtlasMemoryStore,
  digestAtlasMemoryContent,
  type AtlasMemoryCandidate,
  type AtlasMemoryEntry,
} from '../src/memory.js';

const scope = {
  tenantId: 'tenant-memory',
  organisationId: 'org-memory',
  projectId: 'project-memory',
  environmentId: 'local',
  missionId: 'mission-memory-001',
  customerId: 'customer-memory-001',
} as const;

const otherScope = { ...scope, tenantId: 'tenant-other' } as const;
const TEST_NOW = '2030-08-01T12:00:00.000Z';
const TEST_NOW_MS = Date.parse(TEST_NOW);
const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * 60 * MINUTE_MS;
const source = {
  kind: 'observation' as const,
  reference: 'message:msg-001',
  version: '1',
  digest: `sha256:${'a'.repeat(64)}`,
};
const extractor = { runtimeId: 'runtime-test', runtimeVersion: '1.0.0' } as const;

function at(offsetMs = 0): string {
  return new Date(TEST_NOW_MS + offsetMs).toISOString();
}

function atTimezone(offsetMs: number, timezoneOffsetMinutes: number): string {
  const instant = new Date(TEST_NOW_MS + offsetMs);
  const local = new Date(instant.getTime() + timezoneOffsetMinutes * MINUTE_MS).toISOString().replace(/Z$/, '');
  const sign = timezoneOffsetMinutes >= 0 ? '+' : '-';
  const absoluteMinutes = Math.abs(timezoneOffsetMinutes);
  const hours = String(Math.floor(absoluteMinutes / 60)).padStart(2, '0');
  const minutes = String(absoluteMinutes % 60).padStart(2, '0');
  return `${local}${sign}${hours}:${minutes}`;
}

function candidate(overrides: Partial<AtlasMemoryCandidate> = {}): AtlasMemoryCandidate {
  return {
    memoryClass: 'CUSTOMER_SCOPED',
    content: { preferredDay: 'Friday' },
    source,
    extractor,
    confidence: 0.9,
    retention: { policyId: 'customer-preference', expiresAt: at(10 * DAY_MS) },
    encryptionClass: 'tenant-managed',
    ...overrides,
  };
}

function observation(overrides: Partial<Parameters<AtlasMemoryStore['recordObservation']>[0]> = {}) {
  return {
    memoryId: 'memory-observation-001',
    scope,
    content: { note: 'Customer prefers Friday changes.' },
    source,
    extractor,
    confidence: 0.8,
    retention: { policyId: 'step', expiresAt: at(DAY_MS) },
    encryptionClass: 'ephemeral',
    createdAt: TEST_NOW,
    ...overrides,
  };
}

describe('Atlas provenance-governed memory', () => {
  it('records provenance-bearing ephemeral observations and keeps retrieval scope-bound', () => {
    const store = new AtlasMemoryStore({ clock: () => TEST_NOW, reviewerIdentities: ['operator-001'] });
    const entry = store.recordObservation(observation());

    expect(entry.schemaVersion).toBe(ATLAS_MEMORY_SCHEMA);
    expect(entry.memoryClass).toBe('EPHEMERAL_STEP');
    expect(entry.reviewStatus).toBe('UNREVIEWED');
    expect(entry.source).toEqual(source);
    expect(store.retrieve(scope)).toEqual([entry]);
    expect(store.retrieve(otherScope)).toEqual([]);
  });

  it('rejects forged durable writes and requires an accepted reviewed proposal', () => {
    const store = new AtlasMemoryStore({ clock: () => TEST_NOW, reviewerIdentities: ['operator-001'] });
    const forged = {
      ...observation({ memoryId: 'forged-durable' }),
      memoryClass: 'CUSTOMER_SCOPED',
      reviewStatus: 'APPROVED',
    } as AtlasMemoryEntry;

    expect(() => store.put(forged)).toThrowError(new AtlasMemoryError('REVIEW_REQUIRED', 'Durable memory must be created through an accepted LearningProposal'));

    store.recordObservation(observation());
    const proposal = store.proposeLearning({
      proposalId: 'learning-001',
      scope: { ...scope, missionId: scope.missionId },
      target: 'memory',
      proposedChange: candidate(),
      originatingMissionIds: [scope.missionId],
      supportingEvidenceRefs: ['message:msg-001'],
      contradictingEvidenceRefs: ['message:msg-contradicting'],
      privacyClass: 'customer',
      safetyClass: 'medium',
      proposer: { type: 'agent', identity: 'runtime-test' },
      createdAt: at(MINUTE_MS),
    });

    expect(proposal.spec.status).toBe('PROPOSED');
    expect(proposal.spec.contradictingEvidenceRefs).toEqual(['message:msg-contradicting']);
    expect(() => store.reviewLearning(scope, 'learning-001', { type: 'operator', identity: 'runtime-test' }, 'same runtime')).toThrowError(/cannot review its own/);
    expect(() => store.promoteLearning(scope, 'learning-001', 'memory-durable-001')).toThrowError(/must be accepted/);

    const reviewed = store.reviewLearning(scope, 'learning-001', { type: 'operator', identity: 'operator-001' }, 'Evidence reviewed against the contradictory observation.', at(2 * MINUTE_MS));
    expect(reviewed.spec.status).toBe('ACCEPTED');
    expect(reviewed.spec.reviewer?.identity).toBe('operator-001');

    const promoted = store.promoteLearning(scope, 'learning-001', 'memory-durable-001', at(3 * MINUTE_MS));
    expect(promoted.memoryClass).toBe('CUSTOMER_SCOPED');
    expect(promoted.reviewStatus).toBe('APPROVED');
    expect(promoted.source).toEqual(source);
    expect(store.get(scope, 'memory-durable-001')).toEqual(promoted);
    expect(store.getLearningProposal(scope, 'learning-001').spec.status).toBe('PROMOTED');
    expect(() => store.promoteLearning(scope, 'learning-001', 'memory-durable-002')).toThrowError(/accepted/);
  });

  it('rejects cross-scope proposal access and prevents tenant, Mission and customer leakage', () => {
    const store = new AtlasMemoryStore({ clock: () => TEST_NOW, reviewerIdentities: ['operator-001'] });
    store.recordObservation(observation({ memoryId: 'memory-customer-001' }));
    store.proposeLearning({
      proposalId: 'learning-scope-001',
      scope: { ...scope, missionId: scope.missionId },
      target: 'memory',
      proposedChange: candidate(),
      originatingMissionIds: [scope.missionId],
      supportingEvidenceRefs: ['message:msg-001'],
      privacyClass: 'customer',
      safetyClass: 'low',
      proposer: { type: 'external-runtime', identity: 'runtime-external' },
    });

    expect(() => store.getLearningProposal(otherScope, 'learning-scope-001')).toThrowError(/scope/);
    expect(() => store.getLearningProposal({ ...scope, missionId: 'mission-other' }, 'learning-scope-001')).toThrowError(/scope/);
    expect(() => store.retrieve({ ...scope, missionId: 'mission-other' })).not.toThrow();
    expect(store.retrieve({ ...scope, missionId: 'mission-other' })).toEqual([]);
    expect(store.retrieve({ ...scope, customerId: 'customer-other' })).toEqual([]);
    expect(store.listLearningProposals({ ...scope, missionId: 'mission-other' })).toEqual([]);
  });

  it('invalidates dependent durable memory on explicit deletion and retention expiry', () => {
    const store = new AtlasMemoryStore({ clock: () => TEST_NOW, reviewerIdentities: ['operator-001'] });
    const first = store.recordObservation(observation({ memoryId: 'memory-root', retention: { policyId: 'step', expiresAt: at(10 * DAY_MS) } }));
    const dependent = store.recordObservation(observation({
      memoryId: 'memory-dependent',
      dependsOnMemoryIds: ['memory-root'],
      retention: { policyId: 'step', expiresAt: at(10 * DAY_MS) },
    }));

    const invalidated = store.invalidate(scope, first.memoryId, 'source deletion requested', at(4 * MINUTE_MS));
    expect(invalidated.map((entry) => entry.memoryId)).toEqual(['memory-root', 'memory-dependent']);
    expect(store.retrieve(scope)).toEqual([]);
    expect(() => store.get(scope, dependent.memoryId)).toThrowError(/invalidated/);

    const expiring = store.recordObservation(observation({ memoryId: 'memory-expiring', retention: { policyId: 'short', expiresAt: at(DAY_MS) } }));
    expect(store.expire(at(DAY_MS)).map((entry) => entry.memoryId)).toContain(expiring.memoryId);
  });

  it('rejects unauthorized reviewers and scope-incomplete durable memory', () => {
    const store = new AtlasMemoryStore({ clock: () => TEST_NOW, reviewerIdentities: ['operator-001'] });
    expect(() => store.proposeLearning({
      proposalId: 'learning-unauthorized',
      scope,
      target: 'memory',
      proposedChange: candidate(),
      originatingMissionIds: [scope.missionId],
      supportingEvidenceRefs: ['message:msg-001'],
      privacyClass: 'customer',
      safetyClass: 'medium',
      proposer: { type: 'agent', identity: 'runtime-test' },
    })).toThrowError(/Supporting evidence/);

    store.recordObservation(observation());
    store.proposeLearning({
      proposalId: 'learning-unauthorized',
      scope,
      target: 'memory',
      proposedChange: candidate(),
      originatingMissionIds: [scope.missionId],
      supportingEvidenceRefs: ['message:msg-001'],
      privacyClass: 'customer',
      safetyClass: 'medium',
      proposer: { type: 'agent', identity: 'runtime-test' },
    });
    expect(() => store.reviewLearning(scope, 'learning-unauthorized', { type: 'operator', identity: 'operator-999' }, 'not authorized')).toThrowError(/authorized/);
    expect(() => store.proposeLearning({
      proposalId: 'learning-no-customer',
      scope: { ...scope, customerId: undefined },
      target: 'memory',
      proposedChange: candidate(),
      originatingMissionIds: [scope.missionId],
      supportingEvidenceRefs: ['message:msg-001'],
      privacyClass: 'customer',
      safetyClass: 'medium',
      proposer: { type: 'agent', identity: 'runtime-test' },
    })).toThrowError(/customer scope/);
  });

  it('hides expired entries and cascades supporting evidence invalidation', () => {
    let now = TEST_NOW;
    const store = new AtlasMemoryStore({ clock: () => now, reviewerIdentities: ['operator-001'] });
    const expiring = store.recordObservation(observation({ memoryId: 'memory-expiring-now', retention: { policyId: 'short', expiresAt: at(MINUTE_MS) } }));
    expect(store.retrieve(scope)).toContainEqual(expiring);
    now = at(2 * MINUTE_MS);
    expect(store.retrieve(scope)).not.toContainEqual(expiring);

    now = at(2 * MINUTE_MS);
    const supporting = store.recordObservation(observation({
      memoryId: 'memory-supporting-active',
      source: { ...source, reference: 'message:msg-supporting-active' },
      retention: { policyId: 'step', expiresAt: at(DAY_MS) },
    }));
    const proposal = store.proposeLearning({
      proposalId: 'learning-supporting-cascade',
      scope,
      target: 'memory',
      proposedChange: candidate({ source: supporting.source, retention: { policyId: 'durable' } }),
      originatingMissionIds: [scope.missionId],
      supportingEvidenceRefs: [supporting.source.reference],
      privacyClass: 'customer',
      safetyClass: 'medium',
      proposer: { type: 'agent', identity: 'runtime-test' },
    });
    store.reviewLearning(scope, proposal.metadata.id, { type: 'operator', identity: 'operator-001' }, 'Reviewed supporting observation', at(3 * MINUTE_MS));
    const promoted = store.promoteLearning(scope, proposal.metadata.id, 'memory-supported', at(4 * MINUTE_MS));
    const invalidated = store.invalidate(scope, supporting.memoryId, 'source deletion requested', at(5 * MINUTE_MS));
    expect(invalidated.map((entry) => entry.memoryId)).toContain('memory-supported');
    expect(() => store.get(scope, promoted.memoryId)).toThrowError(/invalidated/);
  });

  it('keeps future-dated evidence valid across timezone representations until the exact boundary', () => {
    let now = TEST_NOW;
    const store = new AtlasMemoryStore({ clock: () => now, reviewerIdentities: ['operator-001'] });
    const evidence = store.recordObservation(observation({
      memoryId: 'memory-timezone-boundary',
      retention: { policyId: 'short', expiresAt: at(HOUR_MS) },
    }));

    expect(store.retrieve(scope)).toContainEqual(evidence);
    now = atTimezone(30 * MINUTE_MS, 480);
    expect(store.retrieve(scope)).toContainEqual(evidence);
    now = atTimezone(HOUR_MS, 480);
    expect(store.retrieve(scope)).not.toContainEqual(evidence);
  });

  it('rejects fabricated provenance digests and wildcard scope reads', () => {
    const store = new AtlasMemoryStore({ clock: () => TEST_NOW, reviewerIdentities: ['operator-001'] });
    store.recordObservation(observation());
    expect(() => store.proposeLearning({
      proposalId: 'learning-fabricated-digest',
      scope,
      target: 'memory',
      proposedChange: candidate({ source: { ...source, digest: `sha256:${'b'.repeat(64)}` } }),
      originatingMissionIds: [scope.missionId],
      supportingEvidenceRefs: ['message:msg-001'],
      privacyClass: 'customer',
      safetyClass: 'medium',
      proposer: { type: 'agent', identity: 'runtime-test' },
    })).toThrowError(/digest/);

    const business = store.recordObservation(observation({
      memoryId: 'memory-business',
      scope: { tenantId: scope.tenantId, organisationId: scope.organisationId, projectId: scope.projectId, environmentId: scope.environmentId },
    }));
    expect(store.retrieve({ ...scope, customerId: 'customer-other' })).not.toContainEqual(business);
  });

  it('enforces retention expiry for exact-id reads', () => {
    let now = TEST_NOW;
    const store = new AtlasMemoryStore({ clock: () => now, reviewerIdentities: ['operator-001'] });
    const entry = store.recordObservation(observation({
      memoryId: 'memory-get-expiry',
      retention: { policyId: 'short', expiresAt: at(MINUTE_MS) },
    }));
    expect(store.get(scope, entry.memoryId)).toEqual(entry);
    now = at(MINUTE_MS);
    expect(() => store.get(scope, entry.memoryId)).toThrowError(/expired/);
  });

  it('rejects expired or invalidated supporting evidence at proposal and promotion time', () => {
    let now = TEST_NOW;
    const store = new AtlasMemoryStore({ clock: () => now, reviewerIdentities: ['operator-001'] });
    const expiring = store.recordObservation(observation({
      memoryId: 'memory-expiring-support',
      retention: { policyId: 'short', expiresAt: at(MINUTE_MS) },
    }));
    now = at(MINUTE_MS);
    expect(() => store.proposeLearning({
      proposalId: 'learning-expired-support',
      scope,
      target: 'memory',
      proposedChange: candidate(),
      originatingMissionIds: [scope.missionId],
      supportingEvidenceRefs: [expiring.source.reference],
      privacyClass: 'customer',
      safetyClass: 'medium',
      proposer: { type: 'agent', identity: 'runtime-test' },
    })).toThrowError(/expired/);

    now = TEST_NOW;
    const invalidated = store.recordObservation(observation({
      memoryId: 'memory-invalidated-support',
      source: { ...source, reference: 'message:invalidated-support' },
    }));
    const proposal = store.proposeLearning({
      proposalId: 'learning-invalidated-support',
      scope,
      target: 'memory',
      proposedChange: candidate({ source: invalidated.source }),
      originatingMissionIds: [scope.missionId],
      supportingEvidenceRefs: [invalidated.source.reference],
      privacyClass: 'customer',
      safetyClass: 'medium',
      proposer: { type: 'agent', identity: 'runtime-test' },
    });
    store.invalidate(scope, invalidated.memoryId, 'source withdrawn');
    store.reviewLearning(scope, proposal.metadata.id, { type: 'operator', identity: 'operator-001' }, 'Reviewed before source withdrawal');
    expect(() => store.promoteLearning(scope, proposal.metadata.id, 'memory-from-invalidated-support')).toThrowError(/invalidated/);
  });

  it('normalizes reviewer identities before enforcing separation of duties', () => {
    const store = new AtlasMemoryStore({ clock: () => TEST_NOW, reviewerIdentities: ['operator-001'] });
    store.recordObservation(observation());

    store.proposeLearning({
      proposalId: 'learning-padded-review',
      scope,
      target: 'memory',
      proposedChange: candidate(),
      originatingMissionIds: [scope.missionId],
      supportingEvidenceRefs: [source.reference],
      privacyClass: 'customer',
      safetyClass: 'medium',
      proposer: { type: 'agent', identity: 'operator-001' },
    });
    expect(() => store.reviewLearning(
      scope,
      'learning-padded-review',
      { type: 'operator', identity: ' operator-001 ' },
      'padded self-review',
    )).toThrowError(new AtlasMemoryError('SELF_REVIEW_FORBIDDEN', 'A proposer cannot review its own learning proposal'));

    store.proposeLearning({
      proposalId: 'learning-padded-reject',
      scope,
      target: 'memory',
      proposedChange: candidate(),
      originatingMissionIds: [scope.missionId],
      supportingEvidenceRefs: [source.reference],
      privacyClass: 'customer',
      safetyClass: 'medium',
      proposer: { type: 'agent', identity: 'operator-001' },
    });
    expect(() => store.rejectLearning(
      scope,
      'learning-padded-reject',
      { type: 'operator', identity: ' operator-001 ' },
      'padded self-rejection',
    )).toThrowError(new AtlasMemoryError('SELF_REVIEW_FORBIDDEN', 'A proposer cannot review its own learning proposal'));
  });

  it('rejects promotion when a candidate dependency was invalidated after proposal review', () => {
    const store = new AtlasMemoryStore({ clock: () => TEST_NOW, reviewerIdentities: ['operator-001'] });
    const dependency = store.recordObservation(observation({
      memoryId: 'memory-dependency-invalidated',
      source: { ...source, reference: 'message:dependency-invalidated' },
    }));
    const supporting = store.recordObservation(observation({
      memoryId: 'memory-supporting-dependency',
      source: { ...source, reference: 'message:dependency-support' },
    }));
    const proposal = store.proposeLearning({
      proposalId: 'learning-invalidated-dependency',
      scope,
      target: 'memory',
      proposedChange: candidate({ source: supporting.source, dependsOnMemoryIds: [dependency.memoryId] }),
      originatingMissionIds: [scope.missionId],
      supportingEvidenceRefs: [supporting.source.reference],
      privacyClass: 'customer',
      safetyClass: 'medium',
      proposer: { type: 'agent', identity: 'runtime-test' },
    });
    store.invalidate(scope, dependency.memoryId, 'source withdrawn');
    store.reviewLearning(scope, proposal.metadata.id, { type: 'operator', identity: 'operator-001' }, 'Reviewed before dependency withdrawal');

    expect(() => store.promoteLearning(scope, proposal.metadata.id, 'memory-after-invalidated-dependency')).toThrowError(/dependency .*invalidated/);
    expect(() => store.get(scope, 'memory-after-invalidated-dependency')).toThrowError(/not found/);
    expect(store.getLearningProposal(scope, proposal.metadata.id).spec.status).toBe('ACCEPTED');
  });

  it('rejects promotion when a candidate dependency has expired', () => {
    let now = TEST_NOW;
    const store = new AtlasMemoryStore({ clock: () => now, reviewerIdentities: ['operator-001'] });
    const dependency = store.recordObservation(observation({
      memoryId: 'memory-dependency-expired',
      source: { ...source, reference: 'message:dependency-expired' },
      retention: { policyId: 'short', expiresAt: at(MINUTE_MS) },
    }));
    const supporting = store.recordObservation(observation({
      memoryId: 'memory-supporting-expiry',
      source: { ...source, reference: 'message:dependency-expiry-support' },
    }));
    const proposal = store.proposeLearning({
      proposalId: 'learning-expired-dependency',
      scope,
      target: 'memory',
      proposedChange: candidate({ source: supporting.source, dependsOnMemoryIds: [dependency.memoryId] }),
      originatingMissionIds: [scope.missionId],
      supportingEvidenceRefs: [supporting.source.reference],
      privacyClass: 'customer',
      safetyClass: 'medium',
      proposer: { type: 'agent', identity: 'runtime-test' },
    });
    now = at(2 * MINUTE_MS);
    store.reviewLearning(scope, proposal.metadata.id, { type: 'operator', identity: 'operator-001' }, 'Reviewed before dependency expiry');

    expect(() => store.promoteLearning(scope, proposal.metadata.id, 'memory-after-expired-dependency')).toThrowError(/dependency .*expired/);
    expect(() => store.get(scope, 'memory-after-expired-dependency')).toThrowError(/not found/);
  });

  it('rejects forged source references even when the digest matches supporting evidence', () => {
    const store = new AtlasMemoryStore({ clock: () => TEST_NOW, reviewerIdentities: ['operator-001'] });
    const real = store.recordObservation(observation({
      memoryId: 'memory-real-source',
      source: { ...source, reference: 'message:real' },
    }));

    expect(() => store.proposeLearning({
      proposalId: 'learning-forged-source-reference',
      scope,
      target: 'memory',
      proposedChange: candidate({ source: { ...real.source, reference: 'message:forged' } }),
      originatingMissionIds: [scope.missionId],
      supportingEvidenceRefs: [real.source.reference],
      privacyClass: 'customer',
      safetyClass: 'medium',
      proposer: { type: 'agent', identity: 'runtime-test' },
    })).toThrowError(/source identity and digest/);
    expect(store.listLearningProposals(scope)).toEqual([]);
    expect(store.retrieve(scope)).toEqual([real]);
  });

  it('produces deterministic content digests for provenance binding', () => {
    expect(digestAtlasMemoryContent({ b: 2, a: 1 })).toBe(digestAtlasMemoryContent({ a: 1, b: 2 }));
  });
});
