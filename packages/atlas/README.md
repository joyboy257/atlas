# `@mirai/atlas`

Atlas is the **Business Messaging Agent Runtime**.

It is the fastest route from an empty folder—or an existing agent—to a governed customer outcome:

```text
customer message
→ approved knowledge
→ governed tool proposal
→ policy
→ approval or human handoff
→ exactly-once committed action
→ provider delivery
→ trace and receipts
```

## First Agent Loop

```bash
npx @mirai/atlas@latest init front-desk
cd front-desk
atlas test
atlas dev
```

The generated local project works without:

- an Atlas account;
- provider credentials;
- cloud deployment;
- a paid model;
- manual `curl` sequences;
- private Mirai knowledge.

Open the workbench URL from `atlas dev`. Send:

> Can I move booking BK-100 to Friday?

Atlas retrieves the approved booking policy, creates a high-risk tool proposal, records a real pending approval, commits the booking change exactly once after approval, places confirmation in the outbox, simulates provider delivery, and exposes the complete trace and receipt chain.

The deterministic model and messaging provider are explicitly local fixtures. Policy, approval, idempotency, committed action, outbox, delivery, trace, replay, and receipts are real local Atlas state.

## Required commands

```bash
atlas init front-desk --json
atlas doctor --json
atlas test --json
atlas capabilities --json
atlas explain project --json
atlas inspect --json
atlas replay --json
atlas deploy --json
atlas upgrade --json
atlas dev --json
```

Every command has stable machine-readable output, deterministic exit behavior, structured errors, and one actionable next step.

## Package contents

```text
bin/                     Atlas CLI
src/ and dist/           CLI, project contract, local runtime, simulator, workbench
schema/                  Atlas project JSON Schema v1
docs/                    version-matched quickstart, contracts, errors, repair, migration
skills/                  coding-agent project, First Agent Loop, and repair skills
examples/front-desk/     runnable governed package
metadata/                source-bound package metadata
```

Machine-readable documentation index:

```text
node_modules/@mirai/atlas/docs/public-docs.manifest.json
```

Start here:

```text
node_modules/@mirai/atlas/docs/QUICKSTART.md
```

## Authority boundary

External runtimes—including Eve, OpenAI Agents SDK, LangGraph, n8n, and custom runtimes—may reason and propose. Atlas owns identity, conversation context, policy, approval, committed business actions, provider delivery, traces, receipts, and outcomes.

A model statement is not an approval. An approval is not a committed action. A committed action is not proof of provider delivery. Atlas records each transition separately.

## Existing governed-cloud surface

The package preserves the existing project/environment, run, approval, receipt, webhook, MCP, usage, log, and deployment command families. Hosted commands require the corresponding credential and authority. The zero-credential local commands never silently invoke the cloud surface.

Use `atlas init --cloud` for the legacy account-first initializer.

## Publication status

> **BLOCKED — HUMAN AUTHORITY REQUIRED**

This repository implementation does not publish the package. Public npm availability, repository extraction, live provider activation, hosted deployment, staging claims, production claims, and commercial release remain blocked pending explicit founder approval and their separate evidence gates.

The package source metadata identifies the artifact as `unpublished_local_artifact` and records its base Git SHA, base tree SHA, working source-content SHA-256, and dirty-state boundary.

## Runtime requirement

Node.js 22 or newer.
