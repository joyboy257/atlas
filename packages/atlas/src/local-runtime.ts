import path from 'node:path';
import { atomicWrite, readUtf8Safe, sha256 } from './fs-safety.js';
import { loadAtlasProject } from './project-contract.js';

export const ATLAS_LOCAL_RUNTIME_VERSION = 'atlas.local-runtime/v1' as const;
export const ATLAS_LOCAL_FIXTURE_MODEL = 'atlas.local-fixture/v1' as const;
export const ATLAS_LOCAL_STATE_FILE = '.atlas/runtime-state.json' as const;
export const ATLAS_LOCAL_APPROVAL_TTL_MS = 15 * 60_000;

export type AtlasLocalAuthorityScope = Readonly<{
  tenant_id: string;
  organisation_id: string;
  project_id: string;
  environment_id: string;
}>;

export type AtlasLocalTakeover = Readonly<{
  operator_id: string;
  scope: AtlasLocalAuthorityScope;
  reason: string;
  taken_over_at: string;
}>;

export type AtlasLocalRuntimeErrorCode =
  | 'INVALID_MESSAGE'
  | 'IDEMPOTENCY_MISMATCH'
  | 'OUT_OF_ORDER_MESSAGE'
  | 'CONFLICT'
  | 'NOT_FOUND'
  | 'RETRY_NOT_READY'
  | 'DELIVERY_STATE_REGRESSION'
  | 'PROJECT_STATE_MISMATCH'
  | 'AUTHORIZATION_FAILED';

export class AtlasLocalRuntimeError extends Error {
  readonly code: AtlasLocalRuntimeErrorCode;
  readonly retryable: boolean;
  readonly next_action: string;

  constructor(code: AtlasLocalRuntimeErrorCode, message: string, options: { retryable?: boolean; nextAction?: string } = {}) {
    super(message);
    this.name = 'AtlasLocalRuntimeError';
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.next_action = options.nextAction ?? 'Inspect the local Atlas trace and retry with corrected input';
  }
}

export type AtlasLocalInboundMessage = Readonly<{
  message_id: string;
  conversation_id: string;
  customer_id: string;
  channel_id: string;
  sequence: number;
  occurred_at: string;
  text: string;
  consent: boolean;
  within_messaging_window: boolean;
}>;

export type AtlasLocalTraceEvent = Readonly<{
  id: string;
  type: string;
  at: string;
  data: Readonly<Record<string, unknown>>;
}>;

export type AtlasLocalTrace = Readonly<{
  id: string;
  conversation_id: string;
  message_id: string;
  status: 'active' | 'approval_pending' | 'handoff_required' | 'completed' | 'failed';
  started_at: string;
  completed_at: string | null;
  events: readonly AtlasLocalTraceEvent[];
}>;

export type AtlasLocalReceiptKind = 'message' | 'evidence' | 'policy' | 'approval' | 'action' | 'outcome' | 'outbox' | 'delivery' | 'handoff';

export type AtlasLocalReceipt = Readonly<{
  receipt_id: string;
  kind: AtlasLocalReceiptKind;
  trace_id: string;
  conversation_id: string;
  subject_id: string;
  outcome: string;
  created_at: string;
  project_hash: string;
  digest: string;
  data: Readonly<Record<string, unknown>>;
}>;

export type AtlasLocalEvidence = Readonly<{
  id: string;
  source: string;
  digest: string;
  excerpt: string;
}>;

export type AtlasLocalProposal = Readonly<{
  id: string;
  trace_id: string;
  conversation_id: string;
  message_id: string;
  tool_id: 'front-desk.bookings.reschedule';
  risk: 'high';
  execution: 'commit';
  approval: 'required';
  input: Readonly<Record<string, string>>;
  status: 'proposed' | 'committed' | 'rejected' | 'cancelled';
  created_at: string;
}>;

export type AtlasLocalPolicyDecision = Readonly<{
  decision: 'allowed' | 'approval_required' | 'blocked';
  reason: string;
  risk: 'none' | 'high';
}>;

export type AtlasLocalApproval = Readonly<{
  id: string;
  proposal_id: string;
  trace_id: string;
  conversation_id: string;
  scope: AtlasLocalAuthorityScope;
  policy_ref: string;
  expires_at: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  requested_at: string;
  decided_at: string | null;
  operator_id: string | null;
  reason: string | null;
  action_id: string | null;
}>;

export type AtlasLocalAction = Readonly<{
  id: string;
  proposal_id: string;
  trace_id: string;
  conversation_id: string;
  tool_id: string;
  idempotency_key: string;
  input_digest: string;
  input: Readonly<Record<string, unknown>>;
  result: Readonly<Record<string, unknown>>;
  committed_at: string;
}>;

export type AtlasLocalOutboxState = 'queued' | 'retry_scheduled' | 'sent' | 'delivered' | 'read' | 'rejected' | 'failed';

export type AtlasLocalOutboxMessage = Readonly<{
  id: string;
  trace_id: string;
  conversation_id: string;
  customer_id: string;
  channel_id: string;
  body: string;
  state: AtlasLocalOutboxState;
  attempts: number;
  next_attempt_at: string | null;
  retry_after_ms: number | null;
  provider_message_id: string | null;
  provider_code: string | null;
  provider_occurred_at?: string | null;
  created_at: string;
  updated_at: string;
}>;

export type AtlasLocalConversation = Readonly<{
  id: string;
  customer_id: string;
  channel_id: string;
  state: 'automated' | 'approval_pending' | 'human_handoff' | 'human_takeover' | 'completed';
  last_sequence: number;
  operator_id: string | null;
  handoff_reason: string | null;
  takeover: AtlasLocalTakeover | null;
  created_at: string;
  updated_at: string;
}>;

export type AtlasLocalRuntimeSnapshot = Readonly<{
  schema_version: typeof ATLAS_LOCAL_RUNTIME_VERSION;
  identity: Readonly<{
    mode: 'local';
    tenant_id: string;
    project_name: string;
    project_hash: string;
    runtime_version: typeof ATLAS_LOCAL_RUNTIME_VERSION;
  }>;
  conversations: Readonly<Record<string, AtlasLocalConversation>>;
  customers: Readonly<Record<string, Readonly<{ id: string; created_at: string }>>>;
  messages: readonly AtlasLocalInboundMessage[];
  proposals: Readonly<Record<string, AtlasLocalProposal>>;
  approvals: Readonly<Record<string, AtlasLocalApproval>>;
  actions: readonly AtlasLocalAction[];
  outbox: readonly AtlasLocalOutboxMessage[];
  traces: readonly AtlasLocalTrace[];
  receipts: readonly AtlasLocalReceipt[];
  bookings: Readonly<Record<string, Readonly<{ id: string; scheduled_for: string; updated_at: string }>>>;
}>;

type StoredInboundResult = Readonly<{
  digest: string;
  result: Record<string, any>;
}>;

type StoredCommitResult = Readonly<{
  digest: string;
  result: Record<string, any>;
}>;

type PendingMessage = Readonly<{
  digest: string;
  message: AtlasLocalInboundMessage;
}>;

type MutableState = {
  schema_version: typeof ATLAS_LOCAL_RUNTIME_VERSION;
  identity: {
    mode: 'local';
    tenant_id: string;
    project_name: string;
    project_hash: string;
    runtime_version: typeof ATLAS_LOCAL_RUNTIME_VERSION;
  };
  conversations: Record<string, AtlasLocalConversation>;
  customers: Record<string, { id: string; created_at: string }>;
  messages: AtlasLocalInboundMessage[];
  pending_messages: Record<string, Record<string, PendingMessage>>;
  inbound_idempotency: Record<string, StoredInboundResult>;
  proposals: Record<string, AtlasLocalProposal>;
  approvals: Record<string, AtlasLocalApproval>;
  actions: AtlasLocalAction[];
  action_idempotency: Record<string, StoredCommitResult>;
  commit_results: Record<string, Record<string, any>>;
  outbox: AtlasLocalOutboxMessage[];
  callbacks: Record<string, StoredCommitResult>;
  traces: AtlasLocalTrace[];
  receipts: AtlasLocalReceipt[];
  bookings: Record<string, { id: string; scheduled_for: string; updated_at: string }>;
};

