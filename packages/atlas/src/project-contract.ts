import path from 'node:path';
import { lstat, readdir } from 'node:fs/promises';
import { AtlasCliError } from './errors.js';
import { atomicWriteProjectFile, readUtf8Safe, sha256 } from './fs-safety.js';

export const ATLAS_PROJECT_SCHEMA_VERSION = '1' as const;
export const ATLAS_PROJECT_CONFIG_FILE = 'atlas.config.ts' as const;
export const ATLAS_PROJECT_JSON_SCHEMA_FILE = 'schema/atlas-project.v1.schema.json' as const;

export type AtlasSecretReference = Readonly<{
  kind: 'atlas.secret-ref/v1';
  ref: string;
}>;

export type AtlasProjectConfig = Readonly<{
  schemaVersion: '1';
  project: Readonly<{
    name: string;
    description?: string;
  }>;
  runtime: Readonly<{
    mode: 'native';
  }>;
  model:
    | Readonly<{ mode: 'local-fixture' }>
    | Readonly<{ mode: 'managed'; model?: string }>
    | Readonly<{ mode: 'byok'; credential: AtlasSecretReference; model?: string }>
    | Readonly<{ mode: 'gateway'; credential: AtlasSecretReference; baseUrl?: string; model?: string }>;
  agent: Readonly<{
    instructions: string;
    tools: string;
    skills?: string;
    policies: string;
    subagents?: string;
  }>;
  knowledge: readonly string[];
  channels: readonly string[];
  evals: readonly string[];
}>;

export type AtlasEnvironmentOverlay = Readonly<{
  schemaVersion: '1';
  runtime?: AtlasProjectConfig['runtime'];
  model?: AtlasProjectConfig['model'];
  channels?: readonly string[];
  variables?: Readonly<Record<string, string | number | boolean>>;
  credentials?: Readonly<Record<string, AtlasSecretReference>>;
}>;

export type AtlasProjectDiagnosticCode =
  | 'INVALID_TYPE'
  | 'INVALID_VALUE'
  | 'REQUIRED_FIELD'
  | 'UNKNOWN_FIELD'
  | 'UNSUPPORTED_SCHEMA_VERSION'
  | 'RAW_SECRET_FORBIDDEN'
  | 'INVALID_SECRET_REFERENCE'
  | 'UNSAFE_PROJECT_PATH';

export type AtlasProjectDiagnostic = Readonly<{
  code: AtlasProjectDiagnosticCode;
  path: string;
  message: string;
  next_action: string;
}>;

export type AtlasProjectValidationResult<T = AtlasProjectConfig> = Readonly<{
  valid: boolean;
  diagnostics: readonly AtlasProjectDiagnostic[];
  config?: T;
}>;

export type LoadedAtlasProject = Readonly<{
  config: AtlasProjectConfig;
  canonical_config: AtlasProjectConfig;
  environment: string | null;
  overlay: AtlasEnvironmentOverlay | null;
  package_hash: string;
  files: readonly string[];
}>;

export type AtlasProjectMigrationResult = Readonly<{
  changed: boolean;
  from_version: string;
  to_version: '1';
  config: AtlasProjectConfig;
  patch: readonly string[];
}>;

const PROJECT_FIELDS = new Set(['schemaVersion', 'project', 'runtime', 'model', 'agent', 'knowledge', 'channels', 'evals']);
const PROJECT_META_FIELDS = new Set(['name', 'description']);
const RUNTIME_FIELDS = new Set(['mode']);
const AGENT_FIELDS = new Set(['instructions', 'tools', 'skills', 'policies', 'subagents']);
const MODEL_FIELDS = new Set(['mode', 'credential', 'model', 'baseUrl']);
const OVERLAY_FIELDS = new Set(['schemaVersion', 'runtime', 'model', 'channels', 'variables', 'credentials']);
const SECRET_FIELDS = new Set(['kind', 'ref']);
const SECRET_KEY_PATTERN = /(password|secret|access[_-]?token|refresh[_-]?token|private[_-]?key|api[_-]?key|credential)/i;
const SECRET_VALUE_PATTERNS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /^Bearer\s+/i,
  /^(sk|pk)_(live|test)_/i,
  /^sk-[A-Za-z0-9_-]{12,}$/,
];

