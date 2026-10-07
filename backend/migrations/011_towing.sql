CREATE TABLE IF NOT EXISTS towing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL UNIQUE REFERENCES services(id) ON DELETE CASCADE,
  origin JSONB NOT NULL,
  destination JSONB,
  problem_description TEXT NOT NULL CHECK (length(trim(problem_description)) BETWEEN 1 AND 4000),
  media JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'accepted'
    CHECK (status IN ('accepted','provider_en_route','arrived','loading','in_tow','completed','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_towing_jobs_status ON towing_jobs(status, updated_at DESC);

CREATE TABLE IF NOT EXISTS towing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  towing_job_id UUID NOT NULL REFERENCES towing_jobs(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES accounts(id),
  from_status TEXT,
  to_status TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_towing_events_job ON towing_events(towing_job_id, created_at DESC);

INSERT INTO schema_migrations (version)
VALUES ('011_towing')
ON CONFLICT (version) DO NOTHING;
