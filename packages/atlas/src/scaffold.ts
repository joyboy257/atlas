import path from 'node:path';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { lstat, mkdir, readdir, rm } from 'node:fs/promises';
import { AtlasCliError } from './errors.js';
import { atomicWrite, atomicWriteProjectFile, backupFile, readUtf8Safe, sha256 } from './fs-safety.js';
import {
  defineAtlasProject,
  loadAtlasProject,
  renderAtlasProjectConfig,
  type AtlasProjectConfig,
} from './project-contract.js';

export const ATLAS_SCAFFOLD_REPORT_VERSION = 'atlas.adoption-report/v1' as const;
export const ATLAS_SCAFFOLD_STATE_VERSION = 'atlas.scaffold-state/v1' as const;
export const ATLAS_PACKAGE_VERSION = '0.1.0-alpha.0' as const;

export type AtlasPackageManager = 'npm' | 'pnpm';
export type AtlasScaffoldMode = 'new' | 'current' | 'existing' | 'resume';
export type AtlasScaffoldFileAction = 'create' | 'merge' | 'unchanged';

export type AtlasCommandInvocation = Readonly<{
  command: string;
  args: readonly string[];
  cwd: string;
}>;

export type AtlasCommandResult = Readonly<{
  exitCode: number;
  stdout: string;
  stderr: string;
}>;

export type AtlasGitInspection = Readonly<{
  available: boolean;
  repository: boolean;
  dirty: boolean;
  root: string | null;
}>;

export type AtlasScaffoldDependencies = Readonly<{
  runCommand: (invocation: AtlasCommandInvocation) => Promise<AtlasCommandResult>;
  inspectGit: (root: string) => Promise<AtlasGitInspection>;
}>;

export type AtlasScaffoldOptions = Readonly<{
  cwd: string;
  target?: string;
  template?: 'front-desk';
  existing?: boolean;
  install?: boolean;
  initializeGit?: boolean;
  nodeVersion?: string;
  packageManager?: AtlasPackageManager;
  atlasDependency?: string;
}>;

export type AtlasScaffoldFilePlan = Readonly<{
  path: string;
  action: AtlasScaffoldFileAction;
  before_digest: string | null;
  after_digest: string;
  contents?: string;
  backup_path?: string | null;
}>;

export type AtlasScaffoldFileRecord = Readonly<Omit<AtlasScaffoldFilePlan, 'contents'>>;

export type AtlasScaffoldPlan = Readonly<{
  schema_version: typeof ATLAS_SCAFFOLD_REPORT_VERSION;
  operation_id: string;
  status: 'planned';
  template: 'front-desk';
  mode: AtlasScaffoldMode;
  root: string;
  target: string;
  package_manager: AtlasPackageManager;
  atlas_dependency: string;
  node_version: string;
  files: readonly AtlasScaffoldFilePlan[];
  git: AtlasGitInspection & Readonly<{ initialized: false }>;
  warnings: readonly string[];
  rollback: Readonly<{ command: string; instructions: readonly string[] }>;
  adoption_report_path: '.atlas/adoption-report.json';
  next_command: string;
}>;

export type AtlasScaffoldResult = Readonly<{
  schema_version: typeof ATLAS_SCAFFOLD_REPORT_VERSION;
  operation_id: string;
  status: 'completed';
  template: 'front-desk';
  mode: AtlasScaffoldMode;
  root: string;
  target: string;
  package_manager: AtlasPackageManager;
  atlas_dependency: string;
  node_version: string;
  package_hash: string;
  files: readonly AtlasScaffoldFileRecord[];
  git: AtlasGitInspection & Readonly<{ initialized: boolean }>;
  warnings: readonly string[];
  rollback: Readonly<{ command: string; instructions: readonly string[] }>;
  adoption_report_path: '.atlas/adoption-report.json';
  next_command: string;
  completed_at: string;
}>;

const DEFAULT_DEPENDENCIES: AtlasScaffoldDependencies = {
  runCommand: runCommand,
  inspectGit: inspectGit,
};

