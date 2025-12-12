
import React, { useState, useMemo, useEffect } from 'react';
import { TaiLieu, TrangThaiTaiLieu, MasterDataState, NhanSu, HoSo, ColumnDefinition } from '../../types';
import { DataTable } from '../../components/DataTable';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { TaiLieuForm } from './TaiLieuForm';
import { DocumentTimeline } from '../../components/DocumentTimeline';
import { AIChatBox } from '../../components/AIChatBox';
import { Plus, Filter, FileText, Download, Eye, Pencil, Send, FileUp, Zap, Check, GitMerge, AlertTriangle, ChevronRight, X, Clock, File } from 'lucide-react';
import { upsertDocument } from '../../services/supabaseService';
import { format } from 'date-fns';

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
  const [selectedDoc, setSelectedDoc] = useState<TaiLieu | null>(null);
  const [filters, setFilters] = useState<{ trang_thai?: string; bo_phan?: string }>(initialFilters || {});
  
  // Modal states
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [versionType, setVersionType] = useState<'minor' | 'major'>('minor');
  const [versionReason, setVersionReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (initialFilters) setFilters(initialFilters);
  }, [initialFilters]);

  const filteredData = useMemo(() => {
    return data.filter(doc => {
      if (filters.trang_thai && doc.trang_thai !== filters.trang_thai) return false;
      if (filters.bo_phan && doc.bo_phan_soan_thao !== filters.bo_phan) return false;
      return true;
    });
  }, [data, filters]);

  const columns: ColumnDefinition<TaiLieu>[] = [
    { key: 'ma_tai_lieu', header: 'Mã tài liệu', visible: true, render: (val) => <span className="font-mono font-bold text-primary">{val}</span> },
    { key: 'ten_tai_lieu', header: 'Tên tài liệu', visible: true, render: (val) => <span className="font-medium text-gray-800 dark:text-gray-200 line-clamp-1" title={val as string}>{val}</span> },
    { key: 'phien_ban', header: 'Ver', visible: true, render: (val) => <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-xs font-mono">{val}</span> },
    { key: 'loai_tai_lieu', header: 'Loại', visible: true, render: (val) => <span className="text-xs text-gray-500">{val}</span> },
    { key: 'bo_phan_soan_thao', header: 'Bộ phận', visible: true, render: (val) => <span className="text-xs">{val}</span> },
    { key: 'ngay_ban_hanh', header: 'Ngày BH', visible: true, render: (val) => <span className="text-xs">{val ? format(new Date(val), 'dd/MM/yyyy') : '--'}</span> },
    { key: 'trang_thai', header: 'Trạng thái', visible: true, render: (val) => <Badge status={val as TrangThaiTaiLieu} /> },
    { key: 'id', header: '', visible: true, render: (_, item) => (
      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleViewDetail(item); }}>
        <Eye size={16} className="text-gray-500" />
      </Button>
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
    // Không reset selectedDoc ngay để tránh giật UI khi đóng drawer
    setTimeout(() => setSelectedDoc(null), 200);
  };

  const handleSaveDoc = async (docData: Partial<TaiLieu>) => {
    setIsLoading(true);
    // Simple logic to create new or update
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
       // Create log
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
      // Sau khi lưu xong thì đóng drawer
      handleCloseDrawer();
    } catch (e) {
      alert("Lỗi lưu tài liệu");
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
    } catch (e) {
      alert("Lỗi gửi duyệt");
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
        alert("Vui lòng nhập lý do nâng cấp!");
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
        setViewMode('form'); // Switch to edit mode for new draft
    } catch(e) {
        alert("Lỗi nâng phiên bản");
    } finally {
        setIsLoading(false);
    }
  };

  const renderFilters = (
    <div className="flex gap-2">
       {/* Filter UI implementation if needed */}
       <Button variant="outline" size="sm" onClick={() => setFilters({})} className="h-9">
         Xóa bộ lọc
       </Button>
    </div>
  );

  return (
    <div className="h-full flex flex-col animate-fade-in -mx-4 md:mx-0 relative">
      {/* 1. Main List Area (Always visible at bottom level) */}
      <div className="flex-1 overflow-hidden h-full rounded-lg border border-gray-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
         <DataTable 
            title="Danh sách Tài liệu" 
            data={filteredData} 
            columns={columns} 
            onRowClick={handleViewDetail}
            filters={renderFilters}
            actions={<Button onClick={handleAddNew} leftIcon={<Plus size={16}/>} className="shadow-sm">Thêm mới</Button>}
         />
      </div>

      {/* 2. Drawer for FORM or DETAIL */}
      {(viewMode === 'form' || viewMode === 'detail') && (
        <div className="fixed inset-0 z-50 flex justify-end">
           {/* Backdrop */}
           <div 
             className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity animate-in fade-in duration-200" 
             onClick={handleCloseDrawer}
           />
           
           {/* Slide-over Panel */}
           <div className="w-full max-w-4xl bg-white dark:bg-slate-950 h-full shadow-2xl relative animate-slide-in-right flex flex-col transition-colors border-l border-gray-200 dark:border-slate-800">
              
              {/* === VIEW MODE: FORM (ADD/EDIT) === */}
              {viewMode === 'form' ? (
                 <TaiLieuForm 
                   initialData={selectedDoc} 
                   onSave={handleSaveDoc} 
                   onCancel={handleCloseDrawer} 
                   masterData={masterData}
                   fullList={data}
                 />
              ) : (
              /* === VIEW MODE: DETAIL === */
                 selectedDoc && (
                   <div className="flex flex-col h-full overflow-hidden">
                     {/* Header Detail */}
                     <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 shrink-0">
                        <div>
                           <div className="flex items-center gap-2 mb-2">
                              <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded text-xs font-mono font-bold border border-blue-200 dark:border-blue-800">{selectedDoc.ma_tai_lieu}</span>
                              <Badge status={selectedDoc.trang_thai} />
                           </div>
                           <h2 className="text-xl font-bold text-gray-800 dark:text-white leading-tight line-clamp-1">{selectedDoc.ten_tai_lieu}</h2>
                        </div>
                        <Button variant="ghost" size="icon" onClick={handleCloseDrawer}>
                           <X size={20} />
                        </Button>
                     </div>

                     <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Summary Info Bar */}
                        <div className="flex flex-wrap gap-6 text-sm text-gray-600 dark:text-gray-400 pb-4 border-b border-gray-100 dark:border-slate-800">
                           <div className="flex items-center gap-2"><Clock size={16} /> Phiên bản: <span className="font-bold text-gray-900 dark:text-gray-200">{selectedDoc.phien_ban}</span></div>
                           <div className="flex items-center gap-2"><FileText size={16} /> Loại: <span className="font-bold text-gray-900 dark:text-gray-200">{selectedDoc.loai_tai_lieu}</span></div>
                           <div className="flex items-center gap-2"><Filter size={16} /> Bộ phận: <span className="font-bold text-gray-900 dark:text-gray-200">{selectedDoc.bo_phan_soan_thao}</span></div>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                           {/* Main Info */}
                           <div className="xl:col-span-2 space-y-6">
                              <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
                                 <h3 className="text-sm font-bold text-gray-500 uppercase mb-4">Thông tin chi tiết</h3>
                                 <div className="space-y-4">
                                    <div>
                                       <label className="text-xs text-gray-400 uppercase font-bold block mb-1">Mô tả tóm tắt</label>
                                       <p className="text-gray-800 dark:text-gray-200 leading-relaxed bg-gray-50 dark:bg-slate-800 p-3 rounded-lg border border-gray-100 dark:border-slate-700">
                                          {selectedDoc.mo_ta_tom_tat || 'Chưa có mô tả'}
                                       </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                       <div>
                                          <label className="text-xs text-gray-400 uppercase font-bold block mb-1">Ngày ban hành</label>
                                          <p className="font-medium">{selectedDoc.ngay_ban_hanh ? format(new Date(selectedDoc.ngay_ban_hanh), 'dd/MM/yyyy') : '---'}</p>
                                       </div>
                                       <div>
                                          <label className="text-xs text-gray-400 uppercase font-bold block mb-1">Ngày hiệu lực</label>
                                          <p className="font-medium">{selectedDoc.ngay_hieu_luc ? format(new Date(selectedDoc.ngay_hieu_luc), 'dd/MM/yyyy') : '---'}</p>
                                       </div>
                                    </div>
                                    <div>
                                       <label className="text-xs text-gray-400 uppercase font-bold block mb-1">Tiêu chuẩn áp dụng</label>
                                       <div className="flex flex-wrap gap-2">
                                          {selectedDoc.tieu_chuan?.length ? selectedDoc.tieu_chuan.map(t => (
                                             <span key={t} className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded text-xs font-bold border border-indigo-100 dark:border-indigo-800">{t}</span>
                                          )) : <span className="text-gray-400 text-sm">Không có</span>}
                                       </div>
                                    </div>
                                    <div>
                                       <label className="text-xs text-gray-400 uppercase font-bold block mb-1">File đính kèm</label>
                                       {selectedDoc.dinh_kem && selectedDoc.dinh_kem.length > 0 ? (
                                          <div className="space-y-2">
                                             {selectedDoc.dinh_kem.map(file => (
                                                <a key={file.id} href={file.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors group">
                                                   <div className="p-2 bg-gray-100 dark:bg-slate-800 rounded text-gray-500 group-hover:text-blue-500"><File size={20} /></div>
                                                   <div className="flex-1 overflow-hidden">
                                                      <p className="text-sm font-medium truncate text-blue-600 dark:text-blue-400 group-hover:underline">{file.ten_file}</p>
                                                      <p className="text-xs text-gray-400">{format(new Date(file.ngay_upload), 'dd/MM/yyyy HH:mm')}</p>
                                                   </div>
                                                   <Download size={16} className="text-gray-400 group-hover:text-gray-600" />
                                                </a>
                                             ))}
                                          </div>
                                       ) : <p className="text-sm text-gray-500 italic">Không có file đính kèm</p>}
                                    </div>
                                 </div>
                              </div>

                              <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
                                  <h3 className="text-sm font-bold text-gray-500 uppercase mb-4">Lịch sử hoạt động</h3>
                                  <DocumentTimeline history={selectedDoc.lich_su || []} />
                              </div>
                           </div>

                           {/* Sidebar Info (Chat & Actions) */}
                           <div className="space-y-6">
                               <AIChatBox document={selectedDoc} />
                               
                               {/* Related Records (Simple list) */}
                               <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
                                  <h3 className="text-sm font-bold text-gray-500 uppercase mb-4">Hồ sơ liên quan</h3>
                                  {records.filter(r => r.ma_tai_lieu_lien_quan === selectedDoc.ma_tai_lieu).length > 0 ? (
                                     <div className="space-y-2">
                                        {records.filter(r => r.ma_tai_lieu_lien_quan === selectedDoc.ma_tai_lieu).map(rec => (
                                           <div key={rec.id} className="p-2 border rounded text-sm hover:bg-gray-50 dark:hover:bg-slate-800">
                                              <div className="font-bold text-gray-800 dark:text-gray-200 truncate">{rec.tieu_de}</div>
                                              <div className="flex justify-between mt-1 text-xs text-gray-500">
                                                 <span>{rec.ma_ho_so}</span>
                                                 <span>{format(new Date(rec.ngay_tao), 'dd/MM/yyyy')}</span>
                                              </div>
                                           </div>
                                        ))}
                                     </div>
                                  ) : <p className="text-sm text-gray-400 italic">Chưa có hồ sơ nào.</p>}
                               </div>
                           </div>
                        </div>
                     </div>

                     {/* Sticky Action Bar */}
                     <div className="p-6 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 sticky bottom-0 grid grid-cols-2 gap-3 z-10 shrink-0">
                       {(selectedDoc.trang_thai === TrangThaiTaiLieu.SOAN_THAO) ? (
                           <>
                             <Button variant="secondary" onClick={() => setViewMode('form')}><Pencil size={16} className="mr-2" /> Sửa</Button>
                             <Button onClick={handleSendRequest} className="bg-blue-600 hover:bg-blue-700 text-white" isLoading={isLoading} leftIcon={<Send size={16} />}>Gửi duyệt</Button>
                           </>
                       ) : (
                           <>
                             <Button className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm border border-transparent" onClick={handleVersionUpClick} leftIcon={<FileUp size={16} />}>Nâng phiên bản</Button>
                             <Button variant="secondary" onClick={() => setViewMode('form')}><Pencil size={16} className="mr-2" /> Sửa thông tin</Button>
                           </>
                       )}
                    </div>
                   </div>
                 )
              )}
           </div>
        </div>
      )}

      {/* Version Upgrade Modal */}
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
                 className="w-full p-4 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 ring-primary/20 focus:border-primary outline-none text-sm min-h-[120px] transition-shadow placeholder:text-gray-400 shadow-sm" 
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
