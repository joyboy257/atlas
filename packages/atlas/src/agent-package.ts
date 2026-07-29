import { sha256 } from './fs-safety.js';

// ── AgentPackage v2 ──────────────────────────────────────────────
// Public contract: atlas.mirai.dev/v2, kind: AgentPackage
// An AgentPackage is a versioned, immutable Agent definition suitable
// for deployment.  It extends the project-scoped Agent config (v1)
// with mission types, memory policy, triggers, channel requirements,
// budgets, outcome definitions, runtime interoperability, and
// compatibility constraints.
//
// Schema evolution policy (additive-only by default):
//   - New optional fields may be added in minor/patch versions.
//   - Required fields may only be added in a new major apiVersion.
//   - Field semantics may not change within a major version.
//   - The compatibility.schemaEvolution field overrides the default.

export const AGENT_PACKAGE_API_VERSION = 'atlas.mirai.dev/v2' as const;
export const AGENT_PACKAGE_KIND = 'AgentPackage' as const;
export const AGENT_PACKAGE_SCHEMA_FILE = 'schema/atlas-agent-package.v2.schema.json' as const;

// ── Types ────────────────────────────────────────────────────────

export type AgentPackageMetadata = Readonly<{
  name: string;
  version: string;
  description?: string;
  labels?: Readonly<Record<string, string>>;
}>;

export type MissionTypeDefinition = Readonly<{
  type: string;
  goalTemplate: string;
  successDefinition?: string;
  failureDefinition?: string;
  autonomyLevel?: 'full' | 'proposal-only' | 'approval-required' | 'handoff-required';
  allowedTools?: readonly string[];
  maxDuration?: string; // ISO 8601 duration
}>;

export type MemoryPolicy = Readonly<{
  mode: 'stateless' | 'conversation' | 'mission' | 'customer' | 'organisation';
  retention?: string;   // ISO 8601 duration
  provenanceRequired?: boolean;
  maxEntries?: number;
}>;

export type AgentTrigger = Readonly<{
  kind: 'message' | 'schedule' | 'webhook' | 'provider-callback' | 'human-command' | 'system-condition';
  channel?: string;
  cronExpression?: string;
  webhookPath?: string;
  providerEvent?: string;
}>;

export type ChannelRequirement = Readonly<{
  channel: string;
  direction: 'inbound' | 'outbound' | 'bidirectional';
  mediaTypes?: readonly ('text' | 'image' | 'audio' | 'video' | 'file' | 'template' | 'interactive')[];
  required?: boolean;
}>;

export type AgentRuntimeSpec = Readonly<{
  mode: 'native' | 'openai-agents-sdk' | 'eve' | 'langgraph' | 'n8n' | 'custom';
  adapter?: string;
  config?: Readonly<Record<string, unknown>>;
}>;

export type AgentBudgets = Readonly<{
  maxConcurrentMissions?: number;
  maxTokensPerMission?: number;
  maxTokensPerDay?: number;
  maxCostPerMission?: number;
  maxCostPerDay?: number;
  maxCostPerMonth?: number;
  currency?: string;
}>;

export type OutcomeDefinition = Readonly<{
  id: string;
  type: 'success' | 'failure' | 'neutral';
  label?: string;
  evidenceRequired?: readonly (
    | 'message-delivered'
    | 'action-committed'
    | 'callback-received'
    | 'human-approved'
    | 'customer-confirmed'
    | 'time-expired'
    | 'error-threshold'
    | 'budget-exceeded'
  )[];
}>;

export type AgentCompatibility = Readonly<{
  minimumAtlasVersion?: string;
  requiresMirai?: boolean;
  schemaEvolution?: 'additive-only' | 'versioned' | 'breaking-allowed';
}>;

