import type { Task } from '../types';
import {
  buildTaskCreatedMessage,
  buildTaskUpdatedMessage,
  buildTaskCompletedMessage,
  buildTaskDeletedMessage,
  type FeishuPostMessage
} from '../utils/feishuMessageBuilder';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://0ec90b57d6e95fcbda19832f.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IjBlYzkwYjU3ZDZlOTVmY2JkYTE5ODMyZiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzMzNTI5NjAwLCJleHAiOjIwNDkxMDU2MDB9.JYRNO7fS6JNshL7x5-7FZsX-2YzZx_9F9T9cJ8qxGzI';

async function sendNotificationViaEdgeFunction(ownerName: string, message: string | FeishuPostMessage): Promise<boolean> {
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

  const message = buildTaskCreatedMessage(task);
  console.log('[Feishu] 准备发送结构化消息');

  const success = await sendNotificationViaEdgeFunction(owner, message);
  console.log('[Feishu] 发送结果:', success ? '✓ 成功' : '✗ 失败');
}

export async function sendTaskUpdatedNotification(oldTask: Task, newTask: Task): Promise<void> {
  console.log('[Feishu] 📝 开始发送任务更新通知');

  const newOwner = extractOwnerFromTags(newTask.tags);

  const message = buildTaskUpdatedMessage(oldTask, newTask);
  console.log('[Feishu] 准备发送结构化消息');

  const success = await sendNotificationViaEdgeFunction(newOwner, message);
  console.log('[Feishu] 发送结果:', success ? '✓ 成功' : '✗ 失败');
}

export async function sendTaskCompletedNotification(task: Task): Promise<void> {
  console.log('[Feishu] ✅ 开始发送任务完成通知');

  const owner = extractOwnerFromTags(task.tags);

  const message = buildTaskCompletedMessage(task);
  console.log('[Feishu] 准备发送结构化消息');

  const success = await sendNotificationViaEdgeFunction(owner, message);
  console.log('[Feishu] 发送结果:', success ? '✓ 成功' : '✗ 失败');
}

export async function sendTaskDeletedNotification(task: Task): Promise<void> {
  console.log('[Feishu] 🗑️ 开始发送任务删除通知');
  console.log('[Feishu] 任务信息:', { id: task.id, title: task.title, tags: task.tags });

  const owner = extractOwnerFromTags(task.tags);
  console.log('[Feishu] 提取的负责人:', owner);

  const message = buildTaskDeletedMessage(task);
  console.log('[Feishu] 准备发送结构化消息');

  const success = await sendNotificationViaEdgeFunction(owner, message);
  console.log('[Feishu] 发送结果:', success ? '✓ 成功' : '✗ 失败');
}
