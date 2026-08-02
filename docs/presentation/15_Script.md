# Presentation Script

> Full narration with click order lives in [`Demo_Script.md`](../../Demo_Script.md).
> This is the slide-by-slide talk track.

## 01 · Title — 10s
- "ForgeOne turns one sentence into a repository — and shows you the engineering that produced it."

## 02 · Problem — 20s
- "AI code tools give you a snippet. Software is built by a team following a process."
- "And most demos overclaim — numbers nothing measured."

## 03 · Solution — 20s
- "Eight agents, dependency-gated. No stage starts until its inputs exist."

## 04–06 · How it works / Architecture / Pipeline — 40s
- "Nouns from your prompt, plus a scored domain profile for what the sentence implies."
- "Everything is TypeScript in-process. Two commands to run it."

## 07 · Live Demo — 90s ⭐ **the centrepiece**
- Type the hospital prompt, dispatch
- Read the PM line aloud: *"identified 6 core resources… mapped 4 relationships"*
- Point at the file tree: `patients.ts`, `prescriptions.ts`, `lab_results.ts`
- Open `SecurityAudit.md` — real HIGH finding
- Download `Repository.zip`

## 08 · AI Usage — 20s
- "With a key, the model drives it. Without, a deterministic generator — and it says which."

## 10 · Security — 30s ⭐ **the differentiator**
- "We found Zip Slip in our own pipeline. Seven hostile paths in, one safe entry out."

## 11 · Verification — 20s
- "118 tests. Zip entries always equal what the UI claims — asserted by test."

## 12 · Results — 20s
- "Ten domains, ten genuinely different systems."

## 13 · Future Work — 15s
- "One day of work: SQLite persistence. Retires four limitations."

## Closing — 10s
- "Every number on that screen is measured. That is the part we are proud of."

---

**Total: ~5 minutes** · Trim slides 04–06 and 13 for the 3-minute cut.
