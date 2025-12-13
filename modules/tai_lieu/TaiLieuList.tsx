
import React, { useState, useMemo, useEffect } from 'react';
import { TaiLieu, TrangThaiTaiLieu, MasterDataState, NhanSu, HoSo, ColumnDefinition, DinhKem } from '../../types';
import { DataTable } from '../../components/DataTable';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { TaiLieuForm } from './TaiLieuForm';
import { DocumentTimeline } from '../../components/DocumentTimeline';
import { AIChatWidget } from '../../components/AIChatWidget';
import { Plus, Filter, FileText, Download, Eye, Pencil, Send, FileUp, Zap, Check, GitMerge, AlertTriangle, ChevronRight, X, Clock, File, Trash2, CornerDownRight, Layers, List, Search, FileType, FileSpreadsheet, Lock, History, Hash, Calendar, Shield, UserCheck, Briefcase, Tag, RefreshCw, Paperclip, ExternalLink, Archive, Info } from 'lucide-react';
import { upsertDocument, deleteDocument } from '../../services/supabaseService';
import { format } from 'date-fns';
import { useDialog } from '../../contexts/DialogContext';

interface TaiLieuListProps {
  masterData: MasterDataState;
  currentUser: NhanSu;
  initialFilters?: { trang_thai?: string; bo_phan?: string };
  data: TaiLieu[];
  onUpdate: (data: TaiLieu[]) => void;
  records: HoSo[];
}

