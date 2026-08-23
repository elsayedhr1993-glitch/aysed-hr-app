export interface Department {
  id: string;
  name: string;
  code?: string;
  description?: string;
}

export interface JobTitle {
  id: string;
  titleName: string; // اسم المسمى الوظيفي (مثلاً: محاسب أول)
  departmentId?: string; // تابع لأي قسم (UUID REFERENCES departments)
  departmentName?: string; // اسم القسم التابع له
  description?: string; // وصف المسمى الوظيفي
  createdAt?: string;
}

export interface Company {
  id: string;
  name?: string;
  civilId?: string;
  companyNumber?: number; // 1 for Al Manara (Master Admin), 2+ for subscribers
  subdomain?: string; // e.g. "almanara", "client1", "client2"
  customDomain?: string; // e.g. "hr.almanara.com.kw"
  nameAr: string;
  nameEn: string;
  commercialRegNo: string; // السجل التجاري
  civilIdCompany: string; // الرقم المدني للشركة
  bankName: string;
  iban: string;
  wsiCode: string; // رمز ملف حماية الأجور بوزارة الشؤون
  logoUrl?: string;
  isPrimary?: boolean;
  parentCompanyId?: string;
  currency?: string;
  titleAddressNo?: string;
  commercialLicenseNo?: string;
  governorate?: string;
  area?: string;
  block?: string;
  street?: string;
  phone?: string;
  ownerPhone?: string;
  email?: string;
  ownerName?: string;
  planType?: string;
  website?: string;
  headerHtml?: string;
  footerHtml?: string;
  stampUrl?: string;
  authorizedSignatureUrl?: string;
  subscriptionPlan?: string;
  status?: 'active' | 'suspended' | 'expired';
}

export interface Employee {
  id: string;
  companyId: string;
  employeeCode: string;
  fullNameAr: string;
  fullNameEn: string;
  civilId: string; // 12 digits, MOD 11 validated
  civilIdExpiry: string;
  passportNo: string;
  passportExpiry: string;
  nationality: string;
  isKuwaiti: boolean;
  residencyType: 'كويتي' | 'مادة 18 - قطاع أهلي' | 'مادة 19 - شريك/كفيل' | 'مادة 17 - حكومي' | 'خليجي' | 'بطاقة مراجعة' | 'معاملة كويتي';
  gender: 'MALE' | 'FEMALE';
  dob: string;
  department: string;
  departmentId?: string;
  parentId?: string; // المدير المباشر (Foreign Key -> employees.id)
  coachId?: string;  // الموجه (Foreign Key -> employees.id)
  jobTitle: string;
  jobTitleId?: string; // ربط جدول الموظفين بالمسمى الوظيفي (job_title_id UUID)
  email: string;
  phone: string;
  joinDate: string;
  mohLicenseNo?: string; // ترخيص وزارة الصحة
  mohLicenseExpiry?: string;
  status: 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED' | 'RESIGNED';
  bankName: string;
  iban: string;
  avatarUrl?: string;
  tags: string[];
  notes?: string;
  biometricId?: string; // معرّف كود البصمة في جهاز البصمة (Biometric Device ID / ZKTeco ID / Fingerprint ID)
  badgeId?: string;     // معرّف الشارة في أودو (Odoo Badge ID / Barcode)
  pinCode?: string;     // رمز PIN للحضور في أودو (Attendance PIN Code)
  currentYearAccruedLeaves?: number;
  approvedTakenLeavesCurrentYear?: number;
   unpaid_days_count?: number;   // إجمالي الأيام بدون راتب (Odoo Computed: unpaid_days_count)
  paid_days_remaining?: number; // رصيد الإجازات المتبقي (Odoo Computed: paid_days_remaining)
  lastAccrualDate?: string;     // تاريخ آخر ترحيل آلي لرصيد الإجازات (YYYY-MM أو YYYY-MM-DD)
  accrualHistory?: Array<{
    date: string;
    month: string;
    daysAdded: number;
    previousBalance: number;
    newBalance: number;
    reason?: string;
  }>; // سجل الترحيل والاستحقاق الشهري الآلي
  resourceCalendarId?: string; // جدول ساعات العمل Odoo resource_calendar_id
  workingSchedule?: string; // مسمى جدول العمل (مثال: الدوام الصباحي القياسي 8 ساعات)
  workHoursType?: 'STANDARD' | 'FLEXIBLE' | 'PART_TIME' | 'SHIFT' | 'CUSTOM' | string; // نوع الدوام (widget="radio")
  shiftId?: string; // معرف الشفت المرتبط
  dailyWorkHours?: number; // ساعات العمل اليومية
  weeklyWorkHours?: number; // ساعات العمل الأسبوعية
  isDeleted?: boolean; // الحذف اللطيف للأرشفة (Soft Delete)
  deletedAt?: string;
}

