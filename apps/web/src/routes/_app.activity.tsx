import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Breadcrumb } from "@/components/breadcrumb";
import { ActivityFeed } from "@/components/activity-feed";
import { Button } from "@/components/ui/button";
import { Filter, Pause } from "lucide-react";
import { useLiveEngine } from "@/lib/live-engine";
import { ExecutionTimeline } from "@/components/execution-timeline";
import { ExecutionReplay } from "@/components/execution-replay";
import { RunHistory } from "@/components/run-history";
import { LiveLogViewer } from "@/components/live-log-viewer";
import { SampleDataNotice } from "@/components/sample-data-notice";

export const Route = createFileRoute("/_app/activity")({
  head: () => ({
    meta: [
      { title: "Activity Timeline · ForgeOne" },
      {
        name: "description",
        content: "Streaming engineering events across every agent and project.",
      },
      { property: "og:title", content: "Activity Timeline · ForgeOne" },
      {
        property: "og:description",
        content: "GitHub Actions meets Cursor — a live feed of every engineering event.",
      },
    ],
  }),
  component: ActivityPage,
});

function ActivityPage() {
  const { events } = useLiveEngine();
  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
      <Breadcrumb items={[{ label: "Activity" }]} />
      <PageHeader
        title="Activity"
        description="Engineering events across the eight-agent pipeline."
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Filter className="h-3.5 w-3.5" /> Filter
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Pause className="h-3.5 w-3.5" /> Pause stream
            </Button>
          </>
        }
      />

      <SampleDataNotice detail="The replay scrubber and run-history metrics on this page are illustrative. The live run console, artifact explorer and repository views are driven entirely by measured run data." />

      <ExecutionTimeline />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="surface p-6">
            <h3 className="text-sm font-medium mb-4">Streaming events</h3>
            <ActivityFeed events={events.slice(0, 20)} />
          </div>
          <LiveLogViewer height={340} />
        </div>
        <div className="space-y-6">
          <ExecutionReplay />
          <RunHistory />
        </div>
      </div>
    </div>
  );
}
