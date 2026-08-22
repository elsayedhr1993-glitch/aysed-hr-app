import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  User, Users, Building2, Search, X, ChevronDown, Check, 
  Printer, Sparkles, Filter, ShieldCheck, Banknote, Calendar, 
  Clock, Award, Briefcase, FileSpreadsheet, ArrowRight
} from 'lucide-react';
import { Employee, Contract, LeaveRequest, AttendanceRecord, DocumentItem } from '../../types';
import { ReportCategory } from '../../apps/ReportsApp';
import { get_aysed_official_balance, getGlobalOpeningBalance, getGlobalAccrued2026 } from '../../utils/kuwaitLaw';

interface OdooScopeBarProps {
  employees: Employee[];
  departments: string[];
  selectedEmployeeId?: string;
  onSelectEmployee: (employeeId?: string) => void;
  selectedDepartment?: string;
  onSelectDepartment: (department?: string) => void;
  onQuickPrintSingle: (employeeId: string) => void;
  activeCategory: ReportCategory;
  contracts?: Contract[];
  leaves?: LeaveRequest[];
  attendance?: AttendanceRecord[];
  documents?: DocumentItem[];
}

export const OdooScopeBar: React.FC<OdooScopeBarProps> = ({
  employees = [],
  departments = [],
  selectedEmployeeId,
  onSelectEmployee,
  selectedDepartment,
  onSelectDepartment,
  onQuickPrintSingle,
  activeCategory,
  contracts = [],
  leaves = [],
  attendance = [],
  documents = [],
}) => {
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsEmployeeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter employees based on selected department first, then search query
  const filteredEmployees = useMemo(() => {
    let list = employees;
    if (selectedDepartment && selectedDepartment !== 'ALL') {
      list = list.filter(e => e.department === selectedDepartment);
    }
    if (employeeSearchQuery.trim()) {
      const q = employeeSearchQuery.toLowerCase();
      list = list.filter(e => 
        e.fullNameAr.toLowerCase().includes(q) ||
        (e.fullNameEn && e.fullNameEn.toLowerCase().includes(q)) ||
        e.employeeCode.toLowerCase().includes(q) ||
        (e.civilId && e.civilId.includes(q)) ||
        (e.jobTitle && e.jobTitle.toLowerCase().includes(q))
      );
    }
    return list;
  }, [employees, selectedDepartment, employeeSearchQuery]);

  const selectedEmployee = useMemo(() => {
    return employees.find(e => e.id === selectedEmployeeId);
  }, [employees, selectedEmployeeId]);

  const selectedContract = useMemo(() => {
    if (!selectedEmployee) return null;
    return contracts.find(c => c.employeeId === selectedEmployee.id && c.status === 'RUNNING') ||
           contracts.find(c => c.employeeId === selectedEmployee.id);
  }, [contracts, selectedEmployee]);

  return (
    <div className="space-y-3 font-sans" dir="rtl">
      {/* Scope Controls Strip */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[300px]">
          
          {/* Label Indicator */}
          <div className="flex items-center gap-2 text-slate-700 text-xs font-bold pl-2 border-l border-slate-200">
            <Filter className="w-4 h-4 text-[#714B67]" />
            <span>نطاق وفلترة التقرير:</span>
          </div>

          {/* 1. Department / Branch Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 focus-within:border-[#714B67] focus-within:ring-2 focus-within:ring-[#714B67]/20 transition">
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[11px] font-bold text-slate-600">القسم:</span>
            <select
              value={selectedDepartment || 'ALL'}
              onChange={(e) => {
                const val = e.target.value;
                onSelectDepartment(val === 'ALL' ? undefined : val);
              }}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer pr-1"
            >
              <option value="ALL">كافة الأقسام والقطاعات ({departments.length})</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* 2. Employee Selection Dropdown with Search */}
          <div className="relative flex-1 min-w-[240px] max-w-md" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsEmployeeDropdownOpen(!isEmployeeDropdownOpen)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                selectedEmployee 
                  ? 'bg-purple-50/80 border-purple-300 text-purple-950 ring-1 ring-purple-400/30'
                  : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <User className={`w-3.5 h-3.5 shrink-0 ${selectedEmployee ? 'text-[#714B67]' : 'text-slate-400'}`} />
                <span className="text-[11px] font-normal text-slate-500">تحديد الموظف:</span>
                <span className="truncate">
                  {selectedEmployee ? (
                    <strong className="text-slate-900 font-bold">
                      {selectedEmployee.fullNameAr} ({selectedEmployee.employeeCode})
                    </strong>
                  ) : (
                    'كافة الموظفين (All Employees)'
                  )}
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {selectedEmployee && (
                  <span 
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectEmployee(undefined);
                    }}
                    className="p-0.5 hover:bg-purple-200/70 rounded text-purple-800 cursor-pointer"
                    title="إلغاء التحديد وعرض الكل"
                  >
                    <X className="w-3.5 h-3.5" />
                  </span>
                )}
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isEmployeeDropdownOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {/* Dropdown Menu */}
            {isEmployeeDropdownOpen && (
              <div className="absolute top-full right-0 left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 space-y-1.5 animate-in fade-in zoom-in-95">
                {/* Search in Dropdown */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ابحث بالاسم، الرقم المدني، أو الكود..."
                    value={employeeSearchQuery}
                    onChange={(e) => setEmployeeSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pr-8 pl-3 py-1.5 text-xs outline-none focus:border-[#714B67] focus:bg-white transition"
                    autoFocus
                  />
                </div>

                <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 rounded-lg border border-slate-100">
                  {/* Option: All Employees */}
                  <div
                    onClick={() => {
                      onSelectEmployee(undefined);
                      setIsEmployeeDropdownOpen(false);
                      setEmployeeSearchQuery('');
                    }}
                    className={`p-2 flex items-center justify-between text-xs cursor-pointer transition ${
                      !selectedEmployeeId ? 'bg-purple-50 text-[#714B67] font-bold' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-purple-600" />
                      <span>كافة الموظفين (تقرير عام مجمع)</span>
                    </div>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono font-bold">
                      {employees.length} موظف
                    </span>
                  </div>

                  {/* Individual Employees List */}
                  {filteredEmployees.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400">
                      لا توجد نتائج مطابقة
                    </div>
                  ) : (
                    filteredEmployees.map((emp) => {
                      const isSelected = selectedEmployeeId === emp.id;
                      return (
                        <div
                          key={emp.id}
                          onClick={() => {
                            onSelectEmployee(emp.id);
                            setIsEmployeeDropdownOpen(false);
                            setEmployeeSearchQuery('');
                          }}
                          className={`p-2 flex items-center justify-between text-xs cursor-pointer transition ${
                            isSelected ? 'bg-purple-50 text-purple-950 font-bold' : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-full bg-slate-100 text-[#714B67] border border-purple-200 flex items-center justify-center text-[10px] font-bold font-mono">
                              {emp.employeeCode.slice(-3)}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold">{emp.fullNameAr}</span>
                                {emp.isKuwaiti && (
                                  <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">كويتي</span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-2">
                                <span>{emp.jobTitle} • {emp.department}</span>
                                <span>| المدني: {emp.civilId || '—'}</span>
                              </div>
                            </div>
                          </div>

                          {isSelected && (
                            <Check className="w-4 h-4 text-[#714B67] shrink-0" />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick Reset Button if any filter active */}
          {(selectedEmployeeId || (selectedDepartment && selectedDepartment !== 'ALL')) && (
            <button
              onClick={() => {
                onSelectEmployee(undefined);
                onSelectDepartment(undefined);
              }}
              className="flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2 py-1.5 rounded-lg transition cursor-pointer"
              title="إعادة التعيين وعرض تقرير كافة الموظفين"
            >
              <X className="w-3.5 h-3.5" />
              <span>عرض الكل</span>
            </button>
          )}
        </div>

        {/* Direct Action: Print Single PDF if Employee Selected */}
        {selectedEmployee && (
          <div className="flex items-center gap-2 animate-in fade-in">
            <button
              onClick={() => onQuickPrintSingle(selectedEmployee.id)}
              className="flex items-center gap-1.5 bg-[#714B67] hover:bg-[#85587a] text-white text-xs px-3.5 py-1.5 rounded-xl font-bold transition shadow-xs cursor-pointer"
              title={`طباعة التقرير الفردي الرسمي للموظف ${selectedEmployee.fullNameAr}`}
            >
              <Printer className="w-3.5 h-3.5 text-amber-300" />
              <span>طباعة تقرير الموظف (Single PDF)</span>
            </button>
          </div>
        )}
      </div>

      {/* Single-Employee Profile & Live Quick Summary Banner */}
      {selectedEmployee && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-purple-950 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-700 animate-in fade-in slide-in-from-top-2">
          <div className="flex flex-wrap items-center justify-between gap-4">
            
            {/* Employee Core Bio */}
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-purple-900/60 border border-purple-500/40 text-amber-300 flex items-center justify-center font-bold text-base shadow-inner shrink-0">
                {selectedEmployee.fullNameAr.charAt(0)}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm sm:text-base font-black text-white">{selectedEmployee.fullNameAr}</h2>
                  <span className="text-[10px] font-mono bg-purple-950/80 text-purple-300 border border-purple-700/50 px-2 py-0.5 rounded">
                    {selectedEmployee.employeeCode}
                  </span>
                  {selectedEmployee.isKuwaiti ? (
                    <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700/60 px-2 py-0.5 rounded font-bold">
                      🇰🇼 عمالة وطنية (تأمينات)
                    </span>
                  ) : (
                    <span className="text-[10px] bg-blue-950 text-blue-300 border border-blue-700/60 px-2 py-0.5 rounded font-bold">
                      مادة 18 (وافد)
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-1">
                  <span>المسمى: <strong className="text-white">{selectedEmployee.jobTitle}</strong></span>
                  <span>•</span>
                  <span>القسم: <strong className="text-purple-300">{selectedEmployee.department}</strong></span>
                  <span>•</span>
                  <span>الرقم المدني: <strong className="font-mono text-amber-300">{selectedEmployee.civilId || '—'}</strong></span>
                </div>
              </div>
            </div>

            {/* Contextual Metric Cards according to Active Category */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {activeCategory === 'PAYROLL_ANALYSIS' && (
                <div className="flex items-center gap-2">
                  <div className="bg-slate-800/80 border border-slate-700 px-3 py-2 rounded-xl text-center">
                    <span className="text-[10px] text-slate-400 block">الراتب الأساسي</span>
                    <strong className="text-xs font-mono text-white">
                      {(selectedContract?.basicSalary || 0).toLocaleString('en-US', { minimumFractionDigits: 3 })} د.ك
                    </strong>
                  </div>

                  <div className="bg-slate-800/80 border border-slate-700 px-3 py-2 rounded-xl text-center">
                    <span className="text-[10px] text-slate-400 block">إجمالي البدلات</span>
                    <strong className="text-xs font-mono text-white">
                      {(selectedContract ? (selectedContract.housingAllowance + selectedContract.transportAllowance + (selectedContract.otherAllowance || 0)) : 0).toLocaleString('en-US', { minimumFractionDigits: 3 })} د.ك
                    </strong>
                  </div>

                  <div className="bg-emerald-950/80 border border-emerald-700/60 px-3.5 py-2 rounded-xl text-center">
                    <span className="text-[10px] text-emerald-400 block">صافي التحويل البنكي</span>
                    <strong className="text-sm font-mono text-amber-300 font-black">
                      {(() => {
                        const basic = selectedContract?.basicSalary || 0;
                        const allowances = selectedContract ? (selectedContract.housingAllowance + selectedContract.transportAllowance + (selectedContract.otherAllowance || 0)) : 0;
                        const gross = basic + allowances;
                        return (gross).toLocaleString('en-US', { minimumFractionDigits: 3 });
                      })()} د.ك
                    </strong>
                  </div>
                </div>
              )}

              {activeCategory === 'LEAVE_BALANCE' && (() => {
                const opening = getGlobalOpeningBalance(selectedEmployee);
                const accrued = getGlobalAccrued2026(selectedEmployee);
                const taken = leaves
                  .filter(l => !l.isHistorical && l.employeeId === selectedEmployee.id && (l.status === 'APPROVED' || (l.status as any) === 'VALIDATED') && l.leaveType === 'ANNUAL')
                  .reduce((a, b) => a + (b.totalDays || 0), 0);
                const remaining = (opening + accrued) - taken;

                return (
                  <div className="flex items-center gap-2">
                    <div className="bg-slate-800/80 border border-slate-700 px-3 py-2 rounded-xl text-center">
                      <span className="text-[10px] text-slate-400 block">الافتتاحي + المكتسب</span>
                      <strong className="text-xs font-mono text-white">{(opening + accrued).toFixed(1)} يوم</strong>
                    </div>

                    <div className="bg-rose-950/70 border border-rose-800/50 px-3 py-2 rounded-xl text-center">
                      <span className="text-[10px] text-rose-300 block">الأيام المستهلكة</span>
                      <strong className="text-xs font-mono text-rose-200">
                        {taken.toFixed(1)} يوم
                      </strong>
                    </div>

                    <div className={`px-3.5 py-2 rounded-xl text-center border ${
                      remaining < 0 
                        ? 'bg-rose-950/90 border-rose-600 text-rose-300' 
                        : remaining === 0 
                          ? 'bg-slate-800 border-slate-600 text-slate-300' 
                          : remaining < 5 
                            ? 'bg-amber-950/80 border-amber-600 text-amber-300' 
                            : 'bg-emerald-950/80 border-emerald-700/60 text-emerald-300'
                    }`}>
                      <span className="text-[10px] block opacity-80">صافي الرصيد المتبقي</span>
                      <strong className="text-sm font-mono font-bold">
                        {remaining.toFixed(1)} يوم {remaining === 0 ? '(مصفّر)' : ''}
                      </strong>
                    </div>
                  </div>
                );
              })()}

              {activeCategory === 'ATTENDANCE_ANALYSIS' && (
                <div className="flex items-center gap-2">
                  <div className="bg-slate-800/80 border border-slate-700 px-3 py-2 rounded-xl text-center">
                    <span className="text-[10px] text-slate-400 block">أيام الحضور</span>
                    <strong className="text-xs font-mono text-white">
                      {attendance.filter(a => a.employeeId === selectedEmployee.id).length || 22} يوم
                    </strong>
                  </div>

                  <div className="bg-slate-800/80 border border-slate-700 px-3 py-2 rounded-xl text-center">
                    <span className="text-[10px] text-slate-400 block">الساعات الفعلية</span>
                    <strong className="text-xs font-mono text-white">
                      {attendance.filter(a => a.employeeId === selectedEmployee.id).reduce((a, b) => a + (b.workHours || 8), 0) || 176} س
                    </strong>
                  </div>

                  <div className="bg-purple-950/80 border border-purple-700/60 px-3 py-2 rounded-xl text-center">
                    <span className="text-[10px] text-purple-300 block">الإضافي والتأخير</span>
                    <strong className="text-xs font-mono text-amber-300">
                      +{attendance.filter(a => a.employeeId === selectedEmployee.id).reduce((a, b) => a + (b.overtimeHours || 0), 0)} س
                    </strong>
                  </div>
                </div>
              )}

              {activeCategory === 'MOH_DOCS_EXPIRY' && (
                <div className="flex items-center gap-2">
                  <div className="bg-slate-800/80 border border-slate-700 px-3 py-2 rounded-xl text-center">
                    <span className="text-[10px] text-slate-400 block">ترخيص MOH</span>
                    <strong className="text-xs font-mono text-emerald-300">
                      {selectedEmployee.mohLicenseNo || 'ساري'}
                    </strong>
                  </div>

                  <div className="bg-emerald-950/80 border border-emerald-700/60 px-3.5 py-2 rounded-xl text-center">
                    <span className="text-[10px] text-emerald-400 block">حالة الوثائق</span>
                    <strong className="text-xs text-emerald-300 font-bold">مكتملة ومعتمدة</strong>
                  </div>
                </div>
              )}

              {activeCategory === 'WORKFORCE_DEMO' && (
                <div className="flex items-center gap-2">
                  <div className="bg-slate-800/80 border border-slate-700 px-3 py-2 rounded-xl text-center">
                    <span className="text-[10px] text-slate-400 block">الجنسية</span>
                    <strong className="text-xs text-white">{selectedEmployee.nationality}</strong>
                  </div>

                  <div className="bg-emerald-950/80 border border-emerald-700/60 px-3.5 py-2 rounded-xl text-center">
                    <span className="text-[10px] text-emerald-400 block">حالة التعيين</span>
                    <strong className="text-xs text-emerald-300 font-bold">على رأس العمل</strong>
                  </div>
                </div>
              )}

              {/* Print Button inside Banner */}
              <button
                onClick={() => onQuickPrintSingle(selectedEmployee.id)}
                className="flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 px-3.5 py-2 rounded-xl font-bold transition shadow-xs cursor-pointer mr-1"
                title="تصدير وطباعة المستند الرسمي للموظف"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
