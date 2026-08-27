// src/services/holidayWorkService.ts
import { db } from '../lib/firebase';
import { collection, setDoc, deleteDoc, doc, getDocs, query, orderBy } from 'firebase/firestore';
import { MANARA_STORAGE_KEYS, getPersistentData, setPersistentData } from '../utils/persistentStorage';
import { HrLeaveAllocation } from '../types';

export interface LeaveType {
  id?: string;
  name: string;
  code: string;
  requiresAllocation: boolean;
  isUnpaid: boolean;
}

export type CompensationOption = 'CASH' | 'ANNUAL_ACCRUAL' | 'COMP_OFF' | 'pay' | 'day';

export interface WorkOnHolidayRecord {
  id?: string;
  employeeId: string;
  companyId?: string;
  date: string; // YYYY-MM-DD
  holidayName: string;
  hoursWorked: number;
  compensationType: CompensationOption; // [1] CASH, [2] ANNUAL_ACCRUAL, [3] COMP_OFF
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

export function normalizeCompensationType(type: CompensationOption): 'CASH' | 'ANNUAL_ACCRUAL' | 'COMP_OFF' {
  if (type === 'pay' || type === 'CASH') return 'CASH';
  if (type === 'ANNUAL_ACCRUAL') return 'ANNUAL_ACCRUAL';
  return 'COMP_OFF'; // default or 'day' or 'COMP_OFF'
}

/**
 * احتساب قيمة البدل المالي أو الرصيد السنوي أو الراحة البديلة للعمل في العطلات
 */
export function calculateHolidayCompensation(
  basicWage: number,
  hoursWorked: number,
  compensationType: CompensationOption
): HolidayCompensationCalculation {
  // قاعدة 26 يوم عمل (معدل اليوم = الراتب / 26، معدل الساعة = أجر اليوم / 8)
  const dailyWage = Number((basicWage / 26).toFixed(3));
  const hourlyRate = Number((dailyWage / 8).toFixed(3));
  const overtimeMultiplier = 1.5;
  const norm = normalizeCompensationType(compensationType);

  if (norm === 'CASH') {
    const cashPayableAmount = Number((hoursWorked * hourlyRate * overtimeMultiplier).toFixed(3));
    return {
      dailyWage,
      hourlyRate,
      overtimeMultiplier,
      cashPayableAmount,
      compensatoryDaysAdded: 0
    };
  } else {
    // ANNUAL_ACCRUAL or COMP_OFF
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
  const recordId = record.id || `hwr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const newRec: WorkOnHolidayRecord = {
    ...record,
    id: recordId,
    createdAt: record.createdAt || new Date().toISOString()
  };

  // 1. Save to local storage (deduplicated by id or employeeId + date)
  const localRecords = getPersistentData<WorkOnHolidayRecord[]>(MANARA_STORAGE_KEYS.HOLIDAY_WORK_RECORDS, []);
  const filtered = localRecords.filter(r => r.id !== recordId && !(r.employeeId === newRec.employeeId && r.date === newRec.date && r.holidayName === newRec.holidayName));
  const updatedList = [newRec, ...filtered];
  setPersistentData(MANARA_STORAGE_KEYS.HOLIDAY_WORK_RECORDS, updatedList);

  // 2. Save to Firestore using setDoc with document ID = recordId
  try {
    if (db) {
      await setDoc(doc(db, 'work_on_holidays', recordId), newRec as any);
    }
  } catch (e) {
    console.warn('[HolidayWorkService] Firestore save warning:', e);
  }

  return newRec;
}

/**
 * جلب جميع سجلات العمل في العطلات (مع الدمج بين محلي وفايربيس ومنع التكرار)
 */
export async function getHolidayWorkRecords(companyId?: string): Promise<WorkOnHolidayRecord[]> {
  const localRecords = getPersistentData<WorkOnHolidayRecord[]>(MANARA_STORAGE_KEYS.HOLIDAY_WORK_RECORDS, []);
  let cloudRecords: WorkOnHolidayRecord[] = [];

  try {
    if (db) {
      const q = query(collection(db, 'work_on_holidays'), orderBy('date', 'desc'));
      const snap = await getDocs(q);
      cloudRecords = snap.docs.map(d => {
        const data = d.data() as any;
        return {
          ...data,
          id: data.id || d.id
        };
      }) as WorkOnHolidayRecord[];
    }
  } catch (e) {
    console.warn('[HolidayWorkService] Firestore fetch error:', e);
  }

  // Merge records uniquely with semantic deduplication (employee + date + holiday)
  const map = new Map<string, WorkOnHolidayRecord>();
  const combined = [...cloudRecords, ...localRecords];

  combined.forEach(r => {
    if (!r.employeeId || !r.date) return;
    const semKey = `${r.employeeId}_${r.date}_${r.holidayName || ''}`;
    
    if (map.has(semKey)) {
      const existing = map.get(semKey)!;
      // Prefer approved state over draft
      if (r.state === 'approved' && existing.state !== 'approved') {
        map.set(semKey, r);
      }
    } else {
      map.set(semKey, r);
    }
  });

  const all = Array.from(map.values()).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  
  // Persist clean deduplicated list to local storage
  setPersistentData(MANARA_STORAGE_KEYS.HOLIDAY_WORK_RECORDS, all);

  if (companyId) {
    return all.filter(r => !r.companyId || r.companyId === companyId);
  }
  return all;
}

/**
 * حذف سجل العمل في العطلة وإلغاء الاستحقاق أو اليوم التعويضي المقترن به
 */
export async function deleteHolidayWorkRecord(recordId: string, employeeId?: string): Promise<{ success: boolean; message: string }> {
  try {
    const localRecords = getPersistentData<WorkOnHolidayRecord[]>(MANARA_STORAGE_KEYS.HOLIDAY_WORK_RECORDS, []);
    const targetRecord = localRecords.find(r => r.id === recordId || (employeeId && r.employeeId === employeeId && r.id === recordId));
    
    const targetEmpId = employeeId || targetRecord?.employeeId;
    const targetDate = targetRecord?.date;
    const targetHoliday = targetRecord?.holidayName;

    // 1. إزالة السجل من مصفوفة سجلات العطلات المحلية
    const filteredRecords = localRecords.filter(r => {
      if (r.id === recordId) return false;
      if (targetRecord && r.id === targetRecord.id) return false;
      if (targetEmpId && targetDate && r.employeeId === targetEmpId && r.date === targetDate) return false;
      return true;
    });
    setPersistentData(MANARA_STORAGE_KEYS.HOLIDAY_WORK_RECORDS, filteredRecords);

    // 2. إذا كان السجل قد تم اعتماده وأضاف رصيداً (سنوي أو تعويضي)، نقوم بإلغاء التخصيص المرتبط به
    const existingAllocs = getPersistentData<HrLeaveAllocation[]>(MANARA_STORAGE_KEYS.LEAVE_ALLOCATIONS, []);
    const allocIdComp = `alloc-comp-${recordId}`;
    const allocIdAnnual = `alloc-annual-${recordId}`;
    
    const filteredAllocs = existingAllocs.filter(a => {
      if (a.id === allocIdComp || a.id === allocIdAnnual || a.id === `alloc-comp-${targetRecord?.id}` || a.id === `alloc-annual-${targetRecord?.id}` || a.id === recordId) return false;
      if (targetEmpId && (a.employeeId === targetEmpId || (a as any).employeeCode === targetEmpId)) {
        const isTargetMatch = a.id?.includes(recordId) || (targetRecord?.id && a.id?.includes(targetRecord.id)) || (targetDate && a.dateFrom === targetDate);
        if (isTargetMatch) return false;
      }
      return true;
    });

    setPersistentData(MANARA_STORAGE_KEYS.LEAVE_ALLOCATIONS, filteredAllocs);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('manara_leave_allocations_data', JSON.stringify(filteredAllocs));
    }

    // 3. حذف السجل ومخصصاته من Firestore
    try {
      if (db) {
        if (recordId) {
          try { await deleteDoc(doc(db, 'work_on_holidays', recordId)); } catch (_) {}
        }
        if (targetRecord?.id && targetRecord.id !== recordId) {
          try { await deleteDoc(doc(db, 'work_on_holidays', targetRecord.id)); } catch (_) {}
        }

        const snap = await getDocs(collection(db, 'work_on_holidays'));
        for (const d of snap.docs) {
          const data = d.data() as any;
          const matches = d.id === recordId || 
                          data.id === recordId || 
                          (targetRecord?.id && (d.id === targetRecord.id || data.id === targetRecord.id)) ||
                          (targetEmpId && targetDate && data.employeeId === targetEmpId && data.date === targetDate);
          if (matches) {
            try { await deleteDoc(doc(db, 'work_on_holidays', d.id)); } catch (_) {}
          }
        }

        const allocSnap = await getDocs(collection(db, 'allocations'));
        for (const d of allocSnap.docs) {
          const data = d.data() as any;
          const isTargetAlloc = data.id?.includes(recordId) || 
                                (targetRecord?.id && data.id?.includes(targetRecord.id)) ||
                                (targetEmpId && data.employeeId === targetEmpId && targetDate && data.dateFrom === targetDate);
          if (isTargetAlloc) {
            try { await deleteDoc(doc(db, 'allocations', d.id)); } catch (_) {}
          }
        }
      }
    } catch (fe) {
      console.warn('[HolidayWorkService] Firestore record delete warning:', fe);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('manara_allocations_updated'));
      window.dispatchEvent(new Event('storage'));
    }

    return { success: true, message: 'تم حذف السجل وإلغاء الأيام والاستحقاقات المحتسبة بنجاح' };
  } catch (error: any) {
    return { success: false, message: error.message || 'فشل حذف السجل' };
  }
}

/**
 * اعتماد السجل وترحيله للوجهة المحددة (مسير الرواتب، الرصيد السنوي، أو محفظة الراحات البديلة المستقلة)
 */
export async function approveHolidayWork(
  record: WorkOnHolidayRecord,
  basicWage: number
): Promise<{ success: boolean; message: string; allocation?: HrLeaveAllocation }> {
  try {
    const calc = calculateHolidayCompensation(basicWage, record.hoursWorked, record.compensationType);
    const norm = normalizeCompensationType(record.compensationType);

    // 1. تحديث حالة السجل إلى approved
    const updatedRecord: WorkOnHolidayRecord = {
      ...record,
      state: 'approved'
    };
    await saveHolidayWorkRecord(updatedRecord);

    let createdAlloc: HrLeaveAllocation | undefined;

    // 2. إذا كان الاختيار [2] إضافة للرصيد السنوي (Annual Leave Accrual): يضاف للرصيد السنوي
    if (norm === 'ANNUAL_ACCRUAL' && calc.compensatoryDaysAdded > 0) {
      const allocId = `alloc-annual-${updatedRecord.id || Date.now()}`;
      createdAlloc = {
        id: allocId,
        name: `إضافة للرصيد السنوي عن عمل في (${record.holidayName || 'عطلة رسمية'})`,
        employeeId: record.employeeId,
        companyId: record.companyId || 'comp-1',
        leaveType: 'ANNUAL',
        allocationType: 'accrual',
        numberOfDays: calc.compensatoryDaysAdded,
        remainingDays: calc.compensatoryDaysAdded,
        consumedDays: 0,
        state: 'validate',
        dateFrom: record.date || new Date().toISOString().split('T')[0],
        notes: `إضافة لرصيد الإجازات السنوية عن العمل في عطلة ${record.holidayName}`,
        createdAt: new Date().toISOString()
      };

      const existingAllocs = getPersistentData<HrLeaveAllocation[]>(MANARA_STORAGE_KEYS.LEAVE_ALLOCATIONS, []);
      const filteredExisting = existingAllocs.filter(a => a.id !== allocId && !(a.employeeId === record.employeeId && a.dateFrom === record.date && a.name?.includes(record.holidayName)));
      const newAllocList = [createdAlloc, ...filteredExisting];
      
      setPersistentData(MANARA_STORAGE_KEYS.LEAVE_ALLOCATIONS, newAllocList);
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('manara_leave_allocations_data', JSON.stringify(newAllocList));
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('manara_allocations_updated'));
        window.dispatchEvent(new Event('storage'));
      }

      try {
        if (db) {
          await setDoc(doc(db, 'allocations', allocId), createdAlloc as any);
        }
      } catch (fe) {
        console.warn('[HolidayWorkService] Firestore annual accrual allocation sync notice:', fe);
      }
    }

    // 3. إذا كان الاختيار [3] يوم راحة بديل في وقت آخر (Comp-Off Only): محفظة أيام راحة بديلة مستقلة حصراً
    if (norm === 'COMP_OFF' && calc.compensatoryDaysAdded > 0) {
      const allocId = `alloc-comp-${updatedRecord.id || Date.now()}`;
      createdAlloc = {
        id: allocId,
        name: `يوم راحة بديل (محفظة مستقلة) عن عمل في (${record.holidayName || 'عطلة رسمية'})`,
        employeeId: record.employeeId,
        companyId: record.companyId || 'comp-1',
        leaveType: 'ANNUAL',
        allocationType: 'compensatory_off',
        numberOfDays: calc.compensatoryDaysAdded,
        remainingDays: calc.compensatoryDaysAdded,
        consumedDays: 0,
        state: 'validate',
        dateFrom: record.date || new Date().toISOString().split('T')[0],
        notes: `يوم راحة بديل في وقت آخر (محفظة مستقلة حصراً) عن العمل في عطلة ${record.holidayName} - يمنع ترحيله للرصيد السنوي أو صرفه نقدياً`,
        createdAt: new Date().toISOString()
      };

      const existingAllocs = getPersistentData<HrLeaveAllocation[]>(MANARA_STORAGE_KEYS.LEAVE_ALLOCATIONS, []);
      const filteredExisting = existingAllocs.filter(a => a.id !== allocId && !(a.employeeId === record.employeeId && a.dateFrom === record.date && a.name?.includes(record.holidayName)));
      const newAllocList = [createdAlloc, ...filteredExisting];
      
      setPersistentData(MANARA_STORAGE_KEYS.LEAVE_ALLOCATIONS, newAllocList);
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('manara_leave_allocations_data', JSON.stringify(newAllocList));
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('manara_allocations_updated'));
        window.dispatchEvent(new Event('storage'));
      }

      try {
        if (db) {
          await setDoc(doc(db, 'allocations', allocId), createdAlloc as any);
        }
      } catch (fe) {
        console.warn('[HolidayWorkService] Firestore comp-off allocation sync notice:', fe);
      }
    }

    // 4. إذا كان الاختيار [1] صرف نقدي مباشر (Cash Payout): يوجه الاستحقاق المالي مباشرة إلى مسير رواتب الشهر الحالي دون المساس برصيد الإجازات
    if (norm === 'CASH' && calc.cashPayableAmount > 0) {
      try {
        if (db) {
          const overtimeId = `ot-${record.id || Date.now()}`;
          await setDoc(doc(db, 'payslip_overtime_inputs', overtimeId), {
            id: overtimeId,
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

    const msg = 
      norm === 'ANNUAL_ACCRUAL' ? `تم اعتماد السجل وإضافة (${calc.compensatoryDaysAdded} يوم) إلى الرصيد السنوي للموظف بنجاح` :
      norm === 'COMP_OFF' ? `تم اعتماد السجل وإضافة (${calc.compensatoryDaysAdded} يوم) إلى محفظة الراحات البديلة المستقلة بنجاح` :
      `تم اعتماد السجل وتوجيه البدل النقدي (${calc.cashPayableAmount} د.ك) مباشرة إلى مسير رواتب الشهر الحالي بنجاح`;

    return { 
      success: true, 
      message: msg,
      allocation: createdAlloc
    };
  } catch (error: any) {
    return { success: false, message: error.message || 'حدث خطأ أثناء الاعتماد' };
  }
}


