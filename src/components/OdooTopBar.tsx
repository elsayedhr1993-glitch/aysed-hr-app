import React, { useState } from 'react';
import {
  Grid, Search, Filter, Building2, Bell, Scan, Printer,
  ChevronDown, Check, User, Sparkles, FileText, AlertTriangle, ShieldAlert, Clock, UserX, Clock3, ArrowLeft, X, LogOut, ShieldCheck, Eye, Music, Volume2, VolumeX, Settings, Bug, Globe
} from 'lucide-react';
import { Company, ActiveApp, ViewMode } from '../types';
import { SystemNotification } from '../utils/notificationsEngine';
import { OdooDebugMenu } from './OdooDebugMenu';
import { useLang } from '../lib/i18n';

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
  onOpenAdmin?: () => void;
  onAddNew?: () => void;
  onExport?: () => void;
  onLoadDemoData?: () => void;
  onPurgeSystemData?: () => void;
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
  DAILY_MOVEMENTS: 'hr.daily.movement',
  HOLIDAY_WORK: 'hr.holiday.work',
  LEAVE_TYPES_CONFIG: 'hr.leave.type',
};

const appTitles: Record<ActiveApp, { ar: string; en: string }> = {
  APP_LAUNCHER: { ar: 'قائمة التطبيقات', en: 'App Launcher' },
  EMPLOYEES: { ar: 'الموظفين', en: 'Employees' },
  RECRUITMENT: { ar: 'التوظيف', en: 'Recruitment' },
  CONTRACTS: { ar: 'عقود العمل', en: 'Contracts' },
  LEAVES: { ar: 'الإجازات والغياب', en: 'Time Off' },
  HOLIDAYS: { ar: 'العطلات الرسمية في دولة الكويت', en: 'Kuwait Official Holidays' },
  SHIFTS: { ar: 'إدارة الورديات وجداول الدوام', en: 'Shifts & Schedules' },
  DAILY_MOVEMENTS: { ar: 'الحركات اليومية (استئذان، مرضية، بدل)', en: 'Daily Movements' },
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
  HOLIDAY_WORK: { ar: 'العمل في العطلات والجمع (1.5x)', en: 'Holiday & Weekend Work' },
  LEAVE_TYPES_CONFIG: { ar: 'تهيئة أنواع الإجازات وقواعد الاستحقاق', en: 'Leave Types Configuration' },
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
  currentUserEmail = '',
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
  onOpenAdmin,
  onAddNew,
  onExport,
  onLoadDemoData,
  onPurgeSystemData,
}) => {
  const [showCompanyMenu, setShowCompanyMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showPrintMenu, setShowPrintMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const { lang, setLang, currentLangCode } = useLang();

  const superAdminComp: Company = (companies || []).find(c => c?.id === 'comp-super-admin') || {
    id: 'comp-super-admin',
    nameAr: 'منصة إدارة النظام المركزية (SaaS Platform)',
    nameEn: 'SaaS Platform Controller',
    commercialRegNo: 'SAAS-001',
    civilIdCompany: '999999999999',
    bankName: 'بنك الكويت الوطني (NBK)',
    iban: 'KW12NBKW000000000000999',
    wsiCode: 'WSI-ADMIN',
    currency: 'KWD',
    status: 'active'
  };

  const handleSelectSuperAdmin = () => {
    onSelectCompany(superAdminComp);
    setShowCompanyMenu(false);
    if (onNavigateToApp) onNavigateToApp('SAAS_ADMIN');
  };

  // Close all open menus when clicking outside
  React.useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.odoo-topbar-dropdown-container')) {
        setShowCompanyMenu(false);
        setShowNotifMenu(false);
        setShowUserMenu(false);
        setShowPrintMenu(false);
        setShowLangMenu(false);
      }
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

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

  const emailLower = (currentUserEmail || '').toLowerCase();
  const isMasterEmail = emailLower === 'admin@aysed.com' || emailLower === 'elsayedhr1993@gmail.com';
  const isSuperAdmin = currentUserRole === 'SUPER_ADMIN' || isMasterEmail;

  // منطق توحيد اسم المنشأة والحرف التعريفي للمستخدم (get_aysed_header_info)
  const getUserHeaderInfo = () => {
    let userName = "Sayed";
    if (currentUserEmail) {
      const emailLocal = currentUserEmail.split('@')[0];
      if (emailLocal.toLowerCase().includes('sayed')) {
        userName = "Sayed";
      } else if (emailLocal.toLowerCase() === 'admin') {
        userName = "Sayed (Admin)";
      } else {
        userName = emailLocal.charAt(0).toUpperCase() + emailLocal.slice(1);
      }
    }
    const userInitial = userName.trim().charAt(0).toUpperCase() || 'S';
    const companyName = activeCompany?.nameAr || activeCompany?.nameEn || 'Aysed HR S 2026';
    return {
      userName,
      userInitial, // يضمن توليد حرف 'S' تلقائياً
      companyName,
    };
  };

  const { userName, userInitial, companyName } = getUserHeaderInfo();

  const criticalCount = (notifications || []).filter(n => n.severity === 'CRITICAL').length;
  const warningCount = (notifications || []).filter(n => n.severity === 'WARNING').length;
  const unreadCount = (notifications || []).length;

  return (
    <div className="flex flex-col sticky top-0 z-40 select-none shadow-md" dir="rtl">
      {/* Row 1: Navbar (Odoo Enterprise Top Bar) */}
      <header className="bg-[#714B67] border-b border-white/20 text-white h-11 px-3 sm:px-4 flex items-center justify-between gap-2">
        {/* Right Side: App Grid Launcher + App Title */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 min-w-0">
          <button
            onClick={handleCloseToHome}
            className="p-1.5 rounded-lg hover:bg-white/15 transition flex items-center justify-center text-white cursor-pointer shrink-0 active:scale-95"
            title="فتح شاشة التطبيقات الرئيسية"
          >
            <Grid className="w-5 h-5 text-white" />
          </button>

          {/* Company & Current App Info */}
          <div className="flex items-center gap-1.5 border-r border-white/25 pr-2.5 min-w-0">
            <div className="flex items-center gap-1 max-w-[130px] sm:max-w-[170px] shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span className="font-bold text-xs sm:text-sm text-amber-300 truncate font-sans" title={companyName}>
                {companyName}
              </span>
            </div>

            <span className="text-white/40 text-xs shrink-0">/</span>

            <span className="text-xs font-semibold text-white/95 truncate max-w-[120px] sm:max-w-[160px]" title={effectiveApp ? (appTitles[effectiveApp as ActiveApp]?.ar || effectiveApp) : 'قائمة التطبيقات'}>
              {effectiveApp ? (appTitles[effectiveApp as ActiveApp]?.ar || effectiveApp) : 'قائمة التطبيقات'}
            </span>
          </div>

          {/* Direct Super Admin Quick Badge */}
          {isSuperAdmin && onOpenAdmin && (
            <button
              type="button"
              onClick={onOpenAdmin}
              className="hidden md:flex text-[11px] px-2.5 py-1 rounded-md font-bold transition items-center gap-1 bg-gradient-to-r from-indigo-700 to-purple-900 hover:from-indigo-600 hover:to-purple-800 text-white shadow-xs border border-indigo-400/40 cursor-pointer active:scale-95 whitespace-nowrap shrink-0 mr-1"
              title="الانتقال إلى لوحة السوبر أدمن المركزية"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>لوحة السوبر أدمن 👑</span>
            </button>
          )}
        </div>

        {/* Middle: Search Bar */}
        {isInsideApp && effectiveApp !== 'SETTINGS' && (
          <div className="flex-1 max-w-xs md:max-w-sm lg:max-w-md mx-2 hidden sm:flex items-center bg-white/15 hover:bg-white/20 rounded-lg text-white text-xs px-2.5 py-1 transition focus-within:bg-white focus-within:text-slate-900 border border-white/20 shrink min-w-0">
            <Search className="w-3.5 h-3.5 opacity-80 ml-2 shrink-0" />
            <input
              type="text"
              placeholder={`بحث في ${effectiveApp ? (appTitles[effectiveApp as ActiveApp]?.ar || effectiveApp) : ''}...`}
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="bg-transparent border-none outline-none w-full placeholder-white/70 focus:placeholder-slate-400 text-xs py-0.5"
            />
            <Filter className="w-3.5 h-3.5 opacity-70 mr-1 cursor-pointer hover:opacity-100 shrink-0" />
          </div>
        )}

        {/* Left Side: Actions, Switcher, Tools & Profile */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Ask AI Copilot Button */}
          {onOpenAICopilot && (
            <button
              onClick={onOpenAICopilot}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs px-2 py-1 rounded-md flex items-center gap-1 font-bold transition shadow-xs border border-amber-300 cursor-pointer active:scale-95 shrink-0"
              title="مساعد أودو الذكي (Odoo AI Copilot)"
            >
              <Sparkles className="w-3.5 h-3.5 fill-slate-950 shrink-0" />
              <span className="hidden xl:inline text-[11px] whitespace-nowrap">اسأل الذكاء</span>
            </button>
          )}

          {/* Quick OCR Scanner Trigger */}
          <button
            onClick={onOpenOCRModal}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-2 py-1 rounded-md flex items-center gap-1 font-medium transition shadow-xs border border-emerald-400/40 cursor-pointer active:scale-95 shrink-0"
            title="الماسح الضوئي الذكي للهويات والمستندات (OCR Vision)"
          >
            <Scan className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden 2xl:inline text-[11px] whitespace-nowrap">OCR الهويات</span>
          </button>

          {/* Multi-Company Switcher Dropdown */}
          <div className="relative odoo-topbar-dropdown-container">
            {isSuperAdmin || (companies && companies.length > 1) ? (
              <>
                <button
                  onClick={() => {
                    setShowCompanyMenu(!showCompanyMenu);
                    setShowNotifMenu(false);
                    setShowUserMenu(false);
                    setShowPrintMenu(false);
                  }}
                  className="flex items-center gap-1 bg-white/15 hover:bg-white/25 text-white text-xs px-2 py-1 rounded-md border border-white/20 transition cursor-pointer"
                  title="لوحة المالك: التبديل بين المنشآت والشركات"
                >
                  <Building2 className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span className="truncate max-w-[90px] sm:max-w-[120px] font-medium text-[11px]">{activeCompany?.nameAr || 'المنظومة'}</span>
                  <ChevronDown className="w-3 h-3 text-white/70 shrink-0" />
                </button>

                {showCompanyMenu && (
                  <div className="absolute left-0 mt-1.5 w-72 bg-white rounded-lg shadow-xl text-slate-800 text-xs py-1 z-50 border border-slate-200 animate-in fade-in zoom-in-95 dir-rtl text-right">
                    <div className="border-b border-slate-200 pb-1 mb-1 bg-purple-50/30">
                      <div className="px-3 py-1.5 text-[11px] font-bold text-purple-800 flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5 text-purple-600" />
                        <span>منصة إدارة النظام المركزية (SaaS Platform)</span>
                      </div>
                      <div
                        className={`px-3 py-2 hover:bg-purple-50/50 flex items-center justify-between text-xs transition ${
                          activeCompany?.id === 'comp-super-admin' ? 'bg-purple-100/70 font-semibold' : ''
                        }`}
                      >
                        <div onClick={handleSelectSuperAdmin} className="cursor-pointer flex-1 min-w-0">
                          <div className="font-bold text-purple-900 flex items-center gap-1.5">
                            <span className="truncate">إدارة النظام المركزية (Super Admin)</span>
                            {activeCompany?.id === 'comp-super-admin' && (
                              <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold shrink-0">نشط</span>
                            )}
                          </div>
                          <div className="text-[10px] text-purple-600 truncate">التحكم الشامل والاشتراكات والمنشآت</div>
                        </div>
                        <button
                          type="button"
                          title="دخول لوحة السوبر أدمن"
                          onClick={handleSelectSuperAdmin}
                          className="p-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition flex items-center gap-1 cursor-pointer text-[10px] font-bold mr-1 shrink-0 shadow-xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>دخول</span>
                        </button>
                      </div>
                    </div>

                    <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-semibold text-slate-400">
                      العيادات والمنشآت المشتركة (Tenant Clinics)
                    </div>
                    {((companies || []).filter(c => c?.id !== 'comp-super-admin')).map((comp) => (
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
                          className="cursor-pointer flex-1 min-w-0"
                        >
                          <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-[#714B67] shrink-0" />
                            <span className="truncate">{comp?.nameAr || ''}</span>
                            {comp?.id === activeCompany?.id && (
                              <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold shrink-0">نشط</span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate">سجل تجاري: {comp?.commercialRegNo || 'غير محدد'}</div>
                        </div>
                        <button
                          type="button"
                          title="دخول بيئة المنشأة المعزولة"
                          onClick={() => {
                            onSelectCompany(comp);
                            setShowCompanyMenu(false);
                            handleCloseToHome();
                          }}
                          className="p-1.5 bg-[#714B67]/10 hover:bg-[#714B67] text-[#714B67] hover:text-white rounded-lg transition flex items-center gap-1 cursor-pointer text-[10px] font-bold mr-1 shrink-0"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>دخول</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div
                className="flex items-center gap-1.5 bg-white/10 text-white text-xs px-2.5 py-1.5 rounded-md border border-white/20 select-none shadow-xs"
                title="بيئة المنشأة المعزولة"
              >
                <Building2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                <span className="truncate max-w-[120px] font-bold text-[11px]">{activeCompany?.nameAr || activeCompany?.nameEn || 'المنشأة'}</span>
              </div>
            )}
          </div>

          {/* Odoo Enterprise Developer Mode & Debug Dropdown */}
          {isSuperAdmin && (
            <OdooDebugMenu
              currentModel={currentModel}
              currentViewType={(viewMode === 'list' || viewMode === 'form' || viewMode === 'kanban') ? viewMode : 'kanban'}
              isInspectorActive={isInspectorActive}
              onToggleFieldInspector={onToggleFieldInspector}
            />
          )}

          {/* Notifications Dropdown Trigger (Containing Smart Risks & Alerts) */}
          <div className="relative odoo-topbar-dropdown-container">
            <button
              onClick={() => {
                setShowNotifMenu(!showNotifMenu);
                setShowCompanyMenu(false);
                setShowPrintMenu(false);
                setShowUserMenu(false);
              }}
              className="relative p-1.5 rounded hover:bg-white/10 transition flex items-center justify-center cursor-pointer"
              title="تنبيهات النظام الذكية والمخاطر التشغيلية"
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

            {showNotifMenu && (
              <div className="absolute left-0 mt-1.5 w-80 sm:w-96 bg-white rounded-xl shadow-2xl text-slate-800 text-xs py-2 z-50 border border-slate-200 animate-in fade-in zoom-in-95">
                <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-xl">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <Bell className="w-4 h-4 text-[#714B67]" />
                    <span>تنبيهات النظام الذكية والمخاطر</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-bold">
                    {criticalCount > 0 && (
                      <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">{criticalCount} حرج 🚨</span>
                    )}
                    {warningCount > 0 && (
                      <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">{warningCount} متوسط ⚠️</span>
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

          {/* Quick Demo Data & Clear Demo Buttons */}
          <div className="hidden sm:flex items-center gap-1.5 shrink-0 border-r border-white/20 pr-2">
            {onLoadDemoData && (
              <button
                type="button"
                onClick={onLoadDemoData}
                className="bg-amber-400 hover:bg-amber-500 text-slate-950 px-2.5 py-1 rounded text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap animate-pulse"
                title="استعادة كافة بيانات موظفي وعقود ورواتب المنار كلينك التجريبية فوراً"
              >
                <span>✨ استعادة بيانات المنار كلينك</span>
              </button>
            )}
            {onPurgeSystemData && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('هل أنت متأكد من مسح البيانات التجريبية وإعادة تصفير النظام؟')) {
                    onPurgeSystemData();
                  }
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white px-2 py-1 rounded text-xs font-bold transition shadow-xs flex items-center gap-1 cursor-pointer whitespace-nowrap"
                title="مسح البيانات التجريبية (Clear Demo Data)"
              >
                <span>🗑️ مسح البيانات</span>
              </button>
            )}
          </div>

          {/* Language Switcher */}
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/10 text-white text-xs shrink-0 whitespace-nowrap">
            <button
              type="button"
              onClick={() => {
                setLang('ar');
              }}
              className={`cursor-pointer transition px-1 py-0.5 rounded font-bold ${lang === 'ar' ? 'bg-white/25 underline' : 'text-white/70 hover:text-white'}`}
            >
              عربي
            </button>
            <span className="text-white/40">|</span>
            <button
              type="button"
              onClick={() => {
                setLang('en');
              }}
              className={`cursor-pointer transition px-1 py-0.5 rounded font-bold ${lang === 'en' ? 'bg-white/25 underline' : 'text-white/70 hover:text-white'}`}
            >
              EN
            </button>
          </div>

          {/* User Profile Avatar & Dropdown Menu */}
          <div className="relative border-r border-white/20 pr-2 mr-0.5 odoo-topbar-dropdown-container">
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
                {userInitial}
              </div>
              <span className="text-xs font-semibold text-white/90 hidden lg:inline">
                {userName}
              </span>
              <ChevronDown className="w-3 h-3 text-white/70" />
            </button>

            {showUserMenu && (
              <div className="absolute left-0 mt-1.5 w-64 bg-white rounded-xl shadow-2xl text-slate-800 text-xs py-2 z-50 border border-slate-200 animate-in fade-in zoom-in-95 dir-rtl text-right">
                <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/80 rounded-t-xl">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#714B67] text-white font-bold flex items-center justify-center text-xs shadow">
                      {userInitial}
                    </div>
                    <div>
                      <h6 className="font-bold text-slate-900 text-xs flex items-center gap-1">
                        <span>{userName}</span>
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      </h6>
                      <p className="text-[10px] text-slate-500 font-mono">{currentUserEmail || 'sayed@company.com'}</p>
                    </div>
                  </div>
                  <div className={`mt-2 inline-block px-2 py-0.5 ${isSuperAdmin ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'} text-[10px] font-bold rounded-full`}>
                    {isSuperAdmin ? 'مشرف النظام العام' : 'مدير المنشأة'}
                  </div>
                </div>

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
                    <span>الملف الشخصي والأمان</span>
                  </button>
                </div>

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
                      <span>تسجيل الخروج</span>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Row 2: Control Bar (Odoo Enterprise Breadcrumb & Actions Bar) */}
      <div className="bg-slate-100 border-b border-slate-200 text-slate-800 h-9 px-3 sm:px-4 flex items-center justify-between text-xs font-semibold">
        {/* Right: Breadcrumb & Back */}
        <div className="flex items-center gap-2 text-slate-700">
          <button
            onClick={handleCloseToHome}
            className="flex items-center gap-1 text-slate-500 hover:text-[#714B67] transition font-bold"
            title="العودة"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>الرئيسية</span>
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-slate-500 font-medium">شؤون الموظفين</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-900 font-bold">
            {effectiveApp ? (appTitles[effectiveApp as ActiveApp]?.ar || effectiveApp) : 'الرئيسية'}
          </span>
        </div>

        {/* Left: Action Buttons (New, Print, Export) */}
        <div className="flex items-center gap-1.5">
          {onAddNew && (
            <button
              onClick={onAddNew}
              className="bg-[#714B67] hover:bg-[#5b3c53] text-white px-2.5 py-1 rounded text-xs font-bold transition shadow-xs flex items-center gap-1 cursor-pointer"
            >
              <span>جديد (New)</span>
            </button>
          )}

          {onExport && (
            <button
              onClick={onExport}
              className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 px-2 py-1 rounded text-xs font-medium transition shadow-2xs flex items-center gap-1 cursor-pointer"
            >
              <span>تصدير</span>
            </button>
          )}

          {/* Global Print Dropdown */}
          <div className="relative odoo-topbar-dropdown-container">
            <button
              onClick={() => {
                setShowPrintMenu(!showPrintMenu);
                setShowCompanyMenu(false);
                setShowNotifMenu(false);
                setShowUserMenu(false);
              }}
              className="flex items-center gap-1 bg-white hover:bg-slate-50 text-slate-700 text-xs px-2.5 py-1 rounded border border-slate-300 transition cursor-pointer font-medium shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>طباعة وإجراءات</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>

            {showPrintMenu && (
              <div className="absolute left-0 mt-1 w-44 bg-white rounded-lg shadow-xl text-slate-800 text-xs py-1 z-50 border border-slate-200 animate-in fade-in zoom-in-95 dir-rtl text-right">
                <button
                  onClick={() => {
                    if (typeof onNavigateToApp === 'function') onNavigateToApp('DOCUMENT_TEMPLATES');
                    setShowPrintMenu(false);
                  }}
                  className="w-full text-right px-3 py-1.5 hover:bg-purple-50 hover:text-purple-700 transition flex items-center gap-2 font-medium"
                >
                  <FileText className="w-3.5 h-3.5" />
                  طباعة التقرير العام
                </button>
                <button
                  onClick={() => {
                    if (typeof onNavigateToApp === 'function') onNavigateToApp('REPORTS');
                    setShowPrintMenu(false);
                  }}
                  className="w-full text-right px-3 py-1.5 hover:bg-purple-50 hover:text-purple-700 transition flex items-center gap-2 font-medium"
                >
                  <Grid className="w-3.5 h-3.5" />
                  تحليلات البيボт (Pivot)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
