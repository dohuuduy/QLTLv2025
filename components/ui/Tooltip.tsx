
import React, { ReactNode } from 'react';

interface TooltipProps {
  children: ReactNode;
  content: string | ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({ 
  children, 
  content, 
  position = 'top',
  className = ''
}) => {
  if (!content) return <>{children}</>;

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div className={`group relative flex items-center w-fit ${className}`}>
      {children}
      <div 
        className={`
          absolute z-50 hidden group-hover:block whitespace-nowrap 
          bg-slate-900 text-white dark:bg-white dark:text-slate-900 
          text-xs px-2 py-1 rounded shadow-lg animate-in fade-in zoom-in-95 duration-200
          ${positionClasses[position]}
        `}
      >
        {content}
        {/* Triangle Arrow */}
        <div 
          className={`
            absolute w-2 h-2 rotate-45 bg-slate-900 dark:bg-white
            ${position === 'top' ? 'top-full left-1/2 -translate-x-1/2 -mt-1' : ''}
            ${position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 -mb-1' : ''}
            ${position === 'left' ? 'left-full top-1/2 -translate-y-1/2 -ml-1' : ''}
            ${position === 'right' ? 'right-full top-1/2 -translate-y-1/2 -mr-1' : ''}
          `} 
        />
      </div>
    </div>
  );
};
