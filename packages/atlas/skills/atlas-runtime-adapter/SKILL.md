---
name: atlas-runtime-adapter
description: Integrate an external agent runtime through the Atlas proposal-only turn protocol.
version: 1
package: "@mirai/atlas@0.1.0-preview.0"
---

# Atlas runtime adapter skill

Read `../../docs/RUNTIME-PROTOCOL.md`, `../../docs/RUNTIME-ADAPTERS.md`, and `../../docs/AUTHORITY.md`.

Implement `AtlasRuntimeAdapter` without exporting provider SDK types. The runtime may reason and propose only. It must not supply tenant authority, approve itself, commit a business mutation, send to a messaging provider, or forge receipts.

Required verification:

```bash
pnpm --dir packages/atlas exec vitest run __tests__/runtime-protocol.test.ts
pnpm --dir packages/atlas exec vitest run __tests__/runtime-adapters.test.ts
```

Run `inspectRuntimeAdapter()` and preserve version, health, timeout, cancellation, duplicate replay, tenant-crossing, unknown-tool, and approval/direct-send negative evidence.

Do not claim vendor, hosted, staging, production, or live-provider proof from an injected local bridge.
