# Agent, Mission, Action, Outcome and Learning Contract

**Programme:** `ATLAS-BMR-002`  
**Package version:** `3.0.0-execution`  
**Date:** `2026-07-29`  
**Status:** `EXECUTION AUTHORITY`


## Contract family

All contracts are versioned, schema-published, generated into supported SDKs and usable by Atlas-native, external runtimes and Mirai without private table knowledge.

## AgentPackage

Minimum fields:

```yaml
apiVersion: atlas.mirai.dev/v2
kind: AgentPackage
metadata:
  name: front-desk
  version: 2.0.0
spec:
  missionTypes: [...]
  instructions: ...
  knowledgeBindings: [...]
  memoryPolicy: ...
  tools: [...]
  actionPolicies: [...]
  triggers: [...]
  channelRequirements: [...]
  runtime: ...
  budgets: ...
  outcomeDefinitions: [...]
  evals: [...]
  compatibility: ...
```

The source digest and deployment configuration produce immutable `agent_version_id`.

## Mission

Required identity and boundaries:

- `mission_id`;
- `tenant_id`, `project_id`, `environment_id`—server-derived;
- `agent_id`, `agent_version_id`;
- `mission_type`;
- parent/child Mission causation when delegated;
- customer, conversation and subject references;
- bounded goal and success/failure outcome definitions;
- allowed tools/actions/channels;
- autonomy/risk/budget policy references;
- deadline and stop conditions;
- current state, state version and active wait;
- correlation/trace identifiers;
- created/updated/terminal timestamps.

### Canonical states

```text
CREATED
READY
ACTIVE
WAITING_EVENT
WAITING_SCHEDULE
WAITING_APPROVAL
HANDED_OFF
PAUSED
COMPLETING
COMPLETED
FAILED
CANCELLED
EXPIRED
```

State transitions are validated server-side and append lifecycle events.

## Observation and context

An Observation references a source event, provider callback, tool result, human command, schedule or system condition. It records authenticity, deduplication identity, provenance, content classification and correlation.

Context assembly returns bounded references, not unrestricted database access. It records which knowledge/memory versions were used for the reasoning step.

## Proposal

A Proposal contains:

- runtime and model/adapter identity;
- input context references and hashes;
- proposed message, action, wait, handoff, child Mission or completion;
- structured arguments;
- confidence/uncertainty where supplied;
- cited knowledge/provenance;
- expected outcome and risk hints;
- token/usage metadata;
- no approval, commit or provider receipt authority.

Malformed or policy-incompatible proposals are rejected as typed events.

## Decision

Atlas records:

- policy version;
- action/risk class;
- autonomy level;
- budget reservation;
- allow, deny, require approval, require handoff, modify, defer or fail;
- explanation and machine-readable reason codes;
- required actor/scope/expiry;
- evidence references.

## Action and outbox

Action identity binds tenant, environment, Mission, step, action type, normalized arguments and idempotency key. The action and outbox entry commit transactionally. Conflicting reuse of an idempotency key is rejected.

Workers claim outbox entries through leases, execute only authorised typed effects, redact credentials, and reconcile provider/tool results.

## Receipts

Separate receipt types:

| Receipt | Proves |
| --- | --- |
| Commit receipt | Atlas durably committed an Action. |
| Tool receipt | A tool invocation returned a recorded result/state. |
| Provider receipt | Provider accepted/rejected/updated an effect. |
| Delivery receipt | Provider-reported delivery state; not necessarily human consumption. |
| Usage receipt | Attributable model/runtime/tool/provider/storage work. |
| Cost receipt | Estimated or settled cost with source and currency. |
| Audit receipt | Actor, policy, transition and evidence chain. |
| Outcome receipt | Business success/failure/unknown based on defined evidence. |

Receipts are immutable or append-only revisions with supersession links. An unknown provider/business state remains `UNKNOWN_PENDING_RECONCILIATION`.

## Outcome

An outcome definition names:

- business metric or committed state;
- evidence source;
- attribution rule;
- success, failure and unknown conditions;
- evaluation window;
- human confirmation requirement where applicable.

A delivered message is not automatically a booked appointment, resolved case, collected payment or satisfied customer.

## Memory

Memory classes:

```text
EPHEMERAL_STEP
MISSION_SCOPED
CUSTOMER_SCOPED
BUSINESS_SCOPED
POLICY_OR_CONFIGURATION
```

Each entry has source, extractor/runtime, confidence, scope, retention, encryption class, review status, supersession and deletion lineage.

## LearningProposal

A LearningProposal describes candidate knowledge, memory, tool, instruction or policy change and includes:

- originating Missions/outcomes;
- supporting and contradicting evidence;
- affected scope;
- safety/privacy classification;
- proposed change;
- evaluation;
- reviewer;
- status: PROPOSED, ACCEPTED, REJECTED, EXPIRED, REVERTED.

Runtime execution cannot accept its own LearningProposal unless an explicit safe automated-review policy exists and is independently certified. BMR-002 defaults to human or separate governed review.

## Sub-Mission delegation

A proposed child Mission is accepted only after Atlas:

1. resolves the specialist Agent/version;
2. derives the same tenant/environment;
3. verifies capability and data scopes;
4. allocates child budget from the parent or separate authorised budget;
5. records parent/child causation;
6. applies normal policy, approval, action and receipt rules;
7. defines how the child outcome joins the parent.

No Agent can spawn unbounded recursive work.
