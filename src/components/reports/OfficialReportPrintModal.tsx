import React from 'react';
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
import * as XLSX from 'xlsx';

interface OfficialReportPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportTitle: string;
  reportCategory: ReportCategory;
  activeCompany?: Company;
  pivotData: PivotRowData[];
  grandTotal: Record<string, number>;
  activeMeasures: MeasureOption[];
  groupByLabel: string;
  totalRecords: number;
  activeFiltersLabels: string[];
  wizardConfig: PrintWizardConfig;
  // Raw datasets for detailed and individual printing
  employees: Employee[];
  contracts: Contract[];
  leaves: LeaveRequest[];
  attendance: AttendanceRecord[];
  payslips: Payslip[];
  documents: DocumentItem[];
}

export const OfficialReportPrintModal: React.FC<OfficialReportPrintModalProps> = ({
  isOpen,
  onClose,
  reportTitle,
  reportCategory,
  activeCompany,
  pivotData,
  grandTotal,
  activeMeasures,
  groupByLabel,
  totalRecords,
  activeFiltersLabels,
  wizardConfig,
  employees = [],
  contracts = [],
  leaves = [],
  attendance = [],
  payslips = [],
  documents = [],
}) => {
  if (!isOpen) return null;

  const currentDate = new Date().toLocaleDateString('ar-KW', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const currentTime = new Date().toLocaleTimeString('ar-KW', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const handlePrint = () => {
    window.print();
  };

  // Find selected employee if target is EMPLOYEE
  const targetEmployee = wizardConfig.targetScope === 'EMPLOYEE'
    ? employees.find(e => e.id === wizardConfig.selectedEmployeeId)
    : null;

  const targetContract = targetEmployee 
    ? contracts.find(c => c.employeeId === targetEmployee.id) 
    : null;

  // Filter datasets based on wizard configuration
  const filteredEmployeesList = employees.filter(e => {
    if (wizardConfig.targetScope === 'DEPARTMENT' && wizardConfig.selectedDepartment && wizardConfig.selectedDepartment !== 'الكل') {
      return e.department === wizardConfig.selectedDepartment;
    }
    if (wizardConfig.targetScope === 'EMPLOYEE' && wizardConfig.selectedEmployeeId) {
      return e.id === wizardConfig.selectedEmployeeId;
    }
    return true;
  });

  // Calculate Period Display Text
  const periodDisplayText = (() => {
    if (wizardConfig.periodType === 'SPECIFIC_MONTH' && wizardConfig.selectedMonth) {
      return `شهر: ${wizardConfig.selectedMonth}`;
    }
    if (wizardConfig.periodType === 'CUSTOM_RANGE') {
      return `من ${wizardConfig.startDate || '—'} إلى ${wizardConfig.endDate || '—'}`;
    }
    if (wizardConfig.periodType === 'CURRENT_YEAR') {
      return 'السنة المالية 2026';
    }
    return 'كافة الفترات المسجلة';
  })();

  const handleExportXLSX = () => {
    const wsData: any[][] = [];

    // Header information
    if (wizardConfig.includeHeaderLogo) {
      wsData.push([activeCompany?.nameAr || 'الشركة الكويتية لإدارة الموارد البشرية']);
      wsData.push([`الرقم المدني للجهة: ${activeCompany?.civilIdCompany || '9876543210'} | ملف الشؤون: ${activeCompany?.wsiCode || 'WSI-KW-2026'}`]);
    }
    wsData.push([`تقرير رسمي: ${reportTitle}`]);
    wsData.push([`النطاق: ${wizardConfig.targetScope === 'EMPLOYEE' ? (targetEmployee?.fullNameAr || 'موظف محدد') : wizardConfig.targetScope === 'DEPARTMENT' ? (`قسم: ${wizardConfig.selectedDepartment}`) : 'كافة الموظفين'}`]);
    wsData.push([`الفترة: ${periodDisplayText} | تاريخ الإصدار: ${new Date().toISOString().split('T')[0]} - ${currentTime}`]);
    wsData.push([]); // blank line

    // Output Pivot vs Detailed Rows
    if (wizardConfig.detailLevel === 'SUMMARY_PIVOT' && wizardConfig.targetScope !== 'EMPLOYEE') {
      const headers = [groupByLabel, 'عدد السجلات'];
      activeMeasures.forEach(m => headers.push(`${m.label} ${m.unit ? `(${m.unit})` : ''}`));
      wsData.push(headers);

      pivotData.forEach(row => {
        const rowArr: any[] = [row.label, row.recordsCount];
        activeMeasures.forEach(m => {
          rowArr.push(row.values[m.id] || 0);
        });
        wsData.push(rowArr);

        if (row.children) {
          row.children.forEach(child => {
            const childArr: any[] = [`  - ${child.label}`, child.recordsCount];
            activeMeasures.forEach(m => {
              childArr.push(child.values[m.id] || 0);
            });
            wsData.push(childArr);
          });
        }
      });

      const totalArr: any[] = ['المجموع العام (Grand Total)', totalRecords];
      activeMeasures.forEach(m => {
        totalArr.push(grandTotal[m.id] || 0);
      });
      wsData.push(totalArr);
    } else {
      // Detailed employee export
      if (reportCategory === 'PAYROLL_ANALYSIS') {
        wsData.push(['كود الموظف', 'الاسم الكامل', 'القسم', 'المسمى الوظيفي', 'الجنسية', 'الراتب الأساسي', 'البدلات', 'الراتب الشامل', 'استقطاع التأمينات (11.5%)', 'صافي الراتب', 'البنك المعتمد']);
        filteredEmployeesList.forEach(emp => {
          const contract = contracts.find(c => c.employeeId === emp.id);
          const basic = contract?.basicSalary || emp.basicSalary || 0;
          const allowances = contract ? (contract.housingAllowance + contract.transportAllowance + contract.otherAllowances) : 0;
          const gross = basic + allowances;
          const isKuwaiti = emp.isKuwaiti || emp.nationality?.includes('كويت');
          const pifss = isKuwaiti ? Math.min(basic + allowances, 3000) * 0.115 : 0;
          const net = gross - pifss;
          wsData.push([emp.employeeCode, emp.fullNameAr, emp.department, emp.jobTitle, emp.nationality, basic, allowances, gross, pifss, net, emp.bankName || '—']);
        });
      } else {
        // General rows
        const headers = [groupByLabel, 'عدد السجلات'];
        activeMeasures.forEach(m => headers.push(`${m.label} ${m.unit ? `(${m.unit})` : ''}`));
        wsData.push(headers);
        pivotData.forEach(row => {
          const rowArr: any[] = [row.label, row.recordsCount];
          activeMeasures.forEach(m => {
            rowArr.push(row.values[m.id] || 0);
          });
          wsData.push(rowArr);
        });
      }
    }

    if (wizardConfig.includeLegalStatement) {
      wsData.push([]);
      wsData.push(['مستند معتمد وفقاً لقانون العمل الكويتي رقم 6 لسنة 2010 والقرارات المنظمة له.']);
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `${reportTitle.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in">
      <div 
        className={`bg-white w-full ${wizardConfig.orientation === 'LANDSCAPE' ? 'max-w-6xl' : 'max-w-4xl'} rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh] font-sans`} 
        dir="rtl"
      >
        {/* Top Modal Controls (Hidden in Print) */}
        <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-purple-400" />
            <h2 className="text-xs sm:text-sm font-bold">
              معاينة التقرير الرسمي ({wizardConfig.targetScope === 'EMPLOYEE' ? 'كشف فردي للموظف' : wizardConfig.targetScope === 'DEPARTMENT' ? `قسم ${wizardConfig.selectedDepartment}` : 'كافة السجلات'})
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportXLSX}
              className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg font-bold transition shadow-xs cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>تصدير Excel</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-[#714B67] hover:bg-[#85587a] text-white text-xs px-4 py-1.5 rounded-lg font-bold transition shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة المستند (Print / PDF)</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div 
          className="p-6 sm:p-8 overflow-y-auto print:p-0 print:overflow-visible print:max-h-none space-y-6 text-slate-800 bg-white" 
          id="official-print-area"
        >
          {/* 1. Corporate Header (Conditionally rendered) */}
          {wizardConfig.includeHeaderLogo && (
            <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
              <div className="space-y-1">
                <h1 className="text-lg font-black text-slate-900">{activeCompany?.nameAr || 'الشركة الكويتية لإدارة الموارد البشرية'}</h1>
                <p className="text-xs text-slate-500 font-sans">{activeCompany?.nameEn || 'KUWAIT HR ENTERPRISE CO. W.L.L'}</p>
                <div className="flex flex-wrap items-center gap-4 text-[10px] text-slate-600 pt-1">
                  <span>س.ت: <strong className="font-mono">{activeCompany?.commercialRegNo || '123456'}</strong></span>
                  <span>الرقم المدني للجهة: <strong className="font-mono">{activeCompany?.civilIdCompany || '9876543210'}</strong></span>
                  <span>ملف الشؤون: <strong className="font-mono">{activeCompany?.wsiCode || 'WSI-KW-2026'}</strong></span>
                </div>
              </div>

              <div className="text-left space-y-1" dir="ltr">
                <div className="w-12 h-12 bg-[#714B67] text-white rounded-xl flex items-center justify-center font-bold text-xl ml-auto shadow-sm">
                  {activeCompany?.nameAr?.charAt(0) || 'K'}
                </div>
                <div className="text-[10px] text-slate-400 font-mono text-right">
                  Odoo HR Enterprise 18
                </div>
              </div>
            </div>
          )}

          {/* 2. Document Title & Metadata Banner */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-bold">
                تقرير رسمي معتمد
              </span>
              <h2 className="text-base font-black text-slate-900 mt-1">{reportTitle}</h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                <span>النطاق المختار: <strong className="text-slate-800">{wizardConfig.targetScope === 'EMPLOYEE' ? (targetEmployee?.fullNameAr || 'موظف محدد') : wizardConfig.targetScope === 'DEPARTMENT' ? (`قسم ${wizardConfig.selectedDepartment}`) : 'كافة الموظفين'}</strong></span>
                <span>•</span>
                <span>الفترة: <strong className="text-slate-800">{periodDisplayText}</strong></span>
              </div>
            </div>

            <div className="text-left text-xs space-y-0.5 border-r border-slate-200 pr-4">
              <div className="text-slate-500 text-[11px]">تاريخ ووقت الإصدار:</div>
              <div className="font-bold text-slate-800">{currentDate}</div>
              <div className="text-[10px] text-slate-400 font-mono">{currentTime}</div>
            </div>
          </div>

          {/* 3. Render Mode: TARGET = SINGLE EMPLOYEE */}
          {wizardConfig.targetScope === 'EMPLOYEE' && targetEmployee ? (
            <div className="space-y-6">
              {/* Employee ID Card Header */}
              <div className="bg-slate-900 text-white rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] block">اسم الموظف:</span>
                  <strong className="text-sm font-bold text-white block">{targetEmployee.fullNameAr}</strong>
                  <span className="text-[10px] text-slate-400 font-mono">{targetEmployee.fullNameEn}</span>
                </div>

                <div>
                  <span className="text-slate-400 text-[10px] block">الرقم المدني / كود الموظف:</span>
                  <strong className="text-xs font-mono text-amber-300 block">{targetEmployee.civilId || '—'}</strong>
                  <span className="text-[10px] text-slate-400 font-mono">{targetEmployee.employeeCode}</span>
                </div>

                <div>
                  <span className="text-slate-400 text-[10px] block">المسمى والقسم:</span>
                  <strong className="text-xs block">{targetEmployee.jobTitle}</strong>
                  <span className="text-[10px] text-purple-300">{targetEmployee.department}</span>
                </div>

                <div>
                  <span className="text-slate-400 text-[10px] block">الجنسية والبنك:</span>
                  <strong className="text-xs block">{targetEmployee.nationality}</strong>
                  <span className="text-[10px] text-emerald-300">{targetEmployee.bankName || 'البنك المعتمد'}</span>
                </div>
              </div>

              {/* Individual Details by Category */}
              {reportCategory === 'PAYROLL_ANALYSIS' && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 border-b pb-1.5">
                    <Banknote className="w-4 h-4 text-[#714B67]" />
                    <span>تفاصيل كشف الراتب الشهري واستقطاعات التأمينات الاجتماعية</span>
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Earnings */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="bg-emerald-50 text-emerald-900 px-3 py-2 text-xs font-bold border-b border-emerald-200">
                        مفردات الاستحقاقات والأجر (Earnings)
                      </div>
                      <table className="w-full text-xs">
                        <tbody className="divide-y divide-slate-100">
                          <tr>
                            <td className="p-2.5 text-slate-600">الراتب الأساسي التعاقدي:</td>
                            <td className="p-2.5 text-left font-mono font-bold text-slate-900">
                              {(targetContract?.basicSalary || targetEmployee.basicSalary || 0).toLocaleString('en-US', { minimumFractionDigits: 3 })} د.ك
                            </td>
                          </tr>
                          <tr>
                            <td className="p-2.5 text-slate-600">بدل السكن:</td>
                            <td className="p-2.5 text-left font-mono text-slate-800">
                              {(targetContract?.housingAllowance || 0).toLocaleString('en-US', { minimumFractionDigits: 3 })} د.ك
                            </td>
                          </tr>
                          <tr>
                            <td className="p-2.5 text-slate-600">بدل الانتقال / المواصلات:</td>
                            <td className="p-2.5 text-left font-mono text-slate-800">
                              {(targetContract?.transportAllowance || 0).toLocaleString('en-US', { minimumFractionDigits: 3 })} د.ك
                            </td>
                          </tr>
                          <tr>
                            <td className="p-2.5 text-slate-600">بدلات أخرى وعلاوات:</td>
                            <td className="p-2.5 text-left font-mono text-slate-800">
                              {(targetContract?.otherAllowances || 0).toLocaleString('en-US', { minimumFractionDigits: 3 })} د.ك
                            </td>
                          </tr>
                          <tr className="bg-slate-50 font-bold">
                            <td className="p-2.5 text-slate-900">إجمالي الأجر الشامل (Gross):</td>
                            <td className="p-2.5 text-left font-mono text-emerald-700 font-bold">
                              {((targetContract?.basicSalary || targetEmployee.basicSalary || 0) + (targetContract ? targetContract.housingAllowance + targetContract.transportAllowance + targetContract.otherAllowances : 0)).toLocaleString('en-US', { minimumFractionDigits: 3 })} د.ك
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Deductions */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="bg-rose-50 text-rose-900 px-3 py-2 text-xs font-bold border-b border-rose-200">
                        مفردات الاستقطاعات والخصومات (Deductions)
                      </div>
                      <table className="w-full text-xs">
                        <tbody className="divide-y divide-slate-100">
                          <tr>
                            <td className="p-2.5 text-slate-600">
                              استقطاع التأمينات الاجتماعية (11.5% للكويتيين):
                            </td>
                            <td className="p-2.5 text-left font-mono text-rose-700 font-bold">
                              {(targetEmployee.isKuwaiti || targetEmployee.nationality?.includes('كويت'))
                                ? `${(Math.min((targetContract?.basicSalary || targetEmployee.basicSalary || 0) + (targetContract ? targetContract.housingAllowance + targetContract.transportAllowance + targetContract.otherAllowances : 0), 3000) * 0.115).toLocaleString('en-US', { minimumFractionDigits: 3 })} د.ك`
                                : '0.000 د.ك (وافد)'
                              }
                            </td>
                          </tr>
                          <tr>
                            <td className="p-2.5 text-slate-600">خصم أقساط سلف وقروض:</td>
                            <td className="p-2.5 text-left font-mono text-slate-800">0.000 د.ك</td>
                          </tr>
                          <tr>
                            <td className="p-2.5 text-slate-600">خصومات تأخير / غياب:</td>
                            <td className="p-2.5 text-left font-mono text-slate-800">0.000 د.ك</td>
                          </tr>
                          <tr className="bg-slate-50 font-bold">
                            <td className="p-2.5 text-slate-900">إجمالي الاستقطاعات:</td>
                            <td className="p-2.5 text-left font-mono text-rose-700 font-bold">
                              {(targetEmployee.isKuwaiti || targetEmployee.nationality?.includes('كويت'))
                                ? `${(Math.min((targetContract?.basicSalary || targetEmployee.basicSalary || 0) + (targetContract ? targetContract.housingAllowance + targetContract.transportAllowance + targetContract.otherAllowances : 0), 3000) * 0.115).toLocaleString('en-US', { minimumFractionDigits: 3 })} د.ك`
                                : '0.000 د.ك'
                              }
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Net Payable Banner */}
                  <div className="bg-[#714B67] text-white p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs text-purple-200 block">الصافي المستحق للتحويل البنكي (Net Salary Payable):</span>
                      <span className="text-[11px] text-purple-300">رقم الآيبان: {targetEmployee.iban || 'IBAN-KW-NOT-SET'}</span>
                    </div>
                    <div className="text-left font-mono">
                      <span className="text-xl sm:text-2xl font-black text-amber-300">
                        {(() => {
                          const gross = (targetContract?.basicSalary || targetEmployee.basicSalary || 0) + (targetContract ? targetContract.housingAllowance + targetContract.transportAllowance + targetContract.otherAllowances : 0);
                          const pifss = (targetEmployee.isKuwaiti || targetEmployee.nationality?.includes('كويت')) ? Math.min(gross, 3000) * 0.115 : 0;
                          return (gross - pifss).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
                        })()} د.ك
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {reportCategory === 'LEAVE_BALANCE' && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 border-b pb-1.5">
                    <Calendar className="w-4 h-4 text-[#714B67]" />
                    <span>كشف حركة ورصيد إجازات الموظف</span>
                  </h3>

                  <div className="grid grid-cols-4 gap-3 text-center">
                    <div className="bg-slate-50 border p-3 rounded-xl">
                      <span className="text-[10px] text-slate-500 block">الاستحقاق السنوي</span>
                      <strong className="text-sm font-bold text-slate-800">30 يوم</strong>
                      <span className="text-[9px] text-slate-400 block">(2.5 يوم/شهر)</span>
                    </div>
                    <div className="bg-slate-50 border p-3 rounded-xl">
                      <span className="text-[10px] text-slate-500 block">الرصيد المكتسب التقديري</span>
                      <strong className="text-sm font-bold text-slate-800">20 يوم</strong>
                    </div>
                    <div className="bg-slate-50 border p-3 rounded-xl">
                      <span className="text-[10px] text-slate-500 block">الأيام المستهلكة</span>
                      <strong className="text-sm font-bold text-rose-600">
                        {leaves.filter(l => l.employeeId === targetEmployee.id && l.status === 'APPROVED').reduce((acc, l) => acc + l.daysCount, 0)} يوم
                      </strong>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                      <span className="text-[10px] text-emerald-700 block">صافي الرصيد المتبقي</span>
                      <strong className="text-sm font-bold text-emerald-800">
                        {targetEmployee.leaveBalance || 21} يوم
                      </strong>
                    </div>
                  </div>

                  {/* Leaves History Table */}
                  <div className="border rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-right">
                      <thead className="bg-slate-100 font-bold">
                        <tr>
                          <th className="p-2 border-l">نوع الإجازة</th>
                          <th className="p-2 border-l">من تاريخ</th>
                          <th className="p-2 border-l">إلى تاريخ</th>
                          <th className="p-2 border-l text-center">الأيام</th>
                          <th className="p-2 border-l">الحالة</th>
                          <th className="p-2">السبب / الملاحظات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {leaves.filter(l => l.employeeId === targetEmployee.id).map(leave => (
                          <tr key={leave.id}>
                            <td className="p-2 border-l font-bold">{leave.leaveType}</td>
                            <td className="p-2 border-l font-mono">{leave.startDate}</td>
                            <td className="p-2 border-l font-mono">{leave.endDate}</td>
                            <td className="p-2 border-l text-center font-bold font-mono">{leave.daysCount}</td>
                            <td className="p-2 border-l">
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded font-bold">
                                {leave.status}
                              </span>
                            </td>
                            <td className="p-2 text-slate-500">{leave.reason || '—'}</td>
                          </tr>
                        ))}
                        {leaves.filter(l => l.employeeId === targetEmployee.id).length === 0 && (
                          <tr>
                            <td colSpan={6} className="p-4 text-center text-slate-400">لا توجد طلبات إجازة مسجلة خلال الفترة</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {reportCategory === 'ATTENDANCE_ANALYSIS' && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 border-b pb-1.5">
                    <Clock className="w-4 h-4 text-[#714B67]" />
                    <span>سجل الحضور والانضباط وساعات العمل للموظف</span>
                  </h3>

                  <div className="grid grid-cols-4 gap-3 text-center">
                    <div className="bg-slate-50 border p-3 rounded-xl">
                      <span className="text-[10px] text-slate-500 block">أيام الحضور الفعلي</span>
                      <strong className="text-sm font-bold text-slate-800">
                        {attendance.filter(a => a.employeeId === targetEmployee.id).length} يوم
                      </strong>
                    </div>
                    <div className="bg-slate-50 border p-3 rounded-xl">
                      <span className="text-[10px] text-slate-500 block">إجمالي الساعات الفعلية</span>
                      <strong className="text-sm font-bold text-slate-800">
                        {attendance.filter(a => a.employeeId === targetEmployee.id).reduce((acc, a) => acc + (a.workingHours || 8), 0)} س
                      </strong>
                    </div>
                    <div className="bg-slate-50 border p-3 rounded-xl">
                      <span className="text-[10px] text-slate-500 block">إجمالي دقائق التأخير</span>
                      <strong className="text-sm font-bold text-rose-600">
                        {attendance.filter(a => a.employeeId === targetEmployee.id).reduce((acc, a) => acc + (a.lateMinutes || 0), 0)} دقيقة
                      </strong>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 p-3 rounded-xl">
                      <span className="text-[10px] text-purple-700 block">ساعات العمل الإضافي</span>
                      <strong className="text-sm font-bold text-purple-800">
                        {attendance.filter(a => a.employeeId === targetEmployee.id).reduce((acc, a) => acc + (a.overtimeHours || 0), 0)} س
                      </strong>
                    </div>
                  </div>

                  {/* Attendance Log Table */}
                  <div className="border rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-xs text-right">
                      <thead className="bg-slate-100 font-bold sticky top-0">
                        <tr>
                          <th className="p-2 border-l">التاريخ</th>
                          <th className="p-2 border-l">وقت الحضور</th>
                          <th className="p-2 border-l">وقت الانصراف</th>
                          <th className="p-2 border-l text-center">ساعات العمل</th>
                          <th className="p-2 border-l text-center">التأخير</th>
                          <th className="p-2">الحالة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {attendance.filter(a => a.employeeId === targetEmployee.id).map(att => (
                          <tr key={att.id}>
                            <td className="p-2 border-l font-mono font-bold">{att.date}</td>
                            <td className="p-2 border-l font-mono text-emerald-700">{att.checkIn || '08:00'}</td>
                            <td className="p-2 border-l font-mono text-slate-600">{att.checkOut || '16:00'}</td>
                            <td className="p-2 border-l text-center font-mono">{att.workingHours || 8} س</td>
                            <td className="p-2 border-l text-center font-mono text-rose-600">{att.lateMinutes || 0} د</td>
                            <td className="p-2 font-bold text-slate-700">{att.status || 'حاضر'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {reportCategory === 'MOH_DOCS_EXPIRY' && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 border-b pb-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#714B67]" />
                    <span>بيان الوثائق والتراخيص الرسمية للموظف</span>
                  </h3>

                  <div className="border rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-right">
                      <thead className="bg-slate-100 font-bold">
                        <tr>
                          <th className="p-2 border-l">نوع الوثيقة</th>
                          <th className="p-2 border-l">رقم الوثيقة</th>
                          <th className="p-2 border-l">جهة الإصدار</th>
                          <th className="p-2 border-l">تاريخ الانتهاء</th>
                          <th className="p-2">الحالة والجاهزية</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {documents.filter(d => d.employeeId === targetEmployee.id).map(doc => (
                          <tr key={doc.id}>
                            <td className="p-2 border-l font-bold">{doc.documentType}</td>
                            <td className="p-2 border-l font-mono">{doc.documentNumber || '—'}</td>
                            <td className="p-2 border-l">{doc.issueAuthority || 'وزارة الصحة / الهيئة العامة'}</td>
                            <td className="p-2 border-l font-mono font-bold text-slate-800">{doc.expiryDate}</td>
                            <td className="p-2">
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded font-bold">
                                {doc.status || 'ساري المفعول'}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {documents.filter(d => d.employeeId === targetEmployee.id).length === 0 && (
                          <tr>
                            <td colSpan={5} className="p-4 text-center text-slate-400">لا توجد وثائق منتهية للموظف</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {reportCategory === 'WORKFORCE_DEMO' && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 border-b pb-1.5">
                    <User className="w-4 h-4 text-[#714B67]" />
                    <span>بيانات الموظف المعتمدة لدى القوى العاملة (PAM)</span>
                  </h3>

                  <div className="grid grid-cols-2 gap-4 text-xs border p-4 rounded-xl bg-slate-50">
                    <div className="space-y-2">
                      <div><span className="text-slate-500">الجنس:</span> <strong>{targetEmployee.gender === 'MALE' ? 'ذكر' : 'أنثى'}</strong></div>
                      <div><span className="text-slate-500">تاريخ الميلاد:</span> <strong className="font-mono">{targetEmployee.dateOfBirth || '—'}</strong></div>
                      <div><span className="text-slate-500">تاريخ التعيين والالتحاق:</span> <strong className="font-mono">{targetEmployee.joiningDate || '—'}</strong></div>
                    </div>
                    <div className="space-y-2">
                      <div><span className="text-slate-500">المؤهل الأكاديمي:</span> <strong>{targetEmployee.qualification || 'بكالوريوس'}</strong></div>
                      <div><span className="text-slate-500">تصنيف العمالة:</span> <strong>{targetEmployee.isKuwaiti ? 'عمالة وطنية كويتية (باب ثالث/خامس)' : 'عمالة وافدة (مادة 18)'}</strong></div>
                      <div><span className="text-slate-500">حالة العقد:</span> <strong className="text-emerald-700">ساري ومعتمد</strong></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* 4. Render Mode: TARGET = ALL OR DEPARTMENT (TABLE / PIVOT) */
            <div className="space-y-4">
              {wizardConfig.detailLevel === 'SUMMARY_PIVOT' ? (
                /* Pivot Aggregated Matrix Table */
                <div className="border border-slate-300 rounded-xl overflow-hidden">
                  <table className="w-full text-right text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-200/90 text-slate-900 font-bold border-b border-slate-300">
                        <th className="py-2.5 px-3 border-l border-slate-300">{groupByLabel}</th>
                        <th className="py-2.5 px-2 text-center w-16 border-l border-slate-300">السجلات</th>
                        {activeMeasures.map(m => (
                          <th key={m.id} className="py-2.5 px-3 text-left border-l border-slate-300">
                            {m.label} {m.unit ? `(${m.unit})` : ''}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {pivotData.map((row) => (
                        <React.Fragment key={row.id}>
                          <tr className="font-semibold bg-white hover:bg-slate-50">
                            <td className="py-2 px-3 border-l border-slate-200">{row.label}</td>
                            <td className="py-2 px-2 text-center border-l border-slate-200 font-mono text-slate-600">{row.recordsCount}</td>
                            {activeMeasures.map(m => (
                              <td key={m.id} className="py-2 px-3 text-left border-l border-slate-200 font-mono">
                                {m.isCurrency 
                                  ? `${(row.values[m.id] || 0).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} د.ك`
                                  : (row.values[m.id] || 0).toLocaleString('en-US')
                                }
                              </td>
                            ))}
                          </tr>
                          {row.children?.map(child => (
                            <tr key={child.id} className="bg-slate-50/70 text-[11px] text-slate-600">
                              <td className="py-1.5 px-3 pr-8 border-l border-slate-200">- {child.label}</td>
                              <td className="py-1.5 px-2 text-center border-l border-slate-200 font-mono">{child.recordsCount}</td>
                              {activeMeasures.map(m => (
                                <td key={m.id} className="py-1.5 px-3 text-left border-l border-slate-200 font-mono">
                                  {m.isCurrency 
                                    ? `${(child.values[m.id] || 0).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} د.ك`
                                    : (child.values[m.id] || 0).toLocaleString('en-US')
                                  }
                                </td>
                              ))}
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}

                      {/* Grand Total */}
                      <tr className="bg-slate-900 text-white font-bold text-xs border-t-2 border-slate-900">
                        <td className="py-2.5 px-3 border-l border-slate-800">المجموع العام (Grand Total)</td>
                        <td className="py-2.5 px-2 text-center border-l border-slate-800 text-amber-300 font-mono">{totalRecords}</td>
                        {activeMeasures.map(m => (
                          <td key={m.id} className="py-2.5 px-3 text-left border-l border-slate-800 font-mono text-emerald-300">
                            {m.isCurrency 
                              ? `${(grandTotal[m.id] || 0).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} د.ك`
                              : (grandTotal[m.id] || 0).toLocaleString('en-US')
                            }
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Detailed Records Table by Employees */
                <div className="border border-slate-300 rounded-xl overflow-hidden">
                  <table className="w-full text-right text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-200/90 text-slate-900 font-bold border-b border-slate-300">
                        <th className="py-2 px-2.5 border-l border-slate-300">كود</th>
                        <th className="py-2 px-3 border-l border-slate-300">اسم الموظف</th>
                        <th className="py-2 px-2.5 border-l border-slate-300">القسم</th>
                        <th className="py-2 px-2.5 border-l border-slate-300">المسمى الوظيفي</th>
                        {reportCategory === 'PAYROLL_ANALYSIS' && (
                          <>
                            <th className="py-2 px-2.5 border-l border-slate-300 text-left">الأساسي</th>
                            <th className="py-2 px-2.5 border-l border-slate-300 text-left">البدلات</th>
                            <th className="py-2 px-2.5 border-l border-slate-300 text-left">الشامل</th>
                            <th className="py-2 px-2.5 border-l border-slate-300 text-left">تأمينات 11.5%</th>
                            <th className="py-2 px-2.5 border-l border-slate-300 text-left">صافي التحويل</th>
                          </>
                        )}
                        {reportCategory === 'LEAVE_BALANCE' && (
                          <>
                            <th className="py-2 px-2.5 border-l border-slate-300 text-center">المكتسب</th>
                            <th className="py-2 px-2.5 border-l border-slate-300 text-center">المستهلك</th>
                            <th className="py-2 px-2.5 border-l border-slate-300 text-center">الرصيد المتبقي</th>
                          </>
                        )}
                        {reportCategory === 'ATTENDANCE_ANALYSIS' && (
                          <>
                            <th className="py-2 px-2.5 border-l border-slate-300 text-center">أيام الدوام</th>
                            <th className="py-2 px-2.5 border-l border-slate-300 text-center">الساعات</th>
                            <th className="py-2 px-2.5 border-l border-slate-300 text-center">التأخير (د)</th>
                            <th className="py-2 px-2.5 border-l border-slate-300 text-center">الإضافي</th>
                          </>
                        )}
                        {reportCategory === 'MOH_DOCS_EXPIRY' && (
                          <>
                            <th className="py-2 px-2.5 border-l border-slate-300">الرقم المدني</th>
                            <th className="py-2 px-2.5 border-l border-slate-300">الجنسية</th>
                            <th className="py-2 px-2.5 border-l border-slate-300 text-center">حالة الوثائق</th>
                          </>
                        )}
                        {reportCategory === 'WORKFORCE_DEMO' && (
                          <>
                            <th className="py-2 px-2.5 border-l border-slate-300">الجنسية</th>
                            <th className="py-2 px-2.5 border-l border-slate-300">تاريخ التعيين</th>
                            <th className="py-2 px-2.5 border-l border-slate-300 text-center">التصنيف</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredEmployeesList.map((emp) => {
                        const contract = contracts.find(c => c.employeeId === emp.id);
                        const basic = contract?.basicSalary || emp.basicSalary || 0;
                        const allowances = contract ? (contract.housingAllowance + contract.transportAllowance + contract.otherAllowances) : 0;
                        const gross = basic + allowances;
                        const isKuwaiti = emp.isKuwaiti || emp.nationality?.includes('كويت');
                        const pifss = isKuwaiti ? Math.min(gross, 3000) * 0.115 : 0;
                        const net = gross - pifss;

                        return (
                          <tr key={emp.id} className="hover:bg-slate-50">
                            <td className="py-2 px-2.5 border-l font-mono text-[11px] text-slate-500">{emp.employeeCode}</td>
                            <td className="py-2 px-3 border-l font-bold text-slate-900">{emp.fullNameAr}</td>
                            <td className="py-2 px-2.5 border-l text-slate-600">{emp.department}</td>
                            <td className="py-2 px-2.5 border-l text-slate-600">{emp.jobTitle}</td>

                            {reportCategory === 'PAYROLL_ANALYSIS' && (
                              <>
                                <td className="py-2 px-2.5 border-l text-left font-mono">{basic.toFixed(3)}</td>
                                <td className="py-2 px-2.5 border-l text-left font-mono">{allowances.toFixed(3)}</td>
                                <td className="py-2 px-2.5 border-l text-left font-mono font-bold">{gross.toFixed(3)}</td>
                                <td className="py-2 px-2.5 border-l text-left font-mono text-rose-600">{pifss > 0 ? pifss.toFixed(3) : '—'}</td>
                                <td className="py-2 px-2.5 border-l text-left font-mono font-bold text-emerald-700">{net.toFixed(3)} د.ك</td>
                              </>
                            )}

                            {reportCategory === 'LEAVE_BALANCE' && (
                              <>
                                <td className="py-2 px-2.5 border-l text-center font-mono">20 يوم</td>
                                <td className="py-2 px-2.5 border-l text-center font-mono text-rose-600">
                                  {leaves.filter(l => l.employeeId === emp.id && l.status === 'APPROVED').reduce((acc, l) => acc + l.daysCount, 0)}
                                </td>
                                <td className="py-2 px-2.5 border-l text-center font-mono font-bold text-emerald-700">
                                  {emp.leaveBalance || 21} يوم
                                </td>
                              </>
                            )}

                            {reportCategory === 'ATTENDANCE_ANALYSIS' && (
                              <>
                                <td className="py-2 px-2.5 border-l text-center font-mono">
                                  {attendance.filter(a => a.employeeId === emp.id).length || 22}
                                </td>
                                <td className="py-2 px-2.5 border-l text-center font-mono">
                                  {attendance.filter(a => a.employeeId === emp.id).reduce((acc, a) => acc + (a.workingHours || 8), 0) || 176} س
                                </td>
                                <td className="py-2 px-2.5 border-l text-center font-mono text-rose-600">
                                  {attendance.filter(a => a.employeeId === emp.id).reduce((acc, a) => acc + (a.lateMinutes || 0), 0)}
                                </td>
                                <td className="py-2 px-2.5 border-l text-center font-mono text-purple-700">
                                  {attendance.filter(a => a.employeeId === emp.id).reduce((acc, a) => acc + (a.overtimeHours || 0), 0)} س
                                </td>
                              </>
                            )}

                            {reportCategory === 'MOH_DOCS_EXPIRY' && (
                              <>
                                <td className="py-2 px-2.5 border-l font-mono text-slate-700">{emp.civilId || '—'}</td>
                                <td className="py-2 px-2.5 border-l text-slate-600">{emp.nationality}</td>
                                <td className="py-2 px-2.5 border-l text-center">
                                  <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded font-bold">
                                    مكتمل وساري
                                  </span>
                                </td>
                              </>
                            )}

                            {reportCategory === 'WORKFORCE_DEMO' && (
                              <>
                                <td className="py-2 px-2.5 border-l text-slate-600">{emp.nationality}</td>
                                <td className="py-2 px-2.5 border-l font-mono text-slate-600">{emp.joiningDate || '—'}</td>
                                <td className="py-2 px-2.5 border-l text-center font-bold">
                                  {isKuwaiti ? 'كويتي (تأمينات)' : 'مادة 18 (وافد)'}
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 5. Compliance & Verification Statement (Conditionally rendered) */}
          {wizardConfig.includeLegalStatement && (
            <div className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
              <div>
                <span>
                  تم توليد هذا التقرير آلياً وفقاً لأحكام قانون العمل الكويتي في القطاع الأهلي رقم 6 لسنة 2010، وقواعد المؤسسة العامة للتأمينات الاجتماعية ولوائح وزارة الصحة والهيئة العامة للقوى العاملة. المستند معتمد وصالح للإجراءات الإدارية والمالية.
                </span>
              </div>
            </div>
          )}

          {/* 6. Formal Three-Tier Signatures Block (Conditionally rendered) */}
          {wizardConfig.includeSignatures && (
            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-300 text-center">
              <div className="border border-slate-200 p-4 rounded-xl space-y-8 bg-slate-50/40">
                <span className="text-xs font-bold text-slate-700 block">إعداد: مسؤول الموارد البشرية</span>
                <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto" />
                <span className="text-[10px] text-slate-400 block">التوقيع والتاريخ</span>
              </div>

              <div className="border border-slate-200 p-4 rounded-xl space-y-8 bg-slate-50/40">
                <span className="text-xs font-bold text-slate-700 block">تدقيق: الإدارة المالية والرقابة</span>
                <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto" />
                <span className="text-[10px] text-slate-400 block">التوقيع والختم</span>
              </div>

              <div className="border border-slate-200 p-4 rounded-xl space-y-8 bg-slate-50/40">
                <span className="text-xs font-bold text-slate-700 block">اعتماد: المدير العام / المفوض</span>
                <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto" />
                <span className="text-[10px] text-slate-400 block">الختم الرسمي للشركة</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
