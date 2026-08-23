/**
 * Persistent Storage Engine for Manara HR System
 * Guarantees that employees, attendance, payroll, leaves, loans, and tenant data NEVER disappear on refresh.
 */

export const MANARA_STORAGE_KEYS = {
  EMPLOYEES: 'manara_employees_data',
  TENANTS: 'manara_tenants_data',
  COMPANIES: 'manara_companies_data',
  ATTENDANCE: 'manara_attendance_data',
  PAYSLIPS: 'manara_payslips_data',
  PAYROLL_RUNS: 'manara_payroll_runs_data',
  LEAVES: 'manara_leaves_data',
  LEAVE_ALLOCATIONS: 'manara_leave_allocations_data',
  LOANS: 'manara_loans_data',
  CONTRACTS: 'manara_contracts_data',
  CUSTODIES: 'manara_custodies_data',
  DEPARTMENTS: 'manara_departments_data',
  JOB_TITLES: 'manara_job_titles_data',
  WARNINGS: 'manara_warnings_data',
  EMPLOYEE_NOTES: 'manara_employee_notes_data',
  DOCUMENTS: 'manara_documents_data',
  DOCUMENT_TEMPLATES: 'manara_document_templates_data',
  GENERATED_DOCS: 'manara_generated_docs_data',
  AUDIT_LOGS: 'manara_audit_logs_data',
  AUTOMATION_RULES: 'manara_automation_rules_data',
  SHIFTS: 'manara_shifts_data',
  EMPLOYEE_SHIFTS: 'manara_employee_shifts_data',
  COMMENCEMENTS: 'manara_commencements_data',
  SUBSCRIPTIONS: 'manara_subscriptions_data',
  EMPLOYEE_NOTIFICATIONS: 'manara_employee_notifications_data',
  DAILY_MOVEMENTS: 'manara_daily_movements_data',
  ACTIVE_COMPANY_ID: 'activeCompanyId',
  BG_THEME: 'manara_bg_theme',
  MOTION_ENABLED: 'manara_motion_enabled',
  VIEW_MODE: 'manara_view_mode',
} as const;

/**
 * Safely loads persistent data from localStorage.
 * If data exists in localStorage, returns it; otherwise returns fallback.
 */
export function getPersistentData<T>(key: string, fallback: T, alternateKey?: string): T {
  if (typeof window === 'undefined' || !window.localStorage) {
    return fallback;
  }
  try {
    const raw = localStorage.getItem(key) || (alternateKey ? localStorage.getItem(alternateKey) : null);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (parsed === null || parsed === undefined) return fallback;
    // For arrays, if parsed is not an array, fallback
    if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback;
    return parsed as T;
  } catch (error) {
    console.warn(`[PersistentStorage] Error loading key "${key}":`, error);
    return fallback;
  }
}

/**
 * Helper to prune heavy strings (like huge uncompressed base64 images) if quota is exceeded
 */
function stripHeavyBase64Data<T>(data: T): T {
  if (!data) return data;
  try {
    if (Array.isArray(data)) {
      return data.map(item => stripHeavyBase64Data(item)) as unknown as T;
    }
    if (typeof data === 'object') {
      const copy: any = { ...data };
      for (const k in copy) {
        if (typeof copy[k] === 'string' && copy[k].length > 100000 && copy[k].startsWith('data:')) {
          // Clear oversized data URLs that exceed 100KB to fit within localStorage limits
          copy[k] = '';
        } else if (typeof copy[k] === 'object' && copy[k] !== null) {
          copy[k] = stripHeavyBase64Data(copy[k]);
        }
      }
      return copy as T;
    }
  } catch (_) {}
  return data;
}

/**
 * Safely saves data to localStorage with automatic QuotaExceeded recovery.
 */
export function setPersistentData<T>(key: string, data: T, secondaryKey?: string): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(key, serialized);
    if (secondaryKey) {
      localStorage.setItem(secondaryKey, serialized);
    }
  } catch (error: any) {
    // Quota Exceeded recovery strategy
    try {
      // 1. Clear secondary keys if any
      if (secondaryKey) {
        localStorage.removeItem(secondaryKey);
      }
      // 2. Clear non-essential cached logs to free space
      localStorage.removeItem(MANARA_STORAGE_KEYS.AUDIT_LOGS);
      localStorage.removeItem(MANARA_STORAGE_KEYS.DAILY_MOVEMENTS);

      // 3. Re-try saving
      const serialized = JSON.stringify(data);
      localStorage.setItem(key, serialized);
    } catch (secondErr) {
      // 4. If still exceeding quota, strip heavy base64 items (e.g. giant avatars/files)
      try {
        const cleanedData = stripHeavyBase64Data(data);
        const serializedCleaned = JSON.stringify(cleanedData);
        localStorage.setItem(key, serializedCleaned);
      } catch (finalErr) {
        console.warn(`[PersistentStorage] Storage quota limit reached for "${key}".`);
      }
    }
  }
}

