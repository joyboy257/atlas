import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  ATLAS_PROJECT_SCHEMA_VERSION,
  defineAtlasProject,
  exportAtlasProject,
  importAtlasProject,
  loadAtlasProject,
  migrateAtlasProject,
  renderAtlasProjectConfig,
  secretRef,
  validateAtlasProject,
  writeAtlasProjectConfig,
  type AtlasProjectConfig,
} from '../src/project-contract.js';

const dirs: string[] = [];
afterEach(async () => Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true }))));

function validConfig(): AtlasProjectConfig {
  return defineAtlasProject({
    schemaVersion: '1',
    project: { name: 'front-desk' },
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
}

async function projectRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'atlas-project-contract-'));
  dirs.push(root);
  await mkdir(path.join(root, 'agent', 'tools'), { recursive: true });
  await mkdir(path.join(root, 'agent', 'skills'), { recursive: true });
  await mkdir(path.join(root, 'agent', 'policies'), { recursive: true });
  await mkdir(path.join(root, 'agent', 'subagents'), { recursive: true });
  await mkdir(path.join(root, 'knowledge'), { recursive: true });
  await mkdir(path.join(root, 'channels'), { recursive: true });
  await mkdir(path.join(root, 'evals'), { recursive: true });
  await mkdir(path.join(root, 'missions'), { recursive: true });
  await writeFile(path.join(root, 'agent', 'instructions.md'), '# Front desk\n');
  await writeFile(path.join(root, 'agent', 'tools', 'reschedule-booking.ts'), 'export const tool = "reschedule";\n');
  await writeFile(path.join(root, 'agent', 'policies', 'booking-change.policy.ts'), 'export const approval = "required";\n');
  await writeFile(path.join(root, 'knowledge', 'booking-policy.md'), 'Changes require approval.\n');
  await writeFile(path.join(root, 'channels', 'web-chat.ts'), 'export const channel = "web-chat";\n');
  await writeFile(path.join(root, 'evals', 'booking-reschedule.eval.ts'), 'export const scenario = "reschedule";\n');
  await writeFile(path.join(root, 'missions', 'booking-reschedule.mission.ts'), 'export const mission = "booking-change";\n');
  return root;
}

