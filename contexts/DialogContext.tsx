
import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { AlertDialog, DialogType } from '../components/ui/AlertDialog';

interface DialogConfig {
  isOpen: boolean;
  type: DialogType;
  title: string;
  message: React.ReactNode;
  onConfirm?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface DialogContextType {
  alert: (message: React.ReactNode, options?: { title?: string; type?: DialogType; btnLabel?: string }) => Promise<void>;
  confirm: (message: React.ReactNode, options?: { title?: string; type?: DialogType; confirmLabel?: string; cancelLabel?: string }) => Promise<boolean>;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const DialogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [dialog, setDialog] = useState<DialogConfig>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
  });

  const alert = useCallback((message: React.ReactNode, options: { title?: string; type?: DialogType; btnLabel?: string } = {}) => {
    return new Promise<void>((resolve) => {
      setDialog({
        isOpen: true,
        type: options.type || 'info',
        title: options.title || 'Thông báo',
        message: message,
        confirmLabel: options.btnLabel || 'Đóng',
        onConfirm: () => {
          resolve();
        }
      });
    });
  }, []);

  const confirm = useCallback((message: React.ReactNode, options: { title?: string; type?: DialogType; confirmLabel?: string; cancelLabel?: string } = {}) => {
    return new Promise<boolean>((resolve) => {
      setDialog({
        isOpen: true,
        type: options.type || 'confirm',
        title: options.title || 'Xác nhận',
        message: message,
        confirmLabel: options.confirmLabel || 'Đồng ý',
        cancelLabel: options.cancelLabel || 'Hủy bỏ',
        onConfirm: () => resolve(true),
      });
    });
  }, []);

  const handleClose = () => {
    setDialog(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <DialogContext value={{ alert, confirm }}>
      {children}
      <AlertDialog
        isOpen={dialog.isOpen}
        onClose={handleClose}
        type={dialog.type}
        title={dialog.title}
        message={dialog.message}
        onConfirm={dialog.onConfirm}
        confirmLabel={dialog.confirmLabel}
        cancelLabel={dialog.cancelLabel}
      />
    </DialogContext>
  );
};

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
};
