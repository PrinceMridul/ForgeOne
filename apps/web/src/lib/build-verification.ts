/**
 * Build verification store — a self-contained CI/CD simulation that kicks in
 * once the Developer emits `Repository.zip`. Six sequential steps, each with
 * a scripted terminal output. Uses useSyncExternalStore so it integrates with
 * the rest of the ForgeOne live experience without touching the main engine.
 */

import { useSyncExternalStore } from "react";

export type BuildStepId = "install" | "lint" | "typecheck" | "test" | "build" | "verified";

export type BuildStepStatus = "pending" | "running" | "done" | "failed";

export interface BuildStep {
  id: BuildStepId;
  label: string;
  emoji: string;
  status: BuildStepStatus;
  startedAt: number | null;
  endedAt: number | null;
  durationMs: number;
  output: string[]; // grows line-by-line while running
  scriptedOutput: string[]; // full script for this step
  targetMs: number; // scripted wall-clock duration
}

export interface BuildVerificationState {
  active: boolean;
  currentIndex: number; // index into steps, -1 when idle, steps.length when done
  steps: BuildStep[];
  startedAt: number | null;
  endedAt: number | null;
  filesGenerated: number;
  testsPassed: number;
  repoSizeKb: number;
  artifactsProduced: string[];
}

const SCRIPTS: Record<
  BuildStepId,
  { label: string; emoji: string; targetMs: number; lines: string[] }
> = {
  install: {
    label: "Installing dependencies",
    emoji: "📦",
    targetMs: 3100,
    lines: [
      "$ bun install",
      "  ✓ resolving dependency graph",
      "  ✓ 684 packages resolved, 12 cached, 672 fetched",
      "  ✓ linking node_modules",
      "  ✓ built @tanstack/router-devtools",
      "  ✓ built better-sqlite3 (postinstall)",
      "done in 3.1s",
    ],
  },
  lint: {
    label: "Running ESLint",
    emoji: "🧹",
    targetMs: 1600,
    lines: [
      "$ bunx eslint . --max-warnings=0",
      "  scanning 148 files across src/",
      "  ✓ src/routes/api/projects.ts",
      "  ✓ src/db/schema.ts",
      "  ✓ src/components/agent-card.tsx",
      "  ✓ no lint errors · 0 warnings",
      "done in 1.6s",
    ],
  },
  typecheck: {
    label: "TypeScript type check",
    emoji: "🧠",
    targetMs: 2400,
    lines: [
      "$ bunx tsc --noEmit --strict",
      "  loaded tsconfig.json (strict: true)",
      "  checking 214 modules",
      "  narrowed 28 discriminated unions",
      "  ✓ 0 errors · 0 warnings",
      "done in 2.4s",
    ],
  },
  test: {
    label: "Running Tests",
    emoji: "🧪",
    targetMs: 3400,
    lines: [
      "$ bunx vitest run --coverage",
      "  spawning 4 worker threads",
      "  RUN  tests/api/projects.spec.ts (14)",
      "  RUN  tests/db/schema.spec.ts (9)",
      "  RUN  tests/auth/session.spec.ts (12)",
      "  RUN  tests/components/agent-card.spec.tsx (13)",
      "  ✓ 48 passed · 0 failed · 0 skipped",
      "  coverage: 87.4% lines · 82.1% branches",
      "done in 3.4s",
    ],
  },
  build: {
    label: "Building production bundle",
    emoji: "🏗",
    targetMs: 3800,
    lines: [
      "$ bun run build",
      "  vite build --mode production",
      "  ✓ 214 modules transformed",
      "  rendering routes ································· 12/12",
      "  dist/assets/index-4c9e1a.js       182.4 kB │ gzip: 58.1 kB",
      "  dist/assets/index-4c9e1a.css       36.9 kB │ gzip:  8.7 kB",
      "  ✓ compiled successfully",
      "done in 3.8s",
    ],
  },
  verified: {
    label: "Repository verified",
    emoji: "✅",
    targetMs: 900,
    lines: [
      "$ forge verify --sign",
      "  hashing artifacts (sha256)",
      "  ✓ Repository.zip · sha 4c9e1a2",
      "  ✓ ready for deployment",
    ],
  },
};

