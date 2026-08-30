import React, { useState } from 'react';
import {
  Grid, Search, Filter, Building2, Bell, Scan, Printer,
  ChevronDown, Check, User, Sparkles, FileText, AlertTriangle, ShieldAlert, Clock, UserX, Clock3, ArrowLeft, X, LogOut, ShieldCheck, Eye, Music, Volume2, VolumeX, Settings, Bug, Globe, Home, Database
} from 'lucide-react';
import { Company, ActiveApp, ViewMode } from '../types';
import { SystemNotification } from '../utils/notificationsEngine';
import { OdooDebugMenu } from './OdooDebugMenu';
import { PrintActionsMenu } from './PrintActionsMenu';
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
  onOpenIntegrityModal?: () => void;
  onSelectPrintTemplate?: (moduleType: string, templateId: string) => void;
  onOpenUIAudit?: () => void;
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
  onOpenIntegrityModal,
  onSelectPrintTemplate,
  onOpenUIAudit,
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

  const handleCloseToHome = () => {
    if (onNavigateHome) onNavigateHome();
    else if (onCloseApp) onCloseApp();
  };

  const effectiveApp = activeApp || currentApp;
  const unreadCount = (notifications || []).filter(n => !n.isRead).length;

  const userName = currentUserEmail ? currentUserEmail.split('@')[0] : 'أدمن النظام';
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <header className="w-full bg-[#261928] text-white select-none sticky top-0 z-50 shadow-md border-b border-white/10" dir="rtl">
      
      {/* 1. الشريط الرئيسي العلوي */}
      <div className="w-full px-4 h-12 flex items-center justify-between gap-3">
        
        {/* الجانب الأيمن: زر الرجوع للرئيسية + مبدل الشركات والفروع + الشعار */}
        <div className="flex items-center gap-3">
          
          {/* زر العودة للشاشة الرئيسية (Odoo Home Button) */}
          <button 
            onClick={onNavigateHome}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm border ${
              !effectiveApp 
                ? 'bg-white/10 text-white border-white/20' 
                : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-500 ring-2 ring-indigo-400/30'
            }`}
            title="العودة للشاشة الرئيسية والتطبيقات"
          >
            <Home size={15} />
            <span>الرئيسية</span>
          </button>

          {/* محدد التبديل بين الشركات والفروع (Multi-Company Switcher) */}
          <div className="relative odoo-topbar-dropdown-container">
            <button 
              onClick={() => {
                setShowCompanyMenu(!showCompanyMenu);
                setShowNotifMenu(false);
                setShowUserMenu(false);
                setShowPrintMenu(false);
              }}
              className="flex items-center gap-2 bg-black/40 hover:bg-black/60 px-3 py-1.5 rounded-lg border border-white/15 text-xs font-semibold text-slate-200 transition cursor-pointer"
            >
              <Building2 size={14} className="text-indigo-400" />
              <span className="max-w-[140px] truncate">{activeCompany?.name || activeCompany?.nameAr || 'المنار كلينك'}</span>
              <ChevronDown size={13} className="text-slate-400" />
            </button>

            {showCompanyMenu && (
              <div className="absolute right-0 mt-1.5 w-60 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 z-50 text-xs animate-in fade-in">
                <div className="px-3 py-1.5 border-b border-slate-800 text-slate-400 font-medium">
                  تبديل المنشأة / الفرع:
                </div>
                {(companies || []).map((comp) => (
                  <button
                    key={comp.id}
                    onClick={() => {
                      if (onSelectCompany) onSelectCompany(comp);
                      setShowCompanyMenu(false);
                    }}
                    className="w-full px-3 py-2 text-right hover:bg-indigo-600/30 flex items-center justify-between text-slate-200 hover:text-white transition cursor-pointer"
                  >
                    <span>{comp.name || comp.nameAr}</span>
                    {activeCompany?.id === comp.id && <Check size={14} className="text-emerald-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="hidden lg:flex items-center gap-2 border-r border-white/15 pr-3 text-xs text-slate-300 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Aysed S HR 2026</span>
          </div>
        </div>

        {/* الجانب الأيسر: حارس النزاهة + التنبيهات + السوبر أدمن + المستخدم */}
        <div className="flex items-center gap-2">
          
          {/* حارس النزاهة وأمن النظام (Data Integrity Guard) */}
          {onOpenIntegrityModal && (
            <button 
              onClick={onOpenIntegrityModal}
              className="flex items-center gap-1.5 bg-emerald-950/80 hover:bg-emerald-900/90 text-emerald-300 border border-emerald-500/40 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition shadow-sm cursor-pointer"
              title="حارس أمن وتكامل البيانات"
            >
              <ShieldCheck size={15} className="text-emerald-400" />
              <span className="hidden sm:inline">حارس النزاهة</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            </button>
          )}

          {/* تنبيهات الإقامات الذكية */}
          <div className="relative odoo-topbar-dropdown-container">
            <button 
              onClick={() => {
                setShowNotifMenu(!showNotifMenu);
                setShowCompanyMenu(false);
                setShowUserMenu(false);
                setShowPrintMenu(false);
              }}
              className="flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              <AlertTriangle size={14} />
              <span className="hidden md:inline">التنبيهات</span>
              {unreadCount > 0 && (
                <span className="bg-amber-500 text-slate-900 font-bold px-1.5 py-0.2 rounded-full text-[10px]">
                  {unreadCount}
                </span>
              )}
            </button>
            {showNotifMenu && (
              <div className="absolute left-0 mt-1.5 w-80 bg-white rounded-xl shadow-2xl text-slate-800 text-xs py-2 z-50 border border-slate-200 animate-in fade-in zoom-in-95 dir-rtl text-right">
                <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 rounded-t-xl">
                  <h6 className="font-bold text-slate-900 text-sm">التنبيهات الذكية</h6>
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {unreadCount} غير مقروءة
                  </span>
                </div>
                <div className="max-h-64 overflow-y-auto odoo-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-slate-500">
                      <Check className="w-8 h-8 mx-auto text-emerald-400 mb-2 opacity-50" />
                      <p className="font-medium text-sm">جميع الأنظمة مستقرة</p>
                      <p className="text-[10px] mt-1">لا توجد تنبيهات نشطة حالياً</p>
                    </div>
                  ) : (
                    notifications.map(notif => {
                      const isCritical = notif.severity === 'CRITICAL';
                      return (
                        <div 
                          key={notif.id} 
                          onClick={() => {
                            if (notif.actionApp) {
                              if (typeof onNavigateToApp === 'function') {
                                onNavigateToApp(notif.actionApp);
                              }
                              setShowNotifMenu(false);
                            }
                          }}
                          className={`px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition cursor-pointer flex gap-3 ${!notif.isRead ? 'bg-amber-50/30' : ''}`}
                        >
                          <div className={`shrink-0 mt-0.5 p-1.5 rounded-md ${
                            isCritical ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                          }`}>
                            <AlertTriangle className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 space-y-0.5">
                            <div className="flex items-center justify-between">
                              <h6 className="font-bold text-slate-900 text-xs">{notif.title}</h6>
                            </div>
                            <p className="text-[11px] text-slate-600 leading-snug">{notif.description}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          
          {/* Print Actions Menu */}
          {['EMPLOYEES', 'LEAVES', 'PAYROLL', 'ATTENDANCE', 'CONTRACTS'].includes(effectiveApp as string) && onSelectPrintTemplate && (
            <PrintActionsMenu 
              moduleType={
                 effectiveApp === 'LEAVES' ? 'leaves' : 
                 effectiveApp === 'PAYROLL' ? 'payroll' : 
                 effectiveApp === 'ATTENDANCE' ? 'attendance' : 
                 'employees'
              }
              onSelectTemplate={(tid) => onSelectPrintTemplate(effectiveApp as string, tid)}
            />
          )}

          {/* لوحة السوبر أدمن */}
          {onOpenAdmin && (
            <button 
              onClick={onOpenAdmin}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-3 py-1.5 rounded-lg text-xs transition shadow-sm cursor-pointer"
            >
              لوحة الأدمن
            </button>
          )}

          {/* استعادة وحفظ البيانات */}
          {onLoadDemoData && (
            <button 
              onClick={onLoadDemoData}
              className="hidden sm:flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer"
            >
              <Database size={13} />
              <span>النسخ الاحتياطي</span>
            </button>
          )}

          {/* تبديل اللغة */}
          <button 
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="flex items-center gap-1 bg-black/30 hover:bg-black/50 text-slate-300 hover:text-white px-2 py-1.5 rounded-lg border border-white/10 text-xs font-bold transition cursor-pointer"
          >
            <Globe size={13} />
            <span>{lang === 'ar' ? 'EN' : 'عربي'}</span>
          </button>

          {/* بطاقة المستخدم الحالي */}
          <div className="relative odoo-topbar-dropdown-container">
            <button 
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowNotifMenu(false);
                setShowCompanyMenu(false);
                setShowPrintMenu(false);
              }}
              className="flex items-center gap-1.5 bg-black/40 hover:bg-black/60 px-2.5 py-1.5 rounded-lg border border-white/10 text-xs font-bold text-emerald-400 transition cursor-pointer"
            >
              <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px]">
                {userInitial}
              </div>
              <span className="hidden sm:inline truncate max-w-[100px]">{userName}</span>
            </button>

            {showUserMenu && (
              <div className="absolute left-0 mt-1.5 w-64 bg-white rounded-xl shadow-2xl text-slate-800 text-xs py-2 z-50 border border-slate-200 animate-in fade-in zoom-in-95 dir-rtl text-right">
                <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/80 rounded-t-xl">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#261928] text-white font-bold flex items-center justify-center text-xs shadow">
                      {userInitial}
                    </div>
                    <div>
                      <h6 className="font-bold text-slate-900 text-xs flex items-center gap-1">
                        <span>{userName}</span>
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      </h6>
                      <p className="text-[10px] text-slate-500 font-mono truncate max-w-[150px]">{currentUserEmail || 'sayed@company.com'}</p>
                    </div>
                  </div>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      if (onOpenProfile) onOpenProfile();
                    }}
                    className="w-full text-right px-4 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-medium cursor-pointer"
                  >
                    <User className="w-4 h-4 text-[#261928]" />
                    <span>الملف الشخصي والأمان</span>
                  </button>
                </div>
                <div className="border-t border-slate-100 pt-1 mt-1">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      if (onLogout) onLogout();
                    }}
                    className="w-full text-right px-4 py-2.5 bg-rose-50/50 hover:bg-rose-100/80 text-rose-700 font-bold flex items-center justify-between text-xs transition cursor-pointer"
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

      </div>

      {/* 2. شريط المؤشرات الفرعي المدمج */}
      <div className="w-full px-4 h-7 bg-[#1b111d] flex items-center justify-between text-[11px] text-slate-400 border-t border-white/5">
        <div className="flex items-center gap-4">
          <span className="text-emerald-400 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block animate-pulse"></span>
            نظام حماية الأجور (WPS) جاهز للتحويل
          </span>
          <span className="hidden md:inline text-slate-500">|</span>
          <span className="hidden md:inline">
            الفرع الحالي: <strong className="text-slate-200">{activeCompany?.name || activeCompany?.nameAr || 'المنار كلينك'}</strong>
          </span>
          {effectiveApp && (
            <>
              <span className="hidden md:inline text-slate-500">|</span>
              <span className="hidden md:inline font-semibold text-slate-300">
                الشاشة: {appTitles[effectiveApp as ActiveApp]?.ar || effectiveApp}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {onAddNew && effectiveApp && (
            <button
              onClick={onAddNew}
              className="text-indigo-300 hover:text-indigo-200 font-bold underline transition cursor-pointer"
            >
              + إضافة سجل جديد
            </button>
          )}
          <span>العملة المعتمدة: <strong className="text-white font-mono">0.000 KWD</strong></span>
        </div>
      </div>

    </header>
  );
};
