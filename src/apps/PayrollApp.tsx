import React, { useState } from 'react';
import { Payslip, Employee, Company, Contract, LoanAdvance, AttendanceRecord, ActiveApp } from '../types';
import { printDocument } from '../utils/printUtils';
import { formatKWD, tafqitKWD } from '../utils/kuwaitLaw';
import { 
  Banknote, Download, FileSpreadsheet, CheckCircle2, ShieldCheck, Printer, 
  Edit, Plus, Search, Sparkles, Building2, User, FileText, ArrowLeft, 
  Layers, Calculator, AlertCircle, X, Check, FileCheck, Landmark, MessageSquare, Send, Smartphone
} from 'lucide-react';

interface PayrollAppProps {
  payslips: Payslip[];
  employees: Employee[];
  contracts: Contract[];
  loans?: LoanAdvance[];
  attendance?: AttendanceRecord[];
  activeCompany: Company;
  filterTab?: string;
  searchTerm?: string;
  onGenerateMonthlyPayslips: (month: string) => void;
  onSaveContract: (contract: Contract) => void;
  onSavePayslip?: (payslip: Payslip) => void;
  onNavigateToApp?: (app: ActiveApp) => void;
  onOpenNotificationModal?: (emp: Employee, trigger?: any, data?: any) => void;
}

