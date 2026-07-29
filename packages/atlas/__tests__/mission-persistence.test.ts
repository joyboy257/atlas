import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  ACTION_API_VERSION,
  ACTION_KIND,
  DECISION_KIND,
  MISSION_API_VERSION,
  MISSION_PERSISTENCE_SCHEMA,
  MISSION_PERSISTENCE_MIGRATION_VERSION,
  MISSION_SCHEMA_VERSION,
  PROPOSAL_KIND,
  RECEIPT_KIND,
  createMission,
  createMissionLifecycleEvent,
  createMissionStore,
  type Mission,
  type MissionLifecycleEvent,
} from '../src/index.js';

const scope = { tenantId: 'tenant-a', organisationId: 'org-a', projectId: 'project-a', environmentId: 'staging' };
const otherScope = { ...scope, tenantId: 'tenant-b' };
const digest = (letter: string) => `sha256:${letter.repeat(64)}`;
const roots: string[] = [];

function missionInput(id = 'mission-001') {
  return {
    missionId: id,
    agent: { agentId: 'front-desk', agentVersionId: digest('a'), deploymentId: 'deployment-001', runtime: { mode: 'native', adapter: 'simulator' } },
    missionType: 'booking-change',
    goal: 'Change the customer booking after approval.',
    successCriteria: 'Provider confirms the updated booking.',
    correlation: { correlationId: `corr-${id}` },
    provenance: { source: 'api' as const, inputDigest: digest('b') },
  };
}

function makeMission(id = 'mission-001'): { mission: Mission; event: MissionLifecycleEvent } {
  const result = createMission(missionInput(id), scope, '2026-07-29T12:00:00.000Z');
  expect(result.valid).toBe(true);
  return { mission: result.mission!, event: result.initialEvent! };
}

function decision() {
  return {
    apiVersion: ACTION_API_VERSION,
    kind: DECISION_KIND,
    metadata: { id: 'decision-001', schemaVersion: '1', missionId: 'mission-001' },
    spec: {
      scope: { ...scope, missionId: 'mission-001' }, proposalId: 'proposal-001', actionClass: 'send-message', riskClass: 'medium', autonomyLevel: 'L2', policyVersion: 'policy-1', disposition: 'allow', reasonCodes: ['policy.allow'], explanation: 'Allowed by policy', issuer: { type: 'system', identity: 'atlas-policy' }, decidedAt: '2026-07-29T12:00:01.000Z', provenance: { correlationId: 'corr-mission-001', causationId: 'proposal-001', sourceRef: 'proposal-001', inputDigest: digest('c') },
    },
  } as const;
}

function action() {
  return {
    apiVersion: ACTION_API_VERSION,
    kind: ACTION_KIND,
    metadata: { id: 'action-001', schemaVersion: '1', missionId: 'mission-001' },
    spec: { scope: { ...scope, missionId: 'mission-001' }, proposalId: 'proposal-001', decisionId: 'decision-001', stepId: 'step-1', actionType: 'send-message', toolName: 'messaging.send', effect: 'commit', arguments: { text: 'confirmed' }, idempotencyKey: 'action-idem-1', status: 'PLANNED', policyVersion: 'policy-1', createdAt: '2026-07-29T12:00:02.000Z' },
  } as const;
}

function receipt() {
  return {
    apiVersion: ACTION_API_VERSION,
    kind: RECEIPT_KIND,
    metadata: { id: 'receipt-001', schemaVersion: '1', missionId: 'mission-001' },
    spec: { scope: { ...scope, missionId: 'mission-001' }, receiptType: 'delivery', missionId: 'mission-001', status: 'SUCCEEDED', provider: 'simulator', providerReference: 'provider-event-1', occurredAt: '2026-07-29T12:00:03.000Z', recordedAt: '2026-07-29T12:00:04.000Z', integrity: { digest: digest('d'), issuer: 'atlas' } },
  } as const;
}

afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

async function createTestStore(serverScope = scope) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'atlas-mission-store-'));
  roots.push(root);
  const value = createMissionStore(root, serverScope);
  await value.migrate();
  return { root, store: value };
}

