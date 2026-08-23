import React, { useState } from 'react';
import { 
  List, ArrowUpDown, ChevronUp, ChevronDown, CheckCircle2, 
  AlertTriangle, XCircle, Clock, ShieldCheck, FileText, User
} from 'lucide-react';

export interface ListColumn {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  isCurrency?: boolean;
  render?: (row: any) => React.ReactNode;
}

interface OdooReportListViewProps {
  columns: ListColumn[];
  data: any[];
  reportTitle: string;
  totalRecords: number;
  summaryRow?: Record<string, number | string>;
}

export const OdooReportListView: React.FC<OdooReportListViewProps> = ({
  columns,
  data,
  reportTitle,
  totalRecords,
  summaryRow,
}) => {
  const [sortKey, setSortKey] = useState<string>(columns[0]?.key || '');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortKey) return 0;
    const valA = a[sortKey];
    const valB = b[sortKey];

    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortAsc ? valA - valB : valB - valA;
    }
    const strA = String(valA || '').toLowerCase();
    const strB = String(valB || '').toLowerCase();
    return sortAsc ? strA.localeCompare(strB) : strB.localeCompare(strA);
  });

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col font-sans" dir="rtl">
      {/* List Header */}
      <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#714B67] text-white rounded-lg shadow-2xs">
            <List className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800">{reportTitle} - القائمة التفصيلية (List View)</h3>
            <p className="text-[10px] text-slate-500">إجمالي السجلات المعروضة: {totalRecords} سجل</p>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100/90 text-slate-700 border-b border-slate-300 font-bold">
              <th className="py-2.5 px-3 text-center w-12 border-l border-slate-200 text-slate-500">#</th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`py-2.5 px-3 border-l border-slate-200 cursor-pointer select-none hover:bg-slate-200/70 transition ${
                    col.align === 'left' ? 'text-left' : col.align === 'center' ? 'text-center' : 'text-right'
                  }`}
                >
                  <div className={`flex items-center gap-1 ${
                    col.align === 'left' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'
                  }`}>
                    <span>{col.label}</span>
                    {sortKey === col.key ? (
                      sortAsc ? <ChevronUp className="w-3 h-3 text-purple-700" /> : <ChevronDown className="w-3 h-3 text-purple-700" />) : (
                      <ArrowUpDown className="w-2.5 h-2.5 text-slate-400 opacity-40" />)}
                  </div>
                </th>))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="py-12 text-center text-slate-400">
                  <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
                  <p className="text-xs font-bold">لا توجد بيانات مسجلة مطابقة للبحث</p>
                </td>
              </tr>) : (
              sortedData.map((row, idx) => (
                <tr key={row.id || idx} className="hover:bg-purple-50/30 transition-colors">
                  <td className="py-2 px-3 text-center text-slate-400 font-mono text-[10px] border-l border-slate-100">
                    {idx + 1}
                  </td>
                  {columns.map((col) => {
                    const rawVal = row[col.key];
                    return (
                      <td
                        key={col.key}
                        className={`py-2 px-3 border-l border-slate-100 ${
                          col.align === 'left' ? 'text-left font-mono' : col.align === 'center' ? 'text-center' : 'text-right'
                        }`}
                      >
                        {col.render ? (
                          col.render(row)
                        ) : col.isCurrency && typeof rawVal === 'number' ? (
                          <span className="font-bold text-slate-900">
                            {rawVal.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} د.ك
                          </span>) : typeof rawVal === 'number' ? (
                          <span className="font-mono text-slate-800">{rawVal.toLocaleString('en-US')}</span>) : (
                          <span className="text-slate-700">{rawVal || '—'}</span>)}
                      </td>);
                  })}
                </tr>))
            )}

            {/* Summary Row */}
            {summaryRow && sortedData.length > 0 && (
              <tr className="bg-slate-900 text-white font-bold text-xs border-t-2 border-slate-800">
                <td className="py-3 px-3 text-center border-l border-slate-800 text-amber-400">∑</td>
                {columns.map((col) => {
                  const summaryVal = summaryRow[col.key];
                  return (
                    <td
                      key={col.key}
                      className={`py-3 px-3 border-l border-slate-800 ${
                        col.align === 'left' ? 'text-left font-mono text-emerald-300' : col.align === 'center' ? 'text-center' : 'text-right text-amber-200'
                      }`}
                    >
                      {summaryVal !== undefined ? (
                        col.isCurrency && typeof summaryVal === 'number' ? (
                          `${summaryVal.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} د.ك`
                        ) : (
                          summaryVal
                        )
                      ) : (
                        ''
                      )}
                    </td>);
                })}
              </tr>)}
          </tbody>
        </table>
      </div>
    </div>);
};
