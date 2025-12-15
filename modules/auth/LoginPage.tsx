
import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { signIn, signUpNewUser, upsertProfile, checkSystemHasAdmin } from '../../services/supabaseService';
import { ShieldCheck, Mail, Lock, Loader2, Wrench, Key, Eye, EyeOff, CheckCircle2, XCircle, ArrowRight, Headset, ShieldAlert } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

type VerificationStatus = 'idle' | 'verifying' | 'success' | 'error';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false); 
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // UI States
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Verification State
  const [verifyStatus, setVerifyStatus] = useState<VerificationStatus>('idle');
  const [verifyMessage, setVerifyMessage] = useState('');

  const [hasAdminAccount, setHasAdminAccount] = useState(true);
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [setupToken, setSetupToken] = useState('');
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);

  useEffect(() => {
      const initPage = async () => {
          // 0. Check URL Hash for Auth Token (Email Confirmation Redirect)
          if (window.location.hash && window.location.hash.includes('access_token')) {
              setVerifyStatus('verifying');
              setVerifyMessage('Đang xác minh thông tin xác thực...');
              
              // Lắng nghe sự kiện đăng nhập thành công từ Supabase
              const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
                  if (event === 'SIGNED_IN' && session) {
                      setVerifyStatus('success');
                      setVerifyMessage('Xác thực thành công! Đang chuyển hướng...');
                      // App.tsx sẽ tự động switch sang màn hình chính khi session thay đổi
                  } else if (event === 'rsigned' || event === 'USER_UPDATED') {
                      // Các event khác nếu cần handle
                  }
              });

              // Timeout safety (nếu token lỗi hoặc hết hạn mà ko trigger event)
              setTimeout(() => {
                  if (verifyStatus === 'verifying') {
                      // Kiểm tra lại session lần nữa
                      supabase.auth.getSession().then(({ data }) => {
                          if (!data.session) {
                              setVerifyStatus('error');
                              setVerifyMessage('Liên kết xác thực không hợp lệ hoặc đã hết hạn.');
                          }
                      });
                  }
              }, 10000); // 10s timeout

              return () => {
                  authListener.subscription.unsubscribe();
              };
          }

          // 1. Check saved email
          const savedEmail = localStorage.getItem('iso_remember_email');
          if (savedEmail) {
              setEmail(savedEmail);
              setRememberMe(true);
          }

          // 2. Check system admins
          const adminExists = await checkSystemHasAdmin();
          setHasAdminAccount(adminExists);
      };
      initPage();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
        setError("Vui lòng nhập đầy đủ Email và Mật khẩu");
        return;
    }
    
    setIsLoading(true);
    setError(null);

    const { error: authError } = await signIn(email, password);
    
    if (authError) {
        setError(authError.message === "Invalid login credentials" 
            ? "Email hoặc mật khẩu không chính xác." 
            : "Lỗi đăng nhập: " + authError.message);
        setIsLoading(false);
    } else {
        if (rememberMe) {
            localStorage.setItem('iso_remember_email', email);
        } else {
            localStorage.removeItem('iso_remember_email');
        }
    }
  };

  const handleQuickSetupAdmin = async () => {
      // Safe Env Access logic updated
      let envToken = '';
      try {
          // Check for Vite env
          // @ts-ignore
          const meta: any = import.meta;
          if (meta && meta.env && meta.env.VITE_ADMIN_SETUP_TOKEN) {
              envToken = meta.env.VITE_ADMIN_SETUP_TOKEN;
          } 
          // Fallback to process.env (Node/CRA compat)
          // @ts-ignore
          else if (typeof process !== 'undefined' && process.env) {
              // @ts-ignore
              envToken = process.env.VITE_ADMIN_SETUP_TOKEN || process.env.REACT_APP_ADMIN_SETUP_TOKEN;
          }
      } catch (e) {
          console.error("Error accessing env vars", e);
      }

      if (!envToken) {
          setError("Lỗi cấu hình: Chưa thiết lập VITE_ADMIN_SETUP_TOKEN trong biến môi trường. Vui lòng liên hệ Dev.");
          return;
      }

      if (setupToken !== envToken) {
          setError("Mã bảo mật cài đặt không chính xác!");
          return;
      }
      
      if (!window.confirm("Hành động này sẽ tạo (hoặc nâng quyền) tài khoản 'admin@iso.com' thành Quản trị viên (Admin).\n\nTiếp tục?")) return;
      
      setIsCreatingAdmin(true);
      setError(null);

      try {
          const email = "admin@iso.com";
          const password = "admin123"; 

          const { data, error: authError } = await signUpNewUser(email, password, {
              full_name: "Super Admin",
              roles: ["QUAN_TRI"]
          });

          if (authError && !authError.message.includes("already registered")) {
              throw authError;
          }

          let userId = data.user?.id;

          if (!userId) {
              const { data: loginData, error: loginError } = await signIn(email, password);
              if (loginError) throw new Error("Tài khoản 'admin@iso.com' đã tồn tại nhưng sai mật khẩu.");
              userId = loginData.user?.id;
          }

          if (!userId) throw new Error("Không lấy được User ID.");

          await upsertProfile({
              id: userId,
              ho_ten: "Super Admin",
              email: email,
              chuc_vu: "Quản trị viên hệ thống",
              phong_ban: "Ban ISO", 
              roles: ['QUAN_TRI', 'PHE_DUYET', 'XEM_XET', 'SOAN_THAO'],
              thu_tu: 0,
              avatar: ""
          }, [], []);

          alert(`✅ Cấu hình thành công!\nEmail: ${email}\nPass: ${password}\n\nVui lòng đăng nhập ngay.`);
          setEmail(email);
          setPassword(password);
          setIsSetupMode(false); 
          setHasAdminAccount(true);

      } catch (err: any) {
          setError("Lỗi tạo Admin: " + err.message);
      } finally {
          setIsCreatingAdmin(false);
      }
  };

  // --- RENDER: VERIFICATION VIEW ---
  if (verifyStatus !== 'idle') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 p-4 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute -top-[10%] -right-[10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-3xl"></div>
                <div className="absolute top-[20%] -left-[10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-3xl"></div>
            </div>

            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 p-10 relative z-10 animate-in zoom-in-95 duration-300 text-center">
                {verifyStatus === 'verifying' && (
                    <div className="flex flex-col items-center gap-6">
                        <div className="relative">
                            <div className="w-20 h-20 border-4 border-blue-100 dark:border-slate-700 rounded-full"></div>
                            <div className="w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <ShieldCheck size={32} className="text-blue-600 animate-pulse" />
                            </div>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Đang xác thực</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm animate-pulse">{verifyMessage}</p>
                        </div>
                    </div>
                )}

                {verifyStatus === 'success' && (
                    <div className="flex flex-col items-center gap-6">
                        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 animate-in zoom-in duration-300">
                            <CheckCircle2 size={40} strokeWidth={3} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Thành công!</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">{verifyMessage}</p>
                        </div>
                        <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden mt-2">
                            <div className="h-full bg-green-500 animate-[width_1s_ease-out_forwards]" style={{width: '100%'}}></div>
                        </div>
                    </div>
                )}

                {verifyStatus === 'error' && (
                    <div className="flex flex-col items-center gap-6">
                        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center text-red-600 dark:text-red-400 animate-in shake duration-300">
                            <XCircle size={40} strokeWidth={3} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Xác thực thất bại</h2>
                            <p className="text-red-500 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/10 p-3 rounded-lg border border-red-100 dark:border-red-900/50">
                                {verifyMessage}
                            </p>
                        </div>
                        <Button 
                            onClick={() => { setVerifyStatus('idle'); setError(null); window.location.hash = ''; }}
                            className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800"
                        >
                            Quay lại đăng nhập <ArrowRight size={16} className="ml-2"/>
                        </Button>
                    </div>
                )}
            </div>
        </div>
      );
  }

  // --- RENDER: LOGIN FORM (Mặc định) ---
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
         <div className="absolute -top-[10%] -right-[10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-3xl"></div>
         <div className="absolute top-[20%] -left-[10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 p-8 relative z-10 animate-in fade-in zoom-in-95 duration-300">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 text-white mb-4 shadow-lg shadow-blue-500/30">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">ISO DocManager</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Hệ thống quản lý tài liệu tiêu chuẩn</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium text-center border border-red-100 dark:border-red-900/50 animate-in slide-in-from-top-2 flex items-center justify-center gap-2">
              <XCircle size={16} /> {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase ml-1">Email</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                <Mail size={18} />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 pl-10 pr-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                placeholder="nhanvien@congty.com"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase ml-1">Mật khẩu</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 pl-10 pr-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
                title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center">
                    <input 
                        type="checkbox" 
                        checked={rememberMe} 
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 checked:border-blue-600 checked:bg-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                    <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Ghi nhớ tài khoản</span>
            </label>
            <a 
              href="#" 
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors" 
              onClick={(e) => { e.preventDefault(); setShowForgotModal(true); }}
            >
              Quên mật khẩu?
            </a>
          </div>

          <Button 
            type="submit" 
            className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 mt-2 text-base"
            disabled={isLoading || isCreatingAdmin}
          >
            {isLoading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Đang xử lý...</> : "Đăng nhập hệ thống"}
          </Button>
        </form>

        {!hasAdminAccount && (
            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-slate-800 text-center animate-in fade-in">
              {!isSetupMode ? (
                  <>
                    <button 
                        onClick={() => setIsSetupMode(true)}
                        className="text-xs text-orange-500 hover:text-orange-600 font-medium transition-colors flex items-center justify-center gap-1 w-full bg-orange-50 dark:bg-orange-900/10 p-2 rounded-lg"
                    >
                        <Wrench size={12} /> Khôi phục / Khởi tạo Admin
                    </button>
                    <p className="text-[10px] text-gray-400 mt-2">
                        (Hiển thị khi hệ thống chưa có tài khoản Quản trị viên nào)
                    </p>
                  </>
              ) : (
                  <div className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-xl border border-orange-200 dark:border-orange-800 animate-in zoom-in-95">
                      <h3 className="text-sm font-bold text-orange-800 dark:text-orange-300 mb-2 flex items-center gap-2 justify-center">
                          <Key size={14} /> Xác thực quyền chủ sở hữu
                      </h3>
                      <p className="text-[11px] text-gray-600 dark:text-gray-400 mb-3 text-center">
                          Vui lòng nhập <strong>Setup Token</strong> đã cấu hình trong biến môi trường (VITE_ADMIN_SETUP_TOKEN).
                      </p>
                      <input 
                          type="password" 
                          placeholder="Nhập mã bảo mật hệ thống..." 
                          className="w-full h-9 px-3 rounded-lg border border-orange-300 dark:border-orange-700 text-sm mb-3 focus:ring-2 ring-orange-500/20 outline-none dark:bg-slate-900"
                          value={setupToken}
                          onChange={(e) => setSetupToken(e.target.value)}
                      />
                      <div className="flex gap-2">
                          <Button 
                              variant="ghost" 
                              size="sm" 
                              className="flex-1 text-xs" 
                              onClick={() => { setIsSetupMode(false); setSetupToken(''); setError(null); }}
                          >
                              Hủy
                          </Button>
                          <Button 
                              size="sm" 
                              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white text-xs"
                              disabled={isCreatingAdmin || !setupToken}
                              onClick={handleQuickSetupAdmin}
                          >
                              {isCreatingAdmin ? <Loader2 size={12} className="animate-spin" /> : "Xác nhận tạo"}
                          </Button>
                      </div>
                  </div>
              )}
            </div>
        )}
      </div>

      {/* Professional Modal for Forgot Password */}
      <Modal 
        isOpen={showForgotModal} 
        onClose={() => setShowForgotModal(false)} 
        title="Hỗ trợ khôi phục mật khẩu"
        size="sm"
      >
        <div className="p-6 text-center">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600 dark:text-blue-400 animate-in zoom-in duration-300">
                <Headset size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Liên hệ Quản trị viên
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                Để đảm bảo an toàn thông tin theo tiêu chuẩn ISO 27001, chức năng tự đặt lại mật khẩu đã được giới hạn. 
                <br/><br/>
                Vui lòng liên hệ trực tiếp với <strong>Bộ phận IT</strong> hoặc <strong>Admin hệ thống</strong> để được cấp lại mật khẩu mới.
            </p>
            <Button onClick={() => setShowForgotModal(false)} className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200">
                Đã hiểu
            </Button>
        </div>
      </Modal>
    </div>
  );
};
