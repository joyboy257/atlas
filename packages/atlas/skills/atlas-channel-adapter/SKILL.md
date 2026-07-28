---
name: atlas-channel-adapter
description: Build and certify an Atlas messaging channel adapter through the shared fabric and conformance kit.
version: 1
package: "@atlas-runner/atlas@0.1.0-alpha.0"
---

# Atlas channel adapter skill

Read `../../docs/CHANNEL-FABRIC.md`, `../../docs/CHANNEL-READINESS.md`, and `../../docs/AUTHORITY.md`.

Implement the complete `AtlasChannelAdapter` contract. Authenticate ingress before normalization. Let Atlas resolve account and tenant authority. Use shared deduplication, ordering, consent/window validation, outbox idempotency, callback reconciliation, and receipts.

Declare capability differences explicitly: surfaces, media, interactivity, reactions, typing, receipts, edits, deletes, proactive policy, rate model, and payload limits.

Run:

```bash
pnpm --dir packages/atlas exec vitest run __tests__/channel-fabric.test.ts
pnpm --dir packages/atlas exec vitest run __tests__/channel-conformance.test.ts
```

A local fixture may earn only `LOCAL_CONFORMANCE`. Do not label an adapter supported, connected, alpha, beta, or live without the corresponding provider evidence.
