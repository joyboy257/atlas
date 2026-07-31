import type { DecisionDisposition, ProposalRiskHint } from './action-contract.js';

export const ATLAS_AUTONOMY_POLICY_SCHEMA = 'atlas.autonomy-policy/v1' as const;

export type AtlasAutonomyLevel = 'L0' | 'L1' | 'L2' | 'L3' | 'L4';
export type AtlasAutonomyPolicyOutcome = DecisionDisposition;
export type AtlasBudgetDimension = 'tokens' | 'steps' | 'cost';

export type AtlasAutonomyPolicyRule = Readonly<{
  actionClass: string;
  maxAutonomy: AtlasAutonomyLevel;
  riskClass: ProposalRiskHint;
  approvalRequired?: boolean;
  handoffAllowed?: boolean;
  maxTokens?: number;
  maxSteps?: number;
  maxCost?: number;
  currency?: string;
}>;

export type AtlasAutonomyPolicy = Readonly<{
  schemaVersion: typeof ATLAS_AUTONOMY_POLICY_SCHEMA;
  policyVersion: string;
  rules: readonly AtlasAutonomyPolicyRule[];
}>;

export type AtlasAutonomyEvaluationInput = Readonly<{
  actionClass: string;
  requestedAutonomy: unknown;
  uncertainty?: boolean;
  estimatedTokens?: number;
  estimatedSteps?: number;
  estimatedCost?: number;
}>;

export type AtlasAutonomyPolicyDecision = Readonly<{
  schemaVersion: typeof ATLAS_AUTONOMY_POLICY_SCHEMA;
  policyVersion: string;
  actionClass: string;
  riskClass: ProposalRiskHint;
  autonomyLevel: AtlasAutonomyLevel;
  disposition: AtlasAutonomyPolicyOutcome;
  reasonCodes: readonly string[];
  explanation: string;
  budgetReservation?: AtlasBudgetReservation;
}>;

export type AtlasBudgetKey = Readonly<{
  tenantId: string;
  organisationId: string;
  projectId: string;
  environmentId: string;
  missionId: string;
}>;

export type AtlasBudgetLimits = Readonly<{
  maxTokens?: number;
  maxSteps?: number;
  maxCost?: number;
  currency?: string;
}>;

export type AtlasBudgetReservation = Readonly<{
  reservationId: string;
  budgetKey: AtlasBudgetKey;
  tokens: number;
  steps: number;
  cost: number;
  currency: string;
  status: 'reserved' | 'committed' | 'released';
}>;

export class AtlasAutonomyPolicyError extends Error {
  readonly code:
    | 'INVALID_POLICY'
    | 'UNKNOWN_ACTION'
    | 'INVALID_AUTONOMY'
    | 'BUDGET_EXHAUSTED'
    | 'RESERVATION_CONFLICT'
    | 'RESERVATION_NOT_FOUND'
    | 'RESERVATION_STATE';

  constructor(code: AtlasAutonomyPolicyError['code'], message: string) {
    super(message);
    this.name = 'AtlasAutonomyPolicyError';
    this.code = code;
  }
}

const LEVEL_RANK: Readonly<Record<AtlasAutonomyLevel, number>> = { L0: 0, L1: 1, L2: 2, L3: 3, L4: 4 };
const RISK_CLASSES = new Set<ProposalRiskHint>(['none', 'low', 'medium', 'high', 'critical']);

export function createAtlasAutonomyPolicy(policy: AtlasAutonomyPolicy): AtlasAutonomyPolicy {
  if (policy.schemaVersion !== ATLAS_AUTONOMY_POLICY_SCHEMA || !policy.policyVersion.trim()) {
    throw new AtlasAutonomyPolicyError('INVALID_POLICY', 'Autonomy policy schemaVersion and policyVersion are required');
  }
  const seen = new Set<string>();
  for (const rule of policy.rules) {
    if (!rule.actionClass.trim() || seen.has(rule.actionClass)) throw new AtlasAutonomyPolicyError('INVALID_POLICY', `Duplicate or empty action policy: ${rule.actionClass}`);
    if (!isAutonomyLevel(rule.maxAutonomy) || !RISK_CLASSES.has(rule.riskClass)) throw new AtlasAutonomyPolicyError('INVALID_POLICY', `Invalid autonomy or risk rule for ${rule.actionClass}`);
    validateLimit(rule.maxTokens, 'maxTokens');
    validateLimit(rule.maxSteps, 'maxSteps');
    validateLimit(rule.maxCost, 'maxCost');
    seen.add(rule.actionClass);
  }
  return deepFreeze(structuredClone(policy));
}

