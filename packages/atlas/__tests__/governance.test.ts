import { describe, expect, it } from 'vitest';
import {
  ATLAS_GOVERNANCE_SCHEMA_VERSION,
  assertServerDerivedGovernanceScope,
  canTransitionGovernanceLifecycle,
  createGovernanceHierarchy,
  resolveGovernanceScope,
  transitionGovernanceHierarchy,
  transitionGovernanceLifecycle,
  type GovernanceHierarchy,
} from '../src/governance.js';

const timestamp = '2026-07-31T00:00:00.000Z';

function hierarchy(overrides: Partial<Parameters<typeof createGovernanceHierarchy>[0]> = {}): GovernanceHierarchy {
  return createGovernanceHierarchy({
    schemaVersion: ATLAS_GOVERNANCE_SCHEMA_VERSION,
    organisation: { tenantId: 'tenant-a', organisationId: 'org-a', name: 'Acme' },
    projects: [{ tenantId: 'tenant-a', organisationId: 'org-a', projectId: 'project-a', name: 'Support' }],
    environments: [
      { tenantId: 'tenant-a', organisationId: 'org-a', projectId: 'project-a', environmentId: 'test-a', name: 'Test', type: 'test' },
      { tenantId: 'tenant-a', organisationId: 'org-a', projectId: 'project-a', environmentId: 'production-a', name: 'Production', type: 'production' },
    ],
    ...overrides,
  }, timestamp);
}

const testScope = { tenantId: 'tenant-a', organisationId: 'org-a', projectId: 'project-a', environmentId: 'test-a', environmentType: 'test' } as const;

function serverScope(scope = testScope) {
  return scope;
}

describe('governance hierarchy', () => {
  it('creates a canonical organisation/project/environment hierarchy', () => {
    const value = hierarchy();
    expect(value.organisation.organisationId).toBe('org-a');
    expect(value.projects[0].organisationId).toBe(value.organisation.organisationId);
    expect(value.environments[0].projectId).toBe(value.projects[0].projectId);
    expect(Object.isFrozen(value)).toBe(true);
  });

  it('rejects a project or environment bound to another organisation', () => {
    expect(() => hierarchy({ projects: [{ tenantId: 'tenant-b', organisationId: 'org-b', projectId: 'project-a', name: 'Foreign' }] })).toThrow(/canonical organisation|Project parent/);
  });

  it('resolves only the server-derived scope', () => {
    const result = resolveGovernanceScope({ hierarchy: hierarchy(), serverScope: serverScope() });
    expect(result).toEqual({ resolved: true, scope: testScope, diagnostics: [] });
  });

  it('rejects a client-selected cross-tenant or cross-environment scope', () => {
    const result = resolveGovernanceScope({
      hierarchy: hierarchy(),
      serverScope: serverScope(),
      requestedScope: { ...testScope, tenantId: 'tenant-b', environmentId: 'production-a', environmentType: 'production' },
    });
    expect(result.resolved).toBe(false);
    expect(result.diagnostics.some((item) => item.code === 'CLIENT_SCOPE_FORBIDDEN')).toBe(true);
  });

  it('enforces the production/test boundary even when the identifier is canonical', () => {
    const result = resolveGovernanceScope({
      hierarchy: hierarchy(),
      serverScope: { ...testScope, environmentId: 'production-a', environmentType: 'test' },
    });
    expect(result.resolved).toBe(false);
    expect(result.diagnostics.some((item) => item.code === 'BOUNDARY_MISMATCH')).toBe(true);
  });

  it('does not resolve suspended or deleting hierarchy records', () => {
    const value = hierarchy({ organisation: { tenantId: 'tenant-a', organisationId: 'org-a', name: 'Acme', state: 'SUSPENDED' } });
    const result = resolveGovernanceScope({ hierarchy: value, serverScope: serverScope() });
    expect(result.resolved).toBe(false);
    expect(result.diagnostics.some((item) => item.code === 'SCOPE_MISMATCH')).toBe(true);
  });
});

