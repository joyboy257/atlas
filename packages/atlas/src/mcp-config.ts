import path from 'node:path';
import os from 'node:os';
import { AtlasCliError } from './errors.js';

export type McpClient = 'claude-code' | 'claude-desktop' | 'cursor' | 'vscode' | 'generic';

export function mcpConfigPath(root: string, client: McpClient): string {
  if (client === 'claude-desktop') {
    if (process.env.ATLAS_CLAUDE_DESKTOP_CONFIG) return path.resolve(process.env.ATLAS_CLAUDE_DESKTOP_CONFIG);
    if (process.platform === 'darwin') return path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
    if (process.platform === 'win32') return path.join(process.env.APPDATA ?? path.join(os.homedir(), 'AppData', 'Roaming'), 'Claude', 'claude_desktop_config.json');
    return path.join(process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), '.config'), 'Claude', 'claude_desktop_config.json');
  }
  if (client === 'cursor') return path.resolve(root, '.cursor', 'mcp.json');
  if (client === 'vscode') return path.resolve(root, '.vscode', 'mcp.json');
  return path.resolve(root, '.mcp.json');
}

export function mergeAtlasMcpConfig(existing: string | null, client: McpClient, apiBase: string, context?: { projectId: string; environmentId: string }): { contents: string; changed: boolean } {
  let parsed: Record<string, unknown> = {};
  if (existing?.trim()) {
    try { parsed = JSON.parse(existing); }
    catch { throw new AtlasCliError('LOCAL_STATE_ERROR', 'Existing MCP configuration is not valid JSON; no changes were made'); }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new AtlasCliError('LOCAL_STATE_ERROR', 'Existing MCP configuration must be a JSON object');
  }
  const key = client === 'cursor' || client === 'vscode' ? 'servers' : 'mcpServers';
  const servers = asObject(parsed[key]);
  const atlas = { type: 'http', url: `${apiBase}/atlas/v1/mcp`, ...(context ? { headers: { 'Atlas-Project-Id': context.projectId, 'Atlas-Environment-Id': context.environmentId } } : {}) };
  const next = { ...parsed, [key]: { ...servers, atlas } };
  const contents = `${JSON.stringify(next, null, 2)}\n`;
  return { contents, changed: contents !== `${existing ?? ''}${existing?.endsWith('\n') ? '' : existing ? '\n' : ''}` };
}

export function removeAtlasMcpConfig(existing: string, client: McpClient): string {
  const parsed = JSON.parse(existing) as Record<string, unknown>;
  const key = client === 'cursor' || client === 'vscode' ? 'servers' : 'mcpServers';
  const servers = { ...asObject(parsed[key]) };
  delete servers.atlas;
  return `${JSON.stringify({ ...parsed, [key]: servers }, null, 2)}\n`;
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
