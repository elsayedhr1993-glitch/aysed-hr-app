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
 * Calculate 2026 Accrued Days based strictly on service months within 2026 up to August 2026 (or asOfDate).
 * - Hired before 2026-01-01: 8 months * 2.5 = 20.0 days (up to August).
 * - Hired during 2026 (e.g. 2026-06-01): June, July, August = 3 months * 2.5 = 7.5 days.
 */
export function calculate2026AccruedDays(
  employeeOrHireDate?: string | Date | { date_start?: string; joinDate?: string; startDate?: string; openingLeaveDate?: string; openingDate?: string; employeeCode?: string; fullNameAr?: string } | null,
  asOfDate: Date = new Date(2026, 7, 31) // August 2026 target
): number {
  const jan_2026 = new Date(2026, 0, 1);
  const targetDate = asOfDate;

  if (targetDate < jan_2026) return 0;

  let hire_date: Date = jan_2026;
  if (employeeOrHireDate) {
    if (typeof employeeOrHireDate === 'string') {
      const p = new Date(employeeOrHireDate);
      if (!isNaN(p.getTime())) hire_date = new Date(p.getFullYear(), p.getMonth(), p.getDate());
    } else if (employeeOrHireDate instanceof Date) {
      if (!isNaN(employeeOrHireDate.getTime())) hire_date = new Date(employeeOrHireDate.getFullYear(), employeeOrHireDate.getMonth(), employeeOrHireDate.getDate());
    } else if (typeof employeeOrHireDate === 'object' && employeeOrHireDate !== null) {
      const isBkhit = employeeOrHireDate.fullNameAr?.includes('السيد بخيت') && (employeeOrHireDate as any).joinDate === '2026-06-01';
      const dStr = isBkhit ? '2026-06-01' : ((employeeOrHireDate as any).openingLeaveDate || (employeeOrHireDate as any).openingDate || employeeOrHireDate.date_start || employeeOrHireDate.joinDate || employeeOrHireDate.startDate);
      if (dStr) {
        const p = new Date(dStr);
        if (!isNaN(p.getTime())) hire_date = new Date(p.getFullYear(), p.getMonth(), p.getDate());
      }
    }
  }

  const start_date = hire_date < jan_2026 ? jan_2026 : hire_date;
  if (targetDate < start_date) return 0;

  // Monthly Accrual Rate: 2.5 days per month accrued strictly on a pro-rata daily basis (30.4375 days/month)
  const diffTime = targetDate.getTime() - start_date.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24) + 1; // inclusive of start day
  const accrued = (diffDays / 30.4375) * 2.5;
  return Number(Math.max(0, accrued).toFixed(2));
}

/**
 * Check if employee is hired on or after 2026-01-01
 */
export function isEmployeeHiredIn2026OrLater(
  employeeOrHireDate?: string | Date | { date_start?: string; joinDate?: string; startDate?: string; employeeCode?: string; fullNameAr?: string } | null
): boolean {
  if (!employeeOrHireDate) return false;
  let hire_date: Date | null = null;
  if (typeof employeeOrHireDate === 'string') {
    const p = new Date(employeeOrHireDate);
    if (!isNaN(p.getTime())) hire_date = p;
  } else if (employeeOrHireDate instanceof Date) {
    if (!isNaN(employeeOrHireDate.getTime())) hire_date = employeeOrHireDate;
  } else if (typeof employeeOrHireDate === 'object') {
    const isBkhit = employeeOrHireDate.fullNameAr?.includes('السيد بخيت') && (employeeOrHireDate as any).joinDate === '2026-06-01';
    const dStr = isBkhit ? '2026-06-01' : (employeeOrHireDate.date_start || employeeOrHireDate.joinDate || employeeOrHireDate.startDate);
    if (dStr) {
      const p = new Date(dStr);
      if (!isNaN(p.getTime())) hire_date = p;
    }
  }
  if (!hire_date) return false;
  return hire_date >= new Date('2026-01-01');
}

/**
 * Global Opening Balance Rule:
 * - Hired on or after 2026-01-01: strictly 0.0 days.
 * - Hired before 2026-01-01: carryover from 2025 allocations.
 */
