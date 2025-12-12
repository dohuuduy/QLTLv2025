
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, X, RotateCcw } from 'lucide-react';
import { Button } from './ui/Button';
import { chatWithDocument } from '../services/geminiService';
import { TaiLieu } from '../types';

interface AIChatBoxProps {
  document: TaiLieu;
}

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
}

export const AIChatBox: React.FC<AIChatBoxProps> = ({ document }) => {
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: 'welcome', 
      role: 'ai', 
      text: `Chào đại ca! Em là trợ lý AI. Đại ca cần tìm thông tin gì trong tài liệu "${document.ma_tai_lieu}" này không?` 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Giả lập ngữ cảnh tài liệu (Trong thực tế sẽ là nội dung full text OCR)
    const context = `
      Mã: ${document.ma_tai_lieu}
      Tên: ${document.ten_tai_lieu}
      Loại: ${document.loai_tai_lieu}
      Lĩnh vực: ${document.linh_vuc}
      Mô tả tóm tắt: ${document.mo_ta_tom_tat}
      Phiên bản: ${document.phien_ban}
      Ngày hiệu lực: ${document.ngay_hieu_luc}
      Người soạn: ${document.nguoi_soan_thao}
      Tiêu chuẩn áp dụng: ${document.tieu_chuan?.join(', ')}
    `;

    const responseText = await chatWithDocument(context, userMsg.text);

    // Simulate typing effect (đơn giản hóa)
    const aiMsgId = (Date.now() + 1).toString();
    setIsLoading(false);
    setMessages(prev => [...prev, { id: aiMsgId, role: 'ai', text: responseText }]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    setMessages([{ 
      id: Date.now().toString(), 
      role: 'ai', 
      text: `Đã xóa lịch sử. Đại ca cần hỏi gì tiếp theo về "${document.ma_tai_lieu}"?` 
    }]);
  };

  return (
    <div className="flex flex-col h-[400px] bg-gradient-to-b from-indigo-50/50 to-white dark:from-slate-900 dark:to-slate-950 rounded-xl border border-indigo-100 dark:border-slate-700 shadow-sm overflow-hidden">
      
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-indigo-100 dark:border-slate-800 bg-indigo-50/80 dark:bg-slate-900">
        <div className="flex items-center gap-2">
           <div className="bg-indigo-600 p-1.5 rounded-lg text-white shadow-sm">
             <Sparkles size={16} />
           </div>
           <div>
             <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-300">Chat với Tài liệu</h3>
             <p className="text-[10px] text-indigo-600 dark:text-indigo-400">Powered by Gemini 2.5</p>
           </div>
        </div>
        <button 
          onClick={handleClearChat}
          className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-1"
          title="Làm mới cuộc trò chuyện"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
              msg.role === 'ai' 
                ? 'bg-white border border-indigo-100 text-indigo-600 dark:bg-slate-800 dark:border-slate-700 dark:text-indigo-400' 
                : 'bg-blue-600 text-white'
            }`}>
              {msg.role === 'ai' ? <Bot size={18} /> : <User size={18} />}
            </div>
            
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
              msg.role === 'ai' 
                ? 'bg-white border border-indigo-50 text-gray-800 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-200 rounded-tl-none' 
                : 'bg-blue-600 text-white rounded-tr-none'
            }`}>
               {msg.text}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-3">
             <div className="w-8 h-8 rounded-full bg-white border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 dark:bg-slate-800 dark:border-slate-700">
               <Bot size={18} />
             </div>
             <div className="bg-white dark:bg-slate-800 border border-indigo-50 dark:border-slate-700 px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-indigo-100 dark:border-slate-800 bg-white dark:bg-slate-900">
         <div className="relative flex items-center">
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Hỏi về quy trình, biểu mẫu, trách nhiệm..."
              className="w-full h-10 pl-4 pr-12 rounded-full border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm"
              disabled={isLoading}
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="absolute right-1 top-1 w-8 h-8 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:bg-gray-400 text-white rounded-full flex items-center justify-center transition-all shadow-sm"
            >
              <Send size={14} />
            </button>
         </div>
         <p className="text-[10px] text-center text-gray-400 mt-2">
           AI có thể mắc lỗi. Vui lòng kiểm tra lại thông tin quan trọng.
         </p>
      </div>
    </div>
  );
};
