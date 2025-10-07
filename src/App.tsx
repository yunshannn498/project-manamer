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
import { supabase } from './lib/supabase';
import { saveTasksToLocal, loadTasksFromLocal } from './storage';
import { ListTodo, Search, WifiOff } from 'lucide-react';

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
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
  const lastScrollY = useRef(0);
  const scrollThreshold = 50;

  const loadTasksTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingOperationsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    console.log('[初始化] Supabase URL:', import.meta.env.VITE_SUPABASE_URL || '使用默认值');
    console.log('[初始化] 开始加载任务...');

    const testConnection = async () => {
      try {
        const { error } = await supabase.from('tasks').select('count').limit(1);
        if (error) {
          console.error('[连接测试] 数据库连接失败:', error);
        } else {
          console.log('[连接测试] ✓ 数据库连接正常');
        }
      } catch (err) {
        console.error('[连接测试] 连接异常:', err);
      }
    };

    testConnection();
    loadTasks('initial');

    console.log('[实时订阅] 设置任务变更监听...');
    const channel = supabase
      .channel('tasks-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
        console.log('[实时订阅] 检测到变更:', payload);
        console.log('[实时订阅] 当前待处理操作数:', pendingOperationsRef.current.size);

        if (pendingOperationsRef.current.size > 0) {
          console.log('[实时订阅] 有待处理操作，延迟加载任务');
          if (loadTasksTimerRef.current) {
            clearTimeout(loadTasksTimerRef.current);
          }
          loadTasksTimerRef.current = setTimeout(() => {
            console.log('[实时订阅] 延迟加载触发');
            loadTasks('realtime-delayed');
          }, 500);
        } else {
          console.log('[实时订阅] 无待处理操作，立即加载任务');
          loadTasks('realtime');
        }
      })
      .subscribe((status) => {
        console.log('[实时订阅] 状态:', status);
        if (status === 'SUBSCRIBED') {
          console.log('[实时订阅] ✓ 已成功订阅任务变更');
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('[实时订阅] ✗ 订阅失败（不影响基本功能）');
        } else if (status === 'TIMED_OUT') {
          console.warn('[实时订阅] ✗ 连接超时（不影响基本功能）');
        }
      });

    return () => {
      console.log('[实时订阅] 清理订阅...');
      if (loadTasksTimerRef.current) {
        clearTimeout(loadTasksTimerRef.current);
      }
      supabase.removeChannel(channel);
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
      console.log(`[加载任务-${source}] 开始请求...`, new Date().toISOString());
      console.log(`[加载任务-${source}] 当前任务数:`, tasks.length);

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error(`[加载任务-${source}] 数据库错误:`, error);
        console.log(`[加载任务-${source}] 尝试从本地加载...`);

        const localTasks = loadTasksFromLocal();
        if (localTasks && localTasks.length > 0) {
          setTasks(localTasks);
          setIsOfflineMode(true);
          setToast({ message: '离线模式：已从本地加载任务', type: 'updated' });
          console.log(`[加载任务-${source}] ✓ 已从本地加载`, localTasks.length, '条任务');
        } else {
          setIsOfflineMode(true);
          setToast({ message: '连接失败，暂无本地数据', type: 'updated' });
        }
        return;
      }

      if (!data) {
        console.warn(`[加载任务-${source}] 数据为空`);
        setTasks([]);
        return;
      }

      console.log(`[加载任务-${source}] 成功获取`, data.length, '条任务');

      const mappedTasks: Task[] = data.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        dueDate: task.due_date ? new Date(task.due_date).getTime() : undefined,
        tags: task.tags,
        createdAt: new Date(task.created_at).getTime()
      }));

      setTasks(mappedTasks);
      saveTasksToLocal(mappedTasks);
      setIsOfflineMode(false);
      console.log(`[加载任务-${source}] 状态已更新，最终任务数:`, mappedTasks.length);
    } catch (err) {
      console.error(`[加载任务-${source}] 异常:`, err);

      const localTasks = loadTasksFromLocal();
      if (localTasks && localTasks.length > 0) {
        setTasks(localTasks);
        setIsOfflineMode(true);
        setToast({ message: '离线模式：已从本地加载任务', type: 'updated' });
        console.log(`[加载任务-${source}] ✓ 异常恢复，已从本地加载`, localTasks.length, '条任务');
      } else {
        setIsOfflineMode(true);
        setToast({ message: '连接失败，暂无本地数据', type: 'updated' });
      }
    } finally {
      setLoadingTasks(false);
    }
  };

  const filteredTasks = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    let filtered = showCompleted
      ? tasks.filter(task => task.status === 'done')
      : tasks.filter(task => task.status !== 'done');

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(task => task.priority === priorityFilter);
    }

    if (query) {
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        task.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [tasks, searchQuery, showCompleted, priorityFilter]);

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
    const operationId = crypto.randomUUID().substring(0, 8);
    console.log(`[handleAddTask-${operationId}] 开始创建任务`);
    console.log(`[handleAddTask-${operationId}] 任务数据:`, taskData);

    pendingOperationsRef.current.add(operationId);
    console.log(`[handleAddTask-${operationId}] 注册待处理操作，当前数量:`, pendingOperationsRef.current.size);

    const optimisticTask: Task = {
      id: crypto.randomUUID(),
      ...taskData,
      createdAt: Date.now()
    };

    console.log(`[handleAddTask-${operationId}] 乐观更新，临时ID:`, optimisticTask.id);

    const newTasks = [optimisticTask, ...tasks];
    setTasks(newTasks);
    saveTasksToLocal(newTasks);
    console.log(`[handleAddTask-${operationId}] ✓ 乐观更新完成，当前任务数:`, newTasks.length);
    setToast({ message: '任务已创建', type: 'created' });

    if (isOfflineMode) {
      console.log(`[handleAddTask-${operationId}] 离线模式，任务已保存到本地`);
      pendingOperationsRef.current.delete(operationId);
      return;
    }

    console.log(`[handleAddTask-${operationId}] 开始数据库插入...`);
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title: taskData.title,
        description: taskData.description || '',
        status: taskData.status,
        priority: taskData.priority,
        due_date: taskData.dueDate ? new Date(taskData.dueDate).toISOString() : null,
        tags: taskData.tags || []
      })
      .select()
      .single();

    if (!error && data) {
      console.log(`[handleAddTask-${operationId}] ✓ 数据库插入成功，真实ID:`, data.id);
      const newTask: Task = {
        id: data.id,
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        dueDate: data.due_date ? new Date(data.due_date).getTime() : undefined,
        tags: data.tags,
        createdAt: new Date(data.created_at).getTime()
      };

      const updatedTasks = tasks.map(t => t.id === optimisticTask.id ? newTask : t);
      setTasks(updatedTasks);
      saveTasksToLocal(updatedTasks);
      console.log(`[handleAddTask-${operationId}] ✓ ID替换完成`);
    } else {
      console.error(`[handleAddTask-${operationId}] ✗ 数据库插入失败:`, error);
      const updatedTasks = tasks.filter(t => t.id !== optimisticTask.id);
      setTasks(updatedTasks);
      saveTasksToLocal(updatedTasks);
      setToast({ message: `创建失败: ${error?.message || '未知错误'}`, type: 'updated' });
    }

    pendingOperationsRef.current.delete(operationId);
    console.log(`[handleAddTask-${operationId}] 注销待处理操作，剩余数量:`, pendingOperationsRef.current.size);
  };

  const handleDeleteTask = async (taskId: string) => {
    const deletedTask = tasks.find(t => t.id === taskId);
    const newTasks = tasks.filter(task => task.id !== taskId);
    setTasks(newTasks);
    saveTasksToLocal(newTasks);
    setDeleteConfirmData(null);

    if (isOfflineMode) {
      console.log('[离线模式] 任务已从本地删除');
      return;
    }

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error && deletedTask) {
      const restoredTasks = [...tasks, deletedTask];
      setTasks(restoredTasks);
      saveTasksToLocal(restoredTasks);
      setToast({ message: '删除失败', type: 'updated' });
    }
  };

  const handleDeleteClick = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      setDeleteConfirmData({ taskId, taskTitle: task.title });
    }
  };

  const handleUpdateTask = async (updatedTask: Task) => {
    console.log('[更新任务] 开始更新:', updatedTask.id, updatedTask.title);
    console.log('[更新任务] 更新内容:', {
      title: updatedTask.title,
      status: updatedTask.status,
      priority: updatedTask.priority,
      dueDate: updatedTask.dueDate,
      tags: updatedTask.tags
    });

    const oldTask = tasks.find(t => t.id === updatedTask.id);
    const updatedTasks = tasks.map(task => task.id === updatedTask.id ? updatedTask : task);
    setTasks(updatedTasks);
    saveTasksToLocal(updatedTasks);
    setToast({ message: '任务已更新', type: 'updated' });

    if (isOfflineMode) {
      console.log('[离线模式] 任务已保存到本地');
      return;
    }

    const { error } = await supabase
      .from('tasks')
      .update({
        title: updatedTask.title,
        description: updatedTask.description || '',
        status: updatedTask.status,
        priority: updatedTask.priority,
        due_date: updatedTask.dueDate ? new Date(updatedTask.dueDate).toISOString() : null,
        tags: updatedTask.tags || [],
        updated_at: new Date().toISOString()
      })
      .eq('id', updatedTask.id);

    if (error) {
      console.error('[更新任务] 数据库错误:', error);
      if (oldTask) {
        const restoredTasks = tasks.map(task => task.id === updatedTask.id ? oldTask : task);
        setTasks(restoredTasks);
        saveTasksToLocal(restoredTasks);
      }
      setToast({ message: `更新失败: ${error.message}`, type: 'updated' });
    } else {
      console.log('[更新任务] ✓ 成功更新到数据库');
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
            {isOfflineMode && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
                <WifiOff size={16} className="text-amber-600" />
                <span className="text-xs font-medium text-amber-700">离线模式</span>
              </div>
            )}
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
                onClick={() => setPriorityFilter('all')}
                className={`flex-1 py-2.5 md:py-1.5 px-3 rounded-lg text-base md:text-sm transition-colors active:scale-95 ${
                  priorityFilter === 'all'
                    ? 'bg-gray-700 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                全部
              </button>
              <button
                onClick={() => setPriorityFilter('high')}
                className={`flex-1 py-2.5 md:py-1.5 px-3 rounded-lg text-base md:text-sm transition-colors active:scale-95 ${
                  priorityFilter === 'high'
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                高优先级
              </button>
              <button
                onClick={() => setPriorityFilter('medium')}
                className={`flex-1 py-2.5 md:py-1.5 px-3 rounded-lg text-base md:text-sm transition-colors active:scale-95 ${
                  priorityFilter === 'medium'
                    ? 'bg-amber-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                中优先级
              </button>
              <button
                onClick={() => setPriorityFilter('low')}
                className={`flex-1 py-2.5 md:py-1.5 px-3 rounded-lg text-base md:text-sm transition-colors active:scale-95 ${
                  priorityFilter === 'low'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                低优先级
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
              <TaskCard
                key={task.id}
                task={task}
                onDelete={() => handleDeleteClick(task.id)}
                onUpdate={handleUpdateTask}
                onComplete={() => handleCompleteTask(task.id)}
              />
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
    </div>
  );
}

export default App;
