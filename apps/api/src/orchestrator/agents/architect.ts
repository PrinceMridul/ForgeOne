import type { IAgent, AgentExecutionResult } from '../agent-interface';
import type { SharedContext } from '../context';
import { ProviderRegistry } from '../../providers';
import { deriveBlueprint } from '../blueprint';

export class ArchitectAgent implements IAgent {
  public readonly agentType = 'ARCHITECT' as const;
  public readonly roleName = 'Architect Agent';

  public async execute(
    context: SharedContext,
    emitEvent: (message: string, eventType?: 'LOG' | 'STEP' | 'ARTIFACT', payload?: Record<string, unknown>) => void,
  ): Promise<AgentExecutionResult> {
    emitEvent('Evaluating system requirements and non-functional requirements...', 'STEP');

    const prdArtifact = context.getArtifactByName('PRD.md');
    const tasksArtifact = context.getArtifactByName('Tasks.json');

    const prdContent = prdArtifact?.content ?? context.get<string>('prdSpec') ?? '';
    const tasksContent = tasksArtifact?.content ?? context.get<string>('tasksSpec') ?? '';

    emitEvent(`Consuming inputs: PRD.md (${prdContent.length} bytes), Tasks.json (${tasksContent.length} bytes)`, 'LOG');

    const provider = ProviderRegistry.getInstance().getDefaultProvider();
    emitEvent(`Selected LLM Provider: ${provider.providerName} (${provider.defaultModel})`, 'LOG');

    const blueprint = context.get<ReturnType<typeof deriveBlueprint>>('blueprint')
      ?? deriveBlueprint(context.title, context.description);

    const resourceCount = blueprint.entities.length;
    const concernCount = blueprint.capabilities.length;
    emitEvent(
      `Deriving topology for ${resourceCount} ${resourceCount === 1 ? 'resource' : 'resources'} and ${concernCount} cross-cutting ${concernCount === 1 ? 'concern' : 'concerns'}.`,
      'LOG',
    );

    const capabilityRows = blueprint.capabilities.length
      ? blueprint.capabilities.map((c) => `| ${c.label} | ${c.implication} |`).join('\n')
      : '| — | No cross-cutting subsystems were implied by the brief. |';

    const routeTree = blueprint.entities
      .map((e) => `│   ├── routes/${e.plural}.ts`.padEnd(34) + `# ${e.pascal} handlers + Zod schema`)
      .join('\n');

    const tableList = blueprint.entities
      .map((e) => {
        const cols = e.fields
          .map((f) => (f.references ? `\`${f.name}\` → ${f.references}` : `\`${f.name}\` ${f.type}`))
          .join(', ');
        return `- **${e.plural}** — \`id\` uuid pk, ${cols}, \`created_at\``;
      })
      .join('\n');

    // An entity-relationship sketch drawn from the inferred foreign keys.
    const erd = blueprint.relations.length
      ? blueprint.relations
          .map((r) => {
            const from = blueprint.entities.find((e) => e.name === r.from);
            const to = blueprint.entities.find((e) => e.name === r.to);
            return `  ${to?.plural} 1 ──── ∞ ${from?.plural}`;
          })
          .join('\n')
      : '  (no foreign keys inferred — resources are independent)';

    // External services are named only when a capability actually needs one.
    const externals: string[] = [];
    for (const cap of blueprint.capabilities) {
      if (cap.id === 'billing') externals.push('- **Stripe** — charges and webhook reconciliation against the local ledger.');
      if (cap.id === 'storage') externals.push('- **S3-compatible object store** — media bytes; the database holds only keys.');
      if (cap.id === 'notifications') externals.push('- **Redis** — queue backing delivery retries and idempotency keys.');
      if (cap.id === 'ai') externals.push('- **Model provider + vector index** — embeddings for semantic recall.');
      if (cap.id === 'search') externals.push('- **PostgreSQL full-text search** — no separate search cluster at this size.');
    }

    const aiSection = blueprint.capabilities.some((c) => c.id === 'ai')
      ? `\n## AI Components\n\nThe brief asks for behaviour that needs a model. Embeddings are computed on
write for the primary text column of each resource and stored alongside the
row; retrieval is a nearest-neighbour lookup filtered by the same tenant
scope as the rest of the API, so ranking can never leak across tenants.
Model calls sit behind one adapter so the provider can be swapped without
touching handler code.\n`
      : '';

    const fallbackArchitectureContent = `# System Architecture Blueprint — ${blueprint.displayName}

${blueprint.summary}
${blueprint.domain ? `\nDomain: **${blueprint.domain}**.\n` : ''}
## Core Entities

${tableList}

## Relationships

\`\`\`
${erd}
\`\`\`

${
  blueprint.relations.length > 0
    ? 'Foreign keys cascade on delete, so removing a parent removes its dependent rows in one statement rather than leaving orphans.'
    : 'No containment was inferred, so each resource is independently addressable.'
}

## Service Topology

A single deployable Node service fronted by Fastify, backed by PostgreSQL.
Deliberately modular: any resource can be extracted into its own service later
without changing its public contract.

\`\`\`
${blueprint.name}/
├── src/
│   ├── index.ts                 # Fastify bootstrap, health probe, route registration
│   ├── config.ts                # Env parsing; fails fast at boot
${routeTree}
│   └── db/
│       ├── client.ts            # Pooled Postgres access
│       └── schema.sql           # Tables, foreign keys, indexes
├── tests/                       # Request-contract specs per resource
└── Dockerfile                   # Multi-stage build with a health check
\`\`\`

## Data Flow

1. Client calls \`/api/<resource>\`; list endpoints accept \`limit\`/\`offset\`${
      blueprint.relations.length > 0 ? ' and a foreign-key filter' : ''
    }.
2. Zod validates the payload at the edge. Failures short-circuit with \`400\`
   and a machine-readable issue list, so nothing unvalidated reaches SQL.
3. The handler executes parameterised SQL through a pooled connection.
   Values are always bound, never interpolated.
4. The response is serialized from the same schema used for validation, so
   the request and response contracts cannot drift apart.
${
  blueprint.capabilities.some((c) => c.id === 'realtime')
    ? '5. Mutations additionally fan out over the `/realtime` WebSocket gateway to\n   subscribers of the affected room.\n'
    : ''
}
## Storage

- **PostgreSQL** — the resource set is relational and benefits from real
  foreign keys and constraints. \`gen_random_uuid()\` supplies primary keys.
- Indexes are created on every foreign key, because the list endpoints filter
  on exactly those columns.
${
  blueprint.capabilities.some((c) => c.id === 'search')
    ? '- A GIN index over a `tsvector` of the primary text column backs search.\n'
    : ''
}${
      blueprint.capabilities.some((c) => c.id === 'storage')
        ? '- Binary content lives in object storage; rows carry keys, not bytes.\n'
        : ''
    }
## External Services

${externals.length > 0 ? externals.join('\n') : '- None. The service depends only on its own database.'}
${aiSection}
## Cross-cutting Concerns

| Concern | Approach |
|---|---|
${capabilityRows}

## Deployment Topology

- One stateless container behind a load balancer; scale horizontally since no
  request state is held in process.
- \`GET /health\` verifies the database connection, so a replica that cannot
  reach Postgres never receives traffic.
- \`src/db/schema.sql\` is idempotent (\`create table if not exists\`), so it can
  be applied ahead of a rollout and re-applied safely.
`;

    let architectureMdContent = fallbackArchitectureContent;

    if (provider.isConfigured() && provider.providerType !== 'mock') {
      try {
        emitEvent(`Requesting Architecture.md generation from ${provider.providerName}...`, 'LOG');

        const prompt = `Generate a comprehensive System Architecture Blueprint document in Markdown format for the software project below.

Project Title: ${context.title}
Description: ${context.description}

PRD Content:
${prdContent.slice(0, 1000)}

Tasks Specification:
${tasksContent.slice(0, 1000)}

Please return full Architecture.md markdown with:
1. System Topology & Monorepo Structure
2. Technology Stack Selection
3. Data Flow & Event Driven Architecture
`;

        const response = await provider.generate(prompt, {
          systemPrompt: 'You are an Enterprise AI Systems Architect producing technical markdown documents.',
          temperature: 0.2,
          maxTokens: 4096,
        });

        if (response.text && response.text.trim().length > 50) {
          architectureMdContent = response.text.trim();
          emitEvent(`Received dynamic Architecture.md (${response.usage?.totalTokens ?? 0} tokens) from ${provider.providerName}`, 'LOG');
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown provider error';
        emitEvent(`LLM provider error (${errorMsg}). Falling back to baseline mock architecture template.`, 'LOG');
      }
    } else {
      emitEvent('No active LLM API key configured. Utilizing baseline mock architecture template.', 'LOG');
    }

    context.set('architectureSpec', architectureMdContent);
    emitEvent('Generated Architecture.md blueprint artifact', 'ARTIFACT', { filename: 'Architecture.md' });

    return {
      agentType: this.agentType,
      summary: `Designed architecture via ${provider.providerName}: generated Architecture.md blueprint.`,
      artifacts: [
        {
          filename: 'Architecture.md',
          mimeType: 'text/markdown',
          content: architectureMdContent,
        },
      ],
    };
  }
}
