import React, { useState } from 'react';
import {
  Grid, Search, Filter, Building2, Bell, Scan, Printer,
  ChevronDown, Check, User, Sparkles, FileText, AlertTriangle, ShieldAlert, Clock, UserX, Clock3, ArrowLeft, X, LogOut, ShieldCheck, Eye, Music, Volume2, VolumeX, Settings, Bug, Globe
} from 'lucide-react';
import { Company, ActiveApp, ViewMode } from '../types';
import { SystemNotification } from '../utils/notificationsEngine';
import { OdooDebugMenu } from './OdooDebugMenu';
import { useLang } from '../lib/i18n';
import toast from 'react-hot-toast';

interface OdooTopBarProps {
  companies?: Company[];
  activeCompany?: Company;
  onSelectCompany?: (company: Company) => void;
  activeApp?: ActiveApp | string | null;
  currentApp?: string | null;
  onOpenAppLauncher?: () => void;
  onNavigateHome?: () => void;
  onCloseApp?: () => void;
  onToggleSidebar?: () => void;
  currentUserEmail?: string;
  onOpenAICopilot?: () => void;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  onOpenOCRModal?: () => void;
  notifications?: SystemNotification[];
  onNavigateToApp?: (app: any, employeeId?: string) => void;
  onLogout?: () => void;
  isAmbientPlaying?: boolean;
  onToggleAmbientSound?: () => void;
  isInspectorActive?: boolean;
  onToggleFieldInspector?: (active: boolean) => void;
  onOpenProfile?: () => void;
  currentUserRole?: string;
}

const APP_MODELS: Record<ActiveApp, string> = {
  APP_LAUNCHER: 'ir.module.module',
  EMPLOYEES: 'hr.employee',
  RECRUITMENT: 'hr.applicant',
  CONTRACTS: 'hr.contract',
  LEAVES: 'hr.leave',
  HOLIDAYS: 'resource.calendar.leaves',
  SHIFTS: 'hr.shift',
  ATTENDANCE: 'hr.attendance',
  PAYROLL: 'hr.payslip',
  EOS: 'hr.payslip.end.of.service',
  DOCUMENTS: 'ir.attachment',
  DOCUMENT_TEMPLATES: 'mail.template',
  CUSTODY_LOANS: 'hr.loan',
  AUTOMATION: 'base.automation',
  NOTIFICATIONS: 'mail.notification.engine',
  AUDIT_LOGS: 'ir.logging',
  AI_COPILOT: 'mail.bot',
  COMMENCEMENT: 'hr.departure.wizard',
  REPORTS: 'ir.actions.report',
  EXCLUSIVE_INNOVATIONS: 'hr.innovations.suite',
  INNOVATIONS: 'hr.innovations.suite',
  SAAS_ADMIN: 'res.company',
  COMPANIES: 'res.company',
  SETTINGS: 'res.config.settings',
};

