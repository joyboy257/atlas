import { describe, expect, it } from 'vitest';
import {
  AGENT_PACKAGE_API_VERSION,
  AGENT_PACKAGE_KIND,
  AGENT_PACKAGE_SCHEMA_FILE,
  validateAgentPackage,
  computeAgentVersionId,
  type AgentPackage,
} from '../src/agent-package.js';

// ── Fixtures ─────────────────────────────────────────────────────

function minimalPackage(): unknown {
  return {
    apiVersion: 'atlas.mirai.dev/v2',
    kind: 'AgentPackage',
    metadata: { name: 'front-desk', version: '1.0.0' },
    spec: {
      instructions: './agent/instructions.md',
      knowledgeBindings: ['./knowledge/booking-policy.md'],
      tools: './agent/tools/',
      actionPolicies: './agent/policies/booking-change.policy.ts',
    },
  };
}

function fullPackage(): unknown {
  return {
    apiVersion: 'atlas.mirai.dev/v2',
    kind: 'AgentPackage',
    metadata: {
      name: 'concierge',
      version: '2.3.1-beta.1',
      description: 'Full-service hotel concierge agent',
      labels: { team: 'hospitality', env: 'production' },
    },
    spec: {
      missionTypes: [
        { type: 'booking-change', goalTemplate: 'Reschedule booking for {{customer}}', autonomyLevel: 'proposal-only' },
        { type: 'check-in', goalTemplate: 'Complete check-in for {{customer}}', autonomyLevel: 'full', allowedTools: ['room-key', 'payment'] },
      ],
      instructions: './agent/instructions.md',
      knowledgeBindings: ['./knowledge/hotel-policy.md', './knowledge/room-types.md'],
      memoryPolicy: { mode: 'customer', retention: 'P90D', provenanceRequired: true, maxEntries: 5000 },
      tools: './agent/tools/',
      skills: './agent/skills/',
      actionPolicies: './agent/policies/',
      subagents: './agent/subagents/',
      triggers: [
        { kind: 'message', channel: 'web-chat' },
        { kind: 'schedule', cronExpression: '0 9 * * *' },
      ],
      channelRequirements: [
        { channel: 'web-chat', direction: 'bidirectional', mediaTypes: ['text', 'image'], required: true },
      ],
      runtime: { mode: 'native' },
      budgets: { maxConcurrentMissions: 10, maxTokensPerDay: 1_000_000, currency: 'USD' },
      outcomeDefinitions: [
        { id: 'booking-confirmed', type: 'success', label: 'Booking confirmed by provider' },
        { id: 'customer-timeout', type: 'failure', label: 'Customer did not respond' },
      ],
      evals: ['./evals/booking-flow.eval.ts'],
      compatibility: { minimumAtlasVersion: '0.2.0', schemaEvolution: 'additive-only' },
    },
  };
}

// ── Constants ─────────────────────────────────────────────────────

describe('AgentPackage constants', () => {
  it('exports the correct apiVersion', () => {
    expect(AGENT_PACKAGE_API_VERSION).toBe('atlas.mirai.dev/v2');
  });

  it('exports the correct kind', () => {
    expect(AGENT_PACKAGE_KIND).toBe('AgentPackage');
  });

  it('references the correct schema file', () => {
    expect(AGENT_PACKAGE_SCHEMA_FILE).toBe('schema/atlas-agent-package.v2.schema.json');
  });
});

// ── Happy-path validation ────────────────────────────────────────

