# Atlas BMR-002 Complete Execution Authority

**Package version:** `3.0.0-execution`

This combined file is a convenience mirror. Individual canonical files remain the authoritative edit surfaces.


---

<!-- BEGIN 00_README.md -->

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


<!-- END 00_README.md -->


---

<!-- BEGIN 01_HANDOVER_BASELINE_AND_PRESERVATION.md -->

# BMR-001 Handover Baseline and Preservation

**Programme:** `ATLAS-BMR-002`  
**Package version:** `3.0.0-execution`  
**Date:** `2026-07-29`  
**Status:** `EXECUTION AUTHORITY`


## Reported baseline—not yet accepted as live truth

```text
Worktree: /Users/deon/Developer/mirai-atlas-bmr001
Expected branch: codex/atlas-bmr-001-p0-audit
Reported commit: 4bf5da957d
Reported tag: atlas-bmr-001-closed
Reported board result: 50/50 PASS across P0–P4
Reported programme: ATLAS-BMR-001
```

Reported evidence includes real Resend email proof, Infisical-backed credentials, P4 self-serve beta material, six-gate release evidence, plaintext-secret remediation, migration contract tests, worker smoke tests, and database migration evidence.

These claims are inputs to `ATLAS-BMR2-P0-001`, not accepted proof.

## Preservation law

BMR-001 is a closed historical programme. Claude Code must not:

- move BMR-002 work into the BMR-001 board;
- edit old PASS claims to fit new requirements;
- mutate or recreate `atlas-bmr-001-closed`;
- rewrite closure commits or checksums;
- rename historical work;
- reset, clean, discard, rebase, or force-push;
- erase limitations, blockers, deferred work, or exact environment claims;
- treat BMR-002 as “P5 of BMR-001.”

A discovered inaccuracy becomes one of:

```text
BMR001_POST_CLOSURE_ERRATUM
BMR001_POST_CLOSURE_REGRESSION
BMR001_EVIDENCE_UNAVAILABLE
BMR001_CLAIM_VERIFIED
```

The record belongs under:

```text
.factory/evidence/atlas-bmr-002/P0/
```

and is referenced from the BMR-002 execution log.

## Exact P0 closure checks

1. Enumerate all worktrees and their branches, HEADs and dirty state.
2. Resolve the reported commit as a complete object and inspect its parents, tree and changed paths.
3. Resolve the tag object and verify its target. Do not recreate it if absent.
4. Compare current HEAD and tree to the closure commit.
5. Read the canonical BMR-001 board and independently count terminal work items.
6. Read the final release decision and all gate verdicts.
7. Verify checksum manifests against actual files.
8. Identify generated registries and whether they match source authorities.
9. Inspect public/private package boundaries, package publication state, Atlas Cloud deployment state, provider proof, database/worker proof, staging/production proof and unresolved limitations.
10. Record exact commands, outputs, timestamps, paths and environment identity.

## Worktree rule

Do not create a new implementation branch until current worktrees and concurrent work are understood. When an isolated BMR-002 lane is needed:

- branch from the verified certified baseline or its reviewed post-closure descendant;
- use a descriptive BMR-002 branch;
- never overwrite a dirty worktree;
- record the branch point and worktree path in `atlas_bmr002_execution_log.md`;
- do not push, merge, tag, publish, or change visibility without explicit authority.

## Source drift

Every source change after the closure tag is classified:

| Class | Meaning | BMR-002 action |
| --- | --- | --- |
| Preserved BMR-001 fix | Compatible maintenance after closure | Adopt only after tests and provenance review. |
| Adjacent programme work | Owned elsewhere | Record dependency/interface; do not absorb. |
| BMR-002 prerequisite | Needed for this programme | Bring into the isolated execution lane deliberately. |
| Regression | Breaks certified behavior | Record post-closure regression and repair before relying on it. |
| Unknown | Ownership/evidence unclear | Quarantine from claims until resolved. |

## Minimum verified stocktake output

The P0 evidence bundle must state:

- exact closure and current Git state;
- exact delivered capabilities and maturity;
- public and private package state;
- developer journey and package publication state;
- provider account, environment and evidence scope;
- database/queue/worker/deployment state;
- staging and production claims;
- external blockers;
- operational, technical, commercial and ecosystem debt;
- adjacent programme owners;
- whether this package’s execution thesis remains coherent.

No user reconstruction is required.


<!-- END 01_HANDOVER_BASELINE_AND_PRESERVATION.md -->


---

<!-- BEGIN 02_AGENTIC_PRODUCT_CONSTITUTION.md -->

# Agentic Product Constitution

**Programme:** `ATLAS-BMR-002`  
**Package version:** `3.0.0-execution`  
**Date:** `2026-07-29`  
**Status:** `EXECUTION AUTHORITY`


## Article 1 — Category

Atlas is the **Business Messaging Agent Runtime**.

BMR-002 makes that category operational as a complete production product: persistent governed Agents and Missions, durable business execution, public developer surfaces, production Atlas Cloud, provider operations, enterprise trust, commercial controls and an extension ecosystem. Atlas is not a generic chatbot, prompt router, workflow canvas, CRM, provider aggregator, or model SDK.

## Article 2 — The unit of product value

The unit of product value is a **governed business outcome completed by a durable Mission**.

A model response is an observation or proposal. It is not an outcome.

## Article 3 — Agent

An Agent is a versioned deployable product definition containing:

- instructions and declared capabilities;
- approved knowledge and memory bindings;
- tools and business actions;
- channel/provider capability requirements;
- trigger and Mission-type declarations;
- policy and autonomy defaults;
- time, step, token and spend budgets;
- outcome definitions and evals;
- compatibility and source provenance.

A deployed Agent has immutable version identity. New behavior creates a new version.

## Article 4 — Mission

A Mission is a durable, tenant-scoped attempt to achieve one bounded business goal.

It survives process restarts, delayed provider callbacks, human takeover, approval waits, rate limits, model/provider failures, deployment changes and session boundaries. It has explicit state, deadline, budget, causation, actor, current wait, terminal disposition and outcome evidence.

Conversation is context. Mission is goal-directed execution. One conversation may contain several Missions; one Mission may span conversations or channels only through explicit identity and policy.

## Article 5 — Agentic loop

The canonical loop is:

```text
observe
→ assemble scoped context
→ reason through a runtime adapter
→ produce typed Proposal
→ evaluate policy, risk, budget and authority
→ request approval or handoff when required
→ commit typed Action transactionally
→ execute effect from durable outbox
→ reconcile provider/tool observation
→ update Mission state
→ wait, continue, complete, fail, expire, cancel or escalate
```

The loop is event-driven and durable. It is not an in-memory `while` loop.

## Article 6 — Authority

Reasoning runtimes may:

- interpret permitted context;
- reason;
- draft messages;
- propose tools and business actions;
- propose next waits or sub-Missions;
- request human control;
- propose learning.

They may not:

- self-approve;
- choose another tenant or environment;
- grant themselves scope, tools, autonomy or budget;
- directly invoke provider sends or committed business actions;
- access raw provider credentials;
- mutate durable state outside Atlas;
- fabricate commit, delivery, usage, cost, audit or outcome receipts;
- promote learning into durable authority without configured review.

## Article 7 — Autonomy

Autonomy is action-specific:

| Level | Meaning |
| --- | --- |
| L0 | Observe only. |
| L1 | Propose; no effect. |
| L2 | Execute after explicit human approval. |
| L3 | Execute within server-enforced policy and budget. |
| L4 | Proactively initiate bounded Missions/actions under server-enforced trigger, scope, budget and stop rules. |
| L5 | Unrestricted autonomy—**forbidden**. |

An Agent package may request less autonomy. It cannot grant more than the server policy.

## Article 8 — Human control

Approval, handoff, takeover, return-to-agent, pause and cancel are durable state transitions with actor, scope, expiry, rationale and audit. Mirai owns the operator experience. Atlas owns the portable control contract and canonical transition.

## Article 9 — Actions and effects

A business action has typed intent, validated arguments, policy decision, idempotency scope, transaction record, outbox record and receipts. Provider delivery is an effect of a committed action—not proof that the business outcome succeeded.

Compensation is a new explicit business action. It is not deletion of history.

## Article 10 — Memory and learning

Atlas distinguishes:

- immutable source knowledge;
- retrieved context;
- ephemeral Mission observations;
- durable customer/business memory;
- policy/configuration;
- Learning Proposals.

Every durable item carries tenant, source, version, provenance, retention and review state. Model/provider/customer content cannot silently rewrite policy or shared knowledge.

## Article 11 — Composition and delegation

An Agent may propose a child Mission or specialist Agent only through Atlas. Atlas derives tenant/environment, verifies capability, reserves budget, establishes parent/child causation and applies the same policy, approval, idempotency, audit and receipt rules.

Delegation never transfers raw credentials or expands authority.

## Article 12 — Reliability

A Mission’s canonical state is reconstructable from durable authorities. Crashes, retries and duplicate events must not create duplicate committed effects or false completion. Unknown outcomes are represented as unknown and reconciled.

## Article 13 — Observability and receipts

Every meaningful operation carries correlation and causation through traces, logs, metrics and durable receipts. Telemetry helps operators observe; it does not replace the business-state authority.

## Article 14 — Local-to-cloud continuity

The zero-credential local experience remains a release gate. Local and Cloud implement the same portable contracts, while Cloud supplies managed persistence, credentials, deployments, provider operations, observability, billing and security.

## Article 15 — Truthful maturity

Atlas distinguishes documented, stubbed, implemented, local, CI, staging, provider sandbox, limited-production and production proof. A capability is never promoted from a mock, file path, screenshot, old run, or configured-but-unused resource.

## Article 16 — Anti-renaming rule

The following do not satisfy BMR-002 unless the full constitution is met:

- renaming `run`, `job`, `session`, `thread` or `workflow` to `Mission`;
- wrapping a chat completion in a queue;
- adding a scheduler that sends prompts;
- storing transcript history and calling it memory;
- exposing a provider adapter and calling it an Agent;
- logging model tokens and calling it an outcome;
- adding a “human approval” boolean controlled by the model;
- shipping a dashboard without durable control semantics.


## Article 17 — Complete product, no false separation

The Agent and Mission lifecycle is the product's agency model, but it is not the whole product. Production Atlas Cloud, provider/channel operations, enterprise governance, usage/cost/billing, developer experience, ecosystem extension and Mirai-compatible human control are first-class Atlas product planes.

BMR-002 fails if it ships either of these incomplete outcomes:

- a durable Agent runtime that cannot be operated, governed, connected, sold, supported or recovered for real customers;
- a scalable Cloud/provider/billing platform that lacks durable governed agency and evidence-backed business outcomes.

## Article 18 — Build and test order

Every primitive is tested while it is built. Workstream readiness checks prevent compounding defects, but they are not release claims.

The complete product is certified only after all required product planes are integrated into one exact candidate, deployed to staging, and exercised through the whole-product outside-in, provider, billing, enterprise, security, load, fault, recovery, adoption and rollback matrix.

## Article 19 — Release semantics

G1–G6 mean a product plane is ready to integrate. G7 means the complete product candidate exists. G8 means that exact candidate is independently staging-proven. G9 governs explicitly authorised bounded production and programme closure.


<!-- END 02_AGENTIC_PRODUCT_CONSTITUTION.md -->


---

<!-- BEGIN 02A_COMPLETE_PRODUCT_SCOPE_AND_BUILD_TEST_STRATEGY.md -->

# Complete Product Scope and Build/Test Strategy

**Programme:** `ATLAS-BMR-002`  
**Package version:** `3.0.0-execution`  
**Date:** `2026-07-29`  
**Status:** `EXECUTION AUTHORITY`


## Binding correction

BMR-002 does not separate a supposedly "real agentic product" from production infrastructure, provider operations, enterprise controls, billing, or the extension ecosystem.

Those are all first-class parts of the Atlas product:

```text
Agent and Mission product model
× governed durable execution
× developer platform and interoperability
× production Atlas Cloud
× provider and channel operations
× enterprise trust and operator control
× commercial self-serve, usage, cost and billing
× extension and solution ecosystem
= Atlas as a production agentic product
```

An Agent/Mission runtime without Cloud, providers, governance, commercial controls, and operations is a prototype. Cloud, providers, governance, and billing without durable governed Agents are infrastructure. BMR-002 must build and integrate both sides.

## First-class product planes

| Product plane | Product value | Primary owner |
| --- | --- | --- |
| Agent and Mission plane | Versioned Agents pursue bounded durable Missions and produce evidence-backed outcomes. | Public Atlas contracts + Atlas runtime |
| Governed execution plane | Policy, approvals, handoff, action commit, outbox, idempotency, receipts, memory provenance and recovery. | Atlas runtime + Atlas Cloud |
| Developer plane | CLI, SDK, APIs, local simulator, Atlas-native and external-runtime interoperability. | Public Atlas developer kit |
| Reach plane | Provider onboarding, credentials, webhooks, consent, templates, media, delivery, reconciliation, outage and readiness states. | Atlas Cloud provider operations + providers |
| Operations plane | Durable database/queue/workers, scale, backpressure, SLOs, observability, deployment, migration, backup, restore, DR and incident response. | Private Atlas Cloud |
| Trust plane | Organisation/environment governance, identity, RBAC, SSO assessment, audit, retention, deletion, encryption, isolation and abuse response. | Atlas Cloud; Mirai consumes public control contracts |
| Commercial plane | Signup, sandbox, deployment, usage/cost truth, quotas, spend, billing settlement, lifecycle and support. | Atlas Cloud commercial control plane |
| Ecosystem plane | Extension contracts, conformance, adapters, solution packs, contribution, compatibility and security review. | Public Atlas kit + governed registry/partner process |
| Operator plane | Human approval, handoff, takeover and customer operations. | Mirai UX over public Atlas control contracts |

No plane is described as optional "supporting infrastructure". Each must have an owner, interface, evidence, operating model, rollback and release disposition.

## Execution topology

P0 verifies the baseline. P1 establishes the shared authority contracts that prevent duplicate systems.

After their exact dependencies are satisfied, P2 through P6 are **co-equal product build streams**. Phase numbers organise ownership and evidence; they do not imply that Cloud, providers, enterprise governance, or billing are less central than the Agent runtime.

```text
P0 truth and preservation
       ↓
P1 shared contracts and authority boundaries
       ↓
┌──────────────┬──────────────┬──────────────┬──────────────┬──────────────┐
│ P2 runtime   │ P3 developer │ P4 Cloud     │ P5 providers │ P6 trust +  │
│ and actions  │ product      │ product      │ product      │ commercial  │
└──────────────┴──────────────┴──────────────┴──────────────┴──────────────┘
       ↓ all required build-stream outcomes integrated
P7 complete release candidate → staging → whole-product certification → authorised production
```

The principal Claude Code session may overlap dependency-ready work across P2–P6, but it remains the single architecture and integration authority.

## Testing order

The correct rule is **not** "write the entire product without tests and test only at the end."

The binding strategy has three levels:

1. **Continuous construction tests:** schema, unit, property, integration, migration, security and focused fault tests run while each work item is built. A broken primitive must not be allowed to contaminate five later systems.
2. **Build-stream readiness checks:** G1–G6 verify that each product plane is coherent enough to integrate. These checks are not Atlas release certification and cannot produce a production claim.
3. **Whole-product certification after build:** once all required product planes are assembled into one exact release candidate, deploy that candidate to staging and run the full outside-in, provider, billing, enterprise, security, load, failure, recovery, adoption and rollback matrix. Only G8/G9 can support a staging or production verdict.

Therefore:

```text
build each plane + test its primitives continuously
→ integrate the complete product
→ deploy the exact integrated candidate to staging
→ test the complete product end to end
→ repair and redeploy until the whole-product suite passes
→ obtain explicit production authority
→ canary and bounded production operations
→ final evidence-backed certification
```

## Whole-product staging path

The final staging certification must exercise one causally connected path, not a set of disconnected demos:

```text
signup
→ organisation / project / environment
→ local or hosted Agent project
→ Agent version and deployment
→ provider connection and readiness
→ customer identity and conversation
→ trigger and durable Mission
→ approved knowledge and scoped context
→ typed Proposal
→ policy / risk / budget decision
→ approval or handoff
→ transactional Action and outbox
→ provider/tool effect
→ webhook/callback authenticity and reconciliation
→ delivery, usage, cost, audit and outcome receipts
→ quota and spend enforcement
→ billing test settlement and lifecycle communication
→ audit export and data-lifecycle control
→ failure, recovery and rollback
```

The same candidate must also prove Atlas-native reasoning, one external-runtime integration, one independent extension, and Mirai-compatible human-control contracts without creating a duplicate operator product.

## Readiness semantics

- G1–G6: product-plane build readiness only.
- G7: all planes integrated into one complete candidate.
- G8: complete candidate independently certified on staging.
- G9: explicitly authorised bounded production and final closure.

A phase-level green test never means "Atlas is done." Atlas is ready only when the integrated product passes the final environment-bound gates.


<!-- END 02A_COMPLETE_PRODUCT_SCOPE_AND_BUILD_TEST_STRATEGY.md -->


---

<!-- BEGIN 03_LOCKED_DECISIONS_AND_DEFAULTS.md -->

# Locked Decisions and Execution Defaults

**Programme:** `ATLAS-BMR-002`  
**Package version:** `3.0.0-execution`  
**Date:** `2026-07-29`  
**Status:** `EXECUTION AUTHORITY`


## Decision posture

Claude Code does not stop the entire programme for choices that can be resolved safely from repository evidence, primary documentation, measured cost, and the defaults below. It records the decision, assumptions, falsifiers and reversible path.

Only external access, irreversible release actions, legal/commercial commitments, and genuine product choices with materially different consequences remain user decisions.

| ID | Decision | Default | Status |
| --- | --- | --- | --- |
| BMR2-FD-001 | BMR-002 primary product thesis | Production Agentic Business Messaging Platform | LOCKED_BY_USER_DIRECTION |
| BMR2-FD-002 | Execution behavior | Claude Code executes P0–P7 end to end and does not return another planning package | LOCKED_BY_USER_DIRECTION |
| BMR2-FD-003 | Main/worker responsibility | Main agent owns architecture and implementation; workers verify, test, review and commit bounded slices only | LOCKED_BY_USER_DIRECTION |
| BMR2-FD-004 | Product-plane status | Agent runtime, Cloud, providers, enterprise governance, billing and ecosystem are co-equal first-class product planes | LOCKED_BY_USER_DIRECTION |
| BMR2-FD-005 | Test order | Test continuously during construction; certify the whole integrated product after build on staging | LOCKED_BY_USER_DIRECTION |
| BMR2-FD-006 | Initial cloud topology | Single primary region with explicit failure boundary; no automatic global multi-region promise | DEFAULT_REVIEW_AT_P0 |
| BMR2-FD-007 | Second provider lane | Score at least three candidates; Twilio SMS is recommendation, not a pre-approved fact | DECIDE_AT_P5 |
| BMR2-FD-008 | Autonomy | Action-specific L0–L4; unrestricted L5 forbidden | LOCKED_SAFETY_DEFAULT |
| BMR2-FD-009 | Learning | Reviewed LearningProposal; no autonomous mutation of durable policy/knowledge | LOCKED_SAFETY_DEFAULT |
| BMR2-FD-010 | Marketplace | Build extension contracts/certification first; marketplace remains decision-gated | LOCKED_SCOPE_DEFAULT |
| BMR2-FD-011 | Pricing | Use versioned illustrative GBP scenarios only; no final price until cost/adoption evidence | LOCKED_SCOPE_DEFAULT |
| BMR2-FD-012 | Production promotion | Deploy the integrated candidate to staging when access permits; limited production requires explicit user/founder authority | LOCKED_GIT_AND_DEPLOYMENT_RULE |

## Defaults that keep execution moving

1. **Complete product:** agency, durable execution, developer product, Cloud, providers, trust, commercial controls, ecosystem and Mirai-compatible operator control.
2. **Workstream topology:** after shared contracts, execute dependency-ready P2–P6 work without treating phase number as product importance.
3. **Testing:** focused tests during construction; full-product certification after integration and staging deployment.
4. **Initial production shape:** one primary region with explicit backup/recovery and no global claim.
5. **Provider wave:** harden Resend; score at least three candidates for one second provider; do not predeclare sixteen channels.
6. **Operator surface:** use Mirai through public Atlas control contracts; do not build a duplicate Inbox/Command Center.
7. **Commercial model:** instrument usage/cost first, test provisional plan/metric scenarios, and delay final pricing.
8. **Ecosystem:** contracts, conformance and one independent extension before marketplace work.
9. **Git/deployment:** commits on an isolated branch may proceed under repository rules; push, merge, public publish, tag and production promotion require explicit authority.
10. **External blockers:** block only the affected lane and continue every dependency-independent product plane.

## Decisions that must be evidence-bound during execution

### Region and topology

P0/P4 may amend the single-region default only when current infrastructure, customer demand, residency requirements, recovery objectives or cost evidence justify it. "Multi-region sounds enterprise" is not evidence.

### Second provider

The scorecard must include demand, eligible account access, geographic fit, send/receive needs, consent/template rules, webhook authenticity, media, rate limits, delivery callbacks, cost, support burden, version drift and deprecation risk.

### Enterprise standards

OIDC/SSO is likely relevant. SCIM, customer-managed keys, residency variants and formal certifications require customer/business justification. Control implementation, organisational process and external audit are separate maturity states.

### Pricing

Illustrative scenarios use pounds sterling unless existing Atlas pricing establishes another currency. No scenario becomes a public promise until cost attribution, value metric, gaming resistance, customer comprehension, billing reconciliation and support economics are evidenced.

## Decision record template

```markdown
# <decision ID and title>

- Date:
- Work item:
- Decision owner:
- Repository/environment evidence:
- Primary-source evidence:
- Options:
- Selected option:
- Why:
- Assumptions:
- Falsifiers:
- Reversible path:
- Follow-up gate:
```


<!-- END 03_LOCKED_DECISIONS_AND_DEFAULTS.md -->


---

<!-- BEGIN 04_POST_CLOSURE_STOCKTAKE_PROTOCOL.md -->

# Post-Closure Stocktake Protocol

**Programme:** `ATLAS-BMR-002`  
**Package version:** `3.0.0-execution`  
**Date:** `2026-07-29`  
**Status:** `EXECUTION AUTHORITY`


## Purpose

P0 converts a reported handover into current repository truth. It is a bounded audit that directly opens execution; it must not become a multi-week restatement of old planning.

## Stocktake domains

### Git and provenance

Capture branch, HEAD, worktree list, dirty/untracked files, closure commit/tag objects, tag target, current diff from closure, relevant post-tag commits, package lockfiles, generated artifacts and release provenance.

### Programme closure

Read the canonical BMR-001 execution board, execution log, release decisions, gate evidence, checksums, independent reviews and unresolved limitations. Recalculate counts. Record stale, missing or contradictory evidence.

### Public Atlas

Inventory package names, package versions, publication state, CLI, SDK, schemas, examples, local runtime, simulator, runtime adapters, model routes, channel adapters, conformance kits, documentation, licence, release automation and extraction boundary.

### Private Atlas Cloud

Inventory control-plane services, identity, credentials, deployments, database, queue, workers, durable execution, provider operations, observability, usage/cost, billing, security, abuse controls, staging resources and production resources.

### Mirai

Map Team Inbox, Command Center, packaged Agents, customer identity, conversation, approval/handoff and analytics interfaces. Identify duplicate authority, but do not absorb Mirai product work.

### Environment proof

For each claim, record:

```text
claim
source commit
artifact digest
configuration version
environment
account/provider
region
test command or outside-in journey
timestamp
result
evidence path
limitations
```

### Residual risk probes

Search specifically for:

- in-memory/memory-backed production authorities;
- test fixtures imported by runtime code;
- environment fallbacks that silently downgrade durability;
- provider-specific assumptions in common contracts;
- unsafe credential or plaintext-secret paths;
- missing transactional boundaries;
- worker race/retry gaps;
- absent recovery/reconciliation;
- stale generated registries;
- package publication drift;
- manual deployment/release steps;
- unowned alerts/incidents/support;
- incomplete billing settlement;
- unsupported provider eligibility;
- no independent human/coding-agent adoption;
- Atlas/Mirai duplicate writes;
- licence/legal blockers.

## Maturity reclassification

Use the strictest supported state:

| State | Minimum evidence |
| --- | --- |
| DOCUMENTED_ONLY | Requirement/spec exists. |
| STUBBED | Surface exists but cannot complete the behavior. |
| IMPLEMENTED_UNVERIFIED | Source appears complete; current tests/evidence not reproduced. |
| LOCAL_PROVEN | Outside-in local behavior reproduced. |
| CI_PROVEN | Current CI or equivalent clean-room test evidence. |
| STAGING_PROVEN | Exact candidate and real staging dependencies exercised. |
| PROVIDER_SANDBOX_PROVEN | Exact provider account/environment sandbox evidence. |
| LIMITED_PRODUCTION | Bounded authorised live customers/traffic and support envelope. |
| PRODUCTION_PROVEN | Sustained measured production envelope with current reliability/incident evidence. |

## P0 outputs

- closure verification or erratum;
- current product inventory;
- current capability-maturity registry;
- source drift classification;
- adjacent ownership map;
- BMR-002 thesis decision;
- installed/validated package;
- active branch/worktree record;
- first executable P1 slice.

## P0 time discipline

Do not repeatedly re-audit facts already proven in the same P0 evidence bundle. P0 ends when G0 is falsifiably evaluated, not when every future technical detail is known.


<!-- END 04_POST_CLOSURE_STOCKTAKE_PROTOCOL.md -->


---

<!-- BEGIN 05_CURRENT_AND_TARGET_ARCHITECTURE.md -->

# Current and Target Architecture

**Programme:** `ATLAS-BMR-002`  
**Package version:** `3.0.0-execution`  
**Date:** `2026-07-29`  
**Status:** `EXECUTION AUTHORITY`


## Current architecture rule

P0 must replace assumptions in this section with a source-bound current-state diagram. Until then, this document defines ownership and target interfaces, not implementation truth.

## Target lifecycle

```text
Customer/provider/business/schedule event
             │
             ▼
      Atlas ingress + authenticity
             │
             ▼
 server-derived tenant, project, environment
             │
             ▼
 identity + conversation + Mission correlation
             │
             ▼
 durable Mission event + coordinator lease
             │
             ▼
 scoped knowledge/memory + policy/tool catalogue
             │
             ▼
 Atlas-native or external reasoning adapter
             │
             ▼
 typed Proposal ── no direct effect authority
             │
             ▼
 policy + risk + budget + approval/handoff decision
             │
             ▼
 transactional Action + durable outbox
             │
             ▼
 provider/tool worker with private credential access
             │
             ▼
 callback/reconciliation + durable receipts
             │
             ▼
 Mission continues, waits, completes, fails or escalates
             │
             ▼
 Mirai/operator views + customer/business outcome
```

## Component ownership

