import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises'; import os from 'node:os'; import path from 'node:path';
import { assertHostedAuthorityConfig } from '../src/authority-config.js';
import { DEFAULT_CAPACITY_MODEL, estimateCapacity, validateCapacityModel } from '../src/capacity-model.js';
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

  it('rejects hosted environments without durable authority declarations', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'atlas-deploy-')); dirs.push(root);
    await writeFile(path.join(root, 'atlas.yaml'), 'apiVersion: atlas.mirai/v1\nkind: Project\nmetadata: { name: demo }\nspec:\n  projectId: prj_demo\n  environments:\n    staging: {}\n');
    const result = await validateAtlasConfig(root);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toContain('environment staging must declare authorities');
  });

  it('rejects unsafe authorities behind a custom hosted environment slug', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'atlas-deploy-')); dirs.push(root);
    await writeFile(path.join(root, 'atlas.yaml'), `apiVersion: atlas.mirai/v1
kind: Project
metadata: { name: demo }
spec:
  projectId: prj_demo
  environments:
    prod-eu:
      environment_type: production
      authorities:
        identity: database
        missions: memory
        policy: database
        approvals: database
        actions: database
        outbox: database
        receipts: database
        usage: database
        credentials: secret-manager
`);
    const result = await validateAtlasConfig(root);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toContain('prod-eu: unsafe authority backend');
  });

  it('rejects memory, test, and fixture authorities in production', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'atlas-deploy-')); dirs.push(root);
    await writeFile(path.join(root, 'atlas.yaml'), `apiVersion: atlas.mirai/v1
kind: Project
metadata: { name: demo }
spec:
  projectId: prj_demo
  environments:
    production:
      authorities:
        identity: database
        missions: memory
        policy: database
        approvals: test
        actions: database
        outbox: fixture
        receipts: database
        usage: database
        credentials: secret-manager
`);
    const result = await validateAtlasConfig(root);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toContain('production: unsafe authority backend');
  });

  it('accepts a complete durable authority declaration for production', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'atlas-deploy-')); dirs.push(root);
    await writeFile(path.join(root, 'atlas.yaml'), `apiVersion: atlas.mirai/v1
kind: Project
metadata: { name: demo }
spec:
  projectId: prj_demo
  environments:
    production:
      authorities:
        identity: database
        missions: database
        policy: database
        approvals: database
        actions: database
        outbox: queue
        receipts: database
        usage: database
        credentials: secret-manager
`);
    expect((await validateAtlasConfig(root)).valid).toBe(true);
  });

  it('rejects unknown authority keys', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'atlas-deploy-')); dirs.push(root);
    await writeFile(path.join(root, 'atlas.yaml'), `apiVersion: atlas.mirai/v1
kind: Project
metadata: { name: demo }
spec:
  projectId: prj_demo
  environments:
    production:
      authorities:
        identity: database
        missions: database
        policy: database
        approvals: database
        actions: database
        outbox: queue
        receipts: database
        usage: database
        credentials: secret-manager
        billing: database
`);
    const result = await validateAtlasConfig(root);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toContain('unknown authority keys: billing');
  });

  it('emits a typed startup failure for unsafe hosted authority fallback', () => {
    expect(() => assertHostedAuthorityConfig('production', {
      identity: 'database', missions: 'memory', policy: 'database', approvals: 'database',
      actions: 'database', outbox: 'database', receipts: 'database', usage: 'database', credentials: 'secret-manager',
    })).toThrowError(expect.objectContaining({ code: 'UNSAFE_AUTHORITY_CONFIGURATION', exitCode: 10 }));
  });

  it.each([
    ['staging', 'credentials', 'database'],
    ['production', 'credentials', 'queue'],
  ])('rejects hosted %s credentials backed by %s', (environment, backend) => {
    expect(() => assertHostedAuthorityConfig(environment, {
      identity: 'database', missions: 'database', policy: 'database', approvals: 'database',
      actions: 'database', outbox: 'queue', receipts: 'database', usage: 'database',
      credentials: backend,
    })).toThrowError(expect.objectContaining({ code: 'UNSAFE_AUTHORITY_CONFIGURATION' }));
  });

  it('rejects secret-manager for non-credential hosted authorities', () => {
    expect(() => assertHostedAuthorityConfig('production', {
      identity: 'secret-manager', missions: 'database', policy: 'database', approvals: 'database',
      actions: 'database', outbox: 'queue', receipts: 'database', usage: 'database', credentials: 'secret-manager',
    })).toThrowError(expect.objectContaining({ code: 'UNSAFE_AUTHORITY_CONFIGURATION' }));
  });

  it('rejects hosted authority maps missing a required field', () => {
    expect(() => assertHostedAuthorityConfig('production', {
      identity: 'database', missions: 'database', policy: 'database', approvals: 'database',
      actions: 'database', outbox: 'queue', receipts: 'database', usage: 'database',
    })).toThrowError(expect.objectContaining({ code: 'UNSAFE_AUTHORITY_CONFIGURATION' }));
  });

  it('validates the versioned workload and fault model', () => {
    expect(validateCapacityModel(DEFAULT_CAPACITY_MODEL).valid).toBe(true);
    expect(DEFAULT_CAPACITY_MODEL.profiles.map((profile) => profile.name)).toEqual(['steady', 'peak', 'burst', 'abuse']);
  });

  it('reconciles modeled mission and action cost drivers deterministically', () => {
    const estimate = estimateCapacity(DEFAULT_CAPACITY_MODEL, 'steady', 10);
    expect(estimate).toMatchObject({ missions: 150, actions: 600, providerEvents: 150, receipts: 450, inputTokens: 135000, outputTokens: 45000 });
  });

  it('rejects invalid tenant or provider distributions', () => {
    const invalid = { ...DEFAULT_CAPACITY_MODEL, providers: [{ provider: 'fixture', quotaPerMinute: 1, share: 0.5 }, { provider: 'other', quotaPerMinute: 1, share: 0.5 }] };
    expect(validateCapacityModel(invalid).valid).toBe(true);
    expect(validateCapacityModel({ ...invalid, tenants: [{ tier: 'small', tenants: 1, missionsPerMinute: 1, share: 0.2 }] }).valid).toBe(false);
  });

  it('fails closed when a hosted target is absent from the local environment map', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'atlas-deploy-')); dirs.push(root);
    await writeFile(path.join(root, 'atlas.yaml'), 'apiVersion: atlas.mirai/v1\nkind: Project\nmetadata: { name: demo }\nspec:\n  projectId: prj_demo\n  environments:\n    sandbox: {}\n');
    await expect(planDeployment(root, 'atlas.yaml', { targetEnvironmentSlug: 'prod-eu', targetEnvironmentType: 'production' }))
      .rejects.toThrowError(expect.objectContaining({ code: 'UNSAFE_AUTHORITY_CONFIGURATION' }));
  });

  it('keeps explicit sandbox authority fixtures local', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'atlas-deploy-')); dirs.push(root);
    await writeFile(path.join(root, 'atlas.yaml'), `apiVersion: atlas.mirai/v1
kind: Project
metadata: { name: demo }
spec:
  projectId: prj_demo
  environments:
    sandbox:
      environment_type: sandbox
      authorities:
        identity: memory
        missions: fixture
        policy: test
        approvals: memory
        actions: fixture
        outbox: memory
        receipts: fixture
        usage: memory
        credentials: memory
`);
    expect((await validateAtlasConfig(root)).valid).toBe(true);
  });

  it('accepts custom sandbox slugs with local authority fixtures', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'atlas-deploy-')); dirs.push(root);
    await writeFile(path.join(root, 'atlas.yaml'), `apiVersion: atlas.mirai/v1
kind: Project
metadata: { name: demo }
spec:
  projectId: prj_demo
  environments:
    dev-alice:
      environment_type: sandbox
      authorities:
        identity: memory
        missions: fixture
        policy: test
        approvals: memory
        actions: fixture
        outbox: memory
        receipts: fixture
        usage: memory
        credentials: memory
`);
    expect((await validateAtlasConfig(root)).valid).toBe(true);
    await expect(planDeployment(root, 'atlas.yaml', {
      targetEnvironmentSlug: 'dev-alice',
      targetEnvironmentType: 'sandbox',
    })).resolves.toMatchObject({ valid: true });
  });

  it('keeps malformed local authority maps as ordinary validation errors', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'atlas-deploy-')); dirs.push(root);
    await writeFile(path.join(root, 'atlas.yaml'), `apiVersion: atlas.mirai/v1
kind: Project
metadata: { name: demo }
spec:
  projectId: prj_demo
  environments:
    dev-alice:
      environment_type: sandbox
      authorities:
        identity: memory
`);
    await expect(planDeployment(root, 'atlas.yaml', {
      targetEnvironmentSlug: 'dev-alice',
      targetEnvironmentType: 'sandbox',
    })).resolves.toMatchObject({ valid: false });
    await expect(planDeployment(root, 'atlas.yaml', {
      targetEnvironmentSlug: 'dev-alice',
      targetEnvironmentType: 'sandbox',
    })).resolves.toMatchObject({
      valid: false,
      authorityErrors: [],
    });
  });

  it('accepts the local simulator without hosted authority configuration', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'atlas-deploy-')); dirs.push(root);
    await writeFile(path.join(root, 'atlas.yaml'), 'apiVersion: atlas.mirai/v1\nkind: Project\nmetadata: { name: demo }\nspec:\n  projectId: prj_demo\n  environments:\n    sandbox: {}\n');
    const result = await validateAtlasConfig(root);
    expect(result.valid).toBe(true);
  });
});
