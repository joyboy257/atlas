import { createHash } from 'node:crypto';

export const ATLAS_MEMORY_SCHEMA = 'atlas.memory/v1' as const;
export const ATLAS_LEARNING_PROPOSAL_SCHEMA = 'atlas.learning-proposal/v1' as const;

export const ATLAS_MEMORY_CLASSES = [
  'EPHEMERAL_STEP',
  'MISSION_SCOPED',
  'CUSTOMER_SCOPED',
  'BUSINESS_SCOPED',
  'POLICY_OR_CONFIGURATION',
] as const;
export type AtlasMemoryClass = typeof ATLAS_MEMORY_CLASSES[number];

export const ATLAS_MEMORY_REVIEW_STATUSES = ['UNREVIEWED', 'APPROVED', 'REJECTED', 'INVALIDATED'] as const;
export type AtlasMemoryReviewStatus = typeof ATLAS_MEMORY_REVIEW_STATUSES[number];
export type AtlasMemorySourceKind = 'observation' | 'provider' | 'tool' | 'human' | 'schedule' | 'system' | 'runtime' | 'knowledge';
export type AtlasMemoryTarget = 'knowledge' | 'memory' | 'tool' | 'instruction' | 'policy';
export type AtlasLearningProposalStatus = 'PROPOSED' | 'ACCEPTED' | 'PROMOTED' | 'REJECTED' | 'EXPIRED' | 'REVERTED';
export type AtlasMemoryPrivacyClass = 'public' | 'tenant' | 'customer' | 'sensitive';
export type AtlasMemorySafetyClass = 'low' | 'medium' | 'high' | 'critical';

export type AtlasMemoryScope = Readonly<{
  tenantId: string;
  organisationId: string;
  projectId: string;
  environmentId: string;
  missionId?: string;
  customerId?: string;
}>;

export type AtlasMemorySource = Readonly<{
  kind: AtlasMemorySourceKind;
  reference: string;
  version: string;
  digest: string;
}>;

export type AtlasMemoryExtractor = Readonly<{
  runtimeId: string;
  runtimeVersion: string;
}>;

export type AtlasMemoryRetention = Readonly<{
  policyId: string;
  expiresAt?: string;
}>;

export type AtlasMemoryCandidate = Readonly<{
  memoryClass: Exclude<AtlasMemoryClass, 'EPHEMERAL_STEP'>;
  content: unknown;
  source: AtlasMemorySource;
  extractor: AtlasMemoryExtractor;
  confidence: number;
  retention: AtlasMemoryRetention;
  encryptionClass: string;
  dependsOnMemoryIds?: readonly string[];
  supersedesMemoryId?: string;
}>;

export type AtlasMemoryEntry = Readonly<{
  schemaVersion: typeof ATLAS_MEMORY_SCHEMA;
  memoryId: string;
  scope: AtlasMemoryScope;
  memoryClass: AtlasMemoryClass;
  content: unknown;
  source: AtlasMemorySource;
  extractor: AtlasMemoryExtractor;
  confidence: number;
  retention: AtlasMemoryRetention;
  encryptionClass: string;
  reviewStatus: AtlasMemoryReviewStatus;
  dependsOnMemoryIds: readonly string[];
  supersedesMemoryId?: string;
  createdAt: string;
  updatedAt: string;
  invalidatedAt?: string;
  invalidationReason?: string;
}>;

export type AtlasMemoryActor = Readonly<{
  type: 'operator' | 'system';
  identity: string;
}>;

