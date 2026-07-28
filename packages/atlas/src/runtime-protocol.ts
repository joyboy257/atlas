import { createHash } from 'node:crypto';

export const ATLAS_TURN_PROTOCOL_VERSION = '1' as const;
export const ATLAS_RUNTIME_GATEWAY_VERSION = 'atlas.runtime-gateway/v1' as const;

export type AtlasRuntimeType = 'atlas-native' | 'openai-agents' | 'eve' | 'langgraph' | 'n8n' | 'custom';
export type AtlasSafeScalar = string | number | boolean;

export type AtlasScopedCustomerContext = Readonly<{
  id: string;
  displayName?: string;
  attributes?: Readonly<Record<string, AtlasSafeScalar>>;
}>;

export type AtlasScopedConversationContext = Readonly<{
  id: string;
  state: 'automated' | 'approval_pending' | 'human_handoff' | 'human_takeover' | 'completed';
  threadId?: string;
  assignedOperatorId?: string;
  attributes?: Readonly<Record<string, AtlasSafeScalar>>;
}>;

export type AtlasTurnChannelCapabilities = Readonly<{
  channelId: string;
  surfaces: readonly string[];
  text: boolean;
  media: readonly string[];
  interactive: readonly string[];
  reactions: boolean;
  typing: boolean;
  readReceipts: boolean;
  edits: boolean;
  deletes: boolean;
  proactive: Readonly<{
    supported: boolean;
    consentRequired: boolean;
    templatePolicy?: string;
    windowPolicy?: string;
  }>;
}>;

export type AtlasTurnMessage = Readonly<{
  id: string;
  direction: 'inbound' | 'outbound';
  role: 'customer' | 'operator' | 'agent' | 'system';
  text?: string;
  structured?: unknown;
  occurredAt: string;
  replyTo?: string;
}>;

export type AtlasKnowledgeEvidence = Readonly<{
  id: string;
  source: string;
  digest: string;
  excerpt?: string;
  attributes?: Readonly<Record<string, AtlasSafeScalar>>;
}>;

export type AtlasToolContract = Readonly<{
  name: string;
  version: string;
  description: string;
  risk: 'none' | 'low' | 'medium' | 'high' | 'critical';
  execution: 'read' | 'propose' | 'commit';
  approval: 'never' | 'conditional' | 'required';
  idempotency: 'not_applicable' | 'optional' | 'required';
  inputSchema?: Readonly<Record<string, unknown>>;
}>;

export type AtlasPolicyConstraint = Readonly<{
  id: string;
  effect: 'allow' | 'deny' | 'require_approval' | 'require_handoff';
  description: string;
  appliesToTools?: readonly string[];
}>;

export type AtlasTurnRequestV1 = Readonly<{
  protocolVersion: typeof ATLAS_TURN_PROTOCOL_VERSION;
  requestId: string;
  traceId: string;
  packageVersion: string;
  tenant: Readonly<{ id: string; scopes: readonly string[] }>;
  actor: Readonly<{ runtimeId: string; runtimeType: AtlasRuntimeType }>;
  customer?: AtlasScopedCustomerContext;
  conversation: AtlasScopedConversationContext;
  channel: AtlasTurnChannelCapabilities;
  messages: readonly AtlasTurnMessage[];
  knowledgeEvidence: readonly AtlasKnowledgeEvidence[];
  tools: readonly AtlasToolContract[];
  policyConstraints: readonly AtlasPolicyConstraint[];
  limits: Readonly<{
    deadlineMs: number;
    maxOutputTokens?: number;
    maxProposedActions: number;
  }>;
}>;

export type AtlasProposedAction = Readonly<{
  toolName: string;
  arguments: unknown;
  idempotencyKey?: string;
  explanation?: string;
}>;

export type AtlasTurnProposalV1 = Readonly<{
  protocolVersion: typeof ATLAS_TURN_PROTOCOL_VERSION;
  requestId: string;
  response?: Readonly<{ text?: string; structured?: unknown; replyTo?: string }>;
  proposedActions?: readonly AtlasProposedAction[];
  handoff?: Readonly<{ reason: string; urgency: 'normal' | 'high' }>;
  citations?: readonly string[];
  safeMetadata?: Readonly<Record<string, AtlasSafeScalar>>;
}>;

