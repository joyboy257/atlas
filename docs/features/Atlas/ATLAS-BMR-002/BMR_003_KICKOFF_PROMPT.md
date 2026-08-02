# BMR-003 Kickoff Prompt

You are beginning BMR-003 discovery after the sealed Atlas BMR-002 closeout.

Do not implement BMR-003 in this kickoff. Do not create source code, schemas, migrations, UI, runtime behavior, provider integrations or deployment. This prompt is for programme discovery and primitive audit only.

## Starting point

- Begin from the sealed BMR-002 source HEAD: `9c67cd8cbfd45d3c3042bc432639d84ca898ac0f`.
- Work in the Atlas repository and read the repository `AGENTS.md` and `CLAUDE.md` rules first.
- Create a separate BMR-003 planning/execution branch according to the current repository rules only after the initial discovery boundary is understood. Do not create that branch during this archival handoff.
- Read the [BMR-001 constitution and preservation authority](./01_HANDOVER_BASELINE_AND_PRESERVATION.md), [BMR-002 README](./00_README.md), [BMR-002 final decision](./final-decision.v1.json), [BMR-002 execution log](./atlas_bmr002_execution_log.md), [BMR-002 handoff](./BMR_003_HANDOFF.md), and [BMR-002 locked decisions](./03_LOCKED_DECISIONS_AND_DEFAULTS.md).

## Working mission

> Make Atlas capable of powering a complete, repeatable, industry-specific customer-operations team, proven through one Mirai Industry Edition, without forking Atlas or turning it into a bespoke vertical application.

Preserve Atlas as the Business Messaging Agent Runtime. Use Mirai as the buyer-facing reference product. The reference edition must prove reusable Atlas primitives, not justify a new vertical runtime.

## Required discovery sequence

1. Verify the starting commit, branch, worktree, BMR-001 preservation and BMR-002 terminal status.
2. Read the BMR-002 handoff and closeout evidence. Separate `LOCAL_PROVEN`, `CI_PROVEN`, simulator, provider sandbox, staging, production, billing and compliance claims.
3. Audit the available Agent, Mission, provider, policy, approval, action, outbox, receipt, outcome, memory, usage, cost, RBAC and billing primitives.
4. For every primitive, record owner boundary, source of truth, current maturity, callers/consumers, reuse potential, known limitation, evidence and rollback/disable path.
5. Identify one candidate Mirai Industry Edition and its complete customer-operations team journey, but do not select it as final without explicit decision authority.
6. Separate reusable Atlas gaps from Mirai composition, packaged-Agent work, provider configuration and external-environment blockers.
7. Apply the locked Future C decision gates below and record any failed or unresolved gate as a decision, not as implementation work.
8. Produce a bounded discovery verdict and only then request authority for a BMR-003 implementation programme.

## Locked Future C decision gates

- **Identity:** Atlas remains the Business Messaging Agent Runtime.
- **Reuse:** an Atlas primitive must be buyer-neutral and reusable beyond one vertical; otherwise keep it in Mirai or the reference edition.
- **Boundary:** Public Atlas, private Atlas Cloud, Mirai, providers and customer infrastructure each retain one clear owner and one writable authority.
- **Mission:** the reference journey uses governed Mission, policy, approval, action, receipt, outcome and human-control primitives.
- **Evidence:** local or simulator proof never becomes hosted, provider sandbox, staging, production, billing or compliance proof without exact environment evidence.
- **No fork:** do not build a mini Harvey, CRM, generic workflow builder or bespoke vertical fork inside Atlas.
- **Buyer proof:** one complete Mirai Industry Edition must prove repeatable customer-operations value before broader industry expansion.

## Non-negotiable boundaries

- Do not turn Atlas into a CRM, workflow builder, case-management product or bespoke vertical application.
- Do not duplicate Atlas Cloud authority in Mirai or in an industry package.
- Do not grant external reasoning runtimes raw provider credentials or direct durable-state mutation.
- Do not change BMR-002 evidence, the BMR-002 execution board, BMR-001 history or the `atlas-bmr-001-closed` tag.
- Do not claim a provider, hosted, staging, production, billing or compliance maturity state from local tests.
- Do not implement until discovery, primitive audit, ownership boundaries and acceptance authority are recorded.

## Expected discovery output

Return a concise, evidence-linked discovery record containing:

- starting commit and repository state;
- reusable primitive inventory and maturity;
- candidate Mirai Industry Edition and customer-operations team journey;
- Atlas/Mirai/provider/customer ownership map;
- reusable gaps versus reference-product composition;
- decision-gate results and open decisions;
- explicit out-of-scope items;
- the smallest authorised next slice, if any.

The first action is discovery and primitive audit. Do not write BMR-003 implementation code in this session.

## Final instruction

Open a fresh Codex or Claude Code session at the sealed BMR-002 HEAD and run this prompt.
