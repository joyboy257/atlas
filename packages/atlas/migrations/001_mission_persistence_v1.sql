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

CREATE TABLE IF NOT EXISTS atlas_mission_triggers (
  tenant_id TEXT NOT NULL,
  organisation_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  environment_id TEXT NOT NULL,
  trigger_id TEXT NOT NULL,
  mission_id TEXT,
  trigger_type TEXT NOT NULL,
  event_type TEXT,
  event_key TEXT,
  occurred_at TIMESTAMPTZ NOT NULL,
  payload_digest TEXT NOT NULL,
  payload JSONB,
  status TEXT NOT NULL,
  result JSONB,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, organisation_id, project_id, environment_id, trigger_id),
  UNIQUE (tenant_id, organisation_id, project_id, environment_id, trigger_id, payload_digest, mission_id, event_type, event_key),
  CONSTRAINT atlas_mission_triggers_complete_event_route
    CHECK ((event_type IS NULL AND event_key IS NULL AND (mission_id IS NULL OR NULLIF(translate(mission_id, chr(9) || chr(10) || chr(11) || chr(12) || chr(13) || chr(32) || chr(160) || chr(5760) || chr(8192) || chr(8193) || chr(8194) || chr(8195) || chr(8196) || chr(8197) || chr(8198) || chr(8199) || chr(8200) || chr(8201) || chr(8202) || chr(8232) || chr(8233) || chr(8239) || chr(8287) || chr(12288) || chr(65279), ''), '') IS NOT NULL)) OR (NULLIF(translate(mission_id, chr(9) || chr(10) || chr(11) || chr(12) || chr(13) || chr(32) || chr(160) || chr(5760) || chr(8192) || chr(8193) || chr(8194) || chr(8195) || chr(8196) || chr(8197) || chr(8198) || chr(8199) || chr(8200) || chr(8201) || chr(8202) || chr(8232) || chr(8233) || chr(8239) || chr(8287) || chr(12288) || chr(65279), ''), '') IS NOT NULL AND NULLIF(translate(event_type, chr(9) || chr(10) || chr(11) || chr(12) || chr(13) || chr(32) || chr(160) || chr(5760) || chr(8192) || chr(8193) || chr(8194) || chr(8195) || chr(8196) || chr(8197) || chr(8198) || chr(8199) || chr(8200) || chr(8201) || chr(8202) || chr(8232) || chr(8233) || chr(8239) || chr(8287) || chr(12288) || chr(65279), ''), '') IS NOT NULL AND NULLIF(translate(event_key, chr(9) || chr(10) || chr(11) || chr(12) || chr(13) || chr(32) || chr(160) || chr(5760) || chr(8192) || chr(8193) || chr(8194) || chr(8195) || chr(8196) || chr(8197) || chr(8198) || chr(8199) || chr(8200) || chr(8201) || chr(8202) || chr(8232) || chr(8233) || chr(8239) || chr(8287) || chr(12288) || chr(65279), ''), '') IS NOT NULL))
);

CREATE OR REPLACE FUNCTION atlas_mission_triggers_immutable_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
    OR NEW.organisation_id IS DISTINCT FROM OLD.organisation_id
    OR NEW.project_id IS DISTINCT FROM OLD.project_id
    OR NEW.environment_id IS DISTINCT FROM OLD.environment_id
    OR NEW.trigger_id IS DISTINCT FROM OLD.trigger_id
    OR NEW.mission_id IS DISTINCT FROM OLD.mission_id
    OR NEW.trigger_type IS DISTINCT FROM OLD.trigger_type
    OR NEW.event_type IS DISTINCT FROM OLD.event_type
    OR NEW.event_key IS DISTINCT FROM OLD.event_key
    OR NEW.occurred_at IS DISTINCT FROM OLD.occurred_at
    OR NEW.payload_digest IS DISTINCT FROM OLD.payload_digest
    OR NEW.payload IS DISTINCT FROM OLD.payload
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'atlas mission trigger identity and content are immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS atlas_mission_triggers_immutable_update ON atlas_mission_triggers;
CREATE TRIGGER atlas_mission_triggers_immutable_update
  BEFORE UPDATE ON atlas_mission_triggers
  FOR EACH ROW
  EXECUTE FUNCTION atlas_mission_triggers_immutable_update();

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
