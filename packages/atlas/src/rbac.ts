import { sha256 } from './fs-safety.js';

export const ATLAS_RBAC_SCHEMA_VERSION = 'atlas.rbac/v1' as const;
export const ATLAS_RBAC_POLICY_VERSION = 'atlas.rbac-policy/v1' as const;

export type AtlasRbacRole = 'viewer' | 'operator' | 'approver' | 'developer' | 'deployer' | 'billing' | 'admin';
export type AtlasRbacPrincipalType = 'human' | 'machine';
export type AtlasRbacCredentialStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED';
export type AtlasRbacOperation = 'read' | 'propose' | 'approve' | 'deploy' | 'billing' | 'audit';

export type AtlasRbacScope = Readonly<{
  tenantId: string;
  organisationId: string;
  projectId: string;
  environmentId: string;
}>;

export type AtlasRbacRoleBinding = Readonly<{
  role: AtlasRbacRole;
  scope: AtlasRbacScope;
}>;

export type AtlasRbacPrincipal = Readonly<{
  id: string;
  type: AtlasRbacPrincipalType;
  displayName: string;
  bindings: readonly AtlasRbacRoleBinding[];
}>;

export type AtlasRbacPolicy = Readonly<{
  schemaVersion: typeof ATLAS_RBAC_SCHEMA_VERSION;
  policyVersion: typeof ATLAS_RBAC_POLICY_VERSION;
  roleOperations: Readonly<Record<AtlasRbacRole, readonly AtlasRbacOperation[]>>;
  principals: readonly AtlasRbacPrincipal[];
}>;

export type AtlasRbacCredential = Readonly<{
  id: string;
  principalId: string;
  environmentId: string;
  version: number;
  secretDigest: string;
  status: AtlasRbacCredentialStatus;
  issuedAt: string;
  expiresAt: string;
  revokedAt?: string;
}>;

export type AtlasRbacAuthorizationRequest = Readonly<{
  principalId: string;
  credentialId?: string;
  operation: AtlasRbacOperation;
  scope: AtlasRbacScope;
  proposalActorId?: string;
}>;

export type AtlasRbacAuthorizationResult = Readonly<{
  allowed: boolean;
  reason: string;
  policyVersion: typeof ATLAS_RBAC_POLICY_VERSION;
  principalId: string;
  operation: AtlasRbacOperation;
  scope: AtlasRbacScope;
}>;

export class AtlasRbacError extends Error {
  readonly code: 'INVALID_POLICY' | 'INVALID_SCOPE' | 'NOT_FOUND' | 'FORBIDDEN' | 'CREDENTIAL_REVOKED' | 'CREDENTIAL_MISMATCH' | 'DUPLICATE_ID' | 'INVALID_TRANSITION';

  constructor(code: AtlasRbacError['code'], message: string) {
    super(message);
    this.name = 'AtlasRbacError';
    this.code = code;
  }
}

const DEFAULT_ROLE_OPERATIONS: Readonly<Record<AtlasRbacRole, readonly AtlasRbacOperation[]>> = Object.freeze({
  viewer: ['read'],
  operator: ['read', 'propose'],
  approver: ['read', 'approve'],
  developer: ['read', 'propose'],
  deployer: ['read', 'deploy'],
  billing: ['read', 'billing'],
  admin: ['read', 'propose', 'approve', 'deploy', 'billing', 'audit'],
});

