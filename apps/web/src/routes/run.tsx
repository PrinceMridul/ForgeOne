import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect } from "react";
import { useLiveEngine, setPlayback, connectToRun, disconnectFromRun } from "@/lib/live-engine";
import { api } from "@/lib/api-client";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { AgentCard } from "@/components/agent-card";
import { LiveLogViewer } from "@/components/live-log-viewer";
import { ArtifactExplorer } from "@/components/artifact-explorer";
import { ArchitectureGraph, DependencyGraph, AgentCommGraph } from "@/components/graphs";
import { GeneratedFiles } from "@/components/generated-files";
import { ThinkingTimeline } from "@/components/thinking-timeline";
import { PipelineFlow } from "@/components/pipeline-flow";
import { BuildVerification } from "@/components/build-verification";
import {
  ArrowLeft,
  Pause,
  Play,
  Rewind,
  FastForward,
  RotateCcw,
  Coins,
  DollarSign,
  Timer,
  Cpu,
  Rocket,
  Sparkles,
  WifiOff,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  prompt: z.string().optional().default(""),
  runId: z.string().optional().default(""),
});

export const Route = createFileRoute("/run")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Live run — ForgeOne" },
      {
        name: "description",
        content: "Watch a full AI engineering team execute your idea in real time.",
      },
      { property: "og:title", content: "Live run — ForgeOne" },
      {
        property: "og:description",
        content: "Streaming logs, artifacts, and graphs as the team ships your idea.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LiveRun,
});