| Component | Public Atlas | Private Atlas Cloud | Mirai | Provider/customer |
| --- | --- | --- | --- | --- |
| AgentPackage/Mission schemas | Canonical | Implements/persists | Renders/uses | May generate/use |
| Local coordinator/simulator | Reference implementation | Managed coordinator | No | May run locally |
| Runtime proposal adapters | Public contracts/adapters | Managed execution | No | External runtime |
| Tenant/environment authority | Representation only | Canonical | Consumes | Cannot choose arbitrarily |
| Customer/conversation identity | Portable IDs/contracts | Canonical resolution/persistence | Operator view | Provider/customer identifiers |
| Knowledge/memory interfaces | Portable | Managed stores/enforcement | Curation UX/workflows | Customer data sources |
| Policy/autonomy/approval | Portable policy/control contracts | Canonical enforcement | Operator control UX | Customer policies |
| Action/idempotency/outbox | Portable contracts/conformance | Canonical commit/execution | Displays/control | Tool/provider effect |
| Credentials | No raw production credentials | Canonical secret lifecycle | Connection UX only | Customer/provider owns source account |
| Provider delivery | Adapter contracts/simulator | Managed provider operations | Operator visibility | Provider network |
| Observability | Trace conventions/local inspect | Hosted telemetry + durable receipt links | Operations views | External traces where integrated |
| Usage/cost/billing | Usage contracts/local estimate | Canonical ledger/enforcement/settlement | Customer/operator visibility | Billing/provider invoices |
| Human inbox/command center | Control contracts only | Control APIs | Canonical UX | Human operators |
| Vertical business Agent | Template/pack contract | Runs/deploys | Packages/operates | Partner/customer pack |
| Extension registry | Manifest/conformance | Managed catalogue/security policy | Discovery/use | Community/partner extension |

## Core durable authorities

Private Atlas Cloud must have exactly one writable authority for:

- organisation, project, environment and machine identity;
- customer and conversation identity;
- Agent deployment/version;
- Mission state and lifecycle events;
- policy/decision and approval/handoff;
- Action and idempotency;
- outbox, provider/tool execution and reconciliation;
- commit/delivery/usage/cost/audit/outcome receipts;
- usage/cost and quota enforcement;
- credential metadata and provider connection;
- release/deployment state.

Caches, indexes, telemetry and Mirai projections are derived. They cannot become competing authorities.

## Public/private test

A concept belongs in the public contract when external developers, runtimes, Mirai or partners must exchange or reason about it portably.

An implementation belongs in private Cloud when it contains managed persistence, customer secrets, operational topology, abuse controls, billing enforcement, provider account operations or proprietary control-plane logic.

Mirai may depend on public Agent/Mission/control/receipt representations. It may not require direct access to private Cloud tables or undocumented internal state.

## Failure domains

At minimum separate:

- ingress/authenticity;
- Mission coordination;
- inference/runtime adapters;
- action commit;
- provider/tool execution;
- callback/reconciliation;
- usage/cost processing;
- operator/control plane;
- observability.

A failure in one domain must not silently corrupt another or fabricate completion.

## Target deployment posture

BMR-002 defaults to one production-shaped primary region:

- managed durable database with tested backup/restore;
- durable queue or equivalent work transport;
- partitioned coordinator/action/provider worker pools;
- private credential/KMS/secret service;
- artifact provenance and staged promotion;
- hosted telemetry with redaction;
- externally reachable authenticated ingress;
- support, status and incident runbooks;
- recovery path into an isolated target.

Multi-region active/active is out of scope unless P0/P4 evidence proves it is the smallest correct response to customer or regulatory demand.


<!-- END 05_CURRENT_AND_TARGET_ARCHITECTURE.md -->


---

<!-- BEGIN 06_AGENT_MISSION_AND_LEARNING_CONTRACT.md -->

# Agent, Mission, Action, Outcome and Learning Contract

**Programme:** `ATLAS-BMR-002`  
**Package version:** `3.0.0-execution`  
**Date:** `2026-07-29`  
**Status:** `EXECUTION AUTHORITY`


## Contract family

All contracts are versioned, schema-published, generated into supported SDKs and usable by Atlas-native, external runtimes and Mirai without private table knowledge.

## AgentPackage

Minimum fields:

```yaml
apiVersion: atlas.mirai.dev/v2
kind: AgentPackage
metadata:
  name: front-desk
  version: 2.0.0
spec:
  missionTypes: [...]
  instructions: ...
  knowledgeBindings: [...]
  memoryPolicy: ...
  tools: [...]
  actionPolicies: [...]
  triggers: [...]
  channelRequirements: [...]
  runtime: ...
  budgets: ...
  outcomeDefinitions: [...]
  evals: [...]
  compatibility: ...
```

The source digest and deployment configuration produce immutable `agent_version_id`.

## Mission

Required identity and boundaries:

- `mission_id`;
- `tenant_id`, `project_id`, `environment_id`—server-derived;
- `agent_id`, `agent_version_id`;
- `mission_type`;
- parent/child Mission causation when delegated;
- customer, conversation and subject references;
- bounded goal and success/failure outcome definitions;
- allowed tools/actions/channels;
- autonomy/risk/budget policy references;
- deadline and stop conditions;
- current state, state version and active wait;
- correlation/trace identifiers;
- created/updated/terminal timestamps.

### Canonical states

```text
CREATED
READY
ACTIVE
WAITING_EVENT
WAITING_SCHEDULE
WAITING_APPROVAL
HANDED_OFF
PAUSED
COMPLETING
COMPLETED
FAILED
CANCELLED
EXPIRED
```

State transitions are validated server-side and append lifecycle events.

## Observation and context

An Observation references a source event, provider callback, tool result, human command, schedule or system condition. It records authenticity, deduplication identity, provenance, content classification and correlation.

Context assembly returns bounded references, not unrestricted database access. It records which knowledge/memory versions were used for the reasoning step.

## Proposal

A Proposal contains:

- runtime and model/adapter identity;
- input context references and hashes;
- proposed message, action, wait, handoff, child Mission or completion;
- structured arguments;
- confidence/uncertainty where supplied;
- cited knowledge/provenance;
- expected outcome and risk hints;
- token/usage metadata;
- no approval, commit or provider receipt authority.

Malformed or policy-incompatible proposals are rejected as typed events.

## Decision

Atlas records:

- policy version;
- action/risk class;
- autonomy level;
- budget reservation;
- allow, deny, require approval, require handoff, modify, defer or fail;
- explanation and machine-readable reason codes;
- required actor/scope/expiry;
- evidence references.

## Action and outbox

Action identity binds tenant, environment, Mission, step, action type, normalized arguments and idempotency key. The action and outbox entry commit transactionally. Conflicting reuse of an idempotency key is rejected.

Workers claim outbox entries through leases, execute only authorised typed effects, redact credentials, and reconcile provider/tool results.

## Receipts

Separate receipt types:

| Receipt | Proves |
| --- | --- |
| Commit receipt | Atlas durably committed an Action. |
| Tool receipt | A tool invocation returned a recorded result/state. |
| Provider receipt | Provider accepted/rejected/updated an effect. |
| Delivery receipt | Provider-reported delivery state; not necessarily human consumption. |
| Usage receipt | Attributable model/runtime/tool/provider/storage work. |
| Cost receipt | Estimated or settled cost with source and currency. |
| Audit receipt | Actor, policy, transition and evidence chain. |
| Outcome receipt | Business success/failure/unknown based on defined evidence. |

Receipts are immutable or append-only revisions with supersession links. An unknown provider/business state remains `UNKNOWN_PENDING_RECONCILIATION`.

## Outcome

An outcome definition names:

- business metric or committed state;
- evidence source;
- attribution rule;
- success, failure and unknown conditions;
- evaluation window;
- human confirmation requirement where applicable.

A delivered message is not automatically a booked appointment, resolved case, collected payment or satisfied customer.

## Memory

Memory classes:

```text
EPHEMERAL_STEP
MISSION_SCOPED
CUSTOMER_SCOPED
BUSINESS_SCOPED
POLICY_OR_CONFIGURATION
```

Each entry has source, extractor/runtime, confidence, scope, retention, encryption class, review status, supersession and deletion lineage.

## LearningProposal

A LearningProposal describes candidate knowledge, memory, tool, instruction or policy change and includes:

- originating Missions/outcomes;
- supporting and contradicting evidence;
- affected scope;
- safety/privacy classification;
- proposed change;
- evaluation;
- reviewer;
- status: PROPOSED, ACCEPTED, REJECTED, EXPIRED, REVERTED.

Runtime execution cannot accept its own LearningProposal unless an explicit safe automated-review policy exists and is independently certified. BMR-002 defaults to human or separate governed review.

## Sub-Mission delegation

A proposed child Mission is accepted only after Atlas:

1. resolves the specialist Agent/version;
2. derives the same tenant/environment;
3. verifies capability and data scopes;
4. allocates child budget from the parent or separate authorised budget;
5. records parent/child causation;
6. applies normal policy, approval, action and receipt rules;
7. defines how the child outcome joins the parent.

No Agent can spawn unbounded recursive work.


<!-- END 06_AGENT_MISSION_AND_LEARNING_CONTRACT.md -->


---

<!-- BEGIN 07_DURABLE_AGENT_RUNTIME_SPEC.md -->

# Durable Agent Runtime Specification

**Programme:** `ATLAS-BMR-002`  
**Package version:** `3.0.0-execution`  
**Date:** `2026-07-29`  
**Status:** `EXECUTION AUTHORITY`


## Runtime objective

Execute many persistent Missions safely across asynchronous events and failures while ensuring that reasoning is replaceable and Atlas authority is not.

## Coordinator model

A coordinator advances one Mission through one validated transition at a time.

Each advancement:

1. loads the canonical state/version;
2. acquires or confirms a time-bounded lease;
3. consumes one or more deduplicated Observations;
4. assembles scoped context;
5. invokes a reasoning adapter when needed;
6. validates Proposal shape and capability;
7. evaluates policy, risk and budget;
8. records a Decision and next durable state;
9. commits an Action/outbox or wait atomically where applicable;
10. emits durable events and telemetry references;
11. releases/renews the lease.

Optimistic concurrency or equivalent must reject stale transitions.

## Event and wait model

Supported wake-up sources include:

- inbound channel event;
- provider delivery/status callback;
- tool/business-system callback;
- approval/handoff/operator command;
- scheduled time;
- deadline/timeout;
- child Mission outcome;
- deployment/configuration event where safe.

A wait stores event criteria, deadline, deduplication/reconciliation policy and cancellation behavior. Polling is permitted only through a bounded durable schedule.

## Failure semantics

| Failure | Required state |
| --- | --- |
| Reasoning timeout/malformed response | Retry within budget, fallback, handoff or explicit failure. |
| Policy unavailable | Fail closed; no effect. |
| Database commit unknown | Reconcile before retry. |
| Outbox worker crash | Lease expires; retry idempotently. |
| Provider accepted but callback missing | Pending/unknown plus reconciliation. |
| Provider rejected | Delivery/action failure with policy-defined next step. |
| Human approval expires | Deny, handoff, fail or re-propose by policy. |
| Budget exhausted | Pause/handoff/fail; never silently overspend. |
| Deployment during wait | Resume against compatible contract/version. |
| Cancel during effect | Record committed/in-flight reality; compensate only explicitly. |

## Exactly-once claim discipline

Atlas may promise exactly-once **logical committed Action identity** when database constraints and idempotency support it. It must not claim physical exactly-once provider delivery where the provider does not support it.

The system instead proves:

- one canonical Action;
- one idempotency identity;
- durable outbox attempts;
- provider idempotency where available;
- deduplicated callbacks;
- reconciliation;
- truthful unknown/duplicate states.

## Budgets

Budget dimensions may include:

- wall-clock deadline;
- active execution time;
- coordinator steps;
- runtime/model calls;
- input/output tokens;
- tool invocations;
- provider sends/media;
- monetary estimate/settled spend;
- child Missions;
- retries;
- human approval age.

Reservation happens before costly/irreversible work where feasible. Commit/release is transactionally reconciled.

## Safety and policy

Policy input includes server-derived identity, Agent version, Mission type/state, proposed action, data class, provider/account, channel rules, customer consent, business hours/window, budget, risk, previous outcomes and human-control state.

Policy output is typed and versioned. Free-form model text is never the enforcement decision.

## Human control

Takeover establishes an exclusive human-control state for affected action classes. Agent reasoning may continue in observe-only mode only if policy allows. Returning control creates a new event and explicit context snapshot.

## Memory and context security

Context retrieval must enforce tenant/environment, purpose, data class, retention, Agent/tool scope and prompt-injection boundaries. Tool/provider output is untrusted input until validated.

## Runtime interoperability

All reasoning adapters implement:

```text
prepare_context
invoke
parse_proposal
report_usage
cancel_or_timeout
```

They never implement:

```text
select_tenant
approve
commit_action
send_provider_message
write_receipt
settle_usage
```

## Evaluation hooks

The runtime emits deterministic test seams for:

- injected observations;
- virtual clock;
- deterministic reasoning;
- fault points before/after each transaction;
- duplicate/reordered events;
- provider/tool simulators;
- policy variants;
- restart/worker-kill;
- evidence capture.

These seams must not be reachable as unsafe production fallbacks.

## Completion conditions

A Mission reaches `COMPLETED` only when its defined outcome evidence is satisfied or a permitted human authority confirms it. Sending the final message is not sufficient unless the Mission’s explicit outcome is delivery itself.


<!-- END 07_DURABLE_AGENT_RUNTIME_SPEC.md -->


---

<!-- BEGIN 08_DEVELOPER_PLATFORM_AND_INTEROPERABILITY_SPEC.md -->

# Developer Platform and Runtime Interoperability Specification

**Programme:** `ATLAS-BMR-002`  
**Package version:** `3.0.0-execution`  
**Date:** `2026-07-29`  
**Status:** `EXECUTION AUTHORITY`


## Developer promise

A developer or coding agent can:

```text
create or open a project
→ define/version an Agent and Mission type
→ run a persistent governed Mission locally without credentials
→ inspect every decision/action/receipt
→ integrate an existing reasoning runtime through Proposal contracts
→ test failure, approval, replay and recovery
→ deploy to Atlas Cloud
→ connect an eligible provider
→ observe usage, cost, delivery and outcomes
```

## Project structure

A generated project should make ownership visible:

```text
atlas.config.*
agents/
  <agent>/
    agent.*
    missions/
    policies/
    tools/
    knowledge/
    evals/
tests/
atlas/
  fixtures/
  provider-simulators/
```

The exact repository conventions may differ after P0; the conceptual separation does not.

## CLI capability families

```text
atlas init
atlas validate
atlas dev
atlas mission create|signal|inspect|pause|resume|cancel|replay
atlas approval list|approve|deny
atlas agent build|inspect|deploy
atlas provider connect|inspect|test
atlas evidence collect|verify
atlas readiness
atlas usage inspect
atlas deploy plan|apply|status|rollback
```

Commands must use shared schemas, typed errors, idempotency/correlation and machine-readable output. Do not create commands that bypass Cloud authority.

## SDK/API

Public SDK and OpenAPI expose:

- Agent package validation/deployment;
- Mission creation, signals and controls;
- observations, proposals and reasoning-adapter protocol;
- approvals/handoffs;
- Action/receipt/outcome reads;
- provider connection/readiness representations;
- usage/cost reads;
- extension manifests/conformance.

Private operational endpoints remain private.

## Local runtime

The local runtime implements portable lifecycle semantics with:

- local durable storage;
- deterministic runtime/model adapter;
- messaging/provider simulator;
- tool/business-system simulator;
- local policy and approval control;
- virtual clock and fault injection;
- inspectable evidence.

It requires no Atlas account, live provider, cloud deployment or paid model key.

## External runtime integration

An external agent receives a scoped context/proposal request and returns a typed Proposal. Authentication, replay defense, timeout, cancellation, signature or channel security, version negotiation and capability checks are part of conformance.

The external runtime cannot:

- pass arbitrary tenant/project/environment identity;
- receive raw provider credentials;
- directly write Mission, Action or receipt state;
- claim approval or completion;
- send through Atlas providers outside the outbox path.

## Versioning

- Contracts use semantic/versioned compatibility rules.
- Agent versions are immutable.
- Mission execution records the exact Agent and contract versions.
- A deployment may support a declared compatibility window.
- Breaking changes ship migration tooling and deprecation dates.
- Generated clients and docs are release-matched.

## Agent-readable documentation

Every public release includes:

- concise human quickstart;
- coding-agent instructions/skill;
- schemas/OpenAPI/types;
- runnable greenfield and existing-agent examples;
- failure/recovery examples;
- capability/readiness machine output;
- conformance commands;
- public/private boundary statement;
- limitations and provider states.

## Adoption evidence

P3 cannot pass using only maintainers or the live monorepo. Run fresh-directory journeys with no shell history, hidden environment values, undocumented package links or private service knowledge. Record time to first governed outcome, errors, interventions and exact artifacts.


<!-- END 08_DEVELOPER_PLATFORM_AND_INTEROPERABILITY_SPEC.md -->


---

<!-- BEGIN 09_PROVIDER_AND_CHANNEL_OPERATIONS_SPEC.md -->

# Provider and Channel Operations Specification

**Programme:** `ATLAS-BMR-002`  
**Package version:** `3.0.0-execution`  
**Date:** `2026-07-29`  
**Status:** `EXECUTION AUTHORITY`


## Objective

Build a repeatable provider-expansion system. Do not add adapters ad hoc or treat a declared channel as production-supported.

## Readiness vocabulary

```text
DECLARED
LOCAL_CONFORMANCE
PROVIDER_SANDBOX_PROVEN
LIMITED_PRODUCTION
PRODUCTION_PROVEN
BLOCKED_PROVIDER
DEPRECATED
```

Every readiness record is scoped by:

- channel and provider;
- adapter/contract version;
- provider account/business/app;
- environment;
- region/geography;
- inbound/outbound/media/template capabilities;
- customer/consent constraints;
- evidence timestamp and expiry;
- support owner;
- known limitations.

## Promotion requirements

### DECLARED → LOCAL_CONFORMANCE

Requires portable contract implementation, simulator fixtures, auth/config validation, capability matrix, failure mapping and conformance suite. No provider claim.

### LOCAL_CONFORMANCE → PROVIDER_SANDBOX_PROVEN

Requires an eligible sandbox/test account, real provider API/webhook exchange where the provider supports it, authenticity verification, credential rotation/revocation, retries, rate/limit behavior, delivery reconciliation, redacted evidence and documented gaps.

### PROVIDER_SANDBOX_PROVEN → LIMITED_PRODUCTION

Requires explicit account/region/customer envelope, consent/templates/windows where applicable, spend cap, support hours, incident/runbook ownership, bounded live traffic, current delivery reconciliation and rollback/disable path.

### LIMITED_PRODUCTION → PRODUCTION_PROVEN

Requires a separately defined sustained evidence window, measured SLO/cost/support performance, incident evidence, capacity envelope and repeated release/provider certification. BMR-002 does not require this universal state.

## Provider scorecard

Score at least:

| Dimension | Question |
| --- | --- |
| Customer demand | Which actual Atlas/Mirai workflows need it? |
| Geography | Is it relevant to initial customers/region? |
| Eligibility | Can Atlas obtain and retain the necessary account/business/app status? |
| Onboarding | API key, OAuth, embedded signup, business review, phone/domain verification? |
| Messaging rules | Consent, windows, templates, opt-out, content or category restrictions? |
| Webhooks | Authenticity, ordering, retry, replay, event completeness? |
| Delivery | Accepted/sent/delivered/read/failed semantics and reconciliation? |
| Media | Size/type/storage/security constraints? |
| Rate and spend | Quotas, throughput, price, registration and unexpected-cost risk? |
| Operations | Outage, support, observability, version drift and deprecation burden? |
| Commercial value | Does channel access create understandable customer value? |
| Certification cost | Accounts, devices, numbers, reviews, test traffic and engineering time? |

## BMR-002 provider wave

Default sequence, subject to P0/P5 evidence:

```text
Web Chat/reference simulator
→ reverify and harden Resend email
→ score at least three second-provider candidates
→ certify one candidate in provider sandbox
→ promote only one account/environment to limited production when authorised
```

Twilio SMS is a recommendation to score, not a locked provider decision. WhatsApp direct versus BSP/Twilio is a separate product/eligibility choice.

## Webhook security

Provider ingress must:

- preserve the original request bytes when signature algorithms require it;
- validate signature/authenticity before business processing;
- bind the correct provider account/environment;
- enforce timestamp/replay policy where available;
- deduplicate provider event/message identifiers;
- tolerate documented reordering and retries;
- store redacted evidence and correlation;
- reject unknown versions or event types safely.

## Delivery reconciliation

Provider callbacks update a provider receipt or superseding state; they do not directly mark a Mission outcome. A reconciliation job resolves missing callbacks, ambiguous acceptance, duplicate delivery reports and provider queries where supported.

## Provider outages

During provider failure Atlas may:

- stop new admission;
- wait and retry within bounded policy;
- hand off;
- switch to another authorised channel only with identity/consent/policy;
- fail truthfully;
- notify operators/customers through available channels.

Atlas may not silently route through an unapproved provider/account.

## Credential lifecycle

Provider credentials are private Cloud authority:

- encrypted and scoped by environment/account/capability;
- inaccessible to external reasoning runtimes;
- redacted from logs/traces/evidence;
- rotatable and revocable;
- validated before activation;
- auditable by actor and version;
- removed or disabled on disconnect.

## Version drift and deprecation

Adapters record provider API/version assumptions. Scheduled contract checks and provider notices create readiness review events. A deprecated provider state includes migration path, stop-admission date, active-Mission handling and customer communication.

## Provider support operations

Each limited-production lane names:

- technical owner;
- provider-account owner;
- credential owner;
- compliance/consent owner;
- incident escalation;
- spend/quota owner;
- customer support path;
- disable/rollback authority.


<!-- END 09_PROVIDER_AND_CHANNEL_OPERATIONS_SPEC.md -->


---

<!-- BEGIN 10_PRODUCTION_CLOUD_RELIABILITY_SPEC.md -->

# Production Atlas Cloud Reliability Specification

**Programme:** `ATLAS-BMR-002`  
**Package version:** `3.0.0-execution`  
**Date:** `2026-07-29`  
**Status:** `EXECUTION AUTHORITY`


## Reliability objective

Run persistent Missions truthfully under expected load and bounded failure. Reliability is measured at the customer/business lifecycle, not merely HTTP availability.

## Initial topology assumptions

P4 must replace assumptions with measured decisions. The default single-region shape includes:

- external ingress and webhook authenticity layer;
- control/API service;
- Mission coordinator workers;
- action/outbox workers;
- provider-specific worker pools;
- durable PostgreSQL or verified equivalent;
- durable queue/transport where used;
- managed secret/KMS integration;
- artifact registry and deployment pipeline;
- object/evidence storage;
- telemetry pipeline;
- support/status/incident operations;
- backup and isolated restore target.

## Workload model

Measure at least:

- inbound events per second and burst;
- concurrent active/waiting Missions;
- Mission steps and reasoning calls;
- context/knowledge reads;
- approvals/handoffs;
- Action/outbox throughput;
- provider sends and callbacks;
- media payload/storage;
- usage/cost events;
- operator reads/commands;
- retries, duplicates and poison work;
- tenant skew and abuse.

Every capacity report states exact fixture, source candidate, topology, data size, run duration, confidence, bottleneck, cost and exclusion.

## SLI families

Candidate indicators—final objectives require measurement:

- accepted valid ingress that becomes a durable Observation;
- Mission transition correctness and freshness;
- approval/handoff command durability;
- committed Action correctness;
- outbox age and reconciliation freshness;
- provider delivery-state freshness;
- false-success and duplicate-effect rate;
- tenant-isolation violations—target zero;
- recovery point/time;
- operator-control availability;
- usage/cost receipt completeness.

Avoid one aggregate “99.9% Atlas uptime” before user journeys and failure modes are defined.

## Error-budget policy

Error-budget consumption triggers named actions such as:

- stop risky feature/provider promotion;
- reduce autonomy or admission;
- freeze non-reliability releases;
- increase verification;
- trigger incident review;
- demote provider readiness;
- stop limited-production onboarding.

The policy has owner, measurement window, exceptions and escalation. It is not merely a dashboard.

## Worker and queue strategy

Partition by semantics, not convenience:

- Mission coordination must preserve per-Mission state ordering;
- Action/outbox workers preserve idempotency and effect isolation;
- provider pools isolate provider quotas/outages;
- tenant fairness prevents monopolisation;
- poison work goes to explicit dead-letter handling;
- leases/visibility timeouts match operation characteristics;
- scale-down drains safely.

## Backpressure

Admission considers database/queue/provider/inference saturation, tenant quota, global safety threshold and estimated cost. Accepted work must be durably represented. Rejection/defer states are typed and observable.

## Graceful degradation

Examples:

- inference unavailable → deterministic fallback only if safe, otherwise wait/handoff;
- provider unavailable → wait/handoff/fail/authorised channel fallback;
- observability unavailable → receipts remain authoritative; operate only within policy;
- billing adapter unavailable → canonical usage continues; paid admission follows configured risk;
- operator UI unavailable → control API/runbook remains available where designed;
- knowledge dependency unavailable → refuse unsupported factual action or hand off.

## Backup and recovery

Back up all authorities needed to reconstruct:

- tenant/project/environment;
- Agent versions/deployments;
- Mission events/state/waits;
- policy/approval/handoff;
- Actions/outbox/receipts;
- usage/cost;
- provider connection metadata;
- evidence/provenance.

Secrets follow secret-manager recovery procedures and are not copied into ordinary database backups.

A restore drill reconciles provider/tool effects and reports unknown states; it does not assume database restore equals business recovery.

## Deployment safety

- reproducible artifact;
- source, lockfile/dependency and build provenance;
- SBOM and secret scan;
- expand/contract migration;
- compatibility window for active Missions;
- canary with real lifecycle;
- stop-admission/drain;
- application/config rollback;
- schema forward-fix plan;
- exact evidence tied to candidate.

## Incident ownership

Every alert/runbook names service owner, first responder, escalation, provider/customer communication, decision authority, evidence location and follow-up. An unowned SLO is not an SLO.

## Production claim

BMR-002 may close at `LIMITED_PRODUCTION` inside a recorded envelope. It must not imply arbitrary tenant count, global residency, active/active multi-region, every-provider support or 24×7 enterprise support without direct evidence.


<!-- END 10_PRODUCTION_CLOUD_RELIABILITY_SPEC.md -->


---

<!-- BEGIN 11_ENTERPRISE_TRUST_AND_GOVERNANCE_SPEC.md -->

# Enterprise Trust and Governance Specification

**Programme:** `ATLAS-BMR-002`  
**Package version:** `3.0.0-execution`  
**Date:** `2026-07-29`  
**Status:** `EXECUTION AUTHORITY`


## Objective

Install the minimum control and evidence layer needed for serious bounded business adoption, without claiming a certification or legal posture that has not been earned.

