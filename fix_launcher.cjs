const fs = require('fs');
let code = fs.readFileSync('src/components/OdooAppLauncher.tsx', 'utf8');
code = code.replace("    {\n          {\n      id: 'SHIFTS'", "    {\n      id: 'SHIFTS'");
fs.writeFileSync('src/components/OdooAppLauncher.tsx', code);
