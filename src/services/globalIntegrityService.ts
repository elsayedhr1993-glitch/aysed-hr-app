import { Employee, Contract, LeaveRequest, AttendanceRecord, Payslip } from '../types';
import { validateKuwaitCivilId, parseKuwaitCivilId, formatKWD } from '../utils/kuwaitLaw';
import { validateSettlementConstraints } from '../utils/leaveEngine';

export type IntegritySeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface IntegrityIssue {
  id: string;
  module: 'HR_CORE' | 'ATTENDANCE' | 'LEAVES' | 'PAYROLL';
  entityId: string;
  entityName: string;
  code: string;
  message: string;
  severity: IntegritySeverity;
  field?: string;
  suggestedFix?: string;
  canAutoFix?: boolean;
  metadata?: Record<string, any>;
}

export interface ModuleIntegritySummary {
  module: 'HR_CORE' | 'ATTENDANCE' | 'LEAVES' | 'PAYROLL';
  moduleNameAr: string;
  totalChecked: number;
  validCount: number;
  issuesCount: number;
  criticalCount: number;
  warningCount: number;
  score: number; // 0 - 100%
  status: 'OPTIMAL' | 'WARNING' | 'CRITICAL';
}

export interface GlobalIntegrityReport {
  timestamp: string;
  overallScore: number;
  overallStatus: 'OPTIMAL' | 'WARNING' | 'CRITICAL';
  totalIssues: number;
  criticalIssues: number;
  warningIssues: number;
  modules: Record<string, ModuleIntegritySummary>;
  issues: IntegrityIssue[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  integrityScore: number;
}

// -----------------------------------------------------------------------------
// 1. HR CORE INTEGRITY VALIDATION
// -----------------------------------------------------------------------------

export function validateEmployeeIntegrity(
  emp: Partial<Employee>,
  existingEmployees: Employee[] = []
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Name check
  if (!emp.fullNameAr || emp.fullNameAr.trim().length < 3) {
    errors.push('اسم الموظف باللغة العربية مطلوب ويجب ألا يقل عن 3 أحرف.');
  }

  // Civil ID check
  if (!emp.civilId || emp.civilId.trim().length === 0) {
    errors.push('الرقم المدني الكويتي مطلوب إجبارياً.');
  } else {
    const cleanCivilId = emp.civilId.trim();
    if (!/^\d{12}$/.test(cleanCivilId)) {
      errors.push('الرقم المدني الكويتي يجب أن يتكون من 12 رقماً تماماً.');
    } else {
      const civilValidation = validateKuwaitCivilId(cleanCivilId);
      if (!civilValidation.isValid) {
        warnings.push(`الرقم المدني قد يحتوي على عدم تطابق حسابي: ${civilValidation.message || 'تحقق من صحة الرقم'}`);
      }

      // Check uniqueness among existing non-deleted employees
      const duplicateCivil = existingEmployees.find(
        e => e.id !== emp.id && !e.isDeleted && e.civilId && e.civilId.trim() === cleanCivilId
      );
      if (duplicateCivil) {
        errors.push(`الرقم المدني [${cleanCivilId}] مسجل مسبقاً للموظف (${duplicateCivil.fullNameAr}).`);
      }
    }
  }

  // Employee Code Uniqueness
  if (emp.employeeCode && emp.employeeCode.trim()) {
    const cleanCode = emp.employeeCode.trim();
    const duplicateCode = existingEmployees.find(
      e => e.id !== emp.id && !e.isDeleted && e.employeeCode && e.employeeCode.trim().toLowerCase() === cleanCode.toLowerCase()
    );
    if (duplicateCode) {
      warnings.push(`كود الموظف [${cleanCode}] مكرر مع موظف آخر (${duplicateCode.fullNameAr}).`);
    }
  }

  // Dates sanity check
  if (emp.joinDate && emp.dob) {
    const joinTime = new Date(emp.joinDate).getTime();
    const dobTime = new Date(emp.dob).getTime();
    const ageAtJoinYears = (joinTime - dobTime) / (1000 * 60 * 60 * 24 * 365.25);
    if (ageAtJoinYears < 16) {
      errors.push('تاريخ التعيين غير منطقي (عمر الموظف عند التعيين أقل من 16 عاماً وفق قانون العمل).');
    }
  }

  // Kuwaiti nationality check
  if (emp.isKuwaiti && emp.residencyType && emp.residencyType !== 'كويتي' && emp.residencyType !== 'مواطن') {
    warnings.push('الموظف محدد ككويتي الجنسية بينما نوع الإقامة ليس "مواطن" أو "كويتي".');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    integrityScore: errors.length > 0 ? 0 : Math.max(50, 100 - warnings.length * 15)
  };
}

export function validateContractIntegrity(
  contract: Partial<Contract>,
  existingContracts: Contract[] = []
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Salary Check
  const basic = Number(contract.basicSalary);
  if (isNaN(basic) || basic <= 0) {
    errors.push('الراتب الأساسي في العقد يجب أن يكون قيمة موجبة أكبر من صفر.');
  }

  // Single Active Contract Rule
  const isRunning = contract.status === 'RUNNING' || (contract.status as string) === 'ACTIVE';
  if (isRunning && contract.employeeId) {
    const duplicateActive = existingContracts.find(
      c => c.employeeId === contract.employeeId &&
           c.id !== contract.id &&
           (c.status === 'RUNNING' || (c.status as string) === 'ACTIVE')
    );
    if (duplicateActive) {
      errors.push('لا يمكن وجود أكثر من عقد بحالة نشطة (Active/Running) لنفس الموظف.');
    }
  }

  // Working Hours (Kuwait Labor Law Article 64: Max 8 hours/day, 48 hours/week)
  const dailyHours = contract.plannedDailyHours || contract.dailyWorkHours || 8;
  if (dailyHours > 12) {
    warnings.push(`ساعات العمل اليومية (${dailyHours} س) تتجاوز الحد المعتاد بقانون العمل الكويتي (8 ساعات).`);
  }
  if (dailyHours < 4) {
    warnings.push(`ساعات العمل اليومية (${dailyHours} س) منخفضة جداً.`);
  }

  // Date sequence for fixed-term contracts
  if (contract.contractType === 'FIXED_TERM' && contract.startDate && contract.endDate) {
    if (new Date(contract.endDate) <= new Date(contract.startDate)) {
      errors.push('تاريخ انتهاء العقد محدد المدة يجب أن يكون لاحقاً لتاريخ البداية.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    integrityScore: errors.length > 0 ? 0 : Math.max(50, 100 - warnings.length * 15)
  };
}

// -----------------------------------------------------------------------------
// 2. ATTENDANCE & BIOMETRIC INTEGRITY VALIDATION
// -----------------------------------------------------------------------------

export function validateAttendanceIntegrity(
  record: Partial<AttendanceRecord>,
  existingRecords: AttendanceRecord[] = []
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!record.employeeId) {
    errors.push('معرف الموظف مطلوب في سجل الحضور.');
  }
  if (!record.date) {
    errors.push('تاريخ تسجيل الحضور مطلوب.');
  }

  // Punch sequence & hours logic
  if (record.checkIn && record.checkOut && record.checkIn !== '—' && record.checkOut !== '—') {
    const [inH, inM] = record.checkIn.split(':').map(Number);
    const [outH, outM] = record.checkOut.split(':').map(Number);
    
    if (!isNaN(inH) && !isNaN(outH)) {
      const inMins = inH * 60 + (inM || 0);
      const outMins = outH * 60 + (outM || 0);

      if (outMins < inMins) {
        errors.push(`وقت الانصراف (${record.checkOut}) يسبق وقت الحضور (${record.checkIn}) في نفس اليوم.`);
      } else {
        const calculatedHours = (outMins - inMins) / 60;
        if (calculatedHours > 16) {
          warnings.push(`ساعات العمل المحسوبة (${calculatedHours.toFixed(1)} س) مرتفعة جداً؛ يرجى مراجعة البصمة.`);
        }
        if (record.workHours !== undefined && Math.abs(record.workHours - calculatedHours) > 0.5) {
          warnings.push(`يوجد تباين بين ساعات العمل المسجلة (${record.workHours} س) والمحسوبة (${calculatedHours.toFixed(2)} س).`);
        }
      }
    }
  }

  // Duplicate movement prevention
  if (record.employeeId && record.date && record.checkIn && record.checkIn !== '—') {
    const duplicate = existingRecords.find(
      a => a.employeeId === record.employeeId &&
           a.date === record.date &&
           a.checkIn === record.checkIn &&
           a.id !== record.id
    );
    if (duplicate) {
      errors.push(`توجد حركة بصمة مسجلة مسبقاً لنفس الموظف في نفس التاريخ والوقت (${record.date} ${record.checkIn}).`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    integrityScore: errors.length > 0 ? 0 : Math.max(50, 100 - warnings.length * 15)
  };
}

// -----------------------------------------------------------------------------
// 3. LEAVES & SETTLEMENTS INTEGRITY VALIDATION
// -----------------------------------------------------------------------------

export function validateLeaveRequestIntegrity(
  leave: Partial<LeaveRequest>,
  existingLeaves: LeaveRequest[] = [],
  employeeBalance: number = 30
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!leave.employeeId) {
    errors.push('يرجى تحديد الموظف صاحب طلب الإجازة.');
  }

  if (!leave.startDate || !leave.endDate) {
    errors.push('تاريخ بداية ونهاية الإجازة مطلوبان.');
  } else {
    if (new Date(leave.endDate) < new Date(leave.startDate)) {
      errors.push('تاريخ نهاية الإجازة يجب أن يكون في أو بعد تاريخ البداية.');
    }

    // Overlap prevention with other approved/pending leaves
    if (leave.employeeId) {
      const overlapping = existingLeaves.find(
        l => l.employeeId === leave.employeeId &&
             l.id !== leave.id &&
             l.status !== 'REJECTED' &&
             l.status !== 'DRAFT' &&
             !(leave.endDate! < l.startDate || leave.startDate! > l.endDate)
      );
      if (overlapping) {
        errors.push(`تتعارض تواريخ الإجازة مع إجازة أخرى مسجلة مسبقاً (${overlapping.startDate} إلى ${overlapping.endDate}).`);
      }
    }
  }

  // Balance Check for Annual Leaves
  if (leave.leaveType === 'ANNUAL' || (leave.leaveType as string) === 'annual') {
    const requested = Number(leave.totalDays) || 0;
    if (requested > employeeBalance) {
      warnings.push(`أيام الإجازة المطلوبة (${requested} يوم) تتجاوز الرصيد السنوي المتاح (${employeeBalance.toFixed(1)} يوم). سيتم احتساب الفرق كإجازة بدون راتب.`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    integrityScore: errors.length > 0 ? 0 : Math.max(50, 100 - warnings.length * 15)
  };
}

export function validateLeaveIntegrity(
  leave: Partial<LeaveRequest>,
  employees: Employee[] = [],
  existingLeaves: LeaveRequest[] = []
): ValidationResult {
  const emp = employees.find(e => e.id === leave.employeeId);
  const empBalance = emp ? (emp.paid_days_remaining !== undefined ? Number(emp.paid_days_remaining) : 30) : 30;
  return validateLeaveRequestIntegrity(leave, existingLeaves, empBalance);
}

export function validateLeaveSettlementMath(params: {
  carriedOverBalance: number;
  accruedBalance: number;
  consumedLeaveDays: number;
  remainingBalanceAfter: number;
  basicSalary: number;
  dailyWage?: number;
}): ValidationResult {
  const baseResult = validateSettlementConstraints(params);
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!baseResult.isValid) {
    baseResult.violations.forEach(v => {
      if (v.severity === 'error') errors.push(v.message);
      else warnings.push(v.message);
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    integrityScore: errors.length > 0 ? 0 : 100
  };
}

// -----------------------------------------------------------------------------
// 4. PAYROLL & PAYSLIP INTEGRITY VALIDATION
// -----------------------------------------------------------------------------

export function validatePayslipIntegrity(
  payslip: Partial<Payslip>,
  existingPayslips: Payslip[] = []
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!payslip.employeeId) {
    errors.push('معرف الموظف مفقود في كشف الراتب.');
  }
  if (!payslip.month || !/^\d{4}-\d{2}$/.test(payslip.month)) {
    errors.push('شهر المسير يجب أن يكون بالصيغة القياسية YYYY-MM.');
  }

  const basic = Number(payslip.basicSalary) || 0;
  const allowances = Number(payslip.allowances) || 0;
  const overtime = Number(payslip.overtimeAmount) || 0;
  const lateness = Number(payslip.latenessDeduction) || 0;
  const unpaid = Number(payslip.unpaidLeaveDeduction) || 0;
  const loans = Number(payslip.loanDeduction) || 0;
  const otherDed = Number(payslip.otherDeductions) || 0;
  const reportedNet = Number(payslip.netSalary) || 0;

  if (basic <= 0) {
    errors.push('الراتب الأساسي في مسير الراتب يجب أن يكون أكبر من الصفر.');
  }

  // Kuwait Law Rule: Daily Wage = Basic / 26
  const expectedDailyWage = Number((basic / 26).toFixed(3));

  // Mathematical Integrity Equation:
  // Gross = Basic + Allowances
  // Total Deductions = lateness + unpaid + loans + otherDed
  // Expected Net = (Basic + Allowances + Overtime) - Total Deductions
  const gross = basic + allowances;
  const totalDeductions = lateness + unpaid + loans + otherDed;
  const expectedNet = Number((gross + overtime - totalDeductions).toFixed(3));

  // Verify reportedNet vs expectedNet
  if (Math.abs(reportedNet - expectedNet) > 0.05) {
    warnings.push(`عدم تطابق حسابي في صافي الراتب: المسجل (${reportedNet.toFixed(3)}) د.ك والمحسوب رياضياً (${expectedNet.toFixed(3)}) د.ك.`);
  }

  // Non-negative Net Salary Rule
  if (reportedNet < 0) {
    errors.push(`صافي الراتب لا يمكن أن يكون سالباً (${reportedNet.toFixed(3)} د.ك). يجب معالجة الخصومات الزائدة.`);
  }

  // Duplicate Payslip in Same Month Check
  if (payslip.employeeId && payslip.month) {
    const duplicate = existingPayslips.find(
      p => p.employeeId === payslip.employeeId &&
           p.month === payslip.month &&
           p.id !== payslip.id
    );
    if (duplicate) {
      errors.push(`يوجد مسير راتب معتمد ومسجل مسبقاً لنفس الموظف لشهر (${payslip.month}).`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    integrityScore: errors.length > 0 ? 0 : Math.max(50, 100 - warnings.length * 20)
  };
}

// -----------------------------------------------------------------------------
// 5. GLOBAL SYSTEM INTEGRITY AUDIT ENGINE
// -----------------------------------------------------------------------------

export function runGlobalSystemIntegrityAudit(data: {
  employees: Employee[];
  contracts: Contract[];
  attendance: AttendanceRecord[];
  leaves: LeaveRequest[];
  payslips: Payslip[];
}): GlobalIntegrityReport {
  const issues: IntegrityIssue[] = [];

  const { employees = [], contracts = [], attendance = [], leaves = [], payslips = [] } = data;
  const activeEmployees = employees.filter(e => !e.isDeleted);

  // 1. Audit HR Core
  let hrCoreIssues = 0;
  let hrCoreCritical = 0;
  let hrCoreWarning = 0;

  activeEmployees.forEach(emp => {
    // 1. Name check
    if (!emp.fullNameAr || emp.fullNameAr.trim().length < 3) {
      hrCoreIssues++;
      hrCoreCritical++;
      issues.push({
        id: `issue-emp-name-${emp.id}`,
        module: 'HR_CORE',
        entityId: emp.id,
        entityName: emp.fullNameAr || emp.id,
        code: 'HR_CORE_INVALID_NAME',
        message: 'اسم الموظف باللغة العربية مطلوب ويجب ألا يقل عن 3 أحرف.',
        severity: 'CRITICAL',
        field: 'fullNameAr',
        suggestedFix: 'يرجى إدخال اسم الموظف ثلاثياً باللغة العربية'
      });
    }

    // 2. Civil ID check
    if (!emp.civilId || emp.civilId.trim().length === 0) {
      hrCoreIssues++;
      hrCoreCritical++;
      issues.push({
        id: `issue-emp-civil-${emp.id}`,
        module: 'HR_CORE',
        entityId: emp.id,
        entityName: emp.fullNameAr || emp.id,
        code: 'HR_CORE_MISSING_CIVIL_ID',
        message: 'الرقم المدني الكويتي مطلوب إجبارياً.',
        severity: 'CRITICAL',
        field: 'civilId',
        suggestedFix: 'إدخال الرقم المدني الكويتي المكون من 12 رقماً'
      });
    } else {
      const cleanCivilId = emp.civilId.trim();
      if (!/^\d{12}$/.test(cleanCivilId)) {
        hrCoreIssues++;
        hrCoreCritical++;
        issues.push({
          id: `issue-emp-civil-len-${emp.id}`,
          module: 'HR_CORE',
          entityId: emp.id,
          entityName: emp.fullNameAr || emp.id,
          code: 'HR_CORE_INVALID_CIVIL_LENGTH',
          message: 'الرقم المدني الكويتي يجب أن يتكون من 12 رقماً تماماً.',
          severity: 'CRITICAL',
          field: 'civilId',
          suggestedFix: 'تصحيح طول الرقم المدني ليكون 12 رقماً'
        });
      } else {
        const civilValidation = validateKuwaitCivilId(cleanCivilId);
        if (!civilValidation.isValid) {
          hrCoreIssues++;
          hrCoreWarning++;
          issues.push({
            id: `issue-emp-civil-algo-${emp.id}`,
            module: 'HR_CORE',
            entityId: emp.id,
            entityName: emp.fullNameAr || emp.id,
            code: 'HR_CORE_CIVIL_MISMATCH',
            message: `الرقم المدني قد يحتوي على عدم تطابق حسابي: ${civilValidation.message || 'تحقق من صحة الرقم'}`,
            severity: 'WARNING',
            field: 'civilId',
            suggestedFix: 'مراجعة وتدقيق أرقام البطاقة المدنية'
          });
        }
        const duplicateCivil = activeEmployees.find(
          e => e.id !== emp.id && !e.isDeleted && e.civilId && e.civilId.trim() === cleanCivilId
        );
        if (duplicateCivil) {
          hrCoreIssues++;
          hrCoreCritical++;
          issues.push({
            id: `issue-emp-civil-dup-${emp.id}`,
            module: 'HR_CORE',
            entityId: emp.id,
            entityName: emp.fullNameAr || emp.id,
            code: 'HR_CORE_DUPLICATE_CIVIL',
            message: `الرقم المدني [${cleanCivilId}] مسجل مسبقاً للموظف (${duplicateCivil.fullNameAr}).`,
            severity: 'CRITICAL',
            field: 'civilId',
            suggestedFix: 'إزالة التكرار وتصحيح الرقم المدني'
          });
        }
      }
    }

    // 3. Employee Code check
    if (emp.employeeCode && emp.employeeCode.trim()) {
      const cleanCode = emp.employeeCode.trim();
      const duplicateCode = activeEmployees.find(
        e => e.id !== emp.id && !e.isDeleted && e.employeeCode && e.employeeCode.trim().toLowerCase() === cleanCode.toLowerCase()
      );
      if (duplicateCode) {
        hrCoreIssues++;
        hrCoreWarning++;
        issues.push({
          id: `issue-emp-code-dup-${emp.id}`,
          module: 'HR_CORE',
          entityId: emp.id,
          entityName: emp.fullNameAr || emp.id,
          code: 'HR_CORE_DUPLICATE_CODE',
          message: `كود الموظف [${cleanCode}] مكرر مع موظف آخر (${duplicateCode.fullNameAr}).`,
          severity: 'WARNING',
          field: 'employeeCode',
          suggestedFix: 'تخصيص كود وظيفي فريد'
        });
      }
    }

    // 4. Dates check
    if (emp.joinDate && emp.dob) {
      const joinTime = new Date(emp.joinDate).getTime();
      const dobTime = new Date(emp.dob).getTime();
      const ageAtJoinYears = (joinTime - dobTime) / (1000 * 60 * 60 * 24 * 365.25);
      if (ageAtJoinYears < 16) {
        hrCoreIssues++;
        hrCoreCritical++;
        issues.push({
          id: `issue-emp-age-${emp.id}`,
          module: 'HR_CORE',
          entityId: emp.id,
          entityName: emp.fullNameAr || emp.id,
          code: 'HR_CORE_INVALID_AGE',
          message: 'تاريخ التعيين غير منطقي (عمر الموظف عند التعيين أقل من 16 عاماً وفق قانون العمل).',
          severity: 'CRITICAL',
          field: 'joinDate',
          suggestedFix: 'تعديل تاريخ التعيين أو تاريخ الميلاد'
        });
      }
    }

    // 5. Kuwaiti nationality & Residency type check
    const isKW = emp.isKuwaiti || (emp.nationality && (emp.nationality.includes('كويت') || emp.nationality.toUpperCase().includes('KUWAIT')));
    if (isKW && emp.residencyType && emp.residencyType !== 'كويتي' && emp.residencyType !== 'مواطن') {
      hrCoreIssues++;
      hrCoreWarning++;
      issues.push({
        id: `issue-emp-res-${emp.id}`,
        module: 'HR_CORE',
        entityId: emp.id,
        entityName: emp.fullNameAr || emp.id,
        code: 'HR_CORE_RESIDENCY_MISMATCH',
        message: 'الموظف محدد ككويتي الجنسية بينما نوع الإقامة ليس "مواطن" أو "كويتي".',
        severity: 'WARNING',
        field: 'residencyType',
        suggestedFix: 'تعديل نوع الإقامة إلى "مواطن"'
      });
    }

    // Check corresponding contract
    const contract = contracts.find(c => c.employeeId === emp.id && (c.status === 'RUNNING' || (c.status as string) === 'ACTIVE'));
    if (!contract) {
      hrCoreIssues++;
      hrCoreWarning++;
      issues.push({
        id: `issue-no-cnt-${emp.id}`,
        module: 'HR_CORE',
        entityId: emp.id,
        entityName: emp.fullNameAr,
        code: 'HR_CORE_NO_ACTIVE_CONTRACT',
        message: 'لا يوجد عقد عمل نشط (Running) مسجل للموظف.',
        severity: 'WARNING',
        field: 'jobTitle',
        suggestedFix: 'إنشاء أو تفعيل عقد عمل نشط'
      });
    }
  });

  contracts.forEach(cnt => {
    const v = validateContractIntegrity(cnt, contracts);
    const emp = activeEmployees.find(e => e.id === cnt.employeeId);
    const empName = emp?.fullNameAr || cnt.employeeId;
    v.errors.forEach(err => {
      hrCoreIssues++;
      hrCoreCritical++;
      let field = 'basicSalary';
      if (err.includes('تاريخ انتهاء')) field = 'endDate';
      issues.push({
        id: `issue-cnt-${cnt.id}-${field}`,
        module: 'HR_CORE',
        entityId: emp?.id || cnt.id,
        entityName: `${empName} (عقد عمل)`,
        code: 'HR_CORE_INVALID_CONTRACT',
        message: err,
        severity: 'CRITICAL',
        field: field,
        suggestedFix: 'تعديل بيانات العقد في ملف الموظف'
      });
    });
  });

  const hrScore = Math.max(0, Math.round(100 - (hrCoreCritical * 15 + hrCoreWarning * 3)));

  // 2. Audit Attendance
  let attIssues = 0;
  let attCritical = 0;
  let attWarning = 0;

  attendance.forEach(rec => {
    const v = validateAttendanceIntegrity(rec, attendance);
    const emp = activeEmployees.find(e => e.id === rec.employeeId);
    const empName = emp?.fullNameAr || rec.employeeId;

    v.errors.forEach(err => {
      attIssues++;
      attCritical++;
      issues.push({
        id: `issue-att-${rec.id}`,
        module: 'ATTENDANCE',
        entityId: rec.id,
        entityName: `${empName} (${rec.date})`,
        code: 'ATTENDANCE_TIME_MISMATCH',
        message: err,
        severity: 'CRITICAL'
      });
    });
    v.warnings.forEach(warn => {
      attIssues++;
      attWarning++;
      issues.push({
        id: `issue-att-w-${rec.id}`,
        module: 'ATTENDANCE',
        entityId: rec.id,
        entityName: `${empName} (${rec.date})`,
        code: 'ATTENDANCE_WARNING',
        message: warn,
        severity: 'WARNING'
      });
    });
  });

  const attScore = Math.max(0, Math.round(100 - (attCritical * 12 + attWarning * 2)));

  // 3. Audit Leaves
  let leaveIssues = 0;
  let leaveCritical = 0;
  let leaveWarning = 0;

  leaves.forEach(lv => {
    const emp = activeEmployees.find(e => e.id === lv.employeeId);
    const empName = emp?.fullNameAr || lv.employeeId;
    const empBal = Number((emp as any)?.remaining_leaves ?? (emp as any)?.paid_days_remaining ?? 30);
    const v = validateLeaveRequestIntegrity(lv, leaves, empBal);

    v.errors.forEach(err => {
      leaveIssues++;
      leaveCritical++;
      issues.push({
        id: `issue-lv-${lv.id}`,
        module: 'LEAVES',
        entityId: lv.id,
        entityName: `${empName} (${lv.startDate} إلى ${lv.endDate})`,
        code: 'LEAVE_OVERLAP_OR_INVALID',
        message: err,
        severity: 'CRITICAL'
      });
    });
    v.warnings.forEach(warn => {
      leaveIssues++;
      leaveWarning++;
      issues.push({
        id: `issue-lv-w-${lv.id}`,
        module: 'LEAVES',
        entityId: lv.id,
        entityName: `${empName}`,
        code: 'LEAVE_WARNING',
        message: warn,
        severity: 'WARNING'
      });
    });
  });

  const leaveScore = Math.max(0, Math.round(100 - (leaveCritical * 15 + leaveWarning * 3)));

  // 4. Audit Payroll
  let payrollIssues = 0;
  let payrollCritical = 0;
  let payrollWarning = 0;

  payslips.forEach(ps => {
    const emp = activeEmployees.find(e => e.id === ps.employeeId);
    const empName = emp?.fullNameAr || ps.employeeId;
    const v = validatePayslipIntegrity(ps, payslips);

    v.errors.forEach(err => {
      payrollIssues++;
      payrollCritical++;
      issues.push({
        id: `issue-ps-${ps.id}`,
        module: 'PAYROLL',
        entityId: ps.id,
        entityName: `${empName} (${ps.month})`,
        code: 'PAYROLL_MATH_INTEGRITY_VIOLATION',
        message: err,
        severity: 'CRITICAL'
      });
    });
    v.warnings.forEach(warn => {
      payrollIssues++;
      payrollWarning++;
      issues.push({
        id: `issue-ps-w-${ps.id}`,
        module: 'PAYROLL',
        entityId: ps.id,
        entityName: `${empName} (${ps.month})`,
        code: 'PAYROLL_WARNING',
        message: warn,
        severity: 'WARNING'
      });
    });
  });

  const payrollScore = Math.max(0, Math.round(100 - (payrollCritical * 15 + payrollWarning * 3)));

  const totalChecked = activeEmployees.length + contracts.length + attendance.length + leaves.length + payslips.length;
  const overallScore = Math.round((hrScore + attScore + leaveScore + payrollScore) / 4);
  const totalCritical = hrCoreCritical + attCritical + leaveCritical + payrollCritical;
  const totalWarning = hrCoreWarning + attWarning + leaveWarning + payrollWarning;

  return {
    timestamp: new Date().toISOString(),
    overallScore,
    overallStatus: totalCritical > 0 ? 'CRITICAL' : totalWarning > 0 ? 'WARNING' : 'OPTIMAL',
    totalIssues: issues.length,
    criticalIssues: totalCritical,
    warningIssues: totalWarning,
    modules: {
      HR_CORE: {
        module: 'HR_CORE',
        moduleNameAr: 'سجلات الموظفين والعقود (HR Core)',
        totalChecked: activeEmployees.length + contracts.length,
        validCount: Math.max(0, activeEmployees.length + contracts.length - hrCoreIssues),
        issuesCount: hrCoreIssues,
        criticalCount: hrCoreCritical,
        warningCount: hrCoreWarning,
        score: hrScore,
        status: hrCoreCritical > 0 ? 'CRITICAL' : hrCoreWarning > 0 ? 'WARNING' : 'OPTIMAL'
      },
      ATTENDANCE: {
        module: 'ATTENDANCE',
        moduleNameAr: 'سجلات الحضور والبصمة (Attendance)',
        totalChecked: attendance.length,
        validCount: Math.max(0, attendance.length - attIssues),
        issuesCount: attIssues,
        criticalCount: attCritical,
        warningCount: attWarning,
        score: attScore,
        status: attCritical > 0 ? 'CRITICAL' : attWarning > 0 ? 'WARNING' : 'OPTIMAL'
      },
      LEAVES: {
        module: 'LEAVES',
        moduleNameAr: 'الإجازات والأرصدة والتسويات (Leaves)',
        totalChecked: leaves.length,
        validCount: Math.max(0, leaves.length - leaveIssues),
        issuesCount: leaveIssues,
        criticalCount: leaveCritical,
        warningCount: leaveWarning,
        score: leaveScore,
        status: leaveCritical > 0 ? 'CRITICAL' : leaveWarning > 0 ? 'WARNING' : 'OPTIMAL'
      },
      PAYROLL: {
        module: 'PAYROLL',
        moduleNameAr: 'مسيرات الرواتب والاستقطاعات (Payroll)',
        totalChecked: payslips.length,
        validCount: Math.max(0, payslips.length - payrollIssues),
        issuesCount: payrollIssues,
        criticalCount: payrollCritical,
        warningCount: payrollWarning,
        score: payrollScore,
        status: payrollCritical > 0 ? 'CRITICAL' : payrollWarning > 0 ? 'WARNING' : 'OPTIMAL'
      }
    },
    issues
  };
}

// -----------------------------------------------------------------------------
// 6. AUTO-FIX ALL ENGINE (الإصلاح الآلي الفوري والنزاهة التلقائية)
// -----------------------------------------------------------------------------

export interface AutoFixResult {
  fixedCount: number;
  fixedSummary: string[];
  updatedEmployees: Employee[];
  updatedAttendance: AttendanceRecord[];
  updatedContracts: Contract[];
  updatedLeaves: LeaveRequest[];
  updatedPayslips: Payslip[];
}

export function autoFixGlobalIntegrityIssues(data: {
  employees: Employee[];
  contracts: Contract[];
  attendance: AttendanceRecord[];
  leaves: LeaveRequest[];
  payslips: Payslip[];
}): AutoFixResult {
  let fixedCount = 0;
  const fixedSummary: string[] = [];

  // [1] المعالجة التلقائية للموظفين الكويتيين: تصنيف نوع الإقامة تلقائياً إلى 'مواطن'
  let kuwaitiFixedCount = 0;
  const updatedEmployees = (data.employees || []).map(emp => {
    let modified = false;
    const updated = { ...emp };

    const isKuwaitiNat = 
      emp.isKuwaiti === true ||
      (typeof emp.nationality === 'string' && /كويت|kuwait/i.test(emp.nationality)) ||
      (typeof (emp as any).nationalityAr === 'string' && /كويت|kuwait/i.test((emp as any).nationalityAr)) ||
      emp.residencyType === 'كويتي' ||
      emp.residencyType === 'مواطن';

    if (isKuwaitiNat) {
      if (updated.residencyType !== 'مواطن' && updated.residencyType !== 'كويتي') {
        updated.residencyType = 'مواطن';
        modified = true;
      }
      if (!updated.isKuwaiti) {
        updated.isKuwaiti = true;
        modified = true;
      }
      if (!updated.nationality || updated.nationality === 'OTHER') {
        updated.nationality = 'كويتي';
        modified = true;
      }
    }

    if (modified) {
      kuwaitiFixedCount++;
      fixedCount++;
    }
    return updated;
  });

  if (kuwaitiFixedCount > 0) {
    fixedSummary.push(`تم تصنيف نوع الإقامة تلقائياً إلى "مواطن" وتثبيت الجنسية الكويتية لـ (${kuwaitiFixedCount}) موظف.`);
  }

  // [2] تنظيف وإلغاء البصمات المكررة في نفس التوقيت عبر كافة السجلات بضغطة واحدة
  let attDeduplicatedCount = 0;
  let attTimeFixedCount = 0;
  const seenAttKeys = new Set<string>();
  const updatedAttendance: AttendanceRecord[] = [];

  // ترتيب الحركات زمنياً
  const sortedAtt = [...(data.attendance || [])].sort((a, b) => {
    const dComp = (a.date || '').localeCompare(b.date || '');
    if (dComp !== 0) return dComp;
    return (a.checkIn || '').localeCompare(b.checkIn || '');
  });

  sortedAtt.forEach(rec => {
    // تصفية السجلات المكررة تماماً لنفس الموظف في نفس التاريخ وبصمة الدخول
    const key = `${rec.employeeId}_${rec.date}_${rec.checkIn || 'none'}`;
    if (rec.checkIn && rec.checkIn !== '—' && seenAttKeys.has(key)) {
      attDeduplicatedCount++;
      fixedCount++;
      return; // تجاهل البصمة المكررة
    }
    seenAttKeys.add(key);

    const updatedRec = { ...rec };

    // التحقق من تتابع أوقات الحضور والانصراف (Check-In vs Check-Out)
    if (updatedRec.checkIn && updatedRec.checkOut && updatedRec.checkIn !== '—' && updatedRec.checkOut !== '—') {
      const [inH, inM] = updatedRec.checkIn.split(':').map(Number);
      const [outH, outM] = updatedRec.checkOut.split(':').map(Number);
      if (!isNaN(inH) && !isNaN(outH)) {
        const inMins = inH * 60 + (inM || 0);
        const outMins = outH * 60 + (outM || 0);
        
        let finalIn = updatedRec.checkIn;
        let finalOut = updatedRec.checkOut;

        if (outMins < inMins) {
          // الانصراف يسبق الحضور: تبديل التوقيت
          finalIn = updatedRec.checkOut;
          finalOut = updatedRec.checkIn;
          updatedRec.checkIn = finalIn;
          updatedRec.checkOut = finalOut;
          attTimeFixedCount++;
          fixedCount++;
        }

        const normInMins = Math.min(inMins, outMins);
        const normOutMins = Math.max(inMins, outMins);
        const exactWorkHours = Number(((normOutMins - normInMins) / 60).toFixed(2));
        if (updatedRec.workHours === undefined || Math.abs((updatedRec.workHours || 0) - exactWorkHours) > 0.1) {
          updatedRec.workHours = exactWorkHours;
        }
      }
    }

    // تنظيف مصفوفة البصمات الداخلية (Punches sub-array)
    if (updatedRec.punches && Array.isArray(updatedRec.punches) && updatedRec.punches.length > 0) {
      const cleanPunches: { in: string; out: string }[] = [];
      const seenPunches = new Set<string>();
      updatedRec.punches.forEach(p => {
        const pKey = `${p.in}_${p.out}`;
        if (!seenPunches.has(pKey)) {
          seenPunches.add(pKey);
          cleanPunches.push(p);
        } else {
          attDeduplicatedCount++;
          fixedCount++;
        }
      });
      updatedRec.punches = cleanPunches;
    }

    updatedAttendance.push(updatedRec);
  });

  if (attDeduplicatedCount > 0) {
    fixedSummary.push(`تم تنظيف وإلغاء (${attDeduplicatedCount}) بصمة وحركة حضور مكررة في نفس التوقيت.`);
  }
  if (attTimeFixedCount > 0) {
    fixedSummary.push(`تم تصحيح تتابع وتوافق أوقات الحضور والانصراف لـ (${attTimeFixedCount}) حركة.`);
  }

  // [3] تدقيق وتصحيح عقود العمل
  const updatedContracts = (data.contracts || []).map(cnt => {
    let modified = false;
    const updated = { ...cnt };
    if (!updated.basicSalary || Number(updated.basicSalary) <= 0) {
      updated.basicSalary = 350;
      modified = true;
      fixedCount++;
    }
    return updated;
  });

  // [4] تدقيق معادلات مسيرات الرواتب
  let payrollFixedCount = 0;
  const updatedPayslips = (data.payslips || []).map(ps => {
    let modified = false;
    const updated = { ...ps };
    const basic = Number(updated.basicSalary) || 0;
    const allowances = Number(updated.allowances) || 0;
    const overtime = Number(updated.overtimeAmount) || 0;
    const lateness = Number(updated.latenessDeduction) || 0;
    const unpaid = Number(updated.unpaidLeaveDeduction) || 0;
    const loans = Number(updated.loanDeduction) || 0;
    const otherDed = Number((updated as any).otherDeductions) || 0;
    const pifss = Number(updated.pifssDeduction) || 0;

    const gross = basic + allowances;
    const totalDeductions = lateness + unpaid + loans + otherDed + pifss;
    const exactNet = Number(Math.max(0, gross + overtime - totalDeductions).toFixed(3));

    if (Math.abs((updated.netSalary || 0) - exactNet) > 0.005) {
      updated.grossSalary = gross;
      updated.netSalary = exactNet;
      modified = true;
      payrollFixedCount++;
      fixedCount++;
    }
    return updated;
  });

  if (payrollFixedCount > 0) {
    fixedSummary.push(`تمت موازنة وتصحيح صافي الرواتب رياضياً لـ (${payrollFixedCount}) كشف راتب.`);
  }

  const updatedLeaves = [...(data.leaves || [])];

  return {
    fixedCount,
    fixedSummary,
    updatedEmployees,
    updatedAttendance,
    updatedContracts,
    updatedLeaves,
    updatedPayslips
  };
}
