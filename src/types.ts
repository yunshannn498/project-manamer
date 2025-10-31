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
