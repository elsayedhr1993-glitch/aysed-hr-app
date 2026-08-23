import React, { useState, useMemo } from 'react';
import { 
  Printer, FileSpreadsheet, X, Search, Building2, User, Users, 
  Calendar, Layers, CheckCircle2, Sliders, ShieldCheck, FileText,
  Sparkles, Check, ChevronDown, Clock, Banknote, HelpCircle
} from 'lucide-react';
import { Employee, Company } from '../../types';
import { ReportCategory } from '../../apps/ReportsApp';

export type TargetScope = 'ALL' | 'DEPARTMENT' | 'EMPLOYEE';
export type PeriodType = 'ALL_TIME' | 'SPECIFIC_MONTH' | 'CUSTOM_RANGE' | 'CURRENT_YEAR';
export type LayoutOrientation = 'PORTRAIT' | 'LANDSCAPE';
export type DetailLevel = 'DETAILED' | 'SUMMARY_PIVOT';

export interface PrintWizardConfig {
  targetScope: TargetScope;
  selectedEmployeeId?: string;
  selectedDepartment?: string;
  periodType: PeriodType;
  selectedMonth?: string; // YYYY-MM e.g. "2026-08"
  startDate?: string;
  endDate?: string;
  includeHeaderLogo: boolean;
  includeSignatures: boolean;
  includeLegalStatement: boolean;
  orientation: LayoutOrientation;
  detailLevel: DetailLevel;
}

interface OdooReportPrintWizardProps {
  isOpen: boolean;
  onClose: () => void;
  reportCategory: ReportCategory;
  reportTitle: string;
  employees: Employee[];
  departments: string[];
  activeCompany?: Company;
  initialScope?: TargetScope;
  initialEmployeeId?: string;
  initialDepartment?: string;
  onConfirmPrint: (config: PrintWizardConfig) => void;
  onConfirmExportXLSX: (config: PrintWizardConfig) => void;
}

