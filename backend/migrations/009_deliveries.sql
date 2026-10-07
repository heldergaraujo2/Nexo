CREATE TABLE IF NOT EXISTS deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL UNIQUE REFERENCES services(id) ON DELETE CASCADE,
  origin JSONB NOT NULL, destination JSONB NOT NULL,
  item_description TEXT NOT NULL CHECK (length(trim(item_description)) BETWEEN 1 AND 4000),
  notes TEXT, media JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'accepted' CHECK (status IN ('accepted','provider_en_route','at_pickup','picked_up','in_transit','delivered','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  picked_up_at TIMESTAMPTZ, delivered_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_deliveries_service ON deliveries(service_id);
CREATE TABLE IF NOT EXISTS delivery_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES accounts(id), from_status TEXT, to_status TEXT NOT NULL, reason TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_delivery_events_delivery ON delivery_events(delivery_id, created_at DESC);
INSERT INTO schema_migrations (version) VALUES ('009_deliveries') ON CONFLICT (version) DO NOTHING;