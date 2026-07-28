import { AtlasCliError } from './errors.js';

export function normalizeApiBase(value: string): string {
  const url = parseSafeHttpUrl(value, 'API base');
  if (url.pathname !== '/' || url.search) throw new AtlasCliError('USAGE_ERROR', 'API base must not include a path or query');
  return url.origin;
}

export function normalizeVerificationUrl(value: string): string {
  return parseSafeHttpUrl(value, 'verification URL').toString();
}

function parseSafeHttpUrl(value: string, label: string): URL {
  let url: URL;
  try { url = new URL(value); }
  catch { throw new AtlasCliError('USAGE_ERROR', `Invalid ${label}`); }
  if (url.username || url.password || url.hash) throw new AtlasCliError('USAGE_ERROR', `${label} must not include credentials or a fragment`);
  const loopback = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]';
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) {
    throw new AtlasCliError('USAGE_ERROR', `${label} must use HTTPS (HTTP is allowed only for loopback development)`);
  }
  return url;
}