export interface CandidateAttachment {
  id: string;
  title: string;
  type: 'CV' | 'CERTIFICATE' | 'CIVIL_ID' | 'PASSPORT' | 'EXPERIENCE_LETTER' | 'OTHER';
  fileUrl: string;
  fileName: string;
  fileSize?: string;
  uploadDate?: string;
}

export interface Candidate {
  id: string;
  companyId: string;
  fullName: string;
  email: string;
  phone: string;
  appliedPosition: string;
  department: string;
  expectedSalary: number;
  stage: 'INITIAL' | 'INTERVIEW' | 'QUALIFIED' | 'CONTRACT' | 'HIRED' | 'REFUSED';
  rating: number; // 1 to 5
  cvFileName?: string;
  cvFileUrl?: string;
  degree?: string; // المؤهل العلمي / الشهادة الدراسية (مثلاً: بكالوريوس محاسبة)
  certificates?: string[]; // قائمة الشهادات والمؤهلات الإضافية
  attachments?: CandidateAttachment[]; // المستندات والشهادات المرفقة
  tags: string[];
  notes?: string;
}

export interface Contract {
  id: string;
  employeeId: string;
  companyId: string;
  basicSalary: number; // KWD
  housingAllowance: number; // KWD
  transportAllowance: number; // KWD
  otherAllowance: number; // KWD
  contractType: 'INDEFINITE' | 'FIXED_TERM'; // غير محدد المدة / محدد المدة
  startDate: string;
  endDate?: string;
  noticePeriodDays: number;
  status: 'DRAFT' | 'RUNNING' | 'EXPIRED' | 'CANCELLED';
  resourceCalendarId?: string; // جدول ساعات العمل Odoo resource_calendar_id
  workingSchedule?: string; // مسمى جدول العمل
  workHoursType?: 'STANDARD' | 'FLEXIBLE' | 'PART_TIME' | 'SHIFT' | 'CUSTOM' | string; // نوع الدوام
  shiftId?: string; // الشفت المرتبط
  workingHoursPerWeek?: number; // ساعات العمل أسبوعياً (مثلاً 48 ساعة)
  dailyWorkHours?: number; // ساعات العمل اليومية (مثلاً 8 ساعات)
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  companyId: string;
  leaveType: 'ANNUAL' | 'SICK' | 'MATERNITY' | 'HAJJ' | 'UNPAID' | 'COMPASSIONATE' | 'HOURLY_PERMISSION' | 'COMPENSATORY';
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: 'DRAFT' | 'SUBMITTED' | 'PENDING_MANAGER' | 'PENDING_HR' | 'APPROVED' | 'REJECTED';
  validatedBy?: string;        // Odoo: hr.group_hr_user validation
  validatedAt?: string;        // تاريخ الاعتماد الرسمي
  hrNote?: string;             // ملاحظات الموارد البشرية
  attachments?: string[];
  createdAt: string;
  permissionMinutes?: number; // مدة الاستئذان بالدقائق (مثلاً 120 دقيقة = 2 ساعة)
  permissionTimeFrom?: string; // وقت بداية الاستئذان (e.g. "09:00")
  permissionTimeTo?: string;   // وقت نهاية الاستئذان (e.g. "11:00")
  workedHolidayDate?: string;  // تاريخ يوم العطلة المُداوَم فيه (طلب إجازة تعويضية)
  compCreditDays?: number;     // رصيد الأيام البديلة الممنوحة عند الاعتماد (عادة 1 يوم)
  isHistorical?: boolean;      // سجل إجازة تاريخية/سابقة (أرشيف وكشف حساب فقط، لا تؤثر على مسير الرواتب الحالية)
  historicalYear?: number;     // السنة التاريخية للإجازة (مثلاً 2022، 2023، 2024، 2025)
  paidDays?: number;           // أيام مغطاة من رصيد الإجازات
  unpaidDays?: number;
  dailyWage?: number;
  leaveAmount?: number;
  totalAvailableBalance?: number;
  excessDays?: number;         // أيام زائدة بدون راتب (تخصم من مدة الخدمة فقط بخصم مالي 0.000 د.ك)
  managerOverride?: boolean;   // تجاوز قيود النظام من قبل المدير للإجازات التي تتجاوز 30 يوماً
  managerOverrideNote?: string;// بيان وموافقة المدير لتجاوز حد 30 يوماً
  allocationBreakdown?: Array<{
    allocationId: string;
    allocationName: string;
    allocationType: 'regular' | 'accrual';
    daysUsed: number;
  }>; // تتبع استهلاك التخصيصات بنظام FIFO
}

