# Future Work

## Next, in priority order

**1. Persistence — SQLite via the existing Prisma package**
- Runs survive a restart; run URLs become shareable
- Retires four current limitations in one change
- Schema already exists — it is wiring, not design

**2. Real integration tests in generated repos**
- Today's generated specs are contract tests
- Spin an ephemeral Postgres, exercise the emitted SQL and foreign keys

**3. Learned domain modelling**
- Replace curated profiles with model-derived resources as the default path
- Keep the deterministic generator as the offline fallback

**4. Wire the Python agent-runtime**
- Currently scaffolded and honestly documented as not wired
- Would allow sandboxed execution of generated code

**5. Stream over WebSockets**
- `socket.io` is already a dependency
- The engine's store boundary makes this a contained change

## Explicitly not doing

- Kubernetes, Terraform, production infrastructure
- Complexity that does not improve the product
