import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Breadcrumb } from "@/components/breadcrumb";
import { SampleDataNotice } from "@/components/sample-data-notice";
import { Terminal } from "@/components/terminal";

export const Route = createFileRoute("/_app/terminal")({
  head: () => ({
    meta: [
      { title: "Terminal · ForgeOne" },
      {
        name: "description",
        content: "Full shell access to your agent runtime — xterm.js integration.",
      },
      { property: "og:title", content: "Terminal · ForgeOne" },
      { property: "og:description", content: "Full shell access to your agent runtime." },
    ],
  }),
  component: TerminalPage,
});

function TerminalPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-8 space-y-6">
      <Breadcrumb items={[{ label: "Terminal" }]} />
      {/* Was described as a "live shell into the agent runtime", which it is
          not — it replays a scripted session. */}
      <PageHeader
        title="Terminal"
        description="Scripted session replay. Not attached to a shell."
      />
      <SampleDataNotice
        detail="This view replays a fixed transcript. Real agent output streams in the live run console."
        className="mb-2"
      />
      <Terminal />
    </div>
  );
}