export type AtlasLocalRuntimeOptions = Readonly<{
  root: string;
  clock?: () => string;
}>;

export class AtlasLocalRuntime {
  readonly root: string;
  readonly statePath: string;
  readonly clock: () => string;
  private readonly knowledge: AtlasLocalEvidence;
  private state: MutableState;
  private persistTail: Promise<void> = Promise.resolve();
  private readonly commitGuards = new Set<(operation: () => Promise<void>) => Promise<void>>();

  private constructor(root: string, state: MutableState, knowledge: AtlasLocalEvidence, clock: () => string) {
    this.root = root;
    this.statePath = path.join(root, ATLAS_LOCAL_STATE_FILE);
    this.state = state;
    this.knowledge = knowledge;
    this.clock = clock;
  }

  static async open(options: AtlasLocalRuntimeOptions): Promise<AtlasLocalRuntime> {
    const root = path.resolve(options.root);
    const clock = options.clock ?? (() => new Date().toISOString());
    const project = await loadAtlasProject(root);
    const knowledgePath = path.join(root, 'knowledge', 'booking-policy.md');
    const knowledgeRaw = await readUtf8Safe(knowledgePath);
    if (knowledgeRaw === null) {
      throw new AtlasLocalRuntimeError('PROJECT_STATE_MISMATCH', 'The front-desk booking knowledge file is missing', {
        nextAction: 'Restore knowledge/booking-policy.md or rerun atlas init front-desk',
      });
    }
    const knowledge: AtlasLocalEvidence = {
      id: deterministicId('evidence', project.package_hash, 'knowledge/booking-policy.md'),
      source: 'knowledge/booking-policy.md',
      digest: sha256(knowledgeRaw),
      excerpt: firstMeaningfulLine(knowledgeRaw),
    };
    const statePath = path.join(root, ATLAS_LOCAL_STATE_FILE);
    const existing = await readUtf8Safe(statePath);
    let state: MutableState;
    if (existing === null) {
      const now = clock();
      state = {
        schema_version: ATLAS_LOCAL_RUNTIME_VERSION,
        identity: {
          mode: 'local',
          tenant_id: deterministicId('tenant', project.package_hash),
          project_name: project.config.project.name,
          project_hash: project.package_hash,
          runtime_version: ATLAS_LOCAL_RUNTIME_VERSION,
        },
        conversations: {},
        customers: {},
        messages: [],
        pending_messages: {},
        inbound_idempotency: {},
        proposals: {},
        approvals: {},
        actions: [],
        action_idempotency: {},
        commit_results: {},
        outbox: [],
        callbacks: {},
        traces: [],
        receipts: [],
        bookings: {
          'BK-100': { id: 'BK-100', scheduled_for: 'Thursday', updated_at: now },
        },
      };
      const runtime = new AtlasLocalRuntime(root, state, knowledge, clock);
      await runtime.persist();
      return runtime;
    }
    state = parseState(existing);
    if (state.identity.project_hash !== project.package_hash) {
      throw new AtlasLocalRuntimeError('PROJECT_STATE_MISMATCH', 'Local runtime state belongs to a different Atlas project hash', {
        nextAction: 'Run atlas upgrade or remove only .atlas/runtime-state.json after preserving required local evidence',
      });
    }
    const migrated = migrateTakeoverState(state);
    const runtime = new AtlasLocalRuntime(root, migrated.state, knowledge, clock);
    if (migrated.changed) await runtime.persist();
    return runtime;
  }

  async reload(): Promise<void> {
    await this.persistTail;
    const existing = await readUtf8Safe(this.statePath);
    if (existing === null) {
      throw new AtlasLocalRuntimeError('PROJECT_STATE_MISMATCH', 'Local Atlas runtime state disappeared during coordination', {
        nextAction: 'Restore the local runtime state before retrying the Mission operation',
      });
    }
    const state = parseState(existing);
    if (state.identity.project_hash !== this.state.identity.project_hash) {
      throw new AtlasLocalRuntimeError('PROJECT_STATE_MISMATCH', 'Local Atlas runtime state changed to a different Atlas project', {
        nextAction: 'Inspect the local runtime state before retrying the Mission operation',
      });
    }
    this.state = state;
  }

  addCommitGuard(guard: (operation: () => Promise<void>) => Promise<void>): () => void {
    this.commitGuards.add(guard);
    return () => this.commitGuards.delete(guard);
  }

  pendingMessages(conversationId: string): readonly AtlasLocalInboundMessage[] {
    return Object.values(this.state.pending_messages[conversationId] ?? {})
      .map((pending) => pending.message)
      .sort((left, right) => left.sequence - right.sequence)
      .map((message) => deepClone(message));
  }

  snapshot(): AtlasLocalRuntimeSnapshot {
    return deepClone({
      schema_version: this.state.schema_version,
      identity: this.state.identity,
      conversations: this.state.conversations,
      customers: this.state.customers,
      messages: this.state.messages,
      proposals: this.state.proposals,
      approvals: this.state.approvals,
      actions: this.state.actions,
      outbox: this.state.outbox,
      traces: this.state.traces,
      receipts: this.state.receipts,
      bookings: this.state.bookings,
    });
  }

  async receiveMessage(value: unknown): Promise<Record<string, any>> {
    const message = normalizeInbound(value);
    const digest = sha256(stableJson(message));
    const existing = this.state.inbound_idempotency[message.message_id];
    if (existing) {
      if (existing.digest !== digest) throw idempotencyMismatch('message', message.message_id);
      return { ...deepClone(existing.result), replayed: true };
    }

    const conversation = this.ensureConversation(message);
    if (conversation.takeover || conversation.state === 'human_takeover') {
      const result = this.fenceInboundMessage(message);
      this.state.inbound_idempotency[message.message_id] = { digest, result };
      await this.persist();
      return deepClone(result);
    }
    if (message.sequence > conversation.last_sequence + 1) {
      const result = {
        status: 'held_out_of_order',
        replayed: false,
        message_id: message.message_id,
        conversation_id: message.conversation_id,
        expected_sequence: conversation.last_sequence + 1,
        received_sequence: message.sequence,
        next_action: `Deliver sequence ${conversation.last_sequence + 1} before replaying ${message.message_id}`,
      };
      this.state.pending_messages[message.conversation_id] ??= {};
      const pendingKey = String(message.sequence);
      const existingPending = this.state.pending_messages[message.conversation_id]![pendingKey];
      if (existingPending) {
        if (existingPending.digest !== digest) {
          throw new AtlasLocalRuntimeError('CONFLICT', `Conversation ${message.conversation_id} already has a different pending message at sequence ${message.sequence}`, {
            nextAction: 'Replay the original pending message or use the next available sequence',
          });
        }
        this.state.inbound_idempotency[message.message_id] = { digest, result };
        await this.persist();
        return deepClone({ ...result, replayed: true });
      }
      this.state.pending_messages[message.conversation_id]![pendingKey] = { digest, message };
      this.state.inbound_idempotency[message.message_id] = { digest, result };
      await this.persist();
      return deepClone(result);
    }
    if (message.sequence <= conversation.last_sequence) {
      throw new AtlasLocalRuntimeError('OUT_OF_ORDER_MESSAGE', `Message sequence ${message.sequence} is older than conversation sequence ${conversation.last_sequence}`, {
        nextAction: 'Replay the original message identifier or start a new monotonically ordered message',
      });
    }

    const result = this.processMessage(message, digest);
    const drained: string[] = [];
    let nextSequence = this.state.conversations[message.conversation_id]!.last_sequence + 1;
    const pending = this.state.pending_messages[message.conversation_id] ?? {};
    while (pending[String(nextSequence)]) {
      const queued = pending[String(nextSequence)]!;
      delete pending[String(nextSequence)];
      this.processMessage(queued.message, queued.digest);
      drained.push(queued.message.message_id);
      nextSequence += 1;
    }
    if (Object.keys(pending).length === 0) delete this.state.pending_messages[message.conversation_id];
    const finalResult = { ...result, drained_message_ids: drained };
    this.state.inbound_idempotency[message.message_id] = { digest, result: finalResult };
    await this.persist();
    return deepClone(finalResult);
  }

