import { afterEach, describe, expect, it } from 'vitest';
import { lstat, mkdtemp, readFile, rm, symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { SecureFileCredentialStore } from '../src/credentials/secure-file.js';

const directories: string[] = [];
afterEach(async () => Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))));

describe('SecureFileCredentialStore', () => {
  it('writes mode-0600 credentials atomically and deletes only the selected reference', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'atlas-credentials-'));
    directories.push(directory);
    const file = path.join(directory, '.atlas', 'credentials.json');
    const store = new SecureFileCredentialStore(file);
    await store.set('one', { accessToken: 'token-one', tokenType: 'Bearer', apiBase: 'https://api.example.com', scopes: [] });
    await store.set('two', { accessToken: 'token-two', tokenType: 'Bearer', apiBase: 'https://api.example.com', scopes: [] });

    expect((await lstat(file)).mode & 0o777).toBe(0o600);
    expect((await store.get('one'))?.accessToken).toBe('token-one');
    expect(await store.delete('one')).toBe(true);
    expect(await store.get('one')).toBeNull();
    expect((await store.get('two'))?.accessToken).toBe('token-two');
    expect(await readFile(file, 'utf8')).not.toContain('one":');
  });

  it('fails closed when the credential path is a symlink', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'atlas-credentials-'));
    directories.push(directory);
    const target = path.join(directory, 'target.json');
    const link = path.join(directory, 'credentials.json');
    await symlink(target, link);
    const store = new SecureFileCredentialStore(link);
    await expect(store.set('default', { accessToken: 'secret', tokenType: 'Bearer', apiBase: 'https://api.example.com', scopes: [] })).rejects.toMatchObject({ code: 'LOCAL_STATE_ERROR' });
  });

  it('fails closed when the credential directory is a symlink', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'atlas-credentials-'));
    directories.push(directory);
    const target = path.join(directory, 'target');
    const atlasDirectory = path.join(directory, '.atlas');
    await (await import('node:fs/promises')).mkdir(target);
    await symlink(target, atlasDirectory);
    const store = new SecureFileCredentialStore(path.join(atlasDirectory, 'credentials.json'));
    await expect(store.set('default', { accessToken: 'secret', tokenType: 'Bearer', apiBase: 'https://api.example.com', scopes: [] })).rejects.toMatchObject({ code: 'LOCAL_STATE_ERROR' });
  });

  it('serializes concurrent writes without losing distinct references', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'atlas-credentials-'));
    directories.push(directory);
    const store = new SecureFileCredentialStore(path.join(directory, '.atlas', 'credentials.json'));
    await Promise.all(Array.from({ length: 12 }, (_, index) => store.set(`ref-${index}`, { accessToken: `token-${index}`, tokenType: 'Bearer', apiBase: 'https://api.example.com', scopes: [] })));
    await Promise.all(Array.from({ length: 12 }, async (_, index) => expect((await store.get(`ref-${index}`))?.accessToken).toBe(`token-${index}`)));
  });
});
