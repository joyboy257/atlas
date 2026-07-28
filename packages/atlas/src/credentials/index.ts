import os from 'node:os';
import path from 'node:path';
import { CredentialStoreUnavailableError, type CredentialRecord, type CredentialStore } from './types.js';
import { MacOsKeychainCredentialStore } from './macos-keychain.js';
import { LinuxSecretServiceCredentialStore } from './linux-secret-service.js';
import { SecureFileCredentialStore } from './secure-file.js';

export type CredentialStoreSelection = Readonly<{ store: CredentialStore; reference: string }>;

export function createCredentialStore(options: { forceFile?: boolean; homeDir?: string; reference?: string } = {}): CredentialStoreSelection {
  const reference = options.reference ?? 'default';
  const home = options.homeDir ?? os.homedir();
  const file = new SecureFileCredentialStore(path.join(home, '.atlas', 'credentials.json'));
  if (!options.forceFile && process.platform === 'darwin') return { store: new MacOsKeychainCredentialStore(), reference };
  if (!options.forceFile && process.platform === 'linux') return { store: new FallbackCredentialStore(new LinuxSecretServiceCredentialStore(), file), reference };
  return { store: file, reference };
}

export class FallbackCredentialStore implements CredentialStore {
  readonly kind = 'secret-service' as const;
  private resolvedKind: CredentialStore['kind'] = this.kind;
  constructor(private readonly primary: CredentialStore, private readonly fallback: CredentialStore) {}
  async get(reference: string): Promise<CredentialRecord | null> {
    try {
      const primary = await this.primary.get(reference);
      if (primary) { this.resolvedKind = this.primary.kind; return primary; }
      const fallback = await this.fallback.get(reference);
      if (fallback) this.resolvedKind = this.fallback.kind;
      return fallback;
    }
    catch (error) {
      if (!(error instanceof CredentialStoreUnavailableError)) throw error;
      const fallback = await this.fallback.get(reference);
      this.resolvedKind = this.fallback.kind;
      return fallback;
    }
  }
  async set(reference: string, credential: CredentialRecord): Promise<void> {
    try { await this.primary.set(reference, credential); this.resolvedKind = this.primary.kind; }
    catch (error) {
      if (!(error instanceof CredentialStoreUnavailableError)) throw error;
      await this.fallback.set(reference, credential); this.resolvedKind = this.fallback.kind;
    }
  }
  async delete(reference: string): Promise<boolean> {
    try {
      const primaryRemoved = await this.primary.delete(reference);
      const fallbackRemoved = await this.fallback.delete(reference);
      this.resolvedKind = primaryRemoved ? this.primary.kind : this.fallback.kind;
      return primaryRemoved || fallbackRemoved;
    } catch (error) {
      if (!(error instanceof CredentialStoreUnavailableError)) throw error;
      const removed = await this.fallback.delete(reference);
      this.resolvedKind = this.fallback.kind;
      return removed;
    }
  }
  async kindFor(): Promise<CredentialStore['kind']> { return this.resolvedKind; }
}

export * from './types.js';
export * from './secure-file.js';
export * from './macos-keychain.js';
export * from './linux-secret-service.js';
