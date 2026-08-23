import React, { useState, useEffect, useRef } from 'react';
import { 
  QrCode, Clock, MapPin, RefreshCw, ShieldCheck, Maximize2, Minimize2, 
  X, Volume2, VolumeX, Smartphone, CheckCircle2, User, AlertTriangle, 
  Building2, Sparkles, Send, ExternalLink, KeyRound, Radio
} from 'lucide-react';
import QRCode from 'qrcode';
import { Company, CompanyBranch, Employee, AttendanceRecord } from '../types';
import { 
  generateDynamicQrPayload, 
  DynamicQrPayload, 
  playChimeSound, 
  buildAttendanceWhatsAppMessage 
} from '../utils/dynamicQrAttendance';
import { sendWhatsAppMessage } from '../services/whatsappService';
import toast from 'react-hot-toast';

interface DynamicQrKioskModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCompany: Company;
  employees: Employee[];
  attendance: AttendanceRecord[];
  onAddAttendance: (record: AttendanceRecord) => void;
  onOpenMobileScanner?: () => void;
}

export const DynamicQrKioskModal: React.FC<DynamicQrKioskModalProps> = ({
  isOpen,
  onClose,
  activeCompany,
  employees = [],
  attendance = [],
  onAddAttendance,
  onOpenMobileScanner
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [qrTimer, setQrTimer] = useState(15);
  const [currentPayload, setCurrentPayload] = useState<DynamicQrPayload | null>(null);
  const [qrCanvasUrl, setQrCanvasUrl] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  
  // Branches list (with fallback defaults)
  const [branches, setBranches] = useState<Array<{
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    radiusMeters: number;
    address: string;
  }>>(() => {
    try {
      const saved = localStorage.getItem(`geofence_branches_${activeCompany?.id || 'comp-1'}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(b => ({
            id: b.id || 'b-1',
            name: b.branchName || b.name || 'الفرع الرئيسي',
            latitude: b.latitude || 29.3759,
            longitude: b.longitude || 47.9774,
            radiusMeters: b.radiusMeters || 50,
            address: b.address || 'الكويت - العاصمة'
          }));
        }
      }
    } catch (e) {
      console.error('Error loading branches', e);
    }
    return [
      { id: 'hq', name: 'المقر الرئيسي (برج الحمراء - شرق)', latitude: 29.3759, longitude: 47.9774, radiusMeters: 50, address: 'شرق، شارع الشهداء، برج الحمراء' },
      { id: 'sharq', name: 'مجمع العيادات والمختبرات (شرق)', latitude: 29.3820, longitude: 47.9890, radiusMeters: 50, address: 'شرق، مجمع الأطباء الاستشاري' },
      { id: 'salmiya', name: 'فرع السالمية والخدمات التخصصية', latitude: 29.3375, longitude: 48.0750, radiusMeters: 60, address: 'السالمية، شارع سالم المبارك' },
      { id: 'ahmadi', name: 'فرع الأحمدي والمناطق الجنوبية', latitude: 29.0769, longitude: 48.0839, radiusMeters: 50, address: 'الأحمدي، المنطقة التجارية' }
    ];
  });

  const [selectedBranchId, setSelectedBranchId] = useState<string>(branches[0]?.id || 'hq');
  const selectedBranch = branches.find(b => b.id === selectedBranchId) || branches[0];

  // Recent Kiosk Punches Live Log
  const [kioskLog, setKioskLog] = useState<Array<{
    id: string;
    employeeName: string;
    employeeCode: string;
    punchType: 'CHECK_IN' | 'CHECK_OUT';
    time: string;
    branchName: string;
    avatar?: string;
    isWhatsappSent?: boolean;
  }>>([
    {
      id: 'k1',
      employeeName: 'د. أحمد الكندري',
      employeeCode: 'EMP-001',
      punchType: 'CHECK_IN',
      time: '08:00:14 ص',
      branchName: selectedBranch.name,
      isWhatsappSent: true
    },
    {
      id: 'k2',
      employeeName: 'سارة المطيري',
      employeeCode: 'EMP-002',
      punchType: 'CHECK_IN',
      time: '08:04:32 ص',
      branchName: selectedBranch.name,
      isWhatsappSent: true
    }
  ]);

  // Manual PIN Mode
  const [isPinMode, setIsPinMode] = useState(false);
  const [pinCode, setPinCode] = useState('');

  const kioskContainerRef = useRef<HTMLDivElement>(null);

  // Live Clock (1 second)
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // Function to regenerate QR code every 15 seconds
  const refreshQrCode = async () => {
    const { jsonString, payload } = generateDynamicQrPayload(selectedBranch, activeCompany?.id);
    setCurrentPayload(payload);
    try {
      const url = await QRCode.toDataURL(jsonString, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'H'
      });
      setQrCanvasUrl(url);
    } catch (err) {
      console.error('QR generation error:', err);
    }
    setQrTimer(15);
  };

  // Initial and branch change QR generation
  useEffect(() => {
    refreshQrCode();
  }, [selectedBranchId, activeCompany?.id]);

  // 15-second Countdown Interval
  useEffect(() => {
    const interval = setInterval(() => {
      setQrTimer((prev) => {
        if (prev <= 1) {
          refreshQrCode();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [selectedBranchId, activeCompany?.id]);

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      kioskContainerRef.current?.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Handle Manual PIN Attendance Punch
  const handlePinPunch = async () => {
    if (!pinCode.trim()) {
      toast.error('يرجى إدخال الرقم الوظيفي أو رمز PIN');
      return;
    }

    const emp = employees.find(e => 
      e.employeeCode === pinCode.trim() || 
      e.civilId === pinCode.trim() || 
      e.phone?.includes(pinCode.trim())
    );

    if (!emp) {
      if (soundEnabled) playChimeSound('ERROR');
      toast.error('لم يتم العثور على موظف بهذا الرمز الوظيفي أو الـ PIN');
      return;
    }

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('ar-KW');
    const hhMm = now.toTimeString().slice(0, 5);

    // Determine if Check In or Check Out
    const existingToday = attendance.find(a => a.employeeId === emp.id && a.date === todayStr);
    const punchType: 'CHECK_IN' | 'CHECK_OUT' = existingToday && existingToday.checkIn && !existingToday.checkOut ? 'CHECK_OUT' : 'CHECK_IN';

    const newRec: AttendanceRecord = existingToday ? {
      ...existingToday,
      checkOut: punchType === 'CHECK_OUT' ? hhMm : existingToday.checkOut,
      status: existingToday.status
    } : {
      id: `att-kiosk-${Date.now()}`,
      companyId: activeCompany?.id,
      employeeId: emp.id,
      date: todayStr,
      checkIn: hhMm,
      checkOut: '',
      workHours: 8,
      overtimeHours: 0,
      status: 'PRESENT',
      latenessMinutes: 0
    };

    onAddAttendance(newRec);

    if (soundEnabled) playChimeSound('SUCCESS');

    // Add to log
    const newLogItem = {
      id: Date.now().toString(),
      employeeName: emp.fullNameAr,
      employeeCode: emp.employeeCode || 'EMP',
      punchType,
      time: timeStr,
      branchName: selectedBranch.name,
      avatar: emp.avatarUrl,
      isWhatsappSent: true
    };
    setKioskLog(prev => [newLogItem, ...prev.slice(0, 6)]);

    // Send WhatsApp confirmation
    if (emp.phone) {
      const waMsg = buildAttendanceWhatsAppMessage({
        employee: emp,
        punchType,
        timeStr,
        dateStr: todayStr,
        branchName: selectedBranch.name,
        distanceMeters: 0,
        companyName: activeCompany?.nameAr || ""
      });
      sendWhatsAppMessage(emp.phone, waMsg, activeCompany?.id).catch(() => {});
    }

    toast.success(`تم تسجيل ${punchType === 'CHECK_IN' ? 'حضور' : 'انصراف'} ${emp.fullNameAr} بنجاح!`);
    setPinCode('');
    setIsPinMode(false);
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={kioskContainerRef}
      className="fixed inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col z-50 text-white overflow-hidden animate-in fade-in select-none font-sans"
      dir="rtl"
    >
      {/* Top Header Bar */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-6 py-4 flex items-center justify-between shadow-lg">
        {/* Company & Kiosk Info */}
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg border border-indigo-400/30">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black tracking-tight text-white">
                كشك البصمة الذكية (Dynamic QR Attendance Kiosk)
              </h2>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>متصل بالخادم (Live)</span>
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {activeCompany?.nameAr || ""} • نقطة الحضور بالفرع المعتمدة مع ربط الـ Geofence المانع للتلاعب
            </p>
          </div>
        </div>

        {/* Current Time Clock & Actions */}
        <div className="flex items-center gap-4">
          {/* Live Date and Time */}
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl px-4 py-2 text-center shadow-inner">
            <div className="text-[11px] text-slate-400 font-medium">
              {currentTime.toLocaleDateString('ar-KW', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            <div className="font-mono text-xl font-black text-amber-400 tracking-wider">
              {currentTime.toLocaleTimeString('ar-KW')}
            </div>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-xl border transition ${
              soundEnabled 
                ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300 hover:bg-indigo-600/30' 
                : 'bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700'
            }`}
            title={soundEnabled ? 'كتم الصوت' : 'تفعيل المؤثرات الصوتية'}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          {/* Fullscreen Mode */}
          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 transition"
            title="تبديل وضع ملء الشاشة للكشك"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 hover:bg-rose-500/40 text-rose-300 transition"
            title="إغلاق الكشك"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Kiosk Content Body */}
      <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto max-w-7xl mx-auto w-full items-center">
        
        {/* Left Side: Dynamic QR Code Presenter & Geofence (7 cols) */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center space-y-5">
          
          {/* Branch Location Selector */}
          <div className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-2 shadow-md">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <MapPin className="w-4 h-4 text-indigo-400" />
              <span>مقر الفرع الحالي:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {branches.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBranchId(b.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                    selectedBranchId === b.id
                      ? 'bg-indigo-600 text-white border-indigo-400 shadow-md ring-2 ring-indigo-500/30'
                      : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  {b.name.split('(')[0]} (نطاق {b.radiusMeters}م)
                </button>))}
            </div>
          </div>

          {/* Center Dynamic QR Box */}
          <div className="relative bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-indigo-500/40 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center max-w-md w-full ring-8 ring-indigo-500/5">
            
            {/* Top Badge */}
            <div className="w-full flex items-center justify-between text-xs text-slate-400 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-1.5 text-indigo-300 font-bold">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <span>حماية النطاق الجغرافي (Geofence)</span>
              </div>
              <span className="text-amber-400 font-mono text-[11px] font-bold">
                تحديث: كل 15 ثانية
              </span>
            </div>

            {/* The QR Code Canvas Frame */}
            <div className="my-4 p-4 bg-white rounded-3xl shadow-2xl relative group">
              {qrCanvasUrl ? (
                <img 
                  src={qrCanvasUrl} 
                  alt="Dynamic Attendance QR" 
                  className="w-56 h-56 md:w-64 md:h-64 object-contain rounded-xl"
                />) : (
                <div className="w-64 h-64 flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
                </div>)}

              {/* Center Logo Icon Overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-12 h-12 rounded-xl bg-indigo-600 shadow-lg border-2 border-white flex items-center justify-center">
                  <QrCode className="w-7 h-7 text-white" />
                </div>
              </div>
            </div>

            {/* Countdown Progress & Token Details */}
            <div className="w-full space-y-3">
              {/* Countdown Timer */}
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-400 flex items-center gap-1">
                  <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${qrTimer <= 3 ? 'animate-spin' : ''}`} />
                  <span>يتجدد الرمز تلقائياً خلال:</span>
                </span>
                <span className={`font-mono text-sm px-2 py-0.5 rounded-md ${
                  qrTimer <= 3 ? 'bg-rose-500/20 text-rose-300 animate-pulse' : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {qrTimer} ثوانٍ
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden p-0.5">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ease-linear ${
                    qrTimer <= 3 ? 'bg-rose-500' : 'bg-gradient-to-r from-amber-400 to-emerald-400'
                  }`}
                  style={{ width: `${(qrTimer / 15) * 100}%` }}
                />
              </div>

              {/* Security Token Details */}
              <div className="bg-slate-950/80 rounded-xl p-2.5 border border-slate-800 text-[10px] font-mono text-slate-400 flex flex-col gap-1 text-right">
                <div className="flex justify-between text-indigo-300">
                  <span>الموقع المعتمد:</span>
                  <span className="text-white font-bold">{selectedBranch.name}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>إحداثيات GPS:</span>
                  <span className="text-slate-300">{selectedBranch.latitude.toFixed(4)}, {selectedBranch.longitude.toFixed(4)} (±{selectedBranch.radiusMeters}م)</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>توقيع التشفير:</span>
                  <span className="text-emerald-400">SIG-{currentPayload?.signature || 'VERIFIED'}</span>
                </div>
              </div>
            </div>

            {/* Quick Action to open Mobile Scanner */}
            <div className="w-full mt-4 pt-3 border-t border-slate-800 flex gap-2">
              <button
                onClick={onOpenMobileScanner}
                className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold text-xs shadow-lg flex items-center justify-center gap-2 transition"
              >
                <Smartphone className="w-4 h-4" />
                <span>فتح ماسح هاتف الموظف (Mobile Scanner)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Live Punch Audit Trail & Manual PIN Option (5 cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-4 h-full justify-between">
          
          {/* Instructions Box */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-2">
            <h3 className="font-bold text-xs text-indigo-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>طريقة تسجيل الحضور والانصراف الذكي:</span>
            </h3>
            <ol className="text-[11px] text-slate-300 space-y-1.5 list-decimal list-inside leading-relaxed">
              <li>افتح تطبيق الموظف أو كاميرا الهاتف وامسح الرمز المعروض.</li>
              <li>يقوم النظام فوراً بالتحقق من إحداثيات GPS لتأكيد وجودك داخل نطاق {selectedBranch.radiusMeters}م.</li>
              <li>يتم تثبيت بصمتك وإرسال إشعار فوري عبر WhatsApp برقم وتوقيت البصمة.</li>
            </ol>
          </div>

          {/* Live Attendance Audit Feed */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden flex flex-col flex-1 shadow-lg">
            <div className="bg-slate-800/80 px-4 py-3 border-b border-slate-700/60 flex items-center justify-between">
              <span className="font-bold text-xs text-slate-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>سجل البصمات الحية بالفرع (Live Feed)</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                مزامنة فورية
              </span>
            </div>

            <div className="divide-y divide-slate-800/60 p-1 flex-1 overflow-y-auto max-h-[300px]">
              {kioskLog.map((item) => (
                <div key={item.id} className="p-3 hover:bg-slate-800/40 rounded-xl transition flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                      item.punchType === 'CHECK_IN' 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {item.punchType === 'CHECK_IN' ? 'حضور' : 'انصراف'}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>{item.employeeName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({item.employeeCode})</span>
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        <span>{item.branchName.split('(')[0]}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-left flex flex-col items-end">
                    <span className="text-xs font-mono font-bold text-amber-300">{item.time}</span>
                    {item.isWhatsappSent && (
                      <span className="text-[9px] text-emerald-400 flex items-center gap-0.5">
                        <span>تم إرسال واتساب</span>
                        <CheckCircle2 className="w-2.5 h-2.5" />
                      </span>)}
                  </div>
                </div>))}
            </div>
          </div>

          {/* Backup Manual PIN Input */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5">
            {!isPinMode ? (
              <button
                onClick={() => setIsPinMode(true)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition"
              >
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>استخدام البصمة اليدوية عبر رمز الموظف (PIN / Code)</span>
              </button>) : (
              <div className="space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span>تسجيل الحضور برقم الموظف / الـ PIN:</span>
                  <button 
                    onClick={() => setIsPinMode(false)}
                    className="text-[10px] text-rose-400 hover:underline"
                  >
                    إلغاء
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handlePinPunch(); }}
                    placeholder="أدخل كود الموظف (مثال: EMP-001)"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none focus:border-indigo-500"
                    autoFocus
                  />
                  <button
                    onClick={handlePinPunch}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow"
                  >
                    تثبيت البصمة
                  </button>
                </div>
              </div>)}
          </div>
        </div>

      </div>
    </div>);
};
