import { Board, Task } from './types';

const STORAGE_KEY = 'project-manager-boards';
const TASKS_STORAGE_KEY = 'tasks-local-backup';

export const saveBoards = (boards: Board[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(boards));
};

export const loadBoards = (): Board[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const initializeDefaultBoard = (): Board => {
  return {
    id: crypto.randomUUID(),
    title: '我的项目',
    createdAt: Date.now(),
    lists: [
      {
        id: crypto.randomUUID(),
        title: '待办',
        tasks: [],
        position: 0
      },
      {
        id: crypto.randomUUID(),
        title: '进行中',
        tasks: [],
        position: 1
      },
      {
        id: crypto.randomUUID(),
        title: '已完成',
        tasks: [],
        position: 2
      }
    ]
  };
};

export const saveTasksToLocal = (tasks: Task[]): void => {
  try {
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
    console.log('[本地存储] 已保存', tasks.length, '条任务');
  } catch (error) {
    console.error('[本地存储] 保存失败:', error);
  }
};

export const loadTasksFromLocal = (): Task[] | null => {
  try {
    const data = localStorage.getItem(TASKS_STORAGE_KEY);
    if (data) {
      const tasks = JSON.parse(data);
      console.log('[本地存储] 已加载', tasks.length, '条任务');
      return tasks;
    }
    return null;
  } catch (error) {
    console.error('[本地存储] 加载失败:', error);
    return null;
  }
};
