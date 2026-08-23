import React, { useState } from 'react';
import { Calendar as CalendarIcon, Plus, CheckCircle, Clock, Award, ShieldAlert, FileText } from 'lucide-react';
import { Employee, LeaveRequest } from '../types';

interface Holiday {
  id: string;
  name: string;
  date: string;
  daysCount: number;
  type: 'national' | 'religious' | 'emergency';
}

interface KuwaitHolidaysAppProps {
  employees: Employee[];
  leaves: LeaveRequest[];
}

export const KuwaitHolidaysApp: React.FC<KuwaitHolidaysAppProps> = ({ employees, leaves }) => {
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // قائمة العطلات الرسمية للكويت (أسلوب Odoo)
  const [holidays, setHolidays] = useState<Holiday[]>([
    { id: '1', name: 'العيد الوطني وعيد التحرير', date: '2026-02-25', daysCount: 2, type: 'national' },
    { id: '2', name: 'عيد الفطر السعيد', date: '2026-03-20', daysCount: 3, type: 'religious' },
    { id: '3', name: 'عيد الأضحى المبارك', date: '2026-05-27', daysCount: 4, type: 'religious' },
    { id: '4', name: 'رأس السنة الهجرية', date: '2026-06-16', daysCount: 1, type: 'religious' },
  ]);

  const pendingLeavesCount = leaves.filter(l => l.status === 'SUBMITTED').length;

  return (
    <div className="p-6 bg-transparent min-h-screen text-right" dir="rtl">
      
      {/* 🟢 Odoo Top Control Panel / الهيدر الاحترافي لأودو */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarIcon className="w-7 h-7 text-purple-700" />
            العطلات الرسمية والإجازات (Time Off)
          </h1>
          <p className="text-sm text-slate-500 mt-1">إدارة العطلات الرسمية بدولة الكويت وتطبيق قوانين الشؤون والعمل</p>
        </div>

        <div className="flex gap-3">
          {/* أزرار التبديل بين الأنماط كـ Odoo */}
          <div className="bg-slate-100 p-1 rounded-lg flex gap-1 border border-slate-200">
            <button 
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'calendar' ? 'bg-white shadow text-purple-700' : 'text-slate-600'}`}
            >
              📅 التقويم (Calendar)
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-white shadow text-purple-700' : 'text-slate-600'}`}
            >
              📋 القائمة (List)
            </button>
          </div>

          <button className="bg-purple-700 hover:bg-purple-800 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-all">
            <Plus className="w-4 h-4" />
            <span>إضافة عطلة رسمية</span>
          </button>
        </div>
      </div>

      {/* 📊 Odoo Summary Stats Cards / كروت الإحصائيات السريعة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block font-medium">إجمالي العطلات الرسمية</span>
            <span className="text-2xl font-bold text-slate-800">13 يوم</span>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg text-purple-700"><Award className="w-6 h-6" /></div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block font-medium">العطلة القادمة</span>
            <span className="text-lg font-bold text-emerald-600">المولد النبوي الشريف</span>
          </div>
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600"><Clock className="w-6 h-6" /></div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block font-medium">طلبات الإجازة المعلقة</span>
            <span className="text-2xl font-bold text-amber-600">{pendingLeavesCount} طلبات</span>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg text-amber-600"><ShieldAlert className="w-6 h-6" /></div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block font-medium">قانون العمل الكويتي</span>
            <span className="text-xs font-semibold text-blue-700 block mt-1">الجمعة والسبت عطلة مستبعدة</span>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg text-blue-600"><CheckCircle className="w-6 h-6" /></div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Main Content Area */}
        <div className="flex-1">
          {/* 🗓️ Main Content Area / العرض الرئيسي */}
          {viewMode === 'list' ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm">
                    <th className="p-4">اسم العطلة المناسبة</th>
                    <th className="p-4">التاريخ</th>
                    <th className="p-4">عدد الأيام</th>
                    <th className="p-4">النوع</th>
                    <th className="p-4">تأثيرها على الرواتب (Overtime)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {holidays.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50 transition-all">
                      <td className="p-4 font-semibold text-slate-800">{h.name}</td>
                      <td className="p-4 text-slate-600">{h.date}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full font-bold text-xs">
                          {h.daysCount} {h.daysCount > 1 ? 'أيام' : 'يوم'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${h.type === 'national' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                          {h.type === 'national' ? 'وطنية' : 'دينية'}
                        </span>
                      </td>
                      <td className="p-4 text-emerald-600 font-medium">+200% أجر إضافي في حال العمل</td>
                    </tr>))}
                </tbody>
              </table>
            </div>) : (
            /* Odoo Calendar Grid View Placeholder */
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center">
              <div className="py-12">
                <CalendarIcon className="w-16 h-16 text-purple-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-700">عرض تقويم أودو التفاعلي (Odoo Calendar Grid)</h3>
                <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto">
                  يتم هنا عرض الأيام شهرياً مع إضاءة العطلات الرسمية باللون الأخضر، وطلبات إجازات الموظفين المقبولة بالألوان المميزة.
                </p>
                <div className="mt-8 flex justify-center">
                   <div className="grid grid-cols-7 gap-2">
                     {/* Just a decorative mini-calendar */}
                     {['أ', 'إ', 'ث', 'ر', 'خ', 'ج', 'س'].map((d, idx) => <div key={idx} className="w-10 h-10 flex items-center justify-center font-bold text-slate-400">{d}</div>)}
                     {Array.from({length: 31}).map((_, i) => (
                       <div key={i} className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium ${(i+1 === 25 || i+1 === 26) ? 'bg-emerald-100 text-emerald-700' : (i%7===5 || i%7===6) ? 'bg-slate-50 text-slate-400' : 'hover:bg-slate-100 text-slate-700 cursor-pointer'}`}>
                         {i + 1}
                       </div>))}
                   </div>
                </div>
              </div>
            </div>)}
        </div>

        {/* Smart Leave Balance Side Card */}
        <div className="w-80 flex-shrink-0">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 sticky top-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" />
              أرصدة الإجازات للموظفين
            </h3>
            
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {employees.slice(0, 5).map(emp => {
                // Calculate rough balance for display
                const empLeaves = leaves.filter(l => l.employeeId === emp.id && l.status === 'APPROVED');
                const usedAnnual = empLeaves.filter(l => l.leaveType === 'ANNUAL').reduce((sum, l) => sum + (l.totalDays || 0), 0);
                const totalAnnual = 30; // standard
                const balAnnual = totalAnnual - usedAnnual;

                const usedSick = empLeaves.filter(l => l.leaveType === 'SICK').reduce((sum, l) => sum + (l.totalDays || 0), 0);
                const totalSick = 15; // full pay
                const balSick = Math.max(0, totalSick - usedSick);

                return (
                  <div key={emp.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="font-bold text-slate-800 text-sm mb-2">{emp.fullNameAr}</p>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">سنوية (مدفوعة)</span>
                        <span className={`font-bold ${balAnnual > 10 ? 'text-emerald-600' : 'text-amber-600'}`}>{balAnnual} يوم</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5">
                        <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (balAnnual / totalAnnual) * 100)}%` }}></div>
                      </div>
                      
                      <div className="flex justify-between items-center text-xs mt-3">
                        <span className="text-slate-500">مرضية (أجر كامل)</span>
                        <span className="font-bold text-blue-600">{balSick} يوم</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5">
                        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (balSick / totalSick) * 100)}%` }}></div>
                      </div>
                    </div>
                  </div>);
              })}
            </div>
            {employees.length > 5 && (
              <button className="w-full mt-4 text-sm text-purple-700 font-medium hover:bg-purple-50 p-2 rounded-lg transition-all">
                عرض جميع الموظفين
              </button>)}
          </div>
        </div>
      </div>
    </div>);
};
