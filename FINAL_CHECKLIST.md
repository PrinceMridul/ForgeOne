# Final Submission Checklist

Every item is PASS or FAIL. Anything not PASS has the exact action next to it.

**Deadline:** 3rd August · **Platform:** BlockseBlock dashboard
**Track:** Theme 1 — Agentic Coding

---

## ⚠️ Do these two things first — nothing else is blocking

| # | Action | Time | Status |
|---|---|---|---|
| 1 | **Deploy.** Render → New → Blueprint → pick `ForgeOne` → Apply. Nothing to enter. Then paste the URL into `SUBMISSION.md` and `PROJECT_DESCRIPTION.md`. Runbook: [DEPLOYMENT.md](DEPLOYMENT.md) | ~10 min | **FAIL — required** |
| 2 | **Record the demo video** (≤3 min). Narration, click order and expected outputs: [Demo_Script.md](Demo_Script.md) | ~20 min | **FAIL — required** |

After deploying, confirm it before submitting:

```bash
node scripts/verify-deployment.mjs https://your-url
```

> A submission without a live link fails the pass/fail viability gate and is not
> scored at all. This is the only thing standing between the repository and a
> complete submission.

---

## Mandatory submission items

| Item | Status | Where |
|---|---|---|
| Deployed application link | **FAIL** — deploy, then paste | `SUBMISSION.md` → Mandatory links |
| GitHub repository, public, visible history | **PASS** | https://github.com/PrinceMridul/ForgeOne · 25 commits |
| Demo video ≤3 min | **FAIL** — record, then paste | `SUBMISSION.md` → Mandatory links |
| Project description Google Doc | **PASS** (content ready) | Paste [PROJECT_DESCRIPTION.md](PROJECT_DESCRIPTION.md), share *anyone with the link → Viewer* |
| Track selected | **PASS** | Theme 1 — Agentic Coding |
| Final Submit clicked (Step 5) | **FAIL** — do last | BlockseBlock → verify "Submitted" under My Projects |

---

## Engineering gates

Reproduce: `pnpm install && pnpm turbo run lint type-check test:ci build`

| Gate | Result | Status |
|---|---|---|
| `pnpm turbo lint` | 5/5 tasks · 0 errors · 8 warnings | **PASS** |
| `pnpm turbo type-check` | 8/8 tasks | **PASS** |
| `pnpm turbo test` | 118 tests · 10 files · all passing | **PASS** |
| `pnpm turbo build` | 5/5 tasks | **PASS** |
| Pre-commit hook agrees with CI | routed per workspace in `lint-staged.config.js` | **PASS** |
| Clean-clone install | `pnpm install --frozen-lockfile` | **PASS** |
| Node 22+ / pnpm 9 only prerequisites | no DB, broker or container runtime | **PASS** |
| No required `.env` | every setting defaulted in `apps/api/src/config.ts` | **PASS** |

## GitHub Actions

| Workflow | Purpose | Status |
|---|---|---|
| `ci.yml` | lint · type-check · test:ci · build (build gated on the other three) | **PASS** — mirrors the local gate |
| `codeql-analysis.yml` | JavaScript/TypeScript static analysis | **PASS** |
| `dependency-review.yml` | fails PRs on high-severity advisories | **PASS** |
| No `continue-on-error`, no skipped jobs, no disabled tests | — | **PASS** |

## Deployment

| Check | Status |
|---|---|
| Single public URL serves app + API same-origin | **PASS** — `apps/web/src/lib/api-proxy.ts` |
| `pnpm turbo build && pnpm start` runs the deployed topology locally | **PASS** |
| Nitro preset is `node-server` (Node can execute the build) | **PASS** |
| `render.yaml` blueprint requires no manual configuration | **PASS** |
| Root `Dockerfile` builds the same topology | **PASS** |
| `scripts/verify-deployment.mjs` — 7/7 against a running instance | **PASS** |
| No credentials needed to view the deployed app | **PASS** — no auth |

## Runtime behaviour

Verified across eight domains, one run each.

