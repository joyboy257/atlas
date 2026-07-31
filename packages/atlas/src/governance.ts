import { AtlasCliError } from './errors.js';

export const ATLAS_GOVERNANCE_SCHEMA_VERSION = 'atlas.governance/v1' as const;

export type GovernanceEnvironmentType = 'test' | 'production';
export type GovernanceLifecycleState = 'ACTIVE' | 'SUSPENDED' | 'DELETING' | 'DELETED';
export type GovernanceResourceKind = 'organisation' | 'project' | 'environment';

export type GovernanceDiagnosticCode =
  | 'INVALID_TYPE'
  | 'REQUIRED_FIELD'
  | 'INVALID_VALUE'
  | 'DUPLICATE_ID'
  | 'PARENT_MISMATCH'
  | 'SCOPE_MISMATCH'
  | 'BOUNDARY_MISMATCH'
  | 'CLIENT_SCOPE_FORBIDDEN'
  | 'LIFECYCLE_TRANSITION_FORBIDDEN'
  | 'PARENT_NOT_ACTIVE'
  | 'CHILDREN_NOT_TERMINAL';

export type GovernanceDiagnostic = Readonly<{
  code: GovernanceDiagnosticCode;
  path: string;
  message: string;
  nextAction: string;
}>;

export type GovernanceOrganisation = Readonly<{
  kind: 'organisation';
  tenantId: string;
  organisationId: string;
  name: string;
  state: GovernanceLifecycleState;
  createdAt: string;
  updatedAt: string;
}>;

export type GovernanceProject = Readonly<{
  kind: 'project';
  tenantId: string;
  organisationId: string;
  projectId: string;
  name: string;
  state: GovernanceLifecycleState;
  createdAt: string;
  updatedAt: string;
}>;

export type GovernanceEnvironment = Readonly<{
  kind: 'environment';
  tenantId: string;
  organisationId: string;
  projectId: string;
  environmentId: string;
  name: string;
  type: GovernanceEnvironmentType;
  state: GovernanceLifecycleState;
  createdAt: string;
  updatedAt: string;
}>;

export type GovernanceHierarchy = Readonly<{
  schemaVersion: typeof ATLAS_GOVERNANCE_SCHEMA_VERSION;
  organisation: GovernanceOrganisation;
  projects: readonly GovernanceProject[];
  environments: readonly GovernanceEnvironment[];
}>;

export type GovernanceHierarchyInput = Readonly<{
  schemaVersion?: typeof ATLAS_GOVERNANCE_SCHEMA_VERSION;
  organisation: Omit<GovernanceOrganisation, 'kind' | 'createdAt' | 'updatedAt' | 'state'> & Partial<Pick<GovernanceOrganisation, 'createdAt' | 'updatedAt' | 'state'>>;
  projects: readonly (Omit<GovernanceProject, 'kind' | 'createdAt' | 'updatedAt' | 'state'> & Partial<Pick<GovernanceProject, 'createdAt' | 'updatedAt' | 'state'>>)[];
  environments: readonly (Omit<GovernanceEnvironment, 'kind' | 'createdAt' | 'updatedAt' | 'state'> & Partial<Pick<GovernanceEnvironment, 'createdAt' | 'updatedAt' | 'state'>>)[];
}>;

export type GovernanceScope = Readonly<{
  tenantId: string;
  organisationId: string;
  projectId: string;
  environmentId: string;
  environmentType: GovernanceEnvironmentType;
}>;

export type GovernanceServerContext = Readonly<{
  scope: GovernanceScope;
}>;

export type GovernanceScopeResolutionInput = Readonly<{
  serverScope: unknown;
  hierarchy: GovernanceHierarchy;
  requestedScope?: unknown;
}>;

export type GovernanceScopeResolution = Readonly<{
  resolved: boolean;
  scope?: GovernanceScope;
  diagnostics: readonly GovernanceDiagnostic[];
}>;

export type GovernanceResource = GovernanceOrganisation | GovernanceProject | GovernanceEnvironment;

export type GovernanceTransitionResult<T extends GovernanceResource = GovernanceResource> = Readonly<{
  changed: boolean;
  resource?: T;
  diagnostics: readonly GovernanceDiagnostic[];
}>;

