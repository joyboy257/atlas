# Current and Target Architecture

**Programme:** `ATLAS-BMR-002`  
**Package version:** `3.0.0-execution`  
**Date:** `2026-07-29`  
**Status:** `EXECUTION AUTHORITY`


## Current architecture rule

P0 must replace assumptions in this section with a source-bound current-state diagram. Until then, this document defines ownership and target interfaces, not implementation truth.

## Target lifecycle

```text
Customer/provider/business/schedule event
             │
             ▼
      Atlas ingress + authenticity
             │
             ▼
 server-derived tenant, project, environment
             │
             ▼
 identity + conversation + Mission correlation
             │
             ▼
 durable Mission event + coordinator lease
             │
             ▼
 scoped knowledge/memory + policy/tool catalogue
             │
             ▼
 Atlas-native or external reasoning adapter
             │
             ▼
 typed Proposal ── no direct effect authority
             │
             ▼
 policy + risk + budget + approval/handoff decision
             │
             ▼
 transactional Action + durable outbox
             │
             ▼
 provider/tool worker with private credential access
             │
             ▼
 callback/reconciliation + durable receipts
             │
             ▼
 Mission continues, waits, completes, fails or escalates
             │
             ▼
 Mirai/operator views + customer/business outcome
```

## Component ownership

| Component | Public Atlas | Private Atlas Cloud | Mirai | Provider/customer |
| --- | --- | --- | --- | --- |
| AgentPackage/Mission schemas | Canonical | Implements/persists | Renders/uses | May generate/use |
| Local coordinator/simulator | Reference implementation | Managed coordinator | No | May run locally |
| Runtime proposal adapters | Public contracts/adapters | Managed execution | No | External runtime |
| Tenant/environment authority | Representation only | Canonical | Consumes | Cannot choose arbitrarily |
| Customer/conversation identity | Portable IDs/contracts | Canonical resolution/persistence | Operator view | Provider/customer identifiers |
| Knowledge/memory interfaces | Portable | Managed stores/enforcement | Curation UX/workflows | Customer data sources |
| Policy/autonomy/approval | Portable policy/control contracts | Canonical enforcement | Operator control UX | Customer policies |
| Action/idempotency/outbox | Portable contracts/conformance | Canonical commit/execution | Displays/control | Tool/provider effect |
| Credentials | No raw production credentials | Canonical secret lifecycle | Connection UX only | Customer/provider owns source account |
| Provider delivery | Adapter contracts/simulator | Managed provider operations | Operator visibility | Provider network |
| Observability | Trace conventions/local inspect | Hosted telemetry + durable receipt links | Operations views | External traces where integrated |
| Usage/cost/billing | Usage contracts/local estimate | Canonical ledger/enforcement/settlement | Customer/operator visibility | Billing/provider invoices |
| Human inbox/command center | Control contracts only | Control APIs | Canonical UX | Human operators |
| Vertical business Agent | Template/pack contract | Runs/deploys | Packages/operates | Partner/customer pack |
| Extension registry | Manifest/conformance | Managed catalogue/security policy | Discovery/use | Community/partner extension |

## Core durable authorities

Private Atlas Cloud must have exactly one writable authority for:

- organisation, project, environment and machine identity;
- customer and conversation identity;
- Agent deployment/version;
- Mission state and lifecycle events;
- policy/decision and approval/handoff;
- Action and idempotency;
- outbox, provider/tool execution and reconciliation;
- commit/delivery/usage/cost/audit/outcome receipts;
- usage/cost and quota enforcement;
- credential metadata and provider connection;
- release/deployment state.

Caches, indexes, telemetry and Mirai projections are derived. They cannot become competing authorities.

## Public/private test

A concept belongs in the public contract when external developers, runtimes, Mirai or partners must exchange or reason about it portably.

An implementation belongs in private Cloud when it contains managed persistence, customer secrets, operational topology, abuse controls, billing enforcement, provider account operations or proprietary control-plane logic.

Mirai may depend on public Agent/Mission/control/receipt representations. It may not require direct access to private Cloud tables or undocumented internal state.

## Failure domains

At minimum separate:

- ingress/authenticity;
- Mission coordination;
- inference/runtime adapters;
- action commit;
- provider/tool execution;
- callback/reconciliation;
- usage/cost processing;
- operator/control plane;
- observability.

A failure in one domain must not silently corrupt another or fabricate completion.

## Target deployment posture

BMR-002 defaults to one production-shaped primary region:

- managed durable database with tested backup/restore;
- durable queue or equivalent work transport;
- partitioned coordinator/action/provider worker pools;
- private credential/KMS/secret service;
- artifact provenance and staged promotion;
- hosted telemetry with redaction;
- externally reachable authenticated ingress;
- support, status and incident runbooks;
- recovery path into an isolated target.

Multi-region active/active is out of scope unless P0/P4 evidence proves it is the smallest correct response to customer or regulatory demand.
