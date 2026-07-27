import { z } from 'zod';

const configSchema = z.object({
  host: z.string().default('0.0.0.0'),
  port: z.coerce.number().default(4000),
  logLevel: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  databaseUrl: z.string().url().default('postgresql://forgeone:forgeone@localhost:5432/forgeone?schema=public'),
  redisUrl: z.string().url().default('redis://localhost:6379'),
  jwtSecret: z.string().min(16).default('change-me-in-production-use-openssl-rand-base64-64'),
  jwtIssuer: z.string().default('forgeone'),
  jwtAccessExpiry: z.string().default('15m'),
  jwtRefreshExpiry: z.string().default('7d'),
  corsOrigin: z.string().default('http://localhost:3000'),
  agentRuntimeUrl: z.string().url().default('http://localhost:8000'),
});

export type Config = z.infer<typeof configSchema>;

export const config: Config = configSchema.parse({
  host: process.env.API_HOST,
  port: process.env.API_PORT,
  logLevel: process.env.API_LOG_LEVEL,
  nodeEnv: process.env.NODE_ENV,
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtIssuer: process.env.JWT_ISSUER,
  jwtAccessExpiry: process.env.JWT_ACCESS_EXPIRY,
  jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY,
  corsOrigin: process.env.CORS_ORIGIN,
  agentRuntimeUrl: process.env.AGENT_RUNTIME_URL,
});
