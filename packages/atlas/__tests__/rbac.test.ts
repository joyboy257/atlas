import { describe, expect, it } from 'vitest';
import {
  AtlasRbacError,
  AtlasRbacRegistry,
  authorizeRbac,
  createRbacPolicy,
  type AtlasRbacScope,
} from '../src/rbac.js';

const testScope: AtlasRbacScope = {
  tenantId: 'tenant-a',
  organisationId: 'org-a',
  projectId: 'project-a',
  environmentId: 'test-a',
};
const productionScope = { ...testScope, environmentId: 'production-a' };
const TEST_NOW = '2030-08-01T12:00:00.000Z';
const TEST_NOW_MS = Date.parse(TEST_NOW);
const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

function at(offsetMs = 0): string {
  return new Date(TEST_NOW_MS + offsetMs).toISOString();
}

function atTimezone(offsetMs: number, timezoneOffsetMinutes: number): string {
  const instant = new Date(TEST_NOW_MS + offsetMs);
  const local = new Date(instant.getTime() + timezoneOffsetMinutes * MINUTE_MS).toISOString().replace(/Z$/, '');
  const sign = timezoneOffsetMinutes >= 0 ? '+' : '-';
  const absoluteMinutes = Math.abs(timezoneOffsetMinutes);
  const hours = String(Math.floor(absoluteMinutes / 60)).padStart(2, '0');
  const minutes = String(absoluteMinutes % 60).padStart(2, '0');
  return `${local}${sign}${hours}:${minutes}`;
}

const issuedAt = at(-HOUR_MS);
const expiresAt = at(24 * HOUR_MS);

function policy() {
  return createRbacPolicy([
    { id: 'human-proposer', type: 'human', displayName: 'Proposer', bindings: [{ role: 'operator', scope: testScope }] },
    { id: 'human-approver', type: 'human', displayName: 'Approver', bindings: [{ role: 'approver', scope: testScope }] },
    { id: 'machine-test', type: 'machine', displayName: 'Test worker', bindings: [{ role: 'deployer', scope: testScope }] },
  ]);
}

describe('Atlas local RBAC and machine identity contract', () => {
  it('authorizes only a versioned role and exact scope match', () => {
    const result = authorizeRbac(policy(), {
      principalId: 'human-proposer',
      operation: 'propose',
      scope: testScope,
    });
    expect(result).toMatchObject({ allowed: true, policyVersion: 'atlas.rbac-policy/v1' });
    expect(() => authorizeRbac(policy(), {
      principalId: 'human-proposer',
      operation: 'propose',
      scope: productionScope,
    })).toThrowError(/not authorized/);
  });

  it('rejects proposer self-approval and permits a separate approver', () => {
    const rbac = new AtlasRbacRegistry(policy());
    expect(() => rbac.authorize({ principalId: 'human-proposer', operation: 'approve', scope: testScope, proposalActorId: 'human-proposer' })).toThrowError(new AtlasRbacError('FORBIDDEN', 'Proposal authors cannot approve their own proposal'));
    expect(rbac.authorize({ principalId: 'human-approver', operation: 'approve', scope: testScope, proposalActorId: 'human-proposer' }).allowed).toBe(true);
  });

  it('binds machine credentials to one environment and stores only a digest', () => {
    const rbac = new AtlasRbacRegistry(policy());
    const credential = rbac.issueMachineCredential({ credentialId: 'cred-test-v1', principalId: 'machine-test', environmentId: 'test-a', secret: 'local-secret', issuedAt, expiresAt });
    expect(credential.secretDigest).not.toContain('local-secret');
    expect(credential.environmentId).toBe('test-a');
    expect(rbac.authenticateMachineCredential(credential.id, 'local-secret', testScope, TEST_NOW).id).toBe('machine-test');
    expect(() => rbac.authenticateMachineCredential(credential.id, 'local-secret', productionScope, TEST_NOW)).toThrowError(/environment/);
    expect(() => rbac.authenticateMachineCredential(credential.id, 'wrong-secret', testScope, TEST_NOW)).toThrowError(/does not match/);
  });

  it('rotates and revokes credentials fail closed', () => {
    const rbac = new AtlasRbacRegistry(policy());
    const current = rbac.issueMachineCredential({ credentialId: 'cred-rotate-v1', principalId: 'machine-test', environmentId: 'test-a', secret: 'secret-v1', issuedAt, expiresAt });
    const replacement = rbac.rotateMachineCredential(current.id, { replacementId: 'cred-rotate-v2', secret: 'secret-v2', issuedAt: at(HOUR_MS), expiresAt });
    expect(replacement.version).toBe(2);
    expect(() => rbac.authenticateMachineCredential(current.id, 'secret-v1', testScope, TEST_NOW)).toThrowError(/revoked/);
    expect(rbac.authenticateMachineCredential(replacement.id, 'secret-v2', testScope, TEST_NOW).id).toBe('machine-test');
    rbac.revokeMachineCredential(replacement.id, at(2 * HOUR_MS));
    expect(() => rbac.authorize({ principalId: 'machine-test', credentialId: replacement.id, operation: 'deploy', scope: testScope })).toThrowError(/REVOKED|revoked/);
  });

  it('enforces expiry at the exact instant across timezone representations', () => {
    const rbac = new AtlasRbacRegistry(policy());
    const credential = rbac.issueMachineCredential({ credentialId: 'cred-expiry-boundary', principalId: 'machine-test', environmentId: 'test-a', secret: 'boundary-secret', issuedAt: at(-HOUR_MS), expiresAt: at(HOUR_MS) });

    expect(rbac.authenticateMachineCredential(credential.id, 'boundary-secret', testScope, atTimezone(0, 480)).id).toBe('machine-test');
    expect(() => rbac.authenticateMachineCredential(credential.id, 'boundary-secret', testScope, at(HOUR_MS))).toThrowError(/expired/);
  });
});
