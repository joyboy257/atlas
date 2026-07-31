import { sha256 } from './fs-safety.js';
import type { AgentPackage, AgentVersionId } from './agent-package.js';

export const MISSION_API_VERSION = 'atlas.mirai.dev/v1' as const;
export const MISSION_KIND = 'Mission' as const;
export const MISSION_EVENT_KIND = 'MissionLifecycleEvent' as const;
export const MISSION_SCHEMA_FILE = 'schema/atlas-mission.v1.schema.json' as const;
export const MISSION_EVENT_SCHEMA_FILE = 'schema/atlas-mission-lifecycle-event.v1.schema.json' as const;
export const MISSION_SCHEMA_VERSION = '1' as const;

export type MissionState =
  | 'CREATED'
  | 'READY'
  | 'ACTIVE'
  | 'WAITING_EVENT'
  | 'WAITING_SCHEDULE'
  | 'WAITING_APPROVAL'
  | 'HANDED_OFF'
  | 'PAUSED'
  | 'COMPLETING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED';

export type MissionLifecycleEventType =
  | 'CREATED'
  | 'READY'
  | 'ACTIVATED'
  | 'WAITING_EVENT'
  | 'WAITING_SCHEDULE'
  | 'WAITING_APPROVAL'
  | 'HANDED_OFF'
  | 'RESUMED'
  | 'PAUSED'
  | 'COMPLETING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED';

export type MissionScope = Readonly<{
  tenantId: string;
  organisationId: string;
  projectId: string;
  environmentId: string;
}>;

export type MissionRuntimeBinding = Readonly<{
  mode: string;
  adapter?: string;
  configurationRef?: string;
}>;

export type MissionAgentBinding = Readonly<{
  agentId: string;
  agentVersionId: string;
  deploymentId: string;
  runtime: MissionRuntimeBinding;
}>;

export type MissionSubject = Readonly<{
  subjectId: string;
  kind: string;
  displayName?: string;
  canonicalRef?: string;
}>;

export type MissionConversationBinding = Readonly<{
  conversationId: string;
  channel: string;
  providerConversationId?: string;
  threadId?: string;
}>;

export type MissionConstraints = Readonly<{
  allowedTools?: readonly string[];
  allowedChannels?: readonly string[];
  maxSteps?: number;
  stopConditions?: readonly string[];
  requiredApprovalFor?: readonly string[];
}>;

export type MissionRiskPosture = Readonly<{
  policyRef: string;
  riskClass: 'low' | 'medium' | 'high' | 'critical';
  autonomyLevel: 'L0' | 'L1' | 'L2' | 'L3' | 'L4';
  approvalRequired?: boolean;
  handoffAllowed?: boolean;
}>;

export type MissionBudget = Readonly<{
  maxTokens?: number;
  maxSteps?: number;
  maxCost?: number;
  currency?: string;
  reservedCost?: number;
}>;

export type MissionCorrelation = Readonly<{
  correlationId: string;
  causationId?: string;
  traceId?: string;
  parentSpanId?: string;
}>;

export type MissionProvenance = Readonly<{
  source: 'developer' | 'api' | 'channel' | 'schedule' | 'provider-callback' | 'operator' | 'system';
  inputDigest: string;
  knowledgeRefs?: readonly string[];
  memoryRefs?: readonly string[];
}>;

export type MissionActiveWait = Readonly<{
  kind: 'event' | 'schedule' | 'approval' | 'handoff';
  waitId: string;
  expiresAt?: string;
  requiredActor?: string;
}>;

export type MissionTimestamps = Readonly<{
  createdAt: string;
  activatedAt?: string;
  updatedAt: string;
  terminalAt?: string;
}>;

export type MissionMetadata = Readonly<{
  missionId: string;
  schemaVersion: typeof MISSION_SCHEMA_VERSION;
  parentMissionId?: string;
  labels?: Readonly<Record<string, string>>;
}>;

export type MissionSpec = Readonly<{
  scope: MissionScope;
  agent: MissionAgentBinding;
  missionType: string;
  goal: string;
  successCriteria: string;
  failureCriteria?: string;
  subject?: MissionSubject;
  conversation?: MissionConversationBinding;
  constraints?: MissionConstraints;
  risk?: MissionRiskPosture;
  budget?: MissionBudget;
  deadline?: string;
  state: MissionState;
  stateVersion: number;
  activeWait?: MissionActiveWait;
  correlation: MissionCorrelation;
  provenance: MissionProvenance;
  timestamps: MissionTimestamps;
}>;

export type Mission = Readonly<{
  apiVersion: typeof MISSION_API_VERSION;
  kind: typeof MISSION_KIND;
  metadata: MissionMetadata;
  spec: MissionSpec;
}>;

export type MissionActor = Readonly<{
  type: 'system' | 'developer' | 'agent' | 'operator' | 'provider' | 'scheduler' | 'external-runtime';
  identity: string;
}>;

export type MissionEventSource = Readonly<{
  kind: 'command' | 'observation' | 'provider-callback' | 'tool-result' | 'schedule' | 'human-control' | 'system';
  ref: string;
}>;

export type MissionLifecycleEventMetadata = Readonly<{
  eventId: string;
  schemaVersion: typeof MISSION_SCHEMA_VERSION;
  missionId?: string;
}>;

export type MissionLifecycleEventSpec = Readonly<{
  missionId: string;
  scope: MissionScope;
  eventType: MissionLifecycleEventType;
  priorState: MissionState | null;
  resultingState: MissionState;
  stateVersion: number;
  actor: MissionActor;
  causationId: string;
  correlationId: string;
  source: MissionEventSource;
  occurredAt: string;
  recordedAt: string;
  payloadRef?: string;
  payloadDigest?: string;
  idempotencyKey: string;
}>;

export type MissionLifecycleEvent = Readonly<{
  apiVersion: typeof MISSION_API_VERSION;
  kind: typeof MISSION_EVENT_KIND;
  metadata: MissionLifecycleEventMetadata;
  spec: MissionLifecycleEventSpec;
}>;

export type MissionCreationInput = Readonly<{
  missionId: string;
  parentMissionId?: string;
  labels?: Readonly<Record<string, string>>;
  agent: MissionAgentBinding;
  missionType: string;
  goal: string;
  successCriteria: string;
  failureCriteria?: string;
  subject?: MissionSubject;
  conversation?: MissionConversationBinding;
  constraints?: MissionConstraints;
  risk?: MissionRiskPosture;
  budget?: MissionBudget;
  deadline?: string;
  correlation: MissionCorrelation;
  provenance: MissionProvenance;
}>;

export type MissionEventInput = Readonly<{
  eventId: string;
  resultingState: MissionState;
  actor: MissionActor;
  causationId: string;
  correlationId: string;
  source: MissionEventSource;
  occurredAt?: string;
  recordedAt?: string;
  payloadRef?: string;
  payloadDigest?: string;
  idempotencyKey: string;
}>;

