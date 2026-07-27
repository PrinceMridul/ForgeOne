import { useLiveEngine, selectRun } from "@/lib/live-engine";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import { GitBranch, Bot, Zap } from "lucide-react";

export function RunHistory() {
  const { runs, runningRunId } = useLiveEngine();
  return (
    <div className="surface overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="text-sm font-medium">Run history</p>
          <p className="text-[11px] text-muted-foreground">Last {runs.length} orchestrated runs</p>
        </div>
        <span className="text-[11px] text-muted-foreground">click to replay</span>
      </div>
      <ul className="divide-y divide-border">
        {runs.map((r) => {
          const active = r.id === runningRunId;
          return (
            <li key={r.id}>
              <button
                onClick={() => selectRun(r.id)}
                className={cn(
                  "w-full grid grid-cols-[auto_1fr_auto] gap-3 items-center px-4 py-3 text-left transition-colors hover:bg-accent/40",
                  active && "bg-accent/50",
                )}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "h-8 w-8 rounded-md border border-border flex items-center justify-center text-[10px] font-mono",
                      active && "border-primary/40 bg-primary/10",
                    )}
                  >
                    {r.id.slice(-3)}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{r.title}</p>
                    {active && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-primary">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-75" />
                          <span className="relative rounded-full h-1.5 w-1.5 bg-primary" />
                        </span>
                        live
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <GitBranch className="h-3 w-3" /> {r.branch}
                    </span>
                    <span>· {r.startedAt}</span>
                    <span>· {r.duration}</span>
                    <span className="flex items-center gap-1">
                      <Bot className="h-3 w-3" /> {r.agents}
                    </span>
                    <span className="flex items-center gap-1">
                      <Zap className="h-3 w-3" /> {(r.tokens / 1000).toFixed(1)}k
                    </span>
                  </div>
                </div>
                <StatusBadge status={r.status} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
