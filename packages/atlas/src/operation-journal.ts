import { open, readFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { AtlasCliError } from './errors.js';
import { atomicWrite, ensurePrivateDirectory, readUtf8Safe } from './fs-safety.js';

export type InitPhase = 'start' | 'inspect' | 'authenticate' | 'workspace' | 'project' | 'environment' | 'project_config' | 'mcp_config' | 'first_request' | 'complete';
export type FileMutation = Readonly<{ path: string; action: 'create' | 'merge' | 'replace'; backup_path: string | null; before_digest: string | null; after_digest: string }>;
export type OperationJournal = Readonly<{
  schema_version: 'atlas.operation-journal/v1'; operation_id: string; command: 'init'; fingerprint: string;
  phase: InitPhase; status: 'in_progress' | 'interrupted' | 'completed' | 'rolling_back' | 'rolled_back' | 'failed';
  started_at: string; updated_at: string; file_mutations: readonly FileMutation[];
  remote_idempotency_keys: Readonly<Record<string, string>>; rollback_steps: readonly Readonly<{ code: string; status: 'pending' | 'completed' | 'skipped' | 'failed' }>[];
  context: Readonly<Record<string, unknown>>;
}>;

export class JournalStore {
  readonly filePath: string;
  constructor(root: string) { this.filePath = path.resolve(root, '.atlas', 'state.json'); }
  async read(): Promise<OperationJournal | null> {
    const raw = await readUtf8Safe(this.filePath); if (raw === null) return null;
    try {
      const value = JSON.parse(raw) as OperationJournal;
      if (value.schema_version !== 'atlas.operation-journal/v1' || value.command !== 'init') throw new Error('invalid schema');
      return value;
    } catch (error) { throw new AtlasCliError('LOCAL_STATE_ERROR', `Invalid Atlas operation journal: ${String(error)}`); }
  }
  async write(journal: OperationJournal) { await atomicWrite(this.filePath, `${JSON.stringify(journal, null, 2)}\n`); }
  async remove() { await rm(this.filePath, { force: true }); }
}

export class OperationLock {
  readonly filePath: string;
  private owned = false;
  private operationId: string | null = null;
  constructor(root: string, options: Readonly<{ filePath?: string }> = {}) {
    this.filePath = options.filePath ?? path.resolve(root, '.atlas', 'lock');
  }

  async acquire(): Promise<void> {
    await ensurePrivateDirectory(path.dirname(this.filePath));
    try { await this.create(); return; }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      if (await reclaimMarkerIsLive(`${this.filePath}.reclaim`)) {
        throw new AtlasCliError('LOCAL_STATE_ERROR', 'Another Atlas operation is reclaiming the stale lock', {
          nextAction: 'Retry after the current Atlas operation finishes',
        });
      }
      const existing = await this.readExisting();
      if (!isStale(existing)) throw new AtlasCliError('LOCAL_STATE_ERROR', `Another Atlas operation is running (pid ${existing.pid})`, { nextAction: 'Wait for it to finish or remove a verified .atlas/lock' });
      const reclaimPath = `${this.filePath}.reclaim`;
      await createReclaimMarker(reclaimPath);
      try {
        const confirmed = await this.readExisting();
        if (!sameLock(existing, confirmed)) {
          throw new AtlasCliError('LOCAL_STATE_ERROR', 'Another Atlas operation replaced the stale lock during recovery', {
            nextAction: 'Retry after the current Atlas operation finishes',
          });
        }
        const stalePath = `${this.filePath}.stale.${randomUUID()}`;
        try {
          await rename(this.filePath, stalePath);
        } catch (renameError) {
          if ((renameError as NodeJS.ErrnoException).code === 'ENOENT') {
            await this.acquire();
            return;
          }
          throw renameError;
        }
        await rm(stalePath, { force: true });
        await this.create();
      } finally {
        await rm(reclaimPath, { force: true });
      }
    }
  }

  async release(): Promise<void> {
    const operationId = this.operationId;
    this.owned = false;
    this.operationId = null;
    if (!operationId) return;
    try {
      const existing = JSON.parse(await readFile(this.filePath, 'utf8')) as { operation_id?: unknown };
      if (existing.operation_id === operationId) await rm(this.filePath, { force: true });
    } catch {
      // The lock may already have been released or replaced by another owner.
    }
  }
  private async create() {
    const handle = await open(this.filePath, 'wx', 0o600);
    const operationId = randomUUID();
    try { await handle.writeFile(JSON.stringify({ pid: process.pid, operation_id: operationId, created_at: new Date().toISOString() })); await handle.sync(); this.owned = true; this.operationId = operationId; }
    finally { await handle.close(); }
  }
  private async readExisting(): Promise<{ pid: number; created_at: string; operation_id?: string }> {
    try {
      const parsed = JSON.parse(await readFile(this.filePath, 'utf8')) as { pid?: unknown; created_at?: unknown; operation_id?: unknown };
      if (Number.isInteger(parsed.pid) && typeof parsed.created_at === 'string') {
        return {
          pid: parsed.pid as number,
          created_at: parsed.created_at,
          ...(typeof parsed.operation_id === 'string' ? { operation_id: parsed.operation_id } : {}),
        };
      }
    } catch {
      // A newly-created lock can be observed before its metadata is flushed.
    }
    return { pid: process.pid, created_at: new Date().toISOString() };
  }
}

async function createReclaimMarker(filePath: string): Promise<void> {
  let handle;
  try {
    handle = await open(filePath, 'wx', 0o600);
    await handle.writeFile(JSON.stringify({ pid: process.pid, created_at: new Date().toISOString() }));
    await handle.sync();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new AtlasCliError('LOCAL_STATE_ERROR', 'Another Atlas operation is reclaiming the stale lock', {
        nextAction: 'Retry after the current Atlas operation finishes',
      });
    }
    throw error;
  } finally {
    await handle?.close();
  }
}

async function reclaimMarkerIsLive(filePath: string): Promise<boolean> {
  try {
    const parsed = JSON.parse(await readFile(filePath, 'utf8')) as { pid?: unknown };
    if (!Number.isInteger(parsed.pid) || Number(parsed.pid) <= 0) return true;
    try {
      process.kill(Number(parsed.pid), 0);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ESRCH') return true;
      await rm(filePath, { force: true });
      return false;
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    return true;
  }
}

function sameLock(
  left: { pid: number; created_at: string; operation_id?: string },
  right: { pid: number; created_at: string; operation_id?: string },
): boolean {
  return left.pid === right.pid &&
    left.created_at === right.created_at &&
    left.operation_id === right.operation_id;
}

function isStale(value: { pid: number; created_at: string }): boolean {
  if (!Number.isInteger(value.pid) || value.pid <= 0) return true;
  try {
    process.kill(value.pid, 0);
    return false;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ESRCH') return false;
    return true;
  }
}
