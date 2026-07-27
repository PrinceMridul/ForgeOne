import { z } from 'zod';
import { agentTypeEnum } from './tasks';

export const runStatusEnum = z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED']);

export const eventTypeEnum = z.enum(['LOG', 'STEP', 'ARTIFACT', 'STATUS_CHANGE', 'ERROR']);

export const workflowRunSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  status: runStatusEnum,
  currentAgent: agentTypeEnum.nullable().optional(),
  stepProgress: z.number().int().min(0).max(100),
  totalSteps: z.number().int().positive(),
  completedSteps: z.number().int().nonnegative(),
  error: z.string().nullable().optional(),
  startedAt: z.string(),
  completedAt: z.string().nullable().optional(),
  createdAt: z.string(),
});

export const executionEventSchema = z.object({
  id: z.string().uuid(),
  runId: z.string().uuid(),
  agentType: agentTypeEnum,
  eventType: eventTypeEnum,
  message: z.string(),
  payload: z.record(z.unknown()).optional(),
  timestamp: z.string(),
});

export const generatedArtifactSchema = z.object({
  id: z.string().uuid(),
  runId: z.string().uuid(),
  agentType: agentTypeEnum,
  filename: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  storageKey: z.string(),
  createdAt: z.string(),
  content: z.string().optional(),
});

export const startRunInputSchema = z.object({
  projectId: z.string().uuid().default('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
});

export const runArtifactParamSchema = z.object({
  id: z.string().uuid(),
  artifactId: z.string().min(1),
});
