import React, { useState } from 'react';
import { 
  calculateUnifiedLeaveBalance, 
  buildLeaveRecordsFromEmployee, 
  LeaveRecord, 
  EmployeeLeaveSummary 
} from '../utils/leaveEngine';
import { Employee, HrLeaveAllocation, LeaveRequest, Contract } from '../types';
import { 
  X, DollarSign, Calculator, CheckCircle2, 
  Printer, AlertCircle, FileText, Sparkles, ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';

export interface LeaveSettlementModalProps {
  employee: Employee | any;
  leaveRecords?: LeaveRecord[];
  allocations?: HrLeaveAllocation[];
  leaves?: LeaveRequest[];
  contract?: Contract;
  onClose: () => void;
  onConfirmSettlement: (encashedDays: number, cashAmount: number, notes?: string) => Promise<void> | void;
}

export const LeaveSettlementModal: React.FC<LeaveSettlementModalProps> = ({
  employee,
  leaveRecords,
  allocations = [],
  leaves = [],
  contract,
  onClose,
  onConfirmSettlement
}) => {
  if (!employee) return null;

  // استدعاء نفس المحرك الموحد بالضبط
  let balance: EmployeeLeaveSummary;

  if (leaveRecords && Array.isArray(leaveRecords)) {
    const accrued = Number(employee.accruedAnnualLeave ?? employee.carriedOverBalance ?? employee.carriedOverLeave2025 ?? 0);
    const basic = contract ? Number(contract.basicSalary || 0) : Number(employee.basicSalary || employee.salary || 0);
    const allowances = contract 
      ? (Number(contract.housingAllowance || 0) + Number(contract.transportAllowance || 0) + Number(contract.otherAllowance || 0))
      : Number(employee.allowances || (Number(employee.housingAllowance || 0) + Number(employee.transportAllowance || 0) + Number(employee.otherAllowance || 0)));
    balance = calculateUnifiedLeaveBalance(accrued, leaveRecords, basic, allowances);
  } else {
    const data = buildLeaveRecordsFromEmployee(employee, allocations, leaves);
    const basic = contract ? Number(contract.basicSalary || 0) : data.basicSalary;
    const allowances = contract 
      ? (Number(contract.housingAllowance || 0) + Number(contract.transportAllowance || 0) + Number(contract.otherAllowance || 0))
      : data.allowances;

    balance = calculateUnifiedLeaveBalance(
      data.accruedAnnual,
      data.records,
      basic,
      allowances
    );
  }

  const [daysToEncash, setDaysToEncash] = useState<number>(balance.totalAvailableDays);
  const [settlementNotes, setSettlementNotes] = useState<string>('تسوية وصرف رصيد إجازات نقدياً (بدون إجازة) وفق قانون العمل الكويتي');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // احتساب قيمة الصرف بحسب عدد الأيام المدخلة
  const dailyWage = balance.dailyWageRate || (balance.totalAvailableDays > 0 ? (balance.cashSettlementAmount / balance.totalAvailableDays) : 0);
  const calculatedEncashmentAmount = Number((daysToEncash * dailyWage).toFixed(3));

  const handleConfirm = async () => {
    if (daysToEncash <= 0) {
      toast.error('يرجى إدخال عدد أيام أكبر من صفر للصرف');
      return;
    }
    if (daysToEncash > balance.totalAvailableDays) {
      toast.error(`عدد الأيام المطلوب (${daysToEncash}) يتجاوز الرصيد المتاح (${balance.totalAvailableDays})`);
      return;
    }

    try {
      setIsSubmitting(true);
      await onConfirmSettlement(daysToEncash, calculatedEncashmentAmount, settlementNotes);
      toast.success('تم اعتماد وصرف تسوية الإجازة بنجاح');
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'حدث خطأ أثناء اعتماد التسوية');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden flex flex-col text-right">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">تسوية وصرف رصيد إجازات نقدياً (بدون إجازة)</h2>
              <p className="text-xs text-emerald-100 mt-0.5">
                المصدر الحسابي الموحد (SSOT) • المادة 70 و 72 من قانون العمل الكويتي
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
          {/* Employee Info Header */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 block">الموظف المستفيد:</span>
              <span className="text-sm font-bold text-slate-800">
                {employee.fullNameAr || employee.nameAr || employee.name}
              </span>
            </div>
            <div className="text-left">
              <span className="text-xs text-slate-500 block">الراتب الشامل:</span>
              <span className="text-sm font-bold text-slate-800 tabular-nums">
                {(balance.comprehensiveSalary || 0).toFixed(3)} د.ك
              </span>
            </div>
          </div>

          {/* Core Balance Metrics (SSOT) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100">
              <span className="text-[11px] text-blue-600 block mb-1">السنوي المكتسب</span>
              <span className="text-base font-bold text-blue-950 tabular-nums">
                {balance.accruedAnnualDays}
              </span>
              <span className="text-[10px] text-slate-400 block">يوم</span>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100">
              <span className="text-[11px] text-emerald-600 block mb-1">بدل العطلات</span>
              <span className="text-base font-bold text-emerald-950 tabular-nums">
                +{balance.holidayCompensationDays}
              </span>
              <span className="text-[10px] text-slate-400 block">يوم مضاف</span>
            </div>

            <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-100">
              <span className="text-[11px] text-rose-600 block mb-1">المستهلك</span>
              <span className="text-base font-bold text-rose-950 tabular-nums">
                -{balance.usedLeaveDays}
              </span>
              <span className="text-[10px] text-slate-400 block">يوم</span>
            </div>

            <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-100">
              <span className="text-[11px] text-purple-600 block mb-1">الرصيد الفعلي</span>
              <span className="text-base font-black text-purple-950 tabular-nums">
                {balance.totalAvailableDays}
              </span>
              <span className="text-[10px] text-purple-600 font-medium block">يوم متاح</span>
            </div>
          </div>

          {/* Form Input for Encashment Days */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">
                عدد الأيام المراد صرفها نقدياً:
              </label>
              <button
                type="button"
                onClick={() => setDaysToEncash(balance.totalAvailableDays)}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 underline"
              >
                صرف كامل الرصيد المتاح ({balance.totalAvailableDays} يوم)
              </button>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0.5"
                max={balance.totalAvailableDays}
                step="0.5"
                value={daysToEncash}
                onChange={(e) => setDaysToEncash(Math.max(0, parseFloat(e.target.value) || 0))}
                className="flex-1 px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-lg font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-center tabular-nums"
              />
              <span className="text-sm font-bold text-slate-600">يوم</span>
            </div>
          </div>

          {/* Financial Calculation Results Card */}
          <div className="p-5 bg-gradient-to-br from-emerald-50 via-teal-50/60 to-emerald-50/30 border border-emerald-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-600 border-b border-emerald-100 pb-2">
              <span>أجر اليوم الواحد (الراتب الشامل ÷ 26):</span>
              <span className="font-bold text-slate-900 tabular-nums">
                {dailyWage.toFixed(3)} د.ك / يوم
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600 border-b border-emerald-100 pb-2">
              <span>الأيام المتبقية بعد الصرف:</span>
              <span className="font-bold text-slate-900 tabular-nums">
                {Math.max(0, Number((balance.totalAvailableDays - daysToEncash).toFixed(2)))} يوم
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="text-xs font-bold text-emerald-900 block">
                  المبلغ الإجمالي المستحق للصرف الفوري:
                </span>
                <span className="text-[11px] text-emerald-700">
                  {daysToEncash} يوم × {dailyWage.toFixed(3)} د.ك
                </span>
              </div>
              <div className="text-left">
                <span className="text-2xl font-black text-emerald-700 tabular-nums">
                  {calculatedEncashmentAmount.toFixed(3)}
                </span>
                <span className="text-xs font-bold text-emerald-900 mr-1.5">د.ك</span>
              </div>
            </div>
          </div>

          {/* Settlement Notes */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              ملاحظات وبيان التسوية:
            </label>
            <textarea
              rows={2}
              value={settlementNotes}
              onChange={(e) => setSettlementNotes(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none text-slate-700"
              placeholder="اكتب أي ملاحظات خاصة بالسند أو سبب الصرف..."
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting || daysToEncash <= 0 || daysToEncash > balance.totalAvailableDays}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold transition-colors shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? 'جاري الاعتماد...' : 'اعتماد وصرف التسوية المالية'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeaveSettlementModal;
