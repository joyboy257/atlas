import { describe, expect, it, vi } from 'vitest';
import { AtlasPlatformClient } from '../src/platform-client.js';

describe('AtlasPlatformClient', () => {
  it('uses canonical routes and never sends client tenant identity', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, data: { projects: [] } }), { status: 200 }));
    await new AtlasPlatformClient({ apiBase: 'https://api.usemirai.app', token: 'secret-token', fetchImpl }).listProjects();
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe('https://api.usemirai.app/atlas/v1/projects');
    expect(JSON.stringify(init)).not.toContain('organization_id');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer secret-token');
  });

  it('maps conflict-on-mismatch to the stable conflict category', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: false, error: { code: 'CONFLICT', message: 'payload mismatch', retryable: false } }), { status: 409 }));
    await expect(new AtlasPlatformClient({ apiBase: 'https://api.usemirai.app', token: 'secret-token', fetchImpl }).createProject({ slug: 'demo', name: 'Demo', idempotency_key: crypto.randomUUID() })).rejects.toMatchObject({ code: 'CONFLICT', exitCode: 6 });
  });

  it('forwards explicit deployment approval authority without tenant identity', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, data: { receipt: {} } }), { status: 200 }));
    const approvalId = crypto.randomUUID();
    await new AtlasPlatformClient({ apiBase: 'https://api.usemirai.app', token: 'secret-token', fetchImpl }).promoteDeployment('prj_demo', 'sandbox', 'production', crypto.randomUUID(), approvalId);
    const body = JSON.parse(fetchImpl.mock.calls[0]![1]!.body as string);
    expect(body).toMatchObject({ from_environment: 'sandbox', to_environment: 'production', approval_id: approvalId });
    expect(body.organization_id).toBeUndefined();
  });

  it('forwards approval authority for a direct production apply', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, data: { receipt: {} } }), { status: 200 }));
    const approvalId = 'apr_deploy_apply';
    await new AtlasPlatformClient({ apiBase: 'https://api.usemirai.app', token: 'secret-token', fetchImpl }).applyDeployment('prj_demo', 'production', { config: {}, config_digest: `sha256:${'0'.repeat(64)}`, idempotency_key: crypto.randomUUID(), approval_id: approvalId });
    const body = JSON.parse(fetchImpl.mock.calls[0]![1]!.body as string);
    expect(body).toMatchObject({ approval_id: approvalId });
    expect(body.organization_id).toBeUndefined();
  });

  it('negotiates MCP inspection and reports case-insensitive tool collisions', async () => {
    const session = crypto.randomUUID();
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ jsonrpc: '2.0', id: 'init', result: { protocolVersion: '2025-03-26' } }), { status: 200, headers: { 'mcp-session-id': session } }))
      .mockResolvedValueOnce(new Response('', { status: 202 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ jsonrpc: '2.0', id: 'tools', result: { tools: [{ name: 'Mirai.Search' }, { name: 'mirai.search' }] } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ jsonrpc: '2.0', id: 'resources', result: { resources: [{ uri: 'atlas://docs' }] } }), { status: 200 }));
    const result = await new AtlasPlatformClient({ apiBase: 'https://api.usemirai.app', token: 'secret-token', fetchImpl }).inspectMcp();
    expect(result).toMatchObject({ protocol: '2025-03-26', session: true, collisions: ['mirai.search'] });
    expect(result.tools).toHaveLength(2); expect(result.resources).toHaveLength(1);
  });
});
