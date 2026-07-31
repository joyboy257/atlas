import path from 'node:path';
import { parse } from 'yaml';
import { readUtf8Safe, sha256 } from './fs-safety.js';
import { AtlasCliError } from './errors.js';
import { assertHostedAuthorityConfig, validateAuthorityConfig } from './authority-config.js';

const HOSTED_ENVIRONMENTS = new Set(['staging', 'production', 'custom']);
const LOCAL_ENVIRONMENTS = new Set(['sandbox', 'local', 'development']);

type DeploymentValidationOptions = Readonly<{
  targetEnvironmentSlug?: string;
  targetEnvironmentType?: string;
}>;

export async function validateAtlasConfig(root: string, file = 'atlas.yaml', options: DeploymentValidationOptions = {}) {
  const filePath = path.resolve(root, file);
  const raw = await readUtf8Safe(filePath);
  if (raw === null) {
    throw new AtlasCliError('LOCAL_STATE_ERROR', `Atlas configuration not found: ${filePath}`);
  }

  let value: unknown;
  try {
    value = parse(raw);
  } catch {
    throw new AtlasCliError('LOCAL_STATE_ERROR', 'atlas.yaml is not valid YAML');
  }

  const errors: string[] = [];
  const authorityErrors: string[] = [];
  const config = value as Record<string, unknown>;
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    errors.push('configuration must be an object');
  }
  if (config?.apiVersion !== 'atlas.mirai/v1') errors.push('apiVersion must be atlas.mirai/v1');
  if (config?.kind !== 'Project') errors.push('kind must be Project');

  const metadata = config?.metadata as Record<string, unknown> | undefined;
  if (typeof metadata?.name !== 'string' || !metadata.name) errors.push('metadata.name is required');

  const spec = config?.spec as Record<string, unknown> | undefined;
  if (typeof spec?.projectId !== 'string' || !spec.projectId) errors.push('spec.projectId is required');
  if (!spec?.environments || typeof spec.environments !== 'object' || Array.isArray(spec.environments)) {
    errors.push('spec.environments must be an object');
  } else {
    validateEnvironmentAuthorities(spec.environments as Record<string, unknown>, errors, authorityErrors, options);
  }

  if (Buffer.byteLength(raw, 'utf8') > 256_000) errors.push('configuration exceeds 256KB');
  scanForSecrets(value, '', 0, errors);

  return {
    valid: errors.length === 0,
    errors,
    file_path: filePath,
    config_digest: sha256(stableJson(value)),
    config: value,
    authorityErrors,
  };
}

export async function planDeployment(root: string, file = 'atlas.yaml', options: DeploymentValidationOptions = {}) {
  const validation = await validateAtlasConfig(root, file, options);
  if (!validation.valid && options.targetEnvironmentSlug && validation.authorityErrors.length > 0) {
    throw new AtlasCliError(
      'UNSAFE_AUTHORITY_CONFIGURATION',
      `Unsafe authority configuration: ${validation.errors.join('; ')}`,
      { nextAction: 'Configure durable authority owners before deploying a hosted environment' },
    );
  }
  if (validation.valid && options.targetEnvironmentSlug) {
    const target = (validation.config as Record<string, unknown>)?.spec as Record<string, unknown> | undefined;
    const environments = target?.environments as Record<string, unknown> | undefined;
    const targetConfig = environments?.[options.targetEnvironmentSlug] as Record<string, unknown> | undefined;
    const targetType = options.targetEnvironmentType ?? (targetConfig?.environment_type as string | undefined) ?? (targetConfig?.environmentType as string | undefined);
    if (!targetConfig && !targetType) {
      throw new AtlasCliError('UNSAFE_AUTHORITY_CONFIGURATION', `Cannot determine authority posture for target environment ${options.targetEnvironmentSlug}`, { nextAction: 'Resolve the target environment type before deployment' });
    }
    const hosted = targetType ? HOSTED_ENVIRONMENTS.has(targetType.toLowerCase()) : !LOCAL_ENVIRONMENTS.has(options.targetEnvironmentSlug.toLowerCase());
    if (hosted) assertHostedAuthorityConfig(options.targetEnvironmentSlug, targetConfig?.authorities);
  }
  return {
    ...validation,
    actions: validation.valid
      ? [
          { type: 'create_immutable_revision', digest: validation.config_digest },
          { type: 'deploy_environment_revision', requires_explicit_apply: true },
        ]
      : [],
    destructive: false,
  };
}

function validateEnvironmentAuthorities(environments: Record<string, unknown>, errors: string[], authorityErrors: string[], options: DeploymentValidationOptions): void {
  for (const [environment, rawEnvironment] of Object.entries(environments)) {
    if (!rawEnvironment || typeof rawEnvironment !== 'object' || Array.isArray(rawEnvironment)) {
      errors.push(`environment ${environment} must be an object`);
      continue;
    }

    const environmentConfig = rawEnvironment as Record<string, unknown>;
    const authorities = environmentConfig.authorities;
    const declaredType = environmentConfig.environment_type ?? environmentConfig.environmentType ?? environmentConfig.type;
    const isTarget = options.targetEnvironmentSlug === environment;
    const targetType = isTarget ? options.targetEnvironmentType : undefined;
    const effectiveType = typeof (targetType ?? declaredType) === 'string' ? String(targetType ?? declaredType) : undefined;
    const hosted = isTarget
      ? (effectiveType ? HOSTED_ENVIRONMENTS.has(effectiveType.toLowerCase()) : !LOCAL_ENVIRONMENTS.has(String(environment).toLowerCase()))
      : (HOSTED_ENVIRONMENTS.has(String(environment).toLowerCase()) || (effectiveType !== undefined && HOSTED_ENVIRONMENTS.has(effectiveType.toLowerCase())));
    if (!hosted) {
      if (authorities !== undefined) {
        const result = validateAuthorityConfig(environment, authorities, { hosted: false });
        const messages = result.errors.map((error) => `${environment}: ${error}`);
        errors.push(...messages);
      }
      continue;
    }

    if (authorities === undefined) {
      const message = `environment ${environment} must declare authorities before hosted startup`;
      errors.push(message);
      if (isTarget) authorityErrors.push(message);
      continue;
    }
    const result = validateAuthorityConfig(environment, authorities, { hosted: true });
    const messages = result.errors.map((error) => `${environment}: ${error}`);
    errors.push(...messages);
    if (isTarget) authorityErrors.push(...messages);
  }
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function scanForSecrets(value: unknown, pathName: string, depth: number, errors: string[]): void {
  if (depth > 12) {
    errors.push(`configuration depth exceeds 12 at ${pathName || 'root'}`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanForSecrets(item, `${pathName}[${index}]`, depth + 1, errors));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      const next = pathName ? `${pathName}.${key}` : key;
      if (/(password|secret|access[_-]?token|refresh[_-]?token|private[_-]?key|api[_-]?key)/i.test(key) && !/(ref|reference)$/i.test(key)) {
        errors.push(`inline secret field is forbidden: ${next}`);
      }
      scanForSecrets(item, next, depth + 1, errors);
    }
    return;
  }
  if (typeof value === 'string' && (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(value) || /^Bearer\s+/i.test(value) || /^(sk|pk)_(live|test)_/i.test(value))) {
    errors.push(`inline credential material is forbidden: ${pathName}`);
  }
}
