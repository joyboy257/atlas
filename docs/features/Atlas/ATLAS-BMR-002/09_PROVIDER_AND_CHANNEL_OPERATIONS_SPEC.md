# Provider and Channel Operations Specification

**Programme:** `ATLAS-BMR-002`  
**Package version:** `3.0.0-execution`  
**Date:** `2026-07-29`  
**Status:** `EXECUTION AUTHORITY`


## Objective

Build a repeatable provider-expansion system. Do not add adapters ad hoc or treat a declared channel as production-supported.

## Readiness vocabulary

```text
DECLARED
LOCAL_CONFORMANCE
PROVIDER_SANDBOX_PROVEN
LIMITED_PRODUCTION
PRODUCTION_PROVEN
BLOCKED_PROVIDER
DEPRECATED
```

Every readiness record is scoped by:

- channel and provider;
- adapter/contract version;
- provider account/business/app;
- environment;
- region/geography;
- inbound/outbound/media/template capabilities;
- customer/consent constraints;
- evidence timestamp and expiry;
- support owner;
- known limitations.

## Promotion requirements

### DECLARED → LOCAL_CONFORMANCE

Requires portable contract implementation, simulator fixtures, auth/config validation, capability matrix, failure mapping and conformance suite. No provider claim.

### LOCAL_CONFORMANCE → PROVIDER_SANDBOX_PROVEN

Requires an eligible sandbox/test account, real provider API/webhook exchange where the provider supports it, authenticity verification, credential rotation/revocation, retries, rate/limit behavior, delivery reconciliation, redacted evidence and documented gaps.

### PROVIDER_SANDBOX_PROVEN → LIMITED_PRODUCTION

Requires explicit account/region/customer envelope, consent/templates/windows where applicable, spend cap, support hours, incident/runbook ownership, bounded live traffic, current delivery reconciliation and rollback/disable path.

### LIMITED_PRODUCTION → PRODUCTION_PROVEN

Requires a separately defined sustained evidence window, measured SLO/cost/support performance, incident evidence, capacity envelope and repeated release/provider certification. BMR-002 does not require this universal state.

## Provider scorecard

Score at least:

| Dimension | Question |
| --- | --- |
| Customer demand | Which actual Atlas/Mirai workflows need it? |
| Geography | Is it relevant to initial customers/region? |
| Eligibility | Can Atlas obtain and retain the necessary account/business/app status? |
| Onboarding | API key, OAuth, embedded signup, business review, phone/domain verification? |
| Messaging rules | Consent, windows, templates, opt-out, content or category restrictions? |
| Webhooks | Authenticity, ordering, retry, replay, event completeness? |
| Delivery | Accepted/sent/delivered/read/failed semantics and reconciliation? |
| Media | Size/type/storage/security constraints? |
| Rate and spend | Quotas, throughput, price, registration and unexpected-cost risk? |
| Operations | Outage, support, observability, version drift and deprecation burden? |
| Commercial value | Does channel access create understandable customer value? |
| Certification cost | Accounts, devices, numbers, reviews, test traffic and engineering time? |

## BMR-002 provider wave

Default sequence, subject to P0/P5 evidence:

```text
Web Chat/reference simulator
→ reverify and harden Resend email
→ score at least three second-provider candidates
→ certify one candidate in provider sandbox
→ promote only one account/environment to limited production when authorised
```

Twilio SMS is a recommendation to score, not a locked provider decision. WhatsApp direct versus BSP/Twilio is a separate product/eligibility choice.

## Webhook security

Provider ingress must:

- preserve the original request bytes when signature algorithms require it;
- validate signature/authenticity before business processing;
- bind the correct provider account/environment;
- enforce timestamp/replay policy where available;
- deduplicate provider event/message identifiers;
- tolerate documented reordering and retries;
- store redacted evidence and correlation;
- reject unknown versions or event types safely.

## Delivery reconciliation

Provider callbacks update a provider receipt or superseding state; they do not directly mark a Mission outcome. A reconciliation job resolves missing callbacks, ambiguous acceptance, duplicate delivery reports and provider queries where supported.

## Provider outages

During provider failure Atlas may:

- stop new admission;
- wait and retry within bounded policy;
- hand off;
- switch to another authorised channel only with identity/consent/policy;
- fail truthfully;
- notify operators/customers through available channels.

Atlas may not silently route through an unapproved provider/account.

## Credential lifecycle

Provider credentials are private Cloud authority:

- encrypted and scoped by environment/account/capability;
- inaccessible to external reasoning runtimes;
- redacted from logs/traces/evidence;
- rotatable and revocable;
- validated before activation;
- auditable by actor and version;
- removed or disabled on disconnect.

## Version drift and deprecation

Adapters record provider API/version assumptions. Scheduled contract checks and provider notices create readiness review events. A deprecated provider state includes migration path, stop-admission date, active-Mission handling and customer communication.

## Provider support operations

Each limited-production lane names:

- technical owner;
- provider-account owner;
- credential owner;
- compliance/consent owner;
- incident escalation;
- spend/quota owner;
- customer support path;
- disable/rollback authority.
