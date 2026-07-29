# Production Atlas Cloud Reliability Specification

**Programme:** `ATLAS-BMR-002`  
**Package version:** `3.0.0-execution`  
**Date:** `2026-07-29`  
**Status:** `EXECUTION AUTHORITY`


## Reliability objective

Run persistent Missions truthfully under expected load and bounded failure. Reliability is measured at the customer/business lifecycle, not merely HTTP availability.

## Initial topology assumptions

P4 must replace assumptions with measured decisions. The default single-region shape includes:

- external ingress and webhook authenticity layer;
- control/API service;
- Mission coordinator workers;
- action/outbox workers;
- provider-specific worker pools;
- durable PostgreSQL or verified equivalent;
- durable queue/transport where used;
- managed secret/KMS integration;
- artifact registry and deployment pipeline;
- object/evidence storage;
- telemetry pipeline;
- support/status/incident operations;
- backup and isolated restore target.

## Workload model

Measure at least:

- inbound events per second and burst;
- concurrent active/waiting Missions;
- Mission steps and reasoning calls;
- context/knowledge reads;
- approvals/handoffs;
- Action/outbox throughput;
- provider sends and callbacks;
- media payload/storage;
- usage/cost events;
- operator reads/commands;
- retries, duplicates and poison work;
- tenant skew and abuse.

Every capacity report states exact fixture, source candidate, topology, data size, run duration, confidence, bottleneck, cost and exclusion.

## SLI families

Candidate indicators—final objectives require measurement:

- accepted valid ingress that becomes a durable Observation;
- Mission transition correctness and freshness;
- approval/handoff command durability;
- committed Action correctness;
- outbox age and reconciliation freshness;
- provider delivery-state freshness;
- false-success and duplicate-effect rate;
- tenant-isolation violations—target zero;
- recovery point/time;
- operator-control availability;
- usage/cost receipt completeness.

Avoid one aggregate “99.9% Atlas uptime” before user journeys and failure modes are defined.

## Error-budget policy

Error-budget consumption triggers named actions such as:

- stop risky feature/provider promotion;
- reduce autonomy or admission;
- freeze non-reliability releases;
- increase verification;
- trigger incident review;
- demote provider readiness;
- stop limited-production onboarding.

The policy has owner, measurement window, exceptions and escalation. It is not merely a dashboard.

## Worker and queue strategy

Partition by semantics, not convenience:

- Mission coordination must preserve per-Mission state ordering;
- Action/outbox workers preserve idempotency and effect isolation;
- provider pools isolate provider quotas/outages;
- tenant fairness prevents monopolisation;
- poison work goes to explicit dead-letter handling;
- leases/visibility timeouts match operation characteristics;
- scale-down drains safely.

## Backpressure

Admission considers database/queue/provider/inference saturation, tenant quota, global safety threshold and estimated cost. Accepted work must be durably represented. Rejection/defer states are typed and observable.

## Graceful degradation

Examples:

- inference unavailable → deterministic fallback only if safe, otherwise wait/handoff;
- provider unavailable → wait/handoff/fail/authorised channel fallback;
- observability unavailable → receipts remain authoritative; operate only within policy;
- billing adapter unavailable → canonical usage continues; paid admission follows configured risk;
- operator UI unavailable → control API/runbook remains available where designed;
- knowledge dependency unavailable → refuse unsupported factual action or hand off.

## Backup and recovery

Back up all authorities needed to reconstruct:

- tenant/project/environment;
- Agent versions/deployments;
- Mission events/state/waits;
- policy/approval/handoff;
- Actions/outbox/receipts;
- usage/cost;
- provider connection metadata;
- evidence/provenance.

Secrets follow secret-manager recovery procedures and are not copied into ordinary database backups.

A restore drill reconciles provider/tool effects and reports unknown states; it does not assume database restore equals business recovery.

## Deployment safety

- reproducible artifact;
- source, lockfile/dependency and build provenance;
- SBOM and secret scan;
- expand/contract migration;
- compatibility window for active Missions;
- canary with real lifecycle;
- stop-admission/drain;
- application/config rollback;
- schema forward-fix plan;
- exact evidence tied to candidate.

## Incident ownership

Every alert/runbook names service owner, first responder, escalation, provider/customer communication, decision authority, evidence location and follow-up. An unowned SLO is not an SLO.

## Production claim

BMR-002 may close at `LIMITED_PRODUCTION` inside a recorded envelope. It must not imply arbitrary tenant count, global residency, active/active multi-region, every-provider support or 24×7 enterprise support without direct evidence.
