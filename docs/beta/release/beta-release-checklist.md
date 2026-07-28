# Atlas Beta Release Checklist

**Version:** 0.2.0-beta.0 (target)  
**Gate:** ATLAS-P4-006 + ATLAS-P4-008  
**Blocker:** ATLAS-P3-010b (hosted cross-runtime flagship proof)

## Pre-Beta Gates

Each item must have verifiable evidence before the beta release can proceed.

### 1. Hosted Infrastructure

- [ ] **P3-010b complete** — One agent package completes the same governed outcome across runtimes with real provider connections in a hosted environment
- [ ] **Sandbox deploy** — Docker Compose sandbox deploys and runs on mirai-vps or equivalent
- [ ] **Health checks** — All services respond to `/health` within 5s of startup
- [ ] **Database migrations** — All migrations apply cleanly, rollback works
- [ ] **TLS termination** — Caddy reverse proxy with valid cert
- [ ] **Resource limits** — CPU/memory limits configured and monitored

### 2. Provider Connections

- [ ] **Email provider** — Resend or SendGrid, full send → delivery → receipt chain
- [ ] **One additional channel** — SMS, WhatsApp, or Web Chat with real provider
- [ ] **Provider error handling** — Rate limits, auth expiry, webhook failures handled gracefully
- [ ] **Provider health dashboard** — Each provider's status visible in deploy status

### 3. Cross-Runtime Execution

- [ ] **Atlas-native runtime** — Reference implementation certified
- [ ] **OpenAI Agents SDK** — Reason/propose works, Atlas authorizes and commits
- [ ] **Eve adapter** — Business messaging context, policy, tools, delivery certified
- [ ] **Webhook runtime** — Custom runtime integrates without SDK lock-in
- [ ] **Runtime failure isolation** — One runtime crashing does not affect others

### 4. Security

- [ ] **Tenant isolation** — Row-level security verified with cross-tenant negative tests
- [ ] **Credential scanning** — Git history and environment files scanned, clean
- [ ] **Dependency audit** — `npm audit` passes with no HIGH/CRITICAL
- [ ] **Rate limiting** — API endpoints have per-tenant rate limits
- [ ] **Input validation** — All user-supplied data validated at the boundary
- [ ] **Secrets never logged** — Receipts, traces, logs redact credentials
- [ ] **Security review** — Full security review completed (see security-review-template.md)

### 5. Reliability

- [ ] **Outbox delivery** — At-least-once delivery with idempotency keys verified
- [ ] **Queue retry** — Failed jobs retry with exponential backoff, dead letter queue
- [ ] **Database backups** — Automated backups configured and tested
- [ ] **Graceful shutdown** — SIGTERM drains in-flight requests
- [ ] **Crash recovery** — Services restart cleanly after unexpected termination
- [ ] **Data durability** — No message loss on service restart

### 6. Observability

- [ ] **Traces** — Every governed outcome produces a complete trace
- [ ] **Receipts** — Every committed action has a verifiable receipt
- [ ] **Metrics** — Request rate, latency, error rate, queue depth visible
- [ ] **Alerts** — PagerDuty/webhook alerts for: error rate spike, queue depth > 100, provider down
- [ ] **Logs** — Structured JSON logs, redacted, searchable
- [ ] **Cost tracking** — Per-tenant, per-model, per-channel usage tracked

### 7. Developer Experience

- [ ] **One-command sandbox** — `docker compose up` works from scratch
- [ ] **CLI deploy flow** — `atlas deploy plan → apply → status` works
- [ ] **Provider onboarding** — Adding a provider takes < 5 minutes documented
- [ ] **Error messages** — Actionable errors, not stack traces, for common failures
- [ ] **Docs completeness** — Every documented command and flow works as written
- [ ] **Template verification** — All 3 templates init, dev, and test pass

### 8. Beta Operations

- [ ] **Beta agreement** — ToS / beta agreement published (see beta-agreement.md)
- [ ] **Incident response** — Runbook published and tested (see incident-response.md)
- [ ] **Rollback procedure** — Documented and tested (see rollback-procedures.md)
- [ ] **Support channel** — Where beta users report issues
- [ ] **Usage limits** — Per-tenant quotas configured and enforced
- [ ] **Kill switch** — Emergency stop for any deployed agent

### 9. Billing & Plans (if applicable)

- [ ] **Plan definitions** — Free tier + paid tiers defined
- [ ] **Usage tracking** — Messages, turns, tools, tokens tracked per tenant
- [ ] **Billing integration** — Stripe or equivalent wired (see billing-integration-plan.md)
- [ ] **Quota enforcement** — Hard and soft limits enforced
- [ ] **Cost attribution** — BYOK vs managed costs separated

### 10. Human Adoption Gates (P4-008 specific)

- [ ] **Developer onboarding flow** — New developer goes from clone → governed outcome in < 30 min
- [ ] **Documentation walkthrough** — External developer follows docs without assistance
- [ ] **Error recovery** — Common failure modes have documented recovery paths
- [ ] **Feedback loop** — Beta users can report issues and get responses
- [ ] **Adoption metrics** — Signups, active agents, governed outcomes tracked

## Release Decision

**Gate:** All unchecked items above must have evidence.  
**Decision maker:** D8 / founder sign-off.  
**Evidence format:** Checklist items link to test results, screenshots, logs, or certification documents.

---

## Current Blocker Status

| Blocker | Status | Resolution |
|---------|--------|------------|
| ATLAS-P3-010b | DEFERRED_BY_DECISION | Hosted flagship proof needed |
| Provider connections | NOT_STARTED | Depends on P3-010b |
| Cross-runtime execution | NOT_STARTED | Depends on P3-010b |
| Security review | NOT_STARTED | Template prepared |
| Billing integration | NOT_STARTED | Plan prepared |
| Human adoption | NOT_STARTED | Depends on beta launch |
