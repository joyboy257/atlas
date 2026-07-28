import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { InitEngine } from '../src/init-engine.js';
import { JournalStore } from '../src/operation-journal.js';
import type { AtlasPlatformClient, EnvironmentRecord, ProjectRecord } from '../src/platform-client.js';
import type { CredentialRecord, CredentialStoreSelection } from '../src/credentials/index.js';

const dirs: string[] = [];
afterEach(async () => Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true }))));

const project: ProjectRecord = { id: 'db-project', external_id: 'prj_demo', slug: 'demo', name: 'Demo', description: null, status: 'active' };
const environment: EnvironmentRecord = { id: 'db-env', external_id: 'env_sandbox', project_id: project.id, slug: 'sandbox', name: 'Sandbox', environment_type: 'sandbox', status: 'active' };
const credential: CredentialRecord = { accessToken: 'secret', tokenType: 'Bearer', scopes: [], apiBase: 'https://api.example.com' };
const credentialSelection = { reference: 'default', store: { kind: 'memory', get: vi.fn(), set: vi.fn(), delete: vi.fn() } } as unknown as CredentialStoreSelection;

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'atlas-init-')); dirs.push(root);
  await writeFile(path.join(root, 'atlas.yaml'), 'original: true\n');
  await writeFile(path.join(root, '.mcp.json'), `${JSON.stringify({ mcpServers: { existing: { command: 'demo' } } }, null, 2)}\n`);
  const platform = {
    identity: vi.fn().mockResolvedValue({ workspace_id: 'workspace-1' }),
    createProject: vi.fn().mockResolvedValue({ project, replayed: false }),
    showProject: vi.fn().mockResolvedValue(project),
    createEnvironment: vi.fn().mockResolvedValue({ environment, replayed: false }),
    showEnvironment: vi.fn().mockResolvedValue(environment),
    execute: vi.fn().mockResolvedValue({ result: { results: [] }, receipt: { schema_version: 'atlas.receipt/v1', receipt_id: '00000000-0000-4000-8000-000000000099', outcome: 'succeeded' } }),
  } as unknown as AtlasPlatformClient;
  return { root, platform };
}

function engine(platform: AtlasPlatformClient, afterPhase?: (phase: string) => void) {
  return new InitEngine({ platform, credential, credentialSelection, afterPhase: afterPhase as never });
}

describe('InitEngine', () => {
  it('creates a complete, credential-free local setup while preserving MCP entries', async () => {
    const { root, platform } = await fixture();
    const result = await engine(platform).run({ root, client: 'generic', apiBase: credential.apiBase });
    const mcp = JSON.parse(await readFile(path.join(root, '.mcp.json'), 'utf8'));
    const journal = await new JournalStore(root).read();

    expect(result.project.external_id).toBe('prj_demo');
    expect(mcp.mcpServers.existing).toEqual({ command: 'demo' });
    expect(mcp.mcpServers.atlas.url).toBe('https://api.example.com/atlas/v1/mcp');
    expect(await readFile(path.join(root, '.atlas', 'config.json'), 'utf8')).not.toContain('secret');
    expect(journal?.status).toBe('completed');
  });

  it('resumes after interruption without repeating completed remote writes', async () => {
    const { root, platform } = await fixture();
    let interrupt = true;
    await expect(engine(platform, (phase) => { if (interrupt && phase === 'project_config') throw new Error('simulated crash'); }).run({ root, client: 'generic', apiBase: credential.apiBase })).rejects.toThrow('simulated crash');
    interrupt = false;
    const result = await engine(platform).run({ root, client: 'generic', apiBase: credential.apiBase });

    expect(result.resumed).toBe(true);
    expect(platform.createProject).toHaveBeenCalledTimes(1);
    expect(platform.createEnvironment).toHaveBeenCalledTimes(1);
    expect((await new JournalStore(root).read())?.status).toBe('completed');
  });

  it('rolls back local mutations and retains remote resources', async () => {
    const { root, platform } = await fixture();
    await expect(engine(platform, (phase) => { if (phase === 'mcp_config') throw new Error('stop'); }).run({ root, client: 'generic', apiBase: credential.apiBase })).rejects.toThrow('stop');
    await expect(engine(platform).run({ root, client: 'generic', apiBase: credential.apiBase, rollback: true })).rejects.toThrow(/rolled back/);

    expect(await readFile(path.join(root, 'atlas.yaml'), 'utf8')).toBe('original: true\n');
    expect(JSON.parse(await readFile(path.join(root, '.mcp.json'), 'utf8')).mcpServers.atlas).toBeUndefined();
    expect((await new JournalStore(root).read())?.status).toBe('rolled_back');
    expect(platform.createProject).toHaveBeenCalledTimes(1);
    expect(platform.createEnvironment).toHaveBeenCalledTimes(1);
  });
});
