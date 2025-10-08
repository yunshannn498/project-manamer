import { Task } from '../types';
import { parseVoiceInput } from '../utils/taskParser';

interface ParseResponse {
  intent: 'create';
  newTask: Partial<Task>;
  confidence: number;
}

export const parseTaskIntent = async (
  text: string,
  _existingTasks: Task[]
): Promise<ParseResponse> => {
  const newTask = parseVoiceInput(text);
  return {
    intent: 'create',
    newTask,
    confidence: 1
  };
};