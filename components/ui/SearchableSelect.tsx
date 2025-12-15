
import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useId } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Check, User } from 'lucide-react';

interface Option {
  value: string | number;
  label: string;
  subLabel?: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string | number | undefined;
  onChange: (value: string | number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = React.memo(({
  options,
  value,
  onChange,
  placeholder = "Chọn...",
  className = "",
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, placement: 'bottom' });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Generate stable unique ID
  const uniqueId = useId();
  const portalId = `dropdown-portal-${uniqueId.replace(/:/g, '')}`;

  // Use useLayoutEffect to calculate position BEFORE paint -> No flickering/lag
  useLayoutEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const dropdownHeight = 300; 

      const placement = spaceBelow < dropdownHeight ? 'top' : 'bottom';
      
      setPosition({
        top: placement === 'bottom' ? rect.bottom + window.scrollY + 4 : rect.top + window.scrollY - 4,
        left: rect.left + window.scrollX,
        width: rect.width,
        placement
      });
    }
  }, [isOpen]);

  // Handle Focus and Events separately
  useEffect(() => {
    if (isOpen) {
      // Use requestAnimationFrame for smoother focus than setTimeout
      requestAnimationFrame(() => {
        if (searchInputRef.current) searchInputRef.current.focus();
      });
      
      const handleScroll = () => setIsOpen(false);
      // Capture phase to handle scroll events from any parent
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleScroll);
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleScroll);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!isOpen) return;
      
      const target = event.target as Node;
      
      // 1. Click inside trigger -> Ignore (handled by trigger onClick)
      if (containerRef.current && containerRef.current.contains(target)) return;
      
      // 2. Click inside portal dropdown -> Ignore
      const dropdownEl = document.getElementById(portalId);
      if (dropdownEl && dropdownEl.contains(target)) return;

      // 3. Click outside -> Close
      setIsOpen(false);
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, portalId]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    const lowerTerm = searchTerm.toLowerCase();
    return options.filter(opt => 
      opt.label.toLowerCase().includes(lowerTerm) || 
      (opt.subLabel && opt.subLabel.toLowerCase().includes(lowerTerm))
    );
  }, [options, searchTerm]);

  const selectedOption = useMemo(() => 
    options.find(opt => opt.value === value), 
  [options, value]);

  const handleSelect = (val: string | number) => {
    onChange(val);
    setIsOpen(false);
    setSearchTerm("");
  };

  return (
    <>
      {/* Trigger Button */}
      <div
        ref={containerRef}
        onClick={(e) => {
            if (!disabled) {
                e.stopPropagation();
                setIsOpen(!isOpen);
            }
        }}
        className={`
          w-full h-10 px-3 rounded-lg border flex items-center justify-between cursor-pointer transition-all bg-background
          ${isOpen ? 'border-primary ring-1 ring-primary/20' : 'border-input'}
          ${disabled ? 'opacity-50 cursor-not-allowed bg-muted' : 'hover:border-primary'}
          ${className}
        `}
      >
        <div className="flex items-center gap-2 overflow-hidden">
            {selectedOption && selectedOption.subLabel && (
                <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                    {selectedOption.label.charAt(0)}
                </div>
            )}
            <span className={`truncate text-sm ${selectedOption ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                {selectedOption ? selectedOption.label : placeholder}
            </span>
        </div>
        <ChevronDown size={16} className={`text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180 text-primary' : ''}`} />
      </div>

      {/* Portal Dropdown Menu */}
      {isOpen && createPortal(
        <div
          id={portalId}
          style={{ 
              top: position.top, 
              left: position.left, 
              width: position.width,
              transform: position.placement === 'top' ? 'translateY(-100%)' : 'none',
              // Optimize compositing
              willChange: 'transform, opacity'
          }}
          className="fixed z-[9999] bg-popover text-popover-foreground border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          onMouseDown={(e) => e.stopPropagation()} 
        >
          {/* Search Header */}
          <div className="p-2 border-b border-border bg-muted/30">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
              <input
                ref={searchInputRef}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-input bg-background focus:ring-1 focus:ring-primary outline-none text-foreground placeholder:text-muted-foreground"
                placeholder="Tìm kiếm..."
              />
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-[250px] overflow-y-auto p-1 custom-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <div
                  key={option.value}
                  onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(option.value);
                  }}
                  className={`
                    px-3 py-2.5 rounded-lg cursor-pointer flex items-center justify-between group transition-colors mb-0.5
                    ${option.value === value 
                      ? 'bg-primary/10' 
                      : 'hover:bg-accent hover:text-accent-foreground'}
                  `}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                     <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${option.value === value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                        {option.subLabel ? option.label.charAt(0) : <User size={14}/>}
                     </div>
                     <div className="flex flex-col min-w-0">
                        <span className={`text-sm truncate ${option.value === value ? 'font-bold text-primary' : 'text-foreground'}`}>
                            {option.label}
                        </span>
                        {option.subLabel && (
                            <span className="text-[10px] text-muted-foreground truncate">{option.subLabel}</span>
                        )}
                     </div>
                  </div>
                  {option.value === value && <Check size={16} className="text-primary shrink-0" />}
                </div>
              ))
            ) : (
              <div className="px-3 py-8 text-center text-xs text-muted-foreground flex flex-col items-center">
                <Search size={24} className="mb-2 opacity-20"/>
                Không tìm thấy kết quả
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
});
