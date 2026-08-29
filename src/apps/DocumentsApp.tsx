import React, { useState, useMemo, useEffect } from 'react';
import { DocumentItem, Employee, Company } from '../types';
import { CompanyDocument } from '../types/companyDocuments';
import { CompanyDocumentsKanban } from '../components/CompanyDocumentsKanban';
import { getPersistentData, setPersistentData, MANARA_STORAGE_KEYS } from '../utils/persistentStorage';
import { processAnyDocument } from '../utils/ocrService';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { 
  FolderOpen, FileText, Image as ImageIcon, FileArchive, Upload, 
  Trash2, Edit2, Search, X, CheckCircle2, Scan, AlertTriangle, 
  Download, Calendar, BellRing, Shield
} from 'lucide-react';

interface DocumentsAppProps {
  documents: DocumentItem[];
  employees: Employee[];
  activeCompany: Company;
  filterTab: string;
  onSaveDocument: (doc: DocumentItem) => void;
  onDeleteDocument: (docId: string) => void;
  onAutoAddEmpFromOCR: (empData: any, docType?: string) => string;
  isOCRModalOpenInitially?: boolean;
  onNavigateToApp?: (app: any) => void;
  onSelectEmpForForm?: (emp: Employee) => void;
}

export const DocumentsApp: React.FC<DocumentsAppProps> = ({
  documents,
  employees,
  activeCompany,
  filterTab,
  onSaveDocument,
  onDeleteDocument,
  onAutoAddEmpFromOCR,
  isOCRModalOpenInitially = false,
  onNavigateToApp,
  onSelectEmpForForm,
}) => {
  const [activeFolder, setActiveFolder] = useState<string>('COMPANY_LICENSES');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [companyDocuments, setCompanyDocuments] = useState<CompanyDocument[]>(() => 
    getPersistentData<CompanyDocument[]>(MANARA_STORAGE_KEYS.COMPANY_DOCUMENTS, [
      {
        id: 'demo-1',
        name: 'رخصة تجارية رئيسية (المنار كلينك)',
        documentType: 'commercial_license',
        documentNumber: 'CN-2024-99821',
        issuingAuthority: 'وزارة التجارة والصناعة (MCI)',
        issueDate: '2025-01-10',
        expiryDate: '2026-10-15',
        responsiblePerson: 'أحمد المندوب',
        fileUrl: '#',
        notes: 'تتضمن أنشطة العيادات الطبية والتجميلية'
      },
      {
        id: 'demo-2',
        name: 'اعتماد توقيع رسمي',
        documentType: 'signature_auth',
        documentNumber: 'SIG-88219-KWD',
        issuingAuthority: 'غرفة تجارة وصناعة الكويت',
        issueDate: '2024-05-01',
        expiryDate: '2026-09-01',
        responsiblePerson: 'د. عبدالله المدير',
        fileUrl: '#',
        notes: 'معتمد لدى البنوك الرسمية'
      }
    ])
  );

  const handleSaveCompanyDoc = (doc: CompanyDocument) => {
    const updated = companyDocuments.some(d => d.id === doc.id)
      ? companyDocuments.map(d => d.id === doc.id ? doc : d)
      : [doc, ...companyDocuments];
    setCompanyDocuments(updated);
    setPersistentData(MANARA_STORAGE_KEYS.COMPANY_DOCUMENTS, updated);
  };

  const handleDeleteCompanyDoc = (docId: string) => {
    const updated = companyDocuments.filter(d => d.id !== docId);
    setCompanyDocuments(updated);
    setPersistentData(MANARA_STORAGE_KEYS.COMPANY_DOCUMENTS, updated);
  };
  
  // OCR Modal
  const [showOCRModal, setShowOCRModal] = useState(isOCRModalOpenInitially);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  
  // Storage logic
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
     // Simulate Google Cloud Storage upload (idx env)
     toast.success('تم الرفع بنجاح على Google Cloud Storage', { position: 'bottom-left' });
  };

  const getFileIcon = (cat: string) => {
    switch (cat) {
      case 'CIVIL_ID': return <FileText className="w-8 h-8 text-sky-500" />;
      case 'PASSPORT': return <FileText className="w-8 h-8 text-indigo-500" />;
      case 'RESIDENCY': return <FileText className="w-8 h-8 text-emerald-500" />;
      case 'CONTRACT': 
      case 'WORK_CONTRACT': return <FileText className="w-8 h-8 text-amber-500" />;
      default: return <FileText className="w-8 h-8 text-slate-500" />;
    }
  };

  // Smart Alerts Engine - Odoo
  const TODAY = new Date("2026-08-12");
  const ALERT_THRESHOLD = 60;

  // Process smart alerts on load
  useEffect(() => {
    let nearExpiryCount = 0;
    let expiredCount = 0;

    const companyDocs = (documents || []).filter(d => d.companyId === (activeCompany?.id || 'comp-1'));
    
    companyDocs.forEach(doc => {
      if (!doc.expiryDate) return;
      const expDate = new Date(doc.expiryDate);
      const diffTime = expDate.getTime() - TODAY.getTime();
      const daysToExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      let newStatus = doc.status;
      if (daysToExpiry <= 0) {
        newStatus = 'expired';
      } else if (daysToExpiry <= ALERT_THRESHOLD) {
        newStatus = 'near_expiry';
      } else {
        newStatus = 'active';
      }

      // If status changed due to cron logic, we can theoretically dispatch onSaveDocument, 
      // but for UI responsiveness we calculate it dynamically in render or just show toast.
      
      if (newStatus === 'expired') expiredCount++;
      if (newStatus === 'near_expiry') nearExpiryCount++;
    });

    if (expiredCount > 0 || nearExpiryCount > 0) {
       toast((t) => (
         <div className="flex flex-col gap-1">
           <span className="font-bold text-slate-900">🔔 تنبيهات الوثائق!</span>
           {expiredCount > 0 && <span className="text-rose-600 text-sm">{expiredCount} وثيقة منتهية الصلاحية.</span>}
           {nearExpiryCount > 0 && <span className="text-amber-600 text-sm">{nearExpiryCount} وثيقة تقترب من الانتهاء (60 يوماً).</span>}
         </div>), { duration: 5000, position: 'top-center' });
    }
  }, [documents, activeCompany]);

  // Derived state for KanBan
  const enrichedDocs = useMemo(() => {
    return (documents || [])
      .filter(d => d.companyId === (activeCompany?.id || 'comp-1'))
      .map(doc => {
        let currentStatus = doc.status || 'active';
        let daysToExpiry = null;
        if (doc.expiryDate) {
          const expDate = new Date(doc.expiryDate);
          const diffTime = expDate.getTime() - TODAY.getTime();
          daysToExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (daysToExpiry <= 0) {
            currentStatus = 'expired';
          } else if (daysToExpiry <= ALERT_THRESHOLD) {
            currentStatus = 'near_expiry';
          } else {
            currentStatus = 'active';
          }
        }
        return { ...doc, currentStatus, daysToExpiry };
      })
      .filter(doc => {
         if (activeFolder === 'IDS') return ['CIVIL_ID', 'PASSPORT'].includes(doc.category);
         if (activeFolder === 'RESIDENCY') return doc.category === 'RESIDENCY';
         if (activeFolder === 'CONTRACTS') return ['CONTRACT', 'WORK_CONTRACT'].includes(doc.category);
         if (activeFolder === 'ACTIVITIES') return doc.currentStatus === 'near_expiry' || doc.currentStatus === 'expired';
         return true;
      })
      .filter(doc => {
         if (!searchTerm) return true;
         const q = searchTerm.toLowerCase();
         return doc.title?.toLowerCase().includes(q) || employees.find(e => e.id === doc.employeeId)?.fullNameAr?.includes(q);
      });
  }, [documents, activeCompany, activeFolder, searchTerm]);

  const activities = enrichedDocs.filter(d => d.currentStatus === 'near_expiry' || d.currentStatus === 'expired');

  return (
    <div className="flex h-[calc(100vh-100px)] bg-slate-100 rounded-xl overflow-hidden shadow-sm border border-slate-200" style={{ '--odoo-purple': '#714B67', '--expired-red': '#dc3545', '--warning-orange': '#ffc107' } as any}>
      
      {/* Sidebar - المجلدات الذكية */}
      <div className="w-64 bg-slate-50 border-l border-slate-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-200 bg-white">
           <button onClick={() => setShowOCRModal(true)} className="w-full bg-[#714B67] hover:bg-[#5a3a51] text-white font-bold py-2 px-4 rounded shadow-sm flex items-center justify-center gap-2 transition">
             <Scan className="w-4 h-4" /> إضافة وثيقة (OCR)
           </button>
        </div>
        
        <div className="p-4 overflow-y-auto flex-1">
          <section className="mb-6">
            <header className="font-bold text-slate-700 mb-3 flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-[#714B67]"/> المجلدات (Folders)
            </header>
            <ul className="space-y-1 text-sm font-medium">
              <li onClick={() => setActiveFolder('COMPANY_LICENSES')} className={`p-2 rounded cursor-pointer transition flex items-center gap-2 ${activeFolder === 'COMPANY_LICENSES' ? 'bg-[#714B67] text-white shadow' : 'hover:bg-slate-200 text-slate-700'}`}>
                <Shield className="w-4 h-4" />
                <span>تراخيص المنشأة (Kanban)</span>
              </li>
              <li onClick={() => setActiveFolder('ALL')} className={`p-2 rounded cursor-pointer transition ${activeFolder === 'ALL' ? 'bg-[#714B67] text-white' : 'hover:bg-slate-200 text-slate-700'}`}>الكل (All)</li>
              <li onClick={() => setActiveFolder('IDS')} className={`p-2 rounded cursor-pointer transition ${activeFolder === 'IDS' ? 'bg-[#714B67] text-white' : 'hover:bg-slate-200 text-slate-700'}`}>وثائق الهوية (IDs)</li>
              <li onClick={() => setActiveFolder('RESIDENCY')} className={`p-2 rounded cursor-pointer transition ${activeFolder === 'RESIDENCY' ? 'bg-[#714B67] text-white' : 'hover:bg-slate-200 text-slate-700'}`}>الإقامات (Residency)</li>
              <li onClick={() => setActiveFolder('CONTRACTS')} className={`p-2 rounded cursor-pointer transition ${activeFolder === 'CONTRACTS' ? 'bg-[#714B67] text-white' : 'hover:bg-slate-200 text-slate-700'}`}>العقود (Contracts)</li>
            </ul>
          </section>

          <section>
             <header className="font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#714B67]"/> الأنشطة المخططة
            </header>
            <ul className="space-y-1 text-sm font-medium">
              <li onClick={() => setActiveFolder('ACTIVITIES')} className={`p-2 rounded cursor-pointer transition flex justify-between items-center ${activeFolder === 'ACTIVITIES' ? 'bg-[#714B67] text-white' : 'hover:bg-slate-200 text-slate-700'}`}>
                <span>تجديدات قادمة</span>
                {activities.length > 0 && <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full">{activities.length}</span>}
              </li>
            </ul>
          </section>
        </div>
      </div>

      {/* Main Content - عرض الوثائق (Kanban) */}
      <div className="flex-1 flex flex-col bg-slate-100 overflow-hidden relative">
        <div className="p-4 bg-white border-b border-slate-200 flex justify-between items-center shrink-0">
          <div className="relative w-96">
            <input 
              type="text" 
              placeholder="ابحث عن وثيقة أو موظف..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-[#714B67] transition"
            />
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
          </div>
          <div className="text-sm font-bold text-slate-500">
             إجمالي الوثائق: {enrichedDocs.length}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeFolder === 'COMPANY_LICENSES' ? (
            <CompanyDocumentsKanban 
              documents={companyDocuments} 
              onSaveDocument={handleSaveCompanyDoc} 
              onDeleteDocument={handleDeleteCompanyDoc} 
            />
          ) : (
            <>
              {activeFolder === 'ACTIVITIES' && (
                 <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl shadow-sm">
                    <h3 className="font-bold text-amber-900 flex items-center gap-2 mb-2">
                       <BellRing className="w-5 h-5" />
                       أنشطة التجديد المطلوبة (Odoo Activities)
                    </h3>
                    <p className="text-sm text-amber-800">
                      يجب اتخاذ إجراء فوري لتجديد الوثائق التالية بناءً على قانون العمل (60 يوماً قبل الانتهاء).
                    </p>
                 </div>)}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {enrichedDocs.map(doc => {
                  const emp = employees.find(e => e.id === doc.employeeId);
                  
                  let borderClass = 'border-slate-200';
                  let badgeClass = 'bg-slate-100 text-slate-700';
                  
                  if (doc.currentStatus === 'expired') {
                     borderClass = 'border-r-4 border-r-rose-600 border-l border-t border-b border-slate-200';
                     badgeClass = 'bg-rose-100 text-rose-800 font-bold';
                  } else if (doc.currentStatus === 'near_expiry') {
                     borderClass = 'border-r-4 border-r-amber-500 border-l border-t border-b border-slate-200';
                     badgeClass = 'bg-amber-100 text-amber-800 font-bold';
                  }

                  return (
                    <div key={doc.id} className={`bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition flex gap-3 ${borderClass}`}>
                      <div className="shrink-0 pt-1">
                          {getFileIcon(doc.category)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-800 text-sm truncate">{doc.title}</h4>
                        <div className="text-xs text-slate-500 mt-1 truncate">{emp ? emp.fullNameAr : 'مستند عام'}</div>
                        
                        <div className="mt-3 flex flex-wrap gap-1">
                          {doc.expiryDate && (
                            <span className={`text-[10px] px-2 py-0.5 rounded ${badgeClass}`}>
                              ينتهي: {doc.expiryDate}
                              {doc.daysToExpiry !== null && (
                                 <span> ({doc.daysToExpiry > 0 ? `بعد ${doc.daysToExpiry} يوم` : 'منتهي'})</span>)}
                            </span>)}
                        </div>
                      </div>
                      <div className="shrink-0 flex flex-col justify-between">
                         <button className="text-slate-400 hover:text-[#714B67] transition" onClick={() => window.open(doc.fileUrl, '_blank')}>
                           <Download className="w-4 h-4" />
                         </button>
                         <button className="text-slate-400 hover:text-rose-600 transition" onClick={() => onDeleteDocument(doc.id)}>
                           <Trash2 className="w-4 h-4" />
                         </button>
                      </div>
                    </div>);
                })}
              </div>

              {enrichedDocs.length === 0 && (
                 <div className="text-center py-20 text-slate-400">
                    <FolderOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>لا توجد وثائق في هذا المجلد.</p>
                 </div>)}
            </>
          )}
        </div>
      </div>

      {/* OCR Scan Modal */}
      {showOCRModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Scan className="w-6 h-6 text-[#714B67]" />
                الماسح الضوئي الذكي (OCR)
              </h3>
              <button onClick={() => setShowOCRModal(false)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-8 flex flex-col items-center justify-center space-y-6">
              {isScanning ? (
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 border-4 border-[#714B67] border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="font-bold text-slate-700 animate-pulse">جاري تحليل الوثيقة وقراءة البيانات (OpenAI Vision)...</p>
                </div>) : scanResult ? (
                <div className="w-full space-y-4">
                  <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl border border-emerald-200 flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 shrink-0 mt-0.5 text-emerald-600" />
                    <div>
                      <strong className="block mb-1 text-lg">تم التعرف على الوثيقة بنجاح!</strong>
                      <div className="text-sm space-y-1 font-mono">
                        <p>نوع الوثيقة: {scanResult.docType}</p>
                        <p>الاسم: {scanResult.extractedData.fullNameAr}</p>
                        <p>تاريخ الانتهاء: {scanResult.extractedData.expiryDate || 'غير محدد'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        const newEmpId = onAutoAddEmpFromOCR(scanResult.extractedData, scanResult.docType);
                        onSaveDocument({
                           id: `doc-${Date.now()}`,
                           companyId: activeCompany?.id || 'comp-1',
                           employeeId: newEmpId,
                           title: `${scanResult.docType} - ${scanResult.extractedData.fullNameAr}`,
                           category: scanResult.docType === 'CIVIL_ID' ? 'CIVIL_ID' : 'PASSPORT',
                           fileUrl: 'https://storage.googleapis.com/simulated-upload/doc.jpg',
                           expiryDate: scanResult.extractedData.expiryDate || '2027-01-01',
                           status: 'ACTIVE'
                        });
                        toast.success('تم إنشاء الموظف والوثيقة والأرشفة السحابية بنجاح.');
                        setShowOCRModal(false);
                      }}
                      className="flex-1 bg-[#714B67] text-white font-bold py-3 rounded-lg hover:bg-[#5a3a51] transition"
                    >
                      تأكيد الأرشفة وإنشاء الموظف
                    </button>
                  </div>
                </div>) : (
                <>
                  <div className="w-32 h-32 bg-slate-100 rounded-full flex items-center justify-center border-4 border-dashed border-slate-300">
                    <Upload className="w-12 h-12 text-slate-400" />
                  </div>
                  <div className="text-center">
                    <h4 className="font-bold text-slate-800 mb-2">قم برفع أو تصوير وثيقة</h4>
                    <p className="text-sm text-slate-500 mb-6 max-w-sm">
                      يدعم قراءة (البطاقة المدنية، الجواز، الإقامة، وتراخيص وزارة الصحة) عبر Google Cloud Storage & OpenAI.
                    </p>
                    <label className="bg-[#714B67] hover:bg-[#5a3a51] text-white font-bold py-3 px-8 rounded-lg cursor-pointer transition shadow-sm inline-block">
                      <span>اختيار ملف</span>
                      <input 
                        type="file" 
                        accept="image/*,.pdf" 
                        className="hidden"
                        onChange={async (e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            const file = e.target.files[0];
                            handleFileUpload(e);
                            setIsScanning(true);
                            try {
                              const result = await processAnyDocument(file);
                              setScanResult({
                                docType: result.documentType || 'CIVIL_ID',
                                extractedData: result
                              });
                            } catch (error: any) {
                              console.error("OCR Scan Error:", error);
                              toast.error(error.message || 'فشل نظام القراءة الضوئية (OCR). يرجى التأكد من وضوح الملف أو إدخال البيانات يدوياً.');
                              setScanResult(null);
                            } finally {
                              setIsScanning(false);
                            }
                          }
                        }}
                      />
                    </label>
                  </div>
                </>)}
            </div>
          </div>
        </div>)}

    </div>);
};
