import React, { useState, useRef, useEffect } from 'react';

export interface PrintTemplateOption {
  id: string;
  titleAr: string;
  titleEn: string;
  icon: string;
}

interface PrintActionsMenuProps {
  moduleType: 'employees' | 'leaves' | 'payroll' | 'attendance';
  recordData?: any;
  onSelectTemplate: (templateId: string, recordData: any) => void;
  className?: string;
}

export const PrintActionsMenu: React.FC<PrintActionsMenuProps> = ({
  moduleType,
  recordData,
  onSelectTemplate,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // إغلاق القائمة عند الضغط في أي مكان خارجها
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // بنك القوالب والخدمات المتاحة لكل تطبيق
  const moduleTemplates: Record<string, PrintTemplateOption[]> = {
    // 1. تطبيق الموظفين والملفات (HR Core)
    employees: [
      { id: 'salary_cert_ar', titleAr: 'شهادة راتب واستمرارية (عربي)', titleEn: 'Salary Certificate (Arabic)', icon: '📄' },
      { id: 'salary_cert_en', titleAr: 'Salary Certificate (English)', titleEn: 'Salary Certificate (English)', icon: '🌐' },
      { id: 'experience_cert', titleAr: 'شهادة خبرة وإخلاء طرف', titleEn: 'Experience Letter', icon: '🎓' },
      { id: 'employment_contract', titleAr: 'عقد العمل الموحد (نموذج 2 - القوى العاملة)', titleEn: 'Employment Contract', icon: '📜' },
      { id: 'warning_letter', titleAr: 'نموذج إنذار إداري / لفت نظر', titleEn: 'Disciplinary Warning Letter', icon: '⚠️' }
    ],

    // 2. تطبيق الإجازات (Leaves & Time Off)
    leaves: [
      { id: 'leave_settlement', titleAr: 'كشف تسوية مستحقات إجازة', titleEn: 'Leave Settlement Report', icon: '💰' },
      { id: 'leave_request_form', titleAr: 'نموذج طلب وموافقة إجازة', titleEn: 'Leave Approval Form', icon: '📝' },
      { id: 'leave_balance_pivot', titleAr: 'تقرير أرصدة الإجازات (Pivot)', titleEn: 'Leave Balances Matrix', icon: '📊' }
    ],

    // 3. تطبيق الرواتب (Payroll & WPS)
    payroll: [
      { id: 'payslip', titleAr: 'قسيمة الراتب التفصيلية (Payslip)', titleEn: 'Employee Payslip', icon: '🧾' },
      { id: 'bank_transfer_sheet', titleAr: 'كشف تحويل الرواتب للبنك', titleEn: 'Bank Transfer Sheet', icon: '🏦' },
      { id: 'eos_settlement', titleAr: 'مستحقات مكافأة نهاية الخدمة', titleEn: 'End of Service Indemnity', icon: '⚖️' }
    ],

    // 4. تطبيق الحضور والبصمة (Attendance)
    attendance: [
      { id: 'monthly_timesheet', titleAr: 'سجل الحضور والانصراف الشهري', titleEn: 'Monthly Timesheet', icon: '⏱️' },
      { id: 'overtime_report', titleAr: 'كشف الساعات الإضافية المعتمدة', titleEn: 'Overtime Report', icon: '📈' }
    ]
  };

  const currentOptions = moduleTemplates[moduleType] || [];

  const handleTriggerPrint = (templateId: string) => {
    setIsOpen(false);
    onSelectTemplate(templateId, recordData);
  };

  return (
    <div className={`relative inline-block text-right ${className}`} ref={menuRef} dir="rtl">
      {/* زر القائمة الرئيسي بالأعلى */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg shadow-xs transition focus:outline-none focus:ring-2 focus:ring-[#714B67] cursor-pointer"
      >
        <span className="text-sm">🖨️</span>
        <span>طباعة وإجراءات</span>
        <svg
          className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* القائمة المنسدلة */}
      {isOpen && (
        <div className="absolute right-0 mt-1 w-68 bg-white rounded-xl shadow-xl border border-slate-200 z-50 py-1 divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-2 bg-slate-50 text-[11px] font-bold text-slate-600 rounded-t-xl">
            نماذج ومستندات الطباعة والتقارير
          </div>

          <div className="py-1">
            {currentOptions.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleTriggerPrint(item.id)}
                className="w-full text-right px-3.5 py-2.5 text-xs text-slate-700 hover:bg-[#714B67]/10 hover:text-[#714B67] flex items-center justify-between transition group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{item.icon}</span>
                  <div>
                    <p className="font-bold leading-tight">{item.titleAr}</p>
                    <p className="text-[10px] text-slate-400 group-hover:text-[#714B67]/80 font-sans">{item.titleEn}</p>
                  </div>
                </div>
                <span className="text-slate-300 group-hover:text-[#714B67] text-xs font-bold">←</span>
              </button>
            ))}
          </div>

          <div className="p-1 bg-slate-50/80">
            <button
              type="button"
              onClick={() => handleTriggerPrint('manage_templates')}
              className="w-full text-right px-3 py-2 text-xs font-bold text-[#714B67] hover:bg-[#714B67] hover:text-white rounded-lg flex items-center justify-between transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span>⚙️</span>
                <span>إدارة وتخصيص قوالب المستندات</span>
              </div>
              <span className="text-xs">📂</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
