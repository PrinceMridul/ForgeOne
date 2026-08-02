// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // The deployed target is a plain Node server (Render / Docker / any host that
  // runs `node .output/server/index.mjs`). Without this the wrapper defaults to
  // `cloudflare-module`, which emits a Worker that Node cannot execute — so
  // `pnpm turbo build` would produce something the deploy runbook can't start.
  // NITRO_PRESET still wins if a platform's own CI sets it.
  nitro: { preset: "node-server" },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR
    // error wrapper + production API proxy). nitro/vite builds from this.
    server: { entry: "server" },
  },
  vite: {
    server: {
      // Proxy API requests to the Fastify backend in development.
      // Eliminates CORS issues — the browser talks to the same origin (Vite dev server).
      proxy: {
        "/api/v1": {
          target: "http://localhost:4000",
          changeOrigin: true,
          ws: true,
        },
        "/health": {
          target: "http://localhost:4000",
          changeOrigin: true,
        },
      },
    },
  },
});
