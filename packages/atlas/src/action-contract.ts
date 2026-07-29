import { sha256 } from './fs-safety.js';
import type { MissionScope, MissionState } from './mission-contract.js';

export const ACTION_API_VERSION = 'atlas.mirai.dev/v1' as const;
export const PROPOSAL_KIND = 'Proposal' as const;
export const DECISION_KIND = 'Decision' as const;
export const ACTION_KIND = 'Action' as const;
export const RECEIPT_KIND = 'Receipt' as const;
export const OUTCOME_KIND = 'Outcome' as const;
export const LEARNING_PROPOSAL_KIND = 'LearningProposal' as const;

export const ACTION_SCHEMA_FILES = {
  proposal: 'schema/atlas-proposal.v1.schema.json',
  decision: 'schema/atlas-decision.v1.schema.json',
  action: 'schema/atlas-action.v1.schema.json',
  receipt: 'schema/atlas-receipt.v1.schema.json',
  outcome: 'schema/atlas-outcome.v1.schema.json',
  learningProposal: 'schema/atlas-learning-proposal.v1.schema.json',
} as const;

export type ActionScope = Readonly<MissionScope & { missionId: string }>;
export type ContractMetadata = Readonly<{ id: string; schemaVersion: '1'; missionId?: string }>;
export type ContractActor = Readonly<{
  type: 'system' | 'developer' | 'agent' | 'operator' | 'provider' | 'scheduler' | 'external-runtime';
  identity: string;
}>;
export type ContractProvenance = Readonly<{
  correlationId: string;
  causationId: string;
  sourceRef: string;
  inputDigest: string;
}>;

export type ProposalType = 'message' | 'action' | 'wait' | 'handoff' | 'child-mission' | 'completion';
export type ProposalRiskHint = 'none' | 'low' | 'medium' | 'high' | 'critical';
export type Proposal = Readonly<{
  apiVersion: typeof ACTION_API_VERSION;
  kind: typeof PROPOSAL_KIND;
  metadata: ContractMetadata;
  spec: Readonly<{
    scope: ActionScope;
    proposalType: ProposalType;
    agentVersionId: string;
    runtime: Readonly<{ id: string; type: string; version: string }>;
    actor: ContractActor;
    stepId: string;
    intent: string;
    payload?: unknown;
    arguments?: unknown;
    contextRefs?: readonly string[];
    citations?: readonly string[];
    riskHint: ProposalRiskHint;
    expectedOutcome?: string;
    provenance: ContractProvenance;
    createdAt: string;
  }>;
}>;

export type DecisionDisposition = 'allow' | 'deny' | 'require_approval' | 'require_handoff' | 'modify' | 'defer' | 'fail';
export type Decision = Readonly<{
  apiVersion: typeof ACTION_API_VERSION;
  kind: typeof DECISION_KIND;
  metadata: ContractMetadata;
  spec: Readonly<{
    scope: ActionScope;
    proposalId: string;
    actionClass: string;
    riskClass: ProposalRiskHint;
    autonomyLevel: 'L0' | 'L1' | 'L2' | 'L3' | 'L4';
    policyVersion: string;
    disposition: DecisionDisposition;
    reasonCodes: readonly string[];
    explanation: string;
    issuer: Readonly<{ type: 'system' | 'operator'; identity: string }>;
    requiredActor?: string;
    budgetReservation?: Readonly<{ amount: number; currency: string; reservationId: string }>;
    evidenceRefs?: readonly string[];
    expiresAt?: string;
    decidedAt: string;
    provenance: ContractProvenance;
  }>;
}>;

