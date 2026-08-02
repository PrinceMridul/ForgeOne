# Built with Codex

> Deck slide 10. Full evidence in [`docs/CODEX_USAGE.md`](../CODEX_USAGE.md).

**Agentic depth: planning, multi-step execution, and a review loop that found a real bug**

## The loop, not the completion

```
brief → plan → implement → review the running product → fix → verify
   ▲                                                        │
   └───────────── findings feed the next brief ─────────────┘
```

## 20 commits · 6 feat · 8 fix — more fixes than features

- None of the eight `fix(...)` commits is a user bug report
- Each repairs something the review step found in work the build step had just produced
- `git log --reverse --pretty=format:'%h %ad %s' --date=short`

## Self-review found Zip Slip in our own pipeline

- The review step fed a **hostile** provider response through the real pipeline
- The archive came out containing `../../../../etc/cron.d/backdoor`
- A generation-only workflow ships that
- One guard, 37 assertions, closed it — `repository-guard.ts`

## Findings became rules, not one-off patches

- [`AGENTS.md`](../../AGENTS.md) encodes each finding as a constraint
- "Never let a number on screen mean two things" — because a review found two counts conflated
- "Model output is untrusted input" — because a review found Zip Slip
- The next iteration cannot regress on either

## The product is the technique

ForgeOne's own eight agents are this same loop, dependency-gated and productised:

| Loop step | In the product |
|---|---|
| Plan | Product Manager → `PRD.md`, `Tasks.json` |
| Design | Architect → `Architecture.md` |
| Implement | Developer → source files, `Repository.zip` |
| Review | Reviewer runs checks against the emitted files |
| Verify | Tester reports its own coverage gaps |
| Audit | Security ranks capability-driven findings |

---

**Self-review and dependency-ordered planning are not claims about how this was
built — they are executable code with 118 tests around them.**
