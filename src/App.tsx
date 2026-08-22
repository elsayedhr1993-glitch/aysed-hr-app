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
import { SuperAdminDashboard } from './pages/SuperAdminDashboard';
import { SuperAdminPortal } from './pages/SuperAdminPortal';

import { 
  Company, Employee, Contract, LeaveRequest, 
  AttendanceRecord, Payslip, DocumentItem, AutomationRule, 
  CustodyItem, LoanAdvance, DisciplinaryWarning, EmployeeNote, DocumentTemplate, 
  GeneratedDocument, AuditLog, ShiftProfile, EmployeeShift, 
  EmploymentCommencement, CompanySubscription, JobTitle, Department, EmployeeNotification, DailyMovement
} from './types';
import { initialCompanies, initialDepartments, initialJobTitles, initialEmployees, initialContracts } from './data/initialData';
import { useFirebaseSync } from './hooks/useFirebaseSync';
import { generateSmartNotifications } from './utils/notificationsEngine';
import toast, { Toaster } from 'react-hot-toast';
import { auth, db, cleanFirestoreData, isTenantPurged } from './lib/firebase';
import { doc, setDoc, deleteDoc, getDoc, getDocs, collection } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { MANARA_STORAGE_KEYS, getPersistentData, setPersistentData } from './utils/persistentStorage';
import { calculateUnpaidLeaveDeductionRule, computeFinalPayslipSalary } from './services/salaryRulesService';
import { ensureDefaultLeaveTypes } from './services/seedLeaveTypes';
import { supabase } from './lib/supabase';
import { HRProvider, useHR } from './context/HRContext';
import { EmployeeProvider, StoreContext, useStoreContext, useEmployeeContext } from './context/EmployeeContext';
import { LeaveService, runAutomatedLeaveAccrual, getAccrualMonthNameAr } from './services/leaveService';
export { HRProvider, useHR, EmployeeProvider, StoreContext, useStoreContext, useEmployeeContext, LeaveService };

