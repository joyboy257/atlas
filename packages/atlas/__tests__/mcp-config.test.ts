import { describe, expect, it } from 'vitest';
import { mergeAtlasMcpConfig, removeAtlasMcpConfig } from '../src/mcp-config.js';

describe('MCP configuration', () => {
  it('preserves existing servers and never writes bearer credentials', () => {
    const existing = `${JSON.stringify({ mcpServers: { existing: { command: 'demo' } }, theme: 'dark' }, null, 2)}\n`;
    const result = mergeAtlasMcpConfig(existing, 'claude-code', 'https://api.example.com');
    const parsed = JSON.parse(result.contents);

    expect(parsed.mcpServers.existing).toEqual({ command: 'demo' });
    expect(parsed.mcpServers.atlas).toEqual({ type: 'http', url: 'https://api.example.com/atlas/v1/mcp' });
    expect(parsed.theme).toBe('dark');
    expect(result.contents).not.toMatch(/authorization|bearer|token/i);
    expect(mergeAtlasMcpConfig(result.contents, 'claude-code', 'https://api.example.com').changed).toBe(false);
  });

  it('uses the client-specific servers key and removes only Atlas', () => {
    const merged = mergeAtlasMcpConfig('{"servers":{"other":{"url":"https://other.example"}}}', 'cursor', 'https://api.example.com');
    const removed = JSON.parse(removeAtlasMcpConfig(merged.contents, 'cursor'));
    expect(removed.servers).toEqual({ other: { url: 'https://other.example' } });
  });

  it('rejects invalid existing JSON', () => {
    expect(() => mergeAtlasMcpConfig('{broken', 'generic', 'https://api.example.com')).toThrow(/not valid JSON/);
  });
});
