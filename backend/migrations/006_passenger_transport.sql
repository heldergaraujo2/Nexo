CREATE TABLE IF NOT EXISTS rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL UNIQUE REFERENCES services(id) ON DELETE CASCADE,
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('car','motorcycle')),
  origin JSONB NOT NULL,
  destination JSONB NOT NULL,
  distance_meters BIGINT NOT NULL CHECK (distance_meters >= 0),
  tariff_cents_per_km BIGINT NOT NULL CHECK (tariff_cents_per_km > 0),
  fare_cents BIGINT NOT NULL CHECK (fare_cents >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'BRL',
  route_version INTEGER NOT NULL DEFAULT 1 CHECK (route_version > 0),
  state TEXT NOT NULL DEFAULT 'accepted'
    CHECK (state IN ('accepted','driver_en_route','arrived','started','completed','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_rides_state ON rides(state, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_rides_created ON rides(created_at DESC);

CREATE TABLE IF NOT EXISTS ride_route_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  origin JSONB NOT NULL,
  destination JSONB NOT NULL,
  distance_meters BIGINT NOT NULL CHECK (distance_meters >= 0),
  tariff_cents_per_km BIGINT NOT NULL CHECK (tariff_cents_per_km > 0),
  fare_cents BIGINT NOT NULL CHECK (fare_cents >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'BRL',
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (ride_id, version)
);

CREATE TABLE IF NOT EXISTS ride_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES accounts(id),
  from_state TEXT,
  to_state TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ride_events_ride ON ride_events(ride_id, created_at DESC);

INSERT INTO schema_migrations (version)
VALUES ('006_passenger_transport')
ON CONFLICT (version) DO NOTHING;