  async decideApproval(approvalId: string, decision: Readonly<{
    decision: 'approved' | 'rejected';
    operator_id: string;
    reason?: string;
    scope?: AtlasLocalAuthorityScope;
  }>): Promise<Record<string, any>> {
    const approval = this.state.approvals[approvalId];
    if (!approval) throw notFound('approval', approvalId);
    const operatorId = normalizeOperatorId(decision.operator_id);
    const approvalScope = approval.scope ?? localAuthorityScope(this.state.identity);
    if (decision.scope && !sameAuthorityScope(decision.scope, approvalScope)) {
      throw new AtlasLocalRuntimeError('AUTHORIZATION_FAILED', `Approval ${approvalId} is outside the supplied operator scope`, {
        nextAction: 'Use the server-derived scope bound to this Mission approval',
      });
    }
    const conversation = this.state.conversations[approval.conversation_id];
    if (conversation?.takeover || conversation?.state === 'human_takeover') {
      throw new AtlasLocalRuntimeError('CONFLICT', `Conversation ${approval.conversation_id} is under human control`, {
        nextAction: 'Do not decide an approval after human takeover',
      });
    }
    if (approval.status === 'pending' && approval.expires_at && Date.parse(this.clock()) >= Date.parse(approval.expires_at)) {
      throw new AtlasLocalRuntimeError('CONFLICT', `Approval ${approvalId} has expired`, {
        nextAction: 'Create a new governed proposal instead of deciding an expired approval',
      });
    }
    if (approval.status === 'approved' && approval.action_id) {
      const committed = this.state.commit_results[approval.action_id];
      if (!committed) throw new AtlasLocalRuntimeError('PROJECT_STATE_MISMATCH', 'Approved action result is missing from local state');
      await this.persist();
      return { ...deepClone(committed), replayed: true };
    }
    if (approval.status !== 'pending') {
      throw new AtlasLocalRuntimeError('CONFLICT', `Approval ${approvalId} is already ${approval.status}`, {
        nextAction: 'Inspect the existing approval and action receipts',
      });
    }
    const now = this.clock();
    const proposal = this.state.proposals[approval.proposal_id];
    if (!proposal) throw notFound('proposal', approval.proposal_id);
    if (decision.decision === 'rejected') {
      this.state.approvals[approvalId] = { ...approval, status: 'rejected', decided_at: now, operator_id: operatorId, reason: decision.reason ?? null };
      this.state.proposals[proposal.id] = { ...proposal, status: 'rejected' };
      const conversation = this.state.conversations[approval.conversation_id]!;
      this.state.conversations[conversation.id] = { ...conversation, state: 'human_handoff', handoff_reason: decision.reason ?? 'approval_rejected', updated_at: now };
      this.appendTraceEvent(approval.trace_id, 'approval.rejected', { approval_id: approval.id, operator_id: operatorId, reason: decision.reason ?? null });
      const receipt = this.addReceipt('approval', approval.trace_id, approval.conversation_id, approval.id, 'rejected', { operator_id: operatorId, reason: decision.reason ?? null });
      this.completeTrace(approval.trace_id, 'handoff_required');
      await this.persist();
      return { status: 'rejected', replayed: false, approval: this.state.approvals[approvalId], receipt, trace: this.trace(approval.trace_id) };
    }
    return this.commitProposal(proposal.id, {
      idempotency_key: `approval:${approval.id}`,
      operator_id: operatorId,
      input: proposal.input,
    });
  }

  async commitProposal(proposalId: string, request: Readonly<{ idempotency_key: string; operator_id: string; input: Readonly<Record<string, unknown>> }>): Promise<Record<string, any>> {
    const proposal = this.state.proposals[proposalId];
    if (!proposal) throw notFound('proposal', proposalId);
    if (!request.idempotency_key || !request.operator_id) throw new AtlasLocalRuntimeError('INVALID_MESSAGE', 'Commit requires idempotency_key and operator_id');
    const inputDigest = sha256(stableJson(request.input));
    const expectedDigest = sha256(stableJson(proposal.input));
    const commitDigest = sha256(stableJson({ proposal_id: proposalId, input: request.input }));
    const prior = this.state.action_idempotency[request.idempotency_key];
    if (prior) {
      if (prior.digest !== commitDigest) throw idempotencyMismatch('action', request.idempotency_key);
      return { ...deepClone(prior.result), replayed: true };
    }
    if (inputDigest !== expectedDigest) {
      throw new AtlasLocalRuntimeError('CONFLICT', 'Committed input does not match the approved proposal', {
        nextAction: 'Create a new proposal for changed business input',
      });
    }
    if (proposal.status === 'committed') {
      const existingAction = this.state.actions.find((action) => action.proposal_id === proposal.id);
      if (!existingAction) throw new AtlasLocalRuntimeError('PROJECT_STATE_MISMATCH', 'Committed proposal has no action ledger entry');
      const existing = this.state.commit_results[existingAction.id];
      if (!existing) throw new AtlasLocalRuntimeError('PROJECT_STATE_MISMATCH', 'Committed proposal has no result record');
      return { ...deepClone(existing), replayed: true };
    }
    if (proposal.status !== 'proposed') {
      throw new AtlasLocalRuntimeError('CONFLICT', `Proposal ${proposal.id} is ${proposal.status}`, {
        nextAction: 'Create a new governed proposal before committing',
      });
    }

    const previousState = deepClone(this.state);
    const now = this.clock();
    const approval = Object.values(this.state.approvals).find((item) => item.proposal_id === proposal.id);
    if (!approval) throw new AtlasLocalRuntimeError('PROJECT_STATE_MISMATCH', 'High-risk proposal has no approval record');
    if (approval.expires_at && Date.parse(now) >= Date.parse(approval.expires_at)) {
      throw new AtlasLocalRuntimeError('CONFLICT', `Approval ${approval.id} has expired`, {
        nextAction: 'Create a new governed proposal instead of committing an expired approval',
      });
    }
    const guardedConversation = this.state.conversations[proposal.conversation_id];
    if (guardedConversation?.takeover || guardedConversation?.state === 'human_takeover') {
      throw new AtlasLocalRuntimeError('AUTHORIZATION_FAILED', `Conversation ${proposal.conversation_id} is under human control`, {
        nextAction: 'Do not commit agent work after human takeover',
      });
    }
    if (approval.status === 'pending') {
      this.state.approvals[approval.id] = { ...approval, status: 'approved', decided_at: now, operator_id: request.operator_id, reason: 'explicit_operator_commit' };
    } else if (approval.status !== 'approved') {
      throw new AtlasLocalRuntimeError('CONFLICT', `Approval ${approval.id} is ${approval.status}`);
    }
    const effectiveApproval = this.state.approvals[approval.id]!;
    const bookingId = stringField(request.input, 'bookingId');
    const requestedDate = stringField(request.input, 'requestedDate');
    const booking = this.state.bookings[bookingId] ?? { id: bookingId, scheduled_for: 'unknown', updated_at: now };
    const actionId = deterministicId('action', proposal.id, request.idempotency_key);
    const resultData = { booking_id: bookingId, previous_date: booking.scheduled_for, scheduled_for: requestedDate };
    const action: AtlasLocalAction = {
      id: actionId,
      proposal_id: proposal.id,
      trace_id: proposal.trace_id,
      conversation_id: proposal.conversation_id,
      tool_id: proposal.tool_id,
      idempotency_key: request.idempotency_key,
      input_digest: inputDigest,
      input: deepClone(request.input),
      result: resultData,
      committed_at: now,
    };
    this.state.bookings[bookingId] = { id: bookingId, scheduled_for: requestedDate, updated_at: now };
    this.state.actions.push(action);
    this.state.proposals[proposal.id] = { ...proposal, status: 'committed' };
    this.state.approvals[approval.id] = { ...effectiveApproval, status: 'approved', action_id: actionId, operator_id: effectiveApproval.operator_id ?? request.operator_id, decided_at: effectiveApproval.decided_at ?? now };

    const message = this.state.messages.find((item) => item.message_id === proposal.message_id);
    if (!message) throw new AtlasLocalRuntimeError('PROJECT_STATE_MISMATCH', 'Proposal source message is missing');
    const outbox: AtlasLocalOutboxMessage = {
      id: deterministicId('outbox', actionId),
      trace_id: proposal.trace_id,
      conversation_id: proposal.conversation_id,
      customer_id: message.customer_id,
      channel_id: message.channel_id,
      body: `Your booking ${bookingId} has been moved to ${requestedDate}.`,
      state: 'queued',
      attempts: 0,
      next_attempt_at: null,
      retry_after_ms: null,
      provider_message_id: null,
      provider_code: null,
      provider_occurred_at: null,
      created_at: now,
      updated_at: now,
    };
    this.state.outbox.push(outbox);

    this.appendTraceEvent(proposal.trace_id, 'approval.approved', { approval_id: approval.id, operator_id: request.operator_id });
    this.appendTraceEvent(proposal.trace_id, 'action.committed', { action_id: action.id, tool_id: action.tool_id, idempotency_key: request.idempotency_key });
    this.appendTraceEvent(proposal.trace_id, 'outbox.enqueued', { outbox_id: outbox.id, channel_id: outbox.channel_id });
    this.appendTraceEvent(proposal.trace_id, 'outcome.recorded', { booking_id: bookingId, scheduled_for: requestedDate });
    this.completeTrace(proposal.trace_id, 'completed');

    const approvalReceipt = this.addReceipt('approval', proposal.trace_id, proposal.conversation_id, approval.id, 'approved', { operator_id: request.operator_id });
    const actionReceipt = this.addReceipt('action', proposal.trace_id, proposal.conversation_id, action.id, 'committed', { tool_id: action.tool_id, idempotency_key: request.idempotency_key, result: resultData });
    const outcomeReceipt = this.addReceipt('outcome', proposal.trace_id, proposal.conversation_id, action.id, 'booking_rescheduled', resultData);
    const outboxReceipt = this.addReceipt('outbox', proposal.trace_id, proposal.conversation_id, outbox.id, 'queued', { channel_id: outbox.channel_id });
    const conversation = this.state.conversations[proposal.conversation_id]!;
    this.state.conversations[conversation.id] = { ...conversation, state: 'completed', updated_at: now };
    const receipts = [approvalReceipt, actionReceipt, outcomeReceipt, outboxReceipt];
    const commitResult = {
      status: 'committed',
      replayed: false,
      proposal: this.state.proposals[proposal.id],
      approval: this.state.approvals[approval.id],
      action,
      outbox,
      action_receipt: actionReceipt,
      receipts,
      trace: this.trace(proposal.trace_id),
      next_action: `Deliver outbox message ${outbox.id}`,
    };
    this.state.action_idempotency[request.idempotency_key] = { digest: commitDigest, result: commitResult };
    this.state.commit_results[actionId] = commitResult;
    try {
      await this.persist();
    } catch (error) {
      this.state = previousState;
      throw error;
    }
    return deepClone(commitResult);
  }

