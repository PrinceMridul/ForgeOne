# AGENTS.md — operating instructions for coding agents

This file is read by OpenAI Codex (and other agents that honour `AGENTS.md`)
before it touches this repository. It is the same contract a new human
contributor would be given.

ForgeOne is itself a multi-agent engineering system, so there are two agent
layers in play — keep them straight:

| Layer | What it means |
|---|---|
| **Codex working *on* ForgeOne** | You. Editing this repository. Governed by this file. |
| **ForgeOne's own eight agents** | The pipeline in `apps/api/src/orchestrator/agents/`. Product code. |

---

## Project shape

```
apps/web/      TanStack Start (React 19) — the live execution console
apps/api/      Fastify 5 — HTTP surface + the agent orchestrator
packages/      Shared config, types, logger, Prisma schema
scripts/       Production supervisor and deployment verification
docs/          Architecture notes, decision records, presentation
```

The orchestrator is the heart of the product:

| File | Responsibility |
|---|---|
| `orchestrator/domain.ts` | Extracts resource nouns from the prompt; scores domain profiles |
| `orchestrator/blueprint.ts` | Builds the shared project model: entities, relations, capabilities |
| `orchestrator/scaffold.ts` | Renders the blueprint into a repository |
| `orchestrator/repository-guard.ts` | Validates untrusted provider output before it reaches the archive |
| `orchestrator/pipeline.ts` | Dependency-gated stage execution and telemetry |
| `orchestrator/agents/*.ts` | The eight stage implementations |

---

## Commands

```bash
pnpm install
pnpm turbo dev          # web :8080 · api :4000
pnpm turbo lint         # must be 0 errors
pnpm turbo type-check
pnpm turbo test         # 118 tests across 10 files
pnpm turbo build

pnpm start                             # production supervisor on :8080
node scripts/verify-deployment.mjs     # end-to-end assertions against a URL
```

Node 22+ and pnpm 9 are the only prerequisites. No database, broker or
container runtime is needed — run state is in memory and every setting has a
working default.

**Before declaring any change done, run lint, type-check and test.** They are
fast (~30s together). A change that has not been through them is not finished.

---

## Non-negotiables

These exist because breaking them has already cost this project a bug.

1. **Never let a number on screen mean two things.** Every figure in the UI is
   derived from run data. "Repository files" and "pipeline artifacts" are
   different counts and must never be conflated. If you add a metric, derive it;
   do not assert it.

2. **Model output is untrusted input.** Anything a provider returns passes
   through `repository-guard.ts` before it can reach `Repository.zip`. Path
   traversal, absolute paths, reserved device names, duplicates and oversized
   files are rejected, and the pipeline falls back to the deterministic
   generator rather than emitting a partial repository. Do not add a second
   path into the archive that bypasses this.

3. **Do not overclaim in the UI or the docs.** Illustrative screens are labelled
   *Sample data*. The Tester reports its own coverage gaps. The Security agent
   reports genuine findings — "zero vulnerabilities" on an unauthenticated CRUD
   service is a lie the code must never tell.

4. **Generated repositories must not mention ForgeOne.** The user's output is
   their project, not ours. `scripts/verify-deployment.mjs` asserts this.

5. **Keep the demo runnable with no configuration.** No required `.env`, no
   required services. If a change adds a prerequisite, it is the wrong change.

6. **The browser stays same-origin.** Vite proxies `/api/v1` in development and
   `apps/web/src/lib/api-proxy.ts` proxies it in production. Do not introduce a
   cross-origin API call or widen CORS to work around one.

---

## Conventions

- **TypeScript strict.** `any` needs a comment justifying it.
- **Conventional Commits**, enforced by commitlint on `commit-msg`.
  `feat(scope):`, `fix(scope):`, `docs:`, `chore:`, `refactor:`.
- **Commit messages explain the failure, not the diff.** State what was wrong
  and why the fix is the right shape. The history is read by judges.
- **Comments explain why.** The reader can see what the code does.
- **Husky + lint-staged** run ESLint and Prettier on staged files. Do not
  bypass with `--no-verify`.
- Match the density and idiom of the file you are editing.

---

## Testing expectations

- Unit and contract tests live in `apps/api/src/__tests__/`.
- `repository-integrity.test.ts` asserts the archive matches the UI count and
  that hostile provider output cannot escape the guard. **These two properties
  are the product's core promises — never weaken these tests to make a change
  pass.**
- Pacing is disabled automatically under `NODE_ENV=test`, so the suite is fast.
- Never use `continue-on-error`, skip a job, or delete an assertion to get CI
  green. Fix the cause.

---

## Where to be careful

- `apps/web/src/routeTree.gen.ts` is generated. Do not hand-edit.
- `apps/agent-runtime/` (Python), `packages/database/` (Prisma) and the
  Redis/Qdrant services in `docker-compose.yml` are **scaffolded but not wired**
  into the execution path. They document intended direction. Do not present
  them as running, and do not make the demo depend on them.
- Some workspace screens are illustrative and carry a *Sample data* badge. The
  run console, artifact explorer and repository views are entirely real. If you
  make an illustrative screen real, remove its badge; if you add one, add a badge.