export type MissionDiagnosticCode =
  | 'INVALID_TYPE'
  | 'INVALID_VALUE'
  | 'REQUIRED_FIELD'
  | 'UNKNOWN_FIELD'
  | 'UNSUPPORTED_VERSION'
  | 'UNSAFE_AUTHORITY_OVERRIDE'
  | 'SCOPE_MISMATCH'
  | 'AGENT_VERSION_MISMATCH'
  | 'ILLEGAL_TRANSITION'
  | 'DUPLICATE_EVENT'
  | 'IDEMPOTENCY_CONFLICT'
  | 'TIMESTAMP_ORDER'
  | 'TERMINAL_STATE_MUTATION';

export type MissionDiagnostic = Readonly<{
  code: MissionDiagnosticCode;
  path: string;
  message: string;
  next_action: string;
}>;

export type MissionValidationResult<T> = Readonly<{
  valid: boolean;
  diagnostics: readonly MissionDiagnostic[];
  value?: T;
}>;

export type MissionCreationResult = Readonly<{
  valid: boolean;
  diagnostics: readonly MissionDiagnostic[];
  mission?: Mission;
  initialEvent?: MissionLifecycleEvent;
}>;

export type MissionEventResult = Readonly<{
  valid: boolean;
  diagnostics: readonly MissionDiagnostic[];
  event?: MissionLifecycleEvent;
}>;

export type MissionLifecycleLedger = Readonly<{
  mission: Mission;
  events: readonly MissionLifecycleEvent[];
}>;

export type MissionAppendResult = Readonly<{
  status: 'APPENDED' | 'DUPLICATE_REPLAY' | 'REJECTED';
  diagnostics: readonly MissionDiagnostic[];
  ledger: MissionLifecycleLedger;
}>;

const ALL_STATES = new Set<MissionState>([
  'CREATED', 'READY', 'ACTIVE', 'WAITING_EVENT', 'WAITING_SCHEDULE',
  'WAITING_APPROVAL', 'HANDED_OFF', 'PAUSED', 'COMPLETING', 'COMPLETED',
  'FAILED', 'CANCELLED', 'EXPIRED',
]);
const TERMINAL_STATES = new Set<MissionState>(['COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED']);
const EVENT_TYPES = new Set<MissionLifecycleEventType>([
  'CREATED', 'READY', 'ACTIVATED', 'WAITING_EVENT', 'WAITING_SCHEDULE',
  'WAITING_APPROVAL', 'HANDED_OFF', 'RESUMED', 'PAUSED', 'COMPLETING',
  'COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED',
]);

const LEGAL_TRANSITIONS: Readonly<Record<MissionState, readonly MissionState[]>> = {
  CREATED: ['READY', 'HANDED_OFF', 'CANCELLED', 'EXPIRED'],
  READY: ['ACTIVE', 'HANDED_OFF', 'CANCELLED', 'EXPIRED'],
  ACTIVE: ['WAITING_EVENT', 'WAITING_SCHEDULE', 'WAITING_APPROVAL', 'HANDED_OFF', 'PAUSED', 'COMPLETING', 'COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED'],
  WAITING_EVENT: ['ACTIVE', 'HANDED_OFF', 'PAUSED', 'CANCELLED', 'EXPIRED'],
  WAITING_SCHEDULE: ['ACTIVE', 'HANDED_OFF', 'PAUSED', 'CANCELLED', 'EXPIRED'],
  WAITING_APPROVAL: ['ACTIVE', 'HANDED_OFF', 'PAUSED', 'CANCELLED', 'EXPIRED'],
  HANDED_OFF: ['ACTIVE', 'COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED'],
  PAUSED: ['ACTIVE', 'HANDED_OFF', 'CANCELLED', 'EXPIRED'],
  COMPLETING: ['HANDED_OFF', 'COMPLETED', 'FAILED'],
  COMPLETED: [],
  FAILED: [],
  CANCELLED: [],
  EXPIRED: [],
};

const MISSION_FIELDS = new Set(['apiVersion', 'kind', 'metadata', 'spec']);
const MISSION_METADATA_FIELDS = new Set(['missionId', 'schemaVersion', 'parentMissionId', 'labels']);
const MISSION_SPEC_FIELDS = new Set([
  'scope', 'agent', 'missionType', 'goal', 'successCriteria', 'failureCriteria', 'subject',
  'conversation', 'constraints', 'risk', 'budget', 'deadline', 'state', 'stateVersion',
  'activeWait', 'correlation', 'provenance', 'timestamps',
]);
const EVENT_FIELDS = new Set(['apiVersion', 'kind', 'metadata', 'spec']);
const EVENT_METADATA_FIELDS = new Set(['eventId', 'schemaVersion', 'missionId']);
const EVENT_SPEC_FIELDS = new Set([
  'missionId', 'scope', 'eventType', 'priorState', 'resultingState', 'stateVersion', 'actor',
  'causationId', 'correlationId', 'source', 'occurredAt', 'recordedAt', 'payloadRef',
  'payloadDigest', 'idempotencyKey',
]);
const FORBIDDEN_CREATION_FIELDS = new Set(['scope', 'state', 'stateVersion', 'activeWait', 'timestamps']);
const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/;
const ID_PATTERN = /^[^ ]+$/;
const SLUG_PATTERN = /^[a-z0-9][a-z0-9_.:-]{0,127}$/;
const AUTHORITY_REF_PATTERN = /^(atlas|https?):\/\/[^\s]+$/;

export function legalMissionTransitions(state: MissionState): readonly MissionState[] {
  return LEGAL_TRANSITIONS[state] ?? [];
}

export function isTerminalMissionState(state: MissionState): boolean {
  return TERMINAL_STATES.has(state);
}

export function canTransitionMission(from: MissionState, to: MissionState): boolean {
  return legalMissionTransitions(from).includes(to);
}

