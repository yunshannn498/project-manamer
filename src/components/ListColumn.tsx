import { List, Task } from '../types';
import { TaskCard } from './TaskCard';
import { Plus, X } from 'lucide-react';
import { useState } from 'react';

interface ListColumnProps {
  list: List;
  onAddTask: (listId: string, task: Omit<Task, 'id' | 'createdAt'>) => void;
  onDeleteTask: (listId: string, taskId: string) => void;
  onDeleteList: (listId: string) => void;
}

export const ListColumn = ({ list, onAddTask, onDeleteTask, onDeleteList }: ListColumnProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      onAddTask(list.id, {
        title: newTaskTitle.trim()
      });
      setNewTaskTitle('');
      setIsAdding(false);
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4 min-w-[280px] max-w-[280px] flex flex-col">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-gray-700">{list.title}</h3>
        <button
          onClick={() => onDeleteList(list.id)}
          className="text-gray-400 hover:text-red-500 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 space-y-2 mb-3 overflow-y-auto max-h-[calc(100vh-240px)]">
        {list.tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            onDelete={() => onDeleteTask(list.id, task.id)}
            onUpdate={() => {}}
            onComplete={() => {}}
          />
        ))}
      </div>

      {isAdding ? (
        <div className="space-y-2">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
            placeholder="输入任务标题..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleAddTask}
              className="flex-1 bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              添加
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setNewTaskTitle('');
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <Plus size={18} />
          <span>添加任务</span>
        </button>
      )}
    </div>
  );
};
