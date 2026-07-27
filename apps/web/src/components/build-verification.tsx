import { useEffect, useRef, useState } from "react";
import { useBuildVerification, type BuildStep, type BuildStepId } from "@/lib/build-verification";
import { useLiveEngine } from "@/lib/live-engine";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  ChevronRight,
  Loader2,
  Circle,
  Download,
  Package,
  ShieldCheck,
  Clock,
  FileCode2,
  FlaskConical,
  Layers,
} from "lucide-react";

/**
 * Live CI/CD verification panel that appears once the Developer emits
 * Repository.zip. Sequential steps with running spinner, checkmark on
 * completion, elapsed timer and an expandable terminal log per step.
 * On completion it renders a Build Summary card that references the
 * downloadable Repository.zip artifact.
 */
export function BuildVerification({ height = 520 }: { height?: number }) {
  const build = useBuildVerification();

  if (!build.active && !build.endedAt) return null;

  return (
    <div className="surface overflow-hidden flex flex-col animate-fade-up" style={{ height }}>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <ShieldCheck
            className={cn("h-4 w-4 shrink-0", build.endedAt ? "text-success" : "text-primary")}
          />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">Build Verification</p>
            <p className="text-[11px] text-muted-foreground truncate font-mono">
              {build.endedAt
                ? "✓ repository verified · ready for deployment"
                : "ci · running Repository.zip through the verification pipeline"}
            </p>
          </div>
        </div>
        <ElapsedBadge startedAt={build.startedAt} endedAt={build.endedAt} />
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {build.steps.map((step, i) => (
          <StepRow key={step.id} step={step} index={i} total={build.steps.length} />
        ))}

        {build.endedAt && <SummaryCard build={build} />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ElapsedBadge({
  startedAt,
  endedAt,
}: {
  startedAt: number | null;
  endedAt: number | null;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (endedAt) {
      setNow(endedAt);
      return;
    }
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, [endedAt]);
  const ms = startedAt ? (endedAt ?? now) - startedAt : 0;
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-border bg-card/60 px-2 py-1 text-[10px] font-mono tabular-nums text-muted-foreground">
      <Clock className="h-3 w-3" />
      {formatDuration(ms)}
    </span>
  );
}

function StepRow({ step, index, total }: { step: BuildStep; index: number; total: number }) {
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const outRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (step.status !== "running") return;
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, [step.status]);

  useEffect(() => {
    if (step.status === "running" && !open) setOpen(true);
    if (step.status === "done" && open) {
      // auto-collapse once next step starts — keep last step open
      const t = setTimeout(() => setOpen(false), 900);
      return () => clearTimeout(t);
    }
  }, [step.status]); // eslint-disable-line

  useEffect(() => {
    const el = outRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [step.output.length]);

  const elapsed = step.startedAt ? (step.endedAt ?? now) - step.startedAt : 0;

  return (
    <div
      className={cn(
        "rounded-md border transition-colors",
        step.status === "running" && "border-primary/40 bg-primary/[0.04]",
        step.status === "done" && "border-success/30 bg-success/[0.03]",
        step.status === "pending" && "border-border bg-card/40",
      )}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-3 py-2 text-left"
        aria-expanded={open}
      >
        <span className="text-base leading-none w-5 text-center">{step.emoji}</span>

        <span className="flex h-5 w-5 items-center justify-center">
          {step.status === "done" && (
            <CheckCircle2 className="h-4 w-4 text-success animate-[scale-in_240ms_ease-out]" />
          )}
          {step.status === "running" && <Loader2 className="h-4 w-4 text-primary animate-spin" />}
          {step.status === "pending" && <Circle className="h-3.5 w-3.5 text-muted-foreground/50" />}
        </span>

        <span className="text-[10px] tabular-nums text-muted-foreground w-8">
          {String(index + 1).padStart(2, "0")}/{String(total).padStart(2, "0")}
        </span>

        <span
          className={cn(
            "text-sm font-medium truncate flex-1",
            step.status === "pending" && "text-muted-foreground",
          )}
        >
          {step.label}
        </span>

        {step.status !== "pending" && (
          <span className="hidden sm:inline text-[10px] font-mono tabular-nums text-muted-foreground">
            {formatDuration(elapsed)}
          </span>
        )}

        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform",
            open && "rotate-90",
          )}
        />
      </button>

      {open && step.status !== "pending" && (
        <div
          ref={outRef}
          className="mx-2 mb-2 max-h-40 overflow-y-auto rounded bg-[oklch(0.12_0.014_265)] border border-border/70 p-2 font-mono text-[11px] leading-relaxed"
        >
          {step.output.length === 0 && (
            <span className="text-muted-foreground">waiting for output…</span>
          )}
          {step.output.map((line, i) => (
            <div key={i} className="animate-fade-in">
              {line.startsWith("$") ? (
                <span className="text-primary">{line}</span>
              ) : line.trim().startsWith("✓") ? (
                <span className="text-success">{line}</span>
              ) : line.trim().startsWith("✗") || line.toLowerCase().includes("failed") ? (
                <span className="text-destructive">{line}</span>
              ) : line.startsWith("done in") ? (
                <span className="text-chart-2">{line}</span>
              ) : (
                <span className="text-foreground/80">{line}</span>
              )}
            </div>
          ))}
          {step.status === "running" && (
            <span className="inline-block h-3 w-1.5 bg-primary animate-pulse align-middle mt-0.5" />
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function SummaryCard({ build }: { build: ReturnType<typeof useBuildVerification> }) {
  const { runningRunId } = useLiveEngine();
  const duration = build.startedAt && build.endedAt ? build.endedAt - build.startedAt : 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cells: Array<{ label: string; value: string; icon: any; tone?: string }> = [
    { label: "Repository status", value: "Verified", icon: ShieldCheck, tone: "text-success" },
    { label: "Files generated", value: `${build.filesGenerated}`, icon: FileCode2 },
    {
      label: "Tests passed",
      value: `${build.testsPassed} / ${build.testsPassed}`,
      icon: FlaskConical,
      tone: "text-success",
    },
    { label: "Build duration", value: formatDuration(duration), icon: Clock },
    { label: "Repository size", value: formatSize(build.repoSizeKb), icon: Package },
    { label: "Artifacts produced", value: `${build.artifactsProduced.length}`, icon: Layers },
  ];

  return (
    <div className="mt-3 rounded-lg border border-success/30 bg-gradient-to-br from-success/[0.05] to-primary/[0.03] p-4 animate-fade-up">
      <div className="flex items-center gap-2 mb-3">
        <span className="relative flex h-2 w-2">
          <span className="absolute inset-0 rounded-full bg-success animate-ping opacity-75" />
          <span className="relative rounded-full h-2 w-2 bg-success" />
        </span>
        <p className="text-sm font-medium">Build summary</p>
        <span className="ml-auto text-[10px] font-mono text-muted-foreground">
          run_482 · sha 4c9e1a2
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {cells.map((c) => (
          <div key={c.label} className="rounded-md border border-border bg-card/60 px-2.5 py-2">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              <c.icon className="h-3 w-3" />
              {c.label}
            </div>
            <p className={cn("mt-1 text-sm font-medium font-mono tabular-nums", c.tone)}>
              {c.value}
            </p>
          </div>
        ))}
      </div>

      {build.artifactsProduced.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {build.artifactsProduced.map((a) => (
            <span
              key={a}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-card/60 px-2 py-0.5 text-[10px] font-mono text-muted-foreground"
            >
              <Package className="h-2.5 w-2.5" /> {a}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 rounded-md border border-primary/30 bg-primary/[0.05] px-3 py-2">
        <Package className="h-4 w-4 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium truncate">Repository.zip</p>
          <p className="text-[10px] text-muted-foreground font-mono truncate">
            {build.filesGenerated} files · {formatSize(build.repoSizeKb)} · verified sha 4c9e1a2
          </p>
        </div>
        <Button size="sm" className="h-7 gap-1.5" asChild>
          <a
            href={api.artifactDownloadUrl(runningRunId, "Repository.zip")}
            download="Repository.zip"
            target="_blank"
            rel="noreferrer"
          >
            <Download className="h-3.5 w-3.5" /> Download
          </a>
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}m ${String(r).padStart(2, "0")}s`;
}

function formatSize(kb: number): string {
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

// Map for potential external consumers.
export const BUILD_STEP_ORDER: BuildStepId[] = [
  "install",
  "lint",
  "typecheck",
  "test",
  "build",
  "verified",
];
