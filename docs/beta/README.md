# Atlas Beta Documentation

Documentation for the Atlas public beta phase. These docs are **preparatory** — most are templates and plans, not yet executed. The beta gate is blocked on ATLAS-P3-010b (hosted cross-runtime flagship proof).

## Contents

### Sandbox
- [Sandbox Overview](sandbox/README.md) — Local hosted-experience preview
- [Provider Onboarding](sandbox/provider-onboarding.md) — How to connect real messaging providers

### Release
- [Beta Release Checklist](release/beta-release-checklist.md) — Complete pre-beta gate checklist
- [Security Review Template](release/security-review-template.md) — Pre-beta security review dimensions
- [Rollback Procedures](release/rollback-procedures.md) — Deployment rollback playbook
- [Incident Response](release/incident-response.md) — Incident commander runbook
- [Billing Integration Plan](release/billing-integration-plan.md) — Stripe integration architecture
- [Beta Agreement](release/beta-agreement.md) — Public beta terms and conditions (draft)

## Status

| Document | Status | Ready for Beta? |
|----------|--------|-----------------|
| Sandbox Overview | Complete | ✅ |
| Provider Onboarding | Complete | ✅ |
| Beta Release Checklist | Template | ✅ Ready to execute |
| Security Review Template | Template | ✅ Ready to execute |
| Rollback Procedures | Complete | ✅ |
| Incident Response | Complete | ✅ Needs tabletop test |
| Billing Integration Plan | Complete | ✅ (GA gate, not beta) |
| Beta Agreement | Draft | ✅ Needs legal review |

## Beta Gate Dependencies

```
ATLAS-P3-010b (Hosted Flagship Proof)
    ├── Real provider connections (email first, then others)
    ├── Cross-runtime execution (Atlas-native, OpenAI, Eve, webhook)
    ├── Staging deployment on VPS
    └── End-to-end governed outcome in hosted environment
            │
            ▼
    ATLAS-P4-006 (Public Self-Serve Beta)
    ├── Hosted sandbox open to early adopters
    ├── Managed starter inference
    └── Proven providers documented
            │
            ▼
    ATLAS-P4-008 (Developer Beta Release Evidence)
    ├── Security review complete
    ├── Human onboarding verified
    ├── Reliability gates pass
    └── Beta agreement in effect
```

## Next Action

Resolve ATLAS-P3-010b: deploy the sandbox to staging, connect one real provider, and execute a cross-runtime governed outcome end-to-end.
