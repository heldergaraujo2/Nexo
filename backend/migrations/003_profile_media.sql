CREATE TABLE IF NOT EXISTS media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('photo','video')),
  object_key TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  byte_size BIGINT NOT NULL CHECK (byte_size > 0),
  checksum_sha256 TEXT NOT NULL,
  caption TEXT,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','private')),
  moderation_state TEXT NOT NULL DEFAULT 'processing' CHECK (moderation_state IN ('processing','approved','rejected','quarantined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_owner_visibility ON media_assets(owner_id, visibility, moderation_state);

INSERT INTO schema_migrations (version)
VALUES ('003_profile_media')
ON CONFLICT (version) DO NOTHING;
