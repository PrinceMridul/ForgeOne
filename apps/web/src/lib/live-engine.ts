/**
 * ForgeOne live execution engine — backend-connected.
 *
 * Polls /api/v1/runs/:id, /events, /artifacts every 1.5 s and maps the
 * backend state into the same EngineState shape the UI components already use.
 *
 * Components subscribed via `useLiveEngine()` need zero changes.
 * All animations remain intact — they react to real backend data.
 *
 * To start streaming call `connectToRun(runId)`.
 * To tear down call `disconnectFromRun()`.
 */

import { useEffect, useSyncExternalStore } from "react";
import type React from "react";
import {
  Compass,
  Code2,
  Eye,
  FlaskConical,
  ShieldCheck,
  Server,
  ClipboardList,
  BookOpen,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Agent, ActivityEvent } from "./mock-data";
import { api, ApiError } from "./api-client";
import type { WorkflowRun, ExecutionEvent, BackendArtifact } from "./api-client";
import { resetBuildVerification } from "./build-verification";

// Re-export types components already import from here
export type { Agent, ActivityEvent };

// ─── Public types ───────────────────────────────────────────────────────────

export type LogLevel = "info" | "warn" | "error" | "debug";

/**
 * `idle` — no run attached. `connecting` — attached, first poll outstanding.
 * `missing` — the API answered but has no such run, which is the normal
 * outcome for a shared or bookmarked URL after the server restarted, since
 * runs are held in memory. Distinct from `offline` so we don't send someone
 * debugging a healthy API.
 */
export type ConnectionState = "idle" | "connecting" | "live" | "offline" | "missing";

export interface LogLine {
  id: string;
  ts: string;
  agentId: string;
  agentName: string;
  level: LogLevel;
  msg: string;
  /**
   * The backend event type this line came from. Kept so surfaces can tell an
   * agent narrating its reasoning ("Recognised the brief as a healthcare
   * product") apart from one reporting a discrete step ("FILE_CREATED: …"),
   * instead of labelling both the same way.
   */
  kind: "reasoning" | "step" | "error";
}

export interface MetricPoint {
  t: number;
  tokens: number;
  runtimeMs: number;
  memoryMb: number;
}

export interface Artifact {
  id: string;
  runId: string;
  name: string;
  kind: "build" | "code" | "test" | "security" | "spec" | "db" | "doc" | "image";
  size: string;
  when: string;
  agent: string;
  sha: string;
  content?: string;
  mimeType?: string;
  /**
   * True when this artifact is an entry in Repository.zip. The repository
   * tree shows only these, so its file count always equals the download.
   */
  inRepository: boolean;
}

export interface Run {
  id: string;
  title: string;
  branch: string;
  startedAt: string;
  duration: string;
  status: "success" | "running" | "failed" | "warning";
  agents: number;
  tokens: number;
  commits: number;
}

export interface CommEdge {
  from: string;
  to: string;
  strength: number;
  lastMs: number;
}

export type PipelineStage =
  "waiting" | "running" | "generating" | "validating" | "completed" | "failed";

export interface PipelineArtifact {
  name: string;
  kind: Artifact["kind"] | "prompt" | "deploy";
}

export interface PipelineNode {
  agentId: string;
  order: number;
  stage: PipelineStage;
  progress: number;
  elapsedMs: number;
  startedAtTick: number | null;
  inputs: PipelineArtifact[];
  outputs: PipelineArtifact[];
  producedOutputs: string[];
  currentArtifact?: string;
  stageLabel: string;
}

export interface FlyingArtifact {
  id: string;
  name: string;
  kind: string;
  fromAgent: string;
  toAgent: string;
  bornTick: number;
}

export interface EngineState {
  tick: number;
  runningRunId: string;
  agents: Agent[];
  logs: LogLine[];
  events: ActivityEvent[];
  metrics: MetricPoint[];
  artifacts: Artifact[];
  runs: Run[];
  comm: CommEdge[];
  pipeline: PipelineNode[];
  producedArtifacts: string[];
  flying: FlyingArtifact[];
  playback: { playing: boolean; speed: number; position: number };
  /** Raw backend run — undefined when no run is active. */
  backendRun: WorkflowRun | null;
  /** Whether the most recent poll succeeded. */
  isConnected: boolean;
  /**
   * Connection lifecycle, distinguishing "haven't reached the API yet" from
   * "reached it and then lost it". `isConnected` alone cannot tell those
   * apart, which would make a starting run flash as offline.
   */
  connection: ConnectionState;
}

