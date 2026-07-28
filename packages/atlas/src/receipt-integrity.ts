import { createHash } from 'node:crypto';
import { AtlasCliError } from './errors.js';
import type { ExecutionReceipt } from './platform-client.js';

export function verifyReceipt(receipt: ExecutionReceipt) {
  if (receipt.schema_version !== 'atlas.receipt/v1') throw new AtlasCliError('LOCAL_STATE_ERROR', 'Unsupported receipt schema version');
  const integrity = receipt.integrity as { digest?: unknown; issuer?: unknown } | undefined;
  if (!integrity || typeof integrity.digest !== 'string' || !/^sha256:[a-f0-9]{64}$/.test(integrity.digest)) throw new AtlasCliError('LOCAL_STATE_ERROR', 'Receipt integrity metadata is invalid');
  const { integrity: _, ...unsigned } = receipt;
  const expected = `sha256:${createHash('sha256').update(stableJson(unsigned)).digest('hex')}`;
  return { digest_valid: expected === integrity.digest, expected_digest: expected, receipt_digest: integrity.digest, issuer: integrity.issuer ?? null, authenticity_verified: false };
}
function stableJson(value: unknown): string { if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`; if (value && typeof value === 'object') return `{${Object.entries(value as Record<string, unknown>).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => `${JSON.stringify(k)}:${stableJson(v)}`).join(',')}}`; return JSON.stringify(value); }
