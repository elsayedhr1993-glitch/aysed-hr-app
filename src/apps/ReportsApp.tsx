import React, { useState, useMemo } from 'react';
import { 
  BarChart3, Table as PivotIcon, List as ListIcon, PieChart as GraphIcon,
  Download, Printer, RefreshCw, Sparkles, Filter, Layers, 
  Banknote, Calendar, Clock, ShieldCheck, Users, FileSpreadsheet,
  AlertTriangle, CheckCircle2, ChevronRight, FileText, Briefcase
} from 'lucide-react';
import { 
  Employee, Contract, LeaveRequest, AttendanceRecord, 
  Payslip, DocumentItem, CustodyItem, LoanAdvance, Company, ViewMode
} from '../types';
import { get_aysed_official_balance, calculate2026AccruedDays, getGlobalOpeningBalance, getGlobalAccrued2026, isEmployeeHiredIn2026OrLater } from '../utils/kuwaitLaw';
import { OdooSearchBar, FilterOption, GroupByOption, MeasureOption } from '../components/reports/OdooSearchBar';
import { OdooPivotView, PivotRowData } from '../components/reports/OdooPivotView';
import { OdooGraphView } from '../components/reports/OdooGraphView';
import { OdooReportListView, ListColumn } from '../components/reports/OdooReportListView';
import { OfficialReportPrintModal } from '../components/reports/OfficialReportPrintModal';
import { OdooReportPrintWizard, PrintWizardConfig } from '../components/reports/OdooReportPrintWizard';
import { OdooScopeBar } from '../components/reports/OdooScopeBar';
import * as XLSX from 'xlsx';

export type ReportCategory = 
  | 'PAYROLL_ANALYSIS'
  | 'LEAVE_BALANCE'
  | 'ATTENDANCE_ANALYSIS'
  | 'MOH_DOCS_EXPIRY'
  | 'WORKFORCE_DEMO';

interface ReportsAppProps {
  employees: Employee[];
  contracts: Contract[];
  leaves: LeaveRequest[];
  attendance: AttendanceRecord[];
  payslips: Payslip[];
  documents: DocumentItem[];
  custodies?: CustodyItem[];
  loans?: LoanAdvance[];
  activeCompany?: Company;
}

