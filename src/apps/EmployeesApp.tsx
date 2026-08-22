import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { 
  Employee, Company, ViewMode, Contract, LeaveRequest, DocumentItem, JobTitle, Department
} from '../types';
import { validateKuwaitCivilId, parseKuwaitCivilId, formatKWD } from '../utils/kuwaitLaw';
import { processAnyDocument } from '../utils/ocrService';
import { 
  User, Users, CheckCircle, AlertTriangle, FileText, Calendar, Briefcase,
  Folder, Shield, Plus, Edit2, Trash2, X, Building, Phone, Mail, Award, Search, Check, Eye, Camera, Loader2, Sparkles, LayoutGrid, List, ArrowLeftRight, Filter, Fingerprint, Key, CreditCard, MessageSquare, Send, ShieldCheck, History, Save, RotateCcw, Clock
} from 'lucide-react';

interface EmployeesAppProps {
  employees: Employee[];
  contracts: Contract[];
  leaves: LeaveRequest[];
  documents: DocumentItem[];
  jobTitles?: JobTitle[];
  departments?: Department[];
  activeCompany: Company;
  viewMode: ViewMode;
  searchTerm: string;
  filterTab: string;
  onSaveEmployee: (emp: Employee) => void;
  onDeleteEmployee: (empId: string) => void;
  onSoftDeleteEmployee?: (empId: string, reason?: string) => void;
  onRestoreEmployee?: (empId: string) => void;
  onHardDeleteAllEmployees?: () => void;
  onSaveJobTitle?: (jobTitle: JobTitle) => void;
  onDeleteJobTitle?: (id: string) => void;
  onNavigateToApp?: (app: any) => void;
  selectedEmpForForm: Employee | null;
  onCloseForm: () => void;
  onViewModeChange: (mode: ViewMode) => void;
  onFilterTabChange?: (tab: string) => void;
  onSelectEmployeeForLeaves?: (empId: string) => void;
  onOpenNotificationModal?: (emp: Employee, trigger?: any) => void;
}

