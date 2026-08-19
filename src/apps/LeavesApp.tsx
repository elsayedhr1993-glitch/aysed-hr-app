import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { 
  LeaveRequest, Employee, Company, ViewMode, Contract, AttendanceRecord 
} from '../types';
import { supabase } from '../lib/supabase';
import { printDocument, exportElementToPdf } from '../utils/printUtils';
import { 
  calculateLeaveAccrualMonths, 
  calculateLeaveAccrual2026Details, 
  calculateAysedLeaveBalance, 
  getAysedSmartLeaveBalance, 
  get_aysed_official_balance, 
  calculateActualLeaveDays, 
  getCompensatedHolidays2026,
  cron_aysed_monthly_accrual
} from '../utils/kuwaitLaw';
import { LeaveSettlementCalculator } from '../components/LeaveSettlementCalculator';
import { 
  Calendar, Plus, CheckCircle2, XCircle, Clock, 
  Calculator, Save, FileText, Search, 
  History, Printer, User, ShieldCheck, Trash2, DollarSign, AlertTriangle,
  LayoutGrid, List, Filter, Eye, Download, Loader2, X, Send, Scale, RotateCcw
} from 'lucide-react';

export interface LeaveAllocation { 
  id: string; 
  employeeId: string; 
  leaveType: string; 
  year: string; 
  days: number; 
  notes: string; 
  status: 'APPROVED' | 'DRAFT'; 
}

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

  useEffect(() => {
    if (filterTab === 'BALANCES') setActiveSubTab('BALANCES');
    else if (filterTab === 'HISTORY_LOG') setActiveSubTab('HISTORY_LOG');
    else if (filterTab === 'SETTLEMENT') setActiveSubTab('SETTLEMENT');
  }, [filterTab]);

  const [openingBalanceInputs, setOpeningBalanceInputs] = useState<Record<string, number>>({});
  const [savedToastEmpId, setSavedToastEmpId] = useState<string | null>(null);
  const [localSearch, setLocalSearch] = useState<string>('');
  const [historyEmpIdFilter, setHistoryEmpIdFilter] = useState<string>('ALL');
  const [settlementEmpId, setSettlementEmpId] = useState<string | undefined>();
  const [yearFilter, setYearFilter] = useState<string>('ALL');
  const [employeeFilter, setEmployeeFilter] = useState<string>(initialEmployeeId);

  useEffect(() => {
    if (initialEmployeeId && initialEmployeeId !== 'ALL') {
      setEmployeeFilter(initialEmployeeId);
    }
  }, [initialEmployeeId]);

  const [stateFilter, setStateFilter] = useState<string>('ALL');

  const companyEmployees = (employees || []).filter(e => e.companyId === (activeCompany?.id || 'comp-1'));
  const companyLeaves = (leaves || []).filter(l => l.companyId === (activeCompany?.id || 'comp-1'));
  const activeSearchTerm = localSearch || searchTerm;

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

  const filteredCompanyEmployeesForBalances = companyEmployees.filter(emp => {
    return (emp.fullNameAr || '').includes(activeSearchTerm) || 
           (emp.employeeCode || '').includes(activeSearchTerm) || 
           (emp.jobTitle || '').includes(activeSearchTerm);
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

    if (!editingLeave.startDate || !editingLeave.endDate) {
      alert('يرجى تحديد تواريخ بداية ونهاية الإجازة');
      return;
    }

    const isDirectApproved = isDirectSayedApproval || statusOverride === 'APPROVED';
    const isOverrideActive = isDirectApproved || editingLeave.managerOverride;

    let diffDays = 1;
    if (editingLeave.startDate && editingLeave.endDate) {
      const start = new Date(editingLeave.startDate);
      const end = new Date(editingLeave.endDate);
      const diffTime = Math.max(0, end.getTime() - start.getTime());
      const roughDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
      if (type === 'ANNUAL' || type === 'SICK') {
        const { actualDays } = calculateActualLeaveDays(editingLeave.startDate, editingLeave.endDate);
        diffDays = actualDays > 0 ? actualDays : Math.max(1, roughDays);
      } else {
        diffDays = Math.max(1, roughDays);
      }
    }

    const isHist = editingLeave.isHistorical || false;
    const startYear = editingLeave.startDate ? new Date(editingLeave.startDate).getFullYear() : 2026;

    let paidDays = diffDays;
    let excessDays = 0;

    if (!isHist && type === 'ANNUAL') {
      const empData = employees.find(e => e.id === targetEmpId);
      let totalAllocated = 0;
      if (empData) {
        const accruedToDate = get_aysed_official_balance(empData);
        totalAllocated = (empData.openingLeaveBalance ?? empData.carriedOverLeave2025 ?? 0) + accruedToDate;
      }

      const takenAnnualDays = companyLeaves
        .filter(l => !l.isHistorical && l.employeeId === targetEmpId && l.status === 'APPROVED' && l.leaveType === 'ANNUAL' && (!editingLeave.id || l.id !== editingLeave.id))
        .reduce((sum, l) => sum + (l.totalDays || 0), 0);
        
      const netRemaining = Math.max(0, totalAllocated - takenAnnualDays);
      paidDays = Math.min(diffDays, netRemaining);
      excessDays = Math.max(0, diffDays - paidDays);
    }

    const finalPaidDays = editingLeave.paidDays !== undefined ? editingLeave.paidDays : paidDays;
    const finalExcessDays = editingLeave.excessDays !== undefined ? editingLeave.excessDays : excessDays;

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
    setEditingLeave(null);
  };

  const handleActionRefuse = async (leave: LeaveRequest) => {
    onUpdateLeaveStatus(
      leave.id, 
      'REJECTED', 
      'تم إلغاء/رفض الإجازة ورد الأيام للرصيد تلقائياً'
    );
  };

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

  const totalOpeningBalances = companyEmployees.reduce((sum, e) => {
    const val = openingBalanceInputs[e.id] !== undefined 
      ? openingBalanceInputs[e.id] 
      : (e.openingLeaveBalance ?? e.carriedOverLeave2025 ?? 0);
    return sum + val;
  }, 0);

  const totalAccrued2026 = companyEmployees.reduce((sum, e) => {
    return sum + calculateLeaveAccrualMonths(e.joinDate);
  }, 0);

  const totalTakenAnnualLeaves2026 = companyLeaves
    .filter(l => !l.isHistorical && l.status === 'APPROVED' && l.leaveType === 'ANNUAL')
    .reduce((sum, l) => sum + (l.totalDays || 0), 0);

  const totalNetAvailableBalance = (totalOpeningBalances + totalAccrued2026) - totalTakenAnnualLeaves2026;

  const historicalLeavesList = companyLeaves.filter(l => {
    if (historyEmpIdFilter !== 'ALL' && l.employeeId !== historyEmpIdFilter) return false;
    const emp = employees.find(e => e.id === l.employeeId);
    const empName = emp ? emp.fullNameAr : '';
    return empName.includes(activeSearchTerm) || (l.reason && l.reason.includes(activeSearchTerm));
  });

  const handleRunCronMonthlyAccrual = () => {
    const res = cron_aysed_monthly_accrual(companyEmployees);
    if (res.addedCount > 0) {
      toast.success(res.note || `تم تشغيل مهمة أودو (ir_cron_aysed_leave_accrual): تمت إضافة 2.5 يوم لعدد ${res.addedCount} موظف بنجاح.`);
    } else {
      toast(res.note || 'لم يتم إضافة رصيد.', { icon: 'ℹ️' });
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen text-slate-800" dir="rtl">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-[#714B67]" />
            <span>نظام إدارة الإجازات وتصفية المستحقات (Time Off & Settlement)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            إدارة ومتابعة طلبات الإجازات، الرصيد الافتتاحي، وحاسبة تصفية المستحقات وفق قانون العمل الكويتي
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleRunCronMonthlyAccrual}
            className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-sm flex items-center gap-1.5 transition cursor-pointer"
            title="تشغيل مهمة الاستحقاق الشهري للإجازات (ir_cron_aysed_leave_accrual)"
          >
            <Clock className="w-4 h-4 text-emerald-200" />
            <span>تشغيل Cron الاستحقاق الشهري</span>
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
                isHistorical: true,
                historicalYear: 2025,
                startDate: '2025-06-01',
                endDate: '2025-06-15',
                totalDays: 15,
                reason: 'تسجيل إجازة تاريخية قديمة في السجل الأرشيفي',
              });
            }}
            className="bg-purple-800 hover:bg-purple-900 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-sm flex items-center gap-1.5 transition cursor-pointer"
          >
            <History className="w-4 h-4" />
            <span>تسجيل إجازة أرشيفية</span>
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
          <span>طلبات الإجازات الجارية</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
            activeSubTab === 'REQUESTS' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {companyLeaves.filter(l => !l.isHistorical).length}
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
          <span>جدول الأرصدة والافتتاحي</span>
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
          <span>كشف حركة الموظف والأرشيف</span>
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

      {/* Sub-Tab 1: Requests */}
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
            <table className="w-full text-right text-xs">
              <thead className="bg-[#714B67] text-white font-bold">
                <tr>
                  <th className="p-3">الموظف</th>
                  <th className="p-3">نوع الإجازة</th>
                  <th className="p-3">الفترة</th>
                  <th className="p-3 text-center">المدة</th>
                  <th className="p-3">البيان</th>
                  <th className="p-3 text-center">الحالة</th>
                  <th className="p-3 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeaves.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 font-bold">
                      لا توجد طلبات إجازة مطابقة حالياً
                    </td>
                  </tr>
                ) : (
                  filteredLeaves.map((lev, index) => {
                    const emp = employees.find(e => e.id === lev.employeeId);
                    return (
                      <tr key={lev.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                        <td className="p-3 font-bold text-slate-900">{emp ? emp.fullNameAr : 'مجهول'}</td>
                        <td className="p-3">
                          <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-bold text-[11px]">
                            {lev.leaveType === 'ANNUAL' ? '🌴 سنوية' : lev.leaveType === 'SICK' ? '🏥 مرضية' : 'إجازة اعتيادية'}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[11px]">
                          {lev.startDate} إلى {lev.endDate}
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-[#714B67]">
                          {lev.totalDays} يوم
                        </td>
                        <td className="p-3 text-slate-600 truncate max-w-xs">{lev.reason}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            lev.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                            lev.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {lev.status === 'APPROVED' ? 'معتمدة' : lev.status === 'REJECTED' ? 'مرفوضة' : 'قيد المراجعة'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {lev.status === 'SUBMITTED' && (
                              <>
                                <button
                                  onClick={() => onUpdateLeaveStatus(lev.id, 'APPROVED')}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold transition cursor-pointer"
                                >
                                  اعتماد
                                </button>
                                <button
                                  onClick={() => onUpdateLeaveStatus(lev.id, 'REJECTED')}
                                  className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold transition cursor-pointer"
                                >
                                  رفض
                                </button>
                              </>
                            )}
                            {lev.status === 'APPROVED' && (
                              <button
                                onClick={() => handleActionRefuse(lev)}
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded text-[10px] font-bold transition cursor-pointer"
                              >
                                إلغاء ورد الرصيد
                              </button>
                            )}
                            <button
                              onClick={() => handleUnlink(lev)}
                              className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

      {/* Sub-Tab 2: Balances */}
      {activeSubTab === 'BALANCES' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="text-[11px] font-bold text-slate-500">إجمالي الموظفين</div>
              <div className="text-2xl font-black text-slate-800 font-mono mt-1">{companyEmployees.length} موظف</div>
            </div>
            <div className="bg-white rounded-xl border border-purple-200 bg-purple-50/30 p-4 shadow-sm">
              <div className="text-[11px] font-bold text-purple-900">المكتسب لعام 2026 (2.5 يوم/شهر)</div>
              <div className="text-2xl font-black text-purple-900 font-mono mt-1">{totalAccrued2026.toFixed(1)} يوم</div>
            </div>
            <div className="bg-white rounded-xl border border-emerald-200 bg-emerald-50/30 p-4 shadow-sm">
              <div className="text-[11px] font-bold text-emerald-900">إجمالي الرصيد الصافي المتاح</div>
              <div className="text-2xl font-black text-emerald-900 font-mono mt-1">{totalNetAvailableBalance.toFixed(1)} يوم</div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#714B67] text-white font-bold">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">الموظف</th>
                  <th className="p-3 text-center">الرصيد الافتتاحي</th>
                  <th className="p-3 text-center">مكتسب 2026</th>
                  <th className="p-3 text-center">المستهلك</th>
                  <th className="p-3 text-center">الرصيد الصافي</th>
                  <th className="p-3 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCompanyEmployeesForBalances.map((emp, idx) => {
                  const openingVal = openingBalanceInputs[emp.id] !== undefined 
                    ? openingBalanceInputs[emp.id] 
                    : (emp.openingLeaveBalance ?? emp.carriedOverLeave2025 ?? 0);
                  const accruedToDate = get_aysed_official_balance(emp);
                  const takenAnnualDays = companyLeaves
                    .filter(l => !l.isHistorical && l.employeeId === emp.id && l.status === 'APPROVED' && l.leaveType === 'ANNUAL')
                    .reduce((sum, l) => sum + (l.totalDays || 0), 0);
                  const netRemaining = (openingVal + accruedToDate) - takenAnnualDays;

                  return (
                    <tr key={emp.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                      <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{emp.fullNameAr}</div>
                        <div className="text-[10px] text-slate-500">{emp.jobTitle} • تعيين: {emp.joinDate}</div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <input
                            type="number"
                            step="0.5"
                            value={openingVal}
                            onChange={(e) => setOpeningBalanceInputs(prev => ({ ...prev, [emp.id]: parseFloat(e.target.value) || 0 }))}
                            className="w-16 border border-slate-300 rounded p-1 text-center font-mono font-bold text-xs"
                          />
                          <button
                            onClick={() => handleSaveOpeningBalance(emp, openingVal)}
                            className="bg-amber-600 hover:bg-amber-700 text-white p-1 rounded transition cursor-pointer"
                            title="حفظ"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-purple-900">{accruedToDate.toFixed(1)} يوم</td>
                      <td className="p-3 text-center font-mono font-bold text-rose-600">{takenAnnualDays.toFixed(1)} يوم</td>
                      <td className="p-3 text-center font-mono font-black text-emerald-700 text-sm">{netRemaining.toFixed(1)} يوم</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => {
                            setSettlementEmpId(emp.id);
                            setActiveSubTab('SETTLEMENT');
                          }}
                          className="bg-[#714B67] hover:bg-[#5a3b52] text-white text-[11px] font-bold px-2.5 py-1 rounded transition cursor-pointer flex items-center gap-1 mx-auto"
                        >
                          <Printer className="w-3.5 h-3.5 text-amber-300" />
                          <span>تسوية الإجازة</span>
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

      {/* Sub-Tab 3: Settlement Calculator */}
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

      {/* Sub-Tab 4: History Log */}
      {activeSubTab === 'HISTORY_LOG' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
            <span className="font-bold text-xs text-slate-800">أرشيف وسجل حركة الإجازات التاريخية ({historicalLeavesList.length} سجل)</span>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-right text-xs">
              <thead className="bg-purple-950 text-white font-bold">
                <tr>
                  <th className="p-3">السنة</th>
                  <th className="p-3">الموظف</th>
                  <th className="p-3">نوع الإجازة</th>
                  <th className="p-3">الفترة</th>
                  <th className="p-3 text-center">الأيام</th>
                  <th className="p-3">الملاحظات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historicalLeavesList.map((lev, idx) => {
                  const emp = employees.find(e => e.id === lev.employeeId);
                  return (
                    <tr key={lev.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                      <td className="p-3 font-mono font-bold text-purple-900">{lev.historicalYear || lev.startDate}</td>
                      <td className="p-3 font-bold text-slate-900">{emp ? emp.fullNameAr : 'مجهول'}</td>
                      <td className="p-3">{lev.leaveType}</td>
                      <td className="p-3 font-mono">{lev.startDate} إلى {lev.endDate}</td>
                      <td className="p-3 text-center font-mono font-bold text-purple-700">{lev.totalDays} يوم</td>
                      <td className="p-3 text-slate-600">{lev.reason}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-Tab 5: Holidays */}
      {activeSubTab === 'HOLIDAYS' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#714B67] text-white font-bold">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">تاريخ العطلة</th>
                <th className="p-3">المناسبة</th>
                <th className="p-3 text-center">النوع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {getCompensatedHolidays2026().map((h, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                  <td className="p-3 font-mono text-slate-400">{i + 1}</td>
                  <td className="p-3 font-mono font-bold text-slate-800">{h.date}</td>
                  <td className="p-3 font-bold text-[#714B67]">{h.name}</td>
                  <td className="p-3 text-center">
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded font-bold">
                      عطلة رسمية مدفوعة الأجر
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      {editingLeave && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-300 overflow-hidden">
            <header className="p-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">تسجيل طلب إجازة</h3>
              <button onClick={() => setEditingLeave(null)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">×</button>
            </header>
            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">الموظف *</label>
                <select
                  value={editingLeave.employeeId || ''}
                  onChange={e => setEditingLeave({ ...editingLeave, employeeId: e.target.value })}
                  className="w-full border border-slate-300 rounded p-2 text-xs font-bold"
                >
                  <option value="">-- اختر الموظف --</option>
                  {companyEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.fullNameAr} ({emp.jobTitle})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">من تاريخ *</label>
                  <input
                    type="date"
                    value={editingLeave.startDate || ''}
                    onChange={e => setEditingLeave({ ...editingLeave, startDate: e.target.value })}
                    className="w-full border border-slate-300 rounded p-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">إلى تاريخ *</label>
                  <input
                    type="date"
                    value={editingLeave.endDate || ''}
                    onChange={e => setEditingLeave({ ...editingLeave, endDate: e.target.value })}
                    className="w-full border border-slate-300 rounded p-2 text-xs font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">السبب / البيان</label>
                <textarea
                  rows={3}
                  value={editingLeave.reason || ''}
                  onChange={e => setEditingLeave({ ...editingLeave, reason: e.target.value })}
                  className="w-full border border-slate-300 rounded p-2 text-xs"
                />
              </div>
              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  onClick={() => setEditingLeave(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded"
                >
                  إلغاء
                </button>
                <button
                  onClick={() => handleSave('APPROVED')}
                  className="px-4 py-2 bg-[#714B67] hover:bg-[#5a3b52] text-white font-bold rounded"
                >
                  حفظ واعتماد
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
