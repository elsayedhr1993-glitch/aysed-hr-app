const fs = require('fs');
let c = fs.readFileSync('src/apps/CompaniesSubscriptionApp.tsx', 'utf8');

c = c.replace(/<>/g, '<React.Fragment>');
c = c.replace(/<\/>/g, '</React.Fragment>');

fs.writeFileSync('src/apps/CompaniesSubscriptionApp.tsx', c);
