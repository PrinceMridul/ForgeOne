import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  projectSchema,
  projectDetailSchema,
  createProjectInputSchema,
  updateProjectInputSchema,
  repositorySchema,
  createRepositoryInputSchema,
} from '../../schemas/projects';
import { createApiResponseSchema, paginationQuerySchema, idParamSchema } from '../../schemas/common';

const projectIdParamSchema = z.object({
  projectId: z.string().uuid(),
});

// --- Mock Data Generators for Contract Validation ---
const mockProject = {
  id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  orgId: '00000000-0000-0000-0000-000000000001',
  name: 'ForgeOne Workspace',
  slug: 'forgeone-workspace',
  description: 'AI-native engineering workspace for autonomous software development',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockRepository = {
  id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  projectId: mockProject.id,
  name: 'forgeone',
  url: 'https://github.com/forgeone/forgeone.git',
  branch: 'main',
  clonedAt: new Date().toISOString(),
};

export const projectRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // GET /api/v1/projects
  app.get(
    '/',
    {
      schema: {
        summary: 'List Projects',
        description: 'Get paginated list of projects in the workspace',
        tags: ['Projects'],
        querystring: paginationQuerySchema,
        response: {
          200: createApiResponseSchema(z.array(projectSchema)),
        },
      },
    },
    async (request, reply) => {
      const page = request.query?.page ?? 1;
      const perPage = request.query?.perPage ?? 20;
      return reply.send({
        success: true,
        data: [mockProject],
        meta: {
          page,
          perPage,
          total: 1,
          totalPages: 1,
        },
      });
    },
  );

  // POST /api/v1/projects
  app.post(
    '/',
    {
      schema: {
        summary: 'Create Project',
        description: 'Create a new software project',
        tags: ['Projects'],
        body: createProjectInputSchema,
        response: {
          201: createApiResponseSchema(projectSchema),
        },
      },
    },
    async (request, reply) => {
      const { name, slug, description, orgId } = request.body;
      const newProject = {
        id: crypto.randomUUID(),
        orgId,
        name,
        slug,
        description: description ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return reply.status(201).send({
        success: true,
        data: newProject,
      });
    },
  );

  // GET /api/v1/projects/:id
  app.get(
    '/:id',
    {
      schema: {
        summary: 'Get Project Details',
        description: 'Get detailed project information including linked repositories and task counts',
        tags: ['Projects'],
        params: idParamSchema,
        response: {
          200: createApiResponseSchema(projectDetailSchema),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const detail = {
        ...mockProject,
        id,
        repositories: [mockRepository],
        taskCounts: {
          total: 12,
          pending: 3,
          inProgress: 2,
          completed: 6,
          failed: 1,
        },
      };
      return reply.send({
        success: true,
        data: detail,
      });
    },
  );

  // PATCH /api/v1/projects/:id
  app.patch(
    '/:id',
    {
      schema: {
        summary: 'Update Project',
        description: 'Update project settings',
        tags: ['Projects'],
        params: idParamSchema,
        body: updateProjectInputSchema,
        response: {
          200: createApiResponseSchema(projectSchema),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const updated = {
        ...mockProject,
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

  // DELETE /api/v1/projects/:id
  app.delete(
    '/:id',
    {
      schema: {
        summary: 'Delete Project',
        description: 'Soft delete a project and release its resources',
        tags: ['Projects'],
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

  // GET /api/v1/projects/:projectId/repositories
  app.get(
    '/:projectId/repositories',
    {
      schema: {
        summary: 'List Project Repositories',
        description: 'List all Git repositories linked to a project',
        tags: ['Repositories'],
        params: projectIdParamSchema,
        response: {
          200: createApiResponseSchema(z.array(repositorySchema)),
        },
      },
    },
    async (request, reply) => {
      const { projectId } = request.params;
      return reply.send({
        success: true,
        data: [{ ...mockRepository, projectId }],
      });
    },
  );

  // POST /api/v1/projects/:projectId/repositories
  app.post(
    '/:projectId/repositories',
    {
      schema: {
        summary: 'Link Repository',
        description: 'Link a new Git repository to a project',
        tags: ['Repositories'],
        params: projectIdParamSchema,
        body: createRepositoryInputSchema,
        response: {
          201: createApiResponseSchema(repositorySchema),
        },
      },
    },
    async (request, reply) => {
      const { projectId } = request.params;
      const { name, url, branch } = request.body;
      const newRepo = {
        id: crypto.randomUUID(),
        projectId,
        name,
        url,
        branch,
        clonedAt: null,
      };
      return reply.status(201).send({
        success: true,
        data: newRepo,
      });
    },
  );
};

export const repositoryRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // DELETE /api/v1/repositories/:id
  app.delete(
    '/:id',
    {
      schema: {
        summary: 'Unlink Repository',
        description: 'Unlink a Git repository',
        tags: ['Repositories'],
        params: idParamSchema,
        response: {
          200: createApiResponseSchema(z.object({ id: z.string().uuid(), unlinked: z.literal(true) })),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      return reply.send({
        success: true,
        data: { id, unlinked: true },
      });
    },
  );
};
