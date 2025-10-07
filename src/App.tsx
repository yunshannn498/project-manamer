import { useState, useEffect, useMemo } from 'react';
import { Task, User } from './types';
import { TaskCard } from './components/TaskCard';
import { TextInput } from './components/TextInput';
import { parseVoiceInput } from './utils/taskParser';
import { findMatchingTasks } from './utils/taskMatcher';
import { EditConfirmModal } from './components/EditConfirmModal';
import TaskSelectionModal from './components/TaskSelectionModal';
import Toast, { ToastType } from './components/Toast';
import { parseTaskIntent as parseTaskIntentGemini } from './services/geminiParser';
import { parseTaskIntent as parseTaskIntentLocal } from './services/semanticParser';
import { supabase } from './lib/supabase';
import { ListTodo, Search, LogIn, LogOut, User as UserIcon } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthModal } from './components/AuthModal';

function AppContent() {
  const { user, signOut } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [showMyTasksOnly, setShowMyTasksOnly] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [editConfirmData, setEditConfirmData] = useState<{
    voiceText: string;
    matches: ReturnType<typeof findMatchingTasks>;
  } | null>(null);
  const [taskSelectionData, setTaskSelectionData] = useState<{
    tasks: Task[];
    updates: Partial<Task>;
  } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  useEffect(() => {
    loadTasks();

    const channel = supabase
      .channel('tasks-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        loadTasks();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          user_task_assignments (
            user_id,
            assigned_at
          )
        `)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const tasksWithUsers = await Promise.all(
          data.map(async (task) => {
            const assignedUserIds = task.user_task_assignments?.map((a: any) => a.user_id) || [];
            const assignedUsers: User[] = [];

            if (assignedUserIds.length > 0) {
              const { data: usersData } = await supabase.auth.admin.listUsers();
              if (usersData) {
                assignedUsers.push(
                  ...usersData.users
                    .filter(u => assignedUserIds.includes(u.id))
                    .map(u => ({ id: u.id, email: u.email || '' }))
                );
              }
            }

            return {
              id: task.id,
              title: task.title,
              description: task.description,
              status: task.status,
              priority: task.priority,
              dueDate: task.due_date ? new Date(task.due_date).getTime() : undefined,
              tags: task.tags,
              createdAt: new Date(task.created_at).getTime(),
              createdBy: task.created_by,
              assignedUsers
            };
          })
        );
        setTasks(tasksWithUsers);
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

    if (showMyTasksOnly && user) {
      filtered = filtered.filter(task =>
        task.assignedUsers?.some(u => u.id === user.id) || task.createdBy === user.id
      );
    }

    if (query) {
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        task.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [tasks, searchQuery, showCompleted, priorityFilter, showMyTasksOnly, user]);

  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
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
  }, [filteredTasks]);

  const handleAddTask = async (taskData: Omit<Task, 'id' | 'createdAt'>) => {
    const optimisticTask: Task = {
      id: crypto.randomUUID(),
      ...taskData,
      createdAt: Date.now()
    };

    setTasks(prev => [optimisticTask, ...prev]);
    setToast({ message: '任务已创建', type: 'created' });

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title: taskData.title,
        description: taskData.description || '',
        status: taskData.status,
        priority: taskData.priority,
        due_date: taskData.dueDate ? new Date(taskData.dueDate).toISOString() : null,
        tags: taskData.tags || [],
        created_by: user?.id
      })
      .select()
      .single();

    if (!error && data && user) {
      await supabase
        .from('user_task_assignments')
        .insert({
          task_id: data.id,
          user_id: user.id,
          assigned_by: user.id
        });
    }

    if (!error && data) {
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

      setTasks(prev => prev.map(t => t.id === optimisticTask.id ? newTask : t));
    } else {
      setTasks(prev => prev.filter(t => t.id !== optimisticTask.id));
      setToast({ message: '创建失败', type: 'updated' });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const deletedTask = tasks.find(t => t.id === taskId);
    setTasks(prev => prev.filter(task => task.id !== taskId));

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error && deletedTask) {
      setTasks(prev => [...prev, deletedTask]);
      setToast({ message: '删除失败', type: 'updated' });
    }
  };

  const handleUpdateTask = async (updatedTask: Task) => {
    const oldTask = tasks.find(t => t.id === updatedTask.id);
    setTasks(prev => prev.map(task => task.id === updatedTask.id ? updatedTask : task));
    setToast({ message: '任务已更新', type: 'updated' });

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

    if (error && oldTask) {
      setTasks(prev => prev.map(task => task.id === updatedTask.id ? oldTask : task));
      setToast({ message: '更新失败', type: 'updated' });
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      await handleUpdateTask({ ...task, status: 'done' });
    }
  };

  const handleTextSubmit = async (text: string) => {
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
      if (result.needsConfirmation && result.suggestedTasks) {
        console.log('需要用户选择任务');
        setTaskSelectionData({
          tasks: result.suggestedTasks,
          updates: result.updates
        });
      } else if (result.taskToEdit) {
        const task = tasks.find(t => t.id === result.taskToEdit);
        if (task) {
          console.log('执行编辑操作（自动匹配）');
          handleUpdateTask({
            ...task,
            ...result.updates
          });
        } else {
          console.log('未找到要编辑的任务，创建新任务');
          const taskData = result.newTask || parseVoiceInput(text);
          if (taskData.title) {
            handleAddTask(taskData as Omit<Task, 'id' | 'createdAt'>);
          }
        }
      }
    } else {
      console.log('创建新任务');
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
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <ListTodo size={28} className="text-blue-500" />
              <div>
                <h1 className="text-2xl font-bold text-gray-800">米米任务池</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {user ? (
                <>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <UserIcon size={16} />
                    <span>{user.email}</span>
                  </div>
                  <button
                    onClick={() => signOut()}
                    className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                    title="登出"
                  >
                    <LogOut size={20} />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <LogIn size={20} />
                  <span>登录</span>
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索任务..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowCompleted(false)}
                className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
                  !showCompleted
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                进行中
              </button>
              <button
                onClick={() => setShowCompleted(true)}
                className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
                  showCompleted
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                已完成
              </button>
              {user && (
                <button
                  onClick={() => setShowMyTasksOnly(!showMyTasksOnly)}
                  className={`py-2 px-4 rounded-lg transition-colors whitespace-nowrap ${
                    showMyTasksOnly
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  只看我的
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setPriorityFilter('all')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-sm transition-colors ${
                  priorityFilter === 'all'
                    ? 'bg-gray-700 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                全部
              </button>
              <button
                onClick={() => setPriorityFilter('high')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-sm transition-colors ${
                  priorityFilter === 'high'
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                高优先级
              </button>
              <button
                onClick={() => setPriorityFilter('medium')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-sm transition-colors ${
                  priorityFilter === 'medium'
                    ? 'bg-amber-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                中优先级
              </button>
              <button
                onClick={() => setPriorityFilter('low')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-sm transition-colors ${
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
            <p className="text-gray-500">
              {searchQuery
                ? '未找到匹配的任务'
                : showCompleted
                ? '暂无已完成的任务'
                : '暂无任务，使用下方输入框或语音创建新任务'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onDelete={() => handleDeleteTask(task.id)}
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

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