export type AtlasLearningProposal = Readonly<{
  apiVersion: 'atlas.mirai.dev/v1';
  kind: 'LearningProposal';
  metadata: Readonly<{
    id: string;
    schemaVersion: '1';
    missionId: string;
  }>;
  spec: Readonly<{
    scope: AtlasMemoryScope & Readonly<{ missionId: string }>;
    target: AtlasMemoryTarget;
    proposedChange: AtlasMemoryCandidate;
    originatingMissionIds: readonly string[];
    supportingEvidenceRefs: readonly string[];
    contradictingEvidenceRefs: readonly string[];
    privacyClass: AtlasMemoryPrivacyClass;
    safetyClass: AtlasMemorySafetyClass;
    status: AtlasLearningProposalStatus;
    proposer: Readonly<{ type: 'agent' | 'external-runtime' | 'operator' | 'system'; identity: string }>;
    reviewer?: Readonly<{ type: 'operator'; identity: string; reviewedAt: string; rationale: string }>;
    createdAt: string;
    updatedAt: string;
  }>;
}>;

export type AtlasMemoryObservationInput = Readonly<{
  memoryId: string;
  scope: AtlasMemoryScope;
  content: unknown;
  source: AtlasMemorySource;
  extractor: AtlasMemoryExtractor;
  confidence: number;
  retention: AtlasMemoryRetention;
  encryptionClass: string;
  dependsOnMemoryIds?: readonly string[];
  createdAt?: string;
}>;

export type AtlasLearningProposalInput = Readonly<{
  proposalId: string;
  scope: AtlasMemoryScope & Readonly<{ missionId: string }>;
  target: AtlasMemoryTarget;
  proposedChange: AtlasMemoryCandidate;
  originatingMissionIds: readonly string[];
  supportingEvidenceRefs: readonly string[];
  contradictingEvidenceRefs?: readonly string[];
  privacyClass: AtlasMemoryPrivacyClass;
  safetyClass: AtlasMemorySafetyClass;
  proposer: Readonly<{ type: 'agent' | 'external-runtime' | 'operator' | 'system'; identity: string }>;
  createdAt?: string;
}>;

export type AtlasMemoryStoreOptions = Readonly<{
  clock?: () => string;
  reviewerIdentities: readonly string[];
}>;

export class AtlasMemoryError extends Error {
  readonly code:
    | 'INVALID_ENTRY'
    | 'INVALID_PROPOSAL'
    | 'NOT_FOUND'
    | 'SCOPE_MISMATCH'
    | 'DUPLICATE_ID'
    | 'REVIEW_REQUIRED'
    | 'SELF_REVIEW_FORBIDDEN'
    | 'INVALID_TRANSITION';

  constructor(code: AtlasMemoryError['code'], message: string) {
    super(message);
    this.name = 'AtlasMemoryError';
    this.code = code;
  }
}

export class AtlasMemoryStore {
  private readonly entries = new Map<string, AtlasMemoryEntry>();
  private readonly proposals = new Map<string, AtlasLearningProposal>();
  private readonly clock: () => string;
  private readonly reviewerIdentities: ReadonlySet<string>;

  constructor(options: AtlasMemoryStoreOptions) {
    this.clock = options.clock ?? (() => new Date().toISOString());
    this.reviewerIdentities = new Set(options.reviewerIdentities.map((identity) => identity.trim()).filter(Boolean));
    if (this.reviewerIdentities.size === 0) throw new AtlasMemoryError('REVIEW_REQUIRED', 'Memory review authority must configure at least one reviewer identity');
  }

  recordObservation(input: AtlasMemoryObservationInput): AtlasMemoryEntry {
    const now = input.createdAt ?? this.clock();
    const entry: AtlasMemoryEntry = {
      schemaVersion: ATLAS_MEMORY_SCHEMA,
      memoryId: input.memoryId,
      scope: input.scope,
      memoryClass: 'EPHEMERAL_STEP',
      content: input.content,
      source: input.source,
      extractor: input.extractor,
      confidence: input.confidence,
      retention: input.retention,
      encryptionClass: input.encryptionClass,
      reviewStatus: 'UNREVIEWED',
      dependsOnMemoryIds: [...(input.dependsOnMemoryIds ?? [])],
      createdAt: now,
      updatedAt: now,
    };
    return this.insertEntry(entry);
  }

