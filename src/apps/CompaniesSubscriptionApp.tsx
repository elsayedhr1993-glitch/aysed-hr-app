import React, { useState, useEffect } from 'react';
import { 
  Building2, CheckCircle2, XCircle, Clock, DollarSign, Calendar, Power, ShieldAlert, 
  Edit2, Save, X, Plus, Search, LayoutGrid, List as ListIcon, TrendingUp, Users, Shield, Trash2, Key, Mail
} from 'lucide-react';
import { CompanySubscription } from '../types';
import toast from 'react-hot-toast';
import { doc, setDoc, deleteDoc, getDocs, collection, updateDoc, onSnapshot } from 'firebase/firestore';
import { db, cleanFirestoreData, auth, provisionTenantAuth, purgeTenantCascading, isTenantPurged } from '../lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';


export interface SubscriptionRequest {
  id: string;
  requesterName: string;
  companyName: string;
  phone: string;
  empCount: string;
  planType?: 'medical' | 'admin';
  status: 'new' | 'approved' | 'rejected';
  createdAt: any;
}

interface CompaniesSubscriptionAppProps {
  subscriptions: CompanySubscription[];
  onUpdateSubscription: (sub: CompanySubscription) => void;
  onDeleteSubscription?: (id: string) => void;
  currentUserEmail: string;
  onImpersonateCompany?: (companyName: string) => void;
}

