import type { FastifyRequest, HookHandlerDoneFunction } from 'fastify';
import type { Logger } from '@forgeone/logger';

export function requestLogger(logger: Logger) {
  return (request: FastifyRequest, _reply: unknown, done: HookHandlerDoneFunction): void => {
    logger.info(
      {
        requestId: request.id,
        method: request.method,
        url: request.url,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      },
      'Incoming request',
    );
    done();
  };
}
