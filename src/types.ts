export interface User {
  id: string;
  email: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  createdAt: number;
  dueDate?: number;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
  status?: string;
  createdBy?: string;
  assignedUsers?: User[];
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
