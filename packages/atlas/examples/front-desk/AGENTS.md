# Atlas example guidance

Read `../../docs/AGENT-GUIDE.md` and this project's `atlas.config.ts` before changing the example.

## Invariants

- Atlas owns approval, exactly-once committed execution, outbox delivery, traces, and receipts.
- The deterministic model may propose; it may not claim a committed outcome.
- The web-chat channel is simulated and credential-free.
- Provider-delivery retry must never repeat the booking mutation.
- Raw secrets and project-external paths are forbidden.

## Verify

```bash
atlas doctor --json
atlas test --json
atlas replay --json
```

Run `atlas dev --json` and use the workbench for interactive proof.
