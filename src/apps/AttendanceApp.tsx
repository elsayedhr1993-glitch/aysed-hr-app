import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Calendar, Clock, Download, FileSpreadsheet, Search, Upload, FileText, CheckCircle, AlertCircle, XCircle, Trash2, UserCheck, CheckCircle2, AlertTriangle, UserX, Printer, ChevronDown } from 'lucide-react';

export class KuwaitLaborRateEngine {
  // حساب أجر اليوم والساعة وفق معيار 26 يوم عمل
  static getRates(basicSalary: number, dailyHours = 8) {
    const dailyRate = Number((basicSalary / 26).toFixed(3));
    const hourlyRate = Number((basicSalary / (26 * dailyHours)).toFixed(3));
    
    return { dailyRate, hourlyRate };
  }

  static calculateDeductions(
    basicSalary: number,
    dailyHours = 8,
    permissionHours = 0, // ساعات الاستئذان
    isSinglePunch = false // حالة عدم التبصيم
  ) {
    const { hourlyRate } = this.getRates(basicSalary, dailyHours);

    // 1. خصم الاستئذان
    const permissionDeduction = Number((permissionHours * hourlyRate).toFixed(3));

    // 2. جزاء عدم التبصيم (خصم ساعة واحدة)
    const missingPunchPenalty = isSinglePunch ? Number((1 * hourlyRate).toFixed(3)) : 0;

    return {
      hourlyRate,
      permissionHours,
      permissionDeduction,
      missingPunchPenalty,
      totalDeduction: Number((permissionDeduction + missingPunchPenalty).toFixed(3))
    };
  }
}

