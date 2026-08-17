import React, { useState, useRef, useEffect } from 'react';
import { Company, Employee, Contract, LeaveRequest } from '../types';
import { 
  Sparkles, Send, Bot, User, RefreshCw, Copy, Check, 
  HelpCircle, Scale, FileText, Calculator, ShieldCheck, Zap,
  Building2, Users, PlusCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

interface AICopilotAppProps {
  activeCompany: Company;
  employees: Employee[];
  contracts: Contract[];
  leaves: LeaveRequest[];
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  source?: string;
}

export const AICopilotApp: React.FC<AICopilotAppProps> = ({
  activeCompany,
  employees,
  contracts,
  leaves,
}) => {
  const companyEmployees = (employees || []).filter(e => e.companyId === (activeCompany?.id || 'comp-1'));
  const companyContracts = (contracts || []).filter(c => c.companyId === (activeCompany?.id || 'comp-1'));
  const companyLeaves = (leaves || []).filter(l => l.companyId === (activeCompany?.id || 'comp-1'));

  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log("جاري معالجة الملف في نظام Aysed S HR 2026...", file.name);
      toast.success(`جاري قراءة الملف: ${file.name} عبر تقنية OCR`);
      // Future processing logic for OCR
    }
  };

  // Initial greeting message
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `أهلاً بك في **مساعد أودو الذكي (Odoo Kuwait Enterprise AI Copilot)**! 🤖✨

أنا مستشارك المباشر المتخصص في **قانون العمل الكويتي رقم 6/2010** وإدارة الموارد البشرية والرواتب بالنظام.

**بيانات الشركة الحالية المتاحة لي للتحليل:**
- **الشركة النشطة:** ${activeCompany?.nameAr || ''}
- **إجمالي الموظفين:** ${companyEmployees.length} موظف
- **العقود النشطة:** ${companyContracts.length} عقد عمل
- **طلبات الإجازات:** ${companyLeaves.length} طلب

اسألني عن أي استفسار قانوني، حسابات نهاية الخدمة، مستحقات الإجازات، أو ملخصات بيانات الموظفين بالشركة!`,
      timestamp: new Date().toLocaleTimeString('ar-KW', { hour: '2-digit', minute: '2-digit' }),
      source: 'system'
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Context summary to send with each request
  const getContextSummary = () => {
    const totalSalaries = companyContracts.reduce((acc, c) => acc + (c.basicSalary + c.housingAllowance + c.transportAllowance + c.otherAllowance), 0);
    const activeLeavesCount = companyLeaves.filter(l => l.status === 'APPROVED').length;

    const empListPreview = companyEmployees.map(e => {
      const cnt = companyContracts.find(c => c.employeeId === e.id);
      const salary = cnt ? (cnt.basicSalary + cnt.housingAllowance + cnt.transportAllowance + cnt.otherAllowance) : 0;
      return `- ${e.fullNameAr} (${e.employeeCode}) | المسمى: ${e.jobTitle} | تاريخ المباشرة: ${e.joinDate} | الراتب الشامل: ${salary.toFixed(3)} KWD`;
    }).join('\n');

    return `الشركة: ${activeCompany?.nameAr || ''} (السجل: ${activeCompany?.commercialRegNo || ''}, المدني: ${activeCompany?.civilIdCompany || ''})
إجمالي الموظفين: ${companyEmployees.length}
إجمالي الرواتب الشهرية: ${totalSalaries.toFixed(3)} KWD
الإجازات المعتمدة: ${activeLeavesCount}

قائمة الموظفين:
${empListPreview}`;
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputPrompt;
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString('ar-KW', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customText) setInputPrompt('');
    setLoading(true);

    try {
      const history = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          contextSummary: getContextSummary(),
          conversationHistory: history,
        })
      });

      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch(e) { throw new Error(text.includes('502') ? 'الخادم قيد التحديث، يرجى المحاولة بعد قليل.' : 'استجابة غير صالحة من الخادم'); }

      if (data.success && data.reply) {
        const assistantMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.reply,
          timestamp: new Date().toLocaleTimeString('ar-KW', { hour: '2-digit', minute: '2-digit' }),
          source: data.source
        };
        setMessages(prev => [...prev, assistantMsg]);
      } else {
        throw new Error(data.error || 'فشل استلام الإجابة');
      }
    } catch (err: any) {
      console.error('AI Chat Error:', err);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `⚠️ تعذر الاتصال بمساعد أودو الذكي حالياً: ${err.message || 'يرجى المحاولة مرة أخرى'}.`,
        timestamp: new Date().toLocaleTimeString('ar-KW', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const quickPrompts = [
    {
      title: 'حساب مكافأة نهاية الخدمة',
      desc: 'حساب مستحقات موظف استقال بعد 7 سنوات خدمة وراتبه 1,200 د.ك',
      prompt: 'قم بحساب مكافأة نهاية الخدمة لموظف استقال بعد 7 سنوات خدمة متواصلة وراتبه الشامل 1,200.000 د.ك بالتفصيل وفق المادة 51 و53.',
      icon: Calculator,
      color: 'bg-purple-50 text-purple-700 border-purple-200'
    },
    {
      title: 'قواعد الإجازة السنوية 2026',
      desc: 'كيف يحسب استحقاق 2.5 يوم شهرياً مع المباشرة وتدوير 2025؟',
      prompt: 'اشرح لي آلية احتساب استحقاق الإجازة السنوية (2.5 يوم/شهر) وكيف يتعامل النظام مع التعيينات الجديدة خلال 2026 مقارنة بالتدوير من 2025.',
      icon: Scale,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    },
    {
      title: 'تحليل تكاليف عمالة الشركة',
      desc: 'ملخص كشف الرواتب والموظفين بالشركة الحالية بالدينار الكويتي',
      prompt: 'اعطني تحليلاً شاملاً لكادر الموظفين والرواتب بالشركة الحالية بناءً على البيانات المتوفرة لديك مع توضيح متوسط الراتب وإحصائيات القوى العاملة.',
      icon: FileText,
      color: 'bg-blue-50 text-blue-700 border-blue-200'
    },
    {
      title: 'ضوابط إجازة الوضع والأمومة',
      desc: 'المادة 24 من قانون العمل الكويتي للموظفات',
      prompt: 'ما هي أحكام وضوابط إجازة الوضع والأمومة مدفوعة الأجر وفق المادة 24 من قانون العمل الكويتي؟',
      icon: ShieldCheck,
      color: 'bg-amber-50 text-amber-700 border-amber-200'
    }
  ];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5 dir-rtl font-['Cairo']">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#714B67] to-[#51354a] rounded-xl text-white p-5 shadow-sm relative overflow-hidden">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none">
          <Sparkles className="w-48 h-48 text-white" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-amber-400 text-slate-900 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                <Zap className="w-3 h-3 fill-slate-900" /> Odoo Copilot AI
              </span>
              <span className="bg-white/20 text-white text-[11px] px-2 py-0.5 rounded-full">
                قانون العمل الكويتي رقم 6/2010
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <Bot className="w-7 h-7 text-amber-300" />
              اسأل مساعد أودو الذكي | Odoo Kuwait HR Copilot
            </h1>
            <p className="text-slate-200 text-xs mt-1 max-w-2xl">
              مستشارك المباشر المتخصص في قانون العمل الكويتي، احتساب مكافأة نهاية الخدمة، استحقاقات الإجازات، وحماية الأجور WSI.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/10 backdrop-blur px-3 py-2 rounded-lg border border-white/20 text-xs">
            <Building2 className="w-5 h-5 text-amber-300 shrink-0" />
            <div>
              <div className="font-bold text-white">{activeCompany?.nameAr || ''}</div>
              <div className="text-[10px] text-slate-300 flex items-center gap-2 mt-0.5">
                <span><Users className="w-3 h-3 inline ml-0.5" />{companyEmployees.length} موظف</span>
                <span>•</span>
                <span>{companyContracts.length} عقد</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Prompts Suggestions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {quickPrompts.map((qp, idx) => {
          const IconComp = qp.icon;
          return (
            <button
              key={idx}
              onClick={() => handleSendMessage(qp.prompt)}
              disabled={loading}
              className={`p-3.5 rounded-xl border text-right transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between ${qp.color}`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs">{qp.title}</span>
                  <IconComp className="w-4 h-4 opacity-80" />
                </div>
                <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                  {qp.desc}
                </p>
              </div>
              <div className="mt-2 text-[10px] font-bold flex items-center gap-1 text-slate-700">
                <span>اسأل الآن</span>
                <Sparkles className="w-3 h-3" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Chat Messages Box */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[520px]">
        
        {/* Chat Top Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between text-xs text-slate-700 font-medium">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>جلسة المحادثة التفاعلية نشطة (Odoo 17 Copilot)</span>
          </div>
          <button
            onClick={() => setMessages([messages[0]])}
            className="text-slate-500 hover:text-rose-600 transition flex items-center gap-1 text-[11px]"
            title="إعادة ضبط المحادثة"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>تفريغ المحادثة</span>
          </button>
        </div>

        {/* Chat Body */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-transparent">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-start' : 'justify-start'}`}
            >
              {msg.role === 'assistant' ? (
                <div className="w-8 h-8 rounded-full bg-[#714B67] text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}

              <div className={`flex-1 max-w-3xl rounded-2xl p-4 shadow-sm text-xs leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-slate-800 text-white rounded-tr-none' 
                  : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
              }`}>
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100/60 text-[10px] text-slate-400">
                  <span className="font-bold flex items-center gap-1 text-slate-500">
                    {msg.role === 'assistant' ? '🤖 Odoo AI Copilot' : '👤 المستخدم'}
                    {msg.source && (
                      <span className="bg-amber-50 text-amber-800 border border-amber-200 px-1 rounded text-[9px]">
                        {msg.source}
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    <span>{msg.timestamp}</span>
                    <button
                      onClick={() => handleCopy(msg.id, msg.content)}
                      className="hover:text-slate-700 transition"
                      title="نسخ النص"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Formatted Markdown Content */}
                <div className="prose prose-xs max-w-none space-y-2 whitespace-pre-wrap font-sans text-slate-800">
                  {msg.content.split('\n').map((line, lIdx) => {
                    if (line.startsWith('### ')) {
                      return <h3 key={lIdx} className="font-bold text-sm text-[#714B67] mt-2 mb-1">{line.replace('### ', '')}</h3>;
                    }
                    if (line.startsWith('## ')) {
                      return <h2 key={lIdx} className="font-bold text-base text-[#714B67] mt-3 mb-1">{line.replace('## ', '')}</h2>;
                    }
                    if (line.startsWith('- ') || line.startsWith('* ')) {
                      return (
                        <div key={lIdx} className="flex items-start gap-1.5 my-0.5 pr-2">
                          <span className="text-amber-600 font-bold">•</span>
                          <span>{line.replace(/^[-*]\s+/, '')}</span>
                        </div>
                      );
                    }
                    return <p key={lIdx} className="my-0.5">{line}</p>;
                  })}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 items-center">
              <div className="w-8 h-8 rounded-full bg-[#714B67] text-white flex items-center justify-center shrink-0 shadow-sm animate-bounce">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-3.5 shadow-sm text-xs text-slate-600 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#714B67]" />
                <span>جاري تحليل الطلب والرجوع لمواد قانون العمل الكويتي وبيانات الشركة...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white border-t border-slate-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-[#71639e] hover:text-[#008784] transition-colors p-1"
              title="إرفاق ملف (صورة مدنية، جواز، الخ)"
            >
              <PlusCircle className="w-6 h-6" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*,application/pdf"
              onChange={handleFileUpload}
            />
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="اكتب أمرك البرمجي هنا..."
              disabled={loading}
              className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-[#714B67] focus:bg-white transition"
            />
            <button
              type="submit"
              disabled={!inputPrompt.trim() || loading}
              className="bg-[#714B67] hover:bg-[#5a3a52] disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer"
            >
              <span>إرسال</span>
              <Send className="w-3.5 h-3.5 rotate-180" />
            </button>
          </form>
          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 px-1">
            <span className="flex items-center gap-1">
              <HelpCircle className="w-3 h-3" /> يتم معالجة الاستفسارات بدقة عبر محرك Gemini 3.6 Flash مع سياق Odoo 17 Enterprise.
            </span>
            <span>الدينار الكويتي 0.000 KWD</span>
          </div>
        </div>

      </div>

    </div>
  );
};