export function getCarriedOverBalance(emp: any): number {
  if (!emp) return 0.0;

  // 1. Direct fields on employee object
  const v2025 = Number(emp.carriedOverLeave2025 ?? emp.carriedOver_2025 ?? emp.carriedOver2025);
  const vBal = Number(emp.carriedOverBalance ?? emp.carriedOverLeaveBalance ?? emp.aysed_carried_over ?? emp.openingLeaveBalance ?? emp.openingBalance ?? emp.initialLeaveBalance ?? emp.carriedOver);

  if (!isNaN(v2025) && v2025 > 0) return v2025;
  if (!isNaN(vBal) && vBal > 0) return vBal;

  if (emp.carriedOverLeave2025 !== undefined && emp.carriedOverLeave2025 !== null && !isNaN(Number(emp.carriedOverLeave2025))) {
    return Number(emp.carriedOverLeave2025);
  }
  if (emp.carriedOverBalance !== undefined && emp.carriedOverBalance !== null && !isNaN(Number(emp.carriedOverBalance))) {
    return Number(emp.carriedOverBalance);
  }
  if (emp.openingBalance !== undefined && emp.openingBalance !== null && !isNaN(Number(emp.openingBalance))) {
    return Number(emp.openingBalance);
  }
  if (emp.openingLeaveBalance !== undefined && emp.openingLeaveBalance !== null && !isNaN(Number(emp.openingLeaveBalance))) {
    return Number(emp.openingLeaveBalance);
  }

  // 2. Check localStorage allocations table for any regular opening allocation
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const rawAllocs = window.localStorage.getItem('manara_leave_allocations_data');
      if (rawAllocs) {
        const parsed = JSON.parse(rawAllocs);
        if (Array.isArray(parsed)) {
          const empRegular = parsed.filter((a: any) => a.employeeId === emp.id && a.allocationType === 'regular');
          if (empRegular.length > 0) {
            const sum = empRegular.reduce((s: number, a: any) => s + (Number(a.numberOfDays) || 0), 0);
            if (sum > 0) return sum;
          }
        }
      }
    }
  } catch (e) {}

  return 0.0;
}

export function getOpeningBalance(emp: any): number {
  return 0.0;
}

export function getGlobalOpeningBalance(emp: any): number {
  return getCarriedOverBalance(emp);
}

export function getCurrentYearAccrued(emp: any, asOfDate: Date = new Date(2026, 7, 31)): number {
  return calculate2026AccruedDays(emp, asOfDate);
}

export function getGlobalAccrued2026(emp: any, asOfDate: Date = new Date(2026, 7, 31)): number {
  return getCurrentYearAccrued(emp, asOfDate);
}

export interface UniversalLeaveLedger {
  carriedOverBalance: number;
  currentYearAccrued: number;
  totalAllocated: number;
  totalApprovedTaken: number;
  netAvailableBalance: number;
  breakdown: string;
}

/**
 * دالة حساب وتقسيم إجازة الوفاة والعزاء وفق المادة 77 من قانون العمل الكويتي رقم 6 لسنة 2010:
 * "للعامل الحق في إجازة بأجر كامل لمدة ثلاثة أيام في حالة وفاة أحد أقاربه من الدرجة الأولى أو الثانية،
 * ولا تخصم هذه الإجازة من رصيد إجازاته السنوية".
 * 
 * في حال رغبة الموظف في تمديد الإجازة (مثلاً 14 يوماً):
 * - الأيام 1 إلى 3: إجازة عزاء رسمية مدفوعة بالكامل دون خصم من الرصيد السنوي (0 deduction).
 * - الأيام المتبقية (11 يوماً): تخصم من رصيد الإجازة السنوية المتاح.
 * - أي أيام إضافية تتجاوز الرصيد السنوي تحتسب كأيام بدون راتب.
 */
export interface BereavementLeaveSplitResult {
  totalRequestedDays: number;
  statutoryBereavementDays: number;
  annualDeductedDays: number;
  excessUnpaidDays: number;
  paidDaysTotal: number;
  isSplit: boolean;
  explanation: string;
}

