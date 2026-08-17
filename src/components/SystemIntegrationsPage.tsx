import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  MapPin, 
  MessageSquare, 
  QrCode, 
  Save, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  Copy, 
  ExternalLink, 
  Navigation, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  Send, 
  Radio, 
  Smartphone,
  Download,
  Upload,
  Layers,
  Sliders,
  CheckSquare
} from 'lucide-react';
import { Company, CompanyBranch, WhatsAppGatewayConfig, SystemIntegrationsConfig } from '../types';
import toast from 'react-hot-toast';
import { db, cleanFirestoreData } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { sendLiveWhatsAppMessage, LiveWhatsAppSendResult } from '../utils/notificationEngine';

interface SystemIntegrationsPageProps {
  activeCompany: Company;
  onConfigSaved?: (config: SystemIntegrationsConfig) => void;
}

// Initial Kuwait Branches Preset
const DEFAULT_BRANCHES: CompanyBranch[] = [
  {
    id: 'branch-hq-1',
    companyId: 'comp-1',
    branchName: 'المقر الرئيسي (برج الحمراء - شرق)',
    latitude: 29.3759,
    longitude: 47.9774,
    radiusMeters: 100,
    isActive: true,
    address: 'شارع الشهداء، شرق، مدينة الكويت - برج الحمراء التجاري',
    notes: 'الإدارة العامة والشؤون الإدارية والموارد البشرية',
    createdAt: '2026-01-01'
  },
  {
    id: 'branch-sharq-2',
    companyId: 'comp-1',
    branchName: 'فرع شرق الطبي (مجمع الأطباء التخصصي)',
    latitude: 29.3820,
    longitude: 47.9890,
    radiusMeters: 80,
    isActive: true,
    address: 'شارع أحمد الجابر، شرق، العاصمة',
    notes: 'العيادات الخارجية ومختبرات الفحص الطبي',
    createdAt: '2026-01-15'
  },
  {
    id: 'branch-salmiya-3',
    companyId: 'comp-1',
    branchName: 'مركز السالمية الطبي (شارع سالم المبارك)',
    latitude: 29.3375,
    longitude: 48.0750,
    radiusMeters: 120,
    isActive: true,
    address: 'شارع سالم المبارك، السالمية، محافظة حولي',
    notes: 'قسم العلاج الطبيعي والتأهيل الطبي',
    createdAt: '2026-02-01'
  },
  {
    id: 'branch-farwaniya-4',
    companyId: 'comp-1',
    branchName: 'فرع الفروانية (مجمع الأندلس الطبي)',
    latitude: 29.2780,
    longitude: 47.9570,
    radiusMeters: 100,
    isActive: true,
    address: 'شارع حبيب مناور، الفروانية',
    notes: 'عيادات الأطفال والطب العام',
    createdAt: '2026-03-01'
  }
];

// Kuwait Common Locations for quick GPS picker
const KUWAIT_PRESET_LOCATIONS = [
  { name: 'مدينة الكويت - برج الحمراء (شرق)', lat: 29.3759, lng: 47.9774, address: 'شرق، العاصمة' },
  { name: 'السالمية - شارع سالم المبارك', lat: 29.3375, lng: 48.0750, address: 'السالمية، حولي' },
  { name: 'حولي - مجمع الأطباء', lat: 29.3400, lng: 48.0100, address: 'حولي، شارع بيروت' },
  { name: 'الفروانية - شارع حبيب مناور', lat: 29.2780, lng: 47.9570, address: 'الفروانية' },
  { name: 'الأحمدي - القطاع الإداري', lat: 29.0769, lng: 48.0838, address: 'الأحمدي' },
  { name: 'الجهراء - المركز التجاري', lat: 29.3375, lng: 47.6581, address: 'الجهراء' },
  { name: 'الشويخ الصناعية', lat: 29.3450, lng: 47.9400, address: 'الشويخ، العاصمة' },
];

