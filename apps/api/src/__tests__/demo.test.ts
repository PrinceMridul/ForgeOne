import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../app';
import type { FastifyInstance } from 'fastify';

describe('ForgeOne Hackathon Demo Mode Test Suite', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Demo Mode Endpoints (/demo/*)', () => {
    it('POST /demo/start should trigger deterministic demo engineering run', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/demo/start',
        payload: {
          prompt: 'Build an autonomous microservices platform for ForgeOne',
          durationSeconds: 90,
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.id).toBeDefined();
      expect(body.data.totalSteps).toBe(8);
    });

    it('GET /demo/events should return streaming execution telemetry', async () => {
      const res = await app.inject({ method: 'GET', url: '/demo/events' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);

      const eventTypes = body.data.map((e: { eventType: string }) => e.eventType);
      expect(eventTypes).toContain('STATUS_CHANGE');
    });

    it('GET /demo/artifacts should return generated engineering artifacts', async () => {
      const res = await app.inject({ method: 'GET', url: '/demo/artifacts' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);

      const filenames = body.data.map((a: { filename: string }) => a.filename);
      expect(filenames).toContain('PRD.md');
      expect(filenames).toContain('Architecture.md');
      expect(filenames).toContain('CodeDiff.ts');
      expect(filenames).toContain('PRReview.md');
      expect(filenames).toContain('TestReport.md');
      expect(filenames).toContain('SecurityAudit.md');
      expect(filenames).toContain('DeploymentPlan.md');
      expect(filenames).toContain('README.md');
    });

    it('GET /demo/replay should return complete replay timeline package', async () => {
      const res = await app.inject({ method: 'GET', url: '/demo/replay' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.run).toBeDefined();
      expect(body.data.events.length).toBeGreaterThan(0);
      expect(body.data.artifacts.length).toBeGreaterThan(0);
      expect(body.data.timelineSummary.length).toBeGreaterThan(0);
    });
  });

  describe('Demo Mode API Alias (/api/v1/demo/*)', () => {
    it('GET /api/v1/demo/replay should work as API v1 alias', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/demo/replay' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.run).toBeDefined();
    });
  });
});
