# Developer Platform and Runtime Interoperability Specification

**Programme:** `ATLAS-BMR-002`  
**Package version:** `3.0.0-execution`  
**Date:** `2026-07-29`  
**Status:** `EXECUTION AUTHORITY`


## Developer promise

A developer or coding agent can:

```text
create or open a project
→ define/version an Agent and Mission type
→ run a persistent governed Mission locally without credentials
→ inspect every decision/action/receipt
→ integrate an existing reasoning runtime through Proposal contracts
→ test failure, approval, replay and recovery
→ deploy to Atlas Cloud
→ connect an eligible provider
→ observe usage, cost, delivery and outcomes
```

## Project structure

A generated project should make ownership visible:

```text
atlas.config.*
agents/
  <agent>/
    agent.*
    missions/
    policies/
    tools/
    knowledge/
    evals/
tests/
atlas/
  fixtures/
  provider-simulators/
```

The exact repository conventions may differ after P0; the conceptual separation does not.

## CLI capability families

```text
atlas init
atlas validate
atlas dev
atlas mission create|signal|inspect|pause|resume|cancel|replay
atlas approval list|approve|deny
atlas agent build|inspect|deploy
atlas provider connect|inspect|test
atlas evidence collect|verify
atlas readiness
atlas usage inspect
atlas deploy plan|apply|status|rollback
```

Commands must use shared schemas, typed errors, idempotency/correlation and machine-readable output. Do not create commands that bypass Cloud authority.

## SDK/API

Public SDK and OpenAPI expose:

- Agent package validation/deployment;
- Mission creation, signals and controls;
- observations, proposals and reasoning-adapter protocol;
- approvals/handoffs;
- Action/receipt/outcome reads;
- provider connection/readiness representations;
- usage/cost reads;
- extension manifests/conformance.

Private operational endpoints remain private.

## Local runtime

The local runtime implements portable lifecycle semantics with:

- local durable storage;
- deterministic runtime/model adapter;
- messaging/provider simulator;
- tool/business-system simulator;
- local policy and approval control;
- virtual clock and fault injection;
- inspectable evidence.

It requires no Atlas account, live provider, cloud deployment or paid model key.

## External runtime integration

An external agent receives a scoped context/proposal request and returns a typed Proposal. Authentication, replay defense, timeout, cancellation, signature or channel security, version negotiation and capability checks are part of conformance.

The external runtime cannot:

- pass arbitrary tenant/project/environment identity;
- receive raw provider credentials;
- directly write Mission, Action or receipt state;
- claim approval or completion;
- send through Atlas providers outside the outbox path.

## Versioning

- Contracts use semantic/versioned compatibility rules.
- Agent versions are immutable.
- Mission execution records the exact Agent and contract versions.
- A deployment may support a declared compatibility window.
- Breaking changes ship migration tooling and deprecation dates.
- Generated clients and docs are release-matched.

## Agent-readable documentation

Every public release includes:

- concise human quickstart;
- coding-agent instructions/skill;
- schemas/OpenAPI/types;
- runnable greenfield and existing-agent examples;
- failure/recovery examples;
- capability/readiness machine output;
- conformance commands;
- public/private boundary statement;
- limitations and provider states.

## Adoption evidence

P3 cannot pass using only maintainers or the live monorepo. Run fresh-directory journeys with no shell history, hidden environment values, undocumented package links or private service knowledge. Record time to first governed outcome, errors, interventions and exact artifacts.