## Organisation and environment governance

Canonical hierarchy:

```text
organisation
→ project
→ environment
→ Agent deployment/version
→ Mission
```

Every request derives this context from authenticated identity and server-side membership/scope. Client-supplied identifiers are selectors only after authorisation, never authority.

Environment boundaries separate local/test/sandbox/staging/limited-production/production credentials, data, providers, quotas and deployments.

## Roles and scopes

P6 defines exact roles from current product needs. Distinguish:

- organisation owner/admin;
- developer/deployer;
- operator;
- approver;
- auditor/read-only;
- billing admin;
- support responder;
- machine/service identity;
- provider connection manager.

Do not create one broad token for runtime, deployment, provider operations and billing.

## Identity federation

OIDC/SSO should be assessed and implemented when enterprise beta demand and current stack justify it. Validate issuer, audience, nonce/state, redirect, session, group/role mapping, deprovisioning and break-glass access.

SCIM is not automatic scope. Record demand, lifecycle burden and source-of-truth decisions first.

## Audit and immutable evidence

Audit events include actor, identity type, tenant/project/environment, action, target, policy/version, before/after reference where safe, correlation, timestamp and evidence chain.

Audit export is tenant-scoped, documented, reproducible and tamper-evident. “Immutable” must be tied to a storage/control mechanism, not wording.

## Encryption and keys

Document and test:

- encryption in transit;
- encryption at rest;
- field/envelope encryption for sensitive credentials/data where needed;
- key hierarchy and ownership;
- rotation/revocation;
- backup/restore behavior;
- separation of duties;
- logging/evidence redaction.

Customer-managed keys remain decision-gated until customer value and operational consequences are understood.

## Secret management

Raw provider/model/customer credentials never enter public packages, model context, ordinary telemetry, screenshots or evidence. Private workers obtain short-lived/scoped access. Rotation and revocation are tested.

## Data classification and lifecycle

Classify at least:

- public package/config;
- customer/business data;
- message content/media;
- knowledge/memory;
- credentials;
- audit/security events;
- billing/usage;
- telemetry;
- evidence artifacts.

Retention, export, deletion and derived-data invalidation are defined per class. Provider-held data and deletion limits are documented.

## Residency

Do not claim residency merely because a database is located in a region. Map every processing/storage/subprocessor/provider path and backup/telemetry route. Initial BMR-002 region scope is explicit and bounded.

## Incident and abuse response

Define severity, triage, containment, credential/provider disable, tenant isolation, evidence preservation, customer/provider communication, restoration and post-incident review.

Abuse controls include account creation, provider sends, content/tool misuse, credential attacks, excessive spend, cross-tenant probes and malicious extensions.

## Compliance-control mapping

For each considered standard/regulation classify controls as:

```text
IMPLEMENTED_WITH_EVIDENCE
IMPLEMENTED_NEEDS_EVIDENCE
REQUIRES_ORGANISATIONAL_PROCESS
REQUIRES_EXTERNAL_AUDIT_OR_ATTESTATION
NOT_APPLICABLE_OR_PREMATURE
```

Relevant candidates may include SOC 2, ISO 27001, GDPR, HIPAA or PCI DSS depending on customer/data/action scope. None is claimed by this package.

## Tenant isolation certification

Test at API, job/queue, database, cache, object storage, search/vector retrieval, telemetry, audit export, usage/billing, provider connection, support tooling and extension boundaries.

A single happy-path tenant test cannot certify isolation.


<!-- END 11_ENTERPRISE_TRUST_AND_GOVERNANCE_SPEC.md -->


---

<!-- BEGIN 12_COMMERCIAL_SELF_SERVE_SPEC.md -->

# Commercial Self-Serve Atlas Cloud Specification

**Programme:** `ATLAS-BMR-002`  
**Package version:** `3.0.0-execution`  
**Date:** `2026-07-29`  
**Status:** `EXECUTION AUTHORITY`


## Objective

Make Atlas Cloud operable as a bounded commercial developer platform while keeping the canonical Agent/Mission lifecycle, usage truth and customer value visible.

## Lifecycle

```text
signup
→ organisation
→ project/environment
→ zero-cost starter sandbox
→ Agent/Mission local or hosted deployment
→ provider/model/tool connection
→ governed outcome
→ usage/cost visibility
→ quota/spend control
→ plan/trial/upgrade
→ invoice/payment lifecycle
→ cancellation/export/deletion
→ support or enterprise handoff
```

## Self-serve versus sales-assisted

Self-serve supports low-risk sandbox and bounded activation. Sales/security-assisted paths handle enterprise identity, data/residency review, negotiated limits, higher-risk providers/actions, bespoke support and contracts.

Provider eligibility may require assisted onboarding even when Atlas signup is self-serve.

## Candidate value and billing metrics

Evaluate—not preselect:

| Metric | Customer clarity | Attribution | Gaming risk | Cost alignment | Notes |
| --- | --- | --- | --- | --- | --- |
| Active conversations | Familiar | Moderate | Reopen/split behavior | Indirect | Needs canonical definition. |
| Active Missions | Agentic value | Strong | Mission fragmentation | Better | Must distinguish trivial/long waits. |
| Committed Actions | Outcome-adjacent | Strong | Action granularity | Strong | High-risk/value actions vary. |
| Channel/provider accounts | Understandable add-on | Strong | Low | Support-linked | May discourage multi-channel adoption. |
| Managed runtime | Clear platform tier | Strong | Low | Infrastructure-linked | Combine with included usage. |
| Managed inference | Transparent pass-through/markup | Strong | Low | Direct | BYOK/gateway complicates comparability. |
| Provider delivery/media | Direct usage | Strong | Low | Direct | Provider pricing/regional variation. |
| Observability retention | Enterprise add-on | Strong | Low | Storage/query-linked | Avoid surprise. |
| Governance controls | Plan feature | Strong | Low | Support/control-linked | SSO/audit/retention tiers. |

The chosen beta metric set must be understandable, attributable, measurable, difficult to game, value-aligned and economically sustainable.

## Canonical usage and cost

Atlas records raw attributable usage first. Rating and invoicing are versioned downstream functions.

A usage event binds:

- organisation/project/environment;
- Agent/version and Mission;
- action/provider/model/tool;
- quantity/unit;
- event and ingestion time;
- idempotency key;
- estimated or settled cost source;
- currency and rate version;
- correction/supersession.

Stripe or another billing provider is a settlement/invoice system, not the only runtime usage authority.

## Unit economics

Measure:

- inference;
- database/queue/worker compute;
- provider sends/media/numbers/accounts;
- storage and observability;
- support/onboarding;
- security/compliance operations;
- payment fees/fraud;
- free/sandbox usage;
- gross margin by customer/Mission/provider.

Illustrative plan scenarios use pounds sterling only as modelling examples until existing Atlas pricing or evidence establishes otherwise.

## Quotas and spend

Customers can view and configure alerts, soft limits and hard limits. Atlas reserves spend before costly work where feasible and reconciles estimate to actual. Limit races and provider-delayed costs are tested.

## Billing lifecycle

Test:

- trial start/end;
- upgrade/downgrade timing;
- proration policy;
- failed payment and grace;
- retry/dunning communication;
- suspension without state loss;
- reactivation;
- cancellation;
- invoice/usage dispute evidence;
- export/deletion;
- tax/legal ownership decision.

## Fraud and abuse

Protect signup, trials, provider sends, model/tool spend, payment instruments, stolen credentials and high-risk actions. Controls must allow narrow suspension and evidence-preserving review.

## Support and status

Define self-serve docs/community/email support, limited-production escalation, provider incident ownership, enterprise sales/security handoff, status communication and support-hour claims.

## Commercial evidence gate

Commercial beta requires a reconciled Atlas ledger, tested billing-provider settlement, understandable usage display, enforced spend controls, complete lifecycle, support owner, provider/account cost visibility and no unsupported final pricing claim.


<!-- END 12_COMMERCIAL_SELF_SERVE_SPEC.md -->


---

<!-- BEGIN 13_ECOSYSTEM_AND_EXTENSION_SPEC.md -->

# Developer and Solution Ecosystem Specification

**Programme:** `ATLAS-BMR-002`  
**Package version:** `3.0.0-execution`  
**Date:** `2026-07-29`  
**Status:** `EXECUTION AUTHORITY`


## Objective

Allow developers and partners to extend Atlas safely without transferring Atlas authority or prematurely building a marketplace.

## Extension families

- reasoning runtime adapters;
- model routing/provider adapters;
- business tools/actions;
- channel/provider adapters;
- knowledge/data-source adapters;
- Agent templates;
- Mission templates;
- solution packs;
- eval packs;
- observability exporters;
- customer/private registry packages.

## Extension manifest

Each extension declares:

- identity, version, publisher and source;
- compatible Atlas contract versions;
- extension type and entry points;
- permissions and data classes;
- network/filesystem/credential needs;
- tools/actions/provider capabilities;
- configuration/schema;
- test/eval commands;
- security and dependency metadata;
- support/deprecation policy;
- licence and distribution terms.

## Authority limits

Extensions cannot:

- select arbitrary tenant/environment;
- receive broad raw Atlas/provider credentials;
- approve their own proposals;
- commit actions or write receipts outside public interfaces;
- bypass quota/policy;
- read unrelated memory/knowledge;
- claim provider/readiness state without evidence;
- mutate Atlas Cloud control-plane authority.

## Certification

Conformance covers:

- contract/version behavior;
- authentication and scope;
- idempotency/replay;
- failure/timeout/cancellation;
- data and secret handling;
- telemetry/redaction;
- policy/human-control behavior;
- resource/spend limits;
- malicious/malformed input;
- migration/deprecation.

Certification is version- and evidence-specific. It is not permanent endorsement.

## Distribution decision ladder

```text
local path/package
→ example repository
→ signed/verified package metadata
→ public catalogue
→ partner/private registry
→ marketplace only after demand, governance, support and economics evidence
```

BMR-002 requires contracts, certification, one independent extension and a catalogue/registry decision. It does not require transaction/payment marketplace implementation.

## Community governance

Define contribution guide, code of conduct/reference, maintainer ownership, review SLAs only when supportable, release/version policy, security disclosure, dependency updates, deprecation and compatibility window.

## Commercial solution packs

A commercial pack may package Agent/Mission templates, tools, provider setup, evals, operator workflows and support. Atlas runtime and security authority remains unchanged.

## Private enterprise registries

Assess when customers need approved internal Agent/extension distribution, version pinning, security review and private dependencies. Do not build until one real enterprise workflow justifies it.


<!-- END 13_ECOSYSTEM_AND_EXTENSION_SPEC.md -->


---

<!-- BEGIN 14_FLAGSHIP_OUTSIDE_IN_JOURNEYS.md -->

# Flagship Outside-In Journeys

**Programme:** `ATLAS-BMR-002`  
**Package version:** `3.0.0-execution`  
**Date:** `2026-07-29`  
**Status:** `EXECUTION AUTHORITY`


## Purpose

The programme is certified through complete customer/developer journeys. Component tests are necessary but cannot replace them.

## Journey A — Zero-credential persistent front-desk Mission

From an empty directory:

```text
create Agent project
→ run local persistent runtime
→ inject inbound customer request
→ resolve simulated identity/conversation
→ create Mission: qualify and book request
→ retrieve approved knowledge
→ propose appointment lookup
→ policy allows read
→ propose booking action
→ approval required
→ human approves locally
→ action commits
→ simulated provider reply delivers
→ Mission waits for customer confirmation
→ restart runtime
→ inject confirmation
→ Mission completes
→ inspect commit, delivery, usage, audit and outcome receipts
```

Required fault variants:

- restart before/after each commit boundary;
- duplicate inbound event;
- stale approval;
- cancellation while waiting;
- tool timeout;
- idempotency replay.

No live credentials, account, cloud or paid model.

## Journey B — Existing external agent integration

Start with a small external reasoning runtime. Add Atlas using public SDK/protocol:

- Atlas derives tenant/environment;
- external runtime receives scoped context;
- returns typed Proposal;
- cannot call provider or durable state directly;
- Atlas policy requires one approval;
- Atlas commits effect and receipts;
- runtime timeout/replay/forgery tests pass;
- same Mission is inspectable through CLI/API.

No private monorepo imports or undocumented service access.

## Journey C — Proactive bounded follow-up Mission

A business signal or schedule creates a Mission to follow up on an incomplete request.

The Mission:

- initiates under L4 bounded autonomy;
- has deadline, contact count, channel and spend limits;
- retrieves consent and approved context;
- sends through simulated/provider lane;
- waits for response;
- handles callback/duplicate/restart;
- hands off when uncertainty or customer request requires it;
- completes only on defined outcome or expires truthfully;
- proposes learning, which remains unaccepted until review.

## Journey D — Provider sandbox/live email

On an authorised Resend account:

- connection and credential version recorded;
- outbound Action/outbox send;
- real provider acceptance;
- signed webhook processing;
- retry/replay and delivery mapping;
- inbound email where in scope;
- quota/spend observation;
- provider outage simulation;
- Mission outcome separately evaluated.

Evidence redacts customer content, tokens and secrets.

## Journey E — Second provider

Repeat the provider lifecycle for the selected provider. Sandbox evidence cannot become limited-production evidence. Record account, region, capability and limitations.

## Journey F — Production-shaped staging

Deploy exact candidate with durable database/queue/workers/secrets/observability. Run:

- Journey A equivalent through hosted APIs;
- an external runtime Proposal;
- human control through contract/Mirai if available;
- load burst;
- provider/inference fault;
- worker kill;
- migration/canary/rollback;
- backup/restore/reconciliation;
- usage/cost and quota enforcement.

## Journey G — Self-serve commercial beta

A fresh user:

- signs up;
- creates organisation/project/environment;
- uses starter sandbox;
- deploys an Agent;
- sees readiness and usage;
- connects test/sandbox provider;
- sets spend limit;
- completes governed outcome;
- upgrades in billing test mode;
- sees reconciled invoice/usage;
- tests failed payment/cancellation/export/deletion.

## Journey H — Independent extension

A fresh coding agent/developer builds a tool or runtime/provider-style extension against public docs, passes conformance/security and runs Journey A or B without private help.


## Journey J — Complete production agentic product on staging

Run only after every required product plane is integrated into the exact G7 candidate and that candidate is deployed to staging:

```text
fresh signup
→ organisation / project / environment
→ starter sandbox and Agent project
→ versioned Agent deploy
→ provider connection and readiness
→ inbound customer event and canonical identity
→ durable Mission
→ approved knowledge and scoped context
→ Atlas-native or external-runtime Proposal
→ policy / risk / budget decision
→ human approval or handoff through public control contract
→ transactional Action and durable outbox
→ provider/tool effect and authentic callback
→ delivery and business-state reconciliation
→ outcome, usage, cost and audit receipts
→ quota / spend enforcement
→ billing test settlement and lifecycle communication
→ audit export and data-lifecycle action
→ injected worker/provider/database failure
→ recovery, replay safety and rollback
```

Repeat the critical path with one independent developer and one independently built extension. The journey fails if any product plane is bypassed, mocked where live/test-environment proof is required, or replaced by disconnected demos.

## Journey I — Authorised limited-production cohort

Only after G0–G8 and explicit authority:

- exact customer/provider/region/data/spend/support envelope;
- canary and stop-admission rules;
- sustained evidence window;
- operator handoff;
- incidents and provider callbacks;
- cost/usage/outcome reconciliation;
- rollback rehearsal/current readiness.

A live send alone is not this journey.

## Evidence bundle shape

Every journey captures:

```text
journey version
source commit
artifact digest
environment/provider/account scope
configuration/migration version
commands and inputs
redacted outputs
trace/correlation IDs
durable receipt IDs
tests/faults
timestamps
operator/reviewer
limitations
verdict
```


<!-- END 14_FLAGSHIP_OUTSIDE_IN_JOURNEYS.md -->


---

<!-- BEGIN 15_EXECUTION_PROGRAMME.md -->

# BMR-002 Execution Programme

**Programme:** `ATLAS-BMR-002`  
**Package version:** `3.0.0-execution`  
**Date:** `2026-07-29`  
**Status:** `EXECUTION AUTHORITY`


## Operating mode

The principal Claude Code session owns architecture, implementation and integration. Worker agents provide bounded testing, evidence reproduction, adversarial review and commit preparation/commit only.

Do not return another broad plan after P0. Execute the first dependency-ready item and keep the board and execution log current.

## Product-plane execution model

P0 verifies truth. P1 establishes shared contracts. P2–P6 are co-equal product build streams and may overlap when their explicit dependencies are satisfied. P7 integrates the complete product, deploys the exact candidate to staging, runs whole-product certification, and promotes only with authority.

Phase number is not product importance. Cloud, provider, enterprise, commercial and ecosystem work is not subordinate to the Agent runtime.

## Phase model

| Phase | Title | Items | Outcome | Gate(s) |
| --- | --- | --- | --- | --- |
| P0 | Certified baseline and execution activation | 5 | Verify BMR-001 closure and current repository truth, reconcile drift, install BMR-002 authority, and open an isolated execution lane. | G0 |
| P1 | Shared product authority and agentic foundations | 7 | Establish common Agent, Mission, Proposal, Decision, Action, Receipt, Outcome and Learning contracts and prove the first persistent local Mission. | G1 |
| P2 | Durable agent runtime and business execution | 8 | Build resumable governed autonomy, triggers, waits, budgets, approvals, handoff, memory provenance, exactly-once effects, cancellation and recovery. | G2 |
| P3 | Developer platform and runtime interoperability | 6 | Build coherent project, CLI, SDK and API journeys for Atlas-native and external reasoning runtimes while preserving Atlas authority. | G3 |
| P4 | Production Atlas Cloud product | 9 | Build durable production authorities, topology, capacity, SLOs, scaling, degradation, recovery, migration, deployment and operational ownership. | G4 |
| P5 | Provider and channel product | 7 | Build progressive provider readiness, harden Resend, certify an additional provider lane, and operate provider failures and drift truthfully. | G5 |
| P6 | Enterprise governance and commercial Cloud product | 8 | Build organisation governance, identity, audit, data lifecycle, usage/cost truth, quotas, billing settlement, lifecycle and support controls. | G6 |
| P7 | Ecosystem, whole-product integration, deployment and closure | 7 | Build extension readiness, integrate every first-class product plane, deploy the exact candidate to staging, certify the whole product, promote only when authorised, and close from evidence. | G7, G8, G9 |

Total work items: **57**.

## Test and certification model

1. Run schema/unit/property/integration/migration/security/fault tests while building each item.
2. Use G1–G6 only to establish product-plane build readiness.
3. Integrate every required plane into one exact candidate at G7.
4. Deploy that candidate to staging and execute the whole-product matrix at G8.
5. Promote to bounded production only with explicit authority; G9 governs production evidence and closure.

## Standard item lifecycle

```text
NOT_STARTED
→ READY
→ DISCOVERY
→ IN_PROGRESS
→ READY_FOR_REVIEW
→ PASS
```

Alternative dispositions:

```text
BLOCKED_EXTERNAL
BLOCKED_INTERNAL
FAIL
ROLLED_BACK
SUPERSEDED
```

`PASS` means the work item itself satisfies its acceptance criteria. It does not imply Atlas release readiness unless G8/G9 also pass.

## Per-item execution loop

1. Read the latest execution-log checkpoint and active item.
2. Verify dependencies and current Git/worktree/environment state.
3. Mark `DISCOVERY`; inspect existing authority before designing anything new.
4. Record the implementation decision, assumptions and falsifier.
5. Mark `IN_PROGRESS`; implement the principal solution in the main session.
6. Run targeted tests during implementation.
7. Run the item's required outside-in, failure, security, migration and environment tests.
8. Delegate bounded independent verification.
9. Repair findings; never weaken acceptance tests to obtain green.
10. Update source docs, registries, board, evidence index and execution log.
11. Inspect diff and secrets; commit a coherent slice when repository rules allow.
12. Mark the item `PASS` only from exact evidence; activate the next dependency-ready item.

## Dependency policy

The machine board is a directed acyclic graph. After P1, select the highest-severity dependency-ready work across P2–P6 rather than forcing strict phase-by-phase completion. Keep conflicting edits isolated and the principal session as integration authority.

External blockers stop only the affected lane. Continue every independent product plane.

`ATLAS-BMR2-P7-007` can issue `ATLAS_BMR_002_STAGING_CERTIFIED_PRODUCTION_APPROVAL_REQUIRED` after G8 when production authority/cohort access is the only remaining blocker. `ATLAS_BMR_002_EXECUTION_COMPLETE` requires P7-006 and G9 to pass.

## Work-item authorities
## `ATLAS-BMR2-P0-001` — Verify BMR-001 closure and live Git state

**Phase:** `P0`  
**Outcome:** Create a repository-derived closure verification record or a versioned post-closure erratum without mutating BMR-001 history.  
**Owner:** `principal orchestrator`  
**Gate:** `G0`  
**Initial status:** `READY`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- None.

**Implementation surfaces**

- git refs
- worktrees
- closure commit
- closure tag
- BMR-001 execution board
- release evidence

**Acceptance criteria**

- Resolve commit 4bf5da957d and tag atlas-bmr-001-closed
- Record exact branch, HEAD, tree, dirty state, worktrees and post-closure drift
- Verify 50/50 claim against canonical board
- Verify evidence checksums and release decision
- Record discrepancies only in BMR-002 errata

**Tests and evals**

- git object/ref validation
- board count validation
- checksum verification
- closure diff inventory

**Required environment**

Live worktree /Users/deon/Developer/mirai-atlas-bmr001

**Required evidence**

`.factory/evidence/atlas-bmr-002/P0/closure-verification.json`

**Rollback / disable path**

No product mutation; revert only BMR-002 verification artifacts

**Falsifier**

> Any closure claim is accepted from handover text without repository proof

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-001`
- Gap: `ATLAS-BMR2-GAP-001`

## `ATLAS-BMR2-P0-002` — Inventory the certified Atlas product and maturity

**Phase:** `P0`  
**Outcome:** Map public packages, private cloud, Mirai interfaces, runtime adapters, channels, providers, deployment, tests, and evidence to truthful maturity states.  
**Owner:** `principal orchestrator`  
**Gate:** `G0`  
**Initial status:** `NOT_STARTED`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- `ATLAS-BMR2-P0-001`

**Implementation surfaces**

- packages
- apps
- services
- migrations
- CLI
- SDK
- docs
- CI/CD
- deployments
- registries

**Acceptance criteria**

- Every BMR-001 capability is mapped to source and evidence
- Implemented/local/staging/provider/production proof are distinguished
- Public/private/Mirai boundaries are explicit
- Fixtures and memory authorities are identified

**Tests and evals**

- path existence validator
- registry schema validation
- source/evidence sampling

**Required environment**

Live repository and accessible environments

**Required evidence**

`.factory/evidence/atlas-bmr-002/P0/current-product-inventory.json`

**Rollback / disable path**

Revert generated BMR-002 inventory only

**Falsifier**

> A source path or passing unit test is treated as production proof

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-002`
- Gap: `ATLAS-BMR2-GAP-002`

## `ATLAS-BMR2-P0-003` — Reconcile residual risks, drift, and adjacent programme ownership

**Phase:** `P0`  
**Outcome:** Create a current gap and dependency map without absorbing Mirai ONE, AI Front Desk, AtlasAPI, Runtime-003, performance, provenance, or GTM authorities.  
**Owner:** `principal orchestrator`  
**Gate:** `G0`  
**Initial status:** `NOT_STARTED`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- `ATLAS-BMR2-P0-002`

**Implementation surfaces**

- programme docs
- roadmaps
- ownership maps
- risk register
- source drift

**Acceptance criteria**

- Duplicate writable authorities are identified
- Each adjacent programme is dependency, provider, consumer, superseded, or out of scope
- Post-certification drift is tested
- Residual technical, operational, commercial and ecosystem debt is recorded

**Tests and evals**

- cross-reference validator
- ownership contradiction review
- post-tag diff tests

**Required environment**

Repository documentation and current source

**Required evidence**

`.factory/evidence/atlas-bmr-002/P0/ownership-and-drift-review.md`

**Rollback / disable path**

Revert BMR-002-only authority changes

**Falsifier**

> BMR-002 silently becomes every Atlas/Mirai roadmap

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-003`
- Gap: `ATLAS-BMR2-GAP-003`

## `ATLAS-BMR2-P0-004` — Reconcile BMR-002 execution thesis with repository evidence

**Phase:** `P0`  
**Outcome:** Confirm or narrowly amend the Production Agentic Business Messaging Platform thesis using verified BMR-001 reality while preserving every first-class product plane and boundary.  
**Owner:** `principal orchestrator`  
**Gate:** `G0`  
**Initial status:** `NOT_STARTED`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- `ATLAS-BMR2-P0-003`

**Implementation surfaces**

- programme constitution
- target architecture
- execution board
- founder decisions

**Acceptance criteria**

- Agent/Mission, durable execution, developer, Cloud, provider, enterprise, commercial, ecosystem and operator-control planes are explicitly first-class
- No plane is demoted to optional supporting infrastructure
- Shared ownership and interface boundaries prevent duplicate authorities
- Build-stream and final whole-product test order are recorded
- Unresolvable founder choices are isolated as explicit decision records
- No broad implementation begins before the decision record is sealed

**Tests and evals**

- thesis falsification review
- scope/non-goal review
- independent architecture review

**Required environment**

Planning branch or isolated continuation branch

**Required evidence**

`.factory/evidence/atlas-bmr-002/P0/thesis-decision.md`

**Rollback / disable path**

Return affected items to BLOCKED_INTERNAL; do not edit BMR-001

**Falsifier**

> The selected programme can be satisfied by either a standalone Agent runtime or a standalone Cloud/provider/billing platform

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-004`
- Gap: `ATLAS-BMR2-GAP-004`

## `ATLAS-BMR2-P0-005` — Install and seal the execution authority

**Phase:** `P0`  
**Outcome:** Install the BMR-002 package canonically, create the execution branch strategy, validate machine authorities, and establish persistent programme memory.  
**Owner:** `release verifier`  
**Gate:** `G0`  
**Initial status:** `NOT_STARTED`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- `ATLAS-BMR2-P0-004`

**Implementation surfaces**

- docs/features/Atlas/ATLAS-BMR-002
- .claude
- execution log
- branch/worktree record

**Acceptance criteria**

- No BMR-001 evidence or tag changes
- JSON, dependencies, cross-references, checksums and secret scan pass
- Execution log records exact active worktree and next action
- Branch/worktree strategy preserves concurrent work

**Tests and evals**

- package validator
- secret scan
- git diff boundary check
- checksum verification

**Required environment**

Isolated BMR-002 planning/execution branch

**Required evidence**

`.factory/evidence/atlas-bmr-002/P0/package-seal.json`

**Rollback / disable path**

Revert the BMR-002-only installation commit

**Falsifier**

