import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../app';
import type { FastifyInstance } from 'fastify';

describe('ForgeOne Autonomous Orchestration Engine Test Suite', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Autonomous Workflow Execution Flow', () => {
    let createdRunId: string;

    it('POST /api/v1/runs should trigger autonomous engineering pipeline and return 201', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/runs',
        payload: {
          projectId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          title: 'ForgeOne Autonomous Enterprise Suite',
          description: 'Build an autonomous multi-agent engineering platform',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.id).toBeDefined();
      expect(['PENDING', 'RUNNING']).toContain(body.data.status);
      expect(body.data.totalSteps).toBe(8);

      createdRunId = body.data.id;
    });

    it('GET /api/v1/runs should list workflow runs', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/runs?page=1&perPage=20' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
    });

    it('GET /api/v1/runs/:id should return run details and progress', async () => {
      const res = await app.inject({ method: 'GET', url: `/api/v1/runs/${createdRunId}` });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(createdRunId);
    });

    it('GET /api/v1/runs/:id/events should return streaming execution events across all agent stages', async () => {
      // Small delay to allow async pipeline stages to execute
      await new Promise((r) => setTimeout(r, 100));

      const res = await app.inject({ method: 'GET', url: `/api/v1/runs/${createdRunId}/events` });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);

      // Verify event types and agent types emitted
      const agentTypes = body.data.map((e: { agentType: string }) => e.agentType);
      expect(agentTypes).toContain('ORCHESTRATOR');
      expect(agentTypes).toContain('PRODUCT_MANAGER');
      expect(agentTypes).toContain('ARCHITECT');
    });

    it('GET /api/v1/runs/:id/artifacts should return generated engineering artifacts', async () => {
      await new Promise((r) => setTimeout(r, 200));

      const res = await app.inject({ method: 'GET', url: `/api/v1/runs/${createdRunId}/artifacts` });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);

      const filenames = body.data.map((a: { filename: string }) => a.filename);
      expect(filenames).toContain('Tasks.json');
      expect(filenames).toContain('Architecture.md');
      expect(filenames).toContain('PRReview.md');
      expect(filenames).toContain('TestReport.md');
      expect(filenames).toContain('SecurityAudit.md');
      expect(filenames).toContain('DeploymentPlan.md');
      expect(filenames).toContain('README.md');
    });

    it('GET /api/v1/runs/:id/artifacts/:artifactId/download should download raw artifact file content', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/runs/${createdRunId}/artifacts/Architecture.md/download`,
      });

      expect(res.statusCode).toBe(200);
      // Charset must be explicit — artifacts contain em-dashes and glyphs that
      // render as mojibake if a client falls back to latin-1.
      expect(res.headers['content-type']).toBe('text/markdown; charset=utf-8');
      expect(res.body).toContain('System Architecture Blueprint');

      // The blueprint must describe the project that was actually requested.
      // This previously asserted on 'ForgeOne', which only passed because the
      // Architect emitted ForgeOne's own architecture for every prompt.
      expect(res.body).toContain('ForgeOne Autonomous Enterprise');
      expect(res.body).toContain('## Data Model');
      expect(res.body).toContain('## Request Flow');
    });
  });
});
