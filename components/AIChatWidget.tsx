
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, X, RotateCcw, MessageSquareText, Minimize2 } from 'lucide-react';
import { chatWithDocument } from '../services/geminiService';
import { TaiLieu } from '../types';

interface AIChatWidgetProps {
  document: TaiLieu;
}

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
}

export const AIChatWidget: React.FC<AIChatWidgetProps> = ({ document }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize welcome message when document changes
  useEffect(() => {
    setMessages([
        { 
          id: 'welcome', 
          role: 'ai', 
          text: `Chào đại ca! Em là trợ lý AI. Đại ca cần tìm thông tin gì trong tài liệu "${document.ma_tai_lieu}" này không?` 
        }
    ]);
    // Auto open specific for demo purposes if needed, or keep closed
    setIsOpen(false);
  }, [document.id]);

  // Auto scroll to bottom
  useEffect(() => {
    if (isOpen) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Context from document (Note: In real app, we need to map IDs to Names here, but for now we pass IDs. 
    // Ideally, pass masterData to this component or fetch names)
    // Assuming context is mainly for content search which relies on 'mo_ta_tom_tat' and 'ten_tai_lieu' mostly.
    const context = `
      Mã: ${document.ma_tai_lieu}
      Tên: ${document.ten_tai_lieu}
      Loại (ID): ${document.id_loai_tai_lieu}
      Mô tả tóm tắt: ${document.mo_ta_tom_tat}
      Phiên bản: ${document.phien_ban}
      Ngày hiệu lực: ${document.ngay_hieu_luc}
      Người soạn (ID): ${document.id_nguoi_soan_thao}
      Tiêu chuẩn áp dụng (IDs): ${document.id_tieu_chuan?.join(', ')}
    `;

    const responseText = await chatWithDocument(context, userMsg.text);

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

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end pointer-events-none">
      
      {/* Chat Window */}
      <div 
        className={`
            pointer-events-auto
            bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 
            rounded-2xl shadow-2xl overflow-hidden
            transition-all duration-300 ease-in-out origin-bottom-right
            mb-4 flex flex-col
            ${isOpen ? 'w-[350px] h-[500px] opacity-100 scale-100' : 'w-[0px] h-[0px] opacity-0 scale-50'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 bg-indigo-600 dark:bg-indigo-700 text-white shrink-0">
            <div className="flex items-center gap-2">
                <div className="bg-white/20 p-1.5 rounded-lg">
                    <Sparkles size={16} className="text-white" />
                </div>
                <div>
                    <h3 className="text-sm font-bold">Trợ lý ISO</h3>
                    <p className="text-[10px] text-indigo-100 opacity-80">{document.ma_tai_lieu}</p>
                </div>
            </div>
            <div className="flex gap-1">
                <button onClick={() => setMessages([{ id: Date.now().toString(), role: 'ai', text: 'Đã xóa nhớ. Hỏi tiếp đi đại ca!' }])} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors" title="Làm mới">
                    <RotateCcw size={16} />
                </button>
                <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors" title="Thu nhỏ">
                    <Minimize2 size={16} />
                </button>
            </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-slate-950 custom-scrollbar">
            {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'ai' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-600'}`}>
                        {msg.role === 'ai' ? <Bot size={14} /> : <User size={14} />}
                    </div>
                    <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${msg.role === 'ai' ? 'bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 rounded-tl-none' : 'bg-indigo-600 text-white rounded-tr-none'}`}>
                        {msg.text}
                    </div>
                </div>
            ))}
            {isLoading && (
                <div className="flex gap-2">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                        <Bot size={14} />
                    </div>
                    <div className="bg-white dark:bg-slate-800 px-3 py-2 rounded-2xl rounded-tl-none flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 shrink-0">
            <div className="relative">
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Hỏi gì đi..."
                    className="w-full h-10 pl-4 pr-10 rounded-full border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                    disabled={isLoading}
                />
                <button 
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className="absolute right-1 top-1 w-8 h-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center transition-all disabled:opacity-50 disabled:bg-gray-400"
                >
                    <Send size={14} />
                </button>
            </div>
        </div>
      </div>

      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`
            pointer-events-auto
            w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95
            ${isOpen ? 'bg-gray-200 text-gray-600 rotate-90' : 'bg-indigo-600 text-white animate-bounce-subtle'}
        `}
      >
        {isOpen ? <X size={24} /> : <MessageSquareText size={24} />}
      </button>
    </div>
  );
};
