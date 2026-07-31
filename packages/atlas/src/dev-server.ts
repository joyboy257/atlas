import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { once } from 'node:events';
import { AtlasLocalRuntime, AtlasLocalRuntimeError } from './local-runtime.js';
import { AtlasCliError } from './errors.js';
import { AtlasLocalMissionCoordinator } from './mission-coordinator.js';
import type { MissionScope } from './mission-contract.js';
import { AtlasMessagingSimulator, type AtlasSimulatorScenario } from './messaging-simulator.js';
import {
  projectCoordinatorResult,
  projectCoordinatorSnapshot,
} from './public-projections.js';
import { renderAtlasWorkbench } from './workbench.js';

export type AtlasDevServerOptions = Readonly<{
  port?: number;
  host?: string;
  failFirst?: number;
  latencyMs?: number;
  webhookForwardUrl?: string;
  fetchImpl?: typeof fetch;
  projectRoot?: string;
  clock?: () => string;
  advanceTime?: (milliseconds: number) => void;
}>;

export type AtlasWebhookEventSummary = Readonly<{
  id: string | null;
  type: string;
  created_at: string | null;
  sequence: number;
  data_keys: readonly string[];
}>;

export type AtlasDevServer = Readonly<{
  url: string;
  events: readonly AtlasWebhookEventSummary[];
  identity: Readonly<{
    mode: 'local';
    tenant_id: string;
    project_name: string;
    project_hash: string;
    runtime_version: string;
  }> | null;
  close: () => Promise<void>;
}>;

export async function startAtlasDevServer(options: AtlasDevServerOptions = {}): Promise<AtlasDevServer> {
  const host = options.host ?? '127.0.0.1';
  if (!isLoopbackHostname(host)) {
    throw new Error(`Atlas dev server may bind only to a loopback host; received ${host}`);
  }
  const events: Record<string, unknown>[] = [];
  const runtime = options.projectRoot ? await AtlasLocalRuntime.open({ root: options.projectRoot, ...(options.clock ? { clock: options.clock } : {}) }) : null;
  const coordinator = options.projectRoot ? await AtlasLocalMissionCoordinator.open({
    root: options.projectRoot,
    scope: localDevMissionScope(runtime),
    ...(options.clock ? { clock: options.clock } : {}),
  }) : null;
  const simulator = coordinator ? new AtlasMessagingSimulator(coordinator, { ...(options.advanceTime ? { advance: options.advanceTime } : {}) }) : null;
  let requests = 0;
  const server = createServer(async (req, res) => {
    try {
      if (!isAllowedHostHeader(req.headers.host)) {
        return json(res, 421, { ok: false, error: { code: 'MISDIRECTED_REQUEST', message: 'Atlas dev accepts loopback Host headers only', retryable: false } });
      }
      if (!isAllowedMutationOrigin(req)) {
        return json(res, 403, { ok: false, error: { code: 'ORIGIN_FORBIDDEN', message: 'Atlas dev rejected a cross-origin mutation request', retryable: false } });
      }
      requests += 1;
      if ((options.latencyMs ?? 0) > 0) await new Promise((resolve) => setTimeout(resolve, options.latencyMs));
      if (requests <= (options.failFirst ?? 0)) return json(res, 503, { ok: false, error: { code: 'FIXTURE_INJECTED_FAILURE', retryable: true } });
      await handleRequest(req, res, { options, events, runtime, coordinator, simulator });
    } catch (error) {
      handleError(res, error);
    }
  });
  server.listen(options.port ?? 0, host);
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Atlas dev server did not bind a TCP port');
  const urlHost = host.includes(':') ? `[${host}]` : host;
  return {
    url: `http://${urlHost}:${address.port}`,
    get events() {
      return projectWebhookEvents(events);
    },
    identity: runtime?.snapshot().identity ?? null,
    close: async () => {
      server.close();
      await once(server, 'close');
    },
  };
}

export async function postWebhookFixture(url: string, eventType: string, data: Record<string, unknown>, fetchImpl: typeof fetch = fetch) {
  const event = { id: 'evt_atlas_dev_001', type: eventType, created_at: '2026-07-13T00:00:00.000Z', data };
  return postWebhookEvent(url, event, fetchImpl);
}

