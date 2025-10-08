import { Task } from '../types';
import { parseVoiceInput } from '../utils/taskParser';
import { cleanTaskTitle, shouldUseCleanedTitle } from '../utils/titleCleaner';

interface ParseResponse {
  intent: 'create';
  newTask: Partial<Task>;
  confidence: number;
}

interface GeminiResponse {
  cleanTitle: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  owner?: string;
  dueDate?: string;
  confidence: number;
}

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

const parseWithGemini = async (text: string): Promise<GeminiResponse | null> => {
  if (!GEMINI_API_KEY) {
    console.log('[Gemini] API key not configured');
    return null;
  }

  try {
    const prompt = `你是一个任务管理助手。用户输入了一段任务描述，请提取以下信息：

用户输入: "${text}"

请从文本中提取：
1. cleanTitle: 纯粹的任务描述（去掉负责人、时间、优先级等元信息）
2. owner: 负责人（如果提到：阿伟、choco、05）
3. priority: 优先级（high/medium/low，如果提到：紧急、重要、普通、不急等）
4. dueDate: 截止时间的自然语言描述（保留原文，如：10月9日、明天、下周等）
5. confidence: 你对提取准确度的信心（0-1之间）

示例：
输入："给奉中附初列时间表 choco 10月9日"
输出：{"cleanTitle": "给奉中附初列时间表", "owner": "choco", "dueDate": "10月9日", "confidence": 0.95}

输入："紧急 明天下午3点开会 阿伟"
输出：{"cleanTitle": "开会", "owner": "阿伟", "priority": "high", "dueDate": "明天下午3点", "confidence": 0.9}

请以JSON格式返回结果，只返回JSON，不要其他文字。`;

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 500,
        }
      })
    });

    if (!response.ok) {
      console.error('[Gemini] API request failed:', response.status);
      return null;
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      console.error('[Gemini] No text in response');
      return null;
    }

    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[Gemini] Could not extract JSON from response');
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]) as GeminiResponse;
    console.log('[Gemini] Successfully parsed:', parsed);
    return parsed;

  } catch (error) {
    console.error('[Gemini] Error:', error);
    return null;
  }
};

export const parseTaskIntent = async (
  text: string,
  _existingTasks: Task[]
): Promise<ParseResponse> => {
  console.log('[parseTaskIntent] Starting with text:', text);

  const geminiResult = await parseWithGemini(text);

  if (geminiResult && geminiResult.confidence > 0.7 && geminiResult.cleanTitle) {
    console.log('[parseTaskIntent] Using Gemini result');

    const newTask = parseVoiceInput(text);

    if (geminiResult.cleanTitle && geminiResult.cleanTitle.trim()) {
      newTask.title = geminiResult.cleanTitle.trim();
    }

    return {
      intent: 'create',
      newTask,
      confidence: geminiResult.confidence
    };
  }

  console.log('[parseTaskIntent] Using local parser with title cleaning');
  const newTask = parseVoiceInput(text);

  const cleanResult = cleanTaskTitle(text);
  console.log('[parseTaskIntent] Title cleaning result:', cleanResult);

  if (shouldUseCleanedTitle(cleanResult) && cleanResult.cleanTitle) {
    newTask.title = cleanResult.cleanTitle;
    console.log('[parseTaskIntent] Applied cleaned title:', cleanResult.cleanTitle);
  }

  return {
    intent: 'create',
    newTask,
    confidence: cleanResult.confidence
  };
};
