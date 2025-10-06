import { Task } from '../types';

interface TaskSelectionModalProps {
  isOpen: boolean;
  tasks: Task[];
  updates: Partial<Task>;
  onSelect: (taskId: string) => void;
  onCancel: () => void;
}

export default function TaskSelectionModal({
  isOpen,
  tasks,
  updates,
  onSelect,
  onCancel
}: TaskSelectionModalProps) {
  if (!isOpen) return null;

  const getUpdateDescription = () => {
    const parts = [];
    if (updates.status) parts.push(`状态改为${updates.status === 'todo' ? '待办' : updates.status === 'doing' ? '进行中' : '完成'}`);
    if (updates.dueDate) {
      const date = new Date(updates.dueDate);
      parts.push(`截止日期改为${date.toLocaleDateString('zh-CN')}`);
    }
    if (updates.title) parts.push(`标题改为"${updates.title}"`);
    return parts.join('，');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">选择要编辑的任务</h3>
          <p className="text-sm text-gray-600 mt-2">
            将{getUpdateDescription()}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {tasks.map(task => (
              <button
                key={task.id}
                onClick={() => onSelect(task.id)}
                className="w-full text-left p-4 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <div className="font-medium text-gray-900">{task.title}</div>
                {task.dueDate && (
                  <div className="text-sm text-gray-500 mt-1">
                    截止：{new Date(task.dueDate).toLocaleDateString('zh-CN')}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
