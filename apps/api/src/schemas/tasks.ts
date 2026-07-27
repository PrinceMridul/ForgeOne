import { z } from 'zod';

export const agentTypeEnum = z.enum([
  'ORCHESTRATOR',
  'PRODUCT_MANAGER',
  'ARCHITECT',
  'DEVELOPER',
  'REVIEWER',
  'TESTER',
  'SECURITY',
  'DEVOPS',
  'DOCUMENTATION',
]);

export const taskStatusEnum = z.enum([
  'PENDING',
  'QUEUED',
  'IN_PROGRESS',
  'REVIEW',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
]);

export const taskSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  status: taskStatusEnum,
  priority: z.number().int(),
  assignedTo: agentTypeEnum.nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
});

export const taskDependencySchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  dependsOnId: z.string().uuid(),
});

export const createTaskInputSchema = z.object({
  projectId: z.string().uuid(),
  parentId: z.string().uuid().optional(),
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  priority: z.number().int().min(0).max(10).default(0),
  assignedTo: agentTypeEnum.optional(),
});

export const updateTaskInputSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: taskStatusEnum.optional(),
  priority: z.number().int().min(0).max(10).optional(),
  assignedTo: agentTypeEnum.nullable().optional(),
});

export const taskQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  status: taskStatusEnum.optional(),
  assignedTo: agentTypeEnum.optional(),
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().positive().max(100).default(20),
});
