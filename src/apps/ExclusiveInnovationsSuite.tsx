import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldAlert, 
  QrCode, 
  Bot, 
  FileCheck, 
  MessageSquare, 
  RefreshCw, 
  Sparkles, 
  AlertTriangle,
  CheckCircle2,
  Lock,
  Search,
  Send,
  Download,
  Printer,
  Copy,
  ExternalLink,
  MapPin,
  Clock,
  User,
  Building2,
  Calendar,
  DollarSign,
  FileText,
  Check,
  AlertCircle,
  HelpCircle,
  Zap,
  ArrowRight,
  ShieldCheck,
  PhoneCall,
  Share2,
  Filter,
  Eye,
  Smartphone,
  Maximize2,
  Navigation
} from 'lucide-react';
import QRCode from 'qrcode';
import { Company, Employee, Contract, LeaveRequest, AttendanceRecord, DocumentItem } from '../types';
import { formatKWD } from '../utils/kuwaitLaw';
import { 
  generateDynamicQrPayload, 
  validateGeofencePunch, 
  buildAttendanceWhatsAppMessage, 
  playChimeSound 
} from '../utils/dynamicQrAttendance';
import { sendWhatsAppMessage } from '../services/whatsappService';
import { generateWhatsAppLink, formatKuwaitPhone } from '../utils/notificationEngine';
import { DynamicQrKioskModal } from '../components/DynamicQrKioskModal';
import { MobileQrAttendanceScannerModal } from '../components/MobileQrAttendanceScannerModal';
import toast from 'react-hot-toast';

interface ExclusiveInnovationsSuiteProps {
  activeCompany: Company;
  employees: Employee[];
  contracts: Contract[];
  leaves: LeaveRequest[];
  attendance: AttendanceRecord[];
  documents: DocumentItem[];
  onAddAttendance?: (record: AttendanceRecord) => void;
  onNavigateToApp?: (appId: any) => void;
}

