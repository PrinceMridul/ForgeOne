import { useMemo } from "react";
import { cn } from "@/lib/utils";

/**
 * Lightweight SVG sparkline / area chart. Colors read from CSS tokens.
 */
export function Sparkline({
  values,
  height = 48,
  className,
  stroke = "var(--primary)",
  fill = "var(--primary)",
  showArea = true,
  animate = true,
}: {
  values: number[];
  height?: number;
  className?: string;
  stroke?: string;
  fill?: string;
  showArea?: boolean;
  animate?: boolean;
}) {
  const { d, area, last, min, max } = useMemo(() => {
    const w = 100;
    const h = 100;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const step = w / Math.max(1, values.length - 1);
    const pts = values.map((v, i) => [i * step, h - ((v - min) / span) * (h - 4) - 2] as const);
    const d = pts
      .map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(2)},${p[1].toFixed(2)}`)
      .join(" ");
    const area = `${d} L${w},${h} L0,${h} Z`;
    return { d, area, last: pts.at(-1)!, min, max };
  }, [values]);
  const gradId = useMemo(() => `spark-${Math.random().toString(36).slice(2, 8)}`, []);
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={cn("w-full", className)}
      style={{ height }}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={fill} stopOpacity="0.35" />
          <stop offset="100%" stopColor={fill} stopOpacity="0" />
        </linearGradient>
      </defs>
      {showArea && <path d={area} fill={`url(#${gradId})`} />}
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        style={animate ? { transition: "d 400ms ease" } : undefined}
      />
      <circle cx={last[0]} cy={last[1]} r={1.6} fill={stroke}>
        <animate attributeName="r" values="1.6;2.8;1.6" dur="1.6s" repeatCount="indefinite" />
      </circle>
      <title>
        min {min.toFixed(0)} · max {max.toFixed(0)}
      </title>
    </svg>
  );
}

export function MetricTile({
  label,
  value,
  unit,
  values,
  stroke,
  fill,
}: {
  label: string;
  value: string;
  unit?: string;
  values: number[];
  stroke?: string;
  fill?: string;
}) {
  return (
    <div className="surface p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-sm tabular-nums font-medium">
          {value}
          {unit && <span className="ml-0.5 text-[10px] text-muted-foreground">{unit}</span>}
        </p>
      </div>
      <Sparkline values={values} height={56} stroke={stroke} fill={fill} />
    </div>
  );
}
