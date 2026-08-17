const fs = require('fs');
let code = fs.readFileSync('src/components/OdooTopBar.tsx', 'utf8');

code = code.replace("import {import {interface", "import { Company, ActiveApp, ViewMode } from '../types';\nimport { SystemNotification } from '../utils/notificationsEngine';\n\ninterface");

fs.writeFileSync('src/components/OdooTopBar.tsx', code);
