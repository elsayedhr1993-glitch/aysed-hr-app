import React, { useState } from 'react';
import { AuditLog, Company, Employee, Contract, LeaveRequest, AttendanceRecord, Payslip, GeneratedDocument, DocumentItem, DocumentTemplate } from '../types';
import { ShieldCheck, Search, Filter, History, Trash2, Edit3, Plus, ArrowLeft, ArrowRight, FileText, UserCheck, Activity } from 'lucide-react';
import { SystemDiagnosticSuite } from '../components/SystemDiagnosticSuite';

interface AuditLogsAppProps {
  auditLogs: AuditLog[];
  activeCompany: Company;
  employees?: Employee[];
  contracts?: Contract[];
  leaves?: LeaveRequest[];
  attendance?: AttendanceRecord[];
  payslips?: Payslip[];
  generatedDocs?: GeneratedDocument[];
  documentTemplates?: DocumentTemplate[];
  onAddEmployee?: (emp: Employee) => void;
  onAddAttendance?: (rec: AttendanceRecord) => void;
  onAddLeave?: (leave: LeaveRequest) => void;
  onIssueDocument?: (genDoc: GeneratedDocument, docItem: DocumentItem) => void;
  onAddAuditLog?: (log: Omit<AuditLog, 'id' | 'timestamp'>) => void;
}

