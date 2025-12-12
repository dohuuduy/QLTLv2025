
import { createClient } from '@supabase/supabase-js';

// ĐẠI CA DUY THAY URL VÀ KEY VÀO ĐÂY NHÉ
// Nếu có biến môi trường (process.env) thì dùng, không thì dùng string rỗng để tránh lỗi build
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xyzcompany.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'public-anon-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Hàm tiện ích để kiểm tra kết nối
export const checkConnection = async () => {
  try {
    const { data, error } = await supabase.from('documents').select('count', { count: 'exact', head: true });
    if (error) throw error;
    console.log('Supabase Connected! Document count:', data);
    return true;
  } catch (err) {
    console.error('Supabase Connection Failed:', err);
    return false;
  }
};