const appTitles: Record<ActiveApp, { ar: string; en: string }> = {
  APP_LAUNCHER: { ar: 'قائمة التطبيقات', en: 'App Launcher' },
  EMPLOYEES: { ar: 'الموظفين', en: 'Employees' },
  RECRUITMENT: { ar: 'التوظيف', en: 'Recruitment' },
  CONTRACTS: { ar: 'عقود العمل', en: 'Contracts' },
  LEAVES: { ar: 'الإجازات والغياب', en: 'Time Off' },
  HOLIDAYS: { ar: 'العطلات الرسمية في دولة الكويت', en: 'Kuwait Official Holidays' },
  SHIFTS: { ar: 'إدارة الورديات وجداول الدوام', en: 'Shifts & Schedules' },
  ATTENDANCE: { ar: 'الحضور والانصراف', en: 'Attendance' },
  PAYROLL: { ar: 'الرواتب والتأمينات', en: 'Payroll' },
  EOS: { ar: 'حاسبة نهاية الخدمة (م 51 & 53)', en: 'EOS Settlement' },
  DOCUMENTS: { ar: 'إدارة المستندات والماسح الضوئي', en: 'Documents & OCR' },
  DOCUMENT_TEMPLATES: { ar: 'قوالب المستندات والأرشفة الآلية', en: 'Document Templates' },
  CUSTODY_LOANS: { ar: 'العهد والسلف المالية', en: 'Custodies & Loans' },
  AUTOMATION: { ar: 'الأتمتة وسير العمل (Studio)', en: 'Automation Workflows' },
  NOTIFICATIONS: { ar: 'محرك الإشعارات والواتساب التلقائي', en: 'Notifications & WhatsApp Engine' },
  AUDIT_LOGS: { ar: 'سجل الرقابة وتتبع العمليات', en: 'Audit Logs Trail' },
  AI_COPILOT: { ar: 'مساعد أودو الذكي (Odoo AI Copilot)', en: 'Odoo AI Copilot' },
  COMMENCEMENT: { ar: 'مباشرة العمل (Employment Commencement)', en: 'Employment Commencement' },
  REPORTS: { ar: 'التقارير والتحليلات (Reporting & Pivot)', en: 'Reporting & Analysis' },
  EXCLUSIVE_INNOVATIONS: { ar: 'حزمة الابتكارات الحصرية (Exclusive Innovations)', en: 'Exclusive Innovations Suite' },
  INNOVATIONS: { ar: 'حزمة الابتكارات الحصرية (Exclusive Innovations)', en: 'Exclusive Innovations Suite' },
  SAAS_ADMIN: { ar: 'إدارة اشتراكات الشركات (SaaS Super Admin)', en: 'SaaS Super Admin' },
  COMPANIES: { ar: 'إدارة الشركات والعيادات (Multi-Company)', en: 'Companies & Clinics' },
  SETTINGS: { ar: 'الإعدادات العامة والربط الخارجي', en: 'Settings & Integrations' },
};

