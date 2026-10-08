CREATE TABLE IF NOT EXISTS service_categories (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO service_categories(code,name) VALUES
  ('general','Serviço geral'),
  ('home_services','Serviços residenciais')
ON CONFLICT (code) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_service_categories_status
  ON service_categories(status, code);

INSERT INTO schema_migrations (version)
VALUES ('016_category_catalog')
ON CONFLICT (version) DO NOTHING;
