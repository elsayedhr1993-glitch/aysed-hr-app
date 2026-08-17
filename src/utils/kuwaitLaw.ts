import { EOSCalculation } from '../types';

/**
 * Validate Kuwait Civil ID using MOD 11 algorithm
 * Format: 12 Digits
 * Weights: [2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
 * Check Digit: (11 - (Sum % 11)) % 11
 */
export function validateKuwaitCivilId(civilId: string): { isValid: boolean; message: string; dob?: string; gender?: string } {
  const cleanId = civilId.trim().replace(/\D/g, '');
  
  if (cleanId.length !== 12) {
    return { isValid: false, message: 'الرقم المدني يجب أن يتكون من 12 رقماً تماماً' };
  }

  const weights = [2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  let sum = 0;

  for (let i = 0; i < 11; i++) {
    sum += parseInt(cleanId[i], 10) * weights[i];
  }

  const remainder = sum % 11;
  const checkDigit = (11 - remainder) % 11;
  const actualCheckDigit = parseInt(cleanId[11], 10);

  if (checkDigit !== actualCheckDigit) {
    return { isValid: false, message: 'الرقم المدني غير صحيح (فشل في خوارزمية التحقق الرسمية MOD 11)' };
  }

  // Parse birth date
  const centuryDigit = parseInt(cleanId[0], 10);
  const yearDigits = cleanId.substring(1, 3);
  const monthDigits = cleanId.substring(3, 5);
  const dayDigits = cleanId.substring(5, 7);
  
  const century = centuryDigit === 2 ? '19' : centuryDigit === 3 ? '20' : '19';
  const fullYear = `${century}${yearDigits}`;
  const dob = `${fullYear}-${monthDigits}-${dayDigits}`;

  // Parse gender from 10th digit
  const genderDigit = parseInt(cleanId[9], 10);
  const gender = genderDigit % 2 === 1 ? 'MALE' : 'FEMALE';

  return {
    isValid: true,
    message: 'الرقم المدني كويتي صالح ومطابق للمعايير القانونية',
    dob,
    gender,
  };
}

/**
 * دالة فك شفرة الرقم المدني الكويتي لاستخراج الجنس وتاريخ الميلاد تلقائياً
 */
export function parseKuwaitCivilId(civilId: string): { birthDate: string; gender: 'MALE' | 'FEMALE' } | null {
  const cleanId = (civilId || '').replace(/\D/g, '');
  if (cleanId.length !== 12) return null;

  const centuryDigit = cleanId.charAt(0);
  const yy = cleanId.substring(1, 3);
  const mm = cleanId.substring(3, 5);
  const dd = cleanId.substring(5, 7);
  // فك شفرة الرقم التاسع أو العاشر لتحديد الجنس (فردي = ذكر | زوجي = أنثى)
  const genderDigit = parseInt(cleanId.charAt(8), 10) || parseInt(cleanId.charAt(9), 10);

  const century = centuryDigit === '2' ? '19' : '20';
  const birthDate = `${century}${yy}-${mm}-${dd}`;
  const gender = (genderDigit % 2 !== 0) ? 'MALE' : 'FEMALE';

  return { birthDate, gender };
}

/**
 * Format Currency in KWD with 3 decimal places always
 * Example: 1250 -> "1,250.000 KWD" or "1,250.000 د.ك"
 */
export function formatKWD(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '0.000 د.ك';
  }
  const formatted = amount.toLocaleString('en-US', {
    style: 'decimal',
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
  return `${formatted} د.ك`;
}

/**
 * حساب مدة الخدمة الفعلية وفق قانون العمل الكويتي ونظام أودو (Odoo HR Departure)
 * مع استبعاد إجمالي أيام الإجازات "بدون راتب" (Unpaid Leaves & Excess Days)
 * 
 * Formula:
 * total_days = (end_date - start_date).days
 * actual_service_days = total_days - total_unpaid_days
 */
export function calculate_aysed_service_duration(
  startDateStr: string,
  endDateStr: string = new Date().toISOString().split('T')[0],
  unpaidLeaves: Array<{ totalDays?: number; days?: number; leaveType?: string; excessDays?: number; status?: string }> = []
): {
  grossTotalDays: number;
  totalUnpaidDays: number;
  actualServiceDays: number;
  years: number;
  months: number;
  days: number;
  yearsFloat: number;
} {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const diffTime = Math.max(0, end.getTime() - start.getTime());
  const grossTotalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Sum approved unpaid leaves and excess days
  const totalUnpaidDays = unpaidLeaves.reduce((sum, l) => {
    const isApproved = !l.status || l.status === 'APPROVED' || l.status === 'VALIDATED';
    if (!isApproved) return sum;
    if (l.leaveType === 'UNPAID') return sum + (l.totalDays || l.days || 0);
    return sum + (l.excessDays || 0);
  }, 0);

  const actualServiceDays = Math.max(0, grossTotalDays - totalUnpaidDays);
  const yearsFloat = actualServiceDays / 365.25;
  const years = Math.floor(yearsFloat);
  const months = Math.floor((yearsFloat - years) * 12);
  const days = Math.round((((yearsFloat - years) * 12) - months) * 30.4375);

  return {
    grossTotalDays,
    totalUnpaidDays,
    actualServiceDays,
    years,
    months,
    days,
    yearsFloat,
  };
}

/**
 * Calculate Kuwait Labor Law End of Service (EOS)
 * Articles 51 & 53 of Kuwait Labor Law No. 6/2010
 */
export function calculateKuwaitEOS(params: {
  employeeId: string;
  employeeName: string;
  civilId: string;
  joinDate: string;
  leaveDate: string;
  grossSalary: number; // الراتب الإجمالي الأخير
  terminationType: 'RESIGNATION' | 'TERMINATION' | 'RETIREMENT' | 'CONTRACT_EXPIRED';
  contractType: 'INDEFINITE' | 'FIXED_TERM';
  unusedLeaveDays?: number;
  otherDeductions?: number;
  totalUnpaidLeaveDays?: number;
  unpaidLeavesBreakdown?: Array<{
    id: string;
    startDate: string;
    endDate: string;
    days: number;
    reason: string;
  }>;
}): EOSCalculation {
  const join = new Date(params.joinDate);
  const leave = new Date(params.leaveDate);
  
  // 1. Calculate Gross Duration in Days
  const diffTime = Math.max(0, leave.getTime() - join.getTime());
  const grossTotalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // 2. Kuwait Labor Law: Deduct Total Unpaid Leaves (إجازات بدون راتب تستبعد من مدة الخدمة)
  const unpaidDays = Math.max(0, params.totalUnpaidLeaveDays || 0);
  const netServiceDays = Math.max(0, grossTotalDays - unpaidDays);
  
  // 3. Net Service Duration in Years, Months, and Days
  const totalYearsFloat = netServiceDays / 365.25;
  const totalYears = Math.floor(totalYearsFloat);
  const totalMonths = Math.floor((totalYearsFloat - totalYears) * 12);
  const remainingDays = Math.round((((totalYearsFloat - totalYears) * 12) - totalMonths) * 30.4375);

  const dailySalary = params.grossSalary / 26; // 26 working days standard in Kuwait Labor Law

  // Article 51 Entitlement:
  // First 5 years: 15 days salary per year
  // Beyond 5 years: 30 days salary per year
  let first5YearsDays = 0;
  let after5YearsDays = 0;

  if (totalYearsFloat <= 5) {
    first5YearsDays = totalYearsFloat * 15;
    after5YearsDays = 0;
  } else {
    first5YearsDays = 5 * 15; // 75 days
    after5YearsDays = (totalYearsFloat - 5) * 30;
  }

  const totalEntitlementDays = first5YearsDays + after5YearsDays;
  let grossEosAmount = totalEntitlementDays * dailySalary;

  // Maximum EOS Cap = 18 Months of Gross Salary
  const maxCap = params.grossSalary * 18;
  if (grossEosAmount > maxCap) {
    grossEosAmount = maxCap;
  }

  // Article 53 Entitlement Adjustment (Resignation Ratio):
  let article53Ratio = 1.0;
  let article53Note = 'استحقاق كامل بنسبة 100% (إنهاء خدمة من رب العمل / انتهاء عقد / تقاعد)';

  if (params.terminationType === 'RESIGNATION') {
    if (params.contractType === 'FIXED_TERM') {
      if (totalYearsFloat < 3) {
        article53Ratio = 0.0;
        article53Note = 'استقالة بعقد محدد المدة قبل 3 سنوات: 0% استحقاق وفق المادة 53';
      } else if (totalYearsFloat < 5) {
        article53Ratio = 0.5;
        article53Note = 'استقالة بعقد محدد (3-5 سنوات): نصف المستحقات (50%) وفق المادة 53';
      } else {
        article53Ratio = 1.0;
        article53Note = 'استقالة بعقد محدد (أكثر من 5 سنوات): استحقاق كامل (100%)';
      }
    } else {
      // INDEFINITE contract
      if (totalYearsFloat < 3) {
        article53Ratio = 0.0;
        article53Note = 'استقالة بعقد غير محدد المدة أقل من 3 سنوات: 0% استحقاق وفق المادة 53';
      } else if (totalYearsFloat < 5) {
        article53Ratio = 0.5;
        article53Note = 'استقالة بعقد غير محدد (3 إلى 5 سنوات): نصف المستحقات (50%) وفق المادة 53';
      } else if (totalYearsFloat < 10) {
        article53Ratio = 2 / 3; // 66.66%
        article53Note = 'استقالة بعقد غير محدد (5 إلى 10 سنوات): ثلثي المستحقات (66.6%) وفق المادة 53';
      } else {
        article53Ratio = 1.0;
        article53Note = 'استقالة بعقد غير محدد (10 سنوات فأكثر): استحقاق كامل (100%) وفق المادة 53';
      }
    }
  }

  const netEosAmount = grossEosAmount * article53Ratio;

  // Unused leave payout
  const unusedLeaveDays = params.unusedLeaveDays || 0;
  const leavePayoutAmount = unusedLeaveDays * dailySalary;

  const deductions = params.otherDeductions || 0;
  const totalSettlement = Math.max(0, netEosAmount + leavePayoutAmount - deductions);

  return {
    employeeId: params.employeeId,
    employeeName: params.employeeName,
    civilId: params.civilId,
    joinDate: params.joinDate,
    leaveDate: params.leaveDate,
    totalYears,
    totalMonths,
    totalDays: remainingDays,
    lastGrossSalary: params.grossSalary,
    terminationType: params.terminationType,
    contractType: params.contractType,
    grossServiceDays: grossTotalDays,
    totalUnpaidLeaveDays: unpaidDays,
    netServiceDays: netServiceDays,
    unpaidLeavesCount: params.unpaidLeavesBreakdown?.length || (unpaidDays > 0 ? 1 : 0),
    unpaidLeavesBreakdown: params.unpaidLeavesBreakdown || [],
    first5YearsEntitlementDays: first5YearsDays,
    after5YearsEntitlementDays: after5YearsDays,
    grossEosAmount,
    article53Ratio,
    article53Note,
    netEosAmount,
    unusedLeaveDays,
    leavePayoutAmount,
    otherDeductions: deductions,
    totalSettlement,
  };
}

/**
 * Calculate Kuwait PIFSS (التأمينات الاجتماعية) Deduction - Removed completely per user request
 */
export function calculatePIFSS(isKuwaiti: boolean, grossSalary: number): number {
  return 0;
}

/**
 * Calculate Monthly Leave Accrual for 2026 (2.5 days / month according to Kuwait Labor Law)
 * - For employees joined before 2026 or in January 2026: Starts from January 2026 (12 months = 30 days total).
 * - For employees hired in 2026 (e.g. February 2026): Starts from their hire month (e.g. February = 11 months = 27.5 days total).
 * - Accrual of 2.5 days is credited on the 28th of each month (نهاية الشهر - يوم 28).
 */
export function calculateLeaveAccrual2026Details(joinDateStr?: string, asOfDate: Date = new Date()): {
  days: number;
  monthsCount: number;
  annualTotal2026: number;
  totalMonthsIn2026: number;
  startMonthName: string;
  startMonthIndex: number;
  isNewJoiner2026: boolean;
  isCurrentMonthCredited: boolean;
  nextCreditDateStr: string;
  note: string;
} {
  const currentYear = asOfDate.getFullYear();
  const monthNamesArabic = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  let joinYear = 2025; // default to prior year if not specified
  let joinMonth = 0; // 0 = January
  let isNewJoiner2026 = false;

  if (joinDateStr) {
    const join = new Date(joinDateStr);
    if (!isNaN(join.getTime())) {
      joinYear = join.getFullYear();
      joinMonth = join.getMonth(); // 0 to 11
      if (joinYear === 2026) {
        isNewJoiner2026 = true;
      } else if (joinYear > 2026) {
        return {
          days: 0,
          monthsCount: 0,
          annualTotal2026: 0,
          totalMonthsIn2026: 0,
          startMonthName: 'مستقبلي',
          startMonthIndex: -1,
          isNewJoiner2026: true,
          isCurrentMonthCredited: false,
          nextCreditDateStr: `${joinYear}-${String(joinMonth + 1).padStart(2, '0')}-28`,
          note: 'تاريخ تعيين مستقبلي بعد 2026 (لم يباشر العمل بعد)',
        };
      }
    }
  }

  // Determine starting month in 2026
  // If joined before 2026: starts from January 2026 (index 0)
  // If joined in 2026: starts from join month (e.g., Feb 2026 = index 1)
  const startMonthIndex = joinYear < 2026 ? 0 : Math.max(0, Math.min(11, joinMonth));
  const startMonthName = `${monthNamesArabic[startMonthIndex]} 2026`;

  // Full year 2026 entitlement (e.g., 12 months for Jan = 30 days, 11 months for Feb = 27.5 days, etc.)
  const totalMonthsIn2026 = 12 - startMonthIndex;
  const annualTotal2026 = totalMonthsIn2026 * 2.5;

  // Accrual up to asOfDate in 2026 (Credited on the 28th of each month)
  let monthsCount = 0;
  let isCurrentMonthCredited = false;
  let nextCreditDateStr = '';

  if (currentYear > 2026) {
    monthsCount = totalMonthsIn2026;
    isCurrentMonthCredited = true;
    nextCreditDateStr = 'تم اكتمال عام 2026';
  } else if (currentYear < 2026) {
    monthsCount = 0;
    isCurrentMonthCredited = false;
    nextCreditDateStr = '2026-01-28';
  } else {
    // Current year is 2026
    const curMonth = asOfDate.getMonth(); // 0 to 11 (e.g. August is 7)
    const curDay = asOfDate.getDate(); // 1 to 31

    if (curMonth < startMonthIndex) {
      // Haven't reached join month yet
      monthsCount = 0;
      isCurrentMonthCredited = false;
      nextCreditDateStr = `2026-${String(startMonthIndex + 1).padStart(2, '0')}-28`;
    } else {
      // Months strictly before the current month have already had their 28th passed
      const pastCompletedMonths = curMonth - startMonthIndex;
      // Current month is credited on or after the 28th
      isCurrentMonthCredited = curDay >= 28;
      const currentMonthEarned = isCurrentMonthCredited ? 1 : 0;
      monthsCount = Math.max(0, pastCompletedMonths + currentMonthEarned);

      if (isCurrentMonthCredited) {
        if (curMonth < 11) {
          nextCreditDateStr = `2026-${String(curMonth + 2).padStart(2, '0')}-28`;
        } else {
          nextCreditDateStr = 'مكتمل لعام 2026';
        }
      } else {
        nextCreditDateStr = `2026-${String(curMonth + 1).padStart(2, '0')}-28`;
      }
    }
  }

  const days = monthsCount * 2.5;
  const curDay = asOfDate.getDate();
  const curMonthIndex = asOfDate.getMonth();
  const curMonthName = monthNamesArabic[curMonthIndex] || '';

  const note = isNewJoiner2026 && startMonthIndex > 0
    ? `تم تعيين الموظف في (${startMonthName}): يُضاف استحقاق 2.5 يوم كل يوم 28 من الشهر (تمت إضافة ${monthsCount} أشهر = ${days.toFixed(1)} يوم حتى الآن${!isCurrentMonthCredited ? `، وستُضاف الـ 2.5 يوم لشهر ${curMonthName} في 28 ${curMonthName}` : ''})`
    : `يبدأ احتساب الرصيد لعام 2026 من شهر يناير بواقع 2.5 يوم كل يوم 28 من الشهر (تمت إضافة ${monthsCount} أشهر = ${days.toFixed(1)} يوم حتى الآن${!isCurrentMonthCredited ? `، وستُضاف الـ 2.5 يوم لشهر ${curMonthName} في 28 ${curMonthName}` : ''})`;

  return {
    days,
    monthsCount,
    annualTotal2026,
    totalMonthsIn2026,
    startMonthName,
    startMonthIndex,
    isNewJoiner2026,
    isCurrentMonthCredited,
    nextCreditDateStr,
    note,
  };
}

/**
 * Official Aysed Balance Calculation (الدالة الرسمية المعتمدة لحساب رصيد الإجازات - Aysed Official Balance)
 * 
 * Exact Python Implementation:
 * from datetime import date
 * from dateutil.relativedelta import relativedelta
 * 
 * def get_aysed_official_balance(self, employee):
 *     # 1. التواريخ المرجعية
 *     jan_2026 = date(2026, 1, 1)
 *     jan_2025 = date(2025, 1, 1)
 *     hire_date = employee.date_start
 *     today = date.today()
 * 
 *     # 2. تحديد تاريخ بداية الحساب بناءً على طلب السيد
 *     if hire_date < jan_2025:
 *         # الموظفين اللي قبل 2025 يحسبلهم من يناير 2026
 *         start_date = jan_2026
 *     elif hire_date >= jan_2026:
 *         # الموظفين الجدد من تاريخ المباشرة
 *         start_date = hire_date
 *     else:
 *         # الموظفين الذين تعينوا خلال 2025 (كحالة وسطى) يبدأون أيضاً من يناير 2026
 *         start_date = jan_2026
 * 
 *     # 3. حساب الشهور الفعلية والرصيد
 *     diff = relativedelta(today, start_date)
 *     months = diff.years * 12 + diff.months
 *     return months * 2.5
 */
export function get_aysed_official_balance(
  employeeOrHireDate?: string | Date | { date_start?: string; joinDate?: string; startDate?: string } | null,
  asOfDate: Date = new Date()
): number {
  // 1. التواريخ المرجعية
  const jan_2026 = new Date(2026, 0, 1); // 2026-01-01
  const jan_2025 = new Date(2025, 0, 1); // 2025-01-01
  const today = new Date(asOfDate.getFullYear(), asOfDate.getMonth(), asOfDate.getDate());

  let hire_date: Date = jan_2026;

  if (employeeOrHireDate) {
    if (typeof employeeOrHireDate === 'string') {
      const p = new Date(employeeOrHireDate);
      if (!isNaN(p.getTime())) hire_date = new Date(p.getFullYear(), p.getMonth(), p.getDate());
    } else if (employeeOrHireDate instanceof Date) {
      if (!isNaN(employeeOrHireDate.getTime())) hire_date = new Date(employeeOrHireDate.getFullYear(), employeeOrHireDate.getMonth(), employeeOrHireDate.getDate());
    } else if (typeof employeeOrHireDate === 'object') {
      const dStr = employeeOrHireDate.date_start || employeeOrHireDate.joinDate || employeeOrHireDate.startDate;
      if (dStr) {
        const p = new Date(dStr);
        if (!isNaN(p.getTime())) hire_date = new Date(p.getFullYear(), p.getMonth(), p.getDate());
      }
    }
  }

  // 2. تحديد تاريخ بداية الحساب بناءً على طلب السيد
  let start_date: Date;
  if (hire_date < jan_2025) {
    // الموظفين اللي قبل 2025 يحسبلهم من يناير 2026
    start_date = jan_2026;
  } else if (hire_date >= jan_2026) {
    // الموظفين الجدد من تاريخ المباشرة
    start_date = hire_date;
  } else {
    // الموظفين الذين تعينوا خلال 2025 (كحالة وسطى) يبدأون أيضاً من يناير 2026
    start_date = jan_2026;
  }

  // 3. حساب الشهور الفعلية والرصيد (relativedelta)
  if (today < start_date) {
    return 0;
  }

  let years = today.getFullYear() - start_date.getFullYear();
  let months = today.getMonth() - start_date.getMonth();

  if (today.getDate() < start_date.getDate()) {
    months--;
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  const totalMonths = Math.max(0, years * 12 + months);
  return totalMonths * 2.5;
}

/**
 * Get Aysed Smart Leave Balance (الدالة الذكية لحساب رصيد الإجازة بدقة)
 */
export function getAysedSmartLeaveBalance(hireDateInput?: string | Date, asOfDate: Date = new Date()): number {
  return get_aysed_official_balance(hireDateInput, asOfDate);
}

/**
 * Calculate Aysed Leave Balance (تطبيق قاعدة يناير 2026 وتاريخ المباشرة الأحدث)
 * Matches exact Python specification:
 * calculation_start_date = max(joining_date, reference_date)
 * total_months = diff.years * 12 + diff.months
 * earned_balance = total_months * 2.5
 */
export function calculateAysedLeaveBalance(joiningDateStr?: string, asOfDate: Date = new Date()): {
  calculationStartDate: string;
  totalMonths: number;
  earnedBalance: number;
  referenceDateStr: string;
  joiningDateStr: string;
  note: string;
} {
  const referenceDate = new Date('2026-01-01T00:00:00');
  const today = asOfDate;

  let joiningDate = today;
  if (joiningDateStr) {
    const parsed = new Date(joiningDateStr);
    if (!isNaN(parsed.getTime())) {
      joiningDate = parsed;
    }
  }

  // 2. تطبيق القاعدة (الأحدث بين يناير 2026 وتاريخ المباشرة)
  const calculationStartDate = joiningDate.getTime() > referenceDate.getTime() ? joiningDate : referenceDate;

  // 3. حساب عدد الشهور المكتملة منذ تاريخ البداية المختار
  let totalMonths = 0;
  if (today >= calculationStartDate) {
    let months = (today.getFullYear() - calculationStartDate.getFullYear()) * 12 + (today.getMonth() - calculationStartDate.getMonth());
    if (today.getDate() < calculationStartDate.getDate()) {
      months--;
    }
    totalMonths = Math.max(0, months);
  }

  // 4. الرصيد المستحق (2.5 يوم عن كل شهر)
  const earnedBalance = totalMonths * 2.5;

  const calStartIso = calculationStartDate.toISOString().split('T')[0];
  const joinIso = joiningDate.toISOString().split('T')[0];

  return {
    calculationStartDate: calStartIso,
    totalMonths,
    earnedBalance,
    referenceDateStr: '2026-01-01',
    joiningDateStr: joinIso,
    note: `تاريخ المباشرة: ${joinIso} | البداية المعتمدة: ${calStartIso} | عدد الشهور المكتملة: ${totalMonths} شهر | الرصيد المستحق: ${earnedBalance.toFixed(1)} يوم (2.5 يوم/شهر)`,
  };
}

export function calculateLeaveAccrualMonths(joinDateStr?: string, asOfDate: Date = new Date()): number {
  return get_aysed_official_balance(joinDateStr, asOfDate);
}

export function calculateLeaveAnnualEntitlement2026(joinDateStr?: string): number {
  return calculateLeaveAccrual2026Details(joinDateStr).annualTotal2026;
}

/**
 * Spells out KWD amount in Arabic text (Tafqit)
 */
export function tafqitKWD(amount: number): string {
  if (isNaN(amount) || amount <= 0) return 'صفر دينار كويتي لا غير';
  const dinars = Math.floor(amount);
  const fils = Math.round((amount - dinars) * 1000);

  const units = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
  const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

  function convertGroup(n: number): string {
    if (n === 0) return '';
    const h = Math.floor(n / 100);
    const rem = n % 100;
    const t = Math.floor(rem / 10);
    const u = rem % 10;

    let res = '';
    if (h > 0) res += hundreds[h] + ' ';

    if (rem > 0) {
      if (rem >= 11 && rem <= 19) {
        const teens = ['', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
        res += (res ? 'و' : '') + teens[rem - 10];
      } else {
        if (u > 0) {
          res += (res ? 'و' : '') + units[u] + ' ';
        }
        if (t > 0) {
          res += (res ? 'و' : '') + tens[t] + ' ';
        }
      }
    }
    return res.trim();
  }

  let text = '';

  if (dinars >= 1000) {
    const thousands = Math.floor(dinars / 1000);
    const remDinars = dinars % 1000;
    if (thousands === 1) {
      text += 'ألف ';
    } else if (thousands === 2) {
      text += 'ألفان ';
    } else if (thousands >= 3 && thousands <= 10) {
      text += convertGroup(thousands) + ' آلاف ';
    } else {
      text += convertGroup(thousands) + ' ألف ';
    }
    if (remDinars > 0) {
      text += 'و' + convertGroup(remDinars) + ' ';
    }
  } else if (dinars > 0) {
    text += convertGroup(dinars) + ' ';
  }

  let result = text.trim() ? `${text.trim()} دينار كويتي` : '';

  if (fils > 0) {
    result += (result ? ' و' : '') + `${fils} فلس`;
  }

  return `${result} لا غير`.trim();
}




export interface PublicHoliday {
  date: string; // YYYY-MM-DD
  name: string;
}

// Kuwait Public Holidays for 2026 (Example standard list)
export const KUWAIT_HOLIDAYS_2026: PublicHoliday[] = [
  { date: '2026-01-01', name: 'رأس السنة الميلادية' },
  { date: '2026-02-14', name: 'الإسراء والمعراج' },
  { date: '2026-02-25', name: 'العيد الوطني الكويتي' },
  { date: '2026-02-26', name: 'يوم التحرير' },
  { date: '2026-03-20', name: 'عيد الفطر السعيد' },
  { date: '2026-03-21', name: 'عيد الفطر السعيد' },
  { date: '2026-03-22', name: 'عيد الفطر السعيد' },
  { date: '2026-05-26', name: 'وقفة عرفات' },
  { date: '2026-05-27', name: 'عيد الأضحى المبارك' },
  { date: '2026-05-28', name: 'عيد الأضحى المبارك' },
  { date: '2026-05-29', name: 'عيد الأضحى المبارك' },
  { date: '2026-06-16', name: 'رأس السنة الهجرية' },
  { date: '2026-08-25', name: 'المولد النبوي الشريف' },
];

/**
 * Returns the list of holidays, automatically adding a compensation day 
 * (Thursday or Sunday) if a public holiday falls on a Friday.
 */
export function getCompensatedHolidays2026(): PublicHoliday[] {
  const finalHolidays: PublicHoliday[] = [];
  const holidayDates = new Set(KUWAIT_HOLIDAYS_2026.map(h => h.date));
  
  for (const holiday of KUWAIT_HOLIDAYS_2026) {
    finalHolidays.push(holiday);
    const date = new Date(holiday.date);
    if (date.getDay() === 5) { // Friday
       const thursday = new Date(date);
       thursday.setDate(thursday.getDate() - 1);
       const thursdayStr = thursday.toISOString().split('T')[0];
       
       const sunday = new Date(date);
       sunday.setDate(sunday.getDate() + 2);
       const sundayStr = sunday.toISOString().split('T')[0];

       if (!holidayDates.has(thursdayStr)) {
         finalHolidays.push({ date: thursdayStr, name: holiday.name + ' (يوم تعويضي)' });
         holidayDates.add(thursdayStr);
       } else if (!holidayDates.has(sundayStr)) {
         finalHolidays.push({ date: sundayStr, name: holiday.name + ' (يوم تعويضي)' });
         holidayDates.add(sundayStr);
       }
    }
  }
  
  return finalHolidays.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * يحسب عدد أيام الإجازة الفعلية بين تاريخين مع استبعاد:
 * 1. أيام الجمعة
 * 2. أيام السبت (حسب طلب العميل، السبت يوم عمل في بعض الشركات، لكن في طلبنا السابق ربما تم استبعاده. سنصحح هذا لاحقاً ليعتمد الجمعة فقط إذا لزم، لكن بما أن العميل ذكر أعلاه: يوم الراحة الجمعة، إذن نستبعد الجمعة والعطلات فقط).
 * 3. العطلات الرسمية + التعويضية
 * حسب قانون العمل الكويتي
 */
export function calculateActualLeaveDays(startDateStr: string, endDateStr: string): { totalDays: number, actualDays: number, deductedHolidays: number, deductedWeekends: number } {
  if (!startDateStr || !endDateStr) return { totalDays: 0, actualDays: 0, deductedHolidays: 0, deductedWeekends: 0 };
  
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return { totalDays: 0, actualDays: 0, deductedHolidays: 0, deductedWeekends: 0 };
  }

  const compensatedHolidays = getCompensatedHolidays2026();
  const holidaysSet = new Set(compensatedHolidays.map(h => h.date));
  
  let current = new Date(start);
  let totalDays = 0;
  let actualDays = 0;
  let deductedWeekends = 0;
  let deductedHolidays = 0;

  while (current <= end) {
    totalDays++;
    const dayOfWeek = current.getDay();
    const dateString = current.toISOString().split('T')[0];
    
    // According to the user: "يوم الراحة: الجمعة" only. Saturday is a working day.
    const isWeekend = dayOfWeek === 5; // 5 = Friday
    const isHoliday = holidaysSet.has(dateString);

    if (isHoliday && !isWeekend) {
      deductedHolidays++;
    } else if (isWeekend) {
      deductedWeekends++;
    } else {
      actualDays++;
    }

    current.setDate(current.getDate() + 1);
  }

  return { totalDays, actualDays, deductedHolidays, deductedWeekends };
}

// Payroll Module Logic (Kuwait Law & PIFSS)
export function calculatePIFSSDeduction(basicSalary: number): number {
    return basicSalary * 0.105;
}

export function calculateUnpaidDeduction(basic: number, allowances: number, unpaidDays: number): number {
    const dayValue = (basic + allowances) / 26;
    return unpaidDays * dayValue;
}

export function calculateNetSalary(basic: number, allowances: number, unpaidDays: number, isKuwaiti: boolean = false, otherDeductions: number = 0): number {
    const pifss_deduction = isKuwaiti ? calculatePIFSSDeduction(basic) : 0;
    const unpaid_deduction = calculateUnpaidDeduction(basic, allowances, unpaidDays);
    return (basic + allowances) - (pifss_deduction + unpaid_deduction + otherDeductions);
}

export function calculateIndemnity(years: number, totalSalary: number): number {
    if (years < 5) return (totalSalary / 2) * years;
    return (totalSalary * 5 / 2) + (totalSalary * (years - 5));
}

// Attendance GPS Validation
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; 
}

export const OFFICE_LOCATION = { lat: 29.3759, lng: 47.9774 };

export function validateLocation(userLat: number, userLng: number): boolean {
    const distance = calculateDistance(userLat, userLng, OFFICE_LOCATION.lat, OFFICE_LOCATION.lng);
    return distance < 200; 
}
