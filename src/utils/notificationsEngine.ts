import { Employee, DocumentItem, AttendanceRecord, ActiveApp } from '../types';

export interface SystemNotification {
  id: string;
  type: 'CIVIL_ID' | 'PASSPORT' | 'RESIDENCY' | 'MOH_LICENSE' | 'PROBATION' | 'ABSENCE' | 'TARDINESS' | 'DOCUMENT';
  severity: 'CRITICAL' | 'WARNING' | 'INFO'; // CRITICAL = Red 🔴, WARNING = Orange/Amber 🟠
  title: string;
  description: string;
  employeeId?: string;
  employeeName?: string;
  documentId?: string;
  dateOrDaysLeft?: string;
  daysRemaining?: number;
  category: 'EXPIRATION' | 'ATTENDANCE' | 'PROBATION' | 'OTHER';
  actionApp: ActiveApp;
  isRead?: boolean;
}

export function generateSmartNotifications(
  employees: Employee[],
  documents: DocumentItem[],
  attendance: AttendanceRecord[],
  activeCompanyId: string
): SystemNotification[] {
  const notifications: SystemNotification[] = [];
  const today = new Date();
  today.setHours(0, 0, 0,);

  const getDaysDiff = (dateStr: string) => {
    if (!dateStr) return 999;
    const target = new Date(dateStr);
    if (isNaN(target.getTime())) return 999;
    target.setHours(0, 0, 0,);
    const diff = target.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const companyEmps = (employees || []).filter(e => e.companyId === activeCompanyId && e.status === 'ACTIVE');

  // 1. Civil ID Expiration & Residency (بطاقات مدنية وإقامات)
  companyEmps.forEach(emp => {
    if (emp.civilIdExpiry) {
      const days = getDaysDiff(emp.civilIdExpiry);
      if (days <= 60) {
        const isExpired = days <= 0;
        const isCritical = days <= 30;
        notifications.push({
          id: `notif-civil-${emp.id}`,
          type: 'CIVIL_ID',
          severity: isCritical ? 'CRITICAL' : 'WARNING',
          title: isExpired
            ? `🚨 بطاقة مدنية / إقامة منتهية: ${emp.fullNameAr}`
            : `⚠️ اقتراب انتهاء البطاقة المدنية والإقامة: ${emp.fullNameAr}`,
          description: `الرقم المدني (${emp.civilId || 'غير مدخل'}) - المتبقي: ${isExpired ? 'منتهية بالفعل!' : `${days} يوم (${emp.civilIdExpiry})`}`,
          employeeId: emp.id,
          employeeName: emp.fullNameAr,
          daysRemaining: days,
          category: 'EXPIRATION',
          actionApp: 'EMPLOYEES',
        });
      }
    }

    // 2. Passports Expiration (جوازات السفر)
    if (emp.passportExpiry) {
      const days = getDaysDiff(emp.passportExpiry);
      if (days <= 60) {
        const isExpired = days <= 0;
        const isCritical = days <= 30;
        notifications.push({
          id: `notif-pass-${emp.id}`,
          type: 'PASSPORT',
          severity: isCritical ? 'CRITICAL' : 'WARNING',
          title: isExpired
            ? `🚨 جواز سفر منتهي: ${emp.fullNameAr}`
            : `⚠️ اقتراب انتهاء جواز السفر: ${emp.fullNameAr}`,
          description: `رقم الجواز (${emp.passportNo || 'غير مدخل'}) - المتبقي: ${isExpired ? 'منتهي بالفعل!' : `${days} يوم (${emp.passportExpiry})`}`,
          employeeId: emp.id,
          employeeName: emp.fullNameAr,
          daysRemaining: days,
          category: 'EXPIRATION',
          actionApp: 'EMPLOYEES',
        });
      }
    }

    // 3. MOH Licenses Expiration (ترخيص وزارة الصحة)
    if (emp.mohLicenseExpiry || emp.mohLicenseNo) {
      const expiryDate = emp.mohLicenseExpiry || '2026-10-01';
      const days = getDaysDiff(expiryDate);
      if (days <= 60) {
        const isExpired = days <= 0;
        const isCritical = days <= 30;
        notifications.push({
          id: `notif-moh-${emp.id}`,
          type: 'MOH_LICENSE',
          severity: isCritical ? 'CRITICAL' : 'WARNING',
          title: isExpired
            ? `🚨 ترخيص وزارة الصحة منتهي: ${emp.fullNameAr}`
            : `⚠️ اقتراب انتهاء ترخيص وزارة الصحة: ${emp.fullNameAr}`,
          description: `ترخيص رقم (${emp.mohLicenseNo || 'MOH-LIC'}) - المتبقي: ${isExpired ? 'منتهي بالفعل!' : `${days} يوم (${expiryDate})`}`,
          employeeId: emp.id,
          employeeName: emp.fullNameAr,
          daysRemaining: days,
          category: 'EXPIRATION',
          actionApp: 'DOCUMENTS',
        });
      }
    }

    // 4. Probation Period Ending (انقضاء فترة التجربة - المادة 32 من قانون العمل الكويتي 100 يوم)
    if (emp.joinDate) {
      const join = new Date(emp.joinDate);
      if (!isNaN(join.getTime())) {
        const probationEnd = new Date(join.getTime() + 100 * 24 * 60 * 60 * 1000);
        probationEnd.setHours(0, 0, 0,);
        const probationDaysLeft = Math.ceil((probationEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // Show alert if probation ends within 30 days or completed recently in last 15 days
        if (probationDaysLeft >= -15 && probationDaysLeft <= 30) {
          const isEnded = probationDaysLeft <= 0;
          const isImminent = probationDaysLeft <= 14;
          notifications.push({
            id: `notif-prob-${emp.id}`,
            type: 'PROBATION',
            severity: isImminent ? 'CRITICAL' : 'WARNING',
            title: isEnded
              ? `⏳ اكتمال فترة التجربة (100 يوم): ${emp.fullNameAr}`
              : `⏱️ اقتراب نهاية فترة التجربة: ${emp.fullNameAr}`,
            description: `تاريخ التعيين (${emp.joinDate}) - ${isEnded ? 'انتهت الـ 100 يوم بنجاح. يرجى تثبيت الموظف أو إجراء التقييم النهائي.' : `متبقي ${probationDaysLeft} يوم لتنتهي فترة التجربة القانونية.`}`,
            employeeId: emp.id,
            employeeName: emp.fullNameAr,
            daysRemaining: probationDaysLeft,
            category: 'PROBATION',
            actionApp: 'EMPLOYEES',
          });
        }
      }
    }
  });

  // 5. General Document Item Expirations (أرشيف المستندات)
  const companyDocs = (documents || []).filter(d => d.companyId === activeCompanyId && d.expiryDate);
  companyDocs.forEach(doc => {
    // Skip if already captured in civil/passport
    const isEmpCivilDoc = notifications.some(n => n.documentId === doc.id || (n.employeeId === doc.employeeId && n.type === doc.documentType));
    if (!isEmpCivilDoc) {
      const days = getDaysDiff(doc.expiryDate);
      if (days <= 60) {
        const isExpired = days <= 0;
        const isCritical = days <= 30;
        notifications.push({
          id: `notif-doc-${doc.id}`,
          type: 'DOCUMENT',
          severity: isCritical ? 'CRITICAL' : 'WARNING',
          title: isExpired
            ? `🚨 مستند منتهي بالأرشيف: ${doc.title}`
            : `⚠️ اقتراب انتهاء مستند رسمى: ${doc.title}`,
          description: `رقم المستند (${doc.documentNumber || '—'}) - المتبقي: ${isExpired ? 'منتهي' : `${days} يوم (${doc.expiryDate})`}`,
          documentId: doc.id,
          daysRemaining: days,
          category: 'EXPIRATION',
          actionApp: 'DOCUMENTS',
        });
      }
    }
  });

  // 6. Daily Attendance Alerts (حالات الغياب والتأخير المتكرر)
  const companyAttendance = (attendance || []).filter(a => a.companyId === activeCompanyId);
  const empAttendanceMap: Record<string, { absentCount: number; lateCount: number; totalLateMins: number }> = {};

  companyAttendance.forEach(record => {
    if (!empAttendanceMap[record.employeeId]) {
      empAttendanceMap[record.employeeId] = { absentCount: 0, lateCount: 0, totalLateMins: 0 };
    }
    if (record.status === 'ABSENT') {
      empAttendanceMap[record.employeeId].absentCount += 1;
    }
    if (record.status === 'LATE') {
      empAttendanceMap[record.employeeId].lateCount += 1;
      empAttendanceMap[record.employeeId].totalLateMins += (record.latenessMinutes || 15);
    }
  });

  Object.entries(empAttendanceMap).forEach(([empId, stats]) => {
    const emp = companyEmps.find(e => e.id === empId);
    const empName = emp ? emp.fullNameAr : 'موظف';

    if (stats.absentCount > 0) {
      notifications.push({
        id: `notif-abs-${empId}`,
        type: 'ABSENCE',
        severity: stats.absentCount >= 2 ? 'CRITICAL' : 'WARNING',
        title: `🚫 تنبيه غياب مسجل: ${empName}`,
        description: `تم تسجيل غياب بدون إذن (${stats.absentCount} أيام مسجلة كغياب غير مبرر).`,
        employeeId: empId,
        employeeName: empName,
        category: 'ATTENDANCE',
        actionApp: 'ATTENDANCE',
      });
    }

    if (stats.lateCount >= 2 || stats.totalLateMins >= 45) {
      notifications.push({
        id: `notif-late-${empId}`,
        type: 'TARDINESS',
        severity: 'WARNING',
        title: `⏱️ تأخير متكرر عن ساعات الدوام: ${empName}`,
        description: `سجلات تأخير متكررة (${stats.lateCount} أيام - إجمالي ${stats.totalLateMins} دقيقة تأخير).`,
        employeeId: empId,
        employeeName: empName,
        category: 'ATTENDANCE',
        actionApp: 'ATTENDANCE',
      });
    }
  });

  // Sort notifications: CRITICAL first, then WARNING, then daysRemaining ascending
  return notifications.sort((a, b) => {
    if (a.severity === 'CRITICAL' && b.severity !== 'CRITICAL') return -1;
    if (a.severity !== 'CRITICAL' && b.severity === 'CRITICAL') return 1;
    return (a.daysRemaining ?? 999) - (b.daysRemaining ?? 999);
  });
}
