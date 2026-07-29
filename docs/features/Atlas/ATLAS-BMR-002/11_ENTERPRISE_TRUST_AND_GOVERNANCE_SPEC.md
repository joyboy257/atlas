# Enterprise Trust and Governance Specification

**Programme:** `ATLAS-BMR-002`  
**Package version:** `3.0.0-execution`  
**Date:** `2026-07-29`  
**Status:** `EXECUTION AUTHORITY`


## Objective

Install the minimum control and evidence layer needed for serious bounded business adoption, without claiming a certification or legal posture that has not been earned.

## Organisation and environment governance

Canonical hierarchy:

```text
organisation
→ project
→ environment
→ Agent deployment/version
→ Mission
```

Every request derives this context from authenticated identity and server-side membership/scope. Client-supplied identifiers are selectors only after authorisation, never authority.

Environment boundaries separate local/test/sandbox/staging/limited-production/production credentials, data, providers, quotas and deployments.

## Roles and scopes

P6 defines exact roles from current product needs. Distinguish:

- organisation owner/admin;
- developer/deployer;
- operator;
- approver;
- auditor/read-only;
- billing admin;
- support responder;
- machine/service identity;
- provider connection manager.

Do not create one broad token for runtime, deployment, provider operations and billing.

## Identity federation

OIDC/SSO should be assessed and implemented when enterprise beta demand and current stack justify it. Validate issuer, audience, nonce/state, redirect, session, group/role mapping, deprovisioning and break-glass access.

SCIM is not automatic scope. Record demand, lifecycle burden and source-of-truth decisions first.

## Audit and immutable evidence

Audit events include actor, identity type, tenant/project/environment, action, target, policy/version, before/after reference where safe, correlation, timestamp and evidence chain.

Audit export is tenant-scoped, documented, reproducible and tamper-evident. “Immutable” must be tied to a storage/control mechanism, not wording.

## Encryption and keys

Document and test:

- encryption in transit;
- encryption at rest;
- field/envelope encryption for sensitive credentials/data where needed;
- key hierarchy and ownership;
- rotation/revocation;
- backup/restore behavior;
- separation of duties;
- logging/evidence redaction.

Customer-managed keys remain decision-gated until customer value and operational consequences are understood.

## Secret management

Raw provider/model/customer credentials never enter public packages, model context, ordinary telemetry, screenshots or evidence. Private workers obtain short-lived/scoped access. Rotation and revocation are tested.

## Data classification and lifecycle

Classify at least:

- public package/config;
- customer/business data;
- message content/media;
- knowledge/memory;
- credentials;
- audit/security events;
- billing/usage;
- telemetry;
- evidence artifacts.

Retention, export, deletion and derived-data invalidation are defined per class. Provider-held data and deletion limits are documented.

## Residency

Do not claim residency merely because a database is located in a region. Map every processing/storage/subprocessor/provider path and backup/telemetry route. Initial BMR-002 region scope is explicit and bounded.

## Incident and abuse response

Define severity, triage, containment, credential/provider disable, tenant isolation, evidence preservation, customer/provider communication, restoration and post-incident review.

Abuse controls include account creation, provider sends, content/tool misuse, credential attacks, excessive spend, cross-tenant probes and malicious extensions.

## Compliance-control mapping

For each considered standard/regulation classify controls as:

```text
IMPLEMENTED_WITH_EVIDENCE
IMPLEMENTED_NEEDS_EVIDENCE
REQUIRES_ORGANISATIONAL_PROCESS
REQUIRES_EXTERNAL_AUDIT_OR_ATTESTATION
NOT_APPLICABLE_OR_PREMATURE
```

Relevant candidates may include SOC 2, ISO 27001, GDPR, HIPAA or PCI DSS depending on customer/data/action scope. None is claimed by this package.

## Tenant isolation certification

Test at API, job/queue, database, cache, object storage, search/vector retrieval, telemetry, audit export, usage/billing, provider connection, support tooling and extension boundaries.

A single happy-path tenant test cannot certify isolation.