// ─── Pipeline definition ─────────────────────────────────────────────────────

/**
 * The dependency graph the console draws.
 *
 * This mirrors STAGE_CONFIGS in apps/api/src/orchestrator/pipeline.ts, which is
 * what actually gates execution — an agent does not start until every artifact
 * type listed as an input exists. The names here are the real filenames the
 * pipeline emits, so `producedOutputs` matching against live artifact names
 * resolves instead of silently never matching. Keep the two in step: a stage
 * drawn with inputs the backend does not require is a diagram of a system that
 * does not exist.
 */
export const PIPELINE_DEF: Array<{
  agentId: string;
  inputs: PipelineArtifact[];
  outputs: PipelineArtifact[];
}> = [
  {
    agentId: "pm",
    inputs: [{ name: "Prompt", kind: "prompt" }],
    outputs: [
      { name: "PRD.md", kind: "spec" },
      { name: "Tasks.json", kind: "spec" },
    ],
  },
  {
    agentId: "architect",
    inputs: [
      { name: "PRD.md", kind: "spec" },
      { name: "Tasks.json", kind: "spec" },
    ],
    outputs: [{ name: "Architecture.md", kind: "doc" }],
  },
  {
    agentId: "developer",
    inputs: [
      { name: "PRD.md", kind: "spec" },
      { name: "Tasks.json", kind: "spec" },
      { name: "Architecture.md", kind: "doc" },
    ],
    outputs: [
      { name: "Source files", kind: "code" },
      { name: "Repository.zip", kind: "build" },
    ],
  },
  {
    agentId: "reviewer",
    inputs: [
      { name: "Source files", kind: "code" },
      { name: "Architecture.md", kind: "doc" },
    ],
    outputs: [{ name: "PRReview.md", kind: "doc" }],
  },
  {
    agentId: "tester",
    inputs: [{ name: "Source files", kind: "code" }],
    outputs: [{ name: "TestReport.md", kind: "test" }],
  },
  {
    agentId: "security",
    inputs: [{ name: "Source files", kind: "code" }],
    outputs: [{ name: "SecurityAudit.md", kind: "security" }],
  },
  {
    agentId: "devops",
    inputs: [{ name: "Source files", kind: "code" }],
    outputs: [{ name: "DeploymentPlan.md", kind: "deploy" }],
  },
  {
    agentId: "documentation",
    inputs: [
      { name: "PRD.md", kind: "spec" },
      { name: "Tasks.json", kind: "spec" },
      { name: "Architecture.md", kind: "doc" },
      { name: "Source files", kind: "code" },
      { name: "PRReview.md", kind: "doc" },
      { name: "TestReport.md", kind: "test" },
      { name: "SecurityAudit.md", kind: "security" },
      { name: "DeploymentPlan.md", kind: "deploy" },
    ],
    outputs: [
      { name: "ProjectOverview.md", kind: "doc" },
      { name: "SummaryReport.md", kind: "doc" },
    ],
  },
];

// ─── Static graph exports (shapes used by graph components) ──────────────────

export const architectureNodes = [
  { id: "web", label: "Web App", kind: "client", x: 60, y: 60 },
  { id: "edge", label: "Edge Gateway", kind: "edge", x: 220, y: 60 },
  { id: "api", label: "API Service", kind: "service", x: 380, y: 60 },
  { id: "auth", label: "Auth", kind: "service", x: 380, y: 180 },
  { id: "queue", label: "Redpanda", kind: "queue", x: 540, y: 60 },
  { id: "db", label: "Postgres", kind: "db", x: 540, y: 180 },
  { id: "cache", label: "KV Cache", kind: "cache", x: 220, y: 180 },
  { id: "worker", label: "Workers", kind: "service", x: 700, y: 60 },
  { id: "obs", label: "Observability", kind: "obs", x: 700, y: 180 },
] as const;

export const architectureEdges = [
  { from: "web", to: "edge" },
  { from: "edge", to: "api" },
  { from: "edge", to: "cache" },
  { from: "api", to: "auth" },
  { from: "api", to: "queue" },
  { from: "api", to: "db" },
  { from: "queue", to: "worker" },
  { from: "worker", to: "db" },
  { from: "worker", to: "obs" },
  { from: "api", to: "obs" },
] as const;