export const isDebug = typeof window !== 'undefined' ? window.location.search.includes('debug=1') : false;
export const OdooTopBar: React.FC<OdooTopBarProps> = ({
  companies = [],
  activeCompany,
  onSelectCompany = (_company: Company) => {},
  activeApp,
  currentApp,
  onOpenAppLauncher,
  onNavigateHome,
  onCloseApp,
  onToggleSidebar,
  currentUserEmail,
  onOpenAICopilot,
  searchTerm = '',
  onSearchChange = (_term: string) => {},
  viewMode = 'kanban',
  onViewModeChange = (_mode: ViewMode) => {},
  onOpenOCRModal = () => {},
  notifications = [],
  onNavigateToApp,
  onLogout,
  isAmbientPlaying = false,
  onToggleAmbientSound,
  isInspectorActive = false,
  onToggleFieldInspector,
  onOpenProfile,
  currentUserRole = 'COMPANY_ADMIN',
}) => {
  const [showCompanyMenu, setShowCompanyMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showPrintMenu, setShowPrintMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const { lang, setLang, currentLangCode } = useLang();

  const effectiveApp = currentApp !== undefined ? currentApp : (activeApp === 'APP_LAUNCHER' ? null : activeApp);
  const isInsideApp = Boolean(effectiveApp && effectiveApp !== 'LAUNCHER' && effectiveApp !== 'APP_LAUNCHER');
  const currentModel = effectiveApp ? (APP_MODELS[effectiveApp as ActiveApp] || 'hr.employee') : 'ir.module.module';

  const handleCloseToHome = () => {
    if (typeof onCloseApp === 'function') {
      onCloseApp();
    } else if (typeof onNavigateHome === 'function') {
      onNavigateHome();
    } else if (typeof onOpenAppLauncher === 'function') {
      onOpenAppLauncher();
    } else if (typeof onNavigateToApp === 'function') {
      onNavigateToApp(null as any);
    }
  };

  const isSuperAdmin = currentUserEmail?.toLowerCase() === 'admin@aysed.com' || currentUserEmail?.toLowerCase() === 'elsayedhr1993@gmail.com';

  const criticalCount = (notifications || []).filter(n => n.severity === 'CRITICAL').length;
  const warningCount = (notifications || []).filter(n => n.severity === 'WARNING').length;
  const unreadCount = (notifications || []).length;

  return (
    <header className="bg-[#714B67]/80 backdrop-blur-md border-b border-white/20 text-white h-12 px-5 flex items-center justify-between shadow-[0_4px_30px_rgba(0,0,0,0.1)] select-none sticky top-0 z-40" dir="rtl">
      {/* Right Side (Arabic RTL): App Grid Launcher + App Name + Permanent Close Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleCloseToHome}
          className="p-1.5 rounded hover:bg-white/10 transition flex items-center justify-center text-white/90 hover:text-white"
          title="فتح شاشة التطبيقات الرئيسية (دفترة / Odoo Launcher)"
        >
          <Grid className="w-5 h-5" />
        </button>

        {isInsideApp && (
          <button
            onClick={handleCloseToHome}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-white/15 hover:bg-rose-600/80 text-white text-xs rounded-md transition font-medium border border-white/20 shadow-sm"
            title="إغلاق هذا المكون والعودة للشاشة الرئيسية لدفترة"
          >
            <X className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">إغلاق التطبيق (دفترة)</span>
          </button>
        )}

        <div className="flex items-center gap-3 border-r border-white/20 pr-3">
          <span className="font-bold text-sm tracking-wide text-amber-300 flex items-center gap-1 font-sans">
            <Sparkles className="w-4 h-4 text-amber-300 inline" />
            Aysed HR S 2026
          </span>
          <span className="text-white/40 text-xs">|</span>
          <span className="text-xs font-semibold text-white/90">
            {effectiveApp ? (appTitles[effectiveApp as ActiveApp]?.ar || effectiveApp) : 'الشاشة الرئيسية لدفترة (قائمة التطبيقات)'}
          </span>
        </div>
        
        {/* Unified Master Dashboard Navigation for Super Admin */}
        {isSuperAdmin && (
          <div className="hidden lg:flex items-center gap-2 mr-4 bg-black/20 rounded-lg p-1">
            <button
              onClick={() => onNavigateToApp && onNavigateToApp('SAAS_ADMIN')}
              className={`text-xs px-3 py-1.5 rounded-md font-bold transition flex items-center gap-1.5 ${
                effectiveApp === 'SAAS_ADMIN' || effectiveApp === 'COMPANIES'
                  ? 'bg-amber-400 text-slate-900 shadow-sm'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>إدارة المنظومة (SaaS)</span>
            </button>
            <button
              onClick={handleCloseToHome}
              className={`text-xs px-3 py-1.5 rounded-md font-bold transition flex items-center gap-1.5 ${
                !isInsideApp
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>تطبيقات الموارد البشرية</span>
            </button>
          </div>
        )}
      </div>

      {/* Middle: Search & Filter Bar (Only if inside an app, not launcher) */}
      {isInsideApp && effectiveApp !== 'SETTINGS' && (
        <div className="flex-1 max-w-xl mx-4 hidden md:flex items-center bg-white/10 hover:bg-white/15 rounded text-white text-xs px-2.5 py-1 transition focus-within:bg-white focus-within:text-slate-900 border border-white/20">
          <Search className="w-3.5 h-3.5 opacity-70 ml-2" />
          <input
            type="text"
            placeholder={`بحث في ${effectiveApp ? (appTitles[effectiveApp as ActiveApp]?.ar || effectiveApp) : ''}... (اسم، رقم مدني، كود)`}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="bg-transparent border-none outline-none w-full placeholder-white/60 focus:placeholder-slate-400 text-xs py-0.5"
          />
          <Filter className="w-3.5 h-3.5 opacity-70 mr-1 cursor-pointer hover:opacity-100" />
        </div>
      )}

      {/* Left Side: Actions, Company Switcher, OCR & Profile */}
      <div className="flex items-center gap-3">
        {/* Global Print Actions (Always visible) */}
        <div className="relative">
          <button
            onClick={() => {
              setShowPrintMenu(!showPrintMenu);
              setShowCompanyMenu(false);
              setShowNotifMenu(false);
              setShowUserMenu(false);
            }}
            className="flex items-center gap-1.5 bg-purple-900/30 hover:bg-purple-900/50 text-white text-xs px-2.5 py-1 rounded border border-white/20 transition cursor-pointer font-bold"
            title="خيارات الطباعة"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">طباعة</span>
            <ChevronDown className="w-3 h-3 text-white/70" />
          </button>
          
          {showPrintMenu && (
            <div className="absolute right-0 mt-1.5 w-48 bg-white rounded-md shadow-xl text-slate-800 text-xs py-1 z-50 border border-slate-200 animate-in fade-in zoom-in-95 dir-rtl text-right">
              <button 
                onClick={() => {
                  if (typeof onNavigateToApp === 'function') onNavigateToApp('DOCUMENTS_TEMPLATES');
                  setShowPrintMenu(false);
                }}
                className="w-full text-right px-3 py-2 hover:bg-purple-50 hover:text-purple-700 transition flex items-center gap-2 font-medium"
              >
                <FileText className="w-3.5 h-3.5" />
                طباعة العقد
              </button>
              <button 
                onClick={() => {
                  if (typeof onNavigateToApp === 'function') onNavigateToApp('DOCUMENTS_TEMPLATES');
                  setShowPrintMenu(false);
                }}
                className="w-full text-right px-3 py-2 hover:bg-purple-50 hover:text-purple-700 transition flex items-center gap-2 font-medium"
              >
                <FileText className="w-3.5 h-3.5" />
                طباعة شهادة الراتب
              </button>
              <button 
                onClick={() => {
                  if (typeof onNavigateToApp === 'function') onNavigateToApp('LEAVES');
                  setShowPrintMenu(false);
                }}
                className="w-full text-right px-3 py-2 hover:bg-purple-50 hover:text-purple-700 transition flex items-center gap-2 font-medium border-t border-slate-100"
              >
                <Grid className="w-3.5 h-3.5" />
                طباعة تقرير الإجازات
              </button>
            </div>
          )}
        </div>

        {/* Ask AI Copilot Button */}
        {onOpenAICopilot && (
          <button
            onClick={onOpenAICopilot}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs px-2.5 py-1 rounded flex items-center gap-1 font-bold transition shadow-sm border border-amber-300/40 cursor-pointer"
            title="مساعد أودو الذكي (Odoo AI Copilot)"
          >
            <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
            <span className="hidden sm:inline">اسأل الذكاء الاصطناعي</span>
          </button>
        )}

        {/* Quick OCR Scanner Trigger */}
        <button
          onClick={onOpenOCRModal}
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-2.5 py-1 rounded flex items-center gap-1.5 font-medium transition shadow-sm border border-emerald-400/30 cursor-pointer"
          title="الماسح الضوئي الذكي للهويات والمستندات (OCR Vision)"
        >
          <Scan className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">ماكينة OCR للهويات</span>
        </button>

        {/* Ambient Sound / Atmosphere Toggle (Envato Nucleus 02 inspired) */}
        {onToggleAmbientSound && (
          <button
            onClick={onToggleAmbientSound}
            className={`text-xs px-2.5 py-1 rounded flex items-center gap-1.5 font-medium transition shadow-sm border cursor-pointer ${
              isAmbientPlaying 
                ? 'bg-purple-600 hover:bg-purple-500 text-white border-purple-400 animate-pulse' 
                : 'bg-white/10 hover:bg-white/25 text-white/90 border-white/20'
            }`}
            title="تشغيل/إيقاف الأجواء الصوتية الهادئة والموسيقى البيئية"
          >
            {isAmbientPlaying ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 opacity-70" />}
            <span className="hidden lg:inline">{isAmbientPlaying ? 'أجواء هادئة نشطة' : 'الموسيقى البيئية'}</span>
          </button>
        )}

        {/* Multi-Company Switcher / Isolated Tenant Badge */}
        <div className="relative">
          {currentUserRole === 'SUPER_ADMIN' ? (
            <>
              <button
                onClick={() => {
                  setShowCompanyMenu(!showCompanyMenu);
                  setShowNotifMenu(false);
                  setShowUserMenu(false);
                  setShowPrintMenu(false);
                }}
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs px-2.5 py-1 rounded border border-white/20 transition cursor-pointer"
                title="لوحة المالك: التبديل بين المنشآت المشتركة"
              >
                <Building2 className="w-3.5 h-3.5 text-amber-300" />
                <span className="truncate max-w-[130px] font-medium">{activeCompany?.nameAr || 'المنظومة'}</span>
                <ChevronDown className="w-3 h-3 text-white/70" />
              </button>

              {showCompanyMenu && (
                <div className="absolute left-0 mt-1.5 w-64 bg-white rounded-md shadow-xl text-slate-800 text-xs py-1 z-50 border border-slate-200 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-semibold text-slate-400">
                    المنشآت المشتركة (Super Admin Multi-Tenant)
                  </div>
                  {(companies || []).map((comp) => (
                    <div
                      key={comp?.id || Math.random()}
                      className={`px-3 py-2 hover:bg-slate-50 flex items-center justify-between text-xs transition border-b border-slate-50 ${
                        comp?.id === activeCompany?.id ? 'bg-purple-50/50' : ''
                      }`}
                    >
                      <div 
                        onClick={() => {
                          onSelectCompany(comp);
                          setShowCompanyMenu(false);
                        }}
                        className="cursor-pointer flex-1"
                      >
                        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <span>{comp?.nameAr || ''}</span>
                          {comp?.id === activeCompany?.id && (
                            <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">نشط</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500">سجل تجاري: {comp?.commercialRegNo || ''}</div>
                      </div>

                      <button
                        type="button"
                        title="دخول بيئة المنشأة المعزولة"
                        onClick={() => {
                          onSelectCompany(comp);
                          setShowCompanyMenu(false);
                          handleCloseToHome();
                        }}
                        className="p-1.5 bg-[#714B67]/10 hover:bg-[#714B67] text-[#714B67] hover:text-white rounded-lg transition flex items-center gap-1 cursor-pointer text-[10px] font-bold mr-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>دخول</span>
                      </button>
                    </div>
                  ))}

                  <div className="border-t border-slate-100 mt-1 pt-1 px-1">
                    <button
                      onClick={() => {
                        setShowCompanyMenu(false);
                        if (onNavigateToApp) {
                          onNavigateToApp('SAAS_ADMIN');
                        }
                      }}
                      className="w-full text-center px-3 py-1.5 bg-[#714B67]/10 hover:bg-[#714B67]/20 text-[#714B67] font-bold text-[11px] rounded transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      إدارة المنظومة والاشتراكات (SaaS Admin)
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div 
              className="flex items-center gap-1.5 bg-white/10 text-white text-xs px-2.5 py-1 rounded border border-white/20 select-none"
              title="بيئة المنشأة المعزولة"
            >
              <Building2 className="w-3.5 h-3.5 text-emerald-300" />
              <span className="truncate max-w-[150px] font-medium">{activeCompany?.nameAr || 'المنشأة'}</span>
              <span className="text-[9px] bg-emerald-500/30 text-emerald-200 px-1 rounded font-mono font-bold">معزول</span>
            </div>
          )}
        </div>

        {/* Odoo Enterprise Developer Mode Toolbar & Debug Dropdown */}
        <OdooDebugMenu
          currentModel={currentModel}
          currentViewType={viewMode || 'kanban'}
          isInspectorActive={isInspectorActive}
          onToggleFieldInspector={onToggleFieldInspector}
        />

        {/* Notifications Dropdown Trigger */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifMenu(!showNotifMenu);
              setShowCompanyMenu(false);
              setShowPrintMenu(false);
              setShowUserMenu(false);
            }}
            className="relative p-1.5 rounded hover:bg-white/10 transition flex items-center justify-center cursor-pointer"
            title="التنبيهات الذكية والمخاطر التشغيلية"
          >
            <Bell className={`w-4 h-4 ${criticalCount > 0 ? 'text-amber-300 animate-bounce' : 'text-white/90'}`} />
            {unreadCount > 0 && (
              <span className={`absolute -top-0.5 -right-0.5 text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-xs ${
                criticalCount > 0 ? 'bg-rose-500 text-white' : 'bg-amber-400 text-slate-900'
              }`}>
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Menu */}
          {showNotifMenu && (
            <div className="absolute left-0 mt-1.5 w-80 sm:w-96 bg-white rounded-xl shadow-2xl text-slate-800 text-xs py-2 z-50 border border-slate-200 animate-in fade-in zoom-in-95">
              <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-xl">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Bell className="w-4 h-4 text-[#714B67]" />
                  <span>تنبيهات النظام الذكية</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold">
                  {criticalCount > 0 && (
                    <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">
                      {criticalCount} حرج 🚨
                    </span>
                  )}
                  {warningCount > 0 && (
                    <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                      {warningCount} متوسط ⚠️
                    </span>
                  )}
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {(notifications || []).length === 0 ? (
                  <div className="p-6 text-center text-slate-400 space-y-1">
                    <Check className="w-6 h-6 text-emerald-500 mx-auto" />
                    <p className="font-bold text-xs text-slate-600">لا توجد تنبيهات حالياً</p>
                    <p className="text-[10px]">جميع الإقامات والتراخيص وفترات التجربة سارية وسليمة.</p>
                  </div>
                ) : (
                  notifications.map((notif) => {
                    const isCritical = notif.severity === 'CRITICAL';
                    return (
                      <div
                        key={notif.id}
                        onClick={() => {
                          if (onNavigateToApp) {
                            onNavigateToApp(notif.actionApp, notif.employeeId);
                          }
                          setShowNotifMenu(false);
                        }}
                        className={`p-3 hover:bg-slate-50 transition cursor-pointer flex items-start gap-2.5 ${
                          isCritical ? 'bg-rose-50/40' : 'bg-amber-50/20'
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                          isCritical ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {notif.type === 'MOH_LICENSE' ? (
                            <ShieldAlert className="w-3.5 h-3.5" />
                          ) : notif.type === 'PROBATION' ? (
                            <Clock className="w-3.5 h-3.5" />
                          ) : notif.type === 'ABSENCE' ? (
                            <UserX className="w-3.5 h-3.5" />
                          ) : notif.type === 'TARDINESS' ? (
                            <Clock3 className="w-3.5 h-3.5" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5" />
                          )}
                        </div>

                        <div className="flex-1 space-y-0.5">
                          <div className="flex items-center justify-between">
                            <h6 className="font-bold text-slate-900 text-xs">{notif.title}</h6>
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                              isCritical ? 'bg-rose-200 text-rose-800' : 'bg-amber-200 text-amber-900'
                            }`}>
                              {isCritical ? 'حرج' : 'متوسط'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-snug">{notif.description}</p>
                          <div className="text-[10px] text-[#714B67] font-bold flex items-center gap-1 pt-1">
                            <span>اضغط للانتقال والمعالجة</span>
                            <ArrowLeft className="w-3 h-3" />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Language Switcher Menu (o_switch_lang_menu) */}
        <div id="o_switch_lang_menu" className="o_switch_lang_menu flex items-center gap-1.5 px-2 py-1 rounded bg-white/10 text-white text-xs">
          <button
            type="button"
            onClick={() => {
              setLang('ar');
              toast.success('تم تفعيل اللغة العربية وضبط الاتجاه RTL (ar_001)');
            }}
            className={`cursor-pointer transition px-1.5 py-0.5 rounded font-bold ${lang === 'ar' ? 'bg-white/25 text-white underline underline-offset-2' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
            title="تبديل إلى العربية (ar_001 - RTL)"
          >
            العربية
          </button>
          <span className="text-white/40 text-[10px]">|</span>
          <button
            type="button"
            onClick={() => {
              setLang('en');
              toast.success('English language activated (en_US) - LTR');
            }}
            className={`cursor-pointer transition px-1.5 py-0.5 rounded font-bold ${lang === 'en' ? 'bg-white/25 text-white underline underline-offset-2' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
            title="Switch to English (en_US - LTR)"
          >
            English
          </button>
        </div>

        {/* User Profile Avatar & Dropdown Menu */}
        <div className="relative border-r border-white/20 pr-2.5 mr-1">
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowCompanyMenu(false);
              setShowNotifMenu(false);
              setShowPrintMenu(false);
              setShowLangMenu(false);
            }}
            className="flex items-center gap-1.5 hover:bg-white/10 p-1 rounded transition cursor-pointer"
            title="حساب المستخدم وتسجيل الخروج"
          >
            <div className="w-7 h-7 rounded-full bg-amber-400 text-slate-950 font-black flex items-center justify-center text-xs shadow-xs border border-amber-300">
              S
            </div>
            <span className="text-xs font-semibold text-white/90 hidden lg:inline">Sayed</span>
            <ChevronDown className="w-3 h-3 text-white/70" />
          </button>

          {/* User Profile Menu Modal */}
          {showUserMenu && (
            <div className="absolute left-0 mt-1.5 w-64 bg-white rounded-xl shadow-2xl text-slate-800 text-xs py-2 z-50 border border-slate-200 animate-in fade-in zoom-in-95 dir-rtl text-right">
              {/* User Header Info */}
              <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/80 rounded-t-xl">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#714B67] text-white font-bold flex items-center justify-center text-xs shadow">
                    S
                  </div>
                  <div>
                    <h6 className="font-bold text-slate-900 text-xs flex items-center gap-1">
                      <span>Sayed</span>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    </h6>
                    <p className="text-[10px] text-slate-500 font-mono">{currentUserEmail || 'elsayedhr1993@gmail.com'}</p>
                  </div>
                </div>
                <div className="mt-2 inline-block px-2 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-bold rounded-full">
                  مشرف النظام العام (System Admin)
                </div>
              </div>

              {/* Navigation Actions */}
              <div className="py-1">
                <button
                  onClick={() => {
                    handleCloseToHome();
                    setShowUserMenu(false);
                  }}
                  className="w-full text-right px-4 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-medium"
                >
                  <Grid className="w-4 h-4 text-[#714B67]" />
                  <span>لوحة التطبيقات الرئيسية</span>
                </button>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    if (onOpenProfile) onOpenProfile();
                  }}
                  className="w-full text-right px-4 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-medium"
                >
                  <ShieldCheck className="w-4 h-4 text-[#714B67]" />
                  <span>الملف الشخصي والأمان (Profile)</span>
                </button>

                {onNavigateToApp && (
                  <>
                    <button
                      onClick={() => {
                        onNavigateToApp('SETTINGS');
                        setShowUserMenu(false);
                      }}
                      className="w-full text-right px-4 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-medium"
                    >
                      <Building2 className="w-4 h-4 text-[#714B67]" />
                      <span>إعدادات الشركات والمنظومة</span>
                    </button>
                    <button
                      onClick={() => {
                        onNavigateToApp('SETTINGS'); // Assume Developer Mode is part of settings
                        setShowUserMenu(false);
                      }}
                      className="w-full text-right px-4 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-medium"
                    >
                      <Settings className="w-4 h-4 text-[#714B67]" />
                      <span>Administration / Settings</span>
                    </button>
                  </>
                )}
              </div>

              {/* Logout Option */}
              <div className="border-t border-slate-100 pt-1 mt-1">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    if (onLogout) onLogout();
                  }}
                  className="w-full text-right px-4 py-2.5 bg-rose-50/50 hover:bg-rose-100/80 text-rose-700 font-bold flex items-center justify-between text-xs transition"
                >
                  <div className="flex items-center gap-2">
                    <LogOut className="w-4 h-4 text-rose-600" />
                    <span>تسجيل الخروج (Logout)</span>
                  </div>
                  <span className="text-[10px] bg-rose-200/80 px-1.5 py-0.5 rounded text-rose-900 font-normal">
                    إنهاء الجلسة
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Direct Logout Quick Button in Header */}
        <button
          onClick={() => {
            if (onLogout) onLogout();
          }}
          className="p-1.5 rounded bg-rose-600/80 hover:bg-rose-600 text-white transition flex items-center gap-1 text-xs font-bold shadow-xs cursor-pointer mr-1"
          title="تسجيل الخروج الفوري"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden xl:inline text-[11px]">خروج</span>
        </button>
      </div>
    </header>
  );
};