export type AtlasRuntimeMetadata = Readonly<{
  id: string;
  type: AtlasRuntimeType;
  name: string;
  version: string;
  protocolVersions: readonly string[];
  external: boolean;
}>;

export type AtlasRuntimeCapabilities = Readonly<{
  text: boolean;
  structuredOutput: boolean;
  toolProposals: boolean;
  streaming: boolean;
  cancellation: boolean;
  maxContextMessages?: number;
}>;

export type AtlasRuntimeHealth = Readonly<{
  status: 'healthy' | 'degraded' | 'unavailable';
  checkedAt: string;
  detail?: string;
}>;

export interface AtlasRuntimeAdapter {
  metadata(): AtlasRuntimeMetadata;
  capabilities(): Promise<AtlasRuntimeCapabilities>;
  propose(request: AtlasTurnRequestV1): Promise<AtlasTurnProposalV1>;
  cancel(requestId: string): Promise<void>;
  health(): Promise<AtlasRuntimeHealth>;
}

export type AtlasRuntimeGatewayReceipt = Readonly<{
  schemaVersion: typeof ATLAS_RUNTIME_GATEWAY_VERSION;
  receiptId: string;
  requestId: string;
  traceId: string;
  tenantId: string;
  runtimeId: string;
  runtimeType: AtlasRuntimeType;
  requestDigest: string;
  proposalDigest: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  replayed: boolean;
  safeUsage: Readonly<{
    inputTokens: number | null;
    outputTokens: number | null;
    costMinor: number | null;
  }>;
}>;

export type AtlasRuntimeGatewayResult = Readonly<{
  proposal: AtlasTurnProposalV1;
  receipt: AtlasRuntimeGatewayReceipt;
}>;

export type AtlasRuntimeProtocolErrorCode =
  | 'INVALID_TURN_REQUEST'
  | 'INVALID_TURN_PROPOSAL'
  | 'UNSUPPORTED_PROTOCOL_VERSION'
  | 'RUNTIME_IDENTITY_MISMATCH'
  | 'RUNTIME_UNAVAILABLE'
  | 'RUNTIME_TIMEOUT'
  | 'REQUEST_IDEMPOTENCY_MISMATCH'
  | 'UNKNOWN_TOOL'
  | 'APPROVAL_BYPASS_ATTEMPT'
  | 'DIRECT_SEND_BYPASS_ATTEMPT'
  | 'TENANT_CROSSING_ATTEMPT'
  | 'CREDENTIAL_MATERIAL_DETECTED'
  | 'LIMIT_EXCEEDED';

export class AtlasRuntimeProtocolError extends Error {
  readonly code: AtlasRuntimeProtocolErrorCode;
  readonly retryable: boolean;
  readonly nextAction: string;

  constructor(
    code: AtlasRuntimeProtocolErrorCode,
    message: string,
    options: Readonly<{ retryable?: boolean; nextAction?: string }> = {},
  ) {
    super(message);
    this.name = 'AtlasRuntimeProtocolError';
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.nextAction = options.nextAction ?? 'Inspect the Atlas runtime trace and correct the scoped protocol payload.';
  }
}

type ReplayEntry = Readonly<{
  requestDigest: string;
  proposal: AtlasTurnProposalV1;
  receipt: AtlasRuntimeGatewayReceipt;
}>;

export class AtlasRuntimeGateway {
  private readonly clock: () => Date;
  private readonly replay = new Map<string, ReplayEntry>();
  private readonly active = new Map<string, AtlasRuntimeAdapter>();

  constructor(options: Readonly<{ clock?: () => Date }> = {}) {
    this.clock = options.clock ?? (() => new Date());
  }