> Execution starts from an unvalidated or history-rewriting installation

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-005`
- Gap: `ATLAS-BMR2-GAP-005`

## `ATLAS-BMR2-P1-001` — Define AgentPackage and deployed Agent identity

**Phase:** `P1`  
**Outcome:** Make a versioned Agent package and immutable deployed Agent version first-class public contracts.  
**Owner:** `principal orchestrator`  
**Gate:** `G1`  
**Initial status:** `NOT_STARTED`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- `ATLAS-BMR2-P0-005`

**Implementation surfaces**

- public schemas
- TypeScript SDK
- OpenAPI
- CLI project schema
- private deployment records

**Acceptance criteria**

- AgentPackage declares instructions, knowledge bindings, tools, policies, triggers, budgets, channel capabilities and compatibility
- Deployment produces immutable agent_version_id tied to source digest
- Public contract contains no private Cloud implementation
- Schema evolution policy is documented

**Tests and evals**

- JSON Schema fixtures
- Type-level tests
- compatibility tests
- invalid package negative tests

**Required environment**

Local + CI

**Required evidence**

`.factory/evidence/atlas-bmr-002/P1/agent-package-contract/`

**Rollback / disable path**

Version-gate new contract and preserve previous project compatibility

**Falsifier**

> An Agent remains only an unversioned prompt blob

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-006`
- Gap: `ATLAS-BMR2-GAP-006`

## `ATLAS-BMR2-P1-002` — Define durable Mission and lifecycle event contracts

**Phase:** `P1`  
**Outcome:** Represent a bounded business goal as durable tenant-scoped state with an append-only lifecycle and explicit terminal outcomes.  
**Owner:** `principal orchestrator`  
**Gate:** `G1`  
**Initial status:** `NOT_STARTED`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- `ATLAS-BMR2-P1-001`

**Implementation surfaces**

- public schemas
- runtime domain
- database schema
- event contracts
- SDK

**Acceptance criteria**

- Mission includes goal, subject/customer, conversation, agent version, constraints, budget, deadline, state and correlation
- Lifecycle defines created/activated/waiting/approval/handoff/completed/failed/cancelled/expired
- Events carry causation, correlation, actor and timestamps
- Tenant and environment identity are server-derived

**Tests and evals**

- state-machine property tests
- schema tests
- illegal transition tests
- cross-tenant negative tests

**Required environment**

Local + CI + disposable database

**Required evidence**

`.factory/evidence/atlas-bmr-002/P1/mission-contract/`

**Rollback / disable path**

Keep additive schema; disable mission creation behind capability flag

**Falsifier**

> A Mission is interchangeable with one request/response or conversation row

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-007`
- Gap: `ATLAS-BMR2-GAP-007`

## `ATLAS-BMR2-P1-003` — Define Proposal, Decision, Action, Receipt, Outcome and Learning contracts

**Phase:** `P1`  
**Outcome:** Separate reasoning proposals from Atlas-governed decisions, committed effects, delivery receipts, business outcomes, and reviewed learning.  
**Owner:** `principal orchestrator`  
**Gate:** `G1`  
**Initial status:** `NOT_STARTED`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- `ATLAS-BMR2-P1-002`

**Implementation surfaces**

- public contracts
- policy interface
- tool contracts
- receipt schemas
- outcome schemas

**Acceptance criteria**

- External runtimes can create proposals but not approvals or committed actions
- Decision records policy version, reasons and required control
- Action has idempotency scope and typed effect
- Receipts distinguish commit, provider delivery, usage, cost, audit and outcome
- LearningProposal cannot mutate durable memory before review

**Tests and evals**

- authority boundary tests
- schema compatibility tests
- forgery negative tests
- receipt completeness tests

**Required environment**

Local + CI

**Required evidence**

`.factory/evidence/atlas-bmr-002/P1/action-receipt-contract/`

**Rollback / disable path**

Version new envelopes; retain adapter for BMR-001 proposal format

**Falsifier**

> Model output is persisted directly as a completed business outcome

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-008`
- Gap: `ATLAS-BMR2-GAP-008`

## `ATLAS-BMR2-P1-004` — Install durable Mission persistence and migrations

**Phase:** `P1`  
**Outcome:** Persist missions, lifecycle events, steps, waits, decisions, actions and receipt links in tenant-scoped durable storage.  
**Owner:** `principal orchestrator`  
**Gate:** `G1`  
**Initial status:** `NOT_STARTED`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- `ATLAS-BMR2-P1-002`
- `ATLAS-BMR2-P1-003`

**Implementation surfaces**

- database migrations
- repositories
- transaction boundaries
- row-level access patterns

**Acceptance criteria**

- Restart preserves exact mission state
- Unique/idempotency constraints reject conflicting replay
- Tenant scope is enforced in every read/write path
- Migrations are forward/backward compatible for the release window

**Tests and evals**

- migration contract tests
- restart tests
- concurrency tests
- tenant isolation tests

**Required environment**

Disposable PostgreSQL + CI

**Required evidence**

`.factory/evidence/atlas-bmr-002/P1/mission-persistence/`

**Rollback / disable path**

Rollback application reads before destructive migration; use expand/contract

**Falsifier**

> Mission continuity depends on process memory

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-009`
- Gap: `ATLAS-BMR2-GAP-009`

## `ATLAS-BMR2-P1-005` — Implement deterministic local Mission coordinator

**Phase:** `P1`  
**Outcome:** Run one complete observe–reason–propose–govern–act–observe Mission locally with deterministic fixtures and no credentials.  
**Owner:** `principal orchestrator`  
**Gate:** `G1`  
**Initial status:** `NOT_STARTED`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- `ATLAS-BMR2-P1-004`

**Implementation surfaces**

- local runtime
- coordinator
- simulator
- deterministic model adapter
- tool simulator

**Acceptance criteria**

- Coordinator resumes from persisted event/state
- At least one tool proposal crosses policy and approval boundary
- Committed effect and all receipt types are inspectable
- No Atlas account, provider credential, cloud, or paid model key is required

**Tests and evals**

- outside-in local journey
- restart-at-each-step matrix
- determinism test
- duplicate input replay

**Required environment**

Local zero-credential environment

**Required evidence**

`.factory/evidence/atlas-bmr-002/P1/first-persistent-mission/`

**Rollback / disable path**

Disable mission coordinator and retain BMR-001 local path

**Falsifier**

> Demo is scripted output or a stateless mock without persistence

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-010`
- Gap: `ATLAS-BMR2-GAP-010`

## `ATLAS-BMR2-P1-006` — Expose Mission inspect, replay, pause, resume and cancel surfaces

**Phase:** `P1`  
**Outcome:** Give developers safe control and observability over local Missions without database access.  
**Owner:** `principal orchestrator`  
**Gate:** `G1`  
**Initial status:** `NOT_STARTED`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- `ATLAS-BMR2-P1-005`

**Implementation surfaces**

- CLI
- SDK
- local API
- local UI/TUI if present
- docs

**Acceptance criteria**

- Inspect shows lifecycle, current wait, decisions, actions, receipts, usage and cost
- Replay never re-commits completed actions
- Pause/resume/cancel are durable commands
- Commands return typed errors and correlation IDs

**Tests and evals**

- CLI golden tests
- SDK contract tests
- cancel race tests
- replay idempotency tests

**Required environment**

Local + CI

**Required evidence**

`.factory/evidence/atlas-bmr-002/P1/mission-control-surfaces/`

**Rollback / disable path**

Hide new commands behind versioned feature capability

**Falsifier**

> Control commands directly mutate rows without runtime validation

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-011`
- Gap: `ATLAS-BMR2-GAP-011`

## `ATLAS-BMR2-P1-007` — Validate shared agentic product foundations

**Phase:** `P1`  
**Outcome:** Obtain an adversarial build-readiness review proving that the shared Agent/Mission and authority contracts are genuine, durable and safe to integrate with every other product plane.  
**Owner:** `independent verifier`  
**Gate:** `G1`  
**Initial status:** `NOT_STARTED`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- `ATLAS-BMR2-P1-001`
- `ATLAS-BMR2-P1-002`
- `ATLAS-BMR2-P1-003`
- `ATLAS-BMR2-P1-004`
- `ATLAS-BMR2-P1-005`
- `ATLAS-BMR2-P1-006`

**Implementation surfaces**

- P1 source
- tests
- outside-in evidence
- architecture decision

**Acceptance criteria**

- Reviewer reproduces the local Mission journey
- Reviewer attempts authority bypass and restart loss
- Public/private/Mirai interfaces are checked for duplicate authority
- Review maps every foundation invariant to source/test/evidence
- The verdict is explicitly build readiness, not Atlas release certification
- Critical findings are repaired or G1 fails

**Tests and evals**

- independent reproduction
- architecture adversarial review
- anti-cheat review

**Required environment**

Fresh checkout / independent context

**Required evidence**

`.factory/evidence/atlas-bmr-002/P1/independent-review.md`

**Rollback / disable path**

Reopen failing P1 item; do not waive the gate

**Falsifier**

> The same implementing context self-certifies the complete Atlas product from a local runtime demonstration

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-012`
- Gap: `ATLAS-BMR2-GAP-012`

## `ATLAS-BMR2-P2-001` — Implement coordinator leasing, heartbeats and crash-safe resume

**Phase:** `P2`  
**Outcome:** Allow many coordinators to process Missions without concurrent ownership or abandoned work.  
**Owner:** `principal orchestrator`  
**Gate:** `G2`  
**Initial status:** `NOT_STARTED`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- `ATLAS-BMR2-P1-007`

**Implementation surfaces**

- mission scheduler
- lease store
- worker runtime
- database

**Acceptance criteria**

- Lease acquisition is atomic and tenant-safe
- Expired leases are recoverable
- Long steps heartbeat without indefinite lock
- Crash at every lifecycle boundary resumes from canonical state

**Tests and evals**

- lease race tests
- process-kill matrix
- stale heartbeat tests
- duplicate worker tests

**Required environment**

Disposable database + multi-worker test runtime

**Required evidence**

`.factory/evidence/atlas-bmr-002/P2/coordinator-recovery/`

**Rollback / disable path**

Disable distributed coordinator; drain to single worker

**Falsifier**

> Two workers can commit the same mission step

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-013`
- Gap: `ATLAS-BMR2-GAP-013`

## `ATLAS-BMR2-P2-002` — Implement triggers, durable waits and scheduler

**Phase:** `P2`  
**Outcome:** Start and resume Missions from inbound events, schedules, provider callbacks, approvals, deadlines and business signals.  
**Owner:** `principal orchestrator`  
**Gate:** `G2`  
**Initial status:** `NOT_STARTED`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- `ATLAS-BMR2-P2-001`

**Implementation surfaces**

- trigger router
- scheduler
- wait registry
- webhook/event ingress

**Acceptance criteria**

- Triggers are idempotent and tenant-scoped
- Durable waits survive restart and support timeout
- Late/duplicate events are reconciled deterministically
- Schedules respect environment and cancellation

**Tests and evals**

- trigger deduplication tests
- clock/timeout tests
- late callback tests
- restart tests

**Required environment**

Local + CI + disposable workers

**Required evidence**

`.factory/evidence/atlas-bmr-002/P2/triggers-and-waits/`

**Rollback / disable path**

Disable trigger type and preserve queued events for replay

**Falsifier**

> A callback can advance the wrong tenant or cancelled Mission

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-014`
- Gap: `ATLAS-BMR2-GAP-014`

## `ATLAS-BMR2-P2-003` — Install action-specific autonomy, risk and budget policy

**Phase:** `P2`  
**Outcome:** Enforce server-side autonomy levels, risk classes, time/step/token/spend budgets and escalation behavior per action.  
**Owner:** `principal orchestrator`  
**Gate:** `G2`  
**Initial status:** `NOT_STARTED`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- `ATLAS-BMR2-P2-002`

**Implementation surfaces**

- policy engine
- budget ledger
- tool registry
- agent package validation

**Acceptance criteria**

- Autonomy ladder L0–L4 is action-specific; L5 unrestricted is forbidden
- Budget reservation/commit/release is atomic
- Policy version and explanation are recorded
- Exhausted/uncertain cases wait, hand off, or fail truthfully

**Tests and evals**

- policy matrix tests
- budget race tests
- forged autonomy negative tests
- exhaustion tests

**Required environment**

Local + CI + disposable database

**Required evidence**

`.factory/evidence/atlas-bmr-002/P2/autonomy-and-budgets/`

**Rollback / disable path**

Reduce maximum autonomy through server policy; no package migration required

**Falsifier**

> Agent instructions can raise their own autonomy or spend limit

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-015`
- Gap: `ATLAS-BMR2-GAP-015`

## `ATLAS-BMR2-P2-004` — Make approval, handoff, takeover and return durable

**Phase:** `P2`  
**Outcome:** Model human control as first-class commands and state transitions usable by Mirai or another operator surface.  
**Owner:** `principal orchestrator`  
**Gate:** `G2`  
**Initial status:** `NOT_STARTED`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- `ATLAS-BMR2-P2-003`

**Implementation surfaces**

- approval service
- handoff contracts
- operator command API
- mission state machine

**Acceptance criteria**

- Approval cannot be issued by the proposing runtime
- Scope, expiry, actor, rationale and policy are recorded
- Human takeover prevents agent side effects
- Return-to-agent resumes from explicit state and context
- Mirai consumes public contracts rather than private Atlas concepts

**Tests and evals**

- approval forgery tests
- takeover race tests
- expiry tests
- handoff integration contract tests

**Required environment**

Local + CI + operator-contract harness

**Required evidence**

`.factory/evidence/atlas-bmr-002/P2/human-control/`

**Rollback / disable path**

Force all affected actions to approval-required mode

**Falsifier**

> A model/tool adapter can self-approve or continue after takeover

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-016`
- Gap: `ATLAS-BMR2-GAP-016`

## `ATLAS-BMR2-P2-005` — Implement provenance-governed memory and reviewed learning

**Phase:** `P2`  
**Outcome:** Allow Missions to read scoped knowledge and memory while keeping source provenance, confidence, retention, tenant boundary and review state explicit.  
**Owner:** `principal orchestrator`  
**Gate:** `G2`  
**Initial status:** `NOT_STARTED`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- `ATLAS-BMR2-P2-003`

**Implementation surfaces**

- knowledge retrieval
- memory store
- learning proposals
- retention hooks

**Acceptance criteria**

- Every retrieved item carries source/version/scope
- Ephemeral observations are separate from durable memory
- Learning proposals require configured review before promotion
- Deletion/retention invalidates dependent memory
- Untrusted provider/model content cannot silently become policy

**Tests and evals**

- provenance tests
- poisoning tests
- cross-tenant retrieval tests
- retention invalidation tests

**Required environment**

Local + CI + disposable storage

**Required evidence**

`.factory/evidence/atlas-bmr-002/P2/memory-and-learning/`

**Rollback / disable path**

Disable durable promotion and operate read-only knowledge

**Falsifier**

> The agent writes raw model conclusions directly to shared durable memory

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-017`
- Gap: `ATLAS-BMR2-GAP-017`

## `ATLAS-BMR2-P2-006` — Implement transactional action commit, outbox and effect workers

**Phase:** `P2`  
**Outcome:** Commit business actions exactly once and deliver provider/tool effects through a durable outbox with canonical receipts.  
**Owner:** `principal orchestrator`  
**Gate:** `G2`  
**Initial status:** `NOT_STARTED`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- `ATLAS-BMR2-P2-003`
- `ATLAS-BMR2-P2-004`

**Implementation surfaces**

- action service
- database transaction
- outbox
- tool workers
- provider workers
- receipt store

**Acceptance criteria**

- Action and outbox record commit atomically
- Idempotency mismatch is rejected
- Worker retries cannot duplicate committed business effects
- Provider/tool response is reconciled to canonical receipt
- External runtimes never receive raw provider credentials

**Tests and evals**

- fault-point transaction tests
- idempotency concurrency tests
- worker retry tests
- credential boundary tests

**Required environment**

Disposable database/queue + simulators

**Required evidence**

`.factory/evidence/atlas-bmr-002/P2/action-outbox/`

**Rollback / disable path**

Drain/disable new worker version and replay retained outbox safely

**Falsifier**

> Success is returned before durable commit or duplicate provider sends are possible

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-018`
- Gap: `ATLAS-BMR2-GAP-018`

## `ATLAS-BMR2-P2-007` — Implement cancellation, compensation, dead-letter and replay policy

**Phase:** `P2`  
**Outcome:** Resolve partial failure without fabricating rollback or outcome success.  
**Owner:** `principal orchestrator`  
**Gate:** `G2`  
**Initial status:** `NOT_STARTED`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- `ATLAS-BMR2-P2-006`

**Implementation surfaces**

- mission coordinator
- compensation contracts
- dead-letter store
- admin recovery API

**Acceptance criteria**

- Cancellation distinguishes not-started, committed, in-flight and irreversible effects
- Compensation is explicit business action, not database deletion
- Dead letters carry reason, owner and safe replay command
- Replay verifies current policy and idempotency

**Tests and evals**

- cancel/commit race tests
- compensation tests
- poison-message tests
- replay authorization tests

**Required environment**

Disposable runtime + fault harness

**Required evidence**

`.factory/evidence/atlas-bmr-002/P2/failure-resolution/`

**Rollback / disable path**

Quarantine affected action types; retain evidence and manual resolution path

**Falsifier**

> System claims an irreversible provider/business effect was rolled back

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-019`
- Gap: `ATLAS-BMR2-GAP-019`

## `ATLAS-BMR2-P2-008` — Certify a bounded proactive multi-step Mission

**Phase:** `P2`  
**Outcome:** Prove an agent can initiate and continue a bounded business objective over time while respecting triggers, budgets, approvals, memory, recovery and outcomes.  
**Owner:** `independent verifier`  
**Gate:** `G2`  
**Initial status:** `NOT_STARTED`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- `ATLAS-BMR2-P2-001`
- `ATLAS-BMR2-P2-002`
- `ATLAS-BMR2-P2-003`
- `ATLAS-BMR2-P2-004`
- `ATLAS-BMR2-P2-005`
- `ATLAS-BMR2-P2-006`
- `ATLAS-BMR2-P2-007`

**Implementation surfaces**

- flagship local scenario
- mission runtime
- simulated channel/provider
- evidence pack

**Acceptance criteria**

- Mission spans at least two wake-ups and three governed steps
- Restart and duplicate events are injected
- One action requires approval or handoff
- Budget and deadline are enforced
- Outcome receipt is based on committed evidence
- Independent verifier reproduces the journey

**Tests and evals**

- outside-in proactive journey
- fault injection matrix
- independent replay
- anti-cheat review

**Required environment**

Fresh checkout + zero-credential local stack

**Required evidence**

`.factory/evidence/atlas-bmr-002/P2/proactive-mission-certification/`

**Rollback / disable path**

Disable proactive trigger classes and preserve on-demand operation

**Falsifier**

> Proactivity is a cron script sending a prompt without durable Mission state

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-020`
- Gap: `ATLAS-BMR2-GAP-020`

## `ATLAS-BMR2-P3-001` — Evolve Atlas project schema and scaffold for Agents and Missions

**Phase:** `P3`  
**Outcome:** Make agent packages, mission types, policies, tools, knowledge, tests and deployment intent understandable from one project.  
**Owner:** `principal orchestrator`  
**Gate:** `G3`  
**Initial status:** `NOT_STARTED`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- `ATLAS-BMR2-P1-007`

**Implementation surfaces**

- atlas.config/project schema
- scaffold generator
- examples
- migration command

**Acceptance criteria**

- New project creates a runnable persistent Mission example
- Existing BMR-001 project migrates without private knowledge
- Project validation identifies unsupported capabilities
- Local simulator remains zero-credential

**Tests and evals**

- scaffold snapshot tests
- migration fixtures
- empty-folder outside-in test
- backward compatibility tests

**Required environment**

Local + CI

**Required evidence**

`.factory/evidence/atlas-bmr-002/P3/project-and-scaffold/`

**Rollback / disable path**

Keep previous schema version readable and provide reverse guidance

**Falsifier**

> Only internal monorepo templates can create a valid agent

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-021`
- Gap: `ATLAS-BMR2-GAP-021`

## `ATLAS-BMR2-P3-002` — Ship coherent Mission CLI, SDK and API

**Phase:** `P3`  
**Outcome:** Expose create, signal, inspect, pause, resume, cancel, approve, handoff, replay, deploy and evidence operations consistently.  
**Owner:** `principal orchestrator`  
**Gate:** `G3`  
**Initial status:** `NOT_STARTED`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- `ATLAS-BMR2-P3-001`
- `ATLAS-BMR2-P1-006`

**Implementation surfaces**

- CLI
- TypeScript SDK
- OpenAPI
- generated types
- docs

**Acceptance criteria**

- CLI/SDK/API share schemas and error model
- Every mutating call supports idempotency and correlation
- Capability/readiness inspection is machine-readable
- Generated clients match current OpenAPI

**Tests and evals**

- contract parity tests
- OpenAPI diff gate
- CLI golden tests
- SDK integration tests

**Required environment**

Local + CI

**Required evidence**

`.factory/evidence/atlas-bmr-002/P3/cli-sdk-api/`

**Rollback / disable path**

Version endpoints/commands and retain prior compatibility adapter

**Falsifier**

> Different surfaces implement conflicting lifecycle semantics

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-022`
- Gap: `ATLAS-BMR2-GAP-022`

## `ATLAS-BMR2-P3-003` — Certify Atlas-native reasoning adapter

**Phase:** `P3`  
**Outcome:** Connect Atlas-native inference to the proposal protocol with traceable context, tool proposals, budgets and typed failures.  
**Owner:** `principal orchestrator`  
**Gate:** `G3`  
**Initial status:** `NOT_STARTED`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- `ATLAS-BMR2-P3-002`
- `ATLAS-BMR2-P2-001`

**Implementation surfaces**

- native runtime adapter
- model router
- proposal protocol
- trace propagation

**Acceptance criteria**

- Adapter cannot commit actions or approve itself
- Context is scoped and provenance-tagged
- Model usage/cost is recorded without becoming billing settlement
- Timeout/refusal/malformed output produce explicit states

**Tests and evals**

- adapter conformance tests
- tool-bypass negative tests
- malformed response tests
- usage receipt tests

**Required environment**

Local + CI + optional model sandbox

**Required evidence**

`.factory/evidence/atlas-bmr-002/P3/native-adapter/`

**Rollback / disable path**

Route to deterministic local adapter or approval/handoff

**Falsifier**

> Native adapter has privileged side-effect paths unavailable to external adapters

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-023`
- Gap: `ATLAS-BMR2-GAP-023`

## `ATLAS-BMR2-P3-004` — Certify external runtime proposal adapter

**Phase:** `P3`  
**Outcome:** Allow an external agent runtime to reason and propose through Atlas without receiving authority over tenant, approval, credentials, effects or receipts.  
**Owner:** `principal orchestrator`  
**Gate:** `G3`  
**Initial status:** `NOT_STARTED`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- `ATLAS-BMR2-P3-002`
- `ATLAS-BMR2-P2-003`
- `ATLAS-BMR2-P2-006`

**Implementation surfaces**

- runtime interoperability protocol
- HTTP/webhook adapter
- auth scopes
- conformance harness

**Acceptance criteria**

- Tenant/environment are server-derived
- Proposal replay and signature/authentication are tested
- External runtime cannot select provider credentials or fabricate receipt
- At least one real external-runtime harness passes

**Tests and evals**

- protocol conformance tests
- forgery/replay tests
- scope tests
- outside-in external agent journey

**Required environment**

Local + CI + isolated external runtime

**Required evidence**

`.factory/evidence/atlas-bmr-002/P3/external-runtime/`

**Rollback / disable path**

Disable external runtime connection and retain Atlas-native path

**Falsifier**

> External runtime can call provider or durable business state directly

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-024`
- Gap: `ATLAS-BMR2-GAP-024`

## `ATLAS-BMR2-P3-005` — Install coding-agent documentation and Claude Code execution skill

**Phase:** `P3`  
**Outcome:** Make Atlas and this programme executable by coding agents from public contracts and repository-resident instructions.  
**Owner:** `principal orchestrator`  
**Gate:** `G3`  
**Initial status:** `NOT_STARTED`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- `ATLAS-BMR2-P3-002`
- `ATLAS-BMR2-P3-003`
- `ATLAS-BMR2-P3-004`

**Implementation surfaces**

- docs
- examples
- .claude skill
- machine registries
- conformance commands

**Acceptance criteria**

- Skill states authority hierarchy, active item workflow and safety rules
- Examples are version-matched and executable
- No secret/private operator knowledge is required
- Worker delegation events can be logged without claiming unverified model identity

**Tests and evals**

- fresh-context doc test
- example execution
- link/path validation
- skill lint

**Required environment**

Fresh checkout + Claude Code

**Required evidence**

`.factory/evidence/atlas-bmr-002/P3/agent-readable-adoption/`

**Rollback / disable path**

Revert skill/doc version; runtime remains compatible

**Falsifier**

> Coding agent succeeds only because prior chat context contains missing instructions

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-025`
- Gap: `ATLAS-BMR2-GAP-025`

## `ATLAS-BMR2-P3-006` — Run independent developer adoption and interoperability certification

**Phase:** `P3`  
**Outcome:** Prove two independent journeys: empty-folder Atlas-native and existing external agent integration.  
**Owner:** `independent verifier`  
**Gate:** `G3`  
**Initial status:** `NOT_STARTED`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- `ATLAS-BMR2-P3-001`
- `ATLAS-BMR2-P3-002`
- `ATLAS-BMR2-P3-003`
- `ATLAS-BMR2-P3-004`
- `ATLAS-BMR2-P3-005`

**Implementation surfaces**

- fresh repositories
- published/local packages
- docs
- conformance kit

**Acceptance criteria**

- Independent agent/developer completes both journeys
- No direct database/provider access is used
- Governed action, recovery and receipts are observed
- Friction/time/failures are captured and critical defects fixed

**Tests and evals**

- outside-in adoption eval
- runtime parity eval
- documentation ambiguity review

**Required environment**

Two fresh checkouts with no maintainer shell history

**Required evidence**

`.factory/evidence/atlas-bmr-002/P3/independent-adoption/`

**Rollback / disable path**

Hold release and return failing surface to owner

**Falsifier**

> Only founding-team monorepo execution is demonstrated

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-026`
- Gap: `ATLAS-BMR2-GAP-026`

## `ATLAS-BMR2-P4-001` — Consolidate production authority and fail-closed configuration

**Phase:** `P4`  
**Outcome:** Ensure production identity, mission, policy, approval, action, outbox, receipt, usage and credential authorities have one durable owner.  
**Owner:** `principal orchestrator`  
**Gate:** `G4`  
**Initial status:** `NOT_STARTED`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- `ATLAS-BMR2-P1-007`

**Implementation surfaces**

- private Atlas Cloud services
- config boot checks
- database
- queue
- secret manager

**Acceptance criteria**

- Memory/test/fixture authorities are rejected in staging/production
- One writable owner exists per authority
- Startup emits typed failure for unsafe fallback
- Local simulator behavior is unchanged