export type ActionEffect = 'read' | 'propose' | 'commit';
export type ActionStatus = 'PLANNED' | 'OUTBOXED' | 'CLAIMED' | 'COMMITTED' | 'FAILED' | 'CANCELLED';
export type Action = Readonly<{
  apiVersion: typeof ACTION_API_VERSION;
  kind: typeof ACTION_KIND;
  metadata: ContractMetadata;
  spec: Readonly<{
    scope: ActionScope;
    proposalId: string;
    decisionId: string;
    stepId: string;
    actionType: string;
    toolName: string;
    effect: ActionEffect;
    arguments: unknown;
    idempotencyKey: string;
    status: ActionStatus;
    policyVersion: string;
    createdAt: string;
  }>;
}>;

export type ReceiptType = 'commit' | 'tool' | 'provider' | 'delivery' | 'usage' | 'cost' | 'audit' | 'outcome';
export type ReceiptStatus = 'SUCCEEDED' | 'FAILED' | 'UNKNOWN_PENDING_RECONCILIATION';
export type Receipt = Readonly<{
  apiVersion: typeof ACTION_API_VERSION;
  kind: typeof RECEIPT_KIND;
  metadata: ContractMetadata;
  spec: Readonly<{
    scope: ActionScope;
    receiptType: ReceiptType;
    actionId?: string;
    missionId: string;
    status: ReceiptStatus;
    provider?: string;
    providerReference?: string;
    resultDigest?: string;
    resultRef?: string;
    usage?: Readonly<{ inputTokens?: number; outputTokens?: number; costMinor?: number; currency?: string }>;
    cost?: Readonly<{ amount: number; currency: string; estimate: boolean; source: string }>;
    audit?: Readonly<{ actor: ContractActor; policyVersion: string; decisionId?: string; evidenceRefs?: readonly string[] }>;
    supersedesReceiptId?: string;
    occurredAt: string;
    recordedAt: string;
    integrity: Readonly<{ digest: string; issuer: string }>;
  }>;
}>;

export type OutcomeStatus = 'SUCCEEDED' | 'FAILED' | 'UNKNOWN';
export type Outcome = Readonly<{
  apiVersion: typeof ACTION_API_VERSION;
  kind: typeof OUTCOME_KIND;
  metadata: ContractMetadata;
  spec: Readonly<{
    scope: ActionScope;
    missionId: string;
    definitionId: string;
    status: OutcomeStatus;
    metric?: string;
    evidenceRefs: readonly string[];
    attributionRule: string;
    evaluationWindow?: Readonly<{ startsAt: string; endsAt: string }>;
    humanConfirmed: boolean;
    receiptIds: readonly string[];
    evaluatedAt: string;
  }>;
}>;

export type LearningStatus = 'PROPOSED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'REVERTED';
export type LearningProposal = Readonly<{
  apiVersion: typeof ACTION_API_VERSION;
  kind: typeof LEARNING_PROPOSAL_KIND;
  metadata: ContractMetadata;
  spec: Readonly<{
    scope: ActionScope;
    target: 'knowledge' | 'memory' | 'tool' | 'instruction' | 'policy';
    proposedChange: unknown;
    originatingMissionIds: readonly string[];
    supportingEvidenceRefs: readonly string[];
    contradictingEvidenceRefs?: readonly string[];
    privacyClass: 'public' | 'tenant' | 'customer' | 'sensitive';
    safetyClass: 'low' | 'medium' | 'high' | 'critical';
    evaluation?: Readonly<{ method: string; result?: string; evaluatedAt?: string }>;
    status: LearningStatus;
    proposer: ContractActor;
    reviewer?: Readonly<{ type: 'operator' | 'system'; identity: string; reviewedAt: string; rationale: string }>;
    createdAt: string;
  }>;
}>;

export type ActionDiagnosticCode =
  | 'INVALID_TYPE' | 'INVALID_VALUE' | 'REQUIRED_FIELD' | 'UNKNOWN_FIELD' | 'UNSUPPORTED_VERSION'
  | 'SCOPE_MISMATCH' | 'AUTHORITY_BYPASS' | 'PROPOSAL_NOT_AUTHORIZATION' | 'DECISION_NOT_AUTHORIZATION'
  | 'IDEMPOTENCY_CONFLICT' | 'RECEIPT_INTEGRITY' | 'RECEIPT_STATE' | 'LEARNING_REVIEW_REQUIRED';
