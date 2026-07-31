import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  controlLocalMission,
  decideLocalMissionApproval,
  doctorLocalProject,
  explainLocalProject,
  inspectLocalProject,
  listLocalCapabilities,
  planLocalDeployment,
  replayLocalMission,
  replayLocalProject,
  testLocalProject,
  upgradeLocalProject,
} from '../src/local-commands.js';
import { AtlasLocalMissionCoordinator } from '../src/mission-coordinator.js';
import { AtlasLocalRuntime } from '../src/local-runtime.js';
import { loadAtlasProject } from '../src/project-contract.js';
import { scaffoldAtlasProject, type AtlasScaffoldDependencies } from '../src/scaffold.js';

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));

function dependencies(): AtlasScaffoldDependencies {
  return {
    runCommand: vi.fn().mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' }),
    inspectGit: vi.fn().mockResolvedValue({ available: true, repository: false, dirty: false, root: null }),
  };
}

async function project(): Promise<string> {
  const base = await mkdtemp(path.join(os.tmpdir(), 'atlas-local-commands-'));
  roots.push(base);
  await scaffoldAtlasProject({ cwd: base, target: 'front-desk', install: false, initializeGit: false, nodeVersion: 'v22.12.0' }, dependencies());
  return path.join(base, 'front-desk');
}