export type AgentPackageSpec = Readonly<{
  missionTypes?: readonly MissionTypeDefinition[];
  instructions: string;
  knowledgeBindings: readonly string[];
  memoryPolicy?: MemoryPolicy;
  tools: string;
  skills?: string;
  actionPolicies: string;
  subagents?: string;
  triggers?: readonly AgentTrigger[];
  channelRequirements?: readonly ChannelRequirement[];
  runtime?: AgentRuntimeSpec;
  budgets?: AgentBudgets;
  outcomeDefinitions?: readonly OutcomeDefinition[];
  evals?: readonly string[];
  compatibility?: AgentCompatibility;
}>;

export type AgentPackage = Readonly<{
  apiVersion: typeof AGENT_PACKAGE_API_VERSION;
  kind: typeof AGENT_PACKAGE_KIND;
  metadata: AgentPackageMetadata;
  spec: AgentPackageSpec;
}>;

// ── Agent version identity ───────────────────────────────────────

export type AgentVersionId = Readonly<{
  agent_version_id: string;   // SHA-256 of canonical JSON
  agent_name: string;
  agent_version: string;
  source_digest: string;
  created_at: string;
}>;

/**
 * Compute an immutable agent_version_id from an AgentPackage.
 * The identity is derived from the stable canonical JSON of the
 * metadata + spec, excluding runtime environment and deployment-
 * specific fields.  The same AgentPackage deployed twice produces
 * the same agent_version_id.
 */
export function computeAgentVersionId(pkg: AgentPackage, createdAt?: string): AgentVersionId {
  const canonical = {
    apiVersion: pkg.apiVersion,
    kind: pkg.kind,
    metadata: {
      name: pkg.metadata.name,
      version: pkg.metadata.version,
    },
    spec: stripDeploymentFields(pkg.spec),
  };
  const digest = sha256(stableJson(canonical));
  return Object.freeze({
    agent_version_id: digest,
    agent_name: pkg.metadata.name,
    agent_version: pkg.metadata.version,
    source_digest: digest,
    created_at: createdAt ?? new Date().toISOString(),
  });
}

function stripDeploymentFields(spec: AgentPackageSpec): unknown {
  // Remove fields that vary by deployment but not by source identity.
  const { runtime, budgets, ...rest } = spec as AgentPackageSpec & { runtime?: unknown; budgets?: unknown };
  return rest;
}

// ── Validation ───────────────────────────────────────────────────

export type AgentPackageDiagnosticCode =
  | 'INVALID_API_VERSION'
  | 'INVALID_KIND'
  | 'INVALID_METADATA'
  | 'INVALID_SPEC'
  | 'REQUIRED_FIELD'
  | 'INVALID_VALUE'
  | 'UNKNOWN_FIELD'
  | 'UNSAFE_PROJECT_PATH'
  | 'RAW_SECRET_FORBIDDEN';

export type AgentPackageDiagnostic = Readonly<{
  code: AgentPackageDiagnosticCode;
  path: string;
  message: string;
  next_action: string;
}>;

export type AgentPackageValidationResult = Readonly<{
  valid: boolean;
  diagnostics: readonly AgentPackageDiagnostic[];
  package?: AgentPackage;
}>;

const VALID_RUNTIME_MODES = new Set(['native', 'openai-agents-sdk', 'eve', 'langgraph', 'n8n', 'custom']);
const VALID_TRIGGER_KINDS = new Set(['message', 'schedule', 'webhook', 'provider-callback', 'human-command', 'system-condition']);
const VALID_CHANNEL_DIRECTIONS = new Set(['inbound', 'outbound', 'bidirectional']);
const VALID_MEDIA_TYPES = new Set(['text', 'image', 'audio', 'video', 'file', 'template', 'interactive']);
const VALID_AUTONOMY_LEVELS = new Set(['full', 'proposal-only', 'approval-required', 'handoff-required']);
const VALID_MEMORY_MODES = new Set(['stateless', 'conversation', 'mission', 'customer', 'organisation']);
const VALID_OUTCOME_TYPES = new Set(['success', 'failure', 'neutral']);
const VALID_OUTCOME_EVIDENCE = new Set(['message-delivered', 'action-committed', 'callback-received', 'human-approved', 'customer-confirmed', 'time-expired', 'error-threshold', 'budget-exceeded']);
const VALID_SCHEMA_EVOLUTION = new Set(['additive-only', 'versioned', 'breaking-allowed']);
const METADATA_KEYS = new Set(['name', 'version', 'description', 'labels']);
const SPEC_KEYS = new Set(['missionTypes', 'instructions', 'knowledgeBindings', 'memoryPolicy', 'tools', 'skills', 'actionPolicies', 'subagents', 'triggers', 'channelRequirements', 'runtime', 'budgets', 'outcomeDefinitions', 'evals', 'compatibility']);

