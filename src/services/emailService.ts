// src/services/emailService.ts
import nodemailer from 'nodemailer';

// إعداد خادم الإرسال (Gmail SMTP أو خادم الشركة)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_GMAIL_USER || process.env.SMTP_USER || 'elsayedhr1993@gmail.com', // إيميل النظام
    pass: process.env.SMTP_GMAIL_APP_PASSWORD || process.env.SMTP_PASS || '', // App Password من جوجل
  },
});

export interface WelcomeEmailParams {
  subscriberEmail: string;
  subscriberName: string;
  companyName: string;
}

export interface AdminSubscriptionNotificationParams {
  requesterName: string;
  companyName: string;
  email: string;
  phone: string;
  empCount: string;
  planType: string;
}

/**
 * إرسال إشعار فوري للأدمن / المالك بطلب اشتراك جديد
 */
export async function sendAdminNewSubscriptionNotification({
  requesterName,
  companyName,
  email,
  phone,
  empCount,
  planType,
}: AdminSubscriptionNotificationParams): Promise<{ success: boolean; error?: string }> {
  const adminEmail = 'elsayedhr1993@gmail.com';
  const sectorName = planType === 'medical' ? 'القطاع الطبي / عيادات ومراكز' : 'القطاع الإداري والتجاري';
  const dateStr = new Date().toLocaleString('ar-KW', { timeZone: 'Asia/Kuwait' });

  const mailBody = `
    <div style="direction: rtl; text-align: right; font-family: 'Tajawal', Arial, sans-serif; padding: 20px; background-color: #f1f5f9;">
      <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
        <div style="background-color: #714B67; padding: 25px 20px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 20px; font-weight: bold;">🔔 طلب اشتراك جديد لمنشأة (SaaS Tenant Request)</h1>
          <p style="margin-top: 6px; opacity: 0.9; font-size: 13px;">منظومة Aysed S HR 2026 - لوحة الإدارة العليا</p>
        </div>

        <div style="padding: 25px; color: #1e293b; line-height: 1.8; font-size: 14px;">
          <p style="font-size: 15px; font-weight: bold; color: #714B67;">عزيزي الأستاذ السيد (Super Admin)،</p>
          <p>تم تسجيل طلب اشتراك جديد عبر بوابة الدخول والتسجيل. فيما يلي تفاصيل المنشأة والمشترك:</p>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
            <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px; font-weight: bold; width: 35%; color: #475569;">اسم المنشأة / الشركة:</td>
              <td style="padding: 10px; font-weight: bold; color: #0f172a;">${companyName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px; font-weight: bold; color: #475569;">اسم المسؤول المتقدم:</td>
              <td style="padding: 10px; color: #0f172a;">${requesterName}</td>
            </tr>
            <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px; font-weight: bold; color: #475569;">رقم الهاتف / الواتساب:</td>
              <td style="padding: 10px; color: #0f172a; direction: ltr; text-align: right;"><a href="tel:${phone}" style="color: #0284c7; text-decoration: none; font-weight: bold;">${phone}</a></td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px; font-weight: bold; color: #475569;">البريد الإلكتروني:</td>
              <td style="padding: 10px; color: #0f172a;"><a href="mailto:${email}" style="color: #0284c7; text-decoration: none;">${email}</a></td>
            </tr>
            <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px; font-weight: bold; color: #475569;">نوع القطاع:</td>
              <td style="padding: 10px; color: #0f172a;">${sectorName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px; font-weight: bold; color: #475569;">عدد الموظفين المتوقع:</td>
              <td style="padding: 10px; color: #0f172a;">${empCount} موظف</td>
            </tr>
            <tr style="background-color: #f8fafc;">
              <td style="padding: 10px; font-weight: bold; color: #475569;">توقيت الطلب:</td>
              <td style="padding: 10px; color: #64748b;">${dateStr}</td>
            </tr>
          </table>

          <div style="background-color: #f0fdf4; border-right: 4px solid #16a34a; padding: 12px 16px; border-radius: 6px; margin-top: 15px;">
            <p style="margin: 0; font-size: 13px; color: #166534; font-weight: 600;">
              ✅ تم تسجيل الطلب بنجاح في قاعدة البيانات وهو جاهز الآن للمراجعة والتفعيل في لوحة الإدارة العليا (Super Admin Dashboard).
            </p>
          </div>
        </div>
      </div>
    </div>
  `;

  try {
    const userEmail = process.env.SMTP_GMAIL_USER || process.env.SMTP_USER || 'elsayedhr1993@gmail.com';
    await transporter.sendMail({
      from: `"Aysed S HR System" <${userEmail}>`,
      to: adminEmail,
      subject: `🔔 طلب اشتراك جديد: ${companyName} (${requesterName})`,
      html: mailBody,
    });
    return { success: true };
  } catch (error: any) {
    console.error('فشل إرسال إشعار الإدارة:', error);
    return { success: false, error: error.message };
  }
}

