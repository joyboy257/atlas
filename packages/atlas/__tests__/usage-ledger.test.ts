import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ATLAS_USAGE_LEDGER_SCHEMA, AtlasUsageLedgerError, LocalUsageLedger } from '../src/usage-ledger.js';

const attribution = { tenantId: 'tenant-1', organisationId: 'org-1', projectId: 'project-1', environmentId: 'local', agentVersionId: 'agent-1', missionId: 'mission-1', actionId: 'action-1' } as const;
const roots: string[] = [];
async function fixture() { const root = await mkdtemp(path.join(os.tmpdir(), 'atlas-usage-ledger-')); roots.push(root); return { root, ledger: await LocalUsageLedger.open(root) }; }
const event = (overrides: Record<string, unknown> = {}) => ({ eventId: 'usage-1', attribution, kind: 'model' as const, unit: 'tokens', quantity: 10, usage: { inputTokens: 6, outputTokens: 4 }, cost: { amountMinor: 12, currency: 'USD', estimate: false, source: 'provider-receipt' }, providerReference: 'provider-1', occurredAt: '2026-07-31T12:00:00.000Z', recordedAt: '2026-07-31T12:00:01.000Z', ...overrides });
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

describe('LocalUsageLedger', () => {
  it('records idempotently and rejects conflicting event reuse', async () => { const { ledger } = await fixture(); const first = await ledger.record(event()); const replay = await ledger.record(event()); expect(first.replayed).toBe(false); expect(replay.replayed).toBe(true); await expect(ledger.record(event({ quantity: 11 }))).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' }); });
  it('separates estimates from settled and unsettled provider cost', async () => { const { ledger } = await fixture(); await ledger.record(event()); await ledger.record(event({ eventId: 'usage-estimate', cost: { amountMinor: 20, currency: 'USD', estimate: true, source: 'router' } })); const before = await ledger.summarize({ tenantId: 'tenant-1', missionId: 'mission-1' }); expect(before).toMatchObject({ eventCount: 2, quantity: 20, estimatedCostMinor: 20, settledCostMinor: 0, unsettledCostMinor: 12, currency: 'USD' }); const settled = await ledger.settle({ eventId: 'usage-1', providerReference: 'provider-1', amountMinor: 12, currency: 'USD', invoiceReference: 'invoice-1', settledAt: '2026-08-01T12:00:00.000Z' }); expect(settled.replayed).toBe(false); const replay = await ledger.settle({ ...settled.settlement }); expect(replay.replayed).toBe(true); expect(await ledger.summarize({ tenantId: 'tenant-1', missionId: 'mission-1' })).toMatchObject({ settledCostMinor: 12, unsettledCostMinor: 0 }); });
  it('does not combine incompatible usage units or currencies', async () => {
    const { ledger } = await fixture();
    await ledger.record(event());
    await ledger.record(event({ eventId: 'usage-calls', kind: 'provider', unit: 'calls', quantity: 2, cost: { amountMinor: 3, currency: 'EUR', estimate: false, source: 'provider-receipt' } }));
    const summary = await ledger.summarize({ tenantId: 'tenant-1', missionId: 'mission-1' });
    expect(summary.quantity).toBeNull();
    expect(summary.currency).toBeNull();
    expect(summary.groups).toEqual([
      expect.objectContaining({ kind: 'model', unit: 'tokens', currency: 'USD', quantity: 10 }),
      expect.objectContaining({ kind: 'provider', unit: 'calls', currency: 'EUR', quantity: 2 }),
    ]);
  });
  it('requires full attribution and rejects mismatched settlements', async () => { const { ledger } = await fixture(); await expect(ledger.record(event({ attribution: { tenantId: 'tenant-1' } }))).rejects.toMatchObject({ code: 'INVALID_EVENT' }); await ledger.record(event()); await expect(ledger.settle({ eventId: 'usage-1', providerReference: 'other', amountMinor: 12, currency: 'USD', invoiceReference: 'invoice-1', settledAt: '2026-08-01T12:00:00.000Z' })).rejects.toMatchObject({ code: 'INVALID_SETTLEMENT' }); await expect(ledger.settle({ eventId: 'usage-1', providerReference: 'provider-1', amountMinor: 11, currency: 'USD', invoiceReference: 'invoice-1', settledAt: '2026-08-01T12:00:00.000Z' })).rejects.toMatchObject({ code: 'INVALID_SETTLEMENT' }); await expect(ledger.settle({ eventId: 'missing', providerReference: 'provider', amountMinor: 1, currency: 'USD', invoiceReference: 'invoice', settledAt: '2026-08-01T12:00:00.000Z' })).rejects.toMatchObject({ code: 'NOT_FOUND' }); expect(AtlasUsageLedgerError).toBeDefined(); });
  it('rejects a second settlement identity for the same usage event', async () => { const { ledger } = await fixture(); await ledger.record(event()); await ledger.settle({ eventId: 'usage-1', providerReference: 'provider-1', amountMinor: 12, currency: 'USD', invoiceReference: 'invoice-1', settledAt: '2026-08-01T12:00:00.000Z' }); await expect(ledger.settle({ settlementId: 'settlement-other', eventId: 'usage-1', providerReference: 'provider-1', amountMinor: 12, currency: 'USD', invoiceReference: 'invoice-1', settledAt: '2026-08-01T12:00:00.000Z' })).rejects.toMatchObject({ code: 'INVALID_SETTLEMENT' }); });
  it('rejects malformed cost flags and corrupted persisted settlement state', async () => {
    const { root, ledger } = await fixture();
    await expect(ledger.record(event({ cost: { amountMinor: 1, currency: 'USD', estimate: 'no', source: 'fixture' } }))).rejects.toMatchObject({ code: 'INVALID_EVENT' });
    const validEvent = { ...event(), schemaVersion: ATLAS_USAGE_LEDGER_SCHEMA };
    const settlement = { settlementId: 'settlement-1', eventId: 'usage-1', providerReference: 'provider-1', amountMinor: 12, currency: 'USD', invoiceReference: 'invoice-1', settledAt: '2026-08-01T12:00:00.000Z' };
    await writeFile(path.join(root, '.atlas', 'usage-ledger.json'), JSON.stringify({ schemaVersion: ATLAS_USAGE_LEDGER_SCHEMA, events: [validEvent], settlements: [{ ...settlement, eventId: 'missing' }] }));
    await expect(ledger.readState()).rejects.toMatchObject({ code: 'INVALID_STATE' });
  });
});
