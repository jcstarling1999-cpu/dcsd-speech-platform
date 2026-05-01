BEGIN;

CREATE TABLE IF NOT EXISTS upload_sessions (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID NOT NULL REFERENCES users(id),
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  checksum_sha256 TEXT NOT NULL,
  chunk_size_bytes BIGINT NOT NULL,
  expected_parts INT NOT NULL,
  uploaded_parts INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS upload_parts (
  id UUID PRIMARY KEY,
  upload_id UUID NOT NULL REFERENCES upload_sessions(id) ON DELETE CASCADE,
  part_number INT NOT NULL,
  etag TEXT,
  checksum_sha256 TEXT,
  size_bytes BIGINT,
  uploaded_at TIMESTAMPTZ,
  UNIQUE(upload_id, part_number)
);

CREATE TABLE IF NOT EXISTS idempotency_records (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id),
  scope TEXT NOT NULL,
  idem_key TEXT NOT NULL,
  resource_id UUID,
  response_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, scope, idem_key)
);

CREATE TABLE IF NOT EXISTS provider_calls (
  id UUID PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  step_id UUID REFERENCES job_steps(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  operation TEXT NOT NULL,
  status TEXT NOT NULL,
  latency_ms INT NOT NULL,
  estimated_cost_usd NUMERIC(12,6) NOT NULL DEFAULT 0,
  request_bytes BIGINT,
  response_bytes BIGINT,
  request_json JSONB,
  response_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usage_metering (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id),
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  usage_unit TEXT NOT NULL,
  usage_quantity NUMERIC(18,6) NOT NULL,
  estimated_cost_usd NUMERIC(12,6) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dead_letter_events (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id),
  queue_name TEXT NOT NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  payload_json JSONB NOT NULL,
  replay_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  replayed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS voice_consents (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id),
  subject_identifier TEXT NOT NULL,
  consent_type TEXT NOT NULL,
  granted_by UUID NOT NULL REFERENCES users(id),
  evidence_uri TEXT NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS org_policies (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id),
  policy_key TEXT NOT NULL,
  policy_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, policy_key)
);

CREATE INDEX IF NOT EXISTS idx_jobs_org_status_created_at ON jobs(org_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_steps_job_status ON job_steps(job_id, status);
CREATE INDEX IF NOT EXISTS idx_artifacts_job_type ON artifacts(job_id, artifact_type);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_org_status ON upload_sessions(org_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_provider_calls_job_provider ON provider_calls(job_id, provider, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_metering_org_created ON usage_metering(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dead_letter_events_org_created ON dead_letter_events(org_id, created_at DESC);

COMMIT;