export function validateAgentPackage(value: unknown): AgentPackageValidationResult {
  const diagnostics: AgentPackageDiagnostic[] = [];

  if (!isRecord(value)) {
    addDiagnostic(diagnostics, 'INVALID_SPEC', '$', 'AgentPackage must be an object', 'Provide a valid AgentPackage JSON object');
    return { valid: false, diagnostics };
  }

  // apiVersion
  if (value.apiVersion !== AGENT_PACKAGE_API_VERSION) {
    addDiagnostic(diagnostics, 'INVALID_API_VERSION', '$.apiVersion', `apiVersion must be "${AGENT_PACKAGE_API_VERSION}"`, 'Set apiVersion to the correct value');
  }

  // kind
  if (value.kind !== AGENT_PACKAGE_KIND) {
    addDiagnostic(diagnostics, 'INVALID_KIND', '$.kind', `kind must be "${AGENT_PACKAGE_KIND}"`, 'Set kind to AgentPackage');
  }

  // metadata
  validateAgentMetadata(value.metadata, diagnostics);

  // spec
  if (!isRecord(value.spec)) {
    addDiagnostic(diagnostics, 'REQUIRED_FIELD', '$.spec', 'spec is required and must be an object', 'Add a spec with instructions, knowledgeBindings, tools, and actionPolicies');
    return { valid: false, diagnostics };
  }
  validateAgentSpec(value.spec, diagnostics);

  if (diagnostics.length > 0) return { valid: false, diagnostics };

  const pkg: AgentPackage = Object.freeze({
    apiVersion: AGENT_PACKAGE_API_VERSION,
    kind: AGENT_PACKAGE_KIND,
    metadata: deepFreeze(cloneJson(value.metadata) as AgentPackageMetadata),
    spec: deepFreeze(cloneJson(value.spec) as AgentPackageSpec),
  });

  return { valid: true, diagnostics, package: pkg };
}

// ── Internal validators ──────────────────────────────────────────

function validateAgentMetadata(value: unknown, diagnostics: AgentPackageDiagnostic[]): void {
  if (!isRecord(value)) {
    addDiagnostic(diagnostics, 'REQUIRED_FIELD', '$.metadata', 'metadata is required and must be an object', 'Add metadata with name and version');
    return;
  }

  // name
  if (typeof value.name !== 'string' || !/^[a-z0-9][a-z0-9-]{0,62}$/.test(value.name)) {
    addDiagnostic(diagnostics, 'INVALID_VALUE', '$.metadata.name', 'metadata.name must be a lowercase slug up to 63 characters', 'Use a name such as front-desk');
  }

  // version (semver)
  if (typeof value.version !== 'string' || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-[a-zA-Z0-9][a-zA-Z0-9.-]{0,62})?(\+[a-zA-Z0-9][a-zA-Z0-9.-]{0,62})?$/.test(value.version)) {
    addDiagnostic(diagnostics, 'INVALID_VALUE', '$.metadata.version', 'metadata.version must be valid semver', 'Use a version like 1.0.0');
  }

  // description
  if (value.description !== undefined && (typeof value.description !== 'string' || value.description.length > 500)) {
    addDiagnostic(diagnostics, 'INVALID_VALUE', '$.metadata.description', 'metadata.description must be a string up to 500 characters', 'Shorten or remove metadata.description');
  }

  // labels
  if (value.labels !== undefined) {
    if (!isRecord(value.labels)) {
      addDiagnostic(diagnostics, 'INVALID_VALUE', '$.metadata.labels', 'labels must be a flat string→string map', 'Use string key-value pairs');
    } else if (Object.keys(value.labels).length > 16) {
      addDiagnostic(diagnostics, 'INVALID_VALUE', '$.metadata.labels', 'labels may have at most 16 entries', 'Reduce labels to 16 or fewer');
    }
  }
}

