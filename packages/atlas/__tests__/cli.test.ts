import { describe, expect, it, vi } from 'vitest';
import { runCli } from '../src/cli.js';
import type { CredentialRecord, CredentialStore } from '../src/credentials/types.js';
import type { OutputWriter } from '../src/output.js';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { startAtlasDevServer } from '../src/dev-server.js';
import type { AtlasScaffoldDependencies } from '../src/scaffold.js';

class MemoryStore implements CredentialStore {
  readonly kind = 'memory' as const;
  private values = new Map<string, CredentialRecord>();
  async get(reference: string) { return this.values.get(reference) ?? null; }
  async set(reference: string, credential: CredentialRecord) { this.values.set(reference, credential); }
  async delete(reference: string) { return this.values.delete(reference); }
}

function capture(): { writer: OutputWriter; stdout: string[]; stderr: string[] } {
  const stdout: string[] = []; const stderr: string[] = [];
  return { writer: { stdout: (value) => stdout.push(value), stderr: (value) => stderr.push(value) }, stdout, stderr };
}

function scaffoldDependencies(): AtlasScaffoldDependencies {
  return {
    runCommand: vi.fn().mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' }),
    inspectGit: vi.fn().mockResolvedValue({ available: true, repository: false, dirty: false, root: null }),
  };
}

