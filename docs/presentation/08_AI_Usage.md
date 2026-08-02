# AI Usage

## Two modes, both honest

**With an API key** — Anthropic / OpenAI / Gemini
- Product Manager asks the model for the domain resources
- Developer asks the model for the codebase
- Every response is validated before it reaches you

**Without a key** — deterministic generator
- Derives a real, prompt-specific repository
- The agent says so in its telemetry during the run
- Nothing pretends to be a model that isn't

## The model is never trusted blindly

- Resource lists are parsed, filtered and length-capped
- File paths are normalised; traversal and absolute paths rejected
- Duplicates, oversized files and reserved names dropped
- Too little survives validation → fall back to the deterministic scaffold

## Where AI adds real leverage

- Turning one ambiguous sentence into a defensible domain model
- Choosing a schema, then justifying the choice in the architecture doc
- Producing *and critiquing* its own output across eight roles

---

**The interesting part is not the generation — it is the verification around it.**
