# Atlas local repair guide

Start with one non-mutating command:

```bash
atlas doctor --json
```

Read the failing check's `code`, `message`, and `next_action`. Do not delete local evidence or reset Git to make a check green.

## Scaffold interrupted or incomplete

Inspect:

```text
.atlas/scaffold-state.json
.atlas/adoption-report.json
.atlas/backups/
```

The adoption report records created, merged, and unchanged files by digest. Atlas-created files can be removed and merged files restored with:

```bash
atlas init front-desk --rollback --dir . --json
```

Rollback never resets, cleans, rebases, or rewrites Git history. If rollback is incomplete, preserve `.atlas/scaffold-state.json` and follow its listed file error.

## Occupied directory

Atlas refuses an occupied directory unless adoption is explicit.

```bash
atlas init front-desk --dir . --existing --json
```

Before adoption:

1. commit or otherwise preserve your application work;
2. inspect `package.json` and lockfiles;
3. remove conflicting npm/pnpm lockfiles;
4. keep existing `README.md` and `AGENTS.md`—Atlas writes `ATLAS.md` and `AGENTS.atlas.md` when needed.

Atlas refuses a generated-path conflict instead of overwriting different content.

## Package-manager install failed

Generated source is rolled back when dependency installation fails. Inspect `.atlas/scaffold-state.json` for `rolled_back` or `rollback_incomplete`.

Retry without installation:

```bash
atlas init front-desk --no-install --no-git --json
```

Then run the detected package manager manually with lifecycle scripts disabled during initial inspection.

## Node version unsupported

Atlas requires Node.js 22 or newer.

```bash
node --version
```

Install Node.js 22 LTS or newer, reopen the shell, then rerun `atlas doctor --json`.

## Project configuration invalid

Check:

```text
atlas.config.ts
node_modules/@atlas-runner/atlas/schema/atlas-project.v1.schema.json
node_modules/@atlas-runner/atlas/docs/PROJECT-CONTRACT.md
```

Common repairs:

- use a JSON-compatible object inside `defineAtlasProject(...)`;
- remove unknown fields;
- change unsafe paths to normalized `./...` paths;
- restore missing referenced files;
- replace raw credentials with typed Atlas secret references;
- run `atlas upgrade --json` for a supported earlier schema.

## Project hash changed

A hash change means governed configuration or a referenced project file changed. Run:

```bash
atlas explain project --json
atlas doctor --json
```

Review the reported files. Do not edit `.atlas/runtime-state.json` to replace its hash.

When the existing state must be preserved, copy it to an evidence location first. Then either restore the prior project content or start a fresh local project for the new hash.

## Runtime state corrupt or incompatible

Preserve:

```text
.atlas/runtime-state.json
```

Then inspect:

```bash
atlas doctor --json
atlas inspect --json
```

Do not certify tenant, approval, action, delivery, or receipt claims from a file the current runtime rejects.

For a disposable local demo only, create a new project directory rather than editing the rejected state by hand.

## Message duplicate or idempotency mismatch

An identical duplicate safely returns the original result and receipts. Different data under the same message ID or action idempotency key fails with `IDEMPOTENCY_MISMATCH`.

Repair by either:

- sending the exact original normalized input; or
- using a new message ID/idempotency key for the changed intent.

Never retry a committed business action by inventing a new key merely because provider delivery failed. Retry only the outbox delivery.

## Delivery retry blocked

`RETRY_NOT_READY` includes the next valid retry time. Wait until it, or use a simulator scenario with an `advance_time` event. Do not mutate `next_attempt_at` manually.

## Stale delivery callback

`DELIVERY_STATE_REGRESSION` means the callback is older than the current valid state. Preserve the highest state and ignore the stale callback.

## Workbench does not show governed mode

Run `atlas dev` from the directory containing `atlas.config.ts`.

```bash
pwd
ls atlas.config.ts
atlas dev --json
```

The response must contain:

```json
{
  "governed_runtime": true,
  "project_hash": "sha256:..."
}
```

A generic fixture server outside a project is compatibility mode, not the First Agent Loop.

## Support evidence

Capture only redacted machine outputs:

```bash
atlas doctor --json
atlas capabilities --json
atlas explain project --json
atlas inspect --json
atlas test --json
```

Do not include tokens, cookies, connection strings, unredacted customer message content, or private provider credentials.
