import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Task, Milestone } from './types';
import { TaskCard } from './components/TaskCard';
import { TextInput } from './components/TextInput';
import { parseVoiceInput } from './utils/taskParser';
import DeleteConfirmModal from './components/DeleteConfirmModal';
import Toast, { ToastType } from './components/Toast';
import { parseTaskIntent as parseTaskIntentGemini } from './services/geminiParser';
import { parseTaskIntent as parseTaskIntentLocal } from './services/semanticParser';
import { testDatabaseConnection } from './lib/supabase';
import { databaseService } from './services/databaseService';
import { saveTasksToLocal, loadTasksFromLocal } from './storage';
import { ListTodo, Search, ChevronDown, Download, History, MoreVertical, Users, Calendar } from 'lucide-react';
import NetworkStatus from './components/NetworkStatus';
import ImportExportModal from './components/ImportExportModal';
import OperationLogsModal from './components/OperationLogsModal';
import OwnerManagementModal from './components/OwnerManagementModal';
import { MonthlyCalendarView } from './components/MonthlyCalendarView';
import { sendTaskCreatedNotification, sendTaskUpdatedNotification, sendTaskCompletedNotification, sendTaskDeletedNotification, checkDueReminders } from './services/feishuService';

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'thisWeek' | 'noDate'>('all');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [availableOwners, setAvailableOwners] = useState<string[]>([]);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [showOwnerMenu, setShowOwnerMenu] = useState(false);
  const [showDateMenu, setShowDateMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [deleteConfirmData, setDeleteConfirmData] = useState<{ taskId: string; taskTitle: string } | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);
  const [showImportExportModal, setShowImportExportModal] = useState(false);
  const [showOperationLogsModal, setShowOperationLogsModal] = useState(false);
  const [showOwnerManagementModal, setShowOwnerManagementModal] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const lastScrollY = useRef(0);
  const scrollThreshold = 50;

  const loadTasksTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingOperationsRef = useRef<Set<string>>(new Set());
  const taskRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    console.log('[初始化] 应用启动...');
    console.log('[初始化] Supabase URL:', import.meta.env.VITE_SUPABASE_URL || '使用默认值');

    const initializeApp = async () => {
      const isConnected = await testDatabaseConnection();

      if (!isConnected) {
        console.warn('[初始化] ⚠️ 数据库连接失败，启用离线模式');
        setIsOfflineMode(true);

        const localTasks = loadTasksFromLocal();
        if (localTasks && localTasks.length > 0) {
          setTasks(localTasks);
          console.log(`[初始化] ✓ 从本地加载 ${localTasks.length} 条任务`);
        }
        setLoadingTasks(false);
        setAvailableOwners(['阿伟', 'choco', '05']);
      } else {
        console.log('[初始化] ✓ 数据库连接成功');
        await loadTasks('initial');
        await loadOwners();
        await loadMilestones();
      }
    };

    initializeApp();

    return () => {
      if (loadTasksTimerRef.current) {
        clearTimeout(loadTasksTimerRef.current);
      }
    };
  }, []);

  // Setup reminder check timer - runs every 10 minutes
  useEffect(() => {
    console.log('[提醒系统] 启动定时检查...');

    // Initial check after 1 minute
    const initialTimer = setTimeout(() => {
      console.log('[提醒系统] 执行初始检查');
      checkDueReminders();
    }, 60000);

    // Subsequent checks every 10 minutes
    const reminderInterval = setInterval(() => {
      console.log('[提醒系统] 执行定期检查');
      checkDueReminders();
    }, 10 * 60 * 1000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(reminderInterval);
      console.log('[提醒系统] 清理定时器');
    };
  }, []);

  const loadOwners = async () => {
    console.log('[加载负责人] 开始加载...');
    const result = await databaseService.getAllOwners();

    if (result.data && result.data.length > 0) {
      const ownerNames = result.data.map(owner => owner.owner_name);
      console.log('[加载负责人] ✓ 成功:', ownerNames);
      setAvailableOwners(ownerNames);
    } else {
      console.log('[加载负责人] 使用默认值');
      setAvailableOwners(['阿伟', 'choco', '05']);
    }
  };

  const loadMilestones = async () => {
    console.log('[加载节点] 开始加载...');
    const result = await databaseService.getMilestones();

    if (result.error || result.isOffline) {
      console.warn('[加载节点] ⚠️ 数据库错误或离线');
      setMilestones([]);
      return;
    }

    const loadedMilestones = result.data || [];
    console.log(`[加载节点] ✓ 成功加载 ${loadedMilestones.length} 个节点`);
    setMilestones(loadedMilestones);
  };

  const handleCreateMilestone = async (milestoneData: Omit<Milestone, 'id' | 'createdAt'>) => {
    console.log('[创建节点] 开始创建:', milestoneData.title);

    const result = await databaseService.createMilestone(milestoneData);

    if (result.error || !result.data) {
      console.error('[创建节点] ❌ 失败:', result.error?.message);
      showToast('创建节点失败', 'error');
      return;
    }

    console.log('[创建节点] ✓ 成功');
    setMilestones(prev => [...prev, result.data!]);
    showToast('节点创建成功', 'success');
  };

  const handleUpdateMilestone = async (milestone: Milestone) => {
    console.log('[更新节点] 开始更新:', milestone.id);

    const result = await databaseService.updateMilestone(milestone.id, milestone);

    if (result.error || !result.data) {
      console.error('[更新节点] ❌ 失败:', result.error?.message);
      showToast('更新节点失败', 'error');
      return;
    }

    console.log('[更新节点] ✓ 成功');
    setMilestones(prev => prev.map(m => m.id === milestone.id ? result.data! : m));
    showToast('节点更新成功', 'success');
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    console.log('[删除节点] 开始删除:', milestoneId);

    const result = await databaseService.deleteMilestone(milestoneId);

    if (result.error) {
      console.error('[删除节点] ❌ 失败:', result.error?.message);
      showToast('删除节点失败', 'error');
      return;
    }

    console.log('[删除节点] ✓ 成功');
    setMilestones(prev => prev.filter(m => m.id !== milestoneId));
    showToast('节点删除成功', 'success');
  };

  const handleQuickCreateTask = async (taskData: { title: string; dueDate: number }) => {
    console.log('[快速创建任务] 开始创建:', taskData.title);

    await handleAddTask({
      title: taskData.title,
      dueDate: taskData.dueDate,
      description: '',
      status: 'todo',
      priority: 'medium',
      tags: ['负责人:阿伟'],
    });
  };

  const handleScroll = useCallback(() => {
    if (window.innerWidth >= 768) {
      setIsHeaderVisible(true);
      return;
    }

    const currentScrollY = window.scrollY;
    const scrollDifference = currentScrollY - lastScrollY.current;

    if (Math.abs(scrollDifference) > scrollThreshold) {
      if (scrollDifference > 0 && currentScrollY > 100) {
        setIsHeaderVisible(false);
      } else if (scrollDifference < 0) {
        setIsHeaderVisible(true);
      }
      lastScrollY.current = currentScrollY;
    }
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const loadTasks = async (source: string = 'manual') => {
    try {
      console.log(`=== [加载任务-${source}] 开始 ===`);

      const result = await databaseService.getTasks();

      if (result.error || result.isOffline) {
        console.warn(`[加载任务-${source}] ⚠️ 数据库${result.isOffline ? '离线' : '错误'}，从本地加载`);
        console.warn(`[加载任务-${source}] 错误详情:`, result.error?.message);

        const localTasks = loadTasksFromLocal();
        if (localTasks && localTasks.length > 0) {
          console.log(`[加载任务-${source}] ✓ 从本地加载 ${localTasks.length} 条任务`);
          setTasks(localTasks);
          setIsOfflineMode(true);
        } else {
          console.log(`[加载任务-${source}] 本地无数据，设置空列表`);
          setIsOfflineMode(true);
          setTasks([]);
        }
        console.log(`=== [加载任务-${source}] 完成（离线）===`);
        return;
      }

      const loadedTasks = result.data || [];
      console.log(`[加载任务-${source}] ✓ 数据库返回 ${loadedTasks.length} 条任务`);
      if (loadedTasks.length > 0) {
        console.log(`[加载任务-${source}] 前3条任务:`, loadedTasks.slice(0, 3).map(t => ({ id: t.id, title: t.title })));
      }

      const tasksWithOwner = loadedTasks.map(task => {
        const hasOwner = task.tags?.some(tag => tag.startsWith('负责人:'));
        if (!hasOwner) {
          const newTags = [...(task.tags || []), '负责人:阿伟'];
          return { ...task, tags: newTags };
        }
        return task;
      });

      setTasks(tasksWithOwner);
      saveTasksToLocal(tasksWithOwner);
      setIsOfflineMode(false);
      console.log(`=== [加载任务-${source}] 完成（成功）===`);
    } catch (err) {
      console.error(`[加载任务-${source}] ❌ 异常:`, err);

      const localTasks = loadTasksFromLocal();
      if (localTasks && localTasks.length > 0) {
        setTasks(localTasks);
        setIsOfflineMode(true);
        console.log(`[加载任务-${source}] ✓ 异常恢复，从本地加载 ${localTasks.length} 条任务`);
      } else {
        setIsOfflineMode(true);
        setTasks([]);
      }
      console.log(`=== [加载任务-${source}] 完成（异常）===`);
    } finally {
      setLoadingTasks(false);
    }
  };

  const filteredTasks = useMemo(() => {
    console.log('[任务过滤] 开始过滤，原始任务数:', tasks.length);
    console.log('[任务过滤] 过滤条件 - 完成状态:', showCompleted, '优先级:', priorityFilter, '日期:', dateFilter, '负责人:', ownerFilter, '搜索:', searchQuery);

    const query = searchQuery.toLowerCase().trim();
    let filtered = showCompleted
      ? tasks.filter(task => task.status === 'done')
      : tasks.filter(task => task.status !== 'done');

    console.log('[任务过滤] 状态过滤后:', filtered.length);

    if (priorityFilter !== 'all') {
      const beforePriority = filtered.length;
      filtered = filtered.filter(task => task.priority === priorityFilter);
      console.log('[任务过滤] 优先级过滤后:', filtered.length, '(过滤掉', beforePriority - filtered.length, ')');
    }

    if (ownerFilter !== 'all') {
      const beforeOwner = filtered.length;
      filtered = filtered.filter(task =>
        task.tags?.some(tag => tag === `负责人:${ownerFilter}`)
      );
      console.log('[任务过滤] 负责人过滤后:', filtered.length, '(过滤掉', beforeOwner - filtered.length, ')');
    }

    if (dateFilter === 'today') {
      const beforeDate = filtered.length;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      filtered = filtered.filter(task => {
        if (!task.dueDate) return false;
        const taskDate = new Date(task.dueDate);
        return taskDate >= today && taskDate < tomorrow;
      });
      console.log('[任务过滤] 日期过滤（今天）后:', filtered.length, '(过滤掉', beforeDate - filtered.length, ')');
    } else if (dateFilter === 'thisWeek') {
      const beforeDate = filtered.length;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dayOfWeek = today.getDay();
      const monday = new Date(today);
      monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 7);

      filtered = filtered.filter(task => {
        if (!task.dueDate) return false;
        const taskDate = new Date(task.dueDate);
        return taskDate >= monday && taskDate < sunday;
      });
      console.log('[任务过滤] 日期过滤（本周）后:', filtered.length, '(过滤掉', beforeDate - filtered.length, ')');
    } else if (dateFilter === 'noDate') {
      const beforeDate = filtered.length;
      filtered = filtered.filter(task => !task.dueDate);
      console.log('[任务过滤] 日期过滤（无时间）后:', filtered.length, '(过滤掉', beforeDate - filtered.length, ')');
    }

    if (query) {
      const beforeSearch = filtered.length;
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        task.tags?.some(tag => tag.toLowerCase().includes(query))
      );
      console.log('[任务过滤] 搜索过滤后:', filtered.length, '(过滤掉', beforeSearch - filtered.length, ')');
    }

    console.log('[任务过滤] 最终结果:', filtered.length);
    return filtered;
  }, [tasks, searchQuery, showCompleted, priorityFilter, dateFilter, ownerFilter]);

  const sortedTasks = useMemo(() => {
    const sorted = [...filteredTasks].sort((a, b) => {
      // If both tasks are completed, sort by completion time (newest first)
      if (a.status === 'done' && b.status === 'done') {
        const aCompletedAt = a.completedAt ?? 0;
        const bCompletedAt = b.completedAt ?? 0;
        return bCompletedAt - aCompletedAt;
      }

      // Non-completed tasks: sort by due date first
      const aDueDate = a.dueDate ?? Infinity;
      const bDueDate = b.dueDate ?? Infinity;

      if (aDueDate !== bDueDate) {
        return aDueDate - bDueDate;
      }

      // Then by priority
      const aPriority = a.priority === 'high' ? 3 : a.priority === 'medium' ? 2 : a.priority === 'low' ? 1 : 0;
      const bPriority = b.priority === 'high' ? 3 : b.priority === 'medium' ? 2 : b.priority === 'low' ? 1 : 0;

      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }

      // Finally by creation time
      return b.createdAt - a.createdAt;
    });
    console.log('[任务过滤] 总任务数:', tasks.length, '过滤后:', filteredTasks.length, '排序后:', sorted.length);
    return sorted;
  }, [filteredTasks, tasks.length]);

  const handleAddTask = async (taskData: Omit<Task, 'id' | 'createdAt'>) => {
    console.log('=== [创建任务] 开始 ===');
    console.log('[创建任务] 任务数据:', JSON.stringify(taskData, null, 2));
    console.log('[创建任务] 当前任务列表长度:', tasks.length);

    const hasOwner = taskData.tags?.some(tag => tag.startsWith('负责人:'));
    const finalTags = hasOwner ? taskData.tags : [...(taskData.tags || []), '负责人:阿伟'];

    const optimisticTask: Task = {
      id: crypto.randomUUID(),
      ...taskData,
      tags: finalTags,
      createdAt: Date.now()
    };

    console.log('[创建任务] 创建乐观任务:', optimisticTask.id, optimisticTask.title);

    const newTasks = [optimisticTask, ...tasks];
    console.log('[创建任务] 更新任务列表，新长度:', newTasks.length);
    setTasks(newTasks);
    saveTasksToLocal(newTasks);
    setToast({ message: '任务已创建', type: 'created' });

    setHighlightedTaskId(optimisticTask.id);
    setTimeout(() => {
      const element = taskRefs.current.get(optimisticTask.id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
    setTimeout(() => setHighlightedTaskId(null), 2000);

    if (isOfflineMode) {
      console.log('[创建任务] 离线模式，仅保存到本地');
      console.log('=== [创建任务] 完成（离线）===');
      return;
    }

    console.log('[创建任务] 调用数据库服务...');
    const taskDataWithOwner = { ...taskData, tags: finalTags };
    const result = await databaseService.createTask(taskDataWithOwner);
    console.log('[创建任务] 数据库响应:', result.error ? '错误' : '成功', result.isOffline ? '(离线)' : '(在线)');

    if (result.error || result.isOffline) {
      console.error('[创建任务] ❌ 失败:', result.error?.message);

      if (result.isOffline) {
        setIsOfflineMode(true);
        console.log('[创建任务] 数据库离线，任务已保存到本地');
      } else {
        console.log('[创建任务] 回滚乐观更新');
        setTasks(currentTasks => {
          const updatedTasks = currentTasks.filter(t => t.id !== optimisticTask.id);
          console.log('[创建任务] 回滚后任务列表长度:', updatedTasks.length);
          saveTasksToLocal(updatedTasks);
          return updatedTasks;
        });
        setToast({ message: `创建失败: ${result.error?.message}`, type: 'updated' });
      }
      console.log('=== [创建任务] 完成（失败）===');
      return;
    }

    if (result.data) {
      console.log('[创建任务] ✓ 成功，数据库ID:', result.data.id);
      console.log('[创建任务] 替换乐观任务ID:', optimisticTask.id, '-> ', result.data.id);

      const newTask = result.data;
      setTasks(currentTasks => {
        const updatedTasks = currentTasks.map(t => t.id === optimisticTask.id ? newTask : t);
        console.log('[创建任务] 更新后任务列表长度:', updatedTasks.length);
        console.log('[创建任务] 找到并替换了乐观任务:', updatedTasks.some(t => t.id === newTask.id));
        saveTasksToLocal(updatedTasks);
        return updatedTasks;
      });

      setHighlightedTaskId(newTask.id);
      setTimeout(() => {
        const element = taskRefs.current.get(newTask.id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      setTimeout(() => setHighlightedTaskId(null), 2000);

      const ownerTag = finalTags?.find(tag => tag.startsWith('负责人:'));
      const userInfo = ownerTag ? ownerTag.replace('负责人:', '') : '';
      await databaseService.logOperation(
        'created',
        newTask.id,
        newTask.title,
        {
          priority: newTask.priority,
          status: newTask.status,
          dueDate: newTask.dueDate
        },
        userInfo
      );

      sendTaskCreatedNotification(newTask).catch(err => {
        console.warn('[创建任务] Feishu notification failed:', err);
      });

      console.log('=== [创建任务] 完成（成功）===');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    console.log('=== [删除任务] 开始 ===');
    console.log('[删除任务] ID:', taskId);

    let deletedTaskRef: Task | undefined;
    deletedTaskRef = tasks.find(t => t.id === taskId);
    console.log('[删除任务] 找到任务:', deletedTaskRef ? deletedTaskRef.title : '未找到');

    setDeleteConfirmData(null);

    setDeletingTaskId(taskId);
    console.log('[删除任务] 触发动画，等待400ms...');

    await new Promise(resolve => setTimeout(resolve, 400));

    setTasks(currentTasks => {
      console.log('[删除任务] 当前任务列表长度:', currentTasks.length);
      const newTasks = currentTasks.filter(task => task.id !== taskId);
      console.log('[删除任务] 从状态删除，新列表长度:', newTasks.length);
      saveTasksToLocal(newTasks);
      return newTasks;
    });

    setDeletingTaskId(null);
    console.log('[删除任务] 动画完成，重置状态');

    if (isOfflineMode) {
      console.log('[删除任务] 离线模式，仅从本地删除');
      console.log('=== [删除任务] 完成（离线）===');
      return;
    }

    console.log('[删除任务] 调用数据库服务...');
    const result = await databaseService.deleteTask(taskId);

    if (result.error || result.isOffline) {
      console.error('[删除任务] ❌ 失败:', result.error?.message);

      if (deletedTaskRef) {
        console.log('[删除任务] 恢复已删除的任务');
        setTasks(currentTasks => {
          const restoredTasks = [...currentTasks, deletedTaskRef!];
          saveTasksToLocal(restoredTasks);
          return restoredTasks;
        });
      }

      if (result.isOffline) {
        setIsOfflineMode(true);
      } else {
        setToast({ message: '删除失败', type: 'updated' });
      }
      console.log('=== [删除任务] 完成（失败）===');
    } else {
      console.log('[删除任务] ✓ 成功');

      if (deletedTaskRef) {
        const ownerTag = deletedTaskRef.tags?.find(tag => tag.startsWith('负责人:'));
        const userInfo = ownerTag ? ownerTag.replace('负责人:', '') : '';
        await databaseService.logOperation(
          'deleted',
          taskId,
          deletedTaskRef.title,
          {
            priority: deletedTaskRef.priority,
            status: deletedTaskRef.status
          },
          userInfo
        );

        sendTaskDeletedNotification(deletedTaskRef).catch(err => {
          console.warn('[删除任务] Feishu notification failed:', err);
        });
      }

      setToast({ message: '任务已删除', type: 'updated' });
      console.log('=== [删除任务] 完成（成功）===');
    }
  };

  const handleDeleteClick = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      setDeleteConfirmData({ taskId, taskTitle: task.title });
    }
  };

  const handleUpdateTask = async (updatedTask: Task) => {
    console.log('=== [更新任务] 开始 ===');
    console.log('[更新任务] ID:', updatedTask.id);
    console.log('[更新任务] 更新数据:', JSON.stringify(updatedTask, null, 2));

    let oldTaskRef: Task | undefined;

    setTasks(currentTasks => {
      console.log('[更新任务] 当前任务列表长度:', currentTasks.length);
      oldTaskRef = currentTasks.find(t => t.id === updatedTask.id);
      console.log('[更新任务] 找到原任务:', oldTaskRef ? oldTaskRef.title : '未找到');

      const updatedTasks = currentTasks.map(task => task.id === updatedTask.id ? updatedTask : task);
      console.log('[更新任务] 乐观更新，列表长度:', updatedTasks.length);
      saveTasksToLocal(updatedTasks);
      return updatedTasks;
    });

    setToast({ message: '任务已更新', type: 'updated' });

    setHighlightedTaskId(updatedTask.id);
    setTimeout(() => {
      const element = taskRefs.current.get(updatedTask.id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
    setTimeout(() => setHighlightedTaskId(null), 2000);

    if (isOfflineMode) {
      console.log('[更新任务] 离线模式，仅保存到本地');
      console.log('=== [更新任务] 完成（离线）===');
      return;
    }

    console.log('[更新任务] 调用数据库服务...');
    const result = await databaseService.updateTask(updatedTask.id, updatedTask);

    if (result.error || result.isOffline) {
      console.error('[更新任务] ❌ 失败:', result.error?.message);

      if (oldTaskRef) {
        console.log('[更新任务] 回滚到原任务');
        const oldTask = oldTaskRef;
        setTasks(currentTasks => {
          const restoredTasks = currentTasks.map(task => task.id === updatedTask.id ? oldTask : task);
          saveTasksToLocal(restoredTasks);
          return restoredTasks;
        });
      }

      if (result.isOffline) {
        setIsOfflineMode(true);
      } else {
        setToast({ message: `更新失败: ${result.error?.message}`, type: 'updated' });
      }
      console.log('=== [更新任务] 完成（失败）===');
    } else {
      console.log('[更新任务] ✓ 成功');

      if (oldTaskRef) {
        const changes: Record<string, unknown> = {};
        if (oldTaskRef.status !== updatedTask.status) {
          changes.statusChanged = true;
          changes.oldStatus = oldTaskRef.status;
          changes.newStatus = updatedTask.status;
        }
        if (oldTaskRef.priority !== updatedTask.priority) {
          changes.priorityChanged = true;
          changes.oldPriority = oldTaskRef.priority;
          changes.newPriority = updatedTask.priority;
        }
        if (oldTaskRef.title !== updatedTask.title) {
          changes.titleChanged = true;
        }
        if (oldTaskRef.description !== updatedTask.description) {
          changes.descriptionChanged = true;
        }
        if (oldTaskRef.dueDate !== updatedTask.dueDate) {
          changes.dueDateChanged = true;
        }
        if (JSON.stringify(oldTaskRef.tags) !== JSON.stringify(updatedTask.tags)) {
          changes.tagsChanged = true;
        }

        const ownerTag = updatedTask.tags?.find(tag => tag.startsWith('负责人:'));
        const userInfo = ownerTag ? ownerTag.replace('负责人:', '') : '';
        await databaseService.logOperation(
          'updated',
          updatedTask.id,
          updatedTask.title,
          changes,
          userInfo
        );

        const wasCompleted = oldTaskRef.status !== 'done' && updatedTask.status === 'done';
        if (wasCompleted) {
          sendTaskCompletedNotification(updatedTask).catch(err => {
            console.warn('[更新任务] Feishu completion notification failed:', err);
          });
        } else {
          sendTaskUpdatedNotification(oldTaskRef, updatedTask).catch(err => {
            console.warn('[更新任务] Feishu update notification failed:', err);
          });
        }
      }

      console.log('=== [更新任务] 完成（成功）===');
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      await handleUpdateTask({ ...task, status: 'done' });
    }
  };

  const handleTextSubmit = async (text: string) => {
    console.log('===========================================');
    console.log('[handleTextSubmit] 被调用！');
    console.log('[handleTextSubmit] 输入文本:', text);
    console.log('[handleTextSubmit] 文本长度:', text.length);
    console.log('[handleTextSubmit] 当前时间:', new Date().toISOString());
    console.log('===========================================');

    setToast({ message: '正在处理...', type: 'processing' });

    let result;
    try {
      console.log('尝试使用 Gemini AI...');
      result = await parseTaskIntentGemini(text, tasks);
      console.log('✓ AI 分析成功');
    } catch (error) {
      console.log('AI 失败，使用本地解析器');
      result = await parseTaskIntentLocal(text, tasks);
    }
    console.log('分析结果:', result);

    const taskData = result.newTask || parseVoiceInput(text);
    if (taskData.title) {
      handleAddTask(taskData as Omit<Task, 'id' | 'createdAt'>);
    }
  };


  const handleImport = async (importedTasks: Task[], mode: 'merge' | 'replace') => {
    try {
      console.log('[导入任务] 模式:', mode, '任务数:', importedTasks.length);

      if (isOfflineMode) {
        console.log('[导入任务] 离线模式，仅保存到本地');
        let newTasks: Task[];
        let uniqueImportedCount = 0;

        if (mode === 'replace') {
          newTasks = importedTasks;
          uniqueImportedCount = importedTasks.length;
        } else {
          const existingIds = new Set(tasks.map(t => t.id));
          const uniqueImported = importedTasks.filter(t => !existingIds.has(t.id));
          newTasks = [...tasks, ...uniqueImported];
          uniqueImportedCount = uniqueImported.length;
        }

        setTasks(newTasks);
        saveTasksToLocal(newTasks);

        setToast({
          message: mode === 'replace'
            ? `已替换 ${importedTasks.length} 个任务`
            : `已导入 ${uniqueImportedCount} 个新任务`,
          type: 'updated'
        });
        return;
      }

      setToast({ message: '正在导入...', type: 'processing' });

      for (const task of importedTasks) {
        console.log('[导入任务] 创建任务:', task.title);
        await databaseService.createTask({
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          dueDate: task.dueDate,
          tags: task.tags
        });
      }

      console.log('[导入任务] 重新加载任务列表...');
      await loadTasks('import-complete');

      setToast({
        message: `成功导入 ${importedTasks.length} 个任务`,
        type: 'updated'
      });

      console.log('[导入任务] ✓ 完成');
    } catch (error) {
      console.error('[导入任务] ❌ 错误:', error);
      setToast({ message: '导入失败', type: 'updated' });
    }
  };

  return (
    <div className="min-h-screen pb-32">
      <header className={`glass-effect shadow-lg border-b-2 border-primary-200 sticky top-0 z-10 transition-transform duration-300 ${
        isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
      }`}>
        <div className="max-w-4xl mx-auto px-4 py-5 md:px-6 md:py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-primary-400 to-primary-600 p-2 rounded-2xl shadow-lg transform hover:rotate-12 transition-transform duration-300">
                <ListTodo size={28} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent">米米任务</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className="flex items-center gap-1.5 bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-800 p-2 rounded-xl text-sm font-medium transition-all duration-300 border border-gray-200 hover:border-gray-300"
                  title="更多"
                >
                  <MoreVertical size={20} />
                </button>

                {showMoreMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setShowMoreMenu(false)}
                    />
                    <div className="absolute top-full right-0 mt-2 bg-white border-2 border-primary-200 rounded-2xl shadow-xl overflow-hidden z-40 w-48 animate-slide-up">
                      <button
                        onClick={() => {
                          setShowOperationLogsModal(true);
                          setShowMoreMenu(false);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-orange-50 text-sm text-gray-700 transition-all duration-200 font-medium flex items-center gap-2"
                      >
                        <History size={16} className="text-primary-500" />
                        操作记录
                      </button>
                      <button
                        onClick={() => {
                          setShowImportExportModal(true);
                          setShowMoreMenu(false);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-orange-50 text-sm text-gray-700 transition-all duration-200 font-medium flex items-center gap-2"
                      >
                        <Download size={16} className="text-primary-500" />
                        导入/导出
                      </button>
                      <button
                        onClick={() => {
                          setShowOwnerManagementModal(true);
                          setShowMoreMenu(false);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-orange-50 text-sm text-gray-700 transition-all duration-200 font-medium flex items-center gap-2"
                      >
                        <Users size={16} className="text-primary-500" />
                        人员维护
                      </button>
                    </div>
                  </>
                )}
              </div>
              <NetworkStatus
                isOffline={isOfflineMode}
                onReconnect={async () => {
                  console.log('[重新连接] 开始尝试重新连接...');
                  setToast({ message: '正在重新连接...', type: 'processing' });

                  const wasOffline = isOfflineMode;
                  await loadTasks('reconnect');

                  setTimeout(() => {
                    if (!isOfflineMode && wasOffline) {
                      console.log('[重新连接] ✓ 连接成功');
                      setToast({ message: '已重新连接', type: 'updated' });
                    } else if (isOfflineMode) {
                      console.log('[重新连接] ✗ 连接失败，保持离线模式');
                      setToast({ message: '无法连接到服务器，使用本地数据', type: 'updated' });
                    }
                  }, 100);
                }}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="relative group">
              <Search size={22} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-primary-400 md:w-5 md:h-5 transition-colors group-focus-within:text-primary-600" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索任务..."
                className="w-full pl-10 pr-4 py-3 md:py-2 border-2 border-primary-200 rounded-2xl focus:ring-4 focus:ring-primary-200 focus:border-primary-500 text-base transition-all duration-300 bg-white shadow-md focus:shadow-lg"
              />
            </div>

            <div className="flex gap-3 md:gap-2">
              <button
                onClick={() => setShowCompleted(false)}
                className={`flex-1 py-3 md:py-2 px-4 rounded-2xl transition-all duration-300 text-base font-semibold active:scale-95 shadow-md hover:shadow-lg ${
                  !showCompleted
                    ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-primary-300'
                    : 'bg-white text-gray-600 hover:bg-gradient-to-r hover:from-orange-50 hover:to-amber-50'
                }`}
              >
                进行中
              </button>
              <button
                onClick={() => setShowCompleted(true)}
                className={`flex-1 py-3 md:py-2 px-4 rounded-2xl transition-all duration-300 text-base font-semibold active:scale-95 shadow-md hover:shadow-lg ${
                  showCompleted
                    ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-primary-300'
                    : 'bg-white text-gray-600 hover:bg-gradient-to-r hover:from-orange-50 hover:to-amber-50'
                }`}
              >
                已完成
              </button>
            </div>

            <div className="flex gap-3 md:gap-2">
              <button
                onClick={() => setViewMode('list')}
                className={`flex-1 py-2.5 md:py-2 px-4 rounded-xl transition-all duration-300 text-sm font-medium active:scale-95 shadow-sm hover:shadow-md flex items-center justify-center gap-2 ${
                  viewMode === 'list'
                    ? 'bg-gradient-to-r from-gray-700 to-gray-800 text-white'
                    : 'bg-white text-gray-600 hover:bg-gradient-to-r hover:from-orange-50 hover:to-amber-50'
                }`}
              >
                <ListTodo size={16} />
                <span>列表视图</span>
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex-1 py-2.5 md:py-2 px-4 rounded-xl transition-all duration-300 text-sm font-medium active:scale-95 shadow-sm hover:shadow-md flex items-center justify-center gap-2 ${
                  viewMode === 'calendar'
                    ? 'bg-gradient-to-r from-gray-700 to-gray-800 text-white'
                    : 'bg-white text-gray-600 hover:bg-gradient-to-r hover:from-orange-50 hover:to-amber-50'
                }`}
              >
                <Calendar size={16} />
                <span>月度视图</span>
              </button>
            </div>

            <div className="flex gap-3 md:gap-2">
              <button
                onClick={() => {
                  setDateFilter('all');
                  setPriorityFilter('all');
                  setOwnerFilter('all');
                }}
                className={`flex-1 py-2.5 md:py-1.5 px-3 rounded-xl text-base md:text-sm transition-all duration-300 active:scale-95 font-medium shadow-sm hover:shadow-md ${
                  dateFilter === 'all' && priorityFilter === 'all' && ownerFilter === 'all'
                    ? 'bg-gradient-to-r from-gray-700 to-gray-800 text-white'
                    : 'bg-white text-gray-600 hover:bg-gradient-to-r hover:from-orange-50 hover:to-amber-50'
                }`}
              >
                全部
              </button>

              <div className="relative flex-1">
                <button
                  onClick={() => setShowPriorityMenu(!showPriorityMenu)}
                  className={`w-full py-2.5 md:py-1.5 px-3 rounded-xl text-base md:text-sm transition-all duration-300 active:scale-95 flex items-center justify-center gap-1 font-medium shadow-sm hover:shadow-md ${
                    priorityFilter !== 'all'
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gradient-to-r hover:from-orange-50 hover:to-amber-50'
                  }`}
                >
                  <span>{priorityFilter === 'all' ? '优先级' : priorityFilter === 'high' ? '高优先级' : priorityFilter === 'medium' ? '中优先级' : '低优先级'}</span>
                  <ChevronDown size={16} className={`transition-transform ${
                    showPriorityMenu ? 'rotate-180' : ''
                  }`} />
                </button>

                {showPriorityMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setShowPriorityMenu(false)}
                    />
                    <div className="absolute top-full mt-1 left-0 right-0 bg-white border-2 border-primary-200 rounded-2xl shadow-xl overflow-hidden z-40 animate-slide-up">
                      <button
                        onClick={() => {
                          setPriorityFilter('all');
                          setShowPriorityMenu(false);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-orange-50 text-sm text-gray-700 transition-all duration-200 font-medium"
                      >
                        全部优先级
                      </button>
                      <button
                        onClick={() => {
                          setPriorityFilter('high');
                          setShowPriorityMenu(false);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-red-50 text-sm text-red-600 transition-colors"
                      >
                        高优先级
                      </button>
                      <button
                        onClick={() => {
                          setPriorityFilter('medium');
                          setShowPriorityMenu(false);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-amber-50 text-sm text-amber-600 transition-colors"
                      >
                        中优先级
                      </button>
                      <button
                        onClick={() => {
                          setPriorityFilter('low');
                          setShowPriorityMenu(false);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-green-50 text-sm text-green-600 transition-colors"
                      >
                        低优先级
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div className="relative flex-1">
                <button
                  onClick={() => setShowOwnerMenu(!showOwnerMenu)}
                  className={`w-full py-2.5 md:py-1.5 px-3 rounded-xl text-base md:text-sm transition-all duration-300 active:scale-95 flex items-center justify-center gap-1 font-medium shadow-sm hover:shadow-md ${
                    ownerFilter !== 'all'
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gradient-to-r hover:from-orange-50 hover:to-amber-50'
                  }`}
                >
                  <span>{ownerFilter === 'all' ? '负责人' : ownerFilter}</span>
                  <ChevronDown size={16} className={`transition-transform ${
                    showOwnerMenu ? 'rotate-180' : ''
                  }`} />
                </button>

                {showOwnerMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setShowOwnerMenu(false)}
                    />
                    <div className="absolute top-full mt-1 left-0 right-0 bg-white border-2 border-primary-200 rounded-2xl shadow-xl overflow-hidden z-40 animate-slide-up">
                      <button
                        onClick={() => {
                          setOwnerFilter('all');
                          setShowOwnerMenu(false);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-orange-50 text-sm text-gray-700 transition-all duration-200 font-medium"
                      >
                        全部负责人
                      </button>
                      {availableOwners.map(owner => (
                        <button
                          key={owner}
                          onClick={() => {
                            setOwnerFilter(owner);
                            setShowOwnerMenu(false);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-primary-50 text-sm text-primary-600 transition-all duration-200 font-medium"
                        >
                          {owner}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="relative flex-1">
                <button
                  onClick={() => setShowDateMenu(!showDateMenu)}
                  className={`w-full py-2.5 md:py-1.5 px-3 rounded-xl text-base md:text-sm transition-all duration-300 active:scale-95 flex items-center justify-center gap-1 font-medium shadow-sm hover:shadow-md ${
                    dateFilter !== 'all'
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gradient-to-r hover:from-orange-50 hover:to-amber-50'
                  }`}
                >
                  <span>
                    {dateFilter === 'all' ? '时间' :
                     dateFilter === 'today' ? '今天' :
                     dateFilter === 'thisWeek' ? '本周' : '无时间'}
                  </span>
                  <ChevronDown size={16} className={`transition-transform ${
                    showDateMenu ? 'rotate-180' : ''
                  }`} />
                </button>

                {showDateMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setShowDateMenu(false)}
                    />
                    <div className="absolute top-full mt-1 left-0 right-0 bg-white border-2 border-primary-200 rounded-2xl shadow-xl overflow-hidden z-40 animate-slide-up">
                      <button
                        onClick={() => {
                          setDateFilter('all');
                          setShowDateMenu(false);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-orange-50 text-sm text-gray-700 transition-all duration-200 font-medium"
                      >
                        全部时间
                      </button>
                      <button
                        onClick={() => {
                          setDateFilter('today');
                          setShowDateMenu(false);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-primary-50 text-sm text-primary-600 transition-all duration-200 font-medium"
                      >
                        今天
                      </button>
                      <button
                        onClick={() => {
                          setDateFilter('thisWeek');
                          setShowDateMenu(false);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-primary-50 text-sm text-primary-600 transition-all duration-200 font-medium"
                      >
                        本周
                      </button>
                      <button
                        onClick={() => {
                          setDateFilter('noDate');
                          setShowDateMenu(false);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-primary-50 text-sm text-primary-600 transition-all duration-200 font-medium"
                      >
                        无时间
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6">
        {loadingTasks ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-200"></div>
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-500 border-t-transparent absolute top-0 left-0"></div>
            </div>
            <p className="text-primary-600 font-medium animate-pulse">加载中...</p>
          </div>
        ) : viewMode === 'calendar' ? (
          <MonthlyCalendarView
            tasks={filteredTasks}
            milestones={milestones}
            onTaskUpdate={handleUpdateTask}
            onTaskDelete={handleDeleteTask}
            onTaskComplete={handleCompleteTask}
            onTaskCreate={handleQuickCreateTask}
            onMilestoneCreate={handleCreateMilestone}
            onMilestoneUpdate={handleUpdateMilestone}
            onMilestoneDelete={handleDeleteMilestone}
            availableOwners={availableOwners}
          />
        ) : sortedTasks.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <div className="mb-4">
              <div className="inline-block p-6 bg-gradient-to-br from-primary-100 to-accent-100 rounded-full mb-4 shadow-lg">
                <ListTodo size={48} className="text-primary-500" />
              </div>
            </div>
            <p className="text-gray-600 text-lg font-medium">
              {searchQuery
                ? '未找到匹配的任务'
                : showCompleted
                ? '暂无已完成的任务'
                : '暂无任务，使用下方输入框或语音创建新任务'}
            </p>
          </div>
        ) : (
          <div className="space-y-4 md:space-y-3">
            {sortedTasks.map(task => (
              <div
                key={task.id}
                ref={(el) => {
                  if (el) {
                    taskRefs.current.set(task.id, el);
                  } else {
                    taskRefs.current.delete(task.id);
                  }
                }}
                className={`transition-all duration-500 ${
                  highlightedTaskId === task.id
                    ? 'ring-4 ring-primary-400 ring-opacity-50 rounded-2xl scale-[1.02] shadow-xl'
                    : ''
                }`}
              >
                <TaskCard
                  task={task}
                  onDelete={() => handleDeleteClick(task.id)}
                  onUpdate={handleUpdateTask}
                  onComplete={() => handleCompleteTask(task.id)}
                  isDeleting={deletingTaskId === task.id}
                  availableOwners={availableOwners}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      <TextInput onSubmit={handleTextSubmit} />

      {deleteConfirmData && (
        <DeleteConfirmModal
          isOpen={true}
          taskTitle={deleteConfirmData.taskTitle}
          onConfirm={() => handleDeleteTask(deleteConfirmData.taskId)}
          onCancel={() => setDeleteConfirmData(null)}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <ImportExportModal
        isOpen={showImportExportModal}
        onClose={() => setShowImportExportModal(false)}
        tasks={tasks}
        onImport={handleImport}
      />

      <OperationLogsModal
        isOpen={showOperationLogsModal}
        onClose={() => setShowOperationLogsModal(false)}
      />

      <OwnerManagementModal
        isOpen={showOwnerManagementModal}
        onClose={() => {
          setShowOwnerManagementModal(false);
          loadOwners();
        }}
      />
    </div>
  );
}

export default App;
