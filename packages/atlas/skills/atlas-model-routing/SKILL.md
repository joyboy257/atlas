---
name: atlas-model-routing
description: Add or verify managed, BYOK, gateway, or local-fixture inference without losing tenant, payer, cost, or fallback authority.
version: 1
package: "@mirai/atlas@0.1.0-preview.0"
---

# Atlas model routing skill

Read `../../docs/MODEL-ROUTING.md` and `../../docs/AUTHORITY.md`.

Use `AtlasModelProvider` and `AtlasModelRouter`. Keep provider SDK types behind the provider implementation. Customer-owned access uses tenant/environment/provider/model-bound references and non-secret fingerprints.

Verify capability and budget before completion. Record provider, model, mode, payer, route reason, fallback, estimated/actual cost, tokens, retention, request, trace, tenant, and environment.

A BYOK route must not silently fall back to Atlas-managed inference. Fallback requires an explicit route and compatible ownership.

Run:

```bash
pnpm --dir packages/atlas exec vitest run __tests__/model-routing.test.ts
```

Do not log or return credential material. Do not promote local callback fixtures as real provider, staging, production, billing, or retention proof.
