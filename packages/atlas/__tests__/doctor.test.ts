import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { runDoctor } from '../src/doctor.js';

const dirs: string[] = [];
afterEach(async () => Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true }))));

describe('doctor', () => {
  it('returns stable checks and writes a credential-free support bundle', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'atlas-doctor-')); dirs.push(root);
    const result = await runDoctor({ root, client: 'generic', supportBundle: true });
    expect(result.schema_version).toBe('atlas.doctor/v1');
    expect(result.checks.map((item) => item.id)).toContain('local.secret_scan');
    expect(result.support_bundle).toMatch(/support-\d+\.json$/);
    const bundle = await readFile(result.support_bundle!, 'utf8');
    expect(bundle).not.toMatch(/access_token|authorization.*bearer/i);
  });
});
