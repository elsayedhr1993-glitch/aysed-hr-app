import { Employee, LeaveRequest, HrLeaveAllocation, AttendanceRecord } from '../types';
import { calculate2026AccruedDays, isEmployeeHiredIn2026OrLater, getGlobalOpeningBalance, getGlobalAccrued2026, getGlobalCompensatoryDays } from '../utils/kuwaitLaw';

export const LEAVE_ACCRUAL_RATE_PER_MONTH = 2.5; // 30 days per year / 12 months = 2.5 days/month according to Kuwait Labor Law

export interface AccrualLogEntry {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  month: string;
  date: string;
  previousBalance: number;
  daysAdded: number;
  newBalance: number;
  status: 'ACCRUED' | 'ALREADY_ACCRUED' | 'INELIGIBLE_INACTIVE' | 'INELIGIBLE_FUTURE_JOIN';
  message: string;
}

export interface AccrualEngineResult {
  updatedEmployees: Employee[];
  newAllocations: HrLeaveAllocation[];
  accruedCount: number;
  skippedCount: number;
  targetMonthKey: string;
  hasRun: boolean;
  logs: AccrualLogEntry[];
}

export interface FifoAllocationResult {
  allocations: HrLeaveAllocation[];
  totalAllocated: number;
  totalConsumed: number;
  netAvailable: number;
  breakdown: Array<{
    leaveId: string;
    leaveStartDate: string;
    leaveEndDate: string;
    leaveType: string;
    totalDays: number;
    paidDays: number;
    excessDays: number;
    allocationUsages: Array<{
      allocationId: string;
      allocationName: string;
      allocationType: 'regular' | 'accrual' | 'compensatory_off' | 'compensatory';
      daysUsed: number;
    }>;
  }>;
}

/**
 * Returns formatted month key YYYY-MM
 */