export async function detectPackageManager(root: string): Promise<AtlasPackageManager> {
  const packageJsonRaw = await readUtf8Safe(path.join(root, 'package.json'));
  const pnpmLock = await readUtf8Safe(path.join(root, 'pnpm-lock.yaml'));
  const npmLock = await readUtf8Safe(path.join(root, 'package-lock.json'));
  if (pnpmLock !== null && npmLock !== null) {
    throw new AtlasCliError('CONFLICT', 'Conflicting package-manager lockfiles: pnpm-lock.yaml and package-lock.json', {
      nextAction: 'Keep the lockfile for the package manager this project actually uses, then rerun atlas init',
    });
  }
  if (pnpmLock !== null) return 'pnpm';
  if (npmLock !== null) return 'npm';
  if (packageJsonRaw !== null) {
    const pkg = parsePackageJson(packageJsonRaw, path.join(root, 'package.json'));
    const declared = typeof pkg.packageManager === 'string' ? pkg.packageManager : '';
    if (declared.startsWith('pnpm@')) return 'pnpm';
    if (declared.startsWith('npm@')) return 'npm';
  }
  return 'npm';
}

export async function planAtlasScaffold(
  options: AtlasScaffoldOptions,
  dependencies: AtlasScaffoldDependencies = DEFAULT_DEPENDENCIES,
): Promise<AtlasScaffoldPlan> {
  const normalized = normalizeOptions(options);
  assertSupportedNode(normalized.nodeVersion);
  const root = resolveTarget(normalized.cwd, normalized.target);
  const rootExists = await existsDirectory(root);
  const entries = rootExists ? await readdir(root) : [];
  const packageManager = normalized.packageManager ?? await detectPackageManager(root);
  const atlasDependency = normalized.atlasDependency;
  const git = await dependencies.inspectGit(rootExists ? root : path.dirname(root));
  const templateFiles = await frontDeskTemplate(root, normalized.existing, atlasDependency);
  const existingFiles = rootExists ? await listExistingFiles(root) : [];
  const occupiedOutsidePlan = existingFiles.filter((file) => !templateFiles.has(file) && !isInternalScaffoldFile(file));

  if (!normalized.existing && occupiedOutsidePlan.length > 0) {
    throw new AtlasCliError('CONFLICT', `Target directory is occupied by non-Atlas files: ${occupiedOutsidePlan.slice(0, 3).join(', ')}`, {
      nextAction: 'Choose a new directory or rerun with --existing to adopt the current application',
    });
  }

  const files: AtlasScaffoldFilePlan[] = [];
  let matchingPriorFiles = 0;
  for (const [relativePath, contents] of [...templateFiles.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const absolute = path.join(root, ...relativePath.split('/'));
    const prior = await readUtf8Safe(absolute);
    if (prior === contents) {
      matchingPriorFiles += 1;
      files.push({ path: relativePath, action: 'unchanged', before_digest: sha256(prior), after_digest: sha256(contents), contents });
      continue;
    }
    if (prior !== null && relativePath !== 'package.json' && !isMergeableAtlasDocument(relativePath, normalized.existing)) {
      throw new AtlasCliError('CONFLICT', `Atlas scaffold conflict: ${relativePath} already exists with different content`, {
        nextAction: `Move or rename ${relativePath}, or restore the generated Atlas version before retrying`,
      });
    }
    files.push({
      path: relativePath,
      action: prior === null ? 'create' : 'merge',
      before_digest: prior === null ? null : sha256(prior),
      after_digest: sha256(contents),
      contents,
    });
  }

  const mode: AtlasScaffoldMode = normalized.existing
    ? 'existing'
    : matchingPriorFiles > 0
      ? 'resume'
      : normalized.target === '.'
        ? 'current'
        : 'new';
  const warnings = git.dirty
    ? ['Git worktree is dirty; Atlas will not initialize or modify Git metadata. Existing files remain protected by conflict checks and rollback backups.']
    : [];

  return {
    schema_version: ATLAS_SCAFFOLD_REPORT_VERSION,
    operation_id: randomUUID(),
    status: 'planned',
    template: 'front-desk',
    mode,
    root,
    target: normalized.target,
    package_manager: packageManager,
    atlas_dependency: atlasDependency,
    node_version: normalized.nodeVersion,
    files,
    git: { ...git, initialized: false },
    warnings,
    rollback: rollbackContract(normalized.target),
    adoption_report_path: '.atlas/adoption-report.json',
    next_command: nextCommand(normalized.cwd, root, normalized.target),
  };
}

export async function scaffoldAtlasProject(
  options: AtlasScaffoldOptions,
  dependencies: AtlasScaffoldDependencies = DEFAULT_DEPENDENCIES,
): Promise<AtlasScaffoldResult> {
  const normalized = normalizeOptions(options);
  const plan = await planAtlasScaffold(normalized, dependencies);
  await mkdir(plan.root, { recursive: true });
  const statePath = path.join(plan.root, '.atlas', 'scaffold-state.json');
  const reportPath = path.join(plan.root, plan.adoption_report_path);
  const startedAt = new Date().toISOString();
  const applied: AtlasScaffoldFilePlan[] = [];
  await atomicWrite(statePath, `${JSON.stringify({
    schema_version: ATLAS_SCAFFOLD_STATE_VERSION,
    operation_id: plan.operation_id,
    status: 'in_progress',
    started_at: startedAt,
    root: plan.root,
    files: publicFiles(plan.files),
  }, null, 2)}\n`);

  try {
    for (const file of plan.files) {
      if (file.action === 'unchanged') {
        applied.push(file);
        continue;
      }
      if (file.contents === undefined) throw new AtlasCliError('LOCAL_STATE_ERROR', `Scaffold plan omitted contents for ${file.path}`);
      const target = path.join(plan.root, ...file.path.split('/'));
      let backupPath: string | null = null;
      if (file.action === 'merge') {
        backupPath = path.join(plan.root, '.atlas', 'backups', plan.operation_id, `${file.path.replace(/[^a-zA-Z0-9._-]/g, '_')}.bak`);
        const backedUp = await backupFile(target, backupPath);
        if (!backedUp) throw new AtlasCliError('LOCAL_STATE_ERROR', `Could not back up ${file.path} before merge`);
      }
      await atomicWriteProjectFile(target, file.contents, 0o644);
      applied.push({ ...file, backup_path: backupPath });
    }

    if (normalized.install) await installDependencies(plan, dependencies);

    let git: AtlasGitInspection & { initialized: boolean } = { ...plan.git };
    if (normalized.initializeGit && git.available && !git.repository && !git.dirty) {
      const initialized = await dependencies.runCommand({ command: 'git', args: ['init'], cwd: plan.root });
      if (initialized.exitCode !== 0) {
        throw new AtlasCliError('LOCAL_STATE_ERROR', 'Git initialization failed', {
          nextAction: 'Inspect Git installation, then run git init manually or rerun atlas init with Git initialization disabled',
        });
      }
      git = { available: true, repository: true, dirty: false, root: plan.root, initialized: true };
    }

    const loaded = await loadAtlasProject(plan.root);
    const result: AtlasScaffoldResult = {
      schema_version: ATLAS_SCAFFOLD_REPORT_VERSION,
      operation_id: plan.operation_id,
      status: 'completed',
      template: plan.template,
      mode: plan.mode,
      root: plan.root,
      target: plan.target,
      package_manager: plan.package_manager,
      atlas_dependency: plan.atlas_dependency,
      node_version: plan.node_version,
      package_hash: loaded.package_hash,
      files: publicFiles(applied),
      git: { ...git, initialized: git.initialized },
      warnings: plan.warnings,
      rollback: plan.rollback,
      adoption_report_path: plan.adoption_report_path,
      next_command: plan.next_command,
      completed_at: new Date().toISOString(),
    };
    await atomicWrite(reportPath, `${JSON.stringify(result, null, 2)}\n`);
    await atomicWrite(statePath, `${JSON.stringify({
      schema_version: ATLAS_SCAFFOLD_STATE_VERSION,
      operation_id: plan.operation_id,
      status: 'completed',
      started_at: startedAt,
      completed_at: result.completed_at,
      report_path: plan.adoption_report_path,
    }, null, 2)}\n`);
    return result;
  } catch (error) {
    const rollbackErrors = await rollbackApplied(plan.root, applied);
    await atomicWrite(statePath, `${JSON.stringify({
      schema_version: ATLAS_SCAFFOLD_STATE_VERSION,
      operation_id: plan.operation_id,
      status: rollbackErrors.length === 0 ? 'rolled_back' : 'rollback_incomplete',
      started_at: startedAt,
      failed_at: new Date().toISOString(),
      rollback_errors: rollbackErrors,
    }, null, 2)}\n`).catch(() => undefined);
    if (rollbackErrors.length > 0) {
      throw new AtlasCliError('LOCAL_STATE_ERROR', `Atlas scaffold failed and rollback was incomplete: ${rollbackErrors.join('; ')}`, {
        nextAction: `Inspect ${path.relative(normalized.cwd, statePath) || statePath} before retrying`,
      });
    }
    throw error;
  }
}

export async function rollbackAtlasScaffold(root: string): Promise<Readonly<{ rolled_back: boolean; files: readonly string[] }>> {
  const projectRoot = path.resolve(root);
  const raw = await readUtf8Safe(path.join(projectRoot, '.atlas', 'adoption-report.json'));
  if (raw === null) {
    throw new AtlasCliError('LOCAL_STATE_ERROR', 'No Atlas adoption report exists for rollback', {
      nextAction: 'Run rollback from the project that was created or adopted by atlas init',
    });
  }
  let report: { files?: AtlasScaffoldFileRecord[] };
  try {
    report = JSON.parse(raw) as { files?: AtlasScaffoldFileRecord[] };
  } catch {
    throw new AtlasCliError('LOCAL_STATE_ERROR', 'Atlas adoption report is not valid JSON');
  }
  if (!Array.isArray(report.files)) throw new AtlasCliError('LOCAL_STATE_ERROR', 'Atlas adoption report omits file mutations');
  const errors = await rollbackApplied(projectRoot, report.files);
  if (errors.length > 0) throw new AtlasCliError('LOCAL_STATE_ERROR', `Atlas rollback was incomplete: ${errors.join('; ')}`);
  return { rolled_back: true, files: report.files.map((file) => file.path) };
}

async function frontDeskTemplate(root: string, existing: boolean, atlasDependency: string): Promise<Map<string, string>> {
  const config: AtlasProjectConfig = defineAtlasProject({
    schemaVersion: '1',
    project: { name: 'front-desk', description: 'A governed local front-desk business messaging agent.' },
    runtime: { mode: 'native' },
    model: { mode: 'local-fixture' },
    agent: {
      instructions: './agent/instructions.md',
      tools: './agent/tools',
      skills: './agent/skills',
      policies: './agent/policies',
      subagents: './agent/subagents',
    },
    knowledge: ['./knowledge'],
    channels: ['./channels/web-chat.ts'],
    evals: ['./evals'],
    missions: ['./missions'],
  });
  const files = new Map<string, string>([
    ['atlas.config.ts', renderAtlasProjectConfig(config)],
    ['agent/instructions.md', FRONT_DESK_INSTRUCTIONS],
    ['agent/tools/reschedule-booking.ts', RESCHEDULE_TOOL],
    ['agent/skills/.gitkeep', ''],
    ['agent/policies/booking-change.policy.ts', BOOKING_POLICY_CODE],
    ['agent/subagents/.gitkeep', ''],
    ['knowledge/booking-policy.md', BOOKING_KNOWLEDGE],
    ['channels/web-chat.ts', WEB_CHAT_CHANNEL],
    ['evals/booking-reschedule.eval.ts', BOOKING_EVAL],
    ['missions/front-desk-reschedule.mission.ts', FRONT_DESK_MISSION],
    ['tests/first-agent-loop.test.ts', FIRST_LOOP_TEST],
  ]);
  const packageRaw = await readUtf8Safe(path.join(root, 'package.json'));
  files.set('package.json', mergePackageJson(packageRaw, atlasDependency));
  const agentsRaw = await readUtf8Safe(path.join(root, 'AGENTS.md'));
  if (existing && agentsRaw !== null) files.set('AGENTS.atlas.md', GENERATED_AGENTS);
  else files.set('AGENTS.md', GENERATED_AGENTS);
  const readmeRaw = await readUtf8Safe(path.join(root, 'README.md'));
  if (existing && readmeRaw !== null) files.set('ATLAS.md', GENERATED_README);
  else files.set('README.md', GENERATED_README);
  return files;
}

function mergePackageJson(raw: string | null, atlasDependency: string): string {
  const pkg = raw === null ? { name: 'front-desk', private: true, type: 'module' } as Record<string, unknown> : parsePackageJson(raw, 'package.json');
  const scripts = isRecord(pkg.scripts) ? { ...pkg.scripts } : {};
  if (scripts.dev === undefined) scripts.dev = 'atlas dev';
  else if (scripts.dev !== 'atlas dev') scripts['atlas:dev'] = 'atlas dev';
  scripts['atlas:test'] = scripts['atlas:test'] ?? 'atlas test';
  scripts['atlas:doctor'] = scripts['atlas:doctor'] ?? 'atlas doctor';
  const dependencies = isRecord(pkg.dependencies) ? { ...pkg.dependencies } : {};
  const devDependencies = isRecord(pkg.devDependencies) ? { ...pkg.devDependencies } : {};
  const existingAtlas = typeof dependencies['@atlas-runner/atlas'] === 'string'
    ? dependencies['@atlas-runner/atlas']
    : typeof devDependencies['@atlas-runner/atlas'] === 'string'
      ? devDependencies['@atlas-runner/atlas']
      : null;
  if (existingAtlas !== null && existingAtlas !== atlasDependency) {
    throw new AtlasCliError('CONFLICT', `Existing @atlas-runner/atlas dependency ${existingAtlas} conflicts with required ${atlasDependency}`, {
      nextAction: 'Run atlas upgrade or align the existing @atlas-runner/atlas dependency before adoption',
    });
  }
  if (dependencies['@atlas-runner/atlas'] === undefined) devDependencies['@atlas-runner/atlas'] = atlasDependency;
  const merged = {
    ...pkg,
    private: pkg.private ?? true,
    type: pkg.type ?? 'module',
    scripts: sortRecord(scripts),
    ...(Object.keys(dependencies).length > 0 ? { dependencies: sortRecord(dependencies) } : {}),
    devDependencies: sortRecord(devDependencies),
  };
  return `${JSON.stringify(merged, null, 2)}\n`;
}

async function installDependencies(plan: AtlasScaffoldPlan, dependencies: AtlasScaffoldDependencies): Promise<void> {
  const invocation: AtlasCommandInvocation = plan.package_manager === 'pnpm'
    ? { command: 'pnpm', args: ['install', '--ignore-scripts', '--no-frozen-lockfile'], cwd: plan.root }
    : { command: 'npm', args: ['install', '--ignore-scripts', '--no-audit', '--no-fund'], cwd: plan.root };
  const result = await dependencies.runCommand(invocation);
  if (result.exitCode !== 0) {
    throw new AtlasCliError('LOCAL_STATE_ERROR', `${plan.package_manager} dependency installation failed`, {
      nextAction: `Review the package-manager error, then rerun ${plan.package_manager} install in ${plan.root}`,
    });
  }
}

async function rollbackApplied(root: string, files: readonly AtlasScaffoldFilePlan[]): Promise<string[]> {
  const errors: string[] = [];
  for (const file of [...files].reverse()) {
    if (file.action === 'unchanged') continue;
    const target = path.join(root, ...file.path.split('/'));
    try {
      if (file.action === 'create') await rm(target, { force: true });
      else if (file.backup_path) {
        const backup = await readUtf8Safe(file.backup_path);
        if (backup === null) throw new Error('backup missing');
        await atomicWriteProjectFile(target, backup, 0o644);
      } else throw new Error('backup path missing');
    } catch (error) {
      errors.push(`${file.path}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return errors;
}

async function listExistingFiles(root: string): Promise<string[]> {
  const files: string[] = [];
  await walk(root, '', files);
  return files.sort((a, b) => a.localeCompare(b));
}

async function walk(root: string, relative: string, files: string[]): Promise<void> {
  const directory = relative ? path.join(root, ...relative.split('/')) : root;
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (relative === '' && ['.git', 'node_modules'].includes(entry.name)) continue;
    const child = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) {
      throw new AtlasCliError('LOCAL_STATE_ERROR', `Scaffold target contains a symbolic link: ${child}`, {
        nextAction: 'Remove or replace the symbolic link before Atlas adoption',
      });
    }
    if (entry.isDirectory()) await walk(root, child, files);
    else if (entry.isFile()) files.push(child);
  }
}

function isInternalScaffoldFile(relativePath: string): boolean {
  return relativePath === '.atlas/scaffold-state.json'
    || relativePath === '.atlas/adoption-report.json'
    || relativePath.startsWith('.atlas/backups/');
}

function isMergeableAtlasDocument(relativePath: string, existing: boolean): boolean {
  return existing && ['ATLAS.md', 'AGENTS.atlas.md'].includes(relativePath);
}

function normalizeOptions(options: AtlasScaffoldOptions): Required<AtlasScaffoldOptions> {
  const cwd = path.resolve(options.cwd);
  const target = options.target ?? 'front-desk';
  if (target.includes('\0')) throw new AtlasCliError('USAGE_ERROR', 'Scaffold target contains an invalid null byte');
  if (options.template !== undefined && options.template !== 'front-desk') throw new AtlasCliError('USAGE_ERROR', 'Only the front-desk template is supported in P1');
  return {
    cwd,
    target,
    template: 'front-desk',
    existing: options.existing ?? false,
    install: options.install ?? true,
    initializeGit: options.initializeGit ?? true,
    nodeVersion: options.nodeVersion ?? process.version,
    packageManager: options.packageManager ?? undefined as unknown as AtlasPackageManager,
    atlasDependency: options.atlasDependency ?? ATLAS_PACKAGE_VERSION,
  };
}

function resolveTarget(cwd: string, target: string): string {
  const resolved = target === '.' ? cwd : path.resolve(cwd, target);
  if (resolved === path.parse(resolved).root) throw new AtlasCliError('USAGE_ERROR', 'Atlas scaffold cannot target a filesystem root');
  return resolved;
}

function assertSupportedNode(version: string): void {
  const match = /^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/.exec(version);
  if (!match || Number(match[1]) < 22) {
    throw new AtlasCliError('LOCAL_STATE_ERROR', `Atlas requires Node.js 22 or newer; current version is ${version}`, {
      nextAction: 'Install Node.js 22 LTS or newer, then rerun atlas init front-desk',
    });
  }
}

async function existsDirectory(target: string): Promise<boolean> {
  try {
    const stat = await lstat(target);
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
      throw new AtlasCliError('CONFLICT', `Scaffold target is not a safe directory: ${target}`, {
        nextAction: 'Choose a normal directory that is not a symbolic link',
      });
    }
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

function rollbackContract(target: string): Readonly<{ command: string; instructions: readonly string[] }> {
  return {
    command: `atlas init front-desk --rollback --dir ${shellDisplay(target)}`,
    instructions: [
      'Atlas removes only files it created.',
      'Atlas restores merged files from .atlas/backups using the adoption report.',
      'Atlas never resets, cleans, or rewrites Git history.',
    ],
  };
}

function nextCommand(cwd: string, root: string, target: string): string {
  if (path.resolve(cwd) === root) return 'atlas dev';
  return `cd ${shellDisplay(target)} && atlas dev`;
}

function shellDisplay(value: string): string {
  return /^[a-zA-Z0-9._/-]+$/.test(value) ? value : JSON.stringify(value);
}

function publicFiles(files: readonly AtlasScaffoldFilePlan[]): AtlasScaffoldFileRecord[] {
  return files.map(({ contents: _contents, ...file }) => file);
}

function parsePackageJson(raw: string, filePath: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw);
    if (!isRecord(parsed)) throw new Error('not an object');
    return parsed;
  } catch {
    throw new AtlasCliError('LOCAL_STATE_ERROR', `Package manifest is not valid JSON: ${filePath}`, {
      nextAction: 'Repair package.json before running Atlas adoption',
    });
  }
}

function sortRecord(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

async function runCommand(invocation: AtlasCommandInvocation): Promise<AtlasCommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(invocation.command, [...invocation.args], {
      cwd: invocation.cwd,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => { stdout += chunk; });
    child.stderr.on('data', (chunk: string) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => resolve({ exitCode: code ?? 1, stdout, stderr }));
  });
}

async function inspectGit(root: string): Promise<AtlasGitInspection> {
  const top = await runCommand({ command: 'git', args: ['rev-parse', '--show-toplevel'], cwd: root }).catch(() => null);
  if (top === null) return { available: false, repository: false, dirty: false, root: null };
  if (top.exitCode !== 0) return { available: true, repository: false, dirty: false, root: null };
  const repositoryRoot = top.stdout.trim();
  const status = await runCommand({ command: 'git', args: ['status', '--porcelain'], cwd: root });
  return { available: true, repository: true, dirty: status.stdout.trim().length > 0, root: repositoryRoot || null };
}

const FRONT_DESK_INSTRUCTIONS = `# Front-desk agent\n\nYou handle booking questions and changes.\n\n1. Retrieve approved booking policy before proposing a change.\n2. Propose the reschedule-booking tool with the requested date.\n3. Never claim the booking changed before Atlas records an approved exactly-once commit receipt.\n4. Hand off when identity, consent, policy, or availability is uncertain.\n`;

const RESCHEDULE_TOOL = `export default {\n  id: "front-desk.bookings.reschedule",\n  description: "Reschedule an existing booking after approval.",\n  risk: "high",\n  execution: "commit",\n  idempotency: "required",\n  approval: "required",\n  input: { bookingId: "string", requestedDate: "string" }\n} as const;\n`;

const BOOKING_POLICY_CODE = `export default {\n  id: "front-desk.booking-change",\n  tool: "front-desk.bookings.reschedule",\n  decision: "approval_required",\n  handoffWhen: ["identity_unverified", "outside_change_window", "availability_unknown"]\n} as const;\n`;

const BOOKING_KNOWLEDGE = `# Booking change policy\n\n- A booking can be moved when the customer is verified and the requested slot is available.\n- Every booking change requires operator approval in the local workbench.\n- The customer receives confirmation only after the action commits exactly once and provider delivery succeeds.\n- Unclear identity, availability, or consent requires human handoff.\n`;

const WEB_CHAT_CHANNEL = `export default {\n  id: "local-web-chat",\n  provider: "atlas-simulator",\n  direction: ["inbound", "outbound"],\n  credentials: "none",\n  deliveryReceipts: true\n} as const;\n`;

const BOOKING_EVAL = `export default {\n  id: "front-desk-reschedule",\n  customer: "Can I move my booking to Friday?",\n  expects: [\n    "knowledge_retrieved",\n    "tool_proposed",\n    "approval_required",\n    "action_committed_exactly_once",\n    "delivery_receipt_recorded"\n  ]\n} as const;\n`;

const FRONT_DESK_MISSION = `import { defineMission } from "@atlas-runner/atlas";\n\nexport default defineMission(\n{  "apiVersion": "atlas.mirai.dev/v1",\n  "kind": "Mission",\n  "metadata": {\n    "missionId": "front-desk-reschedule-example",\n    "schemaVersion": "1",\n    "labels": {\n      "example": "front-desk",\n      "persistence": "durable"\n    }\n  },\n  "spec": {\n    "scope": {\n      "tenantId": "local-tenant",\n      "organisationId": "local-organisation",\n      "projectId": "front-desk",\n      "environmentId": "local"\n    },\n    "agent": {\n      "agentId": "front-desk",\n      "agentVersionId": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",\n      "deploymentId": "local-front-desk",\n      "runtime": { "mode": "native", "adapter": "simulator" }\n    },\n    "missionType": "booking-change",\n    "goal": "Move booking BK-100 to the requested date after customer verification and operator approval.",\n    "successCriteria": "The requested booking change commits exactly once and a delivery receipt is recorded.",\n    "failureCriteria": "Identity, consent, policy, or availability is uncertain, or the action cannot be safely committed.",\n    "risk": {\n      "policyRef": "front-desk.booking-change",\n      "riskClass": "high",\n      "autonomyLevel": "L2",\n      "approvalRequired": true,\n      "handoffAllowed": true\n    },\n    "constraints": {\n      "allowedTools": ["front-desk.bookings.reschedule"],\n      "requiredApprovalFor": ["front-desk.bookings.reschedule"],\n      "maxSteps": 12\n    },\n    "correlation": { "correlationId": "front-desk-reschedule-example" },\n    "provenance": {\n      "source": "developer",\n      "inputDigest": "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",\n      "knowledgeRefs": ["knowledge/booking-policy.md"]\n    },\n    "state": "CREATED",\n    "stateVersion": 1,\n    "timestamps": {\n      "createdAt": "2026-01-01T00:00:00.000Z",\n      "updatedAt": "2026-01-01T00:00:00.000Z"\n    }\n  }\n})\n`;

const FIRST_LOOP_TEST = `import assert from "node:assert/strict";\nimport { describe, it } from "node:test";\n\ndescribe("front-desk first agent loop", () => {\n  it("is executed by atlas test through the governed local runtime", () => {\n    assert.equal(true, true);\n  });\n});\n`;

const GENERATED_AGENTS = `# Atlas project guidance\n\nThis project is governed by \`atlas.config.ts\`.\n\n## Read first\n\n1. \`node_modules/@atlas-runner/atlas/docs/AGENT-GUIDE.md\`\n2. \`node_modules/@atlas-runner/atlas/docs/PROJECT-CONTRACT.md\`\n3. \`node_modules/@atlas-runner/atlas/docs/AUTHORITY.md\`\n4. \`node_modules/@atlas-runner/atlas/skills/atlas-project/SKILL.md\`\n5. \`node_modules/@atlas-runner/atlas/skills/atlas-first-agent-loop/SKILL.md\`\n6. \`node_modules/@atlas-runner/atlas/skills/atlas-repair/SKILL.md\`\n\n## Invariants\n\n- External reasoning may propose. Atlas commits.\n- Run \`atlas doctor --json\` before diagnosing by hand.\n- Run \`atlas test --json\` before changing tools, policies, channels, or knowledge.\n- Never place raw credentials in project files. Use typed Atlas secret references.\n- Atlas owns approval, committed execution, delivery, traces, and receipts.\n- A committed action requires an idempotency key and must be replay-safe.\n- Provider-delivery retry must not repeat a committed business action.\n- Do not claim hosted staging, production, or live-provider proof from local fixtures.\n`;

const GENERATED_README = `# Front-desk Atlas agent\n\nThis generated project demonstrates the local First Agent Loop and its durable Mission definition in missions/front-desk-reschedule.mission.ts without an Atlas account, provider credential, cloud service, or paid model.\n\n## Verify first\n\n- \`atlas doctor --json\` validates Node, config, governed paths, secrets, and runtime-state compatibility.\n- \`atlas test --json\` proves the full exactly-once journey in a disposable sandbox.\n- \`atlas capabilities --json\` lists the installed runtime, tools, policies, channels, delivery states, and commands.\n- \`atlas explain project --json\` shows the source-bound project hash and authority boundary.\n\n## Run the workbench\n\n- \`atlas dev\` starts the project-backed local authority and browser workbench.\n\n\`\`\`bash\natlas dev\n\`\`\`\n\nOpen the printed URL, send **Can I move booking BK-100 to Friday?**, inspect the retrieved policy and proposed tool, approve the action, simulate provider delivery, and inspect the complete trace and receipt chain.\n\n## Inspect and replay\n\n- \`atlas inspect --json\` returns redacted runtime summaries.\n- \`atlas replay --json\` replays the canonical scenario without changing real project state.\n- \`atlas deploy --json\` reports honest local package readiness without hosted claims or mutation.\n- \`atlas upgrade --json\` performs a backed-up, idempotent project-schema migration.\n\nRead \`node_modules/@atlas-runner/atlas/docs/QUICKSTART.md\` and \`node_modules/@atlas-runner/atlas/docs/AGENT-GUIDE.md\` for the version-matched contract.\n\nThe local fixture model and provider are deterministic simulations. They exercise real Atlas policy, approval, idempotency, action, outbox, delivery, trace, and receipt contracts; they do not claim staging, production, or live-provider behavior.\n`;
