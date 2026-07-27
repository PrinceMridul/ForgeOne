#!/usr/bin/env bash
set -euo pipefail
echo "🔄 Generating Prisma client..."
pnpm --filter @forgeone/database prisma generate
echo "✅ Types generated."
