import { useLiveEngine } from "@/lib/live-engine";
import { cn } from "@/lib/utils";

/**
 * ProgressGraph — overall run progress as a stacked contribution of every agent,
 * plus an aggregate percentage. Feels rewarding as bars fill in.
 */
export function ProgressGraph() {
  const { agents } = useLiveEngine();
  const overall = Math.round(
    agents.reduce((n, a) => n + a.progress, 0) / Math.max(1, agents.length),
  );

  return (
    <div className="surface p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Run progress</p>
          <p className="text-[11px] text-muted-foreground">
            Weighted across {agents.length} agents
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold tabular-nums gradient-text">{overall}%</p>
          <p className="text-[10px] text-muted-foreground">complete</p>
        </div>
      </div>

      <div className="mt-4 h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-gradient-primary transition-[width] duration-700 ease-out"
          style={{ width: `${overall}%` }}
        />
      </div>

      <ul className="mt-4 space-y-2">
        {agents.map((a) => {
          const done = a.progress >= 100;
          return (
            <li
              key={a.id}
              className="grid grid-cols-[110px_1fr_44px] items-center gap-3 text-[11px]"
            >
              <span className="truncate text-muted-foreground">
                {a.name} · <span className="text-foreground/80">{a.role}</span>
              </span>
              <div className="relative h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 transition-[width] duration-700 ease-out",
                    done
                      ? "bg-success"
                      : a.status === "blocked"
                        ? "bg-destructive"
                        : "bg-gradient-primary",
                  )}
                  style={{ width: `${a.progress}%` }}
                />
                {!done && a.status === "working" && (
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,.22),transparent)] animate-[shimmer_1.6s_linear_infinite] bg-[length:200%_100%]" />
                )}
              </div>
              <span className="text-right tabular-nums">{Math.round(a.progress)}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