export const SystemIntegrationsPage: React.FC<SystemIntegrationsPageProps> = ({
  activeCompany,
  onConfigSaved
}) => {
  // ---------------------------------------------------------------------------
  // 1. GEOFENCE CONFIG STATE
  // ---------------------------------------------------------------------------
  const [branches, setBranches] = useState<CompanyBranch[]>(() => {
    const saved = localStorage.getItem(`geofence_branches_${activeCompany?.id || 'comp-1'}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_BRANCHES;
  });

  const [editingBranch, setEditingBranch] = useState<Partial<CompanyBranch> | null>(null);
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [selectedBranchForPreview, setSelectedBranchForPreview] = useState<CompanyBranch>(branches[0] || DEFAULT_BRANCHES[0]);

  // Test Coordinate for Distance Calculation
  const [testLat, setTestLat] = useState<number>(29.3760);
  const [testLng, setTestLng] = useState<number>(47.9775);

  // ---------------------------------------------------------------------------
  // 2. WHATSAPP GATEWAY CONFIG STATE
  // ---------------------------------------------------------------------------
  const [whatsAppConfig, setWhatsAppConfig] = useState<WhatsAppGatewayConfig>(() => {
    const saved = localStorage.getItem(`whatsapp_gateway_${activeCompany?.id || 'comp-1'}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return {
      instanceId: import.meta.env.VITE_ULTRAMSG_INSTANCE_ID || 'instance188430',
      apiToken: import.meta.env.VITE_ULTRAMSG_TOKEN || 'mh21qnlb8vngnkml',
      defaultCountryCode: '+965',
      serverUrl: 'https://api.ultramsg.com/instance188430/messages/chat',
      isActive: true,
      webhookUrl: 'https://ais-pre-mwghgnpjjr2xqufoinwqle-554243377583.europe-west2.run.app/api/whatsapp/webhook'
    };
  });

  const [showToken, setShowToken] = useState(false);
  const [testPhone, setTestPhone] = useState('99881122');
  const [testMessageText, setTestMessageText] = useState('رسالة اختبار حقيقية من نظام الموارد البشرية (Aysed S HR) للتحقق من تكامل بوابة الواتساب.');
  const [isTestingWhatsApp, setIsTestingWhatsApp] = useState(false);
  const [whatsAppTestStatus, setWhatsAppTestStatus] = useState<LiveWhatsAppSendResult | null>(null);

  // ---------------------------------------------------------------------------
  // 3. PUBLIC VERIFICATION DOMAIN CONFIG STATE
  // ---------------------------------------------------------------------------
  const defaultDomain = typeof window !== 'undefined' ? window.location.origin : 'https://verify.kuwait-hr.com';
  const [verificationDomain, setVerificationDomain] = useState<string>(() => {
    const saved = localStorage.getItem(`public_verification_domain_${activeCompany?.id || 'comp-1'}`);
    return saved || 'https://verify.kuwait-hr.com';
  });

  const [sampleDocType, setSampleDocType] = useState<'SALARY_CERT' | 'LEAVE_APPROVAL' | 'WORK_CONTRACT' | 'EXPERIENCE_LETTER'>('SALARY_CERT');
  const [sampleDocCode, setSampleDocCode] = useState('AYS-2026-SAL-1082');

  const [isSaving, setIsSaving] = useState(false);

  // Sync when active company changes
  useEffect(() => {
    const compId = activeCompany?.id || 'comp-1';
    const savedBranches = localStorage.getItem(`geofence_branches_${compId}`);
    if (savedBranches) {
      try {
        const parsed = JSON.parse(savedBranches);
        setBranches(parsed);
        if (parsed.length > 0) setSelectedBranchForPreview(parsed[0]);
      } catch (e) {
        console.error(e);
      }
    } else {
      setBranches(DEFAULT_BRANCHES);
      setSelectedBranchForPreview(DEFAULT_BRANCHES[0]);
    }

    const savedWpp = localStorage.getItem(`whatsapp_gateway_${compId}`);
    if (savedWpp) {
      try {
        setWhatsAppConfig(JSON.parse(savedWpp));
      } catch (e) {
        console.error(e);
      }
    }

    const savedDomain = localStorage.getItem(`public_verification_domain_${compId}`);
    if (savedDomain) {
      setVerificationDomain(savedDomain);
    }
  }, [activeCompany]);

  // Haversine Distance Calculation Formula (in Meters)
  const calculateDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // metres
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c);
  };

  const calculatedDistance = selectedBranchForPreview
    ? calculateDistanceMeters(selectedBranchForPreview.latitude, selectedBranchForPreview.longitude, testLat, testLng)
    : 0;
  const isInsideGeofence = selectedBranchForPreview ? calculatedDistance <= selectedBranchForPreview.radiusMeters : false;

  // Handle Geolocation to get real current position
  const handleGetCurrentGPS = () => {
    if (!navigator.geolocation) {
      toast.error('متصفحك لا يدعم تحديد الموقع الجغرافي (Geolocation API).');
      return;
    }

    const toastId = toast.loading('جاري جلب إحداثيات موقعك الحالي عبر الـ GPS...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        if (editingBranch) {
          setEditingBranch(prev => ({
            ...prev,
            latitude: lat,
            longitude: lng
          }));
        }
        setTestLat(lat);
        setTestLng(lng);
        toast.success(`تم التقاط إحداثيات موقعك بنجاح! [${lat}, ${lng}]`, { id: toastId });
      },
      (error) => {
        console.error(error);
        toast.error(`تعذر جلب الموقع: ${error.message}`, { id: toastId });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Branch CRUD handlers
  const handleOpenAddBranch = () => {
    setEditingBranch({
      id: `branch-${Date.now()}`,
      companyId: activeCompany?.id || 'comp-1',
      branchName: '',
      latitude: 29.3759,
      longitude: 47.9774,
      radiusMeters: 100,
      isActive: true,
      address: '',
      notes: ''
    });
    setIsBranchModalOpen(true);
  };

  const handleOpenEditBranch = (branch: CompanyBranch) => {
    setEditingBranch({ ...branch });
    setIsBranchModalOpen(true);
  };

  const handleDeleteBranch = (branchId: string) => {
    if (branches.length <= 1) {
      toast.error('يجب أن يحتوي النظام على فرع واحد على الأقل.');
      return;
    }
    const updated = branches.filter(b => b.id !== branchId);
    setBranches(updated);
    if (selectedBranchForPreview.id === branchId) {
      setSelectedBranchForPreview(updated[0]);
    }
    toast.success('تم حذف الفرع بنجاح.');
  };

  const handleSaveBranchModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBranch?.branchName?.trim()) {
      toast.error('يرجى إدخال اسم الفرع.');
      return;
    }
    if (!editingBranch.latitude || !editingBranch.longitude || !editingBranch.radiusMeters) {
      toast.error('يرجى إدخال إحداثيات ونطاق الفرع بشكل صحيح.');
      return;
    }

    const branchToSave: CompanyBranch = {
      id: editingBranch.id || `branch-${Date.now()}`,
      companyId: activeCompany?.id || 'comp-1',
      branchName: editingBranch.branchName.trim(),
      latitude: Number(editingBranch.latitude),
      longitude: Number(editingBranch.longitude),
      radiusMeters: Number(editingBranch.radiusMeters),
      isActive: editingBranch.isActive !== undefined ? editingBranch.isActive : true,
      address: editingBranch.address?.trim() || '',
      notes: editingBranch.notes?.trim() || '',
      createdAt: editingBranch.createdAt || new Date().toISOString().split('T')[0]
    };

    setBranches(prev => {
      const idx = prev.findIndex(b => b.id === branchToSave.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = branchToSave;
        return next;
      }
      return [...prev, branchToSave];
    });

    setSelectedBranchForPreview(branchToSave);
    setIsBranchModalOpen(false);
    setEditingBranch(null);
    toast.success(`تم حفظ بيانات الفرع [${branchToSave.branchName}] بنجاح!`);
  };

  // Real WhatsApp Live API Test Ping
  const handleTestWhatsAppPing = async () => {
    if (!whatsAppConfig.instanceId || !whatsAppConfig.apiToken) {
      toast.error('يرجى تعبئة معرّف الخادم (Instance ID) ومفتاح الـ API Token أولاً.');
      return;
    }
    if (!testPhone || testPhone.trim() === '') {
      toast.error('يرجى إدخال رقم هاتف للاختبار.');
      return;
    }

    setIsTestingWhatsApp(true);
    setWhatsAppTestStatus(null);

    const toastId = toast.loading('جاري إجراء استدعاء شبكي حقيقي لبوابة الواتساب (HTTP POST)...');

    try {
      const cleanPhone = testPhone.replace(/\D/g, '');
      const fullPhone = cleanPhone.startsWith('965') ? cleanPhone : `965${cleanPhone}`;

      const result = await sendLiveWhatsAppMessage({
        phone: fullPhone,
        message: testMessageText || 'رسالة فحص اتصال حي من نظام الموارد البشرية Aysed HR',
        gatewayConfig: whatsAppConfig,
        priority: 10
      });

      setWhatsAppTestStatus(result);

      if (result.success) {
        toast.success(`تم إرسال رسالة الواتساب الحقيقية بنجاح إلى الرقم +${cleanPhone}!`, { id: toastId });
      } else {
        toast.error(`فشل الاتصال ببوابة الواتساب: ${result.error}`, { id: toastId, duration: 6000 });
      }
    } catch (err: any) {
      const failedResult: LiveWhatsAppSendResult = {
        success: false,
        error: err.message || 'حدث خطأ غير متوقع أثناء الاتصال بالبوابة',
        errorCode: 'UNEXPECTED_ERROR',
        timestamp: new Date().toISOString()
      };
      setWhatsAppTestStatus(failedResult);
      toast.error(`خطأ شبكة: ${err.message}`, { id: toastId });
    } finally {
      setIsTestingWhatsApp(false);
    }
  };

  // Copy helper
  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`تم نسخ ${label} إلى الحافظة!`);
  };

  // Build Full Public Verification URL
  const buildVerificationUrl = () => {
    const cleanDomain = (verificationDomain || 'https://verify.kuwait-hr.com').replace(/\/+$/, '');
    const hash = 'sha256_' + Math.abs(sampleDocCode.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0)).toString(16);
    return `${cleanDomain}/verify?doc=${sampleDocCode}&type=${sampleDocType}&hash=${hash}`;
  };

  // Save All Configurations
  const handleSaveAllConfig = async () => {
    setIsSaving(true);
    const compId = activeCompany?.id || 'comp-1';

    const fullConfig: SystemIntegrationsConfig = {
      id: `config-${compId}`,
      companyId: compId,
      publicVerificationDomain: verificationDomain.trim(),
      whatsAppGateway: whatsAppConfig,
      branches: branches,
      updatedAt: new Date().toISOString()
    };

    // Save to LocalStorage
    localStorage.setItem(`geofence_branches_${compId}`, JSON.stringify(branches));
    localStorage.setItem(`whatsapp_gateway_${compId}`, JSON.stringify(whatsAppConfig));
    localStorage.setItem(`public_verification_domain_${compId}`, verificationDomain.trim());

    // Save to Firebase Firestore if connected
    try {
      if (db) {
        const configDocRef = doc(db, 'system_integrations', compId);
        await setDoc(configDocRef, cleanFirestoreData(fullConfig), { merge: true });
      }
    } catch (err) {
      console.warn('Firestore integration sync warning:', err);
    }

    if (onConfigSaved) {
      onConfigSaved(fullConfig);
    }

    setIsSaving(false);
    toast.success('تم حفظ كافة إعدادات الربط الخارجي وواجهات الـ API بنجاح ومزامنتها مع النظام!');
  };

  return (
    <div className="space-y-8 text-right dir-rtl font-sans" dir="rtl">
      
      {/* --------------------------------------------------------------------- */}
      {/* TOP HEADER & ACTION BAR */}
      {/* --------------------------------------------------------------------- */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-gradient-to-br from-[#714B67] to-purple-800 text-white rounded-xl shadow-md">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-800">
                  ربط الميزات الخارجية وواجهات برمجة التطبيقات (System Integrations & API Config)
                </h1>
                <span className="bg-purple-50 text-[#714B67] text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border border-purple-200">
                  API & Gateway Suite
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                تكوين النطاقات الجغرافية للبصمة الذكية (Geofence)، بوابات الواتساب الرسمية، ونطاق التحقق الرقمي المعتمد للـ QR Codes
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end lg:self-auto">
          <button
            onClick={handleSaveAllConfig}
            disabled={isSaving}
            className="flex items-center gap-2 bg-[#714B67] hover:bg-[#593951] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-50"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>حفظ وتطبيق كافة الإعدادات</span>
          </button>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* SECTION 1: GEOFENCE CONFIG (إعدادات البصمة والمواقع) */}
      {/* --------------------------------------------------------------------- */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                <span>1. إعدادات البصمة والمواقع الجغرافية (Geofence & Branch GPS Config)</span>
                <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-mono font-bold">
                  {branches.length} فروع
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                تحديد إحداثيات فروع الشركة (Latitude, Longitude) ونطاق السماح بالمتر (Radius in Meters) لتسجيل الحضور والانصراف
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenAddBranch}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة فرع جديد</span>
            </button>
          </div>
        </div>

        {/* Branches Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl bg-slate-50/50">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3 text-right">اسم الفرع (Branch Name)</th>
                <th className="p-3 text-center">خط العرض (Latitude)</th>
                <th className="p-3 text-center">خط الطول (Longitude)</th>
                <th className="p-3 text-center">نطاق البصمة (Radius)</th>
                <th className="p-3 text-right">العنوان والوصف</th>
                <th className="p-3 text-center">الحالة</th>
                <th className="p-3 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {branches.map((branch) => {
                const isSelected = selectedBranchForPreview.id === branch.id;
                return (
                  <tr 
                    key={branch.id} 
                    className={`hover:bg-slate-50 transition ${isSelected ? 'bg-purple-50/40 font-medium' : ''}`}
                  >
                    <td className="p-3 font-bold text-slate-800">
                      <div className="flex items-center gap-2">
                        <MapPin className={`w-4 h-4 ${isSelected ? 'text-[#714B67]' : 'text-slate-400'}`} />
                        <span>{branch.branchName}</span>
                      </div>
                    </td>
                    <td className="p-3 text-center font-mono text-slate-700 dir-ltr text-[11px]">
                      {branch.latitude.toFixed(6)}
                    </td>
                    <td className="p-3 text-center font-mono text-slate-700 dir-ltr text-[11px]">
                      {branch.longitude.toFixed(6)}
                    </td>
                    <td className="p-3 text-center">
                      <span className="bg-slate-100 text-slate-800 border border-slate-200 font-mono font-bold px-2 py-0.5 rounded text-[11px]">
                        {branch.radiusMeters} متر
                      </span>
                    </td>
                    <td className="p-3 text-slate-600 text-[11px] max-w-xs truncate">
                      {branch.address || branch.notes || '—'}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        branch.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {branch.isActive ? 'نشط' : 'معطل'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setSelectedBranchForPreview(branch)}
                          className="p-1 text-[#714B67] hover:bg-purple-50 rounded transition"
                          title="معاينة واختبار النطاق"
                        >
                          <Radio className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditBranch(branch)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded transition"
                          title="تعديل بيانات الفرع"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteBranch(branch.id)}
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded transition"
                          title="حذف الفرع"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Interactive Radar & Distance Simulator */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-[#714B67] animate-pulse" />
              <h3 className="text-xs font-bold text-slate-800">
                محاكي واختبار النطاق الجغرافي للفرع المختار: [{selectedBranchForPreview.branchName}]
              </h3>
            </div>
            <button
              onClick={handleGetCurrentGPS}
              className="flex items-center gap-1 text-[11px] text-[#714B67] bg-white border border-[#714B67]/20 hover:bg-purple-50 px-2.5 py-1 rounded-lg font-bold transition cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>جلب موقعي الحالي بالـ GPS للمحاكاة</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">خط عرض موقع الموظف التجريبي (Lat):</label>
              <input
                type="number"
                step="0.0001"
                value={testLat}
                onChange={(e) => setTestLat(parseFloat(e.target.value) || 0)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-left font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">خط طول موقع الموظف التجريبي (Lng):</label>
              <input
                type="number"
                step="0.0001"
                value={testLng}
                onChange={(e) => setTestLng(parseFloat(e.target.value) || 0)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-left font-mono"
              />
            </div>
            <div className="flex flex-col justify-end">
              <div className={`p-2.5 rounded-lg border flex items-center justify-between ${
                isInsideGeofence ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                <div>
                  <div className="font-bold text-[11px]">
                    المسافة المحسوبة: <span className="font-mono font-black">{calculatedDistance} متر</span>
                  </div>
                  <div className="text-[10px]">
                    نطاق السماح المعتمد: {selectedBranchForPreview.radiusMeters} متر
                  </div>
                </div>
                <div className="flex items-center gap-1 font-black text-xs">
                  {isInsideGeofence ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>داخل النطاق (مقبول)</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>خارج النطاق (مرفوض)</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* SECTION 2: WHATSAPP GATEWAY (إعدادات بوابة الواتساب) */}
      {/* --------------------------------------------------------------------- */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                <span>2. إعدادات بوابة الواتساب (WhatsApp Gateway & API Settings)</span>
                <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-mono font-bold">
                  UltraMsg / Cloud API Ready
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                ربط خادم إرسال رسائل التنبيهات، كشوف الرواتب، وتجديدات الإقامات للموظفين عبر تطبيق WhatsApp
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={whatsAppConfig.isActive}
                onChange={(e) => setWhatsAppConfig(prev => ({ ...prev, isActive: e.target.checked }))}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>تفعيل البوابة التلقائية</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Instance ID */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              معرّف الخادم (Instance ID) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={whatsAppConfig.instanceId}
                onChange={(e) => setWhatsAppConfig(prev => ({ ...prev, instanceId: e.target.value }))}
                placeholder="مثال: instance98421"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-left font-mono focus:ring-2 focus:ring-[#714B67] focus:bg-white outline-none"
              />
              <button
                type="button"
                onClick={() => handleCopyText(whatsAppConfig.instanceId, 'معرّف الخادم Instance ID')}
                className="absolute left-2 top-2.5 text-slate-400 hover:text-slate-600"
                title="نسخ"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">معرّف الجلسة أو رقم الخادم لدى مزود خدمة الواتساب</p>
          </div>

          {/* API Token */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              مفتاح الـ API السري (API Token) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={whatsAppConfig.apiToken}
                onChange={(e) => setWhatsAppConfig(prev => ({ ...prev, apiToken: e.target.value }))}
                placeholder="wpp_token_secret_key_..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-left font-mono focus:ring-2 focus:ring-[#714B67] focus:bg-white outline-none pl-16"
              />
              <div className="absolute left-2 top-2.5 flex items-center gap-1.5 text-slate-400">
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="hover:text-slate-600"
                  title={showToken ? 'إخفاء' : 'إظهار'}
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => handleCopyText(whatsAppConfig.apiToken, 'رمز الـ API Token')}
                  className="hover:text-slate-600"
                  title="نسخ"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">المفتاح السري لتفويض وإرسال طلبات الـ HTTP POST</p>
          </div>

          {/* Default Country Code */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              رمز الدولة الافتراضي (Default Country Code) <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <select
                value={whatsAppConfig.defaultCountryCode}
                onChange={(e) => setWhatsAppConfig(prev => ({ ...prev, defaultCountryCode: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold focus:ring-2 focus:ring-[#714B67] focus:bg-white outline-none"
              >
                <option value="+965">🇰🇼 دولة الكويت (+965)</option>
                <option value="+966">🇸🇦 المملكة العربية السعودية (+966)</option>
                <option value="+971">🇦🇪 دولة الإمارات (+971)</option>
                <option value="+974">🇶🇦 دولة قطر (+974)</option>
                <option value="+973">🇧🇭 مملكة البحرين (+973)</option>
                <option value="+968">🇴🇲 سلطنة عمان (+968)</option>
                <option value="+20">🇪🇬 جمهورية مصر العربية (+20)</option>
                <option value="+962">🇯🇴 المملكة الأردنية (+962)</option>
              </select>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">يُضاف تلقائياً لأرقام الموظفين المحلية عند الإرسال</p>
          </div>
        </div>

        {/* Server Endpoint URL */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            رابط الخادم المخصص للـ API (Gateway Endpoint URL)
          </label>
          <input
            type="text"
            value={whatsAppConfig.serverUrl || ''}
            onChange={(e) => setWhatsAppConfig(prev => ({ ...prev, serverUrl: e.target.value }))}
            placeholder="https://api.ultramsg.com/YOUR_INSTANCE_ID/messages/chat"
            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-left font-mono focus:ring-2 focus:ring-[#714B67] focus:bg-white outline-none"
          />
        </div>

        {/* Live WhatsApp Ping & Test Box */}
        <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-700" />
              <h3 className="text-xs font-bold text-emerald-900">
                فحص واختبار الاتصال الفوري ببوابة الواتساب (WhatsApp Ping & Live Test)
              </h3>
            </div>
            <button
              onClick={handleTestWhatsAppPing}
              disabled={isTestingWhatsApp}
              className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow transition cursor-pointer disabled:opacity-50"
            >
              {isTestingWhatsApp ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>إرسال فحص اتصال (Ping API)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم الهاتف للاختبار:</label>
              <div className="flex items-center gap-1 dir-ltr">
                <span className="bg-slate-200 text-slate-700 font-bold px-2 py-2 rounded-lg text-xs font-mono">
                  {whatsAppConfig.defaultCountryCode}
                </span>
                <input
                  type="text"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="99881122"
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono text-left text-xs"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">نص رسالة الاختبار:</label>
              <input
                type="text"
                value={testMessageText}
                onChange={(e) => setTestMessageText(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
              />
            </div>
          </div>

          {whatsAppTestStatus && (
            <div className={`rounded-xl p-4 text-xs flex items-start gap-3 animate-fadeIn border ${
              whatsAppTestStatus.success 
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950' 
                : 'bg-rose-50 border-rose-300 text-rose-950'
            }`}>
              {whatsAppTestStatus.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1.5 flex-1">
                <div className="font-black text-sm flex items-center justify-between">
                  <span>
                    {whatsAppTestStatus.success 
                      ? `✅ نجح الإرسال الفعلي للواتساب (Live Gateway OK)` 
                      : `❌ فشل الاتصال / تم رفض الطلب من بوابة الواتساب`}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/80 border border-slate-200">
                    {new Date(whatsAppTestStatus.timestamp).toLocaleTimeString('ar-KW')}
                  </span>
                </div>

                {whatsAppTestStatus.success ? (
                  <div className="space-y-1 text-emerald-900">
                    <p>تم إرسال الرسالة بنجاح عبر البوابة الحقيقية إلى الهاتف <strong className="font-mono">{whatsAppTestStatus.phone}</strong>.</p>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono mt-1">
                      <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                        معرّف الرسالة (Message ID): {whatsAppTestStatus.messageId}
                      </span>
                      <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                        حالة الاستجابة: HTTP 200 OK
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1 text-rose-900">
                    <p className="font-bold">{whatsAppTestStatus.error}</p>
                    {whatsAppTestStatus.errorCode && (
                      <div className="text-[11px] font-mono text-rose-700">
                        كود الخطأ: <span className="bg-rose-100 px-1.5 py-0.5 rounded">{whatsAppTestStatus.errorCode}</span>
                        {whatsAppTestStatus.statusCode && ` (HTTP ${whatsAppTestStatus.statusCode})`}
                      </div>
                    )}
                    <div className="text-[11px] bg-white/70 p-2 rounded-lg border border-rose-200 text-slate-700 mt-2 space-y-1">
                      <div className="font-bold text-rose-800">💡 إرشادات تصحيح الخطأ:</div>
                      <ul className="list-disc list-inside space-y-0.5 text-[10px]">
                        <li>تأكد من صحة الـ <strong>API Token</strong> و <strong>Instance ID</strong> من لوحة تحكم UltraMsg أو مزود الخدمة.</li>
                        <li>تأكد من مسح رمز الـ QR وربط هاتف الواتساب في موقع البوابة (Instance is Authenticated/Connected).</li>
                        <li>تأكد من وجود رصيد فعال وإمكانية وصول الخادم لشبكة الإنترنت.</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* SECTION 3: PUBLIC VERIFICATION DOMAIN (رابط التوثيق العام وختم QR) */}
      {/* --------------------------------------------------------------------- */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                <span>3. رابط التوثيق العام وختم الـ QR (Public Verification Domain)</span>
                <span className="text-[11px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-mono font-bold">
                  Anti-Tamper Portal
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                النطاق والموقع المعتمد لإنشاء روابط التحقق الموثقة من الشهادات والمستندات الرسمية عند مسح رمز الـ QR
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setVerificationDomain(defaultDomain);
                toast.success('تم تعيين النطاق الفعلي الحالي للتطبيق تلقائياً.');
              }}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg border border-slate-300 transition"
            >
              استخدام نطاق التطبيق الحالي
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              رابط الموقع المعتمد لتوليد روابط التحقق (Public Verification Domain) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="url"
                value={verificationDomain}
                onChange={(e) => setVerificationDomain(e.target.value)}
                placeholder="https://verify.kuwait-hr.com"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-left font-mono focus:ring-2 focus:ring-indigo-600 focus:bg-white outline-none pl-12"
              />
              <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              يتم استخدامه في طباعة شهادات الراتب، عقود العمل، وإفادات نهاية الخدمة لتوجيه المفتش أو البنك لصفحة التحقق المشفرة
            </p>
          </div>

          {/* Live QR & Link Sample Preview Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
            <div className="text-xs font-bold text-slate-800 mb-3 flex items-center justify-between">
              <span>معاينة حية لشكل رابط التحقق والـ QR Code المتولد:</span>
              <div className="flex items-center gap-2">
                <select
                  value={sampleDocType}
                  onChange={(e) => setSampleDocType(e.target.value as any)}
                  className="bg-white border border-slate-300 text-slate-700 text-[11px] font-bold px-2 py-1 rounded"
                >
                  <option value="SALARY_CERT">شهادة راتب واستمرارية</option>
                  <option value="LEAVE_APPROVAL">اعتماد إجازة رسمية</option>
                  <option value="WORK_CONTRACT">عقد عمل كويتي موثق</option>
                  <option value="EXPERIENCE_LETTER">شهادة خبرة وخدمة</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
              {/* Left URL Box */}
              <div className="lg:col-span-2 space-y-2">
                <div className="bg-white border border-slate-300 rounded-lg p-3 font-mono text-[11px] text-indigo-700 break-all dir-ltr select-all">
                  {buildVerificationUrl()}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    onClick={() => handleCopyText(buildVerificationUrl(), 'رابط التحقق الكامل')}
                    className="flex items-center gap-1 text-slate-600 hover:text-slate-800 bg-white border border-slate-200 px-2.5 py-1 rounded shadow-2xs font-bold"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>نسخ الرابط</span>
                  </button>
                  <a
                    href={buildVerificationUrl()}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 bg-white border border-indigo-200 px-2.5 py-1 rounded shadow-2xs font-bold"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>تجربة فتح الرابط</span>
                  </a>
                </div>
              </div>

              {/* Right QR Visual */}
              <div className="flex items-center justify-center bg-white p-3 rounded-xl border border-slate-200 shadow-2xs gap-3">
                <div className="p-2 bg-slate-900 text-white rounded-lg">
                  <QrCode className="w-16 h-16" />
                </div>
                <div className="text-right space-y-1">
                  <div className="text-[11px] font-extrabold text-slate-800 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>ختم مشفر SHA-256</span>
                  </div>
                  <div className="text-[10px] text-slate-500">جاهز للمسح عبر كاميرا الهاتف وتطبيقات البنوك</div>
                  <div className="text-[9px] text-indigo-600 font-mono font-bold">DOC: {sampleDocCode}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* BRANCH ADD/EDIT MODAL */}
      {/* --------------------------------------------------------------------- */}
      {isBranchModalOpen && editingBranch && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 text-right dir-rtl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-slate-800 text-base">
                  {editingBranch.id && branches.some(b => b.id === editingBranch.id) ? 'تعديل بيانات فرع' : 'إضافة فرع جديد ونطاق Geofence'}
                </h3>
              </div>
              <button
                onClick={() => setIsBranchModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBranchModal} className="space-y-4">
              {/* Quick Preset Selector for Kuwait */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  تحديد سريع من مواقع ومحافظات الكويت:
                </label>
                <select
                  onChange={(e) => {
                    const found = KUWAIT_PRESET_LOCATIONS.find(loc => loc.name === e.target.value);
                    if (found) {
                      setEditingBranch(prev => ({
                        ...prev,
                        branchName: prev?.branchName || found.name,
                        latitude: found.lat,
                        longitude: found.lng,
                        address: found.address
                      }));
                    }
                  }}
                  defaultValue=""
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-medium"
                >
                  <option value="" disabled>-- اختر موقعاً شهيراً لملء الإحداثيات تلقائياً --</option>
                  {KUWAIT_PRESET_LOCATIONS.map(loc => (
                    <option key={loc.name} value={loc.name}>{loc.name}</option>
                  ))}
                </select>
              </div>

              {/* Branch Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم الفرع (Branch Name) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingBranch.branchName || ''}
                  onChange={(e) => setEditingBranch(prev => ({ ...prev, branchName: e.target.value }))}
                  placeholder="مثال: المقر الرئيسي - برج الحمراء شرق"
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold"
                />
              </div>

              {/* Coordinates Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    خط العرض (Latitude) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={editingBranch.latitude ?? 29.3759}
                    onChange={(e) => setEditingBranch(prev => ({ ...prev, latitude: parseFloat(e.target.value) }))}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-mono text-left"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    خط الطول (Longitude) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={editingBranch.longitude ?? 47.9774}
                    onChange={(e) => setEditingBranch(prev => ({ ...prev, longitude: parseFloat(e.target.value) }))}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-mono text-left"
                  />
                </div>
              </div>

              {/* Radius in Meters & Geolocation button */}
              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    نصف القطر بالمتر (Radius in Meters) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="5000"
                    required
                    value={editingBranch.radiusMeters ?? 100}
                    onChange={(e) => setEditingBranch(prev => ({ ...prev, radiusMeters: parseInt(e.target.value) || 100 }))}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold font-mono"
                  />
                </div>
                <div className="pt-5">
                  <button
                    type="button"
                    onClick={handleGetCurrentGPS}
                    className="w-full flex items-center justify-center gap-1.5 bg-purple-50 text-[#714B67] hover:bg-purple-100 border border-[#714B67]/30 text-xs font-bold p-2 rounded-lg transition"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>التقاط موقعي GPS</span>
                  </button>
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">العنوان والوصف:</label>
                <input
                  type="text"
                  value={editingBranch.address || ''}
                  onChange={(e) => setEditingBranch(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="شارع الشهداء، شرق، مدينة الكويت"
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="branchActiveToggle"
                  checked={editingBranch.isActive !== false}
                  onChange={(e) => setEditingBranch(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <label htmlFor="branchActiveToggle" className="text-xs font-bold text-slate-700 cursor-pointer">
                  تفعيل الفرع للسماح بتسجيل الحضور والانصراف
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBranchModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow"
                >
                  حفظ الفرع
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
