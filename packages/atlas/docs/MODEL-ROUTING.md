# Atlas inference, BYOK, and model routing

Atlas keeps model execution behind a provider-neutral contract. Provider SDK request, response, streaming, tool, and credential types do not become public Atlas types.

## Modes

| Mode | Credential owner | Payer | Default fallback |
|---|---|---|---|
| `local-fixture` | none | none | none |
| `managed` | Atlas | Atlas | only explicitly configured |
| `byok` | customer | customer | no managed fallback |
| `gateway` | customer | customer | only explicitly configured |

## Provider contract

An `AtlasModelProvider` declares metadata, model capabilities, completion, streaming, estimation, and health. Routing checks capability and budget before calling `complete()`.

## Model references

Customer-owned model access uses an `AtlasModelReference`:

- reference id, never credential material;
- tenant and environment;
- provider id;
- allow-listed models;
- non-secret fingerprint;
- active or revoked status;
- rotation timestamps.

References can be registered, resolved, rotated, revoked, and listed within tenant scope. Cross-tenant, wrong-environment, wrong-provider, disallowed-model, and revoked references fail closed.

## Route receipt

Every successful route records:

- provider and model;
- mode and non-secret fingerprint;
- payer;
- route reason and fallback use;
- estimated and actual cost in minor currency units;
- input/output token counts;
- retention posture;
- tenant, environment, request, and trace correlation.

## Fallback rules

Fallback is opt-in. An unavailable BYOK provider cannot silently move to Atlas-managed inference. A customer-owned fallback must name its provider, model, mode, and model reference explicitly.

## Stable failures

The router emits stable codes for invalid requests, missing/revoked/scope-mismatched references, unsupported models or capabilities, provider outage, exhausted budget, unauthorised fallback, incompatible gateways, and cost mismatch.

## Local proof boundary

The callback providers in the conformance suite prove routing and authority semantics. They do not prove a hosted provider account, real token billing, provider retention behaviour, staging, or production.
