
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Download, Printer, Settings2, CheckSquare, Square } from 'lucide-react';
import * as XLSX from 'xlsx';
import { ColumnDefinition, SortDirection } from '../types';
import { Button } from './ui/Button';

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDefinition<T>[];
  title: string;
  onRowClick?: (item: T) => void;
  // New props for layout optimization
  filters?: React.ReactNode;
  actions?: React.ReactNode;
}

export const DataTable = <T extends object>({ data, columns, title, onRowClick, filters, actions }: DataTableProps<T>) => {
  // State quản lý visibility cho bảng hiển thị chính
  const [visibilityState, setVisibilityState] = useState<Record<string, boolean>>(() => {
    const initialVis: Record<string, boolean> = {};
    columns.forEach(col => {
      initialVis[String(col.key as any)] = col.visible;
    });
    return initialVis;
  });

  // State quản lý cột sẽ được xuất (Excel/Print) - tách biệt với bảng hiển thị
  const [exportColumnState, setExportColumnState] = useState<Record<string, boolean>>({});

  const [sortConfig, setSortConfig] = useState<{ key: keyof T; direction: SortDirection } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Dropdown States
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right: number } | null>(null);

  const [showExportModal, setShowExportModal] = useState(false);
  
  // Refs
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Toggle Dropdown logic with Position Calculation
  const toggleColumnSelector = () => {
    if (!showColumnSelector && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4, // Cách button 4px
        right: document.documentElement.clientWidth - rect.right, // Canh lề phải theo viewport
      });
    }
    setShowColumnSelector(!showColumnSelector);
  };

  // Recalculate position on scroll/resize to keep dropdown attached
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

  // Click Outside Logic (Updated for Portal)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // Check if click is inside the button
      if (buttonRef.current && buttonRef.current.contains(event.target as Node)) {
        return;
      }
      // Check if click is inside the portal dropdown
      if (dropdownRef.current && dropdownRef.current.contains(event.target as Node)) {
        return;
      }
      
      setShowColumnSelector(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Sync export columns with visible columns when modal opens
  useEffect(() => {
    if (showExportModal) {
      setExportColumnState({ ...visibilityState });
    }
  }, [showExportModal, visibilityState]);

  // Sorting Logic
  const sortedData = useMemo(() => {
    let sortableItems = [...data];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        // Handle undefined/null safely
        const aVal = (a[sortConfig.key] as any) ?? '';
        const bVal = (b[sortConfig.key] as any) ?? '';

        if (aVal < bVal) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aVal > bVal) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [data, sortConfig]);

  // Pagination Logic
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const currentData = sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Reset page if data changes significantly
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [data.length, totalPages]);

  // Handlers
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
    setVisibilityState(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleExportColumn = (key: string) => {
    setExportColumnState(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Helper để lấy danh sách cột đang hiển thị trên bảng
  const visibleColumns = columns.filter(col => visibilityState[String(col.key as any)] !== false);

  // Helper lấy danh sách cột được chọn để xuất
  const getExportColumns = () => {
    return columns.filter(col => exportColumnState[String(col.key as any)] !== false);
  };

  // Export Logic
  const getDataForExport = () => {
    const exportCols = getExportColumns();
    return sortedData.map((item, index) => {
      const row: any = {};
      // Thêm cột STT vào Excel (Số thứ tự tuyệt đối)
      row['STT'] = index + 1;

      exportCols.forEach(col => {
        // Lấy giá trị raw thay vì render component
        // Use casting to any to avoid TS error: Type 'string' is not assignable to type 'T[keyof T]'
        const rawValue = (item as any)[col.key];
        let val: any = rawValue;
        
        // Xử lý một số trường hợp đặc biệt nếu cần (ví dụ object)
        if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
           val = JSON.stringify(val);
        }
        if (Array.isArray(val)) {
           val = val.join(', ');
        }
        row[col.header] = val;
      });
      return row;
    });
  };

  const exportExcel = () => {
    const dataToExport = getDataForExport();
    if (dataToExport.length === 0) {
        alert("Không có dữ liệu để xuất hoặc chưa chọn cột nào!");
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
        alert("Vui lòng chọn ít nhất một cột để in!");
        return;
    }

    // Tạo cửa sổ in mới
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Tạo nội dung HTML cho trang in
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>In: ${title}</title>
        <style>
          body { font-family: 'Times New Roman', Times, serif; padding: 20px; color: #000; }
          h1 { text-align: center; font-size: 18pt; margin-bottom: 5px; text-transform: uppercase; }
          .meta { text-align: center; font-size: 11pt; margin-bottom: 20px; font-style: italic; color: #555; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10pt; }
          th, td { border: 1px solid #333; padding: 8px 5px; text-align: left; vertical-align: top; }
          th { background-color: #f0f0f0; font-weight: bold; text-align: center; }
          .center { text-align: center; }
          .page-number { text-align: right; font-size: 9pt; margin-top: 10px; }
          @media print {
            @page { margin: 1cm; size: landscape; }
            th { background-color: #eee !important; -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="meta">Ngày xuất: ${new Date().toLocaleDateString('vi-VN')} | Tổng số dòng: ${sortedData.length}</div>
        
        <table>
          <thead>
            <tr>
              <th style="width: 40px">STT</th>
              ${exportCols.map(col => `<th>${col.header}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${sortedData.map((item, index) => `
              <tr>
                <td class="center">${index + 1}</td>
                ${exportCols.map(col => {
                  let val = (item as any)[col.key];
                   if (Array.isArray(val)) val = val.join(', ');
                   if (val === undefined || val === null) val = '';
                   return `<td>${String(val)}</td>`;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="page-number">In từ hệ thống ISO DocManager</div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Đợi load xong rồi in
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
    
    setShowExportModal(false);
  };

  // --- Sticky Column Styles helper ---
  // Updated: We only handle Right Sticky (Action column) here. 
  // Left Sticky is now exclusively for the new STT column to avoid complexity.
  const getStickyClass = (index: number, total: number, isHeader: boolean) => {
    // Cố định cột cuối cùng (Thường là action)
    if (index === total - 1) {
      return `sticky right-0 z-20 ${
        isHeader 
          ? 'bg-gray-50 dark:bg-slate-800' 
          : 'bg-white dark:bg-slate-900 group-hover:bg-gray-50 dark:group-hover:bg-slate-800'
      } shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.05)] dark:shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.5)]`;
    }
    return "";
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow border border-gray-200 dark:border-slate-800 flex flex-col h-full transition-colors">
      {/* Optimized Toolbar */}
      <div className="p-3 border-b border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/30 rounded-t-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Left Group: Title & Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full lg:w-auto">
            {title && <h3 className="font-bold text-gray-800 dark:text-gray-100 whitespace-nowrap">{title}</h3>}
            {filters && (
               <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                 {filters}
               </div>
            )}
          </div>

          {/* Right Group: Actions & Tools */}
          <div className="flex items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
             {actions && (
               <div className="flex-1 lg:flex-none">
                 {actions}
               </div>
             )}
             
             <div className="h-6 w-px bg-gray-300 dark:bg-slate-700 mx-1 hidden sm:block"></div>
             
             <div className="flex gap-2 shrink-0">
               {/* Column Visibility with Portal */}
                <div className="relative">
                  <button 
                    ref={buttonRef}
                    onClick={toggleColumnSelector}
                    className={`flex items-center justify-center gap-1 px-3 py-2 border rounded text-sm transition-colors h-9
                      ${showColumnSelector 
                        ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300' 
                        : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700'
                      }`}
                    title="Ẩn/Hiện cột trên bảng"
                  >
                    <Settings2 size={16} /> <span className="hidden xl:inline">Cấu hình</span>
                  </button>
                  
                  {/* React Portal for Dropdown - Solves Z-Index & Overflow */}
                  {showColumnSelector && dropdownPosition && createPortal(
                    <div 
                      ref={dropdownRef}
                      className="fixed z-[1000] mt-2 w-56 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded shadow-xl p-2 animate-in fade-in zoom-in-95 duration-100 max-h-[60vh] overflow-y-auto"
                      style={{
                        top: dropdownPosition.top,
                        right: dropdownPosition.right
                      }}
                    >
                      <div className="text-xs font-bold text-gray-500 mb-2 px-1 uppercase sticky top-0 bg-white dark:bg-slate-800 pb-2 border-b border-gray-100 dark:border-slate-700">
                        Hiển thị cột
                      </div>
                      <div className="space-y-1">
                        {columns.map(col => (
                          <label key={String(col.key as any)} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer text-sm text-gray-700 dark:text-gray-200 rounded">
                            <input 
                              type="checkbox" 
                              checked={visibilityState[String(col.key as any)] !== false}
                              onChange={() => toggleColumn(String(col.key as any))}
                              className="rounded border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-primary focus:ring-primary"
                            />
                            {col.header}
                          </label>
                        ))}
                      </div>
                    </div>,
                    document.body
                  )}
                </div>

                {/* Export Button */}
                <button 
                  onClick={() => setShowExportModal(true)}
                  className="flex items-center justify-center gap-1 px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 rounded text-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors h-9"
                  title="Xuất dữ liệu & In"
                >
                  <Download size={16} /> <span className="hidden xl:inline">Xuất / In</span>
                </button>
             </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto flex-1 w-full relative">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400 border-separate border-spacing-0">
          <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-slate-800 sticky top-0 z-30">
            <tr>
              {/* STT COLUMN - Sticky Left */}
              <th 
                scope="col" 
                className="sticky left-0 z-20 bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 py-3 text-center w-12 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.05)] dark:shadow-[4px_0_8px_-2px_rgba(0,0,0,0.5)]"
              >
                STT
              </th>
              
              {/* Data Columns */}
              {visibleColumns.map((col, index) => (
                <th 
                  key={String(col.key as any)} 
                  scope="col" 
                  className={`px-6 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 whitespace-nowrap transition-colors border-b border-gray-200 dark:border-slate-700 ${getStickyClass(index, visibleColumns.length, true)}`}
                  onClick={() => handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {sortConfig?.key === col.key && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentData.length > 0 ? (
              currentData.map((item, index) => (
                <tr 
                  key={String((item as any).id) || index} 
                  onClick={() => onRowClick && onRowClick(item)}
                  className="group bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  {/* STT CELL */}
                  <td className="sticky left-0 z-20 bg-white dark:bg-slate-900 group-hover:bg-gray-50 dark:group-hover:bg-slate-800 border-b border-gray-100 dark:border-slate-800 px-4 py-4 text-center font-mono text-xs text-gray-500 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.05)] dark:shadow-[4px_0_8px_-2px_rgba(0,0,0,0.5)]">
                    {(currentPage - 1) * pageSize + index + 1}
                  </td>

                  {/* Data Cells */}
                  {visibleColumns.map((col, colIndex) => (
                    <td 
                      key={String(col.key as any)} 
                      className={`px-6 py-4 truncate max-w-xs text-gray-800 dark:text-gray-300 border-b border-gray-100 dark:border-slate-800 ${getStickyClass(colIndex, visibleColumns.length, false)}`}
                    >
                      {col.render ? col.render((item as any)[col.key], item) : String((item as any)[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={visibleColumns.length + 1} className="px-6 py-12 text-center text-gray-400 dark:text-gray-500">
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-4xl mb-2">📭</span>
                    <p>Không tìm thấy dữ liệu phù hợp</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="p-3 border-t border-gray-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3 bg-gray-50 dark:bg-slate-800/50 rounded-b-lg text-sm">
        <div className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm order-2 sm:order-1">
          {sortedData.length > 0 
            ? `Hiển thị ${(currentPage - 1) * pageSize + 1} - ${Math.min(currentPage * pageSize, sortedData.length)} / ${sortedData.length}`
            : '0 kết quả'
          }
        </div>
        <div className="flex items-center gap-2 order-1 sm:order-2">
          <select 
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
            className="border border-gray-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 outline-none focus:ring-1 focus:ring-primary text-xs sm:text-sm"
          >
            <option value={10}>10 / trang</option>
            <option value={20}>20 / trang</option>
            <option value={50}>50 / trang</option>
            <option value={100}>100 / trang</option>
          </select>

          <div className="flex items-center bg-white dark:bg-slate-700 rounded border dark:border-slate-600">
            <button 
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1.5 hover:bg-gray-50 dark:hover:bg-slate-600 text-gray-600 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed border-r dark:border-slate-600"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-3 font-medium text-gray-700 dark:text-gray-300 min-w-[3rem] text-center">
              {currentPage}
            </span>
            <button 
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-1.5 hover:bg-gray-50 dark:hover:bg-slate-600 text-gray-600 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed border-l dark:border-slate-600"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Export / Print Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg w-full max-w-md shadow-xl border dark:border-slate-700 flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-100 dark:border-slate-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Xuất dữ liệu & In ấn</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Chọn các cột bạn muốn hiển thị trong file xuất hoặc bản in.</p>
            </div>
            
            {/* Column Selection Area */}
            <div className="p-4 overflow-y-auto flex-1">
              <div className="flex items-center justify-between mb-2">
                 <span className="text-xs font-bold uppercase text-gray-500">Danh sách cột</span>
                 <button 
                   onClick={() => {
                     const allKeys: Record<string, boolean> = {};
                     columns.forEach(c => allKeys[String(c.key as any)] = true);
                     setExportColumnState(allKeys);
                   }}
                   className="text-xs text-blue-600 hover:underline"
                 >
                   Chọn tất cả
                 </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {columns.map(col => (
                  <label 
                    key={String(col.key as any)} 
                    className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-all ${
                      exportColumnState[String(col.key as any)] !== false 
                        ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' 
                        : 'bg-gray-50 border-gray-200 dark:bg-slate-800 dark:border-slate-700'
                    }`}
                  >
                    <div className={`w-4 h-4 flex items-center justify-center rounded border ${
                       exportColumnState[String(col.key as any)] !== false 
                       ? 'bg-blue-600 border-blue-600 text-white' 
                       : 'bg-white border-gray-400'
                    }`}>
                       {exportColumnState[String(col.key as any)] !== false && <CheckSquare size={12} />}
                    </div>
                    <input 
                      type="checkbox" 
                      className="hidden"
                      checked={exportColumnState[String(col.key as any)] !== false}
                      onChange={() => toggleExportColumn(String(col.key as any))}
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-200 truncate select-none">{col.header}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 rounded-b-lg flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  onClick={handlePrint}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white w-full"
                  leftIcon={<Printer size={16} />}
                >
                  In bảng
                </Button>
                <Button 
                  onClick={exportExcel}
                  className="bg-green-600 hover:bg-green-700 text-white w-full"
                  leftIcon={<Download size={16} />}
                >
                  Xuất Excel
                </Button>
              </div>
              <Button 
                variant="ghost"
                onClick={() => setShowExportModal(false)}
                className="w-full"
              >
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
