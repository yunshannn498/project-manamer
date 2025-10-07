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
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

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
    "priority": "medium",
    "status": "todo"
  }
}

判断规则：
1. 如果用户提到"修改"、"改"、"调整"、"推迟"、"提前"等词，且能匹配到现有任务，则为edit
2. 时间解析（基于当前时间计算）：
   - 当前时间：${now.toLocaleString('zh-CN')} (${now.getTime()})
   - 今天23:59：${new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59).getTime()}
   - 明天23:59：${new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 23, 59).getTime()}
   - 如果提到"明天X点"，用明天的日期 + 指定小时
   - 如果提到"今天X点"，用今天的日期 + 指定小时
3. 其他情况为create
4. confidence表示匹配任务的确信度`;

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
    console.log('Gemini 解析结果:', result);

    const { parseVoiceInput, parseEditIntent } = await import('../utils/taskParser');

    if (result.intent === 'edit') {
      const localUpdates = parseEditIntent(text);
      console.log('本地时间解析结果:', localUpdates);

      result.updates = {
        ...result.updates,
        ...localUpdates
      };

      if (result.updates.dueDate === null || result.updates.dueDate === undefined) {
        delete result.updates.dueDate;
      }
    } else if (result.intent === 'create') {
      const localTask = parseVoiceInput(text);
      console.log('本地时间解析结果:', localTask);

      result.newTask = {
        ...result.newTask,
        ...localTask
      };
    }

    console.log('合并后的最终结果:', result);
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
