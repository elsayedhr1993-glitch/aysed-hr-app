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
 * Safely saves data to localStorage.
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
  } catch (error) {
    console.error(`[PersistentStorage] Error saving key "${key}":`, error);
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
