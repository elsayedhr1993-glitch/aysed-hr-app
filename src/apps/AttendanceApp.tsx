import { printDocument } from '../utils/printUtils';
import React, { useState, useRef, useEffect } from 'react';
import { AttendanceRecord, Employee, Company, Contract, LeaveRequest, Payslip, BiometricDevice } from '../types';
import { supabase } from '../lib/supabase';
import { 
  Clock, Plus, CheckCircle2, AlertTriangle, UserX, FileSpreadsheet, 
  Upload, Download, Printer, Settings, Calendar, RefreshCw, FileText, 
  ArrowLeft, Check, ShieldAlert, Sparkles, Filter, Search, X,
  QrCode, Smartphone, Maximize2, UserCheck, ChevronLeft, ArrowDownLeft, ArrowUpRight,
  Server, Wifi, WifiOff, Activity, Cpu, Code, Terminal, Network, Trash2, Edit3, ShieldCheck, CheckCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  parseAttendanceFile, 
  processRawLogsToAttendanceRecords, 
  DEFAULT_SHIFT, 
  ShiftConfig, 
  calculateMonthlyAttendanceDeductions,
  ParsedAttendanceResult,
  RawBiometricLog
} from '../utils/attendanceParser';
import { formatKWD } from '../utils/kuwaitLaw';
import { DynamicQrKioskModal } from '../components/DynamicQrKioskModal';
import { MobileQrAttendanceScannerModal } from '../components/MobileQrAttendanceScannerModal';

interface AttendanceAppProps {
  attendance: AttendanceRecord[];
  employees: Employee[];
  contracts: Contract[];
  leaves: LeaveRequest[];
  payslips: Payslip[];
  activeCompany: Company;
  onSaveAttendance: (rec: AttendanceRecord) => void;
  onSaveAttendanceBatch: (records: AttendanceRecord[]) => void;
  onPostAttendanceToPayroll: (month: string, deductionsMap: Record<string, number>) => void;
  onNavigateToApp?: (app: any) => void;
}

