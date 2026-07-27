#!/usr/bin/env bash
set -euo pipefail
echo "🐳 Starting dev infrastructure..."
docker compose up -d
sleep 5
docker compose ps
echo "✅ Ready: PG:5432 Redis:6379 Qdrant:6333 MinIO:9000"