export type ActionDiagnostic = Readonly<{ code: ActionDiagnosticCode; path: string; message: string; next_action: string }>;
export type ContractValidationResult<T> = Readonly<{ valid: boolean; diagnostics: readonly ActionDiagnostic[]; value?: T }>;

const STATES = new Set<MissionState>(['CREATED', 'READY', 'ACTIVE', 'WAITING_EVENT', 'WAITING_SCHEDULE', 'WAITING_APPROVAL', 'HANDED_OFF', 'PAUSED', 'COMPLETING', 'COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED']);
const IDENTIFIER = /^[^\u0000\s][^\u0000]*$/;
const DIGEST = /^sha256:[a-f0-9]{64}$/;
const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const SCOPED_KEYS = new Set(['tenantId', 'organisationId', 'projectId', 'environmentId', 'missionId']);

export function validateProposal(value: unknown): ContractValidationResult<Proposal> { return validateContract(value, PROPOSAL_KIND, validateProposalSpec) as ContractValidationResult<Proposal>; }
export function validateDecision(value: unknown): ContractValidationResult<Decision> { return validateContract(value, DECISION_KIND, validateDecisionSpec) as ContractValidationResult<Decision>; }
export function validateAction(value: unknown, decision?: Decision): ContractValidationResult<Action> {
  const result = validateContract(value, ACTION_KIND, validateActionSpec) as ContractValidationResult<Action>;
  if (!result.valid || !result.value) return result;
  const diagnostics = [...result.diagnostics];
  if (result.value.spec.effect === 'commit' && !decision) {
    add(diagnostics, 'DECISION_NOT_AUTHORIZATION', '$.spec.decisionId', 'Committed effects require an Atlas authorization Decision', 'Supply the matching allow or modify Decision');
    return { valid: false, diagnostics };
  }
  if (!decision) return result;
  const actionScope = result.value.spec.scope;
  const decisionScope = decision.spec.scope;
  const scopeMatches = (['tenantId', 'organisationId', 'projectId', 'environmentId', 'missionId'] as const).every((key) => actionScope[key] === decisionScope[key]);
  if (result.value.spec.decisionId !== decision.metadata.id || result.value.spec.proposalId !== decision.spec.proposalId || !scopeMatches) add(diagnostics, 'SCOPE_MISMATCH', '$.spec.decisionId', 'Action is not bound to the supplied Decision proposal, scope, and identity', 'Use the Decision issued for this Action');
  if (decision.spec.disposition !== 'allow' && decision.spec.disposition !== 'modify') add(diagnostics, 'DECISION_NOT_AUTHORIZATION', '$.spec.decisionId', `Decision disposition ${decision.spec.disposition} cannot authorize a committed Action`, 'Obtain an allow or modify Decision');
  return diagnostics.length ? { valid: false, diagnostics } : result;
}
export function validateReceipt(value: unknown): ContractValidationResult<Receipt> { return validateContract(value, RECEIPT_KIND, validateReceiptSpec) as ContractValidationResult<Receipt>; }
export function validateOutcome(value: unknown): ContractValidationResult<Outcome> { return validateContract(value, OUTCOME_KIND, validateOutcomeSpec) as ContractValidationResult<Outcome>; }
export function validateLearningProposal(value: unknown): ContractValidationResult<LearningProposal> { return validateContract(value, LEARNING_PROPOSAL_KIND, validateLearningSpec) as ContractValidationResult<LearningProposal>; }