**Tests and evals**

- authority census
- environment matrix tests
- negative boot tests
- local regression

**Required environment**

CI + disposable production-like stack

**Required evidence**

`.factory/evidence/atlas-bmr-002/P4/production-authority/`

**Rollback / disable path**

Roll back service/config version; never enable ambiguous fallback silently

**Falsifier**

> Production can start with memory-backed mission/action/usage authority

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-027`
- Gap: `ATLAS-BMR2-GAP-027`

## `ATLAS-BMR2-P4-002` — Define workload, capacity, cost and failure models

**Phase:** `P4`  
**Outcome:** Model representative tenants, conversations, Missions, steps, inference, tools, provider events, media, receipts and operational cost.  
**Owner:** `principal orchestrator`  
**Gate:** `G4`  
**Initial status:** `NOT_STARTED`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- `ATLAS-BMR2-P1-007`

**Implementation surfaces**

- load fixtures
- capacity model
- cost attribution model
- fault catalogue

**Acceptance criteria**

- Steady, peak, burst and abuse profiles are versioned
- Tenant distribution and provider quotas are included
- Per-mission and per-action cost drivers are measurable
- Assumptions and confidence bounds are explicit

**Tests and evals**

- fixture validation
- cost reconciliation fixture tests
- model review

**Required environment**

Planning + disposable load environment

**Required evidence**

`.factory/evidence/atlas-bmr-002/P4/workload-capacity-model/`

**Rollback / disable path**

Version model; no production mutation

**Falsifier**

> Capacity target is an unsupported round number without workload trace

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-028`
- Gap: `ATLAS-BMR2-GAP-028`

## `ATLAS-BMR2-P4-003` — Implement database, queue and worker partitioning

**Phase:** `P4`  
**Outcome:** Bound failure domains and noisy-neighbour effects across mission coordination, actions, providers and tenants.  
**Owner:** `principal orchestrator`  
**Gate:** `G4`  
**Initial status:** `NOT_STARTED`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- `ATLAS-BMR2-P4-001`
- `ATLAS-BMR2-P4-002`
- `ATLAS-BMR2-P2-001`

**Implementation surfaces**

- PostgreSQL
- queue topology
- worker pools
- connection pools
- partition keys
- DLQ

**Acceptance criteria**

- Partition keys preserve ordering where required
- Poison work is quarantined
- Fairness and per-tenant admission are observable
- Pool/lock/lag saturation has defined behavior

**Tests and evals**

- ordering tests
- poison tests
- fairness tests
- pool/lock load tests

**Required environment**

Isolated certification environment

**Required evidence**

`.factory/evidence/atlas-bmr-002/P4/partitioning/`

**Rollback / disable path**

Restore prior routing config after draining workers

**Falsifier**

> One tenant/provider can monopolise workers or exhaust shared pools

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-029`
- Gap: `ATLAS-BMR2-GAP-029`

## `ATLAS-BMR2-P4-004` — Install causal observability, SLOs and error-budget policy

**Phase:** `P4`  
**Outcome:** Trace each Mission from trigger through reasoning, decision, action, provider/tool delivery, receipt and outcome with user-relevant SLOs.  
**Owner:** `principal orchestrator`  
**Gate:** `G4`  
**Initial status:** `NOT_STARTED`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- `ATLAS-BMR2-P4-002`
- `ATLAS-BMR2-P4-003`
- `ATLAS-BMR2-P2-006`

**Implementation surfaces**

- OpenTelemetry instrumentation
- metrics
- logs
- dashboards
- alerts
- SLO policy

**Acceptance criteria**

- Trace context crosses service/queue/provider boundaries where possible
- Telemetry is redacted and not business authority
- SLIs measure mission/action/delivery correctness and freshness
- Error-budget consequences name release/incident actions

**Tests and evals**

- trace correlation tests
- redaction tests
- SLO query tests
- alert simulation

**Required environment**

Staging observability stack

**Required evidence**

`.factory/evidence/atlas-bmr-002/P4/observability-slos/`

**Rollback / disable path**

Roll back instrumentation/rules independently; preserve receipt authority

**Falsifier**

> Dashboard existence is treated as SLO proof or secrets/PII appear in telemetry

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-030`
- Gap: `ATLAS-BMR2-GAP-030`

## `ATLAS-BMR2-P4-005` — Implement autoscaling, backpressure and graceful degradation

**Phase:** `P4`  
**Outcome:** Scale on meaningful backlog/saturation while preserving bounded admission and truthful degraded states.  
**Owner:** `principal orchestrator`  
**Gate:** `G4`  
**Initial status:** `NOT_STARTED`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- `ATLAS-BMR2-P4-003`
- `ATLAS-BMR2-P4-004`

**Implementation surfaces**

- worker deployment
- autoscaler
- admission control
- circuit breakers
- retry budgets

**Acceptance criteria**

- Burst recovers within measured objective
- Scale-down drains leases/outbox safely
- Overload rejects or defers explicitly
- Inference/provider faults never fabricate completion
- Local/critical control paths remain available where designed

**Tests and evals**

- burst load test
- drain test
- overload test
- dependency chaos tests

**Required environment**

Staging-like orchestrator

**Required evidence**

`.factory/evidence/atlas-bmr-002/P4/scaling-degradation/`

**Rollback / disable path**

Restore fixed capacity and conservative admission profile

**Falsifier**

> Autoscaling amplifies retries or the system accepts work it cannot durably process

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-031`
- Gap: `ATLAS-BMR2-GAP-031`

## `ATLAS-BMR2-P4-006` — Prove backup, restore and disaster recovery

**Phase:** `P4`  
**Outcome:** Recover durable authorities with measured RPO/RTO and reconcile missions, outbox, receipts, usage and provider state.  
**Owner:** `independent verifier`  
**Gate:** `G4`  
**Initial status:** `NOT_STARTED`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- `ATLAS-BMR2-P4-003`
- `ATLAS-BMR2-P2-006`

**Implementation surfaces**

- database backups
- object storage
- secret/config backup metadata
- restore tooling
- reconciliation jobs

**Acceptance criteria**

- Independent restore succeeds from documented artifacts
- RPO/RTO are measured, not aspirational
- Post-restore reconciliation identifies lost/duplicate/unknown states
- Credentials are not copied unsafely
- Runbook names decision authority

**Tests and evals**

- restore drill
- receipt/outbox reconciliation tests
- secret boundary review
- timed recovery exercise

**Required environment**

Isolated recovery environment

**Required evidence**

`.factory/evidence/atlas-bmr-002/P4/recovery/`

**Rollback / disable path**

Discard restored target; retain source backups and evidence

**Falsifier**

> Backup existence is claimed without restoring and reconciling

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-032`
- Gap: `ATLAS-BMR2-GAP-032`

## `ATLAS-BMR2-P4-007` — Prove deployment, migration, canary and rollback safety

**Phase:** `P4`  
**Outcome:** Create reproducible source-to-artifact promotion with expand/contract migrations and tested rollback.  
**Owner:** `principal orchestrator`  
**Gate:** `G4`  
**Initial status:** `NOT_STARTED`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- `ATLAS-BMR2-P4-001`
- `ATLAS-BMR2-P4-003`
- `ATLAS-BMR2-P4-004`

**Implementation surfaces**

- CI/CD
- artifact registry
- SBOM/provenance
- migrations
- canary controls
- rollback scripts

**Acceptance criteria**

- Artifact digest maps to reviewed commit and dependencies
- Migrations pass compatibility window tests
- Canary exercises real Mission lifecycle
- Rollback is timed and preserves durable events/outbox
- No secret is embedded in artifact

**Tests and evals**

- build reproducibility
- migration contract tests
- canary tests
- rollback drill
- secret/SBOM scan

**Required environment**

CI + staging

**Required evidence**

`.factory/evidence/atlas-bmr-002/P4/deployment-safety/`

**Rollback / disable path**

Execute documented application/config rollback; avoid destructive schema rollback

**Falsifier**

> Rollback requires history rewrite or loses committed actions

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-033`
- Gap: `ATLAS-BMR2-GAP-033`

## `ATLAS-BMR2-P4-008` — Deploy the Atlas Cloud product plane to a production-shaped staging preview

**Phase:** `P4`  
**Outcome:** Operate the durable Atlas Cloud product plane in a production-shaped staging preview for Cloud reliability and integration-readiness testing; do not treat it as the final product release candidate.  
**Owner:** `principal orchestrator`  
**Gate:** `G4`  
**Initial status:** `NOT_STARTED`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- `ATLAS-BMR2-P2-008`
- `ATLAS-BMR2-P3-002`
- `ATLAS-BMR2-P4-005`
- `ATLAS-BMR2-P4-006`
- `ATLAS-BMR2-P4-007`

**Implementation surfaces**

- private Atlas Cloud deployment
- database
- queue
- workers
- secrets
- observability
- status/runbooks

**Acceptance criteria**

- Durable database, queue, workers, secrets and observability are deployed from reproducible artifacts
- Agent/Mission runtime contracts operate on the Cloud topology
- Load, fault, recovery, migration and rollback tests required by P4 pass
- The preview exposes documented interfaces for provider, enterprise and commercial integration
- Evidence explicitly states that P4 is a Cloud product-plane preview, not G8 whole-product staging certification

**Tests and evals**

- staging smoke suite
- flagship journey
- load/fault suite
- restore/rollback recheck

**Required environment**

Production-shaped staging preview environment

**Required evidence**

`.factory/evidence/atlas-bmr-002/P4/cloud-staging-preview/`

**Rollback / disable path**

Rollback release and drain work using runbook

**Falsifier**

> A Cloud-only staging preview is presented as the complete Atlas staging release

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-034`
- Gap: `ATLAS-BMR2-GAP-034`

## `ATLAS-BMR2-P4-009` — Validate Production Atlas Cloud build readiness

**Phase:** `P4`  
**Outcome:** Publish a falsifiable capacity, reliability, recovery and operational-ownership verdict for the Cloud product plane before whole-product integration.  
**Owner:** `independent verifier`  
**Gate:** `G4`  
**Initial status:** `NOT_STARTED`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- `ATLAS-BMR2-P4-002`
- `ATLAS-BMR2-P4-003`
- `ATLAS-BMR2-P4-004`
- `ATLAS-BMR2-P4-005`
- `ATLAS-BMR2-P4-006`
- `ATLAS-BMR2-P4-007`
- `ATLAS-BMR2-P4-008`

**Implementation surfaces**

- release candidate
- all P4 evidence
- runbooks
- ownership roster

**Acceptance criteria**

- Reviewer reproduces critical load, fault and recovery tests
- Capacity envelope names limits and exclusions
- Every alert has owner, escalation and runbook
- Cloud interfaces are compatible with the Agent, provider, enterprise and commercial planes
- The verdict is Cloud build readiness, not final Atlas release certification
- Critical findings block integration

**Tests and evals**

- independent reliability review
- evidence freshness check
- anti-cheat review

**Required environment**

Production-shaped Cloud test environment or staging preview + fresh verifier context

**Required evidence**

`.factory/evidence/atlas-bmr-002/P4/independent-reliability-review.md`

**Rollback / disable path**

Return affected item to IN_PROGRESS; no waiver by implementer

**Falsifier**

> Cloud readiness is inferred from configuration, unit tests, or a partial runtime and promoted as complete Atlas readiness

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-035`
- Gap: `ATLAS-BMR2-GAP-035`

## `ATLAS-BMR2-P5-001` — Build provider readiness registry and certification harness

**Phase:** `P5`  
**Outcome:** Evaluate provider/account/environment readiness progressively instead of using one universal supported flag.  
**Owner:** `principal orchestrator`  
**Gate:** `G5`  
**Initial status:** `NOT_STARTED`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- `ATLAS-BMR2-P1-007`

**Implementation surfaces**

- provider registry
- adapter SDK
- conformance harness
- readiness CLI
- evidence schema

**Acceptance criteria**

- States use DECLARED through PRODUCTION_PROVEN vocabulary
- Readiness is scoped by provider account, capability, environment, region and version
- Harness covers auth, eligibility, webhooks, retry, rate, spend, media, templates and reconciliation
- Blocked/deprecated states are visible

**Tests and evals**

- registry schema tests
- adapter conformance tests
- evidence promotion negative tests

**Required environment**

Local + CI + provider sandboxes where available

**Required evidence**

`.factory/evidence/atlas-bmr-002/P5/provider-harness/`

**Rollback / disable path**

Demote readiness state and disable affected capability

**Falsifier**

> A local adapter test promotes all accounts/regions to production-supported

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-036`
- Gap: `ATLAS-BMR2-GAP-036`

## `ATLAS-BMR2-P5-002` — Harden Resend email operations

**Phase:** `P5`  
**Outcome:** Convert BMR-001 real-send proof into repeatable email operation with inbound/outbound events, authenticity, reconciliation, quotas and outage behavior.  
**Owner:** `principal orchestrator`  
**Gate:** `G5`  
**Initial status:** `NOT_STARTED`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- `ATLAS-BMR2-P5-001`

**Implementation surfaces**

- Resend adapter
- webhook ingress
- credential lifecycle
- delivery reconciliation
- runbooks

**Acceptance criteria**

- Domain/account eligibility is recorded
- Webhook verification and replay/deduplication pass
- Provider status maps truthfully to Atlas receipts
- Rate/quota/spend controls are observable
- Outage and credential rotation runbooks pass

**Tests and evals**

- signed webhook tests
- duplicate/replay tests
- live sandbox/limited test
- quota/fault tests
- rotation test

**Required environment**

Resend test account + staging

**Required evidence**

`.factory/evidence/atlas-bmr-002/P5/resend/`

**Rollback / disable path**

Disable account/capability and route to handoff; preserve queued state

**Falsifier**

> One historical email proves ongoing production readiness

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-037`
- Gap: `ATLAS-BMR2-GAP-037`

## `ATLAS-BMR2-P5-003` — Score and select the second provider lane

**Phase:** `P5`  
**Outcome:** Choose one provider from repository demand and current eligibility evidence using value, geography, complexity, cost and support burden.  
**Owner:** `principal orchestrator`  
**Gate:** `G5`  
**Initial status:** `NOT_STARTED`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- `ATLAS-BMR2-P5-001`

**Implementation surfaces**

- provider scorecard
- demand evidence
- commercial/cost model
- decision record

**Acceptance criteria**

- At least three candidates are scored
- Selection is not based on declared channel count alone
- Account eligibility and budget are explicit
- Unselected providers remain truthful DECLARED/BLOCKED states
- Default recommendation is Twilio SMS only if current evidence still supports it

**Tests and evals**

- scorecard reproducibility
- decision review
- cost/eligibility evidence check

**Required environment**

Planning + current provider documentation/accounts

**Required evidence**

`.factory/evidence/atlas-bmr-002/P5/second-provider-decision.md`

**Rollback / disable path**

Select another candidate through versioned decision; no core redesign

**Falsifier**

> Provider is selected because an adapter filename already exists

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-038`
- Gap: `ATLAS-BMR2-GAP-038`

## `ATLAS-BMR2-P5-004` — Reach provider sandbox proof for the selected lane

**Phase:** `P5`  
**Outcome:** Onboard credentials/account, validate authenticity, send/receive or equivalent sandbox events, reconcile delivery and document limitations.  
**Owner:** `principal orchestrator`  
**Gate:** `G5`  
**Initial status:** `NOT_STARTED`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- `ATLAS-BMR2-P5-003`
- `ATLAS-BMR2-P2-006`

**Implementation surfaces**

- selected provider adapter
- onboarding
- webhooks
- templates/consent as applicable
- receipts

**Acceptance criteria**

- Account/environment eligibility is captured
- Credential lifecycle and webhook authenticity pass
- Rate/retry/delivery mapping pass
- Evidence includes provider IDs redacted safely
- State reaches PROVIDER_SANDBOX_PROVEN only

**Tests and evals**

- provider sandbox outside-in test
- webhook forgery tests
- retry/reconciliation tests
- credential rotation test

**Required environment**

Selected provider sandbox/test account

**Required evidence**

`.factory/evidence/atlas-bmr-002/P5/selected-provider-sandbox/`

**Rollback / disable path**

Revoke credentials, disable lane and demote readiness

**Falsifier**

> Sandbox is unavailable but the lane is marked proven

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-039`
- Gap: `ATLAS-BMR2-GAP-039`

## `ATLAS-BMR2-P5-005` — Run a bounded provider-plane live Mission journey

**Phase:** `P5`  
**Outcome:** Operate a real multi-step Mission over an authorised provider account to validate the provider product plane before complete-product integration.  
**Owner:** `principal orchestrator`  
**Gate:** `G5`  
**Initial status:** `NOT_STARTED`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- `ATLAS-BMR2-P2-008`
- `ATLAS-BMR2-P3-002`
- `ATLAS-BMR2-P4-008`
- `ATLAS-BMR2-P5-002`
- `ATLAS-BMR2-P5-004`

**Implementation surfaces**

- staging/limited production runtime
- provider account
- flagship Mission
- operator control

**Acceptance criteria**

- Exact provider account, capability, region and environment are recorded
- Mission includes policy or approval, committed Action, durable outbox, provider effect and authentic callback/reconciliation
- Delivery and business Outcome remain distinct
- Usage, cost, audit and support signals are captured for downstream integration
- Evidence explicitly states that this is provider-plane readiness, not G8 whole-product staging certification

**Tests and evals**

- outside-in live journey
- receipt reconciliation
- operator takeover test
- budget enforcement test

**Required environment**

Authorised limited-production provider account

**Required evidence**

`.factory/evidence/atlas-bmr-002/P5/live-journey/`

**Rollback / disable path**

Disable provider account/lane and hand off active Missions

**Falsifier**

> A single live send or provider-plane journey is presented as complete Atlas product proof

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-040`
- Gap: `ATLAS-BMR2-GAP-040`

## `ATLAS-BMR2-P5-006` — Exercise provider outage, drift and deprecation operations

**Phase:** `P5`  
**Outcome:** Prove Atlas responds truthfully to provider downtime, webhook drift, API/version change, quota exhaustion and planned deprecation.  
**Owner:** `principal orchestrator`  
**Gate:** `G5`  
**Initial status:** `NOT_STARTED`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- `ATLAS-BMR2-P4-005`
- `ATLAS-BMR2-P5-002`
- `ATLAS-BMR2-P5-004`

**Implementation surfaces**

- provider clients
- circuit breakers
- readiness registry
- runbooks
- status communication

**Acceptance criteria**

- Provider failure does not fabricate delivery/outcome
- Backoff and retry obey provider/idempotency constraints
- Version drift is detected before promotion
- Deprecation has customer migration path
- Support owner and communication template exist

**Tests and evals**

- provider fault injection
- contract drift test
- quota exhaustion test
- deprecation tabletop

**Required environment**

Staging + provider simulators/sandbox

**Required evidence**

`.factory/evidence/atlas-bmr-002/P5/provider-operations/`

**Rollback / disable path**

Demote provider readiness and disable new admissions

**Falsifier**

> Provider outage triggers uncontrolled retry storm or false success

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-041`
- Gap: `ATLAS-BMR2-GAP-041`

## `ATLAS-BMR2-P5-007` — Validate provider and channel product readiness

**Phase:** `P5`  
**Outcome:** Review exact account/environment evidence and issue truthful provider-product readiness states before whole-product integration, without extrapolation.  
**Owner:** `independent verifier`  
**Gate:** `G5`  
**Initial status:** `NOT_STARTED`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- `ATLAS-BMR2-P5-001`
- `ATLAS-BMR2-P5-002`
- `ATLAS-BMR2-P5-003`
- `ATLAS-BMR2-P5-004`
- `ATLAS-BMR2-P5-005`
- `ATLAS-BMR2-P5-006`

**Implementation surfaces**

- provider registry
- live/sandbox evidence
- runbooks
- release candidate

**Acceptance criteria**

- Reviewer verifies redacted account, environment and region scope
- Mocks, sandbox and live proof are distinguished
- Blocked limitations remain visible
- Provider operations integrate with Mission, Cloud, usage/cost, support and audit authorities
- The verdict is provider-plane readiness, not complete Atlas release certification
- No universal supported claim is inferred

**Tests and evals**

- independent provider review
- evidence replay
- readiness-state audit

**Required environment**

Independent context + provider/staging access as authorised

**Required evidence**

`.factory/evidence/atlas-bmr-002/P5/independent-provider-review.md`

**Rollback / disable path**

Demote provider state and reopen failed item

**Falsifier**

> Implementer self-promotes a provider state without independent evidence

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-042`
- Gap: `ATLAS-BMR2-GAP-042`

## `ATLAS-BMR2-P6-001` — Implement organisation, project and environment governance

**Phase:** `P6`  
**Outcome:** Make ownership, environment separation, lifecycle and server-derived tenant context explicit across Atlas Cloud.  
**Owner:** `principal orchestrator`  
**Gate:** `G6`  
**Initial status:** `NOT_STARTED`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- `ATLAS-BMR2-P1-007`

**Implementation surfaces**

- control plane
- organisation/project/environment records
- auth context
- deployment metadata

**Acceptance criteria**

- Organisation/project/environment hierarchy is canonical
- Production/test boundaries are enforced
- Deletion/suspension states are explicit
- No client-selected tenant authority

**Tests and evals**

- cross-tenant negative tests
- environment isolation tests
- lifecycle state tests

**Required environment**

CI + staging

**Required evidence**

`.factory/evidence/atlas-bmr-002/P6/org-governance/`

**Rollback / disable path**

Disable new lifecycle paths and retain existing records

**Falsifier**

> A request body can select another tenant/environment

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-043`
- Gap: `ATLAS-BMR2-GAP-043`

## `ATLAS-BMR2-P6-002` — Implement RBAC, machine identity and scoped credentials

**Phase:** `P6`  
**Outcome:** Enforce least-privilege human and machine access for development, deployment, operations, approval and billing.  
**Owner:** `principal orchestrator`  
**Gate:** `G6`  
**Initial status:** `NOT_STARTED`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- `ATLAS-BMR2-P6-001`

**Implementation surfaces**

- identity service
- RBAC policy
- API keys/service accounts
- approval scopes
- audit

**Acceptance criteria**

- Role/scope matrix is versioned
- Machine credentials are environment-scoped and rotatable
- Approval authority is separate from proposal authority
- Privilege escalation and confused-deputy tests pass

**Tests and evals**

- RBAC matrix tests
- token/key scope tests
- escalation tests
- rotation/revocation tests

**Required environment**

CI + staging identity provider

**Required evidence**

`.factory/evidence/atlas-bmr-002/P6/rbac-machine-identity/`

**Rollback / disable path**

Revoke new scopes/credentials and fall back to stricter access

**Falsifier**

> Broad administrator token is required by ordinary runtime operations

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-044`
- Gap: `ATLAS-BMR2-GAP-044`

## `ATLAS-BMR2-P6-003` — Install SSO assessment, audit export, encryption and secret controls

**Phase:** `P6`  
**Outcome:** Provide enterprise-ready control evidence without making unsupported certification claims.  
**Owner:** `principal orchestrator`  
**Gate:** `G6`  
**Initial status:** `NOT_STARTED`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- `ATLAS-BMR2-P6-002`

**Implementation surfaces**

- OIDC integration or decision record
- audit export
- KMS/encryption
- secret manager
- key rotation

**Acceptance criteria**

- OIDC/SSO scope is justified and tested if implemented
- Audit export is tenant-scoped, tamper-evident and documented
- Encryption/key/secret ownership and rotation are tested
- CMK/SCIM are assessed but not built without justified demand
- No SOC2/ISO/GDPR/HIPAA/PCI claim exceeds evidence

**Tests and evals**

- OIDC negative tests
- audit integrity/export tests
- key rotation test
- secret scan

**Required environment**

Staging + test identity/KMS/secret systems

**Required evidence**

`.factory/evidence/atlas-bmr-002/P6/trust-controls/`

**Rollback / disable path**

Disable federation integration and retain local secure admin path

**Falsifier**

> Marketing compliance claim is created from a control checklist alone

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-045`
- Gap: `ATLAS-BMR2-GAP-045`

## `ATLAS-BMR2-P6-004` — Implement retention, deletion, legal-hold decision and incident controls

**Phase:** `P6`  
**Outcome:** Make data lifecycle and security/abuse response executable across messages, knowledge, memory, missions, receipts and telemetry.  
**Owner:** `principal orchestrator`  
**Gate:** `G6`  
**Initial status:** `NOT_STARTED`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- `ATLAS-BMR2-P6-001`
- `ATLAS-BMR2-P6-003`

**Implementation surfaces**

- data classification
- retention engine
- deletion/export jobs
- incident runbooks
- abuse controls

**Acceptance criteria**

- Data inventory and retention classes exist
- Deletion/export is tenant-scoped and reconciles derived memory/indexes
- Legal hold is an explicit supported/unsupported decision
- Incident severity, notification, containment and evidence roles are named
- Provider data handling is recorded

**Tests and evals**

- retention expiry tests
- deletion/export drill
- cross-tenant negative tests
- incident tabletop

**Required environment**

Staging + disposable tenant

**Required evidence**

`.factory/evidence/atlas-bmr-002/P6/data-lifecycle-incident/`

**Rollback / disable path**

Pause deletion jobs, preserve request ledger, and use manual controlled runbook

**Falsifier**

> Deleting a primary row leaves retrievable derived memory or provider-state ambiguity

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-046`
- Gap: `ATLAS-BMR2-GAP-046`

## `ATLAS-BMR2-P6-005` — Build canonical usage, cost and attribution ledger

**Phase:** `P6`  
**Outcome:** Record model, runtime, tool, provider, media, storage and observability usage against tenant/project/environment/agent/mission/action.  
**Owner:** `principal orchestrator`  
**Gate:** `G6`  
**Initial status:** `NOT_STARTED`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- `ATLAS-BMR2-P1-003`
- `ATLAS-BMR2-P4-002`
- `ATLAS-BMR2-P6-001`

**Implementation surfaces**

- usage event schema
- cost ledger
- pricing inputs
- reconciliation jobs
- receipts

**Acceptance criteria**

- Usage events are idempotent and attributable
- Estimated versus settled cost is distinguished
- Provider/model invoices can reconcile to internal events
- Atlas ledger remains source of runtime truth
- No double counting across retries

**Tests and evals**

- usage idempotency tests
- invoice fixture reconciliation
- retry accounting tests
- tenant attribution tests

**Required environment**

CI + staging + provider/model cost fixtures

**Required evidence**

`.factory/evidence/atlas-bmr-002/P6/usage-cost-ledger/`

**Rollback / disable path**

Disable rating/settlement while retaining raw canonical usage events

**Falsifier**