export const TaiLieuList: React.FC<TaiLieuListProps> = ({ 
  masterData, currentUser, initialFilters, data, onUpdate, records 
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'form' | 'detail'>('list');
  const [isTreeView, setIsTreeView] = useState(true); 
  const [selectedDoc, setSelectedDoc] = useState<TaiLieu | null>(null);
  
  const [filters, setFilters] = useState<{ trang_thai?: string; bo_phan?: string; loai_tai_lieu?: string }>(initialFilters || {});
  
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false); // NEW STATE FOR HISTORY
  const [versionType, setVersionType] = useState<'minor' | 'major'>('minor');
  const [versionReason, setVersionReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const dialog = useDialog();
  const isAdmin = currentUser.roles.includes('QUAN_TRI');

  useEffect(() => {
    if (initialFilters) setFilters(prev => ({ ...prev, ...initialFilters }));
  }, [initialFilters]);

  // --- HIERARCHY LOGIC ---
  const getLevel = (doc: TaiLieu, allDocs: TaiLieu[]): number => {
      let level = 0;
      let currentDoc = doc;
      while (currentDoc.tai_lieu_cha_id && level < 5) {
          const parent = allDocs.find(d => d.id === currentDoc.tai_lieu_cha_id);
          if (parent) {
              level++;
              currentDoc = parent;
          } else {
              break;
          }
      }
      return level;
  };

  const sortDataHierarchy = (docs: TaiLieu[]) => {
      const docMap = new Map<string, TaiLieu[]>();
      const roots: TaiLieu[] = [];

      docs.forEach(doc => {
          if (doc.tai_lieu_cha_id && docs.find(d => d.id === doc.tai_lieu_cha_id)) {
              const siblings = docMap.get(doc.tai_lieu_cha_id) || [];
              siblings.push(doc);
              docMap.set(doc.tai_lieu_cha_id, siblings);
          } else {
              roots.push(doc);
          }
      });

      const buildList = (nodes: TaiLieu[]): TaiLieu[] => {
          const sortedNodes = nodes.sort((a, b) => (a.thu_tu || 0) - (b.thu_tu || 0) || a.ma_tai_lieu.localeCompare(b.ma_tai_lieu));
          let result: TaiLieu[] = [];
          sortedNodes.forEach(node => {
              result.push(node);
              const children = docMap.get(node.id);
              if (children && children.length > 0) {
                  result = result.concat(buildList(children));
              }
          });
          return result;
      };

      return buildList(roots);
  };
  // --- END HIERARCHY LOGIC ---

  const filteredData = useMemo(() => {
    let result = data.filter(doc => {
      if (filters.trang_thai && doc.trang_thai !== filters.trang_thai) return false;
      if (filters.bo_phan && doc.bo_phan_soan_thao !== filters.bo_phan) return false;
      if (filters.loai_tai_lieu && doc.loai_tai_lieu !== filters.loai_tai_lieu) return false;
      return true;
    });

    if (isTreeView) {
        return sortDataHierarchy(result);
    }
    return result;
  }, [data, filters, isTreeView]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await dialog.confirm(
        'Hành động này không thể hoàn tác! Bạn có chắc muốn xóa tài liệu này không?',
        { title: 'Xác nhận xóa tài liệu', type: 'error', confirmLabel: 'Xóa ngay' }
    );

    if (confirmed) {
        try {
            await deleteDocument(id);
            onUpdate(data.filter(d => d.id !== id));
            dialog.alert('Đã xóa tài liệu thành công!', { type: 'success' });
        } catch (error) {
            dialog.alert('Lỗi khi xóa tài liệu! Vui lòng thử lại.', { type: 'error' });
        }
    }
  };

  const columns: ColumnDefinition<TaiLieu>[] = [
    { key: 'ma_tai_lieu', header: 'Mã tài liệu', visible: true, render: (val) => <span className="font-mono font-bold text-blue-700 dark:text-blue-400">{val}</span> },
    { 
        key: 'ten_tai_lieu', 
        header: 'Tên tài liệu', 
        visible: true, 
        render: (val, doc) => {
            const level = isTreeView ? getLevel(doc, data) : 0;
            const file = doc.dinh_kem?.[0];

            return (
                <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 24}px` }}>
                    {level > 0 && <CornerDownRight size={16} className="text-gray-400 shrink-0" />}
                    
                    {file && (
                        <a 
                            href={file.url} 
                            target="_blank" 
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()} // Prevent row click
                            className="shrink-0 hover:scale-110 transition-transform"
                            title={`Mở file: ${file.ten_file}`}
                        >
                            {file.loai === 'pdf' ? <FileType size={18} className="text-red-600" /> : 
                             file.loai === 'excel' ? <FileSpreadsheet size={18} className="text-green-600" /> : 
                             file.loai === 'doc' ? <FileText size={18} className="text-blue-600" /> :
                             <File size={18} className="text-gray-400" />}
                        </a>
                    )}

                    <span className={`font-medium line-clamp-1 ${level === 0 ? 'text-gray-900 dark:text-white font-bold' : 'text-gray-700 dark:text-gray-300'}`} title={val as string}>
                        {val}
                    </span>
                </div>
            );
        }
    },
    { key: 'phien_ban', header: 'Ver', visible: true, render: (val) => <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-xs font-mono dark:text-gray-300">{val}</span> },
    { key: 'bo_phan_soan_thao', header: 'Bộ phận', visible: true, render: (val) => <span className="text-xs dark:text-gray-300">{val}</span> },
    { key: 'ngay_ban_hanh', header: 'Ngày BH', visible: true, render: (val) => <span className="text-xs dark:text-gray-300">{val ? format(new Date(val), 'dd/MM/yyyy') : '--'}</span> },
    { key: 'trang_thai', header: 'Trạng thái', visible: true, render: (val) => <Badge status={val as TrangThaiTaiLieu} /> },
    { key: 'id', header: 'Thao tác', visible: true, render: (_, item) => (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleViewDetail(item); }} title="Xem chi tiết">
          <Eye size={16} className="text-gray-500 hover:text-blue-500" />
        </Button>
        <Button variant="ghost" size="icon" onClick={(e) => handleDelete(item.id, e)} title="Xóa tài liệu">
          <Trash2 size={16} className="text-gray-500 hover:text-red-500" />
        </Button>
      </div>
    )}
  ];

  const handleAddNew = () => {
    setSelectedDoc(null);
    setViewMode('form');
  };

  const handleViewDetail = (doc: TaiLieu) => {
    setSelectedDoc(doc);
    setViewMode('detail');
  };

  const handleCloseDrawer = () => {
    setViewMode('list');
    setTimeout(() => setSelectedDoc(null), 200);
  };

  const handleSaveDoc = async (docData: Partial<TaiLieu>) => {
    setIsLoading(true);
    const newDoc: TaiLieu = {
      ...docData,
      id: docData.id || `TL${Date.now()}`,
      ngay_tao: docData.ngay_tao || new Date().toISOString(),
      nguoi_tao: docData.nguoi_tao || currentUser.ho_ten,
      ngay_cap_nhat_cuoi: new Date().toISOString(),
      nguoi_cap_nhat_cuoi: currentUser.ho_ten,
      lich_su: docData.lich_su || []
    } as TaiLieu;

    if (!docData.id) {
       newDoc.lich_su?.push({
         id: `H${Date.now()}`,
         nguoi_thuc_hien: currentUser.ho_ten,
         hanh_dong: 'TAO_MOI',
         thoi_gian: new Date().toISOString(),
         ghi_chu: 'Khởi tạo tài liệu'
       });
    } else {
        newDoc.lich_su?.push({
         id: `H${Date.now()}`,
         nguoi_thuc_hien: currentUser.ho_ten,
         hanh_dong: 'CAP_NHAT',
         thoi_gian: new Date().toISOString(),
         ghi_chu: 'Cập nhật thông tin'
       });
    }

    try {
      await upsertDocument(newDoc);
      if (docData.id) {
        onUpdate(data.map(d => d.id === newDoc.id ? newDoc : d));
      } else {
        onUpdate([newDoc, ...data]);
      }
      handleCloseDrawer();
      dialog.alert('Lưu tài liệu thành công!', { type: 'success' });
    } catch (e) {
      dialog.alert('Lỗi lưu tài liệu! Vui lòng thử lại.', { type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendRequest = async () => {
    if (!selectedDoc) return;
    setIsLoading(true);
    const updatedDoc: TaiLieu = {
      ...selectedDoc,
      trang_thai: TrangThaiTaiLieu.CHO_DUYET,
      lich_su: [
        ...(selectedDoc.lich_su || []),
        {
          id: `H${Date.now()}`,
          nguoi_thuc_hien: currentUser.ho_ten,
          hanh_dong: 'GUI_DUYET',
          thoi_gian: new Date().toISOString(),
          ghi_chu: 'Gửi yêu cầu phê duyệt',
          trang_thai_cu: selectedDoc.trang_thai,
          trang_thai_moi: TrangThaiTaiLieu.CHO_DUYET
        }
      ]
    };

    try {
      await upsertDocument(updatedDoc);
      onUpdate(data.map(d => d.id === updatedDoc.id ? updatedDoc : d));
      setSelectedDoc(updatedDoc);
      dialog.alert('Đã gửi yêu cầu phê duyệt thành công!', { type: 'success' });
    } catch (e) {
      dialog.alert('Lỗi gửi yêu cầu phê duyệt.', { type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVersionUpClick = () => {
    setShowVersionModal(true);
    setVersionReason('');
    setVersionType('minor');
  };

  const getNextVersion = (currentVer: string, type: 'minor' | 'major') => {
    const parts = currentVer.split('.');
    const major = parseInt(parts[0]) || 1;
    const minor = parseInt(parts[1]) || 0;
    if (type === 'major') return `${major + 1}.0`;
    return `${major}.${minor + 1}`;
  };

  const confirmVersionUp = async () => {
    if (!selectedDoc) return;
    if (!versionReason.trim()) {
        dialog.alert("Vui lòng nhập lý do nâng cấp!", { type: 'warning' });
        return;
    }
    setIsLoading(true);

    const oldDoc: TaiLieu = {
       ...selectedDoc,
       trang_thai: TrangThaiTaiLieu.HET_HIEU_LUC,
       lich_su: [...(selectedDoc.lich_su || []), {
          id: `H${Date.now()}_OLD`,
          nguoi_thuc_hien: currentUser.ho_ten,
          hanh_dong: 'HUY_BO', // Hoặc hết hiệu lực
          thoi_gian: new Date().toISOString(),
          ghi_chu: `Hết hiệu lực do có phiên bản mới: ${versionReason}`
       }]
    };

    const newVersion = getNextVersion(selectedDoc.phien_ban, versionType);
    const newDoc: TaiLieu = {
       ...selectedDoc,
       id: `TL${Date.now()}`,
       phien_ban: newVersion,
       trang_thai: TrangThaiTaiLieu.SOAN_THAO,
       ngay_ban_hanh: '', // Reset
       ngay_hieu_luc: '', // Reset
       lan_ban_hanh: selectedDoc.lan_ban_hanh + 1,
       lich_su: [{
          id: `H${Date.now()}_NEW`,
          nguoi_thuc_hien: currentUser.ho_ten,
          hanh_dong: 'TAO_MOI',
          thoi_gian: new Date().toISOString(),
          ghi_chu: `Khởi tạo phiên bản ${newVersion} từ ${selectedDoc.phien_ban}. Lý do: ${versionReason}`
       }]
    };

    try {
        await upsertDocument(oldDoc);
        await upsertDocument(newDoc);
        onUpdate([...data.filter(d => d.id !== selectedDoc.id), oldDoc, newDoc]);
        setSelectedDoc(newDoc);
        setShowVersionModal(false);
        setViewMode('form');
        dialog.alert(`Đã nâng cấp lên phiên bản ${newVersion}`, { type: 'success' });
    } catch(e) {
        dialog.alert("Lỗi khi nâng phiên bản tài liệu.", { type: 'error' });
    } finally {
        setIsLoading(false);
    }
  };

  const renderFilters = (
    <div className="flex items-center gap-2 w-full">
       <button onClick={() => setIsTreeView(!isTreeView)} className={`shrink-0 h-9 w-9 flex items-center justify-center rounded-lg border transition-all ${isTreeView ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300' : 'bg-white border-gray-200 text-gray-500 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`} title={isTreeView ? "Đang xem dạng cây. Click để chuyển dạng danh sách." : "Đang xem danh sách. Click để chuyển dạng cây."}>
          {isTreeView ? <Layers size={18} /> : <List size={18} />}
       </button>
       <div className="h-6 w-px bg-gray-200 dark:bg-slate-700 shrink-0 mx-1"></div>
       <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar min-w-0">
           <div className="relative group shrink-0">
              <select className="h-9 pl-9 pr-7 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-gray-700 dark:text-gray-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer hover:border-blue-400 transition-colors w-auto min-w-[120px] max-w-[180px] truncate" value={filters.trang_thai || ''} onChange={(e) => setFilters(prev => ({ ...prev, trang_thai: e.target.value || undefined }))}>
                 <option value="">Trạng thái: Tất cả</option>
                 <option value={TrangThaiTaiLieu.SOAN_THAO}>Đang soạn thảo</option>
                 <option value={TrangThaiTaiLieu.CHO_DUYET}>Chờ duyệt</option>
                 <option value={TrangThaiTaiLieu.DA_BAN_HANH}>Đã ban hành</option>
                 <option value={TrangThaiTaiLieu.HET_HIEU_LUC}>Hết hiệu lực</option>
              </select>
              <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
           </div>
           <div className="relative group shrink-0">
              <select className="h-9 pl-9 pr-7 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-gray-700 dark:text-gray-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer hover:border-blue-400 transition-colors w-auto min-w-[120px] max-w-[180px] truncate" value={filters.bo_phan || ''} onChange={(e) => setFilters(prev => ({ ...prev, bo_phan: e.target.value || undefined }))}>
                 <option value="">Bộ phận: Tất cả</option>
                 {masterData.boPhan.map(bp => (<option key={bp.id} value={bp.ten}>{bp.ten}</option>))}
              </select>
              <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
           </div>
           <div className="relative group shrink-0">
              <select className="h-9 pl-9 pr-7 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-gray-700 dark:text-gray-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer hover:border-blue-400 transition-colors w-auto min-w-[120px] max-w-[180px] truncate" value={filters.loai_tai_lieu || ''} onChange={(e) => setFilters(prev => ({ ...prev, loai_tai_lieu: e.target.value || undefined }))}>
                 <option value="">Loại: Tất cả</option>
                 {masterData.loaiTaiLieu.map(lt => (<option key={lt.id} value={lt.ten}>{lt.ten}</option>))}
              </select>
              <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
           </div>
       </div>
       {(filters.trang_thai || filters.bo_phan || filters.loai_tai_lieu) && (
          <button onClick={() => setFilters({})} className="shrink-0 h-9 w-9 flex items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-all dark:bg-red-900/20 dark:border-red-900 dark:text-red-400 ml-1" title="Xóa tất cả bộ lọc"><X size={16} /></button>
       )}
    </div>
  );

  return (
    <div className="h-full flex flex-col animate-fade-in -mx-4 md:mx-0 relative">
      <div className="flex-1 overflow-hidden h-full rounded-lg border border-gray-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
         <DataTable 
            data={filteredData} 
            columns={columns} 
            onRowClick={handleViewDetail}
            filters={renderFilters}
            actions={<Button onClick={handleAddNew} leftIcon={<Plus size={16}/>} className="shadow-sm">Thêm mới</Button>}
         />
      </div>

      {(viewMode === 'form' || viewMode === 'detail') && (
        <div className="fixed inset-0 top-16 z-[50] flex justify-end">
           {/* Backdrop starts below navbar */}
           <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity animate-in fade-in duration-200" onClick={handleCloseDrawer}/>
           
           {/* Drawer starts below navbar with top border */}
           <div className="w-full max-w-4xl bg-white dark:bg-slate-950 h-full shadow-2xl relative animate-slide-in-right flex flex-col transition-colors border-l border-t border-gray-200 dark:border-slate-800">
              {viewMode === 'form' ? (
                 <TaiLieuForm 
                   initialData={selectedDoc} 
                   onSave={handleSaveDoc} 
                   onCancel={handleCloseDrawer} 
                   masterData={masterData}
                   fullList={data}
                 />
              ) : (
                 selectedDoc && (
                   <div className="flex flex-col h-full overflow-hidden relative bg-white dark:bg-slate-950">
                     
                     {/* --- 1. STICKY HEADER --- */}
                     <div className="flex flex-col border-b border-gray-100 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shrink-0 z-20">
                        
                        {/* Top Bar: Identity & Actions */}
                        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-50 dark:border-slate-800/50">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-800/50">
                                    <Hash size={16} className="opacity-70" />
                                    <span className="font-mono font-bold text-lg tracking-tight">{selectedDoc.ma_tai_lieu}</span>
                                </div>
                                <span className="text-gray-300 dark:text-slate-700 text-xl font-light">|</span>
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 font-medium">
                                    <span className="bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs font-mono border border-gray-200 dark:border-slate-700">v{selectedDoc.phien_ban}</span>
                                    <Badge status={selectedDoc.trang_thai} />
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => setShowHistoryModal(true)} 
                                    className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                                    title="Xem lịch sử"
                                >
                                    <History size={18} />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={handleCloseDrawer} className="text-gray-400 hover:text-red-500">
                                    <X size={20} />
                                </Button>
                            </div>
                        </div>

                        {/* Title Section */}
                        <div className="px-6 py-5">
                            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
                                {selectedDoc.ten_tai_lieu}
                            </h2>
                        </div>
                     </div>

                     {/* --- 2. SCROLLABLE CONTENT --- */}
                     <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 dark:bg-slate-950 pb-32">
                        
                        {/* Quick Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm flex items-start gap-3">
                                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-lg shrink-0">
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold mb-0.5">Loại tài liệu</p>
                                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 line-clamp-1" title={selectedDoc.loai_tai_lieu}>{selectedDoc.loai_tai_lieu}</p>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm flex items-start gap-3">
                                <div className="p-2 bg-orange-50 dark:bg-orange-900/20 text-orange-600 rounded-lg shrink-0">
                                    <Briefcase size={20} />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold mb-0.5">Bộ phận</p>
                                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 line-clamp-1" title={selectedDoc.bo_phan_soan_thao}>{selectedDoc.bo_phan_soan_thao}</p>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm flex items-start gap-3">
                                <div className="p-2 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-lg shrink-0">
                                    <Calendar size={20} />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold mb-0.5">Ngày hiệu lực</p>
                                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{selectedDoc.ngay_hieu_luc ? format(new Date(selectedDoc.ngay_hieu_luc), 'dd/MM/yyyy') : '---'}</p>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm flex items-start gap-3">
                                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-lg shrink-0">
                                    <GitMerge size={20} />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold mb-0.5">Lần ban hành</p>
                                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{String(selectedDoc.lan_ban_hanh).padStart(2, '0')}</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                           
                           {/* --- LEFT COLUMN (MAIN) --- */}
                           <div className="xl:col-span-2 space-y-8">
                              
                              {/* Description Section */}
                              <div className="space-y-3">
                                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide flex items-center gap-2">
                                      <Info size={16} className="text-blue-500"/> Nội dung tóm tắt
                                  </h3>
                                  <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
                                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm text-justify">
                                          {selectedDoc.mo_ta_tom_tat || <span className="text-gray-400 italic">Chưa có mô tả chi tiết cho tài liệu này.</span>}
                                      </p>
                                      
                                      {/* Tags/Standards */}
                                      {selectedDoc.tieu_chuan && selectedDoc.tieu_chuan.length > 0 && (
                                          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-slate-800 flex flex-wrap gap-2">
                                              {selectedDoc.tieu_chuan.map(t => (
                                                  <span key={t} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700">
                                                      <Tag size={12} /> {t}
                                                  </span>
                                              ))}
                                          </div>
                                      )}
                                  </div>
                              </div>

                              {/* Attachments Section */}
                              <div className="space-y-3">
                                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide flex items-center gap-2">
                                      <Paperclip size={16} className="text-orange-500"/> Tài liệu đính kèm
                                  </h3>
                                  {selectedDoc.dinh_kem && selectedDoc.dinh_kem.length > 0 ? (
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          {selectedDoc.dinh_kem.map(file => {
                                              const isRestricted = (file.loai === 'doc' || file.loai === 'excel') && !isAdmin;
                                              const icon = file.loai === 'pdf' ? <FileType className="text-red-500" size={24} /> : 
                                                           file.loai === 'excel' ? <FileSpreadsheet className="text-emerald-500" size={24} /> :
                                                           file.loai === 'doc' ? <FileText className="text-blue-500" size={24} /> :
                                                           <File className="text-gray-400" size={24} />;
                                              
                                              return (
                                                  <div key={file.id} className="group relative bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm hover:border-blue-300 dark:hover:border-blue-700 transition-all flex items-start gap-4">
                                                      <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg group-hover:scale-110 transition-transform">
                                                          {icon}
                                                      </div>
                                                      <div className="flex-1 min-w-0">
                                                          <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate mb-1" title={file.ten_file}>
                                                              {file.ten_file}
                                                          </p>
                                                          <div className="flex items-center justify-between">
                                                              <p className="text-xs text-gray-400">{format(new Date(file.ngay_upload), 'dd/MM/yyyy')}</p>
                                                              {!isRestricted && (
                                                                  <a 
                                                                    href={file.url} 
                                                                    target="_blank" 
                                                                    rel="noreferrer"
                                                                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                                                  >
                                                                      Xem file <ExternalLink size={10} />
                                                                  </a>
                                                              )}
                                                          </div>
                                                          {isRestricted && (
                                                              <div className="mt-2 flex items-center gap-1.5 text-amber-600 bg-amber-50 dark:bg-amber-900/10 px-2 py-1 rounded text-[10px] w-fit">
                                                                  <Lock size={10} /> <span>Chỉ xem (Không tải)</span>
                                                              </div>
                                                          )}
                                                      </div>
                                                  </div>
                                              );
                                          })}
                                      </div>
                                  ) : (
                                      <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-dashed border-gray-300 dark:border-slate-700 flex flex-col items-center justify-center text-gray-400">
                                          <File size={32} className="mb-2 opacity-50" />
                                          <p className="text-sm">Không có file đính kèm nào.</p>
                                      </div>
                                  )}
                              </div>
                           </div>

                           {/* --- RIGHT COLUMN (SIDEBAR) --- */}
                           <div className="space-y-6">
                               
                               {/* Control Card */}
                               <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
                                   <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50">
                                       <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                           <Shield size={16} className="text-emerald-500" /> Kiểm soát
                                       </h4>
                                   </div>
                                   <div className="p-4 space-y-4">
                                       <div>
                                           <p className="text-xs text-gray-500 uppercase font-bold mb-1">Ngày ban hành</p>
                                           <p className="text-sm font-medium">{selectedDoc.ngay_ban_hanh ? format(new Date(selectedDoc.ngay_ban_hanh), 'dd/MM/yyyy') : '---'}</p>
                                       </div>
                                       <div>
                                           <p className="text-xs text-gray-500 uppercase font-bold mb-1">Ngày hiệu lực</p>
                                           <p className="text-sm font-medium">{selectedDoc.ngay_hieu_luc ? format(new Date(selectedDoc.ngay_hieu_luc), 'dd/MM/yyyy') : '---'}</p>
                                       </div>
                                       {selectedDoc.ngay_ra_soat_tiep_theo && (
                                           <div className="pt-3 border-t border-gray-100 dark:border-slate-800">
                                               <p className="text-xs text-orange-600 dark:text-orange-400 uppercase font-bold mb-1 flex items-center gap-1">
                                                   <RefreshCw size={12} /> Rà soát tiếp theo
                                               </p>
                                               <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                                                   {format(new Date(selectedDoc.ngay_ra_soat_tiep_theo), 'dd/MM/yyyy')}
                                               </p>
                                               <p className="text-[10px] text-gray-400 mt-0.5">Chu kỳ: {selectedDoc.chu_ky_ra_soat} tháng</p>
                                           </div>
                                       )}
                                   </div>
                               </div>

                               {/* Responsibilities Card */}
                               <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
                                   <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50">
                                       <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                           <UserCheck size={16} className="text-blue-500" /> Trách nhiệm
                                       </h4>
                                   </div>
                                   <div className="p-4 space-y-4">
                                       <div className="flex items-start gap-3">
                                           <div className="mt-0.5 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-[10px] font-bold text-blue-600">S</div>
                                           <div>
                                               <p className="text-xs text-gray-500 font-bold">Người soạn thảo</p>
                                               <p className="text-sm font-medium">{selectedDoc.nguoi_soan_thao}</p>
                                           </div>
                                       </div>
                                       <div className="flex items-start gap-3">
                                           <div className="mt-0.5 w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-[10px] font-bold text-purple-600">X</div>
                                           <div>
                                               <p className="text-xs text-gray-500 font-bold">Người xem xét</p>
                                               <p className="text-sm font-medium">{selectedDoc.nguoi_xem_xet || '---'}</p>
                                           </div>
                                       </div>
                                       <div className="flex items-start gap-3">
                                           <div className="mt-0.5 w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-[10px] font-bold text-green-600">P</div>
                                           <div>
                                               <p className="text-xs text-gray-500 font-bold">Người phê duyệt</p>
                                               <p className="text-sm font-medium">{selectedDoc.nguoi_phe_duyet || '---'}</p>
                                           </div>
                                       </div>
                                   </div>
                               </div>

                               {/* Related Records */}
                               <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
                                   <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50">
                                       <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                           <Archive size={16} className="text-gray-500" /> Hồ sơ liên quan
                                       </h4>
                                   </div>
                                   <div className="p-4">
                                       {records.filter(r => r.ma_tai_lieu_lien_quan === selectedDoc.ma_tai_lieu).length > 0 ? (
                                           <div className="space-y-2">
                                              {records.filter(r => r.ma_tai_lieu_lien_quan === selectedDoc.ma_tai_lieu).map(rec => (
                                                 <div key={rec.id} className="p-2.5 border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/30 rounded-lg hover:border-blue-200 dark:hover:border-slate-600 transition-colors">
                                                    <div className="font-medium text-xs text-gray-800 dark:text-gray-200 line-clamp-2 mb-1">{rec.tieu_de}</div>
                                                    <div className="flex justify-between items-center text-[10px] text-gray-500">
                                                       <span className="font-mono">{rec.ma_ho_so}</span>
                                                       <span>{format(new Date(rec.ngay_tao), 'dd/MM/yyyy')}</span>
                                                    </div>
                                                 </div>
                                              ))}
                                           </div>
                                       ) : <p className="text-xs text-gray-400 italic text-center py-2">Chưa có hồ sơ phát sinh.</p>}
                                   </div>
                               </div>

                           </div>
                        </div>
                     </div>

                     {/* --- 3. FOOTER ACTIONS --- */}
                     <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-950 sticky bottom-0 z-20 flex justify-end gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                       {(selectedDoc.trang_thai === TrangThaiTaiLieu.SOAN_THAO) ? (
                           <>
                             <Button variant="secondary" onClick={() => setViewMode('form')}><Pencil size={16} className="mr-2" /> Chỉnh sửa</Button>
                             <Button onClick={handleSendRequest} className="bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200" isLoading={isLoading} leftIcon={<Send size={16} />}>Gửi phê duyệt</Button>
                           </>
                       ) : (
                           <>
                             <Button className="bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200 border border-transparent" onClick={handleVersionUpClick} leftIcon={<FileUp size={16} />}>Nâng phiên bản</Button>
                             <Button variant="secondary" onClick={() => setViewMode('form')}><Pencil size={16} className="mr-2" /> Sửa thông tin</Button>
                           </>
                       )}
                    </div>
                    
                    {/* Floating Chat Widget */}
                    <AIChatWidget document={selectedDoc} />
                   </div>
                 )
              )}
           </div>
        </div>
      )}

      {/* History Modal */}
      <Modal 
        isOpen={showHistoryModal} 
        onClose={() => setShowHistoryModal(false)} 
        title="Lịch sử hoạt động tài liệu" 
        size="lg"
        footer={<Button onClick={() => setShowHistoryModal(false)}>Đóng</Button>}
      >
        <div className="p-6">
            <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg mb-6 border border-blue-100 dark:border-blue-900/50">
                <h4 className="font-bold text-blue-800 dark:text-blue-300 text-sm mb-1">{selectedDoc?.ten_tai_lieu}</h4>
                <div className="flex gap-4 text-xs text-blue-600 dark:text-blue-400">
                    <span>Mã: {selectedDoc?.ma_tai_lieu}</span>
                    <span>Phiên bản hiện tại: {selectedDoc?.phien_ban}</span>
                </div>
            </div>
            <DocumentTimeline history={selectedDoc?.lich_su || []} />
        </div>
      </Modal>

      {/* Keep Version Modal unchanged */}
      <Modal isOpen={showVersionModal} onClose={() => setShowVersionModal(false)} title="Nâng phiên bản tài liệu" size="lg" footer={<><Button variant="ghost" onClick={() => setShowVersionModal(false)}>Hủy bỏ</Button><Button onClick={confirmVersionUp} leftIcon={<FileUp size={16} />}>Xác nhận & Tạo bản thảo</Button></>}>
        <div className="space-y-6 p-6">
           {selectedDoc && (
             <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800 p-5 rounded-xl flex items-center justify-between border border-blue-100 dark:border-slate-700 relative overflow-hidden shadow-sm">
               <div className="relative z-10">
                  <p className="text-[10px] text-blue-600 dark:text-blue-300 font-bold uppercase tracking-wider mb-1">Phiên bản hiện tại</p>
                  <p className="text-3xl font-mono font-bold text-blue-700 dark:text-blue-400">{selectedDoc.phien_ban}</p>
               </div>
               <div className="flex items-center text-blue-300 dark:text-slate-600">
                  <div className="w-8 h-0.5 bg-current"></div>
                  <ChevronRight size={24} className="-ml-2" />
               </div>
               <div className="relative z-10 text-right">
                  <p className="text-[10px] text-green-600 dark:text-green-300 font-bold uppercase tracking-wider mb-1">Phiên bản mới</p>
                  <p className="text-3xl font-mono font-bold text-green-700 dark:text-green-400">{getNextVersion(selectedDoc.phien_ban, versionType)}</p>
               </div>
               <div className="absolute -right-6 -top-6 w-24 h-24 bg-green-100 dark:bg-green-900/20 rounded-full blur-2xl opacity-50"></div>
               <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-blue-100 dark:bg-blue-900/20 rounded-full blur-2xl opacity-50"></div>
             </div>
           )}
           
           <div>
              <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-3">Chọn loại nâng cấp</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <button 
                    onClick={() => setVersionType('minor')} 
                    className={`relative p-4 rounded-xl border-2 text-left transition-all duration-200 group hover:shadow-md ${versionType === 'minor' ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500/20 dark:bg-blue-900/20 dark:border-blue-400' : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700'}`}
                 >
                    <div className="flex justify-between items-start mb-2">
                       <div className={`p-2 rounded-lg ${versionType === 'minor' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600'}`}>
                          <Zap size={20} />
                       </div>
                       {versionType === 'minor' && <div className="bg-blue-600 text-white rounded-full p-0.5"><Check size={14} /></div>}
                    </div>
                    <span className={`block font-bold text-sm mb-1 ${versionType === 'minor' ? 'text-blue-900 dark:text-blue-100' : 'text-gray-700 dark:text-gray-200'}`}>Nâng cấp nhỏ (Minor)</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">Sửa lỗi chính tả, format, thay đổi nhỏ không ảnh hưởng quy trình.</p>
                 </button>

                 <button 
                    onClick={() => setVersionType('major')} 
                    className={`relative p-4 rounded-xl border-2 text-left transition-all duration-200 group hover:shadow-md ${versionType === 'major' ? 'bg-purple-50 border-purple-500 ring-1 ring-purple-500/20 dark:bg-purple-900/20 dark:border-purple-400' : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700'}`}
                 >
                    <div className="flex justify-between items-start mb-2">
                       <div className={`p-2 rounded-lg ${versionType === 'major' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-400 group-hover:bg-purple-50 group-hover:text-purple-600'}`}>
                          <GitMerge size={20} />
                       </div>
                       {versionType === 'major' && <div className="bg-purple-600 text-white rounded-full p-0.5"><Check size={14} /></div>}
                    </div>
                    <span className={`block font-bold text-sm mb-1 ${versionType === 'major' ? 'text-purple-900 dark:text-purple-100' : 'text-gray-700 dark:text-gray-200'}`}>Nâng cấp lớn (Major)</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">Thay đổi nội dung, lưu đồ, biểu mẫu hoặc quy trình vận hành.</p>
                 </button>
              </div>
           </div>

           <div>
              <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-2">Nội dung cập nhật / Lý do <span className="text-red-500">*</span></label>
              <textarea 
                 className="w-full p-4 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 ring-primary/20 focus:border-primary outline-none text-sm min-h-[120px] transition-shadow placeholder:text-gray-400 shadow-sm dark:text-gray-200" 
                 placeholder="Mô tả chi tiết các thay đổi so với phiên bản trước để lưu vào lịch sử..." 
                 value={versionReason} 
                 onChange={(e) => setVersionReason(e.target.value)}
              />
           </div>

           <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl flex gap-3 items-start border border-amber-200 dark:border-amber-800/30">
              <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-500" />
              <div>
                 <p className="text-xs font-bold text-amber-800 dark:text-amber-400 mb-1">Lưu ý quan trọng</p>
                 <p className="text-xs text-amber-700 dark:text-amber-500 leading-relaxed">Sau khi xác nhận, tài liệu phiên bản cũ ({selectedDoc?.phien_ban}) sẽ chuyển sang trạng thái "Hết hiệu lực". Một bản thảo mới sẽ được tạo ra để bạn bắt đầu chỉnh sửa.</p>
              </div>
           </div>
        </div>
      </Modal>
    </div>
  );
};
