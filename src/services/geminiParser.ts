import { Task } from '../types';

interface ParseResponse {
  intent: 'create' | 'edit';
  taskToEdit?: string;
  updates?: Partial<Task>;
  newTask?: Partial<Task>;
  confidence: number;
  needsConfirmation?: boolean;
  suggestedTasks?: Task[];
}

const GEMINI_API_KEY = 'AIzaSyDt75m63rOV4qAZAtX-MRypBEi_qrONM4o';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';

export const parseTaskIntent = async (
  text: string,
  existingTasks: Task[]
): Promise<ParseResponse> => {
  const prompt = `你是一个任务管理助手。分析用户的输入，判断用户想要"创建新任务"还是"编辑现有任务"。

现有任务列表：
${existingTasks.map((t, i) => `${i + 1}. ID: ${t.id}, 标题: "${t.title}", 截止时间: ${t.dueDate ? new Date(t.dueDate).toLocaleString('zh-CN') : '无'}`).join('\n')}

用户输入："${text}"

请以JSON格式返回分析结果，不要包含任何其他文字或markdown标记：
{
  "intent": "create" 或 "edit",
  "taskToEdit": "任务ID（仅在intent为edit时）",
  "confidence": 0-1之间的数字,
  "updates": {
    "title": "新标题（如果要修改）",
    "dueDate": 时间戳毫秒数或null（如果提到时间修改）,
    "priority": "low/medium/high"（如果提到优先级）
  },
  "newTask": {
    "title": "任务标题",
    "dueDate": 时间戳毫秒数或null,
    "priority": "medium"
  }
}

判断规则：
1. 如果用户提到"修改"、"改"、"调整"、"推迟"、"提前"等词，且能匹配到现有任务，则为edit
2. 时间解析：
   - "今天X点" = 今天的X点
   - "明天X点" = 明天的X点
   - "X点前" = 今天的X点
   - "从X点改到Y点" = 修改为今天的Y点
3. 其他情况为create
4. confidence表示匹配任务的确信度

当前时间：${new Date().toLocaleString('zh-CN')}`;

  try {
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
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Gemini API 完整响应:', JSON.stringify(data, null, 2));

    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('Gemini 返回文本:', textResponse);

    if (!textResponse) {
      console.error('Gemini 没有返回任何文本，完整数据:', data);
      throw new Error('Empty response from Gemini');
    }

    let jsonText = textResponse.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\s*\n?/, '').replace(/\n?```\s*$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\s*\n?/, '').replace(/\n?```\s*$/, '');
    }

    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('无法从响应中提取 JSON，原始文本:', textResponse);
      throw new Error('No JSON found in response');
    }

    const result = JSON.parse(jsonMatch[0]);
    console.log('解析结果:', result);

    if (result.intent === 'edit' && result.updates?.dueDate) {
      result.updates.dueDate = Number(result.updates.dueDate);
    }
    if (result.intent === 'create' && result.newTask?.dueDate) {
      result.newTask.dueDate = Number(result.newTask.dueDate);
    }

    return result;

  } catch (error) {
    console.error('Gemini parsing error:', error);

    const { parseVoiceInput } = await import('../utils/taskParser');
    return {
      intent: 'create',
      newTask: parseVoiceInput(text),
      confidence: 0
    };
  }
};
