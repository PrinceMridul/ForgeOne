import { useMemo, useState } from "react";
import { useLiveEngine, type Artifact } from "@/lib/live-engine";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import {
  Download,
  Package,
  TestTube2,
  ShieldCheck,
  FileText,
  Database,
  ImageIcon,
  FileCode2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const kindIcon: Record<Artifact["kind"], any> = {
  build: Package,
  test: TestTube2,
  security: ShieldCheck,
  spec: FileCode2,
  db: Database,
  doc: FileText,
  image: ImageIcon,
};

const kindTint: Record<Artifact["kind"], string> = {
  build: "text-primary bg-primary/10 border-primary/20",
  test: "text-chart-2 bg-chart-2/10 border-chart-2/20",
  security: "text-destructive bg-destructive/10 border-destructive/20",
  spec: "text-chart-4 bg-chart-4/10 border-chart-4/20",
  db: "text-warning bg-warning/10 border-warning/20",
  doc: "text-info bg-info/10 border-info/20",
  image: "text-chart-5 bg-chart-5/10 border-chart-5/20",
};

const FILTERS: (Artifact["kind"] | "all")[] = [
  "all",
  "build",
  "test",
  "security",
  "spec",
  "db",
  "doc",
];

export function ArtifactExplorer({ maxHeight = 520 }: { maxHeight?: number }) {
  const { artifacts, runningRunId } = useLiveEngine();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [selected, setSelected] = useState<string | null>(null);

  const visible = useMemo(
    () => artifacts.filter((a) => (filter === "all" ? true : a.kind === filter)),
    [artifacts, filter],
  );
  const active = visible.find((a) => a.id === selected) ?? visible[0];

  return (
    <div className="surface overflow-hidden flex flex-col max-w-full" style={{ height: maxHeight }}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 shrink-0">
        <div>
          <p className="text-sm font-medium">Artifact explorer</p>
          <p className="text-[11px] text-muted-foreground">
            {artifacts.length} artifacts emitted this session
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "text-[10px] uppercase tracking-wider px-2 py-1 rounded-md border border-transparent transition-colors",
                filter === f
                  ? "border-border bg-accent"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] flex-1 overflow-hidden min-h-0 min-w-0">
        <ul className="overflow-y-auto divide-y divide-border h-full min-w-0">
          {visible.map((a) => {
            const Icon = kindIcon[a.kind] ?? FileText;
            const isActive = active?.id === a.id;
            return (
              <li key={a.id}>
                <button
                  onClick={() => setSelected(a.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/40",
                    isActive && "bg-accent/60",
                  )}
                >
                  <div
                    className={cn(
                      "h-8 w-8 rounded-md border flex items-center justify-center shrink-0",
                      kindTint[a.kind] ?? "text-info bg-info/10 border-info/20",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono truncate">{a.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {a.size} · {a.agent} · {a.when}
                    </p>
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                    {a.sha}
                  </span>
                </button>
              </li>
            );
          })}
          {visible.length === 0 && (
            <li className="p-6 text-center text-xs text-muted-foreground">No artifacts yet.</li>
          )}
        </ul>
        {active && (
          <aside className="border-t md:border-t-0 md:border-l border-border p-4 overflow-y-auto h-full flex flex-col justify-between animate-fade-in min-w-0">
            <div>
              <div
                className={cn(
                  "h-10 w-10 rounded-md border flex items-center justify-center",
                  kindTint[active.kind] ?? "text-info bg-info/10 border-info/20",
                )}
              >
                {(() => {
                  const I = kindIcon[active.kind] ?? FileText;
                  return <I className="h-4 w-4" />;
                })()}
              </div>
              <p className="mt-3 text-sm font-mono break-all">{active.name}</p>
              <dl className="mt-3 space-y-1.5 text-[11px]">
                <Row k="Kind" v={active.kind} />
                <Row k="Size" v={active.size} />
                <Row k="Agent" v={active.agent} />
                <Row k="When" v={active.when} />
                <Row k="SHA" v={active.sha} mono />
              </dl>
            </div>
            <Button size="sm" className="mt-4 w-full gap-1.5 shrink-0" asChild>
              <a
                href={api.artifactDownloadUrl(
                  active.runId || runningRunId,
                  active.id || active.name,
                )}
                download={active.name}
                target="_blank"
                rel="noreferrer"
              >
                <Download className="h-3 w-3" /> Download
              </a>
            </Button>
          </aside>
        )}
      </div>
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className={cn("truncate text-right", mono && "font-mono")}>{v}</dd>
    </div>
  );
}
