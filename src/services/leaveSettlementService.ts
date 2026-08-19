// services/leaveSettlementService.ts
import { supabase } from '../lib/supabase';

export interface LeaveSettlementResult {
  employeeName: string;
  carriedOverDays: number;   // الرصيد المرحل من سنوات سابقة
  accruedDays: number;       // الرصيد المكتسب للسنة الحالية
  takenDays: number;         // الإجازات المستهلكة المعتمدة
  netRemainingDays: number;  // صافي الرصيد المتبقي للتسوية
  dailyWage: number;         // أجر اليوم الواحد (معيار 26)
  settlementAmount: number;  // إجمالي المبلغ المستحق للتصفية (د.ك)
}

/**
 * دالة معالجة تسوية رصيد الإجازات وسحب الرصيد المرحل بدقة
 */
export const processLeaveSettlement = async (
  employeeId: string
): Promise<LeaveSettlementResult | null> => {
  try {
    // 1. جلب بيانات الموظف والراتب الأساسي/الشامل
    const { data: employee, error: empError } = await supabase
      .from('hr_employee')
      .select('name, wage')
      .eq('id', employeeId)
      .single();

    if (empError || !employee) {
      console.warn('تعذر جلب بيانات الموظف من Supabase:', empError?.message);
      return null;
    }

    // 2. جلب الأرصدة المعتمدة (المرحلة والتراكمية) من جدول hr_leave_allocation
    const { data: allocations, error: allocError } = await supabase
      .from('hr_leave_allocation')
      .select('number_of_days, aysed_type')
      .eq('employee_id', employeeId)
      .eq('state', 'validate');

    if (allocError) {
      console.warn('تعذر جلب تخصيصات الإجازة:', allocError.message);
    }

    const carriedOverDays = allocations
      ?.filter((a: any) => a.aysed_type === 'carried_over')
      .reduce((sum: number, a: any) => sum + (Number(a.number_of_days) || 0), 0) || 0;

    const accruedDays = allocations
      ?.filter((a: any) => a.aysed_type === 'accrual' || !a.aysed_type)
      .reduce((sum: number, a: any) => sum + (Number(a.number_of_days) || 0), 0) || 0;

    // 3. جلب الإجازات المستهلكة السنوية المعتمدة (براتب)
    const { data: leaves, error: leaveError } = await supabase
      .from('hr_leaves')
      .select(`
        number_of_days,
        leave_type:hr_leave_types (
          is_unpaid
        )
      `)
      .eq('employee_id', employeeId)
      .eq('state', 'validate');

    if (leaveError) {
      console.warn('تعذر جلب سجلات الإجازات المستهلكة:', leaveError.message);
    }

    const takenDays = leaves
      ?.filter((l: any) => !l.leave_type?.is_unpaid)
      .reduce((sum: number, l: any) => sum + (Number(l.number_of_days) || 0), 0) || 0;

    // 4. المعادلة المحاسبية: (المرحل + المكتسب) - المستهلك
    const netRemainingDays = Math.max(0, (carriedOverDays + accruedDays) - takenDays);

    // 5. الحسبة المالية (قانون العمل الكويتي: الراتب / 26)
    const monthlyWage = Number(employee.wage) || 0;
    const dailyWage = monthlyWage > 0 ? monthlyWage / 26 : 0;
    const settlementAmount = netRemainingDays * dailyWage;

    return {
      employeeName: employee.name || 'موظف',
      carriedOverDays: parseFloat(carriedOverDays.toFixed(2)),
      accruedDays: parseFloat(accruedDays.toFixed(2)),
      takenDays: parseFloat(takenDays.toFixed(2)),
      netRemainingDays: parseFloat(netRemainingDays.toFixed(2)),
      dailyWage: parseFloat(dailyWage.toFixed(3)),
      settlementAmount: parseFloat(settlementAmount.toFixed(3)),
    };
  } catch (e) {
    console.warn('Supabase service error in processLeaveSettlement:', e);
    return null;
  }
};
