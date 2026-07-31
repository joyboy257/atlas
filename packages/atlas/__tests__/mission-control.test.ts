import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { AtlasLocalMissionCoordinator } from '../src/mission-coordinator.js';
import { AtlasLocalRuntime } from '../src/local-runtime.js';
import { createMissionLeaseStore } from '../src/mission-leases.js';
import { scaffoldAtlasProject, type AtlasScaffoldDependencies } from '../src/index.js';
import { projectMissionEvent } from '../src/public-projections.js';

const roots: string[] = [];
const scope = { tenantId: 'tenant-control', organisationId: 'org-control', projectId: 'project-control', environmentId: 'local' };
const message = {
  message_id: 'msg-control-001', conversation_id: 'conv-control-001', customer_id: 'customer-control-001', channel_id: 'local-web-chat',
  sequence: 1, occurred_at: '2026-07-24T08:00:00.000Z', text: 'Can I move booking BK-100 to Friday?', consent: true, within_messaging_window: true,
} as const;

function dependencies(): AtlasScaffoldDependencies {
  return { runCommand: vi.fn().mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' }), inspectGit: vi.fn().mockResolvedValue({ available: true, repository: false, dirty: false, root: null }) };
}

async function fixture() {
  const base = await mkdtemp(path.join(os.tmpdir(), 'atlas-mission-control-'));
  roots.push(base);
  await scaffoldAtlasProject({ cwd: base, target: 'front-desk', install: false, initializeGit: false, nodeVersion: 'v22.12.0' }, dependencies());
  return { root: path.join(base, 'front-desk'), clock: () => '2026-07-24T08:00:00.000Z' };
}

afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));

