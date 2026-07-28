import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'atlas-p1-package-matrix-'));
const artifacts = path.join(tempRoot, 'artifacts');
await mkdir(artifacts, { recursive: true });
const commands = [];
const cases = [];

try {
  const node22 = command('npx', ['--yes', 'node@22', '-p', 'process.execPath'], packageRoot).stdout.trim();
  const node22Version = command(node22, ['--version'], packageRoot).stdout.trim();
  const npmVersion = command('npm', ['--version'], packageRoot).stdout.trim();
  const pnpmVersion = command('pnpm', ['--version'], packageRoot).stdout.trim();

  command('npm', ['pack', '--json', '--pack-destination', artifacts], packageRoot, { timeout: 180_000 });
  const tarballName = (await readdir(artifacts)).find((name) => name.endsWith('.tgz'));
  if (!tarballName) throw new Error('npm pack did not create a tarball');
  const tarball = path.join(artifacts, tarballName);
  const tarballBytes = await readFile(tarball);
  const tarballSha = digest(tarballBytes);
  const entries = command('tar', ['-tzf', tarball], packageRoot).stdout.trim().split('\n').filter(Boolean);

  const npmConsumer = path.join(tempRoot, 'npm-consumer');
  await mkdir(npmConsumer);
  command('npm', ['init', '-y'], npmConsumer);
  command('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', tarball], npmConsumer, { timeout: 180_000 });
  const npmAtlasBin = path.join(npmConsumer, 'node_modules', '@mirai', 'atlas', 'bin', 'atlas.js');
  const npmInit = atlas(node22, npmAtlasBin, npmConsumer, ['init', 'front-desk', '--atlas-dependency', `file:${tarball}`, '--no-git', '--json'], 180_000);
  const npmProject = path.join(npmConsumer, 'front-desk');
  const npmCommands = {};
  for (const [name, args] of [
    ['doctor', ['doctor', '--json']],
    ['test', ['test', '--json']],
    ['capabilities', ['capabilities', '--json']],
    ['explain', ['explain', 'project', '--json']],
    ['inspect', ['inspect', '--json']],
    ['replay', ['replay', '--json']],
    ['deploy', ['deploy', '--json']],
    ['upgrade', ['upgrade', '--json']],
    ['dev', ['dev', '--duration-ms', '0', '--json']],
  ]) npmCommands[name] = atlas(node22, path.join(npmProject, 'node_modules', '@mirai', 'atlas', 'bin', 'atlas.js'), npmProject, args, 180_000);

  const verifierPath = path.join(npmProject, 'verify-installed.mjs');
  await writeFile(verifierPath, `import { startAtlasDevServer } from '@mirai/atlas';\nconst server = await startAtlasDevServer({ projectRoot: process.cwd() });\nconst health = await fetch(server.url + '/health').then((response) => response.json());\nconst htmlResponse = await fetch(server.url + '/');\nconst html = await htmlResponse.text();\nawait server.close();\nconst markers = ['Atlas Front Desk Workbench','id="customer-conversation"','id="retrieved-evidence"','id="tool-proposal"','id="policy-decision"','id="approval-state"','id="handoff-state"','id="delivery-state"','id="business-outcome"','id="trace-events"','id="receipt-chain"','id="next-action"'];\nconsole.log(JSON.stringify({ governed_runtime: health.governed_runtime, project_hash: health.project_hash, content_type: htmlResponse.headers.get('content-type'), markers_present: markers.every((marker) => html.includes(marker)), manual_curl_required: html.includes('curl ') }));\n`);
  const workbench = parseJson(command(node22, [verifierPath], npmProject).stdout);
  await rm(verifierPath, { force: true });
  cases.push({
    id: 'npm_clean_new_project',
    status: npmInit.data?.status === 'completed' && npmCommands.test.data?.exactly_once === true && npmCommands.dev.data?.governed_runtime === true && workbench.markers_present === true ? 'pass' : 'fail',
    package_manager: 'npm',
    init: summarizeInit(npmInit),
    commands: summarizeCommands(npmCommands),
    workbench,
  });

  const existingRoot = path.join(npmConsumer, 'existing-app');
  await mkdir(existingRoot);
  const originalPackage = `${JSON.stringify({ name: 'existing-app', private: true, scripts: { dev: 'node server.js' }, dependencies: { express: '^5.0.0' } }, null, 2)}\n`;
  await writeFile(path.join(existingRoot, 'package.json'), originalPackage);
  await writeFile(path.join(existingRoot, 'server.js'), 'console.log("existing");\n');
  const adopted = atlas(node22, npmAtlasBin, npmConsumer, ['init', 'front-desk', '--existing', '--dir', 'existing-app', '--no-install', '--no-git', '--atlas-dependency', `file:${tarball}`, '--json']);
  const adoptedPackage = JSON.parse(await readFile(path.join(existingRoot, 'package.json'), 'utf8'));
  const rollback = atlas(node22, npmAtlasBin, npmConsumer, ['init', 'front-desk', '--rollback', '--dir', 'existing-app', '--json']);
  const restoredPackage = await readFile(path.join(existingRoot, 'package.json'), 'utf8');
  const atlasConfigExistsAfterRollback = await stat(path.join(existingRoot, 'atlas.config.ts')).then(() => true).catch(() => false);
  cases.push({
    id: 'npm_existing_project_adoption_and_rollback',
    status: adopted.data?.mode === 'existing' && adoptedPackage.scripts.dev === 'node server.js' && adoptedPackage.dependencies.express === '^5.0.0' && rollback.data?.rolled_back === true && restoredPackage === originalPackage && !atlasConfigExistsAfterRollback ? 'pass' : 'fail',
    original_script_preserved: adoptedPackage.scripts.dev === 'node server.js',
    original_dependency_preserved: adoptedPackage.dependencies.express === '^5.0.0',
    rollback_completed: rollback.data?.rolled_back === true,
    package_restored_exactly: restoredPackage === originalPackage,
    atlas_config_removed: !atlasConfigExistsAfterRollback,
  });

  const pnpmConsumer = path.join(tempRoot, 'pnpm-consumer');
  await mkdir(pnpmConsumer);
  await writeFile(path.join(pnpmConsumer, 'package.json'), '{"name":"pnpm-consumer","private":true}\n');
  command('pnpm', ['add', '--ignore-scripts', tarball], pnpmConsumer, { timeout: 180_000 });
  const pnpmAtlasBin = path.join(pnpmConsumer, 'node_modules', '@mirai', 'atlas', 'bin', 'atlas.js');
  const pnpmInit = atlas(node22, pnpmAtlasBin, pnpmConsumer, ['init', 'front-desk', '--dir', 'front-desk-pnpm', '--package-manager', 'pnpm', '--atlas-dependency', `file:${tarball}`, '--no-git', '--json'], 180_000);
  const pnpmProject = path.join(pnpmConsumer, 'front-desk-pnpm');
  const pnpmTest = atlas(node22, path.join(pnpmProject, 'node_modules', '@mirai', 'atlas', 'bin', 'atlas.js'), pnpmProject, ['test', '--json'], 180_000);
  cases.push({
    id: 'pnpm_clean_new_project',
    status: pnpmInit.data?.status === 'completed' && pnpmInit.data?.package_manager === 'pnpm' && pnpmTest.data?.exactly_once === true ? 'pass' : 'fail',
    package_manager: 'pnpm',
    init: summarizeInit(pnpmInit),
    test: summarizeCommand(pnpmTest),
  });

  const spacesRoot = path.join(npmConsumer, 'path-cases');
  await mkdir(spacesRoot);
  const spaced = atlas(node22, npmAtlasBin, spacesRoot, ['init', 'front-desk', '--dir', 'front desk', '--no-install', '--no-git', '--atlas-dependency', `file:${tarball}`, '--json']);
  cases.push({
    id: 'path_with_spaces',
    status: spaced.data?.status === 'completed' && spaced.data?.next_command === 'cd "front desk" && atlas dev' ? 'pass' : 'fail',
    next_command: spaced.data?.next_command ?? null,
    project_created: await stat(path.join(spacesRoot, 'front desk', 'atlas.config.ts')).then(() => true).catch(() => false),
  });

  const node20Root = path.join(tempRoot, 'node20-rejection');
  await mkdir(node20Root);
  const node20Run = command(process.execPath, [npmAtlasBin, 'init', 'front-desk', '--no-install', '--no-git', '--json'], node20Root, { allowFailure: true });
  const node20Error = parseJson(node20Run.stderr || node20Run.stdout, true);
  cases.push({
    id: 'unsupported_node_rejected_before_mutation',
    status: node20Run.exitCode !== 0 && node20Error?.error?.code === 'LOCAL_STATE_ERROR' && !(await stat(path.join(node20Root, 'front-desk')).then(() => true).catch(() => false)) ? 'pass' : 'fail',
    node_version: process.version,
    exit_code: node20Run.exitCode,
    error_code: node20Error?.error?.code ?? null,
    target_created: await stat(path.join(node20Root, 'front-desk')).then(() => true).catch(() => false),
  });

  const sourceMetadata = JSON.parse(await readFile(path.join(packageRoot, 'metadata', 'package-source.v1.json'), 'utf8'));
  const result = {
    schema_version: 'atlas.p1-package-install-matrix/v1',
    generated_at: new Date().toISOString(),
    source: sourceMetadata,
    environment: {
      platform: process.platform,
      architecture: process.arch,
      host_node_version: process.version,
      certification_node_version: node22Version,
      npm_version: npmVersion,
      pnpm_version: pnpmVersion,
    },
    artifact: {
      filename: tarballName,
      sha256: `sha256:${tarballSha}`,
      bytes: tarballBytes.byteLength,
      entries: entries.length,
    },
    cases,
    commands: commands.map((entry) => ({ ...entry, cwd: sanitize(entry.cwd), args: entry.args.map(sanitize) })),
    summary: {
      pass: cases.filter((item) => item.status === 'pass').length,
      fail: cases.filter((item) => item.status === 'fail').length,
      total: cases.length,
    },
    verdict: cases.every((item) => item.status === 'pass') ? 'PASS' : 'FAIL',
    temporary_root_removed: true,
  };
  console.log(JSON.stringify(result, null, 2));
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}

