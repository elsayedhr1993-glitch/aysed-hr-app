const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace("import { EmployeesApp } from './apps/EmployeesApp';", "import { EmployeesApp } from './apps/EmployeesApp';\nimport { ContractsApp } from './apps/ContractsApp';\nimport { KuwaitHolidaysApp } from './apps/KuwaitHolidaysApp';\nimport { RecruitmentApp } from './apps/RecruitmentApp';");

fs.writeFileSync('src/App.tsx', code);