export async function postWebhookEvent(url: string, event: Record<string, unknown>, fetchImpl: typeof fetch = fetch) {
  const eventType = typeof event.type === 'string' ? event.type : 'atlas.fixture.replayed';
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-mirai-event-type': eventType },
    body: JSON.stringify(event),
    signal: AbortSignal.timeout(10_000),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`Webhook fixture failed: HTTP ${response.status}`);
  return { event, response: body };
}

type RequestContext = Readonly<{
  options: AtlasDevServerOptions;
  events: Record<string, unknown>[];
  runtime: AtlasLocalRuntime | null;
  coordinator: AtlasLocalMissionCoordinator | null;
  simulator: AtlasMessagingSimulator | null;
}>;

async function handleRequest(req: IncomingMessage, res: ServerResponse, context: RequestContext): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://atlas.local');
  const method = req.method ?? 'GET';

  if (method === 'GET' && url.pathname === '/' && context.runtime) {
    const identity = context.runtime.snapshot().identity;
    return html(res, renderAtlasWorkbench({ project_name: identity.project_name, project_hash: identity.project_hash }));
  }
  if (method === 'GET' && url.pathname === '/health') {
    return json(res, 200, {
      ok: true,
      service: 'atlas-dev',
      deterministic: true,
      governed_runtime: context.runtime !== null,
      project_hash: context.runtime?.snapshot().identity.project_hash ?? null,
    });
  }
  if (method === 'GET' && url.pathname === '/events') return json(res, 200, { ok: true, events: projectWebhookEvents(context.events) });
  if (method === 'POST' && url.pathname === '/webhooks') return handleWebhook(req, res, context);
  if (method === 'POST' && url.pathname === '/mcp') return handleMcp(req, res, context.runtime, context.coordinator);

  if (method === 'GET' && url.pathname === '/api/state') {
    const coordinator = requireCoordinator(context.coordinator);
    return success(res, projectCoordinatorSnapshot(await coordinator.snapshot()).runtime);
  }
  if (method === 'GET' && url.pathname === '/api/receipts') {
    const coordinator = requireCoordinator(context.coordinator);
    return success(res, projectCoordinatorSnapshot(await coordinator.snapshot()).runtime.receipts);
  }
  const traceMatch = /^\/api\/traces\/([^/]+)$/.exec(url.pathname);
  if (method === 'GET' && traceMatch) {
    const coordinator = requireCoordinator(context.coordinator);
    const snapshot = projectCoordinatorSnapshot(await coordinator.snapshot()).runtime;
    return success(res, snapshot.traces.find((trace) => trace.id === decodeURIComponent(traceMatch[1]!)) ?? null);
  }
  if (method === 'POST' && url.pathname === '/api/messages/inbound') {
    const coordinator = requireCoordinator(context.coordinator);
    return success(res, projectCoordinatorResult(await coordinator.receive(await readJson(req) as never)), 202);
  }
  const approvalMatch = /^\/api\/approvals\/([^/]+)\/decision$/.exec(url.pathname);
  if (method === 'POST' && approvalMatch) {
    const coordinator = requireCoordinator(context.coordinator);
    const body = await readJson(req);
    const decision = body.decision;
    const operatorId = body.operator_id;
    if ((decision !== 'approved' && decision !== 'rejected') || typeof operatorId !== 'string') {
      throw new AtlasLocalRuntimeError('INVALID_MESSAGE', 'Approval decision requires decision=approved|rejected and operator_id');
    }
    const result = decision === 'approved'
      ? await coordinator.approve(decodeURIComponent(approvalMatch[1]!), operatorId, typeof body.reason === 'string' ? body.reason : undefined)
      : await coordinator.reject(decodeURIComponent(approvalMatch[1]!), operatorId, typeof body.reason === 'string' ? body.reason : undefined);
    return success(res, projectCoordinatorResult(result));
  }
  const takeoverMatch = /^\/api\/conversations\/([^/]+)\/takeover$/.exec(url.pathname);
  if (method === 'POST' && takeoverMatch) {
    const coordinator = requireCoordinator(context.coordinator);
    const body = await readJson(req);
    if (typeof body.operator_id !== 'string' || typeof body.reason !== 'string') {
      throw new AtlasLocalRuntimeError('INVALID_MESSAGE', 'Human takeover requires operator_id and reason');
    }
    return success(res, projectCoordinatorResult(await coordinator.takeover(decodeURIComponent(takeoverMatch[1]!), body.operator_id, body.reason)));
  }
  const outboxMatch = /^\/api\/outbox\/([^/]+)\/attempt$/.exec(url.pathname);
  if (method === 'POST' && outboxMatch) {
    const coordinator = requireCoordinator(context.coordinator);
    const body = await readJson(req);
    if (!['transient_failure', 'permanent_rejection', 'accepted', 'delivered'].includes(String(body.outcome))) {
      throw new AtlasLocalRuntimeError('INVALID_MESSAGE', 'Delivery attempt outcome is unsupported');
    }
    return success(res, projectCoordinatorResult(await coordinator.deliver(decodeURIComponent(outboxMatch[1]!), {
      outcome: body.outcome as 'transient_failure' | 'permanent_rejection' | 'accepted' | 'delivered',
      ...(typeof body.provider_code === 'string' ? { provider_code: body.provider_code } : {}),
      ...(typeof body.provider_message_id === 'string' ? { provider_message_id: body.provider_message_id } : {}),
    })));
  }
  if (method === 'POST' && url.pathname === '/api/delivery/callbacks') {
    const coordinator = requireCoordinator(context.coordinator);
    const body = await readJson(req);
    if (typeof body.callback_id !== 'string' || typeof body.provider_message_id !== 'string' || typeof body.occurred_at !== 'string' || !['sent', 'delivered', 'read', 'failed'].includes(String(body.state))) {
      throw new AtlasLocalRuntimeError('INVALID_MESSAGE', 'Delivery callback fields are invalid');
    }
    return success(res, projectCoordinatorResult(await coordinator.applyDeliveryCallback({
      callback_id: body.callback_id,
      provider_message_id: body.provider_message_id,
      state: body.state as 'sent' | 'delivered' | 'read' | 'failed',
      occurred_at: body.occurred_at,
    })));
  }
  if (method === 'POST' && url.pathname === '/api/simulator/scenarios') {
    const simulator = context.simulator;
    if (!simulator) throw projectRequired();
    return success(res, await simulator.runScenario(await readJson(req) as unknown as AtlasSimulatorScenario));
  }

  return json(res, 404, { ok: false, error: { code: 'NOT_FOUND', retryable: false, next_action: 'Inspect the Atlas dev server routes' } });
}

