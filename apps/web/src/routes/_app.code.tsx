import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Breadcrumb } from "@/components/breadcrumb";
import { CodeViewer } from "@/components/code-viewer";
import { useLiveEngine } from "@/lib/live-engine";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_app/code")({
  head: () => ({
    meta: [
      { title: "Code Preview · ForgeOne" },
      {
        name: "description",
        content: "Preview and diff generated code with Monaco Editor integration.",
      },
      { property: "og:title", content: "Code Preview · ForgeOne" },
      { property: "og:description", content: "Preview agent-authored diffs before they hit main." },
    ],
  }),
  component: CodePage,
});

function CodePage() {
  const { artifacts } = useLiveEngine();

  const codeArtifact = artifacts.find(
    (a) => a.name.endsWith(".ts") || a.name.endsWith(".json") || a.name.endsWith(".md"),
  );

  const code =
    codeArtifact?.content ?? "// Backend artifact source code\nimport Fastify from 'fastify';\n";
  const filename = codeArtifact?.name ?? "src/index.ts";

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
      <Breadcrumb items={[{ label: "Code" }]} />
      <PageHeader
        title="Code preview"
        description="Live backend artifact preview with syntax highlighting."
      />
      <Tabs defaultValue="file">
        <TabsList>
          <TabsTrigger value="file">{filename}</TabsTrigger>
          <TabsTrigger value="migration">schema.sql</TabsTrigger>
          <TabsTrigger value="diff">Diff</TabsTrigger>
        </TabsList>
      </Tabs>
      <CodeViewer code={code} filename={filename} language="ts" />
    </div>
  );
}
