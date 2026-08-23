const fs = require('fs');
let file = 'src/components/reports/OdooScopeBar.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(/ : '\(مصفّر\)'\}/g, " : ''}");

fs.writeFileSync(file, c);
console.log('Fixed mosaffar');
