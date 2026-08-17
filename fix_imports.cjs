const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(/import (\w+) from '\.\/apps\//g, "import { $1 } from './apps/");
fs.writeFileSync('src/App.tsx', code);
