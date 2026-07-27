import { z } from 'zod';

export const messageRoleEnum = z.enum(['USER', 'ASSISTANT', 'SYSTEM', 'TOOL']);

export const messageSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  role: messageRoleEnum,
  content: z.string(),
  metadata: z.record(z.unknown()).nullable(),
  createdAt: z.string().datetime(),
});

export const conversationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  projectId: z.string().uuid().nullable(),
  title: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const conversationDetailSchema = conversationSchema.extend({
  messages: z.array(messageSchema),
});

export const createConversationInputSchema = z.object({
  projectId: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
});

export const sendMessageInputSchema = z.object({
  content: z.string().min(1),
  role: messageRoleEnum.default('USER'),
});

export const conversationQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().positive().max(100).default(20),
});
