// src/services/emailService.ts
import nodemailer from 'nodemailer';
import zlib from 'zlib';
import crypto from 'crypto';

// إعداد خادم الإرسال (Gmail SMTP أو خادم الشركة)
export function getMailTransporter() {
  const user = process.env.SMTP_GMAIL_USER || process.env.SMTP_USER || 'elsayedhr1993@gmail.com';
  const pass = process.env.SMTP_GMAIL_APP_PASSWORD || process.env.SMTP_PASS || '';

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user,
      pass,
    },
  });
}

const transporter = getMailTransporter();

export function getSystemDefaultEmail(): string {
  return process.env.SMTP_GMAIL_USER || process.env.SMTP_USER || 'elsayedhr1993@gmail.com';
}

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

export interface BackupMetadata {
  backupId: string;
  timestamp: string;
  dateStr: string;
  durationMs: number;
  environment: string;
  totalCollections: number;
  totalRecords: number;
  uncompressedSizeBytes: number;
  compressedSizeBytes: number;
  sha256Checksum: string;
  collectionStats: Record<string, number>;
  databaseName?: string;
}

export interface SendBackupSuccessParams {
  metadata: BackupMetadata;
  dumpPayloadJson: string | object;
  compressedBuffer?: Buffer;
  recipientEmail?: string;
}

export interface SendBackupFailureParams {
  error: string;
  errorStack?: string;
  failedStep?: string;
  timestamp?: string;
  recipientEmail?: string;
}

/**
 * إرسال تقرير النسخ الاحتياطي التلقائي اليومي مع إرفاق ملف قاعدة البيانات المضغوط (DB Dump File)
 * يتم الإرسال من وإلى نفس إيميل النظام المعتمد في المتغيرات البيئية
 */
