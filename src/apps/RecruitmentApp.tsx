import React, { useState } from 'react';
import { Candidate, CandidateAttachment, Company } from '../types';
import { 
  UserPlus, Star, Plus, CheckCircle, ArrowRight, FileText, 
  Award, GraduationCap, Upload, Eye, Trash2, X, Search, 
  Paperclip, Briefcase, Mail, Phone, ExternalLink, Filter
} from 'lucide-react';

interface RecruitmentAppProps {
  candidates: Candidate[];
  activeCompany: Company;
  onSaveCandidate: (cand: Candidate) => void;
  onConvertCandidateToEmployee: (cand: Candidate) => void;
}

export const RecruitmentApp: React.FC<RecruitmentAppProps> = ({
  candidates,
  activeCompany,
  onSaveCandidate,
  onConvertCandidateToEmployee,
}) => {
  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [viewingCandidate, setViewingCandidate] = useState<Candidate | null>(null);
  
  // Search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('ALL');

  // New/Editing candidate state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [appliedPosition, setAppliedPosition] = useState('');
  const [department, setDepartment] = useState('الموارد البشرية والإدارة');
  const [expectedSalary, setExpectedSalary] = useState<number>(800);
  const [stage, setStage] = useState<Candidate['stage']>('INITIAL');
  const [rating, setRating] = useState<number>(4);
  const [degree, setDegree] = useState('');
  const [certificatesInput, setCertificatesInput] = useState('');
  const [certificates, setCertificates] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<CandidateAttachment[]>([]);
  const [notes, setNotes] = useState('');

  // New attachment upload fields state inside modal
  const [newAttTitle, setNewAttTitle] = useState('');
  const [newAttType, setNewAttType] = useState<CandidateAttachment['type']>('CV');
  const [newAttFileUrl, setNewAttFileUrl] = useState('');
  const [newAttFileName, setNewAttFileName] = useState('');
  const [newAttFileSize, setNewAttFileSize] = useState('');

  const stages = [
    { id: 'INITIAL', label: 'الفرز الأولي (Initial)' },
    { id: 'INTERVIEW', label: 'المقابلة الأولى (Interview)' },
    { id: 'QUALIFIED', label: 'المؤهلون (Qualified)' },
    { id: 'CONTRACT', label: 'العرض الوظيفي (Contract)' },
    { id: 'HIRED', label: 'تم التعيين (Hired 🎉)' },
  ];

  const companyCandidates = (candidates || []).filter(c => c.companyId === (activeCompany?.id || 'comp-1'));

  const filteredCandidates = companyCandidates.filter(c => {
    const matchesSearch = 
      c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.appliedPosition.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.degree && c.degree.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.certificates && c.certificates.some(cert => cert.toLowerCase().includes(searchQuery.toLowerCase())));
    
    const matchesStage = selectedStageFilter === 'ALL' || c.stage === selectedStageFilter;
    return matchesSearch && matchesStage;
  });

  // Helper to open document preview in new tab
  const openDocumentPreviewInNewTab = (fileUrl: string, title: string) => {
    if (!fileUrl) {
      alert('لا يوجد ملف مرفوع لهذا المستند');
      return;
    }

    if (fileUrl.startsWith('data:image')) {
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(`
          <!DOCTYPE html>
          <html dir="rtl" lang="ar">
            <head>
              <meta charset="utf-8">
              <title>معاينة مستند المتقدم: ${title}</title>
              <style>
                body { margin: 0; background-color: #0f172a; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: 'Cairo', system-ui, sans-serif; color: white; }
                .header { position: fixed; top: 0; left: 0; right: 0; background: rgba(15, 23, 42, 0.95); padding: 12px 24px; display: flex; justify-content: space-between; align-items: center; backdrop-filter: blur(8px); border-bottom: 1px solid rgba(255,255,255,0.1); z-index: 10; }
                .title { font-weight: bold; font-size: 15px; color: #f8fafc; }
                .btn-close { background: #334155; color: white; border: none; padding: 6px 16px; border-radius: 6px; cursor: pointer; font-weight: bold; font-family: inherit; font-size: 13px; }
                .btn-close:hover { background: #475569; }
                .img-container { margin-top: 60px; padding: 20px; display: flex; justify-content: center; align-items: center; width: 100%; box-sizing: border-box; }
                img { max-width: 90vw; max-height: 85vh; object-fit: contain; border-radius: 8px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
              </style>
            </head>
            <body>
              <div class="header">
                <span class="title">📄 معاينة مستند المتقدم: ${title}</span>
                <button class="btn-close" onclick="window.close()">إغلاق التبويب ✕</button>
              </div>
              <div class="img-container">
                <img src="${fileUrl}" alt="${title}" />
              </div>
            </body>
          </html>
        `);
        win.document.close();
      } else {
        alert('يرجى السماح بالنوافذ المنبثقة (Popups) لمعاينة المستند في تبويب جديد');
      }
      return;
    }

    if (fileUrl.startsWith('data:application/pdf') || fileUrl.includes('pdf')) {
      try {
        const parts = fileUrl.split(';base64,');
        if (parts.length === 2) {
          const contentType = parts[0].replace('data:', '') || 'application/pdf';
          const byteCharacters = atob(parts[1]);
          const byteArrays = [];
          for (let offset = 0; offset < byteCharacters.length; offset += 512) {
            const slice = byteCharacters.slice(offset, offset + 512);
            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
              byteNumbers[i] = slice.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
          }
          const blob = new Blob(byteArrays, { type: contentType });
          const blobUrl = URL.createObjectURL(blob);
          const win = window.open(blobUrl, '_blank');
          if (!win) {
            alert('يرجى السماح بالنوافذ المنبثقة (Popups) لمعاينة المستند في تبويب جديد');
          }
          return;
        }
      } catch (err) {
        console.error('Error converting base64 PDF:', err);
      }
    }

    const win = window.open(fileUrl, '_blank');
    if (!win) {
      alert('يرجى السماح بالنوافذ المنبثقة (Popups) لمعاينة المستند في تبويب جديد');
    }
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingCandidate(null);
    setFullName('');
    setEmail('');
    setPhone('');
    setAppliedPosition('');
    setDepartment('الموارد البشرية والإدارة');
    setExpectedSalary(800);
    setStage('INITIAL');
    setRating(4);
    setDegree('بكالوريوس');
    setCertificates(['شهادة خبرة 3 سنوات', 'شهادة لغة إنجليزية']);
    setCertificatesInput('');
    setAttachments([]);
    setNotes('');
    resetNewAttachmentFields();
    setShowFormModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (cand: Candidate) => {
    setEditingCandidate(cand);
    setFullName(cand.fullName || '');
    setEmail(cand.email || '');
    setPhone(cand.phone || '');
    setAppliedPosition(cand.appliedPosition || '');
    setDepartment(cand.department || 'عام');
    setExpectedSalary(cand.expectedSalary || 800);
    setStage(cand.stage || 'INITIAL');
    setRating(cand.rating || 4);
    setDegree(cand.degree || '');
    setCertificates(cand.certificates || []);
    setCertificatesInput('');
    setAttachments(cand.attachments || []);
    setNotes(cand.notes || '');
    resetNewAttachmentFields();
    setShowFormModal(true);
  };

  const resetNewAttachmentFields = () => {
    setNewAttTitle('');
    setNewAttType('CV');
    setNewAttFileUrl('');
    setNewAttFileName('');
    setNewAttFileSize('');
  };

  // Handle Adding Attachment to Form List
  const handleAddAttachmentToForm = () => {
    if (!newAttFileUrl) {
      alert('يرجى اختيار وتحديد ملف المستند أو الشهادة أولاً');
      return;
    }
    const title = newAttTitle.trim() || (
      newAttType === 'CV' ? 'السيرة الذاتية CV' :
      newAttType === 'CERTIFICATE' ? 'شهادة مؤهل علمي/دورة' :
      newAttType === 'CIVIL_ID' ? 'صورة البطاقة المدنية' :
      newAttType === 'PASSPORT' ? 'صورة جواز السفر' :
      newAttType === 'EXPERIENCE_LETTER' ? 'شهادة خبرة وخدمة' : 'مستند مرفق'
    );

    const newAtt: CandidateAttachment = {
      id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title,
      type: newAttType,
      fileUrl: newAttFileUrl,
      fileName: newAttFileName || `${title}.pdf`,
      fileSize: newAttFileSize || '1.2 MB',
      uploadDate: new Date().toISOString().split('T')[0],
    };

    setAttachments(prev => [...prev, newAtt]);
    resetNewAttachmentFields();
  };

  // File Upload Conversion to Data URL
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        setNewAttFileUrl(result);
        setNewAttFileName(file.name);
        setNewAttFileSize(`${(file.size / 1024 / 1024).toFixed(2)} MB`);
        if (!newAttTitle) {
          setNewAttTitle(file.name.replace(/\.[^/.]+$/, ""));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Add certificate tag
  const handleAddCertificateTag = () => {
    if (certificatesInput.trim()) {
      setCertificates(prev => [...prev, certificatesInput.trim()]);
      setCertificatesInput('');
    }
  };

  const handleRemoveCertificateTag = (index: number) => {
    setCertificates(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveAttachment = (attId: string) => {
    setAttachments(prev => prev.filter(a => a.id !== attId));
  };

  // Save Candidate
  const handleSave = () => {
    if (!fullName.trim() || !appliedPosition.trim()) {
      alert('يرجى كتابة اسم المتقدم والوظيفة المتقدم لها');
      return;
    }

    const candidate: Candidate = {
      id: editingCandidate ? editingCandidate.id : `cand-${Date.now()}`,
      companyId: activeCompany?.id || 'comp-1',
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      appliedPosition: appliedPosition.trim(),
      department: department.trim() || 'عام',
      expectedSalary: Number(expectedSalary) || 800,
      stage: stage,
      rating: rating,
      degree: degree.trim(),
      certificates: certificates,
      attachments: attachments,
      notes: notes.trim(),
      tags: [
        degree ? `مؤهل: ${degree}` : 'متقدم جديد',
        attachments.length > 0 ? `${attachments.length} مستندات` : 'بدون مرفقات'
      ],
    };

    onSaveCandidate(candidate);
    setShowFormModal(false);
    if (viewingCandidate && viewingCandidate.id === candidate.id) {
      setViewingCandidate(candidate);
    }
  };

  const getAttTypeBadge = (type: CandidateAttachment['type']) => {
    switch (type) {
      case 'CV':
        return <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold text-[10px]">سيرة ذاتية CV</span>;
      case 'CERTIFICATE':
        return <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-bold text-[10px]">شهادة مؤهل</span>;
      case 'CIVIL_ID':
        return <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold text-[10px]">بطاقة مدنية</span>;
      case 'PASSPORT':
        return <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold text-[10px]">جواز سفر</span>;
      case 'EXPERIENCE_LETTER':
        return <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-bold text-[10px]">شهادة خبرة</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold text-[10px]">مستند مرفق</span>;
    }
  };

  return (
    <div className="p-6 bg-transparent min-h-[calc(100vh-3rem)] text-xs">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-[#714B67]" />
            <span>نظام إدارة التوظيف والشهادات المرفقة (Odoo Recruitment)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            متابعة مراحل المقابلات، مراجعة شهادات ومستندات المتقدمين، ومعاينتها بتبويب جديد والتحويل المباشر للموظفين
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenAddModal}
            className="bg-[#714B67] hover:bg-[#5a3a52] text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-sm flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>تقديم طلب توظيف جديد (إرفاق شهادات)</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs mb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            placeholder="بحث باسم المتقدم، الوظيفة، الشهادة، المؤهل..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:border-[#714B67]"
          />
        </div>

        {/* Stage Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedStageFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition ${
              selectedStageFilter === 'ALL' ? 'bg-[#714B67] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            جميع المتقدمين ({companyCandidates.length})
          </button>
          {stages.map(stg => {
            const count = companyCandidates.filter(c => c.stage === stg.id).length;
            return (
              <button
                key={stg.id}
                onClick={() => setSelectedStageFilter(stg.id)}
                className={`px-2.5 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap transition ${
                  selectedStageFilter === stg.id ? 'bg-[#714B67] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {stg.label.split(' ')[0]} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Recruitment Kanban Pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-4">
        {stages.map((stg) => {
          const stageCandidates = filteredCandidates.filter(c => c.stage === stg.id);
          return (
            <div key={stg.id} className="bg-slate-100/80 rounded-xl p-3 border border-slate-200 min-w-[240px] flex flex-col">
              {/* Column Header */}
              <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-200 text-xs font-bold text-slate-800">
                <span>{stg.label}</span>
                <span className="bg-white text-slate-800 px-2 py-0.5 rounded-full font-mono text-[11px] border shadow-xs">
                  {stageCandidates.length}
                </span>
              </div>

              {/* Cards list */}
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-16rem)] p-0.5">
                {stageCandidates.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 border border-dashed border-slate-200 rounded-lg">
                    <p className="text-[11px]">لا يوجد طلبات بهذه المرحلة</p>
                  </div>
                ) : (
                  stageCandidates.map((cand) => {
                    const attCount = cand.attachments?.length || 0;
                    return (
                      <div 
                        key={cand.id} 
                        onClick={() => setViewingCandidate(cand)}
                        className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs text-xs space-y-2.5 hover:border-[#714B67] hover:shadow-md transition cursor-pointer relative group"
                      >
                        <div className="flex justify-between items-start gap-1">
                          <h4 className="font-bold text-slate-900 text-sm hover:text-[#714B67] transition">{cand.fullName}</h4>
                          <div className="flex text-amber-400 shrink-0">
                            {Array.from({ length: cand.rating || 4 }).map((_, i) => (
                              <Star key={i} className="w-3 h-3 fill-amber-400" />
                            ))}
                          </div>
                        </div>

                        <div className="text-slate-600 font-medium flex items-center gap-1">
                          <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                          <span>{cand.appliedPosition}</span>
                        </div>

                        {/* Degree Badge */}
                        {cand.degree && (
                          <div className="flex items-center gap-1.5 text-[11px] bg-purple-50 text-purple-800 p-1.5 rounded-lg border border-purple-100 font-semibold">
                            <GraduationCap className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                            <span className="truncate">{cand.degree}</span>
                          </div>
                        )}

                        {/* Certificates & Attachments badges summary */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] flex items-center gap-1 ${
                            attCount > 0 ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                          }`}>
                            <Paperclip className="w-3 h-3" />
                            <span>{attCount > 0 ? `${attCount} مستندات/شهادات مرفقة` : 'لا يوجد مرفقات'}</span>
                          </span>

                          {cand.certificates && cand.certificates.length > 0 && (
                            <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md font-bold text-[10px] flex items-center gap-1">
                              <Award className="w-3 h-3 text-amber-600" />
                              <span>{cand.certificates.length} شهادات</span>
                            </span>
                          )}
                        </div>

                        {/* Bottom Row: Salary & Quick Actions */}
                        <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100">
                          <span className="font-mono font-bold text-slate-800 bg-slate-50 px-2 py-0.5 rounded border">
                            {cand.expectedSalary} KWD
                          </span>

                          <div className="flex items-center gap-1">
                            {cand.stage !== 'HIRED' ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const nextIdx = stages.findIndex(s => s.id === cand.stage) + 1;
                                  if (nextIdx < stages.length) {
                                    onSaveCandidate({ ...cand, stage: stages[nextIdx].id as any });
                                  }
                                }}
                                className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-[#714B67] font-bold text-[10px] rounded transition flex items-center gap-1"
                                title="ترقية للمرحلة التالية"
                              >
                                <span>التالي</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onConvertCandidateToEmployee(cand);
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-2 rounded text-[10px] shadow-xs flex items-center gap-1"
                                title="تحويل فوراً إلى دليل الموظفين"
                              >
                                <CheckCircle className="w-3 h-3" />
                                <span>تعيين كموظف</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* VIEW CANDIDATE PROFILE & CERTIFICATES MODAL / DRAWER */}
      {viewingCandidate && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[92vh] flex flex-col p-5 sm:p-6 text-xs space-y-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 text-[#714B67] rounded-xl flex items-center justify-center font-bold text-lg">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">{viewingCandidate.fullName}</h3>
                  <div className="flex items-center gap-2 text-slate-500 text-[11px] mt-0.5">
                    <span className="font-semibold text-[#714B67]">{viewingCandidate.appliedPosition}</span>
                    <span>•</span>
                    <span>القسم: {viewingCandidate.department}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleOpenEditModal(viewingCandidate);
                    setViewingCandidate(null);
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition"
                >
                  تعديل الطلب
                </button>
                <button
                  onClick={() => setViewingCandidate(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Modal Content */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Quick Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px]">
                <div>
                  <span className="text-slate-400 block">الراتب المتوقع:</span>
                  <span className="font-mono font-bold text-emerald-700 text-xs">{viewingCandidate.expectedSalary} KWD</span>
                </div>
                <div>
                  <span className="text-slate-400 block">المرحلة الحالية:</span>
                  <span className="font-bold text-purple-700">
                    {stages.find(s => s.id === viewingCandidate.stage)?.label || viewingCandidate.stage}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">البريد الإلكتروني:</span>
                  <span className="font-mono text-slate-700 truncate block">{viewingCandidate.email || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">الهاتف:</span>
                  <span className="font-mono text-slate-700 dir-ltr block">{viewingCandidate.phone || '—'}</span>
                </div>
              </div>

              {/* Academic Degree & Qualifications */}
              <div className="bg-purple-50/60 p-4 rounded-xl border border-purple-100 space-y-2">
                <h4 className="font-bold text-purple-900 text-xs flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-purple-700" />
                  <span>المؤهل العلمي والشهادات الدراسية</span>
                </h4>
                <p className="font-bold text-slate-800 text-sm">
                  {viewingCandidate.degree || 'غير محدد بالمستندات'}
                </p>

                {viewingCandidate.certificates && viewingCandidate.certificates.length > 0 && (
                  <div className="pt-2 flex flex-wrap gap-1.5">
                    {viewingCandidate.certificates.map((cert, idx) => (
                      <span key={idx} className="bg-white border border-purple-200 text-purple-900 font-bold px-2.5 py-1 rounded-lg text-[11px] shadow-xs flex items-center gap-1">
                        <Award className="w-3 h-3 text-amber-500" />
                        <span>{cert}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Attached Candidate Documents & Certificates Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b pb-2">
                  <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-[#714B67]" />
                    <span>المستندات والشهادات المرفقة بطلب التوظيف ({viewingCandidate.attachments?.length || 0})</span>
                  </h4>
                  <button
                    onClick={() => {
                      handleOpenEditModal(viewingCandidate);
                      setViewingCandidate(null);
                    }}
                    className="text-[11px] font-bold text-[#714B67] hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة مستند/شهادة جديدة</span>
                  </button>
                </div>

                {!viewingCandidate.attachments || viewingCandidate.attachments.length === 0 ? (
                  <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="font-bold">لم يتم إرفاق مستندات أو شهادات لهذا المتقدم بعد</p>
                    <p className="text-[11px] mt-1">اضغط على "تعديل الطلب" لرفع السيرة الذاتية، الشهادات الدراسية، أو الهوية</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {viewingCandidate.attachments.map((att) => (
                      <div 
                        key={att.id} 
                        className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-[#714B67] transition flex flex-col justify-between space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <div className="p-2 bg-slate-100 rounded-lg text-[#714B67] shrink-0">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div className="truncate">
                              <h5 className="font-bold text-slate-800 text-xs truncate">{att.title}</h5>
                              <p className="text-[10px] text-slate-400 font-mono">{att.fileName}</p>
                            </div>
                          </div>
                          {getAttTypeBadge(att.type)}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px]">
                          <span className="text-slate-400 font-mono">{att.uploadDate || 'تاريخ المرفق'} • {att.fileSize || ''}</span>
                          <button
                            onClick={() => openDocumentPreviewInNewTab(att.fileUrl, att.title)}
                            className="bg-[#714B67] hover:bg-[#5a3a52] text-white font-bold px-3 py-1 rounded-lg transition shadow-xs flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            <span>معاينة في تبويب جديد ↗</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              {viewingCandidate.notes && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="font-bold text-slate-700 block">ملاحظات وانطباعات المقابلة:</span>
                  <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{viewingCandidate.notes}</p>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="pt-3 border-t flex flex-col sm:flex-row justify-between items-center gap-2 shrink-0">
              <div className="flex items-center gap-2">
                {viewingCandidate.stage === 'HIRED' ? (
                  <button
                    onClick={() => {
                      onConvertCandidateToEmployee(viewingCandidate);
                      setViewingCandidate(null);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg text-xs shadow-xs flex items-center gap-2 transition"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>تحويل فوراً إلى موظف وعقد عمل</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      const nextIdx = stages.findIndex(s => s.id === viewingCandidate.stage) + 1;
                      if (nextIdx < stages.length) {
                        const updated = { ...viewingCandidate, stage: stages[nextIdx].id as any };
                        onSaveCandidate(updated);
                        setViewingCandidate(updated);
                      }
                    }}
                    className="bg-purple-50 hover:bg-purple-100 text-[#714B67] font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-2 transition"
                  >
                    <span>الترقية للمرحلة التالية</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>

              <button
                onClick={() => setViewingCandidate(null)}
                className="px-5 py-2 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-900 transition"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT CANDIDATE APPLICATION MODAL */}
      {showFormModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[92vh] flex flex-col p-5 sm:p-6 text-xs space-y-4 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#714B67]" />
                <h3 className="font-extrabold text-slate-900 text-base">
                  {editingCandidate ? 'تعديل طلب التوظيف ومستندات المتقدم' : 'تقديم طلب توظيف جديد وإرفاق شهادات'}
                </h3>
              </div>
              <button 
                onClick={() => setShowFormModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Fields Body */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Basic Candidate Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">اسم المتقدم الثلاثي / الرباعي *</label>
                  <input
                    type="text"
                    placeholder="مثال: د. أحمد محمود الكندري"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 outline-none focus:border-[#714B67]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">الوظيفة المتقدم لها *</label>
                  <input
                    type="text"
                    placeholder="مثال: محاسب أول / مهندس برمجيات"
                    value={appliedPosition}
                    onChange={(e) => setAppliedPosition(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 outline-none focus:border-[#714B67]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">القسم / الإدارة التابعة</label>
                  <input
                    type="text"
                    placeholder="مثال: الموارد البشرية والإدارة"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 outline-none focus:border-[#714B67]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">الراتب المتوقع (KWD)</label>
                  <input
                    type="number"
                    value={expectedSalary}
                    onChange={(e) => setExpectedSalary(parseFloat(e.target.value) || 0)}
                    className="w-full border border-slate-300 rounded-lg p-2 outline-none font-mono dir-ltr focus:border-[#714B67]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    placeholder="candidate@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 outline-none dir-ltr focus:border-[#714B67]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">رقم الهاتف التواصل</label>
                  <input
                    type="text"
                    placeholder="+965 99000000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 outline-none dir-ltr focus:border-[#714B67]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">مرحلة طلب التوظيف</label>
                  <select
                    value={stage || 'CV'}
                    onChange={(e) => setStage(e.target.value as any)}
                    className="w-full border border-slate-300 rounded-lg p-2 outline-none focus:border-[#714B67]"
                  >
                    {stages.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">التقييم الأولي (نجوم)</label>
                  <select
                    value={rating || 4}
                    onChange={(e) => setRating(parseInt(e.target.value) || 4)}
                    className="w-full border border-slate-300 rounded-lg p-2 outline-none focus:border-[#714B67]"
                  >
                    <option value={5}>⭐⭐⭐⭐⭐ (ممتاز جداً 5/5)</option>
                    <option value={4}>⭐⭐⭐⭐ (جيد جداً 4/5)</option>
                    <option value={3}>⭐⭐⭐ (جيد 3/5)</option>
                    <option value={2}>⭐⭐ (متوسط 2/5)</option>
                    <option value={1}>⭐ (ضعيف 1/5)</option>
                  </select>
                </div>
              </div>

              {/* Qualifications & Degrees Section */}
              <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl space-y-3">
                <h4 className="font-extrabold text-[#714B67] text-xs flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  <span>المؤهلات والشهادات العلمية والمهنية للمتقدم</span>
                </h4>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">المؤهل الدراسي الرئيسي / التخصص الدراسي</label>
                  <input
                    type="text"
                    placeholder="مثال: بكالوريوس محاسبة بتقدير ممتاز - جامعة الكويت"
                    value={degree}
                    onChange={(e) => setDegree(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 outline-none bg-white focus:border-[#714B67]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">إضافة شهادة مهنية / دورات تدريبية إضافية</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="مثال: شهادة PMP / ترخيص وزارة الصحة / دورة إدارة أزمات"
                      value={certificatesInput}
                      onChange={(e) => setCertificatesInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCertificateTag())}
                      className="flex-1 border border-slate-300 rounded-lg p-2 outline-none bg-white focus:border-[#714B67]"
                    />
                    <button
                      type="button"
                      onClick={handleAddCertificateTag}
                      className="bg-[#714B67] text-white px-3 py-2 rounded-lg font-bold shrink-0 hover:bg-[#5a3a52]"
                    >
                      إضافة شهادة
                    </button>
                  </div>

                  {certificates.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {certificates.map((cert, idx) => (
                        <span key={idx} className="bg-white border border-purple-300 text-purple-900 font-bold px-2.5 py-1 rounded-lg text-[11px] shadow-2xs flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-amber-500" />
                          <span>{cert}</span>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveCertificateTag(idx)}
                            className="text-slate-400 hover:text-rose-600 font-bold"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Uploading Candidate Documents & Certificates Section */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-2 border-b pb-2">
                  <Paperclip className="w-4 h-4 text-[#714B67]" />
                  <span>إرفاق مستندات وشهادات المتقدم (السيرة الذاتية، البطاقة، الشهادات)</span>
                </h4>

                {/* File Upload Inputs Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">اسم / وصف المستند</label>
                    <input
                      type="text"
                      placeholder="مثال: السيرة الذاتية الحديثة / شهادة البكالوريوس"
                      value={newAttTitle}
                      onChange={(e) => setNewAttTitle(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg p-2 outline-none bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">تصنيف المستند</label>
                    <select
                      value={newAttType || 'OTHER'}
                      onChange={(e) => setNewAttType(e.target.value as any)}
                      className="w-full border border-slate-300 rounded-lg p-2 outline-none bg-white"
                    >
                      <option value="CV">📄 سيرة ذاتية (CV)</option>
                      <option value="CERTIFICATE">🎓 شهادة مؤهل علمي / دورة</option>
                      <option value="CIVIL_ID">🆔 صورة البطاقة المدنية</option>
                      <option value="PASSPORT">📘 صورة جواز السفر</option>
                      <option value="EXPERIENCE_LETTER">📜 شهادة خبرة وخدمة</option>
                      <option value="OTHER">📂 مستند آخر</option>
                    </select>
                  </div>
                </div>

                {/* File Picker */}
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700 mb-1">اختيار ملف المستند من الجهاز (صورة / PDF)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*,application/pdf,.pdf,.bdf"
                      onChange={handleFileChange}
                      className="block w-full text-xs text-slate-500 file:mr-0 file:ml-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#714B67] file:text-white hover:file:bg-[#5a3a52] cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={handleAddAttachmentToForm}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg shrink-0 flex items-center gap-1.5 transition shadow-xs"
                    >
                      <Plus className="w-4 h-4" />
                      <span>اعتماد المرفق</span>
                    </button>
                  </div>
                  {newAttFileName && (
                    <p className="text-[11px] text-emerald-700 font-mono font-bold mt-1">
                      ✓ جاهز للإضافة: {newAttFileName} ({newAttFileSize})
                    </p>
                  )}
                </div>

                {/* List of Attached Documents */}
                {attachments.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <span className="font-bold text-slate-700 block text-[11px]">
                      قائمة المستندات المرفقة بطلب التوظيف ({attachments.length}):
                    </span>

                    <div className="space-y-1.5">
                      {attachments.map((att) => (
                        <div key={att.id} className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <FileText className="w-4 h-4 text-[#714B67] shrink-0" />
                            <div className="truncate">
                              <span className="font-bold text-slate-800 block truncate text-xs">{att.title}</span>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                                <span>{att.fileName}</span>
                                <span>•</span>
                                <span>{att.fileSize}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {getAttTypeBadge(att.type)}
                            <button
                              type="button"
                              onClick={() => openDocumentPreviewInNewTab(att.fileUrl, att.title)}
                              className="p-1 text-[#714B67] hover:bg-purple-50 rounded transition"
                              title="معاينة المستند في تبويب جديد"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveAttachment(att.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                              title="حذف المرفق"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">ملاحظات وانطباعات المقابلة والتوصيات</label>
                <textarea
                  rows={3}
                  placeholder="ملاحظات حول أداء المتقدم في المقابلة الشخصية، نقاط القوة، توصية قسم الموارد البشرية..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 outline-none focus:border-[#714B67]"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t flex justify-end gap-2 shrink-0">
              <button 
                type="button"
                onClick={() => setShowFormModal(false)} 
                className="bg-slate-200 text-slate-800 px-4 py-2 rounded-lg font-bold hover:bg-slate-300 transition"
              >
                إلغاء
              </button>
              <button 
                type="button"
                onClick={handleSave} 
                className="bg-[#714B67] text-white px-6 py-2 rounded-lg font-bold shadow-md hover:bg-[#5a3a52] transition flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>حفظ طلب التوظيف والشهادات</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
