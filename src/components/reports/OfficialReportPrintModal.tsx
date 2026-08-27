import React, { useRef } from 'react';
import { printDocument } from '../../utils/printUtils';
import { 
  Printer, Download, X, Building2, CheckCircle2, ShieldCheck, 
  Calendar, FileSpreadsheet, Sparkles, User, FileText, Banknote, 
  Clock, AlertTriangle, Briefcase, Award, Hash, Check
} from 'lucide-react';
import { 
  Company, Employee, Contract, LeaveRequest, AttendanceRecord, 
  Payslip, DocumentItem 
} from '../../types';
import { PivotRowData } from './OdooPivotView';
import { MeasureOption } from './OdooSearchBar';
import { PrintWizardConfig } from './OdooReportPrintWizard';
import { ReportCategory } from '../../apps/ReportsApp';
import { getGlobalOpeningBalance, getGlobalAccrued2026, getGlobalCompensatoryDays, formatEmployeeNationalityAndResidency } from '../../utils/kuwaitLaw';
import { getSavedSettlementVouchers } from '../../services/leaveSettlementService';
import * as XLSX from 'xlsx';

interface OfficialReportPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportTitle: string;
  reportCategory: ReportCategory;
  activeCompany?: Company;
  pivotData: PivotRowData[];
  grandTotal: Record<string, number>;
  selectedMeasures?: MeasureOption[];
  activeMeasures?: MeasureOption[];
  employees: Employee[];
  contracts?: Contract[];
  leaves?: LeaveRequest[];
  attendance?: AttendanceRecord[];
  payslips?: Payslip[];
  documents?: DocumentItem[];
  printConfig?: PrintWizardConfig;
  wizardConfig?: PrintWizardConfig;
  groupByLabel?: string;
  totalRecords?: number;
  activeFiltersLabels?: string[];
  selectedEmployeeId?: string;
  activeList?: any[];
}

