# Atlas project contract v1

`atlas.config.ts` is the canonical source of truth for a local Atlas project.

```ts
import { defineAtlasProject } from "@atlas-runner/atlas";

export default defineAtlasProject(
{
  "schemaVersion": "1",
  "project": {
    "name": "front-desk"
  },
  "runtime": {
    "mode": "native"
  },
  "model": {
    "mode": "local-fixture"
  },
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
);
```

## Declarative by design

Atlas parses the object as JSON-compatible data. The file cannot run configuration code, read environment variables, fetch remote content, or compute credentials. This makes validation, migration, import/export, and package hashes deterministic.

Use quoted keys and JSON values inside `defineAtlasProject(...)`.

## Required filesystem

```text
atlas.config.ts
agent/
  instructions.md
  tools/
  policies/
knowledge/
channels/
evals/
tests/
AGENTS.md
README.md
```

Optional project-owned paths include `agent/skills/` and `agent/subagents/`.

All configured paths must:

- begin with `./`;
- remain inside the project root;
- avoid `..`, symbolic links, and platform-dependent separators;
- resolve to project-owned files or directories.

## Runtime and model modes

Project schema v1 requires the Atlas-native runtime:

```json
{ "runtime": { "mode": "native" } }
```

Supported model modes are:

- `local-fixture`: deterministic, zero credentials, zero paid model;
- `managed`: reserved for approved managed runtime configuration;
- `byok`: external model credential referenced with `secretRef(...)`;
- `gateway`: approved gateway URL plus typed credential reference.

A raw token, API key, private key, password, or connection string is invalid project configuration.

```ts
import { secretRef } from "@atlas-runner/atlas";

const credential = secretRef("atlas://credentials/model-primary");
```

The string names a credential. It does not contain credential material.

## Environment overlays

An optional `atlas.<environment>.ts` file may override only the environment-safe surface:

```ts
import { defineAtlasEnvironment, secretRef } from "@atlas-runner/atlas";

export default defineAtlasEnvironment(
{
  "schemaVersion": "1",
  "model": {
    "mode": "byok",
    "credential": {
      "kind": "atlas.secret-ref/v1",
      "ref": "atlas://credentials/model-primary"
    }
  },
  "variables": {
    "LOG_LEVEL": "debug"
  }
}
);
```

Overlays cannot change project identity, instructions, tools, policies, knowledge, or eval ownership.

## Deterministic package hash

Atlas hashes:

1. the normalized effective project contract;
2. every configured project-owned file;
3. each file's normalized relative path and SHA-256 digest.

Run:

```bash
atlas explain project --json
```

The returned `project_hash` changes when governed configuration or referenced package content changes. Runtime state, `node_modules`, Git metadata, and unrelated application files do not affect the project hash.

## Import, export, and migration

The public library exports:

- `defineAtlasProject`;
- `defineAtlasEnvironment`;
- `loadAtlasProject`;
- `validateAtlasProject`;
- `exportAtlasProject`;
- `importAtlasProject`;
- `migrateAtlasProject`;
- `secretRef`.

Run `atlas upgrade --json` to migrate a supported earlier schema. Atlas writes a backup before changing `atlas.config.ts` and verifies the resulting project hash.

The machine-readable schema is shipped at:

```text
node_modules/@atlas-runner/atlas/schema/atlas-project.v1.schema.json
```
