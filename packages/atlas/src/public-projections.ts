import type {
  AtlasLocalAction,
  AtlasLocalApproval,
  AtlasLocalConversation,
  AtlasLocalEvidence,
  AtlasLocalInboundMessage,
  AtlasLocalOutboxMessage,
  AtlasLocalPolicyDecision,
  AtlasLocalProposal,
  AtlasLocalReceipt,
  AtlasLocalRuntimeSnapshot,
  AtlasLocalTrace,
  AtlasLocalTraceEvent,
} from './local-runtime.js';
import type {
  Mission,
  MissionLifecycleEvent,
  MissionScope,
} from './mission-contract.js';

export type AtlasPublicScope = Readonly<{
  tenantId: string;
  organisationId: string;
  projectId: string;
  environmentId: string;
}>;
import type {
  MissionControlResult,
  MissionCoordinatorLedger,
  MissionCoordinatorResult,
  MissionCoordinatorSnapshot,
} from './mission-coordinator.js';
import type {
  MissionPersistenceState,
  MissionReceiptLink,
  MissionStepRecord,
  MissionWaitRecord,
} from './mission-persistence.js';

export type AtlasPublicMessageSummary = Readonly<{
  message_id: string;
  conversation_id: string;
  customer_id: string;
  channel_id: string;
  sequence: number;
  occurred_at: string;
  consent: boolean;
  within_messaging_window: boolean;
}>;

export type AtlasPublicTraceEventSummary = Readonly<{
  id: string;
  type: string;
  at: string;
}>;

export type AtlasPublicTraceSummary = Readonly<{
  id: string;
  conversation_id: string;
  message_id: string;
  status: AtlasLocalTrace['status'];
  started_at: string;
  completed_at: string | null;
  events: readonly AtlasPublicTraceEventSummary[];
}>;

export type AtlasPublicReceiptSummary = Readonly<{
  receipt_id: string;
  kind: AtlasLocalReceipt['kind'];
  trace_id: string;
  conversation_id: string;
  subject_id: string;
  outcome: string;
  created_at: string;
  project_hash: string;
  digest: string;
}>;

export type AtlasPublicEvidenceSummary = Readonly<{
  id: string;
  source: string;
  digest: string;
}>;

export type AtlasPublicProposalSummary = Readonly<{
  id: string;
  trace_id: string;
  conversation_id: string;
  message_id: string;
  tool_id: AtlasLocalProposal['tool_id'];
  risk: AtlasLocalProposal['risk'];
  execution: AtlasLocalProposal['execution'];
  approval: AtlasLocalProposal['approval'];
  status: AtlasLocalProposal['status'];
  created_at: string;
}>;

export type AtlasPublicPolicySummary = Readonly<{
  decision: AtlasLocalPolicyDecision['decision'];
  reason:
    | 'consent_required'
    | 'messaging_window_closed'
    | 'high_risk_booking_change'
    | 'knowledge_only_response'
    | 'unknown';
  risk: AtlasLocalPolicyDecision['risk'];
}>;

export type AtlasPublicApprovalSummary = Readonly<{
  id: string;
  proposal_id: string;
  trace_id: string;
  conversation_id: string;
  status: AtlasLocalApproval['status'];
  requested_at: string;
  decided_at: string | null;
  operator_id: string | null;
  action_id: string | null;
}>;

export type AtlasPublicBusinessOutcome = Readonly<{
  booking_id?: string | null;
  previous_date?: string | null;
  scheduled_for?: string | null;
  status?: string | null;
  state?: string | null;
  outcome?: string | null;
}>;

export type AtlasPublicActionSummary = Readonly<{
  id: string;
  proposal_id: string;
  trace_id: string;
  conversation_id: string;
  tool_id: string;
  idempotency_key: string;
  input_digest: string;
  result: AtlasPublicBusinessOutcome;
  committed_at: string;
}>;

export type AtlasPublicOutboxSummary = Readonly<{
  id: string;
  trace_id: string;
  conversation_id: string;
  customer_id: string;
  channel_id: string;
  state: AtlasLocalOutboxMessage['state'];
  attempts: number;
  next_attempt_at: string | null;
  retry_after_ms: number | null;
  provider_message_id: string | null;
  provider_code: string | null;
  provider_occurred_at?: string | null;
  created_at: string;
  updated_at: string;
}>;

export type AtlasPublicConversationSummary = Readonly<{
  id: string;
  customer_id: string;
  channel_id: string;
  state: AtlasLocalConversation['state'];
  last_sequence: number;
  operator_id: string | null;
  created_at: string;
  updated_at: string;
}>;

