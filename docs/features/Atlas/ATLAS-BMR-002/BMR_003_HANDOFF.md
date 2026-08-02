# BMR-003 Handoff from Sealed BMR-002

This is an archival handoff only. It does not authorise or implement BMR-003.

## BMR-002 identity

- Branch: `codex/atlas-bmr-002-execution`
- Sealed BMR-002 source HEAD: `9c67cd8cbfd45d3c3042bc432639d84ca898ac0f`
- Archival handoff commit: the documentation commit that adds this file and `BMR_003_KICKOFF_PROMPT.md`.
- External-proof candidate SHA: `65f088fa0a11e6b48e201e4fa4b56f7c4d616050`
- Terminal status: `ATLAS_BMR_002_EXECUTION_BLOCKED_EXTERNAL`
- Release status: not release-ready.

The sealed source HEAD is the output of the BMR-002 closure sprint. The archival handoff commit is documentation-only and must not be treated as new product implementation.

Authoritative closeout records:

- [BMR-002 final decision](./final-decision.v1.json)
- [BMR-002 execution board](./execution-board.v3.json)
- [BMR-002 execution log](./atlas_bmr002_execution_log.md)
- [BMR-002 evidence index](./evidence-index.v1.json)
- [BMR-002 package validation](./package-validation.v3.json)
- [BMR-002 README and boundaries](./00_README.md)
- [BMR-002 locked decisions](./03_LOCKED_DECISIONS_AND_DEFAULTS.md)
- [BMR-002 CI workflow](../../../../.github/workflows/atlas-bmr-002.yml)

## Final BMR-002 proof status

| Classification | Status | Evidence |
| --- | --- | --- |
| `LOCAL_UNIT_PROVEN` | Proven | Memory/RBAC focused suites: 20/20; deterministic expiry, boundary and timezone coverage. |
| `LOCAL_PACKAGE_PROVEN` | Proven | 42 files, 429 tests; typecheck, build, metadata, package boundary, validator, JSON and checksums pass. |
| `LOCAL_INTEGRATED_SIMULATOR_PROVEN` | Proven | 44/44 simulator/dev-server/runtime tests; local exactly-once test and replay pass. |
| `CI_PROVEN` | Proven | GitHub Actions run `30741865646`, exact external-proof candidate `65f088f`. |
| `HOSTED_PROOF_BLOCKED` | Blocked external | No hosted Atlas Cloud deployment configured. |
| `PROVIDER_SANDBOX_PROOF_BLOCKED` | Blocked external | No provider sandbox account or credentials configured. |
| `STAGING_PROOF_BLOCKED` | Blocked external | No authorised staging URL or deployment environment configured. |
| `PRODUCTION_PROOF_BLOCKED` | Blocked external | No production authority or customer cohort authorised. |
| `BILLING_PROOF_BLOCKED` | Blocked external | No billing test settlement environment configured. |
| `COMMERCIAL_PROOF_BLOCKED` | Blocked external | No commercial self-serve/operations environment configured. |
| `COMPLIANCE_PROOF_BLOCKED` | Blocked external | No formal compliance evidence or authorised control environment configured. |

Required terminal state remains:

```text
ATLAS_BMR_002_EXECUTION_BLOCKED_EXTERNAL

LOCAL_IMPLEMENTATION_COMPLETE
FULL_LOCAL_PACKAGE_GATE_PASS
LOCAL_INTEGRATED_SIMULATOR_PASS
CI_PASS
EXTERNAL_PROOF_BLOCKED
NOT_RELEASE_READY
```

## Remaining blockers and limitations

The external-proof lane was subsequently inspected against candidate `65f088fa0a11e6b48e201e4fa4b56f7c4d616050`. Matching CI passed in run `30741865646`. E1 hosted Atlas Cloud, E2 production-shaped database/queue, E3 provider sandbox, E4 staging, E5 billing/commercial test mode and E6 recovery/rollback remain blocked because no authorised hosted target, deployment workflow/IaC, provider sandbox credentials, staging environment, Stripe test configuration or hosted recovery surface exists. The append-only evidence record is `.factory/evidence/atlas-bmr-002/P7/external-proof-2026-08-02.json`.

- The documented Docker Compose full-stack path renders and builds, but its Atlas API, worker, sandbox-entry and PostgreSQL migration runtime are absent from the current source tree. Host ports `5433` and `6380` are also occupied by unrelated local services. The local simulator path is the supported proof; this is not PostgreSQL/Redis worker proof.
- The local runtime is filesystem-backed and simulator-backed. It does not establish hosted database, queue, worker restart, provider acceptance, staging, production, billing or compliance behavior.
- Provider simulation must not be described as provider sandbox proof, and local package CI must not be described as hosted product proof.
- The package remains an unpublished local artifact. No deployment, publication, promotion, credential rotation or production mutation occurred.
- BMR-001 history is unchanged. The `atlas-bmr-001-closed` tag was not present in this Atlas worktree or remote listing and was not created, changed or deleted.
- Pre-existing unrelated untracked files remain outside the BMR-002 commits: `.claude/skills/gitnexus/`, `AGENTS.md`, and `CLAUDE.md`.

## Reusable Atlas capabilities now available

The following are reusable, locally proven Atlas capabilities—not a claim that every capability is hosted or production-ready:

