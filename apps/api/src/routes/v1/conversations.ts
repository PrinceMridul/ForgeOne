import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  conversationSchema,
  conversationDetailSchema,
  messageSchema,
  createConversationInputSchema,
  sendMessageInputSchema,
  conversationQuerySchema,
} from '../../schemas/conversations';
import { createApiResponseSchema, idParamSchema } from '../../schemas/common';

const mockConversation = {
  id: 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a66',
  userId: '00000000-0000-0000-0000-000000000002',
  projectId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  title: 'Architecture Blueprint Discussion',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockMessage = {
  id: 'g6eebc99-9c0b-4ef8-bb6d-6bb9bd380a77',
  conversationId: mockConversation.id,
  role: 'USER' as const,
  content: 'Please outline the system architecture for ForgeOne.',
  metadata: null,
  createdAt: new Date().toISOString(),
};

const mockAssistantMessage = {
  id: 'h7eebc99-9c0b-4ef8-bb6d-6bb9bd380a88',
  conversationId: mockConversation.id,
  role: 'ASSISTANT' as const,
  content: 'The ForgeOne architecture features a Next.js 15 web app, Fastify API, Python FastAPI agent runtime, PostgreSQL, Redis, Qdrant, and Docker sandboxes.',
  metadata: null,
  createdAt: new Date().toISOString(),
};

export const conversationRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // GET /api/v1/conversations
  app.get(
    '/',
    {
      schema: {
        summary: 'List Conversations',
        description: 'Get paginated list of chat conversations',
        tags: ['Conversations'],
        querystring: conversationQuerySchema,
        response: {
          200: createApiResponseSchema(z.array(conversationSchema)),
        },
      },
    },
    async (request, reply) => {
      const { page, perPage, projectId } = request.query;
      const conversation = {
        ...mockConversation,
        ...(projectId ? { projectId } : {}),
      };
      return reply.send({
        success: true,
        data: [conversation],
        meta: {
          page,
          perPage,
          total: 1,
          totalPages: 1,
        },
      });
    },
  );

  // POST /api/v1/conversations
  app.post(
    '/',
    {
      schema: {
        summary: 'Create Conversation',
        description: 'Start a new chat conversation thread with agents',
        tags: ['Conversations'],
        body: createConversationInputSchema,
        response: {
          201: createApiResponseSchema(conversationSchema),
        },
      },
    },
    async (request, reply) => {
      const { projectId, title } = request.body;
      const newConversation = {
        id: crypto.randomUUID(),
        userId: '00000000-0000-0000-0000-000000000002',
        projectId: projectId ?? null,
        title,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return reply.status(201).send({
        success: true,
        data: newConversation,
      });
    },
  );

  // GET /api/v1/conversations/:id
  app.get(
    '/:id',
    {
      schema: {
        summary: 'Get Conversation Details',
        description: 'Get detailed conversation history with all messages',
        tags: ['Conversations'],
        params: idParamSchema,
        response: {
          200: createApiResponseSchema(conversationDetailSchema),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const detail = {
        ...mockConversation,
        id,
        messages: [
          { ...mockMessage, conversationId: id },
          { ...mockAssistantMessage, conversationId: id },
        ],
      };
      return reply.send({
        success: true,
        data: detail,
      });
    },
  );

  // POST /api/v1/conversations/:id/messages
  app.post(
    '/:id/messages',
    {
      schema: {
        summary: 'Send Message',
        description: 'Send a message in a conversation thread',
        tags: ['Conversations'],
        params: idParamSchema,
        body: sendMessageInputSchema,
        response: {
          201: createApiResponseSchema(messageSchema),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { content, role } = request.body;
      const newMessage = {
        id: crypto.randomUUID(),
        conversationId: id,
        role,
        content,
        metadata: null,
        createdAt: new Date().toISOString(),
      };
      return reply.status(201).send({
        success: true,
        data: newMessage,
      });
    },
  );

  // DELETE /api/v1/conversations/:id
  app.delete(
    '/:id',
    {
      schema: {
        summary: 'Delete Conversation',
        description: 'Delete a conversation thread',
        tags: ['Conversations'],
        params: idParamSchema,
        response: {
          200: createApiResponseSchema(z.object({ id: z.string().uuid(), deleted: z.literal(true) })),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      return reply.send({
        success: true,
        data: { id, deleted: true },
      });
    },
  );
};
