import { Task, Milestone } from '../types';

export interface CalendarDay {
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  tasks: Task[];
  milestones: Milestone[];
}

export interface CalendarWeek {
  days: CalendarDay[];
}

export function getMonthCalendar(year: number, month: number, tasks: Task[], milestones: Milestone[] = []): CalendarWeek[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  const firstDayOfWeek = firstDay.getDay();
  const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  const prevMonthLastDay = new Date(year, month, 0);
  const prevMonthDays = prevMonthLastDay.getDate();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tasksByDate = groupTasksByDate(tasks);
  const milestonesByDate = groupMilestonesByDate(milestones);

  const weeks: CalendarWeek[] = [];
  let currentWeek: CalendarDay[] = [];

  for (let i = startOffset - 1; i >= 0; i--) {
    const date = new Date(year, month - 1, prevMonthDays - i);
    currentWeek.push({
      date,
      dayNumber: prevMonthDays - i,
      isCurrentMonth: false,
      isToday: false,
      tasks: [],
      milestones: [],
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateKey = formatDateKey(date);
    const isToday = date.getTime() === today.getTime();

    currentWeek.push({
      date,
      dayNumber: day,
      isCurrentMonth: true,
      isToday,
      tasks: tasksByDate[dateKey] || [],
      milestones: milestonesByDate[dateKey] || [],
    });

    if (currentWeek.length === 7) {
      weeks.push({ days: currentWeek });
      currentWeek = [];
    }
  }

  if (currentWeek.length > 0) {
    let nextMonthDay = 1;
    while (currentWeek.length < 7) {
      const date = new Date(year, month + 1, nextMonthDay);
      currentWeek.push({
        date,
        dayNumber: nextMonthDay,
        isCurrentMonth: false,
        isToday: false,
        tasks: [],
        milestones: [],
      });
      nextMonthDay++;
    }
    weeks.push({ days: currentWeek });
  }

  return weeks;
}

function groupTasksByDate(tasks: Task[]): Record<string, Task[]> {
  const grouped: Record<string, Task[]> = {};

  tasks.forEach(task => {
    if (task.dueDate) {
      const date = new Date(task.dueDate);
      const dateKey = formatDateKey(date);

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(task);
    }
  });

  Object.keys(grouped).forEach(key => {
    grouped[key].sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const aPriority = priorityOrder[a.priority || 'low'];
      const bPriority = priorityOrder[b.priority || 'low'];
      return aPriority - bPriority;
    });
  });

  return grouped;
}

function groupMilestonesByDate(milestones: Milestone[]): Record<string, Milestone[]> {
  const grouped: Record<string, Milestone[]> = {};

  milestones.forEach(milestone => {
    const date = new Date(milestone.date);
    const dateKey = formatDateKey(date);

    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(milestone);
  });

  return grouped;
}

function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function getMonthName(month: number): string {
  const months = [
    '一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月'
  ];
  return months[month];
}

export function getDayName(dayIndex: number): string {
  const days = ['一', '二', '三', '四', '五', '六', '日'];
  return days[dayIndex];
}

export function isOverdue(task: Task): boolean {
  if (!task.dueDate || task.completedAt) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(task.dueDate);
  dueDate.setHours(0, 0, 0, 0);
  return dueDate < today;
}

export function getTasksWithoutDueDate(tasks: Task[]): Task[] {
  return tasks.filter(task => !task.dueDate);
}
