import { Company, Employee, Candidate, Contract, LeaveRequest, AttendanceRecord, Payslip, DocumentItem, AutomationRule, Department, JobTitle, CustodyItem, LoanAdvance, DisciplinaryWarning, EmployeeNote } from '../types';

export const initialCompanies: Company[] = [
  {
    id: 'comp-1',
    nameAr: 'شركة المنارة للتجارة والمقاولات ش.م.ك.م',
    nameEn: 'Al Manara Trading & Contracting Co. W.L.L',
    commercialRegNo: '123456',
    civilIdCompany: '123456789012',
    bankName: 'بنك الكويت الوطني (NBK)',
    iban: 'KW00NBK0000000000000000000000',
    wsiCode: 'WSI-12345',
    phone: '+965 22000000',
    email: 'info@manara.com.kw',
    currency: 'KWD',
    isPrimary: true,
  }
];
export const initialDepartments: Department[] = [
  { id: 'dept-1', name: 'الموارد البشرية والشؤون الإدارية', code: 'HR' },
  { id: 'dept-2', name: 'الإدارة المالية والمحاسبة', code: 'FIN' },
  { id: 'dept-3', name: 'تقنية المعلومات والحلول الرقمية', code: 'IT' },
  { id: 'dept-4', name: 'العمليات والمشاريع', code: 'OPS' },
];
export const initialJobTitles: JobTitle[] = [
  { id: 'job-1', titleName: 'مدير الموارد البشرية', departmentId: 'dept-1', departmentName: 'الموارد البشرية والشؤون الإدارية' },
  { id: 'job-2', titleName: 'أخصائي شؤون موظفين وجوازات', departmentId: 'dept-1', departmentName: 'الموارد البشرية والشؤون الإدارية' },
  { id: 'job-3', titleName: 'محاسب رواتب وتكاليف', departmentId: 'dept-2', departmentName: 'الإدارة المالية والمحاسبة' },
  { id: 'job-4', titleName: 'مهندس برمجيات ونظم', departmentId: 'dept-3', departmentName: 'تقنية المعلومات والحلول الرقمية' },
];
export const initialEmployees: Employee[] = [];
export const initialContracts: Contract[] = [];
export const initialLeaves: LeaveRequest[] = [];
export const initialAttendance: AttendanceRecord[] = [];
export const initialPayslips: Payslip[] = [];
export const initialDocuments: DocumentItem[] = [];
export const initialCandidates: Candidate[] = [];
export const initialCustodies: CustodyItem[] = [];
export const initialLoans: LoanAdvance[] = [];
export const initialWarnings: DisciplinaryWarning[] = [];
export const initialEmployeeNotes: EmployeeNote[] = [];
export const initialAutomationRules: AutomationRule[] = [];

// Sample Demo Data Backup (Can be loaded optionally from Settings for testing)
export const demoSampleEmployees: Employee[] = [];

export const demoSampleContracts: Contract[] = [];

