import { describe, expect, it } from 'vitest';
import { normalizeApiBase, normalizeVerificationUrl } from '../src/urls.js';

describe('safe URL policy', () => {
  it.each(['https://api.usemirai.app', 'http://localhost:3000', 'http://127.0.0.1:3000'])('accepts %s', (value) => {
    expect(normalizeApiBase(value)).toContain('http');
  });

  it.each(['http://evil.example', 'javascript:alert(1)', 'file:///tmp/token', 'https://user:pass@example.com', 'https://example.com/#fragment'])('rejects %s', (value) => {
    expect(() => normalizeVerificationUrl(value)).toThrow();
  });
});
