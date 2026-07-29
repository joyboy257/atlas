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
