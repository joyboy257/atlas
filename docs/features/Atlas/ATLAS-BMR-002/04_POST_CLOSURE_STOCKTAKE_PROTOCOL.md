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
