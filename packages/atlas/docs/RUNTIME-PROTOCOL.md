# Atlas runtime-neutral turn protocol v1

Atlas owns business authority. A runtime may reason over scoped context and return a proposal; it may not identify the tenant, approve itself, commit a business mutation, send to a provider, or manufacture receipts.

## Request

`AtlasTurnRequestV1` contains only server-scoped information:

- protocol, request, trace, and package versions;
- server-derived tenant id and scopes;
- runtime identity;
- bounded customer and conversation context;
- current channel capabilities;
- normalized messages;
- approved knowledge evidence;
- allow-listed tool contracts;
- policy constraints;
- output, action, and deadline limits.

The schema is shipped at `schema/atlas-turn-request.v1.schema.json`.

## Proposal

`AtlasTurnProposalV1` may contain:

- a customer-response proposal;
- normalized proposed tool actions;
- a handoff request;
- citations to evidence supplied in the request;
- safe scalar usage metadata.

It cannot contain provider credentials, direct-send instructions, approval state, committed state, tenant overrides, policy overrides, or billing authority. The schema is shipped at `schema/atlas-turn-proposal.v1.schema.json`.

## Gateway enforcement

`AtlasRuntimeGateway` validates:

1. protocol version negotiation;
2. runtime identity and type;
3. runtime health;
4. request idempotency and replay;
5. bounded timeout and cancellation;
6. proposal schema and request correlation;
7. unknown or unscoped tools;
8. required action idempotency keys;
9. approval, direct-send, and tenant-crossing attempts;
10. trace, duration, usage, and cost correlation.

An identical replay returns the original proposal and receipt. Different input under the same request id fails with `REQUEST_IDEMPOTENCY_MISMATCH`.

## Authority invariant

```text
External runtime: reason, retrieve allowed context, propose
Atlas: tenant, policy, approval, commit, outbox, delivery, receipts, audit, usage, outcome
```

Do not expose a provider SDK request, response, tool, or credential type as an Atlas public protocol type.

## Verification

Run:

```bash
pnpm --dir packages/atlas exec vitest run __tests__/runtime-protocol.test.ts
pnpm --dir packages/atlas exec vitest run __tests__/runtime-adapters.test.ts
```

Local protocol and adapter proof does not establish hosted, staging, production, or live-provider operation.
