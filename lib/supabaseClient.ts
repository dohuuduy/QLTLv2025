
import { createClient } from '@supabase/supabase-js';

// Helper: Lấy biến môi trường an toàn (Hỗ trợ cả Vite và Node/Process)
const getEnvVar = (key: string): string => {
  let val = '';

  // 1. Ưu tiên: import.meta.env (Vite - Chuẩn cho Vercel deployments dùng Vite)
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      val = import.meta.env[key] || import.meta.env[`VITE_${key}`];
    }
  } catch (e) {}

  // 2. Fallback: process.env (Node.js/CRA)
  if (!val) {
    try {
        // @ts-ignore
        if (typeof process !== 'undefined' && process.env) {
            // @ts-ignore
            val = process.env[key] || process.env[`VITE_${key}`] || process.env[`REACT_APP_${key}`];
        }
    } catch(e) {}
  }

  return val || '';
};

const SUPABASE_URL = getEnvVar('SUPABASE_URL');
const SUPABASE_ANON_KEY = getEnvVar('SUPABASE_ANON_KEY');

// Log cảnh báo nếu thiếu key (chỉ log ở dev hoặc console người dùng)
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('⚠️ [Supabase] Thiếu biến môi trường! Vui lòng cấu hình VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY trong Settings > Environment Variables trên Vercel.');
}

// Khởi tạo client
// Sử dụng fallback giá trị rỗng để tránh crash app ngay lập tức, nhưng các request mạng sẽ thất bại nếu không có key đúng.
export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co', 
  SUPABASE_ANON_KEY || 'placeholder-key'
);

export const checkConnection = async () => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.warn('ℹ️ Chưa cấu hình Supabase ENV. Hệ thống sẽ sử dụng Mock Data.');
      return false;
  }
  try {
    const { count, error } = await supabase.from('danh_muc').select('*', { count: 'exact', head: true });
    if (error) throw error;
    console.log(`✅ Kết nối Supabase thành công!`);
    return true;
  } catch (err: any) {
    console.warn('ℹ️ Lỗi kết nối Supabase (Sẽ dùng Mock Data):', err.message);
    return false;
  }
};
