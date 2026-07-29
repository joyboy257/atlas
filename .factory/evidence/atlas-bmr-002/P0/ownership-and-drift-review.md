# ATLAS-BMR2-P0-003 — Ownership, Drift, and Adjacent Programme Review

**Evidence ID:** `ATLAS-BMR2-P0-003-EVIDENCE-001`  
**Timestamp:** `2026-07-29T11:50:00+08:00`  
**Reviewer:** principal orchestrator (Claude Code / DeepSeek Pro)  
**Status:** `PASS`

## 1. Adjacent Programme Classification

Each programme mentioned in the BMR-002 scope is classified against the Atlas repository:

| Programme | Classification | Evidence | Action |
|-----------|---------------|----------|--------|
| **Mirai ONE** | CONSUMER | Active programme in `/Users/deon/Developer/mirai` (main, 5 recent commits). Building commercial truth gate, developer console, WhatsApp scorecard under `docs/features/MiraiOne/`. | Atlas must provide public control contracts (approval, handoff, operator actions). Mirai must not depend on private Atlas concepts. No code interface exists yet — this is P1/P2 work. |
| **AI Front Desk** | CONSUMER / EXAMPLE | Appears as a template example in `packages/atlas/examples/front-desk/`. Not found as a separate programme repository. | Template is reference material only. If it becomes a separate product, it consumes Atlas contracts. |
| **AtlasAPI** | NOT FOUND | No code, docs, or references found in the atlas repository. Possibly a planned or historical name for the Atlas Cloud API. | Deferred until surfaced. If it emerges, it is the private Cloud API surface — distinct from the public SDK. |
| **Runtime-003** | NOT FOUND | No code, docs, or references found. Possibly an internal BMR-001 work item or adjacent runtime project. | Deferred until surfaced. May relate to external runtime protocol (P3). |
| **Performance programme** | OUT OF SCOPE | Not in atlas repo. Performance SLO measurement is P4 scope within BMR-002. | BMR-002 owns Atlas performance SLOs. External performance programme is not absorbed. |
| **Provenance programme** | OUT OF SCOPE | Not in atlas repo. Memory provenance is P2 scope within BMR-002. | BMR-002 owns Agent memory provenance. External provenance programme is not absorbed. |
| **GTM programme** | OUT OF SCOPE | Not in atlas repo. Go-to-market is outside BMR-002 technical scope. | Explicitly excluded. BMR-002 delivers product; GTM is separate authority. |

## 2. Duplicate Writable Authority Check

**RISK-018 (Atlas and Mirai write competing authority):** Currently MITIGATED by clear documentation but no runtime enforcement.

| Authority Domain | Atlas Owner | Mirai Owner | Conflict? |
|-----------------|-------------|-------------|-----------|
| Agent/Mission lifecycle | `packages/atlas/src/local-runtime.ts` | None | No — Mirai has no Agent runtime |
| Approval/handoff state | `packages/atlas/src/local-runtime.ts` (proposal gates) | None | No — Mirai has no approval engine |
| Provider delivery | `packages/atlas/src/channel-adapters.ts` | None | No — Mirai has no channel adapters |
| Operator UX | Declared as Mirai domain | `web/app/operator/` | No conflict — boundary is explicit |
| Commercial truth | None in Atlas yet | `docs/features/MiraiOne/contracts/commercial-truth-residuals.v1.json` | POTENTIAL — both may model usage/cost. Needs P1 contract resolution. |
| Team Inbox | Declared as Mirai domain | `web/` components | No conflict — boundary is explicit |

**Verdict:** No active duplicate authority today because Mirai has not yet integrated with Atlas. The commercial truth domain is the highest-risk overlap and must be resolved in P1/P6 contract work.

## 3. Post-Certification Drift Analysis

Since no BMR-001 closure tag exists, "post-certification" drift means the commits since the initial alpha (commit `155c365`). All 5 commits are classified:

| Commit | Classification | BMR-002 Action |
|--------|---------------|----------------|
| `155c365` feat: initial public alpha | BASELINE — BMR-001 output | Accepted as foundation |
| `cc43655` fix: replace @mirai/atlas with @atlas-runner/atlas | PRESERVED BMR-001 FIX — rebranding | Already in baseline; no action needed |
| `2ecc66b` feat: add 3 runnable starter templates (P4-007) | BMR-002 PREREQUISITE — template surface | Adopted; templates are P4-007 surface |
| `c415bb4` fix: update version string from preview to alpha | PRESERVED BMR-001 FIX — honest versioning | Adopted; version drift caused 1 test failure (cosmetic) |
| `7fc1ec8` feat(beta): P4-006/P4-008 prep — sandbox infra, deploy docs, beta release plans | BMR-002 PREREQUISITE — deploy surface | Adopted; sandbox infra is P4 surface |

