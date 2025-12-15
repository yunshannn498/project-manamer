export interface Task {
  id: string;
  title: string;
  description?: string;
  createdAt: number;
  dueDate?: number;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
  status?: string;
  completedAt?: number;
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

export interface OperationLog {
  id: string;
  operationType: 'created' | 'updated' | 'deleted';
  taskId: string | null;
  taskTitle: string;
  operationDetails: Record<string, unknown>;
  userInfo?: string;
  createdAt: number;
}

export interface Milestone {
  id: string;
  title: string;
  description?: string;
  date: number;
  color: 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink';
  createdAt: number;
}
