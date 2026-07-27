import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { createLogger } from '@forgeone/logger';
import { ZodError } from 'zod';

const logger = createLogger({ name: 'api:error-handler' });

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply): void {
  let statusCode = error.statusCode ?? 500;
  let code = error.code ?? 'INTERNAL_ERROR';
  let message = statusCode >= 500 ? 'Internal server error' : error.message;
  let details: unknown = undefined;

  // Handle Zod and Fastify schema validation errors
  if (
    error instanceof ZodError ||
    (error as { name?: string }).name === 'ZodError' ||
    error.code === 'FST_ERR_VALIDATION'
  ) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Request validation failed';
    details = (error as unknown as ZodError).issues ?? error.validation ?? error.message;
  }

  if (statusCode >= 500) {
    logger.error({ err: error, requestId: request.id }, 'Internal server error');
  } else {
    logger.warn({ err: error, requestId: request.id }, `Client error: ${message}`);
  }

  void reply.status(statusCode).send({
    success: false,
    error: {
      code,
      message,
      details,
      requestId: request.id,
      ...(process.env.NODE_ENV === 'development' ? { stack: error.stack } : {}),
    },
  });
}
