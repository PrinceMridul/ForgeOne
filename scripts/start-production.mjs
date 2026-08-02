#!/usr/bin/env node
/**
 * Production entrypoint — one public port, one deployable unit.
 *
 * ForgeOne is two processes: the Fastify API (orchestrator + agents) and the
 * TanStack Start SSR server. Deploying them as two public services would mean
 * two URLs, a CORS policy to maintain, and an extra cold start on the very
 * first click of a demo. Instead this supervisor binds only the web server to
 * the public $PORT and keeps the API on loopback, where the SSR server's
 * reverse proxy reaches it (apps/web/src/lib/api-proxy.ts).
 *
 * Either child exiting takes the whole process down, so the platform's own
 * restart policy handles recovery rather than leaving a half-dead container
 * that still answers health checks.
 *
 *   node scripts/start-production.mjs
 *
 * Expects `pnpm turbo run build` to have run first.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

const PUBLIC_PORT = process.env.PORT ?? '8080';
const API_PORT = process.env.INTERNAL_API_PORT ?? '4000';
const API_HOST = '127.0.0.1';

const API_ENTRY = join(root, 'apps/api/dist/index.js');
const WEB_ENTRY = join(root, 'apps/web/.output/server/index.mjs');

for (const [label, entry] of [
  ['API', API_ENTRY],
  ['web', WEB_ENTRY],
]) {
  if (!existsSync(entry)) {
    console.error(
      `[start] ${label} build output is missing: ${entry}\n` +
        `[start] Run \`pnpm turbo run build\` before starting.`,
    );
    process.exit(1);
  }
}

/** @type {import("node:child_process").ChildProcess[]} */
const children = [];
let shuttingDown = false;

function start(label, entry, env) {
  const child = spawn(process.execPath, [entry], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, ...env },
  });
  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    console.error(`[start] ${label} exited (code=${code} signal=${signal}); shutting down.`);
    shutdown(code ?? 1);
  });
  child.on('error', (error) => {
    console.error(`[start] ${label} failed to spawn:`, error);
    shutdown(1);
  });
  children.push(child);
  return child;
}

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (child.exitCode === null && !child.killed) child.kill('SIGTERM');
  }
  // Give children a moment to flush logs before the runtime tears the box down.
  setTimeout(() => process.exit(code), 500).unref();
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => shutdown(0));
}

console.log(`[start] API on ${API_HOST}:${API_PORT} (internal) · web on :${PUBLIC_PORT} (public)`);

start('API', API_ENTRY, {
  NODE_ENV: 'production',
  API_HOST,
  API_PORT,
});

start('web', WEB_ENTRY, {
  NODE_ENV: 'production',
  PORT: PUBLIC_PORT,
  HOST: '0.0.0.0',
  API_ORIGIN: `http://${API_HOST}:${API_PORT}`,
});
