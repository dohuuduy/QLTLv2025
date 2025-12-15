
import React, { useState, useMemo } from 'react';
import { KeHoachDanhGia, MasterDataState, TaiLieu, NhanSu, ColumnDefinition, TrangThaiKeHoach, PhienDanhGia } from '../../types';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/DataTable';
import { Modal } from '../../components/ui/Modal';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { MultiSelect } from '../../components/ui/MultiSelect'; // Use MultiSelect for Auditors
import { CalendarDays, Plus, Calendar, Target, MapPin, UserCheck, Briefcase, Trash2, Pencil, Layers, List, FileBox } from 'lucide-react';
import { format } from 'date-fns';
import { AuditCalendar } from './AuditCalendar';
import { upsertAuditPlan, deleteAuditPlan } from '../../services/supabaseService';
import { useDialog } from '../../contexts/DialogContext';
import { useToast } from '../../components/ui/Toast';

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [editingPlan, setEditingPlan] = useState<Partial<KeHoachDanhGia>>({
     trang_thai: 'lap_ke_hoach',
     to_chuc_danh_gia_id: '',
     auditor_ids: [],
     id_loai_danh_gia: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const dialog = useDialog();
  const toast = useToast();

  // Unified Styles (Fixed Dark Mode)
  const inputClass = "w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 ring-primary/20 outline-none transition-all text-sm";
  const labelClass = "text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1.5 block";

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
         id_loai_danh_gia: '',
         muc_tieu: '',
         pham_vi: '',
         to_chuc_danh_gia_id: '',
         auditor_ids: []
     });
     setIsModalOpen(true);
  };

  const handleEdit = (plan: KeHoachDanhGia) => {
     setEditingPlan({ ...plan });
     setIsModalOpen(true);
  };

  const handleCalendarEventClick = (plan: KeHoachDanhGia, session: PhienDanhGia) => {
      handleEdit(plan);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
     e.stopPropagation();
     const confirmed = await dialog.confirm('Bạn có chắc muốn xóa kế hoạch này khỏi Database không?', { type: 'error', title: 'Xóa kế hoạch', confirmLabel: 'Xóa' });
     if (confirmed) {
        try {
            await deleteAuditPlan(id);
            onUpdate(auditPlans.filter(p => p.id !== id));
            toast.success('Đã xóa kế hoạch thành công!');
        } catch (error) {
            toast.error("Lỗi xóa kế hoạch! Vui lòng thử lại.");
        }
     }
  };

  // --- DATE HANDLERS ---
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newStart = e.target.value;
      setEditingPlan(prev => ({
          ...prev,
          thoi_gian_du_kien_start: newStart,
          // Auto-fill end date to match start date for convenience
          // Logic: If user sets start date, we assume at least a 1-day audit.
          // They can extend it later, but this prevents empty or invalid end dates.
          thoi_gian_du_kien_end: newStart 
      }));
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newEnd = e.target.value;
      const start = editingPlan.thoi_gian_du_kien_start;

      if (start && newEnd < start) {
          toast.warning("Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu!");
          // Reset to start date if invalid
          setEditingPlan(prev => ({ ...prev, thoi_gian_du_kien_end: start }));
          return;
      }
      setEditingPlan(prev => ({ ...prev, thoi_gian_du_kien_end: newEnd }));
  };
  // ---------------------

  const handleSave = async () => {
      if (!editingPlan.ten_ke_hoach) {
          dialog.alert("Vui lòng nhập tên kế hoạch!", { type: 'warning' });
          return;
      }
      if (!editingPlan.thoi_gian_du_kien_start || !editingPlan.thoi_gian_du_kien_end) {
          dialog.alert("Vui lòng chọn thời gian dự kiến!", { type: 'warning' });
          return;
      }

      setIsLoading(true);

      // UUID Generation logic
      let planId = editingPlan.id;
      if (!planId) {
          if (typeof crypto !== 'undefined' && crypto.randomUUID) {
              planId = crypto.randomUUID();
          } else {
              planId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                  var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                  return v.toString(16);
              });
          }
      }

      const newPlan: KeHoachDanhGia = {
          ...editingPlan,
          id: planId,
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
          setIsModalOpen(false);
          toast.success('Lưu kế hoạch đánh giá thành công!');
      } catch (error) {
          toast.error("Lỗi khi lưu kế hoạch!");
      } finally {
          setIsLoading(false);
      }
  };

  const auditTypeOptions = (masterData.loaiDanhGia || []).map(t => ({ value: t.id, label: t.ten }));
  const auditOrgOptions = (masterData.toChucDanhGia || []).map(t => ({ value: t.id, label: t.ten }));
  
  // Use for MultiSelect
  const filteredAuditors = useMemo(() => {
     if (!editingPlan.to_chuc_danh_gia_id) return [];
     return (masterData.auditors || [])
        .filter(a => a.parentId === editingPlan.to_chuc_danh_gia_id)
        .map(a => ({ value: a.id, label: a.ten }));
  }, [masterData.auditors, editingPlan.to_chuc_danh_gia_id]);

  const columns: ColumnDefinition<KeHoachDanhGia>[] = [
      { key: 'ten_ke_hoach', header: 'Tên kế hoạch', visible: true, render: (val, item) => {
          const typeName = masterData.loaiDanhGia?.find(t => t.id === item.id_loai_danh_gia)?.ten || '---';
          return (<div><div className="font-medium text-gray-800 dark:text-gray-200">{val}</div><div className="text-xs text-gray-500 mt-1">{typeName}</div></div>);
      }},
      { key: 'to_chuc_danh_gia_id', header: 'Tổ chức đánh giá', visible: true, render: (val) => { const org = masterData.toChucDanhGia?.find(o => o.id === val); return <span className="text-sm">{org ? org.ten : '--'}</span>; } },
      { key: 'auditor_ids', header: 'Đoàn đánh giá', visible: true, render: (val) => { 
          const ids = (val as string[]) || [];
          if (ids.length === 0) return '--';
          const names = ids.map(id => masterData.auditors.find(a => a.id === id)?.ten).filter(Boolean);
          return (
            <div className="flex flex-col gap-1 text-sm">
                {names.length > 0 ? (
                    names.map((name, idx) => (
                        <div key={idx} className="flex items-center gap-1"><UserCheck size={12} className="text-blue-500"/> {name}</div>
                    ))
                ) : <span className="italic text-gray-400">Không tìm thấy</span>}
            </div>
          );
      } },
      { key: 'thoi_gian_du_kien_start', header: 'Thời gian', visible: true, render: (_, item) => (<span className="text-xs">{item.thoi_gian_du_kien_start ? format(new Date(item.thoi_gian_du_kien_start), 'dd/MM/yyyy') : '?'} {' - '} {item.thoi_gian_du_kien_end ? format(new Date(item.thoi_gian_du_kien_end), 'dd/MM/yyyy') : '?'}</span>) },
      { key: 'trang_thai', header: 'Trạng thái', visible: true, render: (val) => getStatusBadge(val as TrangThaiKeHoach) },
      { key: 'id', header: 'Thao tác', visible: true, render: (_, item) => (<div className="flex gap-1"><Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEdit(item); }}><Pencil size={16} className="text-blue-500"/></Button><Button variant="ghost" size="icon" onClick={(e) => handleDelete(item.id, e)}><Trash2 size={16} className="text-red-500"/></Button></div>) }
  ];

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
        
        {/* Unified Modal Form */}
        <Modal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            title={editingPlan.id ? 'Cập nhật kế hoạch đánh giá' : 'Lập kế hoạch mới'} 
            size="lg" 
            footer={<><Button variant="ghost" onClick={() => setIsModalOpen(false)}>Hủy bỏ</Button><Button onClick={handleSave} isLoading={isLoading}>Lưu kế hoạch</Button></>}
        >
            <div className="space-y-6 p-2">
                {/* Section 1 */}
                <div className="space-y-4">
                    <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-2"><FileBox size={16} className="text-blue-500"/> Thông tin chung</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className={labelClass}>Tên kế hoạch <span className="text-red-500">*</span></label>
                            <input className={inputClass} placeholder="VD: Đánh giá nội bộ lần 1 năm 2024" value={editingPlan.ten_ke_hoach || ''} onChange={(e) => setEditingPlan({...editingPlan, ten_ke_hoach: e.target.value})} autoFocus/>
                        </div>
                        <div>
                            <label className={labelClass}>Loại hình đánh giá</label>
                            <SearchableSelect options={auditTypeOptions} value={editingPlan.id_loai_danh_gia} onChange={(val) => setEditingPlan({...editingPlan, id_loai_danh_gia: String(val)})} placeholder="-- Chọn loại --"/>
                        </div>
                        <div>
                            <label className={labelClass}>Trạng thái</label>
                            <select className={inputClass} value={editingPlan.trang_thai} onChange={(e) => setEditingPlan({...editingPlan, trang_thai: e.target.value as TrangThaiKeHoach})}>
                                <option value="lap_ke_hoach">Lập kế hoạch</option>
                                <option value="da_chot">Đã chốt lịch</option>
                                <option value="dang_thuc_hien">Đang thực hiện</option>
                                <option value="hoan_thanh">Hoàn thành</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Section 2 */}
                <div className="space-y-4">
                        <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-2"><Briefcase size={16} className="text-purple-500"/> Đơn vị thực hiện</h4>
                        <div className="bg-purple-50 dark:bg-purple-900/10 p-4 rounded-xl border border-purple-100 dark:border-purple-900/30 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className={labelClass}>Tổ chức đánh giá</label><SearchableSelect options={auditOrgOptions} value={editingPlan.to_chuc_danh_gia_id} onChange={(val) => setEditingPlan({...editingPlan, to_chuc_danh_gia_id: String(val), auditor_ids: []})} placeholder="-- Chọn tổ chức --"/></div>
                        <div>
                            <label className={labelClass}>Đoàn đánh giá (Auditors)</label>
                            {/* Updated to MultiSelect for multiple auditors */}
                            <MultiSelect 
                                options={filteredAuditors} 
                                value={editingPlan.auditor_ids || []} 
                                onValueChange={(val) => setEditingPlan({...editingPlan, auditor_ids: val})} 
                                placeholder={editingPlan.to_chuc_danh_gia_id ? "-- Chọn các thành viên --" : "-- Chọn tổ chức trước --"} 
                                disabled={!editingPlan.to_chuc_danh_gia_id}
                                className="bg-white dark:bg-slate-900"
                            />
                        </div>
                        </div>
                </div>

                {/* Section 3 */}
                <div className="space-y-4">
                    <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-2"><CalendarDays size={16} className="text-orange-500"/> Thời gian & Phạm vi</h4>
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className={labelClass}>Thời gian dự kiến</label>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="relative group">
                                    <label className="text-[10px] text-gray-400 absolute left-2 -top-1.5 bg-white dark:bg-slate-900 px-1">Bắt đầu</label>
                                    <input type="date" className={`${inputClass}`} value={editingPlan.thoi_gian_du_kien_start || ''} onChange={handleStartDateChange}/>
                                </div>
                                <div className="relative group">
                                    <label className="text-[10px] text-gray-400 absolute left-2 -top-1.5 bg-white dark:bg-slate-900 px-1">Kết thúc</label>
                                    <input 
                                        type="date" 
                                        className={`${inputClass}`} 
                                        value={editingPlan.thoi_gian_du_kien_end || ''} 
                                        onChange={handleEndDateChange}
                                        min={editingPlan.thoi_gian_du_kien_start}
                                    />
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className={labelClass}>Mục tiêu đánh giá</label>
                            <div className="relative"><Target size={16} className="absolute left-3 top-2.5 text-gray-400"/><input className={`${inputClass} pl-9`} placeholder="Xác định sự phù hợp của hệ thống quản lý..." value={editingPlan.muc_tieu || ''} onChange={(e) => setEditingPlan({...editingPlan, muc_tieu: e.target.value})}/></div>
                        </div>
                        <div>
                            <label className={labelClass}>Phạm vi đánh giá</label>
                            <div className="relative"><MapPin size={16} className="absolute left-3 top-2.5 text-gray-400"/><input className={`${inputClass} pl-9`} placeholder="Các phòng ban, quy trình liên quan..." value={editingPlan.pham_vi || ''} onChange={(e) => setEditingPlan({...editingPlan, pham_vi: e.target.value})}/></div>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    </div>
  );
};
