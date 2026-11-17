-- Apply to the dedicated Neon STAGING database before enabling TWINPEAK_SESSION_SECRET.
-- Demo only: the shared demo password is visible to visitors, not enterprise authentication.
BEGIN;
CREATE TABLE IF NOT EXISTS twinpeak_workspace_records (
  kind text NOT NULL CHECK (kind IN ('run','alignment','incident','report')),
  id varchar(160) NOT NULL,
  payload jsonb NOT NULL,
  actor varchar(24) NOT NULL,
  record_status varchar(32) NOT NULL,
  service varchar(180) NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (kind,id)
);
CREATE INDEX IF NOT EXISTS twinpeak_workspace_status_created_idx ON twinpeak_workspace_records(kind,record_status,created_at DESC);
CREATE INDEX IF NOT EXISTS twinpeak_workspace_service_created_idx ON twinpeak_workspace_records(service,created_at DESC);
CREATE TABLE IF NOT EXISTS twinpeak_workspace_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kind varchar(24) NOT NULL,
  record_id varchar(160) NOT NULL,
  actor varchar(24) NOT NULL,
  previous_status varchar(32),
  new_status varchar(32),
  event_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (kind,record_id) REFERENCES twinpeak_workspace_records(kind,id)
);
COMMIT;
