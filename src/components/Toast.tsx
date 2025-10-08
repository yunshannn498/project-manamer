import { useEffect } from 'react';
import { CheckCircle2, X, Loader2, Plus } from 'lucide-react';

export type ToastType = 'processing' | 'created' | 'updated';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    if (type === 'processing') return;

    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [type, duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'processing':
        return <Loader2 size={20} className="text-primary-500 flex-shrink-0 animate-spin" />;
      case 'created':
        return <Plus size={20} className="text-green-600 flex-shrink-0" />;
      case 'updated':
        return <CheckCircle2 size={20} className="text-green-600 flex-shrink-0" />;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'processing':
        return 'border-primary-200 bg-gradient-to-r from-primary-50 to-accent-50';
      case 'created':
      case 'updated':
        return 'border-green-200 bg-gradient-to-r from-green-50 to-emerald-50';
    }
  };

  return (
    <div className="fixed bottom-28 md:bottom-24 left-1/2 transform -translate-x-1/2 z-50 animate-slideUp px-4">
      <div className={`rounded-2xl shadow-2xl border-2 ${getBgColor()} px-5 py-4 md:px-4 md:py-3 flex items-center gap-3 min-w-[280px] max-w-md backdrop-blur-sm`}>
        {getIcon()}
        <p className="text-gray-900 font-semibold flex-1 text-base md:text-sm">{message}</p>
        {type !== 'processing' && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 transition-all duration-300 flex-shrink-0 active:scale-90 p-1 rounded-lg hover:bg-white/50"
          >
            <X size={20} className="md:w-[18px] md:h-[18px]" />
          </button>
        )}
      </div>
    </div>
  );
}