export type AtlasPublicRuntimeSnapshot = Readonly<{
  schema_version: AtlasLocalRuntimeSnapshot['schema_version'];
  identity: Readonly<{
    mode: AtlasLocalRuntimeSnapshot['identity']['mode'];
    tenant_id: string;
    project_name: string;
    project_hash: string;
    runtime_version: AtlasLocalRuntimeSnapshot['identity']['runtime_version'];
  }>;
  conversations: Readonly<Record<string, AtlasPublicConversationSummary>>;
  customers: Readonly<Record<string, Readonly<{ id: string; created_at: string }>>>;
  messages: readonly AtlasPublicMessageSummary[];
  proposals: Readonly<Record<string, AtlasPublicProposalSummary>>;
  approvals: Readonly<Record<string, AtlasPublicApprovalSummary>>;
  actions: readonly AtlasPublicActionSummary[];
  outbox: readonly AtlasPublicOutboxSummary[];
  traces: readonly AtlasPublicTraceSummary[];
  receipts: readonly AtlasPublicReceiptSummary[];
  bookings: Readonly<Record<string, Readonly<{ id: string; scheduled_for: string; updated_at: string }>>>;
}>;

export type AtlasPublicMission = Readonly<{
  apiVersion: Mission['apiVersion'];
  kind: Mission['kind'];
  metadata: Readonly<{
    missionId: string;
    schemaVersion: string;
    parentMissionId?: string;
  }>;
  spec: Readonly<{
    scope: AtlasPublicScope;
    agent: Readonly<{
      agentId: string;
      agentVersionId: string;
      deploymentId: string;
      runtime: Readonly<{ mode: string; adapter?: string }>;
    }>;
    missionType: string;
    subject?: Readonly<{ subjectId: string; kind: string; canonicalRef?: string }>;
    conversation?: Readonly<{ conversationId: string; channel: string; threadId?: string }>;
    constraints?: Readonly<{
      allowedTools?: readonly string[];
      allowedChannels?: readonly string[];
      maxSteps?: number;
      requiredApprovalFor?: readonly string[];
    }>;
    risk?: Readonly<{
      policyRef: string;
      riskClass: Mission['spec']['risk'] extends infer R ? R extends { riskClass: infer C } ? C : never : never;
      autonomyLevel: Mission['spec']['risk'] extends infer R ? R extends { autonomyLevel: infer L } ? L : never : never;
      approvalRequired?: boolean;
      handoffAllowed?: boolean;
    }>;
    budget?: Readonly<{
      maxTokens?: number;
      maxSteps?: number;
      maxCost?: number;
      currency?: string;
      reservedCost?: number;
    }>;
    deadline?: string;
    state: Mission['spec']['state'];
    stateVersion: number;
    activeWait?: Readonly<{ kind: Mission['spec']['activeWait'] extends infer W ? W extends { kind: infer K } ? K : never : never; waitId: string; expiresAt?: string; requiredActor?: string }>;
    correlation: Readonly<{ correlationId: string; causationId?: string; traceId?: string; parentSpanId?: string }>;
    provenance: Readonly<{
    source: Mission['spec']['provenance']['source'];
    inputDigest: string;
    knowledgeRefs?: readonly string[];
    memoryRefs?: readonly string[];
  }>;
    timestamps: Readonly<{ createdAt: string; activatedAt?: string; updatedAt: string; terminalAt?: string }>;
  }>;
}>;

export type AtlasPublicMissionEvent = Readonly<{
  apiVersion: MissionLifecycleEvent['apiVersion'];
  kind: MissionLifecycleEvent['kind'];
  metadata: Readonly<{ eventId: string; schemaVersion: string; missionId?: string }>;
  spec: Readonly<{
    missionId: string;
    scope: AtlasPublicScope;
    eventType: MissionLifecycleEvent['spec']['eventType'];
    priorState: MissionLifecycleEvent['spec']['priorState'];
    resultingState: MissionLifecycleEvent['spec']['resultingState'];
    stateVersion: number;
    actor: Readonly<{ type: MissionLifecycleEvent['spec']['actor']['type'] }>;
    causationId: string;
    correlationId: string;
    source: Readonly<{ kind: MissionLifecycleEvent['spec']['source']['kind'] }>;
    occurredAt: string;
    recordedAt: string;
    payloadRef?: string;
    payloadDigest?: string;
    idempotencyKey: string;
  }>;
}>;