export function createRbacPolicy(principals: readonly AtlasRbacPrincipal[]): AtlasRbacPolicy {
  const seen = new Set<string>();
  for (const principal of principals) {
    if (seen.has(principal.id)) throw new AtlasRbacError('DUPLICATE_ID', `RBAC principal ${principal.id} already exists`);
    seen.add(principal.id);
    if (!principal.id.trim() || !principal.displayName.trim()) throw new AtlasRbacError('INVALID_POLICY', 'RBAC principal identity and display name are required');
    if (principal.bindings.length === 0) throw new AtlasRbacError('INVALID_POLICY', `RBAC principal ${principal.id} requires at least one role binding`);
    for (const binding of principal.bindings) {
      if (!(binding.role in DEFAULT_ROLE_OPERATIONS)) throw new AtlasRbacError('INVALID_POLICY', `RBAC role ${binding.role} is not canonical`);
      validateScope(binding.scope);
    }
  }
  return Object.freeze({
    schemaVersion: ATLAS_RBAC_SCHEMA_VERSION,
    policyVersion: ATLAS_RBAC_POLICY_VERSION,
    roleOperations: DEFAULT_ROLE_OPERATIONS,
    principals: Object.freeze(principals.map((principal) => Object.freeze({ ...principal, bindings: Object.freeze(principal.bindings.map((binding) => Object.freeze({ ...binding, scope: Object.freeze({ ...binding.scope }) }))) }))),
  });
}

export function authorizeRbac(policy: AtlasRbacPolicy, request: AtlasRbacAuthorizationRequest, now = new Date().toISOString()): AtlasRbacAuthorizationResult {
  validateScope(request.scope);
  const principal = policy.principals.find((candidate) => candidate.id === request.principalId);
  if (!principal) throw new AtlasRbacError('NOT_FOUND', `RBAC principal ${request.principalId} was not found`);
  if (request.operation === 'approve' && request.proposalActorId === principal.id) {
    throw new AtlasRbacError('FORBIDDEN', 'Proposal authors cannot approve their own proposal');
  }
  const allowed = principal.bindings.some((binding) => sameScope(binding.scope, request.scope) && policy.roleOperations[binding.role].includes(request.operation));
  if (!allowed) throw new AtlasRbacError('FORBIDDEN', `Principal ${principal.id} is not authorized for ${request.operation} in environment ${request.scope.environmentId}`);
  return Object.freeze({ allowed: true, reason: 'role_and_scope_match', policyVersion: policy.policyVersion, principalId: principal.id, operation: request.operation, scope: Object.freeze({ ...request.scope }) });
}

export class AtlasRbacRegistry {
  private readonly credentials = new Map<string, AtlasRbacCredential>();
  private readonly policy: AtlasRbacPolicy;

  constructor(policy: AtlasRbacPolicy) {
    if (policy.schemaVersion !== ATLAS_RBAC_SCHEMA_VERSION || policy.policyVersion !== ATLAS_RBAC_POLICY_VERSION) throw new AtlasRbacError('INVALID_POLICY', 'Unsupported RBAC policy version');
    this.policy = policy;
  }

  issueMachineCredential(input: Readonly<{ credentialId: string; principalId: string; environmentId: string; secret: string; issuedAt: string; expiresAt: string }>): AtlasRbacCredential {
    if (this.credentials.has(input.credentialId)) throw new AtlasRbacError('DUPLICATE_ID', `RBAC credential ${input.credentialId} already exists`);
    const principal = this.findPrincipal(input.principalId);
    if (principal.type !== 'machine') throw new AtlasRbacError('FORBIDDEN', 'Only machine principals may receive machine credentials');
    if (!input.secret.trim()) throw new AtlasRbacError('INVALID_POLICY', 'Machine credential secret is required');
    const binding = principal.bindings.find((candidate) => candidate.scope.environmentId === input.environmentId);
    if (!binding) throw new AtlasRbacError('FORBIDDEN', 'Machine credential environment is outside the principal scope');
    validateTimestamp(input.issuedAt, 'issuedAt');
    validateTimestamp(input.expiresAt, 'expiresAt');
    if (Date.parse(input.expiresAt) <= Date.parse(input.issuedAt)) throw new AtlasRbacError('INVALID_POLICY', 'Credential expiry must follow issuance');
    const credential: AtlasRbacCredential = Object.freeze({ id: input.credentialId, principalId: input.principalId, environmentId: input.environmentId, version: 1, secretDigest: sha256(input.secret), status: 'ACTIVE', issuedAt: input.issuedAt, expiresAt: input.expiresAt });
    this.credentials.set(credential.id, credential);
    return credential;
  }