export class AttendanceParser {
  /**
   * قراءة ملف الإكسيل مع استبعاد غير المسجلين فوراً
   */
  
  
  static parseExcel(file: File, validEmployeeMap: Map<string, { name: string; standardHours: number; shiftStart: string; shiftEnd: string }>): Promise<{ logs: any[], ignoredCount: number }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        try {
          const data = new Uint8Array(e.target.result);
          const wb = XLSX.read(data, { type: 'array', cellDates: true });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

          const logs: any[] = [];
          let ignoredCount = 0;

          rows.forEach((r, idx) => {
            // Find Employee ID in many possible columns
            let rawId = r['Employee ID'] || r['Emp No'] || r['رقم الموظف'] || r['الرقم المدني'] || 
                        r['Device ID'] || r['ID'] || r['AC-No.'] || r['User ID'] || r['No'] || 
                        r['كود الموظف'] || r['الكود'] || r['Code'] || r['PIN'] || r['رقم البصمة'] || r['Employee Code'];

            if (!rawId) {
               // Try to search keys dynamically
               const idKey = Object.keys(r).find(k => k.toLowerCase().includes('id') || k.toLowerCase().includes('code') || k.includes('كود') || k.includes('رقم'));
               if (idKey) rawId = r[idKey];
            }
            if (!rawId) return;

            const empId = String(rawId).trim();
            const numEmpId = !isNaN(Number(empId)) ? String(Number(empId)) : empId;
            
            // فلترة حصرية: قبول فقط الأكواد المسجلة في قاعدة بيانات الموظفين
            let matchedName = null;
            let standardHours = 8;
            let shiftStart = '08:00';
            let shiftEnd = '16:00';
            if (validEmployeeMap.size > 0) {
               if (validEmployeeMap.has(empId)) {
                   const info = validEmployeeMap.get(empId);
                   matchedName = info?.name;
                   standardHours = info?.standardHours || 8;
                   shiftStart = info?.shiftStart || '08:00';
                   shiftEnd = info?.shiftEnd || '16:00';
               } else if (validEmployeeMap.has(numEmpId)) {
                   const info = validEmployeeMap.get(numEmpId);
                   matchedName = info?.name;
                   standardHours = info?.standardHours || 8;
                   shiftStart = info?.shiftStart || '08:00';
                   shiftEnd = info?.shiftEnd || '16:00';
               } else if (validEmployeeMap.has(empId.padStart(2, '0'))) {
                   const info = validEmployeeMap.get(empId.padStart(2, '0'));
                   matchedName = info?.name;
                   standardHours = info?.standardHours || 8;
                   shiftStart = info?.shiftStart || '08:00';
                   shiftEnd = info?.shiftEnd || '16:00';
               } else if (validEmployeeMap.has(empId.padStart(3, '0'))) {
                   const info = validEmployeeMap.get(empId.padStart(3, '0'));
                   matchedName = info?.name;
                   standardHours = info?.standardHours || 8;
                   shiftStart = info?.shiftStart || '08:00';
                   shiftEnd = info?.shiftEnd || '16:00';
               } else if (validEmployeeMap.has(empId.padStart(4, '0'))) {
                   const info = validEmployeeMap.get(empId.padStart(4, '0'));
                   matchedName = info?.name;
                   standardHours = info?.standardHours || 8;
                   shiftStart = info?.shiftStart || '08:00';
                   shiftEnd = info?.shiftEnd || '16:00';
               } else {
                   ignoredCount++;
                   return;
               }
            }

            const empName = matchedName || r['Name'] || r['الاسم'] || `موظف (${empId})`;

            // Helper to format local date
            const pad = (n: number) => String(n).padStart(2, '0');
            const getLocalDateString = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
            const getLocalISOString = (d: Date) => `${getLocalDateString(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

            // Helper to parse a time string or date object
            const parseTime = (dateBase: any, timeVal: any) => {
              if (!timeVal) return null;
              try {
                if (timeVal instanceof Date && !isNaN(timeVal.getTime())) return timeVal;
                
                // If it's just a time string like "08:30" or "08:30:00"
                if (typeof timeVal === 'string') {
                    // if it's already a full ISO string
                    if (timeVal.includes('T') && !isNaN(new Date(timeVal).getTime())) return new Date(timeVal);

                    // Combine with dateBase
                    let dateStr = '';
                    if (dateBase instanceof Date) {
                       dateStr = getLocalDateString(dateBase);
                    } else if (typeof dateBase === 'string') {
                       dateStr = dateBase.split(' ')[0].trim();
                    } else {
                       dateStr = getLocalDateString(new Date());
                    }
                    
                    const combined = new Date(`${dateStr} ${timeVal}`);
                    if (!isNaN(combined.getTime())) return combined;
                }
                
                // If it's a number (Excel fraction of a day)
                if (typeof timeVal === 'number') {
                    const msPerDay = 24 * 60 * 60 * 1000;
                    const baseDate = dateBase instanceof Date ? new Date(dateBase.getTime()) : new Date();
                    baseDate.setHours(0,0,0,0);
                    return new Date(baseDate.getTime() + Math.round(timeVal * msPerDay));
                }
              } catch (err) {}
              return null;
            };

            const pushLog = (timestamp: Date) => {
              logs.push({
                id: `LOG-${idx}-${Math.random().toString(36).substring(7)}`,
                empId: empId,
                empName: empName,
                standardHours: standardHours,
                shiftStart: shiftStart,
                shiftEnd: shiftEnd,
                date: getLocalDateString(timestamp),
                timestamp: getLocalISOString(timestamp),
                timeStr: timestamp.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
              });
            };

            // Pattern 1: Single Punch Event
            const timeRaw = r['Date/Time'] || r['DateTime'] || r['التاريخ والوقت'] || r['Punch Time'];
            if (timeRaw) {
               const ts = parseTime(null, timeRaw);
               if (ts) pushLog(ts);
               return; // Done with this row
            }

            // Pattern 2: Daily Report with separated Date and Time(s)
            let dateBase = r['Date'] || r['التاريخ'] || r['يوم'] || r['Day'];
            
            // Try specific time columns first
            let hasSpecificTimes = false;
            const checkInCols = ['Check-in', 'Check In', 'Clock In', 'In', 'وقت الدخول', 'الدخول', 'حضور', 'On duty'];
            const checkOutCols = ['Check-out', 'Check Out', 'Clock Out', 'Out', 'وقت الانصراف', 'وقت الخروج', 'الانصراف', 'انصراف', 'Off duty'];
            
            for (const col of checkInCols) {
                if (r[col]) {
                    const ts = parseTime(dateBase, r[col]);
                    if (ts) { pushLog(ts); hasSpecificTimes = true; break; }
                }
            }
            
            for (const col of checkOutCols) {
                if (r[col]) {
                    const ts = parseTime(dateBase, r[col]);
                    if (ts) { pushLog(ts); hasSpecificTimes = true; break; }
                }
            }

            if (hasSpecificTimes) return;

            // Pattern 3: Simple Date and Time (single punch, separated columns)
            const tOnly = r['Time'] || r['الوقت'];
            if (dateBase && tOnly) {
                const ts = parseTime(dateBase, tOnly);
                if (ts) pushLog(ts);
            }
          });

          resolve({ logs, ignoredCount });
        } catch (err) {
          reject(new Error("تعذر قراءة ملف الإكسيل. تأكد من صحة الملف والأعمدة."));
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  static processLogs(logs: any[], validEmployeeMap: Map<string, any>, leavesDb: any[], debounceMinutes = 3) {
    if (!logs.length) return [];
    
    const uniqueDates = Array.from(new Set(logs.map(l => l.date))).sort();
    const sorted = [...logs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    const punchesByEmpDate: Record<string, any[]> = {};
    sorted.forEach(log => {
      const key = `${log.empId}_${log.date}`;
      if (!punchesByEmpDate[key]) punchesByEmpDate[key] = [];
      const p = punchesByEmpDate[key];
      const last = p[p.length - 1];
      if (!last || (new Date(log.timestamp).getTime() - new Date(last.timestamp).getTime()) / 60000 >= debounceMinutes) {
        p.push(log);
      }
    });

    const results: any[] = [];
    const timeToMins = (tStr: string) => {
        if (!tStr) return 0;
        const parts = tStr.split(':');
        return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    };

    uniqueDates.forEach(date => {
      validEmployeeMap.forEach((empInfo, empId) => {
        const key = `${empId}_${date}`;
        const punches = punchesByEmpDate[key] || [];
        const count = punches.length;
        const targetHours = Number(empInfo.standardHours) || 8;
        const shiftStart = empInfo.shiftStart || '09:00';
        const shiftEnd = empInfo.shiftEnd || '21:00';

        const basicSalary = empInfo.basicSalary || 350;

        // Check for active leave
        const activeLeave = leavesDb.find(
           (l: any) => String(l.empId) === String(empId) && l.startDate <= date && l.endDate >= date && (l.status === 'approved' || l.status === 'معتمد' || l.status === 'مقبول')
        );

        if (activeLeave) {
            results.push({
              id: `ATT-${empId}-${date}`,
              empId: empId,
              empName: empInfo.name,
              date: date,
              checkIn: punches[0]?.timeStr || '--:--',
              checkOut: count > 1 ? punches[count-1].timeStr : '--:--',
              targetHours: targetHours,
              workedHours: targetHours,
              lateIn: 0,
              earlyOut: 0,
              overtime: 0,
              shortage: 0,
              punchesCount: count,
              status: 'leave',
              notes: `إجازة معتمدة: ${activeLeave.type || activeLeave.leaveType || 'إجازة'} - ${activeLeave.reason || 'بدون عجز دوام'}`,
              financial: KuwaitLaborRateEngine.calculateDeductions(basicSalary, targetHours, 0, false)
            });
            return;
        }

        if (count === 0) {
            results.push({
              id: `ATT-${empId}-${date}`,
              empId: empId,
              empName: empInfo.name,
              date: date,
              checkIn: '--:--',
              checkOut: '--:--',
              targetHours: targetHours,
              workedHours: 0,
              lateIn: 0,
              earlyOut: 0,
              overtime: 0,
              shortage: targetHours,
              punchesCount: 0,
              status: 'absent',
              notes: 'غياب غير مبرر (لم يسجل أي بصمة)',
              financial: KuwaitLaborRateEngine.calculateDeductions(basicSalary, targetHours, targetHours, false)
            });
            return;
        }

        const first = punches[0];
        const last = punches[count - 1];
        let totalWorkedMinutes = 0;
        let lateInMins = 0;
        let earlyOutMins = 0;

        // 1. حساب فترات العمل الزوجية (Pairs)
        for (let i = 0; i < count; i += 2) {
          if (i + 1 < count) {
            const inTime = new Date(punches[i].timestamp).getTime();
            const outTime = new Date(punches[i + 1].timestamp).getTime();
            const durationMins = (outTime - inTime) / 60000;
            totalWorkedMinutes += durationMins;

            // فحص التأخير الصباحي بناءً على موعد بدء المناوبة المحدد في عقد الموظف
            if (i === 0) {
              const punchMins = timeToMins(punches[0].timeStr);
              const shiftStartMins = timeToMins(shiftStart);
              const graceLimit = shiftStartMins + 15; // 15 دقيقة فترة سماح
              
              // نعتبر التأخير فقط في أول 3 ساعات من بداية الشفت، لتجنب اعتبار بصمة مسائية بالخطأ كتأخير صباحي
              if (punchMins > graceLimit && punchMins <= shiftStartMins + (3 * 60)) {
                lateInMins = punchMins - shiftStartMins;
              }
            }
          }
        }
        
        // خروج مبكر (بناء على آخر بصمة وموعد نهاية المناوبة المحدد في عقد الموظف)
        if (count > 1 && last && last.timeStr) {
            const lastMins = timeToMins(last.timeStr);
            const shiftEndMins = timeToMins(shiftEnd);
            
            // إذا خرج قبل موعد الانصراف بمدة أقصاها ساعتين (لتمييز الانصراف المبكر الفعلي)
            if (lastMins < shiftEndMins && lastMins >= shiftEndMins - (2 * 60)) {
                earlyOutMins = shiftEndMins - lastMins;
            }
        }

        const actualHours = Number((totalWorkedMinutes / 60).toFixed(2));
        const difference = Number((actualHours - targetHours).toFixed(2));
        const overtime = difference > 0 ? difference : 0;
        const shortage = difference < 0 ? Math.abs(difference) : 0;

        // توصيف الحالة بذكاء
        let statusDesc = 'دوام مطابق كامل';
        if (count === 1) {
            statusDesc = 'بصمة فردية معلقة (عجز دوام كامل)';
        } else if (count === 2) {
            statusDesc = actualHours >= 7.5 ? 'شفت مستمر كامل' : 'دوام فترة واحدة (نصف يوم)';
        } else if (count >= 4) {
            statusDesc = 'دوام فترتين (صباحي ومسائي)';
        } else if (count % 2 !== 0) {
            statusDesc = 'بصمة فردية معلقة';
        }
        
        if (count % 2 === 0) {
           if (shortage > 0) statusDesc += ` - عجز (${shortage} س)`;
           if (overtime > 0) statusDesc += ` - إضافي (${overtime} س)`;
        }

        const isSinglePunch = count % 2 !== 0 && count > 0;
        // نعتبر أن عجز الساعات هو الذي يعبر عن الاستئذان أو النقص
        const permissionHours = shortage; 
        
        const financial = KuwaitLaborRateEngine.calculateDeductions(
           basicSalary,
           targetHours,
           permissionHours,
           isSinglePunch
        );

        results.push({
          id: `ATT-${empId}-${date}`,
          empId: empId,
          empName: empInfo.name,
          date: date,
          checkIn: first.timeStr,
          checkOut: count > 1 ? last.timeStr : null,
          targetHours: targetHours,
          workedHours: actualHours,
          lateIn: lateInMins,
          earlyOut: count > 1 ? earlyOutMins : 0,
          overtime: overtime,
          shortage: count === 1 ? targetHours : shortage,
          punchesCount: count,
          status: count % 2 !== 0 ? 'single' : 'completed',
          notes: statusDesc,
          financial
        });
      });
    });

    return results.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return String(a.empId).localeCompare(String(b.empId));
    });
  }

}

// ==========================================
// الواجهة التنفيذية لتطبيق الحضور والانصراف
// ==========================================
export const AttendanceApp: React.FC<any> = (props) => {
  const [attendances, setAttendances] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'completed' | 'single'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [ignoredCount, setIgnoredCount] = useState(0);
  const [showPrintMenu, setShowPrintMenu] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  // فلترة التاريخ المخصص
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // استخراج قائمة الموظفين المسجلين فقط من النظام (localStorage أو State)
    // استخراج قائمة الموظفين المسجلين فقط من النظام (localStorage أو State)
  const getEmployeeContractMap = (): Map<string, { name: string; standardHours: number; shiftStart: string; shiftEnd: string; basicSalary: number }> => {
    const map = new Map<string, { name: string; standardHours: number; shiftStart: string; shiftEnd: string; basicSalary: number }>();
    try {
      const raw = localStorage.getItem('employees') || 
                  localStorage.getItem('company_employees') || 
                  localStorage.getItem('staff_db') || 
                  '[]';

      // دالة مساعدة لمعالجة الموظف
      const processEmployee = (emp: any) => {
        const rawHours = emp.standardHours ?? 
                         emp.workHours ?? 
                         emp.working_hours ?? 
                         emp.contractHours ?? 
                         emp.daily_hours ?? 
                         emp.hours ?? 
                         8;
        const parsedHours = Number(rawHours);
        const standardHours = (!isNaN(parsedHours) && parsedHours > 0) ? parsedHours : 8;

        const name = emp.name || emp.arabicName || emp.fullName || emp.fullNameAr || emp.enName || emp.fullNameEn || 'موظف';
        
        const shiftStart = emp.shiftStart || emp.shift_start || emp.timeIn || '08:00';
        let shiftEnd = emp.shiftEnd || emp.shift_end || emp.timeOut;
        if (!shiftEnd) {
           const startHour = parseInt(shiftStart.split(':')[0]) || 8;
           shiftEnd = `${String(startHour + standardHours).padStart(2, '0')}:00`;
        }
        
        const basicSalary = Number(emp.basicSalary || emp.basic_salary || emp.salary || 350);
        
        const info = { name, standardHours, shiftStart, shiftEnd, basicSalary };

        // الربط بكافة المعرفات مع عمل Trim للمسافات
        const keys = [emp.code, emp.id, emp.device_id, emp.emp_id, emp.civil_id, emp.employeeCode, emp.biometricId, emp.civilId, emp.badgeId];
        keys.forEach(k => {
          if (k !== undefined && k !== null && String(k).trim() !== '') {
            map.set(String(k).trim(), info);
          }
        });
      };

      const employees = JSON.parse(raw);
      if (Array.isArray(employees)) {
          employees.forEach(processEmployee);
      }
      
      // If props contain employees as well
      if (props.employees && Array.isArray(props.employees)) {
          props.employees.forEach(processEmployee);
      }

    } catch (err) {
      console.error("خطأ في قراءة ساعات العقود:", err);
    }
    return map;
  };
useEffect(() => {
    const saved = localStorage.getItem('clean_attendances_db');
    if (saved) {
      try { setAttendances(JSON.parse(saved)); } catch (e) {}
    }
    const savedIgnored = localStorage.getItem('clean_attendances_ignored');
    if (savedIgnored) {
        try { setIgnoredCount(Number(savedIgnored)); } catch (e) {}
    }
  }, []);

  const handleClearAll = () => {
    localStorage.removeItem('clean_attendances_db');
    localStorage.removeItem('clean_attendances_ignored');
    setAttendances([]);
    setStartDate('');
    setEndDate('');
    setIgnoredCount(0);
    setShowClearConfirm(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);

    try {
      const validMap = getEmployeeContractMap();
      const { logs, ignoredCount: ignored } = await AttendanceParser.parseExcel(file, validMap);
      const getApprovedLeaves = () => {
        try {
          const rawLeaves = localStorage.getItem('leaves') || localStorage.getItem('employee_leaves');
          if (rawLeaves) return JSON.parse(rawLeaves);
        } catch (e) {}
        return [];
      };
      
      const leavesDb = getApprovedLeaves();
      const processed = AttendanceParser.processLogs(logs, validMap, leavesDb);
      
      setIgnoredCount(ignored);
      setAttendances(processed);
      localStorage.setItem('clean_attendances_db', JSON.stringify(processed));
      localStorage.setItem('clean_attendances_ignored', String(ignored));

      let msg = `تم قراءة واعتماد ${processed.length} يوم عمل ومطابقتها بساعات عقود الموظفين.`;
      if (ignored > 0) {
        msg += `\n(تم تجاهل ${ignored} بصمة لموظفين غير مسجلين أو غادروا الشركة تلقائياً).`;
      }
      alert(msg);
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء معالجة الشيت');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const filtered = attendances.filter(a => {
    const matchesFilter = filter === 'all' ? true : a.status === filter;
    const matchesSearch = 
      String(a.empId || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      String(a.empName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      String(a.date || '').includes(searchTerm);
    
    let matchesDate = true;
    if (startDate && a.date < startDate) matchesDate = false;
    if (endDate && a.date > endDate) matchesDate = false;

    return matchesFilter && matchesSearch && matchesDate;
  });

    const handlePrint = () => {
    setShowPrintMenu(false);
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('الرجاء السماح بالنوافذ المنبثقة (Pop-ups) للطباعة');
      return;
    }

    const htmlContent = `
      <html dir="rtl">
        <head>
          <title>كشف الحضور والانصراف</title>
          <style>
            body { font-family: 'Cairo', sans-serif; padding: 20px; color: #333; }
            h2 { text-align: center; color: #1e293b; margin-bottom: 20px; }
            .header-info { display: flex; justify-content: space-between; margin-bottom: 20px; font-weight: bold; border-bottom: 2px solid #cbd5e1; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
            th, td { border: 1px solid #94a3b8; padding: 8px; text-align: right; }
            th { background-color: #f1f5f9; color: #0f172a; }
            .totals { margin-top: 20px; padding: 10px; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; }
            @media print {
              body { -webkit-print-color-adjust: exact; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <h2>كشف الحضور والانصراف المعتمد</h2>
          <div class="header-info">
            <div>الفترة: ${startDate || 'بداية السجلات'} إلى ${endDate || 'نهاية السجلات'}</div>
            <div>إجمالي السجلات: ${filtered.length}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>الكود</th>
                <th>الاسم</th>
                <th>دخول</th>
                <th>خروج</th>
                <th>ساعات العقد</th>
                <th>ساعات فعلية</th>
                <th>التأخير</th>
                <th>عجز ساعات</th>
                <th>إضافي</th>
                <th>الحالة</th>
                <th>ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(row => `
                <tr>
                  <td>${row.date}</td>
                  <td>${row.empId}</td>
                  <td>${row.empName}</td>
                  <td dir="ltr" style="text-align: right">${row.checkIn}</td>
                  <td dir="ltr" style="text-align: right">${row.checkOut || '--:--'}</td>
                  <td>${row.targetHours}</td>
                  <td>${row.workedHours}</td>
                  <td>${row.lateIn > 0 ? row.lateIn + ' د' : '-'}</td>
                  <td>${row.shortage > 0 ? row.shortage + ' س' : '-'}</td>
                  <td>${row.overtime > 0 ? row.overtime + ' س' : '-'}</td>
                  <td>${row.status === 'completed' ? 'مطابق' : (row.status === 'leave' ? 'إجازة' : (row.status === 'absent' ? 'غياب' : 'غير مكتمل'))}</td>
                  <td>${row.notes || ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div style="margin-top: 40px; text-align: center; display: flex; justify-content: space-around;">
            <div>
              <p>إعداد الموارد البشرية</p>
              <p>......................</p>
            </div>
            <div>
              <p>اعتماد الإدارة</p>
              <p>......................</p>
            </div>
          </div>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const exportPayrollReport = () => {
    if (!filtered.length) {
      alert('لا توجد بيانات مطابقة لتصديرها.');
      return;
    }

    const exportData = filtered.map(row => {
      const basicSalary = (row as any).financial ? ((row as any).financial.hourlyRate * 26 * row.targetHours).toFixed(3) : 0;
      
      return {
      'كود الموظف': row.empId,
      'اسم الموظف': row.empName,
      'الراتب الأساسي': basicSalary,
      'التاريخ': row.date,
      'وقت الحضور': row.checkIn,
      'وقت الانصراف': row.checkOut || 'غائب/غير مكتمل',
      'ساعات العمل المستهدفة': row.targetHours,
      'ساعات العمل الفعلية': row.workedHours,
      'تأخير صباحي (دقيقة)': row.lateIn > 0 ? row.lateIn : 0,
      'خروج مبكر (دقيقة)': row.earlyOut > 0 ? row.earlyOut : 0,
      'إجمالي عجز الساعات': row.shortage,
      'ساعات إضافية': row.overtime,
      'أجر الساعة (د.ك)': (row as any).financial?.hourlyRate || 0,
      'خصم الاستئذان/العجز (د.ك)': (row as any).financial?.permissionDeduction || 0,
      'جزاء عدم التبصيم (د.ك)': (row as any).financial?.missingPunchPenalty || 0,
      'إجمالي الخصم المالي (د.ك)': (row as any).financial?.totalDeduction || 0,
      'الحالة': row.status === 'completed' ? 'مطابق' : (row.status === 'leave' ? 'إجازة معتمدة' : (row.status === 'absent' ? 'غياب' : 'غير مكتمل')),
      'ملاحظات': row.notes
    }});

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "كشف_البصمة_والرواتب");
    
    const fileName = `تقرير_البصمة_${startDate || 'بداية'}_إلى_${endDate || 'نهاية'}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const completedCount = filtered.filter(a => a.status === 'completed').length;
  const singleCount = filtered.filter(a => a.status === 'single').length;

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-[#f8fafc] p-6 text-slate-800 font-['Cairo',sans-serif]" dir="rtl">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6 flex flex-wrap justify-between items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Clock size={22} /></span>
            <h1 className="text-xl font-bold text-slate-900">نظام الحضور والانصراف المعتمد (معيار Odoo)</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-bold">مطابقة للأكواد المسجلة فقط مع استبعاد غير المقيدين وتصفية دورة الرواتب</p>
        </div>

        <div className="flex items-center gap-3">
          {showClearConfirm ? (
            <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-lg p-1">
              <span className="text-xs font-bold text-rose-700 px-2">هل أنت متأكد؟</span>
              <button 
                onClick={handleClearAll}
                className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 rounded hover:bg-rose-700"
              >نعم، امسح</button>
              <button 
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50"
              >إلغاء</button>
            </div>
          ) : (
            <button 
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-rose-600 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition cursor-pointer"
            >
              <Trash2 size={16} /> مسح السجلات
            </button>
          )}

          <button 
            onClick={exportPayrollReport}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition cursor-pointer"
          >
            <Download size={16} /> تصدير كشف الفترة (Excel)
          </button>

          <div className="relative inline-block text-right">
            <button
              onClick={() => setShowPrintMenu(!showPrintMenu)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm transition"
            >
              <Printer size={16} className="text-slate-600" />
              <span>طباعة التقارير</span>
              <ChevronDown size={14} className="text-slate-400" />
            </button>

            {showPrintMenu && (
              <div className="absolute left-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50">
                <button 
                  onClick={handlePrint}
                  className="w-full text-right px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 flex items-center justify-between"
                >
                  طباعة كشف الحضور الحالي
                </button>
                <button 
                  onClick={() => { setShowPrintMenu(false); }}
                  className="w-full text-right px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 flex items-center justify-between"
                >
                  طباعة مسير الرواتب (WPS)
                </button>
                <button 
                  onClick={() => { setShowPrintMenu(false); }}
                  className="w-full text-right px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 flex items-center justify-between"
                >
                  طباعة كشف مفردات موظف
                </button>
              </div>
            )}
          </div>
          
          <label className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm cursor-pointer transition">
            <Upload size={16} />
            {loading ? 'جاري الاستيراد...' : 'استيراد شيت البصمة (Excel/CSV)'}
            <input type="file" accept=".xlsx, .xls, .csv" onChange={handleUpload} className="hidden" />
          </label>
        </div>
      </div>

      {/* Date Range & Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 px-3 rounded-lg border border-slate-200 text-xs">
            <Calendar size={14} className="text-slate-500" />
            <span className="font-semibold text-slate-700">دورة البصمة من:</span>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-white border border-slate-300 rounded px-2 py-1 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            />
            <span className="font-semibold text-slate-700">إلى:</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-white border border-slate-300 rounded px-2 py-1 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            />
            {(startDate || endDate) && (
              <button 
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="text-rose-500 hover:text-rose-700 text-xs font-semibold mr-1 cursor-pointer"
              >
                تفريغ الفترة
              </button>
            )}
          </div>

          <div className="flex gap-1.5">
            <button 
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${filter === 'all' ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              الكل ({filtered.length})
            </button>
            <button 
              onClick={() => setFilter('completed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${filter === 'completed' ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              المكتملة ({completedCount})
            </button>
            <button 
              onClick={() => setFilter('single')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${filter === 'single' ? 'bg-amber-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              بصمة فردية ({singleCount})
            </button>
          </div>
        </div>

        <div className="relative">
          <input 
            type="text" 
            placeholder="بحث بالكود، الاسم، أو التاريخ..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64 pl-3 pr-9 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
          />
          <Search size={16} className="absolute right-3 top-2.5 text-slate-400" />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-bold">سجلات معتمدة (أكواد مسجلة)</p>
            <p className="text-2xl font-black text-slate-900 mt-1 font-mono">{filtered.length}</p>
          </div>
          <div className="p-3 bg-slate-50 text-slate-600 rounded-xl"><UserCheck size={24} /></div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-bold">حركات مطابقة ومكتملة</p>
            <p className="text-2xl font-black text-emerald-600 mt-1 font-mono">{completedCount}</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><CheckCircle2 size={24} /></div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-bold">بصمات فردية للمراجعة</p>
            <p className="text-2xl font-black text-amber-600 mt-1 font-mono">{singleCount}</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><AlertTriangle size={24} /></div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-bold">بصمات مستبعدة (غير مسجلين)</p>
            <p className="text-2xl font-black text-slate-400 mt-1 font-mono">{ignoredCount}</p>
          </div>
          <div className="p-3 bg-slate-50 text-slate-400 rounded-xl"><UserX size={24} /></div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto max-h-[50vh] odoo-scrollbar">
          <table className="w-full text-right text-xs table-auto">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10 shadow-xs">
              <tr>
                <th className="p-3.5">كود الموظف</th>
                <th className="p-3.5">اسم الموظف</th>
                <th className="p-3.5">التاريخ</th>
                <th className="p-3.5 text-center">أول بصمة (دخول)</th>
                <th className="p-3.5 text-center">آخر بصمة (خروج)</th>
                <th className="p-3.5 text-center">ساعات العقد</th>
                <th className="p-3.5 text-center">الدوام الفعلي</th>
                <th className="p-3.5 text-center">التأخير/الخروج المبكر</th>
                <th className="p-3.5 text-center">الفارق (عجز / إضافي)</th>
                <th className="p-3.5 text-center">الحالة</th>
                <th className="p-3.5">ملاحظات النظام</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-10 text-slate-400 font-bold">
                    لا توجد بيانات مسجلة تطابق الشروط. قم برفع كشف البصمة.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3.5 font-bold text-slate-900 font-mono">{row.empId}</td>
                    <td className="p-3.5 font-bold text-indigo-900">{row.empName}</td>
                    <td className="p-3.5 text-slate-600 font-bold font-mono">{row.date}</td>
                    <td className="p-3.5 text-emerald-700 font-mono font-bold text-center">{row.checkIn}</td>
                    <td className="p-3.5 font-mono text-center">
                      {row.checkOut ? (
                        <span className="text-rose-700 font-bold">{row.checkOut}</span>
                      ) : (
                        <span className="text-slate-400 font-normal">--:--:--</span>
                      )}
                    </td>
                    <td className="p-3.5 font-bold text-slate-700 text-center">{row.targetHours} س</td>
                    <td className="p-3.5 font-bold text-indigo-950 font-mono text-center">{row.workedHours} س</td>
                    <td className="p-3.5 text-center text-xs">
                      {row.lateIn > 0 && (
                        <div className="text-rose-600 font-bold mb-1">
                           تأخير: {row.lateIn} د
                        </div>
                      )}
                      {row.earlyOut > 0 && (
                        <div className="text-amber-600 font-bold">
                           مبكر: {row.earlyOut} د
                        </div>
                      )}
                      {row.lateIn === 0 && row.earlyOut === 0 && (
                         <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      {row.overtime > 0 && (
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px] font-bold">
                          +{row.overtime} س إضافي
                        </span>
                      )}
                      {row.shortage > 0 && (
                        <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-[11px] font-bold">
                          -{row.shortage} س عجز
                        </span>
                      )}
                      {row.overtime === 0 && row.shortage === 0 && (
                        <span className="text-slate-500 font-bold text-[11px]">مطابق تماماً</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      {row.status === 'completed' ? (
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md text-[10px] font-bold inline-block">
                          مطابق
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-md text-[10px] font-bold inline-block">
                          بصمة فردية
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-500 font-bold text-[11px]">{row.notes}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default AttendanceApp;
