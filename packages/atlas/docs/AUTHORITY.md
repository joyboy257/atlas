# Atlas authority boundary

Atlas is the Business Messaging Agent Runtime.

The local package demonstrates the same authority split intended for hosted business messaging channels:

```text
customer message
→ normalized conversation and customer identity
→ approved knowledge evidence
→ governed tool proposal
→ policy decision
→ approval or human handoff
→ exactly-once committed business action
→ provider outbox and delivery state
→ trace and receipts
```

## Atlas owns

Atlas is authoritative for:

- local or hosted tenant identity;
- customer and conversation context;
- normalized inbound and outbound messaging contracts;
- approved knowledge and tool scope;
- risk and policy classification;
- approval requests and operator decisions;
- human handoff and takeover state;
- idempotency and exactly-once committed business actions;
- outbox, retry, callback, and delivery state;
- traces, receipts, audit, outcome, usage, and cost evidence.

A high-risk tool proposal is not a business outcome. A browser message saying “approved” is not approval. A model response saying “booking changed” is not a committed action. Atlas records the real state transition and binds it to receipts.

## External runtimes may

An external agent runtime may:

- reason over user intent;
- retrieve context that Atlas authorizes;
- propose a normalized tool call;
- explain a proposed action;
- request approval or human handoff;
- observe Atlas traces and receipts within its scope.

This includes Eve, OpenAI Agents SDK, LangGraph, n8n, or a custom runtime.

## External runtimes must not

An external runtime must not:

- supply or override tenant authority;
- invent customer or conversation ownership;
- bypass policy or approval;
- commit a business mutation directly;
- reuse an idempotency key with different input;
- send a provider message outside the Atlas outbox;
- forge a delivery callback, trace, receipt, cost, or business outcome;
- claim staging, production, or live-provider proof from the local simulator.

## Local fixture honesty

The default project uses:

- `atlas.local-fixture/v1` for deterministic intent and proposal generation;
- `atlas-simulator` for normalized provider delivery;
- a local identity derived from the governed project hash.

These fixtures remove account, provider, cloud, and paid-model requirements. They do not bypass governance. Policy, approval, action idempotency, outbox, delivery, trace, replay, and receipt transitions remain real local Atlas state.

## Public and private boundary

The intended public package may contain the project schema, CLI, SDK contracts, local runtime, simulator, channel conformance surfaces, documentation, examples, and skills.

It must not contain Atlas Cloud internals, managed provider credentials, hosted tenant operations, private billing systems, Team Inbox, Command Center, Mirai vertical-product implementation, or private monorepo source not required by the public contract.

Package publication, repository publication, live provider activation, hosted deployment, and commercial release require separate founder approval.
