import { useState, useMemo } from 'react';
import { Task, Milestone } from '../types';
import { getMonthCalendar, getMonthName, getDayName, isOverdue, getTasksWithoutDueDate, CalendarDay } from '../utils/calendarUtils';
import { ChevronLeft, ChevronRight, Clock, User, X, Check } from 'lucide-react';
import TaskEditModal from './TaskEditModal';
import { DayDetailModal } from './DayDetailModal';

interface MonthlyCalendarViewProps {
  tasks: Task[];
  milestones: Milestone[];
  onTaskUpdate: (task: Task) => void;
  onTaskDelete: (taskId: string) => void;
  onTaskComplete: (taskId: string) => void;
  onMilestoneCreate: (milestone: Omit<Milestone, 'id' | 'createdAt'>) => void;
  onMilestoneUpdate: (milestone: Milestone) => void;
  onMilestoneDelete: (milestoneId: string) => void;
  availableOwners?: string[];
}

export function MonthlyCalendarView({
  tasks,
  milestones,
  onTaskUpdate,
  onTaskDelete,
  onTaskComplete,
  onMilestoneCreate,
  onMilestoneUpdate,
  onMilestoneDelete,
  availableOwners = []
}: MonthlyCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const calendar = useMemo(() => {
    return getMonthCalendar(currentYear, currentMonth, tasks, milestones);
  }, [currentYear, currentMonth, tasks, milestones]);

  const tasksWithoutDate = useMemo(() => {
    return getTasksWithoutDueDate(tasks);
  }, [tasks]);

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
  };

  const handleDayClick = (day: CalendarDay) => {
    if (day.isCurrentMonth) {
      setSelectedDay(day);
    }
  };

  const getMilestoneColorClass = (color: Milestone['color']) => {
    const colorMap = {
      red: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
      orange: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
      yellow: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
      green: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
      blue: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
      purple: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
      pink: { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200' },
    };
    return colorMap[color] || colorMap.blue;
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

  const getPriorityBorder = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'border-red-200 hover:border-red-300';
      case 'medium':
        return 'border-primary-200 hover:border-primary-300';
      case 'low':
        return 'border-blue-200 hover:border-blue-300';
      default:
        return 'border-gray-200 hover:border-gray-300';
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6 px-4">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-800">
            {currentYear}年 {getMonthName(currentMonth)}
          </h2>
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors"
          >
            今天
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={goToPreviousMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="上个月"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="下个月"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
            {[0, 1, 2, 3, 4, 5, 6].map(dayIndex => (
              <div
                key={dayIndex}
                className="p-3 text-center text-sm font-semibold text-gray-600 border-r last:border-r-0 border-gray-200"
              >
                周{getDayName(dayIndex)}
              </div>
            ))}
          </div>

          {calendar.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 border-b last:border-b-0 border-gray-200">
              {week.days.map((day, dayIndex) => (
                <div
                  key={dayIndex}
                  className={`min-h-[120px] p-2 border-r last:border-r-0 border-gray-200 ${
                    day.isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                  } ${day.isToday ? 'bg-primary-50' : ''} hover:bg-gray-50 transition-colors cursor-pointer`}
                  onClick={() => handleDayClick(day)}
                >
                  <div className={`text-sm font-medium mb-2 ${
                    day.isToday
                      ? 'bg-primary-500 text-white w-6 h-6 rounded-full flex items-center justify-center'
                      : day.isCurrentMonth
                      ? 'text-gray-700'
                      : 'text-gray-400'
                  }`}>
                    {day.dayNumber}
                  </div>

                  <div className="space-y-1">
                    {day.milestones.map(milestone => {
                      const colorClass = getMilestoneColorClass(milestone.color);
                      return (
                        <div
                          key={milestone.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDayClick(day);
                          }}
                          className={`text-xs p-1.5 rounded border ${colorClass.border} ${colorClass.bg} cursor-pointer transition-all hover:shadow-sm`}
                        >
                          <div className={`truncate font-semibold ${colorClass.text}`}>
                            {milestone.title}
                          </div>
                        </div>
                      );
                    })}

                    {day.tasks.slice(0, day.milestones.length > 0 ? 2 : 3).map(task => (
                      <div
                        key={task.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTaskClick(task);
                        }}
                        className={`text-xs p-1.5 rounded border ${getPriorityBorder(task.priority)}
                          ${task.completedAt ? 'opacity-60 line-through' : ''}
                          cursor-pointer transition-all hover:shadow-sm group relative`}
                      >
                        <div className="flex items-start gap-1">
                          <div className={`w-1 h-1 rounded-full ${getPriorityColor(task.priority)} mt-1 flex-shrink-0`} />
                          <div className="flex-1 min-w-0">
                            <div className="truncate font-medium text-gray-700">
                              {task.title}
                            </div>
                            {task.tags && task.tags.length > 0 && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <User className="w-3 h-3 text-gray-400" />
                                <span className="text-gray-500 truncate">
                                  {task.tags[0]}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        {isOverdue(task) && !task.completedAt && (
                          <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
                        )}
                      </div>
                    ))}

                    {(day.tasks.length > (day.milestones.length > 0 ? 2 : 3) || day.milestones.length > 1) && (
                      <div className="text-xs text-gray-500 text-center py-1">
                        {day.milestones.length > 1 && `${day.milestones.length} 节点 `}
                        {day.tasks.length > (day.milestones.length > 0 ? 2 : 3) && `+${day.tasks.length - (day.milestones.length > 0 ? 2 : 3)} 任务`}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {tasksWithoutDate.length > 0 && (
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-gray-500" />
              <h3 className="font-semibold text-gray-700">无截止日期的任务</h3>
              <span className="text-sm text-gray-500">({tasksWithoutDate.length})</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {tasksWithoutDate.map(task => (
                <div
                  key={task.id}
                  onClick={() => handleTaskClick(task)}
                  className={`p-3 rounded-lg border ${getPriorityBorder(task.priority)}
                    ${task.completedAt ? 'opacity-60 line-through' : ''}
                    cursor-pointer transition-all hover:shadow-md`}
                >
                  <div className="flex items-start gap-2">
                    <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)} mt-1 flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-700 truncate">
                        {task.title}
                      </div>
                      {task.tags && task.tags.length > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <User className="w-3 h-3 text-gray-400" />
                          <span className="text-sm text-gray-500 truncate">
                            {task.tags[0]}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedTask && (
        <TaskEditModal
          isOpen={true}
          task={selectedTask}
          onCancel={() => setSelectedTask(null)}
          onSave={(updatedTask) => {
            onTaskUpdate(updatedTask);
            setSelectedTask(null);
          }}
          availableOwners={availableOwners}
        />
      )}

      {selectedDay && (
        <DayDetailModal
          isOpen={true}
          date={selectedDay.date}
          tasks={selectedDay.tasks}
          milestones={selectedDay.milestones}
          onClose={() => setSelectedDay(null)}
          onTaskClick={(task) => {
            setSelectedTask(task);
            setSelectedDay(null);
          }}
          onTaskComplete={onTaskComplete}
          onMilestoneCreate={onMilestoneCreate}
          onMilestoneUpdate={onMilestoneUpdate}
          onMilestoneDelete={onMilestoneDelete}
        />
      )}
    </div>
  );
}
