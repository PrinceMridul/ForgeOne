import type { IAgent, AgentExecutionResult } from '../agent-interface';
import type { SharedContext } from '../context';
import { deriveBlueprint } from '../blueprint';

export class ProductManagerAgent implements IAgent {
  public readonly agentType = 'PRODUCT_MANAGER' as const;
  public readonly roleName = 'Product Manager Agent';

  public async execute(
    context: SharedContext,
    emitEvent: (message: string, eventType?: 'LOG' | 'STEP' | 'ARTIFACT', payload?: Record<string, unknown>) => void,
  ): Promise<AgentExecutionResult> {
    emitEvent('Analyzing project request and user specifications...', 'STEP');

    // Derive the shared project model once, here at the head of the pipeline.
    // Every downstream agent reads it from SharedContext so the PRD, the
    // architecture and the generated code all describe the same system.
    const blueprint = deriveBlueprint(context.title, context.description);
    context.set('blueprint', blueprint);

    emitEvent(
      `Decomposing "${context.title}" — identified ${blueprint.entities.length} core resources (${blueprint.entities.map((e) => e.plural).join(', ')}).`,
      'LOG',
    );
    if (blueprint.capabilities.length > 0) {
      emitEvent(
        `Detected cross-cutting capabilities: ${blueprint.capabilities.map((c) => c.label).join(', ')}.`,
        'LOG',
      );
    }

    const capabilitySection = blueprint.capabilities.length
      ? blueprint.capabilities.map((c) => `- **${c.label}** — ${c.implication}`).join('\n')
      : '- No cross-cutting subsystems detected; scope is straightforward resource CRUD.';

    const prdContent = `# Product Requirement Document (PRD) — ${blueprint.displayName}

## Project Overview
${context.description}

## Core Resources
${blueprint.entities.map((e) => `- **${e.pascal}** (\`${e.plural}\`) — fields: ${e.fields.map((f) => `\`${f.name}\``).join(', ')}`).join('\n')}

## Cross-cutting Capabilities
${capabilitySection}

## Acceptance Criteria
- Every resource exposes list, read, create and delete endpoints with schema validation.
- Invalid payloads are rejected with a 400 and a machine-readable issue list.
- The service reports liveness on \`GET /health\`.
- The repository builds, type-checks, lints and passes its test suite cleanly.
`;

    const epics = [
      {
        id: 'EPIC-1',
        title: `${blueprint.displayName} data model & persistence`,
        tasks: blueprint.entities.map((entity, i) => ({
          id: `TASK-1${String(i + 1).padStart(2, '0')}`,
          title: `Model and migrate the ${entity.plural} table`,
          assignedTo: 'BACKEND',
          priority: i === 0 ? 'HIGH' : 'MEDIUM',
        })),
      },
      {
        id: 'EPIC-2',
        title: 'HTTP API surface',
        tasks: blueprint.entities.map((entity, i) => ({
          id: `TASK-2${String(i + 1).padStart(2, '0')}`,
          title: `Implement /api/${entity.plural} handlers with Zod validation`,
          assignedTo: 'BACKEND',
          priority: 'HIGH',
        })),
      },
      {
        id: 'EPIC-3',
        title: 'Cross-cutting capabilities',
        tasks:
          blueprint.capabilities.length > 0
            ? blueprint.capabilities.map((cap, i) => ({
                id: `TASK-3${String(i + 1).padStart(2, '0')}`,
                title: `${cap.label}: ${cap.implication}`,
                assignedTo: cap.id === 'realtime' ? 'BACKEND' : 'PLATFORM',
                priority: 'HIGH',
              }))
            : [
                {
                  id: 'TASK-301',
                  title: 'Containerize the service and wire a health probe',
                  assignedTo: 'DEVOPS',
                  priority: 'MEDIUM',
                },
              ],
      },
    ];

    const taskCount = epics.reduce((n, e) => n + e.tasks.length, 0);

    const tasksJsonContent = JSON.stringify(
      { project: blueprint.name, version: '1.0.0', epics },
      null,
      2,
    );

    context.set('prdSpec', prdContent);
    context.set('tasksSpec', tasksJsonContent);
    emitEvent('Generated PRD.md product requirement document artifact', 'ARTIFACT', { filename: 'PRD.md' });
    emitEvent('Generated Tasks.json specification artifact', 'ARTIFACT', { filename: 'Tasks.json' });

    return {
      agentType: this.agentType,
      summary: `Decomposed "${blueprint.displayName}" into PRD.md and Tasks.json (${epics.length} Epics, ${taskCount} Engineering Tasks).`,
      artifacts: [
        {
          filename: 'PRD.md',
          mimeType: 'text/markdown',
          content: prdContent,
        },
        {
          filename: 'Tasks.json',
          mimeType: 'application/json',
          content: tasksJsonContent,
        },
      ],
    };
  }
}
