import { useLiveEngine, setPlayback } from "@/lib/live-engine";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, FastForward, Rewind } from "lucide-react";
import { Sparkline } from "@/components/sparkline";

/**
 * Scrubber + transport controls for replaying the last minute of engine activity.
 * When "playing", the scrubber snaps to the live head; when paused you can drag through history.
 */
export function ExecutionReplay() {
  const { metrics, playback, tick } = useLiveEngine();
  const position = Math.min(playback.position, metrics.length - 1);
  const point = metrics[position];
  const tokens = metrics.map((m) => m.tokens);
  const runtime = metrics.map((m) => m.runtimeMs);
  return (
    <div className="surface p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Execution replay</p>
          <p className="text-[11px] text-muted-foreground">
            Frame {position + 1}/{metrics.length} · {new Date(point.t).toLocaleTimeString()} · tick
            #{tick}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => setPlayback({ playing: false, position: 0 })}
            aria-label="Restart"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => setPlayback({ playing: false, position: Math.max(0, position - 5) })}
            aria-label="Rewind"
          >
            <Rewind className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="default"
            className="h-7 w-7"
            onClick={() => setPlayback({ playing: !playback.playing })}
            aria-label={playback.playing ? "Pause" : "Play"}
          >
            {playback.playing ? (
              <Pause className="h-3.5 w-3.5" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() =>
              setPlayback({ playing: false, position: Math.min(metrics.length - 1, position + 5) })
            }
            aria-label="Fast forward"
          >
            <FastForward className="h-3.5 w-3.5" />
          </Button>
          <select
            value={playback.speed}
            onChange={(e) => setPlayback({ speed: Number(e.target.value) })}
            className="ml-1 h-7 rounded-md border border-border bg-background px-1.5 text-[11px]"
          >
            <option value={0.5}>0.5×</option>
            <option value={1}>1×</option>
            <option value={2}>2×</option>
            <option value={4}>4×</option>
          </select>
        </div>
      </div>

      <div className="relative">
        <Sparkline values={tokens} height={44} />
        <input
          type="range"
          min={0}
          max={metrics.length - 1}
          value={position}
          onChange={(e) => setPlayback({ playing: false, position: Number(e.target.value) })}
          className="absolute inset-x-0 bottom-0 w-full accent-primary"
          aria-label="Timeline scrubber"
        />
      </div>
      <div className="grid grid-cols-3 gap-3 text-[11px]">
        <Stat label="Tokens/s" value={point.tokens.toFixed(0)} />
        <Stat label="p50 latency" value={`${point.runtimeMs.toFixed(0)}ms`} />
        <Stat label="Memory" value={`${(point.memoryMb / 1024).toFixed(2)} GB`} />
      </div>
      <div className="opacity-60">
        <Sparkline values={runtime} height={22} stroke="var(--chart-4)" fill="var(--chart-4)" />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-medium tabular-nums">{value}</p>
    </div>
  );
}
