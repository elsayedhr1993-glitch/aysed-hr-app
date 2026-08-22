import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Employee } from '../types';
import { LeaveService, runAutomatedLeaveAccrual, AccrualLogEntry, AccrualEngineResult, getAccrualMonthNameAr } from '../services/leaveService';
import { MANARA_STORAGE_KEYS, getPersistentData, setPersistentData } from '../utils/persistentStorage';
import { db, cleanFirestoreData } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

export interface EmployeeContextType {
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  accrualLogs: AccrualLogEntry[];
  isAccrualRunning: boolean;
  lastAccrualRunDate: string | null;
  runLeaveAccrualEngine: (force?: boolean, showToast?: boolean) => AccrualEngineResult;
  manualAccrueForEmployee: (employeeId: string) => boolean;
  getEmployeeAccrualStatus: () => ReturnType<typeof LeaveService.checkAccrualStatus>;
  updateEmployee: (updatedEmp: Employee) => Promise<void>;
}

export const EmployeeContext = createContext<EmployeeContextType | undefined>(undefined);
export const StoreContext = EmployeeContext; // Alias for StoreContext

export const EmployeeProvider: React.FC<{
  children: React.ReactNode;
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
}> = ({ children, employees, setEmployees }) => {
  const [accrualLogs, setAccrualLogs] = useState<AccrualLogEntry[]>([]);
  const [isAccrualRunning, setIsAccrualRunning] = useState(false);
  const [lastAccrualRunDate, setLastAccrualRunDate] = useState<string | null>(() => {
    return localStorage.getItem('manara_last_accrual_run') || null;
  });

  // Automated execution on mount or when employees change if new month starts
  const runLeaveAccrualEngine = useCallback((force: boolean = false, showToast: boolean = true): AccrualEngineResult => {
    setIsAccrualRunning(true);
    const currentDate = new Date();
    const result = runAutomatedLeaveAccrual(employees, currentDate, force);

    if (result.hasRun) {
      setEmployees(result.updatedEmployees);
      setPersistentData(MANARA_STORAGE_KEYS.EMPLOYEES, result.updatedEmployees);
      setAccrualLogs(prev => [...result.logs, ...prev].slice(0, 100));
      
      const nowIso = currentDate.toISOString();
      setLastAccrualRunDate(nowIso);
      localStorage.setItem('manara_last_accrual_run', nowIso);

      // Async Firestore update for accrued employees
      result.updatedEmployees.forEach(emp => {
        const matchingLog = result.logs.find(l => l.employeeId === emp.id && l.status === 'ACCRUED');
        if (matchingLog) {
          try {
            setDoc(doc(db, "employees", emp.id), cleanFirestoreData(emp), { merge: true });
          } catch (e) {
            console.error("Firestore sync notice for employee accrual:", e);
          }
        }
      });

      if (showToast) {
        toast.success(
          `✨ تم الترحيل الآلي لرصيد الإجازات (+2.5 يوم) لـ ${result.accruedCount} موظف لشهر ${getAccrualMonthNameAr(currentDate)}`,
          { id: 'leave-accrual-notification', duration: 4500 }
        );
      }
    } else if (force && showToast) {
      toast('جميع الموظفين النشطين محدثون مسبقاً لهذا الشهر ولا توجد استحقاقات معلقة.', {
        icon: 'ℹ️',
        id: 'leave-accrual-already-uptodate'
      });
    }

    setIsAccrualRunning(false);
    return result;
  }, [employees, setEmployees]);

  // Run automatically when component mounts if any employee needs monthly accrual
  useEffect(() => {
    if (employees && employees.length > 0) {
      const status = LeaveService.checkAccrualStatus(employees);
      if (status.pendingCount > 0) {
        runLeaveAccrualEngine(false, true);
      }
    }
  }, [employees?.length]); // Safe trigger

  const manualAccrueForEmployee = useCallback((employeeId: string): boolean => {
    const res = LeaveService.manualAccrueForEmployee(employeeId, employees);
    if (res.success) {
      setEmployees(res.updatedEmployees);
      setPersistentData(MANARA_STORAGE_KEYS.EMPLOYEES, res.updatedEmployees);
      const targetEmp = res.updatedEmployees.find(e => e.id === employeeId);
      if (targetEmp) {
        try {
          setDoc(doc(db, "employees", targetEmp.id), cleanFirestoreData(targetEmp), { merge: true });
        } catch (e) {
          console.error("Error updating employee Firestore doc:", e);
        }
      }
      toast.success(res.message);
      return true;
    } else {
      toast.error(res.message);
      return false;
    }
  }, [employees, setEmployees]);

  const getEmployeeAccrualStatus = useCallback(() => {
    return LeaveService.checkAccrualStatus(employees);
  }, [employees]);

  const updateEmployee = useCallback(async (updatedEmp: Employee) => {
    setEmployees(prev => {
      const next = prev.map(e => e.id === updatedEmp.id ? updatedEmp : e);
      setPersistentData(MANARA_STORAGE_KEYS.EMPLOYEES, next);
      return next;
    });
    try {
      await setDoc(doc(db, "employees", updatedEmp.id), cleanFirestoreData(updatedEmp), { merge: true });
    } catch (err) {
      console.error("Failed to update employee in Firestore", err);
    }
  }, [setEmployees]);

  const value: EmployeeContextType = {
    employees,
    setEmployees,
    accrualLogs,
    isAccrualRunning,
    lastAccrualRunDate,
    runLeaveAccrualEngine,
    manualAccrueForEmployee,
    getEmployeeAccrualStatus,
    updateEmployee
  };

  return (
    <EmployeeContext.Provider value={value}>
      {children}
    </EmployeeContext.Provider>
  );
};

export const useEmployeeContext = () => {
  const ctx = useContext(EmployeeContext);
  if (!ctx) {
    throw new Error('useEmployeeContext must be used within an EmployeeProvider');
  }
  return ctx;
};

export const useStoreContext = useEmployeeContext;
