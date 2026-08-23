// src/components/LeaveClearanceDocument.tsx
import React from 'react';
import { AysedSettlementOutput } from '../services/leaveSettlementService';

export interface EmployeeInfo {
  name: string;
  civilId: string;
  employeeCode: string;
  joinDate: string;
}

interface Props {
  employee: EmployeeInfo;
  settlement: AysedSettlementOutput;
  numberOfDays: number;
}

export const LeaveClearanceDocument: React.FC<Props> = ({ employee, settlement, numberOfDays }) => {
  return (
    <div className="w-full max-w-4xl mx-auto bg-white p-8 border border-gray-200 shadow-sm print:shadow-none print:border-none print:p-0 font-sans text-slate-800" dir="rtl">
      
      {/* ترويسة احترافية */}
      <div className="border-b-4 border-[#71639e] pb-4 mb-6 text-center">
        <h2 className="text-2xl font-bold text-[#71639e] mb-1">نـموذج تـسوية وتـصفية إجـازة مـوظف</h2>
        <h4 className="text-sm font-medium text-slate-500">نـظام Aysed S HR 2026 - الإصدار الرسمي</h4>
      </div>

      {/* بيانات الهوية */}
      <div className="border border-slate-300 rounded-md overflow-hidden mb-6">
        <table className="w-full text-sm border-collapse">
          <tbody>
            <tr className="bg-slate-50 border-b border-slate-200">
              <td className="w-1/5 p-2.5 font-bold text-slate-700">اسم الموظف:</td>
              <td className="w-3/10 p-2.5">{employee.name}</td>
              <td className="w-1/5 p-2.5 font-bold text-slate-700">الرقم المدني:</td>
              <td className="w-3/10 p-2.5 font-mono">{employee.civilId}</td>
            </tr>
            <tr>
              <td className="p-2.5 font-bold text-slate-700">كود الموظف:</td>
              <td className="p-2.5">{employee.employeeCode}</td>
              <td className="p-2.5 font-bold text-slate-700">تاريخ المباشرة:</td>
              <td className="p-2.5">{employee.joinDate}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* جدول الأرصدة (Days Summary) */}
      <div className="mb-6">
        <h5 className="text-base font-bold text-[#71639e] border-r-4 border-[#71639e] pr-2.5 mb-3">
          ١. ملخص أرصدة الإجازات (سجل متعدد السنوات)
        </h5>
        <div className="border border-slate-300 rounded-md overflow-hidden">
          <table className="w-full text-center text-sm border-collapse">
            <thead>
              <tr className="bg-[#71639e] text-white font-semibold">
                <th className="p-2.5 border-l border-[#5d5182]">الرصيد المرحل</th>
                <th className="p-2.5 border-l border-[#5d5182]"></th>
                <th className="p-2.5 border-l border-[#5d5182]">المكتسب الحالي</th>
                <th className="p-2.5 border-l border-[#5d5182]">الأيام المطلوبة</th>
                <th className="p-2.5 border-l border-[#5d5182] bg-rose-600">أيام بدون راتب</th>
                <th className="p-2.5">الرصيد المتبقي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              <tr>
                <td className="p-2.5 border-l border-slate-200">{settlement.aysed_carried_over.toFixed(2)} يوم</td>
                <td className="p-2.5 border-l border-slate-200">{(settlement.aysed_opening_balance || 0).toFixed(2)} يوم</td>
                <td className="p-2.5 border-l border-slate-200">{settlement.aysed_accrued_2026.toFixed(2)} يوم</td>
                <td className="p-2.5 border-l border-slate-200 font-bold">{numberOfDays.toFixed(1)} يوم</td>
                <td className="p-2.5 border-l border-slate-200 text-rose-600 font-bold">
                  {settlement.aysed_unpaid_days.toFixed(1)} يوم
                </td>
                <td className="p-2.5 bg-slate-50 font-bold">0.00 يوم</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* الجدول المالي (Financial Settlement) */}
      <div className="mb-8">
        <h5 className="text-base font-bold text-teal-700 border-r-4 border-teal-700 pr-2.5 mb-3">
          ٢. التسوية المالية (قاعدة ٢٦ يوم عمل - المادة ٦٢/٧٠)
        </h5>
        <div className="border border-slate-200 rounded-md p-4 bg-slate-50">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-slate-200 pb-2">
                <td className="py-2 text-slate-700">
                  بدل رصيد الإجازات ({settlement.aysed_paid_days.toFixed(1)} يوم مدفوع × {settlement.aysed_daily_wage.toFixed(3)} د.ك)
                </td>
                <td className="py-2 text-left font-bold">{settlement.aysed_leave_cash.toFixed(3)} د.ك</td>
              </tr>

              {settlement.aysed_ticket_allowance > 0 && (
                <tr className="border-b border-slate-200 pb-2">
                  <td className="py-2 text-slate-700">بدل تذاكر السفر السنوية</td>
                  <td className="py-2 text-left font-bold">{settlement.aysed_ticket_allowance.toFixed(3)} د.ك</td>
                </tr>)}

              {settlement.aysed_allowances > 0 && (
                <tr className="border-b border-slate-200 pb-2">
                  <td className="py-2 text-slate-700">بدلات أخرى معتمدة</td>
                  <td className="py-2 text-left font-bold">{settlement.aysed_allowances.toFixed(3)} د.ك</td>
                </tr>)}

              {settlement.aysed_deductions > 0 && (
                <tr className="border-b border-slate-200 pb-2 text-rose-600">
                  <td className="py-2">الاستقطاعات والخصومات</td>
                  <td className="py-2 text-left font-bold">-{settlement.aysed_deductions.toFixed(3)} د.ك</td>
                </tr>)}

              {settlement.aysed_unpaid_days > 0 && (
                <tr className="border-b border-slate-200 pb-2 text-rose-600">
                  <td className="py-2">
                    استقطاع أيام تجاوز الرصيد ({settlement.aysed_unpaid_days.toFixed(1)} يوم بدون راتب)
                  </td>
                  <td className="py-2 text-left font-bold">0.000 د.ك</td>
                </tr>)}

              <tr className="text-base font-bold pt-3">
                <td className="pt-3 text-slate-900">صافي المبلغ النهائي المستحق (NET PAYABLE)</td>
                <td className="pt-3 text-left text-teal-700 text-lg">{settlement.aysed_net_payable.toFixed(3)} د.ك</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* التوقيعات */}
      <div className="grid grid-cols-4 gap-4 mt-12 text-center text-xs text-slate-600 pt-6 border-t border-slate-200">
        <div>
          <span className="font-semibold block mb-8">المحاسبة</span>
          <span className="border-t border-dotted border-slate-400 block w-3/4 mx-auto pt-1">التوقيع والاعتماد</span>
        </div>
        <div>
          <span className="font-semibold block mb-8">الموارد البشرية (HR)</span>
          <span className="border-t border-dotted border-slate-400 block w-3/4 mx-auto pt-1 font-bold text-slate-800">السيد (Sayed)</span>
        </div>
        <div>
          <span className="font-semibold block mb-8">المدير الإداري</span>
          <span className="border-t border-dotted border-slate-400 block w-3/4 mx-auto pt-1">التوقيع والاعتماد</span>
        </div>
        <div>
          <span className="font-semibold block mb-8">توقيع واستلام الموظف</span>
          <span className="border-t border-dotted border-slate-400 block w-3/4 mx-auto pt-1">براءة ذمة واستلام</span>
        </div>
      </div>

      {/* زر الطباعة المباشر */}
      <div className="mt-8 text-center print:hidden">
        <button
          onClick={() => window.print()}
          className="bg-[#71639e] hover:bg-[#5d5182] text-white px-6 py-2.5 rounded-md font-bold text-sm shadow transition-colors inline-flex items-center gap-2 cursor-pointer"
        >
          <span>طباعة نموذج التسوية (PDF)</span>
        </button>
      </div>

    </div>);
};
