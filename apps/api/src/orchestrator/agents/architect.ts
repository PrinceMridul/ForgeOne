import type { IAgent, AgentExecutionResult } from '../agent-interface';
import type { SharedContext } from '../context';
import { ProviderRegistry } from '../../providers';

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

    const fallbackArchitectureContent = `# System Architecture Blueprint — ${context.title}

## System Topology & Monorepo Structure

ForgeOne is built as a microservices-capable monorepo managed via Turborepo & pnpm workspaces:

\`\`\`
forgeone/
├── apps/
│   ├── web/              # Next.js 15 App Router Frontend (:3000)
│   ├── api/              # Fastify 5 High-Performance API Server (:4000)
│   └── agent-runtime/    # Python 3.12 FastAPI Agent System (:8000)
├── packages/
│   ├── config/           # Shared TypeScript & ESLint configurations
│   ├── database/         # Prisma ORM & PostgreSQL schema
│   ├── types/            # Shared DTOs and WebSocket event types
│   └── logger/           # Structured Pino logger
└── infra/                # Docker Compose & Deployment manifests
\`\`\`

## Technology Stack Selection

- **Frontend**: Next.js 15, React 19, Tailwind CSS v4, Lucide Icons, Zustand state management.
- **API Engine**: Fastify v5 with \`fastify-type-provider-zod\`, Zod runtime validation, OpenAPI 3.0 via Swagger UI.
- **Agent Runtime**: Python 3.12+, FastAPI, LangGraph state machine, MCP-compatible tool bindings.
- **Data & Storage**: PostgreSQL 16 (Relational DB), Redis 7 (Cache & BullMQ), Qdrant (Vector DB for semantic search), MinIO (S3 Artifact Storage).

## Data Flow & Event Driven Architecture

1. Client submits run prompt to \`POST /api/v1/runs\`.
2. Fastify API boots the \`OrchestratorEngine\` pipeline and assigns execution stages.
3. Agents execute tasks sequentially/parallelly, mutating \`SharedContext\`.
4. Streaming events (\`LOG\`, \`STEP\`, \`ARTIFACT\`) emit real-time telemetry over WebSockets to client UI.
5. Produced artifacts are persisted in S3/MinIO artifact storage.
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