export type AtlasPublicMissionLedger = Readonly<{
  mission: AtlasPublicMission;
  events: readonly AtlasPublicMissionEvent[];
}>;

export type AtlasPublicWaitSummary = Readonly<{
  waitId: string;
  missionId: string;
  scope: AtlasPublicScope;
  kind: MissionWaitRecord['kind'];
  status: MissionWaitRecord['status'];
  updatedAt: string;
}>;

export type AtlasPublicDecisionSummary = Readonly<{
  id: string;
  missionId: string;
  proposalId: string;
  actionClass: string;
  riskClass: string;
  autonomyLevel: string;
  policyVersion: string;
  disposition: string;
  reasonCodes: readonly string[];
  issuerType: string;
  decidedAt: string;
}>;

export type AtlasPublicPersistedActionSummary = Readonly<{
  id: string;
  missionId: string;
  proposalId: string;
  decisionId: string;
  stepId: string;
  actionType: string;
  effect: string;
  idempotencyKey: string;
  status: string;
  policyVersion: string;
  createdAt: string;
}>;

export type AtlasPublicPersistedReceiptSummary = Readonly<{
  id: string;
  missionId: string;
  receiptType: string;
  status: string;
  provider: string;
  providerReference: string;
  occurredAt: string;
  recordedAt: string;
  integrity: Readonly<{ digest: string; issuer: string }>;
}>;

export type AtlasPublicReceiptLinkSummary = Readonly<{
  linkId: string;
  missionId: string;
  scope: AtlasPublicScope;
  receiptId: string;
  actionId?: string;
  createdAt: string;
}>;

export type AtlasPublicMissionState = Readonly<{
  schemaVersion: MissionPersistenceState['schemaVersion'];
  migrationVersion: MissionPersistenceState['migrationVersion'];
  missions: readonly AtlasPublicMission[];
  lifecycleEvents: readonly AtlasPublicMissionEvent[];
  steps: readonly Readonly<{
    stepId: string;
    missionId: string;
    scope: AtlasPublicScope;
    status: MissionStepRecord['status'];
    updatedAt: string;
  }>[];
  waits: readonly AtlasPublicWaitSummary[];
  decisions: readonly AtlasPublicDecisionSummary[];
  actions: readonly AtlasPublicPersistedActionSummary[];
  receipts: readonly AtlasPublicPersistedReceiptSummary[];
  receiptLinks: readonly AtlasPublicReceiptLinkSummary[];
  triggers: readonly Readonly<{
    triggerId: string;
    type: string;
    occurredAt: string;
    status: string;
    missionId?: string;
    createdAt: string;
    updatedAt: string;
  }>[];
}>;

export type AtlasPublicMissionControlResult = Readonly<{
  command: 'inspect' | 'pause' | 'resume' | 'cancel' | 'return_to_agent';
  missionId: string;
  mission: AtlasPublicMission;
  ledger: AtlasPublicMissionLedger;
  waits: readonly AtlasPublicWaitSummary[];
  correlationId: string;
  runtime: AtlasPublicRuntimeSnapshot;
}>;

export type AtlasPublicRuntimeResult = Readonly<{
  status?: string;
  replayed?: boolean;
  fixture_model?: string;
  trace_id?: string;
  next_action?: string;
  conversation_id?: string;
  state?: string;
  operator_id?: string;
  cancelled_approval_ids?: readonly string[];
  drained_message_ids?: readonly string[];
  advanced_ms?: number;
  message?: AtlasPublicMessageSummary;
  evidence?: AtlasPublicEvidenceSummary;
  proposal?: AtlasPublicProposalSummary;
  policy?: AtlasPublicPolicySummary;
  approval?: AtlasPublicApprovalSummary;
  action?: AtlasPublicActionSummary;
  outbox?: AtlasPublicOutboxSummary;
  delivery?: AtlasPublicOutboxSummary;
  trace?: AtlasPublicTraceSummary;
  receipt?: AtlasPublicReceiptSummary;
  action_receipt?: AtlasPublicReceiptSummary;
  receipts?: readonly AtlasPublicReceiptSummary[];
}>;

