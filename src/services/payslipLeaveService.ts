// services/payslipLeaveService.ts
import { supabase } from '../lib/supabase';

export interface PayslipLeaveSummary {
  unpaidDays: number;
  paidLeaveDays: number;
  dailyRate: number;
  unpaidDeductionAmount: number;
}

/**
 * حساب قيمة اليوم الواحد وفق معيار قانون العمل الكويتي (الراتب / 26)
 */
export function calculateKuwaitDailyRate(basicWage: number): number {
  if (!basicWage || basicWage <= 0) return 0;
  return Number((basicWage / 26).toFixed(3));
}

/**
 * سحب الإجازات المعتمدة خلال فترة مسير الراتب وتصنيفها مالياً
 */
export async function computePayslipLeaveDetails(
  employeeId: string,
  dateFrom: string,
  dateTo: string,
  basicWage: number
): Promise<PayslipLeaveSummary> {
  try {
    const { data: leaves, error } = await supabase
      .from('hr_leaves')
      .select(`
        number_of_days,
        leave_type:hr_leave_types (
          is_unpaid
        )
      `)
      .eq('employee_id', employeeId)
      .eq('state', 'validate')
      .lte('request_date_from', dateTo)
      .gte('request_date_to', dateFrom);

    if (error || !leaves) {
      console.warn('خطأ في جلب الإجازات من Supabase:', error?.message);
      return { unpaidDays: 0, paidLeaveDays: 0, dailyRate: calculateKuwaitDailyRate(basicWage), unpaidDeductionAmount: 0 };
    }

    let unpaidDays = 0;
    let paidLeaveDays = 0;

    leaves.forEach((leave: any) => {
      const days = Number(leave.number_of_days) || 0;
      if (leave.leave_type?.is_unpaid) {
        unpaidDays += days;
      } else {
        paidLeaveDays += days;
      }
    });

    const dailyRate = calculateKuwaitDailyRate(basicWage);
    const unpaidDeductionAmount = Number((unpaidDays * dailyRate).toFixed(3));

    return {
      unpaidDays,
      paidLeaveDays,
      dailyRate,
      unpaidDeductionAmount,
    };
  } catch (e) {
    console.warn('Supabase service fallback in computePayslipLeaveDetails:', e);
    const dailyRate = calculateKuwaitDailyRate(basicWage);
    return { unpaidDays: 0, paidLeaveDays: 0, dailyRate, unpaidDeductionAmount: 0 };
  }
}
