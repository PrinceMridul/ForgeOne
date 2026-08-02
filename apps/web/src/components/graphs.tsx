import { useMemo } from "react";
import {
  useLiveEngine,
  architectureNodes,
  architectureEdges,
  dependencyNodes,
  dependencyEdges,
} from "@/lib/live-engine";
import { cn } from "@/lib/utils";

/**
 * ForgeOne graph primitives: architecture, dependencies, agent comms.
 * Pure SVG — no external graph lib. All transitions are CSS.
 */

function Edge({
  x1,
  y1,
  x2,
  y2,
  stroke = "var(--border)",
  width = 1,
  dashed,
  animated,
  opacity = 1,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke?: string;
  width?: number;
  dashed?: boolean;
  animated?: boolean;
  opacity?: number;
}) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const cx = x1 + dx / 2;
  const cy = y1 + dy / 2 - Math.min(60, Math.abs(dx) / 4);
  const d = `M${x1},${y1} Q${cx},${cy} ${x2},${y2}`;
  return (
    <g style={{ opacity }}>
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={width}
        strokeDasharray={dashed ? "4 4" : undefined}
        strokeLinecap="round"
      />
      {animated && (
        <circle r={2.2} fill={stroke}>
          <animateMotion dur="2.4s" repeatCount="indefinite" path={d} />
        </circle>
      )}
    </g>
  );
}

// ---------- Architecture ----------
const KIND_COLOR: Record<string, string> = {
  client: "var(--chart-4)",
  edge: "var(--info)",
  service: "var(--primary)",
  queue: "var(--warning)",
  db: "var(--chart-2)",
  cache: "var(--chart-5)",
  obs: "var(--chart-3)",
};