  put(entry: AtlasMemoryEntry): AtlasMemoryEntry {
    if (entry.memoryClass !== 'EPHEMERAL_STEP') {
      throw new AtlasMemoryError('REVIEW_REQUIRED', 'Durable memory must be created through an accepted LearningProposal');
    }
    return this.insertEntry(entry);
  }

  retrieve(scope: AtlasMemoryScope): readonly AtlasMemoryEntry[] {
    validateScope(scope);
    const now = this.clock();
    return freeze(this.activeEntries(scope, now).map((entry) => clone(entry)));
  }

  get(scope: AtlasMemoryScope, memoryId: string): AtlasMemoryEntry {
    validateScope(scope);
    const entry = this.entries.get(memoryId);
    if (!entry) throw new AtlasMemoryError('NOT_FOUND', `Memory ${memoryId} was not found`);
    assertScopeMatch(entry.scope, scope);
    const now = this.clock();
    if (entry.reviewStatus === 'INVALIDATED') throw new AtlasMemoryError('NOT_FOUND', `Memory ${memoryId} is invalidated`);
    if (entry.retention.expiresAt && Date.parse(entry.retention.expiresAt) <= Date.parse(now)) {
      throw new AtlasMemoryError('NOT_FOUND', `Memory ${memoryId} has expired`);
    }
    return clone(entry);
  }

  proposeLearning(input: AtlasLearningProposalInput): AtlasLearningProposal {
    if (this.proposals.has(input.proposalId)) throw new AtlasMemoryError('DUPLICATE_ID', `Learning proposal ${input.proposalId} already exists`);
    const createdAt = input.createdAt ?? this.clock();
    validateScope(input.scope);
    validateCandidate(input.proposedChange, input.scope);
    validateProposalInput(input, createdAt);
    const now = this.clock();
    for (const reference of input.supportingEvidenceRefs) {
      const evidence = [...this.entries.values()].find((entry) => entry.source.reference === reference && scopesMatch(entry.scope, input.scope));
      if (!evidence) throw new AtlasMemoryError('INVALID_PROPOSAL', `Supporting evidence ${reference} was not found in the proposal scope`);
      assertActiveEvidence(evidence, reference, now);
      if (!sourcesMatch(input.proposedChange.source, evidence.source)) throw new AtlasMemoryError('INVALID_PROPOSAL', `Learning source identity and digest do not match supporting evidence ${reference}`);
    }
    const proposal: AtlasLearningProposal = {
      apiVersion: 'atlas.mirai.dev/v1',
      kind: 'LearningProposal',
      metadata: { id: input.proposalId, schemaVersion: '1', missionId: input.scope.missionId },
      spec: {
        scope: input.scope,
        target: input.target,
        proposedChange: input.proposedChange,
        originatingMissionIds: [...input.originatingMissionIds],
        supportingEvidenceRefs: [...input.supportingEvidenceRefs],
        contradictingEvidenceRefs: [...(input.contradictingEvidenceRefs ?? [])],
        privacyClass: input.privacyClass,
        safetyClass: input.safetyClass,
        status: 'PROPOSED',
        proposer: input.proposer,
        createdAt,
        updatedAt: createdAt,
      },
    };
    this.proposals.set(input.proposalId, freeze(clone(proposal)));
    return clone(proposal);
  }

  getLearningProposal(scope: AtlasMemoryScope, proposalId: string): AtlasLearningProposal {
    validateScope(scope);
    const proposal = this.proposals.get(proposalId);
    if (!proposal) throw new AtlasMemoryError('NOT_FOUND', `Learning proposal ${proposalId} was not found`);
    assertScopeMatch(proposal.spec.scope, scope);
    return clone(proposal);
  }

