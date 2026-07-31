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
const issuedAt = '2026-07-31T00:00:00.000Z';
const expiresAt = '2026-08-01T00:00:00.000Z';

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
    expect(rbac.authenticateMachineCredential(credential.id, 'local-secret', testScope).id).toBe('machine-test');
    expect(() => rbac.authenticateMachineCredential(credential.id, 'local-secret', productionScope)).toThrowError(/environment/);
    expect(() => rbac.authenticateMachineCredential(credential.id, 'wrong-secret', testScope)).toThrowError(/does not match/);
  });

  it('rotates and revokes credentials fail closed', () => {
    const rbac = new AtlasRbacRegistry(policy());
    const current = rbac.issueMachineCredential({ credentialId: 'cred-rotate-v1', principalId: 'machine-test', environmentId: 'test-a', secret: 'secret-v1', issuedAt, expiresAt });
    const replacement = rbac.rotateMachineCredential(current.id, { replacementId: 'cred-rotate-v2', secret: 'secret-v2', issuedAt: '2026-07-31T01:00:00.000Z', expiresAt });
    expect(replacement.version).toBe(2);
    expect(() => rbac.authenticateMachineCredential(current.id, 'secret-v1', testScope)).toThrowError(/revoked/);
    expect(rbac.authenticateMachineCredential(replacement.id, 'secret-v2', testScope).id).toBe('machine-test');
    rbac.revokeMachineCredential(replacement.id, '2026-07-31T02:00:00.000Z');
    expect(() => rbac.authorize({ principalId: 'machine-test', credentialId: replacement.id, operation: 'deploy', scope: testScope })).toThrowError(/REVOKED|revoked/);
  });
});
