# Atlas P2 local certification

`certifyAtlasP2Local()` runs the complete P2 package-local proof:

- four runtime adapters: Atlas-native, OpenAI Agents SDK bridge, Eve bridge, and generic HTTP;
- four inference modes: local fixture, managed, BYOK, and customer gateway;
- all sixteen declared channel adapters through the shared conformance kit.

## Pass conditions

Runtime:

- 4/4 adapter contracts pass;
- every adapter produces one valid governed proposal;
- runtime, tenant, request, trace, usage, and cost receipts correlate;
- no adapter exposes direct-send or commit authority.

Inference:

- 4/4 route modes pass;
- payer is `none`, `atlas`, or `customer` according to mode;
- BYOK and gateway routes use scoped non-secret references;
- fallback remains explicit;
- capability, budget, cost, and retention data are recorded.

Channels:

- 16/16 local conformance suites pass;
- authenticity, account/tenant resolution, duplicates, ordering, outbound validation, consent/window policy, idempotency, failure handling, callbacks, and receipts pass;
- provider-connected and live-provider counts remain zero.

## Run

```bash
pnpm --dir packages/atlas exec vitest run __tests__/p2-conformance.test.ts
```

Programmatic use:

```ts
import { certifyAtlasP2Local } from "@atlas-runner/atlas";

const result = await certifyAtlasP2Local();
if (result.verdict !== "PASS") process.exitCode = 1;
```

## Claim boundary

A local PASS proves the public contracts, deterministic fixtures, and package-local conformance harness. It does not prove provider credentials, provider sandboxes, hosted Atlas Cloud, staging, production, billing settlement, or live sends. Those remain explicit later gates.