  async propose(adapter: AtlasRuntimeAdapter, value: unknown): Promise<AtlasRuntimeGatewayResult> {
    const request = validateAtlasTurnRequest(value);
    const metadata = validateRuntimeMetadata(adapter.metadata());
    if (metadata.id !== request.actor.runtimeId || metadata.type !== request.actor.runtimeType) {
      throw new AtlasRuntimeProtocolError(
        'RUNTIME_IDENTITY_MISMATCH',
        `Turn actor ${request.actor.runtimeId}/${request.actor.runtimeType} does not match adapter ${metadata.id}/${metadata.type}`,
      );
    }
    if (!metadata.protocolVersions.includes(request.protocolVersion)) {
      throw new AtlasRuntimeProtocolError(
        'UNSUPPORTED_PROTOCOL_VERSION',
        `Runtime ${metadata.id} does not support Atlas turn protocol ${request.protocolVersion}`,
      );
    }
    const health = await adapter.health();
    if (health.status === 'unavailable') {
      throw new AtlasRuntimeProtocolError('RUNTIME_UNAVAILABLE', `Runtime ${metadata.id} is unavailable`, {
        retryable: true,
        nextAction: 'Use an explicitly configured fallback runtime or retry after health recovers.',
      });
    }
    await adapter.capabilities();

    const requestDigest = digest(request);
    const previous = this.replay.get(request.requestId);
    if (previous) {
      if (previous.requestDigest !== requestDigest) {
        throw new AtlasRuntimeProtocolError(
          'REQUEST_IDEMPOTENCY_MISMATCH',
          `Turn request ${request.requestId} was reused with different scoped input`,
          { nextAction: 'Replay the original request exactly or issue a new requestId.' },
        );
      }
      return {
        proposal: clone(previous.proposal),
        receipt: { ...clone(previous.receipt), replayed: true },
      };
    }
    if (this.active.has(request.requestId)) {
      throw new AtlasRuntimeProtocolError('REQUEST_IDEMPOTENCY_MISMATCH', `Turn request ${request.requestId} is already active`, {
        retryable: true,
      });
    }

    const started = this.clock();
    this.active.set(request.requestId, adapter);
    let timeout: NodeJS.Timeout | undefined;
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeout = setTimeout(async () => {
          await adapter.cancel(request.requestId).catch(() => undefined);
          reject(
            new AtlasRuntimeProtocolError('RUNTIME_TIMEOUT', `Runtime ${metadata.id} exceeded ${request.limits.deadlineMs} ms`, {
              retryable: true,
              nextAction: 'Retry unchanged input or use an explicitly approved fallback runtime.',
            }),
          );
        }, request.limits.deadlineMs);
      });
      const rawProposal = await Promise.race([adapter.propose(clone(request)), timeoutPromise]);
      const proposal = validateAtlasTurnProposal(request, rawProposal);
      const completed = this.clock();
      const receipt: AtlasRuntimeGatewayReceipt = {
        schemaVersion: ATLAS_RUNTIME_GATEWAY_VERSION,
        receiptId: deterministicId('runtime-receipt', request.traceId, request.requestId, metadata.id),
        requestId: request.requestId,
        traceId: request.traceId,
        tenantId: request.tenant.id,
        runtimeId: metadata.id,
        runtimeType: metadata.type,
        requestDigest,
        proposalDigest: digest(proposal),
        startedAt: started.toISOString(),
        completedAt: completed.toISOString(),
        durationMs: Math.max(0, completed.getTime() - started.getTime()),
        replayed: false,
        safeUsage: extractSafeUsage(proposal.safeMetadata),
      };
      this.replay.set(request.requestId, { requestDigest, proposal: clone(proposal), receipt: clone(receipt) });
      return { proposal, receipt };
    } finally {
      if (timeout) clearTimeout(timeout);
      this.active.delete(request.requestId);
    }
  }

  async cancel(requestId: string): Promise<void> {
    const adapter = this.active.get(requestId);
    if (!adapter) return;
    await adapter.cancel(requestId);
    this.active.delete(requestId);
  }

  inspect(requestId: string): AtlasRuntimeGatewayResult | null {
    const entry = this.replay.get(requestId);
    return entry ? { proposal: clone(entry.proposal), receipt: clone(entry.receipt) } : null;
  }
}

