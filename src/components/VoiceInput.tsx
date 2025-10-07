import { useState, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { BaiduSpeechRecognizer } from '../services/baiduSpeech';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
}

export const VoiceInput = ({ onTranscript }: VoiceInputProps) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [useBaidu, setUseBaidu] = useState(true);
  const recognitionRef = useRef<any>(null);
  const baiduRecognizerRef = useRef<BaiduSpeechRecognizer | null>(null);

  const startListeningBaidu = async () => {
    try {
      setIsListening(true);
      setTranscript('正在录音...');

      if (!baiduRecognizerRef.current) {
        baiduRecognizerRef.current = new BaiduSpeechRecognizer();
      }

      await baiduRecognizerRef.current.startRecording();
    } catch (error) {
      console.error('百度语音识别错误:', error);
      alert('无法启动录音：' + (error as Error).message);
      setIsListening(false);
    }
  };

  const stopListeningBaidu = async () => {
    try {
      if (!baiduRecognizerRef.current) return;

      setTranscript('识别中...');
      const text = await baiduRecognizerRef.current.stopRecording();
      setTranscript(text);
      onTranscript(text);
      setIsListening(false);
    } catch (error) {
      console.error('语音识别失败:', error);
      alert('语音识别失败：' + (error as Error).message);
      setIsListening(false);
      setTranscript('');
    }
  };

  const startListening = () => {
    if (useBaidu) {
      startListeningBaidu();
      return;
    }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('您的浏览器不支持语音识别功能。请使用 Chrome、Edge 或 Safari 浏览器。');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = 'zh-CN';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPiece = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptPiece;
        } else {
          interimTranscript += transcriptPiece;
        }
      }

      setTranscript(finalTranscript || interimTranscript);

      if (finalTranscript) {
        onTranscript(finalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  const stopListening = () => {
    if (useBaidu) {
      stopListeningBaidu();
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  return (
    <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-2">
      <button
        onClick={() => setUseBaidu(!useBaidu)}
        className="px-3 py-1 bg-gray-700 text-white text-xs rounded-full hover:bg-gray-600 transition-colors"
      >
        {useBaidu ? '百度语音' : '浏览器语音'}
      </button>
      <button
        onClick={isListening ? stopListening : startListening}
        className={`
          w-16 h-16 rounded-full shadow-lg flex items-center justify-center
          transition-all duration-300 transform hover:scale-110
          ${isListening
            ? 'bg-red-500 hover:bg-red-600 animate-pulse'
            : 'bg-blue-500 hover:bg-blue-600'
          }
        `}
      >
        {isListening ? (
          <MicOff size={28} className="text-white" />
        ) : (
          <Mic size={28} className="text-white" />
        )}
      </button>

      {transcript && (
        <div className="absolute bottom-20 right-0 bg-white rounded-lg shadow-xl p-4 max-w-sm">
          <p className="text-sm text-gray-600 mb-1">识别中...</p>
          <p className="text-gray-800">{transcript}</p>
        </div>
      )}
    </div>
  );
};