export const dependencyNodes = [
  { id: "react", label: "react", group: "runtime", x: 80, y: 60 },
  { id: "tanstack", label: "@tanstack/router", group: "runtime", x: 260, y: 60 },
  { id: "start", label: "@tanstack/start", group: "runtime", x: 440, y: 60 },
  { id: "zod", label: "zod", group: "util", x: 80, y: 180 },
  { id: "drizzle", label: "drizzle-orm", group: "data", x: 260, y: 180 },
  { id: "pg", label: "postgres", group: "data", x: 440, y: 180 },
  { id: "wrangler", label: "wrangler", group: "infra", x: 620, y: 60 },
  { id: "vitest", label: "vitest", group: "test", x: 620, y: 180 },
  { id: "tailwind", label: "tailwindcss", group: "ui", x: 80, y: 300 },
  { id: "shadcn", label: "shadcn/ui", group: "ui", x: 260, y: 300 },
] as const;

export const dependencyEdges = [
  { from: "start", to: "react" },
  { from: "start", to: "tanstack" },
  { from: "tanstack", to: "react" },
  { from: "shadcn", to: "tailwind" },
  { from: "shadcn", to: "react" },
  { from: "drizzle", to: "pg" },
  { from: "vitest", to: "zod" },
  { from: "wrangler", to: "start" },
] as const;

// ─── Agent definitions ───────────────────────────────────────────────────────

interface AgentDef {
  id: string;
  backendType: string;
  name: string;
  role: Agent["role"];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: LucideIcon | any;
  accent: string;
  tokenBudget: number;
}

const AGENT_DEFS: AgentDef[] = [
  {
    id: "pm",
    backendType: "PRODUCT_MANAGER",
    name: "Vera",
    role: "Project Manager",
    icon: ClipboardList,
    accent: "warning",
    tokenBudget: 40_000,
  },
  {
    id: "architect",
    backendType: "ARCHITECT",
    name: "Athena",
    role: "Architect",
    icon: Compass,
    accent: "chart-1",
    tokenBudget: 120_000,
  },
  {
    id: "developer",
    backendType: "DEVELOPER",
    name: "Kai",
    role: "Developer",
    icon: Code2,
    accent: "primary",
    tokenBudget: 200_000,
  },
  {
    id: "reviewer",
    backendType: "REVIEWER",
    name: "Isla",
    role: "Reviewer",
    icon: Eye,
    accent: "chart-4",
    tokenBudget: 80_000,
  },
  {
    id: "tester",
    backendType: "TESTER",
    name: "Rin",
    role: "Tester",
    icon: FlaskConical,
    accent: "chart-2",
    tokenBudget: 100_000,
  },
  {
    id: "security",
    backendType: "SECURITY",
    name: "Nyx",
    role: "Security",
    icon: ShieldCheck,
    accent: "destructive",
    tokenBudget: 60_000,
  },
  {
    id: "devops",
    backendType: "DEVOPS",
    name: "Orion",
    role: "DevOps",
    icon: Server,
    accent: "info",
    tokenBudget: 80_000,
  },
  {
    id: "documentation",
    backendType: "DOCUMENTATION",
    name: "Lyra",
    role: "Documentation",
    icon: BookOpen,
    accent: "chart-3",
    tokenBudget: 40_000,
  },
];

const BACKEND_TO_AGENT_ID = Object.fromEntries(AGENT_DEFS.map((d) => [d.backendType, d.id]));

// ─── Helper utilities ────────────────────────────────────────────────────────

export function stageLabelFor(stage: PipelineStage): string {
  switch (stage) {
    case "waiting":
      return "Waiting for inputs";
    case "running":
      return "Running";
    case "generating":
      return "Generating artifact";
    case "validating":
      return "Validating";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

/**
 * Classify an artifact for the explorer's filter chips and badges.
 *
 * Order matters: specs end in `.ts` too, so they must be matched before the
 * source-code rule. Without a `code` kind every generated `.ts` file fell
 * through to `doc`, which made the filters useless and labelled source files
 * as documents.
 */
function mimeToKind(mimeType: string, filename: string): Artifact["kind"] {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".zip") || lower.endsWith(".tar.gz")) return "build";
  if (lower.includes("coverage") && lower.endsWith(".html")) return "test";
  if (lower.startsWith("tests/") || lower.includes(".spec.") || lower.includes(".test."))
    return "test";
  if (lower.includes("sast") || lower.includes("security")) return "security";
  if (lower.endsWith(".sql")) return "db";
  if (lower.endsWith(".yaml") || lower.endsWith(".yml") || lower.endsWith(".json")) return "spec";
  if (lower === "dockerfile" || lower.endsWith("/dockerfile") || lower.endsWith(".toml"))
    return "spec";
  if (/\.(tsx?|jsx?|mjs|cjs|py|go|rs|rb|java)$/.test(lower)) return "code";
  if (lower.endsWith(".md")) return "doc";
  if (mimeType.startsWith("image/")) return "image";
  return "doc";
}

