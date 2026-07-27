export interface Project {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Repository {
  id: string;
  projectId: string;
  name: string;
  url: string;
  branch: string;
  clonedAt: string | null;
}

export interface TaskCounts {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  failed: number;
}

export interface ProjectDetail extends Project {
  repositories: Repository[];
  taskCounts: TaskCounts;
}