  async returnToAgent(
    conversationId: string,
    request: Readonly<{
      operator_id: string;
      reason: string;
      scope?: AtlasLocalAuthorityScope;
      mission_receipts?: readonly Readonly<{ mission_id: string; trace_id?: string }>[];
    }>,
  ): Promise<Record<string, any>> {
    const operatorId = normalizeOperatorId(request.operator_id);
    if (!request.reason.trim()) throw new AtlasLocalRuntimeError('INVALID_MESSAGE', 'Returning control to the Agent requires operator_id and reason');
    const authorityScope = localAuthorityScope(this.state.identity);
    if (request.scope && !sameAuthorityScope(request.scope, authorityScope)) {
      throw new AtlasLocalRuntimeError('AUTHORIZATION_FAILED', 'Return-to-Agent scope must match the runtime-derived authority scope', {
        nextAction: 'Use the server-derived local authority scope for return-to-Agent',
      });
    }
    const scope = authorityScope;
    const conversation = this.state.conversations[conversationId];
    if (!conversation?.takeover || conversation.state !== 'human_takeover') {
      throw new AtlasLocalRuntimeError('CONFLICT', `Conversation ${conversationId} is not under human control`, {
        nextAction: 'Return control only after an explicit human takeover',
      });
    }
    if (conversation.takeover.operator_id !== operatorId || !sameAuthorityScope(conversation.takeover.scope, scope)) {
      throw new AtlasLocalRuntimeError('AUTHORIZATION_FAILED', `Operator ${operatorId} cannot return control for conversation ${conversationId}`, {
        nextAction: 'Use the recorded takeover operator and authority scope',
      });
    }
    const now = this.clock();
    this.state.conversations[conversationId] = {
      ...conversation,
      state: 'automated',
      operator_id: null,
      handoff_reason: request.reason,
      takeover: null,
      updated_at: now,
    };
    const receipts: AtlasLocalReceipt[] = [];
    const requestedReceipts = request.mission_receipts ?? [{ mission_id: conversationId }];
    for (const requested of requestedReceipts) {
      const trace = requested.trace_id
        ? this.state.traces.find((candidate) => candidate.id === requested.trace_id && candidate.conversation_id === conversationId)
        : undefined;
      const traceId = trace?.id ?? deterministicId('mission-return-trace', requested.mission_id);
      if (trace) {
        this.appendTraceEvent(trace.id, 'human.returned_to_agent', { operator_id: operatorId, reason: request.reason, scope, mission_id: requested.mission_id });
      }
      receipts.push(this.addReceipt('handoff', traceId, conversationId, requested.mission_id, 'returned_to_agent', {
        operator_id: operatorId,
        reason: request.reason,
        scope,
        mission_id: requested.mission_id,
      }));
    }
    await this.persist();
    return { conversation_id: conversationId, state: 'automated', operator_id: operatorId, reason: request.reason, scope, receipts, replayed: false };
  }

  async takeHumanControl(conversationId: string, request: Readonly<{ operator_id: string; reason: string; scope?: AtlasLocalAuthorityScope; channel_id?: string }>): Promise<Record<string, any>> {
    const operatorId = normalizeOperatorId(request.operator_id);
    if (!request.reason.trim()) throw new AtlasLocalRuntimeError('INVALID_MESSAGE', 'Human takeover requires operator_id and reason');
    const authorityScope = localAuthorityScope(this.state.identity);
    if (request.scope && !sameAuthorityScope(request.scope, authorityScope)) {
      throw new AtlasLocalRuntimeError('AUTHORIZATION_FAILED', 'Human takeover scope must match the runtime-derived authority scope', {
        nextAction: 'Use the server-derived local authority scope for takeover',
      });
    }
    const scope = authorityScope;
    let conversation = this.state.conversations[conversationId];
    if (!conversation) {
      const now = this.clock();
      const takeover: AtlasLocalTakeover = {
        operator_id: operatorId,
        scope,
        reason: request.reason,
        taken_over_at: now,
      };
      conversation = {
        id: conversationId,
        customer_id: unboundCustomerId(conversationId),
        channel_id: request.channel_id?.trim() || 'unbound-local-channel',
        state: 'human_takeover',
        last_sequence: 0,
        operator_id: operatorId,
        handoff_reason: request.reason,
        takeover,
        created_at: now,
        updated_at: now,
      };
      this.state.conversations[conversationId] = conversation;
      await this.persist();
      return {
        conversation_id: conversationId,
        state: 'human_takeover',
        operator_id: operatorId,
        reason: request.reason,
        scope,
        cancelled_approval_ids: [],
      };
    }
    if (conversation.takeover) {
      if (conversation.takeover.operator_id === operatorId && sameAuthorityScope(conversation.takeover.scope, scope) && conversation.takeover.reason === request.reason) {
        return { conversation_id: conversationId, state: 'human_takeover', operator_id: operatorId, reason: request.reason, scope, cancelled_approval_ids: [], replayed: true };
      }
      throw new AtlasLocalRuntimeError('AUTHORIZATION_FAILED', `Conversation ${conversationId} is already under human control`, {
        nextAction: 'Use the recorded takeover identity or an explicit governed return-to-agent command',
      });
    }
    const now = this.clock();
    const takeover: AtlasLocalTakeover = { operator_id: operatorId, scope, reason: request.reason, taken_over_at: now };
    this.state.conversations[conversationId] = { ...conversation, state: 'human_takeover', operator_id: operatorId, handoff_reason: request.reason, takeover, updated_at: now };
    const cancelled: string[] = [];
    for (const approval of Object.values(this.state.approvals)) {
      if (approval.conversation_id !== conversationId || approval.status !== 'pending') continue;
      this.state.approvals[approval.id] = { ...approval, status: 'cancelled', decided_at: now, operator_id: operatorId, reason: request.reason };
      const proposal = this.state.proposals[approval.proposal_id];
      if (proposal) this.state.proposals[proposal.id] = { ...proposal, status: 'cancelled' };
      this.appendTraceEvent(approval.trace_id, 'human.takeover', { operator_id: operatorId, reason: request.reason, scope, approval_id: approval.id });
      this.completeTrace(approval.trace_id, 'handoff_required');
      this.addReceipt('handoff', approval.trace_id, conversationId, conversationId, 'human_takeover', { operator_id: operatorId, reason: request.reason, scope });
      cancelled.push(approval.id);
    }
    const pending = this.state.pending_messages[conversationId] ?? {};
    for (const queued of Object.values(pending).sort((left, right) => left.message.sequence - right.message.sequence)) {
      const result = this.fenceInboundMessage(queued.message);
      this.state.inbound_idempotency[queued.message.message_id] = { digest: queued.digest, result };
    }
    delete this.state.pending_messages[conversationId];
    await this.persist();
    return { conversation_id: conversationId, state: 'human_takeover', operator_id: operatorId, reason: request.reason, scope, cancelled_approval_ids: cancelled };
  }

