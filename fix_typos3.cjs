const fs = require('fs');
let file = 'src/apps/ReportsApp.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(/calculate226AccruedDays/g, 'calculate2026AccruedDays');
c = c.replace(/isJoinedIn226OrLater/g, 'isJoinedIn2026OrLater');

fs.writeFileSync(file, c);
