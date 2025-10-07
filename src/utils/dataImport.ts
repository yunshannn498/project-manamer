import { Task } from '../types';

export interface ImportResult {
  success: boolean;
  tasks?: Task[];
  error?: string;
  summary?: {
    total: number;
    valid: number;
    invalid: number;
  };
}

export async function importFromJSON(file: File): Promise<ImportResult> {
  try {
    const text = await file.text();
    const data = JSON.parse(text);

    if (!Array.isArray(data)) {
      return {
        success: false,
        error: 'JSON 文件格式错误：必须是任务数组'
      };
    }

    const { validTasks, invalidCount } = validateTasks(data);

    return {
      success: true,
      tasks: validTasks,
      summary: {
        total: data.length,
        valid: validTasks.length,
        invalid: invalidCount
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '解析 JSON 文件失败'
    };
  }
}

export async function importFromCSV(file: File): Promise<ImportResult> {
  try {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      return {
        success: false,
        error: 'CSV 文件为空或格式错误'
      };
    }

    const tasks: Task[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);

      if (values.length < 1 || !values[0]) continue;

      const task: Task = {
        id: values[7] || `imported-${Date.now()}-${i}`,
        title: values[0],
        status: values[1] || undefined,
        priority: (values[2] as 'low' | 'medium' | 'high') || undefined,
        dueDate: values[3] ? parseDateString(values[3]) : undefined,
        tags: values[4] ? values[4].split(',').map(t => t.trim()).filter(Boolean) : undefined,
        description: values[5] || undefined,
        createdAt: values[6] ? parseDateString(values[6]) : Date.now()
      };

      tasks.push(task);
    }

    const { validTasks, invalidCount } = validateTasks(tasks);

    return {
      success: true,
      tasks: validTasks,
      summary: {
        total: tasks.length,
        valid: validTasks.length,
        invalid: invalidCount
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '解析 CSV 文件失败'
    };
  }
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

function parseDateString(dateStr: string): number | undefined {
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? undefined : date.getTime();
}

function validateTasks(tasks: any[]): { validTasks: Task[]; invalidCount: number } {
  const validTasks: Task[] = [];
  let invalidCount = 0;

  for (const task of tasks) {
    if (!task.title || typeof task.title !== 'string') {
      invalidCount++;
      continue;
    }

    const validTask: Task = {
      id: task.id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: task.title,
      description: task.description,
      createdAt: typeof task.createdAt === 'number' ? task.createdAt : Date.now(),
      dueDate: typeof task.dueDate === 'number' ? task.dueDate : undefined,
      priority: ['low', 'medium', 'high'].includes(task.priority) ? task.priority : undefined,
      tags: Array.isArray(task.tags) ? task.tags.filter((t: any) => typeof t === 'string') : undefined,
      status: task.status
    };

    validTasks.push(validTask);
  }

  return { validTasks, invalidCount };
}

export function detectFileType(file: File): 'json' | 'csv' | 'unknown' {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'json') return 'json';
  if (extension === 'csv') return 'csv';

  return 'unknown';
}