export type AtlasPublicCoordinatorResult = Readonly<{
  missionId: string;
  status: string;
  replayed: boolean;
  runtime: AtlasPublicRuntimeResult;
  fixture_model?: string;
  trace_id?: string;
  next_action?: string;
  conversation_id?: string;
  state?: string;
  operator_id?: string;
  message?: AtlasPublicMessageSummary;
  evidence?: AtlasPublicEvidenceSummary;
  proposal?: AtlasPublicProposalSummary;
  policy?: AtlasPublicPolicySummary;
  approval?: AtlasPublicApprovalSummary;
  action?: AtlasPublicActionSummary;
  outbox?: AtlasPublicOutboxSummary;
  delivery?: AtlasPublicOutboxSummary;
  trace?: AtlasPublicTraceSummary;
  receipt?: AtlasPublicReceiptSummary;
  action_receipt?: AtlasPublicReceiptSummary;
  mission: AtlasPublicMission;
  ledger: AtlasPublicMissionLedger;
  receipts: readonly AtlasPublicReceiptSummary[];
}>;

export function projectRuntimeSnapshot(snapshot: AtlasLocalRuntimeSnapshot): AtlasPublicRuntimeSnapshot {
  return {
    schema_version: snapshot.schema_version,
    identity: {
      mode: snapshot.identity.mode,
      tenant_id: snapshot.identity.tenant_id,
      project_name: snapshot.identity.project_name,
      project_hash: snapshot.identity.project_hash,
      runtime_version: snapshot.identity.runtime_version,
    },
    conversations: mapValues(snapshot.conversations, projectConversation),
    customers: mapValues(snapshot.customers, (customer) => ({ id: customer.id, created_at: customer.created_at })),
    messages: snapshot.messages.map(projectMessage),
    proposals: mapValues(snapshot.proposals, projectProposal),
    approvals: mapValues(snapshot.approvals, projectApproval),
    actions: snapshot.actions.map(projectAction),
    outbox: snapshot.outbox.map(projectOutbox),
    traces: snapshot.traces.map(projectTrace),
    receipts: snapshot.receipts.map(projectReceipt),
    bookings: mapValues(snapshot.bookings, (booking) => ({ id: booking.id, scheduled_for: booking.scheduled_for, updated_at: booking.updated_at })),
  };
}

export function projectMission(mission: Mission): AtlasPublicMission {
  const spec = mission.spec;
  return {
    apiVersion: mission.apiVersion,
    kind: mission.kind,
    metadata: {
      missionId: mission.metadata.missionId,
      schemaVersion: mission.metadata.schemaVersion,
      ...(mission.metadata.parentMissionId ? { parentMissionId: mission.metadata.parentMissionId } : {}),
    },
    spec: {
      scope: projectScope(spec.scope),
      agent: {
        agentId: spec.agent.agentId,
        agentVersionId: spec.agent.agentVersionId,
        deploymentId: spec.agent.deploymentId,
        runtime: {
          mode: spec.agent.runtime.mode,
          ...(spec.agent.runtime.adapter ? { adapter: spec.agent.runtime.adapter } : {}),
        },
      },
      missionType: spec.missionType,
      ...(spec.subject ? { subject: {
        subjectId: spec.subject.subjectId,
        kind: spec.subject.kind,
        ...(spec.subject.canonicalRef ? { canonicalRef: spec.subject.canonicalRef } : {}),
      } } : {}),
      ...(spec.conversation ? { conversation: {
        conversationId: spec.conversation.conversationId,
        channel: spec.conversation.channel,
        ...(spec.conversation.threadId ? { threadId: spec.conversation.threadId } : {}),
      } } : {}),
      ...(spec.constraints ? { constraints: {
        ...(spec.constraints.allowedTools ? { allowedTools: [...spec.constraints.allowedTools] } : {}),
        ...(spec.constraints.allowedChannels ? { allowedChannels: [...spec.constraints.allowedChannels] } : {}),
        ...(spec.constraints.maxSteps !== undefined ? { maxSteps: spec.constraints.maxSteps } : {}),
        ...(spec.constraints.requiredApprovalFor ? { requiredApprovalFor: [...spec.constraints.requiredApprovalFor] } : {}),
      } } : {}),
      ...(spec.risk ? { risk: {
        policyRef: spec.risk.policyRef,
        riskClass: spec.risk.riskClass,
        autonomyLevel: spec.risk.autonomyLevel,
        ...(spec.risk.approvalRequired !== undefined ? { approvalRequired: spec.risk.approvalRequired } : {}),
        ...(spec.risk.handoffAllowed !== undefined ? { handoffAllowed: spec.risk.handoffAllowed } : {}),
      } } : {}),
      ...(spec.budget ? { budget: {
        ...(spec.budget.maxTokens !== undefined ? { maxTokens: spec.budget.maxTokens } : {}),
        ...(spec.budget.maxSteps !== undefined ? { maxSteps: spec.budget.maxSteps } : {}),
        ...(spec.budget.maxCost !== undefined ? { maxCost: spec.budget.maxCost } : {}),
        ...(spec.budget.currency ? { currency: spec.budget.currency } : {}),
        ...(spec.budget.reservedCost !== undefined ? { reservedCost: spec.budget.reservedCost } : {}),
      } } : {}),
      ...(spec.deadline ? { deadline: spec.deadline } : {}),
      state: spec.state,
      stateVersion: spec.stateVersion,
      ...(spec.activeWait ? { activeWait: {
        kind: spec.activeWait.kind,
        waitId: spec.activeWait.waitId,
        ...(spec.activeWait.expiresAt ? { expiresAt: spec.activeWait.expiresAt } : {}),
        ...(spec.activeWait.requiredActor ? { requiredActor: spec.activeWait.requiredActor } : {}),
      } } : {}),
      correlation: {
        correlationId: spec.correlation.correlationId,
        ...(spec.correlation.causationId ? { causationId: spec.correlation.causationId } : {}),
        ...(spec.correlation.traceId ? { traceId: spec.correlation.traceId } : {}),
        ...(spec.correlation.parentSpanId ? { parentSpanId: spec.correlation.parentSpanId } : {}),
      },
      provenance: {
        source: spec.provenance.source,
        inputDigest: spec.provenance.inputDigest,
        ...(spec.provenance.knowledgeRefs ? { knowledgeRefs: [...spec.provenance.knowledgeRefs] } : {}),
        ...(spec.provenance.memoryRefs ? { memoryRefs: [...spec.provenance.memoryRefs] } : {}),
      },
      timestamps: {
        createdAt: spec.timestamps.createdAt,
        ...(spec.timestamps.activatedAt ? { activatedAt: spec.timestamps.activatedAt } : {}),
        updatedAt: spec.timestamps.updatedAt,
        ...(spec.timestamps.terminalAt ? { terminalAt: spec.timestamps.terminalAt } : {}),
      },
    },
  };
}

