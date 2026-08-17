const fs = require('fs');
let c = fs.readFileSync('src/apps/CompaniesSubscriptionApp.tsx', 'utf8');

c = c.replace('      </>\n      )}\n', '');
c = c.replace('      </React.Fragment>\n      )}\n', '');

fs.writeFileSync('src/apps/CompaniesSubscriptionApp.tsx', c);
