
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MENU_ITEMS, APP_NAME, INITIAL_MASTER_DATA } from './constants'; // Removed MOCK_NOTIFICATIONS
import { Menu, Search, LogOut, X, Sun, Moon, Monitor, FileText, Archive, CalendarDays, ArrowRight } from 'lucide-react';
import { Dashboard } from './modules/dashboard/Dashboard';
import { TaiLieuList } from './modules/tai_lieu/TaiLieuList';
import { MasterDataLayout } from './modules/master_data/MasterDataLayout';
import { ApprovalsPage } from './modules/approvals/ApprovalsPage';
import { HoSoList } from './modules/ho_so/HoSoList';
import { AuditSchedulePage } from './modules/audit/AuditSchedulePage'; 
import { SettingsPage } from './modules/settings/SettingsPage'; 
import { LoginPage } from './modules/auth/LoginPage';
import { MasterDataState, NhanSu, AppNotification, TaiLieu, HoSo, KeHoachDanhGia, BackupData, TrangThaiTaiLieu, TrangThaiHoSo } from './types';
import { fetchMasterDataFromDB, fetchDocumentsFromDB, fetchRecordsFromDB, fetchAuditPlansFromDB, signOut, getCurrentSession } from './services/supabaseService';
import { supabase } from './lib/supabaseClient';
import { DialogProvider } from './contexts/DialogContext';
import { ToastProvider, useToast } from './components/ui/Toast';
import { Tooltip } from './components/ui/Tooltip';
import { useSystemTheme } from './hooks/useTheme';
import { NotificationCenter } from './components/NotificationCenter';
import { differenceInDays, formatDistanceToNow, parseISO, isAfter, subDays } from 'date-fns';
import { vi } from 'date-fns/locale';

