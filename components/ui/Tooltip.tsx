import React, { ReactNode, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  children: ReactNode;
  content: string | ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  delay?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({ 
  children, 
  content, 
  position = 'top',
  className = '',
  delay = 200
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;
      
      let top = 0;
      let left = 0;
      const offset = 8; // Distance from element

      switch (position) {
        case 'top':
          top = rect.top + scrollY - offset;
          left = rect.left + scrollX + rect.width / 2;
          break;
        case 'bottom':
          top = rect.bottom + scrollY + offset;
          left = rect.left + scrollX + rect.width / 2;
          break;
        case 'left':
          top = rect.top + scrollY + rect.height / 2;
          left = rect.left + scrollX - offset;
          break;
        case 'right':
          top = rect.top + scrollY + rect.height / 2;
          left = rect.right + scrollX + offset;
          break;
      }
      setCoords({ top, left });
    }
  };

  const handleMouseEnter = () => {
    timerRef.current = setTimeout(() => {
      updatePosition();
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsVisible(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Update position on scroll/resize if visible
  useEffect(() => {
    if (isVisible) {
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isVisible]);

  if (!content) return <>{children}</>;

  return (
    <>
      <div 
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`inline-block ${className}`}
      >
        {children}
      </div>
      
      {isVisible && createPortal(
        <div 
          className="fixed z-[9999] pointer-events-none"
          style={{ 
            top: coords.top, 
            left: coords.left,
          }}
        >
          <div 
            className={`
              bg-slate-900 text-white dark:bg-white dark:text-slate-900 
              text-xs font-medium px-2.5 py-1.5 rounded-md shadow-xl 
              whitespace-nowrap animate-in fade-in zoom-in-95 duration-150
              ${position === 'top' ? '-translate-x-1/2 -translate-y-full' : ''}
              ${position === 'bottom' ? '-translate-x-1/2' : ''}
              ${position === 'left' ? '-translate-x-full -translate-y-1/2' : ''}
              ${position === 'right' ? '-translate-y-1/2' : ''}
            `}
          >
            {content}
            {/* Arrow */}
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
        </div>,
        document.body
      )}
    </>
  );
};