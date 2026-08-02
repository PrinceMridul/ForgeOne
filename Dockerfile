# Whole-product image: Fastify API + TanStack Start SSR server behind one port.
#
# Portable fallback to render.yaml — the same image runs on Fly.io, Railway,
# Cloud Run, or any host that can run a container and set $PORT.
#
#   docker build -t forgeone .
#   docker run --rm -p 8080:8080 forgeone
#
# apps/api/Dockerfile still exists for deploying the API on its own.

FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

# --- Dependencies ------------------------------------------------------------
# Copied manifest-first so a source-only change does not re-resolve the graph.
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/config/package.json ./packages/config/
COPY packages/database/package.json ./packages/database/
COPY packages/logger/package.json ./packages/logger/
COPY packages/types/package.json ./packages/types/
# `prepare` runs husky, which needs a .git directory that is not in the image.
RUN pnpm install --frozen-lockfile --ignore-scripts

# --- Build -------------------------------------------------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages ./packages
COPY . .
RUN pnpm turbo run build

# --- Runtime -----------------------------------------------------------------
FROM node:22-alpine AS runner
RUN addgroup --system --gid 1001 forgeone && adduser --system --uid 1001 forgeone
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

COPY --from=builder --chown=forgeone:forgeone /app/node_modules ./node_modules
COPY --from=builder --chown=forgeone:forgeone /app/package.json ./package.json
COPY --from=builder --chown=forgeone:forgeone /app/scripts/start-production.mjs ./scripts/start-production.mjs
COPY --from=builder --chown=forgeone:forgeone /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=forgeone:forgeone /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder --chown=forgeone:forgeone /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder --chown=forgeone:forgeone /app/apps/web/.output ./apps/web/.output
COPY --from=builder --chown=forgeone:forgeone /app/packages ./packages

USER forgeone
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "scripts/start-production.mjs"]
