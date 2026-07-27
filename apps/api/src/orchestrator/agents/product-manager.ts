import type { IAgent, AgentExecutionResult } from '../agent-interface';
import type { SharedContext } from '../context';

export class ProductManagerAgent implements IAgent {
  public readonly agentType = 'PRODUCT_MANAGER' as const;
  public readonly roleName = 'Product Manager Agent';

  public async execute(
    context: SharedContext,
    emitEvent: (message: string, eventType?: 'LOG' | 'STEP' | 'ARTIFACT', payload?: Record<string, unknown>) => void,
  ): Promise<AgentExecutionResult> {
    emitEvent('Analyzing project request and user specifications...', 'STEP');
    emitEvent(`Decomposing requirements for "${context.title}" into Epics & user stories...`, 'LOG');

    const prdContent = `# Product Requirement Document (PRD) — ${context.title}

## Project Overview
${context.description}

## Target Objectives & Functional Scope
- **Core Architecture**: High-performance monorepo with API, Web, and Agent Runtime.
- **Agent Orchestration**: Event-driven state machine resolving artifact dependencies.
- **Production Delivery**: Verified TypeScript compilation, linting, testing, and Docker containerization.
`;

    const tasksJsonContent = JSON.stringify(
      {
        project: context.title,
        version: '1.0.0',
        epics: [
          {
            id: 'EPIC-1',
            title: 'Core System Infrastructure & APIs',
            tasks: [
              { id: 'TASK-101', title: 'Database Schema & Prisma Migrations', assignedTo: 'BACKEND', priority: 'HIGH' },
              { id: 'TASK-102', title: 'REST API & Fastify Controller Handlers', assignedTo: 'BACKEND', priority: 'HIGH' },
              { id: 'TASK-103', title: 'Redis Working Memory & BullMQ Queue Integration', assignedTo: 'BACKEND', priority: 'MEDIUM' },
            ],
          },
          {
            id: 'EPIC-2',
            title: 'Agent Orchestration Engine',
            tasks: [
              { id: 'TASK-201', title: 'Autonomous State Machine & Event Dispatcher', assignedTo: 'AGENT-LEAD', priority: 'HIGH' },
              { id: 'TASK-202', title: 'Specialized Agent Interfaces & Tool Contracts', assignedTo: 'AGENT-LEAD', priority: 'HIGH' },
              { id: 'TASK-203', title: 'Sandboxed Container Execution Environment', assignedTo: 'DEVOPS', priority: 'HIGH' },
            ],
          },
          {
            id: 'EPIC-3',
            title: 'User Interface & Real-time Console',
            tasks: [
              { id: 'TASK-301', title: 'Next.js App Router Dashboard & Project Views', assignedTo: 'FRONTEND', priority: 'HIGH' },
              { id: 'TASK-302', title: 'Real-time WebSocket Streaming Terminal & Event Log', assignedTo: 'FRONTEND', priority: 'MEDIUM' },
            ],
          },
        ],
      },
      null,
      2,
    );

    context.set('prdSpec', prdContent);
    context.set('tasksSpec', tasksJsonContent);
    emitEvent('Generated PRD.md product requirement document artifact', 'ARTIFACT', { filename: 'PRD.md' });
    emitEvent('Generated Tasks.json specification artifact', 'ARTIFACT', { filename: 'Tasks.json' });

    return {
      agentType: this.agentType,
      summary: 'Decomposed project specifications into PRD.md and Tasks.json (3 Epics, 8 Engineering Tasks).',
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