  async attemptDelivery(outboxId: string, attempt: Readonly<{
    outcome: 'transient_failure' | 'permanent_rejection' | 'accepted' | 'delivered';
    provider_code?: string;
    provider_message_id?: string;
  }>): Promise<Record<string, any>> {
    const index = this.state.outbox.findIndex((item) => item.id === outboxId);
    if (index < 0) throw notFound('outbox message', outboxId);
    const current = this.state.outbox[index]!;
    const conversation = this.state.conversations[current.conversation_id];
    if (conversation?.takeover || conversation?.state === 'human_takeover') {
      throw new AtlasLocalRuntimeError('AUTHORIZATION_FAILED', `Conversation ${current.conversation_id} is under human control`, {
        nextAction: 'Do not deliver agent outbox work after human takeover',
      });
    }
    if (['delivered', 'read', 'rejected', 'failed'].includes(current.state)) {
      throw new AtlasLocalRuntimeError('CONFLICT', `Outbox message ${outboxId} is terminal in state ${current.state}`, {
        nextAction: 'Inspect its delivery receipt instead of retrying',
      });
    }
    const now = this.clock();
    if (current.state === 'retry_scheduled' && current.next_attempt_at && Date.parse(now) < Date.parse(current.next_attempt_at)) {
      throw new AtlasLocalRuntimeError('RETRY_NOT_READY', `Outbox message ${outboxId} is not ready for retry`, {
        retryable: true,
        nextAction: `Retry at or after ${current.next_attempt_at}`,
      });
    }
    const attempts = current.attempts + 1;
    let updated: AtlasLocalOutboxMessage;
    let outcome: string;
    if (attempt.outcome === 'transient_failure') {
      const retryAfter = Math.min(60_000, 1000 * 2 ** Math.max(0, attempts - 1));
      updated = { ...current, state: 'retry_scheduled', attempts, retry_after_ms: retryAfter, next_attempt_at: new Date(Date.parse(now) + retryAfter).toISOString(), provider_code: attempt.provider_code ?? 'TRANSIENT_FAILURE', updated_at: now };
      outcome = 'retry_scheduled';
    } else if (attempt.outcome === 'permanent_rejection') {
      updated = { ...current, state: 'rejected', attempts, retry_after_ms: null, next_attempt_at: null, provider_code: attempt.provider_code ?? 'PERMANENT_REJECTION', updated_at: now };
      outcome = 'rejected';
    } else if (attempt.outcome === 'accepted') {
      if (!attempt.provider_message_id) throw new AtlasLocalRuntimeError('INVALID_MESSAGE', 'accepted delivery requires provider_message_id');
      const conflictingOutbox = this.state.outbox.find((item) => item.id !== outboxId && item.provider_message_id === attempt.provider_message_id);
      if (conflictingOutbox) {
        throw new AtlasLocalRuntimeError('IDEMPOTENCY_MISMATCH', `Provider message identity ${attempt.provider_message_id} is already bound to outbox ${conflictingOutbox.id}`, {
          nextAction: 'Replay the original provider identity or use a new provider message identity',
        });
      }
      if (current.state === 'sent') {
        if (current.provider_message_id !== attempt.provider_message_id) {
          throw new AtlasLocalRuntimeError('IDEMPOTENCY_MISMATCH', `Outbox message ${outboxId} provider identity does not match the recorded provider message`, {
            nextAction: 'Replay the original provider identity or use a new outbox message',
          });
        }
        return { delivery: deepClone(current), replayed: true };
      }
      if (current.provider_message_id && current.provider_message_id !== attempt.provider_message_id) {
        throw new AtlasLocalRuntimeError('IDEMPOTENCY_MISMATCH', `Outbox message ${outboxId} provider identity does not match the recorded provider message`, {
          nextAction: 'Replay the original provider identity or use a new outbox message',
        });
      }
      updated = { ...current, state: 'sent', attempts, retry_after_ms: null, next_attempt_at: null, provider_message_id: attempt.provider_message_id, provider_code: attempt.provider_code ?? null, provider_occurred_at: now, updated_at: now };
      outcome = 'accepted';
    } else {
      const providerMessageId = attempt.provider_message_id ?? current.provider_message_id;
      if (!providerMessageId) {
        throw new AtlasLocalRuntimeError('INVALID_MESSAGE', 'delivered outcome requires provider_message_id', {
          nextAction: 'Provide the provider message identity before recording delivery',
        });
      }
      const conflictingOutbox = this.state.outbox.find((item) => item.id !== outboxId && item.provider_message_id === providerMessageId);
      if (conflictingOutbox) {
        throw new AtlasLocalRuntimeError('IDEMPOTENCY_MISMATCH', `Provider message identity ${providerMessageId} is already bound to outbox ${conflictingOutbox.id}`, {
          nextAction: 'Replay the original provider identity or use a new provider message identity',
        });
      }
      if (current.provider_message_id && attempt.provider_message_id && current.provider_message_id !== attempt.provider_message_id) {
        throw new AtlasLocalRuntimeError('IDEMPOTENCY_MISMATCH', `Outbox message ${outboxId} provider identity does not match the recorded provider message`, {
          nextAction: 'Replay the original provider identity or use a new outbox message',
        });
      }
      updated = { ...current, state: 'delivered', attempts, retry_after_ms: null, next_attempt_at: null, provider_message_id: providerMessageId, provider_code: attempt.provider_code ?? null, provider_occurred_at: current.provider_occurred_at ?? now, updated_at: now };
      outcome = 'delivered';
    }
    this.state.outbox[index] = updated;
    this.appendTraceEvent(current.trace_id, 'delivery.attempted', { outbox_id: outboxId, attempt: attempts, outcome, provider_code: updated.provider_code });
    if (outcome === 'delivered' || outcome === 'rejected') this.appendTraceEvent(current.trace_id, `delivery.${outcome}`, { outbox_id: outboxId, provider_message_id: updated.provider_message_id });
    const receipt = this.addReceipt('delivery', current.trace_id, current.conversation_id, outboxId, outcome, {
      attempts,
      state: updated.state,
      provider_message_id: updated.provider_message_id,
      provider_code: updated.provider_code,
      retry_after_ms: updated.retry_after_ms,
    });
    await this.persist();
    return { delivery: updated, receipt, replayed: false };
  }