async function handleWebhook(req: IncomingMessage, res: ServerResponse, context: RequestContext): Promise<void> {
  const body = await readJson(req);
  if (context.coordinator) {
    const triggerId = typeof body.trigger_id === 'string'
      ? body.trigger_id
      : typeof body.id === 'string'
        ? body.id
        : undefined;
    const type = typeof body.type === 'string'
      ? body.type
      : typeof req.headers['x-mirai-event-type'] === 'string'
        ? req.headers['x-mirai-event-type']
        : undefined;
    const occurredAt = typeof body.occurred_at === 'string'
      ? body.occurred_at
      : typeof body.created_at === 'string'
        ? body.created_at
        : undefined;
    if (!triggerId || !type || !occurredAt) {
      throw new AtlasLocalRuntimeError('INVALID_MESSAGE', 'Durable webhook ingress requires id, type and created_at/occurred_at');
    }
    const result = await context.coordinator.trigger({
      triggerId,
      type,
      occurredAt,
      payload: body.data ?? body.payload ?? body,
      ...(typeof body.mission_id === 'string' ? { missionId: body.mission_id } : {}),
      ...(typeof body.event_type === 'string' ? { eventType: body.event_type } : {}),
      ...(typeof body.event_key === 'string' ? { eventKey: body.event_key } : {}),
    });
    context.events.push(body);
    return json(res, 202, { ok: true, accepted: true, durable: true, trigger: projectTriggerResult(result), sequence: context.events.length });
  }
  if (context.options.webhookForwardUrl) {
    try {
      const forwarded = await (context.options.fetchImpl ?? fetch)(context.options.webhookForwardUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-atlas-dev-forwarded': 'true' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      });
      if (forwarded.ok) context.events.push(body);
      return json(res, forwarded.ok ? 202 : 502, { ok: forwarded.ok, accepted: true, sequence: context.events.length, forwarded: true, forward_status: forwarded.status });
    } catch (error) {
      return json(res, 502, { ok: false, accepted: true, sequence: context.events.length, forwarded: false, error: error instanceof Error ? error.message : 'Webhook forwarding failed' });
    }
  }
  context.events.push(body);
  return json(res, 202, { ok: true, accepted: true, sequence: context.events.length, forwarded: false });
}

async function handleMcp(req: IncomingMessage, res: ServerResponse, runtime: AtlasLocalRuntime | null, coordinator: AtlasLocalMissionCoordinator | null): Promise<void> {
  const message = await readJson(req);
  const method = message.method;
  const id = message.id ?? null;
  if (method === 'initialize') return json(res, 200, { jsonrpc: '2.0', id, result: { protocolVersion: '2025-03-26', capabilities: { tools: {}, resources: {} }, serverInfo: { name: 'atlas-dev', version: '1' } } });
  if (method === 'notifications/initialized') {
    res.statusCode = 202;
    res.end();
    return;
  }
  if (method === 'tools/list') return json(res, 200, {
    jsonrpc: '2.0', id, result: { tools: [
      { name: 'mirai.atlas/knowledge.search@1', description: 'Deterministic local knowledge fixture', inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
      ...(runtime ? [{ name: 'mirai.atlas/front-desk.receive@1', description: 'Submit a normalized local business message through Atlas governance', inputSchema: { type: 'object' } }] : []),
    ] },
  });
  if (method === 'resources/list') return json(res, 200, { jsonrpc: '2.0', id, result: { resources: [{ uri: 'atlas://fixtures/canonical-quickstart', name: 'Canonical quickstart fixture' }] } });
  if (method === 'tools/call') {
    const name = isRecord(message.params) ? message.params.name : null;
    if (runtime && coordinator && name === 'mirai.atlas/front-desk.receive@1') {
      const args = isRecord(message.params) && isRecord(message.params.arguments) ? message.params.arguments : {};
      const result = await coordinator.receive(args as never);
      return json(res, 200, { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify({ status: result.status, next_action: result.runtime.next_action }) }], structuredContent: projectCoordinatorResult(result) } });
    }
    return json(res, 200, { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: 'The sandbox cafe opens at 09:00.' }], structuredContent: { answer: 'The sandbox cafe opens at 09:00.', fixture: true } } });
  }
  return json(res, 200, { jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } });
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.from(chunk);
    size += buffer.length;
    if (size > 1_048_576) throw new AtlasLocalRuntimeError('INVALID_MESSAGE', 'JSON request body exceeds 1 MiB');
    chunks.push(buffer);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Expected object');
    return parsed as Record<string, unknown>;
  } catch {
    throw new AtlasLocalRuntimeError('INVALID_MESSAGE', 'Expected a valid JSON object request body');
  }
}

