
import { GoogleGenAI } from "@google/genai";

// Trong môi trường thực tế, API_KEY nên được lấy từ backend hoặc biến môi trường an toàn.
// Ở đây giả định process.env.API_KEY có sẵn.
// Nếu không có key, service sẽ trả về lỗi gracefully.

const apiKey = process.env.API_KEY || ''; 
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({ apiKey: apiKey });
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
  if (!ai) return "Chưa cấu hình API Key Gemini (process.env.API_KEY).";

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
