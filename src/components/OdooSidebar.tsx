import React, { useState } from 'react';
import { 
  Users, UserPlus, FileSignature, Calendar, Clock, 
  Banknote, Scale, FolderKanban, Zap, Building2, 
  ChevronDown, ChevronUp, LogOut, ShieldCheck, FileText, Briefcase, BarChart3, Sparkles, MessageSquare, Coins, CalendarPlus
} from 'lucide-react';
import { ActiveApp, ViewMode } from '../types';

interface OdooSidebarProps {
  isOpen?: boolean;
  activeApp: ActiveApp;
  onNavigateApp?: (app: ActiveApp) => void;
  onNavigate?: (app: ActiveApp) => void;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  onNewRecord?: () => void;
  filterTab?: string;
  onFilterTabChange?: (tab: string) => void;
  onLogout?: () => void;
  currentUserRole?: string;
  currentUserEmail?: string;
}

interface SidebarGroup {
  id: string;
  title: string;
  icon: any;
  apps: {
    id: ActiveApp;
    title: string;
    icon: any;
  }[];
}

export const OdooSidebar: React.FC<OdooSidebarProps> = ({
  activeApp,
  onNavigateApp,
  onNavigate,
  viewMode,
  onViewModeChange,
  onNewRecord,
  filterTab,
  onFilterTabChange,
  onLogout,
  currentUserRole = '',
  currentUserEmail = '',
}) => {
  const emailLower = (currentUserEmail || '').toLowerCase();
  const isMasterEmail = emailLower === 'admin@aysed.com' || emailLower === 'elsayedhr1993@gmail.com';
  const isSuperAdmin = currentUserRole === 'SUPER_ADMIN' || isMasterEmail;

  // Determine which group contains the activeApp initially
  const rawGroups: SidebarGroup[] = [
    {
      id: 'SAAS_MANAGEMENT',
      title: 'إدارة النظام والاشتراكات',
      icon: Sparkles,
      apps: [
        { id: 'SAAS_ADMIN', title: 'إدارة الاشتراكات (SaaS)', icon: Sparkles },
        { id: 'COMPANIES', title: 'الشركات والمؤسسات', icon: Building2 },
      ],
    },
    {
      id: 'PERSONNEL',
      title: 'شؤون الموظفين',
      icon: Users,
      apps: [
        { id: 'EMPLOYEES', title: 'الموظفين', icon: Users },
        { id: 'CONTRACTS', title: 'العقود', icon: FileSignature },
        { id: 'RECRUITMENT', title: 'التوظيف', icon: UserPlus },
        { id: 'COMMENCEMENT', title: 'مباشرة العمل', icon: FileSignature },
      ],
    },
    {
      id: 'ATTENDANCE_OPS',
      title: 'الدوام والعمليات',
      icon: Clock,
      apps: [
        { id: 'ATTENDANCE', title: 'الحضور والدوام', icon: Clock },
        { id: 'SHIFTS', title: 'جدولة الشيفتات', icon: Clock },
        { id: 'LEAVES', title: 'الإجازات', icon: Calendar },
        { id: 'HOLIDAYS', title: 'العطلات الرسمية', icon: Calendar },
        { id: 'HOLIDAY_WORK', title: 'بدل العمل في العطلات', icon: Coins },
        { id: 'LEAVE_TYPES_CONFIG', title: 'تهيئة أنواع الإجازات', icon: CalendarPlus },
      ],
    },
    {
      id: 'FINANCE_PAYROLL',
      title: 'المالية والرواتب',
      icon: Banknote,
      apps: [
        { id: 'PAYROLL', title: 'الرواتب والتأمينات', icon: Banknote },
        { id: 'CUSTODY_LOANS', title: 'العهد والسلف', icon: Briefcase },
        { id: 'EOS', title: 'نهاية الخدمة (م51)', icon: Scale },
        { id: 'REPORTS', title: 'التقارير والتحليلات (Pivot)', icon: BarChart3 },
      ],
    },
    {
      id: 'ARCHIVE_SYSTEM',
      title: 'الأرشيف والنظام',
      icon: FolderKanban,
      apps: [
        { id: 'EXCLUSIVE_INNOVATIONS', title: 'حزمة الابتكارات الحصرية', icon: Sparkles },
        { id: 'NOTIFICATIONS', title: 'الإشعارات والواتساب', icon: MessageSquare },
        { id: 'DOCUMENTS', title: 'المستندات وOCR', icon: FolderKanban },
        { id: 'DOCUMENT_TEMPLATES', title: 'قوالب المستندات', icon: FileText },
        { id: 'AUTOMATION', title: 'الأتمتة والذكاء', icon: Zap },
        { id: 'AUDIT_LOGS', title: 'سجل الرقابة', icon: ShieldCheck },
        { id: 'SETTINGS', title: isSuperAdmin ? 'إعدادات المنظومة والشركات' : 'بيانات المنشأة والإعدادات', icon: Building2 },
      ],
    },
  ];

  const groups = rawGroups.map(group => {
    const filteredApps = group.apps.filter(app => {
      // Super Admin (base.group_system) has access to everything including SAAS_ADMIN and COMPANIES
      if (isSuperAdmin) {
        return true;
      }
      
      // All non-superadmin subscribers must NEVER see SaaS Admin or Companies Management
      if (app.id === 'SAAS_ADMIN' || app.id === 'COMPANIES') {
        return false;
      }

      if (currentUserRole === 'EMPLOYEE') {
        return ['ATTENDANCE', 'LEAVES', 'DOCUMENTS'].includes(app.id);
      }
      
      return true;
    });
    return { ...group, apps: filteredApps };
  }).filter(group => group.apps.length > 0);

  // Find default open group based on activeApp
  const defaultOpenGroupId = groups.find((g) => g.apps.some((a) => a.id === activeApp))?.id || 'PERSONNEL';
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    [defaultOpenGroupId]: true,
  });

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  return (
    <aside className="w-[260px] h-screen fixed right-0 top-0 bg-slate-900 text-slate-100 border-l border-slate-800 flex flex-col justify-between select-none shadow-2xl z-50 overflow-y-auto transition-transform duration-300" dir="rtl">
      <div className="p-3 space-y-3">
        {/* Top Branding / Logo */}
        <div className="flex items-center gap-2 px-2 py-2 border-b border-slate-800">
          <div className="w-7 h-7 bg-[#714B67] rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-inner shrink-0">
            A
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-white truncate">Aysed S HR 2026</div>
            <div className="text-[9px] text-purple-300 truncate">Odoo 17 & Kuwait Law</div>
          </div>
        </div>

        {/* Grouped Accordion Families */}
        <div className="space-y-1.5 pt-1">
          {groups.map((group) => {
            const GroupIcon = group.icon;
            const isOpen = !!openGroups[group.id];
            const hasActiveApp = group.apps.some((a) => a.id === activeApp);

            return (
              <div key={group.id} className="border border-slate-800/80 rounded-lg overflow-hidden bg-slate-950/30">
                {/* Accordion Family Header */}
                <button
                  onClick={() => toggleGroup(group.id)}
                  className={`w-full px-2.5 py-2 flex items-center justify-between text-xs font-bold transition ${
                    hasActiveApp ? 'text-purple-300 bg-purple-950/20' : 'text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <GroupIcon className={`w-4 h-4 shrink-0 ${hasActiveApp ? 'text-purple-400' : 'text-slate-400'}`} />
                    <span className="truncate flex-1 text-right">{group.title}</span>
                  </div>
                  {isOpen ? (
                    <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" />) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />)}
                </button>

                {/* Accordion Children Apps */}
                {isOpen && (
                  <div className="px-1.5 py-1 space-y-1 bg-slate-900/60 border-t border-slate-800/60">
                    {group.apps.map((app) => {
                      const AppIcon = app.icon;
                      const isAppActive = activeApp === app.id;
                      return (
                        <button
                          key={app.id}
                          onClick={() => {
                            const nav = onNavigateApp || onNavigate;
                            if (typeof nav === 'function') {
                              nav(app.id);
                            }
                            if (typeof onFilterTabChange === 'function') {
                              onFilterTabChange('ALL');
                            }
                          }}
                          className={`w-full text-right text-xs py-1.5 px-2 rounded-md transition flex items-center gap-2 ${
                            isAppActive
                              ? 'bg-[#714B67] text-white font-bold shadow-sm'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <AppIcon className={`w-3.5 h-3.5 shrink-0 ${isAppActive ? 'text-white' : 'text-purple-300'}`} />
                          <span className="truncate flex-1 text-right">{app.title}</span>
                        </button>);
                    })}
                  </div>)}
              </div>);
          })}
        </div>
      </div>

      {/* Footer Logout */}
      {onLogout && (
        <div className="p-3 border-t border-slate-800 bg-slate-950/80">
          <button
            onClick={onLogout}
            className="w-full text-rose-400 hover:bg-rose-950/60 p-2 rounded-lg transition flex items-center gap-2 font-bold text-xs"
          >
            <LogOut className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="truncate">تسجيل الخروج الآمن</span>
          </button>
        </div>)}
    </aside>);
};
