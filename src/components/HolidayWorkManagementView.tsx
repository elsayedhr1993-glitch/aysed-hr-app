// src/components/HolidayWorkManagementView.tsx
import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { calculateHolidayCompensation, approveHolidayWork, WorkOnHolidayRecord } from '../services/holidayWorkService';
import { Clock, Coins, Calendar, CheckCircle2, AlertCircle, Plus, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  employees: any[];
  activeCompanyId: string;
}

export const HolidayWorkManagementView: React.FC<Props> = ({ employees, activeCompanyId }) => {
  const [records, setRecords] = useState<WorkOnHolidayRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [employeeId, setEmployeeId] = useState(employees[0]?.id || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [holidayName, setHolidayName] = useState('عطلة رسمية / يوم الجمعة');
  const [hoursWorked, setHoursWorked] = useState<number>(8);
  const [compensationType, setCompensationType] = useState<'pay' | 'day'>('pay');
  const [submitting, setSubmitting] = useState(false);

  const fetchRecords = async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('work_on_holidays')
        .select('*')
        .order('date', { ascending: false });
      if (!error && data) {
        setRecords(data);
      }
    } catch (e) {
      console.warn('fetchWorkOnHolidays error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) {
      toast.error('يرجى اختيار الموظف');
      return;
    }
    setSubmitting(true);
    try {
      const newRec: WorkOnHolidayRecord = {
        employeeId,
        date,
        holidayName,
        hoursWorked: Number(hoursWorked),
        compensationType,
        state: 'draft'
      };

      const { data, error } = await supabase
        .from('work_on_holidays')
        .insert(newRec)
        .select()
        .single();

      if (error) throw error;

      toast.success('تم تسجيل العمل في العطلة بنجاح');
      setIsModalOpen(false);
      fetchRecords();
    } catch (err: any) {
      toast.error(err.message || 'فشل حفظ السجل');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (rec: WorkOnHolidayRecord) => {
    const emp = employees.find(e => e.id === rec.employeeId);
    const basicWage = emp?.basicSalary || emp?.wage || 500; // default or actual

    const res = await approveHolidayWork(supabase, rec, basicWage);
    if (res.success) {
      toast.success(res.message);
      fetchRecords();
    } else {
      toast.error(res.message);
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans" dir="rtl">
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-lg shadow-sm border-r-4 border-purple-700">
        <div>
          <h1 className="text-xl font-bold text-slate-800">إدارة العمل في العطلات والجمع (1.5x)</h1>
          <p className="text-xs text-slate-500">وفقاً للمادة 70 وقانون العمل الكويتي (بدل نقدي أو يوم بديل)</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#71639e] hover:bg-[#5d5182] text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>تسجيل عمل في عطلة</span>
        </button>
      </div>

      {/* الجدول */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-right text-sm">
          <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
            <tr>
              <th className="p-3.5 font-semibold">الموظف</th>
              <th className="p-3.5 font-semibold">المناسبة / العطلة</th>
              <th className="p-3.5 font-semibold">التاريخ</th>
              <th className="p-3.5 font-semibold text-center">ساعات العمل</th>
              <th className="p-3.5 font-semibold text-center">نوع التعويض</th>
              <th className="p-3.5 font-semibold text-center">الحالة</th>
              <th className="p-3.5 font-semibold text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.map((rec) => {
              const emp = employees.find(e => e.id === rec.employeeId);
              const basicWage = emp?.basicSalary || emp?.wage || 500;
              const calc = calculateHolidayCompensation(basicWage, rec.hoursWorked, rec.compensationType);

              return (
                <tr key={rec.id} className="hover:bg-purple-50/30">
                  <td className="p-3.5 font-medium text-slate-800">{emp?.fullNameAr || emp?.name || 'موظف غير معروف'}</td>
                  <td className="p-3.5 text-slate-600">{rec.holidayName}</td>
                  <td className="p-3.5 text-slate-600 font-mono text-xs">{rec.date}</td>
                  <td className="p-3.5 text-center font-bold text-slate-700">{rec.hoursWorked} س</td>
                  <td className="p-3.5 text-center">
                    {rec.compensationType === 'pay' ? (
                      <span className="bg-teal-100 text-teal-800 px-2.5 py-1 rounded-full text-xs font-bold">
                        بدل نقدي ({calc.cashPayableAmount} د.ك)
                      </span>
                    ) : (
                      <span className="bg-purple-100 text-purple-800 px-2.5 py-1 rounded-full text-xs font-bold">
                        يوم بديل ({calc.compensatoryDaysAdded} يوم)
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      rec.state === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {rec.state === 'approved' ? 'معتمد' : 'مسودة'}
                    </span>
                  </td>
                  <td className="p-3.5 text-center">
                    {rec.state !== 'approved' && (
                      <button
                        onClick={() => handleApprove(rec)}
                        className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1 rounded text-xs font-semibold shadow-sm inline-flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>اعتماد وترحيل</span>
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {records.length === 0 && !loading && (
          <div className="p-12 text-center text-slate-400 italic text-sm">
            لا توجد سجلات عمل في العطلات والجمع حالياً.
          </div>
        )}
      </div>

      {/* Modal تسجيل جديد */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" dir="rtl">
            <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">تسجيل ساعات عمل في عطلة رسمية أو جمعة</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">الموظف</label>
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.fullNameAr || emp.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">مناسبة العطلة / اليوم</label>
                <input
                  type="text"
                  value={holidayName}
                  onChange={(e) => setHolidayName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">تاريخ العمل</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ساعات العمل</label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={hoursWorked}
                    onChange={(e) => setHoursWorked(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">نوع التعويض القانوني</label>
                <select
                  value={compensationType}
                  onChange={(e) => setCompensationType(e.target.value as 'pay' | 'day')}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="pay">بدل نقدي (معامل 1.5x على أجر الساعة)</option>
                  <option value="day">يوم راحة بديل (رصيد إجازات)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-sm text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-purple-700 text-white rounded-lg text-sm font-semibold hover:bg-purple-800 disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>حفظ السجل</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
