CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('car','motorcycle','truck','van','other')),
  make TEXT NOT NULL CHECK (length(trim(make)) BETWEEN 1 AND 80),
  model TEXT NOT NULL CHECK (length(trim(model)) BETWEEN 1 AND 80),
  model_year SMALLINT CHECK (model_year BETWEEN 1950 AND 2100),
  plate_last4 TEXT CHECK (plate_last4 IS NULL OR plate_last4 ~ '^[A-Z0-9]{4}$'),
  status TEXT NOT NULL DEFAULT 'pending_verification' CHECK (status IN ('pending_verification','verified','rejected','suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vehicles_provider ON vehicles(provider_id, created_at DESC);
CREATE TABLE IF NOT EXISTS verification_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE RESTRICT,
  verification_type TEXT NOT NULL CHECK (verification_type IN ('identity','vehicle')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected','expired','manual_review')),
  provider_name TEXT NOT NULL DEFAULT 'manual', external_reference TEXT, result_summary TEXT,
  reviewed_by UUID REFERENCES accounts(id), reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((verification_type='vehicle' AND vehicle_id IS NOT NULL) OR verification_type='identity')
);
CREATE INDEX IF NOT EXISTS idx_verification_cases_account ON verification_cases(account_id, created_at DESC);
CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), actor_id UUID REFERENCES accounts(id), event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','high','critical')),
  resource_type TEXT, resource_id UUID, outcome TEXT NOT NULL CHECK (outcome IN ('success','denied','flagged','failed')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity, created_at DESC);
CREATE TABLE IF NOT EXISTS fraud_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), account_id UUID REFERENCES accounts(id), service_id UUID REFERENCES services(id),
  flag_type TEXT NOT NULL, severity TEXT NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewing','resolved','dismissed')), reason TEXT NOT NULL,
  created_by UUID REFERENCES accounts(id), resolved_by UUID REFERENCES accounts(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_fraud_flags_status ON fraud_flags(status, severity, created_at DESC);
CREATE TABLE IF NOT EXISTS incident_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), reporter_id UUID REFERENCES accounts(id), service_id UUID REFERENCES services(id),
  safety_report_id UUID REFERENCES safety_reports(id), category TEXT NOT NULL, severity TEXT NOT NULL CHECK (severity IN ('low','normal','high','critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','contained','resolved','closed')), summary TEXT NOT NULL,
  assigned_to UUID REFERENCES accounts(id), resolution TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_incident_cases_status ON incident_cases(status, severity, created_at DESC);
INSERT INTO schema_migrations (version) VALUES ('008_operational_safety') ON CONFLICT (version) DO NOTHING;