export function getAccrualMonthKey(asOfDate: Date = new Date()): string {
  const y = asOfDate.getFullYear();
  const m = String(asOfDate.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Returns Arabic month name
 */
export function getAccrualMonthNameAr(asOfDate: Date = new Date()): string {
  const monthsAr = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];
  return `${monthsAr[asOfDate.getMonth()]} ${asOfDate.getFullYear()}`;
}

/**
 * Checks eligibility of an individual employee for monthly leave accrual
 */
export function checkEmployeeAccrualEligibility(
  emp: Employee,
  targetMonthKey: string = getAccrualMonthKey()
): { isEligible: boolean; reason: string; status: AccrualLogEntry['status'] } {
  // 1. Soft deleted or inactive/terminated check
  if (emp.isDeleted) {
    return { isEligible: false, reason: 'الموظف محذوف أو مؤرشف', status: 'INELIGIBLE_INACTIVE' };
  }

  const activeStatuses = ['ACTIVE', 'ON_LEAVE'];
  if (!activeStatuses.includes(emp.status)) {
    return { isEligible: false, reason: `الموظف في حالة غير نشطة (${emp.status})`, status: 'INELIGIBLE_INACTIVE' };
  }

  // 2. Future join date check
  if (emp.joinDate) {
    const joinMonthKey = emp.joinDate.slice(0, 7);
    if (joinMonthKey > targetMonthKey) {
      return { isEligible: false, reason: `تاريخ الالتحاق (${emp.joinDate}) في المستقبل`, status: 'INELIGIBLE_FUTURE_JOIN' };
    }
  }

  // 3. Duplicate Accrual Prevention: Check if already accrued for this month
  if (emp.lastAccrualDate) {
    const lastMonthKey = emp.lastAccrualDate.slice(0, 7);
    if (lastMonthKey === targetMonthKey) {
      return {
        isEligible: false,
        reason: `تم الترحيل الشهري مسبقاً لهذا الشهر (${targetMonthKey}) بتاريخ ${emp.lastAccrualDate}`,
        status: 'ALREADY_ACCRUED'
      };
    }
  }

  return { isEligible: true, reason: 'مستحق للترحيل الآلي', status: 'ACCRUED' };
}

/**
 * FIFO (First-In, First-Out) Leave Allocation Consumption Engine (Odoo Model: hr.leave.allocation)
 * Consumes older/expiring allocations first (e.g. 2025 Opening Balance first, then Jan 2026, Feb 2026, etc.)
 */
export function computeFifoLeaveAllocations(
  employee: Employee,
  allocations: HrLeaveAllocation[],
  leaves: LeaveRequest[]
): FifoAllocationResult {
  // Filter allocations for this employee (ANNUAL or COMPENSATORY leave type, approved or validated state)
  const empAllocations = allocations
    .filter(a => 
      (a.employeeId === employee.id || a.employeeId === employee.employeeCode) && 
      (a.leaveType === 'ANNUAL' || a.leaveType === 'COMPENSATORY' || (a.allocationType as string) === 'compensatory_off' || (a as any).allocationType === 'compensatory' || (a.name && (a.name.includes('تعويضي') || a.name.includes('بديل'))) || (a.notes && (a.notes.includes('تعويضي') || a.notes.includes('بديل')))) && 
      (a.state === 'validate' || (a.state as string) === 'validated' || a.state === 'confirm' || !a.state)
    )
    .map(a => ({
      ...a,
      consumedDays: a.consumedDays || 0,
      remainingDays: a.remainingDays !== undefined ? a.remainingDays : a.numberOfDays
    }));

  // Sort allocations chronologically by dateFrom ASC (FIFO: earliest date first)
  empAllocations.sort((a, b) => {
    const dateA = new Date(a.dateFrom || a.createdAt || '2000-01-01').getTime();
    const dateB = new Date(b.dateFrom || b.createdAt || '2000-01-01').getTime();
    if (dateA !== dateB) return dateA - dateB;
    // If same date, regular/opening balance takes priority over accrual
    if (a.allocationType === 'regular' && b.allocationType !== 'regular') return -1;
    if (b.allocationType === 'regular' && a.allocationType !== 'regular') return 1;
    return 0;
  });

  // Filter approved leaves that consume annual leave balance (chronological order)
  const approvedDeductibleLeaves = leaves
    .filter(l => !l.isHistorical && (l.employeeId === employee.id || l.employeeId === employee.employeeCode) && (l.status === 'APPROVED' || (l.status as string) === 'VALIDATED') && 
      (l.leaveType === 'ANNUAL' || ((l.leaveType === 'BEREAVEMENT' || l.leaveType === 'COMPASSIONATE') && l.isSplitBereavement))
    )
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  const breakdown: FifoAllocationResult['breakdown'] = [];

  // Iterate over leaves and consume allocations FIFO
  for (const leave of approvedDeductibleLeaves) {
    let daysToConsume = 0;
    if (leave.leaveType === 'BEREAVEMENT' || leave.leaveType === 'COMPASSIONATE') {
      daysToConsume = leave.annualDeductedDays !== undefined ? leave.annualDeductedDays : Math.max(0, (leave.totalDays || 0) - 3);
    } else {
      daysToConsume = leave.paidDays !== undefined ? leave.paidDays : (leave.totalDays || 1);
    }
    const leaveTotalDays = leave.totalDays || 1;
    const leaveBreakdown: FifoAllocationResult['breakdown'][0] = {
      leaveId: leave.id,
      leaveStartDate: leave.startDate,
      leaveEndDate: leave.endDate,
      leaveType: leave.leaveType,
      totalDays: leaveTotalDays,
      paidDays: 0,
      excessDays: leave.excessDays || 0,
      allocationUsages: []
    };

    for (const alloc of empAllocations) {
      if (daysToConsume <= 0) break;
      const currentAvailable = (alloc.numberOfDays || 0) - (alloc.consumedDays || 0);
      if (currentAvailable <= 0) continue;

      const take = Math.min(daysToConsume, currentAvailable);
      alloc.consumedDays = Number(((alloc.consumedDays || 0) + take).toFixed(2));
      alloc.remainingDays = Number(((alloc.numberOfDays || 0) - alloc.consumedDays).toFixed(2));
      daysToConsume -= take;
      leaveBreakdown.paidDays += take;

      leaveBreakdown.allocationUsages.push({
        allocationId: alloc.id,
        allocationName: alloc.name,
        allocationType: alloc.allocationType,
        daysUsed: take
      });
    }

    // Any remaining days that could not be covered by paid allocations become excess/unpaid
    if (daysToConsume > 0) {
      leaveBreakdown.excessDays += daysToConsume;
    }

    breakdown.push(leaveBreakdown);
  }

  const totalAllocated = empAllocations.reduce((sum, a) => sum + (a.numberOfDays || 0), 0);
  const totalConsumed = empAllocations.reduce((sum, a) => sum + (a.consumedDays || 0), 0);
  const netAvailable = Number(Math.max(0, totalAllocated - totalConsumed).toFixed(2));

  return {
    allocations: empAllocations,
    totalAllocated,
    totalConsumed,
    netAvailable,
    breakdown
  };
}

/**
 * Ensures baseline allocations exist for an employee (e.g. 2025 Opening Balance + 2026 Monthly Accruals)
 * Strictly preserves any user-created or edited allocations.
 */
export function buildEmployeeBaselineAllocations(
  emp: Employee,
  existingAllocations: HrLeaveAllocation[] = [],
  _asOfDate: Date = new Date()
): HrLeaveAllocation[] {
  const is2026Joined = isEmployeeHiredIn2026OrLater(emp);

  const currentEmpAllocations = existingAllocations.filter(a => a.employeeId === emp.id || a.employeeId === emp.employeeCode);
  const result: HrLeaveAllocation[] = [...currentEmpAllocations];

  // 0. Sanitize allocation types: ensure compensatory allocations are labeled 'compensatory_off'
  result.forEach(a => {
    if (
      (a.id && a.id.startsWith('alloc-comp')) ||
      (a.name && (a.name.includes('تعويضي') || a.name.includes('بديل') || a.name.includes('عطلة'))) ||
      (a.notes && (a.notes.includes('تعويضي') || a.notes.includes('بديل') || a.notes.includes('عطلة')))
    ) {
      a.allocationType = 'compensatory_off';
      a.leaveType = 'ANNUAL';
    }
  });

  // 1. Regular Opening Balance (2025 Carried Over)
  const openingVal = getGlobalOpeningBalance(emp);
  const hasRegularAlloc = result.some(a => a.allocationType === 'regular');

  if (!hasRegularAlloc) {
    result.unshift({
      id: `alloc-open-${emp.id}-2025`,
      name: (is2026Joined && openingVal <= 0) ? 'رصيد افتتاحي (موظف جديد 2026)' : 'رصيد إجازات افتتاحي مرحل من 2025 (Regular Opening Balance)',
      employeeId: emp.id,
      companyId: emp.companyId || 'comp-1',
      leaveType: 'ANNUAL',
      allocationType: 'regular',
      numberOfDays: openingVal,
      consumedDays: 0,
      remainingDays: openingVal,
      dateFrom: (is2026Joined && openingVal <= 0) ? (emp.joinDate || '2026-06-01') : '2025-12-31',
      state: 'validate',
      notes: (is2026Joined && openingVal <= 0) ? 'رصيد افتتاحي للموظفين الجدد خلال 2026 (0 يوم)' : `رصيد مرحل معتمد من نهاية عام 2025 (${openingVal} يوم)`,
      createdAt: '2026-01-01T00:00:00.000Z'
    });
  } else {
    result.forEach(a => {
      if (a.allocationType === 'regular') {
        if (openingVal > 0 && (a.numberOfDays === 0 || a.numberOfDays === undefined)) {
          a.numberOfDays = openingVal;
          a.remainingDays = Math.max(0, openingVal - (a.consumedDays || 0));
        } else if (a.numberOfDays !== undefined && a.numberOfDays > 0) {
          a.remainingDays = Math.max(0, (a.numberOfDays || 0) - (a.consumedDays || 0));
        }
      }
    });
  }

  // 2. Ensure 2026 Monthly Accrual is ALWAYS present and accurate
  const accruedDays = getGlobalAccrued2026(emp);
  const monthsCount = Math.round(accruedDays / 2.5);
  
  // Look specifically for monthly accruals (excluding compensatory records)
  const monthlyAccrualAllocs = result.filter(a => 
    a.allocationType === 'accrual' && 
    !a.name?.includes('تعويضي') && 
    !a.name?.includes('بديل') && 
    !a.name?.includes('عطلة')
  );

  if (monthlyAccrualAllocs.length === 0) {
    result.push({
      id: `alloc-accrued-${emp.id}-2026-aug`,
      name: `استحقاق عام 2026 (حتى أغسطس - ${monthsCount} أشهر × 2.5 يوم)`,
      employeeId: emp.id,
      companyId: emp.companyId || 'comp-1',
      leaveType: 'ANNUAL',
      allocationType: 'accrual',
      numberOfDays: accruedDays,
      consumedDays: 0,
      remainingDays: accruedDays,
      dateFrom: '2026-08-01',
      state: 'validate',
      notes: `استحقاق ${monthsCount} أشهر لعام 2026 بواقع 2.5 يوم شهرياً وفق المادة 70`,
      createdAt: '2026-08-01T00:00:00.000Z'
    });
  } else {
    // If consolidated baseline exists, ensure it reflects current accrued days
    const consolidated = monthlyAccrualAllocs.find(a => a.id?.includes('accrued') || (!a.accrualMonthKey && a.name?.includes('استحقاق عام 2026')));
    if (consolidated) {
      if (consolidated.numberOfDays === undefined || consolidated.numberOfDays === 0 || consolidated.numberOfDays < accruedDays) {
        consolidated.numberOfDays = accruedDays;
      }
      consolidated.remainingDays = Number(Math.max(0, (consolidated.numberOfDays || 0) - (consolidated.consumedDays || 0)).toFixed(2));
    }
  }

  // 3. Compensatory Days from Holiday Work (strictly deduplicated and synced with getGlobalCompensatoryDays)
  const compDays = getGlobalCompensatoryDays(emp);
  
  // Identify all existing compensatory allocations for this employee
  const isCompAlloc = (a: HrLeaveAllocation) => 
    a.allocationType === 'compensatory_off' || 
    (a as any).allocationType === 'compensatory' ||
    (a.id && a.id.startsWith('alloc-comp')) ||
    a.name?.includes('تعويضي') ||
    a.name?.includes('بديل') ||
    a.name?.includes('عطلة') ||
    a.notes?.includes('تعويضي') ||
    a.notes?.includes('بديل') ||
    a.notes?.includes('عطلة');

  // Filter out any invalid/duplicate compensatory allocations
  const nonCompAllocs = result.filter(a => !isCompAlloc(a));
  const rawCompAllocs = result.filter(isCompAlloc);

  if (compDays <= 0) {
    // If no compensatory days are due, do not include any placeholder compensatory allocations
    return [...nonCompAllocs];
  }

  // Deduplicate compensatory allocations:
  // If specific holiday work allocations exist (e.g. alloc-comp-hwr-...), prefer them and drop generic placeholder
  const specificCompAllocs = rawCompAllocs.filter(a => a.id && a.id.startsWith('alloc-comp-hwr-'));
  
  let finalCompAllocs: HrLeaveAllocation[] = [];
  if (specificCompAllocs.length > 0) {
    // Deduplicate specific allocations by ID or date
    const seen = new Set<string>();
    specificCompAllocs.forEach(a => {
      const key = a.id || `${a.dateFrom}-${a.name}`;
      if (!seen.has(key)) {
        seen.add(key);
        finalCompAllocs.push({
          ...a,
          allocationType: 'compensatory_off',
          leaveType: 'ANNUAL',
          state: 'validate'
        });
      }
    });

    // Ensure total days in finalCompAllocs equals compDays
    const currentSum = finalCompAllocs.reduce((s, a) => s + (Number(a.numberOfDays) || 0), 0);
    if (currentSum !== compDays && finalCompAllocs.length > 0) {
      // Normalize to match compDays
      finalCompAllocs[0].numberOfDays = compDays;
      finalCompAllocs[0].remainingDays = Math.max(0, compDays - (finalCompAllocs[0].consumedDays || 0));
    }
  } else if (rawCompAllocs.length > 0) {
    // Take the first valid allocation and set its days strictly to compDays
    const primary = { ...rawCompAllocs[0] };
    primary.id = primary.id || `alloc-comp-${emp.id}-holiday`;
    primary.allocationType = 'compensatory_off';
    primary.leaveType = 'ANNUAL';
    primary.numberOfDays = compDays;
    primary.remainingDays = Math.max(0, compDays - (primary.consumedDays || 0));
    primary.state = 'validate';
    finalCompAllocs = [primary];
  } else {
    // Create single authoritative compensatory allocation
    finalCompAllocs = [{
      id: `alloc-comp-${emp.id}-holiday`,
      name: `يوم تعويضي معتمد (بديل عن العمل في عطلة رسمية)`,
      employeeId: emp.id,
      companyId: emp.companyId || 'comp-1',
      leaveType: 'ANNUAL',
      allocationType: 'compensatory_off',
      numberOfDays: compDays,
      consumedDays: 0,
      remainingDays: compDays,
      dateFrom: '2026-07-01',
      state: 'validate',
      notes: `رصيد أيام تعويضية بديلة عن عطل رسمية (${compDays} يوم) وفق المادة 70`,
      createdAt: new Date().toISOString()
    }];
  }

  return [...nonCompAllocs, ...finalCompAllocs];
}

/**
 * Automated Monthly Accrual Engine (محرك الاستحقاق والترحيل الآلي لرصيد الإجازات 2.5 يوم/شهر)
 * Generates monthly hr.leave.allocation records and updates employee state
 */
export function runAutomatedLeaveAccrual(
  employees: Employee[],
  existingAllocationsOrDate?: HrLeaveAllocation[] | Date,
  asOfDateOrForce?: Date | boolean,
  forceParam?: boolean
): AccrualEngineResult {
  let existingAllocations: HrLeaveAllocation[] = [];
  let asOfDate: Date = new Date();
  let force: boolean = false;

  if (Array.isArray(existingAllocationsOrDate)) {
    existingAllocations = existingAllocationsOrDate;
    if (asOfDateOrForce instanceof Date) {
      asOfDate = asOfDateOrForce;
    }
    if (typeof forceParam === 'boolean') {
      force = forceParam;
    }
  } else if (existingAllocationsOrDate instanceof Date) {
    asOfDate = existingAllocationsOrDate;
    if (typeof asOfDateOrForce === 'boolean') {
      force = asOfDateOrForce;
    }
  } else if (typeof existingAllocationsOrDate === 'boolean') {
    force = existingAllocationsOrDate;
  }

  const targetMonthKey = getAccrualMonthKey(asOfDate);
  const monthNameAr = getAccrualMonthNameAr(asOfDate);
  const nowIso = asOfDate.toISOString();
  const dateFrom = `${targetMonthKey}-01`;
  const logs: AccrualLogEntry[] = [];
  const newAllocations: HrLeaveAllocation[] = [];

  let accruedCount = 0;
  let skippedCount = 0;

  const updatedEmployees = employees.map(emp => {
    const eligibility = checkEmployeeAccrualEligibility(emp, targetMonthKey);

    // Check if an accrual allocation already exists for this employee for this month
    const hasAllocationForMonth = existingAllocations.some(
      a => a.employeeId === emp.id && a.allocationType === 'accrual' && a.accrualMonthKey === targetMonthKey
    );

    if ((!eligibility.isEligible || hasAllocationForMonth) && !force) {
      skippedCount++;
      const currentBalance = Number((emp as any).carriedOverLeave2025 ?? (emp as any).carriedOverBalance ?? 0);
      logs.push({
        employeeId: emp.id,
        employeeCode: emp.employeeCode,
        employeeName: emp.fullNameAr || emp.fullNameEn || 'موظف',
        month: targetMonthKey,
        date: nowIso,
        previousBalance: currentBalance,
        daysAdded: 0,
        newBalance: currentBalance,
        status: hasAllocationForMonth ? 'ALREADY_ACCRUED' : eligibility.status,
        message: hasAllocationForMonth ? `تم إنشاء تخصيص الاستحقاق الشهري مسبقاً لشهر ${targetMonthKey}` : eligibility.reason
      });
      return emp;
    }

    // Process Accrual (+2.5 Days)
    const prevBalance = Number((emp as any).carriedOverLeave2025 ?? (emp as any).carriedOverBalance ?? 0);
    const newBalance = Number((prevBalance + LEAVE_ACCRUAL_RATE_PER_MONTH).toFixed(2));
    accruedCount++;

    const newHistoryEntry = {
      date: nowIso,
      month: targetMonthKey,
      daysAdded: LEAVE_ACCRUAL_RATE_PER_MONTH,
      previousBalance: prevBalance,
      newBalance: newBalance,
      reason: `استحقاق شهري تلقائي (+${LEAVE_ACCRUAL_RATE_PER_MONTH} يوم) لشهر ${monthNameAr}`
    };

    // Create Odoo hr.leave.allocation model record
    const allocationRecord: HrLeaveAllocation = {
      id: `alloc-accrual-${emp.id}-${targetMonthKey}`,
      name: `استحقاق رصيد سنوي شهري (${LEAVE_ACCRUAL_RATE_PER_MONTH} يوم) - ${monthNameAr}`,
      employeeId: emp.id,
      companyId: emp.companyId || 'comp-1',
      leaveType: 'ANNUAL',
      allocationType: 'accrual',
      accrualMonthKey: targetMonthKey,
      numberOfDays: LEAVE_ACCRUAL_RATE_PER_MONTH,
      consumedDays: 0,
      remainingDays: LEAVE_ACCRUAL_RATE_PER_MONTH,
      dateFrom: dateFrom,
      state: 'validate',
      notes: `تم التوليد التلقائي عبر محرك الترحيل الآلي الشهري (Accrual Plan: 2.5 Days/Month)`,
      createdAt: nowIso
    };

    newAllocations.push(allocationRecord);

    const updatedHistory = [...(emp.accrualHistory || []), newHistoryEntry];

    logs.push({
      employeeId: emp.id,
      employeeCode: emp.employeeCode,
      employeeName: emp.fullNameAr || emp.fullNameEn || 'موظف',
      month: targetMonthKey,
      date: nowIso,
      previousBalance: prevBalance,
      daysAdded: LEAVE_ACCRUAL_RATE_PER_MONTH,
      newBalance: newBalance,
      status: 'ACCRUED',
      message: `تم إضافة ${LEAVE_ACCRUAL_RATE_PER_MONTH} يوم بنجاح وتوليد سجل تخصيص Odoo hr.leave.allocation (${prevBalance} -> ${newBalance})`
    });

    return {
      ...emp,
      
      // carriedOverLeave2025: newBalance,
      paid_days_remaining: emp.paid_days_remaining !== undefined ? emp.paid_days_remaining + LEAVE_ACCRUAL_RATE_PER_MONTH : undefined,
      lastAccrualDate: targetMonthKey,
      accrualHistory: updatedHistory
    };
  });

  return {
    updatedEmployees,
    newAllocations,
    accruedCount,
    skippedCount,
    targetMonthKey,
    hasRun: accruedCount > 0,
    logs
  };
}

/**
 * Overdraft & Balance Validation Engine:
 * When leave exceeds available paid balance, splits the excess into Unpaid Days to prevent unhandled negative balances.
 */
export function calculateLeaveOverdraftSplit(
  totalRequestedDays: number,
  availablePaidBalance: number
): {
  paidDays: number;
  excessDays: number;
  isOverdraft: boolean;
  explanation: string;
} {
  const available = Math.max(0, availablePaidBalance);
  if (totalRequestedDays <= available) {
    return {
      paidDays: totalRequestedDays,
      excessDays: 0,
      isOverdraft: false,
      explanation: `الرصيد المتاح (${available.toFixed(1)} يوم) يغطي كامل مدة الإجازة المطلوبة (${totalRequestedDays} يوم).`
    };
  }

  const paidDays = available;
  const excessDays = Number((totalRequestedDays - available).toFixed(2));

  return {
    paidDays,
    excessDays,
    isOverdraft: true,
    explanation: `تم استهلاك كامل الرصيد المتاح (${paidDays.toFixed(1)} يوم مدفوع)، وتحويل الأيام الزائدة (${excessDays.toFixed(1)} يوم) تلقائياً إلى "إجازة بدون راتب / Unpaid Leave" لحماية الرصيد ومنع الرصيد السالب.`
  };
}

/**
 * Attendance Sync Helper:
 * Generates AttendanceRecord entries for the leave period marked as ON_LEAVE
 */
export function generateLeaveAttendanceRecords(
  leave: LeaveRequest,
  companyId: string
): AttendanceRecord[] {
  if (leave.status !== 'APPROVED' || leave.leaveType === 'HOURLY_PERMISSION') {
    return [];
  }

  const start = new Date(leave.startDate);
  const end = new Date(leave.endDate || leave.startDate);
  const records: AttendanceRecord[] = [];

  let curr = new Date(start);
  while (curr <= end) {
    const dateStr = curr.toISOString().split('T')[0];
    records.push({
      id: `att-${leave.employeeId}-${dateStr}`,
      employeeId: leave.employeeId,
      companyId: companyId,
      date: dateStr,
      checkIn: '—',
      checkOut: '—',
      workHours: 0,
      overtimeHours: 0,
      status: 'ON_LEAVE',
      latenessMinutes: 0
    });
    curr.setDate(curr.getDate() + 1);
  }

  return records;
}

/**
 * LeaveService Main API Object
 */
export class LeaveService {
  /**
   * Run the automated monthly accrual on a collection of employees
   */
  static processMonthlyLeaveAccrual(
    employees: Employee[],
    existingAllocations: HrLeaveAllocation[] = [],
    asOfDate: Date = new Date()
  ): AccrualEngineResult {
    return runAutomatedLeaveAccrual(employees, existingAllocations, asOfDate, false);
  }

  /**
   * Check status of monthly accrual across active employees
   */
  static checkAccrualStatus(employees: Employee[], asOfDate: Date = new Date()) {
    const targetMonthKey = getAccrualMonthKey(asOfDate);
    const activeEmps = employees.filter(e => !e.isDeleted && (e.status === 'ACTIVE' || e.status === 'ON_LEAVE'));
    const accruedEmps = activeEmps.filter(e => e.lastAccrualDate && e.lastAccrualDate.slice(0, 7) === targetMonthKey);
    const pendingEmps = activeEmps.filter(e => !e.lastAccrualDate || e.lastAccrualDate.slice(0, 7) !== targetMonthKey);

    return {
      targetMonthKey,
      monthNameAr: getAccrualMonthNameAr(asOfDate),
      totalActive: activeEmps.length,
      accruedCount: accruedEmps.length,
      pendingCount: pendingEmps.length,
      isFullyAccrued: pendingEmps.length === 0,
      accruedEmployees: accruedEmps,
      pendingEmployees: pendingEmps
    };
  }

  /**
   * Manual single employee accrual
   */
  static manualAccrueForEmployee(
    employeeId: string,
    employees: Employee[],
    asOfDate: Date = new Date()
  ): { success: boolean; message: string; updatedEmployees: Employee[]; newAllocation?: HrLeaveAllocation } {
    const targetEmp = employees.find(e => e.id === employeeId);
    if (!targetEmp) {
      return { success: false, message: 'الموظف غير موجود', updatedEmployees: employees };
    }

    const targetMonthKey = getAccrualMonthKey(asOfDate);
    const monthNameAr = getAccrualMonthNameAr(asOfDate);
    const prevBalance = Number((targetEmp as any).carriedOverLeave2025 ?? (targetEmp as any).carriedOverBalance ?? 0);
    const newBalance = Number((prevBalance + LEAVE_ACCRUAL_RATE_PER_MONTH).toFixed(2));
    const nowIso = asOfDate.toISOString();

    const newHistoryEntry = {
      date: nowIso,
      month: targetMonthKey,
      daysAdded: LEAVE_ACCRUAL_RATE_PER_MONTH,
      previousBalance: prevBalance,
      newBalance: newBalance,
      reason: `استحقاق شهري يدوي (+${LEAVE_ACCRUAL_RATE_PER_MONTH} يوم) لشهر ${monthNameAr}`
    };

    const newAllocation: HrLeaveAllocation = {
      id: `alloc-accrual-${targetEmp.id}-${targetMonthKey}`,
      name: `استحقاق رصيد سنوي شهري (${LEAVE_ACCRUAL_RATE_PER_MONTH} يوم) - ${monthNameAr}`,
      employeeId: targetEmp.id,
      companyId: targetEmp.companyId || 'comp-1',
      leaveType: 'ANNUAL',
      allocationType: 'accrual',
      accrualMonthKey: targetMonthKey,
      numberOfDays: LEAVE_ACCRUAL_RATE_PER_MONTH,
      consumedDays: 0,
      remainingDays: LEAVE_ACCRUAL_RATE_PER_MONTH,
      dateFrom: `${targetMonthKey}-01`,
      state: 'validate',
      notes: `ترحيل يدوي معتمد لشهر ${monthNameAr}`,
      createdAt: nowIso
    };

    const updatedEmployees = employees.map(e => {
      if (e.id !== employeeId) return e;
      return {
        ...e,
        
        // carriedOverLeave2025: newBalance,
        paid_days_remaining: e.paid_days_remaining !== undefined ? e.paid_days_remaining + LEAVE_ACCRUAL_RATE_PER_MONTH : undefined,
        lastAccrualDate: targetMonthKey,
        accrualHistory: [...(e.accrualHistory || []), newHistoryEntry]
      };
    });

    return {
      success: true,
      message: `تم إضافة ${LEAVE_ACCRUAL_RATE_PER_MONTH} يوم بنجاح للموظف ${targetEmp.fullNameAr || targetEmp.fullNameEn}`,
      updatedEmployees,
      newAllocation
    };
  }

  /**
   * Calculate FIFO Leave Breakdown and Net Balances
   */
  static getEmployeeLeaveFifoSummary(
    employee: Employee,
    allocations: HrLeaveAllocation[],
    leaves: LeaveRequest[]
  ): FifoAllocationResult {
    const baselineAllocations = buildEmployeeBaselineAllocations(employee, allocations);
    return computeFifoLeaveAllocations(employee, baselineAllocations, leaves);
  }
}