> Stripe/provider aggregate is treated as the only canonical runtime usage record

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-047`
- Gap: `ATLAS-BMR2-GAP-047`

## `ATLAS-BMR2-P6-006` — Implement quotas, spending controls and abuse/fraud responses

**Phase:** `P6`  
**Outcome:** Enforce understandable plan and customer controls before costly work is admitted.  
**Owner:** `principal orchestrator`  
**Gate:** `G6`  
**Initial status:** `NOT_STARTED`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- `ATLAS-BMR2-P6-002`
- `ATLAS-BMR2-P6-005`

**Implementation surfaces**

- quota service
- budget reservation
- rate limits
- risk signals
- operator override

**Acceptance criteria**

- Hard/soft limits and alert thresholds are explicit
- Spend is reserved before model/provider/tool work where feasible
- Race-safe enforcement passes
- Abuse response can suspend narrowly without corrupting state
- Override is audited and expires

**Tests and evals**

- quota race tests
- budget overshoot tests
- abuse simulation
- override expiry tests

**Required environment**

CI + staging

**Required evidence**

`.factory/evidence/atlas-bmr-002/P6/quotas-spend-abuse/`

**Rollback / disable path**

Switch to conservative admission/approval mode; revoke overrides

**Falsifier**

> Concurrent Missions can exceed hard spend cap materially

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-048`
- Gap: `ATLAS-BMR2-GAP-048`

## `ATLAS-BMR2-P6-007` — Implement bounded self-serve and billing test settlement

**Phase:** `P6`  
**Outcome:** Operate signup, organisation/project creation, sandbox, deployment, channel connection, usage transparency and Stripe test billing lifecycle.  
**Owner:** `principal orchestrator`  
**Gate:** `G6`  
**Initial status:** `NOT_STARTED`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- `ATLAS-BMR2-P3-002`
- `ATLAS-BMR2-P4-008`
- `ATLAS-BMR2-P6-001`
- `ATLAS-BMR2-P6-002`
- `ATLAS-BMR2-P6-005`
- `ATLAS-BMR2-P6-006`

**Implementation surfaces**

- signup/control plane
- billing adapter
- Stripe test mode
- invoices
- lifecycle communications
- support handoff

**Acceptance criteria**

- Starter sandbox works before live provider access
- Plans/quotas use provisional versioned metrics, not unsupported final prices
- Stripe test meter/settlement reconciles to Atlas ledger
- Failed payment, upgrade, downgrade, cancellation, export and deletion paths are tested
- Enterprise handoff and support boundary are explicit

**Tests and evals**

- outside-in self-serve journey
- billing reconciliation tests
- failed-payment tests
- lifecycle tests
- email/notification tests

**Required environment**

Staging + Stripe test mode

**Required evidence**

`.factory/evidence/atlas-bmr-002/P6/self-serve-billing/`

**Rollback / disable path**

Disable new paid activation and retain free/local access; void test artifacts

**Falsifier**

> A successful checkout is treated as commercial readiness without usage reconciliation/support

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-049`
- Gap: `ATLAS-BMR2-GAP-049`

## `ATLAS-BMR2-P6-008` — Validate enterprise and commercial Cloud product readiness

**Phase:** `P6`  
**Outcome:** Adversarially verify the enterprise-governance and commercial product plane before whole-product integration.  
**Owner:** `independent verifier`  
**Gate:** `G6`  
**Initial status:** `NOT_STARTED`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- `ATLAS-BMR2-P6-001`
- `ATLAS-BMR2-P6-002`
- `ATLAS-BMR2-P6-003`
- `ATLAS-BMR2-P6-004`
- `ATLAS-BMR2-P6-005`
- `ATLAS-BMR2-P6-006`
- `ATLAS-BMR2-P6-007`

**Implementation surfaces**

- P6 release candidate
- security tests
- billing evidence
- runbooks

**Acceptance criteria**

- Tenant-isolation and RBAC negative tests pass
- Audit, retention, deletion, encryption and incident controls are exercised
- Usage, cost, quota, spend and billing test settlement reconcile
- Signup, organisation, project, environment and support lifecycle are outside-in tested
- The verdict is product-plane readiness, not complete Atlas release certification
- Unsupported compliance or pricing claims are absent

**Tests and evals**

- independent trust review
- billing replay
- claim audit
- abuse tabletop

**Required environment**

Fresh verifier context + staging/test systems

**Required evidence**

`.factory/evidence/atlas-bmr-002/P6/independent-enterprise-commercial-review.md`

**Rollback / disable path**

Reopen failed item and prevent beta activation

**Falsifier**

> Controls are certified only by their implementer or marketing copy

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-050`
- Gap: `ATLAS-BMR2-GAP-050`

## `ATLAS-BMR2-P7-001` — Stabilise extension contracts and certification kit

**Phase:** `P7`  
**Outcome:** Let third parties build runtime, model, tool, channel/provider and solution extensions against bounded public contracts.  
**Owner:** `principal orchestrator`  
**Gate:** `G7`  
**Initial status:** `NOT_STARTED`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- `ATLAS-BMR2-P3-002`
- `ATLAS-BMR2-P3-004`
- `ATLAS-BMR2-P5-001`

**Implementation surfaces**

- public SDKs
- adapter kits
- template contracts
- conformance suite
- security manifest

**Acceptance criteria**

- Extension types and authority limits are explicit
- Compatibility/support/deprecation policy exists
- Conformance tests include security and failure behavior
- Private Cloud implementation is not leaked
- Marketplace is not required

**Tests and evals**

- extension fixture suite
- compatibility tests
- malicious extension tests
- package boundary scan

**Required environment**

Fresh public-style repository + CI

**Required evidence**

`.factory/evidence/atlas-bmr-002/P7/extension-kit/`

**Rollback / disable path**

Deprecate/disable extension capability by version and preserve core runtime

**Falsifier**

> An extension can bypass Atlas policy, credentials, tenant or receipt authority

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-051`
- Gap: `ATLAS-BMR2-GAP-051`

## `ATLAS-BMR2-P7-002` — Prove independent extension adoption

**Phase:** `P7`  
**Outcome:** Have an independent context build one useful extension and solution pack using only the public kit and documentation.  
**Owner:** `independent verifier`  
**Gate:** `G7`  
**Initial status:** `NOT_STARTED`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- `ATLAS-BMR2-P7-001`

**Implementation surfaces**

- fresh repository
- extension SDK
- docs
- catalogue metadata

**Acceptance criteria**

- Extension passes conformance/security suite
- Solution pack runs local zero-credential journey
- No private imports or maintainer instructions are used
- Friction and missing contracts are repaired

**Tests and evals**

- outside-in extension build
- package boundary test
- security review

**Required environment**

Fresh checkout / independent developer or coding agent

**Required evidence**

`.factory/evidence/atlas-bmr-002/P7/extension-adoption/`

**Rollback / disable path**

Reject extension and fix kit; core runtime unaffected

**Falsifier**

> Founding-team code is relabelled as third-party adoption

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-052`
- Gap: `ATLAS-BMR2-GAP-052`

## `ATLAS-BMR2-P7-003` — Integrate and seal the complete Atlas product release candidate

**Phase:** `P7`  
**Outcome:** Assemble exact versions of every first-class product plane into one source-to-artifact release candidate before whole-product certification.  
**Owner:** `principal orchestrator`  
**Gate:** `G7`  
**Initial status:** `NOT_STARTED`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- `ATLAS-BMR2-P1-007`
- `ATLAS-BMR2-P2-008`
- `ATLAS-BMR2-P3-006`
- `ATLAS-BMR2-P4-009`
- `ATLAS-BMR2-P5-007`
- `ATLAS-BMR2-P6-008`
- `ATLAS-BMR2-P7-002`

**Implementation surfaces**

- release manifest
- Agent/Mission runtime
- developer kit
- Atlas Cloud
- provider operations
- enterprise controls
- commercial controls
- extension kit
- Mirai control interfaces

**Acceptance criteria**

- All required product-plane work items have defensible build-readiness evidence
- One exact source commit, dependency lock, migration set, configuration set and artifact set are bound
- Cross-plane contracts have no duplicate writable authority
- Public/private/Mirai boundaries remain coherent
- The candidate includes Agent, Cloud, provider, enterprise, commercial and ecosystem functionality
- No staging or production claim is made before deployment and whole-product tests

**Tests and evals**

- full build and package matrix
- cross-plane contract tests
- migration compatibility tests
- release manifest validator
- secret and licence scan
- artifact reproducibility check

**Required environment**

CI/build environment plus immutable candidate artifact store

**Required evidence**

`.factory/evidence/atlas-bmr-002/P7/integrated-release-candidate/`

**Rollback / disable path**

Archive the failed candidate, reopen the owning product-plane item, and keep the last known candidate unchanged

**Falsifier**

> A partial Agent demo or isolated Cloud/provider stack is labelled the complete Atlas product candidate

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-053`
- Gap: `ATLAS-BMR2-GAP-053`

## `ATLAS-BMR2-P7-004` — Deploy the exact complete-product candidate to staging

**Phase:** `P7`  
**Outcome:** Deploy the sealed integrated candidate, migrations, configuration and secret references to staging without rebuilding or mutating the artifact.  
**Owner:** `principal orchestrator`  
**Gate:** `G8`  
**Initial status:** `NOT_STARTED`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- `ATLAS-BMR2-P7-003`

**Implementation surfaces**

- staging deployment
- release manifest
- artifact provenance
- database migrations
- queue/workers
- secret references
- observability
- rollback controls

**Acceptance criteria**

- Staging runs the exact reviewed artifact and configuration digests
- Expand/contract migrations and worker compatibility checks pass
- All required services become healthy with causal observability
- No manual unrecorded data or credential mutation is used
- Rollback and stop-admission paths are current before whole-product testing

**Tests and evals**

- deployment preflight
- artifact provenance verification
- migration compatibility test
- hosted smoke suite
- rollback rehearsal
- secret-reference check

**Required environment**

Production-shaped staging environment

**Required evidence**

`.factory/evidence/atlas-bmr-002/P7/staging-deployment/`

**Rollback / disable path**

Restore the previous staging release and archive the failed deployment with exact provenance

**Falsifier**

> Staging is tested from a locally rebuilt or post-review modified artifact

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-054`
- Gap: `ATLAS-BMR2-GAP-054`

## `ATLAS-BMR2-P7-005` — Run whole-product staging certification and independent adoption

**Phase:** `P7`  
**Outcome:** Test the complete Atlas product after all planes are built, integrated and deployed, then issue an independent staging verdict for the exact candidate.  
**Owner:** `independent verifier`  
**Gate:** `G8`  
**Initial status:** `NOT_STARTED`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- `ATLAS-BMR2-P7-004`

**Implementation surfaces**

- whole-product outside-in suite
- provider sandbox/live test lane
- enterprise controls
- usage/cost/billing test mode
- load/fault/security suites
- backup/restore
- developer cohort
- extension conformance
- evidence index

**Acceptance criteria**

- A fresh user completes signup, organisation, project, environment, sandbox, Agent deployment and provider connection
- A durable Mission crosses context, Proposal, policy, approval/handoff, Action, outbox, provider/tool effect, receipt and evidence-backed outcome
- Atlas-native and one external runtime complete the governed path
- Tenant isolation, RBAC, webhook authenticity, abuse, quota and spend negative tests pass
- Usage/cost ledger, billing test settlement, audit export and data-lifecycle controls reconcile
- Load, backpressure, provider outage, worker crash, backup/restore, migration and rollback tests pass
- Independent developers complete greenfield, existing-agent and extension journeys without private knowledge
- No unresolved critical defect or unsupported maturity claim remains

**Tests and evals**

- complete flagship outside-in matrix
- provider certification matrix
- tenant-isolation and abuse suite
- usage/cost/billing reconciliation
- load and fault campaign
- backup/restore and rollback campaign
- independent developer cohort
- independent extension adoption
- evidence freshness and anti-cheat review

**Required environment**

Exact staging candidate + authorised provider sandbox/test account + billing test mode + fresh independent contexts

**Required evidence**

`.factory/evidence/atlas-bmr-002/P7/whole-product-staging-certification/`

**Rollback / disable path**

Hold promotion, roll back staging if unsafe, reopen the owning work item, repair, rebuild the complete candidate and rerun the full certification

**Falsifier**

> Disconnected component demos or pre-integration tests are substituted for one causally connected whole-product journey

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-055`
- Gap: `ATLAS-BMR2-GAP-055`

## `ATLAS-BMR2-P7-006` — Promote to bounded production and run the customer operations cohort

**Phase:** `P7`  
**Outcome:** Promote the staging-certified candidate only under explicit authority, then operate sustained real customer Missions inside a declared provider, capacity, spend, data and support envelope.  
**Owner:** `principal orchestrator`  
**Gate:** `G9`  
**Initial status:** `NOT_STARTED`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- `ATLAS-BMR2-P7-005`

**Implementation surfaces**

- production deployment
- promotion record
- canary
- provider accounts
- Mirai/public operator contracts
- usage/billing
- status/support
- incident response
- rollback controls

**Acceptance criteria**

- Explicit user/founder production authority is recorded
- Region, customer/tenant cap, provider accounts, data classes, spend, SLOs, support hours and rollback owner are recorded
- Canary and live full-product Mission pass with reconciled receipts and cost
- The cohort runs for a declared evidence window with handoff and incident ownership exercised
- Failure triggers stop-admission, provider-lane disablement, handoff or rollback as designed
- No global, 24x7, every-provider or general-availability claim is made
- Push, merge, publication and tag actions remain separately authorised

**Tests and evals**

- production preflight
- canary whole-product journey
- sustained operations evaluation
- live receipt and cost reconciliation
- incident and support drill
- rollback readiness check

**Required environment**

Explicitly authorised limited-production environment and customer/provider cohort

**Required evidence**

`.factory/evidence/atlas-bmr-002/P7/production-and-customer-cohort/`

**Rollback / disable path**

Stop admission, drain or hand off active Missions, disable affected provider lanes, roll back application/configuration and preserve evidence

**Falsifier**

> Claude promotes production or onboards unbounded customers without explicit authority and an operable support/rollback envelope

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-056`
- Gap: `ATLAS-BMR2-GAP-056`

## `ATLAS-BMR2-P7-007` — Final independent certification and BMR-002 closure

**Phase:** `P7`  
**Outcome:** Issue a truthful terminal verdict, close or isolate residual risk, and preserve exact programme provenance.  
**Owner:** `independent verifier`  
**Gate:** `G9`  
**Initial status:** `NOT_STARTED`  
**Initial maturity:** `DOCUMENTED_ONLY`

**Dependencies**

- `ATLAS-BMR2-P7-005`

**Implementation surfaces**

- execution board
- execution log
- release decisions
- evidence index
- checksums
- tag proposal

**Acceptance criteria**

- All dependency-reachable work items have defensible disposition
- Independent review replays the complete staging evidence and critical product-plane evidence
- Known limitations, deferred work and external blockers remain visible
- BMR-001 history remains unchanged
- If P7-006 is not PASS solely for missing production authority/cohort access, issue the staging-certified terminal verdict
- ATLAS_BMR_002_EXECUTION_COMPLETE requires P7-006 PASS
- Closure tag, merge, push and publication are only prepared unless separately authorised

**Tests and evals**

- board/dependency validator
- whole-product evidence audit
- checksum verification
- history boundary check
- independent closure review

**Required environment**

Repository + all authorised environments

**Required evidence**

`.factory/evidence/atlas-bmr-002/P7/final-certification/`

**Rollback / disable path**

Use ROLLED_BACK or FAILED verdict; preserve evidence and do not rewrite history

**Falsifier**

> Programme declares completion from workstream readiness or a staging pass while required production evidence is absent

**Traceability**

- Requirement: `ATLAS-BMR2-REQ-057`
- Gap: `ATLAS-BMR2-GAP-057`



<!-- END 15_EXECUTION_PROGRAMME.md -->


---

<!-- BEGIN 16_VERIFICATION_EVAL_AND_RELEASE_GATES.md -->

# Verification, Evaluation and Release Gates

**Programme:** `ATLAS-BMR-002`  
**Package version:** `3.0.0-execution`  
**Date:** `2026-07-29`  
**Status:** `EXECUTION AUTHORITY`


## Evidence doctrine

Every material claim follows:

```text
requirement
→ source implementation
→ focused construction tests
→ failure and abuse tests
→ integrated release candidate
→ whole-product outside-in journey
→ exact staging/provider/billing evidence
→ independent reproduction
→ release gate
```

A document, migration file, configured service, screenshot, mock, isolated unit test, old provider receipt or green workstream gate is not sufficient for Atlas release certification.

## Test timing

- **During build:** run deterministic schema, unit, property, integration, migration, security and focused fault tests continuously.
- **At G1–G6:** verify each first-class product plane is safe and coherent enough to integrate. These are construction gates.
- **At G7:** assemble and seal the complete product candidate.
- **At G8:** deploy the exact candidate to staging and test the full product end to end.
- **At G9:** run explicitly authorised bounded production and close from live evidence.

Do not defer all testing until the end. Do not mistake early tests for final certification.

## Anti-cheat rules

1. Do not replace the required outside-in path with direct database writes, internal APIs or manual choreography.
2. Do not use test-only authority in staging or production.
3. Do not promote provider readiness from simulator evidence.
4. Do not mark a Mission complete because a model said it succeeded.
5. Do not stub approvals, delivery, usage, cost, billing, audit or outcomes in release evidence.
6. Do not disable assertions, skip failing cases or narrow fixtures without a versioned requirement decision.
7. Do not use evidence from another commit, artifact, account, region or environment.
8. Do not self-certify a gate requiring independent review.
9. Do not expose secrets or customer content to make evidence easier.
10. Do not silently accept unknown provider or business state as success.
11. Do not use a G1–G6 workstream verdict as a G8 whole-product verdict.
12. Do not certify a partial product that omits a required Agent, Cloud, provider, enterprise, commercial or ecosystem plane.

## Test layers

| Layer | Purpose |
| --- | --- |
| Schema/type | Contract validity, compatibility and invalid input. |
| Unit/property | State transitions, policy, budgets, idempotency and invariants. |
| Integration | Database, queue, worker, secret, provider/tool, billing and identity boundaries. |
| Migration | Expand/contract, old/new binaries, data backfill and rollback safety. |
| Outside-in | Complete developer/customer lifecycle through supported public surfaces. |
| Fault/chaos | Crash, timeout, duplicate, reorder, saturation, outage and unknown state. |
| Security/abuse | Tenant isolation, auth/scope, forgery, replay, injection, secret, fraud and extension behavior. |
| Performance | Workload envelope, saturation, fairness, recovery and cost. |
| Environment | Exact staging/provider/billing/limited-production proof. |
| Adoption | Fresh human/coding-agent/partner completion without private knowledge. |
| Whole-product | One integrated candidate spanning signup, deployment, Mission, provider effect, receipts, governance, commercial controls and recovery. |

## Evidence metadata

Every evidence artifact includes programme, phase, work item, gate, source commit, dirty-state declaration, artifact/configuration digest, environment, region, provider/billing account scope, command or journey version, timestamps, actor, independent reviewer, raw result location, redactions, limitations, verdict and checksum.

## `G0` — Certified baseline gate

**Phase:** `P0`

**Pass only when**

- Closure commit/tag are verified or a versioned erratum exists
- Current branch/worktree/drift is recorded
- BMR-001 history and tag remain unchanged
- BMR-002 package is installed and validation-clean
- Complete-product thesis and boundaries are reconciled against repository truth

**Automatic falsifiers**

- Closure claim cannot be reconciled
- Unrelated work would be overwritten
- Historical evidence was silently edited
- A first-class product plane is removed without an evidence-backed decision

**Verdict vocabulary**

```text
NOT_EVALUATED
IN_PROGRESS
PASS
FAIL
BLOCKED_EXTERNAL
ROLLED_BACK
```

## `G1` — Shared agentic foundations build-readiness gate

**Phase:** `P1`

**Pass only when**

- Versioned Agent and durable Mission contracts exist
- Proposal/Decision/Action/Receipt/Outcome/Learning authority is explicit
- Persistent zero-credential local Mission survives restart
- Public/private/Mirai boundaries are schema- and adversarially tested
- Verdict is recorded as build readiness only

**Automatic falsifiers**

- Mission is only an HTTP request or prompt
- Agent can bypass tenant/policy/action authority
- Restart loses Mission state
- G1 is presented as complete-product certification

**Verdict vocabulary**

```text
NOT_EVALUATED
IN_PROGRESS
PASS
FAIL
BLOCKED_EXTERNAL
ROLLED_BACK
```

## `G2` — Durable execution build-readiness gate

**Phase:** `P2`

**Pass only when**

- Coordinator leasing/resume and wait/trigger semantics pass
- Action-specific autonomy and budgets are server-enforced
- Approvals, handoff and cancellation are durable
- Fault injection shows no duplicate logical effect
- Memory and learning carry provenance and review state
- Verdict is recorded as build readiness only

**Automatic falsifiers**

- Agent self-approves
- Retries duplicate effects
- Untrusted memory becomes durable truth
- Paused/cancelled Missions continue acting
- G2 is presented as complete-product certification

**Verdict vocabulary**

```text
NOT_EVALUATED
IN_PROGRESS
PASS
FAIL
BLOCKED_EXTERNAL
ROLLED_BACK
```

## `G3` — Developer product build-readiness gate

**Phase:** `P3`

**Pass only when**

- Empty-folder and existing-agent journeys pass
- CLI/SDK/API are version matched
- Atlas-native and one external runtime produce governed Proposals
- Local journey remains zero credential
- Verdict is recorded as build readiness only

**Automatic falsifiers**

- External runtime can send directly
- Docs require hidden monorepo knowledge
- Local journey requires Cloud/provider/model credentials
- G3 is presented as complete-product certification

**Verdict vocabulary**

```text
NOT_EVALUATED
IN_PROGRESS
PASS
FAIL
BLOCKED_EXTERNAL
ROLLED_BACK
```

## `G4` — Production Atlas Cloud build-readiness gate

**Phase:** `P4`

**Pass only when**

- Production mode rejects memory/test authorities
- Capacity and cost envelope are measured
- SLOs and error-budget actions are computable
- Backup/restore, migration and rollback drills pass
- Cloud interfaces support all other product planes
- Verdict is recorded as Cloud build readiness only

**Automatic falsifiers**

- Only local proof exists
- False success appears during dependency failure
- Restore cannot reconcile receipts
- No named incident owner
- G4 is presented as complete-product certification

**Verdict vocabulary**

```text
NOT_EVALUATED
IN_PROGRESS
PASS
FAIL
BLOCKED_EXTERNAL
ROLLED_BACK
```

## `G5` — Provider and channel product build-readiness gate

**Phase:** `P5`

**Pass only when**

- Readiness is account/environment specific
- Webhook authenticity, retry, limit, spend, reconciliation and outage behavior pass
- Resend is hardened
- One additional provider reaches sandbox proof or is truthfully blocked
- Provider operations integrate with usage, support and audit
- Verdict is recorded as provider-plane readiness only

**Automatic falsifiers**

- Mocks are promoted as live proof
- Provider credentials leak
- Unsupported account/region is called production-supported
- G5 is presented as complete-product certification

**Verdict vocabulary**

```text
NOT_EVALUATED
IN_PROGRESS
PASS
FAIL
BLOCKED_EXTERNAL
ROLLED_BACK
```

## `G6` — Enterprise and commercial product build-readiness gate

**Phase:** `P6`

**Pass only when**

- Tenant isolation and RBAC negative tests pass
- Audit and data-lifecycle controls are exercised
- Canonical usage/cost ledger reconciles
- Quota/spend actions are enforced
- Self-serve and billing test settlement pass
- Verdict is recorded as enterprise/commercial build readiness only

**Automatic falsifiers**

- Billing provider becomes runtime source of truth
- Unsupported compliance claim is made
- Deletion/retention behavior is untested
- G6 is presented as complete-product certification

**Verdict vocabulary**

```text
NOT_EVALUATED
IN_PROGRESS
PASS
FAIL
BLOCKED_EXTERNAL
ROLLED_BACK
```

## `G7` — Complete product integration gate

**Phase:** `P7`

**Pass only when**

- All required G1-G6 product planes have defensible build-readiness evidence
- One exact source/dependency/migration/configuration/artifact candidate is sealed
- Cross-plane contracts have no duplicate writable authority
- Agent, Cloud, provider, enterprise, commercial, ecosystem and Mirai-compatible controls are included
- Candidate is reproducible and deployable

**Automatic falsifiers**

- A partial product is labelled complete
- Candidate is assembled from incompatible or untracked versions
- A first-class plane is omitted without an explicit scope decision
- Public/private/Mirai authority is duplicated

**Verdict vocabulary**

```text
NOT_EVALUATED
IN_PROGRESS
PASS
FAIL
BLOCKED_EXTERNAL
ROLLED_BACK
```

## `G8` — Whole-product staging certification gate

**Phase:** `P7`

**Pass only when**

- Exact integrated candidate is deployed to staging with provenance
- One causally connected full-product journey passes from signup through outcome, usage, billing and audit
- Provider, tenant-isolation, abuse, load, fault, recovery, migration and rollback campaigns pass
- Independent developer and extension adoption pass
- Evidence index/checksums validate and no critical defect remains

**Automatic falsifiers**

- Component demos replace the whole-product journey
- Staging source/artifact differs from the reviewed candidate
- Required migration or secret steps are manual/unrecorded
- Critical evidence is stale
- A workstream gate is substituted for G8

**Verdict vocabulary**

```text
NOT_EVALUATED
IN_PROGRESS
PASS
FAIL
BLOCKED_EXTERNAL
ROLLED_BACK
```

## `G9` — Bounded production and closure gate

**Phase:** `P7`

**Pass only when**

- Explicit promotion authority is recorded
- Bounded production envelope, provider accounts, budget, data classes, support hours and rollback authority are recorded
- Canary and sustained customer cohort pass
- Live usage, cost, delivery, audit and outcome receipts reconcile
- Independent release review passes
- All work items are PASS, truthfully blocked, or explicitly removed from closure scope

**Automatic falsifiers**

- Production is promoted without authority
- Programme claims global/24x7/general availability without proof
- Open critical risks lack owner and disposition
- Execution complete is declared without the production cohort

**Verdict vocabulary**

```text
NOT_EVALUATED
IN_PROGRESS
PASS
FAIL
BLOCKED_EXTERNAL
ROLLED_BACK
```


## Final release decision

The final review evaluates all gate verdicts, BMR-001 preservation, exact source/artifact/environment provenance, whole-product staging evidence, known risks/blockers, operational ownership, production authority and rollback/stop-admission readiness.

Use exactly one terminal verdict:

```text
ATLAS_BMR_002_EXECUTION_COMPLETE
ATLAS_BMR_002_STAGING_CERTIFIED_PRODUCTION_APPROVAL_REQUIRED
ATLAS_BMR_002_EXECUTION_BLOCKED_EXTERNAL
ATLAS_BMR_002_EXECUTION_FAILED
ATLAS_BMR_002_ROLLED_BACK
```

Do not create a closure tag, push, merge, publish or change visibility unless explicitly authorised.


<!-- END 16_VERIFICATION_EVAL_AND_RELEASE_GATES.md -->


---

<!-- BEGIN 17_DEPLOYMENT_PROMOTION_AND_ROLLBACK_RUNBOOK.md -->

