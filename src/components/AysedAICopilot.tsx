import React, { useState, useRef, useEffect } from 'react';
import { X, Sparkles, Send, Loader2, Bot, User, Trash2, PlusCircle } from 'lucide-react';
import { Employee, Contract } from '../types';
import toast from 'react-hot-toast';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AysedAICopilotProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  contracts: Contract[];
}

export const AysedAICopilot: React.FC<AysedAICopilotProps> = ({
  isOpen,
  onClose,
  employees,
  contracts,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'أهلاً بك! أنا مساعد Aysed S HR 2026 الذكي.\nأنا هنا لمساعدتك في إنشاء العقود، تحليل الرواتب، حساب نهاية الخدمة، وإدارة موظفيك حسب قوانين العمل الكويتية.\nكيف يمكنني مساعدتك اليوم؟',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const buildContext = () => {
    const empsInfo = employees.map(e => `- ${e.fullNameAr} (الرقم المدني: ${e.civilId}, المسمى: ${e.jobTitle})`).join('\n');
    const cntsInfo = contracts.map(c => {
      const emp = employees.find(e => e.id === c.employeeId);
      return `- عقد الموظف ${emp?.fullNameAr || c.employeeId} براتب ${c.basicSalary} د.ك (${c.contractType})`;
    }).join('\n');
    return `بيانات الموظفين الحالية:\n${empsInfo}\n\nبيانات العقود:\n${cntsInfo}`;
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userMessage,
          contextSummary: buildContext(),
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content
          }))
        }),
      });
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch(e) { throw new Error(text.includes('502') ? 'الخادم قيد التحديث، يرجى المحاولة بعد قليل.' : 'استجابة غير صالحة من الخادم'); }
      if (data.reply) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: 'حدث خطأ في الاتصال بالخادم.' }]);
      }
    } catch (error) {
      console.error('Copilot error:', error);
      setMessages((prev) => [...prev, { role: 'assistant', content: 'حدث خطأ أثناء معالجة طلبك. تأكد من اتصالك بالإنترنت.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: 'أهلاً بك! أنا مساعد Aysed S HR 2026 الذكي.\nأنا هنا لمساعدتك في إنشاء العقود، تحليل الرواتب، حساب نهاية الخدمة، وإدارة موظفيك حسب قوانين العمل الكويتية.\nكيف يمكنني مساعدتك اليوم؟',
      },
    ]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log("جاري معالجة الملف في نظام Aysed S HR 2026...", file.name);
      toast.success(`جاري قراءة الملف: ${file.name} عبر تقنية OCR`);
      // Here you could send the file to your backend for OCR processing
    }
  };

  return (
    <div className="fixed inset-y-0 left-0 w-[400px] bg-white shadow-[-10px_0_30px_rgba(0,0,0,0.1)] z-[150] flex flex-col dir-rtl text-right transform transition-transform duration-300 border-r border-slate-200">
      {/* Header */}
      <div className="h-14 bg-slate-900 text-white flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <h2 className="font-bold">مساعد Aysed الذكي</h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={clearChat} className="p-1.5 hover:bg-white/10 rounded transition" title="مسح المحادثة">
            <Trash2 className="w-4 h-4 text-slate-300" />
          </button>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded transition">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-amber-500' : 'bg-[#714B67]'}`}>
              {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
            </div>
            <div className={`px-4 py-2.5 rounded-2xl max-w-[80%] whitespace-pre-wrap ${msg.role === 'user' ? 'bg-amber-100 text-amber-900 rounded-tr-none' : 'bg-white text-slate-700 border border-slate-200 shadow-sm rounded-tl-none'}`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-[#714B67] flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="px-4 py-3 bg-white text-slate-700 border border-slate-200 shadow-sm rounded-2xl rounded-tl-none flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#714B67]" />
              <span className="text-sm">جاري التفكير...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-slate-200">
        <div className="relative flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-[#71639e] hover:text-[#008784] transition-colors p-1"
            title="إرفاق ملف (صورة مدنية، جواز، الخ)"
          >
            <PlusCircle className="w-6 h-6" />
          </button>
          
          <div className="relative flex-1">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="اكتب أمرك البرمجي هنا..."
              className="w-full pl-12 pr-4 py-3 bg-slate-100 border-none rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <Send className="w-4 h-4 rtl:rotate-180" />
            </button>
          </div>
          
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*,application/pdf"
            onChange={handleFileUpload}
          />
        </div>
      </div>
    </div>
  );
};
