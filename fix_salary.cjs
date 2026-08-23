const fs = require('fs');

let content = fs.readFileSync('src/components/OfficialLeaveModal.tsx', 'utf8');

const regex = /const contractGross = [^;]+;\n\s*const grossSalary = [^;]+;/;

const newCode = `const contractGross = selectedContract ? (Number(selectedContract.basicSalary || 0) + Number(selectedContract.housingAllowance || 0) + Number(selectedContract.transportAllowance || 0) + Number(selectedContract.otherAllowance || 0) + Number((selectedContract as any).grossSalary || 0)) : 0;
    const grossSalary = contractGross > 0 ? contractGross : Number((selectedEmp as any).basicSalary || (selectedEmp as any).grossSalary || (selectedEmp as any).salary || 0);`;

content = content.replace(regex, newCode);

// Also make sure we find 'ACTIVE' ignoring case if possible, or just standard
const activeRegex = /c\.status === 'RUNNING' \|\| c\.status === 'ACTIVE' as any/g;
content = content.replace(activeRegex, "c.status === 'RUNNING' || c.status === 'ACTIVE' || (c.status as any) === 'active'");

fs.writeFileSync('src/components/OfficialLeaveModal.tsx', content);
console.log('Fixed salary extraction.');
