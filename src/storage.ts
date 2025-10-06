import { Board } from './types';

const STORAGE_KEY = 'project-manager-boards';

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
