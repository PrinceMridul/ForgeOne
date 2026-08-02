# ForgeOne — Project Description

> **This file is the content for the mandatory Project Description Google Doc.**
> Paste it into a new Google Doc, set sharing to *Anyone with the link — Viewer*,
> and submit that link. Fill in the two bracketed placeholders first.

---

## Project

**ForgeOne — Your Autonomous Software Engineering Team**

Describe a software idea in one sentence. Eight specialist agents plan,
architect, build, review, test, audit and document it, streaming the whole
process live — then you download the repository they produced.

| | |
|---|---|
| **Track** | Theme 1 — Agentic Coding |
| **Deployed application** | `[PASTE DEPLOYED URL]` |
| **GitHub repository** | https://github.com/PrinceMridul/ForgeOne |
| **Demo video** | `[PASTE VIDEO URL]` |
| **Licence** | MIT |

---

## Track and why this project fits it

**Theme 1 — Agentic Coding: "agents that write, refactor, test and ship code."**

The track's own list of example ideas names *multi-agent engineering teams*.
ForgeOne is that, and it subsumes three further ideas from the same list as
stages of one pipeline: **auto-docs agents** (the Documentation stage),
**test-coverage agents** (the Tester stage, which reports its own gaps), and
**security-review agents** (the Security stage, which ranks capability-driven
findings by severity).

---

## Problem statement

AI coding tools return a file.

Software is not built by producing a file — it is built by a team following a
process, and the process is where the trustworthiness comes from. Someone
writes the specification. Someone designs the schema and decides what the
foreign keys are. Someone reviews the diff. Someone asks what happens when the
input is hostile. Someone writes down how it deploys.

Skipping that process is the reason generated code is hard to trust: you get
output with no reasoning attached, no review, no security pass, and no way to
audit the decision when it turns out to be wrong.

A second, quieter problem: **demos overclaim.** Progress bars that are timers.
Test counts that are constants. Reports about files that were never generated.
That erodes trust in the whole category.

ForgeOne addresses both. It runs the engineering process rather than skipping
it, streams every stage so the reasoning is visible, and measures every number
it shows — with tests that fail if a displayed figure and the artifact it
describes ever disagree.

---

## What it does

Type a one-line idea and press **Dispatch Engineering Team**. Over roughly
42 seconds a dependency-gated pipeline runs, agent by agent:

| Agent | Role | Produces |
|---|---|---|
| Orchestrator | Drives the pipeline, emits state telemetry | execution events |
| Product Manager | Infers the domain model from the prompt | `PRD.md`, `Tasks.json` |
| Architect | Entities, relationships, topology, storage | `Architecture.md` |
| Developer | Generates and validates the repository | source files, `Repository.zip` |
| Reviewer | Runs checks against the emitted files | `PRReview.md` |
| Tester | Reports on the generated specs and coverage gaps | `TestReport.md` |
| Security | Capability-driven audit with severity ranking | `SecurityAudit.md` |
| DevOps | Compose topology, environment, rollout order | `DeploymentPlan.md` |
| Documentation | Indexes the run and its outputs | `ProjectOverview.md`, `SummaryReport.md` |

No stage starts until the artifact **types** it declares as inputs exist. That
is enforced by the runtime, not by ordering the calls.

### A concrete run

Prompt: *"Build a Hospital Management system with patients, doctors,
appointments, prescriptions and lab results."*

- Product Manager recognises a healthcare product, derives **6 resources**
  (`patients`, `doctors`, `appointments`, `medical_records`, `prescriptions`,
  `lab_results`) and maps **4 relationships**
- Developer emits **19 repository files** — one Zod-validated route module per
  resource, a SQL schema with real foreign keys, cascading deletes and an index
  on every key, tables ordered parent-first so references resolve, plus config,
  Dockerfile, tests and README
- Reviewer, Tester, Security, DevOps and Documentation each read the files that
  were **actually** produced
- **29 pipeline artifacts**, **19 of them in the repository**, and the
  downloaded `Repository.zip` contains exactly 19 entries

Different prompts produce genuinely different systems — validated across ten
domains. Chess yields `players / games / moves / ratings / tournaments`;
commerce yields `products / orders / customers / payments`; research yields
`papers / datasets / experiments / benchmarks`.

---

## Technical stack

**Running during a demo**

| Layer | Technology |
|---|---|
| Frontend | TanStack Start (React 19), Vite, TypeScript, Tailwind CSS v4, shadcn/ui |
| API & Orchestrator | Fastify 5, TypeScript, Zod |
| Agents | TypeScript, `apps/api/src/orchestrator` |
| Run state | In-process — no external services required |
| Model providers | Anthropic / OpenAI / Gemini, with a deterministic fallback |
| Tooling | pnpm workspaces, Turborepo, Vitest, ESLint, Prettier, Husky |
| Deployment | Single Node service — Render blueprint or Docker |
| CI | GitHub Actions — lint, type-check, test, build, CodeQL, dependency review |

**Scaffolded but not wired into the execution path,** and documented as such: a
Python `agent-runtime`, Prisma/PostgreSQL in `packages/database`, and the
Redis/Qdrant services in `docker-compose.yml`.