# Deployment, Promotion and Rollback Runbook

**Programme:** `ATLAS-BMR-002`  
**Package version:** `3.0.0-execution`  
**Date:** `2026-07-29`  
**Status:** `EXECUTION AUTHORITY`


## Scope

This runbook directs Claude Code to move BMR-002 through local, CI, staging and explicitly authorised limited production. It does not grant production, push, merge, tag, package-publication or repository-visibility authority.

## Environment ladder

```text
local deterministic
→ CI/disposable integration
→ provider sandbox/test
→ production-shaped staging
→ limited production (explicit authority)
→ production-proven (separate sustained evidence)
```

No rung is inferred from the previous one.

## Pre-deployment discovery

Before changing deployment files:

1. Identify current deployment system, accounts, regions, secret manager, database, queue, artifact registry and owners.
2. Read repository deployment instructions and active adjacent programmes.
3. Map exact BMR-001 deployment evidence to current resources.
4. Verify credentials by metadata/health without printing values.
5. Identify irreversible or externally billable actions.
6. Record source branch/commit and dirty state.
7. Select a rollback target and stop-admission method.

Do not invent a second deployment stack when a current owner exists.

## Candidate build

A candidate must have:

- clean reviewed source or recorded bounded dirty state;
- lockfile/dependency integrity;
- reproducible build;
- artifact digest;
- SBOM/dependency report where repository supports it;
- secret scan;
- migration plan;
- configuration/feature flag plan;
- test manifest;
- release/evidence manifest.

## Database migration

Use expand/contract:

1. add backward-compatible schema/indexes;
2. deploy code able to read old/new shape;
3. backfill idempotently with metrics/checkpoints;
4. verify old/new binary compatibility;
5. switch writes/reads deliberately;
6. retain rollback window;
7. remove old shape only in a later independently safe release.

Never run a destructive migration merely because local tests pass.

## Staging deployment

When existing staging access and repository rules permit, Claude Code proceeds without asking the user to re-plan:

- preflight infrastructure and secrets;
- apply compatible migrations;
- deploy candidate;
- wait for health and worker readiness;
- run smoke plus flagship Mission;
- run provider sandbox tests;
- execute prescribed load/fault/rollback/recovery tests;
- capture exact evidence;
- fix or roll back failures.

If credentials/access are absent, mark only the deployment/provider item `BLOCKED_EXTERNAL`, create the exact required-access record, and continue independent work.

## Two staging uses

BMR-002 uses staging in two distinct ways:

1. **Product-plane previews during P2–P6.** These environments support focused Cloud, provider, enterprise, commercial and integration-readiness tests. They can satisfy only the owning build-readiness gate.
2. **Exact complete-product candidate during P7.** P7-004 deploys the sealed G7 candidate without rebuilding it. P7-005 then runs the whole-product certification matrix. Only this path can support G8.

Never promote a P4 Cloud preview or P5 provider proof into a whole-product staging verdict.

## Canary

Canary validates:

- real ingress;
- Mission persistence/resume;
- policy/approval;
- transactional Action/outbox;
- worker/provider callback;
- receipts/outcome;
- usage/cost;
- operator control;
- telemetry;
- migration compatibility.

A health endpoint alone is not a canary.

## Promotion record

Before limited production record:

```text
authority issuer
source commit/artifact
region
tenant/customer cap
provider accounts/capabilities
data classes
autonomy/action limits
spend/quota
SLO/error-budget policy
support hours/owners
incident and provider escalation
canary window
rollback/stop-admission owner
expiry/review date
```

Without explicit authority, finish with:

```text
ATLAS_BMR_002_STAGING_CERTIFIED_PRODUCTION_APPROVAL_REQUIRED
```

## Rollback triggers

Examples:

- tenant-isolation or credential exposure;
- duplicate/false committed effect;
- receipt/audit corruption;
- unsafe migration;
- provider retry storm or uncontrolled spend;
- severe SLO/error-budget breach;
- operator control unavailable;
- unknown release provenance;
- critical security finding.

## Rollback sequence

1. Stop or reduce new Mission admission.
2. Preserve evidence and current durable state.
3. Pause risky triggers/actions/provider lanes.
4. Drain or quarantine in-flight work by documented semantics.
5. Roll back application/configuration to the verified target.
6. Avoid destructive schema rollback; forward-fix where necessary.
7. Reconcile Actions, outbox, provider state, receipts and usage.
8. Handoff/communicate affected active Missions.
9. Verify recovery with outside-in journey.
10. record incident and terminal/phase verdict.

## Public release

Public package/repository publication is separate from Cloud deployment. Prepare artifacts, provenance, licences and release notes, but do not publish, push, merge, tag or change visibility without explicit user authority.


<!-- END 17_DEPLOYMENT_PROMOTION_AND_ROLLBACK_RUNBOOK.md -->


---

<!-- BEGIN 18_RISK_BLOCKER_AND_EXTERNAL_DEPENDENCY_REGISTER.md -->

# Risk, Blocker and External Dependency Register

**Programme:** `ATLAS-BMR-002`  
**Package version:** `3.0.0-execution`  
**Date:** `2026-07-29`  
**Status:** `EXECUTION AUTHORITY`


## Risk register

| ID | Risk | Severity | Phase | Control |
| --- | --- | --- | --- | --- |
| RISK-001 | BMR-001 closure differs from handover | CRITICAL | P0 | Record erratum/regression; do not mutate history; repair prerequisite. |
| RISK-002 | BMR-002 becomes an infrastructure programme without Agent product | CRITICAL | P1 | Constitution, P1/P2 gates and independent anti-renaming review. |
| RISK-003 | Mission is implemented as renamed request/workflow | CRITICAL | P1 | Durable lifecycle, restart, waits, control, action and outcome tests. |
| RISK-004 | Duplicate committed effects on retry/crash | CRITICAL | P2 | Transactional Action/outbox, idempotency, fault-point tests. |
| RISK-005 | Agent self-approval or scope escalation | CRITICAL | P2/P6 | Server policy, separate actors/scopes, forgery/escalation tests. |
| RISK-006 | Memory poisoning becomes durable authority | HIGH | P2 | Provenance, review, retention and poisoning tests. |
| RISK-007 | External runtime bypasses Atlas | CRITICAL | P3 | Proposal-only protocol, credential/tenant negative tests. |
| RISK-008 | Local experience regresses due to Cloud work | HIGH | P1-P4 | Zero-credential journey at every relevant gate. |
| RISK-009 | Memory/test authorities reach production | CRITICAL | P4 | Production boot fail-closed matrix. |
| RISK-010 | Queue/worker topology creates noisy neighbours | HIGH | P4 | Partition/fairness/admission tests. |
| RISK-011 | Capacity or SLO claims are unmeasured | HIGH | P4 | Versioned workload and independently reproduced envelope. |
| RISK-012 | Backup exists but business recovery fails | CRITICAL | P4 | Restore plus outbox/provider/receipt reconciliation drill. |
| RISK-013 | Migration rollback loses active Missions | CRITICAL | P4 | Expand/contract and old/new compatibility/canary. |
| RISK-014 | Provider mocks promoted as production support | CRITICAL | P5 | Scoped readiness registry and independent promotion review. |
| RISK-015 | Provider credential/content leaks into evidence | CRITICAL | P5/P6 | Secret manager, redaction tests, evidence scan. |
| RISK-016 | Provider eligibility or policy blocks chosen lane | HIGH | P5 | Scorecard and BLOCKED_PROVIDER state; continue other work. |
| RISK-017 | Retry storm/uncontrolled provider spend | HIGH | P4/P5/P6 | Retry budgets, circuit breakers, quotas and spend reservations. |
| RISK-018 | Atlas and Mirai write competing authority | CRITICAL | P0/P2/P6 | Ownership census and public control contracts. |
| RISK-019 | Unsupported compliance or residency claims | HIGH | P6 | Control/evidence/process/audit classification and claim review. |
| RISK-020 | Cross-tenant data or billing leakage | CRITICAL | P1/P4/P6 | Isolation tests across every storage/queue/export/usage boundary. |
| RISK-021 | Billing settlement diverges from runtime truth | HIGH | P6 | Canonical usage ledger and reconciliation. |
| RISK-022 | Hard spend cap races under concurrency | HIGH | P2/P6 | Atomic reservation and overshoot tests. |
| RISK-023 | Marketplace built before safe extension model | MEDIUM | P7 | Extension conformance/adoption first; decision gate. |
| RISK-024 | Only founding team can adopt Atlas | HIGH | P3/P7 | Fresh-context developer and extension cohorts. |
| RISK-025 | Production promoted without support/rollback authority | CRITICAL | P7 | Explicit promotion record and G9. |
| RISK-026 | Claude workers redesign or implement conflicting solutions | HIGH | All | Workers restricted to verification/test/review/commit. |
| RISK-027 | Chat/session compaction loses programme state | HIGH | All | Execution log, board, SessionStart compact hook. |
| RISK-028 | Unrelated repository work is overwritten | CRITICAL | P0/All | Worktree census, isolated lane, no reset/clean/rebase/force-push. |
| RISK-029 | Evidence belongs to wrong commit/environment | CRITICAL | All | Evidence metadata, checksums and independent freshness review. |
| RISK-030 | External blocker stops entire programme | MEDIUM | All | Block only affected lane and continue DAG-ready work. |

## Blocker vocabulary

| State | Meaning | Required response |
| --- | --- | --- |
| BLOCKED_INTERNAL | Repository/design/test contradiction under programme control | Diagnose, repair, update evidence; do not bypass. |
| BLOCKED_EXTERNAL | Missing account, credential, provider eligibility, infrastructure access, approval or external service | Complete all independent work, record exact unblock action, continue DAG. |
| HOLD | Deliberate scope hold due to decision/economics | Record decision owner, expiry and replacement path. |
| FAIL | Acceptance or gate is falsified | Repair or roll back. |
| ROLLED_BACK | Implemented/deployed slice was reverted | Reconcile state/evidence before reattempt. |

## External dependencies

| Dependency | Needed for | Evidence required | Behavior when absent |
| --- | --- | --- | --- |
| Live BMR worktree | P0 onward | Local path, Git objects and readable source | Package remains installation artifact; execution cannot claim baseline. |
| Staging infrastructure/access | P4/P7 | Account/project/region/resource identity | Block staging items; complete code/tests/runbooks. |
| Provider test/live accounts | P5/P7 | Account/capability/region/eligibility metadata | Keep scoped readiness lower; continue harness. |
| Secret/KMS manager | P4–P6 | Metadata/health/rotation without values | Use local safe fixtures; block real activation. |
| Billing test account | P6 | Stripe or current provider test identity | Complete canonical ledger; block settlement journey. |
| Identity provider | P6 | OIDC app/tenant test configuration | Complete RBAC/local auth; record SSO decision. |
| Customer/developer cohort | P7 | Consent, scope, evaluation protocol | Run clean-room coding-agent eval; do not call it human/customer adoption. |
| Production authorisation | P7 | Explicit recorded user/founder authority | Stop at staging-certified verdict. |
| Support/incident owners | P4/P7 | Named roster and escalation | No limited-production promotion. |

## Unblock record

```yaml
blocker_id:
work_item:
external_owner:
exact_missing_access_or_decision:
why_required:
work_completed_without_it:
safety_or_cost:
one_unblock_action:
date_recorded:
next_review:
```


<!-- END 18_RISK_BLOCKER_AND_EXTERNAL_DEPENDENCY_REGISTER.md -->


---

<!-- BEGIN 19_REQUIREMENTS_TRACEABILITY_MATRIX.md -->

# Requirements Traceability Matrix

**Programme:** `ATLAS-BMR-002`  
**Package version:** `3.0.0-execution`  
**Date:** `2026-07-29`  
**Status:** `EXECUTION AUTHORITY`


## Traceability rule

Every requirement maps:

```text
Product requirement
→ current gap
→ work item
→ source implementation
→ construction tests
→ exact environment evidence
→ product-plane readiness gate
→ complete-product G7/G8/G9 release path
```

The complete machine authority is `requirements-traceability.v3.json`. G1–G6 do not independently certify Atlas for release.

| Requirement | Product requirement | Gap | Work item | Gate |
| --- | --- | --- | --- | --- |
| ATLAS-BMR2-REQ-001 | Create a repository-derived closure verification record or a versioned post-closure erratum without mutating BMR-001 history. | ATLAS-BMR2-GAP-001 | ATLAS-BMR2-P0-001 | G0 |
| ATLAS-BMR2-REQ-002 | Map public packages, private cloud, Mirai interfaces, runtime adapters, channels, providers, deployment, tests, and evidence to truthful maturity states. | ATLAS-BMR2-GAP-002 | ATLAS-BMR2-P0-002 | G0 |
| ATLAS-BMR2-REQ-003 | Create a current gap and dependency map without absorbing Mirai ONE, AI Front Desk, AtlasAPI, Runtime-003, performance, provenance, or GTM authorities. | ATLAS-BMR2-GAP-003 | ATLAS-BMR2-P0-003 | G0 |
| ATLAS-BMR2-REQ-004 | Confirm or narrowly amend the Production Agentic Business Messaging Platform thesis using verified BMR-001 reality while preserving every first-class product plane and boundary. | ATLAS-BMR2-GAP-004 | ATLAS-BMR2-P0-004 | G0 |
| ATLAS-BMR2-REQ-005 | Install the BMR-002 package canonically, create the execution branch strategy, validate machine authorities, and establish persistent programme memory. | ATLAS-BMR2-GAP-005 | ATLAS-BMR2-P0-005 | G0 |
| ATLAS-BMR2-REQ-006 | Make a versioned Agent package and immutable deployed Agent version first-class public contracts. | ATLAS-BMR2-GAP-006 | ATLAS-BMR2-P1-001 | G1 |
| ATLAS-BMR2-REQ-007 | Represent a bounded business goal as durable tenant-scoped state with an append-only lifecycle and explicit terminal outcomes. | ATLAS-BMR2-GAP-007 | ATLAS-BMR2-P1-002 | G1 |
| ATLAS-BMR2-REQ-008 | Separate reasoning proposals from Atlas-governed decisions, committed effects, delivery receipts, business outcomes, and reviewed learning. | ATLAS-BMR2-GAP-008 | ATLAS-BMR2-P1-003 | G1 |
| ATLAS-BMR2-REQ-009 | Persist missions, lifecycle events, steps, waits, decisions, actions and receipt links in tenant-scoped durable storage. | ATLAS-BMR2-GAP-009 | ATLAS-BMR2-P1-004 | G1 |
| ATLAS-BMR2-REQ-010 | Run one complete observe–reason–propose–govern–act–observe Mission locally with deterministic fixtures and no credentials. | ATLAS-BMR2-GAP-010 | ATLAS-BMR2-P1-005 | G1 |
| ATLAS-BMR2-REQ-011 | Give developers safe control and observability over local Missions without database access. | ATLAS-BMR2-GAP-011 | ATLAS-BMR2-P1-006 | G1 |
| ATLAS-BMR2-REQ-012 | Obtain an adversarial build-readiness review proving that the shared Agent/Mission and authority contracts are genuine, durable and safe to integrate with every other product plane. | ATLAS-BMR2-GAP-012 | ATLAS-BMR2-P1-007 | G1 |
| ATLAS-BMR2-REQ-013 | Allow many coordinators to process Missions without concurrent ownership or abandoned work. | ATLAS-BMR2-GAP-013 | ATLAS-BMR2-P2-001 | G2 |
| ATLAS-BMR2-REQ-014 | Start and resume Missions from inbound events, schedules, provider callbacks, approvals, deadlines and business signals. | ATLAS-BMR2-GAP-014 | ATLAS-BMR2-P2-002 | G2 |
| ATLAS-BMR2-REQ-015 | Enforce server-side autonomy levels, risk classes, time/step/token/spend budgets and escalation behavior per action. | ATLAS-BMR2-GAP-015 | ATLAS-BMR2-P2-003 | G2 |
| ATLAS-BMR2-REQ-016 | Model human control as first-class commands and state transitions usable by Mirai or another operator surface. | ATLAS-BMR2-GAP-016 | ATLAS-BMR2-P2-004 | G2 |
| ATLAS-BMR2-REQ-017 | Allow Missions to read scoped knowledge and memory while keeping source provenance, confidence, retention, tenant boundary and review state explicit. | ATLAS-BMR2-GAP-017 | ATLAS-BMR2-P2-005 | G2 |
| ATLAS-BMR2-REQ-018 | Commit business actions exactly once and deliver provider/tool effects through a durable outbox with canonical receipts. | ATLAS-BMR2-GAP-018 | ATLAS-BMR2-P2-006 | G2 |
| ATLAS-BMR2-REQ-019 | Resolve partial failure without fabricating rollback or outcome success. | ATLAS-BMR2-GAP-019 | ATLAS-BMR2-P2-007 | G2 |
| ATLAS-BMR2-REQ-020 | Prove an agent can initiate and continue a bounded business objective over time while respecting triggers, budgets, approvals, memory, recovery and outcomes. | ATLAS-BMR2-GAP-020 | ATLAS-BMR2-P2-008 | G2 |
| ATLAS-BMR2-REQ-021 | Make agent packages, mission types, policies, tools, knowledge, tests and deployment intent understandable from one project. | ATLAS-BMR2-GAP-021 | ATLAS-BMR2-P3-001 | G3 |
| ATLAS-BMR2-REQ-022 | Expose create, signal, inspect, pause, resume, cancel, approve, handoff, replay, deploy and evidence operations consistently. | ATLAS-BMR2-GAP-022 | ATLAS-BMR2-P3-002 | G3 |
| ATLAS-BMR2-REQ-023 | Connect Atlas-native inference to the proposal protocol with traceable context, tool proposals, budgets and typed failures. | ATLAS-BMR2-GAP-023 | ATLAS-BMR2-P3-003 | G3 |
| ATLAS-BMR2-REQ-024 | Allow an external agent runtime to reason and propose through Atlas without receiving authority over tenant, approval, credentials, effects or receipts. | ATLAS-BMR2-GAP-024 | ATLAS-BMR2-P3-004 | G3 |
| ATLAS-BMR2-REQ-025 | Make Atlas and this programme executable by coding agents from public contracts and repository-resident instructions. | ATLAS-BMR2-GAP-025 | ATLAS-BMR2-P3-005 | G3 |
| ATLAS-BMR2-REQ-026 | Prove two independent journeys: empty-folder Atlas-native and existing external agent integration. | ATLAS-BMR2-GAP-026 | ATLAS-BMR2-P3-006 | G3 |
| ATLAS-BMR2-REQ-027 | Ensure production identity, mission, policy, approval, action, outbox, receipt, usage and credential authorities have one durable owner. | ATLAS-BMR2-GAP-027 | ATLAS-BMR2-P4-001 | G4 |
| ATLAS-BMR2-REQ-028 | Model representative tenants, conversations, Missions, steps, inference, tools, provider events, media, receipts and operational cost. | ATLAS-BMR2-GAP-028 | ATLAS-BMR2-P4-002 | G4 |
| ATLAS-BMR2-REQ-029 | Bound failure domains and noisy-neighbour effects across mission coordination, actions, providers and tenants. | ATLAS-BMR2-GAP-029 | ATLAS-BMR2-P4-003 | G4 |
| ATLAS-BMR2-REQ-030 | Trace each Mission from trigger through reasoning, decision, action, provider/tool delivery, receipt and outcome with user-relevant SLOs. | ATLAS-BMR2-GAP-030 | ATLAS-BMR2-P4-004 | G4 |
| ATLAS-BMR2-REQ-031 | Scale on meaningful backlog/saturation while preserving bounded admission and truthful degraded states. | ATLAS-BMR2-GAP-031 | ATLAS-BMR2-P4-005 | G4 |
| ATLAS-BMR2-REQ-032 | Recover durable authorities with measured RPO/RTO and reconcile missions, outbox, receipts, usage and provider state. | ATLAS-BMR2-GAP-032 | ATLAS-BMR2-P4-006 | G4 |
| ATLAS-BMR2-REQ-033 | Create reproducible source-to-artifact promotion with expand/contract migrations and tested rollback. | ATLAS-BMR2-GAP-033 | ATLAS-BMR2-P4-007 | G4 |
| ATLAS-BMR2-REQ-034 | Operate the durable Atlas Cloud product plane in a production-shaped staging preview for Cloud reliability and integration-readiness testing; do not treat it as the final product release candidate. | ATLAS-BMR2-GAP-034 | ATLAS-BMR2-P4-008 | G4 |
| ATLAS-BMR2-REQ-035 | Publish a falsifiable capacity, reliability, recovery and operational-ownership verdict for the Cloud product plane before whole-product integration. | ATLAS-BMR2-GAP-035 | ATLAS-BMR2-P4-009 | G4 |
| ATLAS-BMR2-REQ-036 | Evaluate provider/account/environment readiness progressively instead of using one universal supported flag. | ATLAS-BMR2-GAP-036 | ATLAS-BMR2-P5-001 | G5 |
| ATLAS-BMR2-REQ-037 | Convert BMR-001 real-send proof into repeatable email operation with inbound/outbound events, authenticity, reconciliation, quotas and outage behavior. | ATLAS-BMR2-GAP-037 | ATLAS-BMR2-P5-002 | G5 |
| ATLAS-BMR2-REQ-038 | Choose one provider from repository demand and current eligibility evidence using value, geography, complexity, cost and support burden. | ATLAS-BMR2-GAP-038 | ATLAS-BMR2-P5-003 | G5 |
| ATLAS-BMR2-REQ-039 | Onboard credentials/account, validate authenticity, send/receive or equivalent sandbox events, reconcile delivery and document limitations. | ATLAS-BMR2-GAP-039 | ATLAS-BMR2-P5-004 | G5 |
| ATLAS-BMR2-REQ-040 | Operate a real multi-step Mission over an authorised provider account to validate the provider product plane before complete-product integration. | ATLAS-BMR2-GAP-040 | ATLAS-BMR2-P5-005 | G5 |
| ATLAS-BMR2-REQ-041 | Prove Atlas responds truthfully to provider downtime, webhook drift, API/version change, quota exhaustion and planned deprecation. | ATLAS-BMR2-GAP-041 | ATLAS-BMR2-P5-006 | G5 |
| ATLAS-BMR2-REQ-042 | Review exact account/environment evidence and issue truthful provider-product readiness states before whole-product integration, without extrapolation. | ATLAS-BMR2-GAP-042 | ATLAS-BMR2-P5-007 | G5 |
| ATLAS-BMR2-REQ-043 | Make ownership, environment separation, lifecycle and server-derived tenant context explicit across Atlas Cloud. | ATLAS-BMR2-GAP-043 | ATLAS-BMR2-P6-001 | G6 |
| ATLAS-BMR2-REQ-044 | Enforce least-privilege human and machine access for development, deployment, operations, approval and billing. | ATLAS-BMR2-GAP-044 | ATLAS-BMR2-P6-002 | G6 |
| ATLAS-BMR2-REQ-045 | Provide enterprise-ready control evidence without making unsupported certification claims. | ATLAS-BMR2-GAP-045 | ATLAS-BMR2-P6-003 | G6 |
| ATLAS-BMR2-REQ-046 | Make data lifecycle and security/abuse response executable across messages, knowledge, memory, missions, receipts and telemetry. | ATLAS-BMR2-GAP-046 | ATLAS-BMR2-P6-004 | G6 |
| ATLAS-BMR2-REQ-047 | Record model, runtime, tool, provider, media, storage and observability usage against tenant/project/environment/agent/mission/action. | ATLAS-BMR2-GAP-047 | ATLAS-BMR2-P6-005 | G6 |
| ATLAS-BMR2-REQ-048 | Enforce understandable plan and customer controls before costly work is admitted. | ATLAS-BMR2-GAP-048 | ATLAS-BMR2-P6-006 | G6 |
| ATLAS-BMR2-REQ-049 | Operate signup, organisation/project creation, sandbox, deployment, channel connection, usage transparency and Stripe test billing lifecycle. | ATLAS-BMR2-GAP-049 | ATLAS-BMR2-P6-007 | G6 |
| ATLAS-BMR2-REQ-050 | Adversarially verify the enterprise-governance and commercial product plane before whole-product integration. | ATLAS-BMR2-GAP-050 | ATLAS-BMR2-P6-008 | G6 |
| ATLAS-BMR2-REQ-051 | Let third parties build runtime, model, tool, channel/provider and solution extensions against bounded public contracts. | ATLAS-BMR2-GAP-051 | ATLAS-BMR2-P7-001 | G7 |
| ATLAS-BMR2-REQ-052 | Have an independent context build one useful extension and solution pack using only the public kit and documentation. | ATLAS-BMR2-GAP-052 | ATLAS-BMR2-P7-002 | G7 |
| ATLAS-BMR2-REQ-053 | Assemble exact versions of every first-class product plane into one source-to-artifact release candidate before whole-product certification. | ATLAS-BMR2-GAP-053 | ATLAS-BMR2-P7-003 | G7 |
| ATLAS-BMR2-REQ-054 | Deploy the sealed integrated candidate, migrations, configuration and secret references to staging without rebuilding or mutating the artifact. | ATLAS-BMR2-GAP-054 | ATLAS-BMR2-P7-004 | G8 |
| ATLAS-BMR2-REQ-055 | Test the complete Atlas product after all planes are built, integrated and deployed, then issue an independent staging verdict for the exact candidate. | ATLAS-BMR2-GAP-055 | ATLAS-BMR2-P7-005 | G8 |
| ATLAS-BMR2-REQ-056 | Promote the staging-certified candidate only under explicit authority, then operate sustained real customer Missions inside a declared provider, capacity, spend, data and support envelope. | ATLAS-BMR2-GAP-056 | ATLAS-BMR2-P7-006 | G9 |
| ATLAS-BMR2-REQ-057 | Issue a truthful terminal verdict, close or isolate residual risk, and preserve exact programme provenance. | ATLAS-BMR2-GAP-057 | ATLAS-BMR2-P7-007 | G9 |

## Update rule

When implementation surfaces change, update the work item and requirement record in the same commit. When tests or environment evidence falsify a requirement, mark it unsatisfied and reopen the owning item. Never orphan a requirement by deleting a failing test.

Every requirement that reaches G1–G6 must still be exercised through the integrated candidate where applicable at G8.


<!-- END 19_REQUIREMENTS_TRACEABILITY_MATRIX.md -->


---

<!-- BEGIN 20_CLAUDE_CODE_END_TO_END_EXECUTION_PROMPT.md -->

# Claude Code End-to-End Execution Prompt

**Programme:** `ATLAS-BMR-002`  
**Package version:** `3.0.0-execution`  
**Date:** `2026-07-29`  
**Status:** `COPY INTO CLAUDE CODE`


You are taking over the Atlas Business Messaging Runtime programme as the principal product architect and principal implementer for:

# `ATLAS-BMR-002` — Production Agentic Business Messaging Platform

Work directly in:

```text
/Users/deon/Developer/mirai-atlas-bmr001
```

Reported starting branch:

```text
codex/atlas-bmr-001-p0-audit
```

