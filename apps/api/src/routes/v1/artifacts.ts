import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  agentArtifactSchema,
  createArtifactInputSchema,
  artifactQuerySchema,
} from '../../schemas/artifacts';
import { createApiResponseSchema, idParamSchema } from '../../schemas/common';
import { RunManager } from '../../orchestrator/run-manager';

const mockArtifact = {
  id: 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55',
  agentRunId: 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
  filename: 'architecture_blueprint.md',
  mimeType: 'text/markdown',
  sizeBytes: 15420,
  storageKey: 'artifacts/d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44/architecture_blueprint.md',
  createdAt: new Date().toISOString(),
};

export const artifactRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // GET /api/v1/artifacts
  app.get(
    '/',
    {
      schema: {
        summary: 'List Artifacts',
        description: 'Get paginated list of generated artifacts',
        tags: ['Artifacts'],
        querystring: artifactQuerySchema,
        response: {
          200: createApiResponseSchema(z.array(agentArtifactSchema)),
        },
      },
    },
    async (request, reply) => {
      const { page, perPage, agentRunId } = request.query;
      const artifact = {
        ...mockArtifact,
        ...(agentRunId ? { agentRunId } : {}),
      };
      return reply.send({
        success: true,
        data: [artifact],
        meta: {
          page,
          perPage,
          total: 1,
          totalPages: 1,
        },
      });
    },
  );

  // POST /api/v1/artifacts
  app.post(
    '/',
    {
      schema: {
        summary: 'Register Artifact',
        description: 'Register a newly produced file artifact',
        tags: ['Artifacts'],
        body: createArtifactInputSchema,
        response: {
          201: createApiResponseSchema(agentArtifactSchema),
        },
      },
    },
    async (request, reply) => {
      const { agentRunId, filename, mimeType, sizeBytes, storageKey } = request.body;
      const newArtifact = {
        id: crypto.randomUUID(),
        agentRunId,
        filename,
        mimeType,
        sizeBytes,
        storageKey,
        createdAt: new Date().toISOString(),
      };
      return reply.status(201).send({
        success: true,
        data: newArtifact,
      });
    },
  );

  // GET /api/v1/artifacts/:id
  app.get(
    '/:id',
    {
      schema: {
        summary: 'Get Artifact Metadata',
        description: 'Get metadata for a specific artifact',
        tags: ['Artifacts'],
        params: idParamSchema,
        response: {
          200: createApiResponseSchema(agentArtifactSchema),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      return reply.send({
        success: true,
        data: { ...mockArtifact, id },
      });
    },
  );

  // GET /api/v1/artifacts/:id/download
  app.get(
    '/:id/download',
    {
      schema: {
        summary: 'Download Artifact Content',
        description: 'Download the raw content of an artifact',
        tags: ['Artifacts'],
        params: idParamSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const runManager = RunManager.getInstance();
      const allRuns = runManager.listRuns();
      for (const run of allRuns) {
        const art = runManager.getRunArtifactContent(run.id, id);
        if (art) {
          if (art.mimeType === 'application/zip' || art.filename.endsWith('.zip')) {
            const buf = Buffer.isBuffer(art.content)
              ? art.content
              : Buffer.from(art.content ?? '', 'base64');
            return reply
              .header('Content-Type', 'application/zip')
              .header('Content-Disposition', `attachment; filename="${art.filename}"`)
              .header('Content-Length', buf.length.toString())
              .send(buf);
          }
          return reply
            .header('Content-Type', art.mimeType)
            .header('Content-Disposition', `attachment; filename="${art.filename}"`)
            .send(art.content);
        }
      }

      const content = `# ForgeOne Artifact ${id}\n\nMock content generated for API contract integration test.`;
      return reply
        .header('Content-Type', 'text/markdown')
        .header('Content-Disposition', `attachment; filename="${mockArtifact.filename}"`)
        .send(content);
    },
  );
};
