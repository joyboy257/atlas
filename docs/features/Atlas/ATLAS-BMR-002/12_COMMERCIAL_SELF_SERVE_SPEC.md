# Commercial Self-Serve Atlas Cloud Specification

**Programme:** `ATLAS-BMR-002`  
**Package version:** `3.0.0-execution`  
**Date:** `2026-07-29`  
**Status:** `EXECUTION AUTHORITY`


## Objective

Make Atlas Cloud operable as a bounded commercial developer platform while keeping the canonical Agent/Mission lifecycle, usage truth and customer value visible.

## Lifecycle

```text
signup
→ organisation
→ project/environment
→ zero-cost starter sandbox
→ Agent/Mission local or hosted deployment
→ provider/model/tool connection
→ governed outcome
→ usage/cost visibility
→ quota/spend control
→ plan/trial/upgrade
→ invoice/payment lifecycle
→ cancellation/export/deletion
→ support or enterprise handoff
```

## Self-serve versus sales-assisted

Self-serve supports low-risk sandbox and bounded activation. Sales/security-assisted paths handle enterprise identity, data/residency review, negotiated limits, higher-risk providers/actions, bespoke support and contracts.

Provider eligibility may require assisted onboarding even when Atlas signup is self-serve.

## Candidate value and billing metrics

Evaluate—not preselect:

| Metric | Customer clarity | Attribution | Gaming risk | Cost alignment | Notes |
| --- | --- | --- | --- | --- | --- |
| Active conversations | Familiar | Moderate | Reopen/split behavior | Indirect | Needs canonical definition. |
| Active Missions | Agentic value | Strong | Mission fragmentation | Better | Must distinguish trivial/long waits. |
| Committed Actions | Outcome-adjacent | Strong | Action granularity | Strong | High-risk/value actions vary. |
| Channel/provider accounts | Understandable add-on | Strong | Low | Support-linked | May discourage multi-channel adoption. |
| Managed runtime | Clear platform tier | Strong | Low | Infrastructure-linked | Combine with included usage. |
| Managed inference | Transparent pass-through/markup | Strong | Low | Direct | BYOK/gateway complicates comparability. |
| Provider delivery/media | Direct usage | Strong | Low | Direct | Provider pricing/regional variation. |
| Observability retention | Enterprise add-on | Strong | Low | Storage/query-linked | Avoid surprise. |
| Governance controls | Plan feature | Strong | Low | Support/control-linked | SSO/audit/retention tiers. |

The chosen beta metric set must be understandable, attributable, measurable, difficult to game, value-aligned and economically sustainable.

## Canonical usage and cost

Atlas records raw attributable usage first. Rating and invoicing are versioned downstream functions.

A usage event binds:

- organisation/project/environment;
- Agent/version and Mission;
- action/provider/model/tool;
- quantity/unit;
- event and ingestion time;
- idempotency key;
- estimated or settled cost source;
- currency and rate version;
- correction/supersession.

Stripe or another billing provider is a settlement/invoice system, not the only runtime usage authority.

## Unit economics

Measure:

- inference;
- database/queue/worker compute;
- provider sends/media/numbers/accounts;
- storage and observability;
- support/onboarding;
- security/compliance operations;
- payment fees/fraud;
- free/sandbox usage;
- gross margin by customer/Mission/provider.

Illustrative plan scenarios use pounds sterling only as modelling examples until existing Atlas pricing or evidence establishes otherwise.

## Quotas and spend

Customers can view and configure alerts, soft limits and hard limits. Atlas reserves spend before costly work where feasible and reconciles estimate to actual. Limit races and provider-delayed costs are tested.

## Billing lifecycle

Test:

- trial start/end;
- upgrade/downgrade timing;
- proration policy;
- failed payment and grace;
- retry/dunning communication;
- suspension without state loss;
- reactivation;
- cancellation;
- invoice/usage dispute evidence;
- export/deletion;
- tax/legal ownership decision.

## Fraud and abuse

Protect signup, trials, provider sends, model/tool spend, payment instruments, stolen credentials and high-risk actions. Controls must allow narrow suspension and evidence-preserving review.

## Support and status

Define self-serve docs/community/email support, limited-production escalation, provider incident ownership, enterprise sales/security handoff, status communication and support-hour claims.

## Commercial evidence gate

Commercial beta requires a reconciled Atlas ledger, tested billing-provider settlement, understandable usage display, enforced spend controls, complete lifecycle, support owner, provider/account cost visibility and no unsupported final pricing claim.
