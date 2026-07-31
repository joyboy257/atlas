import os from 'node:os';
import path from 'node:path';
import { copyFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { AtlasCliError } from './errors.js';
import { atomicWriteProjectFile, readUtf8Safe } from './fs-safety.js';
import { AtlasLocalRuntime, ATLAS_LOCAL_RUNTIME_VERSION, type AtlasLocalInboundMessage } from './local-runtime.js';
import { AtlasLocalMissionCoordinator } from './mission-coordinator.js';
import type { MissionScope } from './mission-contract.js';
import { AtlasMessagingSimulator, type AtlasSimulatorScenario } from './messaging-simulator.js';
import {
  projectCoordinatorResult,
  projectMissionControlResult,
  type AtlasPublicCoordinatorResult,
  type AtlasPublicMissionControlResult,
} from './public-projections.js';
import {
  ATLAS_PROJECT_CONFIG_FILE,
  loadAtlasProject,
  migrateAtlasProject,
  parseAtlasConfigSource,
  renderAtlasProjectConfig,
} from './project-contract.js';
import { ATLAS_PACKAGE_VERSION } from './scaffold.js';

export type AtlasLocalDoctorCheck = Readonly<{
  code: string;
  status: 'pass' | 'note' | 'fail';
  message: string;
  next_action: string | null;
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type AtlasPublicDeliveryState = 'queued' | 'retry_scheduled' | 'sent' | 'delivered' | 'read' | 'rejected' | 'failed';

export type AtlasLocalTestResult = Readonly<{
  schema_version: 'atlas.local-test/v1';
  status: 'passed';
  scenario_id: 'front-desk-first-agent-loop';
  project_hash: string;
  exactly_once: boolean;
  action_count: number;
  delivery_state: AtlasPublicDeliveryState | null;
  replayed: boolean;
  receipt_kinds: readonly string[];
  trace_event_types: readonly string[];
  next_action: string;
}>;

export type AtlasLocalReplayResult = Readonly<{
  schema_version: 'atlas.local-replay/v1';
  status: 'passed';
  scenario_id: string;
  project_hash: string;
  transcript: readonly Readonly<{
    index: number;
    type: string;
    capture_as: string | null;
    status: 'passed';
  }>[];
  final: Readonly<{
    action_count: number;
    delivery_state: AtlasPublicDeliveryState | null;
    receipt_count: number;
    trace_count: number;
    replayed: boolean;
  }>;
  next_action: string;
}>;

export type AtlasLocalDoctorResult = Readonly<{
  schema_version: 'atlas.local-doctor/v1';
  project_root: string;
  project_hash: string | null;
  checks: readonly AtlasLocalDoctorCheck[];
  summary: Readonly<{ pass: number; note: number; fail: number }>;
}>;

const CLI_COMMANDS = [
  'init', 'dev', 'test', 'doctor', 'capabilities', 'explain project', 'inspect', 'replay', 'deploy', 'upgrade',
] as const;

export async function testLocalProject(root: string): Promise<AtlasLocalTestResult> {
  const result = await runCanonicalScenario(root);
  return {
    schema_version: 'atlas.local-test/v1',
    status: result.status,
    scenario_id: 'front-desk-first-agent-loop',
    project_hash: result.final_state.identity.project_hash,
    exactly_once: result.final_state.actions.length === 1 && result.captures.replay?.replayed === true,
    action_count: result.final_state.actions.length,
    delivery_state: result.final_state.outbox[0]?.state ?? null,
    replayed: result.captures.replay?.replayed === true,
    receipt_kinds: uniqueSorted(result.final_state.receipts.map((receipt) => receipt.kind)),
    trace_event_types: uniqueSorted(result.final_state.traces.flatMap((trace) => trace.events.map((event) => event.type))),
    next_action: 'Run atlas dev and complete the same scenario in the local workbench.',
  };
}

export type AtlasPublicSimulatorScenario = Readonly<{
  id: string;
  events: readonly Readonly<Record<string, unknown>>[];
}>;

export type AtlasPublicMissionMessage = Readonly<{
  message_id: string;
  conversation_id: string;
  customer_id: string;
  channel_id: string;
  sequence: number;
  occurred_at: string;
  text: string;
  consent: boolean;
  within_messaging_window: boolean;
}>;

export async function replayLocalProject(root: string, scenario?: unknown): Promise<AtlasLocalReplayResult> {
  const result = scenario ? await runScenarioInSandbox(root, scenario as AtlasSimulatorScenario) : await runCanonicalScenario(root);
  return {
    schema_version: 'atlas.local-replay/v1',
    status: result.status,
    scenario_id: result.scenario_id,
    project_hash: result.final_state.identity.project_hash,
    transcript: result.transcript.map(({ index, type, capture_as, status }) => ({ index, type, capture_as, status })),
    final: {
      action_count: result.final_state.actions.length,
      delivery_state: result.final_state.outbox[0]?.state ?? null,
      receipt_count: result.final_state.receipts.length,
      trace_count: result.final_state.traces.length,
      replayed: result.captures.replay?.replayed === true,
    },
    next_action: 'Inspect the transcript, then run atlas dev for interactive replay.',
  } as const;
}

export async function doctorLocalProject(
  root: string,
  options: Readonly<{ nodeVersion?: string }> = {},
): Promise<AtlasLocalDoctorResult> {
  const projectRoot = path.resolve(root);
  const checks: AtlasLocalDoctorCheck[] = [];
  const nodeVersion = options.nodeVersion ?? process.version;
  const major = parseNodeMajor(nodeVersion);
  checks.push(major >= 22
    ? check('NODE_SUPPORTED', 'pass', `Node.js ${nodeVersion} satisfies Atlas >=22.`, null, { node_version: nodeVersion })
    : check('NODE_UNSUPPORTED', 'fail', `Node.js ${nodeVersion} is below the supported Atlas runtime.`, 'Install Node.js 22 LTS or newer.', { node_version: nodeVersion }));

  let projectHash: string | null = null;
  try {
    const project = await loadAtlasProject(projectRoot);
    projectHash = project.package_hash;
    checks.push(check('PROJECT_CONFIG_VALID', 'pass', 'atlas.config.ts matches project schema v1.', null));
    checks.push(check('PROJECT_HASH_READY', 'pass', 'The governed project package hash is deterministic.', null, { package_hash: project.package_hash }));
    checks.push(check('PROJECT_REFERENCES_VALID', 'pass', `${project.files.length} governed project files resolve inside the project root.`, null, { file_count: project.files.length }));
    checks.push(check('RAW_SECRETS_ABSENT', 'pass', 'Configuration contains typed references only; no raw secret material was accepted.', null));

    const stateRaw = await readUtf8Safe(path.join(projectRoot, '.atlas', 'runtime-state.json'));
    if (stateRaw === null) {
      checks.push(check('RUNTIME_STATE_NOT_CREATED', 'note', 'No local runtime state exists yet.', 'Run atlas dev to create local identity and conversation state.'));
    } else {
      const state = parseRuntimeSummary(stateRaw);
      if (state.schema_version !== ATLAS_LOCAL_RUNTIME_VERSION || state.project_hash !== project.package_hash) {
        checks.push(check('RUNTIME_STATE_MISMATCH', 'fail', 'Local runtime state is incompatible with the current project hash.', 'Preserve the state for evidence, then run atlas upgrade or create a fresh local project.'));
      } else {
        checks.push(check('RUNTIME_STATE_VALID', 'pass', 'Local runtime state matches the current project hash.', null, { project_hash: state.project_hash }));
      }
    }
  } catch (error) {
    checks.push(check('PROJECT_CONFIG_INVALID', 'fail', error instanceof Error ? error.message : 'Atlas project validation failed.', 'Repair atlas.config.ts and its referenced files.'));
  }

  const summary = {
    pass: checks.filter((item) => item.status === 'pass').length,
    note: checks.filter((item) => item.status === 'note').length,
    fail: checks.filter((item) => item.status === 'fail').length,
  };
  return { schema_version: 'atlas.local-doctor/v1', project_root: projectRoot, project_hash: projectHash, checks, summary };
}

export async function explainLocalProject(root: string) {
  const project = await loadAtlasProject(path.resolve(root));
  return {
    schema_version: 'atlas.project-explanation/v1',
    package_version: ATLAS_PACKAGE_VERSION,
    project_root: path.resolve(root),
    project_hash: project.package_hash,
    environment: project.environment,
    config: project.config,
    files: project.files,
    authority: {
      atlas_owns: [
        'identity and conversation context',
        'approved knowledge and tool scope',
        'policy',
        'approval',
        'committed business actions',
        'delivery',
        'traces',
        'receipts',
      ],
      external_runtimes_may: ['reason', 'retrieve allowed context', 'propose governed actions'],
      external_runtimes_must_not: ['supply tenant authority', 'bypass approval', 'commit business mutations', 'forge delivery or receipts'],
    },
    first_agent_loop: [
      'customer message', 'knowledge evidence', 'tool proposal', 'policy decision', 'operator approval or handoff',
      'exactly-once action', 'simulated provider delivery', 'trace and receipts',
    ],
    next_action: 'Run atlas test, then atlas dev.',
  } as const;
}

export async function listLocalCapabilities(root: string) {
  const project = await loadAtlasProject(path.resolve(root));
  return {
    schema_version: 'atlas.local-capabilities/v1',
    package_version: ATLAS_PACKAGE_VERSION,
    project_hash: project.package_hash,
    runtime: project.config.runtime.mode,
    model: project.config.model.mode,
    zero_credentials: project.config.model.mode === 'local-fixture',
    zero_paid_model: project.config.model.mode === 'local-fixture',
    channels: project.config.channels.map((source) => ({ id: path.basename(source, path.extname(source)), source, provider: 'atlas-simulator' })),
    tools: [{
      id: 'front-desk.bookings.reschedule',
      source: 'agent/tools/reschedule-booking.ts',
      risk: 'high',
      execution: 'commit',
      approval: 'required',
      idempotency: 'required',
    }],
    governance: {
      policies: ['approval_required', 'consent_required', 'messaging_window_closed', 'human_handoff'],
      delivery_states: ['queued', 'retry_scheduled', 'sent', 'delivered', 'read', 'rejected', 'failed'],
      evidence: ['knowledge', 'policy', 'approval', 'action', 'outcome', 'outbox', 'delivery', 'handoff'],
    },
    commands: [...CLI_COMMANDS],
    next_action: 'Run atlas explain project for the source-bound package map.',
  } as const;
}

export type LocalMissionScopeInput = Readonly<{
  tenantId: string;
  organisationId: string;
  projectId: string;
  environmentId: string;
}>;

export type LocalMissionCommandOptions = Readonly<{
  clock?: () => string;
}>;

export async function controlLocalMission(
  root: string,
  scope: LocalMissionScopeInput,
  command: 'inspect' | 'pause' | 'resume' | 'cancel',
  missionId: string,
  actorIdentity = '',
  reason = '',
  options: LocalMissionCommandOptions = {},
): Promise<AtlasPublicMissionControlResult> {
  const coordinator = await AtlasLocalMissionCoordinator.open({ root, scope, ...options });
  const result = await coordinator.control(missionId, command, actorIdentity, reason);
  return projectMissionControlResult(result);
}

export async function replayLocalMission(
  root: string,
  scope: LocalMissionScopeInput,
  message: AtlasPublicMissionMessage,
  options: LocalMissionCommandOptions = {},
): Promise<AtlasPublicCoordinatorResult> {
  const coordinator = await AtlasLocalMissionCoordinator.open({ root, scope, ...options });
  return projectCoordinatorResult(await coordinator.replay(message));
}

export async function decideLocalMissionApproval(
  root: string,
  scope: LocalMissionScopeInput,
  approvalId: string,
  decision: 'approve' | 'reject',
  operatorId: string,
  reason?: string,
  options: LocalMissionCommandOptions = {},
): Promise<AtlasPublicCoordinatorResult> {
  const coordinator = await AtlasLocalMissionCoordinator.open({ root, scope, ...options });
  return projectCoordinatorResult(
    await (decision === 'approve'
      ? coordinator.approve(approvalId, operatorId, reason)
      : coordinator.reject(approvalId, operatorId, reason)),
  );
}

export async function inspectLocalProject(root: string) {
  const projectRoot = path.resolve(root);
  const project = await loadAtlasProject(projectRoot);
  const raw = await readUtf8Safe(path.join(projectRoot, '.atlas', 'runtime-state.json'));
  if (raw === null) {
    return {
      schema_version: 'atlas.local-inspection/v1',
      project_hash: project.package_hash,
      runtime_state: 'not_created',
      counts: { conversations: 0, messages: 0, actions: 0, outbox: 0, receipts: 0, traces: 0 },
      latest: { conversation: null, approval: null, action: null, outbox: null, trace: null },
      receipt_kinds: [],
      next_action: 'Run atlas dev to create the local runtime state.',
    } as const;
  }
  const state = parseRuntimeStateForInspection(raw, project.package_hash);
  return {
    schema_version: 'atlas.local-inspection/v1',
    project_hash: project.package_hash,
    runtime_state: 'ready',
    counts: {
      conversations: Object.keys(state.conversations).length,
      messages: state.messages.length,
      actions: state.actions.length,
      outbox: state.outbox.length,
      receipts: state.receipts.length,
      traces: state.traces.length,
    },
    latest: {
      conversation: summarizeConversation(Object.values(state.conversations).at(-1)),
      approval: summarizeApproval(Object.values(state.approvals).at(-1)),
      action: summarizeAction(state.actions.at(-1)),
      outbox: summarizeOutbox(state.outbox.at(-1)),
      trace: summarizeTrace(state.traces.at(-1)),
    },
    receipt_kinds: uniqueSorted(state.receipts.map((receipt) => String(receipt.kind))),
    next_action: state.actions.length === 0 ? 'Run atlas dev and send the default customer message.' : 'Inspect the latest trace and delivery state in atlas dev.',
  } as const;
}

export async function planLocalDeployment(root: string) {
  const project = await loadAtlasProject(path.resolve(root));
  return {
    schema_version: 'atlas.local-deployment-plan/v1',
    status: 'local_ready',
    package_version: ATLAS_PACKAGE_VERSION,
    project_hash: project.package_hash,
    package_ready: true,
    governed_file_count: project.files.length,
    hosted_apply_available: false,
    staging_proven: false,
    production_proven: false,
    blockers: ['published package unavailable', 'hosted deployment target not configured'],
    protected_boundaries: ['no package publication', 'no live provider connection', 'no cloud mutation', 'no staging or production claim'],
    next_action: 'Use atlas dev for the certified local journey. Configure an explicit hosted target only after founder approval.',
  } as const;
}

export async function upgradeLocalProject(root: string) {
  const projectRoot = path.resolve(root);
  const configPath = path.join(projectRoot, ATLAS_PROJECT_CONFIG_FILE);
  const raw = await readUtf8Safe(configPath);
  if (raw === null) {
    throw new AtlasCliError('LOCAL_STATE_ERROR', `Atlas project configuration not found: ${configPath}`, {
      nextAction: 'Run atlas init front-desk or restore atlas.config.ts',
    });
  }
  const parsed = parseAtlasConfigSource(raw, 'project');
  const migration = migrateAtlasProject(parsed);
  if (!migration.changed) {
    return {
      schema_version: 'atlas.local-upgrade/v1',
      changed: false,
      from_version: migration.from_version,
      to_version: migration.to_version,
      backup_path: null,
      patch: migration.patch,
      next_action: 'Run atlas doctor to verify the current project.',
    } as const;
  }
  const backupName = `${ATLAS_PROJECT_CONFIG_FILE}.atlas-v${migration.from_version}.bak`;
  const backupPath = path.join(projectRoot, backupName);
  const priorBackup = await readUtf8Safe(backupPath);
  if (priorBackup !== null && priorBackup !== raw) {
    throw new AtlasCliError('CONFLICT', `Upgrade backup already exists with different content: ${backupName}`, {
      nextAction: `Preserve or move ${backupName}, then rerun atlas upgrade`,
    });
  }
  if (priorBackup === null) await atomicWriteProjectFile(backupPath, raw, 0o600);
  await atomicWriteProjectFile(configPath, renderAtlasProjectConfig(migration.config), 0o644);
  const verified = await loadAtlasProject(projectRoot);
  return {
    schema_version: 'atlas.local-upgrade/v1',
    changed: true,
    from_version: migration.from_version,
    to_version: migration.to_version,
    backup_path: backupName,
    patch: migration.patch,
    project_hash: verified.package_hash,
    next_action: 'Run atlas doctor, then atlas test.',
  } as const;
}

async function runCanonicalScenario(root: string) {
  return runScenarioInSandbox(root, canonicalScenario());
}

async function runScenarioInSandbox(root: string, scenario: AtlasSimulatorScenario) {
  const sourceRoot = path.resolve(root);
  const sandbox = await cloneGovernedProject(sourceRoot);
  try {
    let milliseconds = Date.parse('2026-07-24T08:00:00.000Z');
    const runtime = await AtlasLocalRuntime.open({ root: sandbox, clock: () => new Date(milliseconds).toISOString() });
    const identity = runtime.snapshot().identity;
    const coordinator = await AtlasLocalMissionCoordinator.open({
      root: sandbox,
      scope: {
        tenantId: identity.tenant_id,
        organisationId: `local-org-${identity.project_hash.slice(0, 16)}`,
        projectId: identity.project_hash,
        environmentId: 'local',
      },
      clock: () => new Date(milliseconds).toISOString(),
    });
    const simulator = new AtlasMessagingSimulator(coordinator, { advance: (value) => { milliseconds += value; } });
    return await simulator.runScenario(scenario);
  } finally {
    await rm(sandbox, { recursive: true, force: true });
  }
}

async function cloneGovernedProject(root: string): Promise<string> {
  const project = await loadAtlasProject(root);
  const sandbox = await mkdtemp(path.join(os.tmpdir(), 'atlas-local-command-'));
  const files = [ATLAS_PROJECT_CONFIG_FILE, ...project.files];
  try {
    for (const relativePath of files) {
      const source = path.join(root, ...relativePath.split('/'));
      const target = path.join(sandbox, ...relativePath.split('/'));
      await mkdir(path.dirname(target), { recursive: true });
      await copyFile(source, target);
    }
    const cloned = await loadAtlasProject(sandbox);
    if (cloned.package_hash !== project.package_hash) {
      throw new AtlasCliError('LOCAL_STATE_ERROR', 'Disposable Atlas test sandbox changed the project hash', {
        nextAction: 'Inspect project file normalization before relying on the local test result',
      });
    }
    return sandbox;
  } catch (error) {
    await rm(sandbox, { recursive: true, force: true });
    throw error;
  }
}

function canonicalScenario(): AtlasSimulatorScenario {
  return {
    id: 'front-desk-first-agent-loop',
    events: [
      {
        type: 'inbound', capture_as: 'turn',
        message: {
          message_id: 'msg_atlas_test_001', conversation_id: 'conv_atlas_test_001', customer_id: 'cust_atlas_test_001', channel_id: 'local-web-chat',
          sequence: 1, occurred_at: '2026-07-24T08:00:00.000Z', text: 'Can I move booking BK-100 to Friday?', consent: true, within_messaging_window: true,
        },
      },
      { type: 'approve', approval_from: 'turn', operator_id: 'operator_atlas_test', capture_as: 'commit' },
      { type: 'deliver', outbox_from: 'commit', outcome: 'delivered', provider_message_id: 'provider_atlas_test_001', capture_as: 'delivery' },
      { type: 'replay_inbound', message_from: 'turn', capture_as: 'replay' },
    ],
  };
}

function parseNodeMajor(value: string): number {
  const match = /^v?(\d+)/.exec(value);
  return match ? Number(match[1]) : 0;
}

function check(
  code: string,
  status: AtlasLocalDoctorCheck['status'],
  message: string,
  nextAction: string | null,
  metadata?: Readonly<Record<string, unknown>>,
): AtlasLocalDoctorCheck {
  return { code, status, message, next_action: nextAction, ...(metadata ? { metadata } : {}) };
}

function parseRuntimeSummary(raw: string): Readonly<{ schema_version: string; project_hash: string | null }> {
  try {
    const state = JSON.parse(raw) as Record<string, unknown>;
    const identity = isRecord(state.identity) ? state.identity : {};
    return { schema_version: typeof state.schema_version === 'string' ? state.schema_version : '', project_hash: typeof identity.project_hash === 'string' ? identity.project_hash : null };
  } catch {
    return { schema_version: '', project_hash: null };
  }
}

type InspectableState = Readonly<{
  conversations: Record<string, any>;
  messages: any[];
  proposals: Record<string, any>;
  approvals: Record<string, any>;
  actions: any[];
  outbox: any[];
  traces: any[];
  receipts: any[];
}>;

function parseRuntimeStateForInspection(raw: string, expectedHash: string): InspectableState {
  let state: Record<string, any>;
  try { state = JSON.parse(raw) as Record<string, any>; }
  catch { throw new AtlasCliError('LOCAL_STATE_ERROR', 'Local runtime state is not valid JSON', { nextAction: 'Preserve it for evidence, then repair or recreate the local state' }); }
  if (state.schema_version !== ATLAS_LOCAL_RUNTIME_VERSION || state.identity?.project_hash !== expectedHash) {
    throw new AtlasCliError('LOCAL_STATE_ERROR', 'Local runtime state does not match the current project hash', { nextAction: 'Run atlas doctor before inspecting the state' });
  }
  for (const key of ['conversations', 'proposals', 'approvals']) if (!isRecord(state[key])) state[key] = {};
  for (const key of ['messages', 'actions', 'outbox', 'traces', 'receipts']) if (!Array.isArray(state[key])) state[key] = [];
  return state as InspectableState;
}

function summarizeConversation(value: any) {
  return value ? { id: value.id, state: value.state, last_sequence: value.last_sequence, operator_id: value.operator_id } : null;
}
function summarizeApproval(value: any) {
  return value ? { id: value.id, proposal_id: value.proposal_id, status: value.status, operator_id: value.operator_id, action_id: value.action_id } : null;
}
function summarizeAction(value: any) {
  return value ? { id: value.id, proposal_id: value.proposal_id, tool_id: value.tool_id, idempotency_key: value.idempotency_key, committed_at: value.committed_at } : null;
}
function summarizeOutbox(value: any) {
  return value ? { id: value.id, state: value.state, attempts: value.attempts, provider_message_id: value.provider_message_id, provider_code: value.provider_code } : null;
}
function summarizeTrace(value: any) {
  return value ? { id: value.id, status: value.status, event_types: Array.isArray(value.events) ? value.events.map((event: any) => event.type) : [] } : null;
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
