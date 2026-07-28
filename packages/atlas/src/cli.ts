import { parseArgs } from 'node:util';
import path from 'node:path';
import { DeviceFlowClient } from './auth/device-flow.js';
import { openBrowser } from './auth/open-browser.js';
import { createCredentialStore } from './credentials/index.js';
import { AtlasCliError } from './errors.js';
import { processOutput, writeFailure, writeResult, type OutputWriter } from './output.js';
import { normalizeApiBase } from './urls.js';
import { randomUUID } from 'node:crypto';
import { AtlasPlatformClient, type EnvironmentRecord } from './platform-client.js';
import { LocalConfigStore, type AtlasLocalConfig } from './local-config.js';
import { InitEngine } from './init-engine.js';
import type { McpClient } from './mcp-config.js';
import { installMcp, mcpStatus, uninstallMcp } from './mcp-manager.js';
import { runDoctor } from './doctor.js';
import { verifyReceipt } from './receipt-integrity.js';
import { planDeployment, validateAtlasConfig } from './deployment-config.js';
import { deploymentIdempotencyKey } from './deployment-idempotency.js';
import { postWebhookEvent, postWebhookFixture, startAtlasDevServer, type AtlasDevServer } from './dev-server.js';
import { rollbackAtlasScaffold, scaffoldAtlasProject, type AtlasPackageManager, type AtlasScaffoldDependencies } from './scaffold.js';
import { readUtf8Safe } from './fs-safety.js';
import {
  doctorLocalProject,
  explainLocalProject,
  inspectLocalProject,
  listLocalCapabilities,
  planLocalDeployment,
  replayLocalProject,
  testLocalProject,
  upgradeLocalProject,
} from './local-commands.js';
import type { AtlasSimulatorScenario } from './messaging-simulator.js';

const VERSION = '0.1.0-alpha.0';
const DEFAULT_API_BASE = 'https://api.usemirai.app';
const DEFAULT_SCOPES = [
  'atlas.context.read', 'atlas.knowledge.read',
  'atlas.projects.read', 'atlas.projects.write',
  'atlas.environments.read', 'atlas.environments.write',
  'atlas.actions.execute', 'atlas.runs.read',
  'atlas.agents.deploy',
];
const CLI_OPTIONS = {
  json: { type: 'boolean', default: false },
  'api-base': { type: 'string', default: process.env.ATLAS_API_BASE ?? DEFAULT_API_BASE },
  'client-id': { type: 'string' },
  scope: { type: 'string', multiple: true },
  'no-browser': { type: 'boolean', default: false },
  'credential-ref': { type: 'string', default: 'default' },
  'file-credentials': { type: 'boolean', default: false },
  help: { type: 'boolean', short: 'h' },
  slug: { type: 'string' }, name: { type: 'string' }, description: { type: 'string' }, type: { type: 'string' },
  project: { type: 'string' }, environment: { type: 'string' }, 'idempotency-key': { type: 'string' }, dir: { type: 'string', default: '.' },
  client: { type: 'string', default: 'claude-code' }, rollback: { type: 'boolean', default: false },
  cloud: { type: 'boolean', default: false }, existing: { type: 'boolean', default: false },
  'no-install': { type: 'boolean', default: false }, 'no-git': { type: 'boolean', default: false },
  'package-manager': { type: 'string' }, 'atlas-dependency': { type: 'string' },
  'project-slug': { type: 'string' }, 'project-name': { type: 'string' },
  'environment-slug': { type: 'string' }, 'environment-name': { type: 'string' }, 'environment-type': { type: 'string' },
  input: { type: 'string' }, commit: { type: 'boolean', default: false }, 'dry-run': { type: 'boolean', default: false }, wait: { type: 'boolean', default: false },
  fix: { type: 'boolean', default: false }, 'support-bundle': { type: 'boolean', default: false },
  reason: { type: 'string' },
  file: { type: 'string', default: 'atlas.yaml' },
  from: { type: 'string' }, to: { type: 'string' }, deployment: { type: 'string' }, 'approval-id': { type: 'string' },
  port: { type: 'string' }, host: { type: 'string' }, 'fail-first': { type: 'string' }, 'latency-ms': { type: 'string' }, 'duration-ms': { type: 'string' },
  'forward-to': { type: 'string' }, url: { type: 'string' }, follow: { type: 'boolean', default: false }, 'max-polls': { type: 'string' }, 'interval-ms': { type: 'string' },
} as const;

export type CliDependencies = Readonly<{
  output?: OutputWriter;
  fetchImpl?: typeof fetch;
  openBrowser?: (url: string) => Promise<boolean>;
  homeDir?: string;
  cwd?: string;
  nodeVersion?: string;
  scaffoldDependencies?: AtlasScaffoldDependencies;
  platformCredentialStore?: ReturnType<typeof createCredentialStore>;
}>;

