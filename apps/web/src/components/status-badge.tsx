import { cn } from "@/lib/utils";

type Status =
  | "active"
  | "queued"
  | "paused"
  | "shipped"
  | "thinking"
  | "working"
  | "idle"
  | "blocked"
  | "done"
  | "success"
  | "running"
  | "failed"
  | "warning"
  | "info";

const map: Record<Status, { label: string; dot: string; text: string; bg: string }> = {
  active: { label: "Active", dot: "bg-success", text: "text-success", bg: "bg-success/10" },
  queued: { label: "Queued", dot: "bg-info", text: "text-info", bg: "bg-info/10" },
  paused: { label: "Paused", dot: "bg-warning", text: "text-warning", bg: "bg-warning/10" },
  shipped: { label: "Shipped", dot: "bg-primary", text: "text-primary", bg: "bg-primary/10" },
  thinking: { label: "Thinking", dot: "bg-info", text: "text-info", bg: "bg-info/10" },
  working: { label: "Working", dot: "bg-primary", text: "text-primary", bg: "bg-primary/10" },
  idle: {
    label: "Idle",
    dot: "bg-muted-foreground",
    text: "text-muted-foreground",
    bg: "bg-muted/40",
  },
  blocked: {
    label: "Blocked",
    dot: "bg-destructive",
    text: "text-destructive",
    bg: "bg-destructive/10",
  },
  done: { label: "Done", dot: "bg-success", text: "text-success", bg: "bg-success/10" },
  success: { label: "Success", dot: "bg-success", text: "text-success", bg: "bg-success/10" },
  running: { label: "Running", dot: "bg-primary", text: "text-primary", bg: "bg-primary/10" },
  failed: {
    label: "Failed",
    dot: "bg-destructive",
    text: "text-destructive",
    bg: "bg-destructive/10",
  },
  warning: { label: "Warning", dot: "bg-warning", text: "text-warning", bg: "bg-warning/10" },
  info: { label: "Info", dot: "bg-info", text: "text-info", bg: "bg-info/10" },
};

export function StatusBadge({
  status,
  label,
  pulse,
  className,
}: {
  status: Status;
  label?: string;
  pulse?: boolean;
  className?: string;
}) {
  const s = map[status];
  const shouldPulse = pulse ?? ["active", "working", "thinking", "running"].includes(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums",
        s.bg,
        s.text,
        className,
      )}
    >
      <span className="relative flex h-1.5 w-1.5">
        {shouldPulse && (
          <span
            className={cn(
              "absolute inline-flex h-full w-full rounded-full opacity-75 animate-pulse-ring",
              s.dot,
            )}
          />
        )}
        <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", s.dot)} />
      </span>
      {label ?? s.label}
    </span>
  );
}
