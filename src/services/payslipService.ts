// services/payslipService.ts
import { supabase } from '../lib/supabase';

export interface PayslipLeaveCalculation {
  unpaidDays: number;
  paidLeaveDays: number;
  dailyRate: number;
  unpaidDeductionAmount: number;
}

/**
 * حساب قيمة اليوم الواحد وفق قانون العمل الكويتي (الراتب الأساسي / 26)
 */
export function calculateKuwaitDailyRate(basicWage: number): number {
  if (!basicWage || basicWage <= 0) return 0;
  return basicWage / 26; // Do not round intermediate calculation to preserve precision
}

/**
 * دالة سحب حركات الإجازات المعتمدة خلال فترة الراتب وحساب الخصومات
 */
export async function computePayslipLeaveDetails(
  employeeId: string,
  dateFrom: string,
  dateTo: string,
  basicWage: number
): Promise<PayslipLeaveCalculation> {
  try {
    // 1. الاستعلام من Supabase عن الإجازات المعتمدة خلال الفترة المحددة
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
      console.warn('خطأ في جلب بيانات الإجازات أو جدول غير موجود:', error?.message);
      return { unpaidDays: 0, paidLeaveDays: 0, dailyRate: calculateKuwaitDailyRate(basicWage), unpaidDeductionAmount: 0 };
    }

    // 2. فرز الإجازات براتب وبدون راتب
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

    // 3. احتساب قيمة اليوم والخصم المالي
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
