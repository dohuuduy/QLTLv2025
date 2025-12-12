
import { createClient } from '@supabase/supabase-js';

// Hàm lấy biến môi trường thông minh (Hỗ trợ Vercel/Vite/CRA)
const getEnv = (key: string) => {
  let val = undefined;
  
  // 1. Thử process.env (Standard Node/CRA/Next)
  // @ts-ignore
  if (typeof process !== 'undefined' && process.env) {
    val = process.env[key] || process.env[`VITE_${key}`] || process.env[`REACT_APP_${key}`];
  }

  // 2. Thử import.meta.env (Vite standard)
  if (!val) {
    try {
      // Cast to any to avoid TypeScript error 'Property env does not exist on type ImportMeta'
      const metaEnv = (import.meta as any).env;
      if (metaEnv) {
        val = metaEnv[key] || metaEnv[`VITE_${key}`];
      }
    } catch (e) {
      // Ignore errors in environments where import.meta is not available
    }
  }

  return val;
};

// 1. URL Project
const FALLBACK_URL = 'https://vbqdrvezzualrabydvif.supabase.co';

// 2. ANON KEY
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZicWRydmV6enVhbHJhYnlkdmlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1Mjk2OTcsImV4cCI6MjA4MTEwNTY5N30.HHSA1zmEgFUIBf6xL7VFLyx9IBL11AcCHGX6W_FgYl4'; 

const SUPABASE_URL = getEnv('SUPABASE_URL') || FALLBACK_URL;
const SUPABASE_ANON_KEY = getEnv('SUPABASE_ANON_KEY') || FALLBACK_KEY;

// Log trạng thái kết nối (Chỉ log trên dev hoặc khi lỗi)
if (!SUPABASE_ANON_KEY) {
  console.warn('⚠️ CHƯA CÓ API KEY: App sẽ dùng dữ liệu mẫu (Mock Data).');
  console.warn('👉 Trên Vercel: Vào Settings -> Environment Variables -> Thêm SUPABASE_URL và SUPABASE_ANON_KEY');
} else {
  console.log('✅ Đã tìm thấy API Key.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY || 'missing-key-placeholder');

// Hàm tiện ích để kiểm tra kết nối
export const checkConnection = async () => {
  try {
    // Thử query bảng danh_muc (đã tạo) thay vì categories cũ
    const { count, error } = await supabase.from('danh_muc').select('*', { count: 'exact', head: true });
    if (error) throw error;
    console.log(`✅ Kết nối Supabase thành công! Số lượng danh mục: ${count}`);
    return true;
  } catch (err: any) {
    // Không throw lỗi để App không crash, chỉ log warning
    console.warn('ℹ️ Không thể kết nối DB (Sẽ dùng Mock Data):', err.message);
    return false;
  }
};
