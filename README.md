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
| **Frontend** | Next.js 15, TypeScript, Tailwind CSS, shadcn/ui |
| **API** | Fastify 5, TypeScript, Prisma, Zod |
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

The web app will be available at `http://localhost:3000`.

## Architecture

```
forgeone/
├── apps/
│   ├── web/              # Next.js frontend
│   ├── api/              # Fastify API server
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
