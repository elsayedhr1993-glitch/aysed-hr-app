import React, { useState } from 'react';
import { Sparkles, Lock, Mail, ShieldCheck, ArrowLeft, LogIn, KeyRound, Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LoginScreenProps {
  onLoginSuccess: (email: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('elsayedhr1993@gmail.com');
  const [password, setPassword] = useState('••••••••••••');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    const storedPassword = localStorage.getItem('app_admin_password') || 'Admin2026!';
    const inputPassword = password === '••••••••••••' ? 'Admin2026!' : password;

    try {
      let isSupabaseAuthed = false;

      if (supabase && import.meta.env.VITE_SUPABASE_URL) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: inputPassword,
        });

        if (!error && data?.user) {
          isSupabaseAuthed = true;
        }
      }

      // Check if entered password matches local stored password, default password, or Supabase
      const isValidPassword = 
        isSupabaseAuthed || 
        inputPassword === storedPassword || 
        inputPassword === 'Admin2026!';

      if (!isValidPassword) {
        setLoading(false);
        setErrorMessage('كلمة المرور التي أدخلتها غير صحيحة! يرجى إدخال كلمة المرور الصحيحة المعرفة في النظام.');
        return;
      }

      // Successful login
      setTimeout(() => {
        setLoading(false);
        onLoginSuccess(email);
      }, 300);
    } catch (err: any) {
      setLoading(false);
      setErrorMessage('حدث خطأ أثناء الاتصال بالنظام. يرجى التحقق من كلمة المرور.');
    }
  };

  const handleQuickDemoLogin = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLoginSuccess('elsayedhr1993@gmail.com');
    }, 300);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 font-['Cairo'] dir-rtl text-right">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Top Header */}
        <div className="bg-[#714B67] text-white p-6 text-center relative overflow-hidden">
          <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-amber-400/20 rounded-full blur-xl pointer-events-none" />
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-purple-400/20 rounded-full blur-xl pointer-events-none" />

          <div className="relative z-10 space-y-2">
            <div className="w-12 h-12 bg-amber-400 text-slate-950 font-black rounded-2xl flex items-center justify-center text-xl shadow-lg mx-auto border-2 border-amber-300">
              A
            </div>
            <h1 className="text-xl font-bold tracking-wide flex items-center justify-center gap-1.5 text-amber-300">
              <Sparkles className="w-5 h-5 text-amber-300" />
              <span>Aysed S HR 2026</span>
            </h1>
            <p className="text-xs text-white/80">
              نظام الموارد البشرية وإدارة الأجور والعمالة (Odoo Enterprise Kuwait)
            </p>
          </div>
        </div>

        {/* Login Form Body */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <LogIn className="w-5 h-5 text-[#714B67]" />
              <span>تسجيل الدخول للنظام</span>
            </h2>
            <p className="text-xs text-slate-500">
              أدخل بيانات حسابك المعتمد للدخول إلى لوحة إدارة الموارد البشرية.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            {/* Email Field */}
            <div className="space-y-1">
              <label className="block font-bold text-slate-700">
                البريد الإلكتروني / اسم المستخدم
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pr-9 pl-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#714B67] focus:border-[#714B67] text-slate-900 text-xs font-mono"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block font-bold text-slate-700">كلمة المرور</label>
                <span className="text-[10px] text-[#714B67] hover:underline cursor-pointer">
                  نسيت كلمة المرور؟
                </span>
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pr-9 pl-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#714B67] focus:border-[#714B67] text-slate-900 text-xs font-mono"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#714B67] hover:bg-[#5b3c53] text-white font-bold rounded-lg text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <span>جاري تسجيل الدخول...</span>
              ) : (
                <>
                  <span>تسجيل الدخول</span>
                  <ArrowLeft className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-white px-2 text-slate-400 font-bold">أو الدخول السريع</span>
            </div>
          </div>

          {/* Quick Admin Demo Login Button */}
          <button
            type="button"
            onClick={handleQuickDemoLogin}
            className="w-full py-2 px-4 bg-amber-50 hover:bg-amber-100/80 border border-amber-200 text-amber-900 font-bold rounded-lg text-xs transition flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>دخول سريع كمشرف النظام (Demo Admin)</span>
            </div>
            <span className="text-[10px] bg-amber-200/80 px-2 py-0.5 rounded text-amber-950">
              مدير HR
            </span>
          </button>
        </div>

        {/* Footer info */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 text-center text-[10px] text-slate-500">
          تطبيق متوافق مع أحكام قانون العمل الكويتي رقم 6/2010 ونظام الحماية الأجور (WPS)
        </div>
      </div>
    </div>
  );
};
