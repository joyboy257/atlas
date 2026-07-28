import { afterEach, describe, expect, it } from 'vitest';
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { installMcp, mcpStatus, uninstallMcp } from '../src/mcp-manager.js';

const dirs: string[] = [];
afterEach(async () => Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true }))));

describe('MCP lifecycle', () => {
  it('installs idempotently and removes only Atlas', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'atlas-mcp-')); dirs.push(root);
    await chmod(root, 0o755);
    await writeFile(path.join(root, '.mcp.json'), JSON.stringify({ mcpServers: { other: { command: 'other' } } }));
    expect((await installMcp(root, 'generic', 'https://api.example.com')).changed).toBe(true);
    expect((await installMcp(root, 'generic', 'https://api.example.com')).changed).toBe(false);
    expect((await mcpStatus(root, 'generic')).installed).toBe(true);
    expect((await uninstallMcp(root, 'generic')).changed).toBe(true);
    const value = JSON.parse(await readFile(path.join(root, '.mcp.json'), 'utf8'));
    expect(value.mcpServers).toEqual({ other: { command: 'other' } });
  });

  it('refuses to replace or remove an unowned or drifted Atlas entry', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'atlas-mcp-')); dirs.push(root); await chmod(root, 0o755);
    await writeFile(path.join(root, '.mcp.json'), JSON.stringify({ mcpServers: { atlas: { command: 'user-owned' } } }));
    await expect(installMcp(root, 'generic', 'https://api.example.com')).rejects.toMatchObject({ code: 'CONFLICT' });
    await writeFile(path.join(root, '.mcp.json'), '{}'); await installMcp(root, 'generic', 'https://api.example.com');
    await writeFile(path.join(root, '.mcp.json'), JSON.stringify({ mcpServers: { atlas: { url: 'https://changed.example' } } }));
    await expect(uninstallMcp(root, 'generic')).rejects.toMatchObject({ code: 'CONFLICT' });
  });
});
