export type AtlasCliErrorCode =
  | 'USAGE_ERROR'
  | 'AUTHENTICATION_REQUIRED'
  | 'AUTHENTICATION_FAILED'
  | 'AUTHORIZATION_FAILED'
  | 'APPROVAL_PENDING'
  | 'CONFLICT'
  | 'NETWORK_ERROR'
  | 'REMOTE_ERROR'
  | 'LOCAL_STATE_ERROR'
  | 'UNSAFE_AUTHORITY_CONFIGURATION';

const EXIT_CODES: Readonly<Record<AtlasCliErrorCode, number>> = {
  USAGE_ERROR: 2,
  AUTHENTICATION_REQUIRED: 3,
  AUTHENTICATION_FAILED: 3,
  AUTHORIZATION_FAILED: 4,
  APPROVAL_PENDING: 5,
  CONFLICT: 6,
  NETWORK_ERROR: 7,
  REMOTE_ERROR: 8,
  LOCAL_STATE_ERROR: 9,
  UNSAFE_AUTHORITY_CONFIGURATION: 10,
};

export class AtlasCliError extends Error {
  readonly code: AtlasCliErrorCode;
  readonly exitCode: number;
  readonly retryable: boolean;
  readonly nextAction?: string;

  constructor(code: AtlasCliErrorCode, message: string, options: { retryable?: boolean; nextAction?: string } = {}) {
    super(message);
    this.name = 'AtlasCliError';
    this.code = code;
    this.exitCode = EXIT_CODES[code];
    this.retryable = options.retryable ?? false;
    this.nextAction = options.nextAction;
  }
}
