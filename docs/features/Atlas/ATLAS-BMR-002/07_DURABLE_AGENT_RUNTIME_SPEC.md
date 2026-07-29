# Durable Agent Runtime Specification

**Programme:** `ATLAS-BMR-002`  
**Package version:** `3.0.0-execution`  
**Date:** `2026-07-29`  
**Status:** `EXECUTION AUTHORITY`


## Runtime objective

Execute many persistent Missions safely across asynchronous events and failures while ensuring that reasoning is replaceable and Atlas authority is not.

## Coordinator model

A coordinator advances one Mission through one validated transition at a time.

Each advancement:

1. loads the canonical state/version;
2. acquires or confirms a time-bounded lease;
3. consumes one or more deduplicated Observations;
4. assembles scoped context;
5. invokes a reasoning adapter when needed;
6. validates Proposal shape and capability;
7. evaluates policy, risk and budget;
8. records a Decision and next durable state;
9. commits an Action/outbox or wait atomically where applicable;
10. emits durable events and telemetry references;
11. releases/renews the lease.

Optimistic concurrency or equivalent must reject stale transitions.

## Event and wait model

Supported wake-up sources include:

- inbound channel event;
- provider delivery/status callback;
- tool/business-system callback;
- approval/handoff/operator command;
- scheduled time;
- deadline/timeout;
- child Mission outcome;
- deployment/configuration event where safe.

A wait stores event criteria, deadline, deduplication/reconciliation policy and cancellation behavior. Polling is permitted only through a bounded durable schedule.

## Failure semantics

| Failure | Required state |
| --- | --- |
| Reasoning timeout/malformed response | Retry within budget, fallback, handoff or explicit failure. |
| Policy unavailable | Fail closed; no effect. |
| Database commit unknown | Reconcile before retry. |
| Outbox worker crash | Lease expires; retry idempotently. |
| Provider accepted but callback missing | Pending/unknown plus reconciliation. |
| Provider rejected | Delivery/action failure with policy-defined next step. |
| Human approval expires | Deny, handoff, fail or re-propose by policy. |
| Budget exhausted | Pause/handoff/fail; never silently overspend. |
| Deployment during wait | Resume against compatible contract/version. |
| Cancel during effect | Record committed/in-flight reality; compensate only explicitly. |

## Exactly-once claim discipline

Atlas may promise exactly-once **logical committed Action identity** when database constraints and idempotency support it. It must not claim physical exactly-once provider delivery where the provider does not support it.

The system instead proves:

- one canonical Action;
- one idempotency identity;
- durable outbox attempts;
- provider idempotency where available;
- deduplicated callbacks;
- reconciliation;
- truthful unknown/duplicate states.

## Budgets

Budget dimensions may include:

- wall-clock deadline;
- active execution time;
- coordinator steps;
- runtime/model calls;
- input/output tokens;
- tool invocations;
- provider sends/media;
- monetary estimate/settled spend;
- child Missions;
- retries;
- human approval age.

Reservation happens before costly/irreversible work where feasible. Commit/release is transactionally reconciled.

## Safety and policy

Policy input includes server-derived identity, Agent version, Mission type/state, proposed action, data class, provider/account, channel rules, customer consent, business hours/window, budget, risk, previous outcomes and human-control state.

Policy output is typed and versioned. Free-form model text is never the enforcement decision.

## Human control

Takeover establishes an exclusive human-control state for affected action classes. Agent reasoning may continue in observe-only mode only if policy allows. Returning control creates a new event and explicit context snapshot.

## Memory and context security

Context retrieval must enforce tenant/environment, purpose, data class, retention, Agent/tool scope and prompt-injection boundaries. Tool/provider output is untrusted input until validated.

## Runtime interoperability

All reasoning adapters implement:

```text
prepare_context
invoke
parse_proposal
report_usage
cancel_or_timeout
```

They never implement:

```text
select_tenant
approve
commit_action
send_provider_message
write_receipt
settle_usage
```

## Evaluation hooks

The runtime emits deterministic test seams for:

- injected observations;
- virtual clock;
- deterministic reasoning;
- fault points before/after each transaction;
- duplicate/reordered events;
- provider/tool simulators;
- policy variants;
- restart/worker-kill;
- evidence capture.

These seams must not be reachable as unsafe production fallbacks.

## Completion conditions

A Mission reaches `COMPLETED` only when its defined outcome evidence is satisfied or a permitted human authority confirms it. Sending the final message is not sufficient unless the Mission’s explicit outcome is delivery itself.
