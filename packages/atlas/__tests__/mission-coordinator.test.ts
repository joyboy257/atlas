import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';
import { AtlasLocalMissionCoordinator } from '../src/mission-coordinator.js';
import { scaffoldAtlasProject, type AtlasScaffoldDependencies } from '../src/index.js';

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

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const workerPath = path.join(testDirectory, 'mission-worker.mjs');
const verifierPath = path.join(testDirectory, 'mission-independent-verifier.mjs');

function spawnWorker(root: string, mode: string, ownerId: string, now: string): {
  child: ReturnType<typeof spawn>;
  output: () => string;
} {
  const child = spawn(process.execPath, [workerPath, mode, root, ownerId, now, '1000'], {
    cwd: testDirectory,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk: string) => { output += chunk; });
  return { child, output: () => output };
}

async function waitForWorkerOutput(output: () => string, marker: string): Promise<void> {
  const startedAt = Date.now();
  while (!output().includes(marker)) {
    if (Date.now() - startedAt > 10_000) throw new Error(`Timed out waiting for worker output: ${marker}`);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

async function waitForWorker(child: ReturnType<typeof spawn>): Promise<number | null> {
  const [code] = await once(child, 'exit') as [number | null, string | null];
  return code;
}

async function killWorkerAtCheckpoint(
  root: string,
  mode: string,
  ownerId: string,
  now: string,
  marker: string,
): Promise<void> {
  const worker = spawnWorker(root, mode, ownerId, now);
  await waitForWorkerOutput(worker.output, marker);
  worker.child.kill('SIGKILL');
  await waitForWorker(worker.child);
}

function verifyPersistedMissionState(root: string, state: string): Promise<number | null> {
  const verifier = spawn(process.execPath, [verifierPath, root, state], {
    cwd: testDirectory,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return waitForWorker(verifier);
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
    expect(delivered.status).toBe('completed');
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

  it('holds out-of-order Mission work without completing and reconciles it when drained', async () => {
    const { root, clock } = await fixture();
    const coordinator = await AtlasLocalMissionCoordinator.open({ root, scope, clock });
    const held = await coordinator.receive({ ...message, message_id: 'msg-coordinator-002', sequence: 2 });

    expect(held.status).toBe('held_out_of_order');
    expect(held.mission.spec.state).toBe('WAITING_EVENT');
    expect(held.ledger.events.map((event) => event.spec.resultingState)).not.toContain('COMPLETED');
    expect((await coordinator.snapshot()).missionState.waits).toEqual([
      expect.objectContaining({ missionId: held.missionId, kind: 'event', status: 'ACTIVE' }),
    ]);

    const first = await coordinator.receive({ ...message, text: 'What is the booking policy?' });
    expect(first.status).toBe('answered');
    const reconciled = await coordinator.inspect(held.missionId);
    expect(reconciled.mission?.spec.state).toBe('WAITING_APPROVAL');
    expect(reconciled.ledger?.events.filter((event) => event.spec.resultingState === 'COMPLETED')).toHaveLength(0);
  });

  it('serializes duplicate receives across coordinator instances without duplicate Mission events', async () => {
    const { root, clock } = await fixture();
    const first = await AtlasLocalMissionCoordinator.open({ root, scope, clock });
    const second = await AtlasLocalMissionCoordinator.open({ root, scope, clock });

    const results = await Promise.all([first.receive(message), second.receive(message)]);
    const snapshot = await first.snapshot();
    expect(snapshot.missionState.missions).toHaveLength(1);
    expect(snapshot.missionState.lifecycleEvents.filter((event) => event.spec.missionId === results[0].missionId)).toHaveLength(4);
    expect(snapshot.runtime.traces).toHaveLength(1);
    expect(results.some((result) => result.replayed)).toBe(true);
  });

  it('uses legal failure transitions and releases the delivery wait on rejection', async () => {
    const { root, clock } = await fixture();
    const coordinator = await AtlasLocalMissionCoordinator.open({ root, scope, clock });
    const inbound = await coordinator.receive(message);
    const committed = await coordinator.approve(inbound.runtime.approval.id, 'operator-local');

    const rejected = await coordinator.deliver(committed.runtime.outbox.id, {
      outcome: 'permanent_rejection',
      provider_code: 'RECIPIENT_BLOCKED',
    });
    expect(rejected.mission.spec.state).toBe('FAILED');
    expect(rejected.ledger.events.map((event) => event.spec.resultingState).slice(-3)).toEqual(['ACTIVE', 'COMPLETING', 'FAILED']);
    expect((await coordinator.snapshot()).missionState.waits).toEqual(expect.arrayContaining([
      expect.objectContaining({ missionId: inbound.missionId, kind: 'approval', status: 'RELEASED' }),
      expect.objectContaining({ missionId: inbound.missionId, kind: 'event', status: 'RELEASED' }),
    ]));
  });

  it('persists schedule waits, deduplicates schedule triggers, and activates after restart', async () => {
    const { root } = await fixture();
    let now = '2026-07-24T08:00:00.000Z';
    const clock = () => now;
    const first = await AtlasLocalMissionCoordinator.open({ root, scope, clock });
    const missionId = 'scheduled-mission-001';
    const scheduledAt = '2026-07-24T09:00:00.000Z';
    const scheduled = await first.scheduleMission({
      missionId,
      agent: {
        agentId: 'front-desk',
        agentVersionId: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        deploymentId: 'deployment-scheduled-001',
        runtime: { mode: 'local', adapter: 'atlas-local-fixture' },
      },
      missionType: 'scheduled-business-task',
      goal: 'Run the scheduled local business task',
      successCriteria: 'The scheduled task reaches a controlled local state',
      correlation: { correlationId: 'correlation-scheduled-001' },
      provenance: { source: 'schedule', inputDigest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' },
    }, scheduledAt);
    expect(scheduled.items).toEqual([expect.objectContaining({ missionId, action: 'SCHEDULED' })]);
    const creationReplay = await first.scheduleMission({
      missionId,
      agent: {
        agentId: 'front-desk',
        agentVersionId: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        deploymentId: 'deployment-scheduled-001',
        runtime: { mode: 'local', adapter: 'atlas-local-fixture' },
      },
      missionType: 'scheduled-business-task',
      goal: 'Run the scheduled local business task',
      successCriteria: 'The scheduled task reaches a controlled local state',
      correlation: { correlationId: 'correlation-scheduled-001' },
      provenance: { source: 'schedule', inputDigest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' },
    }, scheduledAt);
    expect(creationReplay.items).toEqual([expect.objectContaining({ missionId, action: 'DUPLICATE_REPLAY' })]);
    const duplicate = await first.schedule(missionId, scheduledAt);
    expect(duplicate.items).toEqual([expect.objectContaining({ missionId, action: 'DUPLICATE_REPLAY' })]);

    const restarted = await AtlasLocalMissionCoordinator.open({ root, scope, clock });
    const persisted = await restarted.snapshot();
    expect(persisted.missionState.waits).toEqual(expect.arrayContaining([
      expect.objectContaining({ missionId, kind: 'schedule', status: 'ACTIVE', expiresAt: scheduledAt }),
    ]));
    now = scheduledAt;
    const tick = await restarted.runSchedulerTick();
    expect(tick.items).toEqual([expect.objectContaining({ missionId, action: 'ACTIVATED' })]);
    expect((await restarted.inspect(missionId)).mission?.spec.state).toBe('ACTIVE');
    const firedReplay = await restarted.schedule(missionId, scheduledAt);
    expect(firedReplay.items).toEqual([expect.objectContaining({ missionId, action: 'DUPLICATE_REPLAY' })]);
  });

  it('rejects a second active schedule and restores a paused schedule', async () => {
    const { root } = await fixture();
    let now = '2026-07-24T08:00:00.000Z';
    const clock = () => now;
    const coordinator = await AtlasLocalMissionCoordinator.open({ root, scope, clock });
    const missionId = 'scheduled-pause-001';
    const input = {
      missionId,
      agent: {
        agentId: 'front-desk',
        agentVersionId: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        deploymentId: 'deployment-scheduled-pause-001',
        runtime: { mode: 'local', adapter: 'atlas-local-fixture' },
      },
      missionType: 'scheduled-business-task',
      goal: 'Run after pause and resume',
      successCriteria: 'The schedule remains durable',
      correlation: { correlationId: 'correlation-scheduled-pause-001' },
      provenance: { source: 'schedule' as const, inputDigest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' },
    };
    await coordinator.scheduleMission(input, '2026-07-24T09:00:00.000Z');
    await expect(coordinator.schedule(missionId, '2026-07-24T10:00:00.000Z')).rejects.toMatchObject({ code: 'CONFLICT' });
    await coordinator.pause(missionId, 'operator-local', 'pause scheduled work');
    const paused = await coordinator.snapshot();
    expect(paused.missionState.waits).toEqual(expect.arrayContaining([
      expect.objectContaining({ missionId, kind: 'schedule', status: 'CANCELLED', expiresAt: '2026-07-24T09:00:00.000Z' }),
    ]));
    await coordinator.resume(missionId, 'operator-local', 'resume scheduled work');
    const resumed = await coordinator.snapshot();
    expect(resumed.missionState.waits).toEqual(expect.arrayContaining([
      expect.objectContaining({ missionId, kind: 'schedule', status: 'ACTIVE', expiresAt: '2026-07-24T09:00:00.000Z' }),
    ]));
    expect((await coordinator.inspect(missionId)).mission?.spec.activeWait).toEqual(expect.objectContaining({ kind: 'schedule', expiresAt: '2026-07-24T09:00:00.000Z' }));
    now = '2026-07-24T09:01:00.000Z';
    const tick = await coordinator.runSchedulerTick();
    expect(tick.items).toEqual([expect.objectContaining({ missionId, action: 'ACTIVATED' })]);
  });

  it('restores a paused business-event wait before accepting its signal', async () => {
    const { root } = await fixture();
    const coordinator = await AtlasLocalMissionCoordinator.open({ root, scope, clock: () => '2026-07-24T08:00:00.000Z' });
    const scheduled = await coordinator.scheduleMission({
      missionId: 'event-pause-resume-001',
      agent: { agentId: 'front-desk', agentVersionId: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', deploymentId: 'deployment-event-pause-001', runtime: { mode: 'local', adapter: 'atlas-local-fixture' } },
      missionType: 'business-event-task', goal: 'Wait through pause', successCriteria: 'The event resumes the Mission', correlation: { correlationId: 'correlation-event-pause-001' }, provenance: { source: 'schedule', inputDigest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' },
    }, '2026-07-24T08:00:00.000Z');
    const missionId = scheduled.items[0]!.missionId;
    await coordinator.runSchedulerTick('2026-07-24T08:00:00.000Z');
    await coordinator.waitForEvent(missionId, { eventType: 'booking.updated', eventKey: 'BK-100:pause', expiresAt: '2026-07-24T09:00:00.000Z' });
    await coordinator.pause(missionId, 'operator-local', 'pause event wait');
    await coordinator.resume(missionId, 'operator-local', 'resume event wait');
    const resumed = await coordinator.snapshot();
    expect(resumed.missionState.waits).toEqual(expect.arrayContaining([
      expect.objectContaining({ missionId, kind: 'event', status: 'ACTIVE', expiresAt: '2026-07-24T09:00:00.000Z', payload: { eventType: 'booking.updated', eventKey: 'BK-100:pause' } }),
    ]));
    expect(resumed.missionState.missions.find((mission) => mission.metadata.missionId === missionId)?.spec.state).toBe('WAITING_EVENT');
    expect(resumed.missionState.missions.find((mission) => mission.metadata.missionId === missionId)?.spec.activeWait).toEqual(expect.objectContaining({ kind: 'event', expiresAt: '2026-07-24T09:00:00.000Z' }));
    await expect(coordinator.signalEvent(missionId, 'booking.updated', 'BK-100:pause', '2026-07-24T08:00:01.000Z')).resolves.toMatchObject({ status: 'event_received' });
  });

  it('registers and resolves a durable business-event wait idempotently', async () => {
    const { root } = await fixture();
    let now = '2026-07-24T08:00:00.000Z';
    const clock = () => now;
    const coordinator = await AtlasLocalMissionCoordinator.open({ root, scope, clock });
    const scheduled = await coordinator.scheduleMission({
      missionId: 'event-wait-mission-001',
      agent: {
        agentId: 'front-desk',
        agentVersionId: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        deploymentId: 'deployment-event-wait-001',
        runtime: { mode: 'local', adapter: 'atlas-local-fixture' },
      },
      missionType: 'business-event-task',
      goal: 'Wait for a local business event',
      successCriteria: 'The matching event resumes the Mission',
      correlation: { correlationId: 'correlation-event-wait-001' },
      provenance: { source: 'schedule', inputDigest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' },
    }, '2026-07-24T09:00:00.000Z');
    const missionId = scheduled.items[0]!.missionId;
    now = '2026-07-24T09:00:00.000Z';
    await coordinator.runSchedulerTick();

    const waiting = await coordinator.waitForEvent(missionId, {
      eventType: 'booking.updated',
      eventKey: 'BK-100:v2',
      expiresAt: '2026-07-24T10:00:00.000Z',
    });
    expect(waiting.status).toBe('waiting_event');
    expect(waiting.mission.spec.state).toBe('WAITING_EVENT');
    expect(waiting.mission.spec.activeWait).toEqual(expect.objectContaining({ kind: 'event', expiresAt: '2026-07-24T10:00:00.000Z' }));

    const duplicate = await coordinator.waitForEvent(missionId, {
      eventType: 'booking.updated',
      eventKey: 'BK-100:v2',
      expiresAt: '2026-07-24T10:00:00.000Z',
    });
    expect(duplicate.replayed).toBe(true);
    await expect(coordinator.waitForEvent(missionId, {
      eventType: 'booking.updated',
      eventKey: 'BK-100:v2',
      expiresAt: '2026-07-24T11:00:00.000Z',
    })).rejects.toMatchObject({ code: 'CONFLICT' });

    const signalled = await coordinator.signalEvent(missionId, 'booking.updated', 'BK-100:v2', '2026-07-24T09:30:00.000Z');
    expect(signalled.status).toBe('event_received');
    expect(signalled.mission.spec.state).toBe('ACTIVE');
    expect(signalled.mission.spec.activeWait).toBeUndefined();
    expect((await coordinator.snapshot()).missionState.waits).toEqual(expect.arrayContaining([
      expect.objectContaining({ missionId, status: 'RELEASED', kind: 'event' }),
    ]));

    await expect(coordinator.signalEvent(missionId, 'booking.updated', 'BK-100:v2', '2026-07-24T09:31:00.000Z')).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('routes generic triggers through durable replay and governed event signaling', async () => {
    const { root } = await fixture();
    const coordinator = await AtlasLocalMissionCoordinator.open({ root, scope, clock: () => '2026-07-24T08:00:00.000Z' });
    const scheduled = await coordinator.scheduleMission({
      missionId: 'trigger-mission-001',
      agent: { agentId: 'front-desk', agentVersionId: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', deploymentId: 'deployment-trigger-001', runtime: { mode: 'local', adapter: 'atlas-local-fixture' } },
      missionType: 'business-event-task', goal: 'Wait for a trigger', successCriteria: 'The trigger is applied', correlation: { correlationId: 'correlation-trigger-001' }, provenance: { source: 'schedule', inputDigest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' },
    }, '2026-07-24T08:00:00.000Z');
    const missionId = scheduled.items[0]!.missionId;
    await coordinator.runSchedulerTick('2026-07-24T08:00:00.000Z');
    await coordinator.waitForEvent(missionId, { eventType: 'booking.updated', eventKey: 'BK-100:v4' });
    const applied = await coordinator.trigger({ triggerId: 'webhook-trigger-001', type: 'booking.updated', occurredAt: '2026-07-24T08:00:01.000Z', missionId, eventType: 'booking.updated', eventKey: 'BK-100:v4', payload: { booking_id: 'BK-100' } });
    expect(applied.status).toBe('APPLIED');
    expect(applied.coordinator?.mission.spec.state).toBe('ACTIVE');
    const replay = await coordinator.trigger({ triggerId: 'webhook-trigger-001', type: 'booking.updated', occurredAt: '2026-07-24T08:00:01.000Z', missionId, eventType: 'booking.updated', eventKey: 'BK-100:v4', payload: { booking_id: 'BK-100' } });
    expect(replay).toMatchObject({ status: 'APPLIED', replayed: true, missionId });
    expect((await coordinator.snapshot()).missionState.triggers).toEqual([expect.objectContaining({ triggerId: 'webhook-trigger-001', status: 'APPLIED', eventType: 'booking.updated', eventKey: 'BK-100:v4' })]);
    await expect(coordinator.trigger({ triggerId: 'webhook-trigger-001', type: 'booking.updated', occurredAt: '2026-07-24T08:00:01.000Z', missionId, eventType: 'booking.updated', eventKey: 'BK-100:v5', payload: { booking_id: 'BK-100' } })).rejects.toMatchObject({ code: 'CONFLICT' });
    await expect(coordinator.trigger({ triggerId: 'webhook-trigger-002', type: 'booking.updated', occurredAt: '2026-07-24T08:00:02.000Z', missionId, eventType: 'booking.updated', eventKey: 'BK-100:v4', payload: { booking_id: 'BK-100' } })).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it.each([
    { label: 'eventType and eventKey without missionId', route: { eventType: 'booking.updated', eventKey: 'BK-100:v6' } },
    { label: 'eventType only', route: { eventType: 'booking.updated' } },
    { label: 'eventKey only', route: { eventKey: 'BK-100:v6' } },
    { label: 'missionId with eventType only', route: { missionId: 'mission-001', eventType: 'booking.updated' } },
    { label: 'missionId with eventKey only', route: { missionId: 'mission-001', eventKey: 'BK-100:v6' } },
    { label: 'blank eventType', route: { missionId: 'mission-001', eventType: ' ', eventKey: 'BK-100:v6' } },
    { label: 'blank eventKey', route: { missionId: 'mission-001', eventType: 'booking.updated', eventKey: ' ' } },
  ])('rejects incomplete event-routed trigger: $label', async ({ route }, index) => {
    const { root } = await fixture();
    const coordinator = await AtlasLocalMissionCoordinator.open({ root, scope, clock: () => '2026-07-24T08:00:00.000Z' });
    await expect(coordinator.trigger({
      triggerId: `webhook-incomplete-route-${index}`,
      type: 'booking.updated',
      occurredAt: '2026-07-24T08:00:01.000Z',
      payload: { booking_id: 'BK-100' },
      ...route,
    })).rejects.toMatchObject({ code: 'USAGE_ERROR' });
    expect((await coordinator.snapshot()).missionState.triggers).toEqual([]);
  });

  it('rejects generic triggers that claim a Mission outside the local scope', async () => {
    const { root } = await fixture();
    const coordinator = await AtlasLocalMissionCoordinator.open({ root, scope, clock: () => '2026-07-24T08:00:00.000Z' });
    await expect(coordinator.trigger({ triggerId: 'webhook-foreign-mission', type: 'booking.updated', occurredAt: '2026-07-24T08:00:01.000Z', missionId: 'missing-mission', payload: { booking_id: 'BK-100' } })).rejects.toMatchObject({ code: 'AUTHORIZATION_FAILED' });
    expect((await coordinator.snapshot()).missionState.triggers).toEqual([expect.objectContaining({ triggerId: 'webhook-foreign-mission', status: 'REJECTED' })]);
  });

  it('rejects an event at or after wait expiry before scheduler reconciliation', async () => {
    const { root } = await fixture();
    let now = '2026-07-24T08:00:00.000Z';
    const clock = () => now;
    const coordinator = await AtlasLocalMissionCoordinator.open({ root, scope, clock });
    const scheduled = await coordinator.scheduleMission({
      missionId: 'event-wait-expiry-001',
      agent: {
        agentId: 'front-desk',
        agentVersionId: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        deploymentId: 'deployment-event-expiry-001',
        runtime: { mode: 'local', adapter: 'atlas-local-fixture' },
      },
      missionType: 'business-event-task',
      goal: 'Wait for a bounded event',
      successCriteria: 'The event arrives before expiry',
      correlation: { correlationId: 'correlation-event-expiry-001' },
      provenance: { source: 'schedule', inputDigest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' },
    }, '2026-07-24T09:00:00.000Z');
    const missionId = scheduled.items[0]!.missionId;
    now = '2026-07-24T09:00:00.000Z';
    await coordinator.runSchedulerTick();
    await coordinator.waitForEvent(missionId, { eventType: 'booking.updated', eventKey: 'BK-100:v3', expiresAt: '2026-07-24T10:00:00.000Z' });
    await expect(coordinator.signalEvent(missionId, 'booking.updated', 'BK-100:v3', '2026-07-24T10:00:00.000Z')).rejects.toMatchObject({ code: 'CONFLICT' });
    expect((await coordinator.inspect(missionId)).mission?.spec.state).toBe('WAITING_EVENT');
    now = '2026-07-24T10:01:00.000Z';
    const tick = await coordinator.runSchedulerTick();
    expect(tick.items).toEqual([expect.objectContaining({ missionId, action: 'EXPIRED' })]);
    await expect(coordinator.signalEvent(missionId, 'booking.updated', 'BK-100:v3', '2026-07-24T10:02:00.000Z')).rejects.toMatchObject({ code: 'CONFLICT' });
    expect((await coordinator.inspect(missionId)).mission?.spec.state).toBe('EXPIRED');
  });

  it('fences schedules by environment and cancellation', async () => {
    const { root, clock } = await fixture();
    const coordinator = await AtlasLocalMissionCoordinator.open({ root, scope, clock });
    const inbound = await coordinator.receive({ ...message, message_id: 'msg-coordinator-schedule-002' });

    await expect(coordinator.schedule(inbound.missionId, '2026-07-24T09:00:00.000Z', 'other-environment')).rejects.toMatchObject({ code: 'AUTHORIZATION_FAILED' });
    await coordinator.cancel(inbound.missionId, 'operator-local', 'cancel before schedule');
    await expect(coordinator.schedule(inbound.missionId, '2026-07-24T09:00:00.000Z')).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('creates public deadlines through scheduleMission and expires them after restart', async () => {
    const { root } = await fixture();
    let now = '2026-07-24T08:00:00.000Z';
    const clock = () => now;
    const coordinator = await AtlasLocalMissionCoordinator.open({ root, scope, clock });
    const scheduled = await coordinator.scheduleMission({
      missionId: 'scheduled-deadline-public-001',
      agent: { agentId: 'front-desk', agentVersionId: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', deploymentId: 'deployment-deadline-public-001', runtime: { mode: 'local', adapter: 'atlas-local-fixture' } },
      missionType: 'scheduled-business-task', goal: 'Expire at a public deadline', successCriteria: 'The scheduler records expiry',
      deadline: '2026-07-24T08:01:00.000Z', correlation: { correlationId: 'correlation-deadline-public-001' }, provenance: { source: 'schedule', inputDigest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' },
    }, '2026-07-24T08:00:30.000Z');
    const missionId = scheduled.items[0]!.missionId;
    expect((await coordinator.inspect(missionId)).mission?.spec.deadline).toBe('2026-07-24T08:01:00.000Z');
    const restarted = await AtlasLocalMissionCoordinator.open({ root, scope, clock });
    now = '2026-07-24T08:02:00.000Z';
    const tick = await restarted.runSchedulerTick();
    expect(tick.items).toEqual([expect.objectContaining({ missionId, action: 'EXPIRED' })]);
    expect((await restarted.inspect(missionId)).mission?.spec.state).toBe('EXPIRED');
  });

  it('serializes concurrent scheduler ticks and cancellation at a due deadline', async () => {
    const { root } = await fixture();
    let now = '2026-07-24T08:00:00.000Z';
    const clock = () => now;
    const coordinator = await AtlasLocalMissionCoordinator.open({ root, scope, clock });
    const scheduled = await coordinator.scheduleMission({
      missionId: 'scheduler-race-001',
      agent: { agentId: 'front-desk', agentVersionId: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', deploymentId: 'deployment-scheduler-race-001', runtime: { mode: 'local', adapter: 'atlas-local-fixture' } },
      missionType: 'scheduled-business-task', goal: 'Exercise scheduler race', successCriteria: 'Only one terminal transition is recorded', deadline: '2026-07-24T08:01:00.000Z',
      correlation: { correlationId: 'correlation-scheduler-race-001' }, provenance: { source: 'schedule', inputDigest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' },
    }, '2026-07-24T08:00:30.000Z');
    const missionId = scheduled.items[0]!.missionId;
    now = '2026-07-24T08:02:00.000Z';
    const [tick, cancellation] = await Promise.allSettled([
      coordinator.runSchedulerTick(),
      coordinator.cancel(missionId, 'operator-race', 'cancel due Mission'),
    ]);
    expect([tick.status, cancellation.status]).toEqual(expect.arrayContaining(['fulfilled']));
    const inspected = await coordinator.inspect(missionId);
    expect(['CANCELLED', 'EXPIRED']).toContain(inspected.mission?.spec.state);
    expect(inspected.ledger?.events.filter((event) => ['CANCELLED', 'EXPIRED'].includes(event.spec.resultingState))).toHaveLength(1);
  });

  it('expires due Missions through the scheduler and preserves restart truth', async () => {
    const { root } = await fixture();
    let now = '2026-07-24T08:00:00.000Z';
    const clock = () => now;
    const coordinator = await AtlasLocalMissionCoordinator.open({ root, scope, clock });
    const inbound = await coordinator.receive({ ...message, message_id: 'msg-coordinator-deadline-001' });
    const snapshot = await coordinator.snapshot();
    const mission = snapshot.missionState.missions.find((candidate) => candidate.metadata.missionId === inbound.missionId)!;
    const deadline = new Date(Date.parse(mission.spec.timestamps.createdAt) + 60_000).toISOString();
    const deadlineMission = { ...mission, spec: { ...mission.spec, deadline } };
    const storeStatePath = path.join(root, '.atlas', 'mission-store.json');
    const persisted = JSON.parse(await readFile(storeStatePath, 'utf8')) as Record<string, unknown>;
    persisted.missions = [deadlineMission];
    await writeFile(storeStatePath, `${JSON.stringify(persisted, null, 2)}\n`);
    now = '2026-07-24T08:02:00.000Z';

    const tick = await coordinator.runSchedulerTick();
    expect(tick.items).toEqual([expect.objectContaining({ missionId: inbound.missionId, action: 'EXPIRED' })]);
    const restarted = await AtlasLocalMissionCoordinator.open({ root, scope, clock });
    expect((await restarted.inspect(inbound.missionId)).mission?.spec.state).toBe('EXPIRED');
  });

  it('reconciles approval replay without duplicate lifecycle events', async () => {
    const { root, clock } = await fixture();
    const coordinator = await AtlasLocalMissionCoordinator.open({ root, scope, clock });
    const inbound = await coordinator.receive(message);
    const first = await coordinator.approve(inbound.runtime.approval.id, 'operator-local');
    const second = await coordinator.approve(inbound.runtime.approval.id, 'operator-local');

    expect(first.mission.spec.state).toBe('WAITING_EVENT');
    expect(second.replayed).toBe(true);
    expect(second.mission.spec.state).toBe('WAITING_EVENT');
    expect((await coordinator.snapshot()).missionState.lifecycleEvents.filter((event) => event.spec.missionId === inbound.missionId)).toHaveLength(6);
    expect((await coordinator.snapshot()).missionState.waits).toEqual(expect.arrayContaining([
      expect.objectContaining({ missionId: inbound.missionId, kind: 'approval', status: 'RELEASED' }),
      expect.objectContaining({ missionId: inbound.missionId, kind: 'event', status: 'ACTIVE' }),
    ]));
  });

  it('reconciles terminal delivery replay without duplicate completion events', async () => {
    const { root, clock } = await fixture();
    const coordinator = await AtlasLocalMissionCoordinator.open({ root, scope, clock });
    const inbound = await coordinator.receive(message);
    const committed = await coordinator.approve(inbound.runtime.approval.id, 'operator-local');
    const first = await coordinator.deliver(committed.runtime.outbox.id, {
      outcome: 'delivered',
      provider_message_id: 'local-provider-message-replay',
    });

    const replay = await coordinator.deliver(committed.runtime.outbox.id, {
      outcome: 'delivered',
      provider_message_id: 'local-provider-message-replay',
    });

    const inspected = await coordinator.inspect(inbound.missionId);
    expect(replay.replayed).toBe(true);
    expect(first.mission.spec.state).toBe('COMPLETED');
    expect(inspected.mission?.spec.state).toBe('COMPLETED');
    expect(inspected.ledger?.events.filter((event) => event.spec.resultingState === 'COMPLETED')).toHaveLength(1);
    expect((await coordinator.snapshot()).missionState.waits).toEqual(expect.arrayContaining([
      expect.objectContaining({ missionId: inbound.missionId, kind: 'event', status: 'RELEASED' }),
    ]));
  });

  it('fences coordinator delivery callbacks after Mission completion', async () => {
    const { root, clock } = await fixture();
    const coordinator = await AtlasLocalMissionCoordinator.open({ root, scope, clock });
    const inbound = await coordinator.receive({ ...message, message_id: 'msg-coordinator-callback-001' });
    const committed = await coordinator.approve(inbound.runtime.approval.id, 'operator-local');
    await coordinator.deliver(committed.runtime.outbox.id, {
      outcome: 'accepted',
      provider_message_id: 'local-provider-callback-001',
    });
    const completed = await coordinator.applyDeliveryCallback({
      callback_id: 'callback-completed-001',
      provider_message_id: 'local-provider-callback-001',
      state: 'delivered',
      occurred_at: '2026-07-24T08:00:01.000Z',
    });
    expect(completed.mission.spec.state).toBe('COMPLETED');
    const replay = await coordinator.applyDeliveryCallback({
      callback_id: 'callback-completed-001',
      provider_message_id: 'local-provider-callback-001',
      state: 'delivered',
      occurred_at: '2026-07-24T08:00:01.000Z',
    });
    expect(replay.replayed).toBe(true);
    await expect(coordinator.applyDeliveryCallback({
      callback_id: 'callback-completed-002',
      provider_message_id: 'local-provider-callback-001',
      state: 'read',
      occurred_at: '2026-07-24T08:00:02.000Z',
    })).rejects.toMatchObject({ code: 'CONFLICT' });
    expect((await coordinator.inspect(inbound.missionId)).mission?.spec.state).toBe('COMPLETED');
  });

  it('replays exact callbacks after a Mission reaches FAILED', async () => {
    const { root, clock } = await fixture();
    const coordinator = await AtlasLocalMissionCoordinator.open({ root, scope, clock });
    const inbound = await coordinator.receive({ ...message, message_id: 'msg-coordinator-callback-failed-001' });
    const committed = await coordinator.approve(inbound.runtime.approval.id, 'operator-local');
    await coordinator.deliver(committed.runtime.outbox.id, {
      outcome: 'accepted',
      provider_message_id: 'local-provider-callback-failed-001',
    });
    const failed = await coordinator.applyDeliveryCallback({
      callback_id: 'callback-failed-001',
      provider_message_id: 'local-provider-callback-failed-001',
      state: 'failed',
      occurred_at: '2026-07-24T08:00:01.000Z',
    });
    expect(failed.mission.spec.state).toBe('FAILED');
    const replay = await coordinator.applyDeliveryCallback({
      callback_id: 'callback-failed-001',
      provider_message_id: 'local-provider-callback-failed-001',
      state: 'failed',
      occurred_at: '2026-07-24T08:00:01.000Z',
    });
    expect(replay).toMatchObject({ replayed: true, mission: { spec: { state: 'FAILED' } } });
  });

  it('replays exact permanent delivery rejection after a failed Mission', async () => {
    const { root, clock } = await fixture();
    const coordinator = await AtlasLocalMissionCoordinator.open({ root, scope, clock });
    const inbound = await coordinator.receive({ ...message, message_id: 'msg-coordinator-delivery-rejected-001' });
    const committed = await coordinator.approve(inbound.runtime.approval.id, 'operator-local');
    const first = await coordinator.deliver(committed.runtime.outbox.id, {
      outcome: 'permanent_rejection',
      provider_code: 'RECIPIENT_BLOCKED',
    });
    expect(first.mission.spec.state).toBe('FAILED');
    const replay = await coordinator.deliver(committed.runtime.outbox.id, {
      outcome: 'permanent_rejection',
      provider_code: 'RECIPIENT_BLOCKED',
    });
    expect(replay).toMatchObject({ replayed: true, mission: { spec: { state: 'FAILED' } } });
  });

  it('reports cancelled replay from Mission state and never reopens approval', async () => {
    const { root, clock } = await fixture();
    const coordinator = await AtlasLocalMissionCoordinator.open({ root, scope, clock });
    const inbound = await coordinator.receive(message);
    await coordinator.cancel(inbound.missionId, 'operator-local', 'cancel before replay');

    const replay = await coordinator.replay(message);
    expect(replay.replayed).toBe(true);
    expect(replay.status).toBe('cancelled');
    expect(replay.mission.spec.state).toBe('CANCELLED');
    expect((await coordinator.snapshot()).missionState.waits).toEqual(expect.arrayContaining([
      expect.objectContaining({ missionId: inbound.missionId, status: 'CANCELLED' }),
    ]));
  });

  it('does not let inspect reload erase a pending runtime commit', async () => {
    const { root, clock } = await fixture();
    const coordinator = await AtlasLocalMissionCoordinator.open({ root, scope, clock });
    const inbound = await coordinator.receive(message);
    const inspected = await coordinator.inspect(inbound.missionId);
    expect(inspected.mission?.spec.state).toBe('WAITING_APPROVAL');
    const reopened = await AtlasLocalMissionCoordinator.open({ root, scope, clock });
    expect((await reopened.snapshot()).runtime.messages).toHaveLength(1);
  });

  it('fences a stale coordinator before its runtime commit is persisted', async () => {
    const { root } = await fixture();
    let clockCalls = 0;
    const clock = () => {
      clockCalls += 1;
      return clockCalls < 3
        ? '2026-07-24T08:00:00.000Z'
        : '2026-07-24T08:00:00.250Z';
    };
    const coordinator = await AtlasLocalMissionCoordinator.open({ root, scope, clock, leaseTtlMs: 100 });

    await expect(coordinator.receive(message)).rejects.toMatchObject({ code: 'CONFLICT' });

    const reopened = await AtlasLocalMissionCoordinator.open({
      root,
      scope,
      clock: () => '2026-07-24T08:00:00.250Z',
      leaseTtlMs: 100,
    });
    const snapshot = await reopened.snapshot();
    expect(snapshot.runtime.messages).toHaveLength(0);
    expect(snapshot.missionState.missions).toHaveLength(0);
  });

  it('resumes a Mission after SIGKILL at receive, approval and delivery checkpoints', async () => {
    const { root } = await fixture();
    await killWorkerAtCheckpoint(root, 'receive', 'worker-receive', '2026-07-24T08:00:00.000Z', '"state":"WAITING_APPROVAL"');
    await killWorkerAtCheckpoint(root, 'approve', 'worker-approve', '2026-07-24T08:00:01.001Z', '"state":"WAITING_EVENT"');
    await killWorkerAtCheckpoint(root, 'deliver', 'worker-deliver', '2026-07-24T08:00:02.002Z', '"state":"COMPLETED"');

    expect(await verifyPersistedMissionState(root, 'COMPLETED')).toBe(0);
  });

  it('resumes control state after SIGKILL at pause, resume and cancel checkpoints', async () => {
    const { root } = await fixture();
    await killWorkerAtCheckpoint(root, 'receive', 'worker-control-receive', '2026-07-24T08:00:00.000Z', '"state":"WAITING_APPROVAL"');
    await killWorkerAtCheckpoint(root, 'pause', 'worker-control-pause', '2026-07-24T08:00:01.001Z', '"state":"PAUSED"');
    await killWorkerAtCheckpoint(root, 'resume', 'worker-control-resume', '2026-07-24T08:00:02.002Z', '"state":"WAITING_APPROVAL"');
    await killWorkerAtCheckpoint(root, 'cancel', 'worker-control-cancel', '2026-07-24T08:00:03.003Z', '"state":"CANCELLED"');

    expect(await verifyPersistedMissionState(root, 'CANCELLED')).toBe(0);
  });

  it('rejects reopening a project with a different local Mission scope', async () => {
    const { root, clock } = await fixture();
    await AtlasLocalMissionCoordinator.open({ root, scope, clock });
    await expect(AtlasLocalMissionCoordinator.open({
      root,
      scope: { ...scope, tenantId: 'tenant-other' },
      clock,
    })).rejects.toMatchObject({ code: 'AUTHORIZATION_FAILED' });
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

  it('rejects conflicting held messages at one sequence without overwriting the original', async () => {
    const { root, clock } = await fixture();
    const coordinator = await AtlasLocalMissionCoordinator.open({ root, scope, clock });
    await coordinator.receive({ ...message, message_id: 'held-original', sequence: 2 });

    await expect(coordinator.receive({ ...message, message_id: 'held-conflict', sequence: 2, text: 'What is the booking policy?' })).rejects.toMatchObject({
      code: 'CONFLICT',
    });
    const snapshot = await coordinator.snapshot();
    expect(snapshot.runtime.messages.map((item) => item.message_id)).not.toContain('held-conflict');
  });

  it('reconciles inbound replay from current queued outbox state without reopening approval', async () => {
    const { root, clock } = await fixture();
    const coordinator = await AtlasLocalMissionCoordinator.open({ root, scope, clock });
    const inbound = await coordinator.receive(message);
    const committed = await coordinator.approve(inbound.runtime.approval.id, 'operator-local');

    const replay = await coordinator.replay(message);
    expect(replay.replayed).toBe(true);
    expect(replay.status).toBe('queued');
    expect(replay.mission.spec.state).toBe('WAITING_EVENT');
    expect(replay.mission.spec.activeWait).toEqual(expect.objectContaining({ kind: 'event' }));
    expect(replay.runtime.outbox.id).toBe(committed.runtime.outbox.id);
    expect((await coordinator.snapshot()).missionState.lifecycleEvents.filter((event) => event.spec.missionId === inbound.missionId)).toHaveLength(6);
  });

  it('rejects contradictory terminal delivery replay payloads', async () => {
    const { root, clock } = await fixture();
    const coordinator = await AtlasLocalMissionCoordinator.open({ root, scope, clock });
    const inbound = await coordinator.receive(message);
    const committed = await coordinator.approve(inbound.runtime.approval.id, 'operator-local');
    await coordinator.deliver(committed.runtime.outbox.id, { outcome: 'delivered', provider_message_id: 'provider-original' });

    await expect(coordinator.deliver(committed.runtime.outbox.id, { outcome: 'delivered', provider_message_id: 'provider-other' })).rejects.toMatchObject({
      code: 'IDEMPOTENCY_MISMATCH',
    });
    await expect(coordinator.deliver(committed.runtime.outbox.id, { outcome: 'permanent_rejection', provider_code: 'CONTRADICTORY' })).rejects.toMatchObject({
      code: 'CONFLICT',
    });
  });
});