describe('validateAgentPackage', () => {
  it('validates a minimal package', () => {
    const result = validateAgentPackage(minimalPackage());
    expect(result.valid).toBe(true);
    expect(result.diagnostics).toHaveLength(0);
    expect(result.package).toBeDefined();
    expect(result.package!.apiVersion).toBe('atlas.mirai.dev/v2');
    expect(result.package!.kind).toBe('AgentPackage');
    expect(result.package!.metadata.name).toBe('front-desk');
  });

  it('validates a full package with every optional field', () => {
    const result = validateAgentPackage(fullPackage());
    expect(result.valid).toBe(true);
    expect(result.diagnostics).toHaveLength(0);
    expect(result.package).toBeDefined();
  });

  it('returns a frozen (immutable) package', () => {
    const result = validateAgentPackage(minimalPackage());
    expect(result.package).toBeDefined();
    expect(Object.isFrozen(result.package!)).toBe(true);
    expect(Object.isFrozen(result.package!.metadata)).toBe(true);
    expect(Object.isFrozen(result.package!.spec)).toBe(true);
    expect(Object.isFrozen(result.package!.spec.knowledgeBindings)).toBe(true);
  });

  it('accepts a package with optional fields omitted', () => {
    const pkg = {
      apiVersion: 'atlas.mirai.dev/v2',
      kind: 'AgentPackage',
      metadata: { name: 'simple', version: '0.1.0' },
      spec: {
        instructions: './agent/instructions.md',
        knowledgeBindings: ['./knowledge/base.md'],
        tools: './agent/tools/',
        actionPolicies: './agent/policies/',
      },
    };
    const result = validateAgentPackage(pkg);
    expect(result.valid).toBe(true);
  });

  it('accepts a version with a pre-release tag', () => {
    const result = validateAgentPackage({
      ...minimalPackage(),
      metadata: { name: 'test', version: '1.0.0-alpha.1+20260101' },
    });
    expect(result.valid).toBe(true);
  });

  it('accepts metadata labels', () => {
    const pkg = { ...minimalPackage(), metadata: { name: 'test', version: '1.0.0', labels: { env: 'staging' } } };
    const result = validateAgentPackage(pkg);
    expect(result.valid).toBe(true);
  });
});

// ── Negative validation ──────────────────────────────────────────

describe('validateAgentPackage — invalid apiVersion and kind', () => {
  it('rejects a missing apiVersion', () => {
    const { apiVersion, ...rest } = minimalPackage() as Record<string, unknown>;
    const result = validateAgentPackage(rest);
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((d) => d.code === 'INVALID_API_VERSION')).toBe(true);
  });

  it('rejects a wrong apiVersion', () => {
    const result = validateAgentPackage({ ...minimalPackage(), apiVersion: 'v1' });
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((d) => d.code === 'INVALID_API_VERSION')).toBe(true);
  });

  it('rejects a missing kind', () => {
    const { kind, ...rest } = minimalPackage() as Record<string, unknown>;
    const result = validateAgentPackage(rest);
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((d) => d.code === 'INVALID_KIND')).toBe(true);
  });

  it('rejects a wrong kind', () => {
    const result = validateAgentPackage({ ...minimalPackage(), kind: 'Mission' });
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((d) => d.code === 'INVALID_KIND')).toBe(true);
  });

  it('rejects non-object input', () => {
    const result = validateAgentPackage('not an object');
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((d) => d.code === 'INVALID_SPEC')).toBe(true);
  });
});

describe('validateAgentPackage — metadata', () => {
  it('rejects missing metadata', () => {
    const { metadata, ...rest } = minimalPackage() as Record<string, unknown>;
    const result = validateAgentPackage(rest);
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((d) => d.path === '$.metadata')).toBe(true);
  });

  it('rejects missing name', () => {
    const { name, ...badMeta } = (minimalPackage() as Record<string, unknown>).metadata as Record<string, unknown>;
    const result = validateAgentPackage({ ...minimalPackage(), metadata: badMeta });
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((d) => d.path === '$.metadata.name')).toBe(true);
  });

  it('rejects invalid name format', () => {
    const result = validateAgentPackage({
      ...minimalPackage(),
      metadata: { name: 'INVALID_NAME', version: '1.0.0' },
    });
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((d) => d.path === '$.metadata.name')).toBe(true);
  });

  it('rejects name that is too long', () => {
    const result = validateAgentPackage({
      ...minimalPackage(),
      metadata: { name: 'a'.repeat(64), version: '1.0.0' },
    });
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((d) => d.path === '$.metadata.name')).toBe(true);
  });

  it('rejects missing version', () => {
    const result = validateAgentPackage({
      ...minimalPackage(),
      metadata: { name: 'test' },
    });
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((d) => d.path === '$.metadata.version')).toBe(true);
  });

  it('rejects invalid semver', () => {
    const result = validateAgentPackage({
      ...minimalPackage(),
      metadata: { name: 'test', version: 'not-semver' },
    });
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((d) => d.path === '$.metadata.version')).toBe(true);
  });

  it('rejects description over 500 chars', () => {
    const result = validateAgentPackage({
      ...minimalPackage(),
      metadata: { name: 'test', version: '1.0.0', description: 'x'.repeat(501) },
    });
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((d) => d.path === '$.metadata.description')).toBe(true);
  });

  it('rejects labels with too many entries', () => {
    const labels: Record<string, string> = {};
    for (let i = 0; i < 20; i++) labels[`key${i}`] = `value${i}`;
    const result = validateAgentPackage({
      ...minimalPackage(),
      metadata: { name: 'test', version: '1.0.0', labels },
    });
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((d) => d.path === '$.metadata.labels')).toBe(true);
  });
});

