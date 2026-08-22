import React, { useState, useEffect } from 'react';
import { Shield, Building, Users, CreditCard, LogOut, LayoutGrid, MessageCircle, Settings, CheckCircle2, PauseCircle, Trash2, Edit3, Save, X, Lock, Mail, Phone, Plus, Building2, ShieldCheck, User, RefreshCw, AlertTriangle, RotateCcw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { db, provisionTenantAuth, cleanFirestoreData, purgeTenantCascading, isTenantPurged } from '../lib/firebase';
import { initialCompanies, initialSubscriptions } from '../data/initialData';
import { collection, getDocs, doc, updateDoc, setDoc, onSnapshot } from 'firebase/firestore';
import toast from 'react-hot-toast';

interface SuperAdminPortalProps {
  onSwitchToApps: () => void;
  onImpersonateCompany?: (companyName: string) => void;
  onLogout?: () => void;
  currentUserEmail?: string;
}

export const SuperAdminPortal: React.FC<SuperAdminPortalProps> = ({ 
  onSwitchToApps,
  onImpersonateCompany,
  onLogout,
  currentUserEmail
}) => {
  const [tenants, setTenants] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [editingTenant, setEditingTenant] = useState<any | null>(null);
  const [editPassword, setEditPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Cascading Hard Delete states
  const [deletingTenant, setDeletingTenant] = useState<any | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isExecutingDelete, setIsExecutingDelete] = useState(false);

  // Create Company Modal State
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
    initialStatus: 'active' as 'active' | 'draft'
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
      initialStatus: 'active'
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

      // 2. Create document in companies collection with exact schema
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
        status: newCompanyForm.initialStatus === 'active' ? 'active' : 'pending',
        state: newCompanyForm.initialStatus === 'active' ? 'active' : 'pending',
        isActive: newCompanyForm.initialStatus === 'active',
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
        status: newCompanyForm.initialStatus === 'active' ? 'active' : 'draft',
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
        state: newCompanyForm.initialStatus === 'active' ? 'approved' : 'draft',
        status: newCompanyForm.initialStatus === 'active' ? 'approved' : 'draft',
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
          state: newCompanyForm.initialStatus === 'active' ? 'approved' : 'draft',
          created_at: new Date().toISOString()
        }]);
      } catch (sbErr) {}

      // Save credentials for quick copy
      const creds = JSON.parse(localStorage.getItem('aysed_company_credentials') || '{}');
      creds[cleanEmail] = { email: cleanEmail, password, companyName: newCompanyForm.companyName.trim() };
      localStorage.setItem('aysed_company_credentials', JSON.stringify(creds));

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
          status: newCompanyForm.initialStatus === 'active' ? 'active' : 'draft'
        });
        localStorage.setItem('registered_companies_v1', JSON.stringify(regComps));
      }

      setIsCreateModalOpen(false);
      await loadData();

      if (authResult.alreadyExisted) {
        toast.success(`تم إنشاء الشركة بنجاح وربطها بالحساب الموجود (${cleanEmail})`);
      } else {
        toast.success(`تم إنشاء الشركة وحساب الدخول بنجاح دون التأثير على جلستك!`);
      }
    } catch (err: any) {
      console.error('Create company error:', err);
      toast.error('حدث خطأ أثناء إنشاء الشركة: ' + (err.message || 'خطأ غير معروف'));
    } finally {
      setIsCreatingCompany(false);
    }
  };

  const handleResetDefaultTenants = async () => {
    try {
      localStorage.removeItem('aysed_purged_tenants');
      
      // Sync from Firestore to LocalStorage
      const compSnap = await getDocs(collection(db, 'companies'));
      const activeComps: any[] = [];
      compSnap.docs.forEach(d => {
        if (d.id === 'comp-super-admin') return;
        const data = d.data();
        activeComps.push({
          id: d.id,
          nameAr: data.nameAr || data.name || data.companyName || 'منشأة',
          nameEn: data.nameEn || data.nameAr || 'Company',
          phone: data.phone || '99112233',
          email: data.email || `${d.id}@aysedhr.com`,
          status: data.status || 'active',
          commercialRegNo: data.commercialRegNo || '',
          civilIdCompany: data.civilIdCompany || '',
          wsiCode: data.wsiCode || '',
          createdAt: data.createdAt || new Date().toISOString()
        });
      });

      if (activeComps.length > 0) {
        localStorage.setItem('registered_companies_v1', JSON.stringify(activeComps));
      }

      await loadData();
      window.dispatchEvent(new CustomEvent('aysed_companies_changed'));
      toast.success('تمت مزامنة وتحديث المنشآت بنجاح من قاعدة البيانات السحابية!');
    } catch (e: any) {
      toast.error('حدث خطأ أثناء استعادة الشركات: ' + e.message);
    }
  };

  const loadData = async () => {
    setLoading(true);
    const tenantMap = new Map<string, any>();

    // 1. Locally registered companies in localStorage (registered_companies_v1)
    try {
      const localCompRaw = localStorage.getItem('registered_companies_v1');
      if (localCompRaw) {
        const localComps = JSON.parse(localCompRaw);
        if (Array.isArray(localComps)) {
          localComps.forEach((c: any) => {
            if (!c || c.id === 'comp-super-admin') return;
            const name = c.nameAr || c.name || c.nameEn;
            if (name && !isTenantPurged(c.id) && !isTenantPurged(name)) {
              tenantMap.set(c.id, {
                id: c.id,
                name: name,
                phone: (c as any).phone1 || c.phone || '99112233',
                email: c.email || `${c.id}@aysedhr.com`,
                state: c.status === 'suspended' ? 'suspended' : 'active',
                created_at: c.createdAt || new Date().toISOString(),
                plan: c.plan || c.planType || 'ENTERPRISE',
                employees_count: c.employeeCount || 5,
                commercialRegNo: c.commercialRegNo,
                civilIdCompany: c.civilIdCompany,
                wsiCode: c.wsiCode,
                source: 'local'
              });
            }
          });
        }
      }
    } catch {}

    // 2. Saved subscriptions in localStorage (aysed_saved_subscriptions)
    try {
      const savedSubsRaw = localStorage.getItem('aysed_saved_subscriptions');
      if (savedSubsRaw) {
        const savedSubs = JSON.parse(savedSubsRaw);
        if (Array.isArray(savedSubs)) {
          savedSubs.forEach((s: any) => {
            const name = s.companyName || s.name;
            const targetId = s.companyId || s.id;
            if (name && targetId && targetId !== 'comp-super-admin' && !isTenantPurged(targetId) && !isTenantPurged(name)) {
              const existing = tenantMap.get(targetId);
              tenantMap.set(targetId, {
                id: targetId,
                name: name,
                phone: s.phone || existing?.phone || '99112233',
                email: s.email || existing?.email || `${targetId}@aysedhr.com`,
                state: s.status === 'suspended' || s.state === 'suspended' ? 'suspended' : 'active',
                created_at: s.createdAt || s.startDate || existing?.created_at || new Date().toISOString(),
                plan: s.planType || existing?.plan || 'ENTERPRISE',
                employees_count: s.empCount || existing?.employees_count || 5,
                source: 'saved_subscription'
              });
            }
          });
        }
      }
    } catch {}

    // 3. Firestore (companies) as cloud source of truth
    try {
      const compSnap = await getDocs(collection(db, 'companies'));
      compSnap.docs.forEach(d => {
        const data = d.data();
        if (d.id === 'comp-super-admin') return;
        const name = data.nameAr || data.name || data.companyName;
        if (name && !isTenantPurged(d.id) && !isTenantPurged(name)) {
          const existing = tenantMap.get(d.id);
          tenantMap.set(d.id, {
            id: d.id,
            name,
            phone: data.phone || data.mobile || (data as any).phone1 || existing?.phone || '96590000000',
            email: data.email || data.adminEmail || existing?.email || `${d.id}@aysedhr.com`,
            state: data.status === 'SUSPENDED' || data.state === 'suspended' ? 'suspended' : (data.status === 'DRAFT' || data.state === 'draft' ? 'draft' : 'active'),
            created_at: data.createdAt || existing?.created_at || new Date().toISOString(),
            plan: data.plan || data.planType || existing?.plan || 'ENTERPRISE',
            employees_count: data.employeeCount || existing?.employees_count || 10,
            commercialRegNo: data.commercialRegNo || existing?.commercialRegNo,
            civilIdCompany: data.civilIdCompany || existing?.civilIdCompany,
            wsiCode: data.wsiCode || existing?.wsiCode,
            source: 'firestore'
          });
        }
      });
    } catch (e) {
      console.warn('Firestore companies fetch notice:', e);
    }

    // 4. Firestore (subscriptions)
    try {
      const subSnap = await getDocs(collection(db, 'subscriptions'));
      subSnap.docs.forEach(d => {
        const data = d.data();
        const targetId = data.companyId || d.id;
        if (targetId === 'comp-super-admin') return;
        const name = data.companyName || data.name;
        if (name && !isTenantPurged(targetId) && !isTenantPurged(name)) {
          const existing = tenantMap.get(targetId);
          tenantMap.set(targetId, {
            id: targetId,
            name,
            phone: data.phone || existing?.phone || '99112233',
            email: data.email || existing?.email || `${targetId}@aysedhr.com`,
            state: data.status === 'suspended' || data.state === 'suspended' ? 'suspended' : 'active',
            created_at: data.createdAt || data.startDate || existing?.created_at || new Date().toISOString(),
            plan: data.planType || existing?.plan || 'ENTERPRISE',
            employees_count: existing?.employees_count || 3,
            source: 'firestore_sub'
          });
        }
      });
    } catch (e) {}

    // 5. Firestore (subscription_requests)
    try {
      const reqSnap = await getDocs(collection(db, 'subscription_requests'));
      reqSnap.docs.forEach(d => {
        const r = d.data();
        const reqName = r.companyName || r.name || r.requester_name;
        if (reqName && !isTenantPurged(d.id) && !isTenantPurged(reqName)) {
          const targetId = d.id;
          const existing = tenantMap.get(targetId);
          if (!existing) {
            tenantMap.set(targetId, {
              id: targetId,
              name: reqName,
              phone: r.phone || '-',
              email: r.email || `${targetId}@aysedhr.com`,
              state: r.state || (r.status === 'APPROVED' ? 'active' : 'draft'),
              created_at: r.createdAt || r.created_at || new Date().toISOString(),
              plan: r.planType || r.plan || 'PRO',
              employees_count: r.empCount || 5,
              source: 'request'
            });
          }
        }
      });
    } catch (e) {
      console.warn('Firestore requests fetch notice:', e);
    }

    // 6. Supabase as fallback
    try {
      const { data, error } = await supabase.from('aysed_subscription').select('*');
      if (!error && data && data.length > 0) {
        data.forEach((item: any) => {
          const name = item.name || item.companyName;
          if (name && !isTenantPurged(item.id) && !isTenantPurged(name)) {
            const targetId = item.id;
            if (!tenantMap.has(targetId)) {
              tenantMap.set(targetId, item);
            }
          }
        });
      }
    } catch (err) {
      console.warn('Supabase fetch notice:', err);
    }

    // 7. Fallback to initial default only if database & storage are completely empty
    if (tenantMap.size === 0) {
      initialCompanies.forEach(c => {
        if (c.id === 'comp-super-admin') return;
        if (!isTenantPurged(c.id) && !isTenantPurged(c.nameAr)) {
          tenantMap.set(c.id, {
            id: c.id,
            name: c.nameAr || c.nameEn,
            phone: (c as any).phone1 || c.phone || '99112233',
            email: c.email || `${c.id}@aysedhr.com`,
            state: c.status === 'suspended' ? 'suspended' : 'active',
            created_at: '2024-01-01T00:00:00.000Z',
            plan: 'ENTERPRISE',
            employees_count: 5,
            commercialRegNo: c.commercialRegNo,
            civilIdCompany: c.civilIdCompany,
            wsiCode: c.wsiCode,
            source: 'default'
          });
        }
      });
    }

    const loadedTenants = Array.from(tenantMap.values()).filter(t => !isTenantPurged(t.id) && !isTenantPurged(t.name));

    setTenants(loadedTenants);
    setStats({
      total: loadedTenants.length,
      active: loadedTenants.filter(t => t.state === 'active' || t.state === 'approved' || !t.state).length,
      pending: loadedTenants.filter(t => t.state === 'draft' || t.state === 'pending').length
    });
    setLoading(false);
  };

  useEffect(() => {
    loadData();

    // Listen to real-time subscription requests, companies, and subscriptions
    let unsubscribeReq: (() => void) | null = null;
    let unsubscribeComp: (() => void) | null = null;
    let unsubscribeSubs: (() => void) | null = null;
    try {
      unsubscribeReq = onSnapshot(collection(db, 'subscription_requests'), () => {
        loadData();
      }, (err) => {
        console.warn('SuperAdminPortal requests onSnapshot error:', err);
      });
      unsubscribeComp = onSnapshot(collection(db, 'companies'), () => {
        loadData();
      }, (err) => {
        console.warn('SuperAdminPortal companies onSnapshot error:', err);
      });
      unsubscribeSubs = onSnapshot(collection(db, 'subscriptions'), () => {
        loadData();
      }, (err) => {
        console.warn('SuperAdminPortal subscriptions onSnapshot error:', err);
      });
    } catch (e) {}

    const handleCustomChange = () => {
      loadData();
    };
    window.addEventListener('aysed_companies_changed', handleCustomChange);

    return () => {
      if (unsubscribeReq) unsubscribeReq();
      if (unsubscribeComp) unsubscribeComp();
      if (unsubscribeSubs) unsubscribeSubs();
      window.removeEventListener('aysed_companies_changed', handleCustomChange);
    };
  }, []);

  const formatSubscriptionDate = (dateVal: any) => {
    if (!dateVal) return '-';
    try {
      if (typeof dateVal === 'object' && dateVal !== null) {
        if (typeof dateVal.toDate === 'function') {
          return dateVal.toDate().toLocaleDateString('ar-KW', { year: 'numeric', month: 'numeric', day: 'numeric' });
        }
        if (dateVal.seconds) {
          return new Date(dateVal.seconds * 1000).toLocaleDateString('ar-KW', { year: 'numeric', month: 'numeric', day: 'numeric' });
        }
      }
      const d = new Date(dateVal);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('ar-KW', { year: 'numeric', month: 'numeric', day: 'numeric' });
      }
      if (typeof dateVal === 'string' && dateVal.trim().length > 0) {
        return dateVal;
      }
    } catch {
      return '-';
    }
    return '-';
  };

  const handleToggleState = async (tenant: any) => {
    const newState = tenant.state === 'active' ? 'suspended' : 'active';
    try {
      // Try updating in Supabase
      try {
        await supabase.from('aysed_subscription').update({ state: newState }).eq('id', tenant.id);
      } catch (e) {
        // ignore
      }
      // Try updating in Firestore
      try {
        await updateDoc(doc(db, 'companies', tenant.id), {
          status: newState === 'active' ? 'ACTIVE' : 'SUSPENDED'
        });
      } catch (e) {
        // ignore
      }

      setTenants(prev => prev.map(t => t.id === tenant.id ? { ...t, state: newState } : t));
      setStats(prev => ({
        ...prev,
        active: newState === 'active' ? prev.active + 1 : Math.max(0, prev.active - 1)
      }));
      toast.success(newState === 'active' ? `تم تفعيل اشتراك ${tenant.name}` : `تم تجميد اشتراك ${tenant.name}`);
    } catch (e) {
      toast.error('تعذر تحديث حالة الاشتراك');
    }
  };

  const handleImpersonate = (tenant: any) => {
    if (onImpersonateCompany) {
      onImpersonateCompany(tenant.name);
    } else {
      onSwitchToApps();
    }
    toast.success(`تم تسجيل الدخول بصلاحية الإدارة لـ: ${tenant.name}`);
  };

  const handleOpenEdit = (tenant: any) => {
    const email = tenant.email || `${tenant.phone ? tenant.phone.replace(/[^0-9]/g, '') : 'client'}@aysedhr.com`;
    const creds = JSON.parse(localStorage.getItem('aysed_company_credentials') || '{}');
    const existingPass = creds[email]?.password || '';
    setEditingTenant({ ...tenant, email });
    setEditPassword(existingPass);
  };

  const handleExecuteHardDelete = async () => {
    if (!deletingTenant) return;
    setIsExecutingDelete(true);
    try {
      const email = (deletingTenant.email || `${deletingTenant.phone ? deletingTenant.phone.replace(/[^0-9]/g, '') : ''}@aysedhr.com`).trim().toLowerCase();
      const res = await purgeTenantCascading({
        id: deletingTenant.id,
        name: deletingTenant.name,
        email: email,
        phone: deletingTenant.phone,
        companyId: deletingTenant.id
      });

      // Real-time local state removal & stats sync
      setTenants(prev => prev.filter(t => t.id !== deletingTenant.id && t.name !== deletingTenant.name));
      setStats(prev => ({
        total: Math.max(0, prev.total - 1),
        active: deletingTenant.state === 'active' ? Math.max(0, prev.active - 1) : prev.active,
        pending: deletingTenant.state === 'pending' || deletingTenant.state === 'draft' ? Math.max(0, prev.pending - 1) : prev.pending
      }));

      toast.success(res.message || `تم حذف منشأة (${deletingTenant.name}) وكافة بياناتها نهائياً`);
      setDeletingTenant(null);
      setDeleteConfirmText('');
      await loadData();
    } catch (err: any) {
      console.error('Hard delete error:', err);
      toast.error('حدث خطأ أثناء الحذف النهائي الشامل: ' + (err.message || ''));
    } finally {
      setIsExecutingDelete(false);
    }
  };

  const handleSaveTenantEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant || !editingTenant.name?.trim()) {
      toast.error('يرجى إدخال اسم المنشأة / الشركة');
      return;
    }

    setIsSaving(true);
    const cleanEmail = (editingTenant.email || `${editingTenant.phone.replace(/[^0-9]/g, '')}@aysedhr.com`).trim().toLowerCase();
    const updatedTenant = {
      ...editingTenant,
      name: editingTenant.name.trim(),
      phone: editingTenant.phone?.trim() || '',
      email: cleanEmail
    };

    try {
      // 1. Update in Firestore companies
      try {
        await setDoc(doc(db, 'companies', updatedTenant.id), {
          nameAr: updatedTenant.name,
          phone: updatedTenant.phone,
          email: updatedTenant.email,
          status: updatedTenant.state === 'active' ? 'ACTIVE' : (updatedTenant.state === 'suspended' ? 'SUSPENDED' : 'DRAFT'),
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (e) {}

      // 2. Update in Firestore subscriptions
      try {
        const subSnap = await getDocs(collection(db, 'subscriptions'));
        for (const d of subSnap.docs) {
          const val = d.data();
          if (d.id === updatedTenant.id || (val.companyName && val.companyName.toLowerCase() === updatedTenant.name.toLowerCase()) || val.email === updatedTenant.email) {
            await setDoc(doc(db, 'subscriptions', d.id), {
              companyName: updatedTenant.name,
              email: updatedTenant.email,
              phone: updatedTenant.phone,
              status: updatedTenant.state,
              updatedAt: new Date().toISOString()
            }, { merge: true });
          }
        }
      } catch (e) {}

      // 3. Update in Firestore subscription_requests
      try {
        const reqSnap = await getDocs(collection(db, 'subscription_requests'));
        for (const d of reqSnap.docs) {
          const val = d.data();
          if (d.id === updatedTenant.id || (val.companyName && val.companyName.toLowerCase() === updatedTenant.name.toLowerCase()) || val.email === updatedTenant.email) {
            await setDoc(doc(db, 'subscription_requests', d.id), {
              companyName: updatedTenant.name,
              name: updatedTenant.name,
              email: updatedTenant.email,
              phone: updatedTenant.phone,
              status: updatedTenant.state,
              state: updatedTenant.state,
              updatedAt: new Date().toISOString()
            }, { merge: true });
          }
        }
      } catch (e) {}

      // 4. Update in Supabase
      try {
        await supabase
          .from('aysed_subscription')
          .update({
            name: updatedTenant.name,
            phone: updatedTenant.phone,
            email: updatedTenant.email,
            state: updatedTenant.state
          })
          .eq('id', updatedTenant.id);
      } catch (e) {}

      // 5. Update local storage
      try {
        const localSubs = JSON.parse(localStorage.getItem('aysed_saved_subscriptions') || '[]');
        const updatedLocal = localSubs.map((s: any) => (s.id === updatedTenant.id || s.name === updatedTenant.name || s.companyName === updatedTenant.name) ? { ...s, ...updatedTenant, companyName: updatedTenant.name, status: updatedTenant.state } : s);
        localStorage.setItem('aysed_saved_subscriptions', JSON.stringify(updatedLocal));

        const regComps = JSON.parse(localStorage.getItem('registered_companies_v1') || '[]');
        const updatedReg = regComps.map((c: any) => (c.id === updatedTenant.id || c.nameAr === updatedTenant.name) ? { ...c, nameAr: updatedTenant.name, email: updatedTenant.email, phone: updatedTenant.phone } : c);
        localStorage.setItem('registered_companies_v1', JSON.stringify(updatedReg));
      } catch (e) {}

      // 6. Update credentials
      if (editPassword) {
        const creds = JSON.parse(localStorage.getItem('aysed_company_credentials') || '{}');
        creds[cleanEmail] = {
          email: cleanEmail,
          password: editPassword,
          companyName: updatedTenant.name,
          phone: updatedTenant.phone
        };
        localStorage.setItem('aysed_company_credentials', JSON.stringify(creds));
      }

      setTenants(prev => prev.map(t => t.id === updatedTenant.id ? updatedTenant : t));
      toast.success('تم حفظ وتحديث بيانات حساب الشركة المشتركة بنجاح');
      setEditingTenant(null);
      setEditPassword('');
    } catch (err: any) {
      toast.error('حدث خطأ أثناء حفظ التعديل: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleWhatsApp = (phone: string, name: string) => {
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    const finalPhone = cleanPhone.startsWith('965') ? cleanPhone : `965${cleanPhone}`;
    const msg = encodeURIComponent(`مرحباً إدارة ${name}، بخصوص حسابكم في نظام Aysed S HR 2026...`);
    window.open(`https://wa.me/${finalPhone}?text=${msg}`, '_blank');
  };

  return (
    /* الجدار العازل: شاشة كاملة تغطي أي تداخل خلفي */
    <div className="fixed inset-0 z-[9999] bg-[#f4f7f6] flex flex-col font-['Tajawal'] select-none overflow-y-auto" dir="rtl">

      {/* 1. الشريط العلوي الاحترافي (Navbar) */}
      <div className="bg-[#71639e] text-white p-4 shadow-lg flex justify-between items-center px-8 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg"><Shield size={24}/></div>
          <div>
            <h1 className="text-xl font-bold">لوحة تحكم المنصة (Super Admin)</h1>
            <p className="text-[10px] opacity-80 text-right">نظام Aysed S HR 2026 - الكويت</p>
          </div>
        </div>

        {/* أزرار الإجراءات */}
        <div className="flex items-center gap-3">
          {currentUserEmail && (
            <span className="hidden lg:inline-block text-xs bg-black/20 px-3 py-1.5 rounded-lg text-white/90 border border-white/10 font-mono">
              {currentUserEmail}
            </span>
          )}

          {onLogout && (
            <button
              onClick={onLogout}
              className="bg-red-500/80 hover:bg-red-600 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer text-white shadow-sm"
              title="تسجيل الخروج"
            >
              <LogOut size={15}/>
              <span className="hidden sm:inline">تسجيل خروج</span>
            </button>
          )}

          {/* زر الانتقال الآمن - ينهي وضع الأدمن ويفتح التطبيقات */}
          <button 
            onClick={onSwitchToApps}
            className="bg-[#008784] hover:bg-teal-700 px-6 py-2 rounded-full font-bold flex items-center gap-2 transition-all shadow-md text-white cursor-pointer active:scale-95"
          >
            <LayoutGrid size={18}/>
            الانتقال لتطبيقات النظام (HR Apps)
          </button>
        </div>
      </div>

      {/* 2. ملخص الإحصائيات (Stats Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border-r-8 border-blue-500 hover:shadow-md transition-shadow">
          <p className="text-gray-500 text-sm font-medium">إجمالي المشتركين</p>
          <h2 className="text-4xl font-black text-gray-800 mt-2">{stats.total}</h2>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border-r-8 border-green-500 hover:shadow-md transition-shadow">
          <p className="text-gray-500 text-sm font-medium">الشركات المفعلة</p>
          <h2 className="text-4xl font-black text-green-600 mt-2">{stats.active}</h2>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border-r-8 border-orange-500 hover:shadow-md transition-shadow">
          <p className="text-gray-500 text-sm font-medium">طلبات بانتظار المراجعة</p>
          <h2 className="text-4xl font-black text-orange-500 mt-2">{stats.pending}</h2>
        </div>
      </div>

      {/* 3. جدول إدارة الشركات المشتركة */}
      <div className="flex-1 px-8 pb-8">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-bold text-gray-800 flex items-center gap-2 text-base">
              <Building className="text-[#71639e]" size={20} />
              سجل الشركات والمشتركين النشطين
            </h3>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleResetDefaultTenants}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition border border-slate-300 cursor-pointer"
                title="إعادة مزامنة الشركات الافتراضية مع السحابة والذاكرة المحلية"
              >
                <RotateCcw size={13} className="text-slate-500" />
                <span>مزامنة واستعادة المنشآت</span>
              </button>
              <button 
                onClick={handleOpenCreateModal}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#71639e] hover:bg-[#5e5285] text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
              >
                <Plus size={14} />
                <span>إضافة شركة / اشتراك</span>
              </button>
              <button 
                onClick={loadData}
                className="text-xs text-[#71639e] hover:underline font-bold px-2 py-1 rounded cursor-pointer"
              >
                🔄 تحديث البيانات
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead className="bg-gray-50 border-b text-[#71639e] text-xs font-black">
                <tr>
                  <th className="p-4 whitespace-nowrap">المنشأة / الشركة</th>
                  <th className="p-4 whitespace-nowrap">رقم الهاتف</th>
                  <th className="p-4 whitespace-nowrap text-center">الحالة</th>
                  <th className="p-4 whitespace-nowrap text-center">تاريخ الاشتراك</th>
                  <th className="p-4 text-center whitespace-nowrap">إجراءات المالك (Sayed)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-400 font-bold">
                      جاري تحميل بيانات المنظومة...
                    </td>
                  </tr>
                ) : tenants.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-400 font-bold">
                      لا يوجد مشتركون حالياً
                    </td>
                  </tr>
                ) : (
                  tenants.map(tenant => (
                    <tr key={tenant.id} className="hover:bg-purple-50/30 transition-colors">
                      <td className="p-4 font-bold text-gray-800">
                        <div className="flex items-center gap-2">
                          <Building size={16} className="text-gray-400 shrink-0" />
                          <span className="truncate max-w-[240px]">{tenant.name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-gray-600 font-mono text-xs whitespace-nowrap">{tenant.phone || '-'}</td>
                      <td className="p-4 text-center whitespace-nowrap">
                        {tenant.state === 'suspended' ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                            مجمد ⏸️
                          </span>
                        ) : tenant.state === 'draft' || tenant.state === 'pending' ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            قيد المراجعة ⏳
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            مفعل نشط ✅
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-xs text-gray-600 font-semibold text-center whitespace-nowrap">
                        {formatSubscriptionDate(tenant.created_at)}
                      </td>
                      <td className="p-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap sm:flex-nowrap">
                          <button 
                            onClick={() => handleWhatsApp(tenant.phone, tenant.name)}
                            className="p-1.5 text-green-600 hover:bg-green-100 rounded-lg cursor-pointer transition-colors shrink-0"
                            title="محادثة واتساب مباشرة"
                          >
                            <MessageCircle size={18}/>
                          </button>
                          <button 
                            onClick={() => handleOpenEdit(tenant)}
                            className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1.5 rounded-lg text-xs font-bold hover:bg-amber-600 hover:text-white transition-all cursor-pointer shadow-sm flex items-center gap-1 shrink-0"
                            title="تعديل بيانات الحساب"
                          >
                            <Edit3 size={13}/>
                            <span>تعديل</span>
                          </button>
                          <button 
                            onClick={() => handleImpersonate(tenant)}
                            className="bg-gray-100 text-gray-700 hover:bg-[#71639e] hover:text-white border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm shrink-0"
                            title="دخول لحساب المنشأة كمسؤول"
                          >
                            دخول كمدير
                          </button>
                          <button 
                            onClick={() => handleToggleState(tenant)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm shrink-0 border ${
                              tenant.state === 'suspended'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-600 hover:text-white'
                                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-600 hover:text-white'
                            }`}
                          >
                            {tenant.state === 'suspended' ? 'إلغاء التجميد' : 'تجميد'}
                          </button>
                          <button 
                            onClick={() => {
                              setDeletingTenant(tenant);
                              setDeleteConfirmText('');
                            }}
                            className="bg-rose-50 text-rose-600 border border-rose-200 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-rose-600 hover:text-white transition-all cursor-pointer shadow-sm flex items-center gap-1 active:scale-95 shrink-0"
                            title="حذف نهائي شامل للمنشأة (Purge All Data)"
                          >
                            <Trash2 size={13}/>
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

      {/* Edit Tenant Modal */}
      {editingTenant && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-lg w-full p-6 text-gray-800 shadow-2xl relative animate-in fade-in zoom-in duration-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-50 text-[#71639e] rounded-xl border border-purple-100">
                  <Edit3 size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">تعديل بيانات حساب واشتراك الشركة</h3>
                  <p className="text-[11px] text-gray-500 font-mono">{editingTenant.name}</p>
                </div>
              </div>
              <button
                onClick={() => { setEditingTenant(null); setEditPassword(''); }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTenantEdit} className="space-y-3.5 text-xs text-slate-900">
              <div>
                <label className="block font-bold text-gray-700 mb-1 flex items-center gap-1">
                  <Building size={13} className="text-[#71639e]" />
                  <span>اسم المنشأة / الشركة *</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingTenant.name || ''}
                  onChange={(e) => setEditingTenant({ ...editingTenant, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#71639e]/40 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1 flex items-center gap-1">
                  <Phone size={13} className="text-[#71639e]" />
                  <span>رقم الهاتف *</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingTenant.phone || ''}
                  onChange={(e) => setEditingTenant({ ...editingTenant, phone: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#71639e]/40 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1 flex items-center gap-1">
                  <Mail size={13} className="text-[#71639e]" />
                  <span>البريد الإلكتروني لتسجيل الدخول *</span>
                </label>
                <input
                  type="email"
                  required
                  value={editingTenant.email || ''}
                  onChange={(e) => setEditingTenant({ ...editingTenant, email: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#71639e]/40 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1 flex items-center gap-1">
                  <Lock size={13} className="text-[#71639e]" />
                  <span>تحديث كلمة المرور (اختياري)</span>
                </label>
                <input
                  type="text"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="اتركها فارغة أو أدخل كلمة سر جديدة"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#71639e]/40 bg-white text-amber-700"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">حالة الحساب</label>
                <select
                  value={editingTenant.state || 'active'}
                  onChange={(e) => setEditingTenant({ ...editingTenant, state: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#71639e]/40 bg-white"
                >
                  <option value="active">مفعل ونشط (Active)</option>
                  <option value="suspended">مجمد وموقوف (Suspended)</option>
                  <option value="draft">قيد الانتظار (Draft)</option>
                </select>
              </div>

              <div className="flex gap-2 pt-3 border-t border-gray-200 justify-end">
                <button
                  type="button"
                  onClick={() => { setEditingTenant(null); setEditPassword(''); }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-[#71639e] hover:bg-[#5e5285] text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Save size={14} />
                  <span>{isSaving ? 'جاري الحفظ...' : 'حفظ التعديل'}</span>
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
                  <option value="active">مفعل ونشط فوراً (Active)</option>
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
      {/* Cascading Hard Delete Confirmation Modal */}
      {deletingTenant && (
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
                onClick={() => { setDeletingTenant(null); setDeleteConfirmText(''); }}
                disabled={isExecutingDelete}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3.5 text-xs space-y-2 text-right">
              <div className="flex items-center justify-between font-bold text-gray-900 pb-1.5 border-b border-rose-200/60">
                <span className="text-rose-700">المنشأة المستهدفة:</span>
                <span className="bg-rose-200/70 text-rose-900 px-2.5 py-0.5 rounded-md font-mono text-xs">{deletingTenant.name}</span>
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
                للتأكيد، يرجى كتابة اسم المنشأة <span className="text-rose-600 font-mono select-all font-bold">"{deletingTenant.name}"</span> أو كلمة <span className="text-rose-600 font-bold">"حذف"</span>:
              </label>
              <input
                type="text"
                disabled={isExecutingDelete}
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={`اكتب "${deletingTenant.name}" أو "حذف"`}
                className="w-full border-2 border-rose-200 focus:border-rose-500 rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500/20 bg-gray-50 text-right"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleExecuteHardDelete}
                disabled={
                  isExecutingDelete ||
                  (deleteConfirmText.trim().toLowerCase() !== (deletingTenant.name || '').trim().toLowerCase() &&
                   deleteConfirmText.trim() !== 'حذف' &&
                   deleteConfirmText.trim().toLowerCase() !== 'delete')
                }
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                  deleteConfirmText.trim().toLowerCase() === (deletingTenant.name || '').trim().toLowerCase() ||
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
                onClick={() => { setDeletingTenant(null); setDeleteConfirmText(''); }}
                disabled={isExecutingDelete}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer border border-gray-300"
              >
                إلغاء
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminPortal;
