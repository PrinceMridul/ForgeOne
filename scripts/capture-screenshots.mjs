#!/usr/bin/env node
/**
 * Recaptures the presentation screenshots from a real run.
 *
 * Every image under docs/presentation/images/ comes from one live execution of
 * the hospital prompt, so the deck and the README show what the application
 * actually renders. Committing the harness rather than the ad-hoc commands
 * means a UI change can be followed by a single command instead of sixteen
 * manual captures that drift out of date one at a time.
 *
 *   pnpm turbo run build
 *   pnpm start &
 *   node scripts/capture-screenshots.mjs
 *
 * Options:
 *   --url <origin>   target instance (default http://localhost:8080)
 *   --out <dir>      output directory (default docs/presentation/images)
 */
import { mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const BASE = arg('url', 'http://localhost:8080').replace(/\/+$/, '');
const OUT = resolve(root, arg('out', 'docs/presentation/images'));

const PROMPT =
  'Build a Hospital Management system with patients, doctors, appointments, prescriptions and lab results.';

/** Backend agent type -> screenshot basename, in pipeline order. */
const AGENT_SHOTS = [
  ['ARCHITECT', '05-architect'],
  ['DEVELOPER', '06-developer'],
  ['REVIEWER', '07-reviewer'],
  ['TESTER', '08-tester'],
  ['SECURITY', '09-security'],
  ['DEVOPS', '10-devops'],
  ['DOCUMENTATION', '11-documentation'],
];

const VIEWPORT = { width: 1600, height: 1000 };
const SCALE = 2; // 3200x2000, matching the existing assets

async function shoot(page, name) {
  const file = join(OUT, `${name}.png`);
  await page.screenshot({ path: file });
  console.log(`  ${name}.png`);
}

async function api(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return (await res.json()).data;
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: SCALE,
    colorScheme: 'dark',
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();

  console.log(`Capturing from ${BASE} -> ${OUT}\n`);

  // --- Landing ---------------------------------------------------------------
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await shoot(page, '01-landing-page');

  const box = page.getByPlaceholder(/Build a Notion-style docs app/i);
  await box.click();
  await box.fill(PROMPT);
  await page.waitForTimeout(400);
  await shoot(page, '02-prompt-entry');

  // --- Dispatch --------------------------------------------------------------
  const before = new Set((await api('/api/v1/runs')).map((r) => r.id));
  await page.getByRole('button', { name: /Dispatch Engineering Team/i }).click();
  await page.waitForURL(/\/run/, { timeout: 20_000 });

  let runId = null;
  for (let i = 0; i < 40 && !runId; i += 1) {
    const runs = await api('/api/v1/runs');
    runId = runs.find((r) => !before.has(r.id))?.id ?? null;
    if (!runId) await page.waitForTimeout(200);
  }
  if (!runId) throw new Error('dispatch did not create a run');
  console.log(`  run ${runId}\n`);

  // The Product Manager stage is the shortest in the pipeline and is already
  // under way here, so take its frame before anything else waits.
  await page.waitForTimeout(900);
  await shoot(page, '04-product-manager');

  await page.waitForTimeout(1200);
  await shoot(page, '03-pipeline-start');

  // --- One frame per agent ---------------------------------------------------
  // Poll the API rather than sleeping a fixed amount: pacing is configurable,
  // so a hardcoded delay would silently capture the wrong stage. The Product
  // Manager is the shortest stage and is already running by the time the page
  // settles, so it is claimed from the first poll rather than waited for.
  const pending = new Map(AGENT_SHOTS);
  const deadline = Date.now() + 180_000;

  while (pending.size > 0 && Date.now() < deadline) {
    const run = await api(`/api/v1/runs/${runId}`);
    const name = pending.get(run.currentAgent);
    if (name) {
      pending.delete(run.currentAgent);
      await page.waitForTimeout(500); // let the console settle on this stage
      await shoot(page, name);
    }
    if (run.status === 'COMPLETED' || run.status === 'FAILED') break;
    await page.waitForTimeout(250);
  }

  for (const [, name] of pending) {
    console.warn(`  ! missed ${name} — stage elapsed before a frame was taken`);
  }

  // --- Completion ------------------------------------------------------------
  while (Date.now() < deadline) {
    const run = await api(`/api/v1/runs/${runId}`);
    if (run.status === 'COMPLETED' || run.status === 'FAILED') break;
    await page.waitForTimeout(1000);
  }
  await page.waitForTimeout(2500); // final poll lands in the console

  await shoot(page, '16-finished-run');

  // --- Detail panels ---------------------------------------------------------
  const artifactPanel = page
    .locator('div')
    .filter({ hasText: /^Artifact explorer/ })
    .last();
  await artifactPanel.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await shoot(page, '12-artifact-explorer');

  const build = page
    .locator('div')
    .filter({ hasText: /^Build Verification/ })
    .last();
  await build.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  await shoot(page, '14-build-verification');

  const repoPanel = page
    .locator('div')
    .filter({ hasText: /^Repository · / })
    .last();
  await repoPanel.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await shoot(page, '15-download-repository');

  // --- Repository explorer ---------------------------------------------------
  await page.goto(`${BASE}/repository`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await shoot(page, '13-repository-explorer');

  await browser.close();
  console.log('\nDone.\n');
}

main().catch((error) => {
  console.error(`\nCapture failed: ${error.message}\n`);
  process.exit(1);
});
