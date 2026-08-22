import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Employee, AttendanceRecord, LeaveRequest, Contract } from '../types';

export interface ShiftConfig {
  nameAr?: string;
  startTime: string; // e.g. "08:00"
  endTime: string;   // e.g. "16:00"
  graceMinutes: number; // e.g. 15
  dailyWorkHours: number; // e.g. 8
}

export interface RawBiometricLog {
  employeeCode: string; // e.g. "101" or civil ID
  date: string;         // YYYY-MM-DD
  time: string;         // HH:mm
  fullTimestamp?: string;
}

export interface ParsedAttendanceResult {
  records: AttendanceRecord[];
  matchedCount: number;
  unmatchedCodes: string[];
  unmatchedBadgeIds?: string[];
  totalLogLines: number;
  datesFound: string[];
}

export const DEFAULT_SHIFT: ShiftConfig = {
  startTime: '08:00',
  endTime: '16:00',
  graceMinutes: 15,
  dailyWorkHours: 8,
};

// Convert HH:mm to minutes from midnight
export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return 0;
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

// Convert minutes from midnight to HH:mm
export function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

// Helper to format Date object or string to YYYY-MM-DD
export function formatDateStr(dateVal: any): string {
  if (!dateVal) return new Date().toISOString().split('T')[0];
  if (dateVal instanceof Date) {
    return dateVal.toISOString().split('T')[0];
  }
  const str = String(dateVal).trim();
  // Handle DD/MM/YYYY or YYYY-MM-DD or Excel date number
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
    const [d, m, y] = str.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return str.split('T')[0] || new Date().toISOString().split('T')[0];
}

// Helper to format time to HH:mm
export function formatTimeStr(timeVal: any): string {
  if (!timeVal) return '08:00';
  const str = String(timeVal).trim();
  const match = str.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    const h = parseInt(match[1], 10);
    const m = match[2];
    return `${h.toString().padStart(2, '0')}:${m}`;
  }
  return '08:00';
}

// Process raw log entries into structured AttendanceRecord items
export function processRawLogsToAttendanceRecords(
  rawLogs: RawBiometricLog[],
  employees: Employee[],
  companyId: string,
  leaves: LeaveRequest[],
  shift: ShiftConfig = DEFAULT_SHIFT
): ParsedAttendanceResult {
  const logMap: Record<string, Record<string, string[]>> = {}; // empCode -> date -> times[]
  const unmatchedCodesSet = new Set<string>();
  const datesSet = new Set<string>();

  rawLogs.forEach(log => {
    const code = log.employeeCode ? log.employeeCode.trim() : '';
    const date = formatDateStr(log.date);
    const time = formatTimeStr(log.time);

    if (!code || !date) return;

    datesSet.add(date);

    if (!logMap[code]) {
      logMap[code] = {};
    }
    if (!logMap[code][date]) {
      logMap[code][date] = [];
    }
    logMap[code][date].push(time);
  });

  const records: AttendanceRecord[] = [];
  let matchedCount = 0;

  const shiftStartMins = timeToMinutes(shift.startTime);
  const shiftEndMins = timeToMinutes(shift.endTime);

  Object.entries(logMap).forEach(([code, datesData]) => {
    const cleanCode = code.trim().toLowerCase();

    // Find matching employee with priority:
    // 1. Exact match on biometricId (كود جهاز البصمة)
    // 2. Exact match on badgeId (شارة أودو)
    // 3. Exact match on pinCode (رمز PIN)
    // 4. Exact match on employeeCode (الرقم الوظيفي في النظام)
    // 5. Exact match on civilId (الرقم المدني)
    // 6. Name match
    const emp = employees.find(
      e => e.companyId === companyId && (
        (e.biometricId && e.biometricId.trim().toLowerCase() === cleanCode) ||
        (e.badgeId && e.badgeId.trim().toLowerCase() === cleanCode) ||
        (e.pinCode && e.pinCode.trim().toLowerCase() === cleanCode) ||
        (e.employeeCode && e.employeeCode.trim().toLowerCase() === cleanCode) ||
        (e.civilId && e.civilId.trim() === code.trim()) ||
        (e.fullNameAr && e.fullNameAr.includes(code.trim())) ||
        (e.fullNameEn && e.fullNameEn.toLowerCase().includes(cleanCode))
      )
    );

    if (!emp) {
      unmatchedCodesSet.add(code);
    } else {
      matchedCount++;
    }

    const targetEmpId = emp ? emp.id : `unmatched-${code}`;

    Object.entries(datesData).forEach(([dateStr, times]) => {
      // Sort times chronologically
      times.sort((a, b) => timeToMinutes(a) - timeToMinutes(b));

      const firstPunch = times[0]; // Check In
      const lastPunch = times.length > 1 ? times[times.length - 1] : shift.endTime; // Check Out or Shift End

      const checkInMins = timeToMinutes(firstPunch);
      const checkOutMins = timeToMinutes(lastPunch);

      // Work Hours
      const totalMinutesWorked = Math.max(0, checkOutMins - checkInMins);
      const workHours = parseFloat((totalMinutesWorked / 60).toFixed(2));
      const overtimeHours = Math.max(0, parseFloat((workHours - shift.dailyWorkHours).toFixed(2)));

      // Lateness Calculation
      let latenessMins = 0;
      if (checkInMins > shiftStartMins + shift.graceMinutes) {
        latenessMins = checkInMins - shiftStartMins;
      }

      // Check for approved hourly permission for this employee on this date
      const empPermission = leaves.find(
        l => l.employeeId === targetEmpId &&
          l.status === 'APPROVED' &&
          l.leaveType === 'HOURLY_PERMISSION' &&
          l.startDate === dateStr
      );

      if (empPermission && empPermission.permissionMinutes) {
        latenessMins = Math.max(0, latenessMins - empPermission.permissionMinutes);
      }

      // Check if employee has approved full-day leave
      const empLeave = leaves.find(
        l => l.employeeId === targetEmpId &&
          l.status === 'APPROVED' &&
          l.leaveType !== 'HOURLY_PERMISSION' &&
          dateStr >= l.startDate && dateStr <= l.endDate
      );

      let status: 'PRESENT' | 'LATE' | 'ABSENT' | 'ON_LEAVE' = 'PRESENT';
      if (empLeave) {
        status = 'ON_LEAVE';
        latenessMins = 0;
      } else if (latenessMins > 0) {
        status = 'LATE';
      }

      const punches = [{ in: firstPunch, out: lastPunch }];

      records.push({
        id: `att-${targetEmpId}-${dateStr}`,
        employeeId: targetEmpId,
        companyId,
        date: dateStr,
        checkIn: firstPunch,
        checkOut: lastPunch,
        punches,
        workHours,
        overtimeHours,
        status,
        latenessMinutes: latenessMins,
      });
    });
  });

  return {
    records,
    matchedCount,
    unmatchedCodes: Array.from(unmatchedCodesSet),
    totalLogLines: rawLogs.length,
    datesFound: Array.from(datesSet).sort(),
  };
}

