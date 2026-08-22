import React, { useState, useMemo, useEffect } from 'react';
import { Employee, Contract, LeaveRequest, AttendanceRecord, Company } from '../types';
import { 
  Printer, Calculator, DollarSign, Calendar, User, 
  FileText, ShieldCheck, Download, Loader2, Plus, 
  Archive, ChevronRight, CheckCircle2, History, AlertCircle,
  Building, Briefcase, Hash, CreditCard, Sparkles, X
} from 'lucide-react';
import { printDocument, exportElementToPdf } from '../utils/printUtils';
import { get_aysed_settlement_report_data, get_aysed_official_balance, getGlobalOpeningBalance, getGlobalAccrued2026 } from '../utils/kuwaitLaw';
import toast from 'react-hot-toast';

export interface LeaveSettlementCalculatorProps {
  employees: Employee[];
  contracts?: Contract[];
  leaves?: LeaveRequest[];
  attendance?: AttendanceRecord[];
  activeCompany?: Company;
  preSelectedEmployeeId?: string;
  onNavigateToTab?: (tab: string) => void;
  onSaveLeave?: (leave: LeaveRequest) => void;
}

export const LeaveSettlementCalculator: React.FC<LeaveSettlementCalculatorProps> = ({
  employees = [],
  contracts = [],
  leaves = [],
  attendance = [],
  activeCompany,
  preSelectedEmployeeId,
  onNavigateToTab,
  onSaveLeave,
}) => {
  const [selectedEmpId, setSelectedEmpId] = useState<string>(preSelectedEmployeeId || (employees[0]?.id ?? ''));
  const [activeTab, setActiveTab] = useState<'settlement_calculator' | 'employee_history'>('settlement_calculator');

  useEffect(() => {
    if (preSelectedEmployeeId) {
      setSelectedEmpId(preSelectedEmployeeId);
    }
  }, [preSelectedEmployeeId]);
  
  // Form fields
  const [selectedLeaveId, setSelectedLeaveId] = useState<string>('custom');
  const [dateFrom, setDateFrom] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [leaveDaysInput, setLeaveDaysInput] = useState<number>(30);
  const [ticketAllowanceInput, setTicketAllowanceInput] = useState<number>(150);
  const [deductionsInput, setDeductionsInput] = useState<number>(0);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [settlementState, setSettlementState] = useState<'draft' | 'validated' | 'paid'>('draft');

  // Modals for Header actions
  const [showNewLeaveModal, setShowNewLeaveModal] = useState<boolean>(false);
  const [showArchiveModal, setShowArchiveModal] = useState<boolean>(false);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  // New leave form state
  const [newLeaveType, setNewLeaveType] = useState<string>('ANNUAL');
  const [newLeaveFrom, setNewLeaveFrom] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newLeaveTo, setNewLeaveTo] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newLeaveDays, setNewLeaveDays] = useState<number>(1);
  const [newLeaveReason, setNewLeaveReason] = useState<string>('');

  // Archive leave form state
  const [archiveYear, setArchiveYear] = useState<string>('2025');
  const [archiveDays, setArchiveDays] = useState<number>(15);
  const [archiveReason, setArchiveReason] = useState<string>('رصيد إجازات مرحل من سنوات سابقة');

  // Custom manual history lines added during session
  const [manualHistoryLines, setManualHistoryLines] = useState<Array<{
    id: string;
    employeeId: string;
    transaction_date: string;
    description: string;
    days_taken: number;
    amount_paid: number;
    state: string;
  }>>([]);

  const selectedEmp = useMemo(() => {
    return employees.find(e => e.id === selectedEmpId) || employees[0];
  }, [employees, selectedEmpId]);

  const selectedContract = useMemo(() => {
    if (!selectedEmp) return null;
    return contracts.find(c => c.employeeId === selectedEmp.id && c.status === 'RUNNING') ||
           contracts.find(c => c.employeeId === selectedEmp.id);
  }, [contracts, selectedEmp]);

  // Approved leaves for current employee
  const employeeApprovedLeaves = useMemo(() => {
    if (!selectedEmp) return [];
    return leaves.filter(l => l.employeeId === selectedEmp.id && l.status === 'APPROVED');
  }, [leaves, selectedEmp]);

  // Handle selecting a specific approved leave
  const handleSelectLeave = (leaveId: string) => {
    setSelectedLeaveId(leaveId);
    if (leaveId === 'custom') {
      return;
    }
    const found = employeeApprovedLeaves.find(l => l.id === leaveId);
    if (found) {
      setDateFrom(found.startDate);
      setDateTo(found.endDate);
      setLeaveDaysInput(found.totalDays || 30);
    }
  };

  // Financial calculations: Kuwait Labor Law Article 70 (Daily wage = Gross Salary / 26)
  const basicSalary = selectedContract?.basicSalary || (selectedEmp as any)?.basicSalary || 0;
  const allowances = selectedContract 
    ? (selectedContract.housingAllowance || 0) + (selectedContract.transportAllowance || 0) + (selectedContract.otherAllowance || 0)
    : 0;
  const totalWage = basicSalary + allowances;
  const dailyWage = totalWage > 0 ? totalWage / 26 : 0;

  const openingBalance = selectedEmp ? getGlobalOpeningBalance(selectedEmp) : 0;
  const accruedBalance = selectedEmp ? getGlobalAccrued2026(selectedEmp) : 0;
  const totalAccrued = openingBalance + accruedBalance;

  const settlementData = useMemo(() => {
    const res = get_aysed_settlement_report_data(totalAccrued, leaveDaysInput, totalWage);
    return res || {
      total_accrued: totalAccrued,
      requested_days: leaveDaysInput,
      available_paid: totalAccrued,
      aysed_paid_days: Math.min(leaveDaysInput, totalAccrued),
      aysed_unpaid_days: Math.max(0, leaveDaysInput - totalAccrued),
      daily_wage: dailyWage,
      paid_amount: Math.min(leaveDaysInput, totalAccrued) * dailyWage
    };
  }, [totalAccrued, leaveDaysInput, totalWage, dailyWage]);

  const settlementAmount = settlementData?.paid_amount ?? (Math.min(leaveDaysInput, totalAccrued) * dailyWage);
  const netPayable = settlementAmount + ticketAllowanceInput - deductionsInput;

  // History lines
  const employeeHistoryLines = useMemo(() => {
    if (!selectedEmp) return [];
    const fromLeaves = leaves
      .filter(l => l.employeeId === selectedEmp.id)
      .map(l => ({
        id: l.id,
        employeeId: l.employeeId,
        transaction_date: l.startDate || l.createdAt || '2026-01-01',
        description: `${l.isHistorical ? 'إجازة سابقة مؤرشفة' : 'إجازة ' + (l.leaveType === 'ANNUAL' ? 'سنوية' : l.leaveType === 'SICK' ? 'مرضية' : 'اضطرارية')} (${l.reason || 'تسوية معتمدة'})`,
        days_taken: l.totalDays || 0,
        amount_paid: (l.totalDays || 0) * (dailyWage || 0),
        state: l.status === 'APPROVED' ? 'معتمد' : l.status === 'REJECTED' ? 'مرفوض' : 'قيد المراجعة'
      }));

    const sessionAdded = manualHistoryLines.filter(m => m.employeeId === selectedEmp.id);
    return [...fromLeaves, ...sessionAdded];
  }, [leaves, selectedEmp, dailyWage, manualHistoryLines]);

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

  const handleCreateNewLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp) return;
    const newReq: LeaveRequest = {
      id: `leave-req-${Date.now()}`,
      employeeId: selectedEmp.id,
      companyId: selectedEmp.companyId || activeCompany?.id || 'comp-1',
      leaveType: newLeaveType as any,
      startDate: newLeaveFrom,
      endDate: newLeaveTo,
      totalDays: Number(newLeaveDays) || 1,
      reason: newLeaveReason || 'طلب إجازة جديد عبر شاشة التسوية',
      status: 'APPROVED',
      createdAt: new Date().toISOString(),
    };

    if (onSaveLeave) {
      onSaveLeave(newReq);
    }
    
    // Add to session history
    setManualHistoryLines(prev => [{
      id: newReq.id,
      employeeId: selectedEmp.id,
      transaction_date: newReq.startDate,
      description: `إجازة ${newLeaveType === 'ANNUAL' ? 'سنوية' : newLeaveType} - ${newReq.reason}`,
      days_taken: newReq.totalDays,
      amount_paid: newReq.totalDays * dailyWage,
      state: 'معتمد'
    }, ...prev]);

    setShowNewLeaveModal(false);
    toast.success(`تم تسجيل طلب الإجازة للموظف ${selectedEmp.fullNameAr} بنجاح`);
  };

  const handleCreateArchiveLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp) return;
    const archiveLine = {
      id: `arch-${Date.now()}`,
      employeeId: selectedEmp.id,
      transaction_date: `${archiveYear}-01-01`,
      description: `أرشيف إجازات سنة ${archiveYear} (${archiveReason})`,
      days_taken: Number(archiveDays) || 0,
      amount_paid: (Number(archiveDays) || 0) * dailyWage,
      state: 'مؤرشف'
    };

    setManualHistoryLines(prev => [archiveLine, ...prev]);
    setShowArchiveModal(false);
    toast.success(`تم تسجيل الإجازة الأرشيفية لسنة ${archiveYear} بنجاح`);
  };

  return (
    <div className="w-full max-w-6xl mx-auto font-['Tajawal',sans-serif] select-none text-slate-800" dir="rtl">
      
      {/* Odoo Standard Form View Structure: <form string="تسوية المستحقات"> */}
      <div className="bg-white border border-slate-300 rounded-xl shadow-xs overflow-hidden">
        
        {/* 1. شريط الأزرار العلوي الرسمي (Header Actions & Statusbar) */}
        <header className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          
          {/* Action Buttons (Right in RTL) */}
          <div className="flex flex-wrap items-center gap-2">
            {/* action_new_leave: تقديم طلب إجازة جديد */}
            <button
              type="button"
              onClick={() => setShowNewLeaveModal(true)}
              className="bg-[#71639e] hover:bg-[#5e5284] text-white text-xs font-bold px-4 py-2 rounded-md flex items-center gap-2 shadow-xs transition-all cursor-pointer active:scale-95"
            >
              <Plus size={15} />
              <span>تقديم طلب إجازة جديد</span>
            </button>

            {/* action_print_settlement: حاسبة وطباعة التسوية */}
            <button
              type="button"
              onClick={() => setShowPrintModal(true)}
              className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold px-4 py-2 rounded-md flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <Printer size={15} className="text-[#71639e]" />
              <span>حاسبة وطباعة التسوية</span>
            </button>

            {/* action_archive_leave: تسجيل إجازة أرشيفية */}
            <button
              type="button"
              onClick={() => setShowArchiveModal(true)}
              className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold px-4 py-2 rounded-md flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <Archive size={15} className="text-slate-500" />
              <span>تسجيل إجازة أرشيفية</span>
            </button>
          </div>

          {/* Odoo Statusbar Arrow Breadcrumb */}
          <div className="flex items-center text-xs font-bold border border-slate-300 rounded-md overflow-hidden bg-white shadow-2xs">
            <button
              onClick={() => setSettlementState('draft')}
              className={`px-3 py-1.5 transition-colors cursor-pointer ${
                settlementState === 'draft' ? 'bg-[#71639e] text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              مسودة
            </button>
            <div className="w-[1px] h-full bg-slate-200"></div>
            <button
              onClick={() => setSettlementState('validated')}
              className={`px-3 py-1.5 transition-colors cursor-pointer ${
                settlementState === 'validated' ? 'bg-[#008784] text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              معتمد
            </button>
            <div className="w-[1px] h-full bg-slate-200"></div>
            <button
              onClick={() => setSettlementState('paid')}
              className={`px-3 py-1.5 transition-colors cursor-pointer ${
                settlementState === 'paid' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              تم الصرف
            </button>
          </div>
        </header>

        {/* 2. الورقة البيضاء الرسمية (Enterprise Sheet) */}
        <div className="p-8 sm:p-10 bg-white">
          
          {/* Top Row: Smart Button Box & Title */}
          <div className="flex flex-col-reverse md:flex-row items-start justify-between gap-6 pb-6 border-b border-slate-200">
            
            {/* الترويسة الرئيسية والوصف القانوني (oe_title) */}
            <div className="space-y-2 flex-1">
              <label htmlFor="employee_id" className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                الموظف المستحق (Employee)
              </label>
              
              <div className="flex items-center gap-3">
                <h1 style={{ color: '#71639e' }} className="text-2xl sm:text-3xl font-black">
                  <select
                    id="employee_id"
                    value={selectedEmpId}
                    onChange={(e) => setSelectedEmpId(e.target.value)}
                    className="bg-transparent border-b-2 border-[#71639e] text-[#71639e] font-black text-xl sm:text-2xl outline-none cursor-pointer py-1 pr-1 pl-4"
                  >
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id} className="text-slate-800 font-bold text-base">
                        {emp.fullNameAr} ({emp.employeeCode || emp.civilId})
                      </option>
                    ))}
                  </select>
                </h1>
              </div>

              <p className="text-slate-500 text-xs font-medium flex items-center gap-2">
                <ShieldCheck size={14} className="text-[#008784]" />
                <span>نظام تصفية المستحقات والإجازات وفق قانون العمل الكويتي - المادة (70)</span>
              </p>
            </div>

            {/* الأزرار الذكية أعلى اليسار / اليمين (Smart Buttons - oe_button_box) */}
            <div className="flex items-center gap-2 self-end md:self-start">
              <button
                type="button"
                onClick={() => {
                  if (onNavigateToTab) {
                    onNavigateToTab('BALANCES');
                  } else {
                    setActiveTab('employee_history');
                  }
                }}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg p-3 flex items-center gap-3 text-right shadow-2xs transition-all cursor-pointer group min-w-[170px]"
                title="عرض الأرصدة والافتتاحي"
              >
                <div className="p-2 bg-[#71639e]/10 text-[#71639e] rounded-md group-hover:bg-[#71639e] group-hover:text-white transition-colors">
                  <Calendar size={20} />
                </div>
                <div>
                  <span className="block text-xs font-bold text-slate-500">الأرصدة والافتتاحي</span>
                  <span className="block text-sm font-black text-[#71639e] font-mono mt-0.5">
                    {totalAccrued.toFixed(1)} يوم متاح
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* 3. التبويبات المنظمة (Notebook Pages) */}
          <div className="mt-6">
            
            {/* Notebook Tabs Header */}
            <div className="flex items-center border-b border-slate-200 gap-4 mb-6">
              <button
                type="button"
                onClick={() => setActiveTab('settlement_calculator')}
                className={`pb-3 text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer border-b-2 ${
                  activeTab === 'settlement_calculator'
                    ? 'border-[#71639e] text-[#71639e]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Calculator size={16} />
                <span>حاسبة التسوية الرسمية</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('employee_history')}
                className={`pb-3 text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer border-b-2 ${
                  activeTab === 'employee_history'
                    ? 'border-[#71639e] text-[#71639e]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <History size={16} />
                <span>كشف حركة الموظف والأرشيف ({employeeHistoryLines.length})</span>
              </button>
            </div>

            {/* Page 1: حاسبة التسوية الرسمية (settlement_calculator) */}
            {activeTab === 'settlement_calculator' && (
              <div className="space-y-8">
                
                {/* 2-Column Group Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  
                  {/* Group 1: تفاصيل الإجازة */}
                  <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-5 space-y-4">
                    <div className="border-b border-slate-200 pb-2 mb-3 flex items-center justify-between">
                      <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                        <FileText size={16} className="text-[#71639e]" />
                        <span>تفاصيل الإجازة</span>
                      </h3>
                      <span className="text-[11px] bg-purple-100 text-[#71639e] px-2 py-0.5 rounded font-bold">
                        Leave Info
                      </span>
                    </div>

                    {/* leave_id */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600">طلب الإجازة المراد تسويته:</label>
                      <select
                        value={selectedLeaveId}
                        onChange={(e) => handleSelectLeave(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-800 outline-none focus:border-[#71639e]"
                      >
                        <option value="custom">-- إجازة محددة مخصصة (إدخال يدوي للأيام) --</option>
                        {employeeApprovedLeaves.map(l => (
                          <option key={l.id} value={l.id}>
                            إجازة {l.leaveType === 'ANNUAL' ? 'سنوية' : l.leaveType} ({l.startDate} إلى {l.endDate}) - {l.totalDays} يوم
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* date_from */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600">تاريخ البدء (Date From):</label>
                        <input
                          type="date"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-mono font-bold text-slate-800 outline-none focus:border-[#71639e]"
                        />
                      </div>

                      {/* date_to */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600">تاريخ النهاية (Date To):</label>
                        <input
                          type="date"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-mono font-bold text-slate-800 outline-none focus:border-[#71639e]"
                        />
                      </div>
                    </div>

                    {/* number_of_days */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600">عدد أيام الإجازة المطلوبة:</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={leaveDaysInput}
                          onChange={(e) => setLeaveDaysInput(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-mono font-black text-slate-800 outline-none focus:border-[#71639e]"
                        />
                        <span className="text-xs font-bold text-slate-500 min-w-[30px]">يوم</span>
                      </div>
                    </div>

                    {/* Additional allowances & deductions */}
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600">بدل تذاكر السفر (د.ك):</label>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={ticketAllowanceInput}
                          onChange={(e) => setTicketAllowanceInput(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-mono font-bold text-slate-800 outline-none focus:border-[#71639e]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600">استقطاعات / سلف (د.ك):</label>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={deductionsInput}
                          onChange={(e) => setDeductionsInput(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-mono font-bold text-rose-700 outline-none focus:border-rose-400"
                        />
                      </div>
                    </div>

                    {/* Days Breakdown Helper Box */}
                    <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs space-y-1.5 font-medium">
                      <div className="flex justify-between text-slate-600">
                        <span>الرصيد التراكمي المتاح:</span>
                        <span className="font-mono font-bold text-[#71639e]">{totalAccrued.toFixed(1)} يوم</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>أيام مستحقة براتب مدفوع:</span>
                        <span className="font-mono font-bold text-blue-700">{(settlementData?.aysed_paid_days || 0).toFixed(1)} يوم</span>
                      </div>
                      {(settlementData?.aysed_unpaid_days || 0) > 0 && (
                        <div className="flex justify-between text-rose-600 font-bold">
                          <span>أيام بدون راتب (تخصم من الخدمة):</span>
                          <span className="font-mono">{settlementData.aysed_unpaid_days.toFixed(1)} يوم</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Group 2: الاحتساب المالي (أجر اليوم = الراتب ÷ 26) */}
                  <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-5 space-y-4 flex flex-col justify-between">
                    <div>
                      <div className="border-b border-slate-200 pb-2 mb-3 flex items-center justify-between">
                        <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                          <DollarSign size={16} className="text-[#008784]" />
                          <span>الاحتساب المالي (أجر اليوم = الراتب ÷ 26)</span>
                        </h3>
                        <span className="text-[11px] bg-teal-100 text-[#008784] px-2 py-0.5 rounded font-bold">
                          Article 70
                        </span>
                      </div>

                      <div className="space-y-2.5 text-xs">
                        {/* basic_salary */}
                        <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200">
                          <span className="font-bold text-slate-600">الراتب الأساسي (Basic Salary):</span>
                          <span className="font-mono font-bold text-slate-800">{basicSalary.toFixed(3)} د.ك</span>
                        </div>

                        {/* allowances */}
                        <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200">
                          <span className="font-bold text-slate-600">إجمالي البدلات المعتمدة (Allowances):</span>
                          <span className="font-mono font-bold text-slate-800">{allowances.toFixed(3)} د.ك</span>
                        </div>

                        {/* total_wage */}
                        <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200">
                          <span className="font-bold text-slate-700">إجمالي الراتب الخاضع للاحتساب (Total Wage):</span>
                          <span className="font-mono font-black text-slate-900 text-sm">{totalWage.toFixed(3)} د.ك</span>
                        </div>

                        {/* daily_wage */}
                        <div className="flex items-center justify-between p-2.5 bg-purple-50/70 rounded-lg border border-purple-200">
                          <div>
                            <span className="font-bold text-[#71639e] block">أجر اليوم القانوني (Daily Wage):</span>
                            <span className="text-[10px] text-purple-600 font-mono">قانون العمل: {totalWage.toFixed(3)} ÷ 26</span>
                          </div>
                          <span className="font-mono font-black text-[#71639e] text-base">{dailyWage.toFixed(3)} د.ك</span>
                        </div>

                        {/* settlement_amount */}
                        <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-200 oe_subtotal_footer_separator font-weight-bold">
                          <div>
                            <span className="font-black text-emerald-900 block text-xs">إجمالي مبلغ تسوية الإجازة:</span>
                            <span className="text-[10px] text-emerald-700 font-mono">{(settlementData?.aysed_paid_days || 0)} يوم × {dailyWage.toFixed(3)} د.ك</span>
                          </div>
                          <span style={{ color: '#008784' }} className="font-mono font-black text-lg">
                            {settlementAmount.toFixed(3)} د.ك
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Net Payable Box */}
                    <div className="p-4 bg-slate-900 text-white rounded-xl shadow-xs mt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-slate-300 block">صافي المستحق النهائي للصرف (NET PAYABLE)</span>
                          <span className="text-[10px] text-slate-400 font-mono">تسوية الإجازة + تذاكر ({ticketAllowanceInput}) - استقطاعات ({deductionsInput})</span>
                        </div>
                        <div className="text-left">
                          <span className="font-mono font-black text-2xl text-emerald-400">
                            {netPayable.toFixed(3)} د.ك
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Document Preview Link */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Printer size={20} className="text-[#71639e]" />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">سند تسوية الإجازة الرسمي جاهز للطباعة والاعتماد</span>
                      <span className="text-[11px] text-slate-500">يتضمن جدول الأرصدة، الاحتساب المالي، الإقرار القانوني ودورة التوقيعات</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowPrintModal(true)}
                    className="bg-[#71639e] hover:bg-[#5e5284] text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition cursor-pointer shadow-xs"
                  >
                    <Printer size={15} />
                    <span>معاينة وطباعة المستند</span>
                  </button>
                </div>
              </div>
            )}

            {/* Page 2: كشف حركة الموظف والأرشيف (employee_history) */}
            {activeTab === 'employee_history' && (
              <div className="space-y-4">
                
                {/* Actions above tree */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600">
                    سجل الإجازات والتسويات التاريخية المسجلة للموظف ({employeeHistoryLines.length} حركة)
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowArchiveModal(true)}
                      className="text-xs font-bold text-[#71639e] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>إضافة سطر أرشيفي جديد</span>
                    </button>
                  </div>
                </div>

                {/* Odoo Standard Tree View: <tree editable="bottom"> */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3.5">تاريخ الحركة (Transaction Date)</th>
                        <th className="p-3.5">البيان / نوع الإجازة (Description)</th>
                        <th className="p-3.5 text-center">الأيام المستهلكة (Days)</th>
                        <th className="p-3.5 text-center">المبلغ المنصرف (Amount Paid)</th>
                        <th className="p-3.5 text-center">الحالة (State)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {employeeHistoryLines.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-400 font-bold">
                            لا توجد حركات أو إجازات سابقة مسجلة لهذا الموظف
                          </td>
                        </tr>
                      ) : (
                        employeeHistoryLines.map((line, idx) => (
                          <tr key={line.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                            <td className="p-3.5 font-mono text-slate-700 font-bold">{line.transaction_date}</td>
                            <td className="p-3.5 font-bold text-slate-800">{line.description}</td>
                            <td className="p-3.5 text-center font-mono font-bold text-purple-900">{line.days_taken} يوم</td>
                            <td className="p-3.5 text-center font-mono font-bold text-emerald-800">{line.amount_paid.toFixed(3)} د.ك</td>
                            <td className="p-3.5 text-center">
                              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                line.state === 'معتمد' 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : line.state === 'مؤرشف' 
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {line.state}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: تقديم طلب إجازة جديد */}
      {showNewLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 font-['Tajawal']" dir="rtl">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Plus size={18} className="text-[#71639e]" />
                تقديم طلب إجازة جديد للموظف: {selectedEmp?.fullNameAr}
              </h3>
              <button 
                onClick={() => setShowNewLeaveModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateNewLeave} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">نوع الإجازة:</label>
                <select
                  value={newLeaveType}
                  onChange={(e) => setNewLeaveType(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 font-bold"
                >
                  <option value="ANNUAL">إجازة سنوية اعتيادية (Annual Leave)</option>
                  <option value="SICK">إجازة مرضية (Sick Leave)</option>
                  <option value="EMERGENCY">إجازة اضطرارية (Emergency)</option>
                  <option value="UNPAID">إجازة بدون راتب (Unpaid)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">من تاريخ:</label>
                  <input
                    type="date"
                    value={newLeaveFrom}
                    onChange={(e) => setNewLeaveFrom(e.target.value)}
                    required
                    className="w-full border border-slate-300 rounded-lg p-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">إلى تاريخ:</label>
                  <input
                    type="date"
                    value={newLeaveTo}
                    onChange={(e) => setNewLeaveTo(e.target.value)}
                    required
                    className="w-full border border-slate-300 rounded-lg p-2 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">عدد الأيام:</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={newLeaveDays}
                  onChange={(e) => setNewLeaveDays(parseFloat(e.target.value) || 1)}
                  required
                  className="w-full border border-slate-300 rounded-lg p-2 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">السبب / الملاحظات:</label>
                <input
                  type="text"
                  value={newLeaveReason}
                  onChange={(e) => setNewLeaveReason(e.target.value)}
                  placeholder="إجازة دورية سنوية..."
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowNewLeaveModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-bold hover:bg-slate-50 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#71639e] hover:bg-[#5e5284] text-white rounded-lg font-bold cursor-pointer shadow-xs"
                >
                  تسجيل واعتماد الطلب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: تسجيل إجازة أرشيفية */}
      {showArchiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 font-['Tajawal']" dir="rtl">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Archive size={18} className="text-purple-600" />
                تسجيل حركة إجازة أرشيفية سابقة
              </h3>
              <button 
                onClick={() => setShowArchiveModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateArchiveLeave} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">السنة الأرشيفية:</label>
                  <input
                    type="number"
                    value={archiveYear}
                    onChange={(e) => setArchiveYear(e.target.value)}
                    required
                    className="w-full border border-slate-300 rounded-lg p-2 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">عدد الأيام المستهلكة:</label>
                  <input
                    type="number"
                    step="0.5"
                    value={archiveDays}
                    onChange={(e) => setArchiveDays(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full border border-slate-300 rounded-lg p-2 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">البيان / تفاصيل الإجازة الأرشيفية:</label>
                <input
                  type="text"
                  value={archiveReason}
                  onChange={(e) => setArchiveReason(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowArchiveModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-bold hover:bg-slate-50 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#71639e] hover:bg-[#5e5284] text-white rounded-lg font-bold cursor-pointer shadow-xs"
                >
                  حفظ في الأرشيف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: حاسبة وطباعة التسوية الرسمية */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 font-['Tajawal'] overflow-y-auto" dir="rtl">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Printer size={20} className="text-[#71639e]" />
                <h3 className="font-bold text-base text-slate-900">
                  سند تسوية وتصفية إجازة موظف (Kuwait Law Clearance Report)
                </h3>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePdfExport}
                  disabled={isExporting}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  <span>تحميل PDF</span>
                </button>

                <button
                  onClick={handlePrint}
                  className="bg-[#71639e] hover:bg-[#5e5284] text-white text-xs font-bold px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-300" />
                  <span>طباعة فورية</span>
                </button>

                <button 
                  onClick={() => setShowPrintModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded cursor-pointer mr-2"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Printable Document Area */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-100 rounded-xl">
              <div 
                id="leave-clearance-print-area" 
                className="p-8 sm:p-10 bg-white text-slate-900 text-right max-w-3xl mx-auto border border-slate-300 rounded-xl shadow-sm print:border-none print:shadow-none print:p-0"
                style={{ direction: 'rtl', textAlign: 'right', fontFamily: "'Cairo', 'Tajawal', sans-serif" }}
              >
                {/* ترويسة التقرير */}
                <div className="text-center border-b-2 border-[#71639e] pb-4 mb-6">
                  <h2 className="text-2xl font-black text-slate-900">نـموذج تـسوية وتـصفية إجـازة مـوظف</h2>
                  <p className="text-xs text-slate-600 font-bold mt-1">نـظام Aysed S HR 2026 - الكـويت (المادة 70)</p>
                </div>

                {/* جدول البيانات الأساسية */}
                <table className="table table-sm table-bordered w-full text-xs border border-slate-300 mb-6">
                  <tbody>
                    <tr className="bg-slate-50">
                      <td className="p-2.5 border border-slate-300 font-bold w-1/4">الـرقم المـدني:</td>
                      <td className="p-2.5 border border-slate-300 font-mono font-bold w-1/4">{selectedEmp?.civilId || '-'}</td>
                      <td className="p-2.5 border border-slate-300 font-bold w-1/4">تـاريخ المـباشرة:</td>
                      <td className="p-2.5 border border-slate-300 font-mono w-1/4">{selectedEmp?.joinDate || (selectedEmp as any)?.joiningDate || '-'}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 border border-slate-300 font-bold">اسم الموظف والكود:</td>
                      <td className="p-2.5 border border-slate-300 font-bold text-slate-900" colSpan={3}>{selectedEmp?.fullNameAr} ({selectedEmp?.employeeCode})</td>
                    </tr>
                  </tbody>
                </table>

                {/* ملخص الأرصدة */}
                <h4 className="text-sm font-bold text-slate-900 mt-6 mb-3">١. مـلخص الـأرصدة (Days Summary)</h4>
                <table className="table table-bordered w-full text-xs border border-slate-300 text-center mb-6">
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }} className="font-bold text-slate-900 border-b border-slate-300">
                      <th className="p-2.5 border border-slate-300">إجـمالي الـرصيد المـستحق</th>
                      <th className="p-2.5 border border-slate-300">أيام مـدفوعة (بـراتب)</th>
                      <th className="p-2.5 border border-slate-300 text-rose-700">أيام خـصم (بـدون راتب)</th>
                      <th className="p-2.5 border border-slate-300">الـرصيد المـتبقي بـعد الـتصفية</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2.5 border border-slate-300 font-mono font-bold">{totalAccrued.toFixed(1)} يوم</td>
                      <td className="p-2.5 border border-slate-300 font-mono font-bold text-blue-900">{(settlementData?.aysed_paid_days || 0).toFixed(1)} يوم</td>
                      <td className="p-2.5 border border-slate-300 font-mono font-bold text-rose-700">{(settlementData?.aysed_unpaid_days || 0).toFixed(1)} يوم</td>
                      <td className="p-2.5 border border-slate-300 font-mono font-bold text-emerald-800">
                        {Math.max(0, totalAccrued - leaveDaysInput).toFixed(1)} يـوم
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* التسوية المالية */}
                <h4 className="text-sm font-bold text-slate-900 mt-6 mb-3">٢. الـتسوية المـالية (Financial Settlement)</h4>
                <table className="table table-sm w-full text-xs border border-slate-300 mb-4">
                  <tbody>
                    <tr className="bg-slate-100 border-b border-slate-300">
                      <td className="p-3 font-bold">
                        إجـمالي المـبلغ المـستحق لـلإجازة ({settlementData?.aysed_paid_days || 0} يوم × أجر اليوم {dailyWage.toFixed(3)} د.ك)
                      </td>
                      <td className="p-3 text-left font-mono font-bold text-base text-blue-900" dir="ltr">{settlementAmount.toFixed(3)} د.ك</td>
                    </tr>
                    {ticketAllowanceInput > 0 && (
                      <tr className="border-b border-slate-300">
                        <td className="p-2.5 font-bold">بدل تذاكر السفر المعتمد</td>
                        <td className="p-2.5 text-left font-mono font-bold" dir="ltr">{ticketAllowanceInput.toFixed(3)} د.ك</td>
                      </tr>
                    )}
                    {deductionsInput > 0 && (
                      <tr className="border-b border-slate-300 bg-rose-50/50">
                        <td className="p-2.5 font-bold text-rose-800">استقطاعات وسلفيات مسجلة</td>
                        <td className="p-2.5 text-left font-mono font-bold text-rose-700" dir="ltr">-{deductionsInput.toFixed(3)} د.ك</td>
                      </tr>
                    )}
                    <tr className="bg-slate-900 text-white font-bold text-sm">
                      <td className="p-3">صافي المستحق النهائي (NET PAYABLE)</td>
                      <td className="p-3 text-left font-mono text-emerald-400 font-black text-base" dir="ltr">{netPayable.toFixed(3)} د.ك</td>
                    </tr>
                  </tbody>
                </table>

                <p className="text-xs text-slate-600 mt-4">* تـنبيه: تـم تـرحيل الأيام بـدون راتب لـخصمها مـن مـدة الخـدمة الـقانونية وفق المادة (70).</p>

                {/* الإقرار والتوقيعات */}
                <div className="border border-slate-300 p-3 rounded-lg text-xs text-slate-700 bg-slate-50 mb-8 mt-4 leading-relaxed">
                  <strong>إقرار وتعهد: </strong> أقر أنا الموقع أدناه باستلام كامل المبلغ والمستحقات الموضحة أعلاه، وبموجبه أبرئ ذمة المؤسسة من أي مستحقات عن هذه الفترة بعد التوقيع.
                </div>

                <div className="grid grid-cols-4 gap-4 text-center text-xs pt-4 border-t border-slate-300">
                  <div>
                    <p className="font-bold text-slate-800">المحاسبة</p>
                    <p className="text-slate-400 mt-8 text-[10px]">التوقيع: ..................</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">الموارد البشرية (HR)</p>
                    <p className="text-slate-400 mt-8 text-[10px]">التوقيع: ..................</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">المدير الاداري</p>
                    <p className="text-slate-400 mt-8 text-[10px]">الختم والتوقيع: .........</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">توقيع واستلام الموظف</p>
                    <p className="text-slate-400 mt-8 text-[10px]">التوقيع: ..................</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveSettlementCalculator;
