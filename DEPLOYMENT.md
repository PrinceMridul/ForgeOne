# Deploying ForgeOne

ForgeOne deploys as **one service on one public URL**. Nothing needs to be
provisioned alongside it — no database, broker, object store or container
registry — because run state is held in the API process's memory.

- **Fastest path:** [Render Blueprint](#render-blueprint-recommended) — one click, no config.
- **Portable path:** [Docker](#docker) — same image on Fly.io, Railway, Cloud Run, or a VM.
- **Verify either:** [`scripts/verify-deployment.mjs`](#verifying-a-deployment).

---

## How one URL serves both processes

The product is two processes: the Fastify API (orchestrator and agents) and the
TanStack Start SSR server. Exposing both publicly would mean two URLs, a CORS
policy to keep in step, and a second cold start on the first click of a demo.

Instead:

```
                 ┌──────────────────────── one public origin ────────────────────────┐
  browser  ──▶   │  TanStack Start SSR server  ($PORT)                               │
                 │      │                                                            │
                 │      ├─ /                → React app, server-rendered              │
                 │      └─ /api/* /health   → reverse proxy ──▶ Fastify API (:4000)  │
                 └──────────────────────────────────────────────────────────────────┘
                                                              loopback only
```

- [`apps/web/src/lib/api-proxy.ts`](apps/web/src/lib/api-proxy.ts) forwards
  `/api/*`, `/health`, `/docs` and `/demo/*` to the API, streaming bodies rather
  than buffering them so `Repository.zip` downloads do not have to fit in memory.
- [`scripts/start-production.mjs`](scripts/start-production.mjs) supervises both
  children: only the web server binds `$PORT`, the API binds `127.0.0.1`, and
  either child exiting takes the process down so the platform restarts it.

This mirrors development exactly, where the Vite dev server proxies the same
paths. The browser is same-origin in both environments, so `VITE_API_URL` stays
empty and no CORS preflight is ever involved.

---

## Render Blueprint (recommended)

[`render.yaml`](render.yaml) is committed at the repo root.

1. Push the repository to GitHub (already done for this submission).
2. Render dashboard → **New** → **Blueprint** → select the `ForgeOne` repo.
3. **Apply**. Render reads `render.yaml`, builds, and starts the service.

Build and start commands come from the blueprint:

```bash
corepack enable && pnpm install --frozen-lockfile && pnpm turbo run build
node scripts/start-production.mjs
```

**Nothing needs to be entered.** The three API-key variables are declared with
`sync: false`, so Render prompts for them and accepts blank — leave them blank
and the Developer agent uses its deterministic generator, exactly as documented
in the README.

> **Free-plan note.** Free instances sleep after 15 minutes of inactivity and the
> next request pays a ~50s cold start. `healthCheckPath: /health` keeps the
> instance warm while it is being polled. Open the URL once before demoing.

---

## Docker

The root [`Dockerfile`](Dockerfile) builds the whole product into one image.

```bash
docker build -t forgeone .
docker run --rm -p 8080:8080 forgeone
```

Then open `http://localhost:8080`. The image honours `$PORT`, so it drops
straight into Fly.io, Railway, Cloud Run or Azure Container Apps.

`apps/api/Dockerfile` still exists for deploying the API on its own — useful if
you want to scale the orchestrator separately later. It is not needed for the
single-URL deployment.

---

## Running the production build locally

Identical to what a platform runs, useful for rehearsing a demo:

```bash
pnpm install
pnpm turbo run build
pnpm start                 # → http://localhost:8080
```

---

## Configuration

Every setting has a working default; the table lists only what is worth changing.

| Variable | Default | Effect |
|---|---|---|
| `PORT` | `8080` | Public port the SSR server binds |
| `INTERNAL_API_PORT` | `4000` | Loopback port for the API |
| `API_ORIGIN` | `http://127.0.0.1:4000` | Proxy target; set by the supervisor |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` | *(unset)* | Any one makes the Product Manager and Developer call a real model |
| `RUN_EVENT_PACING_MS` | `130` | Delay between telemetry events (~42s run) |
| `RUN_STAGE_PACING_MS` | `900` | Settle time between agents |
| `RUN_PACING` | *(unset)* | `off` restores instant completion |
| `API_LOG_LEVEL` | `info` | Fastify log verbosity |

`VITE_API_URL` must stay **empty** in this topology. Setting it points the
browser at a cross-origin API and reintroduces the CORS surface the proxy exists
to remove.

---

## Verifying a deployment

```bash
node scripts/verify-deployment.mjs https://your-deployment-url
```

It dispatches a real run and asserts the claims the README makes, rather than
trusting them:

```
Reachability
  [PASS] GET /health returns ok — service=forgeone-api
  [PASS] GET / serves the app from the same origin — status=200

Pipeline
  [PASS] run reaches COMPLETED — 42.8s
  [PASS] every agent emitted telemetry — 266 events

Artifacts
  29 pipeline artifacts · 19 in repository
  [PASS] Repository.zip is produced
  [PASS] archive downloads as application/zip — 27431 bytes
  [PASS] archive entry count equals the count shown in the UI — 19 entries vs 19 flagged inRepository
  [PASS] no ForgeOne self-reference leaks into generated artifacts

All checks passed.
```

Exit code is non-zero if any check fails, so it works as a post-deploy gate.

---

## Known operational limits

- **Run state is in memory.** A restart or a free-plan sleep invalidates existing
  run URLs; the console reports *run not found* rather than a generic error.
  Dispatch a fresh run rather than reloading an old URL.
- **A single instance holds all runs.** Horizontal scaling needs the persistence
  work described under Future Work in [SUBMISSION.md](SUBMISSION.md); until then
  keep the service at one instance.
- **Cold starts on free tiers** are a platform property, not an application one.
  A paid instance, or any host without scale-to-zero, removes them.