  reviewLearning(
    scope: AtlasMemoryScope,
    proposalId: string,
    reviewer: AtlasMemoryActor,
    rationale: string,
    reviewedAt = this.clock(),
  ): AtlasLearningProposal {
    const reviewerIdentity = reviewer.identity.trim();
    if (reviewer.type !== 'operator' || !reviewerIdentity) {
      throw new AtlasMemoryError('REVIEW_REQUIRED', 'Durable learning promotion requires a named operator reviewer');
    }
    if (!rationale.trim()) throw new AtlasMemoryError('INVALID_PROPOSAL', 'Learning review rationale is required');
    const current = this.getLearningProposal(scope, proposalId);
    if (current.spec.proposer.identity.trim() === reviewerIdentity) throw new AtlasMemoryError('SELF_REVIEW_FORBIDDEN', 'A proposer cannot review its own learning proposal');
    if (!this.reviewerIdentities.has(reviewerIdentity)) {
      throw new AtlasMemoryError('REVIEW_REQUIRED', 'Durable learning promotion requires an authorized operator reviewer');
    }
    validateTimestamp(reviewedAt, 'reviewedAt');
    if (Date.parse(reviewedAt) < Date.parse(current.spec.createdAt)) throw new AtlasMemoryError('INVALID_PROPOSAL', 'reviewedAt cannot precede createdAt');
    if (current.spec.status !== 'PROPOSED') throw new AtlasMemoryError('INVALID_TRANSITION', `Learning proposal ${proposalId} is ${current.spec.status}`);
    const reviewed: AtlasLearningProposal = {
      ...current,
      spec: {
        ...current.spec,
        status: 'ACCEPTED',
        reviewer: { type: 'operator', identity: reviewerIdentity, reviewedAt, rationale },
        updatedAt: reviewedAt,
      },
    };
    this.proposals.set(proposalId, freeze(clone(reviewed)));
    return clone(reviewed);
  }

  rejectLearning(scope: AtlasMemoryScope, proposalId: string, reviewer: AtlasMemoryActor, rationale: string, reviewedAt = this.clock()): AtlasLearningProposal {
    const reviewerIdentity = reviewer.identity.trim();
    if (reviewer.type !== 'operator' || !reviewerIdentity) throw new AtlasMemoryError('REVIEW_REQUIRED', 'Learning rejection requires an authorized operator reviewer');
    if (!rationale.trim()) throw new AtlasMemoryError('INVALID_PROPOSAL', 'Learning review rationale is required');
    const current = this.getLearningProposal(scope, proposalId);
    if (current.spec.proposer.identity.trim() === reviewerIdentity) throw new AtlasMemoryError('SELF_REVIEW_FORBIDDEN', 'A proposer cannot review its own learning proposal');
    if (!this.reviewerIdentities.has(reviewerIdentity)) throw new AtlasMemoryError('REVIEW_REQUIRED', 'Learning rejection requires an authorized operator reviewer');
    validateTimestamp(reviewedAt, 'reviewedAt');
    if (Date.parse(reviewedAt) < Date.parse(current.spec.createdAt)) throw new AtlasMemoryError('INVALID_PROPOSAL', 'reviewedAt cannot precede createdAt');
    if (current.spec.status !== 'PROPOSED') throw new AtlasMemoryError('INVALID_TRANSITION', `Learning proposal ${proposalId} is ${current.spec.status}`);
    const rejected: AtlasLearningProposal = {
      ...current,
      spec: {
        ...current.spec,
        status: 'REJECTED',
        reviewer: { type: 'operator', identity: reviewerIdentity, reviewedAt, rationale },
        updatedAt: reviewedAt,
      },
    };
    this.proposals.set(proposalId, freeze(clone(rejected)));
    return clone(rejected);
  }

