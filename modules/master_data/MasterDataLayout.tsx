
import React, { useState } from 'react';
import { MasterDataState } from '../../types';
import { SimpleListManager } from './SimpleListManager';
import { UserManager } from './UserManager';
import { Database, Users, Layers, Tag, Bookmark, Award, UserCheck, ClipboardList, Briefcase } from 'lucide-react';

interface MasterDataLayoutProps {
  data: MasterDataState;
  onUpdate: (newData: MasterDataState) => void;
}

type TabType = 'users' | 'docTypes' | 'departments' | 'positions' | 'fields' | 'standards' | 'auditOrgs' | 'auditors' | 'auditTypes';

export const MasterDataLayout: React.FC<MasterDataLayoutProps> = ({ data, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<TabType>('users');

  const tabs = [
    { id: 'users', label: 'Người dùng & Quyền', icon: Users },
    { id: 'docTypes', label: 'Loại tài liệu', icon: Layers },
    { id: 'departments', label: 'Phòng ban / Bộ phận', icon: Database },
    { id: 'positions', label: 'Chức vụ', icon: Briefcase }, // New Tab
    { id: 'fields', label: 'Lĩnh vực', icon: Tag },
    { id: 'standards', label: 'Tiêu chuẩn', icon: Bookmark },
    // New Tabs
    { id: 'auditOrgs', label: 'Tổ chức đánh giá', icon: Award },
    { id: 'auditors', label: 'Auditor / Chuyên gia', icon: UserCheck },
    { id: 'auditTypes', label: 'Loại đánh giá', icon: ClipboardList },
  ];

  // Prepare options for Auditor (Parent = Org)
  const orgOptions = (data.toChucDanhGia || []).map(org => ({
      value: org.id,
      label: org.ten
  }));

  return (
    <div className="h-full flex flex-col">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 dark:border-slate-800 mb-6 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'users' && (
          <UserManager 
            users={data.nhanSu} 
            departments={data.boPhan}
            onUpdate={(newUsers) => onUpdate({...data, nhanSu: newUsers})}
          />
        )}
        
        {activeTab === 'docTypes' && (
          <SimpleListManager 
            title="Danh mục Loại tài liệu & Cấu hình mã số"
            data={data.loaiTaiLieu}
            onUpdate={(newData) => onUpdate({...data, loaiTaiLieu: newData})}
            showDocTypeConfig={true} // BẬT CẤU HÌNH AUTO-NUMBERING
          />
        )}

        {activeTab === 'departments' && (
          <SimpleListManager 
            title="Danh mục Phòng ban / Bộ phận"
            data={data.boPhan}
            onUpdate={(newData) => onUpdate({...data, boPhan: newData})}
          />
        )}

        {activeTab === 'positions' && (
          <SimpleListManager 
            title="Danh mục Chức vụ"
            data={data.chucVu || []}
            onUpdate={(newData) => onUpdate({...data, chucVu: newData})}
          />
        )}

        {activeTab === 'fields' && (
          <SimpleListManager 
            title="Danh mục Lĩnh vực"
            data={data.linhVuc}
            onUpdate={(newData) => onUpdate({...data, linhVuc: newData})}
          />
        )}

        {activeTab === 'standards' && (
          <SimpleListManager 
            title="Danh mục Tiêu chuẩn (ISO...)"
            data={data.tieuChuan}
            onUpdate={(newData) => onUpdate({...data, tieuChuan: newData})}
          />
        )}

        {/* NEW TABS CONTENT */}
        {activeTab === 'auditOrgs' && (
          <SimpleListManager 
            title="Danh mục Tổ chức đánh giá"
            data={data.toChucDanhGia || []}
            onUpdate={(newData) => onUpdate({...data, toChucDanhGia: newData})}
          />
        )}

        {activeTab === 'auditors' && (
          <SimpleListManager 
            title="Danh mục Auditor / Chuyên gia đánh giá"
            data={data.auditors || []}
            onUpdate={(newData) => onUpdate({...data, auditors: newData})}
            parentOptions={orgOptions}
            parentLabel="Thuộc tổ chức"
          />
        )}

        {activeTab === 'auditTypes' && (
          <SimpleListManager 
            title="Danh mục Loại hình đánh giá"
            data={data.loaiDanhGia || []}
            onUpdate={(newData) => onUpdate({...data, loaiDanhGia: newData})}
          />
        )}
      </div>
    </div>
  );
};