function requireRuntime(runtime: AtlasLocalRuntime | null): AtlasLocalRuntime {
  if (!runtime) throw projectRequired();
  return runtime;
}

function requireCoordinator(coordinator: AtlasLocalMissionCoordinator | null): AtlasLocalMissionCoordinator {
  if (!coordinator) throw projectRequired();
  return coordinator;
}

function localDevMissionScope(runtime: AtlasLocalRuntime | null): MissionScope {
  const identity = runtime?.snapshot().identity;
  if (!identity) throw projectRequired();
  return {
    tenantId: identity.tenant_id,
    organisationId: `local-org-${identity.project_hash.slice(0, 16)}`,
    projectId: identity.project_hash,
    environmentId: 'local',
  };
}

function projectRequired(): AtlasLocalRuntimeError {
  return new AtlasLocalRuntimeError('PROJECT_STATE_MISMATCH', 'This route requires atlas dev to run inside a valid Atlas project', {
    nextAction: 'Run atlas init front-desk, cd into the project, then run atlas dev',
  });
}

function success(res: ServerResponse, data: unknown, status = 200): void {
  json(res, status, { ok: true, data, next_action: inferNextAction(data) });
}

function projectTriggerResult(result: Readonly<{ triggerId: string; type: string; status: string; replayed: boolean; missionId?: string; waitId?: string; result?: unknown }>): Readonly<Record<string, unknown>> {
  return {
    trigger_id: result.triggerId,
    type: result.type,
    status: result.status,
    replayed: result.replayed,
    ...(result.missionId ? { mission_id: result.missionId } : {}),
    ...(result.waitId ? { wait_id: result.waitId } : {}),
    ...(result.result ? { result: result.result } : {}),
  };
}

