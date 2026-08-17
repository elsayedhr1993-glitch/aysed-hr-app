const fs = require('fs');
let c = fs.readFileSync('src/apps/CompaniesSubscriptionApp.tsx', 'utf8');

c = c.replace(/<\/>\n\s*}\)\n/g, '');
c = c.replace(/<\/React\.Fragment>\n\s*}\)\n/g, '');

fs.writeFileSync('src/apps/CompaniesSubscriptionApp.tsx', c);
