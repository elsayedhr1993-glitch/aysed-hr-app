// src/components/LeaveTypesConfigView.tsx
import React, { useState } from 'react';
import { CalendarPlus, Check, ShieldCheck, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

export const LeaveTypesConfigView: React.FC = () => {
  const [leaveTypes, setLeaveTypes] = useState([
    { id: '1', name: 'إجازة سنوية (Annual Leave)', code: 'ANNUAL', requiresAllocation: true, isUnpaid: false, daysPerYear: 30 },
    { id: '2', name: 'إجازة مرضية (Sick Leave)', code: 'SICK', requiresAllocation: false, isUnpaid: false, daysPerYear: 15 },
    { id: '3', name: 'إجازة بدون راتب (Unpaid Leave)', code: 'UNPAID', requiresAllocation: false, isUnpaid: true, daysPerYear: 0 },
    { id: '4', name: 'إجازة عارضة / طارئة', code: 'CASUAL', requiresAllocation: true, isUnpaid: false, daysPerYear: 6 },
    { id: '5', name: 'يوم تعويضي (Compensatory Off)', code: 'COMP', requiresAllocation: true, isUnpaid: false, daysPerYear: 0 },
  ]);

  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeCode, setNewTypeCode] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName || !newTypeCode) {
      toast.error('يرجى إدخال اسم الرمز');
      return;
    }
    setLeaveTypes(prev => [
      ...prev,
      { id: Date.now().toString(), name: newTypeName, code: newTypeCode.toUpperCase(), requiresAllocation: true, isUnpaid: false, daysPerYear: 30 }
    ]);
    setNewTypeName('');
    setNewTypeCode('');
    toast.success('تمت إضافة نوع الإجازة بنجاح');
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans" dir="rtl">
      <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border-r-4 border-teal-600">
        <h1 className="text-xl font-bold text-slate-800">تهيئة أنواع الإجازات وقواعد الاستحقاق</h1>
        <p className="text-xs text-slate-500">نظام Aysed S HR 2026 - تخصيص أنواع الإجازات وقواعد الخصم التلقائي</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* قائمة أنواع الإجازات */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-100 border-b border-slate-200 font-bold text-slate-700 text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#71639e]" />
            <span>أنواع الإجازات المعرفة في النظام</span>
          </div>
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b">
              <tr>
                <th className="p-3">اسم الإجازة</th>
                <th className="p-3">الكود البرمجي</th>
                <th className="p-3 text-center">الاستحقاق السنوي</th>
                <th className="p-3 text-center">تتطلب رصيد</th>
                <th className="p-3 text-center">بدون راتب</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leaveTypes.map(lt => (
                <tr key={lt.id} className="hover:bg-slate-50">
                  <td className="p-3 font-semibold text-slate-800">{lt.name}</td>
                  <td className="p-3 font-mono text-xs text-purple-700">{lt.code}</td>
                  <td className="p-3 text-center font-bold">{lt.daysPerYear} يوم</td>
                  <td className="p-3 text-center">
                    {lt.requiresAllocation ? <span className="text-emerald-600 font-bold">نعم</span> : <span className="text-slate-400">لا</span>}
                  </td>
                  <td className="p-3 text-center">
                    {lt.isUnpaid ? <span className="text-rose-600 font-bold">نعم</span> : <span className="text-slate-400">لا</span>}
                  </td>
                </tr>))}
            </tbody>
          </table>
        </div>

        {/* نموذج إضافة نوع إجازة جديد */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 h-fit">
          <h3 className="font-bold text-slate-800 text-sm mb-4 pb-2 border-b flex items-center gap-2">
            <CalendarPlus className="w-4 h-4 text-teal-600" />
            <span>إضافة نوع إجازة جديد</span>
          </h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">اسم الإجازة</label>
              <input
                type="text"
                value={newTypeName}
                onChange={e => setNewTypeName(e.target.value)}
                placeholder="مثال: إجازة مرافق مريض"
                className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">الكود (Code)</label>
              <input
                type="text"
                value={newTypeCode}
                onChange={e => setNewTypeCode(e.target.value)}
                placeholder="مثال: COMPANION"
                className="w-full border border-slate-300 rounded-lg p-2 text-sm font-mono uppercase focus:ring-2 focus:ring-teal-500 focus:outline-none"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>حفظ وإضافة</span>
            </button>
          </form>
        </div>
      </div>
    </div>);
};
