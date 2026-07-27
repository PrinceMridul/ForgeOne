import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Breadcrumb } from "@/components/breadcrumb";
import { AgentCard } from "@/components/agent-card";
import { Button } from "@/components/ui/button";
import { Pause, Play } from "lucide-react";
import { useLiveEngine } from "@/lib/live-engine";
import { LiveLogViewer } from "@/components/live-log-viewer";
import { AgentCommGraph } from "@/components/graphs";
import { MetricStrip } from "@/components/metric-charts";

export const Route = createFileRoute("/_app/agents")({
  head: () => ({
    meta: [
      { title: "Multi-Agent Console · ForgeOne" },
      {
        name: "description",
        content: "Live status, logs, and telemetry for all seven ForgeOne AI engineers.",
      },
      { property: "og:title", content: "Multi-Agent Console · ForgeOne" },
      {
        property: "og:description",
        content: "Real-time control plane for your autonomous engineering team.",
      },
    ],
  }),
  component: AgentsConsole,
});

function AgentsConsole() {
  const { agents } = useLiveEngine();
  const totalTokens = agents.reduce((s, a) => s + a.tokensUsed, 0);
  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
      <Breadcrumb items={[{ label: "Agents" }]} />
      <PageHeader
        title="Multi-Agent Console"
        description="Seven specialized engineers collaborating in real time on the current sprint."
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Pause className="h-3.5 w-3.5" /> Pause all
            </Button>
            <Button size="sm" className="gap-1.5">
              <Play className="h-3.5 w-3.5" /> Dispatch run
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { l: "Active agents", v: agents.filter((a) => a.status !== "idle").length + "/7" },
          { l: "Total tokens", v: (totalTokens / 1000).toFixed(1) + "k" },
          {
            l: "Avg. progress",
            v: Math.round(agents.reduce((s, a) => s + a.progress, 0) / agents.length) + "%",
          },
          { l: "Memory", v: agents.reduce((s, a) => s + a.memoryMb, 0) + " MB" },
        ].map((s) => (
          <div key={s.l} className="surface p-4">
            <p className="text-xs text-muted-foreground">{s.l}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums transition-all">{s.v}</p>
          </div>
        ))}
      </div>

      <MetricStrip />

      <div className="grid xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 grid md:grid-cols-2 gap-4">
          {agents.map((a) => (
            <AgentCard key={a.id} agent={a} />
          ))}
        </div>
        <div className="space-y-6">
          <AgentCommGraph height={340} />
          <LiveLogViewer height={360} />
        </div>
      </div>
    </div>
  );
}