// -------------------------------------------------------------------------
// Odoo Leave Allocation Model (hr.leave.allocation)
// -------------------------------------------------------------------------
export interface HrLeaveAllocation {
  id: string;
  name: string; // e.g. "تخصيص رصيد سنوي افتتاحي" or "استحقاق شهري آلي 2.5 يوم"
  employeeId: string;
  companyId: string;
  leaveType: 'ANNUAL' | 'SICK' | 'MATERNITY' | 'HAJJ' | 'UNPAID' | 'COMPASSIONATE' | 'HOURLY_PERMISSION' | 'COMPENSATORY';
  allocationType: 'regular' | 'accrual'; // 'regular' for fixed opening balance, 'accrual' for monthly plan
  accrualMonthKey?: string; // e.g. '2026-08'
  numberOfDays: number; // إجمالي الأيام المخصصة
  consumedDays?: number; // الأيام المستهلكة وفق مبدأ FIFO
  remainingDays?: number; // الأيام المتبقية
  dateFrom: string; // YYYY-MM-DD
  dateTo?: string;
  expiryDate?: string;
  state: 'draft' | 'confirm' | 'validate' | 'refuse';
  notes?: string;
  createdAt: string;
}

export type LeaveAllocation = HrLeaveAllocation;

export interface BiometricDevice {
  id: string;
  companyId: string;
  name: string; // اسم الجهاز (مثلاً: جهاز بوابة الجهراء)
  ipAddress: string; // عنوان IP للجهاز
  port: number; // المنفذ (Port) default: 4370
  mapId: number; // معرف الجهاز (Device ID) default: 1
  state: 'draft' | 'connected' | 'error'; // حالة الجهاز
  deviceModel?: string; // e.g. "ZKTeco K40 / SilkBio-101TC"
  location?: string; // الموقع أو الفرع
  lastSyncTime?: string; // تاريخ آخر مزامنة
  logsCount?: number; // عدد الحركات المسحوبة
  notes?: string;
  createdAt?: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  companyId: string;
  date: string;
  checkIn: string; // HH:mm
  checkOut: string; // HH:mm
  punches?: { in: string; out: string; }[]; // لدعم الشفتات المتعددة (Split Shifts)
  workHours: number;
  overtimeHours: number;
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'ON_LEAVE';
  latenessMinutes: number;
  earlyLeaveMinutes?: number;
}

export interface Payslip {
  id: string;
  employeeId: string;
  companyId: string;
  month: string; // YYYY-MM
  basicSalary: number;
  allowances: number;
  grossSalary: number;
  latenessDeduction: number;
  pifssDeduction?: number;
  unpaidLeaveDays?: number;
  unpaidLeaveDeduction?: number;
  loanDeduction?: number;
  overtimeAmount?: number;
  housingAllowance?: number;
  transportAllowance?: number;
  otherAllowance?: number;
  notes?: string;
  otherDeductions: number;
  netSalary: number; // 0.000 KWD
  paymentStatus: 'DRAFT' | 'APPROVED' | 'PAID';
  paymentDate?: string;
}

export interface EOSCalculation {
  employeeId: string;
  employeeName: string;
  civilId: string;
  joinDate: string;
  leaveDate: string;
  totalYears: number;
  totalMonths: number;
  totalDays: number;
  lastGrossSalary: number; // الراتب الإجمالي الأخير
  terminationType: 'RESIGNATION' | 'TERMINATION' | 'RETIREMENT' | 'CONTRACT_EXPIRED';
  contractType: 'INDEFINITE' | 'FIXED_TERM';
  
