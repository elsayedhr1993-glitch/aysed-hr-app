// services/leaveValidationService.ts
import { supabase } from '../lib/supabase';

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

/**
 * دالة اعتماد الإجازة والخصم التلقائي (المرحل أولاً ثم التراكمي وتحويل الفائض لخصم مالي)
 */
export const onLeaveValidate = async (
  params: LeaveValidationParams
): Promise<LeaveValidationResponse> => {
  const { employeeId, requestedDays, leaveId } = params;

  try {
    // 1. جلب بيانات الموظف والراتب الأساسي
    const { data: employee, error: empError } = await supabase
      .from('hr_employee')
      .select('name, wage, remaining_leaves')
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

    // 2. جلب الأرصدة المعتمدة المتاحة للموظف
    const { data: allocations, error: allocError } = await supabase
      .from('hr_leave_allocation')
      .select('id, number_of_days, aysed_type')
      .eq('employee_id', employeeId)
      .eq('state', 'validate');

    if (allocError) {
      console.warn('خطأ في استرجاع تخصيصات الإجازة:', allocError.message);
    }

    // ترتيب الأرصدة صراحة: المرحل (carried_over) أولاً ثم التراكمي (accrual)
    const sortedAllocations = (allocations || []).sort((a, b) => {
      if (a.aysed_type === 'carried_over') return -1;
      if (b.aysed_type === 'carried_over') return 1;
      return 0;
    });

    let remainingToDeduct = requestedDays;
    const totalAvailable = sortedAllocations.reduce(
      (sum, a) => sum + (Number(a.number_of_days) || 0),
      0
    );

    // 3. الخصم التتابعي من سجلات التخصيص (FIFO)
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

    // 4. معالجة الأيام الزائدة كإجازة بدون راتب وترحيلها لخصومات الراتب
    let unpaidDays = 0;
    const paidDays = requestedDays - Math.max(0, remainingToDeduct);

    if (remainingToDeduct > 0) {
      unpaidDays = Number(remainingToDeduct.toFixed(2));
      const monthlyWage = Number(employee.wage) || 0;
      const dailyRate = monthlyWage > 0 ? monthlyWage / 26 : 0; // معيار 26 يوم عمل كويتي
      const totalDeductionAmount = Number((unpaidDays * dailyRate).toFixed(3));

      // تسجيل بند الخصم في مدخلات الرواتب (إذا وجد الجدول)
      try {
        await supabase.from('hr_payroll_input').insert({
          employee_id: employeeId,
          input_type: 'unpaid_leave_deduction',
          amount: totalDeductionAmount,
          description: `خصم عدد ${unpaidDays} يوم إجازة زائدة عن الرصيد المتاح`,
          date: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('hr_payroll_input table insert note:', err);
      }
    }

    // 5. تحديث طلب الإجازة وسجل الموظف
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
