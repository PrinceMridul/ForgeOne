import type { AgentType } from '@forgeone/types';
import type { SharedContext } from './context';

export interface AgentExecutionResult {
  agentType: AgentType;
  summary: string;
  artifacts?: Array<{
    filename: string;
    mimeType: string;
    content: string;
    /**
     * True when this artifact is a file inside the generated repository, i.e.
     * it is one of the entries in Repository.zip. False (the default) marks a
     * pipeline document such as PRD.md or SecurityAudit.md, which is produced
     * *about* the project rather than being part of it.
     *
     * The console relies on this to keep "repository files" and "pipeline
     * artifacts" as separate, non-overlapping counts.
     */
    inRepository?: boolean;
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
