import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Breadcrumb } from "@/components/breadcrumb";
import { ProjectCard } from "@/components/project-card";
import { AgentCard } from "@/components/agent-card";
import { ActivityFeed } from "@/components/activity-feed";
import { Button } from "@/components/ui/button";
import { projects, stats } from "@/lib/mock-data";
import { useLiveEngine } from "@/lib/live-engine";
import { MetricStrip } from "@/components/metric-charts";
import { SampleDataNotice } from "@/components/sample-data-notice";
import { ExecutionTimeline } from "@/components/execution-timeline";
import { LiveLogViewer } from "@/components/live-log-viewer";
import { AgentCommGraph } from "@/components/graphs";
import { ArrowUpRight, ArrowDownRight, Plus, Zap, Play, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · ForgeOne" },
      {
        name: "description",
        content: "Overview of projects, runs, and agent activity in your ForgeOne workspace.",
      },
      { property: "og:title", content: "Dashboard · ForgeOne" },
      { property: "og:description", content: "Overview of projects, runs, and agent activity." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { agents, events } = useLiveEngine();
  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-8">
      <Breadcrumb items={[{ label: "Dashboard" }]} />
      <PageHeader
        title="Welcome back, Jamie"
        description="Your engineering team shipped 42 tasks and closed 6 incidents in the last 24 hours."
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> New project
            </Button>
          </>
        }
      />

      <SampleDataNotice detail="The workspace overview below is a static composition. Live agent execution, generated repositories and artifacts are real — dispatch a run from the landing page to see measured data." />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="surface p-5 shadow-card">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-semibold tabular-nums">{s.value}</span>
              <span
                className={`inline-flex items-center gap-0.5 text-[11px] ${s.trend === "up" ? "text-success" : "text-warning"}`}
              >
                {s.trend === "up" ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                {s.delta}
              </span>
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-gradient-primary"
                style={{ width: `${40 + ((s.label.length * 7) % 55)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid md:grid-cols-3 gap-4">
        {[
          {
            icon: Play,
            title: "Dispatch a new run",
            desc: "Kick off multi-agent workflow",
            cta: "New run",
          },
          {
            icon: Zap,
            title: "Resume paused runs",
            desc: "3 runs are awaiting review",
            cta: "Resume",
          },
          {
            icon: Plus,
            title: "Import from GitHub",
            desc: "Connect any repository",
            cta: "Import",
          },
        ].map((a) => (
          <div
            key={a.title}
            className="surface p-5 flex items-center gap-4 shadow-card hover:border-primary/30 transition-colors"
          >
            <div className="h-10 w-10 rounded-md bg-gradient-primary flex items-center justify-center shrink-0">
              <a.icon className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{a.title}</p>
              <p className="text-xs text-muted-foreground">{a.desc}</p>
            </div>
            <Button size="sm" variant="outline">
              {a.cta}
            </Button>
          </div>
        ))}
      </div>

      {/* Projects */}
      <section>
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Projects</h2>
            <p className="text-xs text-muted-foreground">{projects.length} active in workspace</p>
          </div>
          <Link to="/dashboard" className="text-xs text-primary hover:underline">
            View all →
          </Link>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.slice(0, 6).map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      </section>

      {/* Live orchestration */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Live orchestration</h2>
          <p className="text-xs text-muted-foreground">Streaming from the execution engine</p>
        </div>
        <MetricStrip />
        <ExecutionTimeline />
      </section>

      {/* Recent runs + Agents + Comm graph */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="flex items-end justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Recent runs</h2>
                <p className="text-xs text-muted-foreground">Live stream of engineering events</p>
              </div>
              <Link to="/activity" className="text-xs text-primary hover:underline">
                Open timeline →
              </Link>
            </div>
            <ActivityFeed events={events.slice(0, 6)} />
          </div>
          <LiveLogViewer height={280} />
        </div>
        <div className="space-y-6">
          <div>
            <div className="flex items-end justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Agents online</h2>
                <p className="text-xs text-muted-foreground">7 engineers · streaming</p>
              </div>
              <Link to="/agents" className="text-xs text-primary hover:underline">
                Console →
              </Link>
            </div>
            <div className="space-y-3">
              {agents.slice(0, 4).map((a) => (
                <AgentCard key={a.id} agent={a} compact />
              ))}
            </div>
          </div>
          <AgentCommGraph height={280} />
        </div>
      </div>
    </div>
  );
}