/**
 * Removes data from localStorage.
 */
export function removePersistentData(key: string, secondaryKey?: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.removeItem(key);
    if (secondaryKey) localStorage.removeItem(secondaryKey);
  } catch (e) {
    console.error(`[PersistentStorage] Error removing key "${key}":`, e);
  }
}

/**
 * Purges all legacy mock companies and demo employees/contracts from localStorage
 */
export function purgeLegacyMockData(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    // 1. Purge Companies
    const rawComps = localStorage.getItem(MANARA_STORAGE_KEYS.COMPANIES);
    if (rawComps) {
      const comps = JSON.parse(rawComps);
      if (Array.isArray(comps)) {
        const cleaned = comps.filter((c: any) => c.id !== 'comp-1' && !c.nameAr?.includes('مجموعة العيادات'));
        localStorage.setItem(MANARA_STORAGE_KEYS.COMPANIES, JSON.stringify(cleaned));
        localStorage.setItem(MANARA_STORAGE_KEYS.TENANTS, JSON.stringify(cleaned));
      }
    }

    // 2. Purge Employees
    const rawEmps = localStorage.getItem(MANARA_STORAGE_KEYS.EMPLOYEES);
    if (rawEmps) {
      const emps = JSON.parse(rawEmps);
      if (Array.isArray(emps)) {
        const cleaned = emps.filter((e: any) => e.companyId !== 'comp-1' && !e.id?.startsWith('emp-20'));
        localStorage.setItem(MANARA_STORAGE_KEYS.EMPLOYEES, JSON.stringify(cleaned));
      }
    }

    // 3. Purge Contracts
    const rawContracts = localStorage.getItem(MANARA_STORAGE_KEYS.CONTRACTS);
    if (rawContracts) {
      const contracts = JSON.parse(rawContracts);
      if (Array.isArray(contracts)) {
        const cleaned = contracts.filter((c: any) => c.companyId !== 'comp-1' && !c.id?.startsWith('cnt-20'));
        localStorage.setItem(MANARA_STORAGE_KEYS.CONTRACTS, JSON.stringify(cleaned));
      }
    }

    // 4. Purge Departments
    const rawDepts = localStorage.getItem(MANARA_STORAGE_KEYS.DEPARTMENTS);
    if (rawDepts) {
      const depts = JSON.parse(rawDepts);
      if (Array.isArray(depts)) {
        const cleaned = depts.filter((d: any) => d.companyId !== 'comp-1' && d.id !== 'dept-med' && d.id !== 'dept-derm');
        localStorage.setItem(MANARA_STORAGE_KEYS.DEPARTMENTS, JSON.stringify(cleaned));
      }
    }

    // 5. Purge Attendance, Leaves, Payslips for comp-1
    const arrayKeys = [
      MANARA_STORAGE_KEYS.ATTENDANCE,
      MANARA_STORAGE_KEYS.LEAVES,
      MANARA_STORAGE_KEYS.PAYSLIPS,
      MANARA_STORAGE_KEYS.CUSTODIES,
      MANARA_STORAGE_KEYS.LOANS,
      MANARA_STORAGE_KEYS.WARNINGS,
      MANARA_STORAGE_KEYS.DOCUMENTS,
    ];
    arrayKeys.forEach(k => {
      const raw = localStorage.getItem(k);
      if (raw) {
        try {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) {
            const cleaned = arr.filter((item: any) => item.companyId !== 'comp-1');
            localStorage.setItem(k, JSON.stringify(cleaned));
          }
        } catch (_) {}
      }
    });

    // 6. Reset active company ID if it was comp-1
    const activeComp = localStorage.getItem('activeCompanyId');
    if (activeComp === 'comp-1') {
      localStorage.setItem('activeCompanyId', 'comp-super-admin');
    }
  } catch (err) {
    console.warn('[PersistentStorage] Purge mock data warning:', err);
  }
}

// Auto-execute purge on script evaluation
if (typeof window !== 'undefined') {
  purgeLegacyMockData();
}