export async function runCli(argv: readonly string[], dependencies: CliDependencies = {}): Promise<number> {
  const output = dependencies.output ?? processOutput;
  let json = argv.includes('--json');
  try {
    const parsed = parseArgs({ args: [...argv], allowPositionals: true, strict: true, options: CLI_OPTIONS });
    json = parsed.values.json ?? false;
    const command = parsed.positionals[0] ?? 'help';
    if (parsed.values.help || command === 'help') {
      if (parsed.positionals.length > 1) throw new AtlasCliError('USAGE_ERROR', 'help accepts at most one command name');
      output.stdout(helpText()); return 0;
    }
    assertCommandArity(command, parsed.positionals);
    const selection = dependencies.platformCredentialStore ?? createCredentialStore({
      forceFile: parsed.values['file-credentials'], homeDir: dependencies.homeDir, reference: parsed.values['credential-ref'],
    });

    if (command === 'version') {
      writeResult(output, { ok: true, command, data: { cli_version: VERSION, maturity: 'preview' } }, json); return 0;
    }
    if (command === 'dev') {
      const root = path.resolve(dependencies.cwd ?? process.cwd(), parsed.values.dir!);
      const projectRoot = await readUtf8Safe(path.join(root, 'atlas.config.ts')) === null ? undefined : root;
      const server = await startAtlasDevServer({
        port: parseIntegerOption(parsed.values.port, '--port', 0, 65_535), host: parsed.values.host,
        failFirst: parseIntegerOption(parsed.values['fail-first'], '--fail-first', 0),
        latencyMs: parseIntegerOption(parsed.values['latency-ms'], '--latency-ms', 0),
        fetchImpl: dependencies.fetchImpl ?? fetch,
        ...(projectRoot ? { projectRoot } : {}),
      });
      const identity = server.runtime?.snapshot().identity ?? null;
      writeResult(output, { ok: true, command: 'dev', data: {
        url: server.url,
        workbench_url: projectRoot ? `${server.url}/` : null,
        health_url: `${server.url}/health`,
        api_url: projectRoot ? `${server.url}/api` : null,
        mcp_url: `${server.url}/mcp`,
        webhook_url: `${server.url}/webhooks`,
        deterministic: true,
        governed_runtime: server.runtime !== null,
        project_root: projectRoot ?? null,
        project_hash: identity?.project_hash ?? null,
      }, next_action: projectRoot
        ? { code: 'workbench', label: `Open ${server.url}/ and complete the front-desk scenario` }
        : { code: 'init', label: 'Run atlas init front-desk, then run atlas dev inside the generated project' } }, json);
      await serveUntilStopped(server, parseIntegerOption(parsed.values['duration-ms'], '--duration-ms', 0));
      return 0;
    }
    if (command === 'login') {
      const clientId = parsed.values['client-id'] ?? process.env.ATLAS_CLIENT_ID;
      if (!clientId) throw new AtlasCliError('USAGE_ERROR', 'login requires --client-id or ATLAS_CLIENT_ID', { nextAction: 'Create or select an Atlas client in the Developer Console' });
      const apiBase = normalizeApiBase(parsed.values['api-base']!);
      const flow = new DeviceFlowClient({ apiBase, fetchImpl: dependencies.fetchImpl });
      const device = await flow.requestCode(clientId, parsed.values.scope ?? DEFAULT_SCOPES);
      const browserOpened = parsed.values['no-browser'] ? false : await (dependencies.openBrowser ?? openBrowser)(device.verification_url);
      if (json) {
        output.stderr(JSON.stringify({ type: 'atlas.login.verification_required', verification_url: device.verification_url, user_code: device.user_code, browser_opened: browserOpened, expires_at: new Date(device.expires_at).toISOString() }));
      } else {
        output.stdout(`${browserOpened ? 'Opened' : 'Open'} ${device.verification_url}\nCode: ${device.user_code}`);
      }
      const credential = await flow.poll(device, clientId);
      await selection.store.set(selection.reference, credential);
      writeResult(output, { ok: true, command, data: { credential_ref: `${await credentialKind(selection.store, selection.reference)}:${selection.reference}`, api_base: apiBase, scopes: credential.scopes }, next_action: { code: 'whoami', label: 'Run atlas whoami' } }, json);
      return 0;
    }
    if (command === 'logout') {
      const removed = await selection.store.delete(selection.reference);
      writeResult(output, { ok: true, command, data: { credential_ref: `${await credentialKind(selection.store, selection.reference)}:${selection.reference}`, removed } }, json); return 0;
    }
    if (command === 'whoami') {
      const credential = await selection.store.get(selection.reference);
      if (!credential) throw new AtlasCliError('AUTHENTICATION_REQUIRED', 'No Atlas credential is stored', { nextAction: 'Run atlas login' });
      const apiBase = normalizeApiBase(credential.apiBase);
      const response = await (dependencies.fetchImpl ?? globalThis.fetch)(`${apiBase}/atlas/v1/docs`, { headers: { authorization: `Bearer ${credential.accessToken}`, accept: 'application/json' }, signal: AbortSignal.timeout(15_000) });
      if (!response.ok) throw new AtlasCliError('AUTHENTICATION_FAILED', `Stored credential was rejected: HTTP ${response.status}`, { nextAction: 'Run atlas login again' });
      writeResult(output, { ok: true, command, data: { authenticated: true, credential_ref: `${await credentialKind(selection.store, selection.reference)}:${selection.reference}`, api_base: credential.apiBase, scopes: credential.scopes, expires_at: credential.expiresAt ?? null } }, json);
      return 0;
    }
    if (command === 'test' || command === 'capabilities' || command === 'inspect' || command === 'replay' || command === 'upgrade' || command === 'explain') {
      const root = path.resolve(dependencies.cwd ?? process.cwd(), parsed.values.dir!);
      if (await readUtf8Safe(path.join(root, 'atlas.config.ts')) === null) {
        throw new AtlasCliError('LOCAL_STATE_ERROR', 'This command requires a local Atlas project', { nextAction: 'Run atlas init front-desk, then cd into the generated project' });
      }
      if (command === 'test') {
        const data = await testLocalProject(root);
        writeResult(output, { ok: true, command, data, next_action: { code: 'dev', label: data.next_action } }, json);
        return data.status === 'passed' && data.exactly_once ? 0 : 1;
      }
      if (command === 'capabilities') {
        const data = await listLocalCapabilities(root);
        writeResult(output, { ok: true, command, data, next_action: { code: 'explain.project', label: data.next_action } }, json);
        return 0;
      }
      if (command === 'explain') {
        const data = await explainLocalProject(root);
        writeResult(output, { ok: true, command: 'explain project', data, next_action: { code: 'test', label: data.next_action } }, json);
        return 0;
      }
      if (command === 'inspect') {
        const data = await inspectLocalProject(root);
        writeResult(output, { ok: true, command, data, next_action: { code: 'continue', label: data.next_action } }, json);
        return 0;
      }
      if (command === 'replay') {
        const scenario = parsed.values.input ? await parseInput(parsed.values.input) as unknown as AtlasSimulatorScenario : undefined;
        const data = await replayLocalProject(root, scenario);
        writeResult(output, { ok: true, command, data, next_action: { code: 'dev', label: data.next_action } }, json);
        return data.status === 'passed' ? 0 : 1;
      }
      const data = await upgradeLocalProject(root);
      writeResult(output, { ok: true, command, data, next_action: { code: 'doctor', label: data.next_action } }, json);
      return 0;
    }
    if (command === 'init') {
      if (!parsed.values.cloud) {
        const cwd = path.resolve(dependencies.cwd ?? process.cwd());
        const template = parsed.positionals[1] ?? 'front-desk';
        if (template !== 'front-desk') throw new AtlasCliError('USAGE_ERROR', 'atlas init supports only the front-desk template in P1');
        const target = parsed.values.dir === '.' && !parsed.values.existing ? 'front-desk' : parsed.values.dir!;
        if (parsed.values.rollback) {
          const result = await rollbackAtlasScaffold(path.resolve(cwd, parsed.values.dir!));
          writeResult(output, { ok: true, command: 'init rollback', data: result, next_action: { code: 'init', label: 'Run atlas init front-desk to start again' } }, json);
          return 0;
        }
        const packageManager = parsePackageManagerOption(parsed.values['package-manager']);
        const options = {
          cwd,
          target,
          template: 'front-desk' as const,
          existing: parsed.values.existing,
          install: !parsed.values['no-install'],
          initializeGit: !parsed.values['no-git'],
          nodeVersion: dependencies.nodeVersion ?? process.version,
          ...(packageManager ? { packageManager } : {}),
          ...(parsed.values['atlas-dependency'] ? { atlasDependency: parsed.values['atlas-dependency'] } : {}),
        };
        const result = dependencies.scaffoldDependencies
          ? await scaffoldAtlasProject(options, dependencies.scaffoldDependencies)
          : await scaffoldAtlasProject(options);
        writeResult(output, { ok: true, command, data: result, next_action: { code: 'dev', label: result.next_command } }, json);
        return 0;
      }

      if (parsed.positionals.length > 1) throw new AtlasCliError('USAGE_ERROR', 'atlas init --cloud does not accept a template name');
      if (parsed.values.existing || parsed.values['no-install'] || parsed.values['no-git'] || parsed.values['package-manager'] || parsed.values['atlas-dependency']) {
        throw new AtlasCliError('USAGE_ERROR', 'Local scaffold options cannot be combined with --cloud');
      }
      const apiBase = normalizeApiBase(parsed.values['api-base']!);
      let credential = await selection.store.get(selection.reference);
      if (!credential && !parsed.values.rollback) {
        const clientId = parsed.values['client-id'] ?? process.env.ATLAS_CLIENT_ID;
        if (!clientId) throw new AtlasCliError('AUTHENTICATION_REQUIRED', 'atlas init --cloud requires an existing login or --client-id', { nextAction: 'Run atlas login or pass --client-id' });
        const flow = new DeviceFlowClient({ apiBase, fetchImpl: dependencies.fetchImpl });
        const device = await flow.requestCode(clientId, parsed.values.scope ?? DEFAULT_SCOPES);
        const browserOpened = parsed.values['no-browser'] ? false : await (dependencies.openBrowser ?? openBrowser)(device.verification_url);
        if (json) output.stderr(JSON.stringify({ type: 'atlas.login.verification_required', verification_url: device.verification_url, user_code: device.user_code, browser_opened: browserOpened, expires_at: new Date(device.expires_at).toISOString() }));
        else output.stdout(`${browserOpened ? 'Opened' : 'Open'} ${device.verification_url}\nCode: ${device.user_code}`);
        credential = await flow.poll(device, clientId);
        await selection.store.set(selection.reference, credential);
      }
      const effectiveCredential = credential ?? { accessToken: '', tokenType: 'Bearer' as const, scopes: [], apiBase };
      const platform = new AtlasPlatformClient({ apiBase: effectiveCredential.apiBase, token: effectiveCredential.accessToken, fetchImpl: dependencies.fetchImpl });
      const client = parseMcpClient(parsed.values.client!);
      const engine = new InitEngine({ platform, credential: effectiveCredential, credentialSelection: selection });
      try {
        const result = await engine.run({
          root: parsed.values.dir!, client, apiBase: effectiveCredential.apiBase,
          projectId: parsed.values.project, projectSlug: parsed.values['project-slug'], projectName: parsed.values['project-name'],
          environmentId: parsed.values.environment, environmentSlug: parsed.values['environment-slug'], environmentName: parsed.values['environment-name'],
          environmentType: parseEnvironmentType(parsed.values['environment-type']), rollback: parsed.values.rollback,
        });
        writeResult(output, { ok: true, command, data: result, next_action: { code: 'run', label: 'Run a governed Atlas tool' } }, json);
        return 0;
      } catch (error) {
        if (parsed.values.rollback && error instanceof AtlasCliError && error.message.includes('rolled back')) {
          writeResult(output, { ok: true, command: 'init rollback', data: { rolled_back: true, root: parsed.values.dir! }, next_action: { code: 'init', label: 'Run atlas init --cloud to start again' } }, json);
          return 0;
        }
        throw error;
      }
    }
    if (command === 'projects' || command === 'env') {
      const credential = await selection.store.get(selection.reference);
      if (!credential) throw new AtlasCliError('AUTHENTICATION_REQUIRED', 'No Atlas credential is stored', { nextAction: 'Run atlas login' });
      const platform = new AtlasPlatformClient({ apiBase: credential.apiBase, token: credential.accessToken, fetchImpl: dependencies.fetchImpl });
      const configStore = new LocalConfigStore(parsed.values.dir!);
      const config = await configStore.read();
      const action = parsed.positionals[1]!;
      if (command === 'projects') {
        if (action === 'list') { writeResult(output, { ok: true, command: 'projects list', data: { projects: await platform.listProjects() } }, json); return 0; }
        if (action === 'show') { const id = parsed.values.project ?? config?.active.project_id; if (!id) throw missingProject(); writeResult(output, { ok: true, command: 'projects show', data: { project: await platform.showProject(id) } }, json); return 0; }
        if (action === 'create') {
          const slug = required(parsed.values.slug, '--slug'); const name = required(parsed.values.name, '--name');
          const result = await platform.createProject({ slug, name, description: parsed.values.description, idempotency_key: parsed.values['idempotency-key'] ?? randomUUID() });
          await activate(configStore, config, platform, credential, selection, { project_id: result.project.external_id });
          writeResult(output, { ok: true, command: 'projects create', data: result, next_action: { code: 'env.create', label: 'Create an Atlas environment' } }, json); return 0;
        }
        if (action === 'link') {
          const id = required(parsed.values.project, '--project'); const project = await platform.showProject(id);
          await activate(configStore, config, platform, credential, selection, { project_id: project.external_id, environment_id: undefined });
          writeResult(output, { ok: true, command: 'projects link', data: { project, config_path: configStore.filePath } }, json); return 0;
        }
      } else {
        const projectId = parsed.values.project ?? config?.active.project_id; if (!projectId) throw missingProject();
        if (action === 'list') { writeResult(output, { ok: true, command: 'env list', data: { environments: await platform.listEnvironments(projectId) } }, json); return 0; }
        if (action === 'show') { const id = parsed.values.environment ?? config?.active.environment_id; if (!id) throw missingEnvironment(); writeResult(output, { ok: true, command: 'env show', data: { environment: await platform.showEnvironment(projectId, id) } }, json); return 0; }
        if (action === 'create') {
          const slug = required(parsed.values.slug, '--slug'); const name = required(parsed.values.name, '--name');
          const environmentType = parsed.values.type;
          if (!environmentType || !['sandbox', 'staging', 'production', 'custom'].includes(environmentType)) throw new AtlasCliError('USAGE_ERROR', '--type must be sandbox, staging, production, or custom');
          const result = await platform.createEnvironment(projectId, { slug, name, environment_type: environmentType as EnvironmentRecord['environment_type'], idempotency_key: parsed.values['idempotency-key'] ?? randomUUID() });
          await activate(configStore, config, platform, credential, selection, { project_id: projectId, environment_id: result.environment.external_id });
          writeResult(output, { ok: true, command: 'env create', data: result }, json); return 0;
        }
        if (action === 'use') {
          const id = required(parsed.values.environment, '--environment'); const environment = await platform.showEnvironment(projectId, id);
          await activate(configStore, config, platform, credential, selection, { project_id: projectId, environment_id: environment.external_id });
          writeResult(output, { ok: true, command: 'env use', data: { environment, config_path: configStore.filePath } }, json); return 0;
        }
      }
      throw new AtlasCliError('USAGE_ERROR', `Unknown command: ${command} ${action}`);
    }
    if (command === 'webhooks' && parsed.positionals[1] !== 'list') {
      const action = parsed.positionals[1]!;
      if (action === 'listen') {
        const server = await startAtlasDevServer({
          port: parseIntegerOption(parsed.values.port, '--port', 0, 65_535), host: parsed.values.host,
          failFirst: parseIntegerOption(parsed.values['fail-first'], '--fail-first', 0),
          latencyMs: parseIntegerOption(parsed.values['latency-ms'], '--latency-ms', 0),
          webhookForwardUrl: parsed.values['forward-to'], fetchImpl: dependencies.fetchImpl ?? fetch,
        });
        writeResult(output, { ok: true, command: 'webhooks listen', data: { webhook_url: `${server.url}/webhooks`, events_url: `${server.url}/events`, forward_to: parsed.values['forward-to'] ?? null } }, json);
        await serveUntilStopped(server, parseIntegerOption(parsed.values['duration-ms'], '--duration-ms', 0));
        return 0;
      }
      const target = webhookEndpoint(required(parsed.values.url, '--url'));
      if (action === 'trigger') {
        const eventType = parsed.positionals[2]!;
        writeResult(output, { ok: true, command: 'webhooks trigger', data: await postWebhookFixture(target, eventType, await parseInput(parsed.values.input), dependencies.fetchImpl ?? fetch) }, json);
        return 0;
      }
      const event = await readJsonObjectFile(parsed.positionals[2]!);
      writeResult(output, { ok: true, command: 'webhooks replay', data: await postWebhookEvent(target, event, dependencies.fetchImpl ?? fetch) }, json);
      return 0;
    }
    if (command === 'run' || command === 'receipts' || command === 'runs' || command === 'approvals' || command === 'webhooks' || command === 'usage' || command === 'logs') {
      const credential = await selection.store.get(selection.reference);
      if (!credential) throw new AtlasCliError('AUTHENTICATION_REQUIRED', 'No Atlas credential is stored', { nextAction: 'Run atlas login' });
      const platform = new AtlasPlatformClient({ apiBase: credential.apiBase, token: credential.accessToken, fetchImpl: dependencies.fetchImpl });
      if (command === 'receipts') {
        const action = parsed.positionals[1]!;
        if (action === 'list') { writeResult(output, { ok: true, command: 'receipts list', data: { receipts: await platform.listReceipts() } }, json); return 0; }
        const receiptId = parsed.positionals[2]!; const receipt = await platform.showReceipt(receiptId);
        writeResult(output, { ok: true, command: `receipts ${action}`, data: action === 'verify' ? { receipt_id: receiptId, ...verifyReceipt(receipt) } : { receipt } }, json); return 0;
      }
      if (command === 'runs') {
        const action = parsed.positionals[1]!;
        if (action === 'list') { writeResult(output, { ok: true, command: 'runs list', data: { runs: await platform.listRuns() } }, json); return 0; }
        const runId = parsed.positionals[2]!; const run = await platform.showRun(runId);
        if (action === 'show' || action === 'tail') { writeResult(output, { ok: true, command: `runs ${action}`, data: { run, terminal: run.outcome !== 'approval_pending' } }, json); return 0; }
        if (action === 'cancel') {
          const approval = run.approval as { id?: unknown } | null | undefined; const approvalId = typeof approval?.id === 'string' ? approval.id : null;
          if (run.outcome !== 'approval_pending' || !approvalId) throw new AtlasCliError('CONFLICT', 'Only an approval-pending run can be cancelled', { nextAction: 'Inspect the final run receipt' });
          const decision = await platform.decideApproval(approvalId, 'rejected', parsed.values.reason ?? 'Cancelled by atlas runs cancel');
          writeResult(output, { ok: true, command: 'runs cancel', data: { run_id: runId, approval_id: approvalId, cancellation: 'approval_rejected', decision } }, json); return 0;
        }
        if (run.execution_mode === 'commit') throw new AtlasCliError('CONFLICT', 'Commit runs cannot be replayed from a redacted receipt', { nextAction: 'Issue a new explicit atlas run --commit with reviewed input' });
        const config = await new LocalConfigStore(parsed.values.dir!).read();
        if (!config?.active.project_id || !config.active.environment_id) throw new AtlasCliError('LOCAL_STATE_ERROR', 'runs replay requires an active Project and Environment', { nextAction: 'Run atlas init or select a Project and Environment' });
        const tool = run.tool as { tool_id?: unknown } | undefined; if (typeof tool?.tool_id !== 'string') throw new AtlasCliError('REMOTE_ERROR', 'Run receipt omitted tool identity');
        const replay = await platform.execute({ tool: tool.tool_id, input: await parseInput(parsed.values.input), mode: run.execution_mode === 'dry_run' ? 'dry_run' : 'read', idempotency_key: parsed.values['idempotency-key'] ?? randomUUID(), project_id: config.active.project_id, environment_id: config.active.environment_id });
        writeResult(output, { ok: true, command: 'runs replay', data: { replay_of_run_id: runId, ...replay } }, json); return 0;
      }
      if (command === 'approvals') {
        const action = parsed.positionals[1]!; const id = parsed.positionals[2];
        const data = action === 'list' ? await platform.listApprovals() : action === 'show' ? await platform.showApproval(id!) : await platform.decideApproval(id!, action === 'approve' ? 'approved' : 'rejected', parsed.values.reason);
        writeResult(output, { ok: true, command: `approvals ${action}`, data }, json); return 0;
      }
      if (command === 'webhooks') { writeResult(output, { ok: true, command: 'webhooks list', data: await platform.listWebhooks() }, json); return 0; }
      if (command === 'usage') { writeResult(output, { ok: true, command: 'usage', data: await platform.usage() }, json); return 0; }
      if (command === 'logs') {
        const action = parsed.values.follow ? 'follow' : parsed.positionals[1]!;
        const traceId = parsed.positionals[2]!;
        if (action === 'show') { writeResult(output, { ok: true, command: 'logs show', data: await platform.showTrace(traceId) }, json); return 0; }
        const maxPolls = parseIntegerOption(parsed.values['max-polls'], '--max-polls', 1) ?? 30;
        const intervalMs = parseIntegerOption(parsed.values['interval-ms'], '--interval-ms', 0) ?? 1_000;
        const snapshots: unknown[] = [];
        for (let poll = 0; poll < maxPolls; poll += 1) {
          const trace = await platform.showTrace(traceId); snapshots.push(trace);
          if (!json) output.stdout(JSON.stringify({ poll: poll + 1, trace }));
          if (poll + 1 < maxPolls) await new Promise((resolve) => setTimeout(resolve, intervalMs));
        }
        writeResult(output, { ok: true, command: 'logs follow', data: { trace_id: traceId, polls: snapshots.length, snapshots } }, json); return 0;
      }
      const tool = parsed.positionals[1]!;
      if (parsed.values.commit && parsed.values['dry-run']) throw new AtlasCliError('USAGE_ERROR', '--commit and --dry-run are mutually exclusive');
      const mode = parsed.values.commit ? 'commit' : parsed.values['dry-run'] || tool.includes('.actions.') ? 'dry_run' : 'read';
      const payload = await parseInput(parsed.values.input);
      const config = await new LocalConfigStore(parsed.values.dir!).read();
      if (!config?.active.project_id || !config.active.environment_id) throw new AtlasCliError('LOCAL_STATE_ERROR', 'atlas run requires an active Project and Environment', { nextAction: 'Run atlas init or select a Project and Environment' });
      const result = await platform.execute({ tool, input: payload, mode, idempotency_key: parsed.values['idempotency-key'] ?? randomUUID(), project_id: config.active.project_id, environment_id: config.active.environment_id });
      writeResult(output, { ok: true, command: 'run', data: result, next_action: result.receipt.outcome === 'approval_pending' ? { code: 'approval', label: 'Review the pending approval' } : { code: 'receipt.show', label: `Inspect receipt ${result.receipt.receipt_id}` } }, json); return 0;
    }
    if (command === 'mcp') {
      const action = parsed.positionals[1]!; const client = parseMcpClient(parsed.values.client!); const root = parsed.values.dir!;
      if (action === 'install') { const config=await new LocalConfigStore(root).read();if(!config?.active.project_id||!config.active.environment_id)throw new AtlasCliError('LOCAL_STATE_ERROR','mcp install requires an active Project and Environment',{nextAction:'Run atlas init'});writeResult(output, { ok: true, command: 'mcp install', data: await installMcp(root, client, normalizeApiBase(parsed.values['api-base']!),{projectId:config.active.project_id,environmentId:config.active.environment_id}) }, json); return 0; }
      if (action === 'status') { writeResult(output, { ok: true, command: 'mcp status', data: await mcpStatus(root, client) }, json); return 0; }
      if (action === 'uninstall') { writeResult(output, { ok: true, command: 'mcp uninstall', data: await uninstallMcp(root, client) }, json); return 0; }
      if (action === 'inspect') {
        const credential = await selection.store.get(selection.reference); if (!credential) throw new AtlasCliError('AUTHENTICATION_REQUIRED', 'No Atlas credential is stored', { nextAction: 'Run atlas login' });
        const config = await new LocalConfigStore(root).read(); if (!config?.active.project_id || !config.active.environment_id) throw new AtlasCliError('LOCAL_STATE_ERROR', 'mcp inspect requires an active Project and Environment', { nextAction: 'Run atlas init' });
        const platform = new AtlasPlatformClient({ apiBase: credential.apiBase, token: credential.accessToken, fetchImpl: dependencies.fetchImpl, projectId: config.active.project_id, environmentId: config.active.environment_id });
        writeResult(output, { ok: true, command: 'mcp inspect', data: await platform.inspectMcp() }, json); return 0;
      }
      if (action === 'test') {
        const credential = await selection.store.get(selection.reference); if (!credential) throw new AtlasCliError('AUTHENTICATION_REQUIRED', 'No Atlas credential is stored', { nextAction: 'Run atlas login' });
        const config = await new LocalConfigStore(root).read();
        if (!config?.active.project_id || !config.active.environment_id) throw new AtlasCliError('LOCAL_STATE_ERROR', 'mcp test requires an active Project and Environment', { nextAction: 'Run atlas init' });
        const platform = new AtlasPlatformClient({ apiBase: credential.apiBase, token: credential.accessToken, fetchImpl: dependencies.fetchImpl, projectId: config.active.project_id, environmentId: config.active.environment_id });
        const protocol = await platform.testMcp();
        const smoke = await platform.execute({ tool: 'mirai.knowledge.search', input: { query: 'What time does the sandbox cafe open?' }, mode: 'read', idempotency_key: randomUUID(), project_id: config.active.project_id, environment_id: config.active.environment_id });
        writeResult(output, { ok: true, command: 'mcp test', data: { ...protocol, receipt: smoke.receipt } }, json); return 0;
      }
    }
    if (command === 'tools') {
      const credential = await selection.store.get(selection.reference); if (!credential) throw new AtlasCliError('AUTHENTICATION_REQUIRED', 'No Atlas credential is stored', { nextAction: 'Run atlas login' });
      const config = await new LocalConfigStore(parsed.values.dir!).read(); if (!config?.active.project_id || !config.active.environment_id) throw new AtlasCliError('LOCAL_STATE_ERROR', 'tools collisions requires an active Project and Environment', { nextAction: 'Run atlas init' });
      const platform = new AtlasPlatformClient({ apiBase: credential.apiBase, token: credential.accessToken, fetchImpl: dependencies.fetchImpl, projectId: config.active.project_id, environmentId: config.active.environment_id }); const inspected = await platform.inspectMcp();
      writeResult(output, { ok: true, command: 'tools collisions', data: { collisions: inspected.collisions, collision_free: inspected.collisions.length === 0, tool_count: inspected.tools.length } }, json); return inspected.collisions.length === 0 ? 0 : 1;
    }
    if (command === 'doctor') {
      if (parsed.values.fix) throw new AtlasCliError('USAGE_ERROR', 'No automatic fixes are available yet; doctor will not mutate local or remote state');
      const root = path.resolve(dependencies.cwd ?? process.cwd(), parsed.values.dir!);
      if (await readUtf8Safe(path.join(root, 'atlas.config.ts')) !== null) {
        const result = await doctorLocalProject(root, { nodeVersion: dependencies.nodeVersion ?? process.version });
        writeResult(output, { ok: true, command: 'doctor', data: result, next_action: { code: result.summary.fail > 0 ? 'repair' : 'test', label: result.summary.fail > 0 ? 'Repair the failing local checks, then rerun atlas doctor.' : 'Run atlas test.' } }, json);
        return result.summary.fail > 0 ? 1 : 0;
      }
      const credential = await selection.store.get(selection.reference);
      const config = await new LocalConfigStore(parsed.values.dir!).read();
      const platform = credential ? new AtlasPlatformClient({ apiBase: credential.apiBase, token: credential.accessToken, fetchImpl: dependencies.fetchImpl, projectId: config?.active.project_id, environmentId: config?.active.environment_id }) : undefined;
      const result = await runDoctor({ root: parsed.values.dir!, client: parseMcpClient(parsed.values.client!), platform, supportBundle: parsed.values['support-bundle'] });
      writeResult(output, { ok: true, command: 'doctor', data: result }, json); return result.summary.fail > 0 ? 1 : 0;
    }
    if (command === 'validate') { const result = await validateAtlasConfig(parsed.values.dir!, parsed.values.file); writeResult(output, { ok: true, command, data: result }, json); return result.valid ? 0 : 1; }
    if (command === 'deploy') {
      const action = parsed.positionals[1] ?? 'plan';
      const root = path.resolve(dependencies.cwd ?? process.cwd(), parsed.values.dir!);
      const isLocalProject = await readUtf8Safe(path.join(root, 'atlas.config.ts')) !== null;
      if (isLocalProject && !parsed.values.cloud) {
        if (action !== 'plan') throw new AtlasCliError('CONFLICT', `Hosted deploy ${action} is unavailable for the local P1 project contract`, { nextAction: 'Run atlas deploy for the honest local readiness plan, or configure an approved hosted target later' });
        const data = await planLocalDeployment(root);
        writeResult(output, { ok: true, command: 'deploy', data, next_action: { code: 'dev', label: data.next_action } }, json);
        return 0;
      }
      const local=await planDeployment(parsed.values.dir!,parsed.values.file);if(!local.valid){writeResult(output,{ok:true,command:`deploy ${action}`,data:local},json);return 1;}
      const credential=await selection.store.get(selection.reference);if(!credential&&action==='plan'){writeResult(output,{ok:true,command:'deploy plan',data:{local,remote:null,offline:true}},json);return 0;}if(!credential)throw new AtlasCliError('AUTHENTICATION_REQUIRED','No Atlas credential is stored',{nextAction:'Run atlas login'});const platform=new AtlasPlatformClient({apiBase:credential.apiBase,token:credential.accessToken,fetchImpl:dependencies.fetchImpl});const active=await new LocalConfigStore(parsed.values.dir!).read();const project=parsed.values.project??active?.active.project_id;if(!project)throw missingProject();const environment=parsed.values.environment??active?.active.environment_id;
      let data:unknown;
      if(action==='plan'){if(!environment)throw missingEnvironment();data={local,remote:await platform.planDeployment(project,environment,local.config_digest)};}
      else if(action==='apply'){if(!environment)throw missingEnvironment();const key=parsed.values['idempotency-key']??await deploymentIdempotencyKey(parsed.values.dir!,{action,project,environment,digest:local.config_digest});data=await platform.applyDeployment(project,environment,{config:local.config as Record<string,unknown>,config_digest:local.config_digest,idempotency_key:key,...(parsed.values['approval-id']?{approval_id:parsed.values['approval-id']}:{})});}
      else if(action==='status'||action==='drift'){if(!environment)throw missingEnvironment();const remote=await platform.deploymentStatus(project,environment);const remoteDigest=(remote.deployment as Record<string,unknown>|undefined)?.config_digest;data=action==='drift'?{desired_digest:local.config_digest,remote_digest:remoteDigest??null,drifted:remoteDigest!==local.config_digest}:remote;}
      else if(action==='rollback'){if(!environment)throw missingEnvironment();const deployment=required(parsed.values.deployment,'--deployment');const key=parsed.values['idempotency-key']??await deploymentIdempotencyKey(parsed.values.dir!,{action,project,environment,deployment});data=await platform.rollbackDeployment(project,environment,deployment,key,parsed.values['approval-id']);}
      else {const from=required(parsed.values.from,'--from'),to=required(parsed.values.to,'--to');const key=parsed.values['idempotency-key']??await deploymentIdempotencyKey(parsed.values.dir!,{action,project,from,to,digest:local.config_digest});data=await platform.promoteDeployment(project,from,to,key,parsed.values['approval-id']);}
      writeResult(output,{ok:true,command:`deploy ${action}`,data},json);return isDeploymentApprovalPending(data)?5:0;
    }
    throw new AtlasCliError('USAGE_ERROR', `Unknown command: ${parsed.positionals.join(' ')}`);
  } catch (error) {
    const cliError = error instanceof AtlasCliError
      ? error
      : isNetworkError(error)
        ? new AtlasCliError('NETWORK_ERROR', error instanceof Error ? error.message : 'Atlas network request failed', { retryable: true })
        : new AtlasCliError('REMOTE_ERROR', error instanceof Error ? error.message : String(error));
    writeFailure(output, { ok: false, error: { code: cliError.code, message: cliError.message, retryable: cliError.retryable }, next_action: cliError.nextAction ? { code: 'recovery', label: cliError.nextAction } : undefined }, json);
    return cliError.exitCode;
  }
}

