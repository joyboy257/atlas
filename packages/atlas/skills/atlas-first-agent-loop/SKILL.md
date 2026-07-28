---
name: atlas-first-agent-loop
description: Implement and verify a complete governed customer-message-to-business-outcome lifecycle in Atlas.
version: 1
package: "@atlas-runner/atlas@0.1.0-alpha.0"
---

# Atlas First Agent Loop skill

Use this skill when asked to build or verify a local business messaging agent that answers a customer and completes governed work.

## Required lifecycle

```text
customer message
→ approved knowledge evidence
→ normalized governed tool proposal
→ risk and policy decision
→ operator approval or human handoff
→ exactly-once committed outcome
→ provider outbox and delivery transition
→ complete trace and receipt chain
```

No step may exist only as descriptive model text.

## Start

```bash
atlas doctor --json
atlas test --json
atlas dev --json
```

Open the workbench URL from `atlas dev`. Use the generated booking-change scenario unless the requested business outcome requires a new tool and policy.

## Tool contract

A committed tool requires:

- stable identity;
- normalized input;
- explicit risk;
- policy result;
- approval requirement;
- idempotency requirement;
- deterministic action result;
- business outcome;
- outbox message;
- receipt expectations.

The proposal phase must not mutate business state.

## Approval contract

High-risk mutations remain pending until an operator makes a real decision. A rejection or takeover cancels the pending proposal. Approval replay returns the same action receipt and must not create a second action.

## Delivery contract

Delivery is separate from the committed action. Simulate and test:

- queued;
- transient failure and deterministic backoff;
- accepted/sent;
- delivered/read callback;
- permanent rejection;
- stale callback regression.

Retrying delivery must not repeat the business mutation.

## Messaging contract

Test:

- valid inbound sequence;
- identical duplicate replay;
- idempotency mismatch;
- out-of-order hold and drain;
- consent failure;
- closed messaging window;
- human takeover.

Use `atlas replay --json` or a simulator scenario. Do not bypass normalized contracts with direct state edits.

## Evidence gate

The final trace must include evidence, proposal, policy, approval/handoff, action, outbox, outcome, and delivery events. The receipt registry must include the corresponding source-bound receipts.

Run:

```bash
atlas inspect --json
atlas replay --json
atlas test --json
```

A pass requires exactly one committed action and a replay of the duplicate message under the original receipts.
