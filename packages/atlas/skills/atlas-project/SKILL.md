---
name: atlas-project
description: Create, adopt, inspect, and safely modify an Atlas Business Messaging Agent Runtime project.
version: 1
package: "@atlas-runner/atlas@0.1.0-alpha.0"
---

# Atlas project skill

Use this skill when asked to create an Atlas project, adopt Atlas into an existing application, change `atlas.config.ts`, or explain the governed package.

## Read first

1. `../../docs/QUICKSTART.md`
2. `../../docs/PROJECT-CONTRACT.md`
3. `../../docs/AUTHORITY.md`
4. the target project's `atlas.config.ts`
5. the target project's `AGENTS.md` or `AGENTS.atlas.md`

## Create

In an empty parent directory:

```bash
atlas init front-desk --json
cd front-desk
atlas doctor --json
atlas test --json
```

Do not require an Atlas account, provider credential, cloud service, or paid model for the default local project.

## Adopt

Before modifying an existing application:

1. inspect the directory and Git status;
2. identify npm/pnpm lockfiles;
3. preserve uncommitted work;
4. run explicit adoption:

```bash
atlas init front-desk --dir . --existing --json
```

Review `.atlas/adoption-report.json`. Do not overwrite a generated-path conflict or reset a dirty repository.

## Modify

Keep `atlas.config.ts` declarative and JSON-compatible. Every configured path must remain under the project root. Raw credentials are forbidden; use `secretRef("atlas://credentials/<name>")` only where the schema permits.

After changing configuration or governed files:

```bash
atlas doctor --json
atlas test --json
atlas explain project --json
```

Record the resulting project hash when producing evidence.

## Authority invariant

External reasoning may propose. Atlas owns policy, approval, committed actions, outbox delivery, traces, and receipts.

Never make a browser component, provider adapter, webhook, model response, or external runtime authoritative for business mutation.

## Completion

The project is ready for local use only when doctor has zero failures, test proves exactly-once action plus delivery, and `atlas dev --json` reports `governed_runtime: true`.
