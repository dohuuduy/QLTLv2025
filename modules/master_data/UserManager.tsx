
import React, { useState, useMemo } from 'react';
import { NhanSu, UserRole, DanhMucItem, ColumnDefinition } from '../../types';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/DataTable';
import { Modal } from '../../components/ui/Modal';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { Plus, Trash2, Pencil, Shield, User, Check, Lock, Info, FileBox, Minus } from 'lucide-react';
import { upsertProfile, deleteProfile, signUpNewUser } from '../../services/supabaseService';
import { useDialog } from '../../contexts/DialogContext';

interface UserManagerProps {
  users: NhanSu[];
  departments: DanhMucItem[];
  positions: DanhMucItem[];
  onUpdate: (newUsers: NhanSu[]) => void;
}

export const UserManager: React.FC<UserManagerProps> = ({ users, departments, positions, onUpdate }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<NhanSu>>({});
  const [password, setPassword] = useState('');
  const [createAuthUser, setCreateAuthUser] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const dialog = useDialog();

  // Unified Styles (Fixed Dark Mode)
  const inputClass = "w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 ring-primary/20 outline-none transition-all text-sm";
  const labelClass = "text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1.5 block";

  const handleAddNew = () => {
    const nextOrder = users.length > 0 ? Math.max(...users.map(u => u.thu_tu || 0)) + 1 : 1;
    setEditingUser({ roles: ['SOAN_THAO'], thu_tu: nextOrder });
    setPassword('');
    setCreateAuthUser(true);
    setIsModalOpen(true);
  };

  const handleEdit = (user: NhanSu) => {
    setEditingUser({ ...user });
    setPassword('');
    setCreateAuthUser(false);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await dialog.confirm(
        <>Hành động này sẽ xóa thông tin hồ sơ nhân sự trong Database.<br/>Tài khoản đăng nhập (Auth) sẽ không tự động xóa.<br/><br/>Bạn có chắc muốn tiếp tục?</>,
        { title: 'Cảnh báo xóa nhân sự', type: 'warning', confirmLabel: 'Xóa' }
    );

    if (confirmed) {
      try {
          await deleteProfile(id);
          onUpdate(users.filter(u => u.id !== id));
          dialog.alert('Xóa nhân sự thành công!', { type: 'success' });
      } catch (error) {
          dialog.alert('Lỗi xóa nhân sự!', { type: 'error' });
      }
    }
  };

  const handleSave = async () => {
    if (!editingUser.ho_ten) {
      dialog.alert("Vui lòng nhập họ tên!", { type: 'warning' });
      return;
    }
    
    if (!editingUser.id && createAuthUser) {
        if (!editingUser.email) {
            dialog.alert("Vui lòng nhập Email để tạo tài khoản!", { type: 'warning' });
            return;
        }
        if (!password || password.length < 6) {
            dialog.alert("Mật khẩu phải có ít nhất 6 ký tự!", { type: 'warning' });
            return;
        }
    }

    setIsLoading(true);
    
    try {
        let userId = editingUser.id;

        if (!userId && createAuthUser) {
            const { data, error } = await signUpNewUser(editingUser.email!, password, {
                full_name: editingUser.ho_ten,
                roles: editingUser.roles
            });

            if (error) {
                dialog.alert("Lỗi tạo tài khoản đăng nhập: " + error.message, { type: 'error' });
                setIsLoading(false);
                return;
            }

            if (data.user) {
                userId = data.user.id;
            } else {
                dialog.alert("Đã gửi yêu cầu tạo tài khoản. Nếu Supabase bật Confirm Email, vui lòng kiểm tra hộp thư.", { type: 'info' });
                if (!data.user) {
                     setIsLoading(false);
                     return;
                }
            }
        } 
        else if (!userId) {
            userId = `temp_${Date.now()}`;
        }

        const roles = editingUser.roles || [];
        const newUser: NhanSu = {
          ...editingUser,
          id: userId!,
          roles: roles,
        } as NhanSu;

        await upsertProfile(newUser, departments, positions);
        
        if (editingUser.id) {
            onUpdate(users.map(u => u.id === editingUser.id ? newUser : u));
        } else {
            onUpdate([...users, newUser]);
        }
        
        setIsModalOpen(false);
        dialog.alert('Lưu nhân sự thành công!', { type: 'success' });
    } catch (error: any) {
        console.error(error);
        dialog.alert('Lỗi lưu nhân sự: ' + error.message, { type: 'error' });
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

  const adjustOrder = (amount: number) => {
      setEditingUser(prev => ({
          ...prev,
          thu_tu: Math.max(0, (prev.thu_tu || 0) + amount)
      }));
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
    { key: 'thu_tu', header: 'Thứ tự', visible: true, render: (val) => <span className="text-gray-500 font-mono text-xs font-bold bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded">{val || 0}</span> },
    { key: 'ho_ten', header: 'Họ tên & Email', visible: true, render: (_, item) => (<div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center text-gray-600 dark:text-gray-300 font-bold text-sm">{item.ho_ten.charAt(0)}</div><div><div className="font-bold text-gray-800 dark:text-gray-200">{item.ho_ten}</div><div className="text-xs text-gray-500">{item.email}</div></div></div>) },
    { key: 'chuc_vu', header: 'Chức vụ', visible: true, render: (val) => <span className="text-sm font-medium">{val}</span> },
    { key: 'phong_ban', header: 'Phòng ban', visible: true, render: (val) => <span className="text-sm text-gray-600 dark:text-gray-400">{val}</span> },
    { key: 'roles', header: 'Phân quyền', visible: true, render: (roles: UserRole[]) => (<div className="flex flex-wrap gap-1 max-w-[200px]">{roles.map(r => getRoleBadge(r))}</div>) },
    { key: 'id', header: 'Thao tác', visible: true, render: (_, item) => (<div className="flex gap-1"><Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEdit(item); }}><Pencil size={16} className="text-blue-500"/></Button><Button variant="ghost" size="icon" onClick={(e) => handleDelete(item.id, e)} className="hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={16} className="text-red-500"/></Button></div>) }
  ], [users]);

  const departmentOptions = departments.map(d => ({ value: d.ten, label: d.ten }));
  const positionOptions = positions.map(p => ({ value: p.ten, label: p.ten }));

  return (
    <div className="h-full flex flex-col relative">
      <div className="flex-1 overflow-hidden rounded-lg border border-gray-200 dark:border-slate-800 shadow-sm">
        <DataTable data={users} columns={columns} onRowClick={handleEdit} actions={<Button onClick={handleAddNew} leftIcon={<Plus size={16} />} size="sm">Thêm nhân sự</Button>}/>
      </div>
      
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingUser.id ? 'Cập nhật nhân sự' : 'Thêm nhân sự mới'} 
        size="md"
        footer={<><Button variant="ghost" onClick={() => setIsModalOpen(false)}>Hủy bỏ</Button><Button onClick={handleSave} isLoading={isLoading}>Lưu thông tin</Button></>}
      >
        <div className="space-y-6 p-2">
              {/* Account Info Section */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-2"><User size={16} className="text-blue-500"/> Tài khoản & Đăng nhập</h4>
                <div className="space-y-3">
                    <div><label className={labelClass}>Email (Tên đăng nhập) <span className="text-red-500">*</span></label><input type="email" className={inputClass} value={editingUser.email || ''} onChange={e => setEditingUser({...editingUser, email: e.target.value})} placeholder="email@company.com" disabled={!!editingUser.id}/></div>
                    
                    {!editingUser.id && (
                        <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
                            <label className="flex items-center gap-2 cursor-pointer mb-2">
                                <input type="checkbox" checked={createAuthUser} onChange={() => setCreateAuthUser(!createAuthUser)} className="rounded text-primary focus:ring-primary"/>
                                <span className="text-sm font-bold text-blue-800 dark:text-blue-300">Tạo tài khoản đăng nhập (Auth)</span>
                            </label>
                            {createAuthUser && (
                                <div className="space-y-2 animate-in slide-in-from-top-1">
                                    <label className={labelClass}>Mật khẩu khởi tạo <span className="text-red-500">*</span></label>
                                    <div className="relative"><Lock size={14} className="absolute left-3 top-2.5 text-gray-400"/><input type="password" className={`${inputClass} pl-9`} value={password} onChange={e => setPassword(e.target.value)} placeholder="Nhập mật khẩu (min 6 ký tự)"/></div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-2"><FileBox size={16} className="text-green-500"/> Thông tin cá nhân</h4>
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-3"><label className={labelClass}>Họ và tên <span className="text-red-500">*</span></label><input className={inputClass} value={editingUser.ho_ten || ''} onChange={e => setEditingUser({...editingUser, ho_ten: e.target.value})} placeholder="Nguyễn Văn A"/></div>
                  
                  {/* Updated Order Input */}
                  <div className="col-span-1">
                      <label className={labelClass}>Thứ tự</label>
                      <div className="flex items-center h-10 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 overflow-hidden focus-within:ring-2 ring-primary/20 transition-shadow">
                           <button type="button" onClick={() => adjustOrder(-1)} className="px-2 h-full hover:bg-gray-100 dark:hover:bg-slate-800 border-r border-gray-200 dark:border-slate-700 flex items-center justify-center text-gray-500 transition-colors"><Minus size={12}/></button>
                           <input 
                                type="number" 
                                min="0"
                                className="flex-1 w-full h-full text-center bg-transparent outline-none text-sm font-bold text-gray-800 dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                                value={editingUser.thu_tu || 0} 
                                onChange={(e) => setEditingUser({...editingUser, thu_tu: parseInt(e.target.value) || 0})}
                           />
                           <button type="button" onClick={() => adjustOrder(1)} className="px-2 h-full hover:bg-gray-100 dark:hover:bg-slate-800 border-l border-gray-200 dark:border-slate-700 flex items-center justify-center text-gray-500 transition-colors"><Plus size={12}/></button>
                      </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-2"><User size={16} className="text-orange-500"/> Công việc</h4>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                        <label className={labelClass}>Chức vụ</label>
                        <SearchableSelect options={positionOptions} value={editingUser.chuc_vu} onChange={(val) => setEditingUser({...editingUser, chuc_vu: String(val)})} placeholder="-- Chọn chức vụ --"/>
                   </div>
                   <div><label className={labelClass}>Phòng ban</label><SearchableSelect options={departmentOptions} value={editingUser.phong_ban} onChange={(val) => setEditingUser({...editingUser, phong_ban: String(val)})} placeholder="-- Chọn --"/></div>
                </div>
              </div>
              <div className="space-y-4">
                 <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-2"><Shield size={16} className="text-red-500"/> Phân quyền hệ thống</h4>
                 <div className="grid grid-cols-1 gap-2">
                   {[{code: 'SOAN_THAO', label: 'Soạn thảo tài liệu', desc: 'Được phép tạo mới và chỉnh sửa tài liệu.'}, {code: 'XEM_XET', label: 'Xem xét / Góp ý', desc: 'Được phép review tài liệu trước khi duyệt.'}, {code: 'PHE_DUYET', label: 'Phê duyệt cuối cùng', desc: 'Quyền ban hành tài liệu chính thức.'}, {code: 'QUAN_TRI', label: 'Quản trị hệ thống (Admin)', desc: 'Toàn quyền cấu hình hệ thống.'},].map(role => (<div key={role.code} className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${editingUser.roles?.includes(role.code as UserRole) ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'}`} onClick={() => toggleRole(role.code as UserRole)}><div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center ${editingUser.roles?.includes(role.code as UserRole) ? 'bg-primary border-primary text-white' : 'border-gray-400'}`}>{editingUser.roles?.includes(role.code as UserRole) && <Check size={12} />}</div><div><p className="text-sm font-bold text-gray-800 dark:text-gray-200">{role.label}</p><p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{role.desc}</p></div></div>))}
                 </div>
              </div>
        </div>
      </Modal>
    </div>
  );
};
