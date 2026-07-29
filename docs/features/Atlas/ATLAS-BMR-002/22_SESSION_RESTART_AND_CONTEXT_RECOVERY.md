# Session Restart and Context Recovery

**Programme:** `ATLAS-BMR-002`  
**Package version:** `3.0.0-execution`  
**Date:** `2026-07-29`  
**Status:** `EXECUTION AUTHORITY`


## Goal

A new Claude Code session can continue correctly using only repository state, this package and the execution log.

## At session start

1. Read repository instructions.
2. Inspect branch, HEAD, worktrees and dirty state.
3. Read `00_README.md`.
4. Read the latest `atlas_bmr002_execution_log.md` carry-forward.
5. Load `execution-board.v3.json`.
6. Identify active item and dependencies.
7. Read only the relevant spec/gate/requirement/evidence.
8. Verify the log’s Git state against reality.
9. Append a takeover checkpoint.
10. Continue the exact next action.

## Before compaction or session end

Update:

- active phase/item/status;
- exact mission;
- branch/HEAD/dirty/untracked state;
- architecture decisions made;
- files changed;
- tests/commands/results;
- evidence created;
- environment/provider scope;
- current failures and root-cause hypotheses;
- worker reviews;
- commits;
- blockers and exact unblock action;
- one exact next action.

## Carry-forward template

```markdown
## Context carry-forward

### Mission
...

### Active phase and item
- Phase:
- Item:
- Status:
- Gate:

### Git/worktree
- Worktree:
- Branch:
- HEAD:
- Dirty/untracked:
- Concurrent worktrees:

### Current implementation
- Decisions:
- Changed files:
- Migrations/config:
- Feature flags:

### Verification
- Commands/results:
- Evidence:
- Independent review:

### Failures and blockers
- Failure:
- Root-cause evidence:
- Blocker:
- Unblock action:

### Exact next action
...
```

## Optional Claude Code compact hook

The package includes an example `SessionStart` hook that prints a small context reminder after compaction. Merge it into existing settings only after inspecting current hooks. Do not overwrite repository/user settings.

## Recovery contradictions

When log and Git disagree, current Git/source evidence wins. Record the contradiction before continuing. Never repair it by resetting or deleting unknown work.