function validateAgentSpec(value: Record<string, unknown>, diagnostics: AgentPackageDiagnostic[]): void {
  checkUnknownFields(value, SPEC_KEYS, '$.spec', diagnostics);

  // required fields
  validateProjectPath(value.instructions, '$.spec.instructions', true, diagnostics);
  validateProjectPathArray(value.knowledgeBindings, '$.spec.knowledgeBindings', true, diagnostics);
  validateProjectPath(value.tools, '$.spec.tools', true, diagnostics);
  validateProjectPath(value.actionPolicies, '$.spec.actionPolicies', true, diagnostics);

  // optional fields
  if (value.skills !== undefined) validateProjectPath(value.skills, '$.spec.skills', false, diagnostics);
  if (value.subagents !== undefined) validateProjectPath(value.subagents, '$.spec.subagents', false, diagnostics);
  if (value.evals !== undefined) validateProjectPathArray(value.evals, '$.spec.evals', false, diagnostics);

  if (value.missionTypes !== undefined) validateMissionTypes(value.missionTypes, diagnostics);
  if (value.memoryPolicy !== undefined) validateMemoryPolicy(value.memoryPolicy, diagnostics);
  if (value.triggers !== undefined) validateTriggers(value.triggers, diagnostics);
  if (value.channelRequirements !== undefined) validateChannelRequirements(value.channelRequirements, diagnostics);
  if (value.runtime !== undefined) validateAgentRuntime(value.runtime, diagnostics);
  if (value.budgets !== undefined) validateBudgets(value.budgets, diagnostics);
  if (value.outcomeDefinitions !== undefined) validateOutcomeDefinitions(value.outcomeDefinitions, diagnostics);
  if (value.compatibility !== undefined) validateCompatibility(value.compatibility, diagnostics);
}

function validateMissionTypes(value: unknown, diagnostics: AgentPackageDiagnostic[]): void {
  if (!Array.isArray(value) || value.length === 0) {
    addDiagnostic(diagnostics, 'INVALID_VALUE', '$.spec.missionTypes', 'missionTypes must be a non-empty array', 'Add at least one mission type');
    return;
  }
  const seen = new Set<string>();
  value.forEach((item, index) => {
    if (!isRecord(item)) {
      addDiagnostic(diagnostics, 'INVALID_VALUE', `$.spec.missionTypes[${index}]`, 'each mission type must be an object', 'Provide a valid mission type definition');
      return;
    }
    if (typeof item.type !== 'string' || !/^[a-z][a-z0-9-]{0,62}$/.test(item.type)) {
      addDiagnostic(diagnostics, 'INVALID_VALUE', `$.spec.missionTypes[${index}].type`, 'mission type must be a lowercase slug', 'Use a type like booking-change');
    } else if (seen.has(item.type)) {
      addDiagnostic(diagnostics, 'INVALID_VALUE', `$.spec.missionTypes[${index}].type`, `duplicate mission type: ${item.type}`, 'Remove the duplicate mission type');
    } else {
      seen.add(item.type);
    }
    if (typeof item.goalTemplate !== 'string' || !item.goalTemplate.trim()) {
      addDiagnostic(diagnostics, 'REQUIRED_FIELD', `$.spec.missionTypes[${index}].goalTemplate`, 'goalTemplate is required', 'Add a goal template string');
    }
    if (item.autonomyLevel !== undefined && !VALID_AUTONOMY_LEVELS.has(item.autonomyLevel as string)) {
      addDiagnostic(diagnostics, 'INVALID_VALUE', `$.spec.missionTypes[${index}].autonomyLevel`, `autonomyLevel must be one of: ${[...VALID_AUTONOMY_LEVELS].join(', ')}`, 'Use a valid autonomy level');
    }
  });
}

