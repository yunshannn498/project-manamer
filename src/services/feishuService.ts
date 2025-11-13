import type { Task } from '../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://0ec90b57d6e95fcbda19832f.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IjBlYzkwYjU3ZDZlOTVmY2JkYTE5ODMyZiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzMzNTI5NjAwLCJleHAiOjIwNDkxMDU2MDB9.JYRNO7fS6JNshL7x5-7FZsX-2YzZx_9F9T9cJ8qxGzI';

async function sendNotificationViaEdgeFunction(ownerName: string, message: string): Promise<boolean> {
  try {
    const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/feishu-notify`;

    console.log('[Feishu] 📤 通过 Edge Function 发送通知');
    console.log('[Feishu] 目标负责人:', ownerName);
    console.log('[Feishu] 消息内容:', message);

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        ownerName,
        message
      }),
      signal: AbortSignal.timeout(10000)
    });

    console.log('[Feishu] Edge Function 响应状态:', response.status, response.statusText);

    const responseData = await response.json();
    console.log('[Feishu] Edge Function 响应内容:', responseData);

    if (!response.ok) {
      console.warn(`[Feishu] ⚠️ Edge Function 请求失败:`, responseData);
      return false;
    }

    return responseData.success === true;
  } catch (error) {
    console.error('[Feishu] ❌ Edge Function 调用失败:', error);
    return false;
  }
}

function extractOwnerFromTags(tags?: string[]): string {
  if (!tags || tags.length === 0) {
    return '阿伟';
  }

  const ownerTag = tags.find(tag => tag.startsWith('负责人:'));
  if (ownerTag) {
    const owner = ownerTag.replace('负责人:', '').trim();
    return owner || '阿伟';
  }

  return '阿伟';
}

function formatPriority(priority?: string): string {
  if (!priority) return '';
  const priorityMap: Record<string, string> = {
    'high': '高优先级',
    'medium': '中优先级',
    'low': '低优先级'
  };
  return priorityMap[priority] || '';
}

function formatDate(timestamp?: number): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export async function sendTaskCreatedNotification(task: Task): Promise<void> {
  console.log('[Feishu] 🚀 开始发送任务创建通知');
  console.log('[Feishu] 任务信息:', { id: task.id, title: task.title, tags: task.tags });

  const owner = extractOwnerFromTags(task.tags);
  console.log('[Feishu] 提取的负责人:', owner);

  const priority = formatPriority(task.priority);
  const dueDateStr = task.dueDate ? formatDate(task.dueDate) : '无';

  let message = `📋 新任务创建 | 任务：${task.title}`;
  if (priority) message += ` | 优先级：${priority}`;
  message += ` | 截止时间：${dueDateStr}`;
  if (task.description) {
    message += ` | 描述：${task.description}`;
  }

  console.log('[Feishu] 准备发送消息:', message);

  const success = await sendNotificationViaEdgeFunction(owner, message);
  console.log('[Feishu] 发送结果:', success ? '✓ 成功' : '✗ 失败');
}

export async function sendTaskUpdatedNotification(oldTask: Task, newTask: Task): Promise<void> {
  console.log('[Feishu] 📝 开始发送任务更新通知');

  const newOwner = extractOwnerFromTags(newTask.tags);

  const changes: string[] = [];

  if (oldTask.title !== newTask.title) {
    changes.push(`• 标题：${oldTask.title} → ${newTask.title}`);
  }
  if (oldTask.priority !== newTask.priority) {
    changes.push(`• 优先级：${formatPriority(oldTask.priority) || '无'} → ${formatPriority(newTask.priority)}`);
  }
  if (oldTask.dueDate !== newTask.dueDate) {
    const oldDate = oldTask.dueDate ? formatDate(oldTask.dueDate) : '无';
    const newDate = newTask.dueDate ? formatDate(newTask.dueDate) : '无';
    changes.push(`• 截止时间：${oldDate} → ${newDate}`);
  }
  if (oldTask.description !== newTask.description) {
    changes.push(`• 描述已更新`);
  }

  const oldOwner = extractOwnerFromTags(oldTask.tags);
  if (oldOwner !== newOwner) {
    changes.push(`• 负责人：${oldOwner} → ${newOwner}`);
  }

  let message = `✏️ 任务已更新 | 任务：${newTask.title}`;
  if (changes.length > 0) {
    message += ` | 变更：${changes.join(' ')}`;
  }

  const success = await sendNotificationViaEdgeFunction(newOwner, message);
  console.log('[Feishu] 发送结果:', success ? '✓ 成功' : '✗ 失败');
}

export async function sendTaskCompletedNotification(task: Task): Promise<void> {
  console.log('[Feishu] ✅ 开始发送任务完成通知');

  const owner = extractOwnerFromTags(task.tags);

  const priority = formatPriority(task.priority);
  const completedTime = formatDate(task.completedAt || Date.now());

  let message = `✅ 任务已完成 | 任务：${task.title}`;
  if (priority) message += ` | 优先级：${priority}`;
  message += ` | 完成时间：${completedTime}`;

  const success = await sendNotificationViaEdgeFunction(owner, message);
  console.log('[Feishu] 发送结果:', success ? '✓ 成功' : '✗ 失败');
}

export async function sendTaskDeletedNotification(task: Task): Promise<void> {
  console.log('[Feishu] 🗑️ 开始发送任务删除通知');
  console.log('[Feishu] 任务信息:', { id: task.id, title: task.title, tags: task.tags });

  const owner = extractOwnerFromTags(task.tags);
  console.log('[Feishu] 提取的负责人:', owner);

  const priority = formatPriority(task.priority);
  const deleteTime = formatDate(Date.now());

  let message = `🗑️ 任务已删除 | 任务：${task.title}`;
  if (priority) message += ` | 优先级：${priority}`;
  message += ` | 删除时间：${deleteTime}`;

  console.log('[Feishu] 准备发送消息:', message);

  const success = await sendNotificationViaEdgeFunction(owner, message);
  console.log('[Feishu] 发送结果:', success ? '✓ 成功' : '✗ 失败');
}
