import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Terminal — xterm.js placeholder. Simulates streaming shell output.
 */
const script: { prompt?: string; out?: string; delay: number }[] = [
  { prompt: "bun run dev", delay: 300 },
  { out: "$ vite dev --host", delay: 200 },
  { out: "  VITE v8.0.16  ready in 412 ms", delay: 400 },
  { out: "  ➜  Local:   http://localhost:8080/", delay: 100 },
  { out: "  ➜  Network: http://10.0.1.14:8080/", delay: 300 },
  { prompt: "forge agents dispatch --role developer", delay: 500 },
  { out: "→ Dispatching Kai (Developer) to project meridian-api", delay: 200 },
  { out: "  planning:  ✓ 4 subtasks generated", delay: 300 },
  { out: "  executing: [========>       ] 78%  src/routes/api/projects.ts", delay: 400 },
  { out: "  testing:   ✓ 27 passed  0 failed  82% coverage", delay: 300 },
  { out: "  committing: feat(api): add cursor pagination", delay: 200 },
  { out: "✓ Run completed in 4m 12s", delay: 200 },
];

export function Terminal({ className }: { className?: string }) {
  const [lines, setLines] = useState<{ prompt?: string; out?: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let i = 0;
    let cancelled = false;
    const step = () => {
      if (cancelled || i >= script.length) return;
      const s = script[i++];
      setTimeout(() => {
        setLines((l) => [...l, s]);
        step();
      }, s.delay);
    };
    step();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lines]);

  return (
    <div className={cn("surface overflow-hidden font-mono text-[12.5px]", className)}>
      <div className="flex items-center gap-2 border-b border-border px-3 py-2 bg-card/50">
        <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
        <span className="ml-2 text-[11px] text-muted-foreground">bash — forge-cli · 96×24</span>
      </div>
      <div
        ref={scrollRef}
        className="h-[380px] overflow-y-auto p-4 space-y-1 bg-[oklch(0.12_0.014_265)]"
      >
        {lines.map((l, i) => (
          <div key={i} className="animate-fade-up">
            {l.prompt ? (
              <div>
                <span className="text-success">jamie@forge</span>
                <span className="text-muted-foreground">:</span>
                <span className="text-info">~/meridian-api</span>
                <span className="text-muted-foreground">$ </span>
                <span>{l.prompt}</span>
              </div>
            ) : (
              <div className="text-foreground/85 whitespace-pre">{l.out}</div>
            )}
          </div>
        ))}
        <div className="flex items-center">
          <span className="text-success">jamie@forge</span>
          <span className="text-muted-foreground">:</span>
          <span className="text-info">~/meridian-api</span>
          <span className="text-muted-foreground">$ </span>
          <span className="ml-0.5 inline-block h-3.5 w-1.5 bg-primary animate-pulse" />
        </div>
      </div>
    </div>
  );
}