export function evaluateAtlasAutonomyPolicy(
  policy: AtlasAutonomyPolicy,
  input: AtlasAutonomyEvaluationInput,
): AtlasAutonomyPolicyDecision {
  const normalized = createAtlasAutonomyPolicy(policy);
  const rule = normalized.rules.find((candidate) => candidate.actionClass === input.actionClass);
  if (!rule) {
    return decision(normalized, input.actionClass, 'none', 'L0', 'deny', ['policy.action_unknown'], 'No server policy exists for this action; execution is denied.');
  }
  if (!isAutonomyLevel(input.requestedAutonomy)) {
    return decision(normalized, input.actionClass, rule.riskClass, 'L0', 'deny', ['policy.autonomy_invalid'], 'The requested autonomy is not a supported L0–L4 value; execution is denied.');
  }
  if (LEVEL_RANK[input.requestedAutonomy] > LEVEL_RANK[rule.maxAutonomy]) {
    return decision(normalized, input.actionClass, rule.riskClass, rule.maxAutonomy, 'deny', ['policy.autonomy_exceeds_server_limit'], `The requested autonomy exceeds the server limit ${rule.maxAutonomy}; agent input cannot raise authority.`);
  }
  if (input.uncertainty === true) {
    return rule.handoffAllowed
      ? decision(normalized, input.actionClass, rule.riskClass, input.requestedAutonomy, 'require_handoff', ['policy.uncertain_handoff'], 'Policy uncertainty requires an explicit human handoff.')
      : decision(normalized, input.actionClass, rule.riskClass, input.requestedAutonomy, 'fail', ['policy.uncertain_fail_closed'], 'Policy uncertainty cannot be handed off and therefore fails closed.');
  }
  if (exceedsLimit(input.estimatedTokens, rule.maxTokens) || exceedsLimit(input.estimatedSteps, rule.maxSteps) || exceedsLimit(input.estimatedCost, rule.maxCost)) {
    return decision(normalized, input.actionClass, rule.riskClass, input.requestedAutonomy, 'defer', ['budget.exhausted'], 'The action exceeds its server budget and must wait or be rejected before execution.');
  }
  if (rule.handoffAllowed && rule.riskClass === 'critical') {
    return decision(normalized, input.actionClass, rule.riskClass, input.requestedAutonomy, 'require_handoff', ['policy.critical_handoff'], 'Critical actions require an explicit human handoff.');
  }
  if (rule.approvalRequired || input.requestedAutonomy === 'L0') {
    return decision(normalized, input.actionClass, rule.riskClass, input.requestedAutonomy, 'require_approval', ['policy.approval_required'], 'This action requires an independent approval before commitment.');
  }
  return decision(normalized, input.actionClass, rule.riskClass, input.requestedAutonomy, 'allow', ['policy.allow'], 'Action is allowed within the server policy and declared budget.');
}

export class AtlasBudgetLedger {
  private readonly reservations = new Map<string, AtlasBudgetReservation>();
  private readonly committed = new Map<string, { tokens: number; steps: number; cost: number }>();

  constructor(private readonly limits: AtlasBudgetLimits) {
    validateLimit(limits.maxTokens, 'maxTokens');
    validateLimit(limits.maxSteps, 'maxSteps');
    validateLimit(limits.maxCost, 'maxCost');
    if (limits.currency !== undefined && !/^[A-Z]{3}$/.test(limits.currency)) throw new AtlasAutonomyPolicyError('INVALID_POLICY', 'currency must be a three-letter uppercase code');
  }

  reserve(budgetKey: AtlasBudgetKey, reservationId: string, request: Readonly<Pick<AtlasBudgetReservation, 'tokens' | 'steps' | 'cost' | 'currency'>>): AtlasBudgetReservation {
    const existing = this.reservations.get(reservationId);
    if (existing) {
      if (JSON.stringify({ ...existing, status: 'reserved' }) !== JSON.stringify({ ...existing, ...request, budgetKey, reservationId, status: 'reserved' })) {
        throw new AtlasAutonomyPolicyError('RESERVATION_CONFLICT', `Reservation ${reservationId} already exists with different values`);
      }
      return clone(existing);
    }
    const normalized = { tokens: request.tokens, steps: request.steps, cost: request.cost, currency: request.currency };
    for (const [name, value] of Object.entries(normalized)) {
      if (name !== 'currency' && (typeof value !== 'number' || !Number.isFinite(value) || value < 0)) {
        throw new AtlasAutonomyPolicyError('INVALID_POLICY', `${name} must be a non-negative finite number`);
      }
    }
    const used = this.totals(budgetKey);
    if (exceedsLimit(used.tokens + normalized.tokens, this.limits.maxTokens) || exceedsLimit(used.steps + normalized.steps, this.limits.maxSteps) || exceedsLimit(used.cost + normalized.cost, this.limits.maxCost)) {
      throw new AtlasAutonomyPolicyError('BUDGET_EXHAUSTED', 'Budget reservation exceeds the server limit');
    }
    if (this.limits.currency && this.limits.currency !== normalized.currency) throw new AtlasAutonomyPolicyError('INVALID_POLICY', 'Reservation currency does not match the server budget');
    const reservation: AtlasBudgetReservation = { reservationId, budgetKey: clone(budgetKey), ...normalized, status: 'reserved' };
    this.reservations.set(reservationId, reservation);
    return clone(reservation);
  }