function MainActionManager() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState('');
  const [userCompanyId, setUserCompanyId] = useState('');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [portalViewMode, setPortalViewMode] = useState<'superadmin' | 'apps'>('superadmin');
  
  // Primary State Controller: Single state variable to navigate screens without conflict
  const [currentApp, setCurrentApp] = useState<string | null>(null);
  const activeApp = currentApp || 'LAUNCHER';
  const setActiveApp = (app: string | null) => setCurrentApp(app === 'LAUNCHER' || app === 'APP_LAUNCHER' ? null : app);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);

  const [companies, setCompanies] = useState<Company[]>(() => {
    try {
      const savedReg = localStorage.getItem('registered_companies_v1');
      const map = new Map<string, Company>();
      initialCompanies.forEach(c => {
        if (!isTenantPurged(c.id) && !isTenantPurged(c.nameAr) && !isTenantPurged(c.nameEn)) {
          map.set(c.id, c);
        }
      });
      if (savedReg) {
        const parsed = JSON.parse(savedReg);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsed.forEach((c: any) => {
            if (c && c.id && !isTenantPurged(c.id) && !isTenantPurged(c.nameAr) && !isTenantPurged(c.nameEn)) {
              const existing = map.get(c.id);
              if (existing) {
                map.set(c.id, { ...existing, ...c });
              } else {
                map.set(c.id, c);
              }
            }
          });
        }
      }
      const list = Array.from(map.values());
      return list.length > 0 ? list : [initialCompanies[0]];
    } catch (e) {}
    return initialCompanies.filter(c => !isTenantPurged(c.id) && !isTenantPurged(c.nameAr));
  });

  useEffect(() => {
    const handleCompaniesChanged = (e: any) => {
      setCompanies(prev => {
        const remaining = prev.filter(c => !isTenantPurged(c.id) && !isTenantPurged(c.nameAr) && !isTenantPurged(c.nameEn));
        return remaining.length > 0 ? remaining : [initialCompanies[0]];
      });
    };
    window.addEventListener('aysed_companies_changed', handleCompaniesChanged);
    return () => window.removeEventListener('aysed_companies_changed', handleCompaniesChanged);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('registered_companies_v1', JSON.stringify(companies));
    } catch (e) {}
    setPersistentData(MANARA_STORAGE_KEYS.COMPANIES, companies, MANARA_STORAGE_KEYS.TENANTS);
  }, [companies]);

  const [activeCompany, setActiveCompany] = useState<Company>(() => {
    const saved = localStorage.getItem('activeCompanyId');
    const existingCompanies = getPersistentData<Company[]>(MANARA_STORAGE_KEYS.COMPANIES, initialCompanies, MANARA_STORAGE_KEYS.TENANTS);
    if (saved && saved !== 'comp-super-admin') {
      const found = existingCompanies.find(c => c.id === saved) || null;
      if (found) return found;
    }
    const nonAdminComps = existingCompanies.filter(c => c.id !== 'comp-super-admin');
    if (nonAdminComps.length > 0) return nonAdminComps[0];
    return existingCompanies.length > 0 ? existingCompanies[0] : null as any;
  });

  // Data state with persistent localStorage initialization
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const loaded = getPersistentData<Employee[]>(MANARA_STORAGE_KEYS.EMPLOYEES, initialEmployees);
    const map = new Map<string, Employee>();
    initialEmployees.forEach(e => map.set(e.id, e));
    (loaded || []).forEach(e => {
      if (e && e.id) map.set(e.id, e);
    });
    return Array.from(map.values());
  });
  const [jobTitles, setJobTitles] = useState<JobTitle[]>(() => 
    getPersistentData<JobTitle[]>(MANARA_STORAGE_KEYS.JOB_TITLES, initialJobTitles)
  );
  const [departments, setDepartments] = useState<Department[]>(() => 
    getPersistentData<Department[]>(MANARA_STORAGE_KEYS.DEPARTMENTS, initialDepartments)
  );
  const [contracts, setContracts] = useState<Contract[]>(() => {
    const loaded = getPersistentData<Contract[]>(MANARA_STORAGE_KEYS.CONTRACTS, initialContracts);
    const map = new Map<string, Contract>();
    initialContracts.forEach(c => map.set(c.id, c));
    (loaded || []).forEach(c => {
      if (c && c.id) map.set(c.id, c);
    });
    return Array.from(map.values());
  });
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
  const [subscriptions, setSubscriptions] = useState<CompanySubscription[]>(() => {
    const loaded = getPersistentData<CompanySubscription[]>(MANARA_STORAGE_KEYS.SUBSCRIPTIONS, []);
    return loaded;
  });
  
  // Automated Employee Notifications State
  const [employeeNotifications, setEmployeeNotifications] = useState<EmployeeNotification[]>(() => 
    getPersistentData<EmployeeNotification[]>(MANARA_STORAGE_KEYS.EMPLOYEE_NOTIFICATIONS, [])
  );
  const [dailyMovements, setDailyMovements] = useState<DailyMovement[]>(() => 
    getPersistentData<DailyMovement[]>(MANARA_STORAGE_KEYS.DAILY_MOVEMENTS, [])
  );

  // Quick Notification Modal State
  const [isQuickNotifModalOpen, setIsQuickNotifModalOpen] = useState(false);
  const [quickNotifEmp, setQuickNotifEmp] = useState<Employee | null>(null);
  const [quickNotifTrigger, setQuickNotifTrigger] = useState<any>('HR_ACTION_REQUIRED');
  const [quickNotifData, setQuickNotifData] = useState<any>(null);

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

  useEffect(() => {
    toast.dismiss();
    ensureDefaultLeaveTypes(supabase);
  }, []);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsAuthenticated(true);
        setCurrentUserEmail(user.email || '');
        const userEmailLower = (user.email || '').toLowerCase();
        if (userEmailLower === 'admin@aysed.com' || userEmailLower === 'elsayedhr1993@gmail.com') {
          setCurrentUserRole('SUPER_ADMIN');
          setPortalViewMode('superadmin');
          setCurrentApp(null);
          
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
            let foundCompanyId = '';
            let assignedRole = 'COMPANY_ADMIN';

            // 1. Direct tenant resolution from email / phone credentials
            if (userEmailLower.includes('666968182') || userEmailLower.includes('elite')) {
              foundCompanyId = 'comp-elite';
            } else if (userEmailLower.includes('66968180') || userEmailLower.includes('fanar')) {
              foundCompanyId = 'comp-fanar';
            } else if (userEmailLower.includes('almanar') || userEmailLower.includes('manar') || userEmailLower.includes('99112233')) {
              foundCompanyId = 'comp-almanar';
            }

            // 2. Check Firestore userDoc
            if (!foundCompanyId) {
              const userDoc = await getDoc(doc(db, 'users', user.uid));
              if (userDoc.exists()) {
                const data = userDoc.data();
                assignedRole = data.role || 'COMPANY_ADMIN';
                if (data.companyId && data.companyId !== 'comp-super-admin') {
                  foundCompanyId = data.companyId;
                }
              }
            }

            // 3. Check subscriptions collection by email
            if (!foundCompanyId) {
              try {
                const subsSnap = await getDocs(collection(db, 'subscriptions'));
                subsSnap.forEach(subDoc => {
                  const subData = subDoc.data();
                  if ((subData.email || '').toLowerCase() === userEmailLower && subData.companyId && subData.companyId !== 'comp-super-admin') {
                    foundCompanyId = subData.companyId;
                  }
                });
              } catch (err) {}
            }

            // 4. Check local subscriptions
            if (!foundCompanyId) {
              const localSubs = JSON.parse(localStorage.getItem('aysed_saved_subscriptions') || '[]');
              const matchedSub = localSubs.find((s: any) => (s.email || '').toLowerCase() === userEmailLower);
              if (matchedSub && matchedSub.companyId && matchedSub.companyId !== 'comp-super-admin') {
                foundCompanyId = matchedSub.companyId;
              }
            }

            setCurrentUserRole(assignedRole);
            if (assignedRole === 'SUPER_ADMIN') {
              setPortalViewMode('superadmin');
              setCurrentApp(null);
            } else {
              setPortalViewMode('apps');
              if (assignedRole === 'EMPLOYEE') {
                setCurrentApp('ATTENDANCE');
              } else {
                setCurrentApp(null);
              }
            }

            if (foundCompanyId) {
              setUserCompanyId(foundCompanyId);
              localStorage.setItem('activeCompanyId', foundCompanyId);
              const foundCompObj = companies.find(c => c.id === foundCompanyId) || initialCompanies.find(c => c.id === foundCompanyId);
              if (foundCompObj) {
                setActiveCompany(foundCompObj);
                setCompanies(prev => prev.some(c => c.id === foundCompObj.id) ? prev : [...prev, foundCompObj]);
              }
              setDoc(doc(db, 'users', user.uid), {
                email: userEmailLower,
                role: assignedRole,
                companyId: foundCompanyId,
                lastLogin: new Date().toISOString()
              }, { merge: true }).catch(() => {});
            } else {
              // Assign a dedicated new unique company ID for this new company admin
              const newCompId = 'comp-' + Date.now();
              const newCompName = (user.email || 'شركة جديدة').split('@')[0];
              foundCompanyId = newCompId;
              setUserCompanyId(foundCompanyId);
              localStorage.setItem('activeCompanyId', foundCompanyId);

              // Create company record in Firestore & local storage
              const newCompanyDoc = {
                id: newCompId,
                nameAr: `شركة ${newCompName}`,
                nameEn: `${newCompName} Company`,
                isActive: true,
                industry: 'عام',
                subscriptionPlan: 'Monthly',
                settings: {}
              };
              setDoc(doc(db, 'companies', newCompId), newCompanyDoc).catch(() => {});
              setActiveCompany(newCompanyDoc as any);
              
              setDoc(doc(db, 'users', user.uid), {
                email: userEmailLower,
                role: 'COMPANY_ADMIN',
                companyId: foundCompanyId,
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString()
              }, { merge: true }).catch(() => {});
            }
          } catch(e) {
            console.error("Error fetching user data", e);
            setCurrentUserRole('COMPANY_ADMIN');
            setPortalViewMode('apps');
            setCurrentApp(null);
          }
        }
      } else {
        setIsAuthenticated(false);
        setCurrentUserEmail('');
        setCurrentUserRole('');
        setUserCompanyId('');
        setPortalViewMode('superadmin');
      }
    });
    return () => unsubscribe();
  }, []);

  // Toggle aysed_owner class on body based on Super Admin role
  useEffect(() => {
    if (currentUserRole === 'SUPER_ADMIN') {
      document.body.classList.add('aysed_owner');
    } else {
      document.body.classList.remove('aysed_owner');
    }
  }, [currentUserRole]);

  // Keep activeCompany up to date with the companies list
  useEffect(() => {
    if (companies.length > 0) {
      setActiveCompany(prev => {
        if (currentUserRole === 'SUPER_ADMIN') {
          const adminComp = companies.find(c => c.id === 'comp-super-admin') || companies[0];
          const storedId = localStorage.getItem('activeCompanyId');
          // If stored company exists and was explicitly set, find it; otherwise default to adminComp
          if (storedId) {
            const found = companies.find(c => c.id === storedId);
            if (found) return found;
          }
          localStorage.setItem('activeCompanyId', adminComp.id);
          return adminComp;
        }

        const targetId = userCompanyId || (currentUserRole === 'SUPER_ADMIN' ? localStorage.getItem('activeCompanyId') : null) || prev?.id;
        const found = companies.find(c => c.id === targetId) || initialCompanies.find(c => c.id === targetId);
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
  }, [companies, userCompanyId, currentUserRole]);

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
  useEffect(() => { setPersistentData(MANARA_STORAGE_KEYS.DAILY_MOVEMENTS, dailyMovements); }, [dailyMovements]);

  // ضمان جلب البيانات وعدم فراغها أبداً (Fallback Seeding)
  useEffect(() => {
    if (!employees || employees.length < 19) {
      setEmployees(initialEmployees);
    }
    if (!contracts || contracts.length < 19) {
      setContracts(initialContracts);
    }
    if (!departments || departments.length === 0) {
      setDepartments(initialDepartments);
    }
    if (!jobTitles || jobTitles.length === 0) {
      setJobTitles(initialJobTitles);
    }
  }, []);

  // Automated Monthly Leave Accrual Engine (محرك الاستحقاق والترحيل الآلي لرصيد الإجازات)
  // Adds 2.5 days to each active employee's leave balance and prevents duplicate runs via lastAccrualDate check
  React.useEffect(() => {
    if (!employees || employees.length === 0) return;

    const accrualStatus = LeaveService.checkAccrualStatus(employees);
    if (accrualStatus.pendingCount > 0) {
      const result = LeaveService.processMonthlyLeaveAccrual(employees);
      if (result.hasRun && result.accruedCount > 0) {
        setEmployees(result.updatedEmployees);
        setPersistentData(MANARA_STORAGE_KEYS.EMPLOYEES, result.updatedEmployees);
        
        // Sync to Firestore for accrued employees
        result.updatedEmployees.forEach(emp => {
          const log = result.logs.find(l => l.employeeId === emp.id && l.status === 'ACCRUED');
          if (log) {
            try {
              setDoc(doc(db, "employees", emp.id), cleanFirestoreData(emp), { merge: true });
            } catch (err) {
              console.error("Firestore sync notice for leave accrual:", err);
            }
          }
        });

        const monthName = getAccrualMonthNameAr();
        toast.success(
          `✨ تم ترحيل واستحقاق رصيد الإجازات الشهري التلقائي (+2.5 يوم) لـ ${result.accruedCount} موظف لشهر ${monthName}`,
          { id: 'automated-leave-accrual-toast', duration: 5000 }
        );
      }
    }
  }, [employees?.length]);

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

  const adminWorkspaceComp = companies.find(c => c.id === 'comp-super-admin') || companies[0];
  const visibleCompanies = currentUserRole === 'SUPER_ADMIN'
    ? companies 
    : (activeCompany ? [activeCompany] : (userCompanyId ? companies.filter(c => c.id === userCompanyId) : companies));

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
      setPortalViewMode('superadmin');
      setCurrentApp(null);
    } else {
      setCurrentUserRole('COMPANY_ADMIN');
      setPortalViewMode('apps');
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

  const handlePurgeSystemData = async () => {
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

    // If approved, automatically sync attendance days to ON_LEAVE
    if (lv.status === 'APPROVED' && lv.leaveType !== 'HOURLY_PERMISSION') {
      try {
        const start = new Date(lv.startDate);
        const end = new Date(lv.endDate);
        const newAttRecords: AttendanceRecord[] = [];
        
        let curr = new Date(start);
        while (curr <= end) {
          const dateStr = curr.toISOString().split('T')[0];
          newAttRecords.push({
            id: `att-${lv.employeeId}-${dateStr}`,
            employeeId: lv.employeeId,
            companyId: lv.companyId || activeCompany?.id || 'comp-1',
            date: dateStr,
            checkIn: '—',
            checkOut: '—',
            workHours: 0,
            overtimeHours: 0,
            status: 'ON_LEAVE',
            latenessMinutes: 0,
          });
          curr.setDate(curr.getDate() + 1);
        }

        setAttendance(prev => {
          const map = new Map(prev.map(a => [a.id, a]));
          newAttRecords.forEach(r => map.set(r.id, r));
          const updated = Array.from(map.values());
          setPersistentData(MANARA_STORAGE_KEYS.ATTENDANCE, updated);
          return updated;
        });
      } catch (err) {
        console.error("Attendance sync notice:", err);
      }
    }

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

    if (targetLeave && status === 'APPROVED' && targetLeave.leaveType !== 'HOURLY_PERMISSION') {
      try {
        const start = new Date(targetLeave.startDate);
        const end = new Date(targetLeave.endDate);
        const newAttRecords: AttendanceRecord[] = [];
        
        let curr = new Date(start);
        while (curr <= end) {
          const dateStr = curr.toISOString().split('T')[0];
          newAttRecords.push({
            id: `att-${targetLeave.employeeId}-${dateStr}`,
            employeeId: targetLeave.employeeId,
            companyId: targetLeave.companyId || activeCompany?.id || 'comp-1',
            date: dateStr,
            checkIn: '—',
            checkOut: '—',
            workHours: 0,
            overtimeHours: 0,
            status: 'ON_LEAVE',
            latenessMinutes: 0,
          });
          curr.setDate(curr.getDate() + 1);
        }

        setAttendance(prev => {
          const map = new Map(prev.map(a => [a.id, a]));
          newAttRecords.forEach(r => map.set(r.id, r));
          const updated = Array.from(map.values());
          setPersistentData(MANARA_STORAGE_KEYS.ATTENDANCE, updated);
          return updated;
        });
      } catch (err) {
        console.error("Attendance sync notice:", err);
      }
    }

    try {
      await setDoc(doc(db, "leaves", id), cleanFirestoreData({ status, hrNote: note }), { merge: true });
    } catch (e) {
      console.error(e);
    }
    if (targetLeave) {
      const emp = employees.find(e => e.id === targetLeave.employeeId);
      if (status === 'APPROVED') {
        if (emp) {
          toast.success(`تم اعتماد إجازة ${emp.fullNameAr} (${targetLeave.totalDays} يوم) وتم خصمها من الرصيد ومزامنة سجل الدوام`);
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

  const handleSaveMovement = (movement: DailyMovement) => {
    setDailyMovements(prev => {
      const idx = prev.findIndex(m => m.id === movement.id);
      const updated = idx >= 0 ? prev.map(m => m.id === movement.id ? movement : m) : [movement, ...prev];
      setPersistentData(MANARA_STORAGE_KEYS.DAILY_MOVEMENTS, updated);
      return updated;
    });
    toast.success('تم حفظ الحركة اليومية بنجاح');
  };

  const handleUpdateMovementState = (id: string, state: 'draft' | 'approved' | 'refused') => {
    setDailyMovements(prev => {
      const updated = prev.map(m => m.id === id ? { ...m, state } : m);
      setPersistentData(MANARA_STORAGE_KEYS.DAILY_MOVEMENTS, updated);
      return updated;
    });
    toast.success(`تم تحديث حالة الحركة إلى: ${state === 'approved' ? 'معتمد' : state === 'refused' ? 'مرفوض' : 'مسودة'}`);
  };

  const handleDeleteMovement = (id: string) => {
    setDailyMovements(prev => {
      const updated = prev.filter(m => m.id !== id);
      setPersistentData(MANARA_STORAGE_KEYS.DAILY_MOVEMENTS, updated);
      return updated;
    });
    toast.success('تم حذف الحركة اليومية');
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

    // Update matching company in companies state
    setCompanies(prev => {
      const updated = prev.map(comp => {
        if (comp.id === sub.companyId || (sub.companyName && (comp.nameAr === sub.companyName || comp.nameEn === sub.companyName))) {
          const compUpdated = {
            ...comp,
            nameAr: sub.companyName || comp.nameAr,
            nameEn: sub.companyName || comp.nameEn,
            email: sub.email || comp.email,
            phone: sub.phone || comp.phone,
            planType: sub.planType || comp.planType,
          };
          setDoc(doc(db, "companies", comp.id), cleanFirestoreData(compUpdated), { merge: true }).catch(console.error);
          return compUpdated;
        }
        return comp;
      });
      try {
        localStorage.setItem('registered_companies_v1', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    try {
      await setDoc(doc(db, "subscriptions", sub.id), cleanFirestoreData(sub), { merge: true });
      
      // Update subscription_requests in Firestore if exists
      try {
        const reqSnap = await getDocs(collection(db, 'subscription_requests'));
        reqSnap.forEach(async (d) => {
          const data = d.data();
          if (d.id === sub.id || (data.companyName && data.companyName.toLowerCase() === (sub.companyName || '').toLowerCase())) {
            await setDoc(doc(db, 'subscription_requests', d.id), {
              companyName: sub.companyName,
              requesterName: sub.ownerName,
              email: sub.email,
              phone: sub.phone,
              planType: sub.planType,
              status: sub.status,
              state: sub.status
            }, { merge: true });
          }
        });
      } catch (e) {}

      // Update localStorage
      try {
        const localSubs = JSON.parse(localStorage.getItem('aysed_saved_subscriptions') || '[]');
        const updatedLocal = localSubs.map((s: any) => (s.id === sub.id || s.companyName === sub.companyName) ? { ...s, ...sub } : s);
        if (!updatedLocal.some((s: any) => s.id === sub.id)) {
          updatedLocal.push(sub);
        }
        localStorage.setItem('aysed_saved_subscriptions', JSON.stringify(updatedLocal));
      } catch (e) {}

      toast.success("تم حفظ وتحديث بيانات حساب الاشتراك بنجاح");
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
      const contract = contracts.find(c => c.employeeId === emp.id && (c.status === 'RUNNING' || (c.status as string) === 'ACTIVE'));
      if (!contract) return;
      
      const basic = contract.basicSalary;
      const totalAllowances = (contract.housingAllowance || 0) + (contract.transportAllowance || 0) + (contract.otherAllowance || 0);
      
      const empAtt = thisMonthAttendance.filter(a => a.employeeId === emp.id);
      const absentDays = empAtt.filter(a => a.status === 'ABSENT').length;
      
      // Calculate unpaid leave days (UNPAID leave type or excess unpaid days)
      const empMonthLeaves = leaves.filter(
        l => !l.isHistorical && l.employeeId === emp.id && (l.status === 'APPROVED' || (l.status as any) === 'VALIDATED') &&
        (l.startDate.startsWith(month) || l.endDate.startsWith(month))
      );
      
      const unpaidLeaveDays = empMonthLeaves.reduce((sum, l) => {
        if (l.leaveType === 'UNPAID') return sum + (l.totalDays || 0);
        if (l.excessDays && l.excessDays > 0) return sum + l.excessDays;
        return sum;
      }, 0);

      const totalUnpaidDays = absentDays + unpaidLeaveDays;

      // Apply Kuwait Law rule (basic / 26 * unpaidDays) via salaryRulesService
      const payslipCalc = computeFinalPayslipSalary({
        basicWage: basic,
        allowances: totalAllowances,
        unpaidDays: totalUnpaidDays,
      });
      
      const dailyWage = basic / 26;
      const unpaidLeaveDeduction = parseFloat((unpaidLeaveDays * dailyWage).toFixed(3));
      const absenceDeduction = parseFloat((absentDays * dailyWage).toFixed(3));
      const gross = basic + totalAllowances;
      
      newPayslips.push({
        id: 'pay-' + month + '-' + emp.id,
        employeeId: emp.id,
        companyId: activeCompany?.id || 'comp-1',
        month,
        basicSalary: basic,
        allowances: totalAllowances,
        grossSalary: gross,
        latenessDeduction: absenceDeduction,
        unpaidLeaveDeduction: unpaidLeaveDeduction,
        unpaidLeaveDays: unpaidLeaveDays,
        otherDeductions: 0,
        netSalary: payslipCalc.netSalary,
        paymentStatus: 'DRAFT'
      });
    });
    
    setPayslips(prev => {
      const filtered = prev.filter(p => !(p.companyId === (activeCompany?.id || 'comp-1') && p.month === month));
      return [...newPayslips, ...filtered];
    });
    
    toast.success("تم توليد كشوف الرواتب لشهر " + month + " بنجاح مع تطبيق قاعدة خصم 26 يوم كويتي");
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
    shiftsCount: (shifts || []).filter(s => s.companyId === activeCompanyId).length,
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

  // 1. Isolated Fullscreen Standalone Route for Super Admin (fixed inset-0 z-[9999] isolation)
  if (currentUserRole === 'SUPER_ADMIN' && portalViewMode === 'superadmin') {
    return (
      <main className="w-full min-h-screen bg-[#f4f7f6] aysed-isolated-admin-portal select-none" dir="rtl">
        <Toaster position="top-right" />
        <SuperAdminPortal 
          onSwitchToApps={() => {
            const adminComp = companies.find(c => c.id === 'comp-super-admin') || companies[0];
            setActiveCompany(adminComp);
            setPortalViewMode('apps');
          }}
          currentUserEmail={currentUserEmail}
          onLogout={handleLogout}
          onImpersonateCompany={(companyName) => {
            let found = companies.find(c => 
              (c.nameAr && c.nameAr.toLowerCase().includes(companyName.toLowerCase())) || 
              (c.name && c.name.toLowerCase().includes(companyName.toLowerCase())) || 
              companyName.toLowerCase().includes((c.nameAr || '').toLowerCase()) ||
              companyName.toLowerCase().includes((c.name || '').toLowerCase())
            );

            if (!found) {
              try {
                const savedSubs = JSON.parse(localStorage.getItem('aysed_saved_subscriptions') || '[]');
                const sub = savedSubs.find((s: any) => (s.companyName || s.name || '').toLowerCase().includes(companyName.toLowerCase()));
                if (sub) {
                  const newComp: Company = {
                    id: `comp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                    nameAr: sub.companyName || sub.name,
                    nameEn: sub.companyName || sub.name,
                    commercialRegNo: sub.commercialRegNo || `REG-${Math.floor(1000 + Math.random() * 9000)}`,
                    civilIdCompany: sub.civilIdCompany || '999999999999',
                    bankName: 'بنك الكويت الوطني (NBK)',
                    iban: `KW12NBKW${Math.floor(1000000000000000 + Math.random() * 9000000000000000)}`,
                    wsiCode: `WSI-${Math.floor(1000 + Math.random() * 9000)}`,
                    currency: 'KWD',
                    status: 'active',
                    email: sub.email || `${sub.phone || '999'}@aysedhr.com`
                  };
                  setCompanies(prev => [...prev, newComp]);
                  found = newComp;
                }
              } catch (e) {}
            }

            if (!found) {
              const fallbackComp: Company = {
                id: `comp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                nameAr: companyName,
                nameEn: companyName,
                commercialRegNo: `REG-${Math.floor(1000 + Math.random() * 9000)}`,
                civilIdCompany: '999999999999',
                bankName: 'بنك الكويت الوطني (NBK)',
                iban: `KW12NBKW${Math.floor(1000000000000000 + Math.random() * 9000000000000000)}`,
                wsiCode: `WSI-${Math.floor(1000 + Math.random() * 9000)}`,
                currency: 'KWD',
                status: 'active',
                email: `${companyName.replace(/\s+/g, '')}@aysedhr.com`
              };
              setCompanies(prev => [...prev, fallbackComp]);
              found = fallbackComp;
            }

            if (found) {
              actionSwitchContext(found);
            }
            setPortalViewMode('apps');
          }}
        />
      </main>
    );
  }

  // 2. Standard Odoo Workspace (HR Apps)
  return (
    <div className="aysed-main-layout flex h-screen w-full overflow-hidden font-['Tajawal'] bg-[#F8F9FA] text-gray-800 odoo-scrollbar relative aysed-standard-odoo-view" dir="rtl">
      <BackgroundRenderer theme={bgTheme as any} motionEnabled={motionEnabled} />
      <Toaster position="top-right" />

      {currentApp !== null && (
        <OdooSidebar 
          isOpen={isSidebarOpen} 
          activeApp={currentApp as any} 
          onNavigate={(app) => setCurrentApp(app === 'APP_LAUNCHER' || (app as string) === 'LAUNCHER' ? null : app)} 
          onNavigateApp={(app) => setCurrentApp(app === 'APP_LAUNCHER' || (app as string) === 'LAUNCHER' ? null : app)}
          currentUserRole={currentUserRole}
          currentUserEmail={currentUserEmail}
          onLogout={handleLogout}
        />
      )}

      <div className={`flex-1 flex flex-col h-screen overflow-hidden relative z-10 transition-all duration-300 ${isSidebarOpen && currentApp !== null ? 'mr-[260px] w-[calc(100%-260px)]' : 'w-full'}`}>
        <OdooTopBar 
          activeApp={currentApp as any}
          currentApp={currentApp}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onNavigateHome={() => setCurrentApp(null)}
          onOpenAppLauncher={() => setCurrentApp(null)}
          onCloseApp={() => setCurrentApp(null)}
          onNavigateToApp={(app) => setCurrentApp(app === 'LAUNCHER' || app === 'APP_LAUNCHER' ? null : app)}
          currentUserEmail={currentUserEmail}
          currentUserRole={currentUserRole}
          onOpenAdmin={() => setPortalViewMode('superadmin')}
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
          onNavigateToApp={(app) => setCurrentApp(app === 'APP_LAUNCHER' || (app as string) === 'LAUNCHER' ? null : app)} 
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
              dailyMovements={dailyMovements}
              onSaveMovement={handleSaveMovement}
              onUpdateMovementState={handleUpdateMovementState}
              onDeleteMovement={handleDeleteMovement}
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
                  const updated = exists ? prev.map(comp => comp.id === c.id ? { ...comp, ...c } : comp) : [...prev, c];
                  try {
                    localStorage.setItem('registered_companies_v1', JSON.stringify(updated));
                  } catch(e) {}
                  return updated;
                });
                if (activeCompany?.id === c.id) {
                  setActiveCompany(c);
                }
                try {
                  await setDoc(doc(db, "companies", c.id), cleanFirestoreData(c), { merge: true });
                  
                  // Also update matching subscription if exists
                  setSubscriptions(prev => {
                    return prev.map(sub => {
                      if (sub.companyId === c.id || sub.companyName === c.nameAr || sub.companyName === c.nameEn) {
                        const updatedSub = {
                          ...sub,
                          companyName: c.nameAr || sub.companyName,
                          email: c.email || sub.email,
                          phone: c.phone || sub.phone,
                        };
                        setDoc(doc(db, "subscriptions", sub.id), cleanFirestoreData(updatedSub), { merge: true }).catch(console.error);
                        return updatedSub;
                      }
                      return sub;
                    });
                  });

                  toast.success("تم حفظ بيانات الشركة بنجاح في قاعدة البيانات");
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
              onLogout={handleLogout}
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

export const App: React.FC = () => {
  return (
    <HRProvider>
      <MainActionManager />
    </HRProvider>
  );
};

export default App;

