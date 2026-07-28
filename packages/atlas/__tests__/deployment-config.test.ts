import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises'; import os from 'node:os'; import path from 'node:path';
import { planDeployment, validateAtlasConfig } from '../src/deployment-config.js';
import { deploymentIdempotencyKey } from '../src/deployment-idempotency.js';
const dirs: string[] = []; afterEach(async () => Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true }))));
describe('deployment config', () => {
  it('validates and produces a non-destructive immutable-revision plan', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'atlas-deploy-')); dirs.push(root);
    await writeFile(path.join(root, 'atlas.yaml'), 'apiVersion: atlas.mirai/v1\nkind: Project\nmetadata:\n  name: demo\nspec:\n  projectId: prj_demo\n  environments:\n    sandbox:\n      environmentId: env_demo\n');
    expect((await validateAtlasConfig(root)).valid).toBe(true); const plan = await planDeployment(root);
    expect(plan.destructive).toBe(false); expect(plan.actions[0]).toMatchObject({ type: 'create_immutable_revision' });
  });
  it('persists and reuses deployment idempotency before mutation',async()=>{const root=await mkdtemp(path.join(os.tmpdir(),'atlas-deploy-'));dirs.push(root);const first=await deploymentIdempotencyKey(root,{action:'apply',digest:'sha256:test'});const second=await deploymentIdempotencyKey(root,{action:'apply',digest:'sha256:test'});expect(second).toBe(first);expect(first).toMatch(/^[0-9a-f-]{36}$/);});
  it('rejects inline secrets while allowing references',async()=>{const root=await mkdtemp(path.join(os.tmpdir(),'atlas-deploy-'));dirs.push(root);await writeFile(path.join(root,'atlas.yaml'),'apiVersion: atlas.mirai/v1\nkind: Project\nmetadata: { name: demo }\nspec:\n  projectId: prj_demo\n  environments: { sandbox: {} }\n  api_key: sk_live_forbidden\n  credentialRef: vault://atlas/demo\n');const result=await validateAtlasConfig(root);expect(result.valid).toBe(false);expect(result.errors.join(' ')).toContain('inline secret field');expect(result.errors.join(' ')).not.toContain('credentialRef');});
});
