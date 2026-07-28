import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { RunManager } from '../../orchestrator/run-manager';
import {
  workflowRunSchema,
  executionEventSchema,
  generatedArtifactSchema,
  startRunInputSchema,
  runArtifactParamSchema,
} from '../../schemas/runs';
import {
  createApiResponseSchema,
  paginationQuerySchema,
  idParamSchema,
  apiErrorResponseSchema,
} from '../../schemas/common';

/** Text payloads must declare UTF-8 or clients may decode them as latin-1. */
function withUtf8Charset(mimeType: string): string {
  if (mimeType.includes('charset')) return mimeType;
  if (mimeType.startsWith('text/') || mimeType === 'application/json') {
    return `${mimeType}; charset=utf-8`;
  }
  return mimeType;
}

export const runRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const runManager = RunManager.getInstance();

  // POST /api/v1/runs
  app.post(
    '/',
    {
      schema: {
        summary: 'Start Autonomous Run',
        description: 'Submit project request to start autonomous engineering orchestration pipeline',
        tags: ['Orchestrator Runs'],
        body: startRunInputSchema,
        response: {
          201: createApiResponseSchema(workflowRunSchema),
        },
      },
    },
    async (request, reply) => {
      const { projectId, title, description } = request.body;
      const run = await runManager.startRun(projectId, title, description);
      return reply.status(201).send({
        success: true,
        data: run,
      });
    },
  );

  // GET /api/v1/runs
  app.get(
    '/',
    {
      schema: {
        summary: 'List Autonomous Runs',
        description: 'Get list of all autonomous workflow runs',
        tags: ['Orchestrator Runs'],
        querystring: paginationQuerySchema,
        response: {
          200: createApiResponseSchema(z.array(workflowRunSchema)),
        },
      },
    },
    async (request, reply) => {
      try {
        const query = request.query as { page?: number; perPage?: number };
        const page = query?.page ?? 1;
        const perPage = query?.perPage ?? 20;
        const runs = runManager.listRuns();
        return reply.send({
          success: true,
          data: runs,
          meta: {
            page,
            perPage,
            total: runs.length,
            totalPages: Math.ceil(runs.length / perPage) || 1,
          },
        });
      } catch (err) {
        request.log.error(err, 'Error in GET /api/v1/runs');
        throw err;
      }
    },
  );

  // GET /api/v1/runs/:id
  app.get(
    '/:id',
    {
      schema: {
        summary: 'Get Autonomous Run',
        description: 'Get status and details of a specific autonomous run',
        tags: ['Orchestrator Runs'],
        params: idParamSchema,
        response: {
          200: createApiResponseSchema(workflowRunSchema),
          // Must describe the error envelope actually sent. Declaring the
          // success shape here made the 404 branch fail serialization and
          // surface as a 500, so clients could not tell a missing run from a
          // broken server.
          404: apiErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const run = runManager.getRun(id);

      if (!run) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Workflow Run "${id}" not found`,
            requestId: request.id,
          },
        });
      }

      return reply.send({
        success: true,
        data: run,
      });
    },
  );

  // GET /api/v1/runs/:id/events
  app.get(
    '/:id/events',
    {
      schema: {
        summary: 'Get Run Execution Events',
        description: 'Get real-time streaming execution events for a run',
        tags: ['Orchestrator Runs'],
        params: idParamSchema,
        response: {
          200: createApiResponseSchema(z.array(executionEventSchema)),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const events = runManager.getRunEvents(id);
      return reply.send({
        success: true,
        data: events,
      });
    },
  );

  // GET /api/v1/runs/:id/artifacts
  app.get(
    '/:id/artifacts',
    {
      schema: {
        summary: 'Get Run Generated Artifacts',
        description: 'Get all artifacts generated during the autonomous run',
        tags: ['Orchestrator Runs'],
        params: idParamSchema,
        response: {
          200: createApiResponseSchema(z.array(generatedArtifactSchema)),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const artifacts = runManager.getRunArtifacts(id);

      /**
       * The live console re-fetches this list every 1.5s. Binary archives are
       * carried as base64 and dominate the payload while being unusable in
       * the browser — the UI links to the download endpoint for those. Strip
       * their content here; `sizeBytes` and `downloadUrl` still describe them
       * fully. Text artifacts keep their content so the file viewer works.
       */
      const listPayload = artifacts.map((artifact) => {
        const isArchive =
          artifact.mimeType === 'application/zip' || artifact.filename.endsWith('.zip');
        if (!isArchive) return artifact;
        return { ...artifact, content: undefined };
      });

      return reply.send({
        success: true,
        data: listPayload,
      });
    },
  );

  // GET /api/v1/runs/:id/artifacts/:artifactId/download
  app.get(
    '/:id/artifacts/:artifactId/download',
    {
      schema: {
        summary: 'Download Run Artifact File',
        description: 'Download the raw file content of an artifact created in a run',
        tags: ['Orchestrator Runs'],
        params: runArtifactParamSchema,
      },
    },
    async (request, reply) => {
      const { id, artifactId } = request.params;
      const artifact = runManager.getRunArtifactContent(id, artifactId);

      if (!artifact) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Artifact "${artifactId}" not found in run "${id}"`,
            requestId: request.id,
          },
        });
      }

      if (artifact.mimeType === 'application/zip' || artifact.filename.endsWith('.zip')) {
        const buf = Buffer.isBuffer(artifact.content)
          ? artifact.content
          : Buffer.from(artifact.content ?? '', 'base64');
        return reply
          .header('Content-Type', 'application/zip')
          .header('Content-Disposition', `attachment; filename="${artifact.filename}"`)
          .header('Content-Length', buf.length.toString())
          .send(buf);
      }

      // Artifacts are UTF-8 and routinely contain em-dashes and status glyphs.
      // Without an explicit charset a browser may fall back to latin-1 and
      // render them as mojibake.
      return reply
        .header('Content-Type', withUtf8Charset(artifact.mimeType))
        .header('Content-Disposition', `attachment; filename="${artifact.filename}"`)
        .send(artifact.content);
    },
  );
};
