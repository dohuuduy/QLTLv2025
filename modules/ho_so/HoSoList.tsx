
import React, { useState, useMemo } from 'react';
import { DataTable } from '../../components/DataTable';
import { HoSo, ColumnDefinition, TrangThaiHoSo, MasterDataState, NhanSu, TaiLieu } from '../../types';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { format, addMonths, isPast, differenceInDays } from 'date-fns';
import { Archive, Plus, Trash2, Clock, MapPin, ShieldAlert, FileBox, Calendar, HardDrive, Hash, AlignLeft, Link as LinkIcon, Filter, X, Database } from 'lucide-react';
import { upsertRecord, deleteRecord } from '../../services/supabaseService';

interface HoSoListProps {
  masterData: MasterDataState;
  currentUser: NhanSu;
  data: HoSo[];
  onUpdate: (newData: HoSo[]) => void;
  documents: TaiLieu[];
}

export const HoSoList: React.FC<HoSoListProps> = ({ masterData, currentUser, data, onUpdate, documents }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<HoSo>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Filter State
  const [filters, setFilters] = useState<{ 
      trang_thai?: string; 
      phong_ban?: string; 
      dang_luu_tru?: string;
  }>({});

  const docOptions = useMemo(() => {
    return documents.map(d => ({
        value: d.ma_tai_lieu,
        label: d.ten_tai_lieu,
        subLabel: d.ma_tai_lieu
    }));
  }, [documents]);

  // --- FILTER LOGIC ---
  const filteredData = useMemo(() => {
    return data.filter(item => {
        // Filter by Status
        if (filters.trang_thai) {
            // Logic tính trạng thái động (Sắp hết hạn/Chờ hủy) nếu cần khớp chính xác
            let currentStatus = item.trang_thai;
            if (item.ngay_het_han && currentStatus === TrangThaiHoSo.LUU_TRU) {
                const daysLeft = differenceInDays(new Date(item.ngay_het_han), new Date());
                if (daysLeft < 0) currentStatus = TrangThaiHoSo.CHO_HUY;
                else if (daysLeft < 30) currentStatus = TrangThaiHoSo.SAP_HET_HAN;
            }
            if (currentStatus !== filters.trang_thai) return false;
        }

        // Filter by Department
        if (filters.phong_ban && item.phong_ban !== filters.phong_ban) return false;

        // Filter by Storage Type
        if (filters.dang_luu_tru && item.dang_luu_tru !== filters.dang_luu_tru) return false;

        return true;
    });
  }, [data, filters]);

  const handleAddNew = () => {
    setEditingItem({
      ma_ho_so: `HS-${Date.now().toString().slice(-6)}`,
      ngay_tao: format(new Date(), 'yyyy-MM-dd'),
      thoi_gian_luu_tru: 12,
      trang_thai: TrangThaiHoSo.LUU_TRU,
      dang_luu_tru: 'BAN_CUNG',
      nguoi_tao: currentUser.ho_ten,
      phong_ban: currentUser.phong_ban
    });
    setIsModalOpen(true);
  };

  const handleEdit = (item: HoSo) => {
    setEditingItem({ ...item });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingItem.tieu_de || !editingItem.ngay_tao) {
        alert("Vui lòng nhập tiêu đề và ngày lập hồ sơ!");
        return;
    }

    setIsLoading(true);
    // Calculate Expiry Date
    let expiryDate = '';
    if (editingItem.thoi_gian_luu_tru !== undefined && editingItem.thoi_gian_luu_tru > 0) {
       const start = new Date(editingItem.ngay_tao);
       expiryDate = format(addMonths(start, editingItem.thoi_gian_luu_tru), 'yyyy-MM-dd');
    }

    const newItem: HoSo = {
      ...editingItem,
      id: editingItem.id || `HS-${Date.now()}`,
      ngay_het_han: expiryDate,
      trang_thai: (expiryDate && isPast(new Date(expiryDate))) ? TrangThaiHoSo.CHO_HUY : (editingItem.trang_thai || TrangThaiHoSo.LUU_TRU)
    } as HoSo;

    try {
        await upsertRecord(newItem);
        if (editingItem.id) {
           onUpdate(data.map(item => item.id === newItem.id ? newItem : item));
        } else {
           onUpdate([newItem, ...data]);
        }
        setIsModalOpen(false);
    } catch (error) {
        alert("Lỗi khi lưu hồ sơ!");
    } finally {
        setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
     e.stopPropagation();
     if(window.confirm('Xác nhận tiêu hủy hồ sơ này khỏi danh sách và Database?')) {
        try {
            await deleteRecord(id);
            onUpdate(data.filter(i => i.id !== id));
        } catch (error) {
            alert("Lỗi khi xóa hồ sơ!");
        }
     }
  }

  const getStatusBadge = (item: HoSo) => {
     let status = item.trang_thai;
     if (item.ngay_het_han && status === TrangThaiHoSo.LUU_TRU) {
        const today = new Date();
        const expiry = new Date(item.ngay_het_han);
        const daysLeft = differenceInDays(expiry, today);
        if (daysLeft < 0) status = TrangThaiHoSo.CHO_HUY;
        else if (daysLeft < 30) status = TrangThaiHoSo.SAP_HET_HAN;
     }

     switch(status) {
       case TrangThaiHoSo.LUU_TRU: return <span className="px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-bold border border-green-200 whitespace-nowrap">Đang lưu trữ</span>;
       case TrangThaiHoSo.SAP_HET_HAN: return <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-700 text-xs font-bold border border-yellow-200 flex items-center gap-1 whitespace-nowrap"><Clock size={12}/> Sắp hết hạn</span>;
       case TrangThaiHoSo.CHO_HUY: return <span className="px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-bold border border-red-200 flex items-center gap-1 whitespace-nowrap"><ShieldAlert size={12}/> Chờ tiêu hủy</span>;
       case TrangThaiHoSo.DA_HUY: return <span className="px-2 py-1 rounded bg-gray-200 text-gray-500 text-xs font-bold border border-gray-300 decoration-slice whitespace-nowrap">Đã hủy</span>;
       default: return null;
     }
  };

  const columns: ColumnDefinition<HoSo>[] = useMemo(() => [
    { key: 'ma_ho_so', header: 'Mã hồ sơ', visible: true, render: (val) => <span className="font-mono text-blue-600 dark:text-blue-400 font-bold text-xs">{val}</span> },
    { key: 'tieu_de', header: 'Tên hồ sơ', visible: true, render: (val) => <span className="font-medium text-gray-800 dark:text-gray-200 line-clamp-1" title={val}>{val}</span> },
    { key: 'ma_tai_lieu_lien_quan', header: 'Theo quy trình', visible: true, render: (val) => val ? (<span className="text-xs bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded font-mono border border-indigo-100 dark:border-indigo-800">{val}</span>) : <span className="text-gray-400 text-xs">--</span> },
    { key: 'phong_ban', header: 'Bộ phận', visible: true, render: (val) => <span className="text-xs bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded text-gray-600 dark:text-gray-300 whitespace-nowrap">{val}</span> },
    { key: 'ngay_tao', header: 'Ngày lập', visible: true, render: (val) => val ? <span className="text-xs">{format(new Date(val), 'dd/MM/yyyy')}</span> : ''},
    { key: 'thoi_gian_luu_tru', header: 'Hạn lưu', visible: true, render: (val, item) => (<div className="text-xs"><div className="font-medium">{val === 0 ? 'Vĩnh viễn' : `${val} tháng`}</div>{item.ngay_het_han && <div className="text-[10px] text-gray-400">Đến: {format(new Date(item.ngay_het_han), 'dd/MM/yyyy')}</div>}</div>)},
    { key: 'vi_tri_luu_tru', header: 'Vị trí', visible: true, render: (val, item) => (<div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400" title={val}><MapPin size={12} className="shrink-0" /> <span className="truncate max-w-[120px]">{val}</span></div>)},
    { key: 'trang_thai', header: 'Trạng thái', visible: true, render: (_, item) => getStatusBadge(item)},
    { key: 'id', header: 'Xóa', visible: true, render: (_, item) => (<Button variant="ghost" size="icon" onClick={(e) => handleDelete(item.id, e)} className="text-gray-400 hover:text-red-500 h-8 w-8"><Trash2 size={14} /></Button>)}
  ], [data]);

  const renderFormSection = (title: string, icon: React.ReactNode, children: React.ReactNode) => (
      <div className="space-y-3"><h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-2">{icon} {title}</h4>{children}</div>
  );

  const boPhanOptions = masterData.boPhan.map(bp => ({ value: bp.ten, label: bp.ten }));

  // --- RENDER FILTERS (Updated: Separated Clear Button) ---
  const renderFilters = (
    <div className="flex items-center gap-2 w-full">
       {/* 1. Scrollable Filters Area */}
       <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar min-w-0">
           {/* Department Select */}
           <div className="relative group shrink-0">
              <select
                 className="h-9 pl-9 pr-7 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-gray-700 dark:text-gray-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer hover:border-blue-400 transition-colors w-auto min-w-[120px] max-w-[180px] truncate"
                 value={filters.phong_ban || ''}
                 onChange={(e) => setFilters(prev => ({ ...prev, phong_ban: e.target.value || undefined }))}
              >
                 <option value="">Bộ phận: Tất cả</option>
                 {masterData.boPhan.map(bp => (
                    <option key={bp.id} value={bp.ten}>{bp.ten}</option>
                 ))}
              </select>
              <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
           </div>

           {/* Status Select */}
           <div className="relative group shrink-0">
              <select
                 className="h-9 pl-9 pr-7 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-gray-700 dark:text-gray-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer hover:border-blue-400 transition-colors w-auto min-w-[120px] max-w-[180px] truncate"
                 value={filters.trang_thai || ''}
                 onChange={(e) => setFilters(prev => ({ ...prev, trang_thai: e.target.value || undefined }))}
              >
                 <option value="">Trạng thái: Tất cả</option>
                 <option value={TrangThaiHoSo.LUU_TRU}>Đang lưu trữ</option>
                 <option value={TrangThaiHoSo.SAP_HET_HAN}>Sắp hết hạn</option>
                 <option value={TrangThaiHoSo.CHO_HUY}>Chờ tiêu hủy</option>
                 <option value={TrangThaiHoSo.DA_HUY}>Đã hủy</option>
              </select>
              <Archive size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
           </div>

           {/* Storage Type Select */}
           <div className="relative group shrink-0">
              <select
                 className="h-9 pl-9 pr-7 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-gray-700 dark:text-gray-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer hover:border-blue-400 transition-colors w-auto min-w-[120px] max-w-[180px] truncate"
                 value={filters.dang_luu_tru || ''}
                 onChange={(e) => setFilters(prev => ({ ...prev, dang_luu_tru: e.target.value || undefined }))}
              >
                 <option value="">Lưu trữ: Tất cả</option>
                 <option value="BAN_CUNG">Bản cứng</option>
                 <option value="BAN_MEM">Bản mềm</option>
                 <option value="CA_HAI">Cả hai</option>
              </select>
              <Database size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
           </div>
       </div>

       {/* 2. Clear Filter Action (Fixed Right) */}
       {(filters.trang_thai || filters.phong_ban || filters.dang_luu_tru) && (
          <button
            onClick={() => setFilters({})}
            className="shrink-0 h-9 w-9 flex items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-all dark:bg-red-900/20 dark:border-red-900 dark:text-red-400 ml-1"
            title="Xóa tất cả bộ lọc"
          >
            <X size={16} />
          </button>
       )}
    </div>
  );

  return (
    <div className="flex flex-col h-full animate-fade-in -mx-4 md:mx-0">
       <div className="flex-1 overflow-hidden h-full rounded-lg border border-gray-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
          <DataTable 
            data={filteredData} 
            columns={columns} 
            onRowClick={handleEdit} 
            filters={renderFilters}
            actions={<Button onClick={handleAddNew} leftIcon={<Plus size={16}/>} className="h-9 text-sm shadow-sm">Lập hồ sơ</Button>}
          />
       </div>
       <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingItem.id ? 'Cập nhật hồ sơ' : 'Lập hồ sơ mới'} size="lg" footer={<><Button variant="ghost" onClick={() => setIsModalOpen(false)}>Hủy bỏ</Button><Button onClick={handleSave} isLoading={isLoading}>Lưu hồ sơ</Button></>}>
          <div className="space-y-6 p-2">
             {renderFormSection('Thông tin chung', <FileBox size={16} className="text-blue-500"/>, 
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Tiêu đề hồ sơ <span className="text-red-500">*</span></label>
                        <div className="relative"><AlignLeft size={16} className="absolute left-3 top-2.5 text-gray-400"/><input className="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 ring-primary/20 outline-none transition-all text-sm" value={editingItem.tieu_de || ''} onChange={e => setEditingItem({...editingItem, tieu_de: e.target.value})} placeholder="VD: Biên bản cuộc họp xem xét lãnh đạo Q1..." autoFocus/></div>
                    </div>
                    <div className="md:col-span-2">
                       <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Hồ sơ thuộc quy trình / tài liệu</label>
                       <div className="flex items-center gap-2"><div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded border border-indigo-100 dark:border-indigo-800 text-indigo-500"><LinkIcon size={16} /></div><div className="flex-1"><SearchableSelect options={docOptions} value={editingItem.ma_tai_lieu_lien_quan} onChange={(val) => setEditingItem({...editingItem, ma_tai_lieu_lien_quan: String(val)})} placeholder="-- Chọn quy trình liên quan --"/></div></div>
                       <p className="text-[10px] text-gray-400 mt-1 pl-11">Ví dụ: Chọn "QT-NS-01" nếu hồ sơ này được tạo ra từ Quy trình tuyển dụng.</p>
                    </div>
                    <div><label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Mã hồ sơ</label><div className="relative"><Hash size={16} className="absolute left-3 top-2.5 text-gray-400"/><input className="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 ring-primary/20 outline-none transition-all text-sm font-mono" value={editingItem.ma_ho_so || ''} onChange={e => setEditingItem({...editingItem, ma_ho_so: e.target.value})} placeholder="Auto generated"/></div></div>
                    <div><label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Bộ phận sở hữu</label><SearchableSelect options={boPhanOptions} value={editingItem.phong_ban} onChange={(val) => setEditingItem({...editingItem, phong_ban: String(val)})} placeholder="-- Chọn bộ phận --"/></div>
                </div>
             )}
             {renderFormSection('Vòng đời & Thời hạn', <Calendar size={16} className="text-orange-500"/>,
                <div className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-xl border border-orange-100 dark:border-orange-800">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Ngày lập hồ sơ</label><input type="date" className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 ring-primary/20 outline-none transition-all text-sm" value={editingItem.ngay_tao || ''} onChange={e => setEditingItem({...editingItem, ngay_tao: e.target.value})}/></div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Thời gian lưu trữ</label>
                            <div className="flex gap-2 mb-2">{[12, 36, 60, 120].map(m => (<button key={m} onClick={() => setEditingItem({...editingItem, thoi_gian_luu_tru: m})} className={`px-2 py-1 text-[10px] rounded border transition-colors ${editingItem.thoi_gian_luu_tru === m ? 'bg-orange-200 border-orange-300 text-orange-800 dark:bg-orange-900/50 dark:border-orange-700 dark:text-orange-200' : 'bg-white border-gray-200 hover:bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-700'}`}>{m/12} Năm</button>))} <button onClick={() => setEditingItem({...editingItem, thoi_gian_luu_tru: 0})} className={`px-2 py-1 text-[10px] rounded border transition-colors ${editingItem.thoi_gian_luu_tru === 0 ? 'bg-orange-200 border-orange-300 text-orange-800 dark:bg-orange-900/50 dark:border-orange-700 dark:text-orange-200' : 'bg-white border-gray-200 hover:bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-700'}`}>Vĩnh viễn</button></div>
                            <div className="relative"><input type="number" className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 ring-primary/20 outline-none transition-all text-sm" value={editingItem.thoi_gian_luu_tru} onChange={e => setEditingItem({...editingItem, thoi_gian_luu_tru: parseInt(e.target.value) || 0})}/><span className="absolute right-3 top-2.5 text-xs text-gray-500 font-medium">Tháng</span></div>
                        </div>
                        <div className="md:col-span-2 pt-2 border-t border-orange-200 dark:border-orange-800/30 flex items-center justify-between text-sm"><span className="text-orange-700 dark:text-orange-400 font-medium">Ngày tiêu hủy dự kiến:</span><span className="font-bold text-gray-800 dark:text-gray-100 bg-white dark:bg-slate-800 px-3 py-1 rounded border border-orange-200 dark:border-orange-800">{(editingItem.ngay_tao && editingItem.thoi_gian_luu_tru && editingItem.thoi_gian_luu_tru > 0) ? format(addMonths(new Date(editingItem.ngay_tao), editingItem.thoi_gian_luu_tru), 'dd/MM/yyyy') : (editingItem.thoi_gian_luu_tru === 0 ? 'Lưu trữ vĩnh viễn' : '---')}</span></div>
                    </div>
                </div>
             )}
             {renderFormSection('Nơi lưu trữ', <HardDrive size={16} className="text-purple-500"/>,
                <div className="grid grid-cols-1 gap-4">
                     <div><label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Hình thức lưu trữ</label><div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-lg w-full md:w-fit"><button onClick={() => setEditingItem({...editingItem, dang_luu_tru: 'BAN_CUNG'})} className={`flex-1 md:flex-none px-4 py-1.5 text-sm rounded-md font-medium transition-all ${editingItem.dang_luu_tru === 'BAN_CUNG' ? 'bg-white dark:bg-slate-700 shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}>Bản cứng (Hard copy)</button><button onClick={() => setEditingItem({...editingItem, dang_luu_tru: 'BAN_MEM'})} className={`flex-1 md:flex-none px-4 py-1.5 text-sm rounded-md font-medium transition-all ${editingItem.dang_luu_tru === 'BAN_MEM' ? 'bg-white dark:bg-slate-700 shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}>Bản mềm (Soft copy)</button></div></div>
                    <div><label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Chi tiết vị trí / Đường dẫn</label><div className="relative"><MapPin size={16} className="absolute left-3 top-2.5 text-gray-400"/><input className="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 ring-primary/20 outline-none transition-all text-sm" value={editingItem.vi_tri_luu_tru || ''} onChange={e => setEditingItem({...editingItem, vi_tri_luu_tru: e.target.value})} placeholder={editingItem.dang_luu_tru === 'BAN_CUNG' ? "VD: Kho tài liệu số 2, Tủ 05, Kệ 01..." : "VD: https://drive.google.com/..."}/></div></div>
                </div>
             )}
          </div>
       </Modal>
    </div>
  );
}