export function validateAtlasTurnRequest(value: unknown): AtlasTurnRequestV1 {
  const input = record(value, 'turn request');
  if (input.protocolVersion !== ATLAS_TURN_PROTOCOL_VERSION) {
    throw new AtlasRuntimeProtocolError('UNSUPPORTED_PROTOCOL_VERSION', `Unsupported Atlas turn protocol version: ${String(input.protocolVersion)}`);
  }
  rejectForbiddenAuthority(input, 'turn request');
  const tenant = record(input.tenant, 'tenant');
  const actor = record(input.actor, 'actor');
  const limits = record(input.limits, 'limits');
  const tenantId = requiredString(tenant.id, 'tenant.id');
  const messages = array(input.messages, 'messages').map((item, index) => validateMessage(item, index));
  if (messages.length === 0) invalidRequest('messages must contain at least one scoped message');
  const knowledgeEvidence = array(input.knowledgeEvidence, 'knowledgeEvidence').map((item, index) => validateEvidence(item, index));
  const tools = array(input.tools, 'tools').map((item, index) => validateTool(item, index));
  const policyConstraints = array(input.policyConstraints, 'policyConstraints').map((item, index) => validatePolicy(item, index));
  uniqueBy(tools, (item) => item.name, 'tool names');
  uniqueBy(knowledgeEvidence, (item) => item.id, 'knowledge evidence ids');

  return deepFreeze({
    protocolVersion: ATLAS_TURN_PROTOCOL_VERSION,
    requestId: requiredString(input.requestId, 'requestId'),
    traceId: requiredString(input.traceId, 'traceId'),
    packageVersion: requiredString(input.packageVersion, 'packageVersion'),
    tenant: { id: tenantId, scopes: stringArray(tenant.scopes, 'tenant.scopes', true) },
    actor: { runtimeId: requiredString(actor.runtimeId, 'actor.runtimeId'), runtimeType: runtimeTypeValue(actor.runtimeType) },
    ...(input.customer === undefined ? {} : { customer: validateCustomer(input.customer, tenantId) }),
    conversation: validateConversation(record(input.conversation, 'conversation'), tenantId),
    channel: validateTurnChannel(record(input.channel, 'channel')),
    messages,
    knowledgeEvidence,
    tools,
    policyConstraints,
    limits: {
      deadlineMs: boundedInteger(limits.deadlineMs, 'limits.deadlineMs', 1, 300_000),
      ...(limits.maxOutputTokens === undefined ? {} : { maxOutputTokens: boundedInteger(limits.maxOutputTokens, 'limits.maxOutputTokens', 1, 1_000_000) }),
      maxProposedActions: boundedInteger(limits.maxProposedActions, 'limits.maxProposedActions', 0, 32),
    },
  });
}

export function validateAtlasTurnProposal(requestValue: AtlasTurnRequestV1, proposalValue: unknown): AtlasTurnProposalV1 {
  const request = validateAtlasTurnRequest(requestValue);
  const input = record(proposalValue, 'turn proposal');
  if (input.protocolVersion !== request.protocolVersion) {
    throw new AtlasRuntimeProtocolError('UNSUPPORTED_PROTOCOL_VERSION', 'Proposal protocol does not match the request protocol');
  }
  if (input.requestId !== request.requestId) invalidProposal('Proposal requestId does not match the turn request');
  rejectForbiddenAuthority(input, 'turn proposal');
  assertNoTenantCrossing(input, request.tenant.id);

  const response = input.response === undefined ? undefined : validateResponse(input.response, request);
  const proposedActions = input.proposedActions === undefined
    ? undefined
    : array(input.proposedActions, 'proposedActions').map((item, index) => validateAction(item, index, request));
  if ((proposedActions?.length ?? 0) > request.limits.maxProposedActions) {
    throw new AtlasRuntimeProtocolError('LIMIT_EXCEEDED', 'Proposal exceeds maxProposedActions');
  }
  const handoff = input.handoff === undefined ? undefined : validateHandoff(input.handoff);
  const citations = input.citations === undefined ? undefined : stringArray(input.citations, 'citations');
  if (citations) {
    const allowed = new Set(request.knowledgeEvidence.map((item) => item.id));
    for (const citation of citations) if (!allowed.has(citation)) invalidProposal(`Unknown knowledge citation: ${citation}`);
  }
  const safeMetadata = input.safeMetadata === undefined ? undefined : safeScalarRecord(input.safeMetadata, 'safeMetadata');
  if (!response && !proposedActions?.length && !handoff) invalidProposal('Proposal must include a response, action, or handoff');

  return deepFreeze({
    protocolVersion: ATLAS_TURN_PROTOCOL_VERSION,
    requestId: request.requestId,
    ...(response ? { response } : {}),
    ...(proposedActions ? { proposedActions } : {}),
    ...(handoff ? { handoff } : {}),
    ...(citations ? { citations } : {}),
    ...(safeMetadata ? { safeMetadata } : {}),
  });
}