function formatRelative(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function msToClock(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function shortSha(seed: string): string {
  let h = 0;
  for (const c of seed) h = ((h << 5) - h + c.charCodeAt(0)) | 0;
  return Math.abs(h).toString(16).slice(0, 7).padStart(7, "0");
}

// ─── State builders ──────────────────────────────────────────────────────────

/**
 * Progress of the agent currently holding the pipeline, 0-100.
 * Prefers the backend's per-stage figure; falls back to overall run progress
 * for older API responses that predate `stageProgress`.
 */
function activeAgentProgress(run: WorkflowRun | null): number {
  return run?.stageProgress ?? run?.stepProgress ?? 0;
}

function buildAgents(
  run: WorkflowRun | null,
  tick: number,
  elapsedByAgent: Map<string, number>,
): Agent[] {
  const currentId = run?.currentAgent ? (BACKEND_TO_AGENT_ID[run.currentAgent] ?? null) : null;
  const completedSteps = run?.completedSteps ?? 0;
  const overallPct = activeAgentProgress(run);

  return AGENT_DEFS.map((def, i) => {
    const done = i < completedSteps;
    const active = def.id === currentId;

    let status: Agent["status"] = "idle";
    if (done) status = "done";
    else if (active) status = tick % 3 === 0 ? "thinking" : "working";

    const progress = done ? 100 : active ? Math.min(95, overallPct) : 0;
    const tokensUsed = done
      ? Math.floor(def.tokenBudget * 0.55)
      : active
        ? Math.min(def.tokenBudget, Math.floor(def.tokenBudget * 0.3 + tick * 160))
        : 0;

    return {
      id: def.id,
      role: def.role,
      name: def.name,
      icon: def.icon,
      status,
      progress,
      currentTask: active
        ? `Running autonomous ${def.role.toLowerCase()} pipeline…`
        : done
          ? "Completed"
          : "Waiting",
      tokensUsed: Math.min(def.tokenBudget, tokensUsed),
      tokenBudget: def.tokenBudget,
      duration: msToClock(elapsedByAgent.get(def.id) ?? 0),
      memoryMb: done ? 256 : active ? 256 + (tick % 10) * 8 : 0,
      accent: def.accent,
      logs: [],
    };
  });
}

/**
 * Wall-clock time each agent held the pipeline, measured from its own events.
 *
 * Every event carries a real timestamp and an agent, so a stage's span is the
 * distance between its first and last event. This replaced a flat `30_000`
 * that made every agent card read "30s" regardless of what happened — a number
 * that looked measured and was not.
 *
 * A stage that emitted a single event has no span; it reports 0 and the card
 * omits the figure rather than rounding a real 8ms up to a fake second.
 */
function stageElapsedMs(events: ExecutionEvent[]): Map<string, number> {
  const bounds = new Map<string, { first: number; last: number }>();

  for (const event of events) {
    const agentId = BACKEND_TO_AGENT_ID[event.agentType];
    if (!agentId) continue;
    const at = new Date(event.timestamp).getTime();
    if (!Number.isFinite(at)) continue;

    const current = bounds.get(agentId);
    if (!current) bounds.set(agentId, { first: at, last: at });
    else {
      if (at < current.first) current.first = at;
      if (at > current.last) current.last = at;
    }
  }

  return new Map([...bounds].map(([agentId, b]) => [agentId, Math.max(0, b.last - b.first)]));
}

function buildPipeline(
  run: WorkflowRun | null,
  artifactNames: Set<string>,
  elapsedByAgent: Map<string, number>,
): PipelineNode[] {
  const currentId = run?.currentAgent ? (BACKEND_TO_AGENT_ID[run.currentAgent] ?? null) : null;
  const completedSteps = run?.completedSteps ?? 0;
  const hasSourceFiles = artifactNames.has("Repository.zip");

  return PIPELINE_DEF.map((def, i) => {
    const done = i < completedSteps;
    const active = def.agentId === currentId;

    const stagePct = activeAgentProgress(run);

    let stage: PipelineStage = "waiting";
    if (done) {
      stage = "completed";
    } else if (active) {
      if (stagePct < 20) stage = "running";
      else if (stagePct < 65) stage = "generating";
      else stage = "validating";
    }

    const progress = done ? 100 : active ? stagePct : 0;
    // "Source files" stands for the repository the Developer emits, which is
    // many artifacts rather than one named file; every other output is a real
    // filename and matches the live artifact set directly.
    const emitted = (name: string) =>
      name === "Source files" ? hasSourceFiles : artifactNames.has(name);
    const producedOutputs = done
      ? def.outputs.map((o) => o.name)
      : def.outputs.filter((o) => emitted(o.name)).map((o) => o.name);

    return {
      agentId: def.agentId,
      order: i,
      stage,
      progress,
      elapsedMs: elapsedByAgent.get(def.agentId) ?? 0,
      startedAtTick: done || active ? 0 : null,
      inputs: def.inputs,
      outputs: def.outputs,
      producedOutputs,
      currentArtifact: active && stage === "generating" ? def.outputs[0]?.name : undefined,
      stageLabel: stageLabelFor(stage),
    };
  });
}

/**
 * Producer → consumer edges, derived from PIPELINE_DEF rather than listed by
 * hand. An edge exists exactly when one stage's output is another stage's
 * declared input, so this graph cannot drift out of step with the pipeline the
 * backend actually gates on. The previous hardcoded list drew edges that ran
 * backwards (reviewer → developer) and omitted the Documentation stage
 * entirely.
 */
function buildComm(currentAgentId: string | null): CommEdge[] {
  const now = Date.now();
  const producerOf = new Map<string, string>();
  for (const stage of PIPELINE_DEF) {
    for (const output of stage.outputs) producerOf.set(output.name, stage.agentId);
  }

  const seen = new Set<string>();
  const base: CommEdge[] = [];
  for (const stage of PIPELINE_DEF) {
    for (const input of stage.inputs) {
      const from = producerOf.get(input.name);
      if (!from || from === stage.agentId) continue;
      const key = `${from}->${stage.agentId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      base.push({ from, to: stage.agentId, strength: 0.3, lastMs: now });
    }
  }
  if (!currentAgentId) return base;
  return base.map((e) =>
    e.from === currentAgentId || e.to === currentAgentId ? { ...e, strength: 0.9 } : e,
  );
}

function eventsToLogs(events: ExecutionEvent[]): LogLine[] {
  return events
    .filter((e) => e.eventType === "LOG" || e.eventType === "STEP" || e.eventType === "ERROR")
    .map((e) => {
      const agentId = BACKEND_TO_AGENT_ID[e.agentType] ?? e.agentType.toLowerCase();
      const def = AGENT_DEFS.find((d) => d.id === agentId);
      let level: LogLevel = "info";
      if (e.eventType === "ERROR") level = "error";
      else if (e.message.toLowerCase().includes("warn")) level = "warn";
      return {
        id: e.id,
        ts: new Date(e.timestamp).toTimeString().slice(0, 8),
        agentId,
        agentName: def?.name ?? agentId,
        level,
        msg: e.message,
        kind: e.eventType === "ERROR" ? "error" : e.eventType === "STEP" ? "step" : "reasoning",
      } as LogLine;
    });
}

function eventsToActivity(events: ExecutionEvent[]): ActivityEvent[] {
  return events
    .filter(
      (e) =>
        e.eventType === "STEP" || e.eventType === "ARTIFACT" || e.eventType === "STATUS_CHANGE",
    )
    .map((e) => {
      const agentId = BACKEND_TO_AGENT_ID[e.agentType] ?? e.agentType.toLowerCase();
      const def = AGENT_DEFS.find((d) => d.id === agentId);

      let type: ActivityEvent["type"] = "plan";
      if (e.eventType === "ARTIFACT") type = "commit";
      else if (e.eventType === "STATUS_CHANGE") type = "deploy";

      return {
        id: e.id,
        ts: new Date(e.timestamp).toTimeString().slice(0, 8),
        agent: def ? `${def.name} · ${def.role}` : agentId,
        type,
        title: e.message,
        detail: e.payload ? (JSON.stringify(e.payload) as string).slice(0, 80) : undefined,
        status: e.eventType === "ERROR" ? ("failed" as const) : ("success" as const),
      };
    })
    .reverse();
}

function backendArtifactsToFrontend(list: BackendArtifact[]): Artifact[] {
  return list.map((a) => {
    const agentId = BACKEND_TO_AGENT_ID[a.agentType] ?? a.agentType.toLowerCase();
    const def = AGENT_DEFS.find((d) => d.id === agentId);
    return {
      id: a.id,
      runId: a.runId,
      name: a.filename,
      kind: mimeToKind(a.mimeType, a.filename),
      size: formatBytes(a.sizeBytes),
      when: formatRelative(a.createdAt),
      agent: def?.name ?? agentId,
      sha: shortSha(a.id),
      content: a.content,
      mimeType: a.mimeType,
      inRepository: a.inRepository ?? false,
    };
  });
}

function backendRunToFrontend(run: WorkflowRun): Run {
  const statusMap: Record<string, Run["status"]> = {
    PENDING: "running",
    RUNNING: "running",
    COMPLETED: "success",
    FAILED: "failed",
    CANCELLED: "warning",
  };
  const elapsed = run.completedAt
    ? new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()
    : Date.now() - new Date(run.startedAt).getTime();
  const s = Math.floor(elapsed / 1000);
  const duration = `${String(Math.floor(s / 60)).padStart(2, "0")}m ${String(s % 60).padStart(2, "0")}s`;

  return {
    id: run.id,
    title: run.title,
    branch: "main",
    startedAt: new Date(run.startedAt).toTimeString().slice(0, 8),
    duration,
    status: statusMap[run.status] ?? "running",
    agents: run.totalSteps,
    tokens: run.completedSteps * 50_000,
    commits: run.completedSteps,
  };
}

// ─── Store initialisation ────────────────────────────────────────────────────

function initialMetrics(): MetricPoint[] {
  const now = Date.now();
  return Array.from({ length: 40 }, (_, i) => ({
    t: now - (40 - i) * 1500,
    tokens: 900 + Math.sin(i / 3) * 250,
    runtimeMs: 220 + Math.cos(i / 4) * 60,
    memoryMb: 1600 + Math.sin(i / 5) * 180,
  }));
}

function initialState(): EngineState {
  const metrics = initialMetrics();
  return {
    tick: 0,
    runningRunId: "",
    agents: buildAgents(null, 0, new Map()),
    logs: [],
    events: [],
    metrics,
    artifacts: [],
    runs: [],
    comm: buildComm(null),
    pipeline: buildPipeline(null, new Set(), new Map()),
    producedArtifacts: ["Prompt"],
    flying: [],
    playback: { playing: true, speed: 1, position: metrics.length - 1 },
    backendRun: null,
    isConnected: false,
    connection: "idle",
  };
}

let state: EngineState = initialState();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

// ─── Polling loop ─────────────────────────────────────────────────────────────

let pollInterval: ReturnType<typeof setInterval> | null = null;
let currentRunId: string | null = null;
let tickCounter = 0;

async function poll(): Promise<void> {
  if (!currentRunId) return;
  tickCounter++;
  const t = tickCounter;

  try {
    const [run, events, backendArtifacts] = await Promise.all([
      api.getRun(currentRunId),
      api.getEvents(currentRunId),
      api.getArtifacts(currentRunId),
    ]);

    const artifactNames = new Set(backendArtifacts.map((a) => a.filename));
    const currentAgentId = run.currentAgent
      ? (BACKEND_TO_AGENT_ID[run.currentAgent] ?? null)
      : null;

    const logs = eventsToLogs(events);
    const activityEvents = eventsToActivity(events);
    const artifacts = backendArtifactsToFrontend(backendArtifacts);
    const elapsedByAgent = stageElapsedMs(events);
    const pipeline = buildPipeline(run, artifactNames, elapsedByAgent);
    const agents = buildAgents(run, t, elapsedByAgent);
    const comm = buildComm(currentAgentId);

    // Detect newly arrived artifact names for flying animations
    const prevNames = new Set(state.artifacts.map((a) => a.name));
    const newlyProduced: Array<{ name: string; kind: string; fromAgent: string }> = [];
    for (const name of artifactNames) {
      if (!prevNames.has(name)) {
        const bk = backendArtifacts.find((a) => a.filename === name);
        if (bk) {
          const fromAgent = BACKEND_TO_AGENT_ID[bk.agentType] ?? bk.agentType.toLowerCase();
          newlyProduced.push({
            name,
            kind: mimeToKind(bk.mimeType, name),
            fromAgent,
          });
        }
      }
    }

    // Build flying artifacts
    const flying: FlyingArtifact[] = state.flying.filter((f) => t - f.bornTick < 4);
    for (const np of newlyProduced) {
      for (const consumer of PIPELINE_DEF) {
        if (consumer.inputs.some((i) => i.name === np.name)) {
          flying.push({
            id: `fly-${t}-${np.name}-${consumer.agentId}`,
            name: np.name,
            kind: np.kind,
            fromAgent: np.fromAgent,
            toAgent: consumer.agentId,
            bornTick: t,
          });
        }
      }
    }

    // Synthesise one metric point per poll to keep charts alive
    const last = state.metrics[state.metrics.length - 1]!;
    const metrics = [
      ...state.metrics.slice(-59),
      {
        t: Date.now(),
        tokens: Math.max(200, last.tokens + (Math.random() - 0.45) * 180),
        runtimeMs: Math.max(90, last.runtimeMs + (Math.random() - 0.5) * 50),
        memoryMb: Math.max(800, last.memoryMb + (Math.random() - 0.5) * 90),
      },
    ];

    // Update run history
    const frontendRun = backendRunToFrontend(run);
    const runs = [frontendRun, ...state.runs.filter((r) => r.id !== run.id)].slice(0, 20);

    const playback = state.playback.playing
      ? { ...state.playback, position: metrics.length - 1 }
      : state.playback;

    state = {
      ...state,
      tick: t,
      runningRunId: run.id,
      agents,
      logs,
      events: activityEvents,
      metrics,
      artifacts,
      runs,
      comm,
      pipeline,
      producedArtifacts: ["Prompt", ...Array.from(artifactNames)],
      flying,
      playback,
      backendRun: run,
      isConnected: true,
      connection: "live",
    };
    emit();

    // Stop polling once the run reaches a terminal state
    if (run.status === "COMPLETED" || run.status === "FAILED" || run.status === "CANCELLED") {
      stopPolling();
    }
  } catch (err) {
    // A 404 means the API is healthy and the run simply isn't there — retrying
    // will never help, so stop rather than hammering the endpoint.
    if (err instanceof ApiError && err.status === 404) {
      stopPolling();
      state = { ...state, isConnected: false, connection: "missing" };
      emit();
      return;
    }
    console.error("[ForgeOne engine] poll failed:", err);
    state = { ...state, isConnected: false, connection: "offline" };
    emit();
  }
}

function startPolling(runId: string): void {
  stopPolling();
  currentRunId = runId;
  tickCounter = 0;
  state = { ...state, connection: "connecting" };
  emit();
  void poll();
  pollInterval = setInterval(poll, 1500);
}

function stopPolling(): void {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

// ─── External store ───────────────────────────────────────────────────────────

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useLiveEngine(): EngineState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
}

// ─── Public controls ──────────────────────────────────────────────────────────

export function setPlayback(patch: Partial<EngineState["playback"]>): void {
  state = { ...state, playback: { ...state.playback, ...patch } };
  emit();
}

export function selectRun(id: string): void {
  state = { ...state, runningRunId: id };
  emit();
}

/**
 * Connect the engine to a live backend run.
 * Call this from a `useEffect` in the run page.
 */
export function connectToRun(runId: string): void {
  // The build-verification store latches on `endedAt` and refuses to restart.
  // Clear it here so every run replays the CI pipeline, not just the first
  // one after a full page load.
  resetBuildVerification();
  startPolling(runId);
}

/**
 * Stop polling and reset to idle state.
 * Call this in the `useEffect` cleanup function.
 */
export function disconnectFromRun(): void {
  stopPolling();
  currentRunId = null;
  const { runs } = state; // preserve run history
  state = { ...initialState(), runs };
  emit();
}

/** Auto-scroll helper for log viewer components. */
export function useAutoScrollTo(ref: React.RefObject<HTMLElement | null>, dep: unknown): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [ref, dep]);
}
