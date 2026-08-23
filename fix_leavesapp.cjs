const fs = require('fs');

let file = 'src/apps/LeavesApp.tsx';
let c = fs.readFileSync(file, 'utf8');

// The naive replace might break if it's broken across lines. Let's just use regex.
// Wait, I can see the structure.
c = c.replace(/computeFifoLeaveAllocations\(\s*emp,\s*allocations/g, "computeFifoLeaveAllocations(emp, buildEmployeeBaselineAllocations(emp, allocations)");

fs.writeFileSync(file, c);
console.log('Fixed LeavesApp.');
