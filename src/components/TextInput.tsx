import { useState, useRef, useEffect } from 'react';
import { Send, Keyboard, Mic } from 'lucide-react';

interface TextInputProps {
  onSubmit: (text: string) => void;
}

export const TextInput = ({ onSubmit }: TextInputProps) => {
  const [text, setText] = useState('');
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const [isVoiceMode, setIsVoiceMode] = useState(isMobile);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingText, setRecordingText] = useState('');
  const [recordingStarted, setRecordingStarted] = useState(false);
  const recognitionRef = useRef<any>(null);
  const hasSubmittedRef = useRef(false);
  const isStoppingRef = useRef(false);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.error('[语音输入] 清理时停止录音失败:', error);
        }
      }
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSubmit(text.trim());
      setText('');
    }
  };

  const startRecording = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();

    if (isRecording || isStoppingRef.current) {
      console.log('[语音输入] 已在录音中或正在停止，忽略启动请求');
      return;
    }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('您的浏览器不支持语音识别功能。请使用 Chrome、Edge 或 Safari 浏览器。');
      return;
    }

    console.log('[语音输入] 开始录音');
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = 'zh-CN';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log('[语音输入] 录音已开始');
      setIsRecording(true);
      setRecordingStarted(true);
      setRecordingText('');
      hasSubmittedRef.current = false;
      isStoppingRef.current = false;

      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }

      recordingTimeoutRef.current = setTimeout(() => {
        console.log('[语音输入] 录音超时（60秒），自动停止');
        stopRecording();
      }, 60000);
    };

    recognition.onresult = (event: any) => {
      let transcript = '';

      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }

      console.log('[语音输入] 识别结果:', transcript);
      setRecordingText(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('[语音输入] 识别错误:', event.error);

      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
      }

      if (event.error === 'no-speech') {
        console.log('[语音输入] 未检测到语音');
      } else if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        alert('麦克风权限被拒绝，请在浏览器设置中允许使用麦克风');
      } else if (event.error !== 'aborted') {
        console.log('[语音输入] 识别失败，请重试');
      }

      setIsRecording(false);
      setRecordingStarted(false);
      setRecordingText('');
      recognitionRef.current = null;
      isStoppingRef.current = false;
    };

    recognition.onend = () => {
      console.log('[语音输入] 录音结束');
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
      }
      setIsRecording(false);
      setRecordingStarted(false);
      isStoppingRef.current = false;
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (error) {
      console.error('[语音输入] 启动失败:', error);
      setIsRecording(false);
      setRecordingStarted(false);
      recognitionRef.current = null;
      isStoppingRef.current = false;
    }
  };

  const stopRecording = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (!recognitionRef.current || isStoppingRef.current) {
      console.log('[语音输入] 无需停止：', !recognitionRef.current ? '未在录音' : '正在停止中');
      return;
    }

    console.log('[语音输入] stopRecording 被调用');
    console.log('[语音输入] recordingText:', recordingText);
    console.log('[语音输入] hasSubmittedRef.current:', hasSubmittedRef.current);

    isStoppingRef.current = true;

    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('[语音输入] 停止录音失败:', error);
      }
    }

    if ('vibrate' in navigator) {
      navigator.vibrate(30);
    }

    setTimeout(() => {
      const finalText = recordingText.trim();

      if (finalText && !hasSubmittedRef.current) {
        console.log('[语音输入] ✓ 提交语音文本:', finalText);
        hasSubmittedRef.current = true;
        onSubmit(finalText);
      } else {
        console.log('[语音输入] ✗ 不提交，原因:', !finalText ? '文本为空' : '已提交过');
      }

      setRecordingText('');
      recognitionRef.current = null;
      isStoppingRef.current = false;
    }, 300);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 glass-effect border-t-2 border-primary-200 shadow-2xl z-20">
      <div className="max-w-4xl mx-auto px-4 py-5 md:px-6 md:py-4">
        <div className="flex gap-4 md:gap-3 items-stretch">
          <button
            onClick={() => setIsVoiceMode(!isVoiceMode)}
            className={`p-4 md:p-3 rounded-2xl transition-all duration-300 active:scale-95 shadow-lg hover:shadow-xl ${
              isVoiceMode
                ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white'
                : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600 hover:from-orange-50 hover:to-amber-50 hover:text-primary-600'
            }`}
            title={isVoiceMode ? '切换到文字输入' : '切换到语音输入'}
          >
            {isVoiceMode ? <Mic size={24} className="md:w-5 md:h-5" /> : <Keyboard size={24} className="md:w-5 md:h-5" />}
          </button>

          {isVoiceMode ? (
            <button
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              onTouchCancel={stopRecording}
              onContextMenu={(e) => e.preventDefault()}
              className={`flex-1 rounded-2xl font-semibold transition-all min-h-[52px] md:min-h-0 text-base select-none touch-none shadow-lg ${
                isRecording
                  ? recordingStarted
                    ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white scale-95 shadow-red-300'
                    : 'bg-gradient-to-r from-primary-500 to-primary-600 text-white scale-95 animate-pulse shadow-primary-300'
                  : 'bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700 active:scale-95 hover:shadow-xl shadow-primary-300'
              }`}
              style={{
                WebkitUserSelect: 'none',
                userSelect: 'none',
                WebkitTouchCallout: 'none',
                touchAction: 'none'
              }}
            >
              {isRecording
                ? recordingStarted
                  ? (recordingText || '松开发送...')
                  : '正在启动...'
                : '按住说话'
              }
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="flex-1 flex gap-4 md:gap-3">
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="输入任务内容，例如：明天完成设计稿，高优先级..."
                className="flex-1 px-4 py-4 md:py-3 border-2 border-primary-200 rounded-2xl focus:ring-4 focus:ring-primary-200 focus:border-primary-500 text-gray-800 placeholder-gray-400 text-base transition-all duration-300 shadow-md focus:shadow-lg"
              />
              <button
                type="submit"
                disabled={!text.trim()}
                className="bg-gradient-to-r from-primary-500 to-primary-600 text-white p-4 md:p-3 rounded-2xl hover:from-primary-600 hover:to-primary-700 transition-all duration-300 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed active:scale-95 shadow-lg hover:shadow-xl disabled:shadow-none"
              >
                <Send size={24} className="md:w-5 md:h-5" />
              </button>
            </form>
          )}
        </div>

        <p className="text-xs md:text-xs text-sm text-gray-600 mt-2 font-medium">
          {isVoiceMode
            ? '按住按钮说话，松开自动发送 🎙️'
            : '提示：可以说明优先级（紧急/重要/普通）、时间（明天/下周）、添加描述等 ✨'}
        </p>
      </div>
    </div>
  );
};
