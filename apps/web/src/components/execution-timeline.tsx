import { useLiveEngine } from "@/lib/live-engine";
import { cn } from "@/lib/utils";
import {
  GitCommit,
  TestTube2,
  Rocket,
  MessageSquare,
  AlertTriangle,
  ShieldCheck,
  FileText,
} from "lucide-react";
import { StatusBadge } from "@/components/status-badge";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const iconFor: Record<string, any> = {
  commit: GitCommit,
  test: TestTube2,
  deploy: Rocket,
  review: MessageSquare,
  issue: AlertTriangle,
  security: ShieldCheck,
  plan: FileText,
};

/**
 * Horizontal execution timeline — spans and events for the active run.
 * Purely visual bands built from the live agents + events stream.
 */
export function ExecutionTimeline({ height = 220 }: { height?: number }) {
  const { agents, events, tick, runningRunId } = useLiveEngine();
  const lanes = agents.slice(0, 7);
  const now = tick;
  // build synthetic spans per agent, using progress to size the bar.
  return (
    <div className="surface p-4 overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-medium">Execution timeline</p>
          <p className="text-[11px] text-muted-foreground">
            {runningRunId
              ? `Live spans for ${runningRunId.slice(0, 8)} · streaming`
              : "No run attached"}
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded bg-primary" /> working
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded bg-chart-2" /> thinking
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded bg-success" /> done
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded bg-muted-foreground/30" /> idle
          </span>
        </div>
      </div>
      <div className="grid grid-cols-[110px_1fr] gap-x-3" style={{ minHeight: height }}>
        {lanes.map((a, i) => {
          const width = 30 + a.progress * 0.65; // %
          const offset = (i * 5) % 20;
          const color =
            a.status === "working"
              ? "bg-primary"
              : a.status === "thinking"
                ? "bg-chart-2"
                : a.status === "done"
                  ? "bg-success"
                  : a.status === "blocked"
                    ? "bg-destructive"
                    : "bg-muted-foreground/30";
          return (
            <div key={a.id} className="contents">
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                <span className="h-1.5 w-1.5 rounded-full bg-foreground/60" />
                <span className="truncate">{a.name}</span>
                <span className="text-[10px]">· {a.role}</span>
              </div>
              <div className="relative py-2">
                <div className="absolute inset-y-3 left-0 right-0 bg-gradient-to-r from-transparent via-border/40 to-transparent" />
                <div
                  className={cn(
                    "relative h-5 rounded-md overflow-hidden shadow-inner",
                    color,
                    "opacity-90",
                  )}
                  style={{
                    marginLeft: `${offset}%`,
                    width: `${width}%`,
                    transition: "width 700ms ease, margin-left 700ms ease",
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent" />
                  {a.status === "working" && (
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,.18),transparent)] animate-[shimmer_1.6s_linear_infinite] bg-[length:200%_100%]" />
                  )}
                  <span className="absolute inset-0 flex items-center px-2 text-[10px] font-medium text-white/90 truncate">
                    {a.currentTask}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {/* Event markers ribbon */}
      <div className="mt-4 border-t border-border pt-3">
        <div className="relative h-8 rounded-md bg-muted/30 overflow-hidden">
          {events.slice(0, 20).map((e, i) => {
            const Icon = iconFor[e.type] ?? GitCommit;
            const x = ((now * 3 + i * 47) % 96) + 2;
            return (
              <div
                key={e.id}
                className="absolute top-1/2 -translate-y-1/2 flex items-center gap-1"
                style={{ left: `${x}%` }}
                title={`${e.title} — ${e.agent}`}
              >
                <div
                  className={cn(
                    "h-5 w-5 rounded-full border border-border bg-card flex items-center justify-center",
                    e.status === "failed" && "border-destructive/50 text-destructive",
                    e.status === "warning" && "border-warning/50 text-warning",
                    e.status === "success" && "border-success/50 text-success",
                  )}
                >
                  <Icon className="h-2.5 w-2.5" />
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground tabular-nums">
          <span>−60s</span>
          <span>now</span>
        </div>
      </div>
      {/* Latest event ticker */}
      {events[0] && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          <StatusBadge status={events[0].status} />
          <span className="text-muted-foreground">{events[0].ts}</span>
          <span className="truncate">{events[0].title}</span>
        </div>
      )}
    </div>
  );
}
