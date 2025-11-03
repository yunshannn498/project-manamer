import { useState, useEffect } from 'react';
import { X, History, Check, Edit, Trash2, Calendar, User, ChevronDown } from 'lucide-react';
import { OperationLog } from '../types';
import { databaseService } from '../services/databaseService';

interface OperationLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type FilterType = 'all' | 'created' | 'updated' | 'deleted';

export default function OperationLogsModal({ isOpen, onClose }: OperationLogsModalProps) {
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadLogs();
    }
  }, [isOpen]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const result = await databaseService.getOperationLogs(200);
      if (result.data) {
        setLogs(result.data);
      }
    } catch (error) {
      console.error('Failed to load operation logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return '刚刚';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}分钟前`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}小时前`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}天前`;
    } else {
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const getOperationIcon = (type: string) => {
    switch (type) {
      case 'created':
        return <Check size={16} className="text-green-600" />;
      case 'updated':
        return <Edit size={16} className="text-blue-600" />;
      case 'deleted':
        return <Trash2 size={16} className="text-red-600" />;
      default:
        return <History size={16} className="text-gray-600" />;
    }
  };

  const getOperationBadge = (type: string) => {
    switch (type) {
      case 'created':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-green-100 text-green-700 text-xs font-medium">
            <Check size={12} />
            创建
          </span>
        );
      case 'updated':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-100 text-blue-700 text-xs font-medium">
            <Edit size={12} />
            更新
          </span>
        );
      case 'deleted':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-100 text-red-700 text-xs font-medium">
            <Trash2 size={12} />
            删除
          </span>
        );
      default:
        return null;
    }
  };

  const getOperationDescription = (log: OperationLog): string => {
    const details = log.operationDetails;

    if (log.operationType === 'updated' && details) {
      const changes: string[] = [];

      if (details.statusChanged) {
        changes.push(`状态: ${details.oldStatus} → ${details.newStatus}`);
      }
      if (details.priorityChanged) {
        changes.push(`优先级: ${details.oldPriority} → ${details.newPriority}`);
      }
      if (details.titleChanged) {
        changes.push('标题已修改');
      }
      if (details.descriptionChanged) {
        changes.push('描述已修改');
      }
      if (details.dueDateChanged) {
        changes.push('截止日期已修改');
      }
      if (details.tagsChanged) {
        changes.push('标签已修改');
      }

      return changes.length > 0 ? changes.join(', ') : '任务已更新';
    }

    return '';
  };

  const filteredLogs = filter === 'all'
    ? logs
    : logs.filter(log => log.operationType === filter);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-primary-400 to-primary-600 p-2 rounded-lg">
              <History size={20} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">操作记录</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <button
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-gray-200 hover:border-gray-300 transition-all bg-white"
            >
              <span className="text-sm font-medium text-gray-700">
                {filter === 'all' ? '全部操作' :
                 filter === 'created' ? '创建记录' :
                 filter === 'updated' ? '更新记录' : '删除记录'}
              </span>
              <ChevronDown size={16} className={`text-gray-500 transition-transform ${
                showFilterMenu ? 'rotate-180' : ''
              }`} />
            </button>

            {showFilterMenu && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowFilterMenu(false)}
                />
                <div className="absolute top-full mt-2 left-0 right-0 bg-white border-2 border-gray-200 rounded-lg shadow-xl overflow-hidden z-40">
                  <button
                    onClick={() => {
                      setFilter('all');
                      setShowFilterMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm text-gray-700 transition-colors"
                  >
                    全部操作
                  </button>
                  <button
                    onClick={() => {
                      setFilter('created');
                      setShowFilterMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-green-50 text-sm text-green-700 transition-colors"
                  >
                    创建记录
                  </button>
                  <button
                    onClick={() => {
                      setFilter('updated');
                      setShowFilterMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-blue-50 text-sm text-blue-700 transition-colors"
                  >
                    更新记录
                  </button>
                  <button
                    onClick={() => {
                      setFilter('deleted');
                      setShowFilterMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-red-50 text-sm text-red-700 transition-colors"
                  >
                    删除记录
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-500"></div>
              <p className="mt-4 text-gray-600">加载中...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-16">
              <History size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg">
                {filter === 'all' ? '暂无操作记录' : '暂无此类操作记录'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getOperationIcon(log.operationType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getOperationBadge(log.operationType)}
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Calendar size={12} />
                          {formatDate(log.createdAt)}
                        </span>
                      </div>
                      <div className="font-medium text-gray-800 mb-1 break-words">
                        {log.taskTitle}
                      </div>
                      {log.operationType === 'updated' && (
                        <div className="text-sm text-gray-600 mb-1">
                          {getOperationDescription(log)}
                        </div>
                      )}
                      {log.userInfo && (
                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-2">
                          <User size={12} />
                          {log.userInfo}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600 text-center">
            共 {filteredLogs.length} 条{filter === 'all' ? '' : filter === 'created' ? '创建' : filter === 'updated' ? '更新' : '删除'}记录
          </div>
        </div>
      </div>
    </div>
  );
}
