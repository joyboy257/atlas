export type CredentialRecord = Readonly<{
  accessToken: string;
  tokenType: 'Bearer';
  expiresAt?: string;
  scopes: readonly string[];
  apiBase: string;
}>;

export interface CredentialStore {
  readonly kind: 'keychain' | 'secret-service' | 'secure-file' | 'memory';
  get(reference: string): Promise<CredentialRecord | null>;
  set(reference: string, credential: CredentialRecord): Promise<void>;
  delete(reference: string): Promise<boolean>;
  kindFor?(reference: string): Promise<CredentialStore['kind']>;
}

export class CredentialStoreUnavailableError extends Error {
  constructor(message: string) { super(message); this.name = 'CredentialStoreUnavailableError'; }
}