export function createMission(input: unknown, serverScope: unknown, now = new Date().toISOString()): MissionCreationResult {
  const diagnostics: MissionDiagnostic[] = [];
  if (!isRecord(input)) {
    addDiagnostic(diagnostics, 'INVALID_TYPE', '$', 'Mission creation input must be an object', 'Provide a Mission creation object');
    return { valid: false, diagnostics };
  }
  if (!isRecord(serverScope)) {
    addDiagnostic(diagnostics, 'INVALID_TYPE', '$.serverScope', 'Server-derived Mission scope is required', 'Resolve tenant, organisation, project, and environment on the server');
    return { valid: false, diagnostics };
  }
  for (const key of Object.keys(input)) {
    if (FORBIDDEN_CREATION_FIELDS.has(key)) {
      addDiagnostic(diagnostics, 'UNSAFE_AUTHORITY_OVERRIDE', `$.${key}`, `${key} is server-owned and cannot be selected by a caller`, 'Remove the server-owned field; Atlas derives it');
    }
  }
  validateScope(serverScope, '$.serverScope', diagnostics);
  validateMissionCreationInput(input, diagnostics);
  if (!isValidTimestamp(now)) addDiagnostic(diagnostics, 'INVALID_VALUE', '$.now', 'now must be an ISO-8601 timestamp', 'Provide a valid UTC timestamp');
  if (typeof input.deadline === 'string' && isValidTimestamp(now) && Date.parse(input.deadline) <= Date.parse(now)) addDiagnostic(diagnostics, 'TIMESTAMP_ORDER', '$.deadline', 'deadline must be after createdAt', 'Set a future deadline');
  if (diagnostics.length > 0) return { valid: false, diagnostics };

  const scope = cloneJson(serverScope) as MissionScope;
  const createdAt = now;
  const mission: Mission = deepFreeze({
    apiVersion: MISSION_API_VERSION,
    kind: MISSION_KIND,
    metadata: {
      missionId: input.missionId,
      schemaVersion: MISSION_SCHEMA_VERSION,
      ...(input.parentMissionId === undefined ? {} : { parentMissionId: input.parentMissionId }),
      ...(input.labels === undefined ? {} : { labels: cloneJson(input.labels) }),
    },
    spec: {
      scope,
      agent: cloneJson(input.agent),
      missionType: input.missionType,
      goal: input.goal,
      successCriteria: input.successCriteria,
      ...(input.failureCriteria === undefined ? {} : { failureCriteria: input.failureCriteria }),
      ...(input.subject === undefined ? {} : { subject: cloneJson(input.subject) }),
      ...(input.conversation === undefined ? {} : { conversation: cloneJson(input.conversation) }),
      ...(input.constraints === undefined ? {} : { constraints: cloneJson(input.constraints) }),
      ...(input.risk === undefined ? {} : { risk: cloneJson(input.risk) }),
      ...(input.budget === undefined ? {} : { budget: cloneJson(input.budget) }),
      ...(input.deadline === undefined ? {} : { deadline: input.deadline }),
      state: 'CREATED',
      stateVersion: 1,
      correlation: cloneJson(input.correlation),
      provenance: cloneJson(input.provenance),
      timestamps: { createdAt, updatedAt: createdAt },
    },
  });
  const initialEvent = createInitialMissionEvent(mission);
  return { valid: true, diagnostics: [], mission, initialEvent };
}

export function validateMission(value: unknown): MissionValidationResult<Mission> {
  const diagnostics: MissionDiagnostic[] = [];
  if (!isRecord(value)) {
    addDiagnostic(diagnostics, 'INVALID_TYPE', '$', 'Mission must be an object', 'Provide a Mission contract object');
    return { valid: false, diagnostics };
  }
  checkUnknownFields(value, MISSION_FIELDS, '$', diagnostics);
  if (value.apiVersion !== MISSION_API_VERSION) addDiagnostic(diagnostics, 'UNSUPPORTED_VERSION', '$.apiVersion', `apiVersion must be ${MISSION_API_VERSION}`, 'Use the supported Mission schema version');
  if (value.kind !== MISSION_KIND) addDiagnostic(diagnostics, 'INVALID_VALUE', '$.kind', `kind must be ${MISSION_KIND}`, 'Set kind to Mission');
  validateMissionMetadata(value.metadata, diagnostics);
  if (!isRecord(value.spec)) addDiagnostic(diagnostics, 'REQUIRED_FIELD', '$.spec', 'Mission spec is required', 'Add the Mission spec');
  else validateMissionSpec(value.spec, diagnostics);
  if (diagnostics.length > 0) return { valid: false, diagnostics };
  return { valid: true, diagnostics: [], value: deepFreeze(cloneJson(value) as Mission) };
}

export function defineMission(value: unknown): Mission {
  const result = validateMission(value);
  if (!result.valid || !result.value) throw new Error(result.diagnostics.map((diagnostic) => diagnostic.message).join('; '));
  return result.value;
}

export function createMissionLifecycleEvent(mission: Mission, input: unknown, now = new Date().toISOString()): MissionEventResult {
  const diagnostics: MissionDiagnostic[] = [];
  const missionResult = validateMission(mission);
  if (!missionResult.valid || !missionResult.value) return { valid: false, diagnostics: missionResult.diagnostics };
  if (!isRecord(input)) {
    addDiagnostic(diagnostics, 'INVALID_TYPE', '$', 'Lifecycle event input must be an object', 'Provide a lifecycle event command');
    return { valid: false, diagnostics };
  }
  validateMissionEventInput(input, diagnostics);
  if (!isValidTimestamp(now)) addDiagnostic(diagnostics, 'INVALID_VALUE', '$.now', 'now must be an ISO-8601 timestamp', 'Provide a valid UTC timestamp');
  const nextState = input.resultingState;
  if (typeof nextState === 'string' && isMissionState(nextState)) {
    if (!canTransitionMission(mission.spec.state, nextState)) {
      addDiagnostic(diagnostics, 'ILLEGAL_TRANSITION', '$.resultingState', `Mission cannot transition from ${mission.spec.state} to ${nextState}`, 'Choose a legal next state or issue a control command that creates one');
    }
  }
  if (diagnostics.length > 0) return { valid: false, diagnostics };
  const event: MissionLifecycleEvent = deepFreeze({
    apiVersion: MISSION_API_VERSION,
    kind: MISSION_EVENT_KIND,
    metadata: { eventId: input.eventId, schemaVersion: MISSION_SCHEMA_VERSION, missionId: mission.metadata.missionId },
    spec: {
      missionId: mission.metadata.missionId,
      scope: cloneJson(mission.spec.scope),
      eventType: eventTypeForTransition(mission.spec.state, input.resultingState),
      priorState: mission.spec.state,
      resultingState: input.resultingState,
      stateVersion: mission.spec.stateVersion + 1,
      actor: cloneJson(input.actor),
      causationId: input.causationId,
      correlationId: input.correlationId,
      source: cloneJson(input.source),
      occurredAt: input.occurredAt ?? now,
      recordedAt: input.recordedAt ?? now,
      ...(input.payloadRef === undefined ? {} : { payloadRef: input.payloadRef }),
      ...(input.payloadDigest === undefined ? {} : { payloadDigest: input.payloadDigest }),
      idempotencyKey: input.idempotencyKey,
    },
  });
  const eventValidation = validateMissionLifecycleEvent(event, mission);
  return eventValidation.valid ? { valid: true, diagnostics: [], event } : eventValidation;
}

