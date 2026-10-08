ALTER TABLE provider_marketplace
  ADD COLUMN IF NOT EXISTS last_latitude NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS last_longitude NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ;

ALTER TABLE provider_marketplace
  ADD CONSTRAINT provider_marketplace_latitude_range
  CHECK (last_latitude IS NULL OR last_latitude BETWEEN -90 AND 90),
  ADD CONSTRAINT provider_marketplace_longitude_range
  CHECK (last_longitude IS NULL OR last_longitude BETWEEN -180 AND 180);

CREATE INDEX IF NOT EXISTS idx_provider_marketplace_location
  ON provider_marketplace(last_latitude, last_longitude)
  WHERE last_latitude IS NOT NULL AND last_longitude IS NOT NULL;

INSERT INTO schema_migrations (version)
VALUES ('015_provider_location')
ON CONFLICT (version) DO NOTHING;