export const OdooReportPrintWizard: React.FC<OdooReportPrintWizardProps> = ({
  isOpen,
  onClose,
  reportCategory,
  reportTitle,
  employees = [],
  departments = [],
  activeCompany,
  initialScope,
  initialEmployeeId,
  initialDepartment,
  onConfirmPrint,
  onConfirmExportXLSX,
}) => {
  if (!isOpen) return null;

  // Wizard state
  const [targetScope, setTargetScope] = useState<TargetScope>(
    initialScope || (initialEmployeeId ? 'EMPLOYEE' : initialDepartment ? 'DEPARTMENT' : 'ALL')
  );
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(
    initialEmployeeId || employees[0]?.id || ''
  );
  const [selectedDepartment, setSelectedDepartment] = useState<string>(
    initialDepartment || departments[0] || 'الكل'
  );
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState<string>('');
  
  const [periodType, setPeriodType] = useState<PeriodType>('SPECIFIC_MONTH');
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // "2026-08"
  const [startDate, setStartDate] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );

  // Layout and Odoo options
  const [includeHeaderLogo, setIncludeHeaderLogo] = useState<boolean>(true);
  const [includeSignatures, setIncludeSignatures] = useState<boolean>(true);
  const [includeLegalStatement, setIncludeLegalStatement] = useState<boolean>(true);
  const [orientation, setOrientation] = useState<LayoutOrientation>('PORTRAIT');
  const [detailLevel, setDetailLevel] = useState<DetailLevel>('DETAILED');

  // Filtered employees for dropdown
  const filteredEmployees = useMemo(() => {
    if (!employeeSearchQuery) return employees;
    const q = employeeSearchQuery.toLowerCase();
    return employees.filter(e => 
      e.fullNameAr.toLowerCase().includes(q) ||
      e.employeeCode.toLowerCase().includes(q) ||
      (e.civilId && e.civilId.includes(q)) ||
      (e.jobTitle && e.jobTitle.toLowerCase().includes(q))
    );
  }, [employees, employeeSearchQuery]);

  const selectedEmployeeObj = employees.find(e => e.id === selectedEmployeeId);

  const handlePrintSubmit = () => {
    onConfirmPrint({
      targetScope,
      selectedEmployeeId: targetScope === 'EMPLOYEE' ? selectedEmployeeId : undefined,
      selectedDepartment: targetScope === 'DEPARTMENT' ? selectedDepartment : undefined,
      periodType,
      selectedMonth,
      startDate,
      endDate,
      includeHeaderLogo,
      includeSignatures,
      includeLegalStatement,
      orientation,
      detailLevel,
    });
  };

  const handleExportSubmit = () => {
    onConfirmExportXLSX({
      targetScope,
      selectedEmployeeId: targetScope === 'EMPLOYEE' ? selectedEmployeeId : undefined,
      selectedDepartment: targetScope === 'DEPARTMENT' ? selectedDepartment : undefined,
      periodType,
      selectedMonth,
      startDate,
      endDate,
      includeHeaderLogo,
      includeSignatures,
      includeLegalStatement,
      orientation,
      detailLevel,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
      <div 
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col font-sans" 
        dir="rtl"
      >
        {/* Wizard Header - Odoo Style */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#714B67] text-white rounded-lg shadow-sm">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">معالج خيارات ومعايير الطباعة</h2>
                <span className="text-[10px] bg-purple-950 text-purple-300 border border-purple-800 px-2 py-0.2 rounded font-mono">
                  ir.actions.report
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5 truncate max-w-md">
                {reportTitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Form Content */}
        <div className="p-5 space-y-5 max-h-[78vh] overflow-y-auto">
          
          {/* Section 1: Target Scope Selector */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-purple-700" />
                <span>1. نطاق ومستهدف التقرير (Target Filter Scope)</span>
              </label>
              <span className="text-[10px] text-slate-400">حدد الجهة الموجه لها التقرير</span>
            </div>

            {/* Scope Selection Tabs */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTargetScope('ALL')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  targetScope === 'ALL'
                    ? 'bg-purple-50 text-[#714B67] border-purple-300 ring-2 ring-purple-500/20 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100/80'
                }`}
              >
                <Users className="w-4 h-4 mb-1" />
                <span>كافة الموظفين</span>
                <span className="text-[10px] font-normal text-slate-400">({employees.length} موظف)</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetScope('DEPARTMENT')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  targetScope === 'DEPARTMENT'
                    ? 'bg-purple-50 text-[#714B67] border-purple-300 ring-2 ring-purple-500/20 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100/80'
                }`}
              >
                <Building2 className="w-4 h-4 mb-1" />
                <span>قسم / قطاع محدد</span>
                <span className="text-[10px] font-normal text-slate-400">فلترة حسب الإدارة</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetScope('EMPLOYEE')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  targetScope === 'EMPLOYEE'
                    ? 'bg-purple-50 text-[#714B67] border-purple-300 ring-2 ring-purple-500/20 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100/80'
                }`}
              >
                <User className="w-4 h-4 mb-1" />
                <span>موظف محدد فردياً</span>
                <span className="text-[10px] font-normal text-slate-400">كشف / قسيمة فردية</span>
              </button>
            </div>

            {/* Target Sub-Selectors */}
            {targetScope === 'DEPARTMENT' && (
              <div className="pt-2 animate-in fade-in">
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  اختر القسم أو القطاع المعني:
                </label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full bg-white border border-slate-300 text-slate-800 text-xs font-bold rounded-lg px-3 py-2 outline-none focus:border-[#714B67] focus:ring-1 focus:ring-[#714B67]"
                >
                  <option value="الكل">كافة الأقسام</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>))}
                </select>
              </div>)}

            {targetScope === 'EMPLOYEE' && (
              <div className="pt-2 space-y-2 animate-in fade-in">
                <label className="text-[11px] font-bold text-slate-600 block">
                  ابحث واختر الموظف:
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ابحث بالاسم، كود الموظف، أو الرقم المدني..."
                    value={employeeSearchQuery}
                    onChange={(e) => setEmployeeSearchQuery(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg pr-9 pl-3 py-1.5 text-xs outline-none focus:border-[#714B67] focus:ring-1 focus:ring-[#714B67]"
                  />
                </div>

                <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white">
                  {filteredEmployees.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400">لا توجد نتائج مطابقة</div>) : (
                    filteredEmployees.map((emp) => (
                      <div
                        key={emp.id}
                        onClick={() => setSelectedEmployeeId(emp.id)}
                        className={`p-2 flex items-center justify-between text-xs cursor-pointer transition ${
                          selectedEmployeeId === emp.id ? 'bg-purple-50 text-purple-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold font-mono">
                            {emp.employeeCode.slice(-3)}
                          </span>
                          <div>
                            <span className="block font-bold">{emp.fullNameAr}</span>
                            <span className="text-[10px] text-slate-400">{emp.jobTitle} • {emp.department}</span>
                          </div>
                        </div>

                        {selectedEmployeeId === emp.id && (
                          <Check className="w-4 h-4 text-purple-700 shrink-0" />)}
                      </div>))
                  )}
                </div>

                {selectedEmployeeObj && (
                  <div className="bg-purple-50/70 border border-purple-200 p-2 rounded-lg text-xs text-purple-900 flex items-center justify-between">
                    <span>الموظف المختار للطباعة: <strong>{selectedEmployeeObj.fullNameAr}</strong> ({selectedEmployeeObj.employeeCode})</span>
                    <span className="text-[10px] text-purple-700 font-mono">المدني: {selectedEmployeeObj.civilId || '—'}</span>
                  </div>)}
              </div>)}
          </div>

          {/* Section 2: Period & Date Range */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-purple-700" />
                <span>2. الفترة الزمنية وتاريخ التقرير (Period & Date Range)</span>
              </label>
              <span className="text-[10px] text-slate-400">تحديد مدة احتساب البيانات</span>
            </div>

            {/* Period Type Selection */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => setPeriodType('SPECIFIC_MONTH')}
                className={`px-3 py-2 rounded-lg border text-xs font-bold transition cursor-pointer text-center ${
                  periodType === 'SPECIFIC_MONTH'
                    ? 'bg-[#714B67] text-white border-[#714B67]'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                شهر محدد
              </button>

              <button
                type="button"
                onClick={() => setPeriodType('CUSTOM_RANGE')}
                className={`px-3 py-2 rounded-lg border text-xs font-bold transition cursor-pointer text-center ${
                  periodType === 'CUSTOM_RANGE'
                    ? 'bg-[#714B67] text-white border-[#714B67]'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                نطاق تاريخ (من - إلى)
              </button>

              <button
                type="button"
                onClick={() => setPeriodType('CURRENT_YEAR')}
                className={`px-3 py-2 rounded-lg border text-xs font-bold transition cursor-pointer text-center ${
                  periodType === 'CURRENT_YEAR'
                    ? 'bg-[#714B67] text-white border-[#714B67]'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                السنة المالية 2026
              </button>

              <button
                type="button"
                onClick={() => setPeriodType('ALL_TIME')}
                className={`px-3 py-2 rounded-lg border text-xs font-bold transition cursor-pointer text-center ${
                  periodType === 'ALL_TIME'
                    ? 'bg-[#714B67] text-white border-[#714B67]'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                كافة الفترات
              </button>
            </div>

            {/* Inputs based on Period Type */}
            {periodType === 'SPECIFIC_MONTH' && (
              <div className="pt-1 flex items-center gap-3 animate-in fade-in">
                <label className="text-xs font-bold text-slate-700 shrink-0">الشهر المستهدف:</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-mono outline-none focus:border-[#714B67] focus:ring-1 focus:ring-[#714B67]"
                />
              </div>)}

            {periodType === 'CUSTOM_RANGE' && (
              <div className="grid grid-cols-2 gap-3 pt-1 animate-in fade-in">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">من تاريخ:</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-mono outline-none focus:border-[#714B67] focus:ring-1 focus:ring-[#714B67]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">إلى تاريخ:</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-mono outline-none focus:border-[#714B67] focus:ring-1 focus:ring-[#714B67]"
                  />
                </div>
              </div>)}
          </div>

          {/* Section 3: Header, Signatures & Layout Options */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-purple-700" />
                <span>3. خيارات الترويسة والتنسيق الرسمي (Odoo Header & Layout)</span>
              </label>
              <span className="text-[10px] text-slate-400">تخصيص عناصر المستند المطبوع</span>
            </div>

            {/* Checkbox Options */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <label className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-200 text-xs text-slate-800 cursor-pointer hover:bg-slate-100/60 transition">
                <input
                  type="checkbox"
                  checked={includeHeaderLogo}
                  onChange={(e) => setIncludeHeaderLogo(e.target.checked)}
                  className="rounded text-[#714B67] focus:ring-[#714B67] w-4 h-4"
                />
                <span className="font-bold">ترويسة وشعار المنشأة</span>
              </label>

              <label className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-200 text-xs text-slate-800 cursor-pointer hover:bg-slate-100/60 transition">
                <input
                  type="checkbox"
                  checked={includeSignatures}
                  onChange={(e) => setIncludeSignatures(e.target.checked)}
                  className="rounded text-[#714B67] focus:ring-[#714B67] w-4 h-4"
                />
                <span className="font-bold">خانات التوقيع والاعتماد</span>
              </label>

              <label className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-200 text-xs text-slate-800 cursor-pointer hover:bg-slate-100/60 transition">
                <input
                  type="checkbox"
                  checked={includeLegalStatement}
                  onChange={(e) => setIncludeLegalStatement(e.target.checked)}
                  className="rounded text-[#714B67] focus:ring-[#714B67] w-4 h-4"
                />
                <span className="font-bold">بند المطابقة لقانون العمل</span>
              </label>
            </div>

            {/* Orientation & Detail level */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">اتجاه الصفحة للطباعة:</label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setOrientation('PORTRAIT')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                      orientation === 'PORTRAIT' ? 'bg-[#714B67] text-white border-[#714B67]' : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    رأسي / عمودي (Portrait)
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrientation('LANDSCAPE')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                      orientation === 'LANDSCAPE' ? 'bg-[#714B67] text-white border-[#714B67]' : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    أفقي / عريض (Landscape)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">مستوى تفصيل التقرير:</label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDetailLevel('DETAILED')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                      detailLevel === 'DETAILED' ? 'bg-[#714B67] text-white border-[#714B67]' : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    تفصيلي بالسجلات
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailLevel('SUMMARY_PIVOT')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                      detailLevel === 'SUMMARY_PIVOT' ? 'bg-[#714B67] text-white border-[#714B67]' : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    ملخص إجمالي (Pivot)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wizard Action Footer */}
        <div className="bg-slate-100 px-5 py-3.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            إلغاء
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportSubmit}
              className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>تصدير فوري Excel (XLSX)</span>
            </button>

            <button
              type="button"
              onClick={handlePrintSubmit}
              className="flex items-center gap-1.5 bg-[#714B67] hover:bg-[#85587a] text-white px-5 py-2 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>توليد ومعاينة التقرير الرسمي (Print / PDF)</span>
            </button>
          </div>
        </div>
      </div>
    </div>);
};
