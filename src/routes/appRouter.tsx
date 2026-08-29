import React from 'react';
import { ArrowRight } from 'lucide-react';

// Independent Modular Screen Components
import { LeaveManagement } from '../components/LeaveManagement';
import { Attendance } from '../components/Attendance';
import { Employees } from '../components/Employees';
import { SaasAdmin } from '../components/SaasAdmin';
import { HolidayWorkManagementView } from '../components/HolidayWorkManagementView';
import { LeaveTypesConfigView } from '../components/LeaveTypesConfigView';

// Additional Modules
import { ContractsApp } from '../apps/ContractsApp';
import { KuwaitHolidaysApp } from '../apps/KuwaitHolidaysApp';
import { RecruitmentApp } from '../apps/RecruitmentApp';
import { PayrollApp } from '../apps/PayrollApp';
import { EOSApp } from '../apps/EOSApp';
import { DocumentsApp } from '../apps/DocumentsApp';
import { DocumentTemplatesApp } from '../apps/DocumentTemplatesApp';
import { AuditLogsApp } from '../apps/AuditLogsApp';
import { CustodyLoansApp } from '../apps/CustodyLoansApp';
import { AutomationApp } from '../apps/AutomationApp';
import { AICopilotApp } from '../apps/AICopilotApp';
import { ShiftsApp } from '../apps/ShiftsApp';
import { CommencementApp } from '../apps/CommencementApp';
import { ReportsApp } from '../apps/ReportsApp';
import { ExclusiveInnovationsSuite } from '../apps/ExclusiveInnovationsSuite';
import { CompaniesApp } from '../apps/CompaniesApp';
import { SettingsApp } from '../apps/SettingsApp';
import { NotificationTemplatesLogApp } from '../apps/NotificationTemplatesLogApp';
import { DailyMovementsApp } from '../apps/DailyMovementsApp';
import { OdooAppLauncher } from '../components/OdooAppLauncher';

