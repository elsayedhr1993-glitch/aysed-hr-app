import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, AlertTriangle, AlertCircle, CheckCircle2, RefreshCw, 
  Users, Clock, Calendar, Banknote, X, ExternalLink, Filter, Search, 
  ChevronLeft, Sparkles, Wand2, Check, Zap
} from 'lucide-react';
import { Employee, Contract, AttendanceRecord, LeaveRequest, Payslip } from '../types';
import { 
  runGlobalSystemIntegrityAudit, 
  autoFixGlobalIntegrityIssues, 
  GlobalIntegrityReport, 
  IntegrityIssue,
  AutoFixResult 
} from '../services/globalIntegrityService';

interface GlobalIntegrityModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  contracts: Contract[];
  attendance: AttendanceRecord[];
  leaves: LeaveRequest[];
  payslips: Payslip[];
  onNavigateToApp?: (appName: any) => void;
  onOpenIssueEntity?: (issue: IntegrityIssue) => void;
  onAutoFixAll?: (fixedData: {
    employees: Employee[];
    contracts: Contract[];
    attendance: AttendanceRecord[];
    leaves: LeaveRequest[];
    payslips: Payslip[];
  }) => void | Promise<void>;
}

export const GlobalIntegrityModal: React.FC<GlobalIntegrityModalProps> = ({
  isOpen,
  onClose,
  employees,
  contracts,
  attendance,
  leaves,
  payslips,
  onNavigateToApp,
  onOpenIssueEntity,
  onAutoFixAll,
}) => {
  const [activeModuleFilter, setActiveModuleFilter] = useState<'ALL' | 'HR_CORE' | 'ATTENDANCE' | 'LEAVES' | 'PAYROLL'>('ALL');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAuditing, setIsAuditing] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [fixSuccessResult, setFixSuccessResult] = useState<AutoFixResult | null>(null);

  // Local datasets that can be updated immediately on auto-fix
  const [localData, setLocalData] = useState<{
    employees: Employee[];
    contracts: Contract[];
    attendance: AttendanceRecord[];
    leaves: LeaveRequest[];
    payslips: Payslip[];
  } | null>(null);

  const currentEmployees = localData ? localData.employees : employees;
  const currentContracts = localData ? localData.contracts : contracts;
  const currentAttendance = localData ? localData.attendance : attendance;
  const currentLeaves = localData ? localData.leaves : leaves;
  const currentPayslips = localData ? localData.payslips : payslips;

  const report: GlobalIntegrityReport = useMemo(() => {
    return runGlobalSystemIntegrityAudit({
      employees: currentEmployees,
      contracts: currentContracts,
      attendance: currentAttendance,
      leaves: currentLeaves,
      payslips: currentPayslips,
    });
  }, [currentEmployees, currentContracts, currentAttendance, currentLeaves, currentPayslips, isAuditing]);

  if (!isOpen) return null;

  const handleRefresh = () => {
    setIsAuditing(true);
    setTimeout(() => {
      setIsAuditing(false);
    }, 300);
  };

  const handleAutoFixAll = async () => {
    setIsFixing(true);
    setFixSuccessResult(null);

    try {
      // 1. تشغيل المحرك الشامل للإصلاح الآلي الفوري
      const fixResult = autoFixGlobalIntegrityIssues({
        employees: currentEmployees,
        contracts: currentContracts,
        attendance: currentAttendance,
        leaves: currentLeaves,
        payslips: currentPayslips,
      });

      // 2. مزامنة تنظيف البصمات المكررة مع حارس الخادم إن وجد (Server Guard Sync)
      try {
        await fetch('/api/guards/clean-duplicate-punches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ punches: fixResult.updatedAttendance })
        });
      } catch (e) {
        // Fallback gracefully to client side
      }

      // 3. تحديث الحالة المحلية وفوراً إعادة احتساب المؤشر ليرتفع تلقائياً نحو 100%
      setLocalData({
        employees: fixResult.updatedEmployees,
        contracts: fixResult.updatedContracts,
        attendance: fixResult.updatedAttendance,
        leaves: fixResult.updatedLeaves,
        payslips: fixResult.updatedPayslips,
      });

      setFixSuccessResult(fixResult);

      // 4. استدعاء معالج الحفظ والتخزين الدائم في النظام
      if (onAutoFixAll) {
        await onAutoFixAll({
          employees: fixResult.updatedEmployees,
          contracts: fixResult.updatedContracts,
          attendance: fixResult.updatedAttendance,
          leaves: fixResult.updatedLeaves,
          payslips: fixResult.updatedPayslips,
        });
      }

      handleRefresh();
    } catch (err) {
      console.error('Auto Fix Failed:', err);
    } finally {
      setIsFixing(false);
    }
  };

  const filteredIssues = report.issues.filter(issue => {
    if (activeModuleFilter !== 'ALL' && issue.module !== activeModuleFilter) return false;
    if (severityFilter !== 'ALL' && issue.severity !== severityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        issue.entityName.toLowerCase().includes(q) ||
        issue.message.toLowerCase().includes(q) ||
        issue.code.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getModuleIcon = (mod: string) => {
    switch (mod) {
      case 'HR_CORE': return <Users className="w-4 h-4 text-sky-600" />;
      case 'ATTENDANCE': return <Clock className="w-4 h-4 text-amber-600" />;
      case 'LEAVES': return <Calendar className="w-4 h-4 text-emerald-600" />;
      case 'PAYROLL': return <Banknote className="w-4 h-4 text-purple-600" />;
      default: return <ShieldCheck className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans dir-rtl animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-[#714B67] to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md border border-white/20">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight">حارس التحقق البرمجي العام (Global Integrity Constraints)</h2>
                <span className="bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Odoo & Kuwait Law Engine Active
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                مراقبة وضبط النزاهة الحسابية ومنع الأخطاء في وحدات الموظفين، البصمة، الإجازات ومسيرات الرواتب.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* زر الإصلاح الآلي الفوري في رأس النافذة */}
            <button
              onClick={handleAutoFixAll}
              disabled={isFixing}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md text-xs font-black flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              title="إصلاح آلي لكافة البيانات البديهية وتصنيف المواطنين وتنظيف البصمات المكررة"
            >
              {isFixing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>جارٍ الإصلاح...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>إصلاح آلي فوري (Auto-Fix All)</span>
                </>
              )}
            </button>

            <button
              onClick={handleRefresh}
              className={`p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer flex items-center gap-1.5 text-xs font-bold ${isAuditing ? 'animate-spin' : ''}`}
              title="إعادة الفحص المالي والبرمجي الآن"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">إعادة الفحص</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white/10 hover:bg-rose-500/80 text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Auto-Fix Success / Notification Banner */}
        {fixSuccessResult && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-3 flex items-start justify-between gap-3 animate-fadeIn">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black text-emerald-900">
                    تم تنفيذ الإصلاح الآلي الفوري بنجاح! ({fixSuccessResult.fixedCount} تصحيح ومعالجة)
                  </h4>
                  <span className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                    مؤشر النزاهة: {report.overallScore}%
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[11px] text-emerald-800">
                  {fixSuccessResult.fixedSummary.map((sumText, sIdx) => (
                    <span key={sIdx} className="flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600" />
                      {sumText}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <button 
              onClick={() => setFixSuccessResult(null)}
              className="text-emerald-700 hover:text-emerald-900 p-1 cursor-pointer text-xs"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Overview KPI Cards */}
        <div className="p-5 bg-slate-50 border-b border-slate-200">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {/* Overall Score */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
                <span>مؤشر النزاهة العام</span>
                <ShieldCheck className={`w-4 h-4 ${report.overallScore >= 95 ? 'text-emerald-500' : report.overallScore >= 80 ? 'text-amber-500' : 'text-rose-500'}`} />
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className={`text-2xl font-black font-mono ${report.overallScore >= 95 ? 'text-emerald-600' : report.overallScore >= 80 ? 'text-amber-600' : 'text-rose-600'}`}>
                  {report.overallScore}%
                </span>
                <span className="text-[10px] text-slate-400 font-bold">
                  {report.overallStatus === 'OPTIMAL' ? 'مثالي' : report.overallStatus === 'WARNING' ? 'تنبيهات' : 'يتطلب معالجة'}
                </span>
              </div>
            </div>

            {/* HR Core */}
            <div 
              onClick={() => setActiveModuleFilter(activeModuleFilter === 'HR_CORE' ? 'ALL' : 'HR_CORE')}
              className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                activeModuleFilter === 'HR_CORE' ? 'bg-sky-50 border-sky-300 ring-2 ring-sky-400' : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-slate-600 text-[11px] font-bold">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-sky-600" />
                  HR Core
                </span>
                <span className="text-[10px] font-mono bg-sky-100 text-sky-800 px-1 rounded">{report.modules.HR_CORE.score}%</span>
              </div>
              <div className="mt-2 text-xs font-semibold text-slate-700">
                {report.modules.HR_CORE.issuesCount === 0 ? (
                  <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> سليم تماماً</span>
                ) : (
                  <span className="text-rose-600 font-bold">{report.modules.HR_CORE.issuesCount} ملاحظة</span>
                )}
              </div>
            </div>

            {/* Attendance */}
            <div 
              onClick={() => setActiveModuleFilter(activeModuleFilter === 'ATTENDANCE' ? 'ALL' : 'ATTENDANCE')}
              className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                activeModuleFilter === 'ATTENDANCE' ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400' : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-slate-600 text-[11px] font-bold">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  البصمة
                </span>
                <span className="text-[10px] font-mono bg-amber-100 text-amber-800 px-1 rounded">{report.modules.ATTENDANCE.score}%</span>
              </div>
              <div className="mt-2 text-xs font-semibold text-slate-700">
                {report.modules.ATTENDANCE.issuesCount === 0 ? (
                  <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> سليم تماماً</span>
                ) : (
                  <span className="text-rose-600 font-bold">{report.modules.ATTENDANCE.issuesCount} ملاحظة</span>
                )}
              </div>
            </div>

            {/* Leaves */}
            <div 
              onClick={() => setActiveModuleFilter(activeModuleFilter === 'LEAVES' ? 'ALL' : 'LEAVES')}
              className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                activeModuleFilter === 'LEAVES' ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400' : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-slate-600 text-[11px] font-bold">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  الإجازات
                </span>
                <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-1 rounded">{report.modules.LEAVES.score}%</span>
              </div>
              <div className="mt-2 text-xs font-semibold text-slate-700">
                {report.modules.LEAVES.issuesCount === 0 ? (
                  <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> معادلة الرصيد سليمة</span>
                ) : (
                  <span className="text-rose-600 font-bold">{report.modules.LEAVES.issuesCount} ملاحظة</span>
                )}
              </div>
            </div>

            {/* Payroll */}
            <div 
              onClick={() => setActiveModuleFilter(activeModuleFilter === 'PAYROLL' ? 'ALL' : 'PAYROLL')}
              className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                activeModuleFilter === 'PAYROLL' ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-400' : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-slate-600 text-[11px] font-bold">
                <span className="flex items-center gap-1">
                  <Banknote className="w-3.5 h-3.5 text-purple-600" />
                  الرواتب
                </span>
                <span className="text-[10px] font-mono bg-purple-100 text-purple-800 px-1 rounded">{report.modules.PAYROLL.score}%</span>
              </div>
              <div className="mt-2 text-xs font-semibold text-slate-700">
                {report.modules.PAYROLL.issuesCount === 0 ? (
                  <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> الصافي متطابق</span>
                ) : (
                  <span className="text-rose-600 font-bold">{report.modules.PAYROLL.issuesCount} ملاحظة</span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Auto-Fix Action Banner when issues exist */}
          {report.issues.length > 0 && !fixSuccessResult && (
            <div className="mt-3 bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-teal-500/10 border border-emerald-300/40 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-800 font-semibold">
                <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                <span>
                  تتوفر معالجات تلقائية لتصنيف نوع الإقامة إلى <strong>"مواطن"</strong> لكافة الكويتيين وتنظيف البصمات المكررة في نفس التوقيت بضغطة واحدة.
                </span>
              </div>
              <button
                onClick={handleAutoFixAll}
                disabled={isFixing}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {isFixing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>جارٍ التنفيذ...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>إصلاح آلي فوري (Auto-Fix All)</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Filter and Search Bar */}
        <div className="p-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                placeholder="بحث في فحص النزاهة، اسم الموظف، أو نص التحقق..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-9 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-[#714B67] transition"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSeverityFilter('ALL')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                severityFilter === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              الكل ({report.issues.length})
            </button>
            <button
              onClick={() => setSeverityFilter('CRITICAL')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                severityFilter === 'CRITICAL' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              <AlertCircle className="w-3 h-3" />
              حرجة ({report.criticalIssues})
            </button>
            <button
              onClick={() => setSeverityFilter('WARNING')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                severityFilter === 'WARNING' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              تنبيهات ({report.warningIssues})
            </button>
          </div>
        </div>

        {/* Issues List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-slate-50/50 odoo-scrollbar max-h-[50vh]">
          {filteredIssues.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">النظام متوافق 100% مع قواعد النزاهة الرياضية والبرمجية</h3>
              <p className="text-xs text-slate-500 mt-1">
                جميع الحسابات في شاشات الموظفين، البصمات، الإجازات، ومسيرات الرواتب تخضع لشروط الحماية والضبط التلقائي.
              </p>
            </div>
          ) : (
            filteredIssues.map((issue) => (
              <div
                key={issue.id}
                className={`p-3.5 rounded-xl border transition shadow-2xs flex items-start justify-between gap-3 ${
                  issue.severity === 'CRITICAL'
                    ? 'bg-white border-rose-200 hover:border-rose-300'
                    : 'bg-white border-amber-200 hover:border-amber-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                    issue.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {issue.severity === 'CRITICAL' ? <AlertCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-slate-900">{issue.entityName}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 flex items-center gap-1">
                        {getModuleIcon(issue.module)}
                        {issue.module}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        issue.severity === 'CRITICAL' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {issue.severity === 'CRITICAL' ? 'خطأ حرج يمنع الاعتماد' : 'تنبيه حسابي'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 mt-1 font-medium leading-relaxed">
                      {issue.message}
                    </p>

                    {issue.suggestedFix && (
                      <p className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 mt-1.5 inline-block font-medium">
                        💡 الحل المقترح: {issue.suggestedFix}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      onClose();
                      if (onOpenIssueEntity) {
                        onOpenIssueEntity(issue);
                      } else if (onNavigateToApp) {
                        if (issue.module === 'HR_CORE') onNavigateToApp('employees');
                        else if (issue.module === 'ATTENDANCE') onNavigateToApp('attendance');
                        else if (issue.module === 'LEAVES') onNavigateToApp('leaves');
                        else if (issue.module === 'PAYROLL') onNavigateToApp('payroll');
                      }
                    }}
                    className="text-xs font-bold text-[#714B67] hover:text-white hover:bg-[#714B67] bg-[#714B67]/10 border border-[#714B67]/20 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs hover:shadow-sm"
                    title={issue.field ? `فتح وتعديل حقل (${issue.field}) مباشرة` : 'فتح الشاشة'}
                  >
                    <span>فتح الشاشة وتعديل الحقل</span>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>معادلات النزاهة: الرصيد المتبقي = (المرحل + المكتسب) - المصرف | الصافي = (الأساسي + البدلات + الإضافي) - الخصومات</span>
          </div>

          <div className="flex items-center gap-2">
            {report.issues.length > 0 && (
              <button
                onClick={handleAutoFixAll}
                disabled={isFixing}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <Wand2 className="w-4 h-4" />
                <span>إصلاح آلي فوري (Auto-Fix All)</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