export function validateMissionLifecycleEvent(value: unknown, currentMission?: Mission): MissionEventResult {
  const diagnostics: MissionDiagnostic[] = [];
  if (!isRecord(value)) {
    addDiagnostic(diagnostics, 'INVALID_TYPE', '$', 'Mission lifecycle event must be an object', 'Provide a lifecycle event contract');
    return { valid: false, diagnostics };
  }
  checkUnknownFields(value, EVENT_FIELDS, '$', diagnostics);
  if (value.apiVersion !== MISSION_API_VERSION) addDiagnostic(diagnostics, 'UNSUPPORTED_VERSION', '$.apiVersion', `apiVersion must be ${MISSION_API_VERSION}`, 'Use the supported lifecycle event schema version');
  if (value.kind !== MISSION_EVENT_KIND) addDiagnostic(diagnostics, 'INVALID_VALUE', '$.kind', `kind must be ${MISSION_EVENT_KIND}`, 'Set kind to MissionLifecycleEvent');
  validateEventMetadata(value.metadata, diagnostics);
  if (!isRecord(value.spec)) addDiagnostic(diagnostics, 'REQUIRED_FIELD', '$.spec', 'Lifecycle event spec is required', 'Add the lifecycle event spec');
  else validateEventSpec(value.spec, diagnostics);
  if (currentMission) {
    if (isRecord(value.spec)) {
      if (value.spec.missionId !== currentMission.metadata.missionId) addDiagnostic(diagnostics, 'SCOPE_MISMATCH', '$.spec.missionId', 'Lifecycle event does not belong to the current Mission', 'Use the current Mission ID');
      if (!sameScope(value.spec.scope, currentMission.spec.scope)) addDiagnostic(diagnostics, 'SCOPE_MISMATCH', '$.spec.scope', 'Lifecycle event scope does not match the current Mission scope', 'Use server-derived scope from the current Mission');
      if (value.spec.priorState !== currentMission.spec.state) addDiagnostic(diagnostics, 'ILLEGAL_TRANSITION', '$.spec.priorState', `Event priorState must be ${currentMission.spec.state}`, 'Build the event from the latest Mission state');
      if (value.spec.stateVersion !== currentMission.spec.stateVersion + 1) addDiagnostic(diagnostics, 'ILLEGAL_TRANSITION', '$.spec.stateVersion', `Event stateVersion must be ${currentMission.spec.stateVersion + 1}`, 'Refresh the Mission and retry with a new event');
      if (isMissionState(value.spec.resultingState) && !canTransitionMission(currentMission.spec.state, value.spec.resultingState)) addDiagnostic(diagnostics, 'ILLEGAL_TRANSITION', '$.spec.resultingState', `Mission cannot transition from ${currentMission.spec.state} to ${value.spec.resultingState}`, 'Choose a legal next state');
    }
  }
  if (diagnostics.length > 0) return { valid: false, diagnostics };
  return { valid: true, diagnostics: [], event: deepFreeze(cloneJson(value) as MissionLifecycleEvent) };
}

export function createMissionLifecycleLedger(mission: Mission, initialEvent?: MissionLifecycleEvent): MissionLifecycleLedger {
  const validation = validateMission(mission);
  if (!validation.valid || !validation.value) throw new Error('Cannot create a lifecycle ledger from an invalid Mission');
  const events = initialEvent ? [deepFreeze(cloneJson(initialEvent) as MissionLifecycleEvent)] : [];
  return deepFreeze({ mission: validation.value, events });
}

export function appendMissionLifecycleEvent(ledger: MissionLifecycleLedger, event: MissionLifecycleEvent): MissionAppendResult {
  const current = validateMission(ledger.mission);
  if (!current.valid || !current.value) return { status: 'REJECTED', diagnostics: current.diagnostics, ledger };
  const existingById = ledger.events.find((candidate) => candidate.metadata.eventId === event.metadata.eventId);
  if (existingById) {
    if (stableJson(existingById) === stableJson(event)) return { status: 'DUPLICATE_REPLAY', diagnostics: [], ledger };
    return { status: 'REJECTED', diagnostics: [diagnostic('IDEMPOTENCY_CONFLICT', '$.metadata.eventId', 'eventId was already used for a different event', 'Generate a new event ID')], ledger };
  }
  const existingByKey = ledger.events.find((candidate) => candidate.spec.idempotencyKey === event.spec.idempotencyKey);
  if (existingByKey) {
    if (stableJson(existingByKey) === stableJson(event)) return { status: 'DUPLICATE_REPLAY', diagnostics: [], ledger };
    return { status: 'REJECTED', diagnostics: [diagnostic('IDEMPOTENCY_CONFLICT', '$.spec.idempotencyKey', 'idempotencyKey was already used for a different event', 'Generate a new idempotency key')], ledger };
  }
  const eventValidation = validateMissionLifecycleEvent(event, ledger.mission);
  if (!eventValidation.valid || !eventValidation.event) {
    return { status: 'REJECTED', diagnostics: eventValidation.diagnostics, ledger };
  }
  const nextMission = missionAfterEvent(current.value, event);
  const nextLedger = deepFreeze({ mission: nextMission, events: [...ledger.events, deepFreeze(cloneJson(event) as MissionLifecycleEvent)] });
  return { status: 'APPENDED', diagnostics: [], ledger: nextLedger };
}

export function assertMissionAgentCompatibility(mission: Mission, pkg: AgentPackage, version: AgentVersionId | string): MissionValidationResult<Mission> {
  const expected = typeof version === 'string' ? version : version.agent_version_id;
  if (mission.spec.agent.agentVersionId !== expected) {
    return { valid: false, diagnostics: [diagnostic('AGENT_VERSION_MISMATCH', '$.spec.agent.agentVersionId', 'Mission is bound to a different immutable Agent version', 'Deploy or select the Agent version recorded by the Mission')] };
  }
  if (pkg.metadata.name !== mission.spec.agent.agentId) {
    return { valid: false, diagnostics: [diagnostic('AGENT_VERSION_MISMATCH', '$.spec.agent.agentId', 'Mission agentId does not match the AgentPackage name', 'Use the AgentPackage that owns this Mission')] };
  }
  return { valid: true, diagnostics: [], value: mission };
}

function createInitialMissionEvent(mission: Mission): MissionLifecycleEvent {
  return deepFreeze({
    apiVersion: MISSION_API_VERSION,
    kind: MISSION_EVENT_KIND,
    metadata: { eventId: `mission-created:${mission.metadata.missionId}`, schemaVersion: MISSION_SCHEMA_VERSION, missionId: mission.metadata.missionId },
    spec: {
      missionId: mission.metadata.missionId,
      scope: cloneJson(mission.spec.scope),
      eventType: 'CREATED',
      priorState: null,
      resultingState: 'CREATED',
      stateVersion: 1,
      actor: { type: 'system', identity: 'atlas' },
      causationId: mission.spec.correlation.causationId ?? mission.spec.correlation.correlationId,
      correlationId: mission.spec.correlation.correlationId,
      source: { kind: 'command', ref: mission.spec.provenance.inputDigest },
      occurredAt: mission.spec.timestamps.createdAt,
      recordedAt: mission.spec.timestamps.createdAt,
      idempotencyKey: `mission-created:${mission.metadata.missionId}`,
    },
  });
}

function missionAfterEvent(mission: Mission, event: MissionLifecycleEvent): Mission {
  const terminal = isTerminalMissionState(event.spec.resultingState);
  const currentTime = event.spec.recordedAt;
  return deepFreeze({
    ...mission,
    spec: {
      ...mission.spec,
      state: event.spec.resultingState,
      stateVersion: event.spec.stateVersion,
      ...(terminal ? { activeWait: undefined } : {}),
      timestamps: {
        ...mission.spec.timestamps,
        ...(event.spec.resultingState === 'ACTIVE' && mission.spec.timestamps.activatedAt === undefined ? { activatedAt: event.spec.recordedAt } : {}),
        updatedAt: currentTime,
        ...(terminal ? { terminalAt: currentTime } : {}),
      },
    },
  });
}

