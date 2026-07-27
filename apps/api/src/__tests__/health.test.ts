import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../app';
import type { FastifyInstance } from 'fastify';

describe('Health endpoint', () => {
  let app: FastifyInstance;
  beforeAll(async () => { app = await createApp(); await app.ready(); });
  afterAll(async () => { await app.close(); });

  it('should return 200 with status ok', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('ok');
    expect(body.service).toBe('forgeone-api');
  });
});