export function secretRef(ref: string): AtlasSecretReference {
  if (!isSecretReferenceUri(ref)) {
    throw new AtlasCliError('LOCAL_STATE_ERROR', 'Atlas secret references must use atlas://credentials/<name>', {
      nextAction: 'Replace the raw value with secretRef("atlas://credentials/<name>")',
    });
  }
  return Object.freeze({ kind: 'atlas.secret-ref/v1', ref });
}

export function defineAtlasProject(config: AtlasProjectConfig): AtlasProjectConfig {
  const result = validateAtlasProject(config);
  if (!result.valid || !result.config) throw validationError(result.diagnostics);
  return deepFreeze(cloneJson(result.config));
}

export function defineAtlasEnvironment(overlay: AtlasEnvironmentOverlay): AtlasEnvironmentOverlay {
  const result = validateAtlasEnvironment(overlay);
  if (!result.valid || !result.config) throw validationError(result.diagnostics);
  return deepFreeze(cloneJson(result.config));
}

export function validateAtlasProject(value: unknown): AtlasProjectValidationResult {
  const diagnostics: AtlasProjectDiagnostic[] = [];
  scanRawSecrets(value, '$', diagnostics);
  if (!isRecord(value)) {
    diagnostic(diagnostics, 'INVALID_TYPE', '$', 'Atlas project configuration must be an object', 'Export a defineAtlasProject({...}) object');
    return { valid: false, diagnostics };
  }

  unknownFields(value, PROJECT_FIELDS, '$', diagnostics);
  schemaVersion(value.schemaVersion, '$.schemaVersion', diagnostics);
  validateProjectMetadata(value.project, diagnostics);
  validateRuntime(value.runtime, '$.runtime', true, diagnostics);
  validateModel(value.model, '$.model', true, diagnostics);
  validateAgent(value.agent, diagnostics);
  validatePathArray(value.knowledge, '$.knowledge', true, diagnostics);
  validatePathArray(value.channels, '$.channels', true, diagnostics);
  validatePathArray(value.evals, '$.evals', true, diagnostics);

  if (diagnostics.length > 0) return { valid: false, diagnostics };
  return { valid: true, diagnostics, config: cloneJson(value) as AtlasProjectConfig };
}

export function validateAtlasEnvironment(value: unknown): AtlasProjectValidationResult<AtlasEnvironmentOverlay> {
  const diagnostics: AtlasProjectDiagnostic[] = [];
  scanRawSecrets(value, '$', diagnostics);
  if (!isRecord(value)) {
    diagnostic(diagnostics, 'INVALID_TYPE', '$', 'Atlas environment overlay must be an object', 'Export a defineAtlasEnvironment({...}) object');
    return { valid: false, diagnostics };
  }

  unknownFields(value, OVERLAY_FIELDS, '$', diagnostics);
  schemaVersion(value.schemaVersion, '$.schemaVersion', diagnostics);
  if (value.runtime !== undefined) validateRuntime(value.runtime, '$.runtime', true, diagnostics);
  if (value.model !== undefined) validateModel(value.model, '$.model', true, diagnostics);
  if (value.channels !== undefined) validatePathArray(value.channels, '$.channels', true, diagnostics);
  validateVariables(value.variables, diagnostics);
  validateCredentials(value.credentials, diagnostics);

  if (diagnostics.length > 0) return { valid: false, diagnostics };
  return { valid: true, diagnostics, config: cloneJson(value) as AtlasEnvironmentOverlay };
}

export function renderAtlasProjectConfig(
  value: AtlasProjectConfig | AtlasEnvironmentOverlay,
  kind: 'project' | 'environment' = 'project',
): string {
  const functionName = kind === 'project' ? 'defineAtlasProject' : 'defineAtlasEnvironment';
  const validated = kind === 'project' ? validateAtlasProject(value) : validateAtlasEnvironment(value);
  if (!validated.valid) throw validationError(validated.diagnostics);
  return `import { ${functionName} } from "@atlas-runner/atlas";\n\nexport default ${functionName}(\n${JSON.stringify(value, null, 2)}\n);\n`;
}

export async function writeAtlasProjectConfig(root: string, config: AtlasProjectConfig): Promise<string> {
  const target = path.resolve(root, ATLAS_PROJECT_CONFIG_FILE);
  await atomicWriteProjectFile(target, renderAtlasProjectConfig(config), 0o644);
  return target;
}

