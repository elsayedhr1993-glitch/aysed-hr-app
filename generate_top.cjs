const fs = require('fs');

const topJSX = `import React, { useState, useEffect } from 'react';
import { OdooLogin } from './components/OdooLogin';
import { OdooTopBar } from './components/OdooTopBar';
import { OdooAppLauncher } from './components/OdooAppLauncher';
import { OdooSidebar } from './components/OdooSidebar';
import { BackgroundRenderer } from './components/BackgroundRenderer';
import { SystemDiagnosticSuite } from './components/SystemDiagnosticSuite';
import { SmartNotificationsBanner } from './components/SmartNotificationsBanner';

// Apps
import EmployeesApp from './apps/EmployeesApp';
import LeavesApp from './apps/LeavesApp';
import AttendanceApp from './apps/AttendanceApp';
import PayrollApp from './apps/PayrollApp';
import EOSApp from './apps/EOSApp';
import DocumentsApp from './apps/DocumentsApp';
import DocumentTemplatesApp from './apps/DocumentTemplatesApp';
import AuditLogsApp from './apps/AuditLogsApp';
import CustodyLoansApp from './apps/CustodyLoansApp';
import AutomationApp from './apps/AutomationApp';
import AICopilotApp from './apps/AICopilotApp';
import ShiftsApp from './apps/ShiftsApp';
import CommencementApp from './apps/CommencementApp';
import CompaniesSubscriptionApp from './apps/CompaniesSubscriptionApp';
import SettingsApp from './apps/SettingsApp';

import { 
  Company, Employee, Contract, LeaveRequest, 
  AttendanceRecord, Payslip, DocumentItem, AutomationRule, 
  Custody, Loan, Warning, EmployeeNote, DocumentTemplate, 
  GeneratedDocument, AuditLog, Shift, EmployeeShift, 
  Commencement, CompanySubscription
} from './types';
import { useFirebaseSync } from './hooks/useFirebaseSync';
import toast, { Toaster } from 'react-hot-toast';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [activeCompany, setActiveCompany] = useState<Company>({ id: 'comp-1', name: 'Aysed HR S 2026', industry: 'Tech', contactEmail: '', isTrial: true, trialEndsAt: new Date(Date.now() + 30*24*60*60*1000).toISOString() } as Company);
  const [companies, setCompanies] = useState<Company[]>([activeCompany]);
  const [activeApp, setActiveApp] = useState('LAUNCHER');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Data state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [custodies, setCustodies] = useState<Custody[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [employeeNotes, setEmployeeNotes] = useState<EmployeeNote[]>([]);
  const [documentTemplates, setDocumentTemplates] = useState<DocumentTemplate[]>([]);
  const [generatedDocs, setGeneratedDocs] = useState<GeneratedDocument[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employeeShifts, setEmployeeShifts] = useState<EmployeeShift[]>([]);
  const [commencements, setCommencements] = useState<Commencement[]>([]);
  const [subscriptions, setSubscriptions] = useState<CompanySubscription[]>([]);

  // UI state
  const [bgTheme, setBgTheme] = useState('tech');
  const [motionEnabled, setMotionEnabled] = useState(true);
  const [viewMode, setViewMode] = useState<'grid'|'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState('ALL');
  const [isOCRModalOpen, setIsOCRModalOpen] = useState(false);
  const [selectedEmpForForm, setSelectedEmpForForm] = useState<Employee | null>(null);
  const [selectedEmployeeForLeavesFilter, setSelectedEmployeeForLeavesFilter] = useState<string | null>(null);

  // Firebase hook
  useFirebaseSync(
    isAuthenticated,
    activeCompany.id,
    setEmployees,
    setContracts,
    setLeaves,
    setAttendance,
    setPayslips,
    setDocuments,
    setCustodies,
    setLoans,
    setWarnings,
    setEmployeeNotes
  );

  const handleLogin = (email: string) => {
    setCurrentUserEmail(email);
    setIsAuthenticated(true);
  };

  const handlePurgeSystemData = () => {
    // Only basic clean for UI preview
    setEmployees([]);
    setContracts([]);
    setLeaves([]);
    setAttendance([]);
    setPayslips([]);
    setDocuments([]);
    setCustodies([]);
    setLoans([]);
    setWarnings([]);
    setEmployeeNotes([]);
  };

  const handleLoadDemoData = () => {
    toast.success("Demo data loaded");
  };

  const handleSaveEmployee = (emp: Employee) => setEmployees(prev => {
    const idx = prev.findIndex(e => e.id === emp.id);
    if(idx>=0){ const c=[...prev]; c[idx]=emp; return c; }
    return [emp, ...prev];
  });
  
  const handleSaveContract = (cnt: Contract) => setContracts(prev => {
    const idx = prev.findIndex(c => c.id === cnt.id);
    if(idx>=0){ const c=[...prev]; c[idx]=cnt; return c; }
    return [cnt, ...prev];
  });

  const handleSaveLeave = (lv: LeaveRequest) => setLeaves(prev => {
    const idx = prev.findIndex(l => l.id === lv.id);
    if(idx>=0){ const c=[...prev]; c[idx]=lv; return c; }
    return [lv, ...prev];
  });

  const handleUpdateLeaveStatus = (id: string, status: 'APPROVED' | 'REJECTED', note?: string) => {
    setLeaves(prev => prev.map(l => l.id === id ? { ...l, status, hrNote: note } : l));
  };

  const handleSaveAttendance = (rec: AttendanceRecord) => setAttendance(prev => {
    const idx = prev.findIndex(a => a.id === rec.id);
    if(idx>=0){ const c=[...prev]; c[idx]=rec; return c; }
    return [rec, ...prev];
  });

  const handleSaveAttendanceBatch = (records: AttendanceRecord[]) => {
    setAttendance(prev => {
      const copy = [...prev];
      records.forEach(rec => {
        const idx = copy.findIndex(a => a.id === rec.id);
        if (idx >= 0) copy[idx] = rec;
        else copy.push(rec);
      });
      return copy;
    });
  };

  const handlePostAttendanceToPayroll = (month: string) => {
    toast.success("Attendance posted to payroll for " + month);
  };

  const handleSavePayslip = (p: Payslip) => setPayslips(prev => {
    const idx = prev.findIndex(x => x.id === p.id);
    if(idx>=0){ const c=[...prev]; c[idx]=p; return c; }
    return [p, ...prev];
  });

  const handleSaveDocument = (doc: DocumentItem) => setDocuments(prev => {
    const idx = prev.findIndex(d => d.id === doc.id);
    if(idx>=0){ const c=[...prev]; c[idx]=doc; return c; }
    return [doc, ...prev];
  });

  const handleDeleteDocument = (id: string) => setDocuments(prev => prev.filter(d => d.id !== id));

  const handleSaveDocumentTemplate = (tpl: DocumentTemplate) => setDocumentTemplates(prev => {
    const idx = prev.findIndex(t => t.id === tpl.id);
    if(idx>=0){ const c=[...prev]; c[idx]=tpl; return c; }
    return [tpl, ...prev];
  });

  const handleDeleteDocumentTemplate = (id: string) => setDocumentTemplates(prev => prev.filter(t => t.id !== id));

  const handleIssueDocument = (doc: GeneratedDocument) => setGeneratedDocs(prev => [doc, ...prev]);

  const handleAddAuditLog = (log: AuditLog) => setAuditLogs(prev => [log, ...prev]);

  const handleSaveCustody = (c: Custody) => setCustodies(prev => {
    const idx = prev.findIndex(x => x.id === c.id);
    if(idx>=0){ const a=[...prev]; a[idx]=c; return a; }
    return [c, ...prev];
  });
  const handleDeleteCustody = (id: string) => setCustodies(prev => prev.filter(c => c.id !== id));

  const handleSaveLoan = (l: Loan) => setLoans(prev => {
    const idx = prev.findIndex(x => x.id === l.id);
    if(idx>=0){ const a=[...prev]; a[idx]=l; return a; }
    return [l, ...prev];
  });
  const handleDeleteLoan = (id: string) => setLoans(prev => prev.filter(l => l.id !== id));

  const handleSaveWarning = (w: Warning) => setWarnings(prev => {
    const idx = prev.findIndex(x => x.id === w.id);
    if(idx>=0){ const a=[...prev]; a[idx]=w; return a; }
    return [w, ...prev];
  });
  const handleDeleteWarning = (id: string) => setWarnings(prev => prev.filter(w => w.id !== id));

  const handleSaveNote = (n: EmployeeNote) => setEmployeeNotes(prev => {
    const idx = prev.findIndex(x => x.id === n.id);
    if(idx>=0){ const a=[...prev]; a[idx]=n; return a; }
    return [n, ...prev];
  });
  const handleDeleteNote = (id: string) => setEmployeeNotes(prev => prev.filter(n => n.id !== id));

  const handleSaveShift = (s: Shift) => setShifts(prev => {
    const idx = prev.findIndex(x => x.id === s.id);
    if(idx>=0){ const a=[...prev]; a[idx]=s; return a; }
    return [s, ...prev];
  });
  const handleDeleteShift = (id: string) => setShifts(prev => prev.filter(s => s.id !== id));
  
  const handleAssignShift = (assign: EmployeeShift) => setEmployeeShifts(prev => [assign, ...prev]);
  const handleRemoveAssignment = (id: string) => setEmployeeShifts(prev => prev.filter(s => s.id !== id));

  const handleSaveCommencement = (c: Commencement) => setCommencements(prev => {
    const idx = prev.findIndex(x => x.id === c.id);
    if(idx>=0){ const a=[...prev]; a[idx]=c; return a; }
    return [c, ...prev];
  });
  
  const handleUpdateEmployeeStatus = (empId: string, status: any) => {
    setEmployees(prev => prev.map(e => e.id === empId ? { ...e, status } : e));
  };
  
  const handleUpdateSubscription = (sub: CompanySubscription) => {
    setSubscriptions(prev => {
      const idx = prev.findIndex(s => s.id === sub.id);
      if(idx>=0){ const c=[...prev]; c[idx]=sub; return c; }
      return [sub, ...prev];
    });
  };

  const handleAutoAddEmpFromOCR = (emp: Partial<Employee>) => {
    const newEmp = { ...emp, id: 'emp-' + Date.now(), companyId: activeCompany.id } as Employee;
    handleSaveEmployee(newEmp);
  };

  const handleGenerateMonthlyPayslips = (month: string) => {
    const newPayslips: Payslip[] = [];
    const thisMonthAttendance = attendance.filter(a => a.date.startsWith(month));
    
    employees.filter(e => !e.isDeleted).forEach(emp => {
      const contract = contracts.find(c => c.employeeId === emp.id && c.status === 'ACTIVE');
      if (!contract) return;
      
      const basic = contract.basicSalary;
      const totalAllowances = (contract.allowances?.housing || 0) + (contract.allowances?.transport || 0) + (contract.allowances?.other || 0);
      
      const empAtt = thisMonthAttendance.filter(a => a.employeeId === emp.id);
      const absentDays = empAtt.filter(a => a.status === 'ABSENT').length;
      
      // Calculate daily rate: Gross / 26
      const dailyRate = (basic + totalAllowances) / 26;
      
      // Deductions
      const absentDeduction = absentDays * dailyRate;
      const otherDeductions = absentDeduction; // Expand as needed
      
      const gross = basic + totalAllowances;
      const net = Math.max(0, gross - otherDeductions);
      
      newPayslips.push({
        id: 'pay-' + month + '-' + emp.id,
        employeeId: emp.id,
        companyId: activeCompany.id,
        month,
        basicSalary: basic,
        allowances: totalAllowances,
        overtime: 0,
        deductions: otherDeductions,
        netSalary: net,
        status: 'DRAFT',
        createdAt: new Date().toISOString()
      });
    });
    
    setPayslips(prev => {
      const filtered = prev.filter(p => !(p.companyId === activeCompany.id && p.month === month));
      return [...newPayslips, ...filtered];
    });
    
    toast.success("Payslips generated for " + month);
  };

  if (!isAuthenticated) {
    return <OdooLogin onLogin={handleLogin} />;
  }
`;

