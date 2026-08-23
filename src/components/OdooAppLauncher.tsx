import React, { useState } from 'react';
import { 
  Users, UserPlus, FileSignature, Calendar, Clock, 
  Banknote, Scale, FolderKanban, Zap, Building2, Sparkles, Scan,
  Briefcase, FileText, ShieldCheck, Bell, AlertTriangle, TrendingUp, Activity, PieChart as PieIcon, ArrowUpRight, BarChart3, MessageSquare
} from 'lucide-react';
import { ActiveApp, Company } from '../types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';

interface OdooAppLauncherProps {
  onSelectApp: (app: ActiveApp) => void;
  currentUserEmail?: string;
  currentUserRole?: string;
  activeCompany?: Company;
  stats: {
    employeesCount: number;
    candidatesCount: number;
    contractsCount: number;
    leavesPendingCount: number;
    documentsCount: number;
    automationsCount: number;
    custodiesCount?: number;
    templatesCount?: number;
    auditLogsCount?: number;
    shiftsCount?: number;
    totalSalariesThisMonth?: number;
    onLeaveToday?: number;
    absenceRate?: number;
    lateArrivalsCount?: number;
    saturdayAbsencesCount?: number;
    leaveCostKwd?: number;
  };
}

export const OdooAppLauncher: React.FC<OdooAppLauncherProps> = ({ onSelectApp, currentUserEmail = '', currentUserRole = '', activeCompany, stats }) => {
  const isSuperAdmin = currentUserRole === 'SUPER_ADMIN' || currentUserEmail.toLowerCase() === 'admin@aysed.com'.toLowerCase() || currentUserEmail.toLowerCase() === 'elsayedhr1993@gmail.com'.toLowerCase();
  const companyDisplayName = activeCompany?.nameAr || activeCompany?.nameEn || 'Aysed HR S 2026';

  const attendanceData = [
    { day: 'السبت', حضور: 94, غياب: 6 },
    { day: 'الأحد', حضور: 98, غياب: 2 },
    { day: 'الإثنين', حضور: 96, غياب: 4 },
    { day: 'الثلاثاء', حضور: 99, غياب: 1 },
    { day: 'الأربعاء', حضور: 95, غياب: 5 },
    { day: 'الخميس', حضور: 92, غياب: 8 },
  ];

  const payrollDeptData = [
    { name: 'الإدارة العليا', value: 8500, color: '#714B67' },
    { name: 'التطوير التقني', value: 14200, color: '#10B981' },
    { name: 'العمليات والتشغيل', value: 9800, color: '#3B82F6' },
    { name: 'المبيعات والتسويق', value: 6400, color: '#F59E0B' },
  ];

  const leavesStatusData = [
    { name: 'إجازة سنوية', count: 12 },
    { name: 'إجازة مرضية', count: 4 },
    { name: 'إجازة طارئة', count: 2 },
    { name: 'بدون راتب', count: 1 },
  ];

  const apps = [
    {
      id: 'EMPLOYEES' as ActiveApp,
      titleAr: 'الموظفين',
      titleEn: 'Employees',
      icon: Users,
      bgColor: 'bg-emerald-50 text-emerald-600 border-emerald-200',
      iconBg: 'bg-emerald-600 text-white',
      badge: `${stats.employeesCount}`,
      description: 'سجلات الموظفين والهياكل',
    },
    {
      id: 'RECRUITMENT' as ActiveApp,
      titleAr: 'التوظيف',
      titleEn: 'Recruitment',
      icon: UserPlus,
      bgColor: 'bg-indigo-50 text-indigo-600 border-indigo-200',
      iconBg: 'bg-indigo-600 text-white',
      badge: `${stats.candidatesCount}`,
      description: 'المقابلات والسير الذاتية',
    },
    {
      id: 'CONTRACTS' as ActiveApp,
      titleAr: 'عقود العمل',
      titleEn: 'Contracts',
      icon: FileSignature,
      bgColor: 'bg-teal-50 text-teal-600 border-teal-200',
      iconBg: 'bg-teal-600 text-white',
      badge: `${stats.contractsCount}`,
      description: 'العقود والبدلات',
    },
    {
      id: 'LEAVES' as ActiveApp,
      titleAr: 'الإجازات',
      titleEn: 'Time Off',
      icon: Calendar,
      bgColor: 'bg-amber-50 text-amber-600 border-amber-200',
      iconBg: 'bg-amber-600 text-white',
      badge: `${stats.leavesPendingCount}`,
      description: 'استحقاق 2.5 يوم شهرياً',
    },
    {
      id: 'HOLIDAYS' as ActiveApp,
      titleAr: 'العطلات',
      titleEn: 'Holidays',
      icon: Calendar,
      bgColor: 'bg-rose-50 text-rose-600 border-rose-200',
      iconBg: 'bg-rose-600 text-white',
      badge: '13',
      description: 'العطلات الرسمية',
    },
    {
      id: 'SHIFTS' as ActiveApp,
      titleAr: 'جدولة الشفتات',
      titleEn: 'Shifts',
      icon: Calendar,
      bgColor: 'bg-cyan-50 text-cyan-600 border-cyan-200',
      iconBg: 'bg-cyan-600 text-white',
      badge: `${stats.shiftsCount || 0}`,
      description: 'إدارة الورديات',
    },
    {
      id: 'ATTENDANCE' as ActiveApp,
      titleAr: 'الحضور والدوام',
      titleEn: 'Attendance',
      icon: Clock,
      bgColor: 'bg-blue-50 text-blue-600 border-blue-200',
      iconBg: 'bg-blue-600 text-white',
      badge: 'بصمة',
      description: 'التأخير والساعات الإضافية',
    },
    {
      id: 'PAYROLL' as ActiveApp,
      titleAr: 'الرواتب والتأمينات',
      titleEn: 'Payroll',
      icon: Banknote,
      bgColor: 'bg-purple-50 text-purple-600 border-purple-200',
      iconBg: 'bg-[#714B67] text-white',
      badge: 'WPS',
      description: 'كشوف الأجور 11.5%',
    },
    {
      id: 'REPORTS' as ActiveApp,
      titleAr: 'التقارير والتحليلات',
      titleEn: 'Reports & Pivot',
      icon: BarChart3,
      bgColor: 'bg-violet-50 text-violet-700 border-violet-200',
      iconBg: 'bg-violet-600 text-white',
      badge: 'Pivot & Graph',
      description: 'الجدول المحوري والرسوم البيانية',
    },
    {
      id: 'EOS' as ActiveApp,
      titleAr: 'نهاية الخدمة',
      titleEn: 'EOS',
      icon: Scale,
      bgColor: 'bg-red-50 text-red-600 border-red-200',
      iconBg: 'bg-red-600 text-white',
      badge: 'م51',
      description: 'الحاسبة القانونية',
    },
    {
      id: 'DOCUMENTS' as ActiveApp,
      titleAr: 'المستندات وOCR',
      titleEn: 'Documents',
      icon: FolderKanban,
      bgColor: 'bg-sky-50 text-sky-600 border-sky-200',
      iconBg: 'bg-sky-600 text-white',
      badge: `${stats.documentsCount}`,
      description: 'الأرشيف والهويات',
    },
    {
      id: 'DOCUMENT_TEMPLATES' as ActiveApp,
      titleAr: 'قوالب المستندات',
      titleEn: 'Templates',
      icon: FileText,
      bgColor: 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200',
      iconBg: 'bg-fuchsia-600 text-white',
      badge: `${stats.templatesCount || 3}`,
      description: 'شهادات الخبرة والإنذارات',
    },
    {
      id: 'CUSTODY_LOANS' as ActiveApp,
      titleAr: 'العهد والسلف',
      titleEn: 'Custody',
      icon: Briefcase,
      bgColor: 'bg-stone-100 text-stone-700 border-stone-200',
      iconBg: 'bg-stone-700 text-white',
      badge: `${stats.custodiesCount || 0}`,
      description: 'العهد والسلف والأقساط',
    },
    {
      id: 'COMMENCEMENT' as ActiveApp,
      titleAr: 'مباشرة العمل',
      titleEn: 'Commencement',
      icon: FileSignature,
      bgColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      iconBg: 'bg-emerald-700 text-white',
      badge: 'رسمي',
      description: 'اعتماد المباشرة وسيرفس',
    },
    {
      id: 'DAILY_MOVEMENTS' as ActiveApp,
      titleAr: 'الحركات اليومية',
      titleEn: 'Daily Movements',
      icon: Clock,
      bgColor: 'bg-purple-50 text-purple-700 border-purple-200',
      iconBg: 'bg-purple-700 text-white',
      badge: 'hr.daily',
      description: 'استئذان ساعات، مرضيات، وبدلات',
    },
    ...(isSuperAdmin ? [{
      id: 'COMPANIES' as ActiveApp,
      titleAr: 'إدارة الشركات والمؤسسات',
      titleEn: 'Companies',
      icon: Building2,
      bgColor: 'bg-purple-50 text-purple-700 border-purple-200',
      iconBg: 'bg-[#714B67] text-white',
      badge: 'Multi-Tenant',
      description: 'الشركات، الترويسات، الأختام، والفروع',
    }, {
      id: 'SAAS_ADMIN' as ActiveApp,
      titleAr: 'إدارة الاشتراكات',
      titleEn: 'SaaS Admin',
      icon: Building2,
      bgColor: 'bg-amber-50 text-amber-700 border-amber-200',
      iconBg: 'bg-amber-600 text-white',
      badge: 'مالك',
      description: 'تفعيل وإيقاف الشركات والخطط',
    }] : []),
    {
      id: 'EXCLUSIVE_INNOVATIONS' as ActiveApp,
      titleAr: 'حزمة الابتكارات الحصرية',
      titleEn: 'Innovations Suite',
      icon: Sparkles,
      bgColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      iconBg: 'bg-indigo-600 text-white',
      badge: '5 وحدات ذكية',
      description: 'درع المخاطر، المندوب، QR، الواتساب',
    },
    {
      id: 'NOTIFICATIONS' as ActiveApp,
      titleAr: 'محرك الإشعارات والواتساب',
      titleEn: 'Notifications & SMS',
      icon: MessageSquare,
      bgColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      iconBg: 'bg-emerald-600 text-white',
      badge: 'واتساب +965',
      description: 'رسائل الإقامات، الإجازات، والرواتب',
    },
    {
      id: 'AUTOMATION' as ActiveApp,
      titleAr: 'الأتمتة والـ Studio',
      titleEn: 'Studio',
      icon: Zap,
      bgColor: 'bg-orange-50 text-orange-600 border-orange-200',
      iconBg: 'bg-orange-600 text-white',
      badge: `${stats.automationsCount}`,
      description: 'القواعد والتنبيهات',
    },
    {
      id: 'AUDIT_LOGS' as ActiveApp,
      titleAr: 'سجل الرقابة',
      titleEn: 'Audit Logs',
      icon: ShieldCheck,
      bgColor: 'bg-slate-100 text-slate-700 border-slate-300',
      iconBg: 'bg-slate-700 text-white',
      badge: `${stats.auditLogsCount || 0}`,
      description: 'تتبع العمليات',
    },
    {
      id: 'SETTINGS' as ActiveApp,
      titleAr: isSuperAdmin ? 'الإعدادات العامة والربط الخارجي' : 'بيانات المنشأة والإعدادات',
      titleEn: isSuperAdmin ? 'Settings & Integrations' : 'Company Profile & Settings',
      icon: Building2,
      bgColor: 'bg-zinc-100 text-zinc-700 border-zinc-300',
      iconBg: 'bg-zinc-700 text-white',
      badge: isSuperAdmin ? 'Geofence & API' : 'ملف المنشأة',
      description: isSuperAdmin ? 'المنظومة، الشركات، الواتساب، والتوثيق' : 'بيانات المنشأة، السجل التجاري، والواتساب',
    },
  ];

  return (
    <div className="dashboard-container bg-[#f8fafc] flex flex-col items-center relative z-10 space-y-3" dir="rtl">
      
      {/* 🔴 Dafthra-Style Top Ticker Bar */}
      <div className="w-full max-w-7xl bg-white border border-slate-200 text-slate-800 px-4 py-2 rounded-lg shadow-2xs flex items-center justify-between gap-3 overflow-hidden">
        <div className="flex items-center gap-2 shrink-0">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200">
            Sayed ERP متصل
          </span>
        </div>
        <div className="overflow-hidden whitespace-nowrap text-[11px] font-medium text-slate-600 flex-1">
          <div className="inline-block animate-marquee">
            ⚠️ تنبيه: 3 إقامات موظفين تنتهي قريباً • 📄 مستندات بانتظار قراءة OCR • ⚖️ إنذار إداري جديد • 🇰🇼 نظام حماية الأجور (WPS) جاهز للتحويل.
          </div>
        </div>
        <div className="text-[10px] font-mono font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded">
          KWD 0.000
        </div>
      </div>

      {/* 🧩 Odoo Enterprise App Switcher Grid */}
      <div className="w-full max-w-[1200px] space-y-3">
        <div className="flex items-center justify-between px-2 pt-2">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#71639e]" />
              <span>مشغل تطبيقات المنظومة (Odoo Enterprise Apps)</span>
            </h2>
            <p className="text-xs text-slate-500">اختر التطبيق للانتقال المباشر وإدارة العمليات بكفاءة تامة</p>
          </div>
          <div className="text-xs font-mono font-bold bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 shadow-2xs flex items-center gap-1.5 max-w-[340px] shrink-0" title={companyDisplayName}>
            <Building2 className="w-3.5 h-3.5 text-[#71639e] shrink-0" />
            <span className="truncate">المنشأة: <strong>{companyDisplayName}</strong></span>
          </div>
        </div>

        {/* Odoo Enterprise 4-Column App Switcher */}
        <div className="o_app_switcher w-full">
          {apps.filter(app => {
            if (!isSuperAdmin) {
              if (['SAAS_ADMIN', 'COMPANIES'].includes(app.id)) {
                return false;
              }
            }
            if (currentUserRole === 'EMPLOYEE') {
              return ['ATTENDANCE', 'LEAVES', 'DOCUMENTS'].includes(app.id);
            }
            return true;
          }).map((app) => {
            const IconComponent = app.icon;
            return (
              <button
                key={app.id}
                onClick={() => onSelectApp(app.id)}
                className="o_app_icon_card flex flex-col items-center justify-between text-center relative overflow-hidden group cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#71639e]/40 shadow-xs"
              >
                <div className="w-full flex justify-between items-center mb-2">
                  <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-600 uppercase font-mono tracking-wider">
                    {app.titleEn}
                  </span>
                  <span className="text-[9px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full group-hover:bg-[#71639e] group-hover:text-white transition-colors duration-200">
                    {app.badge}
                  </span>
                </div>

                {/* Flat Vibrant Icon Container */}
                <div className={`w-12 h-12 ${app.iconBg} rounded-xl flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform duration-200 my-2`}>
                  <IconComponent className="w-6 h-6" />
                </div>

                <div className="my-1 w-full">
                  <h3 className="font-bold text-slate-800 text-sm group-hover:text-[#71639e] transition-colors duration-200 truncate">
                    {app.titleAr}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-1 leading-normal font-normal">
                    {app.description}
                  </p>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-100 w-full flex items-center justify-center text-[10px] text-slate-400 group-hover:text-[#71639e] font-bold transition-colors">
                  <span>فتح التطبيق</span>
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                </div>
              </button>);
          })}
        </div>
      </div>

      {/* 📊 Dafthra-Style Compact Charts Section */}
      <div className="w-full max-w-7xl space-y-2 pt-2 border-t border-slate-200">
        <div className="flex items-center justify-between px-1">
          <div>
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
              <span>مؤشرات الأداء المالية والإدارية (Dafthra Analytics)</span>
            </h3>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">بيانات حية • KWD</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          
          {/* Chart 1 */}
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex flex-col justify-between max-h-[210px]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-800">معدل الحضور الأسبوعي</span>
              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                +2.4%
              </span>
            </div>
            <div className="h-28 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendanceData}>
                  <XAxis dataKey="day" stroke="#64748b" fontSize={9} />
                  <YAxis stroke="#64748b" fontSize={9} domain={[80, 100]} />
                  <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#0f172a', fontSize: '10px' }} />
                  <Bar dataKey="حضور" fill="#10B981" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2 */}
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex flex-col justify-between max-h-[210px]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-800">توزيع الرواتب (د.ك)</span>
              <span className="text-[9px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                {stats.employeesCount} موظف
              </span>
            </div>
            <div className="h-28 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={payrollDeptData}
                    cx="50%"
                    cy="50%"
                    innerRadius={25}
                    outerRadius={45}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {payrollDeptData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#0f172a', fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3 */}
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex flex-col justify-between max-h-[210px]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-800">طلبات الإجازات النشطة</span>
              <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {stats.leavesPendingCount} بانتظار الاعتماد
              </span>
            </div>
            <div className="h-28 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={leavesStatusData} layout="vertical">
                  <XAxis type="number" stroke="#64748b" fontSize={9} />
                  <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={9} width={65} />
                  <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#0f172a', fontSize: '10px' }} />
                  <Bar dataKey="count" fill="#3B82F6" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </div>

      {/* Footer Info */}
      <div className="text-slate-500 text-[10px] text-center flex items-center justify-center gap-3 border-t border-slate-200 pt-2 max-w-7xl w-full font-medium">
        <span>عملة النظام: <strong className="font-mono text-slate-800">KWD (0.000)</strong></span>
        <span>•</span>
        <span>قانون العمل الكويتي: <strong className="text-slate-800">رقم 6 لسنة 2010</strong></span>
        <span>•</span>
        <span>بيئة العمل: <strong className="text-emerald-700">Dafthra ERP Active</strong></span>
      </div>

    </div>);
};

