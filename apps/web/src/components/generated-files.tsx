import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveEngine } from "@/lib/live-engine";
import { api } from "@/lib/api-client";
import { agents as seedAgents } from "@/lib/mock-data";

export interface GeneratedFile {
  path: string;
  source: string;
  language: string;
  adds: number;
  dels: number;
  tested?: boolean;
  scanned?: boolean;
  reviews?: Array<{ line: number; msg: string; severity: "info" | "warn" | "ok" }>;
}
import {
  useBuildVerification,
  startBuildVerification,
  resetBuildVerification,
  getBuildStepColorToken,
  type BuildStepId,
} from "@/lib/build-verification";
import {
  ChevronRight,
  Folder,
  FolderOpen,
  FileCode2,
  FileText,
  Database,
  Braces,
  Cog,
  FlaskConical,
  Package,
  Download,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CodeViewer } from "@/components/code-viewer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

/* ------------------------------------------------------------------ */
/* Tree model                                                          */
/* ------------------------------------------------------------------ */

interface EmittedFile extends GeneratedFile {
  bornTick: number;
  timestamp: string;
  agent: string;
}

interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  file?: EmittedFile;
  children: TreeNode[];
  bornTick: number;
}

function iconFor(path: string, lang: string) {
  if (path.endsWith(".sql") || path.includes("/db/")) return Database;
  if (path.endsWith(".yaml") || path.endsWith(".yml") || path.endsWith(".json")) return Braces;
  if (path.endsWith(".md")) return FileText;
  if (path.endsWith(".toml") || path === "wrangler.toml") return Cog;
  if (path.startsWith("tests/") || path.includes(".spec.")) return FlaskConical;
  if (lang === "tsx" || lang === "ts") return FileCode2;
  return FileCode2;
}

/** Mirrors the verb/filler list the API strips when naming a repository. */
const TITLE_STOPWORDS = new Set([
  "build",
  "ship",
  "create",
  "design",
  "prototype",
  "add",
  "make",
  "develop",
  "implement",
  "an",
  "the",
  "with",
  "and",
  "for",
  "on",
  "of",
  "to",
  "in",
  "using",
  "that",
  "my",
  "app",
  "application",
  "platform",
  "system",
  "tool",
  "service",
  "website",
  "site",
  "clone",
  "style",
  "like",
  "top",
  "its",
  "some",
]);

/**
 * The repository's own package.json is the source of truth for its name, so
 * the tree is labelled with what the Developer actually produced rather than
 * a fixed placeholder.
 */
function repoNameFrom(files: EmittedFile[], fallback: string): string {
  const pkg = files.find((f) => f.path === "package.json" || f.path.endsWith("/package.json"));
  if (pkg?.source) {
    try {
      const parsed = JSON.parse(pkg.source) as { name?: unknown };
      if (typeof parsed.name === "string" && parsed.name.trim()) return parsed.name.trim();
    } catch {
      // Partially streamed or non-JSON content — fall through to the fallback.
    }
  }
  return fallback;
}

