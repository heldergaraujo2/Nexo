CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES accounts(id),
  provider_id UUID NOT NULL REFERENCES accounts(id),
  category TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft','open','matched','accepted','in_progress','completed','cancelled','expired','disputed')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (customer_id <> provider_id),
  CHECK ((status = 'completed' AND completed_at IS NOT NULL) OR status <> 'completed')
);

CREATE INDEX IF NOT EXISTS idx_services_customer ON services(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_services_provider ON services(provider_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_services_completed ON services(status, completed_at DESC);

CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES accounts(id),
  subject_id UUID NOT NULL REFERENCES accounts(id),
  score SMALLINT NOT NULL CHECK (score BETWEEN 1 AND 5),
  comment TEXT,
  moderation_state TEXT NOT NULL DEFAULT 'published'
    CHECK (moderation_state IN ('published','flagged','hidden','restored')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (author_id <> subject_id),
  UNIQUE (service_id, author_id)
);

CREATE INDEX IF NOT EXISTS idx_ratings_subject_state ON ratings(subject_id, moderation_state, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ratings_service ON ratings(service_id);

CREATE TABLE IF NOT EXISTS favorites (
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  target_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (account_id, target_account_id),
  CHECK (account_id <> target_account_id)
);

CREATE TABLE IF NOT EXISTS safety_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES accounts(id),
  target_account_id UUID REFERENCES accounts(id),
  service_id UUID REFERENCES services(id),
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','reviewing','resolved','dismissed')),
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low','normal','high','critical')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (target_account_id IS NOT NULL OR service_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_safety_reports_reporter ON safety_reports(reporter_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_safety_reports_status ON safety_reports(status, priority, created_at DESC);

CREATE TABLE IF NOT EXISTS blocks (
  blocker_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

CREATE TABLE IF NOT EXISTS verification_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  verification_type TEXT NOT NULL CHECK (verification_type IN ('identity','vehicle')),
  status TEXT NOT NULL CHECK (status IN ('pending','verified','rejected','expired','manual_review')),
  public_label TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, verification_type)
);

CREATE INDEX IF NOT EXISTS idx_verification_public ON verification_indicators(account_id, verification_type, status);

CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES accounts(id),
  event_type TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  outcome TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_resource ON audit_events(resource_type, resource_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor ON audit_events(actor_id, created_at DESC);

INSERT INTO schema_migrations (version)
VALUES ('004_trust_reputation')
ON CONFLICT (version) DO NOTHING;