function validateMissionCreationInput(value: Record<string, unknown>, diagnostics: MissionDiagnostic[]): void {
  const required = ['missionId', 'agent', 'missionType', 'goal', 'successCriteria', 'correlation', 'provenance'];
  for (const key of required) if (value[key] === undefined) addDiagnostic(diagnostics, 'REQUIRED_FIELD', `$.${key}`, `${key} is required`, `Provide ${key}`);
  validateIdentifier(value.missionId, '$.missionId', diagnostics);
  if (value.parentMissionId !== undefined) validateIdentifier(value.parentMissionId, '$.parentMissionId', diagnostics);
  if (value.missionType !== undefined && (typeof value.missionType !== 'string' || !SLUG_PATTERN.test(value.missionType))) addDiagnostic(diagnostics, 'INVALID_VALUE', '$.missionType', 'missionType must be a lowercase slug', 'Use a mission type declared by the AgentPackage');
  if (typeof value.goal !== 'string' || !value.goal.trim() || value.goal.length > 10000) addDiagnostic(diagnostics, 'INVALID_VALUE', '$.goal', 'goal must be a non-empty string up to 10000 characters', 'Provide a bounded business goal');
  if (typeof value.successCriteria !== 'string' || !value.successCriteria.trim() || value.successCriteria.length > 5000) addDiagnostic(diagnostics, 'INVALID_VALUE', '$.successCriteria', 'successCriteria must be a non-empty string up to 5000 characters', 'Define observable success criteria');
  if (value.failureCriteria !== undefined && (typeof value.failureCriteria !== 'string' || value.failureCriteria.length > 5000)) addDiagnostic(diagnostics, 'INVALID_VALUE', '$.failureCriteria', 'failureCriteria must be a string up to 5000 characters', 'Shorten or remove failureCriteria');
  validateAgentBinding(value.agent, '$.agent', diagnostics);
  if (value.subject !== undefined) validateSubject(value.subject, '$.subject', diagnostics);
  if (value.conversation !== undefined) validateConversation(value.conversation, '$.conversation', diagnostics);
  if (value.constraints !== undefined) validateConstraints(value.constraints, '$.constraints', diagnostics);
  if (value.risk !== undefined) validateRisk(value.risk, '$.risk', diagnostics);
  if (value.budget !== undefined) validateBudget(value.budget, '$.budget', diagnostics);
  if (value.deadline !== undefined) validateTimestamp(value.deadline, '$.deadline', diagnostics);
  validateCorrelation(value.correlation, '$.correlation', diagnostics);
  validateProvenance(value.provenance, '$.provenance', diagnostics);
}

function validateMissionMetadata(value: unknown, diagnostics: MissionDiagnostic[]): void {
  if (!isRecord(value)) {
    addDiagnostic(diagnostics, 'REQUIRED_FIELD', '$.metadata', 'Mission metadata is required', 'Add missionId and schemaVersion');
    return;
  }
  checkUnknownFields(value, MISSION_METADATA_FIELDS, '$.metadata', diagnostics);
  validateIdentifier(value.missionId, '$.metadata.missionId', diagnostics);
  if (value.schemaVersion !== MISSION_SCHEMA_VERSION) addDiagnostic(diagnostics, 'UNSUPPORTED_VERSION', '$.metadata.schemaVersion', 'Mission schemaVersion must be 1', 'Use schemaVersion 1');
  if (value.parentMissionId !== undefined) validateIdentifier(value.parentMissionId, '$.metadata.parentMissionId', diagnostics);
  validateLabels(value.labels, '$.metadata.labels', diagnostics);
}

function validateMissionSpec(value: Record<string, unknown>, diagnostics: MissionDiagnostic[]): void {
  checkUnknownFields(value, MISSION_SPEC_FIELDS, '$.spec', diagnostics);
  validateScope(value.scope, '$.spec.scope', diagnostics);
  validateAgentBinding(value.agent, '$.spec.agent', diagnostics);
  if (typeof value.missionType !== 'string' || !SLUG_PATTERN.test(value.missionType)) addDiagnostic(diagnostics, 'INVALID_VALUE', '$.spec.missionType', 'missionType must be a lowercase slug', 'Use a declared mission type');
  if (typeof value.goal !== 'string' || !value.goal.trim()) addDiagnostic(diagnostics, 'REQUIRED_FIELD', '$.spec.goal', 'goal is required', 'Define the Mission goal');
  if (typeof value.successCriteria !== 'string' || !value.successCriteria.trim()) addDiagnostic(diagnostics, 'REQUIRED_FIELD', '$.spec.successCriteria', 'successCriteria is required', 'Define the Mission success criteria');
  if (value.failureCriteria !== undefined && typeof value.failureCriteria !== 'string') addDiagnostic(diagnostics, 'INVALID_TYPE', '$.spec.failureCriteria', 'failureCriteria must be a string', 'Use a string failure definition');
  if (value.subject !== undefined) validateSubject(value.subject, '$.spec.subject', diagnostics);
  if (value.conversation !== undefined) validateConversation(value.conversation, '$.spec.conversation', diagnostics);
  if (value.constraints !== undefined) validateConstraints(value.constraints, '$.spec.constraints', diagnostics);
  if (value.risk !== undefined) validateRisk(value.risk, '$.spec.risk', diagnostics);
  if (value.budget !== undefined) validateBudget(value.budget, '$.spec.budget', diagnostics);
  if (!isMissionState(value.state)) addDiagnostic(diagnostics, 'INVALID_VALUE', '$.spec.state', 'state must be a canonical Mission state', 'Use a canonical Mission state');
  if (!Number.isInteger(value.stateVersion) || (value.stateVersion as number) < 1) addDiagnostic(diagnostics, 'INVALID_VALUE', '$.spec.stateVersion', 'stateVersion must be a positive integer', 'Increment stateVersion only through lifecycle events');
  if (value.activeWait !== undefined) validateActiveWait(value.activeWait, '$.spec.activeWait', diagnostics);
  validateCorrelation(value.correlation, '$.spec.correlation', diagnostics);
  validateProvenance(value.provenance, '$.spec.provenance', diagnostics);
  validateTimestamps(value.timestamps, '$.spec.timestamps', value.state as MissionState, diagnostics);
  if (value.deadline !== undefined) validateTimestamp(value.deadline, '$.spec.deadline', diagnostics);
  if (isRecord(value.timestamps) && typeof value.deadline === 'string' && typeof value.timestamps.createdAt === 'string' && Date.parse(value.deadline) <= Date.parse(value.timestamps.createdAt)) addDiagnostic(diagnostics, 'TIMESTAMP_ORDER', '$.spec.deadline', 'deadline must be after createdAt', 'Set a future deadline');
  if (isTerminalMissionState(value.state as MissionState) && !isRecord(value.timestamps)) addDiagnostic(diagnostics, 'TERMINAL_STATE_MUTATION', '$.spec.timestamps', 'Terminal Missions require terminalAt', 'Record terminalAt when entering a terminal state');
}

