# Atlas project migration

Project schema v1 is the canonical local Atlas contract.

## Check the current project

```bash
atlas doctor --json
atlas explain project --json
```

When `atlas.config.ts` already uses schema version `1`, migration is idempotent:

```bash
atlas upgrade --json
```

The result reports `changed: false` and does not rewrite the file.

## Migrate schema v0

Run:

```bash
atlas upgrade --json
```

The v0 compatibility migration:

1. reads the strict declarative configuration without executing code;
2. validates the supported v0 fields;
3. writes `atlas.config.ts.atlas-v0.bak` with mode `0600`;
4. nests project identity under `project`;
5. adds the Atlas-native runtime and local fixture model defaults;
6. nests instructions, tools, policies, skills, and subagents under `agent`;
7. writes the v1 file atomically;
8. loads every governed path and computes the resulting project hash.

Run it again after a successful migration to prove idempotency.

## Example v0 input

```ts
import { defineAtlasProject } from "@atlas-runner/atlas";

export default defineAtlasProject(
{
  "schemaVersion": "0",
  "name": "front-desk",
  "instructions": "./agent/instructions.md",
  "tools": "./agent/tools",
  "policies": "./agent/policies",
  "knowledge": ["./knowledge"],
  "channels": ["./channels/web-chat.ts"],
  "evals": ["./evals"]
}
);
```

## Resulting v1 structure

```json
{
  "schemaVersion": "1",
  "project": { "name": "front-desk" },
  "runtime": { "mode": "native" },
  "model": { "mode": "local-fixture" },
  "agent": {
    "instructions": "./agent/instructions.md",
    "tools": "./agent/tools",
    "skills": "./agent/skills",
    "policies": "./agent/policies",
    "subagents": "./agent/subagents"
  },
  "knowledge": ["./knowledge"],
  "channels": ["./channels/web-chat.ts"],
  "evals": ["./evals"]
}
```

## Backup conflict

Atlas refuses to overwrite an existing `atlas.config.ts.atlas-v0.bak` with different content.

Action:

1. preserve the existing backup;
2. compare it with the current v0 configuration;
3. move it to a durable evidence location when appropriate;
4. rerun `atlas upgrade --json`.

Do not delete evidence merely to continue migration.

## Runtime-state compatibility

Project migration can change the project hash. Existing `.atlas/runtime-state.json` remains bound to its previous hash and may be rejected.

Preserve the state before migration when it contains evidence. After migration:

```bash
atlas doctor --json
atlas test --json
```

`atlas test` uses a disposable state. It proves the migrated project contract without modifying or silently adopting incompatible prior state.

## Unsupported future version

A CLI must fail closed when it cannot understand the project's schema version.

Install a compatible Atlas CLI or migrate with the release that owns the source version. Do not edit the version number without applying the defined structural migration.
