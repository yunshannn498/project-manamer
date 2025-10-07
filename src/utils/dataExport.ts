import { Task } from '../types';

export function exportToJSON(tasks: Task[]): string {
  return JSON.stringify(tasks, null, 2);
}

export function exportToCSV(tasks: Task[]): string {
  const headers = ['标题', '状态', '优先级', '截止日期', '标签', '描述', '创建时间', 'ID'];
  const rows = tasks.map(task => [
    escapeCSV(task.title),
    escapeCSV(task.status || ''),
    escapeCSV(task.priority || ''),
    task.dueDate ? new Date(task.dueDate).toLocaleString('zh-CN') : '',
    escapeCSV((task.tags || []).join(', ')),
    escapeCSV(task.description || ''),
    new Date(task.createdAt).toLocaleString('zh-CN'),
    task.id
  ]);

  return [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function getExportFilename(extension: 'json' | 'csv'): string {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0];
  const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-');
  return `tasks-${dateStr}-${timeStr}.${extension}`;
}
