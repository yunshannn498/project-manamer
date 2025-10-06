import { useState } from 'react';
import { Task } from '../types';
import { TaskMatch } from '../utils/taskMatcher';
import { parseEditIntent } from '../utils/taskParser';
import { X, Check, AlertCircle } from 'lucide-react';

interface EditConfirmModalProps {
  voiceText: string;
  matches: TaskMatch[];
  onConfirm: (taskId: string, updates: Partial<Task>) => void;
  onCancel: () => void;
}

export const EditConfirmModal = ({ voiceText, matches, onConfirm, onCancel }: EditConfirmModalProps) => {
  const [selectedTaskId, setSelectedTaskId] = useState<string>(matches[0]?.task.id);

  const selectedTask = matches.find(m => m.task.id === selectedTaskId)?.task;

  const getUpdates = (): Partial<Task> => {
    const parsed = parseEditIntent(voiceText);
    console.log('=== EditConfirmModal 解析结果 ===');
    console.log('语音文本:', voiceText);
    console.log('解析出的更新:', parsed);
    return parsed;
  };

  const updates = getUpdates();
  const hasUpdates = Object.keys(updates).length > 0;

  console.log('有更新吗?', hasUpdates);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPriorityLabel = (priority?: 'low' | 'medium' | 'high') => {
    switch (priority) {
      case 'high': return '高';
      case 'medium': return '中';
      case 'low': return '低';
      default: return '无';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <AlertCircle size={24} className="text-blue-500" />
              确认编辑任务
            </h2>
            <p className="text-sm text-gray-500 mt-1">语音识别："{voiceText}"</p>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              选择要编辑的任务 ({matches.length} 个匹配)
            </label>
            <div className="space-y-2">
              {matches.map((match) => (
                <button
                  key={match.task.id}
                  onClick={() => setSelectedTaskId(match.task.id)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    selectedTaskId === match.task.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800 mb-1 truncate">
                        {match.task.title}
                      </div>
                      {match.task.description && (
                        <div className="text-sm text-gray-600 mb-2 line-clamp-2">
                          {match.task.description}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="px-2 py-0.5 bg-gray-100 rounded">
                          匹配度: {Math.round(match.confidence)}%
                        </span>
                        <span className="text-gray-400">|</span>
                        <span>{match.reason}</span>
                      </div>
                    </div>
                    {selectedTaskId === match.task.id && (
                      <Check size={20} className="text-blue-500 flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {selectedTask && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-4">将要应用的更改</h3>

              {!hasUpdates ? (
                <div className="text-center py-8 text-gray-500">
                  未检测到有效的更改内容
                </div>
              ) : (
                <div className="space-y-4">
                  {updates.title && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-xs font-medium text-gray-500 mb-2">标题</div>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400 line-through flex-1">{selectedTask.title}</span>
                        <span className="text-gray-400">→</span>
                        <span className="text-blue-600 font-medium flex-1">{updates.title}</span>
                      </div>
                    </div>
                  )}

                  {updates.description && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-xs font-medium text-gray-500 mb-2">描述</div>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400 line-through flex-1">
                          {selectedTask.description || '(无)'}
                        </span>
                        <span className="text-gray-400">→</span>
                        <span className="text-blue-600 font-medium flex-1">{updates.description}</span>
                      </div>
                    </div>
                  )}

                  {updates.priority !== undefined && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-xs font-medium text-gray-500 mb-2">优先级</div>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400 line-through">
                          {getPriorityLabel(selectedTask.priority)}
                        </span>
                        <span className="text-gray-400">→</span>
                        <span className="text-blue-600 font-medium">
                          {getPriorityLabel(updates.priority)}
                        </span>
                      </div>
                    </div>
                  )}

                  {updates.dueDate !== undefined && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-xs font-medium text-gray-500 mb-2">截止时间</div>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400 line-through flex-1">
                          {selectedTask.dueDate ? formatDate(selectedTask.dueDate) : '(无)'}
                        </span>
                        <span className="text-gray-400">→</span>
                        <span className="text-blue-600 font-medium flex-1">
                          {updates.dueDate ? formatDate(updates.dueDate) : '(清除)'}
                        </span>
                      </div>
                    </div>
                  )}

                  {updates.tags && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-xs font-medium text-gray-500 mb-2">标签</div>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400 line-through flex-1">
                          {selectedTask.tags?.join(', ') || '(无)'}
                        </span>
                        <span className="text-gray-400">→</span>
                        <span className="text-blue-600 font-medium flex-1">
                          {updates.tags.join(', ')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
          >
            取消
          </button>
          <button
            onClick={() => {
              if (selectedTaskId && hasUpdates) {
                onConfirm(selectedTaskId, updates);
              }
            }}
            disabled={!hasUpdates}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
              hasUpdates
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            确认编辑
          </button>
        </div>
      </div>
    </div>
  );
};
