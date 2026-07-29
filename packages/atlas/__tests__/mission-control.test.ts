import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { AtlasLocalMissionCoordinator, scaffoldAtlasProject, type AtlasScaffoldDependencies } from '../src/index.js';

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
    expect(paused.ledger.events.at(-1)?.spec.resultingState).toBe('PAUSED');

    const restarted = await AtlasLocalMissionCoordinator.open({ root, scope, clock });
    const inspected = await restarted.control(inbound.missionId, 'inspect', '', '');
    expect(inspected.mission.spec.state).toBe('PAUSED');
    expect(inspected.waits.every((wait) => wait.status !== 'ACTIVE')).toBe(true);

    const resumed = await restarted.resume(inbound.missionId, 'operator-control', 'resume after review');
    expect(resumed.command).toBe('resume');
    expect(resumed.mission.spec.state).toBe('ACTIVE');
    expect(resumed.ledger.events.at(-1)?.spec.resultingState).toBe('ACTIVE');
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
