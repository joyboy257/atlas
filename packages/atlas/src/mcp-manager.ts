import path from 'node:path';
import { AtlasCliError } from './errors.js';
import { atomicWrite, atomicWriteProjectFile, backupFile, readUtf8Safe, sha256 } from './fs-safety.js';
import { mcpConfigPath, mergeAtlasMcpConfig, removeAtlasMcpConfig, type McpClient } from './mcp-config.js';

export async function installMcp(root: string, client: McpClient, apiBase: string, context?: { projectId: string; environmentId: string }) {
  const filePath = mcpConfigPath(root, client); const existing = await readUtf8Safe(filePath);
  const merged = mergeAtlasMcpConfig(existing, client, apiBase, context);
  const current = existing ? atlasEntry(existing, client) : null; const desired = atlasEntry(merged.contents, client)!;
  const ownership = await readOwnership(root); const prior = ownership[client];
  if (current && sha256(JSON.stringify(current)) !== prior?.entry_digest && JSON.stringify(current) !== JSON.stringify(desired)) throw new AtlasCliError('CONFLICT', 'An Atlas MCP entry already exists and is not owned by this installation', { nextAction: 'Review the existing entry before replacing it' });
  let backupPath: string | null = null;
  if (merged.changed && existing !== null) { backupPath = path.join(root, '.atlas', 'backups', 'mcp', `${Date.now()}-${client}.json`); await backupFile(filePath, backupPath); }
  if (merged.changed) await atomicWriteProjectFile(filePath, merged.contents);
  ownership[client] = { config_path: filePath, entry_digest: sha256(JSON.stringify(desired)), installed_at: new Date().toISOString(), backup_path: backupPath };
  await writeOwnership(root, ownership);
  return { installed: true, changed: merged.changed, config_path: filePath, backup_path: backupPath };
}
export async function mcpStatus(root: string, client: McpClient) {
  const filePath = mcpConfigPath(root, client); const existing = await readUtf8Safe(filePath);
  if (existing === null) return { installed: false, config_path: filePath };
  const atlas = atlasEntry(existing, client);
  const ownership = (await readOwnership(root))[client];
  return { installed: Boolean(atlas), owned: Boolean(atlas && ownership?.entry_digest === sha256(JSON.stringify(atlas))), drifted: Boolean(atlas && ownership && ownership.entry_digest !== sha256(JSON.stringify(atlas))), config_path: filePath, atlas };
}
export async function uninstallMcp(root: string, client: McpClient) {
  const filePath = mcpConfigPath(root, client); const existing = await readUtf8Safe(filePath);
  if (existing === null) return { installed: false, changed: false, config_path: filePath };
  const status = await mcpStatus(root, client); if (!status.installed) return { installed: false, changed: false, config_path: filePath };
  if (!status.owned || status.drifted) throw new AtlasCliError('CONFLICT', 'Refusing to remove an unowned or drifted Atlas MCP entry', { nextAction: 'Review the client configuration and installation ownership record' });
  await atomicWriteProjectFile(filePath, removeAtlasMcpConfig(existing, client));
  const ownership = await readOwnership(root); delete ownership[client]; await writeOwnership(root, ownership);
  return { installed: false, changed: true, config_path: filePath };
}

type Ownership = Record<string, { config_path: string; entry_digest: string; installed_at: string; backup_path: string | null }>;
async function readOwnership(root: string): Promise<Ownership> { const raw = await readUtf8Safe(path.join(root, '.atlas', 'mcp-installations.json')); if (!raw) return {}; try { return JSON.parse(raw) as Ownership; } catch { throw new AtlasCliError('LOCAL_STATE_ERROR', 'Invalid MCP installation ownership journal'); } }
async function writeOwnership(root: string, value: Ownership) { await atomicWrite(path.join(root, '.atlas', 'mcp-installations.json'), `${JSON.stringify(value, null, 2)}\n`); }
function atlasEntry(raw: string, client: McpClient): Record<string, unknown> | null {
  let parsed: unknown; try { parsed = JSON.parse(raw); } catch { throw new AtlasCliError('LOCAL_STATE_ERROR', 'Existing MCP configuration is not valid JSON; no changes were made'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new AtlasCliError('LOCAL_STATE_ERROR', 'Existing MCP configuration must be a JSON object');
  const key = client === 'cursor' || client === 'vscode' ? 'servers' : 'mcpServers'; const servers = (parsed as Record<string, unknown>)[key];
  if (servers !== undefined && (!servers || typeof servers !== 'object' || Array.isArray(servers))) throw new AtlasCliError('LOCAL_STATE_ERROR', `MCP ${key} must be an object`);
  const atlas = (servers as Record<string, unknown> | undefined)?.atlas;
  if (atlas === undefined) return null; if (!atlas || typeof atlas !== 'object' || Array.isArray(atlas)) throw new AtlasCliError('LOCAL_STATE_ERROR', 'Atlas MCP entry must be an object'); return atlas as Record<string, unknown>;
}
