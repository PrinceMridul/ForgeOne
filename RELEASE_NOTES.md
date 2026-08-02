# Release Notes — Submission Hardening

**Scope:** `91fa554..HEAD` · 5 commits · 66 files · +2470 / −436

The product was already functional. This pass closed the gap between what
ForgeOne *is* and what a judge would find when they cloned it, deployed it, and
checked the claims — plus the one requirement the repository could not satisfy
at all.

---

## 1. Deployment: from "not deployable" to one public URL

**Why this mattered most.** The hackathon runs a pass/fail viability gate before
any scoring: the deployed link has to open and the core flow has to run. There
was no deployment path. The SSR build targeted a Cloudflare Worker (the
scaffolding tool's default preset) that Node cannot execute, and the browser
would have had to reach a second, cross-origin API.

**What changed**

| Change | Rationale |
|---|---|
| `apps/web/src/lib/api-proxy.ts` | Reverse-proxies `/api/*`, `/health`, `/docs`, `/demo/*` to Fastify. Reproduces the Vite dev proxy in production, so the browser is same-origin in both environments and `VITE_API_URL` stays empty. Bodies are streamed, not buffered, so `Repository.zip` downloads do not have to fit in memory. |
| `scripts/start-production.mjs` | Supervises both processes. Only the web server binds `$PORT`; the API binds loopback. Either child exiting takes the process down so the platform restarts rather than leaving a half-dead instance answering health checks. |
| `vite.config.ts` → `nitro: { preset: "node-server" }` | So `pnpm turbo build` produces something the runbook can actually start. |
| `render.yaml` | One-click Blueprint. No value has to be entered — API keys are declared `sync: false` and accept blank. |
| `Dockerfile` (root) | Same topology as a container, for Fly.io / Railway / Cloud Run / a VM. |
| `DEPLOYMENT.md` | Topology diagram, both paths, configuration table, operational limits. |
| `scripts/verify-deployment.mjs` | Post-deploy gate. Re-derives the claims instead of trusting them. |

**Two latent bugs this exposed**

- `packages/{logger,types,database}` pointed `main` at raw `.ts`. It only worked
  because Node happened to strip types after symlink resolution — a property
  that does not survive a container image where pnpm copies rather than links.
  They now point at their compiled `dist`, and turbo's `dev` task gained
  `dependsOn: ["^build"]` so a fresh clone still works from `pnpm turbo dev`.
- Event pacing was 240ms, making a run take **73s** while the README,
  `Demo_Script.md` and the deck all said ~40s — long enough to overrun the
  90-second narration. Now 130ms; measured 42.8s.

---

## 2. Every number on screen is now a measured one

The README claimed the live console, artifact explorer and repository views were
driven entirely by real run data, and that illustrative screens said so. Walking
the running application screen by screen, neither half held.

### Fabricated production metrics, removed

| Surface | Was | Now |
|---|---|---|
| Run console header | `TOKENS 12.5k`, `COST $0.10` — a static per-agent budget × a constant, with `// mock rate` in the source. Nothing meters tokens; the deterministic generator spends none. | Agents done/total, repository files, artifact count — the figures `repository-integrity.test.ts` already asserts against the download |
| Run console header | `MEMORY 1.80 GB` from `256 + (tick % 10) * 8` | removed |
| Agent cards | flat `30s` for every stage | span between each agent's first and last event |
| Landing page | "Seven AI engineers", "avg 4–12 min" | "Eight specialist agents", "~40s per run" |
| Landing run list | invented token count, hardcoded `main` branch, `00m 00s` for the seeded run | real elapsed time, or nothing when there is none |
| "Live thinking" | a hardcoded pool — *"Choosing Redpanda over Kafka"*, *"Terraform plan: 6 to add"* — playing during a hospital run | the run's own telemetry, e.g. *"Coverage gap: no spec yet for prescriptions, lab_results, medical_records"*, labelled by the event type it came from |
| `/repository` | connected to the seeded fixture, describing its 4 files as "the most recent run" while the console showed 19 | attaches to the newest run the API reports |
| `/code` | hardcoded two-line snippet behind the title "Live backend artifact preview" | one tab per file that exists, from the newest run |

### Console/backend drift, corrected

- **The Documentation agent was missing** from `AGENT_DEFS` and `PIPELINE_DEF`.
  The console drew seven stages for an eight-stage run and the eighth row
  rendered unlabelled.
- **`PIPELINE_DEF` now mirrors `STAGE_CONFIGS`** — the table that actually gates
  execution — using the real filenames the pipeline emits. It previously named
  `ADR-021.md`, `openapi.yaml`, `sast-report.json`, `coverage-report.html` and
  `deployment-v482.yaml`, none of which are ever produced, so the "artifact
  emitted" matching could never resolve.
- **Agent communication edges** were hand-listed, ran backwards in two places
  and omitted Documentation. They are now derived from `PIPELINE_DEF`: an edge
  exists exactly when one stage's output is another's declared input.
- **`PipelineFlow` and `AgentCommGraph`** labelled nodes from the seven-entry
  `mock-data` seed list rather than the live roster.

### Illustrative surfaces now say so

Per the project's own rule that non-measured screens carry a *Sample data* badge:

- `/agents` and `/activity` gained the badge they were missing — their token and
  memory figures are exactly the ones that cannot be measured.
- The architecture and dependency graphs claimed to be *"derived from
  repository"*. They are fixed reference diagrams, so they say that, and they
  are off the run page — leaving every panel there measured.

---

## 3. Codex usage, evidenced rather than asserted

Depth of agentic usage is 15% of the matrix and had no coverage: no `AGENTS.md`,
no Codex slide in a 13-slide deck, nothing in `SUBMISSION.md`.

- **`AGENTS.md`** — the operating contract Codex reads before editing. Commands
  that must pass, and six non-negotiables. Each cites the failure that produced
  it rather than stating a preference, which is what makes review findings
  durable instead of one-off patches.
- **`docs/CODEX_USAGE.md`** — the loop, with commit-level evidence. Of 20
  commits, 6 are `feat(…)` and **8 are `fix(…)`**, none a user bug report. The
  highest-value finding came from the review half: feeding a hostile provider
  response through ForgeOne's own pipeline produced an archive containing
  `../../../../etc/cron.d/backdoor` — Zip Slip, on the file a user extracts.
- **Deck slide 10, "Built with Codex"** — rebuilt from the Future Work slide's
  own shapes so typography and palette are identical.
- **`docs/presentation/16_Built_With_Codex.md`** — its markdown counterpart.

---

## 4. Submission compliance

- **`SUBMISSION.md`** opens with the four mandatory links and names the track
  (Theme 1, Agentic Coding — whose example ideas list *"multi-agent engineering
  teams"*), then closes with Use of Codex.
- **`PROJECT_DESCRIPTION.md`** is the content for the required Google Doc,
  pasteable with two bracketed URLs to fill.
- **`README.md`** states the track up front, documents the production build and
  the verification script.

---

## 5. Repository quality

- **`apps/web/README.md`** opened *"Welcome to your Lovable project"* and told
  the reader to run `npm i` in a pnpm monorepo where that does not work. It now
  documents the workspace.
- **`apps/web/AGENTS.md`** was a Lovable notice; it keeps the history-rewrite
  warning, which is real, and gains the app's actual rules.
- **`lovable-error-reporting.ts` → `runtime-error-reporting.ts`.** It is the
  app's only error-boundary sink and was named after one of its two outputs. It
  now also logs to the console, so a deployed instance is debuggable instead of
  silently swallowing boundary errors.
- **`SECURITY.md`** replaced an unreachable `security@forgeone.dev` with GitHub
  private vulnerability reporting, and states the threat model and the non-goals
  (no auth, no rate limiting, in-memory state).
- **`CONTRIBUTING.md`** dropped a "80% minimum coverage" claim that was never
  enforced anywhere.
- **`.env.example`** listed S3, Qdrant, JWT expiry and sandbox settings that
  nothing reads. It now lists what the code actually consults.
- **README directory tree** listed `infra/`, which does not exist.

### A lint gate that could not see dead code

`apps/web/eslint.config.js` set `@typescript-eslint/no-unused-vars` to `"off"`,
so `pnpm turbo lint` — the gate CI runs — was blind to unused imports. Turning it
back on immediately found two, one held alive by an explicit `void seedAgents;`
with a comment admitting it existed to keep the import used.

That exposed something worse: the pre-commit hook linted everything with the
**root** config while CI lints each workspace with **its own**, and the two load
different plugins. The same file could satisfy one and fail the other, in both
directions — a `react-hooks/exhaustive-deps` disable comment is required by one
and an unresolvable rule reference to the other. `lint-staged.config.js` now
routes each file to its own workspace's config, so passing the hook means
passing CI.

---

## 6. Demo assets

All sixteen screenshots predated the metric fixes and contradicted the
application — `04-product-manager.png` alone showed `TOKENS 12.5k`, `COST $0.10`,
`MEMORY 1.80 GB`, "1/7 active" and a Live thinking panel narrating *"Split epic
AUTH-12 into 4 sub-tasks"* during a hospital run.

Recaptured from one live run at the same 3200×2000, so the fifteen images
embedded in the deck drop in without reflowing a slide.
`scripts/capture-screenshots.mjs` is committed rather than run ad hoc: it polls
the API for the current stage instead of sleeping a fixed amount, so it stays
correct when `RUN_EVENT_PACING_MS` changes.

---

## Verification

Reproduce all of it:

```bash
pnpm install
pnpm turbo run lint type-check test:ci build
pnpm start &
node scripts/verify-deployment.mjs
```

| Gate | Result |
|---|---|
| `pnpm turbo lint` | 5/5 tasks — 0 errors, 8 warnings |
| `pnpm turbo type-check` | 8/8 tasks |
| `pnpm turbo test` | **118 tests across 10 files** |
| `pnpm turbo build` | 5/5 tasks |
| `node scripts/verify-deployment.mjs` | 7/7 checks, run completes in 42.9s |

**Cross-domain consistency**, one run each, asserting per run that the ZIP
central directory equals the count the UI shows, that all nine agent types emit,
and that every pipeline document `PIPELINE_DEF` names exists:

| Domain | Run | Agents | Artifacts | Repo files | Zip |
|---|---|---|---|---|---|
| Hospital | 44.9s | 8/8 | 29 | 19 | 19 |
| Chess | 44.8s | 8/8 | 29 | 19 | 19 |
| Research | 44.8s | 8/8 | 29 | 19 | 19 |
| Resume | 42.8s | 8/8 | 28 | 18 | 18 |
| E-commerce | 44.8s | 8/8 | 29 | 19 | 19 |
| Netflix | 44.8s | 8/8 | 29 | 19 | 19 |
| CRM | 42.8s | 8/8 | 28 | 18 | 18 |
| Analytics | 42.8s | 8/8 | 28 | 18 | 18 |

Distinct route surfaces: **8/8**.

---

## Known limitations, unchanged

These are stated in the README, `SUBMISSION.md` and the deck. None was
introduced by this pass; all are deliberate scope.

- **Run state is in memory.** A restart or a free-tier sleep invalidates
  existing run URLs; the console reports *run not found* rather than a generic
  error. Persistence via the existing Prisma package is the first roadmap item
  and retires four limitations at once.
- **Without an API key the Developer is a deterministic generator**, not a
  model. It derives a real, prompt-specific repository, and its telemetry says
  so during the run.
- **Domain profiles are curated.** Noun extraction from the prompt is generic;
  the canonical resources for ~19 known domains are authored knowledge.
- **Generated tests are contract tests.** They never open a database, so the
  emitted SQL and foreign keys are unexercised. The Tester reports this itself.
- **No authentication or rate limiting.** Every endpoint on a deployed instance
  is open.
- **`apps/agent-runtime` (Python), `packages/database` (Prisma) and the
  Redis/Qdrant services** are scaffolded and not wired into the execution path.
  They are retained because they document the intended direction, and every
  document that mentions them says they do not run.
- **Some workspace screens remain illustrative** — `/dashboard`, `/agents`,
  `/activity`, `/settings`, `/terminal`, `/projects/:slug`. All now carry the
  *Sample data* badge. The run console, artifact explorer, repository views and
  build-verification panel are measured.
- **The web app has no unit tests.** The 118 tests cover the API and
  orchestrator. UI correctness is verified end to end by
  `scripts/verify-deployment.mjs` and the cross-domain harness rather than by
  component tests.

## Remaining manual steps

Two items cannot be produced from this repository:

1. **Deploy** — `render.yaml` makes it one click; see `DEPLOYMENT.md`.
2. **Record the ≤3-minute demo video** — narration in `Demo_Script.md`.

Both are tracked in `FINAL_CHECKLIST.md`.
