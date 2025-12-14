
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Download, Printer, Settings2, CheckSquare, Square, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import { ColumnDefinition, SortDirection } from '../types';
import { Button } from './ui/Button';
import { useDialog } from '../contexts/DialogContext';

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDefinition<T>[];
  title?: string;
  onRowClick?: (item: T) => void;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
}

export const DataTable = <T extends object>({ data, columns, title, onRowClick, filters, actions }: DataTableProps<T>) => {
  const [visibilityState, setVisibilityState] = useState<Record<string, boolean>>(() => {
    const initialVis: Record<string, boolean> = {};
    columns.forEach(col => {
      initialVis[String(col.key as any)] = col.visible;
    });
    return initialVis;
  });

  const [exportColumnState, setExportColumnState] = useState<Record<string, boolean>>({});
  const [sortConfig, setSortConfig] = useState<{ key: keyof T; direction: SortDirection } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right: number } | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dialog = useDialog();

  // ... (Keep existing logic for toggleColumnSelector, useEffects for resize/click outside, sorting, pagination) ...
  // RE-IMPLEMENTING LOGIC TO KEEP FUNCTIONALITY INTACT
  
  const toggleColumnSelector = () => {
    if (!showColumnSelector && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        right: document.documentElement.clientWidth - rect.right,
      });
    }
    setShowColumnSelector(!showColumnSelector);
  };

  useEffect(() => {
    if (!showColumnSelector) return;
    const handleScrollOrResize = () => {
      if (buttonRef.current) {
         const rect = buttonRef.current.getBoundingClientRect();
         setDropdownPosition({
            top: rect.bottom + 4,
            right: document.documentElement.clientWidth - rect.right,
         });
      } else {
        setShowColumnSelector(false);
      }
    };
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [showColumnSelector]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (buttonRef.current && buttonRef.current.contains(event.target as Node)) return;
      if (dropdownRef.current && dropdownRef.current.contains(event.target as Node)) return;
      setShowColumnSelector(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (showExportModal) {
      setExportColumnState({ ...visibilityState });
    }
  }, [showExportModal, visibilityState]);

  const sortedData = useMemo(() => {
    let sortableItems = [...data];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aVal = (a[sortConfig.key] as any) ?? '';
        const bVal = (b[sortConfig.key] as any) ?? '';
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [data, sortConfig]);

  const totalPages = Math.ceil(sortedData.length / pageSize);
  const currentData = sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [data.length, totalPages]);

  const handleSort = (key: keyof T) => {
    let direction: SortDirection = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const toggleColumn = (key: string) => {
    setVisibilityState(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleExportColumn = (key: string) => {
    setExportColumnState(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const visibleColumns = columns.filter(col => visibilityState[String(col.key as any)] !== false);
  const getExportColumns = () => columns.filter(col => exportColumnState[String(col.key as any)] !== false);

  const getDataForExport = () => {
    const exportCols = getExportColumns();
    return sortedData.map((item, index) => {
      const row: any = {};
      row['STT'] = index + 1;
      exportCols.forEach(col => {
        const rawValue = (item as any)[col.key];
        let val: any = rawValue;
        if (typeof val === 'object' && val !== null && !Array.isArray(val)) val = JSON.stringify(val);
        if (Array.isArray(val)) val = val.join(', ');
        row[col.header] = val;
      });
      return row;
    });
  };

  const exportExcel = () => {
    const dataToExport = getDataForExport();
    if (dataToExport.length === 0) {
        dialog.alert("Không có dữ liệu để xuất hoặc chưa chọn cột nào!", { type: 'warning' });
        return;
    }
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, `${title || 'export'}_${new Date().toISOString().slice(0,10)}.xlsx`);
    setShowExportModal(false);
  };

  const handlePrint = () => {
    const exportCols = getExportColumns();
    if (exportCols.length === 0) {
        dialog.alert("Vui lòng chọn ít nhất một cột để in!", { type: 'warning' });
        return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    // ... (Keep existing print HTML generation) ...
    const htmlContent = `
      <!DOCTYPE html><html><head><title>In: ${title}</title>
      <style>body { font-family: sans-serif; padding: 20px; } table { width: 100%; border-collapse: collapse; } th, td { border: 1px solid #ccc; padding: 8px; text-align: left; } th { background: #f0f0f0; }</style>
      </head><body><h1>${title || 'Dữ liệu'}</h1>
      <table><thead><tr><th>STT</th>${exportCols.map(col => `<th>${col.header}</th>`).join('')}</tr></thead><tbody>
      ${sortedData.map((item, index) => `<tr><td>${index + 1}</td>${exportCols.map(col => `<td>${String((item as any)[col.key] ?? '')}</td>`).join('')}</tr>`).join('')}
      </tbody></table></body></html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.focus(); printWindow.print(); };
    setShowExportModal(false);
  };

  const getStickyClass = (index: number, total: number, isHeader: boolean) => {
    if (index === total - 1) {
      return `sticky right-0 ${
        isHeader 
          ? 'z-30 bg-secondary text-secondary-foreground' 
          : 'z-10 bg-background group-hover:bg-muted/50' 
      } shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.05)] border-l`;
    }
    return "";
  };

  // --- REDESIGN RENDERING ---

  return (
    <div className="bg-card text-card-foreground rounded-lg shadow-sm border border-border flex flex-col h-full overflow-hidden max-w-full">
      {/* Toolbar */}
      <div className="p-3 border-b border-border bg-muted/20 shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Filters Area */}
          <div className="flex-1 w-full lg:w-auto min-w-0">
            {filters && <div className="flex flex-wrap gap-2 w-full">{filters}</div>}
          </div>

          {/* Actions & Tools */}
          <div className="flex items-center gap-2 w-full lg:w-auto justify-between lg:justify-end shrink-0">
             <div className="flex-1 lg:flex-none">{actions}</div>
             <div className="h-5 w-px bg-border mx-1 hidden sm:block"></div>
             <div className="flex gap-2 shrink-0">
                {/* Column Selector Button */}
                <div className="relative">
                  <Button 
                    ref={buttonRef} 
                    variant="outline" 
                    size="icon" 
                    onClick={toggleColumnSelector} 
                    className={showColumnSelector ? "bg-accent text-accent-foreground" : ""}
                    title="Cấu hình cột"
                  >
                    <Settings2 size={16} /> 
                  </Button>
                  
                  {/* Portal Dropdown */}
                  {showColumnSelector && dropdownPosition && createPortal(
                    <div 
                      ref={dropdownRef}
                      className="fixed z-[80] mt-1 w-60 bg-popover text-popover-foreground border border-border rounded-md shadow-lg p-1 animate-in fade-in zoom-in-95 duration-100 flex flex-col"
                      style={{ top: dropdownPosition.top, right: dropdownPosition.right }}
                    >
                      <div className="text-xs font-semibold px-2 py-2 text-muted-foreground uppercase tracking-wider bg-muted/50 border-b border-border mb-1 rounded-t-sm">
                        Hiển thị cột
                      </div>
                      <div className="overflow-y-auto max-h-[60vh] p-1 space-y-0.5">
                        {columns.map(col => (
                          <label key={String(col.key as any)} className="flex items-center gap-2 p-2 hover:bg-accent hover:text-accent-foreground rounded-sm cursor-pointer text-sm transition-colors">
                            <input 
                              type="checkbox" 
                              checked={visibilityState[String(col.key as any)] !== false}
                              onChange={() => toggleColumn(String(col.key as any))}
                              className="h-4 w-4 rounded border-input bg-background text-primary focus:ring-primary focus:ring-offset-background"
                            />
                            <span className="truncate">{col.header}</span>
                          </label>
                        ))}
                      </div>
                    </div>,
                    document.body
                  )}
                </div>

                <Button variant="outline" size="icon" onClick={() => setShowExportModal(true)} title="Xuất dữ liệu">
                  <Download size={16} /> 
                </Button>
             </div>
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-auto flex-1 w-full relative">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="text-xs font-medium text-muted-foreground uppercase bg-secondary/50 sticky top-0 z-20 backdrop-blur-sm">
            <tr>
              <th scope="col" className="sticky left-0 z-30 bg-secondary/90 backdrop-blur border-b border-border px-4 py-3 text-center w-14 font-semibold">STT</th>
              {visibleColumns.map((col, index) => (
                <th 
                  key={String(col.key as any)} 
                  scope="col" 
                  className={`px-4 py-3 cursor-pointer hover:bg-secondary/80 transition-colors border-b border-border font-semibold whitespace-nowrap ${getStickyClass(index, visibleColumns.length, true)}`}
                  onClick={() => handleSort(col.key)}
                >
                  <div className="flex items-center gap-1.5">
                    {col.header}
                    {sortConfig?.key === col.key && (
                      <span className="text-primary">{sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {currentData.length > 0 ? (
              currentData.map((item, index) => (
                <tr 
                  key={String((item as any).id) || index} 
                  onClick={() => onRowClick && onRowClick(item)}
                  className="group bg-background hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <td className="sticky left-0 z-10 bg-background group-hover:bg-muted/50 border-r border-transparent px-4 py-3 text-center text-muted-foreground font-mono text-xs">
                    {(currentPage - 1) * pageSize + index + 1}
                  </td>
                  {visibleColumns.map((col, colIndex) => (
                    <td 
                      key={String(col.key as any)} 
                      className={`px-4 py-3 text-sm truncate max-w-[300px] ${getStickyClass(colIndex, visibleColumns.length, false)}`}
                    >
                      {col.render ? col.render((item as any)[col.key], item) : String((item as any)[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={visibleColumns.length + 1} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Search size={48} className="mb-4 opacity-20" />
                    <p className="text-lg font-medium">Không tìm thấy dữ liệu</p>
                    <p className="text-sm opacity-70">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer / Pagination */}
      <div className="p-3 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4 bg-muted/10 shrink-0">
        <div className="text-sm text-muted-foreground order-2 sm:order-1">
          {sortedData.length > 0 
            ? <span>Hiển thị <span className="font-medium text-foreground">{(currentPage - 1) * pageSize + 1}</span> - <span className="font-medium text-foreground">{Math.min(currentPage * pageSize, sortedData.length)}</span> trong tổng số <span className="font-medium text-foreground">{sortedData.length}</span></span>
            : '0 kết quả'
          }
        </div>
        <div className="flex items-center gap-3 order-1 sm:order-2">
          <select 
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value={10}>10 / trang</option>
            <option value={20}>20 / trang</option>
            <option value={50}>50 / trang</option>
            <option value={100}>100 / trang</option>
          </select>

          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
              <ChevronLeft size={14} />
            </Button>
            <div className="flex items-center justify-center min-w-[2rem] text-sm font-medium">
              {currentPage} / {totalPages || 1}
            </div>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages || totalPages === 0}>
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      </div>

      {/* Export Modal (Simplified visual) */}
      {showExportModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-card border border-border rounded-lg shadow-lg max-w-md w-full flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-lg">Tùy chọn xuất dữ liệu</h3>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium">Chọn cột hiển thị</span>
                    <Button variant="link" size="sm" className="h-auto p-0" onClick={() => {
                        const allKeys: Record<string, boolean> = {};
                        columns.forEach(c => allKeys[String(c.key as any)] = true);
                        setExportColumnState(allKeys);
                    }}>Chọn tất cả</Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    {columns.map(col => (
                        <label key={String(col.key as any)} className="flex items-center space-x-2 text-sm cursor-pointer p-2 rounded hover:bg-muted">
                            <input type="checkbox" checked={exportColumnState[String(col.key as any)] !== false} onChange={() => toggleExportColumn(String(col.key as any))} className="rounded border-input text-primary focus:ring-primary"/>
                            <span className="truncate">{col.header}</span>
                        </label>
                    ))}
                </div>
            </div>
            <div className="p-4 border-t border-border flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowExportModal(false)}>Hủy</Button>
                <Button variant="outline" onClick={handlePrint} leftIcon={<Printer size={16}/>}>In ấn</Button>
                <Button onClick={exportExcel} leftIcon={<Download size={16}/>}>Xuất Excel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
