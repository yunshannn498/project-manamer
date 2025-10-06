import { Task } from '../types';

export interface TaskMatch {
  task: Task;
  confidence: number;
  reason: string;
}

export const findMatchingTasks = (voiceText: string, tasks: Task[]): TaskMatch[] => {
  const lowerText = voiceText.toLowerCase();
  const matches: TaskMatch[] = [];

  tasks.forEach(task => {
    let confidence = 0;
    const reasons: string[] = [];

    const taskTitleLower = task.title.toLowerCase();

    if (taskTitleLower === lowerText) {
      confidence += 100;
      reasons.push('标题完全匹配');
    } else if (taskTitleLower.includes(lowerText) || lowerText.includes(taskTitleLower)) {
      confidence += 80;
      reasons.push('标题部分匹配');
    } else {
      const titleWords = taskTitleLower.split(/\s+/);
      const textWords = lowerText.split(/\s+/);
      const matchingWords = titleWords.filter(word =>
        textWords.some(textWord => word.includes(textWord) || textWord.includes(word))
      );

      if (matchingWords.length > 0) {
        confidence += (matchingWords.length / titleWords.length) * 60;
        reasons.push(`关键词匹配(${matchingWords.length}/${titleWords.length})`);
      }
    }

    if (task.description) {
      const descLower = task.description.toLowerCase();
      if (descLower.includes(lowerText) || lowerText.includes(descLower)) {
        confidence += 30;
        reasons.push('描述匹配');
      }
    }

    if (task.tags) {
      const matchingTags = task.tags.filter(tag =>
        lowerText.includes(tag.toLowerCase())
      );
      if (matchingTags.length > 0) {
        confidence += matchingTags.length * 20;
        reasons.push(`标签匹配(${matchingTags.join(', ')})`);
      }
    }

    if (confidence > 0) {
      matches.push({
        task,
        confidence: Math.min(confidence, 100),
        reason: reasons.join(' | ')
      });
    }
  });

  return matches.sort((a, b) => b.confidence - a.confidence);
};
