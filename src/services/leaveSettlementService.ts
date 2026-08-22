// src/services/leaveSettlementService.ts
import { supabase, isSupabaseConfigured } from '../lib/supabase';

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
  aysed_accrued_2026: number;
  aysed_unpaid_days: number;
  aysed_paid_days: number;
  aysed_daily_wage: number;
  aysed_net_payable: number;
}

export interface AysedLeaveEngineInput {
  carriedOver: number;
  accrued: number;
  requestedDays: number;
  monthlyWage: number;
}

/**
 * 1. حساب أيام الإجازة الفعلية باستبعاد أيام الجمعة (المادة 70 - قانون العمل الكويتي)
 */
export function calculateWorkingLeaveDays(startDateStr: string, endDateStr: string): { totalDays: number; fridaysCount: number; workingDays: number } {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  
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
  
  return {
    totalDays,
    fridaysCount,
    workingDays: Math.max(0, totalDays - fridaysCount)
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
  return Number((totalMonths * 2.5).toFixed(2));
}

/**
 * 3. حاسبة قيمة اليوم الواحد بقاعدة 26 يوم كويتي
 */
export function calculateKuwaitDailyRate(basicWage: number): number {
  if (!basicWage || basicWage <= 0) return 0;
  return Number((basicWage / 26).toFixed(3));
}

/**
 * 4. محرك تسوية واحتساب الإجازة الموحد (Odoo & Kuwait Labor Law)
 */
export function processLeaveSettlement(input: LeaveRequestInput): LeaveSettlementResult {
  const asOfDate = input.asOfDate || new Date();
  const { totalDays, fridaysCount, workingDays } = calculateWorkingLeaveDays(input.startDate, input.endDate);

  const carriedOver = Number(input.carriedOverBalance || 0);
  const currentAccrued = input.currentYearAccrued !== undefined 
    ? input.currentYearAccrued 
    : computeAccrual2026(input.joinDate || '2026-01-01', asOfDate);

  const totalAvailableBalance = Number((carriedOver + currentAccrued).toFixed(2));

  const paidDays = Math.min(totalAvailableBalance, workingDays);
  const unpaidDays = Math.max(0, workingDays - totalAvailableBalance);
  const remainingBalance = Math.max(0, Number((totalAvailableBalance - paidDays).toFixed(2)));

  const wage = input.monthlyWage || (input.dailyWage ? input.dailyWage * 26 : 0);
  const dailyRate = input.dailyWage || calculateKuwaitDailyRate(wage);
  const netPayableAmount = Number((paidDays * dailyRate).toFixed(3));
  const unpaidDeductionAmount = Number((unpaidDays * dailyRate).toFixed(3));

  const settlementSummary = [
    {
      title: "إجمالي مدة الإجازة المعتمدة",
      value: `${workingDays.toFixed(1)} يوم`,
      note: `(تم استبعاد ${fridaysCount} أيام جمعة استناداً للمادة 70)`
    },
    {
      title: "أيام مدفوعة الأجر (خصم من الرصيد)",
      value: `${paidDays.toFixed(1)} يوم`,
      note: `(${carriedOver} مرحل + ${currentAccrued} رصيد السنة)`
    },
    {
      title: "أيام غير مدفوعة (خصم من الراتب)",
      value: `${unpaidDays.toFixed(1)} يوم`,
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
 * 5. حسابات تسوية متوافقة مع واجهة LeaveClearanceDocument
 */
export function calculateAysedLeaveSettlement(input: AysedLeaveEngineInput): AysedSettlementOutput {
  const totalAvailable = (input.carriedOver || 0) + computeAccrual2026('2026-01-01');
  const paidDays = Math.min(totalAvailable, input.requestedDays);
  const unpaidDays = Math.max(0, input.requestedDays - totalAvailable);
  const carriedOverUsed = Math.min(input.carriedOver || 0, input.requestedDays);
  const accruedUsed = Math.max(0, paidDays - carriedOverUsed);

  const dailyWage = calculateKuwaitDailyRate(input.monthlyWage);
  const netPayable = Number((paidDays * dailyWage).toFixed(3));

  return {
    aysed_carried_over: input.carriedOver || 0,
    aysed_accrued_2026: accruedUsed,
    aysed_unpaid_days: Number(unpaidDays.toFixed(2)),
    aysed_paid_days: Number(paidDays.toFixed(2)),
    aysed_daily_wage: Number(dailyWage.toFixed(3)),
    aysed_net_payable: netPayable,
  };
}

/**
 * 6. دالة اعتماد الإجازة والخصم التلقائي (Supabase Integration)
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