  promoteLearning(scope: AtlasMemoryScope, proposalId: string, memoryId: string, promotedAt = this.clock()): AtlasMemoryEntry {
    const proposal = this.getLearningProposal(scope, proposalId);
    if (proposal.spec.status !== 'ACCEPTED' || !proposal.spec.reviewer) {
      throw new AtlasMemoryError('REVIEW_REQUIRED', 'Learning proposal must be accepted by an operator before promotion');
    }
    validateTimestamp(promotedAt, 'promotedAt');
    if (Date.parse(promotedAt) < Date.parse(proposal.spec.updatedAt)) throw new AtlasMemoryError('INVALID_PROPOSAL', 'promotedAt cannot precede review time');
    if (this.entries.has(memoryId)) throw new AtlasMemoryError('DUPLICATE_ID', `Memory ${memoryId} already exists`);
    const candidate = proposal.spec.proposedChange;
    const now = this.clock();
    const supportingDependencies: string[] = [];
    for (const dependencyId of candidate.dependsOnMemoryIds ?? []) {
      const dependency = this.entries.get(dependencyId);
      if (!dependency) throw new AtlasMemoryError('INVALID_PROPOSAL', `Memory dependency ${dependencyId} was not found`);
      assertScopeMatch(dependency.scope, proposal.spec.scope);
      assertActiveDependency(dependency, dependencyId, now);
      supportingDependencies.push(dependencyId);
    }
    for (const reference of proposal.spec.supportingEvidenceRefs) {
      const supporting = [...this.entries.values()].find((entry) => entry.source.reference === reference && scopesMatch(entry.scope, proposal.spec.scope));
      if (!supporting) throw new AtlasMemoryError('INVALID_PROPOSAL', `Supporting evidence ${reference} was not found in the proposal scope`);
      assertActiveEvidence(supporting, reference, now);
      if (!sourcesMatch(supporting.source, candidate.source)) throw new AtlasMemoryError('INVALID_PROPOSAL', `Learning source identity and digest do not match supporting evidence ${reference}`);
      supportingDependencies.push(supporting.memoryId);
    }
    const entry: AtlasMemoryEntry = {
      schemaVersion: ATLAS_MEMORY_SCHEMA,
      memoryId,
      scope: proposal.spec.scope,
      memoryClass: candidate.memoryClass,
      content: candidate.content,
      source: candidate.source,
      extractor: candidate.extractor,
      confidence: candidate.confidence,
      retention: candidate.retention,
      encryptionClass: candidate.encryptionClass,
      reviewStatus: 'APPROVED',
      dependsOnMemoryIds: [...new Set(supportingDependencies)],
      ...(candidate.supersedesMemoryId ? { supersedesMemoryId: candidate.supersedesMemoryId } : {}),
      createdAt: promotedAt,
      updatedAt: promotedAt,
    };
    const promoted = this.insertEntry(entry);
    this.proposals.set(proposalId, freeze(clone({
      ...proposal,
      spec: { ...proposal.spec, status: 'PROMOTED', updatedAt: promotedAt },
    })));
    return promoted;
  }

  invalidate(scope: AtlasMemoryScope, memoryId: string, reason: string, invalidatedAt = this.clock()): readonly AtlasMemoryEntry[] {
    validateScope(scope);
    if (!reason.trim()) throw new AtlasMemoryError('INVALID_ENTRY', 'Memory invalidation requires a reason');
    const root = this.entries.get(memoryId);
    if (!root) throw new AtlasMemoryError('NOT_FOUND', `Memory ${memoryId} was not found`);
    assertScopeMatch(root.scope, scope);
    const invalidated = this.invalidateCascade(scope, memoryId, reason, invalidatedAt);
    return freeze(invalidated.map((entry) => clone(entry)));
  }

  expire(now = this.clock()): readonly AtlasMemoryEntry[] {
    validateTimestamp(now, 'now');
    const expired: AtlasMemoryEntry[] = [];
    for (const entry of this.entries.values()) {
      if (entry.reviewStatus !== 'INVALIDATED' && entry.retention.expiresAt && Date.parse(entry.retention.expiresAt) <= Date.parse(now)) {
        expired.push(...this.invalidateCascade(entry.scope, entry.memoryId, 'retention-expired', now));
      }
    }
    return freeze(uniqueById(expired).map((entry) => clone(entry)));
  }

