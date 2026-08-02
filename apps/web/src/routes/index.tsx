import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { api } from "@/lib/api-client";
import type { WorkflowRun } from "@/lib/api-client";
import {
  ArrowRight,
  Sparkles,
  Command,
  Send,
  ShoppingBag,
  MessagesSquare,
  BarChart3,
  Kanban,
  Video,
  Wallet,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Rocket,
  WifiOff,
  RefreshCw,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ForgeOne — Describe your software idea" },
      {
        name: "description",
        content:
          "Type an idea. Dispatch eight specialist agents. Watch them plan, architect, build, review, test, audit and document it — live.",
      },
      { property: "og:title", content: "ForgeOne — Describe your software idea" },
      {
        property: "og:description",
        content: "Dispatch an autonomous engineering team from a single prompt.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const EXAMPLE_PROMPTS = [
  "Build a Notion-style docs app with realtime cursors and Postgres backend.",
  "Ship a Stripe-powered SaaS with team seats, usage metering, and a billing portal.",
  "Design a Kanban board with drag-and-drop, offline sync, and GitHub issue import.",
  "Create a real-time analytics dashboard on top of ClickHouse with saved queries.",
  "Prototype a video-conferencing app with recording, transcripts, and speaker notes.",
];

const TEMPLATES = [
  {
    icon: ShoppingBag,
    name: "Storefront",
    tag: "Next-gen ecommerce",
    prompt: "Build a headless storefront with a CMS, Stripe checkout, and product recommendations.",
  },
  {
    icon: MessagesSquare,
    name: "Chat platform",
    tag: "Realtime messaging",
    prompt: "Ship a Slack-like chat with channels, threads, presence, and full-text search.",
  },
  {
    icon: BarChart3,
    name: "Analytics dashboard",
    tag: "Metrics + charts",
    prompt:
      "Build a metrics dashboard with configurable widgets on top of Postgres and ClickHouse.",
  },
  {
    icon: Kanban,
    name: "Project tracker",
    tag: "Kanban + issues",
    prompt: "Design a Linear-style project tracker with cycles, roadmaps, and GitHub sync.",
  },
  {
    icon: Video,
    name: "Video calls",
    tag: "WebRTC ready",
    prompt: "Prototype a Zoom-like video conferencing app with rooms, recording, and captions.",
  },
  {
    icon: Wallet,
    name: "SaaS billing",
    tag: "Stripe subscriptions",
    prompt: "Add subscription billing with seats, usage metering, invoices, and dunning to a SaaS.",
  },
];

// Fallback shown before the API responds.
//
// Every field here is read straight off the run the API returned. There is
// deliberately no token count: the deterministic generator spends no tokens at
// all, and nothing in the pipeline meters them, so any number shown would be
// invented. Same reason there is no branch — ForgeOne does not create one.
type RunEntry = {
  id: string;
  title: string;
  status: "running" | "success" | "failed" | "warning";
  agents: number;
  /** Wall-clock elapsed, or null while a run is still going. */
  duration: string | null;
};

const FALLBACK_RUNS: RunEntry[] = [
  {
    id: "—",
    title: "No runs yet",
    status: "warning",
    agents: 0,
    duration: null,
  },
];

function mapBackendRun(r: WorkflowRun): RunEntry {
  const statusMap: Record<string, "running" | "success" | "failed" | "warning"> = {
    PENDING: "running",
    RUNNING: "running",
    COMPLETED: "success",
    FAILED: "failed",
    CANCELLED: "warning",
  };
  return {
    id: r.id,
    title: r.title,
    status: statusMap[r.status] ?? "running",
    agents: r.totalSteps,
    duration: formatElapsed(r),
  };
}

/**
 * Wall-clock length of a run, or null when there is nothing real to show.
 *
 * The seeded showcase run is written with `startedAt === completedAt`, so it
 * has no duration. Rendering that as "00m 00s" reads as a broken timer; a dash
 * reads as what it is.
 */
function formatElapsed(r: WorkflowRun): string | null {
  if (!r.completedAt) return null;
  const ms = new Date(r.completedAt).getTime() - new Date(r.startedAt).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, "0")}s`;
}

const STATUS_TINT: Record<string, string> = {
  running: "bg-primary/15 text-primary border-primary/30",
  success: "bg-success/15 text-success border-success/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  failed: "bg-destructive/15 text-destructive border-destructive/30",
};

function Landing() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchError, setDispatchError] = useState<string | null>(null);
  const [recentRuns, setRecentRuns] = useState<RunEntry[]>(FALLBACK_RUNS);
  // null while the first probe is in flight, so nothing flashes on load.
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [apiProbe, setApiProbe] = useState(0);

  // Load real runs from the backend on mount. A failure here is the earliest
  // signal that the API isn't up, so surface it rather than silently showing
  // an empty list that looks like "no runs yet".
  useEffect(() => {
    let cancelled = false;
    api
      .listRuns()
      .then((runs) => {
        if (cancelled) return;
        setApiOnline(true);
        if (runs.length > 0) {
          setRecentRuns(runs.slice(0, 6).map(mapBackendRun));
        }
      })
      .catch(() => {
        if (!cancelled) setApiOnline(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiProbe]);

  const dispatch = async (text: string) => {
    const value = text.trim();
    if (!value || isDispatching) return;
    setIsDispatching(true);
    setDispatchError(null);
    try {
      const run = await api.startRun(value.slice(0, 200), value);
      await navigate({ to: "/run", search: { prompt: value, runId: run.id } });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not reach the ForgeOne API.";
      setDispatchError(msg);
      // Navigate anyway so the UI is visible (idle state)
      await navigate({ to: "/run", search: { prompt: value, runId: "" } });
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-60" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-hero" />

      {/* Nav */}
      <header className="relative z-20 mx-auto max-w-7xl h-14 px-6 flex items-center justify-between">
        <Logo />
        <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
          <a href="#templates" className="hover:text-foreground transition-colors">
            Templates
          </a>
          <a href="#recent" className="hover:text-foreground transition-colors">
            Recent runs
          </a>
          <a
            href="https://github.com/PrinceMridul/ForgeOne/commits/main"
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground transition-colors"
          >
            Changelog
          </a>
          <a
            href="https://github.com/PrinceMridul/ForgeOne#readme"
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground transition-colors"
          >
            Docs
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard">Workspace</Link>
          </Button>
          <Button
            size="sm"
            onClick={() => dispatch(prompt || EXAMPLE_PROMPTS[0])}
            className="gap-1.5"
          >
            Dispatch <Rocket className="h-3.5 w-3.5" />
          </Button>
        </div>
      </header>

      {/* Prompt Hero */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 pt-10 md:pt-16 pb-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground animate-fade-up">
          <Sparkles className="h-3 w-3 text-primary" />
          Eight specialist agents, one prompt away
        </div>
        <h1 className="mt-5 text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05] animate-fade-up">
          Describe your <span className="gradient-text">software idea.</span>
        </h1>
        <p className="mt-4 max-w-xl mx-auto text-sm md:text-base text-muted-foreground animate-fade-up">
          Type it out. Hit dispatch. Watch a full engineering team plan, build, review, test,
          secure, and ship it — live, in front of you.
        </p>

        {apiOnline === false && (
          <div
            role="status"
            className="mt-6 mx-auto max-w-2xl flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-left animate-fade-up"
          >
            <WifiOff className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-warning">ForgeOne API is not reachable</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Start it with{" "}
                <code className="font-mono text-foreground">pnpm --filter @forgeone/api dev</code>.
                You can still browse the interface, but dispatching a run will fail.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 gap-1.5"
              onClick={() => {
                setApiOnline(null);
                setApiProbe((n) => n + 1);
              }}
            >
              <RefreshCw className="h-3 w-3" /> Retry
            </Button>
          </div>
        )}

        {/* Prompt Box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            dispatch(prompt);
          }}
          className="relative mt-8 animate-fade-up"
        >
          <div className="gradient-border rounded-2xl shadow-elegant">
            <div className="rounded-2xl surface p-3 md:p-4 text-left">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    dispatch(prompt);
                  }
                }}
                placeholder="e.g. Build a Notion-style docs app with realtime cursors, comments, and a Postgres backend…"
                rows={4}
                className="w-full resize-none bg-transparent px-2 py-2 text-base md:text-lg outline-none placeholder:text-muted-foreground/70"
              />
              <div className="mt-2 flex items-center justify-between gap-2 border-t border-border/60 pt-2.5">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="hidden sm:inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 font-mono">
                    <Command className="h-2.5 w-2.5" /> ↵
                  </span>
                  <span>to dispatch</span>
                  <span className="mx-1">·</span>
                  <span>8 agents · ~40s per run</span>
                </div>
                {dispatchError && (
                  <p className="text-[11px] text-destructive mr-2 max-w-xs truncate">
                    {dispatchError}
                  </p>
                )}
                <Button
                  type="submit"
                  size="lg"
                  className="gap-2 shadow-glow"
                  disabled={!prompt.trim() || isDispatching}
                >
                  {isDispatching ? (
                    <>
                      <span className="animate-pulse">Dispatching…</span>
                    </>
                  ) : (
                    <>
                      Dispatch Engineering Team <Send className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>

        {/* Example prompts */}
        <div className="mt-6 flex flex-wrap justify-center gap-2 animate-fade-up">
          {EXAMPLE_PROMPTS.map((ex) => (
            <button
              key={ex}
              onClick={() => setPrompt(ex)}
              className="group inline-flex items-center gap-1.5 max-w-[380px] rounded-full border border-border bg-card/40 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-card transition-colors"
            >
              <Sparkles className="h-3 w-3 text-primary shrink-0" />
              <span className="truncate">{ex}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Templates */}
      <section id="templates" className="relative z-10 mx-auto max-w-6xl px-6 pt-14 pb-10">
        <div className="flex items-end justify-between mb-5">
          <div>
            <p className="text-xs uppercase tracking-widest text-primary font-medium">
              Suggested templates
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">
              Start from a proven brief.
            </h2>
          </div>
          {/* No "browse all" link: these six are every template that exists. */}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {TEMPLATES.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.name}
                onClick={() => {
                  setPrompt(t.prompt);
                }}
                className="group surface p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-glow"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-md bg-gradient-primary flex items-center justify-center shadow-glow">
                    <Icon className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{t.tag}</p>
                  </div>
                  <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="mt-3 text-xs text-muted-foreground line-clamp-2">{t.prompt}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Recent runs */}
      <section id="recent" className="relative z-10 mx-auto max-w-6xl px-6 pt-4 pb-24">
        <div className="flex items-end justify-between mb-5">
          <div>
            <p className="text-xs uppercase tracking-widest text-primary font-medium">
              Recent runs
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">
              Pick up where the team left off.
            </h2>
          </div>
          <Link
            to="/activity"
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            View activity <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="surface overflow-hidden divide-y divide-border">
          {recentRuns.map((r) => {
            const StatusIcon =
              r.status === "success"
                ? CheckCircle2
                : r.status === "warning"
                  ? AlertTriangle
                  : r.status === "running"
                    ? Rocket
                    : AlertTriangle;
            return (
              <Link
                key={r.id}
                to="/run"
                search={{ prompt: r.title, runId: r.id }}
                className="group flex items-center gap-4 px-4 py-3 hover:bg-accent/40 transition-colors"
              >
                <div
                  className={cn(
                    "h-8 w-8 rounded-md border flex items-center justify-center",
                    STATUS_TINT[r.status],
                  )}
                >
                  <StatusIcon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{r.title}</p>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                    <span className="font-mono">{r.id.slice(0, 12)}…</span>
                    <span>·</span>
                    <span>{r.agents} agents</span>
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-4 text-[11px] text-muted-foreground tabular-nums">
                  {r.duration && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {r.duration}
                    </span>
                  )}
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            );
          })}
        </div>
      </section>

      <footer className="relative z-10 border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-6 flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <Logo />
            <span>ForgeOne · MIT licensed · built for the ChatGPT Codex Hackathon 2026</span>
          </div>
          <div className="flex items-center gap-5">
            <a
              href="https://github.com/PrinceMridul/ForgeOne"
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground"
            >
              GitHub
            </a>
            <a
              href="https://github.com/PrinceMridul/ForgeOne/blob/main/docs/CODEX_USAGE.md"
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground"
            >
              How it was built
            </a>
            <a
              href="https://github.com/PrinceMridul/ForgeOne/blob/main/README.md#limitations"
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground"
            >
              Limitations
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
