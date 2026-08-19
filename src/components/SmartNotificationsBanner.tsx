import React, { useState } from 'react';
import { 
  Bell, AlertTriangle, ShieldAlert, Clock, UserX, Clock3, 
  ChevronDown, ChevronUp, ArrowLeft, CheckCircle2, FileText, Sparkles, X
} from 'lucide-react';
import { SystemNotification } from '../utils/notificationsEngine';
import { ActiveApp, Employee } from '../types';

interface SmartNotificationsBannerProps {
  notifications: SystemNotification[];
  onNavigateToApp: (app: ActiveApp, employeeId?: string) => void;
  employees: Employee[];
  onSelectEmployee?: (emp: Employee) => void;
}

export const SmartNotificationsBanner: React.FC<SmartNotificationsBannerProps> = ({
  notifications = [],
  onNavigateToApp,
  employees,
  onSelectEmployee,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(true);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'EXPIRATION' | 'PROBATION' | 'ATTENDANCE'>('ALL');
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  const activeNotifications = (notifications || []).filter(n => !dismissedIds.includes(n.id));

  const criticalCount = (activeNotifications || []).filter(n => n.severity === 'CRITICAL').length;
  const warningCount = (activeNotifications || []).filter(n => n.severity === 'WARNING').length;

  const filteredNotifications = (activeNotifications || []).filter(n => {
    if (selectedFilter === 'CRITICAL') return n.severity === 'CRITICAL';
    if (selectedFilter === 'WARNING') return n.severity === 'WARNING';
    if (selectedFilter === 'EXPIRATION') return n.category === 'EXPIRATION';
    if (selectedFilter === 'PROBATION') return n.category === 'PROBATION';
    if (selectedFilter === 'ATTENDANCE') return n.category === 'ATTENDANCE';
    return true;
  });

  if (activeNotifications.length === 0) {
    return (
      <div className="bg-emerald-50/80 border border-emerald-200 rounded-lg p-2.5 mx-2 sm:mx-4 mt-2 flex items-center justify-between text-[11px] text-emerald-900 shadow-2xs">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="font-bold truncate">جميع السجلات سارية ولا توجد تنبيهات حالياً</span>
        </div>
        <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-mono shrink-0">
          0 تنبيهات
        </span>
      </div>
    );
  }

  const handleActionClick = (notif: SystemNotification) => {
    if (notif.employeeId && onSelectEmployee) {
      const emp = employees.find(e => e.id === notif.employeeId);
      if (emp) {
        onSelectEmployee(emp);
      }
    }
    onNavigateToApp(notif.actionApp, notif.employeeId);
  };

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedIds(prev => [...prev, id]);
  };

  return (
    <div className="mx-2 sm:mx-4 mt-2 bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden transition-all duration-200">
      {/* Banner Header Bar */}
      <div 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`px-3 py-2 flex items-center justify-between cursor-pointer select-none transition ${
          criticalCount > 0 ? 'bg-gradient-to-r from-rose-50 via-rose-50/30 to-amber-50/20' : 'bg-gradient-to-r from-amber-50/60 to-slate-50'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className={`p-1.5 rounded-md shrink-0 ${criticalCount > 0 ? 'bg-rose-600 text-white animate-pulse' : 'bg-amber-500 text-slate-950'}`}>
            <Bell className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 truncate">
                <span className="truncate">تنبيهات النظام الذكية والمخاطر</span>
                <span className="text-[9px] bg-[#714B67] text-white px-1.5 py-0.2 rounded-full font-extrabold shrink-0">
                  Aysed S
                </span>
              </h4>
            </div>
            <p className="text-[10px] text-slate-500 truncate hidden md:block">
              فحص آلي لتواريخ الإقامات، التراخيص الصحية، فترات التجربة والغياب
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Severity Badge Indicators */}
          <div className="flex items-center gap-1 text-[11px] font-bold">
            {criticalCount > 0 && (
              <span className="bg-rose-100 text-rose-800 border border-rose-300 px-1.5 py-0.5 rounded-full flex items-center gap-1 text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping inline-block"></span>
                <span>{criticalCount} حرج</span>
              </span>
            )}
            {warningCount > 0 && (
              <span className="bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.5 rounded-full text-[10px]">
                {warningCount} تنبيه
              </span>
            )}
          </div>

          <button 
            type="button"
            className="p-1 hover:bg-slate-200/60 rounded text-slate-600 transition"
          >
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Content View */}
      {!isCollapsed && (
        <div className="p-3 bg-slate-50/50 border-t border-slate-100 space-y-3">
          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-semibold border-b border-slate-200/80">
            <button
              type="button"
              onClick={() => setSelectedFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap ${
                selectedFilter === 'ALL'
                  ? 'bg-[#714B67] text-white font-bold'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              الكل ({activeNotifications.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter('CRITICAL')}
              className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap flex items-center gap-1 ${
                selectedFilter === 'CRITICAL'
                  ? 'bg-rose-600 text-white font-bold'
                  : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
              }`}
            >
              <span>🚨 حرج جداً ({criticalCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter('WARNING')}
              className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap flex items-center gap-1 ${
                selectedFilter === 'WARNING'
                  ? 'bg-amber-600 text-white font-bold'
                  : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50'
              }`}
            >
              <span>⚠️ تنبيه متوسط ({warningCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter('EXPIRATION')}
              className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap ${
                selectedFilter === 'EXPIRATION'
                  ? 'bg-[#714B67] text-white font-bold'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              📅 التراخيص والإقامات
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter('PROBATION')}
              className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap ${
                selectedFilter === 'PROBATION'
                  ? 'bg-[#714B67] text-white font-bold'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              ⏳ فترات التجربة (100 يوم)
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter('ATTENDANCE')}
              className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap ${
                selectedFilter === 'ATTENDANCE'
                  ? 'bg-[#714B67] text-white font-bold'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              ⏱️ الغياب والتأخير
            </button>
          </div>

          {/* Notifications Grid / List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[260px] overflow-y-auto pr-1">
            {filteredNotifications.map((notif) => {
              const isCritical = notif.severity === 'CRITICAL';

              return (
                <div
                  key={notif.id}
                  className={`p-3 rounded-xl border transition-all duration-150 flex flex-col justify-between space-y-2 text-xs relative group ${
                    isCritical
                      ? 'bg-rose-50/90 border-rose-300 hover:border-rose-400 text-rose-950 shadow-xs'
                      : 'bg-amber-50/80 border-amber-300 hover:border-amber-400 text-amber-950 shadow-xs'
                  }`}
                >
                  <button
                    onClick={(e) => handleDismiss(notif.id, e)}
                    className="absolute top-2 left-2 text-slate-400 hover:text-slate-700 opacity-0 group-hover:opacity-100 transition p-1 rounded"
                    title="تجاهل التنبيه مؤقتاً"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>

                  <div className="space-y-1">
                    <div className="flex items-start gap-2">
                      <div className={`p-1.5 rounded-lg shrink-0 ${isCritical ? 'bg-rose-200 text-rose-800' : 'bg-amber-200 text-amber-900'}`}>
                        {notif.type === 'MOH_LICENSE' ? (
                          <ShieldAlert className="w-4 h-4" />
                        ) : notif.type === 'PROBATION' ? (
                          <Clock className="w-4 h-4" />
                        ) : notif.type === 'ABSENCE' ? (
                          <UserX className="w-4 h-4" />
                        ) : notif.type === 'TARDINESS' ? (
                          <Clock3 className="w-4 h-4" />
                        ) : (
                          <AlertTriangle className="w-4 h-4" />
                        )}
                      </div>

                      <div className="pl-4">
                        <h5 className="font-bold text-xs leading-snug">{notif.title}</h5>
                        <p className="text-[11px] opacity-90 leading-normal mt-0.5">{notif.description}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-black/5 text-[10px]">
                    <span className={`font-bold px-2 py-0.5 rounded ${
                      isCritical ? 'bg-rose-200/80 text-rose-900' : 'bg-amber-200/80 text-amber-900'
                    }`}>
                      {isCritical ? '🔴 إجراء حرج متطلب' : '🟠 تنبيه متابعة'}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleActionClick(notif)}
                      className={`font-bold py-1 px-2.5 rounded text-[11px] transition flex items-center gap-1 shadow-2xs ${
                        isCritical
                          ? 'bg-rose-700 hover:bg-rose-800 text-white'
                          : 'bg-amber-700 hover:bg-amber-800 text-white'
                      }`}
                    >
                      <span>الانتقال والتحديث</span>
                      <ArrowLeft className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
