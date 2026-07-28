import { open, readFile, rm } from 'node:fs/promises';
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
  constructor(root: string) { this.filePath = path.resolve(root, '.atlas', 'lock'); }

  async acquire(): Promise<void> {
    await ensurePrivateDirectory(path.dirname(this.filePath));
    try { await this.create(); return; }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      const existing = await this.readExisting();
      if (!isStale(existing)) throw new AtlasCliError('LOCAL_STATE_ERROR', `Another Atlas operation is running (pid ${existing.pid})`, { nextAction: 'Wait for it to finish or remove a verified stale .atlas/lock' });
      await rm(this.filePath, { force: true });
      await this.create();
    }
  }

  async release(): Promise<void> { if (this.owned) await rm(this.filePath, { force: true }); this.owned = false; }
  private async create() {
    const handle = await open(this.filePath, 'wx', 0o600);
    try { await handle.writeFile(JSON.stringify({ pid: process.pid, operation_id: randomUUID(), created_at: new Date().toISOString() })); await handle.sync(); this.owned = true; }
    finally { await handle.close(); }
  }
  private async readExisting(): Promise<{ pid: number; created_at: string }> {
    try { return JSON.parse(await readFile(this.filePath, 'utf8')); }
    catch { return { pid: -1, created_at: '1970-01-01T00:00:00Z' }; }
  }
}

function isStale(value: { pid: number; created_at: string }): boolean {
  if (Date.now() - Date.parse(value.created_at) > 30 * 60_000) return true;
  if (!Number.isInteger(value.pid) || value.pid <= 0) return true;
  try { process.kill(value.pid, 0); return false; }
  catch (error) { return (error as NodeJS.ErrnoException).code === 'ESRCH'; }
}
