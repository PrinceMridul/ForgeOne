#!/usr/bin/env bash
set -euo pipefail
echo "🔨 ForgeOne Setup"
command -v node >/dev/null 2>&1 || { echo "❌ Node.js required"; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm required (corepack enable)"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker required"; exit 1; }
pnpm install
[ ! -f .env ] && cp .env.example .env
docker compose up -d
echo "⏳ Waiting for PostgreSQL..."
sleep 5
pnpm db:migrate
echo "🎉 Setup complete! Run 'make dev' to start."
