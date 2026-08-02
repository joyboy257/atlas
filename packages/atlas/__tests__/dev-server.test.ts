import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { request } from 'node:http';
import { postWebhookFixture, startAtlasDevServer, type AtlasDevServer } from '../src/dev-server.js';
import { AtlasLocalMissionCoordinator } from '../src/mission-coordinator.js';
import { AtlasLocalRuntime } from '../src/local-runtime.js';
import { scaffoldAtlasProject, type AtlasScaffoldDependencies } from '../src/scaffold.js';

describe('Atlas deterministic dev server', () => {
  let server: AtlasDevServer | undefined;
  const roots: string[] = [];
  afterEach(async () => {
    await server?.close();
    server = undefined;
    await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
  });

  const dependencies = (): AtlasScaffoldDependencies => ({
    runCommand: vi.fn().mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' }),
    inspectGit: vi.fn().mockResolvedValue({ available: true, repository: false, dirty: false, root: null }),
  });

  const project = async () => {
    const base = await mkdtemp(path.join(os.tmpdir(), 'atlas-dev-server-project-'));
    roots.push(base);
    await scaffoldAtlasProject({ cwd: base, target: 'front-desk', install: false, initializeGit: false, nodeVersion: 'v22.12.0' }, dependencies());
    return path.join(base, 'front-desk');
  };

  it('serves deterministic MCP discovery and a canonical tool fixture', async () => {
    server = await startAtlasDevServer();
    const initialize = await fetch(`${server.url}/mcp`, { method: 'POST', body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize' }) }).then((response) => response.json());
    const tools = await fetch(`${server.url}/mcp`, { method: 'POST', body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }) }).then((response) => response.json());
    expect(initialize.result.protocolVersion).toBe('2025-03-26');
    expect(tools.result.tools[0].name).toBe('mirai.atlas/knowledge.search@1');
  });

  it('captures deterministic webhook fixtures and exposes them for inspection', async () => {
    server = await startAtlasDevServer();
    await postWebhookFixture(`${server.url}/webhooks`, 'atlas.execution.completed', { run_id: 'run_fixture' });
    const result = await fetch(`${server.url}/events`).then((response) => response.json());
    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toMatchObject({
      id: 'evt_atlas_dev_001',
      type: 'atlas.execution.completed',
      created_at: '2026-07-13T00:00:00.000Z',
      sequence: 1,
      data_keys: ['run_id'],
    });
    expect(result.events[0]).not.toHaveProperty('data');
    expect(JSON.stringify(result)).not.toContain('run_fixture');
  });

  it('durably routes project webhooks through the Mission coordinator', async () => {
    server = await startAtlasDevServer({ projectRoot: await project() });
    const event = { id: 'webhook-project-001', type: 'booking.updated', created_at: '2026-07-24T08:00:00.000Z', data: { booking_id: 'BK-100' } };
    const first = await fetch(`${server.url}/webhooks`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(event) }).then((response) => response.json());
    const replay = await fetch(`${server.url}/webhooks`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(event) }).then((response) => response.json());
    expect(first).toMatchObject({ ok: true, durable: true, trigger: { trigger_id: 'webhook-project-001', status: 'APPLIED', replayed: false } });
    expect(replay).toMatchObject({ ok: true, durable: true, trigger: { trigger_id: 'webhook-project-001', status: 'APPLIED', replayed: true } });
    expect(JSON.stringify(first)).not.toContain('BK-100');
  });

  it('supports deterministic failure injection', async () => {
    server = await startAtlasDevServer({ failFirst: 1 });
    expect((await fetch(`${server.url}/health`)).status).toBe(503);
    expect((await fetch(`${server.url}/health`)).status).toBe(200);
  });

  it('forwards captured webhook fixtures and reports the target status', async () => {
    const forwarded: unknown[] = [];
    server = await startAtlasDevServer({
      webhookForwardUrl: 'https://listener.example.test/atlas',
      fetchImpl: async (_url, init) => { forwarded.push(JSON.parse(String(init?.body))); return new Response(null, { status: 204 }); },
    });
    const result = await postWebhookFixture(`${server.url}/webhooks`, 'atlas.execution.completed', { run_id: 'run_forwarded' });
    expect(result.response).toMatchObject({ forwarded: true, forward_status: 204 });
    expect(forwarded).toHaveLength(1);
  });

  it('refuses non-loopback binding for the mutable local workbench', async () => {
    await expect(startAtlasDevServer({ host: '0.0.0.0', projectRoot: await project() })).rejects.toThrow(/loopback/i);
  });

  it('allows non-loopback binding only for the explicit sandbox deployment mode', async () => {
    server = await startAtlasDevServer({ host: '0.0.0.0', deployment: 'sandbox' });
    await expect(fetch(`${server.url.replace('0.0.0.0', '127.0.0.1')}/health`)).resolves.toMatchObject({ status: 200 });
  });

  it('rejects hostile host and browser-origin requests before local mutation', async () => {
    server = await startAtlasDevServer({ projectRoot: await project() });
    const message = {
      message_id: 'msg_hostile', conversation_id: 'conv_hostile', customer_id: 'cust_hostile', channel_id: 'local-web-chat',
      sequence: 1, occurred_at: '2026-07-24T08:00:00.000Z', text: 'Can I move booking BK-100 to Friday?',
      consent: true, within_messaging_window: true,
    };
    const hostileHost = await rawPost(`${server.url}/api/messages/inbound`, { host: 'evil.example' }, message);
    const hostileOrigin = await fetch(`${server.url}/api/messages/inbound`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://evil.example' },
      body: JSON.stringify(message),
    });
    const state = await fetch(`${server.url}/api/state`).then((response) => response.json());

    expect(hostileHost.status).toBe(421);
    expect(hostileOrigin.status).toBe(403);
    expect(state.data.messages).toHaveLength(0);
    expect(state.data.actions).toHaveLength(0);
  });

  it('serves a one-screen developer workbench from the governed project', async () => {
    server = await startAtlasDevServer({ projectRoot: await project() });
    const response = await fetch(`${server.url}/`);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
    expect(response.headers.get('content-security-policy')).toContain("default-src 'self'");
    expect(html).toContain('Atlas Front Desk Workbench');
    expect(html).toContain('id="customer-conversation"');
    expect(html).toContain('id="retrieved-evidence"');
    expect(html).toContain('id="tool-proposal"');
    expect(html).toContain('id="policy-decision"');
    expect(html).toContain('id="approval-state"');
    expect(html).toContain('id="handoff-state"');
    expect(html).toContain('id="delivery-state"');
    expect(html).toContain('id="business-outcome"');
    expect(html).toContain('id="trace-events"');
    expect(html).toContain('id="receipt-chain"');
    expect(html).toContain('id="next-action"');
    expect(html).toContain('/api/messages/inbound');
    expect(html).toContain('/api/approvals/');
    expect(html).toContain('/api/outbox/');
    expect(html).not.toContain('curl ');
  });

  it('exposes the governed local First Agent Loop through one HTTP surface', async () => {
    server = await startAtlasDevServer({ projectRoot: await project() });
    const inbound = await fetch(`${server.url}/api/messages/inbound`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        message_id: 'msg_001', conversation_id: 'conv_001', customer_id: 'cust_001', channel_id: 'local-web-chat',
        sequence: 1, occurred_at: '2026-07-24T08:00:00.000Z', text: 'Can I move booking BK-100 to Friday?',
        consent: true, within_messaging_window: true,
      }),
    }).then((response) => response.json());
    expect(inbound).toMatchObject({ ok: true, data: { status: 'approval_pending' } });

    const approved = await fetch(`${server.url}/api/approvals/${inbound.data.approval.id}/decision`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ decision: 'approved', operator_id: 'operator_001' }),
    }).then((response) => response.json());
    expect(approved).toMatchObject({ ok: true, data: { status: 'committed' } });

    const delivered = await fetch(`${server.url}/api/outbox/${approved.data.outbox.id}/attempt`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ outcome: 'delivered', provider_message_id: 'provider_001' }),
    }).then((response) => response.json());
    expect(delivered).toMatchObject({ ok: true, data: { delivery: { state: 'delivered' } } });

    const state = await fetch(`${server.url}/api/state`).then((response) => response.json());
    const trace = await fetch(`${server.url}/api/traces/${inbound.data.trace_id}`).then((response) => response.json());
    const receipts = await fetch(`${server.url}/api/receipts`).then((response) => response.json());
    expect(state.data.actions).toHaveLength(1);
    expect(state.data.outbox[0].state).toBe('delivered');
    expect(trace.data.events.map((event: { type: string }) => event.type)).toEqual(expect.arrayContaining(['knowledge.retrieved', 'action.committed', 'delivery.delivered']));
    expect(receipts.data.map((receipt: { kind: string }) => receipt.kind)).toEqual(expect.arrayContaining(['evidence', 'approval', 'action', 'delivery']));
  });

  it('redacts raw customer and operational payloads from HTTP projections', async () => {
    server = await startAtlasDevServer({ projectRoot: await project() });
    const inbound = await fetch(`${server.url}/api/messages/inbound`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        message_id: 'msg_redaction', conversation_id: 'conv_redaction', customer_id: 'cust_redaction', channel_id: 'local-web-chat',
        sequence: 1, occurred_at: '2026-07-24T08:00:00.000Z', text: 'Can I move booking BK-100 to Friday?', consent: true, within_messaging_window: true,
      }),
    }).then((response) => response.json());

    const state = await fetch(`${server.url}/api/state`).then((response) => response.json());
    const trace = await fetch(`${server.url}/api/traces/${inbound.data.trace_id}`).then((response) => response.json());
    const receipts = await fetch(`${server.url}/api/receipts`).then((response) => response.json());
    const responseText = JSON.stringify({ inbound, state, trace, receipts });

    expect(responseText).not.toContain('Can I move booking BK-100 to Friday?');
    expect(JSON.stringify(state.data)).not.toContain('"goal"');
    expect(JSON.stringify(state.data)).not.toContain('"body"');
    expect(JSON.stringify(state.data)).not.toContain('"input"');
    expect(state.data.messages[0]).not.toHaveProperty('text');
    expect(state.data.traces[0].events[0]).not.toHaveProperty('data');
    expect(receipts.data[0]).not.toHaveProperty('data');
  });

  it('runs simulator scenarios through Mission coordinator authority', async () => {
    const projectRoot = await project();
    server = await startAtlasDevServer({ projectRoot });
    const inbound = await fetch(`${server.url}/api/messages/inbound`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        message_id: 'msg_cancelled', conversation_id: 'conv_cancelled', customer_id: 'cust_cancelled', channel_id: 'local-web-chat',
        sequence: 1, occurred_at: '2026-07-24T08:00:00.000Z', text: 'Can I move booking BK-100 to Friday?', consent: true, within_messaging_window: true,
      }),
    }).then((response) => response.json());
    const runtime = await AtlasLocalRuntime.open({ root: projectRoot });
    const identity = runtime.snapshot().identity;
    const coordinator = await AtlasLocalMissionCoordinator.open({ root: projectRoot, scope: {
      tenantId: identity.tenant_id, organisationId: `local-org-${identity.project_hash.slice(0, 16)}`, projectId: identity.project_hash, environmentId: 'local',
    } });
    const missionId = inbound.data.missionId ?? inbound.data.mission_id;
    const cancelled = await coordinator.cancel(missionId, 'operator_cancel', 'test cancellation');
    expect(cancelled.mission.spec.state).toBe('CANCELLED');

    const scenario = await fetch(`${server.url}/api/simulator/scenarios`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: 'http_cancelled', events: [
        { type: 'inbound', capture_as: 'turn', message: {
          message_id: 'msg_cancelled', conversation_id: 'conv_cancelled', customer_id: 'cust_cancelled', channel_id: 'local-web-chat', sequence: 1,
          occurred_at: '2026-07-24T08:00:00.000Z', text: 'Can I move booking BK-100 to Friday?', consent: true, within_messaging_window: true,
        } },
        { type: 'approve', approval_from: 'turn', operator_id: 'operator_after_cancel', capture_as: 'commit' },
      ] }),
    }).then(async (response) => ({ status: response.status, body: await response.json() }));
    expect(scenario.status).toBe(409);
    expect(scenario.body).toMatchObject({ ok: false, error: { code: 'CONFLICT' } });
  });

  it('runs simulator scenarios through the same local authority', async () => {
    server = await startAtlasDevServer({ projectRoot: await project() });
    const scenario = await fetch(`${server.url}/api/simulator/scenarios`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: 'http_success',
        events: [
          { type: 'inbound', capture_as: 'turn', message: {
            message_id: 'msg_001', conversation_id: 'conv_001', customer_id: 'cust_001', channel_id: 'local-web-chat',
            sequence: 1, occurred_at: '2026-07-24T08:00:00.000Z', text: 'Can I move booking BK-100 to Friday?',
            consent: true, within_messaging_window: true,
          } },
          { type: 'approve', approval_from: 'turn', operator_id: 'operator_001', capture_as: 'commit' },
          { type: 'deliver', outbox_from: 'commit', outcome: 'delivered', provider_message_id: 'provider_001', capture_as: 'delivery' },
        ],
      }),
    }).then((response) => response.json());

    expect(scenario).toMatchObject({ ok: true, data: { status: 'passed' } });
    expect(scenario.data.final_state.actions).toHaveLength(1);
    expect(scenario.data.final_state.outbox[0].state).toBe('delivered');
  });
});

async function rawPost(urlValue: string, headers: Record<string, string>, body: Record<string, unknown>): Promise<{ status: number; body: unknown }> {
  const url = new URL(urlValue);
  const payload = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const req = request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload), ...headers },
    }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve({ status: res.statusCode ?? 0, body: raw ? JSON.parse(raw) : null });
      });
    });
    req.on('error', reject);
    req.end(payload);
  });
}
