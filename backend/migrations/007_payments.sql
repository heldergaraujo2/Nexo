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

CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_records_active_service
  ON payment_records(service_id)
  WHERE status IN ('pending','confirmed');

CREATE INDEX IF NOT EXISTS idx_payment_records_service
  ON payment_records(service_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_records_provider_reference
  ON payment_records(external_reference)
  WHERE external_reference IS NOT NULL;
