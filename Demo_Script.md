# ForgeOne — Demo Script

**Setup before you present**

```bash
pnpm install
pnpm turbo dev          # web :8080 · api :4000
```

- Restart the API immediately before presenting — runs are in memory, so a stale URL shows "run not found"
- Optional but recommended: `export ANTHROPIC_API_KEY=...` before starting, so the Developer calls a real model
- Have `http://localhost:8080` open and the prompt box empty

**The prompt used throughout**

> Build a Hospital Management system with patients, doctors, appointments, prescriptions and lab results.

---

## 30-second version

> **Narration**

"ForgeOne turns one sentence into a working repository, and shows you the engineering that produced it.

*(type prompt, click Dispatch)*

Eight agents run in dependency order — no stage starts until its inputs exist. The Product Manager just read 'hospital' and derived patients, doctors, appointments, prescriptions and lab results, with four foreign keys between them.

*(point at the file tree)*

Those are real files. And this — *(click Download)* — is a valid zip whose contents exactly match the count on screen. Every number here is measured, not asserted."

**Clicks:** prompt → Dispatch → point at tree → Download
**Expected:** repo named `hospital-management-patients`, 19 repository files

---

## 90-second version

**0:00 — Landing**
> "One prompt in, a repository out. Let me show you."

Type the hospital prompt. Click **Dispatch Engineering Team**.

**0:10 — Product Manager**
> "Watch the log — it isn't generic. It recognised a healthcare product, derived six resources, and mapped four relationships: appointment to patient, prescription to patient, and so on."

Read aloud from the live log.

**0:25 — Architect → Developer**
> "The Architect turns that into entities, relationships and a storage choice. The Developer writes the repository."

Point at files appearing: `patients.ts`, `prescriptions.ts`, `lab_results.ts`, `schema.sql`.

**0:45 — Reviewer / Tester / Security**
> "Now the interesting part. These agents read the files that were actually produced. The Reviewer's checks run against real code. The Tester reports nine tests *and names the resources it didn't cover*."

Open **SecurityAudit.md** from the artifact explorer.

> "And Security reports a genuine HIGH finding. An unauthenticated CRUD service is not 'zero vulnerabilities' — saying so would be the easy lie."

**1:10 — Build Verification + Download**
> "CI runs against the generated repo. Nineteen repository files, twenty-nine pipeline artifacts — two different numbers that each mean one thing."

Click **Download Repository.zip**.

> "That archive has exactly nineteen entries. There's a test asserting it can never disagree with what you just saw."

**1:25 — Close**
> "Different prompt, genuinely different system — chess gives you players, games and moves. Ten domains validated."

**Clicks:** prompt → Dispatch → log → tree → SecurityAudit.md → Build Verification → Download

---

## 3-minute version

### 0:00–0:20 · Framing
> "Most AI code tools give you a snippet. Software is built by a team following a process — spec, architecture, implementation, review, tests, security, deployment, docs. ForgeOne runs that process, and streams it so you can see the reasoning rather than just the output."

### 0:20–0:35 · Dispatch
Type the hospital prompt → **Dispatch**.
> "Eight agents. Dependency-gated: each declares the artifact types it needs, and the pipeline refuses to start it until they exist."

### 0:35–1:00 · Product Manager
> "The prompt says 'hospital'. It never says 'medical records' or 'lab results' — those come from a scored domain profile. Nouns you *did* type always win; the domain fills what the sentence implies."

Read the log lines aloud.

### 1:00–1:30 · Architect & Developer
Open **Architecture.md** briefly.
> "Entities, an ER sketch, data flow, storage, deployment topology — specific to this system, not boilerplate."

Point at the tree.
> "One route module per resource, Zod-validated. A SQL schema with real foreign keys, cascading deletes, and an index on every key — because the list endpoints filter on exactly those columns. Tables emitted parent-first so references resolve."

### 1:30–2:10 · Review, Test, Security
> "Every downstream agent reads the emitted files. Zero references to ForgeOne's own stack — we test for that."

Open **PRReview.md**, then **TestReport.md**.
> "Nine tests across three specs — and it names the resources with handlers but no spec yet. Reporting your own gaps is more useful than claiming 100%."

Open **SecurityAudit.md**.
> "Findings are capability-driven. This blueprint has auth implied, so it doesn't fire the unauthenticated-endpoints finding. A billing prompt gets a Stripe webhook-signature finding instead."

### 2:10–2:40 · Security engineering ⭐
> "The thing I'm most proud of isn't a feature. We treat model output as untrusted. Early on, feeding a malformed response through our own pipeline produced an archive containing `../../../../etc/cron.d/backdoor` and a Windows system path. That's Zip Slip — on the exact file a user downloads and extracts.

There's now one choke point that normalises paths, rejects traversal and absolute paths, drops duplicates and oversized files, and falls back to the deterministic generator if too little survives. Seven hostile paths in, one safe entry out. The zip writer re-validates independently."

### 2:40–3:00 · Verification & close
Click **Download**.
> "118 tests. Zip entries always equal the count on screen — asserted by test, verified across six prompts. Ten domains produce ten genuinely different systems.

Persistence is the next day of work. Everything else you see is measured."

---

## Expected outputs — checklist

| Surface | Expected |
|---|---|
| Repository header | `hospital-management-patients` · 19 repository files |
| Artifact explorer | `29 pipeline artifacts · 19 in repository` |
| Build summary | Repository files **19** · Bundled entries **19** · Tests **9/9** |
| Generated routes | patients, doctors, appointments, medical_records, prescriptions, lab_results |
| SecurityAudit.md | ≥1 HIGH finding, severity table |
| Repository.zip | Opens cleanly · 19 entries · `package.json` name matches header |
| Runtime | ~40 seconds end to end |

## If something goes wrong

- **"run not found"** → the API restarted. Dispatch a new run; do not reuse an old URL.
- **"API offline" banner** → the API isn't up. `pnpm --filter @forgeone/api dev`
- **Run finishes instantly** → `RUN_PACING=off` is set. Unset it.
- **Total failure** → open `docs/presentation/images/` and walk the sixteen screenshots; they are from a real run.
