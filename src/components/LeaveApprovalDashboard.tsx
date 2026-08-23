// components/LeaveApprovalDashboard.tsx
import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { onLeaveValidate } from '../services/leaveSettlementService';
import { CheckCircle, XCircle, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';

interface LeaveRequest {
  id: string;
  employee_name: string;
  employee_id: string;
  number_of_days: number;
  request_date_from: string;
  state: string;
  aysed_leave_balance: number;
}

export const LeaveApprovalDashboard: React.FC = () => {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // 1. جلب طلبات الإجازة المعلقة
  const fetchPendingLeaves = async () => {
    if (!isSupabaseConfigured) {
      return;
    }
    try {
      const { data, error } = await supabase
        .from('hr_leaves')
        .select(`
          id, 
          number_of_days, 
          request_date_from, 
          state,
          employee:hr_employee ( id, name, remaining_leaves )
        `)
        .eq('state', 'confirm');

      if (error) {
        console.warn('خطأ في جلب طلبات الإجازة:', error.message);
        return;
      }

      if (data) {
        const formatted: LeaveRequest[] = data.map((l: any) => ({
          id: l.id,
          employee_name: l.employee?.name || 'غير محدد',
          employee_id: l.employee?.id,
          number_of_days: Number(l.number_of_days) || 0,
          request_date_from: l.request_date_from,
          state: l.state,
          aysed_leave_balance: Number(l.employee?.remaining_leaves) || 0,
        }));
        setLeaves(formatted);
      }
    } catch (e) {
      console.warn('Supabase fetchPendingLeaves error:', e);
    }
  };

  useEffect(() => {
    fetchPendingLeaves();
  }, []);

  // 2. محرك الاعتماد والخصم التلقائي
  const handleApprove = async (leave: LeaveRequest) => {
    setLoadingId(leave.id);
    try {
      const result = await onLeaveValidate({
        employeeId: leave.employee_id,
        leaveId: leave.id,
        requestedDays: leave.number_of_days,
      });

      if (result.status === 'success') {
        setNotification({ msg: result.message, type: 'success' });
        setLeaves((prev) => prev.filter((item) => item.id !== leave.id));
      } else {
        throw new Error(result.message);
      }
    } catch (err: any) {
      setNotification({
        msg: err.message || 'فشل الاعتماد: تعذر تحديث الأرصدة',
        type: 'error',
      });
    } finally {
      setLoadingId(null);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  // 3. رفض الإجازة
  const handleReject = async (leaveId: string) => {
    try {
      const { error } = await supabase
        .from('hr_leaves')
        .update({ state: 'refuse' })
        .eq('id', leaveId);

      if (!error) {
        setNotification({ msg: 'تم رفض طلب الإجازة بنجاح', type: 'success' });
        setLeaves((prev) => prev.filter((item) => item.id !== leaveId));
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (e) {
      console.warn('Reject error:', e);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans" dir="rtl">
      {/* الترويسة - نمط Odoo Enterprise */}
      <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-lg shadow-sm border-r-4 border-purple-700">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">اعتماد الإجازات والخصم الآلي</h1>
          <p className="text-sm text-gray-500">نظام Aysed S HR 2026 - لوحة المالك والمدير</p>
        </div>
        <div className="flex gap-4">
          <div className="text-center px-4 border-l border-gray-200">
            <span className="block text-xl font-bold text-purple-700">{leaves.length}</span>
            <span className="text-xs text-gray-400">طلبات معلقة</span>
          </div>
        </div>
      </div>

      {/* التنبيهات (Toast Notifications) */}
      {notification && (
        <div
          className={`fixed top-5 left-5 p-4 rounded-md shadow-lg flex items-center gap-3 z-50 transition-all ${
            notification.type === 'success' ? 'bg-teal-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {notification.type === 'success' ? <ShieldCheck size={20} /> : <AlertCircle size={20} />}
          <span className="text-sm font-medium">{notification.msg}</span>
        </div>)}

      {/* جدول الطلبات */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
        <table className="w-full text-right">
          <thead className="bg-gray-50 border-b border-gray-200 text-purple-900 text-sm">
            <tr>
              <th className="p-4 font-semibold">الموظف</th>
              <th className="p-4 font-semibold text-center">المدة</th>
              <th className="p-4 font-semibold">تاريخ البداية</th>
              <th className="p-4 font-semibold">الرصيد المتاح</th>
              <th className="p-4 font-semibold text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {leaves.map((leave) => (
              <tr key={leave.id} className="hover:bg-purple-50/40 transition-colors">
                <td className="p-4 font-medium text-gray-800">{leave.employee_name}</td>
                <td className="p-4 text-center">
                  <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-bold">
                    {leave.number_of_days} يوم
                  </span>
                </td>
                <td className="p-4 text-gray-600 text-xs font-mono">{leave.request_date_from}</td>
                <td className="p-4 text-sm font-bold text-teal-700">{leave.aysed_leave_balance} يوم</td>
                <td className="p-4 flex justify-center gap-3">
                  <button
                    onClick={() => handleApprove(leave)}
                    disabled={loadingId === leave.id}
                    className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-1.5 rounded-md flex items-center gap-2 text-xs font-semibold transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {loadingId === leave.id ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle size={14} />}
                    اعتماد (Approve)
                  </button>
                  <button
                    onClick={() => handleReject(leave.id)}
                    className="text-gray-400 hover:text-red-600 transition-colors p-1 cursor-pointer"
                    title="رفض الطلب"
                  >
                    <XCircle size={18} />
                  </button>
                </td>
              </tr>))}
          </tbody>
        </table>

        {leaves.length === 0 && (
          <div className="p-10 text-center text-gray-400 italic text-sm">
            لا توجد طلبات إجازة بانتظار الاعتماد حالياً.
          </div>)}
      </div>
    </div>);
};