export type GovernanceHierarchyTransitionInput = Readonly<{
  kind: GovernanceResourceKind;
  id: string;
  nextState: GovernanceLifecycleState;
  now?: string;
}>;

export type GovernanceHierarchyTransitionResult = Readonly<{
  changed: boolean;
  hierarchy?: GovernanceHierarchy;
  diagnostics: readonly GovernanceDiagnostic[];
}>;

const LIFECYCLE_STATES = new Set<GovernanceLifecycleState>(['ACTIVE', 'SUSPENDED', 'DELETING', 'DELETED']);
const ENVIRONMENT_TYPES = new Set<GovernanceEnvironmentType>(['test', 'production']);
const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const LEGAL_TRANSITIONS: Readonly<Record<GovernanceLifecycleState, readonly GovernanceLifecycleState[]>> = {
  ACTIVE: ['ACTIVE', 'SUSPENDED', 'DELETING'],
  SUSPENDED: ['SUSPENDED', 'ACTIVE', 'DELETING'],
  DELETING: ['DELETING', 'DELETED'],
  DELETED: ['DELETED'],
};

export function canTransitionGovernanceLifecycle(from: GovernanceLifecycleState, to: GovernanceLifecycleState): boolean {
  return LEGAL_TRANSITIONS[from]?.includes(to) ?? false;
}

export const canTransitionGovernanceState = canTransitionGovernanceLifecycle;

export function transitionGovernanceLifecycle<T extends GovernanceResource>(resource: T, nextState: GovernanceLifecycleState, hierarchy: GovernanceHierarchy, now = new Date().toISOString()): GovernanceTransitionResult<T> {
  const diagnostics: GovernanceDiagnostic[] = [];
  const canonicalResource = hierarchy ? findResource(hierarchy, resource.kind, resourceIdentifier(resource)) : null;
  if (!hierarchy) {
    diagnostics.push(diagnostic('REQUIRED_FIELD', '$.hierarchy', 'Canonical governance hierarchy is required for lifecycle transitions', 'Resolve and provide the server-derived canonical hierarchy'));
  } else if (!canonicalResource || !sameResource(resource, canonicalResource)) {
    diagnostics.push(diagnostic('SCOPE_MISMATCH', '$.resource', 'Resource does not match the canonical hierarchy record', 'Transition the resource resolved from the canonical hierarchy'));
  }
  if (!LIFECYCLE_STATES.has(nextState)) {
    diagnostics.push(diagnostic('INVALID_VALUE', '$.nextState', 'Lifecycle state is not canonical', 'Use ACTIVE, SUSPENDED, DELETING, or DELETED'));
  } else if (!canTransitionGovernanceLifecycle(resource.state, nextState)) {
    diagnostics.push(diagnostic('LIFECYCLE_TRANSITION_FORBIDDEN', '$.nextState', `${resource.kind} cannot transition from ${resource.state} to ${nextState}`, 'Use an allowed lifecycle transition'));
  }
  const transitionAt = validateTimestamp(now, '$.now', diagnostics);
  if (transitionAt && Date.parse(transitionAt) < Date.parse(resource.createdAt)) {
    diagnostics.push(diagnostic('INVALID_VALUE', '$.now', 'Lifecycle transition timestamp cannot precede resource creation', 'Use a transition timestamp at or after createdAt'));
  }
  if (transitionAt && Date.parse(transitionAt) < Date.parse(resource.updatedAt)) {
    diagnostics.push(diagnostic('INVALID_VALUE', '$.now', 'Lifecycle transition timestamp cannot move updatedAt backwards', 'Use a transition timestamp at or after updatedAt'));
  }
  if (canonicalResource && nextState === 'ACTIVE' && !parentsAreActive(canonicalResource, hierarchy)) {
    diagnostics.push(diagnostic('PARENT_NOT_ACTIVE', '$.nextState', `${resource.kind} cannot become active while its parent is not active`, 'Activate the parent organisation and project first'));
  }
  if (canonicalResource && nextState === 'DELETED' && !childrenAreTerminal(canonicalResource, hierarchy)) {
    diagnostics.push(diagnostic('CHILDREN_NOT_TERMINAL', '$.nextState', `${resource.kind} cannot be deleted while descendants remain`, 'Move all descendant resources to DELETED first'));
  }
  if (diagnostics.length > 0) return { changed: false, diagnostics };
  if (resource.state === nextState) return { changed: false, resource, diagnostics: [] };
  return {
    changed: true,
    resource: { ...resource, state: nextState, updatedAt: now } as T,
    diagnostics: [],
  };
}

