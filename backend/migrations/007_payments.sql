CREATE TABLE IF NOT EXISTS payment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  method TEXT NOT NULL CHECK (method IN ('cash','pix','provider_card_machine')),
  expected_amount_cents BIGINT NOT NULL CHECK (expected_amount_cents >= 0),
  confirmed_amount_cents BIGINT CHECK (confirmed_amount_cents IS NULL OR confirmed_amount_cents >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'BRL',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','failed','disputed')),
  external_reference TEXT,
  dispute_reason TEXT,
  confirmed_by UUID REFERENCES accounts(id),
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (status = 'pending' AND confirmed_amount_cents IS NULL AND confirmed_by IS NULL AND confirmed_at IS NULL)
    OR
    (status = 'confirmed' AND confirmed_amount_cents IS NOT NULL AND confirmed_by IS NOT NULL AND confirmed_at IS NOT NULL)
    OR
    (status IN ('failed','disputed'))
  ),
  CHECK (
    status <> 'confirmed' OR confirmed_amount_cents = expected_amount_cents
  ),
  CHECK (
    method <> 'provider_card_machine' OR external_reference IS NULL OR length(external_reference) <= 128
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_records_service
  ON payment_records(service_id);

CREATE INDEX IF NOT EXISTS idx_payment_records_service
  ON payment_records(service_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_records_provider_reference
  ON payment_records(external_reference)
  WHERE external_reference IS NOT NULL;

CREATE OR REPLACE FUNCTION prevent_completed_service_price_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'completed' AND (NEW.price_cents IS DISTINCT FROM OLD.price_cents OR NEW.currency IS DISTINCT FROM OLD.currency) THEN
    RAISE EXCEPTION 'Completed service price is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_completed_service_price_immutable ON services;
CREATE TRIGGER trg_completed_service_price_immutable
BEFORE UPDATE ON services
FOR EACH ROW EXECUTE FUNCTION prevent_completed_service_price_change();
