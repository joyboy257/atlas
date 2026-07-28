---
name: atlas-repair
description: Diagnose and repair Atlas local project, scaffold, runtime, idempotency, and delivery failures without destroying evidence.
version: 1
package: "@atlas-runner/atlas@0.1.0-alpha.0"
---

# Atlas repair skill

Use this skill after an Atlas command, local runtime, simulator scenario, or packed-project journey fails.

## First action

```bash
atlas doctor --json
```

Then read:

1. `../../docs/ERROR-CATALOG.md`
2. `../../docs/REPAIR.md`
3. `.atlas/scaffold-state.json` when scaffolding failed;
4. `.atlas/adoption-report.json` when files were created or merged;
5. `atlas inspect --json` when runtime state exists.

## Preserve before repair

Do not delete, reset, clean, overwrite, or hand-edit:

- `.atlas/runtime-state.json`;
- `.atlas/scaffold-state.json`;
- `.atlas/adoption-report.json`;
- `.atlas/backups/`;
- action, approval, trace, receipt, or delivery state;
- dirty Git work.

Copy evidence to a safe location when a destructive external repair is unavoidable.

## Bounded diagnosis

Map the failure to one layer:

1. package/runtime version;
2. project contract and referenced files;
3. scaffold/adoption state;
4. normalized message sequence and identity;
5. policy/approval/handoff;
6. action idempotency;
7. outbox/delivery callback;
8. hosted provider/platform boundary.

Fix the first failing layer before changing later layers.

## Safe repairs

- unsupported Node: install Node.js 22 or newer;
- invalid config: use the v1 schema and strict declarative form;
- raw secret: remove it and use a typed credential reference;
- partial scaffold: use the adoption report and Atlas rollback command;
- v0 schema: run `atlas upgrade --json` and preserve the backup;
- idempotency mismatch: reuse the original payload or issue a new identity;
- delivery retry: wait for `next_attempt_at`; do not repeat the action;
- stale callback: ignore the regression and preserve the highest state;
- project-hash mismatch: restore matching governed files or start a fresh local state after preserving evidence.

## Verification

After repair:

```bash
atlas doctor --json
atlas test --json
atlas replay --json
```

For interactive verification:

```bash
atlas dev --json
```

The command must report `governed_runtime: true`. Complete the workbench scenario and inspect the trace plus receipt chain.

## Stop condition

Stop and report a blocker when the repair would require:

- publishing the package;
- connecting live provider credentials;
- changing hosted tenant authority;
- bypassing approval or idempotency;
- editing evidence to produce a pass;
- claiming staging or production behavior from local fixtures.
