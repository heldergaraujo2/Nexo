CREATE INDEX IF NOT EXISTS idx_services_provider_status_completed
  ON services(provider_id, status, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_services_customer_status_completed
  ON services(customer_id, status, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_services_completed_cohort
  ON services(status, completed_at, customer_id);

CREATE INDEX IF NOT EXISTS idx_offers_created_status_request
  ON offers(created_at, status, request_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_created_category
  ON service_requests(created_at, category);
CREATE INDEX IF NOT EXISTS idx_accounts_created_role
  ON accounts(created_at, role);
CREATE INDEX IF NOT EXISTS idx_referrals_created_status
  ON referrals(created_at, status);
CREATE INDEX IF NOT EXISTS idx_campaign_redemptions_redeemed
  ON campaign_redemptions(redeemed_at);
CREATE INDEX IF NOT EXISTS idx_provider_marketplace_availability
  ON provider_marketplace(availability);

INSERT INTO schema_migrations (version)
VALUES ('014_scale_indexes')
ON CONFLICT (version) DO NOTHING;
