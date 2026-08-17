const fs = require('fs');
let code = fs.readFileSync('src/utils/printUtils.ts', 'utf8');
code = code.replace(/type: 'jpeg'/g, "type: 'jpeg' as const");
fs.writeFileSync('src/utils/printUtils.ts', code);