function inferNextAction(data: unknown): Readonly<{ code: string; label: string }> | null {
  if (isRecord(data) && typeof data.next_action === 'string') return { code: 'continue', label: data.next_action };
  return null;
}

function handleError(res: ServerResponse, error: unknown): void {
  if (error instanceof AtlasCliError) {
    json(res, error.code === 'AUTHORIZATION_FAILED' ? 403 : 409, { ok: false, error: { code: error.code, message: error.message, retryable: error.retryable, next_action: error.nextAction ?? 'Inspect the local Atlas Mission state' } });
    return;
  }
  if (error instanceof AtlasLocalRuntimeError) {
    const status = error.code === 'NOT_FOUND' ? 404
      : error.code === 'INVALID_MESSAGE' ? 400
        : error.code === 'RETRY_NOT_READY' ? 425
          : error.code === 'PROJECT_STATE_MISMATCH' ? 409
            : 409;
    json(res, status, { ok: false, error: { code: error.code, message: error.message, retryable: error.retryable, next_action: error.next_action } });
    return;
  }
  json(res, 500, { ok: false, error: { code: 'LOCAL_RUNTIME_ERROR', message: error instanceof Error ? error.message : 'Unknown local runtime error', retryable: false, next_action: 'Inspect the local Atlas project and trace state' } });
}

function isLoopbackHostname(value: string): boolean {
  const normalized = value.toLowerCase().replace(/^\[|\]$/g, '');
  return normalized === '127.0.0.1' || normalized === 'localhost' || normalized === '::1';
}

function isAllowedHostHeader(value: string | undefined): boolean {
  if (!value) return false;
  try {
    return isLoopbackHostname(new URL(`http://${value}`).hostname);
  } catch {
    return false;
  }
}

function isAllowedMutationOrigin(req: IncomingMessage): boolean {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method ?? 'GET')) return true;
  const origin = req.headers.origin;
  if (!origin) return true;
  const host = req.headers.host;
  if (!host) return false;
  try {
    const parsed = new URL(origin);
    return parsed.protocol === 'http:' && parsed.host === host && isLoopbackHostname(parsed.hostname);
  } catch {
    return false;
  }
}

function html(res: ServerResponse, body: string): void {
  if (res.headersSent || res.writableEnded) return;
  res.statusCode = 200;
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('content-security-policy', "default-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'");
  res.setHeader('referrer-policy', 'no-referrer');
  res.setHeader('x-frame-options', 'DENY');
  res.end(body);
}

function json(res: ServerResponse, status: number, body: unknown): void {
  if (res.headersSent || res.writableEnded) return;
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-content-type-options', 'nosniff');
  res.end(JSON.stringify(body));
}

function projectWebhookEvents(events: readonly Record<string, unknown>[]): readonly AtlasWebhookEventSummary[] {
  return events.map((event, index) => ({
    id: typeof event.id === 'string' ? event.id : null,
    type: typeof event.type === 'string' ? event.type : 'atlas.fixture.replayed',
    created_at: typeof event.created_at === 'string' ? event.created_at : null,
    sequence: index + 1,
    data_keys: isRecord(event.data) ? Object.keys(event.data).sort() : [],
  }));
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
