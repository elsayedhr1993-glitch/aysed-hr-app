// src/services/leaveSettlementService.ts
import { supabase } from '../lib/supabase';
import { MANARA_STORAGE_KEYS, getPersistentData, setPersistentData } from '../utils/persistentStorage';
import { 
  UniversalSettlementItem, 
  UniversalSettlementInput, 
  UniversalSettlementResult, 
  LeaveSettlementVoucher,
  HrLeaveAllocation,
  Employee
} from '../types';

export type {
  UniversalSettlementItem,
  UniversalSettlementInput,
  UniversalSettlementResult,
  LeaveSettlementVoucher,
};

export interface LeaveRequestInput {
  employeeId?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  carriedOverBalance: number; // e.g. 44
  currentYearAccrued?: number; // e.g. 20
  joinDate?: string;  // YYYY-MM-DD
  monthlyWage?: number;
  dailyWage?: number;
  asOfDate?: Date;
}

export interface LeaveSettlementResult {
  totalCalendarDays: number;
  excludedFridays: number;
  actualLeaveDays: number; // working days
  totalAvailableBalance: number;
  paidDays: number;
  unpaidDays: number;
  remainingBalance: number;
  dailyRate: number;
  netPayableAmount: number;
  unpaidDeductionAmount: number;
  settlementSummary: {
    title: string;
    value: string;
    note: string;
  }[];
}

export interface LeaveValidationParams {
  employeeId: string;
  leaveId: string;
  requestedDays: number;
  leaveTypeId?: string;
}

export interface LeaveValidationResponse {
  status: 'success' | 'error';
  message: string;
  paidDays: number;
  unpaidDays: number;
  deductionSentToPayroll: boolean;
}

export interface AysedSettlementOutput {
  aysed_carried_over: number;
  aysed_opening_balance: number;
  aysed_accrued_2026: number;
  aysed_total_available: number;
  aysed_unpaid_days: number;
  aysed_paid_days: number;
  aysed_daily_wage: number;
  aysed_leave_cash: number;
  aysed_ticket_allowance: number;
  aysed_allowances: number;
  aysed_deductions: number;
  aysed_net_payable: number;
}

export interface AysedLeaveEngineInput {
  carriedOver: number;
  openingBalance?: number;
  accrued: number;
  requestedDays: number;
  monthlyWage: number;
  ticketAllowance?: number;
  allowances?: number;
  deductions?: number;
}

/**
 * تنسيق وتنظيف عدد الأيام بدقة رقمين عشريين لمنع تشوهات الفاصلة العائمة (Clean Floating Points)
 */
export function cleanDayDecimals(days: number | undefined | null): number {
  if (days === undefined || days === null || isNaN(days)) return 0;
  return Number((Math.round((days + Number.EPSILON) * 100) / 100).toFixed(2));
}

export function formatDayDisplay(days: number | undefined | null): string {
  const cleaned = cleanDayDecimals(days);
  return cleaned.toString();
}

/**
 * تنسيق المبالغ النقدية بالدينار الكويتي بثلاثة خانات عشرية (فلس)
 */
export function cleanKwdAmount(amount: number | undefined | null): number {
  if (amount === undefined || amount === null || isNaN(amount)) return 0;
  return Number((Math.round((amount + Number.EPSILON) * 1000) / 1000).toFixed(3));
}

/**
 * 1. حساب أيام الإجازة الفعلية باستبعاد أيام الجمعة (المادة 70 - قانون العمل الكويتي)
 */
