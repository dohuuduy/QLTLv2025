
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MENU_ITEMS, APP_NAME, INITIAL_MASTER_DATA, MOCK_NOTIFICATIONS } from './constants';
import { Menu, Bell, Search, LogOut, X, ChevronRight, User, Check, Info, AlertTriangle, CheckCircle, Database, Sparkles, FileText, Archive, CalendarDays, ArrowRight } from 'lucide-react';
import { Dashboard } from './modules/dashboard/Dashboard';
import { TaiLieuList } from './modules/tai_lieu/TaiLieuList';
import { MasterDataLayout } from './modules/master_data/MasterDataLayout';
import { ApprovalsPage } from './modules/approvals/ApprovalsPage';
import { HoSoList } from './modules/ho_so/HoSoList';
import { AuditSchedulePage } from './modules/audit/AuditSchedulePage'; 
import { SettingsPage } from './modules/settings/SettingsPage'; 
import { LoginPage } from './modules/auth/LoginPage';
import { MasterDataState, NhanSu, AppNotification, TaiLieu, HoSo, KeHoachDanhGia, BackupData } from './types';
import { fetchMasterDataFromDB, fetchDocumentsFromDB, fetchRecordsFromDB, fetchAuditPlansFromDB, signOut, getCurrentSession } from './services/supabaseService';
import { supabase } from './lib/supabaseClient';
import { DialogProvider } from './contexts/DialogContext';