function validateMissionEventInput(value: Record<string, unknown>, diagnostics: MissionDiagnostic[]): void {
  const required = ['eventId', 'resultingState', 'actor', 'causationId', 'correlationId', 'source', 'idempotencyKey'];
  for (const key of required) if (value[key] === undefined) addDiagnostic(diagnostics, 'REQUIRED_FIELD', `$.${key}`, `${key} is required`, `Provide ${key}`);
  validateIdentifier(value.eventId, '$.eventId', diagnostics);
  if (!isMissionState(value.resultingState)) addDiagnostic(diagnostics, 'INVALID_VALUE', '$.resultingState', 'resultingState must be canonical', 'Use a legal Mission state');
  validateActor(value.actor, '$.actor', diagnostics);
  validateIdentifier(value.causationId, '$.causationId', diagnostics);
  validateIdentifier(value.correlationId, '$.correlationId', diagnostics);
  validateEventSource(value.source, '$.source', diagnostics);
  validateIdentifier(value.idempotencyKey, '$.idempotencyKey', diagnostics);
  if (value.occurredAt !== undefined) validateTimestamp(value.occurredAt, '$.occurredAt', diagnostics);
  if (value.recordedAt !== undefined) validateTimestamp(value.recordedAt, '$.recordedAt', diagnostics);
  if (typeof value.occurredAt === 'string' && typeof value.recordedAt === 'string' && Date.parse(value.recordedAt) < Date.parse(value.occurredAt)) addDiagnostic(diagnostics, 'TIMESTAMP_ORDER', '$.recordedAt', 'recordedAt cannot precede occurredAt', 'Use recordedAt at or after occurredAt');
  if (value.payloadDigest !== undefined && (typeof value.payloadDigest !== 'string' || !DIGEST_PATTERN.test(value.payloadDigest))) addDiagnostic(diagnostics, 'INVALID_VALUE', '$.payloadDigest', 'payloadDigest must be a sha256 digest', 'Use sha256:<64 hex characters>');
}

function validateEventMetadata(value: unknown, diagnostics: MissionDiagnostic[]): void {
  if (!isRecord(value)) {
    addDiagnostic(diagnostics, 'REQUIRED_FIELD', '$.metadata', 'Event metadata is required', 'Add eventId and schemaVersion');
    return;
  }
  checkUnknownFields(value, EVENT_METADATA_FIELDS, '$.metadata', diagnostics);
  validateIdentifier(value.eventId, '$.metadata.eventId', diagnostics);
  if (value.schemaVersion !== MISSION_SCHEMA_VERSION) addDiagnostic(diagnostics, 'UNSUPPORTED_VERSION', '$.metadata.schemaVersion', 'Event schemaVersion must be 1', 'Use schemaVersion 1');
  if (value.missionId !== undefined) validateIdentifier(value.missionId, '$.metadata.missionId', diagnostics);
}

function validateEventSpec(value: Record<string, unknown>, diagnostics: MissionDiagnostic[]): void {
  checkUnknownFields(value, EVENT_SPEC_FIELDS, '$.spec', diagnostics);
  validateIdentifier(value.missionId, '$.spec.missionId', diagnostics);
  validateScope(value.scope, '$.spec.scope', diagnostics);
  if (!EVENT_TYPES.has(value.eventType as MissionLifecycleEventType)) addDiagnostic(diagnostics, 'INVALID_VALUE', '$.spec.eventType', 'eventType must be canonical', 'Use a canonical lifecycle event type');
  if (value.priorState !== null && !isMissionState(value.priorState)) addDiagnostic(diagnostics, 'INVALID_VALUE', '$.spec.priorState', 'priorState must be a Mission state or null', 'Use the state being transitioned from');
  if (!isMissionState(value.resultingState)) addDiagnostic(diagnostics, 'INVALID_VALUE', '$.spec.resultingState', 'resultingState must be a Mission state', 'Use the resulting Mission state');
  if (!Number.isInteger(value.stateVersion) || (value.stateVersion as number) < 1) addDiagnostic(diagnostics, 'INVALID_VALUE', '$.spec.stateVersion', 'stateVersion must be a positive integer', 'Use a monotonically increasing stateVersion');
  validateActor(value.actor, '$.spec.actor', diagnostics);
  validateIdentifier(value.causationId, '$.spec.causationId', diagnostics);
  validateIdentifier(value.correlationId, '$.spec.correlationId', diagnostics);
  validateEventSource(value.source, '$.spec.source', diagnostics);
  validateTimestamp(value.occurredAt, '$.spec.occurredAt', diagnostics);
  validateTimestamp(value.recordedAt, '$.spec.recordedAt', diagnostics);
  if (typeof value.occurredAt === 'string' && typeof value.recordedAt === 'string' && Date.parse(value.recordedAt) < Date.parse(value.occurredAt)) addDiagnostic(diagnostics, 'TIMESTAMP_ORDER', '$.spec.recordedAt', 'recordedAt cannot precede occurredAt', 'Use recordedAt at or after occurredAt');
  if (value.payloadRef !== undefined) validateIdentifier(value.payloadRef, '$.spec.payloadRef', diagnostics);
  if (value.payloadDigest !== undefined && (typeof value.payloadDigest !== 'string' || !DIGEST_PATTERN.test(value.payloadDigest))) addDiagnostic(diagnostics, 'INVALID_VALUE', '$.spec.payloadDigest', 'payloadDigest must be a sha256 digest', 'Use sha256:<64 hex characters>');
  validateIdentifier(value.idempotencyKey, '$.spec.idempotencyKey', diagnostics);
}

function validateScope(value: unknown, pathName: string, diagnostics: MissionDiagnostic[]): void {
  if (!isRecord(value)) {
    addDiagnostic(diagnostics, 'REQUIRED_FIELD', pathName, 'scope is required', 'Use server-derived tenant, organisation, project, and environment identity');
    return;
  }
  for (const key of ['tenantId', 'organisationId', 'projectId', 'environmentId']) validateIdentifier(value[key], `${pathName}.${key}`, diagnostics);
}

function validateAgentBinding(value: unknown, pathName: string, diagnostics: MissionDiagnostic[]): void {
  if (!isRecord(value)) {
    addDiagnostic(diagnostics, 'REQUIRED_FIELD', pathName, 'Agent binding is required', 'Bind the Mission to an immutable Agent deployment');
    return;
  }
  validateIdentifier(value.agentId, `${pathName}.agentId`, diagnostics);
  if (typeof value.agentVersionId !== 'string' || !DIGEST_PATTERN.test(value.agentVersionId)) addDiagnostic(diagnostics, 'INVALID_VALUE', `${pathName}.agentVersionId`, 'agentVersionId must be a sha256 digest', 'Use computeAgentVersionId() from AgentPackage v2');
  validateIdentifier(value.deploymentId, `${pathName}.deploymentId`, diagnostics);
  if (!isRecord(value.runtime)) addDiagnostic(diagnostics, 'REQUIRED_FIELD', `${pathName}.runtime`, 'runtime binding is required', 'Record the deployment runtime mode');
  else {
    if (typeof value.runtime.mode !== 'string' || !value.runtime.mode.trim()) addDiagnostic(diagnostics, 'INVALID_VALUE', `${pathName}.runtime.mode`, 'runtime.mode is required', 'Record the runtime mode');
    if (value.runtime.adapter !== undefined) validateIdentifier(value.runtime.adapter, `${pathName}.runtime.adapter`, diagnostics);
    if (value.runtime.configurationRef !== undefined && (typeof value.runtime.configurationRef !== 'string' || !AUTHORITY_REF_PATTERN.test(value.runtime.configurationRef))) addDiagnostic(diagnostics, 'INVALID_VALUE', `${pathName}.runtime.configurationRef`, 'configurationRef must be a non-secret atlas:// or https:// reference', 'Use a reference, never raw credentials or private table data');
  }
}