  listLearningProposals(scope: AtlasMemoryScope): readonly AtlasLearningProposal[] {
    validateScope(scope);
    return freeze([...this.proposals.values()].filter((proposal) => scopesMatch(proposal.spec.scope, scope)).map((proposal) => clone(proposal)));
  }

  private activeEntries(scope: AtlasMemoryScope, now: string): AtlasMemoryEntry[] {
    return [...this.entries.values()].filter((entry) => entry.reviewStatus !== 'INVALIDATED' && (!entry.retention.expiresAt || Date.parse(entry.retention.expiresAt) > Date.parse(now)) && retrievableInScope(entry.scope, scope));
  }

  private invalidateCascade(scope: AtlasMemoryScope, memoryId: string, reason: string, invalidatedAt: string): AtlasMemoryEntry[] {
    const changed: AtlasMemoryEntry[] = [];
    const queue = [memoryId];
    const seen = new Set<string>();
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (seen.has(currentId)) continue;
      seen.add(currentId);
      const current = this.entries.get(currentId);
      if (!current) continue;
      assertScopeMatch(current.scope, scope);
      if (current.reviewStatus !== 'INVALIDATED') {
        const invalidated: AtlasMemoryEntry = { ...current, reviewStatus: 'INVALIDATED', updatedAt: invalidatedAt, invalidatedAt, invalidationReason: reason };
        this.entries.set(currentId, freeze(clone(invalidated)));
        changed.push(invalidated);
      }
      for (const dependent of this.entries.values()) {
        if (dependent.reviewStatus !== 'INVALIDATED' && dependent.dependsOnMemoryIds.includes(currentId) && scopesMatch(dependent.scope, scope)) queue.push(dependent.memoryId);
      }
    }
    return changed;
  }

  private insertEntry(entry: AtlasMemoryEntry): AtlasMemoryEntry {
    validateEntry(entry);
    if (this.entries.has(entry.memoryId)) throw new AtlasMemoryError('DUPLICATE_ID', `Memory ${entry.memoryId} already exists`);
    for (const dependencyId of entry.dependsOnMemoryIds) {
      const dependency = this.entries.get(dependencyId);
      if (!dependency) throw new AtlasMemoryError('INVALID_ENTRY', `Memory dependency ${dependencyId} was not found`);
      assertScopeMatch(dependency.scope, entry.scope);
    }
    if (entry.supersedesMemoryId) {
      const superseded = this.entries.get(entry.supersedesMemoryId);
      if (!superseded) throw new AtlasMemoryError('INVALID_ENTRY', `Superseded memory ${entry.supersedesMemoryId} was not found`);
      assertScopeMatch(superseded.scope, entry.scope);
    }
    const frozen = freeze(clone(entry));
    this.entries.set(entry.memoryId, frozen);
    return clone(frozen);
  }
}

function assertActiveEvidence(entry: AtlasMemoryEntry, reference: string, now: string): void {
  if (entry.reviewStatus === 'INVALIDATED') {
    throw new AtlasMemoryError('INVALID_PROPOSAL', `Supporting evidence ${reference} is invalidated`);
  }
  if (entry.retention.expiresAt && Date.parse(entry.retention.expiresAt) <= Date.parse(now)) {
    throw new AtlasMemoryError('INVALID_PROPOSAL', `Supporting evidence ${reference} has expired`);
  }
}

function assertActiveDependency(entry: AtlasMemoryEntry, dependencyId: string, now: string): void {
  if (entry.reviewStatus === 'INVALIDATED') {
    throw new AtlasMemoryError('INVALID_PROPOSAL', `Memory dependency ${dependencyId} is invalidated`);
  }
  if (entry.retention.expiresAt && Date.parse(entry.retention.expiresAt) <= Date.parse(now)) {
    throw new AtlasMemoryError('INVALID_PROPOSAL', `Memory dependency ${dependencyId} has expired`);
  }
}

