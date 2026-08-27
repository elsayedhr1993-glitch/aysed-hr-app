import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface SmartButtonStat {
  id: string;
  label: string;
  value: string | number;
  icon: LucideIcon;
  onClick?: () => void;
  badge?: string;
  colorTheme?: 'purple' | 'emerald' | 'blue' | 'amber' | 'rose' | 'indigo' | 'slate';
}

interface OdooSmartButtonsProps {
  stats: SmartButtonStat[];
}

export const OdooSmartButtons: React.FC<OdooSmartButtonsProps> = ({ stats }) => {
  const getColorClasses = (theme?: string) => {
    switch (theme) {
      case 'emerald':
        return 'border-emerald-200 hover:border-emerald-400 bg-emerald-50/40 text-emerald-900';
      case 'blue':
        return 'border-blue-200 hover:border-blue-400 bg-blue-50/40 text-blue-900';
      case 'amber':
        return 'border-amber-200 hover:border-amber-400 bg-amber-50/40 text-amber-900';
      case 'rose':
        return 'border-rose-200 hover:border-rose-400 bg-rose-50/40 text-rose-900';
      case 'indigo':
        return 'border-indigo-200 hover:border-indigo-400 bg-indigo-50/40 text-indigo-900';
      case 'purple':
      default:
        return 'border-purple-200 hover:border-purple-400 bg-purple-50/40 text-purple-900';
    }
  };

  const getIconColor = (theme?: string) => {
    switch (theme) {
      case 'emerald': return 'text-emerald-600';
      case 'blue': return 'text-blue-600';
      case 'amber': return 'text-amber-600';
      case 'rose': return 'text-rose-600';
      case 'indigo': return 'text-indigo-600';
      case 'purple':
      default: return 'text-[#714B67]';
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 py-2" dir="rtl">
      {stats.map((stat) => {
        const IconComponent = stat.icon;
        return (
          <button
            key={stat.id}
            type="button"
            onClick={stat.onClick}
            className={`group relative flex items-center gap-3 px-3.5 py-2 rounded-xl border transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-md bg-white hover:scale-[1.02] active:scale-95 ${getColorClasses(stat.colorTheme)}`}
          >
            {/* Side Icon */}
            <div className={`p-2 rounded-lg bg-white shadow-xs border border-slate-100 shrink-0 ${getIconColor(stat.colorTheme)}`}>
              <IconComponent className="w-4 h-4" />
            </div>

            {/* Value & Description Stacked Lines */}
            <div className="text-right flex flex-col min-w-[70px]">
              <span className="font-mono font-bold text-sm tracking-tight text-slate-900 leading-tight">
                {stat.value}
              </span>
              <span className="text-[11px] font-semibold text-slate-500 group-hover:text-slate-800 transition leading-tight mt-0.5">
                {stat.label}
              </span>
            </div>

            {stat.badge && (
              <span className="absolute -top-1.5 -left-1.5 px-1.5 py-0.5 bg-purple-700 text-white text-[9px] font-mono font-bold rounded-full shadow-xs">
                {stat.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
