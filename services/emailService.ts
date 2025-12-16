
import emailjs from '@emailjs/browser';

/**
 * DỊCH VỤ GỬI EMAIL - SỬ DỤNG EMAILJS (CLIENT-SIDE)
 * Giải pháp thay thế Supabase Functions khi không thể deploy backend.
 */

// --- CẤU HÌNH EMAILJS ---
// Đại ca Duy vui lòng đăng ký tại emailjs.com (Miễn phí) và điền thông tin vào đây:
const EMAILJS_SERVICE_ID = 'service_xyz'; // Thay bằng Service ID của đại ca (VD: gmail)
const EMAILJS_TEMPLATE_ID = 'template_abc'; // Thay bằng Template ID
const EMAILJS_PUBLIC_KEY = 'public_key_123'; // Thay bằng Public Key

interface EmailPayload {
    to: string;
    subject: string;
    body: string; // HTML content
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

    // Kiểm tra cấu hình EmailJS
    if (EMAILJS_SERVICE_ID === 'service_xyz' || EMAILJS_PUBLIC_KEY === 'public_key_123') {
        console.warn("⚠️ Chưa cấu hình EmailJS trong services/emailService.ts. Vui lòng cập nhật Service ID và Public Key.");
        return false;
    }

    try {
        console.log(`[EMAILJS] Sending to ${payload.to}...`);

        // Mapping dữ liệu để gửi sang Template EmailJS
        // Trong Template EmailJS, đại ca cần tạo các biến: {{to_name}}, {{to_email}}, {{subject}}, {{message_html}}
        const templateParams = {
            to_name: payload.recipientName || payload.to,
            to_email: payload.to,
            subject: payload.subject,
            message_html: payload.body,
        };

        const response = await emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_TEMPLATE_ID,
            templateParams,
            EMAILJS_PUBLIC_KEY
        );

        if (response.status === 200) {
            console.log("✅ Email sent successfully via EmailJS!", response.text);
            return true;
        } else {
            console.error("❌ EmailJS Response Error:", response);
            return false;
        }

    } catch (error) {
        console.error("❌ System Error sending email:", error);
        return false;
    }
};

// Helper tạo nội dung email cảnh báo tài liệu
export const generateDocumentExpiryEmail = (docName: string, docCode: string, daysLeft: number, expiryDate: string, recipientName: string) => {
    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #d32f2f; padding: 20px; text-align: center;">
            <h2 style="color: white; margin: 0;">⚠️ CẢNH BÁO TÀI LIỆU</h2>
        </div>
        <div style="padding: 20px;">
            <p>Xin chào <strong>${recipientName}</strong>,</p>
            <p>Hệ thống ISO DocManager thông báo tài liệu sau đây sắp hết hiệu lực hoặc quá hạn:</p>
            
            <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #d32f2f; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Mã tài liệu:</strong> ${docCode}</p>
                <p style="margin: 5px 0;"><strong>Tên tài liệu:</strong> ${docName}</p>
                <p style="margin: 5px 0;"><strong>Ngày hết hạn:</strong> ${expiryDate}</p>
                <p style="margin: 5px 0;"><strong>Trạng thái:</strong> <span style="color: #d32f2f; font-weight: bold;">${daysLeft < 0 ? `Đã quá hạn ${Math.abs(daysLeft)} ngày` : `Còn lại ${daysLeft} ngày`}</span></p>
            </div>

            <p>Vui lòng đăng nhập vào hệ thống để tiến hành rà soát, gia hạn hoặc hủy bỏ.</p>
            
            <div style="text-align: center; margin-top: 30px;">
                <a href="${window.location.origin}" style="background-color: #d32f2f; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Truy cập Hệ thống</a>
            </div>
        </div>
        <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; color: #666;">
            <p>Đây là email tự động từ hệ thống quản lý chất lượng ISO.</p>
        </div>
      </div>
    `;
};

// Helper tạo nội dung email cảnh báo hồ sơ
export const generateRecordExpiryEmail = (recTitle: string, recCode: string, daysLeft: number, expiryDate: string, location: string, recipientName: string) => {
    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #f57c00; padding: 20px; text-align: center;">
            <h2 style="color: white; margin: 0;">📂 NHẮC HẠN LƯU TRỮ</h2>
        </div>
        <div style="padding: 20px;">
            <p>Xin chào <strong>${recipientName}</strong>,</p>
            <p>Hồ sơ sau đây sắp hết thời gian lưu trữ theo quy định:</p>
            
            <div style="background-color: #fff8e1; padding: 15px; border-left: 4px solid #f57c00; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Mã hồ sơ:</strong> ${recCode}</p>
                <p style="margin: 5px 0;"><strong>Tiêu đề:</strong> ${recTitle}</p>
                <p style="margin: 5px 0;"><strong>Vị trí lưu:</strong> ${location}</p>
                <p style="margin: 5px 0;"><strong>Ngày hết hạn lưu:</strong> ${expiryDate}</p>
                <p style="margin: 5px 0;"><strong>Còn lại:</strong> <span style="font-weight: bold;">${daysLeft} ngày</span></p>
            </div>

            <p>Vui lòng kiểm tra và lập biên bản tiêu hủy nếu cần thiết.</p>
             <div style="text-align: center; margin-top: 30px;">
                <a href="${window.location.origin}" style="background-color: #f57c00; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Xem Hồ Sơ</a>
            </div>
        </div>
         <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; color: #666;">
            <p>Đây là email tự động từ hệ thống quản lý chất lượng ISO.</p>
        </div>
      </div>
    `;
};