function sourcesMatch(left: AtlasMemorySource, right: AtlasMemorySource): boolean {
  return left.kind === right.kind && left.reference === right.reference && left.version === right.version && left.digest === right.digest;
}

function validateCandidate(candidate: AtlasMemoryCandidate, scope: AtlasMemoryScope): void {
  if (!ATLAS_MEMORY_CLASSES.includes(candidate.memoryClass)) {
    throw new AtlasMemoryError('INVALID_PROPOSAL', 'Learning promotion must target a durable memory class');
  }
  if (candidate.memoryClass === 'MISSION_SCOPED' && !scope.missionId) throw new AtlasMemoryError('INVALID_PROPOSAL', 'Mission-scoped memory requires a Mission scope');
  if (candidate.memoryClass === 'CUSTOMER_SCOPED' && !scope.customerId) throw new AtlasMemoryError('INVALID_PROPOSAL', 'Customer-scoped memory requires a customer scope');
  validateSource(candidate.source);
  if (!candidate.extractor.runtimeId.trim() || !candidate.extractor.runtimeVersion.trim()) throw new AtlasMemoryError('INVALID_PROPOSAL', 'Learning extractor identity is required');
  if (!Number.isFinite(candidate.confidence) || candidate.confidence < 0 || candidate.confidence > 1) throw new AtlasMemoryError('INVALID_PROPOSAL', 'Learning confidence must be between 0 and 1');
  if (!candidate.retention.policyId.trim()) throw new AtlasMemoryError('INVALID_PROPOSAL', 'Learning retention policy is required');
  if (candidate.retention.expiresAt) validateTimestamp(candidate.retention.expiresAt, 'proposedChange.retention.expiresAt');
  if (candidate.dependsOnMemoryIds?.some((id) => typeof id !== 'string' || !id.trim())) throw new AtlasMemoryError('INVALID_PROPOSAL', 'Learning dependencies must be non-empty identifiers');
}

function validateProposalInput(input: AtlasLearningProposalInput, createdAt: string): void {
  if (!input.proposalId.trim() || !['knowledge', 'memory', 'tool', 'instruction', 'policy'].includes(input.target) || !Array.isArray(input.originatingMissionIds) || input.originatingMissionIds.length === 0) throw new AtlasMemoryError('INVALID_PROPOSAL', 'Learning proposal identity, target and originating Mission are required');
  if (!Array.isArray(input.supportingEvidenceRefs) || input.supportingEvidenceRefs.length === 0) throw new AtlasMemoryError('INVALID_PROPOSAL', 'Learning proposal requires supporting evidence references');
  if (input.scope.missionId !== input.originatingMissionIds[0]) throw new AtlasMemoryError('INVALID_PROPOSAL', 'Proposal scope Mission must be one of the originating Missions');
  if (!['public', 'tenant', 'customer', 'sensitive'].includes(input.privacyClass) || !['low', 'medium', 'high', 'critical'].includes(input.safetyClass)) throw new AtlasMemoryError('INVALID_PROPOSAL', 'Learning privacy and safety classes are invalid');
  validateTimestamp(createdAt, 'createdAt');
}

