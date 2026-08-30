import React, { useState } from 'react';
import { CompanyDocument, getDocumentStatus } from '../types/companyDocuments';
import { Plus, Search, FileText, Calendar, User, ExternalLink, Download, CheckCircle, AlertCircle, X, Shield, Building } from 'lucide-react';
import toast from 'react-hot-toast';

interface CompanyDocumentsKanbanProps {
  documents: CompanyDocument[];
  onSaveDocument: (doc: CompanyDocument) => void;
  onDeleteDocument: (docId: string) => void;
}

export const CompanyDocumentsKanban: React.FC<CompanyDocumentsKanbanProps> = ({
  documents,
  onSaveDocument,
  onDeleteDocument,
}) => {
  const [filter, setFilter] = useState<'all' | 'valid' | 'expiring_soon' | 'expired'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<CompanyDocument | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Form state for creating / editing
  const [formData, setFormData] = useState<Partial<CompanyDocument>>({
    name: '',
    documentType: 'commercial_license',
    documentNumber: '',
    issuingAuthority: 'وزارة التجارة والصناعة',
    issueDate: new Date().toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    responsiblePerson: 'مندوب الشؤون الحكومية',
    notes: '',
    fileUrl: ''
  });

  const filteredDocs = documents.filter(doc => {
    const { status } = getDocumentStatus(doc.expiryDate);
    const matchesFilter = filter === 'all' || status === filter;
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          doc.documentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          doc.issuingAuthority.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          doc.responsiblePerson.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      documentType: 'commercial_license',
      documentNumber: '',
      issuingAuthority: 'وزارة التجارة والصناعة',
      issueDate: new Date().toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      responsiblePerson: 'مندوب الشؤون الحكومية',
      notes: '',
      fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
    });
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.documentNumber || !formData.expiryDate) {
      toast.error('يرجى تعبئة الحقول الإجبارية (اسم الترخيص، الرقم، تاريخ الانتهاء)');
      return;
    }

    const newDoc: CompanyDocument = {
      id: selectedDoc ? selectedDoc.id : `doc-${Date.now()}`,
      name: formData.name,
      documentType: (formData.documentType as any) || 'commercial_license',
      documentNumber: formData.documentNumber,
      issuingAuthority: formData.issuingAuthority || 'جهات رسمية',
      issueDate: formData.issueDate || new Date().toISOString().split('T')[0],
      expiryDate: formData.expiryDate,
      responsiblePerson: formData.responsiblePerson || 'المسؤول الإداري',
      fileUrl: formData.fileUrl || '',
      notes: formData.notes || ''
    };

    onSaveDocument(newDoc);
    toast.success(selectedDoc ? 'تم تحديث الترخيص بنجاح' : 'تم إضافة الترخيص بنجاح');
    setShowModal(false);
    setSelectedDoc(null);
  };

  // Default initial demo documents if none provided
  const displayDocs = filteredDocs.length > 0 || documents.length > 0 ? filteredDocs : [
    {
      id: 'demo-1',
      name: 'رخصة تجارية رئيسية (المنار كلينك)',
      documentType: 'commercial_license' as const,
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
      documentType: 'signature_auth' as const,
      documentNumber: 'SIG-88219-KWD',
      issuingAuthority: 'غرفة تجارة وصناعة الكويت',
      issueDate: '2024-05-01',
      expiryDate: '2026-09-01',
      responsiblePerson: 'د. عبدالله المدير',
      fileUrl: '#',
      notes: 'معتمد لدى البنوك الرسمية'
    },
    {
      id: 'demo-3',
      name: 'ترخيص وزارة الصحة للعيادات',
      documentType: 'medical_license' as const,
      documentNumber: 'MOH-MED-2025-44',
      issuingAuthority: 'وزارة الصحة (إدارة التراخيص الطبية)',
      issueDate: '2025-02-15',
      expiryDate: '2026-09-10',
      responsiblePerson: 'د. سارة الاستشارية',
      fileUrl: '#',
      notes: 'ترخيص تشغيل عيادات الجلدية والليزر'
    },
    {
      id: 'demo-4',
      name: 'ترخيص الدفاع المدني والوقاية',
      documentType: 'civil_defense' as const,
      documentNumber: 'CD-KW-99102',
      issuingAuthority: 'الإدارة العامة للإطفاء / الدفاع المدني',
      issueDate: '2024-03-20',
      expiryDate: '2026-08-15', // Expired or expiring soon test
      responsiblePerson: 'مسؤول الأمن والسلامة',
      fileUrl: '#',
      notes: 'فحص أنظمة الإنذار والإطفاء الآلي'
    },
    {
      id: 'demo-5',
      name: 'عقد إيجار المقر الرئيسي',
      documentType: 'lease_contract' as const,
      documentNumber: 'LEASE-2023-88',
      issuingAuthority: 'إدارة العقار - حولي',
      issueDate: '2023-10-01',
      expiryDate: '2027-09-30',
      responsiblePerson: 'الشؤون الإدارية',
      fileUrl: '#',
      notes: 'إيجار سنوي قابل للتجديد التلقائي'
    }
  ];

  const typeLabels: Record<string, string> = {
    commercial_license: 'رخصة تجارية',
    signature_auth: 'اعتماد توقيع',
    chamber_commerce: 'عضوية غرفة التجارة',
    municipality: 'رخصة بلدية',
    civil_defense: 'دفاع مدني',
    medical_license: 'ترخيص صحي/طبي',
    lease_contract: 'عقد إيجار',
    other: 'أخرى'
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen text-right" dir="rtl">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-8 h-8 text-[#714B67]" />
            <h1 className="text-2xl font-bold text-slate-900">تراخيص ومستندات المنشأة (Odoo Kanban)</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">نظام تتبع صلاحية الوثائق والتنبيهات المسبقة وتواريخ التجديد آلياً</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search Box */}
          <div className="relative flex-1 md:w-64">
            <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="بحث في التراخيص والجهات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-3 pr-9 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#714B67]"
            />
          </div>

          {/* Quick Filters (Odoo Style) */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
            <button 
              onClick={() => setFilter('all')} 
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${filter === 'all' ? 'bg-[#714B67] text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}>
              الكل ({documents.length > 0 ? documents.length : 5})
            </button>
            <button 
              onClick={() => setFilter('expiring_soon')} 
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${filter === 'expiring_soon' ? 'bg-amber-600 text-white shadow' : 'text-amber-700 hover:bg-amber-50'}`}>
              قارب على الانتهاء
            </button>
            <button 
              onClick={() => setFilter('expired')} 
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${filter === 'expired' ? 'bg-red-600 text-white shadow' : 'text-red-700 hover:bg-red-50'}`}>
              منتهي
            </button>
            <button 
              onClick={() => setFilter('valid')} 
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${filter === 'valid' ? 'bg-emerald-600 text-white shadow' : 'text-emerald-700 hover:bg-emerald-50'}`}>
              ساري
            </button>
          </div>

          <button 
            onClick={handleOpenAdd}
            className="bg-[#714B67] hover:bg-[#5c3c53] text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-sm flex items-center gap-2 transition">
            <Plus className="w-4 h-4" />
            إضافة ترخيص جديد
          </button>
        </div>
      </div>

      {/* Kanban Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {(documents.length > 0 ? filteredDocs : displayDocs).map((doc) => {
          const { badgeColor, badgeLabel, status, daysRemaining } = getDocumentStatus(doc.expiryDate);

          return (
            <div 
              key={doc.id} 
              className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between group">
              
              <div>
                <div className="flex justify-between items-start mb-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${badgeColor}`}>
                    {badgeLabel}
                  </span>
                  <span className="text-xs text-slate-400 font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                    #{doc.documentNumber}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#714B67] mb-1">
                  <Building className="w-3.5 h-3.5" />
                  <span>{typeLabels[doc.documentType] || doc.documentType}</span>
                </div>

                <h3 className="font-bold text-slate-900 text-base mb-1 group-hover:text-[#714B67] transition">
                  {doc.name}
                </h3>
                <p className="text-xs text-slate-500 mb-4">{doc.issuingAuthority}</p>

                <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-400">تاريخ الإصدار:</span>
                    <span className="font-medium font-mono">{doc.issueDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">تاريخ الانتهاء:</span>
                    <span className={`font-medium font-mono ${status === 'expired' ? 'text-red-600 font-bold' : status === 'expiring_soon' ? 'text-amber-600 font-bold' : 'text-emerald-700'}`}>
                      {doc.expiryDate}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200/60">
                    <span className="text-slate-400">المسؤول عن التجديد:</span>
                    <span className="font-medium text-slate-700 flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      {doc.responsiblePerson}
                    </span>
                  </div>
                  {doc.notes && (
                    <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/40 italic">
                      {doc.notes}
                    </div>
                  )}
                </div>
              </div>

              {/* Card Actions */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button 
                  onClick={() => {
                    setSelectedDoc(doc);
                    setIsDetailModalOpen(true);
                  }}
                  className="text-xs text-[#714B67] hover:text-[#5c3c53] font-bold flex items-center gap-1">
                  عرض التفاصيل والملف &larr;
                </button>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => window.open(doc.fileUrl || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', '_blank')}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                    title="معاينة المستند"
                  >
                    👁️ عرض
                  </button>

                  {doc.fileUrl && doc.fileUrl !== '#' ? (
                    <a 
                      href={doc.fileUrl} 
                      download={`${doc.name}.pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium px-2.5 py-1 rounded-md transition-colors"
                      title="تحميل المرفق"
                    >
                      ⬇️ تحميل
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400">لا يوجد ملف</span>
                  )}

                  <button
                    onClick={() => {
                      if (confirm('هل أنت متأكد من حذف هذا الترخيص؟')) {
                        onDeleteDocument(doc.id);
                        toast.success('تم حذف الترخيص بنجاح');
                      }
                    }}
                    className="text-xs text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 transition"
                    title="حذف"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#714B67]" />
                {selectedDoc ? 'تعديل بيانات الترخيص' : 'إضافة ترخيص أو مستند جديد'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم الترخيص / الوثيقة *</label>
                  <input 
                    type="text"
                    required
                    placeholder="مثال: الرخصة التجارية للفرع الرئيسي"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#714B67]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نوع الترخيص</label>
                  <select 
                    value={formData.documentType || 'commercial_license'}
                    onChange={(e) => setFormData({...formData, documentType: e.target.value as any})}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#714B67] bg-white"
                  >
                    {Object.entries(typeLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم الترخيص / القيد *</label>
                  <input 
                    type="text"
                    required
                    placeholder="مثال: CN-2026-9982"
                    value={formData.documentNumber || ''}
                    onChange={(e) => setFormData({...formData, documentNumber: e.target.value})}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#714B67]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">جهة الإصدار</label>
                  <input 
                    type="text"
                    placeholder="مثال: وزارة التجارة والصناعة"
                    value={formData.issuingAuthority || ''}
                    onChange={(e) => setFormData({...formData, issuingAuthority: e.target.value})}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#714B67]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الإصدار</label>
                  <input 
                    type="date"
                    value={formData.issueDate || ''}
                    onChange={(e) => setFormData({...formData, issueDate: e.target.value})}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#714B67]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الانتهاء *</label>
                  <input 
                    type="date"
                    required
                    value={formData.expiryDate || ''}
                    onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#714B67]"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">إرفاق نسخة الترخيص / المستند (PDF أو صورة)</label>
                  <input 
                    type="file"
                    accept=".pdf,image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setFormData({...formData, fileUrl: URL.createObjectURL(e.target.files[0])});
                        toast.success('تم إرفاق الملف بنجاح');
                      }
                    }}
                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#714B67]/10 file:text-[#714B67] hover:file:bg-[#714B67]/20 cursor-pointer border border-slate-200 rounded-lg p-1"
                  />
                  {formData.fileUrl && formData.fileUrl !== '#' && formData.fileUrl !== 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' && (
                     <p className="text-emerald-600 text-[10px] mt-1 font-bold">✓ تم إرفاق ملف جاهز للحفظ</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">الموظف / المندوب المسؤول عن التجديد</label>
                  <input 
                    type="text"
                    placeholder="مثال: أحمد المندوب الحكومي"
                    value={formData.responsiblePerson || ''}
                    onChange={(e) => setFormData({...formData, responsiblePerson: e.target.value})}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#714B67]"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات أو روابط إضافية</label>
                  <textarea 
                    rows={2}
                    placeholder="ملاحظات حول التجديد أو شروط الجهة الرسمية..."
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#714B67]"
                  ></textarea>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-[#714B67] hover:bg-[#5c3c53] rounded-lg shadow transition"
                >
                  حفظ الترخيص
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {isDetailModalOpen && selectedDoc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#714B67]" />
                تفاصيل ترخيص المنشأة
              </h3>
              <button onClick={() => setIsDetailModalOpen(false)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div>
                  <span className="text-xs text-slate-400 block mb-0.5">رقم الترخيص:</span>
                  <span className="font-mono font-bold text-slate-800 text-sm">{selectedDoc.documentNumber}</span>
                </div>
                <div>
                  {(() => {
                    const { badgeColor, badgeLabel } = getDocumentStatus(selectedDoc.expiryDate);
                    return (
                      <span className={`text-xs px-3 py-1 rounded-full font-semibold border ${badgeColor}`}>
                        {badgeLabel}
                      </span>
                    );
                  })()}
                </div>
              </div>

              <div className="space-y-3 text-xs text-slate-700">
                <div>
                  <span className="text-slate-400 block mb-0.5">اسم الترخيص:</span>
                  <span className="font-bold text-sm text-slate-900">{selectedDoc.name}</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-400 block mb-0.5">نوع الترخيص:</span>
                    <span className="font-medium">{typeLabels[selectedDoc.documentType]}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">جهة الإصدار:</span>
                    <span className="font-medium">{selectedDoc.issuingAuthority}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">تاريخ الإصدار:</span>
                    <span className="font-mono font-medium">{selectedDoc.issueDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">تاريخ الانتهاء:</span>
                    <span className="font-mono font-medium text-red-600">{selectedDoc.expiryDate}</span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">الموظف / المندوب المسؤول:</span>
                  <span className="font-medium text-slate-800">{selectedDoc.responsiblePerson}</span>
                </div>
                {selectedDoc.notes && (
                  <div>
                    <span className="text-slate-400 block mb-0.5">ملاحظات:</span>
                    <p className="p-2 bg-slate-50 rounded border border-slate-100 text-slate-600">{selectedDoc.notes}</p>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                {selectedDoc.fileUrl && selectedDoc.fileUrl !== '#' ? (
                  <a
                    href={selectedDoc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition"
                  >
                    <Download className="w-4 h-4" />
                    تحميل المستند المرفق
                  </a>
                ) : (
                  <button
                    onClick={() => toast.error('لا يوجد ملف مرفق مع هذا الترخيص')}
                    className="bg-slate-100 text-slate-400 text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 cursor-not-allowed"
                  >
                    <Download className="w-4 h-4 opacity-50" />
                    لا يوجد مرفق
                  </button>
                )}
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold px-4 py-2 rounded-lg transition"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
