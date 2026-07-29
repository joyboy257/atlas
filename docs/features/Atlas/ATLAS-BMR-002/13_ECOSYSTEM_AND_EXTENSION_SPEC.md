# Developer and Solution Ecosystem Specification

**Programme:** `ATLAS-BMR-002`  
**Package version:** `3.0.0-execution`  
**Date:** `2026-07-29`  
**Status:** `EXECUTION AUTHORITY`


## Objective

Allow developers and partners to extend Atlas safely without transferring Atlas authority or prematurely building a marketplace.

## Extension families

- reasoning runtime adapters;
- model routing/provider adapters;
- business tools/actions;
- channel/provider adapters;
- knowledge/data-source adapters;
- Agent templates;
- Mission templates;
- solution packs;
- eval packs;
- observability exporters;
- customer/private registry packages.

## Extension manifest

Each extension declares:

- identity, version, publisher and source;
- compatible Atlas contract versions;
- extension type and entry points;
- permissions and data classes;
- network/filesystem/credential needs;
- tools/actions/provider capabilities;
- configuration/schema;
- test/eval commands;
- security and dependency metadata;
- support/deprecation policy;
- licence and distribution terms.

## Authority limits

Extensions cannot:

- select arbitrary tenant/environment;
- receive broad raw Atlas/provider credentials;
- approve their own proposals;
- commit actions or write receipts outside public interfaces;
- bypass quota/policy;
- read unrelated memory/knowledge;
- claim provider/readiness state without evidence;
- mutate Atlas Cloud control-plane authority.

## Certification

Conformance covers:

- contract/version behavior;
- authentication and scope;
- idempotency/replay;
- failure/timeout/cancellation;
- data and secret handling;
- telemetry/redaction;
- policy/human-control behavior;
- resource/spend limits;
- malicious/malformed input;
- migration/deprecation.

Certification is version- and evidence-specific. It is not permanent endorsement.

## Distribution decision ladder

```text
local path/package
→ example repository
→ signed/verified package metadata
→ public catalogue
→ partner/private registry
→ marketplace only after demand, governance, support and economics evidence
```

BMR-002 requires contracts, certification, one independent extension and a catalogue/registry decision. It does not require transaction/payment marketplace implementation.

## Community governance

Define contribution guide, code of conduct/reference, maintainer ownership, review SLAs only when supportable, release/version policy, security disclosure, dependency updates, deprecation and compatibility window.

## Commercial solution packs

A commercial pack may package Agent/Mission templates, tools, provider setup, evals, operator workflows and support. Atlas runtime and security authority remains unchanged.

## Private enterprise registries

Assess when customers need approved internal Agent/extension distribution, version pinning, security review and private dependencies. Do not build until one real enterprise workflow justifies it.
