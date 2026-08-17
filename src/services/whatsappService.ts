import { WhatsAppGatewayConfig } from '../types';

export interface SendMessageResponse {
  sent: boolean;
  message: string;
  id?: number | string;
  directUrl?: string;
  errorCode?: string;
}

/**
 * تنظيف وتنسيق رقم الهاتف الكويتي والدولي
 */
export const formatPhoneNumber = (phone: string): string => {
  if (!phone) return '';
  let clean = phone.replace(/[^0-9]/g, '');
  if (clean.startsWith('00')) {
    clean = clean.substring(2);
  }
  // إذا كان الرقم 8 أرقام (رقم كويتي بدون مفتاح الدولة) يتم إضافة 965 تلقائياً
  if (clean.length === 8) {
    clean = '965' + clean;
  }
  return clean;
};

/**
 * توليد رابط مباشر لفتح واتساب ويب أو التطبيق
 */
export const getWhatsAppDirectUrl = (phone: string, text: string): string => {
  const cleanPhone = formatPhoneNumber(phone);
  const encodedText = encodeURIComponent(text);
  return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
};

/**
 * جلب إعدادات بوابة الواتساب المخزنة للشركة الحالية
 */
export const getStoredWhatsAppConfig = (companyId?: string): Partial<WhatsAppGatewayConfig> => {
  const compId = companyId || 'comp-1';
  try {
    const saved = localStorage.getItem(`whatsapp_gateway_${compId}`);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Error reading whatsapp gateway config:', e);
  }

  return {
    instanceId: (import.meta as any).env?.VITE_ULTRAMSG_INSTANCE_ID || 'instance188430',
    apiToken: (import.meta as any).env?.VITE_ULTRAMSG_TOKEN || 'mh21qnlb8vngnkml',
    serverUrl: 'https://api.ultramsg.com/instance188430/messages/chat',
    isActive: true,
    defaultCountryCode: '+965'
  };
};

/**
 * إرسال رسالة نصية حقيقية عبر UltraMsg API أو خادم النظام
 */
export const sendWhatsAppMessage = async (
  to: string, 
  body: string, 
  companyId?: string
): Promise<SendMessageResponse> => {
  const formattedPhone = formatPhoneNumber(to);
  const directUrl = getWhatsAppDirectUrl(to, body);
  
  if (!formattedPhone || formattedPhone.length < 8) {
    return { 
      sent: false, 
      message: 'رقم الهاتف غير صالح أو غير مكتمل (يرجى التأكد من الرقم وكود الدولة)',
      directUrl,
      errorCode: 'INVALID_PHONE'
    };
  }

  const config = getStoredWhatsAppConfig(companyId);
  const effectiveToken = config.apiToken || 'mh21qnlb8vngnkml';
  const effectiveInstance = config.instanceId || 'instance188430';

  // 1. محاولة الإرسال أولاً عبر مسار الخادم الخلفي /api/send-whatsapp لتجنب مشاكل CORS
  try {
    const serverRes = await fetch('/api/send-whatsapp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instanceId: effectiveInstance,
        apiToken: effectiveToken,
        serverUrl: config.serverUrl,
        to: formattedPhone,
        body: body,
      }),
    });

    const serverData = await serverRes.json().catch(() => ({}));

    if (serverRes.ok && serverData.success) {
      return { 
        sent: true, 
        message: 'تم إرسال الرسالة بنجاح عبر بوابة الواتساب', 
        id: serverData.messageId || serverData.data?.id,
        directUrl 
      };
    } else if (serverData.error) {
      console.warn('[WhatsApp Gateway Notice]:', serverData.error);
    }
  } catch (serverErr) {
    console.warn('[WhatsApp Server Route Error]:', serverErr);
  }

  // 2. محاولة بديلة: الإرسال المباشر لـ UltraMsg من المتصفح
  const targetBaseUrl = config.serverUrl && config.serverUrl.includes('ultramsg.com')
    ? config.serverUrl.replace(/\/+$/, '')
    : `https://api.ultramsg.com/${effectiveInstance}`;

  const params = new URLSearchParams();
  params.append('token', effectiveToken);
  params.append('to', formattedPhone);
  params.append('body', body);

  try {
    const endpoint = targetBaseUrl.endsWith('/messages/chat') ? targetBaseUrl : `${targetBaseUrl}/messages/chat`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await response.json().catch(() => ({}));
    if (data.sent === 'true' || data.sent === true || data.id) {
      return { 
        sent: true, 
        message: 'تم إرسال الرسالة بنجاح', 
        id: data.id,
        directUrl
      };
    } else {
      return { 
        sent: false, 
        message: data.message || data.error || 'بوابة الواتساب السحابية غير متصلة برقم الشركة حالياً',
        directUrl,
        errorCode: 'GATEWAY_ERROR'
      };
    }
  } catch (error: any) {
    return { 
      sent: false, 
      message: 'تعذر الاتصال المباشر ببوابة الواتساب السحابية',
      directUrl,
      errorCode: 'NETWORK_ERROR'
    };
  }
};