export function digestContract(value: unknown): string { return `sha256:${sha256(stableJson(value))}`; }
export function verifyReceiptIntegrity(receipt: Receipt): boolean {
  const unsigned = { ...receipt, spec: { ...receipt.spec, integrity: undefined } };
  return digestContract(unsigned) === receipt.spec.integrity.digest;
}
export function canAcceptLearningProposal(value: LearningProposal, reviewer: { type: 'operator' | 'system'; identity: string }): ContractValidationResult<LearningProposal> {
  const result = validateLearningProposal(value);
  if (!result.valid || !result.value) return result;
  const diagnostics = [...result.diagnostics];
  if (result.value.spec.proposer.identity === reviewer.identity && result.value.spec.proposer.type === reviewer.type) add(diagnostics, 'LEARNING_REVIEW_REQUIRED', '$.spec.reviewer', 'A LearningProposal cannot accept its own proposal', 'Use an independent governed reviewer');
  if (result.value.spec.status !== 'PROPOSED') add(diagnostics, 'LEARNING_REVIEW_REQUIRED', '$.spec.status', 'Only PROPOSED LearningProposal records can be accepted', 'Review a PROPOSED record');
  return diagnostics.length ? { valid: false, diagnostics } : { valid: true, diagnostics: [], value: deepFreeze({ ...result.value, spec: { ...result.value.spec, status: 'ACCEPTED', reviewer: { ...reviewer, reviewedAt: new Date().toISOString(), rationale: 'Accepted by governed review' } } }) };
}

function validateContract(value: unknown, kind: string, specValidator: (value: Record<string, any>, diagnostics: ActionDiagnostic[]) => void): ContractValidationResult<unknown> {
  const diagnostics: ActionDiagnostic[] = [];
  if (!record(value)) { add(diagnostics, 'INVALID_TYPE', '$', `${kind} must be an object`, `Provide a ${kind} contract object`); return { valid: false, diagnostics }; }
  unknownFields(value, new Set(['apiVersion', 'kind', 'metadata', 'spec']), '$', diagnostics);
  if (value.apiVersion !== ACTION_API_VERSION) add(diagnostics, 'UNSUPPORTED_VERSION', '$.apiVersion', `apiVersion must be ${ACTION_API_VERSION}`, 'Use the supported contract version');
  if (value.kind !== kind) add(diagnostics, 'INVALID_VALUE', '$.kind', `kind must be ${kind}`, `Set kind to ${kind}`);
  validateMetadata(value.metadata, '$.metadata', diagnostics);
  if (!record(value.spec)) add(diagnostics, 'REQUIRED_FIELD', '$.spec', 'spec is required', 'Add the contract specification'); else specValidator(value.spec, diagnostics);
  if (diagnostics.length) return { valid: false, diagnostics };
  return { valid: true, diagnostics: [], value: deepFreeze(clone(value)) };
}

