// components/LeaveBreakdownBanner.tsx
import React from 'react';

export interface LeaveBreakdownProps {
  requestedDays: number;     // الأيام المطلوبة
  carriedBalance: number;    // الرصيد المرحل المتاح
  accruedBalance: number;    // الرصيد المكتسب المتاح
  companyName?: string;
}

/**
 * مكون شريط الشفافية وتوزيع الأيام - نظام Aysed S HR 2026
 */
export const LeaveBreakdownBanner: React.FC<LeaveBreakdownProps> = ({
  requestedDays,
  carriedBalance,
  accruedBalance,
  companyName = 'الشركة',
}) => {
  // 1. حساب التوزيع البرمجي (FIFO Logic)
  const fromCarried = Math.min(requestedDays, carriedBalance);
  const remainingAfterCarried = Math.max(0, requestedDays - fromCarried);
  const fromAccrued = Math.min(remainingAfterCarried, accruedBalance);
  const unpaidDays = Math.max(0, remainingAfterCarried - fromAccrued);

  if (requestedDays <= 0) return null;

  return (
    <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 font-sans my-3 text-right" dir="rtl">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full bg-purple-600"></span>
        <h5 className="text-sm font-bold text-purple-900">
          تفصيل توزيع خصم الأرصدة لهذا الطلب:
        </h5>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {/* الخصم من المرحل */}
        <div className="flex items-center gap-1 bg-purple-700 text-white px-3 py-1.5 rounded-md font-medium shadow-sm">
          <span>خصم من المرحّل:</span>
          <strong className="font-bold">{fromCarried} يوم</strong>
        </div>

        {/* الخصم من رصيد السنة الحالية */}
        <div className="flex items-center gap-1 bg-teal-700 text-white px-3 py-1.5 rounded-md font-medium shadow-sm">
          <span>خصم من الرصيد الحالي:</span>
          <strong className="font-bold">{fromAccrued} يوم</strong>
        </div>

        {/* تجاوز الرصيد المتاح (بدون راتب) */}
        {unpaidDays > 0 && (
          <div className="flex items-center gap-1 bg-red-600 text-white px-3 py-1.5 rounded-md font-bold shadow-sm animate-pulse">
            <span>تجاوز الرصيد (بدون راتب):</span>
            <strong>{unpaidDays} يوم</strong>
          </div>)}
      </div>

      <p className="mt-3 text-xs text-slate-500 leading-relaxed border-t border-slate-200/60 pt-2">
        {unpaidDays > 0 
          ? `⚠️ تنبيه مالي: سيتم احتساب ${unpaidDays} يوم كإجازة غير مدفوعة وخصم قيمتها من مسير الرواتب القادم تلقائياً.`
          : '✓ جميع أيام الإجازة المطلوبة مغطاة بالكامل من رصيدك المعتمد.'}
      </p>
    </div>);
};
