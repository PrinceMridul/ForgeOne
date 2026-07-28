import type { IAgent, AgentExecutionResult } from '../agent-interface';
import type { SharedContext } from '../context';
import type { GeneratedFile } from '../file-parser';
import { deriveBlueprint } from '../blueprint';

export class DevOpsAgent implements IAgent {
  public readonly agentType = 'DEVOPS' as const;
  public readonly roleName = 'DevOps Agent';

  public async execute(
    context: SharedContext,
    emitEvent: (message: string, eventType?: 'LOG' | 'STEP' | 'ARTIFACT', payload?: Record<string, unknown>) => void,
  ): Promise<AgentExecutionResult> {
    const blueprint = context.get<ReturnType<typeof deriveBlueprint>>('blueprint')
      ?? deriveBlueprint(context.title, context.description);
    const files = context.get<GeneratedFile[]>('generatedFiles') ?? [];
    const hasDockerfile = files.some((f) => f.path === 'Dockerfile');

    emitEvent('Planning the deployment topology for the generated service...', 'STEP');

    // Backing services are only listed when something in the blueprint needs
    // them, rather than reciting a fixed stack.
    const services: Array<{ name: string; image: string; why: string }> = [
      {
        name: 'api',
        image: `${blueprint.name}:latest`,
        why: `The service itself — ${blueprint.entities.length} resource route(s) plus /health.`,
      },
      {
        name: 'postgres',
        image: 'postgres:16-alpine',
        why: 'Backs src/db/schema.sql; the generated tables live here.',
      },
    ];
    if (blueprint.capabilities.some((c) => c.id === 'notifications')) {
      services.push({ name: 'redis', image: 'redis:7-alpine', why: 'Queue backend for notification delivery and retries.' });
    }
    if (blueprint.capabilities.some((c) => c.id === 'storage')) {
      services.push({ name: 'minio', image: 'minio/minio', why: 'S3-compatible object storage for uploaded media.' });
    }
    if (blueprint.capabilities.some((c) => c.id === 'ai')) {
      services.push({ name: 'qdrant', image: 'qdrant/qdrant', why: 'Vector index for semantic recall.' });
    }

    emitEvent(`Composing ${services.length} service(s): ${services.map((s) => s.name).join(', ')}.`, 'LOG');
    emitEvent(
      hasDockerfile
        ? 'Using the multi-stage Dockerfile emitted by the Developer stage.'
        : 'No Dockerfile was emitted; the plan assumes one is added before rollout.',
      'LOG',
    );

    const deploymentPlanContent = `# Deployment Plan — ${blueprint.displayName}

## Container Image

${
  hasDockerfile
    ? 'Built from the generated multi-stage `Dockerfile`: dependencies and TypeScript build happen in a `node:22-alpine` build stage, and only `dist/` plus production `node_modules` are copied into the runtime stage.'
    : 'A multi-stage Dockerfile still needs to be added before this can ship.'
}

- **Exposed port**: 4000
- **Health probe**: \`GET /health\` — also used as the container \`HEALTHCHECK\`.

## Compose Topology

| Service | Image | Purpose |
|---|---|---|
${services.map((s) => `| \`${s.name}\` | \`${s.image}\` | ${s.why} |`).join('\n')}

## Environment

| Variable | Purpose |
|---|---|
| \`PORT\` | HTTP listen port (defaults to 4000) |
| \`DATABASE_URL\` | PostgreSQL connection string |
${blueprint.capabilities
  .map((c) => {
    if (c.id === 'billing') return '| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Payment processing and webhook verification |';
    if (c.id === 'storage') return '| `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` | Object storage |';
    if (c.id === 'notifications') return '| `REDIS_URL` | Queue backend |';
    if (c.id === 'ai') return '| `ANTHROPIC_API_KEY` | Model access |';
    if (c.id === 'auth') return '| `JWT_SECRET` | Session signing |';
    return null;
  })
  .filter(Boolean)
  .join('\n')}

## Rollout

1. \`npm run build\` — fail the pipeline on any TypeScript error.
2. \`npm test\` — the generated specs must pass.
3. Build and tag the image.
4. Apply \`src/db/schema.sql\` before the new revision takes traffic; the
   statements are \`create table if not exists\`, so re-applying is safe.
5. Roll out one replica, wait for \`/health\` to report \`200\`, then shift traffic.
6. Roll back by re-pointing to the previous image tag — the schema changes are
   additive and do not need reversing.

## Before Production

- State currently lives in process memory; point the handlers at PostgreSQL
  first, otherwise replicas will not agree with each other.
`;

    emitEvent('Generated DeploymentPlan.md deployment plan artifact', 'ARTIFACT', { filename: 'DeploymentPlan.md' });

    return {
      agentType: this.agentType,
      summary: `Planned a ${services.length}-service rollout for ${blueprint.name} with a /health gate and additive schema migration.`,
      artifacts: [
        {
          filename: 'DeploymentPlan.md',
          mimeType: 'text/markdown',
          content: deploymentPlanContent,
        },
      ],
    };
  }
}
