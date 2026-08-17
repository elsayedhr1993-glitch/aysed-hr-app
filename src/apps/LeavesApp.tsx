import React, { useState, useEffect, useMemo } from 'react';
export interface LeaveAllocation { id: string; employeeId: string; leaveType: string; year: string; days: number; notes: string; status: 'APPROVED' | 'DRAFT'; }
import { LeaveRequest, Employee, Company, ViewMode, Contract, AttendanceRecord } from '../types';
import { supabase } from '../lib/supabase';
import { printDocument, exportElementToPdf } from '../utils/printUtils';
import { calculateLeaveAccrualMonths, calculateLeaveAccrual2026Details, calculateLeaveAnnualEntitlement2026, calculateAysedLeaveBalance, getAysedSmartLeaveBalance, get_aysed_official_balance, formatKWD, calculateActualLeaveDays, getCompensatedHolidays2026 } from '../utils/kuwaitLaw';
import { LeaveSettlementCalculator } from '../components/LeaveSettlementCalculator';
import { 
  Calendar, Plus, CheckCircle2, XCircle, Clock, 
  Calculator, Save, FileText, CheckCircle, AlertCircle, Search, Info,
  History, Printer, User, ArrowRight, Shield, ShieldCheck, Award, Trash2, DollarSign, AlertTriangle,
  LayoutGrid, List, Filter, Eye, Download, Loader2, X, Send, Scale, RotateCcw
} from 'lucide-react';

interface LeavesAppProps {
  leaves: LeaveRequest[];
  employees: Employee[];
  contracts?: Contract[];
  attendance?: AttendanceRecord[];
  activeCompany: Company;
  viewMode: ViewMode;
  searchTerm: string;
  filterTab: string;
  onSaveLeave: (leave: LeaveRequest) => void;
  onUpdateLeaveStatus: (leaveId: string, status: 'APPROVED' | 'REJECTED', note?: string) => void;
  onDeleteLeave?: (leaveId: string, force?: boolean) => Promise<boolean> | boolean | void;
  onSaveEmployee?: (emp: Employee) => void;
  initialEmployeeId?: string;
  onOpenNotificationModal?: (emp: Employee, trigger?: any, data?: any) => void;
}

