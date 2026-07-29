import { useState, useMemo } from "react";
import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { Breadcrumb } from "@/components/breadcrumb";
import { SampleDataNotice } from "@/components/sample-data-notice";
import { projects, type FileNode } from "@/lib/mock-data";
import { useLiveEngine } from "@/lib/live-engine";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/status-badge";
import { AgentCard } from "@/components/agent-card";
import { ActivityFeed } from "@/components/activity-feed";
import { CodeViewer } from "@/components/code-viewer";
import { RepositoryTree } from "@/components/repository-tree";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { GitBranch, Star, Play, Pause, ExternalLink } from "lucide-react";
import { ArtifactExplorer } from "@/components/artifact-explorer";
import { DependencyGraph, ArchitectureGraph } from "@/components/graphs";
import { RunHistory } from "@/components/run-history";
import { ExecutionTimeline } from "@/components/execution-timeline";
import { MetricStrip } from "@/components/metric-charts";

export const Route = createFileRoute("/_app/projects/$slug")({
  loader: ({ params }) => {
    const project = projects.find((p) => p.slug === params.slug);
    if (!project) throw notFound();
    return { project };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.project.name ?? "Project"} · ForgeOne` },
      { name: "description", content: loaderData?.project.description ?? "Project workspace" },
      { property: "og:title", content: `${loaderData?.project.name ?? "Project"} · ForgeOne` },
      {
        property: "og:description",
        content: loaderData?.project.description ?? "Project workspace",
      },
    ],
  }),
  component: ProjectWorkspace,
});

function ProjectWorkspace() {
  const { project } = Route.useLoaderData();
  const { agents, events, artifacts } = useLiveEngine();
  const [selectedPath, setSelectedPath] = useState<string>("meridian-api/src/index.ts");

  const { tree, codeMap } = useMemo(() => {
    const fileArts = artifacts.filter(
      (a) => !a.name.endsWith(".zip") && !a.name.endsWith(".tar.gz"),
    );
    const sourceFiles =
      fileArts.length > 0
        ? fileArts
        : [
            { name: "package.json", content: '{\n  "name": "meridian-api"\n}\n' },
            { name: "src/index.ts", content: 'import Fastify from "fastify";\n' },
          ];

    const root: FileNode = { name: "meridian-api", type: "folder", children: [] };
    const map = new Map<string, string>();

    for (const item of sourceFiles) {
      const parts = item.name.split("/");
      let cur = root;
      for (let i = 0; i < parts.length; i++) {
        const name = parts[i];
        const isLeaf = i === parts.length - 1;
        const fullPath = `meridian-api/${parts.slice(0, i + 1).join("/")}`;
        cur.children = cur.children || [];
        let existing = cur.children.find((c) => c.name === name);
        if (!existing) {
          existing = {
            name,
            type: isLeaf ? "file" : "folder",
            language: isLeaf ? name.split(".").pop() : undefined,
            children: isLeaf ? undefined : [],
          };
          cur.children.push(existing);
        }
        if (isLeaf) {
          map.set(fullPath, item.content || `// Content for ${name}`);
          map.set(parts.slice(0, i + 1).join("/"), item.content || `// Content for ${name}`);
          map.set(name, item.content || `// Content for ${name}`);
        } else {
          cur = existing;
        }
      }
    }
    return { tree: root, codeMap: map };
  }, [artifacts]);

  const activeCode =
    codeMap.get(selectedPath) ??
    codeMap.get(selectedPath.split("/").pop() ?? "") ??
    "// Select a file";

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
      <Breadcrumb items={[{ label: "Projects", to: "/dashboard" }, { label: project.name }]} />

      <SampleDataNotice detail="Project metadata on this page is illustrative. The file tree below shows the repository from the most recent live run." />

      {/* Header card */}
      <div className="surface p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
              {project.name[0]}
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
              <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                <StatusBadge status={project.status} />
                <span className="flex items-center gap-1">
                  <GitBranch className="h-3 w-3" /> {project.branch}
                </span>
                <span>·</span>
                <span>{project.language}</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3" /> {project.stars}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" /> GitHub
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Pause className="h-3.5 w-3.5" /> Pause
            </Button>
            <Button size="sm" className="gap-1.5">
              <Play className="h-3.5 w-3.5" /> Dispatch run
            </Button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          <MiniStat label="Delivery" value={`${project.progress}%`} bar={project.progress} />
          <MiniStat label="Open tasks" value={String(project.tasksOpen)} />
          <MiniStat label="Agents assigned" value={String(project.agents)} />
          <MiniStat label="Last run" value={project.lastRun} />
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="architecture">Architecture</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="artifacts">Artifacts</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="conversation">Conversation</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <MetricStrip />
          <ExecutionTimeline />
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <h3 className="text-sm font-medium mb-3">Repository</h3>
              <div className="surface grid grid-cols-12 h-[420px] overflow-hidden">
                <div className="col-span-4 border-r border-border p-2 overflow-y-auto">
                  <RepositoryTree node={tree} onSelect={setSelectedPath} selected={selectedPath} />
                </div>
                <div className="col-span-8 overflow-hidden">
                  <CodeViewer
                    code={activeCode}
                    filename={selectedPath}
                    language={selectedPath.split(".").pop() ?? "ts"}
                    className="border-0 rounded-none h-full"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Assigned agents</h3>
              <div className="space-y-3">
                {agents.slice(0, 3).map((a) => (
                  <AgentCard key={a.id} agent={a} compact />
                ))}
              </div>
              <RunHistory />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="architecture" className="mt-6 grid lg:grid-cols-2 gap-6">
          <ArchitectureGraph />
          <DependencyGraph />
        </TabsContent>

        <TabsContent value="tasks" className="mt-6">
          <TaskList />
        </TabsContent>

        <TabsContent value="artifacts" className="mt-6">
          <ArtifactExplorer />
        </TabsContent>

        <TabsContent value="timeline" className="mt-6">
          <ActivityFeed events={events.slice(0, 20)} />
        </TabsContent>

        <TabsContent value="conversation" className="mt-6">
          <Conversation />
        </TabsContent>
      </Tabs>

      <div>
        <Link to="/dashboard" className="text-xs text-muted-foreground hover:text-foreground">
          ← Back to dashboard
        </Link>
      </div>
    </div>
  );
}