export const transitionGovernanceState = transitionGovernanceLifecycle;

export function validateGovernanceHierarchy(value: unknown): { valid: boolean; value?: GovernanceHierarchy; diagnostics: readonly GovernanceDiagnostic[] } {
  const diagnostics: GovernanceDiagnostic[] = [];
  if (!isRecord(value)) {
    return { valid: false, diagnostics: [diagnostic('INVALID_TYPE', '$', 'Governance hierarchy must be an object', 'Provide an organisation, projects, and environments')] };
  }
  if (value.schemaVersion !== ATLAS_GOVERNANCE_SCHEMA_VERSION) {
    diagnostics.push(diagnostic('INVALID_VALUE', '$.schemaVersion', `schemaVersion must be ${ATLAS_GOVERNANCE_SCHEMA_VERSION}`, 'Use the supported governance schema version'));
  }
  const organisation = validateOrganisation(value.organisation, '$.organisation', diagnostics);
  const projects = Array.isArray(value.projects) ? value.projects.map((item, index) => validateProject(item, `$.projects[${index}]`, diagnostics)).filter(isDefined) : null;
  const environments = Array.isArray(value.environments) ? value.environments.map((item, index) => validateEnvironment(item, `$.environments[${index}]`, diagnostics)).filter(isDefined) : null;
  if (!Array.isArray(value.projects)) diagnostics.push(diagnostic('REQUIRED_FIELD', '$.projects', 'projects must be an array', 'Provide the canonical projects for the organisation'));
  if (!Array.isArray(value.environments)) diagnostics.push(diagnostic('REQUIRED_FIELD', '$.environments', 'environments must be an array', 'Provide the canonical environments for the projects'));
  if (organisation && projects && environments) {
    const projectIds = new Set<string>();
    for (const project of projects) {
      if (projectIds.has(project.projectId)) diagnostics.push(diagnostic('DUPLICATE_ID', '$.projects', `Duplicate projectId ${project.projectId}`, 'Use one canonical project record per identifier'));
      projectIds.add(project.projectId);
      if (project.tenantId !== organisation.tenantId || project.organisationId !== organisation.organisationId) {
        diagnostics.push(diagnostic('PARENT_MISMATCH', `$.projects[${projects.indexOf(project)}]`, 'Project parent does not match the organisation', 'Bind project ownership to the canonical organisation'));
      }
    }
    const environmentIds = new Set<string>();
    for (const environment of environments) {
      if (environmentIds.has(environment.environmentId)) diagnostics.push(diagnostic('DUPLICATE_ID', '$.environments', `Duplicate environmentId ${environment.environmentId}`, 'Use one canonical environment record per identifier'));
      environmentIds.add(environment.environmentId);
      const project = projects.find((candidate) => candidate.projectId === environment.projectId);
      if (!project || environment.tenantId !== project.tenantId || environment.organisationId !== project.organisationId) {
        diagnostics.push(diagnostic('PARENT_MISMATCH', `$.environments[${environments.indexOf(environment)}]`, 'Environment parent does not match a canonical project', 'Bind environment ownership to its canonical project'));
      }
    }
  }
  if (diagnostics.length > 0 || !organisation || !projects || !environments) return { valid: false, diagnostics };
  return {
    valid: true,
    value: freezeHierarchy({ schemaVersion: ATLAS_GOVERNANCE_SCHEMA_VERSION, organisation, projects, environments }),
    diagnostics: [],
  };
}

