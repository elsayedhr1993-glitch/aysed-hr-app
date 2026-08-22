// src/components/auth/Login.tsx
import React, { useState } from 'react';
import { Lock, Mail, Loader2, Globe, ShieldCheck, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase'; // مسار اتصال Supabase لديك

interface LoginProps {
  onSuccess?: () => void;
  onRequestTrial?: () => void;
}

export const Login: React.FC<LoginProps> = ({ onSuccess, onRequestTrial }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        throw error;
      }

      if (data?.session) {
        if (onSuccess) {
          onSuccess();
        } else {
          window.location.href = '/';
        }
      }
    } catch (err: any) {
      setErrorMessage(
        err.message === 'Invalid login credentials'
          ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
          : err.message || 'تعذر تسجيل الدخول، يرجى المحاولة لاحقاً'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#71639e] to-[#353b48] font-sans p-4" dir="rtl">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100">

        {/* الترويسة واللوجو */}
        <div className="p-8 pb-2 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-purple-50 rounded-2xl mb-4 border border-purple-100 shadow-sm">
            <ShieldCheck size={42} className="text-[#71639e]" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Aysed S HR 2026</h1>
          <p className="text-gray-500 text-xs">منظومة إدارة الموارد البشرية السحابية - الكويت</p>
        </div>

        {/* تنبيه الأخطاء */}
        {errorMessage && (
          <div className="mx-8 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700 text-xs">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* نموذج الدخول */}
        <form onSubmit={handleLogin} className="p-8 space-y-4" autoComplete="off">

          {/* حقل البريد */}
          <div className="relative">
            <label className="block text-xs font-semibold text-gray-700 mb-1 text-right">البريد الإلكتروني</label>
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="email"
                required
                className="w-full pr-10 pl-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#71639e] focus:border-transparent outline-none transition-all text-right text-sm"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="new-email"
              />
            </div>
          </div>

          {/* حقل كلمة المرور */}
          <div className="relative">
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-gray-700 text-right">كلمة المرور</label>
              <a href="#" className="text-[11px] text-[#71639e] hover:underline">نسيت كلمة المرور؟</a>
            </div>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="password"
                required
                className="w-full pr-10 pl-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#71639e] focus:border-transparent outline-none transition-all text-right text-sm"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>

          {/* زر الدخول الاحترافي */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#008784] hover:bg-[#00706e] text-white font-bold py-2.5 rounded-lg shadow-md hover:shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 text-sm mt-2 cursor-pointer disabled:opacity-70"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : null}
            <span>دخول النظام</span>
          </button>

          {/* روابط الاشتراك (SaaS Model) */}
          <div className="pt-4 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-600 mb-2.5">هل تمتلك منشأة وتريد الانضمام إلينا؟</p>
            <button
              type="button"
              onClick={onRequestTrial}
              className="text-[#71639e] font-semibold hover:bg-purple-50 transition-colors border border-[#71639e] px-5 py-1.5 rounded-full text-xs cursor-pointer"
            >
              اطلب تجربة مجانية لشركتك الآن
            </button>
          </div>
        </form>

        {/* تذييل الصفحة */}
        <div className="p-3 bg-gray-50 text-center text-[10px] text-gray-400 border-t border-gray-100 flex justify-center items-center gap-4">
          <span>الإصدار 2.0.0</span>
          <span>&copy; 2026 Aysed Technologies</span>
          <span className="flex items-center gap-1"><Globe size={10}/> الكويت</span>
        </div>

      </div>
    </div>
  );
};

export default Login;
