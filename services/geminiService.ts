
import { GoogleGenAI } from "@google/genai";

// Helper lấy API Key từ biến môi trường
const getApiKey = () => {
  try {
    // 1. Vite (Vercel)
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      const key = import.meta.env.VITE_API_KEY || import.meta.env.API_KEY;
      if (key) return key;
    }
    // 2. Process (Node)
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env) {
      // @ts-ignore
      return process.env.API_KEY || process.env.REACT_APP_API_KEY || process.env.VITE_API_KEY;
    }
  } catch (e) {}
  return '';
};

const apiKey = getApiKey();
let ai: GoogleGenAI | null = null;

if (apiKey && apiKey !== 'placeholder-key') {
  try {
    ai = new GoogleGenAI({ apiKey: apiKey });
  } catch (e) {
    console.error("Lỗi khởi tạo Gemini AI:", e);
  }
} else {
  console.warn("⚠️ Chưa cấu hình VITE_API_KEY. Các tính năng AI sẽ không hoạt động.");
}

export const analyzeDocumentTitle = async (title: string): Promise<string> => {
  if (!ai) return "Chưa cấu hình API Key Gemini.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Bạn là trợ lý ảo chuyên về ISO 9001. Hãy phân tích ngắn gọn mục đích có thể có của tài liệu có tiêu đề: "${title}". Trả lời trong 1 câu tiếng Việt.`,
    });
    return response.text || "Không thể phân tích.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Lỗi khi gọi AI.";
  }
};

export const chatWithDocument = async (docContext: string, userQuestion: string): Promise<string> => {
  if (!ai) return "Chưa cấu hình API Key Gemini (VITE_API_KEY).";

  try {
    const prompt = `
      Bạn là trợ lý quản lý tài liệu ISO cá nhân thông minh.
      Dưới đây là thông tin về tài liệu đang được xem xét:
      ---
      ${docContext}
      ---
      
      Người dùng hỏi: "${userQuestion}"
      
      Hãy trả lời ngắn gọn, súc tích, đi thẳng vào vấn đề dựa trên ngữ cảnh trên.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text || "Xin lỗi, tôi không thể trả lời câu hỏi này.";
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "Đã xảy ra lỗi kết nối với AI. Vui lòng kiểm tra API Key.";
  }
};