function validateProposalSpec(value: Record<string, any>, d: ActionDiagnostic[]): void {
  unknownFields(value, new Set(['scope', 'proposalType', 'agentVersionId', 'runtime', 'actor', 'stepId', 'intent', 'payload', 'arguments', 'contextRefs', 'citations', 'riskHint', 'expectedOutcome', 'provenance', 'createdAt']), '$.spec', d);
  validateScope(value.scope, '$.spec.scope', d); reqString(value.proposalType, '$.spec.proposalType', d); if (!['message', 'action', 'wait', 'handoff', 'child-mission', 'completion'].includes(value.proposalType)) add(d, 'INVALID_VALUE', '$.spec.proposalType', 'proposalType is invalid', 'Use a supported Proposal type');
  digest(value.agentVersionId, '$.spec.agentVersionId', d); validateRuntime(value.runtime, '$.spec.runtime', d); validateActor(value.actor, '$.spec.actor', d); reqString(value.stepId, '$.spec.stepId', d); reqString(value.intent, '$.spec.intent', d); if (value.intent?.length > 10000) add(d, 'INVALID_VALUE', '$.spec.intent', 'intent is too long', 'Bound Proposal intent');
  if (value.contextRefs !== undefined) stringArray(value.contextRefs, '$.spec.contextRefs', d); if (value.citations !== undefined) stringArray(value.citations, '$.spec.citations', d); if (!['none', 'low', 'medium', 'high', 'critical'].includes(value.riskHint)) add(d, 'INVALID_VALUE', '$.spec.riskHint', 'riskHint is invalid', 'Use a supported risk hint');
  validateProvenance(value.provenance, '$.spec.provenance', d); timestamp(value.createdAt, '$.spec.createdAt', d);
  if (value.actor?.type === 'external-runtime' && (value.decisionId !== undefined || value.approvedAt !== undefined || value.receiptId !== undefined)) add(d, 'AUTHORITY_BYPASS', '$.spec', 'External runtimes cannot add approval, commit, or receipt authority to a Proposal', 'Submit intent only; Atlas creates Decisions and Receipts');
}
function validateDecisionSpec(value: Record<string, any>, d: ActionDiagnostic[]): void {
  unknownFields(value, new Set(['scope', 'proposalId', 'actionClass', 'riskClass', 'autonomyLevel', 'policyVersion', 'disposition', 'reasonCodes', 'explanation', 'issuer', 'requiredActor', 'budgetReservation', 'evidenceRefs', 'expiresAt', 'decidedAt', 'provenance']), '$.spec', d);
  validateScope(value.scope, '$.spec.scope', d); reqString(value.proposalId, '$.spec.proposalId', d); reqString(value.actionClass, '$.spec.actionClass', d); if (!['none', 'low', 'medium', 'high', 'critical'].includes(value.riskClass)) add(d, 'INVALID_VALUE', '$.spec.riskClass', 'riskClass is invalid', 'Use a supported risk class'); if (!/^L[0-4]$/.test(value.autonomyLevel ?? '')) add(d, 'INVALID_VALUE', '$.spec.autonomyLevel', 'autonomyLevel is invalid', 'Use L0 through L4'); reqString(value.policyVersion, '$.spec.policyVersion', d); if (!['allow', 'deny', 'require_approval', 'require_handoff', 'modify', 'defer', 'fail'].includes(value.disposition)) add(d, 'INVALID_VALUE', '$.spec.disposition', 'disposition is invalid', 'Use a supported Decision disposition'); stringArray(value.reasonCodes, '$.spec.reasonCodes', d); reqString(value.explanation, '$.spec.explanation', d); validateIssuer(value.issuer, '$.spec.issuer', d); if (value.requiredActor !== undefined) reqString(value.requiredActor, '$.spec.requiredActor', d); if (value.evidenceRefs !== undefined) stringArray(value.evidenceRefs, '$.spec.evidenceRefs', d); if (value.expiresAt !== undefined) timestamp(value.expiresAt, '$.spec.expiresAt', d); timestamp(value.decidedAt, '$.spec.decidedAt', d); validateProvenance(value.provenance, '$.spec.provenance', d);
  if (value.disposition === 'allow' && value.autonomyLevel === 'L0') add(d, 'INVALID_VALUE', '$.spec.disposition', 'L0 cannot allow an effect without a human control', 'Use require_approval or a higher action-specific autonomy level');
}
function validateActionSpec(value: Record<string, any>, d: ActionDiagnostic[]): void {
  unknownFields(value, new Set(['scope', 'proposalId', 'decisionId', 'stepId', 'actionType', 'toolName', 'effect', 'arguments', 'idempotencyKey', 'status', 'policyVersion', 'createdAt']), '$.spec', d); validateScope(value.scope, '$.spec.scope', d); for (const key of ['proposalId', 'decisionId', 'stepId', 'actionType', 'toolName', 'idempotencyKey', 'policyVersion']) reqString(value[key], `$.spec.${key}`, d); if (!['read', 'propose', 'commit'].includes(value.effect)) add(d, 'INVALID_VALUE', '$.spec.effect', 'effect is invalid', 'Use read, propose, or commit'); if (!['PLANNED', 'OUTBOXED', 'CLAIMED', 'COMMITTED', 'FAILED', 'CANCELLED'].includes(value.status)) add(d, 'INVALID_VALUE', '$.spec.status', 'status is invalid', 'Use a supported Action status'); timestamp(value.createdAt, '$.spec.createdAt', d);
}
function validateReceiptSpec(value: Record<string, any>, d: ActionDiagnostic[]): void {
  unknownFields(value, new Set(['scope', 'receiptType', 'actionId', 'missionId', 'status', 'provider', 'providerReference', 'resultDigest', 'resultRef', 'usage', 'cost', 'audit', 'supersedesReceiptId', 'occurredAt', 'recordedAt', 'integrity']), '$.spec', d); validateScope(value.scope, '$.spec.scope', d); if (!['commit', 'tool', 'provider', 'delivery', 'usage', 'cost', 'audit', 'outcome'].includes(value.receiptType)) add(d, 'INVALID_VALUE', '$.spec.receiptType', 'receiptType is invalid', 'Use a supported receipt type'); reqString(value.missionId, '$.spec.missionId', d); if (value.actionId !== undefined) reqString(value.actionId, '$.spec.actionId', d); if (!['SUCCEEDED', 'FAILED', 'UNKNOWN_PENDING_RECONCILIATION'].includes(value.status)) add(d, 'INVALID_VALUE', '$.spec.status', 'receipt status is invalid', 'Preserve unknown provider/business state as UNKNOWN_PENDING_RECONCILIATION'); if (value.resultDigest !== undefined) digest(value.resultDigest, '$.spec.resultDigest', d); if (value.resultRef !== undefined) reqString(value.resultRef, '$.spec.resultRef', d); if (value.providerReference !== undefined) reqString(value.providerReference, '$.spec.providerReference', d); timestamp(value.occurredAt, '$.spec.occurredAt', d); timestamp(value.recordedAt, '$.spec.recordedAt', d); validateIntegrity(value.integrity, '$.spec.integrity', d); if (value.status === 'UNKNOWN_PENDING_RECONCILIATION' && value.receiptType === 'delivery' && !value.providerReference) add(d, 'RECEIPT_STATE', '$.spec.providerReference', 'Unknown delivery requires a provider reference for reconciliation', 'Record the provider callback or reconciliation key');
}
function validateOutcomeSpec(value: Record<string, any>, d: ActionDiagnostic[]): void {
  unknownFields(value, new Set(['scope', 'missionId', 'definitionId', 'status', 'metric', 'evidenceRefs', 'attributionRule', 'evaluationWindow', 'humanConfirmed', 'receiptIds', 'evaluatedAt']), '$.spec', d); validateScope(value.scope, '$.spec.scope', d); reqString(value.missionId, '$.spec.missionId', d); reqString(value.definitionId, '$.spec.definitionId', d); if (!['SUCCEEDED', 'FAILED', 'UNKNOWN'].includes(value.status)) add(d, 'INVALID_VALUE', '$.spec.status', 'outcome status is invalid', 'Use SUCCEEDED, FAILED, or UNKNOWN'); stringArray(value.evidenceRefs, '$.spec.evidenceRefs', d); reqString(value.attributionRule, '$.spec.attributionRule', d); if (!['boolean'].includes(typeof value.humanConfirmed)) add(d, 'INVALID_TYPE', '$.spec.humanConfirmed', 'humanConfirmed is required', 'Record whether a human confirmed the outcome'); stringArray(value.receiptIds, '$.spec.receiptIds', d); timestamp(value.evaluatedAt, '$.spec.evaluatedAt', d); if (value.evaluationWindow) { timestamp(value.evaluationWindow.startsAt, '$.spec.evaluationWindow.startsAt', d); timestamp(value.evaluationWindow.endsAt, '$.spec.evaluationWindow.endsAt', d); }
}
function validateLearningSpec(value: Record<string, any>, d: ActionDiagnostic[]): void {
  unknownFields(value, new Set(['scope', 'target', 'proposedChange', 'originatingMissionIds', 'supportingEvidenceRefs', 'contradictingEvidenceRefs', 'privacyClass', 'safetyClass', 'evaluation', 'status', 'proposer', 'reviewer', 'createdAt']), '$.spec', d); validateScope(value.scope, '$.spec.scope', d); if (!['knowledge', 'memory', 'tool', 'instruction', 'policy'].includes(value.target)) add(d, 'INVALID_VALUE', '$.spec.target', 'learning target is invalid', 'Use a supported learning target'); stringArray(value.originatingMissionIds, '$.spec.originatingMissionIds', d); stringArray(value.supportingEvidenceRefs, '$.spec.supportingEvidenceRefs', d); if (value.contradictingEvidenceRefs !== undefined) stringArray(value.contradictingEvidenceRefs, '$.spec.contradictingEvidenceRefs', d); if (!['public', 'tenant', 'customer', 'sensitive'].includes(value.privacyClass)) add(d, 'INVALID_VALUE', '$.spec.privacyClass', 'privacyClass is invalid', 'Classify the proposed change'); if (!['low', 'medium', 'high', 'critical'].includes(value.safetyClass)) add(d, 'INVALID_VALUE', '$.spec.safetyClass', 'safetyClass is invalid', 'Classify the proposed change'); if (!['PROPOSED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'REVERTED'].includes(value.status)) add(d, 'INVALID_VALUE', '$.spec.status', 'learning status is invalid', 'Use a supported LearningProposal status'); validateActor(value.proposer, '$.spec.proposer', d); timestamp(value.createdAt, '$.spec.createdAt', d); if (value.status === 'ACCEPTED' && !record(value.reviewer)) add(d, 'LEARNING_REVIEW_REQUIRED', '$.spec.reviewer', 'Accepted LearningProposal requires an independent reviewer', 'Add an independent governed reviewer'); if (value.reviewer) { if (!['operator', 'system'].includes(value.reviewer.type)) add(d, 'LEARNING_REVIEW_REQUIRED', '$.spec.reviewer.type', 'Reviewer must be an operator or governed system', 'Use an independent reviewer'); reqString(value.reviewer.identity, '$.spec.reviewer.identity', d); reqString(value.reviewer.rationale, '$.spec.reviewer.rationale', d); timestamp(value.reviewer.reviewedAt, '$.spec.reviewer.reviewedAt', d); }
}

function validateMetadata(value: unknown, path: string, d: ActionDiagnostic[]): void { if (!record(value)) { add(d, 'REQUIRED_FIELD', path, 'metadata is required', 'Add contract identity metadata'); return; } unknownFields(value, new Set(['id', 'schemaVersion', 'missionId']), path, d); reqString(value.id, `${path}.id`, d); if (value.schemaVersion !== '1') add(d, 'UNSUPPORTED_VERSION', `${path}.schemaVersion`, 'schemaVersion must be 1', 'Use schemaVersion 1'); if (value.missionId !== undefined) reqString(value.missionId, `${path}.missionId`, d); }
function validateScope(value: unknown, path: string, d: ActionDiagnostic[]): void { if (!record(value)) { add(d, 'REQUIRED_FIELD', path, 'scope is required', 'Use server-derived Mission scope'); return; } unknownFields(value, SCOPED_KEYS, path, d); for (const key of SCOPED_KEYS) reqString(value[key], `${path}.${key}`, d); }
function validateRuntime(value: unknown, path: string, d: ActionDiagnostic[]): void { if (!record(value)) { add(d, 'REQUIRED_FIELD', path, 'runtime identity is required', 'Record the external runtime identity'); return; } reqString(value.id, `${path}.id`, d); reqString(value.type, `${path}.type`, d); reqString(value.version, `${path}.version`, d); }
function validateActor(value: unknown, path: string, d: ActionDiagnostic[]): void { if (!record(value)) { add(d, 'REQUIRED_FIELD', path, 'actor is required', 'Record the proposing actor'); return; } if (!['system', 'developer', 'agent', 'operator', 'provider', 'scheduler', 'external-runtime'].includes(value.type)) add(d, 'INVALID_VALUE', `${path}.type`, 'actor type is invalid', 'Use a canonical actor type'); reqString(value.identity, `${path}.identity`, d); }
function validateIssuer(value: unknown, path: string, d: ActionDiagnostic[]): void { if (!record(value)) { add(d, 'AUTHORITY_BYPASS', path, 'Decision issuer is required', 'Only Atlas policy or an operator can issue Decisions'); return; } if (!['system', 'operator'].includes(value.type)) add(d, 'AUTHORITY_BYPASS', `${path}.type`, 'Only system or operator may issue a Decision', 'External runtimes and Agents may propose only'); reqString(value.identity, `${path}.identity`, d); }
function validateProvenance(value: unknown, path: string, d: ActionDiagnostic[]): void { if (!record(value)) { add(d, 'REQUIRED_FIELD', path, 'provenance is required', 'Record causal and correlation identity'); return; } for (const key of ['correlationId', 'causationId', 'sourceRef']) reqString(value[key], `${path}.${key}`, d); digest(value.inputDigest, `${path}.inputDigest`, d); }
function validateIntegrity(value: unknown, path: string, d: ActionDiagnostic[]): void { if (!record(value)) { add(d, 'RECEIPT_INTEGRITY', path, 'receipt integrity is required', 'Record the unsigned receipt digest and issuer'); return; } digest(value.digest, `${path}.digest`, d); reqString(value.issuer, `${path}.issuer`, d); }
function reqString(value: unknown, path: string, d: ActionDiagnostic[]): void { if (typeof value !== 'string' || !value || value.length > 2048 || !IDENTIFIER.test(value)) add(d, 'INVALID_VALUE', path, 'value must be a bounded non-empty identifier/string', 'Provide a safe bounded value'); }
function digest(value: unknown, path: string, d: ActionDiagnostic[]): void { if (typeof value !== 'string' || !DIGEST.test(value)) add(d, 'INVALID_VALUE', path, 'value must be sha256:<64 hex characters>', 'Provide a deterministic SHA-256 digest'); }
function timestamp(value: unknown, path: string, d: ActionDiagnostic[]): void { if (typeof value !== 'string' || !DATE_TIME.test(value) || !Number.isFinite(Date.parse(value))) add(d, 'INVALID_VALUE', path, 'value must be an ISO-8601 UTC timestamp', 'Use a UTC timestamp'); }
function stringArray(value: unknown, path: string, d: ActionDiagnostic[]): void { if (!Array.isArray(value) || value.length > 256 || value.some((item) => typeof item !== 'string' || !item || item.length > 2048)) add(d, 'INVALID_VALUE', path, 'value must be a bounded string array', 'Provide bounded references'); }
function unknownFields(value: Record<string, any>, allowed: ReadonlySet<string>, path: string, d: ActionDiagnostic[]): void { for (const key of Object.keys(value)) if (!allowed.has(key)) add(d, 'UNKNOWN_FIELD', `${path}.${key}`, `unknown field: ${key}`, 'Remove the field or version the contract'); }
function add(d: ActionDiagnostic[], code: ActionDiagnosticCode, path: string, message: string, next_action: string): void { if (!d.some((x) => x.code === code && x.path === path && x.message === message)) d.push({ code, path, message, next_action }); }
function record(value: unknown): value is Record<string, any> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
function deepFreeze<T>(value: T): T { if (value && typeof value === 'object') { Object.freeze(value); for (const nested of Object.values(value as Record<string, unknown>)) deepFreeze(nested); } return value; }
function stableJson(value: unknown): string { if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`; if (record(value)) return `{${Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${stableJson(v)}`).join(',')}}`; return JSON.stringify(value); }
