import type { FastifyPluginAsync } from 'fastify';
import { projectRoutes, repositoryRoutes } from './projects';
import { taskRoutes } from './tasks';
import { agentRunRoutes, agentStatusRoutes } from './agent-runs';
import { artifactRoutes } from './artifacts';
import { conversationRoutes } from './conversations';
import { runRoutes } from './runs';
import { demoRoutes } from '../demo';

export const v1Routes: FastifyPluginAsync = async (app) => {
  await app.register(demoRoutes, { prefix: '/demo' });
  await app.register(runRoutes, { prefix: '/runs' });
  await app.register(projectRoutes, { prefix: '/projects' });
  await app.register(repositoryRoutes, { prefix: '/repositories' });
  await app.register(taskRoutes, { prefix: '/tasks' });
  await app.register(agentRunRoutes, { prefix: '/agent-runs' });
  await app.register(agentStatusRoutes, { prefix: '/agents' });
  await app.register(artifactRoutes, { prefix: '/artifacts' });
  await app.register(conversationRoutes, { prefix: '/conversations' });

  app.get('/', async () => ({
    api: 'ForgeOne API',
    version: 'v1',
    status: 'operational',
    docs: '/docs',
    endpoints: [
      '/demo/start',
      '/demo/events',
      '/demo/artifacts',
      '/demo/replay',
      '/api/v1/runs',
      '/api/v1/projects',
      '/api/v1/repositories',
      '/api/v1/tasks',
      '/api/v1/agent-runs',
      '/api/v1/agents/status',
      '/api/v1/artifacts',
      '/api/v1/conversations',
    ],
  }));
};
