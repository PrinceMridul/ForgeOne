# ForgeOne — Hackathon Submission

**ChatGPT Codex Hackathon 2026 · Track 1 — Agentic Coding**

## Mandatory links

| Requirement | Link |
|---|---|
| **Deployed application** | _paste the URL from your Render/Docker deploy — see [DEPLOYMENT.md](DEPLOYMENT.md)_ |
| **GitHub repository** | https://github.com/PrinceMridul/ForgeOne |
| **Demo video (≤3 min)** | _paste the unlisted video URL_ |
| **Project description doc** | Paste [PROJECT_DESCRIPTION.md](PROJECT_DESCRIPTION.md) into a Google Doc, share "anyone with the link" |

> The deployed link and the video are the only two items that cannot be produced
> from this repository alone. Everything else is committed here.

## Track and problem statement

**Track 1 — Agentic Coding.** The track's own example ideas list *"multi-agent
engineering teams"*; ForgeOne is exactly that, and additionally covers three
other named ideas in the same list — auto-docs agents, test-coverage agents and
security-review agents — as stages of one pipeline.

**Problem.** AI coding tools return a file. Software is built by a team
following a process, and the process is where the quality comes from: someone
writes the spec, someone designs the schema, someone reviews the diff, someone
asks what happens when the input is hostile. Skipping that is why generated
code is hard to trust. ForgeOne runs the process and streams it, so you can
judge the reasoning rather than only the output.

## Project Name

**ForgeOne** — Your Autonomous Software Engineering Team

## One-line Pitch

Describe a software idea in one sentence and watch eight specialist AI agents plan, architect, build, review, test, audit and document it — then download the repository they produced.

## Short Description

ForgeOne is a multi-agent platform that turns a one-line product idea into a working repository. Eight agents execute in dependency order — no stage begins until the artifacts it requires exist — and the whole process streams live so you see the reasoning, not just the result. Every figure on screen is measured from real run data, and model output is validated before it can reach the archive you download.

## Long Description

Most AI coding tools return a file. Software is built by a team following a process: specification, architecture, implementation, review, testing, security, deployment, documentation. ForgeOne runs that process.

**Understanding the prompt.** Resource nouns are extracted from what you typed — this works for domains nobody anticipated. In parallel, the prompt is scored against 19 domain profiles. Nouns you stated always win; the domain supplies what the sentence implies but omits. "Build a Chess Platform" contains no nouns worth modelling, yet yields `players, games, moves, ratings, tournaments, puzzles`.

**A shared blueprint.** The Product Manager writes one project model — resources, typed fields, relationships, cross-cutting capabilities — into `SharedContext`. Every downstream agent reads the same model, which is why the PRD, the architecture document and the generated code describe the same system rather than three different ones.

**Real output.** The Developer emits one Zod-validated route module per resource, a SQL schema with genuine foreign keys, cascading deletes and an index on every key, plus config, Dockerfile, tests and README. Tables are emitted parent-first so references resolve.

**Verification, not assertion.** Reviewer, Tester, Security, DevOps and Documentation read the files that were actually produced. The Reviewer's checks execute against real code. The Tester reports its own coverage gaps. The Security agent reports genuine findings — an unauthenticated CRUD service is not "zero vulnerabilities".

**Untrusted by default.** Feeding a malformed model response through the pipeline once produced an archive containing `../../../../etc/cron.d/backdoor`. That is Zip Slip on the file a user extracts. A single guard now normalises every path, rejects traversal, absolute paths, reserved names and duplicates, enforces size budgets, and falls back to the deterministic generator when too little survives.

## Key Features

- **Eight-agent pipeline**, dependency-gated by artifact type
- **Semantic domain modelling** — noun extraction plus 19 scored domain profiles
- **Relational code generation** — foreign keys, cascades, indexes, parent-first ordering
- **Live streaming console** — pipeline flow, agent states, logs, thinking timeline, graphs
- **Downloadable `Repository.zip`** whose entry count always equals the UI count
- **Provider safety layer** — traversal, absolute paths, duplicates, oversized files rejected
- **Capability-driven security audit** with severity ranking
- **Build verification panel** driven entirely by measured repository facts
- **Honest labelling** — illustrative screens are marked *Sample data*

## Technology Stack

**Running during a demo**

| Layer | Technology |
|---|---|
| Frontend | TanStack Start (React 19), Vite, TypeScript, Tailwind v4, shadcn/ui |
| API & Orchestrator | Fastify 5, TypeScript, Zod |
| Agents | TypeScript, `apps/api/src/orchestrator` |
| Run state | In-process — no external services required |
| Providers | Anthropic / OpenAI / Gemini, deterministic fallback |
| Tooling | pnpm workspaces, Turborepo, Vitest, ESLint, Prettier |

