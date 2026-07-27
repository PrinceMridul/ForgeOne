FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/config/package.json ./packages/config/
COPY packages/database/package.json ./packages/database/
COPY packages/types/package.json ./packages/types/
COPY packages/logger/package.json ./packages/logger/
RUN pnpm install --frozen-lockfile --filter @forgeone/api...

FROM base AS builder
COPY --from=deps /app ./
COPY . .
RUN pnpm turbo run build --filter=@forgeone/api...

FROM node:22-alpine AS runner
RUN addgroup --system --gid 1001 forgeone && adduser --system --uid 1001 forgeone
WORKDIR /app
COPY --from=builder --chown=forgeone:forgeone /app/apps/api/dist ./dist
COPY --from=builder --chown=forgeone:forgeone /app/apps/api/package.json ./
COPY --from=builder --chown=forgeone:forgeone /app/node_modules ./node_modules
USER forgeone
EXPOSE 4000
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
