
import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle, CheckCircle, Info, XCircle, HelpCircle } from 'lucide-react';

export type DialogType = 'info' | 'success' | 'warning' | 'error' | 'confirm';

export interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  type: DialogType;
  title: string;
  message: React.ReactNode;
  onConfirm?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

export const AlertDialog: React.FC<AlertDialogProps> = ({
  isOpen,
  onClose,
  type,
  title,
  message,
  onConfirm,
  confirmLabel = 'Đồng ý',
  cancelLabel = 'Hủy bỏ'
}) => {
  const getIcon = () => {
    switch (type) {
      case 'success': return <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 mb-4 animate-in zoom-in duration-300"><CheckCircle size={24} /></div>;
      case 'error': return <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-600 dark:text-red-400 mb-4 animate-in shake duration-300"><XCircle size={24} /></div>;
      case 'warning': return <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center text-orange-600 dark:text-orange-400 mb-4 animate-in zoom-in duration-300"><AlertTriangle size={24} /></div>;
      case 'confirm': return <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 animate-in zoom-in duration-300"><HelpCircle size={24} /></div>;
      default: return <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center text-blue-500 dark:text-blue-400 mb-4 animate-in zoom-in duration-300"><Info size={24} /></div>;
    }
  };

  const isConfirm = type === 'confirm' || type === 'warning';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="sm">
      <div className="flex flex-col items-center text-center p-6 pt-2">
        {getIcon()}
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 leading-tight">
          {title}
        </h3>
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
          {message}
        </div>
        
        <div className="flex gap-3 w-full">
          {isConfirm && (
            <Button 
              variant="secondary" 
              onClick={onClose} 
              className="flex-1"
            >
              {cancelLabel}
            </Button>
          )}
          <Button 
            onClick={() => {
              if (onConfirm) onConfirm();
              onClose();
            }} 
            className={`flex-1 ${type === 'error' || (type === 'confirm' && title.toLowerCase().includes('xóa')) ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800'}`}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