  rotateMachineCredential(credentialId: string, input: Readonly<{ replacementId: string; secret: string; issuedAt: string; expiresAt: string }>): AtlasRbacCredential {
    const current = this.getCredential(credentialId);
    if (current.status !== 'ACTIVE') throw new AtlasRbacError('INVALID_TRANSITION', `Credential ${credentialId} is ${current.status}`);
    this.revokeMachineCredential(credentialId, input.issuedAt);
    const replacement = this.issueMachineCredential({ credentialId: input.replacementId, principalId: current.principalId, environmentId: current.environmentId, secret: input.secret, issuedAt: input.issuedAt, expiresAt: input.expiresAt });
    const rotated = Object.freeze({ ...replacement, version: current.version + 1 });
    this.credentials.set(rotated.id, rotated);
    return rotated;
  }

  revokeMachineCredential(credentialId: string, revokedAt: string): AtlasRbacCredential {
    const current = this.getCredential(credentialId);
    validateTimestamp(revokedAt, 'revokedAt');
    if (current.status === 'REVOKED') return current;
    const revoked = Object.freeze({ ...current, status: 'REVOKED' as const, revokedAt });
    this.credentials.set(credentialId, revoked);
    return revoked;
  }

  authenticateMachineCredential(credentialId: string, secret: string, scope: AtlasRbacScope, now = new Date().toISOString()): AtlasRbacPrincipal {
    const credential = this.getCredential(credentialId);
    if (credential.secretDigest !== sha256(secret)) throw new AtlasRbacError('CREDENTIAL_MISMATCH', 'Machine credential secret does not match');
    if (credential.status === 'REVOKED') throw new AtlasRbacError('CREDENTIAL_REVOKED', 'Machine credential has been revoked');
    if (Date.parse(now) >= Date.parse(credential.expiresAt)) throw new AtlasRbacError('CREDENTIAL_REVOKED', 'Machine credential has expired');
    if (credential.environmentId !== scope.environmentId) throw new AtlasRbacError('FORBIDDEN', 'Machine credential cannot cross environment boundaries');
    return this.findPrincipal(credential.principalId);
  }

  authorize(request: AtlasRbacAuthorizationRequest): AtlasRbacAuthorizationResult {
    if (request.credentialId) {
      const credential = this.getCredential(request.credentialId);
      if (credential.principalId !== request.principalId) throw new AtlasRbacError('CREDENTIAL_MISMATCH', 'Credential is not bound to the requested principal');
      if (credential.environmentId !== request.scope.environmentId) throw new AtlasRbacError('FORBIDDEN', 'Credential environment does not match authorization scope');
      if (credential.status !== 'ACTIVE') throw new AtlasRbacError('CREDENTIAL_REVOKED', `Credential ${credential.id} is ${credential.status}`);
    }
    return authorizeRbac(this.policy, request);
  }

  private findPrincipal(principalId: string): AtlasRbacPrincipal {
    const principal = this.policy.principals.find((candidate) => candidate.id === principalId);
    if (!principal) throw new AtlasRbacError('NOT_FOUND', `RBAC principal ${principalId} was not found`);
    return principal;
  }

  private getCredential(credentialId: string): AtlasRbacCredential {
    const credential = this.credentials.get(credentialId);
    if (!credential) throw new AtlasRbacError('NOT_FOUND', `RBAC credential ${credentialId} was not found`);
    return credential;
  }
}

function validateScope(scope: AtlasRbacScope): void {
  for (const [key, value] of Object.entries(scope)) if (typeof value !== 'string' || !value.trim()) throw new AtlasRbacError('INVALID_SCOPE', `${key} must be a non-empty string`);
}

function sameScope(left: AtlasRbacScope, right: AtlasRbacScope): boolean {
  return left.tenantId === right.tenantId && left.organisationId === right.organisationId && left.projectId === right.projectId && left.environmentId === right.environmentId;
}

function validateTimestamp(value: string, name: string): void {
  if (!value || !Number.isFinite(Date.parse(value))) throw new AtlasRbacError('INVALID_POLICY', `${name} must be an ISO timestamp`);
}