  deliveryCallbackReplay(callback: Readonly<{
    callback_id: string;
    provider_message_id: string;
    state: 'sent' | 'delivered' | 'read' | 'failed';
    occurred_at: string;
  }>): Record<string, any> | null {
    if (!callback.callback_id || !callback.provider_message_id || !isIsoDate(callback.occurred_at)) return null;
    const prior = this.state.callbacks[callback.callback_id];
    if (!prior) return null;
    const digest = sha256(stableJson(callback));
    if (prior.digest !== digest) throw idempotencyMismatch('delivery callback', callback.callback_id);
    return { ...deepClone(prior.result), replayed: true };
  }

  async applyDeliveryCallback(callback: Readonly<{
    callback_id: string;
    provider_message_id: string;
    state: 'sent' | 'delivered' | 'read' | 'failed';
    occurred_at: string;
  }>): Promise<Record<string, any>> {
    if (!callback.callback_id || !callback.provider_message_id || !isIsoDate(callback.occurred_at)) {
      throw new AtlasLocalRuntimeError('INVALID_MESSAGE', 'Delivery callback identity, provider message identity, and occurred_at are required');
    }
    const digest = sha256(stableJson(callback));
    const prior = this.state.callbacks[callback.callback_id];
    if (prior) {
      if (prior.digest !== digest) throw idempotencyMismatch('delivery callback', callback.callback_id);
      await this.persist();
      return { ...deepClone(prior.result), replayed: true };
    }
    const matchingOutboxes = this.state.outbox.filter((item) => item.provider_message_id === callback.provider_message_id);
    if (matchingOutboxes.length > 1) {
      throw new AtlasLocalRuntimeError('IDEMPOTENCY_MISMATCH', `Provider message identity ${callback.provider_message_id} is ambiguous across outbox messages`, {
        nextAction: 'Repair the duplicate provider identity before applying callbacks',
      });
    }
    const index = this.state.outbox.findIndex((item) => item.provider_message_id === callback.provider_message_id);
    if (index < 0) throw notFound('provider delivery', callback.provider_message_id);
    const current = this.state.outbox[index]!;
    if (!isLegalDeliveryCallbackTransition(current.state, callback.state)) {
      throw new AtlasLocalRuntimeError('DELIVERY_STATE_REGRESSION', `Delivery callback would regress ${current.state} to ${callback.state}`, {
        nextAction: 'Ignore stale callbacks and preserve the existing delivery state',
      });
    }
    if (current.provider_occurred_at && Date.parse(callback.occurred_at) < Date.parse(current.provider_occurred_at)) {
      throw new AtlasLocalRuntimeError('DELIVERY_STATE_REGRESSION', 'Delivery callback occurred before the recorded provider event', {
        nextAction: 'Ignore stale callbacks and preserve the existing delivery state',
      });
    }
    const now = this.clock();
    const updated: AtlasLocalOutboxMessage = { ...current, state: callback.state, provider_occurred_at: callback.occurred_at, updated_at: now };
    this.state.outbox[index] = updated;
    this.appendTraceEvent(current.trace_id, `delivery.callback.${callback.state}`, { callback_id: callback.callback_id, provider_message_id: callback.provider_message_id, occurred_at: callback.occurred_at });
    const receipt = this.addReceipt('delivery', current.trace_id, current.conversation_id, current.id, callback.state, { callback_id: callback.callback_id, provider_message_id: callback.provider_message_id, occurred_at: callback.occurred_at });
    const result = { delivery: updated, receipt, replayed: false };
    this.state.callbacks[callback.callback_id] = { digest, result };
    await this.persist();
    return deepClone(result);
  }

  trace(traceId: string): AtlasLocalTrace {
    const trace = this.state.traces.find((item) => item.id === traceId);
    if (!trace) throw notFound('trace', traceId);
    return deepClone(trace);
  }

  receipts(): readonly AtlasLocalReceipt[] {
    return deepClone(this.state.receipts);
  }

  private fenceInboundMessage(message: AtlasLocalInboundMessage): Record<string, any> {
    const now = this.clock();
    const conversation = this.ensureConversation(message);
    this.state.customers[message.customer_id] ??= { id: message.customer_id, created_at: now };
    if (!this.state.messages.some((item) => item.message_id === message.message_id)) this.state.messages.push(message);
    this.state.conversations[message.conversation_id] = {
      ...conversation,
      last_sequence: Math.max(conversation.last_sequence, message.sequence),
      updated_at: now,
    };
    const trace = this.createTrace(message);
    this.appendTraceEvent(trace.id, 'message.fenced', {
      message_id: message.message_id,
      sequence: message.sequence,
      reason: 'human_takeover',
      operator_id: conversation.takeover?.operator_id ?? conversation.operator_id,
      scope: conversation.takeover?.scope,
    });
    const messageReceipt = this.addReceipt('message', trace.id, message.conversation_id, message.message_id, 'fenced', { sequence: message.sequence });
    const handoffReceipt = this.addReceipt('handoff', trace.id, message.conversation_id, message.conversation_id, 'human_takeover', {
      operator_id: conversation.takeover?.operator_id ?? conversation.operator_id,
      scope: conversation.takeover?.scope,
      reason: conversation.takeover?.reason ?? conversation.handoff_reason ?? 'human_takeover',
    });
    this.completeTrace(trace.id, 'handoff_required');
    return {
      status: 'human_takeover',
      replayed: false,
      message,
      trace_id: trace.id,
      receipts: [messageReceipt, handoffReceipt],
      trace: this.trace(trace.id),
      next_action: 'The recorded human operator owns this conversation; agent mutations are fenced',
    };
  }

