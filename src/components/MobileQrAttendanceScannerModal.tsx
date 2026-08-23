import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, MapPin, CheckCircle2, AlertTriangle, RefreshCw, Smartphone, 
  X, Sparkles, Navigation, Send, ExternalLink, ShieldAlert, ShieldCheck, 
  Clock, User, Check, Building2, Eye, EyeOff, Radio
} from 'lucide-react';
import jsQR from 'jsqr';
import { Company, Employee, AttendanceRecord, EmployeeNotification } from '../types';
import { 
  parseAndVerifyQrToken, 
  validateGeofencePunch, 
  calculateHaversineDistanceMeters, 
  playChimeSound, 
  buildAttendanceWhatsAppMessage,
  DynamicQrPayload,
  GeofenceValidationResult
} from '../utils/dynamicQrAttendance';
import { sendWhatsAppMessage } from '../services/whatsappService';
import { generateWhatsAppLink, formatKuwaitPhone } from '../utils/notificationEngine';
import toast from 'react-hot-toast';

interface MobileQrAttendanceScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCompany: Company;
  employees: Employee[];
  attendance: AttendanceRecord[];
  onAddAttendance: (record: AttendanceRecord) => void;
  onNotificationSent?: (notif: EmployeeNotification) => void;
}

export const MobileQrAttendanceScannerModal: React.FC<MobileQrAttendanceScannerModalProps> = ({
  isOpen,
  onClose,
  activeCompany,
  employees = [],
  attendance = [],
  onAddAttendance,
  onNotificationSent
}) => {
  const [selectedEmpId, setSelectedEmpId] = useState<string>(employees[0]?.id || '');
  const currentEmp = employees.find(e => e.id === selectedEmpId) || employees[0];

  const [activeMode, setActiveMode] = useState<'CAMERA' | 'SIMULATOR'>('SIMULATOR');
  
  // Camera Scanning State
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanAnimationRef = useRef<number | null>(null);

  // GPS Coordinates
  const [gpsStatus, setGpsStatus] = useState<'IDLE' | 'LOCATING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number; accuracy?: number } | null>(null);
  const [gpsErrorMsg, setGpsErrorMsg] = useState<string | null>(null);

  // Simulation controls (for testing inside vs outside geofence)
  const [simScenario, setSimScenario] = useState<'INSIDE' | 'OUTSIDE'>('INSIDE');
  const [customDistanceMeters, setCustomDistanceMeters] = useState<number>(18);

  // Verification Results
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<GeofenceValidationResult | null>(null);
  const [punchSuccessDetails, setPunchSuccessDetails] = useState<{
    punchType: 'CHECK_IN' | 'CHECK_OUT';
    timeStr: string;
    dateStr: string;
    branchName: string;
    distanceMeters: number;
    whatsappSent: boolean;
    whatsappDirectUrl?: string;
  } | null>(null);

  // Default target branch for simulation
  const targetBranch = {
    id: 'hq',
    branchName: 'المقر الرئيسي (برج الحمراء - شرق)',
    latitude: 29.3759,
    longitude: 47.9774,
    radiusMeters: 50
  };

  // Get real user GPS location
  const fetchRealGpsLocation = (): Promise<{ latitude: number; longitude: number; accuracy?: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('متصفحك لا يدعم تحديد الموقع الجغرافي (Geolocation API)'));
        return;
      }

      setGpsStatus('LOCATING');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: Math.round(position.coords.accuracy)
          };
          setUserCoords(coords);
          setGpsStatus('SUCCESS');
          resolve(coords);
        },
        (error) => {
          setGpsStatus('ERROR');
          setGpsErrorMsg(error.message || 'تعذر الحصول على إحداثيات GPS');
          // Provide fallback coordinates near Kuwait City for simulation
          const fallback = { latitude: 29.3759, longitude: 47.9774, accuracy: 15 };
          setUserCoords(fallback);
          resolve(fallback);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  // Start Camera Stream
  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setCameraActive(true);
        requestScanFrame();
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError('تعذر فتح كاميرا الهاتف: ' + (err.message || 'يرجى منح الإذن للوصول للكاميرا'));
      setCameraActive(false);
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (scanAnimationRef.current) {
      cancelAnimationFrame(scanAnimationRef.current);
      scanAnimationRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // Scanning loop
  const requestScanFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert'
      });

      if (code && code.data) {
        playChimeSound('SCAN');
        handleRawQrDataScanned(code.data);
        stopCamera();
        return;
      }
    }

    scanAnimationRef.current = requestAnimationFrame(requestScanFrame);
  };

  useEffect(() => {
    if (isOpen && activeMode === 'CAMERA') {
      startCamera();
      fetchRealGpsLocation().catch(() => {});
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeMode]);

  // Handle Raw Scanned QR Data (Either from live camera or simulator)
  const handleRawQrDataScanned = async (rawString: string) => {
    setIsProcessing(true);
    setLastResult(null);

    try {
      // 1. Verify QR token format and expiry
      const tokenResult = parseAndVerifyQrToken(rawString);
      if (!tokenResult.success || !tokenResult.payload) {
        playChimeSound('ERROR');
        toast.error(tokenResult.error || 'رمز QR غير صالح');
        setIsProcessing(false);
        return;
      }

      const payload = tokenResult.payload;

      // 2. Fetch or compute GPS coordinates
      let coords = userCoords;
      if (!coords) {
        try {
          coords = await fetchRealGpsLocation();
        } catch {
          coords = { latitude: payload.latitude, longitude: payload.longitude, accuracy: 10 };
        }
      }

      // 3. Validate Geofence
      const geofenceResult = validateGeofencePunch(
        coords.latitude,
        coords.longitude,
        payload,
        coords.accuracy || 10
      );

      setLastResult(geofenceResult);

      if (!geofenceResult.isValid) {
        playChimeSound('ERROR');
        toast.error(geofenceResult.message, { duration: 6000 });
        setIsProcessing(false);
        return;
      }

      // 4. Record Attendance
      await executeSuccessfulPunch(payload, geofenceResult.distanceMeters);

    } catch (err: any) {
      toast.error('حدث خطأ أثناء معالجة البصمة: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Simulation Punch Test
  const handleSimulateScan = async () => {
    if (!currentEmp) {
      toast.error('يرجى اختيار موظف أولاً');
      return;
    }

    setIsProcessing(true);
    setLastResult(null);

    // Build realistic payload
    const now = Date.now();
    const payload: DynamicQrPayload = {
      tokenType: 'GEOFENCE_ATTENDANCE_PUNCH',
      branchId: targetBranch.id,
      branchName: targetBranch.branchName,
      companyId: activeCompany?.id,
      latitude: targetBranch.latitude,
      longitude: targetBranch.longitude,
      radiusMeters: targetBranch.radiusMeters,
      timestamp: now,
      expiresAt: now + 15000,
      nonce: Math.random().toString(36).substring(2, 8).toUpperCase(),
      signature: 'TEST_VALID_SIG'
    };

    // Calculate coordinates based on chosen scenario
    let simulatedLat = targetBranch.latitude;
    let simulatedLng = targetBranch.longitude;
    let calculatedDist = 18;

    if (simScenario === 'INSIDE') {
      // 18 meters away (Inside the 50m radius)
      simulatedLat = targetBranch.latitude + 0.00015;
      simulatedLng = targetBranch.longitude + 0.0001;
      calculatedDist = customDistanceMeters;
    } else {
      // 380 meters away (Outside geofence)
      simulatedLat = targetBranch.latitude + 0.0035;
      simulatedLng = targetBranch.longitude + 0.0028;
      calculatedDist = 385;
    }

    const geofenceResult: GeofenceValidationResult = {
      isValid: simScenario === 'INSIDE',
      isInsideGeofence: simScenario === 'INSIDE',
      isTokenExpired: false,
      distanceMeters: calculatedDist,
      allowedRadiusMeters: targetBranch.radiusMeters,
      userCoords: { latitude: simulatedLat, longitude: simulatedLng, accuracy: 8 },
      branchCoords: { latitude: targetBranch.latitude, longitude: targetBranch.longitude },
      message: simScenario === 'INSIDE'
        ? `الموقع الجغرافي معتمد! المسافة: ${calculatedDist} متراً داخل نطاق الفرع (${targetBranch.radiusMeters}م).`
        : `تم رفض البصمة: الموظف يبعد مسافة ${calculatedDist} متراً عن نطاق الفرع (${targetBranch.radiusMeters}م).`,
      payload
    };

    setLastResult(geofenceResult);

    if (simScenario === 'INSIDE') {
      await executeSuccessfulPunch(payload, calculatedDist);
    } else {
      playChimeSound('ERROR');
      toast.error(geofenceResult.message, { duration: 6000 });
      setIsProcessing(false);
    }
  };

  // Execute the attendance recording and send WhatsApp confirmation
  const executeSuccessfulPunch = async (payload: DynamicQrPayload, distanceMeters: number) => {
    if (!currentEmp) return;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('ar-KW');
    const hhMm = now.toTimeString().slice(0, 5);

    // Determine Punch Type (Check In vs Check Out)
    const existingToday = attendance.find(a => a.employeeId === currentEmp.id && a.date === todayStr);
    const punchType: 'CHECK_IN' | 'CHECK_OUT' = existingToday && existingToday.checkIn && !existingToday.checkOut ? 'CHECK_OUT' : 'CHECK_IN';

    const newRec: AttendanceRecord = existingToday ? {
      ...existingToday,
      checkOut: punchType === 'CHECK_OUT' ? hhMm : existingToday.checkOut,
      status: existingToday.status
    } : {
      id: `att-qr-${Date.now()}`,
      companyId: activeCompany?.id,
      employeeId: currentEmp.id,
      date: todayStr,
      checkIn: hhMm,
      checkOut: '',
      workHours: 8,
      overtimeHours: 0,
      status: 'PRESENT',
      latenessMinutes: 0
    };

    onAddAttendance(newRec);
    playChimeSound('SUCCESS');

    // Build WhatsApp message
    const waMessage = buildAttendanceWhatsAppMessage({
      employee: currentEmp,
      punchType,
      timeStr,
      dateStr: todayStr,
      branchName: payload.branchName,
      distanceMeters,
      companyName: activeCompany?.nameAr || ""
    });

    let waSent = false;
    let directUrl: string | undefined = undefined;

    if (currentEmp.phone) {
      const formatted = formatKuwaitPhone(currentEmp.phone);
      directUrl = generateWhatsAppLink(formatted, waMessage);

      // Attempt sending via cloud gateway
      try {
        const sendRes = await sendWhatsAppMessage(formatted, waMessage, activeCompany?.id);
        waSent = sendRes.sent;
      } catch (e) {
        console.warn('WhatsApp gateway send error', e);
      }

      // Record Notification in system logs
      if (typeof onNotificationSent === 'function') {
        const notif: EmployeeNotification = {
          id: `notif-punch-${Date.now()}`,
          companyId: activeCompany?.id,
          employeeId: currentEmp.id,
          employeeName: currentEmp.fullNameAr,
          recipientPhone: formatted,
          channel: 'WHATSAPP',
          triggerType: 'HR_ACTION_REQUIRED',
          title: `تأكيد بصمة ${punchType === 'CHECK_IN' ? 'الحضور' : 'الانصراف'} الذكية`,
          message: waMessage,
          sentAt: new Date().toISOString(),
          status: waSent ? 'DELIVERED' : 'SENT'
        };
        onNotificationSent(notif);
      }
    }

    setPunchSuccessDetails({
      punchType,
      timeStr,
      dateStr: todayStr,
      branchName: payload.branchName,
      distanceMeters,
      whatsappSent: waSent,
      whatsappDirectUrl: directUrl
    });

    toast.success(
      `تم توثيق ${punchType === 'CHECK_IN' ? 'حضور' : 'انصراف'} ${currentEmp.fullNameAr} بنجاح!`,
      { duration: 5000 }
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-in fade-in select-none font-sans" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden flex flex-col my-auto max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg border border-indigo-400/30">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm tracking-tight">
                  مسح بصمة الـ Dynamic QR بهاتف الموظف
                </h3>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  GPS Geofence
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                التحقق الفوري من الموقع الجغرافي (50 متراً) وتوثيق البصمة وإرسال إشعار WhatsApp
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="p-3 bg-slate-100 border-b border-slate-200 flex gap-2">
          <button
            onClick={() => setActiveMode('SIMULATOR')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeMode === 'SIMULATOR'
                ? 'bg-white text-indigo-900 shadow-sm border border-slate-300'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>محاكي الاختبار والموقع الجغرافي (Simulator)</span>
          </button>

          <button
            onClick={() => setActiveMode('CAMERA')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeMode === 'CAMERA'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>كاميرا الهاتف المباشرة (Live Scanner)</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          
          {/* Employee Selector */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>الموظف صاحب البصمة:</span>
              <span className="text-[10px] text-slate-500 font-normal">
                {currentEmp?.jobTitle} • {currentEmp?.phone || 'لا يوجد هاتف'}
              </span>
            </label>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-600 shrink-0" />
              <select
                value={selectedEmpId}
                onChange={(e) => {
                  setSelectedEmpId(e.target.value);
                  setPunchSuccessDetails(null);
                  setLastResult(null);
                }}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 shadow-xs"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullNameAr} ({emp.employeeCode || 'EMP'}) - {emp.jobTitle}
                  </option>))}
              </select>
            </div>
          </div>

          {/* Mode 1: Live Camera Scanner */}
          {activeMode === 'CAMERA' && (
            <div className="space-y-3">
              <div className="relative bg-slate-950 rounded-2xl overflow-hidden aspect-video border-2 border-indigo-500/50 flex items-center justify-center shadow-inner">
                <video ref={videoRef} className="w-full h-full object-cover" />
                <canvas ref={canvasRef} className="hidden" />

                {/* Reticle Viewfinder */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 border-2 border-emerald-400 rounded-2xl relative animate-pulse shadow-lg flex items-center justify-center">
                    <div className="w-full h-0.5 bg-emerald-400/80 absolute top-1/2 -translate-y-1/2 animate-bounce" />
                    <span className="text-[10px] font-bold text-white bg-slate-900/80 px-2 py-0.5 rounded-full">
                      وجّه الكاميرا نحو كود الشاشة
                    </span>
                  </div>
                </div>

                {cameraError && (
                  <div className="absolute inset-0 bg-slate-900/90 p-4 text-center flex flex-col items-center justify-center gap-2 text-rose-300 text-xs">
                    <AlertTriangle className="w-8 h-8 text-rose-400" />
                    <span>{cameraError}</span>
                    <button
                      onClick={startCamera}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold"
                    >
                      إعادة المحاولة
                    </button>
                  </div>)}
              </div>

              {/* GPS Live Status */}
              <div className="p-3 bg-slate-100 rounded-xl flex items-center justify-between text-xs text-slate-700">
                <span className="flex items-center gap-1.5 font-bold">
                  <Navigation className="w-4 h-4 text-indigo-600" />
                  <span>حالة إحداثيات GPS:</span>
                </span>
                <span className="font-mono text-[11px] text-slate-600">
                  {userCoords 
                    ? `${userCoords.latitude.toFixed(4)}, ${userCoords.longitude.toFixed(4)} (دقة ${userCoords.accuracy || 10}م)` 
                    : 'جاري جلب إحداثيات القمر الصناعي...'}
                </span>
              </div>
            </div>)}

          {/* Mode 2: Simulator & Geofence Verification Studio */}
          {activeMode === 'SIMULATOR' && (
            <div className="space-y-4">
              
              {/* Scenario Toggle */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  اختر سيناريو موقع الموظف للتجربة:
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSimScenario('INSIDE')}
                    className={`p-3 rounded-2xl border-2 text-right transition flex flex-col gap-1 ${
                      simScenario === 'INSIDE'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-950 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between font-black text-xs text-emerald-700">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>داخل نطاق الفرع (سليم)</span>
                      </span>
                      <span className="text-[10px] font-mono bg-emerald-200/60 px-1.5 py-0.5 rounded">18 متراً</span>
                    </div>
                    <p className="text-[10px] text-emerald-800 leading-tight">
                      الموظف متواجد داخل مسافة 50م المعتمدة للفرع.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSimScenario('OUTSIDE')}
                    className={`p-3 rounded-2xl border-2 text-right transition flex flex-col gap-1 ${
                      simScenario === 'OUTSIDE'
                        ? 'border-rose-500 bg-rose-50 text-rose-950 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between font-black text-xs text-rose-700">
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" />
                        <span>خارج النطاق (محاولة تلاعب)</span>
                      </span>
                      <span className="text-[10px] font-mono bg-rose-200/60 px-1.5 py-0.5 rounded">385 متراً</span>
                    </div>
                    <p className="text-[10px] text-rose-800 leading-tight">
                      الموظف يحاول البصم من المنزل أو خارج الفرع (سيتم الرفض).
                    </p>
                  </button>
                </div>
              </div>

              {/* Geofence Target Info Card */}
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-2 text-xs">
                <div className="flex items-center justify-between font-bold text-indigo-950">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    <span>مقر البصمة المستهدف:</span>
                  </span>
                  <span className="text-[11px] text-indigo-700 font-mono">
                    نصف القطر: {targetBranch.radiusMeters} متراً
                  </span>
                </div>
                <div className="text-[11px] text-indigo-900 flex justify-between font-mono">
                  <span>{targetBranch.branchName}</span>
                  <span>GPS: {targetBranch.latitude.toFixed(4)}, {targetBranch.longitude.toFixed(4)}</span>
                </div>
              </div>

              {/* Action Trigger Button */}
              <button
                onClick={handleSimulateScan}
                disabled={isProcessing}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl font-bold text-xs shadow-lg flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
              >
                {isProcessing ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />) : (
                  <Radio className="w-4 h-4 text-amber-300" />)}
                <span>
                  {simScenario === 'INSIDE' 
                    ? `تنفيذ مسح الـ QR والتحقق من الموقع وتوثيق البصمة (${currentEmp?.fullNameAr})` 
                    : `اختبار محاولة البصمة خارج النطاق (${currentEmp?.fullNameAr})`}
                </span>
              </button>
            </div>)}

          {/* Verification Result Feedback */}
          {lastResult && (
            <div className={`p-4 rounded-2xl border flex flex-col gap-2 animate-in fade-in text-xs ${
              lastResult.isValid 
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950' 
                : 'bg-rose-50 border-rose-300 text-rose-950'
            }`}>
              <div className="flex items-center gap-2 font-bold text-sm">
                {lastResult.isValid ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />) : (
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />)}
                <span>{lastResult.isValid ? 'تم قبول البصمة والتحقق من الموقع بنجاح' : 'تم رفض البصمة'}</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                {lastResult.message}
              </p>
              <div className="flex justify-between font-mono text-[10px] pt-1 border-t border-slate-200/60">
                <span>المسافة المحسوبة: {lastResult.distanceMeters} متراً</span>
                <span>الحد الأقصى المسموح: {lastResult.allowedRadiusMeters} متراً</span>
              </div>
            </div>)}

          {/* Success Punch & WhatsApp Delivery Box */}
          {punchSuccessDetails && (
            <div className="p-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl shadow-xl space-y-3 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-emerald-500/50 pb-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>
                    تم توثيق حركة {punchSuccessDetails.punchType === 'CHECK_IN' ? 'الحضور' : 'الانصراف'}!
                  </span>
                </div>
                <span className="font-mono text-xs text-amber-300 font-bold">
                  {punchSuccessDetails.timeStr}
                </span>
              </div>

              <div className="text-[11px] space-y-1 text-emerald-100">
                <div>الموظف: <strong className="text-white">{currentEmp?.fullNameAr}</strong></div>
                <div>الفرع: <strong className="text-white">{punchSuccessDetails.branchName}</strong></div>
                <div>المسافة الجغرافية: <strong className="text-white">{punchSuccessDetails.distanceMeters} متراً (معتمد)</strong></div>
              </div>

              {/* WhatsApp Notification Direct Links */}
              <div className="pt-2 border-t border-emerald-500/50 flex flex-col gap-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1 font-bold text-white">
                    <Send className="w-3.5 h-3.5 text-emerald-200" />
                    <span>إشعار الواتساب التلقائي:</span>
                  </span>
                  <span className="text-[10px] bg-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                    {punchSuccessDetails.whatsappSent ? 'تم الإرسال عبر البوابة' : 'جاهز للإرسال'}
                  </span>
                </div>

                {punchSuccessDetails.whatsappDirectUrl && (
                  <a
                    href={punchSuccessDetails.whatsappDirectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                    <span>📲 فتح محادثة الواتساب وإرسال التأكيد للموظف مباشرة</span>
                  </a>)}
              </div>
            </div>)}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs transition shadow-sm"
          >
            إغلاق النافذة
          </button>
        </div>

      </div>
    </div>);
};
