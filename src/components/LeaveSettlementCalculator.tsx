import React, { useState, useMemo, useEffect } from 'react';
import { Employee, Contract, LeaveRequest, AttendanceRecord, Company, HrLeaveAllocation, UniversalSettlementItem, LeaveSettlementVoucher } from '../types';
import { 
  Printer, Calculator, DollarSign, Calendar, User, 
  FileText, ShieldCheck, Download, Loader2, Plus, 
  Archive, ChevronRight, CheckCircle2, History, AlertCircle,
  Building, Briefcase, Hash, CreditCard, Sparkles, X,
  Trash2, Eye, RefreshCw, Layers, Check, Coins, ArrowRight,
  TrendingUp, Clock, FileCheck, ArrowDownRight, Tag
} from 'lucide-react';
import { printDocument, exportElementToPdf } from '../utils/printUtils';
import { 
  computeFifoLeaveAllocations, 
  buildEmployeeBaselineAllocations 
} from '../services/leaveService';
import { 
  calculateKuwaitDailyRate,
  calculateKuwaitHourlyRate,
  calculatePhysicalWorkedDays,
  calculateUniversalLeaveSettlement,
  getSavedSettlementVouchers,
  saveSettlementVoucher,
  deleteSettlementVoucher,
  liquidateLeaveBalanceInAllocations
} from '../services/leaveSettlementService';
import { LeaveClearanceDocument } from './LeaveClearanceDocument';
import { calculateUnifiedLeaveBalance, buildLeaveRecordsFromEmployee } from '../utils/leaveEngine';
import toast from 'react-hot-toast';

interface DecimalInputProps {
  value: number;
  onChange: (val: number) => void;
  className?: string;
  min?: number;
  max?: number;
  placeholder?: string;
}

const DecimalInput: React.FC<DecimalInputProps> = ({
  value,
  onChange,
  className = '',
  min,
  max,
  placeholder,
}) => {
  const [text, setText] = useState<string>(value !== undefined && value !== null ? value.toString() : '0');

  useEffect(() => {
    if (value !== undefined && value !== null) {
      const parsedCurrent = parseFloat(text);
      if (parsedCurrent !== value && text !== '' && text !== '.' && text !== '-.' && text !== '-0') {
        setText(value.toString());
      }
    }
  }, [value]);

  return (
    <input
      type="text"
      inputMode="decimal"
      placeholder={placeholder}
      value={text}
      onChange={(e) => {
        const val = e.target.value;
        if (/^-?\d*\.?\d*$/.test(val) || val === '') {
          setText(val);
          if (val === '' || val === '.' || val === '-' || val === '-.') {
            onChange(0);
          } else {
            const num = parseFloat(val);
            if (!isNaN(num)) {
              let finalNum = num;
              if (min !== undefined && finalNum < min) finalNum = min;
              if (max !== undefined && finalNum > max) finalNum = max;
              onChange(finalNum);
            }
          }
        }
      }}
      className={className}
    />
  );
};

export interface LeaveSettlementCalculatorProps {
  allocations?: HrLeaveAllocation[];
  onOpenLeaveModal?: (empId: string) => void;
  employees: Employee[];
  contracts?: Contract[];
  leaves?: LeaveRequest[];
  attendance?: AttendanceRecord[];
  activeCompany?: Company;
  preSelectedEmployeeId?: string;
  onNavigateToTab?: (tab: string) => void;
  onSaveLeave?: (leave: LeaveRequest) => void;
  onUpdateAllocations?: (updated: HrLeaveAllocation[]) => void;
  onUpdateEmployee?: (updated: Employee) => void;
}

