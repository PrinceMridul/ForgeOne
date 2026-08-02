# Q&A — Backup Slides

## "Is this actually AI, or a template engine?"

- **Both, deliberately.** With an API key the model drives resource modelling and code generation
- Without one, a deterministic generator produces a real prompt-specific repository
- The agent states which path it took, in its own telemetry, during the run
- The engineering that matters — validation, dependency gating, integrity — applies either way

## "What happens if I refresh?"

- Run state is in memory; the run is gone
- The console says **"run not found"**, not a generic error
- Documented in the README. Persistence is the #1 roadmap item

## "Are those numbers real?"

- Repository count === entries in the zip you just downloaded
- Test count parsed from the generated specs
- Digest derived from file content; run id is the real run id
- Asserted by test, verified across 6 prompts

## "The dashboard looks like mock data"

- It is, and it says so — labelled **Sample data** in the UI
- Live console, artifact explorer and repository views are entirely real

## "How do you know provider output is safe?"

- Show the hostile-input test: 7 malicious paths in, 1 safe entry out
- `repository-guard.ts` is one choke point; the zip writer re-validates independently

## "How long did this take?"

- Inherited a working codebase, then: fixed an 8 ms run that couldn't be watched, a red test suite, a 500 on the most-clicked run, and Zip Slip in the download path
- Test count went 44 → 120
