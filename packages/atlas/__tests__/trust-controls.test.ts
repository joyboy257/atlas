import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ATLAS_AUDIT_SCHEMA, LocalAuditLedger, redactSecrets } from '../src/trust-controls.js';
import { projectMissionEvent } from '../src/public-projections.js';

const scope = { tenantId: 'tenant-1', organisationId: 'org-1', projectId: 'project-1', environmentId: 'local' } as const;
const roots: string[] = [];
async function fixture() { const root = await mkdtemp(path.join(os.tmpdir(), 'atlas-trust-controls-')); roots.push(root); return { ledger: await LocalAuditLedger.open(root) }; }
const event = (overrides: Record<string, unknown> = {}) => ({ eventId: 'audit-1', scope, actor: { type: 'human' as const, id: 'operator-1' }, action: 'mission.pause', target: { type: 'mission', id: 'mission-1' }, policyVersion: 'policy-v1', dataClass: 'audit' as const, correlationId: 'corr-1', occurredAt: '2026-07-31T12:00:00.000Z', ...overrides });
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

describe('LocalAuditLedger', () => {
  it('redacts secret-shaped fields, chains events, and supports idempotent append', async () => { const { ledger } = await fixture(); const first = await ledger.append({ ...event(), beforeDigest: 'before', afterDigest: 'after', metadata: { apiToken: 'do-not-persist' } } as never); const replay = await ledger.append({ ...event(), beforeDigest: 'before', afterDigest: 'after', metadata: { apiToken: 'do-not-persist' } } as never); expect(replay.replayed).toBe(true); expect(first.event.digest).toBeTruthy(); expect(first.event.previousDigest).toBeNull(); expect(JSON.stringify(first.event)).not.toContain('do-not-persist'); const second = await ledger.append(event({ eventId: 'audit-2', correlationId: 'corr-2' })); expect(second.event.previousDigest).toBe(first.event.digest); expect((await ledger.export(scope)).chainValid).toBe(true); });
  it('filters exports by exact scope and detects conflicting replay', async () => { const { ledger } = await fixture(); await ledger.append(event()); await ledger.append(event({ eventId: 'audit-2', scope: { ...scope, environmentId: 'test' } })); expect((await ledger.export(scope)).events).toHaveLength(1); expect((await ledger.export(scope)).chainValid).toBe(true); await expect(ledger.append(event({ action: 'mission.cancel' }))).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' }); });
  it('makes scoped exports independently chain-verifiable', async () => {
    const { ledger } = await fixture();
    await ledger.append(event({ eventId: 'audit-a1' }));
    await ledger.append(event({ eventId: 'audit-b1', scope: { ...scope, environmentId: 'test' } }));
    await ledger.append(event({ eventId: 'audit-a2', correlationId: 'corr-a2' }));
    const exported = await ledger.export(scope);
    expect(exported.chainValid).toBe(true);
    let previous: string | null = null;
    for (const item of exported.events) {
      expect(item.previousDigest).toBe(previous);
      expect(item.digest).toBeTruthy();
      previous = item.digest;
    }
  });
  it('redacts nested secret material before persistence', () => { expect(redactSecrets({ password: 'x', nested: { authorization: 'y', keep: 'z' } })).toEqual({ password: '[REDACTED]', nested: { authorization: '[REDACTED]', keep: 'z' } }); });
  it('rejects non-string digest inputs and corrupted persisted audit state', async () => {
    const { ledger } = await fixture();
    await expect(ledger.append(event({ beforeDigest: 42 }) as never)).rejects.toMatchObject({ code: 'INVALID_EVENT' });
    const valid = await ledger.append(event({ eventId: 'audit-valid' }));
    await writeFile(ledger.filePath, JSON.stringify({ schemaVersion: ATLAS_AUDIT_SCHEMA, events: [{ ...valid.event, afterDigest: { digest: 'not-a-string' } }] }));
    await expect(ledger.readState()).rejects.toMatchObject({ code: 'INVALID_EVENT' });
  });
});
