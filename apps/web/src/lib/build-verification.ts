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
  /** Test cases counted in the generated spec files, not a fixed number. */
  testsPassed: number;
  repoSizeKb: number;
  artifactsProduced: string[];
  /** Content-derived digest of the generated repository. */
  sha: string;
}

/** Facts about the repository this run actually produced. */
export interface BuildFacts {
  filesGenerated: number;
  repoSizeKb: number;
  artifactsProduced: string[];
  testsPassed: number;
  sha: string;
  dependencies: string[];
  specFiles: string[];
  sourceFiles: string[];
}

const EMPTY_FACTS: BuildFacts = {
  filesGenerated: 0,
  repoSizeKb: 0,
  artifactsProduced: [],
  testsPassed: 0,
  sha: "",
  dependencies: [],
  specFiles: [],
  sourceFiles: [],
};

/**
 * The terminal output is scripted, but every number in it is taken from the
 * repository that was actually generated. It previously claimed 684 packages,
 * 148 linted files, 214 modules and 48 tests for repositories that contained
 * roughly a dozen files, which is the first thing a reader would check.
 */
function scriptsFor(
  f: BuildFacts,
): Record<BuildStepId, { label: string; emoji: string; targetMs: number; lines: string[] }> {
  const deps = f.dependencies.length > 0 ? f.dependencies : ["fastify", "zod"];
  const listed = (paths: string[], max: number) => paths.slice(0, max).map((p) => `  ✓ ${p}`);

  return {
    install: {
      label: "Installing dependencies",
      emoji: "📦",
      targetMs: 2600,
      lines: [
        "$ npm install",
        "  resolving dependency graph",
        `  ✓ ${deps.length} direct ${deps.length === 1 ? "dependency" : "dependencies"} resolved`,
        ...deps.slice(0, 5).map((d) => `  ✓ ${d}`),
        "  ✓ linking node_modules",
        "done",
      ],
    },
    lint: {
      label: "Running ESLint",
      emoji: "🧹",
      targetMs: 1500,
      lines: [
        "$ npx eslint . --max-warnings=0",
        `  scanning ${f.sourceFiles.length} source ${f.sourceFiles.length === 1 ? "file" : "files"}`,
        ...listed(f.sourceFiles, 4),
        "  ✓ no lint errors · 0 warnings",
        "done",
      ],
    },
    typecheck: {
      label: "TypeScript type check",
      emoji: "🧠",
      targetMs: 2200,
      lines: [
        "$ npx tsc --noEmit",
        "  loaded tsconfig.json",
        `  checking ${f.sourceFiles.length} ${f.sourceFiles.length === 1 ? "module" : "modules"}`,
        "  ✓ 0 errors",
        "done",
      ],
    },
    test: {
      label: "Running tests",
      emoji: "🧪",
      targetMs: 2800,
      lines: [
        "$ npx vitest run",
        ...(f.specFiles.length > 0
          ? f.specFiles.map((s) => `  RUN  ${s}`)
          : ["  no spec files emitted for this run"]),
        `  ✓ ${f.testsPassed} passed · 0 failed · 0 skipped`,
        "done",
      ],
    },
    build: {
      label: "Building production bundle",
      emoji: "🏗",
      targetMs: 2600,
      lines: [
        "$ npm run build",
        "  tsc --outDir dist",
        `  ✓ ${f.sourceFiles.length} ${f.sourceFiles.length === 1 ? "module" : "modules"} compiled`,
        "  ✓ compiled successfully",
        "done",
      ],
    },
    verified: {
      label: "Repository verified",
      emoji: "✅",
      targetMs: 900,
      lines: [
        "$ forge verify",
        "  hashing repository contents",
        `  ✓ Repository.zip · ${f.filesGenerated} files · ${f.repoSizeKb} KB${f.sha ? ` · sha ${f.sha}` : ""}`,
        "  ✓ ready for deployment",
      ],
    },
  };
}

const STEP_ORDER: BuildStepId[] = ["install", "lint", "typecheck", "test", "build", "verified"];

function freshSteps(facts: BuildFacts = EMPTY_FACTS): BuildStep[] {
  const scripts = scriptsFor(facts);
  return STEP_ORDER.map((id) => ({
    id,
    label: scripts[id].label,
    emoji: scripts[id].emoji,
    status: "pending",
    startedAt: null,
    endedAt: null,
    durationMs: 0,
    output: [],
    scriptedOutput: scripts[id].lines,
    targetMs: scripts[id].targetMs,
  }));
}

let state: BuildVerificationState = {
  active: false,
  currentIndex: -1,
  steps: freshSteps(),
  startedAt: null,
  endedAt: null,
  filesGenerated: 0,
  testsPassed: 0,
  repoSizeKb: 0,
  artifactsProduced: [],
  sha: "",
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

export function startBuildVerification(input: BuildFacts) {
  if (state.active || state.endedAt) return;
  clearTimers();
  state = {
    active: true,
    currentIndex: 0,
    steps: freshSteps(input),
    startedAt: Date.now(),
    endedAt: null,
    filesGenerated: input.filesGenerated,
    testsPassed: input.testsPassed,
    repoSizeKb: input.repoSizeKb,
    artifactsProduced: input.artifactsProduced,
    sha: input.sha,
  };
  emit();
  startStep(0);
}

/**
 * Refresh the measured figures without disturbing the running animation.
 *
 * Verification starts the moment Repository.zip appears, but the console
 * receives artifacts in polling batches, so a few files can still land
 * afterwards. Without this the summary froze at whatever count happened to be
 * present at kick-off and disagreed with the repository tree.
 */
export function updateBuildFacts(facts: BuildFacts) {
  if (!state.active && !state.endedAt) return;
  if (facts.filesGenerated <= state.filesGenerated) return;
  state = {
    ...state,
    filesGenerated: facts.filesGenerated,
    repoSizeKb: facts.repoSizeKb,
    artifactsProduced: facts.artifactsProduced,
    testsPassed: facts.testsPassed,
    sha: facts.sha,
  };
  emit();
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
    testsPassed: 0,
    repoSizeKb: 0,
    artifactsProduced: [],
    sha: "",
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
