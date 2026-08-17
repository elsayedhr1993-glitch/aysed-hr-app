import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { printDocument } from '../utils/printUtils';
import { 
  Employee, Company, ViewMode, Contract, LeaveRequest, DocumentItem, JobTitle, Department
} from '../types';
import { validateKuwaitCivilId, parseKuwaitCivilId, formatKWD, calculateLeaveAccrual2026Details } from '../utils/kuwaitLaw';
import { processAnyDocument } from '../utils/ocrService';
import { 
  User, Users, CheckCircle, AlertTriangle, FileText, Calendar, Briefcase,
  Folder, Shield, Plus, Edit2, Trash2, X, Building, Phone, Mail, Award, Search, Check, Eye, Camera, Loader2, Sparkles, LayoutGrid, List, ArrowLeftRight, Filter, Fingerprint, Key, CreditCard, MessageSquare, Send, ShieldCheck, History, Save
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
  employees,
  contracts,
  leaves,
  documents,
  jobTitles = [],
  departments = [],
  activeCompany,
  viewMode,
  searchTerm,
  filterTab,
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
  const [deleteConfirmText, setDeleteConfirmText] = useState<string>('');
  const [showSoftDeletedModal, setShowSoftDeletedModal] = useState<boolean>(false);
  const [showPurgeModal, setShowPurgeModal] = useState<boolean>(false);
  const [purgeConfirmText, setPurgeConfirmText] = useState<string>('');

  const softDeletedEmps = (employees || []).filter(e => e.companyId === (activeCompany?.id || 'comp-1') && e.isDeleted);

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

  // Transfer Modal state
  const [isTransferModalOpen, setIsTransferModalOpen] = useState<boolean>(false);
  const [transferTargetDeptId, setTransferTargetDeptId] = useState<string>('');
  const [transferReason, setTransferReason] = useState<string>('');
  const [transferDate, setTransferDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loadingScan, setLoadingScan] = useState<boolean>(false);
  const [scannedFilePreviewUrl, setScannedFilePreviewUrl] = useState<string | null>(null);
  const [highlightedFields, setHighlightedFields] = useState<Record<string, boolean>>({});

  const getHighlightClass = (field: string) => 
    highlightedFields[field] 
      ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-200 transition-all duration-300' 
      : 'border-slate-300';

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
        gender: parsedGender || prev?.gender || 'MALE',
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

      alert('✅ تم مسح المستند وتعبئة كافة الحقول (الاسم، الرقم المدني، الجنسية، الجنس، تاريخ الميلاد، تاريخ الانتهاء) تلقائياً بنجاح!');
    } catch (error) {
      console.error(error);
      alert('❌ تعذر قراءة المستند، يرجى التأكد من وضوح الصورة أو تعبئة البيانات يدوياً.');
    } finally {
      setLoadingScan(false);
    }
  };

  useEffect(() => {
    if (selectedEmpForForm) {
      setEditingEmp(selectedEmpForForm);
      setActiveTab('WORK');
      setCivilIdError(null);
    }
  }, [selectedEmpForForm]);

  // Filter employees for active company and search (exclude soft-deleted unless archived filter with fallback)
  const activeCompId = activeCompany?.id || 'comp-1';
  const companyEmps = (employees || []).filter(e => {
    if (odooFilter === 'ARCHIVED') {
      return !!e.isDeleted;
    }
    return !e.isDeleted;
  });

  const filteredEmps = companyEmps.filter(emp => {
    const sTerm = (searchTerm || '').trim().toLowerCase();
    const matchesSearch = !sTerm ||
      (emp.fullNameAr && emp.fullNameAr.includes(searchTerm)) ||
      (emp.fullNameEn && emp.fullNameEn.toLowerCase().includes(sTerm)) ||
      (emp.civilId && emp.civilId.includes(searchTerm)) ||
      (emp.employeeCode && emp.employeeCode.includes(searchTerm)) ||
      (emp.biometricId && emp.biometricId.includes(searchTerm)) ||
      (emp.badgeId && emp.badgeId.includes(searchTerm)) ||
      (emp.pinCode && emp.pinCode.includes(searchTerm));

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
      companyId: activeCompany?.id || 'comp-1',
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
    });
    setActiveTab('WORK');
    setCivilIdError(null);
  };

  const handleOpenEditEmployee = (emp: Employee) => {
    setEditingEmp(emp);
    setActiveTab('WORK');
    setCivilIdError(null);
  };

  // Handle Civil ID change with MOD 11 validation and Uniqueness Constraint
  const handleCivilIdChange = (val: string) => {
    setEditingEmp(prev => ({ ...prev, civilId: val }));
    const cleanVal = val.trim();

    if (cleanVal.length === 0) {
      setCivilIdError(null);
    } else if (cleanVal.length === 12) {
      // Check for duplicate civil ID
      const duplicateEmp = employees.find(
        emp => emp.id !== editingEmp?.id && emp.civilId && emp.civilId.trim() === cleanVal
      );
      if (duplicateEmp) {
        setCivilIdError(`عفواً، هذا الرقم المدني مسجل سابقاً للموظف [${duplicateEmp.fullNameAr}]، يرجى الانتقال لتحديث ملفه بدلاً من إنشاء موظف جديد.`);
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

  const handleSave = () => {
    if (!editingEmp?.fullNameAr || !editingEmp?.fullNameAr.trim()) {
      toast.error('يرجى إدخال اسم الموظف باللغة العربية (حقل إجباري)');
      return;
    }

    if (!editingEmp?.civilId || !editingEmp?.civilId.trim()) {
      toast.error('يرجى إدخال الرقم المدني الكويتي (12 رقماً)');
      return;
    }

    const cleanCivilId = editingEmp.civilId.trim();

    // Civil ID Uniqueness Constraint Check
    const duplicateEmp = employees.find(
      emp => emp.id !== editingEmp.id && emp.civilId && emp.civilId.trim() === cleanCivilId
    );
    if (duplicateEmp) {
      const alertMsg = `عفواً، هذا الرقم المدني مسجل سابقاً للموظف [${duplicateEmp.fullNameAr}]، يرجى الانتقال لتحديث ملفه بدلاً من إنشاء موظف جديد.`;
      toast.error(alertMsg, { duration: 6000 });
      setCivilIdError(alertMsg);
      return;
    }

    const check = validateKuwaitCivilId(cleanCivilId);
    if (!check.isValid) {
      toast.error(check.message || 'الرقم المدني الكويتي غير صالح وفق معادلة التحقق الرسمية');
      return;
    }

    const empToSave: Employee = {
      id: editingEmp.id || `emp-${Date.now()}`,
      companyId: editingEmp.companyId || activeCompany?.id || 'comp-1',
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
      department: editingEmp.department || 'الموارد البشرية',
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
      tags: editingEmp.tags || ['جديد'],
      notes: editingEmp.notes || '',
      biometricId: (editingEmp.biometricId || editingEmp.badgeId || '').trim() || undefined,
      badgeId: (editingEmp.badgeId || editingEmp.biometricId || '').trim() || undefined,
      pinCode: editingEmp.pinCode?.trim() || undefined,
      parentId: editingEmp.parentId || undefined,
      coachId: editingEmp.coachId || undefined,
      carriedOverLeave2025: editingEmp.carriedOverLeave2025 ?? editingEmp.openingLeaveBalance ?? 0,
      openingLeaveBalance: editingEmp.openingLeaveBalance ?? editingEmp.carriedOverLeave2025 ?? 0,
    };

    onSaveEmployee(empToSave);
    setEditingEmp(null);
    setScannedFilePreviewUrl(null);
    setHighlightedFields({});
    setCivilIdError(null);
    if (onCloseForm) {
      onCloseForm();
    }
  };

  const handleDelete = (empId: string, empName: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setDeleteConfirmTarget({ id: empId, name: empName || 'الموظف' });
  };

  return (
    <div className="p-6 bg-transparent min-h-[calc(100vh-3rem)]">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <span>الموظفين</span>
            <span className="text-xs bg-[#714B67] text-white px-2 py-0.5 rounded-full font-mono">
              {filteredEmps.length} موظف
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            إدارة بطاقات الموظفين والأرقام المدنية الكويتي وفق معايير وزارة الشؤون والتأمينات
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Soft Delete Archive Button */}
          <button
            onClick={() => setShowSoftDeletedModal(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition flex items-center gap-1.5 cursor-pointer relative"
          >
            <History className="w-3.5 h-3.5 text-rose-600" />
            <span>أرشيف المحذوفات</span>
            {softDeletedEmps.length > 0 && (
              <span className="bg-rose-600 text-white px-1.5 py-0.2 rounded-full text-[10px] font-mono">
                {softDeletedEmps.length}
              </span>
            )}
          </button>

          {/* View Switcher Toggle */}
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
            onClick={() => {
              setEditingJobTitleObj({ titleName: '', description: '', departmentId: '' });
              setIsJobTitlesModalOpen(true);
            }}
            className="bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold px-3 py-2 rounded border border-slate-300 shadow-xs flex items-center gap-1.5 transition"
            title="عرض وإدارة جدول المسميات الوظيفية (job_titles)"
          >
            <Briefcase className="w-4 h-4 text-[#714B67]" />
            <span>شجرة المسميات ({jobTitles.length})</span>
          </button>

          {/* Purge / Clean System Button */}
          {onHardDeleteAllEmployees && (
            <button
              onClick={() => {
                setPurgeConfirmText('');
                setShowPurgeModal(true);
              }}
              className="bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold px-3 py-2 rounded border border-rose-200 shadow-xs flex items-center gap-1.5 transition cursor-pointer"
              title="تفريغ وتنظيف قاعدة بيانات الموظفين بالكامل"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>تفريغ الموظفين التجريبيين</span>
            </button>
          )}

          <button
            onClick={handleOpenNewEmployee}
            className="bg-[#714B67] hover:bg-[#5a3a52] text-white text-xs font-bold px-4 py-2 rounded shadow flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة موظف</span>
          </button>
        </div>
      </div>

      {/* Odoo Search Facets & Filter Bar */}
      <div className="bg-white rounded-lg border border-slate-200 mb-6 shadow-xs p-1.5 flex flex-wrap items-center justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center bg-slate-100 rounded border border-slate-200 px-2 py-1.5">
            <Search className="w-4 h-4 text-slate-400 mr-2" />
            <input
              type="text"
              placeholder="البحث الذكي (Smart Search)..."
              value={searchTerm}
              onChange={(e) => {
                // If you want to update the parent search, you should do it through a prop, but here we can just show active filters. 
                // Currently searchTerm is coming from props, so we just show it.
              }}
              className="bg-transparent outline-none text-xs w-48 text-slate-700"
              readOnly
            />
          </div>

          <div className="relative">
            <button 
              onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded border border-transparent hover:border-slate-200 transition"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>فلاتر (Filters)</span>
            </button>
            {isFilterMenuOpen && (
              <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 shadow-lg rounded-md py-1 z-10">
                <button 
                  onClick={() => { setOdooFilter('ALL'); setIsFilterMenuOpen(false); }}
                  className={`w-full text-right px-4 py-1.5 text-xs ${odooFilter === 'ALL' ? 'bg-slate-100 font-bold text-[#714B67]' : 'hover:bg-slate-50'}`}
                >
                  الجميع (All)
                </button>
                <button 
                  onClick={() => { setOdooFilter('ACTIVE'); setIsFilterMenuOpen(false); }}
                  className={`w-full text-right px-4 py-1.5 text-xs ${odooFilter === 'ACTIVE' ? 'bg-slate-100 font-bold text-[#714B67]' : 'hover:bg-slate-50'}`}
                >
                  الموظفين الفاعلين (Active)
                </button>
                <button 
                  onClick={() => { setOdooFilter('ON_LEAVE'); setIsFilterMenuOpen(false); }}
                  className={`w-full text-right px-4 py-1.5 text-xs ${odooFilter === 'ON_LEAVE' ? 'bg-slate-100 font-bold text-[#714B67]' : 'hover:bg-slate-50'}`}
                >
                  في إجازة اليوم (On Leave)
                </button>
                <button 
                  onClick={() => { setOdooFilter('ARCHIVED'); setIsFilterMenuOpen(false); }}
                  className={`w-full text-right px-4 py-1.5 text-xs text-rose-600 ${odooFilter === 'ARCHIVED' ? 'bg-rose-50 font-bold' : 'hover:bg-slate-50'}`}
                >
                  المؤرشفون (Archived)
                </button>
              </div>
            )}
          </div>

          <div className="relative">
            <button 
              onClick={() => setIsGroupByMenuOpen(!isGroupByMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded border border-transparent hover:border-slate-200 transition"
            >
              <List className="w-3.5 h-3.5" />
              <span>تجميع حسب (Group By)</span>
            </button>
            {isGroupByMenuOpen && (
              <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 shadow-lg rounded-md py-1 z-10">
                <button 
                  onClick={() => { setOdooGroupBy('NONE'); setIsGroupByMenuOpen(false); }}
                  className={`w-full text-right px-4 py-1.5 text-xs ${odooGroupBy === 'NONE' ? 'bg-slate-100 font-bold text-[#714B67]' : 'hover:bg-slate-50'}`}
                >
                  بدون تجميع (None)
                </button>
                <button 
                  onClick={() => { setOdooGroupBy('DEPARTMENT'); setIsGroupByMenuOpen(false); }}
                  className={`w-full text-right px-4 py-1.5 text-xs ${odooGroupBy === 'DEPARTMENT' ? 'bg-slate-100 font-bold text-[#714B67]' : 'hover:bg-slate-50'}`}
                >
                  حسب الإدارة (Department)
                </button>
                <button 
                  onClick={() => { setOdooGroupBy('MANAGER'); setIsGroupByMenuOpen(false); }}
                  className={`w-full text-right px-4 py-1.5 text-xs ${odooGroupBy === 'MANAGER' ? 'bg-slate-100 font-bold text-[#714B67]' : 'hover:bg-slate-50'}`}
                >
                  حسب المدير (Manager)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Active Facets Display */}
        <div className="flex items-center gap-1.5">
          {odooFilter !== 'ALL' && (
            <span className="inline-flex items-center gap-1 bg-[#714B67]/10 text-[#714B67] px-2 py-1 rounded text-[11px] font-bold">
              {odooFilter === 'ACTIVE' ? 'الموظفين الفاعلين' : 'في إجازة اليوم'}
              <button onClick={() => setOdooFilter('ALL')} className="hover:text-rose-600">×</button>
            </span>
          )}
          {odooGroupBy !== 'NONE' && (
            <span className="inline-flex items-center gap-1 bg-[#714B67]/10 text-[#714B67] px-2 py-1 rounded text-[11px] font-bold">
              تجميع: {odooGroupBy === 'DEPARTMENT' ? 'الإدارة' : 'المدير'}
              <button onClick={() => setOdooGroupBy('NONE')} className="hover:text-rose-600">×</button>
            </span>
          )}
        </div>
      </div>

      {/* EMPTY STATE */}
      {filteredEmps.length === 0 && (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center my-6 shadow-sm">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-[#714B67]">
            <User className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-slate-800 text-base mb-1">لا يوجد موظفون مسجلون حالياً</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-6">
            النظام جديد ونظيف وجاهز لإضافة سجلات الموظفين الرسمية لشركة {activeCompany?.nameAr || ''}
          </p>
          <button
            onClick={handleOpenNewEmployee}
            className="bg-[#714B67] hover:bg-[#5a3a52] text-white text-xs font-bold px-5 py-2.5 rounded-lg shadow inline-flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة أول موظف الآن</span>
          </button>
        </div>
      )}

      {/* KANBAN VIEW */}
      {viewMode === 'KANBAN' && filteredEmps.length > 0 && (
        <div className="flex flex-col gap-6">
          {Object.entries(
            odooGroupBy === 'NONE' 
              ? { 'الجميع': filteredEmps } 
              : filteredEmps.reduce((acc, emp) => {
                  const key = odooGroupBy === 'DEPARTMENT' 
                    ? (emp.department || 'بدون إدارة')
                    : (emp.parentId ? employees.find(e => e.id === emp.parentId)?.fullNameAr || 'مدير غير معروف' : 'بدون مدير');
                  if (!acc[key]) acc[key] = [];
                  acc[key].push(emp);
                  return acc;
                }, {} as Record<string, Employee[]>)
          ).map(([groupName, empsGroup]) => {
            const emps = empsGroup as Employee[];
            return (
            <div key={groupName} className="mb-4">
              {odooGroupBy !== 'NONE' && (
                <div className="flex items-center gap-2 mb-3 px-2">
                  <div className="text-sm font-bold text-slate-700">{groupName}</div>
                  <div className="text-xs text-slate-400 bg-slate-100 px-2 rounded-full">{emps.length}</div>
                  <div className="flex-grow border-t border-slate-200 ml-4"></div>
                </div>
              )}
              <div className="flex flex-wrap items-start justify-start">
                {emps.map((emp) => {
                  const empDocs = documents.filter(d => d.employeeId === emp.id);

                  return (
                    <div
                      key={emp.id}
                      onClick={() => handleOpenEditEmployee(emp)}
                      className="o_kanban_record"
                    >
                      {/* صورة الموظف مع مؤشر الحالة */}
                      <div className="o_kanban_image_fill">
                        {emp.avatarUrl ? (
                          <img src={emp.avatarUrl} alt={emp.fullNameAr} />
                        ) : (
                          <div className="fallback-avatar text-[#714B67] bg-[#714B67]/10">
                            {emp.fullNameAr.charAt(0)}
                          </div>
                        )}
                        <span className={`status_dot ${emp.status === 'ACTIVE' ? 'online' : ''}`}></span>
                      </div>

                      <div className="oe_kanban_details">
                        <div className="o_kanban_record_top flex items-start justify-between gap-2">
                          <div className="o_kanban_record_headings flex-1 min-w-0">
                            <strong className="o_kanban_record_title truncate block" title={emp.fullNameAr}>{emp.fullNameAr}</strong>
                            <span className="o_kanban_record_subtitle truncate block" title={emp.jobTitle}>{emp.jobTitle}</span>
                          </div>
                          
                          {/* Odoo-style inline status changer */}
                          <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => setQuickStatusMenuEmpId(quickStatusMenuEmpId === emp.id ? null : emp.id)}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 transition cursor-pointer shadow-xs border ${
                                emp.status === 'ACTIVE'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  : emp.status === 'ON_LEAVE'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                  : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                              }`}
                              title="تغيير حالة الموظف سريعاً"
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${emp.status === 'ACTIVE' ? 'bg-emerald-600' : emp.status === 'ON_LEAVE' ? 'bg-amber-600' : 'bg-slate-500'}`}></span>
                              <span>{emp.status === 'ACTIVE' ? 'نشط' : emp.status === 'ON_LEAVE' ? 'في إجازة' : 'مستقيل'}</span>
                              <span className="text-[9px] opacity-70">▼</span>
                            </button>

                            {quickStatusMenuEmpId === emp.id && (
                              <div className="absolute top-full left-0 mt-1 w-36 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50 text-right animate-in fade-in zoom-in duration-100">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onSaveEmployee({ ...emp, status: 'ACTIVE' });
                                    setQuickStatusMenuEmpId(null);
                                    toast.success("تم تحديث حالة الموظف إلى: نشط");
                                  }}
                                  className="w-full text-right px-3 py-1.5 text-xs hover:bg-emerald-50 text-emerald-700 font-bold flex items-center gap-1.5 cursor-pointer"
                                >
                                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                  <span>نشط (Active)</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onSaveEmployee({ ...emp, status: 'ON_LEAVE' });
                                    setQuickStatusMenuEmpId(null);
                                    toast.success("تم تحديث حالة الموظف إلى: في إجازة");
                                  }}
                                  className="w-full text-right px-3 py-1.5 text-xs hover:bg-amber-50 text-amber-700 font-bold flex items-center gap-1.5 cursor-pointer"
                                >
                                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                  <span>في إجازة (On Leave)</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (onSoftDeleteEmployee) {
                                      onSoftDeleteEmployee(emp.id, 'استقالة سريعة من الكارت');
                                    }
                                    setQuickStatusMenuEmpId(null);
                                  }}
                                  className="w-full text-right px-3 py-1.5 text-xs hover:bg-rose-50 text-rose-700 font-bold flex items-center gap-1.5 border-t border-slate-100 cursor-pointer"
                                >
                                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                                  <span>مستقيل / أرشفة</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="o_kanban_record_body">
                          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                            <span className="bg-slate-100 text-slate-700 font-mono text-[10px] px-1.5 py-0.5 rounded font-bold" title="كود النظام">
                              {emp.employeeCode}
                            </span>
                            {(emp.biometricId || emp.badgeId) && (
                              <span className="bg-purple-100 text-purple-900 border border-purple-200 font-mono text-[10px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1" title="معرف البصمة / Badge ID">
                                🏷️ بصمة: {emp.biometricId || emp.badgeId}
                              </span>
                            )}
                          </div>
                          <div className="contact_info">
                            <Mail /> <span className="truncate">{emp.email || 'لا يوجد بريد'}</span>
                          </div>
                          <div className="contact_info">
                            <Phone /> <span className="truncate dir-ltr text-right">{emp.phone || 'لا يوجد هاتف'}</span>
                          </div>
                        </div>

                        <div className="o_kanban_record_bottom">
                          <div className="oe_kanban_bottom_left">
                            <span className="badge">{emp.department}</span>
                          </div>
                          <div className="oe_kanban_bottom_right">
                            {onOpenNotificationModal && (
                              <MessageSquare 
                                className="w-4 h-4 text-emerald-600 hover:text-emerald-700" 
                                title="إرسال إشعار للموظف"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenNotificationModal(emp, 'HR_ACTION_REQUIRED');
                                }} 
                              />
                            )}
                            {onSelectEmployeeForLeaves && (
                              <Calendar 
                                className="w-4 h-4" 
                                title="الإجازات"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectEmployeeForLeaves(emp.id);
                                }} 
                              />
                            )}
                            <Folder className="w-4 h-4" title={`${empDocs.length} مستندات`} />
                            <Trash2 
                              className="w-4 h-4 hover:text-rose-600" 
                              title="حذف"
                              onClick={(e) => handleDelete(emp.id, emp.fullNameAr, e)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
          })}
        </div>
      )}

      {/* LIST VIEW */}
      {viewMode === 'LIST' && filteredEmps.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#714B67] text-white font-bold">
              <tr>
                <th className="p-3">كود النظام</th>
                <th className="p-3">معرف البصمة (Badge ID) 🏷️</th>
                <th className="p-3">اسم الموظف</th>
                <th className="p-3">الرقم المدني (Civil ID)</th>
                <th className="p-3">المسمى الوظيفي والقسم</th>
                <th className="p-3">الجنسية ونوع الإقامة</th>
                <th className="p-3">تاريخ الالتحاق</th>
                <th className="p-3">الراتب الأساسي</th>
                <th className="p-3 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Object.entries(
                odooGroupBy === 'NONE' 
                  ? { 'الجميع': filteredEmps } 
                  : filteredEmps.reduce((acc, emp) => {
                      const key = odooGroupBy === 'DEPARTMENT' 
                        ? (emp.department || 'بدون إدارة')
                        : (emp.parentId ? employees.find(e => e.id === emp.parentId)?.fullNameAr || 'مدير غير معروف' : 'بدون مدير');
                      if (!acc[key]) acc[key] = [];
                      acc[key].push(emp);
                      return acc;
                    }, {} as Record<string, Employee[]>)
              ).map(([groupName, empsGroup]) => {
                const emps = empsGroup as Employee[];
                return (
                  <React.Fragment key={groupName}>
                    {odooGroupBy !== 'NONE' && (
                      <tr className="bg-slate-100">
                        <td colSpan={9} className="p-3 font-bold text-slate-700">
                          {groupName} <span className="text-slate-500 font-normal ml-2">({emps.length})</span>
                        </td>
                      </tr>
                    )}
                    {emps.map((emp, index) => {
                      const empContract = contracts.find(c => c.employeeId === emp.id);
                      return (
                        <tr 
                          key={emp.id} 
                          className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'} hover:bg-slate-100/80 transition`}
                        >
                          <td className="p-3 font-mono font-bold text-slate-600">{emp.employeeCode}</td>
                          <td className="p-3 font-mono">
                            {emp.biometricId || emp.badgeId ? (
                              <span className="bg-purple-100 text-purple-900 border border-purple-200 px-2 py-0.5 rounded font-bold text-[11px] inline-flex items-center gap-1" title="معرف البصمة المطابق لملف جهاز البصمة">
                                🏷️ {emp.biometricId || emp.badgeId}
                              </span>
                            ) : (
                              <span className="text-slate-300 font-normal">—</span>
                            )}
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
                            {inlineEditingJobEmpId === emp.id ? (
                              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="text"
                                  value={inlineJobTitleText}
                                  onChange={(e) => setInlineJobTitleText(e.target.value)}
                                  className="border border-purple-500 rounded px-2 py-1 text-xs w-full bg-white outline-none font-semibold text-slate-800"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = { ...emp, jobTitle: inlineJobTitleText };
                                    onSaveEmployee(updated);
                                    setInlineEditingJobEmpId(null);
                                  }}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded text-[10px] font-bold shrink-0 shadow-xs transition"
                                >
                                  حفظ
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setInlineEditingJobEmpId(null)}
                                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2 py-1 rounded text-[10px] shrink-0 transition"
                                >
                                  إلغاء
                                </button>
                              </div>
                            ) : (
                              <div className="group/job flex items-center justify-between">
                                <div>
                                  <div className="font-semibold text-slate-800">{emp.jobTitle}</div>
                                  <div className="text-[11px] text-slate-500">{emp.department}</div>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setInlineEditingJobEmpId(emp.id);
                                    setInlineJobTitleText(emp.jobTitle || '');
                                  }}
                                  className="opacity-0 group-hover/job:opacity-100 p-1 text-[#714B67] hover:bg-purple-100/60 rounded transition"
                                  title="تعديل سريع للمسمى الوظيفي"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        emp.isKuwaiti ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {emp.isKuwaiti ? '🇰🇼 كويتي' : emp.residencyType}
                      </span>
                    </td>
                    <td className="p-3 font-mono">{emp.joinDate}</td>
                    <td className="p-3 font-mono font-bold text-emerald-700 dir-ltr">
                      {empContract ? formatKWD(empContract.basicSalary) : '---'}
                    </td>
                    <td className="p-3 text-center space-x-1 space-x-reverse">
                      {onOpenNotificationModal && (
                        <button
                          onClick={() => onOpenNotificationModal(emp, 'HR_ACTION_REQUIRED')}
                          className="p-1 text-emerald-600 hover:text-emerald-700 rounded hover:bg-emerald-50 transition"
                          title="إرسال إشعار للموظف"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenEditEmployee(emp)}
                        className="p-1 text-slate-600 hover:text-[#714B67] rounded hover:bg-slate-200 transition"
                        title="تعديل البطاقة"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setTransferTargetDeptId(departments.find(d => d.name === emp.department)?.id || departments[0]?.id || '');
                          setTransferReason('');
                          setTransferDate(new Date().toISOString().split('T')[0]);
                          setEditingEmp(emp);
                          setIsTransferModalOpen(true);
                        }}
                        className="p-1 text-purple-700 hover:bg-purple-100 rounded transition"
                        title="نقل الموظف بين الأقسام"
                      >
                        <ArrowLeftRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(emp.id, emp.fullNameAr, e)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                        title="حذف الموظف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              </React.Fragment>
            );
            })}
            </tbody>
          </table>
        </div>
      )}

      {/* FORM / EDIT MODAL (Odoo Form View Style with Split View) */}
      {editingEmp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className={`bg-white rounded-xl shadow-2xl w-full ${scannedFilePreviewUrl ? 'max-w-6xl' : 'max-w-4xl'} max-h-[90vh] overflow-y-auto border border-slate-200 animate-in fade-in zoom-in-95 flex flex-col`}>
            {/* Odoo Form Top Header */}
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 z-20">
              <div className="flex items-center space-x-3 space-x-reverse">
                <div className="w-10 h-10 bg-[#714B67] text-white rounded-lg flex items-center justify-center font-bold">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                    <span>{editingEmp.id ? `بطاقة موظف: ${editingEmp.fullNameAr}` : 'إضافة موظف جديد (Odoo HR)'}</span>
                    {scannedFilePreviewUrl && (
                      <span className="bg-purple-100 text-[#714B67] text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        <span>معاينة تفاعلية و OCR نشط</span>
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500">
                    الشركة: {activeCompany?.nameAr || ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {editingEmp.id && (
                  <>
                    {onOpenNotificationModal && (
                      <button
                        type="button"
                        onClick={() => onOpenNotificationModal(editingEmp as Employee, 'HR_ACTION_REQUIRED')}
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 text-xs font-bold px-3 py-2 rounded flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                        title="إرسال إشعار فوري للموظف عبر الواتساب أو SMS"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                        <span>إرسال إشعار مراجعة الإدارة</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setTransferTargetDeptId(departments.find(d => d.name === editingEmp.department)?.id || departments[0]?.id || '');
                        setTransferReason('');
                        setTransferDate(new Date().toISOString().split('T')[0]);
                        setIsTransferModalOpen(true);
                      }}
                      className="bg-purple-50 hover:bg-purple-100 text-[#714B67] border border-purple-200 text-xs font-bold px-3 py-2 rounded flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                      title="نقل الموظف بين الأقسام والكوادر"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                      <span>نقل الموظف</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleDelete(editingEmp.id!, editingEmp.fullNameAr || '', e)}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold px-3 py-2 rounded flex items-center gap-1 transition"
                      title="حذف بطاقة الموظف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف الموظف</span>
                    </button>
                  </>
                )}
                
                <button
                  type="button"
                  onClick={() => {
                    const html = `<div dir="rtl" style="font-family: 'Cairo', sans-serif;">
                      <h1 style="color: #714B67; text-align: center;">بطاقة الموظف / Employee Card</h1>
                      <hr />
                      <h2>${editingEmp.fullNameAr} - ${editingEmp.fullNameEn || ''}</h2>
                      <p><strong>الرقم المدني / Civil ID:</strong> ${editingEmp.civilId || ''}</p>
                      <p><strong>المسمى الوظيفي / Job Title:</strong> ${editingEmp.jobTitle || ''}</p>
                      <p><strong>الجنسية / Nationality:</strong> ${editingEmp.nationality || ''}</p>
                      <p><strong>تاريخ التعيين / Joining Date:</strong> ${editingEmp.joiningDate || ''}</p>
                      <p><strong>الراتب الأساسي / Basic Salary:</strong> ${editingEmp.basicSalary || ''} KWD</p>
                    </div>`;
                    printDocument(html, 'Employee_' + (editingEmp.fullNameAr || 'Card'));
                  }}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold px-3 py-2 rounded flex items-center gap-1 transition shadow-xs cursor-pointer"
                  title="طباعة بطاقة الموظف"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>طباعة (Print)</span>
                </button>
                <button
                  onClick={handleSave}

                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded shadow transition"
                >
                  حفظ البيانات
                </button>
                <button
                  onClick={() => {
                    setEditingEmp(null);
                    setScannedFilePreviewUrl(null);
                    setHighlightedFields({});
                  }}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold px-3 py-2 rounded transition"
                >
                  إلغاء
                </button>
              </div>
            </div>

            {/* Odoo Split View Body */}
            <div className={scannedFilePreviewUrl ? "grid grid-cols-1 lg:grid-cols-12 flex-1" : "grid grid-cols-1 flex-1"}>
              {/* Left Panel: Document Preview (Odoo Split View) */}
              {scannedFilePreviewUrl && (
                <div className="lg:col-span-5 bg-slate-900 p-4 border-l border-slate-700 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3 text-white text-xs">
                    <span className="font-bold flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-purple-400" />
                      <span>المستند المرفوع (معاينة البطاقة)</span>
                    </span>
                    <button
                      onClick={() => setScannedFilePreviewUrl(null)}
                      className="text-slate-400 hover:text-white bg-slate-800 px-2 py-1 rounded text-[11px]"
                    >
                      إغلاق المعاينة
                    </button>
                  </div>

                  <div className="flex-1 bg-slate-950 rounded-lg border border-slate-800 overflow-hidden flex items-center justify-center min-h-[400px] relative">
                    {scannedFilePreviewUrl.endsWith('.pdf') || scannedFilePreviewUrl.includes('pdf') ? (
                      <iframe
                        src={scannedFilePreviewUrl}
                        className="w-full h-full min-h-[450px]"
                        title="Document Preview"
                      />
                    ) : (
                      <img
                        src={scannedFilePreviewUrl}
                        alt="Scanned Document Preview"
                        className="max-h-[450px] object-contain rounded"
                      />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 text-center mt-2">
                    تمت مطابقة واستخراج كافة البيانات أعلاه بالذكاء الاصطناعي بدقة عالية.
                  </p>
                </div>
              )}

              {/* Right Panel: Form Fields */}
              <div className={scannedFilePreviewUrl ? "lg:col-span-7 flex flex-col" : "col-span-1 flex flex-col"}>

            {/* Odoo Smart Buttons (Top Bar on Employee Sheet) */}
            {editingEmp.id && (
              <div className="bg-slate-100/70 border-b border-slate-200 px-6 py-2 flex flex-wrap gap-2 text-xs">
                <button
                  onClick={() => {
                    setEditingEmp(null);
                    if (onNavigateToApp) onNavigateToApp('CONTRACTS');
                  }}
                  className="bg-white hover:bg-slate-50 border border-slate-200 rounded px-3 py-1.5 flex items-center gap-2 font-semibold text-slate-700 shadow-sm"
                >
                  <FileText className="w-3.5 h-3.5 text-teal-600" />
                  <span>عقود العمل ({contracts.filter(c => c.employeeId === editingEmp.id).length})</span>
                </button>

                <button
                  onClick={() => {
                    setEditingEmp(null);
                    if (onNavigateToApp) onNavigateToApp('LEAVES');
                  }}
                  className="bg-white hover:bg-slate-50 border border-slate-200 rounded px-3 py-1.5 flex items-center gap-2 font-semibold text-slate-700 shadow-sm"
                >
                  <Calendar className="w-3.5 h-3.5 text-amber-600" />
                  <span>الإجازات ({leaves.filter(l => l.employeeId === editingEmp.id).length})</span>
                </button>

                <button
                  onClick={() => {
                    setEditingEmp(null);
                    if (onNavigateToApp) onNavigateToApp('DOCUMENTS');
                  }}
                  className="bg-white hover:bg-slate-50 border border-slate-200 rounded px-3 py-1.5 flex items-center gap-2 font-semibold text-slate-700 shadow-sm"
                >
                  <Folder className="w-3.5 h-3.5 text-sky-600" />
                  <span>المستندات ({documents.filter(d => d.employeeId === editingEmp.id).length})</span>
                </button>

                <button
                  onClick={() => {
                    setEditingEmp(null);
                    if (onNavigateToApp) onNavigateToApp('EOS');
                  }}
                  className="bg-white hover:bg-slate-50 border border-slate-200 rounded px-3 py-1.5 flex items-center gap-2 font-semibold text-slate-700 shadow-sm"
                >
                  <Shield className="w-3.5 h-3.5 text-rose-600" />
                  <span>حساب مكافأة نهاية الخدمة</span>
                </button>
              </div>
            )}

            {/* Odoo Tabs */}
            <div className="border-b border-slate-200 px-6 bg-slate-50 flex space-x-6 space-x-reverse text-xs font-bold overflow-x-auto">
              <button
                onClick={() => setActiveTab('WORK')}
                className={`py-3 border-b-2 transition whitespace-nowrap ${
                  activeTab === 'WORK'
                    ? 'border-[#714B67] text-[#714B67]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                المعلومات الوظيفية (Work Info)
              </button>
              <button
                onClick={() => setActiveTab('PRIVATE')}
                className={`py-3 border-b-2 transition whitespace-nowrap ${
                  activeTab === 'PRIVATE'
                    ? 'border-[#714B67] text-[#714B67]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                البيانات الشخصية والهوية (Civil ID)
              </button>
              <button
                onClick={() => setActiveTab('HR_SETTINGS')}
                className={`py-3 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'HR_SETTINGS'
                    ? 'border-[#714B67] text-[#714B67]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>إعدادات البصمة والحضور (HR Settings)</span>
                {(editingEmp?.biometricId || editingEmp?.badgeId) && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('LEGAL')}
                className={`py-3 border-b-2 transition whitespace-nowrap ${
                  activeTab === 'LEGAL'
                    ? 'border-[#714B67] text-[#714B67]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                التراخيص الطبية والتأمينات
              </button>
              <button
                onClick={() => setActiveTab('BANK')}
                className={`py-3 border-b-2 transition whitespace-nowrap ${
                  activeTab === 'BANK'
                    ? 'border-[#714B67] text-[#714B67]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                الحساب البنكي والرواتب
              </button>
              <button
                onClick={() => setActiveTab('DOCUMENTS')}
                className={`py-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'DOCUMENTS'
                    ? 'border-[#714B67] text-[#714B67]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>المستندات والوثائق</span>
                {editingEmp?.id && (
                  <span className="bg-slate-200 text-slate-700 font-mono px-1.5 py-0.2 text-[10px] rounded-full">
                    {documents.filter(d => d.employeeId === editingEmp.id).length}
                  </span>
                )}
              </button>
            </div>

            {/* Form Fields Body */}
            <div className="p-6 space-y-4">
              {/* 🚀 قسم الماسح الضوئي التلقائي بأعلى النموذج */}
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-blue-900 text-sm">التعبئة السريعة عبر الماسح الضوئي (OCR)</h4>
                  <p className="text-xs text-blue-700">ارفع البطاقة المدنية أو جواز السفر (صورة أو PDF) ليتم قراءة وتعبئة كل البيانات تلقائياً.</p>
                </div>

                <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-all shadow text-xs">
                  {loadingScan ? <Loader2 className="animate-spin w-4 h-4" /> : <Camera className="w-4 h-4" />}
                  <span>{loadingScan ? 'جاري القراءة...' : 'مسح البطاقة'}</span>
                  <input 
                    type="file" 
                    accept="image/*,application/pdf,.pdf,.bdf" 
                    onChange={handleAutoScan} 
                    className="hidden" 
                    disabled={loadingScan}
                  />
                </label>
              </div>

              {activeTab === 'WORK' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">الاسم الكامل باللغة العربية *</label>
                    <input
                      type="text"
                      value={editingEmp.fullNameAr || ''}
                      onChange={(e) => setEditingEmp(prev => ({ ...prev, fullNameAr: e.target.value }))}
                      placeholder="مثال: عبدالله محمد علي الكندري"
                      className={`w-full border rounded p-2 focus:ring-2 focus:ring-[#714B67] outline-none ${getHighlightClass('fullNameAr')}`}
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">الاسم بالإنجليزية (Full English Name)</label>
                    <input
                      type="text"
                      value={editingEmp.fullNameEn || ''}
                      onChange={(e) => setEditingEmp(prev => ({ ...prev, fullNameEn: e.target.value }))}
                      placeholder="e.g. Abdullah Mohammad Al-Kandari"
                      className={`w-full border rounded p-2 focus:ring-2 focus:ring-[#714B67] outline-none dir-ltr ${getHighlightClass('fullNameEn')}`}
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">كود الموظف في النظام (System Employee Code)</label>
                    <input
                      type="text"
                      value={editingEmp.employeeCode || ''}
                      onChange={(e) => setEditingEmp(prev => ({ ...prev, employeeCode: e.target.value }))}
                      placeholder="مثال: EMP-001"
                      className="w-full border border-slate-300 rounded p-2 font-mono outline-none focus:ring-2 focus:ring-[#714B67]"
                    />
                  </div>

                  <div className="bg-purple-50/70 p-3 rounded-lg border border-purple-200">
                    <label className="block font-bold text-purple-950 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Fingerprint className="w-4 h-4 text-[#714B67]" />
                        <span>معرف جهاز البصمة / الشارة (Badge ID / Biometric ID)</span>
                      </span>
                      <span className="text-[10px] text-purple-700 bg-purple-200/70 px-1.5 py-0.5 rounded font-mono font-bold">Odoo Badge</span>
                    </label>
                    <input
                      type="text"
                      value={editingEmp.biometricId || editingEmp.badgeId || ''}
                      onChange={(e) => setEditingEmp(prev => ({ 
                        ...prev, 
                        biometricId: e.target.value, 
                        badgeId: e.target.value 
                      }))}
                      placeholder="مثال: 101 أو 9023 (رقم الموظف في ماكينة البصمة ZKTeco / Hikvision)"
                      className="w-full border border-purple-300 bg-white rounded p-2 font-mono font-bold text-[#714B67] outline-none focus:ring-2 focus:ring-[#714B67]"
                    />
                    <p className="text-[10px] text-purple-800 mt-1">
                      💡 <strong>مطابقة كشف البصمة:</strong> إذا كان كود الموظف داخل ماكينة البصمة يختلف عن كود النظام، اكتب رقم البصمة هنا للتعرف التلقائي الفوري عند رفع الملفات.
                    </p>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">حالة الموظف</label>
                    <select
                      value={editingEmp.status || 'ACTIVE'}
                      onChange={(e) => setEditingEmp(prev => ({ ...prev, status: e.target.value as any }))}
                      className="w-full border border-slate-300 rounded p-2 outline-none"
                    >
                      <option value="ACTIVE">نشط على رأس عمله</option>
                      <option value="ON_LEAVE">في إجازة رسمية</option>
                      <option value="RESIGNED">مستقيل</option>
                      <option value="TERMINATED">منتهي الخدمة</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">القسم / الإدارة</label>
                    <select
                      value={editingEmp.departmentId || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        const dept = departments.find(d => d.id === val);
                        setEditingEmp(prev => ({ 
                          ...prev, 
                          departmentId: val || undefined,
                          department: dept?.name || ''
                        }));
                      }}
                      className="w-full border border-slate-300 rounded p-2 outline-none bg-white font-medium"
                    >
                      <option value="">-- اختر القسم أو الإدارة --</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2 bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                        <Briefcase className="w-4 h-4 text-[#714B67]" />
                        <span>المسمى الوظيفي (ربط جدول job_titles)</span>
                        {editingEmp.jobTitleId && (
                          <span className="text-[10px] font-mono bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded mr-1">
                            FK: {editingEmp.jobTitleId}
                          </span>
                        )}
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsJobTitlesModalOpen(true)}
                        className="text-xs text-[#714B67] hover:underline flex items-center gap-1 font-bold"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>إدارة جدول المسميات</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <select
                          value={editingEmp.jobTitleId || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '__ADD_NEW__') {
                              setIsJobTitlesModalOpen(true);
                              setEditingJobTitleObj({ titleName: '', description: '' });
                            } else {
                              const found = jobTitles.find(j => j.id === val);
                              if (found) {
                                setEditingEmp(prev => ({
                                  ...prev,
                                  jobTitleId: found.id,
                                  jobTitle: found.titleName,
                                  departmentId: found.departmentId || prev?.departmentId || undefined, department: found.departmentName || prev?.department || ''
                                }));
                              } else {
                                setEditingEmp(prev => ({ ...prev, jobTitleId: undefined }));
                              }
                            }
                          }}
                          className="w-full border border-slate-300 rounded p-2 outline-none bg-white text-xs font-bold text-slate-800"
                        >
                          <option value="">-- اختر من جدول المسميات الوظيفية (job_titles) --</option>
                          {jobTitles.map(jt => (
                            <option key={jt.id} value={jt.id}>
                              {jt.titleName} {jt.departmentName ? `[${jt.departmentName}]` : ''}
                            </option>
                          ))}
                          <option value="__ADD_NEW__">+ إضافة مسمى وظيفي جديد للشجرة...</option>
                        </select>
                      </div>

                      <div>
                        <input
                          type="text"
                          value={editingEmp.jobTitle || ''}
                          onChange={(e) => setEditingEmp(prev => ({ ...prev, jobTitle: e.target.value }))}
                          placeholder="أو تخصيص المسمى الوظيفي نصياً..."
                          className="w-full border border-slate-300 rounded p-2 outline-none bg-white text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">تاريخ الالتحاق بالعمل (Join Date)</label>
                    <input
                      type="date"
                      value={editingEmp.joinDate || ''}
                      onChange={(e) => setEditingEmp(prev => ({ ...prev, joinDate: e.target.value }))}
                      className="w-full border border-slate-300 rounded p-2 outline-none"
                    />
                    {editingEmp.joinDate && (() => {
                      const accrual = calculateLeaveAccrual2026Details(editingEmp.joinDate);
                      return (
                        <div className="mt-1.5 p-2 bg-purple-50 border border-purple-200 rounded text-[11px] text-purple-900 flex items-center justify-between">
                          <span>
                            🗓️ بداية احتساب رصيد 2026: <strong>{accrual.startMonthName}</strong> ({accrual.totalMonthsIn2026} شهر = {accrual.annualTotal2026} يوم سنوي)
                          </span>
                          <span className="font-bold text-purple-700">2.5 يوم كل 28 بالشهر</span>
                        </div>
                      );
                    })()}
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">المدير المباشر (Parent / Manager)</label>
                    <select
                      value={editingEmp.parentId || ''}
                      onChange={(e) => setEditingEmp(prev => ({ ...prev, parentId: e.target.value }))}
                      className="w-full border border-slate-300 rounded p-2 outline-none bg-white text-xs font-bold text-slate-800"
                    >
                      <option value="">-- بدون مدير مباشر --</option>
                      {companyEmps.filter(e => e.id !== editingEmp.id).map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.fullNameAr} ({emp.jobTitle})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">الموجه (Coach)</label>
                    <select
                      value={editingEmp.coachId || ''}
                      onChange={(e) => setEditingEmp(prev => ({ ...prev, coachId: e.target.value }))}
                      className="w-full border border-slate-300 rounded p-2 outline-none bg-white text-xs font-bold text-slate-800"
                    >
                      <option value="">-- بدون موجه --</option>
                      {companyEmps.filter(e => e.id !== editingEmp.id).map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.fullNameAr} ({emp.jobTitle})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-amber-900 mb-1">
                      الرصيد الافتتاحي للإجازات (Opening Balance - أيام) *
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={editingEmp.openingLeaveBalance ?? editingEmp.carriedOverLeave2025 ?? 0}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setEditingEmp(prev => ({ 
                          ...prev, 
                          openingLeaveBalance: val,
                          carriedOverLeave2025: val 
                        }));
                      }}
                      placeholder="مثال: 15.0 يوم"
                      className="w-full border border-amber-300 rounded p-2 outline-none font-mono font-bold text-amber-900 bg-amber-50/50"
                    />
                    <p className="text-[10px] text-amber-800 mt-1 font-semibold">
                      الرصيد المستحق الحالي للموظف عند الانتقال للنظام
                    </p>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">البريد الإلكتروني</label>
                    <input
                      type="email"
                      value={editingEmp.email || ''}
                      onChange={(e) => setEditingEmp(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full border border-slate-300 rounded p-2 outline-none dir-ltr"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">رقم الهاتف الكويتي</label>
                    <input
                      type="text"
                      value={editingEmp.phone || ''}
                      onChange={(e) => setEditingEmp(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+965 99887766"
                      className="w-full border border-slate-300 rounded p-2 outline-none dir-ltr"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">ملاحظات إضافية</label>
                    <textarea
                      rows={2}
                      value={editingEmp.notes || ''}
                      onChange={(e) => setEditingEmp(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="أي ملاحظات أو تفاصيل إضافية..."
                      className="w-full border border-slate-300 rounded p-2 outline-none"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'PRIVATE' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      الرقم المدني الكويتي (Civil ID - 12 Digits MOD 11) *
                    </label>
                    <input
                      type="text"
                      maxLength={12}
                      value={editingEmp.civilId || ''}
                      onChange={(e) => handleCivilIdChange(e.target.value)}
                      placeholder="294081501234"
                      className={`w-full border rounded p-2 font-mono text-sm dir-ltr outline-none ${
                        civilIdError ? 'border-rose-500 bg-rose-50' : getHighlightClass('civilId')
                      }`}
                    />
                    {civilIdError ? (
                      <p className="text-[11px] text-rose-600 mt-1 font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {civilIdError}
                      </p>
                    ) : (
                      <p className="text-[10px] text-emerald-600 mt-1 font-semibold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        الخوارزمية مطابقة لمواصفات الهيئة العامة للمعلومات المدنية PACI
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">تاريخ انتهاء البطاقة المدنية</label>
                    <input
                      type="date"
                      value={editingEmp.civilIdExpiry || ''}
                      onChange={(e) => setEditingEmp(prev => ({ ...prev, civilIdExpiry: e.target.value }))}
                      className={`w-full border rounded p-2 outline-none ${getHighlightClass('civilIdExpiry')}`}
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">تاريخ الميلاد (DOB)</label>
                    <input
                      type="date"
                      value={editingEmp.dob || ''}
                      onChange={(e) => setEditingEmp(prev => ({ ...prev, dob: e.target.value }))}
                      className={`w-full border rounded p-2 outline-none ${getHighlightClass('dob')}`}
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">الجنس</label>
                    <select
                      value={editingEmp.gender || 'MALE'}
                      onChange={(e) => setEditingEmp(prev => ({ ...prev, gender: e.target.value as any }))}
                      className={`w-full border rounded p-2 outline-none ${getHighlightClass('gender')}`}
                    >
                      <option value="MALE">ذكر</option>
                      <option value="FEMALE">أنثى</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">الجنسية</label>
                    <input
                      type="text"
                      list="nationalities-list"
                      value={editingEmp.nationality || 'كويتي'}
                      onChange={(e) => {
                        const val = e.target.value;
                        const isKw = val.includes('كويت') || val.toLowerCase() === 'kuwaiti';
                        setEditingEmp(prev => ({ 
                          ...prev, 
                          nationality: val,
                          isKuwaiti: isKw,
                          residencyType: isKw ? 'كويتي' : 'مادة 18 - قطاع أهلي'
                        }));
                      }}
                      placeholder="اختر أو اكتب الجنسية بحرية..."
                      className={`w-full border rounded p-2 outline-none bg-white ${getHighlightClass('nationality')}`}
                    />
                    <datalist id="nationalities-list">
                      <option value="كويتي" />
                      <option value="مصري" />
                      <option value="أردني" />
                      <option value="لبناني" />
                      <option value="سوري" />
                      <option value="هندي" />
                      <option value="سعودي" />
                      <option value="إماراتي" />
                      <option value="باكستاني" />
                      <option value="فلبيني" />
                      <option value="بنغلاديشي" />
                      <option value="سريلانكي" />
                      <option value="بحريني" />
                      <option value="قطري" />
                      <option value="عماني" />
                      <option value="تونسي" />
                      <option value="مغربي" />
                      <option value="جزائري" />
                      <option value="سوداني" />
                      <option value="يمني" />
                      <option value="فلسطيني" />
                      <option value="أمريكي" />
                      <option value="بريطاني" />
                    </datalist>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">نوع الإقامة / المادة الشؤون</label>
                    <select
                      value={editingEmp.residencyType || 'كويتي'}
                      onChange={(e) => setEditingEmp(prev => ({ ...prev, residencyType: e.target.value as any }))}
                      className="w-full border border-slate-300 rounded p-2 outline-none"
                    >
                      <option value="كويتي">كويتي (مواطن)</option>
                      <option value="مادة 18 - قطاع أهلي">مادة 18 - عمل بالقطاع الأهلي</option>
                      <option value="مادة 19 - شريك/كفيل">مادة 19 - المستثمر / الشريك</option>
                      <option value="مادة 17 - حكومي">مادة 17 - حكومي</option>
                      <option value="خليجي">رعايا دول مجلس التعاون الخليجي</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">رقم جواز السفر</label>
                    <input
                      type="text"
                      value={editingEmp.passportNo || ''}
                      onChange={(e) => setEditingEmp(prev => ({ ...prev, passportNo: e.target.value }))}
                      className="w-full border border-slate-300 rounded p-2 outline-none font-mono dir-ltr"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">تاريخ انتهاء جواز السفر</label>
                    <input
                      type="date"
                      value={editingEmp.passportExpiry || ''}
                      onChange={(e) => setEditingEmp(prev => ({ ...prev, passportExpiry: e.target.value }))}
                      className="w-full border border-slate-300 rounded p-2 outline-none"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'LEGAL' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="md:col-span-2 bg-blue-50 border border-blue-200 rounded p-3">
                    <h4 className="font-bold text-blue-900 mb-1">الترخيص الطبي</h4>
                    <p className="text-[11px] text-blue-700">
                      في حال كان الموظف يتبع القطاع الطبي في مركز الخليج الصحي، يرجى تزويد رقم ترخيص وزارة الصحة
                    </p>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">رقم ترخيص وزارة الصحة (MOH License)</label>
                    <input
                      type="text"
                      value={editingEmp.mohLicenseNo || ''}
                      onChange={(e) => setEditingEmp(prev => ({ ...prev, mohLicenseNo: e.target.value }))}
                      placeholder="مثال: MOH-KW-2023-8841"
                      className="w-full border border-slate-300 rounded p-2 font-mono outline-none dir-ltr"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">تاريخ انتهاء ترخيص وزارة الصحة</label>
                    <input
                      type="date"
                      value={editingEmp.mohLicenseExpiry || ''}
                      onChange={(e) => setEditingEmp(prev => ({ ...prev, mohLicenseExpiry: e.target.value }))}
                      className="w-full border border-slate-300 rounded p-2 outline-none"
                    />
                  </div>

                </div>
              )}

              {activeTab === 'HR_SETTINGS' && (
                <div className="space-y-4 text-xs">
                  {/* قسم أجهزة البصمة والشارة - Odoo Attendance Settings */}
                  <div className="bg-purple-50/60 p-4 rounded-xl border border-purple-200 space-y-3">
                    <div className="flex items-center gap-2 text-[#714B67] font-bold text-sm">
                      <Fingerprint className="w-5 h-5 text-[#714B67]" />
                      <span>إعدادات البصمة وأجهزة تسجيل الحضور (Odoo Biometrics & Attendance)</span>
                    </div>
                    <p className="text-slate-600 text-xs">
                      حدد المعرفات المستخدمة لربط تسجيلات الموظف التلقائية القادمة من أجهزة الحضور وماكينات البصمة (ZKTeco, Hikvision, Anviz).
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div className="bg-white p-3 rounded-lg border border-purple-200 shadow-xs">
                        <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                          <Fingerprint className="w-4 h-4 text-[#714B67]" />
                          <span>معرف جهاز البصمة / كود الشارة (Badge ID / Biometric ID)</span>
                        </label>
                        <input
                          type="text"
                          value={editingEmp.biometricId || editingEmp.badgeId || ''}
                          onChange={(e) => setEditingEmp(prev => ({ 
                            ...prev, 
                            biometricId: e.target.value, 
                            badgeId: e.target.value 
                          }))}
                          placeholder="مثال: 101 أو 9023 أو AC-5001"
                          className="w-full border border-purple-300 rounded p-2.5 font-mono font-bold text-purple-950 outline-none focus:ring-2 focus:ring-[#714B67]"
                        />
                        <p className="text-[11px] text-purple-700 mt-1">
                          هذا الكود هو الرقم المسجل في ذاكرة ماكينة البصمة. عند رفع أي ملف كشف بصمة، يبحث النظام أولاً عن هذا الكود لمطابقة الحضور بدقة 100%.
                        </p>
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-purple-200 shadow-xs">
                        <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                          <Key className="w-4 h-4 text-amber-600" />
                          <span>رمز PIN للحضور (Attendance PIN Code)</span>
                        </label>
                        <input
                          type="password"
                          maxLength={6}
                          value={editingEmp.pinCode || ''}
                          onChange={(e) => setEditingEmp(prev => ({ ...prev, pinCode: e.target.value }))}
                          placeholder="مثال: 1234"
                          className="w-full border border-slate-300 rounded p-2.5 font-mono outline-none focus:ring-2 focus:ring-[#714B67]"
                        />
                        <p className="text-[11px] text-slate-500 mt-1">
                          رمز المرور السري الخاص بالموظف عند استخدام شاشة تسجيل الحضور الذاتية (Odoo Kiosk Mode).
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* إعدادات أرصدة الإجازات التراكمية */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                      <Calendar className="w-5 h-5 text-emerald-600" />
                      <span>أرصدة الإجازات التراكمية (Leave Accruals 2026)</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">الرصيد المرحل من نهاية 2025 (أيام)</label>
                        <input
                          type="number"
                          step="0.5"
                          value={editingEmp.carriedOverLeave2025 !== undefined ? editingEmp.carriedOverLeave2025 : ''}
                          onChange={(e) => setEditingEmp(prev => ({ 
                            ...prev, 
                            carriedOverLeave2025: e.target.value === '' ? undefined : parseFloat(e.target.value) 
                          }))}
                          placeholder="مثال: 15"
                          className="w-full border border-slate-300 rounded p-2 font-mono outline-none"
                        />
                        <p className="text-[11px] text-slate-500 mt-1">
                          رصيد الإجازة المتبقي والمسجل بنهاية عام 2025 قبل بدء محرك استحقاق 2026 (2.5 يوم/شهر يوم 28).
                        </p>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">الرصيد الافتتاحي للنظام (Opening Balance)</label>
                        <input
                          type="number"
                          step="0.5"
                          value={editingEmp.openingLeaveBalance !== undefined ? editingEmp.openingLeaveBalance : ''}
                          onChange={(e) => setEditingEmp(prev => ({ 
                            ...prev, 
                            openingLeaveBalance: e.target.value === '' ? undefined : parseFloat(e.target.value) 
                          }))}
                          placeholder="مثال: 30"
                          className="w-full border border-slate-300 rounded p-2 font-mono outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* جدول ساعات العمل المعتمد في أودو (resource_calendar_id) */}
                  <div className="bg-indigo-50/60 p-4 rounded-xl border border-indigo-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
                        <Calendar className="w-5 h-5 text-indigo-700" />
                        <span>جدول ساعات العمل ونظام الدوام (Working Schedule / Resource Calendar)</span>
                      </div>
                      <span className="text-[10px] text-indigo-700 font-mono bg-indigo-100 px-2 py-0.5 rounded font-bold">
                        resource_calendar_id
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">جدول العمل المرتبط (Working Calendar)</label>
                        <select
                          value={editingEmp.resourceCalendarId || 'cal-std-8h-6d'}
                          onChange={(e) => {
                            const val = e.target.value;
                            const schedName = val === 'cal-std-8h-6d' ? 'الدوام الصباحي القياسي 8 ساعات (08:00 - 16:00)' :
                                              val === 'cal-std-8h-5d' ? 'الدوام المكتبي 5 أيام 40 ساعة (الأحد - الخميس)' :
                                              val === 'cal-eve-8h-6d' ? 'الدوام المسائي 8 ساعات (16:00 - 00:00)' :
                                              val === 'cal-split-shifts' ? 'دوام الفترتين المقسم (09:00 - 13:00 / 17:00 - 21:00)' :
                                              val === 'cal-flexible-8h' ? 'الدوام المرن 8 ساعات' : 'دوام جزئي 4 ساعات';
                            setEditingEmp(prev => ({
                              ...prev,
                              resourceCalendarId: val,
                              workingSchedule: schedName,
                            }));
                          }}
                          className="w-full border border-indigo-300 rounded p-2 text-xs font-bold text-slate-800 bg-white outline-none"
                        >
                          <option value="cal-std-8h-6d">الدوام الصباحي القياسي 8 ساعات (08:00 - 16:00 | السبت - الخميس)</option>
                          <option value="cal-std-8h-5d">الدوام المكتبي 5 أيام 40 ساعة (08:00 - 16:00 | الأحد - الخميس)</option>
                          <option value="cal-eve-8h-6d">الدوام المسائي القياسي 8 ساعات (16:00 - 00:00 | السبت - الخميس)</option>
                          <option value="cal-split-shifts">دوام الفترتين المقسم (09:00 - 13:00 و 17:00 - 21:00)</option>
                          <option value="cal-flexible-8h">الدوام المرن الذكي 8 ساعات يومية</option>
                          <option value="cal-part-time-4h">الدوام الجزئي 4 ساعات يومية</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">نوع الدوام (Work Hours Type)</label>
                        <select
                          value={editingEmp.workHoursType || 'STANDARD'}
                          onChange={(e) => setEditingEmp(prev => ({ ...prev, workHoursType: e.target.value }))}
                          className="w-full border border-indigo-300 rounded p-2 text-xs font-bold text-slate-800 bg-white outline-none"
                        >
                          <option value="STANDARD">دوام كامل قياسي (Standard 8h)</option>
                          <option value="FLEXIBLE">دوام مرن (Flexible)</option>
                          <option value="PART_TIME">دوام جزئي (Part Time)</option>
                          <option value="SHIFT">مناوبات وشفتات (Shifts)</option>
                          <option value="CUSTOM">ساعات مخصصة (Custom)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'BANK' && (
                <div className="space-y-4 text-xs">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                      <CreditCard className="w-5 h-5 text-sky-600" />
                      <span>الحساب البنكي ونظام حماية الأجور (WPS & Bank Details)</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">اسم البنك (Bank Name)</label>
                        <select
                          value={editingEmp.bankName || ''}
                          onChange={(e) => setEditingEmp(prev => ({ ...prev, bankName: e.target.value }))}
                          className="w-full border border-slate-300 rounded p-2 outline-none bg-white font-medium"
                        >
                          <option value="">-- اختر البنك --</option>
                          <option value="NBK">بنك الكويت الوطني (NBK)</option>
                          <option value="KFH">بيت التمويل الكويتي (KFH)</option>
                          <option value="GULF">بنك الخليج (Gulf Bank)</option>
                          <option value="BOUBYAN">بنك بوبيان (Boubyan)</option>
                          <option value="BURGAN">بنك برقان (Burgan)</option>
                          <option value="WARBA">بنك وربة (Warba)</option>
                          <option value="CBK">البنك التجاري الكويتي (CBK)</option>
                          <option value="ABK">البنك الأهلي الكويتي (ABK)</option>
                          <option value="AUB">البنك الأهلي المتحد (AUB)</option>
                          <option value="OTHER">بنك آخر</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">رقم الآيبان (IBAN)</label>
                        <input
                          type="text"
                          value={editingEmp.iban || ''}
                          onChange={(e) => setEditingEmp(prev => ({ ...prev, iban: e.target.value.toUpperCase() }))}
                          placeholder="KW000000000000000000000000"
                          className="w-full border border-slate-300 rounded p-2 font-mono outline-none dir-ltr uppercase"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'DOCUMENTS' && (
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between bg-purple-50/70 p-3 rounded-lg border border-purple-200">
                    <div className="flex items-center gap-2 text-[#714B67] font-bold">
                      <Folder className="w-4 h-4" />
                      <span>المستندات والوثائق المربوطة بملف الموظف</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onCloseForm();
                        if (onNavigateToApp) onNavigateToApp('DOCUMENTS');
                      }}
                      className="px-3 py-1 bg-[#714B67] hover:bg-[#5a3a52] text-white font-bold rounded shadow text-[11px] flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>مسح ضوئي جديد OCR / إضافة مستند</span>
                    </button>
                  </div>

                  {documents.filter(d => d.employeeId === editingEmp.id).length === 0 ? (
                    <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl space-y-2">
                      <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-bold text-slate-600">لا توجد مستندات مسجلة أو ممسوحة لهذا الموظف حتى الآن</p>
                      <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                        يمكنك استخدام الماسح الضوئي OCR لمسح البطاقة المدنية أو جواز السفر، وستظهر المستندات تلقائياً هنا في ملف الموظف.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {documents.filter(d => d.employeeId === editingEmp.id).map(doc => (
                        <div key={doc.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs hover:border-purple-300 transition space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <div className="p-2 bg-purple-100 text-[#714B67] rounded-lg shrink-0">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="truncate">
                                <h5 className="font-bold text-slate-800 text-xs truncate">{doc.title}</h5>
                                <p className="text-[10px] text-slate-400 font-mono">رقم المستند: {doc.documentNumber || '—'}</p>
                              </div>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                              doc.status === 'EXPIRED' ? 'bg-rose-100 text-rose-800' :
                              doc.status === 'EXPIRING_SOON' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {doc.status === 'EXPIRED' ? 'منتهي' : doc.status === 'EXPIRING_SOON' ? 'ينتهي قريباً' : 'ساري'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-500 font-mono">
                            <span>ينتهي: {doc.expiryDate}</span>
                            {doc.fileUrl && (
                              <button
                                type="button"
                                onClick={() => {
                                  const win = window.open(doc.fileUrl, '_blank');
                                  if (!win) alert('يرجى السماح بالنوافذ المنبثقة لمعاينة المستند');
                                }}
                                className="text-[#714B67] font-bold hover:underline flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" />
                                <span>معاينة المستند ↗</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              </div>
            </div>

            {/* Sticky Bottom Actions Bar */}
            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between sticky bottom-0 z-20">
              <div className="text-xs text-slate-500 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>الحقول الأساسية: الاسم الكامل والرقم المدني الكويتي</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingEmp(null);
                    setScannedFilePreviewUrl(null);
                    setHighlightedFields({});
                  }}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold px-4 py-2 rounded-lg transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-6 py-2 rounded-lg shadow-md hover:shadow-lg transition cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ بيانات الموظف (Save)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}

      {/* CUSTOM DELETE CONFIRMATION MODAL WITH SOFT DELETE & INTEGRITY SAFEGUARD */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[80]">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in duration-150 dir-rtl text-right">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-100 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-800">أرشفة الموظف (Soft Delete)</h3>
                <p className="text-xs text-slate-500">لن يتم مسح البيانات نهائياً، بل نقلها لأرشيف المحذوفات مع إمكانية الاستعادة</p>
              </div>
            </div>
            
            <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-700">
              <p>الموظف المراد أرشفته: <strong className="text-slate-900 font-bold">{deleteConfirmTarget.name}</strong></p>
              
              <div>
                <label className="block font-bold text-slate-700 mb-1">سبب الأرشفة / الحذف:</label>
                <select
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800"
                >
                  <option value="استقالة">استقالة نهائية</option>
                  <option value="انتهاء عقد">انتهاء عقد عمل</option>
                  <option value="إنهاء خدمات">إنهاء خدمات</option>
                  <option value="نقل لفرع آخر">نقل لفرع آخر أو شركة شقيقة</option>
                  <option value="أخرى">أخرى</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">للتأكيد، اكتب كلمة <span className="text-rose-600 font-mono">حذف</span>:</label>
                <input
                  type="text"
                  placeholder="اكتب حذف هنا..."
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-mono text-slate-800"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmTarget(null);
                  setDeleteConfirmText('');
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={deleteConfirmText.trim() !== 'حذف'}
                onClick={() => {
                  const targetId = deleteConfirmTarget.id;
                  if (onSoftDeleteEmployee) {
                    onSoftDeleteEmployee(targetId, deleteReason);
                  } else {
                    onDeleteEmployee(targetId);
                  }
                  if (editingEmp?.id === targetId) {
                    setEditingEmp(null);
                  }
                  if (onCloseForm) {
                    onCloseForm();
                  }
                  setDeleteConfirmTarget(null);
                  setDeleteConfirmText('');
                }}
                className={`px-4 py-2 text-xs font-bold rounded-lg shadow transition flex items-center gap-1.5 ${
                  deleteConfirmText.trim() === 'حذف'
                    ? 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>تأكيد الأرشفة (Soft Delete)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SOFT DELETED ARCHIVE MODAL */}
      {showSoftDeletedModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[90]">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150 dir-rtl text-right">
            <div className="p-4 bg-slate-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base">أرشيف المحذوفات المؤقتة (Soft Delete Archive)</h3>
              </div>
              <button
                onClick={() => setShowSoftDeletedModal(false)}
                className="p-1 hover:bg-slate-700 rounded-lg text-slate-300 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-amber-50 border-b border-amber-200 text-xs text-amber-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
              <span>البيانات في هذا الأرشيف محفوظة بنسبة 100% في قاعدة البيانات، ويمكن استعادتها بضغطة زر واحدة دون أي فقدان للبيانات.</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {softDeletedEmps.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <User className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">لا توجد أي سجلات مؤرشفة حالياً في هذا الفرع.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {softDeletedEmps.map(emp => (
                    <div key={emp.id} className="p-3.5 flex items-center justify-between bg-white hover:bg-slate-50/80 transition">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-800">{emp.fullNameAr}</span>
                          <span className="text-[11px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{emp.employeeCode}</span>
                          <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded font-bold">مؤرشف</span>
                        </div>
                        <p className="text-xs text-slate-500">
                          الرقم المدني: <span className="font-mono">{emp.civilId}</span> | الوظيفة: {emp.jobTitle}
                        </p>
                        {emp.deletedAt && (
                          <p className="text-[10px] text-slate-400 font-mono">
                            تاريخ الأرشفة: {new Date(emp.deletedAt).toLocaleString('ar-KW')}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (onRestoreEmployee) {
                            onRestoreEmployee(emp.id);
                          }
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>استعادة للعمل</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSoftDeletedModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* JOB TITLES DIRECTORY MODAL */}
      {isJobTitlesModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#714B67]">
                <Briefcase className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-800">جدول المسميات الوظيفية (job_titles)</h3>
                <span className="text-xs font-mono bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-bold">
                  {jobTitles.length} مسمى
                </span>
              </div>
              <button
                onClick={() => {
                  setIsJobTitlesModalOpen(false);
                  setEditingJobTitleObj(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Form to Create/Edit Job Title */}
              <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-4 space-y-3">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                  <Plus className="w-4 h-4 text-[#714B67]" />
                  <span>{editingJobTitleObj?.id ? 'تعديل المسمى الوظيفي' : 'إضافة مسمى وظيفي جديد إلى الجدول'}</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">اسم المسمى الوظيفي (title_name) *</label>
                    <input
                      type="text"
                      value={editingJobTitleObj?.titleName || ''}
                      onChange={(e) => setEditingJobTitleObj(prev => ({ ...(prev || {}), titleName: e.target.value }))}
                      placeholder="مثلاً: محاسب أول / Senior Accountant"
                      className="w-full border border-slate-300 rounded p-2 bg-white outline-none focus:ring-2 focus:ring-[#714B67]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">القسم التابع له (department)</label>
                    <select
                      value={editingJobTitleObj?.departmentId || ''}
                      onChange={(e) => {
                        const deptId = e.target.value;
                        const dept = departments.find(d => d.id === deptId);
                        setEditingJobTitleObj(prev => ({
                          ...(prev || {}),
                          departmentId: deptId || undefined,
                          departmentName: dept?.name || ''
                        }));
                      }}
                      className="w-full border border-slate-300 rounded p-2 bg-white outline-none"
                    >
                      <option value="">-- اختر القسم --</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">الوصف والمهام الوظيفية (description)</label>
                    <input
                      type="text"
                      value={editingJobTitleObj?.description || ''}
                      onChange={(e) => setEditingJobTitleObj(prev => ({ ...(prev || {}), description: e.target.value }))}
                      placeholder="وصف مختصر لمسؤوليات هذا المسمى..."
                      className="w-full border border-slate-300 rounded p-2 bg-white outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  {editingJobTitleObj && (
                    <button
                      type="button"
                      onClick={() => setEditingJobTitleObj(null)}
                      className="px-3 py-1.5 font-bold text-slate-600 hover:bg-slate-200 rounded transition text-xs"
                    >
                      إلغاء التعديل
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (!editingJobTitleObj?.titleName?.trim()) {
                        alert('يرجى إدخال اسم المسمى الوظيفي');
                        return;
                      }
                      const titleToSave: JobTitle = {
                        id: editingJobTitleObj.id || `jt-${Date.now()}`,
                        titleName: editingJobTitleObj.titleName.trim(),
                        departmentId: editingJobTitleObj.departmentId || undefined,
                        departmentName: editingJobTitleObj.departmentName || undefined,
                        description: editingJobTitleObj.description || undefined,
                        createdAt: editingJobTitleObj.createdAt || new Date().toISOString(),
                      };
                      if (onSaveJobTitle) {
                        onSaveJobTitle(titleToSave);
                      }
                      setEditingJobTitleObj(null);
                    }}
                    className="px-4 py-1.5 font-bold bg-[#714B67] hover:bg-[#5a3a52] text-white rounded shadow transition flex items-center gap-1 text-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>حفظ المسمى الوظيفي</span>
                  </button>
                </div>
              </div>

              {/* Filter / Search Job Titles Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-xs">قائمة المسميات المسجلة في النظام</h4>
                  <div className="relative w-64">
                    <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={jobTitleSearch}
                      onChange={(e) => setJobTitleSearch(e.target.value)}
                      placeholder="بحث في المسميات الوظيفية..."
                      className="w-full pr-8 pl-3 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-[#714B67]"
                    />
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <th className="p-2.5">المسمى الوظيفي (title_name)</th>
                        <th className="p-2.5">القسم التابع له</th>
                        <th className="p-2.5">الوصف</th>
                        <th className="p-2.5 font-mono text-[11px]">UUID / ID</th>
                        <th className="p-2.5 text-center">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {jobTitles
                        .filter(j => j.titleName.toLowerCase().includes(jobTitleSearch.toLowerCase()) || (j.departmentName && j.departmentName.includes(jobTitleSearch)))
                        .map((jt, idx) => (
                          <tr key={jt.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50 hover:bg-purple-50/30'}>
                            <td className="p-2.5 font-bold text-slate-800">{jt.titleName}</td>
                            <td className="p-2.5 text-slate-600">{jt.departmentName || '—'}</td>
                            <td className="p-2.5 text-slate-500 max-w-xs truncate">{jt.description || '—'}</td>
                            <td className="p-2.5 font-mono text-[10px] text-slate-400">{jt.id}</td>
                            <td className="p-2.5 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => setEditingJobTitleObj(jt)}
                                  className="p-1 text-slate-600 hover:text-[#714B67] hover:bg-slate-200 rounded transition"
                                  title="تعديل"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                {onDeleteJobTitle && (
                                  <button
                                    onClick={() => {
                                      if (confirm(`هل أنت تأكد من حذف المسمى الوظيفي "${jt.titleName}"؟`)) {
                                        onDeleteJobTitle(jt.id);
                                      }
                                    }}
                                    className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition"
                                    title="حذف"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setIsJobTitlesModalOpen(false)}
                className="px-4 py-1.5 text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-800 rounded transition"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EMPLOYEE TRANSFER MODAL */}
      {isTransferModalOpen && editingEmp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#714B67]">
                <ArrowLeftRight className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-800">نقل الموظف بين الأقسام والكوادر (Odoo HR Transfer)</h3>
              </div>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="bg-purple-50 p-3 rounded-xl border border-purple-200 space-y-1">
                <p className="font-bold text-purple-900">الموظف المراد نقله: {editingEmp.fullNameAr}</p>
                <p className="text-slate-600">القسم الحالي: <span className="font-bold text-slate-800">{editingEmp.department || 'غير محدد'}</span></p>
                <p className="text-slate-600">التصنيف الحالي: <span className="font-bold text-slate-800">{editingEmp.mohLicenseNo ? 'الكادر الطبي والصحي' : 'الكادر الإداري'}</span></p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">القسم أو الكادر المستهدف *</label>
                <select
                  value={transferTargetDeptId || ''}
                  onChange={(e) => setTransferTargetDeptId(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2.5 bg-white outline-none font-medium focus:ring-2 focus:ring-[#714B67]"
                >
                  <option value="">-- اختر القسم المستهدف --</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">تاريخ النقل الفعال *</label>
                <input
                  type="date"
                  value={transferDate}
                  onChange={(e) => setTransferDate(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2.5 bg-white outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">سبب النقل / ملاحظات إدارية</label>
                <textarea
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder="أدخل سبب النقل (مثال: إعادة هيكلة الأقسام، طلب من الإدارة الطبية، بناءً على رغبة الموظف...)"
                  rows={3}
                  className="w-full border border-slate-300 rounded p-2.5 bg-white outline-none resize-none"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                className="px-4 py-2 text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!transferTargetDeptId) {
                    alert('يرجى اختيار القسم المستهدف للنقل');
                    return;
                  }
                  const targetDept = departments.find(d => d.id === transferTargetDeptId);
                  if (!targetDept) return;

                  const isTargetMedical = targetDept.code === 'DERM' || targetDept.name.includes('طب') || targetDept.name.includes('جلدية');

                  setEditingEmp(prev => ({
                    ...(prev || {}),
                    department: targetDept.name,
                    departmentId: targetDept.id,
                    mohLicenseNo: isTargetMedical ? (prev?.mohLicenseNo || `MOH-KW-${Math.floor(10000 + Math.random() * 90000)}`) : undefined,
                    mohLicenseExpiry: isTargetMedical ? (prev?.mohLicenseExpiry || '2029-12-31') : undefined,
                    jobTitleId: undefined, jobTitle: isTargetMedical ? 'طبيب' : 'موظف إداري',
                    notes: prev?.notes ? `${prev.notes}\n[نقل بتاريخ ${transferDate} إلى ${targetDept.name}: ${transferReason}]` : `[نقل بتاريخ ${transferDate} إلى ${targetDept.name}: ${transferReason}]`
                  }));

                  setIsTransferModalOpen(false);
                  alert(`تم نقل الموظف بنجاح إلى "${targetDept.name}" وتحديث السجلات والترخيص.`);
                }}
                className="px-5 py-2 text-xs font-bold bg-[#714B67] hover:bg-[#5a3a52] text-white rounded-lg shadow transition flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeftRight className="w-4 h-4" />
                <span>تأكيد واعتماد النقل</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HARD PURGE ALL DEMO DATA MODAL */}
      {showPurgeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[95]">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in duration-150 dir-rtl text-right">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-xl">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-800">تفريغ قائمة الموظفين نهائياً</h3>
                <p className="text-xs text-slate-500">حذف كافة الموظفين الحاليين والتجريبيين لبدء العمل بنظام نظيف تماماً</p>
              </div>
            </div>
            
            <div className="space-y-3 bg-rose-50/60 p-4 rounded-xl border border-rose-200 text-xs text-slate-700">
              <p className="font-bold text-rose-800">تنبيه حاسم:</p>
              <p>سيتم حذف جميع الموظفين المسجلين في هذه الشركة ({employees.length} موظف) نهائياً من قاعدة البيانات السحابية.</p>
              
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  للتأكيد، يرجى كتابة كلمة <span className="text-rose-600 font-mono font-bold">تنظيف</span>:
                </label>
                <input
                  type="text"
                  placeholder="اكتب تنظيف هنا..."
                  value={purgeConfirmText}
                  onChange={(e) => setPurgeConfirmText(e.target.value)}
                  className="w-full bg-white border border-rose-300 rounded-lg p-2 text-xs font-mono text-slate-800 outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowPurgeModal(false);
                  setPurgeConfirmText('');
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={purgeConfirmText.trim() !== 'تنظيف'}
                onClick={() => {
                  if (onHardDeleteAllEmployees) {
                    onHardDeleteAllEmployees();
                  }
                  setShowPurgeModal(false);
                  setPurgeConfirmText('');
                }}
                className={`px-4 py-2 text-xs font-bold rounded-lg shadow transition flex items-center gap-1.5 ${
                  purgeConfirmText.trim() === 'تنظيف'
                    ? 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>تأكيد الحذف والتفريغ الكامل</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