describe('Mission persistence envelope and migrations', () => {
  it('creates the versioned local envelope and preserves it across restart', async () => {
    const { root, store } = await createTestStore();
    const created = makeMission();
    expect(await store.createMission(scope, created.mission, created.event)).toMatchObject({ status: 'CREATED' });
    const raw = JSON.parse(await readFile(path.join(root, '.atlas', 'mission-store.json'), 'utf8'));
    expect(raw).toMatchObject({ schemaVersion: MISSION_PERSISTENCE_SCHEMA, migrationVersion: MISSION_PERSISTENCE_MIGRATION_VERSION });

    const restarted = createMissionStore(root, scope);
    const read = await restarted.readMission(scope, 'mission-001');
    expect(read).toMatchObject({ status: 'UPDATED', value: created.mission });
    expect(Object.isFrozen(read.value)).toBe(true);
  });

  it('persists lifecycle events and rejects conflicting replay', async () => {
    const { store } = await createTestStore();
    const created = makeMission();
    await store.createMission(scope, created.mission, created.event);
    const ready = createMissionLifecycleEvent(created.mission, { eventId: 'event-ready', resultingState: 'READY', actor: { type: 'system', identity: 'atlas' }, causationId: 'command-1', correlationId: 'corr-mission-001', source: { kind: 'command', ref: 'command-1' }, idempotencyKey: 'idem-ready' }, '2026-07-29T12:00:05.000Z').event!;
    expect(await store.appendLifecycleEvent(scope, ready)).toMatchObject({ status: 'APPENDED', value: { spec: { state: 'READY', stateVersion: 2 } } });
    expect(await store.appendLifecycleEvent(scope, ready)).toMatchObject({ status: 'DUPLICATE_REPLAY' });
    expect(await store.appendLifecycleEvent(scope, { ...ready, spec: { ...ready.spec, causationId: 'command-2' } })).toMatchObject({ status: 'REJECTED', diagnostics: [{ code: 'IDEMPOTENCY_CONFLICT' }] });
    expect((await store.readLedger(scope, 'mission-001')).value?.events).toHaveLength(2);
  });

  it('enforces server scope before every read and write', async () => {
    const { store } = await createTestStore();
    const created = makeMission();
    await expect(store.readMission(otherScope, 'mission-001')).rejects.toThrow('server-derived scope');
    await expect(store.createMission(otherScope, created.mission, created.event)).rejects.toThrow('server-derived scope');
    expect(await store.putStep(scope, { stepId: 'step-1', missionId: 'mission-001', scope: otherScope, status: 'PENDING', updatedAt: '2026-07-29T12:00:05.000Z' })).toMatchObject({ status: 'REJECTED', diagnostics: [{ code: 'SCOPE_MISMATCH' }] });
  });

  it('stores steps, waits, governed decisions, actions, receipts, and receipt links', async () => {
    const { store } = await createTestStore();
    const created = makeMission();
    await store.createMission(scope, created.mission, created.event);
    expect(await store.putStep(scope, { stepId: 'step-1', missionId: 'mission-001', scope, status: 'PENDING', updatedAt: '2026-07-29T12:00:05.000Z' })).toMatchObject({ status: 'CREATED' });
    expect(await store.putWait(scope, { waitId: 'wait-1', missionId: 'mission-001', scope, kind: 'approval', status: 'ACTIVE', updatedAt: '2026-07-29T12:00:06.000Z' })).toMatchObject({ status: 'CREATED' });
    expect(await store.putDecision(scope, decision())).toMatchObject({ status: 'CREATED' });
    expect(await store.putAction(scope, action(), decision())).toMatchObject({ status: 'CREATED' });
    expect(await store.putReceipt(scope, receipt())).toMatchObject({ status: 'CREATED' });
    expect(await store.linkReceipt(scope, { linkId: 'link-1', missionId: 'mission-001', scope, receiptId: 'receipt-001', actionId: 'action-001', createdAt: '2026-07-29T12:00:05.000Z' })).toMatchObject({ status: 'CREATED' });
    const state = await store.readState();
    expect(state.steps).toHaveLength(1);
    expect(state.waits).toHaveLength(1);
    expect(state.decisions).toHaveLength(1);
    expect(state.actions).toHaveLength(1);
    expect(state.receipts).toHaveLength(1);
    expect(state.receiptLinks).toHaveLength(1);
  });

  it('rejects dependent records for unknown Missions', async () => {
    const { store } = await createTestStore();
    expect(await store.putStep(scope, { stepId: 'orphan-step', missionId: 'missing', scope, status: 'PENDING', updatedAt: '2026-07-29T12:00:05.000Z' })).toMatchObject({ status: 'REJECTED', diagnostics: [{ code: 'NOT_FOUND' }] });
  });

  it('serializes concurrent writes without losing either Mission', async () => {
    const { store } = await createTestStore();
    const first = makeMission('mission-001');
    const second = makeMission('mission-002');
    const results = await Promise.all([
      store.createMission(scope, first.mission, first.event),
      store.createMission(scope, second.mission, second.event),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual(['CREATED', 'CREATED']);
    expect((await store.readState()).missions.map((mission) => mission.metadata.missionId).sort()).toEqual(['mission-001', 'mission-002']);
  });

  it('defines additive migration constraints for scope, replay, and parent integrity', async () => {
    const migration = await readFile(path.resolve(import.meta.dirname, '..', 'migrations/001_mission_persistence_v1.sql'), 'utf8');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS');
    expect(migration).toContain('UNIQUE (tenant_id, organisation_id, project_id, environment_id, mission_id, idempotency_key)');
    expect(migration).toContain('FOREIGN KEY');
    expect(migration).not.toMatch(/DROP\s+(TABLE|COLUMN)/i);
  });
});

void MISSION_API_VERSION;
void MISSION_SCHEMA_VERSION;
void PROPOSAL_KIND;