export async function loadAtlasProject(
  root: string,
  options: Readonly<{ environment?: string }> = {},
): Promise<LoadedAtlasProject> {
  const projectRoot = path.resolve(root);
  const raw = await readUtf8Safe(path.join(projectRoot, ATLAS_PROJECT_CONFIG_FILE));
  if (raw === null) {
    throw new AtlasCliError('LOCAL_STATE_ERROR', `Atlas project configuration not found: ${path.join(projectRoot, ATLAS_PROJECT_CONFIG_FILE)}`, {
      nextAction: 'Run atlas init front-desk or restore atlas.config.ts',
    });
  }
  const canonicalValue = parseAtlasConfigSource(raw, 'project');
  const canonicalResult = validateAtlasProject(canonicalValue);
  if (!canonicalResult.valid || !canonicalResult.config) throw validationError(canonicalResult.diagnostics);

  let overlay: AtlasEnvironmentOverlay | null = null;
  if (options.environment !== undefined) {
    if (!/^[a-z][a-z0-9-]{0,31}$/.test(options.environment)) {
      throw new AtlasCliError('USAGE_ERROR', 'Environment overlay name must match [a-z][a-z0-9-]{0,31}', {
        nextAction: 'Use an environment name such as local, staging, or production',
      });
    }
    const overlayPath = path.join(projectRoot, `atlas.${options.environment}.ts`);
    const overlayRaw = await readUtf8Safe(overlayPath);
    if (overlayRaw === null) {
      throw new AtlasCliError('LOCAL_STATE_ERROR', `Atlas environment overlay not found: ${overlayPath}`, {
        nextAction: `Create atlas.${options.environment}.ts or omit the environment option`,
      });
    }
    const overlayResult = validateAtlasEnvironment(parseAtlasConfigSource(overlayRaw, 'environment'));
    if (!overlayResult.valid || !overlayResult.config) throw validationError(overlayResult.diagnostics);
    overlay = overlayResult.config;
  }

  const effective = overlay ? applyOverlay(canonicalResult.config, overlay) : canonicalResult.config;
  const packageFiles = await collectPackageFiles(projectRoot, effective);
  const packageIdentity = {
    schema_version: ATLAS_PROJECT_SCHEMA_VERSION,
    package_contract: '@atlas-runner/atlas-project/v1',
    config: stripEnvironmentOnlyState(effective),
    files: await Promise.all(packageFiles.map(async (relativePath) => {
      const contents = await readUtf8Safe(path.join(projectRoot, relativePath));
      if (contents === null) throw missingProjectPath(relativePath);
      return { path: relativePath, digest: sha256(contents) };
    })),
  };

  return {
    config: deepFreeze(cloneJson(effective)),
    canonical_config: deepFreeze(cloneJson(canonicalResult.config)),
    environment: options.environment ?? null,
    overlay: overlay ? deepFreeze(cloneJson(overlay)) : null,
    package_hash: sha256(stableJson(packageIdentity)),
    files: packageFiles,
  };
}

export function exportAtlasProject(config: AtlasProjectConfig): string {
  const result = validateAtlasProject(config);
  if (!result.valid || !result.config) throw validationError(result.diagnostics);
  return `${stableJson(result.config)}\n`;
}

export function importAtlasProject(serialized: string): AtlasProjectConfig {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    throw new AtlasCliError('LOCAL_STATE_ERROR', 'Atlas project import is not valid JSON', {
      nextAction: 'Export the project again with atlas export and retry',
    });
  }
  const result = validateAtlasProject(parsed);
  if (!result.valid || !result.config) throw validationError(result.diagnostics);
  return deepFreeze(cloneJson(result.config));
}

