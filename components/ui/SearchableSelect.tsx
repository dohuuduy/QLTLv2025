
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Check, User } from 'lucide-react';

interface Option {
  value: string | number;
  label: string;
  subLabel?: string; // Ví dụ: Email hoặc chức vụ
}

interface SearchableSelectProps {
  options: Option[];
  value: string | number | undefined;
  onChange: (value: string | number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
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

  // Tính toán vị trí khi mở dropdown
  const calculatePosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const dropdownHeight = 300; // Chiều cao ước tính tối đa của dropdown

      // Nếu bên dưới không đủ chỗ (nhỏ hơn 300px) thì mở lên trên
      const placement = spaceBelow < dropdownHeight ? 'top' : 'bottom';
      
      setPosition({
        top: placement === 'bottom' ? rect.bottom + window.scrollY + 4 : rect.top + window.scrollY - 4,
        left: rect.left + window.scrollX,
        width: rect.width,
        placement
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      calculatePosition();
      // Auto focus search input
      setTimeout(() => searchInputRef.current?.focus(), 50);
      
      // Close on scroll/resize
      const handleScroll = () => setIsOpen(false);
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleScroll);
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleScroll);
      };
    }
  }, [isOpen]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      // Check click inside Trigger Button
      if (containerRef.current && containerRef.current.contains(target)) return;
      
      // Check click inside Portal Dropdown
      const dropdownEl = document.getElementById(`dropdown-portal-${containerRef.current?.id || 'select'}`);
      if (dropdownEl && dropdownEl.contains(target)) return;

      setIsOpen(false);
    };
    
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Filter options
  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    const lowerTerm = searchTerm.toLowerCase();
    return options.filter(opt => 
      opt.label.toLowerCase().includes(lowerTerm) || 
      (opt.subLabel && opt.subLabel.toLowerCase().includes(lowerTerm))
    );
  }, [options, searchTerm]);

  const selectedOption = options.find(opt => opt.value === value);

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
        onClick={() => {
            if (!disabled) {
                setIsOpen(!isOpen);
            }
        }}
        className={`
          w-full h-10 px-3 rounded-lg border flex items-center justify-between cursor-pointer transition-all bg-white dark:bg-slate-900
          ${isOpen ? 'border-blue-500 ring-1 ring-blue-500/20' : 'border-gray-200 dark:border-slate-700'}
          ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-slate-800' : 'hover:border-blue-400 dark:hover:border-slate-600'}
          ${className}
        `}
      >
        <div className="flex items-center gap-2 overflow-hidden">
            {selectedOption && selectedOption.subLabel && (
                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                    {selectedOption.label.charAt(0)}
                </div>
            )}
            <span className={`truncate text-sm ${selectedOption ? 'text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-400'}`}>
                {selectedOption ? selectedOption.label : placeholder}
            </span>
        </div>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180 text-blue-500' : ''}`} />
      </div>

      {/* Portal Dropdown Menu */}
      {isOpen && createPortal(
        <div
          style={{ 
              top: position.top, 
              left: position.left, 
              width: position.width,
              transform: position.placement === 'top' ? 'translateY(-100%)' : 'none'
          }}
          className="fixed z-[9999] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Search Header */}
          <div className="p-2 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
              <input
                ref={searchInputRef}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-1 focus:ring-blue-500 outline-none text-gray-700 dark:text-gray-200 placeholder:text-gray-400"
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
                  onClick={() => handleSelect(option.value)}
                  className={`
                    px-3 py-2.5 rounded-lg cursor-pointer flex items-center justify-between group transition-colors mb-0.5
                    ${option.value === value 
                      ? 'bg-blue-50 dark:bg-blue-900/20' 
                      : 'hover:bg-gray-100 dark:hover:bg-slate-800'}
                  `}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                     {/* Smart Avatar Generation */}
                     <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${option.value === value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-300'}`}>
                        {option.subLabel ? option.label.charAt(0) : <User size={14}/>}
                     </div>
                     <div className="flex flex-col min-w-0">
                        <span className={`text-sm truncate ${option.value === value ? 'font-bold text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
                            {option.label}
                        </span>
                        {option.subLabel && (
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate">{option.subLabel}</span>
                        )}
                     </div>
                  </div>
                  {option.value === value && <Check size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />}
                </div>
              ))
            ) : (
              <div className="px-3 py-8 text-center text-xs text-gray-400 flex flex-col items-center">
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
};
