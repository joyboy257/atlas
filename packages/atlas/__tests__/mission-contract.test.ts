import { describe, expect, it } from 'vitest';
import {
  MISSION_API_VERSION,
  MISSION_EVENT_KIND,
  appendMissionLifecycleEvent,
  canTransitionMission,
  createMission,
  createMissionLifecycleEvent,
  createMissionLifecycleLedger,
  digestMissionInput,
  isTerminalMissionState,
  validateMission,
  validateMissionLifecycleEvent,
  type Mission,
} from '../src/mission-contract.js';

const scope = {
  tenantId: 'tenant-a',
  organisationId: 'org-a',
  projectId: 'project-a',
  environmentId: 'staging',
};

function input(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    missionId: 'mission-001',
    agent: {
      agentId: 'front-desk',
      agentVersionId: `sha256:${'a'.repeat(64)}`,
      deploymentId: 'deployment-001',
      runtime: { mode: 'native', adapter: 'simulator' },
    },
    missionType: 'booking-change',
    goal: 'Change the customer booking after approval.',
    successCriteria: 'Provider confirms the updated booking.',
    correlation: { correlationId: 'corr-001' },
    provenance: { source: 'api', inputDigest: `sha256:${'b'.repeat(64)}` },
    ...overrides,
  };
}

function mission(): Mission {
  const result = createMission(input(), scope, '2026-07-29T12:00:00.000Z');
  expect(result.valid).toBe(true);
  return result.mission!;
}

describe('Mission contract constants', () => {
  it('uses the versioned public contract identity', () => {
    expect(MISSION_API_VERSION).toBe('atlas.mirai.dev/v1');
    expect(MISSION_EVENT_KIND).toBe('MissionLifecycleEvent');
  });
});

describe('createMission', () => {
  it('creates a frozen server-scoped Mission and initial CREATED event', () => {
    const result = createMission(input(), scope, '2026-07-29T12:00:00.000Z');
    expect(result.valid).toBe(true);
    expect(result.mission?.spec.scope).toEqual(scope);
    expect(result.mission?.spec.state).toBe('CREATED');
    expect(result.mission?.spec.stateVersion).toBe(1);
    expect(result.initialEvent?.spec.eventType).toBe('CREATED');
    expect(result.initialEvent?.spec.priorState).toBeNull();
    expect(Object.isFrozen(result.mission)).toBe(true);
    expect(Object.isFrozen(result.mission!.spec.scope)).toBe(true);
  });

  it('rejects caller-selected server-owned scope and lifecycle fields', () => {
    const result = createMission({ ...input(), scope, state: 'ACTIVE' }, scope);
    expect(result.valid).toBe(false);
    expect(result.diagnostics.map((item) => item.code)).toContain('UNSAFE_AUTHORITY_OVERRIDE');
  });

  it('rejects invalid Agent version identity and invalid deadline', () => {
    const result = createMission({ ...input(), agent: { ...input().agent as object, agentVersionId: 'mutable-version' }, deadline: '2026-07-28T12:00:00.000Z' }, scope, '2026-07-29T12:00:00.000Z');
    expect(result.valid).toBe(false);
    expect(result.diagnostics.map((item) => item.path)).toEqual(expect.arrayContaining(['$.agent.agentVersionId', '$.deadline']));
  });
});

describe('validateMission', () => {
  it('rejects unknown fields and malformed terminal timestamps', () => {
    const value = mission() as Record<string, any>;
    const result = validateMission({ ...value, extra: true });
    expect(result.valid).toBe(false);
    expect(result.diagnostics.map((item) => item.code)).toContain('UNKNOWN_FIELD');

    const terminal = {
      ...value,
      spec: {
        ...value.spec,
        state: 'COMPLETED',
        timestamps: { ...value.spec.timestamps },
      },
    };
    expect(validateMission(terminal).diagnostics.map((item) => item.code)).toContain('TERMINAL_STATE_MUTATION');
  });
});

describe('Mission state machine', () => {
  it('allows the canonical activation path and rejects terminal mutation', () => {
    expect(canTransitionMission('CREATED', 'READY')).toBe(true);
    expect(canTransitionMission('READY', 'ACTIVE')).toBe(true);
    expect(canTransitionMission('ACTIVE', 'COMPLETED')).toBe(true);
    expect(canTransitionMission('WAITING_EVENT', 'HANDED_OFF')).toBe(true);
    expect(canTransitionMission('WAITING_SCHEDULE', 'HANDED_OFF')).toBe(true);
    expect(canTransitionMission('PAUSED', 'HANDED_OFF')).toBe(true);
    expect(canTransitionMission('COMPLETED', 'ACTIVE')).toBe(false);
    expect(isTerminalMissionState('COMPLETED')).toBe(true);
    expect(isTerminalMissionState('ACTIVE')).toBe(false);
  });
});