export function migrateAtlasProject(value: unknown): AtlasProjectMigrationResult {
  if (isRecord(value) && value.schemaVersion === '1') {
    const result = validateAtlasProject(value);
    if (!result.valid || !result.config) throw validationError(result.diagnostics);
    return { changed: false, from_version: '1', to_version: '1', config: deepFreeze(cloneJson(result.config)), patch: [] };
  }
  if (!isRecord(value) || value.schemaVersion !== '0') {
    throw new AtlasCliError('LOCAL_STATE_ERROR', 'Atlas project schema is not readable by this CLI', {
      nextAction: 'Install a compatible Atlas CLI or restore a supported schema version',
    });
  }

  const name = typeof value.name === 'string' && value.name.trim() ? value.name.trim() : 'atlas-project';
  const migrated = defineAtlasProject({
    schemaVersion: '1',
    project: { name },
    runtime: { mode: 'native' },
    model: { mode: 'local-fixture' },
    agent: {
      instructions: stringOr(value.instructions, './agent/instructions.md'),
      tools: stringOr(value.tools, './agent/tools'),
      skills: stringOr(value.skills, './agent/skills'),
      policies: stringOr(value.policies, './agent/policies'),
      subagents: stringOr(value.subagents, './agent/subagents'),
    },
    knowledge: stringArrayOr(value.knowledge, ['./knowledge']),
    channels: stringArrayOr(value.channels, ['./channels/web-chat.ts']),
    evals: stringArrayOr(value.evals, ['./evals']),
  });
  return {
    changed: true,
    from_version: '0',
    to_version: '1',
    config: migrated,
    patch: [
      'replace schemaVersion 0 with 1',
      'nest project identity under project',
      'add native runtime and local-fixture model defaults',
      'nest agent filesystem references under agent',
    ],
  };
}

function validateProjectMetadata(value: unknown, diagnostics: AtlasProjectDiagnostic[]): void {
  if (!isRecord(value)) {
    diagnostic(diagnostics, 'REQUIRED_FIELD', '$.project', 'project is required and must be an object', 'Add project: { name: "front-desk" }');
    return;
  }
  unknownFields(value, PROJECT_META_FIELDS, '$.project', diagnostics);
  if (typeof value.name !== 'string' || !/^[a-z0-9][a-z0-9-]{0,62}$/.test(value.name)) {
    diagnostic(diagnostics, 'INVALID_VALUE', '$.project.name', 'project.name must be a lowercase slug up to 63 characters', 'Use a name such as front-desk');
  }
  if (value.description !== undefined && (typeof value.description !== 'string' || value.description.length > 500)) {
    diagnostic(diagnostics, 'INVALID_VALUE', '$.project.description', 'project.description must be a string up to 500 characters', 'Shorten or remove project.description');
  }
}

function validateRuntime(value: unknown, pathName: string, required: boolean, diagnostics: AtlasProjectDiagnostic[]): void {
  if (!isRecord(value)) {
    if (required) diagnostic(diagnostics, 'REQUIRED_FIELD', pathName, 'runtime is required and must be an object', 'Add runtime: { mode: "native" }');
    return;
  }
  unknownFields(value, RUNTIME_FIELDS, pathName, diagnostics);
  if (value.mode !== 'native') diagnostic(diagnostics, 'INVALID_VALUE', `${pathName}.mode`, 'runtime.mode must be native in project schema v1', 'Set runtime.mode to native');
}

function validateModel(value: unknown, pathName: string, required: boolean, diagnostics: AtlasProjectDiagnostic[]): void {
  if (!isRecord(value)) {
    if (required) diagnostic(diagnostics, 'REQUIRED_FIELD', pathName, 'model is required and must be an object', 'Add model: { mode: "local-fixture" }');
    return;
  }
  unknownFields(value, MODEL_FIELDS, pathName, diagnostics);
  const modes = ['local-fixture', 'managed', 'byok', 'gateway'];
  if (typeof value.mode !== 'string' || !modes.includes(value.mode)) {
    diagnostic(diagnostics, 'INVALID_VALUE', `${pathName}.mode`, 'model.mode is unsupported', 'Use local-fixture, managed, byok, or gateway');
    return;
  }
  if ((value.mode === 'byok' || value.mode === 'gateway') && !isSecretReference(value.credential)) {
    diagnostic(diagnostics, 'INVALID_SECRET_REFERENCE', `${pathName}.credential`, `${value.mode} requires a typed Atlas secret reference`, 'Use secretRef("atlas://credentials/<name>")');
  }
  if ((value.mode === 'local-fixture' || value.mode === 'managed') && value.credential !== undefined) {
    diagnostic(diagnostics, 'UNKNOWN_FIELD', `${pathName}.credential`, `${value.mode} does not accept credential`, 'Remove model.credential or select byok/gateway mode');
  }
  if (value.model !== undefined && (typeof value.model !== 'string' || !value.model.trim())) {
    diagnostic(diagnostics, 'INVALID_VALUE', `${pathName}.model`, 'model identifier must be a non-empty string', 'Set a model identifier or remove the field');
  }
  if (value.baseUrl !== undefined) {
    if (value.mode !== 'gateway') diagnostic(diagnostics, 'UNKNOWN_FIELD', `${pathName}.baseUrl`, 'baseUrl is only valid for gateway mode', 'Remove baseUrl or select gateway mode');
    else if (!isHttpUrl(value.baseUrl)) diagnostic(diagnostics, 'INVALID_VALUE', `${pathName}.baseUrl`, 'gateway baseUrl must be an absolute HTTP(S) URL', 'Use an HTTPS gateway URL');
  }
}

