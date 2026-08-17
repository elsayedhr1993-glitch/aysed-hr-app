import { printDocument } from '../utils/printUtils';
import React, { useState } from 'react';
import { 
  Employee, Company, ViewMode, CustodyItem, LoanAdvance, DisciplinaryWarning, EmployeeNote 
} from '../types';
import { formatKWD } from '../utils/kuwaitLaw';
import { 
  Briefcase, DollarSign, AlertTriangle, FileText, Plus, Search, Filter, 
  Trash2, Edit2, CheckCircle2, Clock, X, ShieldAlert, Award, ChevronRight, 
  Printer, ArrowRightLeft, Building2, UserCheck, Calendar, Layers
} from 'lucide-react';

interface CustodyLoansAppProps {
  employees: Employee[];
  custodies: CustodyItem[];
  loans: LoanAdvance[];
  warnings: DisciplinaryWarning[];
  employeeNotes: EmployeeNote[];
  activeCompany: Company;
  viewMode: ViewMode;
  searchTerm: string;
  filterTab: string;
  onSaveCustody: (item: CustodyItem) => void;
  onDeleteCustody: (id: string) => void;
  onSaveLoan: (loan: LoanAdvance) => void;
  onDeleteLoan: (id: string) => void;
  onSaveWarning: (warning: DisciplinaryWarning) => void;
  onDeleteWarning: (id: string) => void;
  onSaveNote: (note: EmployeeNote) => void;
  onDeleteNote: (id: string) => void;
  onNavigateToApp: (app: any) => void;
}

