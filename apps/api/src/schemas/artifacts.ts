import { z } from 'zod';

export const agentArtifactSchema = z.object({
  id: z.string().uuid(),
  agentRunId: z.string().uuid(),
  filename: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  storageKey: z.string(),
  createdAt: z.string().datetime(),
});

export const createArtifactInputSchema = z.object({
  agentRunId: z.string().uuid(),
  filename: z.string().min(1).max(255),
  mimeType: z.string().default('application/octet-stream'),
  sizeBytes: z.number().int().nonnegative(),
  storageKey: z.string().min(1),
});

export const artifactQuerySchema = z.object({
  agentRunId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().positive().max(100).default(20),
});