export function calculateBereavementLeaveSplit(
  totalRequestedDays: number,
  availableAnnualBalance: number = 0,
  degree: 'FIRST' | 'SECOND' | 'OTHER' = 'FIRST'
): BereavementLeaveSplitResult {
  const total = Math.max(0, totalRequestedDays);
  const available = Math.max(0, availableAnnualBalance);

  // إذا كانت صلة القرابة من الدرجة الأولى أو الثانية، يستحق 3 أيام مدفوعة قانوناً
  const maxStatutoryDays = (degree === 'FIRST' || degree === 'SECOND') ? 3 : 0;
  const statutoryBereavementDays = Math.min(total, maxStatutoryDays);
  const remainingDays = Math.max(0, total - statutoryBereavementDays);

  const annualDeductedDays = Math.min(available, remainingDays);
  const excessUnpaidDays = Math.max(0, remainingDays - annualDeductedDays);
  const paidDaysTotal = statutoryBereavementDays + annualDeductedDays;
  const isSplit = remainingDays > 0;

  let explanation = '';
  if (total <= maxStatutoryDays) {
    explanation = `إجازة عزاء مستحقة بالكامل وفق المادة 77 (${statutoryBereavementDays} أيام بأجر كامل دون أي خصم من الرصيد السنوي).`;
  } else {
    explanation = `تم تطبيق المادة 77: أول ${statutoryBereavementDays} أيام إجازة عزاء رسمية مدفوعة (خصم 0 من الرصيد السنوي) + ${annualDeductedDays} يوم مخصومة من الرصيد السنوي المتاح${excessUnpaidDays > 0 ? ` + ${excessUnpaidDays} يوم إجازة بدون راتب (لتجاوز الرصيد)` : ''}.`;
  }

  return {
    totalRequestedDays: total,
    statutoryBereavementDays,
    annualDeductedDays,
    excessUnpaidDays,
    paidDaysTotal,
    isSplit,
    explanation,
  };
}

/**
 * Universal Multi-Year Leave Balance Formula (Single Source of Truth):
 * Total Available Balance = (carried_over_balance + current_year_accrued) - total_approved_leaves_taken
 */
export function computeUniversalLeaveLedger(emp: any, leaves: any[] = [], asOfDate: Date = new Date(2026, 7, 31)): UniversalLeaveLedger {
  const carriedOverBalance = getCarriedOverBalance(emp);
  const currentYearAccrued = getCurrentYearAccrued(emp, asOfDate);

  const totalAllocated = Number((carriedOverBalance + currentYearAccrued).toFixed(2));

  const approvedTaken = (leaves || [])
    .filter(l => !l.isHistorical && l.employeeId === emp?.id && (l.status === 'APPROVED' || l.status === 'VALIDATED'))
    .reduce((sum, l) => {
      if (l.leaveType === 'ANNUAL') {
        return sum + (l.totalDays || 0);
      }
      // For BEREAVEMENT / COMPASSIONATE leaves:
      // If extended and split with annual balance, only deduct the annual portion
      if ((l.leaveType === 'BEREAVEMENT' || l.leaveType === 'COMPASSIONATE') && l.isSplitBereavement) {
        return sum + (l.annualDeductedDays !== undefined ? l.annualDeductedDays : Math.max(0, (l.totalDays || 0) - 3));
      }
      return sum;
    }, 0);

  const netAvailableBalance = Number(Math.max(0, totalAllocated - approvedTaken).toFixed(2));
  const breakdown = `مرحل: ${carriedOverBalance} + مكتسب: ${currentYearAccrued} - مستهلك: ${approvedTaken} = متاح: ${netAvailableBalance}`;

  return {
    carriedOverBalance,
    currentYearAccrued,
    totalAllocated,
    totalApprovedTaken: approvedTaken,
    netAvailableBalance,
    breakdown
  };
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
    return 0; // إلغاء التأمينات الاجتماعية نهائياً (0%) للمنشأة الطبية الخاصة
}

