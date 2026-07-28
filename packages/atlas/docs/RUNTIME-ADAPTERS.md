# Atlas runtime adapters

All runtimes implement the same `AtlasRuntimeAdapter` contract:

```ts
interface AtlasRuntimeAdapter {
  metadata(): AtlasRuntimeMetadata;
  capabilities(): Promise<AtlasRuntimeCapabilities>;
  propose(request: AtlasTurnRequestV1): Promise<AtlasTurnProposalV1>;
  cancel(requestId: string): Promise<void>;
  health(): Promise<AtlasRuntimeHealth>;
}
```

## Atlas-native

`AtlasNativeRuntimeAdapter` is the reference adapter. Its local fixture is deterministic, credential-free, and cost-free. It proposes the generated booking-reschedule action but does not approve or commit it.

## OpenAI Agents SDK

`AtlasOpenAIAgentsRuntimeAdapter` accepts an injected bridge. The bridge translates an Atlas request into the installed Agents SDK version and translates the result back into `AtlasTurnProposalV1`.

Atlas does not export Agents SDK tool or response types, and the SDK never receives provider-send or business-commit authority.

## Eve

`AtlasEveRuntimeAdapter` uses the same injected bridge boundary. Eve may reason and propose while Atlas owns identity, policy, approval, committed tools, delivery, receipts, usage, and outcomes.

## Generic HTTP

`AtlasHttpRuntimeAdapter` POSTs the vendor-neutral request contract to a configured HTTP endpoint. It supports bounded cancellation, stable outage classification, JSON proposal envelopes, and an optional health endpoint.

Server-side transport headers may be supplied by an internal header provider. They are never part of the turn request or public proposal.

## Conformance

`inspectRuntimeAdapter()` verifies:

- stable identity and supported runtime type;
- turn protocol version negotiation;
- proposal-only public authority;
- declared text and tool-proposal capabilities;
- cancellation support;
- health status.

The runtime protocol suite separately verifies malformed proposals, unknown tools, approval/direct-send bypass, tenant crossing, duplicate replay, timeout, cancellation, and trace/cost receipts.

## Unsupported interpretations

Local bridge fixtures prove Atlas adapter contracts only. They do not prove a real vendor account, vendor API availability, deployment, staging, production, or live messaging-provider operation.
