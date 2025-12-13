
import React, { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { signIn } from '../../services/supabaseService';
import { ShieldCheck, Mail, Lock, Loader2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        // Successful login will trigger onAuthStateChange in App.tsx
        // No need to set loading false here as component will unmount
    }
  };

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
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium text-center border border-red-100 dark:border-red-900/50 animate-in slide-in-from-top-2">
              {error}
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
                className="w-full h-11 pl-10 pr-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
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
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 pl-10 pr-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 mt-2 text-base"
            disabled={isLoading}
          >
            {isLoading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Đang xử lý...</> : "Đăng nhập hệ thống"}
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-slate-800 text-center">
          <p className="text-xs text-gray-400">
            Chưa có tài khoản? Vui lòng liên hệ bộ phận IT hoặc Admin ISO.
          </p>
        </div>
      </div>
    </div>
  );
};
