/**
 * ForgeOne API client.
 * Thin typed fetch wrapper for the Fastify backend at apps/api.
 *
 * In development the Vite proxy rewrites /api -> http://localhost:4000
 * so no CORS preflight is needed.
 * In production set VITE_API_URL to the deployed API origin.
 */

// Relative path works in browser + Vite dev proxy. Full URL for SSR environments.
const API_BASE =
  typeof window !== "undefined"
    ? (import.meta.env.VITE_API_URL ?? "")
    : (import.meta.env.VITE_API_URL ?? "http://localhost:4000");

// ---------- Shape of backend responses ----------
export interface WorkflowRun {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
  currentAgent: string | null;
  /** Overall run completion, 0-100. */
  stepProgress: number;
  /** Progress of the currently executing agent through its own lifecycle, 0-100. */
  stageProgress?: number;
  totalSteps: number;
  completedSteps: number;
  error?: string | null;
  startedAt: string;
  completedAt?: string | null;
  createdAt: string;
}

export interface ExecutionEvent {
  id: string;
  runId: string;
  agentType: string;
  eventType: "LOG" | "STEP" | "ARTIFACT" | "STATUS_CHANGE" | "ERROR";
  message: string;
  payload?: Record<string, unknown>;
  timestamp: string;
}

export interface BackendArtifact {
  id: string;
  runId: string;
  agentType: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  createdAt: string;
  content?: string;
  /** True when the artifact is an entry in Repository.zip. */
  inRepository?: boolean;
}

/**
 * Carries the HTTP status so callers can tell "the server answered, and the
 * thing you asked for isn't there" apart from "the server is unreachable".
 * `status` is 0 when the request never got a response.
 */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// ---------- Generic request helper ----------
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      ...init,
    });
  } catch {
    // fetch only rejects on a transport failure, never on an HTTP error status.
    throw new ApiError(
      `Could not reach the ForgeOne API at ${API_BASE || "the current origin"}.`,
      0,
    );
  }

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new ApiError(`API ${path} → ${res.status}: ${text}`, res.status);
  }

  const json = (await res.json()) as { success: boolean; data: T };
  if (!json.success) throw new Error(`API error on ${path}`);
  return json.data;
}

// ---------- API surface ----------
export const api = {
  /**
   * POST /api/v1/runs — create and kick off a new autonomous engineering run.
   */
  startRun: (title: string, description: string): Promise<WorkflowRun> =>
    request<WorkflowRun>("/api/v1/runs", {
      method: "POST",
      body: JSON.stringify({
        projectId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        title: title.slice(0, 200),
        description,
      }),
    }),

  /** GET /api/v1/runs — list all runs. */
  listRuns: (): Promise<WorkflowRun[]> => request<WorkflowRun[]>("/api/v1/runs"),

  /** GET /api/v1/runs/:id — poll a single run. */
  getRun: (runId: string): Promise<WorkflowRun> => request<WorkflowRun>(`/api/v1/runs/${runId}`),

  /** GET /api/v1/runs/:id/events — all telemetry events for a run. */
  getEvents: (runId: string): Promise<ExecutionEvent[]> =>
    request<ExecutionEvent[]>(`/api/v1/runs/${runId}/events`),

  /** GET /api/v1/runs/:id/artifacts — all generated artifacts for a run. */
  getArtifacts: (runId: string): Promise<BackendArtifact[]> =>
    request<BackendArtifact[]>(`/api/v1/runs/${runId}/artifacts`),

  /**
   * Returns the download URL for an artifact.
   * Used as an `<a href>` or `window.location`.
   */
  artifactDownloadUrl: (runId: string, artifactId: string): string =>
    `${API_BASE}/api/v1/runs/${runId}/artifacts/${encodeURIComponent(artifactId)}/download`,
};