describe('validateAgentPackage — spec required fields', () => {
  it('rejects missing spec', () => {
    const { spec, ...rest } = minimalPackage() as Record<string, unknown>;
    const result = validateAgentPackage(rest);
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((d) => d.code === 'REQUIRED_FIELD' && d.path === '$.spec')).toBe(true);
  });

  it('rejects missing instructions', () => {
    const { instructions, ...badSpec } = (minimalPackage() as Record<string, unknown>).spec as Record<string, unknown>;
    const result = validateAgentPackage({ ...minimalPackage(), spec: badSpec });
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((d) => d.path === '$.spec.instructions')).toBe(true);
  });

  it('rejects empty knowledgeBindings', () => {
    const result = validateAgentPackage({
      ...minimalPackage(),
      spec: { ...(minimalPackage() as Record<string, unknown>).spec, knowledgeBindings: [] },
    });
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((d) => d.path === '$.spec.knowledgeBindings')).toBe(true);
  });
});

describe('validateAgentPackage — project paths', () => {
  it('rejects paths that escape the project via ..', () => {
    const result = validateAgentPackage({
      ...minimalPackage(),
      spec: {
        ...(minimalPackage() as Record<string, unknown>).spec,
        instructions: '../escape.md',
      },
    });
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((d) => d.code === 'UNSAFE_PROJECT_PATH')).toBe(true);
  });

  it('rejects paths without ./ prefix', () => {
    const result = validateAgentPackage({
      ...minimalPackage(),
      spec: {
        ...(minimalPackage() as Record<string, unknown>).spec,
        instructions: 'agent/instructions.md',
      },
    });
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((d) => d.code === 'UNSAFE_PROJECT_PATH')).toBe(true);
  });

  it('rejects paths with backslashes', () => {
    const result = validateAgentPackage({
      ...minimalPackage(),
      spec: {
        ...(minimalPackage() as Record<string, unknown>).spec,
        instructions: '.\\agent\\instructions.md',
      },
    });
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((d) => d.code === 'UNSAFE_PROJECT_PATH')).toBe(true);
  });

  it('rejects paths with null bytes', () => {
    const result = validateAgentPackage({
      ...minimalPackage(),
      spec: {
        ...(minimalPackage() as Record<string, unknown>).spec,
        instructions: './agent/\x00evil.md',
      },
    });
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((d) => d.code === 'UNSAFE_PROJECT_PATH')).toBe(true);
  });
});

describe('validateAgentPackage — unknown fields', () => {
  it('rejects unknown fields in spec', () => {
    const result = validateAgentPackage({
      ...minimalPackage(),
      spec: { ...(minimalPackage() as Record<string, unknown>).spec, extraField: true },
    });
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((d) => d.code === 'UNKNOWN_FIELD')).toBe(true);
  });
});

describe('validateAgentPackage — mission types', () => {
  it('rejects missionTypes that is not an array', () => {
    const result = validateAgentPackage({
      ...minimalPackage(),
      spec: { ...(minimalPackage() as Record<string, unknown>).spec, missionTypes: 'not-array' },
    });
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((d) => d.path === '$.spec.missionTypes')).toBe(true);
  });

  it('rejects mission type with duplicate type names', () => {
    const result = validateAgentPackage({
      ...minimalPackage(),
      spec: {
        ...(minimalPackage() as Record<string, unknown>).spec,
        missionTypes: [
          { type: 'booking', goalTemplate: 'Book a room' },
          { type: 'booking', goalTemplate: 'Another booking' },
        ],
      },
    });
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((d) => d.message.includes('duplicate'))).toBe(true);
  });

  it('rejects mission type without goalTemplate', () => {
    const result = validateAgentPackage({
      ...minimalPackage(),
      spec: {
        ...(minimalPackage() as Record<string, unknown>).spec,
        missionTypes: [{ type: 'booking' }],
      },
    });
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((d) => d.path.includes('goalTemplate'))).toBe(true);
  });

  it('rejects invalid autonomy level', () => {
    const result = validateAgentPackage({
      ...minimalPackage(),
      spec: {
        ...(minimalPackage() as Record<string, unknown>).spec,
        missionTypes: [{ type: 'booking', goalTemplate: 'Book', autonomyLevel: 'super-autonomous' }],
      },
    });
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((d) => d.path.includes('autonomyLevel'))).toBe(true);
  });
});