export function ArchitectureGraph({ height = 260 }: { height?: number }) {
  const { tick } = useLiveEngine();
  const activeEdgeIdx = tick % architectureEdges.length;
  return (
    <div className="surface p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-medium">Architecture graph</p>
          <p className="text-[11px] text-muted-foreground">
            Reference container view · illustrative, not derived from the run
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <Legend color="var(--primary)" label="service" />
          <Legend color="var(--chart-2)" label="data" />
          <Legend color="var(--warning)" label="queue" />
        </div>
      </div>
      <div className="overflow-x-auto">
        <svg viewBox="0 0 800 260" className="w-full" style={{ height, minWidth: 640 }}>
          {architectureEdges.map((e, i) => {
            const a = architectureNodes.find((n) => n.id === e.from)!;
            const b = architectureNodes.find((n) => n.id === e.to)!;
            const active = i === activeEdgeIdx;
            return (
              <Edge
                key={i}
                x1={a.x + 60}
                y1={a.y + 20}
                x2={b.x + 60}
                y2={b.y + 20}
                stroke={active ? "var(--primary)" : "var(--border)"}
                width={active ? 1.6 : 1}
                animated={active}
                opacity={active ? 1 : 0.55}
              />
            );
          })}
          {architectureNodes.map((n) => (
            <g key={n.id} transform={`translate(${n.x},${n.y})`}>
              <rect
                x={0}
                y={0}
                width={120}
                height={44}
                rx={8}
                fill="var(--card)"
                stroke={KIND_COLOR[n.kind] ?? "var(--border)"}
                strokeWidth={1.2}
              />
              <circle
                cx={12}
                cy={22}
                r={4}
                fill={KIND_COLOR[n.kind] ?? "var(--muted-foreground)"}
              />
              <text x={24} y={20} fill="var(--foreground)" fontSize={11} fontWeight={600}>
                {n.label}
              </text>
              <text x={24} y={33} fill="var(--muted-foreground)" fontSize={9}>
                {n.kind}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

// ---------- Dependency ----------
const DEP_COLOR: Record<string, string> = {
  runtime: "var(--primary)",
  ui: "var(--chart-4)",
  data: "var(--chart-2)",
  util: "var(--chart-5)",
  test: "var(--warning)",
  infra: "var(--info)",
};

export function DependencyGraph({ height = 360 }: { height?: number }) {
  const { tick } = useLiveEngine();
  return (
    <div className="surface p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-medium">Dependency graph</p>
          <p className="text-[11px] text-muted-foreground">
            Reference package graph · illustrative, not derived from the run
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
          {Object.entries(DEP_COLOR).map(([k, v]) => (
            <Legend key={k} color={v} label={k} />
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <svg viewBox="0 0 720 380" className="w-full" style={{ height, minWidth: 640 }}>
          {dependencyEdges.map((e, i) => {
            const a = dependencyNodes.find((n) => n.id === e.from)!;
            const b = dependencyNodes.find((n) => n.id === e.to)!;
            const pulse = (tick + i) % 3 === 0;
            return (
              <Edge
                key={i}
                x1={a.x + 60}
                y1={a.y + 20}
                x2={b.x + 60}
                y2={b.y + 20}
                stroke="var(--border)"
                animated={pulse}
                opacity={0.7}
              />
            );
          })}
          {dependencyNodes.map((n) => (
            <g key={n.id} transform={`translate(${n.x},${n.y})`}>
              <rect
                x={0}
                y={0}
                width={120}
                height={44}
                rx={22}
                fill="var(--card)"
                stroke={DEP_COLOR[n.group] ?? "var(--border)"}
                strokeWidth={1.2}
              />
              <text
                x={60}
                y={20}
                fill="var(--foreground)"
                fontSize={11}
                fontWeight={600}
                textAnchor="middle"
              >
                {n.label}
              </text>
              <text x={60} y={33} fill="var(--muted-foreground)" fontSize={9} textAnchor="middle">
                {n.group}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

// ---------- Agent communication ----------
export function AgentCommGraph({ height = 340 }: { height?: number }) {
  const { comm, agents } = useLiveEngine();
  // Positioned from the live roster so the ring matches the pipeline. Laying it
  // out from the static seed list left the Documentation agent off the graph
  // while its edges still pointed at it.
  const positions = useMemo(() => {
    const cx = 200,
      cy = 170,
      r = 130;
    return agents.map((a, i) => {
      const angle = (i / agents.length) * Math.PI * 2 - Math.PI / 2;
      return {
        id: a.id,
        name: a.name,
        role: a.role,
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
      };
    });
  }, [agents]);
  const nodeById = Object.fromEntries(positions.map((p) => [p.id, p]));
  return (
    <div className="surface p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-medium">Agent communication</p>
          <p className="text-[11px] text-muted-foreground">Message intensity between the agents</p>
        </div>
      </div>
      <div className="overflow-hidden">
        <svg viewBox="0 0 400 340" className="w-full" style={{ height }}>
          {/* orbit */}
          <circle
            cx={200}
            cy={170}
            r={130}
            fill="none"
            stroke="var(--border)"
            strokeDasharray="2 4"
            opacity={0.5}
          />
          {comm.map((e, i) => {
            const a = nodeById[e.from];
            const b = nodeById[e.to];
            if (!a || !b) return null;
            return (
              <Edge
                key={i}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="var(--primary)"
                width={0.6 + e.strength * 2.2}
                animated={e.strength > 0.6}
                opacity={0.25 + e.strength * 0.75}
              />
            );
          })}
          {positions.map((p) => (
            <g key={p.id} transform={`translate(${p.x - 34},${p.y - 14})`}>
              <rect
                x={0}
                y={0}
                width={68}
                height={28}
                rx={14}
                fill="var(--card)"
                stroke="var(--border)"
              />
              <text
                x={34}
                y={13}
                textAnchor="middle"
                fontSize={10}
                fontWeight={600}
                fill="var(--foreground)"
              >
                {p.name}
              </text>
              <text x={34} y={22} textAnchor="middle" fontSize={8} fill="var(--muted-foreground)">
                {p.role}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1")}>
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
