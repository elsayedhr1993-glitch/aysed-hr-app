import React, { useRef } from 'react';
import { printDocument, exportElementToPdf } from '../../utils/printUtils';
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
}) => {
  const effectiveMeasures = activeMeasures || selectedMeasures || [];
  const printAreaRef = useRef<HTMLDivElement>(null);
  
  const handlePrint = async () => {
    await printDocument('official-report-print-area', reportTitle);
  };

  if (!isOpen) return null;

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);

  const formatMeasureValue = (val: number | undefined, measure: MeasureOption) => {
    if (val === undefined || val === null) return '-';
    
    // 1. If explicitly currency (KWD)
    if (measure.isCurrency) {
      return (
        <span dir="ltr" className="inline-flex items-center gap-1">
          <span className="font-mono">{val.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</span>
          <span className="font-sans text-[10px] text-slate-500 font-bold">د.ك</span>
        </span>);
    }

    // 2. If day / hour / minute unit
    if (measure.unit === 'يوم' || measure.unit === 'ساعة' || measure.unit === 'دقيقة') {
      const isNegative = val < 0;
      return (
        <span dir="ltr" className={`inline-flex items-center gap-1 font-mono font-bold ${isNegative ? 'text-rose-600' : ''}`}>
          <span>{val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}</span>
          <span className="font-sans text-[10px] text-slate-500 font-normal">{measure.unit}</span>
        </span>);
    }

    // 3. Count or standard integer
    if (measure.id === 'count' || measure.field === 'count' || measure.label?.includes('عدد')) {
      return (
        <span dir="ltr" className="font-mono font-bold">
          {val.toLocaleString('en-US', { maximumFractionDigits: 0 })}
        </span>);
    }

    // 4. Default number
    return (
      <span dir="ltr" className="font-mono">
        {val.toLocaleString('en-US', { maximumFractionDigits: 2 })}
      </span>);
  };


  const handleExportExcel = () => {
    const wsData = pivotData.map((row, idx) => {
      const rowObj: Record<string, any> = {
        '#': idx + 1,
        'البيان / الموظف': row.label,
        'العدد': row.recordsCount ?? row.count ?? 1,
      };
      effectiveMeasures.forEach(m => {
        rowObj[m.label] = row.values[m.id] || 0;
      });
      return rowObj;
    });

    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `${reportTitle}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[95vh] flex flex-col border border-slate-300 overflow-hidden font-sans">
        
        {/* Actions Bar (Top) */}
        <div className="bg-slate-100 border-b border-slate-200 p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <span className="bg-[#714B67] text-white text-xs font-bold px-2.5 py-1 rounded-md">
              معاينة التقرير الرسمي
            </span>
            <h3 className="font-bold text-slate-800 text-sm truncate max-w-md">{reportTitle}</h3>
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
                <h2 className="text-xl font-bold text-slate-900">{activeCompany?.nameAr || 'مؤسسة الكويت الرقمية'}</h2>
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs">
                <div><span className="text-slate-500">اسم الموظف:</span> <strong className="text-slate-900 mr-1">{selectedEmployee.fullNameAr}</strong></div>
                <div><span className="text-slate-500">كود الموظف:</span> <strong className="font-mono text-slate-900 mr-1">{selectedEmployee.employeeCode}</strong></div>
                <div><span className="text-slate-500">الرقم المدني:</span> <strong className="font-mono text-slate-900 mr-1">{selectedEmployee.civilId || '—'}</strong></div>
                <div><span className="text-slate-500">المسمى:</span> <span className="text-slate-800 mr-1">{selectedEmployee.jobTitle}</span></div>
              </div>)}

            {/* 3. Main Data Table */}
            <div className="overflow-hidden border border-slate-300 rounded-md">
              <table className="w-full text-xs text-right border-collapse">
                <thead className="bg-slate-800 text-white font-bold">
                  <tr>
                    <th className="p-2.5 border-l border-slate-700 w-12 text-center">#</th>
                    <th className="p-2.5 border-l border-slate-700">البيان / الفئة</th>
                    <th className="p-2.5 border-l border-slate-700 text-center w-20">العدد</th>
                    {effectiveMeasures.map(m => (
                      <th key={m.id} className="p-2.5 border-l border-slate-700 text-center font-bold">
                        {m.label}
                      </th>))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {pivotData.length === 0 ? (
                    <tr>
                      <td colSpan={3 + effectiveMeasures.length} className="p-8 text-center text-slate-400 font-bold">
                        لا توجد بيانات مطابقة لهذا التقرير
                      </td>
                    </tr>) : (
                    pivotData.map((row, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                        <td className="p-2.5 border-l border-slate-200 text-center font-mono text-slate-500">{idx + 1}</td>
                        <td className="p-2.5 border-l border-slate-200 font-bold text-slate-900">{row.label}</td>
                        <td className="p-2.5 border-l border-slate-200 text-center font-mono font-bold text-purple-900">{row.recordsCount ?? row.count ?? 1}</td>
                        {effectiveMeasures.map(m => (
                          <td key={m.id} className="p-2.5 border-l border-slate-200 text-center">
                            {formatMeasureValue(row.values[m.id], m)}
                          </td>))}
                      </tr>))
                  )}
                </tbody>
                {pivotData.length > 0 && (
                  <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-800 text-slate-900">
                    <tr>
                      <td colSpan={2} className="p-2.5 text-center text-xs font-black">الإجمالي العام (GRAND TOTAL)</td>
                      <td className="p-2.5 text-center font-mono text-purple-900 font-black">
                        {pivotData.reduce((s, r) => s + (r.recordsCount ?? r.count ?? 1), 0)}
                      </td>
                      {effectiveMeasures.map(m => (
                        <td key={m.id} className="p-2.5 text-center text-xs font-black">
                          {formatMeasureValue(grandTotal[m.id], m)}
                        </td>))}
                    </tr>
                  </tfoot>)}
              </table>
            </div>

            {/* 4. Official Signatures Footer */}
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
    </div>);
};