export function createGovernanceHierarchy(input: GovernanceHierarchyInput, now = new Date().toISOString()): GovernanceHierarchy {
  const candidate: GovernanceHierarchy = {
    schemaVersion: ATLAS_GOVERNANCE_SCHEMA_VERSION,
    organisation: { kind: 'organisation', ...input.organisation, state: input.organisation.state ?? 'ACTIVE', createdAt: input.organisation.createdAt ?? now, updatedAt: input.organisation.updatedAt ?? now },
    projects: input.projects.map((project) => ({ kind: 'project', ...project, state: project.state ?? 'ACTIVE', createdAt: project.createdAt ?? now, updatedAt: project.updatedAt ?? now })),
    environments: input.environments.map((environment) => ({ kind: 'environment', ...environment, state: environment.state ?? 'ACTIVE', createdAt: environment.createdAt ?? now, updatedAt: environment.updatedAt ?? now })),
  };
  const result = validateGovernanceHierarchy(candidate);
  if (!result.valid || !result.value) throw new AtlasCliError('USAGE_ERROR', `Invalid governance hierarchy: ${result.diagnostics.map((item) => item.message).join('; ')}`, { nextAction: 'Provide one canonical organisation/project/environment hierarchy' });
  return result.value;
}

export function resolveGovernanceScope(input: GovernanceScopeResolutionInput): GovernanceScopeResolution {
  const diagnostics: GovernanceDiagnostic[] = [];
  const hierarchyResult = validateGovernanceHierarchy(input.hierarchy);
  if (!hierarchyResult.valid || !hierarchyResult.value) return { resolved: false, diagnostics: hierarchyResult.diagnostics };
  const serverScope = parseScope(input.serverScope, '$.serverScope', diagnostics);
  if (!serverScope) return { resolved: false, diagnostics };
  const requestedScope = input.requestedScope === undefined ? undefined : parseScope(input.requestedScope, '$.requestedScope', diagnostics);
  if (input.requestedScope !== undefined && !requestedScope) return { resolved: false, diagnostics };
  if (requestedScope && !sameScope(serverScope, requestedScope)) {
    diagnostics.push(diagnostic('CLIENT_SCOPE_FORBIDDEN', '$.requestedScope', 'Client-selected tenant or environment scope cannot override server-derived scope', 'Omit scope selection and use the server-derived request context'));
  }
  const { organisation, projects, environments } = hierarchyResult.value;
  const project = projects.find((candidate) => candidate.projectId === serverScope.projectId);
  const environment = environments.find((candidate) => candidate.environmentId === serverScope.environmentId);
  if (serverScope.tenantId !== organisation.tenantId || serverScope.organisationId !== organisation.organisationId) {
    diagnostics.push(diagnostic('SCOPE_MISMATCH', '$.serverScope', 'Server scope is outside the canonical organisation', 'Resolve scope from the authenticated server context'));
  }
  if (!project || project.tenantId !== serverScope.tenantId || project.organisationId !== serverScope.organisationId) {
    diagnostics.push(diagnostic('SCOPE_MISMATCH', '$.serverScope.projectId', 'Server scope does not resolve to a canonical project', 'Use a project owned by the canonical organisation'));
  }
  if (!environment || environment.tenantId !== serverScope.tenantId || environment.organisationId !== serverScope.organisationId || environment.projectId !== serverScope.projectId) {
    diagnostics.push(diagnostic('SCOPE_MISMATCH', '$.serverScope.environmentId', 'Server scope does not resolve to a canonical environment', 'Use an environment owned by the canonical project'));
  } else if (environment.type !== serverScope.environmentType) {
    diagnostics.push(diagnostic('BOUNDARY_MISMATCH', '$.serverScope.environmentType', 'Production and test environment boundaries cannot be crossed', 'Use the environment type resolved by the server'));
  }
  if (organisation.state !== 'ACTIVE' || project?.state !== 'ACTIVE' || environment?.state !== 'ACTIVE') {
    diagnostics.push(diagnostic('SCOPE_MISMATCH', '$.serverScope', 'Suspended or deleting resources cannot resolve an active request scope', 'Reactivate the full hierarchy or use a different active environment'));
  }
  if (diagnostics.length > 0) return { resolved: false, diagnostics };
  return { resolved: true, scope: Object.freeze({ ...serverScope }), diagnostics: [] };
}

export function resolveServerGovernanceScope(serverScope: unknown, hierarchy: GovernanceHierarchy, requestedScope?: unknown): GovernanceScopeResolution {
  return resolveGovernanceScope({ serverScope, hierarchy, requestedScope });
}