| Check | Status |
|---|---|
| Run reaches COMPLETED | **PASS** — 8/8 domains, 42.8–44.9s |
| All nine agent types emit telemetry | **PASS** — 8/8 |
| `completedSteps === totalSteps` | **PASS** — 8/8 at 8/8 |
| ZIP central-directory count === artifacts flagged `inRepository` | **PASS** — 8/8 |
| Every artifact `PIPELINE_DEF` names actually exists | **PASS** — 8/8 |
| No ForgeOne self-reference leaks into a generated repository | **PASS** — 8/8 |
| Distinct route surfaces per domain | **PASS** — 8/8 |
| Archive downloads as `application/zip` through the proxy | **PASS** |
| Hostile provider output cannot escape the guard | **PASS** — 37 assertions + end-to-end |

## UI honesty — zero fabricated production metrics

| Surface | Status |
|---|---|
| Landing page — agent count, run duration, run list | **PASS** — measured; no token or branch invention |
| Run console header — Runtime · Agents · Repo files · Artifacts | **PASS** — all from the backend run |
| Agent cards — per-stage duration | **PASS** — measured from event timestamps |
| Pipeline flow — 8 stages, real artifact names, mirrors `STAGE_CONFIGS` | **PASS** |
| Agent communication graph — derived from `PIPELINE_DEF` | **PASS** |
| Live thinking — the run's own telemetry, labelled by event type | **PASS** |
| Artifact explorer — 29 pipeline · 19 in repository | **PASS** |
| Repository view — newest real run, name from generated `package.json` | **PASS** |
| Code preview — one tab per file that exists | **PASS** |
| Build verification — files, tests, size, digest from the generated repo | **PASS** |
| Download flow — entry count equals the UI count | **PASS** |
| `/dashboard` `/agents` `/activity` `/settings` `/terminal` `/projects/:slug` | **PASS** — all carry the *Sample data* badge |
| Architecture & dependency graphs labelled illustrative, off the run page | **PASS** |
| No dead `href="#"` links | **PASS** |
| All routes return 200 | **PASS** — 9/9 |

## Documentation

| Document | Status |
|---|---|
| `README.md` — track, quick start, production build, architecture, limitations | **PASS** |
| `AGENTS.md` — operating contract read by Codex | **PASS** |
| `docs/CODEX_USAGE.md` — agentic loop with commit-level evidence | **PASS** |
| `DEPLOYMENT.md` — topology, Render, Docker, verification | **PASS** |
| `SUBMISSION.md` — mandatory links, track, problem, Use of Codex | **PASS** |
| `PROJECT_DESCRIPTION.md` — Google Doc content | **PASS** |
| `Demo_Script.md` — 30s / 90s / 3-min, click order, expected outputs | **PASS** |
| `CONTRIBUTING.md` · `SECURITY.md` · `LICENSE` | **PASS** |
| `RELEASE_NOTES.md` · `JUDGE_REVIEW.md` · `FINAL_CHECKLIST.md` | **PASS** |
| All relative markdown links resolve | **PASS** — checked repo-wide |
| Every documented number matches a measurement | **PASS** |
| No unreachable contact addresses or unenforced claims | **PASS** |

## Presentation & demo assets

| Item | Status |
|---|---|
| `ForgeOne_Hackathon_Presentation.pptx` — 14 slides, dark theme | **PASS** |
| Slide 10 "Built with Codex" covers the 15% criterion | **PASS** |
| 16 screenshots from one real run of the current build | **PASS** |
| Deck images match the committed screenshots | **PASS** — 15/15 replaced |
| Screenshots reproducible | **PASS** — `node scripts/capture-screenshots.mjs` |
| `docs/presentation/` — 16 slide markdown files | **PASS** |
| No screenshot contradicts the running application | **PASS** |

## Repository hygiene

| Check | Status |
|---|---|
| No TODO / FIXME / HACK in source | **PASS** |
| No dead code or unused imports | **PASS** — lint enforces it again |
| No inherited scaffolding branding | **PASS** |
| No generated artifacts, caches or editor files committed | **PASS** |
| Scaffolded-but-unwired components labelled everywhere they appear | **PASS** |
| Conventional Commits, commitlint enforced | **PASS** |
| Working tree clean, `main` pushed | **PASS** |

---

## Two minutes before you submit

1. Open the deployed URL — wakes a sleeping free instance so the judge's first
   click is fast.
2. Dispatch one run and watch it finish.
3. Confirm the Google Doc is shared *anyone with the link → Viewer*.
4. Confirm the video is unlisted-but-public, not private.
5. BlockseBlock: **Final Submit**, then check "Submitted" under My Projects.
