import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Breadcrumb } from "@/components/breadcrumb";
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
      <PageHeader
        title="Terminal"
        description="Live shell into the ForgeOne agent runtime. xterm.js placeholder."
      />
      <Terminal />
    </div>
  );
}