describe('Atlas local Mission control surfaces', () => {
  it('pauses and resumes a waiting Mission through durable lifecycle commands', async () => {
    const { root, clock } = await fixture();
    const coordinator = await AtlasLocalMissionCoordinator.open({ root, scope, clock });
    const inbound = await coordinator.receive(message);

    const paused = await coordinator.pause(inbound.missionId, 'operator-control', 'pause before approval review');
    expect(paused.command).toBe('pause');
    expect(paused.correlationId).toBe(inbound.mission.spec.correlation.correlationId);
    expect(paused.mission.spec.state).toBe('PAUSED');
    expect(paused.waits).toEqual([expect.objectContaining({ status: 'CANCELLED', kind: 'approval' })]);
    expect(projectMissionEvent(paused.ledger.events.at(-1)! as any).spec.causationId).toBe('local.control.pause');
    expect(JSON.stringify(projectMissionEvent(paused.ledger.events.at(-1)! as any))).not.toContain('operator-control');
    expect(JSON.stringify(projectMissionEvent(paused.ledger.events.at(-1)! as any))).not.toContain('pause before approval review');

    const restarted = await AtlasLocalMissionCoordinator.open({ root, scope, clock });
    const inspected = await restarted.control(inbound.missionId, 'inspect', '', '');
    expect(inspected.mission.spec.state).toBe('PAUSED');
    expect(inspected.waits.every((wait) => wait.status !== 'ACTIVE')).toBe(true);

    const resumed = await restarted.resume(inbound.missionId, 'operator-control', 'resume after review');
    expect(resumed.command).toBe('resume');
    expect(resumed.mission.spec.state).toBe('WAITING_APPROVAL');
    expect(resumed.mission.spec.activeWait).toEqual(expect.objectContaining({ kind: 'approval' }));
    expect(projectMissionEvent(resumed.ledger.events.at(-1)! as any).spec.causationId).toBe('local.control.resume');
    expect(resumed.waits).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'approval', status: 'ACTIVE' }),
    ]));
    const committed = await restarted.approve(inbound.runtime.approval.id, 'operator-control', 'approved after resume');
    expect(committed.mission.spec.state).toBe('WAITING_EVENT');
    expect(committed.mission.spec.activeWait).toEqual(expect.objectContaining({ kind: 'event' }));
  });

  it('restores a held inbound wait after pause, restart and resume', async () => {
    const { root, clock } = await fixture();
    const coordinator = await AtlasLocalMissionCoordinator.open({ root, scope, clock });
    const held = await coordinator.receive({ ...message, message_id: 'msg-control-held', sequence: 2 });

    await coordinator.pause(held.missionId, 'operator-control', 'pause held inbound');
    const restarted = await AtlasLocalMissionCoordinator.open({ root, scope, clock });
    const resumed = await restarted.resume(held.missionId, 'operator-control', 'resume held inbound');

    expect(resumed.mission.spec.state).toBe('WAITING_EVENT');
    expect(resumed.mission.spec.activeWait).toEqual(expect.objectContaining({ kind: 'event' }));
    expect(resumed.waits).toEqual(expect.arrayContaining([
      expect.objectContaining({ missionId: held.missionId, kind: 'event', status: 'ACTIVE' }),
    ]));
  });

  it('fences takeover while another coordinator owns the Mission lease', async () => {
    const { root, clock } = await fixture();
    const coordinator = await AtlasLocalMissionCoordinator.open({ root, scope, clock, ownerId: 'coordinator-a' });
    const inbound = await coordinator.receive(message);
    const leaseStore = createMissionLeaseStore(root);
    await leaseStore.acquire({ scope, missionId: inbound.missionId, ownerId: 'coordinator-b', now: clock() });

    await expect(coordinator.takeover(message.conversation_id, 'operator-control', 'handoff')).rejects.toMatchObject({ code: 'CONFLICT' });
    const snapshot = await coordinator.snapshot();
    expect(snapshot.runtime.conversations[message.conversation_id]?.state).toBe('approval_pending');
    expect(snapshot.missionState.missions[0]?.spec.state).toBe('WAITING_APPROVAL');
  });

  it('fences delivery after Mission cancellation', async () => {
    const { root, clock } = await fixture();
    const coordinator = await AtlasLocalMissionCoordinator.open({ root, scope, clock });
    const inbound = await coordinator.receive(message);
    const committed = await coordinator.approve(inbound.runtime.approval.id, 'operator-control');
    await coordinator.cancel(inbound.missionId, 'operator-control', 'cancel before provider send');

    await expect(coordinator.deliver(committed.runtime.outbox.id, {
      outcome: 'delivered',
      provider_message_id: 'provider-cancelled',
    })).rejects.toMatchObject({ code: 'CONFLICT' });
    expect((await coordinator.snapshot()).runtime.outbox[0]?.state).toBe('queued');
  });

  it('fences all known local side effects after human takeover across restart', async () => {
    const { root, clock } = await fixture();
    const coordinator = await AtlasLocalMissionCoordinator.open({ root, scope, clock });
    const inbound = await coordinator.receive({ ...message, message_id: 'msg-control-takeover-001' });
    const committed = await coordinator.approve(inbound.runtime.approval.id, 'operator-control');
    await coordinator.deliver(committed.runtime.outbox.id, {
      outcome: 'accepted',
      provider_message_id: 'provider-before-takeover',
    });
    await coordinator.takeover(message.conversation_id, 'operator-human', 'customer requested a person');

    const restarted = await AtlasLocalMissionCoordinator.open({ root, scope, clock });
    const handedOff = await restarted.inspect(inbound.missionId);
    expect(handedOff.mission?.spec.state).toBe('HANDED_OFF');
    expect(handedOff.ledger?.events.at(-1)?.spec.resultingState).toBe('HANDED_OFF');

    await expect(restarted.approve(inbound.runtime.approval.id, 'operator-human')).rejects.toMatchObject({ code: 'CONFLICT' });
    await expect(restarted.deliver(committed.runtime.outbox.id, {
      outcome: 'delivered',
      provider_message_id: 'provider-before-takeover',
    })).rejects.toMatchObject({ code: 'CONFLICT' });
    const callback = await restarted.applyDeliveryCallback({
      callback_id: 'callback-after-takeover',
      provider_message_id: 'provider-before-takeover',
      state: 'delivered',
      occurred_at: '2026-07-24T08:00:01.000Z',
    });
    expect(callback.runtime.delivery).toMatchObject({
      state: 'delivered',
      provider_message_id: 'provider-before-takeover',
    });
    expect((await restarted.inspect(inbound.missionId)).mission?.spec.state).toBe('HANDED_OFF');

    const fenced = await restarted.receive({
      ...message,
      message_id: 'msg-control-takeover-002',
      sequence: 2,
      text: 'Can I move booking BK-100 to Monday?',
    });
    expect(fenced.status).toBe('human_takeover');
    expect(fenced.missionId).toBe(inbound.missionId);
    const fencedSnapshot = await restarted.snapshot();
    expect(fencedSnapshot.missionState.missions).toHaveLength(1);
    expect(fencedSnapshot.missionState.missions[0]?.metadata.missionId).toBe(inbound.missionId);
    expect(fencedSnapshot.missionState.missions[0]?.spec.state).toBe('HANDED_OFF');
    expect(fencedSnapshot.runtime.actions).toHaveLength(1);
    expect(fencedSnapshot.runtime.outbox[0]?.state).toBe('delivered');
  });

  it('projects an out-of-band runtime takeover onto an existing approval Mission', async () => {
    const { root, clock } = await fixture();
    const coordinator = await AtlasLocalMissionCoordinator.open({ root, scope, clock });
    const inbound = await coordinator.receive({ ...message, message_id: 'msg-control-out-of-band-takeover' });
    expect(inbound.status).toBe('approval_pending');
    expect(inbound.mission.spec.state).toBe('WAITING_APPROVAL');

    const separateRuntime = await AtlasLocalRuntime.open({ root, clock });
    await separateRuntime.takeHumanControl(
      message.conversation_id,
      { operator_id: 'operator-human', reason: 'customer requested a person' },
    );
    const afterTakeover = separateRuntime.snapshot();
    expect(afterTakeover.actions).toHaveLength(0);
    expect(afterTakeover.outbox).toHaveLength(0);

    const restarted = await AtlasLocalMissionCoordinator.open({ root, scope, clock });
    const fenced = await restarted.receive({
      ...message,
      message_id: 'msg-control-out-of-band-takeover-follow-up',
      sequence: 2,
      text: 'Can I move booking BK-100 to Monday?',
    });

    expect(fenced.status).toBe('human_takeover');
    expect(fenced.missionId).toBe(inbound.missionId);
    expect(fenced.mission.spec.state).toBe('HANDED_OFF');
    expect(fenced.mission.spec.activeWait).toBeUndefined();
    expect((await restarted.snapshot()).missionState.waits).toEqual([
      expect.objectContaining({ missionId: inbound.missionId, kind: 'approval', status: 'RELEASED' }),
    ]);
    const afterReceive = (await restarted.snapshot()).runtime;
    expect(afterReceive.actions).toHaveLength(afterTakeover.actions.length);
    expect(afterReceive.outbox).toHaveLength(afterTakeover.outbox.length);
    expect(afterReceive.approvals).toEqual(afterTakeover.approvals);
    expect(afterReceive.proposals).toEqual(afterTakeover.proposals);
  });

  it('hands off a paused Mission and rejects ordinary resume after restart', async () => {
    const { root, clock } = await fixture();
    const coordinator = await AtlasLocalMissionCoordinator.open({ root, scope, clock });
    const inbound = await coordinator.receive({ ...message, message_id: 'msg-control-paused-takeover' });
    await coordinator.pause(inbound.missionId, 'operator-control', 'pause before human takeover');

    const handedOff = await coordinator.takeover(message.conversation_id, 'operator-human', 'customer requested a person');
    expect(handedOff.mission.spec.state).toBe('HANDED_OFF');

    const restarted = await AtlasLocalMissionCoordinator.open({ root, scope, clock });
    expect((await restarted.inspect(inbound.missionId)).mission?.spec.state).toBe('HANDED_OFF');
    await expect(restarted.resume(inbound.missionId, 'operator-human', 'resume without governed return')).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('requires an explicit governed return-to-Agent command after takeover', async () => {
    const { root, clock } = await fixture();
    const coordinator = await AtlasLocalMissionCoordinator.open({ root, scope, clock });
    const inbound = await coordinator.receive({ ...message, message_id: 'msg-control-return-agent' });
    await coordinator.takeover(message.conversation_id, 'operator-human', 'customer requested a person');

    await expect(coordinator.returnToAgent(inbound.missionId, 'operator-other', 'resume automation'))
      .rejects.toMatchObject({ code: 'AUTHORIZATION_FAILED' });

    const returned = await coordinator.returnToAgent(inbound.missionId, 'operator-human', 'customer confirmed automation may resume');
    expect(returned.command).toBe('return_to_agent');
    expect(returned.mission.spec.state).toBe('WAITING_APPROVAL');
    expect(returned.mission.spec.activeWait).toEqual(expect.objectContaining({ kind: 'approval' }));
    expect(returned.waits).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'approval', status: 'ACTIVE' }),
    ]));
    expect(projectMissionEvent(returned.ledger.events.at(-1)! as any).spec.causationId).toBe('local.control.return-to-agent');
    expect(returned.runtime.conversations[message.conversation_id]).toMatchObject({
      state: 'automated',
      takeover: null,
      operator_id: null,
    });
    expect(returned.runtime.receipts).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'handoff', outcome: 'returned_to_agent' }),
    ]));

    const restarted = await AtlasLocalMissionCoordinator.open({ root, scope, clock });
    expect((await restarted.inspect(inbound.missionId)).mission?.spec.state).toBe('WAITING_APPROVAL');
    expect((await restarted.snapshot()).runtime.conversations[message.conversation_id]?.state).toBe('automated');
  });

  it('hands off a standalone scheduled Mission without a runtime conversation', async () => {
    const { root, clock } = await fixture();
    const coordinator = await AtlasLocalMissionCoordinator.open({ root, scope, clock });
    const scheduled = await coordinator.scheduleMission({
      missionId: 'scheduled-takeover-001',
      agent: {
        agentId: 'front-desk',
        agentVersionId: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        deploymentId: 'deployment-scheduled-takeover-001',
        runtime: { mode: 'local', adapter: 'atlas-local-fixture' },
      },
      missionType: 'scheduled-business-task',
      goal: 'Run the scheduled local business task',
      successCriteria: 'The scheduled task remains governed during handoff',
      conversation: { conversationId: message.conversation_id, channel: message.channel_id },
      correlation: { correlationId: 'correlation-scheduled-takeover-001' },
      provenance: { source: 'schedule', inputDigest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' },
    }, '2026-07-24T09:00:00.000Z');
    const missionId = scheduled.items[0]!.missionId;
    expect((await coordinator.inspect(missionId)).mission?.spec.state).toBe('WAITING_SCHEDULE');

    await coordinator.takeover(message.conversation_id, 'operator-human', 'customer requested a person');
    const takeoverSnapshot = await coordinator.snapshot();
    expect(takeoverSnapshot.runtime.conversations[message.conversation_id]).toMatchObject({
      state: 'human_takeover',
      operator_id: 'operator-human',
      handoff_reason: 'customer requested a person',
      takeover: expect.objectContaining({ operator_id: 'operator-human' }),
    });

    const restarted = await AtlasLocalMissionCoordinator.open({ root, scope, clock });
    expect((await restarted.inspect(missionId)).mission?.spec.state).toBe('HANDED_OFF');
    const fenced = await restarted.receive({
      ...message,
      message_id: 'scheduled-takeover-follow-up',
      sequence: 1,
      text: 'Can I move booking BK-100 to Monday?',
    });
    expect(fenced.status).toBe('human_takeover');
    expect((await restarted.snapshot()).runtime.actions).toHaveLength(0);
    await expect(restarted.resume(missionId, 'operator-human', 'resume without governed return')).rejects.toMatchObject({ code: 'CONFLICT' });
    const returned = await restarted.returnToAgent(missionId, 'operator-human', 'customer confirmed scheduled automation');
    expect(returned.mission.spec.state).toBe('WAITING_SCHEDULE');
    expect(returned.mission.spec.activeWait).toEqual(expect.objectContaining({ kind: 'schedule' }));
    expect(returned.runtime.receipts).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'handoff', subject_id: missionId, outcome: 'returned_to_agent' }),
    ]));
  });

  it('restores every sibling Mission sharing a conversation takeover', async () => {
    const { root, clock } = await fixture();
    const coordinator = await AtlasLocalMissionCoordinator.open({ root, scope, clock });
    const inbound = await coordinator.receive({ ...message, message_id: 'msg-control-sibling-primary' });
    const sibling = await coordinator.scheduleMission({
      missionId: 'scheduled-sibling-001',
      agent: {
        agentId: 'front-desk',
        agentVersionId: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        deploymentId: 'deployment-scheduled-sibling-001',
        runtime: { mode: 'local', adapter: 'atlas-local-fixture' },
      },
      missionType: 'scheduled-business-task',
      goal: 'Run the sibling scheduled task',
      successCriteria: 'The sibling remains governed during handoff',
      conversation: { conversationId: message.conversation_id, channel: message.channel_id },
      correlation: { correlationId: 'correlation-scheduled-sibling-001' },
      provenance: { source: 'schedule', inputDigest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' },
    }, '2026-07-24T09:00:00.000Z');
    const siblingMissionId = sibling.items[0]!.missionId;
    await coordinator.takeover(message.conversation_id, 'operator-human', 'customer requested a person');

    const returned = await coordinator.returnToAgent(inbound.missionId, 'operator-human', 'customer confirmed automation');
    expect(returned.mission.spec.state).toBe('WAITING_APPROVAL');
    expect((await coordinator.inspect(siblingMissionId)).mission?.spec.state).toBe('WAITING_SCHEDULE');
    expect((await coordinator.snapshot()).missionState.waits).toEqual(expect.arrayContaining([
      expect.objectContaining({ missionId: inbound.missionId, kind: 'approval', status: 'ACTIVE' }),
      expect.objectContaining({ missionId: siblingMissionId, kind: 'schedule', status: 'ACTIVE' }),
    ]));
  });

  it('cancels a Mission durably and never commits the pending proposal', async () => {
    const { root, clock } = await fixture();
    const coordinator = await AtlasLocalMissionCoordinator.open({ root, scope, clock });
    const inbound = await coordinator.receive(message);

    const cancelled = await coordinator.cancel(inbound.missionId, 'operator-control', 'customer withdrew request');
    expect(cancelled.mission.spec.state).toBe('CANCELLED');
    expect(cancelled.waits).toEqual([expect.objectContaining({ status: 'CANCELLED' })]);
    expect(cancelled.runtime.actions).toHaveLength(0);

    const restarted = await AtlasLocalMissionCoordinator.open({ root, scope, clock });
    await expect(restarted.approve(inbound.runtime.approval.id, 'operator-control')).rejects.toMatchObject({ code: 'CONFLICT' });
    await expect(restarted.reject(inbound.runtime.approval.id, 'operator-control')).rejects.toMatchObject({ code: 'CONFLICT' });
    expect((await restarted.snapshot()).runtime.actions).toHaveLength(0);
  });

  it('serializes concurrent cancel commands across coordinator instances', async () => {
    const { root, clock } = await fixture();
    const first = await AtlasLocalMissionCoordinator.open({ root, scope, clock });
    const second = await AtlasLocalMissionCoordinator.open({ root, scope, clock });
    const inbound = await first.receive(message);

    const results = await Promise.allSettled([
      first.cancel(inbound.missionId, 'operator-a', 'cancel for review'),
      second.cancel(inbound.missionId, 'operator-b', 'cancel duplicate request'),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((result) => result.status === 'rejected');
    expect(rejected).toMatchObject({ status: 'rejected', reason: expect.objectContaining({ code: 'CONFLICT' }) });
    expect((await first.inspect(inbound.missionId)).mission?.spec.state).toBe('CANCELLED');
  });

  it('serializes concurrent pause commands with one typed conflict', async () => {
    const { root, clock } = await fixture();
    const coordinator = await AtlasLocalMissionCoordinator.open({ root, scope, clock });
    const inbound = await coordinator.receive(message);

    const results = await Promise.allSettled([
      coordinator.pause(inbound.missionId, 'operator-a', 'pause for review'),
      coordinator.pause(inbound.missionId, 'operator-b', 'pause duplicate request'),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((result) => result.status === 'rejected');
    expect(rejected).toMatchObject({ status: 'rejected', reason: expect.objectContaining({ code: 'CONFLICT' }) });
    expect((await coordinator.inspect(inbound.missionId)).mission?.spec.state).toBe('PAUSED');
  });

  it('bounds inspect while a live coordinator lock is held', async () => {
    const { root, clock } = await fixture();
    const coordinator = await AtlasLocalMissionCoordinator.open({ root, scope, clock });
    await writeFile(
      path.join(root, '.atlas', 'mission-coordinator.lock'),
      JSON.stringify({ pid: process.pid, operation_id: 'wedged-test-owner', created_at: new Date().toISOString() }),
    );

    await expect(coordinator.control('missing-mission', 'inspect', '', '')).rejects.toMatchObject({
      code: 'CONFLICT',
      retryable: true,
    });
  }, 5_000);

  it('rejects invalid control transitions and preserves the durable state', async () => {
    const { root, clock } = await fixture();
    const coordinator = await AtlasLocalMissionCoordinator.open({ root, scope, clock });
    const inbound = await coordinator.receive(message);

    await expect(coordinator.resume(inbound.missionId, 'operator-control', 'resume too early')).rejects.toMatchObject({ code: 'CONFLICT' });
    const firstPause = await coordinator.pause(inbound.missionId, 'operator-control', 'pause');
    await expect(coordinator.pause(inbound.missionId, 'operator-control', 'pause again')).rejects.toMatchObject({ code: 'CONFLICT' });
    expect(firstPause.mission.spec.state).toBe('PAUSED');
  });
});