function helpText(): string {
  return `Mirai Atlas CLI ${VERSION}\n\nUsage:\n  atlas init front-desk [--dir PATH] [--existing] [--no-install] [--no-git]\n  atlas init --cloud [--client claude-code] [--client-id ID]\n  atlas login --client-id ID [--no-browser]\n  atlas logout\n  atlas whoami\n  atlas projects list|create|link|show\n  atlas env list|create|show|use\n  atlas run TOOL [--input JSON|@FILE] [--commit|--dry-run]\n  atlas runs list|show|tail|cancel|replay RUN_ID\n  atlas receipts list|show|verify RECEIPT_ID\n  atlas approvals list|show|approve|reject\n  atlas webhooks list|listen|trigger|replay\n  atlas usage\n  atlas logs show|follow TRACE_ID\n  atlas mcp install|status|test|inspect|uninstall\n  atlas tools collisions\n  atlas dev [--fail-first N] [--latency-ms N]\n  atlas test\n  atlas doctor [--support-bundle]\n  atlas capabilities\n  atlas explain project\n  atlas inspect\n  atlas replay [--input @SCENARIO.json]\n  atlas validate\n  atlas deploy [plan|apply|status|drift|promote|rollback]\n  atlas upgrade\n  atlas version\n\nGlobal options:\n  --json  --api-base URL  --credential-ref NAME  --file-credentials  --dir PATH`;
}