export function projectMissionLedger(ledger: MissionCoordinatorLedger): AtlasPublicMissionLedger {
  return {
    mission: projectMission(ledger.mission),
    events: ledger.events.map(projectMissionEvent),
  };
}

export function projectMissionState(state: MissionPersistenceState): AtlasPublicMissionState {
  return {
    schemaVersion: state.schemaVersion,
    migrationVersion: state.migrationVersion,
    missions: state.missions.map(projectMission),
    lifecycleEvents: state.lifecycleEvents.map(projectMissionEvent),
    steps: state.steps.map(projectStep),
    waits: state.waits.map(projectWait),
    decisions: state.decisions.map(projectDecision),
    actions: state.actions.map(projectPersistedAction),
    receipts: state.receipts.map(projectPersistedReceipt),
    receiptLinks: state.receiptLinks.map(projectReceiptLink),
    triggers: (state.triggers ?? []).map((trigger) => ({
      triggerId: trigger.triggerId,
      type: trigger.type,
      occurredAt: trigger.occurredAt,
      status: trigger.status,
      ...(trigger.missionId ? { missionId: trigger.missionId } : {}),
      createdAt: trigger.createdAt,
      updatedAt: trigger.updatedAt,
    })),
  };
}

export function projectCoordinatorSnapshot(snapshot: MissionCoordinatorSnapshot): Readonly<{
  version: MissionCoordinatorSnapshot['version'];
  missionState: AtlasPublicMissionState;
  runtime: AtlasPublicRuntimeSnapshot;
}> {
  return {
    version: snapshot.version,
    missionState: projectMissionState(snapshot.missionState),
    runtime: projectRuntimeSnapshot(snapshot.runtime),
  };
}