export const ReportsApp: React.FC<ReportsAppProps> = ({
  employees = [],
  contracts = [],
  leaves = [],
  attendance = [],
  payslips = [],
  documents = [],
  custodies = [],
  loans = [],
  activeCompany,
}) => {
  // Navigation & View Mode
  const [activeCategory, setActiveCategory] = useState<ReportCategory>('PAYROLL_ANALYSIS');
  const [viewMode, setViewMode] = useState<'PIVOT' | 'GRAPH' | 'LIST'>('PIVOT');

  // Employee & Department Scope Filters
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | undefined>(undefined);
  const [selectedDepartment, setSelectedDepartment] = useState<string | undefined>(undefined);

  // Search, Filters & Aggregation state
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [activeGroupBy, setActiveGroupBy] = useState<string>('department');
  const [activeMeasures, setActiveMeasures] = useState<string[]>([]);
  const [isPrintWizardOpen, setIsPrintWizardOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [wizardConfig, setWizardConfig] = useState<PrintWizardConfig>({
    targetScope: 'ALL',
    periodType: 'SPECIFIC_MONTH',
    selectedMonth: new Date().toISOString().slice(0, 7),
    includeHeaderLogo: true,
    includeSignatures: true,
    includeLegalStatement: true,
    orientation: 'PORTRAIT',
    detailLevel: 'DETAILED',
  });

  // Active Company filtering
  const companyEmployees = useMemo(() => {
    return employees.filter(e => !activeCompany || e.companyId === activeCompany.id || !e.companyId);
  }, [employees, activeCompany]);

  const companyContracts = useMemo(() => {
    return contracts.filter(c => !activeCompany || c.companyId === activeCompany.id || !c.companyId);
  }, [contracts, activeCompany]);

  const companyLeaves = useMemo(() => {
    return leaves.filter(l => !activeCompany || l.companyId === activeCompany.id || !l.companyId);
  }, [leaves, activeCompany]);

  const companyAttendance = useMemo(() => {
    return attendance.filter(a => !activeCompany || a.companyId === activeCompany.id || !a.companyId);
  }, [attendance, activeCompany]);

  const companyPayslips = useMemo(() => {
    return payslips.filter(p => !activeCompany || p.companyId === activeCompany.id || !p.companyId);
  }, [payslips, activeCompany]);

  const companyDocuments = useMemo(() => {
    return documents.filter(d => !activeCompany || d.companyId === activeCompany.id || !d.companyId);
  }, [documents, activeCompany]);

  // Extract distinct departments
  const departments = useMemo(() => {
    const depts = new Set<string>();
    companyEmployees.forEach(e => {
      if (e.department) depts.add(e.department);
    });
    return Array.from(depts).sort();
  }, [companyEmployees]);

  // Quick Direct Single Employee Print Handler
  const handleQuickPrintSingle = (empId: string) => {
    setWizardConfig({
      targetScope: 'EMPLOYEE',
      selectedEmployeeId: empId,
      periodType: 'SPECIFIC_MONTH',
      selectedMonth: new Date().toISOString().slice(0, 7),
      includeHeaderLogo: true,
      includeSignatures: true,
      includeLegalStatement: true,
      orientation: 'PORTRAIT',
      detailLevel: 'DETAILED',
    });
    setIsPrintModalOpen(true);
  };

  // Handle Wizard Confirmations
  const handleConfirmPrint = (config: PrintWizardConfig) => {
    setWizardConfig(config);
    setIsPrintWizardOpen(false);
    setIsPrintModalOpen(true);
  };

  const handleConfirmExportXLSX = (config: PrintWizardConfig) => {
    setWizardConfig(config);
    setIsPrintWizardOpen(false);
    // Trigger direct print modal briefly or directly download
    setIsPrintModalOpen(true);
  };
  const reportConfigs: Record<ReportCategory, {
    title: string;
    description: string;
    icon: any;
    availableFilters: FilterOption[];
    availableGroupBy: GroupByOption[];
    availableMeasures: MeasureOption[];
    defaultMeasures: string[];
    defaultGroupBy: string;
  }> = {
    PAYROLL_ANALYSIS: {
      title: 'مركز التقارير والتحليلات المحورية (Pivot Analytics)',
      description: 'تحليل بنود الرواتب، البدلات، وصافي التحويلات البنكية للمنشأة الطبية (الـ 19 موظفاً)',
      icon: Banknote,
      availableFilters: [
        { id: 'active_emp', label: 'الموظفون على رأس العمل' },
        { id: 'kuwaiti', label: 'المواطنون الكويتيون' },
        { id: 'expats', label: 'العمالة الوافدة (مادة 18)' },
        { id: 'high_salary', label: 'رواتب تفوق 1, د.ك' },
      ],
      availableGroupBy: [
        { id: 'department', label: 'القسم / الإدارة', field: 'department' },
        { id: 'jobTitle', label: 'المسمى الوظيفي', field: 'jobTitle' },
        { id: 'nationality', label: 'الجنسية', field: 'nationality' },
        { id: 'bankName', label: 'البنك المعتمد', field: 'bankName' },
      ],
      availableMeasures: [
        { id: 'count', label: 'عدد الموظفين', field: 'count' },
        { id: 'basicSalary', label: 'إجمالي الراتب الأساسي', field: 'basicSalary', isCurrency: true },
        { id: 'allowances', label: 'إجمالي البدلات', field: 'allowances', isCurrency: true },
        { id: 'grossSalary', label: 'إجمالي الراتب الشامل', field: 'grossSalary', isCurrency: true },
        { id: 'pifss', label: 'التأمينات الاجتماعية', field: 'pifss', isCurrency: true },
        { id: 'netSalary', label: 'صافي الراتب للتحويل', field: 'netSalary', isCurrency: true },
      ],
      defaultMeasures: ['count', 'basicSalary', 'allowances', 'grossSalary', 'netSalary'],
      defaultGroupBy: 'department',
    },
    LEAVE_BALANCE: {
      title: 'تقرير رصيد وحركة الإجازات (Leave Balance Report)',
      description: 'كشف استحقاق الإجازات (2.5 يوم/شهر)، ، الأيام المستهلكة، والرصيد المتبقي',
      icon: Calendar,
      availableFilters: [
        { id: 'active_only', label: 'الموظفون على رأس العمل' },
        { id: 'has_leaves', label: 'موظفون استهلكوا إجازات' },
        { id: 'no_leaves', label: 'موظفون لم يستهلكوا إجازات' },
        { id: 'low_balance', label: 'رصيد متبقي أقل من 1 أيام' },
      ],
      availableGroupBy: [
        { id: 'department', label: 'القسم / الإدارة', field: 'department' },
        { id: 'jobTitle', label: 'المسمى الوظيفي', field: 'jobTitle' },
        { id: 'nationality', label: 'الجنسية', field: 'nationality' },
        { id: 'leaveStatus', label: 'حالة الرصيد', field: 'leaveStatus' },
      ],
      availableMeasures: [
        { id: 'count', label: 'عدد الموظفين', field: 'count' },
        { id: 'carriedOver', label: 'الافتتاحي (مرحل)', field: 'carriedOver', unit: 'يوم' },
        { id: 'accruedDays', label: 'المكتسب لعام 2026', field: 'accruedDays', unit: 'يوم' },
        { id: 'totalAvailable', label: 'إجمالي الرصيد المتاح', field: 'totalAvailable', unit: 'يوم' },
        { id: 'totalDays', label: 'الأيام المستهلكة الإجمالية', field: 'totalDays', unit: 'يوم' },
        { id: 'paidConsumed', label: 'المستهلك المدفوع', field: 'paidConsumed', unit: 'يوم' },
        { id: 'remainingDays', label: 'صافي الرصيد المتبقي', field: 'remainingDays', unit: 'يوم' },
        { id: 'excessUnpaid', label: 'إجازة غير مدفوعة (خصم راتب)', field: 'excessUnpaid', unit: 'يوم' },
      ],
      defaultMeasures: ['count', 'carriedOver', 'accruedDays', 'totalAvailable', 'totalDays', 'paidConsumed', 'remainingDays', 'excessUnpaid'],
      defaultGroupBy: 'department',
    },
    ATTENDANCE_ANALYSIS: {
      title: 'تقرير الحضور وساعات التأخير (Attendance Analysis)',
      description: 'تحليل ساعات العمل الفعلية، التأخير الصباحي بالدقائق، ساعات العمل الإضافي، ومعدلات الانضباط',
      icon: Clock,
      availableFilters: [
        { id: 'late_only', label: 'حالات التأخير الصباحي' },
        { id: 'overtime_only', label: 'ساعات العمل الإضافي' },
        { id: 'present_only', label: 'الحضور الفعلي' },
      ],
      availableGroupBy: [
        { id: 'department', label: 'القسم / الإدارة', field: 'department' },
        { id: 'status', label: 'حالة الدوام', field: 'status' },
        { id: 'employee', label: 'الموظف', field: 'employee' },
      ],
      availableMeasures: [
        { id: 'count', label: 'عدد الأيام المسجلة', field: 'count' },
        { id: 'workHours', label: 'إجمالي ساعات العمل', field: 'workHours', unit: 'ساعة' },
        { id: 'overtimeHours', label: 'ساعات العمل الإضافي', field: 'overtimeHours', unit: 'ساعة' },
        { id: 'latenessMinutes', label: 'إجمالي دقائق التأخير', field: 'latenessMinutes', unit: 'دقيقة' },
      ],
      defaultMeasures: ['count', 'workHours', 'overtimeHours', 'latenessMinutes'],
      defaultGroupBy: 'department',
    },
    MOH_DOCS_EXPIRY: {
      title: 'تقرير انتهاء التراخيص والوثائق الرسمية (MOH & Expiry Analysis)',
      description: 'متابعة صلاحية تراخيص وزارة الصحة، الإقامات، البطاقات المدنية، وجوازات السفر مع التنبيهات',
      icon: ShieldCheck,
      availableFilters: [
        { id: 'expired', label: 'وثائق منتهية الصلاحية' },
        { id: 'expiring_3', label: 'تنتهي خلال 3 يوماً (عاجل)' },
        { id: 'expiring_6', label: 'تنتهي خلال 6 يوماً' },
        { id: 'moh_only', label: 'تراخيص وزارة الصحة MOH' },
        { id: 'residency_only', label: 'إقامات العمل مادة 18' },
      ],
      availableGroupBy: [
        { id: 'category', label: 'نوع المستند / الترخيص', field: 'category' },
        { id: 'urgency', label: 'مستوى الاستعجال', field: 'urgency' },
        { id: 'department', label: 'القسم', field: 'department' },
      ],
      availableMeasures: [
        { id: 'count', label: 'عدد الوثائق', field: 'count' },
        { id: 'expiredCount', label: 'منتهية الصلاحية', field: 'expiredCount' },
        { id: 'urgentCount', label: 'تنتهي خلال 3 يوم', field: 'urgentCount' },
      ],
      defaultMeasures: ['count', 'expiredCount', 'urgentCount'],
      defaultGroupBy: 'category',
    },
    WORKFORCE_DEMO: {
      title: 'تقرير القوى العاملة ونسب التكويت (Workforce Demographics)',
      description: 'توزيع الجنسيات، الهرم الوظيفي، احتساب نسبة التكويت الرسمية المعتمدة لدى القوى العاملة PAM',
      icon: Users,
      availableFilters: [
        { id: 'active_only', label: 'الموظفون النشطون' },
        { id: 'kuwaiti_only', label: 'المواطنون الكويتيون' },
        { id: 'medical_staff', label: 'الكوادر الطبية والفنية' },
      ],
      availableGroupBy: [
        { id: 'nationality', label: 'الجنسية', field: 'nationality' },
        { id: 'department', label: 'القسم / الإدارة', field: 'department' },
        { id: 'gender', label: 'الجنس', field: 'gender' },
        { id: 'residencyType', label: 'نوع الإقامة / المادة', field: 'residencyType' },
      ],
      availableMeasures: [
        { id: 'count', label: 'عدد الموظفين', field: 'count' },
        { id: 'totalSalaries', label: 'كتلة الأجور الإجمالية', field: 'totalSalaries', isCurrency: true },
      ],
      defaultMeasures: ['count', 'totalSalaries'],
      defaultGroupBy: 'nationality',
    },
  };

  const currentConfig = reportConfigs[activeCategory];

  // Initialize measures and group by when category changes
  const effectiveMeasures = useMemo(() => {
    if (activeMeasures.length > 0) {
      // Return only valid measures for this config
      const valid = currentConfig.availableMeasures.filter(m => activeMeasures.includes(m.id));
      if (valid.length > 0) return valid;
    }
    return currentConfig.availableMeasures.filter(m => currentConfig.defaultMeasures.includes(m.id));
  }, [activeCategory, activeMeasures, currentConfig]);

  const effectiveGroupBy = activeGroupBy || currentConfig.defaultGroupBy;

  const handleToggleFilter = (filterId: string) => {
    setActiveFilters(prev => 
      prev.includes(filterId) ? prev.filter(f => f !== filterId) : [...prev, filterId]
    );
  };

  const handleToggleMeasure = (measureId: string) => {
    setActiveMeasures(prev => {
      if (prev.includes(measureId)) {
        if (prev.length <= 1) return prev; // Keep at least one
        return prev.filter(m => m !== measureId);
      }
      return [...prev, measureId];
    });
  };

  const handleClearAll = () => {
    setActiveFilters([]);
    setActiveGroupBy(currentConfig.defaultGroupBy);
    setActiveMeasures(currentConfig.defaultMeasures);
    setSearchTerm('');
    setSelectedEmployeeId(undefined);
    setSelectedDepartment(undefined);
  };

  // Helper date diff calculator for documents
  const getDaysUntilExpiry = (expiryDateStr?: string) => {
    if (!expiryDateStr) return 999;
    const expiry = new Date(expiryDateStr);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1 * 6 * 6 * 24));
  };

  // ------------------------------------------------------------------------------------------------
  // AGGREGATION & DATA PREPARATION ENGINE
  // ------------------------------------------------------------------------------------------------

  // 1. PAYROLL DATA
  const payrollAggregated = useMemo(() => {
    let list = companyEmployees.map(emp => {
      const contract = companyContracts.find(c => c.employeeId === emp.id && c.status === 'RUNNING') ||
                       companyContracts.find(c => c.employeeId === emp.id) || {
                         basicSalary: 45,
                         housingAllowance: 1,
                         transportAllowance: 5,
                         otherAllowance: 0,
                         contractType: 'INDEFINITE'
                       };

      const basic = contract.basicSalary || 0;
      const allowances = (contract.housingAllowance || 0) + (contract.transportAllowance || 0) + (contract.otherAllowance || 0);
      const gross = basic + allowances;
      const isKuwaiti = emp.isKuwaiti || emp.nationality?.includes('كويت') || false;
      const pifss = 0;
      const net = gross;

      return {
        id: emp.id,
        employeeCode: emp.employeeCode,
        fullNameAr: emp.fullNameAr,
        civilId: emp.civilId,
        department: emp.department || 'إدارة عامة',
        jobTitle: emp.jobTitle || 'موظف',
        nationality: emp.nationality || 'غير محدد',
        bankName: emp.bankName || 'بنك الكويت الوطني (NBK)',
        iban: emp.iban || 'KWNBK',
        basicSalary: basic,
        allowances: allowances,
        grossSalary: gross,
        pifss: pifss,
        netSalary: net,
        status: emp.status,
        isKuwaiti: isKuwaiti,
      };
    });

    // Apply Employee & Department Scope Filters
    if (selectedDepartment && selectedDepartment !== 'ALL') {
      list = list.filter(item => item.department === selectedDepartment);
    }
    if (selectedEmployeeId) {
      list = list.filter(item => item.id === selectedEmployeeId);
    }

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(item => 
        item.fullNameAr.toLowerCase().includes(term) ||
        item.civilId.includes(term) ||
        item.employeeCode.toLowerCase().includes(term) ||
        item.department.toLowerCase().includes(term) ||
        item.jobTitle.toLowerCase().includes(term)
      );
    }

    // Apply filters
    if (activeFilters.includes('active_emp')) {
      list = list.filter(i => i.status === 'ACTIVE');
    }
    if (activeFilters.includes('kuwaiti')) {
      list = list.filter(i => i.isKuwaiti);
    }
    if (activeFilters.includes('expats')) {
      list = list.filter(i => !i.isKuwaiti);
    }
    if (activeFilters.includes('high_salary')) {
      list = list.filter(i => i.grossSalary >= 1);
    }

    // Grouping
    const groups: Record<string, { label: string; items: typeof list; values: Record<string, number> }> = {};

    list.forEach(item => {
      const key = (item as any)[effectiveGroupBy] || 'أخرى / غير محدد';
      if (!groups[key]) {
        groups[key] = {
          label: key,
          items: [],
          values: {
            count: 0,
            basicSalary: 0,
            allowances: 0,
            grossSalary: 0,
            pifss: 0,
            netSalary: 0,
          },
        };
      }
      groups[key].items.push(item);
      groups[key].values.count += 1;
      groups[key].values.basicSalary += item.basicSalary;
      groups[key].values.allowances += item.allowances;
      groups[key].values.grossSalary += item.grossSalary;
      groups[key].values.pifss += item.pifss;
      groups[key].values.netSalary += item.netSalary;
    });

    const pivotRows: PivotRowData[] = Object.keys(groups).map(key => {
      const g = groups[key];
      return {
        id: `payroll-group-${key}`,
        label: g.label,
        recordsCount: g.values.count,
        values: g.values,
        children: g.items.map(child => ({
          id: `child-${child.id}`,
          label: child.fullNameAr,
          subLabel: child.jobTitle,
          recordsCount: 1,
          values: {
            count: 1,
            basicSalary: child.basicSalary,
            allowances: child.allowances,
            grossSalary: child.grossSalary,
            pifss: child.pifss,
            netSalary: child.netSalary,
          },
        })),
      };
    });

    const grandTotal = {
      count: list.length,
      basicSalary: list.reduce((a, b) => a + (b.basicSalary || 0), 0),
      allowances: list.reduce((a, b) => a + (b.allowances || 0), 0),
      grossSalary: list.reduce((a, b) => a + (b.grossSalary || 0), 0),
      pifss: list.reduce((a, b) => a + (b.pifss || 0), 0),
      netSalary: list.reduce((a, b) => a + (b.netSalary || 0), 0),
    };

    return { list, pivotRows, grandTotal };
  }, [companyEmployees, companyContracts, searchTerm, activeFilters, effectiveGroupBy, selectedEmployeeId, selectedDepartment]);

  // 2. LEAVE BALANCE DATA (Complete Employee Balance Ledger & Movements)
  const leavesAggregated = useMemo(() => {
    let list = companyEmployees.map(emp => {
      const isJoinedIn2026OrLater = isEmployeeHiredIn2026OrLater(emp);
      const opening = getGlobalOpeningBalance(emp);
      const accrued = getGlobalAccrued2026(emp);
      const totalAvailable = opening + accrued;
      
      const empLeaves = companyLeaves.filter(
        l => !l.isHistorical && l.employeeId === emp.id && (l.status === 'APPROVED' || (l.status as string) === 'VALIDATED')
      );
      const rawTakenDays = empLeaves.reduce((sum, l) => sum + (l.totalDays || 0), 0);
      const totalTakenDays = rawTakenDays;
      
      const paidConsumed = Math.min(totalTakenDays, totalAvailable);
      const remaining = Math.max(0, totalAvailable - totalTakenDays);
      const excessUnpaid = Math.max(0, totalTakenDays - totalAvailable);

      const leaveStatus = remaining >= 15 ? 'رصيد كافٍ' : remaining > 0 ? 'رصيد منخفض' : 'رصيد مصفّر وتجاوز (إجازة بدون راتب)';

      return {
        id: `emp-leave-balance-${emp.id}`,
        employeeId: emp.id,
        employeeName: emp.fullNameAr,
        fullNameAr: emp.fullNameAr,
        employeeCode: emp.employeeCode,
        civilId: emp.civilId,
        department: emp.department || 'الموارد البشرية والإدارة',
        jobTitle: emp.jobTitle || 'موظف',
        nationality: emp.nationality || 'غير محدد',
        carriedOver: opening,
        accruedDays: accrued,
        totalAvailable: totalAvailable,
        totalDays: totalTakenDays,
        paidConsumed: paidConsumed,
        remainingDays: remaining,
        excessUnpaid: excessUnpaid,
        leaveStatus: leaveStatus,
        status: emp.status,
        leavesCount: empLeaves.length,
        leaves: empLeaves,
      };
    });

    // Apply Employee & Department Scope Filters
    if (selectedDepartment && selectedDepartment !== 'ALL') {
      list = list.filter(item => item.department === selectedDepartment);
    }
    if (selectedEmployeeId) {
      list = list.filter(item => item.employeeId === selectedEmployeeId);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(item => 
        item.employeeName.toLowerCase().includes(term) ||
        item.employeeCode.toLowerCase().includes(term) ||
        item.department.toLowerCase().includes(term) ||
        item.jobTitle.toLowerCase().includes(term)
      );
    }

    if (activeFilters.includes('active_only')) {
      list = list.filter(i => i.status === 'ACTIVE');
    }
    if (activeFilters.includes('has_leaves')) {
      list = list.filter(i => i.totalDays > 0);
    }
    if (activeFilters.includes('no_leaves')) {
      list = list.filter(i => i.totalDays === 0);
    }
    if (activeFilters.includes('low_balance')) {
      list = list.filter(i => i.remainingDays < 1);
    }

    const groups: Record<string, { label: string; items: typeof list; values: Record<string, number> }> = {};

    list.forEach(item => {
      const key = (item as any)[effectiveGroupBy] || item.department || 'عام';
      if (!groups[key]) {
        groups[key] = {
          label: key,
          items: [],
          values: { count: 0, carriedOver: 0, accruedDays: 0, totalAvailable: 0, totalDays: 0, paidConsumed: 0, remainingDays: 0, excessUnpaid: 0 },
        };
      }
      groups[key].items.push(item);
      groups[key].values.count += 1;
      groups[key].values.carriedOver += (item.carriedOver || 0);
      groups[key].values.accruedDays += item.accruedDays;
      groups[key].values.totalAvailable += item.totalAvailable;
      groups[key].values.totalDays += item.totalDays;
      groups[key].values.paidConsumed += item.paidConsumed;
      groups[key].values.remainingDays += item.remainingDays;
      groups[key].values.excessUnpaid += item.excessUnpaid;
    });

    const pivotRows: PivotRowData[] = Object.keys(groups).map(key => {
      const g = groups[key];
      return {
        id: `leave-group-${key}`,
        label: g.label,
        recordsCount: g.values.count,
        values: g.values,
        children: g.items.map(child => ({
          id: `child-${child.employeeId}`,
          label: `${child.employeeName} (${child.employeeCode})`,
          subLabel: `${child.jobTitle} • رصيد متبقي: ${child.remainingDays} يوم • غير مدفوعة: ${child.excessUnpaid} يوم`,
          recordsCount: 1,
          values: {
            count: 1,
            carriedOver: child.carriedOver || 0,
            accruedDays: child.accruedDays,
            totalAvailable: child.totalAvailable,
            totalDays: child.totalDays,
            paidConsumed: child.paidConsumed,
            remainingDays: child.remainingDays,
            excessUnpaid: child.excessUnpaid,
          },
        })),
      };
    });

    const grandTotal = {
      count: list.length,
      carriedOver: list.reduce((a, b) => a + (b.carriedOver || 0), 0),
      accruedDays: list.reduce((a, b) => a + b.accruedDays, 0),
      totalAvailable: list.reduce((a, b) => a + b.totalAvailable, 0),
      totalDays: list.reduce((a, b) => a + b.totalDays, 0),
      paidConsumed: list.reduce((a, b) => a + b.paidConsumed, 0),
      remainingDays: list.reduce((a, b) => a + b.remainingDays, 0),
      excessUnpaid: list.reduce((a, b) => a + b.excessUnpaid, 0),
    };

    return { list, pivotRows, grandTotal };
  }, [companyLeaves, companyEmployees, searchTerm, activeFilters, effectiveGroupBy, selectedEmployeeId, selectedDepartment]);

  // 3. ATTENDANCE DATA
  const attendanceAggregated = useMemo(() => {
    let list = companyAttendance.map(att => {
      const emp = companyEmployees.find(e => e.id === att.employeeId);
      const statusAr = 
        att.status === 'PRESENT' ? 'حاضر' :
        att.status === 'LATE' ? 'متأخر' :
        att.status === 'ON_LEAVE' ? 'في إجازة' : 'غائب';

      return {
        id: att.id,
        employeeId: att.employeeId,
        employeeName: emp?.fullNameAr || 'موظف',
        employeeCode: emp?.employeeCode || 'EMP',
        department: emp?.department || 'إدارة العمليات',
        date: att.date,
        checkIn: att.checkIn || '8:',
        checkOut: att.checkOut || '16:',
        workHours: att.workHours || 8,
        overtimeHours: att.overtimeHours || 0,
        latenessMinutes: att.latenessMinutes || 0,
        status: statusAr,
        rawStatus: att.status,
      };
    });

    // Apply Employee & Department Scope Filters
    if (selectedDepartment && selectedDepartment !== 'ALL') {
      list = list.filter(item => item.department === selectedDepartment);
    }
    if (selectedEmployeeId) {
      list = list.filter(item => item.employeeId === selectedEmployeeId);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(i => 
        i.employeeName.toLowerCase().includes(term) ||
        i.department.toLowerCase().includes(term) ||
        i.date.includes(term)
      );
    }

    if (activeFilters.includes('late_only')) {
      list = list.filter(i => i.latenessMinutes > 0 || i.rawStatus === 'LATE');
    }
    if (activeFilters.includes('overtime_only')) {
      list = list.filter(i => i.overtimeHours > 0);
    }
    if (activeFilters.includes('present_only')) {
      list = list.filter(i => i.rawStatus === 'PRESENT' || i.rawStatus === 'LATE');
    }

    const groups: Record<string, { label: string; items: typeof list; values: Record<string, number> }> = {};

    list.forEach(item => {
      const key = (item as any)[effectiveGroupBy] || 'عام';
      if (!groups[key]) {
        groups[key] = {
          label: key,
          items: [],
          values: { count: 0, workHours: 0, overtimeHours: 0, latenessMinutes: 0 },
        };
      }
      groups[key].items.push(item);
      groups[key].values.count += 1;
      groups[key].values.workHours += item.workHours;
      groups[key].values.overtimeHours += item.overtimeHours;
      groups[key].values.latenessMinutes += item.latenessMinutes;
    });

    const pivotRows: PivotRowData[] = Object.keys(groups).map(key => {
      const g = groups[key];
      return {
        id: `att-group-${key}`,
        label: g.label,
        recordsCount: g.values.count,
        values: g.values,
        children: g.items.map(child => ({
          id: `child-${child.id}`,
          label: `${child.employeeName} (${child.date})`,
          subLabel: `${child.checkIn} - ${child.checkOut}`,
          recordsCount: 1,
          values: {
            count: 1,
            workHours: child.workHours,
            overtimeHours: child.overtimeHours,
            latenessMinutes: child.latenessMinutes,
          },
        })),
      };
    });

    const grandTotal = {
      count: list.length,
      workHours: list.reduce((a, b) => a + b.workHours, 0),
      overtimeHours: list.reduce((a, b) => a + b.overtimeHours, 0),
      latenessMinutes: list.reduce((a, b) => a + b.latenessMinutes, 0),
    };

    return { list, pivotRows, grandTotal };
  }, [companyAttendance, companyEmployees, searchTerm, activeFilters, effectiveGroupBy, selectedEmployeeId, selectedDepartment]);

  // 4. MOH & DOCUMENTS EXPIRY DATA
  const docsAggregated = useMemo(() => {
    // Collect both explicit document items + employee personal licenses (MOH, CivilID, Passport, Residency)
    const allDocRecords: any[] = [];

    // 1. Employee intrinsic official documents
    companyEmployees.forEach(emp => {
      if (emp.mohLicenseNo || emp.mohLicenseExpiry) {
        const days = getDaysUntilExpiry(emp.mohLicenseExpiry);
        allDocRecords.push({
          id: `emp-moh-${emp.id}`,
          employeeId: emp.id,
          title: `ترخيص وزارة الصحة (MOH: ${emp.mohLicenseNo || 'قيد التجديد'})`,
          category: 'ترخيص وزارة الصحة (MOH)',
          employeeName: emp.fullNameAr,
          department: emp.department || 'كادر طبي',
          documentNumber: emp.mohLicenseNo || '—',
          expiryDate: emp.mohLicenseExpiry || '2026-12-31',
          daysRemaining: days,
          urgency: days < 0 ? 'منتهي' : days <= 3 ? 'عاجل (3 يوم)' : days <= 6 ? 'تنبيه (6 يوم)' : 'ساري',
          isExpired: days < 0,
          isUrgent: days >= 0 && days <= 3,
        });
      }

      if (emp.civilIdExpiry) {
        const days = getDaysUntilExpiry(emp.civilIdExpiry);
        allDocRecords.push({
          id: `emp-cid-${emp.id}`,
          employeeId: emp.id,
          title: `البطاقة المدنية (${emp.civilId})`,
          category: 'البطاقة المدنية PACI',
          employeeName: emp.fullNameAr,
          department: emp.department || 'عام',
          documentNumber: emp.civilId,
          expiryDate: emp.civilIdExpiry,
          daysRemaining: days,
          urgency: days < 0 ? 'منتهي' : days <= 3 ? 'عاجل (3 يوم)' : days <= 6 ? 'تنبيه (6 يوم)' : 'ساري',
          isExpired: days < 0,
          isUrgent: days >= 0 && days <= 3,
        });
      }

      if (emp.passportExpiry) {
        const days = getDaysUntilExpiry(emp.passportExpiry);
        allDocRecords.push({
          id: `emp-pass-${emp.id}`,
          employeeId: emp.id,
          title: `جواز السفر (${emp.passportNo})`,
          category: 'جواز السفر',
          employeeName: emp.fullNameAr,
          department: emp.department || 'عام',
          documentNumber: emp.passportNo,
          expiryDate: emp.passportExpiry,
          daysRemaining: days,
          urgency: days < 0 ? 'منتهي' : days <= 3 ? 'عاجل (3 يوم)' : days <= 6 ? 'تنبيه (6 يوم)' : 'ساري',
          isExpired: days < 0,
          isUrgent: days >= 0 && days <= 3,
        });
      }
    });

    // 2. Uploaded documents
    companyDocuments.forEach(doc => {
      const emp = companyEmployees.find(e => e.id === doc.employeeId);
      const days = getDaysUntilExpiry(doc.expiryDate);
      const catAr = 
        doc.category === 'MOH_LICENSE' ? 'ترخيص وزارة الصحة (MOH)' :
        doc.category === 'CIVIL_ID' ? 'البطاقة المدنية PACI' :
        doc.category === 'PASSPORT' ? 'جواز السفر' :
        doc.category === 'RESIDENCY' ? 'إقامة العمل' :
        doc.category === 'COMPANY_LICENSE' ? 'الترخيص التجاري' : 'مستند رسمي';

      allDocRecords.push({
        id: doc.id,
        employeeId: doc.employeeId,
        title: doc.title,
        category: catAr,
        employeeName: emp?.fullNameAr || 'مستند الشركة',
        department: emp?.department || 'إدارة الشؤون',
        documentNumber: doc.documentNumber || '—',
        expiryDate: doc.expiryDate || '—',
        daysRemaining: days,
        urgency: days < 0 ? 'منتهي' : days <= 3 ? 'عاجل (3 يوم)' : days <= 6 ? 'تنبيه (6 يوم)' : 'ساري',
        isExpired: days < 0,
        isUrgent: days >= 0 && days <= 3,
      });
    });

    let list = allDocRecords;

    // Apply Employee & Department Scope Filters
    if (selectedDepartment && selectedDepartment !== 'ALL') {
      list = list.filter(item => item.department === selectedDepartment);
    }
    if (selectedEmployeeId) {
      list = list.filter(item => item.employeeId === selectedEmployeeId || item.id.includes(selectedEmployeeId));
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(i => 
        i.title.toLowerCase().includes(term) ||
        i.employeeName.toLowerCase().includes(term) ||
        i.category.toLowerCase().includes(term) ||
        i.documentNumber.toLowerCase().includes(term)
      );
    }

    if (activeFilters.includes('expired')) {
      list = list.filter(i => i.isExpired);
    }
    if (activeFilters.includes('expiring_3')) {
      list = list.filter(i => i.isUrgent);
    }
    if (activeFilters.includes('expiring_6')) {
      list = list.filter(i => i.daysRemaining >= 0 && i.daysRemaining <= 6);
    }
    if (activeFilters.includes('moh_only')) {
      list = list.filter(i => i.category.includes('MOH') || i.category.includes('وزارة الصحة'));
    }

    const groups: Record<string, { label: string; items: typeof list; values: Record<string, number> }> = {};

    list.forEach(item => {
      const key = (item as any)[effectiveGroupBy] || item.category || 'عام';
      if (!groups[key]) {
        groups[key] = {
          label: key,
          items: [],
          values: { count: 0, expiredCount: 0, urgentCount: 0 },
        };
      }
      groups[key].items.push(item);
      groups[key].values.count += 1;
      if (item.isExpired) groups[key].values.expiredCount += 1;
      if (item.isUrgent) groups[key].values.urgentCount += 1;
    });

    const pivotRows: PivotRowData[] = Object.keys(groups).map(key => {
      const g = groups[key];
      return {
        id: `doc-group-${key}`,
        label: g.label,
        recordsCount: g.values.count,
        values: g.values,
        children: g.items.map(child => ({
          id: `child-${child.id}`,
          label: `${child.title} - ${child.employeeName}`,
          subLabel: `ينتهي في: ${child.expiryDate} (${child.daysRemaining} يوم)`,
          recordsCount: 1,
          values: {
            count: 1,
            expiredCount: child.isExpired ? 1 : 0,
            urgentCount: child.isUrgent ? 1 : 0,
          },
        })),
      };
    });

    const grandTotal = {
      count: list.length,
      expiredCount: list.filter(i => i.isExpired).length,
      urgentCount: list.filter(i => i.isUrgent).length,
    };

    return { list, pivotRows, grandTotal };
  }, [companyEmployees, companyDocuments, searchTerm, activeFilters, effectiveGroupBy, selectedEmployeeId, selectedDepartment]);

  // 5. WORKFORCE DEMOGRAPHICS DATA
  const workforceAggregated = useMemo(() => {
    let list = companyEmployees.map(emp => {
      const contract = companyContracts.find(c => c.employeeId === emp.id && c.status === 'RUNNING') ||
                       companyContracts.find(c => c.employeeId === emp.id);
      
      const salary = (contract?.basicSalary || 5) + (contract?.housingAllowance || 0) + (contract?.transportAllowance || 0);
      const isKuwaiti = emp.isKuwaiti || emp.nationality?.includes('كويت');

      return {
        id: emp.id,
        fullNameAr: emp.fullNameAr,
        employeeCode: emp.employeeCode,
        nationality: emp.nationality || 'غير محدد',
        department: emp.department || 'إدارة عامة',
        gender: emp.gender === 'FEMALE' ? 'أنثى' : 'ذكر',
        residencyType: emp.residencyType || (isKuwaiti ? 'كويتي' : 'مادة 18 - قطاع أهلي'),
        status: emp.status === 'ACTIVE' ? 'نشط' : 'إجازة / منتهي',
        isKuwaiti: isKuwaiti,
        totalSalaries: salary,
        joinDate: emp.joinDate || '224-1-1',
      };
    });

    // Apply Employee & Department Scope Filters
    if (selectedDepartment && selectedDepartment !== 'ALL') {
      list = list.filter(item => item.department === selectedDepartment);
    }
    if (selectedEmployeeId) {
      list = list.filter(item => item.id === selectedEmployeeId);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(i => 
        i.fullNameAr.toLowerCase().includes(term) ||
        i.nationality.toLowerCase().includes(term) ||
        i.department.toLowerCase().includes(term)
      );
    }

    if (activeFilters.includes('active_only')) {
      list = list.filter(i => i.status === 'نشط');
    }
    if (activeFilters.includes('kuwaiti_only')) {
      list = list.filter(i => i.isKuwaiti);
    }

    const groups: Record<string, { label: string; items: typeof list; values: Record<string, number> }> = {};

    list.forEach(item => {
      const key = (item as any)[effectiveGroupBy] || item.nationality || 'عام';
      if (!groups[key]) {
        groups[key] = {
          label: key,
          items: [],
          values: { count: 0, totalSalaries: 0 },
        };
      }
      groups[key].items.push(item);
      groups[key].values.count += 1;
      groups[key].values.totalSalaries += item.totalSalaries;
    });

    const pivotRows: PivotRowData[] = Object.keys(groups).map(key => {
      const g = groups[key];
      return {
        id: `demo-group-${key}`,
        label: g.label,
        recordsCount: g.values.count,
        values: g.values,
        children: g.items.map(child => ({
          id: `child-${child.id}`,
          label: child.fullNameAr,
          subLabel: `${child.department} - ${child.residencyType}`,
          recordsCount: 1,
          values: {
            count: 1,
            totalSalaries: child.totalSalaries,
          },
        })),
      };
    });

    const grandTotal = {
      count: list.length,
      totalSalaries: list.reduce((a, b) => a + b.totalSalaries, 0),
    };

    return { list, pivotRows, grandTotal };
  }, [companyEmployees, companyContracts, searchTerm, activeFilters, effectiveGroupBy, selectedEmployeeId, selectedDepartment]);

  // Current active data set based on category
  const activeDataset = useMemo(() => {
    switch (activeCategory) {
      case 'PAYROLL_ANALYSIS':
        return payrollAggregated;
      case 'LEAVE_BALANCE':
        return leavesAggregated;
      case 'ATTENDANCE_ANALYSIS':
        return attendanceAggregated;
      case 'MOH_DOCS_EXPIRY':
        return docsAggregated;
      case 'WORKFORCE_DEMO':
        return workforceAggregated;
      default:
        return payrollAggregated;
    }
  }, [activeCategory, payrollAggregated, leavesAggregated, attendanceAggregated, docsAggregated, workforceAggregated]);

  // Columns for List View based on active report
  const listColumns = useMemo<ListColumn[]>(() => {
    switch (activeCategory) {
      case 'PAYROLL_ANALYSIS':
        return [
          { key: 'employeeCode', label: 'كود الموظف', align: 'center' },
          { key: 'fullNameAr', label: 'اسم الموظف' },
          { key: 'department', label: 'القسم' },
          { key: 'jobTitle', label: 'المسمى الوظيفي' },
          { key: 'basicSalary', label: 'الراتب الأساسي', align: 'left', isCurrency: true },
          { key: 'allowances', label: 'البدلات', align: 'left', isCurrency: true },
          { key: 'grossSalary', label: 'الراتب الشامل', align: 'left', isCurrency: true },
          { key: 'pifss', label: 'التأمينات (11.5%)', align: 'left', isCurrency: true },
          { key: 'netSalary', label: 'صافي الراتب', align: 'left', isCurrency: true },
          { key: 'bankName', label: 'البنك المعتمد' },
        ];
      case 'LEAVE_BALANCE':
        return [
          { key: 'employeeCode', label: 'كود الموظف', align: 'center' },
          { key: 'employeeName', label: 'اسم الموظف' },
          { key: 'department', label: 'القسم' },
          { key: 'jobTitle', label: 'المسمى الوظيفي' },
          { key: 'carriedOver', label: 'الافتتاحي (مرحل)', align: 'center' },
          { key: 'accruedDays', label: 'مكتسب 2026', align: 'center' },
          { key: 'totalDays', label: 'المستهلك', align: 'center' },
          { key: 'remainingDays', label: 'الرصيد المتبقي', align: 'center', render: (row) => (
            <span className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
              row.remainingDays >= 15 ? 'bg-emerald-100 text-emerald-800' :
              row.remainingDays > 0 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
            }`}>
              {row.remainingDays} يوم
            </span>)},
          { key: 'leaveStatus', label: 'حالة الرصيد', align: 'center', render: (row) => (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              row.leaveStatus === 'رصيد كافٍ' ? 'bg-emerald-100 text-emerald-800' :
              row.leaveStatus === 'رصيد منخفض' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
            }`}>
              {row.leaveStatus}
            </span>)},
        ];
      case 'ATTENDANCE_ANALYSIS':
        return [
          { key: 'employeeName', label: 'الموظف' },
          { key: 'department', label: 'القسم' },
          { key: 'date', label: 'التاريخ', align: 'center' },
          { key: 'checkIn', label: 'وقت الحضور', align: 'center' },
          { key: 'checkOut', label: 'وقت الانصراف', align: 'center' },
          { key: 'workHours', label: 'ساعات العمل', align: 'center' },
          { key: 'overtimeHours', label: 'إضافي (ساعة)', align: 'center' },
          { key: 'latenessMinutes', label: 'تأخير (دقيقة)', align: 'center' },
          { key: 'status', label: 'الحالة', align: 'center', render: (row) => (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              row.status === 'حاضر' ? 'bg-emerald-100 text-emerald-800' :
              row.status === 'متأخر' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
            }`}>
              {row.status}
            </span>)},
        ];
      case 'MOH_DOCS_EXPIRY':
        return [
          { key: 'title', label: 'المستند / الترخيص' },
          { key: 'category', label: 'النوع' },
          { key: 'employeeName', label: 'الموظف / الجهة' },
          { key: 'documentNumber', label: 'الرقم المرجعي' },
          { key: 'expiryDate', label: 'تاريخ الانتهاء', align: 'center' },
          { key: 'daysRemaining', label: 'الأيام المتبقية', align: 'center', render: (row) => (
            <span className={`font-mono font-bold ${row.daysRemaining < 0 ? 'text-rose-600' : row.daysRemaining <= 30 ? 'text-amber-600' : 'text-slate-700'}`}>
              {row.daysRemaining < 0 ? `منتهي منذ ${Math.abs(row.daysRemaining)} يوم` : `${row.daysRemaining} يوم`}
            </span>)},
          { key: 'urgency', label: 'المستوى', align: 'center', render: (row) => (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              row.isExpired ? 'bg-rose-100 text-rose-800' :
              row.isUrgent ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {row.urgency}
            </span>)},
        ];
      case 'WORKFORCE_DEMO':
        return [
          { key: 'employeeCode', label: 'كود الموظف', align: 'center' },
          { key: 'fullNameAr', label: 'الاسم الكامل' },
          { key: 'nationality', label: 'الجنسية' },
          { key: 'department', label: 'القسم' },
          { key: 'gender', label: 'الجنس', align: 'center' },
          { key: 'residencyType', label: 'نوع الإقامة' },
          { key: 'totalSalaries', label: 'الراتب الشامل', align: 'left', isCurrency: true },
          { key: 'status', label: 'الحالة', align: 'center' },
        ];
      default:
        return [];
    }
  }, [activeCategory]);

  // Export to Excel direct button handler
  const handleDirectExportXLSX = () => {
    const wsData: any[][] = [];
    wsData.push([`${activeCompany?.nameAr || 'الشركة'} - ${currentConfig.title}`]);
    wsData.push([`تاريخ التصدير: ${new Date().toLocaleDateString('ar-KW')} ${new Date().toLocaleTimeString('ar-KW')}`]);
    wsData.push([]);

    // Headers
    const headers = listColumns.map(c => c.label);
    wsData.push(headers);

    // Rows
    activeDataset.list.forEach((item: any) => {
      const row = listColumns.map(c => {
        const v = item[c.key];
        return v !== undefined ? v : '';
      });
      wsData.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `${activeCategory}_${new Date().toISOString().slice(0, 1)}.xlsx`);
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto font-sans" dir="rtl">
      {/* Top Header & Main Action Bar */}
      <div className="bg-white border border-slate-2 rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 bg-[#714B67] text-white rounded-xl flex items-center justify-center shadow-sm shrink-">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-slate-9">
                منظومة التقارير والتحليلات (Odoo Reporting & Pivot Analysis Engine)
              </h1>
              <span className="text-[1px] bg-purple-1 text-purple-8 px-2 py-.5 rounded font-bold">
                Odoo 18 Matrix
              </span>
            </div>
            <p className="text-xs text-slate-5 mt-.5">
              تحليل ديناميكي للجداول المحورية، الرسوم البيانية، ومطابقة لوائح وقوانين العمل والتأمينات في الكويت
            </p>
          </div>
        </div>

        {/* Action Buttons: Export XLSX & Print PDF */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDirectExportXLSX}
            className="flex items-center gap-1.5 bg-emerald-7 hover:bg-emerald-6 text-white text-xs px-3.5 py-2 rounded-xl font-bold transition shadow-xs cursor-pointer"
            title="تصدير جدول البيانات إلى Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">تصدير Excel (XLSX)</span>
          </button>

          <button
            onClick={() => setIsPrintWizardOpen(true)}
            className="flex items-center gap-1.5 bg-[#714B67] hover:bg-[#85587a] text-white text-xs px-3.5 py-2 rounded-xl font-bold transition shadow-xs cursor-pointer"
            title="معالج طباعة التقرير بتنسيق رسمي معتمد"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة التقرير (Print / Export PDF)</span>
          </button>
        </div>
      </div>

      {/* 5 Core Report Categories Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {(Object.keys(reportConfigs) as ReportCategory[]).map((catKey) => {
          const config = reportConfigs[catKey];
          const Icon = config.icon;
          const isActive = activeCategory === catKey;

          return (
            <button
              key={catKey}
              onClick={() => {
                setActiveCategory(catKey);
                setActiveFilters([]);
                setActiveGroupBy(config.defaultGroupBy);
                setActiveMeasures(config.defaultMeasures);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer border ${
                isActive 
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm' 
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
              <span>{config.title.split('(')[0].trim()}</span>
            </button>);
        })}
      </div>

      {/* Sub-Header with View Mode Switcher (Pivot / Graph / List) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 pr-2">
          <span className="w-2 h-2 rounded-full bg-purple-600" />
          <span>{currentConfig.description}</span>
        </div>

        {/* View Switchers Buttons */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-300 shadow-2xs">
          <button
            onClick={() => setViewMode('PIVOT')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              viewMode === 'PIVOT' 
                ? 'bg-[#714B67] text-white shadow-2xs' 
                : 'text-slate-6 hover:bg-slate-1'
            }`}
            title="الجدول المحوري (Pivot Matrix)"
          >
            <PivotIcon className="w-3.5 h-3.5" />
            <span>الجدول المحوري (Pivot)</span>
          </button>

          <button
            onClick={() => setViewMode('GRAPH')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              viewMode === 'GRAPH' 
                ? 'bg-[#714B67] text-white shadow-2xs' 
                : 'text-slate-6 hover:bg-slate-1'
            }`}
            title="الرسوم البيانية (Graph View)"
          >
            <GraphIcon className="w-3.5 h-3.5" />
            <span>الرسم البياني (Graph)</span>
          </button>

          <button
            onClick={() => setViewMode('LIST')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              viewMode === 'LIST' 
                ? 'bg-[#714B67] text-white shadow-2xs' 
                : 'text-slate-6 hover:bg-slate-1'
            }`}
            title="القائمة التفصيلية (List View)"
          >
            <ListIcon className="w-3.5 h-3.5" />
            <span>القائمة التفصيلية (List)</span>
          </button>
        </div>
      </div>

      {/* Odoo Employee & Department Scope Filter Bar */}
      <OdooScopeBar
        employees={companyEmployees}
        departments={departments}
        selectedEmployeeId={selectedEmployeeId}
        onSelectEmployee={setSelectedEmployeeId}
        selectedDepartment={selectedDepartment}
        onSelectDepartment={setSelectedDepartment}
        onQuickPrintSingle={handleQuickPrintSingle}
        activeCategory={activeCategory}
        contracts={companyContracts}
        leaves={companyLeaves}
        attendance={companyAttendance}
        documents={companyDocuments}
      />

      {/* Odoo 17/18 Search, Filters, Group By & Measures Bar */}
      <OdooSearchBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        availableFilters={currentConfig.availableFilters}
        activeFilters={activeFilters}
        onToggleFilter={handleToggleFilter}
        availableGroupBy={currentConfig.availableGroupBy}
        activeGroupBy={effectiveGroupBy}
        onSelectGroupBy={setActiveGroupBy}
        availableMeasures={currentConfig.availableMeasures}
        activeMeasures={effectiveMeasures.map(m => m.id)}
        onToggleMeasure={handleToggleMeasure}
        onClearAll={handleClearAll}
        totalRecordsCount={activeDataset.list.length}
      />

      {/* Main View Area (Pivot / Graph / List) */}
      <div>
        {viewMode === 'PIVOT' && (
          <OdooPivotView
            data={activeDataset.pivotRows}
            grandTotal={activeDataset.grandTotal}
            totalRecords={activeDataset.list.length}
            groupByLabel={currentConfig.availableGroupBy.find(g => g.id === effectiveGroupBy)?.label || 'القسم'}
            activeMeasures={effectiveMeasures}
            reportTitle={currentConfig.title}
          />)}

        {viewMode === 'GRAPH' && (
          <OdooGraphView
            data={activeDataset.pivotRows}
            activeMeasures={effectiveMeasures}
            reportTitle={currentConfig.title}
            groupByLabel={currentConfig.availableGroupBy.find(g => g.id === effectiveGroupBy)?.label || 'القسم'}
          />)}

        {viewMode === 'LIST' && (
          <OdooReportListView
            columns={listColumns}
            data={activeDataset.list}
            reportTitle={currentConfig.title}
            totalRecords={activeDataset.list.length}
            summaryRow={activeDataset.grandTotal}
          />)}
      </div>

      {/* Odoo Report Print Wizard Modal (ir.actions.report) */}
      <OdooReportPrintWizard
        isOpen={isPrintWizardOpen}
        onClose={() => setIsPrintWizardOpen(false)}
        reportCategory={activeCategory}
        reportTitle={currentConfig.title}
        employees={companyEmployees}
        departments={departments}
        activeCompany={activeCompany}
        initialScope={selectedEmployeeId ? 'EMPLOYEE' : selectedDepartment ? 'DEPARTMENT' : 'ALL'}
        initialEmployeeId={selectedEmployeeId}
        initialDepartment={selectedDepartment}
        onConfirmPrint={handleConfirmPrint}
        onConfirmExportXLSX={handleConfirmExportXLSX}
      />

      {/* Printable Official Report Modal */}
      <OfficialReportPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        reportTitle={currentConfig.title}
        reportCategory={activeCategory}
        activeCompany={activeCompany}
        pivotData={activeDataset.pivotRows}
        grandTotal={activeDataset.grandTotal}
        activeMeasures={effectiveMeasures}
        groupByLabel={currentConfig.availableGroupBy.find(g => g.id === effectiveGroupBy)?.label || 'القسم'}
        totalRecords={activeDataset.list.length}
        activeFiltersLabels={activeFilters.map(f => currentConfig.availableFilters.find(x => x.id === f)?.label || f)}
        wizardConfig={wizardConfig}
        selectedEmployeeId={selectedEmployeeId || wizardConfig.selectedEmployeeId}
        activeList={activeDataset.list}
        employees={companyEmployees}
        contracts={companyContracts}
        leaves={companyLeaves}
        attendance={companyAttendance}
        payslips={companyPayslips}
        documents={companyDocuments}
      />
    </div>);
};
