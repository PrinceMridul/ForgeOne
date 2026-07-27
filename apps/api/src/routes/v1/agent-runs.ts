import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  agentRunSchema,
  triggerAgentRunInputSchema,
  agentStatusSchema,
  agentRunQuerySchema,
} from '../../schemas/agents';
import { createApiResponseSchema, idParamSchema } from '../../schemas/common';

const mockAgentRun = {
  id: 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
  taskId: 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
  agentType: 'DEVELOPER' as const,
  status: 'RUNNING' as const,
  input: { instruction: 'Implement API routes for projects and tasks' },
  output: null,
  error: null,
  tokensUsed: 1420,
  costUsd: 0.0071,
  startedAt: new Date().toISOString(),
  completedAt: null,
  createdAt: new Date().toISOString(),
};

const mockAgentStatuses = [
  { agentType: 'ORCHESTRATOR' as const, status: 'IDLE' as const, currentTaskId: null, tasksCompleted: 42, uptimeSeconds: 3600 },
  { agentType: 'PRODUCT_MANAGER' as const, status: 'IDLE' as const, currentTaskId: null, tasksCompleted: 15, uptimeSeconds: 3600 },
  { agentType: 'ARCHITECT' as const, status: 'IDLE' as const, currentTaskId: null, tasksCompleted: 28, uptimeSeconds: 3600 },
  { agentType: 'DEVELOPER' as const, status: 'EXECUTING' as const, currentTaskId: 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', tasksCompleted: 89, uptimeSeconds: 3600 },
  { agentType: 'REVIEWER' as const, status: 'IDLE' as const, currentTaskId: null, tasksCompleted: 64, uptimeSeconds: 3600 },
  { agentType: 'TESTER' as const, status: 'IDLE' as const, currentTaskId: null, tasksCompleted: 51, uptimeSeconds: 3600 },
  { agentType: 'SECURITY' as const, status: 'IDLE' as const, currentTaskId: null, tasksCompleted: 19, uptimeSeconds: 3600 },
  { agentType: 'DEVOPS' as const, status: 'IDLE' as const, currentTaskId: null, tasksCompleted: 33, uptimeSeconds: 3600 },
];

export const agentRunRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // GET /api/v1/agent-runs
  app.get(
    '/',
    {
      schema: {
        summary: 'List Agent Runs',
        description: 'Get paginated list of agent execution runs',
        tags: ['Agent Runs'],
        querystring: agentRunQuerySchema,
        response: {
          200: createApiResponseSchema(z.array(agentRunSchema)),
        },
      },
    },
    async (request, reply) => {
      const { page, perPage, taskId, agentType, status } = request.query;
      const run = {
        ...mockAgentRun,
        ...(taskId ? { taskId } : {}),
        ...(agentType ? { agentType } : {}),
        ...(status ? { status } : {}),
      };
      return reply.send({
        success: true,
        data: [run],
        meta: {
          page,
          perPage,
          total: 1,
          totalPages: 1,
        },
      });
    },
  );

  // POST /api/v1/agent-runs
  app.post(
    '/',
    {
      schema: {
        summary: 'Trigger Agent Run',
        description: 'Dispatch a task to a specialized agent for execution',
        tags: ['Agent Runs'],
        body: triggerAgentRunInputSchema,
        response: {
          201: createApiResponseSchema(agentRunSchema),
        },
      },
    },
    async (request, reply) => {
      const { taskId, agentType, input } = request.body;
      const newRun = {
        id: crypto.randomUUID(),
        taskId,
        agentType,
        status: 'PENDING' as const,
        input: input ?? {},
        output: null,
        error: null,
        tokensUsed: 0,
        costUsd: 0,
        startedAt: null,
        completedAt: null,
        createdAt: new Date().toISOString(),
      };
      return reply.status(201).send({
        success: true,
        data: newRun,
      });
    },
  );

  // GET /api/v1/agent-runs/:id
  app.get(
    '/:id',
    {
      schema: {
        summary: 'Get Agent Run Details',
        description: 'Get execution details for a specific agent run',
        tags: ['Agent Runs'],
        params: idParamSchema,
        response: {
          200: createApiResponseSchema(agentRunSchema),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      return reply.send({
        success: true,
        data: { ...mockAgentRun, id },
      });
    },
  );

  // POST /api/v1/agent-runs/:id/cancel
  app.post(
    '/:id/cancel',
    {
      schema: {
        summary: 'Cancel Agent Run',
        description: 'Cancel an in-flight agent execution run',
        tags: ['Agent Runs'],
        params: idParamSchema,
        response: {
          200: createApiResponseSchema(agentRunSchema),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const cancelledRun = {
        ...mockAgentRun,
        id,
        status: 'CANCELLED' as const,
        completedAt: new Date().toISOString(),
      };
      return reply.send({
        success: true,
        data: cancelledRun,
      });
    },
  );
};

export const agentStatusRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // GET /api/v1/agents/status
  app.get(
    '/status',
    {
      schema: {
        summary: 'Get All Agent Statuses',
        description: 'Get the operational status of all specialized agents',
        tags: ['Agents'],
        response: {
          200: createApiResponseSchema(z.array(agentStatusSchema)),
        },
      },
    },
    async (_request, reply) => {
      return reply.send({
        success: true,
        data: mockAgentStatuses,
      });
    },
  );
};
