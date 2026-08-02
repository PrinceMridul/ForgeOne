import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import { Breadcrumb } from "@/components/breadcrumb";
import { RepositoryTree } from "@/components/repository-tree";
import { CodeViewer } from "@/components/code-viewer";
import { GitBranch, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useLiveEngine, connectToRun, type Artifact } from "@/lib/live-engine";
import { api } from "@/lib/api-client";
import type { FileNode } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/repository")({
  head: () => ({
    meta: [
      { title: "Repository · ForgeOne" },
      {
        name: "description",
        content: "VS Code-style explorer for your ForgeOne project repository.",
      },
      { property: "og:title", content: "Repository · ForgeOne" },
      {
        property: "og:description",
        content: "Browse files, diffs, and history — powered by agent context.",
      },
    ],
  }),
  component: RepositoryPage,
});

/** The generated repository's own package.json is the source of its name. */
function repoNameFrom(files: Artifact[]): string {
  const pkg = files.find((f) => f.name === "package.json");
  if (pkg?.content) {
    try {
      const parsed = JSON.parse(pkg.content) as { name?: unknown };
      if (typeof parsed.name === "string" && parsed.name.trim()) return parsed.name.trim();
    } catch {
      // Not valid JSON yet — fall through.
    }
  }
  return "repository";
}

function buildFileTreeFromArtifacts(
  artifacts: Artifact[],
  searchQuery: string,
): {
  tree: FileNode;
  fileCount: number;
  map: Map<string, Artifact>;
} {
  const map = new Map<string, Artifact>();

  // Only files that are genuinely in Repository.zip, so this explorer's file
  // count matches the download and the live console. Filtering merely by
  // "not an archive" also pulled in PRD.md, Architecture.md and the other
  // pipeline documents.
  let fileArtifacts = artifacts.filter((a) => a.inRepository);

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    fileArtifacts = fileArtifacts.filter((a) => a.name.toLowerCase().includes(q));
  }

  // No invented placeholder files: an empty repository renders as empty, and
  // the page explains why rather than showing a fabricated package.json.
  const sourceFiles = fileArtifacts;

  // Name the tree after the repository that was actually generated, read from
  // its own package.json, rather than a fixed placeholder.
  const repoName = repoNameFrom(sourceFiles);

  const root: FileNode = {
    name: repoName,
    type: "folder",
    children: [],
  };

  const fileCount = sourceFiles.length;

  for (const item of sourceFiles) {
    const parts = item.name.split("/");
    let cur = root;

    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const isLeaf = i === parts.length - 1;
      const fullPath = `${repoName}/${parts.slice(0, i + 1).join("/")}`;

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
        map.set(fullPath, item);
        map.set(parts.slice(0, i + 1).join("/"), item);
        map.set(name, item);
      } else {
        cur = existing;
      }
    }
  }

  const sortNode = (n: FileNode) => {
    if (n.children) {
      n.children.sort((a, b) => {
        if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      n.children.forEach(sortNode);
    }
  };
  sortNode(root);

  return { tree: root, fileCount, map };
}

/** The seeded showcase run, used only when the API has no real run yet. */
const SEEDED_RUN_ID = "f1eebc99-9c0b-4ef8-bb6d-6bb9bd380a99";

function RepositoryPage() {
  const { artifacts, runningRunId } = useLiveEngine();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState("");
  const [codeContent, setCodeContent] = useState<string>("// Loading repository artifact...");
  const [isSeeded, setIsSeeded] = useState(false);

  // Attach to the run the API says is newest, not to a hardcoded id. This page
  // used to connect straight to the seeded showcase run and describe its four
  // fixture files as "the most recent run", which contradicted the live console
  // sitting one click away with nineteen.
  useEffect(() => {
    if (runningRunId) return;
    let cancelled = false;
    api
      .listRuns()
      .then((runs) => {
        if (cancelled) return;
        const newest = runs.find((r) => r.id !== SEEDED_RUN_ID) ?? runs[0];
        if (!newest) return;
        setIsSeeded(newest.id === SEEDED_RUN_ID);
        connectToRun(newest.id);
      })
      .catch(() => {
        if (!cancelled) setIsSeeded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [runningRunId]);

  const { tree, fileCount, map } = useMemo(
    () => buildFileTreeFromArtifacts(artifacts, search),
    [artifacts, search],
  );

  // Default selection if current selected path is not found
  const activePath = useMemo(() => {
    if (map.has(selected)) return selected;
    const firstKey = map.keys().next().value;
    return firstKey ?? selected;
  }, [selected, map]);

  useEffect(() => {
    const art = map.get(activePath);
    if (!art) {
      setCodeContent("// No backend artifact found for selected path");
      return;
    }

    if (art.content) {
      setCodeContent(art.content);
      return;
    }

    // Fetch real content from backend download endpoint
    const rId = art.runId || runningRunId;
    if (rId && art.id) {
      const url = api.artifactDownloadUrl(rId, art.id);
      fetch(url)
        .then((res) => (res.ok ? res.text() : Promise.reject(new Error(res.statusText))))
        .then((text) => setCodeContent(text))
        .catch(() =>
          setCodeContent(`// Content of ${art.name}\n// Backend Artifact ID: ${art.id}`),
        );
    } else {
      setCodeContent(`// Content of ${art.name}`);
    }
  }, [activePath, map, runningRunId]);

  const activeFilename = activePath.split("/").pop() ?? activePath;
  const activeLang = activeFilename.split(".").pop() ?? "ts";

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
      <Breadcrumb items={[{ label: "Repository" }]} />
      {/* Named after the repository the pipeline actually produced, not a
          fixed placeholder. */}
      <PageHeader
        title={tree.name}
        description={
          fileCount === 0
            ? "No repository yet — dispatch a run to generate one."
            : isSeeded
              ? `${fileCount} files from the bundled sample run. Dispatch a run to browse a real one.`
              : `${fileCount} files from the most recent run.`
        }
        actions={
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <GitBranch className="h-3.5 w-3.5" /> main · {fileCount} files
          </div>
        }
      />

      <div className="surface grid grid-cols-12 h-[720px] overflow-hidden">
        <div className="col-span-3 border-r border-border flex flex-col h-full min-h-0">
          <div className="border-b border-border p-2 shrink-0">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search files…"
                className="h-7 pl-7 text-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-1.5 min-h-0">
            <RepositoryTree node={tree} onSelect={setSelected} selected={activePath} />
          </div>
        </div>
        <div className="col-span-9 overflow-hidden h-full">
          <CodeViewer
            code={codeContent}
            filename={activePath}
            language={activeLang}
            className="border-0 rounded-none h-full"
          />
        </div>
      </div>
    </div>
  );
}
