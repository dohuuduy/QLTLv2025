
import { createClient } from '@supabase/supabase-js';

// Hàm lấy biến môi trường an toàn
const getEnv = (key: string) => {
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env) return process.env[key];
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) return import.meta.env[key];
  } catch (e) {
    return undefined;
  }
  return undefined;
};

// 1. URL Project (Đã lấy từ connection string của đại ca)
const FALLBACK_URL = 'https://vbqdrvezzualrabydvif.supabase.co';

// 2. ANON KEY (QUAN TRỌNG: ĐẠI CA DÁN KEY VÀO GIỮA CẶP NGOẶC ĐƠN DƯỚI ĐÂY NẾU CHẠY LOCAL)
const FALLBACK_KEY = ''; 

const SUPABASE_URL = getEnv('SUPABASE_URL') || FALLBACK_URL;
const SUPABASE_ANON_KEY = getEnv('SUPABASE_ANON_KEY') || FALLBACK_KEY;

// Kiểm tra nhanh để cảnh báo console
if (!SUPABASE_ANON_KEY) {
  console.warn('⚠️ CHƯA CÓ API KEY: Ứng dụng sẽ không kết nối được DB và sẽ dùng dữ liệu mẫu.');
  console.warn('👉 Đại ca hãy vào Supabase -> Settings -> API -> Copy "anon public" key dán vào file lib/supabaseClient.ts hoặc .env');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY || 'missing-key-placeholder');

// Hàm tiện ích để kiểm tra kết nối
export const checkConnection = async () => {
  try {
    const { data, error } = await supabase.from('categories').select('count', { count: 'exact', head: true });
    if (error) throw error;
    console.log('✅ Kết nối Supabase thành công!');
    return true;
  } catch (err: any) {
    console.log('ℹ️ Chưa kết nối được DB thật (Sẽ dùng Mock Data).');
    // Không throw error để app không crash
    return false;
  }
};
