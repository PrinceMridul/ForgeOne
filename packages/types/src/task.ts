import type { AgentType } from './agent';

export type TaskStatus = 'PENDING' | 'QUEUED' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface Task {
  id: string;
  projectId: string;
  parentId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: number;
  assignedTo: AgentType | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface TaskDependency {
  id: string;
  taskId: string;
  dependsOnId: string;
}

export interface CreateTaskInput {
  projectId: string;
  parentId?: string;
  title: string;
  description?: string;
  priority?: number;
  assignedTo?: AgentType;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: number;
  assignedTo?: AgentType;
}
