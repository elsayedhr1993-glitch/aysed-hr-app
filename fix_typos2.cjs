const fs = require('fs');
let file = 'src/apps/ReportsApp.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(/calculate226AccruedDays/g, 'calculate2026AccruedDays');
c = c.replace(/isJoinedIn226OrLater/g, 'isJoinedIn2026OrLater');
c = c.replace(/226-12-31/g, '2026-12-31');

fs.writeFileSync(file, c);
console.log('Fixed more 226 typos in ReportsApp.tsx');
