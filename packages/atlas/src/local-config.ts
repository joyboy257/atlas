import { chmod, lstat, mkdir, open, rename, rm } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { AtlasCliError } from './errors.js';

export type AtlasLocalConfig = Readonly<{
  schema_version: 'atlas.local-config/v1';
  active: Readonly<{ workspace_id: string; project_id?: string; environment_id?: string }>;
  api_base: string;
  credential_ref: string;
  updated_at: string;
}>;

export class LocalConfigStore {
  readonly filePath: string;
  constructor(directory: string) { this.filePath = path.resolve(directory, '.atlas', 'config.json'); }

  async read(): Promise<AtlasLocalConfig | null> {
    try {
      const stat = await lstat(this.filePath);
      if (stat.isSymbolicLink() || !stat.isFile()) throw unsafe(this.filePath);
      const handle = await open(this.filePath, constants.O_RDONLY | noFollow());
      try {
        const value = JSON.parse(await handle.readFile('utf8')) as AtlasLocalConfig;
        if (value.schema_version !== 'atlas.local-config/v1' || !value.active?.workspace_id) throw new Error('invalid schema');
        return value;
      } finally { await handle.close(); }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      if (error instanceof AtlasCliError) throw error;
      throw new AtlasCliError('LOCAL_STATE_ERROR', `Could not read Atlas config: ${String(error)}`);
    }
  }

  async write(value: AtlasLocalConfig): Promise<void> {
    const directory = path.dirname(this.filePath);
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const stat = await lstat(directory);
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw unsafe(directory);
    await chmod(directory, 0o700);
    const temp = path.join(directory, `.config.${randomUUID()}.tmp`);
    let handle;
    try {
      handle = await open(temp, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | noFollow(), 0o600);
      await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, 'utf8'); await handle.sync(); await handle.close(); handle = undefined;
      await rename(temp, this.filePath);
    } finally { await handle?.close().catch(() => undefined); await rm(temp, { force: true }).catch(() => undefined); }
  }
}

function noFollow() { return process.platform === 'win32' ? 0 : constants.O_NOFOLLOW; }
function unsafe(value: string) { return new AtlasCliError('LOCAL_STATE_ERROR', `Unsafe Atlas config path: ${value}`); }