export const OfficialReportPrintModal: React.FC<OfficialReportPrintModalProps> = ({
  isOpen,
  onClose,
  reportTitle,
  reportCategory,
  activeCompany,
  pivotData = [],
  grandTotal = {},
  selectedMeasures,
  activeMeasures,
  employees = [],
  contracts = [],
  leaves = [],
  attendance = [],
  payslips = [],
  documents = [],
  printConfig,
  wizardConfig,
  selectedEmployeeId,
  activeList = [],
}) => {
  const effectiveMeasures = activeMeasures || selectedMeasures || [];
  const printAreaRef = useRef<HTMLDivElement>(null);
  
  const handlePrint = async () => {
    await printDocument('official-report-print-area', reportTitle);
  };

  if (!isOpen) return null;

  const effectiveEmpId = selectedEmployeeId || wizardConfig?.selectedEmployeeId || printConfig?.selectedEmployeeId;
  const selectedEmployee = employees.find(e => e.id === effectiveEmpId);
  const selectedEmployeeContract = contracts.find(c => c.employeeId === effectiveEmpId && (c.status === 'RUNNING' || (c.status as string) === 'ACTIVE'));

  // Employee specific leave metrics if single selected
  const empLeaveMetrics = selectedEmployee ? (() => {
    const opening = getGlobalOpeningBalance(selectedEmployee);
    const accrued = getGlobalAccrued2026(selectedEmployee);
    const compensatory = getGlobalCompensatoryDays(selectedEmployee);
    const totalAvailable = opening + accrued + compensatory;
    
    const empLeaves = leaves.filter(
      l => !l.isHistorical && l.employeeId === selectedEmployee.id && (l.status === 'APPROVED' || (l.status as any) === 'VALIDATED')
    );
    const totalTaken = empLeaves.reduce((sum, l) => sum + (l.totalDays || 0), 0);
    const paidConsumed = Math.min(totalTaken, totalAvailable);
    const remaining = Math.max(0, totalAvailable - totalTaken);
    const excessUnpaid = Math.max(0, totalTaken - totalAvailable);

    return {
      opening,
      accrued,
      totalAvailable,
      empLeaves,
      totalTaken,
      paidConsumed,
      remaining,
      excessUnpaid,
    };
  })() : null;

  const formatMeasureValue = (val: number | undefined, measure: MeasureOption) => {
    if (val === undefined || val === null) {
      if (measure.unit === 'يوم') return '0.0 يوم';
      return '-';
    }
    
    // 1. If explicitly currency (KWD)
    if (measure.isCurrency) {
      return (
        <span dir="ltr" className="inline-flex items-center gap-1">
          <span className="font-mono">{val.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</span>
          <span className="font-sans text-[10px] text-slate-500 font-bold">د.ك</span>
        </span>
      );
    }

    // 2. If day / hour / minute unit
    if (measure.unit === 'يوم' || measure.unit === 'ساعة' || measure.unit === 'دقيقة') {
      const isNegative = val < 0;
      return (
        <span dir="ltr" className={`inline-flex items-center gap-1 font-mono font-bold ${isNegative ? 'text-rose-600' : ''}`}>
          <span>{val.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
          <span className="font-sans text-[10px] text-slate-500 font-normal">{measure.unit}</span>
        </span>
      );
    }

    // 3. Count or standard integer
    if (measure.id === 'count' || measure.field === 'count' || measure.label?.includes('عدد')) {
      return (
        <span dir="ltr" className="font-mono font-bold">
          {val.toLocaleString('en-US', { maximumFractionDigits: 0 })}
        </span>
      );
    }

    // 4. Default number
    return (
      <span dir="ltr" className="font-mono">
        {val.toLocaleString('en-US', { maximumFractionDigits: 2 })}
      </span>
    );
  };

  const handleExportExcel = () => {
    let wsData: any[] = [];

    if (reportCategory === 'LEAVE_BALANCE') {
      const sourceList = activeList.length > 0 ? activeList : employees.map(emp => {
        const op = getGlobalOpeningBalance(emp);
        const ac = getGlobalAccrued2026(emp);
        const comp = getGlobalCompensatoryDays(emp);
        const totalAvail = op + ac + comp;
        const empL = leaves.filter(l => !l.isHistorical && l.employeeId === emp.id && (l.status === 'APPROVED' || (l.status as any) === 'VALIDATED'));
        const actualLeaveDays = empL.filter(l => !l.reason?.includes('تصفية نقدية') && !l.reason?.includes('Encashment')).reduce((s, l) => s + (l.totalDays || 0), 0);
        const empVouchers = getSavedSettlementVouchers(activeCompany?.id).filter(v => v.employeeId === emp.id && (v.status === 'settled_locked' || v.status === 'paid'));
        const encashDays = empVouchers.reduce((s, v) => s + (v.encashedLeaveDays || 0), 0);
        const leaveEncashDays = empL.filter(l => l.reason?.includes('تصفية نقدية') || l.reason?.includes('Encashment')).reduce((s, l) => s + (l.totalDays || 0), 0);
        const totalEncash = Math.max(leaveEncashDays, encashDays);
        const totalDeducted = actualLeaveDays + totalEncash;
        const paidConsumed = Math.min(totalAvail, totalDeducted);
        const remaining = Math.max(0, totalAvail - totalDeducted);
        const excess = Math.max(0, totalDeducted - totalAvail);

        return {
          employeeCode: emp.employeeCode,
          employeeName: emp.fullNameAr,
          department: emp.department,
          jobTitle: emp.jobTitle,
          carriedOver: op,
          accruedDays: ac,
          totalAvailable: totalAvail,
          totalDays: totalDeducted,
          paidConsumed: paidConsumed,
          remainingDays: remaining,
          excessUnpaid: excess,
          leaveStatus: remaining >= 15 ? 'رصيد كافٍ' : remaining > 0 ? 'رصيد منخفض' : 'رصيد مصفّر',
        };
      });

      wsData = sourceList.map((item, idx) => ({
        '#': idx + 1,
        'كود الموظف': item.employeeCode,
        'اسم الموظف': item.employeeName || item.fullNameAr,
        'القسم': item.department,
        'المسمى الوظيفي': item.jobTitle,
        'الرصيد الافتتاحي (مرحل)': item.carriedOver || 0,
        'المكتسب لعام 2026': item.accruedDays || 0,
        'إجمالي الرصيد المتاح': item.totalAvailable || 0,
        'الأيام المستهلكة (مدفوعة)': item.paidConsumed || item.totalDays || 0,
        'صافي الرصيد المتبقي': item.remainingDays || 0,
        'أيام بدون راتب': item.excessUnpaid || 0,
        'حالة الرصيد': item.leaveStatus || 'مستقر',
      }));
    } else {
      wsData = (activeList.length > 0 ? activeList : pivotData).map((row, idx) => {
        const rowObj: Record<string, any> = {
          '#': idx + 1,
          'البيان / الموظف': row.employeeName || row.fullNameAr || row.label,
          'كود الموظف': row.employeeCode || '-',
          'القسم': row.department || '-',
        };
        effectiveMeasures.forEach(m => {
          rowObj[m.label] = row.values ? (row.values[m.id] ?? 0) : (row[m.id] ?? 0);
        });
        return rowObj;
      });
    }

    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leave_Report');
    XLSX.writeFile(wb, `${reportTitle}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[95vh] flex flex-col border border-slate-300 overflow-hidden font-sans">
        
        {/* Actions Bar (Top) */}
        <div className="bg-slate-100 border-b border-slate-200 p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <span className="bg-[#714B67] text-white text-xs font-bold px-2.5 py-1 rounded-md">
              معاينة التقرير الرسمي (Odoo View)
            </span>
            <h3 className="font-bold text-slate-800 text-sm truncate max-w-md">
              {selectedEmployee ? `${reportTitle} - ${selectedEmployee.fullNameAr}` : reportTitle}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تصدير Excel</span>
            </button>

            <button
              onClick={handlePrint}
              className="bg-[#714B67] hover:bg-[#5a3b52] text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4 text-amber-300" />
              <span>طباعة المستند الرسمي (PDF)</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-slate-100/50 print:bg-white print:p-0">
          <div 
            id="official-report-print-area"
            ref={printAreaRef}
            className="bg-white border border-slate-300 print:border-none p-6 sm:p-10 max-w-4xl mx-auto shadow-sm print:shadow-none space-y-6 text-slate-800"
            style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}
          >
            
            {/* 1. Official Header */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{activeCompany?.nameAr || 'المنار كلينك'}</h2>
                <p className="text-xs text-slate-500 mt-0.5">الرقم المدني للمنشأة: <span className="font-mono">{activeCompany?.civilIdCompany || activeCompany?.civilId || '123456789012'}</span></p>
                <p className="text-xs text-slate-500">رقم السجل التجاري: <span className="font-mono">{activeCompany?.commercialRegNo || '12345'}</span></p>
                <p className="text-xs text-slate-500">دولة الكويت</p>
              </div>

              <div className="text-center max-w-lg">
                <h1 className="text-xl font-black text-slate-900 border-2 border-slate-900 px-5 py-2 rounded-md bg-slate-50 leading-tight">
                  <bdi>{reportTitle}</bdi>
                </h1>
                <span className="text-[10px] font-bold text-slate-500 tracking-wider block mt-1 uppercase">
                  OFFICIAL ENTERPRISE REPORT
                </span>
              </div>

              <div className="text-left text-xs text-slate-600 space-y-1 font-mono">
                <p><span className="font-bold font-sans">الرقم المرجعي:</span> REP-{new Date().getFullYear()}-{Math.floor(1000 + Math.random() * 9000)}</p>
                <p><span className="font-bold font-sans">تاريخ الإصدار:</span> {new Date().toISOString().split('T')[0]}</p>
              </div>
            </div>

            {/* 2. Employee Info Bar (If Single Selected) */}
            {selectedEmployee && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-300 text-xs space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-700"></span>
                    <span className="font-black text-sm text-slate-900">بيانات الموظف المعتمدة (Employee Profile)</span>
                  </div>
                  <span className="font-mono bg-purple-100 text-purple-900 border border-purple-300 px-2 py-0.5 rounded font-bold">
                    {selectedEmployee.employeeCode}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div><span className="text-slate-500 block">اسم الموظف:</span> <strong className="text-slate-900 text-xs">{selectedEmployee.fullNameAr}</strong></div>
                  <div><span className="text-slate-500 block">الرقم المدني:</span> <strong className="font-mono text-slate-900">{selectedEmployee.civilId || '—'}</strong></div>
                  <div><span className="text-slate-500 block">المسمى الوظيفي:</span> <span className="text-slate-900 font-bold">{selectedEmployee.jobTitle}</span></div>
                  <div><span className="text-slate-500 block">القسم / الإدارة:</span> <span className="text-purple-900 font-bold">{selectedEmployee.department}</span></div>
                  <div><span className="text-slate-500 block">تاريخ التعيين / المباشرة:</span> <span className="font-mono text-slate-800 font-bold">{selectedEmployee.joinDate || '2023-01-01'}</span></div>
                  <div><span className="text-slate-500 block">الجنسية والإقامة:</span> <span className="text-slate-800 font-bold">{formatEmployeeNationalityAndResidency(selectedEmployee)}</span></div>
                  <div><span className="text-slate-500 block">الراتب الأساسي:</span> <span className="font-mono text-slate-900 font-bold">{(selectedEmployeeContract?.basicSalary || 0).toLocaleString('en-US', { minimumFractionDigits: 3 })} د.ك</span></div>
                  <div><span className="text-slate-500 block">حالة العمل:</span> <span className="text-emerald-700 font-bold">على رأس العمل (ACTIVE)</span></div>
                </div>
              </div>
            )}

            {/* 3. CASE A: Single Employee Leave Balance Detailed Breakdown */}
            {selectedEmployee && reportCategory === 'LEAVE_BALANCE' && empLeaveMetrics && (
              <div className="space-y-5">
                {/* 6-Card Balance Matrix */}
                <div className="border border-slate-300 rounded-xl overflow-hidden">
                  <div className="bg-slate-800 text-white text-xs font-bold p-2.5 flex items-center justify-between">
                    <span>مصفوفة ملخص رصيد الإجازات المعتمد (Leave Balance Summary)</span>
                    <span className="font-mono text-amber-300">حتى تاريخ: {new Date().toISOString().split('T')[0]}</span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 divide-x divide-y sm:divide-y-0 divide-slate-200 bg-white text-center text-xs">
                    <div className="p-3 bg-amber-50/50">
                      <span className="text-[11px] text-amber-900 block font-bold mb-1">الافتتاحي (مرحل)</span>
                      <strong className="text-sm font-mono text-amber-900 font-black">{empLeaveMetrics.opening.toFixed(1)} يوم</strong>
                    </div>
                    <div className="p-3 bg-blue-50/50">
                      <span className="text-[11px] text-blue-900 block font-bold mb-1">المكتسب لعام 2026</span>
                      <strong className="text-sm font-mono text-blue-900 font-black">{empLeaveMetrics.accrued.toFixed(1)} يوم</strong>
                    </div>
                    <div className="p-3 bg-purple-50/50">
                      <span className="text-[11px] text-purple-900 block font-bold mb-1">إجمالي المتاح</span>
                      <strong className="text-sm font-mono text-purple-900 font-black">{empLeaveMetrics.totalAvailable.toFixed(1)} يوم</strong>
                    </div>
                    <div className="p-3 bg-rose-50/50">
                      <span className="text-[11px] text-rose-900 block font-bold mb-1">الأيام المستهلكة</span>
                      <strong className="text-sm font-mono text-rose-800 font-black">{empLeaveMetrics.paidConsumed.toFixed(1)} يوم</strong>
                    </div>
                    <div className="p-3 bg-emerald-50">
                      <span className="text-[11px] text-emerald-900 block font-bold mb-1">صافي المتبقي</span>
                      <strong className="text-base font-mono text-emerald-800 font-black">{empLeaveMetrics.remaining.toFixed(1)} يوم</strong>
                    </div>
                    <div className="p-3 bg-slate-50">
                      <span className="text-[11px] text-slate-700 block font-bold mb-1">أيام بدون راتب</span>
                      <strong className="text-sm font-mono text-slate-800 font-black">{empLeaveMetrics.excessUnpaid.toFixed(1)} يوم</strong>
                    </div>
                  </div>
                </div>

                {/* Movement Ledger Table */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#714B67]" />
                    <span>سجل حركات وطلبات الإجازات المعتمدة للموظف (Leave Movements History)</span>
                  </h4>

                  <div className="border border-slate-300 rounded-md overflow-hidden">
                    <table className="w-full text-xs text-right border-collapse">
                      <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                        <tr>
                          <th className="p-2 border-l border-slate-200 text-center w-10">#</th>
                          <th className="p-2 border-l border-slate-200">نوع الإجازة</th>
                          <th className="p-2 border-l border-slate-200 text-center">من تاريخ</th>
                          <th className="p-2 border-l border-slate-200 text-center">إلى تاريخ</th>
                          <th className="p-2 border-l border-slate-200 text-center w-24">المدة (أيام)</th>
                          <th className="p-2 border-l border-slate-200">آلية الخصم من الرصيد</th>
                          <th className="p-2 text-center w-24">الحالة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {empLeaveMetrics.empLeaves.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-6 text-center text-slate-400 font-bold">
                              لم يتم تسجيل أي إجازات مستهلكة لهذا الموظف - الرصيد كامل متاح
                            </td>
                          </tr>
                        ) : (
                          empLeaveMetrics.empLeaves.map((l, idx) => (
                            <tr key={l.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                              <td className="p-2 border-l border-slate-200 text-center font-mono text-slate-500">{idx + 1}</td>
                              <td className="p-2 border-l border-slate-200 font-bold text-slate-900">
                                {l.leaveType === 'ANNUAL' ? 'إجازة سنوية دورية' : l.leaveType === 'SICK' ? 'إجازة مرضية' : l.leaveType || 'إجازة اعتيادية'}
                              </td>
                              <td className="p-2 border-l border-slate-200 text-center font-mono">{l.startDate}</td>
                              <td className="p-2 border-l border-slate-200 text-center font-mono">{l.endDate}</td>
                              <td className="p-2 border-l border-slate-200 text-center font-mono font-bold text-rose-700">{l.totalDays} يوم</td>
                              <td className="p-2 border-l border-slate-200 text-slate-600 text-[11px]">
                                {empLeaveMetrics.opening > 0 ? 'خصم بنظام الأقدمية FIFO (من الرصيد المرحل أولاً)' : 'خصم من الاستحقاق المكتسب لعام 2026'}
                              </td>
                              <td className="p-2 text-center">
                                <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">
                                  معتمدة ومخصومة
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 4. CASE B: Enterprise / Multi-Employee Table or Category Standard View */}
            {(!selectedEmployee || reportCategory !== 'LEAVE_BALANCE') && (
              <div className="overflow-hidden border border-slate-300 rounded-md">
                <table className="w-full text-xs text-right border-collapse">
                  <thead className="bg-slate-800 text-white font-bold">
                    {reportCategory === 'LEAVE_BALANCE' ? (
                      <tr>
                        <th className="p-2.5 border-l border-slate-700 w-10 text-center">#</th>
                        <th className="p-2.5 border-l border-slate-700 w-24 text-center">كود الموظف</th>
                        <th className="p-2.5 border-l border-slate-700">اسم الموظف</th>
                        <th className="p-2.5 border-l border-slate-700">القسم / المسمى الوظيفي</th>
                        <th className="p-2.5 border-l border-slate-700 text-center">الافتتاحي (مرحل)</th>
                        <th className="p-2.5 border-l border-slate-700 text-center">المكتسب 2026</th>
                        <th className="p-2.5 border-l border-slate-700 text-center">إجمالي المتاح</th>
                        <th className="p-2.5 border-l border-slate-700 text-center">المستهلك</th>
                        <th className="p-2.5 border-l border-slate-700 text-center font-black bg-slate-900">صافي المتبقي</th>
                        <th className="p-2.5 border-l border-slate-700 text-center">أيام بدون راتب</th>
                        <th className="p-2.5 text-center">حالة الرصيد</th>
                      </tr>
                    ) : (
                      <tr>
                        <th className="p-2.5 border-l border-slate-700 w-12 text-center">#</th>
                        <th className="p-2.5 border-l border-slate-700">البيان / الفئة</th>
                        <th className="p-2.5 border-l border-slate-700 text-center w-20">العدد</th>
                        {effectiveMeasures.map(m => (
                          <th key={m.id} className="p-2.5 border-l border-slate-700 text-center font-bold">
                            {m.label}
                          </th>
                        ))}
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {reportCategory === 'LEAVE_BALANCE' ? (
                      (activeList.length > 0 ? activeList : employees).map((item: any, idx: number) => {
                        const empName = item.employeeName || item.fullNameAr || 'موظف';
                        const empCode = item.employeeCode || `EMP-${idx + 1}`;
                        const dept = item.department || 'الموارد البشرية والإدارة';
                        const job = item.jobTitle || 'موظف';
                        const opening = item.carriedOver !== undefined ? item.carriedOver : getGlobalOpeningBalance(item);
                        const accrued = item.accruedDays !== undefined ? item.accruedDays : getGlobalAccrued2026(item);
                        const totalAvail = item.totalAvailable !== undefined ? item.totalAvailable : (opening + accrued);
                        const consumed = item.paidConsumed !== undefined ? item.paidConsumed : (item.totalDays || 0);
                        const remaining = item.remainingDays !== undefined ? item.remainingDays : Math.max(0, totalAvail - consumed);
                        const excess = item.excessUnpaid !== undefined ? item.excessUnpaid : Math.max(0, consumed - totalAvail);
                        const statusText = remaining >= 15 ? 'رصيد كافٍ' : remaining > 0 ? 'رصيد منخفض' : 'رصيد مصفّر';

                        return (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                            <td className="p-2.5 border-l border-slate-200 text-center font-mono text-slate-500">{idx + 1}</td>
                            <td className="p-2.5 border-l border-slate-200 text-center font-mono font-bold text-purple-900">{empCode}</td>
                            <td className="p-2.5 border-l border-slate-200 font-bold text-slate-900">{empName}</td>
                            <td className="p-2.5 border-l border-slate-200 text-slate-700">
                              <span className="font-semibold">{dept}</span>
                              <span className="text-[10px] text-slate-500 block">{job}</span>
                            </td>
                            <td className="p-2.5 border-l border-slate-200 text-center font-mono font-bold text-amber-900">{opening.toFixed(1)} يوم</td>
                            <td className="p-2.5 border-l border-slate-200 text-center font-mono font-bold text-blue-900">{accrued.toFixed(1)} يوم</td>
                            <td className="p-2.5 border-l border-slate-200 text-center font-mono font-bold text-purple-900">{totalAvail.toFixed(1)} يوم</td>
                            <td className="p-2.5 border-l border-slate-200 text-center font-mono font-bold text-rose-700">{consumed.toFixed(1)} يوم</td>
                            <td className="p-2.5 border-l border-slate-200 text-center font-mono font-black text-emerald-800 bg-emerald-50/50">{remaining.toFixed(1)} يوم</td>
                            <td className="p-2.5 border-l border-slate-200 text-center font-mono text-slate-600">{excess.toFixed(1)} يوم</td>
                            <td className="p-2.5 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                remaining >= 15 ? 'bg-emerald-100 text-emerald-800' :
                                remaining > 0 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {statusText}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      pivotData.length === 0 ? (
                        <tr>
                          <td colSpan={3 + effectiveMeasures.length} className="p-8 text-center text-slate-400 font-bold">
                            لا توجد بيانات مطابقة لهذا التقرير
                          </td>
                        </tr>
                      ) : (
                        pivotData.map((row, idx) => (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                            <td className="p-2.5 border-l border-slate-200 text-center font-mono text-slate-500">{idx + 1}</td>
                            <td className="p-2.5 border-l border-slate-200 font-bold text-slate-900">{row.label}</td>
                            <td className="p-2.5 border-l border-slate-200 text-center font-mono font-bold text-purple-900">{row.recordsCount ?? row.count ?? 1}</td>
                            {effectiveMeasures.map(m => (
                              <td key={m.id} className="p-2.5 border-l border-slate-200 text-center">
                                {formatMeasureValue(row.values[m.id], m)}
                              </td>
                            ))}
                          </tr>
                        ))
                      )
                    )}
                  </tbody>
                  <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-800 text-slate-900">
                    {reportCategory === 'LEAVE_BALANCE' ? (
                      <tr>
                        <td colSpan={4} className="p-2.5 text-center text-xs font-black">
                          الإجمالي العام لكافة الموظفين (GRAND TOTAL) - عدد: {activeList.length || employees.length}
                        </td>
                        <td className="p-2.5 text-center font-mono text-amber-900 font-black">
                          {((grandTotal.carriedOver ?? 0)).toFixed(1)} يوم
                        </td>
                        <td className="p-2.5 text-center font-mono text-blue-900 font-black">
                          {((grandTotal.accruedDays ?? 0)).toFixed(1)} يوم
                        </td>
                        <td className="p-2.5 text-center font-mono text-purple-900 font-black">
                          {((grandTotal.totalAvailable ?? 0)).toFixed(1)} يوم
                        </td>
                        <td className="p-2.5 text-center font-mono text-rose-700 font-black">
                          {((grandTotal.paidConsumed ?? grandTotal.totalDays ?? 0)).toFixed(1)} يوم
                        </td>
                        <td className="p-2.5 text-center font-mono text-emerald-800 font-black bg-emerald-100/60">
                          {((grandTotal.remainingDays ?? 0)).toFixed(1)} يوم
                        </td>
                        <td className="p-2.5 text-center font-mono text-slate-700 font-black">
                          {((grandTotal.excessUnpaid ?? 0)).toFixed(1)} يوم
                        </td>
                        <td className="p-2.5 text-center text-[10px] text-emerald-800 font-bold">معتمد</td>
                      </tr>
                    ) : (
                      pivotData.length > 0 && (
                        <tr>
                          <td colSpan={2} className="p-2.5 text-center text-xs font-black">الإجمالي العام (GRAND TOTAL)</td>
                          <td className="p-2.5 text-center font-mono text-purple-900 font-black">
                            {pivotData.reduce((s, r) => s + (r.recordsCount ?? r.count ?? 1), 0)}
                          </td>
                          {effectiveMeasures.map(m => (
                            <td key={m.id} className="p-2.5 text-center text-xs font-black">
                              {formatMeasureValue(grandTotal[m.id], m)}
                            </td>
                          ))}
                        </tr>
                      )
                    )}
                  </tfoot>
                </table>
              </div>
            )}

            {/* 5. Official Legal Compliance Note */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[10px] text-slate-600 space-y-1">
              <p className="font-bold text-slate-800">إشعار الامتثال لقانون العمل الكويتي (رقم 6 لسنة 2010):</p>
              <p>• يستحق العامل إجازة سنوية مدفوعة الأجر مدتها 30 يوماً عن كل سنة عمل فعلية، وتحسب بواقع 2.5 يوم عن كل شهر خدمة مستحق.</p>
              <p>• يتم استهلاك رصيد الإجازات بنظام الوارد أولاً يصرف أولاً (FIFO) بخصم الرصيد المرحل من الأعوام السابقة أولاً، ثم الاستحقاق الدوري للعام الحالي.</p>
            </div>

            {/* 6. Official Signatures Footer */}
            <div className="grid grid-cols-4 gap-4 text-center text-xs pt-8 border-t border-slate-300">
              <div>
                <p className="font-bold text-slate-800">إعداد / المحاسب</p>
                <p className="text-slate-400 mt-8 text-[10px]">التوقيع: ....................</p>
              </div>
              <div>
                <p className="font-bold text-slate-800">الموارد البشرية (HR)</p>
                <p className="text-slate-400 mt-8 text-[10px]">التوقيع: ....................</p>
              </div>
              <div>
                <p className="font-bold text-slate-800">المدير العام / المفوض</p>
                <p className="text-slate-400 mt-8 text-[10px]">الختم والتوقيع: ............</p>
              </div>
              <div>
                <p className="font-bold text-slate-800">اعتماد الإدارة المالية</p>
                <p className="text-slate-400 mt-8 text-[10px]">التوقيع: ....................</p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
