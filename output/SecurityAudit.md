# Security Audit Report — AI Research Collaboration

## Posture: ⚠️ NEEDS ATTENTION

| Severity | Count |
|---|---|
| High | 2 |
| Medium | 2 |
| Low | 2 |

Scanned 11 files and 5 declared runtime dependencies.

## Findings

### 1. [INFO] Input validation present on every route

Request bodies are parsed with Zod before reaching handler logic, so unmodelled fields are dropped.

### 2. [HIGH] Endpoints are unauthenticated

No authentication was implied by the prompt, so every route is publicly writable. Add an auth pre-handler before exposing this service.

### 3. [MEDIUM] No rate limiting on write paths

POST and DELETE on /api/projects, /api/subscriptions, /api/events, /api/workspaces accept unbounded request volume.

### 4. [LOW] State is held in process memory

Records live in a module-level Map. Data is lost on restart and is not shared across replicas.

### 5. [MEDIUM] WebSocket upgrade does not check Origin

The realtime gateway accepts any origin. Restrict the upgrade handshake to known hosts.

### 6. [HIGH] Payment webhooks must verify signatures

Stripe is a declared dependency. Reject webhook payloads whose signature header does not verify.

### 7. [LOW] Search input reaches a text-search expression

Bind the query as a parameter so it can never be concatenated into SQL.

## Dependency Audit

- `fastify@^5.0.0` — no known advisories at the pinned range.
- `zod@^3.23.0` — no known advisories at the pinned range.
- `ws@^8.18.0` — no known advisories at the pinned range.
- `stripe@^17.0.0` — no known advisories at the pinned range.
- `@anthropic-ai/sdk@^0.32.0` — no known advisories at the pinned range.

## Recommended Order of Work

1. Resolve the high-severity findings above before any public deployment.
2. Add rate limiting to write paths.
3. Move persistence behind a real database with per-tenant scoping.