function validateEntry(entry: AtlasMemoryEntry): void {
  if (entry.schemaVersion !== ATLAS_MEMORY_SCHEMA || !entry.memoryId.trim()) throw new AtlasMemoryError('INVALID_ENTRY', 'Memory schema version and identity are required');
  validateScope(entry.scope);
  if (!ATLAS_MEMORY_CLASSES.includes(entry.memoryClass)) throw new AtlasMemoryError('INVALID_ENTRY', 'Memory class is invalid');
  if (!ATLAS_MEMORY_REVIEW_STATUSES.includes(entry.reviewStatus)) throw new AtlasMemoryError('INVALID_ENTRY', 'Memory review status is invalid');
  validateSource(entry.source);
  if (!entry.extractor.runtimeId.trim() || !entry.extractor.runtimeVersion.trim()) throw new AtlasMemoryError('INVALID_ENTRY', 'Memory extractor identity is required');
  if (!Number.isFinite(entry.confidence) || entry.confidence < 0 || entry.confidence > 1) throw new AtlasMemoryError('INVALID_ENTRY', 'Memory confidence must be between 0 and 1');
  if (!entry.retention.policyId.trim()) throw new AtlasMemoryError('INVALID_ENTRY', 'Memory retention policy is required');
  if (entry.retention.expiresAt) validateTimestamp(entry.retention.expiresAt, 'retention.expiresAt');
  validateTimestamp(entry.createdAt, 'createdAt');
  validateTimestamp(entry.updatedAt, 'updatedAt');
  if (Date.parse(entry.updatedAt) < Date.parse(entry.createdAt)) throw new AtlasMemoryError('INVALID_ENTRY', 'updatedAt cannot precede createdAt');
  if (!Array.isArray(entry.dependsOnMemoryIds) || entry.dependsOnMemoryIds.some((id) => typeof id !== 'string' || !id.trim())) throw new AtlasMemoryError('INVALID_ENTRY', 'Memory dependencies must be non-empty identifiers');
  if (entry.reviewStatus === 'INVALIDATED' && (!entry.invalidatedAt || !entry.invalidationReason?.trim())) throw new AtlasMemoryError('INVALID_ENTRY', 'Invalidated memory requires timestamp and reason');
}

function validateSource(source: AtlasMemorySource): void {
  if (!['observation', 'provider', 'tool', 'human', 'schedule', 'system', 'runtime', 'knowledge'].includes(source.kind) || !source.reference.trim() || !source.version.trim() || !/^sha256:[a-f0-9]{64}$/.test(source.digest)) throw new AtlasMemoryError('INVALID_ENTRY', 'Memory provenance requires source kind, reference, version and sha256 digest');
}

function validateScope(scope: AtlasMemoryScope): void {
  for (const [key, value] of Object.entries(scope)) if (value !== undefined && (typeof value !== 'string' || !value.trim())) throw new AtlasMemoryError('SCOPE_MISMATCH', `${key} must be a non-empty string`);
  for (const key of ['tenantId', 'organisationId', 'projectId', 'environmentId'] as const) if (!scope[key]?.trim()) throw new AtlasMemoryError('SCOPE_MISMATCH', `${key} is required`);
}

function assertScopeMatch(actual: AtlasMemoryScope, requested: AtlasMemoryScope): void {
  if (!scopesMatch(actual, requested)) throw new AtlasMemoryError('SCOPE_MISMATCH', 'Memory scope does not match the server-derived scope');
}

function scopesMatch(left: AtlasMemoryScope, right: AtlasMemoryScope): boolean {
  if (left.tenantId !== right.tenantId || left.organisationId !== right.organisationId || left.projectId !== right.projectId || left.environmentId !== right.environmentId) return false;
  if (left.missionId !== right.missionId || left.customerId !== right.customerId) return false;
  return true;
}

function retrievableInScope(entry: AtlasMemoryScope, requested: AtlasMemoryScope): boolean {
  if (!scopesMatch(entry, requested)) return false;
  if (entry.missionId && entry.missionId !== requested.missionId) return false;
  if (entry.customerId && entry.customerId !== requested.customerId) return false;
  return true;
}

function validateTimestamp(value: string, name: string): void {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) throw new AtlasMemoryError('INVALID_ENTRY', `${name} must be an ISO timestamp`);
}

function uniqueById(entries: readonly AtlasMemoryEntry[]): AtlasMemoryEntry[] {
  return [...new Map(entries.map((entry) => [entry.memoryId, entry])).values()];
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`;
  return JSON.stringify(value);
}

export function digestAtlasMemoryContent(value: unknown): string {
  return `sha256:${createHash('sha256').update(stableJson(value)).digest('hex')}`;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function freeze<T>(value: T): T {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) freeze(child);
  return value;
}
