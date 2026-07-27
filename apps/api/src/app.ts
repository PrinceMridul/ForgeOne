import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { createLogger } from '@forgeone/logger';
import { config } from './config';
import { corsPlugin } from './plugins/cors';
import { swaggerPlugin } from './plugins/swagger';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';
import { healthRoute } from './routes/health';
import { v1Routes } from './routes/v1/index';
import { demoRoutes } from './routes/demo';

export async function createApp(): Promise<FastifyInstance> {
  const logger = createLogger({ name: 'api', level: config.logLevel });

  const app = Fastify({
    logger: false,
    trustProxy: true,
    genReqId: () => crypto.randomUUID(),
  });

  // --- Zod type provider compilers ---
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // --- Global hooks & error handler ---
  app.setErrorHandler(errorHandler);
  app.addHook('onRequest', requestLogger(logger));

  // --- Plugins ---
  await app.register(corsPlugin);
  await app.register(swaggerPlugin);

  // --- Routes ---
  await app.register(healthRoute);
  await app.register(demoRoutes, { prefix: '/demo' });
  await app.register(v1Routes, { prefix: '/api/v1' });

  return app;
}
