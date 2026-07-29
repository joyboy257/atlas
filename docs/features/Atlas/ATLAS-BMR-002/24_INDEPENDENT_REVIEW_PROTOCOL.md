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
