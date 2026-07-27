import { z } from 'zod';
import { agentTypeEnum } from './tasks';

export const agentRunStatusEnum = z.enum([
  'PENDING',
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'TIMEOUT',
]);

export const agentRunSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  agentType: agentTypeEnum,
  status: agentRunStatusEnum,
  input: z.unknown(),
  output: z.unknown(),
  error: z.string().nullable(),
  tokensUsed: z.number().int().nonnegative(),
  costUsd: z.number().nonnegative(),
  startedAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

export const triggerAgentRunInputSchema = z.object({
  taskId: z.string().uuid(),
  agentType: agentTypeEnum,
  input: z.record(z.unknown()).optional(),
});

export const agentStatusSchema = z.object({
  agentType: agentTypeEnum,
  status: z.enum(['IDLE', 'PLANNING', 'EXECUTING', 'WAITING', 'COMPLETED', 'FAILED']),
  currentTaskId: z.string().uuid().nullable(),
  tasksCompleted: z.number().int().nonnegative(),
  uptimeSeconds: z.number().nonnegative(),
});

export const agentRunQuerySchema = z.object({
  taskId: z.string().uuid().optional(),
  agentType: agentTypeEnum.optional(),
  status: agentRunStatusEnum.optional(),
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().positive().max(100).default(20),
});
