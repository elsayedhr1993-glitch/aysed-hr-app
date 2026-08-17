import { printDocument, exportElementToPdf } from '../utils/printUtils';
import React, { useState } from 'react';
import { Employee, Contract, LeaveRequest, AttendanceRecord, Company } from '../types';
import { formatKWD, calculateLeaveAccrualMonths } from '../utils/kuwaitLaw';
import { 
  Calculator, Calendar, User, FileText, Printer, CheckCircle2, 
  AlertTriangle, DollarSign, Plane, Building2, ShieldCheck, ArrowRight, Clock, History, Check,
  Download, Loader2
} from 'lucide-react';

interface LeaveSettlementCalculatorProps {
  employees: Employee[];
  contracts: Contract[];
  leaves: LeaveRequest[];
  attendance: AttendanceRecord[];
  activeCompany: Company;
  preSelectedEmployeeId?: string;
  onClose?: () => void;
}

export const LeaveSettlementCalculator: React.FC<LeaveSettlementCalculatorProps> = ({
  employees,
  contracts,
  leaves,
  attendance,
  activeCompany,
  preSelectedEmployeeId,
  onClose,
}) => {
  const companyEmployees = (employees || []).filter(e => e.companyId === (activeCompany?.id || 'comp-1'));
  const [selectedEmpId, setSelectedEmpId] = useState<string>(
    preSelectedEmployeeId || (companyEmployees[0]?.id || '')
  );

  const selectedEmployee = companyEmployees.find(e => e.id === selectedEmpId);
  const selectedContract = contracts.find(c => c.employeeId === selectedEmpId && c.status === 'RUNNING') 
    || contracts.find(c => c.employeeId === selectedEmpId);

  // Settlement Inputs
  const [requestedDays, setRequestedDays] = useState<number>(30);
  const [leaveStartDate, setLeaveStartDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [travelAllowance, setTravelAllowance] = useState<number>(150); // Default air ticket / travel allowance in KWD
  const [otherDeductions, setOtherDeductions] = useState<number>(0);
  const [notes, setNotes] = useState<string>('تسوية ومستحقات إجازة سنوية اعتيادية وفق قانون العمل الكويتي');

  const [showPrintablePdf, setShowPrintablePdf] = useState<boolean>(false);

  // 1. LEAVE BALANCES BREAKDOWN (الرصيد المكتسب - المستهلك براتب - المستهلك بدون راتب - صافي الرصيد المتبقي)
  const openingBalance = selectedEmployee?.openingLeaveBalance ?? selectedEmployee?.carriedOverLeave2025 ?? 0;
  const accrued2026 = selectedEmployee ? calculateLeaveAccrualMonths(selectedEmployee.joinDate) : 0;
  const earnedBalance = openingBalance + accrued2026;

  // Consumed Paid Days (Approved non-historical Annual leaves)
  const consumedPaidDays = leaves
    .filter(l => l.employeeId === selectedEmpId && l.status === 'APPROVED' && l.leaveType === 'ANNUAL' && !l.isHistorical)
    .reduce((sum, l) => sum + (l.paidDays !== undefined ? l.paidDays : (l.totalDays || 0)), 0);

  // Consumed Unpaid Days (Approved/submitted unpaid leaves + excess days)
  const consumedUnpaidDays = leaves
    .filter(l => l.employeeId === selectedEmpId && (l.status === 'APPROVED' || l.status === 'VALIDATED') && !l.isHistorical)
    .reduce((sum, l) => sum + (l.leaveType === 'UNPAID' ? (l.totalDays || 0) : (l.excessDays || 0)), 0);

  // Net Remaining Paid Balance
  const netRemainingBalance = Math.max(0, earnedBalance - consumedPaidDays);
  const balanceAfterSettlement = Math.max(0, netRemainingBalance - requestedDays);

  // 2. HISTORICAL DATA CALCULATION:
  // Find Last Return Date from previous approved leaves
  const empLeaves = leaves.filter(l => l.employeeId === selectedEmpId && l.status === 'APPROVED');
  const sortedLeavesByEndDate = [...empLeaves].sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
  const lastApprovedLeave = sortedLeavesByEndDate[0];

  let lastReturnDateText = 'أول إجازة للموظف (منذ التعيين)';
  if (lastApprovedLeave) {
    const lastEnd = new Date(lastApprovedLeave.endDate);
    lastEnd.setDate(lastEnd.getDate() + 1);
    lastReturnDateText = lastEnd.toISOString().split('T')[0];
  }

  // 3. FINANCIAL CALCULATIONS:
  const basicSalary = selectedContract?.basicSalary || 500;
  const housingAllowance = selectedContract?.housingAllowance || 0;
  const transportAllowance = selectedContract?.transportAllowance || 0;
  const otherAllowance = selectedContract?.otherAllowance || 0;

  const totalGrossSalary = basicSalary + housingAllowance + transportAllowance + otherAllowance;
  const dailyRate = totalGrossSalary / 26; // Standard 26-day basis in Kuwait

  const earnedLeavePay = dailyRate * requestedDays;
  const grossSettlement = earnedLeavePay + travelAllowance;
  // Zero financial deduction for unpaid / excess service days (Net Salary remains 100% untouched)
  const totalDeductions = otherDeductions; 
  const netSettlementPayable = Math.max(0, grossSettlement - totalDeductions);

  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  const handlePrint = () => {
    printDocument('leave-settlement-print-area', `تسوية_إجازة_${selectedEmployee?.fullNameAr || 'موظف'}`);
  };

  const handleDownloadPdf = async () => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      await exportElementToPdf('leave-settlement-print-area', `سند_تسوية_إجازة_${selectedEmployee?.fullNameAr || 'موظف'}`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 space-y-6 dir-rtl text-right">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-[#714B67]" />
            <span>حاسبة مستحقات وتسوية الإجازة (Leave Settlement & Clearance)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            احتساب راتب الإجازة المستحق، تفصيل حركة الأرصدة (الرصيد المكتسب - المستهلك براتب - المستهلك بدون راتب - صافي الرصيد المتبقي)، وإصدار سند التسوية الرسمي.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer"
            >
              إغلاق
            </button>
          )}

          <button
            onClick={() => setShowPrintablePdf(true)}
            className="px-4 py-2 bg-[#714B67] hover:bg-[#583950] text-white text-xs font-bold rounded-lg shadow-md transition flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-amber-300" />
            <span>طباعة تسوية إجازات</span>
          </button>
        </div>
      </div>

      {/* Employee Selector Bar */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div>
          <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-[#714B67]" />
            <span>اختر الموظف للمقاصة والتسوية:</span>
          </label>
          <select
            value={selectedEmpId || ''}
            onChange={(e) => setSelectedEmpId(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#714B67]"
          >
            {companyEmployees.map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.fullNameAr} ({emp.employeeCode} - {emp.jobTitle})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">عدد أيام الإجازة المطلوبة للتسوية:</label>
          <input
            type="number"
            min="1"
            max="90"
            value={requestedDays}
            onChange={(e) => setRequestedDays(parseFloat(e.target.value) || 0)}
            className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#714B67]"
          />
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">تاريخ بداية الإجازة المتوقع:</label>
          <input
            type="date"
            value={leaveStartDate}
            onChange={(e) => setLeaveStartDate(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#714B67]"
          />
        </div>
      </div>

      {selectedEmployee ? (
        <>
          {/* SECTION 1: LEAVE BALANCE DETAILS CARDS (الرصيد المكتسب - المستهلك براتب - المستهلك بدون راتب - صافي الرصيد المتبقي) */}
          <div className="bg-gradient-to-l from-purple-50/70 to-slate-50 border border-purple-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-purple-200 pb-2">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#714B67]" />
                <span>كشف تفصيل رصيد الإجازات الرسمي للموظف (Leave Balance Breakdown)</span>
              </h3>
              <button
                onClick={() => setShowPrintablePdf(true)}
                className="bg-white hover:bg-purple-50 text-[#714B67] border border-purple-300 text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة تسوية إجازات</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {/* 1. الرصيد المكتسب */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1">
                <span className="text-[10px] text-slate-500 font-bold block">1. الرصيد المكتسب الإجمالي:</span>
                <div className="text-xl font-black text-slate-900 font-mono">
                  {earnedBalance.toFixed(1)} <span className="text-xs font-medium text-slate-400">يوم</span>
                </div>
                <div className="text-[10px] text-slate-500">
                  افتتاحي: {openingBalance.toFixed(1)} + مستحق: {accrued2026.toFixed(1)}
                </div>
              </div>

              {/* 2. المستهلك براتب */}
              <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-xs space-y-1">
                <span className="text-[10px] text-amber-700 font-bold block">2. المستهلك براتب (مدفوع):</span>
                <div className="text-xl font-black text-amber-700 font-mono">
                  {consumedPaidDays.toFixed(1)} <span className="text-xs font-medium text-amber-500">يوم</span>
                </div>
                <div className="text-[10px] text-amber-700">
                  إجازات سنوية معتمدة
                </div>
              </div>

              {/* 3. المستهلك بدون راتب */}
              <div className="bg-white p-3.5 rounded-xl border border-purple-200 shadow-xs space-y-1">
                <span className="text-[10px] text-purple-700 font-bold block">3. المستهلك بدون راتب:</span>
                <div className="text-xl font-black text-purple-700 font-mono">
                  {consumedUnpaidDays.toFixed(1)} <span className="text-xs font-medium text-purple-500">يوم</span>
                </div>
                <div className="text-[10px] text-purple-600">
                  تُخصم من مدة الخدمة فقط
                </div>
              </div>

              {/* 4. صافي الرصيد المتبقي */}
              <div className="bg-white p-3.5 rounded-xl border border-emerald-300 shadow-xs space-y-1">
                <span className="text-[10px] text-emerald-700 font-bold block">4. صافي الرصيد المتبقي:</span>
                <div className="text-xl font-black text-emerald-700 font-mono">
                  {netRemainingBalance.toFixed(1)} <span className="text-xs font-medium text-emerald-600">يوم</span>
                </div>
                <div className="text-[10px] text-emerald-600 font-bold">
                  بعد التسوية: {balanceAfterSettlement.toFixed(1)} يوم
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: HISTORICAL RECORD & ABSENCE SUMMARY */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Last Return Date & Leave History Badge */}
            <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-purple-200/80 pb-2">
                <span className="font-bold text-purple-950 text-xs flex items-center gap-1.5">
                  <History className="w-4 h-4 text-purple-700" />
                  <span>سجل العودة والإجازات السابقة (Historical Record)</span>
                </span>
                <span className="px-2 py-0.5 bg-purple-200 text-purple-900 font-bold rounded text-[10px]">
                  السجل التلقائي
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white p-3 rounded-lg border border-purple-100 shadow-2xs">
                  <span className="text-[10px] text-slate-500 font-bold block">تاريخ آخر عودة من إجازة:</span>
                  <span className="text-sm font-black text-purple-900 font-mono block mt-0.5">
                    {lastReturnDateText}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-lg border border-purple-100 shadow-2xs">
                  <span className="text-[10px] text-slate-500 font-bold block">تاريخ مباشرة العمل بالشركة:</span>
                  <span className="text-sm font-black text-slate-800 font-mono block mt-0.5">
                    {selectedEmployee.joinDate}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-purple-800 leading-relaxed">
                • إجمالي الإجازات المعتمدة السابقة للموظف: <strong>{empLeaves.length} إجازة</strong>.
              </p>
            </div>

            {/* Unpaid Leave & Service Deduction Log */}
            <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-purple-200/80 pb-2">
                <span className="font-bold text-purple-950 text-xs flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-purple-700" />
                  <span>تأثير الإجازات على مدة الخدمة والراتب (خصم من الخدمة فقط)</span>
                </span>
                <span className="px-2 py-0.5 bg-purple-200 text-purple-900 font-bold rounded text-[10px]">
                  {consumedUnpaidDays.toFixed(1)} أيام بدون راتب
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center bg-white p-2.5 rounded border border-purple-100 text-[11px]">
                  <span className="text-slate-600">عدد الأيام بدون راتب (تخصم من مدة الخدمة):</span>
                  <span className="font-bold font-mono text-purple-900">{consumedUnpaidDays.toFixed(1)} يوم</span>
                </div>

                <div className="flex justify-between items-center bg-white p-2.5 rounded border border-purple-100 text-[11px]">
                  <span className="text-slate-600">الاستقطاع المالي من الراتب:</span>
                  <span className="font-bold font-mono text-emerald-700">0.000 د.ك (بدون تأثير على الراتب الصافي)</span>
                </div>
              </div>

              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-[11px] text-emerald-900 font-bold">
                ✓ تنطبق قاعدة (خصم من مدة الخدمة فقط - بدون تأثير على الراتب): تم تخفيض الأيام من حساب مدة الخدمة واستبعاد أي خصم مالي (الاستقطاع = 0.000 د.ك).
              </div>
            </div>
          </div>

          {/* SECTION 3: AUTOMATED SETTLEMENT BREAKDOWN (الحساب المالي للبدلات) */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>تفاصيل احتساب مستحقات الإجازة والبدلات (Leave Financial Breakdown)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {/* Salary Base */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
                <span className="text-slate-500 font-bold text-[11px]">الراتب الإجمالي الشامل:</span>
                <div className="text-base font-black text-slate-900 font-mono">
                  {formatKWD(totalGrossSalary)}
                </div>
                <div className="text-[10px] text-slate-400">
                  أساسي: {formatKWD(basicSalary)} + بدلات: {formatKWD(housingAllowance + transportAllowance + otherAllowance)}
                </div>
              </div>

              {/* Daily Rate */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
                <span className="text-slate-500 font-bold text-[11px]">أجر اليوم الواحد (على أساس 26 يوماً):</span>
                <div className="text-base font-black text-indigo-900 font-mono">
                  {formatKWD(dailyRate)}
                </div>
                <div className="text-[10px] text-indigo-600 font-bold">
                  المعيار الكويتي المعتمد (Gross / 26)
                </div>
              </div>

              {/* Earned Leave Pay */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
                <span className="text-slate-500 font-bold text-[11px]">راتب الإجازة المستحق ({requestedDays} يوماً):</span>
                <div className="text-base font-black text-amber-700 font-mono">
                  {formatKWD(earnedLeavePay)}
                </div>
                <div className="text-[10px] text-amber-800">
                  {requestedDays} × {formatKWD(dailyRate)}
                </div>
              </div>

              {/* Travel Allowance Input */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
                <label className="text-slate-700 font-bold text-[11px] block">
                  بدل السفر / تذاكر طيران (KWD):
                </label>
                <input
                  type="number"
                  min="0"
                  value={travelAllowance}
                  onChange={(e) => setTravelAllowance(parseFloat(e.target.value) || 0)}
                  className="w-full border border-slate-300 rounded p-1 text-slate-800 font-mono font-bold bg-white"
                />
                <span className="text-[10px] text-slate-400 block">بدل تذاكر معتمد</span>
              </div>
            </div>

            {/* Deductions & Notes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
                <label className="text-slate-700 font-bold text-[11px] block">خصومات وسلف جارية (KWD):</label>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={otherDeductions}
                  onChange={(e) => setOtherDeductions(parseFloat(e.target.value) || 0)}
                  className="w-full border border-slate-300 rounded p-1 text-slate-800 font-mono font-bold bg-white"
                />
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1 md:col-span-2">
                <label className="text-slate-700 font-bold text-[11px] block">ملاحظات والتزامات تسوية الإجازة:</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border border-slate-300 rounded p-1.5 text-slate-800 bg-white"
                />
              </div>
            </div>

            {/* Net Settlement Total Box */}
            <div className="bg-emerald-950 text-white p-5 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
              <div className="space-y-1">
                <span className="text-xs text-emerald-300 font-bold">صافي المستحقات المعتمدة للإجازة (Net Leave Settlement Payable)</span>
                <p className="text-[11px] text-emerald-200">
                  (راتب الإجازة {formatKWD(earnedLeavePay)} + بدل السفر {formatKWD(travelAllowance)}) - (الخصومات والسلف {formatKWD(totalDeductions)})
                </p>
              </div>

              <div className="text-right">
                <div className="text-3xl font-black font-mono text-amber-300">
                  {formatKWD(netSettlementPayable)}
                </div>
                <span className="text-[10px] text-emerald-400 block font-bold">جاهز للصرف والاعتماد</span>
              </div>
            </div>
          </div>

          {/* PRINTABLE PDF CLEARANCE FORM MODAL VIEW */}
          {showPrintablePdf && (
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
              <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl p-8 space-y-6 text-slate-900 font-serif dir-rtl print:p-0 print:shadow-none print:w-full">
                
                <div id="leave-settlement-print-area" className="p-2 space-y-6 bg-white">
                  {/* PDF Header */}
                  <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-[#714B67] text-white font-black rounded-xl flex items-center justify-center text-xl shadow">
                        A
                      </div>
                      <div>
                        <h1 className="font-extrabold text-base text-slate-900">{activeCompany?.nameAr || ''}</h1>
                        <p className="text-xs text-slate-600">{activeCompany?.nameEn || ''}</p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          سجل تجاري: {activeCompany?.commercialRegNo || ''} • ملف الشؤون: {activeCompany?.wsiCode || ''}
                        </p>
                      </div>
                    </div>

                    <div className="text-left font-mono text-xs space-y-1">
                      <div className="font-extrabold text-sm text-[#714B67] bg-purple-50 px-3 py-1 rounded border border-purple-200">
                        نموذج تسوية وتصفية إجازة (Leave Clearance Form)
                      </div>
                      <div className="text-slate-500 text-[10px]">تاريخ التسوية: {new Date().toISOString().split('T')[0]}</div>
                      <div className="text-slate-500 text-[10px]">كود النموذج: LCF-{Math.floor(1000 + Math.random() * 9000)}</div>
                    </div>
                  </div>

                  {/* Employee Details Box */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-300 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div><strong>اسم الموظف:</strong> {selectedEmployee.fullNameAr}</div>
                    <div><strong>كود الموظف:</strong> {selectedEmployee.employeeCode}</div>
                    <div><strong>الرقم المدني:</strong> {selectedEmployee.civilId}</div>
                    <div><strong>المسمى الوظيفي:</strong> {selectedEmployee.jobTitle}</div>
                    <div><strong>القسم / الإدارة:</strong> {selectedEmployee.department}</div>
                    <div><strong>تاريخ التعيين:</strong> {selectedEmployee.joinDate}</div>
                    <div><strong>البنك المستلم:</strong> {selectedEmployee.bankName}</div>
                    <div className="col-span-2 font-mono"><strong>IBAN:</strong> {selectedEmployee.iban}</div>
                  </div>

                  {/* Leave Balances Breakdown (الرصيد المكتسب - المستهلك براتب - المستهلك بدون راتب - صافي الرصيد المتبقي) */}
                  <div className="border border-purple-300 p-3.5 rounded-xl bg-purple-50/50 text-xs space-y-2">
                    <h4 className="font-bold text-[#714B67] text-xs flex items-center justify-between">
                      <span>كشف وتفصيل حركة أرصدة الإجازات للموظف (Leave Balance Summary):</span>
                      <span className="text-[10px] font-mono text-slate-500">وفق قانون العمل الكويتي</span>
                    </h4>
                    <table className="w-full text-right text-xs border border-purple-200 bg-white rounded-lg overflow-hidden">
                      <thead className="bg-purple-100/70 font-bold text-purple-950">
                        <tr>
                          <th className="p-2 border border-purple-200 text-center">1. الرصيد المكتسب</th>
                          <th className="p-2 border border-purple-200 text-center">2. المستهلك براتب</th>
                          <th className="p-2 border border-purple-200 text-center">3. المستهلك بدون راتب</th>
                          <th className="p-2 border border-purple-200 text-center">4. صافي الرصيد المتبقي</th>
                          <th className="p-2 border border-purple-200 text-center">الأيام المطلوبة</th>
                          <th className="p-2 border border-purple-200 text-center">الرصيد بعد التسوية</th>
                        </tr>
                      </thead>
                      <tbody className="font-mono text-center text-xs">
                        <tr>
                          <td className="p-2 border border-purple-200 font-bold text-slate-900">
                            {earnedBalance.toFixed(1)} يوم
                            <span className="block text-[9px] text-slate-400 font-sans">(افتتاحي {openingBalance.toFixed(1)} + مستحق {accrued2026.toFixed(1)})</span>
                          </td>
                          <td className="p-2 border border-purple-200 font-bold text-amber-700">
                            {consumedPaidDays.toFixed(1)} يوم
                            <span className="block text-[9px] text-amber-600 font-sans">(إجازات سنوية مدفوعة)</span>
                          </td>
                          <td className="p-2 border border-purple-200 font-bold text-purple-700">
                            {consumedUnpaidDays.toFixed(1)} يوم
                            <span className="block text-[9px] text-purple-600 font-sans">(تخصم من مدة الخدمة فقط)</span>
                          </td>
                          <td className="p-2 border border-purple-200 font-black text-emerald-700 bg-emerald-50/60 text-sm">
                            {netRemainingBalance.toFixed(1)} يوم
                          </td>
                          <td className="p-2 border border-purple-200 font-bold text-slate-800">
                            {requestedDays} يوم
                          </td>
                          <td className="p-2 border border-purple-200 font-black text-indigo-700 bg-indigo-50/60">
                            {balanceAfterSettlement.toFixed(1)} يوم
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Historical Summary Section */}
                  <div className="border border-slate-200 p-3 rounded-lg bg-slate-50 text-xs space-y-1">
                    <h4 className="font-bold text-slate-800 text-xs">سجل العودة والبيانات المسجلة:</h4>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>• <strong>تاريخ آخر عودة من إجازة سابقة:</strong> {lastReturnDateText}</div>
                      <div>• <strong>أيام بدون راتب (تخصم من مدة الخدمة فقط):</strong> {consumedUnpaidDays.toFixed(1)} يوم (استقطاع الراتب = 0.000 د.ك)</div>
                      <div>• <strong>تاريخ بداية الإجازة الحالية:</strong> {leaveStartDate}</div>
                      <div>• <strong>عدد الأيام المعتمدة للتسوية:</strong> {requestedDays} يوماً</div>
                    </div>
                  </div>

                  {/* Itemized Financial Calculation Table */}
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 mb-2 border-b pb-1">جدول الحساب المالي والتسوية المستحقة:</h4>
                    <table className="w-full text-right text-xs border border-slate-400">
                      <thead className="bg-slate-200 font-bold border-b border-slate-400">
                        <tr>
                          <th className="p-2 border-l border-slate-400">بيان البند المالية</th>
                          <th className="p-2 border-l border-slate-400 text-center">المعيار / الطريقة</th>
                          <th className="p-2 text-left">المبلغ المستحق (KWD)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-300">
                        <tr>
                          <td className="p-2 border-l border-slate-300">الراتب الشهري الشامل (Gross Salary)</td>
                          <td className="p-2 border-l border-slate-300 text-center font-mono">الأساسي + البدلات</td>
                          <td className="p-2 text-left font-mono font-bold">{formatKWD(totalGrossSalary)}</td>
                        </tr>
                        <tr>
                          <td className="p-2 border-l border-slate-300">أجر اليوم الواحد (Daily Salary Basis)</td>
                          <td className="p-2 border-l border-slate-300 text-center font-mono">Gross / 26 days</td>
                          <td className="p-2 text-left font-mono font-bold">{formatKWD(dailyRate)}</td>
                        </tr>
                        <tr className="bg-amber-50/50">
                          <td className="p-2 border-l border-slate-300 font-bold">راتب الإجازة المستحق ({requestedDays} يوماً)</td>
                          <td className="p-2 border-l border-slate-300 text-center font-mono">{requestedDays} days × {formatKWD(dailyRate)}</td>
                          <td className="p-2 text-left font-mono font-bold text-amber-900">{formatKWD(earnedLeavePay)}</td>
                        </tr>
                        <tr>
                          <td className="p-2 border-l border-slate-300">بدل السفر / تذاكر طيران (Travel Allowance)</td>
                          <td className="p-2 border-l border-slate-300 text-center font-mono">مخصص تذكرة سفر</td>
                          <td className="p-2 text-left font-mono font-bold text-indigo-900">{formatKWD(travelAllowance)}</td>
                        </tr>
                        {consumedUnpaidDays > 0 && (
                          <tr className="bg-purple-50/50 text-purple-900">
                            <td className="p-2 border-l border-slate-300">أيام بدون راتب / زائدة ({consumedUnpaidDays.toFixed(1)} يوم) - تخصم من مدة الخدمة فقط</td>
                            <td className="p-2 border-l border-slate-300 text-center font-mono">بدون تأثير على الراتب الصافي</td>
                            <td className="p-2 text-left font-mono font-bold">0.000 د.ك (استقطاع مالي 0)</td>
                          </tr>
                        )}
                        {otherDeductions > 0 && (
                          <tr className="bg-rose-50/50 text-rose-900">
                            <td className="p-2 border-l border-slate-300">خصومات سلف أو متأخرات</td>
                            <td className="p-2 border-l border-slate-300 text-center font-mono">سلفة جارية</td>
                            <td className="p-2 text-left font-mono font-bold">- {formatKWD(otherDeductions)}</td>
                          </tr>
                        )}
                        <tr className="bg-[#714B67] text-white font-extrabold text-sm">
                          <td className="p-3 border-l border-purple-800">صافي المستحقات المعتمدة للإجازة (NET PAYABLE)</td>
                          <td className="p-3 border-l border-purple-800 text-center font-mono">صافي المبلغ للموظف</td>
                          <td className="p-3 text-left font-mono text-amber-300">{formatKWD(netSettlementPayable)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Signatures & Clearances Block */}
                  <div className="grid grid-cols-4 gap-4 pt-6 border-t-2 border-slate-900 text-center text-xs">
                    <div>
                      <p className="font-bold text-slate-800">المحاسب</p>
                      <div className="h-12 border-b border-dashed border-slate-400 mt-2"></div>
                      <p className="text-[10px] text-slate-400 mt-1">التوقيع والتاريخ</p>
                    </div>

                    <div>
                      <p className="font-bold text-slate-800">المدير الإداري</p>
                      <div className="h-12 border-b border-dashed border-slate-400 mt-2"></div>
                      <p className="text-[10px] text-slate-400 mt-1">التوقيع والتاريخ</p>
                    </div>

                    <div>
                      <p className="font-bold text-slate-800">الموارد البشرية</p>
                      <div className="h-12 border-b border-dashed border-slate-400 mt-2"></div>
                      <p className="text-[10px] text-slate-400 mt-1">التوقيع والختم</p>
                    </div>

                    <div>
                      <p className="font-bold text-slate-800">إقرار واستلام الموظف</p>
                      <div className="h-12 border-b border-dashed border-slate-400 mt-2"></div>
                      <p className="text-[10px] text-slate-400 mt-1">التوقيع والمصادقة</p>
                    </div>
                  </div>
                </div>

                {/* Print & Download Controls in Modal */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t print:hidden">
                  <div className="text-xs text-slate-500 font-sans">
                    يمكنك طباعة السند مباشرة أو حفظه كملف PDF عالي الجودة معتمد بختم الشركة
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowPrintablePdf(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition cursor-pointer"
                    >
                      إغلاق
                    </button>
                    
                    <button
                      onClick={handleDownloadPdf}
                      disabled={isExportingPdf}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-xs shadow transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="تحميل السند مباشرة بصيغة PDF"
                    >
                      {isExportingPdf ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>جاري إنشاء PDF...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 text-emerald-200" />
                          <span>تحميل ملف PDF</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handlePrint}
                      className="px-5 py-2 bg-[#714B67] hover:bg-[#583950] text-white font-bold rounded-lg text-xs shadow transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-4 h-4 text-amber-300" />
                      <span>طباعة فورية (Print)</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="p-8 text-center text-slate-500">
          يرجى اختيار موظف لعرض تسوية ومستحقات الإجازة.
        </div>
      )}
    </div>
  );
};