describe('validateAgentPackage — memory policy', () => {
  it('rejects invalid memory mode', () => {
    const result = validateAgentPackage({
      ...minimalPackage(),
      spec: {
        ...(minimalPackage() as Record<string, unknown>).spec,
        memoryPolicy: { mode: 'photographic' },
      },
    });
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((d) => d.path.includes('memoryPolicy.mode'))).toBe(true);
  });

  it('rejects maxEntries below 1', () => {
    const result = validateAgentPackage({
      ...minimalPackage(),
      spec: {
        ...(minimalPackage() as Record<string, unknown>).spec,
        memoryPolicy: { mode: 'mission', maxEntries: 0 },
      },
    });
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((d) => d.path.includes('maxEntries'))).toBe(true);
  });
});

describe('validateAgentPackage — triggers', () => {
  it('rejects invalid trigger kind', () => {
    const result = validateAgentPackage({
      ...minimalPackage(),
      spec: {
        ...(minimalPackage() as Record<string, unknown>).spec,
        triggers: [{ kind: 'telepathy' }],
      },
    });
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((d) => d.path.includes('triggers'))).toBe(true);
  });
});

describe('validateAgentPackage — channel requirements', () => {
  it('rejects channel requirement without channel name', () => {
    const result = validateAgentPackage({
      ...minimalPackage(),
      spec: {
        ...(minimalPackage() as Record<string, unknown>).spec,
        channelRequirements: [{ direction: 'inbound' }],
      },
    });
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((d) => d.path.includes('channel'))).toBe(true);
  });

  it('rejects invalid direction', () => {
    const result = validateAgentPackage({
      ...minimalPackage(),
      spec: {
        ...(minimalPackage() as Record<string, unknown>).spec,
        channelRequirements: [{ channel: 'sms', direction: 'sideways' }],
      },
    });
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((d) => d.path.includes('direction'))).toBe(true);
  });
});

describe('validateAgentPackage — runtime', () => {
  it('rejects invalid runtime mode', () => {
    const result = validateAgentPackage({
      ...minimalPackage(),
      spec: {
        ...(minimalPackage() as Record<string, unknown>).spec,
        runtime: { mode: 'quantum' },
      },
    });
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((d) => d.path.includes('runtime.mode'))).toBe(true);
  });
});

describe('validateAgentPackage — budgets', () => {
  it('rejects maxConcurrentMissions below 1', () => {
    const result = validateAgentPackage({
      ...minimalPackage(),
      spec: {
        ...(minimalPackage() as Record<string, unknown>).spec,
        budgets: { maxConcurrentMissions: 0 },
      },
    });
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((d) => d.path.includes('maxConcurrentMissions'))).toBe(true);
  });

  it('rejects invalid currency code', () => {
    const result = validateAgentPackage({
      ...minimalPackage(),
      spec: {
        ...(minimalPackage() as Record<string, unknown>).spec,
        budgets: { currency: 'US' },
      },
    });
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((d) => d.path.includes('currency'))).toBe(true);
  });

  it('accepts valid ISO currency code', () => {
    const result = validateAgentPackage({
      ...minimalPackage(),
      spec: {
        ...(minimalPackage() as Record<string, unknown>).spec,
        budgets: { currency: 'EUR' },
      },
    });
    // currency is optional and valid USD/EUR alone doesn't make a package valid or invalid
    // maxConcurrentMissions being absent is fine
    expect(result.diagnostics.filter((d) => d.path.includes('currency'))).toHaveLength(0);
  });
});

describe('validateAgentPackage — outcome definitions', () => {
  it('rejects duplicate outcome ids', () => {
    const result = validateAgentPackage({
      ...minimalPackage(),
      spec: {
        ...(minimalPackage() as Record<string, unknown>).spec,
        outcomeDefinitions: [
          { id: 'success', type: 'success' },
          { id: 'success', type: 'failure' },
        ],
      },
    });
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((d) => d.message.includes('duplicate'))).toBe(true);
  });

  it('rejects invalid outcome type', () => {
    const result = validateAgentPackage({
      ...minimalPackage(),
      spec: {
        ...(minimalPackage() as Record<string, unknown>).spec,
        outcomeDefinitions: [{ id: 'weird', type: 'maybe' }],
      },
    });
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((d) => d.path.includes('outcomeDefinitions'))).toBe(true);
  });
});