export const CustodyLoansApp: React.FC<CustodyLoansAppProps> = ({
  employees,
  custodies,
  loans,
  warnings,
  employeeNotes,
  activeCompany,
  viewMode,
  searchTerm,
  filterTab,
  onSaveCustody,
  onDeleteCustody,
  onSaveLoan,
  onDeleteLoan,
  onSaveWarning,
  onDeleteWarning,
  onSaveNote,
  onDeleteNote,
}) => {
  // Main Module Tab State
  const [activeTab, setActiveTab] = useState<'CUSTODY' | 'LOANS' | 'WARNINGS' | 'NOTES'>('CUSTODY');

  // Modal States for Add / Edit
  const [isCustodyModalOpen, setIsCustodyModalOpen] = useState(false);
  const [editingCustody, setEditingCustody] = useState<Partial<CustodyItem> | null>(null);

  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Partial<LoanAdvance> | null>(null);

  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [editingWarning, setEditingWarning] = useState<Partial<DisciplinaryWarning> | null>(null);

  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Partial<EmployeeNote> | null>(null);

  // Printable Modal State
  const [printableRecord, setPrintableRecord] = useState<{ type: 'CUSTODY' | 'WARNING' | 'LOAN'; data: any } | null>(null);

  // Delete Confirmation State
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{ type: 'CUSTODY' | 'LOAN' | 'WARNING' | 'NOTE'; id: string; label: string } | null>(null);

  // Filtered Lists
  const companyEmployees = (employees || []).filter(e => e.companyId === (activeCompany?.id || 'comp-1') || !e.companyId);

  const filteredCustodies = custodies.filter(c => {
    const emp = employees.find(e => e.id === c.employeeId);
    const matchesSearch = c.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp && emp.fullNameAr.includes(searchTerm));
    
    if (filterTab === 'ASSIGNED') return matchesSearch && c.status === 'ASSIGNED';
    if (filterTab === 'RETURNED') return matchesSearch && c.status === 'RETURNED';
    if (filterTab === 'DAMAGED') return matchesSearch && c.status === 'DAMAGED';
    return matchesSearch;
  });

  const filteredLoans = loans.filter(l => {
    const emp = employees.find(e => e.id === l.employeeId);
    const matchesSearch = (emp && emp.fullNameAr.includes(searchTerm)) || l.reason.includes(searchTerm);

    if (filterTab === 'IN_REPAYMENT') return matchesSearch && l.status === 'IN_REPAYMENT';
    if (filterTab === 'COMPLETED') return matchesSearch && l.status === 'COMPLETED';
    return matchesSearch;
  });

  const filteredWarnings = warnings.filter(w => {
    const emp = employees.find(e => e.id === w.employeeId);
    const matchesSearch = (emp && emp.fullNameAr.includes(searchTerm)) || w.subject.includes(searchTerm) || w.warningCode.includes(searchTerm);

    if (filterTab === 'ISSUED') return matchesSearch && (w.status === 'ISSUED' || w.status === 'ACKNOWLEDGED');
    return matchesSearch;
  });

  const filteredNotes = employeeNotes.filter(n => {
    const emp = employees.find(e => e.id === n.employeeId);
    return (emp && emp.fullNameAr.includes(searchTerm)) || n.title.includes(searchTerm) || n.content.includes(searchTerm);
  });

  // KPI Calculations
  const totalCustodyValue = custodies.reduce((sum, c) => sum + (c.valueKwd || 0), 0);
  const activeCustodiesCount = custodies.filter(c => c.status === 'ASSIGNED').length;
  const totalRemainingLoans = loans.reduce((sum, l) => sum + (l.remainingAmount || 0), 0);
  const activeLoansCount = loans.filter(l => l.status === 'IN_REPAYMENT' || l.status === 'APPROVED').length;
  const totalWarningsCount = warnings.length;
  const totalNotesCount = employeeNotes.length;

  // Handlers for Custodies
  const handleOpenNewCustody = () => {
    setEditingCustody({
      companyId: activeCompany?.id || 'comp-1',
      itemCode: `CST-${Math.floor(1000 + Math.random() * 9000)}`,
      itemCategory: 'ELECTRONICS',
      handoverDate: new Date().toISOString().split('T')[0],
      valueKwd: 150.000,
      condition: 'EXCELLENT',
      status: 'ASSIGNED'
    });
    setIsCustodyModalOpen(true);
  };

  const handleSaveCustodySubmit = () => {
    if (!editingCustody?.employeeId || !editingCustody?.itemName?.trim()) {
      alert('يرجى اختيار الموظف وإدخال اسم العهدة');
      return;
    }
    const itemToSave: CustodyItem = {
      id: editingCustody.id || `cst-${Date.now()}`,
      companyId: activeCompany?.id || 'comp-1',
      employeeId: editingCustody.employeeId,
      itemCode: editingCustody.itemCode || `CST-${Date.now().toString().slice(-4)}`,
      itemName: editingCustody.itemName.trim(),
      itemCategory: editingCustody.itemCategory || 'ELECTRONICS',
      serialNumber: editingCustody.serialNumber,
      handoverDate: editingCustody.handoverDate || new Date().toISOString().split('T')[0],
      expiryDate: editingCustody.expiryDate,
      returnDate: editingCustody.returnDate,
      valueKwd: Number(editingCustody.valueKwd) || 0,
      condition: editingCustody.condition || 'EXCELLENT',
      status: editingCustody.status || 'ASSIGNED',
      notes: editingCustody.notes,
    };
    onSaveCustody(itemToSave);
    setIsCustodyModalOpen(false);
    setEditingCustody(null);
  };

  // Handlers for Loans
  const handleOpenNewLoan = () => {
    setEditingLoan({
      companyId: activeCompany?.id || 'comp-1',
      amount: 500.000,
      monthlyDeduction: 50.000,
      startDate: new Date().toISOString().split('T')[0],
      totalInstallments: 10,
      paidInstallments: 0,
      remainingAmount: 500.000,
      status: 'IN_REPAYMENT',
      paymentMethod: 'SALARY_DEDUCTION',
      reason: 'سلفة طارئة على الراتب'
    });
    setIsLoanModalOpen(true);
  };

  const handleSaveLoanSubmit = () => {
    if (!editingLoan?.employeeId || !editingLoan?.amount) {
      alert('يرجى اختيار الموظف وتحديد مبلغ السلفة');
      return;
    }
    const amt = Number(editingLoan.amount) || 0;
    const monthly = Number(editingLoan.monthlyDeduction) || (amt / 10);
    const paid = Number(editingLoan.paidInstallments) || 0;
    const installments = Number(editingLoan.totalInstallments) || Math.ceil(amt / (monthly || 1));
    const paidAmt = paid * monthly;
    const remaining = Math.max(0, amt - paidAmt);

    const loanToSave: LoanAdvance = {
      id: editingLoan.id || `loan-${Date.now()}`,
      companyId: activeCompany?.id || 'comp-1',
      employeeId: editingLoan.employeeId,
      amount: amt,
      monthlyDeduction: monthly,
      startDate: editingLoan.startDate || new Date().toISOString().split('T')[0],
      totalInstallments: installments,
      paidInstallments: paid,
      remainingAmount: remaining,
      reason: editingLoan.reason || 'سلفة شخصية',
      status: remaining <= 0 ? 'COMPLETED' : (editingLoan.status || 'IN_REPAYMENT'),
      paymentMethod: editingLoan.paymentMethod || 'SALARY_DEDUCTION',
      approvedBy: editingLoan.approvedBy || 'إدارة الموارد البشرية',
      notes: editingLoan.notes,
    };
    onSaveLoan(loanToSave);
    setIsLoanModalOpen(false);
    setEditingLoan(null);
  };

  // Handlers for Warnings
  const handleOpenNewWarning = () => {
    setEditingWarning({
      companyId: activeCompany?.id || 'comp-1',
      warningCode: `WRN-${Math.floor(1000 + Math.random() * 9000)}`,
      warningType: 'FIRST_WARNING',
      violationDate: new Date().toISOString().split('T')[0],
      issueDate: new Date().toISOString().split('T')[0],
      deductionDays: 0,
      legalArticleNote: 'المادة 28 من قانون العمل الكويتي رقم 6 لسنة 2010',
      status: 'ISSUED',
      subject: 'تأخير متكرر وعدم الالتزام بساعات العمل الرسمية',
      violationDetails: 'تم رصد تأخير الموظف عن مواعيد البصمة الرسمية لأكثر من 3 مرات خلال هذا الشهر دون عذر مقبول.'
    });
    setIsWarningModalOpen(true);
  };

  const handleSaveWarningSubmit = () => {
    if (!editingWarning?.employeeId || !editingWarning?.subject?.trim()) {
      alert('يرجى اختيار الموظف وإدخال موضوع الإنذار الجزائي');
      return;
    }
    const warningToSave: DisciplinaryWarning = {
      id: editingWarning.id || `wrn-${Date.now()}`,
      companyId: activeCompany?.id || 'comp-1',
      employeeId: editingWarning.employeeId,
      warningCode: editingWarning.warningCode || `WRN-${Date.now().toString().slice(-4)}`,
      warningType: editingWarning.warningType || 'FIRST_WARNING',
      violationDate: editingWarning.violationDate || new Date().toISOString().split('T')[0],
      issueDate: editingWarning.issueDate || new Date().toISOString().split('T')[0],
      subject: editingWarning.subject.trim(),
      violationDetails: editingWarning.violationDetails || '',
      legalArticleNote: editingWarning.legalArticleNote || 'قانون العمل الكويتي رقم 6 لسنة 2010',
      deductionDays: Number(editingWarning.deductionDays) || 0,
      status: editingWarning.status || 'ISSUED',
    };
    onSaveWarning(warningToSave);
    setIsWarningModalOpen(false);
    setEditingWarning(null);
  };

  // Handlers for Notes
  const handleOpenNewNote = () => {
    setEditingNote({
      companyId: activeCompany?.id || 'comp-1',
      authorName: 'مسؤول HR الإداري',
      date: new Date().toISOString().split('T')[0],
      category: 'EVALUATION',
      priority: 'NORMAL',
      title: 'ملاحظة تقييم أداء وتطوير',
      content: '',
      isConfidential: false,
    });
    setIsNoteModalOpen(true);
  };

  const handleSaveNoteSubmit = () => {
    if (!editingNote?.employeeId || !editingNote?.title?.trim() || !editingNote?.content?.trim()) {
      alert('يرجى اختيار الموظف وإدخال عنوان وتفاصيل الملاحظة');
      return;
    }
    const noteToSave: EmployeeNote = {
      id: editingNote.id || `note-${Date.now()}`,
      companyId: activeCompany?.id || 'comp-1',
      employeeId: editingNote.employeeId,
      authorName: editingNote.authorName || 'إدارة شؤون الموظفين',
      date: editingNote.date || new Date().toISOString().split('T')[0],
      category: editingNote.category || 'EVALUATION',
      priority: editingNote.priority || 'NORMAL',
      title: editingNote.title.trim(),
      content: editingNote.content.trim(),
      isConfidential: !!editingNote.isConfidential,
    };
    onSaveNote(noteToSave);
    setIsNoteModalOpen(false);
    setEditingNote(null);
  };

  return (
    <div className="flex-1 bg-transparent flex flex-col h-full overflow-y-auto dir-rtl text-slate-800 font-['Cairo']">
      {/* ODOO APP HEADER ACTION BANNER */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shadow-xs sticky top-0 z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#714B67] text-white rounded-xl shadow-xs">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                تطبيق العهد والسلف والإنذارات والملاحظات
              </h1>
              <p className="text-xs text-slate-500">
                إدارة العهد العينية، السلف المالية، المخالفات الجزائية، والملاحظات الإدارية للموظفين
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {activeTab === 'CUSTODY' && (
            <button
              onClick={handleOpenNewCustody}
              className="bg-[#714B67] hover:bg-[#5a3a52] text-white text-xs font-bold px-4 py-2 rounded shadow transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>تسليم عهدة جديدة</span>
            </button>
          )}

          {activeTab === 'LOANS' && (
            <button
              onClick={handleOpenNewLoan}
              className="bg-[#714B67] hover:bg-[#5a3a52] text-white text-xs font-bold px-4 py-2 rounded shadow transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>طلب سلفة جديدة</span>
            </button>
          )}

          {activeTab === 'WARNINGS' && (
            <button
              onClick={handleOpenNewWarning}
              className="bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold px-4 py-2 rounded shadow transition flex items-center gap-1.5"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>إصدار إنذار جزائي</span>
            </button>
          )}

          {activeTab === 'NOTES' && (
            <button
              onClick={handleOpenNewNote}
              className="bg-[#714B67] hover:bg-[#5a3a52] text-white text-xs font-bold px-4 py-2 rounded shadow transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة ملاحظة إدارية</span>
            </button>
          )}
        </div>
      </div>

      {/* MODULE MAIN TABS & KPI CARDS */}
      <div className="p-6 space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500 font-bold mb-1">العهد العينية النشطة</div>
              <div className="text-xl font-extrabold text-slate-800">{activeCustodiesCount} عهدة</div>
              <div className="text-[11px] text-emerald-600 font-bold mt-1">
                إجمالي القيمة: {formatKWD(totalCustodyValue)}
              </div>
            </div>
            <div className="p-3 bg-purple-50 text-[#714B67] rounded-xl">
              <Briefcase className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500 font-bold mb-1">السلف المالية القائمة</div>
              <div className="text-xl font-extrabold text-slate-800">{activeLoansCount} سلفة</div>
              <div className="text-[11px] text-amber-600 font-bold mt-1">
                المتبقي: {formatKWD(totalRemainingLoans)}
              </div>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500 font-bold mb-1">الإنذارات الجزائية الصادرة</div>
              <div className="text-xl font-extrabold text-slate-800">{totalWarningsCount} إنذار</div>
              <div className="text-[11px] text-rose-600 font-bold mt-1">
                طبقاً لقانون العمل الكويتي
              </div>
            </div>
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500 font-bold mb-1">سجل الملاحظات والتقييمات</div>
              <div className="text-xl font-extrabold text-slate-800">{totalNotesCount} ملاحظة</div>
              <div className="text-[11px] text-indigo-600 font-bold mt-1">
                توثيق الأداء والمتابعات
              </div>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <FileText className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Odoo Enterprise Sub-Navigation Tabs */}
        <div className="bg-white rounded-xl border border-slate-200 p-1.5 flex items-center gap-2 shadow-xs text-xs font-bold">
          <button
            onClick={() => setActiveTab('CUSTODY')}
            className={`flex-1 py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition ${
              activeTab === 'CUSTODY'
                ? 'bg-[#714B67] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>العهد العينية والمالية ({custodies.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('LOANS')}
            className={`flex-1 py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition ${
              activeTab === 'LOANS'
                ? 'bg-[#714B67] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>السلف والأقساط الشهرية ({loans.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('WARNINGS')}
            className={`flex-1 py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition ${
              activeTab === 'WARNINGS'
                ? 'bg-[#714B67] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>الإنذارات والمخالفات ({warnings.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('NOTES')}
            className={`flex-1 py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition ${
              activeTab === 'NOTES'
                ? 'bg-[#714B67] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>سجل الملاحظات والتقييمات ({employeeNotes.length})</span>
          </button>
        </div>

        {/* ==================== TAB 1: CUSTODIES ==================== */}
        {activeTab === 'CUSTODY' && (
          <div className="space-y-4">
            {filteredCustodies.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 space-y-3">
                <Briefcase className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="font-bold text-slate-700">لا توجد عهد عينية مسجلة حتى الآن</h3>
                <p className="text-xs text-slate-400">يمكنك تسليم كمبيوتر، سيارة، هاتف، أو بطاقة مالية للموظف وحفظها في ملفه.</p>
                <button
                  onClick={handleOpenNewCustody}
                  className="bg-[#714B67] text-white font-bold px-4 py-2 rounded-lg text-xs shadow inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>تسليم عهدة جديدة الآن</span>
                </button>
              </div>
            ) : viewMode === 'KANBAN' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCustodies.map(cust => {
                  const emp = employees.find(e => e.id === cust.employeeId);
                  return (
                    <div key={cust.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:shadow-md transition space-y-3 relative group">
                      <div className="flex items-start justify-between border-b pb-2">
                        <div>
                          <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                            {cust.itemCode}
                          </span>
                          <h4 className="font-bold text-slate-800 text-sm mt-1">{cust.itemName}</h4>
                          <span className="text-[11px] text-slate-500">الفئة: {cust.itemCategory}</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                          cust.status === 'ASSIGNED' ? 'bg-emerald-100 text-emerald-800' :
                          cust.status === 'RETURNED' ? 'bg-slate-100 text-slate-600' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {cust.status === 'ASSIGNED' ? 'مستلمة بالخدمة' : cust.status === 'RETURNED' ? 'تم استرجاعها' : 'تالفة / مفقودة'}
                        </span>
                      </div>

                      <div className="text-xs space-y-1.5 text-slate-600">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">الموظف المستلم:</span>
                          <span className="font-bold text-slate-800">{emp ? emp.fullNameAr : 'غير محدد'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">تاريخ التسليم:</span>
                          <span className="font-mono">{cust.handoverDate}</span>
                        </div>
                        {cust.expiryDate && (
                           <div className="flex items-center justify-between">
                             <span className="text-slate-400">تاريخ الانتهاء:</span>
                             <span className="font-mono font-bold text-amber-600">{cust.expiryDate}</span>
                           </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">القيمة التقديرية:</span>
                          <span className="font-bold text-emerald-700 font-mono">{formatKWD(cust.valueKwd)}</span>
                        </div>
                        {cust.serialNumber && (
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">الرقم التسلسلي (S/N):</span>
                            <span className="font-mono bg-slate-50 px-1 rounded">{cust.serialNumber}</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t flex items-center justify-between text-xs">
                        <button
                          onClick={() => setPrintableRecord({ type: 'CUSTODY', data: { ...cust, empName: emp?.fullNameAr } })}
                          className="text-[#714B67] hover:underline font-bold flex items-center gap-1"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>طباعة إقرار استلام</span>
                        </button>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingCustody(cust);
                              setIsCustodyModalOpen(true);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                            title="تعديل"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmTarget({ type: 'CUSTODY', id: cust.id, label: cust.itemName })}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-3">كود العهدة</th>
                      <th className="p-3">اسم العهدة</th>
                      <th className="p-3">الموظف المستلم</th>
                      <th className="p-3">تاريخ التسليم</th>
                      <th className="p-3">الحالة التشغيلية</th>
                      <th className="p-3">القيمة بالدينار</th>
                      <th className="p-3 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCustodies.map((cust, idx) => {
                      const emp = employees.find(e => e.id === cust.employeeId);
                      return (
                        <tr key={cust.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50 hover:bg-purple-50/30'}>
                          <td className="p-3 font-mono font-bold text-slate-700">{cust.itemCode}</td>
                          <td className="p-3 font-bold text-slate-800">{cust.itemName}</td>
                          <td className="p-3 font-bold text-slate-700">{emp ? emp.fullNameAr : '—'}</td>
                          <td className="p-3 font-mono">{cust.handoverDate}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              cust.status === 'ASSIGNED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {cust.status === 'ASSIGNED' ? 'مستلمة بالخدمة' : 'مسترجعة'}
                            </span>
                          </td>
                          <td className="p-3 font-mono font-bold text-emerald-700">{formatKWD(cust.valueKwd)}</td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setPrintableRecord({ type: 'CUSTODY', data: { ...cust, empName: emp?.fullNameAr } })}
                                className="p-1 text-slate-500 hover:text-[#714B67] hover:bg-slate-100 rounded"
                                title="طباعة إقرار استلام"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingCustody(cust);
                                  setIsCustodyModalOpen(true);
                                }}
                                className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmTarget({ type: 'CUSTODY', id: cust.id, label: cust.itemName })}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
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
            )}
          </div>
        )}

        {/* ==================== TAB 2: LOANS & ADVANCES ==================== */}
        {activeTab === 'LOANS' && (
          <div className="space-y-4">
            {filteredLoans.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 space-y-3">
                <DollarSign className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="font-bold text-slate-700">لا توجد سلف أو أقساط مالية قائمة</h3>
                <p className="text-xs text-slate-400">يمكنك تسجيل سلفة مالية على الراتب وتحديد الأقساط الشهرية بالدينار الكويتي KWD.</p>
                <button
                  onClick={handleOpenNewLoan}
                  className="bg-[#714B67] text-white font-bold px-4 py-2 rounded-lg text-xs shadow inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>تقديم طلب سلفة جديدة</span>
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-3">الموظف</th>
                      <th className="p-3">مبلغ السلفة الإجمالي</th>
                      <th className="p-3">القسط الشهري</th>
                      <th className="p-3">تاريخ البدء</th>
                      <th className="p-3">الأقساط المسددة</th>
                      <th className="p-3">المبلغ المتبقي</th>
                      <th className="p-3">حالة السداد</th>
                      <th className="p-3 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLoans.map((loan, idx) => {
                      const emp = employees.find(e => e.id === loan.employeeId);
                      return (
                        <tr key={loan.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50 hover:bg-amber-50/30'}>
                          <td className="p-3">
                            <div className="font-bold text-slate-800">{emp ? emp.fullNameAr : '—'}</div>
                            <div className="text-[10px] text-slate-400">{loan.reason}</div>
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-800">{formatKWD(loan.amount)}</td>
                          <td className="p-3 font-mono font-bold text-indigo-700">{formatKWD(loan.monthlyDeduction)}</td>
                          <td className="p-3 font-mono">{loan.startDate}</td>
                          <td className="p-3 font-mono">
                            <span className="font-bold text-emerald-600">{loan.paidInstallments}</span> / {loan.totalInstallments} قسط
                          </td>
                          <td className="p-3 font-mono font-bold text-amber-700">{formatKWD(loan.remainingAmount)}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              loan.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                              loan.status === 'IN_REPAYMENT' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {loan.status === 'COMPLETED' ? 'تم السداد بالكامل' : loan.status === 'IN_REPAYMENT' ? 'قيد الخصم الشهري' : 'مسودة'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => {
                                  // Quick add 1 paid installment
                                  const paid = loan.paidInstallments + 1;
                                  const paidAmt = paid * loan.monthlyDeduction;
                                  const remaining = Math.max(0, loan.amount - paidAmt);
                                  onSaveLoan({
                                    ...loan,
                                    paidInstallments: paid,
                                    remainingAmount: remaining,
                                    status: remaining <= 0 ? 'COMPLETED' : 'IN_REPAYMENT'
                                  });
                                }}
                                className="px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded text-[10px] font-bold"
                                title="تسجيل سداد قسط شهري"
                              >
                                + قسط
                              </button>
                              <button
                                onClick={() => {
                                  setEditingLoan(loan);
                                  setIsLoanModalOpen(true);
                                }}
                                className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmTarget({ type: 'LOAN', id: loan.id, label: `سلفة ${emp?.fullNameAr || ''}` })}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
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
            )}
          </div>
        )}

        {/* ==================== TAB 3: WARNINGS & DISCIPLINE ==================== */}
        {activeTab === 'WARNINGS' && (
          <div className="space-y-4">
            {filteredWarnings.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 space-y-3">
                <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="font-bold text-slate-700">لا توجد إنذارات جزائية مسجلة</h3>
                <p className="text-xs text-slate-400">يمكنك توثيق الإنذارات الشفهية والخطيّة والخصومات الجزائية وفق المادة 28 من قانون العمل الكويتي.</p>
                <button
                  onClick={handleOpenNewWarning}
                  className="bg-rose-700 text-white font-bold px-4 py-2 rounded-lg text-xs shadow inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>إصدار إنذار جزائي جديد</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredWarnings.map(wrn => {
                  const emp = employees.find(e => e.id === wrn.employeeId);
                  return (
                    <div key={wrn.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3 relative border-r-4 border-r-rose-600">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-mono font-bold bg-rose-50 text-rose-700 px-2 py-0.5 rounded">
                            {wrn.warningCode}
                          </span>
                          <h4 className="font-bold text-slate-800 text-sm mt-1">{wrn.subject}</h4>
                          <span className="text-[11px] text-[#714B67] font-bold">الموظف: {emp ? emp.fullNameAr : 'غير محدد'}</span>
                        </div>
                        <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2.5 py-1 rounded-full">
                          {wrn.warningType === 'FIRST_WARNING' ? 'إنذار أول' :
                           wrn.warningType === 'SECOND_WARNING' ? 'إنذار ثاني' :
                           wrn.warningType === 'FINAL_WARNING' ? 'إنذار نهائي بالفصل' : 'خصم جزائي'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed">
                        {wrn.violationDetails}
                      </p>

                      <div className="text-[11px] space-y-1 text-slate-500">
                        <div className="flex justify-between">
                          <span>تاريخ المخالفة / الإصدار:</span>
                          <span className="font-mono text-slate-700">{wrn.violationDate} / {wrn.issueDate}</span>
                        </div>
                        {wrn.deductionDays ? (
                          <div className="flex justify-between text-rose-700 font-bold">
                            <span>الجزاء الخصمي:</span>
                            <span>خصم {wrn.deductionDays} أيام من الراتب</span>
                          </div>
                        ) : null}
                        <div className="text-[10px] text-slate-400 font-serif">
                          {wrn.legalArticleNote}
                        </div>
                      </div>

                      <div className="pt-2 border-t flex items-center justify-between text-xs">
                        <button
                          onClick={() => setPrintableRecord({ type: 'WARNING', data: { ...wrn, empName: emp?.fullNameAr, civilId: emp?.civilId } })}
                          className="text-[#714B67] hover:underline font-bold flex items-center gap-1"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>طباعة الإشعار القانوني</span>
                        </button>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingWarning(wrn);
                              setIsWarningModalOpen(true);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmTarget({ type: 'WARNING', id: wrn.id, label: `إنذار ${emp?.fullNameAr || ''}` })}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 4: NOTES & EVALUATIONS ==================== */}
        {activeTab === 'NOTES' && (
          <div className="space-y-4">
            {filteredNotes.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 space-y-3">
                <FileText className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="font-bold text-slate-700">لا توجد ملاحظات أو تقييمات مسجلة</h3>
                <p className="text-xs text-slate-400">يمكنك كتابة ملاحظات إدارية، تقييمات سنوية، وتوصيات ترقية للموظفين.</p>
                <button
                  onClick={handleOpenNewNote}
                  className="bg-[#714B67] text-white font-bold px-4 py-2 rounded-lg text-xs shadow inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة ملاحظة جديدة</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredNotes.map(note => {
                  const emp = employees.find(e => e.id === note.employeeId);
                  return (
                    <div key={note.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3 relative">
                      <div className="flex items-start justify-between border-b pb-2">
                        <div>
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                            {note.category === 'EVALUATION' ? 'تقييم أداء' : 'ملاحظة إدارية'}
                          </span>
                          <h4 className="font-bold text-slate-800 text-sm mt-1">{note.title}</h4>
                          <span className="text-[11px] font-bold text-slate-600">الموظف: {emp ? emp.fullNameAr : 'غير محدد'}</span>
                        </div>
                        {note.isConfidential && (
                          <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                            سري للغاية
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100 whitespace-pre-wrap">
                        {note.content}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t">
                        <span>الكاتب: {note.authorName}</span>
                        <span className="font-mono">{note.date}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingNote(note);
                              setIsNoteModalOpen(true);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmTarget({ type: 'NOTE', id: note.id, label: note.title })}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ==================== CUSTODY MODAL ==================== */}
      {isCustodyModalOpen && editingCustody && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-[#714B67]" />
                <span>تسليم عهدة جديدة للموظف</span>
              </h3>
              <button onClick={() => setIsCustodyModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="md:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">الموظف المستلم *</label>
                <select
                  value={editingCustody.employeeId || ''}
                  onChange={(e) => setEditingCustody(prev => ({ ...prev, employeeId: e.target.value }))}
                  className="w-full border border-slate-300 rounded p-2 outline-none font-bold bg-white"
                >
                  <option value="">-- اختر الموظف --</option>
                  {companyEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.fullNameAr} ({emp.employeeCode})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم العهدة *</label>
                <input
                  type="text"
                  value={editingCustody.itemName || ''}
                  onChange={(e) => setEditingCustody(prev => ({ ...prev, itemName: e.target.value }))}
                  placeholder="مثال: لابتوب MacBook Pro M3"
                  className="w-full border border-slate-300 rounded p-2 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">فئة العهدة</label>
                <select
                  value={editingCustody.itemCategory || 'ELECTRONICS'}
                  onChange={(e) => setEditingCustody(prev => ({ ...prev, itemCategory: e.target.value as any }))}
                  className="w-full border border-slate-300 rounded p-2 outline-none bg-white"
                >
                  <option value="ELECTRONICS">أجهزة إلكترونية ولابتوب</option>
                  <option value="VEHICLE">سيارة / مركبة شركة</option>
                  <option value="SIM_PHONE">هاتف محمول / شريحة SIM</option>
                  <option value="FINANCIAL_CARD">بطاقة مالية / عهدة مصاريف</option>
                  <option value="TOOLS">أدوات ومعدات مهنية</option>
                  <option value="OTHER">أخرى</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">الرقم التسلسلي (S/N)</label>
                <input
                  type="text"
                  value={editingCustody.serialNumber || ''}
                  onChange={(e) => setEditingCustody(prev => ({ ...prev, serialNumber: e.target.value }))}
                  placeholder="مثال: C02FX9102L"
                  className="w-full border border-slate-300 rounded p-2 outline-none font-mono"
                />
              </div>
              
              <div>
                <label className="block font-bold text-slate-700 mb-1">تاريخ الانتهاء (المركبات/الضمان)</label>
                <input
                  type="date"
                  value={editingCustody.expiryDate || ''}
                  onChange={(e) => setEditingCustody(prev => ({ ...prev, expiryDate: e.target.value }))}
                  className="w-full border border-slate-300 rounded p-2 outline-none font-mono text-amber-700"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">القيمة بالدينار الكويتي (KWD)</label>
                <input
                  type="number"
                  step="0.001"
                  value={editingCustody.valueKwd || ''}
                  onChange={(e) => setEditingCustody(prev => ({ ...prev, valueKwd: parseFloat(e.target.value) }))}
                  className="w-full border border-slate-300 rounded p-2 outline-none font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">تاريخ التسليم</label>
                <input
                  type="date"
                  value={editingCustody.handoverDate || ''}
                  onChange={(e) => setEditingCustody(prev => ({ ...prev, handoverDate: e.target.value }))}
                  className="w-full border border-slate-300 rounded p-2 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">الحالة التشغيلية</label>
                <select
                  value={editingCustody.status || 'ASSIGNED'}
                  onChange={(e) => setEditingCustody(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full border border-slate-300 rounded p-2 outline-none bg-white"
                >
                  <option value="ASSIGNED">مستلمة بالخدمة</option>
                  <option value="RETURNED">تم الاسترجاع</option>
                  <option value="DAMAGED">تالفة / مفقودة</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsCustodyModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveCustodySubmit}
                className="px-4 py-2 text-xs font-bold bg-[#714B67] hover:bg-[#5a3a52] text-white rounded-lg shadow transition"
              >
                حفظ العهدة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== LOAN MODAL ==================== */}
      {isLoanModalOpen && editingLoan && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-amber-600" />
                <span>تسجيل سلفة مالية جديدة</span>
              </h3>
              <button onClick={() => setIsLoanModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="md:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">الموظف المستفيد *</label>
                <select
                  value={editingLoan.employeeId || ''}
                  onChange={(e) => setEditingLoan(prev => ({ ...prev, employeeId: e.target.value }))}
                  className="w-full border border-slate-300 rounded p-2 outline-none font-bold bg-white"
                >
                  <option value="">-- اختر الموظف --</option>
                  {companyEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.fullNameAr} ({emp.employeeCode})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">مبلغ السلفة الإجمالي (KWD) *</label>
                <input
                  type="number"
                  step="0.001"
                  value={editingLoan.amount || ''}
                  onChange={(e) => {
                    const amt = parseFloat(e.target.value) || 0;
                    setEditingLoan(prev => ({
                      ...prev,
                      amount: amt,
                      monthlyDeduction: amt > 0 ? Number((amt / (prev?.totalInstallments || 10)).toFixed(3)) : 0,
                      remainingAmount: amt
                    }));
                  }}
                  className="w-full border border-slate-300 rounded p-2 outline-none font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">عدد الأقساط الشهري</label>
                <input
                  type="number"
                  value={editingLoan.totalInstallments || 10}
                  onChange={(e) => {
                    const count = parseInt(e.target.value) || 1;
                    setEditingLoan(prev => ({
                      ...prev,
                      totalInstallments: count,
                      monthlyDeduction: prev?.amount ? Number((prev.amount / count).toFixed(3)) : 0
                    }));
                  }}
                  className="w-full border border-slate-300 rounded p-2 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">القسط الشهري (KWD)</label>
                <input
                  type="number"
                  step="0.001"
                  value={editingLoan.monthlyDeduction || ''}
                  onChange={(e) => setEditingLoan(prev => ({ ...prev, monthlyDeduction: parseFloat(e.target.value) }))}
                  className="w-full border border-slate-300 rounded p-2 outline-none font-mono font-bold text-indigo-700"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">تاريخ البدء والخصم</label>
                <input
                  type="date"
                  value={editingLoan.startDate || ''}
                  onChange={(e) => setEditingLoan(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full border border-slate-300 rounded p-2 outline-none font-mono"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">سبب طلب السلفة</label>
                <input
                  type="text"
                  value={editingLoan.reason || ''}
                  onChange={(e) => setEditingLoan(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="مثال: سلفة طارئة على الراتب / مصاريف عائلية"
                  className="w-full border border-slate-300 rounded p-2 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsLoanModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveLoanSubmit}
                className="px-4 py-2 text-xs font-bold bg-[#714B67] hover:bg-[#5a3a52] text-white rounded-lg shadow transition"
              >
                حفظ السلفة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== WARNING MODAL ==================== */}
      {isWarningModalOpen && editingWarning && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <span>إصدار إنذار جزائي قانوني</span>
              </h3>
              <button onClick={() => setIsWarningModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="md:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">الموظف المخالف *</label>
                <select
                  value={editingWarning.employeeId || ''}
                  onChange={(e) => setEditingWarning(prev => ({ ...prev, employeeId: e.target.value }))}
                  className="w-full border border-slate-300 rounded p-2 outline-none font-bold bg-white"
                >
                  <option value="">-- اختر الموظف --</option>
                  {companyEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.fullNameAr} ({emp.employeeCode})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">درجة الإنذار</label>
                <select
                  value={editingWarning.warningType || 'FIRST_WARNING'}
                  onChange={(e) => setEditingWarning(prev => ({ ...prev, warningType: e.target.value as any }))}
                  className="w-full border border-slate-300 rounded p-2 outline-none bg-white font-bold"
                >
                  <option value="FIRST_WARNING">إنذار كتابي أول</option>
                  <option value="SECOND_WARNING">إنذار كتابي ثاني</option>
                  <option value="FINAL_WARNING">إنذار نهائي بالفصل</option>
                  <option value="DEDUCTION_NOTICE">إشعار خصم جزائي</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">عدد أيام الخصم من الراتب</label>
                <input
                  type="number"
                  value={editingWarning.deductionDays || 0}
                  onChange={(e) => setEditingWarning(prev => ({ ...prev, deductionDays: parseInt(e.target.value) }))}
                  placeholder="0"
                  className="w-full border border-slate-300 rounded p-2 outline-none font-bold text-rose-700"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">موضوع المخالفة *</label>
                <input
                  type="text"
                  value={editingWarning.subject || ''}
                  onChange={(e) => setEditingWarning(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="مثال: التأخير المتكرر عن الدوام / الإخلال بالتعليمات الإدارية"
                  className="w-full border border-slate-300 rounded p-2 outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">تفاصيل المخالفة والوقائع</label>
                <textarea
                  rows={3}
                  value={editingWarning.violationDetails || ''}
                  onChange={(e) => setEditingWarning(prev => ({ ...prev, violationDetails: e.target.value }))}
                  placeholder="شرح تفصيلي للمخالفة..."
                  className="w-full border border-slate-300 rounded p-2 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsWarningModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveWarningSubmit}
                className="px-4 py-2 text-xs font-bold bg-rose-700 hover:bg-rose-800 text-white rounded-lg shadow transition"
              >
                حفظ وإنشاء الإنذار
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== NOTE MODAL ==================== */}
      {isNoteModalOpen && editingNote && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <span>إضافة ملاحظة / تقييم إداري</span>
              </h3>
              <button onClick={() => setIsNoteModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="md:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">الموظف المعني *</label>
                <select
                  value={editingNote.employeeId || ''}
                  onChange={(e) => setEditingNote(prev => ({ ...prev, employeeId: e.target.value }))}
                  className="w-full border border-slate-300 rounded p-2 outline-none font-bold bg-white"
                >
                  <option value="">-- اختر الموظف --</option>
                  {companyEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.fullNameAr} ({emp.employeeCode})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">نوع الملاحظة</label>
                <select
                  value={editingNote.category || 'EVALUATION'}
                  onChange={(e) => setEditingNote(prev => ({ ...prev, category: e.target.value as any }))}
                  className="w-full border border-slate-300 rounded p-2 outline-none bg-white"
                >
                  <option value="EVALUATION">تقييم أدائي وتطويري</option>
                  <option value="GENERAL">ملاحظة عامة</option>
                  <option value="PERFORMANCE">متابعة إنجاز مهام</option>
                  <option value="COMPLIANCE">التزام بالقوانين</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">عنوان الملاحظة *</label>
                <input
                  type="text"
                  value={editingNote.title || ''}
                  onChange={(e) => setEditingNote(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="مثال: تميز في خدمة العملاء"
                  className="w-full border border-slate-300 rounded p-2 outline-none font-bold"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">نص الملاحظة والتوصيات *</label>
                <textarea
                  rows={4}
                  value={editingNote.content || ''}
                  onChange={(e) => setEditingNote(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="كتابة الملاحظة بالتفصيل..."
                  className="w-full border border-slate-300 rounded p-2 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsNoteModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveNoteSubmit}
                className="px-4 py-2 text-xs font-bold bg-[#714B67] hover:bg-[#5a3a52] text-white rounded-lg shadow transition"
              >
                حفظ الملاحظة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== DELETE CONFIRMATION MODAL ==================== */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-100 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
              <h3 className="font-bold text-lg text-slate-800">تأكيد الحذف</h3>
            </div>
            
            <p className="text-sm text-slate-600">
              هل أنت متأكد من رغبتك في حذف <strong className="text-slate-800 font-bold">{deleteConfirmTarget.label}</strong>؟ لن يمكنك التراجع بعد الحذف.
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmTarget(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteConfirmTarget.type === 'CUSTODY') onDeleteCustody(deleteConfirmTarget.id);
                  if (deleteConfirmTarget.type === 'LOAN') onDeleteLoan(deleteConfirmTarget.id);
                  if (deleteConfirmTarget.type === 'WARNING') onDeleteWarning(deleteConfirmTarget.id);
                  if (deleteConfirmTarget.type === 'NOTE') onDeleteNote(deleteConfirmTarget.id);
                  setDeleteConfirmTarget(null);
                }}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>نعم، حذف نهائي</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== PRINTABLE RECEIPT MODAL ==================== */}
      {printableRecord && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div id="print-area" className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-8 space-y-6 print:p-0 print:border-none print:shadow-none">
            {/* Odoo Letterhead Header */}
            <div className="border-b-2 border-[#714B67] pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">{activeCompany?.nameAr || ''}</h2>
                <div className="text-xs text-slate-500 font-serif">{activeCompany?.nameEn || ''}</div>
                <div className="text-[11px] text-slate-400 mt-1">سجل تجاري: {activeCompany?.commercialRegNo || ''} | دولة الكويت</div>
              </div>
              <div className="text-left dir-ltr">
                <span className="text-xs font-extrabold text-[#714B67] bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
                  Odoo Official Document
                </span>
                <div className="text-[10px] text-slate-400 font-mono mt-1">تاريخ الإصدار: {new Date().toISOString().split('T')[0]}</div>
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-800 underline decoration-[#714B67] decoration-2 underline-offset-8">
                {printableRecord.type === 'CUSTODY' ? 'إقرار واستلام عهدة عينية' :
                 printableRecord.type === 'WARNING' ? 'إخطار إنذار جزائي (قانون العمل الكويتي)' : 'سند استلام سلفة مالية'}
              </h3>
              <p className="text-xs text-slate-500">مستند إداري موثق ومحفوظ في سجلات الموارد البشرية</p>
            </div>

            {/* Record Details Body */}
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 text-xs space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400">اسم الموظف:</span>
                  <span className="font-bold text-slate-800 mr-2">{printableRecord.data.empName || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400">الرقم المدني:</span>
                  <span className="font-mono font-bold text-slate-800 mr-2">{printableRecord.data.civilId || '—'}</span>
                </div>
              </div>

              {printableRecord.type === 'CUSTODY' && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                  <div><span className="text-slate-400">كود العهدة:</span> <strong className="font-mono">{printableRecord.data.itemCode}</strong></div>
                  <div><span className="text-slate-400">اسم العهدة:</span> <strong>{printableRecord.data.itemName}</strong></div>
                  <div><span className="text-slate-400">الرقم التسلسلي S/N:</span> <strong className="font-mono">{printableRecord.data.serialNumber || '—'}</strong></div>
                  <div><span className="text-slate-400">القيمة التقديرية:</span> <strong className="font-mono text-emerald-700">{formatKWD(printableRecord.data.valueKwd)}</strong></div>
                </div>
              )}

              {printableRecord.type === 'WARNING' && (
                <div className="space-y-2 pt-2 border-t">
                  <div><span className="text-slate-400">رقم الإنذار:</span> <strong className="font-mono text-rose-700">{printableRecord.data.warningCode}</strong></div>
                  <div><span className="text-slate-400">موضوع المخالفة:</span> <strong>{printableRecord.data.subject}</strong></div>
                  <div><span className="text-slate-400">تفاصيل الواقعة:</span> <p className="bg-white p-2 rounded border border-slate-200 text-slate-700 mt-1">{printableRecord.data.violationDetails}</p></div>
                  <div className="text-[11px] text-rose-700 font-bold">{printableRecord.data.legalArticleNote}</div>
                </div>
              )}
            </div>

            {/* Legal Acknowledgment Statement */}
            <div className="text-xs text-slate-600 leading-relaxed bg-amber-50/60 p-4 rounded-xl border border-amber-200">
              {printableRecord.type === 'CUSTODY' ? (
                <span>أقر أنا الموظف المذكور أعلاه باستلام العهدة المبينة بآلية سليمة، وأتعهد بالحفاظ عليها وإعادتها فور طلب إدارة الشركة أو عند انتهاء علاقة العمل.</span>
              ) : (
                <span>يتوجب على الموظف الالتزام التام بالقوانين واللوائح التنفيذية للشركة لعدم التعرض للجزاءات الأشد وفقاً لأحكام قانون العمل الكويتي رقم 6 لسنة 2010.</span>
              )}
            </div>

            {/* Signatures & Seal */}
            <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-200 text-center text-xs font-bold text-slate-700">
              <div className="space-y-12">
                <div>توقيع واستلام الموظف</div>
                <div className="border-b border-dashed border-slate-400 w-40 mx-auto"></div>
              </div>
              <div className="space-y-12">
                <div>ختم واعتماد الموارد البشرية (HR)</div>
                <div className="border-b border-dashed border-slate-400 w-40 mx-auto"></div>
              </div>
            </div>

            {/* Print & Close Controls */}
            <div className="flex justify-end gap-2 pt-4 border-t print:hidden">
              <button
                onClick={() => setPrintableRecord(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                إغلاق
              </button>
              <button
                onClick={() => printDocument('print-area', 'document')}
                className="px-4 py-2 text-xs font-bold bg-[#714B67] hover:bg-[#5a3a52] text-white rounded-lg shadow transition flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة المستند الرسمية</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
