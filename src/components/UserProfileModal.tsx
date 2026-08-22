import React, { useState } from 'react';
import { X, ShieldCheck, User, Mail, Lock, CheckCircle2, Globe, AlertCircle } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { updateProfile, updateEmail, verifyBeforeUpdateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { useLang } from '../lib/i18n';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const user = auth.currentUser;
  const { lang, setLang } = useLang();
  
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [userLang, setUserLang] = useState<'ar_001' | 'en_US'>(lang === 'en' ? 'en_US' : 'ar_001');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);

  if (!isOpen || !user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPassword) {
      toast.error('كلمة المرور الجديدة غير متطابقة');
      return;
    }
    
    // We need current password to re-authenticate if email or password is changed
    const needsReauth = (email.trim().toLowerCase() !== (user.email || '').toLowerCase()) || (newPassword !== '');
    
    if (needsReauth && !currentPassword) {
      toast.error('يرجى إدخال كلمة المرور الحالية لحفظ التعديلات الأمنية (البريد أو كلمة المرور)');
      return;
    }

    setLoading(true);
    try {
      if (needsReauth && user.email) {
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
      }

      const updates: any = {};
      let authUpdated = false;
      let emailVerificationSent = false;

      // 1. Update Display Name
      if (displayName !== user.displayName) {
        await updateProfile(user, { displayName });
        updates.displayName = displayName;
        authUpdated = true;
      }

      // 2. Update Email
      const cleanNewEmail = email.trim().toLowerCase();
      if (cleanNewEmail && cleanNewEmail !== (user.email || '').toLowerCase()) {
        try {
          // Attempt verifyBeforeUpdateEmail first (Firebase v9+ standard)
          await verifyBeforeUpdateEmail(user, cleanNewEmail);
          emailVerificationSent = true;
          updates.pendingEmail = cleanNewEmail;
        } catch (verifyErr: any) {
          // Fallback to updateEmail if allowed
          try {
            await updateEmail(user, cleanNewEmail);
            updates.email = cleanNewEmail;
            authUpdated = true;
          } catch (updateErr: any) {
            // Attempt backend admin API update
            try {
              const res = await fetch('/api/admin/update-user-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentEmail: user.email, newEmail: cleanNewEmail })
              });
              const resJson = await res.json();
              if (resJson.success) {
                updates.email = cleanNewEmail;
                authUpdated = true;
              } else {
                // If it required verification
                if (verifyErr?.code === 'auth/operation-not-allowed' || verifyErr?.message?.includes('verify')) {
                  emailVerificationSent = true;
                  updates.pendingEmail = cleanNewEmail;
                } else {
                  throw verifyErr || updateErr;
                }
              }
            } catch (adminErr) {
              if (verifyErr?.code === 'auth/operation-not-allowed' || verifyErr?.message?.includes('verify')) {
                emailVerificationSent = true;
                updates.pendingEmail = cleanNewEmail;
              } else {
                throw verifyErr || updateErr;
              }
            }
          }
        }
      }

      // 3. Update Password
      if (newPassword) {
        await updatePassword(user, newPassword);
        authUpdated = true;
      }

      // 4. Update Language Preference
      const newLangIso = userLang === 'en_US' ? 'en' : 'ar';
      if (newLangIso !== lang) {
        setLang(newLangIso);
        updates.lang = userLang;
        updates.res_lang_code = userLang;
        updates.res_lang_direction = userLang === 'ar_001' ? 'rtl' : 'ltr';
      }

      // 5. Update in Firestore
      if (Object.keys(updates).length > 0) {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, updates, { merge: true });
      }

      if (emailVerificationSent) {
        toast.success(`تم إرسال رابط تأكيد إلى بريدك الجديد (${cleanNewEmail}). يرجى التحقق من البريد لتأكيد التغيير.`, { duration: 6000 });
      } else if (authUpdated || Object.keys(updates).length > 0) {
        toast.success('تم حفظ وتحديث بيانات الملف الشخصي والأمان بنجاح');
      } else {
        toast('لم يتم إجراء أي تعديلات');
      }
      onClose();
    } catch (err: any) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        toast.error('كلمة المرور الحالية غير صحيحة');
      } else if (err.code === 'auth/email-already-in-use') {
        toast.error('البريد الإلكتروني مستخدم بالفعل لحساب آخر');
      } else if (err.code === 'auth/weak-password') {
        toast.error('كلمة المرور الجديدة ضعيفة جداً (يجب ألا تقل عن 6 أحرف)');
      } else if (err.code === 'auth/requires-recent-login') {
        toast.error('يرجى تسجيل الدخول مرة أخرى لإتمام التغييرات الأمنية الحساسة');
      } else if (err.code === 'auth/operation-not-allowed' || err.message?.includes('verify the new email')) {
        toast.error('يتطلب تغيير البريد الإلكتروني التحقق من عنوان البريد الجديد قبل الاعتماد.');
      } else {
        toast.error('خطأ في حفظ البيانات: ' + (err.message || 'خطأ غير معروف'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 dir-rtl text-right">
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>إعدادات الملف الشخصي والأمان</span>
          </h3>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex items-center gap-3">
            <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-bold text-xl">
              {displayName ? displayName.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm">{displayName || 'مستخدم النظام'}</p>
              <p className="text-xs text-slate-500 font-mono">{user.email}</p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1">
                <User className="w-3.5 h-3.5" />
                الاسم الظاهر (Full Name)
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="أدخل اسمك هنا..."
                className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-[13px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1">
                <Mail className="w-3.5 h-3.5" />
                البريد الإلكتروني (Email)
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-[13px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 font-mono text-left dir-ltr"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1">
                <Globe className="w-3.5 h-3.5" />
                لغة واجهة المستخدم المفضلة (res.lang)
              </label>
              <select
                value={userLang}
                onChange={(e) => setUserLang(e.target.value as any)}
                className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-[13px] font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <option value="ar_001">🇰🇼 العربية - Arabic (ar_001 | RTL)</option>
                <option value="en_US">🇺🇸 English - US (en_US | LTR)</option>
              </select>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4 mt-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-2">
              <Lock className="w-4 h-4 text-slate-500" />
              إعدادات كلمة المرور
            </h4>
            <div>
              <input
                type="password"
                placeholder="كلمة المرور الحالية (مطلوبة لتغيير الإيميل أو الباسورد)"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-[13px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 font-mono text-left dir-ltr"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="password"
                placeholder="كلمة المرور الجديدة"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-[13px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 font-mono text-left dir-ltr"
              />
              <input
                type="password"
                placeholder="تأكيد كلمة المرور الجديدة"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-[13px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 font-mono text-left dir-ltr"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold transition cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-bold shadow transition cursor-pointer flex items-center gap-2 disabled:opacity-70"
            >
              {loading ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>حفظ التعديلات</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
