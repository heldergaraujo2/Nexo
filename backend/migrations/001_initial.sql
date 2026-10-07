-- Nexo Phase 1 foundation migration.
-- Domain tables are introduced in later phases; this migration establishes
-- the database contract and migration audit marker.

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO schema_migrations (version)
VALUES ('001_initial')
ON CONFLICT (version) DO NOTHING;
