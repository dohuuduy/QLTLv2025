
import { createClient } from '@supabase/supabase-js';

// Lấy biến môi trường từ GitHub Secrets (sẽ cấu hình sau)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Dùng Service Role để bypass RLS (đọc toàn bộ dữ liệu)
const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY;
const EMAILJS_PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY; // Quan trọng: Cần Private Key để gửi từ Server/Node.js

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Thiếu biến môi trường Supabase.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Hàm gửi email qua EmailJS REST API
async function sendEmail(toEmail, toName, docCode, docName, expiryDate, daysLeft) {
  if (!EMAILJS_SERVICE_ID || !EMAILJS_PRIVATE_KEY) {
    console.log('⚠️ Chưa cấu hình EmailJS, bỏ qua gửi mail.');
    return;
  }

  const data = {
    service_id: EMAILJS_SERVICE_ID,
    template_id: EMAILJS_TEMPLATE_ID,
    user_id: EMAILJS_PUBLIC_KEY,
    accessToken: EMAILJS_PRIVATE_KEY,
    template_params: {
      to_email: toEmail,
      to_name: toName,
      doc_code: docCode,
      doc_name: docName,
      expiry_date: expiryDate,
      days_left: daysLeft,
      subject: `[CẢNH BÁO] Tài liệu sắp hết hạn: ${docCode}`
    }
  };

  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (response.ok) {
      console.log(`✅ Đã gửi mail cho ${toName} (${toEmail}) về tài liệu ${docCode}`);
    } else {
      const text = await response.text();
      console.error(`❌ Lỗi EmailJS: ${text}`);
    }
  } catch (error) {
    console.error('❌ Lỗi kết nối EmailJS:', error);
  }
}

async function run() {
  console.log('🔄 Bắt đầu kiểm tra tài liệu hết hạn...');
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. Lấy danh sách tài liệu ĐÃ BAN HÀNH và CÓ NGÀY HẾT HẠN
  // Kết hợp lấy thông tin người soạn thảo (nhan_su) để biết email
  const { data: documents, error } = await supabase
    .from('tai_lieu')
    .select(`
      id, 
      ma_tai_lieu, 
      ten_tai_lieu, 
      ngay_het_han, 
      trang_thai,
      nhan_su:id_nguoi_soan_thao (
        email, 
        ho_ten
      )
    `)
    .eq('trang_thai', 'da_ban_hanh')
    .not('ngay_het_han', 'is', null);

  if (error) {
    console.error('❌ Lỗi lấy dữ liệu từ Supabase:', error);
    process.exit(1);
  }

  if (!documents || documents.length === 0) {
    console.log('✅ Không có tài liệu nào cần kiểm tra.');
    process.exit(0);
  }

  let count = 0;

  // 2. Duyệt qua từng tài liệu
  for (const doc of documents) {
    const expiryDate = new Date(doc.ngay_het_han);
    expiryDate.setHours(0, 0, 0, 0);

    // Tính khoảng cách ngày: (Hết hạn - Hôm nay)
    const diffTime = expiryDate.getTime() - today.getTime();
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // LOGIC GỬI MAIL: Chỉ gửi vào các mốc cụ thể để tránh spam hàng ngày
    // Ví dụ: Còn đúng 30 ngày, còn đúng 7 ngày, hoặc đã hết hạn hôm nay (0 ngày)
    const alertDays = [30, 7, 0]; 

    if (alertDays.includes(daysLeft)) {
      // Ép kiểu vì join bảng trả về mảng hoặc object
      const user = Array.isArray(doc.nhan_su) ? doc.nhan_su[0] : doc.nhan_su;

      if (user && user.email) {
        console.log(`🔔 Phát hiện: ${doc.ma_tai_lieu} còn ${daysLeft} ngày.`);
        await sendEmail(
          user.email, 
          user.ho_ten, 
          doc.ma_tai_lieu, 
          doc.ten_tai_lieu, 
          doc.ngay_het_han, 
          daysLeft
        );
        count++;
      } else {
        console.warn(`⚠️ Tài liệu ${doc.ma_tai_lieu} sắp hết hạn nhưng không tìm thấy email người phụ trách.`);
      }
    }
  }

  console.log(`🏁 Hoàn tất kiểm tra. Đã gửi ${count} email.`);
}

run();
