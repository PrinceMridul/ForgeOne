import { z } from 'zod';
import { agentTypeEnum } from './tasks';

export const startDemoInputSchema = z.object({
  prompt: z.string().optional(),
  durationSeconds: z.number().int().positive().default(90),
});

export const demoRunStateSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  status: z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED']),
  currentAgent: agentTypeEnum,
  stepProgress: z.number().int().min(0).max(100),
  totalSteps: z.number().int().positive(),
  completedSteps: z.number().int().nonnegative(),
  durationSeconds: z.number().int().positive(),
  startedAt: z.string(),
  completedAt: z.string().optional(),
});

export const demoEventSchema = z.object({
  id: z.string(),
  runId: z.string(),
  timestamp: z.string(),
  agentType: agentTypeEnum,
  agentName: z.string(),
  eventType: z.enum(['LOG', 'AGENT_TALK', 'CODE_GEN', 'ARTIFACT', 'STATUS_CHANGE', 'METRIC']),
  message: z.string(),
  payload: z.record(z.unknown()).optional(),
});

export const demoArtifactSchema = z.object({
  id: z.string(),
  runId: z.string(),
  agentType: agentTypeEnum,
  filename: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  content: z.string(),
  createdAt: z.string(),
});

export const demoReplaySchema = z.object({
  run: demoRunStateSchema,
  events: z.array(demoEventSchema),
  artifacts: z.array(demoArtifactSchema),
  timelineSummary: z.array(
    z.object({
      agent: agentTypeEnum,
      role: z.string(),
      action: z.string(),
      timestamp: z.string(),
    }),
  ),
});
