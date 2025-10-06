export interface Task {
  id: string;
  title: string;
  description?: string;
  createdAt: number;
  dueDate?: number;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
  status?: string;
  projectId?: string;
  userId: string;
}

export interface Project {
  id: string;
  name: string;
  inviteCode: string;
  ownerId: string;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  userEmail?: string;
  joinedAt: number;
}

export interface TaskHistory {
  id: string;
  taskId: string;
  userId: string;
  userEmail?: string;
  action: 'created' | 'updated' | 'deleted';
  changes: Record<string, any>;
  createdAt: number;
}

export interface List {
  id: string;
  title: string;
  tasks: Task[];
  position: number;
}

export interface Board {
  id: string;
  title: string;
  lists: List[];
  createdAt: number;
}
