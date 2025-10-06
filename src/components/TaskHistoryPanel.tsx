import { useState, useEffect } from 'react';
import { X, Clock, Plus, CreditCard as Edit, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { TaskHistory } from '../types';
import { useProject } from '../contexts/ProjectContext';

interface TaskHistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TaskHistoryPanel({ isOpen, onClose }: TaskHistoryPanelProps) {
  const { currentProject } = useProject();
  const [history, setHistory] = useState<TaskHistory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && currentProject) {
      loadHistory();
    }
  }, [isOpen, currentProject]);

  const loadHistory = async () => {
    if (!currentProject) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('task_history')
      .select(`
        *,
        profiles(email)
      `)
      .in(
        'task_id',
        await supabase
          .from('tasks')
          .select('id')
          .eq('project_id', currentProject.id)
          .then(res => res.data?.map(t => t.id) || [])
      )
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      const mappedHistory = data.map(h => ({
        id: h.id,
        taskId: h.task_id,
        userId: h.user_id,
        userEmail: h.profiles?.email,
        action: h.action as 'created' | 'updated' | 'deleted',
        changes: h.changes,
        createdAt: new Date(h.created_at).getTime()
      }));
      setHistory(mappedHistory);
    }
    setLoading(false);
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created':
        return <Plus size={16} className="text-green-600" />;
      case 'updated':
        return <Edit size={16} className="text-blue-600" />;
      case 'deleted':
        return <Trash2 size={16} className="text-red-600" />;
      default:
        return null;
    }
  };

  const getActionText = (action: string) => {
    switch (action) {
      case 'created':
        return '创建了任务';
      case 'updated':
        return '更新了任务';
      case 'deleted':
        return '删除了任务';
      default:
        return '操作了任务';
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">编辑历史</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无编辑记录</div>
          ) : (
            <div className="space-y-3">
              {history.map(item => (
                <div
                  key={item.id}
                  className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getActionIcon(item.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="font-medium text-gray-800">
                          {item.userEmail || item.userId}
                        </span>
                        <span className="text-gray-600">{getActionText(item.action)}</span>
                      </div>

                      {item.changes && Object.keys(item.changes).length > 0 && (
                        <div className="mt-2 text-sm text-gray-600 space-y-1">
                          {item.changes.title && (
                            <div>
                              <span className="font-medium">标题:</span> {item.changes.title}
                            </div>
                          )}
                          {item.changes.status && (
                            <div>
                              <span className="font-medium">状态:</span> {item.changes.status}
                            </div>
                          )}
                          {item.changes.priority && (
                            <div>
                              <span className="font-medium">优先级:</span> {item.changes.priority}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                        <Clock size={12} />
                        <span>{formatTime(item.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
