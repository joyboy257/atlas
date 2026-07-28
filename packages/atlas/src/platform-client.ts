import { AtlasCliError } from './errors.js';
import { normalizeApiBase } from './urls.js';

export type ProjectRecord = Readonly<{ id: string; external_id: string; slug: string; name: string; description: string | null; status: string }>;
export type EnvironmentRecord = Readonly<{ id: string; external_id: string; project_id: string; slug: string; name: string; environment_type: 'sandbox' | 'staging' | 'production' | 'custom'; status: string }>;
export type ExecutionReceipt = Readonly<Record<string, unknown> & { schema_version: 'atlas.receipt/v1'; receipt_id: string; outcome: string }>;

export class AtlasPlatformClient {
  private readonly apiBase: string;
  constructor(private readonly options: { apiBase: string; token: string; fetchImpl?: typeof fetch; projectId?: string; environmentId?: string }) {
    this.apiBase = normalizeApiBase(options.apiBase);
  }

  async identity(): Promise<{ workspace_id: string }> {
    const value = await this.request<{ organization_id: string }>('GET', '/atlas/v1/capabilities');
    if (!value.organization_id) throw new AtlasCliError('REMOTE_ERROR', 'Atlas identity response did not include an organization');
    return { workspace_id: value.organization_id };
  }
  async listProjects() { return (await this.request<{ projects: ProjectRecord[] }>('GET', '/atlas/v1/projects')).projects; }
  async showProject(projectId: string) { return (await this.request<{ project: ProjectRecord }>('GET', `/atlas/v1/projects/${encodeURIComponent(projectId)}`)).project; }
  async createProject(input: { slug: string; name: string; description?: string; idempotency_key: string }) { return this.request<{ project: ProjectRecord; replayed: boolean }>('POST', '/atlas/v1/projects', input); }
  async listEnvironments(projectId: string) { return (await this.request<{ environments: EnvironmentRecord[] }>('GET', `/atlas/v1/projects/${encodeURIComponent(projectId)}/environments`)).environments; }
  async showEnvironment(projectId: string, environmentId: string) { return (await this.request<{ environment: EnvironmentRecord }>('GET', `/atlas/v1/projects/${encodeURIComponent(projectId)}/environments/${encodeURIComponent(environmentId)}`)).environment; }
  async createEnvironment(projectId: string, input: { slug: string; name: string; environment_type: EnvironmentRecord['environment_type']; idempotency_key: string }) { return this.request<{ environment: EnvironmentRecord; replayed: boolean }>('POST', `/atlas/v1/projects/${encodeURIComponent(projectId)}/environments`, input); }
  async safeContextProbe(query = 'What time does the sandbox cafe open?') { return this.request<Record<string, unknown>>('GET', `/atlas/v1/knowledge/search?query=${encodeURIComponent(query)}`); }
  async execute(input: { tool: string; input: Record<string, unknown>; mode: 'read' | 'dry_run' | 'commit'; idempotency_key: string; project_id?: string; environment_id?: string }) { return this.request<{ result: Record<string, unknown> | null; receipt: ExecutionReceipt }>('POST', '/atlas/v1/executions', input); }
  async showReceipt(receiptId: string) { return (await this.request<{ receipt: ExecutionReceipt }>('GET', `/atlas/v1/receipts/${encodeURIComponent(receiptId)}`)).receipt; }
  async listReceipts() { return (await this.request<{ receipts: ExecutionReceipt[] }>('GET', '/atlas/v1/receipts')).receipts; }
  async listRuns() { return (await this.request<{ runs: ExecutionReceipt[] }>('GET', '/atlas/v1/runs')).runs; }
  async showRun(runId: string) { return (await this.request<{ run: ExecutionReceipt }>('GET', `/atlas/v1/runs/${encodeURIComponent(runId)}`)).run; }
  async listApprovals() { return this.request<Record<string, unknown>>('GET', '/atlas/v1/approvals'); }
  async showApproval(id: string) { return this.request<Record<string, unknown>>('GET', `/atlas/v1/approvals/${encodeURIComponent(id)}`); }
  async decideApproval(id: string, decision: 'approved' | 'rejected', reason?: string) { return this.request<Record<string, unknown>>('POST', `/atlas/v1/approvals/${encodeURIComponent(id)}/decide`, { approval_request_id: id, decision, note: reason }); }
  async listWebhooks() { return this.request<Record<string, unknown>>('GET', '/atlas/v1/webhooks/endpoints'); }
  async usage() { return this.request<Record<string, unknown>>('GET', '/atlas/v1/billing/events'); }
  async showTrace(id: string) { return this.request<Record<string, unknown>>('GET', `/atlas/v1/debug/traces/${encodeURIComponent(id)}`); }
  async planDeployment(project:string,environment:string,config_digest:string){return this.request<Record<string,unknown>>('POST',`/atlas/v1/projects/${encodeURIComponent(project)}/environments/${encodeURIComponent(environment)}/deployments/plan`,{config_digest});}
  async applyDeployment(project:string,environment:string,input:{config:Record<string,unknown>;config_digest:string;idempotency_key:string;approval_id?:string}){return this.request<Record<string,unknown>>('POST',`/atlas/v1/projects/${encodeURIComponent(project)}/environments/${encodeURIComponent(environment)}/deployments`,input);}
  async deploymentStatus(project:string,environment:string){return this.request<Record<string,unknown>>('GET',`/atlas/v1/projects/${encodeURIComponent(project)}/environments/${encodeURIComponent(environment)}/deployments/status`);}
  async rollbackDeployment(project:string,environment:string,deployment_id:string,idempotency_key:string,approval_id?:string){return this.request<Record<string,unknown>>('POST',`/atlas/v1/projects/${encodeURIComponent(project)}/environments/${encodeURIComponent(environment)}/deployments/rollback`,{deployment_id,idempotency_key,...(approval_id?{approval_id}:{})});}
  async promoteDeployment(project:string,from_environment:string,to_environment:string,idempotency_key:string,approval_id?:string){return this.request<Record<string,unknown>>('POST',`/atlas/v1/projects/${encodeURIComponent(project)}/deployments/promote`,{from_environment,to_environment,idempotency_key,...(approval_id?{approval_id}:{})});}
  async testMcp(): Promise<{ protocol: string; session: boolean; tools: number; resources: number }> {
    const inspected = await this.inspectMcp();
    return { protocol: inspected.protocol, session: inspected.session, tools: inspected.tools.length, resources: inspected.resources.length };
  }
  async inspectMcp(): Promise<{ protocol: string; session: boolean; tools: Record<string, unknown>[]; resources: Record<string, unknown>[]; collisions: string[] }> {
    const initialized = await this.mcpRpc({ jsonrpc: '2.0', id: 'atlas-cli-initialize', method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: '@mirai/atlas', version: '0.1.0-preview.0' } } });
    const protocol = String((initialized.value?.result as Record<string, unknown> | undefined)?.protocolVersion ?? '');
    if (!protocol) throw new AtlasCliError('REMOTE_ERROR', 'MCP initialize response omitted protocolVersion');
    await this.mcpRpc({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} }, initialized.sessionId, true);
    const tools = await this.mcpRpc({ jsonrpc: '2.0', id: 'atlas-cli-tools', method: 'tools/list', params: {} }, initialized.sessionId);
    const resources = await this.mcpRpc({ jsonrpc: '2.0', id: 'atlas-cli-resources', method: 'resources/list', params: {} }, initialized.sessionId);
    const toolList = (tools.value?.result as { tools?: unknown[] } | undefined)?.tools; const resourceList = (resources.value?.result as { resources?: unknown[] } | undefined)?.resources;
    if (!Array.isArray(toolList) || !Array.isArray(resourceList)) throw new AtlasCliError('REMOTE_ERROR', 'MCP discovery response was invalid');
    const descriptors = toolList.filter((value): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value)));
    const names = descriptors.map((tool) => typeof tool.name === 'string' ? tool.name : '').filter(Boolean); const seen = new Set<string>(); const collisions = new Set<string>();
    for (const name of names) { const normalized = name.toLowerCase(); if (seen.has(normalized)) collisions.add(name); seen.add(normalized); }
    return { protocol, session: Boolean(initialized.sessionId), tools: descriptors, resources: resourceList.filter((value): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value))), collisions: [...collisions].sort() };
  }

  private async mcpRpc(body: Record<string, unknown>, sessionId?: string, allowEmpty = false): Promise<{ value: { result?: unknown; error?: { message?: string } } | null; sessionId?: string }> {
    let response: Response;
    try { response = await (this.options.fetchImpl ?? globalThis.fetch)(`${this.apiBase}/atlas/v1/mcp`, { method: 'POST', headers: { authorization: `Bearer ${this.options.token}`, accept: 'application/json, text/event-stream', 'content-type': 'application/json', ...(this.options.projectId ? { 'atlas-project-id': this.options.projectId } : {}), ...(this.options.environmentId ? { 'atlas-environment-id': this.options.environmentId } : {}), ...(sessionId ? { 'mcp-session-id': sessionId, 'mcp-protocol-version': '2025-03-26' } : {}) }, body: JSON.stringify(body), signal: AbortSignal.timeout(15_000) }); }
    catch (error) { throw new AtlasCliError('NETWORK_ERROR', error instanceof Error ? error.message : 'MCP request failed', { retryable: true }); }
    const text = await response.text(); const payload = text.trim() ? parseMcpPayload(text, response.headers.get('content-type')) : null;
    if (!response.ok || payload?.error || (!allowEmpty && !payload?.result)) throw new AtlasCliError(response.status === 401 ? 'AUTHENTICATION_FAILED' : response.status === 403 ? 'AUTHORIZATION_FAILED' : 'REMOTE_ERROR', payload?.error?.message ?? `MCP request failed: HTTP ${response.status}`, { retryable: response.status >= 500 || response.status === 429 });
    return { value: payload, sessionId: response.headers.get('mcp-session-id') ?? sessionId };
  }

  private async request<T>(method: string, path: string, body?: Record<string, unknown>): Promise<T> {
    let response: Response;
    try {
      response = await (this.options.fetchImpl ?? globalThis.fetch)(`${this.apiBase}${path}`, {
        method, headers: { authorization: `Bearer ${this.options.token}`, accept: 'application/json', 'content-type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15_000),
      });
    } catch (error) {
      throw new AtlasCliError('NETWORK_ERROR', error instanceof Error ? error.message : 'Atlas network request failed', { retryable: true });
    }
    const envelope = await response.json().catch(() => null) as { ok?: boolean; data?: T; error?: { code?: string; message?: string; retryable?: boolean } } | null;
    if (!response.ok || !envelope?.ok || !envelope.data) {
      const code = envelope?.error?.code;
      throw new AtlasCliError(code === 'CONFLICT' ? 'CONFLICT' : response.status === 401 ? 'AUTHENTICATION_FAILED' : response.status === 403 ? 'AUTHORIZATION_FAILED' : 'REMOTE_ERROR', envelope?.error?.message ?? `Atlas request failed: HTTP ${response.status}`, { retryable: envelope?.error?.retryable ?? response.status >= 500 });
    }
    return envelope.data;
  }
}

function parseMcpPayload(text: string, contentType: string | null): { result?: unknown; error?: { message?: string } } {
  const raw = contentType?.includes('text/event-stream') ? text.split(/\r?\n/).filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim()).find(Boolean) : text;
  try { return JSON.parse(raw ?? '') as { result?: unknown; error?: { message?: string } }; }
  catch { throw new AtlasCliError('REMOTE_ERROR', 'MCP server returned an invalid response'); }
}
