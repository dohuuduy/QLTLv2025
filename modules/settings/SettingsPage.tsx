
import React, { useState, useRef } from 'react';
import { Settings, Bell, Database, ShieldAlert, Save, Upload, Download, CheckCircle, Clock, Building, Palette, History } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { MasterDataState, TaiLieu, HoSo, KeHoachDanhGia, BackupData } from '../../types';
import { MOCK_SYSTEM_LOGS } from '../../constants';
import { format } from 'date-fns';

interface SettingsPageProps {
  masterData: MasterDataState;
  documents: TaiLieu[];
  records: HoSo[];
  auditPlans: KeHoachDanhGia[];
  onRestore: (data: BackupData) => void;
}

type SettingsTab = 'general' | 'notifications' | 'backup' | 'logs';

export const SettingsPage: React.FC<SettingsPageProps> = ({ 
  masterData, documents, records, auditPlans, onRestore 
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Mock Local Settings State ---
  const [settings, setSettings] = useState({
    companyName: 'Công Ty Cổ Phần Công Nghệ ISO',
    slogan: 'Chất lượng là danh dự',
    rowsPerPage: 10,
    themeColor: '#3b82f6',
    
    // Notifications
    reviewAlertDays: 30, // Nhắc rà soát trước 30 ngày
    recordExpiryAlertDays: 60, // Nhắc hủy hồ sơ trước 60 ngày
    enableEmailNoti: false,
    enableAppNoti: true,
  });

  // --- Handlers ---
  const handleSaveSettings = () => {
    // In real app, save to Backend/LocalStorage
    alert('Đã lưu cấu hình thành công!');
  };

  const handleBackup = () => {
    const backupData: BackupData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      masterData,
      documents,
      records,
      auditPlans
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `ISO_Backup_${format(new Date(), 'yyyyMMdd_HHmm')}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        // Simple validation
        if (json.masterData && json.documents) {
           if(window.confirm(`Xác nhận khôi phục dữ liệu từ bản sao lưu ngày ${format(new Date(json.timestamp), 'dd/MM/yyyy HH:mm')}? \nLưu ý: Dữ liệu hiện tại sẽ bị thay thế!`)) {
              onRestore(json);
              alert('Khôi phục dữ liệu thành công!');
           }
        } else {
           alert('File backup không hợp lệ!');
        }
      } catch (error) {
        alert('Lỗi đọc file backup!');
        console.error(error);
      }
    };
    reader.readAsText(file);
    // Reset input
    event.target.value = ''; 
  };

  // --- Render Functions ---

  const renderGeneral = () => (
    <div className="space-y-6 animate-fade-in">
       <div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 border-b pb-2 flex items-center gap-2">
             <Building size={20} className="text-blue-500" /> Thông tin doanh nghiệp
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Tên công ty</label>
                <input 
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 ring-primary/20 outline-none"
                  value={settings.companyName}
                  onChange={(e) => setSettings({...settings, companyName: e.target.value})}
                />
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Khẩu hiệu (Slogan)</label>
                <input 
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 ring-primary/20 outline-none"
                  value={settings.slogan}
                  onChange={(e) => setSettings({...settings, slogan: e.target.value})}
                />
             </div>
          </div>
       </div>

       <div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 border-b pb-2 flex items-center gap-2">
             <Palette size={20} className="text-purple-500" /> Giao diện & Hiển thị
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Số dòng hiển thị mặc định</label>
                <select 
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 outline-none"
                  value={settings.rowsPerPage}
                  onChange={(e) => setSettings({...settings, rowsPerPage: parseInt(e.target.value)})}
                >
                   <option value={10}>10 dòng / trang</option>
                   <option value={20}>20 dòng / trang</option>
                   <option value={50}>50 dòng / trang</option>
                </select>
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Màu chủ đạo (Brand Color)</label>
                <div className="flex items-center gap-3">
                   <input 
                     type="color" 
                     className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                     value={settings.themeColor}
                     onChange={(e) => setSettings({...settings, themeColor: e.target.value})}
                   />
                   <span className="text-sm text-gray-500 font-mono">{settings.themeColor}</span>
                </div>
             </div>
          </div>
       </div>
       
       <div className="flex justify-end pt-4">
          <Button onClick={handleSaveSettings} leftIcon={<Save size={16}/>}>Lưu thay đổi</Button>
       </div>
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-6 animate-fade-in">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 border-b pb-2 flex items-center gap-2">
             <Bell size={20} className="text-orange-500" /> Cấu hình cảnh báo ISO
        </h3>
        
        <div className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-xl border border-orange-100 dark:border-orange-800">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                 <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1.5 flex items-center gap-2">
                    <Clock size={16}/> Nhắc hạn rà soát tài liệu trước
                 </label>
                 <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      className="w-20 h-10 px-3 rounded-lg border border-gray-300 dark:border-slate-600 text-center font-bold"
                      value={settings.reviewAlertDays}
                      onChange={(e) => setSettings({...settings, reviewAlertDays: parseInt(e.target.value)})}
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Ngày</span>
                 </div>
                 <p className="text-xs text-gray-500 mt-1">Hệ thống sẽ gửi thông báo và highlight màu vàng khi tài liệu sắp đến hạn rà soát định kỳ.</p>
              </div>

              <div>
                 <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1.5 flex items-center gap-2">
                    <ShieldAlert size={16}/> Nhắc hạn tiêu hủy hồ sơ trước
                 </label>
                 <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      className="w-20 h-10 px-3 rounded-lg border border-gray-300 dark:border-slate-600 text-center font-bold"
                      value={settings.recordExpiryAlertDays}
                      onChange={(e) => setSettings({...settings, recordExpiryAlertDays: parseInt(e.target.value)})}
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Ngày</span>
                 </div>
                 <p className="text-xs text-gray-500 mt-1">Cảnh báo khi hồ sơ lưu trữ sắp hết thời gian quy định.</p>
              </div>
           </div>
        </div>

        <div>
           <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-3">Kênh thông báo</h4>
           <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                 <input 
                   type="checkbox" 
                   className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                   checked={settings.enableAppNoti}
                   onChange={() => setSettings({...settings, enableAppNoti: !settings.enableAppNoti})}
                 />
                 <span className="text-sm text-gray-700 dark:text-gray-300">Thông báo trên ứng dụng (Chuông)</span>
              </label>
              
              <label className="flex items-center gap-3 cursor-pointer">
                 <input 
                   type="checkbox" 
                   className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                   checked={settings.enableEmailNoti}
                   onChange={() => setSettings({...settings, enableEmailNoti: !settings.enableEmailNoti})}
                 />
                 <span className="text-sm text-gray-700 dark:text-gray-300">Gửi Email nhắc nhở</span>
              </label>
           </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={handleSaveSettings} leftIcon={<Save size={16}/>}>Lưu cấu hình</Button>
       </div>
    </div>
  );

  const renderBackup = () => (
    <div className="space-y-6 animate-fade-in">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 border-b pb-2 flex items-center gap-2">
             <Database size={20} className="text-green-500" /> Sao lưu & Khôi phục dữ liệu
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {/* Backup Card */}
           <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 mb-4">
                 <Download size={32} />
              </div>
              <h4 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Sao lưu hệ thống</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                 Xuất toàn bộ dữ liệu (Tài liệu, Hồ sơ, Cấu hình, Danh mục) ra file .JSON để lưu trữ an toàn.
              </p>
              <Button onClick={handleBackup} className="w-full bg-green-600 hover:bg-green-700 text-white">
                 Tải về bản sao lưu
              </Button>
           </div>

           {/* Restore Card */}
           <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
                 <Upload size={32} />
              </div>
              <h4 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Khôi phục dữ liệu</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                 Nhập file .JSON đã sao lưu trước đó để khôi phục lại trạng thái hệ thống.
                 <br/><span className="text-red-500 font-bold text-xs">(Cảnh báo: Dữ liệu hiện tại sẽ bị ghi đè)</span>
              </p>
              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden"
                accept=".json"
                onChange={handleFileChange}
              />
              <Button 
                onClick={() => fileInputRef.current?.click()} 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                 Chọn file phục hồi
              </Button>
           </div>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800 text-sm text-yellow-800 dark:text-yellow-200 mt-4">
           <strong>Lưu ý:</strong> Tính năng này chạy hoàn toàn trên trình duyệt (Client-side). Vui lòng sao lưu định kỳ để tránh mất dữ liệu khi xóa cache trình duyệt.
        </div>
    </div>
  );

  const renderAuditLogs = () => (
     <div className="space-y-4 animate-fade-in h-full flex flex-col">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2 border-b pb-2 flex items-center gap-2">
             <History size={20} className="text-gray-500" /> Nhật ký hệ thống (Audit Logs)
        </h3>
        
        <div className="flex-1 overflow-auto rounded-lg border border-gray-200 dark:border-slate-700">
           <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-slate-800 sticky top-0">
                 <tr>
                    <th className="px-6 py-3">Thời gian</th>
                    <th className="px-6 py-3">Người dùng</th>
                    <th className="px-6 py-3">Hành động</th>
                    <th className="px-6 py-3">Chi tiết</th>
                    <th className="px-6 py-3">IP</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                 {MOCK_SYSTEM_LOGS.map(log => (
                    <tr key={log.id} className="bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800">
                       <td className="px-6 py-3 whitespace-nowrap text-gray-500">
                          {format(new Date(log.thoi_gian), 'dd/MM/yyyy HH:mm:ss')}
                       </td>
                       <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">
                          {log.nguoi_dung}
                       </td>
                       <td className="px-6 py-3">
                          <span className="px-2 py-1 bg-gray-100 dark:bg-slate-700 rounded text-xs font-bold">
                             {log.hanh_dong}
                          </span>
                       </td>
                       <td className="px-6 py-3 text-gray-600 dark:text-gray-400">
                          {log.chi_tiet}
                       </td>
                       <td className="px-6 py-3 text-xs text-gray-400 font-mono">
                          {log.ip}
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
     </div>
  );

  return (
    <div className="flex h-full bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
       {/* Sidebar */}
       <div className="w-64 bg-gray-50 dark:bg-slate-900/50 border-r border-gray-200 dark:border-slate-800 flex flex-col p-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 px-2">Cấu hình</h2>
          <nav className="space-y-1">
             <button 
               onClick={() => setActiveTab('general')}
               className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'general' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-800'}`}
             >
                <Settings size={18} /> Cấu hình chung
             </button>
             <button 
               onClick={() => setActiveTab('notifications')}
               className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'notifications' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-800'}`}
             >
                <Bell size={18} /> Cảnh báo & Thông báo
             </button>
             <button 
               onClick={() => setActiveTab('backup')}
               className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'backup' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-800'}`}
             >
                <Database size={18} /> Sao lưu & Khôi phục
             </button>
             <button 
               onClick={() => setActiveTab('logs')}
               className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'logs' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-800'}`}
             >
                <ShieldAlert size={18} /> Nhật ký hệ thống
             </button>
          </nav>
       </div>

       {/* Content */}
       <div className="flex-1 p-8 overflow-y-auto">
          {activeTab === 'general' && renderGeneral()}
          {activeTab === 'notifications' && renderNotifications()}
          {activeTab === 'backup' && renderBackup()}
          {activeTab === 'logs' && renderAuditLogs()}
       </div>
    </div>
  );
};