export function projectCoordinatorResult(result: MissionCoordinatorResult): AtlasPublicCoordinatorResult {
  const runtime = projectRuntimeResult(result.runtime);
  return {
    missionId: result.missionId,
    status: result.status,
    replayed: result.replayed,
    ...(runtime.fixture_model ? { fixture_model: runtime.fixture_model } : {}),
    ...(runtime.trace_id ? { trace_id: runtime.trace_id } : {}),
    ...(runtime.next_action ? { next_action: runtime.next_action } : {}),
    ...(runtime.conversation_id ? { conversation_id: runtime.conversation_id } : {}),
    ...(runtime.state ? { state: runtime.state } : {}),
    ...(runtime.operator_id ? { operator_id: runtime.operator_id } : {}),
    ...(runtime.message ? { message: runtime.message } : {}),
    ...(runtime.evidence ? { evidence: runtime.evidence } : {}),
    ...(runtime.proposal ? { proposal: runtime.proposal } : {}),
    ...(runtime.policy ? { policy: runtime.policy } : {}),
    ...(runtime.approval ? { approval: runtime.approval } : {}),
    ...(runtime.action ? { action: runtime.action } : {}),
    ...(runtime.outbox ? { outbox: runtime.outbox } : {}),
    ...(runtime.delivery ? { delivery: runtime.delivery } : {}),
    ...(runtime.trace ? { trace: runtime.trace } : {}),
    ...(runtime.receipt ? { receipt: runtime.receipt } : {}),
    ...(runtime.action_receipt ? { action_receipt: runtime.action_receipt } : {}),
    runtime,
    mission: projectMission(result.mission),
    ledger: projectMissionLedger(result.ledger),
    receipts: result.receipts.map((receipt) => projectReceipt(receipt as AtlasLocalReceipt)),
  };
}

export function projectMissionControlResult(result: MissionControlResult): AtlasPublicMissionControlResult {
  return {
    command: result.command,
    missionId: result.missionId,
    mission: projectMission(result.mission),
    ledger: projectMissionLedger(result.ledger),
    waits: result.waits.map(projectWait),
    correlationId: result.correlationId,
    runtime: projectRuntimeSnapshot(result.runtime),
  };
}

export function projectMissionEvent(event: MissionLifecycleEvent): AtlasPublicMissionEvent {
  return {
    apiVersion: event.apiVersion,
    kind: event.kind,
    metadata: {
      eventId: event.metadata.eventId,
      schemaVersion: event.metadata.schemaVersion,
      ...(event.metadata.missionId ? { missionId: event.metadata.missionId } : {}),
    },
    spec: {
      missionId: event.spec.missionId,
      scope: projectScope(event.spec.scope),
      eventType: event.spec.eventType,
      priorState: event.spec.priorState,
      resultingState: event.spec.resultingState,
      stateVersion: event.spec.stateVersion,
      actor: { type: event.spec.actor.type },
      causationId: publicCausationId(event.spec.causationId),
      correlationId: event.spec.correlationId,
      source: { kind: event.spec.source.kind },
      occurredAt: event.spec.occurredAt,
      recordedAt: event.spec.recordedAt,
      ...(event.spec.payloadRef ? { payloadRef: event.spec.payloadRef } : {}),
      ...(event.spec.payloadDigest ? { payloadDigest: event.spec.payloadDigest } : {}),
      idempotencyKey: event.spec.idempotencyKey,
    },
  };
}

function projectTrace(trace: AtlasLocalTrace): AtlasPublicTraceSummary {
  return {
    id: trace.id,
    conversation_id: trace.conversation_id,
    message_id: trace.message_id,
    status: trace.status,
    started_at: trace.started_at,
    completed_at: trace.completed_at,
    events: trace.events.map(projectTraceEvent),
  };
}

function publicCausationId(value: string): string {
  const controlMatch = value.match(/^(local\.control\.[a-z-]+)/);
  return controlMatch?.[1] ?? value;
}

export function projectReceipt(receipt: AtlasLocalReceipt): AtlasPublicReceiptSummary {
  return {
    receipt_id: receipt.receipt_id,
    kind: receipt.kind,
    trace_id: receipt.trace_id,
    conversation_id: receipt.conversation_id,
    subject_id: receipt.subject_id,
    outcome: receipt.outcome,
    created_at: receipt.created_at,
    project_hash: receipt.project_hash,
    digest: receipt.digest,
  };
}

export function projectRuntimeResult(value: Readonly<Record<string, any>>): AtlasPublicRuntimeResult {
  const result: Record<string, unknown> = {};
  for (const key of ['status', 'replayed', 'fixture_model', 'trace_id', 'next_action', 'conversation_id', 'state', 'operator_id', 'cancelled_approval_ids', 'drained_message_ids', 'advanced_ms']) {
    if (key in value) result[key] = value[key];
  }
  if (value.message) result.message = projectMessage(value.message);
  if (value.evidence) result.evidence = projectEvidence(value.evidence);
  if (value.proposal) result.proposal = projectProposal(value.proposal);
  if (value.policy) result.policy = projectPolicy(value.policy);
  if (value.approval) result.approval = projectApproval(value.approval);
  if (value.action) result.action = projectAction(value.action);
  if (value.outbox) result.outbox = projectOutbox(value.outbox);
  if (value.delivery) result.delivery = projectOutbox(value.delivery);
  if (value.trace) result.trace = projectTrace(value.trace);
  if (value.receipt) result.receipt = projectReceipt(value.receipt);
  if (value.action_receipt) result.action_receipt = projectReceipt(value.action_receipt);
  if (Array.isArray(value.receipts)) result.receipts = value.receipts.map(projectReceipt);
  return result;
}

