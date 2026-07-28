import { afterEach, describe, expect, it } from 'vitest';
import { lstat, mkdtemp, readFile, rm, symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { LocalConfigStore } from '../src/local-config.js';

const dirs: string[] = [];
afterEach(async () => Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true }))));

describe('LocalConfigStore', () => {
  it('atomically writes non-secret active selectors', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'atlas-config-')); dirs.push(dir);
    const store = new LocalConfigStore(dir);
    await store.write({ schema_version: 'atlas.local-config/v1', active: { workspace_id: 'workspace', project_id: 'prj_demo' }, api_base: 'https://api.example.com', credential_ref: 'keychain:default', updated_at: new Date().toISOString() });
    expect((await store.read())?.active.project_id).toBe('prj_demo');
    expect((await lstat(store.filePath)).mode & 0o777).toBe(0o600);
    expect(await readFile(store.filePath, 'utf8')).not.toContain('accessToken');
  });

  it('rejects a symlinked Atlas directory', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'atlas-config-')); dirs.push(dir);
    const target = path.join(dir, 'target'); await (await import('node:fs/promises')).mkdir(target);
    await symlink(target, path.join(dir, '.atlas'));
    await expect(new LocalConfigStore(dir).write({ schema_version: 'atlas.local-config/v1', active: { workspace_id: 'workspace' }, api_base: 'https://api.example.com', credential_ref: 'file:default', updated_at: new Date().toISOString() })).rejects.toMatchObject({ code: 'LOCAL_STATE_ERROR' });
  });
});
