import React, { useState } from 'react';
import { useHR } from '../context/HRContext';
import { Scale, Calculator, DollarSign, User, ShieldCheck } from 'lucide-react';
import { formatKWD } from '../utils/kuwaitLaw';

export const SettlementView: React.FC = () => {
  const { employees, loading } = useHR();
  const [selectedId, setSelectedId] = useState<string>(employees[0]?.id || '');
  const [serviceYears, setServiceYears] = useState<number>(3.5);

  const currentEmp = employees.find(e => e.id === (selectedId || employees[0]?.id));

  // حساب تعويض رصيد الإجازات المتبقي وفق القانون الكويتي
  const dailyWage = currentEmp ? (currentEmp.basic_salary / 26) : 0;
  const leaveEncashmentValue = currentEmp ? ((currentEmp.remaining_leaves || 0) * dailyWage) : 0;
  
  // حساب مكافأة نهاية الخدمة التقديرية
  const eosEstimated = currentEmp ? ((currentEmp.basic_salary / 26) * 15 * serviceYears) : 0;
  const netSettlement = leaveEncashmentValue + eosEstimated;

  if (loading && employees.length === 0) {
    return (
      <div className="p-8 text-center bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-gray-500 font-medium">جاري تحميل بيانات الموظفين لتصفية المستحقات...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">شاشة تصفية المستحقات والبدلات (SettlementView)</h2>
            <p className="text-xs text-gray-500">تقرأ رصيد الإجازات الحقيقي المحدث ومكافأة نهاية الخدمة لحظياً من HRContext</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-200">
          <ShieldCheck className="w-3.5 h-3.5" /> ربط مباشر بالرصيد
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* اختيار الموظف */}
        <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
          <label className="block text-sm font-semibold text-gray-700">
            <User className="w-4 h-4 inline-block ml-1 text-gray-500" />
            اختر الموظف لحساب التصفية:
          </label>
          <select
            value={selectedId || (currentEmp?.id ?? '')}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
          >
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.name} - ({emp.department})
              </option>
            ))}
          </select>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">سنوات الخدمة التقريبية:</label>
            <input
              type="number"
              step="0.5"
              min="0.5"
              max="40"
              value={serviceYears}
              onChange={(e) => setServiceYears(Number(e.target.value))}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* عرض بيانات الموظف ورصيد الإجازات الحي */}
        <div className="space-y-3 bg-amber-50/50 p-4 rounded-xl border border-amber-200">
          <h3 className="text-sm font-bold text-amber-900 border-b border-amber-200 pb-2">بيانات الرصيد والمخصصات الحية</h3>
          
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">الموظف:</span>
            <span className="font-bold text-gray-800">{currentEmp?.name || '-'}</span>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">الراتب الأساسي:</span>
            <span className="font-bold text-gray-800">{formatKWD(currentEmp?.basic_salary || 0)}</span>
          </div>

          <div className="flex justify-between items-center text-sm bg-white p-2.5 rounded-lg border border-amber-200">
            <span className="text-amber-800 font-semibold">رصيد الإجازات المتبقي الفعلي:</span>
            <span className="text-base font-extrabold text-amber-600">
              {currentEmp?.remaining_leaves} يوماً
            </span>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">أجر اليوم الواحد (أساسي ÷ 26):</span>
            <span className="font-bold text-gray-700">{formatKWD(dailyWage)}</span>
          </div>
        </div>

        {/* النتائج الإجمالية */}
        <div className="space-y-3 bg-emerald-50/50 p-4 rounded-xl border border-emerald-200 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-emerald-900 border-b border-emerald-200 pb-2">تفصيل مستحقات التصفية</h3>
            
            <div className="space-y-2 mt-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">بدل رصيد الإجازات المتبقي:</span>
                <span className="font-bold text-emerald-700">{formatKWD(leaveEncashmentValue)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">مكافأة نهاية الخدمة (تقديري):</span>
                <span className="font-bold text-emerald-700">{formatKWD(eosEstimated)}</span>
              </div>
            </div>
          </div>

          <div className="bg-emerald-600 text-white p-3 rounded-lg text-center mt-4">
            <span className="text-xs uppercase tracking-wider block opacity-90">صافي المستحقات الإجمالية</span>
            <span className="text-xl font-black">{formatKWD(netSettlement)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
