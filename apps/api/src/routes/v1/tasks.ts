import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  taskSchema,
  createTaskInputSchema,
  updateTaskInputSchema,
  taskQuerySchema,
} from '../../schemas/tasks';
import { createApiResponseSchema, idParamSchema } from '../../schemas/common';

const mockTask = {
  id: 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
  projectId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  parentId: null,
  title: 'Setup Core API Contract & Open API Specs',
  description: 'Define Fastify routes and Zod schemas for all client endpoints',
  status: 'IN_PROGRESS' as const,
  priority: 1,
  assignedTo: 'ARCHITECT' as const,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  completedAt: null,
};

export const taskRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // GET /api/v1/tasks
  app.get(
    '/',
    {
      schema: {
        summary: 'List Tasks',
        description: 'Get paginated list of tasks with optional filtering by project, status, or assigned agent',
        tags: ['Tasks'],
        querystring: taskQuerySchema,
        response: {
          200: createApiResponseSchema(z.array(taskSchema)),
        },
      },
    },
    async (request, reply) => {
      const { page, perPage, projectId, status, assignedTo } = request.query;
      const task = {
        ...mockTask,
        ...(projectId ? { projectId } : {}),
        ...(status ? { status } : {}),
        ...(assignedTo ? { assignedTo } : {}),
      };
      return reply.send({
        success: true,
        data: [task],
        meta: {
          page,
          perPage,
          total: 1,
          totalPages: 1,
        },
      });
    },
  );

  // POST /api/v1/tasks
  app.post(
    '/',
    {
      schema: {
        summary: 'Create Task',
        description: 'Create a new task in a project',
        tags: ['Tasks'],
        body: createTaskInputSchema,
        response: {
          201: createApiResponseSchema(taskSchema),
        },
      },
    },
    async (request, reply) => {
      const { projectId, parentId, title, description, priority, assignedTo } = request.body;
      const newTask = {
        id: crypto.randomUUID(),
        projectId,
        parentId: parentId ?? null,
        title,
        description: description ?? null,
        status: 'PENDING' as const,
        priority,
        assignedTo: assignedTo ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null,
      };
      return reply.status(201).send({
        success: true,
        data: newTask,
      });
    },
  );

  // GET /api/v1/tasks/:id
  app.get(
    '/:id',
    {
      schema: {
        summary: 'Get Task Details',
        description: 'Get detailed task information',
        tags: ['Tasks'],
        params: idParamSchema,
        response: {
          200: createApiResponseSchema(taskSchema),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      return reply.send({
        success: true,
        data: { ...mockTask, id },
      });
    },
  );

  // PATCH /api/v1/tasks/:id
  app.patch(
    '/:id',
    {
      schema: {
        summary: 'Update Task',
        description: 'Update task properties or transition task status',
        tags: ['Tasks'],
        params: idParamSchema,
        body: updateTaskInputSchema,
        response: {
          200: createApiResponseSchema(taskSchema),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const updated = {
        ...mockTask,
        id,
        ...request.body,
        updatedAt: new Date().toISOString(),
      };
      return reply.send({
        success: true,
        data: updated,
      });
    },
  );

  // DELETE /api/v1/tasks/:id
  app.delete(
    '/:id',
    {
      schema: {
        summary: 'Delete Task',
        description: 'Delete a task',
        tags: ['Tasks'],
        params: idParamSchema,
        response: {
          200: createApiResponseSchema(z.object({ id: z.string().uuid(), deleted: z.literal(true) })),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      return reply.send({
        success: true,
        data: { id, deleted: true },
      });
    },
  );
};
