// src/components/HolidayWorkManagementView.tsx
import React, { useState, useEffect } from 'react';
import { 
  calculateHolidayCompensation, 
  approveHolidayWork, 
  saveHolidayWorkRecord, 
  deleteHolidayWorkRecord,
  getHolidayWorkRecords, 
  WorkOnHolidayRecord 
} from '../services/holidayWorkService';
import { CheckCircle2, Plus, Loader2, Award, CalendarCheck, Sparkles, Trash2, Edit3, X, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  employees: any[];
  activeCompanyId: string;
}

export const HolidayWorkManagementView: React.FC<Props> = ({ employees, activeCompanyId }) => {
  const [records, setRecords] = useState<WorkOnHolidayRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  // Deletion confirmation state
  const [deleteConfirmRecord, setDeleteConfirmRecord] = useState<WorkOnHolidayRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [employeeId, setEmployeeId] = useState(employees[0]?.id || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [holidayName, setHolidayName] = useState('عطلة رسمية');
  const [hoursWorked, setHoursWorked] = useState<number>(8);
  const [compensationType, setCompensationType] = useState<'pay' | 'day'>('day');
  const [autoApproveAndTransfer, setAutoApproveAndTransfer] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const data = await getHolidayWorkRecords(activeCompanyId);
      setRecords(data);
    } catch (e) {
      console.warn('fetchWorkOnHolidays error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    const handleUpdate = () => fetchRecords();
    window.addEventListener('manara_allocations_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('manara_allocations_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [activeCompanyId]);

  const handleOpenNewModal = () => {
    setEditingRecordId(null);
    if (employees.length > 0 && !employeeId) setEmployeeId(employees[0].id);
    setDate(new Date().toISOString().split('T')[0]);
    setHolidayName('عطلة رسمية');
    setHoursWorked(8);
    setCompensationType('day');
    setAutoApproveAndTransfer(true);
    setIsModalOpen(true);
  };

  const handleEditRecord = (rec: WorkOnHolidayRecord) => {
    setEditingRecordId(rec.id || null);
    setEmployeeId(rec.employeeId);
    setDate(rec.date || new Date().toISOString().split('T')[0]);
    setHolidayName(rec.holidayName || 'عطلة رسمية');
    setHoursWorked(rec.hoursWorked || 8);
    setCompensationType(rec.compensationType || 'day');
    setAutoApproveAndTransfer(rec.state === 'approved');
    setIsModalOpen(true);
  };

  const handleExecuteDelete = async () => {
    if (!deleteConfirmRecord || !deleteConfirmRecord.id) return;
    setDeleting(true);
    try {
      const res = await deleteHolidayWorkRecord(deleteConfirmRecord.id, deleteConfirmRecord.employeeId);
      if (res.success) {
        toast.success(res.message);
        // تحديث محلي فوري
        setRecords(prev => prev.filter(r => r.id !== deleteConfirmRecord.id));
        setDeleteConfirmRecord(null);
        if (isModalOpen && editingRecordId === deleteConfirmRecord.id) {
          setIsModalOpen(false);
          setEditingRecordId(null);
        }
        await fetchRecords();
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء الحذف');
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) {
      toast.error('يرجى اختيار الموظف');
      return;
    }
    setSubmitting(true);
    try {
      const selectedEmp = employees.find(e => e.id === employeeId);
      const basicWage = selectedEmp?.basicSalary || selectedEmp?.wage || 500;

      // If we are editing, first clean up old allocation associated with old record
      if (editingRecordId) {
        await deleteHolidayWorkRecord(editingRecordId, employeeId);
      }

      const newRec: WorkOnHolidayRecord = {
        id: editingRecordId || `hwr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        employeeId,
        companyId: activeCompanyId || 'comp-1',
        date,
        holidayName,
        hoursWorked: Number(hoursWorked),
        compensationType,
        state: autoApproveAndTransfer ? 'approved' : 'draft',
        createdAt: new Date().toISOString()
      };

      const saved = await saveHolidayWorkRecord(newRec);

      if (autoApproveAndTransfer) {
        const res = await approveHolidayWork(saved, basicWage);
        if (res.success) {
          toast.success(editingRecordId ? 'تم تعديل السجل وتحديث رصيد الإجازات بنجاح' : res.message);
        } else {
          toast.error(res.message);
        }
      } else {
        toast.success(editingRecordId ? 'تم تحديث السجل كمسودة بنجاح' : 'تم حفظ سجل العمل في العطلة كمسودة (بانتظار الاعتماد)');
      }

      setIsModalOpen(false);
      setEditingRecordId(null);
      await fetchRecords();
    } catch (err: any) {
      toast.error(err.message || 'فشل حفظ السجل');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (rec: WorkOnHolidayRecord) => {
    const emp = employees.find(e => e.id === rec.employeeId);
    const basicWage = emp?.basicSalary || emp?.wage || 500;

    const res = await approveHolidayWork(rec, basicWage);
    if (res.success) {
      toast.success(res.message);
      await fetchRecords();
    } else {
      toast.error(res.message);
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans" dir="rtl">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80 border-r-4 border-r-purple-700">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-800">إدارة العمل في العطلات والجمع (1.5x)</h1>
            <span className="bg-purple-100 text-purple-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-purple-200">
              قانون العمل الكويتي م 70
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            تسجيل وتعديل وحذف استحقاقات العمل أثناء العطلات الرسمية وترحيلها تلقائياً إلى رصيد الإجازات كأيام بديلة أو إلى مسير الرواتب.
          </p>
        </div>
        <button
          onClick={handleOpenNewModal}
          className="bg-purple-700 hover:bg-purple-800 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>تسجيل عمل في عطلة</span>
        </button>
      </div>

      {/* الجدول */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-purple-700" />
            <h3 className="text-sm font-bold text-slate-800">سجل استحقاقات العطلات والجمع</h3>
          </div>
          <span className="text-xs text-slate-500 font-mono bg-white px-2.5 py-1 rounded-lg border border-slate-200">
            إجمالي السجلات: {records.length}
          </span>
        </div>

        <table className="w-full text-right text-sm">
          <thead className="bg-slate-100/70 text-slate-700 border-b border-slate-200 text-xs">
            <tr>
              <th className="p-3.5 font-bold">الموظف</th>
              <th className="p-3.5 font-bold">المناسبة / العطلة</th>
              <th className="p-3.5 font-bold">التاريخ</th>
              <th className="p-3.5 font-bold text-center">ساعات العمل</th>
              <th className="p-3.5 font-bold text-center">نوع التعويض</th>
              <th className="p-3.5 font-bold text-center">الحالة</th>
              <th className="p-3.5 font-bold text-center">الإجراءات والترحيل</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.map((rec) => {
              const emp = employees.find(e => e.id === rec.employeeId);
              const basicWage = emp?.basicSalary || emp?.wage || 500;
              const calc = calculateHolidayCompensation(basicWage, rec.hoursWorked, rec.compensationType);

              return (
                <tr key={rec.id} className="hover:bg-purple-50/20 transition-colors">
                  <td className="p-3.5">
                    <div className="font-bold text-slate-800">{emp?.fullNameAr || emp?.name || 'موظف غير معروف'}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{emp?.employeeCode || emp?.civilId || ''}</div>
                  </td>
                  <td className="p-3.5 text-slate-700 font-medium">{rec.holidayName}</td>
                  <td className="p-3.5 text-slate-600 font-mono text-xs">{rec.date}</td>
                  <td className="p-3.5 text-center font-bold text-slate-800 font-mono">{rec.hoursWorked} س</td>
                  <td className="p-3.5 text-center">
                    {rec.compensationType === 'pay' ? (
                      <span className="bg-teal-50 border border-teal-200 text-teal-800 px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1">
                        <span>بدل نقدي (1.5x):</span>
                        <strong className="font-mono">{calc.cashPayableAmount} د.ك</strong>
                      </span>
                    ) : (
                      <span className="bg-purple-50 border border-purple-200 text-purple-800 px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-purple-600" />
                        <span>يوم بديل:</span>
                        <strong className="font-mono">{calc.compensatoryDaysAdded} يوم</strong>
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 text-center">
                    {rec.state === 'approved' ? (
                      <span className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 shadow-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>معتمد ومرحل للرصيد</span>
                      </span>
                    ) : (
                      <span className="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1">
                        <span>مسودة (غير مرحل)</span>
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {rec.state !== 'approved' && (
                        <button
                          onClick={() => handleApprove(rec)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg text-xs font-bold shadow-xs inline-flex items-center gap-1 cursor-pointer transition-all hover:scale-102"
                          title="اعتماد وترحيل للرصيد"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>اعتماد</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleEditRecord(rec)}
                        className="bg-slate-100 hover:bg-purple-50 text-slate-700 hover:text-purple-700 border border-slate-200 hover:border-purple-300 px-2.5 py-1 rounded-lg text-xs font-bold shadow-xs inline-flex items-center gap-1 cursor-pointer transition-all"
                        title="تعديل السجل"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>تعديل</span>
                      </button>
                      <button
                        onClick={() => setDeleteConfirmRecord(rec)}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-lg text-xs font-bold shadow-xs inline-flex items-center gap-1 cursor-pointer transition-all hover:scale-102"
                        title="حذف السجل وإلغاء الأيام المحتسبة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {records.length === 0 && !loading && (
          <div className="p-12 text-center text-slate-400 italic text-sm">
            لا توجد سجلات عمل في العطلات والجمع حالياً. اضغط على زر "تسجيل عمل في عطلة" لإضافة سجل جديد.
          </div>
        )}
      </div>

      {/* Confirmation Modal for Delete */}
      {deleteConfirmRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-rose-200 animate-in fade-in zoom-in-95 duration-150" dir="rtl">
            <div className="flex items-center gap-3 pb-3 mb-4 border-b border-slate-100">
              <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">تأكيد حذف سجل عمل العطلة</h3>
                <p className="text-xs text-slate-500">إلغاء الاستحقاق وحذف السجل من النظام</p>
              </div>
            </div>

            <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl space-y-2 mb-4 text-xs text-rose-950 leading-relaxed">
              <div className="font-semibold flex items-center gap-2">
                <span>الموظف:</span>
                <strong className="text-slate-900 font-bold">
                  {employees.find(e => e.id === deleteConfirmRecord.employeeId)?.fullNameAr || 'الموظف'}
                </strong>
              </div>
              <div className="flex items-center gap-2">
                <span>المناسبة:</span>
                <strong className="text-slate-900">{deleteConfirmRecord.holidayName}</strong>
                <span>بتاريخ:</span>
                <strong className="font-mono text-slate-900">{deleteConfirmRecord.date}</strong>
              </div>
              <div className="pt-2 border-t border-rose-200/80 text-[11px] text-rose-700">
                ⚠️ <strong>تنبيه:</strong> سيتم حذف هذا السجل وإلغاء اليوم التعويضي المضاف تلقائياً من رصيد إجازات الموظف وكشف حركة الأرصدة (FIFO Ledger) فوراً.
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleExecuteDelete}
                disabled={deleting}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>نعم، احذف السجل واليوم البديل</span>
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirmRecord(null)}
                disabled={deleting}
                className="px-4 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-sm font-bold cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal تسجيل وتعديل */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150" dir="rtl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-50 text-purple-700 rounded-lg">
                  {editingRecordId ? <Edit3 className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingRecordId ? 'تعديل سجل العمل في العطلة' : 'تسجيل عمل في عطلة رسمية / يوم الجمعة'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {editingRecordId ? 'تحديث البيانات وإعادة احتساب الرصيد المرتبط تلقائياً' : 'ترحيل الاستحقاق مباشرة إلى رصيد الموظف وفق قانون العمل'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => { setIsModalOpen(false); setEditingRecordId(null); }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">الموظف المستحق</label>
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                  required
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullNameAr || emp.name} ({emp.employeeCode || emp.civilId || 'كود'}) - {emp.jobTitle || 'موظف'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">تاريخ العمل بالعطلة</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">المناسبة / العطلة</label>
                  <input
                    type="text"
                    value={holidayName}
                    onChange={(e) => setHolidayName(e.target.value)}
                    placeholder="مثال: عطلة العيد، الجمعة"
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">ساعات العمل الفعلية</label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={hoursWorked}
                    onChange={(e) => setHoursWorked(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">نوع التعويض المستحق</label>
                  <select
                    value={compensationType}
                    onChange={(e) => setCompensationType(e.target.value as any)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-bold text-purple-900"
                  >
                    <option value="day">🎁 يوم إجازة بديل (يُضاف لرصيد الإجازات)</option>
                    <option value="pay">💵 بدل نقدي إضافي 1.5x (يُرحل لمسير الرواتب)</option>
                  </select>
                </div>
              </div>

              {/* خيار الاعتماد والترحيل المباشر */}
              <div className="p-3 bg-purple-50/80 rounded-xl border border-purple-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-purple-900 block">
                    اعتماد السجل وترحيل اليوم التعويضي فورياً
                  </span>
                  <span className="text-[11px] text-purple-700">
                    إدراج اليوم تلقائياً برصيد إجازات الموظف دون الحاجة لخطوة اعتماد لاحقة
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={autoApproveAndTransfer}
                  onChange={(e) => setAutoApproveAndTransfer(e.target.checked)}
                  className="w-4 h-4 accent-purple-700 cursor-pointer rounded"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-purple-700 hover:bg-purple-800 text-white py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{editingRecordId ? 'حفظ التعديلات' : 'حفظ وتسجيل الاستحقاق'}</span>
                </button>
                {editingRecordId && (
                  <button
                    type="button"
                    onClick={() => {
                      const rec = records.find(r => r.id === editingRecordId);
                      if (rec) setDeleteConfirmRecord(rec);
                    }}
                    className="px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); setEditingRecordId(null); }}
                  className="px-4 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-sm font-bold cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