function atlas(node, binary, cwd, args, timeout = 60_000) {
  const result = command(node, [binary, ...args], cwd, { timeout });
  return parseJson(result.stdout);
}

function command(executable, args, cwd, options = {}) {
  const started = Date.now();
  const result = spawnSync(executable, args, {
    cwd,
    encoding: 'utf8',
    timeout: options.timeout ?? 60_000,
    env: { ...process.env, NO_COLOR: '1' },
  });
  const record = {
    command: path.basename(executable),
    args: [...args],
    cwd,
    elapsed_ms: Date.now() - started,
    exit_code: result.status ?? 1,
  };
  commands.push(record);
  if (result.error) throw result.error;
  if ((result.status ?? 1) !== 0 && !options.allowFailure) {
    throw new Error(`${executable} ${args.join(' ')} failed (${result.status}): ${result.stderr || result.stdout}`);
  }
  return { stdout: result.stdout ?? '', stderr: result.stderr ?? '', exitCode: result.status ?? 1 };
}

function parseJson(value, allowNull = false) {
  const trimmed = value.trim();
  try { return JSON.parse(trimmed); }
  catch (error) {
    if (allowNull) return null;
    throw new Error(`Expected JSON output, received: ${trimmed.slice(0, 500)}`, { cause: error });
  }
}

