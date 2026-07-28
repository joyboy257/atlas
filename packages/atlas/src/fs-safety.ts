import { chmod, lstat, mkdir, open, rename, rm, copyFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { AtlasCliError } from './errors.js';

export async function ensurePrivateDirectory(directory: string): Promise<void> {
  try {
    const stat = await lstat(directory);
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw unsafe(directory);
    if (typeof process.getuid === 'function' && stat.uid !== process.getuid()) throw unsafe(directory);
    if ((stat.mode & 0o077) !== 0) throw new AtlasCliError('LOCAL_STATE_ERROR', `Directory permissions must be 0700: ${directory}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    const parent = path.dirname(directory);
    if (parent !== directory) await assertExistingAncestorsSafe(parent);
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const stat = await lstat(directory);
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw unsafe(directory);
    await chmod(directory, 0o700);
  }
}

export async function atomicWrite(filePath: string, contents: string, mode = 0o600): Promise<void> {
  const directory = path.dirname(filePath);
  await ensurePrivateDirectory(directory);
  await assertNotSymlink(filePath, true);
  const temp = path.join(directory, `.${path.basename(filePath)}.${randomUUID()}.tmp`);
  let handle;
  try {
    handle = await open(temp, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | noFollow(), mode);
    await handle.writeFile(contents, 'utf8');
    await handle.sync();
    await handle.close(); handle = undefined;
    await rename(temp, filePath);
  } finally {
    await handle?.close().catch(() => undefined);
    await rm(temp, { force: true }).catch(() => undefined);
  }
}

/** Atomic writer for non-secret project/client configuration in ordinary 0755 directories. */
export async function atomicWriteProjectFile(filePath: string, contents: string, mode = 0o600): Promise<void> {
  const directory = path.dirname(filePath);
  await assertExistingAncestorsSafe(directory);
  await mkdir(directory, { recursive: true });
  const directoryStat = await lstat(directory);
  if (directoryStat.isSymbolicLink() || !directoryStat.isDirectory()) throw unsafe(directory);
  if (typeof process.getuid === 'function' && directoryStat.uid !== process.getuid()) throw unsafe(directory);
  await assertNotSymlink(filePath, true);
  const temp = path.join(directory, `.${path.basename(filePath)}.${randomUUID()}.tmp`);
  let handle;
  try {
    handle = await open(temp, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | noFollow(), mode);
    await handle.writeFile(contents, 'utf8'); await handle.sync(); await handle.close(); handle = undefined;
    await rename(temp, filePath);
  } finally { await handle?.close().catch(() => undefined); await rm(temp, { force: true }).catch(() => undefined); }
}

export async function readUtf8Safe(filePath: string): Promise<string | null> {
  try {
    await assertNotSymlink(filePath, false);
    const handle = await open(filePath, constants.O_RDONLY | noFollow());
    try { return await handle.readFile('utf8'); }
    finally { await handle.close(); }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

export async function backupFile(filePath: string, backupPath: string): Promise<boolean> {
  const existing = await readUtf8Safe(filePath);
  if (existing === null) return false;
  await ensurePrivateDirectory(path.dirname(backupPath));
  await assertNotSymlink(backupPath, true);
  await copyFile(filePath, backupPath, constants.COPYFILE_EXCL);
  await chmod(backupPath, 0o600);
  return true;
}

export function sha256(contents: string): string {
  return `sha256:${createHash('sha256').update(contents, 'utf8').digest('hex')}`;
}

async function assertExistingAncestorsSafe(start: string): Promise<void> {
  let current = path.resolve(start);
  const root = path.parse(current).root;
  while (current !== root) {
    try {
      const stat = await lstat(current);
      if (stat.isSymbolicLink() || !stat.isDirectory()) throw unsafe(current);
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      current = path.dirname(current);
    }
  }
}

async function assertNotSymlink(filePath: string, allowMissing: boolean): Promise<void> {
  try {
    const stat = await lstat(filePath);
    if (stat.isSymbolicLink() || !stat.isFile()) throw unsafe(filePath);
  } catch (error) {
    if (allowMissing && (error as NodeJS.ErrnoException).code === 'ENOENT') return;
    throw error;
  }
}

function noFollow() { return process.platform === 'win32' ? 0 : constants.O_NOFOLLOW; }
function unsafe(value: string) { return new AtlasCliError('LOCAL_STATE_ERROR', `Unsafe filesystem path: ${value}`); }
