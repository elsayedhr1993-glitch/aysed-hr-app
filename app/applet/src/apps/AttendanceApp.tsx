import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  Upload, Trash2, CheckCircle2, AlertTriangle, 
  Clock, FileSpreadsheet, Search, Calendar, Download, UserCheck, UserX
} from 'lucide-react';

// ==========================================
// محرك قراءة ومطابقة البصمة الذكي (Whitelisted Engine)
// ==========================================
export class AttendanceParser {
  /**
   * قراءة ملف الإكسيل مع استبعاد غير المسجلين واستنتاج الأعمدة بذكاء
   */
  static parseExcel(file: File, validEmployeeMap: Map<string, string>): Promise<{ logs: any[], ignoredCount: number }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        try {
          const data = new Uint8Array(e.target.result);
          const wb = XLSX.read(data, { type: 'array', cellDates: true });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          
          // تحويل الشيت إلى مصفوفة ثنائية الأبعاد (صفوف وأعمدة) للبحث عن العناوين بذكاء
          const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

          const logs: any[] = [];
          let ignoredCount = 0;

          let idCol = -1, dateTimeCol = -1, dateCol = -1, timeCol = -1;
          let startRow = 1;

          // 1. البحث عن صف العناوين (Headers) في أول 20 صف
          for (let i = 0; i < Math.min(20, rawRows.length); i++) {
              const row = rawRows[i];
              if (!row || !Array.isArray(row)) continue;
              
              for (let j = 0; j < row.length; j++) {
                  const val = String(row[j] || '').toLowerCase().trim();
                  // الكلمات المحتملة لعمود كود الموظف
                  if (['employee id', 'emp no', 'emp no.', 'ac-no.', 'no.', 'id', 'رقم الموظف', 'الرقم المدني', 'رقم', 'device id', 'user id', 'emp', 'pin'].includes(val)) idCol = j;
                  // الكلمات المحتملة لعمود التاريخ والوقت
                  if (['date/time', 'datetime', 'التاريخ والوقت', 'punch time', 'time', 'الوقت'].includes(val)) dateTimeCol = j;
                  // في حال كان التاريخ منفصلاً عن الوقت
                  if (['date', 'التاريخ', 'تاريخ'].includes(val)) dateCol = j;
              }
              
              // إذا وجدنا الكود والتاريخ/الوقت، نتوقف ونعتبر الصف التالي هو البداية
              if (idCol !== -1 && (dateTimeCol !== -1 || dateCol !== -1)) {
                  startRow = i + 1;
                  break;
              }
          }

          // 2. إذا لم نعثر على أسماء أعمدة صريحة (بعض ماكينات ZKTeco)، سنخمن بناءً على الترتيب الافتراضي
          if (idCol === -1) {
              idCol = 0; // عادة العمود الأول هو الكود
              dateTimeCol = 3; // عادة العمود الرابع هو التاريخ والوقت
              startRow = 1;
          }

          // 3. قراءة البيانات الفعلية
          for (let i = startRow; i < rawRows.length; i++) {
            const row = rawRows[i];
            if (!row || row.length === 0) continue;

            const rawId = row[idCol];
            const timeRaw = row[dateTimeCol];
            const dOnly = row[dateCol];

            if (rawId === undefined || rawId === '' || rawId === null) continue;
            const empId = String(rawId).trim();

            // الفلترة الحصرية: إذا كان هناك موظفين في النظام، نرفض أي كود غير مسجل
            if (validEmployeeMap.size > 0 && !validEmployeeMap.has(empId) && !validEmployeeMap.has(Number(empId).toString())) {
              ignoredCount++;
              continue; // تخطي الموظف غير المسجل
            }

            let timestamp: Date | null = null;

            // دالة مساعدة لمعالجة تواريخ الإكسيل وتواريخ النصوص (DD/MM/YYYY)
            const parseAnyDate = (val: any): Date | null => {
                if (!val) return null;
                if (val instanceof Date) return val;
                if (typeof val === 'number') {
                    // تحويل رقم الإكسيل إلى تاريخ JS
                    return new Date(Math.round((val - 25569) * 86400 * 1000));
                }
                let str = String(val).trim();
                // معالجة صيغة DD/MM/YYYY أو DD-MM-YYYY
                const match = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\s*(.*)$/);
                if (match) {
                    let d = parseInt(match[1]);
                    let m = parseInt(match[2]);
                    let y = parseInt(match[3]);
                    if (y < 100) y += 2000;
                    if (m > 12) { const t = m; m = d; d = t; } // تبديل إذا كان بصيغة MM/DD/YYYY
                    return new Date(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T${match[4] || '00:00:00'}`);
                }
                const d = new Date(str);
                return isNaN(d.getTime()) ? null : d;
            };

            if (timeRaw !== undefined && timeRaw !== '') {
                timestamp = parseAnyDate(timeRaw);
            } else if (dOnly !== undefined && dOnly !== '') {
                timestamp = parseAnyDate(dOnly); 
            }

            if (timestamp && !isNaN(timestamp.getTime())) {
              const resolvedName = validEmployeeMap.get(empId) || validEmployeeMap.get(Number(empId).toString()) || `موظف (${empId})`;
              logs.push({
                id: `LOG-${i}-${Date.now()}`,
                empId: empId,
                empName: resolvedName,
                date: timestamp.toISOString().split('T')[0],
                timestamp: timestamp.toISOString(),
                timeStr: timestamp.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
              });
            }
          }

          if (logs.length === 0) {
             if (ignoredCount > 0) {
                 reject(new Error(`تم رفض جميع الحركات (${ignoredCount} حركة) لأن أكواد الموظفين في الكشف غير مسجلة في النظام. يرجى إضافة الموظفين أو تحديث أرقامهم الوظيفية.`));
             } else {
                 reject(new Error("لم يتم العثور على أي بيانات بصمة صحيحة. يرجى التأكد من أن الملف هو كشف بصمة حقيقي."));
             }
             return;
          }

          resolve({ logs, ignoredCount });
        } catch (err) {
          console.error(err);
          reject(new Error("حدث خطأ غير متوقع أثناء قراءة الشيت. تأكد من صحة تنسيق الملف."));
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  static processLogs(logs: any[], debounceMinutes = 3) {
    if (!logs.length) return [];
    
    const sorted = [...logs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    const groups: Record<string, any> = {};
    sorted.forEach(log => {
      const key = `${log.empId}_${log.date}`;
      if (!groups[key]) {
        groups[key] = { 
          empId: log.empId, 
          empName: log.empName, 
          date: log.date, 
          punches: [] 
        };
      }
      const p = groups[key].punches;
      const last = p[p.length - 1];
      if (!last || (new Date(log.timestamp).getTime() - new Date(last.timestamp).getTime()) / 60000 >= debounceMinutes) {
        p.push(log);
      }
    });

    return Object.values(groups).map((g: any) => {
      const first = g.punches[0];
      const last = g.punches[g.punches.length - 1];

      if (g.punches.length === 1) {
        return {
          id: `ATT-${g.empId}-${g.date}`,
          empId: g.empId,
          empName: g.empName,
          date: g.date,
          checkIn: first.timeStr,
          checkOut: null,
          workedHours: 0,
          punchesCount: 1,
          status: 'single',
          notes: 'بصمة واحدة مسجلة (دخول فقط أو خروج فقط)'
        };
      }

      const diffMs = new Date(last.timestamp).getTime() - new Date(first.timestamp).getTime();
      const hours = Number((diffMs / (1000 * 60 * 60)).toFixed(2));

      return {
        id: `ATT-${g.empId}-${g.date}`,
        empId: g.empId,
        empName: g.empName,
        date: g.date,
        checkIn: first.timeStr,
        checkOut: last.timeStr,
        workedHours: hours,
        punchesCount: g.punches.length,
        status: 'completed',
        notes: g.punches.length > 2 ? `تعدد بصمات (${g.punches.length}) - أخذ البداية والنهاية` : 'حضور وانصراف مكتمل'
      };
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
  
  // فلترة التاريخ المخصص
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // استخراج قائمة الموظفين المسجلين فقط من النظام (localStorage أو State)
  const getRegisteredEmployeesMap = (): Map<string, string> => {
    const map = new Map<string, string>();
    try {
      const rawEmployees = localStorage.getItem('employees') || localStorage.getItem('company_employees');
      
      // Use props.employees if available
      if (props.employees && Array.isArray(props.employees) && props.employees.length > 0) {
          props.employees.forEach((emp: any) => {
              const code = String(emp.employeeCode || emp.id || emp.badgeId || emp.biometricId || '').trim();
              const name = emp.fullNameAr || emp.fullNameEn || `موظف (${code})`;
              if (code) map.set(code, name);
              if (emp.civilId) map.set(String(emp.civilId).trim(), name);
              if (emp.biometricId) map.set(String(emp.biometricId).trim(), name);
              if (emp.badgeId) map.set(String(emp.badgeId).trim(), name);
          });
      } else if (rawEmployees) {
        const list = JSON.parse(rawEmployees);
        if (Array.isArray(list)) {
            list.forEach((emp: any) => {
              const code = String(emp.code || emp.employeeCode || emp.id || emp.device_id || emp.biometricId || emp.civil_id || emp.civilId || '').trim();
              const name = emp.name || emp.fullNameAr || emp.arabicName || emp.enName || `موظف (${code})`;
              if (code) map.set(code, name);
              if (emp.civil_id) map.set(String(emp.civil_id).trim(), name);
              if (emp.civilId) map.set(String(emp.civilId).trim(), name);
              if (emp.device_id) map.set(String(emp.device_id).trim(), name);
              if (emp.biometricId) map.set(String(emp.biometricId).trim(), name);
            });
        }
      }
    } catch (e) {
      console.warn('تعذر قراءة سجل الموظفين', e);
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
    if (window.confirm('هل تريد مسح وتصفير كافة سجلات الحضور والانصراف السابقة للبدء على نظيف؟')) {
      localStorage.removeItem('clean_attendances_db');
      localStorage.removeItem('clean_attendances_ignored');
      setAttendances([]);
      setStartDate('');
      setEndDate('');
      setIgnoredCount(0);
      alert('تم مسح كافة البيانات السابقة بنجاح.');
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);

    try {
      const validMap = getRegisteredEmployeesMap();
      const { logs, ignoredCount: ignored } = await AttendanceParser.parseExcel(file, validMap);
      const processed = AttendanceParser.processLogs(logs);
      
      setIgnoredCount(ignored);
      setAttendances(processed);
      localStorage.setItem('clean_attendances_db', JSON.stringify(processed));
      localStorage.setItem('clean_attendances_ignored', String(ignored));

      let msg = `تم قراءة واعتماد ${processed.length} يوم عمل للموظفين المسجلين فقط.`;
      if (ignored > 0) {
        msg += `\n(تم تجاهل ${ignored} بصمة لموظفين غير مسجلين أو غادروا الشركة تلقائياً).`;
      }
      alert(msg);
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء معالجة الشيت');
    } finally {
      setLoading(false);
      if (e.target) e.target.value = '';
    }
  };

  const filtered = attendances.filter(a => {
    const matchesFilter = filter === 'all' ? true : a.status === filter;
    const matchesSearch = 
      (a.empId || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (a.empName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (a.date || '').includes(searchTerm);
    
    let matchesDate = true;
    if (startDate && a.date < startDate) matchesDate = false;
    if (endDate && a.date > endDate) matchesDate = false;

    return matchesFilter && matchesSearch && matchesDate;
  });

  const exportPayrollReport = () => {
    if (!filtered.length) {
      alert('لا توجد بيانات مطابقة لتصديرها.');
      return;
    }

    const exportData = filtered.map(row => ({
      'كود الموظف': row.empId,
      'اسم الموظف': row.empName,
      'التاريخ': row.date,
      'وقت الحضور': row.checkIn,
      'وقت الانصراف': row.checkOut || 'غائب/غير مكتمل',
      'ساعات العمل': row.workedHours,
      'الحالة': row.status === 'completed' ? 'مطابق' : 'بصمة فردية',
      'ملاحظات': row.notes
    }));

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
          <button 
            onClick={handleClearAll}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-rose-600 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition cursor-pointer"
          >
            <Trash2 size={16} /> مسح السجلات
          </button>

          <button 
            onClick={exportPayrollReport}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition cursor-pointer"
          >
            <Download size={16} /> تصدير كشف الفترة (Excel)
          </button>

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
                <th className="p-3.5 text-center">ساعات العمل</th>
                <th className="p-3.5 text-center">الحالة</th>
                <th className="p-3.5">ملاحظات النظام</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400 font-bold">
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
                    <td className="p-3.5 font-bold text-indigo-950 font-mono text-center">{row.workedHours} س</td>
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