function validateCustomer(value: unknown, tenantId: string): AtlasScopedCustomerContext {
  const input = record(value, 'customer');
  assertNoTenantCrossing(input, tenantId);
  return deepFreeze({
    id: requiredString(input.id, 'customer.id'),
    ...(input.displayName === undefined ? {} : { displayName: requiredString(input.displayName, 'customer.displayName') }),
    ...(input.attributes === undefined ? {} : { attributes: safeScalarRecord(input.attributes, 'customer.attributes') }),
  });
}

function validateConversation(input: Record<string, unknown>, tenantId: string): AtlasScopedConversationContext {
  assertNoTenantCrossing(input, tenantId);
  const state = requiredString(input.state, 'conversation.state');
  if (!['automated', 'approval_pending', 'human_handoff', 'human_takeover', 'completed'].includes(state)) invalidRequest(`Unsupported conversation state: ${state}`);
  return deepFreeze({
    id: requiredString(input.id, 'conversation.id'),
    state: state as AtlasScopedConversationContext['state'],
    ...(input.threadId === undefined ? {} : { threadId: requiredString(input.threadId, 'conversation.threadId') }),
    ...(input.assignedOperatorId === undefined ? {} : { assignedOperatorId: requiredString(input.assignedOperatorId, 'conversation.assignedOperatorId') }),
    ...(input.attributes === undefined ? {} : { attributes: safeScalarRecord(input.attributes, 'conversation.attributes') }),
  });
}

function validateTurnChannel(input: Record<string, unknown>): AtlasTurnChannelCapabilities {
  const proactive = record(input.proactive, 'channel.proactive');
  return deepFreeze({
    channelId: requiredString(input.channelId, 'channel.channelId'),
    surfaces: stringArray(input.surfaces, 'channel.surfaces', true),
    text: booleanValue(input.text, 'channel.text'),
    media: stringArray(input.media, 'channel.media'),
    interactive: stringArray(input.interactive, 'channel.interactive'),
    reactions: booleanValue(input.reactions, 'channel.reactions'),
    typing: booleanValue(input.typing, 'channel.typing'),
    readReceipts: booleanValue(input.readReceipts, 'channel.readReceipts'),
    edits: booleanValue(input.edits, 'channel.edits'),
    deletes: booleanValue(input.deletes, 'channel.deletes'),
    proactive: {
      supported: booleanValue(proactive.supported, 'channel.proactive.supported'),
      consentRequired: booleanValue(proactive.consentRequired, 'channel.proactive.consentRequired'),
      ...(proactive.templatePolicy === undefined ? {} : { templatePolicy: requiredString(proactive.templatePolicy, 'channel.proactive.templatePolicy') }),
      ...(proactive.windowPolicy === undefined ? {} : { windowPolicy: requiredString(proactive.windowPolicy, 'channel.proactive.windowPolicy') }),
    },
  });
}

function validateMessage(value: unknown, index: number): AtlasTurnMessage {
  const input = record(value, `messages[${index}]`);
  const direction = requiredString(input.direction, `messages[${index}].direction`);
  const role = requiredString(input.role, `messages[${index}].role`);
  if (!['inbound', 'outbound'].includes(direction)) invalidRequest(`Invalid message direction: ${direction}`);
  if (!['customer', 'operator', 'agent', 'system'].includes(role)) invalidRequest(`Invalid message role: ${role}`);
  if (input.text === undefined && input.structured === undefined) invalidRequest(`messages[${index}] needs text or structured content`);
  return deepFreeze({
    id: requiredString(input.id, `messages[${index}].id`),
    direction: direction as AtlasTurnMessage['direction'],
    role: role as AtlasTurnMessage['role'],
    ...(input.text === undefined ? {} : { text: requiredString(input.text, `messages[${index}].text`) }),
    ...(input.structured === undefined ? {} : { structured: clone(input.structured) }),
    occurredAt: isoTimestamp(input.occurredAt, `messages[${index}].occurredAt`),
    ...(input.replyTo === undefined ? {} : { replyTo: requiredString(input.replyTo, `messages[${index}].replyTo`) }),
  });
}

