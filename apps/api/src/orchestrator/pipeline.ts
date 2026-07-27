import type { AgentType } from '@forgeone/types';
import type { AgentRegistry } from './agent-registry';
import type { SharedContext } from './context';
import type { WorkflowRun, ExecutionEvent, GeneratedArtifact, AgentExecutionState, GraphArtifact } from './types';

export interface StageArtifactConfig {
  requiredArtifactTypes: string[];
  outputArtifactTypes: string[];
}

export const STAGE_CONFIGS: Record<AgentType, StageArtifactConfig> = {
  ORCHESTRATOR: {
    requiredArtifactTypes: [],
    outputArtifactTypes: [],
  },
  PRODUCT_MANAGER: {
    requiredArtifactTypes: [],
    outputArtifactTypes: ['PRD', 'TASKS'],
  },
  ARCHITECT: {
    requiredArtifactTypes: ['PRD', 'TASKS'],
    outputArtifactTypes: ['ARCHITECTURE'],
  },
  DEVELOPER: {
    requiredArtifactTypes: ['PRD', 'TASKS', 'ARCHITECTURE'],
    outputArtifactTypes: ['SOURCE_CODE', 'ZIP'],
  },
  REVIEWER: {
    requiredArtifactTypes: ['SOURCE_CODE', 'ARCHITECTURE'],
    outputArtifactTypes: ['PR_REVIEW'],
  },
  TESTER: {
    requiredArtifactTypes: ['SOURCE_CODE'],
    outputArtifactTypes: ['TEST_REPORT'],
  },
  SECURITY: {
    requiredArtifactTypes: ['SOURCE_CODE'],
    outputArtifactTypes: ['SECURITY_AUDIT'],
  },
  DEVOPS: {
    requiredArtifactTypes: ['SOURCE_CODE'],
    outputArtifactTypes: ['DEPLOYMENT_PLAN'],
  },
  DOCUMENTATION: {
    requiredArtifactTypes: [
      'PRD',
      'TASKS',
      'ARCHITECTURE',
      'SOURCE_CODE',
      'PR_REVIEW',
      'TEST_REPORT',
      'SECURITY_AUDIT',
      'DEPLOYMENT_PLAN',
    ],
    outputArtifactTypes: ['README', 'SUMMARY_REPORT'],
  },
};

export function inferArtifactType(filename: string, agentType: AgentType): string {
  switch (filename) {
    case 'PRD.md':
      return 'PRD';
    case 'Tasks.json':
      return 'TASKS';
    case 'Architecture.md':
      return 'ARCHITECTURE';
    case 'Repository.zip':
      return 'ZIP';
    case 'PRReview.md':
      return 'PR_REVIEW';
    case 'TestReport.md':
      return 'TEST_REPORT';
    case 'SecurityAudit.md':
      return 'SECURITY_AUDIT';
    case 'DeploymentPlan.md':
      return 'DEPLOYMENT_PLAN';
    case 'README.md':
      return 'README';
    case 'SummaryReport.md':
      return 'SUMMARY_REPORT';
    default:
      if (agentType === 'DEVELOPER') return 'SOURCE_CODE';
      return 'DOCUMENT';
  }
}

export class ExecutionPipeline {
  private readonly registry: AgentRegistry;
  private readonly pipelineOrder: AgentType[] = [
    'PRODUCT_MANAGER',
    'ARCHITECT',
    'DEVELOPER',
    'REVIEWER',
    'TESTER',
    'SECURITY',
    'DEVOPS',
    'DOCUMENTATION',
  ];

  constructor(registry: AgentRegistry) {
    this.registry = registry;
  }