export const CompaniesSubscriptionApp: React.FC<CompaniesSubscriptionAppProps> = ({
  subscriptions,
  onUpdateSubscription,
  onDeleteSubscription,
  currentUserEmail,
  onImpersonateCompany,
}) => {
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'active' | 'suspended'>('ALL');
  const [editingSub, setEditingSub] = useState<CompanySubscription | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [passwordModalSub, setPasswordModalSub] = useState<CompanySubscription | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const handleSendResetEmail = async (email: string) => {
    if (!email) {
      toast.error("البريد الإلكتروني غير متوفر");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success("تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني. يرجى مراجعة صندوق الوارد ومجلد الرسائل غير المرغوب فيها (Spam / Junk) أيضاً.", { duration: 6000 });
    } catch (err: any) {
      console.error(err);
      toast.error("فشل إرسال الرابط: " + (err.message || 'خطأ غير معروف'));
    }
  };

  const handleForcePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalSub) return;
    if (newPassword.length < 8) {
      toast.error("كلمة المرور يجب أن تتكون من 8 أحرف على الأقل (سياسة Aysed للأمان).");
      return;
    }
    try {
      const res = await fetch('/api/admin/force-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: passwordModalSub.email, newPassword })
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch(e) { throw new Error(text.includes('502') ? 'الخادم قيد التحديث، يرجى المحاولة بعد قليل.' : 'استجابة غير صالحة من الخادم'); }
      if (data.success) {
        toast.success("تم تحديث كلمة المرور الخاصة بالمستخدم يدوياً بنجاح");
        setPasswordModalSub(null);
        setNewPassword('');
      } else {
        toast.error(data.error || "فشل تغيير كلمة المرور");
      }
    } catch (err: any) { console.error('Fetch error:', err); toast.error('خطأ: ' + (err.message || 'فشل الاتصال بالخادم')); }
  };


  // Super Admin security check
  const isSuperAdmin = currentUserEmail.toLowerCase() === 'admin@aysed.com' || currentUserEmail.toLowerCase() === 'elsayedhr1993@gmail.com';

  useEffect(() => {
    toast.dismiss();
  }, []);

  if (!isSuperAdmin) {
    return (
      <div className="p-12 text-center" dir="rtl">
        <div className="max-w-md mx-auto bg-white p-8 rounded-2xl border border-rose-200 shadow-xl space-y-4">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">منطقة محظورة (Super Admin Only)</h2>
          <p className="text-sm text-slate-600">
            هذه الصفحة مخصصة حصرياً للمالك (System Owner / Super Admin). ليس لديك صلاحية للوصول إلى لوحة تحكم اشتراكات الشركات.
          </p>
        </div>
      </div>
    );
  }

  const filteredSubscriptions = (subscriptions || []).filter(sub => {
    if (isTenantPurged(sub.id) || isTenantPurged(sub.companyName) || isTenantPurged(sub.companyId) || isTenantPurged(sub.email)) {
      return false;
    }
    const matchesSearch = 
      sub.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === 'ALL') return matchesSearch;
    return matchesSearch && sub.status === statusFilter;
  });


  const [pendingRequests, setPendingRequests] = useState<SubscriptionRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'requests'>('subscriptions');

  useEffect(() => {
    if (isSuperAdmin) {
      fetchRequests();

      let unsubscribe: (() => void) | null = null;
      try {
        unsubscribe = onSnapshot(collection(db, 'subscription_requests'), () => {
          fetchRequests();
        }, (err) => {
          console.warn('CompaniesSubscriptionApp requests onSnapshot error:', err);
        });
      } catch (e) {}

      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [isSuperAdmin]);

  const fetchRequests = async () => {
    try {
      const snap = await getDocs(collection(db, 'subscription_requests'));
      const reqs: SubscriptionRequest[] = [];
      snap.forEach(d => {
        reqs.push({ id: d.id, ...d.data() } as SubscriptionRequest);
      });
      // Also load from localStorage fallback
      const localSubs = JSON.parse(localStorage.getItem('aysed_saved_subscriptions') || '[]');
      localSubs.forEach((ls: any) => {
        if (!reqs.some(r => r.id === ls.id || r.companyName === ls.companyName)) {
          reqs.push({
            id: ls.id || 'sub-' + Math.random(),
            requesterName: ls.requesterName || ls.name,
            companyName: ls.companyName || ls.name,
            phone: ls.phone,
            empCount: ls.empCount || ls.employee_count,
            planType: ls.planType || ls.sector,
            status: ls.status || 'new',
            createdAt: ls.createdAt
          });
        }
      });
      setPendingRequests(reqs);
    } catch (e: any) {
      if (!e?.message?.includes('Missing or insufficient permissions')) {
        console.warn('Error fetching requests:', e?.message || e);
      }
      // Fallback to localStorage
      const localSubs = JSON.parse(localStorage.getItem('aysed_saved_subscriptions') || '[]');
      const reqs: SubscriptionRequest[] = localSubs.map((ls: any) => ({
        id: ls.id || 'sub-' + Math.random(),
        requesterName: ls.requesterName || ls.name,
        companyName: ls.companyName || ls.name,
        phone: ls.phone,
        empCount: ls.empCount || ls.employee_count,
        planType: ls.planType || ls.sector,
        status: ls.status || 'new',
        createdAt: ls.createdAt
      }));
      setPendingRequests(reqs);
    }
  };

  const handleApproveRequest = async (req: SubscriptionRequest) => {
    try {
      // 1. Create a Company Subscription
      const subId = 'sub-' + Date.now();
      const compId = 'comp-' + Date.now();
      const email = `admin@${req.companyName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'company'}.com`;
      
      const newSub: CompanySubscription = {
        id: subId,
        companyName: req.companyName,
        ownerName: req.requesterName,
        email: email,
        status: 'active',
        planType: 'شهري',
        subscriptionFee: req.empCount === '1-10' ? 50 : req.empCount === '11-50' ? 100 : 200,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        companyId: compId
      };

      await setDoc(doc(db, 'subscriptions', subId), cleanFirestoreData(newSub));
      onUpdateSubscription(newSub);

      // 2. Create the company space
      const newCompany = {
        id: compId,
        nameAr: req.companyName,
        nameEn: req.companyName,
        isActive: true,
        industry: req.planType === 'medical' ? 'طبي' : 'إداري',
        subscriptionPlan: 'Monthly',
        settings: {}
      };
      await setDoc(doc(db, 'companies', compId), cleanFirestoreData(newCompany));

      // 3. Create initial user doc so they can login (fallback if using our local system, or just instruct)
      await setDoc(doc(db, 'users', `usr-${Date.now()}`), {
        email: email,
        role: 'ADMIN',
        companyId: compId,
        isActive: true,
        createdAt: new Date().toISOString()
      });

      // 4. Update request status
      try {
        await setDoc(doc(db, 'subscription_requests', req.id), { status: 'approved' }, { merge: true });
      } catch (fbErr) {
        console.warn('Firestore update warn:', fbErr);
      }
      
      // Update local storage status
      const localSubs = JSON.parse(localStorage.getItem('aysed_saved_subscriptions') || '[]');
      const updatedLocal = localSubs.map((s: any) => s.id === req.id ? { ...s, status: 'approved' } : s);
      localStorage.setItem('aysed_saved_subscriptions', JSON.stringify(updatedLocal));
      
            const adminEmail = currentUserEmail || 'elsayedhr1993@gmail.com';
      let emailSent = false;
      try {
        const res = await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: adminEmail,
            subject: `Odoo SaaS - تم اعتماد شركة جديدة: ${req.companyName}`,
            text: `تم تفعيل الشركة بنجاح.\n\nاسم الشركة: ${req.companyName}\nالمالك: ${req.requesterName}\n\nبيانات الدخول:\nاسم المستخدم (البريد): ${email}\nكلمة المرور الافتراضية: 123456\nيرجى التواصل مع العميل على الرقم: ${req.phone}`
          })
        });
        const text = await res.text();
        let data;
        try { data = JSON.parse(text); } catch(e) { throw new Error('Invalid response'); }
        if (data.success) emailSent = true;
      } catch(e) {
        console.error(e);
      }
      
      if (emailSent) {
         toast.success(`تم التفعيل وإرسال الإيميل بنجاح!\nالمستخدم: ${email} \nالرقم السري: 123456`, { duration: 15000 });
      } else {
         toast.success(`تم التفعيل بنجاح! (تأكد من إعداد SMTP_PASS لإرسال الإيميلات)\nالمستخدم: ${email} \nالرقم السري: 123456`, { duration: 20000 });
      }
      
      fetchRequests();
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء تفعيل الطلب');
    }
  };

  const handleRejectRequest = async (reqId: string) => {
    if (true) {
      try {
        try {
          await setDoc(doc(db, 'subscription_requests', reqId), { status: 'rejected' }, { merge: true });
        } catch (fbErr) {
          console.warn('Firestore reject warn:', fbErr);
        }
        
        const localSubs = JSON.parse(localStorage.getItem('aysed_saved_subscriptions') || '[]');
        const updatedLocal = localSubs.map((s: any) => s.id === reqId ? { ...s, status: 'rejected' } : s);
        localStorage.setItem('aysed_saved_subscriptions', JSON.stringify(updatedLocal));

        toast.success("تم رفض الطلب");
        fetchRequests();
      } catch (err) {
        console.error(err);
        toast.error("فشل رفض الطلب");
      }
    }
  };


  

  // Calculate KPIs


  const totalMRR = (subscriptions || []).filter(s => s.status === 'active').reduce((acc, s) => acc + (s.subscriptionFee || 0), 0);
  const activeCount = (subscriptions || []).filter(s => s.status === 'active').length;
  const suspendedCount = (subscriptions || []).filter(s => s.status === 'suspended').length;

  const handleOpenCreate = () => {
    setEditingSub({
      id: 'sub-' + Date.now(),
      companyName: '',
      ownerName: '',
      email: '',
      status: 'active',
      planType: 'شهري',
      subscriptionFee: 50,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sub: CompanySubscription) => {
    setEditingSub({ ...sub });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSub || !editingSub.companyName.trim()) {
      toast.error("يرجى إدخال اسم الشركة على الأقل");
      return;
    }

    try {
      const compId = editingSub.companyId || `comp-${Date.now()}`;
      const email = (editingSub.email || `${editingSub.companyName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || Date.now()}@aysedhr.com`).trim().toLowerCase();
      const updatedSub: CompanySubscription = {
        ...editingSub,
        companyId: compId,
        email
      };

      const cleaned = cleanFirestoreData(updatedSub) as CompanySubscription;
      await setDoc(doc(db, 'subscriptions', cleaned.id), cleaned, { merge: true });

      // Create / update companies document with exact schema
      const companyDocData = {
        companyId: compId,
        id: compId,
        companyName: updatedSub.companyName.trim(),
        nameAr: updatedSub.companyName.trim(),
        nameEn: updatedSub.companyName.trim(),
        adminEmail: email,
        email: email,
        ownerName: updatedSub.ownerName || updatedSub.companyName,
        plan: updatedSub.planType || 'active',
        planType: updatedSub.planType || 'active',
        status: updatedSub.status === 'active' ? 'active' : 'suspended',
        state: updatedSub.status === 'active' ? 'active' : 'suspended',
        isActive: updatedSub.status === 'active',
        updatedAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'companies', compId), cleanFirestoreData(companyDocData), { merge: true });

      // If this is a new company creation with an email, provision auth safely
      if (email.includes('@')) {
        try {
          const creds = JSON.parse(localStorage.getItem('aysed_company_credentials') || '{}');
          const pass = creds[email]?.password || ('Aysed2026#' + Math.random().toString(36).slice(-6, -1) + '!');
          await provisionTenantAuth({
            email,
            password: pass,
            companyName: updatedSub.companyName.trim(),
            companyId: compId,
            ownerName: updatedSub.ownerName || updatedSub.companyName,
            planType: updatedSub.planType
          });
        } catch (authErr) {
          console.warn('Provision tenant notice:', authErr);
        }
      }

      onUpdateSubscription(cleaned);
      toast.success("تم حفظ اشتراك الشركة بنجاح في قاعدة البيانات السحابية (Firestore)");
      setIsModalOpen(false);
      setEditingSub(null);
    } catch (err) {
      console.error(err);
      toast.error("خطأ أثناء حفظ الاشتراك في Firestore");
    }
  };

  const toggleStatus = async (sub: CompanySubscription) => {
    const newStatus = sub.status === 'active' ? 'suspended' : 'active';
    const updated = { ...sub, status: newStatus as any };
    try {
      await setDoc(doc(db, 'subscriptions', updated.id), cleanFirestoreData(updated));
      onUpdateSubscription(updated);
      toast.success(newStatus === 'active' ? "تم تفعيل اشتراك الشركة بنجاح" : "تم إيقاف اشتراك الشركة مؤقتاً");
    } catch (err) {
      console.error(err);
      toast.error("فشل تحديث حالة الاشتراك");
    }
  };

  const handleExtendPeriod = async (sub: CompanySubscription) => {
    const currentEnd = new Date(sub.endDate || Date.now());
    currentEnd.setDate(currentEnd.getDate() + 30);
    const newEndDate = currentEnd.toISOString().split('T')[0];
    const updated = { ...sub, endDate: newEndDate };
    try {
      await setDoc(doc(db, 'subscriptions', updated.id), cleanFirestoreData(updated));
      onUpdateSubscription(updated);
      toast.success("تم تمديد فترة اشتراك الشركة لمدة 30 يوماً بنجاح");
    } catch (err) {
      console.error(err);
      toast.error("فشل تمديد الفترة");
    }
  };

  const handleDelete = async (id: string) => {
    const sub = subscriptions.find(s => s.id === id);
    if (!sub) return;
    if (window.confirm(`هل أنت متأكد من رغبتك في حذف منشأة (${sub.companyName}) وحذف كافة بياناتها المرتبطة نهائياً؟`)) {
      try {
        await purgeTenantCascading({
          id: sub.id,
          name: sub.companyName,
          email: sub.email,
          companyId: sub.companyId || sub.id
        });

        if (onDeleteSubscription) onDeleteSubscription(id);
        toast.success(`تم حذف منشأة (${sub.companyName}) وكافة سجلاتها نهائياً بنجاح`);
      } catch (err: any) {
        console.error(err);
        toast.error("فشل حذف الاشتراك: " + (err.message || ''));
      }
    }
  };

  const handlePurgeAllCompanies = async () => {
    if (false) { return; }
    try {
      localStorage.setItem('app_fully_purged', 'true');
      
      const subsSnap = await getDocs(collection(db, 'subscriptions'));
      for (const d of subsSnap.docs) {
        await deleteDoc(doc(db, 'subscriptions', d.id));
      }

      const compsSnap = await getDocs(collection(db, 'companies'));
      for (const d of compsSnap.docs) {
        await deleteDoc(doc(db, 'companies', d.id));
      }

      for (const sub of subscriptions) {
        if (onDeleteSubscription) {
          onDeleteSubscription(sub.id);
        }
      }
      toast.success("تم حذف وتطهير كافة الشركات والاشتراكات نهائياً بنجاح");
    } catch (err) {
      console.error(err);
      toast.error("فشل تطهير الشركات");
    }
  };


    return (
    <div className="p-6 bg-transparent min-h-[calc(100vh-3rem)] text-right" dir="rtl">

      {/* Odoo Control Panel Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white/90 backdrop-blur-md p-5 rounded-2xl border border-slate-200 shadow-sm mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg w-fit mb-2 border border-purple-100">
            <Shield className="w-3.5 h-3.5" />
            <span>نظام أودو الموحد لإدارة العقود والاشتراكات المتكررة (Odoo Subscriptions & Contracts)</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">إدارة اشتراكات الشركات وعقود SaaS</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            التحكم المطلق بالإيرادات المتكررة (MRR)، تواريخ التجديد، تفعيل وإيقاف الشركات عبر السحابة
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          {activeTab === 'subscriptions' && (
            <>
              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  placeholder="بحث باسم الشركة أو البريد..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pr-9 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#714B67] outline-none"
                />
              </div>

              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                    viewMode === 'kanban' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="عرض البطاقات (Kanban)"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                    viewMode === 'list' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="عرض القائمة (List View)"
                >
                  <ListIcon className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={handlePurgeAllCompanies}
                className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition cursor-pointer"
                title="حذف وتطهير كافة الشركات نهائياً"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden md:inline">تطهير</span>
              </button>

              <button
                onClick={handleOpenCreate}
                className="bg-[#714B67] hover:bg-[#5e3f55] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden md:inline">إنشاء عقد</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6 bg-white rounded-t-2xl px-6 pt-4 gap-6">
        <button 
          onClick={() => setActiveTab('subscriptions')}
          className={`pb-3 px-2 font-bold text-sm border-b-2 transition-colors ${activeTab === 'subscriptions' ? 'border-[#714B67] text-[#714B67]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          الاشتراكات النشطة
        </button>
        <button 
          onClick={() => setActiveTab('requests')}
          className={`pb-3 px-2 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'requests' ? 'border-[#714B67] text-[#714B67]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          طلبات الاشتراك الجديدة
          {pendingRequests.filter(r => r.status === 'new').length > 0 && (
            <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full">
              {pendingRequests.filter(r => r.status === 'new').length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'requests' ? (
        <div className="space-y-4">
          {pendingRequests.length === 0 ? (
            <div className="text-center py-12 text-slate-500 bg-white rounded-2xl border border-slate-200">
              لا توجد طلبات اشتراك جديدة
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {pendingRequests.map(req => (
                <div key={req.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg">{req.companyName}</h3>
                      <div className="text-sm text-slate-500 flex items-center gap-3 mt-1">
                        <span>المالك: {req.requesterName}</span>
                        <span>•</span>
                        <span>الهاتف: <span className="dir-ltr font-mono inline-block">{req.phone}</span></span>
                        <span>•</span>
                        <span>الموظفين: {req.empCount}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {req.status === 'new' ? (
                      <>
                        <button
                          onClick={() => handleApproveRequest(req)}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition flex items-center gap-2"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          تفعيل الشركة
                        </button>
                        <button
                          onClick={() => handleRejectRequest(req.id)}
                          className="bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-600 px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2"
                        >
                          <XCircle className="w-4 h-4" />
                          رفض
                        </button>
                      </>
                    ) : (
                      <span className={`px-3 py-1 text-xs font-bold rounded-full ${req.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {req.status === 'approved' ? 'تمت الموافقة' : 'مرفوض'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Odoo KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-xs font-bold block mb-1">الإيراد المتكرر (MRR)</span>
            <div className="text-xl font-bold text-emerald-600 font-mono">{totalMRR.toFixed(3)} د.ك</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-xs font-bold block mb-1">الاشتراكات النشطة</span>
            <div className="text-xl font-bold text-purple-700 font-mono">{activeCount} شركة</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-100">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-xs font-bold block mb-1">الاشتراكات الموقوفة</span>
            <div className="text-xl font-bold text-rose-600 font-mono">{suspendedCount} شركة</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
            <XCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 text-xs font-bold">
        <button
          onClick={() => setStatusFilter('ALL')}
          className={`px-4 py-2 rounded-xl border transition ${
            statusFilter === 'ALL' ? 'bg-[#714B67] text-white border-[#714B67]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          جميع الاشتراكات ({subscriptions.length})
        </button>
        <button
          onClick={() => setStatusFilter('active')}
          className={`px-4 py-2 rounded-xl border transition ${
            statusFilter === 'active' ? 'bg-[#714B67] text-white border-[#714B67]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          النشطة فقط ({subscriptions.filter(s => s.status === 'active').length})
        </button>
        <button
          onClick={() => setStatusFilter('suspended')}
          className={`px-4 py-2 rounded-xl border transition ${
            statusFilter === 'suspended' ? 'bg-[#714B67] text-white border-[#714B67]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          الموقوفة ({subscriptions.filter(s => s.status === 'suspended').length})
        </button>
      </div>

      {/* Kanban View - Odoo Enterprise Kanban Style */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 o_kanban_mobile">
          {filteredSubscriptions.map((sub) => {
            const isActive = sub.status === 'active';
            return (
              <div 
                key={sub.id}
                className={`bg-white/95 backdrop-blur-md rounded-2xl border transition-all shadow-sm hover:shadow-md overflow-hidden flex flex-col justify-between oe_kanban_global_click ${
                  isActive ? 'border-purple-200' : 'border-rose-200 bg-rose-50/10'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-lg border border-purple-200 shadow-inner o_kanban_image">
                        <Building2 className="w-6 h-6 text-[#714B67]" />
                      </div>
                      <div className="oe_kanban_details">
                        <h3 className="font-bold text-slate-900 text-sm o_kanban_record_title">{sub.companyName}</h3>
                        <p className="text-[11px] text-slate-400 font-mono">{sub.email}</p>
                      </div>
                    </div>
                    {isActive ? (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" /> نشط
                      </span>
                    ) : (
                      <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 border border-rose-200">
                        <XCircle className="w-3.5 h-3.5" /> موقوف
                      </span>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="p-5 space-y-3 text-xs text-slate-600">
                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[10px]">المسؤول / المالك</span>
                        <span className="font-bold text-slate-800">{sub.ownerName || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">نوع الباقة</span>
                        <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 w-fit inline-block">
                          {sub.planType}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 font-mono">
                      <span className="text-slate-500">قيمة الاشتراك:</span>
                      <span className="text-emerald-600 font-bold text-sm">{sub.subscriptionFee?.toFixed(3)} د.ك</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono border-t border-slate-100 pt-2">
                      <span>البدء: {sub.startDate}</span>
                      <span>الانتهاء: {sub.endDate}</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => toggleStatus(sub)}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 transition shadow-sm cursor-pointer ${
                        isActive ? 'bg-rose-100 hover:bg-rose-200 text-rose-700' : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{isActive ? 'إيقاف' : 'تفعيل'}</span>
                    </button>

                    {onImpersonateCompany && (
                      <button
                        name="action_switch_to_this_company"
                        type="button"
                        data-type="object"
                        onClick={() => onImpersonateCompany(sub.companyName)}
                        className="btn btn-primary btn-sm px-3 py-1.5 bg-[#714B67] hover:bg-[#5e3f55] text-white rounded-xl text-[11px] font-bold flex items-center gap-1 transition shadow-sm cursor-pointer"
                        title="إدارة الشركة / Action Switch"
                      >
                        <Building2 className="w-3.5 h-3.5" />
                        <span>إدارة الشركة</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleExtendPeriod(sub)}
                      className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl text-[11px] font-bold flex items-center gap-1 transition shadow-sm cursor-pointer border border-amber-200"
                      title="تمديد الاشتراك 30 يوم"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>تمديد</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleSendResetEmail(sub.email)}
                      className="p-1.5 bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-600 rounded-lg border border-slate-200 transition shadow-sm cursor-pointer"
                      title="إرسال تعليمات إعادة التعيين (Odoo Reset)"
                    >
                      <Mail className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setPasswordModalSub(sub)}
                      className="p-1.5 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-600 rounded-lg border border-slate-200 transition shadow-sm cursor-pointer"
                      title="تغيير كلمة السر يدوياً (Force Update)"
                    >
                      <Key className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(sub)}
                      className="p-1.5 bg-white hover:bg-purple-50 text-slate-700 hover:text-purple-700 rounded-lg border border-slate-200 transition shadow-sm cursor-pointer"
                      title="تعديل"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(sub.id)}
                      className="p-1.5 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-600 rounded-lg border border-slate-200 transition shadow-sm cursor-pointer"
                      title="حذف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold">
                <th className="p-4">اسم الشركة / المؤسسة</th>
                <th className="p-4">اسم المالك / المسؤول</th>
                <th className="p-4">نوع الباقة</th>
                <th className="p-4">قيمة الاشتراك (د.ك)</th>
                <th className="p-4">تاريخ البدء</th>
                <th className="p-4">تاريخ الانتهاء</th>
                <th className="p-4 text-center">الحالة</th>
                <th className="p-4 text-center">التحكم والتفعيل</th>
                <th className="p-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSubscriptions.map((sub) => {
                const isActive = sub.status === 'active';
                return (
                  <tr key={sub.id} className="hover:bg-purple-50/20 transition-all">
                    <td className="p-4 font-bold text-slate-900">
                      {sub.companyName}
                      <span className="block text-[10px] font-normal text-slate-400 font-mono">{sub.email}</span>
                    </td>
                    <td className="p-4 font-semibold text-slate-700">{sub.ownerName}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-bold border border-indigo-100">
                        {sub.planType}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-emerald-600 font-mono text-sm">
                      {sub.subscriptionFee?.toFixed(3)} د.ك
                    </td>
                    <td className="p-4 text-slate-600 font-mono">{sub.startDate}</td>
                    <td className="p-4 text-slate-600 font-mono font-semibold">{sub.endDate}</td>
                    <td className="p-4 text-center">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full text-[10px] font-bold border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> نشط
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 px-2.5 py-1 rounded-full text-[10px] font-bold border border-rose-200">
                          <XCircle className="w-3 h-3" /> موقوف
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => toggleStatus(sub)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 mx-auto transition shadow-sm cursor-pointer ${
                          isActive ? 'bg-rose-100 hover:bg-rose-200 text-rose-700' : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700'
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span>{isActive ? 'إيقاف' : 'تفعيل'}</span>
                      </button>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleSendResetEmail(sub.email)}
                          className="p-1.5 bg-slate-100 hover:bg-sky-100 text-slate-700 hover:text-sky-600 rounded-lg transition cursor-pointer"
                          title="إرسال تعليمات إعادة التعيين"
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setPasswordModalSub(sub)}
                          className="p-1.5 bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-600 rounded-lg transition cursor-pointer"
                          title="تغيير كلمة السر يدوياً"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(sub)}
                          className="p-1.5 bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-700 rounded-lg transition"
                          title="تعديل"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(sub.id)}
                          className="p-1.5 bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-600 rounded-lg transition"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      
      </>
      )}

            {/* Force Change Password Modal */}
      {passwordModalSub && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="bg-amber-500 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Key className="w-4 h-4" />
                تغيير كلمة السر للمستخدم
              </h3>
              <button onClick={() => setPasswordModalSub(null)} className="hover:bg-amber-600 p-1.5 rounded-lg transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleForcePasswordChange} className="p-5 space-y-4">
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 mb-2">
                <p className="text-xs text-amber-800 font-bold leading-relaxed">
                  تغيير كلمة مرور المشترك (إجبارياً)
                </p>
                <p className="text-[11px] text-amber-700 mt-1">
                  المستخدم: <span className="font-mono dir-ltr">{passwordModalSub.email}</span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">كلمة المرور الجديدة</label>
                <input
                  type="text"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="********"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                />
                <p className="text-[10px] text-slate-500 mt-1">الحد الأدنى 8 أحرف (سياسة الأمان)</p>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPasswordModalSub(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  حفظ وتغيير
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Odoo Form Modal for Subscriptions */}
      {isModalOpen && editingSub && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="bg-[#714B67] text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>{editingSub.id.startsWith('sub-') && subscriptions.every(s => s.id !== editingSub.id) ? 'إنشاء اشتراك وعقد جديد (Odoo Subscription)' : 'تعديل بيانات الاشتراك والترخيص'}</span>
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم الشركة / المؤسسة *</label>
                <input
                  type="text"
                  required
                  value={editingSub.companyName}
                  onChange={(e) => setEditingSub({ ...editingSub, companyName: e.target.value })}
                  placeholder="مثال: عيادات الفنار التخصصية"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#714B67]/40"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم المالك / المسؤول</label>
                  <input
                    type="text"
                    value={editingSub.ownerName}
                    onChange={(e) => setEditingSub({ ...editingSub, ownerName: e.target.value })}
                    placeholder="د. أحمد الصباح"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#714B67]/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={editingSub.email}
                    onChange={(e) => setEditingSub({ ...editingSub, email: e.target.value })}
                    placeholder="admin@clinic.kw"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#714B67]/40 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">قيمة الاشتراك (د.ك - KWD)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={editingSub.subscriptionFee}
                    onChange={(e) => setEditingSub({ ...editingSub, subscriptionFee: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#714B67]/40 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نوع الباقة</label>
                  <select
                    value={editingSub.planType || 'شهري'}
                    onChange={(e) => setEditingSub({ ...editingSub, planType: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#714B67]/40"
                  >
                    <option value="شهري">شهري (Monthly)</option>
                    <option value="سنوي">سنوي (Annual)</option>
                    <option value="مخصص">مخصص (Custom)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ البدء</label>
                  <input
                    type="date"
                    value={editingSub.startDate}
                    onChange={(e) => setEditingSub({ ...editingSub, startDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#714B67]/40 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الانتهاء</label>
                  <input
                    type="date"
                    value={editingSub.endDate}
                    onChange={(e) => setEditingSub({ ...editingSub, endDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#714B67]/40 font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">حالة العقد والاشتراك</label>
                <select
                  value={editingSub.status || 'active'}
                  onChange={(e) => setEditingSub({ ...editingSub, status: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#714B67]/40"
                >
                  <option value="active">مفعل ونشط (Active)</option>
                  <option value="suspended">موقوف مؤقتاً (Suspended)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="bg-[#714B67] hover:bg-[#5f3e57] text-white px-5 py-2 rounded-xl text-xs font-bold shadow transition cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ الاشتراك</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
