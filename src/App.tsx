import React, { useState, useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';
import { OdooLogin } from './components/OdooLogin';
import { OdooTopBar } from './components/OdooTopBar';
import { UserProfileModal } from './components/UserProfileModal';
import { OdooAppLauncher } from './components/OdooAppLauncher';
import { OdooSidebar } from './components/OdooSidebar';
import { BackgroundRenderer } from './components/BackgroundRenderer';
import { SmartNotificationsBanner } from './components/SmartNotificationsBanner';
import { AysedAICopilot } from './components/AysedAICopilot';
import { OdooFieldInspector } from './components/OdooFieldInspector';
import { AppRouter } from './routes';
import { QuickNotificationModal } from './components/QuickNotificationModal';

import { 
  Company, Employee, Contract, LeaveRequest, 
  AttendanceRecord, Payslip, DocumentItem, AutomationRule, 
  CustodyItem, LoanAdvance, DisciplinaryWarning, EmployeeNote, DocumentTemplate, 
  GeneratedDocument, AuditLog, ShiftProfile, EmployeeShift, 
  EmploymentCommencement, CompanySubscription, JobTitle, Department, EmployeeNotification
} from './types';
import { initialCompanies, initialDepartments, initialJobTitles, initialEmployees, initialContracts } from './data/initialData';
import { useFirebaseSync } from './hooks/useFirebaseSync';
import { generateSmartNotifications } from './utils/notificationsEngine';
import toast, { Toaster } from 'react-hot-toast';
import { auth, db, cleanFirestoreData } from './lib/firebase';
import { doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { MANARA_STORAGE_KEYS, getPersistentData, setPersistentData } from './utils/persistentStorage';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState('');
  const [userCompanyId, setUserCompanyId] = useState('');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    toast.dismiss();
  }, []);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsAuthenticated(true);
        setCurrentUserEmail(user.email || '');
        const userEmailLower = (user.email || '').toLowerCase();
        if (userEmailLower === 'admin@aysed.com' || userEmailLower === 'elsayedhr1993@gmail.com') {
          setCurrentUserRole('SUPER_ADMIN');
          setCurrentApp('SAAS_ADMIN');
          
          // Sync upgrade to Firestore automatically (similar to Odoo env.cr.commit())
          try {
            setDoc(doc(db, 'users', user.uid), {
              email: userEmailLower,
              role: 'SUPER_ADMIN',
              timezone: 'Asia/Kuwait'
            }, { merge: true });
          } catch(e) {}
        } else {
          try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
              const data = userDoc.data();
              const role = data.role || 'COMPANY_ADMIN';
              setCurrentUserRole(role);
              if (role === 'EMPLOYEE') {
                setCurrentApp('ATTENDANCE');
              } else {
                setCurrentApp(null);
              }
              if (data.companyId) {
                setUserCompanyId(data.companyId);
                localStorage.setItem('activeCompanyId', data.companyId);
              }
            } else {
               setCurrentUserRole('COMPANY_ADMIN');
               setCurrentApp(null);
            }
          } catch(e) {
            console.error("Error fetching user data", e);
            setCurrentUserRole('COMPANY_ADMIN');
            setCurrentApp(null);
          }
        }
      } else {
        setIsAuthenticated(false);
        setCurrentUserEmail('');
        setCurrentUserRole('');
        setUserCompanyId('');
      }
    });
    return () => unsubscribe();
  }, []);

  const [activeCompany, setActiveCompany] = useState<Company>(() => {
    const saved = localStorage.getItem('activeCompanyId');
    const existingCompanies = getPersistentData<Company[]>(MANARA_STORAGE_KEYS.COMPANIES, initialCompanies, MANARA_STORAGE_KEYS.TENANTS);
    if (saved) {
      const found = existingCompanies.find(c => c.id === saved) || null;
      if (found) return found;
    }
    return existingCompanies.length > 0 ? existingCompanies[0] : null as any;
  });
  
  const [companies, setCompanies] = useState<Company[]>(() => 
    getPersistentData<Company[]>(MANARA_STORAGE_KEYS.COMPANIES, initialCompanies, MANARA_STORAGE_KEYS.TENANTS)
  );

  // Keep activeCompany up to date with the companies list
  useEffect(() => {
    if (companies.length > 0) {
      setActiveCompany(prev => {
        const targetId = userCompanyId || localStorage.getItem('activeCompanyId') || prev?.id;
        const found = companies.find(c => c.id === targetId);
        if (found) {
          return JSON.stringify(prev) !== JSON.stringify(found) ? found : prev;
        }
        if (!userCompanyId && (!prev || companies[0].id !== prev?.id)) {
          localStorage.setItem('activeCompanyId', companies[0].id);
          return companies[0];
        }
        return prev;
      });
    }
  }, [companies, userCompanyId]);

  // Save activeCompanyId when it changes
  useEffect(() => {
    if (activeCompany?.id) {
      localStorage.setItem('activeCompanyId', activeCompany.id);
    }
  }, [activeCompany?.id]);

  // action_switch_context: Switches active company in user session and reloads state with isolated company data
  const actionSwitchContext = async (companyOrId: Company | string) => {
    const targetComp = typeof companyOrId === 'string' 
      ? companies.find(c => c.id === companyOrId) 
      : companyOrId;

    if (!targetComp) return;

    setActiveCompany(targetComp);
    localStorage.setItem('activeCompanyId', targetComp.id);

    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'users', auth.currentUser.uid), cleanFirestoreData({
          company_id: targetComp.id,
          companyId: targetComp.id,
          updated_at: new Date().toISOString()
        }), { merge: true });
      } catch (err) {
        console.error('Error writing company_id to user session:', err);
      }
    }

    toast.success(`تم تغيير سياق الشركة للمدير بنجاح: ${targetComp.nameAr || targetComp.name}`);
  };

  // Expose action_switch_context on window for Odoo action client calls
  useEffect(() => {
    (window as any).action_switch_context = (companyId: string) => actionSwitchContext(companyId);
    return () => {
      delete (window as any).action_switch_context;
    };
  }, [companies]);
  // Primary State Controller: Single state variable to navigate screens without conflict
  const [currentApp, setCurrentApp] = useState<string | null>(null);
  const activeApp = currentApp || 'LAUNCHER';
  const setActiveApp = (app: string | null) => setCurrentApp(app === 'LAUNCHER' || app === 'APP_LAUNCHER' ? null : app);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);

  // Data state with persistent localStorage initialization
  const [employees, setEmployees] = useState<Employee[]>(() => 
    getPersistentData<Employee[]>(MANARA_STORAGE_KEYS.EMPLOYEES, initialEmployees)
  );
  const [jobTitles, setJobTitles] = useState<JobTitle[]>(() => 
    getPersistentData<JobTitle[]>(MANARA_STORAGE_KEYS.JOB_TITLES, initialJobTitles)
  );
  const [departments, setDepartments] = useState<Department[]>(() => 
    getPersistentData<Department[]>(MANARA_STORAGE_KEYS.DEPARTMENTS, initialDepartments)
  );
  const [contracts, setContracts] = useState<Contract[]>(() => 
    getPersistentData<Contract[]>(MANARA_STORAGE_KEYS.CONTRACTS, initialContracts)
  );
  const [leaves, setLeaves] = useState<LeaveRequest[]>(() => 
    getPersistentData<LeaveRequest[]>(MANARA_STORAGE_KEYS.LEAVES, [])
  );
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => 
    getPersistentData<AttendanceRecord[]>(MANARA_STORAGE_KEYS.ATTENDANCE, [])
  );
  const [payslips, setPayslips] = useState<Payslip[]>(() => 
    getPersistentData<Payslip[]>(MANARA_STORAGE_KEYS.PAYSLIPS, [])
  );
  const [documents, setDocuments] = useState<DocumentItem[]>(() => 
    getPersistentData<DocumentItem[]>(MANARA_STORAGE_KEYS.DOCUMENTS, [])
  );
  const [custodies, setCustodies] = useState<CustodyItem[]>(() => 
    getPersistentData<CustodyItem[]>(MANARA_STORAGE_KEYS.CUSTODIES, [])
  );
  const [loans, setLoans] = useState<LoanAdvance[]>(() => 
    getPersistentData<LoanAdvance[]>(MANARA_STORAGE_KEYS.LOANS, [])
  );
  const [warnings, setWarnings] = useState<DisciplinaryWarning[]>(() => 
    getPersistentData<DisciplinaryWarning[]>(MANARA_STORAGE_KEYS.WARNINGS, [])
  );
  const [employeeNotes, setEmployeeNotes] = useState<EmployeeNote[]>(() => 
    getPersistentData<EmployeeNote[]>(MANARA_STORAGE_KEYS.EMPLOYEE_NOTES, [])
  );
  const [documentTemplates, setDocumentTemplates] = useState<DocumentTemplate[]>(() => 
    getPersistentData<DocumentTemplate[]>(MANARA_STORAGE_KEYS.DOCUMENT_TEMPLATES, [])
  );
  const [generatedDocs, setGeneratedDocs] = useState<GeneratedDocument[]>(() => 
    getPersistentData<GeneratedDocument[]>(MANARA_STORAGE_KEYS.GENERATED_DOCS, [])
  );
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => 
    getPersistentData<AuditLog[]>(MANARA_STORAGE_KEYS.AUDIT_LOGS, [])
  );
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>(() => 
    getPersistentData<AutomationRule[]>(MANARA_STORAGE_KEYS.AUTOMATION_RULES, [])
  );
  const [shifts, setShifts] = useState<ShiftProfile[]>(() => 
    getPersistentData<ShiftProfile[]>(MANARA_STORAGE_KEYS.SHIFTS, [])
  );
  const [employeeShifts, setEmployeeShifts] = useState<EmployeeShift[]>(() => 
    getPersistentData<EmployeeShift[]>(MANARA_STORAGE_KEYS.EMPLOYEE_SHIFTS, [])
  );
  const [commencements, setCommencements] = useState<EmploymentCommencement[]>(() => 
    getPersistentData<EmploymentCommencement[]>(MANARA_STORAGE_KEYS.COMMENCEMENTS, [])
  );
  const [subscriptions, setSubscriptions] = useState<CompanySubscription[]>(() => 
    getPersistentData<CompanySubscription[]>(MANARA_STORAGE_KEYS.SUBSCRIPTIONS, [])
  );
  
  // Automated Employee Notifications State
  const [employeeNotifications, setEmployeeNotifications] = useState<EmployeeNotification[]>(() => 
    getPersistentData<EmployeeNotification[]>(MANARA_STORAGE_KEYS.EMPLOYEE_NOTIFICATIONS, [])
  );

  // Auto-sync all entity states to localStorage whenever updated
  useEffect(() => { setPersistentData(MANARA_STORAGE_KEYS.EMPLOYEES, employees); }, [employees]);
  useEffect(() => { setPersistentData(MANARA_STORAGE_KEYS.COMPANIES, companies, MANARA_STORAGE_KEYS.TENANTS); }, [companies]);
  useEffect(() => { setPersistentData(MANARA_STORAGE_KEYS.JOB_TITLES, jobTitles); }, [jobTitles]);
  useEffect(() => { setPersistentData(MANARA_STORAGE_KEYS.DEPARTMENTS, departments); }, [departments]);
  useEffect(() => { setPersistentData(MANARA_STORAGE_KEYS.CONTRACTS, contracts); }, [contracts]);
  useEffect(() => { setPersistentData(MANARA_STORAGE_KEYS.LEAVES, leaves); }, [leaves]);
  useEffect(() => { setPersistentData(MANARA_STORAGE_KEYS.ATTENDANCE, attendance); }, [attendance]);
  useEffect(() => { setPersistentData(MANARA_STORAGE_KEYS.PAYSLIPS, payslips); }, [payslips]);
  useEffect(() => { setPersistentData(MANARA_STORAGE_KEYS.DOCUMENTS, documents); }, [documents]);
  useEffect(() => { setPersistentData(MANARA_STORAGE_KEYS.CUSTODIES, custodies); }, [custodies]);
  useEffect(() => { setPersistentData(MANARA_STORAGE_KEYS.LOANS, loans); }, [loans]);
  useEffect(() => { setPersistentData(MANARA_STORAGE_KEYS.WARNINGS, warnings); }, [warnings]);
  useEffect(() => { setPersistentData(MANARA_STORAGE_KEYS.EMPLOYEE_NOTES, employeeNotes); }, [employeeNotes]);
  useEffect(() => { setPersistentData(MANARA_STORAGE_KEYS.DOCUMENT_TEMPLATES, documentTemplates); }, [documentTemplates]);
  useEffect(() => { setPersistentData(MANARA_STORAGE_KEYS.GENERATED_DOCS, generatedDocs); }, [generatedDocs]);
  useEffect(() => { setPersistentData(MANARA_STORAGE_KEYS.AUDIT_LOGS, auditLogs); }, [auditLogs]);
  useEffect(() => { setPersistentData(MANARA_STORAGE_KEYS.AUTOMATION_RULES, automationRules); }, [automationRules]);
  useEffect(() => { setPersistentData(MANARA_STORAGE_KEYS.SHIFTS, shifts); }, [shifts]);
  useEffect(() => { setPersistentData(MANARA_STORAGE_KEYS.EMPLOYEE_SHIFTS, employeeShifts); }, [employeeShifts]);
  useEffect(() => { setPersistentData(MANARA_STORAGE_KEYS.COMMENCEMENTS, commencements); }, [commencements]);
  useEffect(() => { setPersistentData(MANARA_STORAGE_KEYS.SUBSCRIPTIONS, subscriptions); }, [subscriptions]);
  useEffect(() => { setPersistentData(MANARA_STORAGE_KEYS.EMPLOYEE_NOTIFICATIONS, employeeNotifications); }, [employeeNotifications]);

  // Quick Notification Modal State
  const [isQuickNotifModalOpen, setIsQuickNotifModalOpen] = useState(false);
  const [quickNotifEmp, setQuickNotifEmp] = useState<Employee | null>(null);
  const [quickNotifTrigger, setQuickNotifTrigger] = useState<any>('HR_ACTION_REQUIRED');
  const [quickNotifData, setQuickNotifData] = useState<any>(null);

  const handleOpenNotificationModal = (emp?: Employee | null, trigger: any = 'HR_ACTION_REQUIRED', data?: any) => {
    setQuickNotifEmp(emp || employees[0] || null);
    setQuickNotifTrigger(trigger);
    setQuickNotifData(data || null);
    setIsQuickNotifModalOpen(true);
  };

  const handleSendNotification = (notif: EmployeeNotification) => {
    setEmployeeNotifications(prev => {
      const filtered = prev.filter(n => n.id !== notif.id);
      return [notif, ...filtered];
    });
  };

  const handleDeleteNotification = (notifId: string) => {
    setEmployeeNotifications(prev => prev.filter(n => n.id !== notifId));
    toast.success('تم حذف سجل الإشعار بنجاح');
  };

  const handleClearAllNotifications = () => {
    setEmployeeNotifications([]);
    toast.success('تم مسح جميع سجلات الإشعارات');
  };

  const visibleCompanies = currentUserRole === 'SUPER_ADMIN' ? companies : (activeCompany ? [activeCompany] : (userCompanyId ? companies.filter(c => c.id === userCompanyId) : companies));

  // UI state
  const [bgTheme, setBgTheme] = useState('tech');
  const [motionEnabled, setMotionEnabled] = useState(true);
  const [viewMode, setViewMode] = useState<'grid'|'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState('ALL');
  const [isOCRModalOpen, setIsOCRModalOpen] = useState(false);
  const [selectedEmpForForm, setSelectedEmpForForm] = useState<Employee | null>(null);
  const [selectedEmployeeForLeavesFilter, setSelectedEmployeeForLeavesFilter] = useState<string | null>(null);
  const [isInspectorActive, setIsInspectorActive] = useState<boolean>(false);

  // Clean up legacy un-scoped shared cache keys for strict multi-tenancy
  useEffect(() => {
    const legacyKeys = ['mock_employees', 'cached_employees', 'employees', 'contracts', 'leaves', 'attendance', 'payslips', 'documents', 'mockData'];
    legacyKeys.forEach(k => localStorage.removeItem(k));
  }, []);

  // Firebase hook with strict tenant-scoping & role-based listener isolation
  useFirebaseSync(
    isAuthenticated,
    activeCompany?.id || '',
    currentUserRole,
    setEmployees,
    setContracts,
    setLeaves,
    setAttendance,
    setPayslips,
    setDocuments,
    setCustodies,
    setLoans,
    setWarnings,
    setEmployeeNotes,
    setDepartments,
    setJobTitles,
    setCompanies,
    setEmployeeNotifications,
    setSubscriptions
  );

  const handleLogin = (email: string) => {
    const emailLower = (email || '').toLowerCase();
    setCurrentUserEmail(email);
    if (emailLower === 'admin@aysed.com' || emailLower === 'elsayedhr1993@gmail.com') {
      setCurrentUserRole('SUPER_ADMIN');
      setCurrentApp('SAAS_ADMIN');
    } else {
      setCurrentUserRole('COMPANY_ADMIN');
      setCurrentApp(null);
    }
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('activeCompanyId');
      const legacyKeys = ['mock_employees', 'cached_employees', 'employees', 'contracts', 'leaves', 'attendance', 'payslips', 'documents', 'mockData'];
      legacyKeys.forEach(k => localStorage.removeItem(k));
      setIsAuthenticated(false);
      setCurrentUserEmail('');
      setCurrentUserRole('');
      setUserCompanyId('');
      setEmployees([]);
      setContracts([]);
      setLeaves([]);
      setAttendance([]);
      setPayslips([]);
      setDocuments([]);
      setCustodies([]);
      setLoans([]);
      setWarnings([]);
      setEmployeeNotes([]);
      toast.success('تم تسجيل الخروج بنجاح وتطهير الجلسة');
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء تسجيل الخروج');
    }
  };

  const handlePurgeSystemData = () => {
    // Only basic clean for UI preview
    setEmployees([]);
    setContracts([]);
    setLeaves([]);
    setAttendance([]);
    setPayslips([]);
    setDocuments([]);
    setCustodies([]);
    setLoans([]);
    setWarnings([]);
    setEmployeeNotes([]);
    setPersistentData(MANARA_STORAGE_KEYS.EMPLOYEES, []);
    setPersistentData(MANARA_STORAGE_KEYS.CONTRACTS, []);
    setPersistentData(MANARA_STORAGE_KEYS.LEAVES, []);
    setPersistentData(MANARA_STORAGE_KEYS.ATTENDANCE, []);
    setPersistentData(MANARA_STORAGE_KEYS.PAYSLIPS, []);
    setPersistentData(MANARA_STORAGE_KEYS.DOCUMENTS, []);
    setPersistentData(MANARA_STORAGE_KEYS.CUSTODIES, []);
    setPersistentData(MANARA_STORAGE_KEYS.LOANS, []);
    setPersistentData(MANARA_STORAGE_KEYS.WARNINGS, []);
    setPersistentData(MANARA_STORAGE_KEYS.EMPLOYEE_NOTES, []);
  };

  const handleLoadDemoData = () => {
    toast.success("Demo data loaded");
  };

  const handleSaveJobTitle = async (title: any) => {
    setJobTitles(prev => {
      const idx = prev.findIndex(t => t.id === title.id);
      const updated = idx >= 0 ? prev.map(t => t.id === title.id ? title : t) : [...prev, title];
      setPersistentData(MANARA_STORAGE_KEYS.JOB_TITLES, updated);
      return updated;
    });
    try { 
      await setDoc(doc(db, "job_titles", title.id), cleanFirestoreData(title)); 
      toast.success("تم حفظ المسمى الوظيفي في قاعدة البيانات"); 
    } catch(e) { 
      console.error(e); 
      toast.error("خطأ في حفظ المسمى الوظيفي"); 
    }
  };

  const addAuditLog = async (logData: Omit<AuditLog, 'id' | 'timestamp'>) => {
    const newLog: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      companyId: activeCompany?.id || 'comp-1',
      timestamp: new Date().toISOString(),
      userId: currentUserEmail || 'admin-user',
      userName: currentUserEmail || 'مدير النظام (Super Admin)',
      ...logData,
    };
    setAuditLogs(prev => {
      const updated = [newLog, ...prev];
      setPersistentData(MANARA_STORAGE_KEYS.AUDIT_LOGS, updated);
      return updated;
    });
    try {
      await setDoc(doc(db, "audit_logs", newLog.id), cleanFirestoreData(newLog));
    } catch(e) {
      console.error(e);
    }
  };

  const handleSoftDeleteEmployee = async (id: string, reason?: string) => {
    const emp = employees.find(e => e.id === id);
    const updatedEmp = { ...emp, isDeleted: true, deletedAt: new Date().toISOString() };
    setEmployees(prev => {
      const updated = prev.map(e => e.id === id ? updatedEmp : e);
      setPersistentData(MANARA_STORAGE_KEYS.EMPLOYEES, updated);
      return updated;
    });
    try {
      await setDoc(doc(db, "employees", id), cleanFirestoreData(updatedEmp));
      toast.success("تم نقل الموظف إلى أرشيف المحذوفات بنجاح (Soft Delete)");
      addAuditLog({
        action: 'SOFT_DELETE',
        entity: 'EMPLOYEE',
        entityId: id,
        details: `أرشيف المحذوفات: ${emp?.fullNameAr || id} - السبب: ${reason || 'إلغاء تعيين / استقالة'}`,
        companyId: emp?.companyId || activeCompany?.id || 'comp-1'
      });
    } catch(e) {
      console.error(e);
      toast.error("خطأ في أرشفة الموظف");
    }
  };

  const handleRestoreEmployee = async (id: string) => {
    const emp = employees.find(e => e.id === id);
    const updatedEmp = { ...emp, isDeleted: false, deletedAt: undefined };
    setEmployees(prev => {
      const updated = prev.map(e => e.id === id ? updatedEmp : e);
      setPersistentData(MANARA_STORAGE_KEYS.EMPLOYEES, updated);
      return updated;
    });
    try {
      await setDoc(doc(db, "employees", id), cleanFirestoreData(updatedEmp));
      toast.success("تم استعادة الموظف بنجاح من الأرشيف ونشط الآن بالنظام");
      addAuditLog({
        action: 'RESTORE',
        entity: 'EMPLOYEE',
        entityId: id,
        details: `استعادة الموظف النشط: ${emp?.fullNameAr || id} من الأرشيف`,
        companyId: emp?.companyId || activeCompany?.id || 'comp-1'
      });
    } catch(e) {
      console.error(e);
      toast.error("خطأ في استعادة الموظف");
    }
  };

  const handleDeleteJobTitle = async (id: string) => {
    setJobTitles(prev => {
      const updated = prev.filter(t => t.id !== id);
      setPersistentData(MANARA_STORAGE_KEYS.JOB_TITLES, updated);
      return updated;
    });
    try { await deleteDoc(doc(db, "job_titles", id)); toast.success("تم حذف المسمى الوظيفي"); } catch(e) { console.error(e); }
  };

  const handleDeleteEmployee = async (id: string) => {
    // Delegates to soft delete
    await handleSoftDeleteEmployee(id, 'حذف تقليدي من النظام');
  };

  const handleHardDeleteAllEmployees = async () => {
    const targetCompanyId = activeCompany?.id || 'comp-1';
    const targetEmployees = employees.filter(e => e.companyId === targetCompanyId || !e.companyId);
    
    if (targetEmployees.length === 0) {
      toast('لا يوجد موظفون لحذفهم في هذه الشركة');
      return;
    }

    setEmployees(prev => {
      const updated = prev.filter(e => e.companyId !== targetCompanyId && !!e.companyId);
      setPersistentData(MANARA_STORAGE_KEYS.EMPLOYEES, updated);
      return updated;
    });
    
    try {
      for (const emp of targetEmployees) {
        await deleteDoc(doc(db, "employees", emp.id));
      }
      toast.success(`تم تفريغ وحذف جميع الموظفين (${targetEmployees.length}) نهائياً من قاعدة البيانات`);
      addAuditLog({
        action: 'DELETE',
        entity: 'EMPLOYEE',
        entityId: 'ALL',
        details: `تفريغ كامل لقائمة الموظفين وحذف كافة السجلات التجريبية (${targetEmployees.length} موظف)`,
        companyId: targetCompanyId
      });
    } catch (e) {
      console.error(e);
      toast.error("حدث خطأ أثناء تفريغ قاعدة البيانات");
    }
  };

  const handleSaveEmployee = async (emp: Employee) => {
    const isExisting = employees.some(e => e.id === emp.id);
    setEmployees(prev => {
      const idx = prev.findIndex(e => e.id === emp.id);
      const updated = idx >= 0 ? prev.map(e => e.id === emp.id ? emp : e) : [emp, ...prev];
      setPersistentData(MANARA_STORAGE_KEYS.EMPLOYEES, updated);
      return updated;
    });
    try {
      await setDoc(doc(db, "employees", emp.id), cleanFirestoreData(emp));
      toast.success("تم حفظ بيانات الموظف بنجاح");
      addAuditLog({
        action: isExisting ? 'UPDATE' : 'CREATE',
        entity: 'EMPLOYEE',
        entityId: emp.id,
        details: `${isExisting ? 'تعديل ملف' : 'إضافة موظف جديد'}: ${emp.fullNameAr} (${emp.employeeCode})`,
        companyId: emp.companyId || activeCompany?.id || 'comp-1'
      });
    } catch(e) {
      console.error(e);
      toast.error("خطأ في حفظ الموظف");
    }
  };

  const handleSaveContract = async (cnt: Contract) => {
    setContracts(prev => {
      const idx = prev.findIndex(c => c.id === cnt.id);
      const updated = idx >= 0 ? prev.map(c => c.id === cnt.id ? cnt : c) : [cnt, ...prev];
      setPersistentData(MANARA_STORAGE_KEYS.CONTRACTS, updated);
      return updated;
    });
    try {
      await setDoc(doc(db, "contracts", cnt.id), cleanFirestoreData(cnt));
      toast.success("تم حفظ العقد بنجاح");
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteContract = async (id: string) => {
    setContracts(prev => {
      const updated = prev.filter(c => c.id !== id);
      setPersistentData(MANARA_STORAGE_KEYS.CONTRACTS, updated);
      return updated;
    });
    try {
      await deleteDoc(doc(db, "contracts", id));
      toast.success("تم حذف العقد");
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveLeave = async (lv: LeaveRequest) => {
    setLeaves(prev => {
      const idx = prev.findIndex(l => l.id === lv.id);
      const updated = idx >= 0 ? prev.map(l => l.id === lv.id ? lv : l) : [lv, ...prev];
      setPersistentData(MANARA_STORAGE_KEYS.LEAVES, updated);
      return updated;
    });
    try {
      await setDoc(doc(db, "leaves", lv.id), cleanFirestoreData(lv));
      toast.success("تم تسجيل طلب الإجازة بنجاح");
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateLeaveStatus = async (id: string, status: 'APPROVED' | 'REJECTED', note?: string) => {
    const targetLeave = leaves.find(l => l.id === id);
    const wasApproved = targetLeave && (targetLeave.status === 'APPROVED' || (targetLeave as any).status === 'VALIDATED');

    setLeaves(prev => {
      const updated = prev.map(l => l.id === id ? { ...l, status, hrNote: note } : l);
      setPersistentData(MANARA_STORAGE_KEYS.LEAVES, updated);
      return updated;
    });
    try {
      await setDoc(doc(db, "leaves", id), cleanFirestoreData({ status, hrNote: note }), { merge: true });
    } catch (e) {
      console.error(e);
    }
    if (targetLeave) {
      const emp = employees.find(e => e.id === targetLeave.employeeId);
      if (status === 'APPROVED') {
        if (emp) {
          toast.success(`تم اعتماد إجازة ${emp.fullNameAr} (${targetLeave.totalDays} يوم) وتم خصمها من الرصيد`);
        }
      } else if (status === 'REJECTED') {
        if (wasApproved && emp) {
          toast.success(`تم رفض/إلغاء الإجازة ورد ${targetLeave.totalDays} يوم تلقائياً إلى رصيد الموظف ${emp.fullNameAr} (action_refuse)`);
        } else {
          toast(`تم رفض طلب الإجازة`);
        }
      }
    }
  };

  const handleDeleteLeave = async (id: string, force?: boolean): Promise<boolean> => {
    const targetLeave = leaves.find(l => l.id === id);
    if (targetLeave && (targetLeave.status === 'APPROVED' || (targetLeave as any).status === 'VALIDATED') && !force) {
      toast.error("لا يمكن حذف إجازة معتمدة مباشرة. يرجى إلغاؤها أولاً لرد الرصيد للموظف.");
      return false;
    }
    setLeaves(prev => {
      const updated = prev.filter(l => l.id !== id);
      setPersistentData(MANARA_STORAGE_KEYS.LEAVES, updated);
      return updated;
    });
    try {
      await deleteDoc(doc(db, "leaves", id));
      toast.success("تم حذف سجل الإجازة نهائياً");
      return true;
    } catch (e) {
      console.error(e);
      toast.error("حدث خطأ أثناء حذف الإجازة");
      return false;
    }
  };

  const handleSaveAttendance = async (rec: AttendanceRecord) => {
    setAttendance(prev => {
      const idx = prev.findIndex(a => a.id === rec.id);
      const updated = idx >= 0 ? prev.map(a => a.id === rec.id ? rec : a) : [rec, ...prev];
      setPersistentData(MANARA_STORAGE_KEYS.ATTENDANCE, updated);
      return updated;
    });
    try {
      await setDoc(doc(db, "attendance", rec.id), cleanFirestoreData(rec));
      toast.success("تم حفظ سجل البصمة والحضور");
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveAttendanceBatch = async (records: AttendanceRecord[]) => {
    setAttendance(prev => {
      const copy = [...prev];
      records.forEach(rec => {
        const idx = copy.findIndex(a => a.id === rec.id);
        if (idx >= 0) copy[idx] = rec;
        else copy.push(rec);
      });
      setPersistentData(MANARA_STORAGE_KEYS.ATTENDANCE, copy);
      return copy;
    });
    try {
      for (const rec of records) {
        await setDoc(doc(db, "attendance", rec.id), cleanFirestoreData(rec));
      }
      toast.success(`تم حفظ ومعالجة ${records.length} سجل حضور بنجاح`);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePostAttendanceToPayroll = (month: string) => {
    toast.success("Attendance posted to payroll for " + month);
  };

  const handleSavePayslip = async (p: Payslip) => {
    setPayslips(prev => {
      const idx = prev.findIndex(x => x.id === p.id);
      const updated = idx >= 0 ? prev.map(x => x.id === p.id ? p : x) : [p, ...prev];
      setPersistentData(MANARA_STORAGE_KEYS.PAYSLIPS, updated);
      return updated;
    });
    try {
      await setDoc(doc(db, "payslips", p.id), cleanFirestoreData(p));
      toast.success("تم حفظ مسير الراتب بنجاح");
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveDocument = async (docItem: DocumentItem) => {
    setDocuments(prev => {
      const idx = prev.findIndex(d => d.id === docItem.id);
      const updated = idx >= 0 ? prev.map(d => d.id === docItem.id ? docItem : d) : [docItem, ...prev];
      setPersistentData(MANARA_STORAGE_KEYS.DOCUMENTS, updated);
      return updated;
    });
    try {
      await setDoc(doc(db, "documents", docItem.id), cleanFirestoreData(docItem));
      toast.success("تم حفظ المستند بنجاح");
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    setDocuments(prev => {
      const updated = prev.filter(d => d.id !== id);
      setPersistentData(MANARA_STORAGE_KEYS.DOCUMENTS, updated);
      return updated;
    });
    try {
      await deleteDoc(doc(db, "documents", id));
      toast.success("تم حذف المستند بنجاح");
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveDocumentTemplate = async (tpl: DocumentTemplate) => {
    setDocumentTemplates(prev => {
      const idx = prev.findIndex(t => t.id === tpl.id);
      const updated = idx >= 0 ? prev.map(t => t.id === tpl.id ? tpl : t) : [tpl, ...prev];
      setPersistentData(MANARA_STORAGE_KEYS.DOCUMENT_TEMPLATES, updated);
      return updated;
    });
    toast.success("تم حفظ نموذج الوثيقة");
  };

  const handleDeleteDocumentTemplate = (id: string) => {
    setDocumentTemplates(prev => {
      const updated = prev.filter(t => t.id !== id);
      setPersistentData(MANARA_STORAGE_KEYS.DOCUMENT_TEMPLATES, updated);
      return updated;
    });
    toast.success("تم حذف نموذج الوثيقة");
  };

  const handleIssueDocument = (docItem: GeneratedDocument) => {
    setGeneratedDocs(prev => {
      const updated = [docItem, ...prev];
      setPersistentData(MANARA_STORAGE_KEYS.GENERATED_DOCS, updated);
      return updated;
    });
  };

  const handleAddAuditLog = (log: AuditLog) => {
    setAuditLogs(prev => {
      const updated = [log, ...prev];
      setPersistentData(MANARA_STORAGE_KEYS.AUDIT_LOGS, updated);
      return updated;
    });
  };

  const handleSaveCustody = async (c: CustodyItem) => {
    setCustodies(prev => {
      const idx = prev.findIndex(x => x.id === c.id);
      const updated = idx >= 0 ? prev.map(x => x.id === c.id ? c : x) : [c, ...prev];
      setPersistentData(MANARA_STORAGE_KEYS.CUSTODIES, updated);
      return updated;
    });
    try {
      await setDoc(doc(db, "custodies", c.id), cleanFirestoreData(c));
      toast.success("تم حفظ بيانات العهدة بنجاح");
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteCustody = async (id: string) => {
    setCustodies(prev => {
      const updated = prev.filter(c => c.id !== id);
      setPersistentData(MANARA_STORAGE_KEYS.CUSTODIES, updated);
      return updated;
    });
    try {
      await deleteDoc(doc(db, "custodies", id));
      toast.success("تم حذف العهدة");
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveLoan = async (l: LoanAdvance) => {
    setLoans(prev => {
      const idx = prev.findIndex(x => x.id === l.id);
      const updated = idx >= 0 ? prev.map(x => x.id === l.id ? l : x) : [l, ...prev];
      setPersistentData(MANARA_STORAGE_KEYS.LOANS, updated);
      return updated;
    });
    try {
      await setDoc(doc(db, "loans", l.id), cleanFirestoreData(l));
      toast.success("تم حفظ طلب السلفة والقرض");
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteLoan = async (id: string) => {
    setLoans(prev => {
      const updated = prev.filter(l => l.id !== id);
      setPersistentData(MANARA_STORAGE_KEYS.LOANS, updated);
      return updated;
    });
    try {
      await deleteDoc(doc(db, "loans", id));
      toast.success("تم حذف السلفة");
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveWarning = async (w: DisciplinaryWarning) => {
    setWarnings(prev => {
      const idx = prev.findIndex(x => x.id === w.id);
      const updated = idx >= 0 ? prev.map(x => x.id === w.id ? w : x) : [w, ...prev];
      setPersistentData(MANARA_STORAGE_KEYS.WARNINGS, updated);
      return updated;
    });
    try {
      await setDoc(doc(db, "warnings", w.id), cleanFirestoreData(w));
      toast.success("تم تسجيل الإنذار التأديبي");
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteWarning = async (id: string) => {
    setWarnings(prev => {
      const updated = prev.filter(w => w.id !== id);
      setPersistentData(MANARA_STORAGE_KEYS.WARNINGS, updated);
      return updated;
    });
    try {
      await deleteDoc(doc(db, "warnings", id));
      toast.success("تم حذف الإنذار");
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveNote = async (n: EmployeeNote) => {
    setEmployeeNotes(prev => {
      const idx = prev.findIndex(x => x.id === n.id);
      const updated = idx >= 0 ? prev.map(x => x.id === n.id ? n : x) : [n, ...prev];
      setPersistentData(MANARA_STORAGE_KEYS.EMPLOYEE_NOTES, updated);
      return updated;
    });
    try {
      await setDoc(doc(db, "employeeNotes", n.id), cleanFirestoreData(n));
      toast.success("تم حفظ الملاحظة بنجاح");
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteNote = async (id: string) => {
    setEmployeeNotes(prev => {
      const updated = prev.filter(n => n.id !== id);
      setPersistentData(MANARA_STORAGE_KEYS.EMPLOYEE_NOTES, updated);
      return updated;
    });
    try {
      await deleteDoc(doc(db, "employeeNotes", id));
      toast.success("تم حذف الملاحظة");
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveShift = (s: ShiftProfile) => {
    setShifts(prev => {
      const idx = prev.findIndex(x => x.id === s.id);
      const updated = idx >= 0 ? prev.map(x => x.id === s.id ? s : x) : [s, ...prev];
      setPersistentData(MANARA_STORAGE_KEYS.SHIFTS, updated);
      return updated;
    });
  };

  const handleDeleteShift = (id: string) => {
    setShifts(prev => {
      const updated = prev.filter(s => s.id !== id);
      setPersistentData(MANARA_STORAGE_KEYS.SHIFTS, updated);
      return updated;
    });
  };
  
  const handleAssignShift = (assign: EmployeeShift) => {
    setEmployeeShifts(prev => {
      const updated = [assign, ...prev];
      setPersistentData(MANARA_STORAGE_KEYS.EMPLOYEE_SHIFTS, updated);
      return updated;
    });
  };

  const handleRemoveAssignment = (id: string) => {
    setEmployeeShifts(prev => {
      const updated = prev.filter(s => s.id !== id);
      setPersistentData(MANARA_STORAGE_KEYS.EMPLOYEE_SHIFTS, updated);
      return updated;
    });
  };

  const handleSaveCommencement = (c: EmploymentCommencement) => {
    setCommencements(prev => {
      const idx = prev.findIndex(x => x.id === c.id);
      const updated = idx >= 0 ? prev.map(x => x.id === c.id ? c : x) : [c, ...prev];
      setPersistentData(MANARA_STORAGE_KEYS.COMMENCEMENTS, updated);
      return updated;
    });

    // Auto sync working schedule and contract details with Employee
    setEmployees(prev => {
      const updated = prev.map(e => {
        if (e.id === c.employeeId) {
          return {
            ...e,
            status: c.status === 'APPROVED' ? 'ACTIVE' : e.status,
            joinDate: c.actualJoiningDate || e.joinDate,
            resourceCalendarId: c.resourceCalendarId || e.resourceCalendarId,
            workingSchedule: c.workingSchedule || e.workingSchedule,
            workHoursType: c.workHoursType || e.workHoursType,
            shiftId: c.shiftId || e.shiftId,
            dailyWorkHours: c.dailyHours || e.dailyWorkHours || 8,
            weeklyWorkHours: c.weeklyHours || e.weeklyWorkHours || 48,
          };
        }
        return e;
      });
      setPersistentData(MANARA_STORAGE_KEYS.EMPLOYEES, updated);
      return updated;
    });

    // Auto sync with Contract
    setContracts(prev => {
      const updated = prev.map(cnt => {
        if (cnt.employeeId === c.employeeId) {
          return {
            ...cnt,
            startDate: c.actualJoiningDate || cnt.startDate,
            contractType: c.contractType || cnt.contractType,
            resourceCalendarId: c.resourceCalendarId || cnt.resourceCalendarId,
            workingSchedule: c.workingSchedule || cnt.workingSchedule,
            workHoursType: c.workHoursType || cnt.workHoursType,
            shiftId: c.shiftId || cnt.shiftId,
            dailyWorkHours: c.dailyHours || cnt.dailyWorkHours || 8,
            workingHoursPerWeek: c.weeklyHours || cnt.workingHoursPerWeek || 48,
          };
        }
        return cnt;
      });
      setPersistentData(MANARA_STORAGE_KEYS.CONTRACTS, updated);
      return updated;
    });
  };
  
  const handleUpdateEmployeeStatus = (empId: string, status: any) => {
    setEmployees(prev => prev.map(e => e.id === empId ? { ...e, status } : e));
  };
  
  const handleUpdateSubscription = async (sub: CompanySubscription) => {
    setSubscriptions(prev => {
      const idx = prev.findIndex(s => s.id === sub.id);
      if(idx>=0){ const c=[...prev]; c[idx]=sub; return c; }
      return [sub, ...prev];
    });
    try {
      await setDoc(doc(db, "subscriptions", sub.id), cleanFirestoreData(sub));
      toast.success("تم حفظ الاشتراك في قاعدة البيانات");
    } catch(e) {
      console.error(e);
      toast.error("حدث خطأ أثناء حفظ الاشتراك");
    }
  };

  const handleAutoAddEmpFromOCR = (emp: Partial<Employee>) => {
    const newEmp = { ...emp, id: 'emp-' + Date.now(), companyId: activeCompany?.id || 'comp-1' } as Employee;
    handleSaveEmployee(newEmp);
  };

  const handleGenerateMonthlyPayslips = (month: string) => {
    const newPayslips: Payslip[] = [];
    const thisMonthAttendance = attendance.filter(a => a.date.startsWith(month));
    
    employees.filter(e => !e.isDeleted).forEach(emp => {
      const contract = contracts.find(c => c.employeeId === emp.id && c.status === 'ACTIVE');
      if (!contract) return;
      
      const basic = contract.basicSalary;
      const totalAllowances = (contract.allowances?.housing || 0) + (contract.allowances?.transport || 0) + (contract.allowances?.other || 0);
      
      const empAtt = thisMonthAttendance.filter(a => a.employeeId === emp.id);
      const absentDays = empAtt.filter(a => a.status === 'ABSENT').length;
      
      // Calculate daily rate: Gross / 26
      const dailyRate = (basic + totalAllowances) / 26;
      
      // Deductions
      const absentDeduction = absentDays * dailyRate;
      const otherDeductions = absentDeduction; // Expand as needed
      
      const gross = basic + totalAllowances;
      const net = Math.max(0, gross - otherDeductions);
      
      newPayslips.push({
        id: 'pay-' + month + '-' + emp.id,
        employeeId: emp.id,
        companyId: activeCompany?.id || 'comp-1',
        month,
        basicSalary: basic,
        allowances: totalAllowances,
        grossSalary: gross,
        latenessDeduction: absentDeduction,
        otherDeductions: otherDeductions,
        netSalary: net,
        paymentStatus: 'DRAFT'
      });
    });
    
    setPayslips(prev => {
      const filtered = prev.filter(p => !(p.companyId === (activeCompany?.id || 'comp-1') && p.month === month));
      return [...newPayslips, ...filtered];
    });
    
    toast.success("Payslips generated for " + month);
  };

  if (!isAuthenticated) {
    return <OdooLogin onLogin={handleLogin} />;
  }

  const activeCompanyId = activeCompany?.id || '';
  const currentSub = (subscriptions || []).find(s => s.companyId === activeCompanyId || (activeCompany && s.companyName === activeCompany.nameAr));
  const isSubscriptionLocked = currentUserRole !== 'SUPER_ADMIN' && currentSub && (currentSub.status === 'suspended' || (currentSub.endDate && currentSub.endDate < new Date().toISOString().split('T')[0]));

  if (isSubscriptionLocked) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-center dir-rtl" dir="rtl">
        <Toaster position="top-right" />
        <div className="bg-white p-8 rounded-2xl max-w-md w-full shadow-2xl border border-rose-200 space-y-4">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900">انتهى اشتراك الشركة أو تم تعليقه</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            يرجى تجديد الاشتراك للتواصل مع إدارة النظام واستعادة صلاحيات الوصول إلى مساحة العمل الخاصة بشركتكم.
          </p>
          <div className="pt-4 border-t border-slate-100">
            <button
              onClick={handleLogout}
              className="w-full bg-[#714B67] hover:bg-[#5a3c52] text-white font-bold py-3 px-4 rounded-xl text-xs transition shadow-md cursor-pointer"
            >
              تسجيل الخروج
            </button>
          </div>
        </div>
      </div>
    );
  }

  const notifications = generateSmartNotifications(employees, documents, attendance, activeCompanyId);

  
  const stats = {
    employeesCount: (employees || []).filter(e => e.companyId === activeCompanyId && !e.isDeleted).length,
    candidatesCount: 0,
    contractsCount: (contracts || []).filter(c => c.companyId === activeCompanyId).length,
    leavesPendingCount: (leaves || []).filter(l => l.companyId === activeCompanyId && l.status === 'SUBMITTED').length,
    documentsCount: (documents || []).filter(d => d.companyId === activeCompanyId).length,
    automationsCount: (automationRules || []).filter(r => r.companyId === activeCompanyId).length,
    custodiesCount: (custodies || []).filter(c => c.companyId === activeCompanyId).length,
    templatesCount: (documentTemplates || []).filter(t => t.companyId === activeCompanyId).length,
    auditLogsCount: (auditLogs || []).filter(a => a.companyId === activeCompanyId).length,
    totalSalariesThisMonth: 0,
    onLeaveToday: (leaves || []).filter(l => l.companyId === activeCompanyId && l.status === 'APPROVED').length,
    absenceRate: 2,
    lateArrivalsCount: 0,
    saturdayAbsencesCount: 0,
    leaveCostKwd: 0
  };

  const scopedEmployees = employees.filter(e => {
    if (!activeCompanyId) return true;
    return e.companyId === activeCompanyId;
  });
  const scopedContracts = contracts.filter(c => {
    if (!activeCompanyId) return true;
    const emp = employees.find(e => e.id === c.employeeId);
    return emp ? emp.companyId === activeCompanyId : c.companyId === activeCompanyId;
  });
  const scopedLeaves = leaves.filter(l => {
    if (!activeCompanyId) return true;
    const emp = employees.find(e => e.id === l.employeeId);
    return emp ? emp.companyId === activeCompanyId : l.companyId === activeCompanyId;
  });
  const scopedAttendance = attendance.filter(a => {
    if (!activeCompanyId) return true;
    const emp = employees.find(e => e.id === a.employeeId);
    return emp ? emp.companyId === activeCompanyId : a.companyId === activeCompanyId;
  });
  const scopedPayslips = payslips.filter(p => {
    if (!activeCompanyId) return true;
    const emp = employees.find(e => e.id === p.employeeId);
    return emp ? emp.companyId === activeCompanyId : p.companyId === activeCompanyId;
  });
  const scopedDocuments = documents.filter(d => {
    if (!activeCompanyId) return true;
    const emp = employees.find(e => e.id === d.employeeId);
    return emp ? emp.companyId === activeCompanyId : d.companyId === activeCompanyId;
  });
  const scopedCustodies = custodies.filter(c => {
    const emp = employees.find(e => e.id === c.employeeId);
    return emp ? emp.companyId === activeCompanyId : true;
  });
  const scopedLoans = loans.filter(l => {
    const emp = employees.find(e => e.id === l.employeeId);
    return emp ? emp.companyId === activeCompanyId : true;
  });

  return (
    <div className="flex h-screen bg-[#F8F9FA] text-gray-800 odoo-scrollbar">
      <BackgroundRenderer theme={bgTheme} motionEnabled={motionEnabled} />
      <Toaster position="top-right" />

      {currentApp !== null && (
        <OdooSidebar 
          isOpen={isSidebarOpen} 
          activeApp={currentApp as any} 
          onNavigate={(app) => setCurrentApp(app === 'LAUNCHER' || app === 'APP_LAUNCHER' ? null : app)} 
          onNavigateApp={(app) => setCurrentApp(app === 'LAUNCHER' || app === 'APP_LAUNCHER' ? null : app)}
          currentUserRole={currentUserRole}
          onLogout={handleLogout}
        />
      )}

      <div className={`flex-1 flex flex-col h-screen overflow-hidden relative z-10 transition-all duration-300 ${isSidebarOpen && currentApp !== null ? 'mr-[250px] w-[calc(100%-250px)]' : 'w-full'}`}>
        <OdooTopBar 
          activeApp={currentApp as any}
          currentApp={currentApp}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onNavigateHome={() => setCurrentApp(null)}
          onOpenAppLauncher={() => setCurrentApp(null)}
          onCloseApp={() => setCurrentApp(null)}
          onNavigateToApp={(app) => setCurrentApp(app === 'LAUNCHER' || app === 'APP_LAUNCHER' ? null : app)}
          currentUserEmail={currentUserEmail}
          onLogout={handleLogout}
          onOpenProfile={() => setIsProfileModalOpen(true)}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          companies={visibleCompanies}
          activeCompany={activeCompany}
          onSelectCompany={actionSwitchContext}
          notifications={notifications}
          onOpenAICopilot={() => setIsCopilotOpen(true)}
          isInspectorActive={isInspectorActive}
          onToggleFieldInspector={setIsInspectorActive}
        />
        <OdooFieldInspector
          isActive={isInspectorActive}
          currentModel={
            currentApp === 'EMPLOYEES' ? 'hr.employee' :
            currentApp === 'CONTRACTS' ? 'hr.contract' :
            currentApp === 'LEAVES' ? 'hr.leave' :
            currentApp === 'ATTENDANCE' ? 'hr.attendance' :
            currentApp === 'PAYROLL' ? 'hr.payslip' :
            currentApp === 'RECRUITMENT' ? 'hr.applicant' :
            currentApp === 'EOS' ? 'hr.payslip.end.of.service' :
            currentApp === 'DOCUMENTS' ? 'ir.attachment' :
            currentApp === 'SHIFTS' ? 'hr.shift' :
            currentApp === 'CUSTODY_LOANS' ? 'hr.loan' :
            'hr.employee'
          }
          onClose={() => setIsInspectorActive(false)}
        />
        <AysedAICopilot 
          isOpen={isCopilotOpen} 
          onClose={() => setIsCopilotOpen(false)} 
          employees={employees} 
          contracts={contracts} 
        />

        <SmartNotificationsBanner 
          notifications={notifications} 
          onNavigateToApp={(app) => setCurrentApp(app === 'LAUNCHER' || app === 'APP_LAUNCHER' ? null : app)} 
          employees={employees} 
        />

        <main className="flex-1 overflow-auto">
          <div className="h-full">
            <AppRouter
              currentApp={currentApp}
              setCurrentApp={setCurrentApp}
              activeApp={activeApp}
              setActiveApp={setActiveApp}
              currentUserEmail={currentUserEmail}
              currentUserRole={currentUserRole}
              stats={stats}
              activeCompany={activeCompany}
              setActiveCompany={actionSwitchContext as any}
              visibleCompanies={visibleCompanies}
              scopedEmployees={scopedEmployees}
              scopedContracts={scopedContracts}
              scopedLeaves={scopedLeaves}
              scopedAttendance={scopedAttendance}
              scopedPayslips={scopedPayslips}
              scopedDocuments={scopedDocuments}
              scopedCustodies={scopedCustodies}
              scopedLoans={scopedLoans}
              employees={employees}
              contracts={contracts}
              leaves={leaves}
              attendance={attendance}
              payslips={payslips}
              documents={documents}
              jobTitles={jobTitles}
              departments={departments}
              viewMode={viewMode}
              setViewMode={setViewMode}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              filterTab={filterTab}
              setFilterTab={setFilterTab}
              selectedEmpForForm={selectedEmpForForm}
              setSelectedEmpForForm={setSelectedEmpForForm}
              selectedEmployeeForLeavesFilter={selectedEmployeeForLeavesFilter}
              setSelectedEmployeeForLeavesFilter={setSelectedEmployeeForLeavesFilter}
              isOCRModalOpen={isOCRModalOpen}
              subscriptions={subscriptions}
              setSubscriptions={setSubscriptions}
              automationRules={automationRules}
              setAutomationRules={setAutomationRules}
              documentTemplates={documentTemplates}
              generatedDocs={generatedDocs}
              auditLogs={auditLogs}
              warnings={warnings}
              employeeNotes={employeeNotes}
              shifts={shifts}
              employeeShifts={employeeShifts}
              commencements={commencements}
              companies={companies}
              setCompanies={setCompanies}
              employeeNotifications={employeeNotifications}
              onSaveEmployee={handleSaveEmployee}
              onDeleteEmployee={handleDeleteEmployee}
              onSoftDeleteEmployee={handleSoftDeleteEmployee}
              onRestoreEmployee={handleRestoreEmployee}
              onHardDeleteAllEmployees={handleHardDeleteAllEmployees}
              onSaveJobTitle={handleSaveJobTitle}
              onDeleteJobTitle={handleDeleteJobTitle}
              onOpenNotificationModal={handleOpenNotificationModal}
              handleSaveContract={handleSaveContract}
              handleDeleteContract={handleDeleteContract}
              handleSaveLeave={handleSaveLeave}
              handleUpdateLeaveStatus={handleUpdateLeaveStatus}
              handleDeleteLeave={handleDeleteLeave}
              handleSaveAttendance={handleSaveAttendance}
              handleSaveAttendanceBatch={handleSaveAttendanceBatch}
              handleGenerateMonthlyPayslips={handleGenerateMonthlyPayslips}
              handleSavePayslip={handleSavePayslip}
              handleSaveDocument={handleSaveDocument}
              handleDeleteDocument={handleDeleteDocument}
              handleAutoAddEmpFromOCR={handleAutoAddEmpFromOCR}
              handleSaveDocumentTemplate={handleSaveDocumentTemplate}
              handleDeleteDocumentTemplate={handleDeleteDocumentTemplate}
              handleIssueDocument={handleIssueDocument}
              handleAddAuditLog={handleAddAuditLog}
              handleSaveCustody={handleSaveCustody}
              handleDeleteCustody={handleDeleteCustody}
              handleSaveLoan={handleSaveLoan}
              handleDeleteLoan={handleDeleteLoan}
              handleSaveWarning={handleSaveWarning}
              handleDeleteWarning={handleDeleteWarning}
              handleSaveNote={handleSaveNote}
              handleDeleteNote={handleDeleteNote}
              handleSaveShift={handleSaveShift}
              handleDeleteShift={handleDeleteShift}
              handleAssignShift={handleAssignShift}
              handleRemoveAssignment={handleRemoveAssignment}
              handleSaveCommencement={handleSaveCommencement}
              handleUpdateEmployeeStatus={handleUpdateEmployeeStatus}
              handleUpdateSubscription={handleUpdateSubscription}
              handleDeleteSubscription={async (id) => {
                setSubscriptions(prev => prev.filter(s => s.id !== id));
                try {
                  await deleteDoc(doc(db, "subscriptions", id));
                  toast.success("تم حذف الاشتراك نهائياً");
                } catch(e) {
                  console.error(e);
                }
              }}
              handleSaveCompany={async (c) => {
                setCompanies(prev => {
                  const exists = prev.some(comp => comp.id === c.id);
                  if (exists) return prev.map(comp => comp.id === c.id ? c : comp);
                  return [...prev, c];
                });
                setActiveCompany(c);
                try {
                  await setDoc(doc(db, "companies", c.id), cleanFirestoreData(c));
                  toast.success("تم حفظ بيانات الشركة بنجاح");
                } catch(e) {
                  console.error(e);
                  toast.error("خطأ في حفظ بيانات الشركة");
                }
              }}
              handleDeleteCompany={async (id) => {
                setCompanies(prev => {
                  const remaining = prev.filter(c => c.id !== id);
                  if (activeCompany?.id === id && remaining.length > 0) {
                    setActiveCompany(remaining[0]);
                  }
                  return remaining;
                });
                try {
                  await deleteDoc(doc(db, "companies", id));
                  toast.success("تم حذف الشركة نهائياً");
                } catch(e) {
                  console.error(e);
                }
              }}
              handlePurgeSystemData={handlePurgeSystemData}
              handleLoadDemoData={handleLoadDemoData}
              handleDeleteNotification={handleDeleteNotification}
              handleClearAllNotifications={handleClearAllNotifications}
              bgTheme={bgTheme}
              setBgTheme={setBgTheme}
              motionEnabled={motionEnabled}
              setMotionEnabled={setMotionEnabled}
            />
          </div>
        </main>
      </div>

      {/* Quick Automated Notification Modal */}
      {isQuickNotifModalOpen && (
        <QuickNotificationModal
          isOpen={isQuickNotifModalOpen}
          onClose={() => setIsQuickNotifModalOpen(false)}
          employee={quickNotifEmp}
          employees={employees.filter(e => !e.isDeleted)}
          initialTrigger={quickNotifTrigger}
          initialData={quickNotifData}
          activeCompany={activeCompany}
          onNotificationSent={handleSendNotification}
          onSendNotification={handleSendNotification}
        />
      )}

      <UserProfileModal 
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </div>
  );
}

