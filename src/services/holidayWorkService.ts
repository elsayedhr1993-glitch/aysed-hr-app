// src/services/holidayWorkService.ts
import { db } from '../lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy } from 'firebase/firestore';
import { MANARA_STORAGE_KEYS, getPersistentData, setPersistentData } from '../utils/persistentStorage';
import { HrLeaveAllocation } from '../types';

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
  companyId?: string;
  date: string; // YYYY-MM-DD
  holidayName: string;
  hoursWorked: number;
  compensationType: 'pay' | 'day'; // بدل نقدي (1.5x) أو يوم بديل
  state: 'draft' | 'approved' | 'done';
  createdAt?: string;
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
      compensatoryDaysAdded: compensatoryDaysAdded > 0 ? compensatoryDaysAdded : 1
    };
  }
}

/**
 * حفظ سجل جديد في التخزين المحلي وقاعدة البيانات
 */
export async function saveHolidayWorkRecord(record: WorkOnHolidayRecord): Promise<WorkOnHolidayRecord> {
  const newRec: WorkOnHolidayRecord = {
    ...record,
    id: record.id || `hwr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    createdAt: record.createdAt || new Date().toISOString()
  };

  // 1. Save to local storage
  const localRecords = getPersistentData<WorkOnHolidayRecord[]>(MANARA_STORAGE_KEYS.HOLIDAY_WORK_RECORDS, []);
  const existingIdx = localRecords.findIndex(r => r.id === newRec.id);
  let updatedList: WorkOnHolidayRecord[];
  if (existingIdx >= 0) {
    updatedList = [...localRecords];
    updatedList[existingIdx] = newRec;
  } else {
    updatedList = [newRec, ...localRecords];
  }
  setPersistentData(MANARA_STORAGE_KEYS.HOLIDAY_WORK_RECORDS, updatedList);

  // 2. Save to Firestore if available
  try {
    if (db) {
      if (record.id && !record.id.startsWith('hwr-')) {
        await updateDoc(doc(db, 'work_on_holidays', record.id), newRec as any);
      } else {
        const ref = await addDoc(collection(db, 'work_on_holidays'), newRec);
        newRec.id = ref.id;
      }
    }
  } catch (e) {
    console.warn('[HolidayWorkService] Firestore save warning:', e);
  }

  return newRec;
}

/**
 * جلب جميع سجلات العمل في العطلات (مع الدمج بين محلي وفايربيس)
 */
export async function getHolidayWorkRecords(companyId?: string): Promise<WorkOnHolidayRecord[]> {
  const localRecords = getPersistentData<WorkOnHolidayRecord[]>(MANARA_STORAGE_KEYS.HOLIDAY_WORK_RECORDS, []);
  let cloudRecords: WorkOnHolidayRecord[] = [];

  try {
    if (db) {
      const q = query(collection(db, 'work_on_holidays'), orderBy('date', 'desc'));
      const snap = await getDocs(q);
      cloudRecords = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as WorkOnHolidayRecord[];
    }
  } catch (e) {
    console.warn('[HolidayWorkService] Firestore fetch error:', e);
  }

  // Merge records uniquely by id
  const map = new Map<string, WorkOnHolidayRecord>();
  cloudRecords.forEach(r => { if (r.id) map.set(r.id, r); });
  localRecords.forEach(r => { if (r.id) map.set(r.id, r); });

  const all = Array.from(map.values()).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  if (companyId) {
    return all.filter(r => !r.companyId || r.companyId === companyId);
  }
  return all;
}

/**
 * اعتماد السجل وترحيله لمسير الرواتب أو رصيد الإجازات في Firestore والتخزين المحلي فوراً
 */
/**
 * حذف سجل العمل في العطلة وإلغاء اليوم التعويضي المقترن به من رصيد الإجازات
 */
export async function deleteHolidayWorkRecord(recordId: string, employeeId?: string): Promise<{ success: boolean; message: string }> {
  try {
    const localRecords = getPersistentData<WorkOnHolidayRecord[]>(MANARA_STORAGE_KEYS.HOLIDAY_WORK_RECORDS, []);
    const targetRecord = localRecords.find(r => r.id === recordId || (employeeId && r.employeeId === employeeId && r.id === recordId));
    
    // 1. إزالة السجل من مصفوفة سجلات العطلات
    const filteredRecords = localRecords.filter(r => r.id !== recordId);
    setPersistentData(MANARA_STORAGE_KEYS.HOLIDAY_WORK_RECORDS, filteredRecords);

    // 2. إذا كان السجل قد تم اعتماده وأضاف رصيد تعويضي، نقوم بإلغاء التخصيص المرتبط به
    const empId = employeeId || targetRecord?.employeeId;
    const existingAllocs = getPersistentData<HrLeaveAllocation[]>(MANARA_STORAGE_KEYS.LEAVE_ALLOCATIONS, []);
    const allocId = `alloc-comp-${recordId}`;
    
    const filteredAllocs = existingAllocs.filter(a => {
      if (a.id === allocId || a.id === `alloc-comp-${targetRecord?.id}`) return false;
      if (empId && (a.employeeId === empId)) {
        if (targetRecord && targetRecord.holidayName && (a.notes?.includes(targetRecord.holidayName) || a.name?.includes(targetRecord.holidayName))) {
          return false;
        }
      }
      return true;
    });

    setPersistentData(MANARA_STORAGE_KEYS.LEAVE_ALLOCATIONS, filteredAllocs);

    // 3. حذف السجل من Firestore إن وجد
    try {
      if (db && recordId) {
        await deleteDoc(doc(db, 'work_on_holidays', recordId));
      }
    } catch (fe) {
      console.warn('[HolidayWorkService] Firestore record delete warning:', fe);
    }

    // 4. إرسال إشعار لكافة واجهات النظام بإعادة حساب الأرصدة فوراً
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('manara_allocations_updated'));
      window.dispatchEvent(new Event('storage'));
    }

    return { success: true, message: 'تم حذف السجل وإلغاء الأيام المحتسبة من رصيد الموظف بنجاح' };
  } catch (error: any) {
    return { success: false, message: error.message || 'فشل حذف السجل' };
  }
}

/**
 * اعتماد السجل وترحيله لمسير الرواتب أو رصيد الإجازات في Firestore والتخزين المحلي فوراً
 */
export async function approveHolidayWork(
  record: WorkOnHolidayRecord,
  basicWage: number
): Promise<{ success: boolean; message: string; allocation?: HrLeaveAllocation }> {
  try {
    const calc = calculateHolidayCompensation(basicWage, record.hoursWorked, record.compensationType);

    // 1. تحديث حالة السجل إلى approved
    const updatedRecord: WorkOnHolidayRecord = {
      ...record,
      state: 'approved'
    };
    await saveHolidayWorkRecord(updatedRecord);

    let createdAlloc: HrLeaveAllocation | undefined;

    // 2. إذا كان التعويض يوماً بديلاً: يضاف فوراً إلى رصيد الإجازات
    if (record.compensationType === 'day' && calc.compensatoryDaysAdded > 0) {
      const allocId = `alloc-comp-${record.id || Date.now()}`;
      createdAlloc = {
        id: allocId,
        name: `يوم تعويضي عن عمل في (${record.holidayName || 'عطلة رسمية'})`,
        employeeId: record.employeeId,
        companyId: record.companyId || 'comp-1',
        leaveType: 'ANNUAL',
        allocationType: 'compensatory_off',
        numberOfDays: calc.compensatoryDaysAdded,
        remainingDays: calc.compensatoryDaysAdded,
        consumedDays: 0,
        state: 'validate',
        dateFrom: record.date || new Date().toISOString().split('T')[0],
        notes: `يوم بديل معتمد عن العمل في عطلة ${record.holidayName} وفق المادة 70 من قانون العمل الكويتي`,
        createdAt: new Date().toISOString()
      };

      // أ) الحفظ في التخزين المحلي للإجازات
      const existingAllocs = getPersistentData<HrLeaveAllocation[]>(MANARA_STORAGE_KEYS.LEAVE_ALLOCATIONS, []);
      const allocIdx = existingAllocs.findIndex(a => a.id === allocId || (a.employeeId === record.employeeId && a.notes?.includes(record.holidayName) && a.dateFrom === record.date));
      
      let newAllocList: HrLeaveAllocation[];
      if (allocIdx >= 0) {
        newAllocList = [...existingAllocs];
        newAllocList[allocIdx] = createdAlloc;
      } else {
        newAllocList = [createdAlloc, ...existingAllocs];
      }
      setPersistentData(MANARA_STORAGE_KEYS.LEAVE_ALLOCATIONS, newAllocList);

      // ب) إرسال إشعار للنظام بالتحديث الفوري
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('manara_allocations_updated'));
        window.dispatchEvent(new Event('storage'));
      }

      // ج) الحفظ في Firestore
      try {
        if (db) {
          await addDoc(collection(db, 'allocations'), createdAlloc);
          await addDoc(collection(db, 'leave_allocations'), createdAlloc);
        }
      } catch (fe) {
        console.warn('[HolidayWorkService] Firestore allocation sync notice:', fe);
      }
    }

    // 3. إذا كان التعويض نقدياً: يرحل إلى جدول مستحقات مسير الرواتب القادم
    if (record.compensationType === 'pay' && calc.cashPayableAmount > 0) {
      try {
        if (db) {
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
      } catch (pe) {
        console.warn('[HolidayWorkService] Payslip overtime sync notice:', pe);
      }
    }

    return { 
      success: true, 
      message: record.compensationType === 'day' 
        ? `تم اعتماد السجل وترحيل (${calc.compensatoryDaysAdded} يوم) بنجاح إلى رصيد إجازات الموظف` 
        : `تم اعتماد السجل وترحيل البدل النقدي (${calc.cashPayableAmount} د.ك) لمسير الرواتب بنجاح`,
      allocation: createdAlloc
    };
  } catch (error: any) {
    return { success: false, message: error.message || 'حدث خطأ أثناء الاعتماد' };
  }
}

