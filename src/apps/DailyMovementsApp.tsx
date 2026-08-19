import React, { useState } from 'react';
import { DailyMovement, Employee, Company, ViewMode } from '../types';
import { 
  Clock, Plus, CheckCircle2, XCircle, FileText, Search, 
  Trash2, DollarSign, Calendar, Edit3, ShieldCheck, Filter, AlertCircle 
} from 'lucide-react';

interface DailyMovementsAppProps {
  dailyMovements: DailyMovement[];
  employees: Employee[];
  activeCompany: Company;
  searchTerm: string;
  onSaveMovement: (movement: DailyMovement) => void;
  onUpdateMovementState: (id: string, state: 'draft' | 'approved' | 'refused') => void;
  onDeleteMovement: (id: string) => void;
}

export const DailyMovementsApp: React.FC<DailyMovementsAppProps> = ({
  dailyMovements = [],
  employees = [],
  activeCompany,
  searchTerm,
  onSaveMovement,
  onUpdateMovementState,
  onDeleteMovement,
}) => {
  const [editingMovement, setEditingMovement] = useState<Partial<DailyMovement> | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [stateFilter, setStateFilter] = useState<string>('ALL');
  const [localSearch, setLocalSearch] = useState<string>('');

  const companyEmployees = employees.filter(e => e.companyId === (activeCompany?.id || 'comp-1'));
  const companyMovements = dailyMovements.filter(m => m.companyId === (activeCompany?.id || 'comp-1'));
  const activeSearch = localSearch || searchTerm;

  const filteredMovements = companyMovements.filter(m => {
    const emp = employees.find(e => e.id === m.employeeId);
    const empName = emp ? emp.fullNameAr : '';
    const matchesSearch = empName.includes(activeSearch) || m.name.includes(activeSearch) || (m.notes && m.notes.includes(activeSearch));
    if (!matchesSearch) return false;
    if (typeFilter !== 'ALL' && m.movementType !== typeFilter) return false;
    if (stateFilter !== 'ALL' && m.state !== stateFilter) return false;
    return true;
  });

  const handleSave = () => {
    if (!editingMovement) return;
    if (!editingMovement.employeeId) {
      alert('يرجى اختيار الموظف أولاً');
      return;
    }
    if (!editingMovement.date) {
      alert('يرجى تحديد تاريخ الحركة');
      return;
    }
    const movementType = editingMovement.movementType || 'permission';
    let totalHours = editingMovement.totalHours || 0;
    if (movementType === 'permission' && editingMovement.hourFrom !== undefined && editingMovement.hourTo !== undefined) {
      totalHours = Math.max(0, Number(editingMovement.hourTo) - Number(editingMovement.hourFrom));
    }

    const newMov: DailyMovement = {
      id: editingMovement.id || `mov-${Date.now()}`,
      name: editingMovement.name || `MOV/${new Date().getFullYear()}/${String(Math.floor(Math.random() * 90000) + 10000)}`,
      employeeId: editingMovement.employeeId,
      companyId: activeCompany?.id || 'comp-1',
      date: editingMovement.date || new Date().toISOString().split('T')[0],
      movementType: movementType,
      hourFrom: editingMovement.hourFrom,
      hourTo: editingMovement.hourTo,
      totalHours: totalHours,
      amount: editingMovement.amount || 0,
      state: editingMovement.state || 'draft',
      createdAt: editingMovement.createdAt || new Date().toISOString().split('T')[0],
      notes: editingMovement.notes || '',
    };

    onSaveMovement(newMov);
    setEditingMovement(null);
  };

  return (
    <div className="p-6 bg-[#f8fafc] min-h-screen text-slate-800" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Clock className="w-6 h-6 text-[#714B67]" />
            <span>سجل الحركة اليومية للموظفين (Hr Daily Movement)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            إدارة استئذان الساعات، الإجازات المرضية اليومية، والبدلات النقدية مع الاعتماد والترحيل المالي
          </p>
        </div>

        <button
          onClick={() => {
            setEditingMovement({
              companyId: activeCompany?.id || 'comp-1',
              movementType: 'permission',
              date: new Date().toISOString().split('T')[0],
              state: 'draft',
              hourFrom: 8,
              hourTo: 10,
              totalHours: 2,
              amount: 0,
            });
          }}
          className="bg-[#714B67] hover:bg-[#5a3b52] text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-sm flex items-center gap-2 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>حركة يومية جديدة</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="font-bold text-[#714B67] flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> الفلاتر:
          </span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold"
          >
            <option value="ALL">جميع أنواع الحركات</option>
            <option value="permission">استئذان (ساعات)</option>
            <option value="sick">مرضية (يوم كامل)</option>
            <option value="allowance">بدل نقدي (يومي)</option>
            <option value="other">أخرى</option>
          </select>

          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold"
          >
            <option value="ALL">جميع الحالات</option>
            <option value="draft">مسودة</option>
            <option value="approved">معتمد</option>
            <option value="refused">مرفوض</option>
          </select>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="بحث برقم الحركة أو اسم الموظف..."
            className="w-full bg-white border border-slate-300 rounded-lg pr-9 pl-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-[#714B67]"
          />
        </div>
      </div>

      {/* Table (Odoo Zebra System) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-right text-xs">
          <thead className="bg-[#714B67] text-white font-bold">
            <tr>
              <th className="p-3">رقم الحركة</th>
              <th className="p-3">الموظف</th>
              <th className="p-3">التاريخ</th>
              <th className="p-3">نوع الحركة</th>
              <th className="p-3 text-center">التفاصيل الزمنية / القيمة</th>
              <th className="p-3 text-center">الحالة</th>
              <th className="p-3 text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredMovements.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500 font-bold">
                  لا توجد حركات يومية مسجلة حالياً
                </td>
              </tr>
            ) : (
              filteredMovements.map((m, idx) => {
                const emp = employees.find(e => e.id === m.employeeId);
                return (
                  <tr key={m.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                    <td className="p-3 font-mono font-bold text-[#714B67]">{m.name}</td>
                    <td className="p-3 font-bold text-slate-900">{emp ? emp.fullNameAr : 'مجهول'}</td>
                    <td className="p-3 font-mono text-slate-600">{m.date}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        m.movementType === 'permission' ? 'bg-purple-100 text-purple-900' :
                        m.movementType === 'sick' ? 'bg-amber-100 text-amber-900' :
                        m.movementType === 'allowance' ? 'bg-emerald-100 text-emerald-900' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {m.movementType === 'permission' ? 'استئذان (ساعات)' :
                         m.movementType === 'sick' ? 'مرضية (يوم كامل)' :
                         m.movementType === 'allowance' ? 'بدل نقدي (يومي)' : 'أخرى'}
                      </span>
                    </td>
                    <td className="p-3 text-center font-mono">
                      {m.movementType === 'permission' ? (
                        <span className="text-purple-900 font-bold">
                          من {m.hourFrom} إلى {m.hourTo} ({m.totalHours || 0} ساعة)
                        </span>
                      ) : m.movementType === 'allowance' ? (
                        <span className="text-emerald-700 font-bold">
                          {(m.amount || 0).toFixed(3)} د.ك
                        </span>
                      ) : (
                        <span className="text-slate-600">يوم كامل</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
                        m.state === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                        m.state === 'refused' ? 'bg-rose-100 text-rose-800' :
                        'bg-slate-200 text-slate-700'
                      }`}>
                        {m.state === 'approved' ? 'معتمد' : m.state === 'refused' ? 'مرفوض' : 'مسودة'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {m.state === 'draft' && (
                          <button
                            onClick={() => onUpdateMovementState(m.id, 'approved')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>اعتماد</span>
                          </button>
                        )}
                        {m.state === 'approved' && (
                          <button
                            onClick={() => onUpdateMovementState(m.id, 'refused')}
                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded text-[11px] font-bold transition cursor-pointer"
                          >
                            إلغاء الاعتماد
                          </button>
                        )}
                        <button
                          onClick={() => setEditingMovement(m)}
                          className="p-1 text-slate-400 hover:text-[#714B67] transition cursor-pointer"
                          title="تعديل"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteMovement(m.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal */}
      {editingMovement && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full border border-slate-300 overflow-hidden">
            <header className="p-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#714B67]" />
                <span>{editingMovement.id ? 'تعديل الحركة اليومية' : 'إضافة حركة يومية جديدة'}</span>
              </h3>
              <button onClick={() => setEditingMovement(null)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">×</button>
            </header>
            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">الموظف *</label>
                <select
                  value={editingMovement.employeeId || ''}
                  onChange={e => setEditingMovement({ ...editingMovement, employeeId: e.target.value })}
                  className="w-full border border-slate-300 rounded p-2 text-xs font-bold bg-white"
                >
                  <option value="">-- اختر الموظف --</option>
                  {companyEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.fullNameAr} ({emp.jobTitle})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">تاريخ الحركة *</label>
                  <input
                    type="date"
                    value={editingMovement.date || ''}
                    onChange={e => setEditingMovement({ ...editingMovement, date: e.target.value })}
                    className="w-full border border-slate-300 rounded p-2 text-xs font-mono bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">نوع الحركة *</label>
                  <select
                    value={editingMovement.movementType || 'permission'}
                    onChange={e => setEditingMovement({ ...editingMovement, movementType: e.target.value as any })}
                    className="w-full border border-slate-300 rounded p-2 text-xs font-bold bg-white"
                  >
                    <option value="permission">استئذان (ساعات)</option>
                    <option value="sick">مرضية (يوم كامل)</option>
                    <option value="allowance">بدل نقدي (يومي)</option>
                    <option value="other">أخرى</option>
                  </select>
                </div>
              </div>

              {editingMovement.movementType === 'permission' && (
                <div className="grid grid-cols-2 gap-4 bg-purple-50/50 p-3 rounded-lg border border-purple-200">
                  <div>
                    <label className="block font-bold text-purple-900 mb-1">من ساعة (مثلاً 8)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={editingMovement.hourFrom ?? 8}
                      onChange={e => {
                        const val = parseFloat(e.target.value) || 0;
                        const to = editingMovement.hourTo ?? 10;
                        setEditingMovement({ ...editingMovement, hourFrom: val, totalHours: Math.max(0, to - val) });
                      }}
                      className="w-full border border-purple-300 rounded p-2 text-xs font-mono bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-purple-900 mb-1">إلى ساعة (مثلاً 10)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={editingMovement.hourTo ?? 10}
                      onChange={e => {
                        const val = parseFloat(e.target.value) || 0;
                        const from = editingMovement.hourFrom ?? 8;
                        setEditingMovement({ ...editingMovement, hourTo: val, totalHours: Math.max(0, val - from) });
                      }}
                      className="w-full border border-purple-300 rounded p-2 text-xs font-mono bg-white"
                    />
                  </div>
                </div>
              )}

              {editingMovement.movementType === 'allowance' && (
                <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-200">
                  <label className="block font-bold text-emerald-900 mb-1">قيمة البدل النقدي (د.ك)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={editingMovement.amount ?? 0}
                    onChange={e => setEditingMovement({ ...editingMovement, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-emerald-300 rounded p-2 text-xs font-mono bg-white"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">ملاحظات / بيان الحركة</label>
                <textarea
                  rows={3}
                  value={editingMovement.notes || ''}
                  onChange={e => setEditingMovement({ ...editingMovement, notes: e.target.value })}
                  className="w-full border border-slate-300 rounded p-2 text-xs bg-white"
                  placeholder="أدخل تفاصيل إضافية عن الحركة..."
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  onClick={() => setEditingMovement(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-[#714B67] hover:bg-[#5a3b52] text-white font-bold rounded cursor-pointer"
                >
                  حفظ الحركة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
