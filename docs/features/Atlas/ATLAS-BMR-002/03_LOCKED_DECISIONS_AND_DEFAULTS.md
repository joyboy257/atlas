# Locked Decisions and Execution Defaults

**Programme:** `ATLAS-BMR-002`  
**Package version:** `3.0.0-execution`  
**Date:** `2026-07-29`  
**Status:** `EXECUTION AUTHORITY`


## Decision posture

Claude Code does not stop the entire programme for choices that can be resolved safely from repository evidence, primary documentation, measured cost, and the defaults below. It records the decision, assumptions, falsifiers and reversible path.

Only external access, irreversible release actions, legal/commercial commitments, and genuine product choices with materially different consequences remain user decisions.

| ID | Decision | Default | Status |
| --- | --- | --- | --- |
| BMR2-FD-001 | BMR-002 primary product thesis | Production Agentic Business Messaging Platform | LOCKED_BY_USER_DIRECTION |
| BMR2-FD-002 | Execution behavior | Claude Code executes P0–P7 end to end and does not return another planning package | LOCKED_BY_USER_DIRECTION |
| BMR2-FD-003 | Main/worker responsibility | Main agent owns architecture and implementation; workers verify, test, review and commit bounded slices only | LOCKED_BY_USER_DIRECTION |
| BMR2-FD-004 | Product-plane status | Agent runtime, Cloud, providers, enterprise governance, billing and ecosystem are co-equal first-class product planes | LOCKED_BY_USER_DIRECTION |
| BMR2-FD-005 | Test order | Test continuously during construction; certify the whole integrated product after build on staging | LOCKED_BY_USER_DIRECTION |
| BMR2-FD-006 | Initial cloud topology | Single primary region with explicit failure boundary; no automatic global multi-region promise | DEFAULT_REVIEW_AT_P0 |
| BMR2-FD-007 | Second provider lane | Score at least three candidates; Twilio SMS is recommendation, not a pre-approved fact | DECIDE_AT_P5 |
| BMR2-FD-008 | Autonomy | Action-specific L0–L4; unrestricted L5 forbidden | LOCKED_SAFETY_DEFAULT |
| BMR2-FD-009 | Learning | Reviewed LearningProposal; no autonomous mutation of durable policy/knowledge | LOCKED_SAFETY_DEFAULT |
| BMR2-FD-010 | Marketplace | Build extension contracts/certification first; marketplace remains decision-gated | LOCKED_SCOPE_DEFAULT |
| BMR2-FD-011 | Pricing | Use versioned illustrative GBP scenarios only; no final price until cost/adoption evidence | LOCKED_SCOPE_DEFAULT |
| BMR2-FD-012 | Production promotion | Deploy the integrated candidate to staging when access permits; limited production requires explicit user/founder authority | LOCKED_GIT_AND_DEPLOYMENT_RULE |

## Defaults that keep execution moving

1. **Complete product:** agency, durable execution, developer product, Cloud, providers, trust, commercial controls, ecosystem and Mirai-compatible operator control.
2. **Workstream topology:** after shared contracts, execute dependency-ready P2–P6 work without treating phase number as product importance.
3. **Testing:** focused tests during construction; full-product certification after integration and staging deployment.
4. **Initial production shape:** one primary region with explicit backup/recovery and no global claim.
5. **Provider wave:** harden Resend; score at least three candidates for one second provider; do not predeclare sixteen channels.
6. **Operator surface:** use Mirai through public Atlas control contracts; do not build a duplicate Inbox/Command Center.
7. **Commercial model:** instrument usage/cost first, test provisional plan/metric scenarios, and delay final pricing.
8. **Ecosystem:** contracts, conformance and one independent extension before marketplace work.
9. **Git/deployment:** commits on an isolated branch may proceed under repository rules; push, merge, public publish, tag and production promotion require explicit authority.
10. **External blockers:** block only the affected lane and continue every dependency-independent product plane.

## Decisions that must be evidence-bound during execution

### Region and topology

P0/P4 may amend the single-region default only when current infrastructure, customer demand, residency requirements, recovery objectives or cost evidence justify it. "Multi-region sounds enterprise" is not evidence.

### Second provider

The scorecard must include demand, eligible account access, geographic fit, send/receive needs, consent/template rules, webhook authenticity, media, rate limits, delivery callbacks, cost, support burden, version drift and deprecation risk.

### Enterprise standards

OIDC/SSO is likely relevant. SCIM, customer-managed keys, residency variants and formal certifications require customer/business justification. Control implementation, organisational process and external audit are separate maturity states.

### Pricing

Illustrative scenarios use pounds sterling unless existing Atlas pricing establishes another currency. No scenario becomes a public promise until cost attribution, value metric, gaming resistance, customer comprehension, billing reconciliation and support economics are evidenced.

## Decision record template

```markdown
# <decision ID and title>

- Date:
- Work item:
- Decision owner:
- Repository/environment evidence:
- Primary-source evidence:
- Options:
- Selected option:
- Why:
- Assumptions:
- Falsifiers:
- Reversible path:
- Follow-up gate:
```
