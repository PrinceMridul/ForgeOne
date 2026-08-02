import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Breadcrumb } from "@/components/breadcrumb";
import { CodeViewer } from "@/components/code-viewer";
import { useLiveEngine, connectToRun } from "@/lib/live-engine";
import { api } from "@/lib/api-client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_app/code")({
  head: () => ({
    meta: [
      { title: "Code Preview · ForgeOne" },
      {
        name: "description",
        content: "Preview the source files the Developer agent generated.",
      },
      { property: "og:title", content: "Code Preview · ForgeOne" },
      {
        property: "og:description",
        content: "Browse agent-authored source files with syntax highlighting.",
      },
    ],
  }),
  component: CodePage,
});

/** The seeded showcase run, used only when the API has no real run yet. */
const SEEDED_RUN_ID = "f1eebc99-9c0b-4ef8-bb6d-6bb9bd380a99";

function CodePage() {
  const { artifacts, runningRunId } = useLiveEngine();
  const [selected, setSelected] = useState<string | null>(null);

  // Attach to whatever run the API says is newest. Without this the page had
  // no run at all and fell back to a two-line hardcoded snippet while calling
  // itself a "live backend artifact preview".
  useEffect(() => {
    if (runningRunId) return;
    let cancelled = false;
    api
      .listRuns()
      .then((runs) => {
        if (cancelled) return;
        const newest = runs.find((r) => r.id !== SEEDED_RUN_ID) ?? runs[0];
        if (newest) connectToRun(newest.id);
      })
      .catch(() => {
        /* The empty state below already explains an unreachable API. */
      });
    return () => {
      cancelled = true;
    };
  }, [runningRunId]);

  // Only files that are genuinely inside the generated repository, so this
  // page never previews a pipeline document as if it were source.
  const sourceFiles = useMemo(
    () => artifacts.filter((a) => a.inRepository && typeof a.content === "string"),
    [artifacts],
  );

  const active = useMemo(
    () => sourceFiles.find((a) => a.name === selected) ?? sourceFiles[0],
    [sourceFiles, selected],
  );

  if (!active) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <Breadcrumb items={[{ label: "Code" }]} />
        <PageHeader title="Code preview" description="Source files from the most recent run." />
        <div className="surface p-8 text-center text-sm text-muted-foreground">
          No generated source yet — dispatch a run from the landing page.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <Breadcrumb items={[{ label: "Code" }]} />
      <PageHeader
        title="Code preview"
        description={`${sourceFiles.length} source files from the most recent run.`}
      />
      {/* One tab per file that actually exists, rather than fixed tabs for a
          schema and a diff this page cannot produce. */}
      <Tabs value={active.name} onValueChange={setSelected}>
        <TabsList className="flex-wrap">
          {sourceFiles.slice(0, 12).map((file) => (
            <TabsTrigger key={file.id} value={file.name}>
              {file.name}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <CodeViewer
        code={active.content ?? ""}
        filename={active.name}
        language={active.name.split(".").pop() ?? "ts"}
      />
    </div>
  );
}
