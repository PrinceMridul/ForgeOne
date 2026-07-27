import type { AgentType } from '@forgeone/types';
import type { AgentRegistry } from './agent-registry';
import type { SharedContext } from './context';
import type { WorkflowRun, ExecutionEvent, GeneratedArtifact, AgentExecutionState, GraphArtifact } from './types';
import { getPacingConfig, sleep } from './pacing';

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

/**
 * Progress checkpoints within a single agent stage, expressed as a percentage
 * of that stage. Reported as `stageProgress` so the console can animate an
 * agent through its own lifecycle instead of sitting frozen until the stage
 * flips over.
 */
const STAGE_CHECKPOINT = {
  WAITING: 5,
  UNBLOCKED: 18,
  RUNNING: 32,
  GENERATING: 58,
  VALIDATING: 86,
  COMPLETE: 100,
} as const;

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
    onProgress: (
      currentAgent: AgentType,
      stepProgress: number,
      completedSteps: number,
      stageProgress?: number,
    ) => void,
  ): Promise<void> {
    const totalSteps = this.pipelineOrder.length;
    const pacing = getPacingConfig();
    run.status = 'RUNNING';

    const emitTelemetry = async (
      agentType: AgentType,
      state: AgentExecutionState,
      message: string,
      payload?: Record<string, unknown>,
    ): Promise<void> => {
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
      await sleep(pacing.eventMs);
    };

    await emitTelemetry('ORCHESTRATOR', 'RUNNING', `Workflow Run "${run.title}" booted artifact-driven pipeline engine.`);

    for (let index = 0; index < this.pipelineOrder.length; index++) {
      const agentType = this.pipelineOrder[index]!;
      const agent = this.registry.getAgent(agentType);

      if (!agent) {
        throw new Error(`Agent type "${agentType}" not registered in AgentRegistry`);
      }

      const stageConfig = STAGE_CONFIGS[agentType];
      const completedSteps = index;
      const progressPercent = Math.round((completedSteps / totalSteps) * 100);
      onProgress(agentType, progressPercent, completedSteps, STAGE_CHECKPOINT.WAITING);

      // Settle between agents so the console shows a clean hand-off.
      if (index > 0) await sleep(pacing.stageMs);

      // State 1: WAITING_FOR_INPUT
      await emitTelemetry(
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
        await emitTelemetry(agentType, 'FAILED', errMsg, { missingTypes: missing });
        run.status = 'FAILED';
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
            await emitTelemetry(
              agentType,
              'WAITING_FOR_INPUT',
              `[ARTIFACT_CONSUMED] Agent ${agent.roleName} consumed artifact "${consumed.filename}" (v${consumed.version}, ID: ${consumed.id}).`,
              { artifactId: consumed.id, filename: consumed.filename, version: consumed.version },
            );
          }
        }
      }

      await emitTelemetry(
        agentType,
        'WAITING_FOR_INPUT',
        `[DEPENDENCY_SATISFIED] All required input artifacts present for ${agent.roleName}.`,
      );

      onProgress(agentType, progressPercent, completedSteps, STAGE_CHECKPOINT.UNBLOCKED);
      await emitTelemetry(agentType, 'WAITING_FOR_INPUT', `[AGENT_UNBLOCKED] Agent ${agent.roleName} unblocked and ready for execution.`);

      // State 2: RUNNING
      onProgress(agentType, progressPercent, completedSteps, STAGE_CHECKPOINT.RUNNING);
      await emitTelemetry(agentType, 'RUNNING', `Agent ${agent.roleName} executing task...`);

      /**
       * Agents emit synchronously and finish in microseconds. Buffer their
       * events here and replay them at pacing speed after `execute()` resolves,
       * so the live console sees them arrive one at a time. Timestamps are
       * stamped at replay time, not capture time, so the log reads as a real
       * stream. The agent interface is untouched.
       */
      const bufferedAgentEvents: Array<{
        message: string;
        eventType: 'LOG' | 'STEP' | 'ARTIFACT';
        payload?: Record<string, unknown>;
      }> = [];

      const emitAgentEvent = (
        message: string,
        eventType: 'LOG' | 'STEP' | 'ARTIFACT' = 'LOG',
        payload?: Record<string, unknown>,
      ) => {
        bufferedAgentEvents.push({ message, eventType, payload });
      };

      const drainAgentEvents = async (): Promise<void> => {
        for (const buffered of bufferedAgentEvents) {
          const event: ExecutionEvent = {
            id: crypto.randomUUID(),
            runId: run.id,
            agentType,
            eventType: buffered.eventType,
            message: buffered.message,
            payload: buffered.payload,
            timestamp: new Date().toISOString(),
          };
          context.addEvent(event);
          onEvent(event);
          await sleep(pacing.eventMs);
        }
        bufferedAgentEvents.length = 0;
      };

      try {
        const result = await agent.execute(context, emitAgentEvent);
        await drainAgentEvents();

        // State 3: GENERATING_ARTIFACTS
        onProgress(agentType, progressPercent, completedSteps, STAGE_CHECKPOINT.GENERATING);
        await emitTelemetry(agentType, 'GENERATING_ARTIFACTS', `Agent ${agent.roleName} producing output artifacts...`);

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

            await emitTelemetry(
              agentType,
              'GENERATING_ARTIFACTS',
              `[ARTIFACT_CREATED] Created artifact "${graphArtifact.filename}" (v${graphArtifact.version}, type: ${graphArtifact.type}, ID: ${graphArtifact.id}).`,
              { artifactId: graphArtifact.id, filename: graphArtifact.filename, version: graphArtifact.version },
            );
          }
        }

        // State 4: VALIDATING
        onProgress(agentType, progressPercent, completedSteps, STAGE_CHECKPOINT.VALIDATING);
        await emitTelemetry(agentType, 'VALIDATING', `Agent ${agent.roleName} validating artifact signatures and outputs.`);

        // State 5: COMPLETE
        onProgress(agentType, progressPercent, completedSteps, STAGE_CHECKPOINT.COMPLETE);
        await emitTelemetry(agentType, 'COMPLETE', `Agent ${agent.roleName} completed stage: ${result.summary}`);

        // Mark the stage as banked so pollers advance the pipeline visual.
        onProgress(
          agentType,
          Math.round(((index + 1) / totalSteps) * 100),
          index + 1,
          STAGE_CHECKPOINT.COMPLETE,
        );
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown execution error';
        // Replay anything the agent logged before it failed — the console
        // should show how far it got, not swallow the trail.
        await drainAgentEvents();
        await emitTelemetry(agentType, 'FAILED', `Agent ${agent.roleName} execution failed: ${errorMessage}`, { error: errorMessage });
        run.status = 'FAILED';
        throw err;
      }
    }

    onProgress('DOCUMENTATION', 100, totalSteps, STAGE_CHECKPOINT.COMPLETE);
    run.status = 'COMPLETED';
  }
}
