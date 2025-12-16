
import React, { useState, useMemo } from 'react';
import { KeHoachDanhGia, MasterDataState, TaiLieu, NhanSu, ColumnDefinition, TrangThaiKeHoach, PhienDanhGia } from '../../types';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/DataTable';
import { Modal } from '../../components/ui/Modal';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { MultiSelect } from '../../components/ui/MultiSelect'; 
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

  const inputClass = "w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 ring-primary/20 outline-none transition-all text-sm";
  const labelClass = "text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1.5 block";

  const getStatusBadge = (status: TrangThaiKeHoach) => {
      const map = {
          'lap_ke_hoach': { label: 'Lập kế hoạch', class: 'bg-gray-100 text-gray-600 border-gray-200' },
          'da_chot': { label: 'Đã chốt lịch', class: 'bg-blue-100 text-blue-600 border-blue-200' },
          'dang_thuc_hien': { label: 'Đang thực hiện', class: 'bg-orange-100 text-orange-600 border-orange-200' },
          'hoan_thanh': { label: 'Hoàn thành', class: 'bg-green-100 text-green-600 border-green-200' },
      };
      const conf = map[status] || { label: status, class: 'bg-gray-100' };
      return <span className={`px-2 py-1 rounded text-xs font-bold border ${conf.class}`}>{conf.label}</span>
  };

  const handleAddNew = () => {
     setEditingPlan({
         trang_thai: 'lap_ke_hoach',
         to_chuc_danh_gia_id: '',
         auditor_ids: [],
         id_loai_danh_gia: '',
         danh_sach_phien: []
     });
     setIsModalOpen(true);
  };

  const handleEdit = (plan: KeHoachDanhGia) => {
      setEditingPlan({ ...plan });
      setIsModalOpen(true);
  };

  const handleSave = async () => {
      // 1. Validate required fields
      if (!editingPlan.ten_ke_hoach || !editingPlan.id_loai_danh_gia) {
          toast.warning("Vui lòng nhập Tên kế hoạch và Loại đánh giá!", "Thiếu thông tin");
          return;
      }

      if (!editingPlan.thoi_gian_du_kien_start || !editingPlan.thoi_gian_du_kien_end) {
          toast.warning("Vui lòng chọn đầy đủ thời gian bắt đầu và kết thúc!", "Thiếu thời gian");
          return;
      }

      // 2. Validate Logic Dates
      if (new Date(editingPlan.thoi_gian_du_kien_start) > new Date(editingPlan.thoi_gian_du_kien_end)) {
          toast.warning("Ngày kết thúc không thể trước ngày bắt đầu!", "Lỗi thời gian");
          return;
      }

      setIsLoading(true);
      
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
          toast.success("Lưu kế hoạch đánh giá thành công!", "Thành công");
      } catch (error) {
          console.error(error);
          toast.error("Lỗi khi lưu kế hoạch, vui lòng thử lại.", "Lỗi hệ thống");
      } finally {
          setIsLoading(false);
      }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const confirmed = await dialog.confirm(
          'Bạn có chắc chắn muốn xóa kế hoạch đánh giá này? Dữ liệu các phiên con cũng sẽ bị mất.', 
          { title: 'Xóa kế hoạch', type: 'error', confirmLabel: 'Xóa vĩnh viễn' }
      );

      if (confirmed) {
          try {
              await deleteAuditPlan(id);
              onUpdate(auditPlans.filter(p => p.id !== id));
              // Changed from toast.success (Green) to toast.info (Blue) for delete action
              toast.info("Đã xóa kế hoạch đánh giá khỏi hệ thống.", "Đã xóa");
          } catch (error) {
              toast.error("Lỗi khi xóa kế hoạch!", "Lỗi hệ thống");
          }
      }
  };

  const columns: ColumnDefinition<KeHoachDanhGia>[] = useMemo(() => [
      { key: 'ten_ke_hoach', header: 'Tên kế hoạch', visible: true, render: (val) => <span className="font-bold text-gray-800 dark:text-gray-200">{val}</span> },
      { key: 'id_loai_danh_gia', header: 'Loại hình', visible: true, render: (val) => <span className="text-sm">{masterData.loaiDanhGia.find(l => l.id === val)?.ten || val}</span> },
      { key: 'thoi_gian_du_kien_start', header: 'Thời gian', visible: true, render: (val, item) => <span className="text-xs font-mono">{format(new Date(val), 'dd/MM')} - {format(new Date(item.thoi_gian_du_kien_end), 'dd/MM/yyyy')}</span> },
      { key: 'trang_thai', header: 'Trạng thái', visible: true, render: (val) => getStatusBadge(val as TrangThaiKeHoach) },
      { key: 'id', header: 'Thao tác', visible: true, render: (_, item) => (
          <div className="flex gap-2">
              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEdit(item); }}><Pencil size={16} className="text-blue-500"/></Button>
              <Button variant="ghost" size="icon" onClick={(e) => handleDelete(item.id, e)} className="hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={16} className="text-red-500"/></Button>
          </div>
      )}
  ], [masterData.loaiDanhGia, auditPlans]);

  const auditTypeOptions = masterData.loaiDanhGia.map(i => ({ value: i.id, label: i.ten }));
  const orgOptions = masterData.toChucDanhGia.map(i => ({ value: i.id, label: i.ten }));
  const auditorOptions = masterData.auditors.map(i => ({ value: i.id, label: i.ten, subLabel: masterData.toChucDanhGia.find(o => o.id === i.parentId)?.ten }));

  return (
      <div className="h-full flex flex-col animate-fade-in space-y-4">
          <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-lg border border-gray-200 dark:border-slate-800 shadow-sm shrink-0">
              <div className="flex gap-2">
                  <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${viewMode === 'list' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800'}`}><List size={16}/> Danh sách</button>
                  <button onClick={() => setViewMode('calendar')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${viewMode === 'calendar' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800'}`}><CalendarDays size={16}/> Lịch biểu</button>
              </div>
              <Button onClick={handleAddNew} leftIcon={<Plus size={16}/>}>Lập kế hoạch</Button>
          </div>

          <div className="flex-1 overflow-hidden rounded-lg border border-gray-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
              {viewMode === 'list' ? (
                  <DataTable data={auditPlans} columns={columns} onRowClick={handleEdit} />
              ) : (
                  <AuditCalendar auditPlans={auditPlans} onEventClick={(plan) => handleEdit(plan)} />
              )}
          </div>

          <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingPlan.id ? 'Cập nhật Kế hoạch' : 'Lập Kế hoạch đánh giá'} size="lg" footer={<><Button variant="ghost" onClick={() => setIsModalOpen(false)}>Hủy bỏ</Button><Button onClick={handleSave} isLoading={isLoading}>Lưu kế hoạch</Button></>}>
              <div className="space-y-6 p-2">
                  <div className="space-y-4">
                      <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-2"><FileBox size={16} className="text-blue-500"/> Thông tin chung</h4>
                      <div className="space-y-4">
                          <div>
                              <label className={labelClass}>Tên đợt đánh giá <span className="text-red-500">*</span></label>
                              <input className={inputClass} value={editingPlan.ten_ke_hoach || ''} onChange={(e) => setEditingPlan({...editingPlan, ten_ke_hoach: e.target.value})} placeholder="VD: Đánh giá nội bộ Q4/2024..." autoFocus/>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className={labelClass}>Loại hình đánh giá <span className="text-red-500">*</span></label>
                                  <SearchableSelect options={auditTypeOptions} value={editingPlan.id_loai_danh_gia} onChange={(val) => setEditingPlan({...editingPlan, id_loai_danh_gia: String(val)})} placeholder="-- Chọn loại --"/>
                              </div>
                              <div>
                                  <label className={labelClass}>Tổ chức thực hiện</label>
                                  <SearchableSelect options={orgOptions} value={editingPlan.to_chuc_danh_gia_id} onChange={(val) => setEditingPlan({...editingPlan, to_chuc_danh_gia_id: String(val)})} placeholder="-- Chọn tổ chức --"/>
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="space-y-4">
                      <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-2"><Calendar size={16} className="text-orange-500"/> Thời gian & Phạm vi</h4>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className={labelClass}>Ngày bắt đầu <span className="text-red-500">*</span></label>
                              <input 
                                type="date" 
                                className={inputClass} 
                                value={editingPlan.thoi_gian_du_kien_start || ''} 
                                onChange={(e) => {
                                    const newVal = e.target.value;
                                    setEditingPlan(prev => ({
                                        ...prev, 
                                        thoi_gian_du_kien_start: newVal,
                                        // Auto-fill End Date if it's currently empty
                                        thoi_gian_du_kien_end: prev.thoi_gian_du_kien_end || newVal 
                                    }))
                                }}
                              />
                          </div>
                          <div>
                              <label className={labelClass}>Ngày kết thúc <span className="text-red-500">*</span></label>
                              <input 
                                type="date" 
                                className={inputClass} 
                                value={editingPlan.thoi_gian_du_kien_end || ''} 
                                onChange={(e) => setEditingPlan({...editingPlan, thoi_gian_du_kien_end: e.target.value})}
                              />
                          </div>
                      </div>
                      <div>
                          <label className={labelClass}>Mục tiêu đánh giá</label>
                          <div className="relative"><Target size={16} className="absolute left-3 top-2.5 text-gray-400"/><input className={`${inputClass} pl-9`} value={editingPlan.muc_tieu || ''} onChange={(e) => setEditingPlan({...editingPlan, muc_tieu: e.target.value})} placeholder="Mục tiêu chính..."/></div>
                      </div>
                      <div>
                          <label className={labelClass}>Phạm vi (Phòng ban/Khu vực)</label>
                          <div className="relative"><MapPin size={16} className="absolute left-3 top-2.5 text-gray-400"/><input className={`${inputClass} pl-9`} value={editingPlan.pham_vi || ''} onChange={(e) => setEditingPlan({...editingPlan, pham_vi: e.target.value})} placeholder="Phòng HCNS, Kế toán..."/></div>
                      </div>
                  </div>

                  <div className="space-y-4">
                      <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-2"><UserCheck size={16} className="text-purple-500"/> Đoàn đánh giá (Audit Team)</h4>
                      <div>
                          <label className={labelClass}>Thành viên đoàn</label>
                          <MultiSelect 
                              options={auditorOptions} 
                              value={editingPlan.auditor_ids || []} 
                              onValueChange={(val) => setEditingPlan({...editingPlan, auditor_ids: val})} 
                              placeholder="Chọn các chuyên gia..."
                          />
                      </div>
                  </div>
              </div>
          </Modal>
      </div>
  );
};
