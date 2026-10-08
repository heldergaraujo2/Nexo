ALTER TABLE rides
  ADD COLUMN IF NOT EXISTS driver_latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS driver_longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS driver_location_updated_at TIMESTAMPTZ;

ALTER TABLE rides
  DROP CONSTRAINT IF EXISTS rides_driver_location_pair;

ALTER TABLE rides
  ADD CONSTRAINT rides_driver_location_pair
  CHECK (
    (driver_latitude IS NULL AND driver_longitude IS NULL)
    OR
    (driver_latitude BETWEEN -90 AND 90 AND driver_longitude BETWEEN -180 AND 180)
  );

CREATE INDEX IF NOT EXISTS idx_rides_driver_location_updated
  ON rides(driver_location_updated_at)
  WHERE driver_latitude IS NOT NULL AND driver_longitude IS NOT NULL;

INSERT INTO schema_migrations (version)
VALUES ('012_ride_driver_location')
ON CONFLICT (version) DO NOTHING;