describe('governance lifecycle guards', () => {
  it('allows suspend/reactivate and requires deleting before deleted', () => {
    expect(canTransitionGovernanceLifecycle('ACTIVE', 'SUSPENDED')).toBe(true);
    expect(canTransitionGovernanceLifecycle('SUSPENDED', 'ACTIVE')).toBe(true);
    expect(canTransitionGovernanceLifecycle('ACTIVE', 'DELETED')).toBe(false);
    expect(canTransitionGovernanceLifecycle('DELETING', 'DELETED')).toBe(true);
  });

  it('requires a canonical hierarchy for direct lifecycle transitions', () => {
    const value = hierarchy();
    const result = transitionGovernanceLifecycle(value.projects[0], 'SUSPENDED', undefined as never);
    expect(result.changed).toBe(false);
    expect(result.diagnostics.some((item) => item.code === 'REQUIRED_FIELD')).toBe(true);
  });

  it('rejects a resource that is not the canonical hierarchy record', () => {
    const value = hierarchy();
    const forged = { ...value.projects[0], state: 'SUSPENDED' as const };
    const result = transitionGovernanceLifecycle(forged, 'ACTIVE', value);
    expect(result.changed).toBe(false);
    expect(result.diagnostics.some((item) => item.code === 'SCOPE_MISMATCH')).toBe(true);
  });

  it('prevents project reactivation while its organisation is suspended', () => {
    const value = hierarchy({ organisation: { tenantId: 'tenant-a', organisationId: 'org-a', name: 'Acme', state: 'SUSPENDED' }, projects: [{ tenantId: 'tenant-a', organisationId: 'org-a', projectId: 'project-a', name: 'Support', state: 'SUSPENDED' }] });
    const result = transitionGovernanceLifecycle(value.projects[0], 'ACTIVE', value);
    expect(result.changed).toBe(false);
    expect(result.diagnostics.some((item) => item.code === 'PARENT_NOT_ACTIVE')).toBe(true);
  });

  it('rejects lifecycle timestamps that move backwards', () => {
    const value = hierarchy();
    const result = transitionGovernanceLifecycle(value.projects[0], 'SUSPENDED', value, '2026-07-30T23:59:59.000Z');
    expect(result.changed).toBe(false);
    expect(result.diagnostics.some((item) => item.code === 'INVALID_VALUE' && item.path === '$.now')).toBe(true);
  });

  it('rejects hierarchy records whose updatedAt precedes createdAt', () => {
    expect(() => hierarchy({
      projects: [{ tenantId: 'tenant-a', organisationId: 'org-a', projectId: 'project-a', name: 'Support', createdAt: '2026-07-31T00:00:02.000Z', updatedAt: '2026-07-31T00:00:01.000Z' }],
    })).toThrow(/updatedAt cannot precede createdAt/);
  });

  it('prevents deleting a project while an environment remains', () => {
    const value = hierarchy();
    const deleting = transitionGovernanceHierarchy(value, { kind: 'project', id: 'project-a', nextState: 'DELETING' });
    expect(deleting.changed).toBe(true);
    const deleted = transitionGovernanceHierarchy(deleting.hierarchy!, { kind: 'project', id: 'project-a', nextState: 'DELETED' });
    expect(deleted.changed).toBe(false);
    expect(deleted.diagnostics.some((item) => item.code === 'CHILDREN_NOT_TERMINAL')).toBe(true);
  });

  it('allows deletion after descendants are terminal', () => {
    let value = hierarchy();
    value = transitionGovernanceHierarchy(value, { kind: 'environment', id: 'test-a', nextState: 'DELETING' }).hierarchy!;
    value = transitionGovernanceHierarchy(value, { kind: 'environment', id: 'test-a', nextState: 'DELETED' }).hierarchy!;
    value = transitionGovernanceHierarchy(value, { kind: 'environment', id: 'production-a', nextState: 'DELETING' }).hierarchy!;
    value = transitionGovernanceHierarchy(value, { kind: 'environment', id: 'production-a', nextState: 'DELETED' }).hierarchy!;
    value = transitionGovernanceHierarchy(value, { kind: 'project', id: 'project-a', nextState: 'DELETING' }).hierarchy!;
    const result = transitionGovernanceHierarchy(value, { kind: 'project', id: 'project-a', nextState: 'DELETED' });
    expect(result.changed).toBe(true);
    expect(result.hierarchy?.projects[0].state).toBe('DELETED');
  });

  it('provides a typed authorization failure for rejected server scope', () => {
    expect(() => assertServerDerivedGovernanceScope({ hierarchy: hierarchy(), serverScope: { ...testScope, projectId: 'project-other' } })).toThrow(/server-derived|Server scope/);
  });
});