const STEP_ORDER: BuildStepId[] = ["install", "lint", "typecheck", "test", "build", "verified"];

function freshSteps(): BuildStep[] {
  return STEP_ORDER.map((id) => ({
    id,
    label: SCRIPTS[id].label,
    emoji: SCRIPTS[id].emoji,
    status: "pending",
    startedAt: null,
    endedAt: null,
    durationMs: 0,
    output: [],
    scriptedOutput: SCRIPTS[id].lines,
    targetMs: SCRIPTS[id].targetMs,
  }));
}

let state: BuildVerificationState = {
  active: false,
  currentIndex: -1,
  steps: freshSteps(),
  startedAt: null,
  endedAt: null,
  filesGenerated: 0,
  testsPassed: 48,
  repoSizeKb: 0,
  artifactsProduced: [],
};

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

let stepTimer: ReturnType<typeof setTimeout> | null = null;
let lineTimer: ReturnType<typeof setInterval> | null = null;

function clearTimers() {
  if (stepTimer) {
    clearTimeout(stepTimer);
    stepTimer = null;
  }
  if (lineTimer) {
    clearInterval(lineTimer);
    lineTimer = null;
  }
}

function startStep(index: number) {
  clearTimers();
  const steps = state.steps.map((s, i) => {
    if (i !== index) return s;
    return { ...s, status: "running" as const, startedAt: Date.now(), output: [] };
  });
  state = { ...state, steps, currentIndex: index };
  emit();

  const step = steps[index];
  const perLine = Math.max(120, Math.floor(step.targetMs / (step.scriptedOutput.length + 1)));
  let li = 0;

  lineTimer = setInterval(() => {
    if (li >= step.scriptedOutput.length) {
      if (lineTimer) {
        clearInterval(lineTimer);
        lineTimer = null;
      }
      return;
    }
    const line = step.scriptedOutput[li++];
    state = {
      ...state,
      steps: state.steps.map((s, i) => (i === index ? { ...s, output: [...s.output, line] } : s)),
    };
    emit();
  }, perLine);

  stepTimer = setTimeout(() => {
    // finalize step
    const now = Date.now();
    state = {
      ...state,
      steps: state.steps.map((s, i) => {
        if (i !== index) return s;
        return {
          ...s,
          status: "done",
          endedAt: now,
          durationMs: now - (s.startedAt ?? now),
          // ensure full output is present
          output: s.scriptedOutput,
        };
      }),
    };
    emit();

    if (index + 1 < STEP_ORDER.length) {
      // small breath between steps
      stepTimer = setTimeout(() => startStep(index + 1), 350);
    } else {
      // done — finalize run
      clearTimers();
      state = {
        ...state,
        active: false,
        endedAt: Date.now(),
        currentIndex: STEP_ORDER.length,
      };
      emit();
    }
  }, step.targetMs);
}

export function startBuildVerification(input: {
  filesGenerated: number;
  repoSizeKb: number;
  artifactsProduced: string[];
}) {
  if (state.active || state.endedAt) return;
  clearTimers();
  state = {
    active: true,
    currentIndex: 0,
    steps: freshSteps(),
    startedAt: Date.now(),
    endedAt: null,
    filesGenerated: input.filesGenerated,
    testsPassed: 48,
    repoSizeKb: input.repoSizeKb,
    artifactsProduced: input.artifactsProduced,
  };
  emit();
  startStep(0);
}

export function resetBuildVerification() {
  clearTimers();
  state = {
    active: false,
    currentIndex: -1,
    steps: freshSteps(),
    startedAt: null,
    endedAt: null,
    filesGenerated: 0,
    testsPassed: 48,
    repoSizeKb: 0,
    artifactsProduced: [],
  };
  emit();
}

export function useBuildVerification(): BuildVerificationState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
}

export function getBuildStepColorToken(id: BuildStepId | null | undefined): string {
  switch (id) {
    case "install":
      return "primary";
    case "lint":
      return "warning";
    case "typecheck":
      return "info";
    case "test":
      return "chart-2";
    case "build":
      return "chart-4";
    case "verified":
      return "success";
    default:
      return "primary";
  }
}
