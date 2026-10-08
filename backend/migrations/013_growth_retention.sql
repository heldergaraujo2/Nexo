CREATE TABLE IF NOT EXISTS referral_codes (
  account_id UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code TEXT NOT NULL REFERENCES referral_codes(code),
  referrer_id UUID NOT NULL REFERENCES accounts(id),
  referred_id UUID NOT NULL UNIQUE REFERENCES accounts(id),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','qualified','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  qualified_at TIMESTAMPTZ,
  CHECK (referrer_id <> referred_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status, created_at DESC);

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','active','ended')),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES accounts(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_campaigns_status_window ON campaigns(status, starts_at, ends_at);

CREATE TABLE IF NOT EXISTS campaign_redemptions (
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (campaign_id, account_id)
);

CREATE TABLE IF NOT EXISTS founder_program (
  account_id UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  cohort TEXT NOT NULL DEFAULT 'initial',
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_founder_program_cohort ON founder_program(cohort, enrolled_at DESC);

CREATE OR REPLACE FUNCTION qualify_referral_on_service_completion()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    UPDATE referrals
    SET status='qualified',qualified_at=NOW()
    WHERE referred_id=NEW.customer_id AND status='pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_qualify_referral_on_service_completion ON services;
CREATE TRIGGER trg_qualify_referral_on_service_completion
AFTER UPDATE OF status ON services
FOR EACH ROW EXECUTE FUNCTION qualify_referral_on_service_completion();

INSERT INTO schema_migrations (version)
VALUES ('013_growth_retention')
ON CONFLICT (version) DO NOTHING;
