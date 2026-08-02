import { useMemo } from "react";
import { useLiveEngine } from "@/lib/live-engine";
import { Brain } from "lucide-react";
import type { LogLine } from "@/lib/live-engine";
import { cn } from "@/lib/utils";

/**
 * ThinkingTimeline — the reasoning stream for the current run.
 *
 * This panel used to emit beats from a hardcoded pool of plausible-sounding
 * thoughts ("Choosing Redpanda over Kafka", "Terraform plan: 6 to add"). They
 * were unrelated to the prompt, which meant the most prominent panel on the
 * live console was the least truthful thing on screen.
 *
 * It now renders the run's own telemetry. The agents already narrate their
 * reasoning as they work — "Recognised the brief as a healthcare management
 * product", "Mapped 4 relationship(s): appointment → patient, …" — so there was
 * never a need to invent any of it. Newest first, matching the previous
 * behaviour.
 */

/**
 * Tinted by what the backend actually emitted: a LOG event is an agent
 * narrating a decision, a STEP event is a discrete action it took. Labelling a
 * "FILE_CREATED: schema.sql" line as reasoning would be the same category of
 * overstatement this panel was rewritten to remove.
 */
const KIND_TINT: Record<LogLine["kind"], string> = {
  reasoning: "border-primary/40 text-primary",
  step: "border-chart-2/40 text-chart-2",
  error: "border-destructive/40 text-destructive",
};

const KIND_LABEL: Record<LogLine["kind"], string> = {
  reasoning: "reasoning",
  step: "step",
  error: "error",
};

export function ThinkingTimeline({ height = 480 }: { height?: number }) {
  const { logs, agents } = useLiveEngine();

  const roleFor = useMemo(() => {
    const byId = new Map(agents.map((a) => [a.id, a.role]));
    return (agentId: string) => byId.get(agentId) ?? "Orchestrator";
  }, [agents]);

  // The log buffer is oldest-first; this panel reads newest-first.
  const beats = useMemo(() => [...logs].reverse().slice(0, 60), [logs]);

  return (
    <div className="surface flex flex-col overflow-hidden" style={{ height }}>
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Brain className="h-4 w-4 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-medium">Live thinking</p>
          <p className="text-[11px] text-muted-foreground">
            Reasoning streamed from the run, agent by agent
          </p>
        </div>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {logs.length} {logs.length === 1 ? "beat" : "beats"}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <ol className="relative space-y-3 border-l border-border/60 pl-5">
          {beats.map((b, i) => (
            <li
              key={b.id}
              className="animate-fade-up relative"
              style={{ animationDuration: "420ms" }}
            >
              <span
                className={cn(
                  "absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 bg-background",
                  KIND_TINT[b.kind],
                  i === 0 && "animate-pulse-ring",
                )}
              />
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground">{b.agentName}</span>
                <span>·</span>
                <span>{roleFor(b.agentId)}</span>
                <span className="ml-auto tabular-nums">{b.ts}</span>
              </div>
              <p className="mt-0.5 text-sm leading-snug">{b.msg}</p>
              <p className={cn("mt-0.5 text-[10px] uppercase tracking-widest", KIND_TINT[b.kind])}>
                {KIND_LABEL[b.kind]}
              </p>
            </li>
          ))}
          {beats.length === 0 && (
            <li className="text-xs text-muted-foreground">
              Waiting for the first agent to report…
            </li>
          )}
        </ol>
      </div>
    </div>
  );
}