describe('Atlas project contract v1', () => {
  it('accepts legacy schema-v1 projects without a missions field', () => {
    const legacy = { ...validConfig() } as Record<string, unknown>;
    delete legacy.missions;
    expect(validateAtlasProject(legacy).valid).toBe(true);
  });

  it('loads a generated atlas.config.ts and produces a source-bound package hash', async () => {
    const root = await projectRoot();
    await writeAtlasProjectConfig(root, validConfig());

    const loaded = await loadAtlasProject(root);

    expect(ATLAS_PROJECT_SCHEMA_VERSION).toBe('1');
    expect(loaded.config.project.name).toBe('front-desk');
    expect(loaded.package_hash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(loaded.files).toContain('knowledge/booking-policy.md');
    expect(loaded.files).toContain('missions/booking-reschedule.mission.ts');
    expect(await readFile(path.join(root, 'atlas.config.ts'), 'utf8')).toContain('defineAtlasProject');
  });

  it('ships a strict versioned JSON Schema matching the v1 contract', async () => {
    const schema = JSON.parse(await readFile(new URL('../schema/atlas-project.v1.schema.json', import.meta.url), 'utf8'));

    expect(schema.$id).toBe('https://schemas.usemirai.app/atlas/project/v1.json');
    expect(schema.properties.schemaVersion.const).toBe('1');
    expect(schema.additionalProperties).toBe(false);
    expect(schema.$defs.secretReference.properties.kind.const).toBe('atlas.secret-ref/v1');
  });

  it('returns actionable diagnostics for malformed, unknown, and unsupported fields', () => {
    const result = validateAtlasProject({
      schemaVersion: '99',
      project: { name: '', unexpected: true },
      runtime: { mode: 'unknown' },
      model: { mode: 'local-fixture' },
      agent: {},
      knowledge: [],
      channels: [],
      evals: [],
      extra: true,
    });

    expect(result.valid).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(expect.arrayContaining([
      'UNSUPPORTED_SCHEMA_VERSION',
      'UNKNOWN_FIELD',
      'INVALID_VALUE',
      'REQUIRED_FIELD',
    ]));
    expect(result.diagnostics.every((diagnostic) => diagnostic.next_action.length > 0)).toBe(true);
  });

  it('keeps hashes deterministic and changes them when governed package contents change', async () => {
    const root = await projectRoot();
    await writeAtlasProjectConfig(root, validConfig());

    const first = await loadAtlasProject(root);
    const second = await loadAtlasProject(root);
    await writeFile(path.join(root, 'knowledge', 'booking-policy.md'), 'Changes require manager approval.\n');
    const changed = await loadAtlasProject(root);

    expect(second.package_hash).toBe(first.package_hash);
    expect(changed.package_hash).not.toBe(first.package_hash);
  });

  it('rejects raw secret material while accepting typed secret references', () => {
    const raw = validateAtlasProject({ ...validConfig(), model: { mode: 'byok', apiKey: 'sk_live_forbidden' } });
    const referenced = validateAtlasProject({ ...validConfig(), model: { mode: 'byok', credential: secretRef('atlas://credentials/model-primary') } });

    expect(raw.valid).toBe(false);
    expect(raw.diagnostics.some((diagnostic) => diagnostic.code === 'RAW_SECRET_FORBIDDEN')).toBe(true);
    expect(referenced.valid).toBe(true);
  });

  it('accepts environment credential maps only when every value is a typed reference', () => {
    const valid = renderAtlasProjectConfig({
      schemaVersion: '1',
      credentials: {
        MODEL_PRIMARY: secretRef('atlas://credentials/model-primary'),
      },
      variables: {
        LOG_LEVEL: 'debug',
      },
    }, 'environment');
    const invalid = validateAtlasProject({
      ...validConfig(),
      model: { mode: 'byok', credential: { kind: 'atlas.secret-ref/v1', ref: 'raw-secret' } },
    });

    expect(valid).toContain('atlas://credentials/model-primary');
    expect(invalid.valid).toBe(false);
    expect(invalid.diagnostics.some((diagnostic) => diagnostic.code === 'INVALID_SECRET_REFERENCE')).toBe(true);
  });

  it('applies a strict local overlay without changing the canonical source config', async () => {
    const root = await projectRoot();
    await writeAtlasProjectConfig(root, validConfig());
    await writeFile(path.join(root, 'atlas.local.ts'), renderAtlasProjectConfig({
      schemaVersion: '1',
      model: { mode: 'local-fixture' },
      channels: ['./channels/web-chat.ts'],
    }, 'environment'));

    const loaded = await loadAtlasProject(root, { environment: 'local' });
    const canonical = await loadAtlasProject(root);

    expect(loaded.environment).toBe('local');
    expect(loaded.config.model.mode).toBe('local-fixture');
    expect(canonical.environment).toBeNull();
  });

  it('migrates schema v0 once and is idempotent on the v1 result', () => {
    const first = migrateAtlasProject({
      schemaVersion: '0',
      name: 'front-desk',
      instructions: './agent/instructions.md',
      tools: './agent/tools',
      policies: './agent/policies',
      knowledge: ['./knowledge'],
      channels: ['./channels/web-chat.ts'],
    });
    const second = migrateAtlasProject(first.config);

    expect(first.changed).toBe(true);
    expect(first.from_version).toBe('0');
    expect(first.config.schemaVersion).toBe('1');
    expect(second.changed).toBe(false);
    expect(second.config).toEqual(first.config);
  });

  it('round-trips exported project data without losing fields', () => {
    const original = validConfig();
    const imported = importAtlasProject(exportAtlasProject(original));

    expect(imported).toEqual(original);
  });

  it('rejects filesystem references that escape the project root', () => {
    const result = validateAtlasProject({ ...validConfig(), knowledge: ['../private'] });

    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((diagnostic) => diagnostic.code === 'UNSAFE_PROJECT_PATH')).toBe(true);
  });
});
