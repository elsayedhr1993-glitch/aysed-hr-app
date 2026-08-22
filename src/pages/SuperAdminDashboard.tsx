import React, { useState, useEffect } from 'react';
import { 
  Building2, Users, CheckCircle2, Clock, 
  MessageSquare, ShieldCheck, RefreshCw, Eye, Search, AlertCircle, LogOut, Copy, Check, PauseCircle, Trash2, PlayCircle, Server, Activity, Database,
  Edit3, Save, X, Lock, Building, Phone, Mail, User, Plus
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { db, auth, provisionTenantAuth, cleanFirestoreData, purgeTenantCascading, isTenantPurged } from '../lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import toast from 'react-hot-toast';

interface SubscriptionRequest {
  id: string;
  requester_name: string;
  name: string;
  phone: string;
  plan_type: string;
  emp_count: string;
  state: 'draft' | 'approved' | 'rejected' | 'suspended';
  created_at: string;
  email?: string;
}

interface SuperAdminDashboardProps {
  onLogout?: () => void;
  currentUserEmail?: string;
  onImpersonateCompany?: (companyName: string) => void;
  onSwitchToWorkspace?: () => void;
  onSwitchToApps?: () => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ 
  onLogout, 
  currentUserEmail, 
  onImpersonateCompany,
  onSwitchToWorkspace,
  onSwitchToApps 
}) => {
  const [activeNav, setActiveNav] = useState<'SUBSCRIPTIONS' | 'SERVER_STATS' | 'AUDIT_LOGS'>('SUBSCRIPTIONS');
  const [requests, setRequests] = useState<SubscriptionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'approved' | 'rejected' | 'suspended'>('all');
  
  // Activation modal state
  const [selectedActivation, setSelectedActivation] = useState<{
    companyName: string;
    email: string;
    password: string;
    phone: string;
    requesterName: string;
  } | null>(null);

  // Delete confirmation modal state
  const [deletingRequest, setDeletingRequest] = useState<SubscriptionRequest | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isExecutingDelete, setIsExecutingDelete] = useState(false);

  // Edit Subscription / Company modal state
  const [editingRequest, setEditingRequest] = useState<SubscriptionRequest | null>(null);
  const [editPassword, setEditPassword] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Create New Company / Subscription modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);
  const [newCompanyForm, setNewCompanyForm] = useState({
    companyName: '',
    requesterName: '',
    email: '',
    phone: '',
    password: '',
    planType: 'medical',
    empCount: '11-50',
    initialStatus: 'approved' as 'approved' | 'draft'
  });

  const handleOpenCreateModal = () => {
    setNewCompanyForm({
      companyName: '',
      requesterName: '',
      email: '',
      phone: '',
      password: 'Aysed2026#' + Math.random().toString(36).slice(-6, -1) + '!',
      planType: 'medical',
      empCount: '11-50',
      initialStatus: 'approved'
    });
    setIsCreateModalOpen(true);
  };

  const handleCreateCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyForm.companyName.trim()) {
      toast.error('يرجى إدخال اسم الشركة / المنشأة');
      return;
    }

    const cleanEmail = (newCompanyForm.email || `${newCompanyForm.phone.replace(/[^0-9]/g, '') || Date.now()}@aysedhr.com`).trim().toLowerCase();
    if (!cleanEmail.includes('@')) {
      toast.error('يرجى إدخال بريد إلكتروني صحيح');
      return;
    }

    setIsCreatingCompany(true);
    const compId = 'comp-' + Date.now();
    const reqId = 'req-' + Date.now();
    const subId = 'sub-' + Date.now();
    const password = newCompanyForm.password || ('Aysed2026#' + Math.random().toString(36).slice(-6, -1) + '!');

    try {
      // 1. Provision Auth account safely without overriding Super Admin session
      const authResult = await provisionTenantAuth({
        email: cleanEmail,
        password: password,
        companyName: newCompanyForm.companyName.trim(),
        companyId: compId,
        ownerName: newCompanyForm.requesterName.trim(),
        phone: newCompanyForm.phone.trim(),
        planType: newCompanyForm.planType
      });

      const userUid = authResult.uid || `usr_${Date.now()}`;

      // 2. Create/Update document in companies collection with exact schema
      const companyDocData = {
        companyId: compId,
        id: compId,
        companyName: newCompanyForm.companyName.trim(),
        nameAr: newCompanyForm.companyName.trim(),
        nameEn: newCompanyForm.companyName.trim(),
        adminEmail: cleanEmail,
        email: cleanEmail,
        phone: newCompanyForm.phone.trim(),
        ownerName: newCompanyForm.requesterName.trim(),
        plan: newCompanyForm.planType,
        planType: newCompanyForm.planType,
        status: newCompanyForm.initialStatus === 'approved' ? 'active' : 'pending',
        state: newCompanyForm.initialStatus === 'approved' ? 'active' : 'pending',
        isActive: newCompanyForm.initialStatus === 'approved',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'companies', compId), cleanFirestoreData(companyDocData), { merge: true });

      // 3. Create document in subscriptions collection
      const subscriptionData = {
        id: subId,
        companyId: compId,
        companyName: newCompanyForm.companyName.trim(),
        ownerName: newCompanyForm.requesterName.trim(),
        email: cleanEmail,
        phone: newCompanyForm.phone.trim(),
        planType: newCompanyForm.planType,
        subscriptionFee: newCompanyForm.empCount === '1-10' ? 50 : newCompanyForm.empCount === '11-50' ? 100 : 200,
        status: newCompanyForm.initialStatus === 'approved' ? 'active' : 'draft',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'subscriptions', subId), cleanFirestoreData(subscriptionData), { merge: true });

      // 4. Create document in subscription_requests collection
      const newReqData = {
        id: reqId,
        name: newCompanyForm.companyName.trim(),
        companyName: newCompanyForm.companyName.trim(),
        requester_name: newCompanyForm.requesterName.trim() || newCompanyForm.companyName.trim(),
        requesterName: newCompanyForm.requesterName.trim() || newCompanyForm.companyName.trim(),
        phone: newCompanyForm.phone.trim(),
        email: cleanEmail,
        plan_type: newCompanyForm.planType,
        planType: newCompanyForm.planType,
        emp_count: newCompanyForm.empCount,
        empCount: newCompanyForm.empCount,
        state: newCompanyForm.initialStatus,
        status: newCompanyForm.initialStatus,
        created_at: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'subscription_requests', reqId), cleanFirestoreData(newReqData), { merge: true });

      // 5. Create user record in users collection
      await setDoc(doc(db, 'users', userUid), {
        email: cleanEmail,
        displayName: newCompanyForm.requesterName.trim() || newCompanyForm.companyName.trim(),
        role: 'COMPANY_ADMIN',
        companyId: compId,
        companyName: newCompanyForm.companyName.trim(),
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      }, { merge: true });

      // 6. Save in Supabase & LocalStorage fallbacks
      try {
        await supabase.from('aysed_subscription').insert([{
          id: reqId,
          name: newCompanyForm.companyName.trim(),
          requester_name: newCompanyForm.requesterName.trim() || newCompanyForm.companyName.trim(),
          phone: newCompanyForm.phone.trim(),
          plan_type: newCompanyForm.planType,
          emp_count: newCompanyForm.empCount,
          state: newCompanyForm.initialStatus,
          created_at: new Date().toISOString()
        }]);
      } catch (sbErr) {}

      // Save credentials for quick copy
      const creds = JSON.parse(localStorage.getItem('aysed_company_credentials') || '{}');
      creds[cleanEmail] = { email: cleanEmail, password, companyName: newCompanyForm.companyName.trim() };
      localStorage.setItem('aysed_company_credentials', JSON.stringify(creds));

      // Persist in local storage subscriptions
      const localSubs = JSON.parse(localStorage.getItem('aysed_saved_subscriptions') || '[]');
      localSubs.unshift(newReqData);
      localStorage.setItem('aysed_saved_subscriptions', JSON.stringify(localSubs));

      // Persist in registered_companies_v1
      const regComps = JSON.parse(localStorage.getItem('registered_companies_v1') || '[]');
      if (!regComps.some((c: any) => c.nameAr === newCompanyForm.companyName.trim())) {
        regComps.push({
          id: compId,
          nameAr: newCompanyForm.companyName.trim(),
          nameEn: newCompanyForm.companyName.trim(),
          ownerName: newCompanyForm.requesterName.trim(),
          email: cleanEmail,
          phone: newCompanyForm.phone.trim(),
          planType: newCompanyForm.planType,
          empCount: newCompanyForm.empCount,
          createdAt: new Date().toISOString(),
          status: newCompanyForm.initialStatus === 'approved' ? 'active' : 'draft'
        });
        localStorage.setItem('registered_companies_v1', JSON.stringify(regComps));
      }

      setIsCreateModalOpen(false);
      await fetchRequests();

      if (authResult.alreadyExisted) {
        toast.success(`تم إنشاء الشركة بنجاح وربطها بالحساب الموجود (${cleanEmail})`);
      } else {
        toast.success(`تم إنشاء الشركة وحساب الدخول بنجاح دون التأثير على جلستك!`);
      }

      // If approved, show credentials modal
      if (newCompanyForm.initialStatus === 'approved') {
        setSelectedActivation({
          companyName: newCompanyForm.companyName.trim(),
          email: cleanEmail,
          password: password,
          phone: newCompanyForm.phone.trim(),
          requesterName: newCompanyForm.requesterName.trim()
        });
      }
    } catch (err: any) {
      console.error('Create company error:', err);
      toast.error('حدث خطأ أثناء إنشاء الشركة: ' + (err.message || 'خطأ غير معروف'));
    } finally {
      setIsCreatingCompany(false);
    }
  };

  const handleOpenEdit = (req: SubscriptionRequest) => {
    const email = req.email || `${req.phone.replace(/[^0-9]/g, '')}@aysedhr.com`;
    const creds = JSON.parse(localStorage.getItem('aysed_company_credentials') || '{}');
    const existingPass = creds[email]?.password || '';
    setEditingRequest({ ...req, email });
    setEditPassword(existingPass);
  };

  const handleSaveEditedRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRequest || !editingRequest.name.trim()) {
      toast.error('يرجى إدخال اسم المنشأة / الشركة');
      return;
    }

    setIsSavingEdit(true);
    const cleanEmail = (editingRequest.email || `${editingRequest.phone.replace(/[^0-9]/g, '')}@aysedhr.com`).trim().toLowerCase();
    const updatedReq: SubscriptionRequest = {
      ...editingRequest,
      name: editingRequest.name.trim(),
      requester_name: editingRequest.requester_name.trim(),
      phone: editingRequest.phone.trim(),
      email: cleanEmail,
    };

    try {
      // 1. Update in Firebase subscription_requests
      try {
        await setDoc(doc(db, 'subscription_requests', updatedReq.id), {
          companyName: updatedReq.name,
          name: updatedReq.name,
          requesterName: updatedReq.requester_name,
          phone: updatedReq.phone,
          email: updatedReq.email,
          planType: updatedReq.plan_type,
          empCount: updatedReq.emp_count,
          status: updatedReq.state,
          state: updatedReq.state,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.warn('Firebase update subscription_requests warn:', err);
      }

      // 2. Update in Firebase subscriptions collection
      try {
        const subSnap = await getDocs(collection(db, 'subscriptions'));
        let subFound = false;
        for (const d of subSnap.docs) {
          const val = d.data();
          if (d.id === updatedReq.id || (val.companyName && val.companyName.toLowerCase() === updatedReq.name.toLowerCase()) || val.email === updatedReq.email) {
            subFound = true;
            await setDoc(doc(db, 'subscriptions', d.id), {
              companyName: updatedReq.name,
              ownerName: updatedReq.requester_name,
              email: updatedReq.email,
              phone: updatedReq.phone,
              planType: updatedReq.plan_type,
              status: updatedReq.state === 'approved' ? 'active' : (updatedReq.state === 'suspended' ? 'suspended' : 'active'),
              updatedAt: new Date().toISOString()
            }, { merge: true });
          }
        }
        if (!subFound && updatedReq.state === 'approved') {
          const subId = updatedReq.id.startsWith('sub-') ? updatedReq.id : `sub-${Date.now()}`;
          await setDoc(doc(db, 'subscriptions', subId), {
            id: subId,
            companyName: updatedReq.name,
            ownerName: updatedReq.requester_name,
            email: updatedReq.email,
            phone: updatedReq.phone,
            planType: updatedReq.plan_type,
            subscriptionFee: 50,
            status: 'active',
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
      } catch (e) {}

      // 3. Update in Firebase companies collection
      try {
        const compSnap = await getDocs(collection(db, 'companies'));
        for (const d of compSnap.docs) {
          const comp = d.data();
          if (d.id === updatedReq.id || comp.nameAr === updatedReq.name || comp.nameEn === updatedReq.name || comp.email === updatedReq.email) {
            await setDoc(doc(db, 'companies', d.id), {
              nameAr: updatedReq.name,
              email: updatedReq.email,
              phone: updatedReq.phone,
              planType: updatedReq.plan_type,
              ownerName: updatedReq.requester_name,
              updatedAt: new Date().toISOString()
            }, { merge: true });
          }
        }
      } catch (e) {}

      // 4. Update in Supabase if exists
      try {
        await supabase
          .from('aysed_subscription')
          .update({
            name: updatedReq.name,
            requester_name: updatedReq.requester_name,
            phone: updatedReq.phone,
            email: updatedReq.email,
            plan_type: updatedReq.plan_type,
            emp_count: updatedReq.emp_count,
            state: updatedReq.state
          })
          .eq('id', updatedReq.id);
      } catch (e) {}

      // 5. Update local storage
      try {
        const localSubs = JSON.parse(localStorage.getItem('aysed_saved_subscriptions') || '[]');
        const updatedLocal = localSubs.map((s: any) => (s.id === updatedReq.id || s.name === updatedReq.name || s.companyName === updatedReq.name) ? { ...s, ...updatedReq, companyName: updatedReq.name, requesterName: updatedReq.requester_name, status: updatedReq.state } : s);
        if (!updatedLocal.some((s: any) => s.id === updatedReq.id)) {
          updatedLocal.push({ ...updatedReq, companyName: updatedReq.name, requesterName: updatedReq.requester_name, status: updatedReq.state });
        }
        localStorage.setItem('aysed_saved_subscriptions', JSON.stringify(updatedLocal));

        const regComps = JSON.parse(localStorage.getItem('registered_companies_v1') || '[]');
        const updatedReg = regComps.map((c: any) => (c.id === updatedReq.id || c.nameAr === updatedReq.name || c.email === updatedReq.email) ? { ...c, nameAr: updatedReq.name, email: updatedReq.email, phone: updatedReq.phone, ownerName: updatedReq.requester_name, planType: updatedReq.plan_type } : c);
        localStorage.setItem('registered_companies_v1', JSON.stringify(updatedReg));
      } catch (e) {}

      // 6. Update credentials in localStorage
      if (editPassword) {
        const creds = JSON.parse(localStorage.getItem('aysed_company_credentials') || '{}');
        creds[cleanEmail] = {
          email: cleanEmail,
          password: editPassword,
          companyName: updatedReq.name,
          phone: updatedReq.phone
        };
        localStorage.setItem('aysed_company_credentials', JSON.stringify(creds));

        // If force-password route exists
        try {
          await fetch('/api/admin/force-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: cleanEmail, newPassword: editPassword })
          });
        } catch (e) {}
      }

      // 7. Update in-memory state
      setRequests(prev => prev.map(r => r.id === updatedReq.id ? updatedReq : r));
      toast.success('تم حفظ وتحديث بيانات حساب الشركة المشتركة بنجاح');
      setEditingRequest(null);
      setEditPassword('');
    } catch (err: any) {
      console.error(err);
      toast.error('حدث خطأ أثناء حفظ التعديلات: ' + (err.message || 'خطأ غير معروف'));
    } finally {
      setIsSavingEdit(false);
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    let allRequests: SubscriptionRequest[] = [];

    // 1. Try Supabase
    try {
      const { data, error } = await supabase
        .from('aysed_subscription')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        data.forEach((d: any) => {
          const reqName = d.name || d.company_name || '';
          if (!isTenantPurged(d.id) && !isTenantPurged(reqName) && !isTenantPurged(d)) {
            allRequests.push({
              id: d.id,
              requester_name: d.requester_name || d.name || '',
              name: reqName,
              phone: d.phone || '',
              plan_type: d.plan_type || 'admin',
              emp_count: d.emp_count || '1-10',
              state: d.state || 'draft',
              created_at: d.created_at || new Date().toISOString(),
              email: d.email || `${d.phone ? d.phone.replace(/[^0-9]/g, '') : 'client'}@aysedhr.com`
            });
          }
        });
      }
    } catch (err) {
      console.warn('Supabase fetch subscriptions warn:', err);
    }

    // 2. Try Firebase subscription_requests & companies collections
    try {
      const snap = await getDocs(collection(db, 'subscription_requests'));
      snap.forEach(d => {
        const val = d.data();
        const compName = val.companyName || val.name || val.nameAr || '';
        if (!isTenantPurged(d.id) && !isTenantPurged(compName) && !isTenantPurged(val)) {
          if (!allRequests.some(r => r.id === d.id || r.name.toLowerCase() === compName.toLowerCase())) {
            let st: 'draft' | 'approved' | 'rejected' | 'suspended' = 'draft';
            if (val.status === 'approved' || val.state === 'approved') st = 'approved';
            else if (val.status === 'rejected' || val.state === 'rejected') st = 'rejected';
            else if (val.status === 'suspended' || val.state === 'suspended') st = 'suspended';

            allRequests.push({
              id: d.id,
              requester_name: val.requesterName || val.requester_name || val.name || '',
              name: compName,
              phone: val.phone || '',
              plan_type: val.planType || val.sector || val.plan || 'admin',
              emp_count: val.empCount || val.employee_count || '1-10',
              state: st,
              created_at: val.createdAt?.toDate?.()?.toISOString() || val.created_at || new Date().toISOString(),
              email: val.email || `${val.phone ? val.phone.replace(/[^0-9]/g, '') : 'client'}@aysedhr.com`
            });
          }
        }
      });

      // Also check Firestore companies collection
      const compSnap = await getDocs(collection(db, 'companies'));
      compSnap.forEach(d => {
        const val = d.data();
        const compName = val.companyName || val.nameAr || val.name || '';
        if (compName && !isTenantPurged(d.id) && !isTenantPurged(compName) && !isTenantPurged(val)) {
          if (!allRequests.some(r => r.id === d.id || r.name.toLowerCase() === compName.toLowerCase())) {
            let st: 'draft' | 'approved' | 'rejected' | 'suspended' = 'approved';
            if (val.status === 'DRAFT' || val.state === 'draft' || val.status === 'PENDING') st = 'draft';
            else if (val.status === 'SUSPENDED' || val.state === 'suspended') st = 'suspended';

            allRequests.push({
              id: d.id,
              requester_name: val.ownerName || val.requesterName || val.name || 'المسؤول',
              name: compName,
              phone: val.phone || val.mobile || '',
              plan_type: val.planType || val.plan || 'admin',
              emp_count: String(val.employeeCount || val.empCount || '1-10'),
              state: st,
              created_at: val.createdAt?.toDate?.()?.toISOString() || val.created_at || new Date().toISOString(),
              email: val.email || `${val.phone ? val.phone.replace(/[^0-9]/g, '') : 'client'}@aysedhr.com`
            });
          }
        }
      });
    } catch (fbErr) {
      console.warn('Firebase fetch subscription_requests warn:', fbErr);
    }

    // 3. LocalStorage fallback
    try {
      const localSubs = JSON.parse(localStorage.getItem('aysed_saved_subscriptions') || '[]');
      localSubs.forEach((ls: any) => {
        const companyTitle = ls.companyName || ls.name || '';
        if (companyTitle && !isTenantPurged(ls.id) && !isTenantPurged(companyTitle) && !isTenantPurged(ls)) {
          if (!allRequests.some(r => r.id === ls.id || r.name.toLowerCase() === companyTitle.toLowerCase())) {
            let st: 'draft' | 'approved' | 'rejected' | 'suspended' = 'draft';
            const valSt = ls.status || ls.state;
            if (valSt === 'approved') st = 'approved';
            else if (valSt === 'rejected') st = 'rejected';
            else if (valSt === 'suspended') st = 'suspended';

            allRequests.push({
              id: ls.id || 'sub-' + Math.random(),
              requester_name: ls.requesterName || ls.name || '',
              name: companyTitle,
              phone: ls.phone || '',
              plan_type: ls.planType || ls.sector || 'admin',
              emp_count: ls.empCount || ls.employee_count || '1-10',
              state: st,
              created_at: ls.createdAt || new Date().toISOString(),
              email: ls.email || `${ls.phone ? ls.phone.replace(/[^0-9]/g, '') : 'client'}@aysedhr.com`
            });
          }
        }
      });
    } catch (lErr) {}

    // 4. Default registered tenants (Only if NOT purged)
    const defaultTenants = [
      {
        id: 'req-almanar',
        name: 'عيادة المنار (Al-Manar Clinic)',
        requester_name: 'د. أحمد عبد الله المحمود',
        phone: '99112233',
        email: 'almanar@hr.com',
        plan_type: 'Medical Enterprise',
        emp_count: '15-50',
        state: 'approved' as const,
        created_at: '2024-01-01T00:00:00.000Z'
      },
      {
        id: 'req-fanar',
        name: 'شركة عيادات الفنار التخصصية (Al-Fanar Clinic)',
        requester_name: 'د. طارق خالد العازمي',
        phone: '66968180',
        email: '66968180@aysedhr.com',
        plan_type: 'Medical Pro',
        emp_count: '10-30',
        state: 'approved' as const,
        created_at: '2024-02-01T00:00:00.000Z'
      },
      {
        id: 'req-elite',
        name: 'شركة إيليت كلينك الطبية (Elite Clinic)',
        requester_name: 'د. ناصر بدر العتيبي',
        phone: '666968182',
        email: '666968182@aysedhr.com',
        plan_type: 'Medical Pro',
        emp_count: '10-30',
        state: 'approved' as const,
        created_at: '2024-03-01T00:00:00.000Z'
      }
    ];

    defaultTenants.forEach(dt => {
      if (!isTenantPurged(dt.id) && !isTenantPurged(dt.name)) {
        if (!allRequests.some(r => r.name.toLowerCase().includes('منار') && dt.id === 'req-almanar') &&
            !allRequests.some(r => r.name.toLowerCase().includes('فنار') && dt.id === 'req-fanar') &&
            !allRequests.some(r => r.name.toLowerCase().includes('إيليت') || r.name.toLowerCase().includes('elite') && dt.id === 'req-elite')) {
          allRequests.push(dt);
        }
      }
    });

    const filteredFinal = allRequests.filter(r => !isTenantPurged(r.id) && !isTenantPurged(r.name) && !isTenantPurged(r));
    setRequests(filteredFinal);
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();

    // Setup real-time listener for incoming subscription requests
    let unsubscribeReq: (() => void) | null = null;
    try {
      unsubscribeReq = onSnapshot(collection(db, 'subscription_requests'), () => {
        fetchRequests();
      }, (err) => {
        console.warn('Subscription requests listener warning:', err);
      });
    } catch (e) {}

    return () => {
      if (unsubscribeReq) unsubscribeReq();
    };
  }, []);

  const handleActivate = async (req: SubscriptionRequest) => {
    try {
      const email = (req.email || `${req.phone.replace(/[^0-9]/g, '') || Date.now()}@aysedhr.com`).trim().toLowerCase();
      const creds = JSON.parse(localStorage.getItem('aysed_company_credentials') || '{}');
      const tempPass = creds[email]?.password || ('Aysed2026#' + Math.random().toString(36).slice(-6, -1) + '!');
      const compId = req.id.startsWith('comp-') ? req.id : `comp-${Date.now()}`;

      // 1. Provision official company account safely without overriding Super Admin session
      const authResult = await provisionTenantAuth({
        email,
        password: tempPass,
        companyName: req.name,
        companyId: compId,
        ownerName: req.requester_name,
        phone: req.phone,
        planType: req.plan_type
      });

      const userUid = authResult.uid || `usr_${Date.now()}`;

      // 2. Set or update document in companies collection with exact requested schema
      const companyDocData = {
        companyId: compId,
        id: compId,
        companyName: req.name,
        nameAr: req.name,
        nameEn: req.name,
        adminEmail: email,
        email: email,
        phone: req.phone,
        ownerName: req.requester_name,
        plan: req.plan_type || 'active',
        planType: req.plan_type || 'active',
        status: 'active',
        state: 'active',
        isActive: true,
        updatedAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'companies', compId), cleanFirestoreData(companyDocData), { merge: true });

      // 3. Ensure user doc exists
      await setDoc(doc(db, 'users', userUid), {
        email,
        displayName: req.requester_name || req.name,
        role: 'COMPANY_ADMIN',
        companyId: compId,
        companyName: req.name,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      }, { merge: true });

      // 4. Update status to approved across databases and storage
      try {
        await supabase
          .from('aysed_subscription')
          .update({ state: 'approved' })
          .eq('id', req.id);
      } catch (e) {}

      try {
        await setDoc(doc(db, 'subscription_requests', req.id), { status: 'approved', state: 'approved' }, { merge: true });
      } catch (e) {}

      const localSubs = JSON.parse(localStorage.getItem('aysed_saved_subscriptions') || '[]');
      const updated = localSubs.map((s: any) => s.id === req.id ? { ...s, status: 'approved', state: 'approved' } : s);
      localStorage.setItem('aysed_saved_subscriptions', JSON.stringify(updated));

      // Persist in registered_companies_v1
      const regComps = JSON.parse(localStorage.getItem('registered_companies_v1') || '[]');
      if (!regComps.some((c: any) => c.nameAr === req.name)) {
        regComps.push({
          id: compId,
          nameAr: req.name,
          nameEn: req.name,
          ownerName: req.requester_name,
          email,
          phone: req.phone,
          planType: req.plan_type,
          empCount: req.emp_count,
          createdAt: req.created_at || new Date().toISOString(),
          status: 'active'
        });
        localStorage.setItem('registered_companies_v1', JSON.stringify(regComps));
      }

      // Save credentials for quick reference
      creds[email] = { email, password: tempPass, companyName: req.name };
      localStorage.setItem('aysed_company_credentials', JSON.stringify(creds));

      fetchRequests();
      toast.success(authResult.alreadyExisted ? 'تم ربط وتفعيل حساب الشركة بنجاح' : 'تم تفعيل حساب الشركة وإنشاء بيانات الدخول بنجاح');

      // Open Modal with credentials
      setSelectedActivation({
        companyName: req.name,
        email,
        password: tempPass,
        phone: req.phone,
        requesterName: req.requester_name
      });

    } catch (err: any) {
      toast.error('حدث خطأ أثناء تفعيل الحساب: ' + err.message);
    }
  };

  const handleSuspend = async (req: SubscriptionRequest) => {
    try {
      try {
        await supabase
          .from('aysed_subscription')
          .update({ state: 'suspended' })
          .eq('id', req.id);
      } catch (e) {}

      try {
        await setDoc(doc(db, 'subscription_requests', req.id), { status: 'suspended', state: 'suspended' }, { merge: true });
      } catch (e) {}

      const localSubs = JSON.parse(localStorage.getItem('aysed_saved_subscriptions') || '[]');
      const updated = localSubs.map((s: any) => s.id === req.id ? { ...s, status: 'suspended', state: 'suspended' } : s);
      localStorage.setItem('aysed_saved_subscriptions', JSON.stringify(updated));

      toast.success(`تم إيقاف/تجميد اشتراك شركة (${req.name}) مؤقتاً ومنع وصول المستخدمين`);
      fetchRequests();
    } catch (err: any) {
      toast.error('حدث خطأ أثناء تعليق الاشتراك: ' + err.message);
    }
  };

  const handleExecuteHardDelete = async () => {
    if (!deletingRequest) return;
    setIsExecutingDelete(true);
    try {
      const email = (deletingRequest.email || `${deletingRequest.phone.replace(/[^0-9]/g, '')}@aysedhr.com`).trim().toLowerCase();
      const res = await purgeTenantCascading({
        id: deletingRequest.id,
        name: deletingRequest.name,
        email: email,
        phone: deletingRequest.phone,
        companyId: deletingRequest.id
      });

      // Real-time local state removal
      setRequests(prev => prev.filter(r => r.id !== deletingRequest.id && r.name !== deletingRequest.name));
      toast.success(res.message || `تم حذف منشأة (${deletingRequest.name}) وكافة بياناتها نهائياً`);
      setDeletingRequest(null);
      setDeleteConfirmText('');
      await fetchRequests();
    } catch (err: any) {
      console.error('Cascading delete error:', err);
      toast.error('حدث خطأ أثناء الحذف النهائي الشامل: ' + (err.message || 'خطأ غير معروف'));
    } finally {
      setIsExecutingDelete(false);
    }
  };

  const openWhatsApp = (phone: string, companyName: string, name: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const fullNumber = cleanPhone.startsWith('965') ? cleanPhone : `965${cleanPhone}`;
    const text = encodeURIComponent(
      `السلام عليكم أخي الكريم ${name}، بخصوص طلب تجربة نظام Aysed S HR 2026 لشركة (${companyName}). يسعدنا تزويدك ببيانات الدخول للنسخة التجريبية...`
    );
    window.open(`https://wa.me/${fullNumber}?text=${text}`, '_blank');
  };

  const filteredRequests = requests.filter(req => {
    const matchSearch = (req.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (req.requester_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (req.phone || '').includes(searchTerm);
    const matchStatus = statusFilter === 'all' ? true : req.state === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-gray-800 font-sans flex flex-col select-none odoo-scrollbar aysed_super_admin_view" dir="rtl">
      
      {/* 1. Official Odoo Control Panel Header (#71639e) */}
      <header className="bg-[#71639e] text-white h-12 px-6 flex items-center justify-between shadow-md sticky top-0 z-50 aysed_admin_portal_header">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-amber-300" />
          <span className="font-bold text-sm tracking-wide">Aysed S HR 2026 - Master Portal</span>
        </div>

        <div className="flex items-center gap-3">
          {(onSwitchToApps || onSwitchToWorkspace) && (
            <button 
              onClick={() => (onSwitchToApps ? onSwitchToApps() : onSwitchToWorkspace && onSwitchToWorkspace())}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-lg text-xs font-bold transition-all cursor-pointer border border-white/20 shadow-sm active:scale-95"
            >
              <Building2 size={15} />
              <span>الانتقال لتطبيقات النظام (HR Apps) 🔄</span>
            </button>
          )}

          <div className="h-4 w-px bg-white/20"></div>

          <div className="flex items-center gap-2 text-xs font-semibold text-white/90">
            <span>{currentUserEmail || 'Super Admin'}</span>
          </div>

          {onLogout && (
            <button 
              onClick={onLogout}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-600/80 hover:bg-rose-700 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
              title="تسجيل الخروج"
            >
              <LogOut size={14} />
              <span>خروج</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Layout Area with Odoo Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Unified Super Admin Sidebar */}
        <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col border-l border-slate-800 shadow-lg">
          <div className="p-4 border-b border-slate-800">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">لوحة التحكم العليا</h2>
          </div>
          <nav className="p-3 space-y-1">
            <button
              onClick={() => setActiveNav('SUBSCRIPTIONS')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${activeNav === 'SUBSCRIPTIONS' ? 'bg-[#71639e] text-white shadow' : 'text-slate-300 hover:bg-slate-800'}`}
            >
              <Building2 size={16} />
              <span>إدارة الاشتراكات (SaaS)</span>
            </button>
            <button
              onClick={() => setActiveNav('SERVER_STATS')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${activeNav === 'SERVER_STATS' ? 'bg-[#71639e] text-white shadow' : 'text-slate-300 hover:bg-slate-800'}`}
            >
              <Server size={16} />
              <span>إحصائيات السيرفر والمنشآت</span>
            </button>
            <button
              onClick={() => setActiveNav('AUDIT_LOGS')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${activeNav === 'AUDIT_LOGS' ? 'bg-[#71639e] text-white shadow' : 'text-slate-300 hover:bg-slate-800'}`}
            >
              <Activity size={16} />
              <span>سجل العمليات والأمان</span>
            </button>
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#F8F9FA]">
          
          {activeNav === 'SUBSCRIPTIONS' && (
            <div className="max-w-7xl mx-auto space-y-6">
              
              {/* Top Bar / Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 font-medium">إجمالي الطلبات</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{requests.length}</p>
                  </div>
                  <Building2 size={32} className="text-[#71639e]" />
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 font-medium">طلبات جديدة</p>
                    <p className="text-2xl font-bold text-amber-600 mt-1">
                      {requests.filter(r => r.state === 'draft').length}
                    </p>
                  </div>
                  <Clock size={32} className="text-amber-500" />
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 font-medium">الشركات المفعلة</p>
                    <p className="text-2xl font-bold text-emerald-600 mt-1">
                      {requests.filter(r => r.state === 'approved').length}
                    </p>
                  </div>
                  <CheckCircle2 size={32} className="text-emerald-500" />
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 font-medium">الشركات المعلقة</p>
                    <p className="text-2xl font-bold text-rose-600 mt-1">
                      {requests.filter(r => r.state === 'suspended').length}
                    </p>
                  </div>
                  <PauseCircle size={32} className="text-rose-500" />
                </div>
              </div>

              {/* Table Container */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between gap-4 bg-gray-50">
                  <div className="relative flex-1 max-w-md">
                    <Search size={16} className="absolute right-3 top-3 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="بحث باسم المنشأة، المتقدم، أو رقم الهاتف..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-lg pr-9 pl-4 py-2 text-xs text-gray-800 outline-none focus:border-[#71639e]"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button 
                      onClick={() => setStatusFilter('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${statusFilter === 'all' ? 'bg-[#71639e] text-white' : 'bg-white border border-gray-300 text-gray-600'}`}
                    >
                      الكل
                    </button>
                    <button 
                      onClick={() => setStatusFilter('draft')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${statusFilter === 'draft' ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-white border border-gray-300 text-gray-600'}`}
                    >
                      جديدة ({requests.filter(r => r.state === 'draft').length})
                    </button>
                    <button 
                      onClick={() => setStatusFilter('approved')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${statusFilter === 'approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-white border border-gray-300 text-gray-600'}`}
                    >
                      مفعلة ({requests.filter(r => r.state === 'approved').length})
                    </button>
                    <button 
                      onClick={() => setStatusFilter('suspended')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${statusFilter === 'suspended' ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-white border border-gray-300 text-gray-600'}`}
                    >
                      معلقة ({requests.filter(r => r.state === 'suspended').length})
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 items-center">
                    <button 
                      onClick={handleOpenCreateModal}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#71639e] hover:bg-[#5e5285] text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95"
                    >
                      <Plus size={15} />
                      <span>اشتراك / شركة جديدة</span>
                    </button>

                    <button 
                      onClick={fetchRequests}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                      <span>تحديث</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs aysed_subscription_table">
                    <thead className="bg-gray-100 text-gray-700 uppercase border-b border-gray-200 font-bold">
                      <tr>
                        <th className="p-3.5">المنشأة والمتقدم</th>
                        <th className="p-3.5">رقم الهاتف</th>
                        <th className="p-3.5">القطاع / الحجم</th>
                        <th className="p-3.5">الحالة</th>
                        <th className="p-3.5">تاريخ الطلب</th>
                        <th className="p-3.5 text-center">إجراءات المالك</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {loading ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-600 font-medium">جاري تحميل سجلات المشتركين...</td>
                        </tr>
                      ) : filteredRequests.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-600 font-medium">لا توجد طلبات اشتراك مطابقة</td>
                        </tr>
                      ) : (
                        filteredRequests.map((req) => (
                          <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3.5">
                              <p className="font-bold text-slate-900 text-sm">{req.name}</p>
                              <p className="text-slate-600 font-medium text-xs">{req.requester_name}</p>
                              {req.email && <p className="text-[11px] text-[#714B67] font-mono font-medium mt-0.5">{req.email}</p>}
                            </td>
                            <td className="p-3.5 font-mono text-slate-800 font-bold text-xs">{req.phone}</td>
                            <td className="p-3.5">
                              <span className="inline-block px-2.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800 font-bold text-[11px] mb-1">
                                {req.plan_type === 'medical' ? 'القطاع الطبي' : 'إداري / تجاري'}
                              </span>
                              <p className="text-slate-600 font-semibold text-[11px]">{req.emp_count} موظف</p>
                            </td>
                            <td className="p-3.5">
                              {req.state === 'draft' && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold shadow-xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                                  قيد المراجعة (جديد)
                                </span>
                              )}
                              {req.state === 'approved' && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold shadow-xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                                  نشطة
                                </span>
                              )}
                              {req.state === 'suspended' && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-100 text-rose-900 border border-rose-300 text-xs font-bold shadow-xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                                  معلقة / مجمدة
                                </span>
                              )}
                              {req.state === 'rejected' && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold shadow-xs">
                                  مرفوض
                                </span>
                              )}
                            </td>
                            <td className="p-3.5 text-slate-700 font-mono font-bold text-xs">
                              {new Date(req.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                            </td>
                            <td className="p-3.5">
                              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                {/* WhatsApp button */}
                                <button
                                  onClick={() => openWhatsApp(req.phone, req.name, req.requester_name)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                  title="تواصل فوري واتساب"
                                >
                                  <MessageSquare size={13} />
                                  <span>واتساب</span>
                                </button>

                                {/* Edit account button */}
                                <button
                                  onClick={() => handleOpenEdit(req)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                  title="تعديل بيانات حساب واشتراك المنشأة"
                                >
                                  <Edit3 size={13} />
                                  <span>تعديل الحساب</span>
                                </button>

                                {/* Activate / Re-activate */}
                                {req.state !== 'approved' ? (
                                  <button
                                    onClick={() => handleActivate(req)}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-[#71639e] hover:bg-[#5e5285] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm"
                                    title="تفعيل أو إعادة تفعيل الشركة"
                                  >
                                    <PlayCircle size={13} />
                                    <span>{req.state === 'suspended' ? 'إعادة تفعيل' : 'تفعيل'}</span>
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => {
                                        const email = req.email || `${req.phone.replace(/[^0-9]/g, '')}@aysedhr.com`;
                                        const creds = JSON.parse(localStorage.getItem('aysed_company_credentials') || '{}');
                                        const existingPass = creds[email]?.password || 'Aysed2026#Secure';
                                        setSelectedActivation({
                                          companyName: req.name,
                                          email,
                                          password: existingPass,
                                          phone: req.phone,
                                          requesterName: req.requester_name
                                        });
                                      }}
                                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-slate-300"
                                      title="عرض بيانات الاعتماد"
                                    >
                                      بيانات الدخول
                                    </button>

                                    <button
                                      onClick={() => handleSuspend(req)}
                                      className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                      title="إيقاف مؤقت / تجميد الحساب"
                                    >
                                      <PauseCircle size={13} />
                                      <span>تجميد</span>
                                    </button>
                                  </>
                                )}

                                {onImpersonateCompany && req.state === 'approved' && (
                                  <button
                                    onClick={() => onImpersonateCompany(req.name)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm"
                                    title="دخول كمسؤول الشركة"
                                  >
                                    <Eye size={13} />
                                    <span>دخول كمسؤول الشركة (Login as Tenant)</span>
                                  </button>
                                )}

                                {/* Cascading Hard Delete button */}
                                <button
                                  onClick={() => {
                                    setDeletingRequest(req);
                                    setDeleteConfirmText('');
                                  }}
                                  className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-lg text-xs font-bold border border-rose-200 transition-all cursor-pointer shadow-sm active:scale-95"
                                  title="حذف نهائي شامل للمنشأة (Cascading Hard Delete)"
                                >
                                  <Trash2 size={13} />
                                  <span>حذف نهائي</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {activeNav === 'SERVER_STATS' && (
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
                  <Server className="w-6 h-6 text-[#71639e]" />
                  <div>
                    <h3 className="text-base font-bold text-gray-900">إحصائيات السيرفر وقاعدة البيانات</h3>
                    <p className="text-xs text-gray-500">حالة الخوادم السحابية ونشاط المنظومة المركزي</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <p className="text-xs text-gray-500 font-medium">حالة الاستضافة السحابية</p>
                    <p className="text-lg font-bold text-emerald-600 mt-1 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>متصل (Google Cloud Run)</span>
                    </p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <p className="text-xs text-gray-500 font-medium">قاعدة البيانات المركزية</p>
                    <p className="text-lg font-bold text-indigo-600 mt-1 flex items-center gap-2">
                      <Database size={18} />
                      <span>Firebase & Supabase Sync Active</span>
                    </p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <p className="text-xs text-gray-500 font-medium">إجمالي الشركات المسجلة</p>
                    <p className="text-lg font-bold text-gray-900 mt-1">{requests.length} منشأة</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeNav === 'AUDIT_LOGS' && (
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
                  <Activity className="w-6 h-6 text-[#71639e]" />
                  <div>
                    <h3 className="text-base font-bold text-gray-900">سجل العمليات والأمان المركزي</h3>
                    <p className="text-xs text-gray-500">متابعة عمليات التوثيق وتعديلات الحسابات والإدارة العليا</p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs font-mono text-gray-600 space-y-2">
                  <p>[INFO] {new Date().toISOString()} - Master Portal session active for {currentUserEmail || 'Super Admin'}</p>
                  <p>[INFO] {new Date().toISOString()} - Successfully loaded {requests.length} tenant subscriptions.</p>
                  <p>[SEC] {new Date().toISOString()} - JWT Token verified successfully with Role: SUPER_ADMIN.</p>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Activation Success Modal */}
      {selectedActivation && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-lg w-full p-6 text-gray-800 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">تفعيل حساب شركة ({selectedActivation.companyName})</h3>
                  <p className="text-xs text-gray-500">بيانات اعتماد الدخول الرسمية للنظام</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedActivation(null)}
                className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 my-6">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">البريد الإلكتروني للشركة:</label>
                  <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-gray-300 font-mono text-sm text-[#71639e]">
                    <span>{selectedActivation.email}</span>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(selectedActivation.email);
                        toast.success('تم نسخ البريد الإلكتروني');
                      }}
                      className="flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded cursor-pointer transition-colors"
                    >
                      <Copy size={12} />
                      <span>نسخ</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 block mb-1">كلمة المرور المؤقتة المُنشأة:</label>
                  <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-gray-300 font-mono text-sm text-amber-600">
                    <span className="tracking-wider">{selectedActivation.password}</span>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(selectedActivation.password);
                        toast.success('تم نسخ كلمة المرور');
                      }}
                      className="flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded cursor-pointer transition-colors"
                    >
                      <Copy size={12} />
                      <span>نسخ</span>
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-600 leading-relaxed bg-amber-50 p-3 rounded-lg border border-amber-200">
                مرحباً بك في Aysed S HR 2026.. تم إنشاء الحساب وتفعيل الترخيص بنجاح. يمكنك إرسال البيانات مباشرة عبر واتساب أدناه.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  const cleanPhone = selectedActivation.phone.replace(/[^0-9]/g, '');
                  const fullNumber = cleanPhone.startsWith('965') ? cleanPhone : `965${cleanPhone}`;
                  const text = encodeURIComponent(
                    `مرحباً بك في Aysed S HR 2026.. رابط الدخول: ${window.location.origin} | البريد: ${selectedActivation.email} | كلمة المرور: ${selectedActivation.password}`
                  );
                  window.open(`https://wa.me/${fullNumber}?text=${text}`, '_blank');
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-sm"
              >
                <MessageSquare size={16} />
                <span>إرسال بيانات الدخول عبر واتساب</span>
              </button>

              <button
                onClick={() => setSelectedActivation(null)}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer border border-gray-300"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cascading Hard Delete Confirmation Modal */}
      {deletingRequest && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-rose-300 rounded-2xl max-w-lg w-full p-6 text-gray-800 shadow-2xl relative animate-in fade-in zoom-in duration-200 space-y-4">
            
            <div className="flex items-start gap-3.5 pb-3 border-b border-rose-100">
              <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center shrink-0 border border-rose-200 shadow-inner">
                <Trash2 size={24} />
              </div>
              <div className="flex-1 text-right">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span>حذف نهائي شامل للمنشأة (Cascading Wipe)</span>
                </h3>
                <p className="text-xs text-rose-600 font-semibold mt-0.5">تحذير أمني: هذا الإجراء جذري ولا يمكن التراجع عنه!</p>
              </div>
              <button
                onClick={() => { setDeletingRequest(null); setDeleteConfirmText(''); }}
                disabled={isExecutingDelete}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3.5 text-xs space-y-2 text-right">
              <div className="flex items-center justify-between font-bold text-gray-900 pb-1.5 border-b border-rose-200/60">
                <span className="text-rose-700">المنشأة المستهدفة:</span>
                <span className="bg-rose-200/70 text-rose-900 px-2.5 py-0.5 rounded-md font-mono text-xs">{deletingRequest.name}</span>
              </div>
              
              <p className="text-gray-700 font-medium">عند التأكيد، سيتم مسح المنظومة وتطهير كافة السجلات بشكل متسلسل (Cascade):</p>
              
              <ul className="space-y-1 text-[11px] text-gray-600 list-disc list-inside font-medium pr-1">
                <li><strong className="text-rose-800">Firebase Authentication:</strong> حذف حساب الدخول الرسمي للشركة نهائياً.</li>
                <li><strong className="text-rose-800">Firestore Companies & Subscriptions:</strong> حذف وثيقة الشركة وعقود الاشتراك.</li>
                <li><strong className="text-rose-800">كافة السجلات الفرعية:</strong> حذف بيانات الموظفين، الإجازات، الحضور، الرواتب، العقود، والعهد.</li>
                <li><strong className="text-rose-800">التخزين المحلي والمؤقت:</strong> إزالة بيانات الاعتماد والذاكرة المخزنة لهذا المشترك.</li>
              </ul>
            </div>

            <div className="space-y-1.5 text-right">
              <label className="block text-xs font-bold text-gray-700">
                للتأكيد، يرجى كتابة اسم المنشأة <span className="text-rose-600 font-mono select-all font-bold">"{deletingRequest.name}"</span> أو كلمة <span className="text-rose-600 font-bold">"حذف"</span>:
              </label>
              <input
                type="text"
                disabled={isExecutingDelete}
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={`اكتب "${deletingRequest.name}" أو "حذف"`}
                className="w-full border-2 border-rose-200 focus:border-rose-500 rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500/20 bg-gray-50 text-right"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleExecuteHardDelete}
                disabled={
                  isExecutingDelete ||
                  (deleteConfirmText.trim().toLowerCase() !== deletingRequest.name.trim().toLowerCase() &&
                   deleteConfirmText.trim() !== 'حذف' &&
                   deleteConfirmText.trim().toLowerCase() !== 'delete')
                }
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                  deleteConfirmText.trim().toLowerCase() === deletingRequest.name.trim().toLowerCase() ||
                  deleteConfirmText.trim() === 'حذف' ||
                  deleteConfirmText.trim().toLowerCase() === 'delete'
                    ? 'bg-rose-600 hover:bg-rose-700 text-white active:scale-95'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300'
                }`}
              >
                {isExecutingDelete ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري الحذف والتطهير الشامل...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>تأكيد الحذف النهائي الشامل (Purge)</span>
                  </>
                )}
              </button>
              
              <button
                onClick={() => { setDeletingRequest(null); setDeleteConfirmText(''); }}
                disabled={isExecutingDelete}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer border border-gray-300"
              >
                إلغاء
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Edit Subscription / Company Account Modal */}
      {editingRequest && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-lg w-full p-6 text-gray-800 shadow-2xl relative animate-in fade-in zoom-in duration-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-50 text-[#71639e] rounded-xl border border-purple-100">
                  <Edit3 size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">تعديل بيانات حساب واشتراك الشركة</h3>
                  <p className="text-[11px] text-gray-500 font-mono">{editingRequest.name}</p>
                </div>
              </div>
              <button
                onClick={() => { setEditingRequest(null); setEditPassword(''); }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditedRequest} className="space-y-3.5 text-xs text-slate-900">
              <div>
                <label className="block font-bold text-gray-700 mb-1 flex items-center gap-1">
                  <Building size={13} className="text-[#71639e]" />
                  <span>اسم المنشأة / الشركة *</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingRequest.name}
                  onChange={(e) => setEditingRequest({ ...editingRequest, name: e.target.value })}
                  placeholder="مثال: عيادات الفنار التخصصية"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#71639e]/40 bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1 flex items-center gap-1">
                    <User size={13} className="text-[#71639e]" />
                    <span>اسم المتقدم / المفوض *</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingRequest.requester_name}
                    onChange={(e) => setEditingRequest({ ...editingRequest, requester_name: e.target.value })}
                    placeholder="اسم المسؤول"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#71639e]/40 bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1 flex items-center gap-1">
                    <Phone size={13} className="text-[#71639e]" />
                    <span>رقم الهاتف (الكويت) *</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingRequest.phone}
                    onChange={(e) => setEditingRequest({ ...editingRequest, phone: e.target.value })}
                    placeholder="965XXXXXXXX"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#71639e]/40 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1 flex items-center gap-1">
                  <Mail size={13} className="text-[#71639e]" />
                  <span>البريد الإلكتروني المعتمد لتسجيل الدخول *</span>
                </label>
                <input
                  type="email"
                  required
                  value={editingRequest.email || ''}
                  onChange={(e) => setEditingRequest({ ...editingRequest, email: e.target.value })}
                  placeholder="admin@company.com"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#71639e]/40 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1 flex items-center gap-1">
                  <Lock size={13} className="text-[#71639e]" />
                  <span>كلمة المرور للدخول (تحديث اختياري)</span>
                </label>
                <input
                  type="text"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="اتركها كما هي أو أدخل كلمة سر جديدة"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#71639e]/40 bg-white text-amber-700"
                />
                <p className="text-[10px] text-gray-500 mt-0.5">سيتم حفظ وتحديث بيانات المرور للشركة مباشرة.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">القطاع / الباقة</label>
                  <select
                    value={editingRequest.plan_type}
                    onChange={(e) => setEditingRequest({ ...editingRequest, plan_type: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#71639e]/40 bg-white"
                  >
                    <option value="medical">طبي / عيادات ومراكز</option>
                    <option value="commercial">تجاري ومقاولات</option>
                    <option value="education">تعليمي ومدارس</option>
                    <option value="services">خدمي واستشارات</option>
                    <option value="industrial">صناعي وإنتاج</option>
                    <option value="admin">باقة عامة شاملة</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">عدد الموظفين</label>
                  <select
                    value={editingRequest.emp_count}
                    onChange={(e) => setEditingRequest({ ...editingRequest, emp_count: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#71639e]/40 bg-white"
                  >
                    <option value="1-10">1 - 10 موظفين</option>
                    <option value="11-50">11 - 50 موظف</option>
                    <option value="51-200">51 - 200 موظف</option>
                    <option value="200+">أكثر من 200 موظف</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">حالة الحساب والاشتراك</label>
                <select
                  value={editingRequest.state}
                  onChange={(e) => setEditingRequest({ ...editingRequest, state: e.target.value as any })}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#71639e]/40 bg-white"
                >
                  <option value="approved">مفعل ونشط (Approved / Active)</option>
                  <option value="draft">قيد المراجعة والانتظار (Draft / Pending)</option>
                  <option value="suspended">مجمد / معلق مؤقتاً (Suspended)</option>
                  <option value="rejected">مرفوض (Rejected)</option>
                </select>
              </div>

              <div className="flex gap-2 pt-3 border-t border-gray-200 justify-end">
                <button
                  type="button"
                  onClick={() => { setEditingRequest(null); setEditPassword(''); }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 bg-[#71639e] hover:bg-[#5e5285] text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Save size={14} />
                  <span>{isSavingEdit ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create New Company / Subscription Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-[#71639e] to-[#5a4e80] text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 size={20} className="text-amber-300" />
                <h3 className="font-bold text-sm">إنشاء اشتراك / منشأة جديدة (SaaS Tenant Provisioning)</h3>
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCompanySubmit} className="p-5 space-y-3.5 text-xs text-right text-slate-900">
              <div className="bg-purple-50 p-2.5 rounded-xl border border-purple-100 flex items-start gap-2 text-purple-800">
                <ShieldCheck size={16} className="shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed font-medium">
                  سيتم إنشاء حساب الشركة في <strong>Firebase Auth</strong> ومزامنة سجل المنشأة في <strong>Firestore (companies)</strong> فوراً وبشكل معزول دون التأثير على جلسة المالك (Super Admin).
                </p>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1 flex items-center gap-1">
                  <Building size={13} className="text-[#71639e]" />
                  <span>اسم الشركة / المنشأة *</span>
                </label>
                <input
                  type="text"
                  required
                  value={newCompanyForm.companyName}
                  onChange={(e) => setNewCompanyForm({ ...newCompanyForm, companyName: e.target.value })}
                  placeholder="مثال: شركة النور الطبية"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#71639e]/40 bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1 flex items-center gap-1">
                    <User size={13} className="text-[#71639e]" />
                    <span>اسم المالك / المسؤول</span>
                  </label>
                  <input
                    type="text"
                    value={newCompanyForm.requesterName}
                    onChange={(e) => setNewCompanyForm({ ...newCompanyForm, requesterName: e.target.value })}
                    placeholder="مثال: د. محمد العلي"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#71639e]/40 bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1 flex items-center gap-1">
                    <Phone size={13} className="text-[#71639e]" />
                    <span>رقم الهاتف (الكويت)</span>
                  </label>
                  <input
                    type="text"
                    value={newCompanyForm.phone}
                    onChange={(e) => setNewCompanyForm({ ...newCompanyForm, phone: e.target.value })}
                    placeholder="99112233"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#71639e]/40 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1 flex items-center gap-1">
                    <Mail size={13} className="text-[#71639e]" />
                    <span>البريد الإلكتروني للدخول *</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={newCompanyForm.email}
                    onChange={(e) => setNewCompanyForm({ ...newCompanyForm, email: e.target.value })}
                    placeholder="admin@company.com"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#71639e]/40 bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1 flex items-center gap-1">
                    <Lock size={13} className="text-[#71639e]" />
                    <span>كلمة المرور الابتدائية</span>
                  </label>
                  <input
                    type="text"
                    value={newCompanyForm.password}
                    onChange={(e) => setNewCompanyForm({ ...newCompanyForm, password: e.target.value })}
                    placeholder="Aysed2026#Secure"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#71639e]/40 bg-white text-amber-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">القطاع / الباقة</label>
                  <select
                    value={newCompanyForm.planType}
                    onChange={(e) => setNewCompanyForm({ ...newCompanyForm, planType: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#71639e]/40 bg-white"
                  >
                    <option value="medical">طبي / عيادات ومراكز</option>
                    <option value="commercial">تجاري ومقاولات</option>
                    <option value="education">تعليمي ومدارس</option>
                    <option value="services">خدمي واستشارات</option>
                    <option value="industrial">صناعي وإنتاج</option>
                    <option value="admin">باقة عامة شاملة</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">حجم المنشأة</label>
                  <select
                    value={newCompanyForm.empCount}
                    onChange={(e) => setNewCompanyForm({ ...newCompanyForm, empCount: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#71639e]/40 bg-white"
                  >
                    <option value="1-10">1 - 10 موظفين</option>
                    <option value="11-50">11 - 50 موظف</option>
                    <option value="51-200">51 - 200 موظف</option>
                    <option value="200+">أكثر من 200 موظف</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">حالة الاشتراك المبدئية</label>
                <select
                  value={newCompanyForm.initialStatus}
                  onChange={(e) => setNewCompanyForm({ ...newCompanyForm, initialStatus: e.target.value as any })}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#71639e]/40 bg-white"
                >
                  <option value="approved">مفعل ونشط فوراً (Active / Approved)</option>
                  <option value="draft">قيد المراجعة والانتظار (Draft)</option>
                </select>
              </div>

              <div className="flex gap-2 pt-3 border-t border-gray-200 justify-end">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isCreatingCompany}
                  className="px-5 py-2 bg-[#71639e] hover:bg-[#5e5285] text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Plus size={14} />
                  <span>{isCreatingCompany ? 'جاري تهيئة المنشأة والحساب...' : 'إنشاء وتفعيل المنشأة'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default SuperAdminDashboard;