export function calculateWorkingLeaveDays(startDateStr: string, endDateStr: string): { totalDays: number; fridaysCount: number; workingDays: number } {
  if (!startDateStr || !endDateStr) {
    return { totalDays: 0, fridaysCount: 0, workingDays: 0 };
  }
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return { totalDays: 0, fridaysCount: 0, workingDays: 0 };
  }

  let totalDays = 0;
  let fridaysCount = 0;
  
  const current = new Date(start);
  while (current <= end) {
    totalDays++;
    if (current.getDay() === 5) { // 5 = الجمعة
      fridaysCount++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  const workingDays = cleanDayDecimals(Math.max(0, totalDays - fridaysCount));

  return {
    totalDays,
    fridaysCount,
    workingDays
  };
}

/**
 * 2. احتساب الاستحقاق التراكمي لسنة 2026 (2.5 يوم/شهر)
 */
export function computeAccrual2026(joinDateStr: string, asOfDate: Date = new Date()): number {
  const jan2026 = new Date('2026-01-01');
  const joinDate = joinDateStr ? new Date(joinDateStr) : jan2026;
  const calcStart = joinDate > jan2026 ? joinDate : jan2026;

  if (asOfDate < calcStart) {
    return 0.0;
  }

  const months =
    (asOfDate.getFullYear() - calcStart.getFullYear()) * 12 +
    (asOfDate.getMonth() - calcStart.getMonth());

  const totalMonths = Math.max(0, months);
  return cleanDayDecimals(totalMonths * 2.5);
}

/**
 * 3. حاسبة قيمة اليوم الواحد بقاعدة 26 يوم كويتي (المادة 70)
 */
export function calculateKuwaitDailyRate(basicWage: number): number {
  if (!basicWage || basicWage <= 0) return 0;
  return cleanKwdAmount(basicWage / 26);
}

/**
 * 4. حاسبة أجر الساعة وفق الدوام القياسي (8 ساعات)
 */
export function calculateKuwaitHourlyRate(dailyWage: number, dailyHours: number = 8): number {
  if (!dailyWage || dailyWage <= 0 || dailyHours <= 0) return 0;
  return cleanKwdAmount(dailyWage / dailyHours);
}

/**
 * 5. حساب أيام العمل الفعلية في الشهر حتى تاريخ السفر (باستبعاد أيام الجمعة والعطل)
 * يضمن احتساب راتب الأيام الفعلية السابقة لتاريخ المغادرة بدون أي تداخل أو تكرار
 */
export function calculatePhysicalWorkedDays(
  departureDateStr?: string, 
  monthStartDateStr?: string
): { workingDays: number; calendarDays: number; fridaysCount: number } {
  if (!departureDateStr) {
    return { workingDays: 0, calendarDays: 0, fridaysCount: 0 };
  }
  const departureDate = new Date(departureDateStr);
  if (isNaN(departureDate.getTime())) {
    return { workingDays: 0, calendarDays: 0, fridaysCount: 0 };
  }

  // بداية شهر السفر
  const monthStart = monthStartDateStr 
    ? new Date(monthStartDateStr) 
    : new Date(departureDate.getFullYear(), departureDate.getMonth(), 1);

  if (monthStart > departureDate) {
    return { workingDays: 0, calendarDays: 0, fridaysCount: 0 };
  }

  let calendarDays = 0;
  let fridaysCount = 0;
  
  // احتساب الأيام الفعلية من بداية الشهر وحتى اليوم السابق للسفر
  const current = new Date(monthStart);
  while (current < departureDate) {
    calendarDays++;
    if (current.getDay() === 5) { // 5 = الجمعة (عطلة أسبوعية رسمية)
      fridaysCount++;
    }
    current.setDate(current.getDate() + 1);
  }

  const workingDays = Math.min(26, Math.max(0, calendarDays - fridaysCount));

  return {
    workingDays,
    calendarDays,
    fridaysCount,
  };
}

/**
 * 6. محرك تسوية واحتساب الإجازة الموحد (Odoo & Kuwait Labor Law)
 */
export function processLeaveSettlement(input: LeaveRequestInput): LeaveSettlementResult {
  const asOfDate = input.asOfDate || new Date();
  const { totalDays, fridaysCount, workingDays } = calculateWorkingLeaveDays(input.startDate, input.endDate);

  const carriedOver = cleanDayDecimals(input.carriedOverBalance || 0);
  const currentAccrued = cleanDayDecimals(
    input.currentYearAccrued !== undefined 
      ? input.currentYearAccrued 
      : computeAccrual2026(input.joinDate || '2026-01-01', asOfDate)
  );

  const totalAvailableBalance = cleanDayDecimals(carriedOver + currentAccrued);

  const paidDays = cleanDayDecimals(Math.min(totalAvailableBalance, workingDays));
  const unpaidDays = cleanDayDecimals(Math.max(0, workingDays - totalAvailableBalance));
  const remainingBalance = cleanDayDecimals(Math.max(0, totalAvailableBalance - paidDays));

  const wage = input.monthlyWage || (input.dailyWage ? input.dailyWage * 26 : 0);
  const dailyRate = input.dailyWage || calculateKuwaitDailyRate(wage);
  const netPayableAmount = cleanKwdAmount(paidDays * dailyRate);
  const unpaidDeductionAmount = cleanKwdAmount(unpaidDays * dailyRate);

  const settlementSummary = [
    {
      title: "إجمالي مدة الإجازة المعتمدة",
      value: `${workingDays.toFixed(2)} يوم`,
      note: `(تم استبعاد ${fridaysCount} أيام جمعة استناداً للمادة 70)`
    },
    {
      title: "أيام مدفوعة الأجر (خصم من الرصيد)",
      value: `${paidDays.toFixed(2)} يوم`,
      note: `(${carriedOver.toFixed(2)} مرحل + ${currentAccrued.toFixed(2)} رصيد السنة)`
    },
    {
      title: "أيام غير مدفوعة (خصم من الراتب)",
      value: `${unpaidDays.toFixed(2)} يوم`,
      note: unpaidDays > 0 ? "تُرحل آلياً لمسير الرواتب القادم" : "لا يوجد تجاوز"
    },
    {
      title: "الرصيد المتبقي للموظف بعد التصفية",
      value: `${remainingBalance.toFixed(2)} يوم`,
      note: remainingBalance === 0 ? "تمت تصفية الرصيد بالكامل" : "رصيد متبقي متاح"
    }
  ];

  return {
    totalCalendarDays: totalDays,
    excludedFridays: fridaysCount,
    actualLeaveDays: workingDays,
    totalAvailableBalance,
    paidDays,
    unpaidDays,
    remainingBalance,
    dailyRate,
    netPayableAmount,
    unpaidDeductionAmount,
    settlementSummary
  };
}

/**
 * 7. محرك التسوية الشامل المتعدد البنود وتصفية الإجازات (Universal Multi-Item Leave Settlement & Encashment Engine)
 * يضمن منع الازدواجية وتكرار البنود (Elimination of Duplicate Earning Lines):
 * 1. احتساب راتب الأيام الفعلية السابقة للسفر بدقة بدون تكرار
 * 2. دمج وتوحيد بند التسييل النقدي للرصيد في بند موحد غير مجزأ (Unified Consolidated Encashment Line)
 * 3. معادلة صافي المستحقات المعيارية الشاملة
 * 4. تطبيق معيار قسمة 26 يوماً الإلزامي القانوني وتطهير الفواصل العشرية
 */
export function calculateUniversalLeaveSettlement(input: UniversalSettlementInput): UniversalSettlementResult {
  const mode = input.settlementMode || (input.includeEncashment && input.consumedLeaveDays === 0 ? 'ENCASHMENT_LIQUIDATION' : 'LEAVE_WITH_TRAVEL');

  const baseSalary = input.basicSalary > 0 ? input.basicSalary : input.grossSalary;
  // Unified 26-Day Divisor Standard: Daily Rate = Total Salary / 26
  const dailyWage = cleanKwdAmount(input.dailyWage > 0 ? input.dailyWage : calculateKuwaitDailyRate(baseSalary));
  const hourlyWage = cleanKwdAmount(input.hourlyWage > 0 ? input.hourlyWage : calculateKuwaitHourlyRate(dailyWage, 8));

  const carriedOver = cleanDayDecimals(input.carriedOverBalance || 0);
  const accrued = cleanDayDecimals(input.accruedBalance || 0);
  const totalAvailableBefore = cleanDayDecimals(carriedOver + accrued);

  // Statutory Days (e.g. Bereavement Art. 77 - 3 days paid, 0 deducted from annual balance)
  const statutoryDays = cleanDayDecimals(Math.max(0, input.statutoryLeaveDays));

  let consumedDays = 0;
  let encashedDays = 0;
  let balanceAfterConsumption = totalAvailableBefore;

  if (mode === 'ENCASHMENT_LIQUIDATION') {
    // وضع تسييل وتصفية الرصيد الموحد: تُدمج كافة الأيام المصفاة في بند موحد غير مجزأ
    const targetEncash = cleanDayDecimals(input.encashmentDays > 0 ? input.encashmentDays : input.consumedLeaveDays);
    encashedDays = cleanDayDecimals(Math.min(totalAvailableBefore, Math.max(0, targetEncash)));
    consumedDays = 0; // منع توليد بند مستهلك مكرر
    balanceAfterConsumption = cleanDayDecimals(Math.max(0, totalAvailableBefore - encashedDays));
  } else {
    // وضع تسوية الإجازة الفعلية مع السفر:
    // 1. أيام الإجازة السنوية الفعلية المستهلكة
    consumedDays = cleanDayDecimals(Math.min(totalAvailableBefore, Math.max(0, input.consumedLeaveDays)));
    balanceAfterConsumption = cleanDayDecimals(Math.max(0, totalAvailableBefore - consumedDays));

    // 2. أيام التسييل الإضافية غير المتداخلة إن وجدت
    if (input.includeEncashment && input.encashmentDays > 0) {
      encashedDays = cleanDayDecimals(Math.min(balanceAfterConsumption, Math.max(0, input.encashmentDays)));
    }
  }

  const remainingBalanceAfter = cleanDayDecimals(
    Math.max(0, balanceAfterConsumption - (mode === 'ENCASHMENT_LIQUIDATION' ? 0 : encashedDays))
  );
  const unpaidDays = cleanDayDecimals(Math.max(0, input.unpaidLeaveDays));

  // Build Dynamic Line Items
  const items: UniversalSettlementItem[] = [];

  // 1. Dynamic Base Salary Proration (راتب أيام العمل الفعلية قبل السفر)
  // يُحسب الراتب حصرياً عن أيام العمل الفعلية السابقة لتاريخ المغادرة بقسمة 26 يوم الثابتة قانونياً (الراتب الأساسي ÷ 26 × أيام العمل الفعلية)
  if (input.includeProratedSalary && input.workedDaysInMonth > 0) {
    const workedDays = cleanDayDecimals(input.workedDaysInMonth);
    const divisor = 26; // Statutory Kuwait Standard (Article 70) - 26 working days fixed
    const proratedDailyRate = dailyWage;
    const proratedAmount = cleanKwdAmount(workedDays * proratedDailyRate);
    items.push({
      id: 'item-prorated-salary',
      category: 'SALARY_PRORATED',
      name: `راتب أيام العمل الفعلية قبل السفر (${workedDays.toFixed(2)} يوم عمل - أساس 26 يوم القانوني)`,
      type: 'EARNING',
      quantity: workedDays,
      unit: 'days',
      rate: proratedDailyRate,
      amount: proratedAmount,
      notes: `احتساب الراتب المستحق حتى تاريخ السفر (${baseSalary.toFixed(3)} د.ك ÷ 26 × ${workedDays.toFixed(2)} يوم)`,
      isEditable: true,
    });
  }

  // 2. Approved Overtime (بدل العمل الإضافي المعتمد)
  if (input.includeOvertime && input.overtimeHours > 0) {
    const overtimeHours = cleanDayDecimals(input.overtimeHours);
    const multiplier = input.overtimeMultiplier || 1.25;
    const overtimeRate = cleanKwdAmount(hourlyWage * multiplier);
    const overtimeAmount = cleanKwdAmount(overtimeHours * overtimeRate);
    items.push({
      id: 'item-overtime',
      category: 'OVERTIME',
      name: `بدل العمل الإضافي المعتمد (${overtimeHours.toFixed(2)} ساعة × ${multiplier} أجر الساعة)`,
      type: 'EARNING',
      quantity: overtimeHours,
      unit: 'hours',
      rate: overtimeRate,
      amount: overtimeAmount,
      notes: `أجر الساعة الأساسي: ${hourlyWage.toFixed(3)} د.ك × مضاعف ${multiplier}`,
      isEditable: true,
    });
  }

  // 3. Statutory Paid Leave (إجازات رسمية نظامية مدفوعة الأجر - المادة 77)
  // ملاحظة قانونية حاسمة: الإجازات الرسمية تمنح إعفاءً من الخصم من الرصيد السنوي، 
  // ولا تولد بند إضافة نقدية منفصلة منعاً للازدواجية طالما أن الراتب الأساسي/النسبي محسوب،
  // وبالتالي تظهر كبند إيضاحي بأجر إضافي = 0.000 د.ك افتراضياً.
  if (statutoryDays > 0) {
    items.push({
      id: 'item-statutory-leave',
      category: 'STATUTORY_ALLOWANCE',
      name: `إجازة عزاء / وفاة رسمية - المادة 77 (${statutoryDays.toFixed(2)} أيام مدفوعة الأجر)`,
      type: 'EARNING',
      quantity: statutoryDays,
      unit: 'days',
      rate: 0,
      amount: 0,
      notes: `حق قانوني مدفوع مشمول بالراتب (معفى من الخصم من الرصيد السنوي - إضافة نقدية إضافية: 0.000 د.ك منعاً للازدواجية)`,
      isStatutoryNonDeductible: true,
      isEditable: true,
    });
  }

  // 4. Unified Balance Encashment (Single Non-Fragmented Line) or Consumed Days
  if (mode === 'ENCASHMENT_LIQUIDATION' && encashedDays > 0) {
    // بند موحد غير مجزأ لتصفية وتسييل الرصيد
    const encashmentAmount = cleanKwdAmount(encashedDays * dailyWage);
    items.push({
      id: 'item-leave-encashment',
      category: 'LEAVE_ENCASHMENT',
      name: `البدل النقدي الموحد لتصفية وتسييل رصيد الإجازات (${encashedDays.toFixed(2)} يوم)`,
      type: 'EARNING',
      quantity: encashedDays,
      unit: 'days',
      rate: dailyWage,
      amount: encashmentAmount,
      notes: `تسييل نقدي موحد ومباشر للرصيد وتحديث الرصيد الفعلي للموظف وفق المادة 70 (${encashedDays.toFixed(2)} يوم × ${dailyWage.toFixed(3)} د.ك)`,
      isEncashment: true,
      isEditable: true,
    });
  } else {
    // بدل أيام الإجازة السنوية المستهلكة
    if (consumedDays > 0) {
      const leaveCashAmount = cleanKwdAmount(consumedDays * dailyWage);
      items.push({
        id: 'item-consumed-leave',
        category: 'CONSUMED_LEAVE',
        name: `بدل أيام الإجازة السنوية المستهلكة (${consumedDays.toFixed(2)} يوم)`,
        type: 'EARNING',
        quantity: consumedDays,
        unit: 'days',
        rate: dailyWage,
        amount: leaveCashAmount,
        notes: `مخصومة من رصيد الإجازات السنوي (${consumedDays.toFixed(2)} يوم × ${dailyWage.toFixed(3)} د.ك)`,
        isEditable: true,
      });
    }

    // بدل تسييل رصيد إضافي متبقي إن تم تفعيله
    if (input.includeEncashment && encashedDays > 0) {
      const encashmentAmount = cleanKwdAmount(encashedDays * dailyWage);
      items.push({
        id: 'item-leave-encashment',
        category: 'LEAVE_ENCASHMENT',
        name: `البدل النقدي لتسييل رصيد إجازات إضافي متبقي (${encashedDays.toFixed(2)} يوم)`,
        type: 'EARNING',
        quantity: encashedDays,
        unit: 'days',
        rate: dailyWage,
        amount: encashmentAmount,
        notes: `تصفية نقدية للرصيد المتبقي بعد استهلاك الإجازة (${encashedDays.toFixed(2)} يوم × ${dailyWage.toFixed(3)} د.ك)`,
        isEncashment: true,
        isEditable: true,
      });
    }
  }

  // 5. Annual Ticket Allowance (بدل تذاكر السفر)
  if (input.ticketAllowance && input.ticketAllowance > 0) {
    items.push({
      id: 'item-ticket-allowance',
      category: 'TICKET_ALLOWANCE',
      name: `بدل تذاكر السفر السنوية المعتمدة`,
      type: 'EARNING',
      quantity: 1,
      unit: 'tickets',
      rate: cleanKwdAmount(input.ticketAllowance),
      amount: cleanKwdAmount(input.ticketAllowance),
      notes: `مخصص تذاكر السفر للإجازة السنوية`,
      isEditable: true,
    });
  }

  // 6. Housing Allowance (بدل سكن مستحق إضافي)
  if (input.housingAllowance && input.housingAllowance > 0) {
    items.push({
      id: 'item-housing-allowance',
      category: 'HOUSING_ALLOWANCE',
      name: `بدل السكن المستحق`,
      type: 'EARNING',
      quantity: 1,
      unit: 'fixed',
      rate: cleanKwdAmount(input.housingAllowance),
      amount: cleanKwdAmount(input.housingAllowance),
      notes: `بدل السكن الخاص بفترة التسوية`,
      isEditable: true,
    });
  }

  // 7. Custom Earning Items
  (input.customItems || []).filter(item => item.type === 'EARNING').forEach(ci => {
    items.push({
      ...ci,
      quantity: cleanDayDecimals(ci.quantity),
      rate: cleanKwdAmount(ci.rate),
      amount: cleanKwdAmount(ci.amount),
    });
  });

  // 8. Loan Deduction (أقساط سلف وقروض)
  if (input.loanDeduction && input.loanDeduction > 0) {
    items.push({
      id: 'item-loan-deduction',
      category: 'LOAN_DEDUCTION',
      name: `سداد قسط سلفة / قرض معتمد`,
      type: 'DEDUCTION',
      quantity: 1,
      unit: 'fixed',
      rate: cleanKwdAmount(input.loanDeduction),
      amount: cleanKwdAmount(input.loanDeduction),
      notes: `خصم من مستحقات التصفية لتسوية السلفة`,
      isEditable: true,
    });
  }

  // 9. Salary Advance Deduction (استقطاع سلفة راتب)
  if (input.salaryAdvanceDeduction && input.salaryAdvanceDeduction > 0) {
    items.push({
      id: 'item-salary-advance',
      category: 'SALARY_ADVANCE',
      name: `استقطاع سلفة راتب مقدمة`,
      type: 'DEDUCTION',
      quantity: 1,
      unit: 'fixed',
      rate: cleanKwdAmount(input.salaryAdvanceDeduction),
      amount: cleanKwdAmount(input.salaryAdvanceDeduction),
      notes: `تسوية سلفة الراتب المستلمة مسبقاً`,
      isEditable: true,
    });
  }

  // 10. Admin Deduction (استقطاعات إدارية وجزاءات)
  if (input.adminDeduction && input.adminDeduction > 0) {
    items.push({
      id: 'item-admin-deduction',
      category: 'ADMIN_DEDUCTION',
      name: `استقطاعات إدارية وجزاءات مسجلة`,
      type: 'DEDUCTION',
      quantity: 1,
      unit: 'fixed',
      rate: cleanKwdAmount(input.adminDeduction),
      amount: cleanKwdAmount(input.adminDeduction),
      notes: `خصومات إدارية معتمدة من الموارد البشرية`,
      isEditable: true,
    });
  }

  // 11. Custom Deduction Items
  (input.customItems || []).filter(item => item.type === 'DEDUCTION').forEach(ci => {
    items.push({
      ...ci,
      quantity: cleanDayDecimals(ci.quantity),
      rate: cleanKwdAmount(ci.rate),
      amount: cleanKwdAmount(ci.amount),
    });
  });

  // Standardized Net Calculation Formula:
  // Net Payable = (Prorated Worked Days Salary + Approved Overtime Earnings + Consolidated Leave Encashment / Consumed Leave + Statutory Allowances + Other Approved Allowances) - Total Approved Deductions
  const totalEarnings = cleanKwdAmount(
    items
      .filter(i => i.type === 'EARNING')
      .reduce((sum, i) => sum + (Number(i.amount) || 0), 0)
  );

  const totalDeductions = cleanKwdAmount(
    items
      .filter(i => i.type === 'DEDUCTION')
      .reduce((sum, i) => sum + (Number(i.amount) || 0), 0)
  );

  const netSettlementPayout = cleanKwdAmount(Math.max(0, totalEarnings - totalDeductions));

  const voucherNumber = input.voucherNumber || `LST-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Legacy mappings
  const aysed_leave_cash = cleanKwdAmount(
    (mode === 'ENCASHMENT_LIQUIDATION' ? encashedDays : consumedDays + encashedDays) * dailyWage
  );
  const aysed_allowances = cleanKwdAmount(totalEarnings - aysed_leave_cash - (input.ticketAllowance || 0));

  return {
    voucherNumber,
    settlementDate: input.settlementDate || new Date().toISOString().split('T')[0],
    settlementMode: mode,
    dailyWage,
    hourlyWage,
    
    carriedOverBalance: carriedOver,
    accruedBalance: accrued,
    totalAvailableBefore,
    statutoryLeaveDays: statutoryDays,
    consumedLeaveDays: consumedDays,
    encashedLeaveDays: encashedDays,
    unpaidLeaveDays: unpaidDays,
    remainingBalanceAfter,
    
    items,
    totalEarnings,
    totalDeductions,
    netSettlementPayout,
    
    // Legacy mapping for 100% backward compatibility
    aysed_carried_over: carriedOver,
    aysed_opening_balance: 0,
    aysed_accrued_2026: accrued,
    aysed_total_available: totalAvailableBefore,
    aysed_paid_days: mode === 'ENCASHMENT_LIQUIDATION' ? encashedDays : consumedDays,
    aysed_unpaid_days: unpaidDays,
    aysed_daily_wage: dailyWage,
    aysed_leave_cash,
    aysed_ticket_allowance: cleanKwdAmount(input.ticketAllowance || 0),
    aysed_allowances,
    aysed_deductions: totalDeductions,
    aysed_net_payable: netSettlementPayout,
  };
}

/**
 * 8. حسابات تسوية متوافقة مع واجهة LeaveClearanceDocument (Legacy bridge)
 */
export function calculateAysedLeaveSettlement(input: AysedLeaveEngineInput): AysedSettlementOutput {
  const carriedOver = input.carriedOver || 0;
  const accrued = input.accrued !== undefined ? input.accrued : computeAccrual2026('2026-01-01');
  const totalAvailable = Number((carriedOver + accrued).toFixed(2));

  const paidDays = Math.min(totalAvailable, input.requestedDays);
  const unpaidDays = Math.max(0, input.requestedDays - totalAvailable);

  const dailyWage = calculateKuwaitDailyRate(input.monthlyWage);
  const leaveCash = Number((paidDays * dailyWage).toFixed(3));
  const ticket = input.ticketAllowance || 0;
  const allowances = input.allowances || 0;
  const deductions = input.deductions || 0;

  const netPayable = Math.max(0, Number((leaveCash + ticket + allowances - deductions).toFixed(3)));

  return {
    aysed_carried_over: carriedOver,
    aysed_opening_balance: input.openingBalance || 0,
    aysed_accrued_2026: accrued,
    aysed_total_available: totalAvailable,
    aysed_unpaid_days: Number(unpaidDays.toFixed(2)),
    aysed_paid_days: Number(paidDays.toFixed(2)),
    aysed_daily_wage: Number(dailyWage.toFixed(3)),
    aysed_leave_cash: leaveCash,
    aysed_ticket_allowance: ticket,
    aysed_allowances: allowances,
    aysed_deductions: deductions,
    aysed_net_payable: netPayable,
  };
}

/**
 * 8. إدارة وحفظ سندات التسوية في التخزين الدائم (Vouchers Persistence Engine)
 */
export function getSavedSettlementVouchers(companyId?: string): LeaveSettlementVoucher[] {
  const vouchers = getPersistentData<LeaveSettlementVoucher[]>(
    MANARA_STORAGE_KEYS.LEAVE_SETTLEMENT_VOUCHERS, 
    []
  );
  if (!companyId || companyId === 'comp-super-admin' || companyId === 'all') {
    return vouchers;
  }
  return vouchers.filter(v => v.companyId === companyId);
}

export function saveSettlementVoucher(voucher: LeaveSettlementVoucher): LeaveSettlementVoucher[] {
  const existing = getPersistentData<LeaveSettlementVoucher[]>(
    MANARA_STORAGE_KEYS.LEAVE_SETTLEMENT_VOUCHERS, 
    []
  );
  const index = existing.findIndex(v => v.id === voucher.id);
  let updated: LeaveSettlementVoucher[];
  if (index >= 0) {
    updated = [...existing];
    updated[index] = { ...voucher, updatedAt: new Date().toISOString() };
  } else {
    updated = [voucher, ...existing];
  }
  setPersistentData(MANARA_STORAGE_KEYS.LEAVE_SETTLEMENT_VOUCHERS, updated);
  return updated;
}

export function deleteSettlementVoucher(voucherId: string): LeaveSettlementVoucher[] {
  const existing = getPersistentData<LeaveSettlementVoucher[]>(
    MANARA_STORAGE_KEYS.LEAVE_SETTLEMENT_VOUCHERS, 
    []
  );
  const updated = existing.filter(v => v.id !== voucherId);
  setPersistentData(MANARA_STORAGE_KEYS.LEAVE_SETTLEMENT_VOUCHERS, updated);
  return updated;
}

/**
 * 9. تسييل وتصفية رصيد الإجازات الفعلي في سجل التخصيصات (Encashment Execution)
 */
export function liquidateLeaveBalanceInAllocations(
  employeeId: string,
  encashedDays: number,
  allocations: HrLeaveAllocation[],
  onUpdateAllocations: (updated: HrLeaveAllocation[]) => void,
  employee?: Employee,
  onUpdateEmployee?: (updated: Employee) => void
): { success: boolean; deductedDays: number; message: string } {
  if (encashedDays <= 0) {
    return { success: false, deductedDays: 0, message: 'عدد أيام التصفية يجب أن يكون أكبر من الصفر' };
  }

  let empAllocations = allocations.filter(
    a => (a.employeeId === employeeId || a.employeeId === employee?.employeeCode || a.employeeId === employee?.id) && 
         (a.leaveType === 'ANNUAL' || !a.leaveType) && 
         (a.state === 'validate' || a.state === 'confirm' || !a.state)
  );

  let updatedAllocations = [...allocations];

  // If no allocations found, create a default annual allocation record so liquidation/zeroing succeeds
  if (empAllocations.length === 0 && employee) {
    const defaultAlloc: HrLeaveAllocation = {
      id: `alloc-default-${Date.now()}`,
      employeeId: employee.id,
      companyId: employee.companyId || 'comp-1',
      name: `تخصيص سنوية - ${employee.fullNameAr}`,
      leaveType: 'ANNUAL',
      allocationType: 'regular',
      numberOfDays: employee.carriedOverBalance || employee.paid_days_remaining || encashedDays,
      consumedDays: 0,
      remainingDays: employee.carriedOverBalance || employee.paid_days_remaining || encashedDays,
      dateFrom: new Date().toISOString().split('T')[0],
      dateTo: new Date(Date.now() + 31536000000).toISOString().split('T')[0],
      state: 'validate',
      notes: 'تخصيص افتراضي للتسوية',
      createdAt: new Date().toISOString(),
    };
    updatedAllocations.push(defaultAlloc);
    empAllocations = [defaultAlloc];
  }

  // Sort allocations FIFO (Carried over first, then earliest date)
  const sortedAllocations = [...empAllocations].sort((a, b) => {
    if (a.allocationType === 'regular' && b.allocationType !== 'regular') return -1;
    if (b.allocationType === 'regular' && a.allocationType !== 'regular') return 1;
    return new Date(a.dateFrom || 0).getTime() - new Date(b.dateFrom || 0).getTime();
  });

  let remainingToEncash = encashedDays;

  for (const alloc of sortedAllocations) {
    if (remainingToEncash <= 0) break;
    const currentAllocIndex = updatedAllocations.findIndex(a => a.id === alloc.id);
    if (currentAllocIndex === -1) continue;

    const availableInAlloc = Math.max(0, alloc.numberOfDays - (alloc.consumedDays || 0));
    if (availableInAlloc <= 0) continue;

    const deductFromThis = Math.min(availableInAlloc, remainingToEncash);
    const newNumberOfDays = Math.max(0, (alloc.numberOfDays || 0) - deductFromThis);
    const newRemaining = Math.max(0, newNumberOfDays - (alloc.consumedDays || 0));

    updatedAllocations[currentAllocIndex] = {
      ...alloc,
      numberOfDays: Number(newNumberOfDays.toFixed(2)),
      remainingDays: Number(newRemaining.toFixed(2)),
      notes: (alloc.notes || '') + ` [تم تسييل بدل نقدي / تسوية: ${deductFromThis} يوم]`,
    };

    remainingToEncash -= deductFromThis;
  }

  // Persist updated allocations
  onUpdateAllocations(updatedAllocations);
  setPersistentData(MANARA_STORAGE_KEYS.LEAVE_ALLOCATIONS, updatedAllocations);

  // If employee object is provided, update remaining leaves
  if (employee && onUpdateEmployee) {
    const currentBal = employee.paid_days_remaining ?? employee.carriedOverBalance ?? encashedDays;
    const newBal = Math.max(0, currentBal - encashedDays);
    const updatedEmp: Employee = {
      ...employee,
      paid_days_remaining: Number(newBal.toFixed(2)),
      carriedOverBalance: 0, // Zero out if full settlement / encashment
    };
    onUpdateEmployee(updatedEmp);
  }

  const successfullyEncashed = encashedDays - Math.max(0, remainingToEncash);

  return {
    success: true,
    deductedDays: Number(successfullyEncashed.toFixed(2)),
    message: `تم بنجاح تسييل وصرف البدل النقدي لعدد ${successfullyEncashed.toFixed(2)} يوم من رصيد الإجازات وتحديث وتصفير الرصيد المعتمد.`,
  };
}

/**
 * 10. دالة اعتماد الإجازة والخصم التلقائي (Supabase Integration)
 */
export const onLeaveValidate = async (
  params: LeaveValidationParams
): Promise<LeaveValidationResponse> => {
  const { employeeId, requestedDays, leaveId } = params;

  try {
    const { data: employee, error: empError } = await supabase
      .from('hr_employee')
      .select('name, wage, remaining_leaves, join_date, carried_over_leaves')
      .eq('id', employeeId)
      .single();

    if (empError || !employee) {
      return {
        status: 'error',
        message: 'تعذر العثور على بيانات الموظف',
        paidDays: 0,
        unpaidDays: 0,
        deductionSentToPayroll: false,
      };
    }

    const { data: allocations, error: allocError } = await supabase
      .from('hr_leave_allocation')
      .select('id, number_of_days, aysed_type')
      .eq('employee_id', employeeId)
      .eq('state', 'validate');

    if (allocError) {
      console.warn('خطأ في استرجاع تخصيصات الإجازة:', allocError.message);
    }

    const sortedAllocations = (allocations || []).sort((a: any, b: any) => {
      if (a.aysed_type === 'carried_over') return -1;
      if (b.aysed_type === 'carried_over') return 1;
      return 0;
    });

    let remainingToDeduct = requestedDays;
    const totalAvailable = sortedAllocations.reduce(
      (sum: number, a: any) => sum + (Number(a.number_of_days) || 0),
      0
    );

    for (const alloc of sortedAllocations) {
      const currentDays = Number(alloc.number_of_days) || 0;
      if (remainingToDeduct <= 0 || currentDays <= 0) continue;

      const deductFromThis = Math.min(currentDays, remainingToDeduct);
      const newAllocBalance = Number((currentDays - deductFromThis).toFixed(2));

      await supabase
        .from('hr_leave_allocation')
        .update({ number_of_days: newAllocBalance })
        .eq('id', alloc.id);

      remainingToDeduct -= deductFromThis;
    }

    let unpaidDays = 0;
    const paidDays = requestedDays - Math.max(0, remainingToDeduct);

    if (remainingToDeduct > 0) {
      unpaidDays = Number(remainingToDeduct.toFixed(2));
      const monthlyWage = Number(employee.wage) || 0;
      const dailyRate = calculateKuwaitDailyRate(monthlyWage);
      const totalDeductionAmount = Number((unpaidDays * dailyRate).toFixed(3));

      try {
        await supabase.from('hr_payroll_input').insert({
          employee_id: employeeId,
          input_type: 'unpaid_leave_deduction',
          amount: totalDeductionAmount,
          description: `خصم عدد ${unpaidDays} يوم إجازة زائدة عن الرصيد المتاح`,
          date: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('hr_payroll_input insert note:', err);
      }
    }

    try {
      await supabase
        .from('hr_leaves')
        .update({
          state: 'validate',
          aysed_unpaid_days: unpaidDays,
          aysed_paid_days: paidDays,
        })
        .eq('id', leaveId);
    } catch (err) {
      console.warn('hr_leaves update note:', err);
    }

    const newEmployeeBalance = Math.max(0, totalAvailable - paidDays);
    try {
      await supabase
        .from('hr_employee')
        .update({ remaining_leaves: Number(newEmployeeBalance.toFixed(2)) })
        .eq('id', employeeId);
    } catch (err) {
      console.warn('hr_employee update note:', err);
    }

    return {
      status: 'success',
      message: `تم اعتماد الإجازة بنجاح (براتب: ${paidDays} يوم، بدون راتب: ${unpaidDays} يوم)`,
      paidDays,
      unpaidDays,
      deductionSentToPayroll: unpaidDays > 0,
    };
  } catch (error: any) {
    console.warn('حدث خطأ أثناء اعتماد الإجازة:', error);
    return {
      status: 'error',
      message: error.message || 'فشلت عملية الاعتماد',
      paidDays: 0,
      unpaidDays: 0,
      deductionSentToPayroll: false,
    };
  }
};