describe('atlas CLI auth commands', () => {
  it.each([[[]], [['--help']], [['-h']], [['help']]])('shows help successfully for %j', async (args: string[]) => {
    const output = capture();
    expect(await runCli(args, { output: output.writer, platformCredentialStore: { store: new MemoryStore(), reference: 'default' } })).toBe(0);
    expect(output.stdout.join('\n')).toContain('Mirai Atlas CLI');
  });
  it('returns stable JSON when whoami has no credential', async () => {
    const output = capture(); const store = new MemoryStore();
    const code = await runCli(['whoami', '--json'], { output: output.writer, platformCredentialStore: { store, reference: 'default' } });
    expect(code).toBe(3);
    expect(JSON.parse(output.stderr[0]!)).toMatchObject({ ok: false, error: { code: 'AUTHENTICATION_REQUIRED' } });
  });

  it('logs in, validates whoami remotely, and never writes the token to output', async () => {
    const output = capture(); const store = new MemoryStore();
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ device_code: 'device-code-at-least-sixteen', user_code: 'CODE-1234', verification_url: 'https://app.usemirai.app/device', interval: 1, expires_at: Date.now() + 10_000 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'top-secret-token-at-least-sixteen', token_type: 'Bearer', expires_in: 3600, scope: 'atlas.context.read' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const dependencies = { output: output.writer, fetchImpl, openBrowser: async () => true, platformCredentialStore: { store, reference: 'default' } };

    expect(await runCli(['login', '--client-id', 'client', '--json'], dependencies)).toBe(0);
    expect(await runCli(['whoami', '--json'], dependencies)).toBe(0);
    expect(`${output.stdout.join('\n')}\n${output.stderr.join('\n')}`).not.toContain('top-secret-token-at-least-sixteen');
    expect(JSON.parse(output.stderr[0]!)).toMatchObject({ type: 'atlas.login.verification_required', user_code: 'CODE-1234' });
    expect(JSON.parse(output.stdout[1]!)).toMatchObject({ ok: true, data: { authenticated: true } });
  });

  it('rejects plaintext non-loopback API bases before making requests', async () => {
    const output = capture(); const fetchImpl = vi.fn();
    const code = await runCli(['login', '--client-id', 'client', '--api-base', 'http://evil.example', '--json'], { output: output.writer, fetchImpl, platformCredentialStore: { store: new MemoryStore(), reference: 'default' } });
    expect(code).toBe(2);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('does not run destructive commands with trailing positional typos', async () => {
    const output = capture(); const store = new MemoryStore();
    await store.set('default', { accessToken: 'secret-token-at-least-sixteen', tokenType: 'Bearer', apiBase: 'https://api.example.com', scopes: [] });
    expect(await runCli(['logout', 'typo', '--json'], { output: output.writer, platformCredentialStore: { store, reference: 'default' } })).toBe(2);
    expect(await store.get('default')).not.toBeNull();
  });

  it('maps offline failures to the retryable network exit category', async () => {
    const output = capture();
    const code = await runCli(['login', '--client-id', 'client', '--json'], {
      output: output.writer,
      fetchImpl: vi.fn().mockRejectedValue(new TypeError('offline')),
      platformCredentialStore: { store: new MemoryStore(), reference: 'default' },
    });
    expect(code).toBe(7);
    expect(JSON.parse(output.stderr[0]!)).toMatchObject({ error: { code: 'NETWORK_ERROR', retryable: true } });
  });

  it('logout removes the selected credential', async () => {
    const output = capture(); const store = new MemoryStore();
    await store.set('default', { accessToken: 'secret', tokenType: 'Bearer', apiBase: 'https://api.example.com', scopes: [] });
    expect(await runCli(['logout', '--json'], { output: output.writer, platformCredentialStore: { store, reference: 'default' } })).toBe(0);
    expect(await store.get('default')).toBeNull();
  });

  it('creates and activates a Project without accepting tenant identity', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'atlas-cli-project-'));
    try {
      const output = capture(); const store = new MemoryStore();
      await store.set('default', { accessToken: 'secret-token-at-least-sixteen', tokenType: 'Bearer', apiBase: 'https://api.example.com', scopes: ['atlas.projects.write'] });
      const fetchImpl = vi.fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, data: { project: { id: crypto.randomUUID(), external_id: 'prj_demo', slug: 'demo', name: 'Demo', description: null, status: 'active' }, replayed: false } }), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, data: { organization_id: crypto.randomUUID() } }), { status: 200 }));
      const code = await runCli(['projects', 'create', '--slug', 'demo', '--name', 'Demo', '--dir', dir, '--json'], { output: output.writer, fetchImpl, platformCredentialStore: { store, reference: 'default' } });
      expect(code).toBe(0);
      const config = JSON.parse(await readFile(path.join(dir, '.atlas', 'config.json'), 'utf8'));
      expect(config.active.project_id).toBe('prj_demo');
      const body = JSON.parse(fetchImpl.mock.calls[0]![1]!.body as string);
      expect(body.organization_id).toBeUndefined();
      expect(body.idempotency_key).toMatch(/^[0-9a-f-]{36}$/);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  it('runs a qualified read tool and renders its receipt without exposing the token', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'atlas-cli-run-'));
    try {
      const output = capture(); const store = new MemoryStore();
      await store.set('default', { accessToken: 'never-print-this-token', tokenType: 'Bearer', apiBase: 'https://api.example.com', scopes: ['atlas.actions.execute'] });
      const config = new (await import('../src/local-config.js')).LocalConfigStore(dir);
      await config.write({ schema_version: 'atlas.local-config/v1', active: { workspace_id: 'ws', project_id: 'prj_demo', environment_id: 'env_demo' }, api_base: 'https://api.example.com', credential_ref: 'memory:default', updated_at: new Date().toISOString() });
      const receiptId = crypto.randomUUID();
      const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, data: { result: { matches: [] }, receipt: { schema_version: 'atlas.receipt/v1', receipt_id: receiptId, outcome: 'succeeded' } } }), { status: 200 }));
      expect(await runCli(['run', 'mirai.knowledge.search', '--input', '{"query":"hours"}', '--dir', dir, '--json'], { output: output.writer, fetchImpl, platformCredentialStore: { store, reference: 'default' } })).toBe(0);
      const body = JSON.parse(fetchImpl.mock.calls[0]![1]!.body as string);
      expect(body).toMatchObject({ tool: 'mirai.knowledge.search', mode: 'read', project_id: 'prj_demo', environment_id: 'env_demo' });
      expect(body.idempotency_key).toMatch(/^[0-9a-f-]{36}$/);
      expect(output.stdout.join('\n')).toContain(receiptId);
      expect(output.stdout.join('\n')).not.toContain('never-print-this-token');
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  it('defaults qualified actions to dry-run unless commit is explicit', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'atlas-cli-dry-run-'));
    try {
      const output = capture(); const store = new MemoryStore();
      await store.set('default', { accessToken: 'secret', tokenType: 'Bearer', apiBase: 'https://api.example.com', scopes: [] });
      const config = new (await import('../src/local-config.js')).LocalConfigStore(dir);
      await config.write({ schema_version: 'atlas.local-config/v1', active: { workspace_id: 'ws', project_id: 'prj', environment_id: 'env' }, api_base: 'https://api.example.com', credential_ref: 'memory:default', updated_at: new Date().toISOString() });
      const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, data: { result: {}, receipt: { schema_version: 'atlas.receipt/v1', receipt_id: crypto.randomUUID(), outcome: 'succeeded' } } }), { status: 200 }));
      expect(await runCli(['run', 'mirai.actions.issue_voucher', '--dir', dir, '--json'], { output: output.writer, fetchImpl, platformCredentialStore: { store, reference: 'default' } })).toBe(0);
      expect(JSON.parse(fetchImpl.mock.calls[0]![1]!.body as string).mode).toBe('dry_run');
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  it('cancels an approval-pending run by rejecting its linked approval', async () => {
    const output = capture(); const store = new MemoryStore(); const approvalId = 'apr_pending_1';
    await store.set('default', { accessToken: 'secret', tokenType: 'Bearer', apiBase: 'https://api.example.com', scopes: [] });
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, data: { run: { schema_version: 'atlas.receipt/v1', receipt_id: crypto.randomUUID(), outcome: 'approval_pending', approval: { id: approvalId } } } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, data: { approval_request_id: approvalId, status: 'rejected' } }), { status: 200 }));
    expect(await runCli(['runs', 'cancel', 'run_1', '--json'], { output: output.writer, fetchImpl, platformCredentialStore: { store, reference: 'default' } })).toBe(0);
    expect(fetchImpl.mock.calls[1]![0]).toContain(`/approvals/${approvalId}/decide`);
    expect(JSON.parse(fetchImpl.mock.calls[1]![1]!.body as string)).toMatchObject({ decision: 'rejected' });
  });

  it('replays a read as a new governed execution and refuses commit receipt replay', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'atlas-cli-replay-'));
    try {
      const output = capture(); const store = new MemoryStore();
      await store.set('default', { accessToken: 'secret', tokenType: 'Bearer', apiBase: 'https://api.example.com', scopes: [] });
      const config = new (await import('../src/local-config.js')).LocalConfigStore(dir);
      await config.write({ schema_version: 'atlas.local-config/v1', active: { workspace_id: 'ws', project_id: 'prj', environment_id: 'env' }, api_base: 'https://api.example.com', credential_ref: 'memory:default', updated_at: new Date().toISOString() });
      const receipt = { schema_version: 'atlas.receipt/v1', receipt_id: crypto.randomUUID(), outcome: 'succeeded', execution_mode: 'read', tool: { tool_id: 'mirai.atlas/knowledge.search@1' } };
      const fetchImpl = vi.fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, data: { run: receipt } }), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, data: { result: {}, receipt } }), { status: 200 }));
      expect(await runCli(['runs', 'replay', 'run_1', '--input', '{"query":"hours"}', '--dir', dir, '--json'], { output: output.writer, fetchImpl, platformCredentialStore: { store, reference: 'default' } })).toBe(0);
      expect(JSON.parse(fetchImpl.mock.calls[1]![1]!.body as string)).toMatchObject({ tool: 'mirai.atlas/knowledge.search@1', mode: 'read', input: { query: 'hours' }, project_id: 'prj', environment_id: 'env' });
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  it('exposes durable local Mission replay and typed control errors through the CLI', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'atlas-cli-mission-'));
    try {
      const dependencies = {
        output: capture().writer,
        cwd: dir,
        nodeVersion: 'v22.12.0',
        scaffoldDependencies: scaffoldDependencies(),
        platformCredentialStore: { store: new MemoryStore(), reference: 'default' },
      };
      expect(await runCli(['init', 'front-desk', '--no-install', '--no-git', '--json'], dependencies)).toBe(0);
      const root = path.join(dir, 'front-desk');
      const message = {
        message_id: 'msg-cli-mission-001', conversation_id: 'conv-cli-mission-001', customer_id: 'customer-cli-mission-001',
        channel_id: 'local-web-chat', sequence: 1, occurred_at: '2026-07-24T08:00:00.000Z',
        text: 'Can I move booking BK-100 to Friday?', consent: true, within_messaging_window: true,
      };
      const replayOutput = capture();
      expect(await runCli([
        'mission', 'replay', '--input', JSON.stringify(message), '--dir', root, '--json',
        '--tenant-id', 'tenant-cli', '--organisation-id', 'org-cli', '--project-id', 'project-cli', '--environment-id', 'local',
      ], { ...dependencies, output: replayOutput.writer, cwd: root })).toBe(0);
      expect(JSON.parse(replayOutput.stdout[0]!)).toMatchObject({ ok: true, command: 'mission replay', data: { mission: { spec: { state: 'WAITING_APPROVAL' } } } });

      const errorOutput = capture();
      expect(await runCli([
        'mission', 'pause', '--mission-id', 'missing-mission', '--dir', root, '--json',
        '--tenant-id', 'tenant-cli', '--organisation-id', 'org-cli', '--project-id', 'project-cli', '--environment-id', 'local',
      ], { ...dependencies, output: errorOutput.writer, cwd: root })).toBe(2);
      expect(JSON.parse(errorOutput.stderr[0]!)).toMatchObject({ ok: false, error: { code: 'USAGE_ERROR' } });
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  it('scaffolds the zero-credential front-desk project through atlas init', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'atlas-cli-scaffold-'));
    try {
      const output = capture(); const fetchImpl = vi.fn();
      const code = await runCli(['init', 'front-desk', '--no-install', '--no-git', '--json'], {
        output: output.writer,
        fetchImpl,
        cwd: dir,
        nodeVersion: 'v22.12.0',
        scaffoldDependencies: scaffoldDependencies(),
        platformCredentialStore: { store: new MemoryStore(), reference: 'default' },
      });

      expect(code).toBe(0);
      expect(fetchImpl).not.toHaveBeenCalled();
      expect(await readFile(path.join(dir, 'front-desk', 'atlas.config.ts'), 'utf8')).toContain('defineAtlasProject');
      expect(JSON.parse(output.stdout[0]!)).toMatchObject({
        ok: true,
        command: 'init',
        data: { status: 'completed', mode: 'new', package_manager: 'npm' },
        next_action: { code: 'dev' },
      });
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  it('adopts and rolls back an existing project without an Atlas credential', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'atlas-cli-adopt-'));
    try {
      await writeFile(path.join(dir, 'package.json'), '{"name":"existing","private":true}\n');
      const output = capture();
      const dependencies = {
        output: output.writer,
        cwd: dir,
        nodeVersion: 'v22.12.0',
        scaffoldDependencies: scaffoldDependencies(),
        platformCredentialStore: { store: new MemoryStore(), reference: 'default' },
      };

      expect(await runCli(['init', 'front-desk', '--existing', '--dir', '.', '--no-install', '--no-git', '--json'], dependencies)).toBe(0);
      expect(await readFile(path.join(dir, 'atlas.config.ts'), 'utf8')).toContain('front-desk');
      expect(await runCli(['init', 'front-desk', '--rollback', '--dir', '.', '--json'], dependencies)).toBe(0);
      await expect(readFile(path.join(dir, 'atlas.config.ts'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
      expect(await readFile(path.join(dir, 'package.json'), 'utf8')).toBe('{"name":"existing","private":true}\n');
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  it('starts and stops the deterministic local product without credentials', async () => {
    const output = capture();
    expect(await runCli(['dev', '--duration-ms', '0', '--json'], { output: output.writer, platformCredentialStore: { store: new MemoryStore(), reference: 'default' } })).toBe(0);
    expect(JSON.parse(output.stdout[0]!)).toMatchObject({ ok: true, command: 'dev', data: { deterministic: true, governed_runtime: false } });
  });

  it('binds atlas dev to the generated governed project without credentials', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'atlas-cli-governed-dev-'));
    try {
      const initOutput = capture();
      const dependencies = {
        output: initOutput.writer,
        cwd: dir,
        nodeVersion: 'v22.12.0',
        scaffoldDependencies: scaffoldDependencies(),
        platformCredentialStore: { store: new MemoryStore(), reference: 'default' },
      };
      expect(await runCli(['init', 'front-desk', '--no-install', '--no-git', '--json'], dependencies)).toBe(0);

      const devOutput = capture();
      expect(await runCli(['dev', '--duration-ms', '0', '--json'], { ...dependencies, output: devOutput.writer, cwd: path.join(dir, 'front-desk') })).toBe(0);
      expect(JSON.parse(devOutput.stdout[0]!)).toMatchObject({
        ok: true,
        command: 'dev',
        data: {
          deterministic: true,
          governed_runtime: true,
          project_root: path.join(dir, 'front-desk'),
          project_hash: expect.stringMatching(/^sha256:/),
          workbench_url: expect.stringMatching(/^http:\/\/127\.0\.0\.1:/),
        },
        next_action: { code: 'workbench' },
      });
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  it('runs the coherent local project command suite with stable JSON and no network', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'atlas-cli-local-suite-'));
    try {
      const fetchImpl = vi.fn();
      const baseDependencies = {
        cwd: dir,
        nodeVersion: 'v22.12.0',
        fetchImpl,
        scaffoldDependencies: scaffoldDependencies(),
        platformCredentialStore: { store: new MemoryStore(), reference: 'default' },
      };
      const initOutput = capture();
      expect(await runCli(['init', 'front-desk', '--no-install', '--no-git', '--json'], { ...baseDependencies, output: initOutput.writer })).toBe(0);
      const root = path.join(dir, 'front-desk');
      const commands: Array<{ args: string[]; command: string; assertion: (data: Record<string, any>) => void }> = [
        { args: ['test', '--json'], command: 'test', assertion: (data) => expect(data).toMatchObject({ status: 'passed', exactly_once: true, action_count: 1 }) },
        { args: ['doctor', '--json'], command: 'doctor', assertion: (data) => expect(data.summary).toMatchObject({ fail: 0 }) },
        { args: ['capabilities', '--json'], command: 'capabilities', assertion: (data) => expect(data).toMatchObject({ runtime: 'native', zero_credentials: true }) },
        { args: ['explain', 'project', '--json'], command: 'explain project', assertion: (data) => expect(data.config.project.name).toBe('front-desk') },
        { args: ['inspect', '--json'], command: 'inspect', assertion: (data) => expect(data.runtime_state).toBe('not_created') },
        { args: ['replay', '--json'], command: 'replay', assertion: (data) => expect(data).toMatchObject({ status: 'passed', final: { action_count: 1, replayed: true } }) },
        { args: ['deploy', '--json'], command: 'deploy', assertion: (data) => expect(data).toMatchObject({ status: 'local_ready', hosted_apply_available: false }) },
        { args: ['upgrade', '--json'], command: 'upgrade', assertion: (data) => expect(data).toMatchObject({ changed: false, to_version: '1' }) },
      ];

      for (const item of commands) {
        const output = capture();
        const code = await runCli(item.args, { ...baseDependencies, output: output.writer, cwd: root });
        const response = JSON.parse(output.stdout[0]!);
        expect(code, item.args.join(' ')).toBe(0);
        expect(response).toMatchObject({ ok: true, command: item.command, next_action: { code: expect.any(String), label: expect.any(String) } });
        item.assertion(response.data);
      }
      expect(fetchImpl).not.toHaveBeenCalled();
      await expect(readFile(path.join(root, '.atlas', 'runtime-state.json'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  it('triggers and replays webhook fixtures without live Atlas credentials', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'atlas-cli-webhook-'));
    const server = await startAtlasDevServer();
    try {
      const output = capture(); const dependencies = { output: output.writer, platformCredentialStore: { store: new MemoryStore(), reference: 'default' } };
      expect(await runCli(['webhooks', 'trigger', 'atlas.execution.completed', '--url', server.url, '--input', '{"run_id":"run_triggered"}', '--json'], dependencies)).toBe(0);
      const eventFile = path.join(dir, 'event.json');
      await writeFile(eventFile, JSON.stringify({ id: 'evt_replay', type: 'atlas.execution.failed', data: { run_id: 'run_replayed' } }));
      expect(await runCli(['webhooks', 'replay', eventFile, '--url', server.url, '--json'], dependencies)).toBe(0);
      const events = await fetch(`${server.url}/events`).then((response) => response.json());
      expect(events.events).toHaveLength(2);
      expect(events.events[1]).toMatchObject({ id: 'evt_replay', data: { run_id: 'run_replayed' } });
    } finally { await server.close(); await rm(dir, { recursive: true, force: true }); }
  });

  it('follows a trace with an explicit bounded poll count', async () => {
    const output = capture(); const store = new MemoryStore();
    await store.set('default', { accessToken: 'secret', tokenType: 'Bearer', apiBase: 'https://api.example.com', scopes: [] });
    const fetchImpl = vi.fn().mockImplementation(async () => new Response(JSON.stringify({ ok: true, data: { trace_id: 'trace_1', events: [] } }), { status: 200 }));
    expect(await runCli(['logs', 'follow', 'trace_1', '--max-polls', '2', '--interval-ms', '0', '--json'], { output: output.writer, fetchImpl, platformCredentialStore: { store, reference: 'default' } })).toBe(0);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(JSON.parse(output.stdout[0]!)).toMatchObject({ data: { trace_id: 'trace_1', polls: 2 } });
  });
});
