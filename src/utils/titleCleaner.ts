export interface CleanTitleResult {
  cleanTitle: string;
  removedPatterns: string[];
  confidence: number;
}

const OWNER_PATTERNS = ['阿伟', 'choco', '05'];

const PRIORITY_KEYWORDS = [
  '紧急', '重要', '高优先级', '高优',
  '中等', '普通', '中优先级', '中优',
  '低优先级', '低优', '不急'
];

const DATE_PATTERNS = [
  /\d{1,2}月\d{1,2}[日号]/g,
  /(明天|今天|后天)?\s*(上午|下午|早上|晚上|傍晚|中午|清晨)\s*\d{1,2}[点:：](\d{1,2})?/g,
  /\d{1,2}[点:：](\d{1,2})?\s*(上午|下午|早上|晚上|傍晚|中午|清晨)?/g,
  /(本周|这周|下周)(周?[一二三四五六日天])?/g,
  /周[一二三四五六日天]|星期[一二三四五六日天]|礼拜[一二三四五六日天]/g,
  /明天/g,
  /今天/g,
  /后天/g,
  /本月|这个月/g,
  /下个月|下月/g,
  /上午|下午|早上|晚上|傍晚|中午|清晨/g
];

const CONTEXT_KEYWORDS = [
  '负责人:', '负责人：',
  '截止', '截止时间', '截止日期',
  '时间:', '时间：',
  '日期:', '日期：',
  '标签:', '标签：',
  '分类:', '分类：',
  '类别:', '类别：',
  '详情:', '详情：',
  '描述:', '描述：',
  '说明:', '说明：',
  '备注:', '备注：'
];

export const cleanTaskTitle = (rawText: string): CleanTitleResult => {
  let cleanedText = rawText.trim();
  const removedPatterns: string[] = [];

  const priorityRegex = new RegExp(`(${PRIORITY_KEYWORDS.join('|')})`, 'gi');
  const priorityMatches = cleanedText.match(priorityRegex);
  if (priorityMatches) {
    removedPatterns.push(...priorityMatches);
    cleanedText = cleanedText.replace(priorityRegex, ' ');
  }

  for (const pattern of DATE_PATTERNS) {
    const matches = cleanedText.match(pattern);
    if (matches) {
      removedPatterns.push(...matches);
      cleanedText = cleanedText.replace(pattern, ' ');
    }
  }

  for (const owner of OWNER_PATTERNS) {
    if (cleanedText.includes(owner)) {
      const ownerRegex = new RegExp(owner, 'g');
      const ownerMatches = cleanedText.match(ownerRegex);
      if (ownerMatches) {
        removedPatterns.push(...ownerMatches);
        cleanedText = cleanedText.replace(ownerRegex, ' ');
      }
    }
  }

  for (const keyword of CONTEXT_KEYWORDS) {
    if (cleanedText.includes(keyword)) {
      const index = cleanedText.indexOf(keyword);
      removedPatterns.push(keyword);
      cleanedText = cleanedText.substring(0, index) + ' ' + cleanedText.substring(index + keyword.length);
    }
  }

  cleanedText = cleanedText.replace(/[\s，,、]+/g, ' ');
  cleanedText = cleanedText.trim();

  const confidence = calculateConfidence(rawText, cleanedText, removedPatterns);

  return {
    cleanTitle: cleanedText || rawText.trim(),
    removedPatterns,
    confidence
  };
};

const calculateConfidence = (
  original: string,
  cleaned: string,
  removed: string[]
): number => {
  if (cleaned.length === 0) return 0;
  if (original === cleaned) return 0.5;

  const removalRatio = removed.length / original.length;
  const lengthRatio = cleaned.length / original.length;

  if (lengthRatio < 0.2) return 0.3;
  if (lengthRatio < 0.4) return 0.6;
  if (lengthRatio < 0.7) return 0.8;

  return 0.9;
};

export const shouldUseCleanedTitle = (result: CleanTitleResult): boolean => {
  if (result.cleanTitle.length < 2) return false;

  if (result.confidence < 0.3) return false;

  if (result.removedPatterns.length === 0) return false;

  return true;
};