function validateAgent(value: unknown, diagnostics: AtlasProjectDiagnostic[]): void {
  if (!isRecord(value)) {
    diagnostic(diagnostics, 'REQUIRED_FIELD', '$.agent', 'agent is required and must be an object', 'Add instructions, tools, and policies paths');
    return;
  }
  unknownFields(value, AGENT_FIELDS, '$.agent', diagnostics);
  validatePath(value.instructions, '$.agent.instructions', true, diagnostics);
  validatePath(value.tools, '$.agent.tools', true, diagnostics);
  validatePath(value.policies, '$.agent.policies', true, diagnostics);
  if (value.skills !== undefined) validatePath(value.skills, '$.agent.skills', true, diagnostics);
  if (value.subagents !== undefined) validatePath(value.subagents, '$.agent.subagents', true, diagnostics);
}

function validatePathArray(value: unknown, pathName: string, required: boolean, diagnostics: AtlasProjectDiagnostic[]): void {
  if (!Array.isArray(value)) {
    if (required) diagnostic(diagnostics, 'REQUIRED_FIELD', pathName, `${pathName} must be an array`, `Add at least one project-relative path to ${pathName}`);
    return;
  }
  if (required && value.length === 0) diagnostic(diagnostics, 'INVALID_VALUE', pathName, `${pathName} must not be empty`, `Add at least one project-relative path to ${pathName}`);
  value.forEach((item, index) => validatePath(item, `${pathName}[${index}]`, true, diagnostics));
}

function validatePath(value: unknown, pathName: string, required: boolean, diagnostics: AtlasProjectDiagnostic[]): void {
  if (typeof value !== 'string' || !value) {
    if (required) diagnostic(diagnostics, 'REQUIRED_FIELD', pathName, 'project path must be a non-empty string', 'Use a path beginning with ./');
    return;
  }
  if (!isSafeProjectPath(value)) {
    diagnostic(diagnostics, 'UNSAFE_PROJECT_PATH', pathName, `project path must remain inside the Atlas project: ${value}`, 'Use a normalized relative path beginning with ./ and without ..');
  }
}

function validateVariables(value: unknown, diagnostics: AtlasProjectDiagnostic[]): void {
  if (value === undefined) return;
  if (!isRecord(value)) {
    diagnostic(diagnostics, 'INVALID_TYPE', '$.variables', 'variables must be an object of non-secret scalar values', 'Replace variables with a plain object');
    return;
  }
  for (const [key, item] of Object.entries(value)) {
    if (!/^[A-Z][A-Z0-9_]{0,63}$/.test(key)) diagnostic(diagnostics, 'INVALID_VALUE', `$.variables.${key}`, 'variable names must use UPPER_SNAKE_CASE', 'Rename the variable');
    if (!['string', 'number', 'boolean'].includes(typeof item)) diagnostic(diagnostics, 'INVALID_TYPE', `$.variables.${key}`, 'variable values must be strings, numbers, or booleans', 'Use a non-secret scalar value');
  }
}

function validateCredentials(value: unknown, diagnostics: AtlasProjectDiagnostic[]): void {
  if (value === undefined) return;
  if (!isRecord(value)) {
    diagnostic(diagnostics, 'INVALID_TYPE', '$.credentials', 'credentials must map names to typed secret references', 'Use { NAME: secretRef("atlas://credentials/name") }');
    return;
  }
  for (const [key, item] of Object.entries(value)) {
    if (!/^[A-Z][A-Z0-9_]{0,63}$/.test(key)) diagnostic(diagnostics, 'INVALID_VALUE', `$.credentials.${key}`, 'credential names must use UPPER_SNAKE_CASE', 'Rename the credential reference');
    if (!isSecretReference(item)) diagnostic(diagnostics, 'INVALID_SECRET_REFERENCE', `$.credentials.${key}`, 'credential values must be typed Atlas secret references', 'Use secretRef("atlas://credentials/<name>")');
  }
}

