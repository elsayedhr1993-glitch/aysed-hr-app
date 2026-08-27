import React, { useState } from 'react';
import { Contract, Employee, Company, ViewMode } from '../types';
import { formatKWD } from '../utils/kuwaitLaw';
import { FileSignature, Plus, CheckCircle, ShieldAlert, Edit2, Trash2, User, CreditCard, RotateCcw, FileText, ArrowLeftRight } from 'lucide-react';

interface ContractsAppProps {
  contracts: Contract[];
  employees: Employee[];
  activeCompany: Company;
  viewMode: ViewMode;
  searchTerm: string;
  filterTab: string;
  onSaveContract: (contract: Contract) => void;
  onDeleteContract: (contractId: string) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onNavigateToApp?: (app: any) => void;
}

export const ContractsApp: React.FC<ContractsAppProps> = ({
  contracts,
  employees,
  activeCompany,
  viewMode,
  searchTerm,
  filterTab,
  onSaveContract,
  onDeleteContract,
  onViewModeChange,
  onNavigateToApp,
}) => {
  const [editingContract, setEditingContract] = useState<Partial<Contract> | null>(null);

  const companyContracts = (contracts || []).filter(c => c.companyId === (activeCompany?.id || 'comp-1'));
  const filteredContracts = companyContracts.filter(cnt => {
    const emp = employees.find(e => e.id === cnt.employeeId);
    const empName = emp ? emp.fullNameAr : '';
    const matchesSearch = empName.includes(searchTerm) || cnt.id.includes(searchTerm);

    if (!matchesSearch) return false;

    if (filterTab === 'RUNNING') return cnt.status === 'RUNNING';
    if (filterTab === 'INDEFINITE') return cnt.contractType === 'INDEFINITE';
    if (filterTab === 'FIXED_TERM') return cnt.contractType === 'FIXED_TERM';
    return true;
  });

  const handleSave = () => {
    if (!editingContract?.employeeId || !editingContract?.basicSalary) {
      alert('يرجى اختيار الموظف وإدخال الراتب الأساسي');
      return;
    }

    // Determine custom/explicitly specified daily hours
    // Priority: customDailyHours > custom_daily_hours > dailyWorkHours > plannedDailyHours > 8
    const rawHours = editingContract.customDailyHours ?? editingContract.custom_daily_hours ?? editingContract.dailyWorkHours ?? editingContract.plannedDailyHours;
    const finalDailyHours = (rawHours !== undefined && rawHours !== null && !isNaN(Number(rawHours)) && Number(rawHours) > 0)
      ? Number(rawHours)
      : 8;

    const finalWeeklyHours = editingContract.workingHoursPerWeek && Number(editingContract.workingHoursPerWeek) > 0
      ? Number(editingContract.workingHoursPerWeek)
      : Math.round(finalDailyHours * 6);

    const newContract: Contract = {
      id: editingContract.id || `cnt-${Date.now()}`,
      employeeId: editingContract.employeeId,
      companyId: activeCompany?.id || 'comp-1',
      basicSalary: Number(editingContract.basicSalary) || 0,
      housingAllowance: Number(editingContract.housingAllowance) || 0,
      transportAllowance: Number(editingContract.transportAllowance) || 0,
      otherAllowance: Number(editingContract.otherAllowance) || 0,
      contractType: editingContract.contractType || 'INDEFINITE',
      startDate: editingContract.startDate || new Date().toISOString().split('T')[0],
      endDate: editingContract.contractType === 'FIXED_TERM' ? editingContract.endDate : undefined,
      noticePeriodDays: Number(editingContract.noticePeriodDays) || 90,
      status: editingContract.status || 'RUNNING',
      resourceCalendarId: editingContract.resourceCalendarId || 'cal-std-8h-6d',
      workingSchedule: editingContract.workingSchedule || 'الدوام الصباحي القياسي 8 ساعات (08:00 - 16:00)',
      workHoursType: editingContract.workHoursType || 'STANDARD',
      workingHoursPerWeek: finalWeeklyHours,
      dailyWorkHours: finalDailyHours,
      customDailyHours: finalDailyHours,
      custom_daily_hours: finalDailyHours,
      plannedDailyHours: finalDailyHours,
    };

    onSaveContract(newContract);
    setEditingContract(null);
  };

  return (
    <div className="p-6 bg-transparent min-h-[calc(100vh-3rem)]">
      {/* Top Header */}
      <div className="flex justify-between items-center mb-6 w-full pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <span>عقود عمل الموظفين Odoo Contracts</span>
            <span className="text-xs bg-teal-700 text-white px-2 py-0.5 rounded-full font-mono">
              {filteredContracts.length} عقد
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            إدارة العقود المحددة وغير المحددة، والبدلات السكنية والمواصلات وفق قانون الشؤون
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Switcher Toggle */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => onViewModeChange('KANBAN')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'KANBAN'
                  ? 'bg-[#714B67] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>كانبان / بطاقات</span>
            </button>
            <button
              onClick={() => onViewModeChange('LIST')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'LIST'
                  ? 'bg-[#714B67] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>قائمة / جدول</span>
            </button>
          </div>

          <button
            onClick={() => {
              setEditingContract({
                companyId: activeCompany?.id || 'comp-1',
                contractType: 'INDEFINITE',
                noticePeriodDays: 90,
                basicSalary: 800,
                housingAllowance: 150,
                status: 'RUNNING',
              });
            }}
            className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-4 py-2 rounded shadow flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>إنشاء عقد جديد</span>
          </button>
        </div>
      </div>

      {/* Contracts Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-right text-xs">
          <thead className="bg-[#714B67] text-white font-bold">
            <tr>
              <th className="p-3">رمز العقد</th>
              <th className="p-3">اسم الموظف</th>
              <th className="p-3">نوع العقد</th>
              <th className="p-3">الراتب الأساسي (KWD)</th>
              <th className="p-3">إجمالي البدلات</th>
              <th className="p-3">الراتب الإجمالي</th>
              <th className="p-3">ساعات العمل</th>
              <th className="p-3">تاريخ البداية</th>
              <th className="p-3">فترة الإخطار</th>
              <th className="p-3 text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredContracts.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-slate-500">
                  <p className="font-bold mb-1">لا توجد عقود عمل مسجلة حالياً</p>
                  <p className="text-[11px] text-slate-400 mb-3">اضغط على زر "إنشاء عقد جديد" لربط الموظف بعقد عمل قانوني معتمد</p>
                  <button
                    onClick={() => {
                      setEditingContract({
                        companyId: activeCompany?.id || 'comp-1',
                        contractType: 'INDEFINITE',
                        noticePeriodDays: 90,
                        basicSalary: 800,
                        housingAllowance: 150,
                        status: 'RUNNING',
                      });
                    }}
                    className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-4 py-2 rounded shadow transition"
                  >
                    إنشاء أول عقد
                  </button>
                </td>
              </tr>) : (
              filteredContracts.map((cnt, index) => {

              const emp = employees.find(e => e.id === cnt.employeeId);
              const totalAllowances = cnt.housingAllowance + cnt.transportAllowance + cnt.otherAllowance;
              const grossSalary = cnt.basicSalary + totalAllowances;

              return (
                <tr key={cnt.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                  <td className="p-3 font-mono font-bold text-slate-600">{cnt.id}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900">{emp ? emp.fullNameAr : 'غير معرف'}</span>
                      {emp && onNavigateToApp && (
                        <button
                          type="button"
                          onClick={() => onNavigateToApp('EMPLOYEES')}
                          className="text-purple-600 hover:text-purple-800 hover:bg-purple-50 p-0.5 rounded transition text-[10px] flex items-center gap-0.5"
                          title="عرض ملف الموظف"
                        >
                          <User className="w-3 h-3" />
                        </button>)}
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      cnt.contractType === 'INDEFINITE' ? 'bg-teal-100 text-teal-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {cnt.contractType === 'INDEFINITE' ? 'غير محدد المدة' : 'محدد المدة'}
                    </span>
                  </td>
                  <td className="p-3 font-mono font-bold text-slate-800 dir-ltr">{formatKWD(cnt.basicSalary)}</td>
                  <td className="p-3 font-mono text-slate-600 dir-ltr">{formatKWD(totalAllowances)}</td>
                  <td className="p-3 font-mono font-extrabold text-emerald-700 dir-ltr">{formatKWD(grossSalary)}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800">
                      {cnt.customDailyHours || cnt.custom_daily_hours || cnt.dailyWorkHours || cnt.plannedDailyHours || 8} س/يوم
                    </span>
                  </td>
                  <td className="p-3 font-mono">{cnt.startDate}</td>
                  <td className="p-3">{cnt.noticePeriodDays} يوماً</td>
                  <td className="p-3 text-center space-x-1 space-x-reverse">
                    <button
                      onClick={() => setEditingContract(cnt)}
                      className="p-1 text-slate-600 hover:text-teal-700 rounded hover:bg-slate-200"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteContract(cnt.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-200"
                      title="حذف العقد"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>);
            }))}
          </tbody>
        </table>
      </div>

      {/* Contract Edit Modal */}
      {editingContract && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 border border-slate-200 text-xs">
            <div className="flex items-center justify-between mb-4 pb-2 border-b">
              <h3 className="font-extrabold text-slate-900 text-base">
                {editingContract.id ? 'تعديل عقد العمل' : 'إنشاء عقد عمل جديد'}
              </h3>
              {onNavigateToApp && editingContract.employeeId && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingContract(null);
                      onNavigateToApp('PAYROLL');
                    }}
                    className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded text-[11px] font-bold transition"
                    title="الانتقال إلى مسير الرواتب"
                  >
                    <CreditCard className="w-3 h-3" />
                    <span>الراتب</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingContract(null);
                      onNavigateToApp('EOS');
                    }}
                    className="flex items-center gap-1 px-2 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded text-[11px] font-bold transition"
                    title="الانتقال إلى حاسبة نهاية الخدمة"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>نهاية الخدمة</span>
                  </button>
                </div>)}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">اختر الموظف *</label>
                <select
                  value={editingContract.employeeId || ''}
                  onChange={(e) => {
                    setEditingContract({ 
                      ...editingContract, 
                      employeeId: e.target.value
                    });
                  }}
                  className="w-full border border-slate-300 rounded p-2 outline-none"
                >
                  <option value="">-- اختر الموظف --</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.fullNameAr} ({e.civilId})</option>))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">نوع العقد القانوني</label>
                <select
                  value={editingContract.contractType || 'INDEFINITE'}
                  onChange={(e) => setEditingContract({ ...editingContract, contractType: e.target.value as any })}
                  className="w-full border border-slate-300 rounded p-2 outline-none"
                >
                  <option value="INDEFINITE">عقد غير محدد المدة (Indefinite)</option>
                  <option value="FIXED_TERM">عقد محدد المدة (Fixed Term)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">الراتب الأساسي (Basic Salary KWD) *</label>
                <input
                  type="number"
                  step="0.001"
                  value={editingContract.basicSalary || 0}
                  onChange={(e) => setEditingContract({ ...editingContract, basicSalary: parseFloat(e.target.value) })}
                  className="w-full border border-slate-300 rounded p-2 font-mono outline-none dir-ltr"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">بدل السكن (Housing KWD)</label>
                <input
                  type="number"
                  step="0.001"
                  value={editingContract.housingAllowance || 0}
                  onChange={(e) => setEditingContract({ ...editingContract, housingAllowance: parseFloat(e.target.value) })}
                  className="w-full border border-slate-300 rounded p-2 font-mono outline-none dir-ltr"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">بدل الانتقال (Transport KWD)</label>
                <input
                  type="number"
                  step="0.001"
                  value={editingContract.transportAllowance || 0}
                  onChange={(e) => setEditingContract({ ...editingContract, transportAllowance: parseFloat(e.target.value) })}
                  className="w-full border border-slate-300 rounded p-2 font-mono outline-none dir-ltr"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">بدلات أخرى (Other Allowances KWD)</label>
                <input
                  type="number"
                  step="0.001"
                  value={editingContract.otherAllowance || 0}
                  onChange={(e) => setEditingContract({ ...editingContract, otherAllowance: parseFloat(e.target.value) })}
                  className="w-full border border-slate-300 rounded p-2 font-mono outline-none dir-ltr"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">تاريخ بدء العقد</label>
                <input
                  type="date"
                  value={editingContract.startDate || ''}
                  onChange={(e) => setEditingContract({ ...editingContract, startDate: e.target.value })}
                  className="w-full border border-slate-300 rounded p-2 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">فترة الإخطار (Notice Period Days)</label>
                <input
                  type="number"
                  value={editingContract.noticePeriodDays || 90}
                  onChange={(e) => setEditingContract({ ...editingContract, noticePeriodDays: parseInt(e.target.value, 10) })}
                  className="w-full border border-slate-300 rounded p-2 outline-none"
                />
              </div>

              {/* تفاصيل الدوام وجدول العمل */}
              <div className="col-span-1 md:col-span-2 bg-purple-50/70 p-3.5 rounded-xl border border-purple-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#714B67]">تفاصيل الدوام وجدول ساعات العمل (Working Schedule & Hours)</span>
                  <span className="text-[10px] text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full font-bold">
                    ساعات العقد المخصصة لها الأولوية القصوى
                  </span>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-[11px]">جدول / قالب الدوام المعتمد بالعقد</label>
                  <select
                    value={editingContract.resourceCalendarId || 'cal-std-8h-6d'}
                    onChange={(e) => {
                      const val = e.target.value;
                      const schedName = 
                        val === 'cal-std-8h-6d' ? 'دوام صباحي قياسي (8 ساعات): 08:00 - 16:00 (السبت - الخميس)' :
                        val === 'cal-eve-8h-6d' ? 'دوام مسائي قياسي (8 ساعات): 16:00 - 00:00 (السبت - الخميس)' :
                        val === 'cal-split-shifts' ? 'دوام الفترتين المقسم (Split Shift): 09:00 - 13:00 و 17:00 - 21:00' :
                        val === 'cal-std-8h-5d' ? 'دوام مكتبي (5 أيام - 40 ساعة): 08:00 - 16:00 (الأحد - الخميس)' :
                        val === 'cal-part-time-4h' ? 'دوام جزئي (4 ساعات)' : 'دوام مرن (8 ساعات)';
                      const wType = 
                        val === 'cal-split-shifts' ? 'SHIFT' :
                        val === 'cal-part-time-4h' ? 'PART_TIME' :
                        val === 'cal-flexible-8h' ? 'FLEXIBLE' : 'STANDARD';
                      
                      // Keep customDailyHours if already set by user; do NOT overwrite custom hours
                      setEditingContract(prev => prev ? ({
                        ...prev,
                        resourceCalendarId: val,
                        workingSchedule: schedName,
                        workHoursType: wType
                      }) : null);
                    }}
                    className="w-full border border-purple-300 rounded p-2 text-xs font-bold text-slate-800 bg-white outline-none"
                  >
                    <option value="cal-std-8h-6d">دوام صباحي قياسي (8 ساعات): 08:00 - 16:00 (السبت - الخميس)</option>
                    <option value="cal-eve-8h-6d">دوام مسائي قياسي (8 ساعات): 16:00 - 00:00 (السبت - الخميس)</option>
                    <option value="cal-split-shifts">دوام الفترتين المقسم (Split Shift): 09:00 - 13:00 و 17:00 - 21:00</option>
                    <option value="cal-std-8h-5d">دوام مكتبي (5 أيام - 40 ساعة): 08:00 - 16:00 (الأحد - الخميس)</option>
                    <option value="cal-part-time-4h">دوام جزئي (4 ساعات)</option>
                    <option value="cal-flexible-8h">دوام مرن (8 ساعات)</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                      ساعات العمل اليومية المعتمدة بالعقد (Daily Work Hours) *
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="24"
                        step="0.5"
                        value={editingContract.customDailyHours ?? editingContract.dailyWorkHours ?? editingContract.plannedDailyHours ?? 8}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setEditingContract(prev => prev ? ({
                            ...prev,
                            dailyWorkHours: val,
                            customDailyHours: val,
                            custom_daily_hours: val,
                            plannedDailyHours: val,
                            workingHoursPerWeek: Math.round(val * 6)
                          }) : null);
                        }}
                        placeholder="مثلاً 10 ساعات"
                        className="w-full border border-purple-300 rounded p-2 text-xs font-bold text-slate-800 bg-white outline-none font-mono focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                      />
                      <span className="text-xs font-bold text-slate-600 shrink-0">ساعة/يوم</span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                      ساعات العمل الأسبوعية (Weekly Hours)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="168"
                        value={editingContract.workingHoursPerWeek || Math.round(((editingContract.customDailyHours ?? editingContract.dailyWorkHours ?? 8) as number) * 6)}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setEditingContract(prev => prev ? ({
                            ...prev,
                            workingHoursPerWeek: val
                          }) : null);
                        }}
                        className="w-full border border-purple-300 rounded p-2 text-xs font-bold text-slate-800 bg-white outline-none font-mono"
                      />
                      <span className="text-xs font-bold text-slate-600 shrink-0">ساعة/أسبوع</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                onClick={() => setEditingContract(null)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2 rounded font-bold"
              >
                إلغاء
              </button>
              <button
                onClick={handleSave}
                className="bg-teal-700 hover:bg-teal-800 text-white px-5 py-2 rounded font-bold shadow"
              >
                حفظ العقد
              </button>
            </div>
          </div>
        </div>)}
    </div>);
};
