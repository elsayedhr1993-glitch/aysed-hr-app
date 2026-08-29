// src/components/LeaveClearanceDocument.tsx
import React from 'react';
import { AysedSettlementOutput } from '../services/leaveSettlementService';
import { UniversalSettlementResult, UniversalSettlementItem, Company } from '../types';

export interface EmployeeInfo {
  name: string;
  civilId: string;
  employeeCode: string;
  joinDate: string;
  jobTitle?: string;
  department?: string;
  bankName?: string;
  iban?: string;
}

interface Props {
  employee: EmployeeInfo;
  settlement: AysedSettlementOutput | UniversalSettlementResult;
  numberOfDays?: number;
  activeCompany?: Company | null;
  voucherNumber?: string;
  settlementDate?: string;
  items?: UniversalSettlementItem[];
}

export const LeaveClearanceDocument: React.FC<Props> = ({ 
  employee, 
  settlement, 
  numberOfDays,
  activeCompany,
  voucherNumber,
  settlementDate,
  items: propItems
}) => {
  const isUniversal = 'items' in settlement || (propItems && propItems.length > 0);
  const items: UniversalSettlementItem[] = (settlement as any).items || propItems || [];

  const earnings = items.filter(i => i.type === 'EARNING');
  const deductions = items.filter(i => i.type === 'DEDUCTION');

  const totalEarnings = (settlement as any).totalEarnings !== undefined
    ? (settlement as any).totalEarnings
    : (settlement.aysed_leave_cash || 0) + (settlement.aysed_ticket_allowance || 0) + (settlement.aysed_allowances || 0);

  const totalDeductions = (settlement as any).totalDeductions !== undefined
    ? (settlement as any).totalDeductions
    : (settlement.aysed_deductions || 0);

  const netPayable = (settlement as any).netSettlementPayout !== undefined
    ? (settlement as any).netSettlementPayout
    : (settlement.aysed_net_payable || 0);

  const dailyWage = (settlement as any).dailyWage || settlement.aysed_daily_wage || 0;
  const vNum = voucherNumber || (settlement as any).voucherNumber || `LST-${new Date().getFullYear()}-001`;
  const sDate = settlementDate || (settlement as any).settlementDate || new Date().toISOString().split('T')[0];

  // Core 4 Leave Variables (Single Source of Truth)
  const carriedOver = Number(((settlement as any).carriedOverBalance ?? settlement.aysed_carried_over ?? 0).toFixed(2));
  const accrued = Number(((settlement as any).accruedBalance ?? settlement.aysed_accrued_2026 ?? 0).toFixed(2));
  const totalAvailable = Number(((settlement as any).totalAvailableBefore ?? (carriedOver + accrued) ?? settlement.aysed_total_available ?? 0).toFixed(2));
  const paidLeaveDays = Number(((settlement as any).consumedLeaveDays ?? numberOfDays ?? settlement.aysed_paid_days ?? 0).toFixed(2));
  const statutoryDays = Number(((settlement as any).statutoryLeaveDays ?? 0).toFixed(2));
  const encashedDays = Number(((settlement as any).encashedLeaveDays ?? 0).toFixed(2));
  const unpaidDays = Number(((settlement as any).unpaidLeaveDays ?? settlement.aysed_unpaid_days ?? 0).toFixed(2));
  const remainingBalance = Number(((settlement as any).remainingBalanceAfter ?? Math.max(0, totalAvailable - paidLeaveDays - encashedDays)).toFixed(2));

  return (
    <div className="w-full max-w-4xl mx-auto bg-white p-8 sm:p-10 border border-gray-300 shadow-sm print:shadow-none print:border-none print:p-0 font-['Tajawal','Cairo',sans-serif] text-slate-800 text-right leading-normal" dir="rtl">
      
      {/* 1. ترويسة السند والشركة */}
      <div className="border-b-2 border-[#71639e] pb-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="text-right">
            <h1 className="text-xl font-black text-slate-900">
              {activeCompany?.nameAr || 'مجموعة المنارة للمقاولات العامة والتجارة'}
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              إدارة الموارد البشرية والشؤون الإدارية والمالية (HR & Payroll Dept)
            </p>
            <p className="text-[11px] text-slate-400 font-mono">
              سجل تجاري: {activeCompany?.commercialRegNo || '382914'} | الرقم المدني: {activeCompany?.civilIdCompany || '103948201934'}
            </p>
          </div>

          <div className="text-left border border-purple-200 bg-purple-50/60 p-2.5 rounded-lg">
            <span className="text-[10px] font-bold text-[#71639e] block">سند تصفية وتسوية إجازة</span>
            <span className="text-xs font-black font-mono text-purple-950 block">{vNum}</span>
            <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">{sDate}</span>
          </div>
        </div>

        <div className="mt-4 text-center">
          <h2 className="text-xl font-black text-[#71639e] inline-block border-b-2 border-dashed border-[#71639e] pb-1 px-4">
            {(settlement as any).settlementMode === 'ENCASHMENT_LIQUIDATION'
              ? 'سند صرف وتصفية البدل النقدي لرصيد الإجازات (Leave Encashment Voucher)'
              : 'سند تصفية مستحقات وبدل الإجازات (Leave Settlement Voucher)'}
          </h2>
          <p className="text-[11px] text-slate-500 font-bold mt-1">
            {(settlement as any).settlementMode === 'ENCASHMENT_LIQUIDATION'
              ? 'صرف البدل النقدي لرصيد الإجازات بدون إجازة وفق أحكام قانون العمل الكويتي (المادة 70) - قاعدة 26 يوم عمل'
              : 'وفق أحكام قانون العمل الكويتي رقم 6 لسنة 2010 (المادتان 70 و77) - قاعدة 26 يوم عمل'}
          </p>
        </div>
      </div>

      {/* 2. بيانات الموظف والتعاقد */}
      <div className="border border-slate-300 rounded-lg overflow-hidden mb-6 text-xs">
        <div className="bg-slate-100 px-3 py-1.5 font-bold text-slate-800 border-b border-slate-300">
          بيانات الموظف المستفيد (Employee Information)
        </div>
        <table className="w-full border-collapse">
          <tbody>
            <tr className="border-b border-slate-200">
              <td className="w-1/6 p-2 bg-slate-50 font-bold text-slate-700">اسم الموظف:</td>
              <td className="w-2/6 p-2 font-bold text-slate-900">{employee.name}</td>
              <td className="w-1/6 p-2 bg-slate-50 font-bold text-slate-700">كود الموظف:</td>
              <td className="w-2/6 p-2 font-mono font-bold text-[#71639e]">{employee.employeeCode || '-'}</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="p-2 bg-slate-50 font-bold text-slate-700">الرقم المدني:</td>
              <td className="p-2 font-mono font-bold">{employee.civilId || '-'}</td>
              <td className="p-2 bg-slate-50 font-bold text-slate-700">تاريخ المباشرة:</td>
              <td className="p-2 font-mono">{employee.joinDate || '-'}</td>
            </tr>
            <tr>
              <td className="p-2 bg-slate-50 font-bold text-slate-700">المسمى / القسم:</td>
              <td className="p-2">{employee.jobTitle || 'موظف'} - {employee.department || 'عام'}</td>
              <td className="p-2 bg-slate-50 font-bold text-slate-700">أجر اليوم القانوني:</td>
              <td className="p-2 font-mono font-bold text-teal-800">{dailyWage.toFixed(3)} د.ك (الراتب الأساسي ÷ 26)</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 3. جدول الأرصدة وحركة الإجازات */}
      <div className="mb-6">
        <h3 className="text-xs font-black text-slate-900 border-r-3 border-[#71639e] pr-2 mb-2">
          ١. كشف حركة وأرصدة الإجازات (Leave Balance Ledger - FIFO)
        </h3>
        <div className="border border-slate-300 rounded-lg overflow-hidden text-xs">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="bg-slate-100 font-bold text-slate-800 border-b border-slate-300">
                <th className="p-2 border-l border-slate-300">الرصيد المرحل</th>
                <th className="p-2 border-l border-slate-300">المكتسب 2026</th>
                <th className="p-2 border-l border-slate-300 bg-purple-50 text-[#71639e]">إجمالي الرصيد المتاح</th>
                <th className="p-2 border-l border-slate-300 text-blue-800">أيام الإجازة المصروفة مقدماً / Paid Leave Days</th>
                <th className="p-2 border-l border-slate-300 text-emerald-800">إجازة عزاء (م77)</th>
                <th className="p-2 border-l border-slate-300 text-amber-800">تصفية نقدية</th>
                <th className="p-2 border-l border-slate-300 text-rose-700">بدون راتب</th>
                <th className="p-2 bg-teal-50 text-teal-900 font-black">الرصيد المتبقي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white font-mono">
              <tr>
                <td className="p-2 border-l border-slate-200">
                  {carriedOver.toFixed(2)} يوم
                </td>
                <td className="p-2 border-l border-slate-200">
                  {accrued.toFixed(2)} يوم
                </td>
                <td className="p-2 border-l border-slate-200 font-bold bg-purple-50/50 text-[#71639e]">
                  {totalAvailable.toFixed(2)} يوم
                </td>
                <td className="p-2 border-l border-slate-200 font-bold text-blue-900">
                  {paidLeaveDays.toFixed(2)} يوم
                </td>
                <td className="p-2 border-l border-slate-200 font-bold text-emerald-700">
                  {statutoryDays.toFixed(2)} يوم
                </td>
                <td className="p-2 border-l border-slate-200 font-bold text-amber-700">
                  {encashedDays.toFixed(2)} يوم
                </td>
                <td className="p-2 border-l border-slate-200 font-bold text-rose-600">
                  {unpaidDays.toFixed(2)} يوم
                </td>
                <td className="p-2 font-black bg-teal-50 text-teal-900">
                  {remainingBalance.toFixed(2)} يوم
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. شيت التسوية الشامل متعدد البنود (Dynamic Multi-Item Financial Sheet) */}
      <div className="mb-6">
        <h3 className="text-xs font-black text-slate-900 border-r-3 border-teal-700 pr-2 mb-2">
          ٢. شيت التسوية المالية الشاملة والمتعددة البنود (Universal Financial Breakdown)
        </h3>

        {isUniversal && items.length > 0 ? (
          <div className="border border-slate-300 rounded-lg overflow-hidden text-xs mb-4">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-100 font-bold text-slate-800 border-b border-slate-300">
                  <th className="p-2 text-right w-1/12">#</th>
                  <th className="p-2 text-right w-5/12">بيان البند المالي (Description)</th>
                  <th className="p-2 text-center w-2/12">الكمية / الأساس</th>
                  <th className="p-2 text-center w-2/12">معدل الاحتساب</th>
                  <th className="p-2 text-left w-2/12">المبلغ (د.ك)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {/* الإضافات والمستحقات */}
                <tr className="bg-emerald-50/60 font-bold text-emerald-900">
                  <td colSpan={5} className="p-2">أولاً: المستحقات والبدلات المدفوعة (Earnings & Allowances)</td>
                </tr>
                {earnings.map((item, idx) => (
                  <tr key={item.id || `earn-${idx}`} className="hover:bg-slate-50">
                    <td className="p-2 font-mono text-slate-500">{idx + 1}</td>
                    <td className="p-2">
                      <span className="font-bold text-slate-900 block">{item.name}</span>
                      {item.notes && <span className="text-[10px] text-slate-500 block">{item.notes}</span>}
                    </td>
                    <td className="p-2 text-center font-mono font-bold text-slate-700">
                      {Number((item.quantity || 0).toFixed(2))} {item.unit === 'days' ? 'أيام' : item.unit === 'hours' ? 'ساعات' : 'وحدة'}
                    </td>
                    <td className="p-2 text-center font-mono text-slate-700">{item.rate.toFixed(3)}</td>
                    <td className="p-2 text-left font-mono font-bold text-emerald-700" dir="ltr">
                      +{item.amount.toFixed(3)} د.ك
                    </td>
                  </tr>
                ))}
                <tr className="bg-emerald-100/50 font-bold border-t border-emerald-200 text-emerald-950">
                  <td colSpan={4} className="p-2 text-right">إجمالي المستحقات والبدلات (Total Earnings):</td>
                  <td className="p-2 text-left font-mono font-black" dir="ltr">+{totalEarnings.toFixed(3)} د.ك</td>
                </tr>

                {/* الاستقطاعات والخصومات */}
                {deductions.length > 0 && (
                  <>
                    <tr className="bg-rose-50/60 font-bold text-rose-900 border-t-2 border-slate-300">
                      <td colSpan={5} className="p-2">ثانياً: الاستقطاعات والخصومات المسجلة (Deductions)</td>
                    </tr>
                    {deductions.map((item, idx) => (
                      <tr key={item.id || `ded-${idx}`} className="hover:bg-slate-50">
                        <td className="p-2 font-mono text-slate-500">{idx + 1}</td>
                        <td className="p-2">
                          <span className="font-bold text-slate-900 block">{item.name}</span>
                          {item.notes && <span className="text-[10px] text-slate-500 block">{item.notes}</span>}
                        </td>
                        <td className="p-2 text-center font-mono font-bold text-slate-700">
                          {Number((item.quantity || 0).toFixed(2))} {item.unit === 'days' ? 'أيام' : item.unit === 'hours' ? 'ساعات' : 'بند'}
                        </td>
                        <td className="p-2 text-center font-mono text-slate-700">{item.rate.toFixed(3)}</td>
                        <td className="p-2 text-left font-mono font-bold text-rose-700" dir="ltr">
                          -{item.amount.toFixed(3)} د.ك
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-rose-100/50 font-bold border-t border-rose-200 text-rose-950">
                      <td colSpan={4} className="p-2 text-right">إجمالي الاستقطاعات والخصومات (Total Deductions):</td>
                      <td className="p-2 text-left font-mono font-black" dir="ltr">-{totalDeductions.toFixed(3)} د.ك</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Legacy fallback table */
          <div className="border border-slate-300 rounded-lg p-3 bg-slate-50 text-xs mb-4">
            <table className="w-full">
              <tbody>
                <tr className="border-b border-slate-200 pb-2">
                  <td className="py-2 text-slate-800 font-bold">
                    بدل رصيد الإجازات السنوية المستحقة / Leave Balance Cash-out ({settlement.aysed_paid_days.toFixed(1)} يوم مدفوع × {settlement.aysed_daily_wage.toFixed(3)} د.ك)
                  </td>
                  <td className="py-2 text-left font-bold font-mono">{settlement.aysed_leave_cash.toFixed(3)} د.ك</td>
                </tr>
                {settlement.aysed_ticket_allowance > 0 && (
                  <tr className="border-b border-slate-200 pb-2">
                    <td className="py-2 text-slate-700">بدل تذاكر السفر السنوية</td>
                    <td className="py-2 text-left font-bold font-mono">{settlement.aysed_ticket_allowance.toFixed(3)} د.ك</td>
                  </tr>
                )}
                {settlement.aysed_deductions > 0 && (
                  <tr className="border-b border-slate-200 pb-2 text-rose-700">
                    <td className="py-2 font-bold">الاستقطاعات والخصومات</td>
                    <td className="py-2 text-left font-bold font-mono">-{settlement.aysed_deductions.toFixed(3)} د.ك</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* صافي المستحق النهائي */}
        <div className="bg-slate-900 text-white rounded-lg p-3.5 flex items-center justify-between text-xs">
          <div>
            <span className="font-bold text-slate-200 block">صافي المبلغ المستحق النهائي للصرف (NET PAYABLE)</span>
            <span className="text-[10px] text-slate-400">
              إجمالي المستحقات ({totalEarnings.toFixed(3)} د.ك) - إجمالي الاستقطاعات ({totalDeductions.toFixed(3)} د.ك)
            </span>
          </div>
          <div className="text-left">
            <span className="text-xl font-black font-mono text-emerald-400" dir="ltr">
              {netPayable.toFixed(3)} د.ك
            </span>
          </div>
        </div>
      </div>

      {/* 5. الإقرار القانوني وبراءة الذمة */}
      <div className="border border-slate-300 p-3 rounded-lg text-[11px] text-slate-700 bg-slate-50 mb-6 leading-relaxed">
        <strong>إقرار وتعهد باستلام المستحقات: </strong>
        أقر أنا الموظف الموقع أدناه بأنني قد استلمت كامل مستحقاتي وبدلاتي الموضحة في هذا السند أعلاه عن فترة الإجازة المصرح بها، وأنه لا يحق لي المطالبة بأي مبالغ أخرى عن هذا البند، وبموجبه أبرئ ذمة الشركة إبراءً شاملاً ونهائياً لا رجعة فيه.
      </div>

      {/* 6. دورة الاعتمادات والتوقيعات الرسمية */}
      <div className="grid grid-cols-4 gap-3 text-center text-xs text-slate-700 pt-4 border-t border-slate-300">
        <div className="p-2 border border-slate-200 rounded-lg">
          <span className="font-bold block text-slate-900 mb-6">إعداد المحاسبة</span>
          <span className="text-[10px] text-slate-400 block border-t border-dotted border-slate-300 pt-1">التوقيع والتاريخ</span>
        </div>
        <div className="p-2 border border-slate-200 rounded-lg bg-purple-50/40">
          <span className="font-bold block text-[#71639e] mb-6">الموارد البشرية (HR)</span>
          <span className="text-[10px] text-slate-700 font-bold block border-t border-dotted border-slate-300 pt-1">السيد (Sayed)</span>
        </div>
        <div className="p-2 border border-slate-200 rounded-lg">
          <span className="font-bold block text-slate-900 mb-6">المدير العام / المفوض</span>
          <span className="text-[10px] text-slate-400 block border-t border-dotted border-slate-300 pt-1">الختم والاعتماد</span>
        </div>
        <div className="p-2 border border-slate-200 rounded-lg bg-emerald-50/40">
          <span className="font-bold block text-emerald-950 mb-6">توقيع واستلام الموظف</span>
          <span className="text-[10px] text-slate-700 font-bold block border-t border-dotted border-slate-300 pt-1">براءة ذمة واستلام</span>
        </div>
      </div>

      {/* زر الطباعة المباشر */}
      <div className="mt-8 text-center print:hidden">
        <button
          onClick={() => window.print()}
          className="bg-[#71639e] hover:bg-[#5d5182] text-white px-6 py-2.5 rounded-md font-bold text-sm shadow transition-colors inline-flex items-center gap-2 cursor-pointer"
        >
          <span>طباعة نموذج التسوية الرسمي (PDF / Print)</span>
        </button>
      </div>

    </div>
  );
};
export default LeaveClearanceDocument;
