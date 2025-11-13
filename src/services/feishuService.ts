import { supabase } from '../lib/supabase';
import type { Task } from '../types';

interface WebhookConfig {
  owner_name: string;
  webhook_url: string;
  is_enabled: boolean;
}

const webhookCache = new Map<string, string>();
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function getWebhookUrl(ownerName: string): Promise<string | null> {
  const now = Date.now();

  if (now - cacheTimestamp > CACHE_TTL) {
    webhookCache.clear();
    cacheTimestamp = now;
  }

  if (webhookCache.has(ownerName)) {
    return webhookCache.get(ownerName) || null;
  }

  try {
    const { data, error } = await supabase
      .from('feishu_webhooks')
      .select('webhook_url, is_enabled')
      .eq('owner_name', ownerName)
      .eq('is_enabled', true)
      .maybeSingle();

    if (error) {
      console.error(`Failed to fetch webhook for ${ownerName}:`, error);
      return null;
    }

    if (data) {
      webhookCache.set(ownerName, data.webhook_url);
      return data.webhook_url;
    }

    return null;
  } catch (error) {
    console.error(`Error fetching webhook for ${ownerName}:`, error);
    return null;
  }
}

async function sendToWebhook(webhookUrl: string, message: string): Promise<boolean> {
  try {
    console.log('[Feishu] 📤 发送 HTTP 请求到:', webhookUrl.substring(0, 50) + '...');

    const payload = {
      msg_type: 'text',
      content: {
        text: message
      }
    };
    console.log('[Feishu] 请求体:', JSON.stringify(payload));

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000)
    });

    console.log('[Feishu] 响应状态:', response.status, response.statusText);

    const responseText = await response.text();
    console.log('[Feishu] 响应内容:', responseText);

    if (!response.ok) {
      console.warn(`[Feishu] ⚠️ Webhook request failed with status ${response.status}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Feishu] ❌ Failed to send webhook notification:', error);
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

  const webhookUrl = await getWebhookUrl(owner);
  console.log('[Feishu] 获取的 webhook URL:', webhookUrl ? '已找到' : '未找到');

  if (!webhookUrl) {
    console.warn(`[Feishu] ⚠️ No webhook found for owner: ${owner}`);
    return;
  }

  const priority = formatPriority(task.priority);
  const dueDate = task.dueDate ? `，截止时间：${formatDate(task.dueDate)}` : '';

  const message = `任务创建：${task.title}${priority ? `（${priority}）` : ''}${dueDate}`;
  console.log('[Feishu] 准备发送消息:', message);

  const success = await sendToWebhook(webhookUrl, message);
  console.log('[Feishu] 发送结果:', success ? '✓ 成功' : '✗ 失败');
}

export async function sendTaskUpdatedNotification(oldTask: Task, newTask: Task): Promise<void> {
  const newOwner = extractOwnerFromTags(newTask.tags);
  const webhookUrl = await getWebhookUrl(newOwner);

  if (!webhookUrl) {
    console.warn(`No webhook found for owner: ${newOwner}`);
    return;
  }

  const changes: string[] = [];

  if (oldTask.title !== newTask.title) {
    changes.push(`标题变更`);
  }
  if (oldTask.priority !== newTask.priority) {
    changes.push(`优先级变更为${formatPriority(newTask.priority)}`);
  }
  if (oldTask.dueDate !== newTask.dueDate) {
    changes.push(`截止时间变更`);
  }
  if (oldTask.description !== newTask.description) {
    changes.push(`描述已更新`);
  }

  const oldOwner = extractOwnerFromTags(oldTask.tags);
  if (oldOwner !== newOwner) {
    changes.push(`负责人变更为${newOwner}`);
  }

  const changeText = changes.length > 0 ? `（${changes.join('，')}）` : '';
  const message = `任务更新：${newTask.title}${changeText}`;

  await sendToWebhook(webhookUrl, message);
}

export async function sendTaskCompletedNotification(task: Task): Promise<void> {
  const owner = extractOwnerFromTags(task.tags);
  const webhookUrl = await getWebhookUrl(owner);

  if (!webhookUrl) {
    console.warn(`No webhook found for owner: ${owner}`);
    return;
  }

  const priority = formatPriority(task.priority);
  const completedTime = formatDate(task.completedAt || Date.now());

  const message = `任务完成：${task.title}${priority ? `（${priority}）` : ''}，完成时间：${completedTime}`;

  await sendToWebhook(webhookUrl, message);
}

export async function sendTaskDeletedNotification(task: Task): Promise<void> {
  console.log('[Feishu] 🗑️ 开始发送任务删除通知');
  console.log('[Feishu] 任务信息:', { id: task.id, title: task.title, tags: task.tags });

  const owner = extractOwnerFromTags(task.tags);
  console.log('[Feishu] 提取的负责人:', owner);

  const webhookUrl = await getWebhookUrl(owner);
  console.log('[Feishu] 获取的 webhook URL:', webhookUrl ? '已找到' : '未找到');

  if (!webhookUrl) {
    console.warn(`[Feishu] ⚠️ No webhook found for owner: ${owner}`);
    return;
  }

  const priority = formatPriority(task.priority);
  const deleteTime = formatDate(Date.now());

  const message = `任务删除：${task.title}${priority ? `（${priority}）` : ''}，删除时间：${deleteTime}`;
  console.log('[Feishu] 准备发送消息:', message);

  const success = await sendToWebhook(webhookUrl, message);
  console.log('[Feishu] 发送结果:', success ? '✓ 成功' : '✗ 失败');
}
