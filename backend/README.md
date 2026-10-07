# Nexo Backend

Foundation service for the Nexo modular monolith.

Local flow:
1. Copy root .env.example to .env.
2. Start PostgreSQL with docker compose up -d postgres.
3. Install dependencies with npm install.
4. Run npm run start:dev.
5. Health endpoint: GET /v1/health.

Business/domain modules are introduced incrementally in later phases.
