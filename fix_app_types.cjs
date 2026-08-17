const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Fix imports
code = code.replace(/Shift, EmployeeShift/g, 'ShiftProfile, EmployeeShift');
code = code.replace(/Commencement,/g, 'EmploymentCommencement,');

// Fix states
code = code.replace(/useState<Shift\[\]>/g, 'useState<ShiftProfile[]>');
code = code.replace(/useState<Commencement\[\]>/g, 'useState<EmploymentCommencement[]>');
code = code.replace(/useState<Custody\[\]>/g, 'useState<CustodyItem[]>');
code = code.replace(/useState<Loan\[\]>/g, 'useState<LoanAdvance[]>');
code = code.replace(/useState<Warning\[\]>/g, 'useState<DisciplinaryWarning[]>');

// Fix function arguments
code = code.replace(/handleSaveShift = \(s: Shift\)/g, 'handleSaveShift = (s: ShiftProfile)');
code = code.replace(/handleSaveCommencement = \(c: Commencement\)/g, 'handleSaveCommencement = (c: EmploymentCommencement)');
code = code.replace(/handleSaveWarning = \(w: Warning\)/g, 'handleSaveWarning = (w: DisciplinaryWarning)');

// Fix useFirebaseSync args (make it accept 12 again)
code = code.replace(/useFirebaseSync\(isAuthenticated\);/g, `useFirebaseSync(
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
  );`);

// Fix Payslip overtime error
code = code.replace(/overtime: 0,\n/g, '');

fs.writeFileSync('src/App.tsx', code);
