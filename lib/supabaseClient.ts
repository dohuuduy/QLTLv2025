
import { createClient } from '@supabase/supabase-js';

// Hàm lấy biến môi trường thông minh (Hỗ trợ Vercel/Vite/CRA)
const getEnv = (key: string) => {
  let val = undefined;

  // 1. Thử import.meta.env (Vite standard) - Ưu tiên trên Vercel
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      val = import.meta.env[key] || import.meta.env[`VITE_${key}`];
    }
  } catch (e) {}

  // 2. Thử process.env (Node/CRA fallback)
  if (!val) {
    try {
        // @ts-ignore
        if (typeof process !== 'undefined' && process.env) {
            // @ts-ignore
            val = process.env[key] || process.env[`VITE_${key}`] || process.env[`REACT_APP_${key}`];
        }
    } catch(e) {}
  }

  return val;
};

// 1. URL Project
const FALLBACK_URL = 'https://vbqdrvezzualrabydvif.supabase.co';

// 2. ANON KEY
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZicWRydmV6enVhbHJhYnlkdmlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1Mjk2OTcsImV4cCI6MjA4MTEwNTY5N30.HHSA1zmEgFUIBf6xL7VFLyx9IBL11AcCHGX6W_FgYl4'; 

const SUPABASE_URL = getEnv('SUPABASE_URL') || FALLBACK_URL;
const SUPABASE_ANON_KEY = getEnv('SUPABASE_ANON_KEY') || FALLBACK_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Hàm tiện ích để kiểm tra kết nối
export const checkConnection = async () => {
  try {
    const { count, error } = await supabase.from('danh_muc').select('*', { count: 'exact', head: true });
    if (error) throw error;
    console.log(`✅ Kết nối Supabase thành công! Số lượng danh mục: ${count}`);
    return true;
  } catch (err: any) {
    console.warn('ℹ️ Không thể kết nối DB (Sẽ dùng Mock Data):', err.message);
    return false;
  }
};
