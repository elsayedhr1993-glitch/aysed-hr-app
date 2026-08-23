const fs = require('fs');
let file = 'src/apps/ReportsApp.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(/المكتسب لعام 226/g, 'المكتسب لعام 2026');
c = c.replace(/مكتسب 226/g, 'مكتسب 2026');

// Just fixing the blank label to carriedOver, which matches "الافتتاحي"
c = c.replace(/\{ id: '', label: '', field: '', unit: 'يوم' \}/g, "{ id: 'carriedOver', label: 'الافتتاحي (مرحل)', field: 'carriedOver', unit: 'يوم' }");
c = c.replace(/'count', '', 'accruedDays'/g, "'count', 'carriedOver', 'accruedDays'");
c = c.replace(/\{ key: '', label: 'الافتتاحي', align: 'center' \}/g, "{ key: 'carriedOver', label: 'الافتتاحي', align: 'center' }");

fs.writeFileSync(file, c);
console.log('Fixed typos in ReportsApp.tsx');