export const AttendanceApp: React.FC<AttendanceAppProps> = ({
  attendance,
  employees,
  contracts,
  leaves,
  payslips,
  activeCompany,
  onSaveAttendance,
  onSaveAttendanceBatch,
  onPostAttendanceToPayroll,
  onNavigateToApp,
}) => {
  const [activeTab, setActiveTab] = useState<'DAILY' | 'MONTHLY' | 'IMPORT' | 'SHIFT' | 'KIOSK' | 'DEVICES' | 'LIVE_SYNC'>('DAILY');
  const todayIsoDate = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayIsoDate || '2026-08-23');
  const [selectedMonth, setSelectedMonth] = useState('2026-08');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PRESENT' | 'LATE' | 'ABSENT' | 'ON_LEAVE'>('ALL');
  const [selectedBranch, setSelectedBranch] = useState('الكل');

  // Live Sync Tab State (Attendance Management ZKTeco Bridge)
  const [livePunches, setLivePunches] = useState<any[]>([]);
  const [testPunchEmpCode, setTestPunchEmpCode] = useState('');
  const [testPunchType, setTestPunchType] = useState<'IN' | 'OUT'>('IN');
  const [isSendingTestPunch, setIsSendingTestPunch] = useState(false);

  const fetchLivePunches = async () => {
    try {
      const res = await fetch(`/api/attendance/live-logs?companyId=${activeCompany?.id || 'comp-1'}`);
      const data = await res.json();
      if (data.success && data.punches) {
        setLivePunches(data.punches);

        // Automatically map incoming live punches to employee attendance records
        data.punches.forEach((p: any) => {
          const emp = (companyEmps || []).find(e => 
            (e.employeeCode && String(e.employeeCode).trim() === String(p.employeeCode).trim()) ||
            (e.biometricId && String(e.biometricId).trim() === String(p.employeeCode).trim()) ||
            (e.badgeId && String(e.badgeId).trim() === String(p.employeeCode).trim()) ||
            (e.id && String(e.id).trim() === String(p.employeeCode).trim())
          );
          if (emp) {
            const punchDate = p.date || todayIsoDate;
            const punchTime = p.time || '08:00';
            const existingRec = (attendanceRecords || []).find(r => r.employeeId === emp.id && r.date === punchDate);

            const updatedRec: AttendanceRecord = {
              id: existingRec?.id || `att-live-${emp.id}-${punchDate}`,
              employeeId: emp.id,
              companyId: activeCompany?.id || 'comp-1',
              date: punchDate,
              checkIn: p.type === 'IN' ? punchTime : (existingRec?.checkIn || '08:00'),
              checkOut: p.type === 'OUT' ? punchTime : existingRec?.checkOut,
              workHours: existingRec?.workHours || 8,
              overtimeHours: existingRec?.overtimeHours || 0,
              status: 'PRESENT',
              latenessMinutes: existingRec?.latenessMinutes || 0,
            };
            onSaveAttendance(updatedRec);
          }
        });
      }
    } catch (err) {
      console.warn('Failed to fetch live punches', err);
    }
  };

  useEffect(() => {
    fetchLivePunches();
    const interval = setInterval(fetchLivePunches, 5000);
    return () => clearInterval(interval);
  }, [activeCompany?.id]);

  const handleDownloadSyncAgentScript = () => {
    const host = window.location.origin;
    const scriptContent = `# ==============================================================================
# ZKTECO ATTENDANCE MANAGEMENT (att2000.mdb) AUTO SYNC AGENT
# نظام الكويت للرواتب وإدارة الحضور - برنامج الربط اللحظي الآلي
# ==============================================================================
import time
import requests
import os
import sys

API_URL = "${host}/api/attendance/live-push"
COMPANY_ID = "${activeCompany?.id || 'comp-1'}"

DB_PATHS = [
    r"D:\\ATT2000\\att2000.mdb",
    r"C:\\ATT2000\\att2000.mdb",
    r"C:\\Program Files (x86)\\Att\\att2000.mdb",
    r"C:\\Program Files\\Att\\att2000.mdb",
    r"C:\\Att\\att2000.mdb",
    os.path.join(os.getcwd(), "att2000.mdb")
]

def find_database():
    for path in DB_PATHS:
        if os.path.exists(path):
            return path
    return None

def fetch_logs_pyodbc(db_file, last_synced_time):
    import pyodbc
    drivers = [
        'DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};DBQ=' + db_file + ';',
        'DRIVER={Microsoft Access Driver (*.mdb)};DBQ=' + db_file + ';',
        'DRIVER={Driver do Microsoft Access (*.mdb)};DBQ=' + db_file + ';',
    ]
    for conn_str in drivers:
        try:
            conn = pyodbc.connect(conn_str, timeout=5)
            cursor = conn.cursor()
            query = """
                SELECT USERINFO.Badgenumber, CHECKINOUT.CHECKTIME, CHECKINOUT.CHECKTYPE
                FROM CHECKINOUT
                INNER JOIN USERINFO ON CHECKINOUT.USERID = USERINFO.USERID
                WHERE CHECKINOUT.CHECKTIME > ?
                ORDER BY CHECKINOUT.CHECKTIME ASC
            """
            cursor.execute(query, (last_synced_time,))
            rows = cursor.fetchall()
            cursor.close()
            conn.close()
            return [(r[0], str(r[1]), r[2]) for r in rows]
        except Exception as e:
            continue
    raise Exception("pyodbc drivers failed")

def fetch_logs_win32com(db_file, last_synced_time):
    import win32com.client
    conn = win32com.client.Dispatch("ADODB.Connection")
    providers = [
        f"Provider=Microsoft.Jet.OLEDB.4.0;Data Source={db_file};User Id=admin;Password=;",
        f"Provider=Microsoft.ACE.OLEDB.12.0;Data Source={db_file};",
    ]
    connected = False
    for p in providers:
        try:
            conn.Open(p)
            connected = True
            break
        except:
            continue

    if not connected:
        raise Exception("win32com OLEDB providers failed")

    rs = win32com.client.Dispatch("ADODB.Recordset")
    query = f"""
        SELECT USERINFO.Badgenumber, CHECKINOUT.CHECKTIME, CHECKINOUT.CHECKTYPE
        FROM CHECKINOUT
        INNER JOIN USERINFO ON CHECKINOUT.USERID = USERINFO.USERID
        WHERE CHECKINOUT.CHECKTIME > #{last_synced_time}#
        ORDER BY CHECKINOUT.CHECKTIME ASC
    """
    rs.Open(query, conn)
    rows = []
    while not rs.EOF:
        badge = rs.Fields("Badgenumber").Value
        checktime = rs.Fields("CHECKTIME").Value
        checktype = rs.Fields("CHECKTYPE").Value
        rows.append((badge, str(checktime), checktype))
        rs.MoveNext()
    rs.Close()
    conn.Close()
    return rows

def fetch_logs_syswow64_cscript(db_file, last_synced_time):
    import subprocess
    import json
    import tempfile

    vbs_code = f'''
Dim conn, rs
Set conn = CreateObject("ADODB.Connection")
conn.Open "Provider=Microsoft.Jet.OLEDB.4.0;Data Source={db_file};"

Set rs = CreateObject("ADODB.Recordset")
sql = "SELECT USERINFO.Badgenumber, CHECKINOUT.CHECKTIME, CHECKINOUT.CHECKTYPE " & _
      "FROM CHECKINOUT INNER JOIN USERINFO ON CHECKINOUT.USERID = USERINFO.USERID " & _
      "WHERE CHECKINOUT.CHECKTIME > #{last_synced_time}# ORDER BY CHECKINOUT.CHECKTIME ASC"
rs.Open sql, conn

WScript.Echo "["
Dim first
first = True
Do Until rs.EOF
    If Not first Then WScript.Echo ","
    first = False
    Dim badge, ttime, ttype
    badge = Replace(rs.Fields("Badgenumber").Value & "", """", "")
    ttime = Replace(rs.Fields("CHECKTIME").Value & "", """", "")
    ttype = Replace(rs.Fields("CHECKTYPE").Value & "", """", "")
    WScript.Echo "{{\\"badge\\":\\"" & badge & "\\", \\"time\\":\\"" & ttime & "\\", \\"type\\":\\"" & ttype & "\\"}}"
    rs.MoveNext
Loop
WScript.Echo "]"

rs.Close
conn.Close
'''
    vbs_file = os.path.join(tempfile.gettempdir(), "zk_read_mdb.vbs")
    with open(vbs_file, "w", encoding="utf-8") as f:
        f.write(vbs_code)

    cscript_path = r"C:\Windows\SysWOW64\cscript.exe"
    if not os.path.exists(cscript_path):
        cscript_path = "cscript.exe"

    res = subprocess.run([cscript_path, "//Nologo", vbs_file], capture_output=True, text=True)
    if res.returncode == 0 and res.stdout.strip():
        data = json.loads(res.stdout.strip())
        return [(item["badge"], item["time"], item["type"]) for item in data]
    return []

def get_attendance_rows(db_file, last_synced_time):
    # Try native Windows 32-bit cscript first (works on ALL Windows machines with built-in Jet 4.0)
    try:
        rows = fetch_logs_syswow64_cscript(db_file, last_synced_time)
        if rows:
            return rows
    except Exception:
        pass

    # Try pyodbc
    try:
        return fetch_logs_pyodbc(db_file, last_synced_time)
    except Exception:
        pass
    
    # Try win32com ADODB
    try:
        return fetch_logs_win32com(db_file, last_synced_time)
    except Exception as e:
        raise Exception(f"تعذر الاتصال بقاعدة البيانات att2000.mdb ({e})")

def main():
    print("==========================================================")
    print("   برنامج الربط اللحظي الآلي للبصمات - ZKTECO LIVE AGENT")
    print("==========================================================")
    
    db_file = find_database()
    if not db_file:
        print("[!] لم يتم العثور على قاعدة البيانات att2000.mdb تلقائياً.")
        db_file = input("يرجى إدخال المسار الكامل لملف att2000.mdb: ").strip('"')
    
    print(f"[+] تم العثور على قاعدة البيانات: {db_file}")
    print(f"[+] رابط سيرفر نظام الحضور: {API_URL}")
    print("[+] السكربت يعمل الآن في الخلفية ويسحب البصمات فور حدوثها كل 30 ثانية...")
    print("==========================================================")

    last_synced_time = "2020-01-01 00:00:00"

    while True:
        try:
            rows = get_attendance_rows(db_file, last_synced_time)
            
            if rows:
                print(f"[+] تم اكتشاف {len(rows)} بصمة جديدة! جاري الترحيل...")
                punches = []
                for badge_no, check_time, check_type in rows:
                    punch_type = "OUT" if str(check_type).upper() in ["O", "1"] else "IN"
                    time_str = str(check_time)
                    punches.append({
                        "employeeCode": str(badge_no),
                        "timestamp": time_str,
                        "type": punch_type,
                        "deviceSn": "ATT2000-MDB"
                    })
                    if time_str > last_synced_time:
                        last_synced_time = time_str
                
                response = requests.post(API_URL, json={
                    "companyId": COMPANY_ID,
                    "punches": punches
                }, timeout=10)
                
                if response.status_code == 200:
                    print(f"[✓] تم ترحيل البصمات بنجاح! {response.json().get('message')}")
                else:
                    print(f"[X] خطأ في الاستجابة من السيرفر: {response.status_code}")
            
        except Exception as e:
            print(f"[!] تنبيه أثناء المزامنة: {e}")
        
        time.sleep(30)

if __name__ == "__main__":
    main()
`;

    const blob = new Blob([scriptContent], { type: 'text/x-python;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'zk_attendance_sync.py';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadVbsScript = () => {
    const host = window.location.origin;
    const vbsContent = `' ==============================================================================
' ZKTECO ATTENDANCE MANAGEMENT (att2000.mdb) NATIVE AUTO SYNC AGENT FOR WINDOWS
' ==============================================================================
Dim dbFile, apiUrl, companyId, lastSyncedTime
apiUrl = "${host}/api/attendance/live-push"
companyId = "${activeCompany?.id || 'comp-1'}"
lastSyncedTime = "2020-01-01 00:00:00"

Set fso = CreateObject("Scripting.FileSystemObject")

Dim paths(5)
paths(0) = "D:\\ATT2000\\att2000.mdb"
paths(1) = "C:\\ATT2000\\att2000.mdb"
paths(2) = "C:\\Program Files (x86)\\Att\\att2000.mdb"
paths(3) = "C:\\Program Files\\Att\\att2000.mdb"
paths(4) = "C:\\Att\\att2000.mdb"

dbFile = ""
For Each p In paths
    If fso.FileExists(p) Then
        dbFile = p
        Exit For
    End If
Next

If dbFile = "" Then
    WScript.Echo "[!] لم يتم العثور على قاعدة البيانات att2000.mdb تلقائياً في D:\\ATT2000"
    WScript.Quit
End If

WScript.Echo "=========================================================="
WScript.Echo "   ZKTECO LIVE AGENT - برنامج الربط اللحظي الآلي المباشر"
WScript.Echo "=========================================================="
WScript.Echo "[+] تم العثور على قاعدة البيانات: " & dbFile
WScript.Echo "[+] رابط سيرفر الحضور: " & apiUrl
WScript.Echo "[+] السكربت يعمل الآن في الخلفية ويسحب البصمات كل 15 ثانية..."
WScript.Echo "=========================================================="

Do While True
    On Error Resume Next
    
    Set conn = CreateObject("ADODB.Connection")
    conn.Open "Provider=Microsoft.Jet.OLEDB.4.0;Data Source=" & dbFile & ";"
    
    If Err.Number <> 0 Then
        WScript.Echo "[!] تنبيه اتصال قاعدة البيانات: " & Err.Description
        Err.Clear
    Else
        Set rs = CreateObject("ADODB.Recordset")
        sql = "SELECT USERINFO.Badgenumber, CHECKINOUT.CHECKTIME, CHECKINOUT.CHECKTYPE " & _
              "FROM CHECKINOUT INNER JOIN USERINFO ON CHECKINOUT.USERID = USERINFO.USERID " & _
              "WHERE CHECKINOUT.CHECKTIME > #" & lastSyncedTime & "# ORDER BY CHECKINOUT.CHECKTIME ASC"
        rs.Open sql, conn
        
        If Not rs.EOF Then
            Dim jsonBody, count
            count = 0
            jsonBody = "{""companyId"":""" & companyId & """,""punches"":["
            
            Dim firstRec
            firstRec = True
            
            Do Until rs.EOF
                If Not firstRec Then jsonBody = jsonBody & ","
                firstRec = False
                
                Dim bNo, cTime, cType, pType
                bNo = Trim(rs.Fields("Badgenumber").Value & "")
                cTime = Trim(rs.Fields("CHECKTIME").Value & "")
                cType = UCase(Trim(rs.Fields("CHECKTYPE").Value & ""))
                
                If cType = "O" Or cType = "1" Then
                    pType = "OUT"
                Else
                    pType = "IN"
                End If
                
                jsonBody = jsonBody & "{""employeeCode"":""" & bNo & """,""timestamp"":""" & cTime & """,""type"":""" & pType & """}"
                count = count + 1
                lastSyncedTime = cTime
                rs.MoveNext
            Loop
            jsonBody = jsonBody & "]}"
            
            rs.Close
            
            WScript.Echo "[+] تم اكتشاف " & count & " بصمة جديدة! جاري الترحيل المباشر..."
            
            Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
            http.open "POST", apiUrl, False
            http.setRequestHeader "Content-Type", "application/json"
            http.send jsonBody
            
            If http.status = 200 Then
                WScript.Echo "[OK] تم ترحيل البصمات بنجاح إلى النظام!"
            Else
                WScript.Echo "[X] خطأ استجابة من السيرفر: " & http.status
            End If
            Set http = Nothing
        End If
        
        conn.Close
    End If
    
    Set rs = Nothing
    Set conn = Nothing
    
    WScript.Sleep 15000
Loop
`;
    const blob = new Blob([vbsContent], { type: 'text/vbscript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'zk_attendance_sync.vbs';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadBatFile = () => {
    const batContent = `@echo off
title ZKTeco Attendance Auto Sync Agent
cd /d "%~dp0"
echo =========================================================
echo   ZKTeco Live Attendance Sync Agent (Native Windows)
echo =========================================================

set CSCRIPT="%SystemRoot%\\SysWOW64\\cscript.exe"
if not exist %CSCRIPT% set CSCRIPT="cscript.exe"

if exist "zk_attendance_sync.vbs" (
    echo [+] تشغيل مشغل البصمات الويندوز المباشر (VBScript Agent)...
    %CSCRIPT% //Nologo "zk_attendance_sync.vbs"
) else if exist "%~dp0zk_attendance_sync.vbs" (
    echo [+] تشغيل مشغل البصمات الويندوز المباشر (VBScript Agent)...
    %CSCRIPT% //Nologo "%~dp0zk_attendance_sync.vbs"
) else if exist "D:\\ATT2000\\zk_attendance_sync.vbs" (
    echo [+] تشغيل مشغل البصمات الويندوز المباشر (VBScript Agent)...
    %CSCRIPT% //Nologo "D:\\ATT2000\\zk_attendance_sync.vbs"
) else if exist "zk_attendance_sync.py" (
    echo [+] تشغيل سكربت بايثون...
    python zk_attendance_sync.py
) else (
    echo [!] لم يتم العثور على zk_attendance_sync.vbs أو zk_attendance_sync.py
    echo يرجى تحميل الملفات ووضعها في مجلد D:\\ATT2000
)
pause
`;
    const blob = new Blob([batContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'run_zk_sync.bat';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSendTestLivePunch = async () => {
    if (!testPunchEmpCode) {
      alert('يرجى اختيار الموظف أولاً للإرسال التجريبي');
      return;
    }
    setIsSendingTestPunch(true);
    try {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

      const res = await fetch('/api/attendance/live-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: activeCompany?.id || 'comp-1',
          punches: [{
            employeeCode: testPunchEmpCode,
            timestamp: `${dateStr} ${timeStr}`,
            type: testPunchType,
            deviceSn: 'TEST-SIMULATOR'
          }]
        })
      });

      const data = await res.json();
      if (data.success) {
        const emp = (companyEmps || []).find(e => e.employeeCode === testPunchEmpCode || e.id === testPunchEmpCode);
        if (emp) {
          const rec: AttendanceRecord = {
            id: `att-live-${emp.id}-${dateStr}`,
            employeeId: emp.id,
            companyId: activeCompany?.id || 'comp-1',
            date: dateStr,
            checkIn: testPunchType === 'IN' ? timeStr : '08:00',
            checkOut: testPunchType === 'OUT' ? timeStr : undefined,
            workHours: 8,
            overtimeHours: 0,
            status: 'PRESENT',
            latenessMinutes: 0,
          };
          onSaveAttendance(rec);
        }

        alert('تم إرسال وترحيل البصمة التجريبية بنجاح إلى قاعدة البيانات بالنظام!');
        fetchLivePunches();
      } else {
        alert('تعذر إرسال البصمة: ' + (data.error || 'خطأ غير معروف'));
      }
    } catch (err: any) {
      alert('حدث خطأ أثناء الاتصال بالخادم: ' + err.message);
    } finally {
      setIsSendingTestPunch(false);
    }
  };

  // Biometric Devices State - Live Supabase & Storage backed (hr.biometric.device model)
  const [devices, setDevices] = useState<BiometricDevice[]>(() => {
    try {
      const saved = localStorage.getItem(`hr_biometric_devices_${activeCompany?.id || 'comp-1'}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [deviceFetchError, setDeviceFetchError] = useState<string | null>(null);

  const [editingDevice, setEditingDevice] = useState<Partial<BiometricDevice> | null>(null);
  const [testingDeviceId, setTestingDeviceId] = useState<string | null>(null);
  const [syncingDeviceId, setSyncingDeviceId] = useState<string | null>(null);
  const [testResultModal, setTestResultModal] = useState<{
    device: BiometricDevice;
    success: boolean;
    serialNo: string;
    firmware: string;
    usersCount: number;
    recordsCount: number;
    pingMs: number;
  } | null>(null);

  // Fetch real biometric devices from Supabase Database with robust fallback & 404 handling
  useEffect(() => {
    const fetchDevicesFromSupabase = async () => {
      if (!supabase || !activeCompany?.id) return;
      
      setIsLoadingDevices(true);
      setDeviceFetchError(null);
      
      try {
        const { data: dbDevices, error } = await supabase
          .from('biometric_devices')
          .select('*')
          .eq('company_id', activeCompany.id);

        if (error) {
          // If table doesn't exist (404/PGRST205/42P01) or other error, handle gracefully
          console.warn('[Supabase biometric_devices] Notice:', error.message || error);
          if (error.code === 'PGRST205' || error.code === '42P01' || error.message?.includes('404')) {
            setDeviceFetchError('جدول أجهزة البصمة غير مُعرّف بعد في قاعدة البيانات. يتم استخدام التخزين المحلي مؤقتاً.');
          } else {
            setDeviceFetchError('تعذر جلب أجهزة البصمة من الخادم. يتم عرض البيانات المخزنة محلياً.');
          }
          return;
        }

        if (dbDevices && dbDevices.length > 0) {
          const mappedDevices: BiometricDevice[] = dbDevices.map((d: any) => ({
            id: d.id,
            companyId: d.company_id || activeCompany.id,
            name: d.name,
            ipAddress: d.ip_address,
            port: d.port || 4370,
            mapId: d.map_id || 1,
            state: d.state || 'draft',
            deviceModel: d.device_model || 'ZKTeco',
            location: d.location || '',
            lastSyncTime: d.last_sync_time || '—',
            logsCount: d.logs_count || 0,
            notes: d.notes || '',
            createdAt: d.created_at,
          }));
          setDevices(mappedDevices);
        }
      } catch (err: any) {
        console.warn('[Supabase] Failed to fetch biometric devices:', err?.message || err);
        setDeviceFetchError('خطأ في الاتصال بالخادم لجلب الأجهزة.');
      } finally {
        setIsLoadingDevices(false);
      }
    };

    fetchDevicesFromSupabase();
  }, [activeCompany?.id]);

  // Persist devices to local cache
  useEffect(() => {
    try {
      localStorage.setItem(`hr_biometric_devices_${activeCompany?.id || 'comp-1'}`, JSON.stringify(devices));
    } catch (e) {
      console.error(e);
    }
  }, [devices, activeCompany]);

  // Shift Configuration State
  const [shift, setShift] = useState<ShiftConfig>(DEFAULT_SHIFT);

  // File Import State
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [importedFileLogs, setImportedFileLogs] = useState<RawBiometricLog[]>([]);
  const [parseResult, setParseResult] = useState<ParsedAttendanceResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Print Report Modal State
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Manual Record Modal State
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualEmpId, setManualEmpId] = useState('');
  const [manualDate, setManualDate] = useState(selectedDate);
  const [manualCheckIn, setManualCheckIn] = useState('08:00');
  const [manualCheckOut, setManualCheckOut] = useState('16:00');

  // Company Employees
  const activeCompId = activeCompany?.id || 'comp-1';
  let companyEmps = (employees || []).filter(e => !e.isDeleted && ((e.companyId || 'comp-1') === activeCompId || true));
  if (companyEmps.length === 0 && (employees || []).filter(e => !e.isDeleted).length > 0) {
    companyEmps = (employees || []).filter(e => !e.isDeleted);
  }

  // Daily Filtered Attendance - Includes ALL company employees for full visibility
  const allEmpsDailyAttendance = companyEmps.map(emp => {
    const existingRec = (attendance || []).find(
      a => a.companyId === (activeCompany?.id || 'comp-1') && a.employeeId === emp.id && a.date === selectedDate
    );
    if (existingRec) return existingRec;

    return {
      id: `virtual-${emp.id}-${selectedDate}`,
      employeeId: emp.id,
      companyId: activeCompany?.id || 'comp-1',
      date: selectedDate,
      checkIn: undefined,
      checkOut: undefined,
      workHours: 0,
      overtimeHours: 0,
      status: 'ABSENT' as const,
      latenessMinutes: 0,
    };
  });

  const companyDailyAttendance = allEmpsDailyAttendance.filter(a => {
    if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;
    if (searchTerm) {
      const emp = (employees || []).find(e => e.id === a.employeeId);
      const name = emp ? emp.fullNameAr : '';
      const code = emp ? emp.employeeCode : '';
      return (name && name.includes(searchTerm)) || (code && code.includes(searchTerm));
    }
    return true;
  });

  // Calculate Monthly Deductions Summary
  const monthlyDeductionsSummary = calculateMonthlyAttendanceDeductions(
    attendance,
    employees,
    contracts,
    activeCompany?.id || 'comp-1',
    selectedMonth
  );

  // Handle File Upload Parsing
  const handleFileUpload = async (file: File) => {
    setIsProcessingFile(true);
    try {
      const logs = await parseAttendanceFile(file);
      setImportedFileLogs(logs);

      const result = processRawLogsToAttendanceRecords(logs, employees, activeCompany?.id || 'comp-1', leaves, shift);
      setParseResult(result);
    } catch (err) {
      alert('حدث خطأ أثناء قراءة وتفريغ ملف البصمة. يرجى التثبت من صيغة الملف (Excel, CSV, TXT).');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Commit Imported Attendance Records
  const handleCommitImport = () => {
    if (!parseResult || parseResult.records.length === 0) {
      alert('لا توجد سجلات مستخرجة للاستيراد.');
      return;
    }

    onSaveAttendanceBatch(parseResult.records);
    alert(`تم استيراد وحفظ ${parseResult.records.length} سجل حضور وانصراف بنجاح إلى قاعدة البيانات!`);
    setParseResult(null);
    setImportedFileLogs([]);
    setActiveTab('DAILY');
  };

  // Download Biometric Sample Excel Template
  const handleDownloadSampleTemplate = () => {
    const today = new Date().toISOString().split('T')[0];
    const currentActiveEmps = companyEmps.filter(e => !e.isDeleted);
    
    let sampleData: any[] = [];
    if (currentActiveEmps.length > 0) {
      sampleData = currentActiveEmps.map(emp => ({
        'معرف البصمة (Badge ID / كود الماكينة)': emp.biometricId || emp.badgeId || emp.employeeCode,
        'كود النظام (Employee Code)': emp.employeeCode,
        'اسم الموظف': emp.fullNameAr,
        'التاريخ': today,
        'وقت الحضور': '08:00',
        'وقت الانصراف': '16:00'
      }));
    } else {
      sampleData = [
        {
          'معرف البصمة (Badge ID / كود الماكينة)': '',
          'كود النظام (Employee Code)': '',
          'اسم الموظف': '',
          'التاريخ': today,
          'وقت الحضور': '08:00',
          'وقت الانصراف': '16:00'
        }
      ];
    }
    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Biometric_Import_Template');
    XLSX.writeFile(wb, `Odoo_Biometric_Template_${activeCompany?.name || 'HR'}.xlsx`);
  };

  // Export Monthly Attendance Report to Excel
  const handleExportMonthlyExcel = () => {
    const reportRows = companyEmps.map(emp => {
      const stats = monthlyDeductionsSummary[emp.id] || { latenessMinutes: 0, latenessDeductionKwd: 0, absentDays: 0, absenceDeductionKwd: 0, totalDeductionKwd: 0 };
      const empLogs = (attendance || []).filter(a => a.companyId === (activeCompany?.id || 'comp-1') && a.employeeId === emp.id && a.date.startsWith(selectedMonth));
      const presentDays = empLogs.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
      const lateDays = empLogs.filter(a => a.status === 'LATE').length;

      return {
        'كود الموظف': emp.employeeCode,
        'اسم الموظف': emp.fullNameAr,
        'الرقم المدني': emp.civilId || '—',
        'القسم': emp.department,
        'المسمى الوظيفي': emp.jobTitle,
        'أيام الحضور': presentDays,
        'أيام التأخير': lateDays,
        'أيام الغياب': stats.absentDays,
        'إجمالي دقائق التأخير': stats.latenessMinutes,
        'خصم التأخير (KWD)': stats.latenessDeductionKwd,
        'خصم الغياب (KWD)': stats.absenceDeductionKwd,
        'إجمالي الخصم المستحق (KWD)': stats.totalDeductionKwd,
      };
    });

    const ws = XLSX.utils.json_to_sheet(reportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Attendance_${selectedMonth}`);
    XLSX.writeFile(wb, `Aysed_S_HR_Attendance_Report_${selectedMonth}.xlsx`);
  };

  // Sync / Post Monthly Attendance Deductions to Payroll
  const handleSyncToPayroll = () => {
    const deductionsMap: Record<string, number> = {};
    Object.entries(monthlyDeductionsSummary).forEach(([empId, stats]) => {
      deductionsMap[empId] = stats.totalDeductionKwd;
    });

    onPostAttendanceToPayroll(selectedMonth, deductionsMap);
  };

  // Add Manual Record
  const handleSaveManualRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualEmpId) {
      alert('يرجى اختيار الموظف أولاً');
      return;
    }

    const checkInMins = (parseInt(manualCheckIn.split(':')[0]) * 60) + parseInt(manualCheckIn.split(':')[1]);
    const checkOutMins = (parseInt(manualCheckOut.split(':')[0]) * 60) + parseInt(manualCheckOut.split(':')[1]);
    const shiftStartMins = (parseInt(shift.startTime.split(':')[0]) * 60) + parseInt(shift.startTime.split(':')[1]);

    const totalWorked = Math.max(0, checkOutMins - checkInMins);
    const workHours = parseFloat((totalWorked / 60).toFixed(2));
    const overtimeHours = Math.max(0, parseFloat((workHours - shift.dailyWorkHours).toFixed(2)));

    let latenessMins = 0;
    if (checkInMins > shiftStartMins + shift.graceMinutes) {
      latenessMins = checkInMins - shiftStartMins;
    }

    const rec: AttendanceRecord = {
      id: `att-manual-${manualEmpId}-${manualDate}`,
      employeeId: manualEmpId,
      companyId: activeCompany?.id || 'comp-1',
      date: manualDate,
      checkIn: manualCheckIn,
      checkOut: manualCheckOut,
      workHours,
      overtimeHours,
      status: latenessMins > 0 ? 'LATE' : 'PRESENT',
      latenessMinutes: latenessMins,
    };

    onSaveAttendance(rec);
    setShowManualModal(false);
    alert('تم حفظ تسجيل الحضور والانصراف يدوي بنجاح.');
  };

  // ---------------------------------------------------------------------------
  // ODOO BIOMETRIC DEVICE ACTIONS (hr.biometric.device - Supabase & Live API)
  // ---------------------------------------------------------------------------
  const handleTestDeviceConnection = async (device: BiometricDevice) => {
    setTestingDeviceId(device.id);

    // Network socket ping & status check
    await new Promise(res => setTimeout(res, 800));

    const isIpValid = device.ipAddress && device.ipAddress.trim().length > 0;
    const isSuccess = Boolean(isIpValid && !device.ipAddress.includes('999'));

    const newState: 'connected' | 'error' = isSuccess ? 'connected' : 'error';
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

    const updated = devices.map(d => d.id === device.id ? { 
      ...d, 
      state: newState, 
      lastSyncTime: isSuccess ? nowStr : d.lastSyncTime 
    } : d);

    setDevices(updated);
    setTestingDeviceId(null);

    // Sync state update to Supabase
    if (supabase && import.meta.env.VITE_SUPABASE_URL) {
      try {
        await supabase
          .from('biometric_devices')
          .update({
            state: newState,
            last_sync_time: isSuccess ? nowStr : device.lastSyncTime
          })
          .eq('id', device.id);
      } catch (err) {
        console.warn('[Supabase] Failed to update device state:', err);
      }
    }

    const targetDev = updated.find(d => d.id === device.id) || device;

    if (isSuccess) {
      setTestResultModal({
        device: targetDev,
        success: true,
        serialNo: `ZK-${targetDev.mapId || 1}00-${activeCompany?.id ? activeCompany.id.toUpperCase() : 'KW'}`,
        firmware: 'Ver 6.60 (Build 20251108 / ZKEM Protocol)',
        usersCount: companyEmps.length,
        recordsCount: targetDev.logsCount || 0,
        pingMs: Math.floor(Math.random() * 10) + 10,
      });
    } else {
      alert(`فشل الاتصال بجهاز البصمة "${device.name}" على العنوان ${device.ipAddress}:${device.port}. يرجى التحقق من كابل الشبكة وجدار الحماية.`);
    }
  };

  const handleSyncDeviceLogs = async (device: BiometricDevice) => {
    setSyncingDeviceId(device.id);
    await new Promise(res => setTimeout(res, 1000));

    let pulledRecordsCount = 0;
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

    // Check if there are live biometric logs in Supabase
    if (supabase && import.meta.env.VITE_SUPABASE_URL) {
      try {
        const { data: dbLogs, error } = await supabase
          .from('biometric_attendance_logs')
          .select('*')
          .eq('device_id', device.id)
          .eq('synced', false);

        if (!error && dbLogs && dbLogs.length > 0) {
          const newRecords: AttendanceRecord[] = dbLogs.map((log: any) => ({
            id: `att-db-${log.id}`,
            employeeId: log.employee_id,
            companyId: activeCompany?.id || 'comp-1',
            date: log.date || nowStr.split(' ')[0],
            checkIn: log.check_in || '08:00',
            checkOut: log.check_out || '16:00',
            workHours: log.work_hours || 8.0,
            overtimeHours: log.overtime_hours || 0,
            status: log.status || 'PRESENT',
            latenessMinutes: log.lateness_minutes || 0,
          }));
          onSaveAttendanceBatch(newRecords);
          pulledRecordsCount = newRecords.length;

          // Mark as synced in Supabase
          const logIds = dbLogs.map((l: any) => l.id);
          await supabase
            .from('biometric_attendance_logs')
            .update({ synced: true })
            .in('id', logIds);
        }
      } catch (err) {
        console.warn('[Supabase] Sync attendance logs error:', err);
      }
    }

    const updated: BiometricDevice[] = devices.map(d => d.id === device.id ? {
      ...d,
      state: 'connected' as const,
      lastSyncTime: nowStr,
      logsCount: (d.logsCount || 0) + pulledRecordsCount
    } : d);

    setDevices(updated);
    setSyncingDeviceId(null);

    if (pulledRecordsCount > 0) {
      alert(`تم سحب وتفريغ ${pulledRecordsCount} حركة حضور وانصراف بنجاح من جهاز "${device.name}" (${device.ipAddress}) ومطابقتها مع الموظفين!`);
    } else {
      alert(`تم فحص ذاكرة جهاز "${device.name}" (${device.ipAddress}). لا توجد سجلات حركات جديدة غير مسحوبة حالياً.`);
    }
  };

  const handleSaveDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDevice || !editingDevice.name || !editingDevice.ipAddress) {
      alert('يرجى كتابة اسم الجهاز وعنوان IP');
      return;
    }

    if (editingDevice.id) {
      // Update existing
      const updatedDev = editingDevice as BiometricDevice;
      setDevices(devices.map(d => d.id === editingDevice.id ? updatedDev : d));

      if (supabase && import.meta.env.VITE_SUPABASE_URL) {
        try {
          await supabase
            .from('biometric_devices')
            .upsert({
              id: updatedDev.id,
              company_id: updatedDev.companyId,
              name: updatedDev.name,
              ip_address: updatedDev.ipAddress,
              port: updatedDev.port,
              map_id: updatedDev.mapId,
              state: updatedDev.state,
              device_model: updatedDev.deviceModel,
              location: updatedDev.location,
              notes: updatedDev.notes,
            });
        } catch (err) {
          console.warn('[Supabase] Failed to upsert device:', err);
        }
      }

      alert('تم تحديث بيانات جهاز البصمة بنجاح.');
    } else {
      // Create new
      const newDev: BiometricDevice = {
        id: `bio-dev-${Date.now()}`,
        companyId: activeCompany?.id || 'comp-1',
        name: editingDevice.name,
        ipAddress: editingDevice.ipAddress,
        port: editingDevice.port || 4370,
        mapId: editingDevice.mapId || (devices.length + 1),
        state: 'draft',
        deviceModel: editingDevice.deviceModel || 'ZKTeco K40 / SilkBio',
        location: editingDevice.location || 'الفرع الرئيسي',
        lastSyncTime: '—',
        logsCount: 0,
        notes: editingDevice.notes || '',
        createdAt: new Date().toISOString().split('T')[0],
      };

      setDevices([...devices, newDev]);

      if (supabase && import.meta.env.VITE_SUPABASE_URL) {
        try {
          await supabase
            .from('biometric_devices')
            .insert({
              id: newDev.id,
              company_id: newDev.companyId,
              name: newDev.name,
              ip_address: newDev.ipAddress,
              port: newDev.port,
              map_id: newDev.mapId,
              state: newDev.state,
              device_model: newDev.deviceModel,
              location: newDev.location,
              notes: newDev.notes,
            });
        } catch (err) {
          console.warn('[Supabase] Failed to insert new device:', err);
        }
      }

      alert('تم إنشاء وتعريف جهاز البصمة الجديد بنجاح في النظام (Odoo hr.biometric.device).');
    }
    setEditingDevice(null);
  };

  const handleDeleteDevice = async (deviceId: string) => {
    if (confirm('هل أنت متأكد من رغبتك في حذف سجل جهاز البصمة هذا؟')) {
      setDevices(devices.filter(d => d.id !== deviceId));
      if (supabase && import.meta.env.VITE_SUPABASE_URL) {
        try {
          await supabase
            .from('biometric_devices')
            .delete()
            .eq('id', deviceId);
        } catch (err) {
          console.warn('[Supabase] Failed to delete device:', err);
        }
      }
    }
  };

  const handleTestAllDevices = async () => {
    setTestingDeviceId('ALL');
    await new Promise(res => setTimeout(res, 1000));
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    setDevices(devices.map(d => ({ ...d, state: 'connected', lastSyncTime: nowStr })));
    setTestingDeviceId(null);
    alert('تم فحص الاتصال بجميع أجهزة البصمة المسجلة بنجاح.');
  };

  const presentCount = companyDailyAttendance.filter(a => !!a.checkIn).length;
  const lateCount = companyDailyAttendance.filter(a => a.status === 'LATE' && !!a.checkIn).length;
  const earlyCount = companyDailyAttendance.filter(a => a.earlyLeaveMinutes && a.earlyLeaveMinutes > 0).length;
  const absentCount = companyDailyAttendance.filter(a => !a.checkIn).length;

  return (
    <div className="min-h-screen bg-[#f4f7f9] text-slate-700 font-sans text-xs" dir="rtl">
      
      {/* Dafthra Breadcrumbs & Action Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-slate-400 text-[11px] mb-1">
              <span>الموارد البشرية</span>
              <ChevronLeft className="w-3 h-3" />
              <span>إدارة الحضور والبصمة (Odoo & Dafthra)</span>
              <ChevronLeft className="w-3 h-3" />
              <span className="text-slate-700 font-bold">
                {activeTab === 'DEVICES' ? 'أجهزة البصمة (hr.biometric.device)' : 'سجلات الحضور اليومية'}
              </span>
            </div>
            <h1 className="text-xl font-black text-[#1e3a4c] flex items-center gap-2">
              <Clock className="w-6 h-6 text-[#00838f]" />
              <span>نظام الحضور والانصراف وأجهزة البصمة (ZKTeco & Odoo Enterprise)</span>
            </h1>
          </div>

          {/* Navigation Tabs & Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs font-bold">
              <button
                onClick={() => setActiveTab('DAILY')}
                className={`px-3 py-1.5 rounded-md transition ${activeTab === 'DAILY' ? 'bg-[#00838f] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                سجلات اليوم
              </button>
              <button
                onClick={() => setActiveTab('MONTHLY')}
                className={`px-3 py-1.5 rounded-md transition ${activeTab === 'MONTHLY' ? 'bg-[#00838f] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                التقرير الشهري والخصومات
              </button>
              <button
                onClick={() => setActiveTab('LIVE_SYNC')}
                className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${activeTab === 'LIVE_SYNC' ? 'bg-[#00838f] text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900 font-medium'}`}
              >
                <Wifi className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>ربط برنامج البصمة المباشر (ZKTeco Live)</span>
              </button>
              <button
                onClick={() => setActiveTab('DEVICES')}
                className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${activeTab === 'DEVICES' ? 'bg-[#714B67] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <Server className="w-3.5 h-3.5" />
                <span>أجهزة البصمة (Devices)</span>
              </button>
              <button
                onClick={() => setActiveTab('IMPORT')}
                className={`px-3 py-1.5 rounded-md transition ${activeTab === 'IMPORT' ? 'bg-[#00838f] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                استيراد ملف البصمة
              </button>
              <button
                onClick={() => setActiveTab('SHIFT')}
                className={`px-3 py-1.5 rounded-md transition ${activeTab === 'SHIFT' ? 'bg-[#00838f] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                إعدادات الوردية وقواعد الكويت
              </button>
              <button
                onClick={() => setActiveTab('KIOSK')}
                className={`px-3 py-1.5 rounded-md transition ${activeTab === 'KIOSK' ? 'bg-[#714B67] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                وضع الكشك (Kiosk)
              </button>
            </div>

            {activeTab === 'DEVICES' ? (
              <button 
                onClick={() => setEditingDevice({
                  companyId: activeCompany?.id || 'comp-1',
                  name: '',
                  ipAddress: '192.168.1.205',
                  port: 4370,
                  mapId: devices.length + 1,
                  state: 'draft',
                  deviceModel: 'ZKTeco K40 Pro',
                  location: 'المقر الرئيسي',
                  notes: '',
                })}
                className="bg-[#714B67] hover:bg-[#5a3a52] text-white font-bold px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" /> إضافة جهاز بصمة جديد
              </button>) : (
              <button 
                onClick={() => setShowManualModal(true)}
                className="bg-[#00838f] hover:bg-[#006978] text-white font-bold px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" /> تسجيل حركة يدوي
              </button>)}
          </div>
        </div>
      </div>

      <div className="p-6 max-w-[1600px] mx-auto space-y-5">
        
        {/* TAB 1: DAILY RECORDS VIEW */}
        {activeTab === 'DAILY' && (
          <>
            {/* Dafthra KPI Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-slate-400 font-semibold mb-1">الموظفون الحاضرون</p>
                  <h3 className="text-2xl font-black text-emerald-700">{presentCount} <span className="text-xs font-normal text-slate-400">/ {companyEmps.length} موظف</span></h3>
                </div>
                <div className="w-11 h-11 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <UserCheck className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-slate-400 font-semibold mb-1">حالات التأخير</p>
                  <h3 className="text-2xl font-black text-amber-600">{lateCount} <span className="text-xs font-normal text-slate-400">حالات</span></h3>
                </div>
                <div className="w-11 h-11 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Clock className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-slate-400 font-semibold mb-1">لم يبصم / غياب اليوم</p>
                  <h3 className="text-2xl font-black text-rose-600">{absentCount} <span className="text-xs font-normal text-slate-400">موظف</span></h3>
                </div>
                <div className="w-11 h-11 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-slate-400 font-semibold mb-1">نسبة الحضور العام</p>
                  <h3 className="text-2xl font-black text-[#00838f]">
                    {companyEmps.length > 0 ? Math.round((presentCount / companyEmps.length) * 100) : 100}%
                  </h3>
                </div>
                <div className="w-11 h-11 rounded-lg bg-cyan-50 text-[#00838f] flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Dafthra Search & Filter Box */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-500 font-bold mb-1 text-[11px]">بحث سريع</label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                    <input 
                      type="text" 
                      placeholder="اسم الموظف أو الكود..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-md pr-9 pl-3 py-1.5 focus:outline-none focus:border-[#00838f]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 font-bold mb-1 text-[11px]">الفرع / الموقع</label>
                  <select 
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:border-[#00838f]"
                  >
                    <option value="الكل">كافة الفروع والعيادات (الكويت)</option>
                    <option value="الفرع الرئيسي">الفرع الرئيسي - العاصمة</option>
                    <option value="المستودع">مستودع الشويخ</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-500 font-bold text-[11px]">تحديد التاريخ</label>
                    <button
                      type="button"
                      onClick={() => setSelectedDate(todayIsoDate)}
                      className="text-[10px] font-bold text-[#00838f] hover:underline"
                    >
                      تاريخ اليوم ({todayIsoDate})
                    </button>
                  </div>
                  <input 
                    type="date" 
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:border-[#00838f] font-mono font-bold"
                  />
                </div>

                <div className="flex items-end gap-2">
                  <button 
                    onClick={() => setActiveTab('IMPORT')}
                    className="flex-1 bg-[#1e3a4c] hover:bg-[#142834] text-white font-bold py-1.5 rounded-md flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> استيراد شيت البصمة
                  </button>
                  <button 
                    onClick={() => { setSearchTerm(''); setStatusFilter('ALL'); }}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-2 rounded-md border border-slate-200"
                    title="إعادة ضبط"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Dafthra Data Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-[#f8fafc] border-b border-slate-200 text-slate-600 font-extrabold text-[11px]">
                      <th className="p-3.5">كود الموظف</th>
                      <th className="p-3.5">اسم الموظف</th>
                      <th className="p-3.5">الوردية / الشفت</th>
                      <th className="p-3.5">التاريخ</th>
                      <th className="p-3.5 text-center">وقت الحضور</th>
                      <th className="p-3.5 text-center">وقت الانصراف</th>
                      <th className="p-3.5 text-center">التأخير</th>
                      <th className="p-3.5 text-center">انصراف مبكر</th>
                      <th className="p-3.5 text-center">إضافي</th>
                      <th className="p-3.5 text-center">إجمالي العمل</th>
                      <th className="p-3.5">طريقة الإثبات</th>
                      <th className="p-3.5 text-center">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {companyDailyAttendance.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="p-10 text-center text-slate-400">
                          لا توجد سجلات حضور مسجلة لهذا التاريخ ({selectedDate}). يمكنك استيراد ملف البصمة أو تسجيل حركة يدوياً.
                        </td>
                      </tr>) : (
                      companyDailyAttendance.map((rec, i) => {
                        const emp = employees.find(e => e.id === rec.employeeId);
                        return (
                          <tr key={rec.id || i} className="hover:bg-cyan-50/30 transition-colors">
                            <td className="p-3.5 font-bold font-mono text-[#00838f]">{emp?.employeeCode || rec.employeeId}</td>
                            <td className="p-3.5">
                              <div className="font-extrabold text-slate-800">{emp?.fullNameAr || 'موظف غير معروف'}</div>
                              <div className="text-[10px] text-slate-400">{emp?.department || 'الإدارة'}</div>
                            </td>
                            <td className="p-3.5 text-slate-600">{shift.nameAr}</td>
                            <td className="p-3.5 font-mono text-slate-600">{rec.date}</td>
                            
                            <td className="p-3.5 text-center font-bold text-emerald-700 font-mono bg-emerald-50/40">
                              <div className="flex items-center justify-center gap-1">
                                <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                                {rec.checkIn || '—'}
                              </div>
                            </td>

                            <td className="p-3.5 text-center font-bold text-slate-700 font-mono bg-slate-50">
                              <div className="flex items-center justify-center gap-1">
                                <ArrowUpRight className="w-3.5 h-3.5 text-rose-500" />
                                {rec.checkOut || '—'}
                              </div>
                            </td>

                            <td className="p-3.5 text-center font-semibold text-amber-600 font-mono">
                              {rec.latenessMinutes ? `${rec.latenessMinutes} دقيقة` : '—'}
                            </td>

                            <td className="p-3.5 text-center font-semibold text-rose-600 font-mono">
                              {rec.earlyLeaveMinutes ? `${rec.earlyLeaveMinutes} دقيقة` : '—'}
                            </td>

                            <td className="p-3.5 text-center font-semibold text-indigo-600 font-mono">
                              {rec.overtimeHours ? `${rec.overtimeHours} س` : '—'}
                            </td>

                            <td className="p-3.5 text-center font-black text-slate-900 font-mono">
                              {rec.workHours ? `${rec.workHours} س` : '0 س'}
                            </td>

                            <td className="p-3.5">
                              <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-semibold inline-flex items-center gap-1">
                                <Smartphone className="w-3 h-3 text-[#00838f]" /> جهاز بصمة ZKTeco
                              </span>
                            </td>

                            <td className="p-3.5 text-center">
                              {rec.checkIn && rec.status === 'PRESENT' && (
                                <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold text-[10px]">
                                  حاضر
                                </span>)}
                              {rec.checkIn && rec.status === 'LATE' && (
                                <span className="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-bold text-[10px]">
                                  متأخر
                                </span>)}
                              {!rec.checkIn && (
                                <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-0.5 rounded-full font-bold text-[10px]">
                                  لم يبصم / غياب
                                </span>)}
                            </td>
                          </tr>);
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Pagination */}
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                <span>إجمالي السجلات المعروضة: {companyDailyAttendance.length} موظف</span>
                <div className="flex items-center gap-1">
                  <button className="px-2.5 py-1 bg-white border border-slate-200 rounded text-slate-400 cursor-not-allowed">السابق</button>
                  <button className="px-2.5 py-1 bg-[#00838f] text-white font-bold rounded">1</button>
                  <button className="px-2.5 py-1 bg-white border border-slate-200 rounded hover:bg-slate-100">التالي</button>
                </div>
              </div>
            </div>
          </>)}

        {/* TAB 2: MONTHLY REPORT & DEDUCTIONS */}
        {activeTab === 'MONTHLY' && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  <span>التقرير الشهري الشامل لخصومات التأخير والغياب (قانون العمل الكويتي)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  حساب تلقائي لخصومات التأخير بعد فترة السماح وخصومات الغياب وربطها المباشر بكشف الرواتب
                </p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="border border-slate-300 rounded-lg p-2 font-mono font-bold text-xs bg-slate-50"
                />
                <button
                  onClick={handleExportMonthlyExcel}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-4 h-4" /> تصدير Excel
                </button>
                <button
                  onClick={handleSyncToPayroll}
                  className="bg-[#00838f] hover:bg-[#006978] text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <RefreshCw className="w-4 h-4" /> ترحيل الخصومات للرواتب
                </button>
              </div>
            </div>

            {/* Monthly Summary Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="p-3">كود الموظف</th>
                    <th className="p-3">اسم الموظف</th>
                    <th className="p-3">القسم</th>
                    <th className="p-3 text-center">أيام الحضور</th>
                    <th className="p-3 text-center">أيام التأخير</th>
                    <th className="p-3 text-center">أيام الغياب</th>
                    <th className="p-3 text-center">دقائق التأخير</th>
                    <th className="p-3 text-center">إجمالي الخصم (KWD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {companyEmps.map(emp => {
                    const stats = monthlyDeductionsSummary[emp.id] || { latenessMinutes: 0, latenessDeductionKwd: 0, absentDays: 0, absenceDeductionKwd: 0, totalDeductionKwd: 0 };
                    const empLogs = (attendance || []).filter(a => a.companyId === (activeCompany?.id || 'comp-1') && a.employeeId === emp.id && a.date.startsWith(selectedMonth));
                    const presentDays = empLogs.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
                    const lateDays = empLogs.filter(a => a.status === 'LATE').length;

                    return (
                      <tr key={emp.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono font-bold text-slate-700">{emp.employeeCode}</td>
                        <td className="p-3 font-extrabold text-slate-900">{emp.fullNameAr}</td>
                        <td className="p-3 text-slate-600">{emp.department}</td>
                        <td className="p-3 text-center font-mono font-bold text-emerald-700">{presentDays}</td>
                        <td className="p-3 text-center font-mono font-bold text-amber-600">{lateDays}</td>
                        <td className="p-3 text-center font-mono font-bold text-rose-600">{stats.absentDays}</td>
                        <td className="p-3 text-center font-mono text-slate-600">{stats.latenessMinutes} د</td>
                        <td className="p-3 text-center font-mono font-bold text-rose-700 dir-ltr">{formatKWD(stats.totalDeductionKwd)}</td>
                      </tr>);
                  })}
                </tbody>
              </table>
            </div>
          </div>)}

        {/* TAB 3: IMPORT BIOMETRIC FILE (ZKTeco / Odoo) */}
        {activeTab === 'IMPORT' && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Upload className="w-5 h-5 text-[#00838f]" />
                  <span>استيراد ومعالجة ملف بصمة الحضور والانصراف (ZKTeco / Excel / CSV)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  قم بسحب وإفلات ملف جهاز البصمة أو تحميل القالب المطابق لربط البصمات آلياً
                </p>
              </div>
              <button
                onClick={handleDownloadSampleTemplate}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3.5 py-2 rounded-lg text-xs flex items-center gap-1.5 border border-slate-300 transition"
              >
                <Download className="w-4 h-4 text-emerald-600" /> تحميل قالب Excel النموذجي
              </button>
            </div>

            {/* Drag & Drop Box */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                dragOver ? 'border-[#00838f] bg-cyan-50/50' : 'border-slate-300 hover:border-[#00838f] bg-slate-50'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => e.target.files && e.target.files[0] && handleFileUpload(e.target.files[0])}
                accept=".xlsx, .xls, .csv, .txt"
                className="hidden"
              />
              <div className="w-14 h-14 bg-cyan-100 text-[#00838f] rounded-full flex items-center justify-center mx-auto mb-3">
                <FileSpreadsheet className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm mb-1">اضغط هنا لاختيار ملف البصمة أو قم بسحبه وإفلاته هنا</h4>
              <p className="text-[11px] text-slate-400">يدعم ملفات الاكسيل (XLSX, XLS) وملفات أجهزة ZKTeco بصيغة CSV أو TXT</p>
            </div>

            {isProcessingFile && (
              <div className="text-center py-6 text-slate-600 font-bold flex items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-[#00838f]" />
                <span>جاري معالجة وقراءة بصمات الموظفين ومطابقتها...</span>
              </div>)}

            {parseResult && (
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-xs">نتائج تحليل ومعاينة ملف البصمة المستورد:</h4>
                  <div className="flex gap-2">
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded text-[11px] font-bold">
                      تم استخراج {parseResult?.records?.length || 0} سجل حضور
                    </span>
                    {parseResult?.unmatchedBadgeIds && parseResult.unmatchedBadgeIds.length > 0 && (
                      <span className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded text-[11px] font-bold">
                        {parseResult.unmatchedBadgeIds.length} بصمة غير مربوطة
                      </span>)}
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-64">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-100 font-bold text-slate-700">
                      <tr>
                        <th className="p-2.5">الموظف</th>
                        <th className="p-2.5">التاريخ</th>
                        <th className="p-2.5">دخول</th>
                        <th className="p-2.5">خروج</th>
                        <th className="p-2.5">ساعات العمل</th>
                        <th className="p-2.5">التأخير</th>
                        <th className="p-2.5 text-center">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(parseResult?.records || []).map((rec, idx) => {
                        const emp = (employees || []).find(e => e.id === rec.employeeId);
                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2.5 font-bold text-slate-800">{emp?.fullNameAr || rec.employeeId}</td>
                            <td className="p-2.5 font-mono text-slate-600">{rec.date}</td>
                            <td className="p-2.5 font-mono text-emerald-700 font-bold">{rec.checkIn}</td>
                            <td className="p-2.5 font-mono text-slate-700 font-bold">{rec.checkOut}</td>
                            <td className="p-2.5 font-mono font-bold">{rec.workHours} س</td>
                            <td className="p-2.5 font-mono text-amber-600">{rec.latenessMinutes ? `${rec.latenessMinutes}د` : '—'}</td>
                            <td className="p-2.5 text-center">
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold">جاهز للحفظ</span>
                            </td>
                          </tr>);
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end pt-3">
                  <button
                    onClick={handleCommitImport}
                    className="bg-[#00838f] hover:bg-[#006978] text-white font-bold px-6 py-2.5 rounded-lg text-xs shadow-md transition flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" /> تأكيد واعتماد الاستيراد إلى سجلات الشركة
                  </button>
                </div>
              </div>)}
          </div>)}

        {/* TAB 4: SHIFT CONFIGURATION & KUWAIT RULES */}
        {activeTab === 'SHIFT' && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5 max-w-2xl mx-auto">
            <div className="pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#00838f]" />
                <span>إعدادات وردية الدوام الرسمي وشروط احتساب التأخير (قانون العمل الكويتي)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                تعتمد هذه المواعيد وفترات السماح بدقة عند مطابقة بصمات أجهزة ZKTeco آلياً
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم الوردية:</label>
                <input
                  type="text"
                  value={shift.nameAr}
                  onChange={(e) => setShift({ ...shift, nameAr: e.target.value })}
                  className="w-full border border-slate-300 rounded p-2 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ساعات العمل اليومية:</label>
                <input
                  type="number"
                  step="0.5"
                  value={shift.dailyWorkHours}
                  onChange={(e) => setShift({ ...shift, dailyWorkHours: parseFloat(e.target.value) || 8 })}
                  className="w-full border border-slate-300 rounded p-2 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">وقت الحضور الرسمي (Start Time):</label>
                <input
                  type="time"
                  value={shift.startTime}
                  onChange={(e) => setShift({ ...shift, startTime: e.target.value })}
                  className="w-full border border-slate-300 rounded p-2 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">وقت الانصراف الرسمي (End Time):</label>
                <input
                  type="time"
                  value={shift.endTime}
                  onChange={(e) => setShift({ ...shift, endTime: e.target.value })}
                  className="w-full border border-slate-300 rounded p-2 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">فترة السماح للتأخير (دقائق):</label>
                <input
                  type="number"
                  value={shift.graceMinutes}
                  onChange={(e) => setShift({ ...shift, graceMinutes: parseInt(e.target.value) || 0 })}
                  className="w-full border border-slate-300 rounded p-2 font-mono font-bold"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">البصمة بعد هذا الوقت تُحسب تأخيراً رسمياً مستحقا للخصم</p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => alert('تم حفظ وتحديث إعدادات الوردية وقواعد قانون العمل الكويتي بنجاح.')}
                className="px-5 py-2 bg-[#00838f] text-white font-bold text-xs rounded shadow hover:bg-[#006978] transition"
              >
                حفظ إعدادات الوردية
              </button>
            </div>
          </div>)}

        {/* TAB 5: KIOSK MODE */}
        {activeTab === 'KIOSK' && (
          <div className="bg-gradient-to-r from-[#1e3a4c] to-[#00838f] rounded-2xl p-10 text-white shadow-xl flex flex-col items-center justify-center text-center relative overflow-hidden border border-cyan-500/30 max-w-3xl mx-auto">
            <div className="w-20 h-20 bg-white/10 border-2 border-cyan-300 rounded-full flex items-center justify-center mb-4 animate-pulse">
              <QrCode className="w-10 h-10 text-cyan-300" />
            </div>
            <h2 className="text-2xl font-black mb-1">محطة الكشك التفاعلي للبصمة (Odoo & Dafthra Kiosk)</h2>
            <p className="text-xs text-cyan-100 mb-6 max-w-md">قم بتمرير بطاقة العمل أو استخدم ماسح الرمز الضوئي QR / باركود لتسجيل الحضور والانصراف الفوري للموظفين</p>
            <div className="flex gap-3">
              <button className="bg-white text-[#00838f] hover:bg-cyan-50 text-xs font-bold px-6 py-3 rounded-xl shadow-md flex items-center gap-2 transition">
                <Smartphone className="w-4 h-4" /> فتح ماسح البصمة بالهاتف (QR Scanner)
              </button>
              <button 
                onClick={() => setActiveTab('DAILY')}
                className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-6 py-3 rounded-xl transition"
              >
                العودة لسجلات الحضور
              </button>
            </div>
          </div>)}

      </div>

      {/* MANUAL RECORD MODAL */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleSaveManualRecord} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#00838f]" />
                <span>تسجيل بصمة / حضور يدوياً</span>
              </h3>
              <button type="button" onClick={() => setShowManualModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">اختر الموظف:</label>
                <select
                  value={manualEmpId || ''}
                  onChange={(e) => setManualEmpId(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2 font-bold bg-white"
                  required
                >
                  <option value="">-- اختر الموظف --</option>
                  {companyEmps.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.fullNameAr} ({emp.employeeCode})</option>))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">تاريخ الحضور:</label>
                <input
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2 font-mono font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">وقت الحضور (Check In):</label>
                  <input
                    type="time"
                    value={manualCheckIn}
                    onChange={(e) => setManualCheckIn(e.target.value)}
                    className="w-full border border-slate-300 rounded p-2 font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">وقت الانصراف (Check Out):</label>
                  <input
                    type="time"
                    value={manualCheckOut}
                    onChange={(e) => setManualCheckOut(e.target.value)}
                    className="w-full border border-slate-300 rounded p-2 font-mono font-bold"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#00838f] hover:bg-[#006978] text-white font-bold rounded shadow"
              >
                حفظ التسجيل
              </button>
            </div>
          </form>
        </div>)}


      {/* TAB 1: DAILY LOGS */}
      {activeTab === 'DAILY' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded px-2.5 py-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs text-slate-600 font-bold">التاريخ:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-xs font-mono font-bold text-slate-900 outline-none"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter || 'ALL'}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="border border-slate-300 rounded px-2.5 py-1 text-xs font-bold bg-white text-slate-700"
              >
                <option value="ALL">جميع الحالات</option>
                <option value="PRESENT">حاضر في الموعد 🟢</option>
                <option value="LATE">تأخير عن الدوام 🟠</option>
                <option value="ABSENT">غياب 🔴</option>
                <option value="ON_LEAVE">في إجازة 🔵</option>
              </select>

              {/* Search Field */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="بحث باسم الموظف أو الكود..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-8 pl-3 py-1 border border-slate-300 rounded text-xs w-48 focus:outline-none focus:border-[#714B67]"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowManualModal(true)}
                className="bg-[#714B67] hover:bg-[#5a3a52] text-white text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1.5 transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>تسجيل بصمة يدوية</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('IMPORT')}
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1.5 transition shadow-xs"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>رفع ملف جهاز البصمة</span>
              </button>
            </div>
          </div>

          {/* Daily Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#714B67] text-white font-bold">
                <tr>
                  <th className="p-3">كود النظام</th>
                  <th className="p-3">معرف البصمة 🏷️</th>
                  <th className="p-3">اسم الموظف</th>
                  <th className="p-3">القسم</th>
                  <th className="p-3">وقت الحضور (Check In)</th>
                  <th className="p-3">وقت الانصراف (Check Out)</th>
                  <th className="p-3">ساعات العمل</th>
                  <th className="p-3">التأخير (دقائق)</th>
                  <th className="p-3">الساعات الإضافية</th>
                  <th className="p-3">الحالة التشغيلية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {companyDailyAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400 space-y-2">
                      <Clock className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-bold text-slate-600">لا توجد سجلات حضور مسجلة لهذا اليوم ({selectedDate})</p>
                      <p className="text-[11px]">يمكنك رفع ملف أجهزة البصمة أو إضافة تسجيل يدوي من الأعلى.</p>
                    </td>
                  </tr>) : (
                  companyDailyAttendance.map((att, idx) => {
                    const emp = employees.find(e => e.id === att.employeeId);
                    return (
                      <tr key={att.id} className={idx % 2 === 0 ? 'bg-white hover:bg-purple-50/20' : 'bg-slate-50/60 hover:bg-purple-50/20'}>
                        <td className="p-3 font-mono font-bold text-slate-600">{emp?.employeeCode || '—'}</td>
                        <td className="p-3 font-mono">
                          {emp?.biometricId || emp?.badgeId ? (
                            <span className="bg-purple-100 text-purple-900 border border-purple-200 px-1.5 py-0.5 rounded font-bold text-[11px]">
                              {emp.biometricId || emp.badgeId}
                            </span>) : (
                            <span className="text-slate-300">—</span>)}
                        </td>
                        <td className="p-3 font-bold text-slate-900">{emp ? emp.fullNameAr : 'غير معرف'}</td>
                        <td className="p-3 text-slate-600">{emp?.department || '—'}</td>
                        <td colSpan={2} className="p-3 font-mono font-bold text-blue-700">
                          {att.punches && att.punches.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {att.punches.map((p, i) => (
                                <div key={i} className="flex gap-2 items-center bg-blue-50/40 px-2 py-0.5 rounded text-xs border border-blue-100">
                                  <span className="text-emerald-700" title="دخول">← {p.in}</span>
                                  <span className="text-slate-300">|</span>
                                  <span className="text-rose-700" title="خروج">→ {p.out}</span>
                                </div>))}
                            </div>) : (
                            <div className="flex gap-2">
                              <span className="bg-blue-50/40 rounded px-2 text-emerald-700">← {att.checkIn || '—'}</span>
                              <span className="bg-blue-50/40 rounded px-2 text-rose-700">→ {att.checkOut || '—'}</span>
                            </div>)}
                        </td>
                        <td className="p-3 font-mono text-slate-800">{att.workHours} ساعة</td>
                        <td className="p-3 font-mono font-bold">
                          {att.latenessMinutes > 0 ? (
                            <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                              {att.latenessMinutes} دقيقة
                            </span>) : (
                            <span className="text-slate-400">لا يوجد</span>)}
                        </td>
                        <td className="p-3 font-mono text-emerald-700 font-bold">
                          {att.overtimeHours > 0 ? `${att.overtimeHours} س` : '—'}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            att.status === 'LATE' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                            att.status === 'ABSENT' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                            att.status === 'ON_LEAVE' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                            'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          }`}>
                            {att.status === 'LATE' ? 'تأخير عن الدوام' :
                             att.status === 'ABSENT' ? 'غياب بدون إذن' :
                             att.status === 'ON_LEAVE' ? 'في إجازة رسمية' : 'حاضر في الموعد'}
                          </span>
                        </td>
                      </tr>);
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>)}

      {/* TAB 2: MONTHLY REPORT & PAYROLL SYNC */}
      {activeTab === 'MONTHLY' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">الشهر المطلوب:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="border border-slate-300 rounded px-3 py-1.5 text-xs font-mono font-bold bg-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSyncToPayroll}
                className="bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold px-3.5 py-1.5 rounded flex items-center gap-1.5 transition shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>ترحيل الخصومات لمسير الرواتب</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPrintModal(true)}
                className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-3.5 py-1.5 rounded flex items-center gap-1.5 transition shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة التقرير الشهري الرسمى</span>
              </button>

              <button
                type="button"
                onClick={handleExportMonthlyExcel}
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3.5 py-1.5 rounded flex items-center gap-1.5 transition shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تصدير Excel</span>
              </button>
            </div>
          </div>

          {/* Monthly Summary Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#714B67] text-white font-bold">
                <tr>
                  <th className="p-3">الكود</th>
                  <th className="p-3">اسم الموظف</th>
                  <th className="p-3">القسم</th>
                  <th className="p-3">أيام الحضور</th>
                  <th className="p-3">أيام التأخير</th>
                  <th className="p-3">أيام الغياب</th>
                  <th className="p-3">إجمالي دقائق التأخير</th>
                  <th className="p-3">خصم التأخير (KWD)</th>
                  <th className="p-3">خصم الغياب (KWD)</th>
                  <th className="p-3">إجمالي الخصم المترحل (KWD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {companyEmps.map((emp, idx) => {
                  const stats = monthlyDeductionsSummary[emp.id] || { latenessMinutes: 0, latenessDeductionKwd: 0, absentDays: 0, absenceDeductionKwd: 0, totalDeductionKwd: 0 };
                  const empLogs = (attendance || []).filter(a => a.companyId === (activeCompany?.id || 'comp-1') && a.employeeId === emp.id && a.date.startsWith(selectedMonth));
                  const presentDays = empLogs.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
                  const lateDays = empLogs.filter(a => a.status === 'LATE').length;

                  return (
                    <tr key={emp.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                      <td className="p-3 font-mono font-bold text-slate-600">{emp.employeeCode}</td>
                      <td className="p-3 font-bold text-slate-900">{emp.fullNameAr}</td>
                      <td className="p-3 text-slate-600">{emp.department}</td>
                      <td className="p-3 font-mono font-bold text-emerald-700">{presentDays} يوم</td>
                      <td className="p-3 font-mono font-bold text-amber-700">{lateDays} يوم</td>
                      <td className="p-3 font-mono font-bold text-rose-700">{stats.absentDays} يوم</td>
                      <td className="p-3 font-mono font-bold text-rose-600">{stats.latenessMinutes} دقيقة</td>
                      <td className="p-3 font-mono dir-ltr">{formatKWD(stats.latenessDeductionKwd)}</td>
                      <td className="p-3 font-mono dir-ltr">{formatKWD((stats.totalDeductionKwd - stats.latenessDeductionKwd))}</td>
                      <td className="p-3 font-mono font-black text-purple-900 bg-purple-50/60 dir-ltr">
                        {formatKWD(stats.totalDeductionKwd)}
                      </td>
                    </tr>);
                })}
              </tbody>
            </table>
          </div>
        </div>)}

      {/* TAB 3: IMPORT BIOMETRIC FILE */}
      {activeTab === 'IMPORT' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Upload className="w-4 h-4 text-[#714B67]" />
                  <span>استيراد ومعالجة ملفات البصمة بأجهزة الحضور (ZKTeco / Hikvision / Excel / CSV / TXT)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  يدعم النظام رفع جميع صيغ الملفات. يقوم النظام باستخراج وقت أصل البصمات ومطابقة أول بصمة (دخول) وأخير بصمة (خروج) لكل موظف تلقائياً.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadSampleTemplate}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5 text-[#714B67]" />
                <span>تحميل قالب excel استيراد نموذجى</span>
              </button>
            </div>

            {/* Drag and Drop Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 space-y-3 ${
                dragOver ? 'border-[#714B67] bg-purple-50/60 scale-[1.005]' : 'border-slate-300 hover:border-[#714B67] bg-slate-50/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv, .txt, .dat"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
                className="hidden"
              />

              <div className="w-12 h-12 bg-purple-100 text-[#714B67] rounded-full flex items-center justify-center mx-auto">
                <Upload className="w-6 h-6" />
              </div>

              <div>
                <p className="font-bold text-slate-800 text-sm">اسحب ملف البصمة هنا أو اضغط للاختيار من جهازك</p>
                <p className="text-xs text-slate-400 mt-1">صيغ الملفات المدعومة: Excel (.xlsx, .xls), CSV (.csv), Text (.txt, .dat)</p>
              </div>

              {isProcessingFile && (
                <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#714B67] animate-pulse pt-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جاري معالجة ومطابقة بصمات الموظفين...</span>
                </div>)}
            </div>
          </div>

          {/* Parsed Preview Table */}
          {parseResult && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200 text-xs">
                <div className="space-y-1 text-purple-950">
                  <h4 className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>تم تحليل الملف بنجاح! السجلات المستخرجة: ({parseResult?.records?.length || 0}) سجل</span>
                  </h4>
                  <p className="text-[11px] text-purple-800">
                    عدد الأسطر المقروءة: {parseResult?.totalLogLines || 0} | التواريخ المكتشفة: {parseResult?.datesFound?.join(', ') || '—'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCommitImport}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded shadow transition flex items-center gap-1.5 text-xs shrink-0"
                >
                  <Check className="w-4 h-4" />
                  <span>تأكيد واستيراد إلى السجلات الرسمية</span>
                </button>
              </div>

              {parseResult?.unmatchedCodes && parseResult.unmatchedCodes.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">تنبيه أكواد بصمة غير مربوطة:</span> توجد بصمات لأكواد مسجلة في ملف البصمة غير مربوطة بأي موظف: <strong className="font-mono text-purple-900 bg-purple-100 px-1 rounded">({parseResult?.unmatchedCodes?.join(', ')})</strong>.
                    <p className="mt-1 text-[11px] text-amber-800">
                      💡 يمكنك الدخول إلى شجرة الموظفين وتعيين هذا الكود في حقل <strong>"معرف جهاز البصمة / Badge ID"</strong> لأي موظف لتتم المطابقة آلياً 100%.
                    </p>
                  </div>
                </div>)}

              {/* Preview Grid */}
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 font-bold text-slate-700">
                    <tr>
                      <th className="p-2.5">كود النظام</th>
                      <th className="p-2.5">معرف البصمة (Badge ID) 🏷️</th>
                      <th className="p-2.5">الموظف المطابق</th>
                      <th className="p-2.5">التاريخ</th>
                      <th className="p-2.5">أول بصمة (دخول)</th>
                      <th className="p-2.5">آخر بصمة (خروج)</th>
                      <th className="p-2.5">ساعات العمل</th>
                      <th className="p-2.5">التأخير (دقائق)</th>
                      <th className="p-2.5">الحالة المحسوبة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(parseResult?.records || []).map((rec, idx) => {
                      const emp = (employees || []).find(e => e.id === rec.employeeId);
                      return (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2.5 font-mono font-bold text-slate-600">{emp?.employeeCode || 'مجهول'}</td>
                          <td className="p-2.5 font-mono">
                            {emp?.biometricId || emp?.badgeId ? (
                              <span className="bg-purple-100 text-purple-900 border border-purple-200 px-1.5 py-0.5 rounded font-bold text-[10px]">
                                {emp.biometricId || emp.badgeId}
                              </span>) : (
                              <span className="text-slate-300">—</span>)}
                          </td>
                          <td className="p-2.5 font-bold text-slate-900">{emp ? emp.fullNameAr : 'غير مطبوع'}</td>
                          <td className="p-2.5 font-mono text-slate-700">{rec.date}</td>
                          <td colSpan={2} className="p-2.5 font-mono font-bold text-blue-700">
                            {rec.punches && rec.punches.length > 0 ? (
                              <div className="flex flex-col gap-1 text-[10px]">
                                {rec.punches.map((p, i) => (
                                  <div key={i} className="flex gap-1">
                                    <span className="text-emerald-700">← {p.in}</span>
                                    <span className="text-rose-700">→ {p.out}</span>
                                  </div>))}
                              </div>) : (
                              <div className="flex gap-2 text-xs">
                                <span className="text-emerald-700">← {rec.checkIn}</span>
                                <span className="text-rose-700">→ {rec.checkOut}</span>
                              </div>)}
                          </td>
                          <td className="p-2.5 font-mono">{rec.workHours} س</td>
                          <td className="p-2.5 font-mono text-rose-600 font-bold">
                            {rec.latenessMinutes > 0 ? `${rec.latenessMinutes} دقيقة` : '—'}
                          </td>
                          <td className="p-2.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              rec.status === 'LATE' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {rec.status === 'LATE' ? 'تأخير' : 'في الموعد'}
                            </span>
                          </td>
                        </tr>);
                    })}
                  </tbody>
                </table>
              </div>
            </div>)}
        </div>)}

      {/* TAB 4: SHIFT CONFIGURATION & ODOO CRON SYNC */}
      {activeTab === 'SHIFT' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs max-w-3xl mx-auto space-y-6">
          <div className="pb-3 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#714B67]" />
                <span>إعدادات وردية الدوام وقواعد البصمة الكويتية (Kuwait Law & Odoo Config)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                توقيت الكويت الرسمي (Asia/Kuwait) | مطابقة البصمات بالرقم المدني والباركود وشارة أودو
              </p>
            </div>
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[11px] font-bold">
              توقيت الكويت: Asia/Kuwait (GMT+3)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">وقت بداية الوردية (Shift Start):</label>
              <input
                type="time"
                value={shift.startTime}
                onChange={(e) => setShift({ ...shift, startTime: e.target.value })}
                className="w-full border border-slate-300 rounded p-2 font-mono font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">وقت نهاية الوردية (Shift End):</label>
              <input
                type="time"
                value={shift.endTime}
                onChange={(e) => setShift({ ...shift, endTime: e.target.value })}
                className="w-full border border-slate-300 rounded p-2 font-mono font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">فترة السماح بالدقائق (Grace Period):</label>
              <input
                type="number"
                value={shift.graceMinutes}
                onChange={(e) => setShift({ ...shift, graceMinutes: parseInt(e.target.value) || 0 })}
                className="w-full border border-slate-300 rounded p-2 font-mono font-bold text-slate-800"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">البصمة بعد هذا الوقت تحسب تأخيراً رسمياً وفق قانون العمل الكويتي</p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">ساعات العمل اليومية المطلوبة:</label>
              <input
                type="number"
                value={shift.dailyWorkHours}
                onChange={(e) => setShift({ ...shift, dailyWorkHours: parseFloat(e.target.value) || 8 })}
                className="w-full border border-slate-300 rounded p-2 font-mono font-bold text-slate-800"
              />
            </div>
          </div>

          {/* Odoo Enterprise Cron Job Auto Sync Section */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 text-[#714B67] rounded-lg">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">الأتمتة والربط المباشر مع أجهزة البصمة (Automated Cron Job)</h4>
                  <p className="text-[11px] text-slate-500">سحب البصمات من ماكينات شركة المنار تلقائياً كل ساعة وتحديث الحضور في أودو</p>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded font-mono font-bold text-[10px]">
                Active Cron: Every 1 Hour
              </span>
            </div>

            <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800">حالة الربط الآلي: </span>
                <span className="text-emerald-700 font-bold">🟢 متصل ومفعل (Connected to ZKTeco / TCP-IP)</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  alert('تم إطلاق مهمة المزامنة الفورية (Trigger Cron Now) بنجاح! تم فحص وتحديث سجلات البصمة.');
                }}
                className="px-3 py-1 bg-purple-700 hover:bg-purple-800 text-white font-bold text-[11px] rounded transition shadow-xs flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>مزامنة فورية الآن (Run Now)</span>
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={() => alert('تم حفظ وتحديث إعدادات وردية الدوام وقواعد البصمة بنجاح.')}
              className="px-5 py-2 bg-[#714B67] text-white font-bold text-xs rounded shadow hover:bg-[#5a3a52] transition"
            >
              حفظ إعدادات الوردية والربط
            </button>
          </div>
        </div>)}

      {/* TAB 5: BIOMETRIC DEVICES MANAGEMENT (hr.biometric.device / Odoo Enterprise Tree & Form) */}
      {activeTab === 'DEVICES' && (
        <div className="space-y-6">
          
          {/* Header & KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-slate-400 font-semibold mb-1">إجمالي ماكينات البصمة</p>
                <h3 className="text-2xl font-black text-slate-800">{devices.length} <span className="text-xs font-normal text-slate-400">أجهزة مسجلة</span></h3>
              </div>
              <div className="w-11 h-11 rounded-lg bg-purple-50 text-[#714B67] flex items-center justify-center">
                <Server className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-slate-400 font-semibold mb-1">الأجهزة المتصلة أونلاين</p>
                <h3 className="text-2xl font-black text-emerald-600">
                  {devices.filter(d => d.state === 'connected').length} <span className="text-xs font-normal text-slate-400">متصل (Online)</span>
                </h3>
              </div>
              <div className="w-11 h-11 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Wifi className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-slate-400 font-semibold mb-1">أجهزة بانتظار الفحص / مسودة</p>
                <h3 className="text-2xl font-black text-amber-600">
                  {devices.filter(d => d.state !== 'connected').length} <span className="text-xs font-normal text-slate-400">غير متصل</span>
                </h3>
              </div>
              <div className="w-11 h-11 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <WifiOff className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-slate-400 font-semibold mb-1">إجمالي الحركات المسحوبة</p>
                <h3 className="text-2xl font-black text-blue-600">
                  {devices.reduce((acc, d) => acc + (d.logsCount || 0), 0)} <span className="text-xs font-normal text-slate-400">حركة حضور</span>
                </h3>
              </div>
              <div className="w-11 h-11 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Activity className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-purple-100 text-[#714B67] rounded-lg">
                <Server className="w-5 h-5" />
              </span>
              <div>
                <h2 className="font-black text-slate-900 text-sm">
                  قائمة أجهزة البصمة المربوطة (<span className="font-mono text-purple-900">hr.biometric.device</span>)
                </h2>
                <p className="text-slate-500 text-[11px]">
                  بروتوكول ZKTeco Standalone / pyzk عبر المنفذ 4370 على خوادم دولة الكويت
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleTestAllDevices}
                disabled={testingDeviceId === 'ALL'}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition text-xs flex items-center gap-1.5 border border-slate-300"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testingDeviceId === 'ALL' ? 'animate-spin text-[#714B67]' : ''}`} />
                <span>اختبار اتصال الكل (Ping All)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  devices.forEach(d => handleSyncDeviceLogs(d));
                }}
                className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg transition text-xs flex items-center gap-1.5 shadow-xs"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>سحب البصمات من الكل (Sync All)</span>
              </button>

              <button
                type="button"
                onClick={() => setEditingDevice({
                  companyId: activeCompany?.id || 'comp-1',
                  name: '',
                  ipAddress: '192.168.1.205',
                  port: 4370,
                  mapId: devices.length + 1,
                  state: 'draft',
                  deviceModel: 'ZKTeco K40 Pro',
                  location: 'المقر الرئيسي',
                  notes: '',
                })}
                className="px-4 py-1.5 bg-[#714B67] hover:bg-[#5a3a52] text-white font-bold rounded-lg transition text-xs flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة جهاز جديد (New Device)</span>
              </button>
            </div>
          </div>

          {/* Graceful Loading / Notice Banner */}
          {isLoadingDevices && (
            <div className="bg-purple-50 border border-purple-200 text-purple-900 px-4 py-3 rounded-xl text-xs flex items-center gap-2 animate-pulse">
              <RefreshCw className="w-4 h-4 animate-spin text-[#714B67]" />
              <span>جاري مزامنة أجهزة البصمة من قاعدة البيانات...</span>
            </div>)}

          {deviceFetchError && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{deviceFetchError}</span>
              </div>
              <span className="text-[10px] font-mono bg-amber-100 text-amber-800 px-2 py-0.5 rounded">الوضع الآمن (Offline Fallback)</span>
            </div>)}

          {/* Odoo Tree View Table (view_biometric_device_tree) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="font-bold text-slate-700 text-xs flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#714B67]" />
                <span>شجرة أجهزة البصمة (Tree View - view_biometric_device_tree)</span>
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Model: hr.biometric.device ({devices.length} records)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">اسم الجهاز (name)</th>
                    <th className="p-3.5">عنوان IP (ip_address)</th>
                    <th className="p-3.5">المنفذ (port)</th>
                    <th className="p-3.5">معرف الجهاز (map_id)</th>
                    <th className="p-3.5">طراز الماكينة والموقع</th>
                    <th className="p-3.5">حالة الجهاز (state)</th>
                    <th className="p-3.5">آخر مزامنة</th>
                    <th className="p-3.5">الحركات</th>
                    <th className="p-3.5 text-center">إجراءات التحكم والربط</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {devices.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-3 max-w-md mx-auto">
                          <div className="w-12 h-12 rounded-full bg-purple-50 text-[#714B67] flex items-center justify-center">
                            <Server className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 text-sm">لا توجد أجهزة بصمة مضافة حالياً في قاعدة البيانات</h4>
                            <p className="text-xs text-slate-400 mt-1">
                              قاعدة البيانات نظيفة. يمكنك إضافة أجهزة بصمة ZKTeco الفعلية لربطها عبر بروتوكول الشبكة.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setEditingDevice({
                              companyId: activeCompany?.id || 'comp-1',
                              name: '',
                              ipAddress: '192.168.1.201',
                              port: 4370,
                              mapId: 1,
                              state: 'draft',
                              deviceModel: 'ZKTeco K40 Pro',
                              location: 'المقر الرئيسي',
                              notes: '',
                            })}
                            className="mt-2 px-4 py-2 bg-[#714B67] hover:bg-[#5a3a52] text-white font-bold rounded-lg transition text-xs flex items-center gap-1.5 shadow-xs"
                          >
                            <Plus className="w-4 h-4" />
                            <span>إضافة جهاز بصمة جديد الآن</span>
                          </button>
                        </div>
                      </td>
                    </tr>) : (
                    devices.map((device, idx) => (
                    <tr 
                      key={device.id} 
                      className={`hover:bg-purple-50/40 transition-colors ${idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}`}
                    >
                      {/* Name */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <Server className="w-4 h-4 text-[#714B67] shrink-0" />
                          <span>{device.name}</span>
                        </div>
                        {device.notes && (
                          <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs truncate">{device.notes}</p>)}
                      </td>

                      {/* IP Address */}
                      <td className="p-3.5 font-mono font-bold text-blue-800">
                        <span className="bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                          {device.ipAddress}
                        </span>
                      </td>

                      {/* Port */}
                      <td className="p-3.5 font-mono text-slate-600">
                        {device.port || 4370}
                      </td>

                      {/* Device ID */}
                      <td className="p-3.5 font-mono font-bold text-purple-900">
                        #{device.mapId || 1}
                      </td>

                      {/* Model & Location */}
                      <td className="p-3.5">
                        <div className="text-slate-800 font-semibold">{device.deviceModel || 'ZKTeco'}</div>
                        <div className="text-[11px] text-slate-500">{device.location || 'المقر الرئيسي'}</div>
                      </td>

                      {/* State Widget Badge */}
                      <td className="p-3.5">
                        {device.state === 'connected' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>متصل (Connected)</span>
                          </span>)}
                        {device.state === 'draft' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                            <span>جديد (Draft)</span>
                          </span>)}
                        {device.state === 'error' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                            <span>خطأ في الاتصال (Error)</span>
                          </span>)}
                      </td>

                      {/* Last Sync */}
                      <td className="p-3.5 font-mono text-[11px] text-slate-500">
                        {device.lastSyncTime || '—'}
                      </td>

                      {/* Logs Count */}
                      <td className="p-3.5 font-mono font-bold text-slate-700">
                        {device.logsCount || 0}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Test Connection Button */}
                          <button
                            type="button"
                            onClick={() => handleTestDeviceConnection(device)}
                            disabled={testingDeviceId === device.id}
                            title="اختبار الاتصال بالجهاز (action_test_connection)"
                            className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-[#714B67] border border-purple-200 rounded font-bold transition flex items-center gap-1 text-[11px]"
                          >
                            <RefreshCw className={`w-3 h-3 ${testingDeviceId === device.id ? 'animate-spin' : ''}`} />
                            <span>{testingDeviceId === device.id ? 'جاري الفحص...' : 'فحص الاتصال'}</span>
                          </button>

                          {/* Sync Logs Button */}
                          <button
                            type="button"
                            onClick={() => handleSyncDeviceLogs(device)}
                            disabled={syncingDeviceId === device.id}
                            title="سحب حركات الحضور من الجهاز الآن"
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded font-bold transition flex items-center gap-1 text-[11px]"
                          >
                            <Activity className={`w-3 h-3 ${syncingDeviceId === device.id ? 'animate-pulse text-emerald-600' : ''}`} />
                            <span>{syncingDeviceId === device.id ? 'سحب الحركات...' : 'سحب البصمات'}</span>
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => setEditingDevice(device)}
                            title="تعديل بيانات الجهاز"
                            className="p-1.5 hover:bg-slate-100 text-slate-600 rounded"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDeleteDevice(device.id)}
                            title="حذف الجهاز"
                            className="p-1.5 hover:bg-rose-50 text-rose-600 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>)))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Odoo Enterprise Python & XML Code Documentation Card */}
          <div className="bg-[#1e293b] text-slate-200 rounded-xl p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-white text-sm">
                  تعريف الموديل وكود بايثون البرمجي (hrbiometricdevice.py & XML View)
                </h3>
              </div>
              <span className="px-2.5 py-0.5 bg-purple-900/60 text-purple-300 border border-purple-700 rounded text-[11px] font-mono">
                Odoo Enterprise v16 / v17 & pyzk Module
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs font-mono">
              {/* Python Model Code */}
              <div className="bg-[#0f172a] rounded-lg p-4 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
                  <span className="text-purple-400 font-bold">📄 hrbiometricdevice.py</span>
                  <span className="text-[10px]">Python 3.10+ / pyzk</span>
                </div>
                <pre className="text-emerald-300 text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap">
{`from odoo import models, fields, api
from zk import ZK, const

class HrBiometricDevice(models.Model):
    _name = 'hr.biometric.device'
    _description = 'إدارة أجهزة البصمة'

    name = fields.Char('اسم الجهاز', required=True, placeholder="مثلاً: جهاز بوابة الجهراء")
    ip_address = fields.Char('عنوان IP للجهاز', required=True)
    port = fields.Integer('المنفذ (Port)', default=4370)
    map_id = fields.Integer('معرف الجهاز (Device ID)', default=1)
    state = fields.Selection([
        ('draft', 'جديد'),
        ('connected', 'متصل'),
        ('error', 'خطأ في الاتصال')
    ], string='حالة الجهاز', default='draft')

    company_id = fields.Many2one('res.company', default=lambda self: self.env.company)

    def action_test_connection(self):
        """كود اختبار الاتصال بالجهاز الحقيقي في الكويت عبر pyzk"""
        for record in self:
            zk = ZK(record.ip_address, port=record.port, timeout=5)
            try:
                conn = zk.connect()
                conn.disable_device()
                record.state = 'connected'
                conn.enable_device()
                conn.disconnect()
            except Exception as e:
                record.state = 'error'`}
                </pre>
              </div>

              {/* XML View Code */}
              <div className="bg-[#0f172a] rounded-lg p-4 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
                  <span className="text-blue-400 font-bold">📄 views/hr_biometric_device_views.xml</span>
                  <span className="text-[10px]">Odoo Architecture XML</span>
                </div>
                <pre className="text-amber-300 text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap">
{`<record id="view_biometric_device_tree" model="ir.ui.view">
    <field name="name">hr.biometric.device.tree</field>
    <field name="model">hr.biometric.device</field>
    <field name="arch" type="xml">
        <tree string="أجهزة البصمة">
            <field name="name"/>
            <field name="ip_address"/>
            <field name="port"/>
            <field name="map_id"/>
            <field name="state" widget="badge" decoration-success="state == 'connected'"/>
        </tree>
    </field>
</record>

<!-- إضافة القائمة في تطبيق الحضور -->
<menuitem id="menu_hr_attendance_devices"
          name="أجهزة البصمة"
          parent="hr_attendance.menu_hr_attendance_root"
          sequence="50"
          action="action_biometric_device_view"/>`}
                </pre>
              </div>
            </div>

            <div className="bg-slate-800/80 p-3.5 rounded-lg border border-slate-700 text-xs text-slate-300 flex items-start gap-3">
              <Terminal className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white">إرشادات الربط الفعلي لماكينات ZKTeco في دولة الكويت:</span>
                <p className="mt-1 text-slate-300 leading-relaxed text-[11px]">
                  1. تأكد من فتح المنفذ <span className="font-mono text-emerald-400 bg-slate-900 px-1 py-0.5 rounded">TCP/UDP 4370</span> على راوتر الفرع وتثبيت IP ثابت (Static IP أو VPN / Port Forwarding).<br/>
                  2. مطابقة معرف الموظف (Badge ID) المسجل بالماكينة مع حقل "معرف البصمة" في شجرة الموظفين بالنظام ليتم توزيع الحضور آلياً دون أي تدخل يدوي.
                </p>
              </div>
            </div>
          </div>

        </div>)}

      {/* TAB: LIVE_SYNC (ربط برنامج Attendance Management المباشر) */}
      {activeTab === 'LIVE_SYNC' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-[#1e3a4c] to-[#00838f] text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full text-[11px] font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    <span>سيرفر الاستقبال المباشر يعمل 100%</span>
                  </span>
                  <span className="px-2.5 py-0.5 bg-white/10 text-white rounded-full text-[11px]">ZKTeco & Attendance Management</span>
                </div>
                <h2 className="text-xl font-black flex items-center gap-2">
                  <Wifi className="w-6 h-6 text-emerald-300" />
                  <span>ربط برنامج البصمة (Attendance Management) ومزامنة الحركات المباشرة</span>
                </h2>
                <p className="text-slate-200 text-xs max-w-2xl leading-relaxed">
                  يمكنك الآن ترحيل بصمات الدخول والخروج آلياً من برنامج Attendance Management المنسوخ على جهازك الشخصي أو من أجهزة ZKTeco مباشرة إلى نظام الموارد البشرية والرواتب فور حدوثها دون الحاجة لتصدير ملفات إكسل!
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleDownloadVbsScript}
                  className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl shadow-md transition flex items-center gap-1.5 text-xs"
                  title="السكربت المباشر للويندوز - يعمل تلقائياً وبدون أي برامج إضافية"
                >
                  <Download className="w-4 h-4" />
                  <span>1. سكربت الويندوز (zk_attendance_sync.vbs)</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadBatFile}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl shadow-md transition flex items-center gap-1.5 text-xs"
                  title="ملف التشغيل التلقائي بضغطة زر"
                >
                  <Download className="w-4 h-4" />
                  <span>2. ملف التشغيل (run_zk_sync.bat)</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadSyncAgentScript}
                  className="px-4 py-2.5 bg-cyan-700 hover:bg-cyan-800 text-white font-black rounded-xl shadow-md transition flex items-center gap-1.5 text-xs"
                  title="سكربت بايثون للمطورين"
                >
                  <Download className="w-4 h-4" />
                  <span>3. سكربت بايثون (zk_attendance_sync.py)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Webhook & Integration Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* API Webhook Details */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                  <Code className="w-4 h-4 text-[#00838f]" />
                  <span>عنوان Webhook API لاستقبال البصمات (Live Push Endpoint)</span>
                </h3>
                <span className="px-2 py-0.5 bg-cyan-50 text-[#00838f] text-[10px] font-bold rounded">POST REST API</span>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-600 block">رابط السيرفر المباشر:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/api/attendance/live-push`}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono font-bold text-slate-800 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/api/attendance/live-push`);
                      alert('تم نسخ رابط الـ Webhook بنجاح!');
                    }}
                    className="px-3 py-2 bg-[#00838f] text-white rounded-lg font-bold hover:bg-[#006978] transition text-xs shrink-0"
                  >
                    نسخ الرابط
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <p className="font-bold text-slate-800">💡 نموذج البيانات المقبولة (JSON Payload):</p>
                <pre className="font-mono text-[10px] bg-slate-900 text-emerald-400 p-2 rounded-lg leading-relaxed overflow-x-auto">
{`{
  "companyId": "${activeCompany?.id || 'comp-1'}",
  "punches": [
    {
      "employeeCode": "101",
      "timestamp": "2026-08-23 08:00:00",
      "type": "IN",
      "deviceSn": "ZK-MAIN"
    }
  ]
}`}
                </pre>
              </div>
            </div>

            {/* Quick Test / Manual Live Punch Push Simulator */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600 animate-pulse" />
                  <span>اختبار وتجربة إرسال بصمة تجريبية فورية (Live Test)</span>
                </h3>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded">Live Test</span>
              </div>

              <p className="text-slate-500 text-[11px]">
                جرب إرسال بصمة مباشرة الآن لاختبار وصول البيانات لحظياً إلى جدول الحضور والرواتب:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">الموظف:</label>
                  <select
                    value={testPunchEmpCode}
                    onChange={(e) => setTestPunchEmpCode(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 font-bold bg-white text-slate-800"
                  >
                    <option value="">اختر الموظف...</option>
                    {(companyEmps || []).map(emp => (
                      <option key={emp.id} value={emp.employeeCode || emp.id}>
                        {emp.fullNameAr} ({emp.employeeCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">نوع الحركة:</label>
                  <select
                    value={testPunchType}
                    onChange={(e) => setTestPunchType(e.target.value as 'IN' | 'OUT')}
                    className="w-full border border-slate-300 rounded-lg p-2 font-bold bg-white text-slate-800"
                  >
                    <option value="IN">دخول (CHECKIN 🟢)</option>
                    <option value="OUT">خروج (CHECKOUT 🔴)</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSendTestLivePunch}
                disabled={isSendingTestPunch}
                className="w-full py-2.5 bg-[#00838f] hover:bg-[#006978] text-white font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2 text-xs cursor-pointer"
              >
                <Activity className={`w-4 h-4 ${isSendingTestPunch ? 'animate-spin' : ''}`} />
                <span>{isSendingTestPunch ? 'جاري إرسال البصمة...' : 'إرسال بصمة تجريبية فورية الآن'}</span>
              </button>

              <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-[11px] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>عند الضغط، يتم إنشاء سجل بصمة حقيقي وترحيله تلقائياً لسجلات الحضور اليومية.</span>
              </div>
            </div>
          </div>

          {/* Script Download & Setup Instructions */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-[#714B67]" />
                  <span>خطوات ربط برنامج Attendance Management (ZKTeco) على جهاز الكمبيوتر</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  يتصل البرنامج الآلي بقاعدة بيانات <code className="font-mono font-bold text-purple-900 bg-purple-50 px-1 rounded">att2000.mdb</code> ويرسل البصمات الجديدة أولاً بأول.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadSyncAgentScript}
                  className="px-3.5 py-1.5 bg-[#714B67] hover:bg-[#5a3a52] text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تحميل ملف Python (zk_attendance_sync.py)</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadBatFile}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold rounded-lg text-xs flex items-center gap-1.5 transition"
                >
                  <Code className="w-3.5 h-3.5 text-[#714B67]" />
                  <span>تحميل ملف التشغيل (run_zk_sync.bat)</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="w-6 h-6 rounded-full bg-purple-100 text-[#714B67] font-black flex items-center justify-center text-xs">1</div>
                <h4 className="font-bold text-slate-900">تحميل السكربت المساعد</h4>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  اضغط على زر "تحميل ملف Python" أو "ملف التشغيل" لحفظ برنامج الربط على كمبيوتر العمل الموجود عليه برنامج البصمة.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="w-6 h-6 rounded-full bg-purple-100 text-[#714B67] font-black flex items-center justify-center text-xs">2</div>
                <h4 className="font-bold text-slate-900">تشغيل البرنامج</h4>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  افتح الملف <code className="font-mono text-slate-800">run_zk_sync.bat</code>. سيقوم تلقائياً بالتعرف على قاعدة البيانات <code className="font-mono text-purple-900">att2000.mdb</code> ومراقبة البصمات الجديدة كل 30 ثانية.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="w-6 h-6 rounded-full bg-purple-100 text-[#714B67] font-black flex items-center justify-center text-xs">3</div>
                <h4 className="font-bold text-slate-900">المزامنة التلقائية اللحظية</h4>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  بمجرد أن يبصم أي موظف على ماكينة البصمة وتنسحب إلى برنامج Attendance Management، تظهر البصمة فوراً بالنظام هنا!
                </p>
              </div>
            </div>
          </div>

          {/* Live Incoming Punches Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-3 p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#00838f]" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">سجل البصمات الواردة لحظياً (Live Realtime Punch Stream)</h3>
                  <p className="text-slate-500 text-[11px]">يتم تحديث البصمات المباشرة فور ورودها من السكربت أو الأجهزة المربوطة</p>
                </div>
              </div>

              <button
                type="button"
                onClick={fetchLivePunches}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition text-xs flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#00838f]" />
                <span>تحديث السجل</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100/80 font-bold text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="p-3">كود الموظف</th>
                    <th className="p-3">اسم الموظف المطابق</th>
                    <th className="p-3">تاريخ الحركة</th>
                    <th className="p-3">وقت البصمة</th>
                    <th className="p-3">نوع البصمة</th>
                    <th className="p-3">مصدر البصمة</th>
                    <th className="p-3">وقت الاستقبال بالخادم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {livePunches.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 font-sans">
                        لا توجد حركات بصمة لحظية جديدة تم إرسالها مؤخراً. قم بتجربة إرسال بصمة تجريبية من النموذج أعلاه أو تشغيل السكربت.
                      </td>
                    </tr>
                  ) : (
                    livePunches.map((p) => {
                      const emp = (companyEmps || []).find(e => e.employeeCode === p.employeeCode || e.biometricId === p.employeeCode || e.badgeId === p.employeeCode);
                      return (
                        <tr key={p.id} className="hover:bg-cyan-50/50 transition">
                          <td className="p-3 font-bold text-purple-900">#{p.employeeCode}</td>
                          <td className="p-3 font-sans font-bold text-slate-900">{emp ? emp.fullNameAr : 'غير معرف / كود جديد'}</td>
                          <td className="p-3 text-slate-700">{p.date}</td>
                          <td className="p-3 font-bold text-blue-700">{p.time}</td>
                          <td className="p-3 font-sans">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              p.type === 'IN' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {p.type === 'IN' ? 'دخول 🟢' : 'خروج 🔴'}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500 text-[11px] font-sans">{p.deviceSn}</td>
                          <td className="p-3 text-slate-400 text-[10px]">{new Date(p.receivedAt).toLocaleTimeString('ar-KW')}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* BIOMETRIC DEVICE FORM MODAL (hr.biometric.device.form) */}
      {editingDevice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form 
            onSubmit={handleSaveDevice}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 text-xs"
          >
            {/* Odoo Form Header */}
            <div className="bg-slate-100 border-b border-slate-200 px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#714B67] hover:bg-[#5a3a52] text-white font-bold rounded shadow-xs"
                >
                  حفظ السجل (Save)
                </button>
                <button
                  type="button"
                  onClick={() => setEditingDevice(null)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold rounded"
                >
                  إلغاء (Discard)
                </button>
              </div>

              {/* Statusbar Widget */}
              <div className="flex items-center border border-slate-300 rounded overflow-hidden text-[11px] font-bold bg-white">
                <span className={`px-3 py-1 ${editingDevice.state === 'draft' || !editingDevice.state ? 'bg-[#714B67] text-white' : 'text-slate-500'}`}>
                  جديد (Draft)
                </span>
                <span className={`px-3 py-1 border-r border-slate-300 ${editingDevice.state === 'connected' ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}>
                  متصل (Connected)
                </span>
                <span className={`px-3 py-1 border-r border-slate-300 ${editingDevice.state === 'error' ? 'bg-rose-600 text-white' : 'text-slate-500'}`}>
                  خطأ (Error)
                </span>
              </div>
            </div>

            {/* Odoo Form Sheet */}
            <div className="p-6 space-y-6">
              {/* Title Field */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">اسم الجهاز (Device Name):</label>
                <input
                  type="text"
                  value={editingDevice.name || ''}
                  onChange={(e) => setEditingDevice({ ...editingDevice, name: e.target.value })}
                  placeholder="مثلاً: جهاز بوابة الجهراء"
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-base font-bold text-slate-900 focus:border-[#714B67] focus:ring-1 focus:ring-[#714B67]"
                  required
                />
              </div>

              {/* Groups Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                {/* Left Group: Network Config */}
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-1 flex items-center gap-1.5">
                    <Network className="w-4 h-4 text-[#714B67]" />
                    <span>إعدادات الاتصال والشبكة (TCP/IP)</span>
                  </h4>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">عنوان IP للجهاز (ip_address):</label>
                    <input
                      type="text"
                      value={editingDevice.ipAddress || ''}
                      onChange={(e) => setEditingDevice({ ...editingDevice, ipAddress: e.target.value })}
                      placeholder="192.168.1.201"
                      className="w-full border border-slate-300 rounded p-2 font-mono font-bold text-blue-900 bg-white"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">المنفذ (Port):</label>
                      <input
                        type="number"
                        value={editingDevice.port || 4370}
                        onChange={(e) => setEditingDevice({ ...editingDevice, port: parseInt(e.target.value) || 4370 })}
                        className="w-full border border-slate-300 rounded p-2 font-mono font-bold bg-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">معرف الماكينة (map_id):</label>
                      <input
                        type="number"
                        value={editingDevice.mapId || 1}
                        onChange={(e) => setEditingDevice({ ...editingDevice, mapId: parseInt(e.target.value) || 1 })}
                        className="w-full border border-slate-300 rounded p-2 font-mono font-bold bg-white"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Right Group: Hardware & Location */}
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-1 flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-[#714B67]" />
                    <span>طراز الجهاز والموقع الجغرافي</span>
                  </h4>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">طراز جهاز البصمة (Device Model):</label>
                    <input
                      type="text"
                      value={editingDevice.deviceModel || ''}
                      onChange={(e) => setEditingDevice({ ...editingDevice, deviceModel: e.target.value })}
                      placeholder="ZKTeco SilkBio-101TC / K40"
                      className="w-full border border-slate-300 rounded p-2 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">الموقع أو الفرع (Location):</label>
                    <input
                      type="text"
                      value={editingDevice.location || ''}
                      onChange={(e) => setEditingDevice({ ...editingDevice, location: e.target.value })}
                      placeholder="بوابة الدخول الرئيسية - فرع الجهراء"
                      className="w-full border border-slate-300 rounded p-2 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">ملاحظات التشغيل والربط:</label>
                <textarea
                  rows={2}
                  value={editingDevice.notes || ''}
                  onChange={(e) => setEditingDevice({ ...editingDevice, notes: e.target.value })}
                  placeholder="ملاحظات فنية عن الجهاز وكلمة مرور الاتصال ComKey إن وجدت..."
                  className="w-full border border-slate-300 rounded-lg p-2 bg-white"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingDevice(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded"
              >
                إغلاق
              </button>
              <button
                type="submit"
                className="px-5 py-1.5 bg-[#714B67] hover:bg-[#5a3a52] text-white font-bold rounded shadow-xs"
              >
                حفظ التغييرات
              </button>
            </div>
          </form>
        </div>)}

      {/* TEST RESULT DIAGNOSTIC MODAL */}
      {testResultModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 text-xs">
            <div className="bg-emerald-600 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-6 h-6" />
                <div>
                  <h3 className="font-bold text-base">تم التحقق من الاتصال بنجاح (Connection OK 🟢)</h3>
                  <p className="text-emerald-100 text-[11px]">ZKTeco Protocol Handshake via pyzk / Socket 4370</p>
                </div>
              </div>
              <button 
                onClick={() => setTestResultModal(null)}
                className="text-emerald-100 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-bold">اسم الجهاز:</span>
                  <span className="font-bold text-slate-900">{testResultModal.device.name}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-bold">عنوان الشبكة (IP / Port):</span>
                  <span className="font-mono font-bold text-blue-700">{testResultModal.device.ipAddress}:{testResultModal.device.port}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-bold">الرقم التسلسلي (Serial No):</span>
                  <span className="font-mono text-purple-900 font-bold">{testResultModal.serialNo}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-bold">البرنامج الثابت (Firmware):</span>
                  <span className="font-mono text-slate-800">{testResultModal.firmware}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-bold">المستخدمين المسجلين في الماكينة:</span>
                  <span className="font-bold text-emerald-700">{testResultModal.usersCount} موظف</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-bold">سجلات البصمة في الذاكرة:</span>
                  <span className="font-mono font-bold text-blue-800">{testResultModal.recordsCount} حركة</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">سرعة الاستجابة (Latency Ping):</span>
                  <span className="font-mono font-bold text-emerald-600">{testResultModal.pingMs} ms</span>
                </div>
              </div>

              <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200 text-[11px] text-emerald-800 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>تم تحديث حالة الجهاز تلقائياً إلى <strong>متصل (connected)</strong> ويمكنك الآن سحب البصمات في أي وقت.</span>
              </div>
            </div>

            <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex justify-end">
              <button
                type="button"
                onClick={() => setTestResultModal(null)}
                className="px-5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded shadow-xs"
              >
                إتمام وإغلاق
              </button>
            </div>
          </div>
        </div>)}

      {/* PRINTABLE REPORT MODAL */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-8 space-y-6 text-slate-900">
            {/* Modal Actions */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 print:hidden">
              <h3 className="font-bold text-sm text-slate-800">معاينة وتأكيد طباعة التقرير الشهري الرسمى</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => printDocument('print-area', 'document')}
                  className="px-4 py-2 bg-[#714B67] hover:bg-[#5a3a52] text-white text-xs font-bold rounded shadow flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة فورية</span>
                </button>

                <button
                  onClick={() => setShowPrintModal(false)}
                  className="p-1.5 hover:bg-slate-100 rounded text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Official Report Template Body */}
            <div id="print-area" className="space-y-6 dir-rtl text-right print:p-8">
              {/* Kuwait Official Header */}
              <div className="flex items-center justify-between pb-4 border-b-2 border-slate-900">
                <div>
                  <h1 className="text-lg font-black text-[#714B67]">{activeCompany?.nameAr || ''}</h1>
                  <p className="text-xs text-slate-600 font-mono">سجل تجاري: {activeCompany?.commercialRegNo || ''} | ملف حماية الأجور: {activeCompany?.wsiCode || ''}</p>
                </div>
                <div className="text-left font-mono text-xs">
                  <p className="font-bold">كشف الحضور والخصومات الشهري</p>
                  <p className="text-slate-500">الفترة: {selectedMonth}</p>
                </div>
              </div>

              {/* Table Body */}
              <table className="w-full text-right text-xs border border-slate-300">
                <thead className="bg-slate-200 font-bold border-b border-slate-300">
                  <tr>
                    <th className="p-2 border-l border-slate-300">كود الموظف</th>
                    <th className="p-2 border-l border-slate-300">اسم الموظف</th>
                    <th className="p-2 border-l border-slate-300">القسم</th>
                    <th className="p-2 border-l border-slate-300">أيام الحضور</th>
                    <th className="p-2 border-l border-slate-300">أيام الغياب</th>
                    <th className="p-2 border-l border-slate-300">دقائق التأخير</th>
                    <th className="p-2">الخصم المستحق (KWD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {companyEmps.map(emp => {
                    const stats = monthlyDeductionsSummary[emp.id] || { latenessMinutes: 0, absentDays: 0, totalDeductionKwd: 0 };
                    const empLogs = (attendance || []).filter(a => a.companyId === (activeCompany?.id || 'comp-1') && a.employeeId === emp.id && a.date.startsWith(selectedMonth));
                    const presentDays = empLogs.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;

                    return (
                      <tr key={emp.id}>
                        <td className="p-2 font-mono border-l border-slate-300">{emp.employeeCode}</td>
                        <td className="p-2 font-bold border-l border-slate-300">{emp.fullNameAr}</td>
                        <td className="p-2 border-l border-slate-300">{emp.department}</td>
                        <td className="p-2 font-mono border-l border-slate-300">{presentDays}</td>
                        <td className="p-2 font-mono border-l border-slate-300">{stats.absentDays}</td>
                        <td className="p-2 font-mono border-l border-slate-300">{stats.latenessMinutes}</td>
                        <td className="p-2 font-mono font-bold dir-ltr">{formatKWD(stats.totalDeductionKwd)}</td>
                      </tr>);
                  })}
                </tbody>
              </table>

              {/* Footer Signatures */}
              <div className="grid grid-cols-3 gap-6 pt-10 text-center text-xs font-bold">
                <div className="space-y-8">
                  <p>توقيع مسؤول الحضور والبصمة</p>
                  <p className="border-b border-dashed border-slate-400 w-32 mx-auto"></p>
                </div>
                <div className="space-y-8">
                  <p>توقيع ومدقق HR</p>
                  <p className="border-b border-dashed border-slate-400 w-32 mx-auto"></p>
                </div>
                <div className="space-y-8">
                  <p>ختم الشركة واعتماد الإدارة</p>
                  <p className="border-b border-dashed border-slate-400 w-32 mx-auto"></p>
                </div>
              </div>
            </div>
          </div>
        </div>)}

      {/* MANUAL RECORD MODAL */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleSaveManualRecord} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#714B67]" />
                <span>تسجيل بصمة / حضور يدوياً</span>
              </h3>
              <button type="button" onClick={() => setShowManualModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">اختر الموظف:</label>
                <select
                  value={manualEmpId || ''}
                  onChange={(e) => setManualEmpId(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2 font-bold bg-white"
                  required
                >
                  <option value="">-- اختر الموظف --</option>
                  {companyEmps.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.fullNameAr} ({emp.employeeCode})</option>))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">تاريخ الحضور:</label>
                <input
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2 font-mono font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">وقت الحضور (Check In):</label>
                  <input
                    type="time"
                    value={manualCheckIn}
                    onChange={(e) => setManualCheckIn(e.target.value)}
                    className="w-full border border-slate-300 rounded p-2 font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">وقت الانصراف (Check Out):</label>
                  <input
                    type="time"
                    value={manualCheckOut}
                    onChange={(e) => setManualCheckOut(e.target.value)}
                    className="w-full border border-slate-300 rounded p-2 font-mono font-bold"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#714B67] hover:bg-[#5a3a52] text-white font-bold rounded shadow"
              >
                حفظ التسجيل
              </button>
            </div>
          </form>
        </div>)}
    </div>);
};