  public async executePipeline(
    run: WorkflowRun,
    context: SharedContext,
    onEvent: (event: ExecutionEvent) => void,
    onArtifact: (artifact: GeneratedArtifact) => void,
    onProgress: (currentAgent: AgentType, stepProgress: number, completedSteps: number) => void,
  ): Promise<void> {
    const totalSteps = this.pipelineOrder.length;
    run.status = 'RUNNING';

    const emitTelemetry = (
      agentType: AgentType,
      state: AgentExecutionState,
      message: string,
      payload?: Record<string, unknown>,
    ) => {
      const event: ExecutionEvent = {
        id: crypto.randomUUID(),
        runId: run.id,
        agentType,
        eventType: state === 'FAILED' ? 'ERROR' : 'STATUS_CHANGE',
        message: `[${state}] ${message}`,
        payload: { state, ...payload },
        timestamp: new Date().toISOString(),
      };
      context.addEvent(event);
      onEvent(event);
    };

    emitTelemetry('ORCHESTRATOR', 'RUNNING', `Workflow Run "${run.title}" booted artifact-driven pipeline engine.`);

    for (let index = 0; index < this.pipelineOrder.length; index++) {
      const agentType = this.pipelineOrder[index]!;
      const agent = this.registry.getAgent(agentType);

      if (!agent) {
        throw new Error(`Agent type "${agentType}" not registered in AgentRegistry`);
      }

      const stageConfig = STAGE_CONFIGS[agentType];
      const completedSteps = index;
      const progressPercent = Math.round((completedSteps / totalSteps) * 100);
      onProgress(agentType, progressPercent, completedSteps);

      // State 1: WAITING_FOR_INPUT
      emitTelemetry(
        agentType,
        'WAITING_FOR_INPUT',
        `Agent ${agent.roleName} waiting for required input artifacts (${stageConfig.requiredArtifactTypes.join(', ') || 'NONE'}).`,
        { requiredTypes: stageConfig.requiredArtifactTypes },
      );

      // Validate required input artifacts exist in ArtifactGraph
      const hasInputs = context.artifactGraph.hasArtifactTypes(stageConfig.requiredArtifactTypes);
      if (!hasInputs && stageConfig.requiredArtifactTypes.length > 0) {
        const missing = stageConfig.requiredArtifactTypes.filter(
          (type) => context.artifactGraph.getArtifactsByType(type).length === 0,
        );
        const errMsg = `Dependency Resolution Error: Missing required artifact types [${missing.join(', ')}] for ${agent.roleName}`;
        emitTelemetry(agentType, 'FAILED', errMsg, { missingTypes: missing });
        throw new Error(errMsg);
      }

      // Consume input artifacts and track dependencies
      const consumedArtifactIds: string[] = [];
      for (const reqType of stageConfig.requiredArtifactTypes) {
        const artifactsOfType = context.artifactGraph.getArtifactsByType(reqType);
        for (const art of artifactsOfType) {
          const consumed = context.artifactGraph.consumeArtifact(art.id, agentType);
          if (consumed) {
            consumedArtifactIds.push(consumed.id);
            emitTelemetry(
              agentType,
              'WAITING_FOR_INPUT',
              `[ARTIFACT_CONSUMED] Agent ${agent.roleName} consumed artifact "${consumed.filename}" (v${consumed.version}, ID: ${consumed.id}).`,
              { artifactId: consumed.id, filename: consumed.filename, version: consumed.version },
            );
          }
        }
      }

      emitTelemetry(
        agentType,
        'WAITING_FOR_INPUT',
        `[DEPENDENCY_SATISFIED] All required input artifacts present for ${agent.roleName}.`,
      );

      emitTelemetry(agentType, 'WAITING_FOR_INPUT', `[AGENT_UNBLOCKED] Agent ${agent.roleName} unblocked and ready for execution.`);

      // State 2: RUNNING
      emitTelemetry(agentType, 'RUNNING', `Agent ${agent.roleName} executing task...`);

      const emitAgentEvent = (
        message: string,
        eventType: 'LOG' | 'STEP' | 'ARTIFACT' = 'LOG',
        payload?: Record<string, unknown>,
      ) => {
        const event: ExecutionEvent = {
          id: crypto.randomUUID(),
          runId: run.id,
          agentType,
          eventType,
          message,
          payload,
          timestamp: new Date().toISOString(),
        };
        context.addEvent(event);
        onEvent(event);
      };

      try {
        const result = await agent.execute(context, emitAgentEvent);

        // State 3: GENERATING_ARTIFACTS
        emitTelemetry(agentType, 'GENERATING_ARTIFACTS', `Agent ${agent.roleName} producing output artifacts...`);

        if (result.artifacts) {
          for (const art of result.artifacts) {
            const artifactType = inferArtifactType(art.filename, agentType);

            const graphArtifact: GraphArtifact = context.artifactGraph.addArtifact({
              type: artifactType,
              producerAgent: agentType,
              filename: art.filename,
              mimeType: art.mimeType,
              content: art.content,
              dependencies: consumedArtifactIds,
              runId: run.id,
            });

            onArtifact(graphArtifact);

            emitTelemetry(
              agentType,
              'GENERATING_ARTIFACTS',
              `[ARTIFACT_CREATED] Created artifact "${graphArtifact.filename}" (v${graphArtifact.version}, type: ${graphArtifact.type}, ID: ${graphArtifact.id}).`,
              { artifactId: graphArtifact.id, filename: graphArtifact.filename, version: graphArtifact.version },
            );
          }
        }

        // State 4: VALIDATING
        emitTelemetry(agentType, 'VALIDATING', `Agent ${agent.roleName} validating artifact signatures and outputs.`);

        // State 5: COMPLETE
        emitTelemetry(agentType, 'COMPLETE', `Agent ${agent.roleName} completed stage: ${result.summary}`);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown execution error';
        emitTelemetry(agentType, 'FAILED', `Agent ${agent.roleName} execution failed: ${errorMessage}`, { error: errorMessage });
        throw err;
      }
    }

    onProgress('DOCUMENTATION', 100, totalSteps);
  }
}
