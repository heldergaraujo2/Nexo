CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  plan_code TEXT NOT NULL DEFAULT 'professional_monthly',
  amount_cents BIGINT NOT NULL DEFAULT 9990 CHECK (amount_cents = 9990),
  currency CHAR(3) NOT NULL DEFAULT 'BRL',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','past_due','suspended','canceled','expired')),
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (plan_code='professional_monthly' AND currency='BRL'),
  CHECK (current_period_end > current_period_start)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_provider_subscription ON subscriptions(provider_id) WHERE status IN ('pending','active','past_due','suspended');
CREATE TABLE IF NOT EXISTS subscription_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE RESTRICT,
  provider_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  amount_cents BIGINT NOT NULL CHECK (amount_cents=9990),
  currency CHAR(3) NOT NULL DEFAULT 'BRL',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','succeeded','failed')),
  external_reference TEXT,
  failure_reason TEXT,
  idempotency_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  UNIQUE(subscription_id,period_start),
  UNIQUE(subscription_id,provider_id),
  UNIQUE(provider_id,idempotency_key),
  CHECK (period_end>period_start),
  CONSTRAINT fk_subscription_charges_subscription_provider
    FOREIGN KEY (subscription_id, provider_id)
    REFERENCES subscriptions(id, provider_id)
);
CREATE INDEX IF NOT EXISTS idx_subscription_charges_provider ON subscription_charges(provider_id,created_at DESC);
INSERT INTO schema_migrations(version) VALUES ('012_subscriptions') ON CONFLICT(version) DO NOTHING;
