import { describe, expect, it } from 'vitest';
import { CredentialStoreUnavailableError, type CredentialRecord, type CredentialStore } from '../src/credentials/types.js';
import { FallbackCredentialStore } from '../src/credentials/index.js';
import { AtlasCliError } from '../src/errors.js';

class FakeStore implements CredentialStore {
  readonly kind = 'memory' as const;
  value: CredentialRecord | null = null;
  constructor(private readonly error?: Error) {}
  async get() { if (this.error) throw this.error; return this.value; }
  async set(_reference: string, value: CredentialRecord) { if (this.error) throw this.error; this.value = value; }
  async delete() { if (this.error) throw this.error; const existed = Boolean(this.value); this.value = null; return existed; }
}

class ToggleStore extends FakeStore {
  unavailable = true;
  override async get(reference: string) { if (this.unavailable) throw new CredentialStoreUnavailableError('unavailable'); return super.get(reference); }
  override async set(reference: string, value: CredentialRecord) { if (this.unavailable) throw new CredentialStoreUnavailableError('unavailable'); return super.set(reference, value); }
  override async delete(reference: string) { if (this.unavailable) throw new CredentialStoreUnavailableError('unavailable'); return super.delete(reference); }
}

describe('credential fallback', () => {
  it('falls back only when the platform store is unavailable', async () => {
    const fallback = new FakeStore();
    const store = new FallbackCredentialStore(new FakeStore(new CredentialStoreUnavailableError('not installed')), fallback);
    await store.set('default', { accessToken: 'secret', tokenType: 'Bearer', apiBase: 'https://api.example.com', scopes: [] });
    expect((await store.get('default'))?.accessToken).toBe('secret');
  });

  it('does not hide platform-store operational failures', async () => {
    const store = new FallbackCredentialStore(new FakeStore(new AtlasCliError('LOCAL_STATE_ERROR', 'vault locked')), new FakeStore());
    await expect(store.get('default')).rejects.toThrow('vault locked');
  });

  it('finds fallback credentials after the primary becomes available and deletes both stores', async () => {
    const primary = new ToggleStore(); const fallback = new FakeStore();
    const store = new FallbackCredentialStore(primary, fallback);
    await store.set('default', { accessToken: 'fallback-secret', tokenType: 'Bearer', apiBase: 'https://api.example.com', scopes: [] });
    expect(await store.kindFor('default')).toBe('memory');
    primary.unavailable = false;
    expect((await store.get('default'))?.accessToken).toBe('fallback-secret');
    await primary.set('default', { accessToken: 'primary-secret', tokenType: 'Bearer', apiBase: 'https://api.example.com', scopes: [] });
    expect(await store.delete('default')).toBe(true);
    expect(await primary.get('default')).toBeNull();
    expect(await fallback.get('default')).toBeNull();
  });
});
