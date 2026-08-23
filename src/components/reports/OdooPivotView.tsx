import React, { useState } from 'react';
import { 
  Plus, Minus, ChevronRight, ChevronDown, Table as TableIcon, 
  Maximize2, Minimize2, ArrowUpDown, Filter, Sparkles 
} from 'lucide-react';
import { MeasureOption } from './OdooSearchBar';

export interface PivotRowData {
  id: string;
  label: string;
  subLabel?: string;
  isTotal?: boolean;
  children?: PivotRowData[];
  values: Record<string, number>; // key: measureId, value: number
  recordsCount: number;
  count?: number;
}

interface OdooPivotViewProps {
  data: PivotRowData[];
  grandTotal: Record<string, number>;
  totalRecords: number;
  groupByLabel: string;
  activeMeasures: MeasureOption[];
  reportTitle: string;
}

export const OdooPivotView: React.FC<OdooPivotViewProps> = ({
  data,
  grandTotal,
  totalRecords,
  groupByLabel,
  activeMeasures,
  reportTitle,
}) => {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [isAllExpanded, setIsAllExpanded] = useState(false);

  const toggleRow = (rowId: string) => {
    setExpandedRows(prev => ({
      ...prev,
      [rowId]: !prev[rowId]
    }));
  };

  const toggleExpandAll = () => {
    if (isAllExpanded) {
      setExpandedRows({});
      setIsAllExpanded(false);
    } else {
      const all: Record<string, boolean> = {};
      data.forEach(r => {
        all[r.id] = true;
        if (r.children) {
          r.children.forEach(c => { all[c.id] = true; });
        }
      });
      setExpandedRows(all);
      setIsAllExpanded(true);
    }
  };

  // Find max value per measure for subtle heatmap intensity
  const maxValues: Record<string, number> = {};
  activeMeasures.forEach(m => {
    let max = 0;
    data.forEach(r => {
      if ((r.values[m.id] || 0) > max) max = r.values[m.id] || 0;
      if (r.children) {
        r.children.forEach(c => {
          if ((c.values[m.id] || 0) > max) max = c.values[m.id] || 0;
        });
      }
    });
    maxValues[m.id] = max > 0 ? max : 1;
  });

  const formatValue = (val: number | undefined, measure: MeasureOption) => {
    if (val === undefined || val === null) return '-';
    if (measure.isCurrency) {
      return `${val.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} د.ك`;
    }
    if (measure.unit === 'ساعة' || measure.unit === 'يوم') {
      return `${val.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${measure.unit}`;
    }
    return val.toLocaleString('en-US');
  };

  const getHeatmapBg = (val: number | undefined, measureId: string) => {
    if (!val || val <= 0) return '';
    const max = maxValues[measureId] || 1;
    const ratio = Math.min(val / max, 1);
    if (ratio > 0.75) return 'bg-purple-100/70 text-purple-950 font-bold';
    if (ratio > 0.45) return 'bg-purple-50/60 text-purple-900';
    if (ratio > 0.15) return 'bg-slate-50/70 text-slate-800';
    return '';
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col font-sans" dir="rtl">
      {/* Pivot Toolbar */}
      <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#714B67] text-white rounded-lg shadow-2xs">
            <TableIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800">{reportTitle} - الجدول المحوري (Pivot Matrix)</h3>
            <p className="text-[10px] text-slate-500">
              تجميع ديناميكي حسب: <span className="font-bold text-purple-700">{groupByLabel}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleExpandAll}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-medium transition cursor-pointer shadow-2xs"
          >
            {isAllExpanded ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-slate-500" />
                <span>طي كافة المجموعات</span>
              </>) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-purple-600" />
                <span>توسيع كافة المجموعات</span>
              </>)}
          </button>
        </div>
      </div>

      {/* Cross-tab Pivot Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs border-collapse">
          <thead>
            {/* Top Table Header */}
            <tr className="bg-slate-100/90 text-slate-700 border-b border-slate-300 font-bold">
              <th className="py-2.5 px-4 text-right min-w-[220px] sticky right-0 bg-slate-100 z-10 border-l border-slate-200">
                {groupByLabel} / الأبعاد
              </th>
              <th className="py-2.5 px-3 text-center w-20 border-l border-slate-200 text-slate-600">
                السجلات
              </th>
              {activeMeasures.map((measure) => (
                <th key={measure.id} className="py-2.5 px-4 text-left min-w-[140px] border-l border-slate-200">
                  <div className="flex flex-col items-end">
                    <span>{measure.label}</span>
                    {measure.unit && (
                      <span className="text-[10px] font-normal text-slate-500 font-mono">({measure.unit})</span>)}
                  </div>
                </th>))}
            </tr>
          </thead>
          
          <tbody className="divide-y divide-slate-100">
            {data.length === 0 ? (
              <tr>
                <td colSpan={2 + activeMeasures.length} className="py-12 text-center text-slate-400">
                  <TableIcon className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
                  <p className="text-xs font-bold">لا توجد بيانات مطابقة لمعايير الفلترة الحالية</p>
                  <p className="text-[11px] text-slate-400 mt-1">يرجى تعديل الفلاتر أو تحديد أبعاد أخرى</p>
                </td>
              </tr>) : (
              <>
                {data.map((row) => {
                  const hasChildren = Boolean(row.children && row.children.length > 0);
                  const isExpanded = Boolean(expandedRows[row.id]);

                  return (
                    <React.Fragment key={row.id}>
                      {/* Main Group Row */}
                      <tr className="hover:bg-purple-50/30 transition-colors group">
                        <td className="py-2.5 px-4 sticky right-0 bg-white group-hover:bg-purple-50/30 z-10 border-l border-slate-100 font-bold text-slate-800">
                          <div className="flex items-center gap-2">
                            {hasChildren ? (
                              <button
                                onClick={() => toggleRow(row.id)}
                                className="w-5 h-5 rounded flex items-center justify-center bg-slate-100 hover:bg-purple-200 text-purple-700 transition cursor-pointer"
                              >
                                {isExpanded ? <Minus className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                              </button>) : (
                              <span className="w-5 h-5 flex items-center justify-center text-slate-300">•</span>)}
                            <div>
                              <span>{row.label}</span>
                              {row.subLabel && (
                                <span className="text-[10px] text-slate-400 font-normal mr-1.5">({row.subLabel})</span>)}
                            </div>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 text-center border-l border-slate-100 text-slate-500 font-mono font-medium">
                          {row.recordsCount}
                        </td>

                        {activeMeasures.map((measure) => (
                          <td 
                            key={measure.id} 
                            className={`py-2.5 px-4 text-left border-l border-slate-100 font-mono ${getHeatmapBg(row.values[measure.id], measure.id)}`}
                          >
                            {formatValue(row.values[measure.id], measure)}
                          </td>))}
                      </tr>

                      {/* Nested Children Rows when expanded */}
                      {isExpanded && row.children?.map((child) => (
                        <tr key={child.id} className="bg-slate-50/50 hover:bg-purple-50/50 transition-colors text-[11px]">
                          <td className="py-1.5 px-4 pr-10 sticky right-0 bg-slate-50/80 z-10 border-l border-slate-100 text-slate-600">
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                              <span>{child.label}</span>
                              {child.subLabel && (
                                <span className="text-[10px] text-slate-400 font-mono">({child.subLabel})</span>)}
                            </div>
                          </td>

                          <td className="py-1.5 px-3 text-center border-l border-slate-100 text-slate-400 font-mono">
                            {child.recordsCount}
                          </td>

                          {activeMeasures.map((measure) => (
                            <td key={measure.id} className="py-1.5 px-4 text-left border-l border-slate-100 font-mono text-slate-700">
                              {formatValue(child.values[measure.id], measure)}
                            </td>))}
                        </tr>))}
                    </React.Fragment>);
                })}

                {/* Grand Total Row (Odoo Sticky Footer) */}
                <tr className="bg-slate-900 text-white font-bold text-xs border-t-2 border-slate-800">
                  <td className="py-3 px-4 sticky right-0 bg-slate-900 z-10 border-l border-slate-800 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span>المجموع العام (Grand Total)</span>
                  </td>

                  <td className="py-3 px-3 text-center border-l border-slate-800 text-amber-300 font-mono">
                    {totalRecords}
                  </td>

                  {activeMeasures.map((measure) => (
                    <td key={measure.id} className="py-3 px-4 text-left border-l border-slate-800 font-mono text-emerald-300">
                      {formatValue(grandTotal[measure.id], measure)}
                    </td>))}
                </tr>
              </>)}
          </tbody>
        </table>
      </div>
    </div>);
};
