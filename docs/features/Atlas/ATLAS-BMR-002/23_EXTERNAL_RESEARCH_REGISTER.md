# External Primary-Source Research Register

**Programme:** `ATLAS-BMR-002`  
**Package version:** `3.0.0-execution`  
**Date:** `2026-07-29`  
**Status:** `EXECUTION AUTHORITY`


## Rule

Repository reality has priority. External sources define provider/platform/standard constraints and must be rechecked when implementing because APIs, prices, limits and product availability can change.

Access date for this package: **2026-07-29**.

| ID | Publisher | Source | Accessed | URL | Planning use |
| --- | --- | --- | --- | --- | --- |
| SRC-CC-SUBAGENTS | Anthropic Claude Code | Create custom subagents | 2026-07-29 | https://code.claude.com/docs/en/sub-agents | Worker isolation, custom prompts, tool restrictions, and evidence-return semantics. |
| SRC-CC-AGENTS | Anthropic Claude Code | Run agents in parallel | 2026-07-29 | https://code.claude.com/docs/en/agents | Choosing subagents versus worktree-isolated sessions; main-agent coordination. |
| SRC-CC-WORKFLOWS | Anthropic Claude Code | Orchestrate subagents at scale with dynamic workflows | 2026-07-29 | https://code.claude.com/docs/en/workflows | Optional repeatable verification workflows; never a substitute for repository state. |
| SRC-CC-SKILLS | Anthropic Claude Code | Extend Claude with skills | 2026-07-29 | https://code.claude.com/docs/en/skills | Repository-resident programme skill and context recovery. |
| SRC-CC-HOOKS | Anthropic Claude Code | Hooks guide | 2026-07-29 | https://code.claude.com/docs/en/hooks-guide | Optional auditable worker/session event logging. |
| SRC-OTEL-TRACES | OpenTelemetry | Traces | 2026-07-29 | https://opentelemetry.io/docs/concepts/signals/traces/ | Causal mission/action/provider tracing. |
| SRC-OTEL-CONTEXT | OpenTelemetry | Context propagation | 2026-07-29 | https://opentelemetry.io/docs/concepts/context-propagation/ | Cross-service trace correlation without treating telemetry as business authority. |
| SRC-SRE-SLO | Google SRE | Implementing SLOs | 2026-07-29 | https://sre.google/workbook/implementing-slos/ | User-centered reliability objectives and computable indicators. |
| SRC-SRE-EB | Google SRE | Error Budget Policy | 2026-07-29 | https://sre.google/workbook/error-budget-policy/ | Release and reliability action policy. |
| SRC-RESEND-WEBHOOKS | Resend | Webhooks | 2026-07-29 | https://resend.com/docs/webhooks/introduction | Email event authenticity and provider lifecycle. |
| SRC-RESEND-RETRY | Resend | Webhook retries and replays | 2026-07-29 | https://resend.com/docs/webhooks/retries-and-replays | Delivery reconciliation and replay tests. |
| SRC-RESEND-LIMITS | Resend | Account quotas and limits | 2026-07-29 | https://resend.com/docs/knowledge-base/account-quotas-and-limits | Provider capacity and spending boundaries. |
| SRC-TWILIO-SIGNATURE | Twilio | Twilio request validation | 2026-07-29 | https://www.twilio.com/docs/usage/security | Webhook authenticity. |
| SRC-TWILIO-STATUS | Twilio | Outbound message status callbacks | 2026-07-29 | https://www.twilio.com/docs/messaging/guides/outbound-message-status-in-status-callbacks | Provider delivery state and reconciliation. |
| SRC-TWILIO-A2P | Twilio | A2P 10DLC | 2026-07-29 | https://www.twilio.com/docs/messaging/compliance/a2p-10dlc | Eligibility and regional/compliance constraints for US SMS. |
| SRC-OIDC | OpenID Foundation | OpenID Connect Core 1.0 | 2026-07-29 | https://openid.net/specs/openid-connect-core-1_0.html | Enterprise identity federation. |
| SRC-SCIM | IETF | SCIM Protocol RFC 7644 | 2026-07-29 | https://www.rfc-editor.org/rfc/rfc7644 | Provisioning assessment; not automatic scope. |
| SRC-NIST-SSDF | NIST | Secure Software Development Framework SP 800-218 | 2026-07-29 | https://csrc.nist.gov/pubs/sp/800/218/final | Secure development and release evidence controls. |
| SRC-STRIPE-METER | Stripe | Usage-based billing | 2026-07-29 | https://docs.stripe.com/billing/usage-based | Commercial settlement adapter; Atlas remains canonical usage authority. |

## Research update record

When a work item relies on external facts, append:

```yaml
source_id:
accessed:
work_item:
fact_used:
account_or_region_scope:
repository_decision_affected:
archive_or_evidence_path:
```

Do not copy provider marketing claims into Atlas readiness. Verify exact account/environment behavior.