  // Kuwait Labor Law Unpaid Leaves Deduction & Net Service Period (المادة 51)
  grossServiceDays?: number;
  totalUnpaidLeaveDays?: number;
  netServiceDays?: number;
  unpaidLeavesCount?: number;
  unpaidLeavesBreakdown?: Array<{
    id: string;
    startDate: string;
    endDate: string;
    days: number;
    reason: string;
  }>;
  
  // Articles 51 & 53 Kuwait Law
  first5YearsEntitlementDays: number; // 15 days/year
  after5YearsEntitlementDays: number; // 30 days/year
  grossEosAmount: number;
  
  article53Ratio: number; // 0%, 50%, 66.6%, 100%
  article53Note: string;
  netEosAmount: number;
  
  unusedLeaveDays: number;
  leavePayoutAmount: number;
  
  otherDeductions: number;
  totalSettlement: number; // Final payout 0.000 KWD
}

export interface DocumentItem {
  id: string;
  companyId: string;
  employeeId?: string; // NULL if company-wide document
  title: string; // اسم المستند (مثل: الترخيص التجاري)
  category: 'CIVIL_ID' | 'PASSPORT' | 'WORK_CONTRACT' | 'MOH_LICENSE' | 'COMPANY_DEED' | 'COMPANY_LICENSE' | 'CONTRACT' | 'RESIDENCY' | 'OTHER';
  folderPath?: string;
  documentType?: 'COMPANY_LICENSE' | 'EMPLOYEE_PASSPORT' | 'CIVIL_ID' | 'CONTRACT' | 'MOH_LICENSE' | 'COMPANY_DEED' | 'OTHER' | string;
  documentNumber?: string; // رقم المستند/الترخيص
  fileUrl: string;
  fileName?: string;
  fileSize?: string;
  uploadDate?: string;
  issueDate?: string; // تاريخ الإصدار
  expiryDate: string; // تاريخ الانتهاء (أساسي للتنبيه)
  status: 'active' | 'near_expiry' | 'expired' | 'ACTIVE' | 'VALID' | 'EXPIRING_SOON' | 'EXPIRED';
  createdAt?: string;
  tags?: string[];
  ocrExtractedData?: Record<string, any>;
}

export interface AutomationRule {
  id: string;
  companyId: string;
  name: string;
  trigger: 'CIVIL_ID_EXPIRING' | 'LEAVE_SUBMITTED' | 'CANDIDATE_HIRED' | 'EOS_CALCULATED' | 'ATTENDANCE_LATE';
  triggerDaysBefore?: number;
  action: 'SEND_NOTIFICATION' | 'AUTO_CREATE_TASK' | 'REQUIRE_APPROVAL' | 'GENERATE_PAYSLIP_DRAFT' | 'WEBHOOK';
  actionTarget: string;
  active: boolean;
  lastExecuted?: string;
  executionCount: number;
}

export interface CustodyItem {
  id: string;
  companyId: string;
  employeeId: string;
  itemCode: string;
  itemName: string;
  itemCategory: 'ELECTRONICS' | 'VEHICLE' | 'SIM_PHONE' | 'FINANCIAL_CARD' | 'TOOLS' | 'OTHER';
  serialNumber?: string;
  handoverDate: string;
  returnDate?: string;
  expiryDate?: string; // موعد الانتهاء للسيارات أو الضمان
  valueKwd: number; // KWD
  condition: 'EXCELLENT' | 'GOOD' | 'NEEDS_REPAIR' | 'DAMAGED';
  status: 'ASSIGNED' | 'RETURNED' | 'DAMAGED' | 'PENDING';
  notes?: string;
}

export interface LoanAdvance {
  id: string;
  companyId: string;
  employeeId: string;
  amount: number; // KWD 0.000
  monthlyDeduction: number; // KWD 0.000
  startDate: string;
  totalInstallments: number;
  paidInstallments: number;
  remainingAmount: number; // KWD
  reason: string;
  status: 'DRAFT' | 'APPROVED' | 'IN_REPAYMENT' | 'COMPLETED' | 'CANCELLED';
  paymentMethod: 'SALARY_DEDUCTION' | 'CASH' | 'BANK_TRANSFER';
  approvedBy?: string;
  notes?: string;
}

