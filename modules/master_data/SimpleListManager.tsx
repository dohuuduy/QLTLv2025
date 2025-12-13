
import React, { useState, useMemo } from 'react';
import { DanhMucItem, ColumnDefinition } from '../../types';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/DataTable';
import { Trash2, Pencil, Plus, CheckCircle, XCircle, Link as LinkIcon, X, Layers, Save, Hash } from 'lucide-react';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { upsertCategory, deleteCategory } from '../../services/supabaseService';

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
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DanhMucItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Xác định Loại danh mục dựa vào Title hoặc Props (cần logic tốt hơn trong thực tế, ở đây hardcode tạm dựa vào data)
  // Trong thực tế, ta nên truyền 'type' xuống props
  const guessType = () => {
      // Logic tạm: Dùng title để đoán type
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
    do_dai_so?: number
  }>({ 
    ten: '', 
    thu_tu: 0, 
    parentId: '',
    active: true,
    ma_viet_tat: '',
    ky_tu_noi: '.',
    do_dai_so: 2
  });

  const handleAddNew = () => {
    setEditingItem(null);
    const nextOrder = data.length > 0 ? Math.max(...data.map(i => i.thu_tu || 0)) + 1 : 1;
    setFormState({ 
        ten: '', 
        thu_tu: nextOrder, 
        parentId: '', 
        active: true,
        ma_viet_tat: '',
        ky_tu_noi: '.',
        do_dai_so: 2 
    });
    setIsDrawerOpen(true);
  };

  const handleEdit = (item: DanhMucItem) => {
    setEditingItem({ ...item });
    setFormState({ 
      ten: item.ten, 
      thu_tu: item.thu_tu || 0, 
      parentId: item.parentId || '',
      active: item.active,
      ma_viet_tat: item.ma_viet_tat || '',
      ky_tu_noi: item.ky_tu_noi || '.',
      do_dai_so: item.do_dai_so || 2
    });
    setIsDrawerOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Đại ca có chắc muốn xóa mục này khỏi Database không?')) {
      try {
          await deleteCategory(id);
          onUpdate(data.filter(item => item.id !== id));
      } catch (error) {
          alert("Lỗi khi xóa danh mục!");
      }
    }
  };

  const handleSave = async () => {
    if (!formState.ten.trim()) {
      alert("Vui lòng nhập tên danh mục!");
      return;
    }
    setIsLoading(true);

    const type = guessType();
    const newItem: DanhMucItem = {
        id: editingItem ? editingItem.id : undefined as any, // ID sẽ do DB sinh hoặc dùng tạm nếu update
        ten: formState.ten,
        thu_tu: formState.thu_tu,
        active: formState.active,
        parentId: formState.parentId,
        ...(showDocTypeConfig ? {
            ma_viet_tat: formState.ma_viet_tat?.toUpperCase(),
            ky_tu_noi: formState.ky_tu_noi,
            do_dai_so: formState.do_dai_so
        } : {})
    };

    try {
        await upsertCategory(newItem, type);
        // Vì Supabase có thể sinh ID, trong thực tế ta nên reload lại list.
        // Ở đây cập nhật tạm thời optimistic, giả sử ID nếu create mới là string tạm hoặc reload parent
        // Để đơn giản: reload page hoặc reload data từ cha là tốt nhất.
        // Tạm thời update local:
        const tempItem = { ...newItem, id: newItem.id || Date.now().toString() }; 
        if (editingItem) {
            onUpdate(data.map(item => item.id === editingItem.id ? tempItem : item));
        } else {
            onUpdate([...data, tempItem]);
        }
        setIsDrawerOpen(false);
    } catch (error) {
        alert("Lỗi khi lưu danh mục!");
    } finally {
        setIsLoading(false);
    }
  };

  const toggleActive = async (item: DanhMucItem) => {
      const newItem = { ...item, active: !item.active };
      try {
          await upsertCategory(newItem, guessType());
          onUpdate(data.map(i => i.id === item.id ? newItem : i));
      } catch (error) {
          console.error(error);
      }
  };

  const columns: ColumnDefinition<DanhMucItem>[] = useMemo(() => {
    const cols: ColumnDefinition<DanhMucItem>[] = [
      { key: 'thu_tu', header: 'Thứ tự', visible: true, render: (val) => <span className="text-gray-500 font-mono text-xs">{val || 0}</span> },
      { key: 'ten', header: 'Tên danh mục', visible: true, render: (val) => <span className="font-medium text-gray-800 dark:text-gray-200">{val}</span> },
    ];

    if (showDocTypeConfig) {
        cols.push({
            key: 'ma_viet_tat',
            header: 'Mã & Quy tắc',
            visible: true,
            render: (val, item) => (
                <div className="text-xs">
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{val || '---'}</span>
                    {val && (<span className="text-gray-400 ml-1">(Nối '{item.ky_tu_noi}', {item.do_dai_so} số)</span>)}
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
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity" onClick={() => setIsDrawerOpen(false)} />
          <div className="w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl relative animate-slide-in-right flex flex-col transition-colors border-l border-gray-200 dark:border-slate-800">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50"><h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2"><Layers className="text-primary" /> {editingItem ? 'Cập nhật danh mục' : 'Thêm danh mục mới'}</h2><Button variant="ghost" size="icon" onClick={() => setIsDrawerOpen(false)}><X size={20} /></Button></div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-500 uppercase border-b dark:border-slate-800 pb-1">Thông tin chi tiết</h3>
                <div className="space-y-4">
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Tên hiển thị <span className="text-red-500">*</span></label><input autoFocus className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 ring-primary/20 outline-none transition-all" value={formState.ten} onChange={(e) => setFormState({...formState, ten: e.target.value})} placeholder="Nhập tên danh mục..." onKeyDown={(e) => e.key === 'Enter' && handleSave()}/></div>
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Thứ tự hiển thị</label><input type="number" className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 ring-primary/20 outline-none transition-all" value={formState.thu_tu} onChange={(e) => setFormState({...formState, thu_tu: parseInt(e.target.value) || 0})}/></div>
                  {parentOptions && parentOptions.length > 0 && (<div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{parentLabel}</label><SearchableSelect options={parentOptions} value={formState.parentId} onChange={(val) => setFormState({...formState, parentId: String(val)})} placeholder={`-- Chọn ${parentLabel.toLowerCase()} --`}/></div>)}
                  {showDocTypeConfig && (
                     <div className="pt-2">
                        <h4 className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase border-b border-blue-100 dark:border-blue-900 pb-1 mb-3 flex items-center gap-2"><Hash size={14}/> Cấu hình sinh mã tự động</h4>
                        <div className="grid grid-cols-2 gap-4 bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-100 dark:border-blue-900/30">
                           <div className="col-span-2"><label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Mã viết tắt (Prefix)</label><input className="w-full h-9 px-3 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 uppercase font-mono text-sm" value={formState.ma_viet_tat} onChange={(e) => setFormState({...formState, ma_viet_tat: e.target.value.toUpperCase()})} placeholder="VD: QT, BM, HD..."/></div>
                           <div><label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Ký tự nối</label><select className="w-full h-9 px-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-mono" value={formState.ky_tu_noi} onChange={(e) => setFormState({...formState, ky_tu_noi: e.target.value})}><option value=".">Dấu chấm (.)</option><option value="-">Gạch ngang (-)</option><option value="/">Gạch chéo (/)</option><option value="_">Gạch dưới (_)</option></select></div>
                           <div><label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Độ dài số</label><input type="number" min="1" max="5" className="w-full h-9 px-3 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm" value={formState.do_dai_so} onChange={(e) => setFormState({...formState, do_dai_so: parseInt(e.target.value) || 2})}/></div>
                           <div className="col-span-2"><p className="text-[11px] text-gray-500 italic">Ví dụ: Nếu tài liệu cha là <span className="font-bold">P06</span>, Prefix là <span className="font-bold">QT</span> &rarr; Mã con sẽ là <span className="font-bold">P06.QT01</span></p></div>
                        </div>
                     </div>
                  )}
                  <div className="pt-2"><label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"><div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${formState.active ? 'bg-primary border-primary text-white' : 'bg-white border-gray-400'}`}>{formState.active && <CheckCircle size={14} />}</div><input type="checkbox" className="hidden" checked={formState.active} onChange={() => setFormState({...formState, active: !formState.active})}/><div><p className="text-sm font-bold text-gray-800 dark:text-gray-200">Đang hoạt động</p><p className="text-xs text-gray-500">Bỏ chọn để tạm khóa danh mục này.</p></div></label></div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 sticky bottom-0 flex justify-end gap-3">
               <Button variant="ghost" onClick={() => setIsDrawerOpen(false)}>Hủy bỏ</Button>
               <Button onClick={handleSave} leftIcon={<Save size={16} />} isLoading={isLoading}>Lưu thông tin</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