export function assertServerDerivedGovernanceScope(input: GovernanceScopeResolutionInput): GovernanceScope {
  const result = resolveGovernanceScope(input);
  if (!result.resolved || !result.scope) throw new AtlasCliError('AUTHORIZATION_FAILED', `Governance scope rejected: ${result.diagnostics.map((item) => item.message).join('; ')}`, { nextAction: 'Use the authenticated server-derived organisation, project, and environment scope' });
  return result.scope;
}

export function transitionGovernanceHierarchy(hierarchy: GovernanceHierarchy, input: GovernanceHierarchyTransitionInput): GovernanceHierarchyTransitionResult {
  const validation = validateGovernanceHierarchy(hierarchy);
  if (!validation.valid || !validation.value) return { changed: false, diagnostics: validation.diagnostics };
  const current = findResource(validation.value, input.kind, input.id);
  if (!current) return { changed: false, diagnostics: [diagnostic('INVALID_VALUE', '$.id', `Unknown ${input.kind} identifier ${input.id}`, 'Use an identifier from the canonical hierarchy')] };
  const transitioned = transitionGovernanceLifecycle(current, input.nextState, validation.value, input.now);
  if (!transitioned.changed || !transitioned.resource) return { changed: false, diagnostics: transitioned.diagnostics };
  const next = transitioned.resource;
  return {
    changed: true,
    hierarchy: freezeHierarchy({
      schemaVersion: ATLAS_GOVERNANCE_SCHEMA_VERSION,
      organisation: next.kind === 'organisation' ? next : validation.value.organisation,
      projects: next.kind === 'project' ? validation.value.projects.map((item) => item.projectId === next.projectId ? next : item) : validation.value.projects,
      environments: next.kind === 'environment' ? validation.value.environments.map((item) => item.environmentId === next.environmentId ? next : item) : validation.value.environments,
    }),
    diagnostics: [],
  };
}

function validateOrganisation(value: unknown, pathName: string, diagnostics: GovernanceDiagnostic[]): GovernanceOrganisation | null {
  if (!isRecord(value)) {
    diagnostics.push(diagnostic('REQUIRED_FIELD', pathName, 'organisation is required', 'Provide the canonical organisation record'));
    return null;
  }
  validateKind(value.kind, 'organisation', `${pathName}.kind`, diagnostics);
  const tenantId = validateIdentifier(value.tenantId, `${pathName}.tenantId`, diagnostics);
  const organisationId = validateIdentifier(value.organisationId, `${pathName}.organisationId`, diagnostics);
  const name = validateName(value.name, `${pathName}.name`, diagnostics);
  const state = validateState(value.state, `${pathName}.state`, diagnostics);
  const createdAt = validateTimestamp(value.createdAt, `${pathName}.createdAt`, diagnostics);
  const updatedAt = validateTimestamp(value.updatedAt, `${pathName}.updatedAt`, diagnostics);
  validateTimestampOrdering(createdAt, updatedAt, pathName, diagnostics);
  return tenantId && organisationId && name && state && createdAt && updatedAt ? { kind: 'organisation', tenantId, organisationId, name, state, createdAt, updatedAt } : null;
}

function validateProject(value: unknown, pathName: string, diagnostics: GovernanceDiagnostic[]): GovernanceProject | null {
  if (!isRecord(value)) {
    diagnostics.push(diagnostic('INVALID_TYPE', pathName, 'project must be an object', 'Provide a canonical project record'));
    return null;
  }
  validateKind(value.kind, 'project', `${pathName}.kind`, diagnostics);
  const tenantId = validateIdentifier(value.tenantId, `${pathName}.tenantId`, diagnostics);
  const organisationId = validateIdentifier(value.organisationId, `${pathName}.organisationId`, diagnostics);
  const projectId = validateIdentifier(value.projectId, `${pathName}.projectId`, diagnostics);
  const name = validateName(value.name, `${pathName}.name`, diagnostics);
  const state = validateState(value.state, `${pathName}.state`, diagnostics);
  const createdAt = validateTimestamp(value.createdAt, `${pathName}.createdAt`, diagnostics);
  const updatedAt = validateTimestamp(value.updatedAt, `${pathName}.updatedAt`, diagnostics);
  validateTimestampOrdering(createdAt, updatedAt, pathName, diagnostics);
  return tenantId && organisationId && projectId && name && state && createdAt && updatedAt ? { kind: 'project', tenantId, organisationId, projectId, name, state, createdAt, updatedAt } : null;
}