export const EmployeesApp: React.FC<EmployeesAppProps> = ({
  employees = [],
  contracts = [],
  leaves = [],
  documents = [],
  jobTitles = [],
  departments = [],
  activeCompany,
  viewMode,
  searchTerm = '',
  filterTab = 'ALL',
  onSaveEmployee,
  onDeleteEmployee,
  onSoftDeleteEmployee,
  onRestoreEmployee,
  onHardDeleteAllEmployees,
  onSaveJobTitle,
  onDeleteJobTitle,
  onNavigateToApp,
  selectedEmpForForm,
  onCloseForm,
  onViewModeChange,
  onFilterTabChange,
  onSelectEmployeeForLeaves,
  onOpenNotificationModal,
}) => {
  const [editingEmp, setEditingEmp] = useState<Partial<Employee> | null>(selectedEmpForForm);
  const [activeTab, setActiveTab] = useState<'WORK' | 'PRIVATE' | 'HR_SETTINGS' | 'LEGAL' | 'BANK' | 'DOCUMENTS'>('WORK');
  const [civilIdError, setCivilIdError] = useState<string | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteReason, setDeleteReason] = useState<string>('استقالة أو إنهاء خدمات');
  const [showSoftDeletedModal, setShowSoftDeletedModal] = useState<boolean>(false);
  const [showPurgeModal, setShowPurgeModal] = useState<boolean>(false);
  const [purgeConfirmText, setPurgeConfirmText] = useState<string>('');

  const activeCompId = activeCompany?.id || '';
  const companyEmps = (employees || []).filter(e => e.companyId === activeCompId);
  const softDeletedEmps = companyEmps.filter(e => e.isDeleted);

  // Local interactive search state
  const [localSearchTerm, setLocalSearchTerm] = useState<string>(searchTerm || '');

  useEffect(() => {
    if (searchTerm !== undefined) {
      setLocalSearchTerm(searchTerm);
    }
  }, [searchTerm]);

  // Compute effective job titles (from props or auto-derived from employees & standard catalog)
  const effectiveJobTitles = React.useMemo(() => {
    const map = new Map<string, JobTitle>();
    (jobTitles || []).forEach(jt => {
      if (jt.titleName) map.set(jt.titleName.trim(), jt);
    });
    // Add any missing job titles found in current employees
    companyEmps.forEach(emp => {
      if (emp.jobTitle && emp.jobTitle.trim() && !map.has(emp.jobTitle.trim())) {
        map.set(emp.jobTitle.trim(), {
          id: `jt-emp-${emp.id}`,
          titleName: emp.jobTitle.trim(),
          departmentName: emp.department || 'عام',
          description: 'مسمى وظيفي مستخدم في شؤون الموظفين'
        });
      }
    });
    return Array.from(map.values());
  }, [jobTitles, companyEmps]);

  // Odoo Search Facets & Filters State
  const [odooFilter, setOdooFilter] = useState<'ALL' | 'ACTIVE' | 'ON_LEAVE' | 'ARCHIVED'>('ALL');
  const [odooGroupBy, setOdooGroupBy] = useState<'NONE' | 'DEPARTMENT' | 'MANAGER'>('NONE');
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [isGroupByMenuOpen, setIsGroupByMenuOpen] = useState(false);

  // Inline Job Title Editing state
  const [inlineEditingJobEmpId, setInlineEditingJobEmpId] = useState<string | null>(null);
  const [inlineJobTitleText, setInlineJobTitleText] = useState<string>('');
  const [quickStatusMenuEmpId, setQuickStatusMenuEmpId] = useState<string | null>(null);

  // Job Titles Modal state
  const [isJobTitlesModalOpen, setIsJobTitlesModalOpen] = useState<boolean>(false);
  const [jobTitleSearch, setJobTitleSearch] = useState<string>('');
  const [editingJobTitleObj, setEditingJobTitleObj] = useState<Partial<JobTitle> | null>(null);

  const [loadingScan, setLoadingScan] = useState<boolean>(false);
  const [scannedFilePreviewUrl, setScannedFilePreviewUrl] = useState<string | null>(null);
  const [highlightedFields, setHighlightedFields] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (selectedEmpForForm) {
      setEditingEmp(selectedEmpForForm);
      setActiveTab('WORK');
      setCivilIdError(null);
    }
  }, [selectedEmpForForm]);

  const filteredEmps = companyEmps.filter(emp => {
    if (odooFilter === 'ARCHIVED') {
      if (!emp.isDeleted) return false;
    } else {
      if (emp.isDeleted) return false;
    }

    const sTerm = (localSearchTerm || '').trim().toLowerCase();
    const matchesSearch = !sTerm ||
      (emp.fullNameAr && emp.fullNameAr.toLowerCase().includes(sTerm)) ||
      (emp.fullNameEn && emp.fullNameEn.toLowerCase().includes(sTerm)) ||
      (emp.civilId && emp.civilId.includes(sTerm)) ||
      (emp.employeeCode && emp.employeeCode.toLowerCase().includes(sTerm)) ||
      (emp.jobTitle && emp.jobTitle.toLowerCase().includes(sTerm)) ||
      (emp.department && emp.department.toLowerCase().includes(sTerm)) ||
      (emp.phone && emp.phone.includes(sTerm));

    if (!matchesSearch) return false;

    if (odooFilter === 'ACTIVE' && emp.status !== 'ACTIVE') return false;
    if (odooFilter === 'ON_LEAVE') {
      const today = new Date().toISOString().split('T')[0];
      const isOnLeave = leaves.some(l => 
        l.employeeId === emp.id && 
        l.status === 'APPROVED' && 
        l.startDate <= today && 
        (l.endDate || l.startDate) >= today
      );
      if (!isOnLeave) return false;
    }

    return true;
  });

  const handleOpenNewEmployee = () => {
    const isMOH = filterTab === 'MOH';
    setEditingEmp({
      companyId: activeCompId,
      employeeCode: `EMP-00${employees.length + 1}`,
      fullNameAr: '',
      fullNameEn: '',
      civilId: '',
      isKuwaiti: true,
      nationality: 'كويتي',
      residencyType: 'كويتي',
      status: 'ACTIVE',
      department: isMOH ? 'الجلدية والليزر والتجميل' : 'الموارد البشرية والإدارة',
      jobTitle: isMOH ? 'طبيب' : 'موظف',
      mohLicenseNo: isMOH ? `MOH-KW-${Math.floor(10000 + Math.random() * 90000)}` : undefined,
      mohLicenseExpiry: isMOH ? '2029-12-31' : undefined,
      bankName: 'بنك الكويت الوطني',
      joinDate: new Date().toISOString().split('T')[0],
      carriedOverLeave2025: 0,
      tags: ['جديد'],
    });
    setActiveTab('WORK');
    setCivilIdError(null);
  };

  const handleOpenEditEmployee = (emp: Employee) => {
    setEditingEmp(emp);
    setActiveTab('WORK');
    setCivilIdError(null);
  };

  const handleCivilIdChange = (val: string) => {
    setEditingEmp(prev => ({ ...prev, civilId: val }));
    const cleanVal = val.trim();

    if (cleanVal.length === 0) {
      setCivilIdError(null);
    } else if (cleanVal.length === 12) {
      const duplicateEmp = employees.find(
        emp => emp.id !== editingEmp?.id && emp.civilId && emp.civilId.trim() === cleanVal
      );
      if (duplicateEmp) {
        setCivilIdError(`عفواً، هذا الرقم المدني مسجل سابقاً للموظف [${duplicateEmp.fullNameAr}]`);
        return;
      }

      const result = validateKuwaitCivilId(cleanVal);
      if (!result.isValid) {
        setCivilIdError(result.message);
      } else {
        setCivilIdError(null);
        if (result.dob) {
          setEditingEmp(prev => ({ ...prev, dob: result.dob }));
        }
        if (result.gender) {
          setEditingEmp(prev => ({ ...prev, gender: result.gender as any }));
        }
      }
    } else {
      setCivilIdError('الرقم المدني يتكون من 12 رقماً');
    }
  };

  const handleAutoScan = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoadingScan(true);
    const fileUrl = URL.createObjectURL(file);
    setScannedFilePreviewUrl(fileUrl);

    try {
      const scannedData = await processAnyDocument(file);
      let parsedDob = scannedData.dob;
      let parsedGender = scannedData.gender;
      const cleanCivilId = scannedData.civilId ? scannedData.civilId.trim().replace(/\D/g, '') : '';

      if (cleanCivilId.length === 12) {
        const civilInfo = parseKuwaitCivilId(cleanCivilId) || validateKuwaitCivilId(cleanCivilId);
        if (civilInfo) {
          if (!parsedDob && ('birthDate' in civilInfo ? civilInfo.birthDate : civilInfo.dob)) {
            parsedDob = 'birthDate' in civilInfo ? civilInfo.birthDate : civilInfo.dob;
          }
          if (!parsedGender && civilInfo.gender) {
            parsedGender = civilInfo.gender as any;
          }
        }
      }

      setEditingEmp(prev => ({
        ...prev,
        fullNameAr: scannedData.fullNameAr || scannedData.fullName || prev?.fullNameAr || '',
        fullNameEn: scannedData.fullNameEn || prev?.fullNameEn || '',
        civilId: cleanCivilId || prev?.civilId || '',
        nationality: scannedData.nationality || prev?.nationality || 'كويتي',
        civilIdExpiry: scannedData.expiryDate || prev?.civilIdExpiry || '',
        dob: parsedDob || prev?.dob || '',
        gender: (parsedGender as 'MALE' | 'FEMALE') || prev?.gender || 'MALE',
        passportNo: scannedData.passportNo || prev?.passportNo || '',
        jobTitle: scannedData.jobTitle || prev?.jobTitle || '',
      }));

      setHighlightedFields({
        fullNameAr: true,
        fullNameEn: true,
        civilId: true,
        nationality: true,
        civilIdExpiry: true,
        dob: true,
        gender: true,
        jobTitle: true,
      });

      toast.success('تم مسح المستند واستخراج البيانات بنجاح!');
    } catch (error) {
      console.error(error);
      toast.error('تعذر قراءة المستند، يرجى إدخال البيانات يدوياً.');
    } finally {
      setLoadingScan(false);
    }
  };

  const handleSave = () => {
    if (!editingEmp?.fullNameAr || !editingEmp?.fullNameAr.trim()) {
      toast.error('يرجى إدخال اسم الموظف بالعربية');
      return;
    }
    if (!editingEmp?.civilId || !editingEmp?.civilId.trim()) {
      toast.error('يرجى إدخال الرقم المدني الكويتي');
      return;
    }

    const cleanCivilId = editingEmp.civilId.trim();
    const duplicateEmp = employees.find(
      emp => emp.id !== editingEmp.id && emp.civilId && emp.civilId.trim() === cleanCivilId
    );
    if (duplicateEmp) {
      toast.error(`الرقم المدني مسجل مسبقاً للموظف [${duplicateEmp.fullNameAr}]`);
      return;
    }

    const empToSave: Employee = {
      id: editingEmp.id || `emp-${Date.now()}`,
      companyId: editingEmp.companyId || activeCompId,
      employeeCode: editingEmp.employeeCode || `EMP-00${employees.length + 1}`,
      fullNameAr: editingEmp.fullNameAr.trim(),
      fullNameEn: editingEmp.fullNameEn?.trim() || '',
      civilId: cleanCivilId,
      civilIdExpiry: editingEmp.civilIdExpiry || '2028-12-31',
      passportNo: editingEmp.passportNo || '',
      passportExpiry: editingEmp.passportExpiry || '2029-12-31',
      nationality: editingEmp.nationality || 'كويتي',
      isKuwaiti: editingEmp.isKuwaiti ?? (editingEmp.nationality === 'كويتي'),
      residencyType: editingEmp.residencyType || (editingEmp.isKuwaiti ? 'كويتي' : 'مادة 18 - قطاع أهلي'),
      gender: editingEmp.gender || 'MALE',
      dob: editingEmp.dob || '1990-01-01',
      department: editingEmp.department || 'الموارد البشرية والإدارة',
      departmentId: editingEmp.departmentId || '',
      jobTitle: editingEmp.jobTitle || 'موظف',
      jobTitleId: editingEmp.jobTitleId || '',
      email: editingEmp.email || '',
      phone: editingEmp.phone || '+965 00000000',
      joinDate: editingEmp.joinDate || new Date().toISOString().split('T')[0],
      mohLicenseNo: editingEmp.mohLicenseNo || '',
      mohLicenseExpiry: editingEmp.mohLicenseExpiry || '',
      status: editingEmp.status || 'ACTIVE',
      bankName: editingEmp.bankName || 'بنك الكويت الوطني',
      iban: editingEmp.iban || '',
      avatarUrl: editingEmp.avatarUrl || '',
      tags: editingEmp.tags || ['نشط'],
      notes: editingEmp.notes || '',
      biometricId: editingEmp.biometricId?.trim() || undefined,
      badgeId: editingEmp.badgeId?.trim() || undefined,
      pinCode: editingEmp.pinCode?.trim() || undefined,
      parentId: editingEmp.parentId || undefined,
      coachId: editingEmp.coachId || undefined,
      carriedOverLeave2025: editingEmp.carriedOverLeave2025 ?? 0,
      openingLeaveBalance: editingEmp.openingLeaveBalance ?? 0,
    };

    onSaveEmployee(empToSave);
    setEditingEmp(null);
    setScannedFilePreviewUrl(null);
    setHighlightedFields({});
    setCivilIdError(null);
    if (onCloseForm) onCloseForm();
    toast.success('تم حفظ بيانات الموظف بنجاح');
  };

  return (
    <div className="p-6 bg-[#f8fafc] min-h-[calc(100vh-3rem)] font-['Cairo',sans-serif]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <span>إدارة الموظفين (Employees)</span>
            <span className="text-xs bg-[#714B67] text-white px-2.5 py-0.5 rounded-full font-mono">
              {filteredEmps.length} موظف
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            نظام الموارد البشرية المتكامل وفق قانون العمل الكويتي ومعايير أودو العالمية
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowSoftDeletedModal(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 transition flex items-center gap-1.5 shadow-xs cursor-pointer relative"
          >
            <History className="w-3.5 h-3.5 text-rose-600" />
            <span>الأرشيف (المحذوفات)</span>
            {softDeletedEmps.length > 0 && (
              <span className="bg-rose-600 text-white px-1.5 py-0.2 rounded-full text-[10px] font-mono">
                {softDeletedEmps.length}
              </span>
            )}
          </button>

          {/* View Switcher */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => onViewModeChange('KANBAN')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'KANBAN'
                  ? 'bg-[#714B67] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>كانبان</span>
            </button>
            <button
              onClick={() => onViewModeChange('LIST')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'LIST'
                  ? 'bg-[#714B67] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>قائمة</span>
            </button>
          </div>

          <button
            onClick={() => setIsJobTitlesModalOpen(true)}
            className="bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold px-3 py-2 rounded-lg border border-slate-300 shadow-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <Briefcase className="w-4 h-4 text-[#714B67]" />
            <span>شجرة المسميات ({effectiveJobTitles.length})</span>
          </button>

          <button
            onClick={handleOpenNewEmployee}
            className="bg-[#714B67] hover:bg-[#5a3a52] text-white text-xs font-bold px-4 py-2 rounded-lg shadow flex items-center gap-2 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة موظف</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 mb-6 shadow-xs p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-50 rounded-lg border border-slate-200 px-3 py-1.5 focus-within:border-[#714B67] transition">
            <Search className="w-4 h-4 text-slate-400 mr-2" />
            <input
              type="text"
              placeholder="البحث السريع (الاسم، الكود، الرقم المدني، المسمى)..."
              value={localSearchTerm}
              onChange={(e) => setLocalSearchTerm(e.target.value)}
              className="bg-transparent outline-none text-xs w-64 text-slate-700 placeholder:text-slate-400"
            />
            {localSearchTerm && (
              <button onClick={() => setLocalSearchTerm('')} className="text-slate-400 hover:text-slate-600 p-0.5">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="relative">
            <button 
              onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
            >
              <Filter className="w-3.5 h-3.5 text-[#714B67]" />
              <span>الفلترة: {odooFilter === 'ALL' ? 'الكل' : odooFilter === 'ACTIVE' ? 'النشطين' : odooFilter === 'ON_LEAVE' ? 'في إجازة' : 'المؤرشفين'}</span>
            </button>
            {isFilterMenuOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 shadow-xl rounded-xl py-1 z-20">
                <button onClick={() => { setOdooFilter('ALL'); setIsFilterMenuOpen(false); }} className="w-full text-right px-4 py-2 text-xs hover:bg-slate-50 font-bold">الجميع</button>
                <button onClick={() => { setOdooFilter('ACTIVE'); setIsFilterMenuOpen(false); }} className="w-full text-right px-4 py-2 text-xs hover:bg-slate-50 font-bold text-emerald-700">الموظفين النشطين</button>
                <button onClick={() => { setOdooFilter('ON_LEAVE'); setIsFilterMenuOpen(false); }} className="w-full text-right px-4 py-2 text-xs hover:bg-slate-50 font-bold text-amber-700">في إجازة اليوم</button>
                <button onClick={() => { setOdooFilter('ARCHIVED'); setIsFilterMenuOpen(false); }} className="w-full text-right px-4 py-2 text-xs hover:bg-slate-50 font-bold text-rose-700">المؤرشفين</button>
              </div>
            )}
          </div>

          <div className="relative">
            <button 
              onClick={() => setIsGroupByMenuOpen(!isGroupByMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
            >
              <List className="w-3.5 h-3.5 text-[#714B67]" />
              <span>تجميع حسب: {odooGroupBy === 'NONE' ? 'بدون' : odooGroupBy === 'DEPARTMENT' ? 'الإدارة' : 'المدير'}</span>
            </button>
            {isGroupByMenuOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 shadow-xl rounded-xl py-1 z-20">
                <button onClick={() => { setOdooGroupBy('NONE'); setIsGroupByMenuOpen(false); }} className="w-full text-right px-4 py-2 text-xs hover:bg-slate-50 font-bold">بدون تجميع</button>
                <button onClick={() => { setOdooGroupBy('DEPARTMENT'); setIsGroupByMenuOpen(false); }} className="w-full text-right px-4 py-2 text-xs hover:bg-slate-50 font-bold">حسب القسم/الإدارة</button>
                <button onClick={() => { setOdooGroupBy('MANAGER'); setIsGroupByMenuOpen(false); }} className="w-full text-right px-4 py-2 text-xs hover:bg-slate-50 font-bold">حسب المدير المباشر</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredEmps.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center my-6 shadow-sm">
          <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4 text-[#714B67]">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-slate-800 text-base mb-1">لا يوجد موظفون مطابقة للبحث</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-6">
            قم بإضافة موظف جديد أو تعديل معايير البحث والفلترة لعرض السجلات
          </p>
          <button
            onClick={handleOpenNewEmployee}
            className="bg-[#714B67] hover:bg-[#5a3a52] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow inline-flex items-center gap-2 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة موظف جديد</span>
          </button>
        </div>
      )}

      {/* KANBAN VIEW */}
      {viewMode === 'KANBAN' && filteredEmps.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredEmps.map(emp => {
            const empDocs = documents.filter(d => d.employeeId === emp.id);
            return (
              <div
                key={emp.id}
                onClick={() => handleOpenEditEmployee(emp)}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition p-4 flex flex-col justify-between cursor-pointer relative group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      {emp.avatarUrl ? (
                        <img src={emp.avatarUrl} alt={emp.fullNameAr} className="w-12 h-12 rounded-full object-cover border-2 border-slate-200" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-[#714B67]/10 text-[#714B67] flex items-center justify-center font-bold text-lg">
                          {emp.fullNameAr.charAt(0)}
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm group-hover:text-[#714B67] transition">{emp.fullNameAr}</h4>
                        <span className="text-xs text-slate-500 block truncate">{emp.jobTitle || 'موظف'}</span>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      emp.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {emp.status === 'ACTIVE' ? 'نشط' : 'متوقف'}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 mb-4 bg-slate-50 p-2.5 rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">الكود:</span>
                      <span className="font-mono font-bold text-slate-700">{emp.employeeCode}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">القسم:</span>
                      <span className="font-semibold">{emp.department}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">الرقم المدني:</span>
                      <span className="font-mono font-bold text-slate-900 tracking-wider text-xs">{emp.civilId}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md font-mono text-[10px]">
                      🏷️ بصمة: {emp.biometricId || emp.badgeId || 'غير محدد'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {onSelectEmployeeForLeaves && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); onSelectEmployeeForLeaves(emp.id); }}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition"
                        title="الإجازات"
                      >
                        <Calendar className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSoftDeleteEmployee) {
                          onSoftDeleteEmployee(emp.id, 'أرشفة من لوحة الموظفين');
                          toast.success('تم أرشفة الموظف بنجاح');
                        }
                      }}
                      className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition"
                      title="أرشفة / حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LIST VIEW */}
      {viewMode === 'LIST' && filteredEmps.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#714B67] text-white font-bold">
              <tr>
                <th className="p-3">كود النظام</th>
                <th className="p-3">معرف البصمة (Badge ID)</th>
                <th className="p-3">اسم الموظف</th>
                <th className="p-3">الرقم المدني</th>
                <th className="p-3">المسمى الوظيفي والقسم</th>
                <th className="p-3">الجنسية</th>
                <th className="p-3">تاريخ الالتحاق</th>
                <th className="p-3 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmps.map((emp, index) => (
                <tr key={emp.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'} hover:bg-slate-100/80 transition`}>
                  <td className="p-3 font-mono font-bold text-slate-600">{emp.employeeCode}</td>
                  <td className="p-3 font-mono">
                    <span className="bg-purple-100 text-purple-900 border border-purple-200 px-2 py-0.5 rounded font-bold text-[11px]">
                      {emp.biometricId || emp.badgeId || '—'}
                    </span>
                  </td>
                  <td className="p-3 font-bold text-slate-900 cursor-pointer" onClick={() => handleOpenEditEmployee(emp)}>
                    <div className="flex items-center gap-2 hover:text-[#714B67] transition">
                      {emp.avatarUrl ? (
                        <img src={emp.avatarUrl} alt={emp.fullNameAr} className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-[#714B67]/10 flex items-center justify-center text-[#714B67] font-bold">
                          {emp.fullNameAr.charAt(0)}
                        </div>
                      )}
                      <span>{emp.fullNameAr}</span>
                    </div>
                  </td>
                  <td className="p-3 font-mono dir-ltr text-right">{emp.civilId}</td>
                  <td className="p-3">
                    <div className="font-semibold text-slate-800">{emp.jobTitle}</div>
                    <div className="text-[11px] text-slate-500">{emp.department}</div>
                  </td>
                  <td className="p-3">{emp.nationality}</td>
                  <td className="p-3 font-mono">{emp.joinDate}</td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button onClick={() => handleOpenEditEmployee(emp)} className="p-1 hover:bg-slate-200 rounded text-slate-700" title="تعديل">
                        <Edit2 className="w-4 h-4 text-[#714B67]" />
                      </button>
                      <button onClick={() => {
                        if (onSoftDeleteEmployee) {
                          onSoftDeleteEmployee(emp.id, 'حذف من القائمة');
                          toast.success('تم أرشفة الموظف بنجاح');
                        }
                      }} className="p-1 hover:bg-rose-50 rounded text-rose-600" title="حذف">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* EDIT / CREATE EMPLOYEE MODAL */}
      {editingEmp && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#714B67] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">
                    {editingEmp.id && employees.some(e => e.id === editingEmp.id) ? 'تعديل ملف الموظف' : 'إضافة موظف جديد'}
                  </h3>
                  <p className="text-xs text-purple-200">الرقم المدني الكويتي والتفاصيل الوظيفية (Odoo HR)</p>
                </div>
              </div>
              <button 
                onClick={() => setEditingEmp(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* AI Smart Scan Bar */}
            <div className="bg-purple-50/80 px-6 py-3 border-b border-purple-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-purple-900">
                <Sparkles className="w-4 h-4 text-purple-600 animate-pulse" />
                <span className="font-bold">المسح الذكي (OCR):</span>
                <span>قم برفع البطاقة المدنية أو جواز السفر لملء الحقول تلقائياً</span>
              </div>
              <label className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5 transition">
                <Camera className="w-3.5 h-3.5" />
                <span>{loadingScan ? 'جاري القراءة...' : 'رفع المستند للمسح'}</span>
                <input type="file" accept="image/*,application/pdf" onChange={handleAutoScan} className="hidden" />
              </label>
            </div>

            {/* Odoo Smart Buttons (Stat Buttons / oe_button_box) */}
            {editingEmp.id && employees.some(e => e.id === editingEmp.id) && (
              <div className="bg-slate-100/90 border-b border-slate-200 px-6 py-2.5">
                <div className="text-[11px] font-bold text-slate-500 mb-1.5 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  <span>الربط الديناميكي لسجلات الموظف (Odoo Smart Buttons):</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
                  {/* 1. Contract */}
                  {(() => {
                    const empContracts = contracts.filter(c => c.employeeId === editingEmp.id);
                    const activeC = empContracts.find(c => c.status === 'RUNNING') || empContracts[0];
                    return (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingEmp(null);
                          if (onNavigateToApp) onNavigateToApp('CONTRACTS');
                        }}
                        className="bg-white hover:bg-purple-50 border border-slate-200 hover:border-purple-300 rounded-xl p-2 text-right transition group cursor-pointer shadow-2xs flex flex-col justify-between"
                        title="الانتقال إلى عقود العمل والبدلات"
                      >
                        <div className="flex items-center justify-between text-slate-400 group-hover:text-purple-600 mb-1">
                          <FileText className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-mono font-bold text-purple-700 bg-purple-100 px-1 rounded">
                            {empContracts.length}
                          </span>
                        </div>
                        <div className="text-[11px] font-bold text-slate-800 group-hover:text-purple-700 truncate">
                          {activeC ? `${activeC.basicSalary} د.ك` : 'العقد'}
                        </div>
                        <div className="text-[9px] text-slate-400 truncate">عقود العمل</div>
                      </button>
                    );
                  })()}

                  {/* 2. Leaves */}
                  {(() => {
                    const empLeaves = leaves.filter(l => l.employeeId === editingEmp.id);
                    return (
                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectEmployeeForLeaves && editingEmp.id) {
                            onSelectEmployeeForLeaves(editingEmp.id);
                          }
                          setEditingEmp(null);
                          if (onNavigateToApp) onNavigateToApp('LEAVES');
                        }}
                        className="bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl p-2 text-right transition group cursor-pointer shadow-2xs flex flex-col justify-between"
                        title="الانتقال إلى سجل الإجازات والرصيد"
                      >
                        <div className="flex items-center justify-between text-slate-400 group-hover:text-emerald-600 mb-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100 px-1 rounded">
                            {empLeaves.length}
                          </span>
                        </div>
                        <div className="text-[11px] font-bold text-slate-800 group-hover:text-emerald-700 truncate">
                          الإجازات
                        </div>
                        <div className="text-[9px] text-slate-400 truncate">الأرصدة والطلبات</div>
                      </button>
                    );
                  })()}

                  {/* 3. Attendance */}
                  <button
                    type="button"
                    onClick={() => {
                      setEditingEmp(null);
                      if (onNavigateToApp) onNavigateToApp('ATTENDANCE');
                    }}
                    className="bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl p-2 text-right transition group cursor-pointer shadow-2xs flex flex-col justify-between"
                    title="الانتقال إلى سجل البصمة والدوام"
                  >
                    <div className="flex items-center justify-between text-slate-400 group-hover:text-blue-600 mb-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-100 px-1 rounded">
                        دوام
                      </span>
                    </div>
                    <div className="text-[11px] font-bold text-slate-800 group-hover:text-blue-700 truncate">
                      البصمة
                    </div>
                    <div className="text-[9px] text-slate-400 truncate">سجل الحضور</div>
                  </button>

                  {/* 4. Payroll */}
                  <button
                    type="button"
                    onClick={() => {
                      setEditingEmp(null);
                      if (onNavigateToApp) onNavigateToApp('PAYROLL');
                    }}
                    className="bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-xl p-2 text-right transition group cursor-pointer shadow-2xs flex flex-col justify-between"
                    title="الانتقال إلى مسيرات الرواتب"
                  >
                    <div className="flex items-center justify-between text-slate-400 group-hover:text-amber-600 mb-1">
                      <CreditCard className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-100 px-1 rounded">
                        WPS
                      </span>
                    </div>
                    <div className="text-[11px] font-bold text-slate-800 group-hover:text-amber-700 truncate">
                      الرواتب
                    </div>
                    <div className="text-[9px] text-slate-400 truncate">المسيرات والتحويل</div>
                  </button>

                  {/* 5. Custody & Loans */}
                  <button
                    type="button"
                    onClick={() => {
                      setEditingEmp(null);
                      if (onNavigateToApp) onNavigateToApp('CUSTODY_LOANS');
                    }}
                    className="bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl p-2 text-right transition group cursor-pointer shadow-2xs flex flex-col justify-between"
                    title="الانتقال إلى العهد والسلف والأقساط"
                  >
                    <div className="flex items-center justify-between text-slate-400 group-hover:text-indigo-600 mb-1">
                      <Briefcase className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-100 px-1 rounded">
                        عهد
                      </span>
                    </div>
                    <div className="text-[11px] font-bold text-slate-800 group-hover:text-indigo-700 truncate">
                      العهد والسلف
                    </div>
                    <div className="text-[9px] text-slate-400 truncate">الأقساط والمعدات</div>
                  </button>

                  {/* 6. End of Service */}
                  <button
                    type="button"
                    onClick={() => {
                      setEditingEmp(null);
                      if (onNavigateToApp) onNavigateToApp('EOS');
                    }}
                    className="bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 rounded-xl p-2 text-right transition group cursor-pointer shadow-2xs flex flex-col justify-between"
                    title="الانتقال إلى حاسبة مكافأة نهاية الخدمة"
                  >
                    <div className="flex items-center justify-between text-slate-400 group-hover:text-rose-600 mb-1">
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-mono font-bold text-rose-700 bg-rose-100 px-1 rounded">
                        م. 51
                      </span>
                    </div>
                    <div className="text-[11px] font-bold text-slate-800 group-hover:text-rose-700 truncate">
                      نهاية الخدمة
                    </div>
                    <div className="text-[9px] text-slate-400 truncate">حاسبة المستحقات</div>
                  </button>

                  {/* 7. Documents */}
                  {(() => {
                    const empDocs = documents.filter(d => d.employeeId === editingEmp.id);
                    return (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingEmp(null);
                          if (onNavigateToApp) onNavigateToApp('DOCUMENTS');
                        }}
                        className="bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 rounded-xl p-2 text-right transition group cursor-pointer shadow-2xs flex flex-col justify-between"
                        title="الانتقال إلى أرشيف مستندات الموظف"
                      >
                        <div className="flex items-center justify-between text-slate-400 group-hover:text-teal-600 mb-1">
                          <Folder className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-mono font-bold text-teal-700 bg-teal-100 px-1 rounded">
                            {empDocs.length}
                          </span>
                        </div>
                        <div className="text-[11px] font-bold text-slate-800 group-hover:text-teal-700 truncate">
                          المستندات
                        </div>
                        <div className="text-[9px] text-slate-400 truncate">الأرشيف والـ OCR</div>
                      </button>
                    );
                  })()}

                  {/* 8. Commencement */}
                  <button
                    type="button"
                    onClick={() => {
                      setEditingEmp(null);
                      if (onNavigateToApp) onNavigateToApp('COMMENCEMENT');
                    }}
                    className="bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-300 rounded-xl p-2 text-right transition group cursor-pointer shadow-2xs flex flex-col justify-between"
                    title="الانتقال إلى إقرار مباشرة العمل"
                  >
                    <div className="flex items-center justify-between text-slate-400 group-hover:text-sky-600 mb-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-mono font-bold text-sky-700 bg-sky-100 px-1 rounded">
                        مباشرة
                      </span>
                    </div>
                    <div className="text-[11px] font-bold text-slate-800 group-hover:text-sky-700 truncate">
                      المباشرة
                    </div>
                    <div className="text-[9px] text-slate-400 truncate">استلام العمل</div>
                  </button>
                </div>
              </div>
            )}

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-6 gap-2">
              {[
                { id: 'WORK', label: 'البيانات الوظيفية', icon: Briefcase },
                { id: 'PRIVATE', label: 'البيانات الشخصية', icon: User },
                { id: 'HR_SETTINGS', label: 'إعدادات البصمة وأودو', icon: Fingerprint },
                { id: 'BANK', label: 'البيانات البنكية', icon: CreditCard },
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition ${
                      activeTab === tab.id
                        ? 'border-[#714B67] text-[#714B67] bg-white'
                        : 'border-transparent text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {activeTab === 'WORK' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">اسم الموظف (بالعربية) *</label>
                    <input
                      type="text"
                      value={editingEmp.fullNameAr || ''}
                      onChange={(e) => setEditingEmp({ ...editingEmp, fullNameAr: e.target.value })}
                      placeholder="مثال: أحمد محمد عبد الله"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-[#714B67] transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">اسم الموظف (بالإنجليزية)</label>
                    <input
                      type="text"
                      value={editingEmp.fullNameEn || ''}
                      onChange={(e) => setEditingEmp({ ...editingEmp, fullNameEn: e.target.value })}
                      placeholder="Ahmed Mohammed Abdullah"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-[#714B67] transition dir-ltr"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">الرقم المدني الكويتي (12 رقماً) *</label>
                    <input
                      type="text"
                      maxLength={12}
                      value={editingEmp.civilId || ''}
                      onChange={(e) => handleCivilIdChange(e.target.value)}
                      placeholder="290123101234"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 font-mono outline-none focus:border-[#714B67] transition dir-ltr text-right"
                    />
                    {civilIdError && <p className="text-[11px] text-rose-600 mt-1 font-bold">{civilIdError}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">كود النظام الوظيفي</label>
                    <input
                      type="text"
                      value={editingEmp.employeeCode || ''}
                      onChange={(e) => setEditingEmp({ ...editingEmp, employeeCode: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 font-mono outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">المسمى الوظيفي</label>
                    <select
                      value={editingEmp.jobTitle || ''}
                      onChange={(e) => setEditingEmp({ ...editingEmp, jobTitle: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 outline-none"
                    >
                      <option value="">اختر المسمى الوظيفي...</option>
                      {jobTitles.map(jt => (
                        <option key={jt.id} value={jt.titleName}>{jt.titleName}</option>
                      ))}
                      <option value="محاسب أول">محاسب أول</option>
                      <option value="موظف موارد بشرية">موظف موارد بشرية</option>
                      <option value="طبيب عام">طبيب عام</option>
                      <option value="ممرض">ممرض</option>
                      <option value="مدير مبيعات">مدير مبيعات</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">القسم / الإدارة</label>
                    <select
                      value={editingEmp.department || ''}
                      onChange={(e) => setEditingEmp({ ...editingEmp, department: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 outline-none"
                    >
                      <option value="الموارد البشرية والإدارة">الموارد البشرية والإدارة</option>
                      <option value="الشؤون المالية">الشؤون المالية</option>
                      <option value="الجلدية والليزر والتجميل">الجلدية والليزر والتجميل</option>
                      <option value="العيادات الطبية">العيادات الطبية</option>
                      <option value="تقنية المعلومات">تقنية المعلومات</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الالتحاق بالعمل</label>
                    <input
                      type="date"
                      value={editingEmp.joinDate || ''}
                      onChange={(e) => setEditingEmp({ ...editingEmp, joinDate: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 font-mono outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">حالة الموظف</label>
                    <select
                      value={editingEmp.status || 'ACTIVE'}
                      onChange={(e) => setEditingEmp({ ...editingEmp, status: e.target.value as any })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 outline-none font-bold"
                    >
                      <option value="ACTIVE">نشط (Active)</option>
                      <option value="ON_LEAVE">في إجازة (On Leave)</option>
                      <option value="RESIGNED">مستقيل (Resigned)</option>
                      <option value="TERMINATED">منهي خدماته (Terminated)</option>
                    </select>
                  </div>
                </div>
              )}

              {activeTab === 'PRIVATE' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">الجنسية</label>
                    <input
                      type="text"
                      value={editingEmp.nationality || ''}
                      onChange={(e) => setEditingEmp({ ...editingEmp, nationality: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">نوع الإقامة / التوطين</label>
                    <select
                      value={editingEmp.residencyType || 'كويتي'}
                      onChange={(e) => setEditingEmp({ ...editingEmp, residencyType: e.target.value as any })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 outline-none"
                    >
                      <option value="كويتي">كويتي</option>
                      <option value="مادة 18 - قطاع أهلي">مادة 18 - قطاع أهلي</option>
                      <option value="مادة 19 - شريك/كفيل">مادة 19 - شريك/كفيل</option>
                      <option value="مادة 17 - حكومي">مادة 17 - حكومي</option>
                      <option value="خليجي">خليجي</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الميلاد</label>
                    <input
                      type="date"
                      value={editingEmp.dob || ''}
                      onChange={(e) => setEditingEmp({ ...editingEmp, dob: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 font-mono outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">الجنس</label>
                    <select
                      value={editingEmp.gender || 'MALE'}
                      onChange={(e) => setEditingEmp({ ...editingEmp, gender: e.target.value as any })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 outline-none"
                    >
                      <option value="MALE">ذكر</option>
                      <option value="FEMALE">أنثى</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف المحمول</label>
                    <input
                      type="text"
                      value={editingEmp.phone || ''}
                      onChange={(e) => setEditingEmp({ ...editingEmp, phone: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 font-mono outline-none dir-ltr text-right"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني</label>
                    <input
                      type="email"
                      value={editingEmp.email || ''}
                      onChange={(e) => setEditingEmp({ ...editingEmp, email: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 font-mono outline-none dir-ltr text-right"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'HR_SETTINGS' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">معرف البصمة (Biometric ID / ZKTeco ID)</label>
                    <input
                      type="text"
                      value={editingEmp.biometricId || ''}
                      onChange={(e) => setEditingEmp({ ...editingEmp, biometricId: e.target.value })}
                      placeholder="مثال: 1002"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 font-mono outline-none"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">يستخدم لمطابقة سجلات أجهزة البصمة تلقائياً</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">معرف الشارة (Odoo Badge ID)</label>
                    <input
                      type="text"
                      value={editingEmp.badgeId || ''}
                      onChange={(e) => setEditingEmp({ ...editingEmp, badgeId: e.target.value })}
                      placeholder="مثال: BADGE-55"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 font-mono outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">رقم سري البصمة (Attendance PIN)</label>
                    <input
                      type="text"
                      value={editingEmp.pinCode || ''}
                      onChange={(e) => setEditingEmp({ ...editingEmp, pinCode: e.target.value })}
                      placeholder="1234"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 font-mono outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ آخر ترحيل واستحقاق شهري (lastAccrualDate)</label>
                    <input
                      type="text"
                      value={editingEmp.lastAccrualDate || ''}
                      onChange={(e) => setEditingEmp({ ...editingEmp, lastAccrualDate: e.target.value })}
                      placeholder="YYYY-MM (مثال: 2026-08)"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 font-mono outline-none"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">يمنع محرك الإجازات الآلي الترحيل المكرر في نفس الشهر</p>
                  </div>
                </div>
              )}

              {activeTab === 'BANK' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">البنك</label>
                    <select
                      value={editingEmp.bankName || 'بنك الكويت الوطني'}
                      onChange={(e) => setEditingEmp({ ...editingEmp, bankName: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 outline-none"
                    >
                      <option value="بنك الكويت الوطني">بنك الكويت الوطني (NBK)</option>
                      <option value="بيت التمويل الكويتي">بيت التمويل الكويتي (KFH)</option>
                      <option value="بنك الخليج">بنك الخليج (Gulf Bank)</option>
                      <option value="البنك التجاري الكويتي">البنك التجاري الكويتي (CBK)</option>
                      <option value="بنك برقان">بنك برقان (Burgan Bank)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">رقم الحساب الدولي (IBAN)</label>
                    <input
                      type="text"
                      value={editingEmp.iban || ''}
                      onChange={(e) => setEditingEmp({ ...editingEmp, iban: e.target.value })}
                      placeholder="KW81NBKU0000000000000000000"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 font-mono outline-none dir-ltr text-right"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setEditingEmp(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-200 transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={handleSave}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#714B67] hover:bg-[#5a3a52] text-white shadow transition cursor-pointer flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>حفظ الموظف</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SOFT DELETED / ARCHIVE MODAL */}
      {showSoftDeletedModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 bg-rose-700 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">أرشيف المحذوفات والمستقيلين</h3>
              <button onClick={() => setShowSoftDeletedModal(false)} className="text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-3">
              {softDeletedEmps.length === 0 ? (
                <p className="text-center text-slate-500 text-xs py-8">لا توجد سجلات في الأرشيف</p>
              ) : (
                softDeletedEmps.map(emp => (
                  <div key={emp.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <div className="font-bold text-slate-800 text-xs">{emp.fullNameAr}</div>
                      <div className="text-[10px] text-slate-500 font-mono">الرقم المدني: {emp.civilId} | الكود: {emp.employeeCode}</div>
                    </div>
                    {onRestoreEmployee && (
                      <button
                        onClick={() => {
                          onRestoreEmployee(emp.id);
                          toast.success('تم استعادة الموظف بنجاح');
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>استعادة</span>
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* JOB TITLES MODAL */}
      {isJobTitlesModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 bg-[#714B67] text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">إدارة شجرة المسميات الوظيفية (Job Titles)</h3>
              <button onClick={() => setIsJobTitlesModalOpen(false)} className="text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-3">
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="اسم المسمى الوظيفي الجديد..."
                  value={editingJobTitleObj?.titleName || ''}
                  onChange={(e) => setEditingJobTitleObj({ ...editingJobTitleObj, titleName: e.target.value })}
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs outline-none"
                />
                <button
                  onClick={() => {
                    if (!editingJobTitleObj?.titleName) return;
                    if (onSaveJobTitle) {
                      onSaveJobTitle({
                        id: editingJobTitleObj.id || `jt-${Date.now()}`,
                        titleName: editingJobTitleObj.titleName.trim(),
                        description: editingJobTitleObj.description || '',
                      });
                      setEditingJobTitleObj({ titleName: '', description: '' });
                      toast.success('تم حفظ المسمى الوظيفي');
                    }
                  }}
                  className="bg-[#714B67] text-white px-4 py-2 rounded-xl text-xs font-bold transition"
                >
                  إضافة
                </button>
              </div>

              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-500 mb-1">
                  المسميات المعتمدة في النظام ({effectiveJobTitles.length})
                </div>
                {effectiveJobTitles.map(jt => (
                  <div key={jt.id} className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 transition">
                    <div>
                      <span className="font-bold text-xs text-slate-800">{jt.titleName}</span>
                      {jt.departmentName && (
                        <span className="text-[10px] text-slate-500 mr-2">({jt.departmentName})</span>
                      )}
                    </div>
                    {onDeleteJobTitle && (
                      <button 
                        onClick={() => {
                          onDeleteJobTitle(jt.id);
                          toast.success(`تم إزالة المسمى الوظيفي: ${jt.titleName}`);
                        }} 
                        className="text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition cursor-pointer"
                        title="حذف المسمى"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