  commit(reservationId: string): AtlasBudgetReservation {
    const reservation = this.require(reservationId);
    if (reservation.status === 'committed') return clone(reservation);
    if (reservation.status !== 'reserved') throw new AtlasAutonomyPolicyError('RESERVATION_STATE', `Reservation ${reservationId} is ${reservation.status}`);
    this.reservations.set(reservationId, { ...reservation, status: 'committed' });
    const prior = this.committed.get(this.key(reservation.budgetKey)) ?? { tokens: 0, steps: 0, cost: 0 };
    this.committed.set(this.key(reservation.budgetKey), { tokens: prior.tokens + reservation.tokens, steps: prior.steps + reservation.steps, cost: prior.cost + reservation.cost });
    return clone({ ...reservation, status: 'committed' });
  }

  release(reservationId: string): AtlasBudgetReservation {
    const reservation = this.require(reservationId);
    if (reservation.status === 'released') return clone(reservation);
    if (reservation.status !== 'reserved') throw new AtlasAutonomyPolicyError('RESERVATION_STATE', `Committed reservation ${reservationId} cannot be released`);
    this.reservations.set(reservationId, { ...reservation, status: 'released' });
    return clone({ ...reservation, status: 'released' });
  }

  get(reservationId: string): AtlasBudgetReservation | undefined {
    const value = this.reservations.get(reservationId);
    return value ? clone(value) : undefined;
  }

  private totals(budgetKey: AtlasBudgetKey): { tokens: number; steps: number; cost: number } {
    const committed = this.committed.get(this.key(budgetKey)) ?? { tokens: 0, steps: 0, cost: 0 };
    const reserved = [...this.reservations.values()].filter((item) => item.status === 'reserved' && this.key(item.budgetKey) === this.key(budgetKey)).reduce((total, item) => ({ tokens: total.tokens + item.tokens, steps: total.steps + item.steps, cost: total.cost + item.cost }), { tokens: 0, steps: 0, cost: 0 });
    return { tokens: committed.tokens + reserved.tokens, steps: committed.steps + reserved.steps, cost: committed.cost + reserved.cost };
  }

  private require(reservationId: string): AtlasBudgetReservation {
    const value = this.reservations.get(reservationId);
    if (!value) throw new AtlasAutonomyPolicyError('RESERVATION_NOT_FOUND', `Reservation ${reservationId} does not exist`);
    return value;
  }

  private key(value: AtlasBudgetKey): string { return JSON.stringify(value); }
}

function decision(policy: AtlasAutonomyPolicy, actionClass: string, riskClass: ProposalRiskHint, autonomyLevel: AtlasAutonomyLevel, disposition: AtlasAutonomyPolicyOutcome, reasonCodes: readonly string[], explanation: string): AtlasAutonomyPolicyDecision {
  return { schemaVersion: ATLAS_AUTONOMY_POLICY_SCHEMA, policyVersion: policy.policyVersion, actionClass, riskClass, autonomyLevel, disposition, reasonCodes, explanation };
}

function isAutonomyLevel(value: unknown): value is AtlasAutonomyLevel { return typeof value === 'string' && /^L[0-4]$/.test(value); }
function exceedsLimit(value: number | undefined, limit: number | undefined): boolean { return value !== undefined && (!Number.isFinite(value) || value < 0 || (limit !== undefined && value > limit)); }
function validateLimit(value: number | undefined, name: string): void { if (value !== undefined && (!Number.isFinite(value) || value < 0)) throw new AtlasAutonomyPolicyError('INVALID_POLICY', `${name} must be a non-negative finite number`); }
function clone<T>(value: T): T { return structuredClone(value); }
function deepFreeze<T>(value: T): T { if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.freeze(value); for (const nested of Object.values(value as Record<string, unknown>)) deepFreeze(nested); } return value; }
