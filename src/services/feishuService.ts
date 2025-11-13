import type { Task } from '../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://0ec90b57d6e95fcbda19832f.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IjBlYzkwYjU3ZDZlOTVmY2JkYTE5ODMyZiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzMzNTI5NjAwLCJleHAiOjIwNDkxMDU2MDB9.JYRNO7fS6JNshL7x5-7FZsX-2YzZx_9F9T9cJ8qxGzI';

interface FeishuMessage {
  msg_type: 'post';
  content: {
    post: {
      zh_cn: {
        title: string;
        content: Array<Array<{ tag: string; text: string; un_escape?: boolean }>>;
      };
    };
  };
}

function formatPriority(priority?: string): string {
  const priorityMap: Record<string, string> = {
    'high': '🔴 高优先级',
    'medium': '🟡 中优先级',
    'low': '🟢 低优先级'
  };
  return priorityMap[priority || ''] || '';
}

function formatDate(timestamp?: number): string {
  if (!timestamp) return '无';
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).replace(/\//g, '/');
}

async function sendNotificationViaEdgeFunction(ownerName: string, message: FeishuMessage): Promise<boolean> {
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


export async function sendTaskCreatedNotification(task: Task): Promise<void> {
  console.log('[Feishu] 🚀 开始发送任务创建通知');
  console.log('[Feishu] 任务信息:', { id: task.id, title: task.title, tags: task.tags });

  const owner = extractOwnerFromTags(task.tags);
  console.log('[Feishu] 提取的负责人:', owner);

  const priority = formatPriority(task.priority);
  const dueDate = formatDate(task.dueDate);

  const content: Array<Array<{ tag: string; text: string }>> = [
    [{ tag: 'text', text: '✅ 任务已创建' }],
    [{ tag: 'text', text: `任务名称：${task.title}` }],
  ];

  if (priority) {
    content.push([{ tag: 'text', text: `优先级：${priority}` }]);
  }

  content.push([{ tag: 'text', text: `截止时间：${dueDate}` }]);

  if (task.description) {
    content.push([{ tag: 'text', text: `描述：${task.description}` }]);
  }

  const message: FeishuMessage = {
    msg_type: 'post',
    content: {
      post: {
        zh_cn: {
          title: '📋 任务创建通知',
          content
        }
      }
    }
  };

  const success = await sendNotificationViaEdgeFunction(owner, message);
  console.log('[Feishu] 发送结果:', success ? '✓ 成功' : '✗ 失败');
}

export async function sendTaskUpdatedNotification(oldTask: Task, newTask: Task): Promise<void> {
  console.log('[Feishu] 📝 开始发送任务更新通知');

  const newOwner = extractOwnerFromTags(newTask.tags);

  const content: Array<Array<{ tag: string; text: string }>> = [
    [{ tag: 'text', text: '✏️ 任务已更新' }],
    [{ tag: 'text', text: `任务名称：${newTask.title}` }],
  ];

  const changes: string[] = [];
  if (oldTask.title !== newTask.title) {
    changes.push(`标题：${oldTask.title} → ${newTask.title}`);
  }
  if (oldTask.priority !== newTask.priority) {
    const oldPriority = formatPriority(oldTask.priority) || '无';
    const newPriority = formatPriority(newTask.priority);
    changes.push(`优先级：${oldPriority} → ${newPriority}`);
  }
  if (oldTask.dueDate !== newTask.dueDate) {
    const oldDate = formatDate(oldTask.dueDate);
    const newDate = formatDate(newTask.dueDate);
    changes.push(`截止时间：${oldDate} → ${newDate}`);
  }
  if (oldTask.description !== newTask.description) {
    changes.push('描述已更新');
  }

  const oldOwner = extractOwnerFromTags(oldTask.tags);
  if (oldOwner !== newOwner) {
    changes.push(`负责人：${oldOwner} → ${newOwner}`);
  }

  if (changes.length > 0) {
    content.push([{ tag: 'text', text: '' }]);
    content.push([{ tag: 'text', text: '📝 变更内容：' }]);
    changes.forEach(change => {
      content.push([{ tag: 'text', text: `  • ${change}` }]);
    });
  }

  const message: FeishuMessage = {
    msg_type: 'post',
    content: {
      post: {
        zh_cn: {
          title: '📝 任务更新通知',
          content
        }
      }
    }
  };

  const success = await sendNotificationViaEdgeFunction(newOwner, message);
  console.log('[Feishu] 发送结果:', success ? '✓ 成功' : '✗ 失败');
}

export async function sendTaskCompletedNotification(task: Task): Promise<void> {
  console.log('[Feishu] ✅ 开始发送任务完成通知');

  const owner = extractOwnerFromTags(task.tags);
  const priority = formatPriority(task.priority);
  const completedTime = formatDate(task.completedAt || Date.now());

  const content: Array<Array<{ tag: string; text: string }>> = [
    [{ tag: 'text', text: '🎉 任务已完成' }],
    [{ tag: 'text', text: `任务名称：${task.title}` }],
  ];

  if (priority) {
    content.push([{ tag: 'text', text: `优先级：${priority}` }]);
  }

  content.push([{ tag: 'text', text: `完成时间：${completedTime}` }]);

  const message: FeishuMessage = {
    msg_type: 'post',
    content: {
      post: {
        zh_cn: {
          title: '✅ 任务完成通知',
          content
        }
      }
    }
  };

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

  const content: Array<Array<{ tag: string; text: string }>> = [
    [{ tag: 'text', text: '🗑️ 任务已删除' }],
    [{ tag: 'text', text: `任务名称：${task.title}` }],
  ];

  if (priority) {
    content.push([{ tag: 'text', text: `优先级：${priority}` }]);
  }

  content.push([{ tag: 'text', text: `删除时间：${deleteTime}` }]);

  const message: FeishuMessage = {
    msg_type: 'post',
    content: {
      post: {
        zh_cn: {
          title: '⚠️ 任务删除通知',
          content
        }
      }
    }
  };

  const success = await sendNotificationViaEdgeFunction(owner, message);
  console.log('[Feishu] 发送结果:', success ? '✓ 成功' : '✗ 失败');
}
