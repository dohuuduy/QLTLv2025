
import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useId } from "react";
import { createPortal } from "react-dom";
import { X, Check, ChevronDown, Search } from "lucide-react";
import { cn } from "../../lib/utils";

// --- Types ---

export interface Option {
  value: string;
  label: string;
  subLabel?: string;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  style?: {
    badgeColor?: string; // Custom badge bg color
    iconColor?: string; // Custom icon color
  };
}

export interface MultiSelectProps {
  options: Option[];
  value: string[];
  onValueChange: (value: string[]) => void;
  defaultValue?: string[];
  placeholder?: string;
  variant?: "default" | "secondary" | "destructive" | "inverted";
  maxCount?: number;
  minWidth?: string;
  modalPopover?: boolean;
  asChild?: boolean;
  className?: string;
  disabled?: boolean;
}

// --- MultiSelect Component ---

export const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  value,
  onValueChange,
  defaultValue = [],
  placeholder = "Select options",
  variant = "default",
  maxCount = 3,
  minWidth = "200px",
  className,
  disabled = false,
}) => {
  const [selectedValues, setSelectedValues] = useState<string[]>(value || defaultValue);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number; width: number; placement: string } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const uniqueId = useId();
  const portalId = `multiselect-portal-${uniqueId.replace(/:/g, '')}`;

  // Sync internal state with props
  useEffect(() => {
    if (value !== undefined) {
      setSelectedValues(value);
    }
  }, [value]);

  // Handle outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsPopoverOpen(false);
        setSearchTerm("");
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, []);

  // Calculate Popover Position
  const updatePosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const dropdownHeight = 300; // Estimated max height

      // Flip logic: if not enough space below, show on top
      const placement = spaceBelow < dropdownHeight && rect.top > dropdownHeight ? 'top' : 'bottom';
      
      setPopoverPosition({
        top: placement === 'bottom' ? rect.bottom + window.scrollY + 4 : rect.top + window.scrollY - 4,
        left: rect.left + window.scrollX,
        width: rect.width,
        placement
      });
    }
  };

  // Use useLayoutEffect to prevent visual "flying" glitch (render 0,0 then jump)
  useLayoutEffect(() => {
    if (isPopoverOpen) {
      updatePosition();
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition, true);
      
      // Auto-focus search input when opened
      requestAnimationFrame(() => searchInputRef.current?.focus());
    } else {
      setPopoverPosition(null); // Reset position
    }
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isPopoverOpen]);

  // Update position if values change while open (height might change)
  useLayoutEffect(() => {
      if (isPopoverOpen) updatePosition();
  }, [selectedValues.length]);

  const handleToggleOption = (optionValue: string) => {
    const newSelectedValues = selectedValues.includes(optionValue)
      ? selectedValues.filter((v) => v !== optionValue)
      : [...selectedValues, optionValue];
    setSelectedValues(newSelectedValues);
    onValueChange(newSelectedValues);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedValues([]);
    onValueChange([]);
  };

  const handleTogglePopover = (e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    if (!isPopoverOpen) {
        setIsPopoverOpen(true);
    } else {
        setIsPopoverOpen(false);
    }
  };

  const handleSelectAll = () => {
      const allValues = filteredOptions.map(o => o.value);
      const allVisibleSelected = allValues.every(v => selectedValues.includes(v));
      
      let newSelection: string[];
      if (allVisibleSelected) {
          // Deselect visible
          newSelection = selectedValues.filter(v => !allValues.includes(v));
      } else {
          // Select visible (union)
          newSelection = Array.from(new Set([...selectedValues, ...allValues]));
      }
      setSelectedValues(newSelection);
      onValueChange(newSelection);
  };

  const filteredOptions = useMemo(() => {
      if(!searchTerm) return options;
      const lower = searchTerm.toLowerCase();
      return options.filter(o => o.label.toLowerCase().includes(lower) || (o.subLabel && o.subLabel.toLowerCase().includes(lower)));
  }, [options, searchTerm]);

  const badgeVariantStyles = {
    default: "bg-primary/10 text-primary hover:bg-primary/20 border-primary/10",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    destructive: "bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/10",
    inverted: "bg-foreground text-background hover:bg-foreground/90",
  };

  return (
    <>
      <div
        ref={containerRef}
        onClick={handleTogglePopover}
        className={cn(
          "relative flex min-h-10 w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-all cursor-pointer select-none",
          isPopoverOpen ? "ring-2 ring-ring ring-offset-2 border-primary" : "hover:border-primary/50",
          disabled && "cursor-not-allowed opacity-50 bg-muted",
          className
        )}
        style={{ minWidth }}
      >
        <div className="flex flex-1 flex-wrap items-center gap-1.5">
          {selectedValues.length > 0 ? (
            <>
              {selectedValues.slice(0, maxCount).map((val) => {
                const option = options.find((o) => o.value === val);
                if (!option) return null;
                const Icon = option.icon;
                
                return (
                  <span
                    key={val}
                    className={cn(
                      "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors animate-in zoom-in duration-200",
                      badgeVariantStyles[variant]
                    )}
                    style={{ 
                        backgroundColor: option.style?.badgeColor ? `${option.style.badgeColor}20` : undefined,
                        color: option.style?.badgeColor,
                        borderColor: option.style?.badgeColor ? `${option.style.badgeColor}30` : undefined
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {Icon && <Icon className="mr-1.5 h-3 w-3" style={{color: option.style?.iconColor}} />}
                    {option.label}
                    <X
                      className="ml-1.5 h-3 w-3 cursor-pointer opacity-70 hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleOption(val);
                      }}
                    />
                  </span>
                );
              })}
              {selectedValues.length > maxCount && (
                <span className={cn(
                    "inline-flex items-center rounded-md border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground",
                    badgeVariantStyles[variant]
                )}>
                  +{selectedValues.length - maxCount} more
                </span>
              )}
            </>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center shrink-0 gap-1 ml-2">
          {selectedValues.length > 0 && !disabled && (
            <div
              onClick={handleClear}
              className="rounded-full p-1 hover:bg-muted text-muted-foreground transition-colors z-10"
            >
              <X className="h-3.5 w-3.5" />
            </div>
          )}
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", isPopoverOpen && "rotate-180")} />
        </div>
      </div>

      {isPopoverOpen && popoverPosition &&
        createPortal(
          <div
            ref={popoverRef}
            id={portalId}
            style={{
              top: popoverPosition.top,
              left: popoverPosition.left,
              width: popoverPosition.width,
              // Using transform to adjust for "top" placement instead of changing top directly avoids layout thrashing
              transform: popoverPosition.placement === 'top' ? 'translateY(-100%)' : 'none',
            }}
            className="fixed z-[9999] min-w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-lg shadow-black/5 animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search & Actions Header */}
            <div className="flex items-center border-b border-border bg-muted/30 px-3 py-2.5">
              <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                ref={searchInputRef}
                className="flex h-5 w-full rounded-md bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                placeholder="Tìm kiếm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="flex items-center gap-1 border-l border-border pl-2 ml-2">
                  <button 
                    onClick={handleSelectAll} 
                    className="text-[10px] uppercase font-bold text-primary hover:bg-primary/10 px-2 py-1 rounded transition-colors whitespace-nowrap"
                  >
                      {filteredOptions.every(o => selectedValues.includes(o.value)) ? 'Bỏ chọn' : 'Chọn hết'}
                  </button>
              </div>
            </div>

            {/* Options List */}
            <div 
                className="max-h-[300px] overflow-y-auto p-1 custom-scrollbar"
                onTouchStart={(e) => e.stopPropagation()} // Prevent closing on touch scroll
            >
              {filteredOptions.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">Không tìm thấy kết quả.</div>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = selectedValues.includes(option.value);
                  const Icon = option.icon;
                  return (
                    <div
                      key={option.value}
                      className={cn(
                        "relative flex cursor-pointer select-none items-center rounded-lg px-2 py-2 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                        isSelected ? "bg-accent text-accent-foreground" : "hover:bg-muted/50 text-foreground"
                      )}
                      onClick={() => !option.disabled && handleToggleOption(option.value)}
                      data-disabled={option.disabled ? true : undefined}
                    >
                      <div
                        className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded border border-primary/50 transition-all",
                          isSelected
                            ? "bg-primary border-primary text-primary-foreground"
                            : "opacity-50 [&_svg]:invisible"
                        )}
                      >
                        <Check className="h-3 w-3" />
                      </div>
                      
                      {Icon && (
                        <Icon className="mr-2 h-4 w-4 text-muted-foreground" style={{color: option.style?.iconColor}} />
                      )}
                      
                      <div className="flex flex-col">
                          <span className={cn("font-medium", isSelected && "text-primary")}>{option.label}</span>
                          {option.subLabel && <span className="text-[10px] text-muted-foreground">{option.subLabel}</span>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            {/* Footer info */}
            <div className="bg-muted/30 p-2 text-[10px] text-center text-muted-foreground border-t border-border">
                Đã chọn {selectedValues.length} mục
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
