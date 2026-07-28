# Atlas shared channel fabric

Every Atlas channel uses one provider-neutral lifecycle:

```text
provider event
→ ingress authenticity
→ account and tenant resolution
→ deduplication and ordering
→ normalized message/thread
→ Atlas turn
→ policy, approval, or handoff
→ outbox
→ provider submission
→ callback reconciliation
→ delivery receipt
```

A channel adapter cannot supply tenant authority, call committed tools directly, send outside the Atlas outbox, overwrite approval state, or manufacture provider receipts.

## Adapter contract

```ts
interface AtlasChannelAdapter {
  metadata(): AtlasChannelMetadata;
  capabilities(): Promise<AtlasChannelCapabilities>;
  verifyIngress(request: AtlasRawIngress): Promise<AtlasVerifiedIngress>;
  normalizeInbound(input: AtlasVerifiedIngress): Promise<AtlasInboundEvent>;
  validateOutbound(message: AtlasOutboundMessage): Promise<AtlasOutboundValidation>;
  sendOutbound(message: AtlasOutboundMessage): Promise<AtlasProviderSubmission>;
  handleProviderEvent(event: unknown): Promise<AtlasProviderEvent>;
  health(): Promise<AtlasChannelHealth>;
}
```

## Shared fabric enforcement

`AtlasChannelFabric` owns:

- registered channel accounts and server-derived tenant resolution;
- authenticity before normalization;
- event idempotency and mismatched-duplicate rejection;
- sequence hold and deterministic drain;
- outbound tenant/account validation;
- channel capability, payload, media, consent, window, and template validation;
- outbox idempotency;
- provider submission state;
- monotonic delivery callbacks;
- ingress, outbox, submission, and delivery receipts.

## Conformance

Every adapter runs the same fixtures:

- valid and invalid ingress authenticity;
- identical duplicate and mismatched duplicate;
- out-of-order hold and drain;
- oversized payload and unsupported media;
- consent/window/template policy;
- valid send and idempotent replay;
- transient failure and rate limiting;
- permanent rejection;
- callback delivery, duplicate callback, and stale regression;
- tenant crossing.

Run `runAtlasChannelConformance(adapter)` for one adapter or `runAtlasChannelProgramme(adapters)` for the complete catalog.

## Local simulator honesty

The packaged declarative adapters use deterministic local fixtures. They exercise the real shared fabric contract but do not call provider APIs. Local conformance is not sandbox proof, provider connection, public support, or live-provider proof.
