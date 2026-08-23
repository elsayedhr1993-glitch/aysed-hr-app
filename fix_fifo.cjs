const fs = require('fs');

// Fix OfficialLeaveModal
let file1 = 'src/components/OfficialLeaveModal.tsx';
let c1 = fs.readFileSync(file1, 'utf8');
c1 = c1.replace(/import { computeFifoLeaveAllocations } from '\.\.\/services\/leaveService';/, "import { computeFifoLeaveAllocations, buildEmployeeBaselineAllocations } from '../services/leaveService';");

c1 = c1.replace(/const empFifo = computeFifoLeaveAllocations\(selectedEmp, allocations, allLeaves\);/g, "const empFifo = computeFifoLeaveAllocations(selectedEmp, buildEmployeeBaselineAllocations(selectedEmp, allocations), allLeaves);");

fs.writeFileSync(file1, c1);

// Fix LeaveSettlementCalculator
let file2 = 'src/components/LeaveSettlementCalculator.tsx';
let c2 = fs.readFileSync(file2, 'utf8');

c2 = c2.replace(/return computeFifoLeaveAllocations\(selectedEmp, allocations \|\| \[\], leaves \|\| \[\]\);/g, "return computeFifoLeaveAllocations(selectedEmp, buildEmployeeBaselineAllocations(selectedEmp, allocations || []), leaves || []);");

fs.writeFileSync(file2, c2);
console.log('Fixed FIFO usage.');