### Architecture

One public URL, one service:

```
browser ──▶ TanStack Start SSR server ($PORT)
                │
                ├─ /                → React app, server-rendered
                └─ /api/* /health   → reverse proxy ──▶ Fastify API (loopback)
                                                              │
                                                        Orchestrator
                                       domain.ts     noun extraction + domain scoring
                                       blueprint.ts  entities, relations, capabilities
                                       scaffold.ts   blueprint → repository
                                       guard.ts      validates untrusted output
                                       pipeline.ts   dependency-gated stages
```

The browser is same-origin in development (Vite proxy) and in production (SSR
proxy), so there is no CORS surface and no second cold start.

---

## How Codex was used

Each unit of work was a full agentic loop, not a completion:

```
brief → plan → implement → review against the running product → fix → verify
   ▲                                                                │
   └──────────────── findings feed the next brief ──────────────────┘
```

The loop is legible in the git history, which was never squashed away. Of 20
commits, 6 are `feat(...)` and **8 are `fix(...)`** — and none of the eight is a
user bug report. Each repairs something the review step found in work the build
step had just produced.

**The highest-value finding came from the review half of the loop.** The review
step fed a deliberately hostile model response through ForgeOne's own pipeline
and inspected the archive that came out. It contained
`../../../../etc/cron.d/backdoor` and an absolute Windows system path — Zip
Slip, on the exact file a user downloads and extracts. A generation-only
workflow ships that. The fix is a single choke point (`repository-guard.ts`)
covered by 37 assertions, with the zip writer re-validating independently.

Findings then became **durable constraints** rather than one-off patches:
`AGENTS.md` encodes each one as a rule a future agent must honour, so the next
iteration cannot regress on it.

Full evidence, with commit hashes and runnable commands:
`docs/CODEX_USAGE.md` in the repository.

---

## Verification

Nothing in this document is estimated.

| Gate | Result |
|---|---|
| `pnpm turbo lint` | 5/5 tasks — 0 errors |
| `pnpm turbo type-check` | 8/8 tasks |
| `pnpm turbo test` | 120 tests across 10 files |
| `pnpm turbo build` | 5/5 tasks |
| `node scripts/verify-deployment.mjs` | 7/7 checks against a running instance |

Two properties are asserted end to end rather than unit-tested:

- **Archive integrity** — the entries inside `Repository.zip` are exactly the
  artifacts flagged `inRepository`, so the number on screen always equals what
  you download. The verification script re-counts real ZIP central-directory
  headers rather than trusting the writer.
- **Provider safety** — model output is untrusted. Feeding a hostile response
  through the pipeline yields an archive containing only the safe entry.
  Traversal, absolute paths, reserved device names, duplicates and oversized
  files are rejected, and the run falls back to the deterministic generator if
  too little survives validation.

Cross-agent integrity, across ten domains: distinct route surfaces 10/10, zip
integrity 6/6, reports citing files that do not exist 0, ForgeOne
self-references leaking into a user's generated repository 0.

---

## Running it locally

```bash
pnpm install
pnpm turbo dev          # web :8080 · api :4000
```

Node 22+ and pnpm 9 are the only prerequisites. No database, broker or container
runtime, and no `.env` — every setting has a working default. Setting
`OPENAI_API_KEY`, `ANTHROPIC_API_KEY` or `GEMINI_API_KEY` makes the Product
Manager and Developer call a real model instead of the deterministic generator.

---

## Known limitations

Stated plainly, because a demo that overclaims is worse than one that doesn't.

- **Run state is in memory.** Restarting the service invalidates existing run
  URLs; the console reports *run not found* rather than a generic error.
- **Without an API key the Developer is a deterministic generator**, not a
  model. It derives a real, prompt-specific repository — but it is a template
  engine, and the agent's telemetry says so during the run.
- **Domain profiles are curated.** Noun extraction from the prompt is generic;
  the canonical resources for ~19 known domains are authored knowledge.
- **Generated tests are contract tests.** They never open a database, so the
  emitted SQL and foreign keys are unexercised. The Tester reports this.
- **Some workspace screens are illustrative** and are labelled *Sample data* in
  the UI. The live run console, artifact explorer and repository views are
  driven entirely by real run data.
- **No authentication or rate limiting.** Every endpoint on a deployed instance
  is open. This is a demo, and `SECURITY.md` says so.

---

## What is next

1. **Persistence** — SQLite via the existing Prisma package. Runs survive
   restarts and run URLs become shareable. Retires four limitations in one change.
2. **Integration tests inside generated repos** — ephemeral Postgres exercising
   the emitted SQL and foreign keys.
3. **Learned domain modelling as the default path**, with the deterministic
   generator kept as the offline fallback.
4. **Wire the Python agent-runtime** for sandboxed execution of generated code.

Not doing: Kubernetes, Terraform, production infrastructure.

---

## Attribution

The initial frontend route skeleton and the shadcn/ui primitives were scaffolded
with Lovable on TanStack Start. The orchestrator, all eight agents, the domain
model, the blueprint, the repository generator, the provider safety layer, the
deployment topology and the entire test suite were written for this project.

MIT licensed.