export function calculateUnpaidDeduction(basic: number, allowances: number, unpaidDays: number): number {
    const dayValue = (basic + allowances) / 26;
    return unpaidDays * dayValue;
}

export function calculateNetSalary(basic: number, allowances: number, unpaidDays: number, isKuwaiti: boolean = false, otherDeductions: number = 0): number {
    const pifss_deduction = 0; // تم الإلغاء
    const unpaid_deduction = calculateUnpaidDeduction(basic, allowances, unpaidDays);
    return (basic + allowances) - (unpaid_deduction + otherDeductions);
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

/**
 * كود تـجميع أرصـدة الإجـازات (الـسنوي، المـرحل، والمـرضي) طبقاً لمعايير أودو وقانون العمل الكويتي
 */
export function get_aysed_comprehensive_report(employee: { joinDate?: string; date_start?: string }, leaves: any[] = [], carriedAllocations: number = 0) {
    const joinDate = employee?.joinDate || employee?.date_start;
    const annualRemaining = get_aysed_official_balance(joinDate);
    const sickLeaveRemaining = 15; // 15 days full pay per year by default
    return {
        carried_forward: carriedAllocations,
        annual_remaining: annualRemaining,
        sick_leave_remaining: sickLeaveRemaining,
        total_available: annualRemaining + carriedAllocations
    };
}

/**
 * كود إضافة رصيد الإجازات في أول يوم من كل شهر (مماثل لدالة الـ Cron في أودو بتوقيت الكويت Asia/Kuwait)
 */
export function _cron_aysed_monthly_accrual(employees: Array<{ id: string; status?: string; joinDate?: string; date_start?: string }>, currentDate: Date = new Date(), force: boolean = false) {
    let targetDate = currentDate;
    try {
        const kuwaitOptions: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Kuwait', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false };
        const kuwaitStr = new Intl.DateTimeFormat('en-US', kuwaitOptions).format(currentDate);
        const parsed = new Date(kuwaitStr);
        if (!isNaN(parsed.getTime())) {
            targetDate = parsed;
        }
    } catch {
        targetDate = currentDate;
    }

    // التأكد أن اليوم هو فعلاً يوم 1 في الشهر (أو تم فرضه يدوياً من لوحة التحكم)
    if (!force && targetDate.getDate() !== 1) {
        return {
            addedCount: 0,
            allocations: [],
            note: `تنبيه (توقيت الكويت): اليوم هو ${targetDate.getDate()} من الشهر وليس اليوم الأول (1). لن يتم إضافة الرصيد التلقائي إلا في أول يوم من الشهر طبقاً لقاعدة Odoo Cron.`
        };
    }

    const activeEmployees = (employees || []).filter(e => {
        const jDate = e.joinDate || e.date_start;
        const isJoined = jDate ? new Date(jDate) <= targetDate : true;
        return (e.status === 'ACTIVE' || !e.status) && isJoined;
    });

    const monthNamesArabic = [
        'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    const mIdx = targetDate.getMonth();
    const monthName = monthNamesArabic[mIdx >= 0 && mIdx < 12 ? mIdx : 0];
    const year = targetDate.getFullYear() || new Date().getFullYear();

    const allocations = activeEmployees.map(emp => ({
        id: `alloc-${emp.id}-${Date.now()}-${Math.floor(Math.random()*1000)}`,
        employeeId: emp.id,
        days: 2.5,
        name: `رصيد تلقائي (نظام Aysed) - شهر ${mIdx + 1} (${monthName} ${year})`
    }));

    return {
        addedCount: activeEmployees.length,
        allocations,
        note: `تمت إضافة 2.5 يوم لعدد ${activeEmployees.length} موظف بنجاح (توقيت الكويت: ${targetDate.toISOString().split('T')[0]})`
    };
}

export function cron_aysed_monthly_accrual(employees: Array<{ id: string; status?: string; joinDate?: string; date_start?: string }>, currentDate: Date = new Date(), force: boolean = true) {
    return _cron_aysed_monthly_accrual(employees, currentDate, force);
}

/**
 * حساب بنود التسوية لشيت نظام Aysed 2026 (مماثل لـ get_aysed_settlement_report_data في Odoo)
 */
export function get_aysed_settlement_report_data(employeeBalance: number, requestedDays: number, employeeWage: number, additionalDays: number = 0) {
    const bal = isNaN(employeeBalance) || employeeBalance === undefined ? 0 : employeeBalance;
    const req = isNaN(requestedDays) || requestedDays === undefined ? 0 : requestedDays;
    const wage = isNaN(employeeWage) || employeeWage === undefined ? 0 : employeeWage;
    const add = isNaN(additionalDays) || additionalDays === undefined ? 0 : additionalDays;

    const total_accrued = bal + add;

    let aysed_paid_days = 0;
    let aysed_unpaid_days = 0;

    if (req <= bal) {
        aysed_paid_days = req;
        aysed_unpaid_days = 0;
    } else {
        aysed_paid_days = bal;
        aysed_unpaid_days = req - bal;
    }

    const daily_wage = wage > 0 ? wage / 26 : 0;
    const paid_amount = aysed_paid_days * daily_wage;

    return {
        total_accrued: isNaN(total_accrued) ? 0 : total_accrued,
        requested_days: req,
        available_paid: bal,
        aysed_paid_days: isNaN(aysed_paid_days) ? 0 : aysed_paid_days,
        aysed_unpaid_days: isNaN(aysed_unpaid_days) ? 0 : aysed_unpaid_days,
        daily_wage: isNaN(daily_wage) ? 0 : Number(daily_wage.toFixed(3)),
        paid_amount: isNaN(paid_amount) ? 0 : Number(paid_amount.toFixed(3))
    };
}

/**
 * دالة موحدة لحساب استحقاق الإجازات السنوية تعتمد فقط على تاريخ المباشرة (Date of Joining)
 * لجميع الموظفين، بواقع 2.5 يوم عن كل شهر مكتمل حتى تاريخ اليوم بدقة تامة.
 */
export function calculateAysedLeaveByJoiningDate(joiningDateStr?: string | Date | null, asOfDate: Date = new Date()): number {
  if (!joiningDateStr) return 0;
  const joinDate = new Date(joiningDateStr);
  if (isNaN(joinDate.getTime())) return 0;

  const today = new Date(asOfDate.getFullYear(), asOfDate.getMonth(), asOfDate.getDate());
  const start = new Date(joinDate.getFullYear(), joinDate.getMonth(), joinDate.getDate());

  if (today < start) return 0;

  let years = today.getFullYear() - start.getFullYear();
  let months = today.getMonth() - start.getMonth();

  if (today.getDate() < start.getDate()) {
    months--;
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  const totalCompletedMonths = Math.max(0, years * 12 + months);
  return totalCompletedMonths * 2.5;
}

/**
 * حساب مكافأة نهاية الخدمة - نظام Aysed S HR 2026
 * مبرمج وفق قانون العمل الكويتي (المادتين 51 و 53)
 * 
 * @param monthlySalary - الراتب الشامل الأخير
 * @param serviceYears - مدة الخدمة بالسنوات (شاملة الكسور)
 * @param isResignation - true للاستقالة، false لإنهاء الخدمة من قِبل الشركة
 * @returns إجمالي المكافأة بالدينار الكويتي (3 خانات عشرية)
 */
export const calculateKuwaitIndemnity = (
  monthlySalary: number,
  serviceYears: number,
  isResignation: boolean
): number => {
  if (monthlySalary <= 0 || serviceYears <= 0) return 0;

  // 1. حساب أجر اليوم الواحد وفق معيار الـ 26 يوم عمل
  const dailyWage = monthlySalary / 26;
  let totalIndemnity = 0;

  // 2. حساب أصل المكافأة الإجمالية (المادة 51)
  if (serviceYears <= 5) {
    totalIndemnity = serviceYears * 15 * dailyWage;
  } else {
    const firstFiveYears = 5 * 15 * dailyWage;
    const remainingYears = (serviceYears - 5) * monthlySalary;
    totalIndemnity = firstFiveYears + remainingYears;
  }

  // 3. تطبيق سقف الحد الأقصى للمكافأة (أجر 18 شهراً كحد أقصى)
  const maxCap = monthlySalary * 18;
  if (totalIndemnity > maxCap) {
    totalIndemnity = maxCap;
  }

  // 4. تطبيق شروط الاستقالة (المادة 53)
  if (isResignation) {
    if (serviceYears < 3) {
      return 0; // أقل من 3 سنوات: لا يستحق
    } else if (serviceYears >= 3 && serviceYears < 5) {
      return Number((totalIndemnity * 0.5).toFixed(3)); // يستحق النصف (50%)
    } else if (serviceYears >= 5 && serviceYears < 10) {
      return Number((totalIndemnity * (2 / 3)).toFixed(3)); // يستحق الثلثين (66.66%)
    } else {
      return Number(totalIndemnity.toFixed(3)); // 10 سنوات فأكثر: المكافأة كاملة
    }
  }

  // 5. في حالة إنهاء الخدمة من قِبل الشركة (يشترط إكمال سنة واحدة)
  if (serviceYears < 1) {
    return 0;
  }

  return Number(totalIndemnity.toFixed(3));
};

/**
 * محرك معالجة البصمة واحتساب التأخير والعمل الإضافي - نظام Aysed S HR 2026
 * متوافق مع قانون العمل الكويتي (القطاع الأهلي)
 */
export interface AttendanceInput {
  checkIn: Date;
  checkOut: Date;
  shiftStart: Date;
  shiftEnd: Date;
  basicSalary?: number;
  isHoliday?: boolean;
}

export interface AttendanceMetricsResult {
  lateMinutes: number;
  earlyLeaveMinutes: number;
  actualWorkHours: number;
  rawOvertimeHours: number;
  payableOvertimeHours: number;
  overtimeAmount: number;
  lateDeductionAmount: number;
  status: 'حضور منتظم' | 'تأخير بسيط' | 'تأخير جسيم' | 'خروج مبكر';
}

export const processAttendanceMetrics = ({
  checkIn,
  checkOut,
  shiftStart,
  shiftEnd,
  basicSalary = 0,
  isHoliday = false,
}: AttendanceInput): AttendanceMetricsResult => {
  const GRACE_PERIOD_MINS = 15;
  const STANDARD_DAILY_HOURS = 8;
  const WORKING_DAYS_MONTH = 26;

  // 1. حساب أجر الساعة (معيار الكويت: الراتب / 26 يوم / 8 ساعات)
  const hourlyRate = basicSalary > 0 
    ? basicSalary / WORKING_DAYS_MONTH / STANDARD_DAILY_HOURS 
    : 0;

  // 2. حساب التأخير الصباحي (بالدقائق)
  let lateMinutes = 0;
  const arrivalDiffMins = (checkIn.getTime() - shiftStart.getTime()) / (1000 * 60);
  if (arrivalDiffMins > GRACE_PERIOD_MINS) {
    lateMinutes = Math.round(arrivalDiffMins);
  }

  // 3. حساب الخروج المبكر (بالدقائق)
  let earlyLeaveMinutes = 0;
  const departureDiffMins = (shiftEnd.getTime() - checkOut.getTime()) / (1000 * 60);
  if (departureDiffMins > 0) {
    earlyLeaveMinutes = Math.round(departureDiffMins);
  }

  // 4. حساب ساعات العمل الفعلي
  const actualWorkMs = Math.max(0, checkOut.getTime() - checkIn.getTime());
  const actualWorkHours = parseFloat((actualWorkMs / (1000 * 60 * 60)).toFixed(2));

  // 5. حساب ساعات العمل الإضافي (بعد نهاية الشفت المحدد)
  let rawOvertimeHours = 0;
  const overtimeMs = checkOut.getTime() - shiftEnd.getTime();
  if (overtimeMs > 0) {
    rawOvertimeHours = parseFloat((overtimeMs / (1000 * 60 * 60)).toFixed(2));
  }

  // معامل الإضافي الكويتي: 1.25x للأيام العادية، 1.5x للعطل والجمع
  const overtimeMultiplier = isHoliday ? 1.5 : 1.25;
  const payableOvertimeHours = parseFloat((rawOvertimeHours * overtimeMultiplier).toFixed(2));

  // 6. الاحتساب المالي (بالدينار الكويتي)
  const overtimeAmount = parseFloat((payableOvertimeHours * hourlyRate).toFixed(3));
  const lateDeductionAmount = parseFloat(((lateMinutes / 60) * hourlyRate).toFixed(3));

  // 7. تحديد الحالة الإدارية
  let status: AttendanceMetricsResult['status'] = 'حضور منتظم';
  if (lateMinutes > 60) {
    status = 'تأخير جسيم';
  } else if (lateMinutes > 0) {
    status = 'تأخير بسيط';
  } else if (earlyLeaveMinutes > 15) {
    status = 'خروج مبكر';
  }

  return {
    lateMinutes,
    earlyLeaveMinutes,
    actualWorkHours,
    rawOvertimeHours,
    payableOvertimeHours,
    overtimeAmount,
    lateDeductionAmount,
    status,
  };
};

/**
 * نظام حماية الأجور الكويتي (Kuwait WPS / SIF Generator) - نظام Aysed S HR 2026
 */
export interface WPSEmployeeRecord {
  civil_id: string;      // الرقم المدني (12 رقم)
  bank_code: string;     // كود البنك (4 أرقام مثل NBK=0004)
  iban: string;          // رقم الآيبان الكويتي (KW...)
  basic_salary: number;  // الراتب الأساسي
  allowances?: number;   // البدلات
  deductions?: number;   // الاستقطاعات
  net_salary: number;    // الصافي النهائي
}

export interface WPSHeaderInput {
  companyMOSALId: string; // رقم ملف الشركة في وزارة الشؤون / القوى العاملة
  employerBankCode: string; // كود بنك الشركة المحول منه
  payrollMonthYear: string; // صيغة YYYY-MM
}

/**
 * 1. دالة إنشاء محتوى ملف الـ SIF
 */
export const generateKuwaitSIFContent = (
  headerInfo: WPSHeaderInput,
  employees: WPSEmployeeRecord[]
): string => {
  const now = new Date();
  const fileCreationDate = now.toISOString().slice(0, 10).replace(/-/g, '');
  const fileCreationTime = now.toTimeString().slice(0, 5).replace(/:/g, '');
  const salaryMonth = headerInfo.payrollMonthYear.replace('-', '');

  // حساب إجمالي رواتب المسير
  const totalSalaries = employees.reduce((sum, emp) => sum + emp.net_salary, 0);

  // السطر التعريفي (Header Record - H)
  let sifContent = `H,${headerInfo.companyMOSALId},${headerInfo.employerBankCode},${fileCreationDate},${fileCreationTime},${salaryMonth},${employees.length},${totalSalaries.toFixed(3)}\n`;

  // أسطر تفاصيل الموظفين (Detail Records - D)
  employees.forEach((emp) => {
    const civilId = (emp.civil_id || '').trim().padStart(12, '0');
    const bankCode = (emp.bank_code || '').trim().padStart(4, '0');
    const iban = (emp.iban || '').trim().replace(/\s+/g, '');
    const basic = (emp.basic_salary || 0).toFixed(3);
    const extra = (emp.allowances || 0).toFixed(3);
    const ded = (emp.deductions || 0).toFixed(3);
    const net = (emp.net_salary || 0).toFixed(3);

    // الحقول القياسية: D, الرقم المدني, كود البنك, الآيبان, الراتب الأساسي, البدلات, الخصومات, الصافي
    sifContent += `D,${civilId},${bankCode},${iban},${basic},${extra},${ded},${net}\n`;
  });

  return sifContent;
};

/**
 * 2. دالة تنزيل الملف مباشرة من المتصفح
 */
export const downloadKuwaitWPSFile = (
  headerInfo: WPSHeaderInput,
  employees: WPSEmployeeRecord[]
) => {
  const content = generateKuwaitSIFContent(headerInfo, employees);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.href = url;
  link.setAttribute('download', `WPS_${headerInfo.companyMOSALId}_${headerInfo.payrollMonthYear}.sif`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};




