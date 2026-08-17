import { useState, useEffect } from 'react';
import { ResLang } from '../types';

export const ODOO_LANGUAGES: ResLang[] = [
  {
    id: 'lang_ar_001',
    name: 'العربية (Arabic)',
    code: 'ar_001',
    isoCode: 'ar',
    direction: 'rtl',
    active: true,
    dateFormat: 'YYYY-MM-DD',
    timeFormat: 'HH:mm:ss',
    decimalPoint: '.',
    thousandsSep: ',',
    flag: '🇰🇼'
  },
  {
    id: 'lang_en_US',
    name: 'English (US)',
    code: 'en_US',
    isoCode: 'en',
    direction: 'ltr',
    active: true,
    dateFormat: 'MM/DD/YYYY',
    timeFormat: 'HH:mm:ss',
    decimalPoint: '.',
    thousandsSep: ',',
    flag: '🇺🇸'
  }
];

export const DICTIONARY: Record<string, { ar: string; en: string }> = {
  // Navigation & Core App
  app_launcher: { ar: 'لوحة التطبيقات', en: 'App Launcher' },
  close_app: { ar: 'إغلاق التطبيق', en: 'Close App' },
  search_placeholder: { ar: 'بحث في النظام...', en: 'Search system...' },
  print: { ar: 'طباعة', en: 'Print' },
  notifications: { ar: 'التنبيهات', en: 'Notifications' },
  profile: { ar: 'الملف الشخصي', en: 'Profile' },
  settings: { ar: 'الإعدادات', en: 'Settings' },
  logout: { ar: 'تسجيل الخروج', en: 'Logout' },
  super_admin: { ar: 'مشرف النظام العام', en: 'System Admin' },
  company_isolated: { ar: 'معزول', en: 'Isolated' },
  
  // Common Actions
  save: { ar: 'حفظ', en: 'Save' },
  cancel: { ar: 'إلغاء', en: 'Cancel' },
  delete: { ar: 'حذف', en: 'Delete' },
  edit: { ar: 'تعديل', en: 'Edit' },
  add: { ar: 'إضافة', en: 'Add' },
  confirm: { ar: 'تأكيد', en: 'Confirm' },
  approve: { ar: 'اعتماد', en: 'Approve' },
  reject: { ar: 'رفض', en: 'Reject' },
  actions: { ar: 'الإجراءات', en: 'Actions' },
  status: { ar: 'الحالة', en: 'Status' },
  no_data: { ar: 'لا توجد بيانات', en: 'No Data' },
  filter: { ar: 'تصفية', en: 'Filter' },
  export_excel: { ar: 'تصدير إكسيل', en: 'Export Excel' },
  import_data: { ar: 'استيراد بيانات', en: 'Import Data' },
  all: { ar: 'الكل', en: 'All' },
  active: { ar: 'نشط', en: 'Active' },
  inactive: { ar: 'غير نشط', en: 'Inactive' },

  // Modules
  employees: { ar: 'الموظفين', en: 'Employees' },
  contracts: { ar: 'عقود العمل', en: 'Contracts' },
  leaves: { ar: 'الإجازات والغياب', en: 'Time Off' },
  attendance: { ar: 'الحضور والانصراف', en: 'Attendance' },
  payroll: { ar: 'الرواتب والأجور', en: 'Payroll' },
  recruitment: { ar: 'التوظيف', en: 'Recruitment' },
  eos: { ar: 'مكافأة نهاية الخدمة', en: 'End of Service' },
  documents: { ar: 'المستندات والـ OCR', en: 'Documents & OCR' },
  doc_templates: { ar: 'قوالب النماذج الرسمية', en: 'Document Templates' },
  custodies_loans: { ar: 'العهد والسلف', en: 'Custodies & Loans' },
  shifts: { ar: 'الورديات وجداول الدوام', en: 'Shifts & Rosters' },
  saas_admin: { ar: 'إدارة المنظومة (SaaS)', en: 'SaaS Admin' },
  reports: { ar: 'التقارير المتقدمة', en: 'Reports' },
  automation: { ar: 'الأتمتة وسير العمل', en: 'Automation' },

  // Leaves & Balances
  leave: { ar: 'الإجازات', en: 'Leaves' },
  leave_balances: { ar: 'أرصدة الإجازات', en: 'Leave Balances' },
  add_leave: { ar: 'طلب إجازة جديد', en: 'New Leave Request' },
  employee_name: { ar: 'اسم الموظف', en: 'Employee Name' },
  leave_type: { ar: 'نوع الإجازة', en: 'Leave Type' },
  from_date: { ar: 'من تاريخ', en: 'From Date' },
  to_date: { ar: 'إلى تاريخ', en: 'To Date' },
  pending: { ar: 'معلقة', en: 'Pending' },
  approved: { ar: 'معتمدة', en: 'Approved' },
  rejected: { ar: 'مرفوضة', en: 'Rejected' },
  select_employee: { ar: 'اختر الموظف...', en: 'Select Employee...' },
  reason: { ar: 'سبب الإجازة', en: 'Reason' },

  // Language & Settings Specific
  languages_res_lang: { ar: 'اللغات والتوطين (res.lang)', en: 'Languages & Localization (res.lang)' },
  activate_en: { ar: 'تفعيل اللغة الإنجليزية (en_US)', en: 'Activate English (en_US)' },
  activate_ar: { ar: 'تفعيل اللغة العربية وضبط RTL (ar_001)', en: 'Activate Arabic & set RTL (ar_001)' },
  lang_switched: { ar: 'تم تبديل لغة النظام بنجاح', en: 'System language switched successfully' },
};

export function getInitialLang(): 'ar' | 'en' {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('aysed_res_lang') || localStorage.getItem('res_lang_code');
    if (saved === 'en_US' || saved === 'en') return 'en';
  }
  return 'ar';
}

export function useLang() {
  const [lang, setLangState] = useState<'ar' | 'en'>(getInitialLang);

  const applyLang = (newLang: 'ar' | 'en') => {
    setLangState(newLang);
    const langCode = newLang === 'ar' ? 'ar_001' : 'en_US';
    const direction = newLang === 'ar' ? 'rtl' : 'ltr';

    if (typeof window !== 'undefined') {
      localStorage.setItem('aysed_res_lang', newLang);
      localStorage.setItem('res_lang_code', langCode);
      localStorage.setItem('res_lang_direction', direction);
      
      document.documentElement.lang = newLang;
      document.documentElement.dir = direction;
    }
  };

  useEffect(() => {
    const direction = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    document.documentElement.dir = direction;
  }, [lang]);

  const t = (key: string): string => {
    return DICTIONARY[key] ? (lang === 'ar' ? DICTIONARY[key].ar : DICTIONARY[key].en) : key;
  };

  return { 
    lang, 
    setLang: applyLang, 
    t,
    isRtl: lang === 'ar',
    currentLangCode: lang === 'ar' ? 'ar_001' : 'en_US',
    languages: ODOO_LANGUAGES 
  };
}
