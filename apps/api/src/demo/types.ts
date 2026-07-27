import type { AgentType } from '@forgeone/types';

export interface DemoEvent {
  id: string;
  runId: string;
  timestamp: string;
  agentType: AgentType;
  agentName: string;
  eventType: 'LOG' | 'AGENT_TALK' | 'CODE_GEN' | 'ARTIFACT' | 'STATUS_CHANGE' | 'METRIC';
  message: string;
  payload?: Record<string, unknown>;
}

export interface DemoArtifact {
  id: string;
  runId: string;
  agentType: AgentType;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  content: string;
  createdAt: string;
}

export interface DemoRunState {
  id: string;
  prompt: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  currentAgent: AgentType;
  stepProgress: number;
  totalSteps: number;
  completedSteps: number;
  durationSeconds: number;
  startedAt: string;
  completedAt?: string;
}

export interface DemoReplayPackage {
  run: DemoRunState;
  events: DemoEvent[];
  artifacts: DemoArtifact[];
  timelineSummary: Array<{
    agent: AgentType;
    role: string;
    action: string;
    timestamp: string;
  }>;
}
