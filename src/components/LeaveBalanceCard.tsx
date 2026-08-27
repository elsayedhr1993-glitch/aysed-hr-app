import React from 'react';
import { 
  calculateUnifiedLeaveBalance, 
  LeaveRecord, 
  EmployeeLeaveSummary,
  buildLeaveRecordsFromEmployee 
} from '../utils/leaveEngine';
import { Employee, HrLeaveAllocation, LeaveRequest } from '../types';
import { 
  Calendar, ShieldCheck, DollarSign, ArrowUpRight, 
  Clock, Plus, CheckCircle2, AlertCircle, Sparkles, Scale
} from 'lucide-react';

export interface LeaveBalanceCardProps {
  employee: Employee | any;
  leaveRecords?: LeaveRecord[];
  allocations?: HrLeaveAllocation[];
  leaves?: LeaveRequest[];
  onOpenSettlement?: (summary: EmployeeLeaveSummary) => void;
  onOpenLeaveRequest?: (employee: Employee) => void;
  className?: string;
  compact?: boolean;
}

export const LeaveBalanceCard: React.FC<LeaveBalanceCardProps> = ({
  employee,
  leaveRecords,
  allocations = [],
  leaves = [],
  onOpenSettlement,
  onOpenLeaveRequest,
  className = '',
  compact = false
}) => {
  if (!employee) return null;

  // استخراج البيانات واستدعاء نفس المحرك الموحد
  let summary: EmployeeLeaveSummary;

  if (leaveRecords && Array.isArray(leaveRecords)) {
    const accrued = Number(employee.accruedAnnualLeave ?? employee.carriedOverBalance ?? employee.carriedOverLeave2025 ?? 0);
    const basic = Number(employee.basicSalary || employee.salary || 0);
    const allowances = Number(employee.allowances || (Number(employee.housingAllowance || 0) + Number(employee.transportAllowance || 0) + Number(employee.otherAllowance || 0)));
    summary = calculateUnifiedLeaveBalance(accrued, leaveRecords, basic, allowances);
  } else {
    const data = buildLeaveRecordsFromEmployee(employee, allocations, leaves);
    summary = calculateUnifiedLeaveBalance(
      data.accruedAnnual,
      data.records,
      data.basicSalary,
      data.allowances
    );
  }

  if (compact) {
    return (
      <div className={`p-3 bg-white rounded-xl border border-slate-200 shadow-sm text-right ${className}`} dir="rtl">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-bold text-slate-700">رصيد الإجازات الموحد</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            {summary.totalAvailableDays} يوم متاح
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg">
          <div>
            <span className="text-slate-400 block text-[9px]">المكتسب:</span>
            <span className="font-semibold text-slate-800">{summary.accruedAnnualDays}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[9px]">بدل عطلات:</span>
            <span className="font-semibold text-emerald-600">+{summary.holidayCompensationDays}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[9px]">المستهلك:</span>
            <span className="font-semibold text-rose-600">-{summary.usedLeaveDays}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-5 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 text-right ${className}`} dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900">
              رصيد الإجازات الحالي (المصدر الموحد SSOT)
            </h3>
            <p className="text-xs text-slate-500">
              {employee.fullNameAr || employee.nameAr || employee.name || 'الموظف'}
              {employee.employeeCode ? ` (${employee.employeeCode})` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>مطابق للنظام المالي</span>
        </div>
      </div>

      {/* Main Metric Hero */}
      <div className="p-4 bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-slate-50 border border-blue-100/80 rounded-xl mb-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-blue-900 block mb-1">
              الإجمالي المتاح الفعلي للاستخدام والصرف:
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-blue-700 tabular-nums">
                {summary.totalAvailableDays}
              </span>
              <span className="text-sm font-bold text-blue-900">يوم</span>
            </div>
          </div>
          <div className="text-left bg-white/90 px-3 py-2 rounded-lg border border-blue-200/60 shadow-xs">
            <span className="text-[11px] text-slate-500 block">القيمة المالية للصرف:</span>
            <span className="text-base font-bold text-emerald-600 tabular-nums">
              {summary.cashSettlementAmount.toFixed(3)}
            </span>
            <span className="text-[10px] text-slate-500 font-normal mr-1">د.ك</span>
          </div>
        </div>
      </div>

      {/* Detail Breakdown */}
      <div className="space-y-2 text-xs mb-4">
        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
          <div className="flex items-center gap-2 text-slate-700">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>الرصيد السنوي المكتسب والمرحل:</span>
          </div>
          <span className="font-bold text-slate-900 tabular-nums">
            {summary.accruedAnnualDays} يوم
          </span>
        </div>

        <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/60 border border-emerald-100">
          <div className="flex items-center gap-2 text-emerald-800">
            <Plus className="w-4 h-4 text-emerald-600" />
            <span>بدل عطلات رسمية مضاف (عمل في عطلة):</span>
          </div>
          <span className="font-bold text-emerald-700 tabular-nums">
            +{summary.holidayCompensationDays} يوم
          </span>
        </div>

        {summary.manualAdjustments !== 0 && (
          <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50/60 border border-amber-100">
            <div className="flex items-center gap-2 text-amber-800">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>تسويات وتعديلات يدوية:</span>
            </div>
            <span className="font-bold text-amber-700 tabular-nums">
              {summary.manualAdjustments > 0 ? `+${summary.manualAdjustments}` : summary.manualAdjustments} يوم
            </span>
          </div>
        )}

        <div className="flex items-center justify-between p-2 rounded-lg bg-rose-50/60 border border-rose-100">
          <div className="flex items-center gap-2 text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>الإجازات المستهلكة المعتمدة:</span>
          </div>
          <span className="font-bold text-rose-700 tabular-nums">
            -{summary.usedLeaveDays} يوم
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      {(onOpenSettlement || onOpenLeaveRequest) && (
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          {onOpenSettlement && (
            <button
              onClick={() => onOpenSettlement(summary)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
            >
              <DollarSign className="w-4 h-4" />
              <span>صرف وتسوية نقدية</span>
            </button>
          )}
          {onOpenLeaveRequest && (
            <button
              onClick={() => onOpenLeaveRequest(employee)}
              className="inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              <Calendar className="w-4 h-4" />
              <span>طلب إجازة</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default LeaveBalanceCard;
