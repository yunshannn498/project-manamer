import { Task } from '../types';

const parseDateTime = (text: string): number | undefined => {
  const lowerText = text.toLowerCase();
  const now = new Date();

  if (lowerText.includes('今天')) {
    const timeMatch = text.match(/(\d{1,2})[点:：](\d{1,2})?/);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;

      if (hours <= 12 && hours < now.getHours()) {
        hours += 12;
      }

      const date = new Date(now);
      date.setHours(hours, minutes, 0, 0);
      return date.getTime();
    }
    const date = new Date(now);
    date.setHours(23, 59, 59, 999);
    return date.getTime();
  }

  if (lowerText.includes('明天')) {
    const timeMatch = text.match(/(\d{1,2})[点:：](\d{1,2})?/);
    const date = new Date(now);
    date.setDate(date.getDate() + 1);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1]);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      date.setHours(hours, minutes, 0, 0);
    } else {
      date.setHours(23, 59, 59, 999);
    }
    return date.getTime();
  }

  if (lowerText.includes('后天')) {
    const timeMatch = text.match(/(\d{1,2})[点:：](\d{1,2})?/);
    const date = new Date(now);
    date.setDate(date.getDate() + 2);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1]);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      date.setHours(hours, minutes, 0, 0);
    } else {
      date.setHours(23, 59, 59, 999);
    }
    return date.getTime();
  }

  if (lowerText.includes('本周') || lowerText.includes('这周')) {
    const date = new Date(now);
    const day = date.getDay();
    const daysUntilSunday = day === 0 ? 0 : 7 - day;
    date.setDate(date.getDate() + daysUntilSunday);
    date.setHours(23, 59, 59, 999);
    return date.getTime();
  }

  if (lowerText.includes('下周')) {
    const date = new Date(now);
    const day = date.getDay();
    const daysUntilNextSunday = day === 0 ? 7 : 14 - day;
    date.setDate(date.getDate() + daysUntilNextSunday);
    date.setHours(23, 59, 59, 999);
    return date.getTime();
  }

  if (lowerText.includes('本月') || lowerText.includes('这个月')) {
    const date = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    date.setHours(23, 59, 59, 999);
    return date.getTime();
  }

  if (lowerText.includes('下个月') || lowerText.includes('下月')) {
    const date = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    date.setHours(23, 59, 59, 999);
    return date.getTime();
  }

  const specificDateMatch = text.match(/(\d{1,2})月(\d{1,2})[日号]/);
  if (specificDateMatch) {
    const month = parseInt(specificDateMatch[1]) - 1;
    const day = parseInt(specificDateMatch[2]);
    const date = new Date(now.getFullYear(), month, day);
    if (date < now) {
      date.setFullYear(date.getFullYear() + 1);
    }

    const timeMatch = text.match(/(\d{1,2})[点:：](\d{1,2})?/);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1]);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      date.setHours(hours, minutes, 0, 0);
    } else {
      date.setHours(23, 59, 59, 999);
    }
    return date.getTime();
  }

  const weekdayMap: { [key: string]: number } = {
    '周一': 1, '星期一': 1, '礼拜一': 1,
    '周二': 2, '星期二': 2, '礼拜二': 2,
    '周三': 3, '星期三': 3, '礼拜三': 3,
    '周四': 4, '星期四': 4, '礼拜四': 4,
    '周五': 5, '星期五': 5, '礼拜五': 5,
    '周六': 6, '星期六': 6, '礼拜六': 6,
    '周日': 0, '星期日': 0, '礼拜日': 0, '周天': 0, '星期天': 0,
  };

  for (const [keyword, targetDay] of Object.entries(weekdayMap)) {
    if (lowerText.includes(keyword)) {
      const currentDay = now.getDay();
      let daysToAdd = targetDay - currentDay;
      if (daysToAdd <= 0) {
        daysToAdd += 7;
      }
      const date = new Date(now);
      date.setDate(date.getDate() + daysToAdd);

      const timeMatch = text.match(/(\d{1,2})[点:：](\d{1,2})?/);
      if (timeMatch) {
        const hours = parseInt(timeMatch[1]);
        const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        date.setHours(hours, minutes, 0, 0);
      } else {
        date.setHours(23, 59, 59, 999);
      }
      return date.getTime();
    }
  }

  const timeMatch = text.match(/(\d{1,2})[点:：](\d{1,2})?/);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1]);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;

    if (hours <= 12 && hours < now.getHours()) {
      hours += 12;
    }

    const date = new Date(now);
    date.setHours(hours, minutes, 0, 0);
    return date.getTime();
  }

  return undefined;
};

