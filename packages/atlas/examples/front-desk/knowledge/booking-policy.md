# Booking change policy

- A booking can be moved when the customer identity, consent, and messaging window are valid.
- The requested slot must be represented as normalized governed input.
- Every booking change requires an operator approval before Atlas commits it.
- The action must use an idempotency key and return the original action receipt on identical replay.
- A provider-delivery failure does not reverse or repeat the committed booking change.
- Customer confirmation is sent only through the Atlas outbox after the business outcome commits.
- Unclear identity, availability, consent, policy, or operator takeover requires human handoff.
