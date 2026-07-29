# Atlas BMR-002 — Production Agentic Business Messaging Platform

**Programme:** `ATLAS-BMR-002`  
**Package version:** `3.0.0-execution`  
**Date:** `2026-07-29`  
**Status:** `EXECUTION AUTHORITY`


## Start here

This package is the repository authority for Claude Code to **verify, build, integrate, test, deploy, operate, and certify** the complete BMR-002 product from the closed BMR-001 baseline.

Paste `20_CLAUDE_CODE_END_TO_END_EXECUTION_PROMPT.md` into Claude Code from the live Atlas worktree, or start with the root file `CLAUDE_CODE_START_ATLAS_BMR_002.md`.

## Mission

> Turn the certified BMR-001 foundation into Atlas's complete production agentic product: a production-scale, commercially operable, multi-provider, enterprise-governed developer platform in which versioned Agents pursue durable Missions and Atlas safely governs, executes, delivers, observes, bills, and proves business outcomes.

## Programme thesis

`ATLAS-BMR-002` is the programme that turns the BMR-001 foundation into a complete production agentic business-messaging platform.

The product is not only the Agent/Mission loop, and it is not only Cloud infrastructure. It is their governed integration with real providers, enterprise controls, commercial operation, developer experience, ecosystem extension, and Mirai-compatible human control.

Read `02A_COMPLETE_PRODUCT_SCOPE_AND_BUILD_TEST_STRATEGY.md` as the binding correction to any wording that demotes production infrastructure, providers, enterprise governance, billing, or ecosystem work to ancillary scope.

## Complete product lifecycle

```text
organisation / project / environment
→ versioned Agent and bounded durable Mission
→ trigger / observation / approved context
→ typed reasoning Proposal
→ Atlas policy, risk, authority and budget decision
→ approval / handoff / takeover where required
→ transactional Action and durable outbox
→ provider or tool effect
→ callback, delivery and business-state reconciliation
→ usage, cost, audit and outcome receipts
→ quota, billing, support and data-lifecycle controls
→ reviewed learning and next Mission
```

The reasoning runtime may be Atlas-native or external. It may reason and propose. Atlas remains the tenant, policy, approval, credential, durable-state, billing, delivery, usage, cost, audit and receipt authority.

## First-class product planes

1. Agent and Mission product model.
2. Governed durable business execution.
3. Public developer platform and runtime interoperability.
4. Production Atlas Cloud and operations.
5. Provider and channel operations.
6. Enterprise trust and commercial self-serve.
7. Extension ecosystem and Mirai-compatible operator control.

No plane is optional or merely "supporting". Each must be built, operated and proven within its declared maturity envelope.

## Product boundaries

| Boundary | Owns |
| --- | --- |
| **Public Atlas developer kit** | Portable Agent, Mission, Proposal, Action, Receipt, Outcome and extension contracts; CLI; SDK; local runtime/simulator; public adapters; schemas; examples; conformance kits. |
| **Private Atlas Cloud** | Managed control plane; durable Mission coordination; credentials; policy enforcement; committed effects; provider operations; deployments; hosted observability; usage/cost authority; billing enforcement; security and abuse controls. |
| **Mirai** | Team Inbox; Command Center; human operator experience; customer operations; packaged business Agents; vertical workflows; business analytics. |
| **Providers/partners** | Provider network availability, account eligibility, external delivery systems, and partner-operated infrastructure within explicit contracts. |
| **Customer infrastructure** | Customer-owned external reasoning runtimes, gateways, tools and data sources operating through Atlas contracts. |

Atlas does not build a second Mirai operator product. Mirai must not depend on private concepts that have no public Atlas representation.

## Execution shape

| Phase | Product outcome | Gate meaning |
| --- | --- | --- |
| P0 — Certified baseline and execution activation | Verify BMR-001 closure and current repository truth, reconcile drift, install BMR-002 authority, and open an isolated execution lane. | G0 baseline truth |
| P1 — Shared product authority and agentic foundations | Establish Agent/Mission/Proposal/Action/Receipt/Outcome contracts and the first persistent local Mission. | G1 build readiness |
| P2 — Durable agent runtime and business execution | Build resumable governed autonomy, triggers, waits, budgets, approvals, handoff, memory provenance, exactly-once effects and recovery. | G2 build readiness |
| P3 — Developer platform and runtime interoperability | Build coherent CLI/SDK/API journeys for Atlas-native and external runtimes. | G3 build readiness |
| P4 — Production Atlas Cloud product | Build production authorities, topology, capacity, SLOs, scaling, recovery, migration, deployment and incident ownership. | G4 build readiness |
| P5 — Provider and channel product | Build progressive provider readiness, harden Resend, certify another provider lane and operate provider failures truthfully. | G5 build readiness |
| P6 — Enterprise governance and commercial Cloud product | Build tenancy, identity, audit, data lifecycle, usage/cost, quota, billing, lifecycle and support controls. | G6 build readiness |
| P7 — Ecosystem, whole-product integration, deployment and closure | Integrate all planes, deploy the exact candidate to staging, run full-product certification, promote only when authorised, and close from evidence. | G7 integration; G8 staging; G9 production/closure |

