# BMR-001 Handover Baseline and Preservation

**Programme:** `ATLAS-BMR-002`  
**Package version:** `3.0.0-execution`  
**Date:** `2026-07-29`  
**Status:** `EXECUTION AUTHORITY`


## Reported baseline—not yet accepted as live truth

```text
Worktree: /Users/deon/Developer/mirai-atlas-bmr001
Expected branch: codex/atlas-bmr-001-p0-audit
Reported commit: 4bf5da957d
Reported tag: atlas-bmr-001-closed
Reported board result: 50/50 PASS across P0–P4
Reported programme: ATLAS-BMR-001
```

Reported evidence includes real Resend email proof, Infisical-backed credentials, P4 self-serve beta material, six-gate release evidence, plaintext-secret remediation, migration contract tests, worker smoke tests, and database migration evidence.

These claims are inputs to `ATLAS-BMR2-P0-001`, not accepted proof.

## Preservation law

BMR-001 is a closed historical programme. Claude Code must not:

- move BMR-002 work into the BMR-001 board;
- edit old PASS claims to fit new requirements;
- mutate or recreate `atlas-bmr-001-closed`;
- rewrite closure commits or checksums;
- rename historical work;
- reset, clean, discard, rebase, or force-push;
- erase limitations, blockers, deferred work, or exact environment claims;
- treat BMR-002 as “P5 of BMR-001.”

A discovered inaccuracy becomes one of:

```text
BMR001_POST_CLOSURE_ERRATUM
BMR001_POST_CLOSURE_REGRESSION
BMR001_EVIDENCE_UNAVAILABLE
BMR001_CLAIM_VERIFIED
```

The record belongs under:

```text
.factory/evidence/atlas-bmr-002/P0/
```

and is referenced from the BMR-002 execution log.

## Exact P0 closure checks

1. Enumerate all worktrees and their branches, HEADs and dirty state.
2. Resolve the reported commit as a complete object and inspect its parents, tree and changed paths.
3. Resolve the tag object and verify its target. Do not recreate it if absent.
4. Compare current HEAD and tree to the closure commit.
5. Read the canonical BMR-001 board and independently count terminal work items.
6. Read the final release decision and all gate verdicts.
7. Verify checksum manifests against actual files.
8. Identify generated registries and whether they match source authorities.
9. Inspect public/private package boundaries, package publication state, Atlas Cloud deployment state, provider proof, database/worker proof, staging/production proof and unresolved limitations.
10. Record exact commands, outputs, timestamps, paths and environment identity.

## Worktree rule

Do not create a new implementation branch until current worktrees and concurrent work are understood. When an isolated BMR-002 lane is needed:

- branch from the verified certified baseline or its reviewed post-closure descendant;
- use a descriptive BMR-002 branch;
- never overwrite a dirty worktree;
- record the branch point and worktree path in `atlas_bmr002_execution_log.md`;
- do not push, merge, tag, publish, or change visibility without explicit authority.

## Source drift

Every source change after the closure tag is classified:

| Class | Meaning | BMR-002 action |
| --- | --- | --- |
| Preserved BMR-001 fix | Compatible maintenance after closure | Adopt only after tests and provenance review. |
| Adjacent programme work | Owned elsewhere | Record dependency/interface; do not absorb. |
| BMR-002 prerequisite | Needed for this programme | Bring into the isolated execution lane deliberately. |
| Regression | Breaks certified behavior | Record post-closure regression and repair before relying on it. |
| Unknown | Ownership/evidence unclear | Quarantine from claims until resolved. |

## Minimum verified stocktake output

The P0 evidence bundle must state:

- exact closure and current Git state;
- exact delivered capabilities and maturity;
- public and private package state;
- developer journey and package publication state;
- provider account, environment and evidence scope;
- database/queue/worker/deployment state;
- staging and production claims;
- external blockers;
- operational, technical, commercial and ecosystem debt;
- adjacent programme owners;
- whether this package’s execution thesis remains coherent.

No user reconstruction is required.
