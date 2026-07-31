import { afterEach, describe, expect, it } from 'vitest';
import { chmod, mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { OperationLock } from '../src/operation-journal.js';

const dirs: string[] = [];
afterEach(async () => Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true }))));

async function tempRoot() { const dir = await mkdtemp(path.join(os.tmpdir(), 'atlas-lock-')); dirs.push(dir); return dir; }

describe('OperationLock', () => {
  it('rejects a concurrent live operation', async () => {
    const root = await tempRoot();
    const first = new OperationLock(root);
    await first.acquire();
    await expect(new OperationLock(root).acquire()).rejects.toMatchObject({ code: 'LOCAL_STATE_ERROR' });
    await first.release();
  });

  it('reclaims a verified stale lock', async () => {
    const root = await tempRoot();
    await mkdir(path.join(root, '.atlas'), { recursive: true });
    await chmod(path.join(root, '.atlas'), 0o700);
    await writeFile(path.join(root, '.atlas', 'lock'), JSON.stringify({ pid: 99999999, created_at: '1970-01-01T00:00:00Z' }));
    const lock = new OperationLock(root);
    await lock.acquire();
    await lock.release();
  });

  it('does not reclaim an old lock while its owner process is still alive', async () => {
    const root = await tempRoot();
    await mkdir(path.join(root, '.atlas'), { recursive: true });
    await chmod(path.join(root, '.atlas'), 0o700);
    await writeFile(path.join(root, '.atlas', 'lock'), JSON.stringify({ pid: process.pid, created_at: '1970-01-01T00:00:00Z', operation_id: 'live-owner' }));
    await expect(new OperationLock(root).acquire()).rejects.toMatchObject({ code: 'LOCAL_STATE_ERROR' });
  });

  it('does not remove a replacement owner lock during late release', async () => {
    const root = await tempRoot();
    const first = new OperationLock(root);
    await first.acquire();
    const lockPath = path.join(root, '.atlas', 'lock');
    await rm(lockPath);
    const replacement = new OperationLock(root);
    await replacement.acquire();

    await first.release();
    await expect(replacement.release()).resolves.toBeUndefined();
  });
});
