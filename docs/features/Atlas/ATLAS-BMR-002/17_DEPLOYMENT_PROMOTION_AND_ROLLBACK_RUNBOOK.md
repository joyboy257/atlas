# Deployment, Promotion and Rollback Runbook

**Programme:** `ATLAS-BMR-002`  
**Package version:** `3.0.0-execution`  
**Date:** `2026-07-29`  
**Status:** `EXECUTION AUTHORITY`


## Scope

This runbook directs Claude Code to move BMR-002 through local, CI, staging and explicitly authorised limited production. It does not grant production, push, merge, tag, package-publication or repository-visibility authority.

## Environment ladder

```text
local deterministic
→ CI/disposable integration
→ provider sandbox/test
→ production-shaped staging
→ limited production (explicit authority)
→ production-proven (separate sustained evidence)
```

No rung is inferred from the previous one.

## Pre-deployment discovery

Before changing deployment files:

1. Identify current deployment system, accounts, regions, secret manager, database, queue, artifact registry and owners.
2. Read repository deployment instructions and active adjacent programmes.
3. Map exact BMR-001 deployment evidence to current resources.
4. Verify credentials by metadata/health without printing values.
5. Identify irreversible or externally billable actions.
6. Record source branch/commit and dirty state.
7. Select a rollback target and stop-admission method.

Do not invent a second deployment stack when a current owner exists.

## Candidate build

A candidate must have:

- clean reviewed source or recorded bounded dirty state;
- lockfile/dependency integrity;
- reproducible build;
- artifact digest;
- SBOM/dependency report where repository supports it;
- secret scan;
- migration plan;
- configuration/feature flag plan;
- test manifest;
- release/evidence manifest.

## Database migration

Use expand/contract:

1. add backward-compatible schema/indexes;
2. deploy code able to read old/new shape;
3. backfill idempotently with metrics/checkpoints;
4. verify old/new binary compatibility;
5. switch writes/reads deliberately;
6. retain rollback window;
7. remove old shape only in a later independently safe release.

Never run a destructive migration merely because local tests pass.

## Staging deployment

When existing staging access and repository rules permit, Claude Code proceeds without asking the user to re-plan:

- preflight infrastructure and secrets;
- apply compatible migrations;
- deploy candidate;
- wait for health and worker readiness;
- run smoke plus flagship Mission;
- run provider sandbox tests;
- execute prescribed load/fault/rollback/recovery tests;
- capture exact evidence;
- fix or roll back failures.

If credentials/access are absent, mark only the deployment/provider item `BLOCKED_EXTERNAL`, create the exact required-access record, and continue independent work.

## Two staging uses

BMR-002 uses staging in two distinct ways:

1. **Product-plane previews during P2–P6.** These environments support focused Cloud, provider, enterprise, commercial and integration-readiness tests. They can satisfy only the owning build-readiness gate.
2. **Exact complete-product candidate during P7.** P7-004 deploys the sealed G7 candidate without rebuilding it. P7-005 then runs the whole-product certification matrix. Only this path can support G8.

Never promote a P4 Cloud preview or P5 provider proof into a whole-product staging verdict.

## Canary

Canary validates:

- real ingress;
- Mission persistence/resume;
- policy/approval;
- transactional Action/outbox;
- worker/provider callback;
- receipts/outcome;
- usage/cost;
- operator control;
- telemetry;
- migration compatibility.

A health endpoint alone is not a canary.

## Promotion record

Before limited production record:

```text
authority issuer
source commit/artifact
region
tenant/customer cap
provider accounts/capabilities
data classes
autonomy/action limits
spend/quota
SLO/error-budget policy
support hours/owners
incident and provider escalation
canary window
rollback/stop-admission owner
expiry/review date
```

Without explicit authority, finish with:

```text
ATLAS_BMR_002_STAGING_CERTIFIED_PRODUCTION_APPROVAL_REQUIRED
```

## Rollback triggers

Examples:

- tenant-isolation or credential exposure;
- duplicate/false committed effect;
- receipt/audit corruption;
- unsafe migration;
- provider retry storm or uncontrolled spend;
- severe SLO/error-budget breach;
- operator control unavailable;
- unknown release provenance;
- critical security finding.

## Rollback sequence

1. Stop or reduce new Mission admission.
2. Preserve evidence and current durable state.
3. Pause risky triggers/actions/provider lanes.
4. Drain or quarantine in-flight work by documented semantics.
5. Roll back application/configuration to the verified target.
6. Avoid destructive schema rollback; forward-fix where necessary.
7. Reconcile Actions, outbox, provider state, receipts and usage.
8. Handoff/communicate affected active Missions.
9. Verify recovery with outside-in journey.
10. record incident and terminal/phase verdict.

## Public release

Public package/repository publication is separate from Cloud deployment. Prepare artifacts, provenance, licences and release notes, but do not publish, push, merge, tag or change visibility without explicit user authority.