function validateMemoryPolicy(value: unknown, diagnostics: AgentPackageDiagnostic[]): void {
  if (!isRecord(value)) return;
  if (typeof value.mode !== 'string' || !VALID_MEMORY_MODES.has(value.mode)) {
    addDiagnostic(diagnostics, 'INVALID_VALUE', '$.spec.memoryPolicy.mode', `memoryPolicy.mode must be one of: ${[...VALID_MEMORY_MODES].join(', ')}`, 'Use a valid memory mode');
  }
  if (value.maxEntries !== undefined && (typeof value.maxEntries !== 'number' || value.maxEntries < 1 || value.maxEntries > 100000)) {
    addDiagnostic(diagnostics, 'INVALID_VALUE', '$.spec.memoryPolicy.maxEntries', 'maxEntries must be between 1 and 100000', 'Adjust maxEntries');
  }
}

function validateTriggers(value: unknown, diagnostics: AgentPackageDiagnostic[]): void {
  if (!Array.isArray(value)) return;
  value.forEach((item, index) => {
    if (!isRecord(item)) return;
    if (typeof item.kind !== 'string' || !VALID_TRIGGER_KINDS.has(item.kind)) {
      addDiagnostic(diagnostics, 'INVALID_VALUE', `$.spec.triggers[${index}].kind`, `trigger kind must be one of: ${[...VALID_TRIGGER_KINDS].join(', ')}`, 'Use a valid trigger kind');
    }
  });
}

function validateChannelRequirements(value: unknown, diagnostics: AgentPackageDiagnostic[]): void {
  if (!Array.isArray(value)) return;
  value.forEach((item, index) => {
    if (!isRecord(item)) return;
    if (typeof item.channel !== 'string' || !item.channel.trim()) {
      addDiagnostic(diagnostics, 'REQUIRED_FIELD', `$.spec.channelRequirements[${index}].channel`, 'channel name is required', 'Specify a channel name');
    }
    if (typeof item.direction !== 'string' || !VALID_CHANNEL_DIRECTIONS.has(item.direction)) {
      addDiagnostic(diagnostics, 'INVALID_VALUE', `$.spec.channelRequirements[${index}].direction`, `direction must be: ${[...VALID_CHANNEL_DIRECTIONS].join(', ')}`, 'Use a valid direction');
    }
  });
}

function validateAgentRuntime(value: unknown, diagnostics: AgentPackageDiagnostic[]): void {
  if (!isRecord(value)) return;
  if (typeof value.mode !== 'string' || !VALID_RUNTIME_MODES.has(value.mode)) {
    addDiagnostic(diagnostics, 'INVALID_VALUE', '$.spec.runtime.mode', `runtime mode must be one of: ${[...VALID_RUNTIME_MODES].join(', ')}`, 'Use a valid runtime mode');
  }
}

function validateBudgets(value: unknown, diagnostics: AgentPackageDiagnostic[]): void {
  if (!isRecord(value)) return;
  if (value.maxConcurrentMissions !== undefined && (typeof value.maxConcurrentMissions !== 'number' || value.maxConcurrentMissions < 1)) {
    addDiagnostic(diagnostics, 'INVALID_VALUE', '$.spec.budgets.maxConcurrentMissions', 'maxConcurrentMissions must be at least 1', 'Set a positive number');
  }
  if (value.currency !== undefined && (typeof value.currency !== 'string' || !/^[A-Z]{3}$/.test(value.currency))) {
    addDiagnostic(diagnostics, 'INVALID_VALUE', '$.spec.budgets.currency', 'currency must be a 3-letter ISO code', 'Use an ISO 4217 currency code like USD');
  }
}

