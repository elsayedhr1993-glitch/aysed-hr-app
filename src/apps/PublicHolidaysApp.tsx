import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  Calendar, Gift, Plus, CheckCircle2, 
  Clock, Download, Trash2, Search, UserCheck, RefreshCw, X 
} from 'lucide-react';

// ==========================================
// 1. قائمة العطلات الرسمية المعتمدة
// ==========================================
export const OFFICIAL_HOLIDAYS = [
  { id: 'h1', name: 'رأس السنة الميلادية', date: '2026-01-01', days: 1 },
  { id: 'h2', name: 'اليوم الوطني ويوم التحرير', date: '2026-02-25', days: 2 },
  { id: 'h3', name: 'ذكرى الإسراء والمعراج', date: '2026-02-16', days: 1 },
  { id: 'h4', name: 'عيد الفطر السعيد', date: '2026-03-20', days: 3 },
  { id: 'h5', name: 'وقفة عرفات وعيد الأضحى', date: '2026-05-26', days: 4 },
  { id: 'h6', name: 'رأس السنة الهجرية', date: '2026-06-16', days: 1 },
  { id: 'h7', name: 'المولد النبوي الشريف', date: '2026-08-25', days: 1 },
];

export const PublicHolidaysApp: React.FC<any> = (props) => {
  const [allocations, setAllocations] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  // نموذج التخصيص الجديد
  const [formData, setFormData] = useState({
    employeeId: '',
    holidayName: OFFICIAL_HOLIDAYS[0].name,
    holidayDate: OFFICIAL_HOLIDAYS[0].date,
    daysGranted: 1,
    compensationType: 'leave_balance', // 'leave_balance' أو 'payroll_cash'
    notes: ''
  });

  useEffect(() => {
    // جلب الموظفين المسجلين
    try {
      const raw = localStorage.getItem('employees') || localStorage.getItem('company_employees');
      
      if (props.employees && props.employees.length > 0) {
        setEmployees(props.employees);
      } else if (raw) {
        setEmployees(JSON.parse(raw));
      } else {
        setEmployees([
          { code: 'EMP-001', name: 'السيد بخيت السيد سويلم' },
          { code: 'EMP-002', name: 'د. أحمد محمود' },
          { code: 'EMP-003', name: 'مريم الصالح' }
        ]);
      }
    } catch (e) {}

    // جلب كشف سجلات بدل العطل السابقة
    const saved = localStorage.getItem('holiday_compensations_db');
    if (saved) {
      try { setAllocations(JSON.parse(saved)); } catch (e) {}
    }
  }, [props.employees]);

  const handleHolidaySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedName = e.target.value;
    const holiday = OFFICIAL_HOLIDAYS.find(h => h.name === selectedName);
    setFormData(prev => ({
      ...prev,
      holidayName: selectedName,
      holidayDate: holiday ? holiday.date : prev.holidayDate,
      daysGranted: holiday ? holiday.days : 1
    }));
  };

  const handleSaveAllocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId) {
      alert('يرجى اختيار الموظف المعني أولاً.');
      return;
    }

    const emp = employees.find(empItem => String(empItem.code || empItem.id) === formData.employeeId);
    const newRecord = {
      id: `HOL-ALLOC-${Date.now()}`,
      employeeId: formData.employeeId,
      employeeName: emp ? (emp.name || emp.arabicName || emp.fullNameAr) : `موظف (${formData.employeeId})`,
      holidayName: formData.holidayName,
      holidayDate: formData.holidayDate,
      daysGranted: Number(formData.daysGranted),
      consumedDays: 0,
      remainingDays: Number(formData.daysGranted),
      compensationType: formData.compensationType,
      status: formData.compensationType === 'payroll_cash' ? 'رحلت للراتب' : 'متاح بالرصيد',
      notes: formData.notes,
      createdAt: new Date().toISOString().split('T')[0]
    };

    const updated = [newRecord, ...allocations];
    setAllocations(updated);
    localStorage.setItem('holiday_compensations_db', JSON.stringify(updated));
    setShowModal(false);

    // تفريغ النموذج
    setFormData({
      employeeId: '',
      holidayName: OFFICIAL_HOLIDAYS[0].name,
      holidayDate: OFFICIAL_HOLIDAYS[0].date,
      daysGranted: 1,
      compensationType: 'leave_balance',
      notes: ''
    });

    alert('تم حفظ واعتماد تخصيص بدل العطلة بنجاح.');
  };

  const handleDelete = (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا السجل؟')) {
      const updated = allocations.filter(a => a.id !== id);
      setAllocations(updated);
      localStorage.setItem('holiday_compensations_db', JSON.stringify(updated));
    }
  };

  const exportExcel = () => {
    if (!allocations.length) {
      alert('لا توجد بيانات لتصديرها.');
      return;
    }
    const exportData = allocations.map(a => ({
      'كود الموظف': a.employeeId,
      'اسم الموظف': a.employeeName,
      'مناسبة العطلة الرسمية': a.holidayName,
      'تاريخ العطلة المستحقة': a.holidayDate,
      'الأيام الممنوحة': a.daysGranted,
      'المتبقي بالرصيد': a.remainingDays,
      'وجهة التعويض': a.compensationType === 'leave_balance' ? 'إضافة للرصيد السنوي' : 'بدل نقدي في الراتب',
      'الحالة': a.status,
      'تاريخ التسجيل': a.createdAt,
      'ملاحظات': a.notes
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "كشف_بدل_العطلات_الرسمية");
    XLSX.writeFile(wb, `كشف_بدل_العطلات_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const filteredAllocations = allocations.filter(a => {
    const matchesSearch = 
      (a.employeeId || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (a.employeeName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (a.holidayName || '').includes(searchTerm);
    
    if (filterType === 'leave_balance') return matchesSearch && a.compensationType === 'leave_balance';
    if (filterType === 'payroll_cash') return matchesSearch && a.compensationType === 'payroll_cash';
    return matchesSearch;
  });

  return (
    <div className="bg-[#f8fafc] p-6 text-slate-800 font-['Cairo',sans-serif]" dir="rtl">
      {/* الترويسة الرئيسية */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6 flex flex-wrap justify-between items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Gift size={22} /></span>
            <h1 className="text-xl font-bold text-slate-900">نظام إدارة العطلات الرسمية وبدل الدوام (معيار Odoo)</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-bold">توثيق مناسبات العطلات الرسمية، أيام الاستحقاق، وتوجيهها للرصيد أو لمسير الرواتب</p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={exportExcel}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition cursor-pointer"
          >
            <Download size={16} /> تصدير الكشف (Excel)
          </button>

          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition cursor-pointer"
          >
            <Plus size={16} /> إضافة بدل عطلة رسمية لموظف
          </button>
        </div>
      </div>

      {/* شريط الإحصائيات والأجندة السريعة */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-bold">إجمالي أيام البدل الممنوحة</p>
            <p className="text-2xl font-black text-slate-900 mt-1 font-mono">
              {allocations.reduce((sum, a) => sum + Number(a.daysGranted || 0), 0)} يوم
            </p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Calendar size={24} /></div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-bold">مرحّل لرصيد الإجازات السنوي</p>
            <p className="text-2xl font-black text-emerald-600 mt-1 font-mono">
              {allocations.filter(a => a.compensationType === 'leave_balance').reduce((sum, a) => sum + Number(a.daysGranted || 0), 0)} يوم
            </p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><CheckCircle2 size={24} /></div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-bold">محوّل لبدل نقدي (مع الراتب)</p>
            <p className="text-2xl font-black text-amber-600 mt-1 font-mono">
              {allocations.filter(a => a.compensationType === 'payroll_cash').reduce((sum, a) => sum + Number(a.daysGranted || 0), 0)} يوم
            </p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Clock size={24} /></div>
        </div>
      </div>

      {/* الفلترة والبحث */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          <button 
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${filterType === 'all' ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            كافة السجلات ({allocations.length})
          </button>
          <button 
            onClick={() => setFilterType('leave_balance')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${filterType === 'leave_balance' ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            المضاف للرصيد ({allocations.filter(a => a.compensationType === 'leave_balance').length})
          </button>
          <button 
            onClick={() => setFilterType('payroll_cash')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${filterType === 'payroll_cash' ? 'bg-amber-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            المحوّل لبدل نقدي ({allocations.filter(a => a.compensationType === 'payroll_cash').length})
          </button>
        </div>

        <div className="relative">
          <input 
            type="text" 
            placeholder="بحث بالموظف أو اسم العطلة..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64 pl-3 pr-9 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
          />
          <Search size={16} className="absolute right-3 top-2.5 text-slate-400" />
        </div>
      </div>

      {/* كشف جدول بدل العطلات */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto max-h-[50vh] odoo-scrollbar">
          <table className="w-full text-right text-xs table-auto">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10 shadow-xs">
              <tr>
                <th className="p-3.5">كود الموظف</th>
                <th className="p-3.5">اسم الموظف</th>
                <th className="p-3.5">مناسبة العطلة الرسمية</th>
                <th className="p-3.5 text-center">تاريخ العطلة</th>
                <th className="p-3.5 text-center">الأيام الممنوحة</th>
                <th className="p-3.5 text-center">وجهة التعويض</th>
                <th className="p-3.5 text-center">حالة البدل</th>
                <th className="p-3.5">ملاحظات</th>
                <th className="p-3.5 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredAllocations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-400 font-bold">
                    لا توجد سجلات بدل عطلات مسجلة حالياً.
                  </td>
                </tr>
              ) : (
                filteredAllocations.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3.5 font-bold text-slate-900 font-mono">{row.employeeId}</td>
                    <td className="p-3.5 font-bold text-indigo-900">{row.employeeName}</td>
                    <td className="p-3.5 text-slate-800 font-bold">{row.holidayName}</td>
                    <td className="p-3.5 text-slate-600 font-mono font-bold text-center">{row.holidayDate}</td>
                    <td className="p-3.5 font-bold text-indigo-950 font-mono text-center">{row.daysGranted} يوم</td>
                    <td className="p-3.5 text-center">
                      {row.compensationType === 'leave_balance' ? (
                        <span className="text-emerald-800 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200 text-[10px] font-bold inline-block">
                          إضافة للرصيد السنوي
                        </span>
                      ) : (
                        <span className="text-amber-800 bg-amber-50 px-2 py-1 rounded-md border border-amber-200 text-[10px] font-bold inline-block">
                          بدل نقدي في الراتب
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-[10px] font-bold inline-block">
                        {row.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-500 max-w-xs truncate font-bold text-[11px]">{row.notes || '-'}</td>
                    <td className="p-3.5 text-center">
                      <button 
                        onClick={() => handleDelete(row.id)}
                        className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                        title="حذف السجل"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* النافذة المنبثقة الذكية (Modal) - تخصيص بدل العطلة بأسلوب Odoo */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg"><Gift size={18} /></span>
                <h2 className="font-bold text-slate-900">تخصيص بدل عطلة رسمية لموظف</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveAllocation} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الموظف المستحق *</label>
                <select 
                  required
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                >
                  <option value="">-- اختر الموظف --</option>
                  {employees.map(emp => (
                    <option key={emp.code || emp.id} value={emp.code || emp.id}>
                      {emp.code || emp.id} - {emp.name || emp.arabicName || emp.fullNameAr}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">مناسبة العطلة الرسمية *</label>
                  <select 
                    value={formData.holidayName}
                    onChange={handleHolidaySelect}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                  >
                    {OFFICIAL_HOLIDAYS.map(h => (
                      <option key={h.id} value={h.name}>{h.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ العطلة الفعلي *</label>
                  <input 
                    type="date"
                    required
                    value={formData.holidayDate}
                    onChange={(e) => setFormData({ ...formData, holidayDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800 font-bold font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">عدد الأيام المستحقة *</label>
                  <input 
                    type="number"
                    min="1"
                    required
                    value={formData.daysGranted}
                    onChange={(e) => setFormData({ ...formData, daysGranted: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800 font-bold font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">طريقة توجيه البدل *</label>
                  <select 
                    value={formData.compensationType}
                    onChange={(e) => setFormData({ ...formData, compensationType: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                  >
                    <option value="leave_balance">إضافة لرصيد الإجازات السنوي</option>
                    <option value="payroll_cash">صرف كبدل مالي في مسير الرواتب</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">بيان / ملاحظات التدقيق</label>
                <textarea 
                  rows={2}
                  placeholder="مثال: تم التكليف بالعمل خلال عطلة العيد الوطني بناءً على طلب الإدارة..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow transition cursor-pointer"
                >
                  حفظ واعتماد التخصيص
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default PublicHolidaysApp;
