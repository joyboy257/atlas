import { describe, expect, it } from 'vitest';
import {
  ACTION_API_VERSION,
  ACTION_KIND,
  DECISION_KIND,
  LEARNING_PROPOSAL_KIND,
  OUTCOME_KIND,
  PROPOSAL_KIND,
  RECEIPT_KIND,
  canAcceptLearningProposal,
  digestContract,
  validateAction,
  validateDecision,
  validateLearningProposal,
  validateOutcome,
  validateProposal,
  validateReceipt,
  verifyReceiptIntegrity,
  type Action,
  type Decision,
  type LearningProposal,
  type Proposal,
} from '../src/action-contract.js';

const scope = { tenantId: 'tenant-a', organisationId: 'org-a', projectId: 'project-a', environmentId: 'staging', missionId: 'mission-001' };
const digest = (letter: string) => `sha256:${letter.repeat(64)}`;
const base = { apiVersion: ACTION_API_VERSION, metadata: { id: 'proposal-001', schemaVersion: '1', missionId: scope.missionId } };

function proposal(overrides: Record<string, unknown> = {}): Proposal {
  return {
    ...base,
    kind: PROPOSAL_KIND,
    spec: {
      scope, proposalType: 'action', agentVersionId: digest('a'), runtime: { id: 'runtime-1', type: 'custom', version: '1.0.0' },
      actor: { type: 'external-runtime', identity: 'runtime-1' }, stepId: 'step-1', intent: 'Send a booking confirmation', arguments: { bookingId: 'booking-1' }, riskHint: 'medium',
      provenance: { correlationId: 'corr-1', causationId: 'turn-1', sourceRef: 'turn-1', inputDigest: digest('b') }, createdAt: '2026-07-29T12:00:00.000Z', ...overrides,
    },
  } as Proposal;
}

function decision(overrides: Record<string, unknown> = {}): Decision {
  return {
    ...base, kind: DECISION_KIND, metadata: { id: 'decision-001', schemaVersion: '1', missionId: scope.missionId },
    spec: {
      scope, proposalId: 'proposal-001', actionClass: 'send-message', riskClass: 'medium', autonomyLevel: 'L2', policyVersion: 'policy-1', disposition: 'allow', reasonCodes: ['policy.allow'], explanation: 'Allowed by policy', issuer: { type: 'system', identity: 'atlas-policy' },
      decidedAt: '2026-07-29T12:00:01.000Z', provenance: { correlationId: 'corr-1', causationId: 'proposal-001', sourceRef: 'proposal-001', inputDigest: digest('c') }, ...overrides,
    },
  } as Decision;
}

function action(overrides: Record<string, unknown> = {}): Action {
  return {
    ...base, kind: ACTION_KIND, metadata: { id: 'action-001', schemaVersion: '1', missionId: scope.missionId },
    spec: { scope, proposalId: 'proposal-001', decisionId: 'decision-001', stepId: 'step-1', actionType: 'send-message', toolName: 'messaging.send', effect: 'commit', arguments: { text: 'confirmed' }, idempotencyKey: 'action-idem-1', status: 'PLANNED', policyVersion: 'policy-1', createdAt: '2026-07-29T12:00:02.000Z', ...overrides },
  } as Action;
}

describe('governed action contract identity', () => {
  it('exports versioned kinds and validates a Proposal', () => {
    expect([PROPOSAL_KIND, DECISION_KIND, ACTION_KIND, RECEIPT_KIND, OUTCOME_KIND, LEARNING_PROPOSAL_KIND]).toEqual(['Proposal', 'Decision', 'Action', 'Receipt', 'Outcome', 'LearningProposal']);
    expect(validateProposal(proposal()).valid).toBe(true);
    expect(Object.isFrozen(validateProposal(proposal()).value)).toBe(true);
  });
});

describe('authority boundaries', () => {
  it('rejects a Decision issued by an external runtime', () => {
    const result = validateDecision(decision({ issuer: { type: 'external-runtime', identity: 'runtime-1' } }));
    expect(result.valid).toBe(false);
    expect(result.diagnostics.map((item) => item.code)).toContain('AUTHORITY_BYPASS');
  });

  it('does not treat a Proposal as authorization and requires an allow/modify Decision for commit', () => {
    expect(validateAction(action()).valid).toBe(false);
    expect(validateAction({ ...action(), spec: { ...action().spec, effect: 'read' } }).valid).toBe(true);
    const denied = validateAction(action(), decision({ disposition: 'deny' }));
    expect(denied.valid).toBe(false);
    expect(denied.diagnostics.map((item) => item.code)).toContain('DECISION_NOT_AUTHORIZATION');
  });

  it('rejects an Action crossing tenant or environment scope', () => {
    const result = validateAction(action({ scope: { ...scope, tenantId: 'tenant-b' } }), decision());
    expect(result.valid).toBe(false);
    expect(result.diagnostics.map((item) => item.code)).toContain('SCOPE_MISMATCH');
  });
});

