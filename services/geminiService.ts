
import { GoogleGenAI } from "@google/genai";

// Hàm lấy API Key an toàn cho cả môi trường Vite (import.meta.env) và Node (process.env)
// Điều này ngăn chặn lỗi "process is not defined" gây màn hình trắng
const getApiKey = () => {
  try {
    // Ưu tiên check Vite env trước
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
      // @ts-ignore
      return import.meta.env.VITE_API_KEY;
    }
    // Fallback sang process.env (nếu có polyfill)
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env) {
      // @ts-ignore
      return process.env.API_KEY || process.env.REACT_APP_API_KEY;
    }
  } catch (e) {
    console.warn("Không thể đọc biến môi trường, sử dụng key rỗng.");
  }
  return '';
};

const apiKey = getApiKey();
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({ apiKey: apiKey });
} else {
  console.warn("⚠️ Chưa cấu hình API Key Gemini. Các tính năng AI sẽ không hoạt động.");
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
  if (!ai) return "Chưa cấu hình API Key Gemini.";

  try {
    // Xây dựng prompt kèm ngữ cảnh tài liệu
    const prompt = `
      Bạn là trợ lý quản lý tài liệu ISO cá nhân thông minh.
      Dưới đây là thông tin về tài liệu đang được xem xét:
      ---
      ${docContext}
      ---
      
      Người dùng hỏi: "${userQuestion}"
      
      Hãy trả lời ngắn gọn, súc tích, đi thẳng vào vấn đề dựa trên ngữ cảnh trên. Nếu thông tin không có trong ngữ cảnh, hãy trả lời dựa trên kiến thức chung về ISO hoặc gợi ý hợp lý.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text || "Xin lỗi, tôi không thể trả lời câu hỏi này.";
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "Đã xảy ra lỗi kết nối với AI.";
  }
};
