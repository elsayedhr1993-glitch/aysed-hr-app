import React, { useState } from 'react';
import { 
  Building2, Plus, Search, LayoutGrid, List as ListIcon, Edit2, Trash2, CheckCircle2, 
  Globe, Phone, Mail, MapPin, Shield, FileText, Stamp, Award, Check, X, Sparkles, Building
} from 'lucide-react';
import { Company } from '../types';
import toast from 'react-hot-toast';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, cleanFirestoreData } from '../lib/firebase';

interface CompaniesAppProps {
  companies: Company[];
  activeCompany: Company;
  onSelectCompany: (company: Company) => void;
  onSaveCompany: (company: Company) => void;
  onDeleteCompany: (companyId: string) => void;
  currentUserEmail: string;
  currentUserRole?: string;
}

export const CompaniesApp: React.FC<CompaniesAppProps> = ({
  companies,
  activeCompany,
  onSelectCompany,
  onSaveCompany,
  onDeleteCompany,
  currentUserEmail,
  currentUserRole = ''
}) => {
  const isSuperAdmin = currentUserRole === 'SUPER_ADMIN' || 
    currentUserEmail?.toLowerCase() === 'elsayedhr1993@gmail.com' || 
    currentUserEmail?.toLowerCase() === 'admin@aysed.com';

  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'legal' | 'address' | 'branding'>('general');

  const filteredCompanies = (companies || []).filter(c => 
    c.nameAr.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.nameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.commercialRegNo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenCreate = () => {
    setEditingCompany({
      id: 'comp-' + Date.now(),
      nameAr: '',
      nameEn: '',
      commercialRegNo: '',
      civilIdCompany: '',
      commercialLicenseNo: '',
      titleAddressNo: '',
      bankName: 'بنك الكويت الوطني (NBK)',
      iban: 'KW00NBK0000000000000000000',
      wsiCode: '',
      currency: 'KWD',
      governorate: 'العاصمة',
      area: 'المرقاب',
      street: 'شارع أحمد الجابر',
      phone: '+965 22000000',
      email: 'info@clinic.kw',
      website: 'https://clinic.kw',
      isPrimary: false
    });
    setActiveTab('general');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (comp: Company) => {
    setEditingCompany({ ...comp });
    setActiveTab('general');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany || !editingCompany.nameAr.trim()) {
      toast.error("يرجى إدخال اسم الشركة بالعربية على الأقل");
      return;
    }

    try {
      const compId = editingCompany.id || ('comp-' + Date.now());
      const email = (editingCompany.email || `${editingCompany.phone ? editingCompany.phone.replace(/[^0-9]/g, '') : compId}@aysedhr.com`).trim().toLowerCase();
      
      const completeCompany: Company = {
        ...editingCompany,
        id: compId,
        nameAr: editingCompany.nameAr.trim(),
        nameEn: editingCompany.nameEn?.trim() || editingCompany.nameAr.trim(),
        email: email,
        phone: editingCompany.phone || '99112233',
        status: editingCompany.status || 'active'
      };

      const cleaned = cleanFirestoreData(completeCompany) as Company;
      await setDoc(doc(db, 'companies', compId), {
        ...cleaned,
        companyId: compId,
        companyName: completeCompany.nameAr,
        state: completeCompany.status === 'suspended' ? 'suspended' : 'active',
        isActive: completeCompany.status !== 'suspended',
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Also create/sync corresponding subscription
      const subDocData = {
        id: `sub-${compId}`,
        companyId: compId,
        companyName: completeCompany.nameAr,
        ownerName: completeCompany.nameAr,
        email: email,
        phone: completeCompany.phone || '99112233',
        status: completeCompany.status === 'suspended' ? 'suspended' : 'active',
        planType: 'سنوي (Enterprise)',
        subscriptionFee: 180,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        updatedAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'subscriptions', `sub-${compId}`), cleanFirestoreData(subDocData), { merge: true });

      onSaveCompany(completeCompany);

      // Persist in local storage caches
      try {
        const regRaw = localStorage.getItem('registered_companies_v1');
        const regList = regRaw ? JSON.parse(regRaw) : [];
        const filtered = regList.filter((c: any) => c.id !== compId);
        filtered.push(completeCompany);
        localStorage.setItem('registered_companies_v1', JSON.stringify(filtered));

        const savedSubsRaw = localStorage.getItem('aysed_saved_subscriptions');
        const savedSubs = savedSubsRaw ? JSON.parse(savedSubsRaw) : [];
        const filteredSubs = savedSubs.filter((s: any) => s.companyId !== compId && s.id !== `sub-${compId}`);
        filteredSubs.push(subDocData);
        localStorage.setItem('aysed_saved_subscriptions', JSON.stringify(filteredSubs));
      } catch (e) {}

      window.dispatchEvent(new CustomEvent('aysed_companies_changed'));
      toast.success("تم حفظ وتحديث بيانات الشركة بنجاح في قاعدة البيانات ولوحة السوبر أدمن");
      setIsModalOpen(false);
      setEditingCompany(null);
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء حفظ الشركة في Firestore");
    }
  };

  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);

  const handleDeleteClick = (comp: Company) => {
    setCompanyToDelete(comp);
  };

  const confirmDelete = async () => {
    if (!companyToDelete) return;
    try {
      await deleteDoc(doc(db, 'companies', companyToDelete.id));
      await deleteDoc(doc(db, 'subscriptions', `sub-${companyToDelete.id}`));
      onDeleteCompany(companyToDelete.id);
      
      try {
        const regRaw = localStorage.getItem('registered_companies_v1');
        if (regRaw) {
          const regList = JSON.parse(regRaw).filter((c: any) => c.id !== companyToDelete.id);
          localStorage.setItem('registered_companies_v1', JSON.stringify(regList));
        }
      } catch (e) {}

      window.dispatchEvent(new CustomEvent('aysed_companies_changed'));
      toast.success("تم حذف الشركة والعيادة بنجاح من قاعدة البيانات");
      setCompanyToDelete(null);
    } catch (err) {
      console.error(err);
      toast.error("فشل حذف الشركة");
    }
  };

  return (
    <div className="p-6 bg-transparent min-h-[calc(100vh-3rem)] text-right" dir="rtl">
      {/* Odoo Control Panel Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white/90 backdrop-blur-md p-5 rounded-2xl border border-slate-200 shadow-sm mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg w-fit mb-2 border border-purple-100">
            <Building2 className="w-3.5 h-3.5" />
            <span>نظام أودو الموحد للشركات والفروع (Odoo Multi-Company Hierarchy)</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">إدارة الشركات والعيادات الطبية</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            إدارة الهيكل التنظيمي، الترويسات الرسمية، البيانات الضريبية، وعزل بيانات الموظفين والرواتب لكل فرع
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              placeholder="بحث في الشركات أو السجل التجاري..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-9 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#714B67] outline-none"
            />
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                viewMode === 'kanban' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="عرض البطاقات (Kanban)"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                viewMode === 'list' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="عرض القائمة (List View)"
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>

          {/* View Access Control: Hide create company for non-superadmin */}
          {isSuperAdmin && (
            <button
              id="action_create_new_company"
              name="action_create_new_company"
              data-groups="base.group_system"
              onClick={handleOpenCreate}
              className="o_list_button_add bg-[#714B67] hover:bg-[#5e3f55] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إنشاء شركة جديدة</span>
            </button>
          )}
        </div>
      </div>

      {/* Kanban View - Odoo Enterprise Kanban Style */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 o_kanban_mobile">
          {filteredCompanies.map((comp) => {
            const isActive = comp.id === activeCompany?.id;
            return (
              <div 
                key={comp.id}
                className={`bg-white/95 backdrop-blur-md rounded-2xl border transition-all shadow-sm hover:shadow-md overflow-hidden flex flex-col justify-between oe_kanban_global_click ${
                  isActive ? 'border-purple-500 ring-2 ring-purple-500/20 bg-purple-50/10' : 'border-slate-200'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-lg border border-purple-200 shadow-inner overflow-hidden o_kanban_image">
                        {comp.logoUrl ? (
                          <img src={comp.logoUrl} alt={comp.nameAr} className="w-full h-full object-cover" />
                        ) : (
                          <Building className="w-6 h-6 text-[#714B67]" />
                        )}
                      </div>
                      <div className="oe_kanban_details">
                        <h3 className="font-bold text-slate-900 text-sm o_kanban_record_title">{comp.nameAr}</h3>
                        <p className="text-[11px] text-slate-500 font-mono">{comp.nameEn}</p>
                      </div>
                    </div>
                    {isActive ? (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" /> النشطة حالياً
                      </span>
                    ) : (
                      <button
                        name="action_switch_to_this_company"
                        type="button"
                        data-type="object"
                        onClick={() => onSelectCompany(comp)}
                        className="btn btn-primary btn-sm mt-2 bg-[#714B67] hover:bg-[#5e3f55] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition cursor-pointer shadow-sm"
                      >
                        إدارة الشركة
                      </button>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="p-5 space-y-3 text-xs text-slate-600">
                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[10px]">السجل التجاري</span>
                        <span className="font-mono font-bold text-slate-800">{comp.commercialRegNo || 'غير محدد'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">الرقم المدني للجهة</span>
                        <span className="font-mono font-bold text-slate-800">{comp.civilIdCompany || 'غير محدد'}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center gap-2 text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span className="truncate">{comp.governorate || 'الكويت'} - {comp.area || ''} - {comp.street || ''}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <Phone className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span className="font-mono">{comp.phone || '+965 ...'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <Mail className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span className="truncate font-mono">{comp.email || 'info@company.kw'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-[10px] font-mono text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
                    العملة: {comp.currency || 'KWD'}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(comp)}
                      className="p-1.5 bg-white hover:bg-purple-50 text-slate-700 hover:text-purple-700 rounded-lg border border-slate-200 transition shadow-sm cursor-pointer"
                      title="تعديل بيانات الشركة والترويسة"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {isSuperAdmin && (
                      <button
                        onClick={() => handleDeleteClick(comp)}
                        className="p-1.5 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-600 rounded-lg border border-slate-200 transition shadow-sm cursor-pointer"
                        title="حذف الشركة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold">
                <th className="p-4">اسم الشركة / العيادة</th>
                <th className="p-4">السجل التجاري</th>
                <th className="p-4">الرقم المدني</th>
                <th className="p-4">المنطقة والهاتف</th>
                <th className="p-4">العملة</th>
                <th className="p-4 text-center">الحالة</th>
                <th className="p-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCompanies.map((comp) => {
                const isActive = comp.id === activeCompany?.id;
                return (
                  <tr key={comp.id} className="hover:bg-purple-50/20 transition-all">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm shrink-0">
                          {comp.logoUrl ? (
                            <img src={comp.logoUrl} alt={comp.nameAr} className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <Building className="w-4 h-4 text-[#714B67]" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{comp.nameAr}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{comp.nameEn}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-mono font-semibold text-slate-700">{comp.commercialRegNo || '-'}</td>
                    <td className="p-4 font-mono font-semibold text-slate-700">{comp.civilIdCompany || '-'}</td>
                    <td className="p-4 text-slate-600">
                      <div>{comp.area || 'الكويت'}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{comp.phone}</div>
                    </td>
                    <td className="p-4 font-mono font-bold text-slate-800">{comp.currency || 'KWD'}</td>
                    <td className="p-4 text-center">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full text-[10px] font-bold border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> نشطة
                        </span>
                      ) : (
                        <button
                          onClick={() => onSelectCompany(comp)}
                          className="text-purple-700 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-purple-100 transition cursor-pointer"
                        >
                          تعيين كنشطة
                        </button>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(comp)}
                          className="p-1.5 bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-700 rounded-lg transition"
                          title="تعديل"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {isSuperAdmin && (
                          <button
                            onClick={() => handleDeleteClick(comp)}
                            className="p-1.5 bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-600 rounded-lg transition"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Odoo Company Form Modal with Tabs */}
      {isModalOpen && editingCompany && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 my-8">
            <div className="bg-[#714B67] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Building2 className="w-5 h-5" />
                <span>{editingCompany.id ? 'نموذج تعديل الشركة / العيادة (Odoo Form View)' : 'إنشاء شركة أو عيادة جديدة'}</span>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-white/20 rounded-lg text-white/80 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Odoo Notebook Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-6 gap-6 text-xs font-bold text-slate-600">
              <button
                type="button"
                onClick={() => setActiveTab('general')}
                className={`py-3 border-b-2 transition flex items-center gap-2 ${
                  activeTab === 'general' ? 'border-[#714B67] text-[#714B67]' : 'border-transparent hover:text-slate-900'
                }`}
              >
                <Building className="w-3.5 h-3.5" />
                البيانات العامة
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('legal')}
                className={`py-3 border-b-2 transition flex items-center gap-2 ${
                  activeTab === 'legal' ? 'border-[#714B67] text-[#714B67]' : 'border-transparent hover:text-slate-900'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                القانونية والضريبية
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('address')}
                className={`py-3 border-b-2 transition flex items-center gap-2 ${
                  activeTab === 'address' ? 'border-[#714B67] text-[#714B67]' : 'border-transparent hover:text-slate-900'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                العناوين والاتصال
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('branding')}
                className={`py-3 border-b-2 transition flex items-center gap-2 ${
                  activeTab === 'branding' ? 'border-[#714B67] text-[#714B67]' : 'border-transparent hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                الترويسة والأختام الرسمية
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-6 max-h-[65vh] overflow-y-auto">
              {/* Tab 1: General */}
              {activeTab === 'general' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">اسم الشركة بالعربية (Company Name AR) *</label>
                      <input
                        type="text"
                        required
                        value={editingCompany.nameAr}
                        onChange={(e) => setEditingCompany({ ...editingCompany, nameAr: e.target.value })}
                        placeholder="مثال: عيادات ايليت الطبية المتخصصة"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#714B67] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">اسم الشركة بالإنجليزية (Company Name EN)</label>
                      <input
                        type="text"
                        value={editingCompany.nameEn || ''}
                        onChange={(e) => setEditingCompany({ ...editingCompany, nameEn: e.target.value })}
                        placeholder="Elite Specialized Clinics"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#714B67] outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">رابط شعار الشركة (Logo URL)</label>
                      <input
                        type="text"
                        value={editingCompany.logoUrl || ''}
                        onChange={(e) => setEditingCompany({ ...editingCompany, logoUrl: e.target.value })}
                        placeholder="https://..."
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#714B67] outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">العملة الرسمية</label>
                      <select
                        value={editingCompany.currency || 'KWD'}
                        onChange={(e) => setEditingCompany({ ...editingCompany, currency: e.target.value })}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#714B67] outline-none"
                      >
                        <option value="KWD">دينار كويتي (KWD)</option>
                        <option value="USD">دولار أمريكي (USD)</option>
                        <option value="EUR">يورو (EUR)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">الشركة الأم (Parent Company) إن وجدت</label>
                    <select
                      value={editingCompany.parentCompanyId || ''}
                      onChange={(e) => setEditingCompany({ ...editingCompany, parentCompanyId: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#714B67] outline-none"
                    >
                      <option value="">-- بدون شركة أم (شركة مستقلة رئيسية) --</option>
                      {companies.filter(c => c.id !== editingCompany.id).map(c => (
                        <option key={c.id} value={c.id}>{c.nameAr}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Tab 2: Legal & Tax */}
              {activeTab === 'legal' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">رقم السجل التجاري (Commercial Reg No)</label>
                      <input
                        type="text"
                        value={editingCompany.commercialRegNo || ''}
                        onChange={(e) => setEditingCompany({ ...editingCompany, commercialRegNo: e.target.value })}
                        placeholder="123456"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#714B67] outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">رقم الترخيص التجاري / الصحي</label>
                      <input
                        type="text"
                        value={editingCompany.commercialLicenseNo || ''}
                        onChange={(e) => setEditingCompany({ ...editingCompany, commercialLicenseNo: e.target.value })}
                        placeholder="MOH-LIC-2026"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#714B67] outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">الرقم المدني للجهة (Civil ID Company)</label>
                      <input
                        type="text"
                        value={editingCompany.civilIdCompany || ''}
                        onChange={(e) => setEditingCompany({ ...editingCompany, civilIdCompany: e.target.value })}
                        placeholder="200000000"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#714B67] outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">الرقم الآلي للعنوان (Title Address No)</label>
                      <input
                        type="text"
                        value={editingCompany.titleAddressNo || ''}
                        onChange={(e) => setEditingCompany({ ...editingCompany, titleAddressNo: e.target.value })}
                        placeholder="87654321"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#714B67] outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">رمز حماية الأجور (WSI Code - الشؤون)</label>
                      <input
                        type="text"
                        value={editingCompany.wsiCode || ''}
                        onChange={(e) => setEditingCompany({ ...editingCompany, wsiCode: e.target.value })}
                        placeholder="WSI-9876"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#714B67] outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">رقم الآيبان البنكي (IBAN)</label>
                      <input
                        type="text"
                        value={editingCompany.iban || ''}
                        onChange={(e) => setEditingCompany({ ...editingCompany, iban: e.target.value })}
                        placeholder="KW00NBK..."
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#714B67] outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Address & Contact */}
              {activeTab === 'address' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">الدولة</label>
                      <input
                        type="text"
                        disabled
                        value="دولة الكويت (Kuwait)"
                        className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">المحافظة</label>
                      <input
                        type="text"
                        value={editingCompany.governorate || ''}
                        onChange={(e) => setEditingCompany({ ...editingCompany, governorate: e.target.value })}
                        placeholder="العاصمة / حولي / الفروانية"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#714B67] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">المنطقة</label>
                      <input
                        type="text"
                        value={editingCompany.area || ''}
                        onChange={(e) => setEditingCompany({ ...editingCompany, area: e.target.value })}
                        placeholder="السالمية / حولي / الشويخ"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#714B67] outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">الشارع والقطعة</label>
                      <input
                        type="text"
                        value={editingCompany.street || ''}
                        onChange={(e) => setEditingCompany({ ...editingCompany, street: e.target.value })}
                        placeholder="قطعة 4، شارع الخليج العربي"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#714B67] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف الرسمي</label>
                      <input
                        type="text"
                        value={editingCompany.phone || ''}
                        onChange={(e) => setEditingCompany({ ...editingCompany, phone: e.target.value })}
                        placeholder="+965 22000000"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#714B67] outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني</label>
                      <input
                        type="email"
                        value={editingCompany.email || ''}
                        onChange={(e) => setEditingCompany({ ...editingCompany, email: e.target.value })}
                        placeholder="info@company.kw"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#714B67] outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">الموقع الإلكتروني</label>
                      <input
                        type="text"
                        value={editingCompany.website || ''}
                        onChange={(e) => setEditingCompany({ ...editingCompany, website: e.target.value })}
                        placeholder="https://..."
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#714B67] outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Branding & Header/Footer & Stamps */}
              {activeTab === 'branding' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">رابط الختم الرسمي المعتمد (Stamp URL)</label>
                      <input
                        type="text"
                        value={editingCompany.stampUrl || ''}
                        onChange={(e) => setEditingCompany({ ...editingCompany, stampUrl: e.target.value })}
                        placeholder="https://.../stamp.png"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#714B67] outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">رابط التوقيع المخول (Authorized Signature URL)</label>
                      <input
                        type="text"
                        value={editingCompany.authorizedSignatureUrl || ''}
                        onChange={(e) => setEditingCompany({ ...editingCompany, authorizedSignatureUrl: e.target.value })}
                        placeholder="https://.../signature.png"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#714B67] outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">نص ترويسة الورق الرسمي المطبوع (Header HTML / Text)</label>
                    <textarea
                      rows={3}
                      value={editingCompany.headerHtml || ''}
                      onChange={(e) => setEditingCompany({ ...editingCompany, headerHtml: e.target.value })}
                      placeholder="دولة الكويت - وزارة الصحة - إدارة التراخيص الطبية..."
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#714B67] outline-none font-sans"
                    ></textarea>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">نص تذييل الورق الرسمي (Footer HTML / Text)</label>
                    <textarea
                      rows={2}
                      value={editingCompany.footerHtml || ''}
                      onChange={(e) => setEditingCompany({ ...editingCompany, footerHtml: e.target.value })}
                      placeholder="السالمية - شارع البلاجات - هاتف: 22000000 - ص.ب: 12345 السالمية"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#714B67] outline-none font-sans"
                    ></textarea>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#714B67] hover:bg-[#5e3f55] text-white rounded-xl text-xs font-bold shadow-md transition"
                >
                  حفظ البيانات السحابية
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {companyToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 text-right" dir="rtl">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-4 mx-auto md:mx-0">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">تأكيد حذف الشركة أو العيادة</h3>
            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              هل أنت متأكد من رغبتك في حذف شركة <span className="font-bold text-slate-900">"{companyToDelete.nameAr}"</span> نهائياً من قاعدة البيانات السحابية؟ لا يمكن التراجع عن هذا الإجراء.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setCompanyToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow transition cursor-pointer"
              >
                نعم، احذف نهائياً
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
