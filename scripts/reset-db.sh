#!/usr/bin/env bash
set -euo pipefail
echo "⚠️ Resetting database..."
docker compose exec -T postgres psql -U forgeone -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
pnpm db:migrate
echo "✅ Database reset."