describe('Mission lifecycle ledger', () => {
  it('appends legal events and advances Mission state durably', () => {
    const current = mission();
    const initial = createMissionLifecycleLedger(current, createMission(input(), scope, '2026-07-29T12:00:00.000Z').initialEvent);
    const ready = createMissionLifecycleEvent(current, {
      eventId: 'event-ready',
      resultingState: 'READY',
      actor: { type: 'system', identity: 'atlas' },
      causationId: 'command-001',
      correlationId: 'corr-001',
      source: { kind: 'command', ref: 'command-001' },
      idempotencyKey: 'idem-ready',
    }, '2026-07-29T12:00:01.000Z');
    expect(ready.valid).toBe(true);
    const appended = appendMissionLifecycleEvent(initial, ready.event!);
    expect(appended.status).toBe('APPENDED');
    expect(appended.ledger.mission.spec.state).toBe('READY');
    expect(appended.ledger.mission.spec.stateVersion).toBe(2);
    expect(appended.ledger.events).toHaveLength(2);
  });

  it('returns a duplicate replay for identical event content', () => {
    const current = mission();
    const created = createMission(input(), scope, '2026-07-29T12:00:00.000Z');
    const ledger = createMissionLifecycleLedger(current, created.initialEvent);
    const event = createMissionLifecycleEvent(current, {
      eventId: 'event-ready',
      resultingState: 'READY',
      actor: { type: 'system', identity: 'atlas' },
      causationId: 'command-001',
      correlationId: 'corr-001',
      source: { kind: 'command', ref: 'command-001' },
      idempotencyKey: 'idem-ready',
    }, '2026-07-29T12:00:01.000Z').event!;
    const first = appendMissionLifecycleEvent(ledger, event);
    const replay = appendMissionLifecycleEvent(first.ledger, event);
    expect(replay.status).toBe('DUPLICATE_REPLAY');
    expect(replay.ledger.events).toHaveLength(2);
  });

  it('rejects conflicting event IDs and idempotency keys', () => {
    const current = mission();
    const created = createMission(input(), scope, '2026-07-29T12:00:00.000Z');
    const ledger = createMissionLifecycleLedger(current, created.initialEvent);
    const event = createMissionLifecycleEvent(current, {
      eventId: 'event-ready',
      resultingState: 'READY',
      actor: { type: 'system', identity: 'atlas' },
      causationId: 'command-001',
      correlationId: 'corr-001',
      source: { kind: 'command', ref: 'command-001' },
      idempotencyKey: 'idem-ready',
    }, '2026-07-29T12:00:01.000Z').event!;
    const first = appendMissionLifecycleEvent(ledger, event);
    const conflict = { ...event, spec: { ...event.spec, causationId: 'command-002' } };
    const result = appendMissionLifecycleEvent(first.ledger, conflict);
    expect(result.status).toBe('REJECTED');
    expect(result.diagnostics.map((item) => item.code)).toContain('IDEMPOTENCY_CONFLICT');
  });

  it('rejects cross-tenant event replay and illegal transitions without mutation', () => {
    const current = mission();
    const created = createMission(input(), scope, '2026-07-29T12:00:00.000Z');
    const ledger = createMissionLifecycleLedger(current, created.initialEvent);
    const eventResult = createMissionLifecycleEvent(current, {
      eventId: 'event-ready',
      resultingState: 'READY',
      actor: { type: 'system', identity: 'atlas' },
      causationId: 'command-001',
      correlationId: 'corr-001',
      source: { kind: 'command', ref: 'command-001' },
      idempotencyKey: 'idem-ready',
    }, '2026-07-29T12:00:01.000Z');
    const crossTenant = { ...eventResult.event!, spec: { ...eventResult.event!.spec, scope: { ...scope, tenantId: 'tenant-b' } } };
    expect(validateMissionLifecycleEvent(crossTenant, current).diagnostics.map((item) => item.code)).toContain('SCOPE_MISMATCH');
    const illegal = createMissionLifecycleEvent(current, {
      eventId: 'event-complete',
      resultingState: 'COMPLETED',
      actor: { type: 'system', identity: 'atlas' },
      causationId: 'command-002',
      correlationId: 'corr-001',
      source: { kind: 'command', ref: 'command-002' },
      idempotencyKey: 'idem-complete',
    });
    expect(illegal.valid).toBe(false);
    expect(appendMissionLifecycleEvent(ledger, eventResult.event!).ledger.mission.spec.state).toBe('READY');
  });
});

describe('digestMissionInput', () => {
  it('is deterministic for key-order changes', () => {
    expect(digestMissionInput({ b: 2, a: 1 })).toBe(digestMissionInput({ a: 1, b: 2 }));
  });
});
