import { useLiveEngine } from "@/lib/live-engine";
import { MetricTile, Sparkline } from "@/components/sparkline";

export function MetricStrip() {
  const { metrics, agents } = useLiveEngine();
  const tokens = metrics.map((m) => m.tokens);
  const runtime = metrics.map((m) => m.runtimeMs);
  const memory = metrics.map((m) => m.memoryMb);
  const totalTokens = agents.reduce((s, a) => s + a.tokensUsed, 0);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <MetricTile
        label="Token throughput"
        value={(tokens.at(-1) ?? 0).toFixed(0)}
        unit="tok/s"
        values={tokens}
        stroke="var(--primary)"
        fill="var(--primary)"
      />
      <MetricTile
        label="Runtime p50"
        value={(runtime.at(-1) ?? 0).toFixed(0)}
        unit="ms"
        values={runtime}
        stroke="var(--chart-4)"
        fill="var(--chart-4)"
      />
      {/* Read the same series this tile plots. Summing per-agent memory made
          the figure read 0.00 GB whenever no run was attached, while the
          sparkline beside it showed a healthy curve. */}
      <MetricTile
        label="Memory"
        value={((memory.at(-1) ?? 0) / 1024).toFixed(2)}
        unit="GB"
        values={memory}
        stroke="var(--chart-2)"
        fill="var(--chart-2)"
      />
      <div className="surface p-4 sm:col-span-3">
        <div className="flex items-baseline justify-between mb-2">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Token budget · session
          </p>
          <p className="text-sm tabular-nums">{(totalTokens / 1000).toFixed(1)}k / 680k</p>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {agents.map((a) => {
            const pct = Math.min(100, (a.tokensUsed / a.tokenBudget) * 100);
            return (
              <div key={a.id} className="min-w-0">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="truncate">{a.name}</span>
                  <span className="tabular-nums text-muted-foreground">{Math.round(pct)}%</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-gradient-primary"
                    style={{ width: `${pct}%`, transition: "width 700ms ease" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3">
          <Sparkline values={tokens} height={30} stroke="var(--primary)" fill="var(--primary)" />
        </div>
      </div>
    </div>
  );
}
