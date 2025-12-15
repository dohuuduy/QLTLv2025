
import React, { useState, useMemo } from 'react';
import { DataTable } from '../../components/DataTable';
import { HoSo, ColumnDefinition, TrangThaiHoSo, MasterDataState, NhanSu, TaiLieu } from '../../types';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { MultiSelect } from '../../components/ui/MultiSelect'; // Import MultiSelect
import { format, addMonths, isPast, differenceInDays } from 'date-fns';
import { Archive, Plus, Trash2, Clock, MapPin, ShieldAlert, FileBox, Calendar, HardDrive, Hash, AlignLeft, Link as LinkIcon, Filter, X, Database, Building2 } from 'lucide-react';
import { upsertRecord, deleteRecord } from '../../services/supabaseService';
import { useDialog } from '../../contexts/DialogContext';

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
  const dialog = useDialog();

  const getDeptName = (id: string) => masterData.boPhan.find(bp => bp.id === id)?.ten || '---';

  const [filters, setFilters] = useState<{ 
      trang_thai: string[]; 
      id_phong_ban: string[]; 
      dang_luu_tru: string[];
  }>({
      trang_thai: [],
      id_phong_ban: [],
      dang_luu_tru: []
  });

  const docOptions = useMemo(() => {
    return documents.map(d => ({
        value: d.ma_tai_lieu,
        label: d.ten_tai_lieu,
        subLabel: d.ma_tai_lieu
    }));
  }, [documents]);

  const filteredData = useMemo(() => {
    return data.filter(item => {
        if (filters.trang_thai.length > 0) {
            let currentStatus = item.trang_thai;
            if (item.ngay_het_han && currentStatus === TrangThaiHoSo.LUU_TRU) {
                const daysLeft = differenceInDays(new Date(item.ngay_het_han), new Date());
                if (daysLeft < 0) currentStatus = TrangThaiHoSo.CHO_HUY;
                else if (daysLeft < 30) currentStatus = TrangThaiHoSo.SAP_HET_HAN;
            }
            if (!filters.trang_thai.includes(currentStatus)) return false;
        }
        if (filters.id_phong_ban.length > 0 && !filters.id_phong_ban.includes(item.id_phong_ban)) return false;
        if (filters.dang_luu_tru.length > 0 && !filters.dang_luu_tru.includes(item.dang_luu_tru)) return false;
        return true;
    });
  }, [data, filters]);

  const handleAddNew = () => {
    const userDeptId = masterData.boPhan.find(bp => bp.ten === currentUser.phong_ban)?.id || '';
    setEditingItem({
      ma_ho_so: `HS-${Date.now().toString().slice(-6)}`,
      ngay_tao: format(new Date(), 'yyyy-MM-dd'),
      thoi_gian_luu_tru: 12,
      trang_thai: TrangThaiHoSo.LUU_TRU,
      dang_luu_tru: 'BAN_CUNG',
      id_nguoi_tao: currentUser.id,
      id_phong_ban: userDeptId
    });
    setIsModalOpen(true);
  };

  const handleEdit = (item: HoSo) => {
    setEditingItem({ ...item });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingItem.tieu_de || !editingItem.ngay_tao) {
        dialog.alert("Vui lòng nhập tiêu đề và ngày lập hồ sơ!", { type: 'warning' });
        return;
    }

    setIsLoading(true);
    let expiryDate = '';
    if (editingItem.thoi_gian_luu_tru !== undefined && editingItem.thoi_gian_luu_tru > 0) {
       const start = new Date(editingItem.ngay_tao);
       expiryDate = format(addMonths(start, editingItem.thoi_gian_luu_tru), 'yyyy-MM-dd');
    }

    let recordId = editingItem.id;
    if (!recordId) {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            recordId = crypto.randomUUID();
        } else {
            recordId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }
    }

    const newItem: HoSo = {
      ...editingItem,
      id: recordId,
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
        dialog.alert('Lưu hồ sơ thành công!', { type: 'success' });
    } catch (error) {
        dialog.alert("Lỗi khi lưu hồ sơ!", { type: 'error' });
    } finally {
        setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
     e.stopPropagation();
     const confirmed = await dialog.confirm('Xác nhận tiêu hủy hồ sơ này khỏi danh sách và Database?', { title: 'Tiêu hủy hồ sơ', type: 'error', confirmLabel: 'Tiêu hủy' });
     if(confirmed) {
        try {
            await deleteRecord(id);
            onUpdate(data.filter(i => i.id !== id));
            dialog.alert('Tiêu hủy hồ sơ thành công!', { type: 'success' });
        } catch (error) {
            dialog.alert("Lỗi khi xóa hồ sơ!", { type: 'error' });
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
    { key: 'id_phong_ban', header: 'Bộ phận', visible: true, render: (val) => <span className="text-xs bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded text-gray-600 dark:text-gray-300 whitespace-nowrap">{getDeptName(val as string)}</span> },
    { key: 'ngay_tao', header: 'Ngày lập', visible: true, render: (val) => val ? <span className="text-xs">{format(new Date(val), 'dd/MM/yyyy')}</span> : ''},
    { key: 'thoi_gian_luu_tru', header: 'Hạn lưu', visible: true, render: (val, item) => (<div className="text-xs text-gray-900 dark:text-white"><div className="font-medium">{val === 0 ? 'Vĩnh viễn' : `${val} tháng`}</div>{item.ngay_het_han && <div className="text-[10px] text-gray-400">Đến: {format(new Date(item.ngay_het_han), 'dd/MM/yyyy')}</div>}</div>)},
    { key: 'vi_tri_luu_tru', header: 'Vị trí', visible: true, render: (val, item) => (<div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400" title={val}><MapPin size={12} className="shrink-0" /> <span className="truncate max-w-[120px]">{val}</span></div>)},
    { key: 'trang_thai', header: 'Trạng thái', visible: true, render: (_, item) => getStatusBadge(item)},
    { key: 'id', header: 'Xóa', visible: true, render: (_, item) => (<Button variant="ghost" size="icon" onClick={(e) => handleDelete(item.id, e)} className="text-gray-400 hover:text-red-500 h-8 w-8"><Trash2 size={14} /></Button>)}
  ], [data, masterData.boPhan]);

  const boPhanOptions = masterData.boPhan.map(bp => ({ value: bp.id, label: bp.ten }));

  const inputClass = "w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 ring-primary/20 outline-none transition-all text-sm disabled:opacity-60 disabled:bg-gray-100 dark:disabled:bg-slate-800 placeholder:text-gray-400 dark:placeholder:text-gray-500";
  const labelClass = "text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1.5 block";

  const renderFilters = (
    <div className="flex items-center gap-2 w-full">
       <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar min-w-0">
           
           <div className="min-w-[180px] max-w-[250px]">
               <MultiSelect 
                  options={boPhanOptions}
                  value={filters.id_phong_ban}
                  onValueChange={(val) => setFilters(prev => ({...prev, id_phong_ban: val}))}
                  placeholder="Lọc theo bộ phận"
                  maxCount={1}
                  className="h-9 text-xs"
               />
           </div>

           <div className="min-w-[180px] max-w-[250px]">
               <MultiSelect 
                  options={[
                      { value: TrangThaiHoSo.LUU_TRU, label: 'Đang lưu trữ' },
                      { value: TrangThaiHoSo.SAP_HET_HAN, label: 'Sắp hết hạn' },
                      { value: TrangThaiHoSo.CHO_HUY, label: 'Chờ tiêu hủy' },
                      { value: TrangThaiHoSo.DA_HUY, label: 'Đã hủy' }
                  ]}
                  value={filters.trang_thai}
                  onValueChange={(val) => setFilters(prev => ({...prev, trang_thai: val}))}
                  placeholder="Lọc trạng thái"
                  maxCount={1}
                  className="h-9 text-xs"
               />
           </div>

           <div className="min-w-[150px] max-w-[200px]">
               <MultiSelect 
                  options={[
                      { value: "BAN_CUNG", label: 'Bản cứng' },
                      { value: "BAN_MEM", label: 'Bản mềm' },
                      { value: "CA_HAI", label: 'Cả hai' }
                  ]}
                  value={filters.dang_luu_tru}
                  onValueChange={(val) => setFilters(prev => ({...prev, dang_luu_tru: val}))}
                  placeholder="Lọc hình thức"
                  maxCount={1}
                  className="h-9 text-xs"
               />
           </div>
       </div>
       {(filters.trang_thai.length > 0 || filters.id_phong_ban.length > 0 || filters.dang_luu_tru.length > 0) && (
          <button onClick={() => setFilters({ trang_thai: [], id_phong_ban: [], dang_luu_tru: [] })} className="shrink-0 h-9 w-9 flex items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-all ml-1" title="Xóa tất cả bộ lọc"><X size={16} /></button>
       )}
    </div>
  );

  return (
    <div className="flex flex-col h-full animate-fade-in -mx-4 md:mx-0">
       <div className="flex-1 overflow-hidden h-full rounded-lg border border-gray-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
          <DataTable data={filteredData} columns={columns} onRowClick={handleEdit} filters={renderFilters} actions={<Button onClick={handleAddNew} leftIcon={<Plus size={16}/>} className="h-9 text-sm shadow-sm">Lập hồ sơ</Button>}/>
       </div>
       <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingItem.id ? 'Cập nhật hồ sơ' : 'Lập hồ sơ mới'} size="lg" footer={<><Button variant="ghost" onClick={() => setIsModalOpen(false)}>Hủy bỏ</Button><Button onClick={handleSave} isLoading={isLoading}>Lưu hồ sơ</Button></>}>
          <div className="space-y-6 p-2">
             
             {/* General Info */}
             <div className="space-y-4">
                <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-2"><FileBox size={16} className="text-blue-500"/> Thông tin chung</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className={labelClass}>Tiêu đề hồ sơ <span className="text-red-500">*</span></label>
                        <div className="relative"><AlignLeft size={16} className="absolute left-3 top-2.5 text-gray-400"/><input className={`${inputClass} pl-9`} value={editingItem.tieu_de || ''} onChange={e => setEditingItem({...editingItem, tieu_de: e.target.value})} placeholder="VD: Biên bản cuộc họp xem xét lãnh đạo Q1..." autoFocus/></div>
                    </div>
                    <div className="md:col-span-2">
                       <label className={labelClass}>Hồ sơ thuộc quy trình / tài liệu</label>
                       <div className="flex items-center gap-2"><div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded border border-indigo-100 dark:border-indigo-800 text-indigo-500"><LinkIcon size={16} /></div><div className="flex-1"><SearchableSelect options={docOptions} value={editingItem.ma_tai_lieu_lien_quan} onChange={(val) => setEditingItem({...editingItem, ma_tai_lieu_lien_quan: String(val)})} placeholder="-- Chọn quy trình liên quan --"/></div></div>
                    </div>
                    <div>
                        <label className={labelClass}>Mã hồ sơ</label>
                        <div className="relative"><Hash size={16} className="absolute left-3 top-2.5 text-gray-400"/><input className={`${inputClass} pl-9 font-mono text-blue-600 font-bold`} value={editingItem.ma_ho_so || ''} onChange={e => setEditingItem({...editingItem, ma_ho_so: e.target.value})} placeholder="Auto generated"/></div>
                    </div>
                    <div>
                        <label className={labelClass}>Bộ phận sở hữu</label>
                        <SearchableSelect options={boPhanOptions} value={editingItem.id_phong_ban} onChange={(val) => setEditingItem({...editingItem, id_phong_ban: String(val)})} placeholder="-- Chọn bộ phận --"/>
                    </div>
                </div>
             </div>

             {/* Lifecycle */}
             <div className="space-y-4">
                <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-2"><Calendar size={16} className="text-orange-500"/> Thời hạn & Lưu trữ</h4>
                <div className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-xl border border-orange-100 dark:border-orange-800/30">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className={labelClass}>Ngày lập hồ sơ</label><input type="date" className={`${inputClass} dark:[color-scheme:dark]`} value={editingItem.ngay_tao || ''} onChange={e => setEditingItem({...editingItem, ngay_tao: e.target.value})}/></div>
                        <div>
                            <label className={labelClass}>Thời gian lưu trữ</label>
                            <div className="flex gap-2 mb-2">{[12, 36, 60, 120].map(m => (<button key={m} onClick={() => setEditingItem({...editingItem, thoi_gian_luu_tru: m})} className={`px-2 py-1 text-[10px] rounded border transition-colors ${editingItem.thoi_gian_luu_tru === m ? 'bg-orange-200 border-orange-300 text-orange-800 dark:bg-orange-900/50 dark:border-orange-700 dark:text-orange-200' : 'bg-white border-gray-200 hover:bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-300'}`}>{m/12} Năm</button>))} <button onClick={() => setEditingItem({...editingItem, thoi_gian_luu_tru: 0})} className={`px-2 py-1 text-[10px] rounded border transition-colors ${editingItem.thoi_gian_luu_tru === 0 ? 'bg-orange-200 border-orange-300 text-orange-800' : 'bg-white border-gray-200'}`}>Vĩnh viễn</button></div>
                            <div className="relative"><input type="number" className={inputClass} value={editingItem.thoi_gian_luu_tru} onChange={e => setEditingItem({...editingItem, thoi_gian_luu_tru: parseInt(e.target.value) || 0})}/><span className="absolute right-3 top-2.5 text-xs text-gray-500 font-medium">Tháng</span></div>
                        </div>
                        <div className="md:col-span-2 pt-2 border-t border-orange-200 dark:border-orange-800/30 flex items-center justify-between text-sm"><span className="text-orange-700 dark:text-orange-400 font-medium">Ngày tiêu hủy dự kiến:</span><span className="font-bold text-gray-800 dark:text-gray-100 bg-white dark:bg-slate-800 px-3 py-1 rounded border border-orange-200 dark:border-orange-800">{(editingItem.ngay_tao && editingItem.thoi_gian_luu_tru && editingItem.thoi_gian_luu_tru > 0) ? format(addMonths(new Date(editingItem.ngay_tao), editingItem.thoi_gian_luu_tru), 'dd/MM/yyyy') : (editingItem.thoi_gian_luu_tru === 0 ? 'Lưu trữ vĩnh viễn' : '---')}</span></div>
                    </div>
                </div>
             </div>

             {/* Location */}
             <div className="space-y-4">
                <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-2"><HardDrive size={16} className="text-purple-500"/> Nơi lưu trữ</h4>
                <div className="grid grid-cols-1 gap-4">
                     <div>
                        <label className={labelClass}>Hình thức lưu trữ</label>
                        <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-lg w-full md:w-fit">
                            <button onClick={() => setEditingItem({...editingItem, dang_luu_tru: 'BAN_CUNG'})} className={`flex-1 md:flex-none px-4 py-1.5 text-sm rounded-md font-medium transition-all ${editingItem.dang_luu_tru === 'BAN_CUNG' ? 'bg-white dark:bg-slate-700 shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}>Bản cứng</button>
                            <button onClick={() => setEditingItem({...editingItem, dang_luu_tru: 'BAN_MEM'})} className={`flex-1 md:flex-none px-4 py-1.5 text-sm rounded-md font-medium transition-all ${editingItem.dang_luu_tru === 'BAN_MEM' ? 'bg-white dark:bg-slate-700 shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}>Bản mềm</button>
                        </div>
                     </div>
                    <div>
                        <label className={labelClass}>Chi tiết vị trí / Đường dẫn</label>
                        <div className="relative">
                            <MapPin size={16} className="absolute left-3 top-2.5 text-gray-400"/>
                            <input className={`${inputClass} pl-9`} value={editingItem.vi_tri_luu_tru || ''} onChange={e => setEditingItem({...editingItem, vi_tri_luu_tru: e.target.value})} placeholder={editingItem.dang_luu_tru === 'BAN_CUNG' ? "VD: Kho tài liệu số 2, Tủ 05, Kệ 01..." : "VD: https://drive.google.com/..."}/>
                        </div>
                    </div>
                </div>
             </div>

          </div>
       </Modal>
    </div>
  );
}