- Versioned Agent, Mission, Proposal, Decision, Action, Receipt, Outcome and Learning contracts.
- Filesystem-backed durable Mission persistence, migrations, inspect/replay/control surfaces and restart/replay behavior.
- Governed local coordinator behavior with leases, approvals, handoff/takeover, return-to-Agent, cancellation and idempotent action commitment.
- Provenance-governed memory and reviewed learning with retention, invalidation, scope checks and deterministic expiry behavior.
- Local action/outbox/receipt/effect simulation with provider identity, retry, lease fencing and truthful delivery states.
- Local RBAC, machine identity, scoped credentials, rotation, revocation and approval/proposal separation.
- Local provider/channel/model simulators, local-fixture inference, CLI, dev server and Workbench-compatible journey surfaces.
- Package metadata/provenance, public/private boundary tests, deterministic package validation, secret scanning and focused GitHub CI.

These capabilities should be audited as primitives before BMR-003 adds anything. Reuse the existing authority; do not create parallel business truth.

## Ownership boundaries

### Public Atlas

Atlas owns portable Agent/Mission contracts, proposals, decisions, actions, receipts, outcomes, extension contracts, CLI/SDK surfaces, schemas, examples, local runtime/simulator and public adapters.

### Private Atlas Cloud

Atlas Cloud owns managed tenancy, durable hosted Mission coordination, credentials, policy enforcement, committed effects, provider operations, deployments, hosted observability, usage/cost authority, billing enforcement, security and abuse controls.

### Mirai

Mirai owns the buyer-facing Team Inbox, Command Center, human operator experience, customer operations, packaged business Agents, vertical workflows and business analytics. Mirai consumes Atlas contracts; it must not become a second private Atlas runtime.

### Providers, partners and customer infrastructure

Providers/partners own external network availability, account eligibility and delivery systems within explicit contracts. Customer infrastructure may host external reasoning runtimes, gateways, tools and data sources that operate through Atlas contracts. External runtimes may reason and propose; they do not receive raw provider credentials or bypass Atlas authority.

## Future C North Star

Future C is the reusable-product direction after BMR-002:

> Make Atlas capable of powering a complete, repeatable, industry-specific customer-operations team, proven through one Mirai Industry Edition, without forking Atlas or turning it into a bespoke vertical application.

The first proof should be one complete Mirai Industry Edition—not a new vertical runtime. It should demonstrate that one reusable Atlas primitive set can support an industry-specific customer-operations team from intake through governed work, human control, business outcome and evidence.

## BMR-003 drift-control rules

1. Start with programme discovery and a primitive audit. Do not start with source-code implementation.
2. Preserve Atlas as the Business Messaging Agent Runtime. Industry language may shape a reference product, not replace Atlas's platform identity.
3. Put reusable runtime, policy, state, provider, receipt, usage and billing primitives in Atlas only when they are buyer-neutral and reusable across customer-operations teams.
4. Put buyer-facing workflows, operator UX, packaged Agents and industry-specific presentation in Mirai or the appropriate product boundary.
5. Never create a mini Harvey, CRM, generic workflow builder, or bespoke vertical fork inside Atlas.
6. Every proposed primitive must identify its reuse case, owner boundary, source of truth, authorization path, evidence requirement and rollback/disable path.
7. Keep simulator, local, provider sandbox, staging, production, billing and compliance claims separate. A passing local test cannot promote a maturity state.
8. Do not modify BMR-002 historical evidence or board state to make BMR-003 appear started.
9. Keep one exact source/artifact/environment identity for every proof and record rejected scope decisions explicitly.
10. Stop discovery when the first reference edition, reusable primitive gaps, ownership boundaries and decision gates are clear enough to authorize a bounded programme.

## Locked Future C decision gates

These gates are decision rules for BMR-003 discovery; they do not author implementation:

- **Identity gate:** Atlas remains the Business Messaging Agent Runtime; the reference edition consumes Atlas rather than forking it.
- **Reuse gate:** a proposed Atlas change must serve at least the reference edition and a credible second industry/customer-operations use case, or remain Mirai-specific.
- **Boundary gate:** Atlas, Atlas Cloud, Mirai, providers and customer infrastructure each have one clear owner and no duplicate writable authority.
- **Mission gate:** the reference journey must use governed Mission, policy, approval, action, receipt, outcome and human-control primitives rather than bespoke vertical state.
- **Evidence gate:** no hosted, provider, staging, production, billing or compliance maturity claim is made without exact environment evidence and independent replay.
- **No-fork gate:** bespoke vertical schemas, migrations, runtime loops and provider shortcuts are rejected unless a reusable primitive decision explicitly accepts them.
- **Buyer-proof gate:** the first Mirai Industry Edition must prove a complete repeatable customer-operations team journey before broader industry expansion.

## Decisions still open

- Which Mirai Industry Edition and customer-operations team should be the first reference proof.
- The exact customer journey, roles, business outcomes, operator controls and evidence window for that edition.
- Which primitive gaps are genuinely reusable Atlas changes versus Mirai/package-specific composition.
- The authorised hosted Atlas Cloud, staging, provider sandbox, billing test and compliance environments.
- Provider/channel scope, region, tenancy envelope, support owner, spend limits and rollback authority for the reference proof.
- BMR-003 programme owner, timeline, acceptance authority and independent reviewer.

## Explicitly out of scope for this archival sprint

- BMR-003 source code, schemas, migrations, UI, runtime behavior, provider integrations or deployment.
- Future C implementation, industry selection, product design, commercial commitments or production authorization.
- BMR-001 edits, tag creation, history rewriting, new worktrees, unrelated Mirai changes and BMR-002 board expansion.

## First BMR-003 discovery action

Open a fresh Codex or Claude Code session at the sealed BMR-002 HEAD and run [`BMR_003_KICKOFF_PROMPT.md`](./BMR_003_KICKOFF_PROMPT.md). The first session must inventory authorities and audit the reusable primitives before proposing implementation.

## One next action

Open a fresh Codex or Claude Code session at the sealed BMR-002 HEAD and run `BMR_003_KICKOFF_PROMPT.md`.
