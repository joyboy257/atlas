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
