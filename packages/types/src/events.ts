import type { AgentRunStatus, AgentType } from './agent';
import type { TaskStatus } from './task';

export interface ServerToClientEvents {
  'agent:status': (payload: AgentStatusEvent) => void;
  'agent:output': (payload: AgentOutputEvent) => void;
  'task:update': (payload: TaskUpdateEvent) => void;
  'chat:message': (payload: ChatMessageEvent) => void;
  'terminal:data': (payload: TerminalDataEvent) => void;
  'error': (payload: ErrorEvent) => void;
}

export interface ClientToServerEvents {
  'chat:send': (payload: ChatSendEvent) => void;
  'terminal:input': (payload: TerminalInputEvent) => void;
  'subscribe:project': (projectId: string) => void;
  'unsubscribe:project': (projectId: string) => void;
}

export interface AgentStatusEvent { agentRunId: string; taskId: string; agentType: AgentType; status: AgentRunStatus; timestamp: string; }
export interface AgentOutputEvent { agentRunId: string; taskId: string; agentType: AgentType; content: string; isComplete: boolean; timestamp: string; }
export interface TaskUpdateEvent { taskId: string; projectId: string; status: TaskStatus; assignedTo: AgentType | null; timestamp: string; }
export interface ChatMessageEvent { conversationId: string; messageId: string; role: 'USER' | 'ASSISTANT'; content: string; timestamp: string; }
export interface ChatSendEvent { conversationId: string; content: string; }
export interface TerminalDataEvent { sessionId: string; data: string; }
export interface TerminalInputEvent { sessionId: string; data: string; }
export interface ErrorEvent { code: string; message: string; }
