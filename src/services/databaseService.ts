import { supabase } from '../lib/supabase';
import { Task } from '../types';

export interface DatabaseOperationResult<T> {
  data: T | null;
  error: Error | null;
  isOffline: boolean;
}

class DatabaseService {
  private isOnline: boolean = true;
  private retryCount: number = 0;
  private maxRetries: number = 3;
  private retryDelay: number = 1000;

  async getTasks(): Promise<DatabaseOperationResult<Task[]>> {
    console.log('=== [DB Service] getTasks 开始 ===');

    try {
      console.log('[DB Service] 查询数据库...');
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('[DB Service] 数据库响应:', error ? '错误' : '成功', data ? `${data.length}条数据` : '无数据');

      if (error) {
        console.error('[DB Service] ❌ Error fetching tasks:', error.message);
        console.error('[DB Service] Error details:', JSON.stringify(error, null, 2));

        if (this.isNetworkError(error)) {
          this.isOnline = false;
          console.log('[DB Service] 检测到网络错误，设置为离线模式');
          return {
            data: null,
            error: new Error('Network connection failed'),
            isOffline: true
          };
        }

        return {
          data: null,
          error: new Error(error.message),
          isOffline: false
        };
      }

      if (!data) {
        console.log('[DB Service] ✓ 数据为空，返回空数组');
        this.isOnline = true;
        this.retryCount = 0;
        return { data: [], error: null, isOffline: false };
      }

      console.log('[DB Service] 开始映射数据...');
      const mappedTasks: Task[] = data.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description || '',
        status: task.status || 'todo',
        priority: task.priority || 'medium',
        dueDate: task.due_date ? new Date(task.due_date).getTime() : undefined,
        tags: task.tags || [],
        createdAt: new Date(task.created_at).getTime(),
        completedAt: task.completed_at ? new Date(task.completed_at).getTime() : undefined
      }));

      console.log(`[DB Service] ✓ 映射完成，共 ${mappedTasks.length} 条任务`);
      if (mappedTasks.length > 0) {
        console.log('[DB Service] 前3条任务:', mappedTasks.slice(0, 3).map(t => ({ id: t.id.substring(0, 8), title: t.title })));
      }
      this.isOnline = true;
      this.retryCount = 0;
      console.log('=== [DB Service] getTasks 完成（成功）===');

      return {
        data: mappedTasks,
        error: null,
        isOffline: false
      };
    } catch (err) {
      console.error('[DB Service] ❌ Exception while fetching tasks:', err);
      this.isOnline = false;
      console.log('=== [DB Service] getTasks 完成（异常）===');

      return {
        data: null,
        error: err instanceof Error ? err : new Error('Unknown error'),
        isOffline: true
      };
    }
  }

  async createTask(taskData: Omit<Task, 'id' | 'createdAt'>): Promise<DatabaseOperationResult<Task>> {
    console.log('[DB Service] Creating task:', taskData.title);
    console.log('[DB Service] Task data:', JSON.stringify(taskData, null, 2));

    if (!this.isOnline) {
      console.warn('[DB Service] ⚠️ Offline mode, cannot create task');
      return {
        data: null,
        error: new Error('Database is offline'),
        isOffline: true
      };
    }

    try {
      const insertData = {
        title: taskData.title,
        description: taskData.description || '',
        status: taskData.status || 'todo',
        priority: taskData.priority || 'medium',
        due_date: taskData.dueDate ? new Date(taskData.dueDate).toISOString() : null,
        tags: taskData.tags || []
      };
      console.log('[DB Service] Insert data:', JSON.stringify(insertData, null, 2));

      const { data, error } = await supabase
        .from('tasks')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('[DB Service] ❌ Error creating task:', error.message);
        console.error('[DB Service] Error details:', JSON.stringify(error, null, 2));

        if (this.isNetworkError(error)) {
          this.isOnline = false;
          return {
            data: null,
            error: new Error('Network connection failed'),
            isOffline: true
          };
        }

        return {
          data: null,
          error: new Error(error.message),
          isOffline: false
        };
      }

      if (!data) {
        console.error('[DB Service] ❌ No data returned from insert');
        return {
          data: null,
          error: new Error('No data returned from insert'),
          isOffline: false
        };
      }

      const newTask: Task = {
        id: data.id,
        title: data.title,
        description: data.description || '',
        status: data.status || 'todo',
        priority: data.priority || 'medium',
        dueDate: data.due_date ? new Date(data.due_date).getTime() : undefined,
        tags: data.tags || [],
        createdAt: new Date(data.created_at).getTime(),
        completedAt: data.completed_at ? new Date(data.completed_at).getTime() : undefined
      };

      console.log('[DB Service] ✓ Task created successfully');
      console.log('[DB Service] New task:', JSON.stringify(newTask, null, 2));
      return {
        data: newTask,
        error: null,
        isOffline: false
      };
    } catch (err) {
      console.error('[DB Service] ❌ Exception while creating task:', err);
      this.isOnline = false;

      return {
        data: null,
        error: err instanceof Error ? err : new Error('Unknown error'),
        isOffline: true
      };
    }
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<DatabaseOperationResult<Task>> {
    console.log('[DB Service] Updating task:', taskId);

    if (!this.isOnline) {
      return {
        data: null,
        error: new Error('Database is offline'),
        isOffline: true
      };
    }

    try {
      const updateData: Record<string, unknown> = {};

      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.priority !== undefined) updateData.priority = updates.priority;
      if (updates.tags !== undefined) updateData.tags = updates.tags;
      if (updates.dueDate !== undefined) {
        updateData.due_date = updates.dueDate ? new Date(updates.dueDate).toISOString() : null;
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId)
        .select()
        .single();

      if (error) {
        console.error('[DB Service] ❌ Error updating task:', error.message);

        if (this.isNetworkError(error)) {
          this.isOnline = false;
          return {
            data: null,
            error: new Error('Network connection failed'),
            isOffline: true
          };
        }

        return {
          data: null,
          error: new Error(error.message),
          isOffline: false
        };
      }

      if (!data) {
        return {
          data: null,
          error: new Error('Task not found'),
          isOffline: false
        };
      }

      const updatedTask: Task = {
        id: data.id,
        title: data.title,
        description: data.description || '',
        status: data.status || 'todo',
        priority: data.priority || 'medium',
        dueDate: data.due_date ? new Date(data.due_date).getTime() : undefined,
        tags: data.tags || [],
        createdAt: new Date(data.created_at).getTime(),
        completedAt: data.completed_at ? new Date(data.completed_at).getTime() : undefined
      };

      console.log('[DB Service] ✓ Task updated:', updatedTask.id);
      return {
        data: updatedTask,
        error: null,
        isOffline: false
      };
    } catch (err) {
      console.error('[DB Service] ❌ Exception while updating task:', err);
      this.isOnline = false;

      return {
        data: null,
        error: err instanceof Error ? err : new Error('Unknown error'),
        isOffline: true
      };
    }
  }

  async deleteTask(taskId: string): Promise<DatabaseOperationResult<boolean>> {
    console.log('[DB Service] Deleting task:', taskId);

    if (!this.isOnline) {
      return {
        data: null,
        error: new Error('Database is offline'),
        isOffline: true
      };
    }

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) {
        console.error('[DB Service] ❌ Error deleting task:', error.message);

        if (this.isNetworkError(error)) {
          this.isOnline = false;
          return {
            data: null,
            error: new Error('Network connection failed'),
            isOffline: true
          };
        }

        return {
          data: null,
          error: new Error(error.message),
          isOffline: false
        };
      }

      console.log('[DB Service] ✓ Task deleted:', taskId);
      return {
        data: true,
        error: null,
        isOffline: false
      };
    } catch (err) {
      console.error('[DB Service] ❌ Exception while deleting task:', err);
      this.isOnline = false;

      return {
        data: null,
        error: err instanceof Error ? err : new Error('Unknown error'),
        isOffline: true
      };
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log('[DB Service] Testing connection...');
      const { error } = await supabase
        .from('tasks')
        .select('id')
        .limit(1);

      if (error) {
        console.error('[DB Service] ❌ Connection test failed:', error.message);
        this.isOnline = false;
        return false;
      }

      console.log('[DB Service] ✓ Connection test passed');
      this.isOnline = true;
      this.retryCount = 0;
      return true;
    } catch (err) {
      console.error('[DB Service] ❌ Connection test exception:', err);
      this.isOnline = false;
      return false;
    }
  }

  private isNetworkError(error: { message?: string }): boolean {
    const networkErrorPatterns = [
      'Failed to fetch',
      'NetworkError',
      'ERR_CONNECTION',
      'Network request failed',
      'fetch failed',
      'ECONNREFUSED'
    ];

    return networkErrorPatterns.some(pattern =>
      error.message?.includes(pattern)
    );
  }

  getConnectionStatus(): boolean {
    return this.isOnline;
  }

  resetRetryCount(): void {
    this.retryCount = 0;
  }
}

export const databaseService = new DatabaseService();
