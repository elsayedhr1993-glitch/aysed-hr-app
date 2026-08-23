import React, { useState } from 'react';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart 
} from 'recharts';
import { 
  BarChart3, LineChart as LineIcon, PieChart as PieIcon, 
  TrendingUp, Layers, Check, Sparkles, DollarSign, Users, Award
} from 'lucide-react';
import { PivotRowData } from './OdooPivotView';
import { MeasureOption } from './OdooSearchBar';

interface OdooGraphViewProps {
  data: PivotRowData[];
  activeMeasures: MeasureOption[];
  reportTitle: string;
  groupByLabel: string;
}

const COLORS = [
  '#714B67', '#0284c7', '#059669', '#d97706', '#dc2626', 
  '#9333ea', '#4f46e5', '#0d9488', '#ea580c', '#64748b'
];

export const OdooGraphView: React.FC<OdooGraphViewProps> = ({
  data,
  activeMeasures,
  reportTitle,
  groupByLabel,
}) => {
  const [chartType, setChartType] = useState<'BAR' | 'LINE' | 'PIE'>('BAR');
  const [isStacked, setIsStacked] = useState(false);
  const [selectedMeasureId, setSelectedMeasureId] = useState<string>(
    activeMeasures[0]?.id || 'count'
  );

  const currentMeasure = activeMeasures.find(m => m.id === selectedMeasureId) || activeMeasures[0] || {
    id: 'count',
    label: 'عدد السجلات',
    field: 'count',
    isCurrency: false
  };

  // Prepare chart dataset
  const chartData = data.map(item => {
    const entry: Record<string, any> = {
      name: item.label,
      count: item.recordsCount,
      ...item.values,
    };
    return entry;
  });

  // Calculate top contributor and metrics
  const totalMeasureValue = chartData.reduce((acc, curr) => acc + (Number(curr[selectedMeasureId]) || 0), 0);
  const maxItem = [...chartData].sort((a, b) => (Number(b[selectedMeasureId]) || 0) - (Number(a[selectedMeasureId]) || 0))[0];
  const averageValue = chartData.length > 0 ? totalMeasureValue / chartData.length : 0;

  const formatTooltipValue = (value: any) => {
    const num = Number(value) || 0;
    if (currentMeasure.isCurrency) {
      return [`${num.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} د.ك`, currentMeasure.label];
    }
    if (currentMeasure.unit) {
      return [`${num.toLocaleString('en-US')} ${currentMeasure.unit}`, currentMeasure.label];
    }
    return [num.toLocaleString('en-US'), currentMeasure.label];
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col font-sans" dir="rtl">
      {/* Top Chart Controls Toolbar */}
      <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Chart Type Switchers */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
          <button
            onClick={() => setChartType('BAR')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              chartType === 'BAR' 
                ? 'bg-[#714B67] text-white shadow-2xs' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>أعمدة (Bar)</span>
          </button>

          <button
            onClick={() => setChartType('LINE')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              chartType === 'LINE' 
                ? 'bg-[#714B67] text-white shadow-2xs' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <LineIcon className="w-3.5 h-3.5" />
            <span>خطي (Line)</span>
          </button>

          <button
            onClick={() => setChartType('PIE')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              chartType === 'PIE' 
                ? 'bg-[#714B67] text-white shadow-2xs' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <PieIcon className="w-3.5 h-3.5" />
            <span>دائري (Pie)</span>
          </button>
        </div>

        {/* Right: Measure Metric Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">المقياس المعروض:</span>
          <select
            value={selectedMeasureId}
            onChange={(e) => setSelectedMeasureId(e.target.value)}
            className="bg-white border border-slate-300 text-slate-800 text-xs font-bold rounded-lg px-3 py-1.5 outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 cursor-pointer shadow-2xs"
          >
            {activeMeasures.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} {m.unit ? `(${m.unit})` : ''}
              </option>))}
          </select>
        </div>
      </div>

      {/* Main Chart Canvas */}
      <div className="p-6">
        {chartData.length === 0 ? (
          <div className="h-80 flex flex-col items-center justify-center text-slate-400">
            <BarChart3 className="w-12 h-12 stroke-1 text-slate-300 mb-2" />
            <p className="text-xs font-bold">لا توجد بيانات متاحة للرسم البياني</p>
          </div>) : (
          <div className="h-80 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'BAR' ? (
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 11, fill: '#475569' }} 
                    angle={-25} 
                    textAnchor="end" 
                    interval={0}
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: '#475569' }} 
                    tickFormatter={(v) => currentMeasure.isCurrency ? `${(v).toLocaleString()} د.ك` : v}
                  />
                  <Tooltip 
                    formatter={formatTooltipValue}
                    contentStyle={{ 
                      backgroundColor: '#0f172a', 
                      borderColor: '#334155', 
                      borderRadius: '0.75rem', 
                      color: '#fff',
                      fontSize: '12px',
                      direction: 'rtl'
                    }}
                  />
                  <Bar 
                    dataKey={selectedMeasureId} 
                    name={currentMeasure.label} 
                    fill="#714B67" 
                    radius={[6, 6, 0, 0]} 
                  >
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                  </Bar>
                </BarChart>) : chartType === 'LINE' ? (
                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 11, fill: '#475569' }} 
                    angle={-25} 
                    textAnchor="end" 
                    interval={0}
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: '#475569' }} 
                    tickFormatter={(v) => currentMeasure.isCurrency ? `${(v).toLocaleString()} د.ك` : v}
                  />
                  <Tooltip 
                    formatter={formatTooltipValue}
                    contentStyle={{ 
                      backgroundColor: '#0f172a', 
                      borderColor: '#334155', 
                      borderRadius: '0.75rem', 
                      color: '#fff',
                      fontSize: '12px',
                      direction: 'rtl'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey={selectedMeasureId} 
                    name={currentMeasure.label} 
                    stroke="#714B67" 
                    strokeWidth={3} 
                    dot={{ r: 5, fill: '#714B67', strokeWidth: 2, stroke: '#fff' }} 
                    activeDot={{ r: 8, fill: '#9333ea' }}
                  />
                </LineChart>) : (
                <PieChart>
                  <Tooltip 
                    formatter={formatTooltipValue}
                    contentStyle={{ 
                      backgroundColor: '#0f172a', 
                      borderColor: '#334155', 
                      borderRadius: '0.75rem', 
                      color: '#fff',
                      fontSize: '12px',
                      direction: 'rtl'
                    }}
                  />
                  <Pie
                    data={chartData}
                    dataKey={selectedMeasureId}
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={105}
                    innerRadius={45}
                    paddingAngle={3}
                    label={({ name, percent }) => `${name}: ${(((percent !== undefined && !isNaN(percent)) ? percent : 0) * 100).toFixed(1)}%`}
                  >
                    {chartData.map((_, index) => (
                      <Cell key={`pie-cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                  </Pie>
                  <Legend />
                </PieChart>)}
            </ResponsiveContainer>
          </div>)}
      </div>

      {/* KPI Cards Strip below chart */}
      <div className="grid grid-cols-1 sm:grid-cols-3 border-t border-slate-100 bg-slate-50/60 p-4 gap-4" dir="rtl">
        <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center gap-3">
          <div className="p-2 bg-purple-100 text-purple-700 rounded-lg shrink-0">
            <Award className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 font-bold block">الفئة الأعلى مساهمة</span>
            <span className="text-xs font-bold text-slate-800 truncate block">
              {maxItem ? `${maxItem.name} (${Number(maxItem[selectedMeasureId] || 0).toLocaleString()})` : '—'}
            </span>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center gap-3">
          <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 font-bold block">المتوسط الحسابي للفئة</span>
            <span className="text-xs font-bold text-emerald-700 font-mono block">
              {currentMeasure.isCurrency 
                ? `${averageValue.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} د.ك`
                : averageValue.toLocaleString('en-US', { maximumFractionDigits: 1 })
              }
            </span>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center gap-3">
          <div className="p-2 bg-amber-100 text-amber-800 rounded-lg shrink-0">
            <DollarSign className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 font-bold block">إجمالي القيمة الكلية</span>
            <span className="text-xs font-bold text-slate-900 font-mono block">
              {currentMeasure.isCurrency 
                ? `${totalMeasureValue.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} د.ك`
                : totalMeasureValue.toLocaleString('en-US')
              }
            </span>
          </div>
        </div>
      </div>
    </div>);
};
