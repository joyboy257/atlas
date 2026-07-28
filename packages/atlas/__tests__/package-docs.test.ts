import { describe, expect, it } from 'vitest';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAtlasProject } from '../src/project-contract.js';
import { testLocalProject } from '../src/local-commands.js';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function jsonFile(relativePath: string) {
  return JSON.parse(await readFile(path.join(packageRoot, relativePath), 'utf8')) as Record<string, any>;
}

describe('Atlas package-local documentation', () => {
  it('ships a version-matched public documentation manifest', async () => {
    const pkg = await jsonFile('package.json');
    const manifest = await jsonFile('docs/public-docs.manifest.json');

    expect(manifest.schema_version).toBe('atlas.public-docs-manifest/v1');
    expect(manifest.package_version).toBe(pkg.version);
    expect(manifest.entrypoint).toBe('docs/QUICKSTART.md');
    expect(manifest.documents).toEqual(expect.arrayContaining([
      'docs/QUICKSTART.md',
      'docs/PROJECT-CONTRACT.md',
      'docs/COMMANDS.md',
      'docs/AUTHORITY.md',
      'docs/ERROR-CATALOG.md',
      'docs/REPAIR.md',
      'docs/MIGRATION.md',
      'docs/AGENT-GUIDE.md',
      'docs/RUNTIME-PROTOCOL.md',
      'docs/RUNTIME-ADAPTERS.md',
      'docs/MODEL-ROUTING.md',
      'docs/CHANNEL-FABRIC.md',
      'docs/CHANNEL-READINESS.md',
      'docs/P2-CERTIFICATION.md',
    ]));
    expect(manifest.schemas).toEqual(expect.arrayContaining([
      'schema/atlas-project.v1.schema.json',
      'schema/atlas-turn-request.v1.schema.json',
      'schema/atlas-turn-proposal.v1.schema.json',
      'schema/atlas-model-route.v1.schema.json',
      'schema/atlas-channel-profile.v1.schema.json',
    ]));
    expect(manifest.examples).toContain('examples/front-desk');
    expect(manifest.skills).toEqual(expect.arrayContaining([
      'skills/atlas-project/SKILL.md',
      'skills/atlas-first-agent-loop/SKILL.md',
      'skills/atlas-repair/SKILL.md',
      'skills/atlas-runtime-adapter/SKILL.md',
      'skills/atlas-model-routing/SKILL.md',
      'skills/atlas-channel-adapter/SKILL.md',
    ]));

    for (const relativePath of [...manifest.documents, ...manifest.schemas, ...manifest.skills]) {
      await expect(stat(path.join(packageRoot, relativePath))).resolves.toMatchObject({});
    }
  });

  it('documents every required P1 command without private implementation instructions', async () => {
    const commands = await readFile(path.join(packageRoot, 'docs/COMMANDS.md'), 'utf8');
    const agentGuide = await readFile(path.join(packageRoot, 'docs/AGENT-GUIDE.md'), 'utf8');
    const required = ['atlas init', 'atlas dev', 'atlas test', 'atlas doctor', 'atlas capabilities', 'atlas explain project', 'atlas inspect', 'atlas replay', 'atlas deploy', 'atlas upgrade'];

    for (const command of required) expect(commands).toContain(`\`${command}`);
    expect(commands).toContain('--json');
    expect(agentGuide).toContain('node_modules/@mirai/atlas/docs/QUICKSTART.md');
    expect(agentGuide).toContain('Do not bypass Atlas approval or committed execution');
    expect(agentGuide).not.toContain('/Users/deon/');
  });

  it('ships an actionable error, repair, and migration contract', async () => {
    const errorCatalog = await readFile(path.join(packageRoot, 'docs/ERROR-CATALOG.md'), 'utf8');
    const repair = await readFile(path.join(packageRoot, 'docs/REPAIR.md'), 'utf8');
    const migration = await readFile(path.join(packageRoot, 'docs/MIGRATION.md'), 'utf8');

    for (const code of ['USAGE_ERROR', 'LOCAL_STATE_ERROR', 'CONFLICT', 'IDEMPOTENCY_MISMATCH', 'RETRY_NOT_READY', 'DELIVERY_STATE_REGRESSION']) expect(errorCatalog).toContain(code);
    expect(repair).toContain('atlas doctor --json');
    expect(repair).toContain('.atlas/adoption-report.json');
    expect(migration).toContain('atlas upgrade --json');
    expect(migration).toContain('atlas.config.ts.atlas-v0.bak');
  });

  it('runs the packaged front-desk example through the real local runtime', async () => {
    const root = path.join(packageRoot, 'examples', 'front-desk');
    const project = await loadAtlasProject(root);
    const result = await testLocalProject(root);

    expect(project.config.project.name).toBe('front-desk-example');
    expect(project.package_hash).toMatch(/^sha256:/);
    expect(result).toMatchObject({ status: 'passed', exactly_once: true, action_count: 1, delivery_state: 'delivered' });
  });

  it('ships source and version metadata for the packed artifact', async () => {
    const pkg = await jsonFile('package.json');
    const metadata = await jsonFile('metadata/package-source.v1.json');

    expect(metadata).toMatchObject({
      schema_version: 'atlas.package-source/v1',
      package_name: '@mirai/atlas',
      package_version: pkg.version,
      release_status: 'unpublished_local_artifact',
      repository_visibility: 'private_or_unpublished',
    });
    expect(metadata.source_head_sha).toMatch(/^[0-9a-f]{40}$/);
    expect(metadata.base_tree_sha).toMatch(/^[0-9a-f]{40}$/);
    expect(metadata.source_content_sha256).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it('includes docs, examples, skills, metadata, and schema in package files', async () => {
    const pkg = await jsonFile('package.json');
    expect(pkg.files).toEqual(expect.arrayContaining(['docs', 'examples', 'skills', 'metadata', 'schema']));
  });
});