// Parse File (Excel, CSV, TXT)
export async function parseAttendanceFile(file: File): Promise<RawBiometricLog[]> {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { defval: '' });

    return parseGenericRows(jsonData);
  } else {
    // CSV or TXT
    const text = await file.text();
    return new Promise((resolve) => {
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data && results.data.length > 0 && typeof results.data[0] === 'object') {
            resolve(parseGenericRows(results.data));
          } else {
            // Unstructured TXT lines
            resolve(parseRawTxtLines(text));
          }
        },
        error: () => {
          resolve(parseRawTxtLines(text));
        }
      });
    });
  }
}

// Row parser helper for JSON/CSV rows
function parseGenericRows(rows: any[]): RawBiometricLog[] {
  const logs: RawBiometricLog[] = [];

  rows.forEach(row => {
    const keys = Object.keys(row);
    let code = '';
    let date = '';
    let time = '';
    let checkIn = '';
    let checkOut = '';

    keys.forEach(k => {
      const lowerK = k.toLowerCase().trim();
      const val = String(row[k]).trim();

      if (!val) return;

      if (
        lowerK.includes('biometric') || lowerK.includes('badge') || lowerK.includes('finger') ||
        lowerK.includes('ac-no') || lowerK.includes('ac_no') || lowerK.includes('enroll') ||
        lowerK.includes('بصمة') || lowerK.includes('شارة') ||
        lowerK.includes('code') || lowerK.includes('id') || lowerK.includes('pin') || 
        lowerK.includes('badgenumber') || lowerK.includes('موظف') || lowerK.includes('كود')
      ) {
        if (!code) code = val;
      } else if (lowerK.includes('date') || lowerK.includes('تاريخ') || lowerK.includes('يوم')) {
        if (!date) date = val;
      } else if (lowerK.includes('time') || lowerK.includes('وقت') || lowerK.includes('ساعة') || lowerK.includes('توقيت')) {
        if (!time) time = val;
      } else if (lowerK.includes('checkin') || lowerK.includes('check_in') || lowerK.includes('in') || lowerK.includes('حضور') || lowerK.includes('دخول')) {
        if (!checkIn) checkIn = val;
      } else if (lowerK.includes('checkout') || lowerK.includes('check_out') || lowerK.includes('out') || lowerK.includes('انصراف') || lowerK.includes('خروج')) {
        if (!checkOut) checkOut = val;
      }
    });

    // Fallback: search first column as code if not found
    if (!code && keys.length > 0) {
      code = String(row[keys[0]]).trim();
    }

    // Structured row with explicit Check In / Check Out
    if (checkIn || checkOut) {
      if (checkIn) {
        logs.push({
          employeeCode: code,
          date: formatDateStr(date || new Date()),
          time: formatTimeStr(checkIn),
        });
      }
      if (checkOut) {
        logs.push({
          employeeCode: code,
          date: formatDateStr(date || new Date()),
          time: formatTimeStr(checkOut),
        });
      }
    } else if (code) {
      // Raw log timestamp
      let dtStr = date;
      let tmStr = time;

      // Check if time contains full date-time e.g. "2026-08-10 08:15:00"
      if (time.includes(' ') || time.includes('T')) {
        const parts = time.split(/[ T]/);
        if (parts.length >= 2) {
          dtStr = parts[0];
          tmStr = parts[1];
        }
      }

      logs.push({
        employeeCode: code,
        date: formatDateStr(dtStr),
        time: formatTimeStr(tmStr),
      });
    }
  });

  return logs;
}

