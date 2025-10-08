import { useState, useEffect } from 'react';
import { Task } from '../types';
import { X, Tag, Clock, Check, CheckCircle2 } from 'lucide-react';
import TaskEditModal from './TaskEditModal';

interface TaskCardProps {
  task: Task;
  onDelete: () => void;
  onUpdate: (task: Task) => void;
  onComplete?: () => void;
}

export const TaskCard = ({ task, onDelete, onUpdate, onComplete }: TaskCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description || '');
  const [editPriority, setEditPriority] = useState(task.priority || '');
  const [editOwner, setEditOwner] = useState(() => {
    const ownerTag = task.tags?.find(tag => tag.startsWith('负责人:'));
    return ownerTag ? ownerTag.split(':')[1] : '阿伟';
  });
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

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const priorityColors = {
    low: 'bg-blue-100 text-blue-700',
    medium: 'bg-yellow-100 text-yellow-700',
    high: 'bg-red-100 text-red-700'
  };

  const formatDueDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = timestamp - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMs < 0) {
      return { text: '已过期', color: 'text-red-600 bg-red-50' };
    } else if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return { text: `${diffMinutes}分钟后`, color: 'text-red-600 bg-red-50' };
    } else if (diffHours < 24) {
      return { text: `${diffHours}小时后`, color: 'text-orange-600 bg-orange-50' };
    } else if (diffDays === 0) {
      return { text: `今天 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`, color: 'text-orange-600 bg-orange-50' };
    } else if (diffDays === 1) {
      return { text: `明天 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`, color: 'text-blue-600 bg-blue-50' };
    } else if (diffDays < 7) {
      return { text: `${diffDays}天后`, color: 'text-blue-600 bg-blue-50' };
    } else {
      return { text: `${date.getMonth() + 1}月${date.getDate()}日`, color: 'text-gray-600 bg-gray-50' };
    }
  };

  const handleSave = () => {
    if (editTitle.trim()) {
      let dueDate: number | undefined;
      if (editDueDate) {
        const dateTimeString = editDueTime ? `${editDueDate}T${editDueTime}` : `${editDueDate}T23:59`;
        dueDate = new Date(dateTimeString).getTime();
      }

      const otherTags = task.tags?.filter(tag => !tag.startsWith('负责人:')) || [];
      const newTags = [...otherTags, `负责人:${editOwner}`];

      onUpdate({
        ...task,
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        priority: editPriority as 'low' | 'medium' | 'high' | undefined,
        dueDate,
        tags: newTags
      });
      setIsEditing(false);
    }
  };

  const handleCardClick = () => {
    if (isMobile) {
      setShowMobileModal(true);
    } else {
      setIsEditing(true);
    }
  };

  const handleMobileSave = (updatedTask: Task) => {
    onUpdate(updatedTask);
    setShowMobileModal(false);
  };

  const handleCancel = () => {
    setEditTitle(task.title);
    setEditDescription(task.description || '');
    setEditPriority(task.priority || '');
    const ownerTag = task.tags?.find(tag => tag.startsWith('负责人:'));
    setEditOwner(ownerTag ? ownerTag.split(':')[1] : '阿伟');
    setEditDueDate(() => {
      if (task.dueDate) {
        const date = new Date(task.dueDate);
        return date.toISOString().slice(0, 10);
      }
      return '';
    });
    setEditDueTime(() => {
      if (task.dueDate) {
        const date = new Date(task.dueDate);
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
      }
      return '';
    });
    setIsEditing(false);
  };

  const handleCompleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCompleting(true);
    setTimeout(() => {
      if (onComplete) {
        onComplete();
      }
    }, 600);
  };

  const dueDateInfo = task.dueDate ? formatDueDate(task.dueDate) : null;

  if (isEditing && !isMobile) {
    return (
      <div className="bg-white rounded-lg shadow-sm border-2 border-blue-500 p-3">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">标题</label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">描述</label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-base"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">优先级</label>
            <select
              value={editPriority}
              onChange={(e) => setEditPriority(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
            >
              <option value="">无</option>
              <option value="low">低</option>
              <option value="medium">中</option>
              <option value="high">高</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">负责人</label>
            <select
              value={editOwner}
              onChange={(e) => setEditOwner(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
            >
              <option value="阿伟">阿伟</option>
              <option value="choco">choco</option>
              <option value="05">05</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">截止日期</label>
            <input
              type="date"
              value={editDueDate}
              onChange={(e) => setEditDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
            />
          </div>

          {editDueDate && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">具体时间</label>
              <input
                type="time"
                value={editDueTime}
                onChange={(e) => setEditDueTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
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
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              清除截止时间
            </button>
          )}

          <div className="flex gap-2 justify-end">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors active:scale-95"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-1 active:scale-95"
            >
              <Check size={16} />
              保存
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <TaskEditModal
        isOpen={showMobileModal}
        task={task}
        onSave={handleMobileSave}
        onCancel={() => setShowMobileModal(false)}
      />
      <div
        className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-3 hover:shadow-md cursor-pointer active:scale-[0.98] relative overflow-hidden ${
          isCompleting
            ? 'animate-[slideOut_0.6s_ease-in-out_forwards] pointer-events-none'
            : 'transition-shadow'
        }`}
        onClick={handleCardClick}
      >
        {isCompleting && (
          <div className="absolute inset-0 bg-gradient-to-br from-green-400/30 to-emerald-500/30 backdrop-blur-[2px] z-10 animate-[fadeIn_0.3s_ease-out]" />
        )}
        <div className="flex justify-between items-start gap-2 mb-2">
          <h4 className="font-medium text-gray-800 flex-1 text-lg md:text-base">{task.title}</h4>
          <div className="flex gap-3 md:gap-2">
            {task.status !== 'done' && onComplete && (
              <button
                onClick={handleCompleteClick}
                disabled={isCompleting}
                className="flex items-center justify-center min-w-[44px] min-h-[44px] md:min-w-[32px] md:min-h-[32px] text-gray-400 hover:text-green-500 hover:bg-green-50 md:hover:bg-green-100 rounded-lg md:rounded transition-all active:scale-90 active:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed z-20 relative"
                title="标记为完成"
                aria-label="标记为完成"
              >
                <CheckCircle2 size={24} className="md:w-5 md:h-5" />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="flex items-center justify-center min-w-[44px] min-h-[44px] md:min-w-[32px] md:min-h-[32px] text-gray-400 hover:text-red-500 hover:bg-red-50 md:hover:bg-red-100 rounded-lg md:rounded transition-all active:scale-90 active:bg-red-100"
              aria-label="删除任务"
            >
              <X size={24} className="md:w-5 md:h-5" />
            </button>
          </div>
        </div>

        {task.description && (
          <p className="text-sm text-gray-600 mb-2">{task.description}</p>
        )}

        <div className="flex flex-wrap gap-2 items-center">
          {task.priority && (
            <span className={`text-sm md:text-xs px-3 py-1.5 md:px-2 md:py-1 rounded-full ${priorityColors[task.priority]}`}>
              {task.priority === 'low' ? '低' : task.priority === 'medium' ? '中' : '高'}
            </span>
          )}

          {dueDateInfo && (
            <div className={`flex gap-1 items-center text-sm md:text-xs px-3 py-1.5 md:px-2 md:py-1 rounded ${dueDateInfo.color}`}>
              <Clock size={14} className="md:w-3 md:h-3" />
              <span>{dueDateInfo.text}</span>
            </div>
          )}

          {task.tags && task.tags.length > 0 && (
            <div className="flex gap-1 items-center">
              <Tag size={14} className="text-gray-400 md:w-3 md:h-3" />
              {task.tags.map((tag, i) => (
                <span key={i} className="text-sm md:text-xs bg-gray-100 text-gray-600 px-3 py-1.5 md:px-2 md:py-1 rounded">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
