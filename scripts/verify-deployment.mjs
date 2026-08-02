#!/usr/bin/env node
/**
 * End-to-end verification of a running ForgeOne instance.
 *
 * Drives the same flow a judge does — dispatch a run, wait for all eight
 * agents, download the archive — and asserts the properties the README
 * claims, rather than trusting them:
 *
 *   1. /health answers on the public origin (single-origin proxy is wired)
 *   2. the SSR document is served from that same origin
 *   3. a run reaches COMPLETED and every agent emitted telemetry
 *   4. the archive's real ZIP central-directory count equals the number of
 *      artifacts flagged `inRepository` — the claim the UI displays
 *   5. no generated artifact leaks ForgeOne's own stack into the user's repo
 *
 * Usage:
 *   node scripts/verify-deployment.mjs                      # http://localhost:8080
 *   node scripts/verify-deployment.mjs https://your.app     # a deployed URL
 *
 * Exits non-zero on the first failed assertion.
 */

const BASE = (process.argv[2] ?? process.env.FORGEONE_URL ?? 'http://localhost:8080').replace(
  /\/+$/,
  '',
);
const RUN_TIMEOUT_MS = Number(process.env.VERIFY_TIMEOUT_MS ?? 180_000);
const PROMPT =
  'Build a Hospital Management system with patients, doctors, appointments, prescriptions and lab results.';

const EXPECTED_AGENTS = [
  'ORCHESTRATOR',
  'PRODUCT_MANAGER',
  'ARCHITECT',
  'DEVELOPER',
  'REVIEWER',
  'TESTER',
  'SECURITY',
  'DEVOPS',
  'DOCUMENTATION',
];

let failures = 0;

function check(label, ok, detail = '') {
  const mark = ok ? 'PASS' : 'FAIL';
  console.log(`  [${mark}] ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
  return ok;
}

async function json(path, init) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${JSON.stringify(body)}`);
  return body.data;
}

/**
 * Counts real ZIP entries by scanning for central-directory file headers,
 * so the assertion does not depend on the writer that produced the archive.
 */
function countZipEntries(buffer) {
  let count = 0;
  for (let i = 0; i + 4 <= buffer.length; i += 1) {
    if (buffer.readUInt32LE(i) === 0x02014b50) count += 1;
  }
  return count;
}

async function main() {
  console.log(`ForgeOne deployment verification\n  target: ${BASE}\n`);

  console.log('Reachability');
  const health = await fetch(`${BASE}/health`).then((r) => r.json());
  check('GET /health returns ok', health.status === 'ok', `service=${health.service}`);

  const page = await fetch(`${BASE}/`);
  check(
    'GET / serves the app from the same origin',
    page.ok && (page.headers.get('content-type') ?? '').includes('text/html'),
    `status=${page.status}`,
  );

  console.log('\nPipeline');
  const started = Date.now();
  const run = await json('/api/v1/runs', {
    method: 'POST',
    body: JSON.stringify({
      projectId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      title: 'Hospital Management',
      description: PROMPT,
    }),
  });
  console.log(`  run ${run.id} dispatched`);

  let current = run;
  while (current.status === 'PENDING' || current.status === 'RUNNING') {
    if (Date.now() - started > RUN_TIMEOUT_MS) throw new Error('run did not finish in time');
    await new Promise((resolve) => setTimeout(resolve, 2000));
    current = await json(`/api/v1/runs/${run.id}`);
  }
  const elapsedSeconds = ((Date.now() - started) / 1000).toFixed(1);
  check('run reaches COMPLETED', current.status === 'COMPLETED', `${elapsedSeconds}s`);

  const events = await json(`/api/v1/runs/${run.id}/events`);
  const seen = new Set(events.map((e) => e.agentType));
  const missing = EXPECTED_AGENTS.filter((a) => !seen.has(a));
  check('every agent emitted telemetry', missing.length === 0, `${events.length} events`);
  if (missing.length) console.log(`         missing: ${missing.join(', ')}`);

  console.log('\nArtifacts');
  const artifacts = await json(`/api/v1/runs/${run.id}/artifacts`);
  const inRepository = artifacts.filter((a) => a.inRepository);
  console.log(`  ${artifacts.length} pipeline artifacts · ${inRepository.length} in repository`);

  const archive = artifacts.find((a) => a.filename.toLowerCase().endsWith('.zip'));
  check('Repository.zip is produced', Boolean(archive));

  if (archive) {
    const res = await fetch(
      `${BASE}/api/v1/runs/${run.id}/artifacts/${encodeURIComponent(archive.id)}/download`,
    );
    const buffer = Buffer.from(await res.arrayBuffer());
    check(
      'archive downloads as application/zip',
      res.ok && (res.headers.get('content-type') ?? '').includes('zip'),
      `${buffer.length} bytes`,
    );
    const entries = countZipEntries(buffer);
    check(
      'archive entry count equals the count shown in the UI',
      entries === inRepository.length,
      `${entries} entries vs ${inRepository.length} flagged inRepository`,
    );
  }

  const leaks = artifacts.filter(
    (a) => typeof a.content === 'string' && /\bForgeOne\b/.test(a.content),
  );
  check('no ForgeOne self-reference leaks into generated artifacts', leaks.length === 0);
  if (leaks.length) console.log(`         ${leaks.map((a) => a.filename).join(', ')}`);

  console.log(failures === 0 ? '\nAll checks passed.\n' : `\n${failures} check(s) failed.\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(`\nVerification aborted: ${error.message}\n`);
  process.exit(1);
});
