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

function buildFileTreeFromArtifacts(
  artifacts: Artifact[],
  searchQuery: string,
): {
  tree: FileNode;
  fileCount: number;
  map: Map<string, Artifact>;
} {
  const map = new Map<string, Artifact>();

  // Filter out non-file build archives like Repository.zip
  let fileArtifacts = artifacts.filter((a) => {
    if (a.name.endsWith(".zip") || a.name.endsWith(".tar.gz")) return false;
    return true;
  });

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    fileArtifacts = fileArtifacts.filter((a) => a.name.toLowerCase().includes(q));
  }

  const sourceFiles =
    fileArtifacts.length > 0
      ? fileArtifacts
      : [
          {
            id: "default-1",
            runId: "",
            name: "package.json",
            kind: "spec" as const,
            size: "320 B",
            when: "just now",
            agent: "Kai",
            sha: "4c9e1a2",
            content: '{\n  "name": "meridian-api",\n  "version": "1.0.0",\n  "private": true\n}\n',
          },
          {
            id: "default-2",
            runId: "",
            name: "src/index.ts",
            kind: "doc" as const,
            size: "512 B",
            when: "just now",
            agent: "Kai",
            sha: "4c9e1a2",
            content:
              'import Fastify from "fastify";\nconst server = Fastify();\nserver.listen({ port: 4000 });\n',
          },
        ];

  const root: FileNode = {
    name: "meridian-api",
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

function RepositoryPage() {
  const { artifacts, runningRunId } = useLiveEngine();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState("meridian-api/src/index.ts");
  const [codeContent, setCodeContent] = useState<string>("// Loading repository artifact...");

  useEffect(() => {
    if (!runningRunId) {
      connectToRun("f1eebc99-9c0b-4ef8-bb6d-6bb9bd380a99");
    }
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
      <PageHeader
        title="meridian-api"
        description="Multi-tenant billing engine with usage-based metering."
        actions={
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <GitBranch className="h-3.5 w-3.5" /> main · {fileCount} files changed
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