function validateSubject(value: unknown, pathName: string, diagnostics: MissionDiagnostic[]): void {
  if (!isRecord(value)) {
    addDiagnostic(diagnostics, 'INVALID_TYPE', pathName, 'subject must be an object', 'Provide a canonical subject reference');
    return;
  }
  validateIdentifier(value.subjectId, `${pathName}.subjectId`, diagnostics);
  if (typeof value.kind !== 'string' || !value.kind.trim()) addDiagnostic(diagnostics, 'REQUIRED_FIELD', `${pathName}.kind`, 'subject.kind is required', 'Identify the subject kind');
  if (value.displayName !== undefined && typeof value.displayName !== 'string') addDiagnostic(diagnostics, 'INVALID_TYPE', `${pathName}.displayName`, 'displayName must be a string', 'Use a string display name');
  if (value.canonicalRef !== undefined) validateIdentifier(value.canonicalRef, `${pathName}.canonicalRef`, diagnostics);
}

function validateConversation(value: unknown, pathName: string, diagnostics: MissionDiagnostic[]): void {
  if (!isRecord(value)) {
    addDiagnostic(diagnostics, 'INVALID_TYPE', pathName, 'conversation must be an object', 'Provide canonical conversation correlation');
    return;
  }
  validateIdentifier(value.conversationId, `${pathName}.conversationId`, diagnostics);
  if (typeof value.channel !== 'string' || !value.channel.trim()) addDiagnostic(diagnostics, 'REQUIRED_FIELD', `${pathName}.channel`, 'conversation.channel is required', 'Record the business messaging channel');
  if (value.providerConversationId !== undefined) validateIdentifier(value.providerConversationId, `${pathName}.providerConversationId`, diagnostics);
  if (value.threadId !== undefined) validateIdentifier(value.threadId, `${pathName}.threadId`, diagnostics);
}

function validateConstraints(value: unknown, pathName: string, diagnostics: MissionDiagnostic[]): void {
  if (!isRecord(value)) {
    addDiagnostic(diagnostics, 'INVALID_TYPE', pathName, 'constraints must be an object', 'Provide bounded Mission constraints');
    return;
  }
  if (value.maxSteps !== undefined && (!Number.isInteger(value.maxSteps) || (value.maxSteps as number) < 1)) addDiagnostic(diagnostics, 'INVALID_VALUE', `${pathName}.maxSteps`, 'maxSteps must be a positive integer', 'Set a bounded step budget');
  for (const key of ['allowedTools', 'allowedChannels', 'stopConditions', 'requiredApprovalFor']) if (value[key] !== undefined && (!Array.isArray(value[key]) || (value[key] as unknown[]).some((item) => typeof item !== 'string' || !item.trim()))) addDiagnostic(diagnostics, 'INVALID_VALUE', `${pathName}.${key}`, `${key} must be a non-empty-string array`, 'Use bounded string references');
}

function validateRisk(value: unknown, pathName: string, diagnostics: MissionDiagnostic[]): void {
  if (!isRecord(value)) {
    addDiagnostic(diagnostics, 'INVALID_TYPE', pathName, 'risk must be an object', 'Provide policy, risk, and autonomy posture');
    return;
  }
  validateIdentifier(value.policyRef, `${pathName}.policyRef`, diagnostics);
  if (!['low', 'medium', 'high', 'critical'].includes(value.riskClass as string)) addDiagnostic(diagnostics, 'INVALID_VALUE', `${pathName}.riskClass`, 'riskClass is invalid', 'Use low, medium, high, or critical');
  if (!['L0', 'L1', 'L2', 'L3', 'L4'].includes(value.autonomyLevel as string)) addDiagnostic(diagnostics, 'INVALID_VALUE', `${pathName}.autonomyLevel`, 'autonomyLevel is invalid', 'Use an action-specific L0-L4 level');
}

function validateBudget(value: unknown, pathName: string, diagnostics: MissionDiagnostic[]): void {
  if (!isRecord(value)) {
    addDiagnostic(diagnostics, 'INVALID_TYPE', pathName, 'budget must be an object', 'Provide bounded Mission budgets');
    return;
  }
  for (const key of ['maxTokens', 'maxSteps'] as const) if (value[key] !== undefined && (!Number.isInteger(value[key]) || (value[key] as number) < 1)) addDiagnostic(diagnostics, 'INVALID_VALUE', `${pathName}.${key}`, `${key} must be a positive integer`, 'Use a positive budget');
  for (const key of ['maxCost', 'reservedCost'] as const) if (value[key] !== undefined && (typeof value[key] !== 'number' || (value[key] as number) < 0)) addDiagnostic(diagnostics, 'INVALID_VALUE', `${pathName}.${key}`, `${key} must be a non-negative number`, 'Use a non-negative budget amount');
  if (value.currency !== undefined && (typeof value.currency !== 'string' || !/^[A-Z]{3}$/.test(value.currency))) addDiagnostic(diagnostics, 'INVALID_VALUE', `${pathName}.currency`, 'currency must be a three-letter ISO code', 'Use an ISO 4217 currency code');
}

function validateCorrelation(value: unknown, pathName: string, diagnostics: MissionDiagnostic[]): void {
  if (!isRecord(value)) {
    addDiagnostic(diagnostics, 'REQUIRED_FIELD', pathName, 'correlation is required', 'Provide correlationId and optional causation/trace identifiers');
    return;
  }
  validateIdentifier(value.correlationId, `${pathName}.correlationId`, diagnostics);
  if (value.causationId !== undefined) validateIdentifier(value.causationId, `${pathName}.causationId`, diagnostics);
  if (value.traceId !== undefined) validateIdentifier(value.traceId, `${pathName}.traceId`, diagnostics);
  if (value.parentSpanId !== undefined) validateIdentifier(value.parentSpanId, `${pathName}.parentSpanId`, diagnostics);
}

function validateProvenance(value: unknown, pathName: string, diagnostics: MissionDiagnostic[]): void {
  if (!isRecord(value)) {
    addDiagnostic(diagnostics, 'REQUIRED_FIELD', pathName, 'provenance is required', 'Record the source and input digest');
    return;
  }
  if (!['developer', 'api', 'channel', 'schedule', 'provider-callback', 'operator', 'system'].includes(value.source as string)) addDiagnostic(diagnostics, 'INVALID_VALUE', `${pathName}.source`, 'provenance.source is invalid', 'Use a canonical source kind');
  if (typeof value.inputDigest !== 'string' || !DIGEST_PATTERN.test(value.inputDigest)) addDiagnostic(diagnostics, 'INVALID_VALUE', `${pathName}.inputDigest`, 'inputDigest must be a sha256 digest', 'Hash the originating input or event');
  for (const key of ['knowledgeRefs', 'memoryRefs']) if (value[key] !== undefined && (!Array.isArray(value[key]) || (value[key] as unknown[]).some((item) => typeof item !== 'string'))) addDiagnostic(diagnostics, 'INVALID_VALUE', `${pathName}.${key}`, `${key} must be an array of identifiers`, 'Provide provenance references');
}

