
import React, { useState, useMemo, useEffect } from 'react';
import { DanhMucItem, ColumnDefinition } from '../../types';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/DataTable';
import { Modal } from '../../components/ui/Modal';
import { Trash2, Pencil, Plus, CheckCircle, XCircle, Link as LinkIcon, Layers, Hash, FileBox, Network, Minus, ArrowUpDown } from 'lucide-react';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { upsertCategory, deleteCategory } from '../../services/supabaseService';
import { useDialog } from '../../contexts/DialogContext';
import { useToast } from '../../components/ui/Toast';

interface SimpleListManagerProps {
  data: DanhMucItem[];
  onUpdate: (newData: DanhMucItem[]) => void;
  title: string;
  parentOptions?: { value: string; label: string }[];
  parentLabel?: string;
  showDocTypeConfig?: boolean;
}

export const SimpleListManager: React.FC<SimpleListManagerProps> = ({ 
  data, 
  onUpdate, 
  title, 
  parentOptions, 
  parentLabel = "Thuộc danh mục",
  showDocTypeConfig = false
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DanhMucItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const dialog = useDialog();
  const toast = useToast();
  
  const guessType = () => {
      if (title.includes('Loại tài liệu')) return 'LOAI_TAI_LIEU';
      if (title.includes('Phòng ban')) return 'BO_PHAN';
      if (title.includes('Chức vụ')) return 'CHUC_VU';
      if (title.includes('Lĩnh vực')) return 'LINH_VUC';
      if (title.includes('Tiêu chuẩn')) return 'TIEU_CHUAN';
      if (title.includes('Tổ chức')) return 'TO_CHUC_AUDIT';
      if (title.includes('Auditor')) return 'AUDITOR';
      if (title.includes('Loại hình')) return 'LOAI_AUDIT';
      return 'OTHER';
  };

  const [formState, setFormState] = useState<{ 
    ten: string, 
    thu_tu: number, 
    parentId?: string, 
    active: boolean,
    ma_viet_tat?: string,
    ky_tu_noi?: string,
    do_dai_so?: number,
    cap_do?: number
  }>({ 
    ten: '', 
    thu_tu: 0, 
    parentId: '',
    active: true,
    ma_viet_tat: '',
    ky_tu_noi: '.',
    do_dai_so: 2,
    cap_do: 1
  });

  const inputClass = "w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 ring-primary/20 outline-none transition-all text-sm";
  const labelClass = "text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1.5 block";

  const handleAddNew = () => {
    setEditingItem(null);
    setFormState({ 
        ten: '', 
        thu_tu: 1,
        parentId: '', 
        active: true,
        ma_viet_tat: '',
        ky_tu_noi: '.',
        do_dai_so: 2,
        cap_do: 2 
    });
    setIsModalOpen(true);
  };

  // --- AUTO INCREMENT LOGIC (SCOPED) ---
  useEffect(() => {
      if (!isModalOpen) return;

      if (editingItem && editingItem.parentId === formState.parentId) {
          return;
      }

      const siblings = data.filter(i => {
          if (formState.parentId) return i.parentId === formState.parentId;
          return !i.parentId;
      });

      const maxOrder = siblings.length > 0 ? Math.max(...siblings.map(i => i.thu_tu || 0)) : 0;
      
      setFormState(prev => ({
          ...prev,
          thu_tu: maxOrder + 1
      }));

  }, [formState.parentId, isModalOpen, data, editingItem]);

  const handleEdit = (item: DanhMucItem) => {
    setEditingItem({ ...item });
    setFormState({ 
      ten: item.ten, 
      thu_tu: item.thu_tu || 0, 
      parentId: item.parentId || '',
      active: item.active,
      ma_viet_tat: item.ma_viet_tat || '',
      ky_tu_noi: item.ky_tu_noi || '.',
      do_dai_so: item.do_dai_so || 2,
      cap_do: item.cap_do || 2
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await dialog.confirm(
        'Bạn có chắc muốn xóa mục này khỏi Database không?',
        { title: 'Xác nhận xóa danh mục', type: 'error', confirmLabel: 'Xóa' }
    );

    if (confirmed) {
      try {
          await deleteCategory(id);
          onUpdate(data.filter(item => item.id !== id));
          toast.success('Xóa danh mục thành công!');
      } catch (error) {
          toast.error('Lỗi khi xóa danh mục!');
      }
    }
  };

  const handleSave = async () => {
    if (!formState.ten.trim()) {
      dialog.alert("Vui lòng nhập tên danh mục!", { type: 'warning' });
      return;
    }
    setIsLoading(true);

    let itemId = editingItem ? editingItem.id : undefined;
    if (!itemId) {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            itemId = crypto.randomUUID();
        } else {
            itemId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }
    }

    const type = guessType();
    const newItem: DanhMucItem = {
        id: itemId,
        ten: formState.ten,
        thu_tu: formState.thu_tu,
        active: formState.active,
        parentId: formState.parentId,
        ...(showDocTypeConfig ? {
            ma_viet_tat: formState.ma_viet_tat?.toUpperCase(),
            ky_tu_noi: formState.ky_tu_noi,
            do_dai_so: formState.do_dai_so,
            cap_do: formState.cap_do
        } : {})
    };

    try {
        await upsertCategory(newItem, type);
        if (editingItem) {
            onUpdate(data.map(item => item.id === editingItem.id ? newItem : item));
        } else {
            onUpdate([...data, newItem]);
        }
        setIsModalOpen(false);
        toast.success('Lưu danh mục thành công!');
    } catch (error) {
        toast.error("Lỗi khi lưu danh mục!");
    } finally {
        setIsLoading(false);
    }
  };

  const toggleActive = async (item: DanhMucItem) => {
      const newItem = { ...item, active: !item.active };
      try {
          await upsertCategory(newItem, guessType());
          onUpdate(data.map(i => i.id === item.id ? newItem : i));
          toast.success(`Đã ${newItem.active ? 'kích hoạt' : 'khóa'} danh mục: ${item.ten}`);
      } catch (error) {
          console.error(error);
          toast.error("Lỗi cập nhật trạng thái!");
      }
  };

  const adjustNumber = (field: 'thu_tu' | 'cap_do', amount: number) => {
      setFormState(prev => {
          const current = prev[field] || 0;
          const next = current + amount;
          
          if (field === 'cap_do' && (next < 1 || next > 5)) return prev;
          if (field === 'thu_tu' && next < 1) return prev; 

          return { ...prev, [field]: next };
      });
  };

  const columns: ColumnDefinition<DanhMucItem>[] = useMemo(() => {
    const cols: ColumnDefinition<DanhMucItem>[] = [
      { key: 'thu_tu', header: 'Thứ tự', visible: true, render: (val) => <span className="text-gray-500 font-mono text-xs font-bold bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded">{val || 0}</span> },
      { key: 'ten', header: 'Tên danh mục', visible: true, render: (val) => <span className="font-medium text-gray-800 dark:text-gray-200">{val}</span> },
    ];

    if (showDocTypeConfig) {
        cols.push({
            key: 'ma_viet_tat',
            header: 'Mã & Cấp',
            visible: true,
            render: (val, item) => (
                <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{val || '---'}</span>
                    <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-[10px]">Cấp {item.cap_do || '?'}</span>
                </div>
            )
        });
    }

    if (parentOptions && parentOptions.length > 0) {
       cols.push({
         key: 'parentId',
         header: parentLabel,
         visible: true,
         render: (val) => {
            const parentName = parentOptions.find(p => p.value === val)?.label;
            return parentName ? (<span className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded border border-indigo-100 dark:border-indigo-800 w-fit"><LinkIcon size={12} /> {parentName}</span>) : <span className="text-gray-400 italic text-xs">--</span>;
         }
       });
    }

    cols.push(
      { 
        key: 'active', header: 'Trạng thái', visible: true,
        render: (val, item) => (<button onClick={(e) => { e.stopPropagation(); toggleActive(item); }} className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold border transition-colors ${val ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200' : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'}`} title="Click để đổi trạng thái nhanh">{val ? <CheckCircle size={12}/> : <XCircle size={12}/>}{val ? 'Hoạt động' : 'Tạm khóa'}</button>)
      },
      {
        key: 'id', header: 'Thao tác', visible: true,
        render: (_, item) => (<div className="flex gap-1"><Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEdit(item); }}><Pencil size={16} className="text-blue-500"/></Button><Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={16} className="text-red-500"/></Button></div>)
      }
    );

    return cols;
  }, [data, parentOptions, parentLabel, showDocTypeConfig]);

  return (
    <div className="h-full flex flex-col relative">
      <div className="flex-1 overflow-hidden rounded-lg border border-gray-200 dark:border-slate-800 shadow-sm">
        <DataTable data={data} columns={columns} onRowClick={handleEdit} actions={<Button onClick={handleAddNew} leftIcon={<Plus size={16} />} size="sm">Thêm mới</Button>}/>
      </div>
      
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingItem ? 'Cập nhật danh mục' : 'Thêm danh mục mới'} 
        size="md"
        footer={<><Button variant="ghost" onClick={() => setIsModalOpen(false)}>Hủy bỏ</Button><Button onClick={handleSave} isLoading={isLoading}>Lưu thông tin</Button></>}
      >
        <div className="space-y-6 p-2">
            <div className="space-y-4">
                <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-2"><FileBox size={16} className="text-blue-500"/> Thông tin chi tiết</h4>
                
                <div className="space-y-4">
                  <div><label className={labelClass}>Tên hiển thị <span className="text-red-500">*</span></label><input autoFocus className={inputClass} value={formState.ten} onChange={(e) => setFormState({...formState, ten: e.target.value})} placeholder="Nhập tên danh mục..." onKeyDown={(e) => e.key === 'Enter' && handleSave()}/></div>
                  
                  <div>
                      <label className={labelClass}>Thứ tự hiển thị <span className="font-normal text-[10px] text-gray-400 lowercase ml-1">(auto tăng theo nhóm)</span></label>
                      <div className="flex items-center h-10 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 overflow-hidden focus-within:ring-2 ring-primary/20 transition-shadow">
                           <button type="button" onClick={() => adjustNumber('thu_tu', -1)} className="px-3 h-full hover:bg-gray-100 dark:hover:bg-slate-800 border-r border-gray-200 dark:border-slate-700 flex items-center justify-center text-gray-500 transition-colors"><Minus size={14}/></button>
                           <input 
                                type="number" 
                                min="1" 
                                className="flex-1 w-full h-full text-center bg-transparent outline-none text-sm font-bold text-gray-800 dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                                value={formState.thu_tu} 
                                onChange={(e) => setFormState({...formState, thu_tu: parseInt(e.target.value) || 1})}
                           />
                           <button type="button" onClick={() => adjustNumber('thu_tu', 1)} className="px-3 h-full hover:bg-gray-100 dark:hover:bg-slate-800 border-l border-gray-200 dark:border-slate-700 flex items-center justify-center text-gray-500 transition-colors"><Plus size={14}/></button>
                      </div>
                  </div>

                  {parentOptions && parentOptions.length > 0 && (<div><label className={labelClass}>{parentLabel}</label><SearchableSelect options={parentOptions} value={formState.parentId} onChange={(val) => setFormState({...formState, parentId: String(val)})} placeholder={`-- Chọn ${parentLabel.toLowerCase()} --`}/></div>)}
                  
                  {showDocTypeConfig && (
                     <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30">
                        <h4 className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase border-b border-blue-100 dark:border-blue-900 pb-2 mb-3 flex items-center gap-2"><Hash size={14}/> Cấu hình sinh mã tự động</h4>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="col-span-2"><label className={labelClass}>Mã viết tắt (Prefix)</label><input className={`${inputClass} uppercase font-mono`} value={formState.ma_viet_tat} onChange={(e) => setFormState({...formState, ma_viet_tat: e.target.value.toUpperCase()})} placeholder="VD: QT, BM, HD..."/></div>
                           
                           <div><label className={labelClass}>Phân cấp (Level)</label>
                               <div className="flex items-center h-10 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 overflow-hidden focus-within:ring-2 ring-primary/20 transition-shadow">
                                   <button type="button" onClick={() => adjustNumber('cap_do', -1)} className="px-3 h-full hover:bg-gray-100 dark:hover:bg-slate-800 border-r border-gray-200 dark:border-slate-700 flex items-center justify-center text-gray-500 transition-colors"><Minus size={14}/></button>
                                   <input 
                                        type="number" 
                                        min="1" max="5" 
                                        className="flex-1 w-full h-full text-center bg-transparent outline-none text-sm font-bold text-gray-800 dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                                        value={formState.cap_do} 
                                        onChange={(e) => setFormState({...formState, cap_do: parseInt(e.target.value) || 1})}
                                   />
                                   <button type="button" onClick={() => adjustNumber('cap_do', 1)} className="px-3 h-full hover:bg-gray-100 dark:hover:bg-slate-800 border-l border-gray-200 dark:border-slate-700 flex items-center justify-center text-gray-500 transition-colors"><Plus size={14}/></button>
                               </div>
                           </div>
                           
                           <div><label className={labelClass}>Ký tự nối</label><select className={`${inputClass} font-mono`} value={formState.ky_tu_noi} onChange={(e) => setFormState({...formState, ky_tu_noi: e.target.value})}><option value=".">Dấu chấm (.)</option><option value="-">Gạch ngang (-)</option><option value="/">Gạch chéo (/)</option><option value="_">Gạch dưới (_)</option></select></div>
                           
                           <div className="col-span-2"><p className="text-[11px] text-gray-500 italic">Cấp 1: Chính sách/Quy định (Cha). Cấp 2: Quy trình (Con). Cấp 3: Hướng dẫn (Cháu)...</p></div>
                        </div>
                     </div>
                  )}
                  
                  <div className="pt-2"><label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"><div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${formState.active ? 'bg-primary border-primary text-white' : 'bg-white border-gray-400'}`}>{formState.active && <CheckCircle size={14} />}</div><input type="checkbox" className="hidden" checked={formState.active} onChange={() => setFormState({...formState, active: !formState.active})}/><div><p className="text-sm font-bold text-gray-800 dark:text-gray-200">Đang hoạt động</p><p className="text-xs text-gray-500">Bỏ chọn để tạm khóa danh mục này.</p></div></label></div>
                </div>
            </div>
        </div>
      </Modal>
    </div>
  );
};