function schemaVersion(value: unknown, pathName: string, diagnostics: AtlasProjectDiagnostic[]): void {
  if (value !== ATLAS_PROJECT_SCHEMA_VERSION) {
    diagnostic(diagnostics, 'UNSUPPORTED_SCHEMA_VERSION', pathName, `schemaVersion must be ${ATLAS_PROJECT_SCHEMA_VERSION}`, 'Run atlas upgrade with a compatible CLI');
  }
}

function unknownFields(value: Record<string, unknown>, allowed: ReadonlySet<string>, pathName: string, diagnostics: AtlasProjectDiagnostic[]): void {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) diagnostic(diagnostics, 'UNKNOWN_FIELD', `${pathName}.${key}`, `unknown field: ${key}`, `Remove ${pathName}.${key} or install a schema version that supports it`);
  }
}

function scanRawSecrets(value: unknown, pathName: string, diagnostics: AtlasProjectDiagnostic[], depth = 0): void {
  if (depth > 20) return;
  if (isSecretReference(value)) return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanRawSecrets(item, `${pathName}[${index}]`, diagnostics, depth + 1));
    return;
  }
  if (isRecord(value)) {
    for (const [key, item] of Object.entries(value)) {
      const next = `${pathName}.${key}`;
      const allowedReferenceContainer = key === 'credentials' && isSecretReferenceMap(item);
      if (SECRET_KEY_PATTERN.test(key) && !/(ref|reference)$/i.test(key) && !isSecretReference(item) && !allowedReferenceContainer) {
        diagnostic(diagnostics, 'RAW_SECRET_FORBIDDEN', next, `raw secret field is forbidden: ${key}`, 'Replace the value with secretRef("atlas://credentials/<name>")');
      }
      scanRawSecrets(item, next, diagnostics, depth + 1);
    }
    return;
  }
  if (typeof value === 'string' && SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(value))) {
    diagnostic(diagnostics, 'RAW_SECRET_FORBIDDEN', pathName, 'raw credential material is forbidden in Atlas project configuration', 'Store the credential outside the project and use secretRef(...)');
  }
}

export function parseAtlasConfigSource(raw: string, kind: 'project' | 'environment' = 'project'): unknown {
  const functionName = kind === 'project' ? 'defineAtlasProject' : 'defineAtlasEnvironment';
  const marker = `export default ${functionName}(`;
  const start = raw.indexOf(marker);
  if (start < 0) {
    throw new AtlasCliError('LOCAL_STATE_ERROR', `Atlas configuration must use export default ${functionName}({...})`, {
      nextAction: `Restore the generated ${kind === 'project' ? 'atlas.config.ts' : 'environment overlay'} format`,
    });
  }
  const argumentStart = start + marker.length;
  const suffix = raw.slice(argumentStart).trimEnd();
  if (!suffix.endsWith(');')) {
    throw new AtlasCliError('LOCAL_STATE_ERROR', 'Atlas configuration wrapper is incomplete', {
      nextAction: 'Restore the closing ); in the Atlas configuration file',
    });
  }
  const argument = suffix.slice(0, -2).trim();
  try {
    return JSON.parse(argument);
  } catch {
    throw new AtlasCliError('LOCAL_STATE_ERROR', 'Atlas configuration must contain a JSON-compatible data object and cannot execute code', {
      nextAction: 'Use quoted keys and JSON values inside defineAtlasProject(...)',
    });
  }
}

function applyOverlay(config: AtlasProjectConfig, overlay: AtlasEnvironmentOverlay): AtlasProjectConfig {
  return deepFreeze({
    ...cloneJson(config),
    ...(overlay.runtime ? { runtime: cloneJson(overlay.runtime) } : {}),
    ...(overlay.model ? { model: cloneJson(overlay.model) } : {}),
    ...(overlay.channels ? { channels: cloneJson(overlay.channels) } : {}),
  });
}

