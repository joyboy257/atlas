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