export async function sendDailyBackupSuccessEmail({
  metadata,
  dumpPayloadJson,
  compressedBuffer,
  recipientEmail,
}: SendBackupSuccessParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const systemEmail = recipientEmail || getSystemDefaultEmail();
  const jsonString = typeof dumpPayloadJson === 'string' ? dumpPayloadJson : JSON.stringify(dumpPayloadJson, null, 2);
  
  // Create compressed gzip buffer if not provided
  const fileBuffer = compressedBuffer || zlib.gzipSync(Buffer.from(jsonString, 'utf-8'));
  const filename = `aysed_hr_db_dump_${metadata.dateStr.replace(/[^0-9]/g, '_')}_${metadata.backupId}.json.gz`;

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formattedUncompressed = formatBytes(metadata.uncompressedSizeBytes || Buffer.byteLength(jsonString));
  const formattedCompressed = formatBytes(metadata.compressedSizeBytes || fileBuffer.length);
  const executionSecs = (metadata.durationMs / 1000).toFixed(2);

  // Generate collection breakdown table rows
  const collectionRows = Object.entries(metadata.collectionStats || {})
    .map(([colName, count]) => {
      const arabicNames: Record<string, string> = {
        companies: 'الشركات والمنشآت (Companies/Tenants)',
        employees: 'سجلات الموظفين (Employees)',
        contracts: 'عقود العمل وهيكل الرواتب (Contracts)',
        leaves: 'طلبات وحركات الإجازات (Leaves)',
        leave_allocations: 'أرصدة وتخصيصات الإجازات (Allocations)',
        leave_settlements: 'تسويات وصرف الإجازات (Settlements)',
        attendance: 'سجلات الحضور والبصمة (Attendance)',
        zkteco_punches: 'بصمات ZKTeco اللحظية (Biometric Punches)',
        payslips: 'كشوف ومسيرات الرواتب (Payslips)',
        payroll_runs: 'مسيرات الرواتب الشهرية (Payroll Runs)',
        custody_loans: 'العهد والسلف المالية (Custody/Loans)',
        daily_movements: 'الحركات الإدارية اليومية (Daily Movements)',
        commencements: 'إقرارات مباشرة العمل (Commencements)',
        documents: 'الأرشيف والمستندات الرقمية (Documents)',
        res_config_settings: 'إعدادات النظام والبارامترات (System Settings)',
        audit_logs: 'سجل العمليات والتدقيق (Audit Logs)',
        users: 'حسابات ومستخدمو النظام (System Users)',
        subscriptions: 'طلبات الاشتراك والمنشآت (Subscriptions)',
      };
      const label = arabicNames[colName] || colName;
      return `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 12px; font-weight: 600; color: #334155;">${label}</td>
          <td style="padding: 8px 12px; text-align: left; font-weight: bold; color: #0f172a; font-family: monospace;">${count.toLocaleString('ar-KW')} سجل</td>
        </tr>
      `;
    })
    .join('');

  const htmlBody = `
    <div style="direction: rtl; text-align: right; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif, Arial; padding: 24px; background-color: #f1f5f9; line-height: 1.6;">
      <div style="max-width: 680px; margin: auto; background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #714B67 0%, #4a2f43 100%); padding: 30px 24px; text-align: center; color: #ffffff;">
          <div style="display: inline-block; background-color: #10b981; color: #ffffff; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-bottom: 10px; letter-spacing: 0.5px;">
            ✅ تقرير النسخ التلقائي الناجح (Daily Automated Backup)
          </div>
          <h1 style="margin: 0; font-size: 22px; font-weight: 800;">Aysed S HR 2026 - نظام الموارد البشرية الكويتي</h1>
          <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 13px;">نسخة قاعدة البيانات اليومية الكاملة والمضغوطة (DB Dump File Attached)</p>
        </div>

        <!-- Body Content -->
        <div style="padding: 28px; color: #1e293b; font-size: 14px;">
          <p style="font-size: 15px; font-weight: bold; color: #0f172a; margin-top: 0;">
            تحية طيبة،<br/>
            تم بنجاح أخذ النسخة الاحتياطية الشاملة لقاعدة بيانات النظام وتوليد ملف التفريغ الكامل المضغوط (Compressed Database Dump) وإرفاقه طيه بشكل آلي صامت.
          </p>

          <!-- KPI Grid -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 20px 0;">
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; text-align: center;">
              <div style="font-size: 11px; color: #64748b; font-weight: bold; text-transform: uppercase;">إجمالي السجلات المحفوظة</div>
              <div style="font-size: 20px; font-weight: 800; color: #714B67; margin-top: 4px;">${metadata.totalRecords.toLocaleString('ar-KW')}</div>
            </div>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; text-align: center;">
              <div style="font-size: 11px; color: #64748b; font-weight: bold; text-transform: uppercase;">حجم الملف المضغوط (GZIP)</div>
              <div style="font-size: 20px; font-weight: 800; color: #059669; margin-top: 4px;">${formattedCompressed}</div>
            </div>
          </div>

          <!-- Metadata Table -->
          <h3 style="font-size: 15px; color: #334155; margin: 24px 0 12px 0; border-bottom: 2px solid #f1f5f9; padding-bottom: 6px;">
            📋 تفاصيل وبيانات النسخة الاحتياطية (Backup Specifications)
          </h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
            <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 12px; font-weight: bold; width: 35%; color: #475569;">معرف النسخة (Backup ID):</td>
              <td style="padding: 10px 12px; color: #0f172a; font-family: monospace;">${metadata.backupId}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 12px; font-weight: bold; color: #475569;">توقيت الإجراء:</td>
              <td style="padding: 10px 12px; color: #0f172a;">${metadata.timestamp} (توقيت الكويت الرسمي)</td>
            </tr>
            <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 12px; font-weight: bold; color: #475569;">مدة المعالجة والضغط:</td>
              <td style="padding: 10px 12px; color: #0f172a;">${executionSecs} ثانية</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 12px; font-weight: bold; color: #475569;">الحجم قبل الضغط:</td>
              <td style="padding: 10px 12px; color: #0f172a;">${formattedUncompressed}</td>
            </tr>
            <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 12px; font-weight: bold; color: #475569;">اسم الملف المرفق:</td>
              <td style="padding: 10px 12px; color: #0284c7; font-family: monospace; font-weight: bold;">${filename}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 12px; font-weight: bold; color: #475569;">بصمة التشفير (SHA-256):</td>
              <td style="padding: 10px 12px; color: #64748b; font-family: monospace; font-size: 11px; word-break: break-all;">${metadata.sha256Checksum}</td>
            </tr>
            <tr style="background-color: #f8fafc;">
              <td style="padding: 10px 12px; font-weight: bold; color: #475569;">البريد المرسل / المستلم:</td>
              <td style="padding: 10px 12px; color: #714B67; font-weight: bold;">${systemEmail} (System Default Email)</td>
            </tr>
          </table>

          <!-- Collections Breakdown -->
          <h3 style="font-size: 15px; color: #334155; margin: 24px 0 12px 0; border-bottom: 2px solid #f1f5f9; padding-bottom: 6px;">
            📊 إحصائيات الجداول والمجموعات المحفوظة (${metadata.totalCollections} جداول)
          </h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <thead>
              <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1; text-align: right;">
                <th style="padding: 10px 12px; color: #475569;">المجموعة / الجدول</th>
                <th style="padding: 10px 12px; color: #475569; text-align: left;">عدد السجلات</th>
              </tr>
            </thead>
            <tbody>
              ${collectionRows}
            </tbody>
          </table>

          <!-- Attachment Notice Box -->
          <div style="background-color: #ecfdf5; border-right: 4px solid #10b981; padding: 14px 18px; border-radius: 8px; margin-top: 20px;">
            <p style="margin: 0; font-size: 13px; color: #065f46; font-weight: 600;">
              📦 <strong>الملف المرفق:</strong> تم إرفاق ملف النسخة الاحتياطية المضغوط (<code style="background-color: #d1fae5; padding: 2px 6px; border-radius: 4px;">${filename}</code>) بهذه الرسالة. يمكنك حفظه أو استيراده في أي وقت لاستعادة قاعدة البيانات بالكامل.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 18px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0 0 4px 0;">تم إرسال هذا التقرير آلياً بواسطة محرك النسخ الاحتياطي التلقائي لنظام Aysed S HR 2026</p>
          <p style="margin: 0; font-weight: 600;">&copy; 2026 Aysed Technologies - دولة الكويت</p>
        </div>
      </div>
    </div>
  `;

  try {
    const mailTransporter = getMailTransporter();
    const info = await mailTransporter.sendMail({
      from: `"Aysed S HR Backup Engine" <${systemEmail}>`,
      to: systemEmail,
      subject: `✅ [تقرير النسخ الاحتياطي اليومي] - نجاح أخذ نسخة قاعدة البيانات (${metadata.dateStr})`,
      html: htmlBody,
      attachments: [
        {
          filename,
          content: fileBuffer,
          contentType: 'application/gzip',
        },
      ],
      headers: {
        'X-Priority': '1 (Highest)',
        'X-MSMail-Priority': 'High',
        'Importance': 'High',
      },
    });

    console.log(`[Backup Email] Success report and dump file sent to ${systemEmail}, messageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('[Backup Email Error] Failed to send backup email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * إرسال تنبيه عاجل لنفس إيميل النظام المعتمد فوراً في حالة تعذر أخذ النسخة الاحتياطية لأي سبب تقني
 */
export async function sendDailyBackupFailureAlert({
  error,
  errorStack,
  failedStep,
  timestamp,
  recipientEmail,
}: SendBackupFailureParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const systemEmail = recipientEmail || getSystemDefaultEmail();
  const timeNow = timestamp || new Date().toLocaleString('ar-KW', { timeZone: 'Asia/Kuwait' });
  const dateShort = new Date().toISOString().split('T')[0];

  const htmlBody = `
    <div style="direction: rtl; text-align: right; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif, Arial; padding: 24px; background-color: #fef2f2; line-height: 1.6;">
      <div style="max-width: 680px; margin: auto; background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 10px 25px rgba(239, 68, 68, 0.15); border: 2px solid #ef4444;">
        
        <!-- Urgent Red Header -->
        <div style="background: linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%); padding: 30px 24px; text-align: center; color: #ffffff;">
          <div style="display: inline-block; background-color: #ffffff; color: #b91c1c; padding: 4px 16px; border-radius: 20px; font-size: 13px; font-weight: 900; margin-bottom: 10px; letter-spacing: 0.5px; text-transform: uppercase;">
            🚨 تنبيه عاجل وحرج (Urgent Technical Alert)
          </div>
          <h1 style="margin: 0; font-size: 22px; font-weight: 800;">فشل محرك النسخ الاحتياطي التلقائي اليومي</h1>
          <p style="margin: 8px 0 0 0; opacity: 0.95; font-size: 13px;">Aysed S HR 2026 - نظام إدارة الموارد البشرية</p>
        </div>

        <!-- Body -->
        <div style="padding: 28px; color: #1e293b; font-size: 14px;">
          <div style="background-color: #fef2f2; border-right: 4px solid #dc2626; padding: 14px 18px; border-radius: 8px; margin-bottom: 22px;">
            <p style="margin: 0; font-size: 14px; color: #991b1b; font-weight: bold;">
              ⚠️ تحذير: تعذر إتمام عملية النسخ الاحتياطي التلقائي لقاعدة البيانات في الموعد المحدد بسبب خطأ تقني.
            </p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 22px; font-size: 13px;">
            <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 12px; font-weight: bold; width: 35%; color: #475569;">توقيت محاولة النسخ:</td>
              <td style="padding: 10px 12px; color: #0f172a;">${timeNow}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 12px; font-weight: bold; color: #475569;">المرحلة المتعثرة:</td>
              <td style="padding: 10px 12px; color: #dc2626; font-weight: bold;">${failedStep || 'استخراج وضغط بيانات المجموعات'}</td>
            </tr>
            <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 12px; font-weight: bold; color: #475569;">البريد الإلكتروني المعتمد:</td>
              <td style="padding: 10px 12px; color: #714B67; font-weight: bold;">${systemEmail}</td>
            </tr>
          </table>

          <h3 style="font-size: 15px; color: #991b1b; margin: 20px 0 10px 0;">
            🔍 نص رسالة الخطأ التقني (Error Message):
          </h3>
          <div style="background-color: #1e293b; color: #f87171; padding: 14px 18px; border-radius: 8px; font-family: monospace; font-size: 13px; line-height: 1.5; overflow-x: auto; white-space: pre-wrap; direction: ltr; text-align: left;">
${error || 'Unknown technical failure during dump generation'}
          </div>

          ${errorStack ? `
            <details style="margin-top: 14px; font-size: 12px; color: #64748b;">
              <summary style="cursor: pointer; font-weight: bold; color: #475569;">عرض التفاصيل البرمجية الكاملة (Stack Trace)</summary>
              <pre style="background-color: #f1f5f9; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 11px; overflow-x: auto; margin-top: 8px; direction: ltr; text-align: left;">${errorStack}</pre>
            </details>
          ` : ''}

          <div style="margin-top: 24px; padding: 16px; background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px;">
            <h4 style="margin: 0 0 8px 0; color: #92400e; font-size: 14px;">💡 الإجراءات الفورية الموصى بها:</h4>
            <ul style="margin: 0; padding-right: 20px; color: #78350f; font-size: 13px; line-height: 1.7;">
              <li>التحقق من اتصال خادم قاعدة البيانات وتصاريح القراءة والكتابة.</li>
              <li>التأكد من توفر مساحة تخزين كافية على الخادم أو اتصال الإنترنت.</li>
              <li>تشغيل عملية النسخ يدوياً عبر لوحة الإدارة (Settings > Backup Engine) للتحقق من زوال العطل.</li>
            </ul>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 16px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0 0 4px 0;">تنبيه نظام تلقائي فوري من مراقب النزاهة والنسخ الاحتياطي</p>
          <p style="margin: 0; font-weight: 600;">&copy; 2026 Aysed Technologies</p>
        </div>
      </div>
    </div>
  `;

  try {
    const mailTransporter = getMailTransporter();
    const info = await mailTransporter.sendMail({
      from: `"Aysed S HR System Alert" <${systemEmail}>`,
      to: systemEmail,
      subject: `🚨 [تنبيه عاجل] - فشل أخذ النسخة الاحتياطية لقاعدة البيانات (${dateShort})`,
      html: htmlBody,
      headers: {
        'X-Priority': '1 (Highest)',
        'X-MSMail-Priority': 'High',
        'Importance': 'High',
      },
    });

    console.log(`[Backup Alert Email] Urgent failure alert sent to ${systemEmail}, messageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error('[Backup Alert Email Error] Failed to send failure alert email:', err);
    return { success: false, error: err.message };
  }
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
  const adminEmail = getSystemDefaultEmail();
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
    const userEmail = getSystemDefaultEmail();
    const mailTransporter = getMailTransporter();
    await mailTransporter.sendMail({
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
    const userEmail = getSystemDefaultEmail();
    const mailTransporter = getMailTransporter();
    await mailTransporter.sendMail({
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