async function collectPackageFiles(root: string, config: AtlasProjectConfig): Promise<string[]> {
  const references = [
    config.agent.instructions,
    config.agent.tools,
    config.agent.skills,
    config.agent.policies,
    config.agent.subagents,
    ...config.knowledge,
    ...config.channels,
    ...config.evals,
  ].filter((value): value is string => typeof value === 'string');
  const files = new Set<string>();
  for (const reference of references) await collectReference(root, reference, files);
  return [...files].sort((a, b) => a.localeCompare(b));
}

async function collectReference(root: string, reference: string, files: Set<string>): Promise<void> {
  if (!isSafeProjectPath(reference)) throw missingProjectPath(reference);
  const absolute = path.resolve(root, reference);
  if (!isInside(root, absolute)) throw missingProjectPath(reference);
  let stat;
  try {
    stat = await lstat(absolute);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw missingProjectPath(reference);
    throw error;
  }
  if (stat.isSymbolicLink()) {
    throw new AtlasCliError('LOCAL_STATE_ERROR', `Atlas package references cannot be symbolic links: ${reference}`, {
      nextAction: 'Replace the symbolic link with a project-owned file or directory',
    });
  }
  if (stat.isFile()) {
    files.add(toProjectRelative(root, absolute));
    return;
  }
  if (!stat.isDirectory()) throw missingProjectPath(reference);
  const entries = await readdir(absolute, { withFileTypes: true });
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.isSymbolicLink()) {
      throw new AtlasCliError('LOCAL_STATE_ERROR', `Atlas package directories cannot contain symbolic links: ${toProjectRelative(root, path.join(absolute, entry.name))}`, {
        nextAction: 'Replace the symbolic link with a project-owned file or directory',
      });
    }
    await collectReference(root, `./${toProjectRelative(root, path.join(absolute, entry.name))}`, files);
  }
}

function stripEnvironmentOnlyState(config: AtlasProjectConfig): AtlasProjectConfig {
  return cloneJson(config);
}

function isSecretReference(value: unknown): value is AtlasSecretReference {
  if (!isRecord(value)) return false;
  if (Object.keys(value).some((key) => !SECRET_FIELDS.has(key))) return false;
  return value.kind === 'atlas.secret-ref/v1' && typeof value.ref === 'string' && isSecretReferenceUri(value.ref);
}

function isSecretReferenceMap(value: unknown): boolean {
  return isRecord(value) && Object.values(value).every((item) => isSecretReference(item));
}

function isSecretReferenceUri(value: string): boolean {
  return /^atlas:\/\/credentials\/[a-zA-Z0-9][a-zA-Z0-9._/-]{0,199}$/.test(value);
}

function isSafeProjectPath(value: string): boolean {
  if (!value.startsWith('./') || value.includes('\\') || value.includes('\0')) return false;
  const segments = value.slice(2).split('/');
  if (segments.length === 0 || segments.some((segment) => segment === '' || segment === '.' || segment === '..')) return false;
  const normalized = path.posix.normalize(value.slice(2));
  return normalized !== '.' && !normalized.startsWith('../') && !path.posix.isAbsolute(normalized);
}

function isInside(root: string, candidate: string): boolean {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function toProjectRelative(root: string, target: string): string {
  return path.relative(root, target).split(path.sep).join('/');
}

function isHttpUrl(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function missingProjectPath(reference: string): AtlasCliError {
  return new AtlasCliError('LOCAL_STATE_ERROR', `Atlas project path is missing or unsupported: ${reference}`, {
    nextAction: `Restore ${reference} or update atlas.config.ts`,
  });
}

function validationError(diagnostics: readonly AtlasProjectDiagnostic[]): AtlasCliError {
  const first = diagnostics[0];
  return new AtlasCliError('LOCAL_STATE_ERROR', first ? `${first.path}: ${first.message}` : 'Atlas project validation failed', {
    nextAction: first?.next_action ?? 'Run atlas validate --json for diagnostics',
  });
}

function diagnostic(
  diagnostics: AtlasProjectDiagnostic[],
  code: AtlasProjectDiagnosticCode,
  pathName: string,
  message: string,
  nextAction: string,
): void {
  if (diagnostics.some((item) => item.code === code && item.path === pathName && item.message === message)) return;
  diagnostics.push({ code, path: pathName, message, next_action: nextAction });
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (isRecord(value)) {
    return `{${Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
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

function stringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' && value ? value : fallback;
}

function stringArrayOr(value: unknown, fallback: readonly string[]): string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string') ? [...value] : [...fallback];
}
