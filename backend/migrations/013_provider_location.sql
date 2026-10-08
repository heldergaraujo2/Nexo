ALTER TABLE provider_marketplace
  ADD COLUMN IF NOT EXISTS current_latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS current_longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ;

ALTER TABLE provider_marketplace
  DROP CONSTRAINT IF EXISTS provider_marketplace_location_pair;

ALTER TABLE provider_marketplace
  ADD CONSTRAINT provider_marketplace_location_pair
  CHECK (
    (current_latitude IS NULL AND current_longitude IS NULL)
    OR
    (current_latitude BETWEEN -90 AND 90 AND current_longitude BETWEEN -180 AND 180)
  );

CREATE INDEX IF NOT EXISTS idx_provider_marketplace_location
  ON provider_marketplace(location_updated_at)
  WHERE current_latitude IS NOT NULL AND current_longitude IS NOT NULL;

INSERT INTO schema_migrations (version)
VALUES ('013_provider_location')
ON CONFLICT (version) DO NOTHING;
