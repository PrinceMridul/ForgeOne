# ForgeOne — Minimal Distributable

This repository **is** the submission. There is no separate bundle to unpack:
the root has been reduced to exactly what a reviewer needs to read the code,
run it, and verify the claims.

## What ships

| Path | Purpose |
|---|---|
| `apps/web/` | TanStack Start frontend — the live execution console |
| `apps/api/` | Fastify server and the agent orchestrator |
| `apps/agent-runtime/` | Python service — scaffolded, **not wired** (see Limitations) |
| `packages/` | Shared config, types, logger, database schema |
| `docs/` | Architecture notes and the full presentation package |
| `docs/presentation/` | 16 slide files + 16 screenshots from one real run |
| `prompts/` | Agent system-prompt templates |
| `scripts/` | Production supervisor, deployment verification, screenshot capture |
| `.github/workflows/` | CI — lint, type-check, test, build |

## Root documents

| File | Purpose |
|---|---|
| `README.md` | Project overview, quick start, architecture, limitations |
| `SUBMISSION.md` | Hackathon submission form content |
| `Demo_Script.md` | 30s / 90s / 3-minute narration with click order |
| `ForgeOne_Hackathon_Presentation.pptx` | 14-slide deck |
| `LICENSE` · `SECURITY.md` · `CONTRIBUTING.md` | Standard open-source files |

## Run it

```bash
pnpm install
pnpm turbo dev        # web :8080 · api :4000
```

Node 22+ and pnpm 9 are the only prerequisites. No database, broker or
container runtime is needed — run state is held in memory. No `.env` is
required; every setting has a working default.

## Verify it

```bash
pnpm turbo lint         # 5/5 tasks, 0 errors
pnpm turbo type-check   # 8/8 tasks
pnpm turbo test         # 120 tests across 10 files
pnpm turbo build        # 5/5 tasks
```

## Deliberately excluded

Removed from the distributable because it is generated, superseded, or not
part of what runs:

- `node_modules/`, build output (`dist/`, `.next/`, `.output/`, `.turbo/`)
- Coverage reports, logs, caches, temp directories
- `output/` — downloaded run artifacts kept locally for manual comparison
- Playwright's downloaded browser binaries (`npx playwright install chromium`
  fetches them on demand; the capture harness itself ships in `scripts/`)
- `apps/web_old/` — the superseded Next.js frontend, fully replaced by
  `apps/web`
- Editor-specific configuration not required to build or lint

## Honest scope

`apps/agent-runtime`, the Prisma schema in `packages/database`, and the
Redis/Qdrant services in `docker-compose.yml` are **scaffolded but not wired**
into the execution path. They are retained because they document the intended
direction, and the README says plainly that they do not run. Nothing in the
demo depends on them.