function validateEvidence(value: unknown, index: number): AtlasKnowledgeEvidence {
  const input = record(value, `knowledgeEvidence[${index}]`);
  return deepFreeze({
    id: requiredString(input.id, `knowledgeEvidence[${index}].id`),
    source: requiredString(input.source, `knowledgeEvidence[${index}].source`),
    digest: requiredString(input.digest, `knowledgeEvidence[${index}].digest`),
    ...(input.excerpt === undefined ? {} : { excerpt: requiredString(input.excerpt, `knowledgeEvidence[${index}].excerpt`) }),
    ...(input.attributes === undefined ? {} : { attributes: safeScalarRecord(input.attributes, `knowledgeEvidence[${index}].attributes`) }),
  });
}

function validateTool(value: unknown, index: number): AtlasToolContract {
  const input = record(value, `tools[${index}]`);
  const risk = enumString(input.risk, `tools[${index}].risk`, ['none', 'low', 'medium', 'high', 'critical']);
  const execution = enumString(input.execution, `tools[${index}].execution`, ['read', 'propose', 'commit']);
  const approval = enumString(input.approval, `tools[${index}].approval`, ['never', 'conditional', 'required']);
  const idempotency = enumString(input.idempotency, `tools[${index}].idempotency`, ['not_applicable', 'optional', 'required']);
  return deepFreeze({
    name: requiredString(input.name, `tools[${index}].name`),
    version: requiredString(input.version, `tools[${index}].version`),
    description: requiredString(input.description, `tools[${index}].description`),
    risk: risk as AtlasToolContract['risk'],
    execution: execution as AtlasToolContract['execution'],
    approval: approval as AtlasToolContract['approval'],
    idempotency: idempotency as AtlasToolContract['idempotency'],
    ...(input.inputSchema === undefined ? {} : { inputSchema: clone(record(input.inputSchema, `tools[${index}].inputSchema`)) }),
  });
}

function validatePolicy(value: unknown, index: number): AtlasPolicyConstraint {
  const input = record(value, `policyConstraints[${index}]`);
  const effect = enumString(input.effect, `policyConstraints[${index}].effect`, ['allow', 'deny', 'require_approval', 'require_handoff']);
  return deepFreeze({
    id: requiredString(input.id, `policyConstraints[${index}].id`),
    effect: effect as AtlasPolicyConstraint['effect'],
    description: requiredString(input.description, `policyConstraints[${index}].description`),
    ...(input.appliesToTools === undefined ? {} : { appliesToTools: stringArray(input.appliesToTools, `policyConstraints[${index}].appliesToTools`) }),
  });
}

function validateResponse(value: unknown, request: AtlasTurnRequestV1): NonNullable<AtlasTurnProposalV1['response']> {
  const input = record(value, 'response');
  if (input.text !== undefined && !request.channel.text) invalidProposal(`Channel ${request.channel.channelId} does not support text`);
  const text = input.text === undefined ? undefined : requiredString(input.text, 'response.text');
  const structured = input.structured === undefined ? undefined : clone(input.structured);
  const replyTo = input.replyTo === undefined ? undefined : requiredString(input.replyTo, 'response.replyTo');
  if (replyTo && !request.messages.some((message) => message.id === replyTo)) invalidProposal(`Unknown reply target: ${replyTo}`);
  if (text === undefined && structured === undefined) invalidProposal('response needs text or structured content');
  return deepFreeze({ ...(text === undefined ? {} : { text }), ...(structured === undefined ? {} : { structured }), ...(replyTo ? { replyTo } : {}) });
}

