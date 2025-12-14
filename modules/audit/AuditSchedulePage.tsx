
import React, { useState, useMemo } from 'react';
import { KeHoachDanhGia, MasterDataState, TaiLieu, NhanSu, ColumnDefinition, TrangThaiKeHoach, PhienDanhGia } from '../../types';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/DataTable';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { CalendarDays, Plus, Calendar, Target, MapPin, UserCheck, Briefcase, Trash2, Pencil, X, Save, Layers, List } from 'lucide-react';
import { format } from 'date-fns';
import { AuditCalendar } from './AuditCalendar';
import { upsertAuditPlan, deleteAuditPlan } from '../../services/supabaseService';
import { useDialog } from '../../contexts/DialogContext';

interface AuditSchedulePageProps {
  auditPlans: KeHoachDanhGia[];
  onUpdate: (plans: KeHoachDanhGia[]) => void;
  masterData: MasterDataState;
  documents: TaiLieu[];
  currentUser: NhanSu;
}

export const AuditSchedulePage: React.FC<AuditSchedulePageProps> = ({ 
    auditPlans, 
    onUpdate,
    masterData,
    documents,
    currentUser
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [editingPlan, setEditingPlan] = useState<Partial<KeHoachDanhGia>>({
     trang_thai: 'lap_ke_hoach',
     to_chuc_danh_gia_id: '',
     truong_doan_id: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const dialog = useDialog();

  const getStatusBadge = (status: TrangThaiKeHoach) => {
      const map = {
          'lap_ke_hoach': { label: 'Lập kế hoạch', class: 'bg-gray-100 text-gray-600 border-gray-200' },
          'da_chot': { label: 'Đã chốt lịch', class: 'bg-blue-100 text-blue-600 border-blue-200' },
          'dang_thuc_hien': { label: 'Đang thực hiện', class: 'bg-orange-100 text-orange-600 border-orange-200' },
          'hoan_thanh': { label: 'Hoàn thành', class: 'bg-green-100 text-green-600 border-green-200' },
      };
      const conf = map[status];
      return <span className={`px-2 py-1 rounded text-xs font-bold border ${conf.class}`}>{conf.label}</span>
  };

  const handleAddNew = () => {
     setEditingPlan({
         trang_thai: 'lap_ke_hoach',
         loai_danh_gia: '',
         muc_tieu: '',
         pham_vi: '',
         to_chuc_danh_gia_id: '',
         truong_doan_id: ''
     });
     setIsDrawerOpen(true);
  };

  const handleEdit = (plan: KeHoachDanhGia) => {
     setEditingPlan({ ...plan });
     setIsDrawerOpen(true);
  };

  const handleCalendarEventClick = (plan: KeHoachDanhGia, session: PhienDanhGia) => {
      handleEdit(plan);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
     e.stopPropagation();
     const confirmed = await dialog.confirm('Đại ca có chắc muốn xóa kế hoạch này khỏi Database không?', { type: 'error', title: 'Xóa kế hoạch', confirmLabel: 'Xóa' });
     if (confirmed) {
        try {
            await deleteAuditPlan(id);
            onUpdate(auditPlans.filter(p => p.id !== id));
            dialog.alert('Đã xóa kế hoạch thành công!', { type: 'success' });
        } catch (error) {
            dialog.alert("Lỗi xóa kế hoạch!", { type: 'error' });
        }
     }
  };

  const handleSave = async () => {
      if (!editingPlan.ten_ke_hoach) {
          dialog.alert("Vui lòng nhập tên kế hoạch!", { type: 'warning' });
          return;
      }
      setIsLoading(true);

      const newPlan: KeHoachDanhGia = {
          ...editingPlan,
          id: editingPlan.id || `KH${Date.now()}`,
          ngay_tao: editingPlan.ngay_tao || new Date().toISOString(),
          id_nguoi_tao: editingPlan.id_nguoi_tao || currentUser.id,
          danh_sach_phien: editingPlan.danh_sach_phien || []
      } as KeHoachDanhGia;

      try {
          await upsertAuditPlan(newPlan);
          if (editingPlan.id) {
              onUpdate(auditPlans.map(p => p.id === newPlan.id ? newPlan : p));
          } else {
              onUpdate([newPlan, ...auditPlans]);
          }
          setIsDrawerOpen(false);
          dialog.alert('Lưu kế hoạch thành công!', { type: 'success' });
      } catch (error) {
          dialog.alert("Lỗi lưu kế hoạch!", { type: 'error' });
      } finally {
          setIsLoading(false);
      }
  };

  const auditTypeOptions = (masterData.loaiDanhGia || []).map(t => ({ value: t.ten, label: t.ten }));
  const auditOrgOptions = (masterData.toChucDanhGia || []).map(t => ({ value: t.id, label: t.ten }));
  
  const filteredAuditors = useMemo(() => {
     if (!editingPlan.to_chuc_danh_gia_id) return [];
     return (masterData.auditors || [])
        .filter(a => a.parentId === editingPlan.to_chuc_danh_gia_id)
        .map(a => ({ value: a.id, label: a.ten }));
  }, [masterData.auditors, editingPlan.to_chuc_danh_gia_id]);

  const columns: ColumnDefinition<KeHoachDanhGia>[] = [
      { key: 'ten_ke_hoach', header: 'Tên kế hoạch', visible: true, render: (val, item) => (<div><div className="font-medium text-gray-800 dark:text-gray-200">{val}</div><div className="text-xs text-gray-500 mt-1">{item.loai_danh_gia}</div></div>) },
      { key: 'to_chuc_danh_gia_id', header: 'Tổ chức đánh giá', visible: true, render: (val) => { const org = masterData.toChucDanhGia?.find(o => o.id === val); return <span className="text-sm">{org ? org.ten : '--'}</span>; } },
      { key: 'truong_doan_id', header: 'Trưởng đoàn', visible: true, render: (val) => { const lead = masterData.auditors?.find(a => a.id === val); return lead ? (<div className="flex items-center gap-1 text-sm"><UserCheck size={14} className="text-blue-500"/> {lead.ten}</div>) : '--'; } },
      { key: 'thoi_gian_du_kien_start', header: 'Thời gian', visible: true, render: (_, item) => (<span className="text-xs">{item.thoi_gian_du_kien_start ? format(new Date(item.thoi_gian_du_kien_start), 'dd/MM/yyyy') : '?'} {' - '} {item.thoi_gian_du_kien_end ? format(new Date(item.thoi_gian_du_kien_end), 'dd/MM/yyyy') : '?'}</span>) },
      { key: 'trang_thai', header: 'Trạng thái', visible: true, render: (val) => getStatusBadge(val as TrangThaiKeHoach) },
      { key: 'id', header: 'Thao tác', visible: true, render: (_, item) => (<div className="flex gap-1"><Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEdit(item); }}><Pencil size={16} className="text-blue-500"/></Button><Button variant="ghost" size="icon" onClick={(e) => handleDelete(item.id, e)}><Trash2 size={16} className="text-red-500"/></Button></div>) }
  ];

  const inputClass = "w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 ring-primary/20 outline-none transition-all text-sm";
  const labelClass = "block text-xs font-semibold text-gray-500 uppercase mb-1";

  const renderFilters = (
      <div className="flex bg-gray-100 dark:bg-slate-800 rounded p-1 mr-2 border border-gray-200 dark:border-slate-700">
         <button onClick={() => setViewMode('list')} className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-600 shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`} title="Xem dạng bảng"><List size={16}/> Danh sách</button>
         <button onClick={() => setViewMode('calendar')} className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-all ${viewMode === 'calendar' ? 'bg-white dark:bg-slate-600 shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`} title="Xem lịch chi tiết"><CalendarDays size={16}/> Lịch</button>
      </div>
  );

  return (
    <div className="h-full flex flex-col animate-fade-in -mx-4 md:mx-0 relative">
        <div className="flex-1 overflow-hidden h-full rounded-lg border border-gray-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 flex flex-col">
            {viewMode === 'calendar' ? (
                <>
                    <div className="p-2 border-b border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/30 rounded-t-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shrink-0">
                        <div className="flex items-center gap-3">{renderFilters}</div>
                        <Button onClick={handleAddNew} leftIcon={<Plus size={16} />} className="shadow-sm h-9 text-sm">Lập kế hoạch mới</Button>
                    </div>
                    <div className="flex-1 overflow-hidden p-0 relative"><AuditCalendar auditPlans={auditPlans} onEventClick={handleCalendarEventClick} /></div>
                </>
            ) : (
                <DataTable data={auditPlans} columns={columns} onRowClick={handleEdit} filters={renderFilters} actions={<Button onClick={handleAddNew} leftIcon={<Plus size={16} />} className="shadow-sm">Lập kế hoạch mới</Button>}/>
            )}
        </div>
        {isDrawerOpen && (
            <div className="fixed inset-0 top-16 z-[50] flex justify-end">
                <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity" onClick={() => setIsDrawerOpen(false)} />
                <div className="w-full md:max-w-2xl bg-white dark:bg-slate-900 h-full shadow-2xl relative animate-slide-in-right flex flex-col transition-colors border-l border-t border-gray-200 dark:border-slate-800">
                    <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50"><h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2"><Layers className="text-primary" /> {editingPlan.id ? 'Cập nhật kế hoạch đánh giá' : 'Lập kế hoạch đánh giá mới'}</h2><Button variant="ghost" size="icon" onClick={() => setIsDrawerOpen(false)}><X size={20} /></Button></div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-gray-500 uppercase border-b dark:border-slate-800 pb-1">Thông tin chung</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2"><label className={labelClass}>Tên kế hoạch <span className="text-red-500">*</span></label><input className={inputClass} placeholder="VD: Đánh giá nội bộ lần 1 năm 2024" value={editingPlan.ten_ke_hoach || ''} onChange={(e) => setEditingPlan({...editingPlan, ten_ke_hoach: e.target.value})} autoFocus/></div>
                                <div><label className={labelClass}>Loại hình đánh giá</label><SearchableSelect options={auditTypeOptions} value={editingPlan.loai_danh_gia} onChange={(val) => setEditingPlan({...editingPlan, loai_danh_gia: String(val)})} placeholder="-- Chọn loại --"/></div>
                                <div><label className={labelClass}>Trạng thái</label><select className={inputClass} value={editingPlan.trang_thai} onChange={(e) => setEditingPlan({...editingPlan, trang_thai: e.target.value as TrangThaiKeHoach})}><option value="lap_ke_hoach">Lập kế hoạch</option><option value="da_chot">Đã chốt lịch</option><option value="dang_thuc_hien">Đang thực hiện</option><option value="hoan_thanh">Hoàn thành</option></select></div>
                            </div>
                        </div>
                        <div className="space-y-4">
                             <h3 className="text-sm font-bold text-gray-500 uppercase border-b dark:border-slate-800 pb-1 flex items-center gap-2"><Briefcase size={14}/> Đơn vị thực hiện</h3>
                             <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label className={labelClass}>Tổ chức đánh giá</label><SearchableSelect options={auditOrgOptions} value={editingPlan.to_chuc_danh_gia_id} onChange={(val) => setEditingPlan({...editingPlan, to_chuc_danh_gia_id: String(val), truong_doan_id: ''})} placeholder="-- Chọn tổ chức --"/></div>
                                <div><label className={labelClass}>Trưởng đoàn đánh giá</label><SearchableSelect options={filteredAuditors} value={editingPlan.truong_doan_id} onChange={(val) => setEditingPlan({...editingPlan, truong_doan_id: String(val)})} placeholder={editingPlan.to_chuc_danh_gia_id ? "-- Chọn trưởng đoàn --" : "-- Chọn tổ chức trước --"} disabled={!editingPlan.to_chuc_danh_gia_id}/></div>
                             </div>
                        </div>
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-gray-500 uppercase border-b dark:border-slate-800 pb-1 flex items-center gap-2"><CalendarDays size={14}/> Thời gian & Phạm vi</h3>
                            <div><label className={labelClass}>Thời gian dự kiến</label><div className="grid grid-cols-2 gap-4"><div className="relative"><Calendar size={16} className="absolute left-3 top-2.5 text-gray-400"/><input type="date" className={`${inputClass} pl-9`} value={editingPlan.thoi_gian_du_kien_start || ''} onChange={(e) => setEditingPlan({...editingPlan, thoi_gian_du_kien_start: e.target.value})}/></div><div className="relative"><Calendar size={16} className="absolute left-3 top-2.5 text-gray-400"/><input type="date" className={`${inputClass} pl-9`} value={editingPlan.thoi_gian_du_kien_end || ''} onChange={(e) => setEditingPlan({...editingPlan, thoi_gian_du_kien_end: e.target.value})}/></div></div></div>
                            <div><label className={labelClass}>Mục tiêu đánh giá</label><div className="relative"><Target size={16} className="absolute left-3 top-3 text-gray-400"/><textarea className="w-full p-2 pl-9 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 ring-primary/20 outline-none transition-all text-sm min-h-[80px]" placeholder="Xác định sự phù hợp của hệ thống quản lý..." value={editingPlan.muc_tieu || ''} onChange={(e) => setEditingPlan({...editingPlan, muc_tieu: e.target.value})}/></div></div>
                            <div><label className={labelClass}>Phạm vi đánh giá</label><div className="relative"><MapPin size={16} className="absolute left-3 top-3 text-gray-400"/><textarea className="w-full p-2 pl-9 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 ring-primary/20 outline-none transition-all text-sm min-h-[80px]" placeholder="Các phòng ban, quy trình liên quan..." value={editingPlan.pham_vi || ''} onChange={(e) => setEditingPlan({...editingPlan, pham_vi: e.target.value})}/></div></div>
                        </div>
                    </div>
                    <div className="p-6 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 sticky bottom-0 flex justify-end gap-3">
                        <Button variant="ghost" onClick={() => setIsDrawerOpen(false)}>Hủy bỏ</Button>
                        <Button onClick={handleSave} leftIcon={<Save size={16} />} isLoading={isLoading}>Lưu kế hoạch</Button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
