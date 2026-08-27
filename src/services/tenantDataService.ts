/**
 * Multi-Tenant Supabase & Cloud-First Database Persistence Client
 * Defines schemas, adapters, and live CRUD operations for:
 * - `tenants` (companies: e.g. Elite Clinic, Al-Manar Clinic, Al-Fanar Clinic)
 * - `employees`
 * - `leaves`
 * - `payroll_runs` & `payslips`
 * - `attendance`
 * - `contracts`
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { db, cleanFirestoreData } from '../lib/firebase';
import { collection, doc, setDoc, deleteDoc, getDocs, query, where, getDoc } from 'firebase/firestore';
import { Company, Employee, LeaveRequest, AttendanceRecord, Payslip, Contract } from '../types';

export interface TenantRecord {
  id: string;
  name_ar: string;
  name_en?: string;
  commercial_reg_no?: string;
  civil_id_company?: string;
  bank_name?: string;
  iban?: string;
  wsi_code?: string;
  currency?: string;
  status?: string;
  email?: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
}

export interface EmployeeRecord {
  id: string;
  company_id: string;
  employee_code: string;
  full_name_ar: string;
  full_name_en?: string;
  civil_id: string;
  civil_id_expiry?: string;
  passport_no?: string;
  passport_expiry?: string;
  nationality?: string;
  gender?: string;
  dob?: string;
  department?: string;
  job_title?: string;
  email?: string;
  phone?: string;
  join_date?: string;
  moh_license_no?: string;
  moh_license_expiry?: string;
  status?: string;
  bank_name?: string;
  iban?: string;
  basic_salary?: number;
  housing_allowance?: number;
  transport_allowance?: number;
  other_allowance?: number;
  total_salary?: number;
  carried_over_leave_2025?: number;
  accrued_leave_2026?: number;
  remaining_leaves?: number;
  raw_payload?: Record<string, any>;
  updated_at?: string;
}

export interface LeaveDbRecord {
  id: string;
  company_id: string;
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  unpaid_days?: number;
  reason?: string;
  status: string;
  approved_by?: string;
  approved_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PayrollRunRecord {
  id: string;
  company_id: string;
  month: string;
  total_net_salary: number;
  total_basic_salary: number;
  total_allowances: number;
  total_deductions: number;
  employee_count: number;
  status: 'DRAFT' | 'APPROVED' | 'PAID' | 'TRANSFERRED';
  payment_method?: string;
  wsi_file_generated?: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  payslips?: Array<Record<string, any>>;
}

// -------------------------------------------------------------
// ADAPTER HELPERS (Domain Entity <-> Supabase DB Row)
// -------------------------------------------------------------

export function toEmployeeDbRow(emp: Employee, companyId?: string): EmployeeRecord {
  const compId = companyId || emp.companyId || 'comp-super-admin';
  return {
    id: emp.id,
    company_id: compId,
    employee_code: emp.employeeCode || '',
    full_name_ar: emp.fullNameAr || '',
    full_name_en: emp.fullNameEn || '',
    civil_id: emp.civilId || '',
    civil_id_expiry: emp.civilIdExpiry || '',
    passport_no: emp.passportNo || '',
    passport_expiry: emp.passportExpiry || '',
    nationality: emp.nationality || '',
    gender: emp.gender || 'MALE',
    dob: emp.dob || '',
    department: emp.department || '',
    job_title: emp.jobTitle || '',
    email: emp.email || '',
    phone: emp.phone || '',
    join_date: emp.joinDate || '',
    moh_license_no: emp.mohLicenseNo || '',
    moh_license_expiry: emp.mohLicenseExpiry || '',
    status: emp.status || 'ACTIVE',
    bank_name: emp.bankName || '',
    iban: emp.iban || '',
    basic_salary: (emp as any).contractSalary || 0,
    carried_over_leave_2025: Number((emp as any).carriedOverLeave2025 ?? (emp as any).carriedOverBalance ?? (emp as any).openingBalance ?? 0),
    accrued_leave_2026: (emp as any).accruedLeave2026 || (emp as any).aysed_accrued_2026 || 0,
    remaining_leaves: emp.paid_days_remaining || 0,
    raw_payload: emp as any,
    updated_at: new Date().toISOString()
  };
}

export function fromEmployeeDbRow(row: any): Employee {
  if (row.raw_payload && typeof row.raw_payload === 'object') {
    return {
      ...row.raw_payload,
      id: row.id || row.raw_payload.id,
      companyId: row.company_id || row.companyId || row.raw_payload.companyId,
      fullNameAr: row.full_name_ar || row.fullNameAr || row.raw_payload.fullNameAr,
      civilId: row.civil_id || row.civilId || row.raw_payload.civilId,
      carriedOverLeave2025: Number(row.raw_payload.carriedOverLeave2025 ?? row.carried_over_leave_2025 ?? 0),
      carriedOverBalance: Number(row.raw_payload.carriedOverBalance ?? row.carried_over_leave_2025 ?? 0),
      openingBalance: Number(row.raw_payload.openingBalance ?? row.carried_over_leave_2025 ?? 0),
    } as Employee;
  }
  return {
    id: row.id,
    companyId: row.company_id || row.companyId,
    employeeCode: row.employee_code || row.employeeCode || '',
    fullNameAr: row.full_name_ar || row.fullNameAr || '',
    fullNameEn: row.full_name_en || row.fullNameEn || '',
    civilId: row.civil_id || row.civilId || '',
    civilIdExpiry: row.civil_id_expiry || row.civilIdExpiry || '',
    passportNo: row.passport_no || row.passportNo || '',
    passportExpiry: row.passport_expiry || row.passportExpiry || '',
    nationality: row.nationality || '',
    isKuwaiti: Boolean(
      row.nationality
        ? (row.nationality.includes('كويت') || row.nationality === 'كويتي')
        : (row.isKuwaiti || row.is_kuwaiti)
    ),
    residencyType: (row.residency_type || row.residencyType || (row.nationality?.includes('كويت') ? 'كويتي' : 'مادة 18 - قطاع أهلي')) as any,
    gender: (row.gender || 'MALE') as 'MALE' | 'FEMALE',
    dob: row.dob || '',
    department: row.department || '',
    jobTitle: row.job_title || row.jobTitle || '',
    email: row.email || '',
    phone: row.phone || '',
    joinDate: row.join_date || row.joinDate || '',
    mohLicenseNo: row.moh_license_no || row.mohLicenseNo || '',
    mohLicenseExpiry: row.moh_license_expiry || row.mohLicenseExpiry || '',
    status: (row.status || 'ACTIVE') as any,
    bankName: row.bank_name || row.bankName || '',
    iban: row.iban || '',
    tags: row.tags || [],
    carriedOverLeave2025: Number(row.carried_over_leave_2025 || 0),
    carriedOverBalance: Number(row.carried_over_leave_2025 || 0),
    openingBalance: Number(row.carried_over_leave_2025 || 0),
  } as Employee;
}

export function toLeaveDbRow(leave: LeaveRequest, companyId?: string): LeaveDbRecord {
  return {
    id: leave.id,
    company_id: companyId || leave.companyId || 'comp-super-admin',
    employee_id: leave.employeeId,
    leave_type: leave.leaveType || (leave as any).type || 'ANNUAL',
    start_date: leave.startDate,
    end_date: leave.endDate,
    days: leave.totalDays || (leave as any).days || 0,
    unpaid_days: leave.unpaidDays || 0,
    reason: leave.reason || '',
    status: leave.status || 'APPROVED',
    approved_by: leave.validatedBy || (leave as any).approvedBy || 'HR Manager',
    approved_at: leave.validatedAt || (leave as any).approvedAt || new Date().toISOString(),
    created_at: leave.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

export function fromLeaveDbRow(row: any): LeaveRequest {
  return {
    id: row.id,
    companyId: row.company_id || row.companyId,
    employeeId: row.employee_id || row.employeeId,
    leaveType: (row.leave_type || row.leaveType || 'ANNUAL') as any,
    startDate: row.start_date || row.startDate,
    endDate: row.end_date || row.endDate,
    totalDays: Number(row.days || row.totalDays) || 0,
    unpaidDays: Number(row.unpaid_days || row.unpaidDays) || 0,
    reason: row.reason || '',
    status: (row.status || 'APPROVED') as any,
    validatedBy: row.approved_by || row.validatedBy,
    validatedAt: row.approved_at || row.validatedAt,
    createdAt: row.created_at || row.createdAt || new Date().toISOString()
  } as LeaveRequest;
}

// -------------------------------------------------------------
// DATABASE API SERVICE (Multi-Tenant Persistence)
// -------------------------------------------------------------

export const TenantDatabaseService = {
  /**
   * Save or update an Employee to persistent database (Supabase + Firestore)
   */
  async saveEmployee(employee: Employee, targetCompanyId?: string): Promise<boolean> {
    const compId = targetCompanyId || employee.companyId || 'comp-super-admin';
    const row = toEmployeeDbRow(employee, compId);

    // 1. Dual write to Supabase if configured
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('employees').upsert([row], { onConflict: 'id' });
        if (error) {
          // Also try hr_employee table if employees table schema differs
          await supabase.from('hr_employee').upsert([{
            id: row.id,
            company_id: compId,
            name: row.full_name_ar,
            civil_id: row.civil_id,
            job_title: row.job_title,
            department: row.department,
            date_start: row.join_date,
            remaining_leaves: row.remaining_leaves,
            updated_at: row.updated_at
          }], { onConflict: 'id' });
        }
      } catch (sbErr) {
        console.warn('[TenantDatabaseService] Supabase employee upsert fallback:', sbErr);
      }
    }

    // 2. Primary cloud persistence to Firestore
    try {
      const cleanDoc = cleanFirestoreData({ ...employee, companyId: compId, updatedAt: new Date().toISOString() });
      await setDoc(doc(db, 'employees', employee.id), cleanDoc, { merge: true });
      return true;
    } catch (fsErr) {
      console.error('[TenantDatabaseService] Firestore save error:', fsErr);
      return false;
    }
  },

  /**
   * Fetch all employees for a specific tenant/company
   */
  async getEmployeesByTenant(companyId: string): Promise<Employee[]> {
    if (!companyId) return [];

    // 1. Try Supabase first if configured
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('employees')
          .select('*')
          .eq('company_id', companyId);
        if (!error && Array.isArray(data) && data.length > 0) {
          return data.map(fromEmployeeDbRow);
        }
      } catch (sbErr) {
        console.warn('[TenantDatabaseService] Supabase fetch error, fallback to Firestore:', sbErr);
      }
    }

    // 2. Firestore query by companyId
    try {
      const q = query(collection(db, 'employees'), where('companyId', '==', companyId));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as Employee));
    } catch (fsErr) {
      console.warn('[TenantDatabaseService] Firestore fetch error:', fsErr);
      return [];
    }
  },

  /**
   * Delete an Employee from all persistent stores
   */
  async deleteEmployee(employeeId: string, companyId?: string): Promise<boolean> {
    if (isSupabaseConfigured) {
      try {
        await supabase.from('employees').delete().eq('id', employeeId);
        await supabase.from('hr_employee').delete().eq('id', employeeId);
      } catch {}
    }
    try {
      await deleteDoc(doc(db, 'employees', employeeId));
      return true;
    } catch (fsErr) {
      console.error('[TenantDatabaseService] Error deleting employee:', fsErr);
      return false;
    }
  },

  /**
   * Save or update a Leave request in persistent database
   */
  async saveLeave(leave: LeaveRequest, targetCompanyId?: string): Promise<boolean> {
    const compId = targetCompanyId || leave.companyId || 'comp-super-admin';
    const row = toLeaveDbRow(leave, compId);

    if (isSupabaseConfigured) {
      try {
        await supabase.from('leaves').upsert([row], { onConflict: 'id' });
      } catch (sbErr) {
        console.warn('[TenantDatabaseService] Supabase leave upsert fallback:', sbErr);
      }
    }

    try {
      const cleanDoc = cleanFirestoreData({ ...leave, companyId: compId, updatedAt: new Date().toISOString() });
      await setDoc(doc(db, 'leaves', leave.id), cleanDoc, { merge: true });
      return true;
    } catch (fsErr) {
      console.error('[TenantDatabaseService] Firestore leave save error:', fsErr);
      return false;
    }
  },

  /**
   * Fetch all leaves for a specific tenant/company
   */
  async getLeavesByTenant(companyId: string): Promise<LeaveRequest[]> {
    if (!companyId) return [];

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('leaves')
          .select('*')
          .eq('company_id', companyId);
        if (!error && Array.isArray(data) && data.length > 0) {
          return data.map(fromLeaveDbRow);
        }
      } catch (sbErr) {
        console.warn('[TenantDatabaseService] Supabase leaves query error:', sbErr);
      }
    }

    try {
      const q = query(collection(db, 'leaves'), where('companyId', '==', companyId));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as LeaveRequest));
    } catch (fsErr) {
      console.warn('[TenantDatabaseService] Firestore leaves query error:', fsErr);
      return [];
    }
  },

  /**
   * Save a Payroll Run / Archive
   */
  async savePayrollRun(payrollRun: PayrollRunRecord): Promise<boolean> {
    if (isSupabaseConfigured) {
      try {
        await supabase.from('payroll_runs').upsert([payrollRun], { onConflict: 'id' });
      } catch (sbErr) {
        console.warn('[TenantDatabaseService] Supabase payroll run save fallback:', sbErr);
      }
    }

    try {
      const cleanDoc = cleanFirestoreData(payrollRun);
      await setDoc(doc(db, 'payroll_runs', payrollRun.id), cleanDoc, { merge: true });
      return true;
    } catch (fsErr) {
      console.error('[TenantDatabaseService] Firestore payroll run save error:', fsErr);
      return false;
    }
  },

  /**
   * Save a single Tenant / Company registration
   */
  async saveTenant(company: Company): Promise<boolean> {
    const row: TenantRecord = {
      id: company.id,
      name_ar: company.nameAr,
      name_en: company.nameEn,
      commercial_reg_no: company.commercialRegNo,
      civil_id_company: company.civilIdCompany,
      bank_name: company.bankName,
      iban: company.iban,
      wsi_code: company.wsiCode,
      currency: company.currency || 'KWD',
      status: company.status || 'active',
      email: company.email,
      phone: company.phone,
      updated_at: new Date().toISOString()
    };

    if (isSupabaseConfigured) {
      try {
        await supabase.from('tenants').upsert([row], { onConflict: 'id' });
      } catch (sbErr) {
        console.warn('[TenantDatabaseService] Supabase tenant upsert fallback:', sbErr);
      }
    }

    try {
      const cleanDoc = cleanFirestoreData({ ...company, updatedAt: new Date().toISOString() });
      await setDoc(doc(db, 'companies', company.id), cleanDoc, { merge: true });
      return true;
    } catch (fsErr) {
      console.error('[TenantDatabaseService] Firestore company save error:', fsErr);
      return false;
    }
  },

  /**
   * Save a Contract record
   */
  async saveContract(contract: Contract, targetCompanyId?: string): Promise<boolean> {
    const compId = targetCompanyId || contract.companyId || 'comp-super-admin';
    const effectiveDailyHours = contract.customDailyHours ?? contract.custom_daily_hours ?? contract.dailyWorkHours ?? contract.plannedDailyHours ?? 8;
    const effectiveWeeklyHours = contract.workingHoursPerWeek || (Number(effectiveDailyHours) * 6);

    if (isSupabaseConfigured) {
      try {
        await supabase.from('contracts').upsert([{
          id: contract.id,
          company_id: compId,
          employee_id: contract.employeeId,
          basic_salary: contract.basicSalary,
          housing_allowance: contract.housingAllowance || 0,
          transport_allowance: contract.transportAllowance || 0,
          other_allowance: contract.otherAllowance || 0,
          start_date: contract.startDate,
          end_date: contract.endDate,
          contract_type: contract.contractType,
          status: contract.status,
          working_hours: effectiveDailyHours,
          custom_daily_hours: effectiveDailyHours,
          daily_work_hours: effectiveDailyHours,
          resource_calendar_id: contract.resourceCalendarId,
          working_schedule: contract.workingSchedule,
          work_hours_type: contract.workHoursType,
          updated_at: new Date().toISOString()
        }], { onConflict: 'id' });
      } catch (sbErr) {
        console.warn('[TenantDatabaseService] Supabase contract upsert fallback:', sbErr);
      }
    }

    try {
      const cleanDoc = cleanFirestoreData({
        ...contract,
        dailyWorkHours: effectiveDailyHours,
        customDailyHours: effectiveDailyHours,
        custom_daily_hours: effectiveDailyHours,
        plannedDailyHours: contract.plannedDailyHours ?? effectiveDailyHours,
        workingHoursPerWeek: effectiveWeeklyHours,
        companyId: compId,
        updatedAt: new Date().toISOString()
      });
      await setDoc(doc(db, 'contracts', contract.id), cleanDoc, { merge: true });
      return true;
    } catch (fsErr) {
      console.error('[TenantDatabaseService] Firestore contract save error:', fsErr);
      return false;
    }
  },

  /**
   * Save an Attendance record
   */
  async saveAttendance(record: AttendanceRecord, targetCompanyId?: string): Promise<boolean> {
    const compId = targetCompanyId || record.companyId || 'comp-super-admin';
    if (isSupabaseConfigured) {
      const payload = {
        id: record.id,
        company_id: compId,
        employee_id: record.employeeId,
        date: record.date,
        check_in: record.checkIn,
        check_out: record.checkOut,
        work_hours: record.workHours,
        overtime_hours: record.overtimeHours,
        status: record.status,
        updated_at: new Date().toISOString()
      };
      try {
        await supabase.from('attendance').upsert([payload], { onConflict: 'id' });
      } catch (e) {}
      try {
        await supabase.from('hr_attendance').upsert([payload], { onConflict: 'id' });
      } catch (e) {}
      try {
        await supabase.from('attendance_logs').upsert([payload], { onConflict: 'id' });
      } catch (e) {}
    }

    try {
      const cleanDoc = cleanFirestoreData({ ...record, companyId: compId, updatedAt: new Date().toISOString() });
      await setDoc(doc(db, 'attendance', record.id), cleanDoc, { merge: true });
      return true;
    } catch (fsErr) {
      console.error('[TenantDatabaseService] Firestore attendance save error:', fsErr);
      return false;
    }
  },

  /**
   * Save a Payslip record
   */
  async savePayslip(payslip: Payslip, targetCompanyId?: string): Promise<boolean> {
    const compId = targetCompanyId || payslip.companyId || 'comp-super-admin';
    if (isSupabaseConfigured) {
      try {
        await supabase.from('payslips').upsert([{
          id: payslip.id,
          company_id: compId,
          employee_id: payslip.employeeId,
          month: payslip.month,
          basic_salary: payslip.basicSalary,
          total_allowances: payslip.allowances || 0,
          gross_salary: payslip.grossSalary,
          total_deductions: (payslip.latenessDeduction || 0) + (payslip.loanDeduction || 0) + (payslip.unpaidLeaveDeduction || 0) + (payslip.otherDeductions || 0),
          net_salary: payslip.netSalary,
          status: payslip.paymentStatus || 'DRAFT',
          updated_at: new Date().toISOString()
        }], { onConflict: 'id' });
      } catch (sbErr) {
        console.warn('[TenantDatabaseService] Supabase payslip upsert fallback:', sbErr);
      }
    }

    try {
      const cleanDoc = cleanFirestoreData({ ...payslip, companyId: compId, updatedAt: new Date().toISOString() });
      await setDoc(doc(db, 'payslips', payslip.id), cleanDoc, { merge: true });
      return true;
    } catch (fsErr) {
      console.error('[TenantDatabaseService] Firestore payslip save error:', fsErr);
      return false;
    }
  }
};