function validateActiveWait(value: unknown, pathName: string, diagnostics: MissionDiagnostic[]): void {
  if (!isRecord(value)) {
    addDiagnostic(diagnostics, 'INVALID_TYPE', pathName, 'activeWait must be an object', 'Record the current durable wait');
    return;
  }
  if (!['event', 'schedule', 'approval', 'handoff'].includes(value.kind as string)) addDiagnostic(diagnostics, 'INVALID_VALUE', `${pathName}.kind`, 'activeWait.kind is invalid', 'Use event, schedule, approval, or handoff');
  validateIdentifier(value.waitId, `${pathName}.waitId`, diagnostics);
  if (value.expiresAt !== undefined) validateTimestamp(value.expiresAt, `${pathName}.expiresAt`, diagnostics);
  if (value.requiredActor !== undefined) validateIdentifier(value.requiredActor, `${pathName}.requiredActor`, diagnostics);
}

function validateTimestamps(value: unknown, pathName: string, state: MissionState, diagnostics: MissionDiagnostic[]): void {
  if (!isRecord(value)) {
    addDiagnostic(diagnostics, 'REQUIRED_FIELD', pathName, 'timestamps are required', 'Record Mission lifecycle timestamps');
    return;
  }
  validateTimestamp(value.createdAt, `${pathName}.createdAt`, diagnostics);
  validateTimestamp(value.updatedAt, `${pathName}.updatedAt`, diagnostics);
  if (value.activatedAt !== undefined) validateTimestamp(value.activatedAt, `${pathName}.activatedAt`, diagnostics);
  if (value.terminalAt !== undefined) validateTimestamp(value.terminalAt, `${pathName}.terminalAt`, diagnostics);
  const values = ['createdAt', 'activatedAt', 'updatedAt', 'terminalAt'].map((key) => value[key]).filter((item): item is string => typeof item === 'string');
  if (values.some((item, index) => index > 0 && Date.parse(item) < Date.parse(values[index - 1]))) addDiagnostic(diagnostics, 'TIMESTAMP_ORDER', pathName, 'Mission timestamps must be monotonic', 'Use recorded event timestamps in chronological order');
  if (isTerminalMissionState(state) && typeof value.terminalAt !== 'string') addDiagnostic(diagnostics, 'TERMINAL_STATE_MUTATION', `${pathName}.terminalAt`, 'terminal Mission must have terminalAt', 'Record terminalAt when the Mission reaches a terminal state');
  if (!isTerminalMissionState(state) && value.terminalAt !== undefined) addDiagnostic(diagnostics, 'TERMINAL_STATE_MUTATION', `${pathName}.terminalAt`, 'non-terminal Mission cannot have terminalAt', 'Remove terminalAt until a terminal lifecycle event is appended');
}

function validateActor(value: unknown, pathName: string, diagnostics: MissionDiagnostic[]): void {
  if (!isRecord(value)) {
    addDiagnostic(diagnostics, 'REQUIRED_FIELD', pathName, 'actor is required', 'Record who caused the lifecycle event');
    return;
  }
  if (!['system', 'developer', 'agent', 'operator', 'provider', 'scheduler', 'external-runtime'].includes(value.type as string)) addDiagnostic(diagnostics, 'INVALID_VALUE', `${pathName}.type`, 'actor type is invalid', 'Use a canonical actor type');
  validateIdentifier(value.identity, `${pathName}.identity`, diagnostics);
}

function validateEventSource(value: unknown, pathName: string, diagnostics: MissionDiagnostic[]): void {
  if (!isRecord(value)) {
    addDiagnostic(diagnostics, 'REQUIRED_FIELD', pathName, 'source is required', 'Record the command, observation, callback, or control source');
    return;
  }
  if (!['command', 'observation', 'provider-callback', 'tool-result', 'schedule', 'human-control', 'system'].includes(value.kind as string)) addDiagnostic(diagnostics, 'INVALID_VALUE', `${pathName}.kind`, 'event source kind is invalid', 'Use a canonical source kind');
  validateIdentifier(value.ref, `${pathName}.ref`, diagnostics);
}

function validateLabels(value: unknown, pathName: string, diagnostics: MissionDiagnostic[]): void {
  if (value === undefined) return;
  if (!isRecord(value) || Object.keys(value).length > 32 || Object.entries(value).some(([key, item]) => !/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,62}$/.test(key) || typeof item !== 'string' || item.length > 256)) addDiagnostic(diagnostics, 'INVALID_VALUE', pathName, 'labels must be at most 32 string key/value pairs', 'Use bounded labels');
}

function validateTimestamp(value: unknown, pathName: string, diagnostics: MissionDiagnostic[]): void {
  if (typeof value !== 'string' || !isValidTimestamp(value)) addDiagnostic(diagnostics, 'INVALID_VALUE', pathName, 'timestamp must be an ISO-8601 date-time', 'Use a timestamp such as 2026-07-29T12:00:00.000Z');
}

function validateIdentifier(value: unknown, pathName: string, diagnostics: MissionDiagnostic[]): void {
  if (typeof value !== 'string' || !value || value.length > 256 || !ID_PATTERN.test(value)) addDiagnostic(diagnostics, 'INVALID_VALUE', pathName, 'identifier must be a non-empty string without null bytes', 'Use a stable bounded identifier');
}

function isValidTimestamp(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) && Number.isFinite(Date.parse(value));
}

function eventTypeForTransition(from: MissionState, to: MissionState): MissionLifecycleEventType {
  if (from === 'READY' && to === 'ACTIVE') return 'ACTIVATED';
  if ((from === 'WAITING_EVENT' || from === 'WAITING_SCHEDULE' || from === 'WAITING_APPROVAL' || from === 'HANDED_OFF' || from === 'PAUSED') && to === 'ACTIVE') return 'RESUMED';
  return to as MissionLifecycleEventType;
}

function isMissionState(value: unknown): value is MissionState {
  return typeof value === 'string' && ALL_STATES.has(value as MissionState);
}

function sameScope(left: unknown, right: MissionScope): boolean {
  return isRecord(left) && left.tenantId === right.tenantId && left.organisationId === right.organisationId && left.projectId === right.projectId && left.environmentId === right.environmentId;
}

function checkUnknownFields(value: Record<string, unknown>, allowed: ReadonlySet<string>, pathName: string, diagnostics: MissionDiagnostic[]): void {
  for (const key of Object.keys(value)) if (!allowed.has(key)) addDiagnostic(diagnostics, 'UNKNOWN_FIELD', `${pathName}.${key}`, `unknown field: ${key}`, `Remove ${pathName}.${key} or upgrade the contract`);
}

function addDiagnostic(diagnostics: MissionDiagnostic[], code: MissionDiagnosticCode, pathName: string, message: string, nextAction: string): void {
  if (!diagnostics.some((item) => item.code === code && item.path === pathName && item.message === message)) diagnostics.push(diagnostic(code, pathName, message, nextAction));
}

function diagnostic(code: MissionDiagnosticCode, pathName: string, message: string, nextAction: string): MissionDiagnostic {
  return { code, path: pathName, message, next_action: nextAction };
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (isRecord(value)) return `{${Object.entries(value).filter(([, item]) => item !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`;
  return JSON.stringify(value);
}

export function digestMissionInput(input: unknown): string {
  return sha256(stableJson(input));
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) deepFreeze(nested);
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
