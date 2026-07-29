# Flagship Outside-In Journeys

**Programme:** `ATLAS-BMR-002`  
**Package version:** `3.0.0-execution`  
**Date:** `2026-07-29`  
**Status:** `EXECUTION AUTHORITY`


## Purpose

The programme is certified through complete customer/developer journeys. Component tests are necessary but cannot replace them.

## Journey A — Zero-credential persistent front-desk Mission

From an empty directory:

```text
create Agent project
→ run local persistent runtime
→ inject inbound customer request
→ resolve simulated identity/conversation
→ create Mission: qualify and book request
→ retrieve approved knowledge
→ propose appointment lookup
→ policy allows read
→ propose booking action
→ approval required
→ human approves locally
→ action commits
→ simulated provider reply delivers
→ Mission waits for customer confirmation
→ restart runtime
→ inject confirmation
→ Mission completes
→ inspect commit, delivery, usage, audit and outcome receipts
```

Required fault variants:

- restart before/after each commit boundary;
- duplicate inbound event;
- stale approval;
- cancellation while waiting;
- tool timeout;
- idempotency replay.

No live credentials, account, cloud or paid model.

## Journey B — Existing external agent integration

Start with a small external reasoning runtime. Add Atlas using public SDK/protocol:

- Atlas derives tenant/environment;
- external runtime receives scoped context;
- returns typed Proposal;
- cannot call provider or durable state directly;
- Atlas policy requires one approval;
- Atlas commits effect and receipts;
- runtime timeout/replay/forgery tests pass;
- same Mission is inspectable through CLI/API.

No private monorepo imports or undocumented service access.

## Journey C — Proactive bounded follow-up Mission

A business signal or schedule creates a Mission to follow up on an incomplete request.

The Mission:

- initiates under L4 bounded autonomy;
- has deadline, contact count, channel and spend limits;
- retrieves consent and approved context;
- sends through simulated/provider lane;
- waits for response;
- handles callback/duplicate/restart;
- hands off when uncertainty or customer request requires it;
- completes only on defined outcome or expires truthfully;
- proposes learning, which remains unaccepted until review.

## Journey D — Provider sandbox/live email

On an authorised Resend account:

- connection and credential version recorded;
- outbound Action/outbox send;
- real provider acceptance;
- signed webhook processing;
- retry/replay and delivery mapping;
- inbound email where in scope;
- quota/spend observation;
- provider outage simulation;
- Mission outcome separately evaluated.

Evidence redacts customer content, tokens and secrets.

## Journey E — Second provider

Repeat the provider lifecycle for the selected provider. Sandbox evidence cannot become limited-production evidence. Record account, region, capability and limitations.

## Journey F — Production-shaped staging

Deploy exact candidate with durable database/queue/workers/secrets/observability. Run:

- Journey A equivalent through hosted APIs;
- an external runtime Proposal;
- human control through contract/Mirai if available;
- load burst;
- provider/inference fault;
- worker kill;
- migration/canary/rollback;
- backup/restore/reconciliation;
- usage/cost and quota enforcement.

## Journey G — Self-serve commercial beta

A fresh user:

- signs up;
- creates organisation/project/environment;
- uses starter sandbox;
- deploys an Agent;
- sees readiness and usage;
- connects test/sandbox provider;
- sets spend limit;
- completes governed outcome;
- upgrades in billing test mode;
- sees reconciled invoice/usage;
- tests failed payment/cancellation/export/deletion.

## Journey H — Independent extension

A fresh coding agent/developer builds a tool or runtime/provider-style extension against public docs, passes conformance/security and runs Journey A or B without private help.


## Journey J — Complete production agentic product on staging

Run only after every required product plane is integrated into the exact G7 candidate and that candidate is deployed to staging:

```text
fresh signup
→ organisation / project / environment
→ starter sandbox and Agent project
→ versioned Agent deploy
→ provider connection and readiness
→ inbound customer event and canonical identity
→ durable Mission
→ approved knowledge and scoped context
→ Atlas-native or external-runtime Proposal
→ policy / risk / budget decision
→ human approval or handoff through public control contract
→ transactional Action and durable outbox
→ provider/tool effect and authentic callback
→ delivery and business-state reconciliation
→ outcome, usage, cost and audit receipts
→ quota / spend enforcement
→ billing test settlement and lifecycle communication
→ audit export and data-lifecycle action
→ injected worker/provider/database failure
→ recovery, replay safety and rollback
```

Repeat the critical path with one independent developer and one independently built extension. The journey fails if any product plane is bypassed, mocked where live/test-environment proof is required, or replaced by disconnected demos.

## Journey I — Authorised limited-production cohort

Only after G0–G8 and explicit authority:

- exact customer/provider/region/data/spend/support envelope;
- canary and stop-admission rules;
- sustained evidence window;
- operator handoff;
- incidents and provider callbacks;
- cost/usage/outcome reconciliation;
- rollback rehearsal/current readiness.

A live send alone is not this journey.

## Evidence bundle shape

Every journey captures:

```text
journey version
source commit
artifact digest
environment/provider/account scope
configuration/migration version
commands and inputs
redacted outputs
trace/correlation IDs
durable receipt IDs
tests/faults
timestamps
operator/reviewer
limitations
verdict
```
