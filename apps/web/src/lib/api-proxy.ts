/**
 * Production reverse proxy for the ForgeOne API.
 *
 * In development the Vite dev server proxies `/api/v1` and `/health` to the
 * Fastify API on :4000 (see vite.config.ts), which keeps the browser
 * same-origin and means no CORS preflight is ever involved.
 *
 * A deployed build has no Vite dev server, so this reproduces that proxy
 * inside the SSR server. The pay-off is that the whole product lives behind
 * one public URL: the browser only ever talks to the origin it was served
 * from, `VITE_API_URL` stays empty in production, and the API's CORS policy
 * never has to be widened.
 *
 * `API_ORIGIN` names the upstream Fastify server. It defaults to the local
 * dev port so a `node .output/server/index.mjs` smoke test works unconfigured.
 */

const DEFAULT_API_ORIGIN = "http://localhost:4000";

/** Paths owned by the API. Everything else is a TanStack Start route. */
const PROXIED_PREFIXES = ["/api/", "/health", "/docs", "/demo/"] as const;

/** Hop-by-hop headers that must not be forwarded across a proxy (RFC 9110 §7.6.1). */
const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function apiOrigin(): string {
  const configured = globalThis.process?.env?.API_ORIGIN?.trim();
  if (!configured) return DEFAULT_API_ORIGIN;
  // Platform service-discovery values are often a bare host, not a URL.
  const withScheme = /^https?:\/\//i.test(configured) ? configured : `https://${configured}`;
  return withScheme.replace(/\/+$/, "");
}

export function isApiRequest(pathname: string): boolean {
  return PROXIED_PREFIXES.some(
    (prefix) => pathname === prefix.replace(/\/$/, "") || pathname.startsWith(prefix),
  );
}

function stripHopByHop(source: Headers): Headers {
  const headers = new Headers();
  source.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) headers.set(key, value);
  });
  return headers;
}

/**
 * Forwards a request to the API and streams the response straight back.
 * Bodies are piped rather than buffered so `Repository.zip` downloads do not
 * have to fit in the SSR server's memory.
 */
export async function proxyToApi(request: Request, url: URL): Promise<Response> {
  const target = new URL(url.pathname + url.search, apiOrigin());

  const headers = stripHopByHop(request.headers);
  // The upstream must see its own host, not the public one, or Fastify's
  // trustProxy handling and any generated absolute URLs point at the wrong place.
  headers.set("host", target.host);
  headers.set("x-forwarded-host", url.host);
  headers.set("x-forwarded-proto", url.protocol.replace(":", ""));

  const hasBody = request.method !== "GET" && request.method !== "HEAD";

  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? request.body : undefined,
      redirect: "manual",
      // Required by undici whenever a stream is used as the request body.
      ...(hasBody ? { duplex: "half" } : {}),
    } as RequestInit);

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: stripHopByHop(upstream.headers),
    });
  } catch (error) {
    // The API being down is an operational condition, not a crash: answer in
    // the same envelope the client already knows how to read.
    console.error("[api-proxy] upstream unreachable", target.origin, error);
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: "API_UNREACHABLE",
          message: `The ForgeOne API at ${target.origin} did not respond.`,
        },
      }),
      { status: 502, headers: { "content-type": "application/json; charset=utf-8" } },
    );
  }
}
