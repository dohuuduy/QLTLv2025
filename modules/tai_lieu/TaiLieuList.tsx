
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TaiLieu, TrangThaiTaiLieu, MasterDataState, NhanSu, HoSo, ColumnDefinition } from '../../types';
import { DataTable } from '../../components/DataTable';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { TaiLieuForm } from './TaiLieuForm';
import { DocumentTimeline } from '../../components/DocumentTimeline';
import { AIChatWidget } from '../../components/AIChatWidget';
import { Plus, Filter, FileText, Download, Eye, Pencil, Send, FileUp, Zap, Check, GitMerge, AlertTriangle, ChevronRight, X, Clock, File, Trash2, CornerDownRight, Layers, List, Search, FileType, FileSpreadsheet, Lock, History, Hash, Calendar, Shield, UserCheck, Briefcase, Tag, RefreshCw, Paperclip, ExternalLink, Archive, Info, LayoutDashboard } from 'lucide-react';
import { upsertDocument, deleteDocument } from '../../services/supabaseService';
import { format } from 'date-fns';
import { useDialog } from '../../contexts/DialogContext';
import { Modal } from '../../components/ui/Modal'; // Use standard Modal for Confirm/History

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
  // View Modes: list, form (create/edit), detail (centered card)
  const [viewMode, setViewMode] = useState<'list' | 'form' | 'detail'>('list');
  const [isTreeView, setIsTreeView] = useState(true); 
  const [selectedDoc, setSelectedDoc] = useState<TaiLieu | null>(null);
  
  const [filters, setFilters] = useState<{ trang_thai?: string; bo_phan?: string; loai_tai_lieu?: string }>(initialFilters || {});
  
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [versionType, setVersionType] = useState<'minor' | 'major'>('minor');
  const [versionReason, setVersionReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const dialog = useDialog();
  const isAdmin = currentUser.roles.includes('QUAN_TRI');

  // Lock body scroll when in detail/form mode
  useEffect(() => {
    if (viewMode !== 'list') {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [viewMode]);

  useEffect(() => {
    if (initialFilters) setFilters(prev => ({ ...prev, ...initialFilters }));
  }, [initialFilters]);

  const getUserName = (id: string) => masterData.nhanSu.find(u => u.id === id)?.ho_ten || '---';
  const getDept = (userId: string) => masterData.nhanSu.find(u => u.id === userId)?.phong_ban || '---';

  // --- HIERARCHY LOGIC ---
  const getLevel = (doc: TaiLieu, allDocs: TaiLieu[]): number => {
      let level = 0;
      let currentDoc = doc;
      while (currentDoc.tai_lieu_cha_id && level < 5) {
          const parent = allDocs.find(d => d.id === currentDoc.tai_lieu_cha_id);
          if (parent) { level++; currentDoc = parent; } else { break; }
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
          } else { roots.push(doc); }
      });
      const buildList = (nodes: TaiLieu[]): TaiLieu[] => {
          const sortedNodes = nodes.sort((a, b) => (a.thu_tu || 0) - (b.thu_tu || 0) || a.ma_tai_lieu.localeCompare(b.ma_tai_lieu));
          let result: TaiLieu[] = [];
          sortedNodes.forEach(node => {
              result.push(node);
              const children = docMap.get(node.id);
              if (children && children.length > 0) result = result.concat(buildList(children));
          });
          return result;
      };
      return buildList(roots);
  };

  const filteredData = useMemo(() => {
    let result = data.filter(doc => {
      if (filters.trang_thai && doc.trang_thai !== filters.trang_thai) return false;
      if (filters.bo_phan) {
          const authorDept = masterData.nhanSu.find(u => u.id === doc.id_nguoi_soan_thao)?.phong_ban;
          if (authorDept !== filters.bo_phan) return false;
      }
      if (filters.loai_tai_lieu && doc.loai_tai_lieu !== filters.loai_tai_lieu) return false;
      return true;
    });
    return isTreeView ? sortDataHierarchy(result) : result;
  }, [data, filters, isTreeView, masterData.nhanSu]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await dialog.confirm('Hành động này không thể hoàn tác! Bạn có chắc muốn xóa tài liệu này không?', { title: 'Xác nhận xóa tài liệu', type: 'error', confirmLabel: 'Xóa ngay' });
    if (confirmed) {
        try {
            await deleteDocument(id);
            onUpdate(data.filter(d => d.id !== id));
            dialog.alert('Đã xóa tài liệu thành công!', { type: 'success' });
        } catch (error) { dialog.alert('Lỗi khi xóa tài liệu!', { type: 'error' }); }
    }
  };

  // --- COLUMN DEFINITIONS ---
  const columns: ColumnDefinition<TaiLieu>[] = [
    { key: 'ma_tai_lieu', header: 'Mã tài liệu', visible: true, render: (val) => <span className="font-mono font-bold text-blue-700 dark:text-blue-400">{val}</span> },
    { 
        key: 'ten_tai_lieu', header: 'Tên tài liệu', visible: true, 
        render: (val, doc) => {
            const level = isTreeView ? getLevel(doc, data) : 0;
            const file = doc.dinh_kem?.[0];
            return (
                <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 24}px` }}>
                    {level > 0 && <CornerDownRight size={16} className="text-gray-400 shrink-0" />}
                    {file && (
                        <a href={file.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="shrink-0 hover:scale-110 transition-transform" title={`Mở file: ${file.ten_file}`}>
                            {file.loai === 'pdf' ? <FileType size={18} className="text-red-600" /> : file.loai === 'excel' ? <FileSpreadsheet size={18} className="text-green-600" /> : file.loai === 'doc' ? <FileText size={18} className="text-blue-600" /> : <File size={18} className="text-gray-400" />}
                        </a>
                    )}
                    <span className={`font-medium line-clamp-1 ${level === 0 ? 'text-gray-900 dark:text-white font-bold' : 'text-gray-700 dark:text-gray-300'}`} title={val as string}>{val}</span>
                </div>
            );
        }
    },
    { key: 'phien_ban', header: 'Ver', visible: true, render: (val) => <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-xs font-mono dark:text-gray-300">{val}</span> },
    { key: 'id_nguoi_soan_thao', header: 'Bộ phận', visible: true, render: (val) => <span className="text-xs dark:text-gray-300">{getDept(val as string)}</span> },
    { key: 'ngay_ban_hanh', header: 'Ngày BH', visible: true, render: (val) => <span className="text-xs dark:text-gray-300">{val ? format(new Date(val), 'dd/MM/yyyy') : '--'}</span> },
    { key: 'trang_thai', header: 'Trạng thái', visible: true, render: (val) => <Badge status={val as TrangThaiTaiLieu} /> },
    { key: 'id', header: 'Thao tác', visible: true, render: (_, item) => (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleViewDetail(item); }} title="Xem chi tiết"><Eye size={16} className="text-gray-500 hover:text-blue-500" /></Button>
        <Button variant="ghost" size="icon" onClick={(e) => handleDelete(item.id, e)} title="Xóa tài liệu"><Trash2 size={16} className="text-gray-500 hover:text-red-500" /></Button>
      </div>
    )}
  ];

  // --- HANDLERS ---
  const handleAddNew = () => { setSelectedDoc(null); setViewMode('form'); };
  const handleViewDetail = (doc: TaiLieu) => { setSelectedDoc(doc); setViewMode('detail'); };
  const handleCloseOverlay = () => { setViewMode('list'); setTimeout(() => setSelectedDoc(null), 200); };

  const handleSaveDoc = async (docData: Partial<TaiLieu>) => {
    setIsLoading(true);
    const newDoc: TaiLieu = {
      ...docData,
      id: docData.id || `TL${Date.now()}`,
      ngay_tao: docData.ngay_tao || new Date().toISOString(),
      id_nguoi_tao: docData.id_nguoi_tao || currentUser.id,
      ngay_cap_nhat_cuoi: new Date().toISOString(),
      id_nguoi_cap_nhat_cuoi: currentUser.id,
      lich_su: docData.lich_su || []
    } as TaiLieu;

    if (!docData.id) newDoc.lich_su?.push({ id: `H${Date.now()}`, nguoi_thuc_hien: currentUser.ho_ten, hanh_dong: 'TAO_MOI', thoi_gian: new Date().toISOString(), ghi_chu: 'Khởi tạo tài liệu' });
    else newDoc.lich_su?.push({ id: `H${Date.now()}`, nguoi_thuc_hien: currentUser.ho_ten, hanh_dong: 'CAP_NHAT', thoi_gian: new Date().toISOString(), ghi_chu: 'Cập nhật thông tin' });

    try {
      await upsertDocument(newDoc);
      if (docData.id) onUpdate(data.map(d => d.id === newDoc.id ? newDoc : d));
      else onUpdate([newDoc, ...data]);
      handleCloseOverlay();
      dialog.alert('Lưu tài liệu thành công!', { type: 'success' });
    } catch (e) { dialog.alert('Lỗi lưu tài liệu! Vui lòng thử lại.', { type: 'error' }); } finally { setIsLoading(false); }
  };

  // Approval Request
  const handleSendRequest = async () => {
    if (!selectedDoc) return;
    setIsLoading(true);
    const updatedDoc: TaiLieu = {
      ...selectedDoc,
      trang_thai: TrangThaiTaiLieu.CHO_DUYET,
      lich_su: [...(selectedDoc.lich_su || []), { id: `H${Date.now()}`, nguoi_thuc_hien: currentUser.ho_ten, hanh_dong: 'GUI_DUYET', thoi_gian: new Date().toISOString(), ghi_chu: 'Gửi yêu cầu phê duyệt', trang_thai_cu: selectedDoc.trang_thai, trang_thai_moi: TrangThaiTaiLieu.CHO_DUYET }]
    };
    try {
      await upsertDocument(updatedDoc);
      onUpdate(data.map(d => d.id === updatedDoc.id ? updatedDoc : d));
      setSelectedDoc(updatedDoc);
      dialog.alert('Đã gửi yêu cầu phê duyệt thành công!', { type: 'success' });
    } catch (e) { dialog.alert('Lỗi gửi yêu cầu phê duyệt.', { type: 'error' }); } finally { setIsLoading(false); }
  };

  // Versioning Logic
  const handleVersionUpClick = () => { setShowVersionModal(true); setVersionReason(''); setVersionType('minor'); };
  const getNextVersion = (currentVer: string, type: 'minor' | 'major') => {
    const parts = currentVer.split('.');
    const major = parseInt(parts[0]) || 1;
    const minor = parseInt(parts[1]) || 0;
    return type === 'major' ? `${major + 1}.0` : `${major}.${minor + 1}`;
  };
  const confirmVersionUp = async () => {
    if (!selectedDoc || !versionReason.trim()) { dialog.alert("Vui lòng nhập lý do nâng cấp!", { type: 'warning' }); return; }
    setIsLoading(true);
    const oldDoc: TaiLieu = { ...selectedDoc, trang_thai: TrangThaiTaiLieu.HET_HIEU_LUC, lich_su: [...(selectedDoc.lich_su || []), { id: `H${Date.now()}_OLD`, nguoi_thuc_hien: currentUser.ho_ten, hanh_dong: 'HUY_BO', thoi_gian: new Date().toISOString(), ghi_chu: `Hết hiệu lực do có phiên bản mới: ${versionReason}` }] };
    const newVersion = getNextVersion(selectedDoc.phien_ban, versionType);
    const newDoc: TaiLieu = { ...selectedDoc, id: `TL${Date.now()}`, phien_ban: newVersion, trang_thai: TrangThaiTaiLieu.SOAN_THAO, ngay_ban_hanh: '', ngay_hieu_luc: '', lan_ban_hanh: selectedDoc.lan_ban_hanh + 1, lich_su: [{ id: `H${Date.now()}_NEW`, nguoi_thuc_hien: currentUser.ho_ten, hanh_dong: 'TAO_MOI', thoi_gian: new Date().toISOString(), ghi_chu: `Khởi tạo phiên bản ${newVersion} từ ${selectedDoc.phien_ban}. Lý do: ${versionReason}` }] };
    try {
        await upsertDocument(oldDoc);
        await upsertDocument(newDoc);
        onUpdate([...data.filter(d => d.id !== selectedDoc.id), oldDoc, newDoc]);
        setSelectedDoc(newDoc);
        setShowVersionModal(false);
        setViewMode('form');
        dialog.alert(`Đã nâng cấp lên phiên bản ${newVersion}`, { type: 'success' });
    } catch(e) { dialog.alert("Lỗi khi nâng phiên bản tài liệu.", { type: 'error' }); } finally { setIsLoading(false); }
  };

  const renderFilters = (
    <div className="flex items-center gap-2 w-full">
       <button onClick={() => setIsTreeView(!isTreeView)} className={`shrink-0 h-9 w-9 flex items-center justify-center rounded-lg border transition-all ${isTreeView ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300' : 'bg-white border-gray-200 text-gray-500 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`} title={isTreeView ? "Đang xem dạng cây. Click để chuyển dạng danh sách." : "Đang xem danh sách. Click để chuyển dạng cây."}>{isTreeView ? <Layers size={18} /> : <List size={18} />}</button>
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
           {/* More filters can be added here */}
       </div>
       {(filters.trang_thai || filters.bo_phan || filters.loai_tai_lieu) && (
          <button onClick={() => setFilters({})} className="shrink-0 h-9 w-9 flex items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-all dark:bg-red-900/20 dark:border-red-900 dark:text-red-400 ml-1" title="Xóa tất cả bộ lọc"><X size={16} /></button>
       )}
    </div>
  );

  return (
    <div className="h-full flex flex-col animate-fade-in relative">
      <div className="flex-1 overflow-hidden h-full rounded-lg border border-gray-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
         <DataTable data={filteredData} columns={columns} onRowClick={handleViewDetail} filters={renderFilters} actions={<Button onClick={handleAddNew} leftIcon={<Plus size={16}/>} className="shadow-sm">Thêm mới</Button>} />
      </div>

      {/* RENDER FORM OVERLAY (If in Form Mode) */}
      {viewMode === 'form' && (
         <TaiLieuForm initialData={selectedDoc} onSave={handleSaveDoc} onCancel={handleCloseOverlay} masterData={masterData} fullList={data} />
      )}

      {/* RENDER DETAIL CARD OVERLAY (If in Detail Mode) */}
      {viewMode === 'detail' && selectedDoc && createPortal(
         <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-gray-100/80 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
               <div className="absolute top-[20%] right-[20%] w-[30%] h-[30%] bg-blue-500/10 rounded-full blur-3xl"></div>
            </div>

            <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 flex flex-col max-h-[95vh] z-10 animate-in zoom-in-95 duration-300">
               {/* Header */}
               <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-start shrink-0">
                  <div className="flex items-center gap-4">
                     <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center shadow-inner">
                        <FileText size={32} />
                     </div>
                     <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{selectedDoc.ten_tai_lieu}</h2>
                        <div className="flex items-center gap-2 mt-2">
                           <span className="font-mono font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded text-xs border border-blue-100 dark:border-blue-800">{selectedDoc.ma_tai_lieu}</span>
                           <span className="text-gray-400">•</span>
                           <Badge status={selectedDoc.trang_thai} />
                           <span className="text-gray-400">•</span>
                           <span className="text-sm text-gray-500">Phiên bản {selectedDoc.phien_ban}</span>
                        </div>
                     </div>
                  </div>
                  <button onClick={handleCloseOverlay} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"><X size={24} className="text-gray-400"/></button>
               </div>

               {/* Body */}
               <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                     {/* Left: Main Content */}
                     <div className="lg:col-span-2 space-y-8">
                        <div>
                           <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Info size={16}/> Nội dung chi tiết</h3>
                           <div className="p-6 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-800 text-gray-700 dark:text-gray-300 leading-relaxed text-sm text-justify">
                              {selectedDoc.mo_ta_tom_tat || "Chưa có mô tả."}
                           </div>
                        </div>
                        <div>
                           <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Paperclip size={16}/> Tài liệu đính kèm</h3>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {selectedDoc.dinh_kem?.map(file => (
                                 <a key={file.id} href={file.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-blue-400 hover:shadow-md transition-all group bg-white dark:bg-slate-900">
                                    <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-gray-500 group-hover:text-blue-600 transition-colors"><FileText size={20}/></div>
                                    <div className="overflow-hidden">
                                       <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate group-hover:text-blue-600 transition-colors">{file.ten_file}</p>
                                       <p className="text-xs text-gray-400">Nhấn để xem chi tiết</p>
                                    </div>
                                 </a>
                              ))}
                              {(!selectedDoc.dinh_kem || selectedDoc.dinh_kem.length === 0) && <p className="text-sm text-gray-400 italic">Không có file.</p>}
                           </div>
                        </div>
                     </div>

                     {/* Right: Meta Info */}
                     <div className="space-y-6">
                        <div className="p-5 rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                           <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Shield size={18} className="text-green-500"/> Thông tin kiểm soát</h4>
                           <div className="space-y-3 text-sm">
                              <div className="flex justify-between"><span className="text-gray-500">Ngày ban hành</span><span className="font-medium">{selectedDoc.ngay_ban_hanh || '--'}</span></div>
                              <div className="flex justify-between"><span className="text-gray-500">Ngày hiệu lực</span><span className="font-medium">{selectedDoc.ngay_hieu_luc || '--'}</span></div>
                              <div className="flex justify-between"><span className="text-gray-500">Chu kỳ rà soát</span><span className="font-medium">{selectedDoc.chu_ky_ra_soat ? `${selectedDoc.chu_ky_ra_soat} tháng` : 'Không'}</span></div>
                           </div>
                        </div>

                        <div className="p-5 rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                           <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><UserCheck size={18} className="text-purple-500"/> Trách nhiệm</h4>
                           <div className="space-y-4">
                              <div><p className="text-xs text-gray-400 uppercase mb-1">Soạn thảo</p><div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">{getUserName(selectedDoc.id_nguoi_soan_thao).charAt(0)}</div><span className="text-sm font-medium">{getUserName(selectedDoc.id_nguoi_soan_thao)}</span></div></div>
                              <div><p className="text-xs text-gray-400 uppercase mb-1">Xem xét</p><div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">{getUserName(selectedDoc.id_nguoi_xem_xet).charAt(0)}</div><span className="text-sm font-medium">{getUserName(selectedDoc.id_nguoi_xem_xet)}</span></div></div>
                              <div><p className="text-xs text-gray-400 uppercase mb-1">Phê duyệt</p><div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">{getUserName(selectedDoc.id_nguoi_phe_duyet).charAt(0)}</div><span className="text-sm font-medium">{getUserName(selectedDoc.id_nguoi_phe_duyet)}</span></div></div>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Footer Actions */}
               <div className="p-6 border-t border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50 rounded-b-3xl">
                  <Button variant="ghost" onClick={() => setShowHistoryModal(true)} leftIcon={<History size={18}/>} className="text-gray-500">Lịch sử</Button>
                  <div className="flex gap-3">
                     {selectedDoc.trang_thai === TrangThaiTaiLieu.SOAN_THAO ? (
                        <>
                           <Button variant="secondary" onClick={() => setViewMode('form')} className="h-11 px-6 rounded-xl"><Pencil size={18} className="mr-2"/> Chỉnh sửa</Button>
                           <Button onClick={handleSendRequest} className="h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20" isLoading={isLoading} leftIcon={<Send size={18}/>}>Gửi duyệt</Button>
                        </>
                     ) : (
                        <Button onClick={handleVersionUpClick} className="h-11 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20" leftIcon={<FileUp size={18}/>}>Nâng phiên bản</Button>
                     )}
                  </div>
               </div>
               
               {/* Chat Widget Inside Detail */}
               <AIChatWidget document={selectedDoc} />
            </div>
         </div>,
         document.body
      )}

      {/* History & Version Modals (Keep existing) */}
      <Modal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} title="Lịch sử hoạt động" size="lg" footer={<Button onClick={() => setShowHistoryModal(false)}>Đóng</Button>}><div className="p-6"><DocumentTimeline history={selectedDoc?.lich_su || []} /></div></Modal>
      
      <Modal isOpen={showVersionModal} onClose={() => setShowVersionModal(false)} title="Nâng phiên bản tài liệu" size="lg" footer={<><Button variant="ghost" onClick={() => setShowVersionModal(false)}>Hủy bỏ</Button><Button onClick={confirmVersionUp} leftIcon={<FileUp size={16} />}>Xác nhận & Tạo bản thảo</Button></>}>
        <div className="space-y-6 p-6">
           {selectedDoc && (
             <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800 p-5 rounded-xl flex items-center justify-between border border-blue-100 dark:border-slate-700 relative overflow-hidden shadow-sm">
               <div className="relative z-10"><p className="text-[10px] text-blue-600 dark:text-blue-300 font-bold uppercase tracking-wider mb-1">Phiên bản hiện tại</p><p className="text-3xl font-mono font-bold text-blue-700 dark:text-blue-400">{selectedDoc.phien_ban}</p></div>
               <div className="flex items-center text-blue-300 dark:text-slate-600"><div className="w-8 h-0.5 bg-current"></div><ChevronRight size={24} className="-ml-2" /></div>
               <div className="relative z-10 text-right"><p className="text-[10px] text-green-600 dark:text-green-300 font-bold uppercase tracking-wider mb-1">Phiên bản mới</p><p className="text-3xl font-mono font-bold text-green-700 dark:text-green-400">{getNextVersion(selectedDoc.phien_ban, versionType)}</p></div>
             </div>
           )}
           <div><label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-3">Chọn loại nâng cấp</label><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><button onClick={() => setVersionType('minor')} className={`relative p-4 rounded-xl border-2 text-left transition-all duration-200 group hover:shadow-md ${versionType === 'minor' ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500/20 dark:bg-blue-900/20 dark:border-blue-400' : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700'}`}><div className="flex justify-between items-start mb-2"><div className={`p-2 rounded-lg ${versionType === 'minor' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600'}`}><Zap size={20} /></div>{versionType === 'minor' && <div className="bg-blue-600 text-white rounded-full p-0.5"><Check size={14} /></div>}</div><span className={`block font-bold text-sm mb-1 ${versionType === 'minor' ? 'text-blue-900 dark:text-blue-100' : 'text-gray-700 dark:text-gray-200'}`}>Nâng cấp nhỏ (Minor)</span><p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">Sửa lỗi chính tả, format, thay đổi nhỏ không ảnh hưởng quy trình.</p></button><button onClick={() => setVersionType('major')} className={`relative p-4 rounded-xl border-2 text-left transition-all duration-200 group hover:shadow-md ${versionType === 'major' ? 'bg-purple-50 border-purple-500 ring-1 ring-purple-500/20 dark:bg-purple-900/20 dark:border-purple-400' : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700'}`}><div className="flex justify-between items-start mb-2"><div className={`p-2 rounded-lg ${versionType === 'major' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-400 group-hover:bg-purple-50 group-hover:text-purple-600'}`}><GitMerge size={20} /></div>{versionType === 'major' && <div className="bg-purple-600 text-white rounded-full p-0.5"><Check size={14} /></div>}</div><span className={`block font-bold text-sm mb-1 ${versionType === 'major' ? 'text-purple-900 dark:text-purple-100' : 'text-gray-700 dark:text-gray-200'}`}>Nâng cấp lớn (Major)</span><p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">Thay đổi nội dung, lưu đồ, biểu mẫu hoặc quy trình vận hành.</p></button></div></div>
           <div><label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-2">Nội dung cập nhật / Lý do <span className="text-red-500">*</span></label><textarea className="w-full p-4 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 ring-primary/20 focus:border-primary outline-none text-sm min-h-[120px] transition-shadow placeholder:text-gray-400 shadow-sm dark:text-gray-200" placeholder="Mô tả chi tiết các thay đổi so với phiên bản trước để lưu vào lịch sử..." value={versionReason} onChange={(e) => setVersionReason(e.target.value)}/></div>
           <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl flex gap-3 items-start border border-amber-200 dark:border-amber-800/30"><AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-500" /><div><p className="text-xs font-bold text-amber-800 dark:text-amber-400 mb-1">Lưu ý quan trọng</p><p className="text-xs text-amber-700 dark:text-amber-500 leading-relaxed">Sau khi xác nhận, tài liệu phiên bản cũ ({selectedDoc?.phien_ban}) sẽ chuyển sang trạng thái "Hết hiệu lực". Một bản thảo mới sẽ được tạo ra để bạn bắt đầu chỉnh sửa.</p></div></div>
        </div>
      </Modal>
    </div>
  );
};