function validateAction(value: unknown, index: number, request: AtlasTurnRequestV1): AtlasProposedAction {
  const input = record(value, `proposedActions[${index}]`);
  const toolName = requiredString(input.toolName, `proposedActions[${index}].toolName`);
  const tool = request.tools.find((candidate) => candidate.name === toolName);
  if (!tool) throw new AtlasRuntimeProtocolError('UNKNOWN_TOOL', `Runtime proposed unknown or unscoped tool ${toolName}`);
  if (['approved', 'approvalStatus', 'operatorId', 'commit'].some((key) => key in input)) {
    throw new AtlasRuntimeProtocolError('APPROVAL_BYPASS_ATTEMPT', `Runtime attempted to supply approval or commit authority for ${toolName}`);
  }
  const idempotencyKey = input.idempotencyKey === undefined ? undefined : requiredString(input.idempotencyKey, `proposedActions[${index}].idempotencyKey`);
  if (tool.idempotency === 'required' && !idempotencyKey) invalidProposal(`Tool ${toolName} requires an idempotency key`);
  return deepFreeze({
    toolName,
    arguments: clone(input.arguments ?? {}),
    ...(idempotencyKey ? { idempotencyKey } : {}),
    ...(input.explanation === undefined ? {} : { explanation: requiredString(input.explanation, `proposedActions[${index}].explanation`) }),
  });
}

function validateHandoff(value: unknown): NonNullable<AtlasTurnProposalV1['handoff']> {
  const input = record(value, 'handoff');
  const urgency = enumString(input.urgency, 'handoff.urgency', ['normal', 'high']);
  return deepFreeze({ reason: requiredString(input.reason, 'handoff.reason'), urgency: urgency as 'normal' | 'high' });
}

function validateRuntimeMetadata(value: unknown): AtlasRuntimeMetadata {
  const input = record(value, 'runtime metadata');
  return deepFreeze({
    id: requiredString(input.id, 'runtime metadata.id'),
    type: runtimeTypeValue(input.type),
    name: requiredString(input.name, 'runtime metadata.name'),
    version: requiredString(input.version, 'runtime metadata.version'),
    protocolVersions: stringArray(input.protocolVersions, 'runtime metadata.protocolVersions', true),
    external: booleanValue(input.external, 'runtime metadata.external'),
  });
}

function rejectForbiddenAuthority(value: unknown, location: string): void {
  const fields = [
    ['send', 'Outbound'].join(''),
    ['direct', 'Send'].join(''),
    ['provider', 'Credentials'].join(''),
    ['raw', 'Credential'].join(''),
    ['api', 'Key'].join(''),
    ['access', 'Token'].join(''),
    ['refresh', 'Token'].join(''),
    ['connection', 'String'].join(''),
    ['database', 'Url'].join(''),
    'approve', 'approved', ['approval', 'Status'].join(''), ['commit', 'Action'].join(''), 'committed',
    ['tenant', 'Override'].join(''), ['billing', 'Override'].join(''), ['policy', 'Override'].join(''),
  ];
  const forbidden = new Set(fields);
  walk(value, (key) => {
    if (!forbidden.has(key)) return;
    const direct = key === fields[0] || key === fields[1];
    const credential = fields.slice(2, 9).includes(key);
    throw new AtlasRuntimeProtocolError(
      direct ? 'DIRECT_SEND_BYPASS_ATTEMPT' : credential ? 'CREDENTIAL_MATERIAL_DETECTED' : 'APPROVAL_BYPASS_ATTEMPT',
      `${location} contains forbidden authority field ${key}`,
    );
  });
}

function assertNoTenantCrossing(value: unknown, tenantId: string): void {
  walk(value, (key, item) => {
    if (typeof item !== 'string') return;
    if (['tenantId', 'tenant_id', 'organizationId', 'organization_id'].includes(key) && item !== tenantId) {
      throw new AtlasRuntimeProtocolError('TENANT_CROSSING_ATTEMPT', `Runtime payload references tenant ${item} outside ${tenantId}`);
    }
  });
}

