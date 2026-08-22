// src/components/layout/HolidayWorkSidebarMenu.tsx
import React, { useState } from 'react';
import { 
  CalendarDays, 
  Clock, 
  Settings, 
  ChevronDown, 
  ChevronLeft, 
  Coins, 
  CalendarPlus 
} from 'lucide-react';

interface SidebarMenuProps {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
}

export const HolidayWorkSidebarMenu: React.FC<SidebarMenuProps> = ({ activeTab, onSelectTab }) => {
  const [isOpenAdvanced, setIsOpenAdvanced] = useState(true);

  return (
    <div className="w-full font-sans text-right" dir="rtl">
      
      {/* 1. قائمة الدوام والعمليات -> بدلات العطلات والجمع */}
      <div className="mb-2">
        <button
          onClick={() => onSelectTab('holiday-work')}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer ${
            activeTab === 'holiday-work'
              ? 'bg-[#71639e] text-white font-bold'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-teal-400" />
            <span>العمل في العطلات والجمع (1.5x)</span>
          </div>
          <Coins className="w-3.5 h-3.5 opacity-70" />
        </button>
      </div>

      {/* 2. القائمة المنسدلة: الإعدادات المتقدمة */}
      <div className="mt-4 border-t border-slate-700/50 pt-3">
        <button
          onClick={() => setIsOpenAdvanced(!isOpenAdvanced)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Settings className="w-3.5 h-3.5 text-[#71639e]" />
            <span>الإعدادات المتقدمة (Aysed Config)</span>
          </div>
          {isOpenAdvanced ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>

        {/* العناصر الفرعية */}
        {isOpenAdvanced && (
          <div className="mt-1 space-y-1 pr-4">
            <button
              onClick={() => onSelectTab('leave-types-config')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs transition-colors cursor-pointer ${
                activeTab === 'leave-types-config'
                  ? 'bg-teal-700/30 text-teal-300 font-semibold border-r-2 border-teal-400'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              <span>تهيئة أنواع الإجازات</span>
            </button>
          </div>
        )}
      </div>

    </div>
  );
};
