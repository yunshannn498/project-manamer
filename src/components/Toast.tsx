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
        return <Loader2 size={20} className="text-blue-500 flex-shrink-0 animate-spin" />;
      case 'created':
        return <Plus size={20} className="text-green-500 flex-shrink-0" />;
      case 'updated':
        return <CheckCircle2 size={20} className="text-green-500 flex-shrink-0" />;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'processing':
        return 'border-blue-200';
      case 'created':
      case 'updated':
        return 'border-green-200';
    }
  };

  return (
    <div className="fixed bottom-28 md:bottom-24 left-1/2 transform -translate-x-1/2 z-50 animate-slideUp px-4">
      <div className={`bg-white rounded-lg shadow-lg border-2 ${getBorderColor()} px-5 py-4 md:px-4 md:py-3 flex items-center gap-3 min-w-[280px] max-w-md`}>
        {getIcon()}
        <p className="text-gray-900 font-medium flex-1 text-base md:text-sm">{message}</p>
        {type !== 'processing' && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 active:scale-95 p-1"
          >
            <X size={20} className="md:w-[18px] md:h-[18px]" />
          </button>
        )}
      </div>
    </div>
  );
}
