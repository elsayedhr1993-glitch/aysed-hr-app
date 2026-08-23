import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, Filter, Layers, BarChart2, X, ChevronDown, Check, Sparkles, SlidersHorizontal, Bookmark
} from 'lucide-react';

export interface FilterOption {
  id: string;
  label: string;
  category?: string;
  icon?: any;
}

export interface GroupByOption {
  id: string;
  label: string;
  field: string;
}

export interface MeasureOption {
  id: string;
  label: string;
  field: string;
  unit?: string;
  isCurrency?: boolean;
}

interface OdooSearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  
  availableFilters: FilterOption[];
  activeFilters: string[];
  onToggleFilter: (filterId: string) => void;
  
  availableGroupBy: GroupByOption[];
  activeGroupBy: string;
  onSelectGroupBy: (groupById: string) => void;
  
  availableMeasures: MeasureOption[];
  activeMeasures: string[];
  onToggleMeasure: (measureId: string) => void;
  
  onClearAll: () => void;
  totalRecordsCount: number;
}

export const OdooSearchBar: React.FC<OdooSearchBarProps> = ({
  searchTerm,
  onSearchChange,
  availableFilters,
  activeFilters,
  onToggleFilter,
  availableGroupBy,
  activeGroupBy,
  onSelectGroupBy,
  availableMeasures,
  activeMeasures,
  onToggleMeasure,
  onClearAll,
  totalRecordsCount,
}) => {
  const [openDropdown, setOpenDropdown] = useState<'filters' | 'groupby' | 'measures' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeGroupLabel = availableGroupBy.find(g => g.id === activeGroupBy)?.label || 'بدون تجميع';

  return (
    <div ref={containerRef} className="bg-white border border-slate-200 rounded-xl shadow-2xs p-2.5 mb-4 text-slate-800" dir="rtl">
      <div className="flex flex-wrap items-center gap-2">
        {/* Search Input Box with Active Chips */}
        <div className="flex-1 min-w-[280px] flex items-center flex-wrap gap-1.5 bg-slate-50 hover:bg-slate-100/80 focus-within:bg-white border border-slate-300 focus-within:border-[#714B67] focus-within:ring-2 focus-within:ring-[#714B67]/20 rounded-lg px-3 py-1.5 transition">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />

          {/* Active Filter Chips */}
          {activeFilters.map(filterId => {
            const filterObj = availableFilters.find(f => f.id === filterId);
            if (!filterObj) return null;
            return (
              <span 
                key={filterId}
                className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 text-xs font-semibold px-2 py-0.5 rounded-md border border-purple-200 animate-in fade-in"
              >
                <span>{filterObj.label}</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); onToggleFilter(filterId); }}
                  className="hover:text-purple-950 p-0.5 rounded cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>);
          })}

          {/* Active Group By Chip */}
          {activeGroupBy && activeGroupBy !== 'none' && (
            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 text-xs font-semibold px-2 py-0.5 rounded-md border border-amber-200 animate-in fade-in">
              <span className="text-[10px] text-amber-700">تجميع:</span>
              <span>{activeGroupLabel}</span>
              <button 
                onClick={(e) => { e.stopPropagation(); onSelectGroupBy('none'); }}
                className="hover:text-amber-950 p-0.5 rounded cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>)}

          {/* Active Measures Chips (if multiple or custom) */}
          {activeMeasures.length > 0 && (
            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-900 text-xs font-semibold px-2 py-0.5 rounded-md border border-emerald-200">
              <span className="text-[10px] text-emerald-700">المقاييس ({activeMeasures.length})</span>
            </span>)}

          <input
            type="text"
            placeholder={activeFilters.length > 0 ? "بحث إضافي..." : "بحث في السجلات والتقارير..."}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-xs text-slate-800 placeholder-slate-400"
          />

          {searchTerm && (
            <button 
              onClick={() => onSearchChange('')}
              className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>)}
        </div>

        {/* 3 Odoo Enterprise Control Dropdowns */}
        <div className="flex items-center gap-1.5 shrink-0">
          
          {/* 1. Filters Dropdown */}
          <div className="relative">
            <button
              onClick={() => setOpenDropdown(prev => prev === 'filters' ? null : 'filters')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                activeFilters.length > 0 
                  ? 'bg-purple-50 text-purple-800 border-purple-300 ring-2 ring-purple-500/20' 
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Filter className={`w-3.5 h-3.5 ${activeFilters.length > 0 ? 'text-purple-600' : 'text-slate-500'}`} />
              <span>الفلاتر</span>
              {activeFilters.length > 0 && (
                <span className="bg-purple-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                  {activeFilters.length}
                </span>)}
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>

            {openDropdown === 'filters' && (
              <div className="absolute right-0 top-full mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 font-sans">
                <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  الفلاتر القياسية (Standard Filters)
                </div>
                <div className="p-1 max-h-60 overflow-y-auto space-y-0.5">
                  {availableFilters.map((filter) => {
                    const isSelected = activeFilters.includes(filter.id);
                    return (
                      <button
                        key={filter.id}
                        onClick={() => onToggleFilter(filter.id)}
                        className={`w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-lg text-right transition cursor-pointer ${
                          isSelected ? 'bg-purple-50 text-purple-900 font-bold' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{filter.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-purple-600 shrink-0" />}
                      </button>);
                  })}
                </div>
              </div>)}
          </div>

          {/* 2. Group By Dropdown */}
          <div className="relative">
            <button
              onClick={() => setOpenDropdown(prev => prev === 'groupby' ? null : 'groupby')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                activeGroupBy && activeGroupBy !== 'none'
                  ? 'bg-amber-50 text-amber-900 border-amber-300 ring-2 ring-amber-500/20'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Layers className={`w-3.5 h-3.5 ${activeGroupBy && activeGroupBy !== 'none' ? 'text-amber-600' : 'text-slate-500'}`} />
              <span>تجميع حسب</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>

            {openDropdown === 'groupby' && (
              <div className="absolute right-0 top-full mt-1.5 w-60 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 font-sans">
                <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  أبعاد التجميع (Group Dimensions)
                </div>
                <div className="p-1 space-y-0.5">
                  <button
                    onClick={() => { onSelectGroupBy('none'); setOpenDropdown(null); }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-lg text-right transition cursor-pointer ${
                      activeGroupBy === 'none' || !activeGroupBy ? 'bg-amber-50 text-amber-900 font-bold' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>بدون تجميع (سجلات مفردة)</span>
                    {(activeGroupBy === 'none' || !activeGroupBy) && <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                  </button>

                  {availableGroupBy.map((group) => {
                    const isSelected = activeGroupBy === group.id;
                    return (
                      <button
                        key={group.id}
                        onClick={() => { onSelectGroupBy(group.id); setOpenDropdown(null); }}
                        className={`w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-lg text-right transition cursor-pointer ${
                          isSelected ? 'bg-amber-50 text-amber-900 font-bold' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{group.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                      </button>);
                  })}
                </div>
              </div>)}
          </div>

          {/* 3. Measures Dropdown */}
          <div className="relative">
            <button
              onClick={() => setOpenDropdown(prev => prev === 'measures' ? null : 'measures')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-bold transition cursor-pointer"
            >
              <BarChart2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>المقاييس (Measures)</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>

            {openDropdown === 'measures' && (
              <div className="absolute left-0 top-full mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 font-sans">
                <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  القيم الحسابية والمجاميع
                </div>
                <div className="p-1 max-h-64 overflow-y-auto space-y-0.5">
                  {availableMeasures.map((measure) => {
                    const isSelected = activeMeasures.includes(measure.id);
                    return (
                      <button
                        key={measure.id}
                        onClick={() => onToggleMeasure(measure.id)}
                        className={`w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-lg text-right transition cursor-pointer ${
                          isSelected ? 'bg-emerald-50 text-emerald-900 font-bold' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{measure.label}</span>
                          {measure.unit && (
                            <span className="text-[10px] text-slate-400">({measure.unit})</span>)}
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                      </button>);
                  })}
                </div>
              </div>)}
          </div>

          {/* Clear Filters button */}
          {(activeFilters.length > 0 || (activeGroupBy && activeGroupBy !== 'none') || searchTerm) && (
            <button
              onClick={onClearAll}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
              title="مسح جميع الفلاتر والتجميع"
            >
              <X className="w-4 h-4" />
            </button>)}
        </div>
      </div>

      {/* Stats Footnote */}
      <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 px-1">
        <div className="flex items-center gap-2">
          <span>إجمالي السجلات المطابقة:</span>
          <span className="font-bold text-slate-800 font-mono">{totalRecordsCount}</span>
        </div>
        <div className="text-[10px] text-purple-700 flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          <span>محرك تحليلات Odoo Pivot & Graph Engine v18</span>
        </div>
      </div>
    </div>);
};
