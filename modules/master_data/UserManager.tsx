
import React, { useState, useMemo } from 'react';
import { NhanSu, UserRole, DanhMucItem, ColumnDefinition } from '../../types';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/DataTable';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { Plus, Trash2, Pencil, Shield, User, X, Check } from 'lucide-react';
import { upsertProfile, deleteProfile } from '../../services/supabaseService';

interface UserManagerProps {
  users: NhanSu[];
  departments: DanhMucItem[];
  onUpdate: (newUsers: NhanSu[]) => void;
}

export const UserManager: React.FC<UserManagerProps> = ({ users, departments, onUpdate }) => {
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [editingUser, setEditingUser] = useState<Partial<NhanSu>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleAddNew = () => {
    const nextOrder = users.length > 0 ? Math.max(...users.map(u => u.thu_tu || 0)) + 1 : 1;
    setEditingUser({ roles: ['SOAN_THAO'], thu_tu: nextOrder });
    setViewMode('form');
  };

  const handleEdit = (user: NhanSu) => {
    setEditingUser({ ...user });
    setViewMode('form');
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Đại ca có chắc muốn xóa nhân sự này khỏi hệ thống DB?')) {
      try {
          await deleteProfile(id);
          onUpdate(users.filter(u => u.id !== id));
      } catch (error) {
          alert('Lỗi xóa nhân sự!');
      }
    }
  };

  const handleSave = async () => {
    if (!editingUser.ho_ten) {
      alert("Vui lòng nhập họ tên!");
      return;
    }
    setIsLoading(true);
    
    const roles = editingUser.roles || [];
    const newUser: NhanSu = {
      ...editingUser,
      id: editingUser.id || undefined as any, // ID will be managed
      roles: roles,
    } as NhanSu;
    
    try {
        await upsertProfile(newUser, departments);
        // Optimistic update
        const tempUser = { ...newUser, id: newUser.id || Date.now().toString() };
        if (editingUser.id) {
            onUpdate(users.map(u => u.id === editingUser.id ? tempUser : u));
        } else {
            onUpdate([...users, tempUser]);
        }
        setViewMode('list');
    } catch (error) {
        alert('Lỗi lưu nhân sự!');
    } finally {
        setIsLoading(false);
    }
  };

  const toggleRole = (role: UserRole) => {
    const currentRoles = editingUser.roles || [];
    if (currentRoles.includes(role)) {
      setEditingUser(prev => ({ ...prev, roles: currentRoles.filter(r => r !== role) }));
    } else {
      setEditingUser(prev => ({ ...prev, roles: [...currentRoles, role] }));
    }
  };

  const getRoleBadge = (role: UserRole) => {
    const map = {
      'SOAN_THAO': { label: 'Soạn thảo', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
      'XEM_XET': { label: 'Xem xét', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
      'PHE_DUYET': { label: 'Phê duyệt', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
      'QUAN_TRI': { label: 'Admin', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
    };
    const conf = map[role];
    return <span key={role} className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${conf.color}`}>{conf.label}</span>
  };

  const columns: ColumnDefinition<NhanSu>[] = useMemo(() => [
    { key: 'thu_tu', header: 'Thứ tự', visible: true, render: (val) => <span className="text-gray-500 font-mono text-xs">{val || 0}</span> },
    { key: 'ho_ten', header: 'Họ tên & Email', visible: true, render: (_, item) => (<div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center text-gray-600 dark:text-gray-300 font-bold text-sm">{item.ho_ten.charAt(0)}</div><div><div className="font-bold text-gray-800 dark:text-gray-200">{item.ho_ten}</div><div className="text-xs text-gray-500">{item.email}</div></div></div>) },
    { key: 'chuc_vu', header: 'Chức vụ', visible: true, render: (val) => <span className="text-sm font-medium">{val}</span> },
    { key: 'phong_ban', header: 'Phòng ban', visible: true, render: (val) => <span className="text-sm text-gray-600 dark:text-gray-400">{val}</span> },
    { key: 'roles', header: 'Phân quyền', visible: true, render: (roles: UserRole[]) => (<div className="flex flex-wrap gap-1 max-w-[200px]">{roles.map(r => getRoleBadge(r))}</div>) },
    { key: 'id', header: 'Thao tác', visible: true, render: (_, item) => (<div className="flex gap-1"><Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEdit(item); }}><Pencil size={16} className="text-blue-500"/></Button><Button variant="ghost" size="icon" onClick={(e) => handleDelete(item.id, e)} className="hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={16} className="text-red-500"/></Button></div>) }
  ], [users]);

  const departmentOptions = departments.map(d => ({ value: d.ten, label: d.ten }));

  return (
    <div className="h-full flex flex-col relative">
      <div className="flex-1 overflow-hidden rounded-lg border border-gray-200 dark:border-slate-800 shadow-sm">
        <DataTable title="Danh sách nhân sự" data={users} columns={columns} onRowClick={handleEdit} actions={<Button onClick={handleAddNew} leftIcon={<Plus size={16} />} size="sm">Thêm nhân sự</Button>}/>
      </div>
      {viewMode === 'form' && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity" onClick={() => setViewMode('list')} />
          <div className="w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl relative animate-slide-in-right flex flex-col transition-colors border-l border-gray-200 dark:border-slate-800">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-800"><h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2"><User className="text-primary" /> {editingUser.id ? 'Cập nhật nhân sự' : 'Thêm nhân sự mới'}</h2><Button variant="ghost" size="icon" onClick={() => setViewMode('list')}><X size={20} /></Button></div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-500 uppercase border-b dark:border-slate-800 pb-1">Thông tin cá nhân</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-3"><label className="text-xs font-semibold mb-1 block">Họ và tên <span className="text-red-500">*</span></label><input className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 ring-primary/20 outline-none transition-all" value={editingUser.ho_ten || ''} onChange={e => setEditingUser({...editingUser, ho_ten: e.target.value})} placeholder="Nguyễn Văn A"/></div>
                  <div className="col-span-1"><label className="text-xs font-semibold mb-1 block">Thứ tự</label><input type="number" className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 ring-primary/20 outline-none transition-all text-center" value={editingUser.thu_tu || 0} onChange={e => setEditingUser({...editingUser, thu_tu: parseInt(e.target.value) || 0})}/></div>
                </div>
                <div><label className="text-xs font-semibold mb-1 block">Email</label><input type="email" className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 ring-primary/20 outline-none transition-all" value={editingUser.email || ''} onChange={e => setEditingUser({...editingUser, email: e.target.value})} placeholder="email@company.com"/></div>
              </div>
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-500 uppercase border-b dark:border-slate-800 pb-1">Công việc</h3>
                <div className="grid grid-cols-2 gap-4">
                   <div><label className="text-xs font-semibold mb-1 block">Chức vụ</label><input className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 ring-primary/20 outline-none transition-all" value={editingUser.chuc_vu || ''} onChange={e => setEditingUser({...editingUser, chuc_vu: e.target.value})} placeholder="Trưởng phòng..."/></div>
                   <div><label className="text-xs font-semibold mb-1 block">Phòng ban</label><SearchableSelect options={departmentOptions} value={editingUser.phong_ban} onChange={(val) => setEditingUser({...editingUser, phong_ban: String(val)})} placeholder="-- Chọn --"/></div>
                </div>
              </div>
              <div className="space-y-4">
                 <h3 className="text-sm font-bold text-gray-500 uppercase border-b dark:border-slate-800 pb-1 flex items-center gap-2"><Shield size={14}/> Phân quyền hệ thống</h3>
                 <div className="grid grid-cols-1 gap-2">
                   {[{code: 'SOAN_THAO', label: 'Soạn thảo tài liệu', desc: 'Được phép tạo mới và chỉnh sửa tài liệu.'}, {code: 'XEM_XET', label: 'Xem xét / Góp ý', desc: 'Được phép review tài liệu trước khi duyệt.'}, {code: 'PHE_DUYET', label: 'Phê duyệt cuối cùng', desc: 'Quyền ban hành tài liệu chính thức.'}, {code: 'QUAN_TRI', label: 'Quản trị hệ thống (Admin)', desc: 'Toàn quyền cấu hình hệ thống.'},].map(role => (<div key={role.code} className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${editingUser.roles?.includes(role.code as UserRole) ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'}`} onClick={() => toggleRole(role.code as UserRole)}><div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center ${editingUser.roles?.includes(role.code as UserRole) ? 'bg-primary border-primary text-white' : 'border-gray-400'}`}>{editingUser.roles?.includes(role.code as UserRole) && <Check size={12} />}</div><div><p className="text-sm font-bold text-gray-800 dark:text-gray-200">{role.label}</p><p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{role.desc}</p></div></div>))}
                 </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 sticky bottom-0 flex justify-end gap-3">
               <Button variant="ghost" onClick={() => setViewMode('list')}>Hủy bỏ</Button>
               <Button onClick={handleSave} leftIcon={<Check size={16} />} isLoading={isLoading}>Lưu thông tin</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
