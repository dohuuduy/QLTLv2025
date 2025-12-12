
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, Check, X } from 'lucide-react';

interface Option {
  value: string | number;
  label: string;
  subLabel?: string; // Ví dụ: Email hoặc chức vụ đi kèm tên
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
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
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
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          w-full h-10 px-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all
          bg-white dark:bg-slate-900 text-sm
          ${isOpen ? 'border-primary ring-2 ring-primary/20' : 'border-gray-200 dark:border-slate-700'}
          ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-slate-800' : 'hover:border-gray-300 dark:hover:border-slate-600'}
        `}
      >
        <span className={`truncate ${selectedOption ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={16} className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
          {/* Search Input */}
          <div className="p-2 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
              <input
                ref={searchInputRef}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-1 focus:ring-primary outline-none text-gray-700 dark:text-gray-200"
                placeholder="Tìm kiếm..."
              />
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <div
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className={`
                    px-3 py-2 rounded-lg cursor-pointer text-sm flex items-center justify-between group transition-colors
                    ${option.value === value 
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium' 
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'}
                  `}
                >
                  <div className="flex flex-col">
                    <span>{option.label}</span>
                    {option.subLabel && (
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 font-normal">{option.subLabel}</span>
                    )}
                  </div>
                  {option.value === value && <Check size={14} className="shrink-0" />}
                </div>
              ))
            ) : (
              <div className="px-3 py-4 text-center text-xs text-gray-400">
                Không tìm thấy kết quả
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