describe('validateAgentPackage — compatibility', () => {
  it('rejects invalid schema evolution mode', () => {
    const result = validateAgentPackage({
      ...minimalPackage(),
      spec: {
        ...(minimalPackage() as Record<string, unknown>).spec,
        compatibility: { schemaEvolution: 'chaos-mode' },
      },
    });
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((d) => d.path.includes('schemaEvolution'))).toBe(true);
  });
});

// ── Agent version identity ───────────────────────────────────────

describe('computeAgentVersionId', () => {
  it('produces a deterministic version ID for the same input', () => {
    const result1 = validateAgentPackage(minimalPackage());
    const result2 = validateAgentPackage(minimalPackage());
    const id1 = computeAgentVersionId(result1.package!);
    const id2 = computeAgentVersionId(result2.package!);
    expect(id1.agent_version_id).toBe(id2.agent_version_id);
    expect(id1.source_digest).toBe(id2.source_digest);
  });

  it('excludes runtime and budgets from the source digest', () => {
    const resultPlain = validateAgentPackage(minimalPackage());
    const resultWithRuntime = validateAgentPackage({
      ...minimalPackage(),
      spec: {
        ...(minimalPackage() as Record<string, unknown>).spec,
        runtime: { mode: 'native' },
        budgets: { maxConcurrentMissions: 5, currency: 'JPY' },
      },
    });

    // runtime + budgets should be excluded, so digests should be identical
    expect(computeAgentVersionId(resultPlain.package!).agent_version_id).toBe(
      computeAgentVersionId(resultWithRuntime.package!).agent_version_id,
    );
  });

  it('includes metadata name and version in the identity', () => {
    const v1 = computeAgentVersionId(validateAgentPackage(minimalPackage()).package!);
    const v2 = computeAgentVersionId(
      validateAgentPackage({
        ...minimalPackage(),
        metadata: { name: 'front-desk', version: '2.0.0' },
      }).package!,
    );
    expect(v1.agent_version_id).not.toBe(v2.agent_version_id);
  });

  it('preserves agent_name and agent_version in the output', () => {
    const result = validateAgentPackage(fullPackage());
    const id = computeAgentVersionId(result.package!);
    expect(id.agent_name).toBe('concierge');
    expect(id.agent_version).toBe('2.3.1-beta.1');
  });

  it('includes a created_at timestamp', () => {
    const result = validateAgentPackage(minimalPackage());
    const id = computeAgentVersionId(result.package!, '2026-07-29T00:00:00.000Z');
    expect(id.created_at).toBe('2026-07-29T00:00:00.000Z');
  });

  it('defaults created_at to current time when not provided', () => {
    const result = validateAgentPackage(minimalPackage());
    const before = new Date().toISOString();
    const id = computeAgentVersionId(result.package!);
    const after = new Date().toISOString();
    expect(id.created_at >= before).toBe(true);
    expect(id.created_at <= after).toBe(true);
  });

  it('returns a frozen AgentVersionId', () => {
    const result = validateAgentPackage(minimalPackage());
    const id = computeAgentVersionId(result.package!);
    expect(Object.isFrozen(id)).toBe(true);
  });

  it('produces a hex-encoded sha256 digest', () => {
    const result = validateAgentPackage(minimalPackage());
    const id = computeAgentVersionId(result.package!);
    expect(id.agent_version_id).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(id.source_digest).toMatch(/^sha256:[0-9a-f]{64}$/);
  });
});

// ── Type-level checks (compile-time only, verifiable at runtime via structure) ──

describe('AgentPackage type structure', () => {
  it('validated package has all required top-level fields', () => {
    const result = validateAgentPackage(minimalPackage());
    const pkg = result.package! as AgentPackage;
    expect(pkg.apiVersion).toBe('atlas.mirai.dev/v2');
    expect(pkg.kind).toBe('AgentPackage');
    expect(pkg.metadata).toBeDefined();
    expect(pkg.spec).toBeDefined();
    expect(pkg.spec.instructions).toBe('./agent/instructions.md');
    expect(Array.isArray(pkg.spec.knowledgeBindings)).toBe(true);
    expect(pkg.spec.tools).toBe('./agent/tools/');
    expect(pkg.spec.actionPolicies).toBe('./agent/policies/booking-change.policy.ts');
  });
});