function projectMessage(message: AtlasLocalInboundMessage): AtlasPublicMessageSummary {
  return {
    message_id: message.message_id,
    conversation_id: message.conversation_id,
    customer_id: message.customer_id,
    channel_id: message.channel_id,
    sequence: message.sequence,
    occurred_at: message.occurred_at,
    consent: message.consent,
    within_messaging_window: message.within_messaging_window,
  };
}

function projectConversation(conversation: AtlasLocalConversation): AtlasPublicConversationSummary {
  return {
    id: conversation.id,
    customer_id: conversation.customer_id,
    channel_id: conversation.channel_id,
    state: conversation.state,
    last_sequence: conversation.last_sequence,
    operator_id: conversation.operator_id,
    created_at: conversation.created_at,
    updated_at: conversation.updated_at,
  };
}

function projectEvidence(evidence: AtlasLocalEvidence): AtlasPublicEvidenceSummary {
  return { id: evidence.id, source: evidence.source, digest: evidence.digest };
}

function projectProposal(proposal: AtlasLocalProposal): AtlasPublicProposalSummary {
  return {
    id: proposal.id,
    trace_id: proposal.trace_id,
    conversation_id: proposal.conversation_id,
    message_id: proposal.message_id,
    tool_id: proposal.tool_id,
    risk: proposal.risk,
    execution: proposal.execution,
    approval: proposal.approval,
    status: proposal.status,
    created_at: proposal.created_at,
  };
}

function projectApproval(approval: AtlasLocalApproval): AtlasPublicApprovalSummary {
  return {
    id: approval.id,
    proposal_id: approval.proposal_id,
    trace_id: approval.trace_id,
    conversation_id: approval.conversation_id,
    status: approval.status,
    requested_at: approval.requested_at,
    decided_at: approval.decided_at,
    operator_id: approval.operator_id,
    action_id: approval.action_id,
  };
}

function projectPolicy(policy: AtlasLocalPolicyDecision): AtlasPublicPolicySummary {
  const allowedReasons = new Set<AtlasPublicPolicySummary['reason']>([
    'consent_required',
    'messaging_window_closed',
    'high_risk_booking_change',
    'knowledge_only_response',
  ]);
  return {
    decision: policy.decision,
    reason: allowedReasons.has(policy.reason as AtlasPublicPolicySummary['reason'])
      ? policy.reason as AtlasPublicPolicySummary['reason']
      : 'unknown',
    risk: policy.risk,
  };
}

function projectScope(scope: MissionScope): MissionScope {
  return {
    tenantId: scope.tenantId,
    organisationId: scope.organisationId,
    projectId: scope.projectId,
    environmentId: scope.environmentId,
  };
}

function projectWait(wait: MissionWaitRecord): AtlasPublicWaitSummary {
  return {
    waitId: wait.waitId,
    missionId: wait.missionId,
    scope: projectScope(wait.scope),
    kind: wait.kind,
    status: wait.status,
    updatedAt: wait.updatedAt,
  };
}

function projectStep(step: MissionStepRecord): Readonly<{
  stepId: string;
  missionId: string;
  scope: AtlasPublicScope;
  status: MissionStepRecord['status'];
  updatedAt: string;
}> {
  return {
    stepId: step.stepId,
    missionId: step.missionId,
    scope: projectScope(step.scope),
    status: step.status,
    updatedAt: step.updatedAt,
  };
}

function projectAction(action: AtlasLocalAction): AtlasPublicActionSummary {
  return {
    id: action.id,
    proposal_id: action.proposal_id,
    trace_id: action.trace_id,
    conversation_id: action.conversation_id,
    tool_id: action.tool_id,
    idempotency_key: action.idempotency_key,
    input_digest: action.input_digest,
    result: projectBusinessOutcome(action.result),
    committed_at: action.committed_at,
  };
}