P2–P6 are dependency-driven co-equal build streams after the shared contracts stabilise. They are not a value hierarchy and do not have to wait for every lower-numbered stream to finish when their actual dependencies are ready.

## Build and test order

- Run focused tests continuously while building each work item.
- Treat G1–G6 as construction/readiness checks, not release certification.
- Assemble one complete release candidate only after all required product planes are implemented.
- Deploy that exact candidate to staging.
- Run the full outside-in, provider, enterprise, billing, security, load, fault, recovery, rollback, extension and adoption suite.
- Promote to bounded production only after G8 passes and explicit authority is recorded.

The machine authority is `execution-board.v3.json`. It contains **57 work items**. Historical BMR-001 evidence does not pre-pass any BMR-002 item.

## Authority hierarchy

1. Current verified repository, environment, provider and deployment evidence.
2. Explicit founder/user decisions recorded after package installation.
3. BMR-001 closed product constitution and unmodified closure evidence.
4. This BMR-002 constitution, complete-product authority and locked decisions.
5. Current work-item specification, execution board, requirements and gates.
6. Historical planning reports and handover summaries.

A discrepancy with BMR-001 is recorded as a BMR-002 post-closure erratum. It never silently rewrites history.

## Required checkpoint format

Every user-visible progress checkpoint and every execution-log checkpoint uses exactly:

```markdown
## Mission

## Now

## Key insight

## Verdict

## One next action
```

There is exactly one next action.

## Status and evidence vocabularies

Work-item statuses:

```text
NOT_STARTED | READY | DISCOVERY | IN_PROGRESS | BLOCKED_EXTERNAL | BLOCKED_INTERNAL | READY_FOR_REVIEW | PASS | FAIL | ROLLED_BACK | SUPERSEDED
```

Capability maturity:

```text
DOCUMENTED_ONLY | STUBBED | IMPLEMENTED_UNVERIFIED | LOCAL_PROVEN | CI_PROVEN | STAGING_PROVEN | PROVIDER_SANDBOX_PROVEN | LIMITED_PRODUCTION | PRODUCTION_PROVEN
```

Provider readiness:

```text
DECLARED | LOCAL_CONFORMANCE | PROVIDER_SANDBOX_PROVEN | LIMITED_PRODUCTION | PRODUCTION_PROVEN | BLOCKED_PROVIDER | DEPRECATED
```

`PASS`, `STAGING_PROVEN`, `LIMITED_PRODUCTION`, and `PRODUCTION_PROVEN` require evidence from the named environment and exact source/artifact. They cannot be inferred from code existence, documentation, mocks, or old evidence.

## Terminal execution verdicts

```text
ATLAS_BMR_002_EXECUTION_COMPLETE
ATLAS_BMR_002_STAGING_CERTIFIED_PRODUCTION_APPROVAL_REQUIRED
ATLAS_BMR_002_EXECUTION_BLOCKED_EXTERNAL
ATLAS_BMR_002_EXECUTION_FAILED
ATLAS_BMR_002_ROLLED_BACK
```

## Non-goals

BMR-002 does not automatically become a rewrite of Atlas or Mirai, a new Team Inbox, CRM, general workflow platform, generic agent framework, training programme, advertising system, project-management system, full marketplace implementation, global multi-region launch, every-provider launch, or unsupported formal compliance certification.

## Canonical reading order

1. `00_README.md`
2. `01_HANDOVER_BASELINE_AND_PRESERVATION.md`
3. `02_AGENTIC_PRODUCT_CONSTITUTION.md`
4. `02A_COMPLETE_PRODUCT_SCOPE_AND_BUILD_TEST_STRATEGY.md`
5. `03_LOCKED_DECISIONS_AND_DEFAULTS.md`
6. `04_POST_CLOSURE_STOCKTAKE_PROTOCOL.md`
7. `05_CURRENT_AND_TARGET_ARCHITECTURE.md`
8. `14_FLAGSHIP_OUTSIDE_IN_JOURNEYS.md`
9. `15_EXECUTION_PROGRAMME.md`
10. `16_VERIFICATION_EVAL_AND_RELEASE_GATES.md`
11. `17_DEPLOYMENT_PROMOTION_AND_ROLLBACK_RUNBOOK.md`
12. `20_CLAUDE_CODE_END_TO_END_EXECUTION_PROMPT.md`
13. `21_WORKER_DELEGATION_AND_VERIFICATION_PROTOCOL.md`
14. `atlas_bmr002_execution_log.md`
15. `execution-board.v3.json`

Read the mission, current product plane, active work item, exact dependencies, latest log checkpoint, relevant specification and gate. Do not load every large authority into one context window by default.
