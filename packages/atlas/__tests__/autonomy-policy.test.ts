import { describe, expect, it } from 'vitest';
import {
  ATLAS_AUTONOMY_POLICY_SCHEMA,
  AtlasAutonomyPolicyError,
  AtlasBudgetLedger,
  createAtlasAutonomyPolicy,
  evaluateAtlasAutonomyPolicy,
} from '../src/autonomy-policy.js';

const policy = createAtlasAutonomyPolicy({
  schemaVersion: ATLAS_AUTONOMY_POLICY_SCHEMA,
  policyVersion: 'policy-2026-07-31',
  rules: [
    { actionClass: 'booking.read', maxAutonomy: 'L4', riskClass: 'low', maxSteps: 4 },
    { actionClass: 'booking.reschedule', maxAutonomy: 'L2', riskClass: 'high', approvalRequired: true, maxSteps: 3, maxCost: 2, currency: 'USD' },
    { actionClass: 'account.close', maxAutonomy: 'L1', riskClass: 'critical', handoffAllowed: true },
  ],
});

const budgetKey = { tenantId: 'tenant-a', organisationId: 'org-a', projectId: 'project-a', environmentId: 'test', missionId: 'mission-a' };

describe('Atlas autonomy policy', () => {
  it('evaluates action-specific policy and records the immutable policy version', () => {
    expect(evaluateAtlasAutonomyPolicy(policy, { actionClass: 'booking.reschedule', requestedAutonomy: 'L2' })).toMatchObject({
      policyVersion: 'policy-2026-07-31',
      riskClass: 'high',
      autonomyLevel: 'L2',
      disposition: 'require_approval',
      reasonCodes: ['policy.approval_required'],
    });
    expect(evaluateAtlasAutonomyPolicy(policy, { actionClass: 'booking.reschedule', requestedAutonomy: 'L3' })).toMatchObject({
      disposition: 'deny',
      reasonCodes: ['policy.autonomy_exceeds_server_limit'],
    });
  });

  it('forbids forged or unknown autonomy and fails uncertain actions closed', () => {
    expect(evaluateAtlasAutonomyPolicy(policy, { actionClass: 'missing.action', requestedAutonomy: 'L4' }).disposition).toBe('deny');
    expect(evaluateAtlasAutonomyPolicy(policy, { actionClass: 'booking.read', requestedAutonomy: 'L5' }).disposition).toBe('deny');
    expect(evaluateAtlasAutonomyPolicy(policy, { actionClass: 'account.close', requestedAutonomy: 'L1', uncertainty: true }).disposition).toBe('require_handoff');
    expect(evaluateAtlasAutonomyPolicy(policy, { actionClass: 'booking.reschedule', requestedAutonomy: 'L2', estimatedCost: 3 }).disposition).toBe('defer');
  });

  it('reserves, commits, releases, and idempotently replays budget operations', () => {
    const ledger = new AtlasBudgetLedger({ maxSteps: 3, maxCost: 2, currency: 'USD' });
    const first = ledger.reserve(budgetKey, 'reservation-1', { tokens: 10, steps: 2, cost: 1, currency: 'USD' });
    expect(ledger.reserve(budgetKey, 'reservation-1', { tokens: 10, steps: 2, cost: 1, currency: 'USD' })).toEqual(first);
    expect(ledger.commit('reservation-1').status).toBe('committed');
    expect(() => ledger.reserve(budgetKey, 'reservation-2', { tokens: 1, steps: 2, cost: 1, currency: 'USD' })).toThrowError(expect.objectContaining({ code: 'BUDGET_EXHAUSTED' }));
    expect(() => ledger.release('reservation-1')).toThrowError(expect.objectContaining({ code: 'RESERVATION_STATE' }));
  });

  it('releases reservations without consuming budget and rejects conflicting replays', () => {
    const ledger = new AtlasBudgetLedger({ maxSteps: 2, maxCost: 2, currency: 'USD' });
    ledger.reserve(budgetKey, 'reservation-1', { tokens: 0, steps: 2, cost: 1, currency: 'USD' });
    expect(ledger.release('reservation-1').status).toBe('released');
    expect(ledger.reserve(budgetKey, 'reservation-2', { tokens: 0, steps: 2, cost: 1, currency: 'USD' }).status).toBe('reserved');
    expect(() => ledger.reserve(budgetKey, 'reservation-2', { tokens: 0, steps: 1, cost: 1, currency: 'USD' })).toThrowError(expect.objectContaining({ code: 'RESERVATION_CONFLICT' }));
    expect(AtlasAutonomyPolicyError).toBeDefined();
  });
});
