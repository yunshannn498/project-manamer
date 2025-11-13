import type { Task } from '../types';

export interface FeishuPostMessage {
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
  if (!priority) return '';
  const priorityMap: Record<string, string> = {
    'high': '🔴 高优先级',
    'medium': '🟡 中优先级',
    'low': '🟢 低优先级'
  };
  return priorityMap[priority] || '';
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

function createTextLine(text: string): Array<{ tag: string; text: string }> {
  return [{ tag: 'text', text }];
}

function createLabelValueLine(label: string, value: string): Array<{ tag: string; text: string }> {
  return [
    { tag: 'text', text: label },
    { tag: 'text', text: value }
  ];
}

export function buildTaskCreatedMessage(task: Task): FeishuPostMessage {
  const priority = formatPriority(task.priority);
  const dueDateStr = formatDate(task.dueDate);

  const content: Array<Array<{ tag: string; text: string }>> = [
    createTextLine('✅ 任务已创建'),
    createLabelValueLine('任务名称：', task.title),
  ];

  if (priority) {
    content.push(createLabelValueLine('优先级：', priority));
  }

  content.push(createLabelValueLine('截止时间：', dueDateStr));

  if (task.description) {
    content.push(createLabelValueLine('描述：', task.description));
  }

  return {
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
}

export function buildTaskUpdatedMessage(oldTask: Task, newTask: Task): FeishuPostMessage {
  const content: Array<Array<{ tag: string; text: string }>> = [
    createTextLine('✏️ 任务已更新'),
    createLabelValueLine('任务名称：', newTask.title),
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

  const extractOwner = (tags?: string[]) => {
    const ownerTag = tags?.find(tag => tag.startsWith('负责人:'));
    return ownerTag ? ownerTag.replace('负责人:', '').trim() : '阿伟';
  };

  const oldOwner = extractOwner(oldTask.tags);
  const newOwner = extractOwner(newTask.tags);
  if (oldOwner !== newOwner) {
    changes.push(`负责人：${oldOwner} → ${newOwner}`);
  }

  if (changes.length > 0) {
    content.push(createTextLine(''));
    content.push(createTextLine('📝 变更内容：'));
    changes.forEach(change => {
      content.push(createTextLine(`  • ${change}`));
    });
  }

  return {
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
}

export function buildTaskCompletedMessage(task: Task): FeishuPostMessage {
  const priority = formatPriority(task.priority);
  const completedTime = formatDate(task.completedAt || Date.now());

  const content: Array<Array<{ tag: string; text: string }>> = [
    createTextLine('🎉 任务已完成'),
    createLabelValueLine('任务名称：', task.title),
  ];

  if (priority) {
    content.push(createLabelValueLine('优先级：', priority));
  }

  content.push(createLabelValueLine('完成时间：', completedTime));

  return {
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
}

export function buildTaskDeletedMessage(task: Task): FeishuPostMessage {
  const priority = formatPriority(task.priority);
  const deleteTime = formatDate(Date.now());

  const content: Array<Array<{ tag: string; text: string }>> = [
    createTextLine('🗑️ 任务已删除'),
    createLabelValueLine('任务名称：', task.title),
  ];

  if (priority) {
    content.push(createLabelValueLine('优先级：', priority));
  }

  content.push(createLabelValueLine('删除时间：', deleteTime));

  return {
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
}