const AppContent: React.FC = () => {
  const [session, setSession] = useState<any>(null); // Supabase Session
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false); 
  const [isAiEnabled, setIsAiEnabled] = useState(false); 
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  // Theme Hook
  const { theme, setTheme } = useSystemTheme();
  
  // Toast Hook
  const toast = useToast();

  // Notification State
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

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
      setSession(session);
      if (session && window.location.hash && window.location.hash.includes('access_token')) {
          window.history.replaceState(null, '', window.location.pathname);
          toast.success("Xác thực email thành công!", "Chào mừng");
      }
      if (!session) {
         setDocuments([]);
         setRecords([]);
         setAuditPlans([]);
         setCurrentUser({ id: 'guest', ho_ten: 'Khách', email: '', chuc_vu: '', phong_ban: '', roles: [] });
      } else if (event === 'SIGNED_OUT') {
         toast.info("Đã đăng xuất hệ thống.");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- LOAD DATA WHEN AUTHENTICATED ---
  useEffect(() => {
    if (!session) return;

    const initData = async () => {
      // @ts-ignore
      const apiKey = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) || (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_KEY);
      setIsAiEnabled(!!apiKey);

      const dbMasterData = await fetchMasterDataFromDB();
      let matchedUser: NhanSu | undefined;

      if (dbMasterData) {
        setMasterData(dbMasterData);
        setIsConnected(true);
        const email = session.user.email;
        matchedUser = dbMasterData.nhanSu.find(u => u.email.toLowerCase() === email?.toLowerCase());
      } else {
        setMasterData(INITIAL_MASTER_DATA);
        const email = session.user.email;
        if (email) {
           matchedUser = INITIAL_MASTER_DATA.nhanSu.find(u => u.email.toLowerCase() === email.toLowerCase());
        }
      }

      if (matchedUser) {
          setCurrentUser(matchedUser);
      } else {
          setCurrentUser({
              id: session.user.id,
              ho_ten: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Unknown User',
              email: session.user.email || '',
              chuc_vu: 'N/A',
              phong_ban: 'N/A',
              roles: [] 
          });
      }

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

  // --- REAL-TIME NOTIFICATION GENERATOR ---
  useEffect(() => {
    if (!currentUser.id || currentUser.id === 'guest') return;

    const generateNotifications = () => {
        const newNotifications: AppNotification[] = [];
        const readNotiIds = JSON.parse(localStorage.getItem(`read_notifications_${currentUser.id}`) || '[]');

        // 1. THÔNG BÁO PHÊ DUYỆT (Action Required)
        // Tìm các tài liệu đang chờ duyệt mà user hiện tại có trách nhiệm
        documents.forEach(doc => {
            if (doc.trang_thai === TrangThaiTaiLieu.CHO_DUYET) {
                const isReviewer = doc.nguoi_xem_xet === currentUser.id;
                const isApprover = doc.nguoi_phe_duyet === currentUser.id;
                const isAdmin = currentUser.roles.includes('QUAN_TRI');

                if (isReviewer || isApprover || isAdmin) {
                    const id = `approv_${doc.id}_${doc.ngay_cap_nhat_cuoi}`; // ID unique theo lần update cuối
                    newNotifications.push({
                        id: id,
                        title: 'Yêu cầu xử lý tài liệu',
                        message: `${doc.nguoi_tao ? 'Ai đó' : 'Hệ thống'} đang chờ bạn ${isApprover ? 'phê duyệt' : 'xem xét'} tài liệu: ${doc.ma_tai_lieu}`,
                        time: formatTimeAgo(doc.ngay_cap_nhat_cuoi),
                        read: readNotiIds.includes(id),
                        type: 'warning',
                        linkTo: 'approvals'
                    });
                }
            }
            // Thông báo trả về / từ chối (Dành cho người soạn thảo)
            else if (doc.trang_thai === TrangThaiTaiLieu.SOAN_THAO && doc.nguoi_soan_thao === currentUser.id) {
                // Kiểm tra lịch sử xem có phải vừa bị từ chối không
                const lastAction = doc.lich_su?.[doc.lich_su.length - 1];
                if (lastAction && lastAction.hanh_dong === 'TU_CHOI') {
                     const id = `reject_${doc.id}_${lastAction.thoi_gian}`;
                     newNotifications.push({
                        id: id,
                        title: 'Tài liệu bị trả về',
                        message: `Tài liệu ${doc.ma_tai_lieu} bị từ chối. Lý do: "${lastAction.ghi_chu}"`,
                        time: formatTimeAgo(lastAction.thoi_gian),
                        read: readNotiIds.includes(id),
                        type: 'error',
                        linkTo: 'documents'
                    });
                }
            }
        });

        // 2. THÔNG BÁO BAN HÀNH (Information)
        // Tìm tài liệu mới ban hành trong 7 ngày qua
        const sevenDaysAgo = subDays(new Date(), 7);
        documents.forEach(doc => {
            if (doc.trang_thai === TrangThaiTaiLieu.DA_BAN_HANH && doc.ngay_ban_hanh) {
                if (isAfter(parseISO(doc.ngay_ban_hanh), sevenDaysAgo)) {
                    const id = `publish_${doc.id}`;
                    newNotifications.push({
                        id: id,
                        title: 'Tài liệu mới ban hành',
                        message: `${doc.ma_tai_lieu} - ${doc.ten_tai_lieu} đã có hiệu lực.`,
                        time: formatTimeAgo(doc.ngay_ban_hanh),
                        read: readNotiIds.includes(id),
                        type: 'success',
                        linkTo: 'documents'
                    });
                }
            }
        });

        // 3. THÔNG BÁO HỒ SƠ SẮP HẾT HẠN (Warning)
        // Dành cho người tạo hồ sơ hoặc Admin
        records.forEach(rec => {
            if (rec.trang_thai === TrangThaiHoSo.LUU_TRU && rec.ngay_het_han) {
                const daysLeft = differenceInDays(parseISO(rec.ngay_het_han), new Date());
                if (daysLeft <= 30 && daysLeft >= 0) {
                    if (rec.nguoi_tao === currentUser.id || currentUser.roles.includes('QUAN_TRI')) {
                        const id = `rec_exp_${rec.id}`;
                        newNotifications.push({
                            id: id,
                            title: 'Hồ sơ sắp hết hạn',
                            message: `Hồ sơ "${rec.tieu_de}" sẽ hết hạn lưu trữ trong ${daysLeft} ngày nữa.`,
                            time: 'Hệ thống nhắc',
                            read: readNotiIds.includes(id),
                            type: 'warning',
                            linkTo: 'records'
                        });
                    }
                }
            }
        });

        // 4. LỊCH AUDIT (Info)
        auditPlans.forEach(plan => {
            if (plan.auditor_ids?.includes(currentUser.id) && plan.trang_thai !== 'hoan_thanh') {
                 const id = `audit_${plan.id}`;
                 newNotifications.push({
                    id: id,
                    title: 'Lịch đánh giá sắp tới',
                    message: `Bạn có tham gia đoàn đánh giá: ${plan.ten_ke_hoach}`,
                    time: plan.thoi_gian_du_kien_start ? formatTimeAgo(plan.thoi_gian_du_kien_start) : 'Sắp diễn ra',
                    read: readNotiIds.includes(id),
                    type: 'info',
                    linkTo: 'audit-schedule'
                 });
            }
        });

        setNotifications(newNotifications);
    };

    generateNotifications();
  }, [documents, records, auditPlans, currentUser]);

  // Helper time format
  const formatTimeAgo = (dateStr: string) => {
      try {
          return formatDistanceToNow(parseISO(dateStr), { addSuffix: true, locale: vi });
      } catch (e) { return dateStr; }
  };

  // Sync read status to local storage whenever notifications change (user clicks read)
  useEffect(() => {
      if (!currentUser.id || currentUser.id === 'guest') return;
      const readIds = notifications.filter(n => n.read).map(n => n.id);
      if (readIds.length > 0) {
          // Merge with existing
          const existing = JSON.parse(localStorage.getItem(`read_notifications_${currentUser.id}`) || '[]');
          const unique = Array.from(new Set([...existing, ...readIds]));
          localStorage.setItem(`read_notifications_${currentUser.id}`, JSON.stringify(unique));
      }
  }, [notifications, currentUser.id]);


  const handleLogout = async () => {
      await signOut();
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (searchRef.current && !searchRef.current.contains(target)) {
          setIsSearchOpen(false);
          setIsMobileSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleDashboardFilter = (filters: { trang_thai?: string; bo_phan?: string }) => {
    setDashboardFilters(filters);
    setActiveTab('documents');
  };

  const handleRestoreSystem = (data: BackupData) => {
     if (data.masterData) setMasterData(data.masterData);
     if (data.documents) setDocuments(data.documents);
     if (data.records) setRecords(data.records);
     if (data.auditPlans) setAuditPlans(data.auditPlans);
     toast.success("Dữ liệu đã được khôi phục thành công!");
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

  if (isCheckingAuth) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  if (!session) return <LoginPage />;

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden font-sans">
      
      {/* Sidebar */}
      <aside 
        className={`
          hidden md:flex flex-col flex-none
          ${isSidebarOpen ? 'w-64' : 'w-20'} 
          bg-card border-r border-border
          transition-[width] duration-300 ease-in-out 
          shadow-sm z-40 relative
        `}
      >
        <div className="h-16 flex items-center justify-center border-b border-border bg-muted/20 shrink-0">
           {isSidebarOpen ? <span className="font-bold text-xl tracking-tight text-primary px-4 truncate animate-in fade-in">{APP_NAME}</span> : <span className="font-bold text-xl text-primary">ISO</span>}
        </div>
        
        <nav className="flex-1 py-6 px-3 overflow-y-auto overflow-x-hidden space-y-1">
            {MENU_ITEMS.map((item) => {
              const buttonContent = (
                <button 
                  key={item.path}
                  onClick={() => setActiveTab(item.path)} 
                  className={`w-full flex items-center p-2.5 rounded-md transition-all duration-200 group whitespace-nowrap
                    ${activeTab === item.path 
                      ? 'bg-primary text-primary-foreground shadow-sm font-medium' 
                      : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'
                    }`}
                >
                    <item.icon size={20} className={`min-w-[20px] transition-transform ${isSidebarOpen ? '' : 'mx-auto'}`} />
                    {isSidebarOpen && <span className="ml-3 text-sm opacity-100 transition-opacity duration-300">{item.label}</span>}
                </button>
              );

              // Improved Tooltip for collapsed Sidebar
              return !isSidebarOpen ? (
                <Tooltip key={item.path} content={item.label} position="right" className="w-full">
                  {buttonContent}
                </Tooltip>
              ) : (
                buttonContent
              );
            })}
        </nav>

        <div className="p-4 border-t border-border bg-muted/10 shrink-0 overflow-hidden">
          <div className="flex items-center gap-3">
             <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm shadow-sm border border-border shrink-0">
               {currentUser.ho_ten ? currentUser.ho_ten.charAt(0) : '?'}
             </div>
             {isSidebarOpen && (
               <div className="overflow-hidden">
                 <p className="text-sm font-medium text-foreground truncate">{currentUser.ho_ten}</p>
                 <p className="text-xs text-muted-foreground truncate">{currentUser.email}</p>
               </div>
             )}
          </div>
          {isSidebarOpen && (
             <div className="mt-4 flex flex-col gap-2">
               <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-400'}`}></div>
                  {isConnected ? 'System Online' : 'Offline'}
               </div>
             </div>
           )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden bg-background relative">
        {/* Header */}
        <header className="h-16 bg-background/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 md:px-6 z-30 transition-colors sticky top-0 shrink-0">
          <div className="flex items-center gap-3 flex-1 min-w-0">
             <button className="md:hidden p-2 -ml-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-md" onClick={() => setMobileMenuOpen(true)}>
                <Menu size={20} />
             </button>
             <button className="hidden md:flex p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-md transition-colors" onClick={() => setSidebarOpen(!isSidebarOpen)}>
                <Menu size={20} />
             </button>
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
             {/* THEME TOGGLE */}
             <div className="hidden md:flex bg-muted/50 rounded-full p-1 border border-border">
                <button onClick={() => setTheme('light')} className={`p-1.5 rounded-full transition-all ${theme === 'light' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`} title="Sáng"><Sun size={14} /></button>
                <button onClick={() => setTheme('dark')} className={`p-1.5 rounded-full transition-all ${theme === 'dark' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`} title="Tối"><Moon size={14} /></button>
                <button onClick={() => setTheme('black')} className={`p-1.5 rounded-full transition-all ${theme === 'black' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`} title="AMOLED"><Monitor size={14} /></button>
             </div>

             {/* GLOBAL SEARCH */}
             <div ref={searchRef} className="relative">
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
                <button className="md:hidden p-2 text-muted-foreground hover:bg-accent rounded-full" onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}><Search size={20} /></button>
                {((isSearchOpen && searchTerm) || (isMobileSearchOpen)) && (
                    <div className="absolute top-full right-0 mt-2 w-[calc(100vw-32px)] md:w-[400px] max-w-sm bg-popover text-popover-foreground rounded-lg shadow-lg border border-border overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right z-[80]">
                       <div className="md:hidden p-3 border-b border-border bg-muted/20">
                           <div className="flex items-center bg-background rounded-md px-3 py-2 border border-input">
                               <Search size={16} className="text-muted-foreground shrink-0" />
                               <input type="text" autoFocus placeholder="Tìm tài liệu, hồ sơ..." className="bg-transparent border-none outline-none text-sm ml-2 w-full text-foreground" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                               {searchTerm && <button onClick={() => setSearchTerm('')}><X size={14} className="text-muted-foreground"/></button>}
                           </div>
                       </div>
                       {!hasResults && searchTerm ? (
                           <div className="p-8 text-center text-muted-foreground text-sm flex flex-col items-center"><Search size={32} className="mb-2 opacity-20" /><p>Không tìm thấy kết quả</p></div>
                       ) : searchTerm ? (
                           <div className="max-h-[60vh] overflow-y-auto p-1">
                               {searchResults.docs.length > 0 && (<div className="py-2"><div className="px-3 py-1 text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Tài liệu</div>{searchResults.docs.map(doc => (<div key={doc.id} onClick={() => handleSearchResultClick('documents')} className="px-3 py-2 hover:bg-accent rounded-md cursor-pointer flex items-center gap-3 group transition-colors"><div className="bg-primary/10 text-primary p-1.5 rounded-md"><FileText size={16} /></div><div className="flex-1 overflow-hidden"><p className="text-sm font-medium text-foreground truncate">{doc.ten_tai_lieu}</p><p className="text-xs text-muted-foreground font-mono">{doc.ma_tai_lieu}</p></div><ArrowRight size={14} className="opacity-0 group-hover:opacity-100 text-muted-foreground transition-opacity"/></div>))}</div>)}
                               {searchResults.recs.length > 0 && (<div className="py-2 border-t border-border"><div className="px-3 py-1 text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Hồ sơ</div>{searchResults.recs.map(rec => (<div key={rec.id} onClick={() => handleSearchResultClick('records')} className="px-3 py-2 hover:bg-accent rounded-md cursor-pointer flex items-center gap-3 group transition-colors"><div className="bg-primary/10 text-primary p-1.5 rounded-md"><Archive size={16} /></div><div className="flex-1 overflow-hidden"><p className="text-sm font-medium text-foreground truncate">{rec.tieu_de}</p><p className="text-xs text-muted-foreground font-mono">{rec.ma_ho_so}</p></div><ArrowRight size={14} className="opacity-0 group-hover:opacity-100 text-muted-foreground transition-opacity"/></div>))}</div>)}
                               {searchResults.audits.length > 0 && (<div className="py-2 border-t border-border"><div className="px-3 py-1 text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Kế hoạch Audit</div>{searchResults.audits.map(plan => (<div key={plan.id} onClick={() => handleSearchResultClick('audit-schedule')} className="px-3 py-2 hover:bg-accent rounded-md cursor-pointer flex items-center gap-3 group transition-colors"><div className="bg-primary/10 text-primary p-1.5 rounded-md"><CalendarDays size={16} /></div><div className="flex-1 overflow-hidden"><p className="text-sm font-medium text-foreground truncate">{plan.ten_ke_hoach}</p><p className="text-xs text-muted-foreground">{masterData.loaiDanhGia.find(l => l.id === plan.id_loai_danh_gia)?.ten || plan.id_loai_danh_gia}</p></div><ArrowRight size={14} className="opacity-0 group-hover:opacity-100 text-muted-foreground transition-opacity"/></div>))}</div>)}
                           </div>
                       ) : (<div className="p-4 text-center text-muted-foreground text-xs md:hidden">Nhập từ khóa để tìm kiếm</div>)}
                    </div>
                )}
             </div>

             <div className="flex items-center gap-2">
                {/* Notification Center */}
                <NotificationCenter 
                    notifications={notifications} 
                    setNotifications={setNotifications} 
                    onNavigate={setActiveTab} 
                />
                
                <div className="h-5 w-px bg-border hidden sm:block"></div>
                
                <button onClick={handleLogout} className="flex items-center gap-2 p-2 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-md transition-colors" title="Đăng xuất"><LogOut size={18} /></button>
             </div>
          </div>
        </header>

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-[60] md:hidden">
             <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}></div>
             <div className="absolute left-0 top-0 bottom-0 w-64 bg-card border-r border-border text-card-foreground shadow-2xl p-4 animate-slide-in-left">
                <div className="flex justify-between items-center mb-8 border-b border-border pb-4"><h2 className="text-xl font-bold">{APP_NAME}</h2><button onClick={() => setMobileMenuOpen(false)}><X size={24} className="text-muted-foreground hover:text-foreground" /></button></div>
                <nav><ul className="space-y-2">{MENU_ITEMS.map((item) => (<li key={item.path}><button onClick={() => { setActiveTab(item.path); setMobileMenuOpen(false); }} className={`w-full flex items-center p-3 rounded-md ${activeTab === item.path ? 'bg-primary text-primary-foreground' : 'hover:bg-accent text-muted-foreground'}`}><item.icon size={20} className="mr-3" />{item.label}</button></li>))}</ul></nav>
                <div className="absolute bottom-4 left-4 right-4"><button onClick={handleLogout} className="w-full flex items-center justify-center p-3 rounded-md bg-muted hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors gap-2"><LogOut size={18} /> Đăng xuất</button></div>
             </div>
          </div>
        )}

        <main className="flex-1 overflow-auto p-4 md:p-6 relative text-foreground w-full">
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
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </DialogProvider>
  );
};

export default App;