/**
 * Execution pacing.
 *
 * The orchestration pipeline is deterministic and CPU-only — every agent
 * resolves in well under a millisecond. That makes a full eight-agent run
 * finish faster than the UI's first poll, so the live console has nothing to
 * stream and the run appears to jump straight to 100%.
 *
 * Pacing spreads the *emission* of already-computed telemetry over wall-clock
 * time so pollers observe the run progressing agent by agent. It deliberately
 * does not slow down any actual work: artifacts are still produced at full
 * speed, we only meter how fast their events become visible.
 *
 * Disabled entirely under NODE_ENV=test so the suite stays fast, and tunable
 * at runtime via env vars for demo rehearsal.
 */

/** Delay between individual telemetry events within a stage. */
const DEFAULT_EVENT_PACING_MS = 240;

/** Additional settle time between one agent finishing and the next starting. */
const DEFAULT_STAGE_PACING_MS = 900;

function readEnvInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed < 0) return fallback;
  return parsed;
}

export interface PacingConfig {
  /** Delay applied after each emitted telemetry event. */
  eventMs: number;
  /** Delay applied between pipeline stages. */
  stageMs: number;
  /** False when pacing is fully disabled (tests, or RUN_PACING=off). */
  enabled: boolean;
}

export function getPacingConfig(): PacingConfig {
  const disabled = process.env.NODE_ENV === 'test' || process.env.RUN_PACING === 'off';

  if (disabled) {
    return { eventMs: 0, stageMs: 0, enabled: false };
  }

  return {
    eventMs: readEnvInt('RUN_EVENT_PACING_MS', DEFAULT_EVENT_PACING_MS),
    stageMs: readEnvInt('RUN_STAGE_PACING_MS', DEFAULT_STAGE_PACING_MS),
    enabled: true,
  };
}

/** Resolves after `ms`. Returns immediately for non-positive values. */
export function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}