function extractSafeUsage(metadata?: Readonly<Record<string, AtlasSafeScalar>>): AtlasRuntimeGatewayReceipt['safeUsage'] {
  return {
    inputTokens: finiteNonNegativeNumber(metadata?.input_tokens),
    outputTokens: finiteNonNegativeNumber(metadata?.output_tokens),
    costMinor: finiteNonNegativeNumber(metadata?.cost_minor),
  };
}

function finiteNonNegativeNumber(value: AtlasSafeScalar | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

function runtimeTypeValue(value: unknown): AtlasRuntimeType {
  const runtimeType = requiredString(value, 'runtime type');
  if (!['atlas-native', 'openai-agents', 'eve', 'langgraph', 'n8n', 'custom'].includes(runtimeType)) invalidRequest(`Unsupported runtime type: ${runtimeType}`);
  return runtimeType as AtlasRuntimeType;
}

function stringArray(value: unknown, location: string, nonEmpty = false): readonly string[] {
  const values = array(value, location).map((item, index) => requiredString(item, `${location}[${index}]`));
  if (nonEmpty && values.length === 0) invalidRequest(`${location} must not be empty`);
  if (new Set(values).size !== values.length) invalidRequest(`${location} contains duplicates`);
  return deepFreeze(values);
}

function safeScalarRecord(value: unknown, location: string): Readonly<Record<string, AtlasSafeScalar>> {
  const input = record(value, location);
  const output: Record<string, AtlasSafeScalar> = {};
  for (const [key, item] of Object.entries(input)) {
    if (!['string', 'number', 'boolean'].includes(typeof item) || (typeof item === 'number' && !Number.isFinite(item))) invalidProposal(`${location}.${key} must be a finite scalar`);
    output[key] = item as AtlasSafeScalar;
  }
  return deepFreeze(output);
}

function requiredString(value: unknown, location: string): string {
  if (typeof value !== 'string' || value.trim() === '') invalidRequest(`${location} must be a non-empty string`);
  return value;
}

function enumString(value: unknown, location: string, allowed: readonly string[]): string {
  const output = requiredString(value, location);
  if (!allowed.includes(output)) invalidRequest(`${location} must be one of ${allowed.join(', ')}`);
  return output;
}

function booleanValue(value: unknown, location: string): boolean {
  if (typeof value !== 'boolean') invalidRequest(`${location} must be boolean`);
  return value;
}

function boundedInteger(value: unknown, location: string, min: number, max: number): number {
  if (!Number.isInteger(value) || Number(value) < min || Number(value) > max) invalidRequest(`${location} must be an integer between ${min} and ${max}`);
  return Number(value);
}

function isoTimestamp(value: unknown, location: string): string {
  const text = requiredString(value, location);
  if (!Number.isFinite(Date.parse(text))) invalidRequest(`${location} must be an ISO timestamp`);
  return text;
}

function record(value: unknown, location: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalidRequest(`${location} must be an object`);
  return value as Record<string, unknown>;
}

function array(value: unknown, location: string): unknown[] {
  if (!Array.isArray(value)) invalidRequest(`${location} must be an array`);
  return value;
}

function invalidRequest(message: string): never {
  throw new AtlasRuntimeProtocolError('INVALID_TURN_REQUEST', message);
}

function invalidProposal(message: string): never {
  throw new AtlasRuntimeProtocolError('INVALID_TURN_PROPOSAL', message);
}

function uniqueBy<T>(values: readonly T[], key: (value: T) => string, location: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    const id = key(value);
    if (seen.has(id)) invalidRequest(`${location} contains duplicate ${id}`);
    seen.add(id);
  }
}

function walk(value: unknown, visitor: (key: string, value: unknown) => void): void {
  if (Array.isArray(value)) {
    for (const item of value) walk(item, visitor);
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    visitor(key, item);
    walk(item, visitor);
  }
}

function deterministicId(prefix: string, ...parts: string[]): string {
  return `${prefix}_${createHash('sha256').update(parts.join('\u0000')).digest('hex').slice(0, 24)}`;
}

function digest(value: unknown): string {
  return `sha256:${createHash('sha256').update(stableJson(value)).digest('hex')}`;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const item of Object.values(value as Record<string, unknown>)) deepFreeze(item);
  }
  return value;
}