function validateEnvironment(value: unknown, pathName: string, diagnostics: GovernanceDiagnostic[]): GovernanceEnvironment | null {
  if (!isRecord(value)) {
    diagnostics.push(diagnostic('INVALID_TYPE', pathName, 'environment must be an object', 'Provide a canonical environment record'));
    return null;
  }
  validateKind(value.kind, 'environment', `${pathName}.kind`, diagnostics);
  const tenantId = validateIdentifier(value.tenantId, `${pathName}.tenantId`, diagnostics);
  const organisationId = validateIdentifier(value.organisationId, `${pathName}.organisationId`, diagnostics);
  const projectId = validateIdentifier(value.projectId, `${pathName}.projectId`, diagnostics);
  const environmentId = validateIdentifier(value.environmentId, `${pathName}.environmentId`, diagnostics);
  const name = validateName(value.name, `${pathName}.name`, diagnostics);
  const type = validateEnvironmentType(value.type, `${pathName}.type`, diagnostics);
  const state = validateState(value.state, `${pathName}.state`, diagnostics);
  const createdAt = validateTimestamp(value.createdAt, `${pathName}.createdAt`, diagnostics);
  const updatedAt = validateTimestamp(value.updatedAt, `${pathName}.updatedAt`, diagnostics);
  validateTimestampOrdering(createdAt, updatedAt, pathName, diagnostics);
  return tenantId && organisationId && projectId && environmentId && name && type && state && createdAt && updatedAt ? { kind: 'environment', tenantId, organisationId, projectId, environmentId, name, type, state, createdAt, updatedAt } : null;
}

function parentsAreActive(resource: GovernanceResource, hierarchy: GovernanceHierarchy): boolean {
  if (resource.kind === 'organisation') return true;
  if (hierarchy.organisation.state !== 'ACTIVE') return false;
  if (resource.kind === 'environment') return hierarchy.projects.find((item) => item.projectId === resource.projectId)?.state === 'ACTIVE';
  return true;
}

function childrenAreTerminal(resource: GovernanceResource, hierarchy: GovernanceHierarchy): boolean {
  if (resource.kind === 'environment') return true;
  if (resource.kind === 'project') return hierarchy.environments.filter((item) => item.projectId === resource.projectId).every((item) => item.state === 'DELETED');
  return hierarchy.projects.every((project) => project.state === 'DELETED') && hierarchy.environments.every((environment) => environment.state === 'DELETED');
}

function resourceIdentifier(resource: GovernanceResource): string {
  if (resource.kind === 'organisation') return resource.organisationId;
  if (resource.kind === 'project') return resource.projectId;
  return resource.environmentId;
}

function sameResource(left: GovernanceResource, right: GovernanceResource): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function findResource(hierarchy: GovernanceHierarchy, kind: GovernanceResourceKind, id: string): GovernanceResource | null {
  if (kind === 'organisation') return hierarchy.organisation.organisationId === id ? hierarchy.organisation : null;
  if (kind === 'project') return hierarchy.projects.find((item) => item.projectId === id) ?? null;
  return hierarchy.environments.find((item) => item.environmentId === id) ?? null;
}

function parseScope(value: unknown, pathName: string, diagnostics: GovernanceDiagnostic[]): GovernanceScope | null {
  if (!isRecord(value)) {
    diagnostics.push(diagnostic('INVALID_TYPE', pathName, 'Scope must be an object', 'Use server-derived tenant, organisation, project, and environment identifiers'));
    return null;
  }
  const tenantId = validateIdentifier(value.tenantId, `${pathName}.tenantId`, diagnostics);
  const organisationId = validateIdentifier(value.organisationId, `${pathName}.organisationId`, diagnostics);
  const projectId = validateIdentifier(value.projectId, `${pathName}.projectId`, diagnostics);
  const environmentId = validateIdentifier(value.environmentId, `${pathName}.environmentId`, diagnostics);
  const environmentType = validateEnvironmentType(value.environmentType, `${pathName}.environmentType`, diagnostics);
  return tenantId && organisationId && projectId && environmentId && environmentType ? { tenantId, organisationId, projectId, environmentId, environmentType } : null;
}

