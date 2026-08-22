import React, { useState } from 'react';
import { useHR } from '../context/HRContext';
import { Calendar, User, CheckCircle2, Clock, Plus, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export const LeavesView: React.FC = () => {
  const { employees, updateEmployeeBalance, loading } = useHR();
  const [selectedEmpId, setSelectedEmpId] = useState<string>(employees[0]?.id || '');
  const [requestedDays, setRequestedDays] = useState<number>(5);
  const [leaveType, setLeaveType] = useState<string>('ANNUAL');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const currentEmp = employees.find(e => e.id === (selectedEmpId || employees[0]?.id));

  const handleApproveLeave = async () => {
    if (!currentEmp) {
      toast.error('يرجى اختيار الموظف أولاً');
      return;
    }

    if (requestedDays <= 0) {
      toast.error('يرجى تحديد عدد أيام صالح للإجازة');
      return;
    }

    setIsSubmitting(true);
    try {
      // عند اعتماد الإجازة: خصم الأيام وتحديث قاعدة البيانات وكافة الشاشات لحظياً
      await updateEmployeeBalance(currentEmp.id, requestedDays);
      toast.success(`تم اعتماد إجازة (${requestedDays} أيام) للموظف ${currentEmp.name} وتحديث رصيده في كافة الأنظمة فوراً.`);
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء اعتماد الإجازة');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && employees.length === 0) {
    return (
      <div className="p-8 text-center bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-gray-500 font-medium">جاري تحميل بيانات الموظفين الحية من المصدر المركزي...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">شاشة طلب واعتماد الإجازات (LeavesView)</h2>
            <p className="text-xs text-gray-500">متصلة مباشرة بـ HRContext وجدول hr_employee الموحد</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200">
          <ShieldCheck className="w-3.5 h-3.5" /> ربط سحابي حي
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* اختيار الموظف وتفاصيل الرصيد */}
        <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
          <label className="block text-sm font-semibold text-gray-700">
            <User className="w-4 h-4 inline-block ml-1 text-gray-500" />
            اختر الموظف:
          </label>
          <select
            value={selectedEmpId || (currentEmp?.id ?? '')}
            onChange={(e) => setSelectedEmpId(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.name} - ({emp.job_title || 'موظف'} - {emp.department || 'عام'})
              </option>
            ))}
          </select>

          {currentEmp && (
            <div className="mt-4 p-4 bg-white rounded-lg border border-indigo-100 shadow-sm space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">القسم / الإدارة:</span>
                <span className="font-bold text-gray-800">{currentEmp.department}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">المسمى الوظيفي:</span>
                <span className="font-bold text-gray-800">{currentEmp.job_title}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-t pt-2 mt-2">
                <span className="text-indigo-700 font-semibold">رصيد الإجازات المتبقي المعتمد:</span>
                <span className="text-base font-extrabold text-indigo-600 bg-indigo-50 px-3 py-0.5 rounded-full">
                  {currentEmp.remaining_leaves} يوماً
                </span>
              </div>
            </div>
          )}
        </div>

        {/* نموذج تقديم واعتماد الإجازة */}
        <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">نوع الإجازة:</label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="ANNUAL">إجازة سنوية اعتيادية</option>
              <option value="SICK">إجازة مرضية</option>
              <option value="EMERGENCY">إجازة طارئة / عارضة</option>
              <option value="UNPAID">إجازة بدون راتب</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">تاريخ البدء:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">الأيام المطلوبة:</label>
              <input
                type="number"
                min="1"
                max={currentEmp?.remaining_leaves || 100}
                value={requestedDays}
                onChange={(e) => setRequestedDays(Number(e.target.value))}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <button
            onClick={handleApproveLeave}
            disabled={isSubmitting || !currentEmp}
            className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50"
          >
            <CheckCircle2 className="w-5 h-5" />
            {isSubmitting ? 'جاري الاعتماد والخصم اللحظي...' : 'اعتماد الإجازة وخصم الرصيد في كل الشاشات'}
          </button>
        </div>
      </div>
    </div>
  );
};
