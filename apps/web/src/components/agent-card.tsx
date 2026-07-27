import {
  Clock,
  Sparkles,
  CheckCircle2,
  Loader2,
  CircleDashed,
  ShieldAlert,
  FileCog,
} from "lucide-react";
import type { Agent } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { useLiveEngine, type PipelineStage } from "@/lib/live-engine";

/**
 * AgentCard — represents one agent in the orchestration pipeline.
 * Visualizes dependency progress: current stage, inputs (with readiness),
 * outputs (with the one being produced highlighted), and elapsed time.
 */
export function AgentCard({ agent, compact = false }: { agent: Agent; compact?: boolean }) {
  const Icon = agent.icon;
  const { pipeline, producedArtifacts } = useLiveEngine();
  const node = pipeline.find((n) => n.agentId === agent.id);

  if (!node) return null;

  const stageMeta = STAGE_META[node.stage];
  const elapsed = formatElapsed(node.elapsedMs);

  return (
    <div
      className={cn(
        "group relative surface p-4 shadow-card transition-all",
        node.stage === "waiting" && "opacity-70",
        node.stage === "completed" && "border-success/40",
        node.stage === "failed" && "border-destructive/50",
        node.stage !== "waiting" && node.stage !== "completed" && "hover:border-primary/30",
      )}
      data-agent={agent.id}
      data-stage={node.stage}
    >
      <div className="flex items-start gap-3">
        <div className="relative">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background",
              (node.stage === "running" || node.stage === "generating") &&
                "bg-gradient-primary border-transparent",
              node.stage === "completed" && "bg-success/15 border-success/40",
            )}
          >
            <Icon
              className={cn(
                "h-5 w-5",
                node.stage === "running" || node.stage === "generating"
                  ? "text-primary-foreground"
                  : "text-foreground",
                node.stage === "completed" && "text-success",
              )}
            />
          </div>
          {(node.stage === "running" ||
            node.stage === "generating" ||
            node.stage === "validating") && (
            <span className="absolute inset-0 rounded-lg animate-pulse-ring border-2 border-primary" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm truncate">{agent.name}</h3>
            <span className="text-[11px] text-muted-foreground">{agent.role}</span>
          </div>
          <div
            className={cn(
              "mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium",
              stageMeta.className,
            )}
          >
            <stageMeta.icon className={cn("h-3 w-3", stageMeta.spin && "animate-spin")} />
            {node.stageLabel}
          </div>
        </div>

        <div className="flex items-center gap-1 text-[10px] text-muted-foreground tabular-nums shrink-0">
          <Clock className="h-3 w-3" />
          {elapsed}
        </div>
      </div>

      {/* Dependency progress */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="uppercase tracking-wider">Dependency progress</span>
          <span className="tabular-nums text-foreground">{Math.round(node.progress)}%</span>
        </div>
        <div className="mt-1 h-1 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full transition-[width] duration-700 ease-out",
              node.stage === "completed"
                ? "bg-success"
                : node.stage === "failed"
                  ? "bg-destructive"
                  : node.stage === "waiting"
                    ? "bg-muted-foreground/30"
                    : "bg-gradient-primary",
            )}
            style={{ width: `${node.progress}%` }}
          />
        </div>
      </div>

      {!compact && (
        <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3">
          <ArtifactList
            label="Inputs"
            items={node.inputs.map((i) => ({
              name: i.name,
              ready: producedArtifacts.includes(i.name),
            }))}
            variant="input"
          />
          <ArtifactList
            label="Outputs"
            items={node.outputs.map((o) => ({
              name: o.name,
              ready: node.producedOutputs.includes(o.name),
              current: node.currentArtifact === o.name,
            }))}
            variant="output"
          />
        </div>
      )}

      {compact && node.currentArtifact && (
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground truncate">
          <FileCog className="h-3 w-3 text-primary shrink-0" />
          <span className="truncate">
            <span className="text-muted-foreground/70">producing </span>
            <span className="text-foreground font-mono">{node.currentArtifact}</span>
          </span>
        </div>
      )}
    </div>
  );
}

interface ArtifactItem {
  name: string;
  ready?: boolean;
  current?: boolean;
}

function ArtifactList({
  label,
  items,
  variant,
}: {
  label: string;
  items: ArtifactItem[];
  variant: "input" | "output";
}) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {variant === "input" ? (
          <CircleDashed className="h-2.5 w-2.5" />
        ) : (
          <Sparkles className="h-2.5 w-2.5" />
        )}
        {label}
      </div>
      <ul className="mt-1 space-y-0.5">
        {items.map((it) => (
          <li
            key={it.name}
            className={cn(
              "flex items-center gap-1 text-[11px] font-mono truncate",
              it.current && "text-primary",
              it.ready && !it.current && "text-foreground",
              !it.ready && !it.current && "text-muted-foreground/70",
            )}
          >
            {it.current ? (
              <Loader2 className="h-2.5 w-2.5 shrink-0 animate-spin text-primary" />
            ) : it.ready ? (
              <CheckCircle2 className="h-2.5 w-2.5 shrink-0 text-success" />
            ) : (
              <CircleDashed className="h-2.5 w-2.5 shrink-0" />
            )}
            <span className="truncate">{it.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatElapsed(ms: number): string {
  if (ms <= 0) return "0s";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  return `${m}m ${rs.toString().padStart(2, "0")}s`;
}

const STAGE_META: Record<
  PipelineStage,
  { icon: typeof Loader2; className: string; spin: boolean }
> = {
  waiting: { icon: CircleDashed, className: "text-muted-foreground", spin: false },
  running: { icon: Loader2, className: "text-primary", spin: true },
  generating: { icon: Sparkles, className: "text-primary", spin: false },
  validating: { icon: Loader2, className: "text-chart-2", spin: true },
  completed: { icon: CheckCircle2, className: "text-success", spin: false },
  failed: { icon: ShieldAlert, className: "text-destructive", spin: false },
};