const AppContent: React.FC = () => {
  const [session, setSession] = useState<any>(null); // Supabase Session
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false); 
  const [isAiEnabled, setIsAiEnabled] = useState(false); 
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  // Notification State
  const [notifications, setNotifications] = useState<AppNotification[]>(MOCK_NOTIFICATIONS);
  const [showNotifications, setShowNotifications] = useState(false);

  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false); // Mobile search
  const searchRef = useRef<HTMLDivElement>(null);

  // Centralized Data State
  const [masterData, setMasterData] = useState<MasterDataState>({
      ...INITIAL_MASTER_DATA,
      loaiTaiLieu: [], boPhan: [], chucVu: [], linhVuc: [], tieuChuan: [], nhanSu: [], toChucDanhGia: [], auditors: [], loaiDanhGia: []
  });
  const [documents, setDocuments] = useState<TaiLieu[]>([]); 
  const [records, setRecords] = useState<HoSo[]>([]);         
  const [auditPlans, setAuditPlans] = useState<KeHoachDanhGia[]>([]); 

  // User State
  const [currentUser, setCurrentUser] = useState<NhanSu>({
      id: 'guest', ho_ten: 'Khách', email: '', chuc_vu: '', phong_ban: '', roles: []
  });

  // Dashboard Navigation State
  const [dashboardFilters, setDashboardFilters] = useState<{ trang_thai?: string; bo_phan?: string }>({});

  // --- AUTH & INIT LOGIC ---
  useEffect(() => {
    // 1. Check Auth Status
    getCurrentSession().then(({ session }) => {
      setSession(session);
      setIsCheckingAuth(false);
    });

    // 2. Listen for Auth Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth Event:", event);
      setSession(session);
      
      // Nếu đăng nhập thành công và URL có chứa hash access_token (do email redirect), hãy làm sạch URL
      if (session && window.location.hash && window.location.hash.includes('access_token')) {
          window.history.replaceState(null, '', window.location.pathname);
      }

      if (!session) {
         // Reset state on logout
         setDocuments([]);
         setRecords([]);
         setAuditPlans([]);
         setCurrentUser({ id: 'guest', ho_ten: 'Khách', email: '', chuc_vu: '', phong_ban: '', roles: [] });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- LOAD DATA WHEN AUTHENTICATED ---
  useEffect(() => {
    if (!session) return;

    const initData = async () => {
      // 0. Check AI Key
      // @ts-ignore
      const apiKey = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) || (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_KEY);
      setIsAiEnabled(!!apiKey);

      // 1. Tải Master Data (Danh mục, User)
      const dbMasterData = await fetchMasterDataFromDB();
      
      let matchedUser: NhanSu | undefined;

      if (dbMasterData) {
        console.log("✅ [Supabase] Tải Master Data thành công!");
        setMasterData(dbMasterData);
        setIsConnected(true);
        
        // Find user by email in Master Data
        const email = session.user.email;
        matchedUser = dbMasterData.nhanSu.find(u => u.email.toLowerCase() === email?.toLowerCase());
      } else {
        console.log("ℹ️ [Warning] Không tải được Master Data. Dùng Mock.");
        setMasterData(INITIAL_MASTER_DATA);
        // Fallback for Mock Mode
        const email = session.user.email;
        if (email) {
           matchedUser = INITIAL_MASTER_DATA.nhanSu.find(u => u.email.toLowerCase() === email.toLowerCase());
        }
      }

      // Set Current User or Default
      if (matchedUser) {
          setCurrentUser(matchedUser);
      } else {
          // If logged in via Supabase but email not in 'nhan_su' table, create a temporary limited user
          setCurrentUser({
              id: session.user.id,
              ho_ten: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Unknown User',
              email: session.user.email || '',
              chuc_vu: 'N/A',
              phong_ban: 'N/A',
              roles: [] // No roles
          });
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
  }, [session]);

  const handleLogout = async () => {
      await signOut();
      // Auth listener will handle state reset
  };

  // Handle click outside notification dropdown & Search
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('#notification-container')) setShowNotifications(false);
      if (searchRef.current && !searchRef.current.contains(target)) {
          setIsSearchOpen(false);
          setIsMobileSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- GLOBAL SEARCH LOGIC ---
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return { docs: [], recs: [], audits: [] };
    const lower = searchTerm.toLowerCase();
    return {
        docs: documents.filter(d => d.ten_tai_lieu.toLowerCase().includes(lower) || d.ma_tai_lieu.toLowerCase().includes(lower)).slice(0, 3),
        recs: records.filter(r => r.tieu_de.toLowerCase().includes(lower) || r.ma_ho_so.toLowerCase().includes(lower)).slice(0, 3),
        audits: auditPlans.filter(a => a.ten_ke_hoach.toLowerCase().includes(lower)).slice(0, 3)
    };
  }, [searchTerm, documents, records, auditPlans]);

  const hasResults = searchResults.docs.length > 0 || searchResults.recs.length > 0 || searchResults.audits.length > 0;

  const handleSearchResultClick = (tab: string) => {
      setActiveTab(tab);
      setIsSearchOpen(false);
      setIsMobileSearchOpen(false);
  };

  const handleNotificationClick = (notification: AppNotification) => {
    setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));
    if (notification.linkTo) setActiveTab(notification.linkTo);
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

  const getPageTitle = () => MENU_ITEMS.find(i => i.path === activeTab)?.label || 'Trang chủ';
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
      case 'dashboard': return <Dashboard onNavigateToDocuments={handleDashboardFilter} />;
      case 'documents': return <TaiLieuList masterData={masterData} currentUser={currentUser} initialFilters={dashboardFilters} data={documents} onUpdate={setDocuments} records={records} />;
      case 'records': return <HoSoList masterData={masterData} currentUser={currentUser} data={records} onUpdate={setRecords} documents={documents} />;
      case 'audit-schedule': return <AuditSchedulePage auditPlans={auditPlans} onUpdate={setAuditPlans} masterData={masterData} documents={documents} currentUser={currentUser} />;
      case 'approvals': return <ApprovalsPage currentUser={currentUser} documents={documents} onUpdate={setDocuments} masterData={masterData} />;
      case 'master-data': return <MasterDataLayout data={masterData} onUpdate={setMasterData} />;
      case 'settings': return <SettingsPage masterData={masterData} documents={documents} records={records} auditPlans={auditPlans} onRestore={handleRestoreSystem} />;
      default: return <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">Tính năng đang phát triển...</div>;
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

  // --- RENDER LOGIN IF NOT AUTHENTICATED ---
  if (isCheckingAuth) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>;
  if (!session) return <LoginPage />;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-950 text-foreground overflow-hidden transition-colors duration-300">
      
      {/* Sidebar Desktop */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} hidden md:flex flex-col bg-slate-900 dark:bg-slate-900 text-slate-100 transition-all duration-300 shadow-xl z-50 border-r border-slate-800`}>
        <div className="h-16 flex items-center justify-center border-b border-slate-800">
           {isSidebarOpen ? <span className="font-bold text-xl tracking-wider truncate px-4">{APP_NAME}</span> : <span className="font-bold text-xl">ISO</span>}
        </div>
        
        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1 px-2">
            {MENU_ITEMS.map((item) => (
              <li key={item.path}>
                <button onClick={() => setActiveTab(item.path)} className={`w-full flex items-center p-3 rounded-lg transition-colors ${activeTab === item.path ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}>
                  <item.icon size={20} className="min-w-[20px]" />
                  {isSidebarOpen && <span className="ml-3 font-medium">{item.label}</span>}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-400 to-purple-500 flex items-center justify-center font-bold text-white text-xs">{currentUser.ho_ten ? currentUser.ho_ten.charAt(0) : '?'}</div>
             {isSidebarOpen && (
               <div className="overflow-hidden">
                 <p className="text-sm font-medium truncate">{currentUser.ho_ten}</p>
                 <p className="text-xs text-slate-400 truncate">{currentUser.email}</p>
               </div>
             )}
          </div>
          {isSidebarOpen && (
             <div className="mt-3 flex flex-col gap-1">
               <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-slate-500">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-500'}`}></div>{isConnected ? 'Connected' : 'Offline'}
               </div>
               <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-slate-500">
                  <div className={`w-2 h-2 rounded-full ${isAiEnabled ? 'bg-blue-500' : 'bg-gray-500'}`}></div>{isAiEnabled ? 'AI Ready' : 'No AI Key'}
               </div>
             </div>
           )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between px-3 md:px-6 shadow-sm z-40 transition-colors relative">
          {/* Left: Mobile Menu & Title */}
          <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
             <button className="md:hidden p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg" onClick={() => setMobileMenuOpen(true)}>
                <Menu size={24} />
             </button>
             <button className="hidden md:block p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg" onClick={() => setSidebarOpen(!isSidebarOpen)}>
                <Menu size={20} />
             </button>
             
             {/* Title - Visible on Mobile now */}
             <div className="flex flex-col border-l-0 md:border-l border-gray-200 dark:border-slate-700 md:pl-4 min-w-0">
                <h1 className="text-sm md:text-base font-bold text-gray-800 dark:text-gray-100 leading-none truncate pr-2">
                    {getPageTitle()}
                </h1>
                <span className="hidden md:block text-xs text-gray-500 dark:text-gray-400 mt-1 truncate max-w-md">
                    {getPageDescription()}
                </span>
             </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4 shrink-0">
             {/* GLOBAL SEARCH */}
             <div ref={searchRef} className="relative">
                {/* Desktop Search Input */}
                <div className="hidden md:flex items-center bg-gray-100 dark:bg-slate-800 rounded-lg px-3 py-1.5 border transition-all w-64">
                   <Search size={16} className="text-gray-400 shrink-0" />
                   <input type="text" placeholder="Tìm nhanh..." className="bg-transparent border-none outline-none text-sm ml-2 w-full text-gray-700 dark:text-gray-200 placeholder:text-gray-400" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setIsSearchOpen(true); }} onFocus={() => setIsSearchOpen(true)} />
                   {searchTerm && <button onClick={() => { setSearchTerm(''); setIsSearchOpen(false); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={14} /></button>}
                </div>

                {/* Mobile Search Trigger */}
                <button 
                    className="md:hidden p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full"
                    onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
                >
                    <Search size={20} />
                </button>

                {/* Search Results Dropdown (Shared for both) */}
                {((isSearchOpen && searchTerm) || (isMobileSearchOpen)) && (
                    <div className="absolute top-full right-0 mt-2 w-[calc(100vw-24px)] md:w-[400px] max-w-sm bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right z-50">
                       {/* Mobile Input Field inside Dropdown */}
                       <div className="md:hidden p-3 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50">
                           <div className="flex items-center bg-white dark:bg-slate-900 rounded-lg px-3 py-2 border border-gray-200 dark:border-slate-700 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
                               <Search size={16} className="text-gray-400 shrink-0" />
                               <input 
                                  type="text" 
                                  autoFocus
                                  placeholder="Tìm tài liệu, hồ sơ..." 
                                  className="bg-transparent border-none outline-none text-sm ml-2 w-full text-gray-700 dark:text-gray-200 placeholder:text-gray-400" 
                                  value={searchTerm} 
                                  onChange={(e) => setSearchTerm(e.target.value)} 
                               />
                               {searchTerm && <button onClick={() => setSearchTerm('')}><X size={14} className="text-gray-400"/></button>}
                           </div>
                       </div>

                       {!hasResults && searchTerm ? (
                           <div className="p-8 text-center text-gray-400 text-sm"><p>Không tìm thấy kết quả cho "{searchTerm}"</p></div>
                       ) : searchTerm ? (
                           <div className="max-h-[60vh] overflow-y-auto">
                               {searchResults.docs.length > 0 && (
                                   <div className="py-2"><div className="px-4 py-1 text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500">Tài liệu</div>{searchResults.docs.map(doc => (<div key={doc.id} onClick={() => handleSearchResultClick('documents')} className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer flex items-start gap-3 group"><div className="mt-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-1.5 rounded"><FileText size={16} /></div><div className="flex-1 overflow-hidden"><p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate group-hover:text-blue-600">{doc.ten_tai_lieu}</p><p className="text-xs text-gray-500 font-mono">{doc.ma_tai_lieu}</p></div><ArrowRight size={14} className="self-center opacity-0 group-hover:opacity-100 text-gray-400 transition-opacity"/></div>))}</div>
                               )}
                               {searchResults.recs.length > 0 && (
                                   <div className="py-2 border-t border-gray-100 dark:border-slate-800"><div className="px-4 py-1 text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500">Hồ sơ</div>{searchResults.recs.map(rec => (<div key={rec.id} onClick={() => handleSearchResultClick('records')} className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer flex items-start gap-3 group"><div className="mt-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 p-1.5 rounded"><Archive size={16} /></div><div className="flex-1 overflow-hidden"><p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate group-hover:text-orange-600">{rec.tieu_de}</p><p className="text-xs text-gray-500 font-mono">{rec.ma_ho_so}</p></div><ArrowRight size={14} className="self-center opacity-0 group-hover:opacity-100 text-gray-400 transition-opacity"/></div>))}</div>
                               )}
                               {searchResults.audits.length > 0 && (
                                   <div className="py-2 border-t border-gray-100 dark:border-slate-800"><div className="px-4 py-1 text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500">Kế hoạch Audit</div>{searchResults.audits.map(plan => (<div key={plan.id} onClick={() => handleSearchResultClick('audit-schedule')} className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer flex items-start gap-3 group"><div className="mt-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 p-1.5 rounded"><CalendarDays size={16} /></div><div className="flex-1 overflow-hidden"><p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate group-hover:text-purple-600">{plan.ten_ke_hoach}</p><p className="text-xs text-gray-500">{plan.loai_danh_gia}</p></div><ArrowRight size={14} className="self-center opacity-0 group-hover:opacity-100 text-gray-400 transition-opacity"/></div>))}</div>
                               )}
                           </div>
                       ) : (
                           // Just opened mobile search, show hint
                           <div className="p-4 text-center text-gray-400 text-xs md:hidden">Nhập từ khóa để tìm kiếm</div>
                       )}
                    </div>
                )}
             </div>

             <div className="flex items-center gap-1 md:gap-2">
                <div id="notification-container" className="relative">
                  <button onClick={() => setShowNotifications(!showNotifications)} className={`relative p-2 rounded-full transition-colors ${showNotifications ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800'}`}>
                    <Bell size={20} />
                    {notifications.filter(n => !n.read).length > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-slate-900 animate-pulse"></span>}
                  </button>
                  {/* Notifications Dropdown */}
                  {showNotifications && (
                    <div className="absolute right-0 top-full mt-3 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden z-[60] animate-in fade-in slide-in-from-top-2 origin-top-right">
                       <div className="p-3 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50"><h3 className="font-bold text-sm text-gray-800 dark:text-gray-200">Thông báo</h3>{notifications.filter(n => !n.read).length > 0 && <button onClick={() => setNotifications(prev => prev.map(n => ({...n, read: true})))} className="text-xs text-blue-600 hover:text-blue-700 font-medium hover:underline">Đánh dấu đã đọc hết</button>}</div>
                       <div className="max-h-[60vh] overflow-y-auto">
                          {notifications.length > 0 ? (
                            notifications.map(n => (
                              <div key={n.id} onClick={() => handleNotificationClick(n)} className={`p-4 border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer transition-colors flex gap-3 ${!n.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                                 <div className="mt-1 shrink-0">{getNotiIcon(n.type)}</div>
                                 <div className="flex-1"><div className="flex justify-between items-start mb-1"><span className={`text-sm font-semibold ${!n.read ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>{n.title}</span><span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">{n.time}</span></div><p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{n.message}</p></div>{!n.read && <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 self-center"></div>}
                              </div>
                            ))
                          ) : (<div className="p-8 text-center text-gray-400 text-sm">Không có thông báo mới</div>)}
                       </div>
                    </div>
                  )}
                </div>
                
                <div className="h-6 w-px bg-gray-200 dark:bg-slate-700 hidden sm:block"></div>
                
                <button onClick={handleLogout} className="flex items-center gap-2 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400" title="Đăng xuất">
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
                <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4"><h2 className="text-xl font-bold">{APP_NAME}</h2><button onClick={() => setMobileMenuOpen(false)}><X size={24} className="text-slate-400 hover:text-white" /></button></div>
                <nav><ul className="space-y-2">{MENU_ITEMS.map((item) => (<li key={item.path}><button onClick={() => { setActiveTab(item.path); setMobileMenuOpen(false); }} className={`w-full flex items-center p-3 rounded-lg ${activeTab === item.path ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-300'}`}><item.icon size={20} className="mr-3" />{item.label}</button></li>))}</ul></nav>
                <div className="absolute bottom-4 left-4 right-4"><button onClick={handleLogout} className="w-full flex items-center justify-center p-3 rounded-lg bg-slate-800 hover:bg-red-900/50 text-slate-300 hover:text-red-400 transition-colors gap-2"><LogOut size={18} /> Đăng xuất</button></div>
             </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-4 md:p-6 relative text-gray-800 dark:text-gray-100">{renderContent()}</main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <DialogProvider>
      <AppContent />
    </DialogProvider>
  );
};

export default App;
