import { z } from 'zod';

export const repositorySchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  name: z.string(),
  url: z.string().url(),
  branch: z.string().default('main'),
  clonedAt: z.string().datetime().nullable(),
});

export const taskCountsSchema = z.object({
  total: z.number().int().nonnegative(),
  pending: z.number().int().nonnegative(),
  inProgress: z.number().int().nonnegative(),
  completed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
});

export const projectSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const projectDetailSchema = projectSchema.extend({
  repositories: z.array(repositorySchema),
  taskCounts: taskCountsSchema,
});

export const createProjectInputSchema = z.object({
  orgId: z.string().uuid().default('00000000-0000-0000-0000-000000000001'),
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().max(1000).optional(),
});

export const updateProjectInputSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional(),
});

export const createRepositoryInputSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
  branch: z.string().default('main'),
});
