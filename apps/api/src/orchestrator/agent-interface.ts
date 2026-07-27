import type { AgentType } from '@forgeone/types';
import type { SharedContext } from './context';

export interface AgentExecutionResult {
  agentType: AgentType;
  summary: string;
  artifacts?: Array<{
    filename: string;
    mimeType: string;
    content: string;
  }>;
  metadata?: Record<string, unknown>;
}

export interface IAgent {
  readonly agentType: AgentType;
  readonly roleName: string;
  execute(
    context: SharedContext,
    emitEvent: (message: string, eventType?: 'LOG' | 'STEP' | 'ARTIFACT', payload?: Record<string, unknown>) => void,
  ): Promise<AgentExecutionResult>;
}
