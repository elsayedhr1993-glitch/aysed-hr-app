import React, { useState } from 'react';
import { useHR } from '../context/HRContext';
import { Banknote, Users, DollarSign, Calculator, ShieldCheck, CheckCircle } from 'lucide-react';
import { formatKWD } from '../utils/kuwaitLaw';

export const PayrollView: React.FC = () => {
  const { employees, loading } = useHR();
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-08');
  const [absentDaysMap, setAbsentDaysMap] = useState<Record<string, number>>({});

  const handleAbsenceChange = (empId: string, days: number) => {
    setAbsentDaysMap(prev => ({
      ...prev,
      [empId]: Math.max(0, days)
    }));
  };

  const totalPayrollBasic = employees.reduce((sum, e) => sum + (e.basic_salary || 0), 0);

  if (loading && employees.length === 0) {
    return (
      <div className="p-8 text-center bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-gray-500 font-medium">جاري احتساب مسير الرواتب وقراءة البيانات الحية...</p>
      </div>);
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
            <Banknote className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">شاشة مسير الرواتب (PayrollView)</h2>
            <p className="text-xs text-gray-500">تقرأ الراتب الأساسي basic_salary والبيانات مباشرة من جدول hr_employee دون تكرار</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-gray-50 focus:ring-2 focus:ring-teal-500 font-semibold"
          />
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 text-teal-700 text-xs font-semibold rounded-full border border-teal-200">
            <ShieldCheck className="w-3.5 h-3.5" /> ربط مباشر بالرواتب
          </span>
        </div>
      </div>

      {/* ملخص إجمالي */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-teal-50 to-teal-100/50 p-4 rounded-xl border border-teal-200">
          <div className="text-xs text-teal-800 font-semibold">إجمالي عدد الموظفين المشمولين</div>
          <div className="text-2xl font-black text-teal-900 mt-1">{employees.length} موظف</div>
        </div>
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 p-4 rounded-xl border border-indigo-200">
          <div className="text-xs text-indigo-800 font-semibold">إجمالي الرواتب الأساسية المباشرة</div>
          <div className="text-2xl font-black text-indigo-900 mt-1">{formatKWD(totalPayrollBasic)}</div>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-4 rounded-xl border border-emerald-200">
          <div className="text-xs text-emerald-800 font-semibold">حالة التحقق والربط</div>
          <div className="text-sm font-bold text-emerald-700 mt-2 flex items-center gap-1">
            <CheckCircle className="w-4 h-4" /> متزامن مع Supabase
          </div>
        </div>
      </div>

      {/* جدول المسير */}
      <div className="overflow-x-auto border border-gray-200 rounded-xl">
        <table className="w-full text-right text-sm">
          <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
            <tr>
              <th className="py-3 px-4">الموظف</th>
              <th className="py-3 px-4">القسم / الوظيفة</th>
              <th className="py-3 px-4">الراتب الأساسي (basic_salary)</th>
              <th className="py-3 px-4">أيام الغياب / الخصم</th>
              <th className="py-3 px-4">رصيد الإجازات المتبقي</th>
              <th className="py-3 px-4">صافي الراتب المستحق</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {employees.map((emp) => {
              const absentDays = absentDaysMap[emp.id] || 0;
              const dailyRate = (emp.basic_salary || 0) / 26;
              const deduction = absentDays * dailyRate;
              const netPay = Math.max(0, (emp.basic_salary || 0) - deduction);

              return (
                <tr key={emp.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-gray-900">{emp.name}</td>
                  <td className="py-3.5 px-4 text-gray-600">{emp.job_title} - {emp.department}</td>
                  <td className="py-3.5 px-4 font-semibold text-gray-800">{formatKWD(emp.basic_salary)}</td>
                  <td className="py-3.5 px-4">
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={absentDays}
                      onChange={(e) => handleAbsenceChange(emp.id, Number(e.target.value))}
                      className="w-16 border border-gray-300 rounded px-2 py-1 text-center text-xs font-bold"
                    />
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full text-xs font-bold">
                      {emp.remaining_leaves} يوم
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-black text-emerald-600">{formatKWD(netPay)}</td>
                </tr>);
            })}
          </tbody>
        </table>
      </div>
    </div>);
};
