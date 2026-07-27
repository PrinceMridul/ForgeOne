import type { AgentType } from '@forgeone/types';

export type RunStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export type AgentExecutionState =
  | 'WAITING_FOR_INPUT'
  | 'RUNNING'
  | 'GENERATING_ARTIFACTS'
  | 'VALIDATING'
  | 'COMPLETE'
  | 'FAILED';

export type EventType = 'LOG' | 'STEP' | 'ARTIFACT' | 'STATUS_CHANGE' | 'ERROR';

export interface ExecutionEvent {
  id: string;
  runId: string;
  agentType: AgentType;
  eventType: EventType;
  message: string;
  payload?: Record<string, unknown>;
  timestamp: string;
}

export interface GraphArtifact {
  id: string;
  type: string;
  producerAgent: AgentType;
  agentType: AgentType;
  createdAt: string;
  version: number;
  dependencies: string[];
  consumers: AgentType[];
  downloadUrl: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  content: string;
  runId: string;
  storageKey: string;
}

export interface GeneratedArtifact extends GraphArtifact {}

export interface WorkflowRun {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: RunStatus;
  currentAgent: AgentType | null;
  /** Overall run completion, 0 to 100. */
  stepProgress: number;
  /**
   * Progress of the *currently executing* agent through its own lifecycle,
   * 0 to 100. Additive field: consumers that only know `stepProgress` keep
   * working unchanged.
   */
  stageProgress?: number;
  totalSteps: number;
  completedSteps: number;
  error?: string | null;
  startedAt: string;
  completedAt?: string | null;
  createdAt: string;
}
