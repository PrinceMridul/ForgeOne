# System Architecture

```
Browser ── TanStack Start (React 19, Vite)          :8080
              │  polls every 1.5s
              ▼
        Fastify 5 + Zod                             :4000
              │
     ┌────────┴────────┐
     │  Orchestrator   │   apps/api/src/orchestrator
     └────────┬────────┘
              │
   domain.ts ─────► noun extraction + domain scoring
   blueprint.ts ──► entities, relations, capabilities
   scaffold.ts ───► blueprint → repository
   repository-guard.ts ► validates untrusted output
   pipeline.ts ───► dependency-gated stages + telemetry
   agents/ ───────► the eight stage implementations
```

## What actually runs

- **Frontend** — TanStack Start, Vite, Tailwind v4, shadcn/ui
- **API & orchestrator** — Fastify 5, TypeScript, Zod
- **Agents** — TypeScript, in-process
- **Run state** — in memory, no external services required
- **Providers** — Anthropic / OpenAI / Gemini, deterministic fallback

## Deliberately not wired

- Python agent-runtime, Prisma/PostgreSQL, Redis, Qdrant
- Present for the roadmap — documented as such, not claimed as running

---

**Two commands to run it:** `pnpm install` → `pnpm turbo dev`