function sameScope(left: GovernanceScope, right: GovernanceScope): boolean {
  return left.tenantId === right.tenantId && left.organisationId === right.organisationId && left.projectId === right.projectId && left.environmentId === right.environmentId && left.environmentType === right.environmentType;
}

function validateKind(value: unknown, expected: GovernanceResourceKind, pathName: string, diagnostics: GovernanceDiagnostic[]): void {
  if (value !== expected) diagnostics.push(diagnostic('INVALID_VALUE', pathName, `kind must be ${expected}`, `Use the canonical ${expected} record kind`));
}

function validateIdentifier(value: unknown, pathName: string, diagnostics: GovernanceDiagnostic[]): string | null {
  if (typeof value !== 'string' || !IDENTIFIER_PATTERN.test(value)) {
    diagnostics.push(diagnostic(typeof value === 'string' ? 'INVALID_VALUE' : 'INVALID_TYPE', pathName, 'Identifier must be a non-empty bounded identifier', 'Use letters, numbers, dot, underscore, colon, or hyphen'));
    return null;
  }
  return value;
}

function validateName(value: unknown, pathName: string, diagnostics: GovernanceDiagnostic[]): string | null {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > 128) {
    diagnostics.push(diagnostic(typeof value === 'string' ? 'INVALID_VALUE' : 'INVALID_TYPE', pathName, 'Name must be a non-empty string of at most 128 characters', 'Provide a stable display name'));
    return null;
  }
  return value;
}

function validateTimestamp(value: unknown, pathName: string, diagnostics: GovernanceDiagnostic[]): string | null {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    diagnostics.push(diagnostic(typeof value === 'string' ? 'INVALID_VALUE' : 'INVALID_TYPE', pathName, 'Timestamp must be an ISO date string', 'Record a valid lifecycle timestamp'));
    return null;
  }
  return value;
}

function validateTimestampOrdering(createdAt: string | null, updatedAt: string | null, pathName: string, diagnostics: GovernanceDiagnostic[]): void {
  if (createdAt && updatedAt && Date.parse(updatedAt) < Date.parse(createdAt)) {
    diagnostics.push(diagnostic('INVALID_VALUE', `${pathName}.updatedAt`, 'updatedAt cannot precede createdAt', 'Use a monotonic resource timestamp'));
  }
}

function validateState(value: unknown, pathName: string, diagnostics: GovernanceDiagnostic[]): GovernanceLifecycleState | null {
  if (typeof value !== 'string' || !LIFECYCLE_STATES.has(value as GovernanceLifecycleState)) {
    diagnostics.push(diagnostic(typeof value === 'string' ? 'INVALID_VALUE' : 'INVALID_TYPE', pathName, 'Lifecycle state is not canonical', 'Use ACTIVE, SUSPENDED, DELETING, or DELETED'));
    return null;
  }
  return value as GovernanceLifecycleState;
}

function validateEnvironmentType(value: unknown, pathName: string, diagnostics: GovernanceDiagnostic[]): GovernanceEnvironmentType | null {
  if (typeof value !== 'string' || !ENVIRONMENT_TYPES.has(value as GovernanceEnvironmentType)) {
    diagnostics.push(diagnostic(typeof value === 'string' ? 'INVALID_VALUE' : 'INVALID_TYPE', pathName, 'Environment type must be test or production', 'Declare the environment boundary explicitly'));
    return null;
  }
  return value as GovernanceEnvironmentType;
}

function diagnostic(code: GovernanceDiagnosticCode, pathName: string, message: string, nextAction: string): GovernanceDiagnostic {
  return { code, path: pathName, message, nextAction };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDefined<T>(value: T | null): value is T {
  return value !== null;
}

function freezeHierarchy(value: GovernanceHierarchy): GovernanceHierarchy {
  Object.freeze(value.organisation);
  value.projects.forEach(Object.freeze);
  value.environments.forEach(Object.freeze);
  Object.freeze(value.projects);
  Object.freeze(value.environments);
  return Object.freeze(value);
}
