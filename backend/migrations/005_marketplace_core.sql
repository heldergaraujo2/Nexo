CREATE TABLE IF NOT EXISTS provider_marketplace (
  account_id UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  categories TEXT[] NOT NULL DEFAULT '{}',
  availability TEXT NOT NULL DEFAULT 'offline'
    CHECK (availability IN ('offline','available','busy')),
  accepting_requests BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (NOT accepting_requests OR cardinality(categories) > 0)
);

CREATE INDEX IF NOT EXISTS idx_provider_marketplace_available
  ON provider_marketplace(availability, accepting_requests);

CREATE TABLE IF NOT EXISTS service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES accounts(id),
  category TEXT NOT NULL,
  description TEXT,
  requirements JSONB NOT NULL DEFAULT '{}'::jsonb,
  origin JSONB,
  destination JSONB,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('draft','open','matched','accepted','in_progress','completed','cancelled','expired','disputed')),
  matched_provider_id UUID REFERENCES accounts(id),
  accepted_offer_id UUID,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (matched_provider_id IS NULL OR matched_provider_id <> customer_id)
);

CREATE INDEX IF NOT EXISTS idx_service_requests_customer
  ON service_requests(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_requests_open
  ON service_requests(status, category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_requests_provider_match
  ON service_requests(matched_provider_id, status);

CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES accounts(id),
  offer_type TEXT NOT NULL DEFAULT 'direct_accept'
    CHECK (offer_type IN ('direct_accept','priced_offer')),
  amount_cents BIGINT,
  currency CHAR(3) NOT NULL DEFAULT 'BRL',
  message TEXT,
  status TEXT NOT NULL DEFAULT 'sent'
    CHECK (status IN ('created','sent','accepted','rejected','expired','withdrawn')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (amount_cents IS NULL OR amount_cents >= 0),
  CHECK (offer_type = 'direct_accept' OR amount_cents IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_open_offer_provider_request
  ON offers(request_id, provider_id)
  WHERE status IN ('created','sent');

CREATE INDEX IF NOT EXISTS idx_offers_request_status
  ON offers(request_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_offers_provider_status
  ON offers(provider_id, status, created_at DESC);

ALTER TABLE services
  ADD COLUMN IF NOT EXISTS request_id UUID REFERENCES service_requests(id),
  ADD COLUMN IF NOT EXISTS accepted_offer_id UUID REFERENCES offers(id),
  ADD COLUMN IF NOT EXISTS price_cents BIGINT,
  ADD COLUMN IF NOT EXISTS currency CHAR(3) NOT NULL DEFAULT 'BRL',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS uq_services_request
  ON services(request_id)
  WHERE request_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_services_offer
  ON services(accepted_offer_id)
  WHERE accepted_offer_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient
  ON notifications(recipient_id, created_at DESC);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  operation TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response_status INTEGER NOT NULL,
  response_body JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (account_id, idempotency_key, operation)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_created
  ON idempotency_keys(created_at);

INSERT INTO schema_migrations (version)
VALUES ('005_marketplace_core')
ON CONFLICT (version) DO NOTHING;