export const LeavesApp: React.FC<LeavesAppProps> = ({
  leaves,
  employees,
  contracts = [],
  attendance = [],
  activeCompany,
  viewMode,
  searchTerm,
  filterTab,
  onSaveLeave,
  onUpdateLeaveStatus,
  onDeleteLeave,
  onSaveEmployee,
  initialEmployeeId = 'ALL',
  onOpenNotificationModal,
}) => {
  const [editingLeave, setEditingLeave] = useState<Partial<LeaveRequest> | null>(null);
  const [allocations, setAllocations] = useState<LeaveAllocation[]>([]);
  const [showAllocationForm, setShowAllocationForm] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState<Partial<LeaveAllocation> | null>(null);
  const [userErrorModal, setUserErrorModal] = useState<{ open: boolean; message: string; leave?: LeaveRequest } | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'REQUESTS' | 'BALANCES' | 'HISTORY_LOG' | 'SETTLEMENT' | 'HOLIDAYS' | 'ALLOCATIONS'>(
    filterTab === 'BALANCES' ? 'BALANCES' : filterTab === 'HISTORY_LOG' ? 'HISTORY_LOG' : filterTab === 'SETTLEMENT' ? 'SETTLEMENT' : 'REQUESTS'
  );

  // Sync sub-tab if sidebar filter tab changes
  useEffect(() => {
    if (filterTab === 'BALANCES') {
      setActiveSubTab('BALANCES');
    } else if (filterTab === 'HISTORY_LOG') {
      setActiveSubTab('HISTORY_LOG');
    } else if (filterTab === 'SETTLEMENT') {
      setActiveSubTab('SETTLEMENT');
    }
  }, [filterTab]);

  // Local state for smooth editing of opening balances / carryover
  const [openingBalanceInputs, setOpeningBalanceInputs] = useState<Record<string, number>>({});
  const [savedToastEmpId, setSavedToastEmpId] = useState<string | null>(null);
  const [localSearch, setLocalSearch] = useState<string>('');

  // History Log selected employee filter
  const [historyEmpIdFilter, setHistoryEmpIdFilter] = useState<string>('ALL');
  const [isStatementPrintMode, setIsStatementPrintMode] = useState<boolean>(false);
  const [isExportingStatementPdf, setIsExportingStatementPdf] = useState<boolean>(false);
  const [settlementEmpId, setSettlementEmpId] = useState<string | undefined>();

  // Odoo Filters & View Mode State
  const [yearFilter, setYearFilter] = useState<string>('ALL');
  const [employeeFilter, setEmployeeFilter] = useState<string>(initialEmployeeId);

  useEffect(() => {
    if (initialEmployeeId && initialEmployeeId !== 'ALL') {
      setEmployeeFilter(initialEmployeeId);
    }
  }, [initialEmployeeId]);
  const [stateFilter, setStateFilter] = useState<string>('ALL');
  const [viewModeType, setViewModeType] = useState<'LIST' | 'PIVOT'>('LIST');

  // Selected Employee for Settlement in Modal
  const modalSelectedEmployee = employees.find(e => e.id === editingLeave?.employeeId);
  const modalSelectedContract = contracts.find(c => c.employeeId === editingLeave?.employeeId && c.status === 'RUNNING') 
    || contracts.find(c => c.employeeId === editingLeave?.employeeId);

  // Modal historical calculations
  let modalLastReturnDate = 'أول إجازة للموظف (منذ التعيين)';
  let modalAbsencesCount = 0;
  if (editingLeave?.employeeId) {
    const prevApprovedLeaves = leaves.filter(l => l.employeeId === editingLeave.employeeId && l.status === 'APPROVED');
    const sortedLeaves = [...prevApprovedLeaves].sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
    if (sortedLeaves[0]) {
      const lastEnd = new Date(sortedLeaves[0].endDate);
      lastEnd.setDate(lastEnd.getDate() + 1);
      modalLastReturnDate = lastEnd.toISOString().split('T')[0];
    }
    const empAbsences = attendance.filter(a => a.employeeId === editingLeave.employeeId && a.status === 'ABSENT');
    const empUnpaid = leaves.filter(l => l.employeeId === editingLeave.employeeId && l.leaveType === 'UNPAID' && l.status === 'APPROVED');
    modalAbsencesCount = empAbsences.length + empUnpaid.reduce((sum, l) => sum + l.totalDays, 0);
  }

  const companyEmployees = (employees || []).filter(e => e.companyId === (activeCompany?.id || 'comp-1'));
  const companyLeaves = (leaves || []).filter(l => l.companyId === (activeCompany?.id || 'comp-1'));

  const activeSearchTerm = localSearch || searchTerm;

  const filteredLeaves = companyLeaves.filter(lev => {
    const emp = employees.find(e => e.id === lev.employeeId);
    const empName = emp ? emp.fullNameAr : '';
    const matchesSearch = empName.includes(activeSearchTerm) || lev.reason.includes(activeSearchTerm);

    if (!matchesSearch) return false;

    // Odoo Filters: Year
    if (yearFilter !== 'ALL') {
      const levYear = new Date(lev.startDate).getFullYear().toString();
      if (levYear !== yearFilter) return false;
    }

    // Odoo Filters: Employee
    if (employeeFilter !== 'ALL' && lev.employeeId !== employeeFilter) {
      return false;
    }

    // Odoo Filters: State / Status
    if (stateFilter !== 'ALL' && lev.status !== stateFilter) {
      return false;
    }

    // Filter out historical leaves from current active requests view if desired or keep tab clean
    if (lev.isHistorical && activeSubTab === 'REQUESTS') return false;

    if (filterTab === 'ANNUAL') return lev.leaveType === 'ANNUAL';
    if (filterTab === 'HOURLY_PERMISSION') return lev.leaveType === 'HOURLY_PERMISSION';
    if (filterTab === 'COMPENSATORY') return lev.leaveType === 'COMPENSATORY';
    if (filterTab === 'SICK') return lev.leaveType === 'SICK';
    if (filterTab === 'MATERNITY') return lev.leaveType === 'MATERNITY';
    if (filterTab === 'UNPAID') return lev.leaveType === 'UNPAID';
    return true;
  });

  const filteredCompanyEmployeesForBalances = companyEmployees.filter(emp => {
    return emp.fullNameAr.includes(activeSearchTerm) || 
           emp.employeeCode.includes(activeSearchTerm) || 
           emp.jobTitle.includes(activeSearchTerm);
  });

  const handleSave = async (statusOverride?: 'APPROVED' | 'SUBMITTED' | 'DRAFT' | 'REJECTED', isDirectSayedApproval?: boolean) => {
    if (!editingLeave) return;

    let targetEmpId = editingLeave.employeeId;
    if (!targetEmpId) {
      if (companyEmployees.length > 0) {
        targetEmpId = companyEmployees[0].id;
      } else {
        alert('يرجى اختيار الموظف أولاً');
        return;
      }
    }

    const type = editingLeave.leaveType || 'ANNUAL';

    if (type === 'HOURLY_PERMISSION') {
      if (!editingLeave.startDate) {
        alert('يرجى تحديد تاريخ الاستئذان');
        return;
      }
      if (!editingLeave.permissionMinutes && (!editingLeave.permissionTimeFrom || !editingLeave.permissionTimeTo)) {
        alert('يرجى تحديد مدة الاستئذان بالساعات أو الدقائق');
        return;
      }
    } else if (type === 'COMPENSATORY') {
      if (!editingLeave.workedHolidayDate) {
        alert('يرجى تحديد تاريخ يوم العطلة المُداوَم فيه');
        return;
      }
      if (!editingLeave.startDate) {
        alert('يرجى تحديد تاريخ يوم الإجازة البديلة');
        return;
      }
    } else {
      if (!editingLeave.startDate || !editingLeave.endDate) {
        alert('يرجى تحديد تواريخ بداية ونهاية الإجازة');
        return;
      }
    }

    const isDirectApproved = isDirectSayedApproval || statusOverride === 'APPROVED';
    const isOverrideActive = isDirectApproved || editingLeave.managerOverride;

    // Odoo Overlap Check (checkOverlap)
    if (targetEmpId && editingLeave.startDate && editingLeave.endDate && !isOverrideActive) {
      const startMs = new Date(editingLeave.startDate).getTime();
      const endMs = new Date(editingLeave.endDate).getTime();
      const hasOverlap = companyLeaves.some(l => {
        if (l.employeeId !== targetEmpId) return false;
        if (editingLeave.id && l.id === editingLeave.id) return false;
        if (l.status === 'REJECTED' || l.status === 'REFUSED' || l.status === 'CANCELLED') return false;
        const lStart = new Date(l.startDate).getTime();
        const lEnd = new Date(l.endDate).getTime();
        return startMs <= lEnd && endMs >= lStart;
      });

      if (hasOverlap) {
        alert('عذراً، يوجد تداخل في تواريخ الإجازة مع طلب إجازة آخر قائم لنفس الموظف (Odoo Overlap Rule)');
        return;
      }
    }

    let diffDays = 1;
    if (type === 'HOURLY_PERMISSION') {
      diffDays = 0; // ساعات استئذان
    } else if (editingLeave.startDate && editingLeave.endDate) {
      const start = new Date(editingLeave.startDate);
      const end = new Date(editingLeave.endDate);
      const diffTime = Math.max(0, end.getTime() - start.getTime());
      const roughDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
      // Kuwait Law logic: prevent deducting Fridays and Public Holidays from Annual Leave
      if (type === 'ANNUAL' || type === 'SICK') {
        const { actualDays } = calculateActualLeaveDays(editingLeave.startDate, editingLeave.endDate);
        if (actualDays === 0 && !editingLeave.isHistorical && !isOverrideActive) {
          alert('عذراً: الأيام المختارة بالكامل عبارة عن يوم جمعة أو عطلات رسمية (Total Days = 0).');
          return;
        }
        diffDays = actualDays > 0 ? actualDays : Math.max(1, roughDays);
      } else {
        diffDays = Math.max(1, roughDays);
      }
    }

    const isHist = editingLeave.isHistorical || false;
    const startYearStr = editingLeave.startDate ? new Date(editingLeave.startDate).getFullYear().toString() : '2026';

    let paidDays = diffDays;
    let excessDays = 0;

    if (!isHist && type === 'ANNUAL') {
      const empAllocations = allocations.filter(a => a.employeeId === targetEmpId && a.leaveType === 'ANNUAL' && a.status === 'APPROVED');
      let totalAllocated = empAllocations.reduce((s, a) => s + a.days, 0);
      
      if (totalAllocated === 0) {
        const empData = employees.find(e => e.id === targetEmpId);
        if (empData) {
          const accruedToDate = get_aysed_official_balance(empData);
          totalAllocated = (empData.openingLeaveBalance ?? empData.carriedOverLeave2025 ?? 0) + accruedToDate;
        }
      }

      // Approved leaves that are already deducting balance
      const takenAnnualDays = companyLeaves
        .filter(l => !l.isHistorical && l.employeeId === targetEmpId && l.status === 'APPROVED' && l.leaveType === 'ANNUAL' && (!editingLeave.id || l.id !== editingLeave.id))
        .reduce((sum, l) => sum + (l.totalDays || 0), 0);
        
      const netRemaining = Math.max(0, totalAllocated - takenAnnualDays);
      paidDays = Math.min(diffDays, netRemaining);
      excessDays = Math.max(0, diffDays - paidDays);
    }
    const finalPaidDays = editingLeave.paidDays !== undefined ? editingLeave.paidDays : paidDays;
    const finalExcessDays = editingLeave.excessDays !== undefined ? editingLeave.excessDays : excessDays;
    const startYear = editingLeave.startDate ? new Date(editingLeave.startDate).getFullYear() : 2025;

    // Manager Override Enforcement for leaves exceeding 30 days
    if (diffDays > 30 && !isOverrideActive && !editingLeave.isHistorical) {
      alert('تنبيه قيود النظام (Manager Override Required): طلب الإجازة يتجاوز 30 يوماً متواصلة (' + diffDays + ' يوم). يُسمح فقط للمدير بتجاوز قيود النظام، يرجى تفعيل خيار (موافقة المدير Sayed) أو الضغط على (اعتماد مباشر Sayed) للمتابعة.');
      return;
    }

    const determinedStatus: 'APPROVED' | 'SUBMITTED' | 'DRAFT' | 'REJECTED' = 
      isHist ? 'APPROVED' : (statusOverride || editingLeave.status || 'SUBMITTED');

    const newLeave: LeaveRequest = {
      id: editingLeave.id || `lev-${Date.now()}`,
      employeeId: targetEmpId,
      companyId: activeCompany?.id || 'comp-1',
      leaveType: type,
      startDate: editingLeave.startDate || new Date().toISOString().split('T')[0],
      endDate: editingLeave.endDate || editingLeave.startDate || new Date().toISOString().split('T')[0],
      totalDays: isHist ? (editingLeave.totalDays || diffDays) : diffDays,
      paidDays: finalPaidDays,
      excessDays: finalExcessDays,
      reason: editingLeave.reason || (isHist ? `سجل إجازة تاريخية قديمة لعام ${editingLeave.historicalYear || startYear}` : type === 'HOURLY_PERMISSION' ? 'طلب استئذان ساعات' : type === 'COMPENSATORY' ? 'طلب إجازة تعويضية' : 'إجازة اعتيادية'),
      status: determinedStatus,
      createdAt: new Date().toISOString().split('T')[0],
      permissionMinutes: editingLeave.permissionMinutes,
      permissionTimeFrom: editingLeave.permissionTimeFrom,
      permissionTimeTo: editingLeave.permissionTimeTo,
      workedHolidayDate: editingLeave.workedHolidayDate,
      compCreditDays: editingLeave.compCreditDays || (type === 'COMPENSATORY' ? 1 : undefined),
      isHistorical: isHist,
      historicalYear: isHist ? (editingLeave.historicalYear || startYear) : undefined,
      managerOverride: isOverrideActive,
      managerOverrideNote: isDirectApproved 
        ? 'تم الاعتماد المباشر وتجاوز الرصيد بصلاحية المدير العام Sayed' 
        : (editingLeave.managerOverrideNote || (editingLeave.managerOverride ? 'معتمد بصلاحية المدير العام Sayed' : undefined)),
    };

    onSaveLeave(newLeave);

    // Sync to Supabase leave_requests and leave_balances
    try {
      if (supabase && import.meta.env.VITE_SUPABASE_URL) {
        await supabase.from('leave_requests').upsert({
          id: newLeave.id,
          company_id: newLeave.companyId,
          employee_id: newLeave.employeeId,
          leave_type: newLeave.leaveType.toLowerCase(),
          start_date: newLeave.startDate,
          end_date: newLeave.endDate,
          days: newLeave.totalDays,
          paid_days: finalPaidDays,
          unpaid_days: finalExcessDays,
          reason: newLeave.reason,
          status: newLeave.status.toLowerCase(),
          created_at: newLeave.createdAt,
        });

        if (newLeave.status === 'APPROVED') {
          const { data: existingBal } = await supabase
            .from('leave_balances')
            .select('*')
            .eq('employee_id', newLeave.employeeId)
            .single();

          if (existingBal) {
            const updatedAnnualUsed = newLeave.leaveType === 'ANNUAL' ? (existingBal.annual_used || 0) + finalPaidDays : (existingBal.annual_used || 0);
            const updatedUnpaidUsed = (existingBal.unpaid_used || 0) + finalExcessDays + (newLeave.leaveType === 'UNPAID' ? newLeave.totalDays : 0);
            await supabase.from('leave_balances').update({
              annual_used: updatedAnnualUsed,
              unpaid_used: updatedUnpaidUsed,
            }).eq('id', existingBal.id);
          } else {
            await supabase.from('leave_balances').insert({
              company_id: newLeave.companyId,
              employee_id: newLeave.employeeId,
              year: new Date().getFullYear(),
              annual_used: newLeave.leaveType === 'ANNUAL' ? finalPaidDays : 0,
              unpaid_used: finalExcessDays + (newLeave.leaveType === 'UNPAID' ? newLeave.totalDays : 0),
            });
          }
        }
      }
    } catch (err) {
      console.error('Supabase sync error in leave save:', err);
    }

    setEditingLeave(null);
  };

  // ODOO hr.leave: action_refuse (رد الرصيد تلقائياً عند إلغاء أو رفض الإجازة المعتمدة)
  const handleActionRefuse = async (leave: LeaveRequest) => {
    const isApproved = leave.status === 'APPROVED' || (leave as any).status === 'VALIDATED';
    
    // Update state & Firestore
    onUpdateLeaveStatus(
      leave.id, 
      'REJECTED', 
      'تم إلغاء/رفض الإجازة ورد الأيام للرصيد تلقائياً (hr.leave.action_refuse)'
    );

    // Rollback / Refund in Supabase if was approved
    if (isApproved) {
      try {
        if (supabase) {
          const { data: existingBal } = await supabase
            .from('leave_balances')
            .select('*')
            .eq('employee_id', leave.employeeId)
            .single();

          if (existingBal) {
            const finalPaidDays = leave.paidDays ?? leave.totalDays;
            const finalExcessDays = leave.excessDays ?? 0;
            const updatedAnnualUsed = Math.max(0, (existingBal.annual_used || 0) - (leave.leaveType === 'ANNUAL' ? finalPaidDays : 0));
            const updatedUnpaidUsed = Math.max(0, (existingBal.unpaid_used || 0) - finalExcessDays - (leave.leaveType === 'UNPAID' ? leave.totalDays : 0));
            
            await supabase.from('leave_balances').update({
              annual_used: updatedAnnualUsed,
              unpaid_used: updatedUnpaidUsed,
            }).eq('id', existingBal.id);
          }
        }
      } catch (err) {
        console.error('Error rolling back Supabase leave balance on action_refuse:', err);
      }
    }
  };

  // ODOO hr.leave: unlink (حماية حذف الإجازات المعتمدة)
  const handleUnlink = async (leave: LeaveRequest) => {
    if (leave.status === 'APPROVED' || (leave as any).status === 'VALIDATED') {
      setUserErrorModal({
        open: true,
        message: "لا يمكن حذف إجازة معتمدة مباشرة. يرجى إلغاؤها أولاً لرد الرصيد للموظف.",
        leave
      });
      return;
    }

    if (onDeleteLeave) {
      await onDeleteLeave(leave.id);
    }
    if (editingLeave && editingLeave.id === leave.id) {
      setEditingLeave(null);
    }
  };

  const handleSaveOpeningBalance = (emp: Employee, val: number) => {
    if (onSaveEmployee) {
      onSaveEmployee({
        ...emp,
        openingLeaveBalance: val,
        carriedOverLeave2025: val,
      });
      setSavedToastEmpId(emp.id);
      setTimeout(() => setSavedToastEmpId(null), 2500);
    }
  };

  // Metrics for Balances
  const totalOpeningBalances = companyEmployees.reduce((sum, e) => {
    const val = openingBalanceInputs[e.id] !== undefined 
      ? openingBalanceInputs[e.id] 
      : (e.openingLeaveBalance ?? e.carriedOverLeave2025 ?? 0);
    return sum + val;
  }, 0);

  const totalAccrued2026 = companyEmployees.reduce((sum, e) => {
    return sum + calculateLeaveAccrualMonths(e.joinDate);
  }, 0);

  // Active (non-historical) approved annual leaves
  const totalTakenAnnualLeaves2026 = companyLeaves
    .filter(l => !l.isHistorical && l.status === 'APPROVED' && l.leaveType === 'ANNUAL')
    .reduce((sum, l) => sum + l.totalDays, 0);

  const totalNetAvailableBalance = (totalOpeningBalances + totalAccrued2026) - totalTakenAnnualLeaves2026;

  // History Log Data
  const historicalLeavesList = companyLeaves.filter(l => {
    if (historyEmpIdFilter !== 'ALL' && l.employeeId !== historyEmpIdFilter) {
      return false;
    }
    const emp = employees.find(e => e.id === l.employeeId);
    const empName = emp ? emp.fullNameAr : '';
    const matchesSearch = empName.includes(activeSearchTerm) || l.reason.includes(activeSearchTerm);
    return matchesSearch;
  });

  const selectedHistoryEmployee = historyEmpIdFilter !== 'ALL' 
    ? employees.find(e => e.id === historyEmpIdFilter) 
    : null;

  return (
    <div className="p-6 bg-transparent min-h-[calc(100vh-3rem)]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-amber-600" />
            <span>نظام الإجازات وتتبع الرصيد الأرشيفي Odoo Time Off</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            إدارة طلبات الإجازات، الرصيد الافتتاحي (Opening Balance)، وسجلات الإجازات التاريخية القديمة ككشف حساب موظف
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('SETTLEMENT')}
            className="bg-[#714B67] hover:bg-[#5a3b52] text-white text-xs font-bold px-3.5 py-2 rounded shadow flex items-center gap-1.5 transition cursor-pointer"
            title="حاسبة وطباعة كشف تسوية الإجازات الرسمية"
          >
            <Printer className="w-4 h-4 text-amber-300" />
            <span>طباعة تسوية إجازات</span>
          </button>

          <button
            onClick={() => {
              setEditingLeave({
                companyId: activeCompany?.id || 'comp-1',
                leaveType: 'ANNUAL',
                isHistorical: true,
                historicalYear: 2025,
                startDate: '2025-06-01',
                endDate: '2025-06-15',
                totalDays: 15,
                reason: 'تسجيل إجازة تاريخية سابقة (أرشيف وكشف حساب فقط)',
              });
            }}
            className="bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold px-3 py-2 rounded shadow flex items-center gap-1.5 transition"
            title="إدخال إجازة قديمة أخذها الموظف في السنوات السابقة قبل الانضمام للنظام"
          >
            <History className="w-4 h-4" />
            <span>إدخال إجازة تاريخية (+ Historical)</span>
          </button>

          <button
            onClick={() => {
              setEditingLeave({
                companyId: activeCompany?.id || 'comp-1',
                leaveType: 'ANNUAL',
                startDate: new Date().toISOString().split('T')[0],
                endDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
                reason: 'إجازة سنوية',
              });
            }}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2 rounded shadow flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>تقديم طلب إجازة حالي</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveSubTab('REQUESTS')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-2 ${
            activeSubTab === 'REQUESTS'
              ? 'bg-[#714B67] text-white shadow'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>طلبات الإجازات الحالية (Leave Requests)</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
            activeSubTab === 'REQUESTS' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {companyLeaves.filter(l => !l.isHistorical).length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('BALANCES')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-2 ${
            activeSubTab === 'BALANCES'
              ? 'bg-[#714B67] text-white shadow'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>جدول الأرصدة والافتتاحي (Opening Balances & Carryover)</span>
          <span className="bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
            رصيد افتتاحي
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('SETTLEMENT')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-2 ${
            activeSubTab === 'SETTLEMENT'
              ? 'bg-[#714B67] text-white shadow'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <DollarSign className="w-4 h-4 text-emerald-300" />
          <span>حاسبة المستحقات وتصفية الإجازة (Leave Settlement & Clearance)</span>
          <span className="bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
            تسوية رسمية
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('HISTORY_LOG')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-2 ${
            activeSubTab === 'HISTORY_LOG'
              ? 'bg-[#714B67] text-white shadow'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <History className="w-4 h-4 text-purple-300" />
          <span>سجل حركة الموظف والإجازات التاريخية (History Log & Archive)</span>
          <span className="bg-purple-600 text-white text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
            {companyLeaves.filter(l => l.isHistorical).length} سجل
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('HOLIDAYS')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-2 ${
            activeSubTab === 'HOLIDAYS'
              ? 'bg-[#714B67] text-white shadow'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4 text-amber-300" />
          <span>العطلات الرسمية (Public Holidays 2026)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('ALLOCATIONS')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-2 ${
            activeSubTab === 'ALLOCATIONS'
              ? 'bg-[#714B67] text-white shadow'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Plus className="w-4 h-4 text-emerald-300" />
          <span>تخصيص الرصيد (Allocations)</span>
        </button>
      </div>

      {/* ==================== SUB-TAB 1: REQUESTS VIEW ==================== */}
      {activeSubTab === 'REQUESTS' && (
        <>
          {/* Employee Leave Accrual Summary Badges */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {companyEmployees.slice(0, 3).map(emp => {
              const opening = emp.openingLeaveBalance ?? emp.carriedOverLeave2025 ?? 0;
              const accruedDays2026 = calculateLeaveAccrualMonths(emp.joinDate);
              const takenAnnualDays = companyLeaves
                .filter(l => !l.isHistorical && l.employeeId === emp.id && l.status === 'APPROVED' && l.leaveType === 'ANNUAL')
                .reduce((sum, l) => sum + l.totalDays, 0);

              const netRemaining = (opening + accruedDays2026) - takenAnnualDays;

              return (
                <div key={emp.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900 text-xs">{emp.fullNameAr}</div>
                    <div className="text-[11px] text-slate-500">تاريخ التعيين: {emp.joinDate}</div>
                    <div className="text-[10px] text-amber-700 font-bold mt-1">
                      الرصيد الافتتاحي: {opening} يوم
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-amber-600 font-mono">
                      {netRemaining.toFixed(1)}
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold">الرصيد الصافي المتبقي</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Odoo Filter Bar & View Mode Switcher */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 shadow-sm flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-[#714B67]">
                  <Filter className="w-4 h-4" />
                  <span>فلاتر أودو (Odoo Filters):</span>
                </div>

                {/* Year Filter */}
                <select
                  value={yearFilter || 'ALL'}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#714B67]"
                >
                  <option value="ALL">جميع السنوات (Years)</option>
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                </select>

                {/* Employee Filter */}
                <select
                  value={employeeFilter || 'ALL'}
                  onChange={(e) => setEmployeeFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#714B67]"
                >
                  <option value="ALL">جميع الموظفين (Employees)</option>
                  {companyEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.fullNameAr}</option>
                  ))}
                </select>

                {/* State Filter */}
                <select
                  value={stateFilter || 'ALL'}
                  onChange={(e) => setStateFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#714B67]"
                >
                  <option value="ALL">جميع الحالات (Statuses)</option>
                  <option value="SUBMITTED">قيد المراجعة (To Submit / Confirm)</option>
                  <option value="APPROVED">معتمدة (Validated / Approved)</option>
                  <option value="REJECTED">مرفوضة (Refused)</option>
                </select>
              </div>

              {/* View Mode Switcher (List vs Pivot View) */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button
                  onClick={() => setViewModeType('LIST')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition ${
                    viewModeType === 'LIST' ? 'bg-[#714B67] text-white shadow' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>قائمة الطلبات (List)</span>
                </button>
                <button
                  onClick={() => setViewModeType('PIVOT')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition ${
                    viewModeType === 'PIVOT' ? 'bg-[#714B67] text-white shadow' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>الجدول المحوري (Pivot View)</span>
                </button>
              </div>
            </div>

            {/* Odoo Active Search Facets (مربعات البحث والفلاتر النشطة) */}
            {(yearFilter !== 'ALL' || employeeFilter !== 'ALL' || stateFilter !== 'ALL') && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
                <span className="text-slate-400 font-semibold">الفلاتر النشطة (Facets):</span>
                {yearFilter !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 bg-purple-50 text-[#714B67] px-2.5 py-1 rounded-md border border-purple-200 font-bold">
                    <span>السنة: {yearFilter}</span>
                    <button onClick={() => setYearFilter('ALL')} className="hover:text-red-600 font-bold ml-1">×</button>
                  </span>
                )}
                {employeeFilter !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 bg-purple-50 text-[#714B67] px-2.5 py-1 rounded-md border border-purple-200 font-bold">
                    <span>الموظف: {companyEmployees.find(e => e.id === employeeFilter)?.fullNameAr || employeeFilter}</span>
                    <button onClick={() => setEmployeeFilter('ALL')} className="hover:text-red-600 font-bold ml-1">×</button>
                  </span>
                )}
                {stateFilter !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 bg-purple-50 text-[#714B67] px-2.5 py-1 rounded-md border border-purple-200 font-bold">
                    <span>الحالة: {stateFilter === 'APPROVED' ? 'معتمدة' : stateFilter === 'SUBMITTED' ? 'قيد المراجعة' : 'مرفوضة'}</span>
                    <button onClick={() => setStateFilter('ALL')} className="hover:text-red-600 font-bold ml-1">×</button>
                  </span>
                )}
                <button
                  onClick={() => { setYearFilter('ALL'); setEmployeeFilter('ALL'); setStateFilter('ALL'); }}
                  className="text-slate-500 hover:text-red-600 text-[11px] underline mr-2 font-medium"
                >
                  إعادة ضبط الكل
                </button>
              </div>
            )}
          </div>

          {/* Leaves Requests Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {viewModeType === 'PIVOT' ? (
              <div className="p-4">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4 text-xs text-purple-900 flex items-center justify-between">
                  <div>
                    <span className="font-bold">عرض الجدول المحوري (Odoo Pivot View):</span> تجميع الطلبات حسب الموظف ونوع الإجازة مع مجاميع الأيام.
                  </div>
                  <div className="font-mono font-bold bg-white px-3 py-1 rounded border border-purple-200">
                    إجمالي الطلبات: {filteredLeaves.length} | إجمالي الأيام: {filteredLeaves.reduce((s, l) => s + (l.totalDays || 0), 0)} يوم
                  </div>
                </div>

                <table className="w-full text-right text-xs">
                  <thead className="bg-[#714B67] text-white font-bold">
                    <tr>
                      <th className="p-3">الموظف (Employee)</th>
                      <th className="p-3">نوع الإجازة (Leave Type)</th>
                      <th className="p-3 text-center">المخصص (Allocated)</th>
                      <th className="p-3 text-center">المستهلك (Taken)</th>
                      <th className="p-3 text-center">المتبقي (Remaining)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(() => {
                      const map = new Map<string, { employeeName: string; leaveType: string; allocated: number; taken: number }>();
                      
                      // 1. Process Allocations
                      const relevantAllocations = yearFilter !== 'ALL' ? allocations.filter(a => a.year === yearFilter && a.status === 'APPROVED') : allocations.filter(a => a.status === 'APPROVED');
                      relevantAllocations.forEach(alloc => {
                        const emp = employees.find(e => e.id === alloc.employeeId);
                        const empName = emp ? emp.fullNameAr : 'مجهول';
                        const key = `${alloc.employeeId}-${alloc.leaveType}`;
                        if (!map.has(key)) {
                          map.set(key, { employeeName: empName, leaveType: alloc.leaveType, allocated: 0, taken: 0 });
                        }
                        map.get(key)!.allocated += alloc.days;
                      });

                      // 2. Add Base Entitlement if viewing ANNUAL and no allocations explicitly exist (for backward compat with older UX)
                      if (yearFilter === '2026' || yearFilter === 'ALL') {
                        employees.forEach(emp => {
                          const key = `${emp.id}-ANNUAL`;
                          const accrualDetails = calculateLeaveAccrual2026Details(emp.joinDate);
                          const base = (emp.openingLeaveBalance ?? emp.carriedOverLeave2025 ?? 0) + accrualDetails.annualTotal2026;
                          if (!map.has(key)) {
                            map.set(key, { employeeName: emp.fullNameAr, leaveType: 'ANNUAL', allocated: 0, taken: 0 });
                          }
                          // Only add standard base if we haven't manually allocated using the new system for this year
                          if (relevantAllocations.filter(a => a.employeeId === emp.id && a.leaveType === 'ANNUAL').length === 0) {
                            map.get(key)!.allocated = base;
                          }
                        });
                      }

                      // 3. Process Taken Leaves
                      const relevantLeaves = filteredLeaves.filter(l => l.status === 'APPROVED' && !l.isHistorical);
                      relevantLeaves.forEach(lev => {
                        const emp = employees.find(e => e.id === lev.employeeId);
                        const empName = emp ? emp.fullNameAr : 'مجهول';
                        const key = `${lev.employeeId}-${lev.leaveType}`;
                        if (!map.has(key)) {
                          map.set(key, { employeeName: empName, leaveType: lev.leaveType, allocated: 0, taken: 0 });
                        }
                        map.get(key)!.taken += (lev.totalDays || 0);
                      });

                      const pivotRows = Array.from(map.values());

                      if (pivotRows.length === 0) {
                        return (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-500">
                              <p className="font-bold">لا توجد بيانات مطابقة للعرض المحوري</p>
                            </td>
                          </tr>
                        );
                      }

                      return pivotRows.map((row, idx) => {
                        const remaining = row.allocated - row.taken;
                        return (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70 hover:bg-purple-50 transition'}>
                            <td className="p-3 font-bold text-slate-800">{row.employeeName}</td>
                            <td className="p-3 text-slate-600">
                              {row.leaveType === 'ANNUAL' ? 'إجازة سنوية' : row.leaveType === 'SICK' ? 'إجازة مرضية' : row.leaveType}
                            </td>
                            <td className="p-3 text-center font-mono font-bold text-emerald-600">{row.allocated.toFixed(2)}</td>
                            <td className="p-3 text-center font-mono font-bold text-rose-600">{row.taken.toFixed(2)}</td>
                            <td className="p-3 text-center font-mono font-black text-[#714B67]">{remaining.toFixed(2)}</td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            ) : (
              <table className="w-full text-right text-xs">
              <thead className="bg-[#714B67] text-white font-bold">
                <tr>
                  <th className="p-3">رمز الطلب</th>
                  <th className="p-3">اسم الموظف</th>
                  <th className="p-3">نوع الإجازة</th>
                  <th className="p-3">تاريخ البداية</th>
                  <th className="p-3">تاريخ النهاية</th>
                  <th className="p-3">إجمالي الأيام</th>
                  <th className="p-3">السبب / البيان</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3 text-center">الاعتماد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeaves.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500">
                      <p className="font-bold mb-1">لا توجد طلبات إجازة حالية مطابقة</p>
                      <p className="text-[11px] text-slate-400 mb-3">يمكن تقديم طلب إجازة جديد أو مراجعة الأرشيف وسجل الحركة التاريخي</p>
                      <button
                        onClick={() => {
                          setEditingLeave({
                            leaveType: 'ANNUAL',
                            startDate: new Date().toISOString().split('T')[0],
                            endDate: new Date().toISOString().split('T')[0],
                            totalDays: 1,
                            reason: 'إجازة سنوية',
                          });
                        }}
                        className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2 rounded shadow transition"
                      >
                        تقديم طلب إجازة
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredLeaves.map((lev, index) => {
                    const emp = employees.find(e => e.id === lev.employeeId);
                    return (
                      <tr key={lev.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                        <td className="p-3 font-mono font-bold text-slate-600">
                          {lev.id}
                          {lev.isHistorical && (
                            <span className="mr-1 bg-purple-100 text-purple-800 text-[9px] px-1 py-0.2 rounded font-bold">
                              أرشيف
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-bold text-slate-900">{emp ? emp.fullNameAr : 'مجهول'}</td>
                        <td className="p-3">
                          <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[11px] font-bold">
                            {lev.leaveType === 'ANNUAL' ? '🌴 سنوية' : 
                             lev.leaveType === 'HOURLY_PERMISSION' ? '⏱️ استئذان ساعات' :
                             lev.leaveType === 'COMPENSATORY' ? '🎁 إجازة تعويضية' :
                             lev.leaveType === 'SICK' ? '🏥 مرضية' : 
                             lev.leaveType === 'MATERNITY' ? '👶 وضع (أمومة)' : 
                             lev.leaveType === 'HAJJ' ? '🕋 حج' : 
                             lev.leaveType === 'COMPASSIONATE' ? '🖤 حداد' : 
                             '🚫 بدون راتب'}
                          </span>
                        </td>
                        <td className="p-3 font-mono">{lev.startDate}</td>
                        <td className="p-3 font-mono">{lev.leaveType === 'HOURLY_PERMISSION' ? lev.startDate : lev.endDate}</td>
                        <td className="p-3">
                          {lev.leaveType === 'HOURLY_PERMISSION' ? (
                            <div>
                              <span className="font-mono font-bold text-indigo-700">
                                {lev.permissionMinutes ? `${lev.permissionMinutes} دقيقة (${(lev.permissionMinutes / 60).toFixed(1)} ساعة)` : 'استئذان ساعات'}
                              </span>
                            </div>
                          ) : (
                            <div>
                              <span className="font-mono font-bold text-amber-700">{lev.totalDays} يوماً</span>
                              {lev.excessDays && lev.excessDays > 0 ? (
                                <span className="text-[10px] text-amber-900 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded block mt-0.5 font-bold">
                                  ⚠️ تجاوز: {lev.excessDays} يوم بدون راتب (حسم من نهاية الخدمة)
                                </span>
                              ) : lev.leaveType === 'UNPAID' ? (
                                <span className="text-[10px] text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded block mt-0.5 font-bold">
                                  🚫 بدون راتب (حسم من مدة الخدمة)
                                </span>
                              ) : null}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-slate-600 truncate max-w-xs">{lev.reason}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold block w-fit ${
                            lev.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                            lev.status === 'REJECTED' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                            lev.status === 'SUBMITTED' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                            'bg-slate-100 text-slate-700 border border-slate-300'
                          }`}>
                            {lev.status === 'APPROVED' ? '✅ معتمدة (Validated)' : 
                             lev.status === 'REJECTED' ? '❌ مرفوضة (Refused)' : 
                             lev.status === 'SUBMITTED' ? '⏳ انتظار اعتماد HR' : 
                             '📝 مسودة (Draft)'}
                          </span>
                          {lev.managerOverride && (
                            <span className="bg-purple-100 text-purple-900 border border-purple-300 px-1.5 py-0.5 rounded text-[10px] font-bold block mt-1 w-fit">
                              👑 اعتماد المدير (Sayed)
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {lev.status === 'DRAFT' || lev.status === 'SUBMITTED' ? (
                            <div className="flex flex-wrap items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onUpdateLeaveStatus(lev.id, 'APPROVED', 'معتمد بصلاحية المدير العام Sayed (تجاوز رصيد / بدون راتب)');
                                }}
                                className="px-2 py-1 bg-purple-800 text-white rounded text-[11px] font-bold hover:bg-purple-900 flex items-center gap-1 shadow-xs transition cursor-pointer"
                                title="اعتماد مباشر بصلاحية المدير العام Sayed (يسمح بتجاوز الرصيد)"
                              >
                                <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
                                <span>اعتماد Sayed</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onUpdateLeaveStatus(lev.id, 'APPROVED');
                                }}
                                className="px-2 py-1 bg-emerald-600 text-white rounded text-[11px] font-bold hover:bg-emerald-700 flex items-center gap-1 shadow-xs transition cursor-pointer"
                                title="اعتماد مسؤول الموارد البشرية (hr.group_hr_user)"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>اعتماد HR</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onUpdateLeaveStatus(lev.id, 'REJECTED');
                                }}
                                className="px-2 py-1 bg-rose-600 text-white rounded text-[11px] font-bold hover:bg-rose-700 flex items-center gap-1 shadow-xs transition cursor-pointer"
                                title="رفض الإجازة"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>رفض</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUnlink(lev);
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                                title="حذف السجل (unlink)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : lev.status === 'APPROVED' ? (
                            <div className="flex flex-wrap items-center justify-center gap-1.5">
                              {onOpenNotificationModal && emp && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenNotificationModal(emp, 'LEAVE_APPROVAL', { leave: lev });
                                  }}
                                  className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded transition cursor-pointer"
                                  title="إرسال إشعار اعتماد الإجازة عبر الواتساب للموظف"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>
                              )}
                              {/* Odoo action_refuse: Cancel & Refund Balance */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleActionRefuse(lev);
                                }}
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded text-[11px] font-bold flex items-center gap-1 shadow-2xs transition cursor-pointer"
                                title="إلغاء ورفض الإجازة ورد الأيام تلقائياً إلى رصيد الموظف (action_refuse)"
                              >
                                <RotateCcw className="w-3 h-3 text-rose-600" />
                                <span>إلغاء ورد الرصيد</span>
                              </button>
                              {/* Odoo unlink protection */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUnlink(lev);
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                                title="حذف الإجازة (unlink)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-slate-400 text-[10px] font-bold font-mono">
                                ملغي (مردود)
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUnlink(lev);
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                                title="حذف السجل نهائياً (unlink)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            )}
          </div>
        </>
      )}

      {/* ==================== SUB-TAB 2: LEAVE BALANCES & OPENING BALANCE ==================== */}
      {activeSubTab === 'BALANCES' && (
        <div className="space-y-6">
          {/* Information & Law Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 leading-relaxed shadow-sm">
            <h3 className="font-bold text-sm mb-1 text-amber-950 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-amber-700" />
              <span>الرصيد الافتتاحي للإجازات (Opening Balance & Accruals)</span>
            </h3>
            <p className="text-amber-800">
              تتيح لك هذه الخانة <strong>إدخال وتعيين (الرصيد الافتتاحي - Opening Balance)</strong> المستحق لكل موظف عند انتقاله للنظام. يقوم النظام بحفظ هذا الرقم واستخدامه للربط مع المستحق الجاري لعام 2026 (بواقع 2.5 يوم عن كل شهر خدمة):
            </p>
            <ul className="list-disc list-inside mt-1.5 space-y-1 text-[11px] text-amber-900 font-semibold">
              <li><strong>الموظفون القدامى:</strong> تعيين الرصيد المتبقي المستحق لهم تاريخياً عند تفعيل النظام.</li>
              <li><strong>الموظفون الجدد (تعيين 2026):</strong> يبدأ احتساب المستحق من شهر المباشرة الفعلية تلقائياً.</li>
            </ul>
          </div>

          {/* Overall Company Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="text-[11px] font-bold text-slate-500">إجمالي الموظفين بالشركة</div>
              <div className="text-2xl font-black text-slate-800 font-mono mt-1">
                {companyEmployees.length} موظف
              </div>
            </div>

            <div className="bg-white rounded-xl border border-amber-200 bg-amber-50/30 p-4 shadow-sm">
              <div className="text-[11px] font-bold text-amber-800">إجمالي الأرصدة الافتتاحية المرحّلة</div>
              <div className="text-2xl font-black text-amber-900 font-mono mt-1">
                {totalOpeningBalances.toFixed(1)} يوم
              </div>
            </div>

            <div className="bg-white rounded-xl border border-purple-200 bg-purple-50/30 p-4 shadow-sm">
              <div className="text-[11px] font-bold text-purple-800">المكتسب لعام 2026 (تُضاف 2.5 يوم كل 28 بالشهر)</div>
              <div className="text-2xl font-black text-purple-900 font-mono mt-1">
                {totalAccrued2026.toFixed(1)} يوم
              </div>
            </div>

            <div className="bg-white rounded-xl border border-emerald-200 bg-emerald-50/30 p-4 shadow-sm">
              <div className="text-[11px] font-bold text-emerald-800">إجمالي الرصيد الصافي المتاح بالشركة</div>
              <div className="text-2xl font-black text-emerald-900 font-mono mt-1">
                {totalNetAvailableBalance.toFixed(1)} يوم
              </div>
            </div>
          </div>

          {/* Balances Table Container */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="font-bold text-slate-800 text-xs flex items-center gap-2">
                <span>سجل الأرصدة الافتتاحية والمستحقة لجميع الموظفين ({activeCompany?.nameAr || ''})</span>
                <span className="bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded text-[10px]">
                  احتساب 2026 يبدأ من شهر التعيين (2.5 يوم/شهر)
                </span>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
                <input
                  type="text"
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  placeholder="بحث باسم الموظف أو الكود..."
                  className="w-full bg-white border border-slate-300 rounded-lg pr-8 pl-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-[#714B67]"
                />
              </div>
            </div>

            <table className="w-full text-right text-xs">
              <thead className="bg-[#714B67] text-white font-bold">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">الموظف وبيانات التعيين</th>
                  <th className="p-3 text-center bg-[#5c3c54]">
                    الرصيد المرحل (Opening Balance) 🖊️
                  </th>
                  <th className="p-3 text-center bg-[#68415f]">
                    احتساب 2026 (2.5 يوم كل 28 بالشهر) 📅
                  </th>
                  <th className="p-3 text-center">إجمالي الرصيد المستحق (سنوي + مرحل)</th>
                  <th className="p-3 text-center">الأيام المستهلكة (بدون الجمع/العطل)</th>
                  <th className="p-3 text-center">الرصيد المتبقي</th>
                  <th className="p-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCompanyEmployeesForBalances.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      لا يوجد موظفون مطايقون لشرط البحث
                    </td>
                  </tr>
                ) : (
                  filteredCompanyEmployeesForBalances.map((emp, idx) => {
                    const openingVal = openingBalanceInputs[emp.id] !== undefined 
                      ? openingBalanceInputs[emp.id] 
                      : (emp.openingLeaveBalance ?? emp.carriedOverLeave2025 ?? 0);

                    // Dynamic 2026 leave calculation based on official Aysed balance function
                    const accruedToDate = get_aysed_official_balance(emp);
                    const accruedMonthsCount = Math.round(accruedToDate / 2.5);
                    const accrualDetails = calculateLeaveAccrual2026Details(emp.joinDate);
                    const annualEntitlement2026 = accrualDetails.annualTotal2026;
                    const totalGrossAccrued = openingVal + annualEntitlement2026;

                    // Approved active annual leave days taken in 2026 (Fridays are already excluded by calculateActualLeaveDays)
                    const takenAnnualDays = companyLeaves
                      .filter(l => !l.isHistorical && l.employeeId === emp.id && l.status === 'APPROVED' && l.leaveType === 'ANNUAL')
                      .reduce((sum, l) => sum + l.totalDays, 0);

                    const netRemaining = (openingVal + accruedToDate) - takenAnnualDays;

                    return (
                      <tr key={emp.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                        <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{emp.fullNameAr}</div>
                          <div className="text-[10px] text-slate-500">
                            {emp.employeeCode} • {emp.jobTitle} ({emp.department})
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                              تعيين: {emp.joinDate || 'غير مسجل'}
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              accrualDetails.startMonthName !== 'يناير 2026'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-blue-50 text-blue-700'
                            }`}>
                              يبدأ من {accrualDetails.startMonthName}
                            </span>
                          </div>
                        </td>
                        
                        {/* MANUAL ENTRY FIELD FOR OPENING BALANCE */}
                        <td className="p-3 text-center bg-amber-50/60 border-x border-amber-100">
                          <div className="flex items-center justify-center gap-1.5">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              value={openingVal}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setOpeningBalanceInputs(prev => ({ ...prev, [emp.id]: val }));
                              }}
                              className="w-20 border border-amber-400 rounded-lg p-1.5 font-bold font-mono text-center text-slate-900 bg-white shadow-inner focus:ring-2 focus:ring-amber-500 outline-none text-xs"
                              placeholder="0.0"
                            />
                            <button
                              onClick={() => handleSaveOpeningBalance(emp, openingVal)}
                              className="bg-amber-600 hover:bg-amber-700 text-white p-1.5 rounded-lg shadow text-[10px] font-bold transition flex items-center gap-1"
                              title="حفظ الرصيد الافتتاحي لهذا الموظف"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">حفظ</span>
                            </button>
                          </div>
                          {savedToastEmpId === emp.id && (
                            <div className="text-[10px] text-emerald-700 font-bold mt-1 animate-pulse">
                              ✓ تم الحفظ
                            </div>
                          )}
                        </td>

                        {/* 2026 ACCRUAL DETAILS BASED ON HIRE MONTH & 28TH CUTOFF */}
                        <td className="p-3 text-center bg-purple-50/40 border-x border-purple-100">
                          <div className="text-[11px] font-bold text-purple-900">
                            مستحق 2026: <span className="font-mono text-xs">{annualEntitlement2026.toFixed(1)} يوم</span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            ({accrualDetails.totalMonthsIn2026} شهر × 2.5 يوم)
                          </div>
                          <div className="mt-1 flex flex-col items-center gap-1">
                            <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100/80 px-2 py-0.5 rounded">
                              المكتسب حتى اليوم: {accruedToDate.toFixed(1)} يوم ({accruedMonthsCount} شهر)
                            </span>
                            <span className="text-[9px] text-purple-700 bg-purple-100/60 px-1.5 py-0.5 rounded font-mono">
                              الإضافة القادمة: {accrualDetails.nextCreditDateStr}
                            </span>
                          </div>
                        </td>

                        <td className="p-3 text-center font-mono font-bold text-slate-900 text-sm">
                          {totalGrossAccrued.toFixed(1)} <span className="text-[10px] text-slate-500">يوم</span>
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-rose-600 text-sm">
                          {takenAnnualDays.toFixed(1)} <span className="text-[10px] text-slate-500">يوم</span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="font-mono font-black text-emerald-700 text-base">
                            {netRemaining.toFixed(1)} <span className="text-[10px] font-bold text-emerald-600">يوم</span>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setSettlementEmpId(emp.id);
                                setActiveSubTab('SETTLEMENT');
                              }}
                              className="bg-purple-900 hover:bg-purple-950 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg shadow-xs transition flex items-center gap-1 cursor-pointer"
                              title="طباعة تسوية إجازات وتصفية الرصيد للموظف"
                            >
                              <Printer className="w-3.5 h-3.5 text-amber-300" />
                              <span>تسوية إجازة</span>
                            </button>
                            <button
                              onClick={() => {
                                setHistoryEmpIdFilter(emp.id);
                                setActiveSubTab('HISTORY_LOG');
                              }}
                              className="bg-purple-700 hover:bg-purple-800 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg shadow-xs transition flex items-center gap-1"
                            >
                              <History className="w-3.5 h-3.5" />
                              <span>كشف الحساب</span>
                            </button>
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

      {/* ==================== SUB-TAB 3: SETTLEMENT CALCULATOR ==================== */}
      {activeSubTab === 'SETTLEMENT' && (
        <LeaveSettlementCalculator
          employees={employees}
          contracts={contracts}
          leaves={leaves}
          attendance={attendance}
          activeCompany={activeCompany}
          preSelectedEmployeeId={settlementEmpId}
        />
      )}

      {/* ==================== SUB-TAB 4: HISTORY LOG & ARCHIVE (سجل حركة الموظف) ==================== */}
      {activeSubTab === 'HISTORY_LOG' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-xs text-purple-900 leading-relaxed shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm mb-1 text-purple-950 flex items-center gap-2">
                  <History className="w-4 h-4 text-purple-700" />
                  <span>سجل حركة الإجازات التاريخية وكشف حساب الموظف (Leave History Ledger)</span>
                </h3>
                <p className="text-purple-800">
                  تتيح هذه الخانة للـ HR وتسجيل أرشيف الإجازات القديمة التي أخذها الموظف في السنوات السابقة (تاريخية). <strong>تظهر هذه السجلات كأرشيف وكشف حساب فقط، ولا تؤثر إطلاقاً على مسير الرواتب الحالية.</strong>
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setIsStatementPrintMode(!isStatementPrintMode)}
                  className="bg-white hover:bg-slate-100 text-purple-900 border border-purple-300 text-xs font-bold px-3 py-2 rounded shadow-xs flex items-center gap-1.5 transition"
                >
                  <Eye className="w-4 h-4 text-purple-700" />
                  <span>{isStatementPrintMode ? 'إغلاق المعاينة' : 'معاينة كشف حساب'}</span>
                </button>

                <button
                  onClick={() => {
                    const emp = selectedHistoryEmployee || companyEmployees[0];
                    if (!emp) {
                      alert('لا يوجد موظفين لعرض كشف الحساب');
                      return;
                    }
                    if (!selectedHistoryEmployee && companyEmployees[0]) {
                      setHistoryEmpIdFilter(companyEmployees[0].id);
                    }
                    setIsStatementPrintMode(true);
                    setTimeout(() => {
                      printDocument('leave-statement-print-area', `كشف_حساب_إجازات_${(emp || selectedHistoryEmployee)?.fullNameAr || 'موظف'}`);
                    }, 200);
                  }}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3.5 py-2 rounded shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                  title="تنفيذ أمر طباعة كشف حساب الإجازات الرسمي (action_report_leave_statement - qweb-pdf)"
                >
                  <Printer className="w-4 h-4 text-emerald-200" />
                  <span>طباعة كشف حساب رسمي (PDF)</span>
                </button>

                <button
                  onClick={() => {
                    setEditingLeave({
                      companyId: activeCompany?.id || 'comp-1',
                      employeeId: historyEmpIdFilter !== 'ALL' ? historyEmpIdFilter : undefined,
                      leaveType: 'ANNUAL',
                      isHistorical: true,
                      historicalYear: 2025,
                      startDate: '2025-07-01',
                      endDate: '2025-07-15',
                      totalDays: 15,
                      reason: 'تسجيل إجازة تاريخية قديمة في السجل الأرشيفي',
                    });
                  }}
                  className="bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold px-4 py-2 rounded shadow flex items-center gap-2 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>تسجيل إجازة تاريخية قديمة</span>
                </button>
              </div>
            </div>
          </div>

          {/* Filter Employee Selector */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <User className="w-4 h-4 text-purple-700 shrink-0" />
              <label className="font-bold text-slate-700 text-xs shrink-0">تصفية الموظف:</label>
              <select
                value={historyEmpIdFilter || 'ALL'}
                onChange={(e) => setHistoryEmpIdFilter(e.target.value)}
                className="w-full sm:w-72 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-800 bg-white outline-none focus:ring-2 focus:ring-purple-600"
              >
                <option value="ALL">-- جميع الموظفين (كل سجلات الشركة) --</option>
                {companyEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullNameAr} ({emp.employeeCode} - {emp.jobTitle})
                  </option>
                ))}
              </select>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="بحث في البيان أو التواريخ..."
                className="w-full bg-white border border-slate-300 rounded-lg pr-8 pl-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>
          </div>

          {/* Selected Employee Metrics Card (Statement Header) */}
          {selectedHistoryEmployee && (
            <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white rounded-xl p-5 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-purple-700/60">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center font-bold text-lg border border-white/20">
                    <User className="w-6 h-6 text-purple-200" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-white">{selectedHistoryEmployee.fullNameAr}</h3>
                    <p className="text-xs text-purple-200">
                      الكود: {selectedHistoryEmployee.employeeCode} • {selectedHistoryEmployee.jobTitle} • {selectedHistoryEmployee.department}
                    </p>
                  </div>
                </div>

                <div className="text-left font-mono dir-ltr text-xs text-purple-200">
                  <div>تاريخ التعيين: <span className="font-bold text-white">{selectedHistoryEmployee.joinDate}</span></div>
                  <div>الرقم المدني: <span className="font-bold text-white">{selectedHistoryEmployee.civilId}</span></div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-center">
                <div className="bg-white/10 rounded-lg p-2.5 border border-white/10">
                  <div className="text-[10px] text-purple-200 font-bold">الرصيد الافتتاحي (Opening Balance)</div>
                  <div className="text-xl font-black font-mono text-amber-300 mt-0.5">
                    {(selectedHistoryEmployee.openingLeaveBalance ?? selectedHistoryEmployee.carriedOverLeave2025 ?? 0).toFixed(1)} يوم
                  </div>
                </div>

                <div className="bg-white/10 rounded-lg p-2.5 border border-white/10">
                  <div className="text-[10px] text-purple-200 font-bold">إجمالي الأيام التاريخية المسجلة</div>
                  <div className="text-xl font-black font-mono text-purple-200 mt-0.5">
                    {companyLeaves
                      .filter(l => l.employeeId === selectedHistoryEmployee.id && l.isHistorical)
                      .reduce((sum, l) => sum + l.totalDays, 0)} يوم
                  </div>
                </div>

                <div className="bg-white/10 rounded-lg p-2.5 border border-white/10">
                  <div className="text-[10px] text-purple-200 font-bold">المستحق الحالي (2026)</div>
                  <div className="text-xl font-black font-mono text-cyan-300 mt-0.5">
                    {calculateLeaveAccrualMonths(selectedHistoryEmployee.joinDate).toFixed(1)} يوم
                  </div>
                </div>

                <div className="bg-white/10 rounded-lg p-2.5 border border-white/10">
                  <div className="text-[10px] text-purple-200 font-bold">الرصيد الصافي المتاح للخدمة</div>
                  <div className="text-xl font-black font-mono text-emerald-300 mt-0.5">
                    {((selectedHistoryEmployee.openingLeaveBalance ?? selectedHistoryEmployee.carriedOverLeave2025 ?? 0) + 
                      calculateLeaveAccrualMonths(selectedHistoryEmployee.joinDate) - 
                      companyLeaves
                        .filter(l => !l.isHistorical && l.employeeId === selectedHistoryEmployee.id && l.status === 'APPROVED' && l.leaveType === 'ANNUAL')
                        .reduce((sum, l) => sum + l.totalDays, 0)
                    ).toFixed(1)} يوم
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PRINTABLE STATEMENT VIEW */}
          {isStatementPrintMode && selectedHistoryEmployee && (
            <div className="bg-white border-2 border-slate-800 p-6 sm:p-8 rounded-xl shadow-xl space-y-6 font-serif dir-rtl print:p-0 print:border-none print:shadow-none">
              {/* Odoo Report Control Header (Hidden on actual print) */}
              <div className="print:hidden bg-purple-50 border border-purple-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 text-xs font-sans">
                <div className="flex items-center gap-2">
                  <span className="bg-[#714B67] text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                    qweb-pdf
                  </span>
                  <span className="font-bold text-[#714B67]">
                    تقرير أودو الرسمي: hr_holidays_aysed.action_report_leave_statement
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsStatementPrintMode(false)}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-3 py-1.5 rounded cursor-pointer transition"
                  >
                    إغلاق المعاينة
                  </button>

                  <button
                    onClick={async () => {
                      if (isExportingStatementPdf) return;
                      setIsExportingStatementPdf(true);
                      try {
                        await exportElementToPdf('leave-statement-print-area', `كشف_حساب_إجازات_${selectedHistoryEmployee.fullNameAr}`);
                      } finally {
                        setIsExportingStatementPdf(false);
                      }
                    }}
                    disabled={isExportingStatementPdf}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3 py-1.5 rounded flex items-center gap-1.5 cursor-pointer shadow-xs transition disabled:opacity-50"
                  >
                    {isExportingStatementPdf ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>جاري التحميل...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5 text-emerald-200" />
                        <span>تحميل PDF</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      printDocument('leave-statement-print-area', `كشف_حساب_إجازات_${selectedHistoryEmployee.fullNameAr}`);
                    }}
                    className="bg-[#714B67] hover:bg-[#583950] text-white font-bold px-3.5 py-1.5 rounded flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                  >
                    <Printer className="w-3.5 h-3.5 text-amber-300" />
                    <span>طباعة المستند (Print)</span>
                  </button>
                </div>
              </div>

              {/* Printable Body */}
              <div id="leave-statement-print-area" className="bg-white p-2 space-y-6">
                <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{activeCompany?.nameAr || ''}</h2>
                    <p className="text-xs text-slate-500 font-sans mt-0.5">{activeCompany?.nameEn || ''}</p>
                  </div>
                  <div className="text-left font-mono text-xs">
                    <div className="font-bold text-sm text-purple-900">كشف حساب إجازات موظف (Leave Statement)</div>
                    <div className="text-slate-500">تاريخ الإصدار: {new Date().toISOString().split('T')[0]}</div>
                    <div className="text-[10px] text-slate-400 font-mono">Report: qweb-pdf</div>
                  </div>
                </div>

                {(() => {
                  const earnedDays2026 = get_aysed_official_balance(selectedHistoryEmployee);
                  const monthsCount = Math.round(earnedDays2026 / 2.5);
                  const opening = selectedHistoryEmployee.openingLeaveBalance ?? selectedHistoryEmployee.carriedOverLeave2025 ?? 0;
                  const takenAnnual = companyLeaves
                    .filter(l => !l.isHistorical && l.employeeId === selectedHistoryEmployee.id && l.status === 'APPROVED' && l.leaveType === 'ANNUAL')
                    .reduce((sum, l) => sum + l.totalDays, 0);
                  const net = (opening + earnedDays2026) - takenAnnual;

                  return (
                    <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded border border-slate-300">
                      <div><strong>اسم الموظف:</strong> {selectedHistoryEmployee.fullNameAr}</div>
                      <div><strong>كود الموظف:</strong> {selectedHistoryEmployee.employeeCode}</div>
                      <div><strong>الرقم المدني:</strong> {selectedHistoryEmployee.civilId}</div>
                      <div><strong>المسمى الوظيفي:</strong> {selectedHistoryEmployee.jobTitle}</div>
                      <div><strong>تاريخ التعيين:</strong> {selectedHistoryEmployee.joinDate}</div>
                      <div><strong>رصيد مرحل 2025:</strong> {opening.toFixed(1)} يوم</div>
                      <div><strong>المكتسب حتى تاريخه (2026):</strong> {earnedDays2026.toFixed(1)} يوم ({monthsCount} شهر)</div>
                      <div><strong>الرصيد الصافي المتبقي:</strong> <span className="font-bold text-emerald-700">{net.toFixed(1)} يوم</span></div>
                    </div>
                  );
                })()}

                <div>
                  <h4 className="font-bold text-xs text-slate-900 mb-2 border-b pb-1">جدول التفاصيل والحركة التاريخية:</h4>
                  <table className="w-full text-right text-xs border border-slate-400">
                    <thead className="bg-slate-200 font-bold border-b border-slate-400">
                      <tr>
                        <th className="p-2 border-l border-slate-400">السنة/التاريخ</th>
                        <th className="p-2 border-l border-slate-400">نوع الإجازة</th>
                        <th className="p-2 border-l border-slate-400">الفترة</th>
                        <th className="p-2 border-l border-slate-400">الأيام</th>
                        <th className="p-2 border-l border-slate-400">تصنيف السجل</th>
                        <th className="p-2">البيان/السبب</th>
                      </tr>
                    </thead>
                    <tbody>
                      {companyLeaves.filter(l => l.employeeId === selectedHistoryEmployee.id).map((lev, i) => (
                        <tr key={lev.id} className="border-b border-slate-300">
                          <td className="p-2 border-l border-slate-300 font-mono">{lev.historicalYear || lev.startDate}</td>
                          <td className="p-2 border-l border-slate-300">{lev.leaveType}</td>
                          <td className="p-2 border-l border-slate-300 font-mono">{lev.startDate} إلى {lev.endDate}</td>
                          <td className="p-2 border-l border-slate-300 font-bold font-mono">{lev.totalDays}</td>
                          <td className="p-2 border-l border-slate-300">{lev.isHistorical ? 'أرشيفي قديم 📜' : 'حالي معتمد 🟢'}</td>
                          <td className="p-2">{lev.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-end pt-8 border-t border-slate-300 text-xs">
                  <div className="text-center">
                    <p className="font-bold text-slate-700">توقيع أخصائي شؤون الموظفين</p>
                    <p className="text-[10px] text-slate-400 mt-6">....................................</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-slate-700">توقيع الموظف بالمصادقة</p>
                    <p className="text-[10px] text-slate-400 mt-6">....................................</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Historical Leaves Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-purple-50/50 border-b border-slate-200 flex items-center justify-between">
              <span className="font-bold text-slate-800 text-xs flex items-center gap-2">
                <History className="w-4 h-4 text-purple-700" />
                <span>سجل حركة الموظف والأرشيف التاريخي ({historicalLeavesList.length} سجل)</span>
              </span>
            </div>

            <table className="w-full text-right text-xs">
              <thead className="bg-purple-950 text-white font-bold">
                <tr>
                  <th className="p-3">السنة/التاريخ</th>
                  <th className="p-3">اسم الموظف</th>
                  <th className="p-3">نوع الإجازة</th>
                  <th className="p-3">من تاريخ</th>
                  <th className="p-3">إلى تاريخ</th>
                  <th className="p-3">الأيام</th>
                  <th className="p-3">نوع السجل</th>
                  <th className="p-3">السبب / الملاحظات التاريخية</th>
                  <th className="p-3 text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historicalLeavesList.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500">
                      <p className="font-bold mb-1">لا توجد سجلات تاريخية سابقة مسجلة لهذا الموظف</p>
                      <p className="text-[11px] text-slate-400 mb-3">يمكنك البدء بتسجيل الإجازات القديمة التي أخذها الموظف في السنوات السابقة لحفظها كأرشيف</p>
                      <button
                        onClick={() => {
                          setEditingLeave({
                            companyId: activeCompany?.id || 'comp-1',
                            employeeId: historyEmpIdFilter !== 'ALL' ? historyEmpIdFilter : undefined,
                            leaveType: 'ANNUAL',
                            isHistorical: true,
                            historicalYear: 2024,
                            startDate: '2024-08-01',
                            endDate: '2024-08-15',
                            totalDays: 15,
                            reason: 'إجازة سنوية تاريخية لعام 2024',
                          });
                        }}
                        className="bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold px-4 py-2 rounded shadow transition inline-flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>إضافة أول سجل إجازة تاريخية</span>
                      </button>
                    </td>
                  </tr>
                ) : (
                  historicalLeavesList.map((lev, idx) => {
                    const emp = employees.find(e => e.id === lev.employeeId);
                    return (
                      <tr key={lev.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                        <td className="p-3 font-mono font-bold text-purple-900">
                          {lev.historicalYear ? `عام ${lev.historicalYear}` : lev.startDate}
                        </td>
                        <td className="p-3 font-bold text-slate-900">{emp ? emp.fullNameAr : 'مجهول'}</td>
                        <td className="p-3">
                          <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[11px] font-bold">
                            {lev.leaveType === 'ANNUAL' ? '🌴 سنوية' : 
                             lev.leaveType === 'SICK' ? '🏥 مرضية' : 
                             lev.leaveType === 'MATERNITY' ? '👶 وضع' : 
                             'إجازة عامة'}
                          </span>
                        </td>
                        <td className="p-3 font-mono">{lev.startDate}</td>
                        <td className="p-3 font-mono">{lev.endDate}</td>
                        <td className="p-3 font-mono font-bold text-purple-700">{lev.totalDays} يوم</td>
                        <td className="p-3">
                          {lev.isHistorical ? (
                            <span className="bg-purple-100 text-purple-800 text-[10px] px-2 py-0.5 rounded-full font-bold border border-purple-200">
                              📜 أرشيف قديم
                            </span>
                          ) : (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                              🟢 طلب جاري
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-slate-600 truncate max-w-xs">{lev.reason}</td>
                        <td className="p-3 text-center">
                          <span className="text-emerald-700 font-bold text-[11px]">✓ موثق بالأرشيف</span>
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

      {/* ==================== SUB-TAB 5: PUBLIC HOLIDAYS ==================== */}
      {activeSubTab === 'HOLIDAYS' && (
        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 leading-relaxed shadow-sm">
            <h3 className="font-bold text-sm mb-1 text-amber-950 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-700" />
              <span>تقويم العطلات الرسمية 2026 (Public Holidays)</span>
            </h3>
            <p className="text-amber-800">
              قائمة العطلات الرسمية لدولة الكويت. الأيام الموضحة أدناه تعتبر أيام عطل مدفوعة الأجر ولا يتم خصمها من رصيد الإجازة السنوي للموظف (30 يوم).
              <br/>
              <strong>قاعدة التعويض:</strong> إذا صادفت عطلة رسمية يوم الجمعة (يوم الراحة)، يتم تعويضها تلقائياً بيوم عمل آخر (الخميس أو الأحد) كما هو موضح بالجدول.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#714B67] text-white font-bold">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">تاريخ العطلة (2026)</th>
                  <th className="p-3">اليوم</th>
                  <th className="p-3">المناسبة</th>
                  <th className="p-3 text-center">نوع العطلة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {getCompensatedHolidays2026().map((h, i) => {
                  const d = new Date(h.date);
                  const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
                  const isCompensated = h.name.includes('تعويضي');
                  return (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                      <td className="p-3 font-mono text-slate-400">{i + 1}</td>
                      <td className="p-3 font-mono font-bold text-slate-800">{h.date}</td>
                      <td className="p-3 font-bold text-slate-600">{days[d.getDay()]}</td>
                      <td className="p-3 font-bold text-[#714B67]">{h.name}</td>
                      <td className="p-3 text-center">
                        {isCompensated ? (
                          <span className="bg-purple-100 text-purple-800 text-[10px] px-2 py-0.5 rounded border border-purple-200 font-bold">
                            عطلة تعويضية 🔄
                          </span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded border border-emerald-200 font-bold">
                            عطلة رسمية 🟢
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== SUB-TAB 6: ALLOCATIONS ==================== */}
      {activeSubTab === 'ALLOCATIONS' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-600" />
                تخصيص أرصدة الإجازات (Odoo Allocations)
              </h3>
              <p className="text-xs text-slate-500 mt-1">تخصيص أرصدة الإجازات السنوية والمرحلة للموظفين، وتأثيرها المباشر على الجدول المحوري (Pivot View).</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button 
                onClick={() => {
                  let updatedCount = 0;
                  const newAllocations = [...allocations];
                  companyEmployees.forEach(emp => {
                    const earnedBalance = getAysedSmartLeaveBalance(emp.joinDate);
                    const result = calculateAysedLeaveBalance(emp.joinDate);
                    // update or create allocation matching get_aysed_smart_leave_balance rule
                    const existingIdx = newAllocations.findIndex(a => a.employeeId === emp.id && a.year === '2026' && a.leaveType === 'ANNUAL');
                    if (existingIdx >= 0) {
                      newAllocations[existingIdx] = {
                        ...newAllocations[existingIdx],
                        days: earnedBalance,
                        notes: `تطبيق get_aysed_smart_leave_balance (بداية الحساب: ${result.calculationStartDate} - ${result.totalMonths} شهر × 2.5)`,
                        status: 'APPROVED'
                      };
                    } else {
                      newAllocations.push({
                        id: Math.random().toString(),
                        employeeId: emp.id,
                        leaveType: 'ANNUAL',
                        year: '2026',
                        days: earnedBalance,
                        notes: `تطبيق get_aysed_smart_leave_balance (بداية الحساب: ${result.calculationStartDate} - ${result.totalMonths} شهر × 2.5)`,
                        status: 'APPROVED'
                      });
                    }
                    updatedCount++;
                  });
                  setAllocations(newAllocations);
                  alert(`تم تنفيذ دالة get_aysed_smart_leave_balance بنجاح وتحديث أرصدة (${updatedCount}) موظف وفقاً لقاعدة المقارنة بين يناير 2026 وتاريخ المباشرة.`);
                }}
                className="bg-purple-50 text-[#714B67] border border-purple-200 hover:bg-purple-100 font-bold px-3 py-2 rounded text-xs transition flex items-center gap-1.5"
                title="تطبيق معادلة: actual_start_date = max(hire_date, aysed_base_date) & correct_balance = months_count * 2.5"
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>حساب الرصيد الذكي بـ get_aysed_smart_leave_balance</span>
              </button>

              <button 
                onClick={() => {
                  const newAllocations = [...allocations];
                  let count = 0;
                  companyEmployees.forEach(emp => {
                    const exists = newAllocations.some(a => a.employeeId === emp.id && a.year === '2026' && a.leaveType === 'ANNUAL');
                    if (!exists) {
                      const accrualDetails = calculateLeaveAccrual2026Details(emp.joinDate);
                      newAllocations.push({
                        id: Math.random().toString(),
                        employeeId: emp.id,
                        leaveType: 'ANNUAL',
                        year: '2026',
                        days: accrualDetails.annualTotal2026,
                        notes: `رصيد سنوي 2026 (يبدأ من ${accrualDetails.startMonthName} - بواقع 2.5 يوم/شهر)`,
                        status: 'APPROVED'
                      });
                      count++;
                    }
                  });
                  setAllocations(newAllocations);
                  alert(`تم توليد وتخصيص أرصدة إجازات 2026 بنجاح لـ (${count}) موظف وفقاً لتاريخ تعيين كل موظف (من يناير للموظفين المعينين قبل 2026، أو من شهر التعيين للمعينين في 2026).`);
                }}
                className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-bold px-3 py-2 rounded text-xs transition"
              >
                توليد أرصدة 2026 السنوية
              </button>
              <button 
                onClick={() => setShowAllocationForm(true)}
                className="bg-[#714B67] hover:bg-purple-900 text-white font-bold px-4 py-2 rounded text-xs transition flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                تخصيص جديد
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#714B67] text-white font-bold">
                <tr>
                  <th className="p-3">الموظف</th>
                  <th className="p-3">نوع الإجازة</th>
                  <th className="p-3">السنة</th>
                  <th className="p-3">عدد الأيام</th>
                  <th className="p-3">البيان</th>
                  <th className="p-3 text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allocations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 font-bold">لا يوجد أرصدة مخصصة حتى الآن.</td>
                  </tr>
                ) : (
                  allocations.map((alloc, i) => {
                    const emp = companyEmployees.find(e => e.id === alloc.employeeId);
                    return (
                      <tr key={alloc.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                        <td className="p-3 font-bold text-slate-800">{emp ? emp.fullNameAr : 'مجهول'}</td>
                        <td className="p-3 text-slate-600">{alloc.leaveType === 'ANNUAL' ? 'إجازة سنوية' : alloc.leaveType}</td>
                        <td className="p-3 font-mono text-slate-500">{alloc.year}</td>
                        <td className="p-3 font-mono font-bold text-emerald-600">{alloc.days.toFixed(2)}</td>
                        <td className="p-3 text-slate-500">{alloc.notes}</td>
                        <td className="p-3 text-center">
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded border border-emerald-200 font-bold">
                            {alloc.status === 'APPROVED' ? 'Approved' : 'Draft'}
                          </span>
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

      {/* ODOO ALLOCATION FORM MODAL */}
      {showAllocationForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[2000] overflow-y-auto">
          <div className="bg-white rounded shadow-2xl max-w-2xl w-full flex flex-col text-sm border border-slate-200 overflow-hidden font-sans">
            <header className="p-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => {
                    if (!editingAllocation?.employeeId || !editingAllocation?.days) {
                      alert('الرجاء إدخال الموظف وعدد الأيام.');
                      return;
                    }
                    const newAlloc = {
                      id: Math.random().toString(),
                      employeeId: editingAllocation.employeeId,
                      leaveType: editingAllocation.leaveType || 'ANNUAL',
                      year: editingAllocation.year || '2026',
                      days: Number(editingAllocation.days),
                      notes: editingAllocation.notes || `تخصيص رصيد لعام ${editingAllocation.year || '2026'}`,
                      status: 'APPROVED' as const
                    };
                    setAllocations([...allocations, newAlloc]);
                    setShowAllocationForm(false);
                    setEditingAllocation(null);
                  }}
                  className="bg-purple-800 hover:bg-purple-900 text-white font-bold px-4 py-2 rounded text-xs transition uppercase tracking-wide"
                >
                  تأكيد الرصيد (Confirm)
                </button>
                <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-[10px] font-bold border border-emerald-200 uppercase">
                  Draft
                </span>
              </div>
              <button onClick={() => { setShowAllocationForm(false); setEditingAllocation(null); }} className="text-slate-400 hover:text-slate-600 font-bold text-lg">×</button>
            </header>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-slate-700 font-bold mb-1 border-b-2 border-slate-100 pb-1">نوع الإجازة (Leave Type)</label>
                  <select
                    value={editingAllocation?.leaveType || 'ANNUAL'}
                    onChange={e => setEditingAllocation({ ...editingAllocation, leaveType: e.target.value })}
                    className="w-full border-b border-slate-300 p-1 outline-none bg-transparent font-medium"
                  >
                    <option value="ANNUAL">إجازة سنوية (Annual Leave)</option>
                    <option value="SICK">إجازة مرضية (Sick Leave)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1 border-b-2 border-slate-100 pb-1">المدة (Duration)</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      step="0.5"
                      placeholder="e.g. 30"
                      value={editingAllocation?.days || ''}
                      onChange={e => setEditingAllocation({ ...editingAllocation, days: Number(e.target.value) })}
                      className="w-24 border-b border-slate-300 p-1 outline-none bg-transparent font-mono text-lg text-emerald-700 font-bold text-center" 
                    />
                    <span className="text-slate-500 font-medium text-sm">أيام (Days)</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-slate-700 font-bold mb-1 border-b-2 border-slate-100 pb-1">الموظف (Employee)</label>
                  <select
                    value={editingAllocation?.employeeId || ''}
                    onChange={e => setEditingAllocation({ ...editingAllocation, employeeId: e.target.value })}
                    className="w-full border-b border-slate-300 p-1 outline-none bg-transparent font-medium"
                  >
                    <option value="">-- اختر الموظف --</option>
                    {companyEmployees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.fullNameAr}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1 border-b-2 border-slate-100 pb-1">الفترة الزمنية (Period)</label>
                  <div className="flex items-center gap-2">
                    <select
                      value={editingAllocation?.year || '2026'}
                      onChange={e => setEditingAllocation({ ...editingAllocation, year: e.target.value })}
                      className="border border-slate-300 rounded p-1 outline-none bg-white font-mono text-xs"
                    >
                      <option value="2024">2024</option>
                      <option value="2025">2025</option>
                      <option value="2026">2026</option>
                    </select>
                    <span className="text-slate-500 text-xs">01/01/{editingAllocation?.year || '2026'} - 31/12/{editingAllocation?.year || '2026'}</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1 border-b-2 border-slate-100 pb-1">ملاحظات (Notes)</label>
                <input 
                  type="text" 
                  value={editingAllocation?.notes || ''}
                  onChange={e => setEditingAllocation({ ...editingAllocation, notes: e.target.value })}
                  placeholder="رصيد مرحل من عام سابق..."
                  className="w-full border-b border-slate-300 p-1 outline-none bg-transparent font-medium" 
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT LEAVE MODAL - ODOO ENTERPRISE FORM (hr.leave.form.aysed.clean) */}
      {editingLeave && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-[#f8fafc] rounded-xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-slate-300 overflow-hidden font-sans">
            
            {/* 1. ODOO FORM HEADER (<header>) */}
            <div className="bg-slate-100/90 border-b border-slate-300 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
              
              {/* HEADER ACTION BUTTONS */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Save / Close Dialog */}
                <button
                  type="button"
                  onClick={() => setEditingLeave(null)}
                  className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold px-3 py-1.5 rounded text-xs transition cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <X className="w-3.5 h-3.5 text-slate-500" />
                  <span>إلغاء / إغلاق</span>
                </button>

                {/* Draft action: Save draft */}
                {(!editingLeave.status || editingLeave.status === 'DRAFT') && !editingLeave.isHistorical && (
                  <button
                    type="button"
                    onClick={() => handleSave('DRAFT')}
                    className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold px-3.5 py-1.5 rounded text-xs transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    title="حفظ المسودة بدون إرسال"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-600" />
                    <span>حفظ كمسودة (Save Draft)</span>
                  </button>
                )}

                {/* Confirm action: action_confirm (إرسال للطلبات) */}
                {(!editingLeave.status || editingLeave.status === 'DRAFT') && !editingLeave.isHistorical && (
                  <button
                    type="button"
                    onClick={() => handleSave('SUBMITTED')}
                    className="bg-[#714B67] hover:bg-[#5a3b52] text-white font-bold px-4 py-1.5 rounded text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                    title="إرسال الطلب للاعتماد"
                  >
                    <Send className="w-3.5 h-3.5 text-amber-300" />
                    <span>إرسال للطلبات (Confirm)</span>
                  </button>
                )}

                {/* Approve action: action_approve (اعتماد المدير / Sayed) */}
                {!editingLeave.isHistorical && (
                  <button
                    type="button"
                    onClick={() => handleSave('APPROVED', true)}
                    className="bg-[#714B67] hover:bg-[#5a3b52] text-white font-bold px-4 py-1.5 rounded text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                    title="اعتماد المدير المباشر والمدير العام Sayed (oe_highlight)"
                  >
                    <ShieldCheck className="w-4 h-4 text-amber-300" />
                    <span>اعتماد المدير (Sayed Approve)</span>
                  </button>
                )}

                {/* Reject action: Reject leave if submitted */}
                {editingLeave.status === 'SUBMITTED' && !editingLeave.isHistorical && (
                  <button
                    type="button"
                    onClick={() => handleSave('REJECTED')}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold px-3 py-1.5 rounded text-xs transition cursor-pointer flex items-center gap-1"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>رفض الطلب (Refuse)</span>
                  </button>
                )}

                {/* Odoo action_refuse: Cancel & Refund for approved leave */}
                {(editingLeave.status === 'APPROVED' || (editingLeave as any).status === 'VALIDATED') && !editingLeave.isHistorical && (
                  <button
                    type="button"
                    onClick={() => {
                      if (editingLeave.id) {
                        handleActionRefuse(editingLeave as LeaveRequest);
                        setEditingLeave(null);
                      }
                    }}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold px-3.5 py-1.5 rounded text-xs transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    title="إلغاء ورفض الإجازة ورد الأيام تلقائياً إلى رصيد الموظف (action_refuse)"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                    <span>إلغاء ورفض ورد الرصيد (action_refuse)</span>
                  </button>
                )}

                {/* Odoo unlink: Delete with protection */}
                {editingLeave.id && (
                  <button
                    type="button"
                    onClick={() => {
                      handleUnlink(editingLeave as LeaveRequest);
                    }}
                    className="bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-300 hover:border-rose-300 font-bold px-3 py-1.5 rounded text-xs transition cursor-pointer flex items-center gap-1 shadow-2xs"
                    title="حذف السجل نهائياً (unlink)"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    <span>حذف (Unlink)</span>
                  </button>
                )}

                {/* Historical save button */}
                {editingLeave.isHistorical && (
                  <button
                    type="button"
                    onClick={() => handleSave('APPROVED')}
                    className="bg-purple-800 hover:bg-purple-900 text-white font-bold px-4 py-1.5 rounded text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <Save className="w-3.5 h-3.5 text-amber-300" />
                    <span>حفظ السجل الأرشيفي التاريخي</span>
                  </button>
                )}
              </div>

              {/* ODOO STATUSBAR WIDGET (<field name="state" widget="statusbar"/>) */}
              <div className="flex items-center bg-white border border-slate-300 rounded overflow-hidden text-[11px] font-bold shadow-2xs">
                <span
                  className={`px-3 py-1.5 flex items-center gap-1 border-l border-slate-200 transition ${
                    !editingLeave.status || editingLeave.status === 'DRAFT'
                      ? 'bg-[#714B67] text-white font-bold'
                      : 'text-slate-500 bg-slate-50'
                  }`}
                >
                  <span>مسودة</span>
                  <span className="font-mono text-[9px] opacity-75">(Draft)</span>
                </span>
                
                <span
                  className={`px-3 py-1.5 flex items-center gap-1 border-l border-slate-200 transition ${
                    editingLeave.status === 'SUBMITTED'
                      ? 'bg-[#714B67] text-white font-bold'
                      : 'text-slate-500 bg-slate-50'
                  }`}
                >
                  <span>بانتظار الاعتماد</span>
                  <span className="font-mono text-[9px] opacity-75">(Confirm)</span>
                </span>

                <span
                  className={`px-3 py-1.5 flex items-center gap-1 transition ${
                    editingLeave.status === 'APPROVED' || editingLeave.status === 'VALIDATED'
                      ? 'bg-emerald-700 text-white font-bold'
                      : editingLeave.status === 'REJECTED' || editingLeave.status === 'REFUSED'
                      ? 'bg-rose-700 text-white font-bold'
                      : 'text-slate-500 bg-slate-50'
                  }`}
                >
                  {editingLeave.status === 'REJECTED' || editingLeave.status === 'REFUSED' ? (
                    <>
                      <span>مرفوض</span>
                      <span className="font-mono text-[9px] opacity-75">(Refused)</span>
                    </>
                  ) : (
                    <>
                      <span>معتمد</span>
                      <span className="font-mono text-[9px] opacity-75">(Validated)</span>
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* 2. ODOO FORM SHEET (<sheet>) */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-[#f8fafc]">
              <div className="bg-white border border-slate-200 rounded-lg p-5 sm:p-6 shadow-sm space-y-6">
                
                {/* OE_TITLE: EMPLOYEE SELECTION & TITLE */}
                <div className="border-b border-slate-200 pb-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      طلب إجازة موظف (hr.leave)
                    </span>
                    {/* Toggle Historical Leave */}
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2.5 py-1 rounded transition select-none">
                      <History className="w-3.5 h-3.5 text-purple-700" />
                      <span>إجازة أرشيفية سابقة (Historical)</span>
                      <input
                        type="checkbox"
                        checked={editingLeave.isHistorical || false}
                        onChange={(e) => setEditingLeave({ 
                          ...editingLeave, 
                          isHistorical: e.target.checked,
                          status: e.target.checked ? 'APPROVED' : 'SUBMITTED',
                          historicalYear: e.target.checked ? (editingLeave.historicalYear || 2025) : undefined
                        })}
                        className="w-4 h-4 text-purple-700 rounded accent-purple-700"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    <div className="md:col-span-8">
                      <label className="block text-xs font-bold text-slate-600 mb-1">الموظف / Employee *</label>
                      <select
                        value={editingLeave.employeeId || ''}
                        onChange={(e) => setEditingLeave({ ...editingLeave, employeeId: e.target.value })}
                        className="w-full border-b-2 border-slate-300 hover:border-[#714B67] focus:border-[#714B67] text-lg sm:text-xl font-bold text-slate-800 bg-transparent py-1 px-1 outline-none transition"
                      >
                        <option value="">-- اختر الموظف (Select Employee) --</option>
                        {companyEmployees.map(emp => (
                          <option key={emp.id} value={emp.id}>
                            {emp.fullNameAr} — {emp.jobTitle} ({emp.department || 'عام'})
                          </option>
                        ))}
                      </select>
                    </div>

                    {editingLeave.isHistorical && (
                      <div className="md:col-span-4 bg-purple-50 p-2.5 rounded border border-purple-200">
                        <label className="block text-[11px] font-bold text-purple-900 mb-1">السنة الأرشيفية</label>
                        <select
                          value={editingLeave.historicalYear || 2025}
                          onChange={(e) => setEditingLeave({ ...editingLeave, historicalYear: parseInt(e.target.value) || 2025 })}
                          className="w-full border border-purple-300 rounded p-1.5 outline-none font-bold text-purple-900 bg-white text-xs"
                        >
                          <option value={2025}>عام 2025</option>
                          <option value={2024}>عام 2024</option>
                          <option value={2023}>عام 2023</option>
                          <option value={2022}>عام 2022</option>
                          <option value={2021}>عام 2021 وقبل</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Active Employee Quick Info Bar */}
                  {modalSelectedEmployee && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs text-slate-600">
                      <span className="flex items-center gap-1 font-medium">
                        <User className="w-3.5 h-3.5 text-[#714B67]" />
                        <span>الرقم المدني: <strong className="font-mono text-slate-800">{modalSelectedEmployee.civilId}</strong></span>
                      </span>
                      <span className="flex items-center gap-1 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-[#714B67]" />
                        <span>تاريخ التعيين: <strong className="font-mono text-slate-800">{modalSelectedEmployee.joiningDate}</strong></span>
                      </span>
                      <span className="flex items-center gap-1 font-medium">
                        <Clock className="w-3.5 h-3.5 text-[#714B67]" />
                        <span>الرصيد السنوي المستحق: 
                          <strong className="font-mono text-[#714B67] mr-1">
                            {(() => {
                              const empData = modalSelectedEmployee;
                              const accrued = get_aysed_official_balance(empData);
                              const totalAlloc = (empData.openingLeaveBalance ?? empData.carriedOverLeave2025 ?? 0) + accrued;
                              const taken = companyLeaves.filter(l => l.employeeId === empData.id && l.status === 'APPROVED' && l.leaveType === 'ANNUAL').reduce((s, l) => s + l.totalDays, 0);
                              return `${Math.max(0, totalAlloc - taken).toFixed(1)} يوم`;
                            })()}
                          </strong>
                        </span>
                      </span>
                    </div>
                  )}
                </div>

                {/* 2-COLUMN GROUP LAYOUT (<group>) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  
                  {/* GROUP 1: تفاصيل الفترة (<group string="تفاصيل الفترة">) */}
                  <div className="space-y-4 bg-slate-50/60 p-4 rounded-lg border border-slate-200">
                    <div className="border-b border-slate-200 pb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-800">
                      <Calendar className="w-4 h-4 text-[#714B67]" />
                      <span>تفاصيل الفترة (Period Details)</span>
                    </div>

                    {/* holiday_status_id (نوع الإجازة) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">نوع الإجازة (Leave Type) *</label>
                      <select
                        value={editingLeave.leaveType || 'ANNUAL'}
                        onChange={(e) => {
                          const type = e.target.value as any;
                          let updated = { ...editingLeave, leaveType: type };
                          if (type === 'MATERNITY') {
                            updated.reason = 'إجازة وضع مدفوعة الأجر بالكامل (المادة 24 من قانون العمل الكويتي - 70 يوماً)';
                          } else if (type === 'UNPAID') {
                            if (!updated.reason) {
                              updated.reason = 'إجازة بدون راتب (توقف الاستحقاق واستبعاد من مدة خدمة المكافأة)';
                            }
                          }
                          setEditingLeave(updated);
                        }}
                        className="w-full border border-slate-300 rounded p-2 text-xs font-bold text-slate-800 bg-white outline-none focus:border-[#714B67]"
                      >
                        <option value="ANNUAL">🌴 إجازة سنوية اعتيادية (Annual Leave)</option>
                        <option value="HOURLY_PERMISSION">⏱️ طلب استئذان ساعات (Hourly Time Off)</option>
                        <option value="COMPENSATORY">🎁 إجازة تعويضية بدل عطلة (Compensatory)</option>
                        <option value="SICK">🏥 إجازة مرضية معتمدة (Sick Leave)</option>
                        <option value="MATERNITY">👶 إجازة وضع - 70 يوماً (Maternity Leave)</option>
                        <option value="UNPAID">🚫 إجازة بدون راتب (Unpaid Leave)</option>
                        <option value="HAJJ">🕋 إجازة حج مدفوعة (Hajj Leave)</option>
                        <option value="COMPASSIONATE">🖤 إجازة حداد وتأبين (Compassionate)</option>
                      </select>
                    </div>

                    {/* request_date_from & request_date_to (<div class="o_row">) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">الفترة الزمنية (Period) *</label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="block text-[10px] text-slate-500 mb-0.5">من تاريخ:</span>
                          <input
                            type="date"
                            value={editingLeave.startDate || ''}
                            onChange={(e) => {
                              const newStart = e.target.value;
                              let updated = { ...editingLeave, startDate: newStart };
                              if (newStart && updated.endDate) {
                                const start = new Date(newStart);
                                const end = new Date(updated.endDate);
                                const diffTime = Math.max(0, end.getTime() - start.getTime());
                                const roughDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                                if (updated.leaveType === 'ANNUAL' || updated.leaveType === 'SICK') {
                                  const { actualDays } = calculateActualLeaveDays(newStart, updated.endDate);
                                  updated.totalDays = actualDays;
                                } else {
                                  updated.totalDays = Math.max(1, roughDays);
                                }
                              }
                              setEditingLeave(updated);
                            }}
                            className="w-full border border-slate-300 rounded p-1.5 text-xs font-mono bg-white outline-none focus:border-[#714B67]"
                          />
                        </div>
                        <div>
                          <span className="block text-[10px] text-slate-500 mb-0.5">إلى تاريخ:</span>
                          <input
                            type="date"
                            value={editingLeave.endDate || ''}
                            onChange={(e) => {
                              const newEnd = e.target.value;
                              let updated = { ...editingLeave, endDate: newEnd };
                              if (updated.startDate && newEnd) {
                                const start = new Date(updated.startDate);
                                const end = new Date(newEnd);
                                const diffTime = Math.max(0, end.getTime() - start.getTime());
                                const roughDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                                if (updated.leaveType === 'ANNUAL' || updated.leaveType === 'SICK') {
                                  const { actualDays } = calculateActualLeaveDays(updated.startDate, newEnd);
                                  updated.totalDays = actualDays;
                                } else {
                                  updated.totalDays = Math.max(1, roughDays);
                                }
                              }
                              setEditingLeave(updated);
                            }}
                            className="w-full border border-slate-300 rounded p-1.5 text-xs font-mono bg-white outline-none focus:border-[#714B67]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* number_of_days (إجمالي الأيام) */}
                    <div className="bg-white p-3 rounded border border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-700 block">إجمالي عدد الأيام المحسوبة:</span>
                        <span className="text-[10px] text-slate-500">
                          {editingLeave.leaveType === 'ANNUAL' ? 'يتم استبعاد أيام الجمعة والعطلات الرسمية تلقائياً' : 'إجمالي الأيام التقويمية'}
                        </span>
                      </div>
                      <div className="text-xl font-black font-mono text-[#714B67] bg-purple-50 px-3 py-1 rounded border border-purple-200">
                        {editingLeave.totalDays || 1} <span className="text-xs font-bold">يوم</span>
                      </div>
                    </div>
                  </div>

                  {/* GROUP 2: الحسبة المالية (<group string="الحسبة المالية">) */}
                  <div className="space-y-4 bg-slate-50/60 p-4 rounded-lg border border-slate-200">
                    <div className="border-b border-slate-200 pb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-800">
                      <Scale className="w-4 h-4 text-amber-600" />
                      <span>الحسبة المالية والأثر القانوني (Financial & Legal)</span>
                    </div>

                    {/* unpaid_days (أيام بدون راتب - decoration-danger="unpaid_days > 0") */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-700">
                          أيام بدون راتب (Unpaid Days):
                        </label>
                        {(editingLeave.excessDays || 0) > 0 || editingLeave.leaveType === 'UNPAID' ? (
                          <span className="bg-rose-100 text-rose-900 border border-rose-300 text-[10px] font-bold px-2 py-0.5 rounded font-mono">
                            ⚠️ decoration-danger: حسم من نهاية الخدمة
                          </span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded font-mono">
                            0 يوم بدون راتب (مدفوعة)
                          </span>
                        )}
                      </div>

                      {/* Slider / Split when Annual Leave or Excess */}
                      {editingLeave.leaveType === 'ANNUAL' && (
                        <div className="bg-white p-3 rounded border border-slate-200 space-y-2">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-emerald-800">
                              مدفوعة: {editingLeave.paidDays !== undefined ? editingLeave.paidDays : editingLeave.totalDays} يوم
                            </span>
                            <span className="text-rose-700 font-bold">
                              بدون راتب: {editingLeave.excessDays || 0} يوم
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={editingLeave.totalDays || 1}
                            value={editingLeave.excessDays || 0}
                            onChange={(e) => {
                              const excess = parseInt(e.target.value) || 0;
                              const total = editingLeave.totalDays || 1;
                              const paid = Math.max(0, total - excess);
                              setEditingLeave({ ...editingLeave, paidDays: paid, excessDays: excess });
                            }}
                            className="w-full accent-[#714B67] cursor-pointer"
                          />
                          <p className="text-[10px] text-slate-500 leading-tight">
                            الأيام بدون راتب يتم ترحيلها تلقائياً لحسمها من مدة الخدمة في موديول نهاية الخدمة وفق المادة 51.
                          </p>
                        </div>
                      )}

                      {editingLeave.leaveType === 'UNPAID' && (
                        <div className="bg-rose-50 border border-rose-300 p-2.5 rounded text-xs text-rose-900 font-bold">
                          🚫 إجازة غير مدفوعة الأجر بالكامل ({editingLeave.totalDays || 1} يوماً).
                          <span className="block text-[11px] font-normal text-rose-800 mt-1">
                            تُخصم من راتب الشهر وتُستبعد من حساب مكافأة نهاية الخدمة.
                          </span>
                        </div>
                      )}
                    </div>

                    {/* notes (ملاحظات / سبب الإجازة) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">سبب الإجازة / ملاحظات (Notes)</label>
                      <textarea
                        rows={3}
                        value={editingLeave.reason || ''}
                        onChange={(e) => setEditingLeave({ ...editingLeave, reason: e.target.value })}
                        placeholder="سبب الإجازة..."
                        className="w-full border border-slate-300 rounded p-2 text-xs bg-white outline-none focus:border-[#714B67]"
                      />
                    </div>

                    {/* Manager Override Checkbox */}
                    {(!editingLeave.isHistorical && ((editingLeave.totalDays || 0) > 30 || (editingLeave.excessDays && editingLeave.excessDays > 0) || editingLeave.leaveType === 'UNPAID')) && (
                      <label className="flex items-center gap-2 p-2.5 bg-purple-50 border border-purple-300 rounded text-xs font-bold text-purple-950 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!editingLeave.managerOverride}
                          onChange={(e) => setEditingLeave({
                            ...editingLeave,
                            managerOverride: e.target.checked,
                            managerOverrideNote: e.target.checked ? 'تم اعتماد تجاوز الرصيد استثنائياً بصلاحية المدير العام Sayed' : undefined
                          })}
                          className="w-4 h-4 rounded text-purple-700 accent-purple-700"
                        />
                        <span>موافقة المدير (Sayed) على اعتماد الإجازة وتجاوز الرصيد الحالي</span>
                      </label>
                    )}
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

      {/* ODOO USERERROR DIALOG: UNLINK VALIDATION PROTECTION (hr.leave.unlink) */}
      {userErrorModal?.open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[2100]">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-rose-200 overflow-hidden font-sans">
            <div className="bg-rose-50 border-b border-rose-100 p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 shadow-inner">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">تنبيه النظام (Odoo UserError)</h3>
                <p className="text-[11px] text-rose-600 font-medium font-mono">hr.leave.unlink protection</p>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-slate-700 leading-relaxed font-bold">
                {userErrorModal.message}
              </p>
              {userErrorModal.leave && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600 space-y-1">
                  <div className="flex justify-between border-b border-slate-200 pb-1">
                    <span className="text-slate-500">الموظف:</span>
                    <span className="font-bold text-slate-800">
                      {companyEmployees.find(e => e.id === userErrorModal.leave?.employeeId)?.fullNameAr || 'مجهول'}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 py-1">
                    <span className="text-slate-500">نوع الإجازة:</span>
                    <span className="font-bold text-slate-700">
                      {userErrorModal.leave.leaveType === 'ANNUAL' ? 'إجازة سنوية' : userErrorModal.leave.leaveType}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-500">الأيام المخصومة من الرصيد:</span>
                    <span className="font-bold font-mono text-rose-600">
                      {userErrorModal.leave.totalDays} يوم
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="bg-slate-50 border-t border-slate-200 p-3.5 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setUserErrorModal(null)}
                className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-xs font-bold transition cursor-pointer"
              >
                إغلاق (Close)
              </button>
              {userErrorModal.leave && (
                <button
                  type="button"
                  onClick={() => {
                    const lv = userErrorModal.leave!;
                    setUserErrorModal(null);
                    handleActionRefuse(lv);
                  }}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                  title="إلغاء الإجازة ورد الأيام لرصيد الموظف"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>إلغاء ورفض الإجازة الآن لرد الرصيد</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
