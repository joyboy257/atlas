import path from 'node:path';
import { rm } from 'node:fs/promises';
import { stringify } from 'yaml';
import { randomUUID, createHash } from 'node:crypto';
import type { CredentialRecord, CredentialStoreSelection } from './credentials/index.js';
import { AtlasCliError } from './errors.js';
import { atomicWrite, backupFile, readUtf8Safe, sha256 } from './fs-safety.js';
import { LocalConfigStore } from './local-config.js';
import { mcpConfigPath, mergeAtlasMcpConfig, type McpClient } from './mcp-config.js';
import { JournalStore, OperationLock, type FileMutation, type InitPhase, type OperationJournal } from './operation-journal.js';
import { AtlasPlatformClient, type EnvironmentRecord, type ProjectRecord } from './platform-client.js';

const PHASES: readonly InitPhase[] = ['start', 'inspect', 'authenticate', 'workspace', 'project', 'environment', 'project_config', 'mcp_config', 'first_request', 'complete'];

export type InitOptions = Readonly<{
  root: string; client: McpClient; apiBase: string;
  projectId?: string; projectSlug?: string; projectName?: string;
  environmentId?: string; environmentSlug?: string; environmentName?: string;
  environmentType?: EnvironmentRecord['environment_type']; rollback?: boolean;
}>;

export type InitResult = Readonly<{
  operation_id: string; resumed: boolean; project: ProjectRecord; environment: EnvironmentRecord;
  atlas_config_path: string; local_config_path: string; mcp_config_path: string;
  first_request: Record<string, unknown>;
}>;

export class InitEngine {
  constructor(private readonly dependencies: {
    platform: AtlasPlatformClient;
    credential: CredentialRecord;
    credentialSelection: CredentialStoreSelection;
    firstRequest?: () => Promise<Record<string, unknown>>;
    afterPhase?: (phase: InitPhase) => Promise<void> | void;
  }) {}

  async run(options: InitOptions): Promise<InitResult> {
    const root = path.resolve(options.root);
    const lock = new OperationLock(root);
    const journals = new JournalStore(root);
    await lock.acquire();
    try {
      const existing = await journals.read();
      if (options.rollback) {
        if (!existing) throw new AtlasCliError('LOCAL_STATE_ERROR', 'No Atlas init journal exists to roll back');
        await this.rollback(existing, journals);
        throw new AtlasCliError('LOCAL_STATE_ERROR', 'Atlas init local changes rolled back', { nextAction: 'Run atlas init to start again' });
      }
      const fingerprint = fingerprintOptions(options);
      if (existing && !['completed', 'rolled_back'].includes(existing.status) && existing.fingerprint !== fingerprint) {
        throw new AtlasCliError('LOCAL_STATE_ERROR', 'An interrupted atlas init exists with different options', { nextAction: 'Resume with the same options or run atlas init --rollback' });
      }
      const resumed = Boolean(existing && !['completed', 'rolled_back'].includes(existing.status));
      let journal = resumed ? { ...existing!, status: 'in_progress' as const, updated_at: now() } : newJournal(fingerprint);
      await journals.write(journal);
      try {
        for (const phase of PHASES) {
          if (phaseIndex(phase) <= phaseIndex(journal.phase)) continue;
          journal = await this.execute(phase, options, root, journal);
          await journals.write(journal);
          await this.dependencies.afterPhase?.(phase);
        }
      } catch (error) {
        journal = { ...journal, status: 'interrupted', updated_at: now() };
        await journals.write(journal);
        throw error;
      }
      return resultFrom(journal, root, options.client, resumed);
    } finally { await lock.release(); }
  }

