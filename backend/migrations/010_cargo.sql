CREATE TABLE IF NOT EXISTS cargo_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL UNIQUE REFERENCES services(id) ON DELETE CASCADE,
  origin JSONB NOT NULL,
  destination JSONB NOT NULL,
  cargo_description TEXT NOT NULL CHECK (length(trim(cargo_description)) BETWEEN 1 AND 4000),
  weight_grams BIGINT CHECK (weight_grams IS NULL OR weight_grams > 0),
  length_mm INTEGER CHECK (length_mm IS NULL OR length_mm > 0),
  width_mm INTEGER CHECK (width_mm IS NULL OR width_mm > 0),
  height_mm INTEGER CHECK (height_mm IS NULL OR height_mm > 0),
  media JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'accepted' CHECK (status IN ('accepted','provider_en_route','at_pickup','picked_up','in_transit','delivered','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  picked_up_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_cargo_jobs_status ON cargo_jobs(status, updated_at DESC);
CREATE TABLE IF NOT EXISTS cargo_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  proposer_id UUID NOT NULL REFERENCES accounts(id),
  recipient_id UUID NOT NULL REFERENCES accounts(id),
  version INTEGER NOT NULL CHECK (version > 0),
  amount_cents BIGINT NOT NULL CHECK (amount_cents >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'BRL',
  message TEXT,
  status TEXT NOT NULL DEFAULT 'offered' CHECK (status IN ('offered','countered','accepted','rejected','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (proposer_id <> recipient_id),
  UNIQUE (request_id, version)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_cargo_proposal ON cargo_proposals(request_id) WHERE status = 'offered';
CREATE INDEX IF NOT EXISTS idx_cargo_proposals_request ON cargo_proposals(request_id, version DESC);
CREATE TABLE IF NOT EXISTS cargo_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cargo_job_id UUID NOT NULL REFERENCES cargo_jobs(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES accounts(id),
  from_status TEXT,
  to_status TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cargo_events_job ON cargo_events(cargo_job_id, created_at DESC);
INSERT INTO schema_migrations (version) VALUES ('010_cargo') ON CONFLICT (version) DO NOTHING;

CREATE OR REPLACE FUNCTION prevent_cargo_accepted_price_change()
RETURNS TRIGGER AS $function$
BEGIN
  IF OLD.category = 'cargo' AND OLD.status IN ('accepted','in_progress','completed') AND (
    NEW.price_cents IS DISTINCT FROM OLD.price_cents OR NEW.currency IS DISTINCT FROM OLD.currency
  ) THEN
    RAISE EXCEPTION 'Accepted cargo price is immutable' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$function$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_cargo_accepted_price_immutable ON services;
CREATE TRIGGER trg_cargo_accepted_price_immutable
BEFORE UPDATE OF price_cents, currency ON services
FOR EACH ROW EXECUTE FUNCTION prevent_cargo_accepted_price_change();
