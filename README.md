<div align="center">

# 🔨 ForgeOne

**Your Autonomous Software Engineering Team**

[![CI](https://github.com/PrinceMridul/ForgeOne/actions/workflows/ci.yml/badge.svg)](https://github.com/PrinceMridul/ForgeOne/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-22%2B-brightgreen)](https://nodejs.org)
[![Tests](https://img.shields.io/badge/tests-118%20passing-brightgreen)](#verification)

*Describe a software idea. Watch eight specialist agents plan, architect, build,
review, test, audit and document it — then download the repository they produced.*

[Demo](#demo) · [Quick Start](#quick-start) · [Agent Team](#agent-team) · [Architecture](#architecture) · [Verification](#verification) · [Limitations](#limitations)

</div>

---

## Demo

Type an idea and press **Dispatch Engineering Team**. Over roughly forty
seconds you watch a dependency-gated pipeline run:

```
"Build a Hospital Management system"
        ↓
Product Manager   recognised the brief as a healthcare product
                  identified 6 core resources
                  (patients, doctors, appointments, medical_records,
                   prescriptions, lab_results)
                  mapped 4 relationships: appointment → patient, …
        ↓
Architect         entities, ER sketch, data flow, storage, deployment topology
        ↓
Developer         19 files — routes, Zod schemas, SQL with foreign keys,
                  config, Dockerfile, tests → Repository.zip
        ↓
Reviewer          5/5 checks against the files that were actually emitted
Tester            9 tests across 3 specs, names the resources still uncovered
Security          1 high, 2 medium, 2 low — findings driven by real capabilities
DevOps            compose topology, environment, rollout order
Documentation     project overview + execution summary
```

Different prompts produce genuinely different systems. Validated across ten
domains — chess yields `players / games / moves / ratings / tournaments`,
commerce yields `products / orders / customers / payments`, research yields
`papers / datasets / experiments / benchmarks`.

Everything on screen is measured. The repository file count equals the number
of entries in the downloaded archive; the test count is parsed from the specs
that were generated; the digest is derived from the content.

## Overview

ForgeOne is a multi-agent platform that turns a one-line product idea into a
working repository, streaming the whole process so you can see how the decision
was reached rather than only the result.

### Agent Team

Eight stages run in dependency order. Each consumes the artifacts of the stages
before it, and no stage starts until the artifact types it declares as inputs
exist.

| Agent | Role | Produces |
|---|---|---|
| 🎯 **Orchestrator** | Drives the pipeline and emits state telemetry | execution events |
| 📋 **Product Manager** | Infers the domain model from the prompt | `PRD.md`, `Tasks.json` |
| 🏗️ **Architect** | Entities, relationships, topology, storage | `Architecture.md` |
| 💻 **Developer** | Generates and validates the repository | source files, `Repository.zip` |
| 🔍 **Reviewer** | Runs checks against the emitted files | `PRReview.md` |
| 🧪 **Tester** | Reports on the generated specs and coverage gaps | `TestReport.md` |
| 🔒 **Security** | Capability-driven audit with severity ranking | `SecurityAudit.md` |
| 🚀 **DevOps** | Compose topology, environment, rollout order | `DeploymentPlan.md` |
| 📚 **Documentation** | Indexes the run and its outputs | `ProjectOverview.md`, `SummaryReport.md` |

## Tech Stack

What actually executes during a run:

| Layer | Technology |
|---|---|
| **Frontend** | TanStack Start (React 19), Vite, TypeScript, Tailwind CSS v4, shadcn/ui |
| **API & Orchestrator** | Fastify 5, TypeScript, Zod |
| **Agents** | TypeScript, in `apps/api/src/orchestrator` |
| **Run state** | In-process — no external services required |
| **LLM providers** | Anthropic / OpenAI / Gemini, with a deterministic fallback |

Scaffolded but **not** wired into the execution path: `apps/agent-runtime`
(Python/FastAPI), Prisma and PostgreSQL in `packages/database`, and the
Redis/Qdrant services in `docker-compose.yml`. They are present for the
roadmap below, not used by the demo — see [Limitations](#limitations).

## Getting Started

### Prerequisites

- Node.js 22.x LTS (or newer)
- pnpm 9.x (`corepack enable`)

That is the complete list. The demo holds run state in memory and needs no
database, broker or container runtime to start.

### Quick Start

```bash
pnpm install
pnpm turbo dev
```

The web app runs at `http://localhost:8080` and the API at `http://localhost:4000`.
In development the Vite dev server proxies `/api/v1` and `/health` to the API,
so the browser stays same-origin and no CORS preflight is involved.

Open the web app, type a product idea, and press **Dispatch Engineering Team**.

No `.env` is required — `apps/api/src/config.ts` supplies a working default for
every setting. Set an LLM API key (see below) to have the Developer agent call
a real model instead of the deterministic generator.

<details>
<summary>Optional components (not needed to run the demo)</summary>

`docker-compose.yml` provisions PostgreSQL, Redis and Qdrant, and
`apps/agent-runtime` is a Python service. Neither is wired into the current
execution pipeline — the orchestrator and its agents are TypeScript inside
`apps/api`, and all run state is in memory. `make infra` and `make db-migrate`
exist for that future work; running them is not a prerequisite and the
Prisma migrations directory is still empty.

</details>

### Using a real model

Without an API key the Developer agent renders a deterministic scaffold derived
from the prompt, and says so in its telemetry. With one configured, it asks the
provider for the codebase and validates the response before anything reaches
`Repository.zip`.

```bash
export ANTHROPIC_API_KEY=...    # or OPENAI_API_KEY / GEMINI_API_KEY
pnpm turbo dev
```

Provider output is treated as untrusted: paths are normalised, traversal and
absolute paths are rejected, duplicates and oversized files are dropped, and if
too little survives validation the pipeline falls back to the deterministic
scaffold rather than emitting a partial repository.

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
│   ├── web/              # TanStack Start frontend (live execution console)   [active]
│   ├── api/              # Fastify server + agent orchestrator                [active]
│   └── agent-runtime/    # Python agent system                                [not wired]
├── packages/
│   ├── config/           # Shared ESLint & TypeScript configs                 [active]
│   ├── types/            # Shared TypeScript types                            [active]
│   ├── logger/           # Shared logging                                     [active]
│   └── database/         # Prisma schema & client                             [not wired]
├── prompts/              # Agent system prompt templates                      [not wired]
├── infra/                # Docker compose assets                              [optional]
├── docs/                 # Architecture & guides
└── scripts/              # Developer tooling
```

The orchestrator lives in `apps/api/src/orchestrator`:

| File | Responsibility |
|---|---|
| `domain.ts` | Extracts resource nouns from the prompt; scores domain profiles |
| `blueprint.ts` | Builds the shared project model: entities, relations, capabilities |
| `scaffold.ts` | Renders the blueprint into a repository |
| `repository-guard.ts` | Validates untrusted provider output before it reaches the archive |
| `pipeline.ts` | Dependency-gated stage execution and telemetry |
| `agents/` | The eight stage implementations |

## Limitations

Stated plainly, because a demo that overclaims is worse than one that doesn't.

- **Run state is in memory.** Restarting the API invalidates existing run URLs;
  the console reports this as *run not found* rather than a generic error.
- **Without an API key the Developer is a deterministic generator**, not a
  model. It derives a real, prompt-specific repository — but it is a template
  engine, and the agent's telemetry says so during the run.
- **Domain profiles are curated.** Noun extraction from the prompt is generic;
  the canonical resources for ~19 known domains are authored knowledge. An
  unrecognised domain falls back to whatever the prompt states outright.
- **Generated tests are contract tests.** They never open a database, so the
  emitted SQL and foreign keys are unexercised. The Tester reports this.
- **Some workspace screens are illustrative** and are labelled *Sample data*
  in the UI. The live run console, artifact explorer and repository views are
  driven entirely by real run data.

See [docs/architecture/overview.md](docs/architecture/overview.md) for full documentation.

## Development

```bash
pnpm turbo dev          # Start web (:8080) and API (:4000)
pnpm turbo test         # Run all tests
pnpm turbo lint         # Lint all packages
pnpm turbo type-check   # Type-check all packages
pnpm turbo build        # Build all packages
```

Equivalent `make` targets exist in the [Makefile](Makefile) for Unix shells.

## Verification

Current state of the pipeline on `main`:

| Gate | Result |
|---|---|
| `pnpm turbo lint` | 5/5 tasks — 0 errors |
| `pnpm turbo type-check` | 8/8 tasks |
| `pnpm turbo test` | 118 tests across 10 files |
| `pnpm turbo build` | 5/5 tasks |

Beyond the unit suite, two properties are asserted end to end against the
running server:

- **Archive integrity** — the entries inside `Repository.zip` are exactly the
  artifacts flagged `inRepository`, so the number shown in the console always
  equals what you download.
- **Provider safety** — model output is untrusted. Feeding a hostile response
  through the pipeline (`../../../../etc/cron.d/backdoor`, absolute Windows
  paths, duplicate entries) yields an archive containing only the safe entry.
  Traversal, absolute paths, reserved device names, duplicates and oversized
  files are rejected, and the run falls back to the deterministic generator if
  too little survives validation.

## Submission Package

| Document | Contents |
|---|---|
| [SUBMISSION.md](SUBMISSION.md) | Pitch, features, stack, AI usage, limitations |
| [Demo_Script.md](Demo_Script.md) | 30s / 90s / 3-minute narration, click order, expected outputs |
| [docs/presentation/](docs/presentation/) | 15 slide-by-slide markdown files |
| [docs/presentation/images/](docs/presentation/images/) | 16 screenshots from one real run |
| `ForgeOne_Hackathon_Presentation.pptx` | 13-slide deck, dark theme |

## Credits

Built for the **ChatGPT Codex Hackathon 2026**.

Frontend scaffolded with [Lovable](https://lovable.dev) on TanStack Start;
orchestrator, agents and repository generator written for this project.
UI primitives from [shadcn/ui](https://ui.shadcn.com), icons by
[Lucide](https://lucide.dev).

## License

MIT License — see [LICENSE](LICENSE).
