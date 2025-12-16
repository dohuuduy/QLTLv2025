
import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, Clock, Info, CheckCircle, AlertTriangle, XCircle, Trash2 } from 'lucide-react';
import { AppNotification } from '../types';
import { Button } from './ui/Button';

interface NotificationCenterProps {
  notifications: AppNotification[];
  setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>;
  onNavigate: (path: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ 
  notifications, 
  setNotifications, 
  onNavigate 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleClearAll = () => {
    setNotifications([]);
  };

  const handleClickItem = (notification: AppNotification) => {
    // 1. Mark as read
    if (!notification.read) {
        setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));
    }
    // 2. Navigate if link exists
    if (notification.linkTo) {
        onNavigate(notification.linkTo);
        setIsOpen(false);
    }
  };

  const getIcon = (type: string) => {
      switch (type) {
          case 'success': return <div className="p-2 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"><CheckCircle size={16} /></div>;
          case 'warning': return <div className="p-2 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"><AlertTriangle size={16} /></div>;
          case 'error': return <div className="p-2 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"><XCircle size={16} /></div>;
          default: return <div className="p-2 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"><Info size={16} /></div>;
      }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className={`relative p-2.5 rounded-full transition-all duration-200 ${isOpen ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}
        title="Thông báo"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[10px] text-white font-bold items-center justify-center border-2 border-background">
                {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-3 w-80 sm:w-96 bg-popover border border-border rounded-xl shadow-2xl overflow-hidden z-[90] animate-in fade-in slide-in-from-top-2 origin-top-right ring-1 ring-black/5">
           {/* Header */}
           <div className="p-4 border-b border-border bg-muted/30 flex justify-between items-center backdrop-blur-sm">
               <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                   Thông báo {unreadCount > 0 && <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full border border-primary/20">{unreadCount} mới</span>}
               </h3>
               <div className="flex gap-1">
                   {unreadCount > 0 && (
                       <button onClick={handleMarkAllRead} className="p-1.5 text-primary hover:bg-primary/10 rounded-md transition-colors" title="Đánh dấu đã đọc hết">
                           <Check size={16} />
                       </button>
                   )}
                   {notifications.length > 0 && (
                        <button onClick={handleClearAll} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors" title="Xóa tất cả">
                            <Trash2 size={16} />
                        </button>
                   )}
               </div>
           </div>

           {/* List */}
           <div className="max-h-[60vh] overflow-y-auto custom-scrollbar bg-card">
              {notifications.length > 0 ? (
                <div className="divide-y divide-border">
                    {notifications.map(n => (
                      <div 
                        key={n.id} 
                        onClick={() => handleClickItem(n)} 
                        className={`
                            relative p-4 flex gap-3 cursor-pointer transition-all duration-200 group
                            ${!n.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'hover:bg-muted/50'}
                        `}
                      >
                         {!n.read && <div className="absolute left-0 top-4 bottom-4 w-1 bg-blue-500 rounded-r-full"></div>}
                         
                         <div className="shrink-0 mt-0.5">
                             {getIcon(n.type)}
                         </div>
                         
                         <div className="flex-1 min-w-0">
                             <div className="flex justify-between items-start mb-1">
                                <span className={`text-sm font-semibold truncate pr-2 ${!n.read ? 'text-foreground' : 'text-muted-foreground'}`}>{n.title}</span>
                                <span className="text-[10px] text-muted-foreground whitespace-nowrap flex items-center gap-1 shrink-0 bg-background/50 px-1.5 py-0.5 rounded">
                                    <Clock size={10}/> {n.time}
                                </span>
                             </div>
                             <p className={`text-xs leading-relaxed ${!n.read ? 'text-foreground/90' : 'text-muted-foreground line-clamp-2'}`}>{n.message}</p>
                         </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-3">
                        <Bell size={32} className="text-muted-foreground/50" />
                    </div>
                    <p className="text-sm font-medium text-foreground">Không có thông báo mới</p>
                    <p className="text-xs text-muted-foreground mt-1">Bạn đã cập nhật tất cả tin tức.</p>
                </div>
              )}
           </div>
           
           {/* Footer */}
           {notifications.length > 0 && (
               <div className="p-2 border-t border-border bg-muted/30 text-center">
                   <button className="text-xs font-medium text-primary hover:underline" onClick={() => setIsOpen(false)}>Đóng lại</button>
               </div>
           )}
        </div>
      )}
    </div>
  );
};
