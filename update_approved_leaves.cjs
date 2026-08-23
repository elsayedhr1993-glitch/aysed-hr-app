const fs = require('fs');
let content = fs.readFileSync('src/components/LeaveSettlementCalculator.tsx', 'utf8');

content = content.replace(
  /const employeeApprovedLeaves = useMemo\(\(\) => \{\n    if \(!selectedEmp\) return \[\];\n    return leaves\.filter\(l => l\.employeeId === selectedEmp\.id && l\.status === 'APPROVED'\);\n  \}, \[leaves, selectedEmp\]\);/,
  `const employeeLeavesForSettlement = useMemo(() => {
    if (!selectedEmp) return [];
    return leaves.filter(l => l.employeeId === selectedEmp.id && ['APPROVED', 'SUBMITTED', 'PENDING_MANAGER', 'PENDING_HR'].includes(l.status));
  }, [leaves, selectedEmp]);`
);

content = content.replace(/employeeApprovedLeaves/g, 'employeeLeavesForSettlement');

fs.writeFileSync('src/components/LeaveSettlementCalculator.tsx', content);
