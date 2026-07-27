import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../app';
import type { FastifyInstance } from 'fastify';

describe('ForgeOne Backend API Contract Test Suite', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  // --- 1. Health & Open API Specs ---
  describe('Health & OpenAPI Documentation', () => {
    it('GET /health should return 200 ok', async () => {
      const res = await app.inject({ method: 'GET', url: '/health' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.status).toBe('ok');
      expect(body.service).toBe('forgeone-api');
    });

    it('GET /docs/json should return valid OpenAPI 3.0 specification', async () => {
      const res = await app.inject({ method: 'GET', url: '/docs/json' });
      expect(res.statusCode).toBe(200);
      const spec = JSON.parse(res.body);
      expect(spec.openapi).toBeDefined();
      expect(spec.info.title).toBe('ForgeOne API');
      expect(spec.paths).toBeDefined();
      expect(Object.keys(spec.paths).length).toBeGreaterThan(0);
      const pathKeys = Object.keys(spec.paths);
      expect(pathKeys.some((p) => p.includes('/projects'))).toBe(true);
      expect(pathKeys.some((p) => p.includes('/tasks'))).toBe(true);
    });
  });

  // --- 2. Projects & Repositories ---
  describe('Projects & Repositories Routes', () => {
    it('GET /api/v1/projects should return paginated projects', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/projects?page=1&perPage=10' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.meta.page).toBe(1);
    });

    it('POST /api/v1/projects should create project and return 201', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        payload: {
          name: 'Test Project',
          slug: 'test-project',
          description: 'A test software project',
        },
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Test Project');
      expect(body.data.id).toBeDefined();
    });

    it('GET /api/v1/projects/:id should return project details with task counts', async () => {
      const projectId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      const res = await app.inject({ method: 'GET', url: `/api/v1/projects/${projectId}` });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.repositories).toBeDefined();
      expect(body.data.taskCounts).toBeDefined();
    });

    it('POST /api/v1/projects/:projectId/repositories should link repository', async () => {
      const projectId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/repositories`,
        payload: {
          name: 'forgeone',
          url: 'https://github.com/forgeone/forgeone.git',
          branch: 'main',
        },
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data.projectId).toBe(projectId);
    });
  });

  // --- 3. Tasks ---
  describe('Tasks Routes', () => {
    it('GET /api/v1/tasks should list tasks with query filter', async () => {
      const projectId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      const res = await app.inject({ method: 'GET', url: `/api/v1/tasks?projectId=${projectId}&status=IN_PROGRESS` });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('POST /api/v1/tasks should create task', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/tasks',
        payload: {
          projectId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          title: 'Design DB Schema',
          description: 'Design PostgreSQL schema for projects and tasks',
          priority: 2,
          assignedTo: 'ARCHITECT',
        },
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data.title).toBe('Design DB Schema');
      expect(body.data.status).toBe('PENDING');
    });

    it('PATCH /api/v1/tasks/:id should update task status', async () => {
      const taskId = 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/tasks/${taskId}`,
        payload: { status: 'COMPLETED' },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.status).toBe('COMPLETED');
    });
  });

  // --- 4. Agent Runs & Statuses ---
  describe('Agent Runs & Status Routes', () => {
    it('GET /api/v1/agents/status should return operational statuses of all agents', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/agents/status' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
      expect(body.data[0].agentType).toBeDefined();
    });

    it('POST /api/v1/agent-runs should trigger new agent run', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/agent-runs',
        payload: {
          taskId: 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
          agentType: 'DEVELOPER',
          input: { instruction: 'Write code for API endpoints' },
        },
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data.agentType).toBe('DEVELOPER');
      expect(body.data.status).toBe('PENDING');
    });

    it('POST /api/v1/agent-runs/:id/cancel should cancel agent run', async () => {
      const runId = 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';
      const res = await app.inject({ method: 'POST', url: `/api/v1/agent-runs/${runId}/cancel` });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.status).toBe('CANCELLED');
    });
  });

  // --- 5. Artifacts ---
  describe('Artifact Routes', () => {
    it('GET /api/v1/artifacts should list artifacts', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/artifacts' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
    });

    it('GET /api/v1/artifacts/:id/download should download raw content', async () => {
      const artifactId = 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55';
      const res = await app.inject({ method: 'GET', url: `/api/v1/artifacts/${artifactId}/download` });
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('text/markdown');
      expect(res.body).toContain('ForgeOne Artifact');
    });
  });

  // --- 6. Conversations ---
  describe('Conversation Routes', () => {
    it('POST /api/v1/conversations should create new thread', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/conversations',
        payload: { title: 'Backend Design Sync' },
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data.title).toBe('Backend Design Sync');
    });

    it('POST /api/v1/conversations/:id/messages should send message', async () => {
      const convId = 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a66';
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/conversations/${convId}/messages`,
        payload: { role: 'USER', content: 'What is the deployment strategy?' },
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data.content).toBe('What is the deployment strategy?');
    });
  });

  // --- 7. Validation & Error Handling ---
  describe('Zod Validation & Error Handling', () => {
    it('POST /api/v1/projects with invalid payload should return 400 Bad Request with details', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        payload: { name: '', slug: 'INVALID SLUG WITH SPACES!' },
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.requestId).toBeDefined();
    });

    it('GET /api/v1/projects/not-a-uuid should return 400 Bad Request for invalid UUID parameter', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/projects/not-a-uuid' });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
