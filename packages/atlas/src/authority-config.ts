import { AtlasCliError } from './errors.js';

export type AtlasAuthorityBackend = 'database' | 'queue' | 'secret-manager' | 'memory' | 'test' | 'fixture';

export type AtlasAuthorityConfig = Readonly<{
  identity: AtlasAuthorityBackend;
  missions: AtlasAuthorityBackend;
  policy: AtlasAuthorityBackend;
  approvals: AtlasAuthorityBackend;
  actions: AtlasAuthorityBackend;
  outbox: AtlasAuthorityBackend;
  receipts: AtlasAuthorityBackend;
  usage: AtlasAuthorityBackend;
  credentials: AtlasAuthorityBackend;
}>;

const REQUIRED_AUTHORITIES = [
  'identity',
  'missions',
  'policy',
  'approvals',
  'actions',
  'outbox',
  'receipts',
  'usage',
  'credentials',
] as const satisfies readonly (keyof AtlasAuthorityConfig)[];

const UNSAFE_BACKENDS = new Set<AtlasAuthorityBackend>(['memory', 'test', 'fixture']);
const DURABLE_BACKENDS = new Set<AtlasAuthorityBackend>(['database', 'queue', 'secret-manager']);

export function validateAuthorityConfig(
  environment: string,
  value: unknown,
  options: { hosted?: boolean } = {},
): { valid: boolean; errors: string[]; authorities?: AtlasAuthorityConfig } {
  const hosted = options.hosted ?? !new Set(['sandbox', 'local', 'development']).has(environment.toLowerCase());
  const errors: string[] = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { valid: false, errors: ['authority configuration must be an object'] };
  }

  const input = value as Record<string, unknown>;
  const unknownKeys = Object.keys(input).filter((key) => !(REQUIRED_AUTHORITIES as readonly string[]).includes(key));
  if (unknownKeys.length > 0) errors.push(`unknown authority keys: ${unknownKeys.join(', ')}`);
  const authorities = {} as Record<keyof AtlasAuthorityConfig, AtlasAuthorityBackend>;
  for (const name of REQUIRED_AUTHORITIES) {
    const backend = input[name];
    if (typeof backend !== 'string' || !DURABLE_BACKENDS.has(backend as AtlasAuthorityBackend) && !UNSAFE_BACKENDS.has(backend as AtlasAuthorityBackend)) {
      errors.push(`authority ${name} must use a supported backend`);
      continue;
    }
    authorities[name] = backend as AtlasAuthorityBackend;
    if (hosted && UNSAFE_BACKENDS.has(authorities[name])) {
      errors.push(`unsafe authority backend for ${environment}: ${name}=${authorities[name]}`);
    }
  }

  for (const [name, backend] of Object.entries(authorities)) {
    if (name === 'credentials' && backend !== 'secret-manager' && hosted) {
      errors.push('credentials authority must use secret-manager in hosted environments');
    }
    if (name !== 'credentials' && backend === 'secret-manager') {
      errors.push(`secret-manager is not a valid ${name} authority`);
    }
  }

  return errors.length === 0
    ? { valid: true, errors, authorities: authorities as AtlasAuthorityConfig }
    : { valid: false, errors };
}

export function assertHostedAuthorityConfig(environment: string, value: unknown): AtlasAuthorityConfig {
  const result = validateAuthorityConfig(environment, value, { hosted: true });
  if (!result.valid) {
    throw new AtlasCliError(
      'UNSAFE_AUTHORITY_CONFIGURATION',
      `Unsafe authority configuration for ${environment}: ${result.errors.join('; ')}`,
      { nextAction: 'Configure durable database, queue and secret-manager authorities before starting a hosted environment' },
    );
  }
  return result.authorities!;
}
