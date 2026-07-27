export type AgentType = 'ORCHESTRATOR' | 'PRODUCT_MANAGER' | 'ARCHITECT' | 'DEVELOPER' | 'REVIEWER' | 'TESTER' | 'SECURITY' | 'DEVOPS' | 'DOCUMENTATION';
export type AgentRunStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'TIMEOUT';
export type MessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM' | 'TOOL';

export interface AgentRun {
  id: string;
  taskId: string;
  agentType: AgentType;
  status: AgentRunStatus;
  input: unknown;
  output: unknown;
  error: string | null;
  tokensUsed: number;
  costUsd: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface AgentMessage {
  id: string;
  agentRunId: string;
  role: MessageRole;
  content: string;
  toolCallId: string | null;
  createdAt: string;
}

export interface AgentArtifact {
  id: string;
  agentRunId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  createdAt: string;
}

export interface AgentToolCall {
  id: string;
  agentRunId: string;
  toolName: string;
  input: unknown;
  output: unknown;
  error: string | null;
  durationMs: number | null;
  createdAt: string;
}
