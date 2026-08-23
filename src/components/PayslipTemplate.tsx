// components/PayslipTemplate.tsx
import React from 'react';

export interface PayslipProps {
  companyName: string;
  monthYear: string;
  employeeName: string;
  civilId: string;
  jobTitle: string;
  startDate: string;
  basicSalary: number;
  unpaidDays: number;
  otherAllowances?: number;
}

export const PayslipTemplate: React.FC<PayslipProps> = ({
  companyName,
  monthYear,
  employeeName,
  civilId,
  jobTitle,
  startDate,
  basicSalary,
  unpaidDays,
  otherAllowances = 0,
}) => {
  // حساب معيار العمل الكويتي (الراتب / 26)
  const dailyRate = basicSalary > 0 ? basicSalary / 26 : 0;
  const unpaidDeduction = unpaidDays > 0 ? unpaidDays * dailyRate : 0;
  const totalEarnings = basicSalary + otherAllowances;
  const netSalary = Math.max(0, totalEarnings - unpaidDeduction);

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white text-gray-800 font-sans border shadow-sm print:shadow-none print:border-none" dir="rtl">
      {/* 1. ترويسة القسيمة */}
      <div className="border-b-2 border-purple-700 pb-4 mb-6 text-center">
        <h2 className="text-2xl font-bold text-purple-700">قسيمة راتب شهر: {monthYear}</h2>
        <p className="text-gray-500 text-sm mt-1">نظام Aysed S HR 2026 - شركة {companyName}</p>
      </div>

      {/* 2. بيانات الموظف */}
      <table className="w-full border-collapse border border-gray-300 mb-6 text-sm">
        <tbody>
          <tr className="border-b border-gray-300">
            <th className="bg-gray-50 text-purple-700 p-2 text-right w-1/4 border-l border-gray-300">اسم الموظف</th>
            <td className="p-2 border-l border-gray-300">{employeeName}</td>
            <th className="bg-gray-50 text-purple-700 p-2 text-right w-1/4 border-l border-gray-300">الرقم المدني</th>
            <td className="p-2">{civilId || '---'}</td>
          </tr>
          <tr>
            <th className="bg-gray-50 text-purple-700 p-2 text-right border-l border-gray-300">المسمى الوظيفي</th>
            <td className="p-2 border-l border-gray-300">{jobTitle}</td>
            <th className="bg-gray-50 text-purple-700 p-2 text-right border-l border-gray-300">تاريخ التعيين</th>
            <td className="p-2">{startDate}</td>
          </tr>
        </tbody>
      </table>

      {/* 3. الاستحقاقات */}
      <h4 className="text-base font-bold text-gray-700 mb-2">١. الاستحقاقات والبدلات</h4>
      <table className="w-full border-collapse border border-gray-300 mb-6 text-sm">
        <thead className="bg-gray-50 text-purple-700">
          <tr>
            <th className="p-2 border border-gray-300 text-right">البند</th>
            <th className="p-2 border border-gray-300 text-right">المعادلة</th>
            <th className="p-2 border border-gray-300 text-left">المبلغ (د.ك)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="p-2 border border-gray-300">الراتب الأساسي (Basic Salary)</td>
            <td className="p-2 border border-gray-300">تعاقدي</td>
            <td className="p-2 border border-gray-300 text-left font-mono font-bold">{basicSalary.toFixed(3)}</td>
          </tr>
          {otherAllowances > 0 && (
            <tr>
              <td className="p-2 border border-gray-300">بدلات أخرى</td>
              <td className="p-2 border border-gray-300">إضافي</td>
              <td className="p-2 border border-gray-300 text-left font-mono font-bold">{otherAllowances.toFixed(3)}</td>
            </tr>)}
        </tbody>
      </table>

      {/* 4. الاستقطاعات */}
      <h4 className="text-base font-bold text-gray-700 mb-2">٢. الاستقطاعات والخصومات</h4>
      <table className="w-full border-collapse border border-gray-300 mb-6 text-sm">
        <thead className="bg-gray-50 text-purple-700">
          <tr>
            <th className="p-2 border border-gray-300 text-right">السبب</th>
            <th className="p-2 border border-gray-300 text-right">عدد الأيام/الساعات</th>
            <th className="p-2 border border-gray-300 text-left">المبلغ المخصوم (د.ك)</th>
          </tr>
        </thead>
        <tbody>
          {unpaidDays > 0 ? (
            <tr className="text-red-600">
              <td className="p-2 border border-gray-300">إجازة بدون راتب / غياب</td>
              <td className="p-2 border border-gray-300">{unpaidDays} يوم</td>
              <td className="p-2 border border-gray-300 text-left font-mono font-bold">- {unpaidDeduction.toFixed(3)}</td>
            </tr>) : (
            <tr>
              <td colSpan={2} className="p-2 border border-gray-300 text-center text-gray-400">لا توجد استقطاعات لهذا الشهر</td>
              <td className="p-2 border border-gray-300 text-left font-mono">0.000</td>
            </tr>)}
        </tbody>
      </table>

      {/* 5. صافي الراتب النهائي */}
      <div className="bg-purple-700 text-white p-4 rounded mb-8 flex justify-between items-center">
        <span className="text-lg font-bold">صافي المبلغ المستحق للصرف (Net Salary):</span>
        <span className="text-2xl font-mono font-bold">{netSalary.toFixed(3)} د.ك</span>
      </div>

      {/* 6. التوقيعات والاعتماد */}
      <div className="grid grid-cols-2 gap-8 text-center pt-4">
        <div>
          <p className="font-bold mb-3">ختم واعتماد الشركة</p>
          <div className="border border-dashed border-purple-500 h-20 w-36 mx-auto flex items-center justify-center text-purple-400 text-xs opacity-70">
            Aysed Official Seal
          </div>
        </div>
        <div>
          <p className="font-bold mb-8">توقيع الموظف بالاستلام</p>
          <div className="border-b border-gray-400 w-48 mx-auto"></div>
        </div>
      </div>
    </div>);
};
