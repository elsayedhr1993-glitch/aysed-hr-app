const fs = require('fs');
let code = fs.readFileSync('src/apps/ShiftsApp.tsx', 'utf8');
code = code.replace(/\\\`/g, '\`').replace(/\\\$/g, '$');
fs.writeFileSync('src/apps/ShiftsApp.tsx', code);
