# Billing Integration Plan

**Status:** PLANNING — not yet implemented  
**Target:** Beta (P4-006)  
**Provider:** Stripe (recommended)

## Pricing Model (Draft)

### Free Tier
- 1 agent
- 100 messages/month
- 1 channel
- Local-fixture model only
- Community support

### Pro Tier ($29/month)
- 5 agents
- 1,000 messages/month
- 3 channels
- BYOK model support
- Email support

### Team Tier ($99/month)
- 20 agents
- 10,000 messages/month
- All 16 channels
- Managed inference (capped)
- BYOK + Gateway modes
- Priority support

### Enterprise (custom)
- Unlimited agents
- Custom message volume
- All channels + custom
- Managed inference (uncapped)
- SLA, dedicated support
- SSO, audit logs

## What We Track

| Metric | Unit | Tracked By |
|--------|------|-----------|
| Messages sent | Per channel, per month | Outbox delivery events |
| Turns processed | Per agent, per day | Execution receipts |
| Tool executions | Per tool, per month | Action receipts |
| Inference tokens | Per model, per month | Model routing logs |
| Active agents | Per tenant | Deployment registry |
| Connected channels | Per agent | Channel config |

## Billing Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ Atlas Usage │────▶│ Usage Aggreg. │────▶│   Stripe    │
│   Events    │     │   (hourly)   │     │  (monthly)  │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ Quota Check  │
                    │ (per-request)│
                    └──────────────┘
                           │
                    ┌───────┴───────┐
                    │               │
               Within quota    Over quota
                    │               │
                    ▼               ▼
              Allow request    Return 429
                              "Quota exceeded"
```

## Stripe Integration

### Products & Prices (Stripe Dashboard)

```
Product: Atlas Pro
  - Price: $29/month (monthly)
  - Price: $290/year (annual, 2 months free)

Product: Atlas Team
  - Price: $99/month (monthly)
  - Price: $990/year (annual, 2 months free)

Product: Atlas Enterprise
  - Price: Custom (contact sales)
```

### Metered Billing (for overages)

```
Meter: atlas_messages
  - Included: tier limit
  - Overage: $0.01/message

Meter: atlas_managed_inference_tokens
  - Included: 100K tokens/month (Team), 1M tokens/month (Enterprise)
  - Overage: $0.02/1K tokens
```

### Webhook Handlers

```ts
// Stripe webhook events to handle:
// - customer.subscription.created  → Activate tenant plan
// - customer.subscription.updated  → Update quota limits
// - customer.subscription.deleted  → Downgrade to free tier
// - invoice.payment_succeeded       → Record payment, reset usage
// - invoice.payment_failed          → Notify tenant, grace period
// - checkout.session.completed      → Provision new tenant
```

## Implementation Phases

### Phase 1: Usage Tracking (beta prerequisite)
- Instrument outbox events, execution receipts, and model routing
- Store aggregated usage per tenant per day
- Expose via `atlas usage` CLI command
- No billing integration yet — tracking only

### Phase 2: Quota Enforcement (beta prerequisite)
- Per-tenant limits configurable via admin
- Soft limits: warn at 80%, block at 100%
- Hard limits: immediate block for paid features on free tier
- `atlas deploy quota-set` admin command

### Phase 3: Stripe Integration (GA prerequisite)
- Stripe Checkout for subscription signup
- Webhook handlers for lifecycle events
- Invoice generation and payment collection
- Customer portal for plan management

### Phase 4: Advanced (post-GA)
- Usage-based billing with Stripe Metered Billing
- Invoice line items per agent/channel
- Cost allocation tags for enterprise
- AWS Marketplace / GCP Marketplace listings

## Tenant Lifecycle

```
Signup → Free Trial (14 days) → Plan Selection
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
                  Free            Pro            Enterprise
                    │               │               │
                    ▼               ▼               ▼
              Limited quota   Full quota      Custom quota
                    │               │               │
                    └───────────────┴───────────────┘
                                    │
                                    ▼
                            Payment Failed?
                          ┌─────┴─────┐
                          ▼             ▼
                      Grace Period   Cancel
                      (7 days)         │
                          │             ▼
                          ▼         Downgrade to Free
                      Resolved?     (data preserved 30 days)
```

## Beta-Specific Notes

During the public beta:
- **All features are free.** No billing integration required for beta launch.
- **Usage tracking is the priority.** We need data to validate pricing before GA.
- **Soft quotas prevent abuse.** Per-tenant limits enforced, gracefully communicated.
- **No payment collection in beta.** Stripe integration is a GA gate, not a beta gate.
- **Beta agreement covers this.** Users accept that pricing may change for GA.

## Related Docs

- [Beta Release Checklist](beta-release-checklist.md)
- [Beta Agreement](beta-agreement.md)
- [Incident Response](incident-response.md)
