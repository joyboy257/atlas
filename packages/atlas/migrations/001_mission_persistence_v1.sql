-- Atlas Mission persistence v1. Expand/contract baseline.
-- This migration is additive: application reads must support the prior release
-- before any later contract removes or renames a column.

BEGIN;

CREATE TABLE IF NOT EXISTS atlas_missions (
  tenant_id TEXT NOT NULL,
  organisation_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  environment_id TEXT NOT NULL,
  mission_id TEXT NOT NULL,
  schema_version TEXT NOT NULL DEFAULT '1',
  state TEXT NOT NULL,
  state_version INTEGER NOT NULL,
  agent_version_id TEXT NOT NULL,
  deployment_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  terminal_at TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, organisation_id, project_id, environment_id, mission_id)
);

CREATE TABLE IF NOT EXISTS atlas_mission_lifecycle_events (
  tenant_id TEXT NOT NULL,
  organisation_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  environment_id TEXT NOT NULL,
  mission_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  state_version INTEGER NOT NULL,
  payload JSONB NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, organisation_id, project_id, environment_id, event_id),
  UNIQUE (tenant_id, organisation_id, project_id, environment_id, mission_id, idempotency_key),
  UNIQUE (tenant_id, organisation_id, project_id, environment_id, mission_id, state_version),
  FOREIGN KEY (tenant_id, organisation_id, project_id, environment_id, mission_id)
    REFERENCES atlas_missions (tenant_id, organisation_id, project_id, environment_id, mission_id)
);

CREATE TABLE IF NOT EXISTS atlas_mission_steps (
  tenant_id TEXT NOT NULL,
  organisation_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  environment_id TEXT NOT NULL,
  mission_id TEXT NOT NULL,
  step_id TEXT NOT NULL,
  status TEXT NOT NULL,
  payload JSONB,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, organisation_id, project_id, environment_id, step_id),
  FOREIGN KEY (tenant_id, organisation_id, project_id, environment_id, mission_id)
    REFERENCES atlas_missions (tenant_id, organisation_id, project_id, environment_id, mission_id)
);

CREATE TABLE IF NOT EXISTS atlas_mission_waits (
  tenant_id TEXT NOT NULL,
  organisation_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  environment_id TEXT NOT NULL,
  mission_id TEXT NOT NULL,
  wait_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  payload JSONB,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, organisation_id, project_id, environment_id, wait_id),
  FOREIGN KEY (tenant_id, organisation_id, project_id, environment_id, mission_id)
    REFERENCES atlas_missions (tenant_id, organisation_id, project_id, environment_id, mission_id)
);

CREATE TABLE IF NOT EXISTS atlas_mission_decisions (
  tenant_id TEXT NOT NULL,
  organisation_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  environment_id TEXT NOT NULL,
  mission_id TEXT NOT NULL,
  decision_id TEXT NOT NULL,
  proposal_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, organisation_id, project_id, environment_id, decision_id),
  FOREIGN KEY (tenant_id, organisation_id, project_id, environment_id, mission_id)
    REFERENCES atlas_missions (tenant_id, organisation_id, project_id, environment_id, mission_id)
);

CREATE TABLE IF NOT EXISTS atlas_mission_actions (
  tenant_id TEXT NOT NULL,
  organisation_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  environment_id TEXT NOT NULL,
  mission_id TEXT NOT NULL,
  action_id TEXT NOT NULL,
  decision_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, organisation_id, project_id, environment_id, action_id),
  UNIQUE (tenant_id, organisation_id, project_id, environment_id, mission_id, idempotency_key),
  FOREIGN KEY (tenant_id, organisation_id, project_id, environment_id, mission_id)
    REFERENCES atlas_missions (tenant_id, organisation_id, project_id, environment_id, mission_id)
);

CREATE TABLE IF NOT EXISTS atlas_mission_receipts (
  tenant_id TEXT NOT NULL,
  organisation_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  environment_id TEXT NOT NULL,
  mission_id TEXT NOT NULL,
  receipt_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, organisation_id, project_id, environment_id, receipt_id),
  FOREIGN KEY (tenant_id, organisation_id, project_id, environment_id, mission_id)
    REFERENCES atlas_missions (tenant_id, organisation_id, project_id, environment_id, mission_id)
);

CREATE TABLE IF NOT EXISTS atlas_mission_receipt_links (
  tenant_id TEXT NOT NULL,
  organisation_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  environment_id TEXT NOT NULL,
  mission_id TEXT NOT NULL,
  link_id TEXT NOT NULL,
  receipt_id TEXT NOT NULL,
  action_id TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, organisation_id, project_id, environment_id, link_id),
  FOREIGN KEY (tenant_id, organisation_id, project_id, environment_id, mission_id)
    REFERENCES atlas_missions (tenant_id, organisation_id, project_id, environment_id, mission_id),
  FOREIGN KEY (tenant_id, organisation_id, project_id, environment_id, receipt_id)
    REFERENCES atlas_mission_receipts (tenant_id, organisation_id, project_id, environment_id, receipt_id)
);

COMMIT;
