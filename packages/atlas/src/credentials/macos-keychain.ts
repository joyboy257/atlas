import { spawn } from 'node:child_process';
import type { CredentialRecord, CredentialStore } from './types.js';
import { AtlasCliError } from '../errors.js';

const SERVICE = 'app.usemirai.atlas.cli';

export class MacOsKeychainCredentialStore implements CredentialStore {
  readonly kind = 'keychain' as const;

  async get(reference: string): Promise<CredentialRecord | null> {
    const result = await runSecurity(['find-generic-password', '-a', reference, '-s', SERVICE, '-w']);
    if (result.code === 44) return null;
    if (result.code !== 0) throw keychainError(result.stderr);
    try {
      return JSON.parse(result.stdout.trim()) as CredentialRecord;
    } catch {
      throw new AtlasCliError('LOCAL_STATE_ERROR', 'Stored Atlas credential is invalid');
    }
  }

  async set(reference: string, credential: CredentialRecord): Promise<void> {
    const result = await runSecurity(['add-generic-password', '-U', '-a', reference, '-s', SERVICE, '-w'], JSON.stringify(credential));
    if (result.code !== 0) throw keychainError(result.stderr);
  }

  async delete(reference: string): Promise<boolean> {
    const result = await runSecurity(['delete-generic-password', '-a', reference, '-s', SERVICE]);
    if (result.code === 44) return false;
    if (result.code !== 0) throw keychainError(result.stderr);
    return true;
  }
}

async function runSecurity(args: readonly string[], stdin?: string): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn('/usr/bin/security', [...args], { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8').on('data', (chunk) => { stdout += chunk; });
    child.stderr.setEncoding('utf8').on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }));
    child.stdin.end(stdin === undefined ? undefined : `${stdin}\n`);
  });
}

function keychainError(stderr: string): AtlasCliError {
  return new AtlasCliError('LOCAL_STATE_ERROR', `macOS Keychain operation failed: ${stderr.trim() || 'unknown error'}`);
}
