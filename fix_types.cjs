const fs = require('fs');
let content = fs.readFileSync('src/types.ts', 'utf8');

if (!content.includes('companyId?: string;')) {
    content = content.replace("planType: 'شهري' | 'سنوي' | 'مخصص';", "planType: 'شهري' | 'سنوي' | 'مخصص';\n  companyId?: string;");
    fs.writeFileSync('src/types.ts', content);
}
