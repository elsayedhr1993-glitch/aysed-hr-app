// src/services/holidayWorkService.ts
import { db } from '../lib/firebase';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';

export interface LeaveType {
  id?: string;
  name: string;
  code: string;
  requiresAllocation: boolean;
  isUnpaid: boolean;
}

export interface WorkOnHolidayRecord {
  id?: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  holidayName: string;
  hoursWorked: number;
  compensationType: 'pay' | 'day'; // بدل نقدي (1.5x) أو يوم بديل
  state: 'draft' | 'approved' | 'done';
}

export interface HolidayCompensationCalculation {
  dailyWage: number;
  hourlyRate: number;
  overtimeMultiplier: number; // 1.5 وفق قانون العمل الكويتي
  cashPayableAmount: number;
  compensatoryDaysAdded: number;
}

/**
 * احتساب قيمة البدل المالي أو اليوم البديل للعمل في العطلات
 */
export function calculateHolidayCompensation(
  basicWage: number,
  hoursWorked: number,
  compensationType: 'pay' | 'day'
): HolidayCompensationCalculation {
  // قاعدة 26 يوم عمل (معدل اليوم = الراتب / 26، معدل الساعة = أجر اليوم / 8)
  const dailyWage = Number((basicWage / 26).toFixed(3));
  const hourlyRate = Number((dailyWage / 8).toFixed(3));
  const overtimeMultiplier = 1.5;

  if (compensationType === 'pay') {
    const cashPayableAmount = Number((hoursWorked * hourlyRate * overtimeMultiplier).toFixed(3));
    return {
      dailyWage,
      hourlyRate,
      overtimeMultiplier,
      cashPayableAmount,
      compensatoryDaysAdded: 0
    };
  } else {
    // احتساب يوم بديل (لكل 8 ساعات عمل يوم راحة كامل)
    const compensatoryDaysAdded = Number((hoursWorked / 8).toFixed(2));
    return {
      dailyWage,
      hourlyRate,
      overtimeMultiplier,
      cashPayableAmount: 0,
      compensatoryDaysAdded
    };
  }
}

/**
 * اعتماد السجل وترحيله لمسير الرواتب أو رصيد الإجازات في Firestore
 */
export async function approveHolidayWork(
  record: WorkOnHolidayRecord,
  basicWage: number
): Promise<{ success: boolean; message: string }> {
  try {
    const calc = calculateHolidayCompensation(basicWage, record.hoursWorked, record.compensationType);

    // 1. تحديث حالة السجل إلى approved
    if (record.id) {
        await updateDoc(doc(db, 'work_on_holidays', record.id), { state: 'approved' });
    }

    // 2. إذا كان التعويض يوماً بديلاً: يضاف إلى رصيد الإجازات
    if (record.compensationType === 'day' && calc.compensatoryDaysAdded > 0) {
      await addDoc(collection(db, 'allocations'), {
        employeeId: record.employeeId,
        allocationType: 'compensatory_off',
        name: `يوم بديل عن عمل في (${record.holidayName})`,
        numberOfDays: calc.compensatoryDaysAdded,
        remainingDays: calc.compensatoryDaysAdded,
        consumedDays: 0,
        state: 'validated',
        dateFrom: record.date
      });
    }

    // 3. إذا كان التعويض نقدياً: يرحل إلى جدول مستحقات مسير الرواتب القادم
    if (record.compensationType === 'pay' && calc.cashPayableAmount > 0) {
      await addDoc(collection(db, 'payslip_overtime_inputs'), {
        employeeId: record.employeeId,
        workDate: record.date,
        holidayName: record.holidayName,
        amount: calc.cashPayableAmount,
        hours: record.hoursWorked,
        rate: 1.5,
        status: 'pending_payroll'
      });
    }

    return { success: true, message: 'تم اعتماد سجل العمل بالعطلة وترحيله بنجاح' };
  } catch (error: any) {
    return { success: false, message: error.message || 'حدث خطأ أثناء الاعتماد' };
  }
}
