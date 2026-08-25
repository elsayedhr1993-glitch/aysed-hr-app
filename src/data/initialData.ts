import { Company, Employee, Candidate, Contract, LeaveRequest, AttendanceRecord, Payslip, DocumentItem, AutomationRule, Department, JobTitle, CustodyItem, LoanAdvance, DisciplinaryWarning, EmployeeNote, CompanySubscription } from '../types';

export const initialCompanies: Company[] = [];

export const initialSubscriptions: CompanySubscription[] = [];

export const initialDepartments: Department[] = [
  { id: 'dept-hr-admin', name: 'الموارد البشرية والإدارة', code: 'HR', description: 'شؤون الموظفين والتوظيف والرواتب' },
  { id: 'dept-finance', name: 'الإدارة المالية والحسابات', code: 'FIN', description: 'المحاسبة العامة والميزانيات والتدقيق' },
  { id: 'dept-medical', name: 'الجلدية والليزر والتجميل', code: 'MED', description: 'الكادر الطبي والتمريضي والفني' },
  { id: 'dept-gov-rel', name: 'الشؤون القانونية والعلاقات الحكومية', code: 'LEGAL', description: 'الجوازات وشؤون العمل وتجديد التراخيص' },
  { id: 'dept-marketing', name: 'التسويق وخدمة العملاء', code: 'MKT', description: 'خدمة العملاء والاستقبال والتسويق' },
  { id: 'dept-it-support', name: 'تقنية المعلومات والدعم الفني', code: 'IT', description: 'الأنظمة والشبكات والدعم الفني' },
  { id: 'dept-operations', name: 'الخدمات المساندة والتشغيل', code: 'OPS', description: 'الخدمات اللوجستية والحركة والخدمات المساندة' },
];

export const initialJobTitles: JobTitle[] = [
  { id: 'jt-hr-mgr', titleName: 'مدير الموارد البشرية', departmentName: 'الموارد البشرية والإدارة', description: 'إدارة شؤون الموظفين والسياسات' },
  { id: 'jt-hr-officer', titleName: 'مسؤول شؤون موظفين', departmentName: 'الموارد البشرية والإدارة', description: 'متابعة الإجازات والحضور والرواتب' },
  { id: 'jt-fin-mgr', titleName: 'مدير مالي', departmentName: 'الإدارة المالية والحسابات', description: 'الإشراف على الحسابات والتقارير المالية' },
  { id: 'jt-accountant', titleName: 'محاسب عام', departmentName: 'الإدارة المالية والحسابات', description: 'القيود اليومية والتحويلات والرواتب WPS' },
  { id: 'jt-doctor-consultant', titleName: 'طبيب استشاري', departmentName: 'الجلدية والليزر والتجميل', description: 'استشارات طبية متخصصة' },
  { id: 'jt-doctor-specialist', titleName: 'أخصائي جلدية وتجميل', departmentName: 'الجلدية والليزر والتجميل', description: 'تشخيص وعلاج الحالات التجميلية' },
  { id: 'jt-doctor-general', titleName: 'طبيب عام', departmentName: 'الجلدية والليزر والتجميل', description: 'فحص الحالات العامة' },
  { id: 'jt-nurse', titleName: 'ممرض قانوني', departmentName: 'الجلدية والليزر والتجميل', description: 'رعاية المرضى وتجهيز العيادات' },
  { id: 'jt-laser-tech', titleName: 'فني ليزر وتجميل', departmentName: 'الجلدية والليزر والتجميل', description: 'جلسات الليزر والعناية بالبشرة' },
  { id: 'jt-mandoob', titleName: 'مندوب شؤون وجوازات', departmentName: 'الشؤون القانونية والعلاقات الحكومية', description: 'مراجعة الهيئة العامة للقوى العاملة وإدارات الهجرة' },
  { id: 'jt-legal-advisor', titleName: 'مستشار قانوني', departmentName: 'الشؤون القانونية والعلاقات الحكومية', description: 'صياغة العقود وتفسير قانون العمل' },
  { id: 'jt-exec-sec', titleName: 'سكرتير تنفيذي', departmentName: 'الموارد البشرية والإدارة', description: 'تنظيم المواعيد والمراسلات الإدارية' },
  { id: 'jt-receptionist', titleName: 'موظف استقبال واستعلامات', departmentName: 'التسويق وخدمة العملاء', description: 'استقبال المراجعين وإدارة الحجوزات' },
  { id: 'jt-mkt-specialist', titleName: 'أخصائي تسويق وعلاقات عامة', departmentName: 'التسويق وخدمة العملاء', description: 'الحملات الإعلانية والتواصل الاجتماعي' },
  { id: 'jt-it-admin', titleName: 'مسؤول نظم ومعلومات IT', departmentName: 'تقنية المعلومات والدعم الفني', description: 'إدارة الخوادم وحماية الأنظمة' },
  { id: 'jt-driver', titleName: 'سائق', departmentName: 'الخدمات المساندة والتشغيل', description: 'نقل المعاملات والمهام الخارجية' },
  { id: 'jt-hospitality', titleName: 'عامل بوفيه وخدمات', departmentName: 'الخدمات المساندة والتشغيل', description: 'خدمات الضيافة والنظافة' },
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
export const demoSampleEmployees: Employee[] = [];
export const demoSampleContracts: Contract[] = [];
