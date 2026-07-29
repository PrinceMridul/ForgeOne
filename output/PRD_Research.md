# Product Requirement Document (PRD) — AI Research Collaboration

## Project Overview
Build an AI research collaboration platform called ResearchHub AI.

Requirements:

Features:
- Projects
- Research papers
- Experiment tracking
- Dataset management
- Model registry
- Prompt versioning
- Notebook execution
- GPU job queue
- Team collaboration
- Paper summaries
- Citation graph
- Benchmark tracking
- LLM evaluation

Admin:
- Organization management
- Billing
- Analytics

Tech:
- Python
- FastAPI
- PostgreSQL
- Qdrant
- Redis
- Docker
- Kubernetes
- CI/CD

## Core Resources
- **Project** (`projects`) — fields: `name`, `slug`, `archived`
- **Subscription** (`subscriptions`) — fields: `plan`, `status`, `renewsAt`
- **Event** (`events`) — fields: `kind`, `payload`, `occurredAt`
- **Workspace** (`workspaces`) — fields: `name`, `slug`

## Cross-cutting Capabilities
- **Realtime collaboration** — WebSocket gateway with per-room fan-out and presence heartbeats
- **Billing & subscriptions** — Stripe webhooks reconciled against a local subscription ledger
- **Search** — Postgres full-text search with a GIN index and ranked results
- **Analytics & reporting** — Pre-aggregated rollup tables refreshed on write
- **AI features** — Embedding pipeline backed by a vector index for semantic recall

## Acceptance Criteria
- Every resource exposes list, read, create and delete endpoints with schema validation.
- Invalid payloads are rejected with a 400 and a machine-readable issue list.
- The service reports liveness on `GET /health`.
- The repository builds, type-checks, lints and passes its test suite cleanly.
