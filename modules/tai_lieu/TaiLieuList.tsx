
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TaiLieu, TrangThaiTaiLieu, MasterDataState, NhanSu, HoSo, ColumnDefinition, DinhKem } from '../../types';
import { DataTable } from '../../components/DataTable';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { TaiLieuForm } from './TaiLieuForm';
import { DocumentTimeline } from '../../components/DocumentTimeline';
import { AIChatWidget } from '../../components/AIChatWidget';
import { Plus, Filter, FileText, Download, Eye, Pencil, Send, FileUp, Zap, Check, GitMerge, AlertTriangle, ChevronRight, X, Clock, File, Trash2, CornerDownRight, Layers, List, Search, FileType, FileSpreadsheet, Lock, History, Hash, Calendar, Shield, UserCheck, Briefcase, Tag, RefreshCw, Paperclip, ExternalLink, Archive, Info, LayoutDashboard, Bookmark, FileBadge } from 'lucide-react';
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
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [versionType, setVersionType] = useState<'minor' | 'major'>('minor');
  const [versionReason, setVersionReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const dialog = useDialog();
  const isAdmin = currentUser.roles.includes('QUAN_TRI');

  useEffect(() => {
    if (initialFilters) setFilters(prev => ({ ...prev, ...initialFilters }));
  }, [initialFilters]);

  const getUserName = (id: string) => masterData.nhanSu.find(u => u.id === id)?.ho_ten || '---';
  const getDept = (userId: string) => masterData.nhanSu.find(u => u.id === userId)?.phong_ban || '---';

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
    if (isTreeView) return sortDataHierarchy(result);
    return result;
  }, [data, filters, isTreeView, masterData.nhanSu]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await dialog.confirm('Hành động này không thể hoàn tác! Bạn có chắc muốn xóa tài liệu này không?', { title: 'Xác nhận xóa tài liệu', type: 'error', confirmLabel: 'Xóa ngay' });
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
        key: 'ten_tai_lieu', header: 'Tên tài liệu', visible: true, 
        render: (val, doc) => {
            const level = isTreeView ? getLevel(doc, data) : 0;
            const file = doc.dinh_kem?.[0];
            return (
                <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 24}px` }}>
                    {level > 0 && <CornerDownRight size={16} className="text-gray-400 shrink-0" />}
                    {file && (<a href={file.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="shrink-0 hover:scale-110 transition-transform" title={`Mở file: ${file.ten_file}`}>{file.loai === 'pdf' ? <FileType size={18} className="text-red-600" /> : file.loai === 'excel' ? <FileSpreadsheet size={18} className="text-green-600" /> : file.loai === 'doc' ? <FileText size={18} className="text-blue-600" /> : <File size={18} className="text-gray-400" />}</a>)}
                    <span className={`font-medium line-clamp-1 ${level === 0 ? 'text-gray-900 dark:text-white font-bold' : 'text-gray-700 dark:text-gray-300'}`} title={val as string}>{val}</span>
                </div>
            );
        }
    },
    { key: 'phien_ban', header: 'Ver', visible: true, render: (val) => <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-xs font-mono dark:text-gray-300">{val}</span> },
    { key: 'id_nguoi_soan_thao', header: 'Bộ phận', visible: true, render: (val) => <span className="text-xs dark:text-gray-300">{getDept(val as string)}</span> },
    { key: 'ngay_ban_hanh', header: 'Ngày BH', visible: true, render: (val) => <span className="text-xs dark:text-gray-300">{val ? format(new Date(val), 'dd/MM/yyyy') : '--'}</span> },
    { key: 'trang_thai', header: 'Trạng thái', visible: true, render: (val) => <Badge status={val as TrangThaiTaiLieu} /> },
    { key: 'id', header: 'Thao tác', visible: true, render: (_, item) => (<div className="flex items-center gap-1"><Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleViewDetail(item); }} title="Xem chi tiết"><Eye size={16} className="text-gray-500 hover:text-blue-500" /></Button><Button variant="ghost" size="icon" onClick={(e) => handleDelete(item.id, e)} title="Xóa tài liệu"><Trash2 size={16} className="text-gray-500 hover:text-red-500" /></Button></div>)}
  ];

  const handleAddNew = () => { setSelectedDoc(null); setViewMode('form'); };
  const handleViewDetail = (doc: TaiLieu) => { setSelectedDoc(doc); setViewMode('detail'); };
  const handleCloseDrawer = () => { setViewMode('list'); setTimeout(() => setSelectedDoc(null), 200); };

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

    if (!docData.id) {
       newDoc.lich_su?.push({ id: `H${Date.now()}`, nguoi_thuc_hien: currentUser.ho_ten, hanh_dong: 'TAO_MOI', thoi_gian: new Date().toISOString(), ghi_chu: 'Khởi tạo tài liệu' });
    } else {
        newDoc.lich_su?.push({ id: `H${Date.now()}`, nguoi_thuc_hien: currentUser.ho_ten, hanh_dong: 'CAP_NHAT', thoi_gian: new Date().toISOString(), ghi_chu: 'Cập nhật thông tin' });
    }

    try {
      await upsertDocument(newDoc);
      if (docData.id) onUpdate(data.map(d => d.id === newDoc.id ? newDoc : d)); else onUpdate([newDoc, ...data]);
      handleCloseDrawer();
      dialog.alert('Lưu tài liệu thành công!', { type: 'success' });
    } catch (e) { dialog.alert('Lỗi lưu tài liệu! Vui lòng thử lại.', { type: 'error' }); } finally { setIsLoading(false); }
  };

  const handleSendRequest = async () => {
    if (!selectedDoc) return;
    setIsLoading(true);
    const updatedDoc: TaiLieu = { ...selectedDoc, trang_thai: TrangThaiTaiLieu.CHO_DUYET, lich_su: [...(selectedDoc.lich_su || []), { id: `H${Date.now()}`, nguoi_thuc_hien: currentUser.ho_ten, hanh_dong: 'GUI_DUYET', thoi_gian: new Date().toISOString(), ghi_chu: 'Gửi yêu cầu phê duyệt', trang_thai_cu: selectedDoc.trang_thai, trang_thai_moi: TrangThaiTaiLieu.CHO_DUYET }] };
    try {
      await upsertDocument(updatedDoc);
      onUpdate(data.map(d => d.id === updatedDoc.id ? updatedDoc : d));
      setSelectedDoc(updatedDoc);
      dialog.alert('Đã gửi yêu cầu phê duyệt thành công!', { type: 'success' });
    } catch (e) { dialog.alert('Lỗi gửi yêu cầu phê duyệt.', { type: 'error' }); } finally { setIsLoading(false); }
  };

  const handleVersionUpClick = () => { setShowVersionModal(true); setVersionReason(''); setVersionType('minor'); };
  const getNextVersion = (currentVer: string, type: 'minor' | 'major') => { const parts = currentVer.split('.'); const major = parseInt(parts[0]) || 1; const minor = parseInt(parts[1]) || 0; return type === 'major' ? `${major + 1}.0` : `${major}.${minor + 1}`; };

  const confirmVersionUp = async () => {
    if (!selectedDoc || !versionReason.trim()) { dialog.alert("Vui lòng nhập lý do nâng cấp!", { type: 'warning' }); return; }
    setIsLoading(true);
    const oldDoc: TaiLieu = { ...selectedDoc, trang_thai: TrangThaiTaiLieu.HET_HIEU_LUC, lich_su: [...(selectedDoc.lich_su || []), { id: `H${Date.now()}_OLD`, nguoi_thuc_hien: currentUser.ho_ten, hanh_dong: 'HUY_BO', thoi_gian: new Date().toISOString(), ghi_chu: `Hết hiệu lực do có phiên bản mới: ${versionReason}` }] };
    const newVersion = getNextVersion(selectedDoc.phien_ban, versionType);
    const newDoc: TaiLieu = { ...selectedDoc, id: `TL${Date.now()}`, phien_ban: newVersion, trang_thai: TrangThaiTaiLieu.SOAN_THAO, ngay_ban_hanh: '', ngay_hieu_luc: '', lan_ban_hanh: selectedDoc.lan_ban_hanh + 1, lich_su: [{ id: `H${Date.now()}_NEW`, nguoi_thuc_hien: currentUser.ho_ten, hanh_dong: 'TAO_MOI', thoi_gian: new Date().toISOString(), ghi_chu: `Khởi tạo phiên bản ${newVersion} từ ${selectedDoc.phien_ban}. Lý do: ${versionReason}` }] };
    try {
        await upsertDocument(oldDoc); await upsertDocument(newDoc);
        onUpdate([...data.filter(d => d.id !== selectedDoc.id), oldDoc, newDoc]);
        setSelectedDoc(newDoc); setShowVersionModal(false); setViewMode('form');
        dialog.alert(`Đã nâng cấp lên phiên bản ${newVersion}`, { type: 'success' });
    } catch(e) { dialog.alert("Lỗi khi nâng phiên bản tài liệu.", { type: 'error' }); } finally { setIsLoading(false); }
  };

  const renderFilters = (
    <div className="flex items-center gap-2 w-full">
       <button onClick={() => setIsTreeView(!isTreeView)} className={`shrink-0 h-9 w-9 flex items-center justify-center rounded-lg border transition-all ${isTreeView ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300' : 'bg-white border-gray-200 text-gray-500 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`} title={isTreeView ? "Đang xem dạng cây" : "Đang xem danh sách"}>{isTreeView ? <Layers size={18} /> : <List size={18} />}</button>
       <div className="h-6 w-px bg-gray-200 dark:bg-slate-700 shrink-0 mx-1"></div>
       <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar min-w-0">
           <div className="relative group shrink-0"><select className="h-9 pl-9 pr-7 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-gray-700 dark:text-gray-200 outline-none focus:border-blue-500 appearance-none cursor-pointer hover:border-blue-400 transition-colors w-auto min-w-[120px] max-w-[180px] truncate" value={filters.trang_thai || ''} onChange={(e) => setFilters(prev => ({ ...prev, trang_thai: e.target.value || undefined }))}><option value="">Trạng thái: Tất cả</option><option value={TrangThaiTaiLieu.SOAN_THAO}>Đang soạn thảo</option><option value={TrangThaiTaiLieu.CHO_DUYET}>Chờ duyệt</option><option value={TrangThaiTaiLieu.DA_BAN_HANH}>Đã ban hành</option><option value={TrangThaiTaiLieu.HET_HIEU_LUC}>Hết hiệu lực</option></select><Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" /></div>
           <div className="relative group shrink-0"><select className="h-9 pl-9 pr-7 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-gray-700 dark:text-gray-200 outline-none focus:border-blue-500 appearance-none cursor-pointer hover:border-blue-400 transition-colors w-auto min-w-[120px] max-w-[180px] truncate" value={filters.bo_phan || ''} onChange={(e) => setFilters(prev => ({ ...prev, bo_phan: e.target.value || undefined }))}><option value="">Bộ phận: Tất cả</option>{masterData.boPhan.map(bp => (<option key={bp.id} value={bp.ten}>{bp.ten}</option>))}</select><Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" /></div>
           <div className="relative group shrink-0"><select className="h-9 pl-9 pr-7 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-gray-700 dark:text-gray-200 outline-none focus:border-blue-500 appearance-none cursor-pointer hover:border-blue-400 transition-colors w-auto min-w-[120px] max-w-[180px] truncate" value={filters.loai_tai_lieu || ''} onChange={(e) => setFilters(prev => ({ ...prev, loai_tai_lieu: e.target.value || undefined }))}><option value="">Loại: Tất cả</option>{masterData.loaiTaiLieu.map(lt => (<option key={lt.id} value={lt.ten}>{lt.ten}</option>))}</select><FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" /></div>
       </div>
       {(filters.trang_thai || filters.bo_phan || filters.loai_tai_lieu) && (<button onClick={() => setFilters({})} className="shrink-0 h-9 w-9 flex items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-all dark:bg-red-900/20 dark:border-red-900 dark:text-red-400 ml-1" title="Xóa tất cả bộ lọc"><X size={16} /></button>)}
    </div>
  );

  return (
    <div className="h-full flex flex-col animate-fade-in relative">
      <div className="flex-1 overflow-hidden h-full rounded-lg border border-gray-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
         <DataTable data={filteredData} columns={columns} onRowClick={handleViewDetail} filters={renderFilters} actions={<Button onClick={handleAddNew} leftIcon={<Plus size={16}/>} className="shadow-sm">Thêm mới</Button>} />
      </div>

      {(viewMode === 'form' || viewMode === 'detail') && createPortal(
        <div className="fixed inset-0 top-16 z-[50] flex justify-end">
           <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity animate-in fade-in duration-200" onClick={handleCloseDrawer}/>
           <div className="w-full max-w-7xl bg-white dark:bg-slate-950 h-full shadow-2xl relative animate-slide-in-right flex flex-col transition-colors border-l border-t border-gray-200 dark:border-slate-800">
              {viewMode === 'form' ? (
                 <TaiLieuForm initialData={selectedDoc} onSave={handleSaveDoc} onCancel={handleCloseDrawer} masterData={masterData} fullList={data} />
              ) : (
                 selectedDoc && (
                   <div className="flex flex-col h-full overflow-hidden relative bg-gray-50/50 dark:bg-slate-950">
                     
                     {/* --- 1. HERO HEADER (Re-designed) --- */}
                     <div className="sticky top-0 z-20 border-b border-gray-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shrink-0 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-5">
                            <div className="flex items-start gap-4">
                                <div className="hidden sm:flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/30">
                                    <FileBadge size={28} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge status={selectedDoc.trang_thai} />
                                        <span className="text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{selectedDoc.ma_tai_lieu}</span>
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{selectedDoc.ten_tai_lieu}</h2>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 self-end sm:self-center">
                                <Button variant="ghost" size="sm" onClick={() => setShowHistoryModal(true)} className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"><History size={18} /></Button>
                                <Button variant="ghost" size="sm" onClick={handleCloseDrawer} className="text-gray-400 hover:text-red-500"><X size={20} /></Button>
                            </div>
                        </div>
                     </div>

                     {/* --- 2. DOCUMENT CONTENT (Re-designed) --- */}
                     <div className="flex-1 overflow-y-auto p-6 pb-24 custom-scrollbar">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
                           
                           {/* LEFT: MAIN CONTENT */}
                           <div className="lg:col-span-2 space-y-8">
                              {/* Summary */}
                              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
                                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-3 mb-4">
                                      <Info size={18} className="text-blue-500"/> Nội dung & Phạm vi
                                  </h3>
                                  <div className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 leading-relaxed text-justify whitespace-pre-wrap">
                                      {selectedDoc.mo_ta_tom_tat || <span className="text-gray-400 italic">Chưa có mô tả chi tiết cho tài liệu này.</span>}
                                  </div>
                              </div>

                              {/* Files Grid */}
                              <div>
                                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide flex items-center gap-2 mb-4 px-1">
                                      <Paperclip size={18} className="text-orange-500"/> Tệp đính kèm ({selectedDoc.dinh_kem?.length || 0})
                                  </h3>
                                  {selectedDoc.dinh_kem && selectedDoc.dinh_kem.length > 0 ? (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                          {selectedDoc.dinh_kem.map(file => {
                                              const isRestricted = (file.loai === 'doc' || file.loai === 'excel') && !isAdmin;
                                              const icon = file.loai === 'pdf' ? <FileType className="text-red-500" size={24} /> : file.loai === 'excel' ? <FileSpreadsheet className="text-emerald-500" size={24} /> : file.loai === 'doc' ? <FileText className="text-blue-500" size={24} /> : <File className="text-gray-400" size={24} />;
                                              
                                              return (
                                                  <div key={file.id} className="relative flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-md hover:border-blue-300 transition-all group">
                                                      <div className="shrink-0 p-2 bg-gray-50 dark:bg-slate-800 rounded-lg">{icon}</div>
                                                      <div className="flex-1 min-w-0">
                                                          <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate mb-1" title={file.ten_file}>{file.ten_file}</p>
                                                          <div className="flex items-center gap-2 text-xs text-gray-400">
                                                              <span>{format(new Date(file.ngay_upload), 'dd/MM/yyyy')}</span>
                                                              {isRestricted && <span className="text-amber-500 flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 px-1.5 rounded"><Lock size={10} /> Protected</span>}
                                                          </div>
                                                      </div>
                                                      {!isRestricted && (<a href={file.url} target="_blank" rel="noreferrer" className="absolute inset-0 flex items-center justify-end pr-4 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-l from-white via-transparent to-transparent dark:from-slate-900 rounded-xl" title="Mở file"><ExternalLink size={20} className="text-blue-600 bg-white dark:bg-slate-800 p-1 rounded shadow-sm" /></a>)}
                                                  </div>
                                              );
                                          })}
                                      </div>
                                  ) : (
                                      <div className="text-center py-10 text-gray-400 text-sm bg-gray-50 dark:bg-slate-900 rounded-xl border border-dashed border-gray-200 dark:border-slate-800">Không có file đính kèm</div>
                                  )}
                              </div>
                           </div>

                           {/* RIGHT: METADATA */}
                           <div className="space-y-6">
                               {/* Key Info */}
                               <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
                                   <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50">
                                       <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200 flex items-center gap-2"><LayoutDashboard size={16} className="text-purple-500" /> Thông tin chung</h4>
                                   </div>
                                   <div className="p-5 space-y-4">
                                       <div className="flex justify-between"><span className="text-xs text-gray-500 uppercase font-medium">Loại</span><span className="text-sm font-medium text-gray-900 dark:text-gray-100 text-right">{selectedDoc.loai_tai_lieu}</span></div>
                                       <div className="flex justify-between"><span className="text-xs text-gray-500 uppercase font-medium">Lĩnh vực</span><span className="text-sm font-medium text-gray-900 dark:text-gray-100 text-right">{selectedDoc.linh_vuc || '---'}</span></div>
                                       <div className="flex justify-between"><span className="text-xs text-gray-500 uppercase font-medium">Bộ phận</span><span className="text-sm font-medium text-gray-900 dark:text-gray-100 text-right">{getDept(selectedDoc.id_nguoi_soan_thao)}</span></div>
                                       {selectedDoc.tieu_chuan && selectedDoc.tieu_chuan.length > 0 && (
                                           <div className="pt-2 border-t border-gray-100 dark:border-slate-800">
                                               <span className="text-xs text-gray-500 uppercase font-medium block mb-2">Tiêu chuẩn áp dụng</span>
                                               <div className="flex flex-wrap gap-1.5">{selectedDoc.tieu_chuan.map(t => (<span key={t} className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"><Tag size={10} /> {t}</span>))}</div>
                                           </div>
                                       )}
                                   </div>
                               </div>

                               {/* Control Info */}
                               <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
                                   <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50">
                                       <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200 flex items-center gap-2"><Shield size={16} className="text-emerald-500" /> Kiểm soát</h4>
                                   </div>
                                   <div className="p-5 space-y-4">
                                       <div className="grid grid-cols-2 gap-4 text-center">
                                           <div className="p-2 bg-gray-50 dark:bg-slate-800 rounded-lg"><p className="text-[10px] text-gray-500 uppercase mb-1">Ngày ban hành</p><p className="text-sm font-bold">{selectedDoc.ngay_ban_hanh ? format(new Date(selectedDoc.ngay_ban_hanh), 'dd/MM/yyyy') : '--'}</p></div>
                                           <div className="p-2 bg-gray-50 dark:bg-slate-800 rounded-lg"><p className="text-[10px] text-gray-500 uppercase mb-1">Ngày hiệu lực</p><p className="text-sm font-bold text-blue-600 dark:text-blue-400">{selectedDoc.ngay_hieu_luc ? format(new Date(selectedDoc.ngay_hieu_luc), 'dd/MM/yyyy') : '--'}</p></div>
                                       </div>
                                       {selectedDoc.ngay_ra_soat_tiep_theo && (
                                           <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-100 dark:border-orange-800/50">
                                               <div className="flex items-center gap-2"><RefreshCw size={14} className="text-orange-600"/><span className="text-xs font-bold text-orange-700 dark:text-orange-400 uppercase">Rà soát tiếp theo</span></div>
                                               <div className="text-right"><p className="text-sm font-bold text-orange-700 dark:text-orange-400">{format(new Date(selectedDoc.ngay_ra_soat_tiep_theo), 'dd/MM/yyyy')}</p><p className="text-[10px] text-orange-600/80">Chu kỳ: {selectedDoc.chu_ky_ra_soat} tháng</p></div>
                                           </div>
                                       )}
                                   </div>
                               </div>

                               {/* Matrix */}
                               <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
                                   <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50">
                                       <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200 flex items-center gap-2"><UserCheck size={16} className="text-blue-500" /> Ma trận trách nhiệm</h4>
                                   </div>
                                   <div className="p-5 space-y-4">
                                       <div className="relative pl-4 border-l-2 border-gray-200 dark:border-slate-700 space-y-6">
                                           <div className="relative"><div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-gray-300 dark:bg-slate-600 border-2 border-white dark:border-slate-900"></div><p className="text-xs text-gray-500 uppercase font-bold">Soạn thảo</p><p className="text-sm font-medium">{getUserName(selectedDoc.id_nguoi_soan_thao)}</p></div>
                                           <div className="relative"><div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-blue-300 dark:bg-blue-700 border-2 border-white dark:border-slate-900"></div><p className="text-xs text-gray-500 uppercase font-bold">Xem xét</p><p className="text-sm font-medium">{getUserName(selectedDoc.id_nguoi_xem_xet)}</p></div>
                                           <div className="relative"><div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-green-500 dark:bg-green-600 border-2 border-white dark:border-slate-900"></div><p className="text-xs text-gray-500 uppercase font-bold">Phê duyệt</p><p className="text-sm font-medium">{getUserName(selectedDoc.id_nguoi_phe_duyet)}</p></div>
                                       </div>
                                   </div>
                               </div>
                           </div>
                        </div>
                     </div>

                     {/* --- 3. FOOTER ACTIONS --- */}
                     <div className="p-4 border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 sticky bottom-0 z-20 flex justify-end gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
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
                    
                    <AIChatWidget document={selectedDoc} />
                   </div>
                 )
              )}
           </div>
        </div>,
        document.body
      )}

      {/* Other Modals (History, Version) keep same as before, simplified here for brevity but logic remains */}
      <Modal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} title="Lịch sử hoạt động" size="lg" footer={<Button onClick={() => setShowHistoryModal(false)}>Đóng</Button>}>
        <div className="p-6"><DocumentTimeline history={selectedDoc?.lich_su || []} /></div>
      </Modal>

      <Modal isOpen={showVersionModal} onClose={() => setShowVersionModal(false)} title="Nâng phiên bản tài liệu" size="lg" footer={<><Button variant="ghost" onClick={() => setShowVersionModal(false)}>Hủy bỏ</Button><Button onClick={confirmVersionUp} leftIcon={<FileUp size={16} />}>Xác nhận & Tạo bản thảo</Button></>}>
        <div className="space-y-6 p-6">
           {/* Re-use previous version modal content */}
           {selectedDoc && (
             <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800 p-5 rounded-xl flex items-center justify-between border border-blue-100 dark:border-slate-700 relative overflow-hidden shadow-sm">
               <div className="relative z-10"><p className="text-[10px] text-blue-600 dark:text-blue-300 font-bold uppercase tracking-wider mb-1">Hiện tại</p><p className="text-3xl font-mono font-bold text-blue-700 dark:text-blue-400">{selectedDoc.phien_ban}</p></div>
               <div className="flex items-center text-blue-300 dark:text-slate-600"><ChevronRight size={24} /></div>
               <div className="relative z-10 text-right"><p className="text-[10px] text-green-600 dark:text-green-300 font-bold uppercase tracking-wider mb-1">Mới</p><p className="text-3xl font-mono font-bold text-green-700 dark:text-green-400">{getNextVersion(selectedDoc.phien_ban, versionType)}</p></div>
             </div>
           )}
           <div>
              <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-3">Chọn loại nâng cấp</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <button onClick={() => setVersionType('minor')} className={`p-4 rounded-xl border-2 text-left transition-all ${versionType === 'minor' ? 'bg-blue-50 border-blue-500' : 'bg-white border-gray-100'}`}><span className="block font-bold text-sm mb-1">Nâng cấp nhỏ (Minor)</span><p className="text-xs text-gray-500">Sửa lỗi chính tả, format.</p></button>
                 <button onClick={() => setVersionType('major')} className={`p-4 rounded-xl border-2 text-left transition-all ${versionType === 'major' ? 'bg-purple-50 border-purple-500' : 'bg-white border-gray-100'}`}><span className="block font-bold text-sm mb-1">Nâng cấp lớn (Major)</span><p className="text-xs text-gray-500">Thay đổi quy trình, nội dung lớn.</p></button>
              </div>
           </div>
           <div><label className="block text-sm font-bold text-gray-800 mb-2">Lý do cập nhật <span className="text-red-500">*</span></label><textarea className="w-full p-4 rounded-xl border border-gray-300 outline-none text-sm min-h-[100px]" value={versionReason} onChange={(e) => setVersionReason(e.target.value)} placeholder="Nhập lý do..."/></div>
        </div>
      </Modal>
    </div>
  );
};
