import { spawn } from 'node:child_process';
import { CredentialStoreUnavailableError, type CredentialRecord, type CredentialStore } from './types.js';
import { AtlasCliError } from '../errors.js';

export class LinuxSecretServiceCredentialStore implements CredentialStore {
  readonly kind = 'secret-service' as const;

  async get(reference: string): Promise<CredentialRecord | null> {
    const result = await runSecretTool(['lookup', 'service', 'atlas', 'account', reference]);
    if (result.code === 127) throw new CredentialStoreUnavailableError(result.stderr);
    if (result.code === 1 && !result.stderr.trim()) return null;
    if (result.code !== 0) throw new AtlasCliError('LOCAL_STATE_ERROR', `Secret Service lookup failed: ${result.stderr.trim()}`);
    if (!result.stdout.trim()) return null;
    try { return JSON.parse(result.stdout.trim()) as CredentialRecord; }
    catch { throw new AtlasCliError('LOCAL_STATE_ERROR', 'Stored Atlas credential is invalid'); }
  }

  async set(reference: string, credential: CredentialRecord): Promise<void> {
    const result = await runSecretTool(['store', '--label=Mirai Atlas CLI', 'service', 'atlas', 'account', reference], JSON.stringify(credential));
    if (result.code === 127) throw new CredentialStoreUnavailableError(result.stderr);
    if (result.code !== 0) throw new AtlasCliError('LOCAL_STATE_ERROR', `Secret Service operation failed: ${result.stderr.trim()}`);
  }

  async delete(reference: string): Promise<boolean> {
    const result = await runSecretTool(['clear', 'service', 'atlas', 'account', reference]);
    if (result.code === 127) throw new CredentialStoreUnavailableError(result.stderr);
    if (result.code === 1 && !result.stderr.trim()) return false;
    if (result.code !== 0) throw new AtlasCliError('LOCAL_STATE_ERROR', `Secret Service delete failed: ${result.stderr.trim()}`);
    return true;
  }
}

async function runSecretTool(args: readonly string[], stdin?: string): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn('secret-tool', [...args], { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = ''; let stderr = '';
    child.stdout.setEncoding('utf8').on('data', (chunk) => { stdout += chunk; });
    child.stderr.setEncoding('utf8').on('data', (chunk) => { stderr += chunk; });
    child.on('error', (error: NodeJS.ErrnoException) => error.code === 'ENOENT'
      ? resolve({ code: 127, stdout: '', stderr: 'secret-tool is not installed' })
      : reject(error));
    child.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }));
    child.stdin.end(stdin === undefined ? undefined : `${stdin}\n`);
  });
}
