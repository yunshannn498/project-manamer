import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

interface NetworkStatusProps {
  isOffline: boolean;
  onReconnect: () => Promise<void>;
}

export default function NetworkStatus({ isOffline, onReconnect }: NetworkStatusProps) {
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [showStatus, setShowStatus] = useState(true);
  const [browserOnline, setBrowserOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setBrowserOnline(true);
      setShowStatus(true);
    };
    const handleOffline = () => {
      setBrowserOnline(false);
      setShowStatus(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleReconnect = async () => {
    setIsReconnecting(true);
    try {
      await onReconnect();
    } finally {
      setTimeout(() => {
        setIsReconnecting(false);
      }, 500);
    }
  };

  const effectiveOffline = isOffline || !browserOnline;

  if (!showStatus) return null;

  return (
    <div className="flex items-center gap-2">
      {effectiveOffline ? (
        <>
          <div className="hidden md:flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1.5 rounded-lg text-sm font-medium">
            <WifiOff size={16} className="flex-shrink-0" />
            <span>离线</span>
          </div>

          <div className="md:hidden flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 px-2 py-1.5 rounded-lg">
            <WifiOff size={14} />
          </div>

          <button
            onClick={handleReconnect}
            disabled={isReconnecting}
            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          >
            <RefreshCw size={14} className={`flex-shrink-0 ${isReconnecting ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">重新连接</span>
          </button>
        </>
      ) : (
        <>
          <div className="hidden md:flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-3 py-1.5 rounded-lg text-sm font-medium">
            <Wifi size={16} className="flex-shrink-0" />
            <span>在线</span>
          </div>

          <div className="md:hidden flex items-center gap-1 bg-green-50 border border-green-200 text-green-700 px-2 py-1.5 rounded-lg">
            <Wifi size={14} />
          </div>
        </>
      )}
    </div>
  );
}
