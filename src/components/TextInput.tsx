import { useState, useRef } from 'react';
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
  const recognitionRef = useRef<any>(null);
  const hasSubmittedRef = useRef(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSubmit(text.trim());
      setText('');
    }
  };

  const startRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('您的浏览器不支持语音识别功能。请使用 Chrome、Edge 或 Safari 浏览器。');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = 'zh-CN';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsRecording(true);
      setRecordingText('');
      hasSubmittedRef.current = false;
    };

    recognition.onresult = (event: any) => {
      let transcript = '';

      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }

      setRecordingText(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
      setRecordingText('');
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  const stopRecording = () => {
    console.log('[语音输入-TextInput] stopRecording 被调用');
    console.log('[语音输入-TextInput] recordingText:', recordingText);
    console.log('[语音输入-TextInput] hasSubmittedRef.current:', hasSubmittedRef.current);

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    if (recordingText.trim() && !hasSubmittedRef.current) {
      console.log('[语音输入-TextInput] ✓ 提交语音文本:', recordingText.trim());
      hasSubmittedRef.current = true;
      onSubmit(recordingText.trim());
    } else {
      console.log('[语音输入-TextInput] ✗ 不提交，原因:', !recordingText.trim() ? '文本为空' : '已提交过');
    }

    setIsRecording(false);
    setRecordingText('');
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
      <div className="max-w-4xl mx-auto px-4 py-5 md:px-6 md:py-4">
        <div className="flex gap-4 md:gap-3 items-stretch">
          <button
            onClick={() => setIsVoiceMode(!isVoiceMode)}
            className={`p-4 md:p-3 rounded-lg transition-colors active:scale-95 ${
              isVoiceMode
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={isVoiceMode ? '切换到文字输入' : '切换到语音输入'}
          >
            {isVoiceMode ? <Mic size={24} className="md:w-5 md:h-5" /> : <Keyboard size={24} className="md:w-5 md:h-5" />}
          </button>

          {isVoiceMode ? (
            <button
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onMouseLeave={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              className={`flex-1 rounded-lg font-medium transition-all min-h-[52px] md:min-h-0 text-base ${
                isRecording
                  ? 'bg-red-500 text-white scale-95'
                  : 'bg-blue-500 text-white hover:bg-blue-600 active:scale-95'
              }`}
            >
              {isRecording ? (recordingText || '松开发送...') : '按住说话'}
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="flex-1 flex gap-4 md:gap-3">
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="输入任务内容，例如：明天完成设计稿，高优先级..."
                className="flex-1 px-4 py-4 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 placeholder-gray-400 text-base"
              />
              <button
                type="submit"
                disabled={!text.trim()}
                className="bg-blue-500 text-white p-4 md:p-3 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed active:scale-95"
              >
                <Send size={24} className="md:w-5 md:h-5" />
              </button>
            </form>
          )}
        </div>

        <p className="text-xs md:text-xs text-sm text-gray-500 mt-2">
          {isVoiceMode
            ? '按住按钮说话，松开自动发送'
            : '提示：可以说明优先级（紧急/重要/普通）、时间（明天/下周）、添加描述等'}
        </p>
      </div>
    </div>
  );
};