export interface AppRouterProps {
  autoOpenLeaveForEmpId?: string | null;
  onClearAutoOpenLeave?: () => void;
  onOpenLeaveModal?: (empId: string) => void;
  currentApp?: string | null;
  setCurrentApp?: (app: string | null) => void;
  activeApp?: string | null;
  setActiveApp?: (app: any) => void;
  currentUserEmail: string;
  currentUserRole: string;
  stats: any;
  activeCompany: any;
  setActiveCompany: (company: any) => void;
  visibleCompanies: any[];
  scopedEmployees: any[];
  scopedContracts: any[];
  scopedLeaves: any[];
  scopedAttendance: any[];
  scopedPayslips: any[];
  scopedDocuments: any[];
  scopedCustodies: any[];
  scopedLoans: any[];
  employees: any[];
  contracts: any[];
  leaves: any[];
  attendance: any[];
  payslips: any[];
  documents: any[];
  jobTitles: any[];
  departments: any[];
  viewMode: any;
  setViewMode: (mode: any) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterTab: string;
  setFilterTab: (tab: string) => void;
  selectedEmpForForm: any;
  setSelectedEmpForForm: (emp: any) => void;
  highlightField?: string | null;
  onClearHighlightField?: () => void;
  selectedEmployeeForLeavesFilter: string | null;
  setSelectedEmployeeForLeavesFilter: (empId: string | null) => void;
  isOCRModalOpen: boolean;
  subscriptions: any[];
  setSubscriptions: React.Dispatch<React.SetStateAction<any[]>>;
  automationRules: any[];
  setAutomationRules: React.Dispatch<React.SetStateAction<any[]>>;
  documentTemplates: any[];
  generatedDocs: any[];
  auditLogs: any[];
  warnings: any[];
  employeeNotes: any[];
  shifts: any[];
  employeeShifts: any[];
  commencements: any[];
  companies: any[];
  setCompanies: React.Dispatch<React.SetStateAction<any[]>>;
  onLogout?: () => void;
  employeeNotifications: any[];
  onSaveEmployee: (emp: any) => void;
  onDeleteEmployee: (empId: string) => void;
  onSoftDeleteEmployee?: (empId: string, reason?: string) => void;
  onRestoreEmployee?: (empId: string) => void;
  onHardDeleteAllEmployees?: () => void;
  onSaveJobTitle?: (jobTitle: any) => void;
  onDeleteJobTitle?: (id: string) => void;
  onOpenNotificationModal?: (emp: any, trigger?: any) => void;
  handleSaveContract: (c: any) => void;
  handleDeleteContract: (id: string) => void;
  handleSaveLeave: (l: any) => void;
  handleUpdateLeaveStatus: (id: string, status: any, note?: string) => void;
  handleDeleteLeave?: (id: string, force?: boolean) => Promise<boolean> | boolean | void;
  handleSaveAttendance: (a: any) => void;
  handleSaveAttendanceBatch: (batch: any[]) => void;
  handleGenerateMonthlyPayslips: (month: string) => void;
  handleSavePayslip: (p: any) => void;
  handleSaveDocument: (d: any) => void;
  handleDeleteDocument: (id: string) => void;
  handleAutoAddEmpFromOCR: (emp: any) => void;
  handleSaveDocumentTemplate: (t: any) => void;
  handleDeleteDocumentTemplate: (id: string) => void;
  handleIssueDocument: (d: any) => void;
  handleAddAuditLog: (log: any) => void;
  handleSaveCustody: (c: any) => void;
  handleDeleteCustody: (id: string) => void;
  handleSaveLoan: (l: any) => void;
  handleDeleteLoan: (id: string) => void;
  handleSaveWarning: (w: any) => void;
  handleDeleteWarning: (id: string) => void;
  handleSaveNote: (n: any) => void;
  handleDeleteNote: (id: string) => void;
  handleSaveShift: (s: any) => void;
  handleDeleteShift: (id: string) => void;
  handleAssignShift: (asgn: any) => void;
  handleRemoveAssignment: (id: string) => void;
  handleSaveCommencement: (c: any) => void;
  handleDeleteCommencement?: (id: string) => void;
  handleUpdateEmployeeStatus: (id: string, status: any) => void;
  handleUpdateSubscription: (sub: any) => void;
  handleDeleteSubscription: (id: string) => Promise<void>;
  handleSaveCompany: (c: any) => Promise<void>;
  handleDeleteCompany: (id: string) => Promise<void>;
  handlePurgeSystemData: () => Promise<void>;
  handleLoadDemoData: () => void;
  handleDeleteNotification: (id: string) => void;
  handleClearAllNotifications: () => void;
  bgTheme: any;
  setBgTheme: (theme: any) => void;
  motionEnabled: boolean;
  setMotionEnabled: (enabled: boolean) => void;
  dailyMovements: any[];
  onSaveMovement: (m: any) => void;
  onUpdateMovementState: (id: string, state: any) => void;
  onDeleteMovement: (id: string) => void;
  candidates?: any[];
  onSaveCandidate?: (cand: any) => void;
  onConvertCandidateToEmployee?: (cand: any) => void;
  onDeleteCandidate?: (id: string) => void;
  onPostAttendanceToPayroll?: (month: string, deductionsMap?: Record<string, number>) => void;
}

/**
 * Central Router Registry (خريطة المسارات والتوجيه المركزي)
 * Dispatches each screen to its dedicated independent component.
 */
