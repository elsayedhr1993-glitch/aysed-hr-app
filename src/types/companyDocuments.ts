// تعريف نوع البيانات لتراخيص ومستندات المنشأة
export interface CompanyDocument {
  id: string;
  name: string; // اسم الترخيص
  documentType: 'commercial_license' | 'signature_auth' | 'chamber_commerce' | 'municipality' | 'civil_defense' | 'medical_license' | 'lease_contract' | 'other';
  documentNumber: string; // رقم الترخيص / القيد
  issuingAuthority: string; // جهة الإصدار (وزارة التجارة، البلدية، الصحة، المطافئ...)
  issueDate: string; // تاريخ الإصدار YYYY-MM-DD
  expiryDate: string; // تاريخ الانتهاء YYYY-MM-DD
  responsiblePerson: string; // الموظف/المندوب المسؤول عن المتابعة والتجديد
  fileUrl?: string; // رابط ملف الـ PDF أو الصورة
  notes?: string;
  companyId?: string;
}

// دالة حساب الحالة والتنبيهات بأسلوب Odoo (Computed Status)
export function getDocumentStatus(expiryDateStr: string): {
  status: 'valid' | 'expiring_soon' | 'expired';
  daysRemaining: number;
  badgeColor: string;
  badgeLabel: string;
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiryDate = new Date(expiryDateStr);
  expiryDate.setHours(0, 0, 0, 0);

  const diffTime = expiryDate.getTime() - today.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return {
      status: 'expired',
      daysRemaining,
      badgeColor: 'bg-red-100 text-red-800 border-red-300',
      badgeLabel: `منتهي منذ ${Math.abs(daysRemaining)} يوم`
    };
  } else if (daysRemaining <= 60) {
    return {
      status: 'expiring_soon',
      daysRemaining,
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
      badgeLabel: `ينتهي خلال ${daysRemaining} يوم`
    };
  } else {
    return {
      status: 'valid',
      daysRemaining,
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      badgeLabel: 'ساري المفعول'
    };
  }
}