Reported BMR-001 closure:

```text
commit 4bf5da957d
tag atlas-bmr-001-closed
50/50 work items PASS
```

Do not trust the handover. Verify it from the live repository.

## Mission

> Turn the certified BMR-001 foundation into Atlas's complete production agentic product: a production-scale, commercially operable, multi-provider, enterprise-governed developer platform in which versioned Agents pursue durable Missions and Atlas safely governs, executes, delivers, observes, bills, and proves business outcomes.

This is an **execution assignment**. Do not return another programme prompt or planning package. Verify the baseline, reconcile this authority against repository truth, then build, integrate, test, deploy, operate and certify the dependency graph through P0–P7.

## Binding product correction

Do not split the programme into a supposedly real Agent core plus secondary infrastructure.

The Atlas product consists of all of these first-class planes:

```text
Agent and Mission product model
governed durable business execution
developer platform and runtime interoperability
production Atlas Cloud
provider and channel operations
enterprise trust and operator control
commercial self-serve, usage, cost and billing
extension and solution ecosystem
```

An Agent runtime without Cloud/providers/governance/commercial operation is a prototype. Cloud/providers/governance/billing without durable governed Agents are infrastructure. BMR-002 succeeds only when the complete product is integrated and proven.

Read `02A_COMPLETE_PRODUCT_SCOPE_AND_BUILD_TEST_STRATEGY.md` before selecting implementation work.

## Complete product lifecycle

```text
organisation / project / environment
→ versioned Agent
→ bounded durable Mission
→ trigger / observation
→ scoped context and memory provenance
→ typed reasoning Proposal
→ Atlas policy / risk / authority / budget decision
→ approval / handoff / takeover where required
→ transactional Action and durable outbox
→ provider or tool effect
→ callback and receipt reconciliation
→ wait / continue / escalate / complete
→ evidence-backed business Outcome
→ usage / cost / audit / billing / lifecycle controls
→ reviewed Learning Proposal
```

The reasoning runtime may be Atlas-native or external. It may never self-approve, select arbitrary tenant/environment, receive raw provider credentials, directly execute provider sends or committed business effects, mutate durable state outside Atlas, or fabricate receipts/outcomes.

## First response

Use exactly:

## Mission

State the mission above in one sentence.

## Now

State that you are verifying the reported BMR-001 closure and current worktree before modifying product code.

## Key insight

State the maturity boundary the repository evidence currently supports. Do not repeat handover claims as facts.

## Verdict

```text
BMR_002_EXECUTION_P0_IN_PROGRESS
```

## One next action

Verify `ATLAS-BMR2-P0-001` and write the closure evidence record.

Then perform the work. Do not stop after the checkpoint.

## Canonical reading sequence

Read:

1. repository `AGENTS.md`, `CLAUDE.md`, nested instructions and active programme authorities;
2. `docs/features/Atlas/ATLAS-BMR-002/00_README.md`;
3. `01_HANDOVER_BASELINE_AND_PRESERVATION.md`;
4. `02_AGENTIC_PRODUCT_CONSTITUTION.md`;
5. `02A_COMPLETE_PRODUCT_SCOPE_AND_BUILD_TEST_STRATEGY.md`;
6. `03_LOCKED_DECISIONS_AND_DEFAULTS.md`;
7. `04_POST_CLOSURE_STOCKTAKE_PROTOCOL.md`;
8. `05_CURRENT_AND_TARGET_ARCHITECTURE.md`;
9. the latest checkpoint in `atlas_bmr002_execution_log.md`;
10. `execution-board.v3.json`;
11. the specification, requirement and gate for the active item.

Read other documents on demand. Do not dump the complete combined authority into one context unnecessarily.

## Authority hierarchy

1. Current verified repository, environment and provider evidence.
2. Explicit current user/founder decisions.
3. Unmodified BMR-001 closure constitution and evidence.
4. BMR-002 product constitution and complete-product authority.
5. Active work-item spec, execution board, requirements and gates.
6. Historical handovers and planning reports.

When live evidence contradicts BMR-001, create a BMR-002 post-closure erratum or regression record. Do not edit history.

## BMR-001 preservation

Do not reset, clean, discard, rebase, force-push, rewrite history, mutate `atlas-bmr-001-closed`, edit old PASS claims, move BMR-002 work into BMR-001, or overwrite unrelated work.

Before creating an implementation branch/worktree, enumerate current worktrees, record every dirty/untracked state, inspect concurrent programmes, choose an isolated continuation from the verified baseline, and record branch point/path in the execution log.

Do not push, merge, tag, publish packages, change repository visibility, or promote production without explicit user authority.

## Execution graph

The machine authority is:

```text
docs/features/Atlas/ATLAS-BMR-002/execution-board.v3.json
```

Execute dependency-ready work across:

```text
P0 — Certified baseline and execution activation
P1 — Shared product authority and agentic foundations
P2 — Durable agent runtime and business execution
P3 — Developer platform and runtime interoperability
P4 — Production Atlas Cloud product
P5 — Provider and channel product
P6 — Enterprise governance and commercial Cloud product
P7 — Ecosystem, whole-product integration, deployment and closure
```

P2–P6 are co-equal product build streams. After P1, do not force strict numerical phase completion when another stream's real dependencies are ready. Do not treat Cloud, providers, enterprise controls or billing as subordinate work.

There are 57 work items. Historical BMR-001 evidence does not mark any of them PASS. Start with `ATLAS-BMR2-P0-001`.

## Per-work-item loop

For every item:

1. Read its full record, requirement, gap and gate.
2. Verify dependencies and current Git/environment state.
3. Mark `DISCOVERY`; inspect the existing owner before proposing a new system.
4. Record current behavior, intended decision, assumptions and falsifier.
5. Mark `IN_PROGRESS`.
6. Implement the principal solution yourself.
7. Run targeted schema/unit/property/integration/migration/security/fault tests during implementation.
8. Run all item acceptance tests and required environment proof.
9. Delegate bounded independent verification.
10. Repair findings; do not weaken tests or redefine success silently.
11. Update source docs, board, requirements, capability/provider registry, evidence index and execution log.
12. Inspect unstaged/staged diff and secret exposure.
13. Commit one coherent slice when repository rules permit; record SHA.
14. Mark `PASS` only when the item criteria are evidenced.
15. Activate the next highest-severity dependency-ready item across the complete graph and continue.

A work-item PASS or G1–G6 PASS is not a product release claim.

## Build, integration and test order

Use this exact hierarchy:

```text
continuous focused tests while each product plane is built
→ G1–G6 product-plane build readiness
→ P7-003 integrate and seal the complete product candidate
→ P7-004 deploy that exact candidate to staging
→ P7-005 run whole-product staging certification and independent adoption
→ repair, rebuild, redeploy and rerun until G8 passes
→ obtain explicit production authority
→ P7-006 canary and bounded customer operations
→ P7-007 final certification and closure
```

Do not write the whole codebase untested and wait until the end to discover primitive defects. Do not certify Atlas from isolated workstream tests. Final end-to-end certification happens only after the full product is built and integrated.

## Whole-product staging requirement

P7-005 must exercise one causally connected product path:

```text
signup
→ organisation / project / environment
→ sandbox / Agent project / deployment
→ provider connection
→ customer identity and conversation
→ durable Mission
→ knowledge and context
→ Proposal
→ policy / risk / budget
→ approval or handoff
→ Action / outbox / provider effect
→ authentic callback and reconciliation
→ outcome / delivery / usage / cost / audit receipts
→ quota and spend enforcement
→ billing test settlement
→ audit export and data-lifecycle action
→ injected failure, recovery and rollback
```

Also prove Atlas-native reasoning, one external-runtime Proposal integration, one independent extension, and fresh developer adoption. Disconnected demos do not pass.

## Main agent and workers

You are the only architecture and primary implementation authority.

Use project subagents only for independent test execution, evidence reproduction, adversarial security/tenant/authority review, release/gate review, and bounded commit preparation or commit after your diff review.

Workers may not redesign the product, implement the primary solution, weaken acceptance criteria, edit the execution thesis, self-certify their own changes, or independently deploy/publish/merge.

## Persistent programme memory

`atlas_bmr002_execution_log.md` is the state machine, scratchpad and handoff memory.

At every item start, material discovery, test failure, design decision, commit, blocker, deployment, gate and session end, append exact Git/worktree state, active item/status, changed files, commands/results, evidence paths, environment/provider/account scope, decisions/assumptions/falsifiers, blockers and one exact next action.

Before compaction or session end, update the board and write a context carry-forward sufficient for a fresh Claude Code session to resume without chat history.

## Checkpoint format

Every user-facing and log checkpoint uses exactly:

## Mission

## Now

## Key insight

## Verdict

## One next action

Keep it concise and evidence-driven. Use exactly one next action. After a checkpoint, continue executing unless user input or an irreversible action is genuinely required.

## Evidence doctrine

Never promote a claim from code existence, documentation, mocks, old screenshots, configuration, a migration file, a single live send, a green component suite, or the implementer's assertion.

Bind evidence to requirement, source commit, artifact digest, configuration/migration, environment/region, provider/billing account, test/journey, timestamp, raw result, redactions, limitations, independent reviewer and checksum.

Use the maturity and provider vocabularies exactly.

## Deployment behavior

Use the repository's existing deployment authority. Do not invent a duplicate platform.

Development previews or product-plane test environments may be used during construction. The release staging verdict must use the exact integrated G7 candidate.

When staging access exists and G7 permits, deploy the exact candidate, run P7-005, capture evidence, repair or roll back, rebuild and repeat until G8 passes.

When an external account, credential or access is absent, finish every independent code, simulator, conformance, security, documentation and runbook item; mark only the affected item `BLOCKED_EXTERNAL`; record exact missing access and one unblock action; continue independent work.

Limited production requires explicit recorded user/founder authorisation containing the bounded envelope. Without it, finish G8 and use:

```text
ATLAS_BMR_002_STAGING_CERTIFIED_PRODUCTION_APPROVAL_REQUIRED
```

## Provider truth

Do not declare all channels production-supported. Reverify Resend, build the common readiness harness, score at least three second-provider candidates, certify one sandbox lane and promote only exact authorised accounts/environments.

## Enterprise and commercial truth

Do not claim SOC 2, ISO 27001, GDPR, HIPAA, PCI DSS, residency, customer-managed keys or enterprise support without direct evidence and organisational/external-audit dependencies.

Atlas's canonical usage/cost ledger remains runtime truth. Billing providers settle and invoice downstream. Do not make final pricing decisions without measured cost and adoption evidence.

## Release and closure

At G1–G6, record product-plane build readiness. At G7, seal the complete integrated candidate. At G8, obtain independent whole-product staging certification. At G9, require explicit production authority and bounded live evidence.

Use one terminal verdict from `00_README.md`. Do not create a closure tag, push, merge, publish or change visibility unless explicitly authorised.

Begin now with `ATLAS-BMR2-P0-001`, then keep executing.


<!-- END 20_CLAUDE_CODE_END_TO_END_EXECUTION_PROMPT.md -->


---

<!-- BEGIN 21_WORKER_DELEGATION_AND_VERIFICATION_PROTOCOL.md -->

# Worker Delegation and Verification Protocol

**Programme:** `ATLAS-BMR-002`  
**Package version:** `3.0.0-execution`  
**Date:** `2026-07-29`  
**Status:** `EXECUTION AUTHORITY`


## Operating rule

The principal Claude Code session owns product decisions, architecture, implementation, integration, evidence posture and release judgment.

Workers are verification instruments—not co-architects or substitute implementers.

## Permitted worker roles

| Worker | Permitted work | Prohibited work |
| --- | --- | --- |
| `atlas-bmr002-test-runner` | Run named tests/evals, capture exact results, isolate failures | Edit source, redesign, weaken tests |
| `atlas-bmr002-verifier` | Reproduce acceptance criteria, inspect source/evidence, adversarial review | Implement primary solution, mark PASS |
| `atlas-bmr002-release-reviewer` | Gate/evidence/provenance/security/release review | Deploy, waive gates, mutate release state |
| `atlas-bmr002-commit-worker` | Review exact approved diff, stage bounded paths, commit with supplied message | Edit source, include unrelated files, push/merge/tag |

The principal session may use fresh manual sessions/worktrees when stronger independence is required. Editing parallel sessions must use isolated worktrees and explicit integration ownership.

## Delegation packet

Every worker receives:

```yaml
programme: ATLAS-BMR-002
phase:
work_item:
gate:
role:
repository_path:
branch_and_head:
allowed_paths:
forbidden_paths:
exact_question:
commands_or_tests:
acceptance_criteria:
evidence_output:
time_or_scope_bound:
model_identity_rule:
```

Do not delegate “review everything” without a bounded question.

## Verification return

Worker returns:

- exact branch/HEAD/dirty state observed;
- commands;
- exit codes;
- relevant stdout/stderr;
- files/lines reviewed;
- reproduced behavior;
- findings ranked by severity;
- evidence path/checksum;
- unresolved uncertainty;
- `PASS_RECOMMENDED`, `FAIL_RECOMMENDED`, or `INCONCLUSIVE`.

The principal session decides item/gate status after inspecting the return and current source.

## Independence

A review is independent only when the verifier did not implement the reviewed slice and reproduces material evidence from source/environment. Rephrasing the implementer’s report is not independent verification.

## Model/provider identity

A worker definition or name is not proof of its model/provider.

When identity matters, record:

- requested model or route;
- Claude Code agent name;
- observable environment fields such as `CLAUDE_CODE_SUBAGENT_MODEL` where available;
- session/agent identifier;
- provider/router evidence where the environment exposes it.

If the resolved route cannot be proven, record:

```text
UNVERIFIED_ROUTER_IDENTITY
```

Do not block correctness testing merely because router identity is unavailable.

## Worker event log

Optional hooks may append redacted events to:

```text
.factory/evidence/atlas-bmr-002/subagent-delegation.jsonl
```

Events must never contain prompt secrets, credentials, customer content or unredacted environment values.

## Commit worker

Before delegation, the principal session:

1. reviews `git status` and full diff;
2. names exact paths;
3. confirms tests/evidence;
4. supplies commit message;
5. confirms no push/tag/merge.

The commit worker verifies boundaries, stages only named paths, shows staged diff, commits and returns SHA. It aborts on unrelated or secret-bearing changes.

## Prohibited delegation patterns

- asking a worker to “build P2”;
- allowing a reviewer to patch findings silently;
- using many agents on the same writable worktree;
- accepting green summaries without commands/evidence;
- marking PASS because two workers agreed;
- claiming a specific model/provider without observable proof;
- delegating production promotion.


<!-- END 21_WORKER_DELEGATION_AND_VERIFICATION_PROTOCOL.md -->


---

<!-- BEGIN 22_SESSION_RESTART_AND_CONTEXT_RECOVERY.md -->

# Session Restart and Context Recovery

**Programme:** `ATLAS-BMR-002`  
**Package version:** `3.0.0-execution`  
**Date:** `2026-07-29`  
**Status:** `EXECUTION AUTHORITY`


## Goal

A new Claude Code session can continue correctly using only repository state, this package and the execution log.

## At session start

1. Read repository instructions.
2. Inspect branch, HEAD, worktrees and dirty state.
3. Read `00_README.md`.
4. Read the latest `atlas_bmr002_execution_log.md` carry-forward.
5. Load `execution-board.v3.json`.
6. Identify active item and dependencies.
7. Read only the relevant spec/gate/requirement/evidence.
8. Verify the log’s Git state against reality.
9. Append a takeover checkpoint.
10. Continue the exact next action.

## Before compaction or session end

Update:

- active phase/item/status;
- exact mission;
- branch/HEAD/dirty/untracked state;
- architecture decisions made;
- files changed;
- tests/commands/results;
- evidence created;
- environment/provider scope;
- current failures and root-cause hypotheses;
- worker reviews;
- commits;
- blockers and exact unblock action;
- one exact next action.

## Carry-forward template

```markdown
## Context carry-forward

### Mission
...

### Active phase and item
- Phase:
- Item:
- Status:
- Gate:

### Git/worktree
- Worktree:
- Branch:
- HEAD:
- Dirty/untracked:
- Concurrent worktrees:

### Current implementation
- Decisions:
- Changed files:
- Migrations/config:
- Feature flags:

### Verification
- Commands/results:
- Evidence:
- Independent review:

### Failures and blockers
- Failure:
- Root-cause evidence:
- Blocker:
- Unblock action:

### Exact next action
...
```

## Optional Claude Code compact hook

The package includes an example `SessionStart` hook that prints a small context reminder after compaction. Merge it into existing settings only after inspecting current hooks. Do not overwrite repository/user settings.

## Recovery contradictions

When log and Git disagree, current Git/source evidence wins. Record the contradiction before continuing. Never repair it by resetting or deleting unknown work.


<!-- END 22_SESSION_RESTART_AND_CONTEXT_RECOVERY.md -->


---

<!-- BEGIN 23_EXTERNAL_RESEARCH_REGISTER.md -->

# External Primary-Source Research Register

**Programme:** `ATLAS-BMR-002`  
**Package version:** `3.0.0-execution`  
**Date:** `2026-07-29`  
**Status:** `EXECUTION AUTHORITY`


## Rule

Repository reality has priority. External sources define provider/platform/standard constraints and must be rechecked when implementing because APIs, prices, limits and product availability can change.

Access date for this package: **2026-07-29**.

| ID | Publisher | Source | Accessed | URL | Planning use |
| --- | --- | --- | --- | --- | --- |
| SRC-CC-SUBAGENTS | Anthropic Claude Code | Create custom subagents | 2026-07-29 | https://code.claude.com/docs/en/sub-agents | Worker isolation, custom prompts, tool restrictions, and evidence-return semantics. |
| SRC-CC-AGENTS | Anthropic Claude Code | Run agents in parallel | 2026-07-29 | https://code.claude.com/docs/en/agents | Choosing subagents versus worktree-isolated sessions; main-agent coordination. |
| SRC-CC-WORKFLOWS | Anthropic Claude Code | Orchestrate subagents at scale with dynamic workflows | 2026-07-29 | https://code.claude.com/docs/en/workflows | Optional repeatable verification workflows; never a substitute for repository state. |
| SRC-CC-SKILLS | Anthropic Claude Code | Extend Claude with skills | 2026-07-29 | https://code.claude.com/docs/en/skills | Repository-resident programme skill and context recovery. |
| SRC-CC-HOOKS | Anthropic Claude Code | Hooks guide | 2026-07-29 | https://code.claude.com/docs/en/hooks-guide | Optional auditable worker/session event logging. |
| SRC-OTEL-TRACES | OpenTelemetry | Traces | 2026-07-29 | https://opentelemetry.io/docs/concepts/signals/traces/ | Causal mission/action/provider tracing. |
| SRC-OTEL-CONTEXT | OpenTelemetry | Context propagation | 2026-07-29 | https://opentelemetry.io/docs/concepts/context-propagation/ | Cross-service trace correlation without treating telemetry as business authority. |
| SRC-SRE-SLO | Google SRE | Implementing SLOs | 2026-07-29 | https://sre.google/workbook/implementing-slos/ | User-centered reliability objectives and computable indicators. |
| SRC-SRE-EB | Google SRE | Error Budget Policy | 2026-07-29 | https://sre.google/workbook/error-budget-policy/ | Release and reliability action policy. |
| SRC-RESEND-WEBHOOKS | Resend | Webhooks | 2026-07-29 | https://resend.com/docs/webhooks/introduction | Email event authenticity and provider lifecycle. |
| SRC-RESEND-RETRY | Resend | Webhook retries and replays | 2026-07-29 | https://resend.com/docs/webhooks/retries-and-replays | Delivery reconciliation and replay tests. |
| SRC-RESEND-LIMITS | Resend | Account quotas and limits | 2026-07-29 | https://resend.com/docs/knowledge-base/account-quotas-and-limits | Provider capacity and spending boundaries. |
| SRC-TWILIO-SIGNATURE | Twilio | Twilio request validation | 2026-07-29 | https://www.twilio.com/docs/usage/security | Webhook authenticity. |
| SRC-TWILIO-STATUS | Twilio | Outbound message status callbacks | 2026-07-29 | https://www.twilio.com/docs/messaging/guides/outbound-message-status-in-status-callbacks | Provider delivery state and reconciliation. |
| SRC-TWILIO-A2P | Twilio | A2P 10DLC | 2026-07-29 | https://www.twilio.com/docs/messaging/compliance/a2p-10dlc | Eligibility and regional/compliance constraints for US SMS. |
| SRC-OIDC | OpenID Foundation | OpenID Connect Core 1.0 | 2026-07-29 | https://openid.net/specs/openid-connect-core-1_0.html | Enterprise identity federation. |
| SRC-SCIM | IETF | SCIM Protocol RFC 7644 | 2026-07-29 | https://www.rfc-editor.org/rfc/rfc7644 | Provisioning assessment; not automatic scope. |
| SRC-NIST-SSDF | NIST | Secure Software Development Framework SP 800-218 | 2026-07-29 | https://csrc.nist.gov/pubs/sp/800/218/final | Secure development and release evidence controls. |
| SRC-STRIPE-METER | Stripe | Usage-based billing | 2026-07-29 | https://docs.stripe.com/billing/usage-based | Commercial settlement adapter; Atlas remains canonical usage authority. |

## Research update record

When a work item relies on external facts, append:

```yaml
source_id:
accessed:
work_item:
fact_used:
account_or_region_scope:
repository_decision_affected:
archive_or_evidence_path:
```

Do not copy provider marketing claims into Atlas readiness. Verify exact account/environment behavior.


<!-- END 23_EXTERNAL_RESEARCH_REGISTER.md -->


---

<!-- BEGIN 24_INDEPENDENT_REVIEW_PROTOCOL.md -->

# Independent Review Protocol

**Programme:** `ATLAS-BMR-002`  
**Package version:** `3.0.0-execution`  
**Date:** `2026-07-29`  
**Status:** `EXECUTION AUTHORITY`


## Purpose

Independent review attempts to falsify the implementation and release claim. It is not proofreading or approval theatre.

## Required review domains

### Agentic product

- Is Agent version identity real?
- Is Mission durable across restarts and waits?
- Are Proposals separate from Decisions and Actions?
- Can runtime/model self-approve or bypass Atlas?
- Are outcomes evidence-based?
- Is memory provenance/review enforced?
- Is “proactive” operation bounded and durable?

### Reliability

- Do crash, duplicate, reorder, timeout and unknown-effect tests pass?
- Are capacity/SLO claims tied to exact workload/topology?
- Does restore reconcile business/provider state?
- Can migration/rollback preserve active Missions?

### Security and tenancy

- Can identity, queue, cache, object, search, audit, usage or extension paths cross tenants?
- Are credentials absent from model context/logs/evidence?
- Can external runtimes/extensions expand scope?
- Are approvals and admin overrides auditable?

### Provider

- Is evidence real provider/account/environment evidence?
- Are authenticity, retry, ordering, rate, spend and delivery semantics tested?
- Are limitations and blocked states visible?

### Enterprise/commercial

- Do audit/export/deletion/retention claims work outside-in?
- Does usage/cost reconcile without double counting?
- Are quota/spend races bounded?
- Does billing test settlement match Atlas truth?
- Are compliance/pricing/support claims honest?

### Adoption

- Did a fresh developer/coding agent succeed without private context?
- Did an independent extension pass conformance?
- Did real customer operations stay inside the declared envelope?

## Review method

1. Establish exact branch/commit/artifact/environment.
2. Read requirement, gap, work item and gate.
3. Reproduce the main outside-in journey.
4. Select at least one falsifier/negative path.
5. Inspect source where evidence could be gamed.
6. Verify redaction and provenance.
7. Report findings before verdict.
8. Re-run repaired findings when material.

## Severity

```text
CRITICAL — authority, tenant, credential, false effect/outcome, destructive release
HIGH — release/recovery/provider/commercial correctness
MEDIUM — adoption, operability, bounded degradation
LOW — clarity or maintainability without current gate impact
```

Critical or high findings block the owning gate until repaired or explicitly removed from scope through a current product decision that preserves safety.

## Review output

```markdown
# Independent review — <item/gate>

- Reviewer/context:
- Source/HEAD/artifact:
- Environment/provider/account scope:
- Requirements reviewed:
- Commands and evidence:
- Reproduction:
- Falsifiers attempted:
- Findings:
- Residual uncertainty:
- Recommended verdict:
- Required next action:
```


## Whole-product review boundary

A reviewer may validate a product-plane build-readiness gate at G1–G6, but may not convert that result into an Atlas release verdict. G8 review must begin from the exact integrated candidate and reproduce the causally connected whole-product staging journey, including provider, enterprise, commercial, failure/recovery, adoption and rollback evidence.


<!-- END 24_INDEPENDENT_REVIEW_PROTOCOL.md -->


---

<!-- BEGIN 25_FINAL_RELEASE_AND_CLOSURE_DECISION_TEMPLATE.md -->

# Final Release and Closure Decision Template

**Programme:** `ATLAS-BMR-002`  
**Package version:** `3.0.0-execution`  
**Date:** `2026-07-29`  
**Status:** `EXECUTION AUTHORITY`


## Identity

- Programme:
- Date:
- Source branch/commit:
- Artifact digest:
- Environment/region:
- Provider accounts/capabilities:
- Reviewer:
- Production authority record:

## BMR-001 preservation

- Closure commit/tag verification:
- Historical files changed:
- Post-closure errata/regressions:
- Verdict:

## Product outcome

- Agent/Mission lifecycle:
- Durable recovery:
- Human control:
- Actions/receipts/outcomes:
- Developer/runtime adoption:
- Atlas Cloud reliability:
- Provider readiness:
- Enterprise/commercial controls:
- Ecosystem/adoption:

## Gate verdicts

| Gate | Verdict | Evidence |
| --- | --- | --- |
| G0 | | |
| G1 | | |
| G2 | | |
| G3 | | |
| G4 | | |
| G5 | | |
| G6 | | |
| G7 | | |
| G8 | | |
| G9 | | |

## Known limitations and residual risks

List exact scope, owner, customer impact, mitigation, expiry/review and whether it blocks release.

## Deployment and rollback

- Current deployed candidate:
- Canary result:
- SLO/error-budget state:
- Active Missions:
- Stop-admission:
- Rollback target/owner:
- Recovery readiness:

## Public/repository actions

State separately whether push, merge, tag, package publication and visibility change are authorised. Absence means **not authorised**.

## Terminal verdict

Use exactly one:

```text
ATLAS_BMR_002_EXECUTION_COMPLETE
ATLAS_BMR_002_STAGING_CERTIFIED_PRODUCTION_APPROVAL_REQUIRED
ATLAS_BMR_002_EXECUTION_BLOCKED_EXTERNAL
ATLAS_BMR_002_EXECUTION_FAILED
ATLAS_BMR_002_ROLLED_BACK
```

## One next action

Exactly one concrete action.


<!-- END 25_FINAL_RELEASE_AND_CLOSURE_DECISION_TEMPLATE.md -->
