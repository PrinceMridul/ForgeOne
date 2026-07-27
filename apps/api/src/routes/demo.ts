import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { DemoEngine } from '../demo/demo-engine';
import {
  startDemoInputSchema,
  demoRunStateSchema,
  demoEventSchema,
  demoArtifactSchema,
  demoReplaySchema,
} from '../schemas/demo';
import { createApiResponseSchema } from '../schemas/common';

export const demoRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const demoEngine = DemoEngine.getInstance();

  // POST /demo/start or /api/v1/demo/start
  app.post(
    '/start',
    {
      schema: {
        summary: 'Start Demo Mode Autonomous Execution',
        description: 'Starts a realistic 90-120 second simulated autonomous software engineering run',
        tags: ['Demo Mode'],
        body: startDemoInputSchema.optional(),
        response: {
          201: createApiResponseSchema(demoRunStateSchema),
        },
      },
    },
    async (request, reply) => {
      const { prompt, durationSeconds } = request.body ?? {};
      const run = demoEngine.startDemo(prompt, durationSeconds);
      return reply.status(201).send({
        success: true,
        data: run,
      });
    },
  );

  // GET /demo/events or /api/v1/demo/events
  app.get(
    '/events',
    {
      schema: {
        summary: 'Get Demo Mode Streaming Events',
        description: 'Returns continuous log events, agent messages, code gen diffs, and status metrics',
        tags: ['Demo Mode'],
        querystring: z.object({ runId: z.string().optional() }),
        response: {
          200: createApiResponseSchema(z.array(demoEventSchema)),
        },
      },
    },
    async (request, reply) => {
      const { runId } = request.query;
      const events = demoEngine.getEvents(runId);
      return reply.send({
        success: true,
        data: events,
      });
    },
  );

  // GET /demo/artifacts or /api/v1/demo/artifacts
  app.get(
    '/artifacts',
    {
      schema: {
        summary: 'Get Demo Mode Generated Artifacts',
        description: 'Returns generated PRD, Architecture, CodeDiff, Review, Test, Security, and Deployment artifacts',
        tags: ['Demo Mode'],
        querystring: z.object({ runId: z.string().optional() }),
        response: {
          200: createApiResponseSchema(z.array(demoArtifactSchema)),
        },
      },
    },
    async (request, reply) => {
      const { runId } = request.query;
      const artifacts = demoEngine.getArtifacts(runId);
      return reply.send({
        success: true,
        data: artifacts,
      });
    },
  );

  // GET /demo/replay or /api/v1/demo/replay
  app.get(
    '/replay',
    {
      schema: {
        summary: 'Get Demo Mode Replay Package',
        description: 'Returns complete timeline replay package for interactive playback',
        tags: ['Demo Mode'],
        querystring: z.object({ runId: z.string().optional() }),
        response: {
          200: createApiResponseSchema(demoReplaySchema),
        },
      },
    },
    async (request, reply) => {
      const { runId } = request.query;
      const replay = demoEngine.getReplay(runId);
      return reply.send({
        success: true,
        data: replay,
      });
    },
  );
};