  private async execute(phase: InitPhase, options: InitOptions, root: string, journal: OperationJournal): Promise<OperationJournal> {
    let context = { ...journal.context };
    let mutations = [...journal.file_mutations];
    if (phase === 'inspect') context = { ...context, inspection: await inspectRoot(root) };
    if (phase === 'authenticate') context = { ...context, credential_ref: `${await credentialKind(this.dependencies.credentialSelection)}:${this.dependencies.credentialSelection.reference}` };
    if (phase === 'workspace') context = { ...context, ...(await this.dependencies.platform.identity()) };
    if (phase === 'project') {
      const configured = options.projectId ?? optionalString(context.project_id);
      const project = configured
        ? await this.dependencies.platform.showProject(configured)
        : (await this.dependencies.platform.createProject({
            slug: options.projectSlug ?? 'atlas-quickstart', name: options.projectName ?? 'Atlas Quickstart',
            idempotency_key: journal.remote_idempotency_keys.project!,
          })).project;
      context = { ...context, project, project_id: project.external_id };
    }
    if (phase === 'environment') {
      const project = requireContext<ProjectRecord>(context, 'project');
      const configured = options.environmentId ?? optionalString(context.environment_id);
      const environment = configured
        ? await this.dependencies.platform.showEnvironment(project.external_id, configured)
        : (await this.dependencies.platform.createEnvironment(project.external_id, {
            slug: options.environmentSlug ?? 'sandbox', name: options.environmentName ?? 'Sandbox',
            environment_type: options.environmentType ?? 'sandbox', idempotency_key: journal.remote_idempotency_keys.environment!,
          })).environment;
      context = { ...context, environment, environment_id: environment.external_id };
    }
    if (phase === 'project_config') {
      const project = requireContext<ProjectRecord>(context, 'project');
      const environment = requireContext<EnvironmentRecord>(context, 'environment');
      const atlasPath = path.join(root, 'atlas.yaml');
      const yaml = stringify({ apiVersion: 'atlas.mirai/v1', kind: 'Project', metadata: { name: project.slug }, spec: { projectId: project.external_id, agents: {}, environments: { [environment.slug]: { environmentId: environment.external_id } } } });
      mutations = await writeTracked(root, journal.operation_id, mutations, atlasPath, yaml);
      const localStore = new LocalConfigStore(root);
      const local = `${JSON.stringify({ schema_version: 'atlas.local-config/v1', active: { workspace_id: asString(context.workspace_id), project_id: project.external_id, environment_id: environment.external_id }, api_base: this.dependencies.credential.apiBase, credential_ref: context.credential_ref, updated_at: now() }, null, 2)}\n`;
      mutations = await writeTracked(root, journal.operation_id, mutations, localStore.filePath, local);
      context = { ...context, atlas_config_path: atlasPath, local_config_path: localStore.filePath };
    }
    if (phase === 'mcp_config') {
      const target = mcpConfigPath(root, options.client);
      const existing = await readUtf8Safe(target);
      const project = requireContext<ProjectRecord>(context, 'project'); const environment = requireContext<EnvironmentRecord>(context, 'environment');
      const merged = mergeAtlasMcpConfig(existing, options.client, options.apiBase, { projectId: project.external_id, environmentId: environment.external_id });
      if (merged.changed) mutations = await writeTracked(root, journal.operation_id, mutations, target, merged.contents);
      context = { ...context, mcp_config_path: target };
    }
    if (phase === 'first_request') {
      const project = requireContext<ProjectRecord>(context, 'project');
      const environment = requireContext<EnvironmentRecord>(context, 'environment');
      context = { ...context, first_request: await (this.dependencies.firstRequest ?? (() => this.dependencies.platform.execute({
        tool: 'mirai.knowledge.search', input: { query: 'What time does the sandbox cafe open?' }, mode: 'read',
        idempotency_key: journal.operation_id, project_id: project.external_id, environment_id: environment.external_id,
      })))() };
    }
    return { ...journal, phase, status: phase === 'complete' ? 'completed' : 'in_progress', updated_at: now(), context, file_mutations: mutations };
  }