export const LeaveSettlementCalculator: React.FC<LeaveSettlementCalculatorProps> = ({
  allocations = [],
  onOpenLeaveModal,
  employees = [],
  contracts = [],
  leaves = [],
  attendance = [],
  activeCompany,
  preSelectedEmployeeId,
  onNavigateToTab,
  onSaveLeave,
  onUpdateAllocations,
  onUpdateEmployee,
}) => {
  const [selectedEmpId, setSelectedEmpId] = useState<string>(preSelectedEmployeeId || (employees[0]?.id ?? ''));
  const [activeTab, setActiveTab] = useState<'settlement_calculator' | 'vouchers_archive' | 'employee_history'>('settlement_calculator');

  useEffect(() => {
    if (preSelectedEmployeeId) {
      setSelectedEmpId(preSelectedEmployeeId);
    }
  }, [preSelectedEmployeeId]);
  
  // Selected Employee & Contract
  const selectedEmp = useMemo(() => {
    return employees.find(e => e.id === selectedEmpId) || employees[0];
  }, [employees, selectedEmpId]);

  const selectedContract = useMemo(() => {
    if (!selectedEmp) return null;
    return contracts.find(c => c.employeeId === selectedEmp.id && c.status === 'RUNNING') ||
           contracts.find(c => c.employeeId === selectedEmp.id);
  }, [contracts, selectedEmp]);

  // FIFO Leave Balances calculation
  const empFifo = useMemo(() => {
    if (!selectedEmp) return null;
    return computeFifoLeaveAllocations(
      selectedEmp, 
      buildEmployeeBaselineAllocations(selectedEmp, allocations || []), 
      leaves || []
    );
  }, [selectedEmp, allocations, leaves]);

  const carriedOverBal = empFifo?.allocations.filter(a => a.allocationType === 'regular').reduce((sum, a) => sum + (a.numberOfDays || 0), 0) || 0;
  const accruedBalance = empFifo?.allocations.filter(a => a.allocationType === 'accrual').reduce((sum, a) => sum + (a.numberOfDays || 0), 0) || 0;
  const totalTaken = empFifo?.totalConsumed || 0;
  const netAvailable = Number((empFifo?.netAvailable || 0).toFixed(2));

  // Wages calculation (Kuwait Labor Law 26-day basis)
  const basicSalary = selectedContract?.basicSalary || (selectedEmp as any)?.basicSalary || 0;
  const allowances = selectedContract 
    ? (selectedContract.housingAllowance || 0) + (selectedContract.transportAllowance || 0) + (selectedContract.otherAllowance || 0)
    : 0;
  const grossSalary = basicSalary + allowances;
  const dailyWage = grossSalary > 0 ? calculateKuwaitDailyRate(grossSalary) : 0;
  const hourlyWage = dailyWage > 0 ? calculateKuwaitHourlyRate(dailyWage, 8) : 0;

  // Form State: Settlement Mode & Basic parameters
  const [settlementMode, setSettlementMode] = useState<'LEAVE_WITH_TRAVEL' | 'ENCASHMENT_LIQUIDATION' | 'CUSTOM'>('LEAVE_WITH_TRAVEL');
  const [settlementDate, setSettlementDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [departureDate, setDepartureDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [returnDate, setReturnDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [selectedLeaveId, setSelectedLeaveId] = useState<string>('custom');

  // Dynamic Financial Items Form Inputs
  const [consumedLeaveDays, setConsumedLeaveDays] = useState<number>(0);
  const [statutoryLeaveDays, setStatutoryLeaveDays] = useState<number>(0);
  const [unpaidLeaveDays, setUnpaidLeaveDays] = useState<number>(0);

  // 1. Pro-rated Salary (حساب الأيام الفعلية السابقة للسفر بدقة بدون تكرار)
  const [includeProratedSalary, setIncludeProratedSalary] = useState<boolean>(true);
  const [workedDaysInMonth, setWorkedDaysInMonth] = useState<number>(() => {
    const today = new Date();
    const phys = calculatePhysicalWorkedDays(today.toISOString().split('T')[0]);
    return phys.workingDays > 0 ? phys.workingDays : Math.min(26, Math.max(1, today.getDate() - 1));
  });

  // Auto-sync encashment days when employee or mode changes
  useEffect(() => {
    if (settlementMode === 'ENCASHMENT_LIQUIDATION') {
      setEncashmentDays(netAvailable);
      setIncludeEncashment(true);
      setIncludeProratedSalary(false);
      setWorkedDaysInMonth(0);
      setTicketAllowance(0);
      setConsumedLeaveDays(0);
      setStatutoryLeaveDays(0);
      setUnpaidLeaveDays(0);
    }
  }, [selectedEmpId, netAvailable, settlementMode]);

  // Additional safety check to keep encashmentDays in sync with netAvailable during liquidation
  useEffect(() => {
    if (settlementMode === 'ENCASHMENT_LIQUIDATION' && netAvailable > 0 && encashmentDays !== netAvailable) {
      setEncashmentDays(netAvailable);
    }
  }, [netAvailable, settlementMode]);

  // Auto-sync worked days when departure date changes
  const handleDepartureDateChange = (newDateStr: string) => {
    setDepartureDate(newDateStr);
    if (includeProratedSalary && settlementMode !== 'ENCASHMENT_LIQUIDATION') {
      const phys = calculatePhysicalWorkedDays(newDateStr);
      if (phys.workingDays >= 0) {
        setWorkedDaysInMonth(phys.workingDays);
      }
    }
  };

  // 2. Overtime
  const [includeOvertime, setIncludeOvertime] = useState<boolean>(false);
  const [overtimeHours, setOvertimeHours] = useState<number>(0);
  const [overtimeMultiplier, setOvertimeMultiplier] = useState<number>(1.25);

  // 3. Leave Encashment (البدل النقدي لرصيد الإجازات المتبقي / تسييل وتصفية الرصيد)
  const [includeEncashment, setIncludeEncashment] = useState<boolean>(false);
  const [encashmentDays, setEncashmentDays] = useState<number>(0);

  // Handle switching settlement modes cleanly
  const handleModeChange = (mode: 'LEAVE_WITH_TRAVEL' | 'ENCASHMENT_LIQUIDATION' | 'CUSTOM') => {
    setSettlementMode(mode);
    if (mode === 'ENCASHMENT_LIQUIDATION') {
      // وضع صرف رصيد الإجازات فقط بدون إجازة:
      // يتم تسييل الرصيد المتاح فقط، واستبعاد راتب أيام العمل وتذاكر السفر تلقائياً
      setIncludeEncashment(true);
      setEncashmentDays(netAvailable);
      setConsumedLeaveDays(0);
      setStatutoryLeaveDays(0);
      setUnpaidLeaveDays(0);
      setIncludeProratedSalary(false);
      setWorkedDaysInMonth(0);
      setTicketAllowance(0);
      setIncludeOvertime(false);
      setHousingAllowance(0);
      setVoucherNotes('صرف البدل النقدي لرصيد الإجازات بدون إجازة (تسوية رصيد الإجازات فقط) وفق المادة 70 من قانون العمل الكويتي');
    } else if (mode === 'LEAVE_WITH_TRAVEL') {
      setIncludeEncashment(false);
      setEncashmentDays(0);
      setConsumedLeaveDays(0);
      setIncludeProratedSalary(true);
      const phys = calculatePhysicalWorkedDays(departureDate);
      setWorkedDaysInMonth(phys.workingDays > 0 ? phys.workingDays : 1);
      setTicketAllowance(150);
      setVoucherNotes('تسوية وتصفية مستحقات إجازة وسفر وفق أحكام قانون العمل الكويتي (المادة 70)');
    } else {
      setVoucherNotes('تسوية مستحقات مالية شاملة مخصصة للموظف');
    }
  };

  // 4. Other allowances & deductions
  const [ticketAllowance, setTicketAllowance] = useState<number>(150);
  const [housingAllowance, setHousingAllowance] = useState<number>(0);
  const [loanDeduction, setLoanDeduction] = useState<number>(0);
  const [salaryAdvanceDeduction, setSalaryAdvanceDeduction] = useState<number>(0);
  const [adminDeduction, setAdminDeduction] = useState<number>(0);

  // Custom Items
  const [customItems, setCustomItems] = useState<UniversalSettlementItem[]>([]);
  const [newCustomName, setNewCustomName] = useState<string>('');
  const [newCustomType, setNewCustomType] = useState<'EARNING' | 'DEDUCTION'>('EARNING');
  const [newCustomAmount, setNewCustomAmount] = useState<number>(0);
  const [newCustomNotes, setNewCustomNotes] = useState<string>('');
  const [showAddCustomModal, setShowAddCustomModal] = useState<boolean>(false);

  // Status and UI state
  const [settlementState, setSettlementState] = useState<'draft' | 'validated' | 'paid'>('draft');
  const [paymentMethod, setPaymentMethod] = useState<'BANK_TRANSFER' | 'CASH' | 'CHEQUE'>('BANK_TRANSFER');
  const [voucherNotes, setVoucherNotes] = useState<string>('تسوية وتصفية مستحقات إجازة وفق أحكام قانون العمل الكويتي (المادة 70)');
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Saved vouchers in persistent storage
  const [savedVouchers, setSavedVouchers] = useState<LeaveSettlementVoucher[]>(() => {
    return getSavedSettlementVouchers(activeCompany?.id);
  });
  const [viewingVoucher, setViewingVoucher] = useState<LeaveSettlementVoucher | null>(null);

  // Unlock Modal State
  const [showUnlockModal, setShowUnlockModal] = useState<boolean>(false);
  const [unlockTarget, setUnlockTarget] = useState<{ id: string; voucherNumber: string } | null>(null);
  const [unlockReasonInput, setUnlockReasonInput] = useState<string>('');

  // Archive leave modal
  const [showArchiveModal, setShowArchiveModal] = useState<boolean>(false);
  const [archiveYear, setArchiveYear] = useState<string>('2025');
  const [archiveDays, setArchiveDays] = useState<number>(15);
  const [archiveReason, setArchiveReason] = useState<string>('رصيد إجازات مرحل من سنوات سابقة');

  // Approved leaves for employee
  const employeeLeavesForSettlement = useMemo(() => {
    if (!selectedEmp) return [];
    return leaves.filter(l => l.employeeId === selectedEmp.id && ['APPROVED', 'SUBMITTED', 'PENDING_MANAGER', 'PENDING_HR'].includes(l.status));
  }, [leaves, selectedEmp]);

  // Handle selecting a specific approved leave
  const handleSelectLeave = (leaveId: string) => {
    setSelectedLeaveId(leaveId);
    if (leaveId === 'custom') return;
    const found = employeeLeavesForSettlement.find(l => l.id === leaveId);
    if (found) {
      handleDepartureDateChange(found.startDate);
      setReturnDate(found.endDate);
      
      // If split bereavement or bereavement leave
      if (found.leaveType === 'BEREAVEMENT' || found.isSplitBereavement) {
        const statutory = found.bereavementStatutoryDays || 3;
        setStatutoryLeaveDays(statutory);
        const regularTaken = found.annualDeductedDays ?? Math.max(0, (found.totalDays || 0) - statutory);
        setConsumedLeaveDays(regularTaken);
      } else {
        setConsumedLeaveDays(found.paidDays !== undefined ? found.paidDays : (found.totalDays || 0));
        setStatutoryLeaveDays(0);
      }
      setUnpaidLeaveDays(found.unpaidDays || found.excessDays || 0);
    }
  };

  // Voucher number state for session stability
  const [currentVoucherNumber, setCurrentVoucherNumber] = useState<string>(() => 
    `LST-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  );

  // Refresh saved vouchers on company switch
  useEffect(() => {
    setSavedVouchers(getSavedSettlementVouchers(activeCompany?.id));
  }, [activeCompany?.id]);

  // Compute Universal Settlement Result live
  const settlementResult = useMemo(() => {
    if (!selectedEmp) return null;

    return calculateUniversalLeaveSettlement({
      voucherNumber: currentVoucherNumber,
      companyId: activeCompany?.id || selectedEmp.companyId || 'comp-1',
      employeeId: selectedEmp.id,
      settlementMode,
      settlementDate,
      departureDate,
      returnDate,
      basicSalary,
      allowances,
      grossSalary,
      dailyWage,
      hourlyWage,
      carriedOverBalance: carriedOverBal,
      accruedBalance: accruedBalance,
      totalAvailableBalance: netAvailable,
      requestedLeaveDays: consumedLeaveDays + statutoryLeaveDays + unpaidLeaveDays,
      statutoryLeaveDays,
      consumedLeaveDays,
      unpaidLeaveDays,
      includeProratedSalary,
      workedDaysInMonth,
      proratedSalaryDivisor: 26,
      includeOvertime,
      overtimeHours,
      overtimeMultiplier,
      includeEncashment,
      encashmentDays,
      ticketAllowance,
      housingAllowance,
      loanDeduction,
      salaryAdvanceDeduction,
      adminDeduction,
      customItems,
      paymentMethod,
      bankName: selectedEmp.bankName,
      iban: selectedEmp.iban,
      notes: voucherNotes,
      preparedBy: 'المحاسبة',
      reviewedBy: 'السيد (Sayed) - HR',
      approvedBy: 'المدير العام',
    });
  }, [
    selectedEmp, activeCompany, settlementMode, settlementDate, departureDate, returnDate,
    basicSalary, allowances, grossSalary, dailyWage, hourlyWage,
    carriedOverBal, accruedBalance, netAvailable, consumedLeaveDays, statutoryLeaveDays, unpaidLeaveDays,
    includeProratedSalary, workedDaysInMonth,
    includeOvertime, overtimeHours, overtimeMultiplier,
    includeEncashment, encashmentDays,
    ticketAllowance, housingAllowance, loanDeduction, salaryAdvanceDeduction, adminDeduction,
    customItems, paymentMethod, voucherNotes, currentVoucherNumber
  ]);

  // Add custom item
  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomName || newCustomAmount <= 0) {
      toast.error('يرجى كتابة اسم البند وتحديد مبلغ أكبر من الصفر');
      return;
    }

    const newItem: UniversalSettlementItem = {
      id: `custom-${Date.now()}`,
      category: newCustomType === 'EARNING' ? 'OTHER_EARNING' : 'OTHER_DEDUCTION',
      name: newCustomName,
      type: newCustomType,
      quantity: 1,
      unit: 'fixed',
      rate: newCustomAmount,
      amount: newCustomAmount,
      notes: newCustomNotes || 'بند مالي مخصص',
      isEditable: true,
    };

    setCustomItems(prev => [...prev, newItem]);
    setNewCustomName('');
    setNewCustomAmount(0);
    setNewCustomNotes('');
    setShowAddCustomModal(false);
    toast.success('تمت إضافة البند المالي المخصص بنجاح');
  };

  // Remove custom item
  const handleRemoveCustomItem = (id: string) => {
    setCustomItems(prev => prev.filter(item => item.id !== id));
    toast.success('تم حذف البند المخصص');
  };

  const [isSavingVoucher, setIsSavingVoucher] = useState(false);

  // Save Voucher Handler
  const handleSaveVoucher = () => {
    if (!settlementResult || !selectedEmp || isSavingVoucher) return;
    setIsSavingVoucher(true);

    try {
      // Check for duplicate settlement voucher for the same employee or voucher number
      const existingLockedVoucher = savedVouchers.find(v => (v.employeeId === selectedEmp.id || v.voucherNumber === settlementResult.voucherNumber) && (v.status === 'settled_locked' || v.status === 'paid'));
      if (existingLockedVoucher && settlementState !== 'paid') {
        toast.error(`عذراً، الموظف ${selectedEmp.fullNameAr} أو سند التسوية برقم (${settlementResult.voucherNumber}) مسجل ومقفل مسبقاً.`);
        setIsSavingVoucher(false);
        return;
      }

      // Automatically liquidate / deduct days if encashment or leave consumption is selected
      const daysToLiquidate = settlementMode === 'ENCASHMENT_LIQUIDATION'
        ? (encashmentDays > 0 ? encashmentDays : netAvailable)
        : (consumedLeaveDays + (includeEncashment ? encashmentDays : 0));
      if (daysToLiquidate > 0 && onUpdateAllocations) {
        liquidateLeaveBalanceInAllocations(
          selectedEmp.id,
          daysToLiquidate,
          allocations,
          onUpdateAllocations,
          selectedEmp,
          onUpdateEmployee
        );
      }

      const newVoucher: LeaveSettlementVoucher = {
        id: `voucher-${Date.now()}`,
        voucherNumber: settlementResult.voucherNumber,
        companyId: activeCompany?.id || selectedEmp.companyId || 'comp-1',
        employeeId: selectedEmp.id,
        employeeName: selectedEmp.fullNameAr,
        employeeCode: selectedEmp.employeeCode || '',
        civilId: selectedEmp.civilId || '',
        jobTitle: selectedEmp.jobTitle || '',
        department: selectedEmp.department || '',
        joinDate: selectedEmp.joinDate || '',
        settlementMode,
        settlementDate,
        departureDate,
        returnDate,
        status: 'settled_locked', // Locked & Protected State
        basicSalary,
        grossSalary,
        dailyWage,
        hourlyWage,
        carriedOverBalance: carriedOverBal,
        accruedBalance: accruedBalance,
        totalAvailableBefore: netAvailable,
        consumedLeaveDays,
        statutoryLeaveDays,
        encashedLeaveDays: includeEncashment ? encashmentDays : 0,
        unpaidLeaveDays,
        remainingBalanceAfter: settlementResult.remainingBalanceAfter,
        items: settlementResult.items,
        totalEarnings: settlementResult.totalEarnings,
        totalDeductions: settlementResult.totalDeductions,
        netSettlementPayout: settlementResult.netSettlementPayout,
        paymentMethod,
        bankName: selectedEmp.bankName,
        iban: selectedEmp.iban,
        notes: voucherNotes,
        preparedBy: 'المحاسبة',
        reviewedBy: 'السيد (Sayed) - HR',
        approvedBy: 'المدير العام',
        createdAt: new Date().toISOString(),
      };

      const updatedList = saveSettlementVoucher(newVoucher);
      setSavedVouchers(updatedList);
      setSettlementState('paid');
      toast.success(`تم حفظ وقفل سند التسوية رقم (${newVoucher.voucherNumber}) ومزامنة الأيام نهائياً!`);
    } finally {
      setIsSavingVoucher(false);
    }
  };

  // Execute Encashment & Deduct from Allocations
  const handleExecuteEncashment = () => {
    if (!includeEncashment || encashmentDays <= 0) {
      toast.error('يرجى تفعيل خيار التسييل النقدي وتحديد عدد الأيام أولاً');
      return;
    }

    if (!onUpdateAllocations) {
      toast.error('خاصية تحديث التخصيصات غير مهيأة');
      return;
    }

    const res = liquidateLeaveBalanceInAllocations(
      selectedEmp.id,
      encashmentDays,
      allocations,
      onUpdateAllocations,
      selectedEmp,
      onUpdateEmployee
    );

    if (res.success) {
      setSettlementState('paid');
      handleSaveVoucher();
      toast.success(res.message, { duration: 5000 });
    } else {
      toast.error(res.message);
    }
  };

  // Manager Rollback / Unlock Settlement
  const handleDeleteVoucher = (id: string, vNum: string) => {
    setUnlockTarget({ id, voucherNumber: vNum });
    setUnlockReasonInput('');
    setShowUnlockModal(true);
  };

  const confirmUnlockVoucher = () => {
    if (!unlockTarget || !unlockReasonInput.trim()) {
      toast.error('يرجى إدخال سبب إلغاء القفل وصلاحية المدير.');
      return;
    }
    const updated = deleteSettlementVoucher(unlockTarget.id);
    setSavedVouchers(updated);
    toast.success(`تم إلغاء قفل وتراجع سند التسوية رقم (${unlockTarget.voucherNumber}) بنجاح. سبب الإلغاء: ${unlockReasonInput}`);
    setShowUnlockModal(false);
    setUnlockTarget(null);
    setUnlockReasonInput('');
  };

  // Print & PDF Export handlers
  const handlePrint = () => {
    printDocument('leave-clearance-print-area', `سند_تسوية_${selectedEmp?.fullNameAr || 'موظف'}`);
  };

  const handlePdfExport = async () => {
    try {
      setIsExporting(true);
      await exportElementToPdf('leave-clearance-print-area', `سند_تسوية_${selectedEmp?.fullNameAr || 'موظف'}.pdf`);
      toast.success('تم تصدير مستند التسوية كملف PDF بنجاح');
    } catch (err) {
      toast.error('حدث خطأ أثناء تصدير ملف PDF');
    } finally {
      setIsExporting(false);
    }
  };

  // Archive leave creation handler
  const handleCreateArchiveLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp || !onSaveLeave) return;

    const newHistLeave: LeaveRequest = {
      id: `hist-leave-${Date.now()}`,
      employeeId: selectedEmp.id,
      companyId: selectedEmp.companyId || activeCompany?.id || 'comp-1',
      leaveType: 'ANNUAL',
      startDate: `${archiveYear}-06-01`,
      endDate: `${archiveYear}-06-30`,
      totalDays: archiveDays,
      paidDays: archiveDays,
      unpaidDays: 0,
      reason: archiveReason,
      status: 'APPROVED',
      isHistorical: true,
      historicalYear: parseInt(archiveYear) || 2025,
      createdAt: new Date().toISOString(),
    };

    onSaveLeave(newHistLeave);
    setShowArchiveModal(false);
    toast.success(`تم حفظ الإجازة الأرشيفية لسنة ${archiveYear} بنجاح`);
  };

  return (
    <div className="space-y-6 font-['Tajawal','Cairo',sans-serif]" dir="rtl">
      
      {/* 1. Odoo Enterprise Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Header Pipeline & Top Action Bar */}
        <header className="bg-slate-50/90 border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          
          {/* Action Buttons Group */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSaveVoucher}
              className="bg-[#714B67] hover:bg-[#5a3b52] text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <FileCheck size={16} className="text-amber-300" />
              <span>حفظ واعتماد السند الرسمي</span>
            </button>

            {includeEncashment && encashmentDays > 0 && (
              <button
                type="button"
                onClick={handleExecuteEncashment}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                title="تصفية وصرف البدل النقدي وخصم الأيام من رصيد الموظف الفعلي"
              >
                <Coins size={16} className="text-amber-300" />
                <span>تسييل وصرف البدل النقدي ({encashmentDays} يوم)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setViewingVoucher(null);
                setShowPrintModal(true);
              }}
              className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            >
              <Printer size={15} className="text-[#714B67]" />
              <span>معاينة وطباعة المستند</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddCustomModal(true)}
              className="bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer"
            >
              <Plus size={14} className="text-[#714B67]" />
              <span>إضافة بند مالي مخصص</span>
            </button>
          </div>

          {/* Odoo State Pipeline (oe_statusbar) */}
          <div className="flex items-center bg-white border border-slate-300 rounded-xl overflow-hidden text-xs font-bold shadow-2xs">
            <button
              type="button"
              onClick={() => setSettlementState('draft')}
              className={`px-3.5 py-2 transition-colors cursor-pointer ${
                settlementState === 'draft' ? 'bg-[#714B67] text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              مسودة (Draft)
            </button>
            <div className="w-[1px] h-6 bg-slate-200"></div>
            <button
              type="button"
              onClick={() => setSettlementState('validated')}
              className={`px-3.5 py-2 transition-colors cursor-pointer ${
                settlementState === 'validated' ? 'bg-[#008784] text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              معتمد (Validated)
            </button>
            <div className="w-[1px] h-6 bg-slate-200"></div>
            <button
              type="button"
              onClick={() => setSettlementState('paid')}
              className={`px-3.5 py-2 transition-colors cursor-pointer ${
                settlementState === 'paid' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              تم الصرف والتسييل (Paid)
            </button>
          </div>
        </header>

        {/* 2. Enterprise Sheet Area */}
        <div className="p-6 sm:p-8 space-y-6">
          
          {/* Top Row: Employee Selector & Quick KPI Cards */}
          <div className="flex flex-col lg:flex-row items-start justify-between gap-6 pb-6 border-b border-slate-200">
            
            {/* Title & Employee Selector */}
            <div className="space-y-2 flex-1">
              <label htmlFor="employee_selector" className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                الموظف المستحق للتسوية والتصفية (Employee)
              </label>
              
              <div className="flex items-center gap-3">
                <select
                  id="employee_selector"
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  className="bg-purple-50/60 border border-purple-200 hover:border-[#714B67] text-[#714B67] font-black text-lg sm:text-xl rounded-xl px-4 py-2 outline-none cursor-pointer w-full max-w-md transition shadow-2xs"
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id} className="text-slate-800 font-bold text-sm">
                      {emp.fullNameAr} ({emp.employeeCode || emp.civilId}) - {emp.jobTitle || 'موظف'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium pt-1">
                <span className="flex items-center gap-1">
                  <ShieldCheck size={14} className="text-[#008784]" />
                  <span>قانون العمل الكويتي (المادة 70 و77)</span>
                </span>
                <span>•</span>
                <span className="font-mono">الرقم المدني: {selectedEmp?.civilId || '-'}</span>
                <span>•</span>
                <span>تاريخ المباشرة: {selectedEmp?.joinDate || '-'}</span>
              </div>
            </div>

            {/* Quick KPI Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full lg:w-auto">
              <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3 text-right">
                <span className="block text-[11px] font-bold text-[#714B67]">صافي الرصيد المتاح</span>
                <span className="block text-base font-black font-mono text-purple-950 mt-0.5">
                  {netAvailable.toFixed(2)} يوم
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-right">
                <span className="block text-[11px] font-bold text-slate-500">الراتب الأساسي</span>
                <span className="block text-base font-black font-mono text-slate-800 mt-0.5">
                  {basicSalary.toFixed(3)} د.ك
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-right">
                <span className="block text-[11px] font-bold text-slate-500">أجر اليوم (÷ 26)</span>
                <span className="block text-base font-black font-mono text-teal-800 mt-0.5">
                  {dailyWage.toFixed(3)} د.ك
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-right">
                <span className="block text-[11px] font-bold text-slate-500">أجر الساعة (÷ 8)</span>
                <span className="block text-base font-black font-mono text-slate-700 mt-0.5">
                  {hourlyWage.toFixed(3)} د.ك
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs (Notebook Pages) */}
          <div className="flex items-center border-b border-slate-200 gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('settlement_calculator')}
              className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer border-b-2 ${
                activeTab === 'settlement_calculator'
                  ? 'border-[#714B67] text-[#714B67]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Calculator size={16} />
              <span>شيت التسوية الشامل والمتعدد البنود</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('vouchers_archive')}
              className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer border-b-2 ${
                activeTab === 'vouchers_archive'
                  ? 'border-[#714B67] text-[#714B67]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileCheck size={16} />
              <span>أرشيف سندات التسوية المعتمدة ({savedVouchers.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('employee_history')}
              className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer border-b-2 ${
                activeTab === 'employee_history'
                  ? 'border-[#714B67] text-[#714B67]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <History size={16} />
              <span>كشف حركة الموظف التاريخية</span>
            </button>
          </div>

          {/* TAB 1: Universal Multi-Item Settlement Sheet */}
          {activeTab === 'settlement_calculator' && (
            <div className="space-y-6">
              
              {/* Mode Selection Card */}
              <div className="bg-gradient-to-r from-purple-50/70 via-slate-50 to-teal-50/70 border border-slate-200 rounded-2xl p-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-2">
                      <Sparkles size={16} className="text-[#714B67]" />
                      <span>نوع التسوية وطبيعة الصرف المالي (Settlement Mode)</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      اختر نوع التسوية لتفعيل الحسابات الموحدة بدقة ومنع أي ازدواجية في بنود الراتب والإجازات
                    </p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white border border-slate-200 shadow-2xs text-slate-700 w-fit">
                    {settlementMode === 'LEAVE_WITH_TRAVEL' && '✈️ تسوية إجازة وسفر (شاملة أيام العمل والتذاكر)'}
                    {settlementMode === 'ENCASHMENT_LIQUIDATION' && '💰 صرف رصيد إجازات فقط بدون إجازة (تسوية الرصيد فقط)'}
                    {settlementMode === 'CUSTOM' && '⚙️ تسوية شاملة مخصصة'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleModeChange('LEAVE_WITH_TRAVEL')}
                    className={`p-3 rounded-xl border text-right transition cursor-pointer flex flex-col justify-between ${
                      settlementMode === 'LEAVE_WITH_TRAVEL'
                        ? 'bg-[#714B67] text-white border-[#714B67] shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-purple-300 hover:bg-purple-50/30'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center justify-between">
                      <span>تسوية إجازة وسفر</span>
                      {settlementMode === 'LEAVE_WITH_TRAVEL' && <Check size={14} className="text-purple-200" />}
                    </div>
                    <p className={`text-[10px] mt-1 line-clamp-2 ${settlementMode === 'LEAVE_WITH_TRAVEL' ? 'text-purple-100' : 'text-slate-500'}`}>
                      راتب أيام العمل الفعلية حتى السفر + بدل أيام الإجازة المستهلكة + التذاكر
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleModeChange('ENCASHMENT_LIQUIDATION')}
                    className={`p-3 rounded-xl border text-right transition cursor-pointer flex flex-col justify-between ${
                      settlementMode === 'ENCASHMENT_LIQUIDATION'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm ring-2 ring-amber-300'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300 hover:bg-amber-50/30'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center justify-between">
                      <span>صرف رصيد إجازات فقط بدون إجازة</span>
                      {settlementMode === 'ENCASHMENT_LIQUIDATION' && <Check size={14} className="text-amber-200" />}
                    </div>
                    <p className={`text-[10px] mt-1 line-clamp-2 ${settlementMode === 'ENCASHMENT_LIQUIDATION' ? 'text-amber-100' : 'text-slate-500'}`}>
                      تسييل وصرف البدل النقدي للرصيد المتاح فقط (مستبعد منه أيام العمل وتذاكر السفر)
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleModeChange('CUSTOM')}
                    className={`p-3 rounded-xl border text-right transition cursor-pointer flex flex-col justify-between ${
                      settlementMode === 'CUSTOM'
                        ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center justify-between">
                      <span>تسوية شاملة مخصصة</span>
                      {settlementMode === 'CUSTOM' && <Check size={14} className="text-slate-300" />}
                    </div>
                    <p className={`text-[10px] mt-1 line-clamp-2 ${settlementMode === 'CUSTOM' ? 'text-slate-300' : 'text-slate-500'}`}>
                      تحكم كامل بجميع البنود والاستقطاعات وحرية إدراج أيام العمل وبدلات مخصصة
                    </p>
                  </button>
                </div>
              </div>

              {settlementMode === 'ENCASHMENT_LIQUIDATION' && (
                <div className="bg-amber-50/90 border border-amber-300 rounded-xl p-3 text-xs text-amber-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-amber-700 shrink-0" />
                    <span>
                      <strong>نمط تسييل وصرف رصيد الإجازات فقط:</strong> تم ضبط التسوية لتشمل صرف البدل النقدي لرصيد الإجازات ({encashmentDays.toFixed(2)} يوم) فقط، وتم استبعاد راتب أيام العمل وتذاكر السفر تلقائياً ليكون الصرف مقتصراً على رصيد الإجازات.
                    </span>
                  </div>
                  <span className="font-mono font-bold text-amber-950 bg-amber-200/70 px-2 py-0.5 rounded border border-amber-300">
                    {(encashmentDays * dailyWage).toFixed(3)} د.ك
                  </span>
                </div>
              )}

              {/* 2-Column Responsive Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Column 1: Financial Line Items Configuration (7 cols) */}
                <div className="lg:col-span-7 space-y-5">
                  
                  {/* Basic Leave & Dates Group */}
                  <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <h3 className="font-bold text-xs sm:text-sm text-slate-800 flex items-center gap-2">
                        <FileText size={16} className="text-[#714B67]" />
                        <span>بيانات التسوية وتاريخ الصرف</span>
                      </h3>
                      <span className="text-[11px] bg-purple-100 text-[#714B67] font-bold px-2 py-0.5 rounded">
                        قاعدة 26 يوم
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="block font-bold text-slate-600 mb-1">طلب الإجازة المرتبط:</label>
                        <select
                          value={selectedLeaveId}
                          onChange={(e) => handleSelectLeave(e.target.value)}
                          disabled={settlementMode === 'ENCASHMENT_LIQUIDATION'}
                          className={`w-full bg-white border border-slate-300 rounded-xl p-2 font-bold text-slate-800 outline-none focus:border-[#714B67] ${
                            settlementMode === 'ENCASHMENT_LIQUIDATION' ? 'opacity-60 cursor-not-allowed bg-slate-100' : ''
                          }`}
                        >
                          <option value="custom">-- {settlementMode === 'ENCASHMENT_LIQUIDATION' ? 'صرف رصيد بدون إجازة' : 'إدخال يدوي مخصص'} --</option>
                          {employeeLeavesForSettlement.map(l => (
                            <option key={l.id} value={l.id}>
                              {l.leaveType === 'BEREAVEMENT' ? 'إجازة عزاء (م77)' : l.leaveType === 'ANNUAL' ? 'سنوية' : l.leaveType} ({l.startDate} - {l.totalDays} يوم)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-600 mb-1">
                          {settlementMode === 'ENCASHMENT_LIQUIDATION' ? 'تاريخ تسوية الصرف:' : 'تاريخ المغادرة (Departure):'}
                        </label>
                        <input
                          type="date"
                          value={departureDate}
                          onChange={(e) => handleDepartureDateChange(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-xl p-2 font-mono font-bold text-slate-800 outline-none focus:border-[#714B67]"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-600 mb-1">
                          {settlementMode === 'ENCASHMENT_LIQUIDATION' ? 'تاريخ استحقاق التسوية:' : 'تاريخ العودة المتوقع:'}
                        </label>
                        <input
                          type="date"
                          value={returnDate}
                          onChange={(e) => setReturnDate(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-xl p-2 font-mono font-bold text-slate-800 outline-none focus:border-[#714B67]"
                        />
                      </div>
                    </div>

                    {/* Days Configuration */}
                    {settlementMode !== 'ENCASHMENT_LIQUIDATION' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-2 border-t border-slate-200">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">أيام الإجازة السنوية (المستهلكة):</label>
                          <DecimalInput
                            min={0}
                            value={consumedLeaveDays}
                            onChange={setConsumedLeaveDays}
                            className="w-full bg-white border border-slate-300 rounded-xl p-2 font-mono font-black text-slate-900 outline-none focus:border-[#714B67]"
                          />
                          <span className="text-[10px] text-slate-500 mt-0.5 block">تخصم من رصيد الإجازات السنوي</span>
                        </div>

                        <div>
                          <label className="block font-bold text-emerald-800 mb-1">إجازة وفاة / عزاء (المادة 77):</label>
                          <DecimalInput
                            min={0}
                            max={3}
                            value={statutoryLeaveDays}
                            onChange={setStatutoryLeaveDays}
                            className="w-full bg-emerald-50/60 border border-emerald-300 rounded-xl p-2 font-mono font-black text-emerald-950 outline-none focus:border-emerald-500"
                          />
                          <span className="text-[10px] text-emerald-700 mt-0.5 block">مدفوعة بالراتب (معفاة من الخصم من الرصيد - 0.000 د.ك إضافي)</span>
                        </div>

                        <div>
                          <label className="block font-bold text-rose-700 mb-1">أيام بدون راتب (تجاوز):</label>
                          <DecimalInput
                            min={0}
                            value={unpaidLeaveDays}
                            onChange={setUnpaidLeaveDays}
                            className="w-full bg-white border border-slate-300 rounded-xl p-2 font-mono font-black text-rose-700 outline-none focus:border-rose-400"
                          />
                          <span className="text-[10px] text-rose-600 mt-0.5 block">تخصم من مدة الخدمة</span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="font-bold block">رصيد الإجازات المستحق للصرف بدون إجازة:</span>
                          <span className="text-[11px] text-amber-800">
                            الرصيد المتاح حالياً للموظف هو ({netAvailable.toFixed(2)} يوم) - تم تعيينه تلقائياً في بند الصرف أدناه.
                          </span>
                        </div>
                        <span className="font-mono font-black text-sm text-amber-950 bg-white px-2.5 py-1 rounded border border-amber-300">
                          {netAvailable.toFixed(2)} يوم
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 1. Pro-rated Salary Line Item Section */}
                  <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-800">
                        <input
                          type="checkbox"
                          checked={includeProratedSalary}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setIncludeProratedSalary(checked);
                            if (checked && workedDaysInMonth === 0) {
                              const phys = calculatePhysicalWorkedDays(departureDate);
                              setWorkedDaysInMonth(phys.workingDays > 0 ? phys.workingDays : 1);
                            }
                          }}
                          className="rounded text-[#714B67] focus:ring-[#714B67] w-4 h-4"
                        />
                        <span>احتساب راتب أيام العمل الفعلية للشهر الحالي (Dynamic Base Salary Proration)</span>
                      </label>
                      <div className="flex items-center gap-2">
                        {settlementMode === 'ENCASHMENT_LIQUIDATION' && !includeProratedSalary && (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                            مستبعد تلقائياً (صرف رصيد فقط)
                          </span>
                        )}
                        <span className="text-[11px] font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                          +{includeProratedSalary ? ((workedDaysInMonth * (grossSalary / 26)).toFixed(3)) : '0.000'} د.ك
                        </span>
                      </div>
                    </div>

                    {includeProratedSalary && (
                      <div className="space-y-2 pt-2 border-t border-slate-200 text-xs">
                        <div className="flex items-center justify-between">
                          <label className="font-bold text-slate-700">أيام العمل الفعلية السابقة لتاريخ المغادرة:</label>
                          <button
                            type="button"
                            onClick={() => {
                              const phys = calculatePhysicalWorkedDays(departureDate);
                              setWorkedDaysInMonth(phys.workingDays);
                              toast.success(`تمت المزامنة: ${phys.workingDays} يوم عمل فعلي حتى ${departureDate}`);
                            }}
                            className="text-[11px] text-[#714B67] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <RefreshCw size={12} />
                            <span>مزامنة تلقائية مع تاريخ السفر ({calculatePhysicalWorkedDays(departureDate).workingDays} يوم)</span>
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <DecimalInput
                              min={0}
                              max={31}
                              value={workedDaysInMonth}
                              onChange={setWorkedDaysInMonth}
                              className="w-full bg-white border border-slate-300 rounded-xl p-2 font-mono font-bold text-slate-800"
                            />
                            <span className="text-[10px] text-slate-500 mt-0.5 block">الراتب الأساسي ÷ 26 × أيام العمل</span>
                          </div>
                          <div>
                            <div className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-bold text-slate-800 text-xs flex items-center justify-between">
                              <span className="text-[#008784] font-black">26 يوم (المادة 70 - إلزامي)</span>
                              <ShieldCheck size={15} className="text-[#008784]" />
                            </div>
                            <span className="text-[10px] text-slate-500 mt-0.5 block">أساس القسمة القانوني الموحد</span>
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-500 bg-slate-100 p-1.5 rounded-lg border border-slate-200">
                          ℹ️ يتم احتساب الراتب حصرياً عن أيام العمل الفعلية قبل تاريخ المغادرة بمعيار قسمة 26 يوماً القانوني لمنع أي احتساب مزدوج.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* 2. Overtime Line Item Section */}
                  <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-800">
                        <input
                          type="checkbox"
                          checked={includeOvertime}
                          onChange={(e) => setIncludeOvertime(e.target.checked)}
                          className="rounded text-[#714B67] focus:ring-[#714B67] w-4 h-4"
                        />
                        <span>بدل العمل الإضافي المعتمد (Overtime Allowance)</span>
                      </label>
                      <span className="text-[11px] font-mono font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                        +{includeOvertime ? ((overtimeHours * hourlyWage * overtimeMultiplier).toFixed(3)) : '0.000'} د.ك
                      </span>
                    </div>

                    {includeOvertime && (
                      <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-200">
                        <div>
                          <label className="block font-medium text-slate-600 mb-1">عدد ساعات الإضافي المعتمدة:</label>
                          <DecimalInput
                            min={0}
                            value={overtimeHours}
                            onChange={setOvertimeHours}
                            className="w-full bg-white border border-slate-300 rounded-xl p-2 font-mono font-bold text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block font-medium text-slate-600 mb-1">معامل الإضافي (المادة 66):</label>
                          <select
                            value={overtimeMultiplier}
                            onChange={(e) => setOvertimeMultiplier(parseFloat(e.target.value) || 1.25)}
                            className="w-full bg-white border border-slate-300 rounded-xl p-2 font-bold text-slate-800"
                          >
                            <option value={1.25}>1.25x (إضافي الأيام العادية)</option>
                            <option value={1.5}>1.50x (إضافي العطل والجمعة)</option>
                            <option value={2.0}>2.00x (إضافي الأعياد الرسمية)</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 3. Leave Balance Encashment Section */}
                  <div className="bg-amber-50/60 border border-amber-300 rounded-2xl p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="flex items-center gap-2 cursor-pointer font-black text-xs text-amber-950">
                        <input
                          type="checkbox"
                          checked={includeEncashment}
                          onChange={(e) => {
                            setIncludeEncashment(e.target.checked);
                            if (e.target.checked && encashmentDays === 0) {
                              const remaining = Number(Math.max(0, netAvailable - consumedLeaveDays).toFixed(2));
                              setEncashmentDays(remaining);
                            }
                          }}
                          className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                        />
                        <span>البدل النقدي لرصيد الإجازات المتبقي / تسييل الرصيد (Encashment)</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIncludeEncashment(true);
                            setEncashmentDays(netAvailable);
                          }}
                          className="text-[11px] bg-amber-600 hover:bg-amber-700 text-white px-3 py-1 rounded-xl font-bold shadow-2xs transition cursor-pointer flex items-center gap-1.5"
                        >
                          <span>💰 تسييل كامل الرصيد ({netAvailable} يوم) لتصفيره</span>
                        </button>
                        <span className="text-[11px] font-mono font-bold text-amber-900 bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-300">
                          +{includeEncashment ? ((encashmentDays * dailyWage).toFixed(3)) : '0.000'} د.ك
                        </span>
                      </div>
                    </div>

                    {includeEncashment && (
                      <div className="space-y-2 pt-3 border-t border-amber-200 text-xs">
                        <div className="flex items-center justify-between">
                          <label className="font-bold text-slate-700">عدد الأيام المراد صرف بدلها النقدي وتصفيرها:</label>
                          <button
                            type="button"
                            onClick={() => {
                              const remaining = Number(Math.max(0, netAvailable - consumedLeaveDays).toFixed(2));
                              setEncashmentDays(remaining);
                            }}
                            className="text-[11px] text-[#714B67] hover:underline font-bold cursor-pointer"
                          >
                            تصفية كامل المتبقي ({Math.max(0, netAvailable - consumedLeaveDays).toFixed(2)} يوم)
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <DecimalInput
                            min={0}
                            max={netAvailable}
                            value={encashmentDays}
                            onChange={setEncashmentDays}
                            className="w-full bg-white border border-amber-300 rounded-xl p-2.5 font-mono font-black text-amber-950 outline-none focus:border-amber-600 shadow-2xs"
                          />
                          <span className="text-xs font-bold text-slate-600 min-w-[30px]">يوم</span>
                        </div>
                        <p className="text-[10px] text-amber-800 font-medium">
                          * عند الحفظ والاعتماد، سيتم خصم هذه الأيام بالكامل من رصيد الموظف وسجل التخصيصات (FIFO) لتصبح إجمالي الأيام المتبقية (0.0 يوم).
                        </p>
                      </div>
                    )}
                  </div>

                  {/* 4. Allowances & Deductions Group */}
                  <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 space-y-3 text-xs">
                    <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                      <CreditCard size={15} className="text-slate-600" />
                      <span>البدلات الإضافية والاستقطاعات والخصومات</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">بدل تذاكر السفر (د.ك):</label>
                        <DecimalInput
                          min={0}
                          value={ticketAllowance}
                          onChange={setTicketAllowance}
                          className="w-full bg-white border border-slate-300 rounded-xl p-2 font-mono font-bold text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">بدل سكن / بدلات أخرى (د.ك):</label>
                        <DecimalInput
                          min={0}
                          value={housingAllowance}
                          onChange={setHousingAllowance}
                          className="w-full bg-white border border-slate-300 rounded-xl p-2 font-mono font-bold text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-rose-700 mb-1">خصم سلفة / قرض (د.ك):</label>
                        <DecimalInput
                          min={0}
                          value={loanDeduction}
                          onChange={setLoanDeduction}
                          className="w-full bg-white border border-rose-200 rounded-xl p-2 font-mono font-bold text-rose-700"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-rose-700 mb-1">استقطاعات وجزاءات إدارية (د.ك):</label>
                        <DecimalInput
                          min={0}
                          value={adminDeduction}
                          onChange={setAdminDeduction}
                          className="w-full bg-white border border-rose-200 rounded-xl p-2 font-mono font-bold text-rose-700"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Custom Items List (if any) */}
                  {customItems.length > 0 && (
                    <div className="bg-purple-50/50 border border-purple-200 rounded-2xl p-4 space-y-2 text-xs">
                      <h4 className="font-bold text-[#714B67] flex items-center justify-between">
                        <span>البنود المالية المخصصة المضافة:</span>
                        <span className="font-mono text-[11px]">({customItems.length} بنود)</span>
                      </h4>
                      <div className="space-y-1.5">
                        {customItems.map(item => (
                          <div key={item.id} className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-purple-100">
                            <div>
                              <span className="font-bold text-slate-800 block">{item.name}</span>
                              {item.notes && <span className="text-[10px] text-slate-400 block">{item.notes}</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`font-mono font-black ${item.type === 'EARNING' ? 'text-emerald-700' : 'text-rose-700'}`}>
                                {item.type === 'EARNING' ? '+' : '-'}{item.amount.toFixed(3)} د.ك
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveCustomItem(item.id)}
                                className="text-rose-500 hover:text-rose-700 p-1 rounded cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>

                {/* Column 2: Mathematical Summary & Universal Breakdown Table (5 cols) */}
                <div className="lg:col-span-5 space-y-5">
                  
                  {/* Dynamic Items Live Breakdown Box */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                      <h3 className="font-bold text-xs sm:text-sm text-slate-800 flex items-center gap-2">
                        <Coins size={16} className="text-[#008784]" />
                        <span>شيت البنود المالية المعتمدة</span>
                      </h3>
                      <span className="text-[11px] font-mono font-bold text-[#714B67]">
                        {settlementResult?.voucherNumber}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      {settlementResult?.items.map((item, idx) => (
                        <div 
                          key={item.id || idx} 
                          className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                            item.type === 'EARNING' 
                              ? 'bg-emerald-50/40 border-emerald-100 hover:bg-emerald-50/80' 
                              : 'bg-rose-50/40 border-rose-100 hover:bg-rose-50/80'
                          }`}
                        >
                          <div className="space-y-0.5 max-w-[70%]">
                            <span className="font-bold text-slate-800 block text-xs">{item.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono block">
                              {Number((item.quantity || 0).toFixed(2))} {item.unit === 'days' ? 'أيام' : item.unit === 'hours' ? 'ساعات' : 'وحدة'} × {item.rate.toFixed(3)}
                            </span>
                          </div>
                          <div className="text-left font-mono font-black">
                            <span className={item.type === 'EARNING' ? 'text-emerald-800' : 'text-rose-700'}>
                              {item.type === 'EARNING' ? '+' : '-'}{item.amount.toFixed(3)} د.ك
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Subtotals & Net Payout Box */}
                    <div className="space-y-2 pt-3 border-t border-slate-200 text-xs">
                      <div className="flex justify-between text-slate-600 font-bold">
                        <span>إجمالي المستحقات (Earnings):</span>
                        <span className="font-mono text-emerald-800 font-black">
                          +{(settlementResult?.totalEarnings || 0).toFixed(3)} د.ك
                        </span>
                      </div>

                      <div className="flex justify-between text-slate-600 font-bold">
                        <span>إجمالي الاستقطاعات (Deductions):</span>
                        <span className="font-mono text-rose-700 font-black">
                          -{(settlementResult?.totalDeductions || 0).toFixed(3)} د.ك
                        </span>
                      </div>

                      {/* Net Payable Highlight Card */}
                      <div className="bg-slate-900 text-white rounded-xl p-4 mt-3 shadow-xs">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-slate-300 block">صافي المستحق النهائي للصرف</span>
                            <span className="text-[10px] text-slate-400 font-mono">NET SETTLEMENT PAYOUT</span>
                          </div>
                          <div className="text-left">
                            <span className="text-2xl font-black font-mono text-emerald-400">
                              {(settlementResult?.netSettlementPayout || 0).toFixed(3)} د.ك
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Post-Settlement Balance Snapshot Card */}
                  <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-4 space-y-2.5 text-xs">
                    <h4 className="font-bold text-[#714B67] flex items-center justify-between border-b border-purple-200 pb-1.5">
                      <span>حالة رصيد الإجازات بعد هذه التسوية:</span>
                      <Layers size={15} />
                    </h4>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-slate-600">
                        <span>الرصيد المتاح قبل التسوية:</span>
                        <span className="font-mono font-bold text-slate-900">{netAvailable.toFixed(2)} يوم</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>الأيام المستهلكة في السفر:</span>
                        <span className="font-mono font-bold text-blue-800">-{consumedLeaveDays.toFixed(2)} يوم</span>
                      </div>
                      {includeEncashment && encashmentDays > 0 && (
                        <div className="flex justify-between text-amber-900 font-bold">
                          <span>الأيام المسيلة بالبدل النقدي:</span>
                          <span className="font-mono">-{encashmentDays.toFixed(2)} يوم</span>
                        </div>
                      )}
                      <div className="flex justify-between text-slate-800 font-black border-t border-purple-200 pt-1.5">
                        <span>الرصيد المتبقي بعد التصفية:</span>
                        <span className="font-mono text-teal-800 bg-white px-2 py-0.5 rounded border border-teal-300">
                          {(settlementResult?.remainingBalanceAfter || 0).toFixed(2)} يوم
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Details */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
                    <label className="block font-bold text-slate-700">طريقة الصرف والتحويل:</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['BANK_TRANSFER', 'CASH', 'CHEQUE'] as const).map(method => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setPaymentMethod(method)}
                          className={`p-2 rounded-xl text-center font-bold transition cursor-pointer border ${
                            paymentMethod === method
                              ? 'bg-[#714B67] text-white border-[#714B67]'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {method === 'BANK_TRANSFER' ? 'تحويل بنكي' : method === 'CASH' ? 'نقداً (كاش)' : 'شيك مصرفي'}
                        </button>
                      ))}
                    </div>

                    {paymentMethod === 'BANK_TRANSFER' && selectedEmp?.iban && (
                      <div className="pt-2 text-[11px] text-slate-500 font-mono">
                        <span>IBAN: {selectedEmp.iban} ({selectedEmp.bankName || 'البنك المعتمد'})</span>
                      </div>
                    )}
                  </div>

                </div>

              </div>

            </div>
          )}

          {/* TAB 2: Saved Settlement Vouchers Archive */}
          {activeTab === 'vouchers_archive' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  سجل سندات التسوية وتصفية الإجازات المحفوظة ({savedVouchers.length} سند)
                </span>
                <span className="text-xs text-slate-500">
                  يتم حفظ جميع التسويات بشكل دائم في قاعدة البيانات
                </span>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#714B67] text-white font-bold">
                    <tr>
                      <th className="p-3.5">رقم السند</th>
                      <th className="p-3.5">تاريخ التسوية</th>
                      <th className="p-3.5">الموظف</th>
                      <th className="p-3.5 text-center">الأيام المستهلكة</th>
                      <th className="p-3.5 text-center">التسييل النقدي</th>
                      <th className="p-3.5 text-left">صافي المستحق</th>
                      <th className="p-3.5 text-center">الحالة</th>
                      <th className="p-3.5 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {savedVouchers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400 font-bold">
                          لا توجد سندات تسوية معتمدة مسجلة حالياً
                        </td>
                      </tr>
                    ) : (
                      savedVouchers.map((v, idx) => (
                        <tr key={v.id || idx} className="hover:bg-slate-50 transition">
                          <td className="p-3.5 font-mono font-black text-[#714B67]">{v.voucherNumber}</td>
                          <td className="p-3.5 font-mono text-slate-600">{v.settlementDate}</td>
                          <td className="p-3.5">
                            <span className="font-bold text-slate-900 block">{v.employeeName}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{v.employeeCode} • {v.jobTitle}</span>
                          </td>
                          <td className="p-3.5 text-center font-mono font-bold text-blue-900">{v.consumedLeaveDays} يوم</td>
                          <td className="p-3.5 text-center font-mono font-bold text-amber-800">
                            {v.encashedLeaveDays > 0 ? `${v.encashedLeaveDays} يوم` : '-'}
                          </td>
                          <td className="p-3.5 text-left font-mono font-black text-emerald-700" dir="ltr">
                            {v.netSettlementPayout.toFixed(3)} د.ك
                          </td>
                          <td className="p-3.5 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              v.status === 'settled_locked' || v.status === 'paid' 
                                ? 'bg-purple-100 text-purple-900 border border-purple-200' 
                                : v.status === 'validated' 
                                ? 'bg-teal-100 text-teal-800' 
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {v.status === 'settled_locked' ? '🔒 مقفل ومعتمد' : v.status === 'paid' ? 'تم الصرف ومقفل' : v.status === 'validated' ? 'معتمد' : 'مسودة'}
                            </span>
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setViewingVoucher(v);
                                  setShowPrintModal(true);
                                }}
                                className="bg-[#714B67] hover:bg-[#5a3b52] text-white p-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
                                title="معاينة وطباعة السند"
                              >
                                <Printer size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteVoucher(v.id, v.voucherNumber)}
                                className="bg-rose-50 hover:bg-rose-100 text-rose-700 p-1.5 rounded-lg text-xs font-bold transition cursor-pointer border border-rose-200"
                                title="إلغاء قفل وتراجع (Manager Rollback)"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Employee Leave History & Archive */}
          {activeTab === 'employee_history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  سجل إجازات وحركات الموظف ({selectedEmp?.fullNameAr})
                </span>
                <button
                  type="button"
                  onClick={() => setShowArchiveModal(true)}
                  className="bg-[#714B67] hover:bg-[#5a3b52] text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  <Plus size={14} />
                  <span>إضافة حركة إجازة سابقة بالأرشيف</span>
                </button>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">نوع الإجازة</th>
                      <th className="p-3.5">الفترة (من - إلى)</th>
                      <th className="p-3.5 text-center">الأيام</th>
                      <th className="p-3.5">البيان والسبب</th>
                      <th className="p-3.5 text-center">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {leaves.filter(l => l.employeeId === selectedEmp?.id).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400 font-bold">
                          لا توجد إجازات مسجلة لهذا الموظف
                        </td>
                      </tr>
                    ) : (
                      leaves.filter(l => l.employeeId === selectedEmp?.id).map((l, idx) => (
                        <tr key={l.id || idx} className="hover:bg-slate-50">
                          <td className="p-3.5 font-bold text-slate-900">
                            {l.leaveType === 'BEREAVEMENT' ? 'إجازة وفاة (م77)' : l.leaveType === 'ANNUAL' ? 'إجازة سنوية' : l.leaveType}
                          </td>
                          <td className="p-3.5 font-mono text-slate-600">{l.startDate} إلى {l.endDate}</td>
                          <td className="p-3.5 text-center font-mono font-bold text-[#714B67]">{l.totalDays} يوم</td>
                          <td className="p-3.5 text-slate-600">{l.reason || '-'}</td>
                          <td className="p-3.5 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              {l.status}
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

      {/* Modal 1: Add Custom Financial Line Item */}
      {showAddCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 font-['Tajawal']" dir="rtl">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Plus size={16} className="text-[#714B67]" />
                إضافة بند مالي مخصص للتسوية
              </h3>
              <button 
                onClick={() => setShowAddCustomModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddCustomItem} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">نوع البند:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewCustomType('EARNING')}
                    className={`p-2 rounded-xl text-center font-bold transition cursor-pointer border ${
                      newCustomType === 'EARNING' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    مستحق / إضافة (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewCustomType('DEDUCTION')}
                    className={`p-2 rounded-xl text-center font-bold transition cursor-pointer border ${
                      newCustomType === 'DEDUCTION' ? 'bg-rose-600 text-white border-rose-600' : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    استقطاع / خصم (-)
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم / بيان البند المالي:</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: مكافأة تميز، بدل هاتف، استقطاع عهدة..."
                  value={newCustomName}
                  onChange={(e) => setNewCustomName(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2 font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">المبلغ (د.ك):</label>
                <DecimalInput
                  min={0.001}
                  value={newCustomAmount}
                  onChange={setNewCustomAmount}
                  className="w-full border border-slate-300 rounded-xl p-2 font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ملاحظات توضيحية:</label>
                <input
                  type="text"
                  value={newCustomNotes}
                  onChange={(e) => setNewCustomNotes(e.target.value)}
                  placeholder="ملاحظات تظهر في السند الرسمي"
                  className="w-full border border-slate-300 rounded-xl p-2"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddCustomModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#714B67] hover:bg-[#5a3b52] text-white rounded-xl font-bold cursor-pointer shadow-xs"
                >
                  إضافة البند
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Archive Leave Creation */}
      {showArchiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 font-['Tajawal']" dir="rtl">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Archive size={16} className="text-purple-600" />
                تسجيل إجازة أرشيفية سابقة
              </h3>
              <button 
                onClick={() => setShowArchiveModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateArchiveLeave} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">السنة الأرشيفية:</label>
                  <input
                    type="number"
                    value={archiveYear}
                    onChange={(e) => setArchiveYear(e.target.value)}
                    required
                    className="w-full border border-slate-300 rounded-xl p-2 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">عدد الأيام المستهلكة:</label>
                  <DecimalInput
                    min={0}
                    value={archiveDays}
                    onChange={setArchiveDays}
                    className="w-full border border-slate-300 rounded-xl p-2 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">البيان والتفاصيل:</label>
                <input
                  type="text"
                  value={archiveReason}
                  onChange={(e) => setArchiveReason(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowArchiveModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#714B67] hover:bg-[#5a3b52] text-white rounded-xl font-bold cursor-pointer shadow-xs"
                >
                  حفظ في الأرشيف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Printable Document & PDF Export */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 font-['Tajawal'] overflow-y-auto" dir="rtl">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Printer size={20} className="text-[#714B67]" />
                <h3 className="font-bold text-base text-slate-900">
                  سند تصفية وتسوية إجازة موظف (Leave Clearance & Settlement Document)
                </h3>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePdfExport}
                  disabled={isExporting}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  <span>تحميل PDF</span>
                </button>

                <button
                  onClick={handlePrint}
                  className="bg-[#714B67] hover:bg-[#5a3b52] text-white text-xs font-bold px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-300" />
                  <span>طباعة فورية</span>
                </button>

                <button 
                  onClick={() => setShowPrintModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer mr-2"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Printable Document Area */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-100 rounded-xl">
              <div id="leave-clearance-print-area">
                <LeaveClearanceDocument
                  employee={{
                    name: viewingVoucher ? viewingVoucher.employeeName : selectedEmp?.fullNameAr || '',
                    civilId: viewingVoucher ? viewingVoucher.civilId : selectedEmp?.civilId || '',
                    employeeCode: viewingVoucher ? viewingVoucher.employeeCode : selectedEmp?.employeeCode || '',
                    joinDate: viewingVoucher ? viewingVoucher.joinDate : selectedEmp?.joinDate || '',
                    jobTitle: viewingVoucher ? viewingVoucher.jobTitle : selectedEmp?.jobTitle || '',
                    department: viewingVoucher ? viewingVoucher.department : selectedEmp?.department || '',
                    bankName: selectedEmp?.bankName,
                    iban: selectedEmp?.iban,
                  }}
                  settlement={viewingVoucher ? {
                    voucherNumber: viewingVoucher.voucherNumber,
                    settlementDate: viewingVoucher.settlementDate,
                    dailyWage: viewingVoucher.dailyWage,
                    hourlyWage: viewingVoucher.hourlyWage,
                    carriedOverBalance: viewingVoucher.carriedOverBalance,
                    accruedBalance: viewingVoucher.accruedBalance,
                    totalAvailableBefore: viewingVoucher.totalAvailableBefore,
                    statutoryLeaveDays: viewingVoucher.statutoryLeaveDays,
                    consumedLeaveDays: viewingVoucher.consumedLeaveDays,
                    encashedLeaveDays: viewingVoucher.encashedLeaveDays,
                    unpaidLeaveDays: viewingVoucher.unpaidLeaveDays,
                    remainingBalanceAfter: viewingVoucher.remainingBalanceAfter,
                    items: viewingVoucher.items,
                    totalEarnings: viewingVoucher.totalEarnings,
                    totalDeductions: viewingVoucher.totalDeductions,
                    netSettlementPayout: viewingVoucher.netSettlementPayout,
                    aysed_carried_over: viewingVoucher.carriedOverBalance,
                    aysed_opening_balance: 0,
                    aysed_accrued_2026: viewingVoucher.accruedBalance,
                    aysed_total_available: viewingVoucher.totalAvailableBefore,
                    aysed_paid_days: viewingVoucher.consumedLeaveDays,
                    aysed_unpaid_days: viewingVoucher.unpaidLeaveDays,
                    aysed_daily_wage: viewingVoucher.dailyWage,
                    aysed_leave_cash: (viewingVoucher.consumedLeaveDays * viewingVoucher.dailyWage),
                    aysed_ticket_allowance: 0,
                    aysed_allowances: 0,
                    aysed_deductions: viewingVoucher.totalDeductions,
                    aysed_net_payable: viewingVoucher.netSettlementPayout,
                  } : settlementResult!}
                  activeCompany={activeCompany}
                  voucherNumber={viewingVoucher?.voucherNumber || settlementResult?.voucherNumber}
                  settlementDate={viewingVoucher?.settlementDate || settlementDate}
                  items={viewingVoucher?.items || settlementResult?.items}
                />
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Modal 4: Unlock Manager Rollback Modal */}
      {showUnlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 font-['Tajawal']" dir="rtl">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-amber-600" size={22} />
                <h3 className="font-bold text-base text-slate-900">إلغاء قفل سند التسوية (Manager Rollback)</h3>
              </div>
              <button 
                onClick={() => setShowUnlockModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                سند التسوية رقم <span className="font-mono font-bold text-[#714B67]">{unlockTarget?.voucherNumber}</span> مقفل ومحمي ضد التعديل أو الحذف العشوائي. لإلغاء القفل وتراجع الصلاحيات، يرجى كتابة سبب الإلغاء وصلاحية المدير المعتمد:
              </p>

              <div>
                <label className="block font-bold text-slate-700 mb-1">سبب إلغاء القفل وصلاحية المدير <span className="text-red-500">*</span>:</label>
                <textarea
                  value={unlockReasonInput}
                  onChange={(e) => setUnlockReasonInput(e.target.value)}
                  placeholder="أدخل سبب طلب فك القفل وصلاحية المدير..."
                  rows={3}
                  className="w-full border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#714B67]/30 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowUnlockModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 cursor-pointer"
                >
                  تراجع
                </button>
                <button
                  type="button"
                  onClick={confirmUnlockVoucher}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold cursor-pointer shadow-xs"
                >
                  تأكيد وفك القفل
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default LeaveSettlementCalculator;