describe('receipts and outcomes', () => {
  it('accepts unknown provider state only as pending reconciliation', () => {
    const unsigned = {
      apiVersion: ACTION_API_VERSION, kind: RECEIPT_KIND, metadata: { id: 'receipt-1', schemaVersion: '1', missionId: scope.missionId },
      spec: { scope, receiptType: 'delivery', missionId: scope.missionId, status: 'UNKNOWN_PENDING_RECONCILIATION', provider: 'provider-a', providerReference: 'provider-event-1', occurredAt: '2026-07-29T12:00:00.000Z', recordedAt: '2026-07-29T12:00:01.000Z', integrity: { digest: digest('d'), issuer: 'atlas' } },
    };
    expect(validateReceipt(unsigned).valid).toBe(true);
    expect(validateReceipt({ ...unsigned, spec: { ...unsigned.spec, status: 'SUCCEEDED', providerReference: undefined } }).valid).toBe(true);
  });

  it('validates an Outcome as evidence-backed rather than delivery-backed', () => {
    const result = validateOutcome({ apiVersion: ACTION_API_VERSION, kind: OUTCOME_KIND, metadata: { id: 'outcome-1', schemaVersion: '1', missionId: scope.missionId }, spec: { scope, missionId: scope.missionId, definitionId: 'booking-confirmed', status: 'SUCCEEDED', evidenceRefs: ['receipt-1'], attributionRule: 'provider-confirmation', humanConfirmed: false, receiptIds: ['receipt-1'], evaluatedAt: '2026-07-29T12:01:00.000Z' } });
    expect(result.valid).toBe(true);
  });
});

describe('LearningProposal review gate', () => {
  it('rejects accepted learning without independent review', () => {
    const value = { apiVersion: ACTION_API_VERSION, kind: LEARNING_PROPOSAL_KIND, metadata: { id: 'learning-1', schemaVersion: '1', missionId: scope.missionId }, spec: { scope, target: 'policy', proposedChange: { add: 'rule' }, originatingMissionIds: [scope.missionId], supportingEvidenceRefs: ['outcome-1'], privacyClass: 'tenant', safetyClass: 'high', status: 'ACCEPTED', proposer: { type: 'agent', identity: 'agent-1' }, createdAt: '2026-07-29T12:00:00.000Z' } };
    expect(validateLearningProposal(value).valid).toBe(false);
    expect(validateLearningProposal(value).diagnostics.map((item) => item.code)).toContain('LEARNING_REVIEW_REQUIRED');
  });

  it('accepts a proposed learning change only through an independent reviewer', () => {
    const value: LearningProposal = { apiVersion: ACTION_API_VERSION, kind: LEARNING_PROPOSAL_KIND, metadata: { id: 'learning-1', schemaVersion: '1', missionId: scope.missionId }, spec: { scope, target: 'policy', proposedChange: { add: 'rule' }, originatingMissionIds: [scope.missionId], supportingEvidenceRefs: ['outcome-1'], privacyClass: 'tenant', safetyClass: 'high', status: 'PROPOSED', proposer: { type: 'agent', identity: 'agent-1' }, createdAt: '2026-07-29T12:00:00.000Z' } };
    const result = canAcceptLearningProposal(value, { type: 'operator', identity: 'operator-1' });
    expect(result.valid).toBe(true);
    expect(result.value?.spec.status).toBe('ACCEPTED');
    expect(result.value?.spec.reviewer?.identity).toBe('operator-1');
  });
});

describe('contract digests', () => {
  it('is deterministic and verifies receipt integrity', () => {
    expect(digestContract({ b: 2, a: 1 })).toBe(digestContract({ a: 1, b: 2 }));
    const receipt = { apiVersion: ACTION_API_VERSION, kind: RECEIPT_KIND, metadata: { id: 'receipt-2', schemaVersion: '1', missionId: scope.missionId }, spec: { scope, receiptType: 'commit', missionId: scope.missionId, status: 'SUCCEEDED', occurredAt: '2026-07-29T12:00:00.000Z', recordedAt: '2026-07-29T12:00:01.000Z', integrity: { digest: digest('e'), issuer: 'atlas' } } };
    expect(validateReceipt(receipt).valid).toBe(true);
    expect(verifyReceiptIntegrity(receipt as any)).toBe(false);
  });
});
