<div align="center">

# 🔨 ForgeOne

**Your Autonomous Software Engineering Team**

[![CI](https://github.com/forgeone/forgeone/actions/workflows/ci.yml/badge.svg)](https://github.com/forgeone/forgeone/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.12+-yellow)](https://python.org)

*An AI-native engineering workspace where autonomous software engineering agents collaborate to transform ideas and repositories into production-ready software.*

[Getting Started](#getting-started) · [Architecture](#architecture) · [Documentation](docs/) · [Contributing](CONTRIBUTING.md)

</div>

---

## Overview

ForgeOne is a multi-agent AI platform that orchestrates specialized software engineering agents to handle the complete software development lifecycle — from product specification to deployment.

### Agent Team

| Agent | Role |
|---|---|
| 🎯 **Orchestrator** | Decomposes tasks, coordinates agents, manages workflow state |
| 📋 **Product Manager** | Translates ideas into specs, writes user stories |
| 🏗️ **Architect** | Designs systems, selects technologies, defines APIs |
| 💻 **Developer** | Writes, refactors, and modifies code |
| 🔍 **Reviewer** | Reviews code quality, enforces best practices |
| 🧪 **Tester** | Generates tests, analyzes coverage, detects regressions |
| 🔒 **Security** | Audits vulnerabilities, scans dependencies |
| 🚀 **DevOps** | Manages CI/CD, infrastructure, monitoring |

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | TanStack Start (React 19), Vite, TypeScript, Tailwind CSS v4, shadcn/ui |
| **API** | Fastify 5, TypeScript, Zod, Prisma |
| **Agent Runtime** | Python 3.12+, FastAPI, LangGraph |
| **Database** | PostgreSQL 16, Redis 7, Qdrant |
| **Infrastructure** | Docker, Kubernetes, Terraform |

## Getting Started

### Prerequisites

- Node.js 22.x LTS
- Python 3.12+
- pnpm 9.x (`corepack enable`)
- Docker & Docker Compose
- uv (Python package manager)

### Quick Start

```bash
git clone https://github.com/forgeone/forgeone.git
cd forgeone
make setup
make infra
make dev
```

The web app runs at `http://localhost:8080` and the API at `http://localhost:4000`.
In development the Vite dev server proxies `/api/v1` and `/health` to the API,
so the browser stays same-origin and no CORS preflight is involved.

### Live execution pacing

The orchestration pipeline is deterministic and CPU-only — all eight agents
resolve in roughly 8ms, faster than the console can poll. Pacing meters how
quickly already-computed telemetry is released so a run streams agent by agent
over ~40 seconds. Work itself is never slowed; only event emission is metered.

| Variable | Default | Effect |
|---|---|---|
| `RUN_EVENT_PACING_MS` | `240` | Delay between telemetry events within a stage |
| `RUN_STAGE_PACING_MS` | `900` | Settle time between agents |
| `RUN_PACING` | *(unset)* | Set to `off` to restore instant completion |

Pacing is disabled automatically under `NODE_ENV=test`.

## Architecture

```
forgeone/
├── apps/
│   ├── web/              # TanStack Start frontend (live execution console)
│   ├── api/              # Fastify API server + agent orchestrator
│   └── agent-runtime/    # Python agent system
├── packages/
│   ├── config/           # Shared ESLint & TypeScript configs
│   ├── database/         # Prisma schema & client
│   ├── types/            # Shared TypeScript types
│   └── logger/           # Shared logging
├── prompts/              # Agent system prompts & templates
├── infra/                # Docker, Kubernetes, Terraform
├── docs/                 # Architecture & guides
└── scripts/              # Developer tooling
```

See [docs/architecture/overview.md](docs/architecture/overview.md) for full documentation.

## Development

```bash
make dev          # Start all dev servers
make test         # Run all tests
make lint         # Lint all packages
make type-check   # Type-check all packages
make build        # Build all packages
make clean        # Clean all build artifacts
```

## License

MIT License — see [LICENSE](LICENSE).
