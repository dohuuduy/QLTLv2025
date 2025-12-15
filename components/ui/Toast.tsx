
import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: ReactNode;
  duration?: number;
}

interface ToastContextType {
  addToast: (message: Omit<ToastMessage, 'id'>) => void;
  success: (message: ReactNode, title?: string) => void;
  error: (message: ReactNode, title?: string) => void;
  warning: (message: ReactNode, title?: string) => void;
  info: (message: ReactNode, title?: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { ...toast, id };
    // Add new toast to the top of the list
    setToasts((prev) => [newToast, ...prev]);
  }, []);

  const helpers = {
    success: (message: ReactNode, title?: string) => addToast({ type: 'success', message, title, duration: 3000 }),
    error: (message: ReactNode, title?: string) => addToast({ type: 'error', message, title, duration: 5000 }),
    warning: (message: ReactNode, title?: string) => addToast({ type: 'warning', message, title, duration: 4000 }),
    info: (message: ReactNode, title?: string) => addToast({ type: 'info', message, title, duration: 3000 }),
  };

  return (
    <ToastContext.Provider value={{ addToast, removeToast, ...helpers }}>
      {children}
      {createPortal(
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none w-full max-w-sm p-4 sm:p-0">
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onClose: () => void }> = ({ toast, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const progressRef = useRef<number>(100);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const remainingTimeRef = useRef<number>(toast.duration || 3000);

  // Animation entry
  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  // Timer logic
  useEffect(() => {
    if (toast.duration === 0) return; // Duration 0 = persistent

    const startTimer = () => {
      startTimeRef.current = Date.now();
      
      // Countdown for removal
      timerRef.current = setTimeout(() => {
        handleClose();
      }, remainingTimeRef.current);

      // Animation for progress bar
      const totalDuration = toast.duration || 3000;
      intervalRef.current = setInterval(() => {
        if (!isPaused) {
          const elapsed = Date.now() - startTimeRef.current;
          const percentage = Math.max(0, 100 - ((elapsed + (totalDuration - remainingTimeRef.current)) / totalDuration) * 100);
          progressRef.current = percentage;
          
          // Force update visual progress bar using DOM to avoid re-renders
          const progressBar = document.getElementById(`progress-${toast.id}`);
          if (progressBar) {
            progressBar.style.width = `${percentage}%`;
          }
        }
      }, 16); // ~60fps
    };

    if (!isPaused) {
      startTimer();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPaused, toast.duration, toast.id]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Wait for exit animation
  };

  const handleMouseEnter = () => {
    if (toast.duration === 0) return;
    setIsPaused(true);
    const elapsed = Date.now() - startTimeRef.current;
    remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const handleMouseLeave = () => {
    if (toast.duration === 0) return;
    setIsPaused(false);
  };

  const config = {
    success: { icon: CheckCircle, bg: 'bg-white dark:bg-slate-900', border: 'border-l-4 border-l-green-500', text: 'text-green-600 dark:text-green-400', progress: 'bg-green-500' },
    error: { icon: XCircle, bg: 'bg-white dark:bg-slate-900', border: 'border-l-4 border-l-red-500', text: 'text-red-600 dark:text-red-400', progress: 'bg-red-500' },
    warning: { icon: AlertTriangle, bg: 'bg-white dark:bg-slate-900', border: 'border-l-4 border-l-amber-500', text: 'text-amber-600 dark:text-amber-400', progress: 'bg-amber-500' },
    info: { icon: Info, bg: 'bg-white dark:bg-slate-900', border: 'border-l-4 border-l-blue-500', text: 'text-blue-600 dark:text-blue-400', progress: 'bg-blue-500' },
  }[toast.type];

  const Icon = config.icon;

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`
        pointer-events-auto w-full max-w-sm rounded-lg shadow-xl border border-gray-200 dark:border-slate-700 relative overflow-hidden group
        transition-all duration-300 ease-out transform
        ${config.bg}
        ${isVisible ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-full opacity-0 scale-95'}
      `}
    >
      <div className={`flex p-4 gap-3 ${config.border}`}>
        <div className={`shrink-0 ${config.text} mt-0.5`}>
          <Icon size={20} />
        </div>
        <div className="flex-1 min-w-0">
          {toast.title && <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-1 leading-none">{toast.title}</h4>}
          <div className="text-sm text-gray-600 dark:text-gray-300 leading-snug break-words">
            {toast.message}
          </div>
        </div>
        <button 
          onClick={handleClose}
          className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors self-start -mt-1 -mr-1 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800"
        >
          <X size={16} />
        </button>
      </div>
      
      {/* Progress Bar */}
      {toast.duration !== 0 && (
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-100 dark:bg-slate-800">
          <div 
            id={`progress-${toast.id}`}
            className={`h-full ${config.progress} transition-all duration-75 ease-linear`}
            style={{ width: '100%' }}
          ></div>
        </div>
      )}
    </div>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
