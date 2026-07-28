import { chmod, lstat, mkdir, open, rename, rm } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { CredentialRecord, CredentialStore } from './types.js';
import { AtlasCliError } from '../errors.js';

type CredentialFile = { schema_version: 'atlas.credentials/v1'; credentials: Record<string, CredentialRecord> };
const queues = new Map<string, Promise<void>>();

export class SecureFileCredentialStore implements CredentialStore {
  readonly kind = 'secure-file' as const;
  constructor(readonly filePath: string) {}

  async get(reference: string): Promise<CredentialRecord | null> {
    return (await this.read()).credentials[reference] ?? null;
  }

  async set(reference: string, credential: CredentialRecord): Promise<void> {
    await this.serialized(async () => {
      const data = await this.read();
      await this.write({ ...data, credentials: { ...data.credentials, [reference]: credential } });
    });
  }

  async delete(reference: string): Promise<boolean> {
    let removed = false;
    await this.serialized(async () => {
      const data = await this.read();
      if (!(reference in data.credentials)) return;
      const credentials = { ...data.credentials };
      delete credentials[reference];
      await this.write({ ...data, credentials });
      removed = true;
    });
    return removed;
  }

  private async serialized(operation: () => Promise<void>): Promise<void> {
    const prior = queues.get(this.filePath) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => { release = resolve; });
    const queued = prior.then(() => current);
    queues.set(this.filePath, queued);
    await prior;
    try { await operation(); }
    finally { release(); if (queues.get(this.filePath) === queued) queues.delete(this.filePath); }
  }

  private async read(): Promise<CredentialFile> {
    try {
      const stat = await lstat(this.filePath);
      if (stat.isSymbolicLink() || !stat.isFile()) throw unsafe(this.filePath);
      if (typeof process.getuid === 'function' && stat.uid !== process.getuid()) throw unsafe(this.filePath);
      if ((stat.mode & 0o077) !== 0) throw new AtlasCliError('LOCAL_STATE_ERROR', `Credential file permissions must be 0600: ${this.filePath}`);
      const handle = await open(this.filePath, constants.O_RDONLY | noFollow());
      try {
        const parsed = JSON.parse(await handle.readFile('utf8')) as CredentialFile;
        if (parsed.schema_version !== 'atlas.credentials/v1' || !parsed.credentials) throw new Error('invalid schema');
        return parsed;
      } finally { await handle.close(); }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { schema_version: 'atlas.credentials/v1', credentials: {} };
      if (error instanceof AtlasCliError) throw error;
      throw new AtlasCliError('LOCAL_STATE_ERROR', `Could not read credential store: ${String(error)}`);
    }
  }

  private async write(data: CredentialFile): Promise<void> {
    const directory = path.dirname(this.filePath);
    await ensurePrivateDirectory(directory);
    const temp = path.join(directory, `.${path.basename(this.filePath)}.${randomUUID()}.tmp`);
    let handle;
    try {
      handle = await open(temp, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | noFollow(), 0o600);
      await handle.writeFile(`${JSON.stringify(data, null, 2)}\n`, 'utf8');
      await handle.sync();
      await handle.close();
      handle = undefined;
      await rename(temp, this.filePath);
    } finally {
      await handle?.close().catch(() => undefined);
      await rm(temp, { force: true }).catch(() => undefined);
    }
  }
}

async function ensurePrivateDirectory(directory: string): Promise<void> {
  try {
    const stat = await lstat(directory);
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw unsafe(directory);
    if (typeof process.getuid === 'function' && stat.uid !== process.getuid()) throw unsafe(directory);
    if ((stat.mode & 0o077) !== 0) throw new AtlasCliError('LOCAL_STATE_ERROR', `Credential directory permissions must be 0700: ${directory}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const stat = await lstat(directory);
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw unsafe(directory);
    await chmod(directory, 0o700);
  }
}

function noFollow(): number { return process.platform === 'win32' ? 0 : constants.O_NOFOLLOW; }
function unsafe(value: string): AtlasCliError { return new AtlasCliError('LOCAL_STATE_ERROR', `Unsafe credential path: ${value}`); }
