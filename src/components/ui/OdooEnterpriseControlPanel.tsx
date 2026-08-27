import React from 'react';
import { ChevronLeft, Plus, Save, Printer, Download, MoreHorizontal, ArrowRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface OdooEnterpriseControlPanelProps {
  breadcrumbs: BreadcrumbItem[];
  title?: string;
  onNew?: () => void;
  onSave?: () => void;
  onPrint?: () => void;
  onExport?: () => void;
  onBack?: () => void;
  newButtonLabel?: string;
  showSave?: boolean;
  showNew?: boolean;
  showPrint?: boolean;
  showExport?: boolean;
  extraActions?: React.ReactNode;
}

export const OdooEnterpriseControlPanel: React.FC<OdooEnterpriseControlPanelProps> = ({
  breadcrumbs,
  title,
  onNew,
  onSave,
  onPrint,
  onExport,
  onBack,
  newButtonLabel = 'جديد',
  showSave = true,
  showNew = true,
  showPrint = false,
  showExport = false,
  extraActions
}) => {
  return (
    <div className="bg-white border-b border-slate-200 px-3 py-1.5 shadow-2xs sticky top-11 z-30 flex items-center justify-between min-h-[44px]" dir="rtl">
      <div className="flex items-center gap-2 min-w-0">
        {onBack && (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1 text-[#714B67] hover:text-[#5a3a51] font-bold transition bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded text-xs shrink-0"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>العودة</span>
          </button>
        )}

        <nav className="flex items-center gap-1.5 text-xs text-slate-500 font-medium truncate">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <ChevronLeft className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
              {crumb.onClick ? (
                <button
                  onClick={crumb.onClick}
                  className="hover:text-[#714B67] transition cursor-pointer font-semibold text-slate-600 truncate"
                >
                  {crumb.label}
                </button>
              ) : (
                <span className={`truncate ${idx === breadcrumbs.length - 1 ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>
                  {crumb.label}
                </span>
              )}
            </React.Fragment>
          ))}
          {title && (
            <>
              <ChevronLeft className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-xs font-bold text-slate-900 truncate">{title}</span>
            </>
          )}
        </nav>
      </div>

      {/* Action Buttons Bar */}
      <div className="flex items-center gap-1.5 shrink-0">
        {showNew && onNew && (
          <button
            onClick={onNew}
            className="bg-[#714B67] hover:bg-[#5a3a51] text-white px-2.5 py-1 rounded-lg font-bold text-xs shadow-2xs transition flex items-center gap-1 cursor-pointer active:scale-95 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{newButtonLabel}</span>
          </button>
        )}

        {showSave && onSave && (
          <button
            onClick={onSave}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg font-bold text-xs shadow-2xs transition flex items-center gap-1 cursor-pointer active:scale-95 shrink-0"
          >
            <Save className="w-3.5 h-3.5" />
            <span>حفظ</span>
          </button>
        )}

        {showPrint && onPrint && (
          <button
            onClick={onPrint}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg font-semibold text-xs transition flex items-center gap-1 cursor-pointer shrink-0"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">طباعة</span>
          </button>
        )}

        {showExport && onExport && (
          <button
            onClick={onExport}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg font-semibold text-xs transition flex items-center gap-1 cursor-pointer shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">تصدير</span>
          </button>
        )}

        {extraActions}
      </div>
    </div>
  );
};
