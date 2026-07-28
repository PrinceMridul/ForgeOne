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

    emitEvent(
      `Deriving topology for ${blueprint.entities.length} resources and ${blueprint.capabilities.length} cross-cutting concerns.`,
      'LOG',
    );

    const capabilityRows = blueprint.capabilities.length
      ? blueprint.capabilities.map((c) => `| ${c.label} | ${c.implication} |`).join('\n')
      : '| — | No cross-cutting subsystems detected. |';

    const routeTree = blueprint.entities
      .map((e) => `│   ├── routes/${e.plural}.ts     # ${e.pascal} handlers + Zod schema`)
      .join('\n');

    const tableList = blueprint.entities
      .map(
        (e) =>
          `- **${e.plural}** — \`id uuid pk\`, ${e.fields.map((f) => `\`${f.name} ${f.type}\``).join(', ')}, \`created_at timestamptz\``,
      )
      .join('\n');

    const fallbackArchitectureContent = `# System Architecture Blueprint — ${blueprint.displayName}

${blueprint.summary}

## Service Topology

A single deployable Node service fronted by Fastify, backed by PostgreSQL.
Kept deliberately modular so any resource can be extracted into its own
service later without changing its public contract.

\`\`\`
${blueprint.name}/
├── src/
│   ├── index.ts          # Fastify bootstrap, health probe, route registration
${routeTree}
│   └── db/schema.sql     # Relational schema
├── tests/                # Route-level integration tests
└── Dockerfile            # Multi-stage build with a health check
\`\`\`

## Data Model

${tableList}

## Cross-cutting Concerns

| Concern | Approach |
|---|---|
${capabilityRows}

## Technology Selection

- **HTTP**: Fastify 5 — lowest-overhead Node router with first-class schema hooks.
- **Validation**: Zod at the edge; request shapes and persisted types share one definition.
- **Storage**: PostgreSQL 16 — the resource set is relational and benefits from real constraints.
${blueprint.capabilities.map((c) => `- **${c.label}**: ${c.implication}.`).join('\n')}

## Request Flow

1. Client calls \`/api/<resource>\`.
2. Zod validates the payload; failures short-circuit with a 400 and an issue list.
3. The handler reads or writes PostgreSQL within a single transaction.
4. The response is serialized from the same schema used for validation.
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
