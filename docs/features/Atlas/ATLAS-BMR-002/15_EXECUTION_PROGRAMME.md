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

