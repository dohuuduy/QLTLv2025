
import { NhanSu } from "../types";

/**
 * DỊCH VỤ GỬI EMAIL HỆ THỐNG
 * 
 * Hiện tại: Giả lập gửi email (Log console + Delay mạng giả).
 * Thực tế: Sẽ gọi API tới Supabase Edge Function hoặc dịch vụ thứ 3 như Resend/EmailJS.
 */

interface EmailPayload {
    to: string;
    subject: string;
    body: string; // HTML or Text
    recipientName?: string;
}

export const sendSystemEmail = async (payload: EmailPayload): Promise<boolean> => {
    // 1. Kiểm tra cấu hình hệ thống xem có bật gửi email không
    const savedSettings = localStorage.getItem('iso_app_settings');
    if (savedSettings) {
        const config = JSON.parse(savedSettings);
        if (!config.enableEmailNoti) {
            console.log(`[EMAIL SKIPPED] Hệ thống đang tắt chức năng gửi email.`);
            return false;
        }
    }

    // 2. Giả lập độ trễ mạng (Network Latency)
    await new Promise(resolve => setTimeout(resolve, 800));

    // 3. LOGIC GỬI EMAIL (Mocking)
    // TODO: Thay thế đoạn này bằng code gọi API thực tế (Ví dụ: Resend, EmailJS, SendGrid)
    console.group('%c 📧 [EMAIL SENT SUCCESS]', 'color: #10b981; font-weight: bold; font-size: 12px;');
    console.log(`To: %c${payload.to} (${payload.recipientName || 'User'})`, 'color: #3b82f6');
    console.log(`Subject: ${payload.subject}`);
    console.log(`Body Preview: ${payload.body.substring(0, 100)}...`);
    console.groupEnd();

    /**
     * VÍ DỤ CODE TÍCH HỢP RESEND QUA SUPABASE FUNCTIONS:
     * 
     * const { data, error } = await supabase.functions.invoke('send-email', {
     *    body: payload
     * });
     * if (error) return false;
     */

    return true;
};

// Helper tạo nội dung email cảnh báo tài liệu
export const generateDocumentExpiryEmail = (docName: string, docCode: string, daysLeft: number, expiryDate: string, recipientName: string) => {
    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h3 style="color: #d32f2f;">⚠️ Cảnh báo ISO: Tài liệu sắp hết hạn</h3>
        <p>Xin chào <strong>${recipientName}</strong>,</p>
        <p>Hệ thống ISO DocManager thông báo tài liệu sau đây sắp hết hiệu lực:</p>
        <ul>
          <li><strong>Mã tài liệu:</strong> ${docCode}</li>
          <li><strong>Tên tài liệu:</strong> ${docName}</li>
          <li><strong>Ngày hết hạn:</strong> ${expiryDate}</li>
          <li><strong>Thời gian còn lại:</strong> <span style="color: #d32f2f; font-weight: bold;">${daysLeft} ngày</span></li>
        </ul>
        <p>Vui lòng đăng nhập vào hệ thống để tiến hành rà soát hoặc gia hạn.</p>
        <hr />
        <p style="font-size: 12px; color: #666;">Đây là email tự động từ hệ thống quản lý chất lượng.</p>
      </div>
    `;
};

// Helper tạo nội dung email cảnh báo hồ sơ
export const generateRecordExpiryEmail = (recTitle: string, recCode: string, daysLeft: number, expiryDate: string, location: string, recipientName: string) => {
    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h3 style="color: #f57c00;">📂 Nhắc nhở ISO: Hồ sơ đến hạn lưu trữ</h3>
        <p>Xin chào <strong>${recipientName}</strong>,</p>
        <p>Hồ sơ sau đây sắp hết thời gian lưu trữ quy định:</p>
        <ul>
          <li><strong>Mã hồ sơ:</strong> ${recCode}</li>
          <li><strong>Tiêu đề:</strong> ${recTitle}</li>
          <li><strong>Vị trí lưu:</strong> ${location}</li>
          <li><strong>Ngày hết hạn lưu:</strong> ${expiryDate}</li>
          <li><strong>Còn lại:</strong> ${daysLeft} ngày</li>
        </ul>
        <p>Vui lòng kiểm tra và lập biên bản tiêu hủy nếu cần thiết.</p>
      </div>
    `;
};
