const fs = require('fs');
let content = fs.readFileSync('src/apps/CompaniesSubscriptionApp.tsx', 'utf8');

content = content.replace(/catch \(err\) \{\n\s*console\.error\(err\);\n\s*toast\.error\("فشل الاتصال بالخادم"\);\n\s*\}/, "catch (err: any) { console.error('Fetch error:', err); toast.error('خطأ: ' + (err.message || 'فشل الاتصال بالخادم')); }");

fs.writeFileSync('src/apps/CompaniesSubscriptionApp.tsx', content);
