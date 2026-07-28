# Atlas command contract

Every command supports stable `--json` output. Successful machine responses use:

```json
{
  "ok": true,
  "command": "test",
  "data": {},
  "next_action": {
    "code": "dev",
    "label": "Run atlas dev."
  }
}
```

Errors include a stable code, retryability, and one actionable next step. Commands never require manual `curl` sequences.

## Local First Agent Loop

### `atlas init`

```bash
atlas init front-desk
atlas init front-desk --dir . --existing
atlas init front-desk --no-install --no-git --json
```

Creates or safely adopts a project. The default is local and needs no Atlas credential. Use `--cloud` only for the separate governed-cloud initializer.

Key safety flags:

- `--existing`: explicitly adopt an occupied application;
- `--no-install`: create files without running the package manager;
- `--no-git`: do not initialize Git;
- `--package-manager npm|pnpm`: override deterministic detection;
- `--rollback`: restore merged files and remove Atlas-created files using the adoption report.

### `atlas dev`

```bash
atlas dev
atlas dev --json
```

Starts the project-backed local runtime, workbench, MCP endpoint, webhook fixture endpoint, and governed HTTP API. The command prints the project hash and workbench URL.

### `atlas test`

```bash
atlas test
atlas test --json
```

Runs the canonical customer message → evidence → proposal → approval → exactly-once action → delivery → replay scenario in a disposable sandbox. It does not create or change the project's real runtime state.

### `atlas doctor`

```bash
atlas doctor
atlas doctor --json
```

Checks Node support, project schema, project hash, referenced files, raw-secret rejection, and runtime-state compatibility. It does not automatically mutate the project.

### `atlas capabilities`

```bash
atlas capabilities --json
```

Lists the installed runtime mode, model mode, normalized channels, governed tools, policies, delivery states, receipt types, and supported commands.

### `atlas explain project`

```bash
atlas explain project
atlas explain project --json
```

Shows the effective configuration, governed files, package hash, First Agent Loop, and Atlas/external-runtime authority boundary.

### `atlas inspect`

```bash
atlas inspect --json
```

Returns redacted runtime summaries: counts, latest state identifiers, action metadata, outbox state, trace event types, and receipt kinds. It does not return raw customer message text.

### `atlas replay`

```bash
atlas replay --json
atlas replay --input @scenario.json --json
```

Replays the canonical scenario or a supplied simulator scenario in a disposable sandbox. The result contains a deterministic transcript and final state summary.

### `atlas deploy`

```bash
atlas deploy --json
```

For a local v1 project, returns an honest package/deployment-readiness plan. It does not publish packages, mutate cloud infrastructure, connect providers, or claim staging/production proof.

Existing governed-cloud deployment actions remain available only when an approved hosted project contract is explicitly used:

```bash
atlas deploy plan --cloud
atlas deploy apply --cloud
atlas deploy status --cloud
```

### `atlas upgrade`

```bash
atlas upgrade --json
```

Migrates a supported earlier `atlas.config.ts` non-destructively. The command creates a versioned backup, writes the v1 contract atomically, loads the result, and reports the new project hash. Running it again is idempotent.

## Existing governed-cloud commands

The package also preserves the prior project/environment, run, approval, receipt, webhook, MCP, usage, log, and deployment command families. They require the corresponding credential and hosted authority. Local commands do not silently fall through to them.

## Exit behavior

- `0`: command completed and its gate passed;
- `1`: command completed but a test, doctor, validation, or remote gate failed;
- `2`: usage or missing-input error;
- `3`: authentication failure;
- `4`: authorization failure;
- `5`: approval remains pending;
- `6`: conflict or safety refusal;
- `7`: network failure;
- `8`: hosted platform or provider failure;
- `9`: local project state or runtime failure.

Use the error payload as the source of truth because a future compatible release may add a more specific error while preserving the machine contract.
