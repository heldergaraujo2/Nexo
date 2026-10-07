# Database migrations

Migrations are immutable, ordered SQL files.

Phase 1 deliberately creates only the migration ledger. Domain tables are introduced with their owning phase so schema ownership remains explicit.

Local validation:
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/migrations/001_initial.sql
