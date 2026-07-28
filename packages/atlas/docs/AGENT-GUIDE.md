# Coding-agent guide

A coding agent should begin with the installed package, not private repository prompts.

Read in this order:

1. `node_modules/@atlas-runner/atlas/docs/QUICKSTART.md`
2. `node_modules/@atlas-runner/atlas/docs/PROJECT-CONTRACT.md`
3. `node_modules/@atlas-runner/atlas/docs/AUTHORITY.md`
4. `node_modules/@atlas-runner/atlas/docs/COMMANDS.md`
5. `node_modules/@atlas-runner/atlas/docs/RUNTIME-PROTOCOL.md`
6. `node_modules/@atlas-runner/atlas/docs/MODEL-ROUTING.md`
7. `node_modules/@atlas-runner/atlas/docs/CHANNEL-FABRIC.md`
8. `node_modules/@atlas-runner/atlas/docs/CHANNEL-READINESS.md`
9. the project's `atlas.config.ts`
10. the generated `AGENTS.md` or `AGENTS.atlas.md`
11. `atlas capabilities --json`
12. `atlas explain project --json`

## First action in an empty folder

```bash
npx @atlas-runner/atlas@latest init front-desk
cd front-desk
atlas doctor --json
atlas test --json
```

When the public package is unavailable, use the provided tarball path exactly as described in `QUICKSTART.md`. Do not publish the package to make a local task easier.

## First action in an existing application

Inspect the directory and Git state. Then use explicit adoption:

```bash
atlas init front-desk --dir . --existing --json
```

Review `.atlas/adoption-report.json`. Do not overwrite a conflicting generated path, remove another package manager's lockfile without evidence, or reset a dirty repository.

## Required architecture

Keep the customer outcome within one governed path:

```text
normalized customer message
→ approved knowledge
→ tool proposal
→ policy
→ approval or handoff
→ Atlas commit with idempotency
→ outbox
→ provider delivery
→ trace and receipts
```

Do not bypass Atlas approval or committed execution.

Do not implement business mutation in:

- model output;
- browser-only state;
- a provider adapter;
- a webhook handler outside Atlas authority;
- an external runtime such as LangGraph, OpenAI Agents SDK, n8n, Eve, or custom orchestration.

External reasoning may propose. Atlas commits.

## Changing configuration

- Use the strict JSON-compatible `defineAtlasProject(...)` form.
- Keep paths project-relative and inside the root.
- Use typed `secretRef(...)` references, never raw credential material.
- Run `atlas doctor --json` after changing the project contract.
- Run `atlas test --json` after changing instructions, tools, policies, knowledge, channels, or evals.
- Record the new `project_hash` when producing evidence.

## Adding a governed tool

A committed business tool must define:

- stable tool identity and version;
- normalized input;
- risk classification;
- policy decision;
- whether approval is required;
- idempotency requirement;
- deterministic action result contract;
- resulting business outcome;
- provider notification behavior;
- trace and receipt expectations.

A proposal must not mutate state. The action must not commit before the required approval reaches a real approved state. Provider-delivery retry must not duplicate the action.

## Adding a runtime adapter

Use `AtlasRuntimeAdapter` and the v1 turn request/proposal contracts. Vendor runtimes may reason and propose only. They must not supply tenant identity, approval, committed execution, provider delivery, billing authority, or receipts. Run runtime protocol and adapter conformance before using the adapter in a project.

## Adding model routing

Use provider-neutral model contracts and tenant/environment-bound model references. Record payer and cost receipts. A BYOK route must not silently fall back to Atlas-managed inference.

## Adding a channel

Use the normalized message and delivery contracts. A channel adapter must not:

- supply tenant authority;
- bypass consent/window policy;
- call committed tools directly;
- write delivery state without a callback/attempt transition;
- invent provider receipts.

Start with the simulator and conformance behavior before connecting credentials or a live provider.

## Testing

Use:

```bash
atlas test --json
atlas replay --json
```

Both commands use disposable runtime state. Add focused package tests for new behavior, then run the complete package test gate.

Required negative cases include:

- duplicate and mismatched idempotency input;
- out-of-order messages;
- consent/window violations;
- approval rejection/interruption;
- human takeover;
- transient and permanent delivery failure;
- callback state regression;
- missing/unsafe project files;
- raw-secret rejection.

Do not weaken assertions to manufacture a pass.

## Debugging

1. Run `atlas doctor --json`.
2. Run `atlas inspect --json` for redacted state.
3. Read `node_modules/@atlas-runner/atlas/docs/ERROR-CATALOG.md`.
4. Follow `node_modules/@atlas-runner/atlas/docs/REPAIR.md`.
5. Preserve `.atlas/runtime-state.json`, scaffold state, adoption report, and backups when they are evidence.

Do not edit receipts, hashes, approval state, action ledgers, or delivery state by hand.

## Completion gate

A local implementation is complete only when:

- `atlas doctor --json` has zero failures;
- `atlas test --json` passes exactly-once and delivery proof;
- `atlas dev` reports `governed_runtime: true`;
- the workbench shows evidence, proposal, policy, approval/handoff, action, delivery, trace, receipts, and one next action;
- `atlas inspect --json` reveals no raw customer text;
- no credential, private repository path, or private Mirai implementation appears in the packed artifact;
- runtime adapters pass proposal-only conformance;
- model routes preserve tenant, environment, payer, budget, and fallback authority;
- every declared channel passes the shared conformance kit and retains an honest readiness label;
- hosted, staging, production, public-package, provider-connected, and live-provider claims remain explicitly separate.
