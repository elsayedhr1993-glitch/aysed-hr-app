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
