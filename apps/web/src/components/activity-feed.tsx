import {
  GitCommit,
  TestTube2,
  Rocket,
  MessageSquare,
  AlertTriangle,
  ShieldCheck,
  FileText,
} from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import type { ActivityEvent } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const iconFor: Record<ActivityEvent["type"], any> = {
  commit: GitCommit,
  test: TestTube2,
  deploy: Rocket,
  review: MessageSquare,
  issue: AlertTriangle,
  security: ShieldCheck,
  plan: FileText,
};

export function ActivityFeed({
  events,
  dense = false,
}: {
  events: ActivityEvent[];
  dense?: boolean;
}) {
  return (
    <ol className="relative">
      {events.map((e, i) => {
        const Icon = iconFor[e.type];
        const isLast = i === events.length - 1;
        return (
          <li key={e.id} className="relative flex gap-3 pb-4">
            {!isLast && (
              <span className="absolute left-[15px] top-8 bottom-0 w-px bg-border" aria-hidden />
            )}
            <div
              className={cn(
                "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-card",
                e.status === "running" && "border-primary/40",
                e.status === "failed" && "border-destructive/40",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {e.status === "running" && (
                <span className="absolute inset-0 rounded-full animate-pulse-ring border-2 border-primary" />
              )}
            </div>
            <div className={cn("flex-1 min-w-0 surface p-3", dense && "p-2.5")}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{e.title}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    <span className="text-foreground/80">{e.agent}</span> · {e.ts}
                  </p>
                </div>
                <StatusBadge status={e.status} />
              </div>
              {e.detail && (
                <p className="mt-1.5 text-[11px] text-muted-foreground font-mono">{e.detail}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
