import React, { useState, useEffect } from 'react';
import { Eye, X, Info, Code2, Sparkles, Layers } from 'lucide-react';

interface FieldMetadata {
  fieldName: string;
  fieldType: 'char' | 'date' | 'datetime' | 'float' | 'integer' | 'many2one' | 'selection' | 'boolean' | 'text' | 'binary';
  model: string;
  stringLabel: string;
  required?: boolean;
  readonly?: boolean;
  relation?: string;
  help?: string;
  domain?: string;
}

interface OdooFieldInspectorProps {
  isActive: boolean;
  currentModel?: string;
  onClose: () => void;
}

// Dictionary of known field technical attributes for Odoo HR Models
const FIELD_DICTIONARY: Record<string, Partial<FieldMetadata>> = {
  // Employee fields
  'fullNameAr': { fieldName: 'name', fieldType: 'char', stringLabel: 'الاسم العربي الكامل', required: true, help: 'الاسم الرسمي المسجل في البطاقة المدنية' },
  'fullNameEn': { fieldName: 'name_en', fieldType: 'char', stringLabel: 'الاسم الإنجليزي', help: 'English name matching passport' },
  'civilId': { fieldName: 'civil_id', fieldType: 'char', stringLabel: 'الرقم المدني الكويتي', required: true, help: 'الرقم المدني المكون من 12 خانة وفق خوارزمية MOD 11' },
  'employeeCode': { fieldName: 'barcode', fieldType: 'char', stringLabel: 'كود الموظف / الباركود', required: true, help: 'المعرف الفريد للموظف في المنظومة' },
  'jobTitle': { fieldName: 'job_title', fieldType: 'char', stringLabel: 'المسمى الوظيفي النصي' },
  'jobTitleId': { fieldName: 'job_id', fieldType: 'many2one', relation: 'hr.job', stringLabel: 'المسمى الوظيفي من الشجرة', help: 'ربط جدول المسميات الوظيفية' },
  'department': { fieldName: 'department_id', fieldType: 'many2one', relation: 'hr.department', stringLabel: 'القسم / الإدارة' },
  'cadre': { fieldName: 'cadre_type', fieldType: 'selection', stringLabel: 'نوع الكادر الوظيفي', help: 'إداري / طبي وصحي / مهني' },
  'mohLicenseNo': { fieldName: 'moh_license_no', fieldType: 'char', stringLabel: 'رقم ترخيص مزاولة المهنة (MOH)', help: 'ترخيص وزارة الصحة الكويتية للكوادر الطبية' },
  'mohLicenseExpiry': { fieldName: 'moh_license_expiration_date', fieldType: 'date', stringLabel: 'تاريخ انتهاء ترخيص وزارة الصحة' },
  'nationality': { fieldName: 'country_id', fieldType: 'many2one', relation: 'res.country', stringLabel: 'الجنسية' },
  'passportNo': { fieldName: 'passport_id', fieldType: 'char', stringLabel: 'رقم جواز السفر' },
  'passportExpiry': { fieldName: 'passport_expiration_date', fieldType: 'date', stringLabel: 'تاريخ انتهاء الجواز' },
  'residencyExpiry': { fieldName: 'visa_expire', fieldType: 'date', stringLabel: 'تاريخ انتهاء الإقامة' },
  'joinDate': { fieldName: 'date_start', fieldType: 'date', stringLabel: 'تاريخ المباشرة والتعيين' },
  'basicSalary': { fieldName: 'wage', fieldType: 'float', stringLabel: 'الراتب الأساسي (KWD)', required: true },
  'allowances': { fieldName: 'allowance_ids', fieldType: 'float', stringLabel: 'إجمالي البدلات والمزايا' },
  'paciBuildingNo': { fieldName: 'paci_building_no', fieldType: 'char', stringLabel: 'الرقم الآلي للعنوان (PACI)' },
  'workEmail': { fieldName: 'work_email', fieldType: 'char', stringLabel: 'البريد الإلكتروني للعمل' },
  'workPhone': { fieldName: 'mobile_phone', fieldType: 'char', stringLabel: 'رقم هاتف العمل' },
  'status': { fieldName: 'state', fieldType: 'selection', stringLabel: 'حالة الموظف (نشط/إجازة/منتهي)' },
  'iban': { fieldName: 'bank_account_id', fieldType: 'char', stringLabel: 'رقم الآيبان البنكي (IBAN)' },
  'bankName': { fieldName: 'bank_id', fieldType: 'many2one', relation: 'res.bank', stringLabel: 'اسم البنك المعتمد للرواتب' },
  
  // Contract fields
  'contractType': { fieldName: 'contract_type_id', fieldType: 'selection', stringLabel: 'نوع العقد (محدد / غير محدد)' },
  'startDate': { fieldName: 'date_start', fieldType: 'date', stringLabel: 'تاريخ بدء سريان العقد', required: true },
  'endDate': { fieldName: 'date_end', fieldType: 'date', stringLabel: 'تاريخ انتهاء العقد' },
  'probationDays': { fieldName: 'probation_period', fieldType: 'integer', stringLabel: 'فترة التجربة (100 يوم قانون العمل)' },

  // Leave fields
  'leaveType': { fieldName: 'holiday_status_id', fieldType: 'many2one', relation: 'hr.leave.type', stringLabel: 'نوع الإجازة' },
  'numberOfDays': { fieldName: 'number_of_days', fieldType: 'float', stringLabel: 'عدد الأيام' },
  'requestDateFrom': { fieldName: 'request_date_from', fieldType: 'date', stringLabel: 'من تاريخ' },
  'requestDateTo': { fieldName: 'request_date_to', fieldType: 'date', stringLabel: 'إلى تاريخ' },
};