function summarizeInit(value) {
  return {
    status: value.data?.status ?? null,
    mode: value.data?.mode ?? null,
    package_manager: value.data?.package_manager ?? null,
    package_hash: value.data?.package_hash ?? null,
    file_records: Array.isArray(value.data?.files) ? value.data.files.length : 0,
    generated_contents_exposed: Array.isArray(value.data?.files) && value.data.files.some((file) => Object.hasOwn(file, 'contents')),
    next_action: value.next_action ?? null,
  };
}

function summarizeCommands(values) {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, summarizeCommand(value)]));
}

function summarizeCommand(value) {
  return {
    ok: value.ok === true,
    command: value.command ?? null,
    status: value.data?.status ?? null,
    project_hash: value.data?.project_hash ?? value.data?.package_hash ?? null,
    exactly_once: value.data?.exactly_once ?? null,
    action_count: value.data?.action_count ?? value.data?.final?.action_count ?? null,
    delivery_state: value.data?.delivery_state ?? value.data?.final?.delivery_state ?? null,
    governed_runtime: value.data?.governed_runtime ?? null,
    next_action: value.next_action ?? null,
  };
}

function sanitize(value) {
  return String(value).replaceAll(tempRoot, '<TEMP_ROOT>').replaceAll(packageRoot, '<PACKAGE_ROOT>');
}

function digest(value) {
  return createHash('sha256').update(value).digest('hex');
}