  private processMessage(message: AtlasLocalInboundMessage, digest: string): Record<string, any> {
    const takeoverConversation = this.ensureConversation(message);
    if (takeoverConversation.takeover || takeoverConversation.state === 'human_takeover') return this.fenceInboundMessage(message);

    const now = this.clock();
    this.state.customers[message.customer_id] ??= { id: message.customer_id, created_at: now };
    this.state.messages.push(message);
    const conversation = this.state.conversations[message.conversation_id]!;
    this.state.conversations[message.conversation_id] = { ...conversation, last_sequence: message.sequence, updated_at: now };
    const trace = this.createTrace(message);
    this.appendTraceEvent(trace.id, 'message.accepted', { message_id: message.message_id, sequence: message.sequence, channel_id: message.channel_id });
    const messageReceipt = this.addReceipt('message', trace.id, message.conversation_id, message.message_id, 'accepted', { sequence: message.sequence, channel_id: message.channel_id });

    const blockedReason = !message.consent ? 'consent_required' : !message.within_messaging_window ? 'messaging_window_closed' : null;
    if (blockedReason) {
      const policy: AtlasLocalPolicyDecision = { decision: 'blocked', reason: blockedReason, risk: 'high' };
      this.appendTraceEvent(trace.id, 'policy.decided', policy);
      this.appendTraceEvent(trace.id, 'handoff.requested', { reason: blockedReason });
      this.state.conversations[message.conversation_id] = { ...this.state.conversations[message.conversation_id]!, state: 'human_handoff', handoff_reason: blockedReason, updated_at: now };
      const policyReceipt = this.addReceipt('policy', trace.id, message.conversation_id, message.message_id, 'blocked', policy);
      const handoffReceipt = this.addReceipt('handoff', trace.id, message.conversation_id, message.conversation_id, 'required', { reason: blockedReason });
      this.completeTrace(trace.id, 'handoff_required');
      const result = {
        status: 'handoff_required', replayed: false, fixture_model: ATLAS_LOCAL_FIXTURE_MODEL,
        message, trace_id: trace.id, policy, receipts: [messageReceipt, policyReceipt, handoffReceipt], trace: this.trace(trace.id),
        next_action: 'Open human takeover for this conversation',
      };
      this.state.inbound_idempotency[message.message_id] = { digest, result };
      return result;
    }

    this.appendTraceEvent(trace.id, 'knowledge.retrieved', { evidence_id: this.knowledge.id, source: this.knowledge.source, digest: this.knowledge.digest });
    const evidenceReceipt = this.addReceipt('evidence', trace.id, message.conversation_id, this.knowledge.id, 'retrieved', { source: this.knowledge.source, digest: this.knowledge.digest });
    if (isBookingChange(message.text)) {
      const bookingId = extractBookingId(message.text);
      const requestedDate = extractRequestedDate(message.text);
      const proposal: AtlasLocalProposal = {
        id: deterministicId('proposal', message.message_id, bookingId, requestedDate),
        trace_id: trace.id,
        conversation_id: message.conversation_id,
        message_id: message.message_id,
        tool_id: 'front-desk.bookings.reschedule',
        risk: 'high',
        execution: 'commit',
        approval: 'required',
        input: { bookingId, requestedDate },
        status: 'proposed',
        created_at: now,
      };
      const policy: AtlasLocalPolicyDecision = { decision: 'approval_required', reason: 'high_risk_booking_change', risk: 'high' };
      const approval: AtlasLocalApproval = {
        id: deterministicId('approval', proposal.id), proposal_id: proposal.id, trace_id: trace.id, conversation_id: message.conversation_id,
        scope: localAuthorityScope(this.state.identity),
        policy_ref: 'atlas.local.fixture/high-risk-booking-change/v1',
        expires_at: new Date(Date.parse(now) + ATLAS_LOCAL_APPROVAL_TTL_MS).toISOString(),
        status: 'pending', requested_at: now, decided_at: null, operator_id: null, reason: null, action_id: null,
      };
      this.state.proposals[proposal.id] = proposal;
      this.state.approvals[approval.id] = approval;
      this.state.conversations[message.conversation_id] = { ...this.state.conversations[message.conversation_id]!, state: 'approval_pending', updated_at: now };
      this.appendTraceEvent(trace.id, 'tool.proposed', { proposal_id: proposal.id, tool_id: proposal.tool_id, input: proposal.input, risk: proposal.risk });
      this.appendTraceEvent(trace.id, 'policy.decided', policy);
      this.appendTraceEvent(trace.id, 'approval.requested', { approval_id: approval.id, proposal_id: proposal.id });
      const policyReceipt = this.addReceipt('policy', trace.id, message.conversation_id, proposal.id, 'approval_required', policy);
      const approvalReceipt = this.addReceipt('approval', trace.id, message.conversation_id, approval.id, 'pending', { proposal_id: proposal.id });
      this.setTraceStatus(trace.id, 'approval_pending');
      const result = {
        status: 'approval_pending', replayed: false, fixture_model: ATLAS_LOCAL_FIXTURE_MODEL,
        message, trace_id: trace.id, evidence: this.knowledge, proposal, policy, approval,
        receipts: [messageReceipt, evidenceReceipt, policyReceipt, approvalReceipt], trace: this.trace(trace.id),
        next_action: `Approve or reject ${approval.id}`,
      };
      this.state.inbound_idempotency[message.message_id] = { digest, result };
      return result;
    }

    const policy: AtlasLocalPolicyDecision = { decision: 'allowed', reason: 'knowledge_only_response', risk: 'none' };
    this.appendTraceEvent(trace.id, 'policy.decided', policy);
    const outbox: AtlasLocalOutboxMessage = {
      id: deterministicId('outbox', message.message_id, 'knowledge'), trace_id: trace.id, conversation_id: message.conversation_id,
      customer_id: message.customer_id, channel_id: message.channel_id,
      body: this.knowledge.excerpt, state: 'queued', attempts: 0, next_attempt_at: null, retry_after_ms: null,
      provider_message_id: null, provider_code: null, provider_occurred_at: null, created_at: now, updated_at: now,
    };
    this.state.outbox.push(outbox);
    this.appendTraceEvent(trace.id, 'outbox.enqueued', { outbox_id: outbox.id, channel_id: outbox.channel_id });
    this.appendTraceEvent(trace.id, 'outcome.recorded', { answer: this.knowledge.excerpt });
    const policyReceipt = this.addReceipt('policy', trace.id, message.conversation_id, message.message_id, 'allowed', policy);
    const outcomeReceipt = this.addReceipt('outcome', trace.id, message.conversation_id, message.message_id, 'answered', { evidence_id: this.knowledge.id });
    const outboxReceipt = this.addReceipt('outbox', trace.id, message.conversation_id, outbox.id, 'queued', { channel_id: outbox.channel_id });
    this.completeTrace(trace.id, 'completed');
    const result = {
      status: 'answered', replayed: false, fixture_model: ATLAS_LOCAL_FIXTURE_MODEL,
      message, trace_id: trace.id, evidence: this.knowledge, policy, outbox,
      receipts: [messageReceipt, evidenceReceipt, policyReceipt, outcomeReceipt, outboxReceipt], trace: this.trace(trace.id),
      next_action: `Deliver outbox message ${outbox.id}`,
    };
    this.state.inbound_idempotency[message.message_id] = { digest, result };
    return result;
  }

  private ensureConversation(message: AtlasLocalInboundMessage): AtlasLocalConversation {
    const existing = this.state.conversations[message.conversation_id];
    if (existing) {
      if ((existing.channel_id !== message.channel_id && !isUnboundChannelId(existing.channel_id)) ||
        (existing.customer_id !== message.customer_id && !isUnboundCustomerId(existing.customer_id))) {
        throw new AtlasLocalRuntimeError('IDEMPOTENCY_MISMATCH', `Conversation ${message.conversation_id} authority changed`, {
          nextAction: 'Use a new conversation identifier for a different customer or channel',
        });
      }
      if (isUnboundCustomerId(existing.customer_id) || isUnboundChannelId(existing.channel_id)) {
        const hydrated = {
          ...existing,
          customer_id: message.customer_id,
          channel_id: message.channel_id,
        };
        this.state.conversations[message.conversation_id] = hydrated;
        return hydrated;
      }
      return existing.takeover === undefined ? { ...existing, takeover: null } : existing;
    }
    const now = this.clock();
    const conversation: AtlasLocalConversation = {
      id: message.conversation_id, customer_id: message.customer_id, channel_id: message.channel_id,
      state: 'automated', last_sequence: 0, operator_id: null, handoff_reason: null, takeover: null, created_at: now, updated_at: now,
    };
    this.state.conversations[message.conversation_id] = conversation;
    return conversation;
  }

  private createTrace(message: AtlasLocalInboundMessage): AtlasLocalTrace {
    const trace: AtlasLocalTrace = {
      id: deterministicId('trace', message.message_id), conversation_id: message.conversation_id, message_id: message.message_id,
      status: 'active', started_at: this.clock(), completed_at: null, events: [],
    };
    this.state.traces.push(trace);
    return trace;
  }

  private appendTraceEvent(traceId: string, type: string, data: Readonly<Record<string, unknown>>): void {
    const index = this.state.traces.findIndex((item) => item.id === traceId);
    if (index < 0) throw notFound('trace', traceId);
    const trace = this.state.traces[index]!;
    const event: AtlasLocalTraceEvent = {
      id: deterministicId('event', traceId, String(trace.events.length + 1), type),
      type,
      at: this.clock(),
      data: deepClone(data),
    };
    this.state.traces[index] = { ...trace, events: [...trace.events, event] };
  }

  private setTraceStatus(traceId: string, status: AtlasLocalTrace['status']): void {
    const index = this.state.traces.findIndex((item) => item.id === traceId);
    if (index < 0) throw notFound('trace', traceId);
    const trace = this.state.traces[index]!;
    this.state.traces[index] = { ...trace, status };
  }

  private completeTrace(traceId: string, status: Extract<AtlasLocalTrace['status'], 'completed' | 'handoff_required' | 'failed'>): void {
    const index = this.state.traces.findIndex((item) => item.id === traceId);
    if (index < 0) throw notFound('trace', traceId);
    const trace = this.state.traces[index]!;
    this.state.traces[index] = { ...trace, status, completed_at: this.clock() };
  }

  private addReceipt(kind: AtlasLocalReceiptKind, traceId: string, conversationId: string, subjectId: string, outcome: string, data: Readonly<Record<string, unknown>>): AtlasLocalReceipt {
    const createdAt = this.clock();
    const digest = sha256(stableJson({ kind, trace_id: traceId, conversation_id: conversationId, subject_id: subjectId, outcome, data, project_hash: this.state.identity.project_hash }));
    const receipt: AtlasLocalReceipt = {
      receipt_id: deterministicId('receipt', kind, subjectId, outcome, digest),
      kind, trace_id: traceId, conversation_id: conversationId, subject_id: subjectId, outcome, created_at: createdAt,
      project_hash: this.state.identity.project_hash, digest, data: deepClone(data),
    };
    const existing = this.state.receipts.find((item) => item.receipt_id === receipt.receipt_id);
    if (existing) return existing;
    this.state.receipts.push(receipt);
    return receipt;
  }

