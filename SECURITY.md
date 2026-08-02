# Security Policy

## Reporting a vulnerability

Please **do not** open a public GitHub issue for a security problem.

Report it through
[GitHub's private vulnerability reporting](https://github.com/PrinceMridul/ForgeOne/security/advisories/new)
on this repository. That channel is private to the maintainers and is the only
one guaranteed to be monitored.

Include what you did, what you expected, and what happened. A minimal
reproduction — a prompt, a provider response, or a request — is worth more than
a description.

## Scope

ForgeOne generates a repository from an untrusted prompt and, when a model
provider is configured, from an untrusted model response. The interesting
surface is therefore:

| Area | Where |
|---|---|
| Provider output reaching the archive | `apps/api/src/orchestrator/repository-guard.ts` |
| Archive construction | `apps/api/src/utils/zip-builder.ts` |
| Prompt-derived domain modelling | `apps/api/src/orchestrator/domain.ts`, `blueprint.ts` |
| HTTP surface and validation | `apps/api/src/routes/`, `apps/api/src/schemas/` |
| Production reverse proxy | `apps/web/src/lib/api-proxy.ts` |

## Threat model

Model output is treated as untrusted input, not as truth. Before anything can
enter `Repository.zip`, every path is normalised and the entry is rejected if
it uses traversal, an absolute path, a reserved device name, a duplicate name,
or exceeds the size budget. If too little survives validation, the pipeline
falls back to the deterministic generator rather than emitting a partial
repository. The zip writer re-validates independently, so there is no single
point of failure.

This is enforced by 37 assertions in
`apps/api/src/__tests__/repository-guard.test.ts` and by end-to-end assertions
in `repository-integrity.test.ts` that feed a hostile response through the whole
pipeline and check what comes out.

## Known non-goals

These are deliberate limitations of a demo, not undisclosed weaknesses:

- **No authentication.** Every endpoint is open. Anyone who can reach the
  instance can dispatch a run and read any run's artifacts. Do not deploy it
  with anything sensitive in reach.
- **No rate limiting on run dispatch.** `@fastify/rate-limit` is a dependency
  but is not applied to the run routes.
- **Run state is in memory** and is neither encrypted nor persisted.
- **Generated repositories are never executed.** ForgeOne writes code; it does
  not run it. Sandboxed execution is future work (`apps/agent-runtime`).

## Automated checks

| Check | Workflow |
|---|---|
| CodeQL static analysis (JavaScript/TypeScript) | `.github/workflows/codeql-analysis.yml` |
| Dependency review on pull requests, failing on high severity | `.github/workflows/dependency-review.yml` |
| Dependency updates | `.github/dependabot.yml` |

## Supported versions

This is a hackathon submission, not a maintained release line. Fixes land on
`main`.
