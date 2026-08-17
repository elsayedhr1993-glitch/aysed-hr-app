const fs = require('fs');
let c = fs.readFileSync('src/apps/CompaniesSubscriptionApp.tsx', 'utf8');

const regex = /const \[pendingRequests[\s\S]*?handleRejectRequest[\s\S]*?};/g;
let matches = [...c.matchAll(regex)];

if (matches.length > 1) {
    // Keep the first one, remove the second one
    c = c.slice(0, matches[1].index) + c.slice(matches[1].index + matches[1][0].length);
}

fs.writeFileSync('src/apps/CompaniesSubscriptionApp.tsx', c);
