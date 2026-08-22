// src/components/auth/SubscriptionRequest.tsx
import React, { useState } from 'react';
import { 
  Building2, 
  User, 
  Phone, 
  Users, 
  ChevronRight, 
  CheckCircle2, 
  Loader2, 
  Stethoscope, 
  Briefcase,
  AlertCircle,
  ArrowRight,
  Mail
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface SubscriptionRequestProps {
  onBackToLogin?: () => void;
}

export const SubscriptionRequest: React.FC<SubscriptionRequestProps> = ({ onBackToLogin }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company_name: '',
    phone: '',
    sector: 'admin',
    employee_count: '1-10'
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      // Save to Firestore subscription_requests
      try {
        await addDoc(collection(db, 'subscription_requests'), {
          requesterName: formData.name.trim(),
          companyName: formData.company_name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          empCount: formData.employee_count,
          planType: formData.sector,
          status: 'new',
          createdAt: serverTimestamp()
        });
      } catch (fbErr) {
        console.warn('Firestore sub request warn:', fbErr);
      }

      // Save locally
      const savedSubs = JSON.parse(localStorage.getItem('aysed_saved_subscriptions') || '[]');
      savedSubs.push({
        id: 'sub-' + Date.now(),
        requesterName: formData.name.trim(),
        companyName: formData.company_name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        empCount: formData.employee_count,
        planType: formData.sector,
        status: 'new',
        createdAt: new Date().toISOString()
      });
      localStorage.setItem('aysed_saved_subscriptions', JSON.stringify(savedSubs));

      try {
        const { error } = await supabase
          .from('aysed_subscription')
          .insert([
            { 
              requester_name: formData.name.trim(), 
              name: formData.company_name.trim(), 
              phone: formData.phone.trim(), 
              plan_type: formData.sector,
              emp_count: formData.employee_count,
              state: 'draft'
            }
          ]);

        if (error) {
          console.warn('Supabase insert warning:', error);
        }
      } catch (sbErr) {
        console.warn('Supabase insert exception:', sbErr);
      }

      // Send welcome email
      if (formData.email) {
        try {
          await fetch('/api/send-welcome-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subscriberEmail: formData.email.trim(),
              subscriberName: formData.name.trim(),
              companyName: formData.company_name.trim(),
            }),
          });
        } catch (emailErr) {
          console.warn('Welcome email fetch error:', emailErr);
        }
      }

      setSuccess(true);
    } catch (err: any) {
      console.warn('Subscription error handled:', err);
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="w-full flex items-center justify-center p-4 font-sans text-slate-900" dir="rtl">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl text-center border-t-8 border-[#008784]">
          <CheckCircle2 size={64} className="text-[#008784] mx-auto mb-4 animate-bounce" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">تم استلام طلبك بنجاح!</h2>
          <p className="text-slate-700 mb-6 text-xs sm:text-sm leading-relaxed font-medium">
            شكراً لاهتمامك بـ <strong className="text-[#714B67]">Aysed S HR 2026</strong>. سيقوم فريق الإدارة بمراجعة بيانات شركة (<strong className="text-slate-900">{formData.company_name}</strong>) والتواصل معك لتفعيل نسختك التجريبية.
          </p>
          <button 
            onClick={onBackToLogin ? onBackToLogin : () => window.location.reload()} 
            className="w-full bg-[#714B67] hover:bg-[#583950] text-white py-2.5 rounded-xl font-bold transition-all text-xs sm:text-sm cursor-pointer shadow-md"
          >
            العودة لصفحة الدخول
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex items-center justify-center font-sans text-slate-900" dir="rtl">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-slate-200">

        {/* الجانب التعريفي */}
        <div className="md:w-1/3 bg-[#714B67] p-6 text-white flex flex-col justify-between items-center text-center">
          <div className="w-full">
            {onBackToLogin && (
              <button 
                onClick={onBackToLogin}
                className="flex items-center gap-1 text-xs text-purple-200 hover:text-white mb-4 transition-colors cursor-pointer"
              >
                <ArrowRight size={14} />
                <span>العودة للدخول</span>
              </button>
            )}
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-white/20">
              <Building2 size={26} className="text-white" />
            </div>
            <h3 className="text-base font-bold mb-1 text-white">Aysed Cloud</h3>
            <p className="text-xs text-white/80 leading-relaxed font-normal">
              منظومة الموارد البشرية المتكاملة والمتوافقة مع قانون العمل الكويتي.
            </p>
          </div>

          <div className="text-[11px] text-white/75 mt-4 md:mt-0 font-medium">
            إصدار 2026 الرسمي
          </div>
        </div>

        {/* نموذج إدخال البيانات */}
        <form onSubmit={handleSubmit} className="md:w-2/3 p-6 space-y-3.5 bg-white text-slate-900">
          <div className="border-b border-slate-200 pb-2.5">
            <h2 className="text-lg font-bold text-slate-900">طلب تجربة مجانية واشتراك</h2>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">سجل بياناتك وسيتم تفعيل حسابك والتواصل معك مباشرة</p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-800 text-xs font-semibold">
              <AlertCircle size={16} className="shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-800">الاسم الكامل *</label>
              <div className="relative">
                <User className="absolute right-3 top-3 text-slate-500" size={16} />
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  className="w-full pr-9 pl-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#714B67] outline-none text-slate-900 text-xs font-bold placeholder:text-slate-400 shadow-xs"
                  placeholder="محمد العازمي"
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-800">البريد الإلكتروني *</label>
              <div className="relative">
                <Mail className="absolute right-3 top-3 text-slate-500" size={16} />
                <input 
                  type="email" 
                  required
                  value={formData.email}
                  className="w-full pr-9 pl-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#714B67] outline-none text-slate-900 text-xs font-bold placeholder:text-slate-400 shadow-xs font-mono"
                  placeholder="name@company.com"
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-800">اسم المنشأة / الشركة *</label>
              <div className="relative">
                <Building2 className="absolute right-3 top-3 text-slate-500" size={16} />
                <input 
                  type="text" 
                  required
                  value={formData.company_name}
                  className="w-full pr-9 pl-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#714B67] outline-none text-slate-900 text-xs font-bold placeholder:text-slate-400 shadow-xs"
                  placeholder="مؤسسة الأعمال الحديثة"
                  onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-800">رقم الهاتف (الكويت) *</label>
              <div className="relative">
                <Phone className="absolute right-3 top-3 text-slate-500" size={16} />
                <input 
                  type="tel" 
                  required
                  value={formData.phone}
                  className="w-full pr-9 pl-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#714B67] outline-none text-slate-900 text-xs font-bold placeholder:text-slate-400 shadow-xs font-mono"
                  placeholder="9xxxxxxx"
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800">عدد الموظفين</label>
            <div className="relative">
              <Users className="absolute right-3 top-3 text-slate-500" size={16} />
              <select 
                value={formData.employee_count}
                className="w-full pr-9 pl-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#714B67] outline-none text-slate-900 text-xs font-bold appearance-none cursor-pointer shadow-xs"
                onChange={(e) => setFormData({...formData, employee_count: e.target.value})}
              >
                <option value="1-10" className="text-slate-900 bg-white">من 1 إلى 10 موظفين</option>
                <option value="11-50" className="text-slate-900 bg-white">من 11 إلى 50 موظف</option>
                <option value="50+" className="text-slate-900 bg-white">أكثر من 50 موظف</option>
              </select>
            </div>
          </div>

          {/* اختيار القطاع */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-bold text-slate-800">قطاع العمل الرئيسي</label>
            <div className="grid grid-cols-2 gap-3">
              <button 
                type="button"
                onClick={() => setFormData({...formData, sector: 'medical'})}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  formData.sector === 'medical' 
                    ? 'border-[#714B67] bg-purple-50 text-[#714B67] shadow-xs' 
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Stethoscope size={16} /> القطاع الطبي
              </button>
              <button 
                type="button"
                onClick={() => setFormData({...formData, sector: 'admin'})}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  formData.sector === 'admin' 
                    ? 'border-[#714B67] bg-purple-50 text-[#714B67] shadow-xs' 
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Briefcase size={16} /> القطاع الإداري والتجاري
              </button>
            </div>
          </div>

          {/* زر الإرسال */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#008784] hover:bg-[#00706e] text-white font-bold py-2.5 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.99] text-xs sm:text-sm mt-3 cursor-pointer disabled:opacity-70"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : null}
            <span>إرسال طلب الانضمام</span>
            <ChevronRight size={18} className="rotate-180" />
          </button>
        </form>

      </div>
    </div>
  );
};

export default SubscriptionRequest;