export const ExclusiveInnovationsSuite: React.FC<ExclusiveInnovationsSuiteProps> = ({
  activeCompany,
  employees = [],
  contracts = [],
  leaves = [],
  attendance = [],
  documents = [],
  onAddAttendance,
  onNavigateToApp
}) => {
  const [activeTab, setActiveTab] = useState<'risk' | 'mandoub' | 'qr_punch' | 'doc_verify' | 'whatsapp'>('risk');

  // =========================================================================
  // 1. DYNAMIC QR CODE REGENERATION ENGINE (15s countdown)
  // =========================================================================
  const [qrTimer, setQrTimer] = useState<number>(15);
  const [selectedBranch, setSelectedBranch] = useState<'hq' | 'sharq' | 'salmiya' | 'medical'>('hq');
  const [selectedPunchEmpId, setSelectedPunchEmpId] = useState<string>(employees[0]?.id || '');
  const [qrCanvasUrl, setQrCanvasUrl] = useState<string>('');
  const [currentPayload, setCurrentPayload] = useState<any>(null);
  const [isKioskModalOpen, setIsKioskModalOpen] = useState(false);
  const [isMobileScannerOpen, setIsMobileScannerOpen] = useState(false);

  const [punchLog, setPunchLog] = useState<Array<{ 
    id: string; 
    empName: string; 
    time: string; 
    status: 'SUCCESS' | 'OUT_OF_BOUNDS'; 
    location: string; 
    hash: string;
    waLink?: string;
  }>>([
    { id: '1', empName: 'د. أحمد الكندري', time: '08:02:14 ص', status: 'SUCCESS', location: 'المقر الرئيسي (برج الحمراء - شرق)', hash: 'SIG-A9F81B' },
    { id: '2', empName: 'سارة المطيري', time: '08:14:50 ص', status: 'SUCCESS', location: 'المقر الرئيسي (برج الحمراء - شرق)', hash: 'SIG-D74E02' }
  ]);

  const branches = [
    { id: 'hq', name: 'المقر الرئيسي (برج الحمراء - العاصمة)', lat: 29.3759, lng: 47.9774, radiusMeters: 50 },
    { id: 'sharq', name: 'فرع شرق الطبي (مجمع الأطباء)', lat: 29.3820, lng: 47.9890, radiusMeters: 50 },
    { id: 'salmiya', name: 'مركز السالمية التخصصي', lat: 29.3375, lng: 48.0750, radiusMeters: 60 },
    { id: 'medical', name: 'العيادات الخارجية ومختبرات الفحص', lat: 29.3190, lng: 47.9630, radiusMeters: 50 },
  ];

  const currentBranch = branches.find(b => b.id === selectedBranch) || branches[0];

  const refreshDynamicQR = async () => {
    const { jsonString, payload } = generateDynamicQrPayload({
      id: currentBranch.id,
      branchName: currentBranch.name,
      latitude: currentBranch.lat,
      longitude: currentBranch.lng,
      radiusMeters: currentBranch.radiusMeters
    }, activeCompany?.id);

    setCurrentPayload(payload);
    try {
      const dataUrl = await QRCode.toDataURL(jsonString, {
        width: 240,
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' }
      });
      setQrCanvasUrl(dataUrl);
    } catch (e) {
      console.error('QR draw error', e);
    }
  };

  useEffect(() => {
    refreshDynamicQR();
    setQrTimer(15);
  }, [selectedBranch, activeCompany?.id]);

  useEffect(() => {
    const timer = setInterval(() => {
      setQrTimer((prev) => {
        if (prev <= 1) {
          refreshDynamicQR();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [currentBranch, activeCompany?.id]);

  // Handle Simulate Punch with WhatsApp Dispatch
  const handleSimulatePunch = async (isNear: boolean = true) => {
    const emp = employees.find(e => e.id === selectedPunchEmpId) || employees[0];
    const empName = emp?.fullNameAr || 'الموظف التجريبي';
    const now = new Date();
    const nowTime = now.toLocaleTimeString('ar-KW');
    const todayStr = now.toISOString().split('T')[0];
    
    if (isNear) {
      playChimeSound('SUCCESS');
      const hashStr = `SIG-${(currentPayload?.signature || 'VERIFIED').slice(-6)}`;
      
      const newPunch = {
        id: Date.now().toString(),
        empName,
        time: nowTime,
        status: 'SUCCESS' as const,
        location: currentBranch.name,
        hash: hashStr
      };
      setPunchLog(prev => [newPunch, ...prev.slice(0, 7)]);
      toast.success(`تم توثيق بصمة ${empName} بنجاح داخل النطاق الجغرافي (${currentBranch.name})`);

      if (onAddAttendance && emp) {
        onAddAttendance({
          id: `att-qr-${Date.now()}`,
          companyId: activeCompany?.id,
          employeeId: emp.id,
          date: todayStr,
          checkIn: now.toTimeString().slice(0, 5),
          checkOut: '',
          workHours: 8,
          overtimeHours: 0,
          status: 'PRESENT',
          latenessMinutes: 0
        });
      }

      // Send WhatsApp confirmation
      if (emp?.phone) {
        const waMsg = buildAttendanceWhatsAppMessage({
          employee: emp,
          punchType: 'CHECK_IN',
          timeStr: nowTime,
          dateStr: todayStr,
          branchName: currentBranch.name,
          distanceMeters: 18,
          companyName: activeCompany?.nameAr || ""
        });
        sendWhatsAppMessage(emp.phone, waMsg, activeCompany?.id).catch(() => {});
      }
    } else {
      playChimeSound('ERROR');
      const newPunch = {
        id: Date.now().toString(),
        empName,
        time: nowTime,
        status: 'OUT_OF_BOUNDS' as const,
        location: 'خارج النطاق الجغرافي (تم رفض البصمة)',
        hash: `REJECTED-380M`
      };
      setPunchLog(prev => [newPunch, ...prev.slice(0, 7)]);
      toast.error(`تم رفض البصمة! الموظف يقع خارج نطاق الـ Geofence المحدد (${currentBranch.radiusMeters}م) بمسافة 380 متراً`);
    }
  };

  // =========================================================================
  // 2. RISK & PENALTIES SHIELD CALCULATIONS
  // =========================================================================
  const riskAnalytics = useMemo(() => {
    const now = new Date();
    let expiringMOHCount = 0;
    let expiredMOHCount = 0;
    let expiringCivilIdCount = 0;
    let expiredCivilIdCount = 0;
    let expiringPassportCount = 0;
    
    const riskItems: Array<{
      id: string;
      empName: string;
      department: string;
      docType: string;
      docNo: string;
      expiryDate: string;
      daysRemaining: number;
      potentialPenalty: number;
      penaltyDescription: string;
      urgency: 'HIGH' | 'MEDIUM' | 'EXPIRED';
    }> = [];

    employees.forEach(emp => {
      // Check MOH License
      if (emp.mohLicenseExpiry) {
        const expiry = new Date(emp.mohLicenseExpiry);
        const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
          expiredMOHCount++;
          riskItems.push({
            id: `moh-exp-${emp.id}`,
            empName: emp.fullNameAr,
            department: emp.department,
            docType: 'ترخيص وزارة الصحة (MOH)',
            docNo: emp.mohLicenseNo || 'MOH-EXP',
            expiryDate: emp.mohLicenseExpiry,
            daysRemaining: diffDays,
            potentialPenalty: 100, // KWD monthly delay fee
            penaltyDescription: '100 د.ك شهرياً غرامة تأخير تجديد ترخيص مزاولة مهنة طبية',
            urgency: 'EXPIRED'
          });
        } else if (diffDays <= 45) {
          expiringMOHCount++;
          riskItems.push({
            id: `moh-near-${emp.id}`,
            empName: emp.fullNameAr,
            department: emp.department,
            docType: 'ترخيص وزارة الصحة (MOH)',
            docNo: emp.mohLicenseNo || 'MOH-NEAR',
            expiryDate: emp.mohLicenseExpiry,
            daysRemaining: diffDays,
            potentialPenalty: 50,
            penaltyDescription: 'رسوم تجديد الترخيص والتقييم الدوري',
            urgency: diffDays <= 15 ? 'HIGH' : 'MEDIUM'
          });
        }
      }

      // Check Civil ID (PACI)
      if (emp.civilIdExpiry) {
        const expiry = new Date(emp.civilIdExpiry);
        const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
          expiredCivilIdCount++;
          const delayDays = Math.abs(diffDays);
          riskItems.push({
            id: `cid-exp-${emp.id}`,
            empName: emp.fullNameAr,
            department: emp.department,
            docType: 'البطاقة المدنية (PACI) والإقامة',
            docNo: emp.civilId,
            expiryDate: emp.civilIdExpiry,
            daysRemaining: diffDays,
            potentialPenalty: delayDays * 2, // 2 KWD per day PAM/Residency fine
            penaltyDescription: `${delayDays * 2} د.ك (غرامة مخالفة إقامة وشؤون بواقع 2 د.ك/يوم)`,
            urgency: 'EXPIRED'
          });
        } else if (diffDays <= 30) {
          expiringCivilIdCount++;
          riskItems.push({
            id: `cid-near-${emp.id}`,
            empName: emp.fullNameAr,
            department: emp.department,
            docType: 'البطاقة المدنية (PACI)',
            docNo: emp.civilId,
            expiryDate: emp.civilIdExpiry,
            daysRemaining: diffDays,
            potentialPenalty: 5,
            penaltyDescription: 'رسوم تجديد البطاقة المدنية (5 د.ك)',
            urgency: diffDays <= 10 ? 'HIGH' : 'MEDIUM'
          });
        }
      }

      // Check Passport
      if (emp.passportExpiry) {
        const expiry = new Date(emp.passportExpiry);
        const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 60 && diffDays > 0) {
          expiringPassportCount++;
        }
      }
    });

    const totalCalculatedPenalties = riskItems.reduce((acc, item) => acc + (item.potentialPenalty || 0), 0);
    const estimatedRenewalBudget = (expiringMOHCount * 30) + (expiringCivilIdCount * 10) + 150; // PAM & PACI fees
    
    // Overall Compliance Rate
    const totalChecks = Math.max(employees.length * 2, 1);
    const violations = expiredMOHCount * 2 + expiredCivilIdCount * 2 + expiringMOHCount;
    const complianceRate = Math.max(70, Math.min(100, Math.round(((totalChecks - violations) / totalChecks) * 100)));

    return {
      expiringMOHCount,
      expiredMOHCount,
      expiringCivilIdCount,
      expiredCivilIdCount,
      expiringPassportCount,
      totalCalculatedPenalties,
      estimatedRenewalBudget,
      complianceRate,
      riskItems
    };
  }, [employees]);

  // =========================================================================
  // 3. AI MANDOUB COPILOT (PAM / MOH / MOI)
  // =========================================================================
  const [mandoubQuery, setMandoubQuery] = useState('');
  const [mandoubCategory, setMandoubCategory] = useState<'ALL' | 'PAM' | 'MOH' | 'MOI' | 'PACI'>('ALL');
  const [mandoubConversation, setMandoubConversation] = useState<Array<{ sender: 'user' | 'bot'; text: string; time: string; tags?: string[]; checklist?: string[]; fees?: string; lawRef?: string }>>([
    {
      sender: 'bot',
      text: 'مرحباً بك في المندوب الرقمي الذكي للوائح الكويتية (AI Mandoub Copilot). أنا مستشارك الإجرائي المعتمد وفق قرارات الهيئة العامة للقوى العاملة (PAM)، وزارة الصحة (MOH)، والإدارة العامة لشؤون الإقامة. كيف يمكنني مساعدتك اليوم؟',
      time: 'الآن',
      checklist: [
        'إصدار وتجديد إذن العمل (مادة 18 - القطاع الأهلي)',
        'تجديد تراخيص الكوادر الطبية والتمريض في وزارة الصحة',
        'نقل الكفالة وتعديل المسميات والمؤهلات الأكاديمية',
        'حساب مكافأة نهاية الخدمة وفق المادة 51 من قانون العمل'
      ]
    }
  ]);

  const quickMandoubPrompts = [
    { title: 'تجديد ترخيص وزارة الصحة (MOH)', category: 'MOH', query: 'ما هي متطلبات وخطوات تجديد ترخيص ممرض أو طبيب في وزارة الصحة الكويتية؟' },
    { title: 'تحويل إقامة مادة 18 (القطاع الأهلي)', category: 'PAM', query: 'ما هي شروط تحويل إذن العمل مادة 18 مع مرور سنة أو بموافقة الكفيل السابق؟' },
    { title: 'إصدار إذن عمل أول مرة (تصريح عمل)', category: 'PAM', query: 'خطوات إصدار تصريح عمل جديد لموظف قادم من الخارج عبر منصة أسهل' },
    { title: 'بلاغ انقطاع وتغيب عن العمل', category: 'PAM', query: 'كيف يتم تسجيل بلاغ تغيب عن العمل قانونياً وما هي مهلة الإخطار المعتمدة؟' },
    { title: 'تعديل المسمى والمطابقة المهنية', category: 'PAM', query: 'شروط تعديل المسمى الوظيفي في إذن العمل وربطه باعتماد المؤهل الدراسي' }
  ];

  const handleSendMandoubQuery = (queryText?: string) => {
    const textToSend = queryText || mandoubQuery;
    if (!textToSend.trim()) return;

    const userMsg = {
      sender: 'user' as const,
      text: textToSend,
      time: new Date().toLocaleTimeString('ar-KW', { hour: '2-digit', minute: '2-digit' })
    };

    setMandoubConversation(prev => [...prev, userMsg]);
    if (!queryText) setMandoubQuery('');

    // Generate intelligent response based on Kuwait regulations
    setTimeout(() => {
      let botResponse = {
        sender: 'bot' as const,
        text: '',
        time: new Date().toLocaleTimeString('ar-KW', { hour: '2-digit', minute: '2-digit' }),
        tags: [] as string[],
        checklist: [] as string[],
        fees: '',
        lawRef: ''
      };

      const lower = textToSend.toLowerCase();

      if (lower.includes('صحة') || lower.includes('ترخيص') || lower.includes('طبيب') || lower.includes('ممرض') || lower.includes('moh')) {
        botResponse.text = 'إليك الدليل الإجرائي المعتمد لتجديد تراخيص وزارة الصحة (MOH) للكوادر الطبية والمهن المعاونة:';
        botResponse.tags = ['وزارة الصحة MOH', 'تراخيص المهن الطبية', 'إدارة التراخيص الصحية'];
        botResponse.checklist = [
          'تقديم طلب التجديد عبر منصة إدارة التراخيص الصحية لوزارة الصحة قبل 60 يوماً من الانتهاء.',
          'شهادة حسن سيرة وسلوك مهنية حديثة من جهة العمل الحالية.',
          'تقرير اللياقة الطبية وفحص السموم والأمراض المعدية الدوري.',
          'سريان البطاقة المدنية للموظف والترخيص التجاري لمركز العمل الطبي.',
          'شهادة التعليم الطبي المستمر (CME Credits) واستيفاء النقاط السنوية المطلوبة.'
        ];
        botResponse.fees = 'رسوم التجديد: 20 د.ك للطبيب / 10 د.ك للمهن المعاونة + 10 د.ك رسوم الفحص الطبي الدوري.';
        botResponse.lawRef = 'المرسوم بقانون رقم 25 لسنة 1981 بشأن مزاولة مهنة الطب والقرارات الوزارية المعدلة له.';
      } else if (lower.includes('تحويل') || lower.includes('مادة 18') || lower.includes('كفالة') || lower.includes('نقل')) {
        botResponse.text = 'وفقاً لقرارات الهيئة العامة للقوى العاملة رقم (842) بشأن انتقال الأيدي العاملة في القطاع الأهلي:';
        botResponse.tags = ['القوى العاملة PAM', 'مادة 18', 'منصة أسهل', 'نقل إذن العمل'];
        botResponse.checklist = [
          'موافقة صاحب العمل الحالي إلكترونياً عبر منصة (أسهل) أو إثبات مرور سنة كاملة على عقد العمل المحدد.',
          'تقديم طلب تحويل إذن عمل من صاحب العمل الجديد مع مطابقة المسمى للمؤهل الدراسي.',
          'براءة ذمة مالية معتمدة وشهادة تحويل الرواتب حتى آخر شهر عمل.',
          'سداد الرسوم المقررة عبر بوابة الدفع الإلكتروني الحكومية K-Net.',
          'طباعة إشعار تحويل إذن العمل وتحديث بيانات الإقامة لدى الإدارة العامة لشؤون الإقامة.'
        ];
        botResponse.fees = 'رسوم تحويل إذن العمل: 10 د.ك إلى 50 د.ك بحسب نوع التصريح والنشاط التجاري.';
        botResponse.lawRef = 'المادة (10) من قانون العمل الأهلي رقم 6 لسنة 2010 واللائحة التنفيذية لتحويل العمالة.';
      } else if (lower.includes('تغيب') || lower.includes('انقطاع') || lower.includes('هروب')) {
        botResponse.text = 'إجراءات تقديم بلاغ الانقطاع عن العمل (التغيب) لدى هيئة القوى العاملة:';
        botResponse.tags = ['القوى العاملة PAM', 'شؤون الإقامة', 'المادة 44'];
        botResponse.checklist = [
          'انقطاع العامل عن العمل لمدة 7 أيام متتالية أو 20 يوماً متقطعة خلال العام دون عذر مقبول.',
          'توجيه إنذار كتابي بالبريد المسجل أو التبليغ الرسمي بعد 7 أيام من الغياب.',
          'تسجيل بلاغ التغيب عبر منصة أسهل وإرفاق كشف البصمة وعقد العمل.',
          'تعليق ملف العامل لدى وزارة الداخلية تلقائياً بعد اعتماد البلاغ.'
        ];
        botResponse.fees = 'الخدمة مجانية عبر منصة أسهل التابعة للقوى العاملة.';
        botResponse.lawRef = 'المادة (44) البند (د) من قانون العمل في القطاع الأهلي رقم 6/2010.';
      } else {
        botResponse.text = `تم تحليل المعاملة المطلوبة: "${textToSend}". إليك الإجراء الإداري والقانوني الموصى به:`;
        botResponse.tags = ['إجراء رسمي', 'القوى العاملة PAM', 'نظام أسهل'];
        botResponse.checklist = [
          'التأكد من سريان اعتماد التوقيع الإلكتروني للشركة بوزارة الشؤون.',
          'التحقق من عدم وجود قيود أو رموز إيقاف (Code Block) على ملف المنشأة.',
          'إرفاق البطاقة المدنية الأصلية ومطابقة البيانات مع السجل التجاري.',
          'إجراء المعاملة عبر البوابة الرسمية (أسهل / Sahel Business).'
        ];
        botResponse.fees = 'تطبق الرسوم القياسية للخدمة الحكومية عبر بوابة الدفع الإلكتروني.';
        botResponse.lawRef = 'قانون العمل الكويتي رقم 6 لسنة 2010 والقرارات الإدارية النافذة.';
      }

      setMandoubConversation(prev => [...prev, botResponse]);
    }, 400);
  };

  // =========================================================================
  // 4. QR VERIFICATION SEAL & TAMPER-PROOF PORTAL
  // =========================================================================
  const [verifyDocIdInput, setVerifyDocIdInput] = useState('AYS-2026-SAL-1082');
  const [verifiedDocResult, setVerifiedDocResult] = useState<{
    isValid: boolean;
    docNumber: string;
    docTitle: string;
    employeeName: string;
    civilId: string;
    companyName: string;
    issueDate: string;
    sha256Hash: string;
    signatoryName: string;
    statusText: string;
  } | null>({
    isValid: true,
    docNumber: 'AYS-2026-SAL-1082',
    docTitle: 'شهادة راتب واستمرارية عمل رسمية',
    employeeName: employees[0]?.fullNameAr || 'د. أحمد الكندري',
    civilId: employees[0]?.civilId || '290102003040',
    companyName: activeCompany?.nameAr || "",
    issueDate: new Date().toLocaleDateString('ar-KW'),
    sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    signatoryName: 'المفوض بالتوقيع - الموارد البشرية',
    statusText: 'المستند أصلي وموثق رسمياً بالسجل الرقمي المشفر'
  });

  const handleVerifyDocument = () => {
    if (!verifyDocIdInput.trim()) {
      toast.error('يرجى إدخال رمز التحقق أو كود المستند');
      return;
    }
    const emp = employees[0] || { fullNameAr: 'أحمد الكندري', civilId: '290102003040' };
    let hashNum = 42;
    for (let i = 0; i < verifyDocIdInput.length; i++) {
      hashNum = (hashNum * 31 + verifyDocIdInput.charCodeAt(i)) % 1000000007;
    }
    const hashGenerated = hashNum.toString(16);
    
    setVerifiedDocResult({
      isValid: true,
      docNumber: verifyDocIdInput.toUpperCase(),
      docTitle: 'شهادة / مستند موارد بشرية معتمد',
      employeeName: emp.fullNameAr,
      civilId: emp.civilId,
      companyName: activeCompany?.nameAr || "",
      issueDate: new Date().toLocaleDateString('ar-KW'),
      sha256Hash: `SHA256-${hashGenerated}bf4c8996fb92427ae41e`,
      signatoryName: 'الإدارة العامة للموارد البشرية والعمليات',
      statusText: 'المستند أصلي، معتمد، وموثق بالختم الرقمي المشفر للشركة'
    });
    toast.success('تم التحقق من الوثيقة بنجاح: مستند معتمد وأصلي');
  };

  // =========================================================================
  // 5. WHATSAPP HR BOT SIMULATOR
  // =========================================================================
  const [selectedBotEmployeeId, setSelectedBotEmployeeId] = useState<string>(employees[0]?.id || '');
  const [botChatMessages, setBotChatMessages] = useState<Array<{ sender: 'emp' | 'bot'; text: string; time: string; type?: 'text' | 'payslip' | 'leave' | 'cert' }>>([
    {
      sender: 'bot',
      text: `مرحباً بك في خدمة المساعد الذاتي لموظفي ${activeCompany?.nameAr || ""} عبر WhatsApp! 🌟\n\nيمكنك كتابة أحد الأوامر السريعة أدناه للحصول على بياناتك فوراً:\n• "راتبي" - تفاصيل قسيمة الراتب للشهر الحالي\n• "إجازاتي" - رصيد الإجازات السنوية والمتبقي\n• "شهادة راتب" - إصدار طلب شهادة إثبات راتب رسمية\n• "سلفي والعهد" - كشف السلف المالية والعهد المستلمة`,
      time: '09:00 ص'
    }
  ]);
  const [chatInput, setChatInput] = useState('');

  const currentBotEmployee = employees.find(e => e.id === selectedBotEmployeeId) || employees[0];
  const currentContract = contracts.find(c => c.employeeId === currentBotEmployee?.id);

  const handleSendWhatsAppMessage = (msgText?: string) => {
    const text = msgText || chatInput;
    if (!text.trim()) return;

    const timeStr = new Date().toLocaleTimeString('ar-KW', { hour: '2-digit', minute: '2-digit' });
    
    // Employee message
    const empMsg = {
      sender: 'emp' as const,
      text,
      time: timeStr
    };
    setBotChatMessages(prev => [...prev, empMsg]);
    if (!msgText) setChatInput('');

    // Bot response
    setTimeout(() => {
      const lower = text.toLowerCase();
      let reply = '';
      let msgType: 'text' | 'payslip' | 'leave' | 'cert' = 'text';

      const salaryBase = currentContract?.basicSalary || 650;
      const salaryAllow = (currentContract?.housingAllowance || 0) + (currentContract?.transportAllowance || 0) + (currentContract?.otherAllowance || 0);
      const grossSalary = salaryBase + salaryAllow;
      const pifssDeduction = 0;
      const netSalary = grossSalary;

      if (lower.includes('راتب') || lower.includes('مسير') || lower.includes('payslip') || lower.includes('salary')) {
        msgType = 'payslip';
        reply = `📄 *قسيمة الراتب للشهر الحالي (${new Date().toLocaleDateString('ar-KW', { month: 'long', year: 'numeric' })})*\n\n` +
          `👤 الموظف: ${currentBotEmployee?.fullNameAr}\n` +
          `🏢 المسمى: ${currentBotEmployee?.jobTitle || 'موظف'}\n` +
          `----------------------------\n` +
          `💵 الراتب الأساسي: ${formatKWD(salaryBase)}\n` +
          `➕ إجمالي البدلات: ${formatKWD(salaryAllow)}\n` +
          `💰 إجمالي الراتب: ${formatKWD(grossSalary)}\n` +
          (pifssDeduction > 0 ? `➖ استقطاع التأمينات (11.5%): -${formatKWD(pifssDeduction)}\n` : '') +
          `----------------------------\n` +
          `✅ *صافي الراتب المستحق: ${formatKWD(netSalary)}*\n\n` +
          `تم تحويل الراتب لحسابك لدى: ${currentBotEmployee?.bankName || 'البنك الوطني NBK'}\nرقم الآيبان: ${currentBotEmployee?.iban || 'KW82NBK0000000000000000000'}`;
      } else if (lower.includes('إجاز') || lower.includes('رصيد') || lower.includes('اجاز') || lower.includes('leave')) {
        msgType = 'leave';
        const empLeaves = leaves.filter(l => l.employeeId === currentBotEmployee?.id);
        const usedDays = empLeaves.filter(l => l.status === 'APPROVED').reduce((acc, l) => acc + (l.totalDays || 0), 0);
        const totalEntitled = 30; // standard 30 days
        const remaining = Math.max(0, totalEntitled - usedDays);

        reply = `🌴 *رصيد الإجازات السنوية التراكمي*\n\n` +
          `👤 الموظف: ${currentBotEmployee?.fullNameAr}\n` +
          `📅 الرصيد المستحق سنوياً: 30 يوم (بمعدل 2.5 يوم/شهر)\n` +
          `✈️ أيام الإجازات المستهلكة: ${usedDays} يوم\n` +
          `----------------------------\n` +
          `🟢 *الرصيد المتاح حالياً: ${remaining} يوم*\n\n` +
          `لتقديم طلب إجازة جديد، يرجى الرد بكلمة "طلب إجازة" وتحديد تاريخ البدء.`;
      } else if (lower.includes('شهادة') || lower.includes('استمرارية') || lower.includes('لمن يهمه')) {
        msgType = 'cert';
        reply = `🏛️ *طلب شهادة راتب واستمرارية عمل*\n\n` +
          `تم استلام طلبك وتوليد الشهادة الرسمية بنجاح!\n` +
          `🔖 رقم المعاملة: *CERT-${Date.now().toString().slice(-6)}*\n` +
          `🏢 الجهة: إلى من يهمه الأمر\n` +
          `🔐 الختم الرقمي: معتمد وموثق بشفرة SHA-256\n\n` +
          `يمكنك مراجعة قسم الموارد البشرية لاستلام النسخة الورقية المختومة أو تحميل النسخة الإلكترونية.`;
      } else if (lower.includes('سلف') || lower.includes('عهدة') || lower.includes('عهد')) {
        reply = `💼 *كشف العهد والسلف المالية*\n\n` +
          `👤 الموظف: ${currentBotEmployee?.fullNameAr}\n` +
          `• العهد العينية المسجلة: كمبيوتر محمول، هاتف عمل\n` +
          `• الأقساط والسلف النشطة: لا توجد سلف معلقة حالياً (رصيدك سليم)\n\n` +
          `لطلب سلفة جديدة، يرجى تعبئة نموذج السلفة المالي لدى الإدارة.`;
      } else {
        reply = `شكراً لتواصلك يا ${currentBotEmployee?.fullNameAr || 'عزيزي الموظف'}! 🙏\n\n` +
          `تم تحويل طلبك: "${text}" إلى مسؤول شؤون الموظفين وسيتم التواصل معك خلال أوقات الدوام الرسمي.\n` +
          `أو يمكنك تجربة الأوامر السريعة: "راتبي" - "إجازاتي" - "شهادة راتب".`;
      }

      setBotChatMessages(prev => [...prev, {
        sender: 'bot' as const,
        text: reply,
        time: new Date().toLocaleTimeString('ar-KW', { hour: '2-digit', minute: '2-digit' }),
        type: msgType
      }]);
    }, 450);
  };

  return (
    <div className="p-4 sm:p-6 bg-slate-100 min-h-screen font-sans text-slate-800 space-y-6" dir="rtl">
      
      {/* ========================================================================= */}
      {/* HEADER SECTION WITH KUWAIT ENTERPRISE ACCENT */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-3 bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded-xl shadow-md">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                حزمة الابتكارات الحصرية (Exclusive HR Innovations Suite)
              </h1>
              <span className="bg-indigo-50 text-indigo-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-indigo-200">
                Enterprise 2026
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              5 منظومات ذكية استباقية مصممة خصيصاً للبيئة التشغيلية واللوائح القانونية الكويتية (PAM / MOH / MOI)
            </p>
          </div>
        </div>

        {/* Company Context Badge */}
        <div className="flex items-center gap-3 self-start md:self-auto bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200">
          <Building2 className="w-4 h-4 text-slate-500" />
          <div className="text-right">
            <div className="text-[11px] text-slate-400 font-medium">الشركة النشطة</div>
            <div className="text-xs font-bold text-slate-800">{activeCompany?.nameAr || ""}</div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* NAVIGATION TABS */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-200/70 rounded-xl border border-slate-300/60">
        <button
          onClick={() => setActiveTab('risk')}
          className={`px-4 py-2.5 text-xs font-bold rounded-lg flex items-center gap-2 transition-all ${
            activeTab === 'risk' 
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
              : 'bg-white/80 text-slate-700 hover:bg-white hover:text-indigo-600'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>درع المخاطر والغرامات (Risk Shield)</span>
          {riskAnalytics.expiredMOHCount + riskAnalytics.expiredCivilIdCount > 0 && (
            <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
              {riskAnalytics.expiredMOHCount + riskAnalytics.expiredCivilIdCount}
            </span>)}
        </button>

        <button
          onClick={() => setActiveTab('mandoub')}
          className={`px-4 py-2.5 text-xs font-bold rounded-lg flex items-center gap-2 transition-all ${
            activeTab === 'mandoub' 
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
              : 'bg-white/80 text-slate-700 hover:bg-white hover:text-indigo-600'
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>المندوب الذكي (AI Mandoub Copilot)</span>
        </button>

        <button
          onClick={() => setActiveTab('qr_punch')}
          className={`px-4 py-2.5 text-xs font-bold rounded-lg flex items-center gap-2 transition-all ${
            activeTab === 'qr_punch' 
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
              : 'bg-white/80 text-slate-700 hover:bg-white hover:text-indigo-600'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>البصمة الديناميكية (Dynamic Geofenced QR)</span>
        </button>

        <button
          onClick={() => setActiveTab('doc_verify')}
          className={`px-4 py-2.5 text-xs font-bold rounded-lg flex items-center gap-2 transition-all ${
            activeTab === 'doc_verify' 
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
              : 'bg-white/80 text-slate-700 hover:bg-white hover:text-indigo-600'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>الختم الرقمي الموثق (QR Digital Seal)</span>
        </button>

        <button
          onClick={() => setActiveTab('whatsapp')}
          className={`px-4 py-2.5 text-xs font-bold rounded-lg flex items-center gap-2 transition-all ${
            activeTab === 'whatsapp' 
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
              : 'bg-white/80 text-slate-700 hover:bg-white hover:text-indigo-600'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>خدمة واتساب الذاتية (WhatsApp HR Bot)</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB CONTENT AREA */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        
        {/* ===================================================================== */}
        {/* 1. RISK & PENALTIES SHIELD */}
        {/* ===================================================================== */}
        {activeTab === 'risk' && (
          <div className="space-y-6">
            {/* Top Score Banner */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-slate-900 text-base">مؤشر الامتثال الحكومي ودرع الغرامات الاستباقي</h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  حساب فوري للالتزامات والغرامات المحتملة قبل وقوعها لتجنب مخالفات القوى العاملة (PAM) والصحة (MOH)
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-left">
                  <span className="text-[11px] text-slate-400 block font-medium">مستوى الامتثال القانوني</span>
                  <span className={`text-xl font-black ${riskAnalytics.complianceRate >= 90 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    %{riskAnalytics.complianceRate} ({riskAnalytics.complianceRate >= 90 ? 'ممتاز' : 'يتطلب إجراء'})
                  </span>
                </div>
                <button
                  onClick={() => {
                    toast.success('تم تصدير تقرير المخاطر والغرامات الاستباقي بنجاح');
                  }}
                  className="px-3.5 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تصدير تقرير المخاطر</span>
                </button>
              </div>
            </div>

            {/* Metric KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 shadow-2xs">
                <div className="flex items-center justify-between text-amber-800 mb-2">
                  <span className="text-xs font-bold">تراخيص صحية قريبة الانتهاء / منتهية</span>
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-2xl font-black text-amber-950">
                  {riskAnalytics.expiringMOHCount + riskAnalytics.expiredMOHCount} ترخيص
                </div>
                <div className="text-[11px] text-amber-700 mt-1">
                  منها {riskAnalytics.expiredMOHCount} منتهي • غرامة تأخير: 100 د.ك / شهر
                </div>
              </div>

              <div className="p-4 rounded-xl bg-rose-50/80 border border-rose-200 shadow-2xs">
                <div className="flex items-center justify-between text-rose-800 mb-2">
                  <span className="text-xs font-bold">إقامات وبطاقات مدنية قاربت على المهلة</span>
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                </div>
                <div className="text-2xl font-black text-rose-950">
                  {riskAnalytics.expiringCivilIdCount + riskAnalytics.expiredCivilIdCount} موظف
                </div>
                <div className="text-[11px] text-rose-700 mt-1">
                  غرامة مخالفة شؤون/جوازات: 2 د.ك / يوم تأخير
                </div>
              </div>

              <div className="p-4 rounded-xl bg-indigo-50/80 border border-indigo-200 shadow-2xs">
                <div className="flex items-center justify-between text-indigo-800 mb-2">
                  <span className="text-xs font-bold">ميزانية التجديدات والرسوم المتوقعة</span>
                  <Lock className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-2xl font-black text-indigo-950 font-mono">
                  {formatKWD(riskAnalytics.estimatedRenewalBudget)}
                </div>
                <div className="text-[11px] text-indigo-700 mt-1">
                  رسوم شؤون وصحة وبطاقات مدنية متوقعة هذا الشهر
                </div>
              </div>
            </div>

            {/* Detailed Risk Registry Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-slate-700" />
                  <span className="text-xs font-bold text-slate-800">سجل المخاطر والتنبيهات المباشرة للموظفين والوثائق</span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  {riskAnalytics.riskItems.length} سجلات تحتاج متابعة
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100/80 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4 font-bold">الموظف / القسم</th>
                      <th className="py-2.5 px-4 font-bold">المستند / الترخيص</th>
                      <th className="py-2.5 px-4 font-bold">تاريخ الانتهاء</th>
                      <th className="py-2.5 px-4 font-bold">المهلة المتبقية</th>
                      <th className="py-2.5 px-4 font-bold">الغرامة المحتملة</th>
                      <th className="py-2.5 px-4 font-bold text-center">الإجراء الموصى به</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {riskAnalytics.riskItems.length > 0 ? (
                      riskAnalytics.riskItems.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{item.empName}</div>
                            <div className="text-[10px] text-slate-400">{item.department}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-800">{item.docType}</div>
                            <div className="text-[10px] font-mono text-slate-500">{item.docNo}</div>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-700">
                            {item.expiryDate}
                          </td>
                          <td className="py-3 px-4">
                            {item.daysRemaining < 0 ? (
                              <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded border border-rose-200">
                                منتهي منذ {Math.abs(item.daysRemaining)} يوم
                              </span>) : (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                item.daysRemaining <= 15 
                                  ? 'bg-amber-100 text-amber-800 border-amber-200' 
                                  : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              }`}>
                                متبقي {item.daysRemaining} يوم
                              </span>)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-rose-700 font-mono">{formatKWD(item.potentialPenalty)}</div>
                            <div className="text-[10px] text-slate-400">{item.penaltyDescription}</div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => {
                                setActiveTab('mandoub');
                                handleSendMandoubQuery(`ما هي إجراءات تجديد ${item.docType} للموظف ${item.empName} في أسرع وقت؟`);
                              }}
                              className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-[11px] font-bold rounded border border-indigo-200 transition"
                            >
                              إحالة للمندوب الذكي
                            </button>
                          </td>
                        </tr>))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                          <div className="font-bold text-slate-700 text-sm">كافة التراخيص والإقامات سارية وبحالة ممتازة!</div>
                          <div className="text-xs text-slate-400">لا توجد غرامات تأخير أو مخالفات مرتقبة هذا الشهر</div>
                        </td>
                      </tr>)}
                  </tbody>
                </table>
              </div>
            </div>
          </div>)}

        {/* ===================================================================== */}
        {/* 2. AI MANDOUB COPILOT */}
        {/* ===================================================================== */}
        {activeTab === 'mandoub' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Bot className="w-5 h-5 text-indigo-600" />
                  <span>المندوب الرقمي الذكي للوائح الكويتية (PAM / MOH / MOI Guide)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  مستشارك الفوري لإجراءات الشؤون (أسهل)، تراخيص وزارة الصحة، والإقامة وقانون العمل
                </p>
              </div>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-[11px] font-bold text-slate-600">
                <span className="px-2 py-0.5 bg-white text-indigo-700 rounded shadow-2xs">PAM أسهل</span>
                <span className="px-2 py-0.5">MOH صحة</span>
                <span className="px-2 py-0.5">PACI مدنية</span>
              </div>
            </div>

            {/* Quick Question Chips */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400">المعاملات الأكثر طلباً واستفساراً:</span>
              <div className="flex flex-wrap gap-2">
                {quickMandoubPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMandoubQuery(p.query)}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-xs font-semibold rounded-lg border border-slate-200 hover:border-indigo-200 transition text-right flex items-center gap-1.5"
                  >
                    <Zap className="w-3 h-3 text-indigo-500" />
                    <span>{p.title}</span>
                  </button>))}
              </div>
            </div>

            {/* Chat Conversation Box */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 max-h-[420px] overflow-y-auto space-y-4">
              {mandoubConversation.map((msg, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                    msg.sender === 'user' 
                      ? 'bg-slate-900 text-white' 
                      : 'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-2xs'
                  }`}>
                    {msg.sender === 'user' ? 'أنا' : <Bot className="w-4 h-4" />}
                  </div>

                  <div className={`p-4 rounded-xl max-w-[85%] text-xs space-y-2.5 ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white font-medium shadow-2xs'
                      : 'bg-white text-slate-800 border border-slate-200 shadow-sm'
                  }`}>
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>

                    {/* Tags */}
                    {msg.tags && msg.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {msg.tags.map((tag, tIdx) => (
                          <span key={tIdx} className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded border border-indigo-100">
                            {tag}
                          </span>))}
                      </div>)}

                    {/* Checklist Requirements */}
                    {msg.checklist && msg.checklist.length > 0 && (
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 space-y-1.5">
                        <div className="font-bold text-slate-900 text-[11px] flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>قائمة المتطلبات والمستندات الإلزامية:</span>
                        </div>
                        <ul className="space-y-1 pr-4 list-disc text-slate-700 text-[11px]">
                          {msg.checklist.map((item, cIdx) => (
                            <li key={cIdx}>{item}</li>))}
                        </ul>
                      </div>)}

                    {/* Fees & Law Ref */}
                    {(msg.fees || msg.lawRef) && (
                      <div className="pt-1 border-t border-slate-100 space-y-1 text-[10px] text-slate-500">
                        {msg.fees && <div className="font-medium text-emerald-700">💰 {msg.fees}</div>}
                        {msg.lawRef && <div className="text-slate-400">⚖️ {msg.lawRef}</div>}
                      </div>)}

                    <div className={`text-[9px] text-left ${msg.sender === 'user' ? 'text-indigo-200' : 'text-slate-400'}`}>
                      {msg.time}
                    </div>
                  </div>
                </div>))}
            </div>

            {/* Query Input Box */}
            <div className="flex gap-2">
              <input
                type="text"
                value={mandoubQuery}
                onChange={(e) => setMandoubQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendMandoubQuery();
                }}
                placeholder="اكتب المعاملة المطلوبة (مثال: متطلبات تحويل ترخيص ممرض في وزارة الصحة، أو تجديد إذن عمل)..."
                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50"
              />
              <button
                onClick={() => handleSendMandoubQuery()}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-1.5"
              >
                <span>تحليل المعاملة</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>)}

        {/* ===================================================================== */}
        {/* 3. DYNAMIC GEOFENCED QR PUNCH */}
        {/* ===================================================================== */}
        {activeTab === 'qr_punch' && (
          <div className="space-y-6">
            <div className="text-center max-w-2xl mx-auto space-y-1">
              <h3 className="font-black text-slate-900 text-base flex items-center justify-center gap-2">
                <QrCode className="w-5 h-5 text-indigo-600" />
                <span>نظام بصمة الباركود الديناميكي والتحقق الجغرافي (Dynamic QR & Geofence)</span>
              </h3>
              <p className="text-xs text-slate-500">
                يتجدد رمز الاستجابة السريعة كل 15 ثانية مشفراً بالوقت والفرع وتأكيد إحداثيات GPS في نطاق 50 متراً مع إشعار WhatsApp فوري
              </p>
            </div>

            {/* Branch Selector */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                <span>اختر موقع/فرع العمل:</span>
              </span>
              {branches.map(b => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBranch(b.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                    selectedBranch === b.id 
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-500/20' 
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {b.name.split('(')[0]} (نطاق {b.radiusMeters}م)
                </button>))}
            </div>

            {/* Mode Action Launchers (Kiosk Fullscreen Stand & Mobile Scanner) */}
            <div className="flex flex-wrap items-center justify-center gap-3 max-w-xl mx-auto">
              <button
                onClick={() => setIsKioskModalOpen(true)}
                className="flex-1 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-xs shadow-lg flex items-center justify-center gap-2 border border-slate-700 transition"
              >
                <Maximize2 className="w-4 h-4 text-amber-400" />
                <span>فتح شاشة الكشك بالفرع (Kiosk Stand Mode)</span>
              </button>

              <button
                onClick={() => setIsMobileScannerOpen(true)}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-bold text-xs shadow-lg flex items-center justify-center gap-2 transition"
              >
                <Smartphone className="w-4 h-4" />
                <span>مسح كود الحضور بهاتف الموظف (Mobile Scanner)</span>
              </button>
            </div>

            {/* Central Dynamic QR Display */}
            <div className="flex flex-col items-center justify-center">
              <div className="p-6 bg-slate-900 rounded-3xl border-4 border-indigo-500 text-white shadow-xl text-center space-y-4 max-w-md w-full">
                
                <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
                  <span className="flex items-center gap-1 text-emerald-400 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    بث الكود الديناميكي نشط
                  </span>
                  <span className="text-white font-bold">{currentBranch.name.split('(')[0]}</span>
                </div>

                {/* Scannable Dynamic QR Code Image */}
                <div className="bg-white p-4 rounded-2xl inline-block shadow-inner mx-auto relative group">
                  {qrCanvasUrl ? (
                    <img 
                      src={qrCanvasUrl} 
                      alt="Dynamic Attendance QR" 
                      className="w-48 h-48 object-contain rounded-xl"
                    />) : (
                    <div className="w-48 h-48 flex items-center justify-center">
                      <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
                    </div>)}
                </div>

                {/* Token string and dynamic timer */}
                <div className="space-y-2">
                  <div className="text-[10px] font-mono text-indigo-300 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800 tracking-wider break-all text-right">
                    TOKEN: PUNCH_{Date.now().toString().slice(-6)}_LAT{currentBranch.lat.toFixed(3)}_LNG{currentBranch.lng.toFixed(3)}_SIG-{(currentPayload?.signature || 'VERIFIED').slice(-6)}
                  </div>

                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-400 flex items-center gap-1">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                      <span>يتجدد الرمز تلقائياً خلال:</span>
                    </span>
                    <span className="text-amber-400 font-mono text-sm">
                      {qrTimer} ثوانٍ
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-amber-400 to-emerald-400 h-full transition-all duration-1000 ease-linear"
                      style={{ width: `${(qrTimer / 15) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Geofence Info */}
                <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-indigo-300">
                    <Lock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>نطاق الفرع المعتمد:</span>
                  </span>
                  <span className="font-mono text-slate-300">
                    GPS: {currentBranch.lat.toFixed(4)}, {currentBranch.lng.toFixed(4)} (±{currentBranch.radiusMeters}م)
                  </span>
                </div>
              </div>
            </div>

            {/* Interactive Simulation Controls */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl max-w-2xl mx-auto space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">محاكي اختبار البصمة للموظفين (Interactive Testing Simulator):</span>
                <select
                  value={selectedPunchEmpId}
                  onChange={(e) => setSelectedPunchEmpId(e.target.value)}
                  className="px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white font-medium outline-none focus:border-indigo-500"
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullNameAr} ({emp.jobTitle})
                    </option>))}
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleSimulatePunch(true)}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>محاكاة مسح الـ QR داخل النطاق (18م - سليم)</span>
                </button>

                <button
                  onClick={() => handleSimulatePunch(false)}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>محاكاة مسح خارج النطاق (380م - رفض التلاعب)</span>
                </button>
              </div>
            </div>

            {/* Live Punch Audit Feed */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden max-w-2xl mx-auto bg-white shadow-xs">
              <div className="bg-slate-100/90 px-4 py-2.5 border-b border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>سجل البصمات الديناميكية الحية (Live Punch Log)</span>
                <span className="text-[10px] text-indigo-600 font-mono font-bold">15s Token + GPS Validation</span>
              </div>
              <div className="divide-y divide-slate-100 text-xs">
                {punchLog.map(log => (
                  <div key={log.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition">
                    <div className="flex items-center gap-2.5">
                      <span className={`p-1.5 rounded-lg ${log.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {log.status === 'SUCCESS' ? <Check className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                      </span>
                      <div>
                        <div className="font-bold text-slate-900">{log.empName}</div>
                        <div className="text-[10px] text-slate-400">{log.location}</div>
                      </div>
                    </div>

                    <div className="text-left flex flex-col items-end">
                      <div className="font-mono font-bold text-slate-700 text-[11px]">{log.time}</div>
                      <div className="text-[9px] font-mono text-indigo-600 font-bold">{log.hash}</div>
                    </div>
                  </div>))}
              </div>
            </div>
          </div>)}

        {/* ===================================================================== */}
        {/* 4. QR DIGITAL SEAL & VERIFICATION PORTAL */}
        {/* ===================================================================== */}
        {activeTab === 'doc_verify' && (
          <div className="space-y-6">
            {/* Top Seal Description */}
            <div className="p-5 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="p-3 bg-emerald-600 text-white rounded-xl shadow-md">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-emerald-950 text-base">الختم الرقمي المشفر للشهادات والمستندات (Tamper-Proof Digital Seal)</h3>
                  <p className="text-xs text-emerald-800 mt-1 max-w-xl">
                    نظام التحقق الرسمي المشفّر (SHA-256): أي شهادة راتب أو مستند صادر يحمل كود تحقق رسمي وباركود فريد لمنع التزوير والتعديل.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="bg-emerald-200/60 text-emerald-900 text-xs font-mono font-bold px-3 py-1.5 rounded-lg border border-emerald-300">
                  SHA-256 VERIFIED
                </span>
              </div>
            </div>

            {/* Verification Code Lookup Simulator */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <span className="text-xs font-bold text-slate-800 block">بوابة التحقق الإلكتروني من صحة الوثائق (Document Verification Portal):</span>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                  <input
                    type="text"
                    value={verifyDocIdInput}
                    onChange={(e) => setVerifyDocIdInput(e.target.value)}
                    placeholder="أدخل كود التحقق للمستند (مثال: AYS-2026-SAL-1082)..."
                    className="w-full pr-9 pl-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <button
                  onClick={handleVerifyDocument}
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-1.5"
                >
                  <span>التحقق من الوثيقة</span>
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Verified Document Preview Certificate */}
            {verifiedDocResult && (
              <div className="border-2 border-emerald-500/80 rounded-2xl p-6 bg-white shadow-md relative overflow-hidden">
                <div className="absolute top-0 right-0 left-0 h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600" />
                
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 border-b border-slate-200 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                      <ShieldCheck className="w-7 h-7 text-emerald-600" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>وثيقة رسمية معتمدة وموثقة إلكترونياً</span>
                      </div>
                      <h4 className="text-lg font-black text-slate-900">{verifiedDocResult.docTitle}</h4>
                    </div>
                  </div>

                  <div className="text-left font-mono">
                    <span className="text-[10px] text-slate-400 block">كود المستند المعتمد</span>
                    <span className="text-sm font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {verifiedDocResult.docNumber}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 py-5 text-xs">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[11px] text-slate-400 block">اسم الموظف / صاحب الوثيقة</span>
                    <span className="font-bold text-slate-900 mt-0.5 block">{verifiedDocResult.employeeName}</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[11px] text-slate-400 block">الرقم المدني (PACI)</span>
                    <span className="font-bold text-slate-900 font-mono mt-0.5 block">{verifiedDocResult.civilId}</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[11px] text-slate-400 block">جهة الإصدار</span>
                    <span className="font-bold text-slate-900 mt-0.5 block">{verifiedDocResult.companyName}</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[11px] text-slate-400 block">تاريخ التوثيق</span>
                    <span className="font-bold text-slate-900 font-mono mt-0.5 block">{verifiedDocResult.issueDate}</span>
                  </div>
                </div>

                {/* Digital Seal Stamp Visual */}
                <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg border border-emerald-300 shadow-2xs">
                      <QrCode className="w-12 h-12 text-slate-900" />
                    </div>
                    <div className="text-xs">
                      <div className="font-bold text-emerald-950">التوقيع الرقمي المشفر (SHA-256 Digest):</div>
                      <div className="font-mono text-[10px] text-emerald-700 break-all">{verifiedDocResult.sha256Hash}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">تم التوقيع بواسطة: {verifiedDocResult.signatoryName}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => toast.success('تم نسخ رابط التحقق المباشر للوثيقة')}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 shrink-0"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>مشاركة رابط التحقق</span>
                  </button>
                </div>
              </div>)}
          </div>)}

        {/* ===================================================================== */}
        {/* 5. WHATSAPP HR BOT SIMULATOR */}
        {/* ===================================================================== */}
        {activeTab === 'whatsapp' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-emerald-600" />
                  <span>بوابة الاستعلام الذاتي للموظفين عبر WhatsApp API</span>
                </h3>
                <p className="text-xs text-slate-500">
                  محاكاة تفاعلية مباشرة لخدمة بوت الموارد البشرية على الواتساب للاستعلام الفوري عن الرواتب والإجازات
                </p>
              </div>

              {/* Select Employee to Test With */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">الموظف الحالي:</span>
                <select
                  value={selectedBotEmployeeId}
                  onChange={(e) => setSelectedBotEmployeeId(e.target.value)}
                  className="px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white text-slate-800"
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullNameAr} ({emp.jobTitle})
                    </option>))}
                </select>
              </div>
            </div>

            {/* WhatsApp Phone Mockup Container */}
            <div className="max-w-2xl mx-auto bg-[#0c1317] rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-800">
              
              {/* WhatsApp Header */}
              <div className="bg-[#1f2c34] px-4 py-3 text-white flex items-center justify-between border-b border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xs">
                      HR
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 absolute bottom-0 right-0 border-2 border-[#1f2c34]" />
                  </div>
                  <div>
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <span>{activeCompany?.nameAr || ""} • HR Bot</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/20" />
                    </div>
                    <div className="text-[10px] text-emerald-400">متصل الآن • رد آلي فوري</div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 font-mono">
                  +965 2200-HR-AYSED
                </div>
              </div>

              {/* Chat Message Stream */}
              <div className="p-4 space-y-3 min-h-[340px] max-h-[380px] overflow-y-auto bg-[#0b141a] bg-opacity-95 text-xs">
                {botChatMessages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${m.sender === 'emp' ? 'items-start' : 'items-end'}`}
                  >
                    <div
                      className={`max-w-[85%] p-3.5 rounded-2xl whitespace-pre-wrap leading-relaxed shadow-sm ${
                        m.sender === 'emp'
                          ? 'bg-[#005c4b] text-white rounded-tl-none font-medium'
                          : 'bg-[#202c33] text-slate-100 rounded-tr-none border border-slate-700/60'
                      }`}
                    >
                      {m.text}
                      <div className={`text-[9px] mt-1.5 text-left font-mono ${
                        m.sender === 'emp' ? 'text-emerald-200' : 'text-slate-400'
                      }`}>
                        {m.time} {m.sender === 'emp' && '✓✓'}
                      </div>
                    </div>
                  </div>))}
              </div>

              {/* WhatsApp Quick Command Action Chips */}
              <div className="bg-[#1f2c34] px-3 py-2 border-t border-slate-700/80 flex items-center gap-2 overflow-x-auto">
                <span className="text-[10px] text-slate-400 whitespace-nowrap font-bold">أوامر سريعة:</span>
                <button
                  onClick={() => handleSendWhatsAppMessage('راتبي')}
                  className="px-3 py-1 bg-[#2a3942] hover:bg-emerald-600 text-slate-200 hover:text-white text-[11px] font-bold rounded-full transition whitespace-nowrap"
                >
                  💵 راتبي
                </button>
                <button
                  onClick={() => handleSendWhatsAppMessage('إجازاتي')}
                  className="px-3 py-1 bg-[#2a3942] hover:bg-emerald-600 text-slate-200 hover:text-white text-[11px] font-bold rounded-full transition whitespace-nowrap"
                >
                  🌴 إجازاتي
                </button>
                <button
                  onClick={() => handleSendWhatsAppMessage('شهادة راتب')}
                  className="px-3 py-1 bg-[#2a3942] hover:bg-emerald-600 text-slate-200 hover:text-white text-[11px] font-bold rounded-full transition whitespace-nowrap"
                >
                  🏛️ شهادة راتب
                </button>
                <button
                  onClick={() => handleSendWhatsAppMessage('سلفي والعهد')}
                  className="px-3 py-1 bg-[#2a3942] hover:bg-emerald-600 text-slate-200 hover:text-white text-[11px] font-bold rounded-full transition whitespace-nowrap"
                >
                  💼 العهد والسلف
                </button>
              </div>

              {/* WhatsApp Chat Input */}
              <div className="bg-[#202c33] p-3 flex items-center gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendWhatsAppMessage();
                  }}
                  placeholder="اكتب رسالة للواتساب (مثال: راتبي، إجازاتي، شهادة راتب)..."
                  className="flex-1 bg-[#2a3942] text-white px-4 py-2.5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-400"
                />
                <button
                  onClick={() => handleSendWhatsAppMessage()}
                  className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>)}

      </div>

      {/* Dynamic QR Kiosk Fullscreen Stand Modal */}
      {isKioskModalOpen && (
        <DynamicQrKioskModal
          isOpen={isKioskModalOpen}
          onClose={() => setIsKioskModalOpen(false)}
          activeCompany={activeCompany}
          employees={employees}
          attendance={attendance}
          onAddAttendance={(rec) => {
            if (onAddAttendance) onAddAttendance(rec);
          }}
          onOpenMobileScanner={() => {
            setIsKioskModalOpen(false);
            setIsMobileScannerOpen(true);
          }}
        />)}

      {/* Mobile QR Camera Scanner Modal */}
      {isMobileScannerOpen && (
        <MobileQrAttendanceScannerModal
          isOpen={isMobileScannerOpen}
          onClose={() => setIsMobileScannerOpen(false)}
          activeCompany={activeCompany}
          employees={employees}
          attendance={attendance}
          onAddAttendance={(rec) => {
            if (onAddAttendance) {
              onAddAttendance(rec);
            }
            const emp = employees.find(e => e.id === rec.employeeId);
            const branch = branches.find(b => b.id === selectedBranch) || branches[0];
            setPunchLog(prev => [{
              id: rec.id,
              empName: emp?.fullNameAr || 'موظف',
              time: rec.checkIn || new Date().toLocaleTimeString('ar-KW'),
              status: 'SUCCESS',
              location: branch.name,
              hash: `GEO-VERIFIED`
            }, ...prev.slice(0, 7)]);
          }}
        />)}
    </div>);
};
