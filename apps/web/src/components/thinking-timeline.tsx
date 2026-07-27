import { useEffect, useState } from "react";
import { useLiveEngine } from "@/lib/live-engine";
import { Brain } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * ThinkingTimeline — a vertical stream of "chain of thought" beats.
 * Emits a new beat every couple of ticks, agent-attributed, with a soft
 * left-rail pulse that draws the eye to the newest thought.
 */

const THOUGHTS: Record<string, string[]> = {
  Athena: [
    "Considering hexagonal boundaries for the billing domain.",
    "Choosing Redpanda over Kafka for lower ops load.",
    "Drafting ADR-021 for cache invalidation strategy.",
  ],
  Kai: [
    "Sketching the cursor pagination signature.",
    "Extracting retryPolicy() into a shared util.",
    "Wiring zod validation for POST /projects.",
  ],
  Ivy: [
    "Reviewing diff — noting an unbounded map on line 42.",
    "Approving with two nits addressed.",
    "Suggesting explicit return on retryPolicy.",
  ],
  Rin: [
    "Property test surfaced a flake in retry.spec.ts.",
    "Adding fixture for the empty cursor case.",
    "Coverage climbed to 82.4% (+1.2%).",
  ],
  Nyx: [
    "SAST scan clean — 0 critical, 2 low accepted.",
    "Rotating staging service token.",
    "Dependency audit surfaced nothing exploitable.",
  ],
  Orion: [
    "Terraform plan: 6 to add, 0 to destroy.",
    "Blue/green cutover to v482 healthy.",
    "Watching p99 for regressions.",
  ],
  Iris: [
    "Split epic AUTH-12 into 4 sub-tasks.",
    "Notifying stakeholders on #eng-updates.",
    "Reprioritizing backlog by impact/effort.",
  ],
};

interface Beat {
  id: string;
  agent: string;
  role: string;
  text: string;
  ts: string;
  kind: "thought" | "action" | "decision";
}

const KIND_TINT: Record<Beat["kind"], string> = {
  thought: "border-primary/40 text-primary",
  action: "border-chart-2/40 text-chart-2",
  decision: "border-success/40 text-success",
};

export function ThinkingTimeline({ height = 480 }: { height?: number }) {
  const { tick, agents } = useLiveEngine();
  const [beats, setBeats] = useState<Beat[]>([]);

  useEffect(() => {
    if (tick % 2 !== 1) return;
    const a = agents[tick % agents.length];
    const pool = THOUGHTS[a?.name ?? "Kai"] ?? THOUGHTS.Kai;
    const text = pool[(tick / 2) % pool.length];
    const kind: Beat["kind"] = tick % 6 === 1 ? "decision" : tick % 3 === 0 ? "action" : "thought";
    setBeats((prev) =>
      [
        {
          id: `b-${tick}`,
          agent: a?.name ?? "Kai",
          role: a?.role ?? "Developer",
          text,
          ts: new Date().toTimeString().slice(0, 8),
          kind,
        },
        ...prev,
      ].slice(0, 40),
    );
  }, [tick, agents]);

  return (
    <div className="surface flex flex-col overflow-hidden" style={{ height }}>
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Brain className="h-4 w-4 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-medium">Live thinking</p>
          <p className="text-[11px] text-muted-foreground">
            Chain of thought across the engineering team
          </p>
        </div>
        <span className="text-[10px] text-muted-foreground tabular-nums">{beats.length} beats</span>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <ol className="relative border-l border-border/60 pl-5 space-y-3">
          {beats.map((b, i) => (
            <li
              key={b.id}
              className="relative animate-fade-up"
              style={{ animationDuration: "420ms" }}
            >
              <span
                className={cn(
                  "absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 bg-background",
                  KIND_TINT[b.kind],
                  i === 0 && "animate-pulse-ring",
                )}
              />
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="text-foreground font-medium">{b.agent}</span>
                <span>·</span>
                <span>{b.role}</span>
                <span className="ml-auto tabular-nums">{b.ts}</span>
              </div>
              <p className="mt-0.5 text-sm leading-snug">{b.text}</p>
              <p className={cn("mt-0.5 text-[10px] uppercase tracking-widest", KIND_TINT[b.kind])}>
                {b.kind}
              </p>
            </li>
          ))}
          {beats.length === 0 && (
            <li className="text-xs text-muted-foreground">Warming up the orchestrator…</li>
          )}
        </ol>
      </div>
    </div>
  );
}