  private async rollback(journal: OperationJournal, store: JournalStore): Promise<void> {
    let next: OperationJournal = { ...journal, status: 'rolling_back', updated_at: now() };
    await store.write(next);
    const steps = [];
    for (const mutation of [...journal.file_mutations].reverse()) {
      try {
        if (mutation.backup_path) {
          const backup = await readUtf8Safe(mutation.backup_path);
          if (backup === null) throw new Error('backup missing');
          await atomicWrite(mutation.path, backup);
        } else await rm(mutation.path, { force: true });
        steps.push({ code: `restore:${mutation.path}`, status: 'completed' as const });
      } catch {
        steps.push({ code: `restore:${mutation.path}`, status: 'failed' as const });
      }
    }
    next = { ...next, status: steps.some((step) => step.status === 'failed') ? 'failed' : 'rolled_back', updated_at: now(), rollback_steps: steps };
    await store.write(next);
    if (next.status === 'failed') throw new AtlasCliError('LOCAL_STATE_ERROR', 'Atlas init rollback was incomplete; inspect .atlas/state.json');
  }
}

async function writeTracked(root: string, operationId: string, mutations: FileMutation[], target: string, contents: string): Promise<FileMutation[]> {
  const prior = await readUtf8Safe(target);
  const existing = mutations.find((mutation) => mutation.path === target);
  if (existing?.after_digest === sha256(contents)) return mutations;
  const relative = path.relative(root, target).replace(/[^a-zA-Z0-9._-]/g, '_');
  const backupPath = prior === null ? null : path.join(root, '.atlas', 'backups', operationId, `${relative}.bak`);
  if (backupPath) await backupFile(target, backupPath);
  await atomicWrite(target, contents);
  const mutation: FileMutation = { path: target, action: prior === null ? 'create' : 'merge', backup_path: backupPath, before_digest: prior === null ? null : sha256(prior), after_digest: sha256(contents) };
  return [...mutations.filter((item) => item.path !== target), mutation];
}

async function inspectRoot(root: string) {
  const candidates = ['pnpm-lock.yaml', 'package-lock.json', 'yarn.lock', 'bun.lockb'];
  const present = [];
  for (const candidate of candidates) if (await readUtf8Safe(path.join(root, candidate)) !== null) present.push(candidate);
  return { root, package_manager: present[0]?.split('-')[0]?.split('.')[0] ?? null, lockfiles: present };
}

function newJournal(fingerprint: string): OperationJournal {
  const timestamp = now();
  return { schema_version: 'atlas.operation-journal/v1', operation_id: randomUUID(), command: 'init', fingerprint, phase: 'start', status: 'in_progress', started_at: timestamp, updated_at: timestamp, file_mutations: [], remote_idempotency_keys: { project: randomUUID(), environment: randomUUID() }, rollback_steps: [], context: {} };
}
function phaseIndex(phase: InitPhase) { return PHASES.indexOf(phase); }
function fingerprintOptions(options: InitOptions) { return createHash('sha256').update(JSON.stringify({ ...options, rollback: false, root: path.resolve(options.root) })).digest('hex'); }
function now() { return new Date().toISOString(); }
function asString(value: unknown): string { if (typeof value !== 'string' || !value) throw new AtlasCliError('LOCAL_STATE_ERROR', 'Atlas init journal is missing required context'); return value; }
function optionalString(value: unknown): string | undefined { return typeof value === 'string' && value ? value : undefined; }
function requireContext<T>(context: Record<string, unknown>, key: string): T { const value = context[key]; if (!value || typeof value !== 'object') throw new AtlasCliError('LOCAL_STATE_ERROR', `Atlas init journal is missing ${key}`); return value as T; }
async function credentialKind(selection: CredentialStoreSelection) { return selection.store.kindFor ? selection.store.kindFor(selection.reference) : selection.store.kind; }
function resultFrom(journal: OperationJournal, root: string, client: McpClient, resumed: boolean): InitResult {
  return { operation_id: journal.operation_id, resumed, project: requireContext(journal.context as Record<string, unknown>, 'project'), environment: requireContext(journal.context as Record<string, unknown>, 'environment'), atlas_config_path: path.join(root, 'atlas.yaml'), local_config_path: path.join(root, '.atlas', 'config.json'), mcp_config_path: mcpConfigPath(root, client), first_request: requireContext(journal.context as Record<string, unknown>, 'first_request') };
}
