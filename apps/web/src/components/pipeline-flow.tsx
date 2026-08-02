import { useLiveEngine, stageLabelFor, type PipelineStage } from "@/lib/live-engine";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  CheckCircle2,
  Loader2,
  CircleDashed,
  Sparkles,
  ShieldAlert,
} from "lucide-react";

/**
 * PipelineFlow — visualizes the linear orchestration:
 * Prompt → PRD → Architecture → Code → Review → Tests → Security → Deploy → Docs.
 *
 * Renders each agent as a node, connectors between them, and animated
 * artifact tokens that fly from producer to consumer as outputs complete.
 */
export function PipelineFlow() {
  const { pipeline, flying, tick, agents } = useLiveEngine();
  // Labels come from the live agent roster, not the static seed list. The seed
  // list stopped at seven agents, so the Documentation stage rendered as an
  // unlabelled row once it was added to the pipeline.
  const nameById = Object.fromEntries(agents.map((a) => [a.id, a.name]));
  const roleById = Object.fromEntries(agents.map((a) => [a.id, a.role]));
  const iconById = Object.fromEntries(agents.map((a) => [a.id, a.icon]));

  return (
    <div className="surface p-4 overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-medium">Orchestration pipeline</p>
          <p className="text-[11px] text-muted-foreground">
            Dependency-driven — artifacts unlock downstream agents
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <Legend color="bg-muted-foreground/30" label="waiting" />
          <Legend color="bg-primary" label="running" />
          <Legend color="bg-chart-2" label="validating" />
          <Legend color="bg-success" label="done" />
        </div>
      </div>

      <div className="relative">
        <div className="flex items-stretch gap-1 overflow-x-auto pb-2">
          {pipeline.map((node, i) => {
            const Icon = iconById[node.agentId];
            const isActive =
              node.stage !== "waiting" && node.stage !== "completed" && node.stage !== "failed";
            const isDone = node.stage === "completed";
            return (
              <div key={node.agentId} className="flex items-center shrink-0">
                <div
                  className={cn(
                    "relative w-[132px] rounded-lg border p-2.5 transition-all",
                    "bg-card/60",
                    isDone && "border-success/40 bg-success/5",
                    isActive && "border-primary/50 shadow-glow",
                    node.stage === "waiting" && "border-border opacity-60",
                    node.stage === "failed" && "border-destructive/50",
                  )}
                  data-agent={node.agentId}
                  data-node
                >
                  <div className="flex items-center gap-1.5">
                    <div
                      className={cn(
                        "h-6 w-6 rounded-md flex items-center justify-center border border-border bg-background",
                        isActive && "bg-gradient-primary border-transparent",
                        isDone && "bg-success/15 border-success/40",
                      )}
                    >
                      {Icon && (
                        <Icon
                          className={cn(
                            "h-3 w-3",
                            isActive ? "text-primary-foreground" : "text-foreground",
                            isDone && "text-success",
                          )}
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold truncate leading-tight">
                        {nameById[node.agentId]}
                      </p>
                      <p className="text-[9px] text-muted-foreground truncate leading-tight">
                        {roleById[node.agentId]}
                      </p>
                    </div>
                  </div>

                  <div
                    className={cn(
                      "mt-1.5 inline-flex items-center gap-1 text-[9px] font-medium uppercase tracking-wider",
                      stageClass(node.stage),
                    )}
                  >
                    <StageIcon stage={node.stage} />
                    {stageLabelFor(node.stage)}
                  </div>

                  {node.currentArtifact && (
                    <p
                      className="mt-1 text-[9px] font-mono truncate text-primary"
                      title={node.currentArtifact}
                    >
                      ↳ {node.currentArtifact}
                    </p>
                  )}

                  <div className="mt-1.5 h-0.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-[width] duration-700 ease-out",
                        isDone
                          ? "bg-success"
                          : node.stage === "failed"
                            ? "bg-destructive"
                            : node.stage === "waiting"
                              ? "bg-muted-foreground/30"
                              : "bg-gradient-primary",
                      )}
                      style={{
                        width: `${Math.max(node.progress, node.stage === "waiting" ? 0 : 4)}%`,
                      }}
                    />
                  </div>
                </div>

                {i < pipeline.length - 1 && (
                  <Connector
                    active={isDone}
                    flying={flying.some(
                      (f) => f.fromAgent === node.agentId && f.toAgent === pipeline[i + 1].agentId,
                    )}
                    tick={tick}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Fan-out flying artifacts (non-adjacent edges — e.g. Repository.zip → tester/security/devops) */}
        <FlyingBanner flying={flying} pipeline={pipeline} nameById={nameById} />
      </div>
    </div>
  );
}

function Connector({ active, flying, tick }: { active: boolean; flying: boolean; tick: number }) {
  return (
    <div className="relative flex items-center justify-center px-1" style={{ width: 40 }}>
      <div
        className={cn(
          "h-0.5 w-full rounded-full transition-colors",
          active ? "bg-gradient-to-r from-success/60 to-primary/60" : "bg-border",
        )}
      />
      <ChevronRight
        className={cn(
          "absolute right-0 h-3.5 w-3.5 transition-colors",
          active ? "text-primary" : "text-muted-foreground/40",
        )}
      />
      {flying && (
        <span
          key={`fly-${tick}`}
          className="absolute left-0 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-primary shadow-glow animate-[pipelineFly_1200ms_ease-out]"
        />
      )}
    </div>
  );
}

function FlyingBanner({
  flying,
  pipeline,
  nameById,
}: {
  flying: ReturnType<typeof useLiveEngine>["flying"];
  pipeline: ReturnType<typeof useLiveEngine>["pipeline"];
  nameById: Record<string, string>;
}) {
  if (flying.length === 0) return null;
  const orderOf = Object.fromEntries(pipeline.map((n, i) => [n.agentId, i]));
  const skips = flying.filter(
    (f) => Math.abs((orderOf[f.toAgent] ?? 0) - (orderOf[f.fromAgent] ?? 0)) > 1,
  );
  if (skips.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {skips.slice(0, 4).map((f) => (
        <div
          key={f.id}
          className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] animate-fade-in"
        >
          <Sparkles className="h-2.5 w-2.5 text-primary" />
          <span className="font-mono">{f.name}</span>
          <ChevronRight className="h-2.5 w-2.5 text-muted-foreground" />
          <span className="text-muted-foreground">{nameById[f.toAgent]}</span>
        </div>
      ))}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={cn("h-2 w-2 rounded", color)} />
      {label}
    </span>
  );
}

function StageIcon({ stage }: { stage: PipelineStage }) {
  const cls = "h-2.5 w-2.5";
  switch (stage) {
    case "waiting":
      return <CircleDashed className={cls} />;
    case "running":
      return <Loader2 className={cn(cls, "animate-spin")} />;
    case "generating":
      return <Sparkles className={cls} />;
    case "validating":
      return <Loader2 className={cn(cls, "animate-spin")} />;
    case "completed":
      return <CheckCircle2 className={cls} />;
    case "failed":
      return <ShieldAlert className={cls} />;
  }
}

function stageClass(stage: PipelineStage): string {
  switch (stage) {
    case "waiting":
      return "text-muted-foreground";
    case "running":
      return "text-primary";
    case "generating":
      return "text-primary";
    case "validating":
      return "text-chart-2";
    case "completed":
      return "text-success";
    case "failed":
      return "text-destructive";
  }
}