function assertCommandArity(command: string, positionals: readonly string[]): void {
  if (['version', 'login', 'logout', 'whoami', 'doctor', 'dev', 'test', 'capabilities', 'inspect', 'replay', 'upgrade'].includes(command) && positionals.length !== 1) {
    throw new AtlasCliError('USAGE_ERROR', `${command} does not accept positional arguments`);
  }
  if (command === 'explain' && (positionals.length !== 2 || positionals[1] !== 'project')) {
    throw new AtlasCliError('USAGE_ERROR', 'explain requires project');
  }
  if (command === 'init' && (positionals.length < 1 || positionals.length > 2)) {
    throw new AtlasCliError('USAGE_ERROR', 'init accepts at most one template name');
  }
  if (command === 'init' && positionals.length === 2 && positionals[1] !== 'front-desk') {
    throw new AtlasCliError('USAGE_ERROR', 'init supports only the front-desk template in P1');
  }
  if (['projects', 'env'].includes(command) && positionals.length !== 2) throw new AtlasCliError('USAGE_ERROR', `${command} requires exactly one action`);
  if (command === 'run' && positionals.length !== 2) throw new AtlasCliError('USAGE_ERROR', 'run requires exactly one tool identity');
  if (command === 'receipts' && !((positionals.length === 2 && positionals[1] === 'list') || (positionals.length === 3 && ['show', 'verify'].includes(positionals[1]!)))) throw new AtlasCliError('USAGE_ERROR', 'receipts requires list, show RECEIPT_ID, or verify RECEIPT_ID');
  if (command === 'runs' && !((positionals.length === 2 && positionals[1] === 'list') || (positionals.length === 3 && ['show', 'tail', 'cancel', 'replay'].includes(positionals[1]!)))) throw new AtlasCliError('USAGE_ERROR', 'runs requires list, show RUN_ID, tail RUN_ID, cancel RUN_ID, or replay RUN_ID');
  if (command === 'approvals' && !((positionals.length === 2 && positionals[1] === 'list') || (positionals.length === 3 && ['show', 'approve', 'reject'].includes(positionals[1]!)))) throw new AtlasCliError('USAGE_ERROR', 'approvals requires list, show ID, approve ID, or reject ID');
  if (command === 'webhooks' && !((positionals.length === 2 && ['list', 'listen'].includes(positionals[1]!)) || (positionals.length === 3 && ['trigger', 'replay'].includes(positionals[1]!)))) throw new AtlasCliError('USAGE_ERROR', 'webhooks requires list, listen, trigger EVENT, or replay FILE');
  if (command === 'usage' && positionals.length !== 1) throw new AtlasCliError('USAGE_ERROR', 'usage accepts no positional arguments');
  if (command === 'logs' && (positionals.length !== 3 || !['show', 'follow'].includes(positionals[1]!))) throw new AtlasCliError('USAGE_ERROR', 'logs requires show TRACE_ID or follow TRACE_ID');
  if (command === 'validate' && positionals.length !== 1) throw new AtlasCliError('USAGE_ERROR', 'validate accepts no positional arguments');
  if (command === 'deploy' && !((positionals.length === 1) || (positionals.length === 2 && ['plan', 'apply', 'status', 'promote', 'drift', 'rollback'].includes(positionals[1]!)))) throw new AtlasCliError('USAGE_ERROR', 'deploy accepts no action or requires plan, apply, status, promote, drift, or rollback');
  if (command === 'mcp' && (positionals.length !== 2 || !['install', 'status', 'test', 'inspect', 'uninstall'].includes(positionals[1]!))) throw new AtlasCliError('USAGE_ERROR', 'mcp requires install, status, test, inspect, or uninstall');
  if (command === 'tools' && (positionals.length !== 2 || positionals[1] !== 'collisions')) throw new AtlasCliError('USAGE_ERROR', 'tools requires collisions');
}

