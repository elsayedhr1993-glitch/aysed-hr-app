import React, { useState, useMemo } from 'react';
import { Employee, Contract, LeaveRequest, AttendanceRecord, Company } from '../types';
import { 
  Printer, Calculator, DollarSign, Calendar, User, 
  FileText, ShieldCheck, Download, Loader2 
} from 'lucide-react';
import { printDocument, exportElementToPdf } from '../utils/printUtils';
import { get_aysed_settlement_report_data, calculateAysedLeaveByJoiningDate, get_aysed_official_balance } from '../utils/kuwaitLaw';

interface LeaveSettlementCalculatorProps {
  employees: Employee[];
  contracts?: Contract[];
  leaves?: LeaveRequest[];
  attendance?: AttendanceRecord[];
  activeCompany?: Company;
  preSelectedEmployeeId?: string;
}

export const LeaveSettlementCalculator: React.FC<LeaveSettlementCalculatorProps> = ({
  employees = [],
  contracts = [],
  leaves = [],
  attendance = [],
  activeCompany,
  preSelectedEmployeeId,
}) => {
  const [selectedEmpId, setSelectedEmpId] = useState<string>(preSelectedEmployeeId || (employees[0]?.id ?? ''));
  const [leaveDaysInput, setLeaveDaysInput] = useState<number>(30);
  const [ticketAllowanceInput, setTicketAllowanceInput] = useState<number>(150);
  const [deductionsInput, setDeductionsInput] = useState<number>(0);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const selectedEmp = useMemo(() => {
    return employees.find(e => e.id === selectedEmpId) || employees[0];
  }, [employees, selectedEmpId]);

  const selectedContract = useMemo(() => {
    if (!selectedEmp) return null;
    return contracts.find(c => c.employeeId === selectedEmp.id && c.status === 'RUNNING') ||
           contracts.find(c => c.employeeId === selectedEmp.id);
  }, [contracts, selectedEmp]);

  // الحسبة المالية المعتمدة عبر دالة أودو المعيارية get_aysed_settlement_report_data وتاريخ المباشرة
  const basicSalary = selectedContract?.basicSalary || (selectedEmp as any)?.basicSalary || 0;
  const allowances = selectedContract 
    ? (selectedContract.housingAllowance || 0) + (selectedContract.transportAllowance || 0) + (selectedContract.otherAllowance || selectedContract.otherAllowances || 0)
    : 0;
  const grossSalary = basicSalary + allowances;

  const settlementData = useMemo(() => {
    const opening = selectedEmp?.openingLeaveBalance ?? (selectedEmp as any)?.carriedOverLeave2025 ?? 0;
    const accrued = selectedEmp ? get_aysed_official_balance(selectedEmp.joinDate || (selectedEmp as any).date_start) : 0;
    const balance = opening + accrued;
    const res = get_aysed_settlement_report_data(balance, leaveDaysInput, grossSalary);
    return res || {
      total_accrued: balance,
      requested_days: leaveDaysInput,
      available_paid: balance,
      aysed_paid_days: Math.min(leaveDaysInput, balance),
      aysed_unpaid_days: Math.max(0, leaveDaysInput - balance),
      daily_wage: grossSalary / 26,
      paid_amount: Math.min(leaveDaysInput, balance) * (grossSalary / 26)
    };
  }, [selectedEmp, leaveDaysInput, grossSalary]);

  const dailyWage = settlementData?.daily_wage ?? (grossSalary / 26);
  const leavePay = settlementData?.paid_amount ?? 0;
  const netPayable = leavePay + ticketAllowanceInput - deductionsInput;

  const handlePrint = () => {
    printDocument('leave-clearance-print-area', `سند_تسوية_إجازة_${selectedEmp?.fullNameAr || 'موظف'}`);
  };

  const handlePdfExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      await exportElementToPdf('leave-clearance-print-area', `سند_تسوية_إجازة_${selectedEmp?.fullNameAr || 'موظف'}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl" style={{ fontFamily: "'Cairo', 'Segoe UI', Tahoma, sans-serif" }}>
      {/* تضمين خطوط Google Fonts القياسية لحل تشوه الأصفار والحروف */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&family=Roboto+Mono:wght@500;700&display=swap');
        .num-font {
          font-family: 'Roboto Mono', Consolas, monospace !important;
          font-variant-numeric: tabular-nums;
        }
        .arabic-text {
          font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif !important;
          letter-spacing: normal !important;
          word-spacing: normal !important;
        }
      `}</style>

      {/* شريط التحكم والتعديل السريع (يختفي أثناء الطباعة) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1 arabic-text">الموظف:</label>
            <select
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#714B67] arabic-text"
            >
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.fullNameAr} ({emp.employeeCode})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1 arabic-text">أيام الإجازة:</label>
            <input
              type="number"
              value={leaveDaysInput}
              onChange={(e) => setLeaveDaysInput(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-20 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs num-font font-bold text-center outline-none focus:ring-2 focus:ring-[#714B67]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1 arabic-text">بدل التذاكر (د.ك):</label>
            <input
              type="number"
              value={ticketAllowanceInput}
              onChange={(e) => setTicketAllowanceInput(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-24 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs num-font font-bold text-center outline-none focus:ring-2 focus:ring-[#714B67]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1 arabic-text">استقطاعات / سلف (د.ك):</label>
            <input
              type="number"
              value={deductionsInput}
              onChange={(e) => setDeductionsInput(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-24 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs num-font font-bold text-center outline-none focus:ring-2 focus:ring-[#714B67]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePdfExport}
            disabled={isExporting}
            className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-50 arabic-text"
          >
            {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            <span>تحميل PDF</span>
          </button>

          <button
            onClick={handlePrint}
            className="bg-[#714B67] hover:bg-[#583950] text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-xs arabic-text"
          >
            <Printer className="w-4 h-4 text-amber-300" />
            <span>طباعة المستند الرسمي</span>
          </button>
        </div>
      </div>

      {/* منطقة المستند الرسمي المعتمد (Enterprise PDF Layout طبقاً لنموذج Odoo) */}
      <div 
        id="leave-clearance-print-area" 
        className="p-8 sm:p-10 bg-white text-slate-900 text-right max-w-4xl mx-auto border border-slate-300 rounded-xl shadow-sm print:border-none print:shadow-none print:p-0"
        style={{ direction: 'rtl', textAlign: 'right', fontFamily: "'Cairo', sans-serif" }}
      >
        {/* ترويسة التقرير */}
        <div className="text-center border-b-2 border-[#71639e] pb-4 mb-6">
          <h2 className="text-2xl font-black text-slate-900 arabic-text">نـموذج تـسوية وتـصفية إجـازة مـوظف</h2>
          <p className="text-xs text-slate-600 font-bold mt-1 arabic-text">نـظام Aysed S HR 2026 - الكـويت</p>
        </div>

        {/* جدول البيانات الأساسية */}
        <table className="table table-sm table-bordered w-full text-xs border border-slate-300 mb-6">
          <tbody>
            <tr className="bg-slate-50">
              <td className="p-2.5 border border-slate-300 font-bold w-1/4 arabic-text">الـرقم المـدني</td>
              <td className="p-2.5 border border-slate-300 num-font font-bold w-1/4">{selectedEmp?.civilId || '-'}</td>
              <td className="p-2.5 border border-slate-300 font-bold w-1/4 arabic-text">تـاريخ المـباشرة</td>
              <td className="p-2.5 border border-slate-300 num-font w-1/4">{selectedEmp?.joinDate || selectedEmp?.joiningDate || (selectedEmp as any)?.date_start || '-'}</td>
            </tr>
            <tr>
              <td className="p-2.5 border border-slate-300 font-bold arabic-text">اسم الموظف والكود</td>
              <td className="p-2.5 border border-slate-300 font-bold text-slate-900 arabic-text" colSpan={3}>{selectedEmp?.fullNameAr} ({selectedEmp?.employeeCode})</td>
            </tr>
          </tbody>
        </table>

        {/* جـدول الأرصـدة (الـمختصر والمـفهوم) */}
        <h4 className="text-sm font-bold text-slate-900 mt-6 mb-3 arabic-text">١. مـلخص الـأرصدة (Days Summary)</h4>
        <table className="table table-bordered w-full text-xs border border-slate-300 text-center mb-6">
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa' }} className="font-bold text-slate-900 border-b border-slate-300">
              <th className="p-2.5 border border-slate-300 arabic-text">إجـمالي الـرصيد المـستحق</th>
              <th className="p-2.5 border border-slate-300 arabic-text">أيام مـدفوعة (بـراتب)</th>
              <th className="p-2.5 border border-slate-300 text-rose-700 arabic-text">أيام خـصم (بـدون راتب)</th>
              <th className="p-2.5 border border-slate-300 arabic-text">الـرصيد المـتبقي بـعد الـتصفية</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-2.5 border border-slate-300 num-font font-bold">{Number(settlementData?.total_accrued || 0).toFixed(1)} يوم</td>
              <td className="p-2.5 border border-slate-300 num-font font-bold text-blue-900">{Number(settlementData?.aysed_paid_days || 0).toFixed(1)} يوم</td>
              <td className="p-2.5 border border-slate-300 num-font font-bold text-rose-700">{Number(settlementData?.aysed_unpaid_days || 0).toFixed(1)} يوم</td>
              <td className="p-2.5 border border-slate-300 num-font font-bold text-emerald-800"><strong>{Number(Math.max(0, (settlementData?.total_accrued || 0) - (settlementData?.requested_days || 0))).toFixed(1)} يـوم</strong></td>
            </tr>
          </tbody>
        </table>

        {/* الجـدول المـالي */}
        <h4 className="text-sm font-bold text-slate-900 mt-6 mb-3 arabic-text">٢. الـتسوية المـالية (Financial Settlement)</h4>
        <table className="table table-sm w-full text-xs border border-slate-300 mb-4">
          <tbody>
            <tr className="bg-slate-100 border-b border-slate-300">
              <td className="p-3 font-bold arabic-text">إجـمالي المـبلغ المـستحق لـلإجازة ({settlementData?.aysed_paid_days || 0} يوم مدفوعة × أجر اليوم {Number(settlementData?.daily_wage ?? dailyWage ?? 0).toFixed(3)} د.ك)</td>
              <td className="p-3 text-left num-font font-bold text-base text-blue-900" dir="ltr"><strong>{Number(leavePay || 0).toFixed(3)} د.ك</strong></td>
            </tr>
            {ticketAllowanceInput > 0 && (
              <tr className="border-b border-slate-300">
                <td className="p-2.5 font-bold arabic-text">بدل تذاكر السفر المعتمد</td>
                <td className="p-2.5 text-left num-font font-bold" dir="ltr">{Number(ticketAllowanceInput || 0).toFixed(3)} د.ك</td>
              </tr>
            )}
            {deductionsInput > 0 && (
              <tr className="border-b border-slate-300 bg-rose-50/50">
                <td className="p-2.5 font-bold text-rose-800 arabic-text">استقطاعات وسلفيات مسجلة</td>
                <td className="p-2.5 text-left num-font font-bold text-rose-700" dir="ltr">-{Number(deductionsInput || 0).toFixed(3)} د.ك</td>
              </tr>
            )}
            <tr className="bg-slate-900 text-white font-bold text-sm">
              <td className="p-3 arabic-text">صافي المستحق النهائي (NET PAYABLE)</td>
              <td className="p-3 text-left num-font text-emerald-400 font-black text-base" dir="ltr">{Number(netPayable || 0).toFixed(3)} د.ك</td>
            </tr>
          </tbody>
        </table>

        <p className="small text-xs text-slate-600 mt-4 arabic-text">* تـنبيه: تـم تـرحيل الأيام بـدون راتب لـخصمها مـن مـدة الخـدمة الـقانونية.</p>

        {/* 4. الإقرار القانوني */}
        <div className="border border-slate-300 p-3 rounded-lg text-xs text-slate-700 bg-slate-50 mb-8 leading-relaxed arabic-text">
          <strong>إقرار وتعهد: </strong> أقر أنا الموقع أدناه باستلام كامل المبلغ والمستحقات الموضحة أعلاه، وبموجبه أبرئ ذمة المؤسسة من أي مستحقات عن هذه الفترة بعد التوقيع.
        </div>

        {/* 5. دورة الاعتمادات والتوقيعات الرسمية */}
        <div className="grid grid-cols-4 gap-4 text-center text-xs pt-4 border-t border-slate-300">
          <div>
            <p className="font-bold text-slate-800 arabic-text">المحاسبة</p>
            <p className="text-slate-400 mt-8 text-[10px] arabic-text">التوقيع: ....................</p>
          </div>
          <div>
            <p className="font-bold text-slate-800 arabic-text">الموارد البشرية (HR)</p>
            <p className="text-slate-400 mt-8 text-[10px] arabic-text">التوقيع: ....................</p>
          </div>
          <div>
            <p className="font-bold text-slate-800 arabic-text">المدير الاداري</p>
            <p className="text-slate-400 mt-8 text-[10px] arabic-text">الختم والتوقيع: ............</p>
          </div>
          <div>
            <p className="font-bold text-slate-800 arabic-text">توقيع واستلام الموظف</p>
            <p className="text-slate-400 mt-8 text-[10px] arabic-text">التوقيع: ....................</p>
          </div>
        </div>
      </div>
    </div>
  );
};