export interface DisciplinaryWarning {
  id: string;
  companyId: string;
  employeeId: string;
  warningCode: string;
  warningType: 'FIRST_WARNING' | 'SECOND_WARNING' | 'FINAL_WARNING' | 'DEDUCTION_NOTICE' | 'SUSPENSION';
  violationDate: string;
  issueDate: string;
  subject: string;
  violationDetails: string;
  legalArticleNote?: string; // e.g., "المادة 28 من قانون العمل الكويتي رقم 6 لسنة 2010"
  deductionDays?: number; // عدد أيام الخصم من الراتب
  status: 'DRAFT' | 'ISSUED' | 'ACKNOWLEDGED' | 'CANCELLED';
  attachments?: string[];
}

export interface EmployeeNote {
  id: string;
  companyId: string;
  employeeId: string;
  authorName: string;
  date: string;
  category: 'EVALUATION' | 'GENERAL' | 'PERFORMANCE' | 'COMPLIANCE' | 'INCIDENT';
  priority: 'NORMAL' | 'IMPORTANT' | 'URGENT';
  title: string;
  content: string;
  isConfidential?: boolean;
}

export interface DocumentTemplate {
  id: string;
  companyId: string;
  templateCode: string;
  titleAr: string;
  titleEn: string;
  category: 'EXPERIENCE_CERTIFICATE' | 'SALARY_CERTIFICATE' | 'WORK_CONTRACT' | 'LEAVE_PERMISSION' | 'WARNING_LETTER' | 'GENERAL' | 'التعيين والتعاقد' | 'المعاملات البنكية والرسمية' | 'الحركة اليومية والإجازات' | 'الشؤون القانونية وإنهاء الخدمة' | string;
  contentHtml: string;
  contentHtmlEn?: string;
  variables: string[]; // e.g. ['full_name', 'civil_id', 'salary', 'job_title', 'company_name', 'join_date']
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedDocument {
  id: string;
  companyId: string;
  employeeId: string;
  templateId: string;
  templateTitle: string;
  documentNumber: string; // e.g. "DOC-2026-0001"
  issueDate: string;
  language?: 'AR' | 'EN';
  contentHtml: string; // filled content snapshot
  snapshotData: {
    fullNameAr: string;
    civilId: string;
    jobTitle: string;
    department: string;
    basicSalary: number;
    totalSalary: number;
    joinDate: string;
    companyNameAr: string;
    commercialRegNo: string;
    passportNo?: string;
  };
  pdfUrl?: string;
  issuedBy?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  companyId: string;
  timestamp: string;
  userId?: string;
  userName?: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'SOFT_DELETE' | 'RESTORE' | 'EXPORT' | 'ISSUE' | 'LOGIN' | 'LOGOUT';
  entity: 'EMPLOYEE' | 'CONTRACT' | 'DOCUMENT' | 'PAYROLL' | 'LEAVE' | 'TEMPLATE' | 'CUSTODY' | 'SYSTEM';
  entityId?: string;
  details: string;
  ipAddress?: string;
}

export interface EmploymentCommencement {
  id: string;
  employeeId: string;
  companyId: string;
  actualJoiningDate: string; // تاريخ المباشرة الفعلي
  contractType: 'INDEFINITE' | 'FIXED_TERM';
  shiftId: string; // الشفت المخصص
  resourceCalendarId?: string; // جدول ساعات العمل Odoo resource_calendar_id
  workingSchedule?: string; // مسمى جدول ساعات العمل (مثال: الدوام الصباحي القياسي 8 ساعات)
  workHoursType?: 'STANDARD' | 'FLEXIBLE' | 'PART_TIME' | 'SHIFT' | 'CUSTOM'; // نوع الدوام (widget="radio")
  dailyHours?: number; // ساعات العمل اليومية (مثال: 8 ساعات)
  weeklyHours?: number; // ساعات العمل الأسبوعية (مثال: 48 ساعة)
  workDays?: string[]; // أيام العمل الأسبوعية (مثال: السبت إلى الخميس)
  customScheduleNote?: string; // تفاصيل أو ملاحظات الساعات المخصصة
  departmentId: string;
  location: string;
  approvedBy: string;
  approvalDate: string;
  storageFolderUrl: string; // Supabase Storage archive folder
  status: 'APPROVED' | 'PENDING';
  notes?: string;
}

export interface CompanySubscription {
  id: string;
  companyName: string;
  ownerName: string;
  requesterName?: string;
  email: string;
  phone?: string;
  status: 'active' | 'suspended' | 'expired';
  planType: 'شهري' | 'سنوي' | 'مخصص' | string;
  companyId?: string;
  subscriptionFee: number; // المبلغ بالدينار الكويتي
  startDate: string;
  endDate: string;
}

export interface EmployeeNotification {
  id: string;
  companyId: string;
  employeeId: string;
  employeeName: string;
  recipientPhone: string; // e.g. "+965 99887766"
  channel: 'WHATSAPP' | 'SMS' | 'SYSTEM_ALERT';
  triggerType: 
    | 'MOH_RENEWAL' 
    | 'CIVIL_ID_RENEWAL' 
    | 'RESIDENCY_RENEWAL' 
    | 'LEAVE_APPROVAL' 
    | 'HR_ACTION_REQUIRED' 
    | 'PAYROLL_SALARY' 
    | 'DIRECT_MESSAGE';
  title: string;
  message: string;
  sentAt: string; // ISO string
  status: 'SENT' | 'DELIVERED' | 'FAILED';
  metadata?: {
    expiryDate?: string;
    leaveStartDate?: string;
    leaveEndDate?: string;
    remainingLeaveDays?: number;
    returnWorkDate?: string;
    actionReason?: string;
    salaryMonth?: string;
    netSalary?: number;
    bankName?: string;
    iban?: string;
    wsiBatchRef?: string;
  };
}

export interface DailyMovement {
  id: string;
  name: string; // e.g. "MOV/2026/00001"
  employeeId: string;
  companyId: string;
  date: string; // YYYY-MM-DD
  movementType: 'permission' | 'sick' | 'allowance' | 'other';
  hourFrom?: number;
  hourTo?: number;
  totalHours?: number;
  amount?: number; // KWD
  state: 'draft' | 'approved' | 'refused';
  createdAt?: string;
  notes?: string;
}

export type ActiveApp = 
  | 'APP_LAUNCHER'
  | 'EMPLOYEES'
  | 'RECRUITMENT'
  | 'CONTRACTS'
  | 'LEAVES'
  | 'HOLIDAYS'
  | 'SHIFTS'
  | 'ATTENDANCE'
  | 'PAYROLL'
  | 'EOS'
  | 'DOCUMENTS'
  | 'DOCUMENT_TEMPLATES'
  | 'CUSTODY_LOANS'
  | 'AUTOMATION'
  | 'NOTIFICATIONS'
  | 'AUDIT_LOGS'
  | 'AI_COPILOT'
  | 'COMMENCEMENT'
  | 'REPORTS'
  | 'EXCLUSIVE_INNOVATIONS'
  | 'INNOVATIONS'
  | 'SAAS_ADMIN'
  | 'COMPANIES'
  | 'SETTINGS'
  | 'DAILY_MOVEMENTS'
  | 'HOLIDAY_WORK'
  | 'LEAVE_TYPES_CONFIG';

export type ViewMode = 'KANBAN' | 'LIST' | 'FORM' | 'PIVOT' | 'GRAPH';


export interface ShiftProfile {
  id: string;
  companyId: string;
  name: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  type: 'MORNING' | 'EVENING' | 'CONTINUOUS' | 'SPLIT';
  color: string;
}

export interface EmployeeShift {
  id: string;
  companyId: string;
  employeeId: string;
  shiftId: string;
  date: string; // YYYY-MM-DD
}

// -------------------------------------------------------------------------
// System Integrations & External API Config
// -------------------------------------------------------------------------
export interface CompanyBranch {
  id: string;
  companyId: string;
  branchName: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  isActive: boolean;
  address?: string;
  notes?: string;
  createdAt?: string;
}

export interface WhatsAppGatewayConfig {
  instanceId: string;
  apiToken: string;
  defaultCountryCode: string; // e.g. "+965"
  serverUrl?: string;
  isActive: boolean;
  webhookUrl?: string;
}

export interface SystemIntegrationsConfig {
  id: string;
  companyId: string;
  publicVerificationDomain: string; // e.g. "https://verify.kuwait-hr.com"
  whatsAppGateway: WhatsAppGatewayConfig;
  branches: CompanyBranch[];
  updatedAt?: string;
}

// -------------------------------------------------------------------------
// Odoo Languages Model (res.lang)
// -------------------------------------------------------------------------
export interface ResLang {
  id: string;
  name: string;
  code: string; // 'ar_001' | 'en_US'
  isoCode: string; // 'ar' | 'en'
  direction: 'rtl' | 'ltr';
  active: boolean;
  dateFormat: string;
  timeFormat: string;
  decimalPoint: string;
  thousandsSep: string;
  flag: string;
}