function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError || (error instanceof Error && ['AbortError', 'TimeoutError'].includes(error.name));
}

async function credentialKind(store: import('./credentials/types.js').CredentialStore, reference: string) {
  return store.kindFor ? store.kindFor(reference) : store.kind;
}

function required(value: string | undefined, flag: string): string { if (!value) throw new AtlasCliError('USAGE_ERROR', `${flag} is required`); return value; }
function missingProject() { return new AtlasCliError('LOCAL_STATE_ERROR', 'No active Project; pass --project or run atlas projects link'); }
function missingEnvironment() { return new AtlasCliError('LOCAL_STATE_ERROR', 'No active Environment; pass --environment or run atlas env use'); }
function isDeploymentApprovalPending(value: unknown): boolean { return Boolean(value && typeof value === 'object' && (value as Record<string, unknown>).approval_required === true); }
function parseMcpClient(value: string): McpClient { if (!['claude-code', 'claude-desktop', 'cursor', 'vscode', 'generic'].includes(value)) throw new AtlasCliError('USAGE_ERROR', 'Unsupported MCP client'); return value as McpClient; }
function parsePackageManagerOption(value: string | undefined): AtlasPackageManager | undefined { if (value === undefined) return undefined; if (!['npm', 'pnpm'].includes(value)) throw new AtlasCliError('USAGE_ERROR', '--package-manager must be npm or pnpm'); return value as AtlasPackageManager; }
function parseEnvironmentType(value: string | undefined): EnvironmentRecord['environment_type'] | undefined { if (!value) return undefined; if (!['sandbox', 'staging', 'production', 'custom'].includes(value)) throw new AtlasCliError('USAGE_ERROR', 'Invalid environment type'); return value as EnvironmentRecord['environment_type']; }
function parseIntegerOption(value: string | undefined, flag: string, minimum: number, maximum = Number.MAX_SAFE_INTEGER): number | undefined { if (value === undefined) return undefined; if (!/^\d+$/.test(value)) throw new AtlasCliError('USAGE_ERROR', `${flag} must be an integer`); const parsed = Number(value); if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) throw new AtlasCliError('USAGE_ERROR', `${flag} must be between ${minimum} and ${maximum}`); return parsed; }
function webhookEndpoint(value: string): string { let parsed: URL; try { parsed = new URL(value); } catch { throw new AtlasCliError('USAGE_ERROR', '--url must be an absolute HTTP(S) URL'); } if (!['http:', 'https:'].includes(parsed.protocol)) throw new AtlasCliError('USAGE_ERROR', '--url must be an absolute HTTP(S) URL'); if (parsed.pathname === '/' || parsed.pathname === '') parsed.pathname = '/webhooks'; return parsed.toString(); }

