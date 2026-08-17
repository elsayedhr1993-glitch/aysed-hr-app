const fs = require('fs');
let content = fs.readFileSync('src/apps/CompaniesSubscriptionApp.tsx', 'utf8');

content = content.replace("      )}      </>      )}      {/* Odoo Form Modal for Subscriptions */}", "      )}      </>      )}      {/* Odoo Form Modal for Subscriptions */}");

// Let's just fix the whole file with a robust regex or just string replacement
content = content.replace("</>\n      )}\n      {/* Odoo Form Modal for Subscriptions */}", "</>\n      )}\n      {/* Odoo Form Modal for Subscriptions */}");

fs.writeFileSync('src/apps/CompaniesSubscriptionApp.tsx', content);