function LiveRun() {
  const { prompt, runId } = Route.useSearch();
  const engine = useLiveEngine();
  const { agents, playback, metrics, backendRun, connection } = engine;

  // Connect to the backend run whenever the runId changes
  useEffect(() => {
    if (!runId) return;
    connectToRun(runId);
    return () => {
      disconnectFromRun();
    };
  }, [runId]);

  const overall = Math.round(
    agents.reduce((n, a) => n + a.progress, 0) / Math.max(1, agents.length),
  );
  const totalTokens = agents.reduce((n, a) => n + a.tokensUsed, 0);
  const cost = (totalTokens / 1000) * 0.008; // mock rate
  const latest = metrics[metrics.length - 1];

  // Real elapsed time from the backend run, not the chart's frame count —
  // the metrics buffer is pre-seeded with 40 points, which made a
  // just-started run read "00:36" before any agent had moved.
  const runtimeSec = backendRun
    ? Math.max(
        0,
        Math.floor(
          ((backendRun.completedAt ? new Date(backendRun.completedAt).getTime() : Date.now()) -
            new Date(backendRun.startedAt).getTime()) /
            1000,
        ),
      )
    : 0;
  const runtime = `${String(Math.floor(runtimeSec / 60)).padStart(2, "0")}:${String(runtimeSec % 60).padStart(2, "0")}`;

  // Gate the ship action on the artifact existing, not on a progress number.
  const deploymentPlanReady =
    Boolean(runId) && engine.artifacts.some((a) => a.name === "DeploymentPlan.md");

  const displayPrompt =
    prompt || "Build a Notion-style docs app with realtime cursors and a Postgres backend.";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-[1600px] px-4 py-2.5 flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="gap-1.5">
            <Link to="/">
              <ArrowLeft className="h-3.5 w-3.5" /> New idea
            </Link>
          </Button>
          <div className="hidden md:block h-6 w-px bg-border" />
          <Logo />
          <div className="hidden md:flex items-center gap-2 ml-2 text-[11px] text-muted-foreground">
            <span className="font-mono">{runId ? runId.slice(0, 8) : "no-run"}</span>
            <span>·</span>
            {connection === "missing" ? (
              <span
                className="inline-flex items-center gap-1 text-warning"
                title="Runs are held in memory, so they do not survive an API restart."
              >
                <AlertTriangle className="h-3 w-3" />
                run not found
              </span>
            ) : connection === "offline" ? (
              <span
                className="inline-flex items-center gap-1 text-warning"
                title="Cannot reach the ForgeOne API. Start it with `pnpm --filter @forgeone/api dev`."
              >
                <WifiOff className="h-3 w-3" />
                API offline
              </span>
            ) : backendRun?.status === "COMPLETED" ? (
              <span className="text-success">done</span>
            ) : backendRun?.status === "FAILED" ? (
              <span className="text-destructive">failed</span>
            ) : connection === "connecting" ? (
              <span className="text-muted-foreground">connecting…</span>
            ) : runId ? (
              <span className="inline-flex items-center gap-1 text-success">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inset-0 rounded-full bg-success animate-ping opacity-75" />
                  <span className="relative rounded-full h-1.5 w-1.5 bg-success" />
                </span>
                live
              </span>
            ) : (
              <span className="text-muted-foreground">idle</span>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <MetricPill icon={Timer} label="Runtime" value={runtime} />
            <MetricPill icon={Coins} label="Tokens" value={`${(totalTokens / 1000).toFixed(1)}k`} />
            <MetricPill icon={DollarSign} label="Cost" value={`$${cost.toFixed(2)}`} />
            <MetricPill
              icon={Cpu}
              label="Memory"
              value={`${(latest.memoryMb / 1024).toFixed(2)} GB`}
            />
          </div>
        </div>

        {/* Prompt banner */}
        <div className="mx-auto max-w-[1600px] px-4 pb-3">
          <div className="rounded-lg border border-border bg-card/60 px-3 py-2 flex items-start gap-3">
            <div className="h-7 w-7 shrink-0 rounded-md bg-gradient-primary flex items-center justify-center shadow-glow">
              <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Your idea
              </p>
              <p className="text-sm truncate">{displayPrompt}</p>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <div className="w-40 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-gradient-primary transition-[width] duration-700"
                  style={{ width: `${overall}%` }}
                />
              </div>
              <span className="text-xs tabular-nums w-9 text-right">{overall}%</span>
            </div>
          </div>
        </div>

        {/* Replay controls */}
        <div className="mx-auto max-w-[1600px] px-4 pb-2 flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border border-border bg-card/60 p-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => setPlayback({ playing: false, position: 0 })}
              title="Restart"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() =>
                setPlayback({ playing: false, position: Math.max(0, playback.position - 5) })
              }
              title="Rewind"
            >
              <Rewind className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="default"
              className="h-7 w-7"
              onClick={() => setPlayback({ playing: !playback.playing })}
              title={playback.playing ? "Pause" : "Resume"}
            >
              {playback.playing ? (
                <Pause className="h-3.5 w-3.5" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() =>
                setPlayback({
                  playing: false,
                  position: Math.min(metrics.length - 1, playback.position + 5),
                })
              }
              title="Fast forward"
            >
              <FastForward className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex items-center gap-1 rounded-md border border-border bg-card/60 p-1 text-[11px]">
            <span className="px-2 text-muted-foreground">Speed</span>
            {[0.5, 1, 2, 4].map((s) => (
              <button
                key={s}
                onClick={() => setPlayback({ speed: s })}
                className={cn(
                  "h-6 px-2 rounded transition-colors",
                  playback.speed === s ? "bg-primary text-primary-foreground" : "hover:bg-accent",
                )}
              >
                {s}×
              </button>
            ))}
          </div>
          <input
            type="range"
            min={0}
            max={metrics.length - 1}
            value={playback.position}
            onChange={(e) => setPlayback({ playing: false, position: Number(e.target.value) })}
            className="flex-1 accent-primary"
            aria-label="Scrubber"
          />
          <span className="text-[10px] text-muted-foreground tabular-nums w-16 text-right">
            frame {playback.position + 1}/{metrics.length}
          </span>
        </div>
      </header>

      {/* Main grid */}
      <main className="mx-auto max-w-[1600px] px-4 py-4 grid grid-cols-12 gap-4">
        {/* LEFT: Agents + thinking */}
        <section className="col-span-12 lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Active agents</p>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {agents.filter((a) => a.status !== "idle" && a.status !== "done").length}/
              {agents.length} active
            </span>
          </div>
          <div className="space-y-3">
            {agents.slice(0, 4).map((a) => (
              <AgentCard key={a.id} agent={a} compact />
            ))}
          </div>
          <ThinkingTimeline height={420} />
        </section>

        {/* CENTER: Pipeline + files + logs */}
        <section className="col-span-12 lg:col-span-6 space-y-4">
          <PipelineFlow />
          <GeneratedFiles height={440} />
          <BuildVerification height={520} />
          <LiveLogViewer height={280} />
        </section>

        {/* RIGHT: Sidebar — artifacts + graphs */}
        <aside className="col-span-12 lg:col-span-3 space-y-4">
          <ArtifactExplorer maxHeight={360} />
          <AgentCommGraph height={280} />
          <ArchitectureGraph height={220} />
          <DependencyGraph height={280} />

          <div className="surface p-4">
            <div className="flex items-center gap-2 mb-2">
              <Rocket className="h-3.5 w-3.5 text-primary" />
              <p className="text-sm font-medium">Ship it</p>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {deploymentPlanReady
                ? "Orion wrote the rollout order, compose topology and required environment for this build."
                : "When DevOps finishes, the rollout plan for this build lands here."}
            </p>
            {/* Hands off the artifact DevOps actually produced rather than
                claiming to deploy something. */}
            <Button
              size="sm"
              className="mt-3 w-full gap-1.5"
              disabled={!deploymentPlanReady}
              asChild={deploymentPlanReady}
            >
              {deploymentPlanReady ? (
                <a
                  href={api.artifactDownloadUrl(runId, "DeploymentPlan.md")}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Rocket className="h-3.5 w-3.5" /> Open deployment plan
                </a>
              ) : (
                <span>Working · {overall}%</span>
              )}
            </Button>
          </div>
        </aside>
      </main>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MetricPill({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="hidden sm:flex items-center gap-2 rounded-md border border-border bg-card/60 px-2.5 py-1.5">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <div className="leading-tight">
        <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-xs font-medium tabular-nums">{value}</p>
      </div>
    </div>
  );
}
