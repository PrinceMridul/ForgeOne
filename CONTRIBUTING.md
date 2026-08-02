# Contributing to ForgeOne

Thanks for taking an interest. Start with [`AGENTS.md`](AGENTS.md) — it is the
operating contract for this repository and applies to human contributors as much
as to coding agents.

## Getting set up

```bash
pnpm install
pnpm turbo dev          # web :8080 · api :4000
```

Node 22+ and pnpm 9 (`corepack enable`) are the only prerequisites. No database,
broker or container runtime is needed, and no `.env` is required — every setting
has a working default.

## Before you open a pull request

```bash
pnpm turbo lint         # must be 0 errors
pnpm turbo type-check
pnpm turbo test
pnpm turbo build
```

All four run in CI on every pull request
([`.github/workflows/ci.yml`](.github/workflows/ci.yml)), and `build` is gated on
the other three. Husky runs ESLint and Prettier on staged files at commit time;
do not bypass it with `--no-verify`.

If your change touches the deployment topology or the run pipeline, also run the
end-to-end check:

```bash
pnpm turbo build && pnpm start &
node scripts/verify-deployment.mjs
```

## Branch naming

| Prefix | For |
|---|---|
| `feat/` | New features |
| `fix/` | Bug fixes |
| `docs/` | Documentation |
| `refactor/` | Restructuring without behaviour change |
| `chore/` | Tooling, dependencies, housekeeping |

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/), enforced by
commitlint on the `commit-msg` hook.

Write the message to explain the **failure**, not the diff — what was wrong, and
why this is the right shape of fix. The reader can already see what changed.

## Pull requests

1. Keep them focused. Under ~400 lines of change is a good target.
2. Fill out the [PR template](.github/PULL_REQUEST_TEMPLATE.md).
3. Every CI check must pass. Never reach for `continue-on-error`, skip a job, or
   delete an assertion to get green — fix the cause.
4. Squash merge to `main`.

## Code standards

- **TypeScript strict.** An `any` needs a comment justifying it.
- **Comments explain why.** Match the density and idiom of the file you are in.
- **Tests** live in `apps/api/src/__tests__/`. New behaviour in the orchestrator
  or the repository guard needs coverage. There is no enforced coverage
  threshold; `repository-guard.test.ts` and `repository-integrity.test.ts` cover
  the product's core promises and must never be weakened to make a change pass.
- **Python** in `apps/agent-runtime` (scaffolded, not wired): type hints,
  docstrings, Ruff.

## Reporting security issues

Do not open a public issue — see [SECURITY.md](SECURITY.md).
