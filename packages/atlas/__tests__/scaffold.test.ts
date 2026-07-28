import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadAtlasProject } from '../src/project-contract.js';
import {
  detectPackageManager,
  planAtlasScaffold,
  scaffoldAtlasProject,
  type AtlasCommandInvocation,
  type AtlasScaffoldDependencies,
} from '../src/scaffold.js';

const dirs: string[] = [];
afterEach(async () => Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true }))));

async function workspace(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'atlas-scaffold-'));
  dirs.push(root);
  return root;
}

function dependencies(overrides: Partial<AtlasScaffoldDependencies> = {}): AtlasScaffoldDependencies {
  return {
    runCommand: vi.fn().mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' }),
    inspectGit: vi.fn().mockResolvedValue({ available: true, repository: false, dirty: false, root: null }),
    ...overrides,
  };
}

describe('Atlas front-desk scaffold', () => {
  it('creates a complete deterministic project in a new directory', async () => {
    const cwd = await workspace();
    const result = await scaffoldAtlasProject({
      cwd,
      target: 'front-desk',
      install: false,
      initializeGit: false,
      nodeVersion: 'v22.12.0',
    }, dependencies());

    const root = path.join(cwd, 'front-desk');
    const loaded = await loadAtlasProject(root);
    expect(result.status).toBe('completed');
    expect(result.mode).toBe('new');
    expect(result.package_manager).toBe('npm');
    expect(result.package_hash).toBe(loaded.package_hash);
    expect(result.next_command).toBe('cd front-desk && atlas dev');
    expect(result.files.every((file) => !('contents' in file))).toBe(true);
    const report = JSON.parse(await readFile(path.join(root, '.atlas', 'adoption-report.json'), 'utf8'));
    expect(report.files.every((file: Record<string, unknown>) => !('contents' in file))).toBe(true);
    expect(result.files.map((file) => file.path)).toEqual(expect.arrayContaining([
      'atlas.config.ts',
      'agent/instructions.md',
      'agent/tools/reschedule-booking.ts',
      'agent/policies/booking-change.policy.ts',
      'knowledge/booking-policy.md',
      'channels/web-chat.ts',
      'evals/booking-reschedule.eval.ts',
      'tests/first-agent-loop.test.ts',
      'AGENTS.md',
      'README.md',
      'package.json',
    ]));
    const agents = await readFile(path.join(root, 'AGENTS.md'), 'utf8');
    const readme = await readFile(path.join(root, 'README.md'), 'utf8');
    expect(agents).toContain('node_modules/@mirai/atlas/docs/AGENT-GUIDE.md');
    expect(agents).toContain('node_modules/@mirai/atlas/skills/atlas-first-agent-loop/SKILL.md');
    expect(agents).toContain('External reasoning may propose. Atlas commits.');
    for (const command of ['atlas doctor', 'atlas test', 'atlas capabilities', 'atlas explain project', 'atlas inspect', 'atlas replay', 'atlas deploy', 'atlas upgrade', 'atlas dev']) {
      expect(readme).toContain(`\`${command}`);
    }
  });

  it('scaffolds the current directory without creating a nested project', async () => {
    const cwd = await workspace();
    const result = await scaffoldAtlasProject({ cwd, target: '.', install: false, initializeGit: false, nodeVersion: '22.12.0' }, dependencies());

    expect(result.root).toBe(cwd);
    expect(await readFile(path.join(cwd, 'atlas.config.ts'), 'utf8')).toContain('front-desk');
    expect(await readdir(cwd)).not.toContain(path.basename(cwd));
  });

  it('adopts an existing npm application without overwriting its package or source', async () => {
    const cwd = await workspace();
    await writeFile(path.join(cwd, 'package.json'), `${JSON.stringify({ name: 'existing-app', private: true, scripts: { dev: 'node server.js' }, dependencies: { express: '^5.0.0' } }, null, 2)}\n`);
    await writeFile(path.join(cwd, 'server.js'), 'console.log("existing");\n');

    const plan = await planAtlasScaffold({ cwd, target: '.', existing: true, install: false, initializeGit: false, nodeVersion: 'v22.12.0' }, dependencies());
    const result = await scaffoldAtlasProject({ cwd, target: '.', existing: true, install: false, initializeGit: false, nodeVersion: 'v22.12.0' }, dependencies());
    const pkg = JSON.parse(await readFile(path.join(cwd, 'package.json'), 'utf8'));

    expect(plan.mode).toBe('existing');
    expect(plan.files.some((file) => file.path === 'package.json' && file.action === 'merge')).toBe(true);
    expect(pkg.scripts.dev).toBe('node server.js');
    expect(pkg.scripts['atlas:dev']).toBe('atlas dev');
    expect(pkg.dependencies.express).toBe('^5.0.0');
    expect(pkg.devDependencies['@mirai/atlas']).toBe('0.1.0-preview.0');
    expect(await readFile(path.join(cwd, 'server.js'), 'utf8')).toBe('console.log("existing");\n');
    expect(result.rollback.command).toContain('atlas init front-desk --rollback');
    expect(result.adoption_report_path).toBe('.atlas/adoption-report.json');
  });

  it('detects pnpm and npm deterministically and rejects conflicting lockfiles', async () => {
    const pnpmRoot = await workspace();
    await writeFile(path.join(pnpmRoot, 'pnpm-lock.yaml'), 'lockfileVersion: "9.0"\n');
    expect(await detectPackageManager(pnpmRoot)).toBe('pnpm');

    const npmRoot = await workspace();
    await writeFile(path.join(npmRoot, 'package-lock.json'), '{}\n');
    expect(await detectPackageManager(npmRoot)).toBe('npm');

    await writeFile(path.join(npmRoot, 'pnpm-lock.yaml'), 'lockfileVersion: "9.0"\n');
    await expect(detectPackageManager(npmRoot)).rejects.toThrow(/conflicting package-manager lockfiles/i);
  });

  it('refuses an occupied directory unless existing-project adoption is explicit', async () => {
    const cwd = await workspace();
    await writeFile(path.join(cwd, 'notes.txt'), 'keep me\n');

    await expect(scaffoldAtlasProject({ cwd, target: '.', install: false, initializeGit: false, nodeVersion: 'v22.12.0' }, dependencies())).rejects.toThrow(/occupied/i);
    expect(await readFile(path.join(cwd, 'notes.txt'), 'utf8')).toBe('keep me\n');
  });

  it('preserves dirty Git work and records the safety decision', async () => {
    const cwd = await workspace();
    await writeFile(path.join(cwd, 'package.json'), '{"name":"dirty-app","private":true}\n');
    await writeFile(path.join(cwd, 'uncommitted.txt'), 'do not touch\n');
    const deps = dependencies({
      inspectGit: vi.fn().mockResolvedValue({ available: true, repository: true, dirty: true, root: cwd }),
    });

    const result = await scaffoldAtlasProject({ cwd, target: '.', existing: true, install: false, initializeGit: true, nodeVersion: 'v22.12.0' }, deps);

    expect(result.git).toMatchObject({ repository: true, dirty: true, initialized: false });
    expect(result.warnings.join(' ')).toContain('dirty');
    expect(await readFile(path.join(cwd, 'uncommitted.txt'), 'utf8')).toBe('do not touch\n');
    expect(deps.runCommand).not.toHaveBeenCalledWith(expect.objectContaining({ args: ['init'] }));
  });

  it('rejects unsupported Node versions before mutating the target', async () => {
    const cwd = await workspace();

    await expect(scaffoldAtlasProject({ cwd, target: 'front-desk', install: false, initializeGit: false, nodeVersion: 'v20.10.0' }, dependencies())).rejects.toThrow(/Node.js 22/i);
    await expect(readdir(cwd)).resolves.toEqual([]);
  });

  it('recovers a partial prior scaffold only when existing generated files match', async () => {
    const cwd = await workspace();
    const target = path.join(cwd, 'front-desk');
    await mkdir(target);
    const firstPlan = await planAtlasScaffold({ cwd, target: 'front-desk', install: false, initializeGit: false, nodeVersion: 'v22.12.0' }, dependencies());
    const config = firstPlan.files.find((file) => file.path === 'atlas.config.ts');
    expect(config?.contents).toBeTypeOf('string');
    await writeFile(path.join(target, 'atlas.config.ts'), config!.contents!);

    const resumed = await scaffoldAtlasProject({ cwd, target: 'front-desk', install: false, initializeGit: false, nodeVersion: 'v22.12.0' }, dependencies());
    expect(resumed.mode).toBe('resume');
    expect(resumed.files.find((file) => file.path === 'atlas.config.ts')?.action).toBe('unchanged');

    await writeFile(path.join(target, 'agent', 'instructions.md'), 'conflicting content\n');
    await expect(scaffoldAtlasProject({ cwd, target: 'front-desk', install: false, initializeGit: false, nodeVersion: 'v22.12.0' }, dependencies())).rejects.toThrow(/conflict/i);
  });

  it('rolls back generated source when dependency installation is interrupted', async () => {
    const cwd = await workspace();
    const deps = dependencies({
      runCommand: vi.fn().mockResolvedValue({ exitCode: 1, stdout: '', stderr: 'install interrupted' }),
    });

    await expect(scaffoldAtlasProject({ cwd, target: 'front-desk', install: true, initializeGit: false, nodeVersion: 'v22.12.0' }, deps)).rejects.toThrow(/installation failed/i);
    await expect(readFile(path.join(cwd, 'front-desk', 'atlas.config.ts'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
    const state = JSON.parse(await readFile(path.join(cwd, 'front-desk', '.atlas', 'scaffold-state.json'), 'utf8'));
    expect(state.status).toBe('rolled_back');
  });

  it('handles target paths with spaces without shell interpolation', async () => {
    const cwd = await workspace();
    const result = await scaffoldAtlasProject({ cwd, target: 'front desk', install: false, initializeGit: false, nodeVersion: 'v22.12.0' }, dependencies());

    expect(result.root).toBe(path.join(cwd, 'front desk'));
    expect(result.next_command).toBe('cd "front desk" && atlas dev');
    expect(await readFile(path.join(cwd, 'front desk', 'atlas.config.ts'), 'utf8')).toContain('defineAtlasProject');
  });

  it('installs dependencies through an argument-safe package-manager invocation', async () => {
    const cwd = await workspace();
    const calls: AtlasCommandInvocation[] = [];
    const deps = dependencies({
      runCommand: vi.fn(async (invocation: AtlasCommandInvocation) => {
        calls.push(invocation);
        return { exitCode: 0, stdout: '', stderr: '' };
      }),
    });

    await scaffoldAtlasProject({ cwd, target: 'front-desk', install: true, initializeGit: false, nodeVersion: 'v22.12.0' }, deps);

    expect(calls).toContainEqual({
      command: 'npm',
      args: ['install', '--ignore-scripts', '--no-audit', '--no-fund'],
      cwd: path.join(cwd, 'front-desk'),
    });
  });
});