  private persist(): Promise<void> {
    const write = this.persistTail
      .catch(() => undefined)
      .then(async () => {
        let commit = async (): Promise<void> => {
          await atomicWrite(this.statePath, `${JSON.stringify(this.state, null, 2)}\n`, 0o600);
        };
        for (const guard of [...this.commitGuards].reverse()) {
          const next = commit;
          commit = () => guard(next);
        }
        await commit();
      });
    this.persistTail = write;
    return write;
  }
}

function normalizeOperatorId(value: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new AtlasLocalRuntimeError('INVALID_MESSAGE', 'operator_id is required and must be non-empty');
  return value.trim();
}

function unboundCustomerId(conversationId: string): string {
  return `unbound:${conversationId}`;
}

function isUnboundCustomerId(customerId: string): boolean {
  return customerId.startsWith('unbound:');
}

function isUnboundChannelId(channelId: string): boolean {
  return channelId === 'unbound-local-channel';
}

function localAuthorityScope(identity: AtlasLocalRuntimeSnapshot['identity']): AtlasLocalAuthorityScope {
  return {
    tenant_id: identity.tenant_id,
    organisation_id: `local-org-${identity.project_hash.slice(0, 16)}`,
    project_id: identity.project_hash,
    environment_id: 'local',
  };
}

function sameAuthorityScope(left: AtlasLocalAuthorityScope, right: AtlasLocalAuthorityScope): boolean {
  return left.tenant_id === right.tenant_id &&
    left.organisation_id === right.organisation_id &&
    left.project_id === right.project_id &&
    left.environment_id === right.environment_id;
}

function normalizeInbound(value: unknown): AtlasLocalInboundMessage {
  if (!isRecord(value)) throw new AtlasLocalRuntimeError('INVALID_MESSAGE', 'Inbound message must be a JSON object');
  const requiredStrings = ['message_id', 'conversation_id', 'customer_id', 'channel_id', 'occurred_at', 'text'] as const;
  for (const key of requiredStrings) {
    if (typeof value[key] !== 'string' || !value[key].trim()) throw new AtlasLocalRuntimeError('INVALID_MESSAGE', `${key} must be a non-empty string`);
  }
  if (!Number.isSafeInteger(value.sequence) || Number(value.sequence) < 1) throw new AtlasLocalRuntimeError('INVALID_MESSAGE', 'sequence must be a positive integer');
  if (typeof value.consent !== 'boolean' || typeof value.within_messaging_window !== 'boolean') throw new AtlasLocalRuntimeError('INVALID_MESSAGE', 'consent and within_messaging_window must be booleans');
  if (!isIsoDate(String(value.occurred_at))) throw new AtlasLocalRuntimeError('INVALID_MESSAGE', 'occurred_at must be an ISO-8601 timestamp');
  return {
    message_id: String(value.message_id), conversation_id: String(value.conversation_id), customer_id: String(value.customer_id),
    channel_id: String(value.channel_id), sequence: Number(value.sequence), occurred_at: String(value.occurred_at), text: String(value.text),
    consent: Boolean(value.consent), within_messaging_window: Boolean(value.within_messaging_window),
  };
}

function migrateTakeoverState(state: MutableState): { state: MutableState; changed: boolean } {
  let changed = false;
  const migratedConversations = Object.fromEntries(
    Object.entries(state.conversations).map(([conversationId, conversation]) => {
      if (conversation.takeover || conversation.state !== 'human_takeover') {
        return [conversationId, conversation];
      }
      if (!conversation.operator_id || !conversation.handoff_reason) {
        throw new AtlasLocalRuntimeError(
          'PROJECT_STATE_MISMATCH',
          `Human takeover conversation ${conversationId} is missing durable operator identity or reason`,
          {
            nextAction: 'Preserve the runtime state for evidence, then restore a complete takeover record',
          },
        );
      }
      changed = true;
      return [conversationId, {
        ...conversation,
        takeover: {
          operator_id: conversation.operator_id,
          scope: localAuthorityScope(state.identity),
          reason: conversation.handoff_reason,
          taken_over_at: conversation.updated_at,
        },
      }];
    }),
  ) as Record<string, AtlasLocalConversation>;
  return changed
    ? { state: { ...state, conversations: migratedConversations }, changed: true }
    : { state, changed: false };
}

function parseState(raw: string): MutableState {
  try {
    const state = JSON.parse(raw) as MutableState;
    if (!state || state.schema_version !== ATLAS_LOCAL_RUNTIME_VERSION || !state.identity || !Array.isArray(state.messages) || !Array.isArray(state.receipts)) throw new Error('invalid shape');
    return state;
  } catch {
    throw new AtlasLocalRuntimeError('PROJECT_STATE_MISMATCH', 'Local Atlas runtime state is corrupt or unsupported', {
      nextAction: 'Preserve the file for evidence, then restore a known-good state or start a new local project',
    });
  }
}

function deterministicId(prefix: string, ...parts: string[]): string {
  return `${prefix}_${sha256(stableJson(parts)).slice(7, 23)}`;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (isRecord(value)) return `{${Object.entries(value).filter(([, item]) => item !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`;
  return JSON.stringify(value);
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function firstMeaningfulLine(value: string): string {
  return value.split(/\r?\n/).map((line) => line.trim()).find((line) => line.startsWith('- '))?.slice(2)
    ?? value.split(/\r?\n/).map((line) => line.trim()).find((line) => line && !line.startsWith('#'))
    ?? 'Approved local knowledge is available.';
}

function isBookingChange(text: string): boolean {
  return /\b(move|reschedule|change)\b/i.test(text) && /\bbooking\b/i.test(text);
}

function extractBookingId(text: string): string {
  return text.match(/\bBK-\d+\b/i)?.[0]?.toUpperCase() ?? 'BK-100';
}

function extractRequestedDate(text: string): string {
  const day = text.match(/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i)?.[0];
  if (day) return `${day[0]!.toUpperCase()}${day.slice(1).toLowerCase()}`;
  const afterTo = text.match(/\bto\s+([A-Za-z][A-Za-z0-9-]{1,31})\b/i)?.[1];
  return afterTo ? `${afterTo[0]!.toUpperCase()}${afterTo.slice(1)}` : 'Friday';
}

function stringField(value: Readonly<Record<string, unknown>>, key: string): string {
  const field = value[key];
  if (typeof field !== 'string' || !field) throw new AtlasLocalRuntimeError('INVALID_MESSAGE', `${key} must be a non-empty string`);
  return field;
}

function isLegalDeliveryCallbackTransition(
  current: AtlasLocalOutboxState,
  next: AtlasLocalOutboxState,
): boolean {
  if (current === next) return true;
  const transitions: Readonly<Record<AtlasLocalOutboxState, readonly AtlasLocalOutboxState[]>> = {
    queued: ['sent', 'delivered', 'read', 'rejected', 'failed'],
    retry_scheduled: ['sent', 'delivered', 'read', 'rejected', 'failed'],
    sent: ['delivered', 'read', 'rejected', 'failed'],
    delivered: ['read'],
    read: [],
    rejected: [],
    failed: [],
  };
  return transitions[current].includes(next);
}

function idempotencyMismatch(kind: string, id: string): AtlasLocalRuntimeError {
  return new AtlasLocalRuntimeError('IDEMPOTENCY_MISMATCH', `${kind} idempotency identity ${id} was reused with different input`, {
    nextAction: 'Reuse the original payload or issue a new idempotency identity',
  });
}

function notFound(kind: string, id: string): AtlasLocalRuntimeError {
  return new AtlasLocalRuntimeError('NOT_FOUND', `${kind} not found: ${id}`, {
    nextAction: `Inspect the current local ${kind} registry and use an existing identity`,
  });
}

function isIsoDate(value: string): boolean {
  return Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
