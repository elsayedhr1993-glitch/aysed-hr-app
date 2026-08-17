import { useEffect } from 'react';
import { collection, onSnapshot, query, where, doc, setDoc, getDoc } from 'firebase/firestore';
import { db, auth, cleanFirestoreData } from '../lib/firebase';
import { Employee, Contract, LeaveRequest, AttendanceRecord, Payslip, DocumentItem, CustodyItem, LoanAdvance, DisciplinaryWarning, EmployeeNote, EmployeeNotification } from '../types';
import { initialCompanies, initialDepartments, initialJobTitles, initialEmployees, initialContracts } from '../data/initialData';
import { MANARA_STORAGE_KEYS, setPersistentData, getPersistentData } from '../utils/persistentStorage';


enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMessage = error instanceof Error ? error.message : String(error);
  const isOfflineOrUnavailable =
    errMessage.includes('unavailable') ||
    errMessage.includes('offline') ||
    errMessage.includes('Failed to get document because the client is offline') ||
    errMessage.includes('Could not reach Cloud Firestore backend');

  if (isOfflineOrUnavailable) {
    console.warn(`[Firestore Offline/Reconnecting] ${operationType} on ${path}: backend connection is reconnecting.`);
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

export const useFirebaseSync = (
  isAuthenticated: boolean,
  activeCompanyId: string,
  currentUserRole: string,
  setEmployees: any,
  setContracts: any,
  setLeaves: any,
  setAttendance: any,
  setPayslips: any,
  setDocuments: any,
  setCustodies: any,
  setLoans: any,
  setWarnings: any,
  setEmployeeNotes: any,
  setDepartments?: any,
  setJobTitles?: any,
  setCompanies?: any,
  setNotifications?: any,
  setSubscriptions?: any
) => {
  useEffect(() => {
    if (!isAuthenticated) return;

    // Super Admin platform mode: Keep tenant employee data sterile & isolated
    const isSuperAdminPlatformMode = currentUserRole === 'SUPER_ADMIN' && (!activeCompanyId || activeCompanyId === 'SAAS_PLATFORM');
    if (isSuperAdminPlatformMode) {
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
    }

    const tenantId = activeCompanyId || 'comp-1';

    // Strict Tenant-Scoped Queries (Strict Multi-Tenancy Architecture)
    // 1. Employees: Strictly scoped to current tenant
    const qEmployees = query(collection(db, 'employees'), where('companyId', '==', tenantId));
    const unsubEmployees = onSnapshot(qEmployees, 
        snap => {
          if (!isSuperAdminPlatformMode) {
            const remote = snap.docs.map(d => ({ ...d.data(), id: d.id } as any));
            if (remote.length > 0) {
              setEmployees(remote);
              setPersistentData(MANARA_STORAGE_KEYS.EMPLOYEES, remote);
            }
          }
        },
        err => {
          handleFirestoreError(err, OperationType.GET, 'employees');
        }
    );
    
    // 2. Contracts: Strictly scoped to current tenant
    const qContracts = query(collection(db, 'contracts'), where('companyId', '==', tenantId));
    const unsubContracts = onSnapshot(qContracts, 
        snap => {
          if (!isSuperAdminPlatformMode) {
            const remote = snap.docs.map(d => ({ ...d.data(), id: d.id } as any));
            if (remote.length > 0) {
              setContracts(remote);
              setPersistentData(MANARA_STORAGE_KEYS.CONTRACTS, remote);
            }
          }
        },
        err => {
          handleFirestoreError(err, OperationType.GET, 'contracts');
        }
    );
    
    // 3. Leaves: Strictly scoped to current tenant
    const qLeaves = query(collection(db, 'leaves'), where('companyId', '==', tenantId));
    const unsubLeaves = onSnapshot(qLeaves, 
        snap => {
          if (!isSuperAdminPlatformMode) {
            const remote = snap.docs.map(d => ({ ...d.data(), id: d.id }));
            if (remote.length > 0) {
              setLeaves(remote);
              setPersistentData(MANARA_STORAGE_KEYS.LEAVES, remote);
            }
          }
        },
        err => handleFirestoreError(err, OperationType.GET, 'leaves')
    );
    
    // 4. Attendance: Strictly scoped to current tenant
    const qAttendance = query(collection(db, 'attendance'), where('companyId', '==', tenantId));
    const unsubAttendance = onSnapshot(qAttendance, 
        snap => {
          if (!isSuperAdminPlatformMode) {
            const remote = snap.docs.map(d => ({ ...d.data(), id: d.id }));
            if (remote.length > 0) {
              setAttendance(remote);
              setPersistentData(MANARA_STORAGE_KEYS.ATTENDANCE, remote);
            }
          }
        },
        err => handleFirestoreError(err, OperationType.GET, 'attendance')
    );
    
    // 5. Payslips: Strictly scoped to current tenant
    const qPayslips = query(collection(db, 'payslips'), where('companyId', '==', tenantId));
    const unsubPayslips = onSnapshot(qPayslips, 
        snap => {
          if (!isSuperAdminPlatformMode) {
            const remote = snap.docs.map(d => ({ ...d.data(), id: d.id }));
            if (remote.length > 0) {
              setPayslips(remote);
              setPersistentData(MANARA_STORAGE_KEYS.PAYSLIPS, remote);
            }
          }
        },
        err => handleFirestoreError(err, OperationType.GET, 'payslips')
    );
    
    // 6. Documents: Strictly scoped to current tenant
    const qDocuments = query(collection(db, 'documents'), where('companyId', '==', tenantId));
    const unsubDocuments = onSnapshot(qDocuments, 
        snap => {
          if (!isSuperAdminPlatformMode) {
            const remote = snap.docs.map(d => ({ ...d.data(), id: d.id }));
            if (remote.length > 0) {
              setDocuments(remote);
              setPersistentData(MANARA_STORAGE_KEYS.DOCUMENTS, remote);
            }
          }
        },
        err => handleFirestoreError(err, OperationType.GET, 'documents')
    );
    
    // 7. Custodies: Strictly scoped to current tenant
    const qCustodies = query(collection(db, 'custodies'), where('companyId', '==', tenantId));
    const unsubCustodies = onSnapshot(qCustodies, 
        snap => {
          if (!isSuperAdminPlatformMode) {
            const remote = snap.docs.map(d => ({ ...d.data(), id: d.id }));
            if (remote.length > 0) {
              setCustodies(remote);
              setPersistentData(MANARA_STORAGE_KEYS.CUSTODIES, remote);
            }
          }
        },
        err => handleFirestoreError(err, OperationType.GET, 'custodies')
    );
    
    // 8. Loans: Strictly scoped to current tenant
    const qLoans = query(collection(db, 'loans'), where('companyId', '==', tenantId));
    const unsubLoans = onSnapshot(qLoans, 
        snap => {
          if (!isSuperAdminPlatformMode) {
            const remote = snap.docs.map(d => ({ ...d.data(), id: d.id }));
            if (remote.length > 0) {
              setLoans(remote);
              setPersistentData(MANARA_STORAGE_KEYS.LOANS, remote);
            }
          }
        },
        err => handleFirestoreError(err, OperationType.GET, 'loans')
    );
    
    // 9. Warnings: Strictly scoped to current tenant
    const qWarnings = query(collection(db, 'warnings'), where('companyId', '==', tenantId));
    const unsubWarnings = onSnapshot(qWarnings, 
        snap => {
          if (!isSuperAdminPlatformMode) {
            const remote = snap.docs.map(d => ({ ...d.data(), id: d.id }));
            if (remote.length > 0) {
              setWarnings(remote);
              setPersistentData(MANARA_STORAGE_KEYS.WARNINGS, remote);
            }
          }
        },
        err => handleFirestoreError(err, OperationType.GET, 'warnings')
    );
    
    // 10. Notes: Strictly scoped to current tenant
    const qNotes = query(collection(db, 'employeeNotes'), where('companyId', '==', tenantId));
    const unsubNotes = onSnapshot(qNotes, 
        snap => {
          if (!isSuperAdminPlatformMode) {
            const remote = snap.docs.map(d => ({ ...d.data(), id: d.id }));
            if (remote.length > 0) {
              setEmployeeNotes(remote);
              setPersistentData(MANARA_STORAGE_KEYS.EMPLOYEE_NOTES, remote);
            }
          }
        },
        err => handleFirestoreError(err, OperationType.GET, 'employeeNotes')
    );

    let unsubNotifications: (() => void) | null = null;
    if (setNotifications) {
      const qNotifs = query(collection(db, 'notifications'), where('companyId', '==', tenantId));
      unsubNotifications = onSnapshot(qNotifs,
        snap => {
          if (!isSuperAdminPlatformMode) {
            const remote = snap.docs.map(d => ({ ...d.data(), id: d.id }));
            if (remote.length > 0) {
              setNotifications(remote);
              setPersistentData(MANARA_STORAGE_KEYS.EMPLOYEE_NOTIFICATIONS, remote);
            }
          }
        },
        err => handleFirestoreError(err, OperationType.GET, 'notifications')
      );
    }

    let unsubDepartments: (() => void) | null = null;
    if (setDepartments) {
      const qDepartments = query(collection(db, 'departments'), where('companyId', '==', tenantId));
      unsubDepartments = onSnapshot(qDepartments, 
          snap => {
            if (!isSuperAdminPlatformMode) {
              const remote = snap.docs.map(d => ({ ...d.data(), id: d.id }));
              if (remote.length > 0) {
                setDepartments(remote);
                setPersistentData(MANARA_STORAGE_KEYS.DEPARTMENTS, remote);
              }
            }
          },
          err => {
              handleFirestoreError(err, OperationType.GET, 'departments');
          }
      );
    }

    let unsubJobTitles: (() => void) | null = null;
    if (setJobTitles) {
      const qJobTitles = query(collection(db, 'job_titles'), where('companyId', '==', tenantId));
      unsubJobTitles = onSnapshot(qJobTitles, 
          snap => {
            if (!isSuperAdminPlatformMode) {
              const remote = snap.docs.map(d => ({ ...d.data(), id: d.id }));
              if (remote.length > 0) {
                setJobTitles(remote);
                setPersistentData(MANARA_STORAGE_KEYS.JOB_TITLES, remote);
              }
            }
          },
          err => {
              handleFirestoreError(err, OperationType.GET, 'job_titles');
          }
      );
    }

    // Companies & Subscriptions are available for tenant selection and platform administration
    const unsubCompanies = onSnapshot(collection(db, 'companies'), 
        snap => {
            if (setCompanies) {
                const remote = snap.docs.map(d => ({ ...d.data(), id: d.id }));
                if (remote.length > 0) {
                  setCompanies(remote);
                  setPersistentData(MANARA_STORAGE_KEYS.COMPANIES, remote, MANARA_STORAGE_KEYS.TENANTS);
                }
            }
        },
        err => handleFirestoreError(err, OperationType.GET, 'companies')
    );

    let unsubSubscriptions: (() => void) | null = null;
    if (setSubscriptions) {
      unsubSubscriptions = onSnapshot(collection(db, 'subscriptions'),
        snap => {
          const remote = snap.docs.map(d => ({ ...d.data(), id: d.id }));
          if (remote.length > 0) {
            setSubscriptions(remote);
            setPersistentData(MANARA_STORAGE_KEYS.SUBSCRIPTIONS, remote);
          }
        },
        err => handleFirestoreError(err, OperationType.GET, 'subscriptions')
      );
    }

    return () => {
      unsubEmployees();
      unsubContracts();
      unsubLeaves();
      unsubAttendance();
      unsubPayslips();
      unsubDocuments();
      unsubCustodies();
      unsubLoans();
      unsubWarnings();
      unsubNotes();
      if(unsubNotifications) unsubNotifications();
      if(unsubDepartments) unsubDepartments();
      if(unsubJobTitles) unsubJobTitles();
      unsubCompanies();
      if(unsubSubscriptions) unsubSubscriptions();
    };
  }, [isAuthenticated, activeCompanyId, currentUserRole]);
};
