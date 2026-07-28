import { AtlasLocalRuntime, type AtlasLocalInboundMessage } from './local-runtime.js';

export type AtlasSimulatorEvent =
  | Readonly<{ type: 'inbound'; message: AtlasLocalInboundMessage; capture_as?: string }>
  | Readonly<{ type: 'replay_inbound'; message_from: string; capture_as?: string }>
  | Readonly<{ type: 'approve'; approval_from: string; operator_id: string; reason?: string; capture_as?: string }>
  | Readonly<{ type: 'reject'; approval_from: string; operator_id: string; reason?: string; capture_as?: string }>
  | Readonly<{ type: 'takeover'; conversation_id: string; operator_id: string; reason: string; capture_as?: string }>
  | Readonly<{ type: 'deliver'; outbox_from: string; outcome: 'transient_failure' | 'permanent_rejection' | 'accepted' | 'delivered'; provider_code?: string; provider_message_id?: string; capture_as?: string }>
  | Readonly<{ type: 'callback'; callback: Readonly<{ callback_id: string; provider_message_id: string; state: 'sent' | 'delivered' | 'read' | 'failed'; occurred_at: string }>; capture_as?: string }>
  | Readonly<{ type: 'advance_time'; milliseconds: number; capture_as?: string }>;

export type AtlasSimulatorScenario = Readonly<{
  id: string;
  events: readonly AtlasSimulatorEvent[];
}>;

export type AtlasSimulatorTranscriptEntry = Readonly<{
  index: number;
  type: AtlasSimulatorEvent['type'];
  capture_as: string | null;
  status: 'passed';
  result: unknown;
}>;

export type AtlasSimulatorResult = Readonly<{
  scenario_id: string;
  status: 'passed';
  transcript: readonly AtlasSimulatorTranscriptEntry[];
  captures: Record<string, any>;
  final_state: ReturnType<AtlasLocalRuntime['snapshot']>;
}>;

export class AtlasMessagingSimulator {
  private readonly runtime: AtlasLocalRuntime;
  private readonly advance: (milliseconds: number) => void;

  constructor(runtime: AtlasLocalRuntime, dependencies: Readonly<{ advance?: (milliseconds: number) => void }> = {}) {
    this.runtime = runtime;
    this.advance = dependencies.advance ?? (() => undefined);
  }

  async runScenario(scenario: AtlasSimulatorScenario): Promise<AtlasSimulatorResult> {
    if (!scenario.id || !Array.isArray(scenario.events)) throw new Error('Simulator scenario requires id and events');
    const captures: Record<string, any> = {};
    const messages: Record<string, AtlasLocalInboundMessage> = {};
    const transcript: AtlasSimulatorTranscriptEntry[] = [];
    for (let index = 0; index < scenario.events.length; index += 1) {
      const event = scenario.events[index]!;
      let result: any;
      if (event.type === 'inbound') {
        result = await this.runtime.receiveMessage(event.message);
        if (event.capture_as) messages[event.capture_as] = event.message;
      } else if (event.type === 'replay_inbound') {
        const message = messages[event.message_from];
        if (!message) throw new Error(`Simulator capture ${event.message_from} does not contain an inbound message`);
        result = await this.runtime.receiveMessage(message);
      } else if (event.type === 'approve' || event.type === 'reject') {
        const source = requireCapture(captures, event.approval_from);
        const approvalId = source.approval?.id;
        if (typeof approvalId !== 'string') throw new Error(`Simulator capture ${event.approval_from} has no approval id`);
        result = await this.runtime.decideApproval(approvalId, {
          decision: event.type === 'approve' ? 'approved' : 'rejected',
          operator_id: event.operator_id,
          ...(event.reason ? { reason: event.reason } : {}),
        });
      } else if (event.type === 'takeover') {
        result = await this.runtime.takeHumanControl(event.conversation_id, { operator_id: event.operator_id, reason: event.reason });
      } else if (event.type === 'deliver') {
        const source = requireCapture(captures, event.outbox_from);
        const outboxId = source.outbox?.id;
        if (typeof outboxId !== 'string') throw new Error(`Simulator capture ${event.outbox_from} has no outbox id`);
        result = await this.runtime.attemptDelivery(outboxId, {
          outcome: event.outcome,
          ...(event.provider_code ? { provider_code: event.provider_code } : {}),
          ...(event.provider_message_id ? { provider_message_id: event.provider_message_id } : {}),
        });
      } else if (event.type === 'callback') {
        result = await this.runtime.applyDeliveryCallback(event.callback);
      } else {
        if (!Number.isFinite(event.milliseconds) || event.milliseconds < 0) throw new Error('advance_time requires a non-negative millisecond value');
        this.advance(event.milliseconds);
        result = { advanced_ms: event.milliseconds };
      }
      if (event.capture_as) captures[event.capture_as] = result;
      transcript.push({ index, type: event.type, capture_as: event.capture_as ?? null, status: 'passed', result });
    }
    return { scenario_id: scenario.id, status: 'passed', transcript, captures, final_state: this.runtime.snapshot() };
  }
}

function requireCapture(captures: Record<string, any>, name: string): any {
  const value = captures[name];
  if (!value) throw new Error(`Simulator capture not found: ${name}`);
  return value;
}
