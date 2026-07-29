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