export const parseVoiceInput = (text: string): Omit<Task, 'id' | 'createdAt'> => {
  const lowerText = text.toLowerCase();

  let priority: 'low' | 'medium' | 'high' | undefined;
  if (lowerText.includes('紧急') || lowerText.includes('重要') || lowerText.includes('高优先级')) {
    priority = 'high';
  } else if (lowerText.includes('中等') || lowerText.includes('普通')) {
    priority = 'medium';
  } else if (lowerText.includes('低优先级') || lowerText.includes('不急')) {
    priority = 'low';
  }

  const dueDate = parseDateTime(text);

  const tags: string[] = [];
  const tagKeywords = ['标签', '分类', '类别'];
  tagKeywords.forEach(keyword => {
    const tagIndex = lowerText.indexOf(keyword);
    if (tagIndex !== -1) {
      const afterTag = text.substring(tagIndex + keyword.length).trim();
      const possibleTags = afterTag.split(/[，,、]/)[0].trim();
      if (possibleTags) {
        tags.push(possibleTags);
      }
    }
  });

  let title = text.trim();
  let description: string | undefined;

  const descKeywords = ['详情', '描述', '说明', '备注'];
  for (const keyword of descKeywords) {
    const index = lowerText.indexOf(keyword);
    if (index !== -1) {
      title = text.substring(0, index).trim();
      description = text.substring(index + keyword.length).trim();
      if (description.startsWith('是') || description.startsWith('：') || description.startsWith(':')) {
        description = description.substring(1).trim();
      }
      break;
    }
  }

  title = title.replace(/^[，,、\s]+|[，,、\s]+$/g, '').trim();

  return {
    title: title || '新任务',
    description,
    priority,
    dueDate,
    tags: tags.length > 0 ? tags : undefined
  };
};

export const parseEditIntent = (text: string): Partial<Omit<Task, 'id' | 'createdAt'>> => {
  const lowerText = text.toLowerCase();
  const updates: Partial<Omit<Task, 'id' | 'createdAt'>> = {};

  let priority: 'low' | 'medium' | 'high' | undefined;
  if (lowerText.includes('紧急') || lowerText.includes('重要') || lowerText.includes('高优先级')) {
    priority = 'high';
  } else if (lowerText.includes('中等') || lowerText.includes('普通')) {
    priority = 'medium';
  } else if (lowerText.includes('低优先级') || lowerText.includes('不急')) {
    priority = 'low';
  }
  if (priority) {
    updates.priority = priority;
  }

  const dueDate = parseDateTime(text);
  if (dueDate !== undefined) {
    updates.dueDate = dueDate;
  }

  if (lowerText.includes('清除时间') || lowerText.includes('取消时间') || lowerText.includes('删除时间')) {
    updates.dueDate = null;
  }

  const tags: string[] = [];
  const tagKeywords = ['标签', '分类', '类别'];
  tagKeywords.forEach(keyword => {
    const tagIndex = lowerText.indexOf(keyword);
    if (tagIndex !== -1) {
      const afterTag = text.substring(tagIndex + keyword.length).trim();
      const possibleTags = afterTag.split(/[，,、]/)[0].trim();
      if (possibleTags) {
        tags.push(possibleTags);
      }
    }
  });
  if (tags.length > 0) {
    updates.tags = tags;
  }

  const descKeywords = ['详情', '描述', '说明', '备注'];
  for (const keyword of descKeywords) {
    const index = lowerText.indexOf(keyword);
    if (index !== -1) {
      let description = text.substring(index + keyword.length).trim();
      if (description.startsWith('是') || description.startsWith('：') || description.startsWith(':')) {
        description = description.substring(1).trim();
      }
      if (description) {
        updates.description = description;
      }
      break;
    }
  }

  const titleKeywords = ['标题', '名称', '改成', '变成', '叫'];
  for (const keyword of titleKeywords) {
    const index = lowerText.indexOf(keyword);
    if (index !== -1) {
      let title = text.substring(index + keyword.length).trim();

      tagKeywords.forEach(kw => {
        const idx = title.toLowerCase().indexOf(kw);
        if (idx !== -1) {
          title = title.substring(0, idx).trim();
        }
      });

      descKeywords.forEach(kw => {
        const idx = title.toLowerCase().indexOf(kw);
        if (idx !== -1) {
          title = title.substring(0, idx).trim();
        }
      });

      title = title.replace(/^[，,、\s]+|[，,、\s]+$/g, '').trim();

      if (title) {
        updates.title = title;
      }
      break;
    }
  }

  return updates;
};
