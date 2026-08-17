import { Employee, LeaveRequest, Payslip, EmployeeNotification, WhatsAppGatewayConfig } from '../types';
import { formatKWD } from './kuwaitLaw';

/**
 * Live WhatsApp sending result interface
 */
export interface LiveWhatsAppSendResult {
  success: boolean;
  messageId?: string;
  phone?: string;
  data?: any;
  error?: string;
  errorCode?: string;
  statusCode?: number;
  timestamp: string;
}

/**
 * Execute real HTTP POST request to send WhatsApp message via UltraMsg / WhatsApp Gateway
 */
export async function sendLiveWhatsAppMessage(params: {
  phone: string;
  message: string;
  gatewayConfig: Partial<WhatsAppGatewayConfig>;
  priority?: number;
}): Promise<LiveWhatsAppSendResult> {
  const { phone, message, gatewayConfig, priority } = params;

  if (!gatewayConfig.apiToken || gatewayConfig.apiToken.trim() === '') {
    return {
      success: false,
      error: 'مفتاح الـ API Token الخاص ببوابة الواتساب غير مضبوط. يرجى إدخاله في شاشة إعدادات الربط الخارجي.',
      errorCode: 'MISSING_API_TOKEN',
      timestamp: new Date().toISOString()
    };
  }

  if (!phone || phone.trim() === '') {
    return {
      success: false,
      error: 'رقم هاتف المستلم غير متوفر أو فارغ.',
      errorCode: 'MISSING_PHONE',
      timestamp: new Date().toISOString()
    };
  }

  // Format clean phone with country code (Kuwait +965 default)
  let cleanDigits = phone.replace(/[^\d+]/g, '');
  if (cleanDigits.startsWith('+')) {
    cleanDigits = cleanDigits.substring(1);
  }
  if (cleanDigits.length === 8 && !cleanDigits.startsWith('965')) {
    cleanDigits = '965' + cleanDigits;
  }

  try {
    // 1. Call secure server-side proxy route /api/send-whatsapp
    const response = await fetch('/api/send-whatsapp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instanceId: gatewayConfig.instanceId || 'instance',
        apiToken: gatewayConfig.apiToken,
        serverUrl: gatewayConfig.serverUrl,
        to: cleanDigits,
        body: message,
        priority: priority || 10
      })
    });

    const resJson = await response.json().catch(() => ({}));

    if (!response.ok || !resJson.success) {
      const errMsg = resJson.error || `خطأ استجابة من الخادم (HTTP ${response.status})`;
      return {
        success: false,
        error: errMsg,
        errorCode: resJson.errorCode || 'GATEWAY_ERROR',
        statusCode: response.status,
        data: resJson.details || resJson,
        timestamp: new Date().toISOString()
      };
    }

    return {
      success: true,
      messageId: resJson.messageId || resJson.data?.id || `wpp_${Date.now()}`,
      phone: `+${cleanDigits}`,
      data: resJson.data,
      timestamp: resJson.timestamp || new Date().toISOString()
    };
  } catch (netErr: any) {
    // Fallback: direct browser fetch if server route fails
    if (gatewayConfig.instanceId && gatewayConfig.apiToken) {
      try {
        const directUrl = gatewayConfig.serverUrl && gatewayConfig.serverUrl.trim() !== ''
          ? gatewayConfig.serverUrl
          : `https://api.ultramsg.com/${gatewayConfig.instanceId.trim()}/messages/chat`;

        const formBody = new URLSearchParams();
        formBody.append('token', gatewayConfig.apiToken.trim());
        formBody.append('to', cleanDigits);
        formBody.append('body', message);

        const directRes = await fetch(directUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formBody
        });

        const directJson = await directRes.json().catch(() => ({}));
        if (directRes.ok && !directJson.error) {
          return {
            success: true,
            messageId: directJson.id || directJson.messageId || `wpp_${Date.now()}`,
            phone: `+${cleanDigits}`,
            data: directJson,
            timestamp: new Date().toISOString()
          };
        }
      } catch {
        // Continue to network error return
      }
    }

    return {
      success: false,
      error: `فشل الاتصال بالشبكة أو انقطاع الإنترنت: ${netErr.message || 'Network Unavailable'}`,
      errorCode: 'OFFLINE_OR_NETWORK_FAILURE',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Format Kuwait phone number with +965 prefix
 */
export function formatKuwaitPhone(phone: string | undefined | null): string {
  if (!phone) return '';
  const clean = phone.trim().replace(/[^\d+]/g, '');
  if (clean.startsWith('+965')) {
    const num = clean.replace('+965', '').trim();
    return `+965 ${num}`;
  }
  if (clean.startsWith('965')) {
    const num = clean.replace('965', '').trim();
    return `+965 ${num}`;
  }
  if (clean.length === 8) {
    return `+965 ${clean}`;
  }
  return clean.startsWith('+') ? clean : `+965 ${clean}`;
}

/**
 * Generate predefined Kuwait HR WhatsApp / SMS / Notification messages
 */
export const NotificationTemplateGenerators = {
  // 1. تجديد ترخيص وزارة الصحة أو الإقامة أو البطاقة المدنية
  renewalSuccess: (params: {
    employee: Employee;
    docType: 'MOH_LICENSE' | 'RESIDENCY' | 'CIVIL_ID';
    newExpiryDate: string;
    companyNameAr: string;
  }): { title: string; message: string } => {
    const docName = 
      params.docType === 'MOH_LICENSE' ? 'ترخيص مزاولة المهنة بوزارة الصحة (MOH)' :
      params.docType === 'CIVIL_ID' ? 'البطاقة المدنية (PACI)' : 'الإقامة الرسمية (شؤون الإقامة - مادة 18)';

    const title = `تجديد ${docName}`;
    const message = `عزيزي الموظف/ة ${params.employee.fullNameAr}،
تحية طيبة وبعد،
نحيطكم علماً بأنه قد تم بنجاح تجديد [${docName}] الخاصة بكم لدى شركة ${params.companyNameAr} حتى تاريخ [${params.newExpiryDate}].
يرجى مراجعة إدارة الموارد البشرية لاستلام النسخة الأصلية أو تحميلها عبر النظام.
مع تحيات الشؤون الإدارية 🏢`;

    return { title, message };
  },

  // 2. اعتماد الإجازة ومستحقاتها
  leaveApproved: (params: {
    employee: Employee;
    leave: LeaveRequest;
    remainingDays: number;
    returnDate: string;
    companyNameAr: string;
  }): { title: string; message: string } => {
    const title = 'اعتماد طلب الإجازة الرسمية';
    const message = `عزيزي الموظف/ة ${params.employee.fullNameAr}،
تم بنجاح اعتماد طلب إجازتك (${params.leave.leaveType === 'ANNUAL' ? 'إجازة سنوية' : 'إجازة رسمية'}) لدى شركة ${params.companyNameAr}:
📅 من تاريخ: ${params.leave.startDate}
📅 إلى تاريخ: ${params.leave.endDate} (إجمالي ${params.leave.totalDays} يوم)
🏖️ رصيدك المتبقي من الإجازات: [${params.remainingDays}] يوم.
🏢 موعد ومباشرة العمل الرسمية: [${params.returnDate}].
نتمنى لكم إجازة سعيدة وموفقة! 🌴`;

    return { title, message };
  },

  // 3. استدعاء مراجعة الإدارة (Action Required)
  actionRequired: (params: {
    employee: Employee;
    reason: string;
    deadline?: string;
    locationNote?: string;
    companyNameAr: string;
  }): { title: string; message: string } => {
    const title = 'استدعاء لمراجعة الإدارة (مهم وعاجل)';
    const deadlineText = params.deadline ? `\n⏳ الموعد المحدد: قبل تاريخ ${params.deadline}` : '';
    const locText = params.locationNote ? `\n📍 المكان: ${params.locationNote}` : '\n📍 المكان: مكتب الشؤون الإدارية والموارد البشرية';

    const message = `عزيزي الموظف/ة ${params.employee.fullNameAr}،
يرجى التكرم بمراجعة إدارة الموارد البشرية والشؤون الإدارية بشركة ${params.companyNameAr}.
📌 السبب والبيان المطلوب: [${params.reason}]${deadlineText}${locText}
شاكرين لكم حسن تعاونكم الدائم.`;

    return { title, message };
  },

  // 4. كشف الراتب الشهري (Salary Notification)
  salaryNotification: (params: {
    employee: Employee;
    payslip: Payslip;
    month: string;
    companyNameAr: string;
  }): { title: string; message: string } => {
    const title = `كشف الراتب الشهري (${params.month})`;
    const maskedIban = params.employee.iban 
      ? `****${params.employee.iban.slice(-4)} (${params.employee.bankName || 'البنك المعتمد'})`
      : 'الحساب البنكي المعتمد';

    const message = `عزيزي الموظف/ة ${params.employee.fullNameAr}،
نود إبلاغكم بأنه تم اعتماد وإيداع مسير الرواتب لشهر [${params.month}] لدى شركة ${params.companyNameAr}.
💵 صافي الراتب المستحق: [${formatKWD(params.payslip.netSalary)}]
🏦 الحساب المحول عليه: [${maskedIban}]
يمكنكم مراجعة تفاصيل كشف الراتب والبدلات والاستقطاعات عبر بوابة الموظف.`;

    return { title, message };
  },

  // 5. رسالة مخصصة سريعة
  directMessage: (params: {
    employee: Employee;
    title: string;
    customBody: string;
    companyNameAr: string;
  }): { title: string; message: string } => {
    const title = params.title || 'إشعار إداري من الموارد البشرية';
    const message = `عزيزي الموظف/ة ${params.employee.fullNameAr}،
${params.customBody}

مع تحيات إدارة الموارد البشرية - ${params.companyNameAr}`;

    return { title, message };
  }
};

/**
 * Helper to generate WhatsApp Web direct send link
 */
export function generateWhatsAppLink(phoneNumber: string, messageText: string): string {
  let cleanPhone = (phoneNumber || '').replace(/[^\d]/g, '');
  if (cleanPhone.startsWith('00')) {
    cleanPhone = cleanPhone.substring(2);
  }
  if (cleanPhone.length === 8) {
    cleanPhone = '965' + cleanPhone;
  }
  const encodedText = encodeURIComponent(messageText);
  return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
}
