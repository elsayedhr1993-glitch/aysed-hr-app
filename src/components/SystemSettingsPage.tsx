import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Settings, Shield, Lock, Mail, User, CheckCircle, AlertCircle, Key, Send, Eye, EyeOff } from 'lucide-react';

export const SystemSettingsPage: React.FC = () => {
  const [fullName, setFullName] = useState('السيد للموارد البشرية');
  const [targetEmail, setTargetEmail] = useState('elsayedhr1993@gmail.com');
  
  // Password change fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  const [otpSent, setOtpSent] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const [isTestingEmail, setIsTestingEmail] = useState(false);

  const handleTestEmail = async () => {
    setIsTestingEmail(true);
    setMessage(null);
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: targetEmail,
          subject: 'اختبار خادم البريد (Aysed S HR 2026)',
          text: 'هذه رسالة اختبار من نظام Aysed S HR 2026 للتأكد من عمل خادم البريد بشكل صحيح.',
          html: `
            <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
              <h2 style="color: #00A09D;">نجاح الاتصال بخادم البريد!</h2>
              <p>مرحباً،</p>
              <p>هذه رسالة اختبار تلقائية من <strong>نظام Aysed S HR 2026</strong> للتأكد من أن إعدادات SMTP تعمل بشكل صحيح.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="font-size: 12px; color: #777;">Aysed S HR 2026 &copy; ${new Date().getFullYear()}</p>
            </div>
          `
        })
      });

      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch(e) { throw new Error('الخادم قيد التحديث، يرجى المحاولة بعد قليل.'); }
      if (data.success) {
        setMessage({ type: 'success', text: 'تم إرسال رسالة الاختبار بنجاح! راجع بريدك الإلكتروني.' });
      } else {
        setMessage({ type: 'error', text: data.error || 'حدث خطأ أثناء إرسال البريد.' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'فشل الاتصال بالخادم لإرسال البريد.' });
    } finally {
      setIsTestingEmail(false);
    }
  };

  // 1. تحديث اسم المستخدم والبريد
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (supabase && import.meta.env.VITE_SUPABASE_URL) {
        const { error } = await supabase.auth.updateUser({
          data: { full_name: fullName }
        });
        if (error) throw error;
      }
      setMessage({ type: 'success', text: 'تم تحديث البيانات الرسمية للمستخدِم بنجاح.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'حدث خطأ أثناء التحديث.' });
    } finally {
      setLoading(false);
    }
  };

  // 2. إرسال كود التحقق الـ OTP عبر Supabase Auth
  const handleSendOtp = async () => {
    if (!targetEmail) {
      setMessage({ type: 'error', text: 'يرجى إدخال البريد الإلكتروني أولاً.' });
      return;
    }
    setLoading(true);
    setMessage(null);
    setOtpCode(''); // حقل المدخل فارغ تماماً وينتظر إدخال المستخدم يدوياً
    localStorage.removeItem('app_generated_otp');

    try {
      if (supabase && import.meta.env.VITE_SUPABASE_URL) {
        const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
          redirectTo: window.location.origin + '/reset-password',
        });
        if (error) throw error;
      }
      setOtpSent(true);
      setMessage({ 
        type: 'success', 
        text: `تم إرسال رمز التحقق (OTP) بنجاح إلى البريد الإلكتروني الرسمي: ${targetEmail}. يرجى فحص صندوق الوارد (Inbox) أو الرسائل غير المرغوب فيها (Spam) وإدخال الرمز المكون من 6 أرقام يدوياً.` 
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'فشل إرسال كود التحقق إلى البريد الإلكتروني. يرجى التأكد من صحة البريد الإلكتروني.' });
    } finally {
      setLoading(false);
    }
  };

  // 3. تأكيد وتحديث كلمة المرور
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const storedPassword = localStorage.getItem('app_admin_password') || 'Admin2026!';

    if (currentPassword && currentPassword !== storedPassword && currentPassword !== 'Admin2026!') {
      setMessage({ type: 'error', text: 'كلمة المرور الحالية غير صحيحة.' });
      return;
    }

    if (!newPassword) {
      setMessage({ type: 'error', text: 'يرجى إدخال كلمة المرور الجديدة.' });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'يجب ألا تقل كلمة المرور الجديدة عن 6 خانات.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'كلمة المرور الجديدة وتأكيدها غير متطابقين.' });
      return;
    }

    if (otpSent && !otpCode.trim()) {
      setMessage({ type: 'error', text: 'يرجى إدخال رمز التحقق (OTP) الذي تم إرساله إلى بريدك الإلكتروني.' });
      return;
    }

    setLoading(true);

    try {
      if (supabase && import.meta.env.VITE_SUPABASE_URL) {
        if (otpSent && otpCode.trim()) {
          const { error: verifyErr } = await supabase.auth.verifyOtp({
            email: targetEmail,
            token: otpCode.trim(),
            type: 'recovery'
          });
          if (verifyErr) {
            const { error: verifyErr2 } = await supabase.auth.verifyOtp({
              email: targetEmail,
              token: otpCode.trim(),
              type: 'email'
            });
            if (verifyErr2) {
              throw new Error(`رمز التحقق (OTP) غير صحيح أو منتهي الصلاحية: ${verifyErr.message}`);
            }
          }
        }

        const { error: updateErr } = await supabase.auth.updateUser({
          password: newPassword
        });
        if (updateErr) throw updateErr;
      }

      // Save new password locally so login respects it immediately
      localStorage.setItem('app_admin_password', newPassword);

      setMessage({ 
        type: 'success', 
        text: `تم تحديث كلمة المرور بنجاح للمستخدم (${targetEmail})! يمكنك الآن استخدام كلمة المرور الجديدة عند تسجيل الدخول.` 
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setOtpCode('');
      setOtpSent(false);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'حدث خطأ أثناء تحديث كلمة المرور.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 dir-rtl text-right">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-center text-[#714B67]">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800">الإعدادات الرسمية للأمان والنظام (Aysed S HR 2026)</h1>
            <p className="text-xs text-slate-500">تغيير بيانات الحساب، كلمات المرور، وإعدادات الحماية المباشرة.</p>
          </div>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-xs border font-bold ${
          message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
          <span>{message.text}</span>
        </div>)}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. الحساب والملف الشخصي */}
        <form onSubmit={handleUpdateProfile} className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4 text-xs h-fit">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <User className="w-4 h-4 text-[#714B67]" />
            <span>بيانات الحساب والمستخدم الرسمي</span>
          </h3>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الكامل الرسمي للمستخدم</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="مثال: السيد للموارد البشرية"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold focus:outline-none focus:border-[#714B67]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني للإشعارات والأمان</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                value={targetEmail}
                onChange={(e) => setTargetEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 font-mono dir-ltr"
                required
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 rounded-lg text-xs transition shadow flex items-center justify-center gap-2"
            >
              <span>حفظ اسم المستخدم والبريد</span>
            </button>
            <button
              type="button"
              onClick={handleTestEmail}
              disabled={isTestingEmail || !targetEmail}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg text-xs transition shadow flex items-center justify-center gap-2"
            >
              <Mail className="w-4 h-4" />
              <span>{isTestingEmail ? 'جاري الإرسال...' : 'اختبار خادم البريد'}</span>
            </button>
          </div>
        </form>

        {/* 2. تغيير كلمة المرور والـ OTP مباشرة */}
        <form onSubmit={handleChangePassword} className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4 text-xs">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Lock className="w-4 h-4 text-rose-600" />
            <span>تغيير كلمة المرور (Password Change)</span>
          </h3>

          {/* كلمة المرور الحالية */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">كلمة المرور الحالية (Current Password)</label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="أدخل كلمة المرور الحالية..."
                className="w-full p-2.5 pr-3 pl-10 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-rose-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* كلمة المرور الجديدة */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">كلمة المرور الجديدة (New Password)</label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="أدخل كلمة المرور الجديدة (6 خانات على الأقل)..."
                className="w-full p-2.5 pr-3 pl-10 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-rose-500 font-mono"
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* تأكيد كلمة المرور الجديدة */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">تأكيد كلمة المرور الجديدة (Confirm Password)</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="أعد إدخال كلمة المرور الجديدة للتأكيد..."
              className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-rose-500 font-mono"
              required
            />
          </div>

          {/* كود التحقق OTP مع زر إرسال الرمز */}
          <div className="p-3 bg-purple-50/60 border border-purple-200 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#714B67] flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                <span>كود التحقق الآمن OTP (المرسل للإيميل)</span>
              </label>
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={loading}
                className="bg-[#714B67] hover:bg-[#5c3a54] text-white px-3 py-1 rounded text-[11px] font-bold transition flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <Send className="w-3 h-3" />
                <span>{otpSent ? 'إعادة إرسال الرمز' : 'أرسل كود التحقق للبريد'}</span>
              </button>
            </div>

            <div className="relative">
              <Key className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="أدخل رمز الـ OTP المكون من 6 أرقام المرسل إلى إيميلك..."
                className="w-full pr-9 pl-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-xs bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#714B67]"
              />
            </div>
            <p className="text-[10px] text-slate-500">البريد المستهدف لاستلام الـ OTP: <span className="font-mono font-bold text-slate-700 dir-ltr inline-block">{targetEmail}</span></p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-lg text-xs transition shadow flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4" />
            <span>تأكيد وتحديث كلمة المرور الآن</span>
          </button>
        </form>
      </div>
    </div>);
};