**Scaffolded, not wired** — Python agent-runtime, Prisma/PostgreSQL, Redis, Qdrant. Documented as such.

## AI Usage

**With an API key** — the Product Manager asks the model for the domain resources; the Developer asks for the codebase. Every response is validated before use.

**Without a key** — a deterministic generator derives a real, prompt-specific repository, and the agent says so in its telemetry during the run.

**The model is never trusted blindly.** Resource lists are parsed, filtered and capped. File paths are normalised; traversal and absolute paths rejected. Duplicates, oversized files and reserved names are dropped. If too little survives validation, the pipeline falls back rather than shipping a partial repository.

## GitHub

https://github.com/PrinceMridul/ForgeOne

```bash
pnpm install
pnpm turbo dev      # web :8080 · api :4000
```

No `.env` required — every setting has a working default.

## Deployment

One service, one public URL. The TanStack Start SSR server binds `$PORT` and
reverse-proxies `/api/*` to the Fastify API on loopback, so the browser is
same-origin in production exactly as it is in development — no CORS surface, no
second cold start on the first click of a demo.

```bash
pnpm turbo build && pnpm start          # → http://localhost:8080
node scripts/verify-deployment.mjs      # asserts the claims end to end
```

[`render.yaml`](render.yaml) deploys it in one click with nothing entered; the
root [`Dockerfile`](Dockerfile) builds the same topology for any container host.
Runbook: [DEPLOYMENT.md](DEPLOYMENT.md).

## Demo Flow

1. Open `http://localhost:8080`
2. Type: *"Build a Hospital Management system with patients, doctors, appointments, prescriptions and lab results."*
3. Click **Dispatch Engineering Team**
4. Watch the Product Manager derive 6 resources and 4 relationships
5. Watch the Developer emit `patients.ts`, `prescriptions.ts`, `lab_results.ts`, `schema.sql`
6. Open **SecurityAudit.md** — a real HIGH finding
7. Watch **Build Verification** run against the generated repo
8. Click **Download Repository.zip** — 19 entries, matching the UI exactly

Full narration in [`Demo_Script.md`](Demo_Script.md).

## Known Limitations

- **Run state is in memory.** Restarting the API invalidates existing run URLs; the console reports *run not found* rather than a generic error.
- **Without an API key the Developer is a deterministic generator**, not a model. It produces a real prompt-specific repository, and says so during the run.
- **Domain profiles are curated.** Noun extraction is generic; the canonical resources for ~19 domains are authored knowledge.
- **Generated tests are contract tests.** They never open a database, so the emitted SQL and foreign keys are unexercised. The Tester reports this.
- **Some workspace screens are illustrative** and are labelled *Sample data* in the UI. The live console, artifact explorer and repository views are entirely real.

## Future Work

1. **Persistence** — SQLite via the existing Prisma package. Runs survive restarts, run URLs become shareable. Retires four limitations in one change.
2. **Integration tests in generated repos** — ephemeral Postgres exercising the emitted SQL.
3. **Learned domain modelling** — model-derived resources as the default, deterministic generator as fallback.
4. **Wire the Python agent-runtime** for sandboxed execution of generated code.
5. **Stream over WebSockets** — `socket.io` is already a dependency.

## Verification

| Gate | Result |
|---|---|
| `pnpm turbo lint` | 5/5 tasks — 0 errors |
| `pnpm turbo type-check` | 8/8 tasks |
| `pnpm turbo test` | 120 tests, 10 files |
| `pnpm turbo build` | 5/5 tasks |
| `node scripts/verify-deployment.mjs` | 7/7 checks against a running instance |

Validated across 10 domains: distinct route surfaces 10/10, zip integrity 6/6, cross-agent citation errors 0, ForgeOne self-references in generated artifacts 0.

## Use of Codex

Depth of agentic usage is 15% of the judging matrix, so it is evidenced rather
than asserted: [**docs/CODEX_USAGE.md**](docs/CODEX_USAGE.md) cites commits,
files and runnable commands.

The short version — each unit of work was a full loop (plan → implement →
review against the running product → fix → verify), and the loop is legible in
the history: of 20 commits, 6 are `feat(...)` and **8 are `fix(...)`**, none of
which is a user bug report. The most valuable finding came from the review half
of the loop, not the build half: feeding a deliberately hostile provider
response through ForgeOne's own pipeline produced an archive containing
`../../../../etc/cron.d/backdoor`. Findings then became durable constraints in
[`AGENTS.md`](AGENTS.md) rather than one-off patches, so the next iteration
cannot regress.
