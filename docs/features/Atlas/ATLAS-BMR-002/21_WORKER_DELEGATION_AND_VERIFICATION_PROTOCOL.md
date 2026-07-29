# Worker Delegation and Verification Protocol

**Programme:** `ATLAS-BMR-002`  
**Package version:** `3.0.0-execution`  
**Date:** `2026-07-29`  
**Status:** `EXECUTION AUTHORITY`


## Operating rule

The principal Claude Code session owns product decisions, architecture, implementation, integration, evidence posture and release judgment.

Workers are verification instruments—not co-architects or substitute implementers.

## Permitted worker roles

| Worker | Permitted work | Prohibited work |
| --- | --- | --- |
| `atlas-bmr002-test-runner` | Run named tests/evals, capture exact results, isolate failures | Edit source, redesign, weaken tests |
| `atlas-bmr002-verifier` | Reproduce acceptance criteria, inspect source/evidence, adversarial review | Implement primary solution, mark PASS |
| `atlas-bmr002-release-reviewer` | Gate/evidence/provenance/security/release review | Deploy, waive gates, mutate release state |
| `atlas-bmr002-commit-worker` | Review exact approved diff, stage bounded paths, commit with supplied message | Edit source, include unrelated files, push/merge/tag |

The principal session may use fresh manual sessions/worktrees when stronger independence is required. Editing parallel sessions must use isolated worktrees and explicit integration ownership.

## Delegation packet

Every worker receives:

```yaml
programme: ATLAS-BMR-002
phase:
work_item:
gate:
role:
repository_path:
branch_and_head:
allowed_paths:
forbidden_paths:
exact_question:
commands_or_tests:
acceptance_criteria:
evidence_output:
time_or_scope_bound:
model_identity_rule:
```

Do not delegate “review everything” without a bounded question.

## Verification return

Worker returns:

- exact branch/HEAD/dirty state observed;
- commands;
- exit codes;
- relevant stdout/stderr;
- files/lines reviewed;
- reproduced behavior;
- findings ranked by severity;
- evidence path/checksum;
- unresolved uncertainty;
- `PASS_RECOMMENDED`, `FAIL_RECOMMENDED`, or `INCONCLUSIVE`.

The principal session decides item/gate status after inspecting the return and current source.

## Independence

A review is independent only when the verifier did not implement the reviewed slice and reproduces material evidence from source/environment. Rephrasing the implementer’s report is not independent verification.

## Model/provider identity

A worker definition or name is not proof of its model/provider.

When identity matters, record:

- requested model or route;
- Claude Code agent name;
- observable environment fields such as `CLAUDE_CODE_SUBAGENT_MODEL` where available;
- session/agent identifier;
- provider/router evidence where the environment exposes it.

If the resolved route cannot be proven, record:

```text
UNVERIFIED_ROUTER_IDENTITY
```

Do not block correctness testing merely because router identity is unavailable.

## Worker event log

Optional hooks may append redacted events to:

```text
.factory/evidence/atlas-bmr-002/subagent-delegation.jsonl
```

Events must never contain prompt secrets, credentials, customer content or unredacted environment values.

## Commit worker

Before delegation, the principal session:

1. reviews `git status` and full diff;
2. names exact paths;
3. confirms tests/evidence;
4. supplies commit message;
5. confirms no push/tag/merge.

The commit worker verifies boundaries, stages only named paths, shows staged diff, commits and returns SHA. It aborts on unrelated or secret-bearing changes.

## Prohibited delegation patterns

- asking a worker to “build P2”;
- allowing a reviewer to patch findings silently;
- using many agents on the same writable worktree;
- accepting green summaries without commands/evidence;
- marking PASS because two workers agreed;
- claiming a specific model/provider without observable proof;
- delegating production promotion.
