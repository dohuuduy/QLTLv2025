
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

  return val || '';
};

// Lấy credentials từ biến môi trường
const SUPABASE_URL = getEnv('SUPABASE_URL');
const SUPABASE_ANON_KEY = getEnv('SUPABASE_ANON_KEY');

// Kiểm tra và cảnh báo nếu thiếu
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('⚠️ [Supabase] Thiếu biến môi trường. Vui lòng cấu hình VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY trên Vercel.');
}

// Khởi tạo client. 
// Nếu thiếu key, dùng placeholder để tránh crash app ngay lập tức (dù request sẽ lỗi).
// Điều này giúp App vẫn render được UI và chạy ở chế độ Mock Data thay vì màn hình trắng.
export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co', 
  SUPABASE_ANON_KEY || 'placeholder-key'
);

// Hàm tiện ích để kiểm tra kết nối
export const checkConnection = async () => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.warn('ℹ️ Chưa cấu hình Supabase ENV. Hệ thống sẽ sử dụng Mock Data.');
      return false;
  }

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
