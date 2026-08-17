const fs = require('fs');
let c = fs.readFileSync('src/apps/CompaniesSubscriptionApp.tsx', 'utf8');

c = c.replace('</>\n      )}\n      {/* Odoo Form Modal for Subscriptions */}', 
              '</React.Fragment>\n      )}\n      {/* Odoo Form Modal for Subscriptions */}');

c = c.replace(") : (\n        <>\n", ") : (\n        <React.Fragment>\n");

fs.writeFileSync('src/apps/CompaniesSubscriptionApp.tsx', c);