function buildTree(files: EmittedFile[], rootName: string): TreeNode {
  const root: TreeNode = {
    name: rootName,
    path: "",
    isFolder: true,
    children: [],
    bornTick: 0,
  };
  for (const f of files) {
    const parts = f.path.split("/");
    let cur = root;
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const isLeaf = i === parts.length - 1;
      const full = parts.slice(0, i + 1).join("/");
      let next = cur.children.find((c) => c.name === name);
      if (!next) {
        next = {
          name,
          path: full,
          isFolder: !isLeaf,
          children: [],
          bornTick: f.bornTick,
          file: isLeaf ? f : undefined,
        };
        cur.children.push(next);
      } else if (isLeaf) {
        next.file = f;
        next.bornTick = f.bornTick;
      }
      cur = next;
    }
  }
  // folders sort first
  const sortRec = (n: TreeNode) => {
    n.children.sort((a, b) => {
      if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    n.children.forEach(sortRec);
  };
  sortRec(root);
  return root;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function GeneratedFiles({ height = 440 }: { height?: number }) {
  const { pipeline, tick, producedArtifacts, artifacts, runningRunId, backendRun } =
    useLiveEngine();
  const build = useBuildVerification();

  const dev = pipeline.find((n) => n.agentId === "developer");
  const reviewer = pipeline.find((n) => n.agentId === "reviewer");
  const tester = pipeline.find((n) => n.agentId === "tester");
  const security = pipeline.find((n) => n.agentId === "security");

  const devActive = dev?.stage === "generating" || dev?.stage === "validating";
  const repoZipped =
    producedArtifacts.includes("Repository.zip") ||
    artifacts.some((a) => a.name === "Repository.zip");

  const reviewerActive =
    reviewer?.stage === "running" ||
    reviewer?.stage === "generating" ||
    reviewer?.stage === "validating";
  const reviewerDone = reviewer?.stage === "completed";
  const testerActive =
    tester?.stage === "running" || tester?.stage === "generating" || tester?.stage === "validating";
  const securityActive =
    security?.stage === "running" ||
    security?.stage === "generating" ||
    security?.stage === "validating";

  const [emitted, setEmitted] = useState<EmittedFile[]>([]);
  const [collapsing, setCollapsing] = useState(false);
  const [zipped, setZipped] = useState(false);
  const [selected, setSelected] = useState<EmittedFile | null>(null);

  // Sync emitted files from backend artifacts
  useEffect(() => {
    // Loop reset: developer went back to waiting → wipe.
    if (dev?.stage === "waiting" && emitted.length > 0 && !repoZipped) {
      setEmitted([]);
      setZipped(false);
      setCollapsing(false);
      resetBuildVerification();
      return;
    }

    const fileArts = artifacts.filter(
      (a) => !a.name.endsWith(".zip") && !a.name.endsWith(".tar.gz"),
    );

    if (fileArts.length > 0) {
      const now = new Date();
      const mapped: EmittedFile[] = fileArts.map((a, i) => ({
        path: a.name,
        source: a.content ?? `// Content for ${a.name}`,
        language: a.name.split(".").pop() ?? "ts",
        adds: Math.max(10, a.name.length * 3 + 15),
        dels: 0,
        bornTick: tick - (fileArts.length - i),
        timestamp: a.when || now.toTimeString().slice(0, 8),
        agent: `${a.agent} · ${a.kind}`,
      }));

      const newPaths = mapped.map((m) => m.path).join(",");
      const currentPaths = emitted.map((e) => e.path).join(",");
      if (newPaths !== currentPaths) {
        setEmitted(mapped);
      }
    }
  }, [artifacts, dev?.stage, emitted, repoZipped, tick]);

  // Kick off Build Verification the moment Repository.zip is produced.
  useEffect(() => {
    if (repoZipped && !build.active && !build.endedAt && emitted.length > 0) {
      const repoSizeKb = emitted.reduce(
        (n, f) => n + Math.max(1, Math.round((f.source.length ?? 0) / 1024) + f.adds / 40),
        0,
      );
      startBuildVerification({
        filesGenerated: emitted.length,
        repoSizeKb: Math.max(180, Math.round(repoSizeKb)),
        artifactsProduced: [
          "Repository.zip",
          "openapi.yaml",
          "coverage-report.html",
          "sast-report.json",
        ],
      });
    }
  }, [repoZipped, build.active, build.endedAt, emitted.length]);

  // Hold the collapse-to-zip animation until Build Verification finishes so
  // the repository tree stays visible throughout the CI pipeline.
  useEffect(() => {
    if (repoZipped && build.endedAt && !zipped && !collapsing && emitted.length > 0) {
      setCollapsing(true);
      const t = setTimeout(() => setZipped(true), 900);
      return () => clearTimeout(t);
    }
    // If loop resets, allow tree again
    if (!repoZipped && zipped) {
      setZipped(false);
      setCollapsing(false);
    }
  }, [repoZipped, build.endedAt, zipped, collapsing, emitted.length]);

  // Until package.json streams in, fall back to a slug of the run title so the
  // panel never shows an unrelated project name. Drops the same imperative
  // verbs and filler the backend strips, so the interim label matches the
  // final one closely rather than reading "ship-a-slack".
  const fallbackName = useMemo(() => {
    const slug = (backendRun?.title ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 1 && !TITLE_STOPWORDS.has(w))
      .slice(0, 3)
      .join("-");
    return slug || "repository";
  }, [backendRun?.title]);

  const repoName = useMemo(() => repoNameFrom(emitted, fallbackName), [emitted, fallbackName]);
  const tree = useMemo(() => buildTree(emitted, repoName), [emitted, repoName]);
  const totalAdds = emitted.reduce((n, f) => n + f.adds, 0);
  const totalDels = emitted.reduce((n, f) => n + f.dels, 0);

  return (
    <div className="surface overflow-hidden flex flex-col" style={{ height }}>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <Package className="h-4 w-4 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">Repository · {repoName}</p>
            <p className="text-[11px] text-muted-foreground truncate">
              {emitted.length} files · <span className="text-success">+{totalAdds}</span>{" "}
              <span className="text-destructive">−{totalDels}</span>
              {devActive && (
                <>
                  {" "}
                  · <span className="text-primary">writing…</span>
                </>
              )}
              {reviewerActive && (
                <>
                  {" "}
                  · <span className="text-warning">reviewing</span>
                </>
              )}
              {testerActive && (
                <>
                  {" "}
                  · <span className="text-chart-2">testing</span>
                </>
              )}
              {securityActive && (
                <>
                  {" "}
                  · <span className="text-destructive">scanning</span>
                </>
              )}
            </p>
          </div>
        </div>
        {devActive && (
          <span className="relative flex h-2 w-2">
            <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-75" />
            <span className="relative rounded-full h-2 w-2 bg-primary" />
          </span>
        )}
      </div>

      <div className="relative flex-1 overflow-y-auto">
        {emitted.length === 0 && (
          <div className="h-full flex items-center justify-center text-center px-6">
            <div>
              <div className="mx-auto h-10 w-10 rounded-md border border-dashed border-border flex items-center justify-center">
                <Folder className="h-4 w-4 text-muted-foreground animate-pulse" />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {dev?.stage === "waiting"
                  ? "Waiting for Developer agent..."
                  : dev?.stage === "running" ||
                      dev?.stage === "generating" ||
                      dev?.stage === "validating"
                    ? "Repository is being generated..."
                    : "Repository is empty."}
              </p>
            </div>
          </div>
        )}

        {emitted.length > 0 && !zipped && (
          <div
            className={cn(
              "py-2 origin-top transition-all",
              collapsing && "animate-[collapse-to-zip_900ms_ease-in_forwards]",
            )}
          >
            {tree.children.map((child) => (
              <TreeRow
                key={child.path}
                node={child}
                depth={0}
                currentTick={tick}
                onSelect={setSelected}
                reviewerActive={reviewerActive || reviewerDone}
                testerActive={testerActive}
                securityActive={securityActive}
              />
            ))}
          </div>
        )}

        {zipped && (
          <ZipCard adds={totalAdds} dels={totalDels} files={emitted.length} runId={runningRunId} />
        )}
      </div>

      {/* Global scan sweep during Security */}
      {securityActive && !zipped && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-destructive/10 to-transparent"
            style={{ animation: "scan-sweep 2.4s linear infinite" }}
          />
        </div>
      )}

      {/* Build verification sweep — subtle wash tinted per active CI step. */}
      {build.active && !zipped && emitted.length > 0 && (
        <BuildSweep stepId={build.steps[build.currentIndex]?.id} />
      )}

      <FileDialog
        file={selected}
        onClose={() => setSelected(null)}
        showReviews={reviewerActive || reviewerDone}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Build sweep overlay                                                 */
/* ------------------------------------------------------------------ */

function BuildSweep({ stepId }: { stepId: BuildStepId | undefined }) {
  const token = getBuildStepColorToken(stepId);
  const label = stepId ?? "";
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className={cn(
          "absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent to-transparent",
          token === "primary" && "via-primary/10",
          token === "warning" && "via-warning/10",
          token === "info" && "via-info/10",
          token === "chart-2" && "via-chart-2/10",
          token === "chart-4" && "via-chart-4/10",
          token === "success" && "via-success/10",
        )}
        style={{ animation: "scan-sweep 2.8s linear infinite" }}
      />
      <span
        className={cn(
          "absolute top-2 right-2 rounded-full border px-2 py-0.5 text-[10px] font-mono bg-background/80 backdrop-blur",
          token === "primary" && "border-primary/40 text-primary",
          token === "warning" && "border-warning/40 text-warning",
          token === "info" && "border-info/40 text-info",
          token === "chart-2" && "border-chart-2/40 text-chart-2",
          token === "chart-4" && "border-chart-4/40 text-chart-4",
          token === "success" && "border-success/40 text-success",
        )}
      >
        ci · {label}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Row                                                                 */
/* ------------------------------------------------------------------ */

function TreeRow({
  node,
  depth,
  currentTick,
  onSelect,
  reviewerActive,
  testerActive,
  securityActive,
}: {
  node: TreeNode;
  depth: number;
  currentTick: number;
  onSelect: (f: EmittedFile) => void;
  reviewerActive: boolean;
  testerActive: boolean;
  securityActive: boolean;
}) {
  const [open, setOpen] = useState(true);
  const isFresh = currentTick - node.bornTick <= 2;

  if (node.isFolder) {
    return (
      <div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center gap-1.5 px-3 py-1 text-xs hover:bg-accent/40 transition-colors animate-[file-appear_360ms_ease-out]"
          style={{ paddingLeft: `${depth * 14 + 12}px` }}
        >
          <ChevronRight
            className={cn(
              "h-3 w-3 transition-transform text-muted-foreground",
              open && "rotate-90",
            )}
          />
          {open ? (
            <FolderOpen className="h-3.5 w-3.5 text-primary" />
          ) : (
            <Folder className="h-3.5 w-3.5 text-primary" />
          )}
          <span className="font-mono">{node.name}</span>
        </button>
        {open &&
          node.children.map((c) => (
            <TreeRow
              key={c.path}
              node={c}
              depth={depth + 1}
              currentTick={currentTick}
              onSelect={onSelect}
              reviewerActive={reviewerActive}
              testerActive={testerActive}
              securityActive={securityActive}
            />
          ))}
      </div>
    );
  }

  const f = node.file!;
  const Icon = iconFor(f.path, f.language);
  const isTested = testerActive && f.tested;
  const isScanned = securityActive && f.scanned;
  const reviewCount = reviewerActive ? (f.reviews?.length ?? 0) : 0;
  const openReviews = reviewerActive
    ? (f.reviews?.filter((r) => r.severity === "warn").length ?? 0)
    : 0;

  return (
    <div
      className={cn(
        "relative animate-[file-appear_420ms_ease-out]",
        isFresh && "animate-[file-glow_1400ms_ease-out]",
      )}
    >
      <button
        onClick={() => onSelect(f)}
        className={cn(
          "group w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent/50 transition-colors text-left",
          isTested && "bg-chart-2/[0.06]",
          isScanned && "bg-destructive/[0.05]",
        )}
        style={{ paddingLeft: `${depth * 14 + 12}px` }}
      >
        <span className="w-3" />
        <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="font-mono truncate flex-1">{node.name}</span>

        {isTested && (
          <span className="hidden md:inline-flex items-center gap-1 text-[10px] text-chart-2">
            <FlaskConical className="h-3 w-3" /> testing
          </span>
        )}
        {isScanned && (
          <span className="hidden md:inline-flex items-center gap-1 text-[10px] text-destructive">
            <ShieldCheck className="h-3 w-3" /> scan
          </span>
        )}
        {reviewCount > 0 && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-1.5 py-0 text-[10px]",
              openReviews > 0
                ? "border-warning/40 bg-warning/10 text-warning"
                : "border-success/40 bg-success/10 text-success",
            )}
          >
            {openReviews > 0 ? (
              <AlertTriangle className="h-2.5 w-2.5" />
            ) : (
              <CheckCircle2 className="h-2.5 w-2.5" />
            )}
            {reviewCount}
          </span>
        )}

        <span className="ml-1 hidden lg:inline text-[10px] text-muted-foreground shrink-0">
          {f.timestamp}
        </span>
        <span className="ml-1 font-mono tabular-nums text-[10px] shrink-0">
          <span className="text-success">+{f.adds}</span>{" "}
          <span className="text-destructive">−{f.dels}</span>
        </span>
      </button>
      {isFresh && (
        <p className="pl-[46px] pr-3 pb-1 text-[10px] text-muted-foreground/80 animate-fade-in">
          generated by <span className="text-foreground">{f.agent}</span> · {f.timestamp}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Zip result                                                          */
/* ------------------------------------------------------------------ */

function ZipCard({
  adds,
  dels,
  files,
  runId,
}: {
  adds: number;
  dels: number;
  files: number;
  runId: string;
}) {
  return (
    <div className="h-full flex items-center justify-center p-6 animate-[fade-up_600ms_ease-out]">
      <div className="surface p-6 w-full max-w-sm text-center">
        <div className="mx-auto h-14 w-14 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
          <Package className="h-6 w-6 text-primary-foreground" />
        </div>
        <p className="mt-3 text-sm font-medium">Repository.zip</p>
        <p className="mt-1 text-[11px] text-muted-foreground font-mono">
          {files} files · <span className="text-success">+{adds}</span>{" "}
          <span className="text-destructive">−{dels}</span> · sha 4c9e1a2
        </p>
        <Button size="sm" className="mt-4 w-full gap-1.5" asChild>
          <a
            href={api.artifactDownloadUrl(runId, "Repository.zip")}
            download="Repository.zip"
            target="_blank"
            rel="noreferrer"
          >
            <Download className="h-3.5 w-3.5" /> Download Repository.zip
          </a>
        </Button>
        <p className="mt-2 text-[10px] text-muted-foreground">
          Sealed by Kai · handed off to Reviewer, Tester, Security & DevOps
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* File dialog                                                         */
/* ------------------------------------------------------------------ */

function FileDialog({
  file,
  onClose,
  showReviews,
}: {
  file: EmittedFile | null;
  onClose: () => void;
  showReviews: boolean;
}) {
  return (
    <Dialog open={!!file} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden gap-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="min-w-0">
            <DialogTitle className="text-sm font-mono truncate">{file?.path}</DialogTitle>
            <DialogDescription className="text-[11px] text-muted-foreground">
              {file && (
                <>
                  {file.agent} · {file.timestamp} ·{" "}
                  <span className="text-success">+{file.adds}</span>{" "}
                  <span className="text-destructive">−{file.dels}</span>
                </>
              )}
            </DialogDescription>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>
        {file && (
          <div className="max-h-[70vh] overflow-y-auto">
            {showReviews && file.reviews && file.reviews.length > 0 && (
              <div className="border-b border-border bg-warning/[0.04] px-4 py-3 space-y-1.5">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Reviewer annotations
                </p>
                {file.reviews.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    {r.severity === "warn" && (
                      <AlertTriangle className="h-3.5 w-3.5 text-warning mt-0.5" />
                    )}
                    {r.severity === "ok" && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-success mt-0.5" />
                    )}
                    {r.severity === "info" && <Info className="h-3.5 w-3.5 text-info mt-0.5" />}
                    <span className="font-mono text-[10px] text-muted-foreground w-12 shrink-0">
                      L{r.line}
                    </span>
                    <span
                      className={cn(
                        r.severity === "warn" && "text-warning",
                        r.severity === "ok" && "text-success",
                        r.severity === "info" && "text-info",
                      )}
                    >
                      {r.msg}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <CodeViewer
              code={file.source}
              filename={file.path}
              language={file.language}
              className="border-0 rounded-none"
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Keep the seedAgents import used (referenced for consistency with other components)
void seedAgents;
