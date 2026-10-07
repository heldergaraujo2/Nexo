CREATE TABLE IF NOT EXISTS subscriptions (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 provider_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
 price_cents BIGINT NOT NULL DEFAULT 9990 CHECK (price_cents=9990),
 currency CHAR(3) NOT NULL DEFAULT 'BRL',
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','past_due','suspended','cancelled','expired')),
 current_period_start TIMESTAMPTZ,
 current_period_end TIMESTAMPTZ,
 cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
 cancelled_at TIMESTAMPTZ,
 external_reference TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_provider_subscription ON subscriptions(provider_id) WHERE status IN ('pending','active','past_due','suspended');
CREATE INDEX IF NOT EXISTS idx_subscriptions_provider_history ON subscriptions(provider_id,created_at DESC);
CREATE TABLE IF NOT EXISTS subscription_events (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE RESTRICT,
 actor_id UUID REFERENCES accounts(id),
 from_status TEXT,
 to_status TEXT NOT NULL,
 reason TEXT,
 external_reference TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS subscription_billing_records (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE RESTRICT,
 period_start TIMESTAMPTZ NOT NULL,
 period_end TIMESTAMPTZ NOT NULL,
 amount_cents BIGINT NOT NULL CHECK(amount_cents=9990),
 currency CHAR(3) NOT NULL DEFAULT 'BRL',
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid','failed')),
 external_reference TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE(subscription_id,period_start)
);
CREATE INDEX IF NOT EXISTS idx_subscription_events_subscription ON subscription_events(subscription_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_billing_subscription ON subscription_billing_records(subscription_id,period_start DESC);
INSERT INTO schema_migrations(version) VALUES('010_subscriptions') ON CONFLICT(version) DO NOTHING;