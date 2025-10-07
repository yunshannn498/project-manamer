import { useState } from 'react';
import { Task } from '../types';
import { Check } from 'lucide-react';

interface TaskEditModalProps {
  isOpen: boolean;
  task: Task;
  onSave: (task: Task) => void;
  onCancel: () => void;
}

export default function TaskEditModal({
  isOpen,
  task,
  onSave,
  onCancel
}: TaskEditModalProps) {
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description || '');
  const [editPriority, setEditPriority] = useState(task.priority || '');
  const [editDueDate, setEditDueDate] = useState(() => {
    if (task.dueDate) {
      const date = new Date(task.dueDate);
      return date.toISOString().slice(0, 10);
    }
    return '';
  });
  const [editDueTime, setEditDueTime] = useState(() => {
    if (task.dueDate) {
      const date = new Date(task.dueDate);
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    }
    return '';
  });

  if (!isOpen) return null;

  const handleSave = () => {
    if (editTitle.trim()) {
      let dueDate: number | undefined;
      if (editDueDate) {
        const dateTimeString = editDueTime ? `${editDueDate}T${editDueTime}` : `${editDueDate}T23:59`;
        dueDate = new Date(dateTimeString).getTime();
      }

      onSave({
        ...task,
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        priority: editPriority as 'low' | 'medium' | 'high' | undefined,
        dueDate
      });
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 md:p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">编辑任务</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">标题</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3 py-2.5 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">描述</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full px-3 py-2.5 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-base"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">优先级</label>
              <select
                value={editPriority}
                onChange={(e) => setEditPriority(e.target.value)}
                className="w-full px-3 py-2.5 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              >
                <option value="">无</option>
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">截止日期</label>
              <input
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                className="w-full px-3 py-2.5 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              />
            </div>

            {editDueDate && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">具体时间</label>
                <input
                  type="time"
                  value={editDueTime}
                  onChange={(e) => setEditDueTime(e.target.value)}
                  className="w-full px-3 py-2.5 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                />
              </div>
            )}

            {editDueDate && (
              <button
                type="button"
                onClick={() => {
                  setEditDueDate('');
                  setEditDueTime('');
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                清除截止时间
              </button>
            )}
          </div>

          <div className="flex gap-3 justify-end mt-6">
            <button
              onClick={onCancel}
              className="px-5 py-2.5 md:px-4 md:py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors active:scale-95"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2.5 md:px-4 md:py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-1.5 active:scale-95"
            >
              <Check size={18} />
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