function projectOutbox(outbox: AtlasLocalOutboxMessage): AtlasPublicOutboxSummary {
  return {
    id: outbox.id,
    trace_id: outbox.trace_id,
    conversation_id: outbox.conversation_id,
    customer_id: outbox.customer_id,
    channel_id: outbox.channel_id,
    state: outbox.state,
    attempts: outbox.attempts,
    next_attempt_at: outbox.next_attempt_at,
    retry_after_ms: outbox.retry_after_ms,
    provider_message_id: outbox.provider_message_id,
    provider_code: outbox.provider_code,
    ...(outbox.provider_occurred_at ? { provider_occurred_at: outbox.provider_occurred_at } : {}),
    created_at: outbox.created_at,
    updated_at: outbox.updated_at,
  };
}

function projectTraceEvent(event: AtlasLocalTraceEvent): AtlasPublicTraceEventSummary {
  return { id: event.id, type: event.type, at: event.at };
}

function projectReceiptLink(link: MissionReceiptLink): AtlasPublicReceiptLinkSummary {
  return {
    linkId: link.linkId,
    missionId: link.missionId,
    scope: projectScope(link.scope),
    receiptId: link.receiptId,
    ...(link.actionId ? { actionId: link.actionId } : {}),
    createdAt: link.createdAt,
  };
}

function projectBusinessOutcome(value: Readonly<Record<string, unknown>>): AtlasPublicBusinessOutcome {
  const allowed = ['booking_id', 'previous_date', 'scheduled_for', 'status', 'state', 'outcome'];
  return Object.fromEntries(allowed.filter((key) => key in value).map((key) => [key, scalar(value[key])]));
}

function projectDecision(value: Readonly<Record<string, any>>): AtlasPublicDecisionSummary {
  const issuer = value.spec?.issuer;
  return {
    id: String(value.metadata?.id ?? ''),
    missionId: String(value.metadata?.missionId ?? ''),
    proposalId: String(value.spec?.proposalId ?? ''),
    actionClass: String(value.spec?.actionClass ?? ''),
    riskClass: String(value.spec?.riskClass ?? ''),
    autonomyLevel: String(value.spec?.autonomyLevel ?? ''),
    policyVersion: String(value.spec?.policyVersion ?? ''),
    disposition: String(value.spec?.disposition ?? ''),
    reasonCodes: Array.isArray(value.spec?.reasonCodes)
      ? value.spec.reasonCodes.filter((item: unknown): item is string => typeof item === 'string')
      : [],
    issuerType: typeof issuer?.type === 'string' ? issuer.type : '',
    decidedAt: String(value.spec?.decidedAt ?? ''),
  };
}

function projectPersistedAction(value: Readonly<Record<string, any>>): AtlasPublicPersistedActionSummary {
  return {
    id: String(value.metadata?.id ?? ''),
    missionId: String(value.metadata?.missionId ?? ''),
    proposalId: String(value.spec?.proposalId ?? ''),
    decisionId: String(value.spec?.decisionId ?? ''),
    stepId: String(value.spec?.stepId ?? ''),
    actionType: String(value.spec?.actionType ?? ''),
    effect: String(value.spec?.effect ?? ''),
    idempotencyKey: String(value.spec?.idempotencyKey ?? ''),
    status: String(value.spec?.status ?? ''),
    policyVersion: String(value.spec?.policyVersion ?? ''),
    createdAt: String(value.spec?.createdAt ?? ''),
  };
}

function projectPersistedReceipt(value: Readonly<Record<string, any>>): AtlasPublicPersistedReceiptSummary {
  const integrity = value.spec?.integrity;
  return {
    id: String(value.metadata?.id ?? ''),
    missionId: String(value.metadata?.missionId ?? ''),
    receiptType: String(value.spec?.receiptType ?? ''),
    status: String(value.spec?.status ?? ''),
    provider: String(value.spec?.provider ?? ''),
    providerReference: String(value.spec?.providerReference ?? ''),
    occurredAt: String(value.spec?.occurredAt ?? ''),
    recordedAt: String(value.spec?.recordedAt ?? ''),
    integrity: {
      digest: String(integrity?.digest ?? ''),
      issuer: String(integrity?.issuer ?? ''),
    },
  };
}

function mapValues<T, U>(value: Readonly<Record<string, T>>, mapper: (item: T) => U): Readonly<Record<string, U>> {
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, mapper(item)]));
}

function scalar(value: unknown): string | number | boolean | null {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null ? value : null;
}