export const AuditLogsApp: React.FC<AuditLogsAppProps> = ({ 
  auditLogs, 
  activeCompany,
  employees = [],
  contracts = [],
  leaves = [],
  attendance = [],
  payslips = [],
  generatedDocs = [],
  documentTemplates = [],
  onAddEmployee = () => {},
  onAddAttendance = () => {},
  onAddLeave = () => {},
  onIssueDocument = () => {},
  onAddAuditLog = () => {},
}) => {
  const [activeTab, setActiveTab] = useState<'LOGS' | 'DIAGNOSTICS'>('LOGS');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedActionFilter, setSelectedActionFilter] = useState<string>('ALL');
  const [selectedEntityFilter, setSelectedEntityFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter audit logs
  const filteredLogs = (auditLogs || []).filter(log => {
    if (log.companyId !== (activeCompany?.id || 'comp-1')) return false;
    
    if (selectedActionFilter !== 'ALL' && log.action !== selectedActionFilter) {
      return false;
    }

    if (selectedEntityFilter !== 'ALL' && log.entity !== selectedEntityFilter) {
      return false;
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        log.userName.toLowerCase().includes(term) ||
        log.details.toLowerCase().includes(term) ||
        log.entity.toLowerCase().includes(term) ||
        (log.entityId && log.entityId.toLowerCase().includes(term))
      );
    }

    return true;
  });

  // Pagination Math
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE':
        return <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold border border-emerald-200">إضافة جديدة</span>;
      case 'UPDATE':
        return <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold border border-blue-200">تعديل بيانات</span>;
      case 'DELETE':
      case 'SOFT_DELETE':
        return <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded font-bold border border-rose-200">حذف / أرشفة</span>;
      case 'ISSUE':
        return <span className="bg-purple-50 text-[#714B67] px-2 py-0.5 rounded font-bold border border-purple-200">إصدار وتوثيق</span>;
      case 'EXPORT':
        return <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-bold border border-amber-200">تصدير تقرير</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">{action}</span>;
    }
  };

  return (
    <div className="p-4 sm:p-6 bg-transparent min-h-[calc(100vh-3rem)] space-y-5">
      {/* Header & Sub-Tab Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#714B67]" />
            <span>سجل الرقابة واختبار الجاهزية التشغيلية (<span className="whitespace-nowrap">Audit &amp; Diagnostic Center</span>)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            متابعة كافة حركات النظام واختبار الربط والجاهزية الإنتاجية بنسبة 100%
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('LOGS')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'LOGS' ? 'bg-[#714B67] text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>سجل التغييرات ({filteredLogs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('DIAGNOSTICS')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'DIAGNOSTICS' ? 'bg-[#714B67] text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>فحص واختبار النظام E2E</span>
          </button>
        </div>
      </div>

      {activeTab === 'DIAGNOSTICS' ? (
        <SystemDiagnosticSuite
          activeCompany={activeCompany}
          employees={employees}
          contracts={contracts}
          leaves={leaves}
          attendance={attendance}
          payslips={payslips}
          generatedDocs={generatedDocs}
          documentTemplates={documentTemplates}
          auditLogs={auditLogs}
          onAddEmployee={onAddEmployee}
          onAddAttendance={onAddAttendance}
          onAddLeave={onAddLeave}
          onIssueDocument={onIssueDocument}
          onAddAuditLog={onAddAuditLog}
        />) : (
        <>
          {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            placeholder="البحث بالاسم أو التفاصيل أو الكود..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pr-9 pl-3 py-2 border border-slate-300 rounded-lg text-xs"
          />
        </div>

        {/* Action Filter */}
        <div>
          <select
            value={selectedActionFilter || 'ALL'}
            onChange={(e) => {
              setSelectedActionFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full border border-slate-300 rounded-lg p-2 font-bold text-slate-800 bg-white"
          >
            <option value="ALL">جميع أنواع الإجراءات (All Actions)</option>
            <option value="CREATE">إضافة جديدة (CREATE)</option>
            <option value="UPDATE">تعديل بيانات (UPDATE)</option>
            <option value="SOFT_DELETE">حذف لطيف / أرشفة (SOFT DELETE)</option>
            <option value="ISSUE">إصدار مستند (ISSUE)</option>
            <option value="EXPORT">تصدير (EXPORT)</option>
          </select>
        </div>

        {/* Entity Filter */}
        <div>
          <select
            value={selectedEntityFilter || 'ALL'}
            onChange={(e) => {
              setSelectedEntityFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full border border-slate-300 rounded-lg p-2 font-bold text-slate-800 bg-white"
          >
            <option value="ALL">جميع الأقسام والسجلات (All Entities)</option>
            <option value="EMPLOYEE">سجلات الموظفين</option>
            <option value="CONTRACT">عقود العمل</option>
            <option value="DOCUMENT">المستندات والشهادات</option>
            <option value="PAYROLL">كشوف الرواتب</option>
            <option value="LEAVE">طلبات الإجازات</option>
            <option value="TEMPLATE">القوالب</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-right text-xs">
          <thead className="bg-[#714B67] text-white font-bold">
            <tr>
              <th className="p-3">التاريخ والوقت</th>
              <th className="p-3">المستخدم / المنفذ</th>
              <th className="p-3">نوع الإجراء</th>
              <th className="p-3">نوع الكيان</th>
              <th className="p-3 whitespace-nowrap">تفاصيل العملية <span className="whitespace-nowrap">(Audit Details)</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400">
                  <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-slate-600">لا توجد عمليات مسجلة مطابقة لفلاتر البحث الحالية</p>
                </td>
              </tr>) : (
              paginatedLogs.map((log, idx) => (
                <tr key={log.id || `audit-log-${idx}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                  <td className="p-3 font-mono text-slate-600 font-bold">
                    {new Date(log.timestamp).toLocaleString('ar-KW')}
                  </td>
                  <td className="p-3 font-bold text-slate-800">{log.userName}</td>
                  <td className="p-3">{getActionBadge(log.action)}</td>
                  <td className="p-3 font-bold text-slate-700 font-mono">{log.entity}</td>
                  <td className="p-3 text-slate-800 leading-relaxed">{log.details}</td>
                </tr>))
            )}
          </tbody>
        </table>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-slate-600">
            <span>الصفحة {currentPage} من {totalPages}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="px-3 py-1 bg-white border border-slate-300 rounded disabled:opacity-50 hover:bg-slate-100 flex items-center gap-1"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>السابقة</span>
              </button>

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="px-3 py-1 bg-white border border-slate-300 rounded disabled:opacity-50 hover:bg-slate-100 flex items-center gap-1"
              >
                <span>التالية</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>)}
      </div>
        </>)}
    </div>);
};
