import { useEffect, useRef, useState } from "react";
import { useLiveEngine, type LogLine } from "@/lib/live-engine";
import { cn } from "@/lib/utils";
import { Pause, Play, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const levelClass: Record<LogLine["level"], string> = {
  info: "text-info",
  warn: "text-warning",
  error: "text-destructive",
  debug: "text-muted-foreground",
};

export function LiveLogViewer({
  agentId,
  height = 360,
  className,
  compact = false,
}: {
  agentId?: string;
  height?: number;
  className?: string;
  compact?: boolean;
}) {
  const { logs } = useLiveEngine();
  const [paused, setPaused] = useState(false);
  const [query, setQuery] = useState("");
  const [snapshot, setSnapshot] = useState<LogLine[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!paused) setSnapshot(logs);
  }, [logs, paused]);

  const visible = (paused ? snapshot : logs)
    .filter((l) => (agentId ? l.agentId === agentId : true))
    .filter((l) =>
      query
        ? l.msg.toLowerCase().includes(query.toLowerCase()) ||
          l.agentName.toLowerCase().includes(query.toLowerCase())
        : true,
    )
    .slice(-200);

  useEffect(() => {
    if (paused) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [visible.length, paused]);

  return (
    <div className={cn("surface flex flex-col overflow-hidden", className)} style={{ height }}>
      {!compact && (
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter logs…"
              className="h-7 pl-7 text-xs"
            />
          </div>
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {visible.length} lines
          </span>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? "Resume" : "Pause"}
          >
            {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => setSnapshot([])}
            aria-label="Clear"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-2 font-mono text-[11.5px] leading-relaxed"
      >
        {visible.map((l) => (
          <div key={l.id} className="flex gap-2 animate-fade-in">
            <span className="text-muted-foreground shrink-0 tabular-nums">{l.ts}</span>
            <span className="text-primary shrink-0 w-16 truncate">{l.agentName}</span>
            <span className={cn("shrink-0 uppercase text-[9px] pt-0.5", levelClass[l.level])}>
              {l.level}
            </span>
            <span className="text-foreground/85 min-w-0 break-words">{l.msg}</span>
          </div>
        ))}
        {!paused && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-75" />
              <span className="relative rounded-full h-1.5 w-1.5 bg-primary" />
            </span>
            streaming
          </div>
        )}
      </div>
    </div>
  );
}
