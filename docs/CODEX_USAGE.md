# How Codex built ForgeOne

> **Judging criterion:** *Use of Codex — depth of agentic usage, beyond
> autocomplete. Planning, multi-step execution, review loops.*

This document is evidence, not assertion. Every claim below points at something
you can check in this repository: a commit, a file, or a command you can run.

---

## The short version

ForgeOne was built by driving Codex as an **engineer**, not as an autocomplete.
Each unit of work was a full loop:

```
  brief  ─▶  plan  ─▶  implement  ─▶  self-review against the running product  ─▶  fix  ─▶  verify
                ▲                                                                    │
                └────────────────────── findings feed the next brief ────────────────┘
```

The loop is legible in the git history because it was never squashed away. The
`fix(...)` commits are not bug reports from a user — they are the output of the
review half of the loop, run against the product Codex had just built.

And the loop is legible in the product itself, because **ForgeOne is that loop,
productised**: plan → architect → build → review → test → audit → deploy →
document, with each stage reading the previous stage's artifacts.

---

## Evidence 1 — the commit history is the review loop

`git log --reverse --oneline` reads as alternating build and self-review phases:

| Commit | Phase | What the review found |
|---|---|---|
| `209414c` | baseline | Snapshot of the inherited repository before any agentic work |
| `0038404` | build | Pace live execution so runs stream in real time |
| `783226e` | **review → fix** | The seeded showcase run was broken; poll payload was oversized |
| `8bc7b09` | **review → fix** | The Live thinking panel was wrong; the runtime clock was fake |
| `2d3d12d` | build | Generate artifacts about the user's idea, not a fixed sample |
| `e990c68` | build | Ground the review/test/security/ops reports in the real repo |
| `293b105` | **review → fix** | Resource matching hit substrings; the ship action was dead |
| `944ce47` | **review → fix** | Unknown runs returned a generic error, not a 404 |
| `53a266d` | build | Semantic domain modelling; counts that mean one thing each |
| `a4f078c` | **review → fix** | Fabricated identifiers were still on screen |
| `b38bd51` | **review → fix** | **Provider output could write outside the archive root** |
| `21827d5` | **review → fix** | Illustrative screens were presented as measured |
| `81f1741` | **review → fix** | The README described code a judge would not actually run |
| `3f3699d` | **review → fix** | Syntax highlighting broken; repository page misnamed |
| `9c59b04` | build + review | No deployable topology existed; two latent bugs surfaced fixing it |

Of twenty commits, six are `feat(...)` and **eight are `fix(...)`** — and none
of those eight is a user bug report. Every one repairs something the review step
found in work the build step had just produced. More fixes than features is the
signature of a review loop, not of a single generation pass.

**Check it yourself:**

```bash
git log --reverse --pretty=format:'%h %ad %s' --date=short
```

---

## Evidence 2 — the self-review that found a real vulnerability

The highest-value finding in this project came from the review half of the loop,
not from the build half.

The brief was ordinary: *"treat the provider response as data, not as truth."*
The review step fed a deliberately hostile model response through ForgeOne's own
pipeline and inspected what came out of the other end. The archive contained:

```
../../../../etc/cron.d/backdoor
C:\Windows\System32\drivers\etc\hosts
```

That is **Zip Slip** — on the exact file a user downloads and extracts. A
generation-only workflow ships that. The loop caught it because the review step
ran the product against adversarial input rather than re-reading the diff.

The fix is `b38bd51`: one choke point,
[`apps/api/src/orchestrator/repository-guard.ts`](../apps/api/src/orchestrator/repository-guard.ts),
that normalises every path, rejects traversal, absolute paths and reserved
device names, drops duplicates and oversized files, and falls back to the
deterministic generator when too little survives validation. The zip writer
re-validates independently, so there is no single point of failure.

**Check it yourself** — 37 assertions cover this one file:

```bash
pnpm --filter @forgeone/api test repository-guard
```

---

## Evidence 3 — planning artifacts are committed, not discarded

Multi-step execution leaves a trail. This repository keeps it:

| Artifact | What it is |
|---|---|
| [`AGENTS.md`](../AGENTS.md) | The operating contract Codex reads before editing — commands, non-negotiables, where to be careful |
| [`docs/decisions/`](decisions/) | Architecture decision records: monorepo strategy, agent framework, database selection |
| [`docs/architecture/`](architecture/) | The system design the implementation was planned against |
| [`prompts/system/`](../prompts/) | The eight agent role definitions, authored before the agents were coded |

`AGENTS.md` matters most here. It is the mechanism by which review findings
became **durable constraints** rather than one-off fixes. "Never let a number on
screen mean two things" is rule 1 because a review found two counts conflated
(`53a266d`). "Model output is untrusted input" is rule 2 because a review found
Zip Slip (`b38bd51`). The loop does not just fix bugs; it writes down what it
learned so the next iteration cannot regress.

---

## Evidence 4 — the product is the technique

The most direct demonstration of agentic depth is what ForgeOne *does*.

The eight-agent pipeline in `apps/api/src/orchestrator/` is a productised version
of the same loop that built it:

- **Dependency gating.** No stage starts until the artifact *types* it declares
  as inputs exist — `pipeline.ts`. Planning is enforced by the runtime, not by
  convention.
- **A shared blueprint.** The Product Manager writes one project model into
  `SharedContext`; every downstream agent reads the same model. That is why the
  PRD, the architecture doc and the generated code describe one system rather
  than three.
- **Review agents that read the artifact, not the prompt.** The Reviewer's checks
  execute against the files that were actually emitted. The Tester counts the
  specs that exist and **names the resources it did not cover**. The Security
  agent's findings are driven by the blueprint's real capabilities.
- **Fallback over partial output.** If validation rejects too much, the pipeline
  emits a known-good deterministic repository rather than a broken one.

Self-review, dependency-ordered planning and multi-step execution are not
claims about the build process here — they are executable code with 118 tests
around them.

---

## Evidence 5 — verification is automated, not narrated

The loop closes on measurement. Two properties are asserted end to end against
the running server, so a regression fails a test rather than surviving to a demo:

```bash
pnpm turbo test                     # 118 tests across 10 files
node scripts/verify-deployment.mjs  # against localhost or a deployed URL
```

`verify-deployment.mjs` re-derives the claims instead of trusting them: it
counts real ZIP central-directory headers and asserts that number equals the
count the UI displays, and it greps every generated artifact for ForgeOne
self-references. Both checks exist because the review loop found both failures.

---

## What Codex did *not* do

Stated plainly, because a submission that overclaims is worse than one that
doesn't:

- **The initial frontend shell was scaffolded with Lovable** on TanStack Start —
  the route skeleton and the shadcn/ui primitives under
  `apps/web/src/components/ui/`. The execution console, artifact explorer,
  repository views, build-verification panel and every piece of live run
  plumbing were written for this project.
- **The orchestrator, all eight agents, the domain model, the blueprint, the
  repository generator, the provider safety layer and the whole test suite** are
  original work for this project.
- **No metric in this document is estimated.** Test counts come from the runner,
  artifact counts from a real run, commit counts from `git rev-list`.

---

## Reproducing the loop on this repo

```bash
git clone https://github.com/PrinceMridul/ForgeOne
cd ForgeOne
pnpm install

# Codex reads AGENTS.md, then:
pnpm turbo lint && pnpm turbo type-check && pnpm turbo test

# The review half of the loop, automated:
pnpm turbo build && pnpm start &
node scripts/verify-deployment.mjs
```

If any assertion fails, the loop has found its next brief.
