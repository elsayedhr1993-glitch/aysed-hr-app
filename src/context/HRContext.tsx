import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { initialEmployees } from '../data/initialData';

export interface Employee {
  id: string;
  name: string;
  job_title: string;
  department: string;
  basic_salary: number;
  remaining_leaves: number;
  civil_id?: string;
  email?: string;
  phone?: string;
  date_start?: string;
  status?: string;
  company_id?: string;
  [key: string]: any;
}

export interface HRContextType {
  employees: Employee[];
  loading: boolean;
  refreshData: () => Promise<void>;
  updateEmployeeBalance: (employeeId: string, daysDeducted: number) => Promise<void>;
  updateEmployee?: (employeeId: string, updates: Partial<Employee>) => Promise<void>;
}

const HRContext = createContext<HRContextType | undefined>(undefined);

export const HRProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. جلب الموظفين المشتركين لكل التطبيقات من جدول hr_employee أو البيانات الافتراضية
  const refreshData = async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('hr_employee')
          .select('*')
          .order('name');
          
        if (!error && data && data.length > 0) {
          // تحويل وتطبيع الحقول لضمان التوافق التام مع كافة الشاشات
          const normalizedEmployees: Employee[] = data.map((emp: any) => ({
            id: emp.id || String(emp.employee_id || ''),
            name: emp.name || emp.full_name_ar || emp.full_name_en || 'موظف',
            job_title: emp.job_title || emp.position || emp.role || 'موظف',
            department: emp.department || emp.department_name || 'عام',
            basic_salary: Number(emp.basic_salary ?? emp.salary ?? 850),
            remaining_leaves: Number(emp.remaining_leaves ?? emp.leave_balance ?? 64),
            civil_id: emp.civil_id || emp.civilId || '',
            email: emp.email || '',
            phone: emp.phone || emp.mobile || '',
            date_start: emp.date_start || emp.hire_date || '2024-01-01',
            status: emp.status || 'ACTIVE',
            company_id: emp.company_id || 'comp-1',
            ...emp
          }));
          setEmployees(normalizedEmployees);
          setLoading(false);
          return;
        }
      }

      // استخدام البيانات الموحدة الحية
      const mappedInitials: Employee[] = (initialEmployees || []).map((emp: any) => ({
        id: emp.id,
        name: emp.fullNameAr || emp.fullNameEn || emp.name || 'موظف',
        job_title: emp.position || emp.jobTitle || 'موظف',
        department: emp.department || 'الإدارة',
        basic_salary: Number(emp.basicSalary || 850),
        remaining_leaves: Number(emp.remaining_leaves ?? emp.leaveBalance ?? 64),
        civil_id: emp.civilId || '',
        email: emp.workEmail || emp.email || '',
        phone: emp.mobilePhone || emp.phone || '',
        date_start: emp.joinDate || '2024-01-01',
        status: emp.status || 'ACTIVE',
        company_id: emp.companyId || 'comp-1',
        ...emp
      }));
      setEmployees(mappedInitials);
    } catch (err) {
      console.warn('استخدام البيانات المحلية الموحدة:', err);
      const fallbackEmployees: Employee[] = (initialEmployees || []).map((emp: any) => ({
        id: emp.id,
        name: emp.fullNameAr || emp.fullNameEn || emp.name || 'موظف',
        job_title: emp.position || emp.jobTitle || 'موظف',
        department: emp.department || 'الإدارة',
        basic_salary: Number(emp.basicSalary || 850),
        remaining_leaves: Number(emp.remaining_leaves ?? emp.leaveBalance ?? 64),
        civil_id: emp.civilId || '',
        email: emp.workEmail || emp.email || '',
        phone: emp.mobilePhone || emp.phone || '',
        date_start: emp.joinDate || '2024-01-01',
        status: emp.status || 'ACTIVE',
        company_id: emp.companyId || 'comp-1',
        ...emp
      }));
      setEmployees(fallbackEmployees);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // 2. دالة ربط الإجازة بخصم الرصيد وتحديث كل الشاشات فوراً
  const updateEmployeeBalance = async (employeeId: string, daysDeducted: number) => {
    const target = employees.find(e => e.id === employeeId);
    if (!target) return;

    const newBalance = Math.max(0, (target.remaining_leaves || 0) - daysDeducted);

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('hr_employee')
          .update({ 
            remaining_leaves: newBalance,
            leave_balance: newBalance,
            updated_at: new Date().toISOString()
          })
          .eq('id', employeeId);
      } catch (err) {
        console.warn('تحديث قاعدة البيانات السحابية واجه تنبيهاً:', err);
      }
    }

    // تحديث الحالة المحلية لتتغير الأرقام في كل التطبيقات لحظياً
    setEmployees(prev =>
      prev.map(emp => emp.id === employeeId ? { ...emp, remaining_leaves: newBalance, leave_balance: newBalance } : emp)
    );
  };

  // دالة تحديث بيانات موظف عامة
  const updateEmployee = async (employeeId: string, updates: Partial<Employee>) => {
    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('hr_employee')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', employeeId);
      } catch (err) {
        console.warn('تحديث قاعدة البيانات:', err);
      }
    }

    setEmployees(prev =>
      prev.map(emp => emp.id === employeeId ? { ...emp, ...updates } : emp)
    );
  };

  return (
    <HRContext.Provider value={{ employees, loading, refreshData, updateEmployeeBalance, updateEmployee }}>
      {children}
    </HRContext.Provider>);
};

export const useHR = () => {
  const context = useContext(HRContext);
  if (!context) throw new Error('useHR must be used within an HRProvider');
  return context;
};