// Read the existing bottom half
let bottomCode = fs.readFileSync('src/App.tsx', 'utf8');

// Combine
const fullCode = topJSX + '\n  return (\n    <div className="flex h-screen bg-[#F8F9FA] text-gray-800 odoo-scrollbar">\n      <BackgroundRenderer theme={bgTheme} motionEnabled={motionEnabled} />\n      <Toaster position="top-right" />\n      <SystemDiagnosticSuite />\n\n      {activeApp !== \'LAUNCHER\' && (\n        <OdooSidebar \n          isOpen={isSidebarOpen} \n          activeApp={activeApp} \n          onNavigate={setActiveApp} \n        />\n      )}\n\n      <div className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">\n        <OdooTopBar \n          activeApp={activeApp}\n          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}\n          onNavigateHome={() => setActiveApp(\'LAUNCHER\')}\n          currentUserEmail={currentUserEmail}\n          onLogout={() => setIsAuthenticated(false)}\n          searchTerm={searchTerm}\n          onSearchChange={setSearchTerm}\n          activeCompany={activeCompany}\n        />\n\n        <SmartNotificationsBanner documents={documents} activeCompany={activeCompany} />\n\n        <main className="flex-1 overflow-auto">\n          <div className="h-full">\n            {activeApp === \'LAUNCHER\' && (\n              <OdooAppLauncher onLaunchApp={setActiveApp} activeCompany={activeCompany} />\n            )}\n            {activeApp === \'EMPLOYEES\' && (\n              <EmployeesApp\n' + bottomCode.substring(bottomCode.indexOf('                leaves={leaves}'));

fs.writeFileSync('src/App.tsx', fullCode);
console.log("App.tsx restored!");
