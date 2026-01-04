import { Task } from '../types';
import { FileText } from 'lucide-react';

interface WeeklyReportViewProps {
  tasks: Task[];
}

interface GroupedTasks {
  [owner: string]: Task[];
}

export function WeeklyReportView({ tasks }: WeeklyReportViewProps) {
  const getWeekBounds = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 7);

    return { monday, sunday };
  };

  const { monday, sunday } = getWeekBounds();

  const completedThisWeek = tasks.filter(task => {
    if (task.status !== 'done' || !task.completedAt) return false;
    const completedDate = new Date(task.completedAt);
    return completedDate >= monday && completedDate < sunday;
  });

  const groupedByOwner: GroupedTasks = completedThisWeek.reduce((acc, task) => {
    const ownerTag = task.tags?.find(tag => tag.startsWith('负责人:'));
    const owner = ownerTag ? ownerTag.replace('负责人:', '') : '未分配';

    if (!acc[owner]) {
      acc[owner] = [];
    }
    acc[owner].push(task);

    return acc;
  }, {} as GroupedTasks);

  const owners = Object.keys(groupedByOwner).sort();

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
  };

  const formatWeekRange = () => {
    const mondayStr = monday.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
    const saturdayStr = new Date(sunday.getTime() - 24 * 60 * 60 * 1000).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
    return `${mondayStr} - ${saturdayStr}`;
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-500';
      case 'medium':
        return 'text-amber-500';
      case 'low':
        return 'text-green-500';
      default:
        return 'text-gray-500';
    }
  };

  const getPriorityLabel = (priority?: string) => {
    switch (priority) {
      case 'high':
        return '高';
      case 'medium':
        return '中';
      case 'low':
        return '低';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-6 shadow-lg text-white">
        <div className="flex items-center gap-3 mb-2">
          <FileText size={28} />
          <h2 className="text-2xl font-bold">本周任务完成情况</h2>
        </div>
        <p className="text-primary-100">
          {formatWeekRange()} | 共完成 {completedThisWeek.length} 项任务
        </p>
      </div>

      {owners.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl shadow-md">
          <div className="inline-block p-6 bg-gradient-to-br from-primary-100 to-accent-100 rounded-full mb-4">
            <FileText size={48} className="text-primary-500" />
          </div>
          <p className="text-gray-600 text-lg font-medium">本周暂无完成的任务</p>
        </div>
      ) : (
        <div className="space-y-6">
          {owners.map(owner => {
            const ownerTasks = groupedByOwner[owner];
            const sortedTasks = [...ownerTasks].sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));

            return (
              <div key={owner} className="bg-white rounded-2xl shadow-md overflow-hidden border-2 border-primary-100">
                <div className="bg-gradient-to-r from-primary-50 to-accent-50 px-6 py-4 border-b-2 border-primary-100">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-800">{owner}</h3>
                    <span className="bg-primary-500 text-white px-4 py-1.5 rounded-full text-sm font-semibold">
                      {ownerTasks.length} 项
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  <div className="space-y-3">
                    {sortedTasks.map((task, index) => (
                      <div
                        key={task.id}
                        className="flex items-start gap-3 p-4 bg-gradient-to-r from-gray-50 to-primary-50 rounded-xl hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex-shrink-0 w-8 h-8 bg-primary-500 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                          {index + 1}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <h4 className="font-semibold text-gray-800 text-base leading-tight">
                              {task.title}
                            </h4>
                            {task.priority && (
                              <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)} bg-white border border-current`}>
                                {getPriorityLabel(task.priority)}
                              </span>
                            )}
                          </div>

                          {task.description && (
                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                              {task.description}
                            </p>
                          )}

                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            {task.completedAt && (
                              <span className="flex items-center gap-1">
                                <span className="font-medium">完成时间:</span>
                                <span>{formatDate(task.completedAt)}</span>
                              </span>
                            )}
                            {task.dueDate && (
                              <span className="flex items-center gap-1">
                                <span className="font-medium">截止日期:</span>
                                <span>{formatDate(task.dueDate)}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