export const PayrollApp: React.FC<PayrollAppProps> = ({
  payslips,
  employees,
  contracts,
  loans = [],
  attendance = [],
  activeCompany,
  filterTab = 'ALL',
  searchTerm = '',
  onGenerateMonthlyPayslips,
  onSaveContract,
  onSavePayslip,
  onNavigateToApp,
  onOpenNotificationModal,
}) => {
  // Navigation & View Sub-Tabs: 'MONTHLY' | 'STRUCTURE' | 'PIFSS' | 'WPS'
  const [activeSubTab, setActiveSubTab] = useState<'MONTHLY' | 'STRUCTURE' | 'WPS'>(() => {
    if (filterTab === 'STRUCTURE') return 'STRUCTURE';
    
    if (filterTab === 'WSI') return 'WPS';
    return 'MONTHLY';
  });

  const [selectedMonth, setSelectedMonth] = useState('2026-08');
  const [localSearch, setLocalSearch] = useState('');
  
  // Modal States
  const [selectedPayslipForPrint, setSelectedPayslipForPrint] = useState<Payslip | null>(null);
  const [editingStructureEmp, setEditingStructureEmp] = useState<Employee | null>(null);
  const [structureForm, setStructureForm] = useState({
    basicSalary: 850,
    housingAllowance: 150,
    transportAllowance: 50,
    otherAllowance: 0,
    contractType: 'INDEFINITE' as 'INDEFINITE' | 'FIXED_TERM',
  });

  // Effective search query combining global top bar + local search
  const query = (searchTerm || localSearch).trim().toLowerCase();

  const activeCompId = activeCompany?.id || 'comp-1';
  let companyEmps = (employees || []).filter(e => !e.isDeleted && ((e.companyId || 'comp-1') === activeCompId || true));
  if (companyEmps.length === 0 && (employees || []).filter(e => !e.isDeleted).length > 0) {
    companyEmps = (employees || []).filter(e => !e.isDeleted);
  }
  
  // Filtered employees for Salary Structure tab
  const filteredEmps = companyEmps.filter(e => {
    if (!query) return true;
    return (
      e.fullNameAr.toLowerCase().includes(query) ||
      e.fullNameEn.toLowerCase().includes(query) ||
      e.civilId.includes(query) ||
      e.employeeCode.toLowerCase().includes(query)
    );
  });

  // Filtered payslips for selected month
  const monthPayslips = (payslips || []).filter(p => p.companyId === (activeCompany?.id || 'comp-1') && p.month === selectedMonth);
  const filteredPayslips = monthPayslips.filter(p => {
    const emp = employees.find(e => e.id === p.employeeId);
    if (!query) return true;
    if (!emp) return false;
    return (
      emp.fullNameAr.toLowerCase().includes(query) ||
      emp.fullNameEn.toLowerCase().includes(query) ||
      emp.civilId.includes(query) ||
      p.id.toLowerCase().includes(query)
    );
  });

  // KPI Calculations
  const totalGross = monthPayslips.reduce((sum, p) => sum + p.grossSalary, 0);
  const totalNet = monthPayslips.reduce((sum, p) => sum + p.netSalary, 0);
  const totalDeductions = monthPayslips.reduce((sum, p) => sum + (p.latenessDeduction + (p.loanDeduction || 0) + (p.unpaidLeaveDeduction || 0) + p.otherDeductions), 0);

  // Open Edit Structure Modal
  const handleOpenEditStructure = (emp: Employee) => {
    const cnt = contracts.find(c => c.employeeId === emp.id);
    setEditingStructureEmp(emp);
    setStructureForm({
      basicSalary: cnt ? cnt.basicSalary : 850,
      housingAllowance: cnt ? cnt.housingAllowance : 150,
      transportAllowance: cnt ? cnt.transportAllowance : 50,
      otherAllowance: cnt ? cnt.otherAllowance : 0,
      contractType: cnt ? cnt.contractType : 'INDEFINITE',
    });
  };

  // Save Salary Structure
  const handleSaveStructure = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStructureEmp) return;

    const existingContract = contracts.find(c => c.employeeId === editingStructureEmp.id);
    const updatedContract: Contract = {
      id: existingContract ? existingContract.id : `cnt-${editingStructureEmp.id}`,
      employeeId: editingStructureEmp.id,
      companyId: activeCompany?.id || 'comp-1',
      basicSalary: Number(structureForm.basicSalary),
      housingAllowance: Number(structureForm.housingAllowance),
      transportAllowance: Number(structureForm.transportAllowance),
      otherAllowance: Number(structureForm.otherAllowance),
      contractType: structureForm.contractType,
      startDate: existingContract ? existingContract.startDate : editingStructureEmp.joinDate || new Date().toISOString().split('T')[0],
      noticePeriodDays: existingContract ? existingContract.noticePeriodDays : 90,
      status: 'RUNNING',
    };

    onSaveContract(updatedContract);
    setEditingStructureEmp(null);
    alert(`تم حفظ وتحديث هيكل راتب الموظف [${editingStructureEmp.fullNameAr}] بنجاح!`);
  };

  // Generate WPS File content (Wage Protection System for Ministry of Social Affairs Kuwait)
  const handleExportWPS = () => {
    if (monthPayslips.length === 0) {
      alert('لا توجد مسيرات رواتب مولدة لهذا الشهر. يرجى الضغط على "توليد كشوف الشهر تلقائياً" أولاً.');
      return;
    }

    let wpsText = `WPS_HEADER|COMPANY_REG:${activeCompany?.commercialRegNo || ''}|WSI_CODE:${activeCompany?.wsiCode || ''}|IBAN:${activeCompany?.iban || ''}|MONTH:${selectedMonth}\n`;
    monthPayslips.forEach(p => {
      const emp = employees.find(e => e.id === p.employeeId);
      if (emp) {
        wpsText += `RECORD|CIVIL_ID:${emp.civilId}|EMP_NAME:${emp.fullNameAr}|BASIC:${p.basicSalary.toFixed(3)}|ALLOWANCES:${(p.allowances || 0).toFixed(3)}|NET_SALARY:${p.netSalary.toFixed(3)}|BANK_IBAN:${emp.iban || activeCompany?.iban || ''}\n`;
      }
    });

    const blob = new Blob([wpsText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `WPS_Kuwait_Shuoon_${activeCompany?.commercialRegNo || 'comp'}_${selectedMonth}.txt`;
    link.click();
  };

  // Export Bank Payroll Excel/CSV
  const handleExportBankCSV = () => {
    if (monthPayslips.length === 0) {
      alert('لا توجد مسيرات رواتب مولدة لهذا الشهر لتصديرها.');
      return;
    }

    let csv = '\uFEFF'; // UTF-8 BOM
    csv += 'رقم المسير,كود الموظف,اسم الموظف بالعربي,الرقم المدني,اسم البنك,رقم الحساب IBAN,الراتب الأساسي,البدلات,الساعات الإضافية,خصم الإجازات,خصم الحضور,خصم السلف,صافي الراتب KWD,الحالة\n';

    monthPayslips.forEach(p => {
      const emp = employees.find(e => e.id === p.employeeId);
      if (emp) {
        csv += `"${p.id}","${emp.employeeCode}","${emp.fullNameAr}","${emp.civilId}","${emp.bankName || 'بنك الكويت الوطني'}","${emp.iban || 'KW00000000000'}","${p.basicSalary.toFixed(3)}","${(p.allowances || 0).toFixed(3)}","${(p.overtimeAmount || 0).toFixed(3)}","${p.latenessDeduction.toFixed(3)}","${(p.loanDeduction || 0).toFixed(3)}","${p.netSalary.toFixed(3)}","معتمد للتحويل"\n`;
      }
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Payroll_Bank_Transfer_${activeCompany?.nameAr || ''}_${selectedMonth}.csv`;
    link.click();
  };

  // Print Payslip PDF
  const handlePrintPayslip = () => {
    printDocument('printable-payslip', 'payslip');
  };

  return (
    <div className="p-4 sm:p-6 bg-transparent min-h-[calc(100vh-3rem)] text-xs dir-rtl">
      {/* Top Header & Navigation Sub-Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
              <Banknote className="w-6 h-6 text-[#714B67]" />
              <span>إدارة الرواتب والأجور - Payroll Module</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              النظام المالي المعتمد وفق قانون العمل الكويتي (مادة 51 & 53) ونظام حماية الأجور WSI بوزارة الشؤون
            </p>
          </div>

          {/* Month Selector & Main Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1">
              <span className="text-[11px] font-bold text-slate-600">الشهر:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent font-mono font-bold text-slate-900 outline-none text-xs"
              />
            </div>

            <button
              onClick={() => onGenerateMonthlyPayslips(selectedMonth)}
              className="bg-[#714B67] hover:bg-[#5a3a52] text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow transition flex items-center gap-1.5 cursor-pointer"
            >
              <Calculator className="w-4 h-4 text-amber-300" />
              <span>توليد كشوف الشهر تلقائياً</span>
            </button>

            <button
              onClick={handleExportWPS}
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow flex items-center gap-1.5 transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>تصدير ملف WPS الشؤون</span>
            </button>

            <button
              onClick={handleExportBankCSV}
              className="bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold px-3 py-2 rounded-lg shadow flex items-center gap-1.5 transition cursor-pointer"
              title="تصدير كشف الرواتب إلى ملف Excel / CSV"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel/CSV البنك</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-2 pt-3 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveSubTab('MONTHLY')}
            className={`px-4 py-2 rounded-lg font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeSubTab === 'MONTHLY'
                ? 'bg-[#714B67] text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Banknote className="w-4 h-4" />
            <span>مسير الرواتب الشهري ({selectedMonth})</span>
            <span className="bg-white/20 text-white px-1.5 py-0.5 rounded text-[10px] font-mono">
              {monthPayslips.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('STRUCTURE')}
            className={`px-4 py-2 rounded-lg font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeSubTab === 'STRUCTURE'
                ? 'bg-[#714B67] text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>هيكل الراتب والبدلات (Salary Structure)</span>
            <span className="bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded text-[10px] font-mono">
              {companyEmps.length} موظف
            </span>
          </button>

          

          <button
            onClick={() => setActiveSubTab('WPS')}
            className={`px-4 py-2 rounded-lg font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeSubTab === 'WPS'
                ? 'bg-[#714B67] text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Landmark className="w-4 h-4" />
            <span>ملف تحويل البنوك وحماية الأجور (WPS)</span>
          </button>
        </div>
      </div>

      {/* KPI Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold">إجمالي الرواتب الشاملة</span>
            <Banknote className="w-4 h-4 text-purple-600" />
          </div>
          <span className="text-xl font-black text-slate-900 font-mono dir-ltr block">{formatKWD(totalGross)}</span>
          <span className="text-[10px] text-slate-400 mt-1 block">الأساسي + البدلات + الساعات الإضافية</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold">إجمالي الخصومات والسلف</span>
            <AlertCircle className="w-4 h-4 text-rose-600" />
          </div>
          <span className="text-xl font-black text-rose-600 font-mono dir-ltr block">{formatKWD(totalDeductions)}</span>
          <span className="text-[10px] text-slate-400 mt-1 block">خصم التأخير + أقساط السلف القائمة</span>
        </div>

        <div className="bg-white rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between text-emerald-800 mb-1">
            <span className="text-[11px] font-bold">صافي التحويلات البنكية (Net)</span>
            <Landmark className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-xl font-black text-emerald-700 font-mono dir-ltr block">{formatKWD(totalNet)}</span>
          <span className="text-[10px] text-emerald-800 mt-1 block">المبلغ النهائي المحول إلى حساب الموظف</span>
        </div>
      </div>

      {/* SEARCH BAR FOR TABLE */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 mb-4 flex items-center gap-2">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="بحث بأسماء الموظفين، الرقم المدني، كود الموظف..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="w-full bg-transparent outline-none text-xs text-slate-800 font-medium"
        />
        {localSearch && (
          <button onClick={() => setLocalSearch('')} className="text-slate-400 hover:text-slate-700 font-bold">
            ✕
          </button>
        )}
      </div>

      {/* SUB-TAB 1: MONTHLY PAYSLIPS TABLE */}
      {activeSubTab === 'MONTHLY' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="font-bold text-slate-800 flex items-center gap-2 text-xs">
              <FileCheck className="w-4 h-4 text-[#714B67]" />
              <span>كشوف الرواتب الشهرية المعتمدة - شهر {selectedMonth}</span>
            </span>
            <span className="text-[11px] text-slate-500">
              عدد المسيرات: <strong className="font-mono text-slate-900">{filteredPayslips.length}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#714B67] text-white font-bold">
                <tr>
                  <th className="p-2.5">رقم المسير</th>
                  <th className="p-2.5">الموظف</th>
                  <th className="p-2.5">الرقم المدني</th>
                  <th className="p-2.5">الراتب الأساسي</th>
                  <th className="p-2.5">البدلات الثابتة</th>
                  <th className="p-2.5">الإضافي</th>
                  <th className="p-2.5 text-rose-200">الخصومات والسلف</th>
                  <th className="p-2.5 bg-emerald-800">صافي الراتب (Net KWD)</th>
                  <th className="p-2.5">الحالة</th>
                  <th className="p-2.5 text-center">الإجراءات والطباعة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayslips.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400 font-semibold">
                      لا توجد كشوف رواتب مولدة لشهر {selectedMonth}. اضغط على زر "توليد كشوف الشهر تلقائياً" بأعلى الصفحة لتوليدها.
                    </td>
                  </tr>
                ) : (
                  filteredPayslips.map((p, index) => {
                    const emp = employees.find(e => e.id === p.employeeId);
                    const totalDeductionsEmp = p.latenessDeduction + (p.loanDeduction || 0) + (p.unpaidLeaveDeduction || 0);
                    
                    return (
                      <tr key={p.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/70 hover:bg-slate-100/60 transition'}>
                        <td className="p-2.5 font-mono font-bold text-slate-600">{p.id}</td>
                        <td className="p-2.5 font-bold text-slate-900">
                          {emp ? (
                            <div>
                              <p className="text-slate-900">{emp.fullNameAr}</p>
                              <p className="text-[10px] text-slate-400 font-mono">{emp.employeeCode} | {emp.jobTitle}</p>
                            </div>
                          ) : 'مجهول'}
                        </td>
                        <td className="p-2.5 font-mono text-slate-700 dir-ltr">{emp?.civilId || '—'}</td>
                        <td className="p-2.5 font-mono font-bold text-slate-800 dir-ltr">{formatKWD(p.basicSalary)}</td>
                        <td className="p-2.5 font-mono text-slate-700 dir-ltr">{formatKWD(p.allowances)}</td>
                        <td className="p-2.5 font-mono text-sky-700 font-semibold dir-ltr">{formatKWD(p.overtimeAmount || 0)}</td>
                        <td className="p-2.5 font-mono font-bold text-rose-600 dir-ltr">
                          {totalDeductionsEmp > 0 ? formatKWD(totalDeductionsEmp) : '0.000 KWD'}
                        </td>
                        <td className="p-2.5 font-mono font-black text-emerald-800 bg-emerald-50/60 dir-ltr text-sm">
                          {formatKWD(p.netSalary)}
                        </td>
                        <td className="p-2.5">
                          <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>معتمد للتحويل</span>
                          </span>
                        </td>
                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setSelectedPayslipForPrint(p)}
                              className="bg-[#714B67] hover:bg-[#583950] text-white text-[11px] font-bold px-2.5 py-1 rounded shadow flex items-center gap-1 transition cursor-pointer"
                              title="طباعة إشعار الراتب PDF"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>PDF</span>
                            </button>
                            {onOpenNotificationModal && emp && (
                              <button
                                onClick={() => onOpenNotificationModal(emp, 'PAYROLL_SALARY', { payslip: p })}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-2 py-1 rounded shadow flex items-center gap-1 transition cursor-pointer"
                                title="إرسال كشف الراتب عبر الواتساب للموظف"
                              >
                                <Smartphone className="w-3.5 h-3.5" />
                                <span>واتساب</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: SALARY STRUCTURE (هيكل الراتب والبدلات) */}
      {activeSubTab === 'STRUCTURE' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="font-bold text-slate-800 flex items-center gap-2 text-xs">
              <Layers className="w-4 h-4 text-[#714B67]" />
              <span>هيكل الرواتب والبدلات الثابتة لكل موظف (Salary Structure Config)</span>
            </span>
            <span className="text-[11px] text-slate-500">
              إجمالي الموظفين: <strong className="font-mono text-slate-900">{filteredEmps.length}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#714B67] text-white font-bold">
                <tr>
                  <th className="p-2.5">كود الموظف</th>
                  <th className="p-2.5">اسم الموظف</th>
                  <th className="p-2.5">الرقم المدني</th>
                  <th className="p-2.5">المسمى الوظيفي</th>
                  <th className="p-2.5">الراتب الأساسي</th>
                  <th className="p-2.5">بدل السكن</th>
                  <th className="p-2.5">بدل النقل</th>
                  <th className="p-2.5">بدلات أخرى</th>
                  <th className="p-2.5 bg-purple-900">إجمالي الراتب الشامل</th>
                  
                  <th className="p-2.5 text-center">إدارة الهيكل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmps.map((emp, index) => {
                  const cnt = contracts.find(c => c.employeeId === emp.id);
                  const basic = cnt ? cnt.basicSalary : 850;
                  const housing = cnt ? cnt.housingAllowance : 150;
                  const transport = cnt ? cnt.transportAllowance : 50;
                  const other = cnt ? cnt.otherAllowance : 0;
                  const gross = basic + housing + transport + other;

                  return (
                    <tr key={emp.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/70 hover:bg-slate-100/60 transition'}>
                      <td className="p-2.5 font-mono font-bold text-slate-600">{emp.employeeCode}</td>
                      <td className="p-2.5 font-bold text-slate-900">
                        {emp.fullNameAr}
                        <span className="block text-[10px] text-slate-400">{emp.fullNameEn}</span>
                      </td>
                      <td className="p-2.5 font-mono text-slate-700 dir-ltr">{emp.civilId}</td>
                      <td className="p-2.5 font-semibold text-slate-800">{emp.jobTitle}</td>
                      <td className="p-2.5 font-mono font-bold text-slate-900 dir-ltr">{formatKWD(basic)}</td>
                      <td className="p-2.5 font-mono text-slate-700 dir-ltr">{formatKWD(housing)}</td>
                      <td className="p-2.5 font-mono text-slate-700 dir-ltr">{formatKWD(transport)}</td>
                      <td className="p-2.5 font-mono text-slate-700 dir-ltr">{formatKWD(other)}</td>
                      <td className="p-2.5 font-mono font-black text-purple-900 bg-purple-50 dir-ltr text-sm">
                        {formatKWD(gross)}
                      </td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          emp.isKuwaiti ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {emp.isKuwaiti ? '🇰🇼 خاضع للتأمينات' : 'غير خاضع'}
                        </span>
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          onClick={() => handleOpenEditStructure(emp)}
                          className="bg-purple-700 hover:bg-purple-800 text-white text-[11px] font-bold px-2.5 py-1 rounded shadow flex items-center gap-1 mx-auto transition cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>تعديل الهيكل</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      

      {/* SUB-TAB 4: WPS BANK EXPORT (ملف حماية الأجور والبنك) */}
      {activeSubTab === 'WPS' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-emerald-950">
            <div>
              <h3 className="font-bold text-emerald-900 text-sm flex items-center gap-2">
                <Landmark className="w-5 h-5 text-emerald-700" />
                <span>ملف حماية الأجور WSI بوزارة الشؤون الاجتماعية والعمل</span>
              </h3>
              <p className="text-xs text-emerald-800 mt-1">
                توليد ملف التحويل المالي المعتمد لجميع البنوك الكويتية (الوطني، بيت التمويل، الخليج، بوبيان) وفق معايير السجل التجاري للشركة #{activeCompany?.commercialRegNo || ''} رمز الشؤون #{activeCompany?.wsiCode || ''}.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleExportWPS}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-2 rounded-lg shadow flex items-center gap-1.5 transition cursor-pointer text-xs"
              >
                <Download className="w-4 h-4" />
                <span>تحميل ملف WSI (.txt)</span>
              </button>

              <button
                onClick={handleExportBankCSV}
                className="bg-sky-700 hover:bg-sky-800 text-white font-bold px-4 py-2 rounded-lg shadow flex items-center gap-1.5 transition cursor-pointer text-xs"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>تصدير Excel للبنك (.csv)</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-800 text-white font-bold">
                <tr>
                  <th className="p-2.5">الموظف</th>
                  <th className="p-2.5">الرقم المدني</th>
                  <th className="p-2.5">اسم البنك</th>
                  <th className="p-2.5">رقم الحساب IBAN</th>
                  <th className="p-2.5 text-left font-mono">الصافي المحول (KWD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthPayslips.map((p, index) => {
                  const emp = employees.find(e => e.id === p.employeeId);
                  return (
                    <tr key={p.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="p-2.5 font-bold text-slate-900">{emp?.fullNameAr || 'مجهول'}</td>
                      <td className="p-2.5 font-mono dir-ltr">{emp?.civilId || '—'}</td>
                      <td className="p-2.5 font-semibold text-slate-700">{emp?.bankName || activeCompany?.bankName || ''}</td>
                      <td className="p-2.5 font-mono text-slate-800 dir-ltr">{emp?.iban || activeCompany?.iban || ''}</td>
                      <td className="p-2.5 font-mono font-black text-emerald-700 dir-ltr text-left text-sm">
                        {formatKWD(p.netSalary)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: EDIT SALARY STRUCTURE */}
      {editingStructureEmp && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 dir-rtl text-right">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-5 border border-slate-200 text-xs animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b mb-4">
              <div className="flex items-center gap-2 text-[#714B67] font-bold text-sm">
                <Edit className="w-5 h-5 text-purple-700" />
                <span>تعديل هيكل الراتب والبدلات - [{editingStructureEmp.fullNameAr}]</span>
              </div>
              <button onClick={() => setEditingStructureEmp(null)} className="text-slate-400 hover:text-slate-700 font-bold p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStructure} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">الراتب الأساسي (Basic Salary KWD)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={structureForm.basicSalary}
                    onChange={(e) => setStructureForm({ ...structureForm, basicSalary: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-slate-300 rounded p-2 outline-none font-mono font-bold text-xs focus:border-purple-600 bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">بدل السكن (Housing Allowance)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={structureForm.housingAllowance}
                    onChange={(e) => setStructureForm({ ...structureForm, housingAllowance: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-slate-300 rounded p-2 outline-none font-mono font-bold text-xs focus:border-purple-600 bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">بدل النقل (Transport Allowance)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={structureForm.transportAllowance}
                    onChange={(e) => setStructureForm({ ...structureForm, transportAllowance: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-slate-300 rounded p-2 outline-none font-mono font-bold text-xs focus:border-purple-600 bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">بدلات أخرى (Other Allowances)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={structureForm.otherAllowance}
                    onChange={(e) => setStructureForm({ ...structureForm, otherAllowance: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-slate-300 rounded p-2 outline-none font-mono font-bold text-xs focus:border-purple-600 bg-white"
                  />
                </div>
              </div>

              {/* Total Gross Readonly Display */}
              <div className="bg-purple-50 p-3 rounded-lg border border-purple-200 flex items-center justify-between">
                <span className="font-bold text-purple-900">إجمالي الراتب الشامل المحدث:</span>
                <span className="font-mono font-black text-purple-900 text-sm dir-ltr">
                  {formatKWD(structureForm.basicSalary + structureForm.housingAllowance + structureForm.transportAllowance + structureForm.otherAllowance)}
                </span>
              </div>

              <div className="pt-2">
                <label className="block font-bold text-slate-700 mb-1">نوع عقد العمل</label>
                <select
                  value={structureForm.contractType || 'INDEFINITE'}
                  onChange={(e) => setStructureForm({ ...structureForm, contractType: e.target.value as any })}
                  className="w-full border border-slate-300 rounded p-2 outline-none font-semibold text-xs bg-white"
                >
                  <option value="INDEFINITE">غير محدد المدة (Indefinite Contract)</option>
                  <option value="FIXED_TERM">محدد المدة (Fixed-Term Contract)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-[#714B67] hover:bg-[#593b51] text-white font-bold py-2.5 rounded-lg shadow transition text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>حفظ وتحديث هيكل الراتب</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditingStructureEmp(null)}
                  className="px-4 py-2.5 border border-slate-300 rounded-lg text-slate-600 font-bold hover:bg-slate-100 transition cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: PAYSLIP PDF PRINT PREVIEW (إشعار راتب فردي) */}
      {selectedPayslipForPrint && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 dir-rtl text-right overflow-y-auto print:p-0 print:bg-white print:static">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 sm:p-8 border border-slate-200 text-xs my-auto print:shadow-none print:border-none print:w-full print:p-0">
            {/* Modal Header Actions (Hidden when printing) */}
            <div className="flex items-center justify-between pb-4 border-b mb-6 print:hidden">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Printer className="w-5 h-5 text-[#714B67]" />
                <span>معاينة وطباعة إشعار الراتب - Payslip PDF</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintPayslip}
                  className="bg-[#714B67] hover:bg-[#583950] text-white font-bold px-4 py-1.5 rounded-lg shadow flex items-center gap-1.5 transition text-xs cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة الإشعار الآن</span>
                </button>
                <button
                  onClick={() => setSelectedPayslipForPrint(null)}
                  className="text-slate-400 hover:text-slate-700 font-bold p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* PRINTABLE PAYSLIP DOCUMENT BODY */}
            {(() => {
              const p = selectedPayslipForPrint;
              const emp = employees.find(e => e.id === p.employeeId);
              const basic = p.basicSalary;
              const housing = p.housingAllowance || 0;
              const transport = p.transportAllowance || 0;
              const otherAllow = p.otherAllowance || 0;
              const overtime = p.overtimeAmount || 0;
              const totalGrossEarnings = basic + housing + transport + otherAllow + overtime;

              const lateness = p.latenessDeduction;
              const loan = p.loanDeduction || 0;
              const otherDed = p.otherDeductions;
              const totalDeductionsEmp = lateness + loan + (p.unpaidLeaveDeduction || 0) + otherDed;

              return (
                <div id="printable-payslip" className="space-y-5 text-slate-900">
                  {/* Official Company Header */}
                  <div className="flex items-start justify-between border-b-2 border-[#714B67] pb-4">
                    <div>
                      <h1 className="text-xl font-black text-[#714B67]">{activeCompany?.nameAr || ''}</h1>
                      <p className="text-xs font-semibold text-slate-600">{activeCompany?.nameEn || ''}</p>
                      <div className="text-[10px] text-slate-500 space-y-0.5 mt-1">
                        <p>السجل التجاري: <strong className="font-mono">{activeCompany?.commercialRegNo || ''}</strong> | رمز حماية الأجور WSI: <strong className="font-mono">{activeCompany?.wsiCode || ''}</strong></p>
                        <p>البنك: <strong>{activeCompany?.bankName || ''}</strong> | IBAN: <strong className="font-mono dir-ltr">{activeCompany?.iban || ''}</strong></p>
                      </div>
                    </div>

                    <div className="text-left dir-ltr">
                      <span className="bg-[#714B67] text-white text-[10px] font-extrabold px-3 py-1 rounded tracking-widest inline-block mb-1">
                        PAYSLIP RECEIPT
                      </span>
                      <p className="text-xs font-black text-slate-900 font-mono">{p.id}</p>
                      <p className="text-[11px] text-slate-500 font-bold">شهر: {p.month}</p>
                    </div>
                  </div>

                  {/* Document Title Banner */}
                  <div className="bg-slate-100 rounded-lg p-2.5 text-center border border-slate-300">
                    <h2 className="text-sm font-black text-slate-900">إشعار راتب شهري - MONTHLY SALARY PAYSLIP</h2>
                    <p className="text-[10px] text-slate-600">عن شهر {p.month} - صادر وفق قوانين العمل بدولة الكويت</p>
                  </div>

                  {/* Employee Metadata Card */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-[11px]">
                    <div>
                      <span className="text-slate-500 block text-[10px]">اسم الموظف:</span>
                      <strong className="text-slate-900 text-xs">{emp?.fullNameAr || '—'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">الكود / الرقم المدني:</span>
                      <strong className="font-mono text-slate-900">{emp?.employeeCode} | {emp?.civilId}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">المسمى الوظيفي:</span>
                      <strong className="text-slate-900">{emp?.jobTitle}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">القسم / الإدارة:</span>
                      <strong className="text-slate-900">{emp?.department}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">الجنسية / الصفة:</span>
                      <strong className="text-slate-900">{emp?.nationality} ({emp?.isKuwaiti ? 'كويتي' : emp?.residencyType})</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">حساب التحويل البنكي:</span>
                      <strong className="font-mono text-slate-900 dir-ltr text-[10px]">{emp?.iban || activeCompany?.iban || ''}</strong>
                    </div>
                  </div>

                  {/* Itemized Financial Tables: Earnings vs Deductions */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* EARNINGS TABLE */}
                    <div className="border border-emerald-300 rounded-xl overflow-hidden bg-emerald-50/20">
                      <div className="bg-emerald-700 text-white font-bold p-2 text-[11px]">
                        🟢 المستحقات والبدلات (Gross Earnings)
                      </div>
                      <table className="w-full text-right text-[11px]">
                        <tbody className="divide-y divide-emerald-100">
                          <tr>
                            <td className="p-2 text-slate-700">الراتب الأساسي</td>
                            <td className="p-2 font-mono font-bold text-slate-900 text-left dir-ltr">{formatKWD(basic)}</td>
                          </tr>
                          <tr>
                            <td className="p-2 text-slate-700">بدل السكن</td>
                            <td className="p-2 font-mono text-slate-900 text-left dir-ltr">{formatKWD(housing)}</td>
                          </tr>
                          <tr>
                            <td className="p-2 text-slate-700">بدل النقل والإنقال</td>
                            <td className="p-2 font-mono text-slate-900 text-left dir-ltr">{formatKWD(transport)}</td>
                          </tr>
                          <tr>
                            <td className="p-2 text-slate-700">بدلات ومكافآت أخرى</td>
                            <td className="p-2 font-mono text-slate-900 text-left dir-ltr">{formatKWD(otherAllow)}</td>
                          </tr>
                          <tr>
                            <td className="p-2 text-slate-700">الساعات الإضافية (Overtime)</td>
                            <td className="p-2 font-mono text-sky-700 font-bold text-left dir-ltr">{formatKWD(overtime)}</td>
                          </tr>
                          <tr className="bg-emerald-100 font-bold">
                            <td className="p-2 text-emerald-950">إجمالي المستحقات الشاملة</td>
                            <td className="p-2 font-mono font-black text-emerald-900 text-left dir-ltr">{formatKWD(totalGrossEarnings)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* DEDUCTIONS TABLE */}
                    <div className="border border-rose-300 rounded-xl overflow-hidden bg-rose-50/20">
                      <div className="bg-rose-700 text-white font-bold p-2 text-[11px]">
                        🔴 الاستقطاعات والخصومات (Deductions)
                      </div>
                      <table className="w-full text-right text-[11px]">
                        <tbody className="divide-y divide-rose-100">
                          
                          <tr>
                            <td className="p-2 text-slate-700">إجازات بدون راتب ({p.unpaidLeaveDays || 0} أيام)</td>
                            <td className="p-2 font-mono text-rose-700 text-left dir-ltr">{formatKWD(p.unpaidLeaveDeduction || 0)}</td>
                          </tr>
                          <tr>
                            <td className="p-2 text-slate-700">خصم الحضور والتأخير</td>
                            <td className="p-2 font-mono text-rose-700 text-left dir-ltr">{formatKWD(lateness)}</td>
                          </tr>
                          <tr>
                            <td className="p-2 text-slate-700">قسط السلفة القائمة</td>
                            <td className="p-2 font-mono text-rose-700 text-left dir-ltr">{formatKWD(loan)}</td>
                          </tr>
                          <tr>
                            <td className="p-2 text-slate-700">خصومات واستقطاعات أخرى</td>
                            <td className="p-2 font-mono text-rose-700 text-left dir-ltr">{formatKWD(otherDed)}</td>
                          </tr>
                          <tr className="bg-rose-100 font-bold">
                            <td className="p-2 text-rose-950">إجمالي الخصومات</td>
                            <td className="p-2 font-mono font-black text-rose-900 text-left dir-ltr">{formatKWD(totalDeductionsEmp)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* HIGHLIGHTED NET SALARY BOX */}
                  <div className="bg-[#714B67] text-white p-4 rounded-xl shadow-sm text-center space-y-1">
                    <span className="text-[11px] text-amber-200 font-bold block">صافي الراتب النهائي المستحق للتحويل (NET PAYABLE SALARY)</span>
                    <span className="text-2xl font-black font-mono tracking-wider text-amber-300 block dir-ltr">
                      {formatKWD(p.netSalary)}
                    </span>
                    <p className="text-[11px] text-white/90 font-bold pt-1 border-t border-white/20">
                      فقُط وقدره: <span className="underline decoration-amber-300 text-amber-200">{tafqitKWD(p.netSalary)}</span>
                    </p>
                  </div>

                  {/* SIGNATURE & STAMP FOOTER */}
                  <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-[11px]">
                    <div>
                      <p className="font-bold text-slate-700 mb-8">توقيع الموظف بالتسلم والإقرار:</p>
                      <p className="border-b border-dashed border-slate-400 w-3/4 mx-auto"></p>
                      <p className="text-[10px] text-slate-400 mt-1">التوقيع / التاريخ</p>
                    </div>

                    <div>
                      <p className="font-bold text-slate-700 mb-8">اعتماد الإدارة المالية وختم الشركة:</p>
                      <p className="border-b border-dashed border-slate-400 w-3/4 mx-auto"></p>
                      <p className="text-[10px] text-slate-400 mt-1">ختم الشركة الرسمية</p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
