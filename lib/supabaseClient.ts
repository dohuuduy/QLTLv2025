
import { createClient } from '@supabase/supabase-js';

// Hàm lấy biến môi trường an toàn (tránh lỗi process is not defined trên browser)
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

// URL từ Connection String đại ca cung cấp: vbqdrvezzualrabydvif
const FALLBACK_URL = 'https://vbqdrvezzualrabydvif.supabase.co';
const FALLBACK_KEY = ''; // Để trống để bắt buộc user phải nhập nếu không có env

const SUPABASE_URL = getEnv('SUPABASE_URL') || FALLBACK_URL;
const SUPABASE_ANON_KEY = getEnv('SUPABASE_ANON_KEY') || FALLBACK_KEY;

if (!SUPABASE_ANON_KEY) {
  console.warn('⚠️ Cảnh báo: Chưa có SUPABASE_ANON_KEY. Vui lòng thêm vào file .env hoặc nhập trực tiếp.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY || 'missing-key');

// Hàm tiện ích để kiểm tra kết nối
export const checkConnection = async () => {
  try {
    const { data, error } = await supabase.from('categories').select('count', { count: 'exact', head: true });
    if (error) {
        console.error('Supabase Error Detail:', JSON.stringify(error, null, 2));
        throw error;
    }
    console.log('✅ Kết nối Supabase thành công!');
    return true;
  } catch (err) {
    console.error('❌ Kết nối Supabase thất bại:', err);
    return false;
  }
};
