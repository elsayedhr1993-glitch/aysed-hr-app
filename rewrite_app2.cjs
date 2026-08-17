const fs = require('fs');

let appCode = fs.readFileSync('src/App.tsx', 'utf8');

// Replace everything from `const storedDataStr = localStorage.getItem('aysedshr_2026_db');`
// down to the state definitions.
const storedDataRegex = /const storedDataStr = localStorage\.getItem\('aysedshr_2026_db'\);[\s\S]*?const \[auditLogs, setAuditLogs\] = useState<AuditLog\[\]>\(storedData\?\.auditLogs \|\| \[/;
const newInit = `
  // Global Data State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');

  const {
    companies, setCompanies,
    employees, setEmployees,
    documents, setDocuments,
    leaves, setLeaves,
    attendance, setAttendance,
    payslips, setPayslips,
    loading: dbLoading,
    saveToDb,
    deleteFromDb
  } = useFirebaseSync(isAuthenticated);

  // Remaining states that we won't sync for this demo but keep them local
  const [candidates, setCandidates] = useState<Candidate[]>(initialCandidates);
  const [contracts, setContracts] = useState<Contract[]>(initialContracts);
  const [documentTemplates, setDocumentTemplates] = useState<DocumentTemplate[]>(DEFAULT_TEMPLATES_SEED);
  const [generatedDocs, setGeneratedDocs] = useState<GeneratedDocument[]>([]);
  const [shifts, setShifts] = useState<ShiftProfile[]>([]);
  const [employeeShifts, setEmployeeShifts] = useState<EmployeeShift[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([`;

appCode = appCode.replace(storedDataRegex, newInit);

// And we still need to fix the render:
const renderRegex = /return \(\s*<div className="min-h-screen bg-slate-100 flex font-sans dir-rtl text-right">/;
const renderReplacement = `
  if (!isAuthenticated) {
    return <OdooLogin onLoginSuccess={(uid, email) => {
      setCurrentUserId(uid);
      setCurrentUserEmail(email);
      setIsAuthenticated(true);
    }} />;
  }

  if (dbLoading) {
    return <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-center items-center">
      <div className="w-12 h-12 border-4 border-[#714B67] border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-4 text-[#714B67] font-bold">جاري المزامنة السحابية (Firestore)...</p>
    </div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex font-sans dir-rtl text-right">`;
appCode = appCode.replace(renderRegex, renderReplacement);

fs.writeFileSync('src/App.tsx', appCode);
console.log('App.tsx rewritten part 2');
