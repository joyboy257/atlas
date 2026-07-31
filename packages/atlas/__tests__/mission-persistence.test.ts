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
  type Mission,
  type MissionLifecycleEvent,
} from '../src/index.js';
import { createMissionStore } from '../src/mission-persistence.js';
import { projectMission, projectMissionState, projectReceipt } from '../src/public-projections.js';
import * as publicPackage from '../src/index.js';

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
  it('does not expose direct MissionStore mutation through the package barrel', () => {
    expect('MissionStore' in publicPackage).toBe(false);
    expect('createMissionStore' in publicPackage).toBe(false);
  });

  it('projects Mission fields through an explicit nested allowlist', () => {
    const created = makeMission();
    const hostile = {
      ...created.mission,
      metadata: { ...created.mission.metadata, labels: { secret: 'RAW_LABEL' } },
      spec: {
        ...created.mission.spec,
        agent: { ...created.mission.spec.agent, runtime: { ...created.mission.spec.agent.runtime, configurationRef: 'RAW_CONFIG' } },
        subject: { ...created.mission.spec.subject, displayName: 'RAW_DISPLAY', canonicalRef: 'canonical://customer-1' },
        constraints: { ...created.mission.spec.constraints, stopConditions: ['RAW_STOP'] },
      },
    } as Mission;
    const projected = projectMission(hostile);
    const serialized = JSON.stringify(projected);
    expect(serialized).not.toContain('RAW_LABEL');
    expect(serialized).not.toContain('RAW_CONFIG');
    expect(serialized).not.toContain('RAW_DISPLAY');
    expect(serialized).not.toContain('RAW_STOP');
    expect(projected.spec.subject).toMatchObject({ canonicalRef: 'canonical://customer-1' });
    expect(projected.metadata).not.toHaveProperty('labels');
  });

  it('projects receipts without future or nested payload fields', () => {
    const projected = projectReceipt({
      receipt_id: 'receipt-public',
      kind: 'delivery',
      trace_id: 'trace-public',
      conversation_id: 'conversation-public',
      subject_id: 'subject-public',
      outcome: 'succeeded',
      created_at: '2026-07-29T12:00:00.000Z',
      project_hash: 'sha256:public',
      digest: 'sha256:digest',
      data: { secret: 'RAW_RECEIPT_DATA' },
      futureField: 'RAW_FUTURE_FIELD',
    } as never);
    expect(JSON.stringify(projected)).not.toContain('RAW_');
    expect(projected).toMatchObject({ receipt_id: 'receipt-public', kind: 'delivery' });
  });

  it('projects persisted Mission records without nested unknown fields', () => {
    const projected = projectMissionState({
      schemaVersion: MISSION_PERSISTENCE_SCHEMA,
      migrationVersion: MISSION_PERSISTENCE_MIGRATION_VERSION,
      missions: [],
      lifecycleEvents: [],
      steps: [],
      waits: [],
      decisions: [{
        metadata: { id: 'decision-1', missionId: 'mission-1', secret: 'RAW_DECISION_METADATA' },
        spec: {
          proposalId: 'proposal-1', actionClass: 'send-message', riskClass: 'high', autonomyLevel: 'L2',
          policyVersion: 'policy-1', disposition: 'allow', reasonCodes: ['policy.allow'],
          issuer: { type: 'system', identity: 'RAW_ISSUER_IDENTITY' }, decidedAt: '2026-07-29T12:00:00.000Z',
          secret: 'RAW_DECISION_SPEC',
        },
      }],
      actions: [{
        metadata: { id: 'action-1', missionId: 'mission-1', secret: 'RAW_ACTION_METADATA' },
        spec: {
          proposalId: 'proposal-1', decisionId: 'decision-1', stepId: 'step-1', actionType: 'send-message',
          effect: 'commit', idempotencyKey: 'action-1', status: 'PLANNED', policyVersion: 'policy-1',
          createdAt: '2026-07-29T12:00:01.000Z', arguments: { text: 'RAW_ACTION_ARGUMENT' },
        },
      }],
      receipts: [{
        metadata: { id: 'receipt-1', missionId: 'mission-1', secret: 'RAW_RECEIPT_METADATA' },
        spec: {
          receiptType: 'delivery', status: 'SUCCEEDED', provider: 'simulator', providerReference: 'provider-1',
          occurredAt: '2026-07-29T12:00:02.000Z', recordedAt: '2026-07-29T12:00:03.000Z',
          integrity: { digest: 'digest-1', issuer: 'atlas', secret: 'RAW_INTEGRITY' },
        },
      }],
      receiptLinks: [{
        linkId: 'link-1', missionId: 'mission-1', scope,
        receiptId: 'receipt-1', actionId: 'action-1', createdAt: '2026-07-29T12:00:04.000Z',
        secret: 'RAW_LINK',
      }],
    } as never);
    const serialized = JSON.stringify(projected);
    expect(serialized).not.toContain('RAW_');
    expect(projected.decisions[0]).toMatchObject({ issuerType: 'system' });
    expect(projected.receipts[0]?.integrity).toEqual({ digest: 'digest-1', issuer: 'atlas' });
    expect(projected.receiptLinks[0]).toMatchObject({ linkId: 'link-1', scope });
  });

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

  it('filters readState to the store server scope', async () => {
    const { root, store } = await createTestStore();
    const foreignResult = createMission(missionInput('mission-foreign'), otherScope, '2026-07-29T12:00:00.000Z');
    expect(foreignResult.valid).toBe(true);
    const otherStore = createMissionStore(root, otherScope);
    expect(await otherStore.createMission(otherScope, foreignResult.mission!, foreignResult.initialEvent!)).toMatchObject({ status: 'CREATED' });
    const state = await store.readState();
    expect(state.missions).toEqual([]);
    expect(state.lifecycleEvents).toEqual([]);
    expect(state.steps).toEqual([]);
    expect(state.waits).toEqual([]);
    expect(state.triggers).toEqual([]);
  });

  it('persists scoped trigger records and replays identical webhook delivery', async () => {
    const { root, store } = await createTestStore();
    const ownedMission = makeMission();
    expect(await store.createMission(scope, ownedMission.mission, ownedMission.event)).toMatchObject({ status: 'CREATED' });
    const first = await store.putTrigger(scope, {
      triggerId: 'webhook-001', scope, type: 'booking.updated', occurredAt: '2026-07-29T12:00:05.000Z',
      payloadDigest: digest('e'), payload: { booking_id: 'BK-100' }, status: 'RECEIVED', createdAt: '2026-07-29T12:00:05.000Z', updatedAt: '2026-07-29T12:00:05.000Z',
    });
    expect(first).toMatchObject({ status: 'CREATED' });
    expect(await store.putTrigger(scope, first.value!)).toMatchObject({ status: 'DUPLICATE_REPLAY' });
    expect(await store.putTrigger(scope, { ...first.value!, eventType: 'booking.updated', eventKey: 'BK-100:v1' })).toMatchObject({ status: 'REJECTED', diagnostics: [{ code: 'INVALID_CONTRACT', message: 'Trigger event routing requires missionId, eventType and eventKey' }] });
    for (const route of [
      { eventType: 'booking.updated', eventKey: 'BK-100:v1' },
      { eventType: 'booking.updated' },
      { eventKey: 'BK-100:v1' },
      { missionId: 'mission-001', eventType: 'booking.updated' },
      { missionId: 'mission-001', eventKey: 'BK-100:v1' },
      { missionId: 'mission-001', eventType: ' ', eventKey: 'BK-100:v1' },
      { missionId: ' ', eventType: 'booking.updated', eventKey: 'BK-100:v1' },
      { missionId: '\t', eventType: 'booking.updated', eventKey: 'BK-100:v1' },
      { missionId: ' ', eventType: 'booking.updated', eventKey: 'BK-100:v1' },
      { missionId: 'mission-001', eventType: 'booking.updated', eventKey: ' ' },
      { missionId: 'mission-001', eventType: '\t', eventKey: 'BK-100:v1' },
      { missionId: 'mission-001', eventType: 'booking.updated', eventKey: ' ' },
      { missionId: ' ' },
    ]) {
      expect(await store.putTrigger(scope, { ...first.value!, triggerId: `webhook-route-${JSON.stringify(route)}`, ...route })).toMatchObject({ status: 'REJECTED', diagnostics: [{ code: 'INVALID_CONTRACT' }] });
    }
    const otherStore = createMissionStore(root, otherScope);
    expect(await otherStore.putTrigger(otherScope, { ...first.value!, scope: otherScope })).toMatchObject({ status: 'CREATED' });
    await expect(store.putTrigger(otherScope, { ...first.value!, scope: otherScope })).rejects.toThrow('server-derived scope');
    expect(await store.updateTrigger(scope, 'webhook-001', { status: 'APPLIED', updatedAt: '2026-07-29T12:00:06.000Z', result: { status: 'accepted' } })).toMatchObject({ status: 'UPDATED', value: { status: 'APPLIED' } });
    const routed = await store.putTrigger(scope, {
      ...first.value!,
      triggerId: 'webhook-routed-update',
      missionId: 'mission-001',
      eventType: 'booking.updated',
      eventKey: 'BK-100:update',
    });
    expect(routed.status).toBe('CREATED');
    expect(await store.updateTrigger(scope, 'webhook-routed-update', { missionId: undefined, updatedAt: '2026-07-29T12:00:07.000Z' })).toMatchObject({ status: 'REJECTED', diagnostics: [{ code: 'IDEMPOTENCY_CONFLICT' }] });
    expect(await store.updateTrigger(scope, 'webhook-routed-update', { missionId: ' ', updatedAt: '2026-07-29T12:00:08.000Z' })).toMatchObject({ status: 'REJECTED', diagnostics: [{ code: 'IDEMPOTENCY_CONFLICT' }] });
    expect(await store.updateTrigger(scope, 'webhook-routed-update', { missionId: 'mission-002', updatedAt: '2026-07-29T12:00:09.000Z' })).toMatchObject({ status: 'REJECTED', diagnostics: [{ code: 'IDEMPOTENCY_CONFLICT' }] });
    const genericOwned = await store.putTrigger(scope, { ...first.value!, triggerId: 'webhook-generic-owned', missionId: 'mission-001' });
    expect(genericOwned.status).toBe('CREATED');
    expect(await store.updateTrigger(scope, 'webhook-generic-owned', { missionId: undefined, updatedAt: '2026-07-29T12:00:10.000Z' })).toMatchObject({ status: 'REJECTED', diagnostics: [{ code: 'IDEMPOTENCY_CONFLICT' }] });
    const restarted = createMissionStore(root, scope);
    expect((await restarted.readState()).triggers).toEqual(expect.arrayContaining([
      expect.objectContaining({ triggerId: 'webhook-001', status: 'APPLIED' }),
      expect.objectContaining({ triggerId: 'webhook-routed-update', missionId: 'mission-001', eventType: 'booking.updated', eventKey: 'BK-100:update', status: 'RECEIVED' }),
    ]));
  });

  it('stores steps, waits, governed decisions, actions, receipts, and receipt links', async () => {
    const { store } = await createTestStore();
    const created = makeMission();
    await store.createMission(scope, created.mission, created.event);
    const ready = createMissionLifecycleEvent(created.mission, { eventId: 'event-ready-records', resultingState: 'READY', actor: { type: 'system', identity: 'atlas' }, causationId: 'command-records', correlationId: 'corr-mission-001', source: { kind: 'command', ref: 'command-records' }, idempotencyKey: 'idem-ready-records' }, '2026-07-29T12:00:04.000Z').event!;
    await store.appendLifecycleEvent(scope, ready);
    const active = createMissionLifecycleEvent({ ...created.mission, spec: { ...created.mission.spec, state: 'READY', stateVersion: 2, timestamps: { ...created.mission.spec.timestamps, updatedAt: '2026-07-29T12:00:04.000Z' } } }, { eventId: 'event-active-records', resultingState: 'ACTIVE', actor: { type: 'system', identity: 'atlas' }, causationId: 'command-records', correlationId: 'corr-mission-001', source: { kind: 'command', ref: 'command-records' }, idempotencyKey: 'idem-active-records' }, '2026-07-29T12:00:05.000Z').event!;
    await store.appendLifecycleEvent(scope, active);
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

  it('rejects active waits and activeWait projections outside governed Mission states', async () => {
    const { store } = await createTestStore();
    const created = makeMission();
    await store.createMission(scope, created.mission, created.event);

    expect(await store.putWait(scope, {
      waitId: 'wait-created', missionId: 'mission-001', scope, kind: 'approval', status: 'ACTIVE', updatedAt: '2026-07-29T12:00:06.000Z',
    })).toMatchObject({ status: 'REJECTED', diagnostics: [{ code: 'INVALID_STATE' }] });
    expect(await store.putWait(scope, {
      waitId: 'wait-created', missionId: 'mission-001', scope, kind: 'approval', status: 'CANCELLED', updatedAt: '2026-07-29T12:00:06.000Z',
    })).toMatchObject({ status: 'CREATED' });
    expect(await store.updateMissionActiveWait(scope, 'mission-001', { kind: 'approval', waitId: 'wait-created' })).toMatchObject({ status: 'REJECTED' });

    const ready = createMissionLifecycleEvent(created.mission, { eventId: 'event-ready-cancel', resultingState: 'READY', actor: { type: 'system', identity: 'atlas' }, causationId: 'command-cancel', correlationId: 'corr-mission-001', source: { kind: 'command', ref: 'command-cancel' }, idempotencyKey: 'idem-ready-cancel' }, '2026-07-29T12:00:07.000Z').event!;
    await store.appendLifecycleEvent(scope, ready);
    const readyMission = (await store.readMission(scope, 'mission-001')).value!;
    const active = createMissionLifecycleEvent(readyMission, { eventId: 'event-active-cancel', resultingState: 'ACTIVE', actor: { type: 'system', identity: 'atlas' }, causationId: 'command-cancel', correlationId: 'corr-mission-001', source: { kind: 'command', ref: 'command-cancel' }, idempotencyKey: 'idem-active-cancel' }, '2026-07-29T12:00:08.000Z').event!;
    await store.appendLifecycleEvent(scope, active);
    const activeMission = (await store.readMission(scope, 'mission-001')).value!;
    const cancelled = createMissionLifecycleEvent(activeMission, { eventId: 'event-cancelled', resultingState: 'CANCELLED', actor: { type: 'operator', identity: 'operator-1' }, causationId: 'command-cancel', correlationId: 'corr-mission-001', source: { kind: 'human-control', ref: 'command-cancel' }, idempotencyKey: 'idem-cancelled' }, '2026-07-29T12:00:09.000Z').event!;
    await store.appendLifecycleEvent(scope, cancelled);
    expect(await store.putWait(scope, {
      waitId: 'wait-cancelled', missionId: 'mission-001', scope, kind: 'event', status: 'ACTIVE', updatedAt: '2026-07-29T12:00:10.000Z',
    })).toMatchObject({ status: 'REJECTED', diagnostics: [{ code: 'INVALID_STATE' }] });
    expect(await store.updateWaitStatus(scope, 'wait-created', 'ACTIVE', '2026-07-29T12:00:10.000Z')).toMatchObject({ status: 'REJECTED', diagnostics: [{ code: 'INVALID_STATE' }] });
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
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS atlas_mission_triggers');
    expect(migration).toContain('UNIQUE (tenant_id, organisation_id, project_id, environment_id, mission_id, idempotency_key)');
    expect(migration).toContain('UNIQUE (tenant_id, organisation_id, project_id, environment_id, trigger_id, payload_digest, mission_id, event_type, event_key)');
    expect(migration).toContain('CONSTRAINT atlas_mission_triggers_complete_event_route');
    expect(migration).toContain('CONSTRAINT atlas_mission_triggers_complete_event_route');
    expect(migration).toContain('translate(mission_id, chr(9)');
    expect(migration).toContain('translate(event_type, chr(9)');
    expect(migration).toContain('translate(event_key, chr(9)');
    expect(migration).toContain('CREATE OR REPLACE FUNCTION atlas_mission_triggers_immutable_update()');
    expect(migration).toContain('NEW.mission_id IS DISTINCT FROM OLD.mission_id');
    expect(migration).toContain('CREATE TRIGGER atlas_mission_triggers_immutable_update');
    expect(migration).toContain('FOREIGN KEY');
    expect(migration).not.toMatch(/FOREIGN KEY \(tenant_id, organisation_id, project_id, environment_id, mission_id\)\n    REFERENCES atlas_missions \(tenant_id, organisation_id, project_id, environment_id, mission_id\)\n\);\n\nCREATE OR REPLACE FUNCTION atlas_mission_triggers_immutable_update\(\)/);
    expect(migration).not.toMatch(/DROP\s+(TABLE|COLUMN)/i);
  });
});

void MISSION_API_VERSION;
void MISSION_SCHEMA_VERSION;
void PROPOSAL_KIND;
