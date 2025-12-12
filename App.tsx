
import React, { useState, useEffect } from 'react';
import { MENU_ITEMS, APP_NAME, INITIAL_MASTER_DATA, MOCK_NOTIFICATIONS } from './constants';
import { Menu, Bell, Search, LogOut, X, ChevronRight, User, Check, Info, AlertTriangle, CheckCircle, Database, Sparkles } from 'lucide-react';
import { Dashboard } from './modules/dashboard/Dashboard';
import { TaiLieuList } from './modules/tai_lieu/TaiLieuList';
import { MasterDataLayout } from './modules/master_data/MasterDataLayout';
import { ApprovalsPage } from './modules/approvals/ApprovalsPage';
import { HoSoList } from './modules/ho_so/HoSoList';
import { AuditSchedulePage } from './modules/audit/AuditSchedulePage'; 
import { SettingsPage } from './modules/settings/SettingsPage'; 
import { MasterDataState, NhanSu, AppNotification, TaiLieu, HoSo, KeHoachDanhGia, BackupData } from './types';
import { fetchMasterDataFromDB, fetchDocumentsFromDB, fetchRecordsFromDB, fetchAuditPlansFromDB } from './services/supabaseService';

const App: React.FC = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false); // Trạng thái kết nối DB
  const [isAiEnabled, setIsAiEnabled] = useState(false); // Trạng thái AI
  
  // Notification State
  const [notifications, setNotifications] = useState<AppNotification[]>(MOCK_NOTIFICATIONS);
  const [showNotifications, setShowNotifications] = useState(false);

  // Centralized Data State - INIT WITH EMPTY ARRAYS TO FORCE DB FETCH
  const [masterData, setMasterData] = useState<MasterDataState>({
      ...INITIAL_MASTER_DATA,
      loaiTaiLieu: [], boPhan: [], linhVuc: [], tieuChuan: [], nhanSu: [], toChucDanhGia: [], auditors: [], loaiDanhGia: []
  });
  const [documents, setDocuments] = useState<TaiLieu[]>([]); 
  const [records, setRecords] = useState<HoSo[]>([]);         
  const [auditPlans, setAuditPlans] = useState<KeHoachDanhGia[]>([]); 

  // Init user tạm thời để không crash, sau đó sẽ update khi load xong DB
  const [currentUser, setCurrentUser] = useState<NhanSu>({
      id: 'guest', ho_ten: 'Khách', email: '', chuc_vu: '', phong_ban: '', roles: []
  });

  // Dashboard Navigation State
  const [dashboardFilters, setDashboardFilters] = useState<{ trang_thai?: string; bo_phan?: string }>({});

  // --- INIT DATA FROM SUPABASE ---
  useEffect(() => {
    const initData = async () => {
      // 0. Check AI Key
      // @ts-ignore
      const apiKey = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) || (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_KEY);
      setIsAiEnabled(!!apiKey);

      // 1. Tải Master Data (Danh mục, User)
      const dbMasterData = await fetchMasterDataFromDB();
      if (dbMasterData) {
        console.log("✅ [Supabase] Tải Master Data thành công!");
        setMasterData(dbMasterData);
        setIsConnected(true);
        
        // Setup User mặc định từ DB (Ưu tiên Admin)
        if (dbMasterData.nhanSu.length > 0) {
           const admin = dbMasterData.nhanSu.find(u => u.roles.includes('QUAN_TRI'));
           setCurrentUser(admin || dbMasterData.nhanSu[0]);
        }
      } else {
        console.log("ℹ️ [Warning] Không tải được Master Data. Kiểm tra kết nối Supabase.");
        // Fallback nhẹ nếu DB chưa có gì để App không trắng trơn
        setMasterData(INITIAL_MASTER_DATA);
        if(INITIAL_MASTER_DATA.nhanSu.length > 0) setCurrentUser(INITIAL_MASTER_DATA.nhanSu[0]);
      }

      // 2. Tải Dữ liệu nghiệp vụ
      const [dbDocs, dbRecords, dbPlans] = await Promise.all([
         fetchDocumentsFromDB(),
         fetchRecordsFromDB(),
         fetchAuditPlansFromDB()
      ]);

      if (dbDocs) setDocuments(dbDocs);
      if (dbRecords) setRecords(dbRecords);
      if (dbPlans) setAuditPlans(dbPlans);
    };

    initData();
  }, []);

  // Handle click outside notification dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('#notification-container')) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = (notification: AppNotification) => {
    setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));
    if (notification.linkTo) {
      setActiveTab(notification.linkTo);
    }
    setShowNotifications(false);
  };

  const handleDashboardFilter = (filters: { trang_thai?: string; bo_phan?: string }) => {
    setDashboardFilters(filters);
    setActiveTab('documents');
  };

  const handleRestoreSystem = (data: BackupData) => {
     if (data.masterData) setMasterData(data.masterData);
     if (data.documents) setDocuments(data.documents);
     if (data.records) setRecords(data.records);
     if (data.auditPlans) setAuditPlans(data.auditPlans);
  };

  const getPageTitle = () => {
    const item = MENU_ITEMS.find(i => i.path === activeTab);
    return item ? item.label : 'Trang chủ';
  };

  const getPageDescription = () => {
    switch (activeTab) {
      case 'dashboard': return 'Tổng quan tình hình hệ thống';
      case 'documents': return 'Hệ thống văn bản, quy trình, hướng dẫn doanh nghiệp';
      case 'records': return 'Quản lý hồ sơ, bằng chứng và thời gian lưu trữ';
      case 'audit-schedule': return 'Lập kế hoạch và theo dõi lịch đánh giá chất lượng';
      case 'approvals': return 'Danh sách tài liệu cần phê duyệt';
      case 'master-data': return 'Quản lý danh mục dùng chung và phân quyền người dùng';
      case 'settings': return 'Cấu hình hệ thống, sao lưu & khôi phục dữ liệu';
      default: return '';
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onNavigateToDocuments={handleDashboardFilter} />;
      case 'documents':
        return (
          <TaiLieuList 
            masterData={masterData} 
            currentUser={currentUser} 
            initialFilters={dashboardFilters}
            data={documents}           
            onUpdate={setDocuments}    
            records={records}          
          />
        );
      case 'records':
        return (
          <HoSoList 
            masterData={masterData} 
            currentUser={currentUser}
            data={records}             
            onUpdate={setRecords}      
            documents={documents}      
          />
        );
      case 'audit-schedule': 
        return (
          <AuditSchedulePage 
            auditPlans={auditPlans}
            onUpdate={setAuditPlans}
            masterData={masterData}
            documents={documents}
            currentUser={currentUser}
          />
        );
      case 'approvals':
        return (
          <ApprovalsPage 
            currentUser={currentUser} 
            documents={documents}       
            onUpdate={setDocuments}     
          />
        );
      case 'master-data':
        return <MasterDataLayout data={masterData} onUpdate={setMasterData} />;
      case 'settings':
        return (
          <SettingsPage 
            masterData={masterData}
            documents={documents}
            records={records}
            auditPlans={auditPlans}
            onRestore={handleRestoreSystem}
          />
        );
      default:
        return (
          <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
            Tính năng đang phát triển...
          </div>
        );
    }
  };

  const getNotiIcon = (type: string) => {
    switch(type) {
      case 'success': return <CheckCircle size={16} className="text-green-500" />;
      case 'warning': return <AlertTriangle size={16} className="text-orange-500" />;
      case 'error': return <AlertTriangle size={16} className="text-red-500" />;
      default: return <Info size={16} className="text-blue-500" />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-950 text-foreground overflow-hidden transition-colors duration-300">
      
      {/* Sidebar Desktop */}
      <aside 
        className={`${isSidebarOpen ? 'w-64' : 'w-20'} hidden md:flex flex-col bg-slate-900 dark:bg-slate-900 text-slate-100 transition-all duration-300 shadow-xl z-50 border-r border-slate-800`}
      >
        <div className="h-16 flex items-center justify-center border-b border-slate-800">
           {isSidebarOpen ? (
             <span className="font-bold text-xl tracking-wider truncate px-4">{APP_NAME}</span>
           ) : (
             <span className="font-bold text-xl">ISO</span>
           )}
        </div>
        
        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1 px-2">
            {MENU_ITEMS.map((item) => (
              <li key={item.path}>
                <button
                  onClick={() => setActiveTab(item.path)}
                  className={`w-full flex items-center p-3 rounded-lg transition-colors ${
                    activeTab === item.path 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <item.icon size={20} className="min-w-[20px]" />
                  {isSidebarOpen && <span className="ml-3 font-medium">{item.label}</span>}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-400 to-purple-500 flex items-center justify-center font-bold text-white text-xs">
                {currentUser.ho_ten ? currentUser.ho_ten.charAt(0) : '?'}
             </div>
             {isSidebarOpen && (
               <div className="overflow-hidden">
                 <p className="text-sm font-medium truncate">{currentUser.ho_ten || 'Đang tải...'}</p>
                 <p className="text-xs text-slate-400 truncate">{currentUser.chuc_vu || '...'}</p>
               </div>
             )}
          </div>
          
          {/* Connection Status Indicator */}
          {isSidebarOpen && (
             <div className="mt-3 flex flex-col gap-1">
               <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-slate-500">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                  {isConnected ? 'Supabase Connected' : 'DB: Offline/Mock'}
               </div>
               <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-slate-500">
                  <div className={`w-2 h-2 rounded-full ${isAiEnabled ? 'bg-blue-500' : 'bg-gray-500'}`}></div>
                  {isAiEnabled ? 'Gemini AI Ready' : 'AI: No Key'}
               </div>
             </div>
          )}

          {/* USER SWITCHER FOR DEMO (Only show if users loaded) */}
          {isSidebarOpen && masterData.nhanSu.length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-700/50">
              <select 
                className="w-full bg-slate-800 text-xs text-slate-300 rounded p-1 border border-slate-700"
                value={currentUser.id}
                onChange={(e) => {
                  const u = masterData.nhanSu.find(u => u.id === e.target.value);
                  if (u) setCurrentUser(u);
                }}
              >
                {masterData.nhanSu.map(u => (
                  <option key={u.id} value={u.id}>{u.ho_ten} ({u.roles.includes('QUAN_TRI') ? 'Admin' : 'User'})</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Header */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between px-4 md:px-6 shadow-sm z-40 transition-colors relative">
          <div className="flex items-center gap-4 flex-1">
             <button 
               className="md:hidden p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded"
               onClick={() => setMobileMenuOpen(true)}
             >
               <Menu size={24} />
             </button>

             <button 
               className="hidden md:block p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded"
               onClick={() => setSidebarOpen(!isSidebarOpen)}
             >
               <Menu size={20} />
             </button>

             <div className="hidden md:flex flex-col border-l border-gray-200 dark:border-slate-700 pl-4">
                <h1 className="text-base font-bold text-gray-800 dark:text-gray-100 leading-none">{getPageTitle()}</h1>
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate max-w-md">{getPageDescription()}</span>
             </div>
          </div>

          <div className="flex items-center gap-4">
             {/* AI Status Banner (Mobile/Desktop) */}
             {!isAiEnabled && (
                <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-500 rounded-full text-xs border border-amber-100 dark:border-amber-800/30">
                   <Sparkles size={12} className="opacity-50" />
                   <span>AI chưa kích hoạt</span>
                </div>
             )}

             <div className="hidden lg:flex items-center bg-gray-100 dark:bg-slate-800 rounded-full px-3 py-1.5 border border-gray-200 dark:border-slate-700 focus-within:ring-2 ring-primary/20 transition-all w-64">
                <Search size={16} className="text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Tìm kiếm..." 
                  className="bg-transparent border-none outline-none text-sm ml-2 w-full text-gray-700 dark:text-gray-200 placeholder:text-gray-400"
                />
             </div>

             <div className="flex items-center gap-2">
                {/* Notification Bell */}
                <div id="notification-container" className="relative">
                  <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className={`relative p-2 rounded-full transition-colors ${showNotifications ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800'}`}
                  >
                    <Bell size={20} />
                    {unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-slate-900 animate-pulse"></span>
                    )}
                  </button>

                  {/* Dropdown Panel */}
                  {showNotifications && (
                    <div className="absolute right-0 top-full mt-3 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden z-[60] animate-in fade-in slide-in-from-top-2 origin-top-right">
                       <div className="p-3 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
                          <h3 className="font-bold text-sm text-gray-800 dark:text-gray-200">Thông báo</h3>
                          {unreadCount > 0 && (
                            <button 
                              onClick={() => setNotifications(prev => prev.map(n => ({...n, read: true})))}
                              className="text-xs text-blue-600 hover:text-blue-700 font-medium hover:underline"
                            >
                              Đánh dấu đã đọc hết
                            </button>
                          )}
                       </div>
                       <div className="max-h-[60vh] overflow-y-auto">
                          {notifications.length > 0 ? (
                            notifications.map(n => (
                              <div 
                                key={n.id}
                                onClick={() => handleNotificationClick(n)}
                                className={`p-4 border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer transition-colors flex gap-3 ${!n.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                              >
                                 <div className="mt-1 shrink-0">{getNotiIcon(n.type)}</div>
                                 <div className="flex-1">
                                    <div className="flex justify-between items-start mb-1">
                                       <span className={`text-sm font-semibold ${!n.read ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                                         {n.title}
                                       </span>
                                       <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">{n.time}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{n.message}</p>
                                 </div>
                                 {!n.read && <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 self-center"></div>}
                              </div>
                            ))
                          ) : (
                            <div className="p-8 text-center text-gray-400 text-sm">Không có thông báo mới</div>
                          )}
                       </div>
                    </div>
                  )}
                </div>

                <div className="h-6 w-px bg-gray-200 dark:bg-slate-700 hidden sm:block"></div>
                <button className="hidden sm:flex items-center gap-2 p-1 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg transition-colors text-gray-500 dark:text-gray-400">
                  <LogOut size={18} />
                </button>
             </div>
          </div>
        </header>

        {/* Mobile Sidebar */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-[60] md:hidden">
             <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}></div>
             <div className="absolute left-0 top-0 bottom-0 w-64 bg-slate-900 text-white shadow-2xl p-4 animate-slide-in-left">
                <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
                   <h2 className="text-xl font-bold">{APP_NAME}</h2>
                   <button onClick={() => setMobileMenuOpen(false)}><X size={24} className="text-slate-400 hover:text-white" /></button>
                </div>
                <nav>
                  <ul className="space-y-2">
                    {MENU_ITEMS.map((item) => (
                      <li key={item.path}>
                        <button
                          onClick={() => { setActiveTab(item.path); setMobileMenuOpen(false); }}
                          className={`w-full flex items-center p-3 rounded-lg ${
                            activeTab === item.path 
                              ? 'bg-blue-600 text-white' 
                              : 'hover:bg-slate-800 text-slate-300'
                          }`}
                        >
                          <item.icon size={20} className="mr-3" />
                          {item.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </nav>
             </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-4 md:p-6 relative text-gray-800 dark:text-gray-100">
           {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;
