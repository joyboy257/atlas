import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { AtlasLocalRuntime } from '../src/local-runtime.js';
import { AtlasLocalMissionCoordinator } from '../src/mission-coordinator.js';
import { AtlasMessagingSimulator } from '../src/messaging-simulator.js';
import { scaffoldAtlasProject, type AtlasScaffoldDependencies } from '../src/scaffold.js';

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));

function dependencies(): AtlasScaffoldDependencies {
  return {
    runCommand: vi.fn().mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' }),
    inspectGit: vi.fn().mockResolvedValue({ available: true, repository: false, dirty: false, root: null }),
  };
}

async function simulatorFixture() {
  const base = await mkdtemp(path.join(os.tmpdir(), 'atlas-message-simulator-'));
  roots.push(base);
  await scaffoldAtlasProject({ cwd: base, target: 'front-desk', install: false, initializeGit: false, nodeVersion: 'v22.12.0' }, dependencies());
  let milliseconds = Date.parse('2026-07-24T08:00:00.000Z');
  const clock = () => new Date(milliseconds).toISOString();
  const advance = (value: number) => { milliseconds += value; };
  const root = path.join(base, 'front-desk');
  const runtime = await AtlasLocalRuntime.open({ root, clock });
  const identity = runtime.snapshot().identity;
  const coordinator = await AtlasLocalMissionCoordinator.open({
    root,
    scope: {
      tenantId: identity.tenant_id,
      organisationId: `local-org-${identity.project_hash.slice(0, 16)}`,
      projectId: identity.project_hash,
      environmentId: 'local',
    },
    clock,
  });
  return { simulator: new AtlasMessagingSimulator(coordinator, { advance }), runtime };
}

describe('Atlas business messaging simulator', () => {
  it('runs the complete front-desk approval, exactly-once action, and delivery scenario', async () => {
    const { simulator, runtime } = await simulatorFixture();

    const result = await simulator.runScenario({
      id: 'scenario_front_desk_success',
      events: [
        {
          type: 'inbound',
          message: {
            message_id: 'msg_001', conversation_id: 'conv_001', customer_id: 'cust_001', channel_id: 'local-web-chat',
            sequence: 1, occurred_at: '2026-07-24T08:00:00.000Z', text: 'Can I move booking BK-100 to Friday?',
            consent: true, within_messaging_window: true,
          },
          capture_as: 'turn',
        },
        { type: 'approve', approval_from: 'turn', operator_id: 'operator_001', capture_as: 'commit' },
        { type: 'deliver', outbox_from: 'commit', outcome: 'delivered', provider_message_id: 'provider_001', capture_as: 'delivery' },
        { type: 'replay_inbound', message_from: 'turn', capture_as: 'replay' },
      ],
    });

    expect(result.status).toBe('passed');
    expect(result.captures.turn.status).toBe('approval_pending');
    expect(result.captures.commit.status).toBe('committed');
    expect(result.captures.delivery.delivery.state).toBe('delivered');
    expect(result.captures.replay.replayed).toBe(true);
    expect(result.final_state.actions).toHaveLength(1);
    expect(result.transcript.map((entry) => entry.type)).toEqual(['inbound', 'approve', 'deliver', 'replay_inbound']);
  });

  it('simulates duplicates, out-of-order delivery, retry/backoff, and callbacks through one contract', async () => {
    const { simulator, runtime } = await simulatorFixture();

    const result = await simulator.runScenario({
      id: 'scenario_failure_recovery',
      events: [
        {
          type: 'inbound', capture_as: 'held',
          message: {
            message_id: 'msg_002', conversation_id: 'conv_001', customer_id: 'cust_001', channel_id: 'local-web-chat',
            sequence: 2, occurred_at: '2026-07-24T08:00:01.000Z', text: 'What is the booking policy?',
            consent: true, within_messaging_window: true,
          },
        },
        {
          type: 'inbound', capture_as: 'turn',
          message: {
            message_id: 'msg_001', conversation_id: 'conv_001', customer_id: 'cust_001', channel_id: 'local-web-chat',
            sequence: 1, occurred_at: '2026-07-24T08:00:00.000Z', text: 'Can I move booking BK-100 to Friday?',
            consent: true, within_messaging_window: true,
          },
        },
        { type: 'approve', approval_from: 'turn', operator_id: 'operator_001', capture_as: 'commit' },
        { type: 'deliver', outbox_from: 'commit', outcome: 'transient_failure', provider_code: 'TEMPORARY_UNAVAILABLE', capture_as: 'retry' },
        { type: 'advance_time', milliseconds: 1000 },
        { type: 'deliver', outbox_from: 'commit', outcome: 'accepted', provider_message_id: 'provider_001', capture_as: 'accepted' },
        { type: 'callback', callback: { callback_id: 'cb_001', provider_message_id: 'provider_001', state: 'delivered', occurred_at: '2026-07-24T08:00:02.000Z' }, capture_as: 'delivered' },
      ],
    });

    expect(result.status).toBe('passed');
    expect(result.captures.held.status).toBe('held_out_of_order');
    expect(result.captures.turn.drained_message_ids).toEqual(['msg_002']);
    expect(result.captures.retry.delivery.state).toBe('retry_scheduled');
    expect(result.captures.accepted.delivery.state).toBe('sent');
    expect(result.captures.delivered.delivery.state).toBe('delivered');
    expect(result.final_state.actions).toHaveLength(1);
  });

  it('simulates policy blocks, approval interruption, and human takeover without hidden commits', async () => {
    const { simulator, runtime } = await simulatorFixture();

    const result = await simulator.runScenario({
      id: 'scenario_handoff',
      events: [
        {
          type: 'inbound', capture_as: 'blocked',
          message: {
            message_id: 'msg_blocked', conversation_id: 'conv_blocked', customer_id: 'cust_001', channel_id: 'local-web-chat',
            sequence: 1, occurred_at: '2026-07-24T08:00:00.000Z', text: 'Move my booking',
            consent: false, within_messaging_window: true,
          },
        },
        {
          type: 'inbound', capture_as: 'turn',
          message: {
            message_id: 'msg_001', conversation_id: 'conv_001', customer_id: 'cust_001', channel_id: 'local-web-chat',
            sequence: 1, occurred_at: '2026-07-24T08:00:00.000Z', text: 'Can I move booking BK-100 to Friday?',
            consent: true, within_messaging_window: true,
          },
        },
        { type: 'takeover', conversation_id: 'conv_001', operator_id: 'operator_002', reason: 'Customer asked for a human', capture_as: 'takeover' },
      ],
    });

    expect(result.captures.blocked.status).toBe('handoff_required');
    expect(result.captures.takeover.state).toBe('human_takeover');
    expect(result.final_state.actions).toHaveLength(0);
    expect(result.final_state.outbox).toHaveLength(0);
  });
});
