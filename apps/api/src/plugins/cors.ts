import type { FastifyPluginAsync } from 'fastify';
import cors from '@fastify/cors';
import { config } from '../config';

export const corsPlugin: FastifyPluginAsync = async (app) => {
  await app.register(cors, {
    origin: config.corsOrigin.split(',').map((o) => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
};