async function readJsonObjectFile(file: string): Promise<Record<string, unknown>> {
  try { const value = JSON.parse(await (await import('node:fs/promises')).readFile(file, 'utf8')); if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(); return value as Record<string, unknown>; }
  catch { throw new AtlasCliError('LOCAL_STATE_ERROR', `Unable to read webhook event JSON object: ${file}`); }
}

async function serveUntilStopped(server: AtlasDevServer, durationMs: number | undefined): Promise<void> {
  if (durationMs !== undefined) { await new Promise((resolve) => setTimeout(resolve, durationMs)); await server.close(); return; }
  await new Promise<void>((resolve) => {
    let stopping = false;
    const stop = () => { if (stopping) return; stopping = true; void server.close().finally(() => { process.off('SIGINT', stop); process.off('SIGTERM', stop); resolve(); }); };
    process.once('SIGINT', stop); process.once('SIGTERM', stop);
  });
}

async function parseInput(value: string | undefined): Promise<Record<string, unknown>> {
  if (!value) return {};
  let raw = value;
  if (value.startsWith('@')) {
    const file = value.slice(1); if (!file) throw new AtlasCliError('USAGE_ERROR', '--input @FILE requires a file path');
    try { raw = await (await import('node:fs/promises')).readFile(file, 'utf8'); }
    catch { throw new AtlasCliError('LOCAL_STATE_ERROR', `Unable to read input file: ${file}`); }
  }
  try { const parsed = JSON.parse(raw); if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error(); return parsed; }
  catch { throw new AtlasCliError('USAGE_ERROR', '--input must be a JSON object or @FILE containing one'); }
}

async function activate(
  store: LocalConfigStore,
  previous: AtlasLocalConfig | null,
  platform: AtlasPlatformClient,
  credential: import('./credentials/types.js').CredentialRecord,
  selection: ReturnType<typeof createCredentialStore>,
  active: { project_id?: string; environment_id?: string },
) {
  const identity = previous?.active.workspace_id ? { workspace_id: previous.active.workspace_id } : await platform.identity();
  await store.write({ schema_version: 'atlas.local-config/v1', active: { workspace_id: identity.workspace_id, ...active }, api_base: credential.apiBase, credential_ref: `${await credentialKind(selection.store, selection.reference)}:${selection.reference}`, updated_at: new Date().toISOString() });
}