function validateOutcomeDefinitions(value: unknown, diagnostics: AgentPackageDiagnostic[]): void {
  if (!Array.isArray(value)) return;
  const seen = new Set<string>();
  value.forEach((item, index) => {
    if (!isRecord(item)) return;
    if (typeof item.id !== 'string' || !/^[a-z][a-z0-9-]{0,62}$/.test(item.id)) {
      addDiagnostic(diagnostics, 'INVALID_VALUE', `$.spec.outcomeDefinitions[${index}].id`, 'outcome id must be a lowercase slug', 'Use a valid id');
    } else if (seen.has(item.id)) {
      addDiagnostic(diagnostics, 'INVALID_VALUE', `$.spec.outcomeDefinitions[${index}].id`, `duplicate outcome id: ${item.id}`, 'Remove the duplicate outcome definition');
    } else {
      seen.add(item.id);
    }
    if (typeof item.type !== 'string' || !VALID_OUTCOME_TYPES.has(item.type)) {
      addDiagnostic(diagnostics, 'INVALID_VALUE', `$.spec.outcomeDefinitions[${index}].type`, `outcome type must be: ${[...VALID_OUTCOME_TYPES].join(', ')}`, 'Use a valid outcome type');
    }
  });
}

function validateCompatibility(value: unknown, diagnostics: AgentPackageDiagnostic[]): void {
  if (!isRecord(value)) return;
  if (value.schemaEvolution !== undefined && !VALID_SCHEMA_EVOLUTION.has(value.schemaEvolution as string)) {
    addDiagnostic(diagnostics, 'INVALID_VALUE', '$.spec.compatibility.schemaEvolution', `schemaEvolution must be: ${[...VALID_SCHEMA_EVOLUTION].join(', ')}`, 'Use a valid schema evolution policy');
  }
}

function validateProjectPath(value: unknown, pathName: string, required: boolean, diagnostics: AgentPackageDiagnostic[]): void {
  if (typeof value !== 'string' || !value) {
    if (required) addDiagnostic(diagnostics, 'REQUIRED_FIELD', pathName, 'project path must be a non-empty string', 'Use a path beginning with ./');
    return;
  }
  if (!isSafeProjectPath(value)) {
    addDiagnostic(diagnostics, 'UNSAFE_PROJECT_PATH', pathName, `project path must remain inside the project: ${value}`, 'Use a normalized relative path beginning with ./');
  }
}

function validateProjectPathArray(value: unknown, pathName: string, required: boolean, diagnostics: AgentPackageDiagnostic[]): void {
  if (!Array.isArray(value)) {
    if (required) addDiagnostic(diagnostics, 'REQUIRED_FIELD', pathName, `${pathName} must be an array`, `Add at least one project-relative path to ${pathName}`);
    return;
  }
  if (required && value.length === 0) addDiagnostic(diagnostics, 'INVALID_VALUE', pathName, `${pathName} must not be empty`, `Add at least one path to ${pathName}`);
  value.forEach((item, index) => validateProjectPath(item, `${pathName}[${index}]`, true, diagnostics));
}

function isSafeProjectPath(value: string): boolean {
  if (!value.startsWith('./') || value.includes('\\') || value.includes('\0')) return false;
  const segments = value.slice(2).split('/').filter((s) => s !== '');
  return segments.length > 0 && !segments.some((s) => s === '.' || s === '..');
}

// ── Helpers ──────────────────────────────────────────────────────

function addDiagnostic(
  diagnostics: AgentPackageDiagnostic[],
  code: AgentPackageDiagnosticCode,
  pathName: string,
  message: string,
  nextAction: string,
): void {
  if (diagnostics.some((d) => d.code === code && d.path === pathName && d.message === message)) return;
  diagnostics.push({ code, path: pathName, message, next_action: nextAction });
}

function checkUnknownFields(value: Record<string, unknown>, allowed: ReadonlySet<string>, pathName: string, diagnostics: AgentPackageDiagnostic[]): void {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) addDiagnostic(diagnostics, 'UNKNOWN_FIELD', `${pathName}.${key}`, `unknown field: ${key}`, `Remove ${pathName}.${key} or upgrade the schema`);
  }
}

// Inline stable JSON canonicalization to avoid circular deps with project-contract.
// Must produce keys in sorted order with undefined values excluded,
// matching the canonical form used by sha256 for agent_version_id.
function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (isRecord(value)) {
    return `{${Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${stableJson(v)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) deepFreeze(nested);
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
