
import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
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
    setToasts((prev) => [...prev, newToast]);

    if (toast.duration !== 0) {
      setTimeout(() => {
        removeToast(id);
      }, toast.duration || 3000);
    }
  }, [removeToast]);

  const helpers = {
    success: (message: ReactNode, title?: string) => addToast({ type: 'success', message, title }),
    error: (message: ReactNode, title?: string) => addToast({ type: 'error', message, title, duration: 5000 }), // Lỗi hiện lâu hơn
    warning: (message: ReactNode, title?: string) => addToast({ type: 'warning', message, title, duration: 4000 }),
    info: (message: ReactNode, title?: string) => addToast({ type: 'info', message, title }),
  };

  return (
    <ToastContext.Provider value={{ addToast, ...helpers }}>
      {children}
      {createPortal(
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
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
  // Animation effect
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Wait for exit animation
  };

  const config = {
    success: { icon: CheckCircle, bg: 'bg-white dark:bg-slate-800', border: 'border-l-4 border-l-green-500', text: 'text-green-600 dark:text-green-400' },
    error: { icon: XCircle, bg: 'bg-white dark:bg-slate-800', border: 'border-l-4 border-l-red-500', text: 'text-red-600 dark:text-red-400' },
    warning: { icon: AlertTriangle, bg: 'bg-white dark:bg-slate-800', border: 'border-l-4 border-l-amber-500', text: 'text-amber-600 dark:text-amber-400' },
    info: { icon: Info, bg: 'bg-white dark:bg-slate-800', border: 'border-l-4 border-l-blue-500', text: 'text-blue-600 dark:text-blue-400' },
  }[toast.type];

  const Icon = config.icon;

  return (
    <div
      className={`
        pointer-events-auto w-80 max-w-[90vw] p-4 rounded shadow-lg border border-gray-100 dark:border-slate-700 flex gap-3 relative
        transition-all duration-300 ease-in-out transform
        ${config.bg} ${config.border}
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      <div className={`shrink-0 ${config.text}`}>
        <Icon size={20} />
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        {toast.title && <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100 mb-1">{toast.title}</h4>}
        <div className="text-sm text-gray-600 dark:text-gray-300 leading-snug break-words">
          {toast.message}
        </div>
      </div>
      <button 
        onClick={handleClose}
        className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors self-start -mt-1 -mr-1 p-1"
      >
        <X size={16} />
      </button>
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
