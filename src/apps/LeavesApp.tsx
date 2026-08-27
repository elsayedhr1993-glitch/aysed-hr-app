import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { 
  LeaveRequest, Employee, Company, ViewMode, Contract, AttendanceRecord, HrLeaveAllocation 
} from '../types';
import { 
  calculateActualLeaveDays, 
  getCompensatedHolidays2026,
  cron_aysed_monthly_accrual,
  getCarriedOverBalance,
  getGlobalCompensatoryDays,
  formatEmployeeNationalityAndResidency
} from '../utils/kuwaitLaw';
import { 
  LeaveService, 
  getAccrualMonthNameAr, 
  getAccrualMonthKey,
  LEAVE_ACCRUAL_RATE_PER_MONTH,
  calculateLeaveOverdraftSplit,
  buildEmployeeBaselineAllocations,
  computeFifoLeaveAllocations,
  FifoAllocationResult,
  generateLeaveAttendanceRecords
} from '../services/leaveService';
import { MANARA_STORAGE_KEYS, getPersistentData, setPersistentData } from '../utils/persistentStorage';
import { LeaveSettlementCalculator } from '../components/LeaveSettlementCalculator';
import { useLeaveWorkflow } from '../hooks/useLeaveWorkflow';
import { OfficialLeaveModal } from '../components/OfficialLeaveModal';
import { 
  Calendar, Plus, CheckCircle2, Clock, 
  Calculator, FileText, Search, 
  History, Printer, Trash2, DollarSign,
  Filter, X, Info, AlertCircle, RefreshCw, Layers, Award,
  Sparkles, ChevronRight, UserCheck, ShieldCheck, Edit3, Lock, Gift
} from 'lucide-react';

interface LeavesAppProps {
  autoOpenNewLeaveForEmpId?: string | null;
  onClearAutoOpenLeave?: () => void;
  leaves: LeaveRequest[];
  employees: Employee[];
  contracts?: Contract[];
  attendance?: AttendanceRecord[];
  activeCompany: Company;
  viewMode?: ViewMode;
  searchTerm?: string;
  filterTab?: string;
  onSaveLeave: (leave: LeaveRequest) => void;
  onUpdateLeaveStatus: (leaveId: string, status: 'APPROVED' | 'REJECTED' | 'PENDING_MANAGER' | 'PENDING_HR' | 'DRAFT', note?: string) => void;
  onDeleteLeave?: (leaveId: string, force?: boolean) => Promise<boolean> | boolean | void;
  onSaveEmployee?: (emp: Employee) => void;
  initialEmployeeId?: string;
  onOpenNotificationModal?: (emp: Employee, trigger?: any, data?: any) => void;
  onNavigateToApp?: (app: any) => void;
}

