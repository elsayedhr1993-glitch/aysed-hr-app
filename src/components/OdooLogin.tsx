import React, { useState } from 'react';
import { Sparkles, Building2, User, Mail, Lock, Phone, Users, CheckCircle2, X, Rocket, ShieldCheck, AlertCircle, KeyRound } from 'lucide-react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth, db, cleanFirestoreData } from '../lib/firebase';
import { doc, setDoc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { isMasterAdminEmail } from '../utils/tenantRouter';

interface OdooLoginProps {
  onLogin: (email: string) => void;
}

export const OdooLogin: React.FC<OdooLoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

  // Subscription Request Form State
  const [subscriptionForm, setSubscriptionForm] = useState({
    requesterName: '',
    companyName: '',
    phone: '',
    empCount: '1-10',
    planType: 'medical'
  });

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      const msg = 'الرجاء إدخال البريد الإلكتروني وكلمة المرور';
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }
    
    setLoading(true);
    try {
      try {
        // Strict Firebase Authentication
        const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
        const uid = userCredential.user.uid;
        
        // Fetch or synchronize user doc in Firestore
        const userDocRef = doc(db, 'users', uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (isMasterAdminEmail(cleanEmail)) {
          // Master Admin role enforcement
          await setDoc(userDocRef, {
            email: cleanEmail,
            role: 'SUPER_ADMIN',
            companyId: 'comp-1',
            companyNumber: 1,
            timezone: 'Asia/Kuwait',
            lastLogin: new Date().toISOString()
          }, { merge: true });
        } else if (!userDocSnap.exists()) {
          await setDoc(userDocRef, {
            email: cleanEmail,
            role: 'COMPANY_ADMIN',
            timezone: 'Asia/Kuwait',
            lastLogin: new Date().toISOString()
          }, { merge: true });
        }

        toast.success('تم تسجيل الدخول بنجاح عبر Firebase Authentication');
        onLogin(cleanEmail);
      } catch (authError: any) {
        // Firebase returns 'auth/invalid-credential' for both non-existent users and wrong passwords.
        // Let's try creating the account if it doesn't exist yet.
        if (authError.code === 'auth/user-not-found' || authError.code === 'auth/invalid-credential' || authError.code === 'auth/invalid-login-credentials') {
          try {
            const newCred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
            const role = isMasterAdminEmail(cleanEmail) ? 'SUPER_ADMIN' : 'COMPANY_ADMIN';
            const companyId = isMasterAdminEmail(cleanEmail) ? 'comp-1' : 'comp-2';
            const companyNumber = isMasterAdminEmail(cleanEmail) ? 1 : 2;

            await setDoc(doc(db, 'users', newCred.user.uid), {
              email: cleanEmail,
              role,
              companyId,
              companyNumber,
              timezone: 'Asia/Kuwait',
              createdAt: new Date().toISOString(),
              lastLogin: new Date().toISOString()
            });
            toast.success('تم إنشاء حساب جديد وتسجيل الدخول بنجاح');
            onLogin(cleanEmail);
            return;
          } catch (createErr: any) {
            // If creation failed with email-already-in-use, it means the user exists but password was wrong.
            if (createErr.code === 'auth/email-already-in-use') {
              let readableError = 'كلمة المرور غير صحيحة لهذا البريد الإلكتروني. يرجى التحقق من كلمة المرور.';
              setErrorMessage(readableError);
              toast.error(readableError);
              setLoading(false);
              return;
            }
          }
        }

        // Strict error mapping
        let readableError = 'بيانات تسجيل الدخول غير صحيحة. يرجى التحقق من البريد وكلمة المرور.';
        if (authError.code === 'auth/wrong-password' || authError.code === 'auth/invalid-credential') {
          readableError = 'كلمة المرور غير صحيحة. يمكنك استخدام خيار "استعادة كلمة المرور".';
        } else if (authError.code === 'auth/too-many-requests') {
          readableError = 'تم حظر الحساب مؤقتاً بسبب محاولات دخول متكررة خاطئة. يرجى المحاولة لاحقاً.';
        } else if (authError.code === 'auth/network-request-failed') {
          readableError = 'تعذر الاتصال بالخادم، يرجى التحقق من اتصال الإنترنت.';
        }
        
        setErrorMessage(readableError);
        toast.error(readableError);
      }
    } catch (error: any) {
      const genericMsg = 'فشل تسجيل الدخول: ' + (error.message || 'خطأ غير معروف');
      setErrorMessage(genericMsg);
      toast.error(genericMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      toast.error('يرجى إدخال البريد الإلكتروني لإرسال الرابط');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, resetEmail.trim());
      setResetSent(true);
      toast.success('تم إرسال رابط استعادة كلمة المرور بنجاح. راجع بريدك وصندوق الرسائل غير المرغوب فيها (Spam).');
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast.error('فشل إرسال الرابط: ' + (error.message || 'تأكد من صحة البريد'));
    }
  };

  const handleSubmitSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subscriptionForm.requesterName || !subscriptionForm.companyName || !subscriptionForm.phone) {
      toast.error('يرجى تعبئة الحقول الإجبارية');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'subscription_requests'), {
        requesterName: subscriptionForm.requesterName,
        companyName: subscriptionForm.companyName,
        phone: subscriptionForm.phone,
        empCount: subscriptionForm.empCount,
        status: 'new',
        createdAt: serverTimestamp(),
        planType: subscriptionForm.planType
      });
      
      // Notify Owner
      try {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: 'elsayedhr1993@gmail.com',
            subject: `مشترك جديد يطلب الانضمام إلى Aysed S HR: ${subscriptionForm.companyName}`,
            text: `مرحباً أستاذ سيد،\nقام ${subscriptionForm.requesterName} بطلب اشتراك لنشاط ${subscriptionForm.planType === 'medical' ? 'القطاع الطبي' : 'القطاع الإداري'}.\nهاتف: ${subscriptionForm.phone}\nعدد الموظفين: ${subscriptionForm.empCount}`
          })
        });
      } catch(e) {
        console.error('Failed to notify owner', e);
      }

      toast.success('تم إرسال طلب الانضمام بنجاح! سيقوم فريق المبيعات بالتواصل معكم وتفعيل الحساب.');
      setIsSubscriptionModalOpen(false);
      setSubscriptionForm({
        requesterName: '',
        companyName: '',
        phone: '',
        empCount: '1-10',
        planType: 'medical'
      });
    } catch (err: any) {
      console.error(err);
      toast.error('فشل إرسال الطلب: ' + (err.message || 'خطأ غير معروف'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex flex-col justify-center items-center p-4 font-sans dir-rtl bg-[#f8fafc]"
      style={{
        backgroundImage: 'radial-gradient(#714B67 0.75px, #f8fafc 0.75px)',
        backgroundSize: '24px 24px'
      }}
      dir="rtl"
    >
      <div 
        className="w-full bg-white rounded-2xl mx-auto shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95"
        style={{ maxWidth: '440px' }}
      >
        {/* Top Header Banner */}
        <div className="bg-[#714B67] p-6 text-white text-center relative">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-amber-300" />
            <h1 className="text-xl font-bold font-sans tracking-wide">Aysed HR S 2026</h1>
          </div>
          <p className="text-xs text-white/80 font-medium">
            نظام الموارد البشرية السحابي الموحد (Odoo Enterprise Multi-Tenant)
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 bg-black/20 text-emerald-300 text-[11px] font-mono font-bold px-3 py-1 rounded-full border border-white/10">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>نظام محمي بـ Firebase Auth & Kuwait Labor Law</span>
          </div>
        </div>

        <div className="p-8">
          <div className="text-center mb-6">
            <h2 className="text-base font-bold text-slate-800">تسجيل الدخول إلى بيئة العمل</h2>
            <p className="text-xs text-slate-500 mt-1">أدخل بيانات الحساب المعتمد للوصول إلى منشأتك</p>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div className="leading-relaxed font-medium">{errorMessage}</div>
            </div>
          )}
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">البريد الإلكتروني المعتمد</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                <input 
                  type="email" 
                  name="login"
                  id="login"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#714B67] focus:bg-white outline-none text-left dir-ltr text-xs transition-all font-medium text-slate-800"
                  placeholder="admin@aysed.com"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">كلمة المرور</label>
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email);
                    setResetSent(false);
                    setIsForgotModalOpen(true);
                  }}
                  className="text-[11px] text-[#714B67] hover:underline font-bold cursor-pointer"
                >
                  نسيت كلمة المرور؟
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                <input 
                  type="password" 
                  name="password"
                  id="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#714B67] focus:bg-white outline-none text-left dir-ltr text-xs transition-all font-medium text-slate-800"
                  required
                />
              </div>
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#008784] hover:bg-[#00706d] active:scale-[0.99] text-white font-bold py-3 px-4 rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 mt-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>تسجيل الدخول الآمن (Sign In)</span>
                </>
              )}
            </button>

            <div className="mt-6 text-center border-t border-slate-100 pt-5 space-y-3">
              <button 
                type="button"
                onClick={() => setIsSubscriptionModalOpen(true)}
                className="w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Rocket className="w-4 h-4 text-emerald-600" />
                <span>طلب اشتراك لمنشأة جديدة (SaaS)</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 text-right">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#714B67]" />
                <span>استعادة كلمة المرور</span>
              </h3>
              <button 
                onClick={() => setIsForgotModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {resetSent ? (
              <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl text-xs space-y-2">
                <p className="font-bold">✓ تم إرسال رابط إعادة التعيين بنجاح!</p>
                <p className="text-[11px] text-emerald-700">
                  يرجى تفقد بريدك الإلكتروني والنقر على الرابط لاختيار كلمة مرور جديدة.
                </p>
                <button
                  onClick={() => setIsForgotModalOpen(false)}
                  className="w-full mt-3 bg-emerald-600 text-white font-bold py-2 rounded-lg text-xs"
                >
                  إغلاق والعودة لتسجيل الدخول
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendResetPassword} className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  أدخل بريدك الإلكتروني المسجل وسنرسل لك رابطاً آمناً لتعيين كلمة مرور جديدة لحسابك.
                </p>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    placeholder="email@example.com"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs dir-ltr text-left outline-none focus:ring-2 focus:ring-[#714B67]"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-[#714B67] hover:bg-[#5a3c52] text-white font-bold py-2.5 rounded-xl text-xs transition"
                  >
                    إرسال رابط الاستعادة
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(false)}
                    className="px-4 py-2.5 bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold rounded-xl text-xs transition"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Subscription Request Modal */}
      {isSubscriptionModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 my-8">
            <div className="bg-[#008784] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Rocket className="w-4 h-4" />
                <span>طلب الانضمام إلى منظومة Aysed HR الكويت</span>
              </div>
              <button 
                onClick={() => setIsSubscriptionModalOpen(false)}
                className="p-1 hover:bg-white/20 rounded-lg text-white/80 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitSubscription} className="p-6 space-y-4 text-right">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم المسؤول / المالك *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                  <input 
                    type="text" 
                    required
                    placeholder="مثال: د. أحمد الكندري"
                    value={subscriptionForm.requesterName}
                    onChange={(e) => setSubscriptionForm({...subscriptionForm, requesterName: e.target.value})}
                    className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#008784] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم المنشأة / العيادة / الشركة *</label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                  <input 
                    type="text" 
                    required
                    placeholder="مثال: مركز الشفاء الطبي التخصصي"
                    value={subscriptionForm.companyName}
                    onChange={(e) => setSubscriptionForm({...subscriptionForm, companyName: e.target.value})}
                    className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#008784] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف / الواتساب *</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                  <input 
                    type="tel" 
                    required
                    placeholder="+965 99887766"
                    value={subscriptionForm.phone}
                    onChange={(e) => setSubscriptionForm({...subscriptionForm, phone: e.target.value})}
                    className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#008784] outline-none text-left dir-ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">عدد الموظفين</label>
                  <select 
                    value={subscriptionForm.empCount}
                    onChange={(e) => setSubscriptionForm({...subscriptionForm, empCount: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#008784] outline-none"
                  >
                    <option value="1-10">1 - 10 موظفين</option>
                    <option value="11-50">11 - 50 موظف</option>
                    <option value="51-200">51 - 200 موظف</option>
                    <option value="200+">أكثر من 200 موظف</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نوع النشاط</label>
                  <select 
                    value={subscriptionForm.planType}
                    onChange={(e) => setSubscriptionForm({...subscriptionForm, planType: e.target.value as any})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#008784] outline-none"
                  >
                    <option value="medical">قطاع طبي وعيادات</option>
                    <option value="admin">تجاري / مقاولات / شركات</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-[#008784] hover:bg-[#00706d] text-white font-bold py-3 px-4 rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                >
                  {loading ? 'جاري الإرسال...' : 'تأكيد إرسال طلب الاشتراك'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OdooLogin;
