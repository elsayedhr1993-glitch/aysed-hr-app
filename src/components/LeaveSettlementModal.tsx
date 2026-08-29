import React, { useState, useMemo } from 'react';
import { validateLeaveSettlement } from '../services/guards';
import { getEmployeeUnifiedSummary } from '../utils/leaveEngine';
import { Employee, HrLeaveAllocation, LeaveRequest, Contract } from '../types';
import { X, DollarSign, Calculator, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export interface LeaveSettlementModalProps {
  // Direct new props interface
  employeeData?: {
    id?: string;
    name?: string;
    carriedOver?: number;
    accrued?: number;
    approvedLeaveDays?: number;
    basicSalary?: number;
    dailyWageRate?: number;
    [key: string]: any;
  };
  onSubmit?: (data: {
    employeeId?: string;
    carriedOver: number;
    accrued: number;
    requestedDays: number;
    balanceRemaining: number;
    cashAmount?: number;
  }) => Promise<void> | void;
  onCancel?: () => void;

  // Backward-compatible props interface
  employee?: Employee | any;
  allocations?: HrLeaveAllocation[];
  leaves?: LeaveRequest[];
  contract?: Contract;
  leaveRequest?: LeaveRequest;
  initialDays?: number;
  onClose?: () => void;
  onConfirmSettlement?: (encashedDays: number, cashAmount: number, notes?: string) => Promise<void> | void;
}

export const LeaveSettlementModal: React.FC<LeaveSettlementModalProps> = ({
  employeeData,
  onSubmit,
  onCancel,
  employee,
  allocations = [],
  leaves = [],
  contract,
  leaveRequest,
  initialDays,
  onClose,
  onConfirmSettlement
}) => {
  // Normalize employee object
  const effEmployee = employeeData || employee;
  const handleCancel = onCancel || onClose || (() => {});

  if (!effEmployee) return null;

  // Extract balances
  const summary = useMemo(() => {
    if (employeeData && employeeData.carriedOver !== undefined) {
      return {
        carriedOverDays: Number(employeeData.carriedOver || 0),
        accruedAnnualDays: Number(employeeData.accrued || 0),
        totalAvailableDays: Number(employeeData.carriedOver || 0) + Number(employeeData.accrued || 0),
        basicSalary: Number(employeeData.basicSalary || 0),
        dailyWageRate: Number(employeeData.dailyWageRate || ((employeeData.basicSalary || 0) / 26))
      };
    }
    const computed = getEmployeeUnifiedSummary(effEmployee, allocations, leaves, contract);
    return computed;
  }, [employeeData, effEmployee, allocations, leaves, contract]);

  const carriedOver = Number(employeeData?.carriedOver !== undefined ? employeeData.carriedOver : (summary.carriedOverDays || 0));
  const accrued = Number(employeeData?.accrued !== undefined ? employeeData.accrued : (summary.accruedAnnualDays || 0));
  const totalAvailable = Number((summary.totalAvailableDays || (carriedOver + accrued)).toFixed(2));

  // Determine initial requested days (defaulting to approved leave days or request days)
  const initialApprovedDays = useMemo(() => {
    if (employeeData?.approvedLeaveDays !== undefined && employeeData.approvedLeaveDays !== null) {
      return Number(employeeData.approvedLeaveDays);
    }
    if (initialDays !== undefined && initialDays !== null && initialDays > 0) {
      return initialDays;
    }
    if (leaveRequest?.paidDays) {
      return leaveRequest.paidDays;
    }
    if (leaveRequest?.totalDays) {
      return leaveRequest.totalDays;
    }
    const targetLeave = leaves.find(l => l.employeeId === effEmployee.id && (l.status === 'APPROVED' || l.status === 'SUBMITTED'));
    if (targetLeave) {
      return targetLeave.paidDays || targetLeave.totalDays || 0;
    }
    return Math.min(15, totalAvailable > 0 ? totalAvailable : 0);
  }, [employeeData, initialDays, leaveRequest, leaves, effEmployee.id, totalAvailable]);

  // الحقل يستقبل تلقائياً الأيام المعتمدة
  const [requestedDays, setRequestedDays] = useState<number | string>(initialApprovedDays);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // حساب الرصيد المتبقي لحظياً
  const calculatedRemaining = useMemo(() => {
    return Number((totalAvailable - Number(requestedDays || 0)).toFixed(2));
  }, [totalAvailable, requestedDays]);

  // فحص الحارس اللحظي في الواجهة (Instant Validation Guard)
  const validationError = useMemo(() => {
    const numReq = Number(requestedDays);
    if (isNaN(numReq) || numReq <= 0) {
      return 'يرجى إدخال عدد أيام إجازة صحيح أكبر من الصفر.';
    }
    if (numReq > totalAvailable) {
      return `الأيام المطلوبة (${numReq}) تتجاوز إجمالي الرصيد المتاح (${totalAvailable}).`;
    }
    return null;
  }, [requestedDays, totalAvailable]);

  // Financial rates
  const dailyWage = summary.dailyWageRate || (summary.basicSalary ? summary.basicSalary / 26 : 0);
  const calculatedCashAmount = Number((Number(requestedDays || 0) * dailyWage).toFixed(3));

  const handleSave = async () => {
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const numReq = Number(requestedDays);

    // Verify through universal backend guard
    try {
      validateLeaveSettlement({
        carriedOver,
        accrued,
        totalAvailable,
        requestedDays: numReq,
        balanceRemaining: calculatedRemaining
      });
    } catch (guardErr: any) {
      toast.error(guardErr.message || 'فشل التحقق الرياضي للرصيد');
      return;
    }

    try {
      setIsSubmitting(true);
      if (onSubmit) {
        await onSubmit({
          employeeId: effEmployee.id,
          carriedOver,
          accrued,
          requestedDays: numReq,
          balanceRemaining: calculatedRemaining,
          cashAmount: calculatedCashAmount
        });
      } else if (onConfirmSettlement) {
        await onConfirmSettlement(
          numReq, 
          calculatedCashAmount, 
          `تسوية وصرف إجازة (${numReq} يوم) - الرصيد المتبقي: ${calculatedRemaining}`
        );
      }
      toast.success('تم اعتماد وصرف التسوية المالية بنجاح');
      handleCancel();
    } catch (err: any) {
      toast.error(err?.message || 'حدث خطأ أثناء اعتماد التسوية');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" dir="rtl">
      <div className="p-6 bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg relative overflow-hidden flex flex-col text-right">
        {/* Header with Close */}
        <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">اعتماد وتسوية الإجازة</h3>
              <p className="text-[11px] text-gray-500">
                {effEmployee.name || effEmployee.fullNameAr || effEmployee.nameAr || 'الموظف'} • الحارس اللحظي الذكي
              </p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* بطاقات الأرصدة */}
        <div className="grid grid-cols-4 gap-2 mb-4 text-center text-xs font-semibold">
          <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-200">
            <p className="text-gray-500 text-[11px]">المرحل</p>
            <p className="text-base text-blue-700 font-bold tabular-nums">{carriedOver}</p>
          </div>
          <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-200">
            <p className="text-gray-500 text-[11px]">المكتسب</p>
            <p className="text-base text-blue-700 font-bold tabular-nums">+{accrued}</p>
          </div>
          <div className="bg-red-50 p-2.5 rounded-xl border border-red-200">
            <p className="text-gray-500 text-[11px]">المطلوب</p>
            <p className="text-base text-red-700 font-bold tabular-nums">-{requestedDays || 0}</p>
          </div>
          <div className="bg-purple-50 p-2.5 rounded-xl border border-purple-200">
            <p className="text-gray-500 text-[11px]">المتبقي</p>
            <p className="text-base text-purple-700 font-bold tabular-nums">{calculatedRemaining}</p>
          </div>
        </div>

        {/* حقل الإدخال */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-gray-700">أيام الإجازة المصروفة مقدماً:</label>
            {totalAvailable > 0 && (
              <button
                type="button"
                onClick={() => setRequestedDays(totalAvailable)}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline"
              >
                صرف كامل الرصيد ({totalAvailable} يوم)
              </button>
            )}
          </div>
          <input
            type="number"
            min="0.5"
            step="0.5"
            max={totalAvailable}
            value={requestedDays}
            onChange={(e) => setRequestedDays(e.target.value)}
            className="w-full text-center font-bold text-lg border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none tabular-nums"
            placeholder="0"
          />
        </div>

        {/* المبلغ المالي المحسوب إن وجد راتب أساسي */}
        {dailyWage > 0 && Number(requestedDays) > 0 && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
            <span className="text-xs text-emerald-800 font-bold flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5" />
              القيمة المالية المستحقة للصرف:
            </span>
            <span className="text-base font-black text-emerald-700 tabular-nums flex items-center gap-1" dir="ltr">
              <span>{calculatedCashAmount.toFixed(3)}</span> <span className="text-xs font-bold">د.ك</span>
            </span>
          </div>
        )}

        {/* تنبيه الخطأ اللحظي إن وجد */}
        {validationError && (
          <div className="p-2.5 mb-4 bg-red-100 border border-red-300 text-red-700 text-xs rounded-xl text-center font-bold animate-shake flex items-center justify-center gap-1.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>⚠️ {validationError}</span>
          </div>
        )}

        {/* أزرار الحفظ والإلغاء */}
        <div className="flex gap-2 pt-2 border-t border-gray-100">
          <button
            onClick={handleSave}
            disabled={Boolean(validationError) || isSubmitting}
            className={`flex-1 py-2.5 rounded-xl font-bold text-white transition flex items-center justify-center gap-1.5 shadow-sm ${
              validationError || isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? 'جاري الاعتماد...' : 'اعتماد وصرف التسوية المالية'}</span>
          </button>
          <button
            onClick={handleCancel}
            disabled={isSubmitting}
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs transition"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeaveSettlementModal;
