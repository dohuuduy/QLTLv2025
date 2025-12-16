
import { createClient } from '@supabase/supabase-js';

// Lấy biến môi trường
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY;
const EMAILJS_PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Thiếu biến môi trường Supabase.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Hàm gửi email
async function sendEmail(toEmail, toName, docCode, docName, expiryDate, daysLeft) {
  if (!EMAILJS_SERVICE_ID || !EMAILJS_PRIVATE_KEY) {
    console.log(`⚠️ Giả lập gửi mail tới ${toEmail} (Chưa config EmailJS)`);
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
  console.log('🔄 Bắt đầu kiểm tra tài liệu hết hạn (Chế độ No-Foreign-Key)...');
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // BƯỚC 1: Lấy danh sách tài liệu (Không join bảng để tránh lỗi PGRST200)
  const { data: documents, error: docError } = await supabase
    .from('tai_lieu')
    .select('id, ma_tai_lieu, ten_tai_lieu, ngay_het_han, trang_thai, id_nguoi_soan_thao')
    .eq('trang_thai', 'da_ban_hanh')
    .not('ngay_het_han', 'is', null);

  if (docError) {
    console.error('❌ Lỗi lấy dữ liệu tài liệu:', docError);
    process.exit(1);
  }

  if (!documents || documents.length === 0) {
    console.log('✅ Không có tài liệu nào có ngày hết hạn.');
    process.exit(0);
  }

  // BƯỚC 2: Lấy danh sách ID người soạn thảo cần tìm
  const userIds = [...new Set(documents.map(d => d.id_nguoi_soan_thao).filter(Boolean))];

  // BƯỚC 3: Lấy thông tin User từ danh sách ID
  let users = [];
  if (userIds.length > 0) {
      const { data: usersData, error: userError } = await supabase
        .from('nhan_su')
        .select('id, email, ho_ten')
        .in('id', userIds);
      
      if (userError) {
          console.error('❌ Lỗi lấy dữ liệu nhân sự:', userError);
          // Không exit, vẫn chạy tiếp nhưng sẽ không có email
      } else {
          users = usersData || [];
      }
  }

  let count = 0;

  // BƯỚC 4: Duyệt và ghép dữ liệu thủ công
  for (const doc of documents) {
    const expiryDate = new Date(doc.ngay_het_han);
    expiryDate.setHours(0, 0, 0, 0);

    // Tính khoảng cách ngày: (Hết hạn - Hôm nay)
    const diffTime = expiryDate.getTime() - today.getTime();
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // LOGIC GỬI MAIL
    const alertDays = [30, 7, 0]; 

    if (alertDays.includes(daysLeft)) {
      // Tìm user trong mảng đã lấy ở Bước 3
      const user = users.find(u => u.id === doc.id_nguoi_soan_thao);

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
        console.warn(`⚠️ Tài liệu ${doc.ma_tai_lieu} sắp hết hạn (còn ${daysLeft} ngày) nhưng không tìm thấy email người phụ trách (ID: ${doc.id_nguoi_soan_thao}).`);
      }
    }
  }

  console.log(`🏁 Hoàn tất kiểm tra. Đã gửi ${count} email.`);
}

run();

