import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  AtlasLocalMissionCoordinator,
  scaffoldAtlasProject,
  type AtlasScaffoldDependencies,
} from '../src/index.js';

const roots: string[] = [];
const scope = {
  tenantId: 'tenant-local',
  organisationId: 'organisation-local',
  projectId: 'project-local',
  environmentId: 'local',
};

const message = {
  message_id: 'msg-coordinator-001',
  conversation_id: 'conv-coordinator-001',
  customer_id: 'customer-coordinator-001',
  channel_id: 'local-web-chat',
  sequence: 1,
  occurred_at: '2026-07-24T08:00:00.000Z',
  text: 'Can I move booking BK-100 to Friday?',
  consent: true,
  within_messaging_window: true,
} as const;

function dependencies(): AtlasScaffoldDependencies {
  return {
    runCommand: vi.fn().mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' }),
    inspectGit: vi.fn().mockResolvedValue({ available: true, repository: false, dirty: false, root: null }),
  };
}

async function fixture() {
  const base = await mkdtemp(path.join(os.tmpdir(), 'atlas-mission-coordinator-'));
  roots.push(base);
  await scaffoldAtlasProject(
    {
      cwd: base,
      target: 'front-desk',
      install: false,
      initializeGit: false,
      nodeVersion: 'v22.12.0',
    },
    dependencies(),
  );
  const root = path.join(base, 'front-desk');
  const clock = () => '2026-07-24T08:00:00.000Z';
  return { root, clock };
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('Atlas local Mission coordinator', () => {
  it('runs one durable observe-reason-propose-govern-act-observe journey', async () => {
    const { root, clock } = await fixture();
    const coordinator = await AtlasLocalMissionCoordinator.open({ root, scope, clock });

    const inbound = await coordinator.receive(message);
    expect(inbound.status).toBe('approval_pending');
    expect(inbound.mission.spec.state).toBe('WAITING_APPROVAL');
    expect(inbound.runtime.proposal.approval).toBe('required');
    expect(inbound.runtime.policy.decision).toBe('approval_required');
    expect(inbound.runtime.action).toBeUndefined();
    expect(inbound.ledger.events.map((event) => event.spec.resultingState)).toEqual([
      'CREATED',
      'READY',
      'ACTIVE',
      'WAITING_APPROVAL',
    ]);

    const committed = await coordinator.approve(
      inbound.runtime.approval.id,
      'operator-local',
      'approved for deterministic fixture journey',
    );
    expect(committed.status).toBe('committed');
    expect(committed.mission.spec.state).toBe('WAITING_EVENT');
    expect(committed.runtime.action).toMatchObject({
      proposal_id: inbound.runtime.proposal.id,
      tool_id: 'front-desk.bookings.reschedule',
    });
    expect(committed.runtime.receipts.map((receipt: { kind: string }) => receipt.kind)).toEqual([
      'approval',
      'action',
      'outcome',
      'outbox',
    ]);

    const delivered = await coordinator.deliver(
      committed.runtime.outbox.id,
      { outcome: 'delivered', provider_message_id: 'local-provider-message-001' },
    );
    expect(delivered.status).toBe('delivered');
    expect(delivered.mission.spec.state).toBe('COMPLETED');
    expect(delivered.ledger.events.at(-1)?.spec.resultingState).toBe('COMPLETED');
    expect(delivered.receipts.map((receipt: { kind: string }) => receipt.kind)).toContain('delivery');
    expect(delivered.runtime.delivery.state).toBe('delivered');

    const snapshot = await coordinator.snapshot();
    expect(snapshot.missionState.missions).toHaveLength(1);
    expect(snapshot.missionState.lifecycleEvents).toHaveLength(9);
    expect(snapshot.runtime.actions).toHaveLength(1);
    expect(snapshot.runtime.outbox).toMatchObject([{ state: 'delivered' }]);
  });

  it('resumes from persisted Mission and runtime state across approval and delivery checkpoints', async () => {
    const { root, clock } = await fixture();
    const first = await AtlasLocalMissionCoordinator.open({ root, scope, clock });
    const inbound = await first.receive(message);
    const approvalId = inbound.runtime.approval.id as string;

    const afterInboundRestart = await AtlasLocalMissionCoordinator.open({ root, scope, clock });
    const inspected = await afterInboundRestart.inspect(inbound.missionId);
    expect(inspected.mission?.spec.state).toBe('WAITING_APPROVAL');
    expect(inspected.ledger?.events).toHaveLength(4);

    const committed = await afterInboundRestart.approve(approvalId, 'operator-local');
    const afterApprovalRestart = await AtlasLocalMissionCoordinator.open({ root, scope, clock });
    const approvalInspection = await afterApprovalRestart.inspect(inbound.missionId);
    expect(approvalInspection.mission?.spec.state).toBe('WAITING_EVENT');
    expect(approvalInspection.ledger?.events).toHaveLength(6);
    expect(approvalInspection.receipts).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'action', outcome: 'committed' }),
      expect.objectContaining({ kind: 'outbox', outcome: 'queued' }),
    ]));

    const delivered = await afterApprovalRestart.deliver(
      committed.runtime.outbox.id,
      { outcome: 'delivered', provider_message_id: 'local-provider-message-002' },
    );
    expect(delivered.mission.spec.state).toBe('COMPLETED');

    const afterDeliveryRestart = await AtlasLocalMissionCoordinator.open({ root, scope, clock });
    const completed = await afterDeliveryRestart.inspect(inbound.missionId);
    expect(completed.mission?.spec.state).toBe('COMPLETED');
    expect(completed.ledger?.events.at(-1)?.spec.resultingState).toBe('COMPLETED');
  });

  it('is deterministic and replays identical input without a second Mission or action', async () => {
    const firstFixture = await fixture();
    const secondFixture = await fixture();
    const first = await AtlasLocalMissionCoordinator.open({ root: firstFixture.root, scope, clock: firstFixture.clock });
    const second = await AtlasLocalMissionCoordinator.open({ root: secondFixture.root, scope, clock: secondFixture.clock });

    const firstResult = await first.receive(message);
    const secondResult = await second.receive(message);
    expect(firstResult.missionId).toBe(secondResult.missionId);
    expect(firstResult.ledger.events).toEqual(secondResult.ledger.events);
    expect(firstResult.runtime.proposal.id).toBe(secondResult.runtime.proposal.id);
    expect(firstResult.runtime.approval.id).toBe(secondResult.runtime.approval.id);

    const replay = await first.replay(message);
    expect(replay.replayed).toBe(true);
    expect(replay.status).toBe('approval_pending');
    expect((await first.snapshot()).missionState.missions).toHaveLength(1);
    expect((await first.snapshot()).runtime.actions).toHaveLength(0);

    await expect(first.replay({ ...message, text: 'Can I move booking BK-100 to Monday?' })).rejects.toMatchObject({
      code: 'IDEMPOTENCY_MISMATCH',
    });
  });
});
