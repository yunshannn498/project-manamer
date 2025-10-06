import { Task } from '../types';
import { parseVoiceInput, parseEditIntent } from '../utils/taskParser';

interface ParseResponse {
  intent: 'create' | 'edit';
  taskToEdit?: string;
  updates?: Partial<Task>;
  newTask?: Partial<Task>;
  confidence: number;
  needsConfirmation?: boolean;
  suggestedTasks?: Task[];
}

const NOISE_WORDS = new Set([
  '把', '将', '给', '让', '请', '帮', '我', '要',
  '修改', '更改', '调整', '编辑', '改成', '变成', '换成',
  '设置', '设为', '延期', '推迟', '提前',
  '到', '成', '为', '的', '了', '吧', '啊', '呢'
]);

const extractTaskName = (text: string): string => {
  const lower = text.toLowerCase();

  let cleanText = lower
    .replace(/把(.+?)(修改|更改|调整|编辑|改成|变成|换成|延期|推迟|提前|设置|设为).*/g, '$1')
    .replace(/(修改|更改|调整|编辑)(.+?)(到|成|为).*/g, '$2')
    .trim();

  const words = cleanText.split(/\s+/).filter(w => !NOISE_WORDS.has(w) && w.length > 0);

  return words.join(' ');
};

const calculateSimilarity = (str1: string, str2: string): number => {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  if (s1 === s2) return 1.0;
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;

  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);

  let matchCount = 0;
  for (const w1 of words1) {
    for (const w2 of words2) {
      if (w1.length > 1 && w2.length > 1) {
        if (w1 === w2) {
          matchCount += 1;
        } else if (w1.includes(w2) || w2.includes(w1)) {
          matchCount += 0.5;
        }
      }
    }
  }

  return matchCount / Math.max(words1.length, words2.length);
};

const extractTaskReference = (text: string, tasks: Task[]): { task: Task; similarity: number } | null => {
  const extractedName = extractTaskName(text);
  console.log('[任务提取] 原文:', text);
  console.log('[任务提取] 提取结果:', extractedName);

  const bestMatch = tasks
    .map(task => {
      const similarity = calculateSimilarity(extractedName, task.title);
      console.log(`[匹配] "${extractedName}" vs "${task.title}" = ${similarity.toFixed(2)}`);
      return { task, similarity };
    })
    .filter(m => m.similarity > 0.4)
    .sort((a, b) => b.similarity - a.similarity)[0];

  return bestMatch || null;
};

const detectIntent = (text: string): 'create' | 'edit' => {
  const lowerText = text.toLowerCase();

  const editPatterns = [
    /修改|更改|调整|编辑/,
    /改成|变成|换成/,
    /从.+[到改]/,
    /设置成|设为/,
    /延期|推迟|提前/,
    /把.+[到改为]/,
  ];

  for (const pattern of editPatterns) {
    if (pattern.test(lowerText)) {
      console.log('检测到编辑意图，匹配模式:', pattern);
      return 'edit';
    }
  }

  return 'create';
};

export const parseTaskIntent = async (
  text: string,
  existingTasks: Task[]
): Promise<ParseResponse> => {
  console.log('[本地解析器] 输入:', text);
  console.log('[本地解析器] 现有任务数:', existingTasks.length);

  const intent = detectIntent(text);
  console.log('[本地解析器] 检测意图:', intent);

  if (intent === 'edit' && existingTasks.length > 0) {
    const match = extractTaskReference(text, existingTasks);
    console.log('[本地解析器] 任务匹配结果:', match);

    if (match && match.similarity > 0.4) {
      const updates = parseEditIntent(text);
      console.log('[本地解析器] 解析的更新内容:', updates);

      if (Object.keys(updates).length > 0) {
        console.log('[本地解析器] ✓ 返回编辑操作（自动匹配）');
        return {
          intent: 'edit',
          taskToEdit: match.task.id,
          updates,
          confidence: match.similarity
        };
      }
    } else {
      console.log('[本地解析器] 匹配度不足，返回任务列表供用户选择');
      const updates = parseEditIntent(text);

      if (Object.keys(updates).length > 0) {
        return {
          intent: 'edit',
          updates,
          confidence: 0,
          needsConfirmation: true,
          suggestedTasks: existingTasks
        };
      }
    }
  }

  console.log('[本地解析器] 返回创建新任务');
  const newTask = parseVoiceInput(text);
  return {
    intent: 'create',
    newTask,
    confidence: 0.8
  };
};