/**
 * دالة إنشاء قالب HTML الفاخر وإرسال إيميل الترحيب آلياً
 */
export async function sendWelcomeEmail({
  subscriberEmail,
  subscriberName,
  companyName,
}: WelcomeEmailParams): Promise<{ success: boolean; error?: string }> {
  const mailBody = `
    <div style="direction: rtl; text-align: right; font-family: 'Tajawal', Arial, sans-serif; padding: 20px; background-color: #f8f9fa;">
        <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #eaeaea;">
            
            <!-- الترويسة -->
            <div style="background-color: #71639e; padding: 35px 20px; text-align: center; color: #ffffff;">
                <h1 style="margin: 0; font-size: 22px; font-weight: bold;">مرحباً بك في مستقبل الموارد البشرية</h1>
                <p style="margin-top: 8px; opacity: 0.9; font-size: 14px;">Aysed S HR 2026 - Kuwait</p>
            </div>

            <!-- المحتوى -->
            <div style="padding: 30px; color: #333333; line-height: 1.8; font-size: 14px;">
                <h2 style="color: #71639e; font-size: 18px; margin-top: 0;">السيد/ ${subscriberName} المحترم،</h2>
                <p>لقد استلمنا ببالغ السرور طلب انضمام شركة <strong>( ${companyName} )</strong> إلى منظومتنا السحابية المتطورة.</p>

                <p>نظام <strong>Aysed S HR</strong> صُمم ليكون شريكك الإداري والقانوني المتكامل والمتوافق تماماً مع أحكام قانون العمل الكويتي (المادتين 51 و70).</p>

                <div style="background-color: #f7f6fb; padding: 20px; border-radius: 8px; margin: 25px 0; border-right: 4px solid #008784;">
                    <h3 style="margin-top: 0; font-size: 15px; color: #008784;">🚀 ماذا ينتظرك في نسختك التجريبية؟</h3>
                    <ul style="margin: 0; padding-right: 20px; color: #555555;">
                        <li style="margin-bottom: 6px;"><strong>درع المخاطر:</strong> متابعة الإقامات والجوازات وتراخيص المنشأة تلقائياً.</li>
                        <li style="margin-bottom: 6px;"><strong>المندوب الذكي:</strong> إدارة المستندات وتنبيهات العقود.</li>
                        <li style="margin-bottom: 6px;"><strong>البصمة والحضور:</strong> تتبع الدوام والورديات بالـ QR والموقع الجغرافي.</li>
                        <li style="margin-bottom: 0;"><strong>الأتمتة المالية:</strong> احتساب الرواتب والتسويات بقاعدة 26 يوم عمل.</li>
                    </ul>
                </div>

                <p>يقوم فريقنا حالياً بتهيئة مساحة العمل الخاصة بمنشأتكم، وسيتواصل معك <strong>المدير العام (السيد)</strong> لتزويدك ببيانات الدخول وتفعيل الحساب خلال الساعات القادمة.</p>

                <div style="text-align: center; margin-top: 35px; margin-bottom: 10px;">
                    <a href="https://ais-dev-mwghgnpjjr2xqufoinwqle-554243377583.europe-west2.run.app" style="background-color: #008784; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 14px;">تصفح مميزات النظام</a>
                </div>
            </div>

            <!-- التذييل -->
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 11px; color: #888888; border-top: 1px solid #eeeeee;">
                <p style="margin: 0 0 5px 0;">تم إرسال هذا البريد تلقائياً من خادم نظام Aysed S HR 2026 الرسمي</p>
                <p style="margin: 0;">&copy; 2026 Aysed Technologies - Kuwait Branch</p>
            </div>
        </div>
    </div>
  `;

  try {
    const userEmail = process.env.SMTP_GMAIL_USER || process.env.SMTP_USER || 'elsayedhr1993@gmail.com';
    await transporter.sendMail({
      from: `"Aysed S HR 2026" <${userEmail}>`,
      to: subscriberEmail,
      subject: `مرحباً بك في Aysed S HR 2026 - طلب ${companyName}`,
      html: mailBody,
    });
    return { success: true };
  } catch (error: any) {
    console.error('فشل إرسال الإيميل:', error);
    return { success: false, error: error.message };
  }
}
