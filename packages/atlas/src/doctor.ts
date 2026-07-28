import path from 'node:path';
import { lstat } from 'node:fs/promises';
import { atomicWrite, readUtf8Safe } from './fs-safety.js';
import { LocalConfigStore } from './local-config.js';
import { JournalStore } from './operation-journal.js';
import { mcpStatus } from './mcp-manager.js';
import type { McpClient } from './mcp-config.js';
import type { AtlasPlatformClient } from './platform-client.js';

export type DoctorCheck = Readonly<{ id: string; status: 'pass' | 'warn' | 'fail' | 'skip'; severity: 'info' | 'warning' | 'error'; explanation: string; remediation: string | null }>;

export async function runDoctor(input: { root: string; client: McpClient; platform?: AtlasPlatformClient; supportBundle?: boolean }) {
  const root = path.resolve(input.root); const checks: DoctorCheck[] = [];
  checks.push(check('runtime.node', Number(process.versions.node.split('.')[0]) >= 20, `Node ${process.versions.node}`, 'Install Node.js 20 or newer'));
  const configStore = new LocalConfigStore(root); let config = null;
  try { config = await configStore.read(); checks.push(check('local.config', Boolean(config), config ? 'Local configuration is valid' : 'Local configuration is missing', 'Run atlas init')); }
  catch { checks.push(fail('local.config', 'Local configuration is invalid', 'Restore it or run atlas init --rollback')); }
  if (config) {
    try { const stat = await lstat(configStore.filePath); checks.push(check('local.config.permissions', (stat.mode & 0o077) === 0, 'Local configuration permissions checked', 'Set permissions to 0600')); }
    catch { checks.push(fail('local.config.permissions', 'Unable to inspect local configuration', 'Inspect .atlas/config.json')); }
  }
  try { const journal = await new JournalStore(root).read(); checks.push(journal && journal.status === 'interrupted' ? fail('local.init_journal', 'An interrupted init requires resume or rollback', 'Run atlas init with the same options or atlas init --rollback') : pass('local.init_journal', 'No interrupted init operation')); }
  catch { checks.push(fail('local.init_journal', 'Init journal is invalid', 'Inspect .atlas/state.json')); }
  try { const status = await mcpStatus(root, input.client); checks.push(check('mcp.configuration', status.installed, status.installed ? 'Atlas MCP server is installed' : 'Atlas MCP server is not installed', 'Run atlas mcp install')); }
  catch { checks.push(fail('mcp.configuration', 'MCP configuration is invalid', 'Repair the JSON before retrying')); }
  const localText = `${await readUtf8Safe(path.join(root, 'atlas.yaml')) ?? ''}\n${await readUtf8Safe(path.join(root, '.mcp.json')) ?? ''}`;
  checks.push(check('local.secret_scan', !/(authorization\s*["':=]+\s*bearer|access[_-]?token|refresh[_-]?token)/i.test(localText), 'Project configuration secret scan completed', 'Remove credentials and use the credential store reference'));
  if (input.platform) {
    try { await input.platform.identity(); checks.push(pass('identity.remote', 'Stored credential reached Atlas')); }
    catch { checks.push(fail('identity.remote', 'Atlas identity check failed', 'Run atlas login and verify network/TLS settings')); }
    try { const result = await input.platform.testMcp(); checks.push(check('mcp.protocol', result.tools > 0, `MCP tools/list returned ${result.tools} tools`, 'Verify scopes and MCP service health')); }
    catch { checks.push(fail('mcp.protocol', 'MCP protocol smoke test failed', 'Run atlas mcp test for details')); }
  } else checks.push({ id: 'identity.remote', status: 'skip', severity: 'warning', explanation: 'No stored credential was available', remediation: 'Run atlas login' });
  const result = { schema_version: 'atlas.doctor/v1', generated_at: new Date().toISOString(), cli_version: '0.1.0-preview.0', platform: process.platform, node_version: process.versions.node, checks, summary: { pass: checks.filter((c) => c.status === 'pass').length, warn: checks.filter((c) => c.status === 'warn').length, fail: checks.filter((c) => c.status === 'fail').length, skip: checks.filter((c) => c.status === 'skip').length } };
  let bundlePath: string | undefined;
  if (input.supportBundle) { bundlePath = path.join(root, '.atlas', `support-${Date.now()}.json`); await atomicWrite(bundlePath, `${JSON.stringify(result, null, 2)}\n`); }
  return { ...result, support_bundle: bundlePath ?? null };
}

function check(id: string, ok: boolean, explanation: string, remediation: string): DoctorCheck { return ok ? pass(id, explanation) : fail(id, explanation, remediation); }
function pass(id: string, explanation: string): DoctorCheck { return { id, status: 'pass', severity: 'info', explanation, remediation: null }; }
function fail(id: string, explanation: string, remediation: string): DoctorCheck { return { id, status: 'fail', severity: 'error', explanation, remediation }; }