export const OdooFieldInspector: React.FC<OdooFieldInspectorProps> = ({
  isActive,
  currentModel = 'hr.employee',
  onClose,
}) => {
  const [hoveredField, setHoveredField] = useState<FieldMetadata | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [inspectedElement, setInspectedElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive) {
      setHoveredField(null);
      if (inspectedElement) {
        inspectedElement.style.outline = '';
      }
      return;
    }

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      // Ignore debugger itself
      if (target.closest('.odoo-debug-container') || target.closest('.odoo-inspector-banner')) {
        return;
      }

      // Try to find field identifier
      const fieldElem = target.closest<HTMLElement>(
        'input, select, textarea, [data-field], label, td, th, [data-field-name], button, .form-group'
      );

      if (!fieldElem) {
        return;
      }

      // Extract field technical name
      const rawName = 
        fieldElem.getAttribute('data-field') ||
        fieldElem.getAttribute('data-field-name') ||
        fieldElem.getAttribute('name') ||
        fieldElem.getAttribute('id') ||
        fieldElem.getAttribute('placeholder') ||
        fieldElem.innerText?.trim()?.slice(0, 20) ||
        'field_tech';

      // Match in dictionary
      let matchedKey = Object.keys(FIELD_DICTIONARY).find(k => 
        k.toLowerCase() === rawName.toLowerCase() ||
        rawName.toLowerCase().includes(k.toLowerCase()) ||
        (FIELD_DICTIONARY[k].stringLabel && rawName.includes(FIELD_DICTIONARY[k].stringLabel!))
      );

      let metadata: FieldMetadata;
      if (matchedKey && FIELD_DICTIONARY[matchedKey]) {
        const dict = FIELD_DICTIONARY[matchedKey];
        metadata = {
          fieldName: dict.fieldName || rawName,
          fieldType: dict.fieldType || 'char',
          model: currentModel,
          stringLabel: dict.stringLabel || rawName,
          required: dict.required || false,
          relation: dict.relation,
          help: dict.help || 'حقل تقني في نموذج Odoo Enterprise',
          domain: dict.relation ? `[('company_id', '=', active_company_id)]` : undefined,
        };
      } else {
        // Fallback inferred metadata
        const cleanName = rawName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase() || 'char_field';
        const isDate = cleanName.includes('date') || cleanName.includes('expiry');
        const isNum = cleanName.includes('salary') || cleanName.includes('amount') || cleanName.includes('days') || cleanName.includes('wage');
        const isRel = cleanName.includes('id') || cleanName.includes('department') || cleanName.includes('job');

        metadata = {
          fieldName: cleanName.startsWith('field_') ? cleanName : `x_${cleanName}`,
          fieldType: isDate ? 'date' : isNum ? 'float' : isRel ? 'many2one' : 'char',
          model: currentModel,
          stringLabel: (fieldElem.innerText || rawName).slice(0, 30),
          required: fieldElem.hasAttribute('required'),
          relation: isRel ? `hr.${cleanName.replace('_id', '')}` : undefined,
          help: 'تم التعرف على الحقل عبر Odoo Technical Field Inspector',
        };
      }

      // Visual Outline on inspected element
      if (inspectedElement && inspectedElement !== fieldElem) {
        inspectedElement.style.outline = '';
      }
      fieldElem.style.outline = '2px dashed #9333ea';
      fieldElem.style.outlineOffset = '2px';
      setInspectedElement(fieldElem);

      const rect = fieldElem.getBoundingClientRect();
      const tooltipX = Math.min(Math.max(rect.left, 20), window.innerWidth - 320);
      const tooltipY = rect.bottom + 8 < window.innerHeight - 200 ? rect.bottom + 8 : Math.max(rect.top - 180, 10);

      setTooltipPos({ x: tooltipX, y: tooltipY });
      setHoveredField(metadata);
    };

    window.addEventListener('mouseover', handleMouseOver);
    return () => {
      window.removeEventListener('mouseover', handleMouseOver);
      if (inspectedElement) {
        inspectedElement.style.outline = '';
      }
    };
  }, [isActive, currentModel, inspectedElement]);

  if (!isActive) return null;

  return (
    <>
      {/* Floating Bottom Status Bar */}
      <div 
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 odoo-inspector-banner bg-slate-950/95 text-white px-5 py-2.5 rounded-2xl shadow-2xl border border-purple-500/50 flex items-center gap-4 backdrop-blur-md animate-in slide-in-from-bottom-5 font-sans"
        dir="rtl"
      >
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-ping" />
          <Eye className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-bold text-purple-200">
            فاحص الحقول الفنية نشط (Odoo Technical Field Inspector)
          </span>
        </div>
        <div className="text-[11px] text-slate-300 hidden md:inline border-r border-slate-700 pr-3 mr-1">
          مرر الماوس فوق أي حقل بالصفحة لمعاينة اسمه التقني ونوعه والموديل.
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-1 bg-purple-700 hover:bg-purple-600 text-white text-xs px-3 py-1 rounded-lg font-bold transition shadow-xs cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
          <span>إيقاف الفاحص</span>
        </button>
      </div>

      {/* Floating Dark Odoo Technical Tooltip */}
      {hoveredField && (
        <div
          className="fixed z-50 pointer-events-none transition-all duration-75 font-mono text-[11px] select-none odoo-debug-container"
          style={{
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y}px`,
          }}
          dir="ltr"
        >
          <div className="bg-slate-950/95 backdrop-blur-md text-slate-100 rounded-lg shadow-2xl border border-purple-500/70 p-3 min-w-[260px] max-w-[340px] text-left space-y-1.5 animate-in fade-in zoom-in-95">
            {/* Header: Field Name */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 font-sans">
              <span className="text-[10px] text-purple-400 font-bold tracking-wider uppercase">
                Odoo Field Info
              </span>
              <span className="text-[9px] bg-purple-900/80 text-purple-200 px-1.5 py-0.5 rounded font-mono">
                {hoveredField.model}
              </span>
            </div>

            {/* Field Specs */}
            <div className="space-y-1 text-slate-300">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-slate-500 text-[10px]">Field:</span>
                <span className="text-amber-300 font-bold font-mono text-xs">{hoveredField.fieldName}</span>
              </div>

              <div className="flex items-baseline justify-between gap-2">
                <span className="text-slate-500 text-[10px]">Type:</span>
                <span className="text-emerald-400 font-semibold">{hoveredField.fieldType}</span>
              </div>

              <div className="flex items-baseline justify-between gap-2 font-sans text-right" dir="rtl">
                <span className="text-slate-500 text-[10px]" dir="ltr">String:</span>
                <span className="text-white text-xs truncate font-medium">{hoveredField.stringLabel}</span>
              </div>

              {hoveredField.relation && (
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-slate-500 text-[10px]">Relation:</span>
                  <span className="text-indigo-400">{hoveredField.relation}</span>
                </div>
              )}

              {hoveredField.domain && (
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-slate-500 text-[10px]">Domain:</span>
                  <span className="text-slate-400 text-[9px] truncate">{hoveredField.domain}</span>
                </div>
              )}

              <div className="flex items-center gap-3 pt-1 text-[10px] border-t border-slate-900">
                <span className={hoveredField.required ? 'text-rose-400 font-bold' : 'text-slate-500'}>
                  Required: {hoveredField.required ? 'True' : 'False'}
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400">
                  Readonly: {hoveredField.readonly ? 'True' : 'False'}
                </span>
              </div>

              {hoveredField.help && (
                <div className="text-[10px] text-slate-400 font-sans italic pt-1 border-t border-slate-800 leading-snug" dir="rtl">
                  {hoveredField.help}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
