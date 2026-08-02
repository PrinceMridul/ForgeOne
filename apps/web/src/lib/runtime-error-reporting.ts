/**
 * Client-side runtime error reporting.
 *
 * Production React does not rethrow boundary-caught errors to `window.onerror`,
 * so an error the root boundary handles is otherwise invisible: the user sees a
 * fallback screen and nothing anywhere records why. This module is the single
 * place a boundary reports to.
 *
 * It writes to the console unconditionally — that is what makes a deployed
 * instance debuggable — and additionally forwards to the Lovable editor's
 * telemetry hooks, which exist only inside that editor's preview and are
 * `undefined` everywhere else. To add a real error tracker, extend this
 * function; nothing else needs to change.
 */

type ErrorMechanism = "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";

type CaptureOptions = {
  mechanism?: ErrorMechanism;
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

/** Telemetry hooks injected by the Lovable editor preview. Absent in a deployed build. */
type EditorTelemetry = {
  captureException?: (
    error: unknown,
    context?: Record<string, unknown>,
    options?: CaptureOptions,
  ) => void;
};

declare global {
  interface Window {
    __lovableEvents?: EditorTelemetry;
    __lovableReportRuntimeError?: (payload: {
      message: string;
      stack?: string;
      filename?: string;
    }) => void;
  }
}

/**
 * Loaders and server functions commonly throw a raw `Response`, whose
 * `String()` is the opaque "[object Response]". Pull out something diagnostic.
 */
function describe(error: unknown): string {
  if (error instanceof Response) {
    return `Response ${error.status}${error.url ? ` at ${error.url}` : ""}`;
  }
  if (error instanceof Error) return error.message;
  return String(error);
}

export function reportRuntimeError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;

  const route = window.location.pathname;
  const message = describe(error);

  console.error(`[forgeone] unhandled error at ${route}: ${message}`, { error, ...context });

  window.__lovableEvents?.captureException?.(
    error,
    { source: "react_error_boundary", route, ...context },
    { mechanism: "react_error_boundary", handled: false, severity: "error" },
  );

  window.__lovableReportRuntimeError?.({
    message,
    stack: error instanceof Error ? error.stack : undefined,
    filename: route,
  });
}