// Helper to parse plain space/tab delimited TXT logs (e.g. ZKTeco / Hikvision)
function parseRawTxtLines(text: string): RawBiometricLog[] {
  const lines = text.split(/\r?\n/);
  const logs: RawBiometricLog[] = [];

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Tokens split by space, tab, or comma
    const tokens = trimmed.split(/[\t, ]+/).filter(Boolean);
    if (tokens.length >= 2) {
      const code = tokens[0];
      // Search for date token (YYYY-MM-DD or DD/MM/YYYY)
      let date = '';
      let time = '';

      tokens.slice(1).forEach(tok => {
        if (/\d{4}-\d{2}-\d{2}/.test(tok) || /\d{1,2}\/\d{1,2}\/\d{4}/.test(tok)) {
          date = tok;
        } else if (/\d{1,2}:\d{2}/.test(tok)) {
          time = tok;
        }
      });

      if (code && (date || time)) {
        logs.push({
          employeeCode: code,
          date: formatDateStr(date || new Date()),
          time: formatTimeStr(time || '08:00'),
        });
      }
    }
  });

  return logs;
}

// Calculate monthly attendance deductions (KWD) per employee
export function calculateMonthlyAttendanceDeductions(
  attendanceList: AttendanceRecord[],
  employees: Employee[],
  contracts: Contract[],
  companyId: string,
  selectedMonth: string // YYYY-MM
): Record<string, { latenessMinutes: number; latenessDeductionKwd: number; absentDays: number; absenceDeductionKwd: number; totalDeductionKwd: number }> {
  const safeAttendance = attendanceList || [];
  const safeEmployees = employees || [];
  const safeContracts = contracts || [];

  const monthAttendance = safeAttendance.filter(
    a => a && a.companyId === companyId && a.date && a.date.startsWith(selectedMonth)
  );

  const deductionsMap: Record<string, { latenessMinutes: number; latenessDeductionKwd: number; absentDays: number; absenceDeductionKwd: number; totalDeductionKwd: number }> = {};

  const companyEmps = safeEmployees.filter(e => e && !e.isDeleted && e.companyId === companyId);

  companyEmps.forEach(emp => {
    const cnt = safeContracts.find(c => c && c.employeeId === emp.id);
    const basicSalary = cnt ? cnt.basicSalary : 800; // default 800 KWD
    const dailyWage = basicSalary / 26; // 26 working days under Kuwait Labor Law
    const hourlyRate = dailyWage / 8;  // 8 hours per day

    const empLogs = monthAttendance.filter(a => a && a.employeeId === emp.id);

    const totalLateMins = empLogs.reduce((sum, a) => sum + (a.latenessMinutes || 0), 0);
    const absentCount = empLogs.filter(a => a && a.status === 'ABSENT').length;

    // Lateness Penalty KWD: minutes * (hourly rate / 60)
    const latenessDedKwd = parseFloat((totalLateMins * (hourlyRate / 60)).toFixed(3));
    // Absence Penalty KWD: absent days * daily wage
    const absenceDedKwd = parseFloat((absentCount * dailyWage).toFixed(3));

    const totalDedKwd = parseFloat((latenessDedKwd + absenceDedKwd).toFixed(3));

    deductionsMap[emp.id] = {
      latenessMinutes: totalLateMins,
      latenessDeductionKwd: latenessDedKwd,
      absentDays: absentCount,
      absenceDeductionKwd: absenceDedKwd,
      totalDeductionKwd: totalDedKwd,
    };
  });

  return deductionsMap;
}