function MiniStat({ label, value, bar }: { label: string; value: string; bar?: number }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
      {typeof bar === "number" && <Progress value={bar} className="mt-2 h-1" />}
    </div>
  );
}

const tasks = [
  {
    id: "AUTH-12",
    title: "Passkey login flow for /auth/register",
    assignee: "Kai",
    status: "working",
    progress: 68,
  },
  {
    id: "API-84",
    title: "Cursor pagination on /projects and /billing",
    assignee: "Kai",
    status: "done",
    progress: 100,
  },
  {
    id: "SEC-19",
    title: "Rotate service tokens quarterly (policy)",
    assignee: "Nyx",
    status: "queued" as const,
    progress: 0,
  },
  {
    id: "OPS-33",
    title: "Blue/green deploy for staging environment",
    assignee: "Orion",
    status: "working",
    progress: 33,
  },
  {
    id: "TEST-46",
    title: "Coverage for retry/backoff edge cases",
    assignee: "Rin",
    status: "working",
    progress: 55,
  },
  {
    id: "ARCH-07",
    title: "RFC-014 · event-driven ingestion pipeline",
    assignee: "Athena",
    status: "done",
    progress: 100,
  },
];

function TaskList() {
  return (
    <div className="surface divide-y divide-border">
      {tasks.map((t) => (
        <div
          key={t.id}
          className="grid grid-cols-12 gap-4 items-center px-4 py-3 hover:bg-accent/30 transition-colors"
        >
          <span className="col-span-2 font-mono text-[11px] text-muted-foreground">{t.id}</span>
          <span className="col-span-5 text-sm truncate">{t.title}</span>
          <span className="col-span-2 text-xs text-muted-foreground">{t.assignee}</span>
          <div className="col-span-2">
            <Progress value={t.progress} className="h-1" />
          </div>
          <div className="col-span-1 justify-self-end">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <StatusBadge status={t.status as any} />
          </div>
        </div>
      ))}
    </div>
  );
}

const conversation = [
  {
    who: "Jamie",
    role: "you",
    text: "Add cursor-based pagination to the /projects endpoint. Keep it backwards compatible.",
  },
  {
    who: "Vera · PM",
    role: "agent",
    text: "Scoped as API-84. Assigning to Kai. Estimated 12 min including tests.",
  },
  {
    who: "Kai · Developer",
    role: "agent",
    text: "Implemented. Added ?cursor and ?limit params. Old page[] responses remain valid. Opened PR #482.",
  },
  {
    who: "Isla · Reviewer",
    role: "agent",
    text: "LGTM with one suggestion — extract retryPolicy() to shared util. Non-blocking.",
  },
  {
    who: "Rin · Tester",
    role: "agent",
    text: "274 tests pass, coverage +1.2%. New edge cases added for empty cursor and out-of-range limit.",
  },
];

function Conversation() {
  return (
    <div className="surface p-6 space-y-4">
      {conversation.map((m, i) => (
        <div key={i} className={`flex gap-3 ${m.role === "you" ? "flex-row-reverse" : ""}`}>
          <div
            className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-[11px] font-medium ${
              m.role === "you" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
            }`}
          >
            {m.who[0]}
          </div>
          <div
            className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
              m.role === "you" ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}
          >
            <p className="text-[11px] opacity-70 mb-0.5">{m.who}</p>
            <p>{m.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
