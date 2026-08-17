const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  "{ id: 'comp-1', name: 'Aysed HR S 2026', industry: 'Tech', contactEmail: '', isTrial: true, trialEndsAt: new Date(Date.now() + 30*24*60*60*1000).toISOString() } as Company",
  "{ id: 'comp-1', nameAr: 'Aysed HR S 2026', nameEn: 'Aysed HR S 2026', commercialRegNo: '1049281', civilIdCompany: '7001928394', bankName: 'NBK', iban: 'KW12', wsiCode: '123', isPrimary: true, isTrial: true, trialEndsAt: new Date(Date.now() + 30*24*60*60*1000).toISOString() } as Company"
);

fs.writeFileSync('src/App.tsx', code);
