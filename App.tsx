
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
      default: return <div className="flex items-center justify-center h-full text-muted-foreground">Tính năng đang phát triển...</div>;
    }
  };

  const getNotiIcon = (type: string) => {
    switch(type) {
      case 'success': return <CheckCircle size={16} className="text-emerald-500" />;
      case 'warning': return <AlertTriangle size={16} className="text-amber-500" />;
      case 'error': return <AlertTriangle size={16} className="text-rose-500" />;
      default: return <Info size={16} className="text-blue-500" />;
    }
  };

  // --- RENDER LOGIN IF NOT AUTHENTICATED ---
  if (isCheckingAuth) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  if (!session) return <LoginPage />;

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
      
      {/* Sidebar Desktop - Z-INDEX 40 - SHRINK-0 ADDED TO PREVENT SQUASHING */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} hidden md:flex flex-col bg-slate-900 text-slate-200 transition-all duration-300 shadow-xl z-40 border-r border-slate-800 shrink-0 relative`}>
        <div className="h-16 flex items-center justify-center border-b border-slate-800/50 bg-slate-950/20">
           {isSidebarOpen ? <span className="font-bold text-xl tracking-tight text-white px-4 truncate">{APP_NAME}</span> : <span className="font-bold text-xl text-white">ISO</span>}
        </div>
        
        <nav className="flex-1 py-6 px-3 overflow-y-auto space-y-1">
            {MENU_ITEMS.map((item) => (
              <button 
                key={item.path}
                onClick={() => setActiveTab(item.path)} 
                className={`w-full flex items-center p-2.5 rounded-md transition-all duration-200 group
                  ${activeTab === item.path 
                    ? 'bg-primary text-primary-foreground shadow-md font-medium' 
                    : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
                  }`}
              >
                  <item.icon size={20} className={`min-w-[20px] transition-transform ${isSidebarOpen ? '' : 'mx-auto'}`} />
                  {isSidebarOpen && <span className="ml-3 text-sm">{item.label}</span>}
                  
                  {!isSidebarOpen && activeTab === item.path && (
                    <div className="absolute left-16 bg-popover text-popover-foreground px-2 py-1 rounded text-xs shadow-md border whitespace-nowrap z-50 animate-in fade-in slide-in-from-left-2 ml-2">
                        {item.label}
                    </div>
                  )}
              </button>
            ))}
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-950/30">
          <div className="flex items-center gap-3">
             <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-white text-sm shadow-inner border border-white/10">
               {currentUser.ho_ten ? currentUser.ho_ten.charAt(0) : '?'}
             </div>
             {isSidebarOpen && (
               <div className="overflow-hidden">
                 <p className="text-sm font-medium text-slate-200 truncate">{currentUser.ho_ten}</p>
                 <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
               </div>
             )}
          </div>
          {isSidebarOpen && (
             <div className="mt-4 flex flex-col gap-2">
               <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-600'}`}></div>
                  {isConnected ? 'System Online' : 'Offline'}
               </div>
             </div>
           )}
        </div>
      </aside>

      {/* Main Content Area - MIN-W-0 ADDED TO PREVENT FLEX OVERFLOW */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-muted/20 relative min-w-0">
        {/* Header - Z-INDEX 30 */}
        <header className="h-16 bg-background/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 md:px-6 z-30 transition-colors sticky top-0 shrink-0">
          {/* Left: Mobile Menu & Title */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
             <button className="md:hidden p-2 -ml-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-md" onClick={() => setMobileMenuOpen(true)}>
                <Menu size={20} />
             </button>
             <button className="hidden md:flex p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-md transition-colors" onClick={() => setSidebarOpen(!isSidebarOpen)}>
                <Menu size={20} />
             </button>
             
             {/* Title */}
             <div className="flex flex-col border-l border-border pl-4 min-w-0">
                <h1 className="text-base font-semibold text-foreground leading-none truncate">
                    {getPageTitle()}
                </h1>
                <span className="hidden md:block text-xs text-muted-foreground mt-1 truncate">
                    {getPageDescription()}
                </span>
             </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4 shrink-0">
             {/* GLOBAL SEARCH */}
             <div ref={searchRef} className="relative">
                {/* Desktop Search Input */}
                <div className="hidden md:flex items-center bg-muted/50 hover:bg-muted/80 focus-within:bg-background focus-within:ring-2 focus-within:ring-ring rounded-md px-3 py-1.5 border border-transparent focus-within:border-input transition-all w-64">
                   <Search size={16} className="text-muted-foreground shrink-0" />
                   <input 
                      type="text" 
                      placeholder="Tìm kiếm dữ liệu..." 
                      className="bg-transparent border-none outline-none text-sm ml-2 w-full text-foreground placeholder:text-muted-foreground/70" 
                      value={searchTerm} 
                      onChange={(e) => { setSearchTerm(e.target.value); setIsSearchOpen(true); }} 
                      onFocus={() => setIsSearchOpen(true)} 
                   />
                   {searchTerm && <button onClick={() => { setSearchTerm(''); setIsSearchOpen(false); }} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>}
                </div>

                {/* Mobile Search Trigger */}
                <button 
                    className="md:hidden p-2 text-muted-foreground hover:bg-accent rounded-full"
                    onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
                >
                    <Search size={20} />
                </button>

                {/* Search Results Dropdown - Z-INDEX 80 */}
                {((isSearchOpen && searchTerm) || (isMobileSearchOpen)) && (
                    <div className="absolute top-full right-0 mt-2 w-[calc(100vw-32px)] md:w-[400px] max-w-sm bg-popover text-popover-foreground rounded-lg shadow-lg border border-border overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right z-[80]">
                       {/* Mobile Input Field inside Dropdown */}
                       <div className="md:hidden p-3 border-b border-border bg-muted/20">
                           <div className="flex items-center bg-background rounded-md px-3 py-2 border border-input">
                               <Search size={16} className="text-muted-foreground shrink-0" />
                               <input 
                                  type="text" 
                                  autoFocus
                                  placeholder="Tìm tài liệu, hồ sơ..." 
                                  className="bg-transparent border-none outline-none text-sm ml-2 w-full text-foreground" 
                                  value={searchTerm} 
                                  onChange={(e) => setSearchTerm(e.target.value)} 
                               />
                               {searchTerm && <button onClick={() => setSearchTerm('')}><X size={14} className="text-muted-foreground"/></button>}
                           </div>
                       </div>

                       {!hasResults && searchTerm ? (
                           <div className="p-8 text-center text-muted-foreground text-sm flex flex-col items-center">
                              <Search size={32} className="mb-2 opacity-20" />
                              <p>Không tìm thấy kết quả</p>
                           </div>
                       ) : searchTerm ? (
                           <div className="max-h-[60vh] overflow-y-auto p-1">
                               {searchResults.docs.length > 0 && (
                                   <div className="py-2"><div className="px-3 py-1 text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Tài liệu</div>{searchResults.docs.map(doc => (<div key={doc.id} onClick={() => handleSearchResultClick('documents')} className="px-3 py-2 hover:bg-accent rounded-md cursor-pointer flex items-center gap-3 group transition-colors"><div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-1.5 rounded-md"><FileText size={16} /></div><div className="flex-1 overflow-hidden"><p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{doc.ten_tai_lieu}</p><p className="text-xs text-muted-foreground font-mono">{doc.ma_tai_lieu}</p></div><ArrowRight size={14} className="opacity-0 group-hover:opacity-100 text-muted-foreground transition-opacity"/></div>))}</div>
                               )}
                               {searchResults.recs.length > 0 && (
                                   <div className="py-2 border-t border-border"><div className="px-3 py-1 text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Hồ sơ</div>{searchResults.recs.map(rec => (<div key={rec.id} onClick={() => handleSearchResultClick('records')} className="px-3 py-2 hover:bg-accent rounded-md cursor-pointer flex items-center gap-3 group transition-colors"><div className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 p-1.5 rounded-md"><Archive size={16} /></div><div className="flex-1 overflow-hidden"><p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{rec.tieu_de}</p><p className="text-xs text-muted-foreground font-mono">{rec.ma_ho_so}</p></div><ArrowRight size={14} className="opacity-0 group-hover:opacity-100 text-muted-foreground transition-opacity"/></div>))}</div>
                               )}
                               {searchResults.audits.length > 0 && (
                                   <div className="py-2 border-t border-border"><div className="px-3 py-1 text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Kế hoạch Audit</div>{searchResults.audits.map(plan => (<div key={plan.id} onClick={() => handleSearchResultClick('audit-schedule')} className="px-3 py-2 hover:bg-accent rounded-md cursor-pointer flex items-center gap-3 group transition-colors"><div className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 p-1.5 rounded-md"><CalendarDays size={16} /></div><div className="flex-1 overflow-hidden"><p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{plan.ten_ke_hoach}</p><p className="text-xs text-muted-foreground">{plan.loai_danh_gia}</p></div><ArrowRight size={14} className="opacity-0 group-hover:opacity-100 text-muted-foreground transition-opacity"/></div>))}</div>
                               )}
                           </div>
                       ) : (
                           <div className="p-4 text-center text-muted-foreground text-xs md:hidden">Nhập từ khóa để tìm kiếm</div>
                       )}
                    </div>
                )}
             </div>

             <div className="flex items-center gap-2">
                <div id="notification-container" className="relative">
                  <button onClick={() => setShowNotifications(!showNotifications)} className={`relative p-2 rounded-full transition-colors ${showNotifications ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}>
                    <Bell size={20} />
                    {notifications.filter(n => !n.read).length > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full border border-background animate-pulse"></span>}
                  </button>
                  {/* Notifications Dropdown */}
                  {showNotifications && (
                    <div className="absolute right-0 top-full mt-3 w-80 sm:w-96 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-[90] animate-in fade-in slide-in-from-top-2 origin-top-right">
                       <div className="p-3 border-b border-border flex justify-between items-center bg-muted/30"><h3 className="font-semibold text-sm">Thông báo</h3>{notifications.filter(n => !n.read).length > 0 && <button onClick={() => setNotifications(prev => prev.map(n => ({...n, read: true})))} className="text-xs text-primary hover:text-primary/80 font-medium hover:underline">Đánh dấu đã đọc hết</button>}</div>
                       <div className="max-h-[60vh] overflow-y-auto">
                          {notifications.length > 0 ? (
                            notifications.map(n => (
                              <div key={n.id} onClick={() => handleNotificationClick(n)} className={`p-4 border-b border-border last:border-0 hover:bg-muted/50 cursor-pointer transition-colors flex gap-3 ${!n.read ? 'bg-primary/5' : ''}`}>
                                 <div className="mt-0.5 shrink-0">{getNotiIcon(n.type)}</div>
                                 <div className="flex-1"><div className="flex justify-between items-start mb-1"><span className={`text-sm font-medium ${!n.read ? 'text-foreground' : 'text-muted-foreground'}`}>{n.title}</span><span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">{n.time}</span></div><p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p></div>{!n.read && <div className="w-2 h-2 rounded-full bg-primary shrink-0 self-center"></div>}
                              </div>
                            ))
                          ) : (<div className="p-8 text-center text-muted-foreground text-sm">Không có thông báo mới</div>)}
                       </div>
                    </div>
                  )}
                </div>
                
                <div className="h-5 w-px bg-border hidden sm:block"></div>
                
                <button onClick={handleLogout} className="flex items-center gap-2 p-2 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-md transition-colors" title="Đăng xuất">
                  <LogOut size={18} />
                </button>
             </div>
          </div>
        </header>

        {/* Mobile Sidebar - Z-INDEX 60 */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-[60] md:hidden">
             <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}></div>
             <div className="absolute left-0 top-0 bottom-0 w-64 bg-slate-900 text-white shadow-2xl p-4 animate-slide-in-left">
                <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4"><h2 className="text-xl font-bold">{APP_NAME}</h2><button onClick={() => setMobileMenuOpen(false)}><X size={24} className="text-slate-400 hover:text-white" /></button></div>
                <nav><ul className="space-y-2">{MENU_ITEMS.map((item) => (<li key={item.path}><button onClick={() => { setActiveTab(item.path); setMobileMenuOpen(false); }} className={`w-full flex items-center p-3 rounded-md ${activeTab === item.path ? 'bg-primary text-primary-foreground' : 'hover:bg-slate-800 text-slate-300'}`}><item.icon size={20} className="mr-3" />{item.label}</button></li>))}</ul></nav>
                <div className="absolute bottom-4 left-4 right-4"><button onClick={handleLogout} className="w-full flex items-center justify-center p-3 rounded-md bg-slate-800 hover:bg-red-900/50 text-slate-300 hover:text-red-400 transition-colors gap-2"><LogOut size={18} /> Đăng xuất</button></div>
             </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-4 md:p-6 relative text-foreground">
            <div className="max-w-[1600px] mx-auto h-full flex flex-col">
                {renderContent()}
            </div>
        </main>
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
