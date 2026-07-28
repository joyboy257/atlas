import { AtlasCliError } from '../errors.js';
import type { CredentialRecord } from '../credentials/types.js';
import { normalizeApiBase, normalizeVerificationUrl } from '../urls.js';

export type DeviceCode = Readonly<{ device_code: string; user_code: string; verification_url: string; interval: number; expires_at: number }>;

export class DeviceFlowClient {
  private readonly apiBase: string;
  constructor(options: { apiBase: string; fetchImpl?: typeof fetch }) {
    this.apiBase = normalizeApiBase(options.apiBase);
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
  }
  private readonly fetchImpl: typeof fetch;

  async requestCode(clientId: string, scopes: readonly string[]): Promise<DeviceCode> {
    const response = await fetchWithNetworkErrors(this.fetchImpl, `${this.apiBase}/atlas/v1/auth/device/code`, {
      method: 'POST', headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, scope: scopes }),
    });
    if (!response.ok) throw await remoteAuthError(response, 'Could not start device authorization');
    return parseDeviceCode(await readJson(response));
  }

  async poll(code: DeviceCode, clientId: string, options: { signal?: AbortSignal; wait?: (ms: number) => Promise<void> } = {}): Promise<CredentialRecord> {
    const wait = options.wait ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    while (Date.now() < code.expires_at) {
      if (options.signal?.aborted) throw new AtlasCliError('AUTHENTICATION_FAILED', 'Login cancelled');
      const response = await fetchWithNetworkErrors(this.fetchImpl, `${this.apiBase}/atlas/v1/auth/device/token`, {
        method: 'POST', headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify({ device_code: code.device_code, client_id: clientId }), signal: options.signal,
      });
      if (!response.ok) throw await remoteAuthError(response, 'Device authorization failed');
      const body = await readJson(response);
      if (typeof body.access_token === 'string') return parseToken(body, this.apiBase);
      if (body.error !== 'AUTHORIZATION_PENDING' && body.error !== 'SLOW_DOWN') throw new AtlasCliError('AUTHENTICATION_FAILED', body.error ?? 'Device authorization failed');
      const retrySeconds = finiteInteger(body.retry_after_seconds, code.interval, 1, 30, 'retry_after_seconds');
      await wait(retrySeconds * 1000);
    }
    throw new AtlasCliError('AUTHENTICATION_FAILED', 'Device authorization expired', { nextAction: 'Run atlas login again' });
  }
}

async function remoteAuthError(response: Response, fallback: string): Promise<AtlasCliError> {
  const body = await readJson(response).catch(() => ({})) as Record<string, any>;
  return new AtlasCliError('AUTHENTICATION_FAILED', body.error?.message ?? body.message ?? `${fallback}: HTTP ${response.status}`, { retryable: response.status >= 500 });
}

function parseDeviceCode(value: Record<string, any>): DeviceCode {
  if (typeof value.device_code !== 'string' || value.device_code.length < 16) throw malformed('device_code');
  if (typeof value.user_code !== 'string' || value.user_code.length < 4) throw malformed('user_code');
  const expiresAt = finiteInteger(value.expires_at, 0, Date.now() + 1, Date.now() + 15 * 60_000, 'expires_at');
  return {
    device_code: value.device_code,
    user_code: value.user_code,
    verification_url: remoteVerificationUrl(value.verification_url),
    interval: finiteInteger(value.interval, 5, 1, 30, 'interval'),
    expires_at: expiresAt,
  };
}

function parseToken(value: Record<string, any>, apiBase: string): CredentialRecord {
  if (typeof value.access_token !== 'string' || value.access_token.length < 16) throw malformed('access_token');
  if (value.token_type !== 'Bearer') throw malformed('token_type');
  const expiresIn = finiteInteger(value.expires_in, 3600, 60, 86_400, 'expires_in');
  if (typeof value.scope !== 'string') throw malformed('scope');
  const scopes = value.scope.split(' ').filter(Boolean);
  if (scopes.some((scope: string) => !/^[a-z][a-z0-9._:-]{1,119}$/.test(scope))) throw malformed('scope');
  return { accessToken: value.access_token, tokenType: 'Bearer', apiBase, expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(), scopes };
}

async function readJson(response: Response): Promise<Record<string, any>> {
  try {
    const value = await response.json();
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('not an object');
    return value as Record<string, any>;
  } catch {
    throw new AtlasCliError('REMOTE_ERROR', 'Atlas returned an invalid JSON response');
  }
}

function finiteInteger(value: unknown, fallback: number, min: number, max: number, field: string): number {
  const resolved = value === undefined ? fallback : value;
  if (!Number.isInteger(resolved) || Number(resolved) < min || Number(resolved) > max) throw malformed(field);
  return Number(resolved);
}

function malformed(field: string): AtlasCliError {
  return new AtlasCliError('REMOTE_ERROR', `Atlas returned an invalid ${field}`);
}

function remoteVerificationUrl(value: unknown): string {
  try { return normalizeVerificationUrl(String(value ?? '')); }
  catch { throw malformed('verification_url'); }
}

async function fetchWithNetworkErrors(fetchImpl: typeof fetch, input: string, init: RequestInit): Promise<Response> {
  const timeout = AbortSignal.timeout(15_000);
  const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  try { return await fetchImpl(input, { ...init, signal }); }
  catch (error) {
    if (error instanceof AtlasCliError) throw error;
    throw new AtlasCliError('NETWORK_ERROR', error instanceof Error ? error.message : 'Atlas network request failed', { retryable: true });
  }
}
