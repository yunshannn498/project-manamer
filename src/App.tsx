import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Task } from './types';
import { TaskCard } from './components/TaskCard';
import { TextInput } from './components/TextInput';
import { parseVoiceInput } from './utils/taskParser';
import { findMatchingTasks } from './utils/taskMatcher';
import { EditConfirmModal } from './components/EditConfirmModal';
import TaskSelectionModal from './components/TaskSelectionModal';
import DeleteConfirmModal from './components/DeleteConfirmModal';
import Toast, { ToastType } from './components/Toast';
import { parseTaskIntent as parseTaskIntentGemini } from './services/geminiParser';
import { parseTaskIntent as parseTaskIntentLocal } from './services/semanticParser';
import { testDatabaseConnection } from './lib/supabase';
import { databaseService } from './services/databaseService';
import { saveTasksToLocal, loadTasksFromLocal } from './storage';
import { ListTodo, Search, ChevronDown, Download } from 'lucide-react';
import NetworkStatus from './components/NetworkStatus';
import ImportExportModal from './components/ImportExportModal';

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'thisWeek' | 'noDate'>('all');
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [editConfirmData, setEditConfirmData] = useState<{
    voiceText: string;
    matches: ReturnType<typeof findMatchingTasks>;
  } | null>(null);
  const [taskSelectionData, setTaskSelectionData] = useState<{
    tasks: Task[];
    updates: Partial<Task>;
  } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [deleteConfirmData, setDeleteConfirmData] = useState<{ taskId: string; taskTitle: string } | null>(null);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);
  const [showImportExportModal, setShowImportExportModal] = useState(false);
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
      } else {
        console.log('[初始化] ✓ 数据库连接成功');
        await loadTasks('initial');
      }
    };

    initializeApp();

    return () => {
      if (loadTasksTimerRef.current) {
        clearTimeout(loadTasksTimerRef.current);
      }
    };
  }, []);

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

      setTasks(loadedTasks);
      saveTasksToLocal(loadedTasks);
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
    console.log('[任务过滤] 过滤条件 - 完成状态:', showCompleted, '优先级:', priorityFilter, '日期:', dateFilter, '搜索:', searchQuery);

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
  }, [tasks, searchQuery, showCompleted, priorityFilter, dateFilter]);

  const sortedTasks = useMemo(() => {
    const sorted = [...filteredTasks].sort((a, b) => {
      const aDueDate = a.dueDate ?? Infinity;
      const bDueDate = b.dueDate ?? Infinity;

      if (aDueDate !== bDueDate) {
        return aDueDate - bDueDate;
      }

      const aPriority = a.priority === 'high' ? 3 : a.priority === 'medium' ? 2 : a.priority === 'low' ? 1 : 0;
      const bPriority = b.priority === 'high' ? 3 : b.priority === 'medium' ? 2 : b.priority === 'low' ? 1 : 0;

      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }

      return b.createdAt - a.createdAt;
    });
    console.log('[任务过滤] 总任务数:', tasks.length, '过滤后:', filteredTasks.length, '排序后:', sorted.length);
    return sorted;
  }, [filteredTasks, tasks.length]);

  const handleAddTask = async (taskData: Omit<Task, 'id' | 'createdAt'>) => {
    console.log('=== [创建任务] 开始 ===');
    console.log('[创建任务] 任务数据:', JSON.stringify(taskData, null, 2));
    console.log('[创建任务] 当前任务列表长度:', tasks.length);

    const optimisticTask: Task = {
      id: crypto.randomUUID(),
      ...taskData,
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
    const result = await databaseService.createTask(taskData);
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

      setTasks(currentTasks => {
        const updatedTasks = currentTasks.map(t => t.id === optimisticTask.id ? result.data : t);
        console.log('[创建任务] 更新后任务列表长度:', updatedTasks.length);
        console.log('[创建任务] 找到并替换了乐观任务:', updatedTasks.some(t => t.id === result.data.id));
        saveTasksToLocal(updatedTasks);
        return updatedTasks;
      });

      setHighlightedTaskId(result.data.id);
      setTimeout(() => {
        const element = taskRefs.current.get(result.data.id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      setTimeout(() => setHighlightedTaskId(null), 2000);
      console.log('=== [创建任务] 完成（成功）===');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    console.log('=== [删除任务] 开始 ===');
    console.log('[删除任务] ID:', taskId);

    let deletedTaskRef: Task | undefined;

    setTasks(currentTasks => {
      console.log('[删除任务] 当前任务列表长度:', currentTasks.length);
      deletedTaskRef = currentTasks.find(t => t.id === taskId);
      console.log('[删除任务] 找到任务:', deletedTaskRef ? deletedTaskRef.title : '未找到');

      const newTasks = currentTasks.filter(task => task.id !== taskId);
      console.log('[删除任务] 乐观删除，新列表长度:', newTasks.length);
      saveTasksToLocal(newTasks);
      return newTasks;
    });

    setDeleteConfirmData(null);

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
        setTasks(currentTasks => {
          const restoredTasks = currentTasks.map(task => task.id === updatedTask.id ? oldTaskRef : task);
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

    console.log('=== AI 语义分析 ===');
    console.log('原始输入:', text);

    let result;
    try {
      console.log('尝试使用 Gemini AI...');
      result = await parseTaskIntentGemini(text, tasks);
      if (result.confidence === 0) {
        throw new Error('Gemini returned low confidence, fallback to local');
      }
      console.log('✓ Gemini AI 分析成功');
    } catch (error) {
      console.log('Gemini 失败，使用本地解析器');
      result = await parseTaskIntentLocal(text, tasks);
    }
    console.log('AI 分析结果:', result);

    if (result.intent === 'edit' && result.updates) {
      console.log('[编辑判断] 检测到编辑意图');
      console.log('[编辑判断] needsConfirmation:', result.needsConfirmation);
      console.log('[编辑判断] taskToEdit:', result.taskToEdit);
      console.log('[编辑判断] updates:', result.updates);

      if (result.needsConfirmation && result.suggestedTasks) {
        console.log('[编辑判断] 需要用户选择任务，显示选择弹窗');
        setTaskSelectionData({
          tasks: result.suggestedTasks,
          updates: result.updates
        });
      } else if (result.taskToEdit) {
        const task = tasks.find(t => t.id === result.taskToEdit);
        console.log('[编辑判断] 查找任务结果:', task ? `找到: ${task.title}` : '未找到');
        if (task) {
          console.log('[编辑判断] 执行编辑操作，更新内容:', result.updates);
          handleUpdateTask({
            ...task,
            ...result.updates
          });
        } else {
          console.log('[编辑判断] 未找到要编辑的任务，创建新任务');
          const taskData = result.newTask || parseVoiceInput(text);
          if (taskData.title) {
            handleAddTask(taskData as Omit<Task, 'id' | 'createdAt'>);
          }
        }
      } else {
        console.log('[编辑判断] ⚠️ 编辑意图但没有taskToEdit和needsConfirmation，创建新任务');
        const taskData = result.newTask || parseVoiceInput(text);
        if (taskData.title) {
          handleAddTask(taskData as Omit<Task, 'id' | 'createdAt'>);
        }
      }
    } else {
      console.log('[编辑判断] 创建新任务意图');
      const taskData = result.newTask || parseVoiceInput(text);
      if (taskData.title) {
        handleAddTask(taskData as Omit<Task, 'id' | 'createdAt'>);
      }
    }
  };

  const handleEditConfirm = (taskId: string, updates: Partial<Task>) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      handleUpdateTask({ ...task, ...updates });
    }
    setEditConfirmData(null);
  };

  const handleImport = async (importedTasks: Task[], mode: 'merge' | 'replace') => {
    try {
      console.log('[导入任务] 模式:', mode, '任务数:', importedTasks.length);

      if (isOfflineMode) {
        console.log('[导入任务] 离线模式，仅保存到本地');
        let newTasks: Task[];

        if (mode === 'replace') {
          newTasks = importedTasks;
        } else {
          const existingIds = new Set(tasks.map(t => t.id));
          const uniqueImported = importedTasks.filter(t => !existingIds.has(t.id));
          newTasks = [...tasks, ...uniqueImported];
        }

        setTasks(newTasks);
        saveTasksToLocal(newTasks);

        setToast({
          message: mode === 'replace'
            ? `已替换 ${importedTasks.length} 个任务`
            : `已导入 ${uniqueImported.length} 个新任务`,
          type: 'added'
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
        type: 'added'
      });

      console.log('[导入任务] ✓ 完成');
    } catch (error) {
      console.error('[导入任务] ❌ 错误:', error);
      setToast({ message: '导入失败', type: 'updated' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 pb-32">
      <header className={`bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10 transition-transform duration-300 ${
        isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
      }`}>
        <div className="max-w-4xl mx-auto px-4 py-5 md:px-6 md:py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <ListTodo size={28} className="text-blue-500" />
              <div>
                <h1 className="text-2xl font-bold text-gray-800">任务管理</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowImportExportModal(true)}
                className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              >
                <Download size={16} />
                <span className="hidden md:inline">导入/导出</span>
              </button>
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
            <div className="relative">
              <Search size={22} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 md:w-5 md:h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索任务..."
                className="w-full pl-10 pr-4 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              />
            </div>

            <div className="flex gap-3 md:gap-2">
              <button
                onClick={() => setShowCompleted(false)}
                className={`flex-1 py-3 md:py-2 px-4 rounded-lg transition-colors text-base active:scale-95 ${
                  !showCompleted
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                进行中
              </button>
              <button
                onClick={() => setShowCompleted(true)}
                className={`flex-1 py-3 md:py-2 px-4 rounded-lg transition-colors text-base active:scale-95 ${
                  showCompleted
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                已完成
              </button>
            </div>

            <div className="flex gap-3 md:gap-2">
              <button
                onClick={() => setDateFilter('all')}
                className={`flex-1 py-2.5 md:py-1.5 px-3 rounded-lg text-base md:text-sm transition-colors active:scale-95 ${
                  dateFilter === 'all'
                    ? 'bg-gray-700 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                全部
              </button>

              <div className="relative flex-1">
                <button
                  onClick={() => setShowPriorityMenu(!showPriorityMenu)}
                  className={`w-full py-2.5 md:py-1.5 px-3 rounded-lg text-base md:text-sm transition-colors active:scale-95 flex items-center justify-center gap-1 ${
                    priorityFilter !== 'all'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                      className="fixed inset-0 z-10"
                      onClick={() => setShowPriorityMenu(false)}
                    />
                    <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-20">
                      <button
                        onClick={() => {
                          setPriorityFilter('all');
                          setShowPriorityMenu(false);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 text-sm text-gray-700 transition-colors"
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

              <button
                onClick={() => setDateFilter('today')}
                className={`flex-1 py-2.5 md:py-1.5 px-3 rounded-lg text-base md:text-sm transition-colors active:scale-95 ${
                  dateFilter === 'today'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                今天
              </button>
              <button
                onClick={() => setDateFilter('thisWeek')}
                className={`flex-1 py-2.5 md:py-1.5 px-3 rounded-lg text-base md:text-sm transition-colors active:scale-95 ${
                  dateFilter === 'thisWeek'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                本周
              </button>
              <button
                onClick={() => setDateFilter('noDate')}
                className={`flex-1 py-2.5 md:py-1.5 px-3 rounded-lg text-base md:text-sm transition-colors active:scale-95 ${
                  dateFilter === 'noDate'
                    ? 'bg-gray-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                无时间
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6">
        {loadingTasks ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : sortedTasks.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 text-base">
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
                    ? 'ring-4 ring-blue-400 ring-opacity-50 rounded-lg scale-[1.02]'
                    : ''
                }`}
              >
                <TaskCard
                  task={task}
                  onDelete={() => handleDeleteClick(task.id)}
                  onUpdate={handleUpdateTask}
                  onComplete={() => handleCompleteTask(task.id)}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      <TextInput onSubmit={handleTextSubmit} />

      {editConfirmData && (
        <EditConfirmModal
          voiceText={editConfirmData.voiceText}
          matches={editConfirmData.matches}
          onConfirm={handleEditConfirm}
          onCancel={() => setEditConfirmData(null)}
        />
      )}

      {taskSelectionData && (
        <TaskSelectionModal
          isOpen={true}
          tasks={taskSelectionData.tasks}
          updates={taskSelectionData.updates}
          onSelect={(taskId) => {
            const task = tasks.find(t => t.id === taskId);
            if (task) {
              handleUpdateTask({ ...task, ...taskSelectionData.updates });
            }
            setTaskSelectionData(null);
          }}
          onCancel={() => setTaskSelectionData(null)}
        />
      )}

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
    </div>
  );
}

export default App;
