import { X, Plus, Edit2, Trash2, Calendar } from 'lucide-react';
import { Task, Milestone } from '../types';
import { useState } from 'react';

interface DayDetailModalProps {
  isOpen: boolean;
  date: Date;
  tasks: Task[];
  milestones: Milestone[];
  onClose: () => void;
  onTaskClick: (task: Task) => void;
  onTaskComplete: (taskId: string) => void;
  onTaskCreate: (taskData: { title: string; dueDate: number }) => void;
  onMilestoneCreate: (milestone: Omit<Milestone, 'id' | 'createdAt'>) => void;
  onMilestoneUpdate: (milestone: Milestone) => void;
  onMilestoneDelete: (milestoneId: string) => void;
}

const colorOptions: Array<{ value: Milestone['color']; label: string; bg: string; text: string }> = [
  { value: 'red', label: '红色', bg: 'bg-red-100', text: 'text-red-700' },
  { value: 'orange', label: '橙色', bg: 'bg-orange-100', text: 'text-orange-700' },
  { value: 'yellow', label: '黄色', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  { value: 'green', label: '绿色', bg: 'bg-green-100', text: 'text-green-700' },
  { value: 'blue', label: '蓝色', bg: 'bg-blue-100', text: 'text-blue-700' },
  { value: 'purple', label: '紫色', bg: 'bg-purple-100', text: 'text-purple-700' },
  { value: 'pink', label: '粉色', bg: 'bg-pink-100', text: 'text-pink-700' },
];

export function DayDetailModal({
  isOpen,
  date,
  tasks,
  milestones,
  onClose,
  onTaskClick,
  onTaskComplete,
  onTaskCreate,
  onMilestoneCreate,
  onMilestoneUpdate,
  onMilestoneDelete,
}: DayDetailModalProps) {
  const [isAddingMilestone, setIsAddingMilestone] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneDescription, setMilestoneDescription] = useState('');
  const [milestoneColor, setMilestoneColor] = useState<Milestone['color']>('blue');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');

  if (!isOpen) return null;

  const dateStr = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;

  const handleCreateTask = () => {
    if (!taskTitle.trim()) return;

    onTaskCreate({
      title: taskTitle,
      dueDate: date.getTime(),
    });

    setTaskTitle('');
    setIsAddingTask(false);
  };

  const handleCreateMilestone = () => {
    if (!milestoneTitle.trim()) return;

    onMilestoneCreate({
      title: milestoneTitle,
      description: milestoneDescription,
      date: date.getTime(),
      color: milestoneColor,
    });

    setMilestoneTitle('');
    setMilestoneDescription('');
    setMilestoneColor('blue');
    setIsAddingMilestone(false);
  };

  const handleUpdateMilestone = () => {
    if (!editingMilestone || !milestoneTitle.trim()) return;

    onMilestoneUpdate({
      ...editingMilestone,
      title: milestoneTitle,
      description: milestoneDescription,
      color: milestoneColor,
    });

    setMilestoneTitle('');
    setMilestoneDescription('');
    setMilestoneColor('blue');
    setEditingMilestone(null);
  };

  const startEditingMilestone = (milestone: Milestone) => {
    setEditingMilestone(milestone);
    setMilestoneTitle(milestone.title);
    setMilestoneDescription(milestone.description || '');
    setMilestoneColor(milestone.color);
    setIsAddingMilestone(false);
  };

  const cancelEdit = () => {
    setIsAddingMilestone(false);
    setEditingMilestone(null);
    setMilestoneTitle('');
    setMilestoneDescription('');
    setMilestoneColor('blue');
  };

  const getColorClass = (color: Milestone['color']) => {
    const option = colorOptions.find(opt => opt.value === color);
    return option || colorOptions[4];
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-primary-500';
      case 'low':
        return 'bg-blue-500';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-primary-600" />
            <h2 className="text-2xl font-bold text-gray-800">{dateStr}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">节点</h3>
              <button
                onClick={() => setIsAddingMilestone(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors"
              >
                <Plus className="w-4 h-4" />
                添加节点
              </button>
            </div>

            {(isAddingMilestone || editingMilestone) && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
                <input
                  type="text"
                  placeholder="节点标题"
                  value={milestoneTitle}
                  onChange={(e) => setMilestoneTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <textarea
                  placeholder="节点描述（可选）"
                  value={milestoneDescription}
                  onChange={(e) => setMilestoneDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  rows={2}
                />
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setMilestoneColor(option.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${option.bg} ${option.text} ${
                        milestoneColor === option.value ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={editingMilestone ? handleUpdateMilestone : handleCreateMilestone}
                    className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                  >
                    {editingMilestone ? '保存' : '创建'}
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    取消
                  </button>
                </div>
              </div>
            )}

            {milestones.length === 0 ? (
              <p className="text-gray-400 text-sm">暂无节点</p>
            ) : (
              <div className="space-y-2">
                {milestones.map((milestone) => {
                  const colorClass = getColorClass(milestone.color);
                  return (
                    <div
                      key={milestone.id}
                      className={`p-3 rounded-lg ${colorClass.bg} border border-gray-200`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h4 className={`font-semibold ${colorClass.text}`}>{milestone.title}</h4>
                          {milestone.description && (
                            <p className="text-sm text-gray-600 mt-1">{milestone.description}</p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => startEditingMilestone(milestone)}
                            className="p-1.5 hover:bg-white/50 rounded transition-colors"
                          >
                            <Edit2 className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('确定要删除这个节点吗？')) {
                                onMilestoneDelete(milestone.id);
                              }
                            }}
                            className="p-1.5 hover:bg-white/50 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                任务 ({tasks.length})
              </h3>
              <button
                onClick={() => setIsAddingTask(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors"
              >
                <Plus className="w-4 h-4" />
                添加任务
              </button>
            </div>

            {isAddingTask && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
                <input
                  type="text"
                  placeholder="任务标题"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleCreateTask();
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateTask}
                    className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                  >
                    创建
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingTask(false);
                      setTaskTitle('');
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    取消
                  </button>
                </div>
              </div>
            )}

            {tasks.length === 0 ? (
              <p className="text-gray-400 text-sm">暂无任务</p>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onTaskComplete(task.id);
                        }}
                        className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                          task.completedAt
                            ? 'bg-primary-500 border-primary-500'
                            : 'border-gray-300 hover:border-primary-500'
                        }`}
                      >
                        {task.completedAt && <span className="text-white text-xs">✓</span>}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${getPriorityColor(task.priority)} mt-1.5 flex-shrink-0`} />
                          <div className="flex-1">
                            <h4
                              className={`font-medium text-gray-800 ${task.completedAt ? 'line-through opacity-60' : ''}`}
                            >
                              {task.title}
                            </h4>
                            {task.description && (
                              <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                            )}
                            {task.tags && task.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {task.tags.map((tag, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => onTaskClick(task)}
                        className="flex-shrink-0 p-1.5 hover:bg-gray-100 rounded transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Edit2 className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