describe('Atlas local project commands', () => {
  it('runs the canonical First Agent Loop in a disposable sandbox', async () => {
    const root = await project();
    const before = await readFile(path.join(root, 'atlas.config.ts'), 'utf8');

    const result = await testLocalProject(root);

    expect(result).toMatchObject({
      status: 'passed',
      scenario_id: 'front-desk-first-agent-loop',
      exactly_once: true,
      action_count: 1,
      delivery_state: 'delivered',
      replayed: true,
    });
    expect(result.receipt_kinds).toEqual(expect.arrayContaining(['evidence', 'policy', 'approval', 'action', 'delivery']));
    await expect(readFile(path.join(root, '.atlas', 'runtime-state.json'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
    expect(await readFile(path.join(root, 'atlas.config.ts'), 'utf8')).toBe(before);
  });

  it('reports local health without creating runtime state', async () => {
    const root = await project();

    const result = await doctorLocalProject(root, { nodeVersion: 'v22.12.0' });

    expect(result.summary).toEqual({ pass: 5, note: 1, fail: 0 });
    expect(result.checks.map((check) => check.code)).toEqual(expect.arrayContaining([
      'NODE_SUPPORTED',
      'PROJECT_CONFIG_VALID',
      'PROJECT_HASH_READY',
      'PROJECT_REFERENCES_VALID',
      'RAW_SECRETS_ABSENT',
      'RUNTIME_STATE_NOT_CREATED',
    ]));
    await expect(readFile(path.join(root, '.atlas', 'runtime-state.json'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('fails the local doctor on an unsupported Node version', async () => {
    const root = await project();
    const result = await doctorLocalProject(root, { nodeVersion: 'v20.10.0' });

    expect(result.summary.fail).toBe(1);
    expect(result.checks.find((check) => check.code === 'NODE_UNSUPPORTED')).toMatchObject({ status: 'fail' });
  });

  it('explains the project and lists source-bound capabilities', async () => {
    const root = await project();
    const explanation = await explainLocalProject(root);
    const capabilities = await listLocalCapabilities(root);

    expect(explanation.project_hash).toMatch(/^sha256:/);
    expect(explanation.config.project.name).toBe('front-desk');
    expect(explanation.files).toContain('knowledge/booking-policy.md');
    expect(explanation.authority.atlas_owns).toEqual(expect.arrayContaining(['approval', 'committed business actions', 'delivery', 'receipts']));
    expect(capabilities).toMatchObject({
      runtime: 'native',
      model: 'local-fixture',
      zero_credentials: true,
      zero_paid_model: true,
    });
    expect(capabilities.commands).toEqual(expect.arrayContaining(['init', 'dev', 'test', 'doctor', 'capabilities', 'explain project', 'inspect', 'replay', 'deploy', 'upgrade']));
    expect(capabilities.tools[0]).toMatchObject({ id: 'front-desk.bookings.reschedule', approval: 'required', idempotency: 'required' });
  });

  it('inspects current runtime summaries without exposing raw customer text', async () => {
    const root = await project();
    const result = await inspectLocalProject(root);

    expect(result).toMatchObject({ runtime_state: 'not_created', counts: { conversations: 0, messages: 0, actions: 0, outbox: 0, receipts: 0, traces: 0 } });
    expect(JSON.stringify(result)).not.toContain('Can I move');
  });

  it('redacts raw payloads from Mission replay and approval results', async () => {
    const root = await project();
    const runtime = await AtlasLocalRuntime.open({ root, clock: () => '2026-07-24T08:00:00.000Z' });
    const identity = runtime.snapshot().identity;
    const scope = {
      tenantId: identity.tenant_id,
      organisationId: `local-org-${identity.project_hash.slice(0, 16)}`,
      projectId: identity.project_hash,
      environmentId: 'local',
    } as const;
    const message = {
      message_id: 'msg-replay-redaction',
      conversation_id: 'conv-replay-redaction',
      customer_id: 'cust-replay-redaction',
      channel_id: 'local-web-chat',
      sequence: 1,
      occurred_at: '2026-07-24T08:00:00.000Z',
      text: 'RAW CUSTOMER SECRET: Can I move booking BK-100 to Friday?',
      consent: true,
      within_messaging_window: true,
    } as const;
    const coordinator = await AtlasLocalMissionCoordinator.open({ root, scope, clock: () => '2026-07-24T08:00:00.000Z' });
    await coordinator.receive(message);
    const approvalId = Object.keys((await coordinator.snapshot()).runtime.approvals)[0]!;
    const replayed = await replayLocalMission(root, scope, message);
    const approved = await decideLocalMissionApproval(root, scope, approvalId, 'approve', 'operator-redaction', undefined, {
      clock: () => '2026-07-24T08:00:00.000Z',
    });
    for (const result of [replayed, approved]) {
      const serialized = JSON.stringify(result);
      expect(serialized).not.toContain('RAW CUSTOMER SECRET');
      expect(serialized).not.toContain('booking BK-100');
      expect(serialized).not.toContain('"goal"');
      expect(serialized).not.toContain('"body"');
      expect(serialized).not.toContain('"data"');
      expect(serialized).not.toContain('"payload"');
      expect(serialized).not.toContain('"excerpt"');
    }
  });

  it('redacts raw payloads from Mission pause, resume, and cancel results', async () => {
    const root = await project();
    const sentinel = 'RAW CUSTOMER SECRET';
    const runtime = await AtlasLocalRuntime.open({ root, clock: () => '2026-07-24T08:00:00.000Z' });
    const identity = runtime.snapshot().identity;
    const scope = {
      tenantId: identity.tenant_id,
      organisationId: `local-org-${identity.project_hash.slice(0, 16)}`,
      projectId: identity.project_hash,
      environmentId: 'local',
    } as const;
    const coordinator = await AtlasLocalMissionCoordinator.open({ root, scope, clock: () => '2026-07-24T08:00:00.000Z' });
    const inbound = await coordinator.receive({
      message_id: 'msg-control-redaction',
      conversation_id: 'conv-control-redaction',
      customer_id: 'cust-control-redaction',
      channel_id: 'local-web-chat',
      sequence: 1,
      occurred_at: '2026-07-24T08:00:00.000Z',
      text: sentinel,
      consent: true,
      within_messaging_window: true,
    });
    const paused = await controlLocalMission(root, scope, 'pause', inbound.missionId, 'operator-control', 'pause for redaction');
    const resumed = await controlLocalMission(root, scope, 'resume', inbound.missionId, 'operator-control', 'resume for redaction');
    const cancelled = await controlLocalMission(root, scope, 'cancel', inbound.missionId, 'operator-control', 'cancel for redaction');

    for (const result of [paused, resumed, cancelled]) {
      const serialized = JSON.stringify(result);
      expect(serialized).not.toContain(sentinel);
      expect(serialized).not.toContain('"goal"');
      expect(serialized).not.toContain('"body"');
      expect(serialized).not.toContain('"data"');
      expect(serialized).not.toContain('"payload"');
    }
  });

  it('omits handoff reason text from inspection summaries', async () => {
    const root = await project();
    const runtime = await AtlasLocalRuntime.open({ root, clock: () => '2026-07-24T08:00:00.000Z' });
    await runtime.receiveMessage({
      message_id: 'msg-inspect-handoff',
      conversation_id: 'conv-inspect-handoff',
      customer_id: 'cust-inspect-handoff',
      channel_id: 'local-web-chat',
      sequence: 1,
      occurred_at: '2026-07-24T08:00:00.000Z',
      text: 'What is the booking policy?',
      consent: false,
      within_messaging_window: true,
    });
    await runtime.takeHumanControl('conv-inspect-handoff', { operator_id: 'operator-inspect', reason: 'RAW HANDOFF REASON' });

    const result = await inspectLocalProject(root);
    expect(JSON.stringify(result)).not.toContain('RAW HANDOFF REASON');
    expect(result.latest.conversation).not.toHaveProperty('handoff_reason');
  });

  it('replays the canonical scenario in a disposable sandbox with transcript evidence', async () => {
    const root = await project();
    const result = await replayLocalProject(root);

    expect(result.status).toBe('passed');
    expect(result.transcript.map((entry) => entry.type)).toEqual(['inbound', 'approve', 'deliver', 'replay_inbound']);
    expect(result.final.action_count).toBe(1);
    expect(result.final.delivery_state).toBe('delivered');
    await expect(readFile(path.join(root, '.atlas', 'runtime-state.json'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('returns a local deployment plan without claiming hosted readiness', async () => {
    const root = await project();
    const result = await planLocalDeployment(root);

    expect(result).toMatchObject({
      status: 'local_ready',
      package_ready: true,
      hosted_apply_available: false,
      staging_proven: false,
      production_proven: false,
    });
    expect(result.blockers).toEqual(expect.arrayContaining(['published package unavailable', 'hosted deployment target not configured']));
  });

  it('reports v1 upgrade idempotency without rewriting the file', async () => {
    const root = await project();
    const before = await readFile(path.join(root, 'atlas.config.ts'), 'utf8');

    const result = await upgradeLocalProject(root);

    expect(result).toMatchObject({ changed: false, from_version: '1', to_version: '1', backup_path: null });
    expect(await readFile(path.join(root, 'atlas.config.ts'), 'utf8')).toBe(before);
  });

  it('migrates a v0 project non-destructively and is idempotent after migration', async () => {
    const root = await project();
    await writeFile(path.join(root, 'atlas.config.ts'), `import { defineAtlasProject } from "@atlas-runner/atlas";\n\nexport default defineAtlasProject(\n${JSON.stringify({
      schemaVersion: '0',
      name: 'front-desk',
      instructions: './agent/instructions.md',
      tools: './agent/tools',
      policies: './agent/policies',
      knowledge: ['./knowledge'],
      channels: ['./channels/web-chat.ts'],
      evals: ['./evals'],
    }, null, 2)}\n);\n`);

    const migrated = await upgradeLocalProject(root);
    const repeated = await upgradeLocalProject(root);

    expect(migrated).toMatchObject({ changed: true, from_version: '0', to_version: '1' });
    expect(migrated.backup_path).toBe('atlas.config.ts.atlas-v0.bak');
    expect(await readFile(path.join(root, 'atlas.config.ts.atlas-v0.bak'), 'utf8')).toContain('"schemaVersion": "0"');
    expect((await loadAtlasProject(root)).config.schemaVersion).toBe('1');
    expect(repeated.changed).toBe(false);
  });
});