export const LeavesApp: React.FC<LeavesAppProps> = ({  autoOpenNewLeaveForEmpId,
  onClearAutoOpenLeave,
  leaves,
  employees,
  contracts = [],
  attendance = [],
  activeCompany,
  searchTerm = '',
  filterTab,
  onSaveLeave,
  onUpdateLeaveStatus,
  onDeleteLeave,
  onSaveEmployee,
  initialEmployeeId = 'ALL',
}) => {
  // Navigation & Sub-Tabs
  const [activeSubTab, setActiveSubTab] = useState<'REQUESTS' | 'ALLOCATIONS' | 'BALANCES' | 'HISTORY_LOG' | 'SETTLEMENT' | 'HOLIDAYS'>(
    filterTab === 'BALANCES' ? 'BALANCES' : filterTab === 'HISTORY_LOG' ? 'HISTORY_LOG' : filterTab === 'SETTLEMENT' ? 'SETTLEMENT' : 'REQUESTS'
  );

  useEffect(() => {
    if (filterTab === 'BALANCES') setActiveSubTab('BALANCES');
    else if (filterTab === 'HISTORY_LOG') setActiveSubTab('HISTORY_LOG');
    else if (filterTab === 'SETTLEMENT') setActiveSubTab('SETTLEMENT');
  }, [filterTab]);

  // HrLeaveAllocation persistent state
  const [allocations, setAllocations] = useState<HrLeaveAllocation[]>(() => {
    return getPersistentData<HrLeaveAllocation[]>(MANARA_STORAGE_KEYS.LEAVE_ALLOCATIONS, []);
  });

  // Reload allocations on external update
  useEffect(() => {
    const handleReload = () => {
      setAllocations(getPersistentData<HrLeaveAllocation[]>(MANARA_STORAGE_KEYS.LEAVE_ALLOCATIONS, []));
    };
    window.addEventListener('manara_allocations_updated', handleReload);
    window.addEventListener('storage', handleReload);
    return () => {
      window.removeEventListener('manara_allocations_updated', handleReload);
      window.removeEventListener('storage', handleReload);
    };
  }, []);

  // Save allocations to persistent storage
  useEffect(() => {
    setPersistentData(MANARA_STORAGE_KEYS.LEAVE_ALLOCATIONS, allocations);
  }, [allocations]);

  // Form modals state
  const [editingLeave, setEditingLeave] = useState<Partial<LeaveRequest> | null>(null);
  useEffect(() => {
    if (autoOpenNewLeaveForEmpId) {
      setEditingLeave({
        status: 'DRAFT',
        startDate: new Date().toISOString().split('T')[0],
        employeeId: autoOpenNewLeaveForEmpId
      });
      if (onClearAutoOpenLeave) onClearAutoOpenLeave();
    }
  }, [autoOpenNewLeaveForEmpId, onClearAutoOpenLeave]);

  const [editingAllocation, setEditingAllocation] = useState<Partial<HrLeaveAllocation> | null>(null);
  const [selectedFifoEmployee, setSelectedFifoEmployee] = useState<Employee | null>(null);
  const [selectedAccrualHistoryEmp, setSelectedAccrualHistoryEmp] = useState<Employee | null>(null);
  const [userErrorModal, setUserErrorModal] = useState<{ open: boolean; message: string; leave?: LeaveRequest } | null>(null);

  const handleSaveLeaveRequest = (req: Partial<LeaveRequest>) => {
    const isNew = !req.id;
    const newLeave: LeaveRequest = {
      id: isNew ? 'REQ-' + Date.now().toString() : req.id!,
      employeeId: req.employeeId!,
      companyId: activeCompany?.id || '',
      leaveType: req.leaveType || 'ANNUAL',
      startDate: req.startDate!,
      endDate: req.endDate!,
      totalDays: req.totalDays || 0,
      paidDays: req.paidDays,
      unpaidDays: req.unpaidDays,
      excessDays: req.excessDays || 0,
      totalAvailableBalance: req.totalAvailableBalance,
      dailyWage: req.dailyWage,
      leaveAmount: req.leaveAmount,
      reason: req.reason || '',
      status: req.status || 'DRAFT',
      createdAt: (req as any).createdAt || new Date().toISOString(),
      isHistorical: false,
      bereavementDegree: req.bereavementDegree,
      bereavementRelation: req.bereavementRelation,
      bereavementStatutoryDays: req.bereavementStatutoryDays,
      isSplitBereavement: req.isSplitBereavement,
      annualDeductedDays: req.annualDeductedDays
    };
    onSaveLeave(newLeave);
    setEditingLeave(null);
  };

  const { calculateLeaveDays, submitRequest, approveByManager, approveByHR, rejectRequest } = useLeaveWorkflow();

  // Filters & Search
  const [localSearch, setLocalSearch] = useState<string>('');
  const [historyEmpIdFilter, setHistoryEmpIdFilter] = useState<string>('ALL');
  const [settlementEmpId, setSettlementEmpId] = useState<string | undefined>();
  const [yearFilter, setYearFilter] = useState<string>('ALL');
  const [employeeFilter, setEmployeeFilter] = useState<string>(initialEmployeeId);
  const [stateFilter, setStateFilter] = useState<string>('ALL');
  const [allocationTypeFilter, setAllocationTypeFilter] = useState<string>('ALL');
  const [isProcessingAccrual, setIsProcessingAccrual] = useState(false);

  useEffect(() => {
    if (initialEmployeeId && initialEmployeeId !== 'ALL') {
      setEmployeeFilter(initialEmployeeId);
    }
  }, [initialEmployeeId]);

  const rawCompanyEmployees = (employees || []).filter(e => !e.isDeleted && (!activeCompany || activeCompany.id === 'comp-1' || e.companyId === activeCompany.id || !e.companyId));
  const companyEmployees = rawCompanyEmployees.length > 0 ? rawCompanyEmployees : (employees || []).filter(e => !e.isDeleted);
  const companyLeaves = (leaves || []).filter(l => !activeCompany || activeCompany.id === 'comp-1' || l.companyId === activeCompany.id || !l.companyId || l.companyId === 'comp-1');
  const activeSearchTerm = localSearch || searchTerm;

  // Ensure baseline allocations exist for all active employees and clean up any duplicates
  useEffect(() => {
    if (companyEmployees.length > 0) {
      let hasChange = false;
      let updatedAllocations = [...allocations];

      // 1. Clean up duplicate compensatory allocations in state and localStorage
      companyEmployees.forEach(emp => {
        const compDays = getGlobalCompensatoryDays(emp);
        const empCompAllocs = updatedAllocations.filter(
          a => (a.employeeId === emp.id || a.employeeId === emp.employeeCode) &&
               (a.allocationType === 'compensatory_off' || (a.allocationType as string) === 'compensatory' || a.id?.startsWith('alloc-comp') || a.name?.includes('تعويضي') || a.name?.includes('بديل') || a.name?.includes('عطلة'))
        );

        if (compDays <= 0) {
          if (empCompAllocs.length > 0) {
            updatedAllocations = updatedAllocations.filter(
              a => !( (a.employeeId === emp.id || a.employeeId === emp.employeeCode) &&
                      (a.allocationType === 'compensatory_off' || (a.allocationType as string) === 'compensatory' || a.id?.startsWith('alloc-comp') || a.name?.includes('تعويضي') || a.name?.includes('بديل') || a.name?.includes('عطلة')) )
            );
            hasChange = true;
          }
        } else if (empCompAllocs.length > 1) {
          // Keep only the first valid one and normalize its days to compDays
          const primary = { ...empCompAllocs[0], numberOfDays: compDays, remainingDays: compDays };
          updatedAllocations = updatedAllocations.filter(
            a => !( (a.employeeId === emp.id || a.employeeId === emp.employeeCode) &&
                    (a.allocationType === 'compensatory_off' || (a.allocationType as string) === 'compensatory' || a.id?.startsWith('alloc-comp') || a.name?.includes('تعويضي') || a.name?.includes('بديل') || a.name?.includes('عطلة')) )
          );
          updatedAllocations.push(primary);
          hasChange = true;
        } else if (empCompAllocs.length === 1 && empCompAllocs[0].numberOfDays !== compDays) {
          const idx = updatedAllocations.findIndex(a => a.id === empCompAllocs[0].id);
          if (idx >= 0) {
            updatedAllocations[idx] = {
              ...updatedAllocations[idx],
              numberOfDays: compDays,
              remainingDays: Math.max(0, compDays - (updatedAllocations[idx].consumedDays || 0))
            };
            hasChange = true;
          }
        }
      });

      // 2. Add regular opening balance if missing
      companyEmployees.forEach(emp => {
        const openingVal = getCarriedOverBalance(emp);
        const hasOpening = updatedAllocations.some(
          a => a.employeeId === emp.id && a.allocationType === 'regular' && (a.id.includes('2025') || a.name?.includes('2025'))
        );

        if (!hasOpening && openingVal > 0) {
          updatedAllocations.unshift({
            id: `alloc-open-${emp.id}-2025`,
            name: 'رصيد إجازات مرحل من 2025 (Carried-Over Balance)',
            employeeId: emp.id,
            companyId: emp.companyId || activeCompany?.id || 'comp-1',
            leaveType: 'ANNUAL',
            allocationType: 'regular',
            numberOfDays: openingVal,
            consumedDays: 0,
            remainingDays: openingVal,
            dateFrom: '2025-12-31',
            state: 'validate',
            notes: 'رصيد مرحل معتمد من نهاية عام 2025',
            createdAt: '2026-01-01T00:00:00.000Z'
          });
          hasChange = true;
        }
      });

      if (hasChange) {
        setAllocations(updatedAllocations);
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('manara_leave_allocations_data', JSON.stringify(updatedAllocations));
        }
      }
    }
  }, [companyEmployees, allocations.length]);

  // Filtered leaves for requests tab
  const filteredLeaves = companyLeaves.filter(lev => {
    const emp = employees.find(e => e.id === lev.employeeId);
    const empName = emp ? emp.fullNameAr : '';
    const matchesSearch = empName.includes(activeSearchTerm) || (lev.reason && lev.reason.includes(activeSearchTerm));
    if (!matchesSearch) return false;

    if (yearFilter !== 'ALL') {
      const levYear = new Date(lev.startDate).getFullYear().toString();
      if (levYear !== yearFilter) return false;
    }
    if (employeeFilter !== 'ALL' && lev.employeeId !== employeeFilter) return false;
    if (stateFilter !== 'ALL' && lev.status !== stateFilter) return false;
    if (lev.isHistorical && activeSubTab === 'REQUESTS') return false;

    return true;
  });

  // Comprehensive active allocations for allocations tab (strictly deduplicated)
  const comprehensiveAllocations = useMemo(() => {
    const list: HrLeaveAllocation[] = [];
    const seenIds = new Set<string>();

    companyEmployees.forEach(emp => {
      const baseline = buildEmployeeBaselineAllocations(emp, allocations);
      baseline.forEach(b => {
        const key = b.id || `${b.employeeId}-${b.allocationType}-${b.dateFrom}`;
        if (!seenIds.has(key)) {
          seenIds.add(key);
          list.push(b);
        }
      });
    });

    // Also include any standalone allocations not covered by baseline
    allocations.forEach(a => {
      const key = a.id || `${a.employeeId}-${a.allocationType}-${a.dateFrom}`;
      if (!seenIds.has(key)) {
        seenIds.add(key);
        list.push(a);
      }
    });

    return list;
  }, [allocations, companyEmployees]);

  // Filtered allocations for allocations tab
  const filteredAllocations = comprehensiveAllocations.filter(a => {
    const emp = employees.find(e => e.id === a.employeeId || e.employeeCode === a.employeeId);
    const empName = emp ? emp.fullNameAr : '';
    const matchesSearch = (empName && empName.includes(activeSearchTerm)) || (a.name && a.name.includes(activeSearchTerm));
    if (!matchesSearch) return false;

    if (employeeFilter !== 'ALL' && a.employeeId !== employeeFilter) return false;
    if (allocationTypeFilter !== 'ALL' && a.allocationType !== allocationTypeFilter) return false;

    return true;
  });

  // Filtered employee balances for FIFO Balances tab
  const filteredEmployeeBalances = useMemo(() => {
    return companyEmployees
      .filter(emp => {
        if (!activeSearchTerm) return true;
        return emp.fullNameAr.includes(activeSearchTerm) || emp.employeeCode.includes(activeSearchTerm) || (emp.civilId && emp.civilId.includes(activeSearchTerm));
      })
      .map(emp => {
        const empAllocs = buildEmployeeBaselineAllocations(emp, allocations);
        const fifo = computeFifoLeaveAllocations(emp, empAllocs, companyLeaves);
        const totalOpening = fifo.allocations.filter(a => a.allocationType === 'regular').reduce((s, a) => s + (a.numberOfDays || 0), 0);
        const totalAccrued = fifo.allocations.filter(a => a.allocationType === 'accrual' && !a.name?.includes('تعويضي') && !a.name?.includes('بديل') && !a.name?.includes('عطلة')).reduce((s, a) => s + (a.numberOfDays || 0), 0);
        const totalCompensatory = getGlobalCompensatoryDays(emp);
        const totalTaken = fifo.totalConsumed;
        const netAvailable = Math.max(0, (totalOpening + totalAccrued + totalCompensatory) - totalTaken);
        return { emp, fifo, totalOpening, totalAccrued, totalCompensatory, totalTaken, netAvailable };
      });
  }, [companyEmployees, activeSearchTerm, allocations, companyLeaves]);

  const formatDaysDisplay = (days: number | undefined | null): string => {
    const val = Number(days || 0);
    if (val === 0) return '0 يوم';
    const formatted = val % 1 === 0 ? val.toString() : val.toFixed(1);
    return `${formatted} يوم`;
  };

  // Calculate high-level totals across company
  const aggregateMetrics = useMemo(() => {
    let totalOpening = 0;
    let totalAccrued = 0;
    let totalCompensatory = 0;
    let totalTaken = 0;

    companyEmployees.forEach(emp => {
      const empFifo = computeFifoLeaveAllocations(emp, buildEmployeeBaselineAllocations(emp, allocations), companyLeaves);
      const openingAllocs = empFifo.allocations.filter(a => a.allocationType === 'regular');
      const accrualAllocs = empFifo.allocations.filter(a => a.allocationType === 'accrual' && !a.name?.includes('تعويضي') && !a.name?.includes('بديل') && !a.name?.includes('عطلة'));
      
      const openingDays = openingAllocs.reduce((s, a) => s + (a.numberOfDays || 0), 0);
      const accrualDays = accrualAllocs.reduce((s, a) => s + (a.numberOfDays || 0), 0);
      const compDays = getGlobalCompensatoryDays(emp);

      totalOpening += openingDays;
      totalAccrued += accrualDays;
      totalCompensatory += compDays;
      totalTaken += empFifo.totalConsumed;
    });

    const totalAvailable = Math.max(0, (totalOpening + totalAccrued + totalCompensatory) - totalTaken);

    return {
      totalOpening,
      totalAccrued,
      totalCompensatory,
      totalTaken,
      totalAvailable
    };
  }, [companyEmployees, allocations, companyLeaves]);

  // Accrual status check for banner
  const accrualStatus = useMemo(() => {
    return LeaveService.checkAccrualStatus(companyEmployees);
  }, [companyEmployees]);

  // Handle Save Leave (with FIFO and Overdraft Split logic)
  const handleSave = async (statusOverride?: 'APPROVED' | 'SUBMITTED' | 'DRAFT' | 'REJECTED', isDirectManagerApproval?: boolean) => {
    if (!editingLeave) return;

    let targetEmpId = editingLeave.employeeId;
    if (!targetEmpId) {
      if (companyEmployees.length > 0) {
        targetEmpId = companyEmployees[0].id;
      } else {
        toast.error('يرجى اختيار الموظف أولاً');
        return;
      }
    }

    const targetEmp = employees.find(e => e.id === targetEmpId);
    if (!targetEmp) {
      toast.error('الموظف المحدد غير موجود');
      return;
    }

    const type = editingLeave.leaveType || 'ANNUAL';

    if (!editingLeave.startDate || !editingLeave.endDate) {
      toast.error('يرجى تحديد تواريخ بداية ونهاية الإجازة');
      return;
    }

    const isDirectApproved = isDirectManagerApproval || statusOverride === 'APPROVED';
    const isOverrideActive = isDirectApproved || editingLeave.managerOverride;

    let diffDays = 1;
    if (editingLeave.startDate && editingLeave.endDate) {
      const start = new Date(editingLeave.startDate);
      const end = new Date(editingLeave.endDate);
      const roughDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      
      if (type === 'ANNUAL' || type === 'SICK') {
        const { actualDays } = calculateActualLeaveDays(editingLeave.startDate, editingLeave.endDate);
        diffDays = actualDays > 0 ? actualDays : roughDays;
      } else {
        diffDays = roughDays;
      }
    }

    const isHist = editingLeave.isHistorical || false;
    const startYear = editingLeave.startDate ? new Date(editingLeave.startDate).getFullYear() : 2026;

    let paidDays = diffDays;
    let excessDays = 0;

    if (!isHist && type === 'ANNUAL') {
      const empFifo = computeFifoLeaveAllocations(
        targetEmp,
        buildEmployeeBaselineAllocations(targetEmp, allocations),
        companyLeaves.filter(l => l.id !== editingLeave.id)
      );

      const split = calculateLeaveOverdraftSplit(diffDays, empFifo.netAvailable);
      paidDays = split.paidDays;
      excessDays = split.excessDays;

      if (split.isOverdraft) {
        toast(split.explanation, { icon: '⚠️', duration: 5000 });
      }
    }

    const finalPaidDays = editingLeave.paidDays !== undefined ? editingLeave.paidDays : paidDays;
    const finalExcessDays = editingLeave.excessDays !== undefined ? editingLeave.excessDays : excessDays;

    const determinedStatus = (isHist ? 'APPROVED' : (statusOverride || editingLeave.status || 'SUBMITTED')) as any;

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
      reason: editingLeave.reason || (isHist ? `سجل إجازة تاريخية قديمة لعام ${editingLeave.historicalYear || startYear}` : 'إجازة اعتيادية'),
      status: determinedStatus,
      createdAt: new Date().toISOString().split('T')[0],
      isHistorical: isHist,
      historicalYear: isHist ? (editingLeave.historicalYear || startYear) : undefined,
      managerOverride: isOverrideActive,
      managerOverrideNote: isDirectApproved 
        ? 'تم الاعتماد المباشر وتجاوز الرصيد بصلاحية الإدارة' 
        : (editingLeave.managerOverrideNote || (editingLeave.managerOverride ? 'معتمد بصلاحية الإدارة' : undefined)),
    };

    onSaveLeave(newLeave);
    toast.success(`تم حفظ الإجازة بنجاح (${newLeave.status === 'APPROVED' ? 'معتمدة' : 'مسجلة'})`);
    setEditingLeave(null);
  };

  // Run Automated Monthly Accrual Engine (2.5 days/month)
  const handleRunMonthlyAccrual = () => {
    setIsProcessingAccrual(true);
    try {
      const result = LeaveService.processMonthlyLeaveAccrual(companyEmployees, allocations);
      if (result.hasRun) {
        if (result.newAllocations.length > 0) {
          setAllocations(prev => [...result.newAllocations, ...prev]);
        }
        if (onSaveEmployee) {
          result.updatedEmployees.forEach(e => onSaveEmployee(e));
        }
        toast.success(`تم تشغيل محرك الاستحقاق الشهري بنجاح (+2.5 يوم لـ ${result.accruedCount} موظف لشهر ${getAccrualMonthNameAr()})`);
      } else {
        toast('جميع الموظفين مسجل لهم الاستحقاق الشهري مسبقاً لهذا الشهر ولا توجد مستحقات معلقة.', { icon: 'ℹ️' });
      }
    } catch (err) {
      toast.error('حدث خطأ أثناء تشغيل محرك الاستحقاق');
    } finally {
      setIsProcessingAccrual(false);
    }
  };

  // Save manual allocation (hr.leave.allocation)
  const handleSaveAllocation = () => {
    if (!editingAllocation || !editingAllocation.employeeId) {
      toast.error('يرجى تحديد الموظف');
      return;
    }
    if (editingAllocation.numberOfDays === undefined || editingAllocation.numberOfDays === null || Number(editingAllocation.numberOfDays) < 0) {
      toast.error('يرجى إدخال عدد أيام صحيح');
      return;
    }

    const existingId = editingAllocation.id;
    const existingAlloc = existingId ? allocations.find(a => a.id === existingId) : null;
    const consumed = existingAlloc ? (existingAlloc.consumedDays || 0) : 0;
    const totalDays = Number(editingAllocation.numberOfDays);
    const isUpdating = Boolean(existingId);
    const allocType = editingAllocation.allocationType || 'regular';

    const newAlloc: HrLeaveAllocation = {
      id: existingId || `alloc-${Date.now()}`,
      name: editingAllocation.name || (allocType === 'regular' ? `رصيد إجازات مرحل من 2025 (${totalDays} يوم)` : `تخصيص رصيد إجازة (${totalDays} يوم)`),
      employeeId: editingAllocation.employeeId,
      companyId: activeCompany?.id || 'comp-1',
      leaveType: 'ANNUAL',
      allocationType: allocType,
      numberOfDays: totalDays,
      consumedDays: consumed,
      remainingDays: Math.max(0, totalDays - consumed),
      dateFrom: editingAllocation.dateFrom || (allocType === 'regular' ? '2025-12-31' : new Date().toISOString().split('T')[0]),
      dateTo: editingAllocation.dateTo || existingAlloc?.dateTo || '',
      expiryDate: editingAllocation.expiryDate || existingAlloc?.expiryDate || editingAllocation.dateTo || '',
      state: 'validate',
      notes: editingAllocation.notes || existingAlloc?.notes || (allocType === 'regular' ? 'رصيد مرحل معتمد من نهاية عام 2025' : 'تخصيص رصيد إجازات معتمد'),
      createdAt: existingAlloc?.createdAt || new Date().toISOString()
    };

    // Update the employee object so carriedOverLeave2025 / carriedOverBalance is permanently saved
    const targetEmp = employees.find(e => e.id === newAlloc.employeeId);
    if (targetEmp && onSaveEmployee && allocType === 'regular') {
      const updatedEmp: Employee = {
        ...targetEmp,
        carriedOverLeave2025: totalDays,
        carriedOverBalance: totalDays,
        openingBalance: totalDays,
        openingLeaveBalance: totalDays,
        days_carried_over: totalDays,
        aysed_carried_over: totalDays
      } as any;
      onSaveEmployee(updatedEmp);
    }

    setAllocations(prev => {
      // If saving a regular allocation, replace any existing regular allocation for this employee
      const filtered = prev.filter(a => {
        if (a.id === newAlloc.id) return false;
        if (allocType === 'regular' && a.employeeId === newAlloc.employeeId && a.allocationType === 'regular') {
          return false;
        }
        return true;
      });
      const nextAllocs = [newAlloc, ...filtered];
      setPersistentData(MANARA_STORAGE_KEYS.LEAVE_ALLOCATIONS, nextAllocs);
      return nextAllocs;
    });

    toast.success(isUpdating ? `تم تحديث التخصيص (${totalDays} يوم) وإعادة احتساب الأرصدة بنجاح` : `تم حفظ تخصيص الرصيد (${totalDays} يوم) للموظف بنجاح`);
    setEditingAllocation(null);
  };

  // Delete Allocation
  const handleDeleteAllocation = (allocId: string) => {
    setAllocations(prev => prev.filter(a => a.id !== allocId));
    toast.success('تم حذف سجل التخصيص بنجاح');
  };

  const historicalLeavesList = companyLeaves.filter(l => {
    if (!l.isHistorical && l.status !== 'APPROVED') return false;
    if (historyEmpIdFilter !== 'ALL' && l.employeeId !== historyEmpIdFilter) return false;
    const emp = employees.find(e => e.id === l.employeeId);
    const empName = emp ? emp.fullNameAr : '';
    return empName.includes(activeSearchTerm) || (l.reason && l.reason.includes(activeSearchTerm));
  });

  return (
    <div className="p-6 bg-slate-50 min-h-screen text-slate-800" dir="rtl">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-[#714B67]" />
            <span>محرك إجازات أودو والاستحقاق الشهري (Time Off & Leave Accrual Engine)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            إدارة طلبات الإجازات، تخصيصات الأرصدة (hr.leave.allocation)، ترحيل 2.5 يوم/شهر آلياً، واستهلاك الأرصدة بنظام FIFO
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleRunMonthlyAccrual}
            disabled={isProcessingAccrual}
            className="bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-sm flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            title="تشغيل الترحيل الآلي لجميع الموظفين المستحقين للشهر الحالي (+2.5 يوم)"
          >
            <RefreshCw className={`w-4 h-4 text-amber-300 ${isProcessingAccrual ? 'animate-spin' : ''}`} />
            <span>تشغيل الاستحقاق الشهري (2.5 يوم)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('SETTLEMENT')}
            className="bg-[#714B67] hover:bg-[#5a3b52] text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-sm flex items-center gap-1.5 transition cursor-pointer"
          >
            <Printer className="w-4 h-4 text-amber-300" />
            <span>حاسبة وطباعة تسوية الإجازات</span>
          </button>

          <button
            onClick={() => {
              setEditingLeave({
                companyId: activeCompany?.id || 'comp-1',
                leaveType: 'ANNUAL',
                startDate: new Date().toISOString().split('T')[0],
                endDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
                reason: 'إجازة سنوية اعتيادية',
              });
            }}
            className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm flex items-center gap-2 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>تقديم طلب إجازة جديد</span>
          </button>
        </div>
      </div>

      {/* Odoo Enterprise Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">الرصيد الافتتاحي (Opening)</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-black text-slate-900 font-mono">
            {formatDaysDisplay(aggregateMetrics.totalOpening)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">مرحل من 2025 (Fixed Regular)</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-700">المكتسب 2026 (Accrued)</span>
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-700">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-black text-purple-900 font-mono">
            {formatDaysDisplay(aggregateMetrics.totalAccrued)}
          </div>
          <div className="text-[10px] text-purple-600 mt-1">بمعدل 2.5 يوم/شهر (مادة 70)</div>
        </div>

        <div className="bg-white rounded-xl border border-emerald-200 p-3.5 shadow-xs bg-emerald-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800">أيام تعويضية (العطلات)</span>
            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
              <Gift className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-black text-emerald-900 font-mono">
            +{formatDaysDisplay(aggregateMetrics.totalCompensatory)}
          </div>
          <div className="text-[10px] text-emerald-700 mt-1">بديل العمل بالعطل الرسمية</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-600">المستهلك (Taken)</span>
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-black text-rose-700 font-mono">
            {formatDaysDisplay(aggregateMetrics.totalTaken)}
          </div>
          <div className="text-[10px] text-rose-500 mt-1">إجمالي الإجازات المستهلكة</div>
        </div>

        <div className="bg-gradient-to-br from-[#714B67] to-purple-900 text-white rounded-xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-200">الصافي المتاح (Net)</span>
            <div className="p-1.5 rounded-lg bg-white/10 text-amber-300">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-black font-mono text-amber-300">
            {formatDaysDisplay(aggregateMetrics.totalAvailable)}
          </div>
          <div className="text-[10px] text-purple-200 mt-1">المتاح للاستهلاك والتسوية</div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveSubTab('REQUESTS')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'REQUESTS'
              ? 'bg-[#714B67] text-white shadow'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>طلبات الإجازات (hr.leave)</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
            activeSubTab === 'REQUESTS' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {companyLeaves.filter(l => !l.isHistorical).length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('ALLOCATIONS')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'ALLOCATIONS'
              ? 'bg-[#714B67] text-white shadow'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Layers className="w-4 h-4 text-purple-400" />
          <span>تخصيصات الأرصدة والاستحقاق (hr.leave.allocation)</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
            activeSubTab === 'ALLOCATIONS' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {allocations.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('BALANCES')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'BALANCES'
              ? 'bg-[#714B67] text-white shadow'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>كشف أرصدة الموظفين بنظام FIFO</span>
        </button>

        <button
          onClick={() => setActiveSubTab('SETTLEMENT')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'SETTLEMENT'
              ? 'bg-[#714B67] text-white shadow'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <DollarSign className="w-4 h-4 text-emerald-400" />
          <span>حاسبة التسوية والتصفية الرسمية</span>
        </button>

        <button
          onClick={() => setActiveSubTab('HISTORY_LOG')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'HISTORY_LOG'
              ? 'bg-[#714B67] text-white shadow'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <History className="w-4 h-4 text-purple-300" />
          <span>سجل الحركات والأرشيف</span>
        </button>

        <button
          onClick={() => setActiveSubTab('HOLIDAYS')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'HOLIDAYS'
              ? 'bg-[#714B67] text-white shadow'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4 text-amber-400" />
          <span>العطلات الرسمية 2026</span>
        </button>
      </div>

      {/* Sub-Tab 1: Requests (hr.leave) */}
      {activeSubTab === 'REQUESTS' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="font-bold text-[#714B67] flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> تصفية:
              </span>
              <select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold"
              >
                <option value="ALL">جميع الحالات</option>
                <option value="SUBMITTED">بانتظار الاعتماد</option>
                <option value="APPROVED">معتمدة</option>
                <option value="REJECTED">مرفوضة</option>
              </select>
            </div>
            
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="بحث باسم الموظف أو السبب..."
                className="w-full bg-white border border-slate-300 rounded-lg pr-8 pl-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-[#714B67]"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto max-h-[68vh] odoo-scrollbar">
              <table className="w-full text-right text-xs table-auto min-w-[950px]">
                <thead className="bg-[#714B67] text-white font-bold sticky top-0 z-10 shadow-xs">
                  <tr>
                    <th className="p-3 w-44 whitespace-nowrap">الموظف</th>
                    <th className="p-3 w-36 whitespace-nowrap">نوع الإجازة</th>
                    <th className="p-3 w-44 whitespace-nowrap">الفترة</th>
                    <th className="p-3 w-28 text-center whitespace-nowrap">المدة الإجمالية</th>
                    <th className="p-3 w-36 text-center whitespace-nowrap">مدفوعة / بدون راتب</th>
                    <th className="p-3 min-w-[180px] whitespace-nowrap">البيان</th>
                    <th className="p-3 w-32 text-center whitespace-nowrap">الحالة</th>
                    <th className="p-3 w-44 text-center whitespace-nowrap">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLeaves.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500 font-bold">
                        لا توجد طلبات إجازة مطابقة حالياً
                      </td>
                    </tr>) : (
                    filteredLeaves.map((lev, index) => {
                      const emp = employees.find(e => e.id === lev.employeeId || e.employeeCode === lev.employeeId) || {
                        fullNameAr: lev.employeeId ? `موظف (${lev.employeeId})` : 'موظف غير محدد',
                        employeeCode: lev.employeeId || '—'
                      } as Employee;
                      return (
                        <tr key={`${lev.id}-${index}`} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/70 hover:bg-slate-100/60 transition'}>
                          <td className="p-3 font-bold text-slate-900">
                            <div>{emp ? emp.fullNameAr : 'مجهول'}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{emp?.employeeCode}</div>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded font-bold text-[11px] border ${
                              lev.leaveType === 'BEREAVEMENT' || lev.leaveType === 'COMPASSIONATE'
                                ? 'bg-slate-900 text-amber-300 border-slate-700'
                                : 'bg-slate-100 text-slate-800 border-slate-200'
                            }`}>
                              {lev.leaveType === 'ANNUAL' ? '🌴 سنوية اعتيادية' : 
                               lev.leaveType === 'BEREAVEMENT' || lev.leaveType === 'COMPASSIONATE' 
                                 ? (lev.isSplitBereavement ? `🖤 عزاء وسنوية (م. 77)` : `🖤 إجازة عزاء (م. 77)`) 
                                 : lev.leaveType === 'SICK' ? '🏥 مرضية' 
                                 : lev.leaveType === 'UNPAID' ? '🚫 بدون راتب' 
                                 : lev.leaveType === 'COMPENSATORY' ? '🔄 يوم تعويضي' 
                                 : lev.leaveType === 'MATERNITY' ? '👶 أمومة' 
                                 : lev.leaveType}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-slate-700">{lev.startDate} إلى {lev.endDate}</td>
                          <td className="p-3 text-center font-mono font-bold text-[#714B67] text-sm">
                            {lev.totalDays} يوم
                          </td>
                          <td className="p-3 text-center font-mono">
                            <div className="flex items-center justify-center gap-1">
                              <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded text-[10px] font-bold border border-emerald-200">
                                {lev.paidDays ?? lev.totalDays} مدفوع
                              </span>
                              {Number(lev.excessDays || 0) > 0 && (
                                <span className="bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded text-[10px] font-bold border border-rose-200">
                                  {lev.excessDays} بدون راتب
                                </span>)}
                            </div>
                          </td>
                          <td className="p-3 text-slate-600 max-w-xs truncate">{lev.reason}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                              lev.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                              lev.status === 'REJECTED' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                              lev.status === 'DRAFT' ? 'bg-slate-100 text-slate-800 border border-slate-200' :
                              'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}>
                              {lev.status === 'APPROVED' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                              <span>{
                                lev.status === 'APPROVED' ? 'معتمدة' : 
                                lev.status === 'REJECTED' ? 'مرفوضة' : 
                                lev.status === 'PENDING_MANAGER' ? 'بانتظار المدير' :
                                lev.status === 'PENDING_HR' ? 'بانتظار الموارد البشرية' :
                                lev.status === 'SUBMITTED' ? 'بانتظار الاعتماد' :
                                'مسودة'
                              }</span>
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {lev.status === 'DRAFT' && (
                                <button
                                  onClick={() => onUpdateLeaveStatus(lev.id, 'PENDING_MANAGER')}
                                  className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                                >
                                  <span>تقديم</span>
                                </button>)}
                              {(lev.status === 'PENDING_MANAGER' || lev.status === 'SUBMITTED') && (
                                <button
                                  onClick={() => onUpdateLeaveStatus(lev.id, 'PENDING_HR')}
                                  className="bg-amber-600 hover:bg-amber-700 text-white px-2 py-1 rounded text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>اعتماد المدير</span>
                                </button>)}
                              {lev.status === 'PENDING_HR' && (
                                <button
                                  onClick={() => onUpdateLeaveStatus(lev.id, 'APPROVED')}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>اعتماد نهائي</span>
                                </button>)}
                              {(lev.status === 'PENDING_MANAGER' || lev.status === 'PENDING_HR' || lev.status === 'SUBMITTED') && 
                                <button
                                  onClick={() => onUpdateLeaveStatus(lev.id, 'REJECTED')}
                                  className="bg-rose-100 hover:bg-rose-200 text-rose-700 px-2 py-1 rounded text-[11px] font-bold transition flex items-center gap-1 cursor-pointer border border-rose-200"
                                >
                                  <span>رفض</span>
                                </button>
  }
                              <button
                                onClick={() => setEditingLeave(lev)}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded text-[11px] font-bold transition cursor-pointer border border-slate-200"
                              >
                                عرض / تعديل
                              </button>
                              {onDeleteLeave && (
                                <button
                                  onClick={() => onDeleteLeave(lev.id)}
                                  className="p-1 text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                                  title="حذف الطلب ورد الرصيد تلقائياً"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>)}
                            </div>
                          </td>
                        </tr>);
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>)}

      {/* Sub-Tab 2: Allocations Manager (hr.leave.allocation) */}
      {activeSubTab === 'ALLOCATIONS' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="font-bold text-[#714B67] flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> نوع التخصيص:
              </span>
              <select
                value={allocationTypeFilter}
                onChange={(e) => setAllocationTypeFilter(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold"
              >
                <option value="ALL">جميع التخصيصات</option>
                <option value="regular">تخصيص رصيد افتتاحي / ثابت (Regular)</option>
                <option value="accrual">خطة استحقاق شهري (Accrual Plan)</option>
                <option value="compensatory_off">أيام تعويضية عن العمل في العطلات (Compensatory Off)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setEditingAllocation({
                    companyId: activeCompany?.id || 'comp-1',
                    allocationType: 'regular',
                    leaveType: 'ANNUAL',
                    numberOfDays: 30,
                    dateFrom: new Date().toISOString().split('T')[0],
                    name: 'تخصيص رصيد إجازة سنوية جديد (Regular Allocation)',
                  });
                }}
                className="bg-[#714B67] hover:bg-[#5a3b52] text-white text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-amber-300" />
                <span>إضافة تخصيص رصيد جديد (New Allocation)</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto max-h-[68vh] odoo-scrollbar">
              <table className="w-full text-right text-xs table-auto min-w-[1100px]">
                <thead className="bg-[#714B67] text-white font-bold sticky top-0 z-10 shadow-xs">
                  <tr>
                    <th className="p-3 w-44 whitespace-nowrap">الموظف</th>
                    <th className="p-3 min-w-[240px] whitespace-nowrap">مسمى التخصيص (Allocation Description)</th>
                    <th className="p-3 w-32 text-center whitespace-nowrap">النوع (Type)</th>
                    <th className="p-3 w-32 text-center whitespace-nowrap">تاريخ السريان</th>
                    <th className="p-3 w-28 text-center whitespace-nowrap">الأيام المخصصة</th>
                    <th className="p-3 w-28 text-center whitespace-nowrap">المستهلك (FIFO)</th>
                    <th className="p-3 w-32 text-center whitespace-nowrap">المتبقي</th>
                    <th className="p-3 w-28 text-center whitespace-nowrap">الحالة</th>
                    <th className="p-3 w-36 text-center whitespace-nowrap">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAllocations.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-500 font-bold">
                        لا توجد سجلات تخصيص رصيد مسجلة حالياً
                      </td>
                    </tr>) : (
                    filteredAllocations.map((alloc, idx) => {
                      const emp = employees.find(e => e.id === alloc.employeeId || e.employeeCode === alloc.employeeId) || {
                        id: alloc.employeeId,
                        fullNameAr: alloc.employeeId ? `موظف (${alloc.employeeId})` : 'موظف غير محدد',
                        employeeCode: alloc.employeeId || '—'
                      } as Employee;
                      const empFifo = emp ? computeFifoLeaveAllocations(emp, buildEmployeeBaselineAllocations(emp, allocations), companyLeaves) : null;
                      const liveAlloc = empFifo?.allocations.find(a => a.id === alloc.id) || alloc;
                      const consumed = liveAlloc.consumedDays || 0;
                      const total = liveAlloc.numberOfDays || 0;
                      const remaining = Math.max(0, total - consumed);
                      const isValidated = alloc.state === 'validate' || !alloc.state;

                      return (
                        <tr key={`${alloc.id}-${idx}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70 hover:bg-slate-100/60 transition'}>
                          <td className="p-3">
                            <div className="font-bold text-slate-900">{emp.fullNameAr}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{emp.employeeCode}</div>
                          </td>
                          <td className="p-3 font-bold text-slate-800 max-w-sm whitespace-normal break-words leading-relaxed">
                            {alloc.name}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              alloc.allocationType === 'compensatory_off' || (alloc as any).allocationType === 'compensatory' || alloc.name?.includes('تعويضي') || alloc.name?.includes('بديل')
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                : alloc.allocationType === 'regular' 
                                  ? 'bg-amber-100 text-amber-900 border border-amber-200' 
                                  : 'bg-purple-100 text-purple-900 border border-purple-200'
                            }`}>
                              {alloc.allocationType === 'compensatory_off' || (alloc as any).allocationType === 'compensatory' || alloc.name?.includes('تعويضي') || alloc.name?.includes('بديل')
                                ? '🎁 يوم تعويضي (عطلة)'
                                : alloc.allocationType === 'regular' 
                                  ? 'ثابت / افتتاحي' 
                                  : 'استحقاق شهري (2.5)'}
                            </span>
                          </td>
                          <td className="p-3 text-center font-mono text-slate-600">{alloc.dateFrom || '—'}</td>
                          <td className="p-3 text-center font-mono font-bold text-slate-900 text-sm whitespace-nowrap">
                            {formatDaysDisplay(alloc.numberOfDays)}
                          </td>
                          <td className="p-3 text-center font-mono whitespace-nowrap">
                            <span className={consumed > 0 ? 'text-rose-700 font-bold' : 'text-slate-400'}>
                              {formatDaysDisplay(consumed)}
                            </span>
                          </td>
                          <td className="p-3 text-center font-mono whitespace-nowrap tabular-nums">
                            <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 inline-block">
                              {formatDaysDisplay(remaining)}
                            </span>
                          </td>
                          <td className="p-3 text-center whitespace-nowrap">
                            <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-200">
                              معتمد (Validated)
                            </span>
                          </td>
                          <td className="p-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              {emp && (
                                <button
                                  onClick={() => setSelectedFifoEmployee(emp as Employee)}
                                  className="p-1.5 text-purple-700 hover:bg-purple-50 rounded transition cursor-pointer font-bold text-[11px] flex items-center gap-0.5 border border-purple-200"
                                  title="عرض كشف استهلاك FIFO"
                                >
                                  <Layers className="w-3.5 h-3.5" />
                                  <span>FIFO</span>
                                </button>
                              )}
                              {!isValidated ? (
                                <>
                                  <button
                                    onClick={() => setEditingAllocation(alloc)}
                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition cursor-pointer border border-blue-200"
                                    title="تعديل التخصيص"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteAllocation(alloc.id)}
                                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer border border-rose-200"
                                    title="حذف التخصيص"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              ) : (
                                <span className="text-[10px] text-slate-500 font-bold px-2.5 py-1 bg-slate-100 rounded border border-slate-200 flex items-center gap-1" title="السجل معتمد ومقفل للحفاظ على سلامة دفتر الأستاذ">
                                  <Lock className="w-3 h-3 text-slate-600" /> مقفل
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>);
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>)}

      {/* Sub-Tab 3: Balances & FIFO Ledger */}
      {activeSubTab === 'BALANCES' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-[#714B67]" />
                <span>كشف حساب أرصدة الموظفين بنظام FIFO (Odoo 17 Time Off Balance)</span>
              </span>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="بحث باسم الموظف..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg pr-8 pl-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-[#714B67]"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto max-h-[68vh] odoo-scrollbar">
              <table className="w-full text-right text-xs table-auto min-w-[980px]">
                <thead className="bg-[#714B67] text-white font-bold sticky top-0 z-10 shadow-xs">
                  <tr>
                    <th className="p-3 w-10 text-center whitespace-nowrap">#</th>
                    <th className="p-3 min-w-[180px] whitespace-nowrap">الموظف</th>
                    <th className="p-3 w-32 text-center whitespace-nowrap">الرصيد الافتتاحي / المرحل</th>
                    <th className="p-3 w-32 text-center whitespace-nowrap">المكتسب لعام 2026</th>
                    <th className="p-3 w-32 text-center whitespace-nowrap bg-[#5c3c54] text-amber-300">أيام تعويضية (العطلات)</th>
                    <th className="p-3 w-32 text-center whitespace-nowrap">المستهلك (Taken Days)</th>
                    <th className="p-3 w-32 text-center whitespace-nowrap">الرصيد المتاح الصافي</th>
                    <th className="p-3 w-36 text-center whitespace-nowrap">حالة الترحيل الشهري</th>
                    <th className="p-3 min-w-[220px] text-center whitespace-nowrap">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {companyEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400 font-bold">
                        لا يوجد موظفين مسجلين في الشركة
                      </td>
                    </tr>) : (
                    filteredEmployeeBalances.map((item, idx) => {
                      const { emp, totalOpening, totalAccrued, totalCompensatory, totalTaken, netAvailable } = item;
                      return (
                        <tr key={emp.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70 hover:bg-slate-100/60 transition'}>
                          <td className="p-3 text-center font-mono text-slate-400">{idx + 1}</td>
                          <td className="p-3">
                            <div className="font-bold text-slate-900">{emp.fullNameAr}</div>
                            <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                              <span>{emp.employeeCode}</span>
                              <span>•</span>
                              <span>{emp.jobTitle}</span>
                              <span>•</span>
                              <span className="text-purple-800 font-bold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                                {formatEmployeeNationalityAndResidency(emp)}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-center font-mono text-slate-700">
                            {formatDaysDisplay(totalOpening)}
                          </td>
                          <td className="p-3 text-center font-mono">
                            <div className="text-purple-700 font-bold">{formatDaysDisplay(totalAccrued)}</div>
                          </td>
                          <td className="p-3 text-center font-mono">
                            {totalCompensatory > 0 ? (
                              <span className="font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-300 inline-block shadow-2xs">
                                +{formatDaysDisplay(totalCompensatory)}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-mono text-xs">0 يوم</span>
                            )}
                          </td>
                          <td className="p-3 text-center font-mono text-rose-700 font-bold">
                            {formatDaysDisplay(totalTaken)}
                          </td>
                          <td className="p-3 text-center font-mono">
                            <span className="font-black text-sm text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-300 shadow-2xs">
                              {formatDaysDisplay(netAvailable)}
                            </span>
                          </td>
                          <td className="p-3 text-center text-[10px] text-slate-500">
                            <span className="bg-purple-50 text-purple-800 px-2 py-0.5 rounded font-mono border border-purple-100">
                              2.5 يوم / 28 شهرياً
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => {
                                  const currentOpening = getCarriedOverBalance(emp);
                                  setEditingAllocation({
                                    employeeId: emp.id,
                                    companyId: emp.companyId || activeCompany?.id || 'comp-1',
                                    allocationType: 'regular',
                                    leaveType: 'ANNUAL',
                                    numberOfDays: currentOpening > 0 ? currentOpening : 15,
                                    dateFrom: '2025-12-31',
                                    name: 'رصيد إجازات مرحل من 2025 (Carried-Over Balance)',
                                    notes: 'رصيد مرحل معتمد من نهاية عام 2025',
                                  });
                                }}
                                className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-2 py-1 rounded text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                                title="تخصيص وتعديل الرصيد المرحل من 2025"
                              >
                                <Award className="w-3 h-3 text-amber-700" />
                                <span>الرصيد المرحل</span>
                              </button>
                              <button
                                onClick={() => setSelectedFifoEmployee(emp)}
                                className="bg-[#714B67] hover:bg-[#5a3b52] text-white px-2 py-1 rounded text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                              >
                                <Layers className="w-3 h-3 text-amber-300" />
                                <span>بطاقة FIFO</span>
                              </button>
                              <button
                                onClick={() => {
                                  setEditingLeave({
                                    employeeId: emp.id,
                                    companyId: emp.companyId,
                                    leaveType: 'ANNUAL',
                                    startDate: new Date().toISOString().split('T')[0],
                                    endDate: new Date().toISOString().split('T')[0],
                                    status: 'APPROVED',
                                    reason: 'تسجيل إجازة سريعة للموظف',
                                  });
                                }}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded text-[11px] font-bold transition cursor-pointer border border-slate-200"
                              >
                                طلب إجازة
                              </button>
                            </div>
                          </td>
                        </tr>);
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>)}

      {/* Sub-Tab 4: Settlement Calculator */}
      {activeSubTab === 'SETTLEMENT' && (
        <LeaveSettlementCalculator
          allocations={allocations}
          employees={employees}
          contracts={contracts}
          leaves={leaves}
          attendance={attendance}
          activeCompany={activeCompany}
          preSelectedEmployeeId={settlementEmpId}
          onNavigateToTab={(tab) => setActiveSubTab(tab as any)}
          onSaveLeave={onSaveLeave}
          onUpdateAllocations={setAllocations}
          onUpdateEmployee={onSaveEmployee}
        />)}

      {/* Sub-Tab 5: History Log */}
      {activeSubTab === 'HISTORY_LOG' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                <History className="w-4 h-4 text-[#714B67]" />
                <span>أرشيف وسجل حركة الإجازات ({historicalLeavesList.length} سجل)</span>
              </span>
              <select
                value={historyEmpIdFilter}
                onChange={(e) => setHistoryEmpIdFilter(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none"
              >
                <option value="ALL">جميع الموظفين</option>
                {companyEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.fullNameAr}</option>))}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto max-h-[68vh] odoo-scrollbar">
              <table className="w-full text-right text-xs table-auto">
                <thead className="bg-[#714B67] text-white font-bold sticky top-0 z-10 shadow-xs">
                  <tr>
                    <th className="p-3 w-20 whitespace-nowrap">السنة</th>
                    <th className="p-3 w-48 whitespace-nowrap">الموظف</th>
                    <th className="p-3 w-36 whitespace-nowrap">نوع الإجازة</th>
                    <th className="p-3 w-44 whitespace-nowrap">الفترة</th>
                    <th className="p-3 w-24 text-center whitespace-nowrap">الأيام</th>
                    <th className="p-3 min-w-[200px] whitespace-nowrap">الملاحظات</th>
                    <th className="p-3 w-32 text-center whitespace-nowrap">النوع / التصنيف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historicalLeavesList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500 font-bold">
                        لا توجد سجلات تاريخية مسجلة حالياً
                      </td>
                    </tr>) : (
                    historicalLeavesList.map((lev, idx) => {
                      const emp = employees.find(e => e.id === lev.employeeId || e.employeeCode === lev.employeeId) || {
                        fullNameAr: lev.employeeId ? `موظف (${lev.employeeId})` : 'موظف غير محدد',
                        employeeCode: lev.employeeId || '—'
                      } as Employee;
                      return (
                        <tr key={`${lev.id}-${idx}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70 hover:bg-slate-100/60 transition'}>
                          <td className="p-3 font-mono font-bold text-purple-900">{lev.historicalYear || (lev.startDate ? new Date(lev.startDate).getFullYear() : '2026')}</td>
                          <td className="p-3 font-bold text-slate-900">
                            <div>{emp.fullNameAr}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{emp.employeeCode}</div>
                          </td>
                          <td className="p-3">
                            <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-bold text-[10px] border border-slate-200">
                              {lev.leaveType === 'ANNUAL' ? '🌴 سنوية' : lev.leaveType === 'SICK' ? '🏥 مرضية' : lev.leaveType}
                            </span>
                          </td>
                          <td className="p-3 font-mono">{lev.startDate} إلى {lev.endDate}</td>
                          <td className="p-3 text-center font-mono font-bold text-[#714B67]">{lev.totalDays} يوم</td>
                          <td className="p-3 text-slate-600">{lev.reason}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              lev.isHistorical ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            }`}>
                              {lev.isHistorical ? 'أرشيف سابق' : 'حركة فعلية 2026'}
                            </span>
                          </td>
                        </tr>);
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>)}

      {/* Sub-Tab 6: Holidays */}
      {activeSubTab === 'HOLIDAYS' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto max-h-[68vh] odoo-scrollbar">
            <table className="w-full text-right text-xs table-auto">
              <thead className="bg-[#714B67] text-white font-bold sticky top-0 z-10 shadow-xs">
                <tr>
                  <th className="p-3 w-16 text-center whitespace-nowrap">#</th>
                  <th className="p-3 w-36 whitespace-nowrap">تاريخ العطلة</th>
                  <th className="p-3 min-w-[200px] whitespace-nowrap">المناسبة</th>
                  <th className="p-3 w-44 text-center whitespace-nowrap">النوع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {getCompensatedHolidays2026().map((h, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/70 hover:bg-slate-100/60 transition'}>
                    <td className="p-3 font-mono text-slate-400 text-center">{i + 1}</td>
                    <td className="p-3 font-mono font-bold text-slate-800">{h.date}</td>
                    <td className="p-3 font-bold text-[#714B67]">{h.name}</td>
                    <td className="p-3 text-center">
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded font-bold border border-emerald-200">
                        عطلة رسمية مدفوعة الأجر
                      </span>
                    </td>
                  </tr>))}
              </tbody>
            </table>
          </div>
        </div>)}

      {/* Official Leave Modal Rendered Here */}
      {editingLeave && (
        <OfficialLeaveModal
          editingLeave={editingLeave}
          onClose={() => setEditingLeave(null)}
          employees={employees}
          contracts={contracts}
          allocations={allocations}
          allLeaves={leaves}
          holidaysList={[]}
          onSave={handleSaveLeaveRequest}
        />
      )}

      {/* Allocation Create / Edit Modal (hr.leave.allocation) */}
      {editingAllocation && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-300 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <header className="p-4 bg-[#714B67] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-sm">
                  {editingAllocation.id ? 'تعديل تخصيص رصيد الإجازة (Edit Allocation)' : 'إضافة تخصيص رصيد إجازة (hr.leave.allocation)'}
                </h3>
              </div>
              <button 
                onClick={() => setEditingAllocation(null)} 
                className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white font-bold transition cursor-pointer"
              >
                ✕
              </button>
            </header>

            <div className="p-5 space-y-4 text-xs">
              {/* Quick Template Presets */}
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">نماذج التخصيص السريعة (Quick Presets):</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const emp = companyEmployees.find(e => e.id === editingAllocation.employeeId);
                      const currentBal = emp ? getCarriedOverBalance(emp) : 0;
                      setEditingAllocation({
                        ...editingAllocation,
                        allocationType: 'regular',
                        name: 'رصيد إجازات مرحل من 2025 (Carried-Over Balance)',
                        dateFrom: '2025-12-31',
                        numberOfDays: currentBal > 0 ? currentBal : (editingAllocation.numberOfDays || 15),
                        notes: 'رصيد مرحل معتمد من نهاية عام 2025'
                      });
                    }}
                    className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                      editingAllocation.allocationType === 'regular' && (editingAllocation.name?.includes('مرحل') || editingAllocation.dateFrom?.startsWith('2025'))
                        ? 'bg-amber-100/80 border-amber-400 text-amber-950 font-bold shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-amber-50'
                    }`}
                  >
                    <div className="text-[11px] font-bold">✨ رصيد مرحل 2025</div>
                    <div className="text-[9px] text-slate-500 mt-0.5">Carried-Over Balance</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingAllocation({
                        ...editingAllocation,
                        allocationType: 'regular',
                        name: 'تخصيص رصيد سنوي معتمد (Annual Leave)',
                        dateFrom: '2026-01-01',
                        numberOfDays: 30,
                        notes: 'تخصيص رصيد سنوي معتمد 30 يوم'
                      });
                    }}
                    className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                      editingAllocation.allocationType === 'regular' && !editingAllocation.name?.includes('مرحل') && !editingAllocation.dateFrom?.startsWith('2025')
                        ? 'bg-purple-100/80 border-purple-400 text-purple-950 font-bold shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-purple-50'
                    }`}
                  >
                    <div className="text-[11px] font-bold">📅 رصيد سنوي (30)</div>
                    <div className="text-[9px] text-slate-500 mt-0.5">Annual Regular</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingAllocation({
                        ...editingAllocation,
                        allocationType: 'accrual',
                        name: 'استحقاق شهري إضافي (2.5 يوم)',
                        dateFrom: '2026-08-01',
                        numberOfDays: 2.5,
                        notes: 'استحقاق شهري وفق المادة 70'
                      });
                    }}
                    className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                      editingAllocation.allocationType === 'accrual'
                        ? 'bg-emerald-100/80 border-emerald-400 text-emerald-950 font-bold shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-emerald-50'
                    }`}
                  >
                    <div className="text-[11px] font-bold">⚡ استحقاق شهري</div>
                    <div className="text-[9px] text-slate-500 mt-0.5">2.5 يوم/شهر</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">الموظف المعني *</label>
                <select
                  value={editingAllocation.employeeId || ''}
                  onChange={e => {
                    const empId = e.target.value;
                    const emp = companyEmployees.find(x => x.id === empId);
                    const openingDays = emp ? getCarriedOverBalance(emp) : 0;
                    setEditingAllocation({ 
                      ...editingAllocation, 
                      employeeId: empId,
                      numberOfDays: editingAllocation.allocationType === 'regular' && openingDays > 0 ? openingDays : (editingAllocation.numberOfDays ?? 30)
                    });
                  }}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#714B67] outline-none"
                >
                  <option value="">-- اختر الموظف --</option>
                  {companyEmployees.map(emp => {
                    const carriedBal = getCarriedOverBalance(emp);
                    return (
                      <option key={emp.id} value={emp.id}>
                        {emp.fullNameAr} ({emp.employeeCode}) {carriedBal > 0 ? `[رصيد مرحل: ${carriedBal} يوم]` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">مسمى التخصيص / البيان *</label>
                <input
                  type="text"
                  value={editingAllocation.name || ''}
                  onChange={e => setEditingAllocation({ ...editingAllocation, name: e.target.value })}
                  placeholder="مثال: رصيد افتتاحي 2025 أو تخصيص إجازة سنوية معتمد"
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#714B67] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">نوع التخصيص *</label>
                  <select
                    value={editingAllocation.allocationType || 'regular'}
                    onChange={e => setEditingAllocation({ ...editingAllocation, allocationType: e.target.value as any })}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-bold bg-slate-50"
                  >
                    <option value="regular">تخصيص ثابت / افتتاحي (Regular)</option>
                    <option value="accrual">خطة استحقاق شهري (Accrual Plan)</option>
                    <option value="compensatory_off">يوم تعويضي عن العمل في العطلات (Compensatory Off)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">عدد الأيام المخصصة (الأيام) *</label>
                  <input
                    type="number"
                    step="0.5"
                    value={editingAllocation.numberOfDays ?? ''}
                    onChange={e => setEditingAllocation({ ...editingAllocation, numberOfDays: parseFloat(e.target.value) || 0 })}
                    placeholder="30"
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-mono font-bold bg-slate-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">تاريخ السريان (Date From) *</label>
                  <input
                    type="date"
                    value={editingAllocation.dateFrom || ''}
                    onChange={e => setEditingAllocation({ ...editingAllocation, dateFrom: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-mono font-bold bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">تاريخ الانتهاء / الصلاحية (Valid Until)</label>
                  <input
                    type="date"
                    value={editingAllocation.dateTo || ''}
                    onChange={e => setEditingAllocation({ ...editingAllocation, dateTo: e.target.value, expiryDate: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-mono font-bold bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">ملاحظات البيان (Notes)</label>
                <textarea
                  rows={2}
                  value={editingAllocation.notes || ''}
                  onChange={e => setEditingAllocation({ ...editingAllocation, notes: e.target.value })}
                  placeholder="أدخل ملاحظات أو تفاصيل التخصيص..."
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs bg-slate-50"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  onClick={() => setEditingAllocation(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSaveAllocation}
                  className="px-5 py-2 bg-[#714B67] hover:bg-[#5a3b52] text-white font-bold rounded-xl shadow-sm transition cursor-pointer"
                >
                  حفظ واعتماد التخصيص
                </button>
              </div>
            </div>
          </div>
        </div>)}

      {/* FIFO Detailed Consumption Drawer / Modal */}
      {selectedFifoEmployee && (() => {
        const empFifo = computeFifoLeaveAllocations(
          selectedFifoEmployee,
          buildEmployeeBaselineAllocations(selectedFifoEmployee, allocations),
          companyLeaves
        );

        const openingAllocs = empFifo.allocations.filter(a => a.allocationType === 'regular');
        const accrualAllocs = empFifo.allocations.filter(a => a.allocationType === 'accrual' && !a.name?.includes('تعويضي') && !a.name?.includes('بديل') && !a.name?.includes('عطلة'));
        const compAllocs = empFifo.allocations.filter(a => 
          a.allocationType === 'compensatory_off' || 
          (a.allocationType as string) === 'compensatory' || 
          a.name?.includes('تعويضي') || 
          a.name?.includes('بديل') ||
          a.name?.includes('عطلة')
        );
        const openingDays = openingAllocs.reduce((s, a) => s + (a.numberOfDays || 0), 0);
        const accrualDays = accrualAllocs.reduce((s, a) => s + (a.numberOfDays || 0), 0);
        const compDays = compAllocs.reduce((s, a) => s + (a.numberOfDays || 0), 0);

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-300 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6">
              <header className="p-4 bg-gradient-to-r from-[#714B67] to-purple-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-xl">
                    <Layers className="w-5 h-5 text-amber-300" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">كشف استهلاك دفعات الرصيد بنظام FIFO (First-In, First-Out Ledger)</h3>
                    <p className="text-[11px] text-purple-200">
                      {selectedFifoEmployee.fullNameAr} ({selectedFifoEmployee.employeeCode}) • {selectedFifoEmployee.jobTitle || 'موظف'} • تاريخ التعيين: {selectedFifoEmployee.joinDate || '—'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedFifoEmployee(null)} 
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white font-bold transition cursor-pointer"
                >
                  ✕
                </button>
              </header>

              <div className="p-6 space-y-6 text-xs max-h-[80vh] overflow-y-auto">
                {/* Summary Metric Cards */}
                <div className={`grid grid-cols-2 ${compDays > 0 ? 'sm:grid-cols-5' : 'sm:grid-cols-4'} gap-3`}>
                  <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200 text-center">
                    <div className="text-amber-800 font-bold text-[10px]">الرصيد الافتتاحي (Opening)</div>
                    <div className="text-base sm:text-lg font-black text-amber-900 font-mono mt-1">
                      {formatDaysDisplay(openingDays)}
                    </div>
                    <div className="text-[10px] text-amber-700 mt-0.5">مرحل من 2025</div>
                  </div>

                  <div className="p-3.5 bg-purple-50/70 rounded-xl border border-purple-200 text-center">
                    <div className="text-purple-800 font-bold text-[10px]">المكتسب لعام 2026 (Accrued)</div>
                    <div className="text-base sm:text-lg font-black text-purple-900 font-mono mt-1">
                      {formatDaysDisplay(accrualDays)}
                    </div>
                    <div className="text-[10px] text-purple-700 mt-0.5">بمعدل 2.5 يوم/شهر</div>
                  </div>

                  {compDays > 0 && (
                    <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200 text-center">
                      <div className="text-emerald-800 font-bold text-[10px]">أيام تعويضية (Compensatory)</div>
                      <div className="text-base sm:text-lg font-black text-emerald-900 font-mono mt-1">
                        +{formatDaysDisplay(compDays)}
                      </div>
                      <div className="text-[10px] text-emerald-700 mt-0.5">بديل عطل رسمية</div>
                    </div>
                  )}

                  <div className="p-3.5 bg-rose-50/70 rounded-xl border border-rose-200 text-center">
                    <div className="text-rose-800 font-bold text-[10px]">المستهلك (Taken Days)</div>
                    <div className="text-base sm:text-lg font-black text-rose-800 font-mono mt-1">
                      {formatDaysDisplay(empFifo.totalConsumed)}
                    </div>
                    <div className="text-[10px] text-rose-600 mt-0.5">إجمالي الأيام المخصومة</div>
                  </div>

                  <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200 text-center">
                    <div className="text-emerald-800 font-bold text-[10px]">الرصيد المتاح الصافي (Net Available)</div>
                    <div className="text-base sm:text-lg font-black text-emerald-900 font-mono mt-1">
                      {formatDaysDisplay(empFifo.netAvailable)}
                    </div>
                    <div className="text-[10px] text-emerald-700 mt-0.5">جاهز للاستخدام</div>
                  </div>
                </div>

                {/* Section 1: Active Allocations Queue */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                      <Award className="w-4 h-4 text-purple-700" />
                      <span>دفعات التخصيص والاستحقاق (مرتبة زمنياً FIFO - الأقدم يستهلك أولاً):</span>
                    </h4>
                    <span className="text-[11px] text-slate-500 font-mono font-bold">
                      {empFifo.allocations.length} دفعات مسجلة
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-bold">
                        <tr>
                          <th className="p-3">دفعة التخصيص (Allocation Batch)</th>
                          <th className="p-3 text-center">النوع</th>
                          <th className="p-3 text-center">تاريخ السريان</th>
                          <th className="p-3 text-center">المخصص</th>
                          <th className="p-3 text-center">المستهلك</th>
                          <th className="p-3 text-center">المتبقي</th>
                          <th className="p-3 text-center">نسبة الاستهلاك</th>
                          <th className="p-3 text-center">الحالة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {empFifo.allocations.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="p-6 text-center text-slate-400 font-bold">
                              لا توجد دفعات تخصيص مسجلة لهذا الموظف
                            </td>
                          </tr>) : (
                          empFifo.allocations.map((a, aIdx) => {
                            const total = a.numberOfDays || 0;
                            const consumed = a.consumedDays || 0;
                            const remaining = a.remainingDays ?? Math.max(0, total - consumed);
                            const percent = total > 0 ? Math.min(100, Math.round((consumed / total) * 100)) : 0;
                            const isFullyConsumed = remaining <= 0;
                            const isPartiallyConsumed = consumed > 0 && remaining > 0;

                            return (
                              <tr key={a.id || aIdx} className={aIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                <td className="p-3 font-bold text-slate-900">
                                  <div>{a.name}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">{a.id}</div>
                                </td>
                                <td className="p-3 text-center">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    a.allocationType === 'compensatory_off' || (a as any).allocationType === 'compensatory' || a.name?.includes('تعويضي') || a.name?.includes('بديل')
                                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                      : a.allocationType === 'regular' 
                                        ? 'bg-amber-100 text-amber-900 border border-amber-200' 
                                        : 'bg-purple-100 text-purple-900 border border-purple-200'
                                  }`}>
                                    {a.allocationType === 'compensatory_off' || (a as any).allocationType === 'compensatory' || a.name?.includes('تعويضي') || a.name?.includes('بديل')
                                      ? '🎁 يوم تعويضي (عطلة)'
                                      : a.allocationType === 'regular' 
                                        ? 'رصيد افتتاحي مرحل' 
                                        : 'استحقاق شهري (2.5)'}
                                  </span>
                                </td>
                                <td className="p-3 text-center font-mono text-slate-600">{a.dateFrom || '—'}</td>
                                <td className="p-3 text-center font-mono font-bold text-slate-900">{formatDaysDisplay(total)}</td>
                                <td className="p-3 text-center font-mono font-bold text-rose-700">
                                  {consumed > 0 ? formatDaysDisplay(consumed) : '0 يوم'}
                                </td>
                                <td className="p-3 text-center font-mono font-bold text-emerald-700">
                                  {formatDaysDisplay(remaining)}
                                </td>
                                <td className="p-3 text-center">
                                  <div className="w-20 mx-auto bg-slate-200 rounded-full h-2 overflow-hidden">
                                    <div 
                                      className={`h-full ${isFullyConsumed ? 'bg-slate-400' : isPartiallyConsumed ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                      style={{ width: `${percent}%` }}
                                    />
                                  </div>
                                  <span className="text-[9px] font-mono text-slate-500">{percent}%</span>
                                </td>
                                <td className="p-3 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    isFullyConsumed 
                                      ? 'bg-slate-100 text-slate-500 border border-slate-200' 
                                      : isPartiallyConsumed 
                                        ? 'bg-amber-50 text-amber-800 border border-amber-200' 
                                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  }`}>
                                    {isFullyConsumed ? 'مستهلك بالكامل' : isPartiallyConsumed ? 'مستهلك جزئياً' : 'متاح بالكامل'}
                                  </span>
                                </td>
                              </tr>);
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Section 2: FIFO Breakdown by Leave */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                      <FileText className="w-4 h-4 text-[#714B67]" />
                      <span>سجل استهلاك الإجازات للتخصيصات (Leave Requests FIFO Breakdown):</span>
                    </h4>
                    <span className="text-[11px] text-slate-500 font-mono font-bold">
                      {empFifo.breakdown.length} إجازات معتمدة
                    </span>
                  </div>

                  {empFifo.breakdown.length === 0 ? (
                    <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 font-bold">
                      لم يتم استهلاك أي إجازة سنوية بعد. رصيد الموظف كامل ومتاح للاستخدام.
                    </div>) : (
                    <div className="space-y-2.5">
                      {empFifo.breakdown.map((b, i) => (
                        <div key={i} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2 font-bold text-slate-900 text-xs border-b border-slate-200/70 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="bg-purple-100 text-purple-900 px-2 py-0.5 rounded text-[10px]">
                                إجازة #{i + 1}
                              </span>
                              <span>الفترة: <span className="font-mono font-normal">{b.leaveStartDate} إلى {b.leaveEndDate}</span></span>
                            </div>
                            <div className="flex items-center gap-2 font-mono text-xs">
                              <span className="text-slate-600">المدة: <strong>{b.totalDays} يوم</strong></span>
                              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                {formatDaysDisplay(b.paidDays)} مدفوع
                              </span>
                              {b.excessDays > 0 && (
                                <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                  {formatDaysDisplay(b.excessDays)} بدون راتب (تجاوز رصيد)
                                </span>)}
                            </div>
                          </div>

                          <div className="text-[11px] text-slate-700 space-y-1.5 pt-1">
                            <div className="font-bold text-slate-500 text-[10px]">الدفعات المستهلكة في هذه الإجازة:</div>
                            {b.allocationUsages.length === 0 ? (
                              <div className="text-rose-600 font-bold">لم تتوفر أرصدة مدفوعة لتغطية هذا الطلب.</div>) : (
                              b.allocationUsages.map((u, uIdx) => (
                                <div key={uIdx} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200 text-emerald-900">
                                  <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>
                                      تم خصم <strong>{formatDaysDisplay(u.daysUsed)}</strong> من دفعة: <strong className="text-purple-900">{u.allocationName}</strong>
                                    </span>
                                  </div>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    u.allocationType === 'regular' ? 'bg-amber-50 text-amber-800' : 'bg-purple-50 text-purple-800'
                                  }`}>
                                    {u.allocationType === 'regular' ? 'رصيد افتتاحي' : 'استحقاق شهري'}
                                  </span>
                                </div>))
                            )}
                          </div>
                        </div>))}
                    </div>)}
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <div className="text-[11px] text-slate-500">
                  نظام التوزيع الآلي وفق قانون العمل الكويتي (المادة 70) - Enterprise Time Off System (FIFO Ledger).
                </div>
                <button
                  onClick={() => setSelectedFifoEmployee(null)}
                  className="px-5 py-2 bg-[#714B67] hover:bg-[#5a3b52] text-white font-bold rounded-xl transition cursor-pointer shadow-xs"
                >
                  إغلاق الكشف
                </button>
              </div>
            </div>
          </div>);
      })()}

    </div>);
};
