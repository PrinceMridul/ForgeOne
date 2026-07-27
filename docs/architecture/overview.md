# Architecture Overview

ForgeOne uses three primary services in a Turborepo monorepo:

- **Web App** (`apps/web`): Next.js 15 frontend at :3000
- **API Server** (`apps/api`): Fastify 5 API at :4000
- **Agent Runtime** (`apps/agent-runtime`): Python FastAPI at :8000

Backing services: PostgreSQL 16, Redis 7, Qdrant, MinIO (S3)

## Data Flow
1. User submits task via web UI
2. API creates task, dispatches to BullMQ
3. Agent Runtime picks up job
4. Orchestrator decomposes and assigns to agents
5. Agents execute in sandboxes
6. Results stream back via WebSocket