export const AppRouter: React.FC<AppRouterProps> = (props) => {
  const {
    currentApp,
    setCurrentApp,
    activeApp,
    setActiveApp,
    currentUserEmail,
    currentUserRole,
    stats,
    activeCompany,
    setActiveCompany,
    visibleCompanies,
    scopedEmployees,
    scopedContracts,
    scopedLeaves,
    scopedAttendance,
    scopedPayslips,
    scopedDocuments,
    scopedCustodies,
    scopedLoans,
    employees,
    contracts,
    leaves,
    attendance,
    payslips,
    documents,
    jobTitles,
    departments,
    viewMode,
    setViewMode,
    searchTerm,
    filterTab,
    setFilterTab,
    selectedEmpForForm,
    setSelectedEmpForForm,
    selectedEmployeeForLeavesFilter,
    setSelectedEmployeeForLeavesFilter,
    isOCRModalOpen,
    subscriptions,
    automationRules,
    setAutomationRules,
    documentTemplates,
    generatedDocs,
    auditLogs,
    warnings,
    employeeNotes,
    shifts,
    employeeShifts,
    commencements,
    companies,
    setCompanies,
    employeeNotifications,
    onSaveEmployee,
    onDeleteEmployee,
    onSoftDeleteEmployee,
    onRestoreEmployee,
    onHardDeleteAllEmployees,
    onSaveJobTitle,
    onDeleteJobTitle,
    onOpenNotificationModal,
    handleSaveContract,
    handleDeleteContract,
    handleSaveLeave,
    handleUpdateLeaveStatus,
    handleDeleteLeave,
    handleSaveAttendance,
    handleSaveAttendanceBatch,
    handleGenerateMonthlyPayslips,
    handleSavePayslip,
    handleSaveDocument,
    handleDeleteDocument,
    handleAutoAddEmpFromOCR,
    handleSaveDocumentTemplate,
    handleDeleteDocumentTemplate,
    handleIssueDocument,
    handleAddAuditLog,
    handleSaveCustody,
    handleDeleteCustody,
    handleSaveLoan,
    handleDeleteLoan,
    handleSaveWarning,
    handleDeleteWarning,
    handleSaveNote,
    handleDeleteNote,
    handleSaveShift,
    handleDeleteShift,
    handleAssignShift,
    handleRemoveAssignment,
    handleSaveCommencement,
    handleDeleteCommencement,
    handleUpdateEmployeeStatus,
    handleUpdateSubscription,
    handleDeleteSubscription,
    handleSaveCompany,
    handleDeleteCompany,
    handlePurgeSystemData,
    handleLoadDemoData,
    handleDeleteNotification,
    handleClearAllNotifications,
    bgTheme,
    setBgTheme,
    motionEnabled,
    setMotionEnabled,
    dailyMovements,
    onSaveMovement,
    onUpdateMovementState,
    onDeleteMovement,
    onLogout,
  } = props;

  const effectiveApp = props.currentApp !== undefined ? props.currentApp : (props.activeApp || null);

  const handleSetApp = (targetApp: string | null) => {
    if (props.setCurrentApp) {
      props.setCurrentApp(targetApp);
    }
    if (props.setActiveApp) {
      props.setActiveApp(targetApp || 'LAUNCHER');
    }
  };

  if (!effectiveApp || effectiveApp === 'LAUNCHER' || effectiveApp === 'APP_LAUNCHER') {
    return (
      <OdooAppLauncher 
        onSelectApp={(app) => handleSetApp(app)} 
        currentUserEmail={currentUserEmail} 
        currentUserRole={currentUserRole} 
        activeCompany={activeCompany}
        stats={stats} 
      />);
  }

  const getAppMetadata = (appKey: string) => {
    switch (appKey) {
      case 'EMPLOYEES': return { title: 'إدارة الموظفين والهياكل', code: 'hr.employee' };
      case 'ATTENDANCE': return { title: 'البصمة والحضور والدوام', code: 'hr.attendance' };
      case 'LEAVES': case 'LEAVE_MANAGEMENT': return { title: 'إدارة الإجازات (المادة 70)', code: 'hr.leave' };
      case 'SAAS_ADMIN': return { title: 'إدارة الاشتراكات والمؤسسات', code: 'saas.admin' };
      case 'CONTRACTS': return { title: 'عقود العمل والبدلات', code: 'hr.contract' };
      case 'PAYROLL': return { title: 'الرواتب والتأمينات WPS', code: 'hr.payslip' };
      case 'RECRUITMENT': return { title: 'التوظيف والمقابلات الذكية', code: 'hr.applicant' };
      case 'EOS': return { title: 'نهاية الخدمة - المادتان 51 و53', code: 'hr.eos' };
      case 'DOCUMENTS': return { title: 'الأرشيف والمستندات وOCR', code: 'ir.attachment' };
      case 'DOCUMENT_TEMPLATES': return { title: 'قوالب ونماذج المستندات', code: 'hr.document.template' };
      case 'CUSTODY_LOANS': return { title: 'العهد والسلف والأقساط', code: 'hr.loan' };
      case 'COMMENCEMENT': return { title: 'مباشرة العمل الرسمية', code: 'hr.commencement' };
      case 'SHIFTS': return { title: 'جدولة الشفتات والورديات', code: 'hr.shift' };
      case 'DAILY_MOVEMENTS': return { title: 'سجل الحركة اليومية للموظفين', code: 'hr.daily.movement' };
      case 'HOLIDAYS': return { title: 'العطلات الرسمية لدولة الكويت', code: 'hr.holiday' };
      case 'REPORTS': return { title: 'التقارير والتحليلات البيانية', code: 'hr.report' };
      case 'COMPANIES': return { title: 'إدارة الشركات والفروع', code: 'res.company' };
      case 'EXCLUSIVE_INNOVATIONS': case 'INNOVATIONS': return { title: 'حزمة الابتكارات الحصرية', code: 'hr.innovations' };
      case 'AI_COPILOT': return { title: 'المستشار الذكي (AI Copilot)', code: 'ai.copilot' };
      case 'HOLIDAY_WORK': return { title: 'إدارة العمل بالعطلات والأعياد', code: 'hr.holiday.work' };
      case 'LEAVE_TYPES_CONFIG': return { title: 'إعدادات وأنواع الإجازات', code: 'hr.leave.type' };
      case 'NOTIFICATIONS': return { title: 'محرك الإشعارات والواتساب', code: 'hr.notification' };
      case 'AUTOMATION': return { title: 'الأتمتة والـ Studio', code: 'base.automation' };
      case 'AUDIT_LOGS': return { title: 'سجل الرقابة وتتبع العمليات', code: 'audit.log' };
      case 'SETTINGS': return { title: 'الإعدادات العامة والربط', code: 'res.config.settings' };
      default: return { title: 'تطبيق النظام', code: 'app.view' };
    }
  };

  const renderScreenContent = () => {
    switch (effectiveApp) {
      // 1. شاشة الموظفين (src/components/Employees.tsx)
      case 'EMPLOYEES':
        return (
          <Employees
            onOpenLeaveModal={props.onOpenLeaveModal}
            employees={scopedEmployees}
            contracts={scopedContracts}
            leaves={scopedLeaves}
            documents={scopedDocuments}
            jobTitles={jobTitles}
            departments={departments}
            activeCompany={activeCompany}
            viewMode={viewMode}
            searchTerm={searchTerm}
            filterTab={filterTab}
            onSaveEmployee={onSaveEmployee}
            onDeleteEmployee={onDeleteEmployee}
            onSoftDeleteEmployee={onSoftDeleteEmployee}
            onRestoreEmployee={onRestoreEmployee}
            onHardDeleteAllEmployees={onHardDeleteAllEmployees}
            onSaveJobTitle={onSaveJobTitle}
            onDeleteJobTitle={onDeleteJobTitle}
            onNavigateToApp={(app) => setActiveApp(app)}
            selectedEmpForForm={selectedEmpForForm}
            onCloseForm={() => setSelectedEmpForForm(null)}
            onViewModeChange={setViewMode}
            onFilterTabChange={setFilterTab}
            onSelectEmployeeForLeaves={(empId) => setSelectedEmployeeForLeavesFilter(empId)}
            onOpenNotificationModal={onOpenNotificationModal}
          />);

      // 2. شاشة البصمة والدوام (src/components/Attendance.tsx)
      case 'ATTENDANCE':
        return (
          <Attendance
            attendance={scopedAttendance}
            employees={scopedEmployees}
            contracts={scopedContracts}
            leaves={scopedLeaves}
            payslips={scopedPayslips}
            activeCompany={activeCompany}
            onSaveAttendance={handleSaveAttendance}
            onSaveAttendanceBatch={handleSaveAttendanceBatch}
            onPostAttendanceToPayroll={props.onPostAttendanceToPayroll || (() => {})}
            onNavigateToApp={(app) => setActiveApp(app)}
          />);

      // 3. شاشة الإجازات (src/components/LeaveManagement.tsx)
      case 'LEAVES':
        return (
          <LeaveManagement
            autoOpenNewLeaveForEmpId={props.autoOpenLeaveForEmpId}
            onClearAutoOpenLeave={props.onClearAutoOpenLeave}
            leaves={scopedLeaves}
            employees={scopedEmployees}
            contracts={scopedContracts}
            attendance={scopedAttendance}
            activeCompany={activeCompany}
            viewMode={viewMode}
            searchTerm={searchTerm}
            filterTab={filterTab}
            onSaveLeave={handleSaveLeave}
            onUpdateLeaveStatus={handleUpdateLeaveStatus}
            onDeleteLeave={handleDeleteLeave}
            onSaveEmployee={onSaveEmployee}
            initialEmployeeId={selectedEmployeeForLeavesFilter || 'ALL'}
            onOpenNotificationModal={onOpenNotificationModal}
            onNavigateToApp={(app) => setActiveApp(app)}
          />);

      case 'LEAVE_MANAGEMENT':
        return (
          <LeaveManagement
            autoOpenNewLeaveForEmpId={props.autoOpenLeaveForEmpId}
            onClearAutoOpenLeave={props.onClearAutoOpenLeave}
            leaves={scopedLeaves}
            employees={scopedEmployees}
            contracts={scopedContracts}
            attendance={scopedAttendance}
            activeCompany={activeCompany}
            viewMode={viewMode}
            searchTerm={searchTerm}
            filterTab={filterTab}
            onSaveLeave={handleSaveLeave}
            onUpdateLeaveStatus={handleUpdateLeaveStatus}
            onDeleteLeave={handleDeleteLeave}
            onSaveEmployee={onSaveEmployee}
            initialEmployeeId={selectedEmployeeForLeavesFilter || 'ALL'}
            onOpenNotificationModal={onOpenNotificationModal}
            onNavigateToApp={(app) => setActiveApp(app)}
          />);

      // 4. شاشة إدارة الاشتراكات (src/components/SaasAdmin.tsx)
      case 'SAAS_ADMIN':
        {
          const isSuper = currentUserRole === 'SUPER_ADMIN' || 
            currentUserEmail?.toLowerCase() === 'elsayedhr1993@gmail.com' || 
            currentUserEmail?.toLowerCase() === 'admin@aysed.com';
          if (!isSuper) {
            return (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 m-6 shadow-sm">
                <div className="text-4xl mb-3">🔒</div>
                <h2 className="text-lg font-bold text-slate-800">غير مصرح لك بالوصول</h2>
                <p className="text-xs text-slate-500 mt-1">شاشة إدارة الاشتراكات (SaaS) مقيدة بصلاحيات base.group_system للمدير العام فقط.</p>
              </div>);
          }
          return (
            <SaasAdmin
              subscriptions={subscriptions}
              onUpdateSubscription={handleUpdateSubscription}
              onDeleteSubscription={handleDeleteSubscription}
              currentUserEmail={currentUserEmail}
              onImpersonateCompany={(companyName) => {
                const found = companies.find(c => c.nameAr.includes(companyName) || companyName.includes(c.nameAr));
                if (found) {
                  setActiveCompany(found);
                  handleSetApp(null);
                }
              }}
              onLogout={onLogout}
            />);
        }

      case 'CONTRACTS':
      return (
        <ContractsApp
          contracts={scopedContracts}
          employees={scopedEmployees}
          activeCompany={activeCompany}
          viewMode={viewMode}
          searchTerm={searchTerm}
          filterTab={filterTab}
          onSaveContract={handleSaveContract}
          onDeleteContract={handleDeleteContract}
          onViewModeChange={setViewMode}
          onNavigateToApp={(app) => setActiveApp(app)}
        />);

    case 'PAYROLL':
      return (
        <PayrollApp
          payslips={scopedPayslips}
          employees={scopedEmployees}
          contracts={scopedContracts}
          loans={scopedLoans}
          attendance={scopedAttendance}
          activeCompany={activeCompany}
          filterTab={filterTab}
          searchTerm={searchTerm}
          onGenerateMonthlyPayslips={handleGenerateMonthlyPayslips}
          onSaveContract={handleSaveContract}
          onSavePayslip={handleSavePayslip}
          onNavigateToApp={(app) => setActiveApp(app)}
          onOpenNotificationModal={onOpenNotificationModal}
        />);

    case 'EOS':
      return (
        <EOSApp
          employees={scopedEmployees}
          contracts={scopedContracts}
          leaves={scopedLeaves}
          activeCompany={activeCompany}
          onNavigateToApp={(app) => setActiveApp(app)}
        />);

    case 'HOLIDAY_WORK':
      return (
        <HolidayWorkManagementView
          employees={scopedEmployees}
          activeCompanyId={activeCompany?.id}
        />);

    case 'LEAVE_TYPES_CONFIG':
      return <LeaveTypesConfigView />;

    case 'REPORTS':
      return (
        <ReportsApp
          employees={scopedEmployees}
          contracts={scopedContracts}
          leaves={scopedLeaves}
          attendance={scopedAttendance}
          payslips={scopedPayslips}
          documents={scopedDocuments}
          custodies={scopedCustodies}
          loans={scopedLoans}
          activeCompany={activeCompany}
        />);

    case 'DOCUMENTS':
      return (
        <DocumentsApp
          documents={scopedDocuments}
          employees={scopedEmployees}
          activeCompany={activeCompany}
          filterTab={filterTab}
          onSaveDocument={handleSaveDocument}
          onDeleteDocument={handleDeleteDocument}
          onAutoAddEmpFromOCR={(empData: any) => { handleAutoAddEmpFromOCR(empData); return ''; }}
          isOCRModalOpenInitially={isOCRModalOpen}
          onNavigateToApp={(app) => setActiveApp(app)}
          onSelectEmpForForm={(emp) => setSelectedEmpForForm(emp)}
        />);

    case 'DOCUMENT_TEMPLATES':
      return (
        <DocumentTemplatesApp
          templates={documentTemplates}
          generatedDocs={generatedDocs}
          employees={scopedEmployees.filter(e => !e.isDeleted)}
          contracts={scopedContracts}
          activeCompany={activeCompany}
          onSaveTemplate={handleSaveDocumentTemplate}
          onDeleteTemplate={handleDeleteDocumentTemplate}
          onIssueDocument={handleIssueDocument}
          onAddAuditLog={handleAddAuditLog}
        />);

    case 'AUDIT_LOGS':
      return (
        <AuditLogsApp
          auditLogs={auditLogs}
          activeCompany={activeCompany}
          employees={scopedEmployees}
          contracts={scopedContracts}
          leaves={scopedLeaves}
          attendance={scopedAttendance}
          payslips={scopedPayslips}
          generatedDocs={generatedDocs}
          documentTemplates={documentTemplates}
          onAddEmployee={onSaveEmployee}
          onAddAttendance={(rec) => handleSaveAttendance(rec)}
          onAddLeave={(lv) => handleSaveLeave(lv)}
          onIssueDocument={handleIssueDocument}
          onAddAuditLog={handleAddAuditLog}
        />);

    case 'CUSTODY_LOANS':
      return (
        <CustodyLoansApp
          employees={scopedEmployees}
          custodies={scopedCustodies}
          loans={scopedLoans}
          warnings={warnings}
          employeeNotes={employeeNotes}
          activeCompany={activeCompany}
          viewMode={viewMode}
          searchTerm={searchTerm}
          filterTab={filterTab}
          onSaveCustody={handleSaveCustody}
          onDeleteCustody={handleDeleteCustody}
          onSaveLoan={handleSaveLoan}
          onDeleteLoan={handleDeleteLoan}
          onSaveWarning={handleSaveWarning}
          onDeleteWarning={handleDeleteWarning}
          onSaveNote={handleSaveNote}
          onDeleteNote={handleDeleteNote}
          onNavigateToApp={(app: any) => setActiveApp(app)}
        />);

    case 'AUTOMATION':
      return (
        <AutomationApp
          automationRules={automationRules}
          activeCompany={activeCompany}
          onToggleRule={(id) => setAutomationRules(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r))}
          onAddRule={(r) => setAutomationRules(prev => [r, ...prev])}
        />);

    case 'AI_COPILOT':
      return (
        <AICopilotApp
          activeCompany={activeCompany}
          employees={scopedEmployees}
          contracts={scopedContracts}
          leaves={scopedLeaves}
        />);

    case 'SHIFTS':
      return (
        <ShiftsApp
          shifts={shifts}
          employeeShifts={employeeShifts}
          employees={scopedEmployees}
          activeCompany={activeCompany}
          onSaveShift={handleSaveShift}
          onDeleteShift={handleDeleteShift}
          onAssignShift={handleAssignShift}
          onRemoveAssignment={handleRemoveAssignment}
        />);

    case 'COMMENCEMENT':
      return (
        <CommencementApp
          employees={scopedEmployees}
          contracts={scopedContracts}
          shifts={shifts}
          commencements={commencements}
          activeCompany={activeCompany}
          filterTab={filterTab}
          onSaveCommencement={handleSaveCommencement}
          onDeleteCommencement={handleDeleteCommencement}
          onUpdateEmployeeStatus={handleUpdateEmployeeStatus}
          onSaveEmployee={onSaveEmployee}
          onSaveContract={handleSaveContract}
          onNavigateToApp={(app) => setActiveApp(app)}
        />);

    case 'DAILY_MOVEMENTS':
      return (
        <DailyMovementsApp
          dailyMovements={dailyMovements}
          employees={scopedEmployees}
          activeCompany={activeCompany}
          searchTerm={searchTerm}
          onSaveMovement={onSaveMovement}
          onUpdateMovementState={onUpdateMovementState}
          onDeleteMovement={onDeleteMovement}
          onNavigateToApp={(app) => setActiveApp(app)}
        />);

    case 'EXCLUSIVE_INNOVATIONS':
    case 'INNOVATIONS':
      return (
        <ExclusiveInnovationsSuite
          activeCompany={activeCompany}
          employees={scopedEmployees.filter(e => !e.isDeleted)}
          contracts={scopedContracts}
          leaves={scopedLeaves}
          attendance={scopedAttendance}
          documents={scopedDocuments}
          onAddAttendance={(rec) => handleSaveAttendance(rec)}
          onNavigateToApp={(app) => setActiveApp(app)}
        />);

    case 'HOLIDAYS':
      return (
        <KuwaitHolidaysApp
          employees={scopedEmployees}
          leaves={scopedLeaves}
        />);

    case 'RECRUITMENT':
      return (
        <RecruitmentApp
          candidates={props.candidates || []}
          activeCompany={activeCompany}
          onSaveCandidate={props.onSaveCandidate || (() => {})}
          onConvertCandidateToEmployee={props.onConvertCandidateToEmployee || (() => {})}
        />);

    case 'COMPANIES': {
      const emailLower = (currentUserEmail || '').toLowerCase();
      const isSuperAdmin = currentUserRole === 'SUPER_ADMIN' || emailLower === 'admin@aysed.com' || emailLower === 'elsayedhr1993@gmail.com';
      if (!isSuperAdmin) {
        return (
          <SettingsApp
            companies={visibleCompanies}
            activeCompany={activeCompany}
            onSaveCompany={handleSaveCompany}
            onAddCompany={handleSaveCompany}
            onDeleteCompany={handleDeleteCompany}
            onSelectCompany={(c) => setActiveCompany(c)}
            onPurgeSystemData={handlePurgeSystemData}
            onLoadDemoData={handleLoadDemoData}
            bgTheme={bgTheme}
            setBgTheme={setBgTheme}
            motionEnabled={motionEnabled}
            setMotionEnabled={setMotionEnabled}
            currentUserEmail={currentUserEmail}
            currentUserRole={currentUserRole}
            initialSubTab="COMPANY"
            onNavigateHome={() => setCurrentApp && setCurrentApp(null)}
          />);
      }
      return (
        <CompaniesApp
          companies={visibleCompanies}
          activeCompany={activeCompany}
          onSelectCompany={(c) => setActiveCompany(c)}
          onSaveCompany={handleSaveCompany}
          onDeleteCompany={handleDeleteCompany}
          currentUserEmail={currentUserEmail}
          currentUserRole={currentUserRole}
        />);
    }

    case 'SETTINGS':
      return (
        <SettingsApp
          companies={visibleCompanies}
          activeCompany={activeCompany}
          onSaveCompany={handleSaveCompany}
          onAddCompany={handleSaveCompany}
          onDeleteCompany={handleDeleteCompany}
          onSelectCompany={(c) => setActiveCompany(c)}
          onPurgeSystemData={handlePurgeSystemData}
          onLoadDemoData={handleLoadDemoData}
          bgTheme={bgTheme}
          setBgTheme={setBgTheme}
          motionEnabled={motionEnabled}
          setMotionEnabled={setMotionEnabled}
          currentUserEmail={currentUserEmail}
          currentUserRole={currentUserRole}
          onNavigateHome={() => setCurrentApp && setCurrentApp(null)}
        />);

    case 'NOTIFICATIONS':
      return (
        <NotificationTemplatesLogApp
          notifications={employeeNotifications}
          employees={employees.filter(e => !e.isDeleted)}
          activeCompany={activeCompany}
          onOpenQuickModal={(empId, trigger) => {
            const emp = empId ? employees.find(e => e.id === empId) || null : null;
            if (onOpenNotificationModal) {
              onOpenNotificationModal(emp, trigger || 'HR_ACTION_REQUIRED');
            }
          }}
          onOpenManualSendModal={(emp) => {
            if (onOpenNotificationModal) {
              onOpenNotificationModal(emp, 'HR_ACTION_REQUIRED');
            }
          }}
          onDeleteNotification={handleDeleteNotification}
          onClearAllNotifications={handleClearAllNotifications}
        />);

      default:
        return (
          <OdooAppLauncher 
            onSelectApp={(app) => handleSetApp(app)} 
            currentUserEmail={currentUserEmail} 
            currentUserRole={currentUserRole} 
            stats={stats} 
          />);
    }
  };

  const meta = getAppMetadata(effectiveApp);

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] min-h-screen">
      {/* 🔴 Permanent Clean Return Bar for Apps */}
      <div className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-2 flex items-center justify-between shadow-2xs sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleSetApp(null)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#714B67] hover:bg-[#583950] active:scale-95 text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer"
            title="العودة للتطبيقات الرئيسية"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة للتطبيقات الرئيسية</span>
          </button>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <h1 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
              <span>{meta.title}</span>
              <span className="text-[10px] font-mono text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                {meta.code}
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-700 bg-slate-50 px-2.5 py-1 rounded border border-slate-200 font-mono">
            {activeCompany?.name || 'مؤسسة الكويت الرقمية'}
          </span>
        </div>
      </div>

      {/* Screen Component Content */}
      <div className="flex-1 overflow-auto">
        {renderScreenContent()}
      </div>
    </div>);
};

export default AppRouter;
