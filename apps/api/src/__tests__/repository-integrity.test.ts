import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../app';
import type { FastifyInstance } from 'fastify';

/**
 * Locks the invariant the console depends on:
 *
 *   entries in Repository.zip  ===  artifacts flagged inRepository
 *
 * Before this existed the UI filtered artifacts by "not a .zip", which pulled
 * every pipeline document into the repository tree and reported ~20 files for
 * an 11-file download.
 */

const SEEDED_RUN_ID = 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380a99';

/** Reads zip entry names from the central directory. No external dependency. */
function listZipEntries(buf: Buffer): string[] {
  const names: string[] = [];
  let i = 0;
  while (i < buf.length - 4) {
    if (buf.readUInt32LE(i) === 0x02014b50) {
      const nameLen = buf.readUInt16LE(i + 28);
      const extraLen = buf.readUInt16LE(i + 30);
      const commentLen = buf.readUInt16LE(i + 32);
      names.push(buf.subarray(i + 46, i + 46 + nameLen).toString('utf-8'));
      i += 46 + nameLen + extraLen + commentLen;
    } else {
      i++;
    }
  }
  return names;
}

interface ArtifactRow {
  filename: string;
  inRepository?: boolean;
}

async function artifactsFor(app: FastifyInstance, runId: string): Promise<ArtifactRow[]> {
  const res = await app.inject({ method: 'GET', url: `/api/v1/runs/${runId}/artifacts` });
  expect(res.statusCode).toBe(200);
  return (JSON.parse(res.body) as { data: ArtifactRow[] }).data;
}

async function zipEntriesFor(app: FastifyInstance, runId: string): Promise<string[]> {
  const res = await app.inject({
    method: 'GET',
    url: `/api/v1/runs/${runId}/artifacts/Repository.zip/download`,
  });
  expect(res.statusCode).toBe(200);
  return listZipEntries(res.rawPayload);
}

describe('Repository / artifact count integrity', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('seeded run: zip entries match the artifacts flagged inRepository', async () => {
    const artifacts = await artifactsFor(app, SEEDED_RUN_ID);
    const flagged = artifacts.filter((a) => a.inRepository).map((a) => a.filename).sort();
    const entries = (await zipEntriesFor(app, SEEDED_RUN_ID)).sort();

    expect(flagged).toEqual(entries);
    expect(flagged.length).toBeGreaterThan(0);
  });

  it('live run: zip entries match the artifacts flagged inRepository', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/runs',
      payload: {
        projectId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        title: 'Ship a Slack-like chat with channels and threads',
        description: 'Ship a Slack-like chat with channels, threads, presence, and full-text search.',
      },
    });
    const runId = (JSON.parse(created.body) as { data: { id: string } }).data.id;

    // Pacing is disabled under NODE_ENV=test, so the pipeline settles quickly.
    // The budget is generous because turbo runs package tasks concurrently and
    // a tight one made this flaky under load. Comparing an incomplete artifact
    // set would be a meaningless assertion, so require COMPLETED first.
    let status = 'PENDING';
    for (let i = 0; i < 200; i++) {
      const r = await app.inject({ method: 'GET', url: `/api/v1/runs/${runId}` });
      status = (JSON.parse(r.body) as { data: { status: string } }).data.status;
      if (status === 'COMPLETED' || status === 'FAILED') break;
      await new Promise((res) => setTimeout(res, 25));
    }
    expect(status).toBe('COMPLETED');

    const artifacts = await artifactsFor(app, runId);
    const flagged = artifacts.filter((a) => a.inRepository).map((a) => a.filename).sort();
    const entries = (await zipEntriesFor(app, runId)).sort();

    expect(flagged).toEqual(entries);
  });

  it('pipeline documents are never counted as repository files', async () => {
    const artifacts = await artifactsFor(app, SEEDED_RUN_ID);
    const documents = ['PRD.md', 'Tasks.json', 'Architecture.md', 'SecurityAudit.md', 'DeploymentPlan.md'];

    for (const doc of documents) {
      const row = artifacts.find((a) => a.filename === doc);
      if (row) expect(row.inRepository).toBe(false);
    }
  });

  it('Repository.zip itself is not flagged as a repository file', async () => {
    const artifacts = await artifactsFor(app, SEEDED_RUN_ID);
    const zip = artifacts.find((a) => a.filename === 'Repository.zip');
    expect(zip).toBeDefined();
    expect(zip?.inRepository).toBe(false);
  });
});