**Drift test result:** The single test failure (`scaffold.test.ts` expects `0.1.0-preview.0` but package is `0.1.0-alpha.0`) is a cosmetic version-string mismatch from the honest rename in `c415bb4`. No runtime behavior affected. Fix in P0-004 or first P1 item.

**No regressions detected.** All 158 other tests pass. No certified behavior was broken because no certification existed.

## 4. Residual Debt Inventory

### Technical Debt
| Debt | Severity | Owner | Phase |
|------|----------|-------|-------|
| 5 of 8 packages are stubs (empty package.json only) | HIGH | P3 | Progressive extraction per ROADMAP |
| No CI/CD pipeline in repository | HIGH | P4 | CI must exist before staging claims |
| No database migrations (sandbox docker-compose exists but no migration files) | HIGH | P4 | Required for durable state |
| No queue/worker implementation (docker-compose defines worker but no worker code) | HIGH | P4 | Required for outbox relay |
| 1 test version-string drift | LOW | P0-004 | Fix test expectation |
| Managed inference mode is IMPLEMENTING (local fixture works) | MEDIUM | P4 | Requires Atlas Cloud backend |
| No end-to-end journey tests (only unit tests) | HIGH | P1-P7 | Whole-product tests per build strategy |

### Operational Debt
| Debt | Severity | Owner | Phase |
|------|----------|-------|-------|
| No staging environment | CRITICAL | P4 | Blocks G7/G8 |
| No production environment | CRITICAL | P4 | Blocks G9 |
| No incident response runbook (docs exist, untested) | HIGH | P4 | Must be drilled |
| No backup/restore procedure | HIGH | P4 | Required before data-bearing deployment |
| No SLO definitions or measurement | HIGH | P4 | Required for production claims |
| No monitoring/alerting | HIGH | P4 | Required for production operations |

### Commercial Debt
| Debt | Severity | Owner | Phase |
|------|----------|-------|-------|
| No usage/cost ledger | CRITICAL | P6 | Required before any billing |
| No billing integration | CRITICAL | P6 | Required before commercial operation |
| No pricing model (billing integration plan exists as doc only) | HIGH | P6 | Required before customer signup |
| No quota or spend enforcement | HIGH | P6 | Required before provider-connected operation |
| No self-serve signup flow | MEDIUM | P6 | Required before public availability |

### Ecosystem Debt
| Debt | Severity | Owner | Phase |
|------|----------|-------|-------|
| No extension contract or SDK publication | HIGH | P7 | Required before third-party adoption |
| No conformance kit (mentioned in docs but no implementation) | HIGH | P3/P7 | Required for external runtime certification |
| No npm publication | HIGH | P3 | Required before any developer adoption |
| No marketplace or discovery mechanism | MEDIUM | P7 | Deferred per ROADMAP |

### Provider Debt
| Debt | Severity | Owner | Phase |
|------|----------|-------|-------|
| 0 of 16 channels have live provider connections | CRITICAL | P5 | Core product requirement |
| Resend integration declared but no code/config evidence in repo | HIGH | P5 | Must be built or re-verified |
| No provider credential management (local keychain exists but no provider secret rotation) | HIGH | P5 | Required for production providers |
| No provider outage/degradation handling | MEDIUM | P5 | Required for honest provider states |

## 5. Risk Register Cross-Reference

All 30 risks from `18_RISK_BLOCKER_AND_EXTERNAL_DEPENDENCY_REGISTER.md` are acknowledged. Immediate P0-relevant risks:

- **RISK-001 (BMR-001 closure differs):** CONFIRMED — handled via P0-001 erratum
- **RISK-018 (Atlas/Mirai competing authority):** MONITORED — no active conflict; commercial truth domain needs P1 resolution
- **RISK-028 (Unrelated work overwritten):** MITIGATED — single worktree, no concurrent programmes in atlas repo

## 6. P0 Execution Thesis Coherence

The BMR-002 execution thesis remains **coherent** after verification:

1. The codebase is real, working, and honest about its alpha state
2. No false production claims exist to unwind
3. The product architecture (public SDK + private Cloud + Mirai operator UX) is well-defined
4. The 57 work items in `execution-board.v3.json` are appropriately scoped
5. The co-equal build stream model (P2–P6) is correct — Cloud, providers, governance, and billing are not subordinate to the Agent runtime

**One amendment recommended:** Fix the scaffold test version-string drift in P0-004 to start P1 with a clean test suite (159/159).

## Verdict

`ATLAS-BMR2-P0-003 = PASS` — 7 adjacent programmes classified; no duplicate writable authority found (commercial truth flagged for P1 resolution); 5-commit drift is all benign; residual debt catalogued across technical, operational, commercial, ecosystem, and provider dimensions; execution thesis is coherent.
